// Horizontal contact is a disc swept against the actual footprint. Rounded
// corners let a kart brush past a pillar without hitting an invisible square.
class CourseSolids{
 constructor(){this.items=[];this.cells=new Map();this.overheadCells=new Map();this.visit=0}
 key(x,z){return (x+32768)*65536+z+32768}
 add(x,y,z,s){
  if(!(s.h>0)||(s.r==null?!(s.halfX>0&&s.halfZ>0):!(s.r>0)))throw Error('Invalid solid '+s.tag);
  const item={...s,x,y,z,yaw:s.yaw||0,query:0};
  const span=(s.r||Math.hypot(s.halfX,s.halfZ))+(s.reach||0);
  item.span=span;this.items.push(item);
  for(let iz=Math.floor((z-span)/12);iz<=Math.floor((z+span)/12);iz++)for(let ix=Math.floor((x-span)/12);ix<=Math.floor((x+span)/12);ix++){
   const key=this.key(ix,iz);let list=this.cells.get(key);if(!list)this.cells.set(key,list=[]);list.push(item);
   if(item.ceilingOnly||item.cameraOverhead){let tops=this.overheadCells.get(key);if(!tops)this.overheadCells.set(key,tops=[]);tops.push(item)}
  }
  return item;
 }
 pose(s,t,previous=false){
  const key=previous?'prev':'now';let p=s[key];if(p&&(p.t===t||!s.anim))return p;
  if(!p)p=s[key]={};
  const a=s.anim?s.anim(t):null,b=s.yaw+(a?.yaw||0);
  p.t=t;p.show=!s.anim||!!a&&(a.y??0)>-50;p.x=s.x+(a?.x||0);p.y=s.y+(a?.y||0);p.z=s.z+(a?.z||0);
  p.c=Math.cos(b);p.s=Math.sin(b);
  return p;
 }
 nearby(x,y,z,r,h,t){
  for(let iz=Math.floor((z-r)/12);iz<=Math.floor((z+r)/12);iz++)for(let ix=Math.floor((x-r)/12);ix<=Math.floor((x+r)/12);ix++){
   const list=this.cells.get(this.key(ix,iz));if(!list)continue;
   for(const item of list){
    const p=this.pose(item,t),span=item.r||Math.hypot(item.halfX,item.halfZ);
    if(p.show&&p.y<y+h&&p.y+item.h>y&&Math.abs(x-p.x)<r+span&&Math.abs(z-p.z)<r+span)return true;
   }
  }
  return false;
 }
 // Vault facets share the exact vertices and diagonal of the visible ice shell.
 addRoof(a,b,c){
  const points=[a,b,c],xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);
  const item={points,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),
   minY:Math.min(a[1],b[1],c[1]),maxY:Math.max(a[1],b[1],c[1]),query:0},cells=this.overheadCells;
  for(let z=Math.floor(Math.min(...zs)/12);z<=Math.floor(Math.max(...zs)/12);z++)
   for(let x=Math.floor(Math.min(...xs)/12);x<=Math.floor(Math.max(...xs)/12);x++){
    const key=this.key(x,z);let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(item);
   }
  this.hasRoofMesh=true;
 }
 // Clip the triangle against a swept footprint. Height is linear on each
 // facet, so the lowest clipped vertex gives the tightest safe clearance.
 meshUnderside(points,x,z,X,Z,r){
  const dx=X-x,dz=Z-z,length=Math.hypot(dx,dz),cs=length?dx/length:1,sn=length?dz/length:0;
  let a=this.clipA||(this.clipA=new Float64Array(24)),b=this.clipB||(this.clipB=new Float64Array(24)),count=3;
  for(let i=0;i<3;i++){const p=points[i],u=p[0]-x,v=p[2]-z;a[3*i]=u*cs+v*sn;a[3*i+1]=v*cs-u*sn;a[3*i+2]=p[1]}
  for(let k=0;k<4&&count;k++){
   const ax=k>>1,sign=k%2?-1:1,edge=k===1?length+r:k%2?r:-r;let n=0;
   for(let i=0,j=(count-1)*3;i<count;i++){
    const o=i*3,d0=sign*(a[j+ax]-edge),d1=sign*(a[o+ax]-edge);
    if(d0*d1<0){const t=d0/(d0-d1);for(let m=0;m<3;m++)b[n++]=a[j+m]+(a[o+m]-a[j+m])*t}
    if(d1>=0){b[n++]=a[o];b[n++]=a[o+1];b[n++]=a[o+2]}
    j=o;
   }
   const swap=a;a=b;b=swap;count=n/3;
  }
  let low=Infinity;for(let i=2;i<count*3;i+=3)low=Math.min(low,a[i]);return low;
 }
 // Lowest underside over a swept horizontal footprint, approached from
 // below. The sparse map contains only actual overhead pieces of scenery.
 underside(x,z,X,Z,r,below,time,physicalOnly=false){
  const cells=this.overheadCells;if(!cells.size)return Infinity;
  const ix0=Math.floor((Math.min(x,X)-r)/12),ix1=Math.floor((Math.max(x,X)+r)/12);
  const iz0=Math.floor((Math.min(z,Z)-r)/12),iz1=Math.floor((Math.max(z,Z)+r)/12);
  const minX=Math.min(x,X)-r,maxX=Math.max(x,X)+r,minZ=Math.min(z,Z)-r,maxZ=Math.max(z,Z)+r;
  let low=Infinity;const visit=++this.visit;
  for(let iz=iz0;iz<=iz1;iz++)for(let ix=ix0;ix<=ix1;ix++){
   const list=cells.get(this.key(ix,iz));if(!list)continue;
   for(const item of list){
    if(item.query===visit||physicalOnly&&!item.ceilingOnly&&!item.points)continue;item.query=visit;
    if(item.points){
     if(item.minY>=low||item.maxY<=below||item.maxX<minX||item.minX>maxX||item.maxZ<minZ||item.minZ>maxZ)continue;
     const y=this.meshUnderside(item.points,x,z,X,Z,r);
     if(y>below&&y<low)low=y;
     continue;
    }
    const p=this.pose(item,time);if(!p.show||p.y<=below||p.y>=low)continue;
    // Use exactly the rounded footprint used by kart collision, including
    // rotation, rather than a single rectangle around the whole aircraft.
    if(this.sweep(item,p,p,x,p.y-.01,z,X,p.y-.01,Z,r,.02))low=p.y;
   }
  }
  return low;
 }
 queryWorld(x0,y0,z0,x1,y1,z1,r,h,t,dt=0,riderH=h){
  let best=null;const visit=++this.visit;
  const ix0=Math.floor((Math.min(x0,x1)-r)/12),ix1=Math.floor((Math.max(x0,x1)+r)/12);
  const iz0=Math.floor((Math.min(z0,z1)-r)/12),iz1=Math.floor((Math.max(z0,z1)+r)/12);
  for(let iz=iz0;iz<=iz1;iz++)for(let ix=ix0;ix<=ix1;ix++){
   const list=this.cells.get(this.key(ix,iz));if(!list)continue;
   for(const s of list){
    if(s.query===visit)continue;s.query=visit;
    const b=this.pose(s,t);if(!b.show)continue;
    const old=dt&&s.anim?this.pose(s,t-dt,true):b,a=old.show?old:b;
    const height=s.ceilingOnly||s.cameraOverhead?riderH:h;
    if(Math.min(y0-a.y,y1-b.y)>s.h+.0001||Math.max(y0-a.y,y1-b.y)<-height-.0001)continue;
    const hit=this.sweep(s,a,b,x0,y0,z0,x1,y1,z1,r,height);
    if(hit&&(!best||hit.time<best.time-.00001||Math.abs(hit.time-best.time)<.00001&&hit.push>best.push)){
     hit.item=s;hit.tag=s.tag;hit.roof=b.y+s.h;hit.bottom=b.y;hit.vx=dt?(b.x-a.x)/dt:0;hit.vz=dt?(b.z-a.z)/dt:0;best=hit;
    }
   }
  }
  return best;
 }
 sweep(s,a,b,x0,y0,z0,x1,y1,z1,r,h){
  const x=(x0-a.x)*a.c-(z0-a.z)*a.s,z=(x0-a.x)*a.s+(z0-a.z)*a.c;
  const X=(x1-b.x)*b.c-(z1-b.z)*b.s,Z=(x1-b.x)*b.s+(z1-b.z)*b.c;
  const dx=X-x,dz=Z-z,y=y0-a.y,dy=y1-b.y-y,rx=s.r||s.halfX,rz=s.r||s.halfZ;
  if(Math.min(x,X)>rx+r||Math.max(x,X)<-rx-r||Math.min(z,Z)>rz+r||Math.max(z,Z)<-rz-r)return null;
  let enter=Infinity,leave=-Infinity;
  const circle=(cx,cz,R)=>{
   const xx=x-cx,zz=z-cz,aa=dx*dx+dz*dz,cc=xx*xx+zz*zz-R*R;
   if(aa<1e-12){if(cc<=0){enter=-Infinity;leave=Infinity}return}
   const bb=xx*dx+zz*dz,disc=bb*bb-aa*cc;if(disc<0)return;
   const root=Math.sqrt(disc);enter=Math.min(enter,(-bb-root)/aa);leave=Math.max(leave,(-bb+root)/aa);
  };
  const rect=(hx,hz)=>{
   if((!dx&&Math.abs(x)>hx)||(!dz&&Math.abs(z)>hz))return;
   const ax=dx?(-hx-x)/dx:-Infinity,bx=dx?(hx-x)/dx:Infinity;
   const az=dz?(-hz-z)/dz:-Infinity,bz=dz?(hz-z)/dz:Infinity;
   const lo=Math.max(Math.min(ax,bx),Math.min(az,bz)),hi=Math.min(Math.max(ax,bx),Math.max(az,bz));
   if(lo<=hi){enter=Math.min(enter,lo);leave=Math.max(leave,hi)}
  };
  if(s.r)circle(0,0,s.r+r);
  else{
   rect(rx+r,rz);rect(rx,rz+r);
   // Only corners in reach of this segment can extend the union of the strips.
   if(r>0)for(let i=0;i<4;i++){
    const cx=i&1?rx:-rx,cz=i&2?rz:-rz;
    if(cx>=Math.min(x,X)-r&&cx<=Math.max(x,X)+r&&cz>=Math.min(z,Z)-r&&cz<=Math.max(z,Z)+r)circle(cx,cz,r);
   }
  }
  if(enter>1||leave<0)return null;
  const v0=dy?(-h-y)/dy:-Infinity,v1=dy?(s.h-y)/dy:Infinity;
  const vEnter=Math.min(v0,v1),vExit=Math.max(v0,v1),time=Math.max(0,enter,vEnter);
  if(time>Math.min(1,leave,vExit)+1e-8)return null;
  let nx=0,ny=0,nz=0,push=0;
  if(vEnter>=0&&vEnter>=enter-.000001)ny=dy>0?-1:1;
  else{
   const px=x+dx*time,pz=z+dz*time;
   const nx0=s.r?px:px-clamp(px,-rx,rx),nz0=s.r?pz:pz-clamp(pz,-rz,rz),d=Math.hypot(nx0,nz0);
   if(d>1e-7){nx=nx0/d;nz=nz0/d;push=Math.max(0,(s.r||0)+r-d)}
   else if(s.r){nx=dx>0?-1:1;push=s.r+r}
   else if(rx-Math.abs(px)<rz-Math.abs(pz)){nx=px<0?-1:1;push=rx-Math.abs(px)+r}
   else{nz=pz<0?-1:1;push=rz-Math.abs(pz)+r}
   if(time===0){
    const top=s.h-y,bottom=y+h;
    if(Math.min(top,bottom)<push){ny=top<bottom?1:-1;nx=nz=0;push=Math.max(0,Math.min(top,bottom))}
   }
  }
  if(time===0&&push<.00001&&dx*nx+dz*nz+dy*ny>=-.000001)return null;
  return {time,nx:b.c*nx+b.s*nz,ny,nz:b.c*nz-b.s*nx,push:time===0?push:0};
 }
 // Reuse each short road slice's nearby candidates across all AI decisions.
 buildLanes(track){
  this.lanes=[];const count=Math.ceil(track.L/6);this.step=track.L/count;
  for(let k=0;k<count;k++){
   const road=track.at(k*this.step),w=track.width(k*this.step)+5,list=new Set();
   for(let z=Math.floor((road.z-w)/12);z<=Math.floor((road.z+w)/12);z++)for(let x=Math.floor((road.x-w)/12);x<=Math.floor((road.x+w)/12);x++){
    const bucket=this.cells.get(this.key(x,z));if(bucket)for(const item of bucket)list.add(item);
   }
   this.lanes.push({road,list:[...list],c:Math.cos(road.yaw),s:Math.sin(road.yaw)});
  }
 }
 planLanes(track,r,ahead,time,barriers){
  const start=Math.floor(mod(r.s,track.L)/this.step),steps=Math.ceil(ahead/this.step);
  for(let k=1;k<=steps;k++){
   const lane=this.lanes[(start+k)%this.lanes.length];if(!lane.list.length)continue;
   const {road,c,s}=lane;
   for(const item of lane.list){
    if(item.hazard)continue;
    const p=this.pose(item,time+k*this.step/Math.max(6,r.u));if(!p.show)continue;
    const dx=p.x-road.x,dz=p.z-road.z,l=dx*c-dz*s,u=dx*s+dz*c;
    const cos=c*p.c+s*p.s,sin=c*p.s-s*p.c;
    const longitudinal=item.r||Math.abs(sin)*item.halfX+Math.abs(cos)*item.halfZ;
    if(Math.abs(u)>longitudinal+this.step*.5)continue;
    const w=item.r||Math.abs(cos)*item.halfX+Math.abs(sin)*item.halfZ,ground=road.y+l*Math.tan(road.bank);
    if(p.y>ground+1.4||p.y+item.h<ground+.12||Math.abs(l)>track.d.half+w+1)continue;
    barriers.push([l-w-.78,l+w+.78,8]);
   }
  }
 }
}
