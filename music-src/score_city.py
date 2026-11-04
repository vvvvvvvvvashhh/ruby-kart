"""Three original race charts. All lead lines are written in concert pitch.

The short notation in the scorebook reads left to right within a bar.
F4/.5 is an eighth note and r is a quarter rest. Long last notes may tie
into the next bar. Bass pitches are specified independently of voicings.
"""
import math
from studio import Score

NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    accidental = name[1:-1]
    return 12 * (int(name[-1]) + 1) + NAMES[name[0]] + accidental.count('#') - accidental.count('b')


def unpack(line):
    at = 0
    for token in line.split():
        note, _, span = token.partition('/')
        length = float(span or 1)
        if note != 'r':
            yield at, midi(note), length
        at += length


# Bass and four/five colour tones. Upper notes follow smooth voice-leading,
# and slash chords keep their independent bass through a harmonic change.
DRAWER = {
    'Bb6':   ('Bb1', 'A3 C4 D4 G4'),       'Bb/D': ('D2', 'A3 C4 F4 G4'),
    'G7alt': ('G1', 'B3 Eb4 F4 Ab4'),      'Gm9': ('G1', 'Bb3 D4 F4 A4'),
    'Cm9': ('C2', 'Bb3 D4 Eb4 G4'),        'F13': ('F1', 'A3 D4 Eb4 G4'),
    'Ebmaj9': ('Eb2', 'G3 Bb3 D4 F4'),     'Ebm6': ('Eb2', 'Gb3 Bb3 C4 F4'),
    'Dm7': ('D2', 'A3 C4 F4'),             'D7alt': ('D2', 'F#3 C4 Eb4 Bb4'),
    'C7#11': ('C2', 'E3 Bb3 D4 F#4'),     'F7sus': ('F1', 'G3 Bb3 C4 Eb4'),
    'F7/A': ('A1', 'G3 C4 Eb4 F4'),        'Db9': ('Db2', 'F3 B3 Eb4 Ab4'),
    'Ab13': ('Ab1', 'Gb3 Bb3 C4 F4'),     'Dbmaj9': ('Db2', 'Ab3 C4 Eb4 F4'),
    'C#dim': ('C#2', 'G3 Bb3 C#4 E4'),    'Bb7/D': ('D2', 'Ab3 Bb3 D4 G4'),
    'Dm69': ('D2', 'F3 A3 B3 E4'),        'Dm/F': ('F1', 'A3 B3 D4 E4'),
    'G13': ('G1', 'F3 B3 E4 A4'),         'Cmaj9': ('C2', 'E3 G3 B3 D4'),
    'Fmaj9': ('F1', 'A3 C4 E4 G4'),       'Em7b5': ('E2', 'G3 Bb3 D4 F4'),
    'A7b9': ('A1', 'G3 Bb3 C#4 E4'),      'A7sus': ('A1', 'G3 B3 D4 E4'),
    'D7/F#': ('F#1', 'A3 C4 D4 F#4'),     'Gm/Bb': ('Bb1', 'G3 D4 F4 A4'),
    'C13': ('C2', 'E3 A3 Bb3 D4'),        'Bbmaj9': ('Bb1', 'A3 C4 D4 F4'),
    'A13': ('A1', 'G3 B3 C#4 F#4'),       'E7b9': ('E2', 'G#3 B3 D4 F4'),
    'Am9': ('A1', 'G3 B3 C4 E4'),         'B7b9': ('B1', 'A3 C4 D#4 F#4'),
    'Dmaj9': ('D2', 'F#3 A3 C#4 E4'),     'E/D': ('D2', 'G#3 B3 D4 E4'),
    'Bm9': ('B1', 'A3 C#4 D4 F#4'),       'A/C#': ('C#2', 'G3 A3 C#4 E4'),
    'Gmaj9': ('G1', 'F#3 A3 B3 D4'),      'A6': ('A1', 'A3 B3 C#4 F#4'),
    'F#m7': ('F#1', 'E3 A3 C#4 F#4'),     'Em9': ('E2', 'G3 B3 D4 F#4'),
    'Esus': ('E2', 'A3 B3 D4 F#4'),       'E13': ('E2', 'G#3 C#4 D4 F#4'),
    'A/E': ('E2', 'G3 A3 C#4 E4'),        'A/G': ('G1', 'A3 C#4 E4 F#4'),
    'G/B': ('B1', 'F#3 G3 B3 D4'),        'C/D': ('D2', 'G3 B3 C4 E4'),
    'B7sus': ('B1', 'A3 B3 E4 F#4'),      'D/F#': ('F#1', 'A3 C#4 D4 E4'),
    'Gm6': ('G1', 'Bb3 D4 E4 A4'),        'D6': ('D2', 'F#3 A3 B3 E4'),
}
CHORDS = {n: (midi(b), [midi(p) for p in chord.split()]) for n, (b, chord) in DRAWER.items()}

