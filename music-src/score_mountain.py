"""Four original through-arranged race scores for Ruby Tour.

Each lead line below is an eight-bar handwritten part. A bar is entered in
quarter notes: notes without a slash are eighths, r is a rest, and ! accents
an attack. Separate performance parts are orchestrated after the lead sheets.
"""
import math
import re

from studio import Score

PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
CHORDS = {
    '': (0, 4, 7), 'm': (0, 3, 7), '5': (0, 7, 12), '6': (0, 4, 7, 9),
    'm6': (0, 3, 7, 9), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10),
    'maj7': (0, 4, 7, 11), 'maj9': (0, 4, 7, 11, 14), 'm9': (0, 3, 7, 10, 14),
    '9': (0, 4, 7, 10, 14), 'add9': (0, 4, 7, 14), 'sus4': (0, 5, 7),
    '7sus': (0, 5, 7, 10), '7b9': (0, 4, 7, 10, 13),
    'dim7': (0, 3, 6, 9), 'm7b5': (0, 3, 6, 10), '6/9': (0, 4, 7, 9, 14),
}

def pc(name):
    return PC[name[0]] + name[1:].count('#') - name[1:].count('b')

def midi(note):
    return 12 * (int(note[-1]) + 1) + pc(note[:-1])

def chord(symbol):
    root, quality, bass = re.fullmatch(r'([A-G][b#]?)([^/]*)(?:/([A-G][b#]?))?', symbol).groups()
    return pc(root), CHORDS[quality], pc(bass or root)

def nearest(pitch_class, target):
    return pitch_class + 12 * round((target - pitch_class) / 12)

def play_line(s, bar, material, voice, velocity, pan, octave=0, art='legato'):
    tokens = material.split()
    beat = 0.0
    for token in tokens:
        spec, _, length = token.partition('/')
        span = float(length) if length else .5
        accent = spec.startswith('!')
        name = spec.lstrip('!')
        if name != 'r':
            # Lean into the offbeat and the apex; relax at phrase endings.
            v = velocity * (1.105 if accent else (.97 if beat % 1 else 1.015))
            hold = max(.13, span - (.035 if span >= .75 else .055))
            s.note(voice, bar * s.meter + beat, midi(name) + octave * 12, hold, min(.98, v), pan, art=art)
        beat += span
    if beat > s.meter + .001:
        raise ValueError(f'{bar}: {beat} quarter notes in {material}')

