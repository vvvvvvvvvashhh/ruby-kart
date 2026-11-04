'use strict';
// Run via build.py. All cameras sample the same world-aligned solar grid.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const {packDepth}=require('./shadow-codec.cjs');
const root=path.join(__dirname,'..'),out=process.argv[2]||path.join(root,'bake-src/detail');
const tracks=['park','rainbow','harbor','summit','forge','airport','wario'];
const modules=['engine','shadows','finish-tile','scenery','contact','course','tour',...tracks];
const source=modules.map(k=>fs.readFileSync(path.join(root,'src',k+'.js'),'utf8')).join('\n');

function bake(track,light){
 const size=256,span=16,scale=size/span,tiles=new Map(),sx=light.sun[0]/light.sun[1],sz=light.sun[2]/light.sun[1];
 const {triangle,tileCaster,opacityUV}=WorldShadows.authorRaster;
 // Follow both banks and alternate driveable floors. Sweeping successive
 // cross-sections in beam space includes tile corners, climbs and entrances.
 function section(s){
  const w=track.width(s),reach=w+20;
  const box=[Infinity,Infinity,-Infinity,-Infinity];
  for(const l of [-reach,-w,0,w,reach]){
   const p=track.at(s,l);p.s=s;p.l=l;p.w=w;
   const roadY=p.y+track.roadLift(p),actual=track.surface(p,roadY+2);
   for(const h of actual==null?[roadY]:[roadY,actual]){
    const u=p.x-h*sx,v=p.z-h*sz;
    box[0]=Math.min(box[0],u);box[1]=Math.min(box[1],v);
    box[2]=Math.max(box[2],u);box[3]=Math.max(box[3],v);
   }
  }
  return box;
 }
 let last=section(0);
 for(let s=2;s<track.L+2;s+=2){
  const next=section(Math.min(s,track.L));
  const i0=Math.floor((Math.min(last[0],next[0])-.15)/span),i1=Math.floor((Math.max(last[2],next[2])+.15)/span);
  const j0=Math.floor((Math.min(last[1],next[1])-.15)/span),j1=Math.floor((Math.max(last[3],next[3])+.15)/span);
  for(let iz=j0;iz<=j1;iz++)for(let ix=i0;ix<=i1;ix++){
   const k=ix+','+iz;if(!tiles.has(k))tiles.set(k,{size,ix,iz,data:null});
  }
  last=next;
 }
 const cutout={},u=new Float64Array(3),v=new Float64Array(3),h=new Float64Array(3);
 for(const obj of track.props){
  if(obj.anim||obj.g.castsShadow===false)continue;
  const src=(obj.g.shadowHull||obj.g).d,cs=Math.cos(obj.yaw)*obj.scale,sn=Math.sin(obj.yaw)*obj.scale;
  for(let j=0;j<src.length;j+=27){
   const mask=tileCaster(src,j);if(!mask)continue;
   if(obj.r>100&&src[j+1]===src[j+10]&&src[j+1]===src[j+19])continue;
   for(let k=0,o=j;k<3;k++,o+=9){
    const x=src[o],z=src[o+2];h[k]=obj.y+src[o+1]*obj.scale;
    u[k]=obj.x+cs*x+sn*z-h[k]*sx;v[k]=obj.z+cs*z-sn*x-h[k]*sz;
   }
   const cut=mask===true?null:opacityUV(mask,src,j,cutout);
   const i0=Math.floor((Math.min(...u)-.032)/span),i1=Math.floor((Math.max(...u)+.032)/span);
   const j0=Math.floor((Math.min(...v)-.032)/span),j1=Math.floor((Math.max(...v)+.032)/span);
   for(let iz=j0;iz<=j1;iz++)for(let ix=i0;ix<=i1;ix++){
    const f=tiles.get(ix+','+iz);if(!f)continue;
    if(!f.data)f.data=new Uint16Array(size*size);
    const ox=ix*span,oz=iz*span;
    triangle(f,(u[0]-ox)*scale,(v[0]-oz)*scale,h[0],(u[1]-ox)*scale,(v[1]-oz)*scale,h[1],
     (u[2]-ox)*scale,(v[2]-oz)*scale,h[2],cut,true);
   }
  }
 }
 const entries={},payload=[];let offset=0;
 for(const [key,tile] of tiles){
  if(!tile.data||!tile.data.some(x=>x)){entries[key]=0;continue}
  const data=packDepth(tile.data,size);entries[key]=[offset,data.length];payload.push(data);offset+=data.length;
 }
 return {sx,sz,entries,bytes:Buffer.concat(payload)};
}
function run(){
 const manifest={};
 for(const make of [parkDefinition,rainbowDefinition,harborDefinition,summitDefinition,forgeDefinition,airportDefinition,warioDefinition]){
  const tr=new Circuit(make()),id=tr.d.id,result=bake(tr,RUBY_LIGHTS[id]);
  const file=id+'.lz4';fs.writeFileSync(path.join(out,file),result.bytes);
  manifest[id]={file,sx:result.sx,sz:result.sz,tiles:result.entries};
  console.log(id,Object.keys(result.entries).length+' tiles',result.bytes.length+' compressed bytes');
 }
 fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(manifest)+'\n');
}
fs.mkdirSync(out,{recursive:true});
new Function('document','fs','path','out','packDepth',source+'\n'+bake.toString()+'\n('+run.toString()+')()')(
 {createElement:()=>createCanvas(2048,1024)},fs,path,out,packDepth);