# BABY PARK — "Marquee, Turn Left". Eb alto and trumpets share the shout;
# the delayed first syllable, repeated F, and answer down to D form the hook.
P_OPEN = [
    'r/2 F4/.5 G4/.5 Bb4/.75 r/.25', 'D5/1.1 r/.4 C5/.5 A4/.5 G4/.5',
    'Eb5/.55 r/.45 G5/.55 r/.45 F5/.5 D5/.5 C5/.5 r/.5',
    'r/1.5 A4/.5 C5/.5 Eb5/.5 F5/.5 Ab5/.5',
]
P_HOOK = [
    'r/.5 F5/.5 F5/.75 D5/.25 Bb4/.5 D5/.5 G5/.75 r/.25',
    'F5/1.45 D5/.55 r/.5 C5/.5 Bb4/.5 A4/.5',
    'G4/.5 Bb4/.5 C5/1.5 r/.5 Eb5/.75 D5/.25',
    'C5/.5 A4/.5 F4/1.35 r/.65 F4/.5 G4/.5',
    'Bb4/.5 D5/.5 G5/.75 F5/.25 D5/1.4 r/.6',
    'r/.5 G5/.5 Gb5/.5 F5/.75 Eb5/.25 C5/1',
    'D5/1 F5/.5 G5/.5 A5/1 G5/.5 F5/.5',
    'D5/1.8 r/.7 A4/.5 Bb4/.5 C5/.5',
]
P_ANSWER = [
    'r/.5 F5/.5 F5/.75 D5/.25 Bb4/.5 D5/.5 G5/1',
    'A5/1.4 G5/.6 F5/.5 D5/.5 Eb5/.5 F5/.5',
    'G5/1 r/.5 Eb5/.5 C5/.75 Bb4/.25 G4/1',
    'A4/1.6 r/.4 C5/.5 D5/.5 Eb5/.5 F5/.5',
    'G5/.7 F5/.3 D5/.5 Bb4/.5 D5/1 G4/1',
    'r/.5 B4/.5 D5/.5 F5/.5 Eb5/.5 D5/.5 B4/.5 G4/.5',
    'C5/1.4 Eb5/.6 G5/1.5 r/.5',
    'A5/.75 G5/.25 F5/.5 Eb5/.5 C5/.5 A4/.5 F4/1',
]
P_LIFT = [
    'Bb4/1.5 D5/.5 A5/1.5 G5/.5', 'F#5/.5 A5/.5 C6/.5 Bb5/.5 A5/1.45 r/.55',
    'G5/1.5 F5/.5 D5/.5 Bb4/.5 A4/.5 G4/.5', 'E5/1 r/.5 D5/.5 A4/2',
    'Db5/1.5 F5/.5 Ab5/1 F5/.5 Eb5/.5', 'C5/.5 Eb5/.5 Gb5/1.5 F5/.5 C5/1',
    'Bb4/.5 C5/.5 Eb5/1.5 G5/.5 F5/1', 'A5/2.5 r/.5 F5/.5 Eb5/.5',
]
P_SHOUT = [
    'D5/.75 F5/.25 G5/.5 Bb5/1.35 r/.15 A5/.5 G5/.5',
    'F5/1 D5/.5 Bb4/.5 A4/.5 G4/.5 F4/1',
    'G4/.5 Bb4/.5 C5/.5 Eb5/.5 G5/1.5 F5/.5',
    'F5/.75 A5/.25 G5/.5 F5/.5 Eb5/1 C5/.5 A4/.5',
    'Bb4/.5 D5/.5 F5/.75 G5/.25 Bb5/1.45 r/.55',
    'A5/.5 G5/.5 F5/1 Eb5/.5 C5/.5 A4/.5 G4/.5',
    'Bb4/1.5 D5/.5 C5/1 A4/.5 F4/.5', 'Bb4/2.5 r/1.5',
]
P_BREAK = [
    'F4/1.4 G4/.6 A4/1 Bb4/.5 D5/.5', 'C5/1.7 r/.3 Bb4/.5 G4/.5 Eb4/1',
    'r G4/.5 Bb4/.5 C5/1.65 r/.35', 'A4/1.5 F4/.5 C4/1 r',
    'Gb4/1.5 Bb4/.5 C5/1.6 r/.4', 'F4/2.5 Ab4/.5 Bb4/.5 C5/.5',
    'D5/.7 Eb5/.3 E5/.5 F5/.5 G5/1 A5/1', 'C6/.75 A5/.25 G5/.5 F5/.5 r/1.5 F5/.5',
]
P_TAG = [
    'Bb5/.75 A5/.25 G5/.5 F5/.5 Eb5/1 D5/.5 C5/.5',
    'Bb4/.75 D5/.25 F5/.5 G5/.5 Bb5/1.5 r/.5',
    'A5/.5 G5/.5 F5/.5 Eb5/.5 D5/1 C5/1', 'Bb4/1.7 r/.8 A4/.5 C5/.5 Eb5/.5',
]