# The downbeat is often left to the rhythm section. Several lines end before
# the last beat, leaving a real opening for another instrument to answer.
RAIN = {
 'signal': [
  'r/2.5 C#5 B4 A4', 'F#4/1.5 r A4 C#5/1 r',
  'r/1 E5/1.5 C#5 B4 A4', 'G#4/2 r/1 F#4 G#4',
  'A4/1 C#5/1.5 B4 A4 r', 'B4/1 E5/2 r/1',
  'C#5/1 B4 A4 G#4/1 F#4/1', 'G#4/2 r/1 C#5 B4'],
 'neon': [
  'r !F#4 C#5/1 B4 A4/1 r', 'r E5/1.5 C#5 B4 A4/1',
  'F#4 A4 B4 C#5 !E5/1.5 r', 'B4/1.5 A4 G#4/1 r C#5',
  'r F#4 C#5/1 A4 B4/1 C#5', 'F#5/1.5 E5 C#5/1 r B4',
  'A4/1 B4 C#5 D5/1.5 C#5', 'G#4/2 r A4 B4/1'],
 'horizon': [
  'G#4/1 B4/1 F#5/1.5 E5', 'D#5/2 B4 G#4 F#4/1',
  'A4 B4 C#5/1.5 r E5/1', 'F#5/2.5 r B4/1',
  'E5/1 G#5/1.5 F#5 E5 B4', 'D#5/1 C#5/1 B4/1 r/1',
  'A4 C#5 E5/1 D5/1 C#5/1', 'B4/1.5 r G#4/1 C#5/1'],
 'orbit': [
  'C#5/2 r/1 B4 A4', 'G#4/1 F#4/2 r/1',
  'E5/1.5 D5 C#5/1 A4/1', 'B4/3 r/1',
  'r F#4 A4 B4 C#5/1 E5/1', 'F#5/2 E5/1 C#5/1',
  'A4/1 E5/1 D5 C#5 B4/1', 'G#4/1.5 r B4 C#5 G#4 A4'],
 'crest': [
  'A4/1 C#5 E5 F#5/1.5 E5', 'D5/2 r A4 B4 C#5',
  'E5/1 B4 C#5 A5/1.5 G#5', 'F#5/2 E5/1 C#5/1',
  'D5/1 C#5 B4 E5/1 G#5/1', 'A5/1.5 G#5 F#5/1 E5/1',
  'F#5/1 D5 C#5 B4/1 A4/1', 'G#4/1.5 B4 C#5/1 r F#4'],
 'trail': [
  'r F#4 A4/1 C#5/1 B4 A4', 'D5/1.5 C#5 B4/1 r/1',
  'E5/1.5 B4 C#5/1 A4/1', 'G#4/2 r C#5 B4 A4',
  'F#4/1 A4/1 E5/1 F#5 E5', 'C#5/1 B4 A4 D5/1 E5/1',
  'F#5/2 E5 C#5 B4 A4', 'C#5/1 G#4/1 r/1 C#5 B4'],
}
SNOW = {
 'tracks': [
  'r/1.5 A4 F#4 E4', 'D4/1.5 r A4/1',
  'B4/1 A4 F#4/1 E4', 'D4/2 r/1',
  'F#4 A4 D5/1.5 A4', 'G4/1 E4/1 r/1',
  'F#4/1 A4/1 E5/1', 'C#5/1.5 r A4 B4'],
 'ridge': [
  '!D5/1.5 A4 B4 F#4', 'E4/1.5 F#4 A4/1',
  'B4/1 D5 E5/1 D5', 'C#5/2 r A4',
  'D5/1.5 A4 B4 D5', 'F#5/1 E5 D5/1 B4',
  'G4 A4 B4/1.5 A4', 'E5/1 C#5/1 r/1'],
 'pine': [
  'B4/1.5 D5/1 F#5', 'E5/1.5 D5 C#5/1',
  'A4/1 C#5/1 E5/1', 'F#5/2.5 r',
  'G5/1 F#5 E5/1 D5', 'C#5/1.5 A4 B4 F#4',
  'G4/1 B4 D5/1 E5', 'C#5/1.5 r A4/1'],
 'lake': [
  'A4/2.5 E5', 'D5/1.5 r/1 F#4',
  'G4/1 B4 D5/1.5', 'E5/2 r A4',
  'B4/1.5 F#4 G4/1', 'A4/1 F#4 D4/1.5',
  'E4/1 G4 B4/1.5', 'A4/2 r/1'],
 'sun': [
  'F#5/1.5 E5 D5 A4', 'B4/1 D5/1 E5/1',
  'G5/1 F#5 E5/1 D5', 'E5/2 r A4',
  'D5 F#5 A5/1.5 F#5', 'E5/1 D5 B4/1 G4',
  'A4/1 C#5 E5/1 F#5', 'D5/1.5 C#5/1 A4'],
 'home': [
  'D5/1.5 B4 A4 F#4', 'E4/1.5 A4 C#5/1',
  'D5 E5 F#5/1.5 E5', 'D5/2 r/1',
  'A4/1 D5 F#5/1 E5', 'B4/1.5 G4 A4 D5',
  'E5/1 C#5/1 A4/1', 'D5/1.5 r A4/1'],
}
FORGE = {
 'sparks': [
  'r/2 E4 G4 A4/1', 'B4/1.5 r A4 G4 E4/1',
  'r/1 E4 G4 Bb4 A4/1 G4', 'F#4/2 r/1 D#4/1',
  'E4/1 r G4 A4/1 B4/1', 'D5/1.5 B4 A4 G4 E4/1',
  'F4/1 A4/1 C5/1.5 A4', 'B4/2 r/1 B3/1'],
 'stamp': [
  '!E4/1 r G4 A4/1 B4 B4', 'D5/1 B4/1 G4 A4/1 r',
  'E4 G4 Bb4/1 A4/1 G4 E4', 'F#4/1.5 E4 r B3 D#4/1',
  'E4/1 G4/1 A4 B4 D5/1', 'E5/1.5 D5 B4/1 A4 G4',
  'F4/1 A4 F4 C5/1 B4/1', 'D#5/1.5 B4 r/1 B3/1'],
 'pressure': [
  'G4/1 B4/1 D5/1.5 C5', 'Bb4/1 A4 G4 F4/1 D4/1',
  'G4 A4 Bb4/1 D5/1 F5/1', 'E5/2 C5/1 r G4',
  'F5/1.5 E5 D5/1 A4/1', 'C5/1 Bb4 A4 G4/1 E4/1',
  'F#4 A4 C5/1 B4/1.5 A4', 'B4/2 D#5/1 r/1'],
 'furnace': [
  'E4/2.5 G4 A4 B4', 'C5/2 B4/1 G4/1',
  'D5/2 F#4/1 A4/1', 'B4/3 r/1',
  'A4/1 C5/1 E5/2', 'D5/1.5 C5 A4/1 F4/1',
  'G4/1 B4 D5/1 C5 B4', 'D#5/2 r/1 B3/1'],
 'crown': [
  'E5/1 B4 D5 E5/1.5 G5', 'F#5/1 E5/1 D5 B4 A4/1',
  'C5 D5 E5/1 G5/1 F#5/1', 'B4/2 D#5/1 B4/1',
  'E5/1.5 G5 F#5/1 E5 D5', 'C5/1 G4 A4 C5/1 D5/1',
  'F5/1.5 E5 C5/1 A4/1', 'B4/1 F#4/1 D#4/1 r/1'],
 'chain': [
  'E4/1 B4 A4 G4/1 E4/1', 'r D5/1 B4 A4 G4 E4/1',
  'F4/1 A4/1 C5/1 r F4', 'E4/2 G4 A4 B4/1',
  'C5/1 E5/1 D5/1 A4/1', 'G4/1.5 A4 B4/1 D5/1',
  'F#4/1 A4/1 C5/1 D#5/1', 'B4/1 D#4/1 r/1 E4 G4'],
}
WARIO = {
 'launch': [
  'r/1.5 Bb3 Eb4/1 G4/1', 'Bb4/2 G4 F4 Eb4/1',
  'Ab4/1 C5/2 Bb4/1', 'G4/2 r/1 Bb3/1',
  'Eb4 G4 Bb4/1 C5/1 Bb4/1', 'Ab4/1.5 G4 F4/1 Eb4/1',
  'D4/1 F4/1 Bb4/1.5 Ab4', 'G4/2 r Bb3 Eb4 F4'],
 'summit': [
  'G4/1 Bb4 Eb5/1.5 D5 C5', 'Bb4/2 G4 F4 Eb4/1',
  'Ab4 C5 Eb5 F5/1.5 Eb5/1', 'D5/1.5 Bb4 F4/1 r Bb3',
  'G4/1 Bb4 Eb5/1.5 G5 F5', 'Eb5/1.5 C5 Bb4/1 G4/1',
  'Ab4/1 C5/1 D5 Eb5 F5/1', 'D5/2 r/1 Bb4 C5'],
 'cave': [
  'G4/1 Eb4/1 C4/1.5 D4', 'Eb4/2 G4/1 Bb4/1',
  'Ab4/1 C5/1 G4/2', 'F4/2 r G4 Ab4/1',
  'Bb4/1 G4/1 Eb5/2', 'D5/1.5 C5 Ab4/1 F4/1',
  'G4/1 B4 D5 C5/1 Ab4/1', 'G4/2 r/1 G4 D4'],
 'pines': [
  'C5/1 G4 Ab4 Eb5/1.5 D5', 'C5/1.5 Bb4 G4/1 F4/1',
  'Ab4/1 C5 Eb5 F5/1 Eb5/1', 'Bb4/2.5 r/1 F4',
  'G4/1 C5/1 Eb5/1.5 F5', 'G5/1.5 F5 Eb5/1 C5/1',
  'D5/1 Bb4/1 Ab4 C5 Bb4/1', 'F4/1 D4/1 Bb3/1 r/1'],
 'festival': [
  'Bb4/1 Eb5/1 G5/1.5 F5', 'Eb5/2 Bb4/1 G4/1',
  'C5/1 Eb5 F5 Ab5/1 G5/1', 'F5/1.5 D5 Bb4/1 r Bb4',
  'Eb5/1 G5/1 Bb5/1.5 G5', 'Ab5/1 G5 F5 Eb5/1 C5/1',
  'D5/1 F5/1 G5 F5 Eb5/1', 'D5/2 r Bb4 C5 D5'],
 'finish': [
  'G4 Bb4 Eb5/1 G5/1 F5/1', 'Eb5/1.5 Bb4 C5/1 G4/1',
  'Ab4 C5 Eb5/1 F5/1 Ab5/1', 'G5/2 Eb5/1 Bb4/1',
  'C5/1 Eb5 G5 Ab5/1 F5/1', 'Eb5/1.5 C5 Bb4/1 G4/1',
  'Ab4/1 D5/1 F5/1 Bb4/1', 'Eb5/2 r Bb3 Eb4 F4'],
}

