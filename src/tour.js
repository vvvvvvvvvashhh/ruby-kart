// A closed Catmull–Rom centerline, subsequently resampled at equal distances by Circuit.
function tourSpline(knots,samplesPerSpan=12){
 const points=[],len=knots.length;
 for(let i=0;i<len;i++){
  const a=knots[(i+len-1)%len],b=knots[i],c=knots[(i+1)%len],d=knots[(i+2)%len];
  for(let j=0;j<samplesPerSpan;j++){const u=j/samplesPerSpan,v=u*u,w=v*u;
   points.push([0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*v+(-a[k]+3*b[k]-3*c[k]+d[k])*w)))}
 }
 return points;
}
// Blend the control spline locally so its inside driving edge never doubles back.
function softenTourBends(points,radius){
 const kernel=Array.from({length:radius*2+1},(_,i)=>(radius+1-Math.abs(i-radius))**1.3);
 const sum=kernel.reduce((a,b)=>a+b,0);
 return points.map((_,i)=>{
  let x=0,z=0;
  for(let j=0;j<kernel.length;j++){const p=points[mod(i+j-radius,points.length)];x+=p[0]*kernel[j];z+=p[1]*kernel[j]}
  return [x/sum,z/sum];
 });
}
// Limit an inside verge to the bend's radius. Beyond that, adjacent offset
// rows cross each other and the same patch of ground is drawn in both directions.
function tourVergeLimit(api){
 const n=Math.ceil(api.L/.75),step=api.L/n,bends=new Float64Array(n),sides=[new Float32Array(n),new Float32Array(n)];
 for(let i=0;i<n;i++)bends[i]=angle(api.at((i+.5)*step).yaw-api.at((i-.5)*step).yaw)/step;
 for(let i=0;i<n;i++)for(const side of [-1,1]){
  let k=0;
  for(let j=-2;j<=2;j++)k=Math.max(k,side*bends[mod(i+j,n)]);
  sides[side>0?1:0][i]=.90/Math.max(.009,k);
 }
 return (f,side)=>{
  const u=mod(f,1)*n,i=Math.floor(u),a=sides[side>0?1:0];return mix(a[i],a[(i+1)%n],u-i);
 };
}
function tourRoad(api,options){
 const {L,at}=api,n=Math.ceil(L/(options.tile||3.4)),gaps=options.gaps||[],deck=options.deck||'#4a4752';
 const cuts=[0,L,...gaps.flatMap(g=>[g.f0*L,g.f1*L])];for(let i=1;i<n;i++)cuts.push(L*i/n);cuts.sort((a,b)=>a-b);
 const half=s=>typeof options.width==='function'?options.width(mod(s,L)/L):options.half;
 for(let j=0;j<cuts.length-1;j+=10){
  const last=Math.min(cuts.length-1,j+10),start=cuts[j],end=cuts[last],o=at((start+end)/2),mesh=new Geo();
  function p(s,l,h){let q=at(s,l);return[q.x-o.x,q.y-o.y+h,q.z-o.z]}
  function strip(s,t,l0,l1,r0,r1,y,col,loadBearing=false){
   const face=[api.pt(s,l0,y),api.pt(s,l1,y),api.pt(t,r1,y),api.pt(t,r0,y)];
   if(loadBearing&&options.support)options.support.addFace(...face);
   for(const v of face){v[0]-=o.x;v[1]-=o.y;v[2]-=o.z}
   mesh.quad(...face,col);
  }
  for(let i=j;i<last;i++){
   let s=cuts[i],t=cuts[i+1];if(t-s<.002)continue;
   const a=half(s),b=half(t),f=(s+t)*.5/L,slot=Math.floor(f*n),gap=gaps.find(e=>f>=e.f0&&f<e.f1);
   const road=options.road?.[slot%2]||options.road?.[0]||'#777780';
   if(gap){strip(s,t,-a,gap.l0,-b,gap.l0,0,road,true);strip(s,t,gap.l1,a,gap.l1,b,0,road,true)}
   else strip(s,t,-a,a,-b,b,0,road,true);
   for(const side of [-1,1]){
    const x=side*a,z=side*b;strip(s,t,x,x+side*.45,z,z+side*.45,.016,options.curb?.[slot%2]||'#eadfd1',true);
    strip(s,t,x-side*.14,x,z-side*.14,z,.026,options.edge||'#eadaae');
    mesh.quad(p(s,x+side*.45,0),p(t,z+side*.45,0),p(t,z+side*.45,-1.2),p(s,x+side*.45,-1.2),deck);
   }
   if(options.dash&&slot%4===1&&(!gap||gap.l1<-.08||gap.l0>.08))strip(s,t,-.085,.085,-.085,.085,.029,options.line||'#f5e8bc');
  }
  api.add(mesh,o.x,o.y,o.z,0,1,end-start+options.half+3);
 }
 for(const pad of options.pads||[]){
  const s=pad.f*L,l=pad.l||0,w=pad.w||3.5,o=at(s,l),g=new Geo();g.mat=5;
  const p=(ds,dl,h)=>{const q=at(s+ds,l+dl);return[q.x-o.x,q.y-o.y+h,q.z-o.z]};
  g.quad(p(-2.4,-w/2,.06),p(-2.4,w/2,.06),p(1.8,w/2,.06),p(1.8,-w/2,.06),'#ec793f');
  for(const ds of [-1.4,-.18,.98])for(const side of [-1,1])g.quad(p(ds-.4,side*w*.46,.09),p(ds+.28,0,.09),p(ds+.7,0,.09),p(ds+.02,side*w*.46,.09),'#fff4a3');
  api.add(g,o.x,o.y,o.z,0,1,w+4);
 }
}
