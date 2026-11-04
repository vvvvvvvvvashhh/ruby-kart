// A depth-buffered software path for mobile WebViews that disable WebGL.
class SoftRaster{
 constructor(){this.tiles=new WeakMap();this.atlasVersion=-1;
  this.starSlots=[];this.starCount=0;
  this.clipInput=new Float64Array(15);this.clipOutput=new Float64Array(20);
  this.fxIn=new Float64Array(21);this.fxClip=new Float64Array(28);this.fxProject=new Float64Array(28);
 }
 // Keep shading corners separate from the silhouette's position weld: a hard
 // rim and the rubber beside it can occupy the same position with different normals.
 prepareActor(m,n,ind){
  const ids=new Int32Array(m.n);ids.fill(-1);
  const values=[],lookup=new Map(),words=new Uint32Array(n.buffer,n.byteOffset,n.length/4);
  for(let j=0;j<m.n;j+=3){
   const kind=m.d[j*9+8];
   if((kind!==0&&kind!==.25&&kind!==3&&kind!==4&&kind!==4.25)||n[j*4+3])continue;
   if(words[j]===words[j+1]&&words[j]===words[j+2]&&m.d[j*9+6]<0)continue;
   const group=kind===.25?5:kind===4.25?6:kind;
   for(let k=j;k<j+3;k++){
    const key=ind[k]*4294967296+group*16777216+(words[k]&0xffffff);
    let id=lookup.get(key);
    if(id===undefined){
     id=values.length/7;lookup.set(key,id);
     const h=k*4,i=k*9,inv=1/(Math.hypot(n[h],n[h+1],n[h+2])||1);
     values.push(n[h]*inv,n[h+1]*inv,n[h+2]*inv,m.d[i],m.d[i+1],m.d[i+2],kind);
    }
    ids[k]=id;
   }
  }
  const count=values.length/7;
  return {ids,points:new Float32Array(values),lit:new Float32Array(count*6),stamp:new Uint32Array(count),sunFraction:new Uint8Array(count),epoch:0};
 }
 lightCorner(s,id){
  if(s.stamp[id]===s.epoch)return;
  s.stamp[id]=s.epoch;
  const p=id*7,l=id*6,pt=s.points,lt=s.light,lum=s.lit;
  const nx=pt[p],ny=pt[p+1],nz=pt[p+2],kind=pt[p+6];
  let vx=s.eyeX-pt[p+3],vy=s.eyeY-pt[p+4],vz=s.eyeZ-pt[p+5];
  const inv=1/(Math.sqrt(vx*vx+vy*vy+vz*vz)||1);vx*=inv;vy*=inv;vz*=inv;
  const up=nx*s.yx+ny*s.yy+nz*s.yz,hemi=clamp(.5+up*.5,0,1),nd=Math.max(0,nx*s.lx+ny*s.ly+nz*s.lz);
  const hx=vx+s.lx,hy=vy+s.ly,hz=vz+s.lz;
  const nh=Math.max(0,(nx*hx+ny*hy+nz*hz)/(Math.sqrt(hx*hx+hy*hy+hz*hz)||1));
  const p2=nh*nh,p4=p2*p2,p8=p4*p4,p16=p8*p8,p32=p16*p16;
  for(let k=0;k<3;k++)lum[l+k]=Math.sqrt(lt.low[k]+(lt.high[k]-lt.low[k])*hemi+lt.direct[k]*nd);
  if(kind===.25||kind===4.25)s.sunFraction[id]=Math.round(255*(1-Math.sqrt(lt.low[1]+(lt.high[1]-lt.low[1])*hemi)/lum[l+1]));
  if(kind<.5){
   lum[l+3]=lum[l+4]=lum[l+5]=p16*p8*p4*.033;return;
  }
  const nv=clamp(nx*vx+ny*vy+nz*vz,0,1),metal=kind>=4;
  const ry=2*nv*up-(vx*s.yx+vy*s.yy+vz*s.yz);
  const facing=2*nv*(nx*s.lx+ny*s.ly+nz*s.lz)-(vx*s.lx+vy*s.ly+vz*s.lz);
  let shelf=clamp((.22-Math.abs(ry-(.25+.24*facing)))/.185,0,1);
  let band=clamp((.14-Math.abs(ry+.06-.10*facing))/.115,0,1),sky=clamp((ry+.12)/.87,0,1);
  shelf=shelf*shelf*(3-2*shelf)*(metal?.26:.09)-band*band*(3-2*band)*(metal?.084:.034);sky=sky*sky*(3-2*sky);
  const rim=1-nv,refl=(metal?.25:.052)+(metal?.31:.19)*rim*rim*rim*rim;
  const spec=metal?p32*p32*p16*p4*nh:p32*p16*p8;
  const glint=spec*(metal?.9:.55)+.105*p8*p4;
  for(let k=0;k<3;k++){
   lum[l+k]=lum[l+k]*(1-refl)+(metal?.32*glint:0);
   lum[l+3+k]=mix(lt.floor[k],lt.env[k],sky)*refl+lt.env[k]*shelf+glint*(metal?.68:k===0?1:k===1?.96:.87);
  }
 }
 actorTriangle(s,d,j,p,A,B,C,receiver,hitCount){
  const shade=this.actorShade||(this.actorShade=new Float64Array(18)),tex=d[j*9+6]>=0;
  for(let k=0;k<3;k++){
   const id=s.ids[j+k],i=(j+k)*9,l=id*6,o=k*6;this.lightCorner(s,id);
   for(let c=0;c<3;c++){
    const mul=s.lit[l+c]*d[i+3+c],add=s.lit[l+3+c]*255;
    shade[o+c]=tex?mul:mul*255+add;shade[o+c+3]=add;
   }
  }
  const x0=p[A+3],y0=p[A+4],dx1=p[B+3]-x0,dy1=p[B+4]-y0,dx2=p[C+3]-x0,dy2=p[C+4]-y0;
  const det=dx1*dy2-dy1*dx2;if(Math.abs(det)<.02)return;
  const ux=dy2/det,uy=-dx2/det,vx=-dy1/det,vy=dx1/det;
  const r0=shade[0],r1=shade[6]-r0,r2=shade[12]-r0;
  const g0=shade[1],g1=shade[7]-g0,g2=shade[13]-g0;
  const b0=shade[2],b1=shade[8]-b0,b2=shade[14]-b0;
  const rider=receiver&131072,sun0=rider?s.sunFraction[s.ids[j]]:0;
  const sun1=rider?s.sunFraction[s.ids[j+1]]-sun0:0,sun2=rider?s.sunFraction[s.ids[j+2]]-sun0:0,code=receiver&~(255<<18);
  const w=this.w,depth=this.z,color=this.pix,planes=this.receiver;
  // Small opaque triangles have already written depth and recorded their passing pixels.
  if(hitCount){
   for(let k=0;k<hitCount;k++){
    const idx=this.hitIndex[k],iy=Math.floor(idx/w),py=iy+.5-y0,px=idx-iy*w+.5-x0,u=px*ux+py*uy,v=px*vx+py*vy;
    planes[idx]=code|((sun0+sun1*u+sun2*v+.5)<<18);color[idx]=this.color(r0+r1*u+r2*v,g0+g1*u+g2*v,b0+b1*u+b2*v);
   }
   return;
  }
  const q0=p[A+5],q1=p[B+5],q2=p[C+5],atlas=this.tex,i=j*9;
  const u0=d[i+6]*q0,u1=d[i+15]*q1-u0,u2=d[i+24]*q2-u0;
  const t0=d[i+7]*q0,t1=d[i+16]*q1-t0,t2=d[i+25]*q2-t0;
  const xa=Math.max(0,Math.ceil(Math.min(x0,p[B+3],p[C+3])-.5)),xb=Math.min(w-1,Math.floor(Math.max(x0,p[B+3],p[C+3])-.5));
  const ya=Math.max(0,Math.ceil(Math.min(y0,p[B+4],p[C+4])-.5)),yb=Math.min(this.h-1,Math.floor(Math.max(y0,p[B+4],p[C+4])-.5));
  for(let y=ya;y<=yb;y++){
   let u=(xa+.5-x0)*ux+(y+.5-y0)*uy,v=(xa+.5-x0)*vx+(y+.5-y0)*vy;
   for(let x=xa,idx=y*w+x;x<=xb;x++,idx++,u+=ux,v+=vx){
    if(u<-.0001||v<-.0001||u+v>1.0001)continue;
    const q=q0+u*(q1-q0)+v*(q2-q0);if(q<depth[idx])continue;
    let red=r0+r1*u+r2*v,green=g0+g1*u+g2*v,blue=b0+b1*u+b2*v;
    if(tex){
     // Face paint, cloth marks and cap embroidery use the same linear
     // footprint as WebGL; four taps are paid only for visible actor texels.
     const tx=clamp(2048*(u0+u*u1+v*u2)/q-.5,0,2047),ty=clamp(1024*(t0+u*t1+v*t2)/q-.5,0,1023);
     const ix=tx|0,iy=ty|0,fx=tx-ix,fy=ty-iy,k=(ix+2048*iy)*4;
     const kr=ix<2047?k+4:k,kd=iy<1023?k+8192:k,ke=kd+(kr-k);
     const w0=(1-fx)*(1-fy),w1=fx*(1-fy),w2=(1-fx)*fy,w3=fx*fy;
     if(atlas[k+3]*w0+atlas[kr+3]*w1+atlas[kd+3]*w2+atlas[ke+3]*w3<90)continue;
     const a=1-u-v;
     red=red*(atlas[k]*w0+atlas[kr]*w1+atlas[kd]*w2+atlas[ke]*w3)+a*shade[3]+u*shade[9]+v*shade[15];
     green=green*(atlas[k+1]*w0+atlas[kr+1]*w1+atlas[kd+1]*w2+atlas[ke+1]*w3)+a*shade[4]+u*shade[10]+v*shade[16];
     blue=blue*(atlas[k+2]*w0+atlas[kr+2]*w1+atlas[kd+2]*w2+atlas[ke+2]*w3)+a*shade[5]+u*shade[11]+v*shade[17];
    }
    depth[idx]=q;planes[idx]=code|((sun0+sun1*u+sun2*v+.5)<<18);color[idx]=this.color(red,green,blue);
   }
  }
 }
 syncAtlas(){
  if(this.atlasVersion!==tags.size){this.tex=softwareAtlas(this.tex,this.atlasVersion);this.atlasVersion=tags.size}
 }
 prep(m){if(this.tiles.has(m))return this.tiles.get(m);
 if(this.atlasVersion>=0&&this.atlasVersion!==tags.size)this.syncAtlas();
 let d=m.d,vert=[],ind=new Uint32Array(m.n);
 // Use a numeric, collision-checked table for the same four-decimal weld grid.
 // Preserve the sign of a negative coordinate that rounds to zero, as toFixed does.
 const precision=v=>{const q=Math.floor(Math.abs(v)*10000+.5);return v<0?-1-q:q};
 let size=8;while(size<m.n*1.4)size*=2;
 const slots=new Int32Array(size),xs=new Int32Array(m.n),ys=new Int32Array(m.n),zs=new Int32Array(m.n);
 for(let i=0;i<m.n;i++){
  let j=i*9,x=d[j],y=d[j+1],z=d[j+2],qx=precision(x),qy=precision(y),qz=precision(z);
  let slot=(Math.imul(qx,73856093)^Math.imul(qy,19349663)^Math.imul(qz,83492791))&(size-1),n;
  while((n=slots[slot]-1)>=0&&(xs[n]!==qx||ys[n]!==qy||zs[n]!==qz))slot=(slot+1)&(size-1);
  if(n<0){n=vert.length/3;xs[n]=qx;ys[n]=qy;zs[n]=qz;slots[slot]=n+1;vert.push(x,y,z)}
  ind[i]=n;
 }
 const n=readyNormals(m),tri=new Float32Array(m.n/3*8);
 for(let i=0,j=0;i<m.n;i+=3,j+=8){let k=i*4,dx=n[k]+n[k+4]+n[k+8],dy=n[k+1]+n[k+5]+n[k+9],dz=n[k+2]+n[k+6]+n[k+10],inv=1/(Math.sqrt(dx*dx+dy*dy+dz*dz)||1);tri[j]=dx*inv;tri[j+1]=dy*inv;tri[j+2]=dz*inv;tri[j+3]=n[k+3];let ix=i*9;tri[j+4]=(d[ix+3]+d[ix+12]+d[ix+21])/3;tri[j+5]=(d[ix+4]+d[ix+13]+d[ix+22])/3;tri[j+6]=(d[ix+5]+d[ix+14]+d[ix+23])/3;tri[j+7]=d[ix+8]}
 // Bound contiguous face groups to avoid visiting entirely hidden details.
 const groupSize=96, groupCount=Math.ceil(m.n/groupSize),groups=new Float32Array(groupCount*6);
 const starts=new Uint32Array(groupCount+1),members=[],included=new Int32Array(vert.length/3).fill(-1);
 for(let i=0,k=0;i<m.n;i+=groupSize,k+=6){
  let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity;
  starts[i/groupSize]=members.length;
  for(let j=i;j<Math.min(m.n,i+groupSize);j++){
   const n=ind[j];if(included[n]===i)continue;included[n]=i;members.push(n);
   const base=n*3,x=vert[base],y=vert[base+1],z=vert[base+2];
   if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;
  }
  groups[k]=(x1+x0)*.5;groups[k+1]=(y1+y0)*.5;groups[k+2]=(z1+z0)*.5;
  groups[k+3]=(x1-x0)*.5+.001;groups[k+4]=(y1-y0)*.5+.001;groups[k+5]=(z1-z0)*.5+.001;
 }
 starts[groupCount]=members.length;
 let g={starts,members:new Uint32Array(members),projected:new Float64Array(vert.length/3),actor:m.smoothActor?this.prepareActor(m,n,ind):null,groupSize,groups,v:new Float32Array(vert),p:new Float32Array(vert.length/3*6),ind,tri,clip:new Uint8Array(vert.length/3)};this.tiles.set(m,g);return g}
 begin(r){
  this.waterView=r;this.waterReady=false;this.starCount=0;this.starResolved=false;this.shadowsApplied=false;this.actorResolved=false;let w=r.cv.width,h=r.cv.height;
  this.edgeLeft=w;this.edgeRight=-1;this.edgeTop=h;this.edgeBottom=-1;
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.img=r.ctx.createImageData(w,h);this.pix=new Uint32Array(this.img.data.buffer);this.z=new Float32Array(w*h);this.receiver=new Uint32Array(w*h);this.dither=new Uint8Array(w*h);
   for(let y=0,j=0;y<h;y++)for(let x=0;x<w;x++,j++)this.dither[j]=((x*7+y*11+(x^y))%11)<2?1:0;
   this.hitIndex=new Uint32Array(256)}
  const tileW=(w+7)>>3,tileH=(h+7)>>3;
  if(this.tileW!==tileW||this.tileH!==tileH){this.tileW=tileW;this.tileH=tileH;this.zFloor=new Float32Array(tileW*tileH);this.age=new Uint32Array(tileW*tileH)}
  this.epoch=1;this.faceCount=0;this.age.fill(0);
  this.z.fill(0);this.pix.fill(0);this.opacity=r.opacity;this.syncAtlas();
 }
 // A tile minimum is a conservative lower bound until the next frame: depth can only increase.
 hiddenTiles(x0,x1,y0,y1,q){
  let tx0=x0>>3,tx1=x1>>3,ty0=y0>>3,ty1=y1>>3;
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
   const i=tx+ty*this.tileW;
   if(this.age[i]!==this.epoch){
    let zMin=Infinity,lastY=Math.min(this.h,ty*8+8),lastX=Math.min(this.w,tx*8+8);
    for(let y=ty*8;y<lastY&&zMin;y++)for(let x=tx*8,j=y*this.w+x;x<lastX;x++,j++)zMin=Math.min(zMin,this.z[j]);
    this.age[i]=this.epoch;this.zFloor[i]=zMin;
   }
   if(this.zFloor[i]<=q)return false;
  }
  return true;
 }
 color(r,g,b){return(255<<24)|((Math.min(255,Math.max(0,b))|0)<<16)|((Math.min(255,Math.max(0,g))|0)<<8)|(Math.min(255,Math.max(0,r))|0)}
 draw(r,m,x,y,z,a,sc,lean,pitch){let d=m.d,g=this.prep(m),v=g.v,p=g.p,ind=g.ind,ca=Math.cos(a),sa=Math.sin(a),cr=Math.cos(lean),sr=Math.sin(lean),sp=Math.sin(pitch),cp=Math.cos(pitch),w=this.w,h=this.h,fac=h*.5*r.f;
 const clip=g.clip,near=.22, X=x-r.cam.x,Y=y-r.cam.y,Z=z-r.cam.z, worldY=X*r.s+Z*r.c,baseX=X*r.c-Z*r.s,baseY=Y*r.cp-worldY*r.sp,baseZ=worldY*r.cp+Y*r.sp;
 let star=null,starCode=0;
 if(r.starTint){
  let slot=0;while(slot<this.starCount&&this.starSlots[slot].tint!==r.starTint)slot++;
  if(slot===this.starCount){
   star=this.starSlots[slot]||(this.starSlots[slot]={});this.starCount++;
   star.tint=r.starTint;star.x0=w;star.y0=h;star.x1=star.y1=-1;
  }else star=this.starSlots[slot];
  starCode=(slot+1)<<26;
 }
 const actorTag=m.smoothActor&&baseZ>1&&baseZ<18?65536:0;
 const lt=r.light,tri=g.tri,haze=lt.haze,low=lt.low,high=lt.high,dir=lt.direct,sun=lt.sun;
 this.opacity=r.opacity;const hmR=high[0]-low[0],hmG=high[1]-low[1],hmB=high[2]-low[2];
 // Rotate world lighting into local space. The per-face path avoids large temporary vectors.
 const worldYx=cp*sr,worldYy=cp*cr,worldYz=sp;
 const m00=ca*cr+sa*sr*(-sp),m01=-ca*sr+sa*cr*(-sp),m02=sa*cp;
 const m20=-sa*cr+ca*sr*(-sp),m21=sa*sr+ca*cr*(-sp),m22=ca*cp;
 const lx=m00*sun[0]+worldYx*sun[1]+m20*sun[2],ly=m01*sun[0]+worldYy*sun[1]+m21*sun[2],lz=m02*sun[0]+worldYz*sun[1]+m22*sun[2];
 const localCamX=-(m00*X+worldYx*Y+m20*Z)/sc,localCamY=-(m01*X+worldYy*Y+m21*Z)/sc,localCamZ=-(m02*X+worldYz*Y+m22*Z)/sc;
 const bx0=(m00*r.c-m20*r.s)*sc,bx1=(m01*r.c-m21*r.s)*sc,bx2=(m02*r.c-m22*r.s)*sc;
 const fw0=(m00*r.s+m20*r.c)*sc,fw1=(m01*r.s+m21*r.c)*sc,fw2=(m02*r.s+m22*r.c)*sc;
 const by0=worldYx*sc*r.cp-fw0*r.sp,by1=worldYy*sc*r.cp-fw1*r.sp,by2=worldYz*sc*r.cp-fw2*r.sp;
 const bz0=fw0*r.cp+worldYx*sc*r.sp,bz1=fw1*r.cp+worldYy*sc*r.sp,bz2=fw2*r.cp+worldYz*sc*r.sp;
 // Cull each group before transforming its vertices. Shared corners have one
 // projection per draw, including when the same mesh is instanced by two karts.
 const stamp=g.drawStamp=(g.drawStamp||0)+1,seen=g.projected;
 if((this.faceCount+=m.n)>18000){this.epoch++;this.faceCount=0}
 const actor=g.actor;
 if(actor){
  actor.epoch++;actor.light=lt;actor.lx=lx;actor.ly=ly;actor.lz=lz;
  actor.yx=worldYx;actor.yy=worldYy;actor.yz=worldYz;actor.eyeX=localCamX;actor.eyeY=localCamY;actor.eyeZ=localCamZ;
 }
 const groups=g.groups;
 for(let start=0,k=0;start<ind.length;start+=g.groupSize,k+=6){
  const x=groups[k],y=groups[k+1],z=groups[k+2],hx=groups[k+3],hy=groups[k+4],hz=groups[k+5];
  const cz=baseZ+bz0*x+bz1*y+bz2*z, ez=hx*Math.abs(bz0)+hy*Math.abs(bz1)+hz*Math.abs(bz2);
  const zNear=cz-ez,zFar=cz+ez;
  if(zFar<near||zNear>720)continue;
  if(zNear>near){
   const cx=baseX+bx0*x+bx1*y+bx2*z,ex=hx*Math.abs(bx0)+hy*Math.abs(bx1)+hz*Math.abs(bx2);
   const cy=baseY+by0*x+by1*y+by2*z,ey=hx*Math.abs(by0)+hy*Math.abs(by1)+hz*Math.abs(by2);
   let left=cx-ex,right=cx+ex,bottom=cy-ey,top=cy+ey;
   let x0=Math.max(0,Math.ceil(w*.5-.501+fac*left/(left>0?zFar:zNear)));
   let x1=Math.min(w-1,Math.floor(w*.5-.499+fac*right/(right>0?zNear:zFar)));
   let y0=Math.max(0,Math.ceil(h*.5-.501-fac*top/(top>0?zNear:zFar)));
   let y1=Math.min(h-1,Math.floor(h*.5-.499-fac*bottom/(bottom>0?zFar:zNear)));
   if(x1<x0||y1<y0||this.hiddenTiles(x0,x1,y0,y1,(1.00001/zNear)))continue;
   if(star){star.x0=Math.min(star.x0,x0);star.y0=Math.min(star.y0,y0);star.x1=Math.max(star.x1,x1);star.y1=Math.max(star.y1,y1)}
   if(actorTag){this.edgeLeft=Math.min(this.edgeLeft,x0);this.edgeRight=Math.max(this.edgeRight,x1);this.edgeTop=Math.min(this.edgeTop,y0);this.edgeBottom=Math.max(this.edgeBottom,y1)}
  }else{
   if(star){star.x0=star.y0=0;star.x1=w-1;star.y1=h-1}
   if(actorTag){this.edgeLeft=this.edgeTop=0;this.edgeRight=w-1;this.edgeBottom=h-1}
  }
  const end=Math.min(ind.length,start+g.groupSize);
  for(let k=g.starts[start/g.groupSize],stop=g.starts[start/g.groupSize+1];k<stop;k++){
   const n=g.members[k];if(seen[n]===stamp)continue;seen[n]=stamp;
   const i=n*3,j=n*6,xx=v[i],yy=v[i+1],zz=v[i+2];
   const cx=baseX+bx0*xx+bx1*yy+bx2*zz,cy=baseY+by0*xx+by1*yy+by2*zz,cz=baseZ+bz0*xx+bz1*yy+bz2*zz,iz=1/cz;
   p[j]=cx;p[j+1]=cy;p[j+2]=cz;p[j+3]=w*.5+cx*fac*iz;p[j+4]=h*.5-cy*fac*iz;p[j+5]=iz;
   let code=p[j+2]<near?1:0;if(p[j+2]>720)code|=2;
   if(!(code&1)){if(p[j+3]<0)code|=4;else if(p[j+3]>w)code|=8;if(p[j+4]<0)code|=16;else if(p[j+4]>h)code|=32}
   clip[n]=code;
  }
  for(let j=start,ti=(start/3)*8;j<end;j+=3,ti+=8){let ia=ind[j],ib=ind[j+1],ic=ind[j+2],codeA=clip[ia],codeB=clip[ib],codeC=clip[ic];
 if(codeA&codeB&codeC)continue;
 const unclipped=((codeA|codeB|codeC)&1)===0,A=ia*6,B=ib*6,C=ic*6,i=j*9;
 const z0=p[A+2],z1=p[B+2],z2=p[C+2],dist=(z0+z1+z2)/3,material=tri[ti+7],rider=material===.25||material===4.25,fascia=material>=10&&material<12,kind=fascia?(material<11?4:2):rider?material-.25:material>=8&&material<9?8:material;
 let textured=d[i+6]>=0,glassDetail=0,glassChroma=1;
 let nx=tri[ti],ny=tri[ti+1],nz=tri[ti+2],vx=localCamX-v[ia*3],vy=localCamY-v[ia*3+1],vz=localCamZ-v[ia*3+2],nv=nx*vx+ny*vy+nz*vz;
 if(!tri[ti+3]&&nv < -.025*Math.max(1,dist/sc))continue;
 if(kind===8||fascia){
  const span=1.9*fac*Math.abs(nv)/((Math.sqrt(vx*vx+vy*vy+vz*vz)||1)*Math.max(1,dist));
  const d=clamp((span-6)/25,0,1),c=fascia?clamp((span-1.1)/4.7,0,1):clamp((span-.92)/3.48,0,1);
  glassDetail=d*d*(3-2*d);glassChroma=fascia?c*c*(3-2*c):.06+.94*c*c*(3-2*c);
  textured=textured&&glassDetail>0;
 }
 // Small opaque faces retain only covered, visible samples before paying for their shading.
 // The footprint cap also admits narrow details. Wide scanline triangles keep their original path.
 let hitCount=0;
 if(unclipped){
  // If there is no raster sample inside the projected bounding box, this triangle cannot affect the image.
  const x0=p[A+3],y0=p[A+4],x1=p[B+3],y1=p[B+4],x2=p[C+3],y2=p[C+4];
  let xa=Math.ceil(Math.min(x0,x1,x2)-.5),xb=Math.floor(Math.max(x0,x1,x2)-.5);
  let ya=Math.ceil(Math.min(y0,y1,y2)-.5),yb=Math.floor(Math.max(y0,y1,y2)-.5);
  if(xa>xb||ya>yb)continue;
  if((xb-xa+1)*(yb-ya+1)<=this.hitIndex.length&&(xb-xa<=15||yb-ya<=1)){
   const dx1=x1-x0,dy1=y1-y0,dx2=x2-x0,dy2=y2-y0,den=dx1*dy2-dy1*dx2;
   if(Math.abs(den)<.02)continue;
   const ux=dy2/den,uy=-dx2/den,vx=-dy1/den,vy=dx1/den;
   const xx=Math.max(0,xa),yy=Math.max(0,ya),endX=Math.min(w-1,xb),endY=Math.min(h-1,yb);
   const q0=p[A+5],dq1=p[B+5]-q0,dq2=p[C+5]-q0;
   const directWrite=!textured&&kind!==6&&kind!==7,depth=this.z,hit=this.hitIndex;
   const xSpan=endX-xx;let ua=(xx+.5-x0)*ux+(yy+.5-y0)*uy,va=(xx+.5-x0)*vx+(yy+.5-y0)*vy,visible=false;
   if(directWrite){
    // A convex face has one covered interval per row. Wide spans cost three
    // edge intersections instead of three inclusion checks for every pixel.
    if(xSpan>4){
     const invU=1/ux,invV=1/vx,sum=ux+vx,invSum=1/sum;
     for(let iy=yy;iy<=endY;iy++,ua+=uy,va+=vy){
      let lo=0,hi=xSpan;
      if(ux>0)lo=Math.max(lo,(-.0001-ua)*invU);else if(ux<0)hi=Math.min(hi,(-.0001-ua)*invU);else if(ua<-.0001)continue;
      if(vx>0)lo=Math.max(lo,(-.0001-va)*invV);else if(vx<0)hi=Math.min(hi,(-.0001-va)*invV);else if(va<-.0001)continue;
      if(sum>0)hi=Math.min(hi,(1.0001-ua-va)*invSum);else if(sum<0)lo=Math.max(lo,(1.0001-ua-va)*invSum);else if(ua+va>1.0001)continue;
      const start=Math.ceil(lo),end=Math.floor(hi),base=iy*w+xx;
      let u=ua+start*ux,v=va+start*vx;
      for(let idx=base+start,stop=base+end;idx<=stop;idx++,u+=ux,v+=vx){
       const q=q0+u*dq1+v*dq2;if(q<depth[idx])continue;
       depth[idx]=q;hit[hitCount++]=idx;
      }
     }
    }else{
     for(let iy=yy;iy<=endY;iy++,ua+=uy,va+=vy){
      let u=ua,v=va,idx=iy*w+xx,stop=idx+xSpan;
      for(;idx<=stop;idx++,u+=ux,v+=vx){
       if(u<-.0001||v<-.0001||u+v>1.0001)continue;
       const q=q0+u*dq1+v*dq2;if(q<depth[idx])continue;
       depth[idx]=q;hit[hitCount++]=idx;
      }
     }
    }
    visible=hitCount>0;
   }else{
    for(let iy=yy;iy<=endY&&!visible;iy++,ua+=uy,va+=vy){
     let u=ua,v=va,idx=iy*w+xx,stop=idx+xSpan;
     for(;idx<=stop;idx++,u+=ux,v+=vx)if(u>=-.0001&&v>=-.0001&&u+v<=1.0001&&q0+u*dq1+v*dq2>=depth[idx]){visible=true;break}
    }
   }
   if(!visible)continue;
  }
 }
 // Store the receiving plane where the winning opaque fragment wrote its depth.
 // Two signed gradient bytes avoid reconstructing slopes across object silhouettes.
 const facing=(nx*lx+ny*ly+nz*lz)/sun[1];
 const inv=-20/(facing<0?Math.min(facing,-.015):Math.max(facing,.015));
 const slopeX=Math.round(clamp((m00*nx+m01*ny+m02*nz)*inv,-125,125));
 const slopeZ=Math.round(clamp((m20*nx+m21*ny+m22*nz)*inv,-125,125));
 // Bit 16 tracks actor silhouettes; the remaining high bits carry the
 // incident sun fraction for rider pixels in the deferred shadow pass.
 let receiver=starCode|actorTag|(kind===2.125||kind>=4.5&&kind!==8&&kind!==9||!rider&&(Math.abs(slopeX)===125||Math.abs(slopeZ)===125)?0x8080:(slopeX&255)|((slopeZ&255)<<8));
 if(rider){
  receiver|=131072;
  if(!(actor&&unclipped&&dist<18&&actor.ids[j]>=0)){
   const side=tri[ti+3]&&nv<0?-1:1,up=side*(nx*worldYx+ny*worldYy+nz*worldYz),sky=low[1]+hmG*clamp(.5+.5*up,0,1);
   receiver|=Math.round(255*(1-Math.sqrt(sky/(sky+dir[1]*Math.max(0,side*facing*sun[1])))))<<18;
  }
 }
 this.receiverCode=receiver;
 if(actor&&unclipped&&dist<18&&actor.ids[j]>=0){
  this.actorTriangle(actor,d,j,p,A,B,C,receiver,hitCount);continue;
 }
 let t=clamp((dist-102)/498,0,1);t=t*t*(3-2*t)*.83;
 if(tri[ti+3]&&nv<0){nx=-nx;ny=-ny;nz=-nz;nv=-nv}
 let up=nx*worldYx+ny*worldYy+nz*worldYz,hemi=clamp(.5+up*.5,0,1),direct=Math.max(0,nx*lx+ny*ly+nz*lz);
 let R=tri[ti+4],G=tri[ti+5],Bl=tri[ti+6];
 if((kind===8||fascia)&&glassChroma<1){
   const phase=material-Math.floor(material),red=clamp(Math.abs(phase*6-3)-1,0,1),green=clamp(Math.abs(((phase+.6667)%1)*6-3)-1,0,1),blue=clamp(Math.abs(((phase+.3333)%1)*6-3)-1,0,1);
   const metal=fascia&&kind===4,k=fascia?(metal?.07:.13):.23;
   R=mix((fascia?(metal?.225:.37):.49)+k*red,R,glassChroma);
   G=mix((fascia?(metal?.243:.40):.525)+k*green,G,glassChroma);
   Bl=mix((fascia?(metal?.275:.44):.575)+k*blue,Bl,glassChroma);
  }
 if(kind===2||kind===2.125||kind===5||kind===8){
  const tile=kind!==5,b=tile?1.025+.055*hemi:1.04;R=R*b+(tile?.018:.045);G=G*b+(tile?.010:.032);Bl=Bl*b+(tile?.021:.024);
  if(kind===2.125){
   const span=1.472*fac*Math.abs(nv)/((Math.sqrt(vx*vx+vy*vy+vz*vz)||1)*Math.max(.22,dist));
   const detail=clamp((span-2)/8,0,1);
   this.boxDetail=detail*detail*(3-2*detail);
   this.boxInvAA=.5/clamp(.75/Math.max(span,1),.007,.16);
   this.boxR=tri[ti+4];this.boxG=tri[ti+5];this.boxB=tri[ti+6];this.boxLight=b;this.boxFog=t;
  }
  if(kind===8){
   this.glassScale=b*(1-t)*glassDetail;
   this.glassR=(R*(1-glassDetail)+.018*glassDetail)*(1-t)*255+haze[0]*t*255;
   this.glassG=(G*(1-glassDetail)+.010*glassDetail)*(1-t)*255+haze[1]*t*255;
   this.glassB=(Bl*(1-glassDetail)+.021*glassDetail)*(1-t)*255+haze[2]*t*255;
  }
 }else if(kind===7){
  nv=Math.abs(nv)/(Math.sqrt(vx*vx+vy*vy+vz*vz)||1);let v=.27+(1-nv)*(1-nv)*.64;R=mix(.09,.77,v);G=mix(.66,1,v);Bl=mix(.82,1,v);
 }else if(kind!==6){
  R*=Math.sqrt(low[0]+hmR*hemi+dir[0]*direct);G*=Math.sqrt(low[1]+hmG*hemi+dir[1]*direct);Bl*=Math.sqrt(low[2]+hmB*hemi+dir[2]*direct);
  if(kind===3||kind===4||kind===0&&dist<48){
   let inv=1/(Math.sqrt(vx*vx+vy*vy+vz*vz)||1);vx*=inv;vy*=inv;vz*=inv;nv=clamp(nv*inv,0,1);
   let hx=lx+vx,hy=ly+vy,hz=lz+vz,nh=Math.max(0,(hx*nx+hy*ny+hz*nz)/(Math.sqrt(hx*hx+hy*hy+hz*hz)||1));
   if(kind===0){
    const p2=nh*nh,p4=p2*p2,p8=p4*p4,spec=p8*p8*p8*p4*.033;
    R+=spec;G+=spec;Bl+=spec;
   }
   else {let metal=kind===4?1:0,ry=2*nv*up-(vx*worldYx+vy*worldYy+vz*worldYz);
    const facing=2*nv*(nx*lx+ny*ly+nz*lz)-(vx*lx+vy*ly+vz*lz);
    let shelf=clamp((.22-Math.abs(ry-(.25+.24*facing)))/.185,0,1),band=clamp((.14-Math.abs(ry+.06-.10*facing))/.115,0,1);
    shelf=shelf*shelf*(3-2*shelf)*(.09+.17*metal)-band*band*(3-2*band)*(.034+.05*metal);
    let h=clamp((ry+.12)/.87,0,1);h=h*h*(3-2*h);
    const rim=1-nv,rim2=rim*rim;let refl=(metal?.25:.052)+(.19+.12*metal)*rim2*rim2;
    const p2=nh*nh,p4=p2*p2,p8=p4*p4,p16=p8*p8,p32=p16*p16;
    const spec=metal?p32*p32*p16*p4*nh:p32*p16*p8;
    let glint=spec*(.55+.35*metal)+.105*p8*p4;
    let tint=lt.floor,e=lt.env;
    R=mix(R,mix(tint[0],e[0],h),refl)+e[0]*shelf+glint*(metal?tri[ti+4]*.32+.68:1);
    G=mix(G,mix(tint[1],e[1],h),refl)+e[1]*shelf+glint*(metal?tri[ti+5]*.32+.68:.96);
    Bl=mix(Bl,mix(tint[2],e[2],h),refl)+e[2]*shelf+glint*(metal?tri[ti+6]*.32+.68:.87);
   }
  }
 }
 if(kind===9)this.prepareWater(tri[ti+4],tri[ti+5],tri[ti+6]);
 const col=this.color(255*mix(R,haze[0],t),255*mix(G,haze[1],t),255*mix(Bl,haze[2],t));
 let grain=0;
 if(kind===1&&!textured&&dist<70){
  const footprint=.20*fac*Math.abs(nv)/((Math.sqrt(vx*vx+vy*vy+vz*vz)||1)*Math.max(1,dist));
  const resolved=clamp((footprint-.70)/1.65,0,1);
  grain=Math.round(2*resolved*resolved*(3-2*resolved))*0x010101;
 }
 const mode=kind===9?6:kind===6?3:kind===7?4:textured?(kind===2.125?7:kind===8?5:1):grain?2:0;
 if(grain)this.grainDelta=grain;
 if(hitCount){
  for(let h=0;h<hitCount;h++){const idx=this.hitIndex[h];this.receiver[idx]=receiver;this.pix[idx]=mode===6?this.waterPixel(idx%this.w,Math.floor(idx/this.w)):mode===2&&this.dither[idx]?(col-grain)>>>0:col}
  continue;
 }
 let u0=kind===6?d[i+3]:d[i+6],u1=kind===6?d[i+12]:d[i+15],u2=kind===6?d[i+21]:d[i+24];
 if(unclipped){this.triangle(p[A+3],p[A+4],p[A+5],p[B+3],p[B+4],p[B+5],p[C+3],p[C+4],p[C+5],col,mode,u0,d[i+7],u1,d[i+16],u2,d[i+25]);continue}
 this.clippedTriangle(p,A,B,C,fac,near,col,mode,u0,d[i+7],u1,d[i+16],u2,d[i+25]);
 }}}
 // Bilinear filtering inside each panel's guard texels matches GL at oblique angles.
 boxSample(tx,ty){
  const ix=tx|0,iy=ty|0,fx=tx-ix,fy=ty-iy,d=this.tex,k=(ix+iy*2048)*4;
  const a=(1-fx)*(1-fy),b=fx*(1-fy),c=(1-fx)*fy,e=fx*fy;
  let col=0;for(let n=0;n<3;n++)col|=Math.round(a*d[k+n]+b*d[k+n+4]+c*d[k+n+8192]+e*d[k+n+8196])<<(8*n);
  return col;
 }
 boxPixel(u,v){
  const mask=this.boxSample(u*2048-.5,v*1024-.5),detail=this.boxDetail;
  const sd=((mask&255)-128)/512,inv=this.boxInvAA;
  const rim=clamp(.5+(.025-sd)*inv,0,1)*detail*.64,ink=clamp(.5-sd*inv,0,1)*detail;
  const sheen=.07*((mask>>>8)&255)/255+.028*((mask>>>16)/255-.5)*detail;
  const h=this.waterView.light.haze,t=this.boxFog,l=this.boxLight*(1-t),paper=1-ink;
  const base=(1-rim)*paper,under=rim*paper;
  return this.color(255*((base*(this.boxR+sheen)+under*.275+ink*.99)*l+.018*(1-t)+h[0]*t),
   255*((base*(this.boxG+sheen)+under*.35+ink*.975)*l+.010*(1-t)+h[1]*t),
   255*((base*(this.boxB+sheen)+under*.46+ink*.90)*l+.021*(1-t)+h[2]*t));
 }
 // Flat water has the same reflection direction everywhere on a camera ray.
 // Evaluate its low-frequency sky lobe on an 8px grid once per view, interpolate
 // in integer arithmetic across the span, and shade only depth-winning water.
 prepareWater(red,green,blue){
  if(this.waterReady)return;
  this.waterReady=true;
  const r=this.waterView,step=8,cols=Math.ceil(this.w/step)+1,rows=Math.ceil(this.h/step)+1;
  const light=r.light,sun=light.sun,invF=2/(this.h*r.f);
  if(!this.waterLevels||this.waterLevels.length!==cols*rows){
   this.waterLevels=new Uint8Array(cols*rows);this.waterRowMix=new Uint16Array(cols);
  }
  this.waterCols=cols;this.waterLine=-1;
  if(!this.waterColors)this.waterColors=new Uint32Array(256);
  if(this.waterSkyR!==light.env[0]||this.waterSkyG!==light.env[1]||this.waterSkyB!==light.env[2]||this.waterRed!==red||this.waterGreen!==green||this.waterBlue!==blue){
   this.waterSkyR=light.env[0];this.waterSkyG=light.env[1];this.waterSkyB=light.env[2];this.waterRed=red;this.waterGreen=green;this.waterBlue=blue;
   const tint=[red*.94,green*.94,blue*.94];
   for(let i=0;i<256;i++){
    const level=i*1.4/255,f=Math.min(level,.72),glint=Math.max(0,level-.64);
    this.waterColors[i]=this.color(255*(mix(tint[0],light.env[0]*.84+.12,f)+glint*.81),
      255*(mix(tint[1],light.env[1]*.84+.12,f)+glint*.73),255*(mix(tint[2],light.env[2]*.84+.12,f)+glint*.52));
   }
  }
  for(let y=0,i=0;y<rows;y++){
   const dy=(this.h*.5-y*step-.5)*invF,forward=r.cp-dy*r.sp,up=-(r.sp+dy*r.cp);
   for(let x=0;x<cols;x++,i++){
    const dx=(x*step+.5-this.w*.5)*invF,inv=1/Math.sqrt(1+dx*dx+dy*dy);
    const fr=1-clamp(up*inv,0,1),a=Math.max(0,inv*((dx*r.c+forward*r.s)*sun[0]+up*sun[1]+(forward*r.c-dx*r.s)*sun[2]));
    const a2=a*a,a4=a2*a2,a8=a4*a4;
    this.waterLevels[i]=Math.round(clamp((.08+.59*fr*fr*fr+(.19+.51*fr)*a8*a8*a8)*255/1.4,0,255));
   }
  }
 }
 waterRow(y){
  if(this.waterLine===y)return;
  this.waterLine=y;const offset=(y>>3)*this.waterCols,f=y&7;
  for(let x=0;x<this.waterCols;x++)this.waterRowMix[x]=this.waterLevels[offset+x]*(8-f)+this.waterLevels[offset+x+this.waterCols]*f;
 }
 waterPixel(x,y){
  this.waterRow(y);const tile=x>>3,f=x&7;
  return this.waterColors[(this.waterRowMix[tile]*(8-f)+this.waterRowMix[tile+1]*f+32)>>6];
 }
 // Clip against the near plane in reusable camera-space storage. The order of the fan
 // and all interpolation operations match the unclipped surface's original winding.
 clippedTriangle(p,A,B,C,fac,near,color,mode,u0,v0,u1,v1,u2,v2){
  const input=this.clipInput,out=this.clipOutput;
  input[0]=p[A];input[1]=p[A+1];input[2]=p[A+2];input[3]=u0;input[4]=v0;
  input[5]=p[B];input[6]=p[B+1];input[7]=p[B+2];input[8]=u1;input[9]=v1;
  input[10]=p[C];input[11]=p[C+1];input[12]=p[C+2];input[13]=u2;input[14]=v2;
  let size=0;
  for(let i=0;i<15;i+=5){
   const next=i===10?0:i+5,z=input[i+2],z1=input[next+2];
   if(z>=near){for(let k=0;k<5;k++)out[size++]=input[i+k]}
   if((z>=near)!==(z1>=near)){
    const t=(near-z)/(z1-z);
    for(let k=0;k<5;k++)out[size++]=mix(input[i+k],input[next+k],t);
   }
  }
  for(let i=0;i<size;i+=5){
   const z=out[i+2];out[i]=this.w*.5+out[i]*fac/z;out[i+1]=this.h*.5-out[i+1]*fac/z;out[i+2]=1/z;
  }
  for(let i=5;i+5<size;i+=5)
   this.triangle(out[0],out[1],out[2],out[i],out[i+1],out[i+2],out[i+5],out[i+6],out[i+7],color,mode,out[3],out[4],out[i+3],out[i+4],out[i+8],out[i+9]);
 }
 triangle(x0,y0,q0,x1,y1,q1,x2,y2,q2,color,mode,u0,v0,u1,v1,u2,v2){let w=this.w,h=this.h,xa=Math.max(0,Math.ceil(Math.min(x0,x1,x2)-.5)),xb=Math.min(w-1,Math.floor(Math.max(x0,x1,x2)-.5)),ya=Math.max(0,Math.ceil(Math.min(y0,y1,y2)-.5)),yb=Math.min(h-1,Math.floor(Math.max(y0,y1,y2)-.5));if(xa>xb||ya>yb)return;
 let dx1=x1-x0,dy1=y1-y0,dx2=x2-x0,dy2=y2-y0,den=dx1*dy2-dy1*dx2;if(Math.abs(den)<.02)return;
 let ux=dy2/den,uy=-dx2/den,vx=-dy1/den,vy=dx1/den,ua=(xa+.5-x0)*ux+(ya+.5-y0)*uy,va=(xa+.5-x0)*vx+(ya+.5-y0)*vy,dq1=q1-q0,dq2=q2-q0,qp=this.z,px=this.pix,tex=this.tex,planes=this.receiver,receiver=this.receiverCode;
 const end=xb-xa,wide=end>8,uxInv=1/ux,vxInv=1/vx,sumSlope=ux+vx,sumInv=1/sumSlope;
 const zStep=ux*dq1+vx*dq2;
 for(let y=ya;y<=yb;y++,ua+=uy,va+=vy){
 let start=0,stop=end;
 if(wide){
  // Clip the three barycentric edges to a single covered interval. A horizontal
  // edge can exclude the whole row even when the other slopes are nonzero.
  if(ux>0)start=Math.max(start,(-.0001-ua)*uxInv);else if(ux<0)stop=Math.min(stop,(-.0001-ua)*uxInv);else if(ua<-.0001)continue;
  if(vx>0)start=Math.max(start,(-.0001-va)*vxInv);else if(vx<0)stop=Math.min(stop,(-.0001-va)*vxInv);else if(va<-.0001)continue;
  if(sumSlope>0)stop=Math.min(stop,(1.0001-ua-va)*sumInv);else if(sumSlope<0)start=Math.max(start,(1.0001-ua-va)*sumInv);else if(ua+va>1.0001)continue;
  start=Math.ceil(start);stop=Math.floor(stop);if(stop<start)continue;
 }
 let u=ua+start*ux,v=va+start*vx,idx=y*w+xa+start;
 if(mode===6){
  this.waterRow(y);const row=this.waterRowMix,palette=this.waterColors;
  for(let x=xa+start;x<=xa+stop;x++,idx++,u+=ux,v+=vx){
   if(u<-.0001||v<-.0001||u+v>1.0001)continue;
   const q=q0+u*dq1+v*dq2;if(q<qp[idx])continue;
   const tile=x>>3,f=x&7;qp[idx]=q;planes[idx]=receiver;px[idx]=palette[(row[tile]*(8-f)+row[tile+1]*f+32)>>6];
  }
  continue;
 }
 if(mode===0||mode===2){
  const shaded=(color-(this.grainDelta||0))>>>0,dither=this.dither;
  if(wide){
   let q=q0+u*dq1+v*dq2;const end=idx+stop-start;
   if(mode===0){
    for(;idx<=end;idx++,q+=zStep)if(q>=qp[idx]){qp[idx]=q;planes[idx]=receiver;px[idx]=color}
   }else{
    for(;idx<=end;idx++,q+=zStep)if(q>=qp[idx]){qp[idx]=q;planes[idx]=receiver;px[idx]=dither[idx]?shaded:color}
   }
  }else{
   for(let xx=start;xx<=stop;xx++,idx++,u+=ux,v+=vx){
    if(u<-.0001||v<-.0001||u+v>1.0001)continue;
    const q=q0+u*dq1+v*dq2;if(q<qp[idx])continue;qp[idx]=q;planes[idx]=receiver;px[idx]=mode===2&&dither[idx]?shaded:color;
   }
  }
  continue;
 }
 for(let x=xa+start;x<=xa+stop;x++,idx++,u+=ux,v+=vx){if(u<-.0001||v<-.0001||u+v>1.0001)continue;let q=q0+u*dq1+v*dq2;if(q<qp[idx])continue;let out=color;
 if(mode===3){
  if(!px[idx])continue;let a=clamp(((1-u-v)*u0+u*u1+v*u2)*this.opacity,0,1),from=px[idx],r=from&255,g=from>>>8&255,b=from>>>16&255;
  px[idx]=this.color(r+(9-r)*a,g+(6-g)*a,b+(16-b)*a);continue
 }
 if(mode===4&&(x+(h-y-1))%3<2)continue;
 if(mode===7){
  const a=1-u-v;out=this.boxPixel((a*u0*q0+u*u1*q1+v*u2*q2)/q,(a*v0*q0+u*v1*q1+v*v2*q2)/q);
 }
 if(mode===1||mode===5){let a=1-u-v,tx=clamp((2048*(a*u0*q0+u*u1*q1+v*u2*q2)/q)|0,0,2047),ty=clamp((1024*(a*v0*q0+u*v1*q1+v*v2*q2)/q)|0,0,1023),k=(tx+ty*2048)*4;if(mode===5){const s=this.glassScale;out=this.color(this.glassR+s*tex[k],this.glassG+s*tex[k+1],this.glassB+s*tex[k+2])}
 else{if(tex[k+3]<90)continue;out=this.color(tex[k],tex[k+1],tex[k+2])}}
 qp[idx]=q;planes[idx]=receiver;px[idx]=out}}}
 // Estimate the subpixel contour from its visible coverage on each side.
 // The mask is the final z-winning object, so a roadside barrier can cut in
 // front of the kart. Paint, eyes and interior shadows never enter this pass.
 resolveStars(){
  if(this.starResolved||!this.starCount)return;this.starResolved=true;
  const px=this.pix,planes=this.receiver,w=this.w;
  for(let slot=0;slot<this.starCount;slot++){
   const box=this.starSlots[slot],t=box.tint,k=(t>>>24)/255,base=1-.57*k;
   const R=(t>>>16&255)*k,G=(t>>>8&255)*k,B=(t&255)*k;
   for(let y=box.y0;y<=box.y1;y++)for(let i=y*w+box.x0,end=y*w+box.x1;i<=end;i++){
    if(planes[i]>>>26!==slot+1||!this.z[i])continue;
    const c=px[i],r=c&255,g=c>>>8&255,b=c>>>16&255,shine=.28+.72/255*(.22*r+.64*g+.14*b);
    px[i]=this.color(base*r+R*shine,base*g+G*shine,base*b+B*shine);
   }
  }
 }
 resolveActorEdges(){
  this.resolveStars();
  if(this.actorResolved||this.edgeLeft>this.edgeRight)return;
  this.actorResolved=true;
  const w=this.w,h=this.h,px=this.pix,z=this.z,planes=this.receiver;
  const l=Math.max(0,this.edgeLeft-3),r=Math.min(w-1,this.edgeRight+3),t=Math.max(0,this.edgeTop-3),b=Math.min(h-1,this.edgeBottom+3);
  if(!this.edgeMask||this.edgeMask.length!==w*h)this.edgeMask=new Uint8Array(w*h);
  const mask=this.edgeMask;
  for(let y=t;y<=b;y++)for(let i=y*w+l,end=y*w+r;i<=end;i++)mask[i]=z[i]&&planes[i]&65536?1:0;
  if(!this.edgeChanges)this.edgeChanges=new Uint32Array(2048);
  let changes=this.edgeChanges,count=0;
  for(let y=Math.max(2,t+2);y<=Math.min(h-3,b-2);y++)for(let i=y*w+Math.max(2,l+2),end=y*w+Math.min(w-3,r-2);i<=end;i++){
   const inside=mask[i];
   if(mask[i-1]===inside&&mask[i+1]===inside&&mask[i-w]===inside&&mask[i+w]===inside)continue;
   let nx=0,ny=0;
   for(let oy=-2;oy<=2;oy++){
    const row=i+oy*w;
    const a=mask[row-2],c=mask[row-1],d=mask[row+1],e=mask[row+2];
    nx+=(2*(e-a)+d-c)*(3-Math.abs(oy));
    ny+=oy*(a+2*c+3*mask[row]+2*d+e);
   }
   const major=Math.max(Math.abs(nx),Math.abs(ny));if(!major)continue;
   let lo=Infinity,hi=-Infinity;
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const v=nx*ox+ny*oy;if(mask[i+oy*w+ox])lo=Math.min(lo,v);else hi=Math.max(hi,v);
   }
   if(lo<=hi)continue;
   const minor=Math.min(Math.abs(nx),Math.abs(ny)),dist=Math.abs(lo+hi)*.5;
   const tip=(major+minor)*.5-dist;
   if(tip<=0)continue;
   // Exact area of a unit pixel on the other side of the fitted line.
   const coverage=dist<=(major-minor)*.5?.5-dist/major:tip*tip/(2*major*minor);
   if(coverage<.014)continue;
   const sign=inside?-1:1,ix=i+(nx*sign>0?1:-1),iy=i+(ny*sign>0?w:-w);
   const wx=mask[ix]!==inside?Math.abs(nx):0,wy=mask[iy]!==inside?Math.abs(ny):0;
   if(!(wx+wy))continue;
   const src=px[i],cx=px[ix],cy=px[iy],mix=coverage/(wx+wy);
   const a=(src>>>24)*(1-coverage),ax=(cx>>>24)*wx*mix,ay=(cy>>>24)*wy*mix,alpha=a+ax+ay;
   if(!alpha)continue;
   const red=Math.round(((src&255)*a+(cx&255)*ax+(cy&255)*ay)/alpha);
   const green=Math.round(((src>>>8&255)*a+(cx>>>8&255)*ax+(cy>>>8&255)*ay)/alpha);
   const blue=Math.round(((src>>>16&255)*a+(cx>>>16&255)*ax+(cy>>>16&255)*ay)/alpha);
   if(count===changes.length){this.edgeChanges=new Uint32Array(count*2);this.edgeChanges.set(changes);changes=this.edgeChanges}
   changes[count++]=i;changes[count++]=Math.round(alpha)<<24|blue<<16|green<<8|red;
  }
  // Read all neighbours from the same image, then apply the sparse changes.
  for(let j=0;j<count;j+=2)px[changes[j]]=changes[j+1];
 }
 end(r){
  if(!this.shadowsApplied)shadeSoftWorld(this,r,r.shadowPacket||((typeof WorldShadows!=='undefined')?WorldShadows.softwareData(r):null));
  this.resolveActorEdges();r.ctx.putImageData(this.img,0,0)
 }
}