# Section names are also exported as markers in the editable project. Chord
# voicings use inversions independently of the bass, especially under a melody
# held across the changes.
FORMS = {
 1: [
 ('Switch on the stars','signal','F#m9 Dmaj9 Aadd9 E/G# Bm9 Dmaj7 G#m7b5 C#7sus'),
 ('Ribbon of light','neon','F#m9 Dmaj9 Amaj9 E/G# F#m9 Bm9 Dmaj9 C#7'),
 ('Lights over the rail','horizon','Emaj9 B/D# C#m9 Badd9 Emaj9 G#m7 Dmaj9 C#7sus'),
 ('The orbit opens','crest','Amaj9 Dmaj9 C#m7 F#m9 Bm9 Amaj9/D Dmaj9 C#7'),
 ('Behind the moon','orbit','F#m9 C#m7/E Amaj9 Dmaj9 Bm9 F#m7/A Dmaj9 C#7sus'),
 ('Ribbon, in reflection','neon','F#m9 Dmaj9 Aadd9 E6 F#m9 Bm7 Dmaj9 C#7b9'),
 ('All colors out','crest','Amaj9 Dmaj9 C#m9 F#m9 Bm9 Aadd9 Dmaj9 C#7'),
 ('Tail lights','trail','F#m9 Dmaj9 Amaj9 E/G# Bm9 Dmaj9 G#m7b5 C#7')],
 3: [
 ('Six tracks in fresh snow','tracks','Dadd9 Bm7 Gmaj9 A6 D/F# Em9 Gmaj7 A7sus'),
 ('The turned ski','ridge','Dmaj9 Bm7 Gmaj9 Aadd9 D/F# Bm7 Em9 A7'),
 ('Fir-line duet','pine','Bm9 Gmaj9 Aadd9 D/F# Gmaj9 Bm7 Em9 A7'),
 ('Second traverse','ridge','D6 F#m7 Gmaj9 A7sus Bm9 Dadd9 Em7 A9'),
 ('The blue lake','lake','Dmaj9 Bm7 Gmaj9 A7sus Bm9 D/F# Em9 A7'),
 ('Long light','sun','Dmaj9 Bm7 Gmaj9 A7sus D/F# Gmaj9 Em9 A7'),
 ('Over the crest','pine','Bm9 Gmaj9 D/A Dadd9 Em9 Bm7 Gmaj9 A7'),
 ('Returning to the gate','home','Dmaj9 A/C# Bm9 D/F# Gmaj9 Bm7 A7 Dadd9')],
 4: [
 ('Ignition','sparks','Em9 Em7 Cmaj9 B7 Em9 G6 Fmaj7 B7'),
 ('Stamping press','stamp','Em7 G6 Fmaj7 B7 Em9 Cmaj9 Fmaj7 B7b9'),
 ('Pressure gauge','pressure','Gm7 Bbmaj9 Gm9 C9 Dm7 Fmaj7 F#m7b5 B7'),
 ('Under the axle','furnace','Em9 Cmaj9 Dadd9 B7 Am9 Dm9 Gmaj7 B7'),
 ('Crown of fire','crown','Em9 G/D Cmaj9 B7 Em7 Cmaj9 Fmaj9 B7'),
 ('Counterweight','stamp','Em9 G6 Fmaj7 B7sus Em7 Cmaj7 Fmaj9 B7'),
 ('Chain returns','chain','Em7 Cmaj9 Fmaj7 Em9 Am7 Gmaj7 F#m7b5 B7')],
 6: [
 ('Door opens over the snow','launch','Ebadd9 Cm7 Abmaj9 Eb/G Abmaj9 Fm9 Bb9 Eb6'),
 ('The mountain horn','summit','Ebmaj9 Cm9 Abmaj9 Bb7 Eb/G Abmaj9 Fm9 Bb9'),
 ('Run through the pines','pines','Cm9 Eb/Bb Abmaj9 Bbadd9 Cm9 Abmaj9 Fm9 Bb7'),
 ('Blue vault','cave','Cm9 Ebmaj9 Abmaj9 Fm9 Ebmaj9 Fm9 G7b9 G7sus'),
 ('The river turns','pines','Cm9 Gm7 Abmaj9 Bb7 Cm9 Abmaj9 Fm9 Bb9'),
 ('Mountain in sunlight','summit','Eb6 Cm9 Abmaj9 Bb7 Eb/G Fm9 Abmaj9 Bb9'),
 ('Stand of flags','festival','Ebmaj9 Cm9 Abmaj9 Bb9 Eb/G Abmaj9 Fm9 Bb7'),
 ('Finish terrace','finish','Eb6 Cm9 Abmaj9 Bb7 Abmaj9 Cm7 Bb9 Eb6')],
}
FINAL_CHANGES = {
 1: {0:'F#m9 Dmaj9 Amaj9 E/G# Bm9 Dmaj9 G#m7b5 C#7',
     3:'Amaj9 Dmaj9 E6 F#m9 Bm9 C#m7 Dmaj9 C#7b9',
     6:'Amaj9 Bm9 C#m9 Dmaj9 Bm9 Aadd9 Dmaj9 C#7b9'},
 3: {1:'Dmaj9 Bm7 Em9 A7sus D/F# Bm7 Gmaj9 A9',
     5:'Dmaj9 Bm9 Gmaj9 A7sus D/F# Em9 Gmaj9 A9'},
 4: {0:'Em9 Em9 Am7 B7 Em9 G6 Fmaj9 B7',
     4:'Em9 G/D Cmaj9 B7b9 Em9 Am7 Fmaj9 B7'},
 6: {1:'Ebmaj9 Cm7 Fm9 Bb9 Eb/G Abmaj9 Fm9 Bb7',
     6:'Ebmaj9 Cm9 Abmaj9 Bb7sus Gm7 Abmaj9 Fm9 Bb7'},
}
# The home-straight versions have newly written upper answers instead of
# speeding the tapes up. Their harmonic downbeats stay aligned for a lap change.
FINAL_VERSIONS = {
 1: {'neon':['C#5 F#5/1 E5 C#5/1 B4/1','A4/1 D5 F#5 E5/1.5 C#5',
              'B4 C#5 E5/1 F#5/1.5 E5','C#5/1.5 B4 G#4/1 r/1'],
     'crest':['D5 E5 F#5/1 A5/1.5 G#5','F#5/1 E5 C#5 D5/1 A4/1',
              'B4/1 D5 F#5 E5/1 C#5/1','G#4 B4 C#5/1 B4/1 r/1'],
     'trail':['F#4 A4 C#5/1 E5 F#5/1 E5','D5/1.5 C#5 A4/1 B4/1',
              'D5/1 F#5/1 E5 C#5 B4/1','C#5/1 G#4/1 r C#5 B4 G#4']},
 3: {'ridge':['D5 F#5 A5/1.5 F#5','E5/1 D5 B4/1 A4',
              'G4 B4 E5/1.5 D5','C#5/1.5 r B4 A4'],
     'sun':['A5/1.5 F#5 D5 A4','B4 D5 F#5/1 E5/1',
            'G5/1 F#5 E5/1 C#5','D5/2 r/1'],
     'home':['D5/1 F#5 A5/1.5','G5/1.5 D5 B4 G4','A4 C#5 E5/1 F#5/1','D5/2 r A4']},
 4: {'stamp':['E4 G4 A4/1 B4 D5 E5/1','G5/1.5 E5 D5/1 B4/1',
              'A4 C5 F5/1 E5/1 C5/1','D#5/2 B4/1 r/1'],
     'crown':['G5/1.5 F#5 E5/1 B4/1','C5 E5 G5/1 F5 E5 D5/1',
              'F5/1.5 E5 A4/1 C5/1','B4 D#5 F#5/1 B4/1 r/1'],
     'chain':['C5/1 A4 E5 D5/1 C5/1','B4/1 G4/1 A4 B4 D5/1',
              'A4 C5 F#5/1 E5/1 C5/1','B4/1 D#4/1 r E4 G4 A4']},
 6: {'summit':['Eb5/1 Bb4 G5/1.5 F5 Eb5','C5/1.5 Ab4 C5/1 Eb5/1',
               'F5/1 G5 Ab5/1 F5 Eb5','D5/1.5 Bb4 r/1 F4/1'],
     'festival':['G5/1 Bb5/1 Ab5/1.5 G5','F5/1 Eb5 Ab5/1 C5/1',
                 'D5 F5 G5/1 F5/1 D5/1','Bb4/1 D5/1 Bb4/1 r/1'],
     'finish':['Ab4/1 C5 Eb5 G5/1 F5/1','Eb5/1 Bb4 C5 Eb5/1 G5/1',
               'Ab5/1 G5 F5 D5/1 Bb4/1','Eb5/2 r Bb3 Eb4 F4']},
}
# A compact obbligato used only in selected rests or as a real contrapuntal
# line. The voice and register vary independently of the main tune.
COUNTERS = {
 1:['r/1 C#5 E5 B4/1.5 r','A4/2 F#4 A4 r/1','r/1 B4/1 E5/1 C#5/1','B4/1.5 G#4 r/2',
    'r/1 D5 C#5 B4/1 A4/1','A4/1.5 E5 C#5/1 B4/1','F#4/1 A4 B4 D5/1 F#5/1','E5/1 C#5/1 G#4/1 r/1'],
 3:['r/1.5 F#4 A4 B4','D5/1.5 B4/1 A4','r G4 A4 B4/1 E5','C#5/1.5 A4/1 r',
    'A4/1.5 D5/1 F#5','E5/1.5 B4 A4 F#4','G4 B4/1 D5 E5/1','C#5/2 r/1'],
 4:['r/1 B3/1 E4/1 G4/1','A4/1.5 G4 E4/1 r/1','F4/1 A4/1 C5/1 A4/1','F#4/1.5 D#4 r/2',
    'G4/1 E4/1 B3 E4 G4 A4','C5/2 B4 G4 E4/1','A4/1 F4/1 C5/1 A4/1','F#4/1 D#4/1 r/2'],
 6:['r/1 Bb3 Eb4 G4/1 Bb4/1','G4/1.5 F4 Eb4/1 r/1','Ab4/1 Eb4/1 C4/1.5 Eb4','F4/2 D4/1 r/1',
    'G4/1 Bb4/1 Eb5/1.5 Bb4','Ab4/1.5 Eb4 C4/1 r/1','F4 Ab4 C5/1 Bb4/1 Ab4/1','F4/1 D4/1 Bb3/1 r/1'],
}
TITLES = {1:'夜轨上的七束光',3:'雪梢写下的六拍',4:'热铁复调',6:'山脊先听见号声'}
METERS = {1:(132,4),3:(150,3),4:(146,4),6:(142,4)}
LIB = {1:RAIN,3:SNOW,4:FORGE,6:WARIO}
QUIET = ('signal','tracks','orbit','lake','furnace','cave','launch')
PEAK = ('crest','sun','crown','festival','finish')

