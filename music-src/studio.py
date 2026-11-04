"""Ruby Tour offline studio. The browser plays prepared stereo masters only.

Times in a Score are absolute beats, pan is -1..1, velocity is 0..1. A Score
loops by default; set loop=False for a one-shot. section(bar, name) numbers
bars from zero. render(..., stem_dir=...) exports synchronized mix buses plus
effects returns at their actual mix gain, before final mastering.
"""
from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache
import math
import json
import subprocess
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d

from soundbank import RATE, INSTRUMENTS, DRUMS, drum, melodic

KINDS={
 # Instrument : mix group, level, position, room send, delay send
 'bass':('bass',.74,0,.040,0),'pickbass':('bass',.71,-.015,.045,0),'upright':('bass',.78,-.025,.085,0),
 'guitar':('guitars',.43,-.32,.17,.06),'nylon':('guitars',.53,-.22,.20,.08),
 'eguitar':('guitars',.47,.20,.16,.12),'pluck':('synths',.44,.27,.16,.17),
 'ep':('keys',.42,-.24,.19,.08),'piano':('keys',.43,-.13,.20,.045),'organ':('keys',.30,.21,.16,.035),
 'brass':('winds',.64,.09,.25,.045),'trumpet':('winds',.62,-.07,.23,.055),
 'horn':('winds',.64,-.13,.27,.05),'reed':('winds',.66,.16,.23,.05),
 'flute':('winds',.69,-.10,.25,.08),'strings':('strings',.48,-.17,.30,.065),
 'cello':('strings',.57,.14,.24,.045),'pad':('synths',.37,.13,.32,.13),'lead':('synths',.62,-.035,.19,.14),
 'bell':('mallets',.43,.29,.24,.18),'marimba':('mallets',.57,-.23,.19,.08),
 'kick':('drums',.83,0,.025,0),'snare':('drums',.58,.035,.19,0),'rim':('drums',.44,.07,.14,0),
 'hat':('drums',.26,-.29,.10,0),'openhat':('drums',.24,-.28,.15,0),'ride':('drums',.28,.31,.18,0),
 'crash':('drums',.33,-.24,.23,0),'tomlow':('drums',.52,.32,.20,0),'tomhigh':('drums',.49,-.22,.18,0),
 'shaker':('drums',.23,.42,.13,0),'clap':('drums',.41,-.08,.18,0),'tamb':('drums',.23,-.42,.15,0),
 'conga':('drums',.43,.19,.14,0),'wood':('drums',.38,-.25,.14,0),
}
ARTS={'normal','legato','accent','ghost','staccato','mute','muted','slide'}
BUS_HIPASS={'drums':29,'bass':32,'guitars':80,'keys':73,'winds':92,'strings':78,'synths':65,'mallets':100}


@dataclass(frozen=True)
class Event:
    name:str
    beat:float
    midi:float
    duration:float
    velocity:float
    pan:float|None
    art:str


class Score:
    def __init__(self,title,bpm,bars,meter=4,seed=1):
        if bpm<=0 or bars<=0 or meter<=0:raise ValueError('positive tempo, meter and bars required')
        self.title=title;self.bpm=bpm;self.bars=bars;self.meter=meter;self.seed=int(seed)
        self.loop=True;self.events=[];self.sections=[];self.strips={}
        self.target_lufs=-16.2
    @property
    def bar_seconds(self):return 60*self.meter/self.bpm
    @property
    def duration(self):return self.bar_seconds*self.bars
    def section(self,bar,name):
        self.sections.append((bar,name))
    def trim(self,instrument,gain=1,pan=None,room=None):
        if instrument not in KINDS:raise ValueError(instrument)
        self.strips[instrument]=(gain,pan,room)
    def note(self,instrument,beat,pitch,duration,velocity=.70,pan=None,art='normal'):
        if instrument not in INSTRUMENTS or art not in ARTS:raise ValueError((instrument,art))
        if duration<=0 or not 12<=pitch<=122:raise ValueError((instrument,pitch,duration))
        self.events.append(Event(instrument,beat,pitch,duration,velocity,pan,art))
    def chord(self,instrument,beat,pitches,duration,velocity=.70,pan=None,art='normal'):
        for pitch in pitches:self.note(instrument,beat,pitch,duration,velocity,pan,art)
    def drum(self,kind,beat,velocity=.70,pan=None):
        if kind not in DRUMS:raise ValueError(kind)
        self.events.append(Event(kind,beat,0,0,velocity,pan,'normal'))


