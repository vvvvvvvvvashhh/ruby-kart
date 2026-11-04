// Point-to-point downhill. The final spline span only supplies the starting grid's
// approach tangent; it is excluded from racing, the map and all terrain meshes.
function warioDefinition(){
 const knots=[[0,0],[0,24],[-7,53],[-29,72],[-56,90],[-66,117],[-52,139],[-22,150],[7,144],[26,157],[31,184],[10,207],[-22,211],[-49,198],[-74,201],[-88,220],[-82,244],[-54,263],[-23,269],[8,286],[33,310],[64,314],[93,297],[103,274],[103,249],[123,238],[154,246],[176,273],[207,277],[227,257],[231,231],[248,209],[276,205],[295,185],[292,161],[268,146],[236,147],[215,130],[216,104],[194,80],[164,77],[143,59],[141,31],[159,7],[151,-22],[124,-38],[97,-39],[71,-58],[51,-85],[25,-108],[-9,-119],[-42,-119],[-69,-135],[-99,-142],[-126,-126],[-132,-98],[-119,-76],[-95,-65],[-67,-64],[-43,-62],[-32,-45],[-10,-36],[0,-24]];
 const points=tourSpline(knots,12),half=7.3,stages=[.233,.632,.897];
 const L=points.reduce((v,p,i)=>{const b=points[(i+1)%points.length];return v+Math.hypot(b[0]-p[0],b[1]-p[1])},0);
 const blend=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 const window=(a,b,c,d,x)=>blend(a,b,x)*(1-blend(c,d,x));
 const heights=[[0,125],[.012,125],[.030,117],[.075,114],[.141,100],[.212,90],[.233,87],[.270,84],[.310,80],[.335,75],[.357,75],[.406,65],[.455,57],[.481,54],[.556,43],[.612,37],[.649,38],[.695,28],[.745,27],[.770,21],[.790,20],[.812,7],[.875,3],[.922,3],[.981,125],[1,125]];
 const height=f=>{for(let i=1;i<heights.length;i++){const [b,hi]=heights[i];if(f<=b){const [a,lo]=heights[i-1];return mix(lo,hi,blend(a,b,f))}}return 125};
 const width=f=>half+.85*window(.05,.073,.150,.165,f)+4.5*window(.452,.492,.553,.585,f)+2*window(.803,.83,.92,.95,f);
 const bank=f=>.24*window(.24,.252,.269,.28,f)-.29*window(.279,.288,.312,.322,f)-.52*window(.357,.372,.420,.446,f)+.16*window(.651,.662,.680,.695,f)-.095*window(.716,.731,.751,.758,f);
 const edgeKind=(f,side)=>{
  if(f>.981||f<.012||f>=.231&&f<=.284||f>=.335&&f<=.355||f>=.356&&f<.437&&side<0)return 'rail';
  if(f<.153&&f>.012||f>.287&&f<.313&&side<0||f>.356&&f<.437&&side>0||f>.768&&f<.794)return 'void';
  return 'runoff';
 };
 const shoulder=(f,side)=>edgeKind(f,side)==='rail'?1.15:edgeKind(f,side)==='void'?.62:0;
 function offroadHeight(f,l){
   const side=Math.sign(l);
   let extra=Math.abs(l)-width(f);
   if(extra<=0)return -.10;
   const kind=edgeKind(f,side);
   if(kind==='void')return -.07-Math.max(0,extra-shoulder(f,side))*1.68;
   return -.075+Math.min(extra,12)*(.12+.06*Math.sin(f*126+side)) + Math.max(0,extra-12)*.055*Math.sin(f*65+side*2);
  }
 const sections=[[0,'运输机货舱'],[.013,'山顶冰川'],[.088,'冰缝发夹弯'],[.174,'白冰山脊'],[.233,'蓝冰洞窟'],[.30,'地下融水河'],[.335,'水电站机房'],[.355,'瓦里奥大坝'],[.455,'杉林岔路'],[.575,'伐木场'],[.632,'高山滑雪旗门'],[.703,'雪丘连弯'],[.768,'奥运大跳台'],[.796,'空中标环'],[.839,'终点看台']];
 const ramps=[{f:.012,l0:-7.35,l1:7.35,length:5.2,rise:.8},{f:.304,covered:true,l0:.75,l1:6.4,length:6.4,rise:1.15},{f:.531,l0:-8.75,l1:-3.6,length:5.4,rise:1.16},{f:.792,l0:-7.35,l1:7.35,length:10.5,rise:2.65}];
 const pads=[{f:.279,l:-3.5,w:3.5},{f:.318,l:-3.5,w:2.8},{f:.37,l:3.6,w:2.8},{f:.397,l:3.3,w:3.4},{f:.422,l:2.4,w:3.25},{f:.524,l:7.2,w:3},{f:.770,l:0,w:4.5},{f:.781,l:0,w:4.5}];
 const gaps=[{f0:.110,f1:.125,l0:-4.95,l1:-3.15}];
 const hazards=[[.493,.12],[.507,-.35],[.522,.6],[.543,-.38],[.576,4.5]].map(([f,l],i)=>({f,physical:true,name:i===4?'横木':'杉树',radius:i===4?.88:.74,center:()=>l}));
 const surfaceLift=(f,l)=>{
  for(const ramp of ramps){const d=(ramp.f-f)*L;if(d>=0&&d<=ramp.length&&l>=ramp.l0&&l<=ramp.l1)return ramp.rise*(1-d/ramp.length)}
  if(f>.708&&f<.749){
   const envelope=window(.708,.713,.744,.749,f);
   return .33*envelope*(1+Math.cos((f-.709)*L*.45))*(.55+.45*Math.cos(l*.57+(f-.708)*L*.09));
  }return 0
 };
 const def={id:'wario',name:'瓦里奥滑雪场',english:'Mount Wario',half,laps:3,stages,points,width,height,bank,edgeKind,shoulder,offroadHeight,ramps,pads,gaps,hazards,surfaceLift,sections,
  surfaces:[{f0:.018,f1:.167,grip:.84,name:'高山蓝冰'},{f0:.242,f1:.333,grip:.89,name:'融水冰洞'},{f0:.358,f1:.427,grip:.91,name:'溢洪道'}],
  itemRows:[.047,.204,.266,.365,.466,.550,.661,.756,.838],
  coins:[[.032,.18,4],[.093,-.40,4],[.172,.36,3],[.243,.36,4],[.307,-.45,3],[.392,.42,4],[.501,-.80,4],[.523,.79,3],[.599,-.29,4],[.675,.44,3],[.775,.04,3],[.854,-.32,4]]};
 def.antiGravity=f=>f>=.241&&f<.310||f>=.355&&f<.442||f>=.766&&f<.793;
 def.environment=f=>f>=.231&&f<=.334?'icevault':'wario';
 def.build=api=>{
  const {at,pt,add}=api,driveable=new RoadSurfaceIndex();
  const ice='#8bcbd8',snow='#edf1ed',ink='#324663',teal='#218298',purple='#654782',yellow='#eec54c',red='#dc524c';
  const strata=alpineIcePrint(),cloth=alpineFlagPrint(),panes=alpineWindowPrint();
  const cargoPanel=finishTile('wario-cargo-and-spillway',c=>{
   c.save();c.scale(1,42/64);
   const g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,'#788ba0');g.addColorStop(.42,'#61778b');g.addColorStop(1,'#405265');
   c.fillStyle=g;c.fillRect(0,0,256,64);
   for(let k=0;k<4;k++){
    const x=k*64;c.fillStyle='#43586c';c.fillRect(x,0,3,64);
    c.fillStyle='#a8bdc7';c.fillRect(x+2,0,1,64);c.fillRect(x+7,5,48,1);
    c.strokeStyle='#465d73';c.lineWidth=2;c.strokeRect(x+8,14,44,31);
    c.fillStyle='#798b9d';c.fillRect(x+10,16,40,27);
    c.fillStyle='#52667a';for(let j=0;j<3;j++)c.fillRect(x+14,23+j*5,24,2);
    for(const dx of [5,56])for(const yy of [9,49]){c.fillStyle='#354b62';c.fillRect(x+dx,yy,2,2);c.fillStyle='#b0c0c5';c.fillRect(x+dx,yy,2,1)}
   }
   c.fillStyle='#5d4971';c.fillRect(0,53,256,8);c.fillStyle='#edc859';c.fillRect(0,53,256,2);
   for(let j=0;j<5;j++){c.fillStyle='#d7b151';c.beginPath();c.moveTo(8+j*11,56);c.lineTo(12+j*11,56);c.lineTo(8+j*11,61);c.lineTo(4+j*11,61);c.fill()}
   c.restore();
   // The lower atlas strip is a different material: channels of teal meltwater
   // and broken whitecaps, stretched down the bank of the dam.
   const water=c.createLinearGradient(0,43,0,64);water.addColorStop(0,'#5495a3');water.addColorStop(.46,'#70b0b6');water.addColorStop(1,'#5597a8');
   c.fillStyle=water;c.fillRect(0,43,256,21);c.lineCap='round';c.lineWidth=1;
   for(let i=0;i<24;i++){const x=(i*47)%254,y=45+(i*7)%16;
    c.strokeStyle=i%4?'#9bcacc':'#d7e7e0';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+2,y+2.2,x+5+i%3,y+1.2);c.stroke();
   }
  });
  const crowdPrint=finishTile('wario-ski-crowd',c=>{
   const shirts=['#d64f4c','#368499','#f3ba57','#5679af','#8e5996','#d8775d'],skins=['#edc394','#c38869','#f1d2a5','#b97655'];
   const oval=(x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill()};
   for(let i=0;i<12;i++){
    const x=11+i*21,y=22+(i*3)%7,jersey=shirts[(i*5+2)%6],scarf=shirts[(i+1)%6],skin=skins[i%4];
    oval(x,y+19,8,15,jersey);
    c.lineCap='round';c.lineWidth=5;c.strokeStyle=jersey;c.beginPath();c.moveTo(x-5,y+10);c.lineTo(x-9,y+(i%3===0?-1:19));c.moveTo(x+5,y+10);c.lineTo(x+9,y+(i%4===0?-2:16));c.stroke();
    oval(x,y,6.3,7.4,skin);oval(x,y-4,6.5,5,scarf);c.fillStyle=scarf;c.fillRect(x-7,y-3,14,2.5);oval(x-1,y-9,2.4,2.3,'#f4e5bd');
    c.fillStyle='#384357';c.fillRect(x-3.5,y+1,1.3,1.5);c.fillRect(x+2,y+1,1.3,1.5);
    c.fillStyle=scarf;c.fillRect(x-5,y+7,10,3);c.fillRect(x+2,y+8,2.8,7);
    c.fillStyle='rgba(240,246,224,.58)';c.fillRect(x-4,y+15,3,1.7);
   }
  });
  let seed=713839;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const beam=(g,a,b,r,col,sides=5)=>g.tube(...a,...b,r,r,col,sides);
  const shifted=(p,h)=>[p[0],p[1]+h,p[2]];
  function emit(g,center){let radius=0;for(let i=0;i<g.d.length;i+=9){
   const x=g.d[i]-=center.x,y=g.d[i+1]-=center.y,z=g.d[i+2]-=center.z;
   radius=Math.max(radius,x*x+y*y+z*z);
  }if(g.d.length)add(g,center.x,center.y,center.z,0,1,Math.sqrt(radius)+.5)}
  const plant=(g,f,l,y=0,yaw=0,sc=1,r=10,anim=null)=>{const p=at(L*f,l);add(g,p.x,p.y+y,p.z,p.yaw+yaw,sc,r*sc,anim)};
  function strip(g,s,t,l0,l1,r0,r1,y,col){g.quad(pt(s,l0,y),pt(s,l1,y),pt(t,r1,y),pt(t,r0,y),col)}
  function colorAt(f,i){
   if(f<.012)return i%3===0?'#758499':'#69798d';
   if(f<.233)return ['#8eb2c3','#93b7c6','#98bac8','#95b9c8'][i%4];
   if(f<.335)return ['#477487','#4b798d','#4c7b8e'][i%3];
   if(f<.356)return i%2?'#718591':'#748992';
   if(f<.439)return i%2?'#738f99':'#7896a1';
   if(f>.766&&f<.795)return i%2?'#c8d9de':'#cfdbde';
   return i%2?'#9db5c1':'#a2bac5';
  }
  function terrainPoint(s,l){let f=mod(s,L)/L;return pt(s,l,offroadHeight(f,l))}
  const start=-26,runout=stages[2]*L+26;
  const edgeChanges=[.012,.153,.231,.284,.287,.313,.335,.355,.356,.437,.768,.794];
  const cuts=[start,0,runout,...edgeChanges.map(f=>f*L),...gaps.flatMap(g=>[g.f0*L,g.f1*L])];
  for(let s=start+4;s<runout;s+=4)cuts.push(s);cuts.sort((a,b)=>a-b);
  for(let j=0;j<cuts.length-1;j+=10){
   const last=Math.min(j+10,cuts.length-1),g=new Geo(),origin=at((cuts[j]+cuts[last])/2);
   for(let i=j;i<last;i++){
    const s=cuts[i],t=cuts[i+1],f=(s+t)/2/L,fw=mod(f,1);
    const a=width(mod(s,L)/L),b=width(mod(t,L)/L),gap=gaps.find(k=>f>k.f0&&f<k.f1);
    const firstSurface=g.d.length;
    g.mat=f<.012||f>.335&&f<.355?4:0;
    if(gap){
     strip(g,s,t,-a,gap.l0,-b,gap.l0,0,colorAt(f,i));
     strip(g,s,t,gap.l1,a,gap.l1,b,0,colorAt(f,i));
     for(const l of [gap.l0,gap.l1])g.quad(pt(s,l,.03),pt(t,l,.03),pt(t,l,-10),pt(s,l,-10),'#5287a2');
    }else if(f>.708&&f<.75){
     const pp=(u,l)=>pt(u,l,surfaceLift(u/L,l));
     for(let k=0;k<4;k++){
      const x=a*(k*.5-1),xx=a*((k+1)*.5-1),y=b*(k*.5-1),yy=b*((k+1)*.5-1);
      g.quad(pp(s,x),pp(s,xx),pp(t,yy),pp(t,y),colorAt(f,i));
     }
    }else strip(g,s,t,-a,a,-b,b,0,colorAt(f,i));
    driveable.addGeometry(g,firstSurface);
    g.mat=0;
    for(const side of [-1,1]){
     if(f<.012){
      const edge=[pt(s,side*a),pt(s,side*(a+1.15)),pt(t,side*(b+1.15)),pt(t,side*b)];
      g.quad(...edge,'#788693');driveable.addFace(...edge);
      strip(g,s,t,side*(a-.12),side*(a-.37),side*(b-.12),side*(b-.37),.032,yellow);
      continue;
     }
     const rings=[-.1,.62,3.5,11,27];
     for(let k=0;k<rings.length-1;k++){
      const l0=side*(a+rings[k]),l1=side*(a+rings[k+1]),r0=side*(b+rings[k]),r1=side*(b+rings[k+1]);
      const cols=edgeKind(fw,side)==='void'?['#c7e7ea','#81a9ba','#7091a5','#859cab']:f>.233&&f<.335?['#a1cbcc','#698da0','#536f84','#748599']:['#e5eced','#f2f3ef','#e8eeed','#dbe6e8'];
      const rim=[terrainPoint(s,l0),terrainPoint(s,l1),terrainPoint(t,r1),terrainPoint(t,r0)];
      g.quad(...rim,cols[k]);
      // The steep ice below the narrow shelf is a cliff face. Its rendered
      // sidewalls stay visible from below without becoming a hidden bridge.
      if(k===0||edgeKind(fw,side)!=='void')driveable.addFace(...rim);
     }
     if(f>.625&&f<.897){const l=side*(a-.65),r=side*(b-.65);
      strip(g,s,t,l,l+side*.16,r,r+side*.16,.045,side>0?'#6398b8':'#dc7970');
     }else if(f>.022&&f<.32&&i%3===0){
      const l=(a-1.30)*side;strip(g,s,t,l,l+.07,l+side*.58,l+side*.58+.05,.046,'#cbe8e9');
     }
    }
    // Packed racing line, wind-carved shelves and grooming marks are part of
    // the existing road chunks. Break them around the crevasse and jump lips.
    if(!gap&&f>.016&&(f<.228||f>.447&&f<.895)&&!(f>.708&&f<.75)&&!ramps.some(r=>Math.abs(r.f-f)*L<r.length+2)){
     const alpine=f<.228;
     for(const side of [-1,1]){
      const sx=side*a*(.38+.09*Math.sin(s*.037)),tx=side*b*(.38+.09*Math.sin(t*.037));
      strip(g,s,t,sx-.15,sx+.15,tx-.15,tx+.15,.039,alpine?'#87adbf':'#a5bcc7');
      if(i%3!==0)strip(g,s,t,sx+.31,sx+.40,tx+.31,tx+.40,.040,alpine?'#cee2e3':'#dbe3e5');
      if(i%4===1){const l=side*(a-.84);
       g.tri(pt(s,l,.046),pt(s+.65,l-side*.55,.046),pt(t,l+side*.12,.046),alpine?'#cee6e8':'#e5e9e7');
      }
     }
    }
    if(f<.012&&i%2===0){
     for(const l of [-3.2,3.2])strip(g,s,t,l-.09,l+.09,l-.09,l+.09,.039,'#b4bfbd');
    }
    if(f>.48&&f<.554){
     const widen=window(.478,.496,.537,.555,f);
     const c=(.28*Math.sin(f*147)),m=1.6*widen;
     strip(g,s,t,c-m,c+m,c-m,c+m,.04,'#d0dbd5');
    }
   }emit(g,origin);
  }
  // Each sign, ramp and pad uses the same station and lateral interval as the simulation.
  for(const pad of pads){const g=new Geo(),s=pad.f*L,l=pad.l,w=pad.w/2;g.mat=5;
   strip(g,s-2.4,s+1.4,l-w,l+w,l-w,l+w,.055,'#e49437');
   for(let j=0;j<3;j++){const q=s-1.9+j*.92;for(const side of [-1,1])
    g.quad(pt(q,l+side*w*.9,.077),pt(q+.48,l,.077),pt(q+.76,l,.077),pt(q+.32,l+side*w*.9,.077),'#fff5ae')}
   emit(g,at(s));
  }
  for(const r of ramps){const s=r.f*L,g=new Geo(),a=s-r.length,m=(r.l0+r.l1)/2;
   for(let i=0;i<5;i++){const u=a+r.length*i/5,v=a+r.length*(i+1)/5,ha=.075+r.rise*i/5,hb=.075+r.rise*(i+1)/5;
    const top=[pt(u,r.l0,ha),pt(u,r.l1,ha),pt(v,r.l1,hb),pt(v,r.l0,hb)];
    g.quad(...top,i%2?'#58bac9':'#62c8d1');driveable.addFace(...top);
    if(i===1||i===3){const size=Math.min(2.7,(r.l1-r.l0)*.30);
     g.tri(pt(u,m-size,ha+.04),pt(u,m+size,ha+.04),pt(v,m,hb+.04),'#e5fcf3');
    }
    for(const l of [r.l0,r.l1])g.quad(pt(u,l,.035),pt(v,l,.035),pt(v,l,hb),pt(u,l,ha),'#48839a');
   }g.quad(pt(s,r.l0,.018),pt(s,r.l1,.018),pt(s,r.l1,r.rise+.079),pt(s,r.l0,r.rise+.079),ink);emit(g,at(s));
  }
  const makeGate=(words,sub,col)=>{
   const g=new Geo(),w=half+2.1;
   for(const side of [-1,1]){const x=side*w;
    g.box(x,3.5,0,.48,7,.63,col);g.box(x,.53,0,1.10,1.06,1.18,ink);
    beam(g,[x,4.2,0],[x-side*2.6,6.55,0],.14,ink);
   }
   g.box(0,6.75,0,w*2+.95,1.34,.76,col);g.box(0,7.47,0,w*2+1.03,.11,.82,snow);
   g.label(words,0,6.82,-.395,w*1.33,1.0,'#fff5c8');
   for(const side of [-1,1])for(let j=0;j<4;j++)for(let k=0;k<2;k++)
    g.box(side*(w-1.85+j*.37),6.48+k*.37,-.40,.37,.37,.025,(j+k)%2?ink:snow);
   if(sub)g.label(sub,0,5.74,-.38,6.65,.54,'#f9eeb5',ink);
   return g;
  };
  function gateAt(f,words,sub,c){
   plant(makeGate(words,sub,c),f,0,0,0,1,13);
   const p=at(f*L);
   for(const side of [-1,1]){
    api.solidLocal(p,p.yaw,side*(half+2.1),0,0,{tag:'wario/gate-foot',halfX:.55,halfZ:.59,h:1.06});
    api.solidLocal(p,p.yaw,side*(half+2.1),1.06,0,{tag:'wario/gate-post',halfX:.24,halfZ:.315,h:5.94});
   }
   api.solidLocal(p,p.yaw,0,6.08,0,{tag:'wario/gate-lintel',halfX:half+2.57,halfZ:.38,h:1.34});
   const s=f*L,g=new Geo(),w=width(f);
   for(let row=0;row<2;row++)for(let i=0;i<18;i++){
    const a=-w+2*w*i/18,b=-w+2*w*(i+1)/18;
    strip(g,s+row*.52,s+(row+1)*.52,a,b,a,b,.07,(i+row)%2?ink:snow);
   }emit(g,at(s));
  }
  gateAt(stages[0],'SECTOR 02','ICE CAVERN',teal);gateAt(stages[1],'SECTOR 03','SKI CROSS',red);gateAt(stages[2],'MOUNT WARIO','FINISH',purple);
  // The cargo bay has a clear central passage. Roof ribs and cabin lamps shrink into
  // perspective behind the grid, while a raised clamshell frames the glacier ahead.
  {
   const g=new Geo(),w=half+1.21;
   for(const side of [-1,1]){
    const x=side*(w+.43);
    g.box(x,2.65,-10,.65,5.3,30,'#687b93');
    const inner=x-side*.34;
    for(let j=0;j<3;j++){
     const z=-25+j*10;
     courseSkinFace(g,[inner,5.22,z],[inner,5.22,z+10],[inner,.04,z+10],[inner,.04,z],cargoPanel,0,0,1,41/63);
    }
    g.box(x,5.35,-10,.89,.27,30,'#cad5d8');
    for(let i=0;i<7;i++){
     const z=-24+i*4.7;
     g.box(side*w,2.65,z,.16,5.3,.30,'#b5c6c9');beam(g,[side*w,5.25,z],[side*(w-2.7),8.3,z],.17,'#b9c8cd');
     g.box(side*(w-.13),4.40,z+1.22,.1,.2,1.05,'#fff1bd');
     g.box(side*(w-.10),1.43,z+1.42,.08,.12,2.35,yellow);
    }
    const tip=side*30;
    g.quad([x,4,-15],[tip,4.2,-21],[tip,4.4,-18],[x,5.3,-7],'#8794a7');
    g.ell(side*18,2.95,-15,1.5,1.55,4.1,'#596c82',9,4);
    g.tube(side*18,2.96,-18,side*18,2.96,-18.68,1.39,1.29,'#354657',9);
    g.ell(side*18,2.96,-18.65,.94,.93,.38,'#7e929d',8,3);
    g.quad([x,.65,-25],[x,5,-25],[side*2,7,-33],[side*2,1.25,-33],'#a4b0bd');
    g.quad([x,5,-25],[side*2,7,-33],[0,8.6,-23],[side*(w-2.7),8.25,-22],'#bec8d1');
    g.quad([side*w,4.94,3],[side*(w-2),8.4,4],[side*(w-2),11,13],[side*(w+1.4),7.9,12],purple);
   }
   g.box(0,8.53,-11,2*w-5.2,.32,27,'#62748c');
   g.box(0,8.10,3,2*w-4.8,.65,.54,'#aebbc6');
   g.label('WARIO AIR CARGO',0,8.06,2.68,8.2,.56,'#ffec96');
   g.box(0,8.65,-26,.64,5.3,8, purple);g.box(0,9.95,-29,4.4,.28,3.6, yellow);
   plant(g,0,0,0,0,1,46);
   const cargo=at(0);
   for(const side of [-1,1])api.solidLocal(cargo,cargo.yaw,side*(w+.43),0,-10,
    {tag:'wario/cargo-wall',halfX:.325,halfZ:15,h:5.30});
   api.solidLocal(cargo,cargo.yaw,0,8.37,-11,{tag:'wario/cargo-roof',halfX:w-2.60,halfZ:13.50,h:.32,ceilingOnly:true});
   api.solidLocal(cargo,cargo.yaw,0,8.10-.65/2,3,{tag:'wario/cargo-exit-beam',halfX:w-2.4,halfZ:.27,h:.65,ceilingOnly:true});
  }
  // The summit shelf fractures into polygonal seracs. Snow clings to the broad
  // tops, while blue strata and forked cracks make the riding surface legible.
  function serac(h,w){
   const g=new Geo(),n=7,foot=[],waist=[],top=[];
   for(let j=0;j<n;j++){
    const a=j*TAU/n,r=w*(.86+.18*Math.sin(j*2.1)),x=Math.cos(a)*r,z=Math.sin(a)*r;
    foot.push([x,-.65,z]);waist.push([x*.91-.12*w,h*(.50+.07*Math.sin(j*1.9)),z*.92]);
    top.push([x*.71-.22*w,h*(.86+.13*Math.sin(j*2.9)),z*.67]);
   }
   for(let j=0;j<n;j++){
    const k=(j+1)%n;
    g.tri(foot[j],foot[k],waist[k],j%2?'#6396aa':'#6895ab');
    g.tri(foot[j],waist[k],waist[j],'#79a6b7');
    const u=(j%4)*.25;courseSkinFace(g,top[j],top[k],waist[k],waist[j],strata,u,.05,u+.24,.98);
    g.tri(top[j],top[k],[-.20*w,h*.99,0],j%3?'#d2e4e4':'#c4dce3');
   }return g;
  }
  const seracs=[serac(6.7,3.4),serac(10.0,3.7),serac(4.5,3.1)];
  for(const [f,side,extra,scale] of [[.035,-1,6,1.15],[.048,-1,8,.80],[.060,1,10,1.0],[.086,1,7,1.06],[.097,1,9,.93],[.121,-1,6,1.15],[.133,-1,7,.81],[.169,-1,7,.96],[.184,1,9,1.18],[.208,-1,5,1.02],[.221,1,7,1.17]]){
   const l=side*(width(f)+extra),variant=Math.floor(rand()*3),ground=offroadHeight(f,l)-.3;
   plant(seracs[variant],f,l,ground,rand()*TAU,scale,14);
   const p=at(f*L,l);api.solid(p.x,p.y+ground-.4,p.z,
    {tag:'wario/serac',r:[2.62,2.86,2.42][variant]*scale,h:[6.7,10,4.5][variant]*scale});
  }
  for(let i=0;i<9;i++){
   const f=.039+i*.020,s=f*L,g=new Geo();let x=(i%2?1:-1)*(3.2+rand()*1.7),u=s;
   for(let k=0;k<3;k++){
    const v=u+.58+rand()*1.40,y=x+(rand()-.43)*2.7;
    if(!(f>.10&&f<.13))strip(g,u,v,x-.055,x+.055,y-.042,y+.042,.046,'#729eaf');
    x=y;u=v;
   }emit(g,at(s));
  }
  // Layered ice faces read as fractured glacier instead of isolated cones.
  const shelf=new Geo();
  for(let k=0;k<6;k++){
   const x=(k-3)*1.9,h=1.65+1.0*Math.sin(k*1.45)+.3*(k%2),z=.42*Math.sin(k*1.1);
   const A=[x,0,z],B=[x+1.88,0,z+.13],C=[x+1.68,h+.38,z+.40],D=[x-.14,h,z+.32];
   shelf.tri(A,B,C,'#43879c');shelf.tri(A,C,D,'#6ba7bb');
   shelf.quad(D,C,[C[0],C[1]+.17,C[2]+.25],[D[0],D[1]+.16,D[2]+.22],'#dbecea');
   shelf.quad([x+.24,.28,z-.02],[x+.35,.26,z-.02],[x+.84,h-.02,z+.31],[x+.77,h-.03,z+.31],'#badadd');
  }
  for(const [f,side] of [[.061,1],[.138,-1],[.189,-1],[.214,1]]){
   const l=side*(width(f)+3.8),ground=offroadHeight(f,l)-.20;
   plant(shelf,f,l,ground,side*Math.PI*.49,1,10);
   const p=at(f*L,l);
   api.solidLocal(p,p.yaw+side*Math.PI*.49,0,ground,.18,{tag:'wario/ice-outcrop',halfX:5.70,halfZ:.29,h:2.0});
  }
  // An irregular blue-ice vault, open at both portals. Bright crystal seams
  // form a chain of landmarks through the darker middle of the cavern.
  {
   const n=28,a=.230,b=.337;
   const cross=(s,i,j)=>{
    const f=s/L,w=width(f),angle=j*Math.PI/6;
    const wobble=1+.10*Math.sin(i*1.73+j*.84);
    return pt(s,-Math.cos(angle)*(w+1.18+(j%6?2.0:0))*wobble,
      -.65+Math.sin(angle)*(9.5+.83*Math.cos(i*.49))*wobble);
   };
   const facets=['#58869b','#6894a6','#739eb0','#477486','#60879c','#86acb5'];
   for(let i=0;i<n;i+=4){const g=new Geo(),mid=Math.min(i+4,n);
    for(let k=i;k<mid;k++){
     const u=(a+(b-a)*k/n)*L,v=(a+(b-a)*(k+1)/n)*L;
     for(let j=0;j<6;j++){
      const A=cross(u,k,j),B=cross(v,k+1,j),C=cross(v,k+1,j+1),D=cross(u,k,j+1);
      if(j===0||j===5){
       const side=j===0?-1:1;
       // The river section opens over the left ledge. Keep the overhead
       // arch, but remove the bottom facet which used to seal the opening.
       if(edgeKind((u+v)*.5/L,side)==='void')continue;
       const groundA=j===0?A:D,groundB=j===0?B:C;
       const aboveA=j===0?D:A,aboveB=j===0?C:B;
       const ax=mix(groundA[0],aboveA[0],.24),az=mix(groundA[2],aboveA[2],.24);
       const bx=mix(groundB[0],aboveB[0],.24),bz=mix(groundB[2],aboveB[2],.24);
       api.solid((ax+bx)*.5,Math.min(groundA[1],groundB[1]),(az+bz)*.5,
        {tag:'wario/vault-wall',yaw:Math.atan2(bx-ax,bz-az),halfX:.28,halfZ:Math.hypot(bx-ax,bz-az)*.5,h:Math.max(aboveA[1],aboveB[1])-Math.min(groundA[1],groundB[1])});
       const lo=(k%8<=4?k%8:8-k%8)/4,edge=(k+1)%8,hi=(edge<=4?edge:8-edge)/4;
       if(j===0)courseSkinFace(g,D,C,B,A,strata,lo,.18,hi,.97);
       else courseSkinFace(g,A,B,C,D,strata,lo,.18,hi,.97);
      }else{
       const band=[0,1,3,4,1,0][j],tone=k%5===0?band+1:band;
       g.tri(A,B,D,facets[tone]);g.tri(B,C,D,facets[band]);
       api.roof(A,B,D);api.roof(B,C,D);
      }
      if(j!==0&&j!==5&&(k+j)%3===0){
       const midX=(A[0]+D[0])/2,midY=(A[1]+D[1])/2,midZ=(A[2]+D[2])/2;
       const e=[midX,midY-.04,midZ],d=shifted(D,-.11),b=shifted(B,-.11);
       g.tri(e,d,b,'#9ecdd0');api.roof(e,d,b);
      }
     }
     if(k%3===1){
      const ic=cross(u,k,1+k%4),first=g.d.length;
      g.tube(ic[0],ic[1]+.16,ic[2],ic[0]+.15,ic[1]-1.3-rand()*1.55,ic[2]+.25,.28+rand()*.23,.025,'#b7e8ea',5);
      for(let j=first;j<g.d.length;j+=27)api.roof(g.d.slice(j,j+3),g.d.slice(j+9,j+12),g.d.slice(j+18,j+21));
     }
    }
    emit(g,at((a+(b-a)*(i+mid)/2/n)*L));
   }
   for(const f of [.249,.272,.290,.312,.327]){
    const side=f>.295?1:-1,gem=new Geo();gem.mat=3;
    for(let j=0;j<4;j++){let x=(j-1.5)*.6,h=1.8+rand()*1.6;
     gem.tube(x,0,j*.35,x+.3,h,j*.35,.39,.31,'#68c6d6',5);
     gem.tube(x+.3,h,j*.35,x+.41,h+.85,j*.36,.31,.018,'#c0f1ec',5);
    }const p=at(f*L,side*(width(f)+.65));
    plant(gem,f,side*(width(f)+.65),-.30,0,1,5);
    api.solidLocal(p,p.yaw,.15,-.3,.55,{tag:'wario/crystal',halfX:1.20,halfZ:.82,h:2.93});
   }
  }
  // Wario Dam: an entrance gallery, alternating supports, a tall overflow face,
  // two turbine penstocks and spillwater streaking down the banked racing lane.
  {
   const hall=makeGate('WARIO DAM','HYDROELECTRIC WORKS',ink);
   hall.box(0,7.58,7,2*half+5,1,16,'#526575');
   for(const side of [-1,1]){
    hall.box(side*(half+1.50),3.3,7,.74,6.6,16,'#657988');
    for(let i=0;i<4;i++)hall.box(side*(half+1.04),4.05,1.8+i*3.2,.18,.40,1.83,'#f7dd92');
   }plant(hall,.337,0,0,0,1,21);
   const entry=at(.337*L);
   for(const side of [-1,1])api.solidLocal(entry,entry.yaw,side*(half+1.50),0,7,
    {tag:'wario/dam-gallery',halfX:.37,halfZ:8,h:6.6});
   api.solidLocal(entry,entry.yaw,0,7.08,7,{tag:'wario/dam-roof',halfX:half+2.5,halfZ:8,h:1});
   const ribs=14,fa=.354,fb=.438;
   for(let i=0;i<ribs;i++){
    const u=(fa+(fb-fa)*i/ribs)*L,v=(fa+(fb-fa)*(i+1)/ribs)*L;
    const g=new Geo(),A=pt(u,half+.62,-.02),B=pt(v,half+.62,-.02),C=pt(v,half+8,-21),D=pt(u,half+8,-21);
    g.quad(A,B,C,D,i%2?'#80959e':'#8c9fa3');
    g.tri(A,pt(u,half+8,-21),pt(u,half+12,-21),'#62798a');
    g.quad(A,shifted(A,.27),shifted(B,.27),B,'#bccecb');
    const flow0=-1.65+2.5*Math.sin(u*.025),flow1=-1.65+2.5*Math.sin(v*.025);
    g.mat=3;courseSkinFace(g,pt(v,flow1-1.50,.089),pt(v,flow1+1.50,.089),pt(u,flow0+1.50,.089),pt(u,flow0-1.50,.089),cargoPanel,0,44/63,1,.99);g.mat=0;
    if(i%3===1){
     const gutter=flow0;
     for(let k=0;k<3;k++)strip(g,u+1+k*.46,v-.2,gutter-.70+k*.39,gutter-.65+k*.39,gutter-.94+k*.35,gutter-.88+k*.35,.139,'#d1ece3');
     const a=pt(u,half+.72,.13),b=pt(u+2.65,half+.72,.13);
     g.quad(a,b,pt(u+2.78,half+9.4,-23.25),pt(u-.13,half+9.4,-23.25),'#a7d5d9');
     g.mat=0;
    }
    if(i%3===0)for(const l of [-half-4.4,-half-6.3]){
     beam(g,pt(u,l,1.35),pt(v,l,1.35),.80,'#796358',8);
     beam(g,pt(u,l,-3.0),pt(u,l,1.35),.42,'#677a83',6);
    }
    emit(g,at((u+v)/2));
   }
   // The upper abutment has an ochre crane, red sluice doors and inspection
   // catwalks. The concrete footings continue well below the track so they
   // remain grounded when seen from the sharply banked spillway.
   const valveTower=new Geo();
   valveTower.box(0,-3,0,5.8,15,5.4,'#889da0');
   valveTower.box(0,4.6,0,6.5,.36,6.0,'#c2cfca');
   valveTower.box(0,6.7,0,5.1,4.1,4.7,'#336a78');
   valveTower.box(0,8.95,0,5.8,.42,5.35,'#ddba62');
   for(const side of [-1,1]){
    valveTower.box(side*2.55,6.9,0,.12,1.6,3.3,'#92c7cc');
    valveTower.box(0,6.95,side*2.39,3.6,1.6,.13,'#7ea9b9');
   }
   valveTower.tube(1.7,9.2,1.35,1.7,11.8,1.35,.12,.07,ink,6);
   valveTower.ell(1.7,11.84,1.35,.20,.18,.20,'#d95942',6,3);
   for(const f of [.369,.395,.422]){
    const s=f*L;
    plant(valveTower,f,-half-5.3,0,0,1,16);
    const g=new Geo();
    const front=pt(s,-half-2.9,4.02),behind=pt(s,-half-8.9,4.02);
    beam(g,front,behind,.18,yellow);
    for(let i=-1;i<=1;i++)beam(g,pt(s+i*1.25,-half-2.55,3.36),pt(s+i*1.25,-half-2.55,-.44),.09,'#7c584b');
    strip(g,s-2.35,s+2.35,-half-2.8,-half-1.26,-half-2.8,-half-1.26,3.03,'#d0aa61');
    for(const ds of [-2.15,0,2.15]){
     const a=pt(s+ds,-half-1.34,3.05);beam(g,a,shifted(a,.88),.065,yellow,4);
    }
    beam(g,pt(s-2.15,-half-1.34,3.92),pt(s+2.15,-half-1.34,3.92),.066,yellow,4);
    emit(g,at(s));
    const foam=new Geo();foam.mat=5;
    foam.quad([-1.2,.035,-.15],[.98,.035,-.11],[1.19,.035,.26],[-.77,.035,.30],'#daf2e7');
    const sample=at(s,0),distance=half*.86;
    for(let phase=0;phase<2;phase++){
     add(foam,sample.x,sample.y+.19,sample.z,sample.yaw,1,distance+3,t=>{
      const dx=(mod(t*.68+phase*.5,1)*2-1)*distance;
      return {x:Math.cos(sample.yaw)*dx,y:Math.sin(sample.bank)*dx,z:-Math.sin(sample.yaw)*dx};
     });
    }
   }
   // The pool below the crest follows the curving dam, with a white boil at
   // the outfall. No water polygon spans the racing surface.
   for(let k=0;k<9;k++){
    const s=(.351+k*.010)*L,t=s+.010*L,g=new Geo();
    const A=pt(s,half+8,-22),B=pt(t,half+8,-22),C=pt(t,half+26,-22),D=pt(s,half+26,-22);
    g.quad(A,B,C,D,k%2?'#4b97ac':'#579dae');
    g.quad(shifted(A,.22),shifted(B,.22),pt(t,half+9.15,-21.74),pt(s,half+9.40,-21.74),'#c5e1dc');
    emit(g,at((s+t)/2));
   }
   const house=new Geo();house.box(0,-6.0,0,14.1,12.15,13.1,'#73828b');house.box(0,4.35,0,13,8.7,12,'#8a959a');house.box(0,8.90,0,14,.60,13,'#d3d7d2');
   for(let x=-4.8;x<5.0;x+=3.18)for(const h of [2.8,6.2])house.box(x,h,-6.09,2.60,1.48,.18,'#49687d');
   house.box(0,10.8,0,1.45,3.6,1.42,'#637481');house.box(0,4.97,-6.12,12,.93,.11,'#a66144');house.label('HYDRO 08',0,5.01,-6.19,8.6,1.06,'#fff1bf',ink);
   plant(house,.382,-17.4,-1.8,.21,1,16);plant(house,.430,-17,-1.0,-.30,.84,16);
  }
  // Forest split: a wooded median separates two rideable snow lanes. The log yard's
  // stacks are outside the road; only the single low log near its exit can hit a kart.
  function spruce(variant,pruned=false){
   const tree=new Geo(),h=6.5+variant*1.3,w=1.8+.25*variant;
   tree.tube(0,-.32,0,.06,h*.67,0,.30,.13,'#77685c',6);
   for(let k=0;k<3;k++){
    const base=(pruned?2.48:.85)+k*h*.19,r=w*(pruned?.84:1)*(1-k*.19),top=base+h*(.43-.04*k),n=7;
    for(let j=0;j<n;j++){
     const a=2*Math.PI*j/n+k*.36,b=2*Math.PI*(j+1)/n+k*.36;
     const x=r*Math.sin(a),z=r*Math.cos(a),X=r*Math.sin(b),Z=r*Math.cos(b);
     const A=[x,base+.14*Math.sin(j*2.1),z],B=[X,base+.14*Math.sin((j+1)*2.1),Z],P=[.08*k,top,-.05*k];
     tree.tri(A,B,P,['#426e72','#365d62','#4d7475'][(j+k)%3]);
     const m=.23+(j%3)*.14;
     tree.tri([x*(1-m)*1.07,mix(base,top,m)+.10,z*(1-m)*1.07],[X*(1-m+.06)*1.07,mix(base,top,m-.06)+.10,Z*(1-m+.06)*1.07],[P[0],P[1]+.07,P[2]],(j+k)%3?'#d6e5e4':'#bfd5d9');
    }
   }return tree
  }
  const trees=[spruce(0),spruce(1),spruce(2)];
  for(let i=0;i<112;i++){
   const f=.441+rand()*.203,side=i%2?1:-1,l=side*(width(f)+2.7+rand()*16);
   const ground=offroadHeight(f,l)-.10,yaw=rand()*TAU,sc=.67+rand()*.58,p=at(f*L,l);
   plant(trees[i%3],f,l,ground,yaw,sc,10);
   api.solid(p.x,p.y+ground-.25*sc,p.z,{tag:'wario/spruce-trunk',r:.29*sc,h:(4.7+i%3*.8)*sc});
   api.solid(p.x,p.y+ground+.92*sc,p.z,{tag:'wario/spruce-skirt',r:(1.41+.20*(i%3))*sc,h:1.15*sc});
  }
  const medianFir=spruce(2,true);
  for(const h of hazards.slice(0,4)){
   const p=at(h.f*L,h.center());plant(medianFir,h.f,h.center(),0,.6,1.03,10);
   api.solid(p.x,p.y-.3,p.z,{tag:'wario/median-fir',r:.31,h:6.6,hazard:h.name});
  }
  const logs=new Geo();
  for(let j=0;j<5;j++){const x=(j%3-1)*.72,y=j<3?.35:1.02;
   logs.tube(x,y,-2.7,x,y,2.7,.38,.35,'#8e7356',8);
   logs.tube(x,y,-2.75,x,y,-2.71,.34,.34,'#c4a273',8);}
  for(const [f,l,turn,sc] of [[.568,-11.4,.76,1.2],[.577,-12.8,1.02,.91]]){
   const p=at(f*L,l),ground=offroadHeight(f,l);
   plant(logs,f,l,ground,turn,sc,5);
   api.solidLocal(p,p.yaw+turn,0,ground,0,{tag:'wario/log-stack',halfX:1.10*sc,halfZ:2.74*sc,h:1.38*sc});
  }
  const stump=new Geo();stump.tube(-1.3,.20,-.25,1.32,.20,.28,.36,.30,'#9b7a58',8);plant(stump,.576,4.5,0,-.2,1,2);
  const trunk=at(.576*L,4.5);
  api.solidLocal(trunk,trunk.yaw-.2-Math.atan2(.53,2.62),0,-.14,0,{tag:'wario/low-log',halfX:1.42,halfZ:.33,h:.70,hazard:'横木'});
  // Timber timing huts along the ski run. Eaves, snow caps and mullions
  // share one static model so each hut can be culled as a single prop.
  const hut=new Geo(),timber='#875b48',cream='#e4d3ae',roof='#536272';
  hut.box(0,1.55,0,5.2,3.1,4.0,timber);hut.box(0,2.15,-2.03,5.12,1.22,.11,cream);
  for(const side of [-1,1]){
   const x=side*3.08;
   hut.quad([0,4.45,-2.52],[x,3.04,-2.52],[x,3.04,2.52],[0,4.45,2.52],roof);
   hut.quad([0,4.67,-2.56],[x,3.23,-2.57],[x,3.23,2.59],[0,4.67,2.58],'#edf0e9');
   hut.quad([x,3.05,-2.53],[x,3.23,-2.57],[x,3.23,2.59],[x,3.05,2.52],'#c2d5da');
   const wx=side*1.45;const x0=wx-.62,x1=wx+.62,u=side<0?.50:0;
   courseSkinFace(hut,[x0,2.45,-2.16],[x1,2.45,-2.16],[x1,1.43,-2.16],[x0,1.43,-2.16],panes,u,0,u+.25,1);
   hut.box(side*2.42,1.64,-2.1,.18,3.18,.18,'#795548');
  }
  hut.tri([-2.58,3.10,-2.03],[2.58,3.10,-2.03],[0,4.37,-2.03],'#ad795a');
  hut.box(.05,.96,-2.11,.88,1.88,.12,'#503f3c');hut.box(-1.38,4.02,1.13,.68,1.73,.72,'#92796d');
  hut.box(-1.38,4.91,1.13,.90,.16,.96,'#e0e9e8');
  for(const [f,side,sc] of [[.593,-1,1.12],[.647,1,.94],[.754,-1,1.08],[.833,1,.93]]){
   const l=side*(width(f)+5.6),ground=offroadHeight(f,l)-.12,p=at(f*L,l);
   plant(hut,f,l,ground,-side*1.05,sc,6);
   api.solidLocal(p,p.yaw-side*1.05,0,ground,0,{tag:'wario/timing-hut',halfX:2.60*sc,halfZ:2.0*sc,h:3.10*sc});
  }
  // Chairlift cables cross the village and carry seats into the final section.
  {
   const stations=[[.615,-18,8.7],[.634,-12,8.6],[.652,14,10.2],[.665,18,8.5]];
   const chair=new Geo();chair.box(0,.16,0,2.42,.20,.89,'#43829b');chair.box(0,.57,.38,2.42,.82,.13,'#d64e51');
   for(const side of [-1,1])beam(chair,[side*1.08,.25,.28],[side*.5,2.19,.12],.065,ink,4);
   beam(chair,[0,1.88,.12],[0,2.93,.12],.085,'#475e6b');
   for(let i=0;i<stations.length;i++){const [f,l,h]=stations[i],p=pt(f*L,l,offroadHeight(f,l));
    const g=new Geo();g.tube(0,0,0,0,h,0,.35,.28,'#637a89',7);g.box(0,h,0,4,.31,.44,ink);
    g.box(0,.6,0,1.5,1.2,1.55,'#a9b8bc');
    add(g,...p,at(f*L).yaw,1,h+3);
    api.solid(p[0],p[1],p[2],{tag:'wario/lift-base',yaw:at(f*L).yaw,halfX:.75,halfZ:.775,h:1.2});
    api.solid(p[0],p[1]+1.2,p[2],{tag:'wario/lift-post',r:.33,h:h-1.2});
    if(i+1===stations.length)break;
    const [f2,l2,h2]=stations[i+1],Q=pt(f2*L,l2,offroadHeight(f2,l2));
    const A=shifted(p,h+.23),B=shifted(Q,h2+.23),wire=new Geo(),dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2];
    for(const side of [-1,1]){
     const a=[A[0]+side*1.6,A[1],A[2]],b=[B[0]+side*1.6,B[1],B[2]];
     beam(wire,a,b,.055,ink,5);
     for(let k=0;k<2;k++){const base=[(a[0]+b[0])/2,(a[1]+b[1])/2-2.95,(a[2]+b[2])/2],phase=.50*k+.17*i+(side<0?.13:0);
      add(chair,...base,Math.atan2(dx,dz)+(side<0?Math.PI:0),1,Math.hypot(dx,dy,dz)/2+3,t=>{
       const q=mod(t*.058+phase,1)*(side<0?-1:1)+(side<0?.5:-.5);
       return {x:dx*q,y:dy*q,z:dz*q,roll:.02*Math.sin(t*1.8+phase)};
      });
     }
    }emit(wire,at((f+f2)*L/2));
   }
  }
  const flag=color=>{
   const g=new Geo();for(const side of [-1,1])beam(g,[side*.67,-.14,0],[side*.67,2.55,.06],.046,color,5);
   const u=color===red?0:.5;
   courseSkinFace(g,[-.67,2.32,0],[.67,2.23,.07],[.67,1.02,.07],[-.67,1.12,0],cloth,u,0,u+.5,1);return g;
  };
  const colors=[flag(red),flag('#428bae')];
  for(let i=0;i<16;i++){const f=.638+i*.0083,side=i%2?1:-1;
   plant(colors[i%2],f,side*(width(f)-1.08),.025,side*.14,1,3);
   plant(colors[i%2],f,side*(width(f)+1.7),.08,side*.14,.9,3);
  }
  function ring(){
   const g=new Geo(),n=14,radius=4.25;g.mat=5;
   for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
    const A=[Math.cos(a)*radius,Math.sin(a)*radius,0],B=[Math.cos(b)*radius,Math.sin(b)*radius,0];
    beam(g,A,B,.17,['#f4cd55','#fff3bc','#e98b43','#f4cd55'][i%4],5);
   }return g;
  }
  const hoop=ring();for(const [i,f] of [.7965,.804,.812].entries())plant(hoop,f,0,4.9+.4*i,0,1,5);
  // Rails are built only where the course policy specifies a rail. Elsewhere a
  // skier can run into soft snow or fall cleanly from a visible glacier lip.
  for(const [fa,fb] of [[0,.012],[.231,.284],[.335,.355],[.356,.437]])for(const side of [-1,1]){
   if(edgeKind((fa+fb)*.5,side)!=='rail')continue;
   const n=Math.ceil((fb-fa)*L/5),g=new Geo();
   for(let i=0;i<n;i++){const s=(fa+(fb-fa)*i/n)*L,t=(fa+(fb-fa)*(i+1)/n)*L;
    const a=width(s/L)+shoulder(s/L,side),b=width(t/L)+shoulder(t/L,side);
    const A=pt(s,side*a,.1),B=pt(t,side*b,.1);beam(g,A,shifted(A,1.04),.085,ink);
    beam(g,shifted(A,.83),shifted(B,.83),.11,fa>.20?'#b8dfd9':yellow);
   }emit(g,at((fa+fb)*L/2));
  }
  function stands(){
   const g=new Geo(),seat=['#92606b','#627e90',purple];
   for(let k=0;k<4;k++){
    const z=k*1.18,y=.64+k*.75;g.box(0,y*.5,z,19,y,1.25,seat[k%3]);
    // Separate rows give parallax. Painted wool hats, faces, scarves and raised
    // mittens replace hundreds of tiny ellipsoids that disappear at racing speed.
    const zFace=z-.16,x=9.3,h=2.0;
    courseSkinFace(g,[-x,y+h,zFace],[x,y+h,zFace],[x,y-.05,zFace],[-x,y-.05,zFace],crowdPrint,k%2,0,1-k%2,1);
    g.box(0,y-.11,z-.62,19,.12,.13,'#d4dad4');
   }
   for(const x of [-9.2,-3,3,9.2])g.box(x,.95,-.91,.13,1.83,.14,ink);
   g.box(0,1.69,-.91,18.7,.10,.12,'#c5d3d2');
   g.box(0,3.52,3.97,19.6,.26,.23,ink);return g;
  }
  const grandstand=stands();
  for(const side of [-1,1])for(const f of [.855,.873,.897,.907]){
   const l=side*(width(f)+4.2),p=at(f*L,l),ground=offroadHeight(f,l),yaw=p.yaw-side*1.57;
   plant(grandstand,f,l,ground,-side*1.57,.91,14);
   api.solidLocal(p,yaw,0,ground,1.77*.91,{tag:'wario/stands',halfX:9.5*.91,halfZ:2.40*.91,h:2.89*.91});
  }
  const tv=new Geo();for(const x of [-5.0,5.0])tv.box(x,3.4,0,.65,6.8,.8,ink);
  tv.box(0,8.5,0,15.3,7,.75,'#52355e');tv.box(0,8.6,-.42,14,5.85,.12,'#31354e');
  tv.label('MOUNT WARIO',0,10.35,-.51,12.0,1.4,'#ffd45f');
  tv.label('SKI CROSS',0,8.55,-.51,10.4,1.05,'#b5e9ea');
  tv.label('FINISH',0,6.80,-.51,8,.86,'#f3eddf');
  plant(tv,.913,0,0,0,1,16);
  // Fill the spaces between ribbons with a single mountain massif, sunk below
  // the contact surface. The return spline never contributes to the elevation.
  const stations=[];for(let s=0;s<=runout;s+=6){const p=at(s);stations.push({p,f:s/L})}
  const planeY=(x,z)=>{
   let near=stations[0],dd=Infinity;
   for(const q of stations){const d=(x-q.p.x)**2+(z-q.p.z)**2;if(d<dd){near=q;dd=d}}
   const p=near.p,l=(x-p.x)*Math.cos(p.yaw)-(z-p.z)*Math.sin(p.yaw);
   const distance=Math.sqrt(dd),voidSide=edgeKind(near.f,Math.sign(l))==='void';
   const under=Math.min(0,l*Math.sin(p.bank))-4.5-(voidSide?15:2.5);
   const hills=Math.sin(x*.034+z*.019)*4.4+Math.sin(z*.047-x*.008)*3.1;
   return p.y+under+hills*blend(17,65,distance)-Math.min(distance*.075,19);
  };
  const x0=-225,z0=-219,step=14,nx=45,nz=45,terrain=[];
  for(let i=0;i<=nz;i++){const row=[];for(let j=0;j<=nx;j++){
   const x=x0+j*step,z=z0+i*step;row.push([x,planeY(x,z),z]);
  }terrain.push(row)}
  const snowTints=snowpackPalette(terrain,step);
  for(let i=0;i<nz;i+=5)for(let j=0;j<nx;j+=5){const g=new Geo();
   for(let a=i;a<Math.min(i+5,nz);a++)for(let b=j;b<Math.min(j+5,nx);b++){
    const A=terrain[a][b],B=terrain[a][b+1],C=terrain[a+1][b+1],D=terrain[a+1][b];
    snowpackFace(g,A,D,B,snowTints[a][b],snowTints[a+1][b],snowTints[a][b+1]);
    snowpackFace(g,D,C,B,snowTints[a+1][b],snowTints[a+1][b+1],snowTints[a][b+1]);
   }
   const c=terrain[Math.min(i+2,nz)][Math.min(j+2,nx)];emit(g,{x:c[0],y:c[1],z:c[2]});
  }
  function peak(h,w,color){
   const g=new Geo(),n=16,rings=[],shape=Math.sin(w+h)*.34;
   for(let k=0;k<5;k++){const v=[];for(let j=0;j<n;j++){
    const a=j*TAU/n+shape+.046*k,spur=.14*Math.cos(3*a+shape)+.082*Math.cos(6*a-.27*k);
    const r=w*[1,.76,.51,.29,.10][k]*(1+spur);
    const ridge=k?(.047+.014*k)*Math.sin(2*a+shape)+.040*Math.cos(5*a):0;
    const y=h*([0,.25,.50,.72,.88][k]+ridge);
    v.push([Math.sin(a)*r+.048*w*k,y,Math.cos(a)*r*.76]);
   }rings.push(v)}
   for(let j=0;j<n;j++){
    const next=(j+1)%n,shaded=Math.cos(j*TAU/n-.80)<-.10;
    for(let k=0;k<4;k++){
     const A=rings[k][j],B=rings[k][next],C=rings[k+1][next],D=rings[k+1][j];
     const rock=shaded?'#8193a7':color;
     if(k<1){g.tri(A,B,C,rock);g.tri(A,C,D,shaded?'#889dae':'#a0b2be');continue}
     if(k===1||k===2&&j%5<2){
      const edge=(u,v,t)=>u.map((x,i)=>mix(x,v[i],t));
      const m=edge(A,D,.28+.38*(.5+.5*Math.sin(j*1.7))),v=edge(B,C,.22+.39*(.5+.5*Math.sin(next*1.7)));
      g.quad(A,B,v,m,rock);g.quad(m,v,C,D,shaded?'#b3c9d5':'#d9e6e8');
     }else{
      g.tri(A,B,C,shaded?'#c1d4dd':'#e1eaea');g.tri(A,C,D,shaded?'#b4cbd7':'#d6e3e6');
     }
    }g.tri(rings[4][j],rings[4][next],[w*.24,h,0],shaded?'#cbdde2':snow);
   }return g;
  }
  for(const [x,z,h,w] of [[-157,45,72,64],[-170,176,84,61],[-163,315,81,69],[-7,379,86,85],[144,364,60,46],[282,359,98,74],[368,233,77,48],[375,79,69,56],[294,19,56,47],[81,-190,57,45],[-192,-143,51,39]]){
   add(peak(h,w,'#9cabb9'),x,planeY(x,z)-15,z,0,1,Math.hypot(h,w));
  }
  // The construction spline back to the starting aircraft and the distant
  // mountains are scenic. Only the start grid, skiable ribbons and runout carry wheels.
  return (x,z,p,maxY)=>driveable.heightAt(x,z,maxY);
 };
 return def;
}
