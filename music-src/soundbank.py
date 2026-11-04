"""Original instruments for the Ruby Tour score. All waveforms are built locally.

Plucked strings use a position-dependent pick/pickup comb and dispersive upper
partials. Winds and bows use instrument-specific excitation/body responses.
Drum kits contain four separate strikes, with velocity-dependent snare and hat
articulation. No soundfonts, plug-ins, downloads or copyrighted samples.
"""
from functools import lru_cache
import math
import numpy as np
from scipy import signal

RATE = 32000
TAU = 2*np.pi
TABLE = 2048
WINDS = {'trumpet','brass','horn','reed','flute'}
BOWS = {'strings','cello'}
STRINGS = {'bass','pickbass','upright','guitar','nylon','eguitar','pluck'}
KEYS = {'ep','piano','organ','lead','pad','bell','marimba'}
DRUMS = {'kick','snare','rim','hat','openhat','ride','crash','tomlow','tomhigh','shaker','clap','tamb','conga','wood'}
INSTRUMENTS = WINDS | BOWS | STRINGS | KEYS


def _noise(length, seed, low, high):
    rng=np.random.default_rng(seed)
    sos=signal.butter(2, [low,min(high,RATE*.47)], btype='bandpass', fs=RATE, output='sos')
    y=signal.sosfilt(sos,rng.standard_normal(length)).astype(np.float32)
    return y/(np.sqrt(np.mean(y*y))+1e-7)


def _body(t,f,hz,decay,level):
    return level*np.exp(-t*decay)*np.sin(TAU*hz*t+f)


def _curve(t,attack):
    return (1-np.exp(-t/max(.0005,attack)))


def _off(t, hold, rel):
    return np.exp(-np.maximum(0,t-hold)/max(.004,rel))


def _phase(t, f, variant, family, art):
    # Integrals of pitch departures in cycles keep the oscillator continuous
    # during a tongue attack, vibrato onset and a guitar slide.
    scoop={'wind':-.011,'bow':-.007,'pluck':.003,'synth':-.002}.get(family,0.)
    if art=='legato': scoop*=.20
    if art=='slide': scoop=-.085
    tau=.050 if art=='slide' else .023
    phase=f*t+(f*scoop*tau)*(1-np.exp(-t/tau))
    if family in ('wind','bow','synth'):
        rate=(4.65 if family=='bow' else 5.15)+variant*.11
        depth={'wind':.0030,'bow':.0041,'synth':.0010}[family]
        phase+=depth*f/(TAU*rate)*(1-np.cos(TAU*rate*t))*(1-np.exp(-t/.15))
    return phase


