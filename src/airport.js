// Sunshine Airport / Star Cup. New geometry follows the terminal, apron, wing
// crossing, runway, suspended turn and return to the helipad. Units are kart metres.
function airportDefinition(){
 const knots=[[0,0],[0,29],[6,47],[22,53],[36,45],[40,26],[39,5],[40,-21],[51,-42],[75,-49],[94,-45],[110,-27],[121,-6],[125,23],[121,47],[109,68],[92,85],[64,105],[38,120],[18,142],[-4,163],[-28,176],[-49,175],[-63,159],[-62,140],[-48,126],[-31,123],[-12,123],[-7,111],[-15,90],[-34,73],[-53,49],[-68,27],[-71,4],[-61,-16],[-43,-22],[-23,-22],[-8,-20],[0,-10]];
 const samples=14,points=tourSpline(knots,samples),dist=[0];
 for(let i=0;i<points.length;i++){const q=points[(i+1)%points.length],p=points[i];dist.push(dist[i]+Math.hypot(q[0]-p[0],q[1]-p[1]))}
 const length=dist.at(-1),mark=k=>dist[k*samples]/length;
 const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const blend=(f,a,b)=>ease((f-a)/(b-a)),zone=(f,a,b,soft)=>blend(f,a,a+soft)*(1-blend(f,b-soft,b));
 const half=7.65,leave=mark(5),belts=mark(7),firstJet=mark(8),wing=mark(12),up=mark(18),down=mark(28),pad=mark(31),back=mark(35);
 const padRadius=11.25;
 const width=f=>{
  const lane=half+1.25*zone(f,mark(7),mark(17),.034)+.9*zone(f,mark(19),mark(28),.018)+.5*zone(f,mark(30),mark(35),.025);
  const ds=(f-pad)*length;
  return Math.abs(ds)<padRadius?Math.max(lane,.40+Math.sqrt(padRadius*padRadius-ds*ds)):lane;
 };
 // Departure is one storey above the apron. The runway climbs onto a raised
 // platform, the second glider ramp aims down towards the low helicopter pad.
 const height=f=>2.1+(1-blend(f,leave-.028,leave+.043))*2.8+blend(f,back-.035,back+.025)*2.8+
   2.1*zone(f,mark(9),mark(15),.038)+8.4*(blend(f,mark(16),up)-blend(f,down,pad));
 const bank=f=>-.075*zone(f,mark(1),mark(5),.022)+.06*zone(f,firstJet+.015,mark(11),.018)+.30*zone(f,mark(19),mark(27),.026)-.1*zone(f,mark(29),mark(33),.02);
 const gates=[{f:up,run:6.7,rise:2.45,span:14},{f:down,run:7.6,rise:2.3,span:16}];
 const ramps=gates.map(g=>({f:g.f,l0:-11,l1:11,length:g.run,rise:g.rise}));
 const gaps=gates.map(g=>({f0:g.f,f1:g.f+g.span/length,l0:-12,l1:12,launch:true}));
 const pads=[{f:up-13/length,l:-3.2,w:5.8},{f:up-13/length,l:3.2,w:5.8},{f:down-12/length,l:0,w:7.3},
  {f:mark(14),l:4.5,w:3.7},{f:mark(9),l:-3.7,w:3.6}];
 const coins=[[mark(2),-.39,4],[mark(6),.4,3],[wing-.016,.52,5],[mark(15),-.38,4],[up+.001,0,4],[mark(23),.28,4],[down+.002,-.15,4],[mark(34),.44,3]];
 const zones=[[0,'阳光航站楼'],[mark(2),'离港回头弯'],[leave,'登机桥出口'],[belts-.019,'行李装运区'],[firstJet,'客机腹下'],[wing-.026,'穿越客机货舱'],[mark(15),'海上起飞跑道'],[up,'第一滑翔区'],[mark(20),'空中反重力回环'],[down,'直升机坪进近'],[pad,'直升机停机坪'],[back,'到达厅 · 行李提取']];
 const edgeKind=f=>(f<leave||f>back)?'rail':(f>=mark(17)&&f<=pad)?'void':'runoff';
 const shoulder=f=>edgeKind(f)==='rail'?1.35:edgeKind(f)==='void'?.32:0;
 function branchLift(f,l){
  const along=Math.abs((f-wing)*length);
  // The port wing rises to the open cargo hold. On its left, the apron
  // remains at grade so a kart can pass beneath the aircraft.
  const across=blend(l,.35,2.1)*(1-blend(l,7.0,8.3));
  return 2.85*across*(1-ease((along-4.4)/13.4));
 }
 function surfaceLift(f,l){
  for(const r of ramps){const t=(r.f-f)*length;if(t>=0&&t<=r.length&&l>=r.l0&&l<=r.l1)return r.rise*(1-t/r.length)}
  return branchLift(f,l);
 }
 const hazards=[{physical:true,name:'行李箱',f:belts,radius:.83,center:t=>mod(t*2.55+6,27)-13.5},
  {physical:true,name:'行李箱',f:mark(36),radius:.84,center:t=>mod(10-t*2.15,26)-13}];
 function build(api){
  const {L,pt,at,add}=api,driveable=new RoadSurfaceIndex();
  const pearl='#fff4da',white='#f9fffc',gold='#ffbd3f',deep='#164761',aqua='#24c9d1',red='#f46648',metal='#7b939c',glass='#81dbe2';
  const canopy=finishTile('sunshine-reflected-glass',c=>{
   const sky=c.createLinearGradient(0,0,0,64);
   sky.addColorStop(0,'#486c84');sky.addColorStop(.42,'#82c3d0');sky.addColorStop(.56,'#aedbd8');sky.addColorStop(.61,'#57899b');sky.addColorStop(1,'#345466');
   c.fillStyle=sky;c.fillRect(0,0,256,64);
   c.fillStyle='#5c91a0';c.beginPath();c.moveTo(0,37);
   for(let i=0;i<=16;i++)c.lineTo(i*16,29+5*Math.cos(i*.82)+3*Math.sin(i*1.4));
   c.lineTo(256,40);c.lineTo(0,40);c.fill();
   c.fillStyle='rgba(239,255,241,.45)';
   for(const x of [-8,52,138,227]){c.beginPath();c.moveTo(x,0);c.lineTo(x+17,0);c.lineTo(x-17,43);c.lineTo(x-26,43);c.fill()}
   c.fillStyle='#385767';for(const x of [0,63,127,191,254])c.fillRect(x,0,3,64);
   c.fillStyle='#a7c5c9';for(const x of [2,65,129,193])c.fillRect(x,0,1,64);
   c.fillStyle='#668795';c.fillRect(0,2,256,2);c.fillStyle='#d0d9c8';c.fillRect(0,55,256,2);c.fillStyle='#354b60';c.fillRect(0,60,256,4);
  });
  const deckSkin=finishTile('sunshine-magnetic-deck',c=>{
   c.fillStyle='#598295';c.fillRect(0,0,256,64);
   c.fillStyle='#526f84';c.fillRect(0,0,256,2);c.fillRect(0,62,256,2);
   for(const x of [0,221]){
    c.fillStyle='#3c6077';c.fillRect(x,0,35,64);
    c.fillStyle='#466e80';c.fillRect(x+2,4,31,56);
    c.fillStyle='#6599a6';c.fillRect(x+2,3,31,1);
    c.fillStyle='#396276';for(let i=0;i<5;i++)c.fillRect(x+8,13+i*8,16,2);
    c.fillStyle='#a4bfc4';for(const xx of [4,29])for(const yy of [6,55])c.fillRect(x+xx,yy,2,2);
   }
   c.fillStyle='#83d1d3';c.fillRect(37,0,2,64);c.fillRect(217,0,2,64);
   c.fillStyle='#7496a2';c.fillRect(41,3,174,1);
   c.fillStyle='#557c8c';c.fillRect(72,0,1,64);c.fillRect(183,0,1,64);
   c.fillStyle='#78a6af';for(let i=0;i<24;i++)c.fillRect(43+(i*47)%171,6+(i*17)%50,2+i%3,1);
  });
  const foilSkin=finishTile('sunshine-wing-livery',c=>{
   c.fillStyle='#dbe2df';c.fillRect(0,0,256,64);
   for(let i=0;i<6;i++){
    const x=i*44;c.fillStyle=i%2?'#d6dedc':'#e2e7e1';c.fillRect(x,0,43,64);
    c.fillStyle='#92a5a8';c.fillRect(x,6,1,48);c.fillRect(x+2,48,41,1);
    c.fillStyle='#a9babc';for(let k=0;k<7;k++)c.fillRect(x+4+k*5,29,1,1);
   }
   c.fillStyle='#aebdc0';c.fillRect(0,52,242,2);
   c.fillStyle='#e8ba5d';c.beginPath();c.moveTo(201,1);c.lineTo(221,1);c.lineTo(210,63);c.lineTo(190,63);c.fill();
   c.fillStyle='#528fa0';c.beginPath();c.moveTo(226,1);c.lineTo(256,1);c.lineTo(256,63);c.lineTo(215,63);c.fill();
  });
  const pi=Math.PI;
  const line=(g,a,b,rad,col,n=5)=>g.tube(...a,...b,rad,rad,col,n);
  const local=(g,p,rad)=>{for(let i=0;i<g.d.length;i+=9){g.d[i]-=p.x;g.d[i+1]-=p.y;g.d[i+2]-=p.z}add(g,p.x,p.y,p.z,0,1,rad)};
  const ribbon=(g,s,t,a,b,h,color,j=h)=>g.quad(pt(s,a,h),pt(s,b,h),pt(t,b,j),pt(t,a,j),color);
  const inGap=f=>gaps.some(g=>f>=g.f0&&f<g.f1);
  const cuts=[0,L,leave*L,back*L,...gaps.flatMap(g=>[g.f0*L,g.f1*L])];
  const cargoS=wing*L,landingS=pad*L;
  const wingSection=[...Array.from({length:10},(_,i)=>mix(.35,2.1,i/9)),
   ...Array.from({length:9},(_,i)=>mix(7.0,8.3,i/8))];
  for(let offset=-18;offset<=18;offset++)cuts.push(cargoS+offset);
  const rings=[padRadius,8.85,8.25];
  for(const radius of rings)for(let j=0;j<=32;j++)cuts.push(landingS-radius*Math.cos(pi*j/32));
  for(const offset of [-2.35,-.28,.28,2.35])cuts.push(landingS+offset);
  // Paint is tessellated directly into this section of the racing surface.
  // Matching edges share positions exactly; no painted overlay, depth offset
  // or low-resolution circular texture is needed at the shallow approach angle.
  function landingMark(g,s,t,a,b,pave){
   const u=s-landingS,v=t-landingS,mid=(u+v)*.5;
   const cuts=[[-a,-b],[a,b]];
   for(const radius of rings){
    if(Math.abs(mid)>=radius)continue;
    const e=Math.sqrt(Math.max(0,radius*radius-u*u)),k=Math.sqrt(Math.max(0,radius*radius-v*v));
    cuts.push([-e,-k],[e,k]);
   }
   if(Math.abs(mid)<2.35)for(const x of [-1.925,-1.375,1.375,1.925])cuts.push([x,x]);
   cuts.sort((x,y)=>x[0]+x[1]-y[0]-y[1]);
   for(let i=0;i+1<cuts.length;i++){
    const [x,X]=cuts[i],[z,Z]=cuts[i+1],l=(x+X+z+Z)*.25,r2=l*l+mid*mid;
    if(z-x+Z-X<1e-6)continue;
    const goldH=Math.abs(mid)<2.35&&Math.abs(l)>=1.375&&Math.abs(l)<1.925||
      Math.abs(mid)<.28&&Math.abs(l)<1.375;
    const paint=goldH?'#fff29d':r2>=rings[0]**2?pave:r2<rings[1]**2&&r2>=rings[2]**2?pearl:'#699485';
    g.quad(pt(s,x),pt(s,z),pt(t,Z),pt(t,X),paint);
   }
  }
  const n=Math.ceil(L/3.7);for(let i=1;i<n;i++)cuts.push(i*L/n);cuts.sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i+=8){
   const end=Math.min(i+8,cuts.length-1),g=new Geo();
   for(let j=i;j<end;j++){
    const s=cuts[j],t=cuts[j+1],f=(s+t)/(2*L),a=width(s/L),b=width(t/L),term=f<leave||f>back,deck=f>up&&f<down;
    if(t-s<.001||inGap(f))continue;
    g.mat=term?3:deck?2:1;
    const pave=term?(j%2?'#b9c2bb':'#bfc8c1'):deck?(j%2?'#517f98':'#56859d'):(f>mark(15)&&f<up)?'#505d6b':(j%2?'#9ca9ac':'#a0abae');
    const firstSurface=g.d.length;
    const onPad=Math.abs((f-pad)*L)<padRadius,onWing=Math.abs((f-wing)*L)<18;
    if(onPad){
     landingMark(g,s,t,a,b,pave);
    }else if(onWing){
     // The two routes share a watertight surface. Subdivide only the lateral
     // transition and use the same lift function as the tyres at every vertex.
     const left=[-a,...wingSection,a],right=[-b,...wingSection,b];
     const point=(u,l)=>pt(u,l,branchLift(u/L,l));
     for(let k=0;k<left.length-1;k++){
      const l=left[k],r=left[k+1];
      const color=l>=.35&&r<=8.3?(l>=2.1&&r<=7?'#e1e9de':'#b5cacc'):pave;
      g.quad(point(s,l),point(s,r),point(t,right[k+1]),point(t,right[k]),color);
     }
    }else if(deck){
     // Only the service shoulders need per-pixel texture sampling. The broad
     // strip between them keeps the inexpensive opaque asphalt path on mobile.
     const inner=.68;
     g.quad(pt(s,-a*inner),pt(s,a*inner),pt(t,b*inner),pt(t,-b*inner),pave);
     courseSkinFace(g,pt(t,-b),pt(t,-b*inner),pt(s,-a*inner),pt(s,-a),deckSkin,0,0,.16,1);
     courseSkinFace(g,pt(t,b*inner),pt(t,b),pt(s,a),pt(s,a*inner),deckSkin,.84,0,1,1);
    }else g.quad(pt(s,-a),pt(s,a),pt(t,b),pt(t,-b),pave);
    driveable.addGeometry(g,firstSurface);
    g.mat=0;
    if(term){ribbon(g,s,Math.min(s+.048,t),-a,a,.026,'#b8c1b2');
     for(let l=-6;l<=6;l+=3)ribbon(g,s,t,l,l+.04,.027,'#c4c7b8');
     ribbon(g,s,t,-.24,.24,.032,'#f5cc5b');
    }else if(deck){
     if(j%3===0)ribbon(g,s,t,-.065,.065,.026,'#8cf8f4');
    }else if(!onPad&&!onWing&&j%3===0)ribbon(g,s,Math.min(t,s+2),-.12,.12,.026,'#fff5d2');
    // Paint sits on the pavement and shares the road's culled chunk.
    // Taxiway panels have dark surrounds around amber lines; the launch strip
    // carries touchdown rubber and progressively wider threshold bars.
    if(!term&&!deck&&!onWing&&f<up){
     const takeoff=f>=mark(15),mid=(s+t)*.5,seg=t-s;
     ribbon(g,s,t,-a+.75,-a+.98,.031,takeoff?'#e2e5db':'#67776e');
     ribbon(g,s,t,a-.98,a-.75,.031,takeoff?'#e2e5db':'#67776e');
     if(takeoff){
      for(const side of [-1,1]){
       const v=side*2.2+.21*Math.sin(mid*.13);
       ribbon(g,s,t,v-.21,v+.21,.030,'#434f59');
       if(j%5<2)ribbon(g,s,t,side*(a-2.7),side*(a-1.05),.036,'#e5e7d9');
      }
     }else{
      const x=1.5*Math.sin(s*.033),y=1.5*Math.sin(t*.033);
      for(const [w,c,h] of [[.20,'#56636b',.030],[.10,'#f8c45f',.035]])
       g.quad(pt(s,x-w,h),pt(s,x+w,h),pt(t,y+w,h),pt(t,y-w,h),c);
      if(seg>1.5&&j%4===0){const l=a-1.55;
       ribbon(g,s+.18,s+1.18,l,l+.83,.037,'#62747a');
       for(let k=0;k<4;k++)ribbon(g,s+.23+k*.23,s+.32+k*.23,l+.08,l+.74,.044,'#aebcb9');
      }
     }
    }
    for(const side of [-1,1]){
     const l=side*a,m=side*b,lip=shoulder(f),fall=edgeKind(f)==='void',rail=edgeKind(f)==='rail';
     const edge=term?'#e7af49':deck?'#8bf1f0':j%2?'#fff0bb':'#e4ae47';
     if(!onPad)g.quad(pt(s,l-side*.28,.02),pt(s,l+side*.08,.02),pt(t,m+side*.08,.02),pt(t,m-side*.28,.02),edge);
     const apron=Math.max(zone(f,mark(7),mark(15),.030),zone(f,pad,back,.035));
     const extra=rail?lip:fall?.32:5.7+7*apron;
     if(apron>.30){
      const line0=l+side*2.26,line1=m+side*2.26;
      g.quad(pt(s,line0,.04),pt(s,line0+side*.12,.04),pt(t,line1+side*.12,.04),pt(t,line1,.04),'#d5986b');
      if(j%3===1){
       g.quad(pt(s,l+side*3,.042),pt(s+.25,l+side*3,.042),pt(t,m+side*(extra-.72),.042),pt(t-.23,m+side*(extra-.72),.042),'#d9c99b');
      }
     }
     // The edge stripe overlaps the core road. Its 8 cm outer lip is also
     // pavement, including the unpainted rim of the helicopter pad.
     const verge=[pt(s,l,.008),pt(s,l+side*extra,.008),pt(t,m+side*extra,.008),pt(t,m,.008)];
     driveable.addFace(...verge);
     g.quad(...verge,term?'#aab9b4':fall?'#47738d':apron>.3?(j%2?'#99a8a7':'#9daaa9'):'#a9b5a8');
     if(rail||fall){
      const e=l+side*extra,k=m+side*extra;
      g.quad(pt(s,e,-.65),pt(t,k,-.65),pt(t,k,rail?.75:0),pt(s,e,rail?.75:0),rail?'#b3c9c6':'#33596e');
      if(!onPad){
       const firstRim=g.d.length;
       ribbon(g,s,t,e-side*.16,e+side*.16,rail?.80:.025,rail?'#e8ad45':aqua);
       driveable.addGeometry(g,firstRim);
      }
     }
     if(deck&&j%3===0){
      g.mat=5;const end=Math.min(t,s+1.6);
      g.quad(pt(s,l-side*.75,.094),pt(s,l-side*.40,.094),pt(end,l-side*.40,.094),pt(end,l-side*.75,.094),aqua);g.mat=0;
     }
    }
   }
   if(g.d.length)local(g,at((cuts[i]+cuts[end])/2),36);
  }
  function paintPad(p){
   const g=new Geo(),s=p.f*L,half=p.w*.5,x=p.l;
   g.mat=2;ribbon(g,s-2,s+2,x-half,x+half,.045,'#f09c43');
   for(const z of [-1.25,.10,1.37])for(const side of [-1,1])g.quad(pt(s+z-.43,x+side*(half-.10),.061),pt(s+z,x+side*(half-.10),.061),pt(s+z+.68,x,.061),pt(s+z+.23,x,.061),pearl);
   local(g,at(s),9);
  }
  pads.forEach(paintPad);
  for(const r of ramps){
   const s=r.f*L,start=s-r.length,g=new Geo(),w=width(r.f)+.1;
   g.mat=2;ribbon(g,start,s,-w,w,.04,'#278eaa',r.rise+.04);
   driveable.addGeometry(g);
   for(const side of [-1,1]){
    const e=side*w;
    g.quad(pt(start,e,0),pt(s,e,0),pt(s,e,r.rise+.05),pt(start,e,.05),'#27546e');
    ribbon(g,start,s,e-side*.22,e,.06,white,r.rise+.06);
   }
   for(let j=0;j<4;j++){
    const b=start+.8+j*(r.length-2.1)/3,H=(ss)=>(ss-start)*r.rise/r.length+.075;
    for(const side of [-1,1]){const z=b+.52,tip=b+1.09;g.quad(pt(b,side*(w-.36),H(b)),pt(z,side*(w-.36),H(z)),pt(tip,0,H(tip)),pt(tip-.52,0,H(tip-.52)),j%2?aqua:white)}
   }
   local(g,at(s),15);
  }
  const floor=new Geo();floor.quad([-165,-1,-98],[181,-1,-98],[181,-1,78],[-165,-1,78],'#90bc7b');
  driveable.addGeometry(floor); // Island grass; the offshore water below it is scenery.
  floor.mat=9;floor.quad([-340,-2.45,-350],[360,-2.45,-350],[360,-2.45,410],[-340,-2.45,410],'#4dbdc6');add(floor,0,0,0,0,1,560);
  // Sun flecks break up the offshore water on the approach to the helipad.
  // Batch by water tile; no animated water mesh pass is needed.
  for(let iz=0;iz<3;iz++)for(let ix=0;ix<5;ix++){
   const tile=new Geo(),x=-132+ix*61,z=93+iz*45;
   for(let n=0;n<17;n++){
    const seed=(ix*27+iz*11+n)*2.39996;
    const a=Math.sin(seed*2.13)*27,b=Math.cos(seed*.94)*20,len=1.2+1.7*(1+Math.sin(seed));
    tile.quad([a,-2.39,b],[a+len,-2.39,b+.08],[a+len+1,-2.39,b+.32],[a+.66,-2.39,b+.25],n%4?'#58c1c7':'#89d3cf');
   }
   add(tile,x,0,z,0,1,40);
  }
  // A gently arched glass terminal. The rafters, glazing bars and counters
  // remain open between bays; the bright apron stays visible from the grid.
  const hall=new Geo();
  // The concourse slab ends at the apron doorway, clear of the descending road.
  // Slabs under the banked hairpin stay below its low shoulder, including
  // where the exit road descends across the edge of the second slab.
  function terminalSlab(x,z,w,d,h,color){
   hall.box(x,h*.5,z,w,h,d,color);
   const x0=x-w*.5,x1=x+w*.5,z0=z-d*.5,z1=z+d*.5;
   driveable.addFace([x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1]);
  }
  terminalSlab(-5.5,15.5,53,72,3.9,'#d3ceac');
  terminalSlab(34,27,25,46,1.92,'#b6c5b4');
  // Cut the facade where the arrival road actually crosses it. The same
  // spans build the panels and their colliders, leaving the entire lane open.
  const terminalRoad=[];
  for(let s=0;s<L;s+=2.0){const q=at(s);if(q.x< -18||q.x>31)terminalRoad.push({x:q.x,z:q.z,w:width(q.f)+2.0})}
  const inDoor=(x,z)=>terminalRoad.some(q=>(q.x-x)**2+(q.z-z)**2<q.w*q.w);
  for(let z=-23;z<55;z+=12){
   const X=[-32,-18,-2,18,33,46],H=[11.8,16,17.8,17.4,15.3,11.9];
   for(let k=0;k<X.length-1;k++){
    const a=X[k],b=X[k+1],h=H[k],q=H[k+1];
    if(k===1||k===3)courseSkinFace(hall,[a,h,z],[b,q,z],[b,q,z+11.55],[a,h,z+11.55],canopy);
    else hall.quad([a,h,z],[a,h,z+11.55],[b,q,z+11.55],[b,q,z],pearl);
    line(hall,[a,h-.10,z],[b,q-.10,z],.17,'#5793a2',5);
   }
   for(const x of [-31,46]){
    if(inDoor(x,z))continue;
    hall.box(x,8.3,z,.45,7.2,.57,white);
    api.solid(x,4.7,z,{tag:'airport/hall-column',halfX:.225,halfZ:.285,h:7.2});
    const inward=x<0?1:-1;
    line(hall,[x,10.15,z],[x+inward*4.5,13.05,z],.145,metal,5);
   }
   let panelStart=null;
   for(let cell=0;cell<=24;cell++){
    const lo=z+.85+9.90*cell/24;
    if(cell<24&&!inDoor(-30.93,lo+.20625)){if(panelStart===null)panelStart=lo;continue}
    if(panelStart===null)continue;
    courseSkinFace(hall,[-30.93,9.40,panelStart],[-30.93,9.40,lo],[-30.93,5.00,lo],[-30.93,5.00,panelStart],canopy);
    const centre=(lo+panelStart)*.5,span=lo-panelStart;
    hall.box(-30.75,5.1,centre,.4,.4,span,white);
    api.solid(-30.93,5,centre,{tag:'airport/terminal-glass',halfX:.15,halfZ:span*.5,h:4.40});
    panelStart=null;
   }
  }
  add(hall,0,0,0,0,1,81);
  const seats=new Geo();
  for(let k=0;k<5;k++){const z=k*1.10;
   seats.box(0,.70,z,1.06,.20,.94,deep);seats.box(-.46,1.14,z,.16,.82,.94,'#247f94');
   seats.box(.12,.35,z,.12,.6,.21,metal);
  }
  for(const [x,y,z] of [[-9,5,6],[-10,5,16],[13,5,8],[12,5,24],[28,5,26],[30,5,16]]){
   add(seats,x,y,z,0,1,6);
   api.solid(x,y+.06,z+2.2,{tag:'airport/seats',halfX:.54,halfZ:2.67,h:1.48});
  }
  function signFace(text,w=8){
   const g=new Geo();g.box(0,0,0,w,1.60,.28,deep);g.box(0,-.70,-.03,w,.10,.36,gold);
   g.label(text,0,.03,-.15,w-.4,.98,white);return g;
  }
  const sign=signFace('SUNSHINE  AIRPORT',18);
  for(const x of [-9.6,9.6]){sign.box(x,-2.1,0,.42,6.5,.54,white);sign.box(x,.75,0,.66,.16,.86,gold)}
  add(sign,0,12.1,0,0,1,13);
  const board=new Geo();board.box(0,0,0,8.0,4.2,.42,deep);board.box(0,1.78,-.22,7.55,.44,.08,gold);
  board.label('DEPARTURES',0,1.78,-.29,6.9,.37,deep);
  board.label('08:10   DOLPHIN',0,.70,-.26,7.1,.56,pearl);
  board.label('09:45   DRY DESERT',0,-.23,-.26,7.1,.56,pearl);
  board.label('10:20   SWEET',0,-1.17,-.26,7.1,.56,pearl);
  const bp=at(-8,10.2);add(board,bp.x,bp.y+4.2,bp.z,bp.yaw-.36,1,6);
  const departure=signFace('SUNSHINE  INTL',11.3),over=at(21,0);
  for(const x of [-4.9,4.9])departure.box(x,2.45,0,.09,4.80,.09,metal);
  add(departure,over.x,over.y+7.55,over.z,over.yaw,1,11);
  const gateSign=signFace('04    GATES',6);
  for(const f of [mark(2),leave-.012,back+.01]){let p=at(f*L);add(gateSign,p.x,p.y+6.2,p.z,p.yaw,1,7)}
  function sunEmblem(g,x,y,z,r,col){
   for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;
    g.tri([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],col);
    if(i%2===0){const mid=(a+b)/2;g.tri([x+Math.cos(a)*r*1.18,y+Math.sin(a)*r*1.18,z],[x+Math.cos(mid)*r*1.67,y+Math.sin(mid)*r*1.67,z],[x+Math.cos(b)*r*1.18,y+Math.sin(b)*r*1.18,z],col)}
   }
  }
  const crest=new Geo();sunEmblem(crest,0,0,0,1.09,gold);add(crest,0,14.22,-.14,0,1,2);
  // Intersect a swept foil with narrow spanwise strips. Every collision
  // footprint lies inside the visible underside, including the swept-back tips.
  function skinVolumes(poly,tag,boxes){
   const minX=Math.min(...poly.map(p=>p[0])),maxX=Math.max(...poly.map(p=>p[0]));
   const ends=[...new Set(poly.map(p=>p[0]))].sort((a,b)=>a-b);
   const cut=x=>{
    const points=[];
    for(let i=0;i<4;i++){
     const a=poly[i],b=poly[(i+1)%4];
     if(x<Math.min(a[0],b[0])-1e-8||x>Math.max(a[0],b[0])+1e-8||Math.abs(a[0]-b[0])<1e-8)continue;
     const t=(x-a[0])/(b[0]-a[0]);
     points.push([mix(a[2],b[2],t),mix(a[1],b[1],t)]);
    }
    return points.sort((a,b)=>a[0]-b[0]);
   };
   for(let j=1;j<ends.length;j++){
    const n=Math.ceil((ends[j]-ends[j-1])/.90);
    for(let k=0;k<n;k++){
     const x0=mix(ends[j-1],ends[j],k/n),x1=mix(ends[j-1],ends[j],(k+1)/n);
     const l=cut(Math.max(minX+.000001,x0+.000001)),r=cut(Math.min(maxX-.000001,x1-.000001));
     if(!l.length||!r.length)continue;
     const z0=Math.max(l[0][0],r[0][0]),z1=Math.min(l.at(-1)[0],r.at(-1)[0]);
     if(z1-z0<.035)continue;
     const y=Math.min(l[0][1],l.at(-1)[1],r[0][1],r.at(-1)[1]);
     boxes.push({x:(x0+x1)*.5,y,z:(z0+z1)*.5,hx:(x1-x0)*.5,hz:(z1-z0)*.5,tag});
    }
   }
  }
  const cargoStand=1.82;
  function jet(accent,hold=false,apronMount=false){
   // Longitudinal rings define a real cockpit hump, tapered nose and tail
   // cone. The freighter omits centre side panels at the two cargo doors.
   const g=new Geo(),N=12;g.underSkins=[];
   const rings=[[-19,.38,.44,3.65],[-16,1.47,1.23,3.53],[-12,2.1,1.87,3.45],[-6,2.40,2.20,3.44],[-3.7,2.47,2.26,3.44],[3.7,2.47,2.26,3.44],[9,2.4,2.42,3.53],[12.5,2.22,2.28,3.56],[15.3,1.84,1.65,3.43],[17.4,1.15,1.06,3.17],[18.6,.08,.11,3.06]];
   const ring=(r,j)=>[r[1]*Math.cos(j*TAU/N),r[3]+r[2]*Math.sin(j*TAU/N),r[0]];
   g.mat=3;
   for(let i=0;i<rings.length-1;i++)for(let j=0;j<N;j++){
    const h=Math.sin((j+.5)*TAU/N);
    if(hold&&i===4&&h<.80)continue;
    const col=h<-.47?'#7796a3':h>-.23&&h<.3?accent:white;
    const shell=[ring(rings[i],j),ring(rings[i],j+1),ring(rings[i+1],j+1),ring(rings[i+1],j)];
    g.quad(...shell,col);
    if(hold&&i===4){
     const ceiling=shell.map(v=>[v[0],v[1]-.12,v[2]]);
     g.quad(...ceiling,'#a0babd');
     skinVolumes(ceiling,'airport/cargo-roof',g.underSkins);
    }
   }
   if(hold){
    // The raised racing deck supplies the cargo floor through both doors.
    for(const z of [-3.68,3.68])g.box(0,3.70,z,4.6,3.55,.18,'#c4d6ce');
   }
   g.mat=0;
   function foil(sign,coords,color){
    // High-mounted cargo wings leave a genuine kart-height cargo passage.
    // Tailplanes retain their original mount.
    const rise=coords[0][2]>-10?(hold?3.12:apronMount?.82:0):0;
    const top=coords.map(v=>[sign*v[0],v[1]+rise,v[2]]);
    if(coords[1][0]>12&&coords[0][0]<2)courseSkinFace(g,...top,foilSkin);else g.quad(...top,color);
    const bottom=top.map(p=>[p[0],p[1]-.23,p[2]]);
    for(let i=0;i<4;i++){const j=(i+1)%4;g.quad(top[i],top[j],bottom[j],bottom[i],i===0?'#cededc':'#7798a5')}
    g.quad(...bottom,'#a0b6bc');
    // The small coloured tip lies on top of the wing, not below it.
    if(coords[0][0]<2)skinVolumes(bottom,'airport/wing-skin',g.underSkins);
   }
   for(const s of [-1,1]){
    foil(s,[[1.65,2.0,4.2],[12.9,2.75,-2.8],[16.7,3.35,-6.1],[1.95,1.98,-4.9]],white);
    foil(s,[[11.7,2.72,-4.3],[16.5,3.25,-6.3],[16.25,3.24,-7.1],[12.0,2.78,-5.5]],accent);
    foil(s,[[1.3,4.15,-12.9],[7.2,5.35,-17.1],[7.4,5.31,-18.3],[1.4,4.16,-16.4]],white);
    for(const [x,z] of [[6.2,.0],[10.1,-2.5]]){
     const high=hold?3.60:apronMount?.94:0;
     g.box(s*x,1.55+high,z,.35,1.50,1.35,'#899da3');
     g.tube(s*x,1.05+high,z-1.40,s*x,1.05+high,z+1.46,.62,.82,accent,8);
     g.tube(s*x,1.05+high,z+1.46,s*x,1.05+high,z+1.52,.85,.79,white,10);
     g.tube(s*x,1.05+high,z+1.526,s*x,1.05+high,z+1.54,.62,.62,deep,8);
     g.tube(s*x,1.05+high,z+1.55,s*x,1.05+high,z+1.66,.19,.025,metal,6);
    }
    for(let i=0;i<15;i++){const z=-11.9+i*1.66;if((hold&&Math.abs(z)<4)||z>11.95)continue;
     let x=s*(2.10+.32*clamp((z+13)/6,0,1)),y=4.03;
     g.quad([x,y-.18,z-.27],[x,y+.18,z-.27],[x,y+.18,z+.27],[x,y-.18,z+.27],deep);
    }
    const w=s;g.quad([w*1.73,4.58,14.64],[w*.86,4.44,16.32],[w*.72,4.99,15.64],[w*1.42,5.06,14.46],deep);
    const mainGear=hold?-13.70:-4.60,leg=hold?cargoStand:0;
    g.box(s*2.0,1.01-leg*.5,mainGear,.18,1.65+leg,.23,metal);
    for(const z of [mainGear+.47,mainGear-.54])g.tube(s*2-.43,.50-leg,z,s*2+.43,.50-leg,z,.49,.49,'#344351',7);
   }
   const fin=[[0,4.75,-12.3],[0,11.58,-16.72],[0,12.02,-18.1],[0,4.29,-16.72]];
   for(const s of [-1,1]){const F=fin.map(p=>[s*.16,p[1],p[2]]);g.quad(...F,accent);
    g.quad([s*.17,7.0,-14.0],[s*.17,7.8,-14.6],[s*.17,8.56,-17.5],[s*.17,7.87,-17.22],gold)}
   const leg=hold?cargoStand:0;
   g.box(0,.66-leg*.5,12.28,.15,1.39+leg,.18,metal);g.tube(-.27,.31-leg,12.28,.27,.31-leg,12.28,.31,.31,'#344351',7);
   return g;
  }
  function parkedJet(mesh,p,yaw,sc,hold=false,apronMount=false){
   add(mesh,p.x,p.y,p.z,yaw,sc,hold?25:29);
   const box=(x,y,z,hx,hz,h,tag,ceilingOnly=false)=>api.solidLocal(p,yaw,x*sc,y*sc,z*sc,
    {tag,halfX:hx*sc,halfZ:hz*sc,h:h*sc,ceilingOnly,cameraOverhead:ceilingOnly||['airport/fuselage','airport/cargo-bulkhead','airport/nacelle'].includes(tag)});
   for(const c of mesh.underSkins)box(c.x,c.y,c.z,c.hx,c.hz,.13,c.tag,true);
   const leg=hold?cargoStand:0;
   // The cargo bay is empty between its bulkheads. The lower lane has
   // clearance below the fuselage; don't box the aircraft as one object.
   for(const side of [-1,1]){
    const gear=hold?-13.7:-4.6;
    box(side*2,.02-leg,gear,.43,.96,1.38+leg,'airport/main-gear');
    for(const [x,z] of [[6.2,0],[10.1,-2.5]])box(side*x,hold?3.83:apronMount?1.18:.24,z,.70,1.45,1.50,'airport/nacelle');
    if(hold)box(0,1.93,side*3.68,2.28,.09,3.53,'airport/cargo-bulkhead');
   }
   box(0,.01-leg,12.28,.27,.31,1.29+leg,'airport/nose-gear');
   box(0,1.67,-8.2,1.74,4.38,3.67,'airport/fuselage');
   box(0,1.65,8.9,1.76,4.98,3.57,'airport/fuselage');
   if(!hold)box(0,1.42,0,1.75,4.0,4.06,'airport/fuselage');
  }
  const tealJet=jet('#197e91',false,true),sunJet=jet('#e79c2d'),blueJet=jet('#385f9d'),freighter=jet('#cf7942',true);
  const jet1=at(firstJet*L,-21.65);
  parkedJet(tealJet,{x:jet1.x,y:jet1.y+.04,z:jet1.z},jet1.yaw+.28,1.18,false,true);
  const jet2=at(wing*L,4.25);parkedJet(freighter,{x:jet2.x,y:jet2.y+cargoStand,z:jet2.z},jet2.yaw+pi/2,1,true);
  const fly=at(up*L),dir=fly.yaw-.16;
  add(sunJet,fly.x,fly.y+12,fly.z,dir,1.11,126,t=>{
   const z=mod(t*10.6+65,182)-87,x=12;
   return {x:z*Math.sin(dir)+x*Math.cos(dir),z:z*Math.cos(dir)-x*Math.sin(dir),y:6+Math.max(0,z*.12),pitch:.028};
  });
  const fly2=at((down+.012)*L),dir2=fly2.yaw+2.13;
  add(blueJet,fly2.x,fly2.y+16,fly2.z,dir2,.97,116,t=>{
   const d=mod(t*8.7+98,162)-81;
   return{x:d*Math.sin(dir2),z:d*Math.cos(dir2),y:4+.040*d,pitch:.034}
  });
  // Stationary terminal stands and a low boarding bridge.
  for(const site of [[66,20,-.73],[70,-9,-.95],[7,-63,1.76]]){
   parkedJet(site[0]===70?blueJet:sunJet,{x:site[0],y:1.1,z:site[1]},site[2],.78);
  }
  const bridge=new Geo();bridge.box(0,6.8,0,2.65,2.95,14.2,white);
  for(const side of [-1,1]){const x=side*1.365;
   courseSkinFace(bridge,[x,7.655,-6.95],[x,7.655,6.95],[x,6.305,6.95],[x,6.305,-6.95],canopy);
  }bridge.box(0,8.42,0,2.89,.34,14.55,'#89a6ab');
  for(let z=-6;z<=6;z+=2)bridge.box(0,7.07,z,2.81,1.47,.13,pearl);
  bridge.box(0,3.0,4,.46,5.87,.52,metal);add(bridge,49,0,10,pi/2,1,10);
  api.solid(53,.065,10,{tag:'airport/bridge-post',halfX:.26,halfZ:.23,h:5.87});
  api.solid(49,5.325,10,{tag:'airport/boarding-bridge',halfX:7.1,halfZ:1.325,h:2.95});
  function conveyor(h){
   const s=h.f*L,p=at(s),g=new Geo(),w=width(h.f)+5;
   g.box(0,.065,0,w*2,.12,2.05,'#5c6875');
   for(let x=-w;x<=w;x+=.76)g.box(x,.151,0,.11,.065,1.86,'#b2c0bb');
   for(const side of [-1,1])g.box(0,.115,side*1.13,w*2,.16,.20,'#e2ad41');
   add(g,p.x,p.y,p.z,p.yaw,1,w+2);
   const crate=new Geo();crate.box(0,1.13,0,1.48,1.77,1.42,'#e89f4f');
   crate.box(0,1.14,0,.20,1.80,1.46,pearl);crate.box(0,.47,0,1.53,.15,1.47,'#a86737');
   crate.box(.39,1.43,-.728,.34,.51,.035,white);
   const anim=t=>{
    const lateral=h.center(t),q=at(s,lateral);
    // The crate disappears at the belt ends before looping. Its return
    // never sweeps a collider backwards through the whole racing surface.
    return {x:q.x-p.x,y:Math.abs(lateral)>w-.64?-90:q.y-p.y,z:q.z-p.z};
   };
   add(crate,p.x,p.y,p.z,p.yaw,1,w+3,anim);
   api.solid(p.x,p.y+.245,p.z,{tag:'airport/belt-crate',halfX:.75,halfZ:.72,h:1.78,yaw:p.yaw,hazard:h.name,reach:14,anim});
  }
  hazards.forEach(conveyor);
  const tower=new Geo();
  tower.tube(0,0,0,0,1.75,0,4.78,4.51,'#cabda6',8);tower.tube(0,1.75,0,0,15.4,0,2.65,1.95,pearl,8);
  tower.tube(0,15.37,0,0,17.25,0,2.0,4.42,white,8);
  for(let j=0;j<8;j++){const a=j*pi/4,b=(j+1)*pi/4;
   const atR=(ang,r,y)=>[Math.sin(ang)*r,y,Math.cos(ang)*r];
   courseSkinFace(tower,atR(a,4.81,20.32),atR(b,4.81,20.32),atR(b,4.43,17.22),atR(a,4.43,17.22),canopy,j%2*.5,0,j%2*.5+.5,1);
  }
  tower.tube(0,20.35,0,0,20.79,0,4.98,4.96,deep,8);tower.tube(0,20.79,0,0,22.04,0,4.70,1.80,'#edeec9',8);
  for(let j=0;j<8;j++){let a=j*TAU/8,x=Math.sin(a),z=Math.cos(a);line(tower,[x*4.46,17.25,z*4.46],[x*4.83,20.35,z*4.83],.13,white,4)}
  tower.tube(0,21.96,0,0,26.9,0,.14,.07,white,5);tower.ell(0,26.9,0,.25,.25,.25,red,7,3);
  add(tower,73,1,30,0,1,30);
  api.solid(73,1,30,{tag:'airport/tower-base',r:4.65,h:1.75});
  api.solid(73,2.75,30,{tag:'airport/tower-shaft',r:2.38,h:13.65});
  // Hangar doors, tugs and linked baggage carts establish a working apron;
  // their wheels rest on the tarmac and stay clear of the live racing line.
  const hangar=new Geo();hangar.box(0,4.8,0,26,9.6,15.8,'#82b7c1');
  hangar.box(0,5.5,-7.95,23.9,7.9,.18,deep);
  for(let i=0;i<5;i++)hangar.box(-10+i*5,5.45,-8.08,4.84,7.52,.10,i%2?'#97c5c6':'#a5cfc9');
  hangar.box(0,1.1,-8.22,24.4,.46,.12,metal);hangar.box(0,8.48,-8.20,24.6,.22,.18,gold);
  const ridge=11.65;
  hangar.quad([-13.8,9.65,-8.05],[0,ridge,-8.05],[0,ridge,8.05],[-13.8,9.65,8.05],white);
  hangar.quad([0,ridge,-8.05],[13.8,9.65,-8.05],[13.8,9.65,8.05],[0,ridge,8.05],pearl);
  hangar.tri([-13.8,9.65,-8.05],[13.8,9.65,-8.05],[0,ridge,-8.05],'#f2ddb5');
  hangar.label('SERVICE  02',0,7.74,-8.21,8.2,.95,deep);
  add(hangar,100,-.6,-73,.12,1,23);add(hangar,124,-.65,-65,-.34,.78,19);
  const train=new Geo();
  train.box(0,.49,0,1.56,.66,2.76,gold);train.box(0,1.06,-.05,1.26,.62,1.77,pearl);
  train.box(0,1.58,.32,1.18,.60,.91,'#6597a6');train.box(0,1.96,.32,1.43,.18,1.21,white);
  for(let j=0;j<3;j++){
   const z=-3.2-2.44*j;train.box(0,.48,z,1.6,.21,1.92,'#596d76');train.box(0,.44,z+1.10,.11,.12,.64,deep);
   for(let side of [-1,1])train.tube(side*.68,.24,z,side*.88,.24,z,.25,.25,deep,7);
   train.box(-.13,.99,z-.10,1.02,.80,1.26,j%2?'#9a7190':red);train.box(-.13,1.39,z-.10,.21,.09,1.30,pearl);
  }
  for(let s of [-1,1])for(let z of [-.83,.86])train.tube(s*.67,.32,z,s*.87,.32,z,.32,.32,deep,7);
  for(const [m,l,turn,sc] of [[10,-(width(mark(10))+3.2),-.09,1],[6,width(mark(6))+4.8,pi,.91]]){
   const p=at(mark(m)*L,l),yaw=p.yaw+turn;add(train,p.x,p.y,p.z,yaw,sc,11);
   api.solidLocal(p,yaw,0,0,0,{tag:'airport/tug',halfX:.82*sc,halfZ:1.38*sc,h:2*sc});
   for(let j=0;j<3;j++)api.solidLocal(p,yaw,0,.05*sc,(-3.2-2.44*j)*sc,
    {tag:'airport/trolley',halfX:.83*sc,halfZ:.98*sc,h:1.38*sc});
  }
  const mast=new Geo();mast.tube(0,0,0,0,8.75,0,.23,.12,'#87999c',5);mast.box(0,8.70,0,2.8,.22,.55,deep);
  for(let x of [-.9,0,.9])mast.box(x,8.59,-.21,.69,.14,.36,'#ffeac1');
  for(const f of [mark(6),mark(8),mark(10),mark(14),mark(16),mark(33)]){
   const p=at(f*L,-(width(f)+4.1));add(mast,p.x,p.y,p.z,p.yaw,1,10);
   api.solid(p.x,p.y,p.z,{tag:'airport/floodlight',r:.22,h:8.75});
  }
  // Parallel tarmac lanes, centre-line dashes, threshold paint and inset lights.
  const runway=new Geo(),runW=14,runL=74;
  runway.box(0,0,0,runW*2,.20,runL*2,'#697984');
  for(let z=-61;z<66;z+=10)runway.box(0,.13,z,.34,.04,4.8,pearl);
  for(let side of [-1,1]){
   runway.box(side*13,.13,0,.18,.04,144,pearl);
   for(let z=-66;z<69;z+=8)runway.box(side*13.6,.26,z,.27,.22,.37,aqua);
   for(let j=0;j<4;j++)runway.box(side*(2.2+j*2.53),.13,-65,1.45,.04,8.8,white);
  }
  add(runway,156,.98,0,.15,1,85);
  const runwayTop=(l,s)=>[156+l*Math.cos(.15)+s*Math.sin(.15),1.08,s*Math.cos(.15)-l*Math.sin(.15)];
  driveable.addFace(runwayTop(-runW,-runL),runwayTop(runW,-runL),runwayTop(runW,runL),runwayTop(-runW,runL));
  const lamp=new Geo(),socket=[[-.28,.02,-.40],[.28,.02,-.40],[.28,.02,.40],[-.28,.02,.40]];
  const lens=socket.map(([x,y,z])=>[x*.72,.27,z*.75]);
  for(let j=0;j<4;j++){const k=(j+1)%4;lamp.quad(socket[j],socket[k],lens[k],lens[j],j%2?'#476a78':'#34586b')}
  lamp.mat=5;lamp.quad(...lens,aqua);
  for(let f=mark(15);f<mark(27);f+=5.8/L){
   if(inGap(f))continue;
   for(const side of [-1,1]){const p=at(f*L,side*(width(f)+.06));add(lamp,p.x,p.y,p.z,p.yaw,1,1)}
  }
  for(const f of [mark(20),mark(22),mark(24),mark(26)]){
   const p=at(f*L,-(width(f)+.52)),strut=new Geo();
   strut.tube(0,-p.y+1,0,0,-.74,0,1.22,.71,'#607a8d',6);strut.tube(0,-1.47,0,0,-.08,0,1.05,1.59,'#3d6478',6);
   add(strut,p.x,p.y,p.z,0,1,p.y+3);
  }
  const anti=new Geo();anti.tube(0,.45,0,0,.66,0,.55,.83,deep,8);anti.tube(0,.66,0,0,1.9,0,.69,.38,'#40b8c8',8);
  anti.mat=5;anti.tube(0,1.9,0,0,2.26,0,.43,.58,'#8cfff1',8);
  for(const [m,side] of [[21,-1],[23,1],[25,-1]]){
   const p=at(mark(m)*L,side*(width(mark(m))-.8));
   add(anti,p.x,p.y,p.z,0,1,3,t=>({yaw:t*.95,y:.13+.12*Math.sin(t*2+m)}));
   // A small driveable boost contact coincides with the floating spin bumper.
   // pad data for these markers is registered below with their physical position.
  }
  // Offshore approach-lamp trestles give the gliding descent a measure of
  // height without filling either driving lane with cosmetic barriers.
  const trestle=new Geo();trestle.tube(0,-4.6,0,0,.15,0,.22,.16,'#be755a',5);
  trestle.box(0,.10,0,4.5,.24,.24,white);
  for(let x of [-1.81,-.61,.61,1.81]){trestle.mat=5;trestle.box(x,.31,0,.36,.2,.38,'#ffca74')}
  for(let i=0;i<5;i++){const q=at((down+.012)*L+8*i,width(down)+7.2);
   add(trestle,q.x,2.3+.20*i,q.z,q.yaw,1,7);
  }
  const crosswalk=new Geo(),walk=back*L-3;
  for(let j=-7;j<7;j+=1.8)ribbon(crosswalk,walk-4,walk+4,j,j+.48,.06,pearl);
  local(crosswalk,at(walk),13);
  // Baggage reclaim island: two semicircles connected by bands of dark slats.
  const carousel=new Geo(),M=28;
  const oval=(a,r,h)=>[Math.cos(a)*(6.8+r),h,Math.sin(a)*(2.15+r)];
  for(let i=0;i<M;i++){const a=i*TAU/M,b=(i+1)*TAU/M;
   carousel.quad(oval(a,0,.86),oval(b,0,.86),oval(b,.9,.48),oval(a,.9,.48),i%2?'#5a6a73':'#77828a');
   carousel.quad(oval(a,.9,.48),oval(b,.9,.48),oval(b,.9,.03),oval(a,.9,.03),'#b9c6c0');
   carousel.tri([0,.83,0],oval(a,0,.83),oval(b,0,.83),'#9bb4ac');
  }
  const cp=at(mark(36)*L,13.1),carouselYaw=cp.yaw+pi/2;
  add(carousel,cp.x,cp.y,cp.z,carouselYaw,1,9);
  for(const [x,hx,hz] of [[0,4.1,2.78],[-5.0,1.30,1.99],[5.0,1.30,1.99],[-6.75,.66,1.14],[6.75,.66,1.14]])
   api.solidLocal(cp,carouselYaw,x,0,0,{tag:'airport/carousel',halfX:hx,halfZ:hz,h:.82});
  const bag=new Geo();bag.box(0,.34,0,.82,.68,1.14,red);bag.box(0,.69,0,.46,.11,.19,deep);
  for(let i=0;i<3;i++)add(bag,cp.x,cp.y+.8,cp.z,carouselYaw,1,9,t=>{
   let a=t*.43+i*TAU/3,dx=Math.cos(a)*6.98,dz=Math.sin(a)*2.45,c=Math.cos(carouselYaw),s=Math.sin(carouselYaw);
   return{x:c*dx+s*dz,z:c*dz-s*dx,yaw:a};
  });
  // Low airfield wayfinding sits immediately outside the racing surface.
  const taxi=new Geo();taxi.box(0,.50,0,2.35,.95,.33,'#263744');
  taxi.box(0,.55,-.19,2.16,.70,.07,'#f1c248');taxi.label('A  07',0,.56,-.24,1.92,.53,'#28303b');
  for(const x of [-.78,.78])taxi.box(x,.17,0,.15,.34,.25,deep);
  const wind=new Geo();wind.tube(0,0,0,0,6.65,0,.12,.074,white,7);
  wind.box(.36,6.58,0,.81,.10,.12,metal);
  for(let k=0;k<6;k++){
   const x=.70+.59*k,yy=6.50-.095*k-.017*k*k;
   wind.tube(x,yy,0,x+.59,6.50-.095*(k+1)-.017*(k+1)*(k+1),0,.48-k*.052,.48-(k+1)*.052,k%2?white:'#ed7150',10);
  }
  for(const [m,side] of [[8,-1],[11,1],[16,1],[29,-1],[33,-1]]){
   const f=mark(m),q=at(f*L,side*(width(f)+2.1));add(taxi,q.x,q.y,q.z,q.yaw-.14*side,1,2);
   api.solid(q.x,q.y+.025,q.z,{tag:'airport/taxi-sign',yaw:q.yaw-.14*side,halfX:1.175,halfZ:.175,h:.95});
  }
  for(const [m,side] of [[14,-1],[17,1],[30,-1]]){
   const f=mark(m),q=at(f*L,side*(width(f)+3.4));add(wind,q.x,q.y,q.z,.63,1,8);
   api.solid(q.x,q.y,q.z,{tag:'airport/windsock',r:.12,h:6.65});
  }
  // A pair of approach arches gives the high platform a visible bank and a
  // clear vanishing point. Their bases stay outside the two open edges.
  const arch=new Geo(),archPath=[[-10.4,0],[-10.4,3.6],[-8.7,6.2],[-5.2,7.6],[0,8.0],[5.2,7.6],[8.7,6.2],[10.4,3.6],[10.4,0]];
  for(let j=0;j<archPath.length-1;j++){
   const [x,y]=archPath[j],[xx,yy]=archPath[j+1];
   for(const z of [-.46,.46])line(arch,[x,y,z],[xx,yy,z],.21,deep,5);
   line(arch,[x,y,-.46],[xx,yy,.46],.085,'#a4c4ca',4);
   arch.mat=5;line(arch,[x,y-.16,-.48],[xx,yy-.16,-.48],.082,'#8bf1ed',4);arch.mat=0;
  }
  for(const m of [21,25]){const q=at(mark(m)*L);add(arch,q.x,q.y,q.z,q.yaw,1,14)}
  const palm=new Geo();palm.tube(0,0,0,.6,6,0,.42,.29,'#a38359',6);
  for(let j=0;j<8;j++){const a=j*TAU/8,x=Math.cos(a),z=Math.sin(a),c=j%2?'#4d9c71':'#54996c';
   palm.quad([.6,6,0],[.6+x*1.7-z*.48,6.65,z*1.7+x*.48],[.6+x*4.1,5.0,z*4.1],[.6+x*1.7+z*.48,6.65,z*1.7-x*.48],c);
  }
  for(const [x,z,k] of [[-48,21,1],[-39,46,.83],[54,-8,1.03],[72,-73,1],[-87,18,1.2],[-86,-2,1.05],[101,66,.94],[-18,-38,.86],[-10,-46,1.0]]){
   add(palm,x,-.98,z,(x*.27)%TAU,k,8);
   api.solid(x,-.98,z,{tag:'airport/palm',r:.38*k,h:6*k});
  }
  const isle=new Geo();for(let j=0;j<14;j++){let a=j*TAU/14,b=(j+1)*TAU/14;
   let P=(a,r,h)=>[Math.cos(a)*r,h,Math.sin(a)*r*.54];
   isle.quad(P(a,30,.10),P(b,30,.10),P(b,31.3,.08),P(a,31.3,.08),'#9cdbcc');
   isle.quad(P(a,28.6,.25),P(b,28.6,.25),P(b,29.3,.19),P(a,29.3,.19),'#e1e4c6');
   isle.quad(P(a,28.9,.26),P(b,28.9,.26),P(b,22,3.2),P(a,22,3.2),'#d7cba2');
   isle.tri(P(a,22,3.2),P(b,22,3.2),[2.1,11.8,0],'#78a482');
  }
  for(const [x,z,k] of [[108,122,.72],[-126,164,1.13],[40,209,.84]]){
   add(isle,x,-2.4,z,0,k,35);
   const data=isle.d,point=i=>[x+data[i]*k,-2.4+data[i+1]*k,z+data[i+2]*k];
   for(let i=0;i<data.length;i+=27)driveable.addFace(point(i),point(i+9),point(i+18));
  }
  return (x,z,p,maxY)=>driveable.heightAt(x,z,maxY);
 }
 const bumpers=[[21,-1],[23,1],[25,-1]].map(([i,side])=>({f:mark(i),l:side*(width(mark(i))-.8),w:2.2,bumper:true}));
 return {id:'airport',name:'阳光机场',english:'Sunshine Airport',laps:3,half,points,width,height,bank,build,
  edgeKind,shoulder,ramps,gaps,pads:[...pads,...bumpers],coins,hazards,surfaceLift,sections:zones,
  cameraPassage:{f:wing,lowLane:-2.1,highLane:4.25},
  itemRows:[mark(2),mark(8),mark(15),mark(23),mark(32)],antiGravity:f=>f>up&&f<down};
}
