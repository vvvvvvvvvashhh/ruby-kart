// The cabinet only repaints when its pose, lighting or a physical key changes.
// Its depth-tested LCD apertures expose the original interactive game canvases.
const CabinetRender=(()=>{
 function camera(bounds,w,h,yaw,pitch,roll){
  const dx=bounds[3]-bounds[0],dy=bounds[4]-bounds[1],dz=bounds[5]-bounds[2];
  const center=[0,1,2].map(i=>(bounds[i]+bounds[i+3])*.5),dist=Math.max(dx,dy)*2.7;
  // LCD layout is authored at a 1920 × 1080 viewport. The surface and its
  // ray-cast controls stay in full viewport coordinates at every density.
  const layoutScale=Math.max(1,Math.min(Math.max(w,h)/1910,Math.min(w,h)/1069));
  const fit=Math.min((w-10*layoutScale)/(roll?dy:dx),(h-34*layoutScale)/(roll?dx:dy))*.955;
  const f=dist*fit*(1-dz/(dist*2)),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const rowX=[cy,0,sy],rowY=[sp*sy,cp,-sp*cy],rowZ=[-cp*sy,sp,cp*cy];
  const r=roll?[rowY,rowX.map(v=>-v),rowZ]:[rowX,rowY,rowZ];
  const mat=new Float32Array([r[0][0],r[1][0],r[2][0],r[0][1],r[1][1],r[2][1],r[0][2],r[1][2],r[2][2]]);
  const ox=w*.5,oy=(h+16*layoutScale)*.5;
  function project(p){const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];const k=f/(dist-(x*r[2][0]+y*r[2][1]+z*r[2][2]));return [ox+k*(x*r[0][0]+y*r[0][1]+z*r[0][2]),oy-k*(x*r[1][0]+y*r[1][1]+z*r[1][2])]}
  return {r,mat,center,dist,f,w,h,ox,oy,fit,layoutScale,project};
 }
 function surfaceScale(c,backend,dragging,multisampled=true){
  const w=c.w,h=c.h,long=Math.max(w,h),short=Math.min(w,h),compact=short<700;
  const dpr=Math.max(1,globalThis.devicePixelRatio||1);
  if(backend==='webgl'){
   // MSAA is optional on WebGL 1. When unavailable, reserve extra coverage
   // samples in the cabinet canvas itself before the browser composites it.
   const target=Math.min(compact?2.75:2.5,dpr*(multisampled?1.12:1.48));
   const budget=compact?(dragging?2200000:3400000):dragging?3456000:3840*2160;
   return Math.min(target,Math.sqrt(budget/(w*h)),(compact?2900:3840)/long);
  }
  // The cabinet and LCDs are separate surfaces. Reserve the highest density
  // for a settled pose, where only the region around a pressed key is redrawn.
  if(dragging)return Math.min(compact?.82:.85,Math.sqrt((compact?139000:640000)/(w*h)),(compact?700:1180)/long);
  const density=compact?Math.min(2,Math.max(1.4,dpr*.84)):Math.min(1.8,Math.max(1.22,dpr));
  const budget=compact?1550000:dpr>1||long>=1760?2560*1440:1850000;
  return Math.min(density,Math.sqrt(budget/(w*h)),(compact?1920:2560)/long);
 }
 // A projected hit rectangle can sit behind another control or the housing at
 // an oblique angle. Cast only on pointer-down; motion and race frames do not pay for it.
 function blocked(mesh,c,id,point,motion={},exact=false){
  const eye=c.center.map((x,i)=>x+c.r[2][i]*c.dist),v=mesh.v;
  let dx=eye[0]-point[0],dy=eye[1]-point[1],dz=eye[2]-point[2],len=Math.hypot(dx,dy,dz);
  dx/=len;dy/=len;dz/=len;
  let keyDepth=-Infinity,otherDepth=-Infinity;
  for(const group of mesh.groups){
   if(!exact&&group.id===id)continue;
   const off=motion[group.id]||[0,0,0],x=point[0]-off[0],y=point[1]-off[1],z=point[2]-off[2];
   for(let j=group.start*12,end=j+group.count*12;j<end;j+=36){
    if(v[j+9]===7||v[j+9]===8||v[j+9]<0)continue;
    const ax=v[j],ay=v[j+1],az=v[j+2],bx=v[j+12]-ax,by=v[j+13]-ay,bz=v[j+14]-az,
     ex=v[j+24]-ax,ey=v[j+25]-ay,ez=v[j+26]-az;
    const hx=dy*ez-dz*ey,hy=dz*ex-dx*ez,hz=dx*ey-dy*ex,det=bx*hx+by*hy+bz*hz;
    if(Math.abs(det)<1e-8)continue;
    const tx=x-ax,ty=y-ay,tz=z-az,u=(tx*hx+ty*hy+tz*hz)/det;
    if(u<0||u>1)continue;
    const qx=ty*bz-tz*by,qy=tz*bx-tx*bz,qz=tx*by-ty*bx,b=(dx*qx+dy*qy+dz*qz)/det;
    if(b<0||u+b>1)continue;
    const distance=(ex*qx+ey*qy+ez*qz)/det;
    if(distance>=len)continue;
    if(!exact){if(distance>.75)return true}
    else if(group.id===id)keyDepth=Math.max(keyDepth,distance);
    else otherDepth=Math.max(otherDepth,distance);
   }
  }
  return exact&&(keyDepth===-Infinity||otherDepth>keyDepth+.12);
 }
 // Each finish chooses the blur of the same photographed-studio-style
 // lighting rig, reflectance at normal incidence and reflectance at grazing
 // incidence. The room's three light banks are generated once and reused by
 // WebGL and the software rasterizer, including offline file:// play.
 const finishes=[
  [2,.070,.25],[3,.037,.16],[2,.12,.34],[1,.21,.52],[3,.029,.12],
  [1,.39,.67],[0,.28,.66],[3,0,0],[3,0,0],[0,.23,.61],
  [2,.135,.39],[3,.070,.18],[1,.39,.65],[1,.19,.62]
 ];
 let roomPixels,softwareRoom;
 function studio(){
  if(roomPixels)return roomPixels;
  const A=128,out=new Uint8Array(A*A*4*4);
  const clamp=v=>Math.max(0,Math.min(1,v));
  function card(x,y,cx,cy,hw,hh,a,r,blur){
   const dx=x-cx,dy=y-cy,ux=Math.abs(dx*Math.cos(a)+dy*Math.sin(a))-hw+r;
   const uy=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))-hh+r;
   const d=Math.hypot(Math.max(0,ux),Math.max(0,uy))+Math.min(0,Math.max(ux,uy))-r;
   const t=clamp(.5-d/(2*blur));return t*t*(3-2*t);
  }
  for(let band=0;band<4;band++)for(let i=0;i<A*A;i++){
   const x=((i%A)/(A-1)-.5)*2.72,y=((i>>7)/(A-1)-.5)*2.72;
   const b=[.09,.16,.26,.38][band],strength=[1,.94,.82,.69][band];
   const key=card(x,y,-.36,.31,.20,.31,-.32,.075,b);
   const bounce=card(x,y,.65,.12,.12,.48,.19,.075,b*1.34);
   const rim=card(x,y,-.24,-.88,.53,.13,-.06,.12,b*1.52);
   const wash=card(x,y,-.32,.30,.49,.48,-.29,.27,.40+b*.35);
   const floor=card(x,y,.69,-.64,.50,.27,.22,.22,.35+b*.3);
   const j=(i+band*A*A)*4;out[j]=Math.round(255*strength*key);
   out[j+1]=Math.round(255*strength*clamp(bounce+rim*.43));
   out[j+2]=Math.round(255*clamp(.84*wash+.42*floor));
   // Stable object-space microtexture, sampled only when it is large enough.
   let hash=Math.imul(i+17,0x27d4eb2d);hash^=hash>>>15;hash=Math.imul(hash,0x85ebca6b);
   out[j+3]=hash>>>24;
  }
  return roomPixels=out;
 }
 function lookupRoom(){
  if(softwareRoom)return softwareRoom;
  const tex=studio(),out=new Float32Array(tex.length);
  for(let i=0;i<tex.length;i+=4){
   const k=tex[i]/255,b=tex[i+1]/255,w=tex[i+2]/255;
   out[i]=k+.62*b+.085*w;out[i+1]=.94*k+.80*b+.105*w;
   out[i+2]=.88*k+b+.145*w;out[i+3]=w;
  }
  return softwareRoom=out;
 }
 const materialGL=finishes.map((f,i)=> (i?'else ':'')+'if(m<'+(i+.5).toFixed(1)+')return vec3('+f.map(x=>x.toFixed(3)).join(',')+');').join('\n');
 const vertex=`
 attribute vec3 pos,normal,color; attribute float surface; attribute vec2 uv;
 uniform mat3 rot;uniform vec3 center,move;uniform vec4 lens;uniform float offset;uniform vec2 lightShift;
 varying vec3 C;varying float M,face;varying vec4 optic;varying vec2 T,grain;
 vec3 finish(float m){${materialGL}return vec3(2.,.07,.25);}
 void main(){vec3 p=rot*(pos+move-center);float d=lens.y-p.z;
 gl_Position=vec4(p.x*lens.x/lens.z*2.,p.y*lens.x/lens.w*2.-offset*d,(d-lens.y)*1.5,d);
 vec3 n=normalize(rot*normal);face=n.z;M=surface;T=uv;C=color;optic=vec4(0.);grain=vec2(0.);
 if(surface<0.||surface==7.||surface==8.)return;
 vec3 v=normalize(vec3(-p.xy,d)),r=reflect(-v,n);float nv=clamp(dot(n,v),0.,1.);
 float e=1.-nv;e*=e;e*=e;
 vec3 f=finish(surface);vec2 q=r.xy/(1.+.48*r.z)+.98*p.xy*(2.7/lens.y)-lightShift*vec2(.73,.65);
 vec2 tex=clamp(q/2.72+.5,0.,1.)*127.;optic=vec4((tex+vec2(.5,.5+128.*f.x))/vec2(128.,512.),mix(f.y,f.z,e),e);
 vec3 key=normalize(vec3(-.47+.53*lightShift.x,.60+.46*lightShift.y,.85));
 float diffuse=.53+.37*max(dot(n,key),0.)+.085*max(dot(n,vec3(.76,-.25,.41)),0.)+.055*n.y;
 C=color*diffuse;if(surface==10.)C+=vec3(-.013,.001,.020)*e;
 grain=(pos.xy+pos.z*vec2(.47,-.39))/38.;
 }`;
 const fragment=`
 precision mediump float;varying vec3 C;varying float M,face;varying vec4 optic;varying vec2 T,grain;
 uniform sampler2D glyph,studioMap;uniform float grainStrength;
 void main(){
 float mat=floor(M+.5);
 if(mat<-.5){if(face<=0.)discard;gl_FragColor=vec4(0.);return;}
 if(T.x>=0.&&texture2D(glyph,T).a<.4)discard;
 if(mat==7.||mat==8.){gl_FragColor=vec4(C*(mat==8.?1.03:.94),1.);return;}
 vec3 banks=texture2D(studioMap,optic.xy).rgb;
 vec3 refl=vec3(1.,.94,.88)*banks.r+vec3(.62,.80,1.)*banks.g+vec3(.085,.105,.145)*banks.b;
 vec3 base=C;
 if(mat==9.){
  // A neutral air/clearcoat reflection over a separately colored return from
  // the pigment. Increasing optical path length deepens the edge of the red.
  base=C*(.865+.215*banks.b-.19*optic.w)+vec3(.14,.014,.031)*banks.b*(.40+.60*C.r);
 }else if(mat==10.){base=C*(.964+.047*banks.b)+vec3(.010,.012,.022)*banks.b;}
 else if(mat==5.||mat==12.){refl*=vec3(.67)+.44*C;}
 if(mat==10.||mat==11.||mat==12.){
  float micro=texture2D(studioMap,(fract(grain)*127.+.5)/vec2(128.,512.)).a-.5;
  base*=1.+grainStrength*micro*(mat==11.?.073:.029);
 }
 gl_FragColor=vec4(base+refl*optic.z,1.);
 }`;
 function gpu(canvas,gl){
  const multisampled=gl.getContextAttributes?.()?.antialias!==false;
  const viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS),bufferLimit=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  const maxW=Math.min(viewport[0],bufferLimit),maxH=Math.min(viewport[1],bufferLimit);
  const compile=(kind,src)=>{const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh};
  const p=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(p);
  const b=gl.createBuffer(),t=gl.createTexture(),room=gl.createTexture(),u={};for(const name of ['rot','center','move','lens','offset','glyph','lightShift','studioMap','grainStrength'])u[name]=gl.getUniformLocation(p,name);
  gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const [n,size,off] of [['pos',3,0],['normal',3,3],['color',3,6],['surface',1,9],['uv',2,10]]){const loc=gl.getAttribLocation(p,n);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,48,off*4)}
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,room);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,512,0,gl.RGBA,gl.UNSIGNED_BYTE,studio());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(u.studioMap,1);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(u.glyph,0);
  gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);let model=null;
  return {kind:'webgl',release(){
   model=null;if(gl.isContextLost())return;gl.deleteBuffer(b);gl.deleteTexture(t);gl.deleteTexture(room);gl.deleteProgram(p);gl.getExtension('WEBGL_lose_context')?.loseContext();
  },draw(mesh,c,moves,light,dragging=false){
   const scale=Math.min(surfaceScale(c,'webgl',dragging,multisampled),maxW/c.w,maxH/c.h);
   const w=Math.max(1,Math.round(c.w*scale)),h=Math.max(1,Math.round(c.h*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
   gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   if(mesh!==model){model=mesh;gl.bufferData(gl.ARRAY_BUFFER,mesh.v,gl.STATIC_DRAW);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mesh.atlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}
   gl.uniformMatrix3fv(u.rot,false,c.mat);gl.uniform3fv(u.center,c.center);gl.uniform4f(u.lens,c.f,c.dist,c.w,c.h);gl.uniform1f(u.offset,2*c.oy/c.h-1);gl.uniform2fv(u.lightShift,light);gl.uniform1f(u.grainStrength,Math.max(0,Math.min(1,(c.f/c.dist*scale-1.8)*.28)));
   for(const g of mesh.groups){gl.uniform3fv(u.move,moves[g.id]||zero);gl.drawArrays(gl.TRIANGLES,g.start,g.count)}
  },solid(x,y){const b=new Uint8Array(4);gl.readPixels(Math.floor(x*canvas.width),canvas.height-1-Math.floor(y*canvas.height),1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);return b[3]>220}};
 }
 const zero=[0,0,0];
 // Software rendering keeps the static shell and its depth buffer at a fixed
 // pose. A keypress restores only the pixels under that key. Nearby keys and
 // the original LCD cutouts still participate in the same per-pixel depth test.
 function cpu(canvas){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas');
  let im,depth,basePixels,baseDepth,atlas,model,groups,previousPose,previousLight,owner,runs,candidates;
  let canvasW=0,canvasH=0,view,lx,ly,lz,shiftX,shiftY,roomScale,grainGain,eyeX,eyeY,eyeZ;
  const room=lookupRoom(),noise=studio();
  const X=new Float64Array(3),Y=new Float64Array(3),Z=new Float64Array(3);
  const triplet=()=>new Float64Array(3);
  const VX=triplet(),VY=triplet(),QX=triplet(),QY=triplet(),GX=triplet(),GY=triplet();
  const red=triplet(),green=triplet(),blue=triplet(),spec=triplet(),edge=triplet();
  const equals=(a,b)=>a&&a.length===b.length&&a.every((v,i)=>v===b[i]);

  function bounds(group,v){
   const box=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
   for(let j=group.start*12,end=j+group.count*12;j<end;j+=12)
    for(let i=0;i<3;i++){box[i]=Math.min(box[i],v[j+i]);box[i+3]=Math.max(box[i+3],v[j+i])}
   const corners=[];
   for(let i=0;i<8;i++)corners.push([box[i&1?3:0],box[i&2?4:1],box[i&4?5:2]]);
   return corners;
  }
  function region(group,move){
   let l=canvasW,t=canvasH,r=0,b=0;
   for(const p of group.box){
    const q=view.project([p[0]+move[0],p[1]+move[1],p[2]+move[2]]);
    const x=q[0]*canvasW/view.w,y=q[1]*canvasH/view.h;
    l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
   }
   return [Math.max(0,Math.floor(l-1)),Math.max(0,Math.floor(t-1)),Math.min(canvasW,Math.ceil(r+1)),Math.min(canvasH,Math.ceil(b+1))];
  }
  const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  const union=(a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];

  function drawGroup(group,move,clip,phase){
   const v=model.v,R=view.r,C=view.center,buf=im.data,W=canvasW;
   const sx=canvasW/view.w,sy=canvasH/view.h;
   const start=group.start*12,end=start+group.count*12;
   for(let off=start;off<end;off+=36){
    const spans=phase==='shade'?runs.get(off):undefined;
    if(phase==='shade'&&!spans)continue;
    const mat=v[off+9],textured=v[off+10]>=0;
    if(phase==='depth'&&mat>=0&&mat!==7&&mat!==8){
     // A planar back face on a closed solid lies behind its front face.
     // Smoothed bevels are retained even when a vertex normal turns away.
     const nx=v[off+3],ny=v[off+4],nz=v[off+5];
     const planar=nx===v[off+15]&&nx===v[off+27]&&ny===v[off+16]&&ny===v[off+28]&&nz===v[off+17]&&nz===v[off+29];
     if(planar&&nx*(eyeX-v[off])+ny*(eyeY-v[off+1])+nz*(eyeZ-v[off+2])<-.01)continue;
    }
    for(let k=0;k<3;k++){
     const j=off+k*12,x=v[j]+move[0]-C[0],y=v[j+1]+move[1]-C[1],z=v[j+2]+move[2]-C[2];
     const vz=x*R[2][0]+y*R[2][1]+z*R[2][2],inv=1/(view.dist-vz),f=view.f*inv;
     VX[k]=x*R[0][0]+y*R[0][1]+z*R[0][2];VY[k]=x*R[1][0]+y*R[1][1]+z*R[1][2];
     X[k]=(view.ox+f*VX[k])*sx;Y[k]=(view.oy-f*VY[k])*sy;
     Z[k]=inv;
    }
    const dx1=X[1]-X[0],dy1=Y[1]-Y[0],dx2=X[2]-X[0],dy2=Y[2]-Y[0],det=dx1*dy2-dx2*dy1;
    if(Math.abs(det)<.0001)continue;
    const i0=Math.max(clip[0],Math.ceil(Math.min(X[0],X[1],X[2])-.5)),i1=Math.min(clip[2]-1,Math.floor(Math.max(X[0],X[1],X[2])-.5));
    const j0=Math.max(clip[1],Math.ceil(Math.min(Y[0],Y[1],Y[2])-.5)),j1=Math.min(clip[3]-1,Math.floor(Math.max(Y[0],Y[1],Y[2])-.5));
    if(i0>i1||j0>j1)continue;
    const surface=finishes[mat]||finishes[0],paint=mat===9,pearl=mat===10,metal=mat===5||mat===12,mark=mat===7||mat===8;
    const granular=(pearl||mat===11||mat===12)&&grainGain>0;
    if(phase==='depth'){
     if(mat<0&&v[off+3]*R[2][0]+v[off+4]*R[2][1]+v[off+5]*R[2][2]<=0)continue;
    }else{
     for(let k=0;k<3;k++){
      const j=off+k*12,a=v[j+3],b=v[j+4],d=v[j+5];
      const nx=a*R[0][0]+b*R[0][1]+d*R[0][2],ny=a*R[1][0]+b*R[1][1]+d*R[1][2],nz=a*R[2][0]+b*R[2][1]+d*R[2][2];
      if(mat<0){edge[k]=nz;continue}
      if(mark){
       const gain=mat===7?.94:1.03;
       red[k]=v[j+6]*gain;green[k]=v[j+7]*gain;blue[k]=v[j+8]*gain;continue;
      }
      const px=VX[k],py=VY[k],dz=1/Z[k],inv=1/Math.sqrt(px*px+py*py+dz*dz);
      const vx=-px*inv,vy=-py*inv,vz=dz*inv,nv=nx*vx+ny*vy+nz*vz,rz=2*nv*nz-vz;
      const denom=1/(1+.48*rz);
      const su=(2*nv*nx-vx)*denom+.98*px*roomScale-.73*shiftX;
      const sv=(2*nv*ny-vy)*denom+.98*py*roomScale-.65*shiftY;
      QX[k]=Math.max(0,Math.min(127,(su/2.72+.5)*127));
      QY[k]=Math.max(0,Math.min(127,(sv/2.72+.5)*127))+128*surface[0];
      let grazing=1-Math.max(0,Math.min(1,nv));grazing*=grazing;grazing*=grazing;
      edge[k]=grazing;spec[k]=surface[1]+(surface[2]-surface[1])*grazing;
      const diffuse=.53+.37*Math.max(0,nx*lx+ny*ly+nz*lz)+.085*Math.max(0,nx*.76-ny*.25+nz*.41)+.055*ny;
      red[k]=v[j+6]*diffuse-(pearl?.013*grazing:0);green[k]=v[j+7]*diffuse+(pearl?.001*grazing:0);blue[k]=v[j+8]*diffuse+(pearl?.020*grazing:0);
      if(granular){GX[k]=(v[j]+v[j+2]*.47)/38;GY[k]=(v[j+1]-v[j+2]*.39)/38}
     }
     if(mat<0&&edge[0]<=0)continue;
    }
    const fu=dy2/det,fv=-dy1/det;
    const rowCount=spans?spans.length/3:j1-j0+1;
    for(let row=0;row<rowCount;row++){
     // The static visibility pass already knows each continuous visible span.
     // Re-light those pixels directly, including text and partially hidden trim.
     const y=spans?spans[row*3]:j0+row,left=spans?spans[row*3+1]:i0,right=spans?spans[row*3+2]:i1;
     const py=y+.5-Y[0],px=left+.5-X[0];let u=(px*dy2-py*dx2)/det,q=(dx1*py-dy1*px)/det;
     for(let x=left,i=y*W+left;x<=right;x++,i++,u+=fu,q+=fv){
      if(!spans&&(u<-.00001||q<-.00001||u+q>1.00001))continue;
      const a=1-u-q,z=a*Z[0]+u*Z[1]+q*Z[2];if(phase!=='shade'&&z+1e-11<depth[i])continue;
      if(textured&&phase!=='shade'){
       // UVs and vertex colors follow the same perspective interpolation as WebGL.
       const pu=u*Z[1]/z,pq=q*Z[2]/z,pa=1-pu-pq;
       const tu=Math.min(1023,Math.max(0,(pa*v[off+10]+pu*v[off+22]+pq*v[off+34])*1024|0));
       const tv=Math.min(1023,Math.max(0,(pa*v[off+11]+pu*v[off+23]+pq*v[off+35])*1024|0));
       if(atlas[(tv*1024+tu)*4+3]<100)continue;
      }
      if(phase==='depth'){depth[i]=z;owner[i]=off;continue}
      if(phase!=='shade')depth[i]=z;const b=i*4;if(mat<0){buf[b+3]=0;continue}
      const pu=u*Z[1]/z,pq=q*Z[2]/z,pa=1-pu-pq;
      let r=pa*red[0]+pu*red[1]+pq*red[2],g=pa*green[0]+pu*green[1]+pq*green[2],bl=pa*blue[0]+pu*blue[1]+pq*blue[2];
      if(!mark){
       const tx=(pa*QX[0]+pu*QX[1]+pq*QX[2]+.5)|0,ty=(pa*QY[0]+pu*QY[1]+pq*QY[2]+.5)|0,s=(ty*128+tx)*4;
       const wide=room[s+3],reflectance=pa*spec[0]+pu*spec[1]+pq*spec[2];
       let sr=room[s],sg=room[s+1],sb=room[s+2];
       if(paint){
        const pigment=.865+.215*wide-.19*(pa*edge[0]+pu*edge[1]+pq*edge[2]),under=wide*(.40+.60*r);
        r=r*pigment+.14*under;g=g*pigment+.014*under;bl=bl*pigment+.031*under;
       }else if(pearl){
        const lobe=.964+.047*wide;r=r*lobe+.010*wide;g=g*lobe+.012*wide;bl=bl*lobe+.022*wide;
       }else if(metal){sr*=.67+.44*r;sg*=.67+.44*g;sb*=.67+.44*bl}
       if(granular){
        const gx=pa*GX[0]+pu*GX[1]+pq*GX[2],gy=pa*GY[0]+pu*GY[1]+pq*GY[2];
        const gi=(((gy-Math.floor(gy))*127+.5|0)*128+((gx-Math.floor(gx))*127+.5|0))*4+3;
        const micro=1+(noise[gi]/255-.5)*grainGain*(mat===11?.073:.029);r*=micro;g*=micro;bl*=micro;
       }
       r+=sr*reflectance;g+=sg*reflectance;bl+=sb*reflectance;
      }
      buf[b]=r*255;buf[b+1]=g*255;buf[b+2]=bl*255;buf[b+3]=255;
     }
    }
   }
  }

  // Resolve diagonal coverage in the final depth-tested image. Work in
  // premultiplied color at transparent silhouette and LCD boundaries, so the
  // eventual page or live screen supplies the color on the other side.
  const search=6;
  let shown,luma,coverage,movingMask,resolved=false;
  function movingCoverage(box,on){
   const [l,t,r,b]=box,W=canvasW;
   for(let y=Math.max(0,t-1);y<Math.min(canvasH,b+1);y++)movingMask.fill(on,y*W+Math.max(0,l-1),y*W+Math.min(W,r+1));
  }
  function luminance(box){
   const [x0,y0,x1,y1]=box,src=im.data,W=canvasW;
   for(let y=y0;y<y1;y++)for(let i=y*W+x0,end=y*W+x1;i<end;i++){
    const j=i*4;coverage[i]=src[j+3];
    luma[i]=src[j+3] ? 54+((src[j]*54+src[j+1]*183+src[j+2]*19)*.00304) : 0;
   }
  }
  // A live LCD has a known projected quadrilateral. Resolve its coverage
  // against a unit pixel rather than assuming an axis-aligned edge falls on
  // a whole pixel. The ordinary depth buffer still wins when a key or the
  // shell is in front of the glass at a grazing angle.
  let lcdFringe=[];
  function cacheApertures(){
   const W=canvasW,H=canvasH,pixels=new Map(),eye=view.r[2],center=view.center;
   for(const corners of Object.values(model.panels)){
    const q=corners.map(p=>{const xy=view.project(p),z=eye[0]*(p[0]-center[0])+eye[1]*(p[1]-center[1])+eye[2]*(p[2]-center[2]);
     return [xy[0]*W/view.w,xy[1]*H/view.h,1/(view.dist-z)]});
    const a=q[0],b=q[1],d=q[3],dx=b[0]-a[0],dy=b[1]-a[1],ex=d[0]-a[0],ey=d[1]-a[1];
    const det=dx*ey-dy*ex;if(det<=1)continue;
    const edges=q.map((p,j)=>{const t=q[(j+1)%4],vx=t[0]-p[0],vy=t[1]-p[1],len=Math.hypot(vx,vy);return {x:p[0],y:p[1],nx:-vy/len,ny:vx/len}});
    for(let j=0;j<4;j++){
     const edge=edges[j],next=edges[(j+1)%4],vx=next.x-edge.x,vy=next.y-edge.y;
     const steps=Math.ceil(Math.max(Math.abs(vx),Math.abs(vy)));
     for(let k=0;k<=steps;k++){
      const px=Math.floor(edge.x+vx*k/steps),py=Math.floor(edge.y+vy*k/steps);
      for(let y=Math.max(1,py-1);y<=Math.min(H-2,py+1);y++)for(let x=Math.max(1,px-1);x<=Math.min(W-2,px+1);x++){
       const i=y*W+x;if(pixels.has(i))continue;
       let area=1,near=Infinity,outX=0,outY=0;
       for(const e of edges){
        const distance=(x+.5-e.x)*e.nx+(y+.5-e.y)*e.ny,ax=Math.abs(e.nx),ay=Math.abs(e.ny);
        if(distance<near){near=distance;outX=-e.nx;outY=-e.ny}
        const t=distance+(ax+ay)*.5;
        if(t<=0){area=0;continue}if(t>=ax+ay)continue;
        if(Math.min(ax,ay)<.0001){area*=Math.min(1,t/Math.max(ax,ay));continue}
        const sx=Math.max(0,t-ax),sy=Math.max(0,t-ay);
        area*=Math.max(0,Math.min(1,(t*t-sx*sx-sy*sy)/(2*ax*ay)));
       }
       if(Math.abs(near)>1.25)continue;
       const xx=x+.5-a[0],yy=y+.5-a[1],u=(xx*ey-yy*ex)/det,v=(dx*yy-dy*xx)/det;
       const inv=a[2]+u*(b[2]-a[2])+v*(d[2]-a[2]);
       pixels.set(i,{i,x,y,outX,outY,alpha:Math.round(255*(1-area)),limit:inv+1.5*inv*inv});
      }
     }
    }
   }
   lcdFringe=Array.from(pixels.values());
  }
  // Resolve the outer moulding at sixteen fixed subpixel positions. Only a
  // one-pixel band around the actual shell needs this work. LCDs have their
  // own analytical edge coverage above and moving controls retain depth priority.
  let silhouette=[];
  function cacheSilhouette(){
   const W=canvasW,H=canvasH,V=model.v,projected=new Map(),found=new Set(),sample=[];
   for(let y=0;y<4;y++)for(let x=0;x<4;x++)sample.push([(x+(y+.5)/4)/4,(y+(3.5-x)/4)/4]);
   function face(id){
    let tri=projected.get(id);if(tri)return tri;
    const xy=[];
    for(let k=0;k<3;k++){const j=id+k*12,p=view.project([V[j],V[j+1],V[j+2]]);xy.push([p[0]*W/view.w,p[1]*H/view.h])}
    const [a,b,c]=xy,dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],det=dx*ey-dy*ex;
    tri=Math.abs(det)<1e-9?[]:[a[0],a[1],ey/det,-ex/det,-dy/det,dx/det];projected.set(id,tri);return tri;
   }
   silhouette=[];
   for(let y=1;y<H-1;y++)for(let x=1,i=y*W+1;x<W-1;x++,i++){
    const id=owner[i],inside=id>=0;
    if((owner[i-1]>=0)===inside&&(owner[i+1]>=0)===inside&&(owner[i-W]>=0)===inside&&(owner[i+W]>=0)===inside)continue;
    found.clear();let source=inside?i:-1,min=Infinity,glass=false;
    for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){
     const j=i+yy*W+xx,n=owner[j];if(n<0)continue;
     if(V[n+9]<0){glass=true;continue}
     if(V[n+10]>=0)continue;
     found.add(face(n));const d=xx*xx+yy*yy;if(!inside&&d<min){min=d;source=j}
    }
    if(glass||source<0||!found.size)continue;
    let bits=0;
    for(const t of found){
     if(!t.length)continue;
     for(let j=0;j<16;j++){
      if(bits&(1<<j))continue;
      const xx=x+sample[j][0]-t[0],yy=y+sample[j][1]-t[1],u=xx*t[2]+yy*t[3],v=xx*t[4]+yy*t[5];
      if(u>=0&&v>=0&&u+v<=1)bits|=1<<j;
     }
     if(bits===65535)break;
    }
    let count=0;for(;bits;bits&=bits-1)count++;
    silhouette.push({x,y,i,source,alpha:Math.round(255*count/16)});
   }
  }
  function resolveSilhouette(x0,y0,x1,y1){
   const src=im.data,dst=shown.data;
   for(const e of silhouette){
    if(e.x<x0||e.y<y0||e.x>=x1||e.y>=y1||depth[e.i]!==baseDepth[e.i]||depth[e.source]!==baseDepth[e.source])continue;
    const j=e.i*4,k=e.source*4;dst[j]=src[k];dst[j+1]=src[k+1];dst[j+2]=src[k+2];dst[j+3]=e.alpha;
   }
  }
  function resolveApertures(x0,y0,x1,y1){
   const src=im.data,dst=shown.data,W=canvasW;
   for(const f of lcdFringe){
    const {x,y,i}=f;if(x<x0||x>=x1||y<y0||y>=y1||depth[i]>f.limit)continue;
    let color=i,found=false,open=false,score=-Infinity;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const p=i+dy*W+dx;if(!src[p*4+3]){open=true;continue}
     if(depth[p]>f.limit)continue;found=true;
     if(src[i*4+3])continue;
     const weight=dx*f.outX+dy*f.outY-.29*(dx*dx+dy*dy);
     if(weight>score){score=weight;color=p}
    }
    if(!found||!open)continue;
    const j=i*4,k=color*4;dst[j]=src[k];dst[j+1]=src[k+1];dst[j+2]=src[k+2];dst[j+3]=f.alpha;
   }
  }

  function present(box,orbit=false){
   const W=canvasW,H=canvasH,src=im.data,dst=shown.data;
   const x0=Math.max(0,box[0]-search-1),y0=Math.max(0,box[1]-search-1);
   const x1=Math.min(W,box[2]+search+1),y1=Math.min(H,box[3]+search+1);
   if(x0>=x1||y0>=y1)return;
   for(let y=y0;y<y1;y++){
    const row=y*W;dst.set(src.subarray((row+x0)*4,(row+x1)*4),(row+x0)*4);
    if(orbit||y<1||y+1>=H)continue;
    for(let x=Math.max(1,x0);x<Math.min(W-1,x1);x++){
     const i=row+x;if(!candidates[i]&&!movingMask[i])continue;const alpha0=coverage[i];
     const field=coverage[i-W]!==alpha0||coverage[i+W]!==alpha0||coverage[i-1]!==alpha0||coverage[i+1]!==alpha0?coverage:luma;
     const m=field[i],n=field[i-W],s=field[i+W],w=field[i-1],e=field[i+1];
     const high=Math.max(m,n,s,w,e),range=high-Math.min(m,n,s,w,e);
     if(range<6||range<high*.048)continue;
     const nw=field[i-W-1],ne=field[i-W+1],sw=field[i+W-1],se=field[i+W+1];
     const hEdge=Math.abs(nw+sw-2*w)+2*Math.abs(n+s-2*m)+Math.abs(ne+se-2*e);
     const vEdge=Math.abs(nw+ne-2*n)+2*Math.abs(w+e-2*m)+Math.abs(sw+se-2*s);
     const horizontal=hEdge>=vEdge,s1=horizontal?n:w,s2=horizontal?s:e,tangent=horizontal?1:W;
     const neg=Math.abs(s1-m)>=Math.abs(s2-m),other=neg?s1:s2;
     const normal=(horizontal?W:1)*(neg?-1:1);
     // Leave axis-aligned LCD borders, fine printing and long straight seams crisp.
     if(s1===s2||horizontal&&w===m&&e===m&&nw===n&&ne===n&&sw===s&&se===s
       ||!horizontal&&n===m&&s===m&&nw===w&&sw===w&&ne===e&&se===e)continue;
     const midpoint=(m+other)*.5,cutoff=Math.max(2,Math.abs(other-m)*.25);
     const left=Math.min(search,horizontal?x:y),right=Math.min(search,horizontal?W-1-x:H-1-y);
     let dn=1,dp=1,en=0,ep=0;
     for(;dn<=left;dn++){const j=i-dn*tangent;en=(field[j]+field[j+normal])*.5-midpoint;if(Math.abs(en)>=cutoff)break}
     for(;dp<=right;dp++){const j=i+dp*tangent;ep=(field[j]+field[j+normal])*.5-midpoint;if(Math.abs(ep)>=cutoff)break}
     const useNeg=dn<dp,edgeDelta=useNeg?en:ep;
     const realEnd=useNeg?dn<=left:dp<=right;
     const align=realEnd&&((edgeDelta<0)!==(m<midpoint)) ? .5-Math.min(dn,dp)/(dn+dp) : 0;
     let sub=Math.abs((2*(n+s+w+e)+nw+ne+sw+se)/12-m)/range;
     sub=Math.min(1,sub);sub=sub*sub*(3-2*sub);
     const weight=Math.max(align,sub*sub*.46);
     if(weight<.014)continue;
     const j=i*4,k=(i+normal)*4,a=src[j+3]*(1-weight),b=src[k+3]*weight,alpha=a+b;
     dst[j+3]=alpha;
     if(alpha){const inv=1/alpha;dst[j]=(src[j]*a+src[k]*b)*inv;dst[j+1]=(src[j+1]*a+src[k+1]*b)*inv;dst[j+2]=(src[j+2]*a+src[k+2]*b)*inv}
    }
   }
   resolveSilhouette(x0,y0,x1,y1);resolveApertures(x0,y0,x1,y1);ctx.putImageData(shown,0,0,x0,y0,x1-x0,y1-y0);
  }

  let orbitScale=1,slowFrames=0,quickFrames=0;
  function draw(mesh,c,moves,light,dragging=false){
   const start=dragging?performance.now():0;
   const scale=surfaceScale(c,'software',dragging)*(dragging?orbitScale:1);
   const W=Math.max(1,Math.round(c.w*scale)),H=Math.max(1,Math.round(c.h*scale));
   const pose=[W,H,dragging?1:0,c.w,c.h,c.ox,c.oy,c.f,c.dist,...c.center,...c.mat];
   const newPose=mesh!==model||!equals(previousPose,pose),rebuild=newPose||!equals(previousLight,light);
   if(mesh!==model){
    model=mesh;atlas=mesh.atlas.getContext('2d').getImageData(0,0,1024,1024).data;
    groups=mesh.groups.filter(g=>g.id!=='body').map(g=>({...g,box:bounds(g,mesh.v),move:null,rect:null}));
   }
   if(W!==canvasW||H!==canvasH){
    canvas.width=canvasW=W;canvas.height=canvasH=H;im=ctx.createImageData(W,H);
    shown=ctx.createImageData(W,H);luma=new Uint8Array(W*H);coverage=new Uint8Array(W*H);candidates=new Uint8Array(W*H);movingMask=new Uint8Array(W*H);
    depth=new Float32Array(W*H);baseDepth=new Float32Array(W*H);basePixels=new Uint8ClampedArray(W*H*4);
    // Visibility IDs are temporary. Their storage becomes the fixed shell's
    // cached RGBA pixels as soon as the visible spans have been collected.
    owner=new Int32Array(basePixels.buffer);
   }
   view=c;resolved=true;previousPose=pose;previousLight=[light[0],light[1]];
   eyeX=c.center[0]+c.r[2][0]*c.dist;eyeY=c.center[1]+c.r[2][1]*c.dist;eyeZ=c.center[2]+c.r[2][2]*c.dist;
   if(rebuild){
    shiftX=light[0];shiftY=light[1];roomScale=2.7/c.dist;
    grainGain=Math.max(0,Math.min(1,(c.f/c.dist*scale-1.8)*.28));
    lx=-.47+shiftX*.53;ly=.60+shiftY*.46;lz=.85;const lv=Math.hypot(lx,ly,lz);lx/=lv;ly/=lv;lz/=lv;
    const clip=[0,0,W,H];
    if(newPose){
     cacheApertures();
     // Determine visibility before sampling the finish. Nested opaque casings
     // and the pixels behind LCD apertures never need surface lighting.
     depth.fill(-Infinity);owner.fill(-1);im.data.fill(0);
     for(const g of mesh.groups)if(g.id==='body')drawGroup(g,zero,clip,'depth');
     runs=new Map();candidates.fill(0);
     for(let y=0;y<H;y++)for(let x=0;x<W;){
      const first=x,id=owner[y*W+x++];while(x<W&&owner[y*W+x]===id)x++;
      if(id>=0){let list=runs.get(id);if(!list)runs.set(id,list=[]);list.push(y,first,x-1)}
     }
     if(!dragging)for(let y=1;y<H-1;y++)for(let x=1,i=y*W+1;x<W-1;x++,i++){
      const id=owner[i];if(owner[i-1]!==id||owner[i+1]!==id||owner[i-W]!==id||owner[i+W]!==id)candidates[i]=1;
     }
     cacheSilhouette();baseDepth.set(depth);
    }else{depth.set(baseDepth);im.data.set(basePixels)}
    for(const g of mesh.groups)if(g.id==='body')drawGroup(g,zero,clip,'shade');
    basePixels.set(im.data);if(!dragging)movingMask.fill(0);
    for(const g of groups){g.move=(moves[g.id]||zero).slice();g.rect=region(g,g.move);if(!dragging)movingCoverage(g.rect,1);drawGroup(g,g.move,clip)}
    if(!dragging)luminance(clip);present(clip,dragging);
    if(dragging){
     const cost=performance.now()-start;
     slowFrames=cost>34?slowFrames+1:0;quickFrames=cost<15?quickFrames+1:0;
     // Only switch between stable surface sizes after repeated costly poses.
     if(slowFrames>=3){orbitScale=Math.max(.72,orbitScale-.14);slowFrames=0}
     if(quickFrames>=20){orbitScale=Math.min(1,orbitScale+.14);quickFrames=0}
    }
    return;
   }
   const patches=[];
   for(const g of groups){
    const next=moves[g.id]||zero;if(equals(g.move,next))continue;
    const rect=region(g,next);let patch=union(g.rect,rect);
    for(let i=patches.length-1;i>=0;i--)if(overlaps(patch,patches[i])){patch=union(patch,patches[i]);patches.splice(i,1)}
    patches.push(patch);g.move=next.slice();g.rect=rect;
   }
   if(!dragging&&patches.length){
    for(const box of patches)movingCoverage(box,0);
    for(const g of groups)movingCoverage(g.rect,1);
   }
   for(const box of patches){
    const [x0,y0,x1,y1]=box;if(x1<=x0||y1<=y0)continue;
    for(let y=y0;y<y1;y++){const a=y*W+x0,b=y*W+x1;depth.set(baseDepth.subarray(a,b),a);im.data.set(basePixels.subarray(a*4,b*4),a*4)}
    for(const g of groups)if(overlaps(g.rect,box))drawGroup(g,g.move,box);
    if(!dragging)luminance(box);
   }
   for(const box of patches)present(box,dragging);
  }
  return {kind:'software',draw,release(){im=depth=basePixels=baseDepth=atlas=model=groups=previousPose=previousLight=owner=runs=candidates=shown=luma=coverage=movingMask=lcdFringe=silhouette=null},solid(x,y){
   if(!im||x<0||y<0||x>=1||y>=1)return false;
   const i=(Math.floor(y*canvasH)*canvasW+Math.floor(x*canvasW))*4;return (resolved?shown:im).data[i+3]>220;
  }};
 }
 function create(parent,forceCPU,onLoss){
  let canvas=document.createElement('canvas');canvas.className='cabinetSurface';canvas.setAttribute('aria-hidden','true');let painter;
  if(!forceCPU)try{const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:true,powerPreference:'low-power'});if(gl)painter=gpu(canvas,gl)}catch{}
  if(!painter){canvas=document.createElement('canvas');canvas.className='cabinetSurface';canvas.setAttribute('aria-hidden','true');painter=cpu(canvas)}
  const lost=e=>{e.preventDefault();onLoss()};canvas.addEventListener('webglcontextlost',lost);parent.append(canvas);
  return Object.assign(painter,{canvas,dispose(){canvas.removeEventListener('webglcontextlost',lost);painter.release();canvas.width=canvas.height=1;canvas.remove()}});
 }
 return {camera,create,blocked,surfaceScale};
})();