# AMBER HARBOR — "Lanterns on the Jetty". The long flute notes let the
# nylon guitar pick an answer rather than following the melody in octaves.
H_OPEN = [
    'r/2 A4/.75 C5/.25 D5/1', 'E5/2.2 D5/.8 A4/1',
    'G4/.75 A4/.25 C5/1.5 E5/.5 D5/1', 'r/1.5 C5/.5 A4/.5 G4/.5 E4/.5 A4/.5',
]
H_HOOK = [
    'D5/1.5 r/.25 F5/.25 E5/.5 C5/.5 A4/1',
    'B4/.75 D5/.25 E5/1.7 r/.3 D5/.5 B4/.5',
    'G4/.75 A4/.25 C5/1.5 E5/.5 D5/.5 C5/.5',
    'A4/2.5 r/.5 G4/.5 A4/.5',
    'Bb4/1 D5/.5 E5/.5 F5/1.5 E5/.5',
    'G5/.75 F5/.25 E5/.5 C#5/.5 Bb4/1 A4/1',
    'D5/2.5 A4/.5 C5/.5 D5/.5',
    'E5/1.7 r/.3 C#5/.5 E5/.5 G5/.5 E5/.5',
]
H_ANSWER = [
    'D5/1.5 F5/.5 A5/1.5 G5/.5', 'E5/.75 D5/.25 B4/.5 G4/.5 E4/1 r',
    'r/.5 E5/.5 G5/1.5 B5/.5 A5/1', 'G5/.5 E5/.5 C5/2 r/.5 A4/.5',
    'Bb4/1 D5/.5 E5/.5 F5/1 E5/.5 D5/.5', 'G5/1.5 E5/.5 C#5/.75 Bb4/.25 A4/1',
    'F5/.75 E5/.25 D5/2 A4/.5 F4/.5', 'E4/1.5 r/.5 G4/.5 A4/.5 C#5/.5 E5/.5',
]
H_LIGHT = [
    'F5/1.5 A5/.5 C6/1.5 A5/.5', 'G5/2 r/.5 E5/.5 F5/.5 G5/.5',
    'Bb5/1.5 A5/.5 F5/1 D5/1', 'G5/.5 E5/.5 C5/1.5 r/.5 G4/.5 Bb4/.5',
    'A4/1 D5/.5 F5/.5 A5/1 G5/.5 F5/.5', 'Eb5/2.25 D5/.75 Bb4/1',
    'G4/.75 Bb4/.25 D5/1 E5/.5 F5/.5 G5/1', 'E5/1.4 C#5/.6 A4/1.5 r/.5',
]
H_SAIL = [
    'A5/1.5 C6/.5 A5/.75 G5/.25 F5/1', 'E5/.75 G5/.25 Bb5/1.5 A5/.5 G5/1',
    'F5/.5 D5/.5 Bb4/.75 D5/.25 F5/1 Bb5/1', 'G5/2.35 r/.65 E5/.5 G5/.5',
    'A5/1.5 F5/.5 D5/.5 A4/.5 D5/1', 'Bb5/.75 G5/.25 F5/1.5 Eb5/.5 Bb4/1',
    'D5/1 G5/.5 Bb5/.5 A5/.75 G5/.25 F5/1', 'E5/1.6 C#5/.4 A4/1.5 r/.5',
]
H_SOLO = [
    'r/.5 A4/.5 D5/.75 E5/.25 F5/.5 A5/.5 G5/1',
    'E5/1.5 D5/.5 B4/.5 G4/.5 E4/1',
    'r/.75 E4/.25 G4/.5 A4/.5 B4/.5 C5/.5 D5/.5 E5/.5',
    'G5/.75 E5/.25 C5/1.5 A4/.5 G4/.5 E4/.5',
    'F4/.5 A4/.5 Bb4/1.5 A4/.5 G4/.5 E4/.5',
    'Bb4/.75 C#5/.25 E5/.75 G5/.25 Bb5/1 G5/1',
    'F5/1.5 E5/.5 D5/1 C5/.5 A4/.5', 'r G4/.5 E4/.5 D4/1.7 r/.3',
]
H_TAG = [
    'F5/1.5 E5/.5 D5/1 A4/1', 'B4/.75 D5/.25 F5/1.5 E5/.5 D5/1',
    'C#5/1.5 E5/.5 G5/1 Bb5/.5 G5/.5', 'E5/2 r/.5 A4/.5 C5/.5 C#5/.5',
]