def voice_chord(h, last, registers):
    """Nearest inversion of guide tones; avoid four moving roots in unison."""
    root, intervals, _ = chord(h)
    pcs = list(dict.fromkeys((root+i) % 12 for i in intervals))
    chosen=[]
    for j, target in enumerate(registers):
        centre = target if last is None else .58*last[j]+.42*target
        options = [p for p in range(target-8,target+9)
                   if p%12 in pcs and (not chosen or p>chosen[-1]+2)]
        if not options:
            options = [p for p in range(target-3,target+19)
                       if p%12 in pcs and (not chosen or p>chosen[-1]+1)]
        def cost(p):
            missing = 0 if p%12 not in {q%12 for q in chosen} else 6.0
            # Third and seventh do more harmonic work than a doubled fifth.
            colour = -.65 if (p-root)%12 in (3,4,10,11) else 0
            return abs(p-centre) + missing + colour
        chosen.append(min(options, key=cost))
    return chosen

def bass_part(s,cid,sec,bar,h,hnext,theme,final):
    root,iv,bpc=chord(h)
    nxt=chord(hnext)[2]
    low=nearest(bpc,40 if cid!=4 else 38)
    if low>46:low-=12
    fifth=nearest((root+7)%12,low+6)
    third=nearest(root+iv[1],low+4)
    four=nearest(nxt,low+2)
    values=[low,fifth,low+12,third, four-1 if four>=low else four+1]
    b=bar%8
    quiet=theme in QUIET
    if cid==3:
        voice='upright' if theme not in PEAK else 'bass'
        if theme=='lake': pattern=[(0,1.37,0), (1.55,1.22,1)] if b%2==0 else [(0,2.50,0)]
        elif b in (3,7):pattern=[(0,.92,0),(1.5,.60,1),(2.5,.40,4)]
        elif b%2:pattern=[(0,.73,0),(1.51,1.09,1)]
        else:pattern=[(0,1.02,0),(1.50,.57,1),(2.44,.48,3)]
    elif cid==4:
        voice='pickbass'
        if theme=='furnace':pattern=[(0,2.32,0),(2.8,.73,1)]
        elif b in (3,7):pattern=[(0,.92,0),(1.50,.60,0),(2.75,.47,3),(3.50,.40,4)]
        elif b%2:pattern=[(0,.65,0),(.78,.36,0),(1.52,.68,1),(2.50,.42,0),(3.25,.52,2)]
        else:pattern=[(0,.84,0),(1.50,.68,0),(2.76,.44,1),(3.45,.43,2)]
    elif cid==1:
        voice='bass' if sec in (0,3,4,6) else 'pickbass'
        if theme=='orbit':pattern=[(0,2.37,0),(3.0,.84,1)] if b%2==0 else [(0,2.93,0)]
        elif theme=='signal' and b<4:pattern=[(0,2.35,0),(3.44,.43,1)] if b%2==0 else [(0,2.5,0)]
        elif b in (3,7):pattern=[(0,.72,0),(1.47,.56,1),(2.47,.52,2),(3.47,.4,4)]
        elif b%2:pattern=[(0,1.16,0),(1.74,.62,1),(2.75,.52,2),(3.53,.39,3)]
        else:pattern=[(0,.80,0),(1.27,.50,2),(2.0,.83,1),(3.27,.48,3)]
    else:
        voice='upright' if theme in ('cave','launch') else 'bass'
        if theme=='cave':pattern=[(0,2.43,0),(3.02,.74,1)]
        elif b in (3,7):pattern=[(0,1.23,0),(2.0,.71,1),(3.40,.42,4)]
        elif b%2:pattern=[(0,1.35,0),(1.99,.70,1),(3.06,.61,2)]
        else:pattern=[(0,.85,0),(1.48,.50,1),(2.06,1.04,0),(3.54,.36,3)]
    for j,(offset,d,k) in enumerate(pattern):
        v=(.76 if j==0 else .64) * (.79 if quiet else 1.0)
        s.note(voice,bar*s.meter+offset,values[k],d,v,-.035,
               art='muted' if d<.55 and cid==4 else 'legato' if d>1.2 else 'normal')

