// Rebuild using "python3 build.py --rebake-shadows". Only the offline artist
// tool requires @napi-rs/canvas, for the same alpha-cutout atlas as the game.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas'),{createHash}=require('node:crypto');
const root=path.join(__dirname,'..'),output=process.argv[2]||path.join(root,'bake-src');
const tracks=['park','rainbow','harbor','summit','forge','airport','wario'];
const modules=['engine','shadows','finish-tile','scenery','contact','course','tour',...tracks];
const source=modules.map(n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')).join('\n');
const {packDepth}=require('./shadow-codec.cjs');
function run(){
 const metadata={};
 for(const make of [parkDefinition,rainbowDefinition,harborDefinition,summitDefinition,forgeDefinition,airportDefinition,warioDefinition]){
  const course=new Circuit(make()),id=course.d.id,light=RUBY_LIGHTS[id];
  const record=metadata[id]={sx:light.sun[0]/light.sun[1],sz:light.sun[2]/light.sun[1],tiers:{}};
  for(const quality of ['low','standard','high']){
   WorldShadows.setQuality(quality);
   const f=WorldShadows.bakeScenery(course,light);
   record.x=f.x;record.z=f.z;record.span=f.cell*f.size;
   const compressed=packDepth(f.data,f.size),file=id+'-'+quality+'.lz4';
   fs.writeFileSync(path.join(output,file),compressed);record.tiers[quality]=[f.size,file,createHash('sha256').update(Buffer.from(f.data.buffer)).digest('hex')];
  }
 }
 fs.writeFileSync(path.join(output,'maps.json'),JSON.stringify(metadata,null,2)+'\n');
}
fs.mkdirSync(output,{recursive:true});
new Function('document','fs','path','output','packDepth','createHash',source+'\n('+run.toString()+')()')(
 {createElement:()=>createCanvas(2048,1024)},fs,path,output,packDepth,createHash);