# SUNSHINE AIRPORT — "Climb Clearance". D-Lydian electric ribbon on the
# taxiway, a rising guitar line over the apron, then a held high note over
# the takeoff chord. The synth does not play the guitar's whole solo.
A_OPEN = [
    'r/1.5 D4/.5 A4/.5 B4/.5 E5/1', 'F#5/2 E5/.5 B4/.5 A4/1',
    'r/.5 G#4/.5 B4/.5 D5/.5 F#5/1 E5/1', 'C#5/1.45 r/.55 A4/.5 C#5/.5 E5/.5 A5/.5',
]
A_HOOK = [
    'r/.5 D5/.5 A4/.5 B4/.5 E5/.75 F#5/.25 A5/1',
    'G#5/1.5 F#5/.5 E5/1 B4/.5 A4/.5',
    'D5/.75 F#5/.25 A5/1 B5/1 A5/.5 F#5/.5',
    'E5/2.5 r/.5 C#5/.5 E5/.5',
    'D5/.5 B4/.5 G4/1 D5/.5 F#5/.5 G5/1',
    'A5/1.5 F#5/.5 E5/.75 D5/.25 B4/1',
    'E5/.75 G5/.25 B5/1.5 A5/.5 G5/.5 E5/.5',
    'C#5/1.5 B4/.5 A4/1 r',
]
A_ANSWER = [
    'r/.5 D5/.5 A4/.5 B4/.5 E5/.75 F#5/.25 A5/1',
    'B5/1.5 G#5/.5 F#5/1 E5/1',
    'D5/.5 F#5/.5 A5/.5 B5/1 D6/.5 C#6/1', 'A5/2.5 F#5/.5 E5/.5 C#5/.5',
    'B4/1 D5/.5 F#5/.5 G5/1.5 B5/.5', 'A5/.75 F#5/.25 E5/1.5 D5/.5 C#5/1',
    'B4/.5 E5/.5 G5/1 A5/.5 B5/.5 D6/1', 'C#6/1 A5/1 E5/1.5 r/.5',
]
A_CLIMB = [
    'A5/2.5 F#5/.5 D5/1', 'B5/1.5 A5/.5 G#5/1 E5/1',
    'F#5/2.5 A5/.5 B5/1', 'C#6/2.5 r/.5 A5/1',
    'B5/1.5 A5/.5 G5/1 D5/1', 'A5/1.5 G5/.5 E5/1.5 D5/.5',
    'G5/1.5 B5/.5 D6/1.5 B5/.5', 'C#6/2 B5/.5 A5/.5 E5/1',
]
A_TOWER = [
    'r/.5 B4/.5 D5/1 F#5/.75 E5/.25 D5/1', 'C#5/1.5 E5/.5 G#5/1 B5/.5 G#5/.5',
    'F#5/1 A5/.5 B5/.5 A5/1 F#5/.5 E5/.5', 'C#5/2 r/.5 E5/.5 A5/1',
    'B4/.5 D5/.5 G5/1 D6/1.5 B5/.5', 'A5/.75 G5/.25 E5/1.5 C#5/.5 E5/1',
    'F#5/1.5 B5/.5 A5/.5 F#5/.5 E5/1', 'G5/.75 E5/.25 C#5/1 E5/1.5 r/.5',
]
A_SOLO = [
    'r/.75 A4/.25 D5/.5 E5/.5 F#5/.75 A5/.25 B5/1',
    'G#5/.5 F#5/.5 E5/1.5 B4/.5 G#4/.5 B4/.5',
    'r D5/.5 F#5/.5 A5/.5 B5/.5 D6/1', 'C#6/.75 A5/.25 E5/1.25 r/.25 C#5/.5 E5/.5 F#5/.5',
    'G5/1.5 D5/.5 B4/.5 A4/.5 G4/1', 'r/.5 B4/.5 D5/.5 E5/.5 F#5/.5 A5/.5 G5/.5 F#5/.5',
    'E5/.75 G5/.25 B5/1 D6/.5 E6/.5 D6/1', 'C#6/.75 A5/.25 F#5/.5 E5/.5 C#5/1.5 r/.5',
]
A_CODA = [
    'F#5/1.5 A5/.5 D6/1.6 r/.4', 'B5/.75 G#5/.25 E5/1.5 B4/.5 A4/1',
    'G4/.5 B4/.5 D5/1 E5/.5 F#5/.5 G5/1', 'C#5/2.4 r/.6 A4/.5 C#5/.5',
]
A_BREAK = [
    'D4/2 A4/1.5 B4/.5', 'G#4/2.5 E4/.5 F#4/1',
    'B4/1.5 D5/.5 F#5/1.65 r/.35', 'E5/2.5 C#5/.5 A4/1',
    'G4/1.5 B4/.5 D5/1 G5/1', 'F#5/1.5 D5/.5 A4/1 r',
    'E5/1.5 G5/.5 B5/1.5 G5/.5', 'A5/1.5 r/.5 C#5/.5 E5/.5 F#5/.5 G5/.5',
]

# Each section owns its harmony, instrumentation and rhythmic placement.
# A comma marks a second chord in the bar. In the last lap the substitutions
# land on the same bars, allowing a change of arrangement on any downbeat.
def part(name, chords, lines, role, intensity):
    bars = chords.split()
    assert len(bars) == len(lines), name
    return name, bars, lines, role, intensity


P_A = 'Bb6 Gm9 Cm9 F13 Ebmaj9 Ebm6 Bb/D F13'
P_B = 'Bb6 D7alt Gm9 C7#11 Dbmaj9 Ab13 Cm9 F7sus,F13'
H_A = 'Dm69 G13 Cmaj9 Fmaj9 Em7b5 A7b9 Dm69 A7sus,A7b9'
H_B = 'Fmaj9 C13 Bbmaj9 C13 Dm/F Ebmaj9 Gm9 A7b9'
A_A = 'Dmaj9 E/D Bm9 A/C# Gmaj9 D/F# Em9 A13'
A_B = 'Dmaj9 E13 Bm9 A/C# Gmaj9 A/G Em9 A13'

