"""Type 1 MIDI interchange. The distributed masters use our studio, not GM sounds."""
import struct
from collections import defaultdict
from soundbank import DRUMS

PPQ=480
PROGRAM={'bass':33,'pickbass':34,'upright':32,'guitar':27,'nylon':24,'eguitar':29,'piano':0,'ep':4,'organ':17,'brass':61,'trumpet':56,'horn':60,'reed':66,'flute':73,'strings':48,'cello':42,'pad':89,'lead':81,'pluck':82,'bell':10,'marimba':12}
DRUM={'kick':36,'snare':38,'rim':37,'hat':42,'openhat':46,'ride':51,'crash':49,'tomlow':45,'tomhigh':50,'shaker':82,'clap':39,'tamb':54,'conga':63,'wood':76}
def variable(n):
    parts=[n&127]
    while n>=128:
        n>>=7;parts.append(128|(n&127))
    return bytes(reversed(parts))
def meta(kind,data):
    return bytes([255,kind])+variable(len(data))+data
def track(events,end):
    prev=0;body=bytearray()
    for time,priority,message in sorted(events,key=lambda e:(e[0],e[1])):
        body+=variable(time-prev)+message;prev=time
    body+=variable(max(0,end-prev))+bytes.fromhex('ff2f00')
    return b'MTrk'+struct.pack('>I',len(body))+body
def export(score):
    stop=round(score.bars*score.meter*PPQ)
    meter=getattr(score,'time_signature',(score.meter,4))
    controls=[(0,0,meta(3,score.title.encode())),(0,0,meta(81,round(60e6/score.bpm).to_bytes(3,'big'))),
              (0,0,meta(88,bytes([int(meter[0]),int(meter[1]).bit_length()-1,24,8])))]
    for bar,name in score.sections:controls.append((round(bar*score.meter*PPQ),1,meta(6,name.encode())))
    channels=[c for c in range(16) if c!=9]
    parts=defaultdict(list)
    for e in score.events:parts['kit' if e.name in DRUMS else e.name].append(e)
    if len(parts)-('kit' in parts)>len(channels):raise ValueError('MIDI port capacity exceeded')
    out=[track(controls,stop)];ix=0
    for name,notes in parts.items():
        if name=='kit':ch=9
        else:ch=channels[ix];ix+=1
        pan=score.strips.get(name,(1,None))[1]
        lines=[(0,0,meta(3,name.encode())),(0,1,bytes([0xb0|ch,10,round(63.5*(1+(pan or 0)))]))]
        if ch!=9:lines.append((0,1,bytes([0xc0|ch,PROGRAM[name]])))
        for e in notes:
            start=round(e.beat*PPQ)
            if score.loop:start%=stop
            else:start=max(0,min(stop-1,start))
            pitch=DRUM[e.name] if ch==9 else max(0,min(127,round(e.midi)))
            end=min(stop,start+max(1,round((.12 if ch==9 else e.duration)*PPQ)))
            v=max(1,min(127,round(e.velocity*127)))
            lines.append((start,3,bytes([0x90|ch,pitch,v])));lines.append((end,2,bytes([0x80|ch,pitch,0])))
        out.append(track(lines,stop))
    return b'MThd'+struct.pack('>IHHH',6,1,len(out),PPQ)+b''.join(out)