// Translucent race geometry shares the opaque depth buffer. Clip triangles before
// projection and keep their depth read-only so sorted smoke layers accumulate.
function softFXPass(raster,r,d,n){
 if(!n)return;
 const w=raster.w,h=raster.h,pix=raster.pix,zbuf=raster.z,focus=h*.5*r.f,near=.22;
 const a=raster.fxIn;
 const poly=raster.fxClip;
 const projected=raster.fxProject;
 function face(i,j,k){
  const p=projected;let ax=p[i],ay=p[i+1],bx=p[j],by=p[j+1],cx=p[k],cy=p[k+1];
  let area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.0001)return;
  if(area<0){const tmp=j;j=k;k=tmp;bx=p[j];by=p[j+1];cx=p[k];cy=p[k+1];area=-area}
  const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5)),x1=Math.min(w-1,Math.floor(Math.max(ax,bx,cx)-.5));
  const y0=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5)),y1=Math.min(h-1,Math.floor(Math.max(ay,by,cy)-.5));
  const dx1=cx-bx,dy1=cy-by,dx2=ax-cx,dy2=ay-cy,dx3=bx-ax,dy3=by-ay;
  const edge1=dy1<0||(dy1===0&&dx1>0),edge2=dy2<0||(dy2===0&&dx2>0),edge3=dy3<0||(dy3===0&&dx3>0);
  if(x1<x0||y1<y0)return;
  const wide=x1-x0>8,inv1=1/dy1,inv2=1/dy2,inv3=1/dy3;
  const aq=p[i+2]/area,bq=p[j+2]/area,cq=p[k+2]/area;
  for(let y=y0;y<=y1;y++){
   let u=dx1*(y+.5-by)-dy1*(x0+.5-bx),v=dx2*(y+.5-cy)-dy2*(x0+.5-cx),l=dx3*(y+.5-ay)-dy3*(x0+.5-ax);
   let x=x0,end=x1;
   if(wide){
    // The interval is conservative. The original half-open edge test at each
    // end keeps shared translucent edges and near-plane clipped fans seamless.
    let lo=0,hi=x1-x0;
    if(dy1<0)lo=Math.max(lo,u*inv1);else if(dy1>0)hi=Math.min(hi,u*inv1);else if(u<0||!u&&!edge1)continue;
    if(dy2<0)lo=Math.max(lo,v*inv2);else if(dy2>0)hi=Math.min(hi,v*inv2);else if(v<0||!v&&!edge2)continue;
    if(dy3<0)lo=Math.max(lo,l*inv3);else if(dy3>0)hi=Math.min(hi,l*inv3);else if(l<0||!l&&!edge3)continue;
    const skip=Math.max(0,Math.floor(lo)-1);end=x0+Math.min(x1-x0,Math.ceil(hi)+1);
    if(x+skip>end)continue;
    // Match repeated edge increments at exactly shared pixel centres, even
    // for two clipped polygons that meet at a very shallow angle.
    x+=skip;for(let n=0;n<skip;n++){u-=dy1;v-=dy2;l-=dy3}
   }
   while(x<=end&&(u<0||v<0||l<0||(!u&&!edge1)||(!v&&!edge2)||(!l&&!edge3))){x++;u-=dy1;v-=dy2;l-=dy3}
   for(let idx=y*w+x;x<=end;x++,idx++,u-=dy1,v-=dy2,l-=dy3){
    if(u<0||v<0||l<0||(!u&&!edge1)||(!v&&!edge2)||(!l&&!edge3))break;
    const A=u*aq,B=v*bq,C=l*cq,q=A+B+C;if(q<zbuf[idx])continue;
    const alpha=Math.min(1,(A*p[i+6]+B*p[j+6]+C*p[k+6])/q);if(alpha<=.002)continue;
    const back=pix[idx],keep=(back>>>24)/255*(1-alpha),out=alpha+keep,src=alpha*255/(q*out),dst=keep/out;
    const red=Math.round((A*p[i+3]+B*p[j+3]+C*p[k+3])*src+(back&255)*dst);
    const green=Math.round((A*p[i+4]+B*p[j+4]+C*p[k+4])*src+(back>>>8&255)*dst);
    const blue=Math.round((A*p[i+5]+B*p[j+5]+C*p[k+5])*src+(back>>>16&255)*dst);
    pix[idx]=(Math.round(255*out)<<24)|(Math.min(255,blue)<<16)|(Math.min(255,green)<<8)|Math.min(255,red);
   }
  }
 }
 for(let faceStart=0;faceStart<n*9;faceStart+=27){
  let visible=0;
  for(let b=0;b<3;b++){
   const src=faceStart+b*9,i=b*7,x=d[src]-r.cam.x,y=d[src+1]-r.cam.y,z=d[src+2]-r.cam.z,forward=x*r.s+z*r.c;
   a[i]=x*r.c-z*r.s;a[i+1]=y*r.cp-forward*r.sp;a[i+2]=forward*r.cp+y*r.sp;
   a[i+3]=d[src+3];a[i+4]=d[src+4];a[i+5]=d[src+5];a[i+6]=d[src+7];if(a[i+2]>=near)visible++;
  }
  if(!visible)continue;let vertices=3,p=a;
  if(visible<3){
   vertices=0;p=poly;
   for(let b=0,last=14;b<21;last=b,b+=7){
    const za=a[last+2],zb=a[b+2];
    if((za>=near)!==(zb>=near)){const t=(near-za)/(zb-za),s=vertices++*7;for(let f=0;f<7;f++)p[s+f]=a[last+f]+(a[b+f]-a[last+f])*t}
    if(zb>=near){const s=vertices++*7;for(let f=0;f<7;f++)p[s+f]=a[b+f]}
   }
  }
  for(let b=0;b<vertices*7;b+=7){const inv=1/p[b+2];projected[b]=w*.5+p[b]*focus*inv;projected[b+1]=h*.5-p[b+1]*focus*inv;projected[b+2]=inv;for(let f=3;f<7;f++)projected[b+f]=p[b+f]}
  face(0,7,14);if(vertices===4)face(0,14,21);
 }
}
SoftRaster.prototype.drawFX=function(r,b){
 shadeSoftWorld(this,r,WorldShadows.softwareData(r));this.shadowsApplied=true;this.resolveActorEdges();
 softFXPass(this,r,b.d,b.n);
};
function changedAtlas(previous,current){
 const rows=[];
 for(let i=Math.max(0,previous,current-128);i<current;){
  const cell=i%128,col=cell%8,cells=Math.min(8-col,current-i),x=col*256,y=(cell>>3)*64,w=cells*256;
  rows.push({x,y,w,data:ac.getImageData(x,y,w,64).data});i+=cells;
 }
 return rows;
}
function applyAtlas(rows,dest){
 for(const row of rows){const bytes=row.w*4;
  for(let y=0;y<64;y++)dest.set(row.data.subarray(y*bytes,(y+1)*bytes),((row.y+y)*2048+row.x)*4);
 }
}
function softwareAtlas(previous,version){
 const tex=previous||new Uint8ClampedArray(2048*1024*4);
 applyAtlas(changedAtlas(version,tags.size),tex);return tex;
}
function rasterWorkerMain(){
 const meshes=new Map(),raster=new SoftRaster();let staticLight=null,detailLight=null,liveLight=null,farLight=null,focusLight=null;const stampSlots=Array(64).fill(null),stampIndex=new Uint8Array(128*128*4);let stampSet=null;
 const cv=new OffscreenCanvas(1,1),ctx=cv.getContext('2d',{alpha:true});
 self.onmessage=({data})=>{
  if(data.release!==undefined){meshes.delete(data.release);return}
  if(data.warm){for(const m of data.warm){meshes.set(m.id,m);raster.prep(m)}self.postMessage({warm:true});return}
  if(data.revision!==tags.size){applyAtlas(data.rows,atlasPixels);tags.size=data.revision}
  for(const m of data.meshes)meshes.set(m.id,m);
  const r=data.view;r.cv=cv;r.ctx=ctx;
  if(cv.width!==r.w||cv.height!==r.h){cv.width=r.w;cv.height=r.h}
  raster.begin(r);const c=data.commands;
  let nextStar=0;const stars=data.stars||[];
  for(let j=0;j<data.count;j+=9){
   if(j===stars[nextStar]){r.starTint=stars[nextStar+1];nextStar+=2}
   r.opacity=c[j+8];raster.draw(r,meshes.get(c[j]),c[j+1],c[j+2],c[j+3],c[j+4],c[j+5],c[j+6],c[j+7])}
  if(data.shadows){
   if(data.shadows.stat!==undefined)staticLight=data.shadows.stat;
   if(data.shadows.detail!==undefined)detailLight=data.shadows.detail;
   if(data.shadows.detailPatch&&detailLight)rubyPlaceDetail(detailLight,data.shadows.detailPatch);
   if(data.shadows.live)liveLight=data.shadows.live;
   if(data.shadows.far!==undefined)farLight=data.shadows.far;
   if(data.shadows.focus!==undefined)focusLight=data.shadows.focus;
   stampSet=null;
   if(data.shadows.stamps){
    const packet=data.shadows.stamps,fields=Array(64).fill(null);
    for(const f of packet.fields){if(f.data)stampSlots[f.slot]=f.data;else f.data=stampSlots[f.slot];fields[f.slot]=f}
    stampSet={x:packet.x,z:packet.z,fields,index:stampIndex};rubyStampBins(stampIndex,stampSet);
   }
   const patch=data.shadows.farPatch;
   if(patch&&farLight){
    const [x,y,w,h]=patch.rect;
    if(!farLight.previous)farLight.previous=new Uint16Array(farLight.data.length);
    for(let j=0;j<h;j++){
     const start=(y+j)*farLight.size+x;
     farLight.previous.set(farLight.data.subarray(start,start+w),start);
     farLight.data.set(patch.data.subarray(j*w,(j+1)*w),start);
    }
    farLight.version=patch.version;farLight.dirty=patch.dirty;
   }
   r.shadowPacket={scene:staticLight,detail:detailLight,farMix:data.shadows.farMix,staticMix:data.shadows.staticMix,local:liveLight,distant:farLight,focus:focusLight,stamps:stampSet,sx:liveLight.sx,sz:liveLight.sz};
   shadeSoftWorld(raster,r,r.shadowPacket);
  }
  raster.shadowsApplied=true;raster.resolveActorEdges();
  if(data.fxCount)softFXPass(raster,r,data.fx,data.fxCount);
  raster.end(r);const bitmap=cv.transferToImageBitmap();
  const transfers=[bitmap,c.buffer];if(data.fx)transfers.push(data.fx.buffer);
  self.postMessage({bitmap,commands:c,fx:data.fx},transfers);
 };
}
class WorkerRaster{
 constructor(owner){
  const source='const clamp='+clamp+',mix='+mix+';const readyNormals=m=>m.norm8;'+
   'const atlas={width:2048,height:1024},tags={size:-1};const atlasPixels=new Uint8ClampedArray(2048*1024*4),softwareAtlas=()=>atlasPixels;\n'+
   rubyPlaceDetail.toString()+'\n'+rubyStampBins.toString()+'\n'+rubyStampSample.toString()+'\n'+rubyStampMask.toString()+'\n'+shadeSoftWorld.toString()+'\n'+SoftRaster.toString()+'\n'+softFXPass.toString()+'\n'+applyAtlas.toString()+'\n('+rasterWorkerMain.toString()+')();';
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  try{this.worker=new Worker(url)}finally{URL.revokeObjectURL(url)}
  this.ids=new WeakMap();this.sequence=0;this.revision=-1;this.busy=false;this.warming=false;
  this.worker.onerror=e=>{e.preventDefault();this.fallback(owner)};
  this.worker.onmessage=({data})=>{
   if(data.warm){this.warming=false;const fn=this.afterWarm;this.afterWarm=null;if(fn)fn();return}
   if(owner.cpu!==this){data.bitmap.close();return}
   const job={bitmap:data.bitmap,at:performance.now(),sampleAt:this.sampleAt,valid:this.valid,layers:this.onpresent};
   if(!this.ready)this.ready=job;
   else if(this.lockPresent){
    if(this.following){this.ready.bitmap.close();this.ready=this.following}
    this.following=job;
   }else{
    this.ready.bitmap.close();if(this.following)this.following.bitmap.close();
    this.following=null;this.ready=job;
   }
   this.valid=null;this.onpresent=null;this.commands=data.commands;if(data.fx)this.fx=data.fx;
   this.busy=false;if(this.onready)this.onready();
  };
 }
 present(owner,cutoff=-Infinity){
  // Preserve consecutive completed jobs on high-refresh panels, newest frame
  // elsewhere. Never let an old course, resized bitmap or stale camera leak.
  if(this.following&&(!this.lockPresent||this.following.sampleAt<=cutoff)){this.ready.bitmap.close();this.ready=this.following;this.following=null}
  while(this.ready){
   const job=this.ready,frame=job.bitmap;this.ready=this.following;this.following=null;
   try{if((owner.renderWidth||owner.cv.width)===frame.width&&(owner.renderHeight||owner.cv.height)===frame.height&&(!job.valid||job.valid())){
    if(owner.cv.width!==frame.width)owner.cv.width=frame.width;if(owner.cv.height!==frame.height)owner.cv.height=frame.height;
    if(owner.presenter)owner.presenter.transferFromImageBitmap(frame);
    else{owner.ctx.globalCompositeOperation='copy';owner.ctx.drawImage(frame,0,0)}
    if(job.layers)job.layers(job.at);return;
   }}finally{frame.close()}
  }
 }
 fallback(owner){
  if(this.ready){this.ready.bitmap.close();this.ready=null}if(this.following){this.following.bitmap.close();this.following=null}
  this.worker.terminate();this.busy=false;this.warming=false;this.onready=null;this.onpresent=null;
  if(owner.cpu===this)owner.cpu=new SoftRaster();
 }
 release(g){const id=this.ids.get(g);if(id!==undefined){this.ids.delete(g);this.worker.postMessage({release:id})}}
 payload(g){
  const id=this.sequence++,d=g.d.slice(),norm8=readyNormals(g).slice();this.ids.set(g,id);return {id,n:g.n,d,norm8,smoothActor:!!g.smoothActor}
 }
 prewarmMeshes(models,r){
  if(this.warming)return false;const list=[],send=[];
  for(const g of models){if(this.ids.has(g))continue;const m=this.payload(g);list.push(m);send.push(m.d.buffer,m.norm8.buffer)}
  if(list.length){this.warming=true;try{this.worker.postMessage({warm:list},send)}catch{this.fallback(r)}}
  return true;
 }
 begin(r){
  if(!this.commands)this.commands=new Float64Array(9*192);this.count=0;this.fxCount=0;this.lastStar=0;this.starChanges=null;this.meshes=[];this.transfer=[];
  this.view={w:r.renderWidth||r.cv.width,h:r.renderHeight||r.cv.height,cam:{...r.cam},s:r.s,c:r.c,sp:r.sp,cp:r.cp,f:r.f,light:r.light,opacity:1};
 }
 draw(r,g,x,y,z,a,s,lean,pitch){
  let id=this.ids.get(g);if(id===undefined){const m=this.payload(g);id=m.id;this.meshes.push(m);this.transfer.push(m.d.buffer,m.norm8.buffer)}
  let c=this.commands,j=this.count;const tint=r.starTint||0;
  if(tint!==this.lastStar){(this.starChanges||(this.starChanges=[])).push(j,tint);this.lastStar=tint}
  if(j+9>c.length){this.commands=new Float64Array(c.length*2);this.commands.set(c);c=this.commands}
  c[j]=id;c[j+1]=x;c[j+2]=y;c[j+3]=z;c[j+4]=a;c[j+5]=s;c[j+6]=lean;c[j+7]=pitch;c[j+8]=r.opacity;this.count=j+9;
 }
 prepareFX(bytes){
  if(this.busy)return false; // The current packet owns the transferable buffer.
  if(!this.fx||this.fx.byteLength<bytes)this.fx=new Float32Array(bytes/4);
  return true;
 }
 drawFX(r,b){
  const n=b.n*9;if(!this.fx||this.fx.length<n)this.fx=new Float32Array(2**Math.ceil(Math.log2(Math.max(1024,n))));
  this.fx.set(b.d.subarray(0,n));this.fxCount=b.n;
 }
 end(r){
  this.rows=changedAtlas(this.revision,tags.size);this.revision=tags.size;
  for(const row of this.rows)this.transfer.push(row.data.buffer);
  this.busy=true;const fx=this.fxCount?this.fx:null;this.transfer.push(this.commands.buffer);if(fx)this.transfer.push(fx.buffer);
  const packet=WorldShadows.softwareData(r);let shadows=null;
  if(packet){
   shadows={staticMix:packet.staticMix,farMix:packet.farMix};const stat=packet.scene,live=packet.local;
   if(this.shadowScene!==stat){shadows.stat=stat;this.shadowScene=stat}
   const detail=packet.detail;
   if(this.detailOwner!==detail?.id||this.detailVersion!==detail?.version){
    if(detail&&this.detailOwner===detail.id&&this.detailVersion===detail.version-1&&detail.patch)
     shadows.detailPatch=detail.patch;
    else if(detail){
     const {id,version,size,cell,bias,x,z,data,bounds}=detail;
     shadows.detail={id,version,size,cell,bias,x,z,data,bounds};
    }else shadows.detail=null;
    this.detailOwner=detail?.id;this.detailVersion=detail?.version;
   }
   const far=packet.distant;
   if(this.shadowFar!==far?.id||this.farVersion!==far?.version){
    if(far?.rect&&this.shadowFar===far.id&&this.farVersion===far.version-1){
     const [x,y,w,h]=far.rect,data=new Uint16Array(w*h);
     for(let j=0;j<h;j++){const start=(j+y)*far.size+x;data.set(far.data.subarray(start,start+w),j*w)}
     shadows.farPatch={rect:far.rect,data,version:far.version,dirty:far.dirty};this.transfer.push(data.buffer);
    }else shadows.far=far;
    this.shadowFar=far?.id;this.farVersion=far?.version;
   }
   const stamps=packet.stamps;
   if(stamps){if(this.stampOwner!==stamps){this.stampOwner=stamps;this.stampSent=[]}shadows.stamps=stamps.workerPacket(this)}else if(this.stampOwner){this.stampOwner=null;this.stampSent=[]}
   const focus=packet.focus;
   if(this.shadowFocus!==focus?.id||this.focusVersion!==focus?.version){
    shadows.focus=focus;this.shadowFocus=focus?.id;this.focusVersion=focus?.version;
   }
   if(this.shadowLive!==live.id||this.shadowVersion!==live.version){shadows.live=live;this.shadowLive=live.id;this.shadowVersion=live.version}
  }
  try{this.worker.postMessage({view:this.view,meshes:this.meshes,commands:this.commands,count:this.count,stars:this.starChanges,fx,fxCount:this.fxCount,rows:this.rows,revision:this.revision,shadows},this.transfer)}
  catch{this.fallback(r)}
 }
}