def harmony_part(s,cid,sec,bar,theme,voicing,final):
    first=bar*s.meter;b=bar%8;quiet=theme in QUIET
    def block(inst,at,d,v,notes=None,pan=None,art='normal'):
        s.chord(inst,first+at,list(voicing if notes is None else notes),d,v,pan,art=art)
    def pick(inst,at,idx,d,v,pan,octave=0):
        s.note(inst,first+at,voicing[idx]+12*octave,d,v,pan,art='normal')
    if cid==1:
        # Warm syncopated Rhodes plays in the holes between the bass/pop; the
        # synth pad is restricted to the bridge and long chorus suspensions.
        if theme=='orbit':
            block('pad',.02,3.72,.38,pan=-.17)
            if b in (1,3,5):
                pick('ep',2.47,2,.83,.50,.25);pick('ep',3.46,1,.45,.44,.25)
        elif theme=='signal' and b<4:
            block('ep',.01,2.65,.45,pan=-.28)
            if b==2:pick('bell',2.50,3,1.23,.38,.4,1)
        elif theme=='crest':
            block('ep',.06,1.24,.48,pan=-.28);block('ep',2.49,.88,.46,pan=-.28)
            if b%2==0:block('pad',.01,3.72,.30,voicing[1:],.27)
            if b in (1,5):pick('pluck',3.46,3,.41,.52,.35,1)
        elif b%2==0:
            block('ep',.52,.77,.51,pan=-.22);block('ep',2.73,.77,.46,pan=-.22)
            if theme=='horizon':pick('pluck',3.50,2,.46,.42,.42,1)
        else:
            block('ep',.03,1.36,.47,pan=-.22);block('ep',2.50,.47,.45,pan=-.22)
        if final and sec in (1,5,7) and b in (0,4):
            block('organ',.07,1.73,.31,voicing[1:],.27)
    elif cid==3:
        # Compound metre: an actual guitar-wind duet rather than a locked
        # stream of eighths. The cello takes the second dotted beat in the lake.
        if theme=='lake':
            block('strings',.03,2.72,.35,voicing[:3],-.13)
            if b%2:
                pick('piano',1.48,2,1.15,.45,.29);pick('piano',2.45,3,.47,.38,.31)
        elif theme=='sun':
            block('piano',.04,.91,.45,pan=-.27)
            block('strings',1.50,1.34,.35,voicing[1:],.17)
            if b in (1,5):pick('bell',2.49,2,.48,.42,.48,1)
        else:
            if b%4 in (0,2):
                for at,k,d,v in [(0.02,0,.8,.52),(.98,2,.43,.44),(1.51,1,.69,.49),(2.43,3,.52,.45)]:
                    pick('nylon',at,k,d,v,-.32)
            else:
                block('nylon',.03,1.20,.47,pan=-.32)
                if b%4==1:block('nylon',1.52,1.12,.44,voicing[1:],-.3)
            if theme=='pine' and b in (0,4):block('strings',.03,2.8,.32,voicing[:3],.24)
        if final and theme in ('pine','home','ridge') and b in (1,5):
            pick('marimba',1.52,3,.51,.40,.38)
    elif cid==4:
        root,iv,_=chord(FINAL_CHANGES[4].get(sec,FORMS[4][sec][2]).split()[b] if final else FORMS[4][sec][2].split()[b])
        g=nearest(root,47)
        if g<40:g+=12
        power=[g,g+7]
        if theme=='furnace':
            block('organ',.01,3.55,.39,pan=-.22)
            if b in (0,4):block('eguitar',.03,2.34,.43,power,.24,'legato')
        elif theme=='crown':
            block('eguitar',.02,1.1,.53,power,-.36)
            block('eguitar',1.52,.68,.46,power,-.36)
            if b%2==0:block('brass',2.98,.55,.42,voicing[1:3],.26,'accent')
        else:
            for at,d,v in ([(0,.57,.57),(1.5,.46,.52),(2.75,.46,.53)]
                            if b%2==0 else [(0,.80,.54),(1.76,.29,.43),(2.5,.68,.52)]):
                block('eguitar',at,d,v,power,-.32,'muted' if d<.7 else 'normal')
            if theme=='pressure' and b in (0,2,4,6):
                block('organ',.08,2.2,.32,voicing[1:],.27)
        if final and theme not in ('furnace','sparks') and b==6:block('brass',1.47,.46,.48,voicing[1:],.25,'accent')
    else:
        if theme in ('cave','launch'):
            block('strings',.03,3.7,.37,voicing[:3],-.2)
            if b%4 in (0,2):
                pick('piano',1.52,2,.76,.42,.30);pick('piano',2.99,3,.68,.40,.30)
        elif theme in ('festival','finish'):
            block('strings',.04,2.8,.36,voicing[:3],-.19)
            if b%2==0:
                block('brass',2.0,.66,.43,voicing[1:],.02,'accent')
            if b in (3,7):pick('piano',2.72,3,1.20,.41,.28)
        elif theme=='pines':
            for at,ks,d,v in [(0,0,.68,.48),(1.04,2,.43,.43),(1.51,1,.61,.46),(2.50,3,.88,.46)]:
                pick('guitar',at,ks,d,v,-.31)
            if b%4==1:block('strings',.02,3.2,.30,voicing[1:],.18)
        else:
            block('strings',.02,1.14,.37,voicing[:3],-.24);block('strings',2.01,1.45,.35,voicing[1:],-.24)
            if b==6:pick('bell',3.45,3,.45,.39,.42,1)

