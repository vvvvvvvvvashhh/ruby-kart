// Millimetre-scale moulded parts. A screen or a key anchor uses exactly the
// same local transform as its surrounding casting.
const CabinetMesh=(()=>{
 const identity=[1,0,0,0,1,0,0,0,1,0,0,0];
 const surfaces=['plastic','matte','satin','gloss','rubber','metal','glass','ink','emissive','candy','pearl','powder','rail','edgeCoat'];
 const norm=(a,b,c)=>{const n=Math.hypot(a,b,c)||1;return [a/n,b/n,c/n]};
 function vector(m,x,y,z){return [m[0]*x+m[3]*y+m[6]*z,m[1]*x+m[4]*y+m[7]*z,m[2]*x+m[5]*y+m[8]*z]}
 function point(m,x,y,z){const v=vector(m,x,y,z);return [v[0]+m[9],v[1]+m[10],v[2]+m[11]]}
 function frame(m,o){
  const a=o.rx||0,b=o.ry||0,c=o.rz||0,s=Math.sin,t=Math.cos;
  const axes=[[t(b)*t(c),t(b)*s(c),-s(b)],[s(a)*s(b)*t(c)-t(a)*s(c),s(a)*s(b)*s(c)+t(a)*t(c),s(a)*t(b)],[t(a)*s(b)*t(c)+s(a)*s(c),t(a)*s(b)*s(c)-s(a)*t(c),t(a)*t(b)*1]];
  return [...vector(m,...axes[0]),...vector(m,...axes[1]),...vector(m,...axes[2]),...point(m,o.x||0,o.y||0,o.z||0)];
 }
 const colors=new Map();function rgb(color){
  let v=colors.get(color);if(v)return v;
  let c=String(color||'#888').replace('#','');if(c.length===3)c=c.split('').map(s=>s+s).join('');
  const n=parseInt(c,16);v=[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];colors.set(color,v);return v;
 }
 const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 function ears(p){
  const ix=p.map((_,i)=>i),out=[];let guard=p.length*p.length;
  while(ix.length>3&&guard-->0){let found=false;
   for(let j=0;j<ix.length;j++){
    const a=ix[(j+ix.length-1)%ix.length],b=ix[j],c=ix[(j+1)%ix.length];
    if(area(p[a],p[b],p[c])<=1e-7)continue;
    let occupied=false;
    for(const k of ix)if(k!==a&&k!==b&&k!==c&&area(p[a],p[b],p[k])>1e-7&&area(p[b],p[c],p[k])>1e-7&&area(p[c],p[a],p[k])>1e-7){occupied=true;break}
    if(!occupied){out.push(a,b,c);ix.splice(j,1);found=true;break}
   }
   if(!found)break;
  }
  if(ix.length===3)out.push(...ix);return out;
 }
 class Builder{
  constructor(){
   this.m=identity;this.parts=new Map();this.active='body';this.panels={};this.keys={};this.presses={};
   this.bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
   this.atlas=document.createElement('canvas');this.atlas.width=1024;this.atlas.height=1024;this.pen=this.atlas.getContext('2d');this.glyphs=new Map();this.cursor=[0,0];
  }
  part(o,fn){const m=this.m;this.m=frame(m,o);try{fn()}finally{this.m=m}}
  key(id,fn){const old=this.active;this.active=id;
   this.presses[id]={axis:vector(this.m,0,0,1),right:vector(this.m,1,0,0),up:vector(this.m,0,1,0)};
   try{fn()}finally{this.active=old}
  }
  vertex(p,n,col,mat,uv){
   let group=this.parts.get(this.active);if(!group)this.parts.set(this.active,group=[]);
   const w=point(this.m,...p),N=vector(this.m,...n);
   for(let i=0;i<3;i++){this.bounds[i]=Math.min(this.bounds[i],w[i]);this.bounds[i+3]=Math.max(this.bounds[i+3],w[i])}
   group.push(...w,...N,...col,mat,uv?uv[0]:-1,uv?uv[1]:-1);
  }
  tri(a,b,c,na,nb,nc,color,mat){this.vertex(a,na,color,mat);this.vertex(b,nb,color,mat);this.vertex(c,nc,color,mat)}
  quad(a,b,c,d,na,nb,nc,nd,C,M){this.tri(a,b,c,na,nb,nc,C,M);this.tri(a,c,d,na,nc,nd,C,M)}
  sweep(x,y,z,outline,depth,bevel,color,finish='plastic',edgeFinish){
   let p=outline.filter((v,i,a)=>{let q=a[(i+a.length-1)%a.length];return Math.hypot(v[0]-q[0],v[1]-q[1])>1e-6});
   if(p.length<3||depth<=0)return;
   if(p.reduce((s,v,i)=>{const q=p[(i+1)%p.length];return s+v[0]*q[1]-q[0]*v[1]},0)<0)p=p.slice().reverse();
   const C=rgb(color),M=Math.max(0,surfaces.indexOf(finish)),n=p.length,edges=[],out=[],inner=[],b=Math.max(0,Math.min(bevel||0,depth*.495));
   for(let i=0;i<n;i++){const q=p[(i+1)%n],dx=q[0]-p[i][0],dy=q[1]-p[i][1],len=Math.hypot(dx,dy);edges.push([dy/len,-dx/len])}
   for(let i=0;i<n;i++){const a=edges[(i+n-1)%n],q=edges[i],sum=norm(a[0]+q[0],a[1]+q[1],0),mul=1/Math.max(.48,sum[0]*q[0]+sum[1]*q[1]);out.push(sum);inner.push([sum[0]*mul,sum[1]*mul])}
   const h=depth/2,rings=b>0?[[-h,b,-1,0],[-h+b*.30,b*.30,-.707,.707],[-h+b,0,0,1],[h-b,0,0,1],[h-b*.30,b*.30,.707,.707],[h,b,1,0]]:[[-h,0,0,1],[h,0,0,1]];
   const V=(i,r)=>[x+p[i][0]-r[1]*inner[i][0],y+p[i][1]-r[1]*inner[i][1],z+r[0]];
   const N=(i,r,edge)=>{const nn=out[i],e=edges[edge],smooth=nn[0]*e[0]+nn[1]*e[1]>.91?nn:e;return [smooth[0]*r[3],smooth[1]*r[3],r[2]]};
   const rim=edgeFinish?surfaces.indexOf(edgeFinish):M;
   for(let k=1;k<rings.length;k++){const a=rings[k-1],q=rings[k];for(let i=0;i<n;i++){const j=(i+1)%n;this.quad(V(i,a),V(j,a),V(j,q),V(i,q),N(i,a,i),N(j,a,i),N(j,q,i),N(i,q,i),C,rim)}}
   const cap=p.map((v,i)=>[v[0]-b*inner[i][0],v[1]-b*inner[i][1]]),is=ears(cap);
   for(let j=0;j<is.length;j+=3){const [i,k,l]=is.slice(j,j+3),a=rings[0],q=rings[rings.length-1];this.tri(V(i,q),V(k,q),V(l,q),[0,0,1],[0,0,1],[0,0,1],C,M);this.tri(V(l,a),V(k,a),V(i,a),[0,0,-1],[0,0,-1],[0,0,-1],C,M)}
  }
  // Ambient contact grows towards the socket and extends furthest opposite the key light.
  socketShadow(x,y,z,r,reach,color,finish){
   const base=rgb(color),m=surfaces.indexOf(finish),normal=[0,0,1],n=24;
   const ring=(i,t)=>{
    const a=i*2*Math.PI/n,cs=Math.cos(a),sn=Math.sin(a),span=reach*(1+.19*cs-.27*sn);
    const k=1-(1-t)*(.19+.045*cs-.065*sn);
    return [[x+(r+t*span)*cs,y+(r+t*span)*sn,z],base.map(c=>c*k)];
   };
   for(let i=0;i<n;i++){
    const a=ring(i,0),b=ring(i+1,0),c=ring(i+1,1),d=ring(i,1);
    for(const v of [a,d,c,a,c,b])this.vertex(v[0],normal,v[1],m);
   }
  }
  slab(x,y,z,w,h,d,r,b,c,m){
   const rad=Math.max(0,Math.min(r||0,w/2-.001,h/2-.001)),a=[];
   if(rad<.01)a.push([w/2,h/2],[-w/2,h/2],[-w/2,-h/2],[w/2,-h/2]);
   else for(let t=0;t<4;t++){const cx=(t===0||t===3?1:-1)*(w/2-rad),cy=(t<2?1:-1)*(h/2-rad),steps=Math.max(3,Math.min(10,Math.ceil(rad*1.3)));
    for(let j=0;j<=steps;j++){const an=(t+j/steps)*Math.PI/2;a.push([cx+rad*Math.cos(an),cy+rad*Math.sin(an)])}}
   this.sweep(x,y,z,a,d,b,c,m);
  }
  oval(x,y,z,rx,ry,d,c,m){const n=Math.min(36,Math.max(12,Math.ceil(Math.max(rx,ry)*3))),p=[];
   for(let j=0;j<n;j++){const a=j*Math.PI*2/n;p.push([rx*Math.cos(a),ry*Math.sin(a)])}
   this.sweep(x,y,z,p,d,Math.min(.32,rx*.14,ry*.14,d*.24),c,m)}
  lathe(x,y,z,profile,c,m='plastic',n=28,closed=true){
   const C=rgb(c),M=Math.max(0,surfaces.indexOf(m)),pr=profile;
   for(let k=1;k<pr.length;k++){const [r0,z0]=pr[k-1],[r1,z1]=pr[k],sl=norm(z1-z0,0,r0-r1);
    for(let j=0;j<n;j++){const a=j*2*Math.PI/n,b=(j+1)*2*Math.PI/n,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),na=[sl[0]*ca,sl[0]*sa,sl[2]],nb=[sl[0]*cb,sl[0]*sb,sl[2]];
     this.quad([x+r0*ca,y+r0*sa,z+z0],[x+r0*cb,y+r0*sb,z+z0],[x+r1*cb,y+r1*sb,z+z1],[x+r1*ca,y+r1*sa,z+z1],na,nb,nb,na,C,M);
     if(closed)for(const end of [0,pr.length-1])if((end===0&&k===1)||(end!==0&&k===pr.length-1)){const [r,h]=pr[end],normal=[0,0,end===0?-1:1];if(r>0)this.tri([x,y,z+h],[x+r*ca,y+r*sa,z+h],[x+r*cb,y+r*sb,z+h],normal,normal,normal,C,M)}
    }
   }
  }
  ball(x,y,z,rx,ry,rz,c,m='plastic'){
   const C=rgb(c),M=Math.max(0,surfaces.indexOf(m)),n=24,rows=12;for(let k=1;k<=rows;k++)for(let j=0;j<n;j++){
    const P=(i,l)=>{const a=i*2*Math.PI/n,b=l*Math.PI/rows-Math.PI/2,xx=Math.cos(b)*Math.cos(a),yy=Math.sin(b),zz=Math.cos(b)*Math.sin(a);return [[x+rx*xx,y+ry*yy,z+rz*zz],norm(xx/rx,yy/ry,zz/rz)]};
    const [a,na]=P(j,k-1),[b,nb]=P(j+1,k-1),[e,ne]=P(j+1,k),[d,nd]=P(j,k);
    this.quad(a,b,e,d,na,nb,ne,nd,C,M);
   }
  }
  line(x1,y1,z1,x2,y2,z2,r,c,m='plastic',n=12){
   const axis=norm(x2-x1,y2-y1,z2-z1),len=Math.hypot(x2-x1,y2-y1,z2-z1);if(len<1e-6)return;
   const ref=Math.abs(axis[1])<.8?[0,1,0]:[1,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],u=norm(...cross(axis,ref)),v=cross(axis,u),C=rgb(c),M=Math.max(0,surfaces.indexOf(m));
   for(let i=0;i<n;i++){const N=j=>u.map((p,k)=>p*Math.cos(j*2*Math.PI/n)+v[k]*Math.sin(j*2*Math.PI/n)),a=N(i),b=N(i+1),s=[x1,y1,z1],e=[x2,y2,z2],P=(pt,n)=>pt.map((q,k)=>q+r*n[k]);
    this.quad(P(s,a),P(s,b),P(e,b),P(e,a),a,b,b,a,C,M);const neg=axis.map(q=>-q);this.tri(s,P(s,b),P(s,a),neg,neg,neg,C,M);this.tri(e,P(e,a),P(e,b),axis,axis,axis,C,M)}
  }
  label(t,x,y,z,w,h,c='#fff',opt={}){
   if(!t||!w||!h)return;
   const text=String(t),key=text+'|'+w/h+'|'+(opt.font||'')+'|'+(opt.weight||''),height=42,width=Math.min(512,Math.max(14,Math.ceil(height*w/h)));
   let uv=this.glyphs.get(key);
   if(!uv){let [u,v]=this.cursor;if(u+width+4>1024){u=0;v+=48}if(v+46>1024)return;
    const p=this.pen;p.save();p.fillStyle='white';p.textAlign='center';p.textBaseline='alphabetic';
    p.font=opt.font||((opt.weight||'bold')+' 52px '+(opt.family||'Arial, sans-serif'));
    const metrics=p.measureText(text),top=metrics.actualBoundingBoxAscent||32,desc=metrics.actualBoundingBoxDescent||0;
    p.translate(u+2+width/2,v+2+height/2);p.scale((width-2)/Math.max(1,metrics.width),(height-2)/Math.max(1,top+desc));p.textBaseline='alphabetic';p.fillText(text,0,(top-desc)/2);p.restore();
    uv=[(u+2)/1024,(v+2)/1024,(u+2+width)/1024,(v+2+height)/1024];this.glyphs.set(key,uv);this.cursor=[u+width+4,v];
   }
   const q=[[x-w/2,y+h/2,z],[x+w/2,y+h/2,z],[x+w/2,y-h/2,z],[x-w/2,y-h/2,z]],uvs=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]],C=rgb(c);
   for(const i of [0,1,2,0,2,3])this.vertex(q[i],[0,0,1],C,7,uvs[i]);
  }
  anchor(x,y,z,w,h){
   return [[x-w/2,y+h/2,z],[x+w/2,y+h/2,z],[x+w/2,y-h/2,z],[x-w/2,y-h/2,z]].map(p=>point(this.m,...p))
  }
  screen(id,x,y,z,w,h){
   this.panels[id]=this.anchor(x,y,z,w,h);
   for(const i of [0,1,2,0,2,3]){const a=[[x-w/2,y+h/2,z],[x+w/2,y+h/2,z],[x+w/2,y-h/2,z],[x-w/2,y-h/2,z]][i];this.vertex(a,[0,0,1],[0,0,0],-1)}
  }
  control(id,x,y,z,w,h){this.keys[id]=this.anchor(x,y,z,w,h)}
  finish(){
   const data=[],groups=[];for(const [id,v] of this.parts){groups.push({id,start:data.length/12,count:v.length/12});for(let i=0;i<v.length;i++)data.push(v[i])}
   return {v:new Float32Array(data),groups,keys:this.keys,panels:this.panels,presses:this.presses,atlas:this.atlas,bounds:this.bounds};
  }
 }
 return {Builder};
})();