CHARTS = {
    0: [
        part('检票口亮灯', 'Bb6 G7alt Cm9 F7sus,F13', P_OPEN, 'intro', 0.78),
        part('双弯主题', P_A, P_HOOK, 'verse', .88),
        part('萨克斯接棒', 'Bb6 D7alt Cm9 F13 Ebmaj9 G7alt Cm9 F13', P_ANSWER, 'answer', .94),
        part('镜屋的后门', P_B, P_LIFT, 'lift', .96),
        part('跑马灯齐奏', 'Bb6 Gm9 Cm9 F13 Ebmaj9 Ebm6 Bb/D,F13 Bb6', P_SHOUT, 'chorus', 1),
        part('鼓手让出半步', 'Dm7 Cm9 Ebmaj9 F13 Ebm6 Dbmaj9 Cm9 F7sus,F13', P_BREAK, 'solo', .79),
        part('再来一圈', P_A, P_HOOK, 'home', 1.02),
        part('售票员挥旗', 'Ebmaj9 Bb/D Cm9,F13 Bb6,F13', P_TAG, 'tag', .97),
    ],
    2: [
        part('船灯靠岸', 'Dm69 G13 Cmaj9 A7sus,A7b9', H_OPEN, 'intro', .68),
        part('海风应答', H_A, H_HOOK, 'verse', .86),
        part('码头二重奏', H_A, H_ANSWER, 'answer', .93),
        part('海面忽然宽了', H_B, H_LIGHT, 'lift', .95),
        part('桅杆与帆', H_B, H_SAIL, 'chorus', 1),
        part('六根琴弦', H_A, H_SOLO, 'solo', .79),
        part('灯塔回望', H_A, H_HOOK, 'home', 1.01),
        part('拐向风口', 'Dm/F G13 Em7b5,A7b9 A7sus,A7b9', H_TAG, 'tag', .93),
    ],
    5: [
        part('滑行许可', 'Dmaj9 Bm9 E/D A13', A_OPEN, 'intro', .74),
        part('蓝色引导线', A_A, A_HOOK, 'verse', .90),
        part('机组回答', A_A, A_ANSWER, 'answer', .95),
        part('第一道云影', 'Bm9 E13 Dmaj9 A/C# Gmaj9 A/G Esus A13', A_TOWER, 'lift', .98),
        part('离地', A_B, A_CLIMB, 'chorus', 1.04),
        part('机舱窗边', 'Dmaj9 E/D Bm9 F#m7 Gmaj9 D/F# Em9 A13', A_BREAK, 'break', .70),
        part('独奏越过云层', A_A, A_SOLO, 'solo', 1),
        part('看见跑道', A_B, A_HOOK, 'home', 1.02),
        part('转向下趟起飞', 'Dmaj9 E/D G/B A7sus,A13', A_CODA, 'tag', .93),
    ],
}
FINALE_SWAP = {
    0: {'Gm9':'G7alt', 'Bb/D':'Bb7/D', 'Ebm6':'Db9'},
    2: {'Cmaj9':'Am9', 'Dm/F':'D7/F#', 'Gm9':'Gm/Bb'},
    5: {'F#m7':'D/F#', 'Esus':'E13', 'Gmaj9':'G/B'},
}


def held(sc, inst, beat, voicing, duration, vel, spread=0, reverse=False, art='normal'):
    notes = list(reversed(voicing)) if reverse else voicing
    for j, pitch in enumerate(notes):
        sc.note(inst, beat + j*spread, pitch, max(.04, duration - j*spread),
                vel * (1 - .028*j), art=art)


def bass_note(sc, inst, beat, root, offset, duration, velocity, art='normal'):
    # Bass arrangements sit between E1 and Eb3. Avoid sub notes that would
    # disappear on a phone speaker; the voice keeps its useful upper partials.
    if root + offset < 28:
        offset += 12
    sc.note(inst, beat, root + offset, duration, velocity, art=art)


def perform_line(sc, inst, start, line, velocity, transpose=0, swing=0, gate=.91):
    events = list(unpack(line))
    for j, (at, pitch, length) in enumerate(events):
        late = swing if abs((at % 1)-.5)<.01 else 0
        # Fresh breath at the start; the last syllable tapers rather than
        # ending every note with the same gate and velocity.
        dynamic = 1.05 if j==0 else .94 + .065*math.sin(j*1.1+.5)
        if length >= 1.4:
            dynamic *= .99
        elif j==len(events)-1:
            dynamic *= .93
        articulation = 'legato' if length >= 1.35 else 'accent' if (j==0 or at==2) and length<1 else 'normal'
        sc.note(inst,start+at+late,pitch+transpose,max(.09,length*gate-late*.45),
                min(.98,velocity*dynamic),art=articulation)


