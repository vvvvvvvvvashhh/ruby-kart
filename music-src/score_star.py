"""Headlights Among the Stars. Original eight-bar invincibility interlude."""
from studio import Score

# E Lydian head, bass descent, then a B pedal to pick the head up again.
# The first two bars make their own call and answer within a single star.
CHANGES=[
    (40,(56,59,63,66),47), (39,(54,59,63,68),42),
    (37,(52,56,59,63),44), (42,(54,58,61,64),46),
    (45,(52,56,59,61),40), (44,(54,59,61,64),39),
    (42,(52,56,61,64),49), (35,(54,57,61,64),42),
]
HEAD=[
    [(0,76,.38),(.50,80,.18),(.75,83,.55),(1.50,82,.64),(2.50,78,.30),(3,80,.72)],
    [(0,83,.87),(1.25,87,.24),(1.60,85,.23),(2,83,.58),(2.75,80,.33),(3.3,78,.50)],
    [(0,76,.39),(.5,80,.19),(.75,85,.72),(1.75,83,.44),(2.50,80,.38),(3.00,83,.79)],
    [(0,82,1.15),(1.5,78,.31),(2,76,.37),(2.75,73,.50),(3.5,78,.28)],
    [(0,81,.58),(.75,85,.47),(1.50,88,.70),(2.5,85,.30),(3,83,.77)],
    [(0,80,.83),(1.25,76,.34),(1.75,78,.34),(2.25,83,.60),(3.25,80,.41)],
    [(0,78,.40),(.5,81,.22),(.75,85,.54),(1.5,83,.44),(2.25,81,.49),(3,78,.62)],
    [(0,78,.72),(1.0,75,.40),(1.75,71,.57),(2.75,73,.35),(3.25,75,.59)],
]

def compose():
    s=Score('星芒接力 · Headlights Among the Stars',160,8,seed=75117)
    s.target_lufs=-16.5
    for bar,title in [(0,'星芒呼答'),(2,'抬高一阶'),(4,'铜管接力'),(6,'转回弯心')]:
        s.section(bar,title)
    s.trim('bell',.73,.21,.18)
    s.trim('trumpet',.90,-.08,.18)
    s.trim('marimba',.88,-.20,.13)
    s.trim('ep',.91,.26,.15)
    for bar,(bass,voicing,fifth) in enumerate(CHANGES):
        b=bar*4
        for i,(beat,pitch,length) in enumerate(HEAD[bar]):
            voice='marimba' if bar<4 else 'trumpet'
            s.note(voice,b+beat,pitch,length,.87 if i==0 else .74,art='accent' if i==0 else 'normal')
            if i in (0,3) and bar!=7:
                s.note('bell',b+beat+.025,pitch+12,min(.24,length),.51)
            if bar>=4 and i in (0,2):
                s.note('marimba',b+beat,pitch-12,min(.36,length),.67)
        if bar in (1,3,7):
            for t,n in [(2.46,voicing[0]+12),(3.47,voicing[1]+12)]:
                s.note('horn',b+t,n,.29,.63,art='staccato')
        for t,v,l in [(0,bass,.63),(.91,bass+12,.20),(1.5,fifth,.35),(2,bass,.55),(3.15,fifth,.31)]:
            s.note('pickbass',b+t,v,l,.81 if t==0 else .65)
        for t,l,v in [(.43,.29,.62),(1.72,.20,.50),(2.48,.33,.63),(3.60,.17,.53)]:
            s.chord('ep',b+t,voicing,l,v,art='staccato')
        for t in [0,2,2.77]:s.drum('kick',b+t,.84 if t==0 else .63)
        for t in [1.015,3.012]:s.drum('snare',b+t,.78)
        for h in range(8):
            s.drum('hat' if h!=7 or bar%2==0 else 'openhat',b+h*.5,.46 if h%2==0 else .33)
        if bar in (3,7):
            for t,n in [(3.42,'tomhigh'),(3.69,'tomlow')]:s.drum(n,b+t,.62)
    return s
