"""The paddock club, timekeepers' band and championship stage share a five-note call."""
from studio import Score

# Pitch names are written as MIDI; rests are the gaps between attacks.
def melody(s, bar, inst, notes, gain=.73, pan=0, transpose=0, art='legato'):
    for offset, pitch, length, accent in notes:
        s.note(inst, 4*bar+offset, pitch+transpose, length, gain*accent, pan, art)

def chord(s, bar, beat, pitches, length, instrument, level, pan):
    for i,p in enumerate(pitches):
        s.note(instrument,4*bar+beat+i*.012,p,length-i*.014,level*(.93+.035*i),pan)

# Dmaj9 / G6/9 / Bm9 / Em11 / borrowed minor subdominant and turnarounds.
VOICES={
 'D':(38,(57,61,64,66)), 'G':(43,(55,59,62,69)), 'Bm':(35,(54,57,61,62)),
 'Em':(40,(55,59,62,66)), 'A':(33,(55,59,61,66)), 'Gm':(43,(55,58,62,64)),
 'F#':(42,(54,58,64,69)), 'F#m':(42,(57,61,64,68)), 'C':(36,(55,59,62,64)),
 'Bb':(34,(53,57,60,62)), 'E':(40,(56,62,66,71)), 'Asus':(33,(55,59,62,64)),
 'D/F#':(42,(57,61,62,66)), 'B':(35,(54,57,63,68)), 'A/C#':(37,(55,57,61,64))
}
# Tied notes and delayed responses spell a complete eight-bar sentence.
THEME=[
 [(0,69,.62,.87),(.76,73,.23,.74),(1.04,74,1.42,1),(2.76,78,.51,.88),(3.52,76,.40,.82)],
 [(0,74,1.48,.98),(2.1,71,.34,.78),(2.55,69,.40,.88),(3.53,66,.39,.68)],
 [(0,69,.68,.88),(.84,71,.28,.78),(1.27,74,.58,.98),(2.25,73,1.39,1)],
 [(.30,71,1.53,.90),(2.62,69,.52,.74),(3.50,66,.38,.72)],
 [(.02,69,.45,.78),(.55,73,.38,.84),(1.03,74,.84,1),(2.03,78,1.40,1),(3.6,81,.29,.75)],
 [(0,79,.94,.95),(1.10,76,.53,.85),(1.87,74,1.23,.97),(3.43,71,.41,.77)],
 [(0,73,.92,.91),(1.16,76,.62,.81),(2.04,74,.68,.91),(2.97,69,.75,.80)],
 [(0,74,2.86,1)]
]
BRIDGE=[
 [(0,71,1.22,.92),(1.55,74,.36,.83),(2.02,78,1.62,1)],
 [(.52,76,.68,.85),(1.47,73,.46,.80),(2.02,71,1.55,.96)],
 [(0,69,1.68,1),(2.1,71,.57,.87),(2.97,72,.43,.81),(3.53,74,.39,.79)],
 [(0,76,2.45,1),(2.90,74,.95,.78)],
 [(.52,78,.71,.96),(1.51,81,.32,.83),(2.04,83,1.45,1)],
 [(0,81,.78,.96),(1.1,78,.65,.83),(2.19,76,1.10,.91)],
 [(0,74,.58,.9),(.76,76,.29,.75),(1.09,78,.96,1),(2.50,74,.75,.82)],
 [(0,73,2.31,.93),(3.28,69,.54,.82)]
]
HEAD=['D','G','Bm','A','Em','Gm','Asus','D']
MIDDLE=['Em','A','C','G','Bm','F#','Em','A']
def kit(s, bar, heat, rim=False, fill=False):
    t=4*bar
    if heat<1:return
    for j in range(8):
        if (bar%4==0 and j==7) or (heat==1 and j%2):continue
        offset=(.075 if j%2 else 0)+(.012 if j in (2,6) else 0)
        s.drum('ride' if heat==3 and j%2==0 else 'hat',t+j*.5+offset,(.38 if j%2==0 else .23)+heat*.035, .30)
    for j in [0,2.48] if bar%2==0 else [0,2,3.48]:
        s.drum('kick',t+j,.67 if j==0 else .46)
    for j in (1.018,3.018):
        s.drum('rim' if rim else 'snare',t+j,.55 if j<2 else .64,-.08)
    if heat>=2 and bar%2:s.drum('snare',t+2.76,.19,-.04)
    if fill:
        for j,dr,v in [(2.76,'snare',.29),(3.22,'tomhigh',.49),(3.54,'tomlow',.54),(3.81,'snare',.60)]:
            s.drum(dr,t+j,v,-.15 if dr=='tomhigh' else .11)
