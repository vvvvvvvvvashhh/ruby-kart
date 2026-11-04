// A run from an old regatta town, through its covered market, and over the fishing pier.
function harborDefinition(){
 const knots=[[0,0],[0,36],[5,66],[28,84],[53,89],[75,77],[74,52],[90,33],[115,39],[137,28],[146,2],[132,-22],[102,-31],[89,-54],[93,-77],[76,-92],[48,-87],[43,-65],[56,-49],[44,-33],[18,-29],[2,-20]];
 const points=softenTourBends(tourSpline(knots,14),12),half=7.35,Lref=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+Math.hypot(q[0]-p[0],q[1]-p[1])},0);
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 const band=(f,a,b,edge)=>ease((f-a)/edge)*ease((b-f)/edge);
 const width=f=>half+.9*band(f,.09,.25,.035)-.65*band(f,.31,.43,.026)+.8*band(f,.68,.76,.025);
 const height=f=>3.35+4.5*band(f,.26,.62,.095)+1.2*band(f,.65,.835,.052)+.65*Math.sin(2*Math.PI*f-.35);
 const bank=f=>.085*band(f,.108,.25,.053)-.08*band(f,.28,.375,.032)+.09*band(f,.432,.54,.038)+.065*band(f,.675,.786,.05)-.075*band(f,.824,.9,.03);
 const gaps=[{f0:.710,f1:.722,l0:1.0,l1:7.3}],ramps=[{f:.710,l0:1.0,l1:7.3,rise:1.05,length:5.7}];
 const pads=[{f:.159,l:4.85,w:3.5},{f:.416,l:-4.65,w:3.2},{f:.682,l:4.2,w:3.85}];
 const coins=[[.058,-.36,4],[.20,.48,3],[.272,-.30,4],[.442,.25,4],[.56,-.36,4],[.726,.58,3],[.875,-.3,3]];
 const sections=[[0,'风帆港湾'],[.116,'灯塔外湾'],[.262,'拱廊市集'],[.425,'城墙高速弯'],[.61,'起重机码头'],[.685,'跳海栈桥'],[.79,'修船坞双弯'],[.9,'帆船会直道']];
 function surfaceLift(f,l){const r=ramps[0],d=(r.f-f)*Lref;return d>=0&&d<=r.length&&l>=r.l0&&l<=r.l1?r.rise*(1-d/r.length):0}
 const seaLevel=-1.3,mooredBoats=[];
 // Project only the two nearest hulls and sails onto the actual water plane.
 // These faces join the existing transparent depth-tested batch; solid quay,
 // dock and cart geometry naturally hides the reflected image.
 function drawWaterReflections(motor,t,tri){
  const cam=motor.cam,eyeHeight=cam.y-seaLevel;if(eyeHeight<.12)return;
  const lean=motor.optionalBudget<.45,reach=lean?34:64;
  let first,second,nearest=reach*reach,next=nearest;
  for(const boat of mooredBoats){
   const dx=boat.x-cam.x,dz=boat.z-cam.z,d=dx*dx+dz*dz;
   if(d>next||dx*motor.s+dz*motor.c< -10)continue;
   if(d<nearest){second=first;next=nearest;first=boat;nearest=d}
   else if(!lean){second=boat;next=d}
  }
  for(let pass=lean?0:1;pass>=0;pass--){
   const b=pass?second:first;if(!b)continue;
   const pose=b.anim(t),cr=Math.cos(pose.roll),sr=Math.sin(pose.roll),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
   const alpha=.56*clamp((reach-Math.sqrt(pass?next:nearest))/14,0,1);
   for(let i=0;i<b.points.length;i++){
    const v=b.points[i],out=b.sheet[i];
    const x=v[0]*cr-v[1]*sr,y=v[0]*sr+v[1]*cr,z=v[2]*cp-y*sp;
    const wx=b.x+b.c*x+b.s*z,wz=b.z+b.c*z-b.s*x,h=Math.max(0,-1.2+pose.y+y*cp+v[2]*sp-seaLevel);
    const u=eyeHeight/(eyeHeight+h);
    // The lower-frequency displacement is continuous across adjoining stripes.
    const wave=.022*Math.min(4,h)*Math.sin(2*t+.73*h+.21*wz);
    out[0]=cam.x+(wx-cam.x)*u+wave*b.c;out[1]=seaLevel+.026;out[2]=cam.z+(wz-cam.z)*u-wave*b.s;
   }
   for(const face of b.faces){
    const [a,d,c,color]=face,opacity=alpha*(color[0]>.48?.74:1);
    tri(b.sheet[a],b.sheet[d],b.sheet[c],color,color,color,opacity,opacity,opacity);
   }
  }
 }
 let vergeLimit;
 function shoulder(f,side){
  const town=Math.max(band(f,.26,.455,.025),1-band(f,.02,.85,.028));
  let span=2.15+3.25*town;
  if(side>0)span=Math.max(span,2.15+6.45*(1-band(f,.238,.984,.032)));
  span=mix(span,.97,band(f,.619,.810,.014));
  // The crane, loading crates and their deck have the same shoreline.
  if(side<0){
   // A narrow inner elbow breaks the row of crates into two working bays.
   const loading=5.95-1.9*band(f,.63,.655,.007)+8.65*band(f,.647,.705,.009);
   span=mix(span,loading,band(f,.588,.711,.017));
  }
  return vergeLimit?Math.min(span,Math.max(.45,vergeLimit(f,side)-width(f))):span;
 }
 function build(api){
  const {add,at,pt,L}=api;vergeLimit=tourVergeLimit(api);
  const ground=new RoadSurfaceIndex();
  function driveQuad(g,a,b,c,d,color){
   g.quad(a,b,c,d,color);ground.addFace(a,b,c,d);
  }
  function addLocalFloor(mesh,x,y,z,yaw){
   const data=mesh.d,cs=Math.cos(yaw),sn=Math.sin(yaw);
   const world=i=>[x+data[i]*cs+data[i+2]*sn,y+data[i+1],z+data[i+2]*cs-data[i]*sn];
   for(let i=0;i<data.length;i+=27)ground.addFace(world(i),world(i+9),world(i+18));
  }
  const cream='#fff0cd',sun='#ffd16d',teal='#348e93',ink='#344c61',coral='#dd765e',clay='#af594b',stone='#dcb99b',navy='#345e73',sea='#42a9a8';
  const rnd=n=>{const x=Math.sin(n*92.73+13.54)*41357.871;return x-Math.floor(x)};
  const line=(g,a,b,r,col,n=5)=>g.tube(...a,...b,r,r,col,n);
  function localize(g,p){for(let i=0;i<g.d.length;i+=9){g.d[i]-=p.x;g.d[i+1]-=p.y;g.d[i+2]-=p.z}}
  function chunk(g,p,r){localize(g,p);add(g,p.x,p.y,p.z,0,1,r)}
  function ribbon(g,s,t,l0,l1,h,col,k=h){
   g.quad(pt(s,l0,h),pt(s,l1,h),pt(t,l1,k),pt(t,l0,k),col);
  }
  function side(g,s,t,l0,l1,ha,hb,col){
   g.quad(pt(s,l0,ha),pt(t,l1,ha),pt(t,l1,hb),pt(s,l0,hb),col);
  }
  const boards=finishTile('harbor/deck',(c,w,h)=>{
   c.fillStyle='#c5a685';c.fillRect(0,0,w,h);
   for(let row=0;row<5;row++){
    const y=row*h/5;
    c.fillStyle=['#bf9c79','#c8aa85','#bda083','#cbaa84','#be9d7d'][row];c.fillRect(0,y,w,h/5);
    c.fillStyle='#806657';c.fillRect(0,y,w,1.25);c.fillStyle='#dcbd94';c.fillRect(0,y+1.3,w,1);
    const joint=(row*77+28)%w;
    c.fillStyle='#8d7460';c.fillRect(joint,y,1.25,h/5);
    for(let j=0;j<4;j++){
     const x=12+((row*29+j*57)%189),v=y+3+(j%3)*2.2;
     c.strokeStyle=j%2?'#d6b994':'#b39376';c.lineWidth=.8;c.beginPath();c.moveTo(x,v);
     c.bezierCurveTo(x+10,v-1.7,x+29,v+1.5,x+38,v);c.stroke();
    }
    for(const x of [12,243]){c.fillStyle='#655e57';c.fillRect(x,y+4,1.8,2);c.fillStyle='#d8c6a3';c.fillRect(x,y+4,1,.7)}
   }
  });
  const brick=finishTile('harbor/piazza',(c,w,h)=>{
   c.fillStyle='#b59a87';c.fillRect(0,0,w,h);
   const tones=['#d5b294','#d6b398','#c7a98e','#ddba9d','#d4af91'];
   for(let row=0;row<4;row++)for(let k=-1;k<8;k++){
    const x=k*36+(row%2)*18,y=row*16;c.fillStyle=tones[(row*2+k+6)%5];c.fillRect(x+1,y+1,35,15);
    c.fillStyle='#ead1ae';c.fillRect(x+2,y+1,32,1);c.fillStyle='#c3a28e';c.fillRect(x+2,y+14,31,1);
   }
   // Narrow glazed ceramic bands frame the dry stone of the fish market.
   for(const x of [5,240]){c.fillStyle='#518786';c.fillRect(x,0,9,h);
    for(let y=0;y<h;y+=16){c.fillStyle='#f2e0b8';c.beginPath();c.moveTo(x+4.5,y+2);c.lineTo(x+7.5,y+8);c.lineTo(x+4.5,y+14);c.lineTo(x+1.5,y+8);c.fill()}}
  });
  const shop=finishTile('harbor/fishshop',(c,w,h)=>{
   c.fillStyle='#356b76';c.fillRect(0,0,w,h);c.strokeStyle='#f0d5a6';c.lineWidth=2;c.strokeRect(3,3,w-6,h-6);
   c.fillStyle='#f0d5a6';c.beginPath();c.ellipse(41,34,20,9,-.12,0,TAU);c.fill();
   c.beginPath();c.moveTo(25,34);c.lineTo(13,25);c.lineTo(15,42);c.closePath();c.fill();
   c.fillStyle='#356b76';c.beginPath();c.arc(51,32,2,0,TAU);c.fill();
   c.fillStyle='#fff1c9';c.font='bold 23px sans-serif';c.fillText('PESCHERIA',76,40,169);
  });
  const cuts=[0,L,...gaps.flatMap(g=>[g.f0*L,g.f1*L]),...ramps.map(r=>r.f*L-r.length)];for(let i=1;i<Math.ceil(L/3.05);i++)cuts.push(i*L/Math.ceil(L/3.05));cuts.sort((a,b)=>a-b);
  for(let start=0;start<cuts.length-1;start+=8){
   const end=Math.min(start+8,cuts.length-1),g=new Geo(),center=at((cuts[start]+cuts[end])*.5);
   for(let i=start;i<end;i++){
    const s=cuts[i],t=cuts[i+1],f=(s+t)/2/L,w=width(f),q=width(s/L),r=width(t/L),pier=f>.625&&f<.802,market=f>.275&&f<.439;
    const opening=gaps.find(v=>f>=v.f0&&f<v.f1),ramp=ramps.find(r=>r.f*L>=t-.00001&&r.f*L-r.length<=s+.00001),road=market?(i%2?'#d6ad8f':'#d9b193'):pier?(i%2?'#b89973':'#c19f78'):(i%2?'#747d82':'#778086');
    const tile=pier?boards:market?brick:null;
    const surface=(l0,l1,j0,j1)=>{
     const A=pt(s,l0,0),B=pt(s,l1,0),C=pt(t,j1,0),D=pt(t,j0,0);
     ground.addFace(A,B,C,D);
     if(!tile){g.quad(A,B,C,D,road);return}
     const u=(l,width)=>mix(tile[0],tile[2],clamp(.5+.5*l/width,0,1));
     g.face(A,B,C,D,'#ffffff',null,[[u(l0,q),tile[3]],[u(l1,q),tile[3]],[u(j1,r),tile[1]],[u(j0,r),tile[1]]]);
    };
    g.mat=pier||market?0:1;
    const split=opening||ramp;
    if(split){
     surface(-q,split.l0,-r,split.l0);surface(split.l1,q,split.l1,r);
     if(opening){
      side(g,s,t,split.l0,split.l0,-.36,0,'#916b51');side(g,s,t,split.l1,split.l1,-.36,0,'#916b51');
     }else{
      const start=ramp.f*L-ramp.length,h0=ramp.rise*(s-start)/ramp.length,h1=ramp.rise*(t-start)/ramp.length;
      driveQuad(g,pt(s,ramp.l0,h0),pt(s,ramp.l1,h0),pt(t,ramp.l1,h1),pt(t,ramp.l0,h1),'#ecab55');
      for(const l of [ramp.l0,ramp.l1])g.quad(pt(s,l,0),pt(t,l,0),pt(t,l,h1),pt(s,l,h0),'#ae6853');
     }
    }else surface(-q,q,-r,r);
    g.mat=0;
    if(!pier&&!market){
     // Flush trolley rails once carried fish to the loading quay. Their
     // polished heads and tarred beds curve with this one road section.
     if(f>.435&&f<.621){
      for(const side of [-1,1]){
       const rail=side*2.12+.49*Math.sin(s*.035),end=side*2.12+.49*Math.sin(t*.035);
       for(const [half,h,col] of [[.20,.031,'#596571'],[.073,.043,'#b1bdba']])
        g.quad(pt(s,rail-half,h),pt(s,rail+half,h),pt(t,end+half,h),pt(t,end-half,h),col);
      }
     }
     if(i%3===0)ribbon(g,s+.3,Math.min(t,s+1.72),-.095,.095,.016,'#f4e3b4');
     const side=f<.26?-1:1,l=side*(w-.71);
     ribbon(g,s,t,l,l+side*.13,.026,'#e7c68f');
     if(i%3===1){const m=(s+t)*.5;
      g.quad(pt(m-.40,l,.033),pt(m-.30,l-side*.74,.033),pt(m,l,.033),pt(m+.48,l+side*.25,.033),'#e7c68f')}
    }
    for(let dir of [-1,1]){
     driveQuad(g,pt(s,q*dir,.025),pt(t,r*dir,.025),pt(t,(r+.38)*dir,.025),pt(s,(q+.38)*dir,.025),i%4<2?cream:teal);
     const from=(q+shoulder(s/L,dir))*dir,to=(r+shoulder(t/L,dir))*dir;
     driveQuad(g,pt(s,(q+.38)*dir,.018),pt(t,(r+.38)*dir,.018),pt(t,to,.018),pt(s,from,.018),pier?'#a98864':i%2?'#d1b59c':'#d4b99e');
     side(g,s,t,from,to,-5,0,pier?'#886c5e':'#bca08c');
     if(dir<0&&f>.602&&f<.687){
      g.quad(pt(s,from+.34,.039),pt(s,from+.48,.039),pt(t,to+.48,.039),pt(t,to+.34,.039),i%2?sun:ink);
     }
     if(pier&&i%3===0){const a=pt(s,(q+.78)*dir,-3.8),b=pt(s,(q+.78)*dir,.37);line(g,a,b,.17,'#845e4e',5);
      api.solid(a[0],a[1],a[2],{tag:'quayPile',r:.17,h:b[1]-a[1]})}
     if(!pier&&i%3===0){const a=pt(s,from,-1.5),b=pt(s,from,-.35);line(g,a,b,.105,'#d7b195',4)}
    }
   }
   chunk(g,center,39);
  }
  // The ramp and the boards are separate lanes in the road mesh above.
  // These three painted arrows never cover the water after the takeoff lip.
  for(const r of ramps){
   const g=new Geo(),s=r.f*L,t=s-r.length,m=at((s+t)*.5);
   for(let i=1;i<=3;i++){const b=t+r.length*i/4,h=r.rise*i/4+.055,j=(r.l0+r.l1)/2;
    g.quad(pt(b-.46,r.l0+.18,h-.085),pt(b-.05,r.l0+.18,h+.005),pt(b+.56,j,h+.106),pt(b+.16,j,h+.03),cream);
    g.quad(pt(b+.16,j,h+.03),pt(b+.56,j,h+.106),pt(b-.05,r.l1-.18,h+.005),pt(b-.46,r.l1-.18,h-.085),cream)}
   chunk(g,m,12);
  }
  for(const pad of pads){
   const g=new Geo(),s=pad.f*L,m=at(s,pad.l),w=pad.w*.5;g.mat=3;ribbon(g,s-2.15,s+2.15,pad.l-w-.1,pad.l+w+.1,.035,'#2d6474');
   g.mat=2;ribbon(g,s-2.03,s+2.03,pad.l-w,pad.l+w,.047,'#efa245');
   for(let i=0;i<3;i++){const a=s-1.4+i*1.09;
    g.quad(pt(a,pad.l-w+.14,.064),pt(a+.35,pad.l-w+.14,.064),pt(a+1.02,pad.l,.064),pt(a+.68,pad.l,.064),cream);
    g.quad(pt(a+.68,pad.l,.064),pt(a+1.02,pad.l,.064),pt(a+.35,pad.l+w-.14,.064),pt(a,pad.l+w-.14,.064),cream)}
   chunk(g,m,8);
  }
  const water=new Geo();water.mat=9;water.quad([-410,seaLevel,-420],[495,seaLevel,-420],[495,seaLevel,440],[-410,seaLevel,440],sea);add(water,0,0,0,0,1,720);
  // A compact glint field runs alongside the harbor walls. Slim islands and tidal seams break up the horizon.
  for(let k=0;k<18;k++){const g=new Geo(),cx=-120+(k%6)*64,cz=-117+Math.floor(k/6)*89;
   g.castsShadow=false; // Light reflected on water has no opaque caster surface.
   for(let j=0;j<22;j++){let n=k*47+j,x=(rnd(n+27)-.5)*65,z=(rnd(n+71)-.5)*80,h=.1+rnd(n+7)*.27,w=1+rnd(n+23)*4.3;
    const color=['#a1d7c3','#7bc9bb','#c4d9ab','#68bcb0'][j%4];g.quad([x-w,0,z],[x-.15,0,z+h],[x+w,0,z],[x+.3,0,z-h],color)}
   add(g,cx,-1.23,cz,0,1,65,t=>({x:.68*Math.sin(t*.42+k*.43),z:.18*Math.cos(t*.31+k)}))
  }
  function island(x,z,R,H,seed){
   const g=new Geo(),N=11;for(let i=0;i<N;i++){const A=i*TAU/N,B=(i+1)*TAU/N;
    const P=(n,a,k,y)=>[Math.cos(a)*(1+.11*rnd(n%N+seed))*R*k,y,Math.sin(a)*(1+.13*rnd((n%N)*3+seed))*R*k*.68];
    const a=P(i,A,1,-1.6),b=P(i+1,B,1,-1.6),c=P(i+1,B,.79,H*.48),d=P(i,A,.79,H*.48);
    g.quad(a,b,c,d,i%3?'#bd957e':'#cfac8c');const e=P(i+1,B,.54,H*(.84+.17*rnd((i+1)%N+seed))),v=P(i,A,.54,H*(.84+.17*rnd(i+seed)));
    g.quad(d,c,e,v,i%2?'#789b83':'#83a287');g.tri(v,e,[0,H*.98,0],i%2?'#96ac89':'#8ba382');
   }addLocalFloor(g,x,0,z,0);add(g,x,0,z,0,1,R+H);
  }
  island(-22,51,16,2.4,4);island(-108,139,44,18,7);island(199,111,40,25,15);island(223,-94,62,32,44);
  function lighthouse(){
   const g=new Geo(),bandHeights=[[0,1.1,4.6,4.35,stone],[1.1,2.1,4.25,3.7,cream],[2.1,6.2,3.65,3.14,coral],[6.2,11.6,3.14,2.68,cream],[11.6,16.1,2.68,2.25,coral],[16.1,20.3,2.25,1.94,cream],[20.3,20.75,2.09,2.92,ink],[20.75,21.12,2.92,2.83,cream]];
   for(const [a,b,r,R,col] of bandHeights)g.tube(0,a,0,0,b,0,r,R,col,14);
   for(let j=0;j<10;j++){let a=j*TAU/10,b=(j+1)*TAU/10;
    const A=[2.66*Math.sin(a),22.05,2.66*Math.cos(a)],B=[2.66*Math.sin(b),22.05,2.66*Math.cos(b)];
    line(g,[A[0],21.06,A[2]],A,.05,ink,4);line(g,A,B,.063,ink,4);
    if(j%2===0){const x=1.64*Math.sin(a),z=1.64*Math.cos(a);line(g,[x,21,z],[x,24.7,z],.105,ink,5)}
   }
   g.mat=5;g.ell(0,22.9,0,.89,1.2,.89,'#fff1a0',10,5);
   g.mat=0;g.tube(0,24.67,0,0,25,0,2.34,2.40,ink,12);g.tube(0,25,0,0,27.1,0,2.43,.2,teal,12);g.tube(0,27,0,0,28.1,0,.12,.04,sun,6);
   for(let i=0;i<4;i++){const a=i*TAU/4,h=5.1+i*3.1,r=3.3-i*.32;const x=Math.sin(a)*r,z=Math.cos(a)*r;g.box(x,h,z,.72,1.3,.08,ink,a)}
   add(g,-22,2.4,51,0,1,31);
   const ray=new Geo();ray.castsShadow=false;ray.mat=5;ray.tube(0,.04,.1,0,.04,1.88,.19,.57,'#ffe897',8);add(ray,-22,25.2,51,0,1,3,t=>({yaw:t*.82}));
  }
  lighthouse();
  function tileRoof(g,w,d,h,color){
   const e=w*.55,t=d*.59,rise=d*.29;g.quad([-e,h,-t],[e,h,-t],[e,h+rise,0],[-e,h+rise,0],color);
   g.quad([-e,h+rise,0],[e,h+rise,0],[e,h,t],[-e,h,t],'#aa5b50');
   g.tri([-e,h,t],[-e,h,-t],[-e,h+rise,0],cream);g.tri([e,h,t],[e,h+rise,0],[e,h,-t],cream);
   for(let j=0;j<4;j++){let z=-t*j/4,y=h+rise*(1-j/4)+.018;
    g.quad([-e,y,z],[e,y,z],[e,y-.055,z-.12],[-e,y-.055,z-.12],'#da8c73')}
  }
  const walls=['#f0bb91','#f0d3a5','#de9a8b','#ded2ba','#e6ad77','#b5ccc1'];
  function house(id){
   const g=new Geo(),w=7.2+(id%3)*.9,d=6.45,h=6.65+(id%4)*1.19,col=walls[id%walls.length],Z=-d*.5-.025;
   const rect=(x,y,r,s,zo,c)=>g.quad([x-r/2,y-s/2,zo],[x+r/2,y-s/2,zo],[x+r/2,y+s/2,zo],[x-r/2,y+s/2,zo],c);
   g.box(0,-5.89,0,w+.85,11.8,d+.8,'#ba9c89');g.box(0,h*.5,0,w,h,d,col);g.box(0,.22,0,w+.25,.44,d+.18,stone);g.box(0,h-.05,0,w+.32,.3,d+.28,cream);
   tileRoof(g,w,d,h+.03,id%2?'#ce775d':'#bb715a');
   g.box(w*.24,h+d*.22,0,.64,1.66,.57,stone);g.box(w*.24,h+d*.22+.83,0,.78,.17,.71,clay);
   for(let j=-1;j<=1;j++){let x=j*w*.27;rect(x,h-1.7,1.12,1.57,Z,cream);rect(x,h-1.7,.81,1.35,Z-.022,ink);
    for(let a of [-1,1]){rect(x+a*.64,h-1.7,.29,1.42,Z-.034,id%2?teal:'#719f92')}
    rect(x,h-2.49,1.74,.15,Z-.056,cream);rect(x,h-1.7,.055,1.38,Z-.06,stone);
    if(h>8.2){rect(x,h-4.24,1.1,1.48,Z,cream);rect(x,h-4.24,.79,1.22,Z-.025,'#527b80')}
   }
   if(id===1||id===2){
    const zz=Z-.11,x0=-w*.39,x1=w*.39;
    g.face([x0,3.85,zz],[x1,3.85,zz],[x1,3.04,zz],[x0,3.04,zz],'#ffffff',null,
      [[shop[0],shop[1]],[shop[2],shop[1]],[shop[2],shop[3]],[shop[0],shop[3]]]);
   }
   rect(-w*.23,1.34,1.18,2.55,Z-.02,ink);rect(w*.17,1.45,1.64,1.52,Z-.028,'#49787a');
   if(id%2===0){const a=w*.49,b=w*.43;for(let k=0;k<7;k++){let x0=-a+2*a*k/7,x1=-a+2*a*(k+1)/7,c=k%2?cream:coral;
    g.quad([x0,3,Z],[x1,3,Z],[x1,2.51,Z-1.39],[x0,2.51,Z-1.39],c);
    g.quad([x0,2.52,Z-1.39],[x1,2.52,Z-1.39],[x1,2.21,Z-1.39],[x0,2.21,Z-1.39],c)}
    for(let e of [-b,b])line(g,[e,2.4,Z-1.29],[e,1.82,Z],.04,ink,4)}
   for(const side of [-1,1]){const xx=side*(w*.5+.023);
    for(const z of [-d*.2,d*.2]){g.quad([xx,h-2.5,z-.33],[xx,h-2.5,z+.33],[xx,h-1.3,z+.33],[xx,h-1.3,z-.33],'#5b7d80')}
   }
   return g;
  }
  const homes=Array.from({length:6},(_,i)=>house(i)),homeSites=[];
  function placeRow(start,end,side,spacing,ids,offset){
   let j=0;for(let s=start*L;s<end*L;s+=spacing,j++){
    let f=s/L,pos=at(s,side*(width(f)+offset+(j%3)*.62)),bad=false;
    for(let step=0;step<L;step+=3){const road=at(step);if(Math.hypot(pos.x-road.x,pos.z-road.z)<width(step/L)+6.7){bad=true;break}}
    if(bad||homeSites.some(other=>Math.hypot(other.x-pos.x,other.z-pos.z)<7.5))continue;
    const id=ids[j%ids.length],w=7.2+(id%3)*.9,h=6.65+(id%4)*1.19,yaw=pos.yaw+side*Math.PI/2;
    homeSites.push(pos);add(homes[id],pos.x,pos.y-.12,pos.z,yaw,1,12);
    api.solid(pos.x,pos.y-.12-11.8,pos.z,{tag:'townFoundation',halfX:(w+.85)*.5,halfZ:3.625,h:11.8,yaw});
    api.solid(pos.x,pos.y-.12,pos.z,{tag:'townHouse',halfX:w*.5,halfZ:3.225,h,yaw})
   }
  }
  placeRow(.014,.135,1,10,[1,2,0,5],7.5);placeRow(.238,.435,-1,10.7,[3,2,1,5,4],7.2);placeRow(.293,.405,1,11.6,[1,4,0],8.2);
  placeRow(.843,.954,-1,11.3,[2,4,0,3],8.0);placeRow(.92,.985,1,12,[1,5],8.5);
  function arch(g,x,y,z,R,top,width,depth){
   for(let j=0;j<12;j++){let a=j*Math.PI/12,b=(j+1)*Math.PI/12;
    let A=[x+Math.cos(a)*R,y+Math.sin(a)*R,z],B=[x+Math.cos(b)*R,y+Math.sin(b)*R,z];
    let C=[x+Math.cos(b)*(R+width),y+Math.sin(b)*(R+width),z],D=[x+Math.cos(a)*(R+width),y+Math.sin(a)*(R+width),z];
    g.quad(A,B,C,D,j%3===0?'#f4dbb0':cream);g.quad(A,B,[B[0],B[1],z+depth],[A[0],A[1],z+depth],'#bf9880');
    g.quad(C,D,[D[0],top,z],[C[0],top,z],stone);
   }
  }
  const arcade=new Geo();for(let j=0;j<4;j++){
   let x=j*3.7-5.55;arch(arcade,x,2.75,-2,1.48,4.67,.28,1.2);arcade.box(x-1.66,1.4,-1.6,.43,2.8,1.2,cream);
   arcade.box(x-1.66,.22,-1.6,.64,.44,1.42,stone)}
  arcade.box(7.17,1.39,-1.6,.44,2.78,1.2,cream);arcade.box(0,4.83,-.46,14.85,.39,3.56,cream);arcade.box(0,5.12,-.46,14.7,.22,3.43,coral);
  for(const [f,setback] of [[.285,3.4],[.316,4.16],[.39,3.4]]){
   const p=at(f*L,-(width(f)+setback)),yaw=p.yaw-Math.PI/2;p.y-=.05;add(arcade,p.x,p.y,p.z,yaw,1,10);
   // Keep each arch open from street to quay; the fascia is above the kart.
   for(const x of [-7.21,-3.51,.19,3.89,7.17]){
    api.solidLocal(p,yaw,x,0,-1.6,{tag:'marketPier',halfX:.22,halfZ:.60,h:2.8});
    if(x!==7.17)api.solidLocal(p,yaw,x,0,-1.6,{tag:'marketPierFoot',halfX:.32,halfZ:.71,h:.44});
   }
   api.solidLocal(p,yaw,0,4.635,-.46,{tag:'marketArcadeRoof',halfX:7.425,halfZ:1.78,h:.60});
  }
  // Three terraces establish the inhabited skyline even when the racers face away from the waterfront.
  const littleHouses=[];
  for(let i=0;i<6;i++){let g=new Geo(),w=4+(i%3)*.6,d=4.5,h=4.2+1.1*(i%4);
   g.box(0,h/2,0,w,h,d,walls[i]);g.box(0,h+.06,0,w+.26,.23,d+.26,cream);
   tileRoof(g,w,d,h+.14,i%2?coral:'#bf7553');for(const side of [-1,1]){
    const z=side*(d*.5+.02),x=side*(w*.5+.02);
    for(let k of [-1,1]){let q=k*w*.25;g.quad([q-.24,h-2.1,z],[q+.24,h-2.1,z],[q+.24,h-1.13,z],[q-.24,h-1.13,z],'#638a8b');
     let v=k*d*.23;g.quad([x,h-2.1,v-.24],[x,h-2.1,v+.24],[x,h-1.13,v+.24],[x,h-1.13,v-.24],'#698d8d')}
   }
   littleHouses.push(g)
  }
  const cypress=new Geo();cypress.tube(0,0,0,0,5.4,0,.31,.21,'#8b7362',6);cypress.ell(.15,3.79,0,1.1,2.75,1.16,'#57846d',8,5);cypress.ell(-.09,5.95,0,.65,2.19,.67,'#668e74',7,4);
  function settlement(x,z,R,H,seed){
   island(x,z,R,H,seed);const pixels=new Geo();
   for(let k=0;k<3;k++)for(let j=0;j<4;j++){if((j===0||j===3)&&k===0)continue;
    const nx=(j-1.5)*R*.32+1.1*rnd(seed+j),nz=(k-1)*R*.229+.7*rnd(seed+k),h=H*(.55+.17*(1-Math.abs(nx)/R))-.3;
    pixels.merge(littleHouses[(j+k*4+seed)%6],nx,h,nz,(-.22+.14*k),.91+.12*rnd(seed+j+6*k));
   }
   for(let j=0;j<5;j++){let a=(j*.84+.4);pixels.merge(cypress,Math.cos(a)*R*.66,H*.59,Math.sin(a)*R*.51,a,.7+.18*rnd(j+seed))}
   add(pixels,x,0,z,0,1,R+H+10);
  }
  settlement(37,25,23,7.6,38);settlement(153,72,31,11.5,23);settlement(30,-118,25,10.3,47);
  const tower=new Geo();tower.box(0,5.6,0,4.86,11.2,4.6,'#f4c88a');tower.box(0,11.24,0,5.14,.37,4.99,cream);
  for(let n=0;n<4;n++){let a=n*Math.PI/2;
   const wall=new Geo();wall.box(0,8.3,2.35,1.54,2.45,.07,cream);wall.box(0,8.26,2.42,1.12,2.01,.065,ink);
   wall.tube(0,5.86,2.31,0,5.86,2.48,.86,.86,cream,14);line(wall,[0,5.86,2.53],[.01,6.44,2.53],.05,ink,5);line(wall,[0,5.86,2.53],[.43,5.72,2.53],.052,ink,5);tower.merge(wall,0,0,0,a);
  }
  for(let x of [-1.8,1.8])for(let z of [-1.70,1.70])tower.box(x,13.25,z,.54,3.98,.54,cream);
  tower.tube(0,13.86,0,0,13.18,0,.22,.52,sun,9);tower.tube(0,13.2,0,0,12.52,0,.49,.85,sun,9);
  tower.box(0,15.38,0,4.76,.44,4.63,cream);tower.tube(0,15.59,0,0,16.42,0,2.57,2.4,teal,12);
  tower.ell(0,16.45,0,2.36,1.46,2.36,'#70a9a2',12,6);tower.tube(0,17.74,0,0,18.54,0,.36,.19,cream,8);tower.tube(0,18.51,0,0,19.47,0,.11,.05,sun,6);
  add(tower,37,8.5,25,0,1,23);
  const cart=new Geo();cart.box(0,1.17,0,3.56,.23,1.26,'#b7835d');cart.box(0,.7,0,3.30,.80,1.13,'#729491');
  for(let a of [-1,1])for(let b of [-1,1])line(cart,[a*1.59,.4,b*.5],[a*1.59,2.86,b*.5],.06,'#886851',5);
  for(let j=0;j<6;j++){const x=-1.93+j*.646,col=j%2?cream:'#df9760';cart.quad([x,2.83,.79],[x+.646,2.83,.79],[x+.646,3.18,0],[x,3.18,0],col);cart.quad([x,3.18,0],[x+.646,3.18,0],[x+.646,2.83,-.79],[x,2.83,-.79],col)}
  for(let j=0;j<8;j++)cart.ell((j%4-1.5)*.68,1.46,.20*(j<4?1:-1),.27,.23,.26,['#ea9d42','#c9584b','#9cb260'][j%3],6,3);
  for(let f of [.298,.352,.41]){
   const p=at(f*L,width(f)+1.97),yaw=p.yaw+Math.PI/2;add(cart,p.x,p.y,p.z,yaw,1,4);
   api.solidLocal(p,yaw,0,.30,0,{tag:'fishStall',halfX:1.78,halfZ:.63,h:1.02});
   api.solidLocal(p,yaw,0,2.82,0,{tag:'stallCanopy',halfX:1.93,halfZ:.79,h:.36});
  }
  function gate(){
   const g=new Geo();
   for(let sign of [-1,1]){
    let x=sign*(half+1.0);g.box(x,2.65,0,.76,5.3,.95,cream);g.box(x,.54,0,1.25,1.08,1.3,stone);g.box(x,5.25,0,1.26,.35,1.21,teal);
    g.tube(x,5.44,0,x,6.62,0,.57,.14,coral,8);g.tube(x,6.53,0,x,8.28,0,.075,.048,cream,5);
    g.tri([x,8.27,0],[x+sign*1.54,7.91,.16],[x,7.62,0],coral);
   }
   g.box(0,5.17,0,17.35,1.08,.72,ink);g.box(0,5.76,0,17.4,.12,.84,sun);
   g.label('PORTO AMBRA',0,5.22,-.375,11.6,.8,cream);
   for(let s of [-1,1])for(let j=0;j<3;j++){let x=s*(6.1+.7*j);g.tri([x-.28,5.58,-.382],[x+.34,5.22,-.382],[x-.28,4.88,-.382],s>0?cream:coral)}
   g.tube(0,6.40,-.09,0,6.4,.14,.91,.91,teal,14);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;line(g,[0,6.4,-.24],[.98*Math.cos(a),6.4+.98*Math.sin(a),-.24],.06,sun,4)}
   g.tube(0,6.4,-.29,0,6.4,-.16,.19,.19,cream,10);
   const p=at(0);add(g,p.x,p.y,p.z,p.yaw,1,14);
   for(const side of [-1,1]){
    const x=side*(half+1);
    api.solidLocal(p,p.yaw,x,0,0,{tag:'harborGateFoot',halfX:.625,halfZ:.65,h:1.08});
    api.solidLocal(p,p.yaw,x,1.08,0,{tag:'harborGateMast',halfX:.38,halfZ:.475,h:4.22});
   }
   api.solidLocal(p,p.yaw,0,4.63,0,{tag:'harborGateSpan',halfX:8.675,halfZ:.36,h:1.08});
  }
  gate();
  function bunting(f){
   const s=f*L,w=width(f)+1.05,g=new Geo();for(let a of [-1,1]){let A=pt(s,w*a,0),B=pt(s,w*a,5.65);line(g,A,B,.10,navy,5);
    api.solid(A[0],A[1],A[2],{tag:'regattaMast',r:.10,h:5.65})}
   for(let j=0;j<12;j++){let l=-w+2*w*j/12,o=2*w/12,h=x=>5.65-.87*(1-(x/w)**2);
    line(g,pt(s,l,h(l)),pt(s,l+o,h(l+o)),.026,ink,4);g.tri(pt(s,l+.12,h(l+.12)),pt(s,l+o-.12,h(l+o-.12)),pt(s+.05,l+.5*o,h(l+.5*o)-.7),[coral,sun,teal,cream][j%4])}
   chunk(g,at(s),14);
  }
  for(let f of [.093,.31,.376,.916])bunting(f);
  function sloop(size,accent){
   const g=new Geo(),s=size,proxy=new Geo();
   const keel=[[0,6.5],[1.55,2.8],[1.93,-1.2],[1.28,-4.6],[-1.28,-4.6],[-1.93,-1.2],[-1.55,2.8]];
   for(let i=0;i<keel.length;i++){let p=keel[i],q=keel[(i+1)%keel.length],v=(a,m,y)=>[a[0]*s*m,y*s,a[1]*s*m];
    const hull=[v(p,1,1.01),v(q,1,1.01),v(q,.74,-.35),v(p,.74,-.35)];
    g.quad(...hull,i%2?navy:'#31556a');proxy.quad(...hull,'#294f65');
    g.quad(v(p,1.012,1.13),v(q,1.012,1.13),v(q,1,1.0),v(p,1,1.0),accent);
    g.tri(v(p,1,1.13),v(q,1,1.13),[0,1.12*s,0],cream)
   }
   const P=(x,y,z)=>[x*s,y*s,z*s];line(g,P(0,1.15,.18),P(0,10.5,.18),s*.075,ink,6);
   line(g,P(0,2.5,.18),P(.21,2.4,-4.08),s*.07,ink,5);
   line(g,P(0,9.65,.18),P(0,1.18,5.63),s*.034,cream,4);
   const stripes=[accent,cream,accent,cream];for(let j=0;j<4;j++){
    let a=j/4,b=(j+1)/4;
    const mast=u=>P(.055,2.55+u*7.40,.1),back=u=>P(.34*(1-u)+.055,2.37+u*7.58,-4.0+4.1*u),mid=u=>P(.49*Math.sin((1-u)*2)+.055,2.46+u*7.49,-1.95+2.05*u);
    proxy.quad(mast(a),mast(b),back(b),back(a),stripes[j]);
    g.quad(mast(a),mast(b),mid(b),mid(a),stripes[j]);g.quad(mid(a),mid(b),back(b),back(a),j%2?'#f9e7bd':accent);
   }
   const jib=[P(0,9.1,.35),P(0,1.62,5.44),P(.43,2.34,.76)];
   g.tri(...jib,'#ffe6bb');proxy.tri(...jib,'#ffe6bb');
   g.box(0,1.61*s,-1.45*s,1.45*s,1.0*s,2.2*s,teal);g.box(0,2.14*s,-1.45*s,1.59*s,.17*s,2.37*s,cream);
   g.tri(P(0,10.45,.18),P(.02,10.10,-1.46),P(.01,9.83,.2),accent);
   const points=[],faces=[],indices=new Map(),data=proxy.d;
   for(let i=0;i<data.length;i+=27){
    const face=[];
    for(const offset of [0,9,18]){
     const v=data.slice(i+offset,i+offset+3),key=v.join('/');
     if(!indices.has(key)){indices.set(key,points.length);points.push(v)}
     face.push(indices.get(key));
    }
    face.push(data.slice(i+3,i+6));faces.push(face);
   }
   g.mirror={points,faces};return g;
  }
  mooredBoats.length=0;
  const boats=[sloop(.95,coral),sloop(1.16,teal),sloop(1.27,'#f0ba57')];
  for(const [i,x,z,a] of [[0,-12,10,-.23],[1,-25,1,-.15],[2,-29,25,.22],[0,-49,39,-.11],[1,-42,66,.4],[2,51,-117,-1.22],[1,71,-108,-1.05],[0,120,-94,-.82]]){
   const phase=rnd(x+z)*TAU,anim=t=>({y:.15*Math.sin(t*.91+phase),roll:.034*Math.sin(t*.72+phase),pitch:.012*Math.cos(t*.63+phase)});
   add(boats[i],x,-1.2,z,a,1,16,anim);
   const {points,faces}=boats[i].mirror;
   mooredBoats.push({x,z,c:Math.cos(a),s:Math.sin(a),anim,points,faces,sheet:points.map(()=>new Float64Array(3))});
  }
  function dock(x,z,length,yaw){
   const g=new Geo(),cs=Math.cos(yaw),sn=Math.sin(yaw),world=(px,py,pz)=>[x+px*cs+pz*sn,py-.1,z+pz*cs-px*sn];
   function board(y,centre,w,h,d,col){
    g.box(0,y,centre,w,h,d,col);
    const v=(side,end)=>world(side*w/2,y+h/2,centre+end*d/2);
    ground.addFace(v(-1,-1),v(1,-1),v(1,1),v(-1,1));
   }
   board(.1,0,2.35,.31,length,'#ad8871');
   for(let i=0;i<length;i++)board(.28,i-length*.5,2.40,.055,.72,i%2?'#d4ad86':'#cba37e');
   for(let i=0;i<length;i+=4.35)for(const side of [-1,1]){
    const px=side*1.1,k=i-length*.5;g.tube(px,-1.5,k,px,.74,k,.15,.13,'#735654',6);
    const foot=world(px,-1.5,k);
    api.solid(...foot,{tag:'lowPierPile',r:.145,h:2.24});
   }
   add(g,x,-.1,z,yaw,1,length*.6+3);
  }
  dock(-17,11,32,0);dock(-36,21,31,0);dock(70,-103,30,-1.10);
  function bollard(){
   const g=new Geo();g.tube(0,-.05,0,0,.19,0,.45,.44,teal,8);g.tube(0,.18,0,0,.8,0,.26,.24,ink,8);g.tube(0,.76,0,0,.94,0,.38,.39,cream,8);return g;
  }
  const moor=bollard();for(const [a,b,side] of [[.014,.165,-1],[.647,.812,1],[.50,.58,-1],[.903,.975,1]]){
   for(let s=a*L;s<b*L;s+=8.6){
    const f=s/L,p=at(s,side*(width(f)+Math.min(1.1,shoulder(f,side)-.47)));
    add(moor,p.x,p.y,p.z,p.yaw,1,1);api.solid(p.x,p.y-.05,p.z,{tag:'bollard',r:.39,h:.99});
   }
  }
  function crane(){
   const base=new Geo(),ochre='#e9b45c',dark='#9d745e';
   base.box(0,.42,0,7.0,.84,7.1,stone);
   for(let a of [-1,1])for(let b of [-1,1]){line(base,[a*2.5,.7,b*2.5],[a*.88,13.8,b*.88],.25,ochre,6)}
   for(let b of [-1,1]){for(let j=0;j<3;j++){const y=1+j*4,h=y+4.2,u=2.52-j*.49,v=u-.52;
    line(base,[-u,y,b*u],[v,h,b*v],.115,dark,5);line(base,[u,y,b*u],[-v,h,b*v],.115,ochre,5)}}
   base.tube(0,12.5,0,0,13.2,0,2.1,2.05,navy,10);base.box(0,14,0,3.48,2.1,3.18,ochre);base.box(0,14.2,-1.2,3.13,1.2,.95,ink);
   base.box(0,15.28,0,3.85,.25,3.55,cream);
   const jib=new Geo();jib.box(0,0,-2.23,3.75,1.78,3.53,teal);
   for(let b of [-1,1]){let x=.66*b;line(jib,[x,0,-1],[x,4.67,12.5],.18,ochre,5);line(jib,[x,1.79,-.85],[x,5.25,12.5],.14,ochre,5);
    for(let j=0;j<6;j++){let z=-.8+j*2.12;line(jib,[x,1.72+(z+.8)*.26,z],[x,(z+2.72)*.352,z+2.11],.085,dark,4)}}
   line(jib,[-.7,4.86,12.5],[.7,4.86,12.5],.18,navy,6);line(jib,[0,4.87,12.5],[0,-3.21,12.5],.037,ink,5);
   jib.box(0,-4.12,12.5,2.64,1.76,2.24,coral);for(let x of [-1,1])jib.box(x,-4.12,12.5,.14,1.82,2.29,cream);
   const p=at(.670*L,-16.2);p.y-=.08;add(base,p.x,p.y,p.z,p.yaw,1,18);
   api.solidLocal(p,p.yaw,0,0,0,{tag:'craneFooting',halfX:3.5,halfZ:3.55,h:.84});
   for(const a of [-1,1])for(const b of [-1,1]){
    api.solidLocal(p,p.yaw,a*2.31,.69,b*2.31,{tag:'craneLeg',r:.40,h:2.95});
   }
   add(jib,p.x,p.y+15.4,p.z,p.yaw+.90,1,19,t=>({yaw:.13*Math.sin(t*.38)}));
  }
  crane();
  const crate=new Geo();crate.box(0,.95,0,2.2,1.9,2.15,'#d69c68');
  for(let a of [-.92,.92]){crate.box(a,.95,0,.14,1.98,2.24,'#976f5c');crate.box(0,.95,a,2.27,1.98,.10,'#b8805b')}
  const cargoSites=[.606,.615,.624,.631,.655,.664,.674,.684];
  for(let j=0;j<cargoSites.length;j++){
   const f=cargoSites[j],setback=Math.min(2.9+j%2*1.5,shoulder(f,-1)-2.45);
   const p=at(L*f,-(width(f)+setback)),yaw=p.yaw+.21*(j%3);
   add(crate,p.x,p.y,p.z,yaw,.88,2.5);api.solid(p.x,p.y-.035,p.z,{tag:'cargoCrate',halfX:1.135*.88,halfZ:1.12*.88,h:1.98*.88,yaw});
  }
  const gull=new Geo();gull.tri([-1.55,.24,.16],[-.51,-.09,.05],[0,.115,-.17],cream);gull.tri([0,.115,-.17],[.48,-.08,.09],[1.6,.32,.21],cream);
  for(let j=0;j<5;j++){let x=-8-j*2.3,z=28+j*3.7,a=j*.73;add(gull,x,7.6+j*.26,z,0,1,10,t=>({x:3*Math.sin(t*.52+a),z:2.6*Math.cos(t*.48+a),y:.29*Math.sin(t*1.1+a),yaw:.2*Math.sin(t*.47+a),roll:.14*Math.sin(t*1.6+a)}))}
  // The tide, reflections, vertical quay walls and painted markings do not
  // support tyres. Higher bridges and low berths retain independent heights.
  return (x,z,p,maxY)=>{const h=ground.heightAt(x,z,maxY);return h!==null&&h>seaLevel?h:null};
 }
 return {id:'harbor',drawWaterReflections,name:'琥珀海港',english:'Amber Harbor',edgeKind:()=> 'void',shoulder,laps:3,half,points,width,height,bank,gaps,ramps,pads,coins,sections,surfaceLift,itemRows:[.073,.29,.504,.822],build};
}
