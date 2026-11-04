from base64 import b64decode, b64encode
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess

p = Path(__file__).resolve().parent
src = p / 'src'
order = ['software','engine','baked-shadows','shadows','finish-tile','icons','race-score','extra-score','audio','scenery','garage','atmos','roadfx','contact','course','tour','park','rainbow','harbor','summit','forge','airport','wario','items','shell','single-display','cup-lobby','model-mesh','model-3ds','model-switch','model-wiiu','model-render','model-cabinet','control-settings','devices','physics','racecraft','race','grand-prix','rescue','display','boot']
styles = ['hardware','controls','switch-skin','wiiu-skin','device-menu','racing-hud','single-display','model-cabinet','cup-lobby','control-settings']
parser=argparse.ArgumentParser(description='Build the web game and optionally a self-contained offline edition.')
parser.add_argument('--standalone',type=Path,help='also write a single offline HTML with every recording embedded')
parser.add_argument('--rebake-shadows',action='store_true',help='rebuild 21 full-course fields and the near-road solar tiles from course meshes (requires Node and @napi-rs/canvas)')
args=parser.parse_args()
publish = p / 'docs'
publish.mkdir(exist_ok=True)
music=publish/'music'
music.mkdir(exist_ok=True)
sources={name:(src/(name+'.js')).read_text(encoding='utf-8') for name in order}
# A normal build uses the checked-in depths without any graphics dependencies.
# Only edits to the geometry, light or static rasterizer invalidate that bake.
baked=p/'bake-src'
tool=p/'tools'/'bake-shadows.cjs'
stamp=baked/'inputs.sha256'
codec=p/'tools'/'shadow-codec.cjs'
inputs=[tool.read_bytes(),codec.read_bytes(),sources['engine'].split('// Materials:')[0].encode(),
        sources['shadows'].split(' function proxy(')[0].encode()]
for name in ('finish-tile','scenery','contact','course','tour','park','rainbow','harbor','summit','forge','airport','wario'):
    inputs.append(sources[name].encode())
digest=hashlib.sha256(b'\0'.join(inputs)).hexdigest()
if args.rebake_shadows or not stamp.exists() or stamp.read_text().strip()!=digest:
    subprocess.run(['node','--max-old-space-size=3072',str(tool),str(baked)],check=True)
    stamp.write_text(digest+'\n')
shadow_maps=json.loads((baked/'maps.json').read_text())
for course_map in shadow_maps.values():
    for tier in course_map['tiers'].values():
        tier[1:]=[b64encode((baked/tier[1]).read_bytes()).decode('ascii')]
marker='/* COURSE SHADOW ASSETS */{}'
assert sources['baked-shadows'].count(marker)==1
sources['baked-shadows']=sources['baked-shadows'].replace(marker,json.dumps(shadow_maps,separators=(',',':')))
# Every course shares a 16 m light-space grid. Empty near-road cells are
# explicit, so the receiver can tell open sky from the edge of the baked area.
detail=baked/'detail'
detail_tool=p/'tools'/'bake-detail.cjs'
detail_stamp=detail/'inputs.sha256'
detail_digest=hashlib.sha256(b'\0'.join([*inputs,detail_tool.read_bytes()])).hexdigest()
if args.rebake_shadows or not detail_stamp.exists() or detail_stamp.read_text().strip()!=detail_digest:
    subprocess.run(['node','--max-old-space-size=3072',str(detail_tool),str(detail)],check=True)
    detail_stamp.write_text(detail_digest+'\n')
detail_maps={}
for course_id,record in json.loads((detail/'index.json').read_text()).items():
    packed=(detail/record['file']).read_bytes()
    entries={}
    for key,entry in record['tiles'].items():
        if entry==0:
            entries[key]=0
        else:
            pos,size=entry
            tile=packed[pos:pos+size]
            if pos<0 or size<=0 or len(tile)!=size:
                raise ValueError(f'Truncated shadow tile {course_id} {key}')
            entries[key]=b64encode(tile).decode('ascii')
    detail_maps[course_id]={'sx':record['sx'],'sz':record['sz'],'tiles':entries}
detail_marker='/* COURSE DETAIL TILES */{}'
assert sources['baked-shadows'].count(detail_marker)==1
sources['baked-shadows']=sources['baked-shadows'].replace(detail_marker,json.dumps(detail_maps,separators=(',',':')))
web_sources=sources.copy()
manifest_files=set()
for name in ('race-score','extra-score'):
    raw=sources[name]
    var,body=re.search(r'const (RUBY_[A-Z_]+)=(\{.*\});',raw,re.S).groups()
    cues=json.loads(body)
    for key,cue in cues.items():
        audio=b64decode(cue[2],validate=True)
        digest=hashlib.sha256(audio).hexdigest()[:14]
        filename=f'{key}-{digest}.mp3'
        target=music/filename
        if not target.exists() or target.read_bytes()!=audio:
            target.write_bytes(audio)
        manifest_files.add(filename)
        cues[key]=[cue[0],cue[1],'','music/'+filename]
    web_sources[name]='const '+var+'='+json.dumps(cues,separators=(',',':'))+';'
finish = '\n'.join((src / (name + '.css')).read_text(encoding='utf-8') for name in styles)
def image_url(match):
    image = (src / match[1]).read_bytes()
    return 'url("data:image/webp;base64,' + b64encode(image).decode('ascii') + '")'
finish = re.sub(r'url\("([a-z][a-z0-9-]*\.webp)"\)', image_url, finish)
template = (src / 'shell.html').read_text(encoding='utf-8')
parts = {
    '/* LAUNCH STYLE */': (src / 'launch.css').read_text(encoding='utf-8'),
    '/* LAUNCH CONTROL */': (src / 'launch.js').read_text(encoding='utf-8'),
    '/* HANDHELD FINISH */': finish,
    '<!-- SKIN DETAILS -->': (src / 'wiiu-detail.html').read_text(encoding='utf-8'),
    '<!-- DEVICE SETTINGS -->': (src / 'device-menu.html').read_text(encoding='utf-8'),
    '<!-- SINGLE LCD -->': (src / 'single-display.html').read_text(encoding='utf-8'),
}
for marker, content in parts.items():
    assert template.count(marker) == 1, marker
    template = template.replace(marker, content)
def edition(modules):
    script='\n'.join(modules[n] for n in order)
    assert '</script' not in script.lower() and template.count('<!--GAME-->')==1
    return template.replace('<!--GAME-->','<script>\n"use strict";\nRubyLaunch.start(()=>{\n'+script+'\n});\n</script>').encode('utf-8')

(publish / '.nojekyll').touch()
(publish / 'index.html').write_bytes(edition(web_sources))
if args.standalone:
    args.standalone.parent.mkdir(parents=True,exist_ok=True)
    args.standalone.write_bytes(edition(sources))
for old in music.glob('*.mp3'):
    if re.fullmatch(r'[a-z0-9]+-[0-9a-f]{14}\.mp3',old.name) and old.name not in manifest_files:
        old.unlink()