def combo(s,bar,key,next_key,heat=2):
    root,keys=VOICES[key];nroot=VOICES[next_key][0];t=4*bar
    phrase=bar%4
    pats=[
     [(0,0,1.35,.76),(1.55,7,.38,.53),(2.05,12,.64,.64),(3.53,None,.37,.52)],
     [(0,0,.76,.76),(1.18,7,.49,.54),(2.02,0,1.28,.69)],
     [(0,0,1.68,.78),(1.87,12,.32,.53),(2.45,7,.62,.67),(3.54,None,.35,.51)],
     [(0,0,1.08,.78),(1.55,7,.36,.53),(2,12,.72,.63),(3.04,None,.69,.54)]
    ]
    for pos,delta,l,v in pats[phrase]:
        pitch=nroot+(1 if root<nroot else -1) if delta is None else root+delta
        s.note('upright' if heat<3 else 'bass',t+pos,pitch,l,v,-.035,'normal')
    for pos,dyn,dur in ([(.08,.42,1.13),(2.55,.31,.65)] if heat<=1 else
             [[(.07,.48,.87),(1.77,.33,.54),(3.36,.38,.43)],[(.53,.43,.77),(2.05,.44,1.08)],[(.07,.46,.72),(1.51,.38,.50),(3.05,.42,.67)],[(.57,.44,.67),(2.35,.38,.62)]][phrase]):
        chord(s,bar,pos,keys,dur,'ep',dyn,-.29)
    if heat>=2:
        for pos in (1.05,2.82) if phrase%2==0 else (.79,2.47,3.55):
            chord(s,bar,pos,keys[1:],.22,'guitar',.26,.39)
def make_menu():
    s=Score('车库灯未熄 · After Hours in the Paddock',106,40,seed=2017)
    s.target_lufs=-18.0
    sections=[(0,'钥匙转动'),(4,'车库主题'),(12,'木管接句'),(20,'夜班桥段'),(28,'乐队合奏'),(36,'下一次发车')]
    for bar,title in sections:s.section(bar,title)
    intro=['G','Gm','D/F#','Asus']
    prog=intro+HEAD+['D','F#m','Bm','F#','Em','Gm','A','D']+MIDDLE+HEAD+['G','Gm','D/F#','A']
    for i,key in enumerate(prog):
        heat=1 if i<4 or 20<=i<24 or i>=36 else 3 if 28<=i<36 else 2
        combo(s,i,key,prog[(i+1)%40],heat)
        kit(s,i,heat,rim=i<28,fill=i in (11,19,27,35))
        if i in (4,28):s.drum('crash',4*i,.48,-.31)
        if i<4:
            if i in (0,2):melody(s,i,'piano',[(.53,69,.48,.77),(1.18,73,.38,.80),(1.77,74,1.53,.94)],.64,.12)
        elif i<20:
            j=(i-4)%8
            melody(s,i,'reed' if i<12 else 'nylon',THEME[j],.73,-.04)
            if j in (1,3,7):melody(s,i,'piano',[(2.55,VOICES[key][1][2]+12,.40,.84),(3.18,VOICES[key][1][1]+12,.59,.93)],.46,.28)
        elif i<28:
            melody(s,i,'piano',BRIDGE[i-20],.74,.05)
            if i>=24:melody(s,i,'flute',[(.06,VOICES[key][1][2]+12,1.57,.92),(2.54,VOICES[key][1][1]+12,.87,.80)],.42,.29)
        elif i<36:
            j=i-28;melody(s,i,'reed',THEME[j],.78,-.05)
            if j in (0,2,4,6):melody(s,i,'horn',THEME[j][:2],.43,.18,-12)
            if j in (1,3,5,7):melody(s,i,'flute',[(1.81,VOICES[key][1][1]+12,.52,.83),(2.53,VOICES[key][1][2]+12,.77,.98),(3.65,VOICES[key][1][0]+12,.26,.68)],.48,.33)
        elif i in (36,37):
            melody(s,i,'nylon',THEME[1 if i==36 else 3][:2],.62,-.10)
        elif i==38:melody(s,i,'piano',[(.12,74,1.22,.92),(1.82,69,1.38,.82)],.65,.12)
        else:melody(s,i,'piano',[(2.06,64,.43,.64),(2.65,67,.43,.72),(3.51,69,.42,.80)],.59,.12)
    return s

