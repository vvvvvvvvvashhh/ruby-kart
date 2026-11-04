const TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t, mod=(x,n)=>(x%n+n)%n;
const C3=new Map();
function rgb(c){if(C3.has(c))return C3.get(c);let s=c.replace('#','');if(s.length===3)s=s.split('').map(k=>k+k).join('');let n=parseInt(s,16);let v=[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];C3.set(c,v);return v}
function spin(v,a){let c=Math.cos(a),s=Math.sin(a);return [v[0]*c+v[2]*s,v[1],v[2]*c-v[0]*s]}
const atlas=document.createElement('canvas');atlas.width=2048;atlas.height=1024;
const ac=atlas.getContext('2d'), tags=new Map();
function atlasTag(str,color,bg){const key=[str,color,bg].join('|');if(tags.has(key))return tags.get(key);
 const id=tags.size%128,x=id%8*256,y=Math.floor(id/8)*64;ac.save();ac.beginPath();ac.rect(x,y,256,64);ac.clip();
 if(bg){ac.fillStyle=bg;ac.fillRect(x,y,256,64)}ac.font='italic 1000 52px Arial, sans-serif';ac.textAlign='center';ac.textBaseline='middle';ac.fillStyle=color;ac.shadowColor='rgba(18,26,43,.77)';ac.shadowOffsetX=2;ac.shadowOffsetY=3;ac.fillText(str,x+128,y+33,249);ac.restore();
 const uv=[(x+.5)/2048,(y+.5)/1024,(x+255.5)/2048,(y+63.5)/1024];tags.set(key,uv);return uv}