def kit(s,cid,sec,bar,theme,final):
    t=bar*s.meter;b=bar%8
    def d(kind,at,v,pan=None):
        if at<s.meter-.001:s.drum(kind,t+at,min(.98,v),pan)
    last=b==7
    if cid==3:
        # Skipping 6/8: brushes/rim on the second dotted beat, with a
        # responding offbeat kick only on selected bars.
        soft=theme in ('tracks','lake')
        if not (theme=='tracks' and b<2):d('kick',0,.62 if soft else .76)
        if theme=='lake':
            if b%2:d('wood',1.5,.40,-.19)
            if b in (0,6):d('ride',.03,.39,.28)
        else:
            d('rim' if soft or theme=='pine' else 'snare',1.51,.58 if soft else .72)
            if b in (2,5):d('kick',2.47,.53)
            for j in (0,2,3,5):
                d('shaker' if soft else 'hat',j*.5+(.012 if j in (2,5) else 0),(.49 if j in (0,3) else .32),.30)
            if theme=='sun' and b in (0,4):d('tamb',1.50,.54,-.25)
            if final and b%2==0 and not soft:d('ride',0,.43,.29)
        if last:
            if sec in (1,4,6):
                d('tomhigh',2,.58,-.20);d('tomlow',2.53,.63,.19)
            elif sec==7:d('wood',2,.43,-.22)
        if b==0 and sec in (2,5,7):d('crash',0,.61)
        return
    if cid==1:
        quiet=theme in ('signal','orbit')
        if theme=='signal' and b<2:
            d('ride',0,.38,.24)
            if b:d('kick',2.5,.53)
            return
        if quiet:
            for at in (0,2.75) if b%2==0 else (0,):d('kick',at,.67 if at==0 else .52)
            d('rim',2.02,.58)
            for at in (.5,1.5,3.5):d('hat',at,.38,.29)
        else:
            for at in ((0,1.75,2.5) if b%2==0 else (0,2,3.25)):d('kick',at,.82 if at==0 else .65)
            d('snare',1.01,.75);d('snare',3.015,.78)
            for j in range(8):
                if last and j>5:continue
                d('ride' if theme=='crest' and j%2==0 else 'hat',j*.5+(.012 if j%2 else 0),(.50 if j%2==0 else .34),.30)
            if b in (1,5):d('openhat',3.48,.50,.28)
            if b==6:d('rim',2.75,.32,-.12)
            if final and b in (0,4):d('clap',3.036,.49,-.16)
        if b==0 and sec in (3,5,6):d('crash',0,.68,.2)
    elif cid==4:
        if theme=='furnace':
            d('kick',0,.78);d('snare',2.01,.70)
            if b in (1,5):d('kick',3.52,.50)
            d('ride',.03,.49,.32)
            if b in (2,6):d('wood',1.50,.50,-.27)
        elif theme=='sparks' and b<2:
            d('tomlow',0,.72,-.22);d('wood',1.5,.62,.26)
            if b:d('snare',3.01,.72)
        else:
            for at in ((0,1.5,2.75) if b%2==0 else (0,.75,2.5,3.25)):d('kick',at,.87 if at==0 else .72)
            d('snare',1,.82);d('snare',3,.88)
            for j in range(8):
                if last and j>4:continue
                d('ride' if theme=='crown' else 'hat',j*.5+.009*(j%2),(.57 if j%2==0 else .37),.29)
            if b in (0,2,4):d('wood',2.75,.57,-.30)
            if b==5:d('snare',2.74,.31)
        if b==0 and sec in (1,2,4,6):d('crash',0,.76)
    else:
        if theme in ('launch','cave'):
            if theme=='launch' and b<2:
                if b==0:d('tomlow',0,.62)
                return
            d('kick',0,.63);d('tomlow',2.04,.51,-.17)
            if b in (1,3,5):d('rim',3.52,.44,.12)
            if b%2==0:d('ride',.06,.39,.28)
        else:
            for at in ((0,2,3.54) if b in (2,6) else (0,2.51)):d('kick',at,.79 if at==0 else .62)
            d('snare',1.02,.70);d('snare',3.01,.78)
            for j in (0,1,2,4,5,6,7):
                if last and j>4:continue
                d('ride' if theme in ('festival','finish') and j%2==0 else 'hat',j*.5+.01*(j%2),(.50 if j%2==0 else .32),.33)
            if theme in ('festival','finish'):d('tamb',3.025,.49,-.21)
            if final and theme=='festival' and b in (0,4):d('openhat',1.5,.50,.3)
        if b==0 and sec in (1,2,5,6,7):d('crash',0,.64 if sec<6 else .73,.22)
    if last:
        # Transitions are shaped around the following section: two answering
        # toms on one cut, a snare pickup on another, and silence before a break.
        if sec%3==0:
            d('tomhigh',2.75,.61,-.22);d('tomlow',3.48,.73,.18)
        elif sec%3==1:
            d('snare',2.75,.43);d('tomhigh',3.28,.58,-.14);d('tomlow',3.75,.65,.23)
        elif sec!=2 or cid==4:d('openhat',3.50,.48,.25)