# A pair of band-limited instrument tables with different breath/bow pressure.
# The magnitude distribution is tied to resonances in Hz as well as harmonics.
@lru_cache(maxsize=420)
def _tables(kind, midi_q, vbin):
    f=440*2**((midi_q/10-69)/12)
    count=min(70,max(1,int(RATE*.43/f)))
    k=np.arange(1,count+1);hz=k*f
    if kind in ('trumpet','brass','horn'):
        bright=kind=='trumpet';low=kind=='horn'
        strength=k**(-(.87 if bright else 1.08 if not low else 1.23))
        form1=(1000 if bright else 800 if not low else 630)
        form2=(2650 if bright else 1900 if not low else 1350)
        strength*=.80+1.05*np.exp(-((hz-form1)/450)**2)+.70*np.exp(-((hz-form2)/720)**2)
    elif kind=='reed':
        strength=k**-.98*np.where(k%2,1.,.18)*(1+.9*np.exp(-((hz-1300)/570)**2))
    elif kind=='flute':
        strength=k**-1.6*np.where(k==2,1.15,1)*np.exp(-k*.24)
    elif kind in BOWS:
        strength=k**-.91*(.43+.33*np.cos(k*.62)**2+
            .8*np.exp(-((hz-(510 if kind=='cello' else 750))/360)**2)+
            .9*np.exp(-((hz-2550)/620)**2))
    elif kind=='organ':
        strength=np.zeros(count)
        for n,a in ((1,1),(2,.72),(3,.80),(4,.18),(6,.15),(8,.18)): 
            if n<=count:strength[n-1]=a
    else:
        strength=k**-1.05*np.where((k%2)==0,.83,1)
    pressure=(vbin+.5)/4
    dark=strength*np.exp(-hz/(1750+1700*pressure))
    bright=strength*np.exp(-hz/(3200+3000*pressure))
    init=np.sin(k*8.91+len(kind))*.48
    def wave(amps):
        spec=np.zeros(TABLE//2+1,np.complex128)
        spec[1:count+1]=amps*np.exp(1j*(init-np.pi/2))*TABLE*.5
        w=np.fft.irfft(spec,n=TABLE).astype(np.float32)
        return np.r_[w,w[0]]
    # Normalize fundamental/body, not each individual note's peak.
    return wave(dark),wave(bright)


def _read(table,phase):
    q=np.remainder(phase,1.)*TABLE
    i=q.astype(np.int32);frac=(q-i).astype(np.float32)
    return table[i]+frac*(table[i+1]-table[i])


def _wind(kind,t,f,hold,v,variant,art,midi):
    c='bow' if kind in BOWS else ('synth' if kind in ('lead','pad','organ') else 'wind')
    p=_phase(t,f,variant,c,art)
    dark,bright=_tables(kind,round(midi*10),min(3,int(v*4)))
    attack={'horn':.042,'brass':.024,'trumpet':.019,'reed':.023,'flute':.040,'strings':.067,'cello':.056,
            'pad':.115,'lead':.015,'organ':.007}[kind]
    release={'horn':.085,'brass':.065,'trumpet':.055,'reed':.065,'flute':.085,'strings':.14,'cello':.13,
             'pad':.235,'lead':.075,'organ':.050}[kind]
    if art=='legato': attack*=.64;release*=1.10
    if art in ('staccato','mute','muted'):release*=.60
    if art=='accent':attack*=.67
    env=_curve(t,attack)*_off(t,hold,release)
    # Breathing/swelling brings held notes forward instead of freezing their
    # spectrum at one velocity until the key is released.
    swell=(.27+.31*v+.15*np.sin(np.minimum(1,t/max(.21,hold))*np.pi))
    if c=='synth':swell=(.24+.55*v)*(.54+.46*np.exp(-t/.32))
    y=_read(dark,p);y+=(_read(bright,p)-y)*swell
    if kind in ('strings','brass','pad','lead','cello'):
        ratio=.0034 if kind in ('strings','brass') else .0025 if kind=='pad' else .0016
        other=_read(dark,p+ratio*f*t+.22+.014*np.sin(t*TAU*.79))
        y=.70*y+.30*other
        if kind=='strings':
            y=.80*y+.20*_read(bright,p-ratio*.79*f*t+.73+.015*np.sin(t*TAU*1.13))
    if kind in WINDS|BOWS:
        grain=.050 if kind=='flute' else .028 if kind in BOWS else .020
        hiss=_noise(len(t),860+variant+27*int(midi),800 if kind in BOWS else 1150,7500)
        y+=grain*hiss*(.48+.6*np.exp(-t/.09))
    if kind=='organ':y*=1+.034*np.sin(t*TAU*5.8+variant)
    return y*env*.58


def _pluck(kind,t,f,hold,v,variant,art):
    bass=kind in ('bass','pickbass','upright')
    decay={'bass':1.3,'pickbass':1.24,'upright':.89,'guitar':1.05,'nylon':1.38,
           'eguitar':1.66,'pluck':.46}[kind]
    rel=.075 if bass else .087
    if art in ('muted','mute','staccato','ghost'):decay*=.48;rel*=.65
    p=_phase(t,f,variant,'pluck',art)
    count=min(20,max(1,int(RATE*.38/f)))
    position=(.205 if kind in ('nylon','upright') else .145 if kind in ('eguitar','pickbass') else .174)+variant*.006
    y=np.zeros(len(t),np.float32)
    for k in range(1,count+1):
        # Triangular displacement at the picking position plus pickup loading.
        amp=np.sin(k*np.pi*position)/(k**(1.32 if bass else 1.21))
        amp*=np.sin(k*np.pi*(.23+variant*.013))/.625 if kind not in ('nylon','upright') else 1.
        if k>1:amp*=.60+.49*v
        inharm=(.000033 if kind in ('bass','eguitar') else .000075)*k*k
        mode=np.sin(TAU*(p*k*(1+inharm))+.02*variant*k)
        y+=amp*np.exp(-t/decay*(.72+.052*k+.010*k*k))*mode
    noise=_noise(len(t),5141+variant+int(f),950,7300)
    contact=.035 if kind in ('bass','nylon') else .065
    y+=contact*noise*np.exp(-t/(.016 if bass else .012))
    if kind in ('nylon','guitar','upright'):
        y+=_body(t,.5,94+variant,13,.045)+_body(t,1.2,203+variant*3,16,.035)
    if kind=='eguitar':y=np.tanh(y*2.4)/1.63
    return y*_curve(t,.0023)*_off(t,hold,rel)*(1.22 if bass else 1.05)


def _keys(kind,t,f,hold,v,variant,art):
    y=np.zeros(len(t),np.float32)
    if kind=='ep':
        # Hammer/tine and pickup circuit. The metallic attack dissolves into
        # the warm fundamental, with a small real-time tremolo.
        mod=(.29+1.8*v*v)*np.exp(-t/.17)+.24*np.exp(-t/1.2)
        y=(np.sin(TAU*f*t+mod*np.sin(TAU*(2*f+.37)*t))+
           .19*v*np.sin(TAU*3*f*t+variant*.11)*np.exp(-t/.4))
        y*=np.exp(-t/(1.35+v*.58))*(.95+.05*np.sin(TAU*4.2*t+variant))*.78
    elif kind=='piano':
        count=min(16,max(1,int(RATE*.41/f)))
        stretch=.000045+.000022*max(0,np.log2(f/180))
        for k in range(1,count+1):
            amp=(k**-1.19)*(.77+.25*np.cos(k*1.6))*(1 if k==1 else .57+.60*v)
            # Two detuned strings and pitch-dependent decay; no static organ sustain.
            h=f*k*np.sqrt(1+max(.000015,stretch)*k*k)
            env=np.exp(-t*(.60+.09*k+.024*k*k)*(1+f/2600))
            y+=amp*env*(.68*np.sin(TAU*h*t)+.32*np.sin(TAU*h*1.0009*t+.13))
        y+=.022*_noise(len(t),110+variant+int(f),800,4900)*np.exp(-t/.021)
    else:
        ratios=([1,3.99,9.94,14.71] if kind=='marimba' else [1,2.008,2.71,4.09,5.88])
        amps=([1,.34,.16,.07] if kind=='marimba' else [.89,.37,.28,.19,.09])
        for i,(ratio,amp) in enumerate(zip(ratios,amps)):
            if f*ratio>RATE*.42:continue
            decay=(.72/(1+i*.9) if kind=='marimba' else 1.55/(1+i*.55))
            y+=amp*np.sin(TAU*f*ratio*t+.07*i*variant)*np.exp(-t/decay)
        y*=.75
    rel=.10 if kind=='piano' else .13 if kind=='ep' else .18
    if art in ('muted','mute','staccato'):rel*=.50
    return y*_curve(t,.0030 if kind!='ep' else .0050)*_off(t,hold,rel)


@lru_cache(maxsize=480)
def melodic(kind, midi_q, hold_ms, velocity_bin, variant, art):
    midi=midi_q/10;f=440*2**((midi-69)/12);hold=hold_ms/1000
    release=.86 if kind in ('pad','strings','cello','bell') else .55 if kind in KEYS else .43
    length=round(RATE*(hold+release));t=np.arange(length,dtype=np.float32)/RATE
    v=(velocity_bin+.5)/8
    if kind in WINDS|BOWS or kind in ('organ','lead','pad'):
        y=_wind(kind,t,f,hold,v,variant,art,midi)
    elif kind in STRINGS:y=_pluck(kind,t,f,hold,v,variant,art)
    else:y=_keys(kind,t,f,hold,v,variant,art)
    out=np.asarray(y,np.float32)
    n=min(280,len(out));out[-n:]*=np.linspace(1,0,n,dtype=np.float32)
    return out


@lru_cache(maxsize=200)
def drum(kind,variant,layer):
    # A low-velocity backbeat uses a different balance of shell and wire.
    v=(layer+.5)/4;rng=np.random.default_rng(11873+DRUM_ORDER[kind]*427+variant*17)
    duration={'kick':.34,'snare':.39,'rim':.20,'hat':.13,'openhat':.49,'ride':1.05,'crash':1.68,
              'tomlow':.51,'tomhigh':.43,'shaker':.10,'clap':.30,'tamb':.22,'conga':.32,'wood':.13}[kind]
    t=np.arange(round(duration*RATE),dtype=np.float32)/RATE
    phase=rng.uniform(0,TAU);drift=(variant-1.5)*.012
    if kind=='kick':
        f0=48+2*v+variant*.65
        p=TAU*(f0*t+(71+26*v)*.037*(1-np.exp(-t/.037)))
        y=np.sin(p)*np.exp(-t/(.099+.015*v))
        y+=(.075+.12*v)*_noise(len(t),130+variant,1500,6300)*np.exp(-t/.013)
        y+=.16*np.sin(p*1.97+.12)*np.exp(-t/.048)
    elif kind in ('snare','rim','tomlow','tomhigh','conga','wood'):
        hz={'snare':182,'rim':385,'tomlow':111,'tomhigh':157,'conga':195,'wood':690}[kind]*(1+drift)
        p=TAU*(hz*t+hz*.16*.026*(1-np.exp(-t/.026)))
        if kind=='snare':
            body=.66*np.sin(p)*np.exp(-t/.077)+.33*np.sin(1.67*p+.38)*np.exp(-t/.049)
            wire=_noise(len(t),2719+variant,1050,9600)
            y=body+(.22+.39*v)*wire*(.61*np.exp(-t/.042)+.39*np.exp(-t/.090))
        elif kind=='rim':
            y=(np.sin(p)+.45*np.sin(p*2.48+phase))*(np.exp(-t/.026)+.12*np.exp(-t/.073))
            y+=.13*_noise(len(t),287+variant,1600,6400)*np.exp(-t/.023)
        else:
            y=(.87*np.sin(p)+.31*np.sin(p*1.45+phase)+.13*np.sin(p*2.61))*np.exp(-t/(duration*.22))
            y+=.09*_noise(len(t),94+variant,820,4800)*np.exp(-t/.024)
    elif kind=='clap':
        y=_noise(len(t),948+variant,900,7700)*(.18*np.exp(-t/.070))
        for ms in (.001,.012,.023):
            d=t-ms;y+=_noise(len(t),2049+variant+round(ms*1000),770,5400)*(d>=0)*np.exp(-np.maximum(0,d)/.009)*.65
    else:
        cym=kind in ('ride','crash')
        low=3850 if kind in ('shaker','tamb') else 2850 if cym else 3400
        noise=_noise(len(t),136+variant+DRUM_ORDER[kind]*9,low,13700)
        excite=.008 if kind=='crash' else .002
        env=_curve(t,excite)*(.50*np.exp(-t/(duration*.085))+.50*np.exp(-t/(duration*.25)))
        modes=np.zeros_like(t)
        freqs=([598,1091,1711,2604,3212,4517,6179,8933] if cym else [2183,3280,4201,5323,6171,8790])
        for i,freq in enumerate(freqs):
            if kind=='crash':freq*=1.16
            jitter=rng.uniform(-.018,.018)
            modes+=np.sin(TAU*(freq*(1+jitter)*t+.038*np.sin(TAU*(41+i*13)*t))+rng.uniform(0,TAU))*(.78**i)
        mix=.30 if kind=='ride' else .13 if cym else .10
        y=env*((.58 if cym else .67)*noise+mix*modes)
        if kind=='ride':y+=.23*np.sin(TAU*(1340+variant*9)*t)*np.exp(-t/.13)
    out=np.asarray(y*_curve(t,.00065),np.float32)
    out[-150:]*=np.linspace(1,0,150)
    return out

DRUM_ORDER={name:i for i,name in enumerate(sorted(DRUMS))}
