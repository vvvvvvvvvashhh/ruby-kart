// The build inserts the immutable, light-space scenery depths here. Each
// quality is rasterized independently at its own texel centres and solar angle.
const BakedShadows=(()=>{
 const maps=/* COURSE SHADOW ASSETS */{};
 function read(id,quality,light){
  const map=maps[id],entry=map?.tiers?.[quality];
  if(!entry||light.sun[0]/light.sun[1]!==map.sx||light.sun[2]/light.sun[1]!==map.sz)return null;
  const [size,encoded]=entry,cell=map.span/size;
  return {size,cell,x:map.x,z:map.z,bias:.21+cell*.33,data:decode(encoded,size)};
 }
 const details=/* COURSE DETAIL TILES */{};
 function decode(encoded,size){
  const points=size*size;
  // Recover two byte planes from an LZ4 block, then integrate the signed
  // 2-D depth differences. Neither quantization nor edge dilation is involved.
  const packed=atob(encoded),residual=new Uint8Array(points*2);
  let pos=0,out=0;
  function length(n){if(n===15){let more;do{more=packed.charCodeAt(pos++);n+=more}while(more===255)}return n}
  while(pos<packed.length){
   const code=packed.charCodeAt(pos++),literal=length(code>>4),limit=out+literal;
   while(out<limit)residual[out++]=packed.charCodeAt(pos++);
   if(pos===packed.length)break;
   const distance=packed.charCodeAt(pos)|(packed.charCodeAt(pos+1)<<8);pos+=2;
   const end=out+length(code&15)+4;
   for(let src=out-distance;out<end;)residual[out++]=residual[src++];
  }
  const data=new Uint16Array(points);
  for(let y=0,i=0;y<size;y++){
   let slope=0;
   for(let x=0;x<size;x++,i++){
    const zig=residual[i]|residual[i+points]<<8;
    slope+=(zig>>>1)^-(zig&1);
    data[i]=slope+(y?data[i-size]:0);
   }
  }
  return data;
 }
 // Each 4x4 group includes the next filtering taps. At tile seams the
 // receiver bypasses this bound and reads the four physical depths.
 function unpackTile(encoded){
  if(!encoded)return encoded===0?0:null;
  const data=decode(encoded,256),bounds=new Uint32Array(64*64);
  for(let z=0,j=0;z<256;z+=4)for(let x=0;x<256;x+=4,j++){
   let low=65535,peak=0;
   for(let y=z;y<Math.min(z+5,256);y++)for(let i=y*256+x,end=y*256+Math.min(x+5,256);i<end;i++){
    const v=data[i];if(v<low)low=v;if(v>peak)peak=v;
   }
   bounds[j]=low*65536+peak;
  }
  return {data,bounds};
 }
 let active=null,prepared=null,serial=0;
 const grids={low:3,standard:5,high:7};
 function available(id){return !!details[id]}
 function storeFor(id,quality,warm){
  if(active?.id===id&&active.quality===quality)return active;
  const store=prepared?.id===id&&prepared.quality===quality?prepared:
   {id,quality,cache:new Map(),field:null,pending:null,warm:null,version:0,serial:++serial};
  if(warm)prepared=store;
  else{active=store;prepared=null}
  return store;
 }
 function region(tx,tz,n){
  const half=n>>1,queue=[];
  for(let z=0;z<n;z++)for(let x=0;x<n;x++)queue.push({x:tx+x,z:tz+z,d:(x-half)**2+(z-half)**2});
  queue.sort((a,b)=>a.d-b.d);return {tx,tz,n,queue,i:0};
 }
 function prepareTiles(s,pending,map){
  let decoded=false;
  while(pending.i<pending.queue.length){
   const q=pending.queue[pending.i],key=q.x+','+q.z;
   if(!s.cache.has(key)){
    const encoded=map.tiles[key];if(decoded&&encoded)break;
    s.cache.set(key,unpackTile(encoded));if(encoded)decoded=true;
   }
   pending.i++;
  }
  return pending.i===pending.queue.length;
 }
 function trim(s,tx,tz,n){
  const warm=s.warm,current=s.field;
  function inside(x,z,a,b,width=n){return x>=a-1&&x<=a+width&&z>=b-1&&z<=b+width}
  for(const key of s.cache.keys()){
   const split=key.indexOf(','),x=Number(key.slice(0,split)),z=Number(key.slice(split+1));
   if(inside(x,z,tx,tz)||warm&&inside(x,z,warm.tx,warm.tz,warm.n)||current&&inside(x,z,current.x/16,current.z/16))continue;
   s.cache.delete(key);
  }
 }
 function warmTiles(id,quality,u,v){
  const map=details[id],n=grids[quality];if(!map||!n)return true;
  // The camera biases its field up to 13 m ahead. Warm the single surrounding
  // ring as well so any starting orientation can publish immediately.
  const s=storeFor(id,quality,true),tx=Math.floor(u/16)-(n>>1)-1,tz=Math.floor(v/16)-(n>>1)-1;
  if(s.warm?.tx!==tx||s.warm.tz!==tz){
   s.warm=region(tx,tz,n+2);
   if(s.pending)trim(s,s.pending.tx,s.pending.tz,n);else trim(s,tx,tz,n);
  }
  // Menu views may be hundreds of metres from the starting grid. Only the
  // visible camera can publish a new window or alter its pending region.
  return prepareTiles(s,s.warm,map);
 }
 function detailWindow(id,quality,u,v){
  const map=details[id],n=grids[quality];if(!map||!n)return null;
  const s=storeFor(id,quality,false),half=n>>1;
  let tx=Math.floor(u/16)-half,tz=Math.floor(v/16)-half;
  const current=s.field;
  if(current){
   const margin=(n*16-20)*.5;
   if(u>=current.x+margin&&u<current.x+n*16-margin&&v>=current.z+margin&&v<current.z+n*16-margin){
    tx=current.x/16;tz=current.z/16;
   }
  }
  const changed=!current||tx!==current.x/16||tz!==current.z/16;
  if(changed&&(s.pending?.tx!==tx||s.pending.tz!==tz)){
   s.pending=region(tx,tz,n);trim(s,tx,tz,n);
  }else if(!changed)s.pending=null;
  const pending=s.pending;
  if(pending){
   // One cold block per simulation presentation. Publishing only complete
   // windows leaves the previous filtered field in place during a turn.
   if(prepareTiles(s,pending,map)){
    const size=n*256,field=current||{id:s.serial,version:0,size,cell:1/16,bias:.055,
     x:NaN,z:NaN,data:new Uint16Array(size*size),bounds:new Uint32Array(size*size/16)};
    const tiles=[];
    for(const q of pending.queue){
     if(!current||q.x<field.x/16||q.x>=field.x/16+n||q.z<field.z/16||q.z>=field.z/16+n){
      const key=q.x+','+q.z;tiles.push({x:q.x-tx,z:q.z-tz,tile:s.cache.get(key)});
     }
    }
    const patch={x:tx*16,z:tz*16,tiles,version:++s.version};
    rubyPlaceDetail(field,patch);field.patch=patch;field.ready=true;s.field=field;s.pending=null;
    if(s.warm&&Math.abs(s.warm.tx+1-tx)<=1&&Math.abs(s.warm.tz+1-tz)<=1)s.warm=null;
    trim(s,tx,tz,n);
    s.border=0;
   }
  }else if(s.border<(n+2)*4-4){
   const stride=n+2;
   while(s.border<4*stride-4){
    const i=s.border++,side=i<stride?0:i<2*stride?1:i<3*stride-2?2:3;
    const x=side<2?tx-1+i%stride:side===2?tx-1:tx+n;
    const z=side<2?tz+(side?n:-1):tz+(i-2*stride)%(stride-2);
    const key=x+','+z;if(s.cache.has(key))continue;
    const encoded=map.tiles[key];s.cache.set(key,unpackTile(encoded));if(encoded)break;
   }
  }
  return s.field;
 }
 return {read,available,warmTiles,detailWindow};
})();