def city_drums(sc, cid, bar, j, role, density, last, final):
    start=4*bar
    def hit(kind,t,velocity):
        sc.drum(kind,start+t,velocity*density)
    downbeat = j==0 and role in ('chorus','home','lift','solo')
    if downbeat:
        hit('crash',0,.56 if role=='solo' else .75)
    if cid==0:
        if role=='intro' and j<2:
            if j==0: hit('kick',0,.59);hit('rim',2,.48)
            else: hit('kick',0,.62);hit('hat',1.57,.34);hit('rim',3,.58)
        else:
            for t in ((0,2.53) if role=='solo' else ((0,1.58,2.75) if j%2 else (0,2,3.58))):
                hit('kick',t,.79 if t==0 else .59)
            for t in (1.015,3.018):
                hit('rim' if role=='solo' and j<4 else 'snare',t,.73 if t<2 else .79)
            if j%4==1: hit('snare',2.77,.24)
            ride = role in ('lift','chorus','home') or final and role=='answer'
            for t in range(4):
                hit('ride' if ride else 'hat',t+.012,.51 if t%2==0 else .41)
                if t in (1,3) and (t!=3 or not last):
                    hit('ride' if ride else 'hat',t+.59,.32 if t==1 else .36)
            if j%4==2 and role!='solo': hit('openhat',3.55,.39)
        if last:
            for t,k,v in ((2.63,'snare',.34),(3,'snare',.65),(3.54,'tomhigh',.54),(3.79,'tomlow',.66)):
                hit(k,t,v)
    elif cid==2:
        if role=='intro' and j<2:
            hit('shaker',.01,.29);hit('shaker',1.52,.25);hit('wood',3,.30)
            return
        for t in (0,1.74,2,3.75):
            hit('kick',t,.69 if t in (0,2) else .38)
        for t in ((0,1.5,3) if j%2==0 else (1,2.5)):
            hit('rim',t+.022,.54 if t!=0 else .47)
        for k in range(8):
            if last and k==7: continue
            hit('shaker',k*.5+.012,.43 if k in (0,4) else .30 if k%2 else .34)
        if role in ('chorus','home','lift') or final:
            for t in ((.75,2.48,3.24) if j%2 else (1.22,2.74)):
                hit('conga',t,.46 if t>2 else .36)
        if j%4==2 and role!='solo': hit('tamb',3.5,.36)
        if last:
            for t,k in ((2.5,'conga'),(3,'tomhigh'),(3.5,'conga'),(3.75,'tomlow')):
                hit(k,t,.52)
    else:
        if role=='break' or (role=='intro' and j<2):
            hit('kick',0,.65);hit('rim',2.02,.53)
            for t in ((.5,1.5,3.5) if j%2 else (0,.5,2.75)):hit('hat',t,.32)
        else:
            kicks=((0,1.5,2.75,3.5),(0,.75,2,3.75),(0,1.75,2.5),(0,2,2.75))[j%4]
            for t in kicks:hit('kick',t,.90 if t==0 else .68)
            for t in (1.018,3.014):hit('snare',t,.86 if t<2 else .90)
            if j%4==1:hit('snare',2.75,.26)
            tone='ride' if role in ('chorus','home') else 'hat'
            for k in range(8):
                if j%4==3 and k==7:continue
                hit(tone,k*.5+.007,.53 if k%2==0 else .33)
            if j%4==2:hit('openhat',3.53,.49)
            if final and role in ('chorus','home') and j%2==0:hit('tamb',2.5,.37)
        if last:
            for t,k,v in ((2.75,'snare',.41),(3,'tomhigh',.69),(3.5,'tomhigh',.56),(3.75,'tomlow',.73)):
                hit(k,t,v)

P_REPLIES = [
    'r/2.45 D4/.3 F4/.25 G4/.5 Bb4/.5', 'r/2 E4/.5 Eb4/.5 D4/1',
    'r/1.5 G4/.5 Bb4/1.35 r/.65', 'r/2.5 C5/.5 Eb5/.5 F5/.5',
    'r/2 Eb4/.5 G4/.5 Bb4/1', 'r/1.5 Bb4/.5 Gb4/.75 Eb4/.25 C4/1',
    'r/2.5 A4/.5 C5/1', 'r/.5 A4/.5 G4/.5 F4/.5 r/2',
]
H_REPLIES = [
    'r/2 A4/.5 F4/.5 E4/.5 D4/.5', 'r/2.5 D4/.5 G4/1',
    'r/1.5 E4/.5 G4/.5 A4/.5 B4/1', 'r/2 C5/.5 A4/.5 G4/1',
    'r/2 D4/.5 F4/.5 Bb4/1', 'r/1.5 E4/.5 G4/.5 Bb4/.5 A4/1',
    'r/2.5 F4/.5 E4/.5 D4/.5', 'r/2 G4/.5 E4/.5 C#4/1',
]
A_REPLIES = [
    'r/2.5 F#4/.5 A4/.5 B4/.5', 'r/2 B4/.5 G#4/.5 E4/1',
    'r/1.5 D5/.5 F#5/1.5 r/.5', 'r/2 E5/.5 C#5/.5 A4/1',
    'r/2 B4/1 D5/.5 F#5/.5', 'r/1.5 F#4/.5 A4/.5 D5/.5 E5/1',
    'r/2 G4/.5 B4/.5 D5/1', 'r/1.5 E5/.5 C#5/.5 A4/.5 F#4/1',
]