def make_result():
    s=Score('终点速报 · Timekeepers’ Club',118,32,seed=3031)
    s.target_lufs=-17.2
    for bar,title in [(0,'方格旗'),(4,'成绩公布'),(12,'独奏窗口'),(20,'全队回应'),(28,'交接下一站')]:s.section(bar,title)
    prog=['D','D','G','A']+HEAD+MIDDLE+['D','G','Bm','F#m','Em','Gm','Asus','D']+['G','D/F#','Em','A']
    for i,key in enumerate(prog):
        heat=3 if 4<=i<12 or 20<=i<28 else 2 if i<28 else 1
        combo(s,i,key,prog[(i+1)%32],heat);kit(s,i,heat,i>=28,fill=i in (3,11,19,27))
        if i in (0,4,20):s.drum('crash',i*4,.58,.34)
        if i<4:
            part=[[(0,74,.57,1),(.75,78,.36,.87),(1.25,81,1.22,1)],[(.55,78,.63,.85),(1.53,76,.46,.84),(2.11,74,1.29,1)],
                  [(0,71,1.35,.91),(1.76,74,.53,.86),(2.62,78,.83,.98)],[(0,76,.86,.93),(1.54,73,.45,.81),(2.38,69,.98,.89)]][i]
            melody(s,i,'brass',part,.82,-.04)
        elif i<12 or 20<=i<28:
            j=(i-4)%8;melody(s,i,'trumpet',THEME[j],.78,-.08)
            if i>=20:melody(s,i,'reed',THEME[j][1:3],.52,.26,-12)
            if j in (1,3,7):melody(s,i,'brass',[(2.10,VOICES[key][1][2],.38,.90),(2.74,VOICES[key][1][1],.28,.80),(3.07,VOICES[key][1][0],.54,.94)],.58,.14)
        elif i<20:
            melody(s,i,'eguitar',BRIDGE[i-12],.74,.09)
        elif i in (28,30):
            melody(s,i,'ep',THEME[3 if i==28 else 1],.65,.1)
        else:melody(s,i,'marimba',[(.05,VOICES[key][1][0]+12,.57,.82),(2.52,VOICES[key][1][1]+12,.68,.85)],.47,.32)
    return s

def make_podium():
    s=Score('七站之后 · Seven Flags',116,32,seed=7077)
    s.loop=False
    for bar,title in [(0,'颁奖号角'),(4,'桂冠主题'),(12,'引擎渐寂'),(20,'全奏回归'),(28,'最后的终止式')]:s.section(bar,title)
    prog=['D','G','Bm','A']+HEAD+['Bm','F#m','Em','G','C','Gm','Asus','A']+HEAD+['G','Gm','Asus','D']
    for i,key in enumerate(prog):
        root,keys=VOICES[key];t=i*4
        if i<31:
            s.note('cello',t,root+12,2.8,.63,-.17,'legato')
            chord(s,i,.06,[v+12 for v in keys[:3]],3.5,'strings',.30,-.15)
            if i>=4 and i<28 and not 12<=i<16:
                s.note('bass',t,root,1.63,.65,.01)
                s.note('bass',t+2,root+7,1.28,.51,.01)
                kit(s,i,2 if i<20 else 3,rim=i<20,fill=i in (11,19,27))
            if i in (0,4,20,28):s.drum('crash',t+.02,.59,-.27)
        if i<4:
            parts=[[(0,62,.69,1),(.78,69,.44,.85),(1.53,73,.28,.87),(2,74,1.65,1)],
                   [(0,71,1.12,.94),(1.57,74,.48,.83),(2.27,78,1.41,1)],
                   [(.52,74,.65,.91),(1.43,78,.40,.82),(2.02,81,1.55,1)],
                   [(0,76,1.26,.98),(1.55,73,.52,.82),(2.45,69,1.32,.90)]]
            melody(s,i,'horn',parts[i],.89,-.06)
        elif i<12 or 20<=i<28:
            j=(i-4)%8;melody(s,i,'horn' if i<12 else 'trumpet',THEME[j],.86,-.06)
            if i>=20:melody(s,i,'strings',THEME[j],.53,.20,-12)
            if j in (1,3,5,7):melody(s,i,'flute',[(1.64,keys[0]+12,.72,.76),(2.65,keys[1]+12,1.08,.91)],.48,.32)
        elif i<20:
            melody(s,i,'piano',BRIDGE[i-12],.72,-.19)
            if i>=16:melody(s,i,'cello',[(.56,keys[0],1.51,.9),(2.57,keys[1],1.23,.85)],.58,.19)
        elif i<31:
            ending=[[(0,79,1.39,1),(1.82,78,1.24,.88),(3.37,76,.43,.74)],
                    [(0,77,1.61,.97),(2.08,74,1.65,.89)],[(0,76,1.80,1),(2.48,73,.75,.86),(3.52,69,.37,.78)]]
            melody(s,i,'brass',ending[i-28],.85,-.05)
        else:
            melody(s,i,'horn',[(0,74,1.86,1)],.88,0)
            chord(s,i,.035,[50,57,62,66,69],1.80,'strings',.51,-.18)
            s.note('bass',t,38,1.18,.73,.01);s.note('bell',t+.10,86,1.26,.39,.30)
    return s