def lead_voice(cid,sec,theme,b,final):
    if cid==1:
        if theme=='signal':return 'ep' if b<4 else 'lead'
        if theme=='orbit':return 'cello' if b<4 else 'lead'
        if theme=='horizon':return 'eguitar' if b<4 else 'lead'
        if sec==5 and b<4:return 'eguitar'
        return 'lead'
    if cid==3:
        if theme in ('tracks','lake'):return 'nylon' if b<4 else 'flute'
        if theme=='ridge':return 'flute' if sec==1 or b<4 else 'strings'
        if theme=='pine':return 'reed' if b<4 else 'strings'
        if theme=='sun':return 'strings' if b<4 else 'flute'
        return 'flute' if b<4 else 'strings'
    if cid==4:
        if theme=='sparks':return 'eguitar' if b<4 else 'brass'
        if theme=='furnace':return 'cello' if b<4 else 'horn'
        if theme=='stamp' and sec==5:return 'eguitar' if b<4 else 'trumpet'
        if theme=='pressure':return 'eguitar' if b<4 else 'brass'
        return 'brass' if theme=='stamp' else 'trumpet'
    if theme in ('launch','summit'):return 'horn' if b<4 or sec==1 else 'strings'
    if theme=='cave':return 'cello' if b<4 else 'flute'
    if theme=='pines':return 'reed' if b<4 else 'strings'
    return 'trumpet' if theme=='festival' or b<4 else 'horn'