# Written-in bass articulation, independent of the lead. (offset, interval,
# gate) all in beats/semitones. The occasional chromatic pickup points
# directly to the next bass root instead of using a fixed scale walk.
P_BASS = [
    ((0,0,.85),(1.57,7,.33),(2,12,.63),(3.55,7,.31)),
    ((0,0,1.14),(1.55,12,.32),(2,7,1),(3.55,0,.31)),
    ((0,0,.69),(.99,7,.57),(2,12,.69),(2.83,7,.28)),
    ((0,0,1.1),(1.67,7,.24),(2,0,.6),(3,7,.44)),
]
H_BASS = [
    ((0,0,1.19),(1.76,7,.55),(2.74,12,.57)),
    ((0,0,1.09),(1.52,7,.32),(2,0,1.22),(3.75,7,.15)),
    ((0,0,1.5),(2,7,.67),(3.5,12,.28)),
    ((0,0,.86),(1.76,7,.56),(2.76,0,.54)),
]
A_BASS = [
    ((0,0,.55),(.76,12,.2),(1.5,7,.28),(2,0,.47),(2.75,12,.22),(3.5,7,.32)),
    ((0,0,.83),(1.25,7,.17),(1.75,12,.24),(2.5,0,.35),(3.25,7,.37)),
    ((0,0,.57),(.75,7,.2),(1.5,12,.49),(2.75,7,.22),(3,0,.44)),
    ((0,0,.84),(1.75,7,.2),(2,12,.56),(3,7,.32)),
]


def arrange_bar(sc,cid,bar,j,role,intensity,changes,next_change,line,last,final):
    def harmony(at):
        return CHORDS[changes[min(len(changes)-1,int(at/2))]]
    def comp(inst,at,length,amp,spread=.010,reverse=False,extra=0,omit_low=False,art='normal'):
        _, chord=harmony(at)
        notes=chord[1:] if omit_low else chord
        held(sc,inst,bar*4+at,[x+extra for x in notes],length,amp*intensity,spread,reverse,art)
    start=bar*4
    sparse=role in ('break','solo') or (role=='intro' and j<2)
    big=role in ('chorus','home')
    bass='upright' if cid in (0,2) else 'pickbass'
    pattern=(P_BASS if cid==0 else H_BASS if cid==2 else A_BASS)[j%4]
    if sparse:pattern=((0,0,1.63),(2.5,7,1.05)) if j%2==0 else ((0,0,2.11),(3,7,.58))
    if role=='intro' and j==0:pattern=((0,0,2.32),)
    if len(changes)>1 and not any(at==2 for at,_,_ in pattern):
        pattern=tuple(e for e in pattern if e[0]<1.7 or e[0]>2.6)+((2,0,.57),)
    for at,interval,dur in pattern:
        root,_=harmony(at)
        bass_note(sc,bass,start+at,root,interval,dur,(.88 if at==0 else .68 if interval else .77)*intensity,
                  'accent' if at==0 and j%4==0 else 'muted' if dur<.26 else 'normal')
    if j%4==3 and not last:
        next_root=CHORDS[next_change.split(',')[0]][0]
        bass_note(sc,bass,start+3.63,next_root,1 if j%8==3 else -1,.26,.64*intensity,'slide')

    if cid==0:
        # Four-to-the-bar guitar ghosts on the outside track, short piano
        # answers on the inside. Swap foreground timbre at eight-bar marks.
        if sparse:
            comp('piano',.04,1.64,.49)
            if j%2==0:comp('guitar',2.57,.29,.40,reverse=True,omit_low=True)
        else:
            for k in ([1.04,2.57] if j%2==0 else [.57,2.05,3.59]):
                comp('guitar',k,.19,.42,.009,k>2,omit_low=True,art='muted')
            for t in ((0,3.04) if j%2==0 else (.56,2.56)):
                comp('piano',t,.55 if t==0 else .32,.50)
        inst={'intro':'brass','verse':'trumpet','answer':'reed','lift':'reed',
              'chorus':'brass','solo':'piano','home':'trumpet','tag':'brass'}[role]
        perform_line(sc,inst,start,line,.83*intensity,swing=.068)
        if big and (j%4 in (0,2) or final):
            # A tenor-band answer below the lead, not a constant high octave.
            perform_line(sc,'reed',start,P_REPLIES[j%8],.59*intensity,swing=.057)
        elif role=='verse' and (j in (2,3,7) or final and j%2==1):
            perform_line(sc,'reed',start,P_REPLIES[j%8],.49,swing=.056)
        elif role=='answer' and j%2==1:
            perform_line(sc,'trumpet',start,P_REPLIES[j%8],.49,swing=.065)
        if role=='lift':
            root,ch=harmony(0)
            sc.note('horn',start+.04,ch[-2],2.35,.47*intensity,art='legato')
        if final and role in ('home','chorus','tag'):
            for t in ((.56,2.56) if j%2 else (1.57,3.03)):
                comp('horn',t,.36,.47,.002,omit_low=True,art='accent')
    elif cid==2:
        if sparse:
            # Solo nylon gets unaccompanied space, the piano only places
            # a shell voicing around the phrase on bars 1, 3, 5 and 7.
            if j%2==0:comp('ep',.04,1.85,.49)
            if role!='solo' or j%2:comp('nylon',2.51,.58,.41,.022)
        else:
            rhythm=((0,1.51,3.02) if j%2==0 else (.51,2.02,3.51))
            for k,t in enumerate(rhythm):
                comp('nylon',t,.69 if k==0 else .40,.63 if k==0 else .51,
                     .014 if k!=1 else .009,reverse=k==1,omit_low=k>0)
            if j%2==0 or len(changes)>1:comp('ep',2.13,1.17,.40)
        inst={'intro':'nylon','verse':'flute','answer':'reed','lift':'flute',
              'chorus':'trumpet','solo':'nylon','home':'flute','tag':'reed'}[role]
        perform_line(sc,inst,start,line,(.86 if role=='solo' else .82)*intensity,
                     gate=.94 if inst in ('flute','reed') else .88)
        if role in ('verse','home') and (j%2 or final):
            perform_line(sc,'nylon',start,H_REPLIES[j%8],.65)
        if role in ('answer','chorus') and (j%2==0 or final):
            perform_line(sc,'flute',start,H_REPLIES[j%8],.47,transpose=12 if j in (1,5) else 0)
        if role in ('lift','home') and j%2==0:
            _,ch=harmony(0)
            sc.note('cello',start+.06,ch[0]-12,2.85,.46,art='legato')
        if final and big and j%2==0:
            _,ch=harmony(0);sc.note('strings',start+.08,ch[-1]+12,2.85,.43,art='legato')
    else:
        if sparse:
            comp('ep',.04,2.65,.58,.02)
            if j%2:comp('pad',2.10,1.56,.33,.03,omit_low=True)
        else:
            for t in ((.50,1.75,3.00) if j%2==0 else (.75,2.5)):
                comp('ep',t,.29 if t%1 else .64,.56,.008,t>2)
            if role not in ('solo','verse') or final:
                for t in ((.75,2.75) if j%2 else (1.25,3.5)):
                    comp('guitar',t,.16,.40,.006,omit_low=True,art='muted')
        inst={'intro':'lead','verse':'eguitar','answer':'lead','lift':'eguitar',
              'chorus':'eguitar','solo':'eguitar','home':'eguitar','tag':'lead','break':'ep'}[role]
        perform_line(sc,inst,start,line,.87*intensity,gate=.94)
        if big and j%2==0 or final and role in ('verse','answer','home'):
            perform_line(sc,'lead' if inst=='eguitar' else 'eguitar',start,A_REPLIES[j%8],.51,gate=.86)
        if role in ('chorus','break','home') and (j%2==0 or final):
            comp('strings' if role!='break' else 'pad',.09,2.92,.35,.018,omit_low=True)
        if final and big:
            for t in ((1.5,3.5) if j%2==0 else (2.75,)):
                comp('brass',t,.34,.48,.002,omit_low=True,art='accent')
    city_drums(sc,cid,bar,j,role,intensity,last,final)


