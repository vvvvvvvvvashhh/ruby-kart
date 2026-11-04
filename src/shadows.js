// Light-space depth, shared by WebGL and the worker/software rasterizer.
// U = x - y*sun.x/sun.y, V = z - y*sun.z/sun.y. Two points on a sun
// ray have the same U,V. Larger Y is nearer the light. Empty texels are 0.
const WorldShadows=(()=>{
 const courses=new WeakMap(),shapes=new WeakMap(),detailedShapes=new WeakMap(),mediumShapes=new WeakMap(),coarseShapes=new WeakMap();
 // Keep the same world-space footprints across profiles. Density and caster
 // fidelity can change without moving the near/far seam. The small rider tile
 // follows exactly the parts that are currently visible.
 const profiles={
  low:{small:448,large:640,near:128,hero:80,garage:112,nearBias:.30,heroBias:.11,garageBias:.14,farMin:96,farMax:256,farCell:2,farTime:.125},
  standard:{small:896,large:1280,near:192,hero:128,garage:160,nearBias:.24,heroBias:.09,garageBias:.11,farMin:192,farMax:512,farCell:1.25,farTime:.10},
  high:{small:1536,large:2048,near:288,hero:256,garage:256,nearBias:.18,heroBias:.045,garageBias:.065,farMin:256,farMax:640,farCell:1,farTime:1/12}
 };
 let quality='standard';
 function setQuality(id){if(typeof id==='string'&&Object.prototype.hasOwnProperty.call(profiles,id))quality=id;return quality}
 function getQuality(){return quality}
 let sequence=0,atlasRevision=-1;
 const castingTiles=[];
 function tileCaster(d,i){
  if(d[i+8]>=5.5&&d[i+8]<9)return false;
  if(d[i+6]<0)return true;
  if(atlasRevision!==tags.size){
   for(const [name,rect] of tags){
    const slot=Math.floor(rect[0]*atlas.width/256)+8*Math.floor(rect[1]*atlas.height/64);
    if(castingTiles[slot]?.name===name)continue;
    const solid=name.startsWith('finish/')||!!name.split('|')[2];
    castingTiles[slot]={name,solid,x:slot%8,y:slot>>3,read:false,mask:null};
   }
   atlasRevision=tags.size;
  }
  const slot=Math.floor(d[i+6]*atlas.width/256)+8*Math.floor(d[i+7]*atlas.height/64),tile=castingTiles[slot];
  if(!tile?.solid)return false;
  if(!tile.read){
   tile.read=true;
   // The visible shaders discard at alpha .35. Keep a small conservative
   // opacity mask only for painted cells that actually have transparent holes.
   const rgba=ac.getImageData?.(tile.x*256,tile.y*64,256,64)?.data;
   if(rgba){
    const mask=new Uint8Array(64*16);
    for(let v=0;v<64;v++)for(let u=0;u<256;u++)if(rgba[(v*256+u)*4+3]>=90)mask[(v>>2)*64+(u>>2)]++;
    if(mask.some(a=>a<8))tile.mask=mask;
   }
  }
  return tile.mask?tile:true;
 }
 function opacityUV(tile,d,j,out){
  const u=d[j+6]*atlas.width/4-64*tile.x,v=d[j+7]*atlas.height/4-16*tile.y;
  out.mask=tile.mask;out.u=u;out.v=v;
  out.bu=(d[j+15]-d[j+6])*atlas.width/4;out.bv=(d[j+16]-d[j+7])*atlas.height/4;
  out.cu=(d[j+24]-d[j+6])*atlas.width/4;out.cv=(d[j+25]-d[j+7])*atlas.height/4;return out;
 }
 function field(size,cell,x,z,bias){
  return {size,cell,x,z,bias,id:++sequence,version:0,data:new Uint16Array(size*size)};
 }
 function triangle(f,ax,az,ay,bx,bz,by,cx,cz,cy,cut,thin=false){
  const dx=bx-ax,dz=bz-az,ex=cx-ax,ez=cz-az,den=dx*ez-dz*ex;
  const area=Math.abs(den);
  if(area<(thin?1e-5:.04))return;
  // A moving spoke or railing can fit between two texel centres. Cover
  // intersected cells on sub-texel faces only, retaining cutout alpha below.
  const longest=thin?Math.max(Math.abs(dx),Math.abs(dz),Math.abs(ex),Math.abs(ez),Math.abs(dx-ex),Math.abs(dz-ez)):0;
  const pad=area<longest ? .5 : 0;
  const n=f.size,x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5-pad)),x1=Math.min(n-1,Math.floor(Math.max(ax,bx,cx)-.5+pad));
  const z0=Math.max(0,Math.ceil(Math.min(az,bz,cz)-.5-pad)),z1=Math.min(n-1,Math.floor(Math.max(az,bz,cz)-.5+pad));
  if(x1<x0||z1<z0)return;
  const ux=ez/den,uz=-ex/den,vx=-dz/den,vz=dx/den,hx=(by-ay)*ux+(cy-ay)*vx,hz=(by-ay)*uz+(cy-ay)*vz;
  const uMin=-.00001-pad*(Math.abs(ux)+Math.abs(uz)),vMin=-.00001-pad*(Math.abs(vx)+Math.abs(vz));
  const uvMax=1.00001+pad*(Math.abs(ux+vx)+Math.abs(uz+vz));
  const heightMin=pad?32768.5+64*Math.min(ay,by,cy):0,heightMax=pad?32768.5+64*Math.max(ay,by,cy):0;
  let u=ux*(x0+.5-ax)+uz*(z0+.5-az),v=vx*(x0+.5-ax)+vz*(z0+.5-az);
  let h=32768.5+64*(ay+(by-ay)*u+(cy-ay)*v);const data=f.data;
  // Scan only the interior span. Huge ground/water triangles otherwise visit
  // the entire light tile even when less than a row is covered.
  const sum=ux+vx,span=x1-x0,tx=cut?cut.bu*ux+cut.cu*vx:0,ty=cut?cut.bv*ux+cut.cv*vx:0;
  for(let z=z0;z<=z1;z++,u+=uz,v+=vz,h+=64*hz){
   let lo=0,hi=span;
   if(ux>0)lo=Math.max(lo,(uMin-u)/ux);else if(ux<0)hi=Math.min(hi,(uMin-u)/ux);else if(u<uMin)continue;
   if(vx>0)lo=Math.max(lo,(vMin-v)/vx);else if(vx<0)hi=Math.min(hi,(vMin-v)/vx);else if(v<vMin)continue;
   if(sum>0)hi=Math.min(hi,(uvMax-u-v)/sum);else if(sum<0)lo=Math.max(lo,(uvMax-u-v)/sum);else if(u+v>uvMax)continue;
   lo=Math.ceil(lo);hi=Math.floor(hi);let q=h+64*hx*lo;
   const start=z*n+x0+lo,end=z*n+x0+hi;
   if(pad&&!cut){for(let i=start;i<=end;i++,q+=64*hx){const value=Math.max(heightMin,Math.min(heightMax,q));if(value>data[i])data[i]=value}}
   else if(!cut){for(let i=start;i<=end;i++,q+=64*hx)if(q>data[i])data[i]=q}
   else{
    let U=cut.u+cut.bu*u+cut.cu*v+lo*tx,V=cut.v+cut.bv*u+cut.cv*v+lo*ty;
    for(let i=start;i<=end;i++,q+=64*hx,U+=tx,V+=ty)if(q>data[i]&&cut.mask[Math.min(15,Math.max(0,V|0))*64+Math.min(63,Math.max(0,U|0))]>=8){const value=pad?Math.max(heightMin,Math.min(heightMax,q)):q;if(value>data[i])data[i]=value;}
   }
  }
 }
 function prepScenery(track,light,hero){
  let variants=courses.get(track);if(!variants){variants=new Map();courses.set(track,variants)}
  const previous=variants.get(light.sun);
  if(previous?.quality===quality)return previous;
  // Retain just the last completed density. Switching back while the new
  // bake is in flight restores the original field without a black frame.
  if(previous?.fallback?.quality===quality){
   const reuse=previous.fallback;
   previous.fallback=null;reuse.fallback=previous.complete?previous:null;
   variants.set(light.sun,reuse);return reuse;
  }
  const fallback=previous?.complete?previous:previous?.fallback;
  if(previous)previous.fallback=null;
  const archived=typeof BakedShadows!=='undefined'&&track.d&&BakedShadows.read(track.d.id,quality,light);
  if(archived){
   // Course geometry is never visited by a shipping race's static pass.
   // The one cached lower/higher tier can be reused while switching settings.
   archived.id=++sequence;archived.version=1;
   const scene={quality,stat:archived,animated:previous?.animated||track.props.filter(o=>o.anim&&o.g.castsShadow!==false),
    fallback,amount:1,complete:true,baked:true};
   variants.set(light.sun,scene);return scene;
  }
  const profile=profiles[quality];
  const sx=light.sun[0]/light.sun[1],sz=light.sun[2]/light.sun[1],pad=55;
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const p of track.pts){const x=p.x-p.h*sx,z=p.z-p.h*sz;x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)}
  const span=Math.max(x1-x0,z1-z0)+2*pad,n=span>410?profile.large:profile.small,cell=span/n;
  const stat=field(n,cell,(x0+x1-span)*.5,(z0+z1-span)*.5,.21+cell*.33);
  const props=track.props.filter(o=>!o.anim);
  // Coplanar road surfaces still receive shadows but do not need to cast
  // on themselves. Include tilted roads, platforms, bridges and architecture.
  const scene={quality,fallback,stat,props,animated:track.props.filter(o=>o.anim&&o.g.castsShadow!==false),index:0,offset:0,sx,sz,complete:false};
  props.sort((a,b)=>{const p=a.center||a,q=b.center||b;return Math.hypot(p.x-hero.x,p.z-hero.z)-Math.hypot(q.x-hero.x,q.z-hero.z)});
  variants.set(light.sun,scene);return scene;
 }
 function bake(scene){
  if(scene.complete)return;
  const f=scene.stat,end=performance.now()+1.35,sx=scene.sx,sz=scene.sz,inv=1/f.cell;
  do{
   const o=scene.props[scene.index];if(!o){scene.complete=true;f.version++;return}
   const d=(o.g.shadowHull||o.g).d,cs=Math.cos(o.yaw)*o.scale,sn=Math.sin(o.yaw)*o.scale,scale=o.scale;
   const X=(o.x-o.y*sx-f.x)*inv,Z=(o.z-o.y*sz-f.z)*inv;
   let i=scene.offset,stop=Math.min(d.length,i+27*192);
   for(;i<stop;i+=27){
    const tile=tileCaster(d,i);if(!tile)continue;
    const cut=tile===true?null:opacityUV(tile,d,i,scene.cut||(scene.cut={}));
    const x=d[i],y=d[i+1],z=d[i+2],xx=d[i+9],yy=d[i+10],zz=d[i+11],xxx=d[i+18],yyy=d[i+19],zzz=d[i+20];
    if(y===yy&&y===yyy&&o.r>100)continue; // A distant background floor.
    triangle(f,X+(cs*x+sn*z-y*scale*sx)*inv,Z+(cs*z-sn*x-y*scale*sz)*inv,o.y+y*scale,
     X+(cs*xx+sn*zz-yy*scale*sx)*inv,Z+(cs*zz-sn*xx-yy*scale*sz)*inv,o.y+yy*scale,
     X+(cs*xxx+sn*zzz-yyy*scale*sx)*inv,Z+(cs*zzz-sn*xxx-yyy*scale*sz)*inv,o.y+yyy*scale,cut);
   }
   if(i===d.length){scene.index++;scene.offset=0}else scene.offset=i;
  }while(performance.now()<end);
 }
 // Export the reference raster to the offline authoring tool. Procedural scenes
 // without a packaged asset retain the incremental path (including editor tests).
 function bakeScenery(track,light){
  const scene=prepScenery(track,light,track.pts[0]);
  while(!scene.complete)bake(scene);
  return scene.stat;
 }
 function prepare(track){
  if(!track?.d||typeof BakedShadows==='undefined')return null;
  const light=RUBY_LIGHTS[track.d.id];if(!light)return null;
  const scene=prepScenery(track,light,track.pts[0]);
  return scene.baked?scene.stat:null;
 }
 function proxy(mesh,detail=quality==='high'&&!!mesh.wheelSpans){
  const cache=detail===1?mediumShapes:detail?detailedShapes:shapes;
  let p=cache.get(mesh);if(p)return p;
  // Weld the caster to a coarse object-local lattice. Keep the original visible
  // model untouched; disjoint wheels, heads, folded wings and doors stay disjoint.
  const d=mesh.d,b=localBox(mesh),grid=detail===1?15:detail?23:9,side=grid+1,vertexCount=side**3,idx=new Map(),vertices=[],faces=[],cuts=[],seen=new Set();
  const kx=grid/Math.max(.001,2*b.hx),ky=grid/Math.max(.001,2*b.hy),kz=grid/Math.max(.001,2*b.hz);
  function vert(j){
   const x=d[j],y=d[j+1],z=d[j+2],ix=Math.round((x-b.x+b.hx)*kx),iy=Math.round((y-b.y+b.hy)*ky),iz=Math.round((z-b.z+b.hz)*kz),key=(ix*side+iy)*side+iz;
   let i=idx.get(key);if(i!==undefined)return i;
   i=vertices.length/3;idx.set(key,i);vertices.push(x,y,z);return i;
  }
  for(let j=0;j<d.length;j+=27){const tile=tileCaster(d,j);if(!tile)continue;
   const a=vert(j),b=vert(j+9),c=vert(j+18);if(a===b||a===c||b===c)continue;
   const lo=Math.min(a,b,c),hi=Math.max(a,b,c),key=(lo*vertexCount+a+b+c-lo-hi)*vertexCount+hi;
   if(!seen.has(key)){seen.add(key);if(tile!==true)cuts[faces.length/3]=opacityUV(tile,d,j,{});faces.push(a,b,c)}
  }
  p={cuts,vertices:new Float32Array(vertices),indices:new Uint16Array(faces),work:new Float32Array(vertices.length)};cache.set(mesh,p);return p;
 }
 function farProxy(mesh){
  const source=proxy(mesh,false);if(source.indices.length<420)return source;
  let shape=coarseShapes.get(mesh);if(shape)return shape;
  const b=localBox(mesh),steps=Math.max(b.hx,b.hy,b.hz)>5?6:4;
  const vertices=[],indices=[],cuts=[],remap=new Uint16Array(source.vertices.length/3),cells=new Map(),seen=new Set();
  for(let i=0;i<source.vertices.length;i+=3){
   const x=source.vertices[i],y=source.vertices[i+1],z=source.vertices[i+2];
   const ix=Math.round((x-b.x+b.hx)*steps/Math.max(.001,2*b.hx)),iy=Math.round((y-b.y+b.hy)*steps/Math.max(.001,2*b.hy)),iz=Math.round((z-b.z+b.hz)*steps/Math.max(.001,2*b.hz));
   const key=(ix*8+iy)*8+iz;let v=cells.get(key);
   if(v===undefined){v=vertices.length/3;cells.set(key,v);vertices.push(x,y,z)}
   remap[i/3]=v;
  }
  for(let i=0;i<source.indices.length;i+=3){
   const a=remap[source.indices[i]],b=remap[source.indices[i+1]],c=remap[source.indices[i+2]];
   if(a===b||a===c||b===c)continue;
   const lo=Math.min(a,b,c),hi=Math.max(a,b,c),key=(lo*512+a+b+c-lo-hi)*512+hi;
   if(seen.has(key))continue;seen.add(key);if(source.cuts[i/3])cuts[indices.length/3]=source.cuts[i/3];indices.push(a,b,c);
  }
  shape={cuts,vertices:new Float32Array(vertices),indices:new Uint16Array(indices),work:new Float32Array(vertices.length)};
  coarseShapes.set(mesh,shape);return shape;
 }
 function cast(f,mesh,x,y,z,yaw=0,sc=1,roll=0,pitch=0){
  const b=localBox(mesh),u=x-y*f.sx,v=z-y*f.sz,r=(Math.abs(b.x)+Math.abs(b.y)+Math.abs(b.z)+b.hx+b.hy+b.hz)*sc*(1+Math.max(Math.abs(f.sx),Math.abs(f.sz)));
  if(u+r<f.x||u-r>f.x+f.size*f.cell||v+r<f.z||v-r>f.z+f.size*f.cell)return;
  const shape=f.dirty||f.coarse?farProxy(mesh):proxy(mesh,f.detail||false),vs=shape.vertices,w=shape.work,ind=shape.indices,cy=Math.cos(yaw),sy=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch),inv=1/f.cell;
  for(let i=0;i<vs.length;i+=3){
   const a=vs[i],b=vs[i+1],c=vs[i+2],xx=(cr*a-sr*b)*sc,up=(sr*a+cr*b)*sc,zz=cp*c*sc-sp*up,h=cp*up+sp*c*sc;
   w[i]=(u+cy*xx+sy*zz-h*f.sx-f.x)*inv;w[i+1]=(v+cy*zz-sy*xx-h*f.sz-f.z)*inv;w[i+2]=y+h;
  }
  // A broad, solid body has adjacent faces to cover each texel. Reserve
  // conservative rasterization for narrow geometry and the distant proxy.
  const thin=f.thinCasters&&(f.dirty||2*sc*Math.min(b.hx,b.hz)<2*f.cell||2*sc*b.hy<f.cell);
  for(let i=0;i<ind.length;i+=3){const a=ind[i]*3,b=ind[i+1]*3,c=ind[i+2]*3;triangle(f,w[a],w[a+1],w[a+2],w[b],w[b+1],w[b+2],w[c],w[c+1],w[c+2],shape.cuts[i/3],thin)}
 }
 // The coarse field stays fixed in light space across the full course. Capture
 // poses at the profile cadence. Comparing transforms lets stationary scenes keep
 // their depth buffers and skip the worker transfer or GPU upload.
 function markTiles(f,p,flags){
  for(let z=p.t;z<=p.b;z++)flags.fill(1,z*f.tiles+p.l,z*f.tiles+p.r+1);
 }
 function noteFar(lamp,mesh,x,y,z,yaw=0,scale=1,roll=0,pitch=0){
  const i=lamp.poseCount++,p=lamp.poses[i]||(lamp.poses[i]={}),wide=lamp.distant,near=lamp.local;
  const changed=p.mesh!==mesh||p.x!==x||p.y!==y||p.z!==z||p.yaw!==yaw||p.scale!==scale||p.roll!==roll||p.pitch!==pitch;
  if(changed){
   if(p.enabled)markTiles(wide,p,wide.dirty);
   Object.assign(p,{mesh,x,y,z,yaw,scale,roll,pitch});
   const b=localBox(mesh),cs=Math.cos(yaw),sn=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch);
   let U=Infinity,V=Infinity,X=-Infinity,Z=-Infinity;
   for(let k=0;k<8;k++){
    const a=b.x+(k&1?b.hx:-b.hx),bb=b.y+(k&2?b.hy:-b.hy),c=b.z+(k&4?b.hz:-b.hz);
    const xx=(cr*a-sr*bb)*scale,up=(sr*a+cr*bb)*scale,zz=cp*c*scale-sp*up,h=y+cp*up+sp*c*scale;
    const u=x+cs*xx+sn*zz-h*wide.sx,v=z+cs*zz-sn*xx-h*wide.sz;
    U=Math.min(U,u);X=Math.max(X,u);V=Math.min(V,v);Z=Math.max(Z,v);
   }
   Object.assign(p,{U,X,V,Z,l:Math.max(0,Math.min(wide.tiles-1,Math.floor(((U-wide.x)/wide.cell-2)/8))),
    r:Math.max(0,Math.min(wide.tiles-1,Math.floor(((X-wide.x)/wide.cell+2)/8))),
    t:Math.max(0,Math.min(wide.tiles-1,Math.floor(((V-wide.z)/wide.cell-2)/8))),
    b:Math.max(0,Math.min(wide.tiles-1,Math.floor(((Z-wide.z)/wide.cell+2)/8)))});
  }
  // A margin also covers vehicle travel until the next coarse update.
  const margin=12,span=near.size*near.cell;
  const enabled=p.U<near.x+margin||p.X>near.x+span-margin||p.V<near.z+margin||p.Z>near.z+span-margin;
  if((changed&&enabled)||!!p.enabled!==enabled)markTiles(wide,p,wide.dirty);
  p.enabled=enabled;
 }
 function finishFar(lamp){
  if(!lamp.sampleFar)return;
  lamp.sampleFar=false;
  const f=lamp.distant,n=f.size,T=f.tiles,dirty=f.dirty;
  for(let i=lamp.poseCount;i<lamp.prevCount;i++){const p=lamp.poses[i];if(p.enabled){markTiles(f,p,dirty);p.enabled=false}}
  lamp.prevCount=lamp.poseCount;
  let x0=T,z0=T,x1=-1,z1=-1;
  for(let z=0;z<T;z++)for(let x=0;x<T;x++){
   const i=z*T+x;if(!dirty[i])continue;
   x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);
  }
  if(x1<0)return;
  // Both samples share the fixed world grid. Preserve the outgoing cell
  // heights over this patch and retire the preceding interpolation patch.
  const old=f.lastDirty,newDirty=[x0,z0,x1,z1];
  const l=8*(old?Math.min(x0,old[0]):x0),t=8*(old?Math.min(z0,old[1]):z0);
  const r=8*(1+(old?Math.max(x1,old[2]):x1)),b=8*(1+(old?Math.max(z1,old[3]):z1));
  if(!f.previous)f.previous=new Uint16Array(f.data.length);
  for(let y=t;y<b;y++){const start=y*n+l;f.previous.set(f.data.subarray(start,y*n+r),start)}
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const i=z*T+x;if(!dirty[i])continue;f.occupied[i]=0;
   for(let y=z*8;y<z*8+8;y++)f.data.fill(0,y*n+x*8,y*n+x*8+8);
  }
  for(let i=0;i<lamp.poseCount;i++){
   const p=lamp.poses[i];if(!p.enabled||p.r<x0||p.b<z0||p.l>x1||p.t>z1)continue;
   let touched=false;
   for(let z=p.t;z<=p.b&&!touched;z++)for(let x=p.l;x<=p.r;x++)if(dirty[z*T+x]){touched=true;break}
   if(touched){markTiles(f,p,f.occupied);cast(f,p.mesh,p.x,p.y,p.z,p.yaw,p.scale,p.roll,p.pitch)}
  }
  f.blendStart=f.version&&!lamp.cutFar?lamp.frameTime:-Infinity;
  f.lastDirty=newDirty;f.rect=[l,t,r-l,b-t];f.version++;
 }
 function advanceFade(scene,t){
  if(scene.fadeStart==null){scene.amount=1;return}
  if(scene.fadeTime!=null&&t<scene.fadeTime)scene.fadeStart=t-(scene.amount||0)*.35;
  scene.fadeTime=t;scene.amount=Math.min(1,(t-scene.fadeStart)/.35);
  if(scene.amount===1)scene.fadeStart=null;
 }
 // The race preparation queue calls this once per slice. A menu can also
 // start its own window directly through begin(), before entering a race.
 function warmDetail(track,x,z){
  if(typeof BakedShadows==='undefined'||!BakedShadows.available?.(track.d.id))return true;
  const sun=RUBY_LIGHTS[track.d.id]?.sun;if(!sun)return true;
  const p=track.locate(x,z,0,true),u=x-p.y*sun[0]/sun[1],v=z-p.y*sun[2]/sun[1];
  return BakedShadows.warmTiles(track.d.id,quality,u,v);
 }
 function begin(renderer,track,context,t,hero,garageModel=null,garageWing=false){
  if(renderer.skipWorldShadows){renderer.worldLight=null;return null}
  const profile=profiles[quality],indoor=context==='garage',light=renderer.light,scene=indoor?null:prepScenery(track,light,hero);
  if(scene){
   if(!scene.complete){
    const old=scene.fallback;
    if(old)advanceFade(old,t);
    if(scene.bakeTime===undefined)scene.bakeTime=t;
    bake(scene);
    if(scene.complete){
     // Keep an in-progress introduction continuous when its density changes.
     scene.fadeStart=old?old.fadeStart:t===scene.bakeTime?null:t;
     if(old){scene.fadeTime=old.fadeTime;scene.amount=old.amount}
    }
   }
   advanceFade(scene,t);
  }
  const sx=light.sun[0]/light.sun[1],sz=light.sun[2]/light.sun[1];
  let lamp=renderer.worldLight;
  if(!lamp||lamp.quality!==quality||lamp.scene!==scene||lamp.context!==context){
   const size=indoor?profile.garage:profile.near;
   const local=field(size,(indoor?11.2:84.48)/size,0,0,indoor?profile.garageBias:profile.nearBias);
   const focus=indoor?null:field(profile.hero,0,0,0,profile.heroBias);
   local.coarse=!indoor&&quality==='low';
   const actorDetail=quality==='high'?true:quality==='standard'?1:false;
   local.detail=indoor&&actorDetail;
   local.economy=quality==='low';
   local.thinCasters=true;
   const stat=scene?.stat,span=stat?stat.size*stat.cell:0,n=stat?Math.min(profile.farMax,Math.max(profile.farMin,32*Math.ceil(span/(32*profile.farCell)))):0;
   const distant=stat?field(n,span/n,stat.x,stat.z,.28+.30*span/n):null;
   if(distant){distant.thinCasters=true;distant.sx=sx;distant.sz=sz;distant.tiles=n/8;distant.dirty=new Uint8Array(n*n/64);distant.occupied=new Uint8Array(n*n/64)}
   lamp={quality,profile,scene,context,local,distant,focus,stamp:-Infinity,farStamp:-Infinity,poses:[],poseCount:0,prevCount:-1,vis:()=>true};
   lamp.draw=(mesh,x,y,z,yaw,scale,roll,pitch)=>{
    cast(local,mesh,x,y,z,yaw,scale,roll,pitch);
    if(lamp.sampleFar)noteFar(lamp,mesh,x,y,z,yaw,scale,roll,pitch);
   };
   if(focus){focus.sx=sx;focus.sz=sz;focus.thinCasters=true;focus.detail=actorDetail}
   // Fit one light tile to the actual rider, chassis and deployed wing. A
   // sphere around each mesh stays the same size through turns and tricks.
   // Only the caster poses are queued; the geometry and storage are reused.
   lamp.focusParts=[];lamp.focusCount=0;
   const submit=(mesh,x,y,z,yaw=0,scale=1,roll=0,pitch=0)=>{
    const i=lamp.focusCount++,part=lamp.focusParts[i]||(lamp.focusParts[i]={});
    Object.assign(part,{mesh,x,y,z,yaw,scale,roll,pitch});
   };
   if(indoor)lamp.draw=submit;
   else{
    lamp.focusCaster={draw:submit};lamp.stamps=new RubyStampSet(lamp,renderer,cast);
    lamp.forObject=(key,priority)=>lamp.stamps.forObject(key,priority);
   }
   renderer.worldLight=lamp;
  }
  const f=lamp.local,follow=indoor?{x:0,y:0,z:0}:hero;
  const forward=indoor?0:13,qx=follow.x-sx*follow.y+renderer.s*forward,qz=follow.z-sz*follow.y+renderer.c*forward;
  lamp.detail=scene?.baked&&typeof BakedShadows!=='undefined'&&BakedShadows.available?.(track.d.id)
   ?BakedShadows.detailWindow(track.d.id,quality,qx,qz):null;
  lamp.frameTime=t;
  lamp.cutFar=t<lamp.farStamp||t-lamp.farStamp>.32||Math.abs(qx-lamp.sampleX)>10||Math.abs(qz-lamp.sampleZ)>10;
  lamp.farEnabled=!!lamp.distant&&!renderer.skipFarShadows;
  lamp.sampleFar=lamp.farEnabled&&(t<lamp.farStamp||t-lamp.farStamp>=profile.farTime||Math.abs(qx-lamp.sampleX)>10||Math.abs(qz-lamp.sampleZ)>10);
  if(lamp.sampleFar){lamp.farStamp=t;lamp.sampleX=qx;lamp.sampleZ=qz;lamp.poseCount=0;lamp.distant.dirty.fill(0)}
  const dirty=indoor?lamp.gear!==garageModel||lamp.wing!==garageWing:t!==lamp.stamp||Math.hypot(qx-(f.x+f.size*f.cell*.5),qz-(f.z+f.size*f.cell*.5))>2.1;
  if(dirty||lamp.sampleFar){
   if(lamp.focus)lamp.focus.visible=false;
   if(lamp.stamps)lamp.stamps.start();
   lamp.focusCount=0;lamp.focusPending=true;
   f.sx=sx;f.sz=sz;
   if(!indoor){f.x=(Math.floor(qx/f.cell)-f.size/2)*f.cell;f.z=(Math.floor(qz/f.cell)-f.size/2)*f.cell;f.data.fill(0);f.version++}
   lamp.stamp=t;lamp.gear=garageModel;lamp.wing=garageWing;
   if(scene)for(const o of scene.animated){
    const reach=o.r*(1+Math.max(Math.abs(sx),Math.abs(sz))),u=o.x-sx*o.y,v=o.z-sz*o.y,span=f.cell*f.size;
    if(!lamp.sampleFar&&Math.hypot(o.x-renderer.cam.x,o.z-renderer.cam.z)>215+reach&&(u+reach<f.x||v+reach<f.z||u-reach>f.x+span||v-reach>f.z+span))continue;
    const a=o.anim(t);if(!a||a.y< -50)continue;
    lamp.forObject(o,2).draw(o.g.shadowHull||o.g,o.x+(a.x||0),o.y+(a.y||0),o.z+(a.z||0),o.yaw+(a.yaw||0),o.scale,a.roll||0,a.pitch||0);
   }
  }
  return dirty||lamp.sampleFar?lamp:null;
 }
 function farBlend(lamp){
  const start=lamp.distant?.blendStart;
  if(!Number.isFinite(start))return 1;
  return Math.max(0,Math.min(1,(lamp.frameTime-start)/(lamp.profile.farTime*.95)));
 }
 function upload(renderer,layer,slot){
  const gl=renderer.g;if(!renderer.depthTextures)renderer.depthTextures=[];
  let t=renderer.depthTextures[slot];if(!t){t={tex:gl.createTexture(),id:-1,version:-1};renderer.depthTextures[slot]=t}
  gl.activeTexture(gl.TEXTURE0+slot+1);gl.bindTexture(gl.TEXTURE_2D,t.tex);
  if(t.id!==layer.id||t.version!==layer.version){
   const pair=!!layer.tiles,packing=pair?4:2,format=pair?gl.RGBA:gl.LUMINANCE_ALPHA;
   if(!t.bytes||t.bytes.length!==layer.data.length*packing)t.bytes=new Uint8Array(layer.data.length*packing);
   const n=layer.size,rect=t.id===layer.id&&t.version===layer.version-1?layer.rect:null;
   const x=rect?rect[0]:0,y=rect?rect[1]:0,w=rect?rect[2]:n,h=rect?rect[3]:n,d=layer.data;
   const previous=layer.previous||d;
   for(let z=0,k=0;z<h;z++)for(let i=(z+y)*n+x,end=i+w;i<end;i++){
    const v=d[i];t.bytes[k++]=v>>>8;
    if(pair){const old=previous[i];t.bytes[k++]=old>>>8;t.bytes[k++]=old&255}
    t.bytes[k++]=v&255;
   }
   if(t.id!==layer.id){
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,format,n,n,0,format,gl.UNSIGNED_BYTE,t.bytes);
   }else gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,w,h,format,gl.UNSIGNED_BYTE,t.bytes.subarray(0,w*h*packing));
   t.id=layer.id;t.version=layer.version;
  }
 }
 // The fine window scrolls in integral texels. Keep overlapping rows and
 // columns in VRAM; the shader wraps its taps explicitly for WebGL 1 NPOT.
 function uploadDetail(renderer,field){
  const gl=renderer.g,t=renderer.detailTexture||(renderer.detailTexture={tex:gl.createTexture(),size:0});
  if(!field&&t.size)return;
  field=field||empty;
  if(t.size===field.size&&t.id===field.id&&t.version===field.version&&t.x===field.x&&t.z===field.z)return;
  gl.activeTexture(gl.TEXTURE0+7);gl.bindTexture(gl.TEXTURE_2D,t.tex);
  const n=field.size,same=t.size===n&&t.id===field.id,dx=same?Math.round((field.x-t.x)/field.cell):0,dz=same?Math.round((field.z-t.z)/field.cell):0;
  const scroll=same&&field.version===t.version+1&&(dx||dz)&&Math.abs(dx)<n&&Math.abs(dz)<n;
  const wrap=a=>(a+n)%n;t.rx=scroll?wrap(t.rx+dx):0;t.rz=scroll?wrap(t.rz+dz):0;
  if(t.size!==n){
   t.size=n;t.bytes=new Uint8Array(n*n*2);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE_ALPHA,n,n,0,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,null);
  }
  function patch(left,top,width,height){
   for(let z=top;z<top+height;){
    const v=wrap(z+t.rz),h=Math.min(top+height-z,n-v);
    for(let x=left;x<left+width;){
     const u=wrap(x+t.rx),w=Math.min(left+width-x,n-u),stride=(w*2+3)&~3;
     for(let y=0;y<h;y++){
      let k=y*stride;
      for(let i=(z+y)*n+x,end=i+w;i<end;i++){const value=field.data[i];t.bytes[k++]=value>>>8;t.bytes[k++]=value&255}
     }
     const bytes=(h-1)*stride+2*w;
     gl.texSubImage2D(gl.TEXTURE_2D,0,u,v,w,h,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,t.bytes.subarray(0,bytes));x+=w;
    }
    z+=h;
   }
  }
  if(scroll){
   if(dx)patch(dx>0?n-dx:0,0,Math.abs(dx),n);
   if(dz)patch(dx<0?-dx:0,dz>0?n-dz:0,n-Math.abs(dx),Math.abs(dz));
  }else patch(0,0,n,n);
  t.id=field.id;t.version=field.version;t.x=field.x;t.z=field.z;
 }
 const empty=field(2,1,0,0,.5);
 function visibleScene(lamp){return lamp.scene?.complete?lamp.scene:lamp.scene?.fallback}
 function finishFocus(lamp){
  if(!lamp.focusPending)return;
  lamp.focusPending=false;
  if(!lamp.focusCount)return;
  const f=lamp.focus||lamp.local,sx=f.sx,sz=f.sz,spread=Math.sqrt(1+Math.max(sx*sx,sz*sz));
  // A quiet showroom pose should not upload a full light texture again.
  // Use the last rasterized pose, never the last submitted one, so slow
  // rotation accumulates. A skipped movement is under one eighth of a texel.
  let changed=f.partCount!==lamp.focusCount;
  if(!changed){
   for(let i=0;i<lamp.focusCount&&!changed;i++){
    const p=lamp.focusParts[i],old=p.previous;
    changed=!old||p.mesh!==old.mesh||p.scale!==old.scale||p.x!==old.x||p.y!==old.y||p.z!==old.z||
     (Math.abs(p.yaw-old.yaw)+Math.abs(p.roll-old.roll)+Math.abs(p.pitch-old.pitch))*old.reach>f.cell*.125;
   }
  }
  if(!changed){f.visible=true;return}
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(let i=0;i<lamp.focusCount;i++){
   const p=lamp.focusParts[i],b=localBox(p.mesh),cr=Math.cos(p.roll),sr=Math.sin(p.roll),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
   const xx=b.x*cr-b.y*sr,up=b.x*sr+b.y*cr,zz=b.z*cp-up*sp,h=p.y+p.scale*(up*cp+b.z*sp),sn=Math.sin(p.yaw),cs=Math.cos(p.yaw);
   const u=p.x+p.scale*(xx*cs+zz*sn)-h*sx,v=p.z+p.scale*(zz*cs-xx*sn)-h*sz,r=p.scale*Math.hypot(b.hx,b.hy,b.hz)*spread;
   left=Math.min(left,u-r);right=Math.max(right,u+r);top=Math.min(top,v-r);bottom=Math.max(bottom,v+r);
   const old=p.previous||(p.previous={});Object.assign(old,{mesh:p.mesh,scale:p.scale,x:p.x,y:p.y,z:p.z,yaw:p.yaw,roll:p.roll,pitch:p.pitch,reach:r+spread*p.scale*Math.hypot(b.x,b.y,b.z)});
  }
  // Leave two guard texels for the PCF filter, including narrow wheels.
  const span=Math.max(right-left,bottom-top,.15)*f.size/(f.size-4);
  f.cell=span/f.size;f.x=(left+right-span)*.5;f.z=(top+bottom-span)*.5;
  f.bias=Math.max(2/64,Math.min(lamp.focus?lamp.profile.heroBias:lamp.profile.garageBias,.024+f.cell*.40));
  f.data.fill(0);f.version++;f.visible=true;f.partCount=lamp.focusCount;
  for(let i=0;i<lamp.focusCount;i++){
   const p=lamp.focusParts[i];cast(f,p.mesh,p.x,p.y,p.z,p.yaw,p.scale,p.roll,p.pitch);
  }
 }
 function sync(renderer){
  const lamp=renderer.worldLight;if(!lamp)return;
  const submitted=lamp.focusPending;finishFocus(lamp);
  if(submitted&&lamp.stamps)lamp.stamps.finish();
  finishFar(lamp);if(!renderer.g)return;
  const stat=visibleScene(lamp)?.stat||empty;
  upload(renderer,stat,0);upload(renderer,lamp.local,1);upload(renderer,lamp.farEnabled?lamp.distant:empty,2);
  upload(renderer,lamp.focus?.visible?lamp.focus:empty,3);uploadDetail(renderer,lamp.detail);
  if(submitted&&lamp.stamps?.active)lamp.stamps.upload(renderer);
  renderer.g.activeTexture(renderer.g.TEXTURE0);
  if(renderer.active)uniforms(renderer,renderer.active);
 }
 function uniforms(renderer,shader){
  if(!shader.u.shadowUV)return;
  const gl=renderer.g,u=shader.u,lamp=renderer.worldLight;
  if(!lamp){gl.uniform4f(u.shadowUV,0,0,0,0);return}
  const scene=visibleScene(lamp),a=scene?.stat||empty,b=lamp.local;
  const stamps=lamp.stamps;gl.uniform4f(u.stampGrid,stamps?.x||0,stamps?.z||0,stamps?.tile||1,stamps?.active?1:0);
  gl.uniform1i(u.stampDepth,5);gl.uniform1i(u.stampIndex,6);gl.uniform1i(u.detailDepth,7);
  const detail=lamp.detail,t=renderer.detailTexture;
  if(detail&&t){gl.uniform4f(u.detailUV,detail.x,detail.z,1/(detail.cell*detail.size),detail.size);gl.uniform3f(u.detailWrap,t.rx,t.rz,detail.bias)}
  else gl.uniform4f(u.detailUV,0,0,0,0);
  gl.uniform1f(u.focusBias,lamp.focus?.bias||lamp.profile.heroBias);
  gl.uniform1f(u.staticAmount,scene?.amount??1);gl.uniform1f(u.farMix,farBlend(lamp));
  gl.uniform2f(u.sunSlope,b.sx,b.sz);gl.uniform4f(u.shadowUV,a.x,a.z,1/(a.cell*a.size),a.size);
  gl.uniform4f(u.actorUV,b.x,b.z,1/(b.cell*b.size),b.size);gl.uniform2f(u.shadowBias,a.bias,b.bias);
  const f=lamp.farEnabled?lamp.distant:null;
  if(f)gl.uniform4f(u.distantUV,f.x,f.z,1/(f.cell*f.size),f.size);else gl.uniform4f(u.distantUV,0,0,0,0);
  const hero=lamp.focus?.visible?lamp.focus:null;
  if(hero)gl.uniform4f(u.focusUV,hero.x,hero.z,1/(hero.cell*hero.size),hero.size);else gl.uniform4f(u.focusUV,0,0,0,0);
  gl.uniform1i(u.sceneDepth,1);gl.uniform1i(u.actorDepth,2);gl.uniform1i(u.distantDepth,3);gl.uniform1i(u.focusDepth,4);
 }
 function softwareData(renderer){
  const l=renderer.worldLight;if(!l)return null;
  const scene=visibleScene(l);
  return {farMix:farBlend(l),scene:scene?.stat||null,detail:l.detail||null,staticMix:scene?.amount??1,local:l.local,distant:l.farEnabled?l.distant:null,focus:l.focus?.visible?l.focus:null,stamps:l.stamps?.active?l.stamps:null,sx:l.local.sx,sz:l.local.sz};
 }
 return {begin,sync,uniforms,softwareData,proxy,setQuality,getQuality,prepare,warmDetail,bakeScenery,authorRaster:{triangle,tileCaster,opacityUV}};
})();
// The worker owns a second copy of the fine window. Slide both height and
// extrema grids in place and copy only newly exposed source tiles.
function rubyPlaceDetail(field,patch){
 function shift(grid,pitch,dx,dz){
  const width=pitch-Math.abs(dx),rows=pitch-Math.abs(dz);if(width<=0||rows<=0||(!dx&&!dz))return;
  const src=Math.max(0,dx),dst=Math.max(0,-dx),top=Math.max(0,-dz);
  for(let i=0;i<rows;i++){
   const row=top+(dz<0?rows-1-i:i),from=(row+dz)*pitch+src;
   grid.copyWithin(row*pitch+dst,from,from+width);
  }
 }
 const size=field.size,bins=size/4;
 if(Number.isFinite(field.x)){
  const dx=(patch.x-field.x)*16,dz=(patch.z-field.z)*16;
  shift(field.data,size,dx,dz);shift(field.bounds,bins,dx/4,dz/4);
 }
 function insert(grid,pitch,side,x,z,part,empty){
  for(let j=0;j<side;j++){
   const at=(z*side+j)*pitch+x*side;
   if(part)grid.set(part.subarray(j*side,(j+1)*side),at);
   else grid.fill(empty,at,at+side);
  }
 }
 for(const change of patch.tiles){
  const {x,z,tile}=change;
  insert(field.data,size,256,x,z,tile?.data,tile===0?0:65535);
  insert(field.bounds,bins,64,x,z,tile?.bounds,tile===0?0:0xffffffff);
 }
 field.x=patch.x;field.z=patch.z;field.version=patch.version;
}
// Local light-space depth stamps. A translating kart reuses its texture; only
// the current world placement changes. A small spatial grid selects up to four
// relevant samplers for each receiver. Overflow and distant geometry keep the
// world-space near/far fallback, including casters outside the camera view.
function rubyStampBins(index,stamps,n=128,cell=3){
 index.fill(0,0,n*n*4);let left=n,top=n,right=-1,bottom=-1;
 for(const f of stamps.fields){
  if(!f||!f.occupied)continue;
  const l=Math.floor((f.minX-stamps.x)/cell),r=Math.floor((f.maxX-stamps.x)/cell);
  const t=Math.floor((f.minZ-stamps.z)/cell),b=Math.floor((f.maxZ-stamps.z)/cell);
  f.overflow=l<0||t<0||r>=n||b>=n;
  if(l<n&&r>=0&&t<n&&b>=0){left=Math.min(left,Math.max(l,0));right=Math.max(right,Math.min(r,n-1));top=Math.min(top,Math.max(t,0));bottom=Math.max(bottom,Math.min(b,n-1))}
  for(let z=Math.max(0,t);z<=Math.min(n-1,b);z++)for(let x=Math.max(0,l);x<=Math.min(n-1,r);x++){
   const j=4*(z*n+x);
   if(!index[j])index[j]=f.slot+1;
   else if(!index[j+1])index[j+1]=f.slot+1;
   else if(!index[j+2])index[j+2]=f.slot+1;
   else if(!index[j+3])index[j+3]=f.slot+1;
   else f.overflow=true;
  }
 }
 stamps.range=[left,top,right,bottom];return index;
}
let rubyStampEpoch=0;
class RubyStampSet{
 constructor(lamp,renderer,castFn){
  this.id=++rubyStampEpoch;this.lamp=lamp;this.renderer=renderer;this.cast=castFn;
  this.tile={low:48,standard:96,high:128}[lamp.quality];this.count={low:24,standard:40,high:64}[lamp.quality];
  this.index=new Uint8Array(128*131*4);this.fields=Array(this.count).fill(null);
  this.book=new WeakMap();this.list=[];this.slots=Array(this.count).fill(null);this.serial=0;this.sequence=0;
  this.sink={vis:(x,y,z,r)=>!renderer.vis||renderer.vis(x,y,z,r),draw:(mesh,x,y,z,yaw=0,scale=1,roll=0,pitch=0)=>{
   const r=this.current,i=r.count++,p=r.parts[i]||(r.parts[i]={});
   Object.assign(p,{mesh,x,y,z,yaw,scale,roll,pitch});
  }};
 }
 start(){this.serial++;this.list.length=0;this.active=false}
 forObject(key,priority=1){
  let r=this.book.get(key);
  if(!r){r={parts:[],slot:-1};this.book.set(key,r)}
  if(r.serial!==this.serial){r.serial=this.serial;r.count=0;r.priority=priority;this.list.push(r)}
  this.current=r;return this.sink;
 }
 update(r,t,px){
  const lamp=this.lamp,f=r.field||(r.field={id:++this.sequence,version:0,data:null});const p0=r.parts[0];
  const ox=p0.x,oy=p0.y,oz=p0.z,sx=lamp.local.sx,sz=lamp.local.sz,spread=Math.sqrt(1+Math.max(sx*sx,sz*sz));
  let size=px>this.tile*.65?this.tile:px>40?48:px>20?32:px>9?24:12;size=Math.min(this.tile,size);
  if(r.priority>=1)size=Math.max(size,lamp.quality==='high'?32:lamp.quality==='standard'?24:16);
  if(f.data&&f.size>size&&px>f.size*.53)size=f.size;
  const interval=px>60?.022:px>26?.055:px>12?.095:.15;
  let dirty=!f.data||f.size!==size||r.drawCount!==r.count||t<r.last;
  if(!dirty&&t-r.last>=interval){
   for(let i=0;i<r.count&&!dirty;i++){
    const p=r.parts[i],o=p.old;
    dirty=!o||p.mesh!==o.mesh||p.scale!==o.scale||Math.abs(p.x-ox-o.x)+Math.abs(p.y-oy-o.y)+Math.abs(p.z-oz-o.z)+
     (Math.abs(p.yaw-o.yaw)+Math.abs(p.roll-o.roll)+Math.abs(p.pitch-o.pitch))*o.reach>f.cell*.40;
   }
  }
  // Spread new light views across frames on a busy grid. Existing stamps
  // keep following the interpolated position while their orientation waits.
  if(dirty&&this.remaining<size*size){r.wait=(r.wait||0)+1;if(!f.data)return;dirty=false}
  if(dirty){
   this.remaining-=size*size;r.wait=0;
   let l=Infinity,h=-Infinity,b=Infinity,e=-Infinity;
   for(let i=0;i<r.count;i++){
    const p=r.parts[i],box=localBox(p.mesh),sr=Math.sin(p.roll),cr=Math.cos(p.roll),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch),sn=Math.sin(p.yaw),cs=Math.cos(p.yaw);
    const xx=box.x*cr-box.y*sr,up=box.x*sr+box.y*cr,zz=box.z*cp-up*sp,y=p.y-oy+p.scale*(up*cp+box.z*sp);
    const u=p.x-ox+p.scale*(xx*cs+zz*sn)-y*sx,v=p.z-oz+p.scale*(zz*cs-xx*sn)-y*sz,rad=Math.max(.03,p.scale*Math.hypot(box.hx,box.hy,box.hz)*spread);
    l=Math.min(l,u-rad);h=Math.max(h,u+rad);b=Math.min(b,v-rad);e=Math.max(e,v+rad);
    const o=p.old||(p.old={});Object.assign(o,{mesh:p.mesh,scale:p.scale,x:p.x-ox,y:p.y-oy,z:p.z-oz,yaw:p.yaw,roll:p.roll,pitch:p.pitch,reach:rad+Math.hypot(box.x,box.y,box.z)*p.scale*spread});
   }
   const span=Math.max(.10,h-l,e-b)*size/(size-4);f.size=size;f.cell=span/size;f.sx=sx;f.sz=sz;f.x=(l+h-span)*.5;f.z=(b+e-span)*.5;
   f.detail=(px>42||r.priority===3&&px>14)?(lamp.quality==='high'?true:lamp.quality==='standard'?1:false):false;f.coarse=r.priority<1&&px<22||lamp.quality==='low'&&px<9;f.thinCasters=true;
   if(!f.data||f.data.length!==size*size)f.data=new Uint16Array(size*size);else f.data.fill(0);
   for(let i=0;i<r.count;i++){const p=r.parts[i];this.cast(f,p.mesh,p.x-ox,p.y-oy,p.z-oz,p.yaw,p.scale,p.roll,p.pitch)}
   let minX=size,minZ=size,maxX=-1,maxZ=-1,highest=0;
   for(let z=0,j=0;z<size;z++)for(let x=0;x<size;x++,j++)if(f.data[j]){
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;if(f.data[j]>highest)highest=f.data[j];
   }
   f.occupied=maxX>=minX;f.high=(highest-32768)/64;f.left=(minX-1)*f.cell;f.right=(maxX+2)*f.cell;f.top=(minZ-1)*f.cell;f.bottom=(maxZ+2)*f.cell;
   f.bias=Math.max(2/64,Math.min(.14,.024+f.cell*.40));
   f.version++;r.last=t;r.drawCount=r.count;
  }
  f.slot=r.slot;f.wx=ox-oy*sx+f.x;f.wz=oz-oy*sz+f.z;f.base=oy;
  f.maxY=oy+f.high+13*f.cell+.035;f.minX=f.wx+f.left;f.maxX=f.wx+f.right;f.minZ=f.wz+f.top;f.maxZ=f.wz+f.bottom;this.fields[r.slot]=f;
 }
 finish(){
  const lamp=this.lamp,t=lamp.frameTime,R=this.renderer,cam=R.cam,far=215;
  this.x=3*Math.floor((cam.x+(R.s||0)*56)/3)-192;this.z=3*Math.floor((cam.z+(R.c??1)*56)/3)-192;
  const fov=(R.renderHeight||R.cv?.height||225)*(R.f||1)*.5;this.remaining=this.tile*this.tile*2;
  for(const r of this.list){
   const p=r.parts[0];if(!r.count||!p){r.score=0;continue}
   const box=localBox(p.mesh),radius=p.scale*Math.hypot(box.x,box.y,box.z,box.hx,box.hy,box.hz),dist=Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z);
   r.px=fov*radius/Math.max(1,dist)*2;
   r.score=dist-radius<=far&&r.px>=2&&(!R.vis||R.vis(p.x,p.y,p.z,radius*2+3))?r.px*Math.min(2.0,1+.3*r.priority)*(r.slot>=0?1.12:1):0;
  }
  this.list.sort((a,b)=>b.score-a.score);
  const chosen=this.list.slice(0,this.count).filter(r=>r.score>0),chosenSet=new Set(chosen);
  for(let i=0;i<this.count;i++){
   const r=this.slots[i];if(r&&!chosenSet.has(r)){r.slot=-1;r.field=null;r.last=-Infinity;this.slots[i]=null}this.fields[i]=null;
  }
  chosen.sort((a,b)=>(b.wait||0)-(a.wait||0)||b.score-a.score);
  let avail=0;
  for(const r of chosen){
   if(r.slot<0){while(this.slots[avail])avail++;r.slot=avail;this.slots[avail]=r}
   this.update(r,t,r.px);
  }
  this.active=chosen.length>0;
  if(this.active)rubyStampBins(this.index,this);
  for(const r of this.list)if(r.slot<0||!this.fields[r.slot]||r.field?.overflow||!r.field?.occupied){
   for(let i=0;i<r.count;i++){const p=r.parts[i];lamp.draw(p.mesh,p.x,p.y,p.z,p.yaw,p.scale,p.roll,p.pitch)}
  }
 }
 upload(R){
  const gl=R.g;let cache=R.stampTextures;
  if(!cache){cache=R.stampTextures={atlas:gl.createTexture(),lookup:gl.createTexture(),extent:0,versions:[],ids:[]}}
  const extent=this.tile*8;
  function bind(unit,texture){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture)}
  function init(){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)}
  bind(5,cache.atlas);
  if(cache.extent!==extent||cache.set!==this.id){
   init();gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE_ALPHA,extent,extent,0,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,null);
   cache.extent=extent;cache.set=this.id;cache.versions=[];cache.ids=[];
  }
  const bytes=this.index;
  const encode=(i,v)=>{const n=Math.max(0,Math.min(65535,Math.round(v)));bytes[i]=n>>>8;bytes[i+1]=n&255};
  for(const f of this.fields)if(f){
   const id=f.slot,offset=(128*128+id)*4;
   encode(offset,(f.wx-this.x+128)*96);encode(offset+2,(f.wz-this.z+128)*96);
   encode(offset+512,f.size*f.cell*128);encode(offset+514,32768+64*f.base);bytes[offset+1024]=f.size;
   if(cache.ids[id]===f.id&&cache.versions[id]===f.version)continue;
   if(!f.bytes||f.bytes.length!==f.data.length*2)f.bytes=new Uint8Array(f.data.length*2);
   for(let i=0,j=0;i<f.data.length;i++){const n=f.data[i];f.bytes[j++]=n>>>8;f.bytes[j++]=n&255}
   gl.texSubImage2D(gl.TEXTURE_2D,0,(id&7)*this.tile,(id>>3)*this.tile,f.size,f.size,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,f.bytes);
   cache.ids[id]=f.id;cache.versions[id]=f.version;
  }
  bind(6,cache.lookup);
  if(!cache.lookupReady){init();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,131,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);cache.lookupReady=true}
  else{
   const old=cache.range||this.range,now=this.range;
   const l=Math.min(old[0],now[0]),t=Math.min(old[1],now[1]),w=Math.max(old[2],now[2])-l+1,h=Math.max(old[3],now[3])-t+1;
   if(w>0&&h>0){
    const length=w*h*4;
    if(!cache.patch||cache.patch.length<length)cache.patch=new Uint8Array(length);
    for(let row=0;row<h;row++){const i=((t+row)*128+l)*4;cache.patch.set(bytes.subarray(i,i+w*4),row*w*4)}
    gl.texSubImage2D(gl.TEXTURE_2D,0,l,t,w,h,gl.RGBA,gl.UNSIGNED_BYTE,cache.patch.subarray(0,length));
   }
   gl.texSubImage2D(gl.TEXTURE_2D,0,0,128,128,3,gl.RGBA,gl.UNSIGNED_BYTE,bytes.subarray(128*128*4));
  }
  cache.range=this.range;
 }
 workerPacket(cache){
  const sent=cache.stampSent||(cache.stampSent=[]),out=[];
  for(const f of this.fields)if(f){
   const key=f.id+'/'+f.version,old=sent[f.slot];
   out.push({slot:f.slot,id:f.id,version:f.version,wx:f.wx,wz:f.wz,base:f.base,cell:f.cell,size:f.size,bias:f.bias,occupied:f.occupied,maxY:f.maxY,minX:f.minX,maxX:f.maxX,minZ:f.minZ,maxZ:f.maxZ,data:old===key?null:f.data});
   sent[f.slot]=key;
  }
  return {x:this.x,z:this.z,tile:this.tile,fields:out};
 }
}

