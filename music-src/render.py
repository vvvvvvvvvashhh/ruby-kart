"""Render Ruby Tour Sessions. See README.md for track, stem and MIDI export."""
from pathlib import Path
import argparse,base64,hashlib,json,tempfile
import numpy as np
from studio import RATE,render,encode
from midi_export import export

HERE=Path(__file__).resolve().parent
RACES=[f'{i}{role}' for i in range(7) for role in ('race','final')]
CUES=['menu',*RACES,'result','podium','star']

def module_for(key):
    if key=='star':return 'score_star'
    if key in ('menu','result','podium'):return 'score_lobby'
    return 'score_city' if int(key[0]) in (0,2,5) else 'score_mountain'
def score_for(key):
    if key=='star':
        from score_star import compose
        return compose()
    if key in ('menu','result','podium'):
        from score_lobby import make_menu,make_result,make_podium
        return {'menu':make_menu,'result':make_result,'podium':make_podium}[key]()
    if module_for(key)=='score_city':from score_city import compose
    else:from score_mountain import compose
    score=compose(int(key[0]),key.endswith('final'))
    if key[0]=='3' and score.meter==3:score.time_signature=(6,8)
    return score
def digest(key):
    h=hashlib.sha256()
    for name in ['studio','soundbank',module_for(key),'midi_export','render']:
        h.update((HERE/(name+'.py')).read_bytes())
    return h.hexdigest()
def master(key,folder,stems=False,album=False):
    folder.mkdir(parents=True,exist_ok=True)
    info=folder/(key+'.json');mp3=folder/(key+'.mp3');midi=folder/(key+'.mid');stamp=digest(key)
    if not stems and info.exists() and mp3.exists() and midi.exists():
        prev=json.loads(info.read_text())
        listening=folder/'album'/mp3.name
        album_ok=not album or (listening.is_file() and prev.get('album_sha256')==hashlib.sha256(listening.read_bytes()).hexdigest())
        if album_ok and prev.get('source')==stamp and prev.get('sha256')==hashlib.sha256(mp3.read_bytes()).hexdigest():return prev
    song=score_for(key)
    if not song.events or not song.sections or song.sections[0][0]!=0:raise ValueError(key+' missing score or form')
    print('Render',key,song.title,round(song.duration,1),'s',len(song.events),'events',flush=True)
    wave=render(song,stem_dir=folder/'stems'/key if stems else None)
    if wave.ndim!=2 or wave.shape[1]!=2 or not np.isfinite(wave).all() or np.max(abs(wave))>.995:
        raise ValueError(key+' invalid mix')
    audio=encode(wave,bitrate='96k')
    if album:
        (folder/'album').mkdir(exist_ok=True)
        (folder/'album'/mp3.name).write_bytes(encode(wave,bitrate='160k'))
    metadata={'key':key,'title':song.title,'bpm':song.bpm,'meter':song.meter,'bars':song.bars,'duration':round(len(wave)/RATE,6),
              'bar':round(song.bar_seconds,8),'loop':song.loop,'target_lufs':song.target_lufs,'sections':song.sections,'events':len(song.events),
              'tracks':sorted({e.name for e in song.events}),'peak':round(float(np.max(abs(wave))),5),
              'sha256':hashlib.sha256(audio).hexdigest(),'source':stamp}
    if album:metadata['album_sha256']=hashlib.sha256((folder/'album'/mp3.name).read_bytes()).hexdigest()
    mp3.write_bytes(audio);midi.write_bytes(export(song));info.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    return metadata
def pack(folder,bank):
    groups={'base':('race-score','RUBY_SCORE',['menu',*[k for k in RACES if int(k[0])<5],'result','podium']),
            'extra':('extra-score','RUBY_EXTRA_SCORE',[*[k for k in RACES if int(k[0])>=5],'star'])}
    outputs=[]
    for group,(name,const,keys) in groups.items():
        if bank not in ('all',group):continue
        data={}
        for k in keys:
            m=json.loads((folder/(k+'.json')).read_text());b=(folder/(k+'.mp3')).read_bytes()
            if m['source']!=digest(k) or m['sha256']!=hashlib.sha256(b).hexdigest():raise ValueError(k+' stale master; rerender it first')
            data[k]=[m['duration'],m['bar'],base64.b64encode(b).decode('ascii')]
        outputs.append((HERE.parent/'src'/(name+'.js'),'// Ruby Tour Sessions · original stereo masters from music-src/render.py\nconst '+const+'='+json.dumps(data,separators=(',',':'))+';\n'))
    for path,data in outputs:
        tmp=path.with_suffix('.new');tmp.write_text(data);tmp.replace(path)
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--masters',type=Path);p.add_argument('--cue',choices=CUES,action='append')
    p.add_argument('--bank',choices=('all','base','extra'),default='all');p.add_argument('--stems',action='store_true',help='export stereo instrument buses and effects returns')
    p.add_argument('--album',action='store_true',help='also encode 160 kbps listening editions from the original PCM')
    p.add_argument('--pack-only',action='store_true');args=p.parse_args()
    if (args.cue or args.stems or args.album or args.pack_only) and not args.masters:p.error('specify --masters DIRECTORY to keep or read these exports')
    wanted=args.cue or [k for k in CUES if args.bank=='all' or (args.bank=='extra')==(k=='star' or k in RACES and int(k[0])>=5)]
    with tempfile.TemporaryDirectory() as temp:
        out=args.masters or Path(temp)
        if not args.pack_only:
            for k in wanted:master(k,out,args.stems,args.album)
        if not args.cue:pack(out,args.bank)
if __name__=='__main__':main()
