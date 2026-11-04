// A distance-parametrized road and a spatial hash. Physics runs in world space;
// nearest-road queries supply contact, checkpoint and timing information.
function thwompHeight(t,phase=0){
 const a=mod(t+phase,4.6);
 if(a<.86)return 0;
 if(a<2.28){let k=(a-.86)/1.42;return 6.1*k*k*(3-2*k)}
 if(a<4.05)return 6.1+.085*Math.sin(a*7);
 let k=(a-4.05)/.55;return Math.max(0,6.1*(1-k*k));
}
// Straight-line limits reflect the size of each venue. The corner envelope
// below is computed from the road itself, including linked bends and braking distance.
const venuePace={
 park:{cruise:.80,turn:1.29,brake:7.8},rainbow:{cruise:.96,turn:1.23,brake:7.0},
 harbor:{cruise:.85,turn:1.24,brake:7.4},summit:{cruise:.90,turn:1.19,brake:6.9},
 forge:{cruise:.98,turn:1.32,brake:7.7},airport:{cruise:.98,turn:1.30,brake:7.5},
 wario:{cruise:1,turn:1.22,brake:7.2}
};
// The same two triangles as Geo.face, stored in world space for tyre contact.
// Only explicitly driveable faces are indexed. A height limit keeps a kart
// beneath an overpass on the lower of two overlapping decks.
class RoadSurfaceIndex{
 constructor(cellSize=6){this.cellSize=cellSize;this.cells=new Map()}
 key(x,z){return (x+32768)*65536+z+32768}
 addFace(a,b,c,d){
  this.addTriangle(a,b,c);
  if(d)this.addTriangle(a,c,d);
 }
 addTriangle(a,b,c){
  const x=b[0]-a[0],z=b[2]-a[2],X=c[0]-a[0],Z=c[2]-a[2],det=x*Z-X*z;
  if(Math.abs(det)<1e-8)return;
  const minX=Math.min(a[0],b[0],c[0]),maxX=Math.max(a[0],b[0],c[0]);
  const minZ=Math.min(a[2],b[2],c[2]),maxZ=Math.max(a[2],b[2],c[2]);
  const t={x:a[0],y:a[1],z:a[2],minX,maxX,minZ,maxZ,ux:Z/det,uz:-X/det,vx:-z/det,vz:x/det,uy:b[1]-a[1],vy:c[1]-a[1]};
  const size=this.cellSize;
  for(let iz=Math.floor(minZ/size);iz<=Math.floor(maxZ/size);iz++){
   for(let ix=Math.floor(minX/size);ix<=Math.floor(maxX/size);ix++){
    const key=this.key(ix,iz);let list=this.cells.get(key);
    if(!list)this.cells.set(key,list=[]);
    list.push(t);
   }
  }
 }
 // A road chunk can emit several painted/contoured faces in one operation.
 // Capture those vertices before the renderer moves its origin to chunk space.
 addGeometry(g,first=0,end=g.d.length){
  const d=g.d;
  for(let i=first;i<end;i+=27)this.addTriangle([d[i],d[i+1],d[i+2]],[d[i+9],d[i+10],d[i+11]],[d[i+18],d[i+19],d[i+20]]);
 }
 heightAt(x,z,maxY=Infinity){
  const list=this.cells.get(this.key(Math.floor(x/this.cellSize),Math.floor(z/this.cellSize)));
  if(!list)return null;
  let height=-Infinity;
  for(const t of list){
   if(x<t.minX-1e-7||x>t.maxX+1e-7||z<t.minZ-1e-7||z>t.maxZ+1e-7)continue;
   const dx=x-t.x,dz=z-t.z,u=dx*t.ux+dz*t.uz,v=dx*t.vx+dz*t.vz;
   if(u< -1e-7||v< -1e-7||u+v>1.0000001)continue;
   const y=t.y+t.uy*u+t.vy*v;
   if(y<=maxY&&y>height)height=y;
  }
  return height===-Infinity?null:height;
 }
}
class Circuit{
 constructor(def){
  this.d=def;this.solids=new CourseSolids();this.props=[];this.grid=new Map();const source=def.points.map(a=>[+a[0],+a[1]]);
  if(Math.hypot(source[0][0]-source.at(-1)[0],source[0][1]-source.at(-1)[1])<.001)source.pop();
  const acc=[0];let L=0;for(let i=0;i<source.length;i++){const a=source[i],b=source[(i+1)%source.length];L+=Math.hypot(b[0]-a[0],b[1]-a[1]);acc.push(L)}
  this.L=L;
  this.stageGates=[];this.finishFraction=def.stages?.at(-1)??1;
  if(def.stages){
   let from=0;this.stageGates.push(0);
   for(const to of def.stages){for(let i=1;i<=4;i++)this.stageGates.push((from+(to-from)*i/4)*L);from=to}
  }
  this.n=Math.ceil(L/.65);this.step=L/this.n;this.pts=[];let seg=0;
  for(let j=0;j<this.n;j++){const s=j*this.step;while(seg+1<source.length&&acc[seg+1]<s)seg++;let a=source[seg],b=source[(seg+1)%source.length],q=(s-acc[seg])/(acc[seg+1]-acc[seg]||1);this.pts.push({x:mix(a[0],b[0],q),z:mix(a[1],b[1],q),h:def.height(j/this.n),bank:def.bank(j/this.n)})}
  for(let i=0;i<this.n;i++){let a=this.pts[mod(i-2,this.n)],b=this.pts[mod(i+2,this.n)],p=this.pts[i];p.yaw=Math.atan2(b.x-a.x,b.z-a.z);let key=this.cell(p.x,p.z);if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(i)}
  for(let i=0;i<this.n;i++){let a=this.pts[mod(i-3,this.n)],b=this.pts[mod(i+3,this.n)];this.pts[i].k=angle(b.yaw-a.yaw)/(6*this.step)}
  // Properties of the segment beginning at each road sample.
  for(let i=0;i<this.n;i++){
   const a=this.pts[i],b=this.pts[(i+1)%this.n];
   a.yawStep=angle(b.yaw-a.yaw);a.dx=b.x-a.x;a.dz=b.z-a.z;a.lengthSq=a.dx*a.dx+a.dz*a.dz||1;
  }
  this.bounds={minX:Math.min(...this.pts.map(p=>p.x)),maxX:Math.max(...this.pts.map(p=>p.x)),minZ:Math.min(...this.pts.map(p=>p.z)),maxZ:Math.max(...this.pts.map(p=>p.z))};
  this.buildPace();
  const api={at:(s,l=0)=>this.at(s,l),pt:(s,l=0,h=0)=>{let p=this.at(s,l);return [p.x,p.y+h,p.z]},L,thwompHeight,
   roof:(a,b,c)=>this.solids.addRoof(a,b,c),
   solid:(x,y,z,shape)=>this.solids.add(x,y,z,shape),
   solidLocal:(p,yaw,lx,ly,lz,shape)=>{
    const c=Math.cos(yaw),s=Math.sin(yaw);
    return this.solids.add(p.x+lx*c+lz*s,p.y+ly,p.z+lz*c-lx*s,{...shape,yaw:yaw+(shape.yaw||0)});
   },
   add:(g,x=0,y=0,z=0,yaw=0,scale=1,radius=15,anim=null)=>{this.props.push({g,x,y,z,yaw,scale,r:radius,anim})}};
  const surfaceAt=def.build(api);this.surfaceAt=typeof surfaceAt==='function'?surfaceAt:null;
  this.solids.buildLanes(this);this.api=api;
  this.markers=new Geo();const w=this.width(0);
  for(let row=0;row<2;row++){let n=20;for(let j=0;j<n;j++){const l0=-w+(2*w)*j/n,l1=-w+(2*w)*(j+1)/n;const a=-.85+.7*row,b=a+.7;this.markers.quad(api.pt(a,l0,.075),api.pt(a,l1,.075),api.pt(b,l1,.075),api.pt(b,l0,.075),(j+row)%2?'#273446':'#fff6d7')}}
  for(let i=0;i<12;i++){let s=-3-1.95*i,l=i%2?1.95:-1.95;this.markers.quad(api.pt(s,l-1,.064),api.pt(s,l+1,.064),api.pt(s+.13,l+1,.064),api.pt(s+.13,l-1,.064),'#fff3c3')}
  let p=this.at(-12);this.props.push({g:this.markers,x:0,y:0,z:0,yaw:0,scale:1,r:50,center:p});
 }
 buildPace(){
  this.pace=venuePace[this.d.id]||{cruise:1,turn:1.32,brake:7.5};
  const n=Math.ceil(this.L/2),step=this.L/n,profile=new Float32Array(n);
  for(let i=0;i<n;i++){
   const s=i*step,width=this.width(s),span=clamp(width*.62,3,5.3);
   const short=Math.abs(angle(this.at(s+span).yaw-this.at(s-span).yaw))/(2*span);
   const broad=Math.abs(angle(this.at(s+2*span).yaw-this.at(s-2*span).yaw))/(4*span);
   const curvature=Math.max(short,broad*.9),usableRadius=1/Math.max(.001,curvature)+Math.min(2,width*.20);
   let corner=this.pace.turn*usableRadius;
   const f=s/this.L,snow=this.d.id==='summit',alpine=this.d.id==='wario'&&(f<.34||f>.45&&f<.765);
   if((snow||alpine)&&curvature>.023){
    const surface=(this.d.surfaces||[]).find(q=>f>=q.f0&&f<=q.f1);
    corner=Math.min(corner,Math.sqrt((snow?18.5:23)*(surface?.grip||1)*usableRadius));
   }
   profile[i]=clamp(corner,10.2,60);
  }
  // The lowest curvature limit also governs the preceding braking zone.
  // Two passes propagate smoothly across a closed course's start/finish seam.
  for(let k=2*n-1;k>=0;k--){const i=k%n,v=profile[(i+1)%n];profile[i]=Math.min(profile[i],Math.sqrt(v*v+2*this.pace.brake*step))}
  for(let k=0;k<2*n;k++){const i=k%n,v=profile[(i+n-1)%n];profile[i]=Math.min(profile[i],Math.sqrt(v*v+17*step))}
  this.paceStep=step;this.speedLine=profile;
 }
 paceAt(s){
  const t=mod(s,this.L)/this.paceStep,i=Math.floor(t)%this.speedLine.length;
  return mix(this.speedLine[i],this.speedLine[(i+1)%this.speedLine.length],t-Math.floor(t));
 }
 cell(x,z){return Math.floor(x/12)+','+Math.floor(z/12)}
 width(s){return this.d.width?this.d.width(mod(s,this.L)/this.L):this.d.half}
 curvature(s){
  const f=mod(s,this.L)/this.step,base=Math.floor(f),i=base%this.n;
  return mix(this.pts[i].k,this.pts[(i+1)%this.n].k,f-base);
 }
 elevation(s,l){
  const f=mod(s,this.L)/this.step,base=Math.floor(f),i=base%this.n,a=this.pts[i],b=this.pts[(i+1)%this.n],u=f-base;
  return mix(a.h,b.h,u)+l*Math.sin(mix(a.bank,b.bank,u));
 }
 at(s,l=0,p={}){
  const wrapped=mod(s,this.L),f=wrapped/this.step,i=Math.floor(f)%this.n,a=this.pts[i],b=this.pts[(i+1)%this.n],u=f-Math.floor(f);
  const yaw=a.yaw+u*a.yawStep,bank=mix(a.bank,b.bank,u),flat=l*Math.cos(bank);
  p.x=mix(a.x,b.x,u)+flat*Math.cos(yaw);p.y=mix(a.h,b.h,u)+l*Math.sin(bank);p.z=mix(a.z,b.z,u)-flat*Math.sin(yaw);
  p.yaw=yaw;p.bank=bank;p.k=mix(a.k,b.k,u);p.f=wrapped/this.L;
  if(this.surfaceAt){p.sampleX=p.x;p.sampleZ=p.z;p.l=l;p.s=s;p.w=undefined;p.surfaceReady=false}
  return p;
 }
 locate(x,z,hint,free=false,out){
  let near=-1,bd=Infinity,bu=0,bx=0,bz=0;const N=this.n,pts=this.pts,base=Math.floor(mod(hint,this.L)/this.step)%N;
  function consider(i){let a=pts[i],dx=a.dx,dz=a.dz,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/a.lengthSq,0,1),xx=a.x+u*dx,zz=a.z+u*dz,dist=(x-xx)**2+(z-zz)**2;if(dist<bd){near=i;bd=dist;bu=u;bx=xx;bz=zz}}
  let i=mod(base-5,N);for(let j=0;j<11;j++){consider(i);if(++i===N)i=0}
  if((bd>this.d.half*this.d.half*.82&&free)||Math.abs(mod(near-base+N/2,N)-N/2)>=5){let gx=Math.floor(x/12),gz=Math.floor(z/12);for(let xx=gx-1;xx<=gx+1;xx++)for(let zz=gz-1;zz<=gz+1;zz++){let cells=this.grid.get(xx+','+zz);if(cells)for(let i of cells){if(!free&&Math.abs(mod(i-base+N/2,N)-N/2)*this.step>16)continue;consider(i)}}}
  let ns=(near+bu)*this.step,s=hint+this.diff(ns,hint),p=this.at(s,0,out);let l=((x-bx)*Math.cos(p.yaw)-(z-bz)*Math.sin(p.yaw))/Math.max(.55,Math.cos(p.bank));p.s=s;p.l=l;p.y+=l*Math.sin(p.bank);p.w=this.width(s);
  // x/z remain the centreline reference used for track progress and recovery.
  // Surface sampling uses the actual queried world point, including wheel offsets.
  if(this.surfaceAt){p.sampleX=x;p.sampleZ=z}
  return p;
 }
 diff(a,b){return mod(a-b+this.L/2,this.L)-this.L/2}
 antiGravity(f){return this.d.antigravity===true||!!this.d.antiGravity?.(f)}
 edgeKind(f,side){return this.d.edgeKind?this.d.edgeKind(f,side,this.L):'runoff'}
 shoulder(f,side){return this.d.shoulder?this.d.shoulder(f,side):0}
 // A map may author all its floors or only a troublesome local region.
 // null is actual empty space. undefined delegates to the legacy road model.
 surface(p,maxY=Infinity){
  if(!this.surfaceAt)return undefined;
  if(p.surfaceReady&&p.surfaceCap===maxY)return p.surfaceY;
  const x=p.sampleX??p.x,z=p.sampleZ??p.z;
  if(!Number.isFinite(x)||!Number.isFinite(z))return undefined;
  if(p.w===undefined)p.w=this.width(p.s??p.f*this.L);
  const h=this.surfaceAt(x,z,p,maxY);
  p.surfaceY=h==null?h:h<=maxY+.000001?h:null;p.surfaceCap=maxY;p.surfaceReady=true;
  return p.surfaceY;
 }
 gap(p){
  const h=this.surfaceAt?this.surface(p):undefined;
  return h===undefined?this.roadGap(p):h===null;
 }
 roadGap(p){
  const side=Math.sign(p.l);
  if(Math.abs(p.l)>p.w+this.shoulder(p.f,side)&&this.edgeKind(p.f,side)==='void')return true;
  return (this.d.gaps||[]).some(g=>p.f>=g.f0&&p.f<g.f1&&p.l>g.l0&&p.l<g.l1)
 }
 lift(p){
  const h=this.surfaceAt?this.surface(p):undefined;
  return h==null?this.roadLift(p):h-p.y;
 }
 roadLift(p){
  if(this.d.offroadHeight&&Math.abs(p.l)>p.w)return this.d.offroadHeight(p.f,p.l);
  return this.d.surfaceLift?this.d.surfaceLift(p.f,p.l):0
 }
}
function angle(a){return Math.atan2(Math.sin(a),Math.cos(a))}