def _place(target,source,start,gain,loop):
    if not len(source):return
    n=len(target)
    if not loop:
        lo=max(0,-start);hi=min(len(source),n-start)
        if lo<hi:target[start+lo:start+hi]+=source[lo:hi]*gain
        return
    pos=start%n;offset=0
    while offset<len(source):
        count=min(n-pos,len(source)-offset)
        target[pos:pos+count]+=source[offset:offset+count]*gain
        offset+=count;pos=0


def _iir(data,hz,btype,loop):
    if not hz:return data
    sos=signal.butter(2,hz,fs=RATE,btype=btype,output='sos').astype(np.float32)
    if loop:
        # Causal filters need the previous bar's history at a loop boundary.
        warm=min(len(data),RATE//2)
        _,state=signal.sosfilt(sos,data[-warm:],axis=0,
                               zi=np.zeros((len(sos),2,2),np.float32))
        return signal.sosfilt(sos,data,axis=0,zi=state)[0]
    return signal.sosfilt(sos,data,axis=0)


def _smooth(values,attack,release,loop=False):
    out=np.empty(len(values),np.float32)
    prev=float(values[-1] if loop else values[0])
    # These are gain reductions (unity = no reduction).
    for _ in range(2 if loop else 1):
        for i,raw in enumerate(values):
            v=float(raw);prev=v+(prev-v)*(attack if v<prev else release);out[i]=prev
    return out


def _gain_blocks(x,block,gains):
    # Interpolate in modest chunks to avoid making a full float64 sample ramp.
    xp=np.arange(len(gains))*block+block*.5
    for start in range(0,len(x),RATE*4):
        end=min(len(x),start+RATE*4)
        val=np.interp(np.arange(start,end),xp,gains).astype(np.float32)
        x[start:end]*=val[:,None]


def _compress(x,threshold,ratio,loop):
    block=256;n=len(x)//block
    if not n:return x
    rms=np.sqrt(np.mean(x[:n*block].reshape(n,block*2)**2,axis=1)+1e-10)
    ratio_gain=np.minimum(1,(threshold/rms)**(1-1/ratio))
    gain=_smooth(ratio_gain,math.exp(-block/(RATE*.020)),math.exp(-block/(RATE*.145)),loop)
    _gain_blocks(x,block,gain)
    return x


@lru_cache(maxsize=1)
def _room_ir():
    # Fixed early reflections create cabinet/room localization; filtered late
    # reflections are decorrelated between channels and decay in the treble first.
    rng=np.random.default_rng(8041);length=int(RATE*.83);t=np.arange(length)/RATE
    result=[]
    for side in (0,1):
        white=rng.standard_normal(length)
        low=signal.sosfilt(signal.butter(2,3200,fs=RATE,output='sos'),white)
        high=white-low
        env=np.maximum(0,1-np.exp(-(t-.016)/.030))
        ir=(low*np.exp(-t/.136)+.34*high*np.exp(-t/.081))*env
        ir*=.40/(np.sqrt(np.sum(ir*ir)) or 1)
        for sec,g in ((.013,.28),(.023,.235),(.042,.19),(.056,.14),(.079,.105),(.105,.085)):
            ir[round((sec+.003*side+side*sec*.055)*RATE)]+=g
        result.append(ir.astype(np.float32))
    return result


def _room(send,loop):
    result=np.empty_like(send)
    ir=_room_ir()
    for ch in (0,1):
        dry=send[:,ch]*.76+send[:,1-ch]*.24
        conv=signal.oaconvolve(dry,ir[ch],mode='full').astype(np.float32)
        result[:,ch]=conv[:len(send)]
        if loop:
            tail=conv[len(send):];m=min(len(tail),len(send));result[:m,ch]+=tail[:m]
    return _iir(result,160,'highpass',loop)


def _delay(send,beat,loop):
    src=_iir(_iir(send,170,'highpass',loop),4500,'lowpass',loop)
    out=np.zeros_like(src)
    for i,(beats,gain) in enumerate(((.75,.48),(1.5,.23),(2.25,.10))):
        n=round(beats*beat*RATE);wave=src[:,::-1] if i%2==0 else src
        if loop:out+=np.roll(wave,n,axis=0)*gain
        elif n<len(out):out[n:]+=gain*wave[:-n]
    return out


def _spread(track,group,loop):
    # Wide sections have a short stereo microphone return. Opposite-polarity
    # side information disappears cleanly when a phone plays the mix in mono.
    spread={'keys':.14,'guitars':.15,'strings':.24,'winds':.070,'synths':.23,'mallets':.115}.get(group,0)
    if not spread:return
    mid=(track[:,0]+track[:,1])*.5
    side=np.zeros_like(mid)
    for ms,weight in ((12.3,1),(22.7,-1),(38.1,.34),(51.5,-.34)):
        n=round(ms*RATE/1000)
        if loop:side+=weight*np.roll(mid,n)
        elif n<len(mid):side[n:]+=weight*mid[:-n]
    band=signal.butter(2,[230,6700],fs=RATE,btype='bandpass',output='sos').astype(np.float32)
    if loop:
        _,zi=signal.sosfilt(band,side[-min(len(side),RATE//8):],zi=np.zeros((len(band),2),'f'))
        side=signal.sosfilt(band,side,zi=zi)[0]
    else:side=signal.sosfilt(band,side)
    side*=spread;track[:,0]+=side;track[:,1]-=side


def _wav(path,data):
    # Floating-point stems retain bus headroom when imported into a DAW.
    wavfile.write(path,RATE,np.asarray(data,np.float32))


def _loudness(data):
    # BS.1770 K-weighting and overlapping gated 400 ms integration blocks.
    def shelf(f,q,gain):
        k=math.tan(math.pi*f/RATE);v=10**(gain/20);m=v**.4996667741545416
        a=1+k/q+k*k
        return np.array([(v+m*k/q+k*k)/a,2*(k*k-v)/a,(v-m*k/q+k*k)/a]),np.array([1,2*(k*k-1)/a,(1-k/q+k*k)/a])
    b,a=shelf(1681.974, .707175, 3.999844)
    w=signal.lfilter(b.astype('f'),a.astype('f'),data,axis=0)
    k=math.tan(math.pi*38.13547/RATE);q=.500327;a0=1+k/q+k*k
    w=signal.lfilter(np.array([1,-2,1],np.float32),np.array([1,2*(k*k-1)/a0,(1-k/q+k*k)/a0],np.float32),w,axis=0)
    hop=RATE//10;n=len(w)//hop
    if n<4:return -0.691+10*math.log10(max(1e-12,np.mean(w*w)*2))
    e=(np.mean(w[:n*hop].reshape(n,hop,2)**2,axis=(1,2))*2).astype('d')
    windows=np.convolve(e,np.ones(4)*.25,'valid')
    absolute=windows[windows>10**((-70+.691)/10)]
    if not len(absolute):return -70.
    valid=absolute[absolute>absolute.mean()*.1]
    return -.691+10*math.log10(valid.mean())


def _master(x,score):
    x=_iir(x,26,'highpass',score.loop)
    _compress(x,.28,1.32,score.loop)
    loudness=_loudness(x)
    x*=min(4.0,10**((score.target_lufs-loudness)/20))
    # Conservative oversampling margin for the MP3 encoder. Use translucent
    # peak control, not track normalization to its loudest cymbal.
    ceiling=.846;block=64;n=(len(x)+block-1)//block
    peaks=np.zeros(n,np.float32)
    full=len(x)//block
    peaks[:full]=np.max(np.abs(x[:full*block].reshape(full,-1)),axis=1)
    if full<n:peaks[-1]=np.max(np.abs(x[full*block:]))
    look=maximum_filter1d(peaks,size=9,mode='wrap' if score.loop else 'nearest')
    gains=_smooth(np.minimum(1,ceiling/np.maximum(look,.00001)),0,math.exp(-block/(RATE*.080)),score.loop)
    _gain_blocks(x,block,gains);np.clip(x,-.887,.887,out=x)
    if not score.loop:
        fade=min(len(x),round(RATE*.09));x[-fade:]*=np.linspace(1,0,fade,dtype='f')[:,None]
    return x


def render(score,stem_dir=None):
    instruments=set(ev.name for ev in score.events)
    if not instruments:raise ValueError('Empty score '+score.title)
    n=round(score.duration*RATE);beat_sec=60/score.bpm
    main=np.zeros((n,2),np.float32);send=np.zeros_like(main);echo=np.zeros_like(main)
    root=Path(stem_dir) if stem_dir is not None else None
    if root:root.mkdir(parents=True,exist_ok=True)
    groups=list(dict.fromkeys(KINDS[k][0] for k in KINDS if k in instruments))
    # Render one bus at a time; sample caches and fixed-length effects sends
    # bound memory independently of the number of authored parts or sections.
    for group in groups:
        track=np.zeros_like(main);r_track=np.zeros_like(main);d_track=np.zeros_like(main)
        events=sorted((e for e in score.events if KINDS[e.name][0]==group),key=lambda e:e.beat)
        rng=np.random.default_rng(score.seed+list(BUS_HIPASS).index(group)*779)
        for index,e in enumerate(events):
            _,level,default_pan,room,delay=KINDS[e.name]
            trim,track_pan,track_room=score.strips.get(e.name,(1.,None,None))
            if track_room is not None:room=track_room
            pan=default_pan if track_pan is None else track_pan
            pan=float(np.clip(pan if e.pan is None else e.pan,-1,1))
            v=min(1,max(0,e.velocity))
            if not v or not trim:continue
            variant=int(rng.integers(0,4));art=e.art
            if art in ('mute','muted'):art='mute'
            if e.name in DRUMS:
                tone=drum(e.name,variant,min(3,int(v*4)))
            else:
                dur=e.duration*beat_sec*(.70 if art=='staccato' else .91 if art=='ghost' else 1.)
                # A small hold grid enables cache reuse without quantizing attacks.
                hold_ms=max(12,round(dur*1000/12)*12)
                tone=melodic(e.name,round(e.midi*10),hold_ms,min(7,int(v*8)),variant,art)
            # Deliberately tight kick; reeds/bows and live rhythm parts sit
            # slightly around the beat. Musical pushes written in the score survive.
            width=.0015 if e.name=='kick' else .003 if group in ('drums','bass') else .0045
            micro=float(rng.uniform(-width,width))
            start=round((e.beat*beat_sec+micro)*RATE)
            if e.name=='openhat':
                # Choke an open cymbal at the next closed stroke, not at a fixed sustain.
                next_closed=next((a.beat for a in events[index+1:] if a.name=='hat'),None)
                if next_closed is not None:
                    cutoff=round(max(0,(next_closed-e.beat)*beat_sec)*RATE)
                    if 0<cutoff<len(tone)-200:
                        tone=tone[:cutoff+200].copy();tone[-200:]*=np.linspace(1,0,200)
            gain=level*trim*(v**1.34)*(1.07 if art=='accent' else .80 if art=='ghost' else 1)
            # Fixed-power stereo pan stays mono-compatible.
            left=gain*math.sqrt((1-pan)*.5);right=gain*math.sqrt((1+pan)*.5)
            for ch,g in ((0,left),(1,right)):
                _place(track[:,ch],tone,start,g,score.loop)
                if room:_place(r_track[:,ch],tone,start,g*room,score.loop)
                if delay:_place(d_track[:,ch],tone,start,g*delay,score.loop)
        track=_iir(track,BUS_HIPASS[group],'highpass',score.loop)
        _spread(track,group,score.loop)
        threshold=.15 if group=='bass' else .205
        _compress(track,threshold,1.70 if group in ('drums','bass') else 1.38,score.loop)
        main+=track;send+=r_track;echo+=d_track
        if root:_wav(root/(group+'.wav'),track)
        del track,r_track,d_track
    room=_room(send,score.loop);main+=room
    if root:_wav(root/'room.wav',room)
    del room,send
    repeat=_delay(echo,beat_sec,score.loop);main+=repeat
    if root:
        _wav(root/'delay.wav',repeat)
        info={'title':score.title,'tempo_bpm':score.bpm,'beats_per_bar':score.meter,
              'bars':score.bars,'sample_rate':RATE,'loop':score.loop,'target_lufs':score.target_lufs,
              'sections':[{'bar':bar,'name':title} for bar,title in score.sections],
              'stems':[g+'.wav' for g in groups+['room','delay']],
              'mix_note':'Aligned stereo float stems sum at unity before mastering.'}
        (root/'mix-session.json').write_text(json.dumps(info,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    del repeat,echo
    return _master(main,score)


def encode(wave,format='mp3',bitrate='96k'):
    if format not in ('mp3','opus','ogg'):raise ValueError(format)
    codec='libmp3lame' if format=='mp3' else 'libopus' if format=='opus' else 'libvorbis'
    ext='ogg' if format=='opus' else format
    with tempfile.TemporaryDirectory() as directory:
        dest=Path(directory)/('master.'+ext)
        # A seekable file allows the MP3 LAME delay/padding tag to be written.
        args=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0',
              '-c:a',codec,'-b:a',bitrate,'-map_metadata','-1']
        subprocess.run(args+[str(dest)],input=wave.astype('<f4',copy=False).tobytes(),check=True)
        return dest.read_bytes()