// Project each light-space footprint down to the lowest visible surface.
// Only scan the convex on-screen spans of this stamp; elsewhere the existing
// static/hero receiver kernel runs without grid lookup or fine-depth reads.
function rubyStampMask(raster,r,stamps,sx,sz){
 if(!stamps)return null;
 const w=raster.w,h=raster.h,z=raster.z,planes=raster.receiver,n=w*h;
 let out=raster.stampMask;if(!out||out.length!==n)out=raster.stampMask=new Uint8Array(n);else out.fill(0);
 const k=2/(h*r.f),X=r.cam.x,Y=r.cam.y,Z=r.cam.z,U=X-Y*sx,V=Z-Y*sz;
 const baseU=r.s*r.cp-r.sp*sx,baseV=r.c*r.cp-r.sp*sz;
 const yu=-r.s*r.sp-r.cp*sx,yv=-r.c*r.sp-r.cp*sz;
 const ux=r.c*k,vx=-r.s*k,uy=-yu*k,vy=-yv*k;
 const u0=baseU+(h*.5-.5)*k*yu+(.5-w*.5)*ux,v0=baseV+(h*.5-.5)*k*yv+(.5-w*.5)*vx;
 const dY0=r.sp+(h*.5-.5)*k*r.cp,dY=-k*r.cp,fac=h*r.f*.5;
 // At one scanline, world Y is monotone in depth. One division per row gives
 // the exact scene lower bound, even when the visible road has another deck.
 const stride=(w+7)>>3,spans=stride*h;
 if(!raster.blockNear||raster.blockNear.length!==spans){raster.blockNear=new Float32Array(spans);raster.blockFar=new Float32Array(spans)}
 const front=raster.blockNear,back=raster.blockFar;
 let floorY=Infinity;
 for(let y=0,i=0,b=0;y<h;y++){
  const ly=dY0+y*dY;let rowNear=0,rowFar=Infinity;
  for(let x=0;x<w;x+=8,b++){
   let lo=Infinity,hi=0;
   for(let end=i+Math.min(8,w-x);i<end;i++){
    const q=z[i];if(q>0){if(q<lo)lo=q;if(q>hi)hi=q}
   }
   front[b]=hi?1/hi:0;back[b]=hi?1/lo:0;
   rowNear=Math.max(rowNear,hi);rowFar=Math.min(rowFar,lo);
  }
  if(rowNear)floorY=Math.min(floorY,Y+ly/(ly<0?rowFar:rowNear));
 }
 if(!Number.isFinite(floorY))return out;
 const pts=raster.stampVerts||(raster.stampVerts=new Float64Array(24));
 if(!raster.spanLeft||raster.spanLeft.length!==h){raster.spanLeft=new Float32Array(h);raster.spanRight=new Float32Array(h)}
 const left=raster.spanLeft,right=raster.spanRight;
 for(const m of stamps.fields){
  if(!m?.occupied||floorY>=m.maxY)continue;
  let near=Infinity,far=-Infinity;
  for(let i=0,j=0;i<8;i++,j+=3){
   const wy=i&4?m.maxY:floorY,dx=(i&1?m.maxX:m.minX)+sx*wy-X,dz=(i&2?m.maxZ:m.minZ)+sz*wy-Z,dy=wy-Y;
   const forward=r.s*dx+r.c*dz,cz=r.cp*forward+r.sp*dy;
   pts[j]=r.c*dx-r.s*dz;pts[j+1]=r.cp*dy-r.sp*forward;pts[j+2]=cz;near=Math.min(near,cz);far=Math.max(far,cz);
  }
  if(far<.21)continue;
  let top=Infinity,bottom=-Infinity,minX=Infinity,maxX=-Infinity;
  // Occasional near-plane crossings use one conservative clipped rectangle.
  const crossing=near<.21;
  if(!crossing){
   for(let j=0;j<24;j+=3){const scale=fac/pts[j+2];pts[j]=w*.5+pts[j]*scale;pts[j+1]=h*.5-pts[j+1]*scale;top=Math.min(top,pts[j+1]);bottom=Math.max(bottom,pts[j+1])}
  }else{
   for(let i=0;i<8;i++)for(let bit=1;bit<=4;bit*=2){if(i&bit)continue;
    const a=i*3,b=(i|bit)*3,z0=pts[a+2],z1=pts[b+2];if(z0<.21&&z1<.21)continue;
    for(let n=0;n<2;n++){const t=n?(z1>=.21?1:(.21-z0)/(z1-z0)):(z0>=.21?0:(.21-z0)/(z1-z0));
     const scale=fac/(z0+(z1-z0)*t),x=w*.5+(pts[a]+(pts[b]-pts[a])*t)*scale,y=h*.5-(pts[a+1]+(pts[b+1]-pts[a+1])*t)*scale;
     minX=Math.min(minX,x);maxX=Math.max(maxX,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
   }
  }
  const y0=Math.max(0,Math.ceil(top-.5001)),y1=Math.min(h-1,Math.floor(bottom-.4999));if(y1<y0)continue;
  left.fill(crossing?minX:Infinity,y0,y1+1);right.fill(crossing?maxX:-Infinity,y0,y1+1);
  if(!crossing)for(let i=0;i<8;i++)for(let bit=1;bit<=4;bit*=2){
   if(i&bit)continue;const a=i*3,b=(i|bit)*3,A=pts[a+1],B=pts[b+1],slope=(pts[b]-pts[a])/(B-A);
   if(Math.abs(B-A)<1e-9)continue;
   const yA=Math.max(y0,Math.ceil(Math.min(A,B)-.5001)),yB=Math.min(y1,Math.floor(Math.max(A,B)-.4999));
   let x=pts[a]+(yA+.5-A)*slope;
   for(let y=yA;y<=yB;y++,x+=slope){if(x<left[y])left[y]=x;if(x>right[y])right[y]=x}
  }
  const overflow=m.overflow,slot=m.slot+1;
  for(let y=y0;y<=y1;y++){
   const x0=Math.max(0,Math.ceil(left[y]-.5001)),x1=Math.min(w-1,Math.floor(right[y]-.4999));
   const ly=dY0+dY*y,originU=u0+uy*y,originV=v0+vy*y;
   for(let start=x0;start<=x1;){
    const end=Math.min(x1+1,(start|7)+1),i=y*stride+(start>>3),dn=front[i],df=back[i];
    const ru=originU+ux*start,rv=originV+vx*start,eu=ru+ux*(end-start-1),ev=rv+vx*(end-start-1);
    let a=Math.min(ru,eu),b=Math.max(ru,eu),c=Math.min(rv,ev),d=Math.max(rv,ev);
    if(dn&&Y+ly*(ly<0?df:dn)<m.maxY&&U+a*(a<0?df:dn)<m.maxX&&U+b*(b>0?df:dn)>=m.minX&&V+c*(c<0?df:dn)<m.maxZ&&V+d*(d>0?df:dn)>=m.minZ){
     for(let x=start,j=y*w+start,cu=ru,cv=rv;x<end;x++,j++,cu+=ux,cv+=vx){
      const q=z[j],code=planes?planes[j]:0;if(!q||(code&65535)===0x8080||out[j]===255)continue;
      const dep=1/q,wy=Y+ly*dep;if(wy>=m.maxY)continue;
      const u=U+cu*dep,v=V+cv*dep;if(u<m.minX||u>=m.maxX||v<m.minZ||v>=m.maxZ)continue;
      if(overflow){const x=Math.floor((u-stamps.x)/3),y=Math.floor((v-stamps.z)/3);if(x<0||y<0||x>=128||y>=128)continue;
       const pos=(y*128+x)*4,tab=stamps.index;if(tab[pos]!==slot&&tab[pos+1]!==slot&&tab[pos+2]!==slot&&tab[pos+3]!==slot)continue}
      const v8=Math.round(255*rubyStampSample(m,u,v,wy,code));if(v8>out[j])out[j]=v8;
     }
    }
    start=end;
   }
  }
 }
 return out;
}
function rubyStampSample(m,u,v,y,code){
 let x=(u-m.wx)/m.cell-.5,z=(v-m.wz)/m.cell-.5;
 const size=m.size,ix=Math.max(0,x|0),iz=Math.max(0,z|0);
 if(ix>=size||iz>=size)return 0;
 x=Math.max(0,x-ix);z=Math.max(0,z-iz);
 const j=iz*size+ix,col=ix<size-1?1:0,row=iz<size-1?size:0,D=m.data;
 const A=D[j],B=D[j+col],C=D[j+row],E=D[j+col+row];if(!(A|B|C|E))return 0;
 const nx=(code<<24)>>24,nz=(code<<16)>>24,gx=nx*(3.2*m.cell),gz=nz*(3.2*m.cell);
 const cut=32768+64*(y+m.bias-m.base)-gx*x-gz*z-2;
 const a=A-cut,b=B-cut-gx,c=C-cut-gz,e=E-cut-gx-gz;
 if(a<=0&&b<=0&&c<=0&&e<=0)return 0;
 let shade=1;
 if(a<4||b<4||c<4||e<4){
  const a0=Math.min(1,Math.max(0,a*.25)),b0=Math.min(1,Math.max(0,b*.25)),c0=Math.min(1,Math.max(0,c*.25)),e0=Math.min(1,Math.max(0,e*.25));
  shade=(a0+(b0-a0)*x)*(1-z)+(c0+(e0-c0)*x)*z;
 }
 const steep=Math.max(Math.abs(nx),Math.abs(nz));
 if(steep>100&&!(code&131072)){const t=(125-steep)*.04;shade*=t*t*(3-2*t)}
 return shade;
}

// Software receiver pass. The inverse-Z buffer is the final opaque surface, so
// a kart, bridge or tree can receive light ahead of the road behind it, and
// no shadow pixels are painted over sky or an unsupported section of track.
function shadeSoftWorld(raster,r,fields){
 if(!fields)return;
 const {scene,detail,local,distant,focus,stamps,sx,sz}=fields,pix=raster.pix,depth=raster.z,planes=raster.receiver,w=raster.w,h=raster.h;
 const gi=scene?1/scene.cell:0,li=1/local.cell,fi=distant?1/distant.cell:0,hi=focus?1/focus.cell:0;
 const economy=local.economy,heroBias=focus?focus.bias*64:0;
 const f=1/(h*.5*r.f),X=r.cam.x,Y=r.cam.y,Z=r.cam.z,U=X-Y*sx,V=Z-Y*sz;
 const baseU=r.s*r.cp-r.sp*sx,baseV=r.c*r.cp-r.sp*sz;
 const vyU=-r.s*r.sp-r.cp*sx,vyV=-r.c*r.sp-r.cp*sz;
 // Cache the largest encoded caster height in each 4×4 tile (including
 // the +1 filtering taps). Empty road regularly excludes all four reads.
 const layers=raster.shadowTiles||(raster.shadowTiles=[]);
 function layer(field,slot,history=false){
  const D=history?field?.previous:field?.data;if(!D)return null;
  let cache=layers[slot];const n=field.size,cols=Math.ceil(n/4);
  if(!cache||cache.n!==n)cache=layers[slot]={n,cols,max:new Uint16Array(cols*cols),min:slot===0?new Uint16Array(cols*cols):null};
  if(cache.data===D&&cache.id===field.id&&cache.version===field.version)return cache;
  let partial=false;
  if(slot===2&&field.dirty){
   const prior=layers[4];
   if(prior?.id===field.id&&prior.version===field.version&&prior.data===field.previous){
    cache.max.set(prior.max);partial=true;
   }else partial=cache.id===field.id&&cache.version===field.version-1;
  }
  cache.id=field.id;cache.version=field.version;cache.data=D;cache.cell=field.cell;
  const tiles=partial?field.tiles:0;
  let left=n,top=n,right=0,bottom=0;
  for(let z=0,j=0;z<n;z+=4){
   const row=(z>>3)*tiles,next=tiles?Math.min(tiles-1,(z+4)>>3)*tiles:0;
   for(let x=0;x<n;x+=4,j++){
    let peak=cache.max[j];
    let refresh=true;
    if(tiles){
     const a=x>>3,b=Math.min(tiles-1,(x+4)>>3);
     refresh=field.dirty[row+a]||field.dirty[row+b]||field.dirty[next+a]||field.dirty[next+b];
    }
    if(refresh){
     const x1=Math.min(x+5,n),z1=Math.min(z+5,n);peak=0;
     if(x1-x===5){
      // At four-texel stride neighbouring bins share their filtering border.
      // Fixed five-sample rows avoid a per-tap branch at every dynamic update.
      let low=65535;
      if(cache.min){
       for(let i=z*n+x,end=z1*n+x;i<end;i+=n){
        const a=D[i],b=D[i+1],c=D[i+2],d=D[i+3],e=D[i+4];
        peak=Math.max(peak,a,b,c,d,e);low=Math.min(low,a,b,c,d,e);
       }
       cache.min[j]=low;
      }else for(let i=z*n+x,end=z1*n+x;i<end;i+=n)peak=Math.max(peak,D[i],D[i+1],D[i+2],D[i+3],D[i+4]);
     }else{
      let low=65535;
      for(let y=z;y<z1;y++)for(let i=y*n+x,end=y*n+x1;i<end;i++){const q=D[i];if(q>peak)peak=q;if(q<low)low=q}
      if(cache.min)cache.min[j]=low;
     }
     cache.max[j]=peak;
    }
    if(peak){left=Math.min(left,x);right=Math.max(right,x+4);top=Math.min(top,z);bottom=Math.max(bottom,z+4)}
   }
  }
  cache.minX=field.x+Math.max(0,left-1)*field.cell;cache.maxX=field.x+Math.min(n,right+1)*field.cell;
  cache.minZ=field.z+Math.max(0,top-1)*field.cell;cache.maxZ=field.z+Math.min(n,bottom+1)*field.cell;
  return cache;
 }
 const farMix=fields.farMix??1,lastFar=layers[2];
 if(farMix<1&&lastFar&&distant?.previous&&lastFar.id===distant.id&&lastFar.version===distant.version-1){
  // The old tile maxima already describe the outgoing sample. Recycle
  // their table rather than scanning the full course a second time.
  layers[2]=layers[4];layers[4]=lastFar;
  lastFar.data=distant.previous;lastFar.version=distant.version;
 }
 const previous=farMix<1?layer(distant,4,true):null;
 const amount=fields.staticMix??1,stat=amount?layer(scene,0):null,near=layer(local,1),far=layer(distant,2),hero=layer(focus,3);
 function sample(map,a,b,height,nx,nz){
  const n=map.n;
  if(a<0||b<0||a>=n||b>=n)return 0;
  a-=.5;b-=.5;
  const x=a|0,z=b|0,peak=map.max[(z>>2)*map.cols+(x>>2)];
  if(!peak)return 0;
  const unit=3.2*map.cell;
  if(peak<=height-2-(Math.abs(nx)+Math.abs(nz))*unit)return 0;
  return filterDepth(map.data,n,a,b,x,z,height,nx,nz,unit);
 }
 function filterDepth(D,n,a,b,x,z,height,nx,nz,unit){
  const fx=Math.max(0,a-x),fz=Math.max(0,b-z),j=z*n+x,col=x<n-1?1:0,row=z<n-1?n:0;
  const A=D[j],B=D[j+col],C=D[j+row],E=D[j+row+col];
  if(!(A|B|C|E))return 0;
  // Heights are stored in 1/64 m units. The four-unit comparison band
  // removes quantization chatter at grazing angles and shallow contacts.
  const gx=nx*unit,gz=nz*unit,cut=height-gx*fx-gz*fz-2;
  const ac=A-cut,bc=B-cut-gx,cc=C-cut-gz,ec=E-cut-gx-gz;
  if(ac<=0&&bc<=0&&cc<=0&&ec<=0)return 0;
  if(ac>=4&&bc>=4&&cc>=4&&ec>=4)return 1;
  const v00=Math.min(1,Math.max(0,ac*.25)),v10=Math.min(1,Math.max(0,bc*.25));
  const v01=Math.min(1,Math.max(0,cc*.25)),v11=Math.min(1,Math.max(0,ec*.25));
  const lo=v00+(v10-v00)*fx,up=v01+(v11-v01)*fx;
  return lo+(up-lo)*fz;
 }
 const extra=rubyStampMask(raster,r,stamps,sx,sz);
 const fine=hero||(!scene&&!distant?near:null);let fineReceiver=false;
 const high=amount&&detail?.data?detail:null;
 const highSize=high?.size||0,highX=high?.x||0,highZ=high?.z||0,highSpan=highSize/16;
 const hiLeft=highX+1.5,hiTop=highZ+1.5,hiRight=highX+highSpan-1.5,hiBottom=highZ+highSpan-1.5;
 const hiData=high?.data,hiBounds=high?.bounds,hiBias=(high?.bias||0)*64,hiCols=highSize>>2;
 function weight(i,dx,Uy,Vy,lightY){
  const q=depth[i],plane=planes?(planes[i]&65535):0;if(!q||plane===0x8080)return 0;
  const d=1/q,u=U+(Uy+r.c*dx)*d,v=V+(Vy-r.s*dx)*d,height=32768+64*(Y+lightY*d);
  fineReceiver=fine&&u>=fine.minX&&u<fine.maxX&&v>=fine.minZ&&v<fine.maxZ;
  const nx=(plane<<24)>>24,nz=(plane<<16)>>24,steep=Math.max(Math.abs(nx),Math.abs(nz));
  // In the last few degrees of direct light a texel spans many metres
  // along the surface. Match the GPU's smooth grazing-light attenuation.
  let direct=1;
  if(steep>100&&!(planes&&planes[i]&131072)){const t=(125-steep)*.04;direct=t*t*(3-2*t)}
  let fineValue=0,fineMix=0,darkness=0;
  if(high&&u>hiLeft&&u<hiRight&&v>hiTop&&v<hiBottom){
   const a=(u-highX)*16-.5,b=(v-highZ)*16-.5,x=a|0,z=b|0;
   const bin=hiBounds?.[(z>>2)*hiCols+(x>>2)];
   const seam=(x&255)>=252||(z&255)>=252,cut=height+hiBias;
   if(seam||bin!==0xffffffff){
    fineMix=1;
    if(u<hiLeft+2.5||u>hiRight-2.5||v<hiTop+2.5||v>hiBottom-2.5){
     const t=Math.min(u-hiLeft,hiRight-u,v-hiTop,hiBottom-v)*.4;fineMix=t*t*(3-2*t);
    }
    if(seam||bin!==0){
     const slack=(Math.abs(nx)+Math.abs(nz))*.20;
     if(!seam&&bin!==undefined&&(bin&65535)<=cut-slack-2){/* Fully lit. */}
     else if(!seam&&bin!==undefined&&(bin>>>16)>=cut+slack+2)fineValue=amount;
     else{
      const j=z*highSize+x;
      if(hiData[j]===65535||hiData[j+1]===65535||hiData[j+highSize]===65535||hiData[j+highSize+1]===65535)fineMix=0;
      else{
       fineReceiver=true;
       fineValue=filterDepth(hiData,highSize,a,b,x,z,cut,nx,nz,.20)*amount;
      }
     }
    }
   }
  }
  if(fineMix<1&&stat&&u>=stat.minX&&u<stat.maxX&&v>=stat.minZ&&v<stat.maxZ){
   // Most receivers see open light. Read the existing static block bound
   // before entering the four-tap filter, without increasing field storage.
   const a=(u-scene.x)*gi-.5,b=(v-scene.z)*gi-.5,x=a|0,z=b|0;
   const h=height+scene.bias*64,block=(z>>2)*stat.cols+(x>>2),peak=stat.max[block],unit=3.2*stat.cell;
   const slack=(Math.abs(nx)+Math.abs(nz))*unit;
   if(a<stat.n-.5&&b<stat.n-.5&&peak&&peak>h-2-slack){
    if(stat.min[block]>=h+2+slack)darkness=amount;
    else {darkness=filterDepth(stat.data,stat.n,a,b,x,z,h,nx,nz,unit)*amount;fineReceiver=true}
   }
  }
  if(fineMix)darkness+=(fineValue-darkness)*fineMix;
  if(darkness===1)return direct;
  let motion=0;
  if(u>=near.minX&&u<near.maxX&&v>=near.minZ&&v<near.maxZ)
   motion=sample(near,(u-local.x)*li,(v-local.z)*li,height+local.bias*64,nx,nz);
  if(far&&(motion||u>=far.minX&&u<far.maxX&&v>=far.minZ&&v<far.maxZ
    ||previous&&u>=previous.minX&&u<previous.maxX&&v>=previous.minZ&&v<previous.maxZ)){
   const a=(u-local.x)*li,b=(v-local.z)*li,edge=Math.min(a,b,local.size-a,local.size-b);
   if(edge<2){
    const x=(u-distant.x)*fi,z=(v-distant.z)*fi,h=height+distant.bias*64;
    let wide=sample(far,x,z,h,nx,nz);
    if(previous){const old=sample(previous,x,z,h,nx,nz);wide=old+(wide-old)*farMix}
    const t=Math.max(0,edge*.5),blend=t*t*(3-2*t);motion=wide+(motion-wide)*blend;
   }
  }
  darkness=Math.max(darkness,motion);
  if(hero&&darkness<1&&u>=hero.minX&&u<hero.maxX&&v>=hero.minZ&&v<hero.maxZ)
   darkness=Math.max(darkness,sample(hero,(u-focus.x)*hi,(v-focus.z)*hi,height+heroBias,nx,nz));
  return darkness*direct;
 }
 function tint(i,k){
  if(extra&&extra[i]>k*255)k=extra[i]/255;
  if(k<=0)return;
  if(planes&&(planes[i]&131072))k*=(planes[i]>>>18&255)/(255*.275);
  const c=pix[i],s=1-.30*k;
  pix[i]=(c&0xff000000)|((c&255)*s)|(((c>>>8&255)*(s+.025*k)|0)<<8)|(((c>>>16&255)*(s+.079*k)|0)<<16);
 }
 for(let y=0;y<h;y+=2){
  const up=(h*.5-y-.5)*f,uy=baseU+up*vyU,vy=baseV+up*vyV,ly=r.sp+up*r.cp;
  let dx=(.5-w*.5)*f;
  for(let x=0,i=y*w;x<w;x+=2,i+=2,dx+=2*f){
   const q=depth[i],quad=x+1<w&&y+1<h,plane=planes?planes[i]:0;
   if(quad){
    if(!q&&!depth[i+1]&&!depth[i+w]&&!depth[i+w+1])continue;
    if(planes&&(plane&65535)===0x8080&&(planes[i+1]&65535)===0x8080&&
      (planes[i+w]&65535)===0x8080&&(planes[i+w+1]&65535)===0x8080)continue;
   }
   const k=q?weight(i,dx,uy,vy,ly):0,min=q*.985,max=q*1.015;
   // A single 2x2 tap can hide a thin visor, wheel or neck shadow. Keep
   // these receivers at native pixels; share only matching scenery planes.
   const uniform=plane!==0x8080&&!(plane&65536)&&!fineReceiver&&(k===0||k===1||economy);
   if(quad&&uniform&&k===0&&(!extra||!(extra[i]|extra[i+1]|extra[i+w]|extra[i+w+1]))){
    const b=depth[i+1],c=depth[i+w],d=depth[i+w+1];
    if((!planes||planes[i+1]===plane&&planes[i+w]===plane&&planes[i+w+1]===plane)&&
      b>=min&&b<=max&&c>=min&&c<=max&&d>=min&&d<=max)continue;
   }
   if(q)tint(i,k);
   if(x+1<w&&depth[i+1]){const v=depth[i+1];tint(i+1,uniform&&(!planes||planes[i+1]===plane)&&v>=min&&v<=max?k:weight(i+1,dx+f,uy,vy,ly))}
   if(y+1<h){
    if(depth[i+w]){const v=depth[i+w];tint(i+w,uniform&&(!planes||planes[i+w]===plane)&&v>=min&&v<=max?k:weight(i+w,dx,uy-f*vyU,vy-f*vyV,ly-f*r.cp))}
    if(x+1<w&&depth[i+w+1]){const v=depth[i+w+1];tint(i+w+1,uniform&&(!planes||planes[i+w+1]===plane)&&v>=min&&v<=max?k:weight(i+w+1,dx+f,uy-f*vyU,vy-f*vyV,ly-f*r.cp))}
   }
  }
 }
}
