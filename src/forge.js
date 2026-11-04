// Furnace Keep. Paved battlements overlook a river of glowing, broken slag.
function forgeDefinition(){
 const half=8.8;
 const knots=[[0,-98],[49,-98],[86,-86],[103,-64],[101,-36],[82,-15],
  [73,5],[82,23],[105,44],[111,66],[99,88],[71,99],[50,95],
  [34,77],[21,59],[0,51],[-22,61],[-38,85],[-59,99],[-84,96],
  [-103,81],[-110,61],[-104,42],[-84,27],[-67,8],[-69,-10],
  [-84,-29],[-95,-48],[-92,-66],[-73,-84],[-52,-94],[-27,-98]];
 const points=tourSpline(knots,12);
 let length=0;for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];length+=Math.hypot(b[0]-a[0],b[1]-a[1]);
 }
 const tau=Math.PI*2;
 function swell(f,c,w){const d=Math.min(Math.abs(f-c),1-Math.abs(f-c));return Math.exp(-(d*d)/(w*w))}
 const height=f=>2.4+6.3*swell(f,.38,.100)+1.7*swell(f,.05,.095)+4.1*swell(f,.79,.080);
 const bank=f=>-.20*swell(f,.12,.034)+.14*swell(f,.24,.030)-.16*swell(f,.38,.027)
  -.14*swell(f,.48,.047)+.15*swell(f,.57,.030)-.19*swell(f,.73,.039)+.12*swell(f,.86,.030);
 const width=f=>half+.9*swell(f,.22,.045)+1.2*swell(f,.73,.038)-.77*swell(f,.52,.030);
 const pads=[{f:.192,l:4.85,w:3.7},{f:.455,l:-4.55,w:3.65},{f:.745,l:4.4,w:3.25}];
 const ramps=[{f:.466,l0:-6.83,l1:-2.30,length:6.4,rise:1.27}];
 const gaps=[{f0:.466,f1:.477,l0:-6.83,l1:-2.30}];
 function surfaceLift(f,l){let ra=ramps[0],dist=(ra.f-f)*length;
  return dist>=0&&dist<=ra.length&&l>=ra.l0&&l<=ra.l1?ra.rise*(1-dist/ra.length):0}
 const chain=9.35,pivot=10.3;
 function sentry(f,phase,speed){
  const angle=t=>.57*Math.sin(t*speed+phase);
  return {f,name:'锻锤',physical:true,radius:1.55,angle,center:t=>chain*Math.sin(angle(t)),active:t=>pivot-chain*Math.cos(angle(t))<2.27};
 }
 const hazards=[sentry(.211,1.6,1.42),sentry(.244,4.1,1.57)];
 const sections=[[0,'狮焰城门'],[.12,'锻锤长廊'],[.29,'上层炉壁'],[.43,'熔桥跳台'],
  [.53,'黑曜石连弯'],[.69,'铸轮盘道'],[.84,'烽火回廊']];
 const coins=[[.08,-.27,3],[.18,.51,3],[.277,-.32,3],[.402,.27,3],[.475,-.49,4],[.62,-.21,3],[.72,.48,3],[.89,-.18,4]];
 const stone='#554655',block='#635260',dark='#383447',black='#2d2b3b',lip='#998071';
 const copper='#b77657',bronze='#cd9864',gold='#f2bb73',bright='#ffe48c',fire='#ff9747';
 const hot='#ff6538',wine='#a74343',ivory='#f0d49e',steel='#786c77';
 function build(api){
  const {L,at,pt,add}=api;
  const deck=new RoadSurfaceIndex();
  tourRoad(api,{half,width,road:['#6b6170','#706470'],curb:['#b37758','#eaa75e'],
   edge:'#fec778',line:'#c7ada0',dash:true,pads,gaps,tile:4.5,deck:'#4a3f51',support:deck});
  let seed=36743;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  function mesh(){return new Geo()}
  function tube(g,x,y,z,X,Y,Z,r,R,col,n=8){g.tube(x,y,z,X,Y,Z,r,R,col,n)}
  function bar(g,a,b,r,col,n=6){tube(g,...a,...b,r,r,col,n)}
  function stamp(g,f,l,yaw=0,scale=1,r=15,anim=null,up=0){
   const p=at(f*L,l);add(g,p.x,p.y+up,p.z,p.yaw+yaw,scale,r,anim)
  }
  function chunkWorld(g,x,y,z,r){
   for(let i=0;i<g.d.length;i+=9){g.d[i]-=x;g.d[i+1]-=y;g.d[i+2]-=z}add(g,x,y,z,0,1,r);
  }
  function hotWindow(g,x,y,z,w,h,frame=bronze,glow=hot){
   // A pointed lancet lies on the -Z-facing wall, seen from the approaching road.
   const yz=z-.025,ww=w*.5,top=y+h;
   const outer=[[x-ww,y,yz],[x+ww,y,yz],[x+ww,y+h*.66,yz],[x,y+h,yz],[x-ww,y+h*.66,yz]];
   const outerMat=g.mat;g.mat=0;g.tri(outer[0],outer[1],outer[3],frame);g.tri(outer[1],outer[2],outer[3],frame);g.tri(outer[0],outer[3],outer[4],frame);
   const inset=w*.13,H=h-inset*1.8,B=y+inset,M=ww-inset;
   g.mat=5;let zc=yz-.025;g.quad([x-M,B,zc],[x+M,B,zc],[x+M,B+H*.67,zc],[x-M,B+H*.67,zc],glow);
   g.tri([x-M,B+H*.67,zc],[x+M,B+H*.67,zc],[x,B+H,zc],glow);
   g.mat=0;g.box(x,y+h*.38,yz-.10,.12,h*.69,.12,black);g.box(x,y+h*.41,yz-.10,w*.83,.12,.14,black);
   g.mat=outerMat;
  }
  function spire(g,x,z,h,w,origin=0,roof=true){
   const base=origin;
   tube(g,x,base-1,z,x,base+1.5,z,w*1.12,w,stone,8);
   tube(g,x,base+1.5,z,x,base+h-2,z,w,w*.82,block,8);
   tube(g,x,base+h-2,z,x,base+h-.25,z,w*.85,w*1.08,lip,8);
   tube(g,x,base+h-.25,z,x,base+h+.38,z,w*1.09,w*1.09,dark,8);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;
    g.box(x+Math.sin(a)*w*.94,base+h+.9,z+Math.cos(a)*w*.94,w*.38,1.45,w*.32,stone,a)}
   if(roof){tube(g,x,base+h+.15,z,x,base+h+w*1.58,z,w*.81,0,black,8);
    tube(g,x,base+h+w*1.32,z,x,base+h+w*1.76,z,.45,0,gold,6)}
  }
  const iron=finishTile('forge/quench-plate',(c,w,h)=>{
   c.fillStyle='#655b69';c.fillRect(0,0,w,h);
   const blocks=[[0,87,'#786774'],[87,165,'#6d626e'],[165,256,'#76656b']];
   for(const [a,b,col] of blocks){
    c.fillStyle=col;c.fillRect(a+1,2,b-a-2,h-5);c.fillStyle='#514957';c.fillRect(a,0,2,h);
    c.fillStyle='#b39589';c.fillRect(a+2,2,b-a-5,1);
    for(let y=9;y<h;y+=12)for(let x=a+8+(y%24?4:0);x<b-7;x+=12){
     c.strokeStyle='#86747a';c.lineWidth=1.2;c.beginPath();c.moveTo(x,y);c.lineTo(x+3.4,y-2);c.stroke();
    }
    for(const x of [a+5,b-6])for(const y of [7,h-8]){
     c.fillStyle='#514553';c.beginPath();c.arc(x,y,2.3,0,TAU);c.fill();c.fillStyle='#bd9282';c.fillRect(x-1.3,y-1.2,1.5,1);
    }
   }
   c.fillStyle='#977665';c.fillRect(0,h-3,w,1);
  });
  const herald=finishTile('forge/furnace-banner',(c,w,h)=>{
   c.fillStyle='#903e45';c.fillRect(0,0,w,h);c.fillStyle='#bb6b57';c.fillRect(9,0,5,h);c.fillRect(w-14,0,5,h);
   c.save();c.translate(w/2,h*.53);c.scale(58,23);c.strokeStyle='#e9b879';c.lineWidth=.056;
   c.beginPath();c.moveTo(0,-1);c.lineTo(1,0);c.lineTo(0,1);c.lineTo(-1,0);c.closePath();c.stroke();
   c.fillStyle='#f6ca83';c.beginPath();c.moveTo(-.43,.40);c.quadraticCurveTo(-.69,.03,-.39,-.23);
   c.quadraticCurveTo(-.4,.05,-.18,.13);c.quadraticCurveTo(.03,-.1,-.02,-.55);c.quadraticCurveTo(.42,-.29,.38,.08);
   c.lineTo(.56,-.14);c.quadraticCurveTo(.65,.20,.33,.44);c.closePath();c.fill();c.restore();
  });
  // Massive entry gate. The arch has depth and its stone courses follow the vault.
  function arch(g,rad,h,sill,z,depth){
   const fade=['#84717a','#a48579','#776674','#928078'];
   const step=12;
   for(let i=0;i<step;i++){
    let a=i*Math.PI/step,b=(i+1)*Math.PI/step,inner=rad,outer=rad+1.55;
    const point=(t,r,zz)=>[r*Math.cos(t),sill+h*Math.sin(t)*(r/rad),zz];
    const A=point(a,inner,z),B=point(b,inner,z),C=point(b,outer,z),D=point(a,outer,z);
    g.quad(A,B,C,D,fade[i%4]);g.quad(point(a,inner,z+depth),point(b,inner,z+depth),B,A,stone);
    g.quad(D,C,point(b,outer,z+depth),point(a,outer,z+depth),dark);
   }
  }
  function pennant(g,x,y,z,h,side=1){
   g.mat=4;bar(g,[x-1.6,y,z],[x+1.6,y,z],.13,gold);g.mat=0;
   const l=x-1.25,r=x+1.25,b=y-h,cc=z-.085;
   g.face([l,y,cc],[r,y,cc],[r,b+.88,cc],[l,b+.88,cc],'#ffffff',null,
     [[herald[0],herald[1]],[herald[2],herald[1]],[herald[2],herald[3]],[herald[0],herald[3]]]);
   g.tri([l,b+.88,cc],[r,b+.88,cc],[x,b-.3,cc],wine);
   g.mat=0;
  }
  function brazier(g,x,y,z,size=1){
   g.mat=4;tube(g,x,y,z,x,y+size*.56,z,size*.61,size,bronze,9);g.mat=5;
   tube(g,x,y+size*.53,z,x,y+size*1.76,z,size*.69,0,hot,7);
   tube(g,x+size*.11,y+size*.60,z-size*.19,x-size*.14,y+size*1.50,z,size*.36,0,bright,6);g.mat=0;
  }
  const gate=mesh();arch(gate,10.25,5.70,4.7,-2.2,4.4);
  for(const side of [-1,1]){
   let x=side*12.65;
   gate.box(x,2.05,0,4.86,5.35,5.5,block);gate.box(x,4.95,0,5.33,.9,6.1,lip);
   spire(gate,side*15.30,1.70,13.0,3.77,0,true);pennant(gate,side*12.35,5.7,-2.84,4.5);
   brazier(gate,side*11.9,6,-.03,1.16);
  }
  // A forged sun emblem, framed by a concentric diamond and opposed iron wings.
  gate.mat=4;const zz=-2.28;
  bar(gate,[-3.25,12.6,zz],[0,15.85,zz],.21,gold);bar(gate,[0,15.85,zz],[3.25,12.6,zz],.21,gold);
  bar(gate,[3.25,12.6,zz],[0,9.5,zz],.21,gold);bar(gate,[0,9.5,zz],[-3.25,12.6,zz],.21,gold);
  gate.mat=5;gate.tri([-1.0,11.4,zz-.1],[1.0,11.4,zz-.1],[.25,14.1,zz-.1],bright);
  gate.tri([-.82,11.7,zz-.11],[.2,12.35,zz-.11],[-1.40,13.35,zz-.11],fire);gate.mat=0;
  stamp(gate,.023,0,0,1,25);
  const doorway=at(.023*L);
  for(const side of [-1,1]){
   api.solidLocal(doorway,doorway.yaw,side*12.65,-.63,0,{tag:'forge/gate-pier',halfX:2.43,halfZ:2.75,h:5.36});
   api.solidLocal(doorway,doorway.yaw,side*15.3,-1,1.70,{tag:'forge/gate-tower',r:3.94,h:13});
  }
  // The landmark in the infield is a concentric citadel with a many-tiered furnace crown.
  const cit=mesh();cit.box(0,.3,0,54,7,35,dark);
  cit.box(0,5.2,0,38,9,24,stone);cit.box(0,9.55,0,41,1,26,lip);
  for(const x of [-21,21])for(const z of [-12,12])spire(cit,x,z,12+Number(z>0)*3,4.65,0,true);
  for(const side of [-1,1]){
   for(let j=0;j<5;j++){let x=-14.6+j*7.3,z=side*12.04;
    const face=mesh();hotWindow(face,0,2.8,-.04,3.2,5.65,copper,'#ff8552');
    cit.merge(face,x,0,z,side>0?Math.PI:0)}
   for(let j=0;j<6;j++)cit.box(-16.5+j*6.6,10.48,side*12.3,2.35,1.47,1.27,stone);
  }
  spire(cit,-3,1.7,15.5,8.85,6.0,false);
  tube(cit,-3,22.2,1.7,-3,29.0,1.7,6.65,5.28,stone,8);
  tube(cit,-3,28.6,1.7,-3,30,1.7,5.5,7.45,copper,8);
  for(let i=0;i<8;i++){let a=i*Math.PI/4,x=-3+6.05*Math.sin(a),z=1.7+6.05*Math.cos(a);
    tube(cit,x,29.4,z,x,34.4+(i%2)*1.8,z,.79,.06,dark,5)}
  cit.mat=5;tube(cit,-3,29.8,1.7,-3,30.05,1.7,4.9,4.7,'#ffb654',10);
  tube(cit,-3,30,1.7,-4,35.7,1.4,2.20,0,hot,8);
  tube(cit,-2.9,30,1.55,-2,34,1.45,1.56,0,bright,7);cit.mat=0;
  add(cit,2,-2,-10,.28,1,47);
  // The guard gantries show the sweep envelope and leave both outer lines clear.
  const gantry=mesh();for(let side of [-1,1]){
   const x=side*10.3;gantry.box(x,4.75,0,1.25,10.9,1.65,steel);gantry.box(x,.70,0,2.40,1.4,2.55,stone);
   bar(gantry,[x,6.4,0],[side*7.2,10.2,0],.31,copper);brazier(gantry,x,10.7,0,.66);
  }
  gantry.mat=4;gantry.box(0,10.3,0,21.25,.8,1.1,bronze);gantry.mat=0;
  const head=mesh();head.mat=4;bar(head,[0,0,0],[0,-chain+.95,0],.22,steel);
  for(let j=1;j<6;j++)head.box(0,-j*1.33,0,.45,.33,.51,copper,j%2*.7);
  head.box(0,-chain,0,2.76,1.72,2.26,dark);head.box(0,-chain+.07,0,1.38,1.88,2.32,copper);
  head.mat=5;head.box(0,-chain-.66,-1.15,2.50,.17,.1,fire);head.mat=0;
  for(const h of hazards){
   stamp(gantry,h.f,0,0,1,16);const p=at(h.f*L,0);
   add(head,p.x,p.y+pivot,p.z,p.yaw,1,12,t=>({roll:h.angle(t)}));
   for(const side of [-1,1]){
    api.solidLocal(p,p.yaw,side*10.3,0,0,{tag:'forge/gantry-base',halfX:1.20,halfZ:1.27,h:1.40});
    api.solidLocal(p,p.yaw,side*10.3,1.4,0,{tag:'forge/gantry-post',halfX:.625,halfZ:.825,h:8.80});
    // Each half follows its own point on the rotating head. A side that rises
    // off the ground leaves room underneath, even when the other side hits.
    const offset=side*.69;
    api.solidLocal(p,p.yaw,offset,pivot-chain-.90,0,{tag:'forge/hammer',halfX:.69,halfZ:1.14,h:1.80,
     hazard:h.name,reach:6,anim:t=>{
      const angle=h.angle(t),sn=Math.sin(angle),cs=Math.cos(angle);
      const across=chain*sn+offset*(cs-1);
      return {x:across*Math.cos(p.yaw),z:-across*Math.sin(p.yaw),y:chain*(1-cs)+offset*sn};
     }});
   }
  }
  // The lava branches through a continuous field of uneven plates. Shared
  // corners are computed in world space so a seam crosses chunk boundaries
  // cleanly; only a few hot fractures need a separate strip of geometry.
  const lavaY=-8.4,unit=11.4;
  const knot=(i,j)=>[(i-.5)*unit+2.45*Math.sin(i*2.31+j*1.12)+1.0*Math.cos(j*.79),
    (j-.5)*unit+2.25*Math.cos(j*2.14-i*.95)+.90*Math.sin(i*.71)];
  for(let tx=-3;tx<=3;tx++)for(let tz=-3;tz<=3;tz++){
   const x0=tx*57,z0=tz*57,g=mesh();g.mat=2;
   g.quad([-28.51,lavaY,-28.51],[28.51,lavaY,-28.51],[28.51,lavaY,28.51],[-28.51,lavaY,28.51],'#e76b42');
   for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
    const I=tx*5+i,J=tz*5+j,corners=[knot(I,J),knot(I+1,J),knot(I+1,J+1),knot(I,J+1)];
    const x=corners.reduce((a,v)=>a+v[0],0)/4,z=corners.reduce((a,v)=>a+v[1],0)/4;
    const hotRun=Math.max(0,1-2.3*Math.abs(Math.sin(z*.028+.61*Math.sin(x*.031)))),
      ratio=.93-.23*hotRun*((I+J)%3===0?1:.70);
    const P=(p,k,h)=>[x-x0+(p[0]-x)*k,lavaY+h,z-z0+(p[1]-z)*k];
    const A=corners.map(v=>P(v,ratio,.09));
    const tone=['#713f4c','#885052','#844851','#784653','#995447'][mod(I+2*J,5)];
    g.mat=0;g.tri(A[0],A[1],A[2],tone);g.tri(A[0],A[2],A[3],tone);
    const cut=mod(I+J*3,4),d=(cut+1)%4;
    g.mat=2;g.quad(A[cut],A[d],P(corners[d],ratio+.035,.055),P(corners[cut],ratio+.035,.055),hotRun>.45?'#ffc35e':'#ce5b48');
    if(mod(I*3+J,5)===1){
     const tip=[x-x0+(A[cut][0]-(x-x0))*.38,lavaY+.11,z-z0+(A[cut][2]-(z-z0))*.38];
     g.tri([A[cut][0],lavaY+.11,A[cut][2]],[A[cut][0]+.38,lavaY+.11,A[cut][2]+.17],tip,'#c26a4e');
    }
   }add(g,x0,0,z0,0,1,46);
  }
  // A few staged reflections sit below furnace mouths and catch the driver's eye on the bends.
  const furnace=mesh();furnace.box(0,2.0,0,17,9.8,10,block);
  furnace.box(0,6.9,0,18.8,1.0,11.2,lip);for(let j=-1;j<=1;j++){
   hotWindow(furnace,j*4.75,-1.4,-5.06,3.45,6.85,bronze,'#ff9453');
   tube(furnace,j*4.8,7.1,1.4,j*4.8,13+2*(j===0),1.4,1.30,.99,dark,8);
   tube(furnace,j*4.8,12.8+2*(j===0),1.4,j*4.8,13.6+2*(j===0),1.4,1.47,1.47,copper,8);
  }
  for(const [f,side] of [[.305,-1],[.67,1],[.885,-1]]){
   const p=at(f*L,side*(width(f)+8.8)),yaw=p.yaw+side*Math.PI/2;
   add(furnace,p.x,p.y-1.2,p.z,yaw,1,20);
   const rock=mesh(),origin=at(f*L,side*(width(f)+5.0));
   for(let q=0;q<5;q++){let x=q*2.05-4,z=q*.25;rock.mat=5;
    rock.quad([x-2,-8.25,z],[x+2,-8.25,z-.2],[x+1.35,-8.25,z+2.25],[x-1.4,-8.25,z+2.05],q%2?fire:'#f58b52')}
   add(rock,origin.x,0,origin.z,yaw,1,13);
  }
  // The main crown-wheel is open, so its spokes and hot crucibles stand against the sky.
  const wheel=mesh(),R=8.7;wheel.mat=4;
  for(let j=0;j<16;j++){const a=j*tau/16,b=(j+1)*tau/16;
   const point=(v,r,z)=>[r*Math.cos(v),r*Math.sin(v),z];
   for(let side of [-1,1]){const z=side*.79;bar(wheel,point(a,R,z),point(b,R,z),.30,bronze,5);
    if(!(j%2))bar(wheel,[0,0,z],point(a,R,z),.21,steel,5)}
   if(j%2===0){const x=Math.cos(a)*R,y=Math.sin(a)*R;
    tube(wheel,x,y,-1.46,x,y,1.46,.51,.51,copper,6);
    wheel.mat=5;tube(wheel,x,y,-1.56,x,y,-1.43,.29,.29,fire,6);wheel.mat=4}
  }
  tube(wheel,0,0,-1.31,0,0,1.31,1.18,1.18,gold,10);wheel.mat=0;
  const rack=mesh();for(let s of [-1,1]){
   bar(rack,[s*3.5,-7,-.1],[0,7.3,-.1],.72,block,6);
   rack.box(s*3.5,-5.4,-.1,3.3,3.4,3.3,stone)}
  for(const [f,side] of [[.388,1],[.777,-1]]){
   const p=at(f*L,side*(width(f)+8)),yaw=p.yaw+.42;
   add(rack,p.x,p.y,p.z,yaw,1,12);add(wheel,p.x,p.y+7.3,p.z,yaw,1,12,t=>({roll:t*.29*side}));
  }
  // Short inner ramp with iron risers and a gilded lip. The far lane remains flat.
  for(const r of ramps){
   const g=mesh(),end=r.f*L,start=end-r.length,mid=at(end-.5*r.length);
   function point(s,l){return pt(s,l,.078+(s-start)/r.length*r.rise)}
   for(let j=0;j<8;j++){let a=start+r.length*j/8,b=start+r.length*(j+1)/8;
    deck.addFace(point(a,r.l0),point(a,r.l1),point(b,r.l1),point(b,r.l0));
    g.mat=j===7?5:3;g.quad(point(a,r.l0),point(a,r.l1),point(b,r.l1),point(b,r.l0),j===7?bright:j%2?'#9b695c':'#d88b59');
    g.mat=0;for(let l of [r.l0,r.l1])g.quad(pt(a,l,.04),pt(b,l,.04),point(b,l),point(a,l),copper);
   }chunkWorld(g,mid.x,mid.y,mid.z,8)
  }
  // Red-hot metal is visible below the optional cut on the inside of the bridge.
  for(const gap of gaps){
   const a=gap.f0*L,b=gap.f1*L,mid=at((a+b)*.5),g=mesh();
   for(let k=0;k<4;k++){
    const s=a+(b-a)*k/4,t=a+(b-a)*(k+1)/4;
    for(const side of [-1,1]){const l=side<0?gap.l0:gap.l1;
     g.mat=0;g.quad(pt(s,l,.012),pt(t,l,.012),pt(t,l,-1.45),pt(s,l,-1.45),dark);
     g.mat=5;g.quad(pt(s,l,-.15),pt(t,l,-.15),pt(t,l,-.27),pt(s,l,-.27),fire);
    }
   }
   g.mat=2;g.quad(pt(a,gap.l0,-4),pt(b,gap.l0,-4),pt(b,gap.l1,-4),pt(a,gap.l1,-4),hot);
   chunkWorld(g,mid.x,mid.y,mid.z,10);
  }
  // Forged joints and brass studs along the parapets establish the passing speed.
  for(let first=0;first<L;first+=72){
   const g=mesh(),mid=at(first+32),last=Math.min(first+72,L);
   for(let s=first+3;s<last;s+=9){const f=s/L,w=width(f);
    const plate=f>.15&&f<.27||f>.43&&f<.51||f>.69&&f<.82;
    if(plate&&Math.abs(s-ramps[0].f*L)>20){
     const l=-w+.76,r=w-.76,start=s-.60,end=s+1.72;g.mat=0;
     g.face(pt(start,l,.048),pt(start,r,.048),pt(end,r,.048),pt(end,l,.048),'#ffffff',null,
       [[iron[0],iron[3]],[iron[2],iron[3]],[iron[2],iron[1]],[iron[0],iron[1]]]);
    }
    for(const side of [-1,1]){const right=side*w;
     const a=right-side*.25,b=right-side*(1.22+.40*Math.sin(f*19));
     g.mat=0;g.quad(pt(s-.085,a,.055),pt(s-.085,b,.055),pt(s+.11,b,.055),pt(s+.11,a,.055),dark);
     const edge=side*(w-.77);
     g.mat=plate?5:0;
     g.quad(pt(s+.22,edge,.059),pt(s+.62,edge-side*.19,.059),pt(s+3.65,edge-side*.19,.059),pt(s+3.25,edge,.059),plate?'#d98b56':'#a58a80');
    }
   }
   chunkWorld(g,mid.x,mid.y,mid.z,50);
  }
  // Course furniture. All static battlements are batched in road-length chunks.
  for(let first=0;first<L;first+=32){
   const g=mesh(),mid=at(first+16),last=Math.min(first+32,L);
   for(let s=first;s<last-.1;s+=8)for(let side of [-1,1]){
    const f=s/L,p=at(s,side*(width(f)+.48)),y=p.y;
    const keep=s/L>.805||s/L<.135||s/L>.46&&s/L<.61;
    g.box(p.x,y+.33,p.z,.72,.68,6.85,keep?stone:dark,p.yaw);
    api.solid(p.x,y-.01,p.z,{tag:'forge/parapet',yaw:p.yaw,halfX:.36,halfZ:3.425,h:.68});
    api.solid(p.x,y,p.z,{tag:'forge/merlon',yaw:p.yaw,halfX:keep?.56:.38,halfZ:keep?.73:.39,h:keep?1.84:1.36});
    g.box(p.x,y+(keep?.88:.67),p.z,keep?1.12:.76,keep?1.70:1.28,keep?1.45:.78,keep?block:steel,p.yaw);
    g.mat=keep?0:5;g.box(p.x,y+(keep?1.77:1.29),p.z,keep?1.35:.85,.13,keep?1.64:.89,keep?lip:fire,p.yaw);g.mat=0;
   }chunkWorld(g,mid.x,mid.y,mid.z,29)
  }
  const torch=mesh();torch.box(0,.62,0,1.52,1.3,1.52,stone);
  torch.mat=4;tube(torch,0,1.2,0,0,3.25,0,.34,.51,steel,7);brazier(torch,0,3.1,0,.79);
  const penn=mesh();bar(penn,[0,-.15,0],[0,5.6,0],.16,bronze);pennant(penn,0,5.2,0,3.55);
  for(let j=0;j<32;j++){let f=j/32+.012,side=j%2?1:-1;
   const l=side*(width(f)+1.25),p=at(f*L,l);
   stamp(j%3?torch:penn,f,l,0,1,7);
   if(j%3)api.solid(p.x,p.y,p.z,{tag:'forge/brazier',yaw:p.yaw,halfX:.76,halfZ:.76,h:1.3});
   else api.solid(p.x,p.y,p.z,{tag:'forge/standard',r:.16,h:5.6});
  }
  // Low basalt cliffs make the molten river a valley instead of an infinite orange floor.
  for(let j=0;j<26;j++){const a=j*tau/26,r=163+rand()*31,dir=rand()*tau,
    x=Math.sin(a)*r,z=Math.cos(a)*r,h=13+rand()*24,base=13+rand()*10,g=mesh();
   const pts=[];for(let k=0;k<7;k++){let b=dir+k*tau/7,r0=base*(.85+rand()*.25);
    pts.push([[Math.sin(b)*r0,-8.38,Math.cos(b)*r0],[Math.sin(b)*r0*.68,h*(.72+rand()*.31)-8.38,Math.cos(b)*r0*.68]])}
   for(let k=0;k<7;k++){const v=pts[k],w=pts[(k+1)%7];g.quad(v[0],w[0],w[1],v[1],['#685361','#594a5d','#78606a'][k%3]);
    g.tri(v[1],w[1],[0,h*.97-8.4,0],stone)}
   add(g,x,0,z,0,1,h+base);
  }
  return (x,z,p,maxY=Infinity)=>{
   if(Math.abs(p.l)<p.w-.6&&maxY>=p.y&&(p.f<gaps[0].f0-.012||p.f>gaps[0].f1+.004))return undefined;
   return deck.heightAt(x,z,maxY);
  };
 }
 return {id:'forge',name:'熔炉要塞',english:'Furnace Keep',edgeKind:()=> 'void',shoulder:()=>.45,half,laps:3,points,height,bank,width,build,pads,ramps,gaps,surfaceLift,
  sections,coins,hazards,itemRows:[.104,.335,.553,.837]};
}