def replies(s,cid,sec,bar,theme,final,voicing):
    b=bar%8
    # Counterpoint sits in a separate part of the stereo field and answers
    # selected bars, not every motif. Keep the drop/breaks genuinely sparse.
    countermelody = (sec in (2,6) and b in (1,3,5,7)) or (final and theme in PEAK and b in (0,2,4,6))
    if countermelody and theme not in ('cave','lake','furnace','orbit'):
        voice={1:'pluck',3:'nylon',4:'horn',6:'strings'}[cid]
        # Snowline guitar and Furnace horn speak below the main melody.
        octave=-1 if cid in (1,4,6) else 0
        play_line(s,bar,COUNTERS[cid][b],voice,.43 if not final else .47,.31,octave,'legato')
    elif sec in (0,4) and b in (1,5):
        inst={1:'bell',3:'bell',4:'wood',6:'bell'}[cid]
        if cid==4:s.drum('wood',bar*s.meter+3.49,.43,.29)
        else:
            s.note(inst,bar*s.meter+s.meter-.99,voicing[-1]+12,.79,.35,.43)
    if final and theme in PEAK and b in (3,7):
        voice={1:'pad',3:'cello',4:'organ',6:'horn'}[cid]
        s.note(voice,bar*s.meter+.01,voicing[1],s.meter*.84,.45,-.19,'legato')

# Negative space belongs to the written arrangement: each breakdown hands
# the melody mic to the rhythm section before the pickup into the next phrase.
BREAK_BARS = {
 1:{('orbit',3):'r/4',('orbit',7):'r/2 B4 C#5 G#4 A4'},
 3:{('lake',1):'r/3',('lake',5):'r/1.5 F#4 D4/1'},
 4:{('furnace',1):'r/4',('furnace',5):'r/2 A4/1 F4/1'},
 6:{('cave',1):'r/4',('cave',3):'r/2 G4 Ab4/1 r'},
}
LAP_CALL = {
 1:('eguitar','F#4/1 r A4 C#5/1 B4 A4','D4/1 A4/1 F#4/1.5 r'),
 3:('cello','D3/1.5 A3 F#3 E3','G3/1.5 D3 G3 A3'),
 4:('horn','E3/1.5 B3 E4/1 B3/1','F3/1 A3 C4 F4/1 C4/1'),
 6:('horn','Eb4/1 G4 Bb4 Eb5/1 Bb4/1','Ab3/1 Eb4 Ab4 C5/1 Ab4/1'),
}

def compose(course:int,final:bool=False)->Score:
    bpm,meter=METERS[course];form=FORMS[course]
    s=Score(TITLES[course],bpm,len(form)*8,meter=meter,seed=701+course*127+int(final)*19)
    s.trim('bass',.94,pan=-.035);s.trim('pickbass',.91,pan=-.035)
    s.trim('ep',.87,room=.15);s.trim('pad',.76,room=.22)
    s.trim('brass',.91,room=.17);s.trim('strings',.90,room=.20)
    s.trim('eguitar',.90,room=.14)
    registers={1:(52,58,63,68),3:(50,56,61,66),4:(48,55,60,65),6:(51,57,62,67)}[course]
    prior=None
    for sec,(section,theme,harmonies) in enumerate(form):
        s.section(sec*8,section)
        progression=(FINAL_CHANGES[course].get(sec,harmonies) if final else harmonies).split()
        next_section=form[(sec+1)%len(form)][2].split()
        for b,symbol in enumerate(progression):
            bar=sec*8+b
            voicing=voice_chord(symbol,prior,registers);prior=voicing
            following=progression[b+1] if b<7 else next_section[0]
            part=LIB[course][theme][b]
            if final and b>=4 and theme in FINAL_VERSIONS[course]:part=FINAL_VERSIONS[course][theme][b-4]
            part=BREAK_BARS[course].get((theme,b),part)
            voice=lead_voice(course,sec,theme,b,final)
            # A held cello counterphrase in the cave sits an octave below the
            # trumpet festival theme; the latter is a real change of register.
            octv=-1 if voice=='cello' else 0
            dynamics=(.72 if theme in QUIET else .84 if theme in PEAK else .79)*(1.0+.035*math.sin((b+1)*math.pi/8))
            play_line(s,bar,part,voice,dynamics,.025,octv,'normal' if voice in ('lead','ep','eguitar','nylon') else 'legato')
            bass_part(s,course,sec,bar,symbol,following,theme,final)
            harmony_part(s,course,sec,bar,theme,voicing,final)
            kit(s,course,sec,bar,theme,final)
            replies(s,course,sec,bar,theme,final,voicing)
            if final and sec==0 and b in (0,6):
                inst,head,answer=LAP_CALL[course]
                play_line(s,bar,head if b==0 else answer,inst,.55,-.28,art='accent')
    return s