def compose(course:int,final:bool=False)->Score:
    titles={0:'Turnstile Swing · 跑马灯双弯',2:'Lanterns on the Jetty · 栈桥船灯',5:'Climb Clearance · 起飞许可'}
    bpm={0:151,2:130,5:144}[course]
    parts=CHARTS[course]
    n=sum(len(chords) for _,chords,_,_,_ in parts)
    sc=Score(titles[course]+(' · 冲线编曲' if final else ''),bpm,n,meter=4,seed=8101+course*97)
    placement={
      0:{'upright':(.95,-.07,.19),'guitar':(.78,-.39,.16),'piano':(.86,.23,.22),
         'reed':(.92,-.20,.31),'brass':(.90,.08,.28),'trumpet':(.88,.01,.28),'horn':(.70,.33,.33)},
      2:{'upright':(.90,-.06,.20),'nylon':(1.0,-.24,.26),'ep':(.70,.37,.25),
         'flute':(.91,-.02,.32),'reed':(.86,.15,.28),'trumpet':(.84,-.06,.29),
         'cello':(.75,-.32,.36),'strings':(.66,.27,.38)},
      5:{'pickbass':(1,-.025,.115),'guitar':(.71,.38,.17),'eguitar':(.98,-.10,.27),
         'lead':(.86,.14,.24),'ep':(.91,-.32,.21),'pad':(.66,.30,.37),
         'strings':(.68,.25,.34),'brass':(.84,.30,.24)},
    }[course]
    for inst,(gain,pan,room) in placement.items():
        sc.trim(inst,gain=gain,pan=pan,room=room)
    whole=[c for _,ch,_,_,_ in parts for c in ch]
    bar=0
    for section,chords,lines,role,intensity in parts:
        sc.section(bar,section)
        for j,(chart,line) in enumerate(zip(chords,lines)):
            changes=chart.split(',')
            if final and role in ('answer','home','tag') and j%4 in (1,2,3):
                changes=[FINALE_SWAP[course].get(ch,ch) for ch in changes]
            # Final lap has an actual alternate vocal phrase / instrumental
            # route, not just a louder bus or a faster playback rate.
            if final:
                if course==0 and role in ('home','verse') and j>=4:line=P_ANSWER[j]
                elif course==2 and role=='home':line=H_ANSWER[j]
                elif course==5 and role=='home' and j>=4:line=A_ANSWER[j]
                elif course==5 and role=='chorus' and j in (2,3,6,7):line=A_SOLO[j]
            # Phrase-level crescendos avoid max-density orchestration on every bar.
            dynamic=intensity*(.94+.018*(j%4))*(1.025 if final and role!='break' else 1)
            arrange_bar(sc,course,bar,j,role,dynamic,changes,whole[(bar+1)%n],line,j==len(chords)-1,final)
            bar+=1
    return sc