// Packed geometric normals stay separate so asset data has its original nine-float stride.
function rubyNormal(x,y,z,two=false){
 const length=Math.hypot(x,y,z)||1;
 return (((Math.round(x/length*127)+128)&255) | (((Math.round(y/length*127)+128)&255)<<8) |
   (((Math.round(z/length*127)+128)&255)<<16) | (two?1<<24:0))>>>0;
}
function faceNormal(a,b,c){
 const ax=b[0]-a[0],ay=b[1]-a[1],az=b[2]-a[2],bx=c[0]-a[0],by=c[1]-a[1],bz=c[2]-a[2];
 return rubyNormal(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx,true);
}
class Geo{
 constructor(){this.d=[];this.norm=[];this.n=0;this.mat=0}
 push(p,c,l=1,u=-1,v=0,m=this.mat,normal=0){this.norm.push(normal);this.d.push(p[0],p[1],p[2],Math.min(1,c[0]*l),Math.min(1,c[1]*l),Math.min(1,c[2]*l),u,v,m)}
 face(a,b,c,d,color,n,uv){let col=rgb(color),normal=n?rubyNormal(n[0],n[1],n[2]):faceNormal(a,b,c);
 let vs=d?[a,b,c,a,c,d]:[a,b,c],us=uv?[0,1,2,0,2,3]:null;for(let i=0;i<vs.length;i++){let t=uv?uv[us[i]]:null;this.push(vs[i],col,1,t?t[0]:-1,t?t[1]:0,this.mat,normal)}}
 tri(a,b,c,color){this.face(a,b,c,null,color,null)}
 quad(a,b,c,d,color){this.face(a,b,c,d,color,null)}
 box(x,y,z,w,h,d,col,yaw=0){let t=(i,j,k)=>{let v=spin([i*w/2,j*h/2,k*d/2],yaw);return [x+v[0],y+v[1],z+v[2]]};
 const f=(a,b,c,d,n)=>this.face(t(...a),t(...b),t(...c),t(...d),col,spin(n,yaw));
 f([-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1],[0,1,0]);f([-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[0,0,-1]);f([1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1],[0,0,1]);f([-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1],[-1,0,0]);f([1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1],[1,0,0]);f([-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1],[0,-1,0])}
 ell(x,y,z,rx,ry,rz,col,sides=12,rings=7){let color=rgb(col),a=[],ct=Math.cos,st=Math.sin;for(let j=0;j<=rings;j++){let p=-Math.PI/2+j*Math.PI/rings,row=[];for(let i=0;i<=sides;i++){let t=(i%sides)*TAU/sides,n=[ct(p)*ct(t),st(p),ct(p)*st(t)];row.push([[x+rx*n[0],y+ry*n[1],z+rz*n[2]],rubyNormal(n[0]/(Math.abs(rx)||1),n[1]/(Math.abs(ry)||1),n[2]/(Math.abs(rz)||1))])}a.push(row)}
 for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){let p=a[j][i],q=a[j][i+1],r=a[j+1][i+1],s=a[j+1][i];let verts=j===0?[p,r,s]:j===rings-1?[p,q,r]:[p,q,r,p,r,s];for(const k of verts)this.push(k[0],color,1,-1,0,this.mat,k[1])}}
 tube(x,y,z,X,Y,Z,r,R,col,sides=12){let l=Math.hypot(X-x,Y-y,Z-z)||1,ax=(X-x)/l,ay=(Y-y)/l,az=(Z-z)/l;let L=Math.hypot(ax,az),u=L?[az/L,0,-ax/L]:[1,0,0],v=[ay*u[2]-az*u[1],az*u[0]-ax*u[2],ax*u[1]-ay*u[0]],first=null,prev=null;
 for(let i=0;i<=sides;i++){let a=i*TAU/sides,n=u.map((k,j)=>k*Math.cos(a)+v[j]*Math.sin(a)),k=[[x+r*n[0],y+r*n[1],z+r*n[2]],[X+R*n[0],Y+R*n[1],Z+R*n[2]],n];if(prev){this.face(prev[0],k[0],k[1],prev[1],col,[(n[0]+prev[2][0])*.5,(n[1]+prev[2][1])*.5,(n[2]+prev[2][2])*.5]);if(i>1){this.face(first[0],prev[0],k[0],null,col,[-ax,-ay,-az]);this.face(first[1],prev[1],k[1],null,col,[ax,ay,az])}}else first=k;prev=k}}
 merge(other,x=0,y=0,z=0,yaw=0,s=1){
  let d=other.d,c=Math.cos(yaw),sn=Math.sin(yaw),ns=other.norm;
  for(let i=0,j=0;i<d.length;i+=9,j++){
   this.d.push(x+s*(d[i]*c+d[i+2]*sn),y+s*d[i+1],z+s*(d[i+2]*c-d[i]*sn),d[i+3],d[i+4],d[i+5],d[i+6],d[i+7],d[i+8]);
   let packed=ns?.[j]||0;
   if(yaw&&packed){let nx=(packed&255)-128,ny=(packed>>8&255)-128,nz=(packed>>16&255)-128;packed=rubyNormal(nx*c+nz*sn,ny,nz*c-nx*sn,!!(packed&(1<<24)))}
   this.norm.push(packed)
  }return this
 }
 label(str,x,y,z,w,h,col='#ffffff',bg){let t=atlasTag(str,col,bg),a=[x-w/2,y+h/2,z],b=[x+w/2,y+h/2,z],c=[x+w/2,y-h/2,z],d=[x-w/2,y-h/2,z];this.face(a,b,c,d,'#ffffff',null,[[t[0],t[1]],[t[2],t[1]],[t[2],t[3]],[t[0],t[3]]])}
}
function disk(rx,rz,col){let g=new Geo();for(let i=0;i<24;i++)g.tri([0,0,0],[rx*Math.cos(i*TAU/24),0,rz*Math.sin(i*TAU/24)],[rx*Math.cos((i+1)*TAU/24),0,rz*Math.sin((i+1)*TAU/24)],col);return g}
// The ice vault changes the mountain's bounce light and haze, while the
// physical sun and its baked world-space shadow map stay fixed at the portal.
const MOUNTAIN_SUN=[-.48,.79,-.38];
const RUBY_LIGHTS={
 park:{sun:[-.53,.776,-.342],low:[.30,.32,.39],high:[.77,.85,.99],direct:[.66,.58,.45],haze:[.66,.84,.96],env:[.62,.87,1],floor:[.34,.46,.25]},
 rainbow:{sun:[-.43,.759,.491],low:[.27,.19,.38],high:[.61,.61,.90],direct:[.50,.59,.81],haze:[.12,.10,.27],env:[.55,.72,1],floor:[.72,.24,.55]},
 harbor:{sun:[-.74,.45,.50],low:[.30,.28,.36],high:[.96,.79,.69],direct:[.80,.54,.31],haze:[.78,.60,.60],env:[.99,.73,.52],floor:[.27,.49,.53]},
 summit:{sun:[.42,.75,-.51],low:[.36,.40,.52],high:[.83,.94,1],direct:[.65,.64,.56],haze:[.65,.79,.90],env:[.65,.85,1],floor:[.72,.82,.92]},
 forge:{sun:[-.61,.54,.58],low:[.38,.21,.24],high:[.65,.57,.74],direct:[.77,.49,.32],haze:[.34,.21,.28],env:[.69,.47,.63],floor:[.82,.26,.09]},
 airport:{sun:[-.43,.79,.43],low:[.31,.37,.43],high:[.85,.93,1],direct:[.68,.62,.52],haze:[.66,.86,.94],env:[.60,.85,1],floor:[.53,.59,.57]},
 wario:{sun:MOUNTAIN_SUN,low:[.34,.39,.54],high:[.89,.96,1],direct:[.71,.65,.54],haze:[.73,.86,.92],env:[.71,.89,1],floor:[.76,.84,.95]},
 icevault:{sun:MOUNTAIN_SUN,low:[.19,.32,.42],high:[.45,.75,.84],direct:[.27,.44,.54],haze:[.23,.43,.52],env:[.31,.71,.87],floor:[.39,.60,.75]},
 garage:{sun:[-.55,.747,-.371],low:[.32,.25,.33],high:[.80,.86,1],direct:[.77,.68,.63],haze:[.13,.08,.18],env:[.76,.89,1],floor:[.55,.19,.23]}
};
// Materials: 0 standard, 1 asphalt, 2 LED tile, 3 enamel, 4 metal, 5 lamp,
// 6 translucent shadow, 7 ghost. Rainbow glass stores its broad colour phase in 8..9.
// Material 9 is open water: it reflects the sky and sun without a second scene draw.
// The same transform and projection expressions serve single objects and a
// bank of scenery transforms. Twelve slots fit minimum WebGL 1 VS limits.
// Section lighting uses the ambient, reflection and direct-light uniforms of the
// existing material pass. Each cue is [enter, full, release, exit, source] in lap
// fractions. The sunlight direction is immutable so every baked caster stays put.
const courseLightFields=['low','high','direct','haze','env','floor'];
const courseLightUniforms=['sun','low','high','direct','haze','env'];
const sectionLight=(()=>{
 const cues={
  park:[[.19,.27,.38,.47,'marquee'],[.64,.72,.80,.88,'foliage']],
  rainbow:[[.045,.12,.24,.30,'starlight'],[.47,.54,.68,.76,'violet']],
  harbor:[[.24,.28,.36,.42,'arcade'],[.60,.65,.72,.78,'sea']],
  summit:[[.31,.37,.43,.49,'foliage'],[.49,.55,.67,.72,'ice']],
  forge:[[.12,.17,.24,.29,'iron'],[.37,.43,.49,.55,'furnace'],[.66,.72,.79,.85,'furnace']],
  airport:[[.931,.967,1.069,1.126,'glass'],[.262,.292,.311,.337,'hangar'],[.389,.43,.49,.53,'sea']],
  wario:[[.219,.243,.322,.348,'vault'],[.45,.49,.55,.59,'foliage'],[.754,.781,.818,.848,'ice']]
 };
 // Reflected RGB, sky exposure and direct-light exposure. A shaded market
 // receives warm stone bounce while the roof attenuates the solar highlight.
 const sources={
  marquee:[[1,.68,.34],1.01,1.04,.17],foliage:[[.34,.56,.41],.82,.73,.12],
  starlight:[[.36,.76,1],1.07,1.04,.16],violet:[[.78,.42,1],.95,1.05,.16],
  arcade:[[.77,.49,.29],.79,.66,.16],sea:[[.38,.81,1],1.04,1.04,.14],
  ice:[[.47,.84,1],1.06,1,.16],iron:[[.44,.29,.37],.82,.72,.11],
  furnace:[[1,.33,.09],.93,.84,.35],glass:[[.49,.85,.87],.89,.79,.16],
  hangar:[[.43,.52,.65],.75,.58,.15]
 };
 const cache={};
 for(const id in cues){
  const base=RUBY_LIGHTS[id],targets=cache[id]={};
  for(const cue of cues[id]){
   const kind=cue[4];if(targets[kind])continue;
   if(kind==='vault'){targets[kind]=RUBY_LIGHTS.icevault;continue}
   const [rgb,sky,direct,bounce]=sources[kind],target=targets[kind]={sun:base.sun};
   for(const key of courseLightFields){
    const multiplier=key==='direct'?direct:key==='haze'?1+(sky-1)*.55:sky;
    const strength=key==='direct'?0:key==='haze'?.32:key==='high'?.52:key==='floor'?1.15:1;
    target[key]=base[key].map((v,c)=>Math.min(1.18,v*multiplier+bounce*strength*rgb[c]));
   }
  }
 }
 return function lightAt(id,f,time,out){
  const base=RUBY_LIGHTS[id]||RUBY_LIGHTS.park,list=cues[id];if(!list)return base;
  for(const [a,b,c,d,kind] of list){
   const pos=d>1&&f<a?f+1:f;
   if(pos<=a||pos>=d)continue;
   let t=pos<b?(pos-a)/(b-a):pos>c?(d-pos)/(d-c):1;t=t*t*(3-2*t);
   if(kind==='furnace')t*=.93+.045*Math.sin(time*2.1)+.025*Math.sin(time*3.47+.8);
   const level=Math.round(t*256);
   if(!level)return base;
   const target=cache[id][kind];if(level===256)return target;
   if(out.sun===base.sun&&out.kind===kind&&out.level===level)return out;
   out.kind=kind;out.level=level;out.revision++;out.sun=base.sun;
   for(const key of courseLightFields){
    const v=out[key],from=base[key],to=target[key];for(let k=0;k<3;k++)v[k]=from[k]+(to[k]-from[k])*level/256;
   }
   return out;
  }
  return base;
 };
})();
function lightScratch(){
 const out={revision:0};for(const key of courseLightFields)out[key]=new Float32Array(3);return out;
}
const SCENE_SLOTS=12;
function meshVertex(palette){
 const transforms=palette?
  `attribute float aSlot;uniform vec3 origins[${SCENE_SLOTS}];uniform vec4 objects[${SCENE_SLOTS}];uniform vec2 tilts[${SCENE_SLOTS}];`:
  'uniform vec3 origin;uniform vec4 obj;uniform vec2 tilt;';
 const select=palette?'int slot=int(aSlot);vec3 origin=origins[slot];vec4 obj=objects[slot];vec2 tilt=tilts[slot];':'';
 return `attribute vec3 aP,aC,aT;attribute vec4 aN;
 uniform vec3 cam;uniform vec4 basis,proj;${transforms}
 varying vec3 color,tex,norm,world;varying float dist,two;
 vec3 rotateObj(vec3 a,vec4 obj,vec2 tilt){
  vec3 p=vec3(a.x*tilt.y-a.y*tilt.x,a.x*tilt.x+a.y*tilt.y,a.z);
  float sp=sin(obj.w),cp=cos(obj.w);p=vec3(p.x,p.y*cp+p.z*sp,p.z*cp-p.y*sp);
  return vec3(obj.y*p.x+obj.x*p.z,p.y,obj.y*p.z-obj.x*p.x);
 }
 void main(){${select}
  world=rotateObj(aP*obj.z,obj,tilt)+origin;norm=rotateObj(aN.xyz,obj,tilt);two=aN.w;
  vec3 d=world-cam;float forward=dot(d.xz,basis.xy),z=forward*basis.w+d.y*basis.z;
  gl_Position=vec4(dot(d.xz,vec2(basis.y,-basis.x))*proj.x,(d.y*basis.w-forward*basis.z)*proj.y,proj.z*z+proj.w,z);
  color=aC;tex=aT;dist=z;
 }`;
}
const vertex=meshVertex(false),batchVertex=meshVertex(true);
function meshFragment(cutout){return `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 color,tex,norm,world;varying float dist,two;
uniform vec3 cam,sun,low,high,direct,haze,env,groundTint;
uniform float opacity,staticAmount,farMix,focusBias,pixelFocal;uniform sampler2D atlas,sceneDepth,actorDepth,distantDepth,focusDepth;uniform vec4 shadowUV,actorUV,distantUV,focusUV;uniform vec2 sunSlope,shadowBias;
#ifdef GL_FRAGMENT_PRECISION_HIGH
uniform highp sampler2D stampDepth,stampIndex,detailDepth;
#else
uniform mediump sampler2D stampDepth,stampIndex,detailDepth;
#endif
uniform vec4 stampGrid,starLight,detailUV;uniform vec3 detailWrap;
float heightAt(vec2 h){
 return (h.x*1020.-512.)+h.y*3.984375;
}
float visibility(vec4 heights,vec4 receiver,vec2 f){
 vec4 v=clamp((heights-receiver)*16.+.5,0.,1.);
 return mix(mix(v.x,v.y,f.x),mix(v.z,v.w,f.x),f.y);
}
float occlusion(sampler2D map,vec4 domain,vec2 point,float h,vec2 gradient,float phase){
 vec2 uv=(point-domain.xy)*domain.z;
 if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)return 0.;
 vec2 px=uv*domain.w-.5,fr=fract(px),st=(floor(px)+.5)/domain.w;
 vec2 delta=vec2(1./domain.w,0.),slope=gradient/(domain.z*domain.w);
 float base=h-dot(slope,fr);
 vec4 receiver=base+vec4(0.,slope.x,slope.y,slope.x+slope.y);
 vec4 a=texture2D(map,st),b=texture2D(map,st+delta),c=texture2D(map,st+delta.yx),d=texture2D(map,st+delta+delta.yx);
 float now=visibility(vec4(heightAt(a.ra),heightAt(b.ra),heightAt(c.ra),heightAt(d.ra)),receiver,fr);
 if(phase>=1.)return now;
 // Only the distant RGBA map carries the preceding pose in GB.
 float old=visibility(vec4(heightAt(a.gb),heightAt(b.gb),heightAt(c.gb),heightAt(d.gb)),receiver,fr);
 return mix(old,now,phase);
}
float staticShade(vec2 beam,float h,vec2 grad){
 // Within the lit window, use the fine bake directly, including empty texels.
 // A missing tile is not illuminated ground; fall through to the course bake.
 if(detailUV.w>0.){
  vec2 uv=(beam-detailUV.xy)*detailUV.z;
  float edge=min(min(uv.x,uv.y),1.-max(uv.x,uv.y))/detailUV.z;
  if(edge>1.5){
   float density=detailUV.z*detailUV.w;
#ifdef GL_FRAGMENT_PRECISION_HIGH
   // Phase filtering on the world texel grid, independent of the sliding origin.
   vec2 px=beam*density-.5,fr=fract(px),p=floor(px)-floor(detailUV.xy*density+.5)+detailWrap.xy;
#else
   vec2 px=(beam-detailUV.xy)*density-.5,fr=fract(px),p=floor(px)+detailWrap.xy;
#endif
   vec2 lo=(mod(p,detailUV.w)+.5)/detailUV.w,hi=(mod(p+1.,detailUV.w)+.5)/detailUV.w;
   vec2 a=texture2D(detailDepth,lo).ra,b=texture2D(detailDepth,vec2(hi.x,lo.y)).ra;
   vec2 c=texture2D(detailDepth,vec2(lo.x,hi.y)).ra,d=texture2D(detailDepth,hi).ra;
   if(max(max(min(a.x,a.y),min(b.x,b.y)),max(min(c.x,c.y),min(d.x,d.y)))<.999){
    vec2 slope=grad/(detailUV.w*detailUV.z);
    vec4 recv=h+detailWrap.z-dot(slope,fr)+vec4(0.,slope.x,slope.y,slope.x+slope.y);
    float fine=visibility(vec4(heightAt(a),heightAt(b),heightAt(c),heightAt(d)),recv,fr);
    if(edge>=4.)return fine;
    return mix(occlusion(sceneDepth,shadowUV,beam,h+shadowBias.x,grad,1.),fine,smoothstep(1.5,4.,edge));
   }
  }
 }
 return occlusion(sceneDepth,shadowUV,beam,h+shadowBias.x,grad,1.);
}
float unpack16(vec2 v){vec2 bytes=floor(v*255.+.5);return bytes.x*256.+bytes.y;}
float stampShade(float id,vec2 point,float h,vec2 gradient){
 float slot=floor(id*255.+.5)-1.,u=(slot+.5)/128.;
 vec4 pos=texture2D(stampIndex,vec2(u,128.5/131.));
 vec2 origin=vec2(unpack16(pos.rg),unpack16(pos.ba))/96.-128.+stampGrid.xy;
 vec4 size=texture2D(stampIndex,vec2(u,129.5/131.));
 float span=unpack16(size.rg)/128.,oy=(unpack16(size.ba)-32768.)/64.;
 vec2 unit=(point-origin)/max(span,.001);if(min(unit.x,unit.y)<0.||max(unit.x,unit.y)>=1.)return 0.;
 float n=floor(texture2D(stampIndex,vec2(u,130.5/131.)).r*255.+.5),cell=span/n;
 vec2 px=unit*n-.5,fr=fract(px),lo=clamp(floor(px),0.,n-1.),hi=clamp(floor(px)+1.,0.,n-1.);
 vec2 offset=vec2(mod(slot,8.),floor(slot/8.))*stampGrid.z+.5;float inv=1./(8.*stampGrid.z);
 vec2 st=(lo+offset)*inv,ed=(hi+offset)*inv,slope=gradient*cell;
 float base=h-oy+max(.03125,min(.14,.024+cell*.4))-dot(slope,fr);
 vec4 recv=base+vec4(0.,slope.x,slope.y,slope.x+slope.y);
 vec4 samples=vec4(heightAt(texture2D(stampDepth,st).ra),heightAt(texture2D(stampDepth,vec2(ed.x,st.y)).ra),heightAt(texture2D(stampDepth,vec2(st.x,ed.y)).ra),heightAt(texture2D(stampDepth,ed).ra));
 return visibility(samples,recv,fr);
}
float regionalShade(vec2 point,float h,vec2 gradient,float shade){
 vec2 bin=floor((point-stampGrid.xy)/3.);
 if(min(bin.x,bin.y)<0.||max(bin.x,bin.y)>=128.)return shade;
 vec4 ids=texture2D(stampIndex,(bin+.5)/vec2(128.,131.));
 if(ids.r>0.)shade=max(shade,stampShade(ids.r,point,h,gradient));
 if(ids.g>0.&&shade<1.)shade=max(shade,stampShade(ids.g,point,h,gradient));
 if(ids.b>0.&&shade<1.)shade=max(shade,stampShade(ids.b,point,h,gradient));
 if(ids.a>0.&&shade<1.)shade=max(shade,stampShade(ids.a,point,h,gradient));
 return shade;
}
void main(){
 float kind=tex.z;
 ${cutout?`if(kind>6.5&&kind<7.5){
   vec2 px=floor(gl_FragCoord.xy);
   if(mod(px.x+px.y,3.)<1.5)discard;
   vec3 edge=normalize(norm);float glow=pow(1.-abs(dot(edge,normalize(cam-world))),2.);
   gl_FragColor=vec4(mix(vec3(.09,.66,.82),vec3(.77,1.,1.),.27+glow*.64),1.);return;
 }`:''}
 if(kind>5.5&&kind<6.5){gl_FragColor=vec4(.035,.023,.064,color.r*opacity);return;}
 vec3 col=color;
 vec3 N=normalize(norm),V=normalize(cam-world);
 ${cutout?`if(kind>7.5&&kind<9.){
   // Projected width of one glass module along its foreshortened axis.
   // Subpixel diodes, grout, then the alternating hues converge in that order.
   float pixels=1.9*pixelFocal*abs(dot(N,V))/max(1.,dist);
   vec3 ribbon=clamp(abs(fract(kind-8.+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.);
   col=mix(vec3(.49,.525,.575)+vec3(.23,.24,.24)*ribbon,color,.06+.94*smoothstep(.92,4.4,pixels));
   if(tex.x>=0.&&pixels>6.)col=mix(col,texture2D(atlas,tex.xy).rgb,smoothstep(6.,31.,pixels));
   kind=2.;
 }else if(kind>2.11&&kind<2.14){
   vec3 printMask=texture2D(atlas,tex.xy).rgb;
   float sd=(printMask.r*255.-128.)/512.;
   float span=1.472*pixelFocal*abs(dot(N,V))/max(.22,dist);
   float aa=clamp(.75/max(span,1.),.007,.16),resolved=smoothstep(2.,10.,span);
   float rim=clamp(.5+(.025-sd)/(2.*aa),0.,1.)*resolved;
   float ink=clamp(.5-sd/(2.*aa),0.,1.)*resolved;
   col+=vec3(.07)*printMask.g+.028*(printMask.b-.5)*resolved;
   col=mix(col,vec3(.275,.35,.46),rim*.64);
   col=mix(col,vec3(.99,.975,.90),ink);
 }else if(tex.x>=0.){vec4 t=texture2D(atlas,tex.xy);if(t.a<.35)discard;col*=t.rgb;}`:''}
 // The three bridge fascia strips keep their individual panels up close.
 // At a grazing angle many paints share a pixel; resolve to the wider hue.
 if(kind>=10.&&kind<12.){
  float px=1.9*pixelFocal*abs(dot(N,V))/max(1.,dist),emissive=step(11.,kind);
  vec3 ribbon=clamp(abs(fract(kind+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.);
  vec3 mean=mix(vec3(.225,.243,.275),vec3(.37,.40,.44),emissive)+ribbon*mix(.07,.13,emissive);
  col=mix(mean,col,smoothstep(1.1,5.8,px));kind=mix(4.,2.,emissive);
 }
 if(two>.5&&dot(N,V)<0.)N=-N;
 float hemi=clamp(N.y*.5+.5,0.,1.),nd=max(dot(N,sun),0.),nv=max(dot(N,V),0.);
 vec3 irradiance=mix(low,high,hemi)+direct*nd;
 vec3 c=col*sqrt(irradiance);
 if(kind>8.99){
   vec3 ray=reflect(-V,N);float grazing=1.-clamp(ray.y,0.,1.),shine=max(dot(ray,sun),0.);
   float s2=shine*shine,s4=s2*s2,s8=s4*s4,s16=s8*s8;
   float level=.08+.59*grazing*grazing*grazing+(.19+.51*grazing)*s16*s8;
   c=mix(col*.94,env*.84+.12,min(level,.72))+max(0.,level-.64)*vec3(.81,.73,.52);
   kind=1.; // Water receives the same dock and boat shadows as the banks.
 }else if(kind>1.5&&kind<2.5)c=col*(1.025+.055*hemi)+vec3(.018,.010,.021);
 else if(kind>4.5&&kind<5.5)c=col*1.04+vec3(.045,.032,.024);
 else if(kind>2.5&&kind<4.5){
   float metal=step(3.5,kind),rough=mix(56.,85.,metal);
   float nh=max(dot(N,normalize(V+sun)),0.),fr=pow(1.-nv,4.);
   vec3 refl=reflect(-V,N);float facing=dot(refl,sun);
   float shelf=1.-smoothstep(.035,.22,abs(refl.y-(.25+.24*facing)));
   float band=1.-smoothstep(.025,.14,abs(refl.y+.06-.10*facing));
   vec3 reflected=mix(groundTint,env,smoothstep(-.12,.75,refl.y));
   float glint=pow(nh,rough)*(.55+.35*metal)+.105*pow(nh,12.);
   c=mix(c,reflected,mix(.052,.25,metal)+(.19+.12*metal)*fr);
   c+=glint*mix(vec3(1.,.96,.87),col*.32+.68,metal)+env*(shelf*(.09+.17*metal)-band*(.034+.05*metal));
 }else if(kind<.5){
   float nh=max(dot(N,normalize(V+sun)),0.);c+=pow(nh,28.)*.033;
 }
 if(kind>.5&&kind<1.5&&dist<70.){
   float footprint=.20*pixelFocal*nv/max(dist,1.);
   if(footprint>.70){
    vec2 cell=floor(mod(world.xz,22.)*5.);
    float gr=fract(sin(dot(cell,vec2(1.436,7.138)))*432.78);
    c+=(gr-.5)*.042*smoothstep(.70,2.35,footprint)*(1.-smoothstep(23.,70.,dist));
   }
 }
 if(shadowUV.w>0.&&kind<4.5&&abs(kind-2.125)>.005){
   vec2 beam=world.xz-world.y*sunSlope;
   float facing=N.y+dot(N.xz,sunSlope);
   vec2 gradient=clamp(-N.xz/(facing<0.?min(facing,-.015):max(facing,.015)),-6.25,6.25);
   // Direct irradiance tends to zero on a plane almost parallel to the sun.
   // Fade before its receiver gradient exceeds the resolvable range.
   float directVisibility=1.-smoothstep(5.,6.25,max(abs(gradient.x),abs(gradient.y)));
   vec2 nearUV=(beam-actorUV.xy)*actorUV.z;
   float edge=min(min(nearUV.x,nearUV.y),1.-max(nearUV.x,nearUV.y))*actorUV.w;
   float motion=edge>0.?occlusion(actorDepth,actorUV,beam,world.y+shadowBias.y,gradient,1.):0.;
   if(distantUV.w>0.&&edge<2.){
    float bias=.28+.30/(distantUV.z*distantUV.w);
    float wide=occlusion(distantDepth,distantUV,beam,world.y+bias,gradient,farMix);
    motion=mix(wide,motion,smoothstep(0.,2.,edge));
   }
   float shade=max(staticShade(beam,world.y,gradient)*staticAmount,motion);
   if(focusUV.w>0.)shade=max(shade,occlusion(focusDepth,focusUV,beam,world.y+focusBias,gradient,1.));
   if(stampGrid.w>0.&&shade<1.)shade=regionalShade(beam,world.y,gradient,shade);
   // A roof can cover the whole face. Grazing and back-facing cheeks
   // have little direct sunlight to remove, but keep all of their skylight.
   if(abs(kind-.25)<.015||abs(kind-4.25)<.015){
     float sky=mix(low.g,high.g,hemi);
     directVisibility=(1.-sqrt(sky/irradiance.g))/.275;
   }
   c*=1.-shade*directVisibility*vec3(.30,.275,.221);
 }
 if(starLight.a>0.){
   float shine=.28+.72*dot(clamp(c,0.,1.),vec3(.22,.64,.14));
   c=mix(c,c*.43+starLight.rgb*shine,starLight.a);
 }
 c=mix(c,haze,smoothstep(102.,600.,dist)*.83);
 gl_FragColor=vec4(c,1.);
}`}
const fragment=meshFragment(true),solidFragment=meshFragment(false);
function readyNormals(mesh){
 if(mesh.norm8)return mesh.norm8;
 let d=mesh.d,n=mesh.n||d.length/9,norm8=new Int8Array(n*4),s=mesh.norm,indicesMatch=s?.length===n;
 for(let i=0;i<n;i+=3){
  let j=i*9,dx=d[j+9]-d[j],dy=d[j+10]-d[j+1],dz=d[j+11]-d[j+2],ex=d[j+18]-d[j],ey=d[j+19]-d[j+1],ez=d[j+20]-d[j+2],recover=0;
  for(let k=0;k<3;k++){
   let p=(indicesMatch&&s[i+k])||(recover||(recover=rubyNormal(dy*ez-dz*ey,dz*ex-dx*ez,dx*ey-dy*ex,true))),q=(i+k)*4;
   norm8[q]=(p&255)-128;norm8[q+1]=(p>>>8&255)-128;norm8[q+2]=(p>>>16&255)-128;norm8[q+3]=(p&(1<<24))?127:0;
  }
 }mesh.norm8=norm8;if(mesh.norm&&!(mesh.norm instanceof Uint32Array))mesh.norm=new Uint32Array(mesh.norm);return norm8;
}
// Index the original attribute tuples. Every position, color, UV and normal keeps its exact bits.
function indexedMesh(mesh) {
 const data=mesh.d, n=mesh.n, words=new Uint32Array(data.buffer,data.byteOffset,data.length);
 const normal=new Uint32Array(readyNormals(mesh).buffer);
 let size=1;while(size<n*1.5)size*=2;
 const table=new Int32Array(size),first=new Uint32Array(n),indices=new Uint16Array(n);
 let count=0;
 for(let i=0;i<n;i++){
  const offset=i*9;
  // Position, normal and colour distribute corners cheaply. The probe below
  // still compares all ten words, so UV seams and material boundaries survive.
  let hash=Math.imul(words[offset],0x9e3779b1)^Math.imul(words[offset+1],0x85ebca77)^Math.imul(words[offset+2],0xc2b2ae3d)^words[offset+3]^normal[i];
  hash=Math.imul(hash^(hash>>>16),0x85ebca6b);
  let slot=(hash^(hash>>>16))&(size-1);
  for(;;){
   const index=table[slot]-1;
   if(index<0){
    if(count===65536)return null;
    first[count]=i;table[slot]=count+1;indices[i]=count++;break;
   }
   const prev=first[index],base=prev*9;
   let j=0;if(normal[prev]===normal[i])while(j<9&&words[base+j]===words[offset+j])j++;
   if(j===9){indices[i]=index;break}
   slot=(slot+1)&(size-1);
  }
 }
 if(count*40+n*2>=n*40)return null;
 const verts=new Float32Array(count*9),norm=new Uint32Array(count);
 for(let j=0;j<count;j++){const i=first[j];for(let k=0;k<9;k++)verts[j*9+k]=data[i*9+k];norm[j]=normal[i]}
 return {verts,norm:new Int8Array(norm.buffer),indices};
}
// Tight local boxes stay valid for all instances of the same immutable geometry.
const localBoxes=new WeakMap();
function localBox(mesh){
 if(localBoxes.has(mesh))return localBoxes.get(mesh);
 const d=mesh.d;let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity;
 for(let i=0;i<d.length;i+=9){x0=Math.min(x0,d[i]);x1=Math.max(x1,d[i]);y0=Math.min(y0,d[i+1]);y1=Math.max(y1,d[i+1]);z0=Math.min(z0,d[i+2]);z1=Math.max(z1,d[i+2])}
 const box={x:(x0+x1)*.5,y:(y0+y1)*.5,z:(z0+z1)*.5,hx:(x1-x0)*.5,hy:(y1-y0)*.5,hz:(z1-z0)*.5};
 localBoxes.set(mesh,box);return box;
}
function placedBox(o){
 const b=localBox(o.g),sn=Math.sin(o.yaw),cs=Math.cos(o.yaw),s=o.scale;
 return {x:o.x+(b.x*cs+b.z*sn)*s,y:o.y+b.y*s,z:o.z+(b.z*cs-b.x*sn)*s,
  hx:(b.hx*Math.abs(cs)+b.hz*Math.abs(sn))*s,hy:b.hy*s,hz:(b.hz*Math.abs(cs)+b.hx*Math.abs(sn))*s};
}
// Canvas backing sizes follow CSS layout, independent of the running HUD and sensor animation.
function observeCanvasSize(canvas) {
 let size=canvas.getBoundingClientRect();
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(entries=>{size=entries[0].contentRect});observer.observe(canvas);
  return ()=>size;
 }
 return ()=>({width:canvas.clientWidth||canvas.getBoundingClientRect().width,height:canvas.clientHeight||canvas.getBoundingClientRect().height});
}
const fxVertex=`attribute vec3 aP,aC,aT;
 uniform vec3 cam;uniform vec4 basis,proj;varying mediump vec4 tint;
 void main(){vec3 d=aP-cam;float f=dot(d.xz,basis.xy),z=f*basis.w+d.y*basis.z;
 gl_Position=vec4(dot(d.xz,vec2(basis.y,-basis.x))*proj.x,(d.y*basis.w-f*basis.z)*proj.y,proj.z*z+proj.w,z);tint=vec4(aC,aT.y);}`;
const fxFragment='precision mediump float;varying mediump vec4 tint;void main(){gl_FragColor=tint;}';
function makeProgram(gl,cache,vs,fs,names){
 const program=gl.createProgram();
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
   let sh=cache.get(source);
   if(!sh){sh=gl.createShader(type);cache.set(source,sh);gl.shaderSource(sh,source);gl.compileShader(sh)}
   gl.attachShader(program,sh);
  }
  // Stable attribute locations allow the two scene programs to use compatible VAOs.
  ['aP','aC','aT','aN','aSlot'].forEach((name,i)=>gl.bindAttribLocation(program,i,name));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'GPU scene program');
  const uniforms={};for(const name of names)uniforms[name]=gl.getUniformLocation(program,name);
  return {program,u:uniforms,frame:-1};
 }catch(e){gl.deleteProgram(program);throw e}
}
// The fast opaque program has no pixel kill. Mobile tile renderers can
// reject hidden fragments before the clear-coat and reflection lighting.
const solidMeshes=new WeakMap();
function solidMesh(g){
 if(solidMeshes.has(g))return solidMeshes.get(g);
 const d=g.d;let solid=true;
 for(let i=0;i<d.length;i+=9)if(d[i+6]>=0||(d[i+8]>=5.5&&d[i+8]<9)){solid=false;break}
 solidMeshes.set(g,solid);return solid;
}
function sceneVisible(r,o){
 const p=o.center||o;if(!r.vis(p.x,p.y,p.z,o.r))return false;
 if(o.anim)return true;
 const b=o.worldBox||(o.worldBox=placedBox(o));
 if(!r.boxVisible(b))return false;
 // Past the former horizon tiny separate props disappear into the haze.
 // Bound their full projected diameter conservatively in all orientations.
 const depth=((b.x-r.cam.x)*r.s+(b.z-r.cam.z)*r.c)*r.cp+(b.y-r.cam.y)*r.sp;
 if(depth<390)return true;
 const diameter=2*(b.hx+b.hy+b.hz);
 return diameter*r.f*r.renderHeight*.5>=.95*(depth-diameter*.5);
}
function scenePose(chunk,i,x,y,z,yaw,scale,roll,pitch){
 const j=i*3,k=i*4;chunk.origins[j]=x;chunk.origins[j+1]=y;chunk.origins[j+2]=z;
 chunk.objects[k]=Math.sin(yaw);chunk.objects[k+1]=Math.cos(yaw);chunk.objects[k+2]=scale;chunk.objects[k+3]=pitch;
 chunk.tilts[i*2]=Math.sin(roll);chunk.tilts[i*2+1]=Math.cos(roll);
}
// A distant decoration may move a vertex by at most a screen pixel. Only
// repeated scenery and the distant rival mesh use these render-only copies.
function detailCopy(g,cell){
 if(g.farDetail!==undefined)return g.farDetail;
 const d=g.d,box=localBox(g),minX=box.x-box.hx,minY=box.y-box.hy,minZ=box.z-box.hz;
 const nx=Math.floor(2*box.hx/cell)+2,ny=Math.floor(2*box.hy/cell)+2;
 const key=i=>Math.floor((d[i]-minX)/cell)+nx*(Math.floor((d[i+1]-minY)/cell)+ny*Math.floor((d[i+2]-minZ)/cell));
 const cells=new Map(),n=d.length/9,vertices=new Array(n);
 for(let j=0;j<n;j++){
  const i=j*9,k=key(i);let c=cells.get(k);
  if(!c){c={x:0,y:0,z:0,n:0};cells.set(k,c)}
  c.x+=d[i];c.y+=d[i+1];c.z+=d[i+2];c.n++;vertices[j]=c;
 }
 for(const c of cells.values()){c.x/=c.n;c.y/=c.n;c.z/=c.n}
 const out=new Geo();let error=0;
 for(let j=0;j<n;j+=3){
  const a=vertices[j],b=vertices[j+1],c=vertices[j+2];
  // Bound the displacement of removed triangles too.
  for(let k=j;k<j+3;k++){const v=vertices[k],i=k*9;error=Math.max(error,(v.x-d[i])**2+(v.y-d[i+1])**2+(v.z-d[i+2])**2)}
  if(a===b||b===c||a===c)continue;
  for(let k=j;k<j+3;k++){
   const i=k*9,v=vertices[k];out.d.push(v.x,v.y,v.z,d[i+3],d[i+4],d[i+5],d[i+6],d[i+7],d[i+8]);out.norm.push(g.norm[k]);
  }
 }
 if(!out.d.length||out.d.length>n*9*.86){g.farDetail=null;return null}
 out.d=new Float32Array(out.d);out.norm=new Uint32Array(out.norm);out.n=out.d.length/9;out.smoothActor=g.smoothActor;
 out.error=Math.sqrt(error);g.farDetail=out;return out;
}
const preparedScenery=new WeakSet();
function prepareScenery(props){
 if(preparedScenery.has(props))return;
 preparedScenery.add(props);
 const uses=new Map();for(const o of props)uses.set(o.g,(uses.get(o.g)||0)+1);
 for(const [g,count] of uses){
  // Roads, unique landscape chunks, animated deck wave tiles and their
  // shadow/collision geometry retain the exact meshes built by the course.
  if(count<2||g.shadowHull||g.d.length<60*27)continue;
  const b=localBox(g),cell=clamp(Math.max(b.hx,b.hy,b.hz)*.11,.25,.85);
  detailCopy(g,cell);
 }
}
function sceneryMesh(r,o){
 const g=o.g,proxy=g.farDetail;if(!proxy)return g;
 const b=o.worldBox||(o.worldBox=placedBox(o)),dx=b.x-r.cam.x,dy=b.y-r.cam.y,dz=b.z-r.cam.z;
 const depth=(dx*r.s+dz*r.c)*r.cp+dy*r.sp;
 const boxRadius=b.hx*Math.abs(r.s*r.cp)+b.hy*Math.abs(r.sp)+b.hz*Math.abs(r.c*r.cp);
 const radius=o.anim?Math.max(boxRadius,o.r):boxRadius;
 const focal=r.f*r.renderHeight*.5;
 const far=proxy.error*o.scale*focal<(o.wasFar?1.08:.82)*Math.max(0,depth-radius);
 o.wasFar=far;
 return far?proxy:g;
}
function sceneryPlan(props,instance=false){
 prepareScenery(props);
 const chunks=[],uses=new Map(),groups=new Map();let list=[],vertices=0;
 for(const o of props)uses.set(o.g,1+(uses.get(o.g)||0));
 function seal(){
  if(list.length){
   const chunk={props:list,buf:null};chunks.push(chunk);
   if(list.length>1){
    chunk.origins=new Float32Array(list.length*3);chunk.objects=new Float32Array(list.length*4);chunk.tilts=new Float32Array(list.length*2);
    list.forEach((o,i)=>scenePose(chunk,i,o.x,o.y,o.z,o.yaw,o.scale,0,0));
   }
  }
  list=[];vertices=0;
 }
 for(const o of props){
  const n=(o.g.d.length+(o.g.farDetail?.d.length||0))/9;
  const copies=uses.get(o.g);
  if(instance&&(copies>=14||copies>=4&&n>2000&&n*(copies-1)>6000)){
   let group=groups.get(o.g);if(!group){group=[];groups.set(o.g,group)}group.push(o);continue;
  }
  // Landmarks reused throughout a course should share one GPU copy.
  if(n>2000&&n*(uses.get(o.g)-1)>6000){seal();chunks.push({props:[o]});continue}
  if(list.length>=SCENE_SLOTS||vertices+n>42000)seal();
  list.push(o);vertices+=n;if(n>42000)seal();
 }
 seal();chunks.instances=[...groups.values()];return chunks;
}
class Motor{
 constructor(canvas){
  this.cv=canvas;this.cssSize=observeCanvasSize(canvas);this.theme='park';this.sectionLight=lightScratch();this.buffers=new WeakMap();this.opacity=1;
  this.g=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!this.g){
   if(typeof Worker==='function'&&typeof OffscreenCanvas==='function'&&OffscreenCanvas.prototype.transferToImageBitmap){
    try{this.cpu=new WorkerRaster(this)}catch{}
   }
   if(this.cpu&&typeof ImageBitmapRenderingContext==='function'){
    try{this.presenter=canvas.getContext('bitmaprenderer',{alpha:true})}catch{}
   }
   if(!this.presenter)this.ctx=canvas.getContext('2d',{alpha:true});
   if(!this.cpu)this.cpu=new SoftRaster();return
  }
  const gl=this.g;this.vao=gl.getExtension('OES_vertex_array_object');
  const timer=gl.getExtension('EXT_disjoint_timer_query');if(timer?.createQueryEXT)this.gpuTimer=timer;
  this.multi=gl.getExtension('WEBGL_multi_draw');this.scenePlans=new WeakMap();this.meshGroups=new WeakMap();
  this.instances=gl.getExtension('ANGLE_instanced_arrays');
  this.counts=new Int32Array(SCENE_SLOTS);this.offsets=new Int32Array(SCENE_SLOTS);this.glFrame=0;
  const viewNames=['cam','basis','proj'],lightNames=['starLight','stampGrid','stampDepth','stampIndex','atlas','haze','sun','low','high','direct','env','groundTint','opacity','sunSlope','shadowUV','actorUV','shadowBias','sceneDepth','actorDepth','detailDepth','detailUV','detailWrap','distantDepth','distantUV','focusDepth','focusUV','staticAmount','farMix','focusBias','pixelFocal'];
  const cache=new Map();
  try{
   this.base=makeProgram(gl,cache,vertex,fragment,[...viewNames,...lightNames,'origin','obj','tilt']);
   // Invalid optional shader/extension combinations can still draw the original objects one by one.
   try{this.batched=makeProgram(gl,cache,batchVertex,fragment,[...viewNames,...lightNames,'origins[0]','objects[0]','tilts[0]'])}catch{this.batched=null}
   try{
    this.solid=makeProgram(gl,cache,vertex,solidFragment,[...viewNames,...lightNames,'origin','obj','tilt']);
    if(this.batched)this.solidBatch=makeProgram(gl,cache,batchVertex,solidFragment,[...viewNames,...lightNames,'origins[0]','objects[0]','tilts[0]']);
   }catch{} // Unusual shader compilers can use the general program for every material.
   this.fxProgram=makeProgram(gl,cache,fxVertex,fxFragment,viewNames);
  }finally{for(const shader of cache.values())gl.deleteShader(shader)}
  this.u=this.base.u;this.a=[0,1,2,3];gl.useProgram(this.base.program);this.active=this.base;
  this.tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.tx);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,atlas.width,atlas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  this.atlasCount=0;this.atlasScratch=[];
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.uniform1f(this.u.opacity,1);
 }
 bindGeometry(buf){
  const gl=this.g;gl.bindBuffer(gl.ARRAY_BUFFER,buf.verts);
  for(let j=0;j<3;j++){gl.enableVertexAttribArray(this.a[j]);gl.vertexAttribPointer(this.a[j],3,gl.FLOAT,false,36,j*12)}
  gl.bindBuffer(gl.ARRAY_BUFFER,buf.norm);gl.enableVertexAttribArray(this.a[3]);gl.vertexAttribPointer(this.a[3],4,gl.BYTE,true,4,0);
  gl.disableVertexAttribArray(4);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.index);
 }
 useProgram(shader){
  const gl=this.g,u=shader.u;
  if(this.active!==shader){gl.useProgram(shader.program);this.active=shader;this.last=null}
  const tint=this.starTint||0;
  if(shader.starTint!==tint&&u.starLight){
   gl.uniform4f(u.starLight,(tint>>>16&255)/255,(tint>>>8&255)/255,(tint&255)/255,(tint>>>24)/255);
   shader.starTint=tint;
  }
  if(shader.frame===this.glFrame)return;
  shader.frame=this.glFrame;const c=this.cam;
  gl.uniform4f(u.basis,this.s,this.c,this.sp,this.cp);gl.uniform4f(u.proj,this.f/this.asp,this.f,1.0003056,-.2200336);gl.uniform3f(u.cam,c.x,c.y,c.z);
  if(shader!==this.fxProgram){gl.uniform1f(u.pixelFocal,this.renderHeight*this.f*.5);WorldShadows.uniforms(this,shader)}
  if(shader!==this.fxProgram&&(shader.light!==this.light||shader.lightRevision!==this.light.revision)){
   for(const n of courseLightUniforms)gl.uniform3fv(u[n],this.light[n]);
   gl.uniform3fv(u.groundTint,this.light.floor);gl.uniform1f(u.opacity,1);
   shader.light=this.light;shader.lightRevision=this.light.revision;
  }
 }
 upload(g){
  if(!g.n){g.n=g.d.length/9;g.d=new Float32Array(g.d);readyNormals(g)}
  const gl=this.g;if(!gl||this.buffers.has(g)||!g.n)return;
  // Newly created artwork must reach the sampler before its first draw.
  if(this.atlasCount!==tags.size)this.updateAtlas();
  const compact=g.n>=192?indexedMesh(g):null;
  const buf={verts:gl.createBuffer(),norm:gl.createBuffer(),index:compact?gl.createBuffer():null};
  if(this.vao){buf.vao=this.vao.createVertexArrayOES();this.vao.bindVertexArrayOES(buf.vao)}
  this.bindGeometry(buf);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf.verts);gl.bufferData(gl.ARRAY_BUFFER,compact?compact.verts:g.d,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf.norm);gl.bufferData(gl.ARRAY_BUFFER,compact?compact.norm:readyNormals(g),gl.STATIC_DRAW);
  if(compact)gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,compact.indices,gl.STATIC_DRAW);
  this.buffers.set(g,buf);this.last=g;
 }
 release(g){
  if(g.farDetail)this.release(g.farDetail);
  if(this.g){const groups=this.meshGroups.get(g);if(groups){for(const chunk of groups)this.releaseSceneChunk(chunk);this.meshGroups.delete(g)}}
  if(g.driveRig)g.driveRig.release(this);let buf=this.buffers.get(g);if(buf){if(buf.instanceVao)this.vao.deleteVertexArrayOES(buf.instanceVao);if(buf.vao)this.vao.deleteVertexArrayOES(buf.vao);if(buf.index)this.g.deleteBuffer(buf.index);
  this.g.deleteBuffer(buf.verts);this.g.deleteBuffer(buf.norm);this.buffers.delete(g);this.last=null}
  if(this.cpu?.release)this.cpu.release(g);else if(this.cpu)this.cpu.tiles.delete(g);
 }
 begin(c,light=RUBY_LIGHTS[this.theme]||RUBY_LIGHTS.park){
  this.starTint=0;
  if(this.skipWorldShadows)this.worldLight=null;
  const cv=this.cv,wh=this.cssSize(),width=Math.max(1,wh.width),area=width*Math.max(1,wh.height);
  // The software race budget is unchanged in Auto. Quiet single-kart views
  // may use spare time for more samples, and Sharp is an explicit opt-in.
  const cap=this.pixelCap||400,denser=cap>400;
  const softScale=Math.min(denser?1.65:1,cap/width,denser?Math.sqrt((cap>720?600000:375000)/area):Infinity);
  const layoutScale=this.lcdScale||1,native=(devicePixelRatio||1)*layoutScale;
  const base=this.g?Math.min(native,(this.highResolution?2:1.65)*layoutScale):Math.min(native,softScale);
  const floor=this.fastDisplay?.72:.84;
  const minimum=Math.min(base,Math.max(Math.min(base,floor),Math.min(this.fastDisplay?252:300,wh.width)/Math.max(1,wh.width)));
  const texelLimit=this.g?Math.sqrt((this.highResolution?2560*1440:1920*1080)/area):Infinity;
  const ratio=Math.min(native,texelLimit,Math.max(minimum,base*(this.extraDetail||1))),w=Math.max(1,Math.round(wh.width*ratio)),h=Math.max(1,Math.round(wh.height*ratio));
  this.renderWidth=w;this.renderHeight=h;
  if(!(this.cpu instanceof WorkerRaster)){if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h}

  this.cam=c;this.s=Math.sin(c.yaw);this.c=Math.cos(c.yaw);this.sp=Math.sin(c.pitch);this.cp=Math.cos(c.pitch);this.f=1/Math.tan(c.fov*.5);this.asp=w/h;this.light=light;
  // These four side planes have a conservative margin for subpixel samples and antialiasing.
  const rx=this.c,rz=-this.s,ux=-this.s*this.sp,uy=this.cp,uz=-this.c*this.sp;
  const dx=this.s*this.cp,dy=this.sp,dz=this.c*this.cp,horiz=this.asp/this.f,vert=1/this.f;
  this.planes=[[dx*horiz+rx,dy*horiz,dz*horiz+rz],[dx*horiz-rx,dy*horiz,dz*horiz-rz],
   [dx*vert+ux,dy*vert+uy,dz*vert+uz],[dx*vert-ux,dy*vert-uy,dz*vert-uz]];
  let gl=this.g;if(!gl){
   if(this.presenter&&!(this.cpu instanceof WorkerRaster)){
    if(!this.localSurface){this.localSurface=new OffscreenCanvas(w,h);this.ctx=this.localSurface.getContext('2d',{alpha:true})}
    if(this.localSurface.width!==w)this.localSurface.width=w;if(this.localSurface.height!==h)this.localSurface.height=h;
   }
   this.cpu.begin(this);return
  }
  if(this.gpuTimer&&this.glFrame%12===0){
   const e=this.gpuTimer;
   if(!this.queryPending||e.getQueryObjectEXT(this.query,e.QUERY_RESULT_AVAILABLE_EXT)){
    if(this.queryPending){this.gpuCost=gl.getParameter(e.GPU_DISJOINT_EXT)?0:e.getQueryObjectEXT(this.query,e.QUERY_RESULT_EXT)/1e6;this.queryPending=false}
    this.query=this.query||e.createQueryEXT();if(this.query){e.beginQueryEXT(e.TIME_ELAPSED_EXT,this.query);this.queryOpen=true}
   }
  }
  gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.glFrame++;this.useProgram(this.base);
  if(this.atlasCount!==tags.size)this.updateAtlas();this.last=null;
 }
 updateAtlas(){
  const gl=this.g,revision=tags.size;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tx);
  let cursor=Math.max(this.atlasCount,revision-128);
  while(cursor<revision){
   const cell=cursor%128,col=cell%8,n=Math.min(8-col,revision-cursor);
   let part=this.atlasScratch[n];
   if(!part){
    const surface=document.createElement('canvas');surface.width=n*256;surface.height=64;
    part=this.atlasScratch[n]=surface.getContext('2d');part.globalCompositeOperation='copy';
   }
   const x=col*256,y=Math.floor(cell/8)*64,w=n*256;
   part.drawImage(atlas,x,y,w,64,0,0,w,64);
   gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,gl.RGBA,gl.UNSIGNED_BYTE,part.canvas);
   cursor+=n;
  }
  this.atlasCount=revision;
 }
 modelVisible(m,x,y,z,a,s,roll,pitch){
  const b=localBox(m),sn=Math.sin(a),cs=Math.cos(a),sr=Math.sin(roll),cr=Math.cos(roll),sp=Math.sin(pitch),cp=Math.cos(pitch);
  const m00=cs*cr-sn*sp*sr,m01=-cs*sr-sn*sp*cr,m02=sn*cp;
  const m10=cp*sr,m11=cp*cr,m12=sp;
  const m20=-sn*cr-cs*sp*sr,m21=sn*sr-cs*sp*cr,m22=cs*cp;
  const X=x+(m00*b.x+m01*b.y+m02*b.z)*s-this.cam.x,Y=y+(m10*b.x+m11*b.y+m12*b.z)*s-this.cam.y,Z=z+(m20*b.x+m21*b.y+m22*b.z)*s-this.cam.z;
  for(const p of this.planes){
   const px=p[0],py=p[1],pz=p[2],dist=px*X+py*Y+pz*Z;
   if(dist>=0)continue;
   const radius=(b.hx*Math.abs(px*m00+py*m10+pz*m20)+b.hy*Math.abs(px*m01+py*m11+pz*m21)+b.hz*Math.abs(px*m02+py*m12+pz*m22))*s;
   if(dist+radius<-.3)return false;
  }
  return true;
 }
 boxVisible(b){
  const x=b.x-this.cam.x,y=b.y-this.cam.y,z=b.z-this.cam.z;
  for(const p of this.planes){if(x*p[0]+y*p[1]+z*p[2]+b.hx*Math.abs(p[0])+b.hy*Math.abs(p[1])+b.hz*Math.abs(p[2]) < -.3)return false}
  return true;
 }
 vis(x,y,z,r){let c=this.cam,dx=x-c.x,dz=z-c.z,v=dx*this.s+dz*this.c;return v>-r-3&&v<720+r&&Math.abs(dx*this.c-dz*this.s)<(Math.max(0,v)*this.asp/this.f+r*1.8+5)}
 draw(m,x=0,y=0,z=0,a=0,s=1,lean=0,pitch=0,tested=false){
  if(!tested&&m.d.length>=864&&!this.modelVisible(m,x,y,z,a,s,lean,pitch))return;
  this.upload(m);if(!m.n)return;let gl=this.g;if(!gl){this.cpu.draw(this,m,x,y,z,a,s,lean,pitch);return}
  const program=this.solid&&solidMesh(m)?this.solid:this.base;this.useProgram(program);const u=program.u,buffer=this.buffers.get(m);if(this.last!==m){if(this.vao)this.vao.bindVertexArrayOES(buffer.vao);else this.bindGeometry(buffer);this.last=m}
  gl.uniform3f(u.origin,x,y,z);gl.uniform4f(u.obj,Math.sin(a),Math.cos(a),s,pitch);gl.uniform2f(u.tilt,Math.sin(lean),Math.cos(lean));if(buffer.index)gl.drawElements(gl.TRIANGLES,m.n,gl.UNSIGNED_SHORT,0);else gl.drawArrays(gl.TRIANGLES,0,m.n)
 }
 beginCopies(mesh){
  // The packed WebGL path can draw copies without uploading the source mesh.
  if(this.g&&this.atlasCount!==tags.size)this.updateAtlas();
  this.copyMesh=mesh;this.copyCount=0;
  this.copyPlain=!this.g||!this.batched||(!this.instances&&mesh.d.length/9*SCENE_SLOTS>65535);
  if(this.copyPlain||this.copies)return;
  this.copies={origins:new Float32Array(SCENE_SLOTS*3),objects:new Float32Array(SCENE_SLOTS*4),tilts:new Float32Array(SCENE_SLOTS*2)};
  if(!this.instances){this.copyChunks=new WeakMap();return}
  const gl=this.g,slots=new Uint8Array(SCENE_SLOTS);for(let i=0;i<slots.length;i++)slots[i]=i;
  this.instanceSlots=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceSlots);gl.bufferData(gl.ARRAY_BUFFER,slots,gl.STATIC_DRAW);
 }
 drawCopy(x,y,z,yaw,roll,pitch,scale=1,tested=false){
  const g=this.copyMesh;
  if(this.copyPlain){this.draw(g,x,y,z,yaw,scale,roll,pitch,tested);return}
  if(!tested&&!this.modelVisible(g,x,y,z,yaw,scale,roll,pitch))return;
  scenePose(this.copies,this.copyCount++,x,y,z,yaw,scale,roll,pitch);
  if(this.copyCount===SCENE_SLOTS)this.flushCopies();
 }
 flushCopies(){
  const count=this.copyCount;if(!count)return;
  const g=this.copyMesh,gl=this.g,ext=this.instances,poses=this.copies;
  const program=this.solidBatch&&solidMesh(g)?this.solidBatch:this.batched;
  this.useProgram(program);
  if(!ext){
   // The same slot shader batches pickups on WebGL 1 devices without an
   // instancing extension. One immutable buffer covers up to twelve copies.
   let chunk=this.copyChunks.get(g);
   if(!chunk){chunk={props:Array.from({length:SCENE_SLOTS},()=>({g})),copies:true};this.copyChunks.set(g,chunk)}
   const buf=chunk.buf||this.createSceneChunk(chunk);
   if(this.vao)this.vao.bindVertexArrayOES(buf.vao);else this.bindSceneChunk(buf);
   const u=program.u;gl.uniform3fv(u['origins[0]'],poses.origins);gl.uniform4fv(u['objects[0]'],poses.objects);gl.uniform2fv(u['tilts[0]'],poses.tilts);
   gl.drawElements(gl.TRIANGLES,count*g.n,gl.UNSIGNED_SHORT,0);
   this.last=null;this.copyCount=0;return;
  }
  this.upload(g);const buffer=this.buffers.get(g);
  if(this.vao&&buffer.instanceVao)this.vao.bindVertexArrayOES(buffer.instanceVao);
  else{
   if(this.vao){buffer.instanceVao=this.vao.createVertexArrayOES();this.vao.bindVertexArrayOES(buffer.instanceVao)}
   this.bindGeometry(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceSlots);
   gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,1,gl.UNSIGNED_BYTE,false,1,0);ext.vertexAttribDivisorANGLE(4,1);
  }
  const u=program.u;
  gl.uniform3fv(u['origins[0]'],poses.origins);gl.uniform4fv(u['objects[0]'],poses.objects);gl.uniform2fv(u['tilts[0]'],poses.tilts);
  if(buffer.index)ext.drawElementsInstancedANGLE(gl.TRIANGLES,g.n,gl.UNSIGNED_SHORT,0,count);
  else ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,g.n,count);
  if(!this.vao){ext.vertexAttribDivisorANGLE(4,0);gl.disableVertexAttribArray(4)}
  this.last=null;this.copyCount=0;
 }
 prepareFX(bytes){
  // Allocate one in-flight stream per idle slice. A race uses a single FX draw.
  const gl=this.g;if(!gl)return this.cpu?.prepareFX?.(bytes)??true;
  const ring=this.fxRing||(this.fxRing=[]);
  for(let i=0;i<3;i++){
   const slot=ring[i];if(slot&&slot.capacity>=bytes)continue;
   const stream=slot||(ring[i]={buffer:gl.createBuffer(),capacity:0,frame:-1});
   gl.bindBuffer(gl.ARRAY_BUFFER,stream.buffer);
   gl.bufferData(gl.ARRAY_BUFFER,bytes,gl.DYNAMIC_DRAW);stream.capacity=bytes;stream.frame=-1;
   return i===2;
  }
  return true;
 }
 drawFX(batch){
  if(!batch?.n)return;
  const gl=this.g;if(!gl){this.cpu.drawFX(this,batch);return}
  this.useProgram(this.fxProgram);
  // Three in-flight frames get independent storage. Marks, grit and flame
  // batches in the same frame append; none overwrites a pending GPU draw.
  const ring=this.fxRing||(this.fxRing=[]),slot=this.glFrame%3;
  const stream=ring[slot]||(ring[slot]={buffer:gl.createBuffer(),capacity:0,frame:-1});
  if(stream.frame!==this.glFrame){stream.frame=this.glFrame;stream.used=0}
  if(this.vao)this.vao.bindVertexArrayOES(null);
  gl.bindBuffer(gl.ARRAY_BUFFER,stream.buffer);
  const data=batch.d,n=batch.n,bytes=n*36,required=stream.used+bytes;
  if(required>stream.capacity){
   stream.capacity=Math.max(4096,2**Math.ceil(Math.log2(required)));gl.bufferData(gl.ARRAY_BUFFER,stream.capacity,gl.DYNAMIC_DRAW);stream.used=0;
  }
  const first=stream.used/36;gl.bufferSubData(gl.ARRAY_BUFFER,stream.used,data.length===n*9?data:data.subarray(0,n*9));stream.used+=bytes;
  for(let j=0;j<3;j++){gl.enableVertexAttribArray(j);gl.vertexAttribPointer(j,3,gl.FLOAT,false,36,j*12)}
  gl.disableVertexAttribArray(3);gl.disableVertexAttribArray(4);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.drawArrays(gl.TRIANGLES,first,n);
  gl.depthMask(true);gl.disable(gl.BLEND);this.last=null;
 }
 releaseSceneChunk(chunk){
  const buf=chunk.buf;if(!buf)return;chunk.buf=null;const gl=this.g;
  if(buf.vao)this.vao.deleteVertexArrayOES(buf.vao);
  for(const b of [buf.verts,buf.norm,buf.index,buf.slots])gl.deleteBuffer(b);
  for(const o of chunk.props)this.meshGroups.get(o.g)?.delete(chunk);this.last=null;
 }
 bindSceneChunk(buf){
  this.bindGeometry(buf);const gl=this.g;gl.bindBuffer(gl.ARRAY_BUFFER,buf.slots);
  gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,1,gl.UNSIGNED_BYTE,false,1,0);
 }
 createSceneChunk(chunk){
  const gl=this.g,buf={verts:gl.createBuffer(),norm:gl.createBuffer(),index:gl.createBuffer(),slots:gl.createBuffer()};
  if(this.vao){buf.vao=this.vao.createVertexArrayOES();this.vao.bindVertexArrayOES(buf.vao)}
  // Allocate exactly the compacted active vertices. For repeated props the
  // original mesh is indexed once during assembly, preserving every attribute bit.
  const packed=new Map(),members=[];let count=0,nIndices=0;
  buf.offsets=[];buf.farOffsets=[];
  for(let level=0;level<(chunk.copies?1:2);level++)for(let slot=0;slot<chunk.props.length;slot++){
   const source=chunk.props[slot].g,g=level?source.farDetail:source;if(!g)continue;
   let data=packed.get(g);
   if(!data){
    if(!g.n){g.n=g.d.length/9;g.d=new Float32Array(g.d);readyNormals(g)}
    data=(g.n>=192?indexedMesh(g):null)||{verts:g.d,norm:readyNormals(g),indices:null};packed.set(g,data);
   }
   (level?buf.farOffsets:buf.offsets)[slot]=nIndices;
   members.push({data,g,first:count,offset:nIndices,slot});count+=data.verts.length/9;nIndices+=g.n;
   if(!level){let groups=this.meshGroups.get(source);if(!groups){groups=new Set();this.meshGroups.set(source,groups)}groups.add(chunk)}
  }
  const verts=new Float32Array(count*9),norm=new Int8Array(count*4),indices=new Uint16Array(nIndices),slots=new Uint8Array(count);
  for(let i=0;i<members.length;i++){
   const {data,g,first,offset,slot}=members[i];
   if(!solidMesh(g))buf.cutout=(buf.cutout||0)|(1<<slot);
   verts.set(data.verts,first*9);norm.set(data.norm,first*4);slots.fill(slot,first,first+data.verts.length/9);
   if(data.indices){for(let j=0;j<g.n;j++)indices[offset+j]=data.indices[j]+first}
   else{for(let j=0;j<g.n;j++)indices[offset+j]=first+j}
  }
  this.bindSceneChunk(buf);
  for(const [binding,bytes] of [[buf.verts,verts],[buf.norm,norm],[buf.slots,slots]]){gl.bindBuffer(gl.ARRAY_BUFFER,binding);gl.bufferData(gl.ARRAY_BUFFER,bytes,gl.STATIC_DRAW)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  chunk.buf=buf;this.last=null;return buf;
 }
 warmScenery(props){
  if(!this.batched||this.warmPending||typeof requestIdleCallback!=='function')return;
  const chunks=this.scenePlans.get(props);if(!chunks||chunks.nextWarm>=chunks.length)return;
  this.warmPending=true;requestIdleCallback(deadline=>{
   this.warmPending=false;if(this.currentScene!==chunks||deadline.timeRemaining()<8)return;
   for(let i=chunks.nextWarm||0;i<chunks.length;i++){
    const chunk=chunks[i];chunks.nextWarm=i+1;
    if(chunk.props.length>1&&!chunk.buf){this.createSceneChunk(chunk);break}
   }
  });
 }
 drawScenery(props,t){
  prepareScenery(props);
  if(!this.g||!this.batched){
   for(const o of props){if(!sceneVisible(this,o))continue;const a=o.anim?o.anim(t):null;if(a&&a.y< -50)continue;
    this.draw(sceneryMesh(this,o),o.x+(a?.x||0),o.y+(a?.y||0),o.z+(a?.z||0),o.yaw+(a?.yaw||0),o.scale,a?.roll||0,a?.pitch||0,!o.anim)}
   return;
  }
  let chunks=this.scenePlans.get(props);if(!chunks){chunks=sceneryPlan(props,!!this.instances);this.scenePlans.set(props,chunks)}
  this.currentScene=chunks;const gl=this.g;
  for(const chunk of chunks){
   const members=chunk.props;let mask=0,farMask=0;
   for(let i=0;i<members.length;i++){
    const o=members[i];if(!sceneVisible(this,o))continue;
    const a=o.anim?o.anim(t):null;if(a&&a.y< -50)continue;
    if(members.length===1){this.draw(sceneryMesh(this,o),o.x+(a?.x||0),o.y+(a?.y||0),o.z+(a?.z||0),o.yaw+(a?.yaw||0),o.scale,a?.roll||0,a?.pitch||0,!o.anim);continue}
    mask|=1<<i;if(sceneryMesh(this,o)!==o.g)farMask|=1<<i;
    if(o.anim)scenePose(chunk,i,o.x+(a?.x||0),o.y+(a?.y||0),o.z+(a?.z||0),o.yaw+(a?.yaw||0),o.scale,a?.roll||0,a?.pitch||0);
   }
   if(!mask)continue;
   const buf=chunk.buf||this.createSceneChunk(chunk),program=this.solidBatch&&!(mask&buf.cutout)?this.solidBatch:this.batched;this.useProgram(program);
   if(this.vao)this.vao.bindVertexArrayOES(buf.vao);else this.bindSceneChunk(buf);
   this.last=null;const u=program.u;
   gl.uniform3fv(u['origins[0]'],chunk.origins);gl.uniform4fv(u['objects[0]'],chunk.objects);gl.uniform2fv(u['tilts[0]'],chunk.tilts);
   let runs=0,end=-1;
   for(let level=0;level<(farMask?2:1);level++){
    const selected=level?farMask:mask&~farMask,starts=level?buf.farOffsets:buf.offsets;
    for(let i=0;i<members.length;i++)if(selected&(1<<i)){
     const start=starts[i],count=(level?members[i].g.farDetail:members[i].g).n;
     if(start!==end){this.offsets[runs]=start*2;this.counts[runs++]=count}else this.counts[runs-1]+=count;
     end=start+count;
    }
   }
   if(runs>1&&this.multi)this.multi.multiDrawElementsWEBGL(gl.TRIANGLES,this.counts,0,gl.UNSIGNED_SHORT,this.offsets,0,runs);
   else for(let i=0;i<runs;i++)gl.drawElements(gl.TRIANGLES,this.counts[i],gl.UNSIGNED_SHORT,this.offsets[i]);
  }
  for(const group of chunks.instances){
   const g=group[0].g;
   for(let level=0;level<(g.farDetail?2:1);level++){
    const mesh=level?g.farDetail:g;let opened=false;
    for(const o of group){
     if(!level){
      const visible=sceneVisible(this,o);o.farVisible=visible&&sceneryMesh(this,o)!==g;
      if(!visible||o.farVisible)continue;
     }else if(!o.farVisible)continue;
     const a=o.anim?o.anim(t):null;if(a&&a.y< -50)continue;
     if(!opened){this.beginCopies(mesh);opened=true}
     this.drawCopy(o.x+(a?.x||0),o.y+(a?.y||0),o.z+(a?.z||0),o.yaw+(a?.yaw||0),a?.roll||0,a?.pitch||0,o.scale,!o.anim);
    }
    if(opened)this.flushCopies();
   }
  }
 }
 project(x,y,z){let dx=x-this.cam.x,dy=y-this.cam.y,dz=z-this.cam.z,v=dx*this.s+dz*this.c,Z=v*this.cp+dy*this.sp;if(Z<.17)return null;return [(1+(dx*this.c-dz*this.s)*this.f/this.asp/Z)*this.cv.width/2,(1-(dy*this.cp-v*this.sp)*this.f/Z)*this.cv.height/2,Z]}
 end(){
  if(this.g){if(this.queryOpen){this.gpuTimer.endQueryEXT(this.gpuTimer.TIME_ELAPSED_EXT);this.queryOpen=false;this.queryPending=true}}
  else{this.cpu.end(this);if(this.localSurface)this.presenter.transferFromImageBitmap(this.localSurface.transferToImageBitmap())}
 }
}
