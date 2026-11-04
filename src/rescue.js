// A world-space rig shared by all course rescues. The three links are transformed
// copies of one tiny cylinder; there is no skinned mesh or dynamic texture upload.
const RubyRescue=(()=>{
 const body=new Geo(),head=new Geo(),rod=new Geo(),hook=new Geo(),cord=new Geo();
 const gold='#ffbe35',sun='#ffe17b',cream='#fff6cb',ink='#303447',white='#fffff1';
 const ell=(g,x,y,z,a,b,c,color,n=10,m=5)=>g.ell(x,y,z,a,b,c,color,n,m);
 function stroke(g,points,radii,color,n=6){
  for(let i=1;i<points.length;i++)g.tube(...points[i-1],...points[i],radii[i-1],radii[i],color,n);
 }
 // The nimbus has a continuous belly and a scalloped crown. Its face is molded
 // along the front surface so both pupils and the smile project with the cloud.
 ell(body,0,0,0,.97,.32,.55,'#dce7ec',16,6);
 const lobes=[[-.72,.07,.05,.40,.28,.43],[-.43,.17,-.13,.43,.32,.43],[-.04,.16,-.18,.48,.32,.46],
 [.47,.13,-.09,.41,.32,.42],[.78,.06,.08,.31,.25,.35],[.44,.12,.27,.42,.29,.37],[-.32,.12,.28,.46,.28,.34]];
 for(const [x,y,z,a,b,c] of lobes)ell(body,x,y,z,a,b,c,'#fff9dd',10,5);
 for(const x of [-.16,.16]){
  ell(body,x,.085,-.605,.041,.079,.020,ink,8,4);
  ell(body,x-.009,.109,-.626,.011,.021,.009,white,6,3);
 }
 stroke(body,[[-.13,-.02,-.595],[-.08,-.061,-.612],[.02,-.069,-.618],[.11,-.035,-.605]],[.012,.017,.017,.012],ink,5);
 // Amber limbs and belly, with a scuted green shell visible in rear view.
 ell(body,-.02,.56,.02,.37,.43,.33,gold,13,6);
 ell(body,0,.51,-.173,.32,.30,.20,cream,12,5);
 ell(body,.00,.63,.184,.405,.45,.24,'#f9e6ab',13,6);
 ell(body,-.01,.65,.245,.379,.413,.22,'#348752',12,6);
 for(const x of [-.23,.23])stroke(body,[[x*.6,.88,.399],[x,.73,.426],[x*.91,.53,.435],[x*.52,.39,.392]],[.018,.018,.018,.014],'#23593d',5);
 for(const [x,y] of [[-.245,.68],[.245,.68],[0,.88]])ell(body,x,y,.42,.068,.06,.042,'#cee797',8,4);
 for(const x of [-.32,.30])ell(body,x,.32,-.19,.17,.10,.18,sun,10,4);
 stroke(body,[[-.27,.71,-.10],[-.34,.58,-.32],[-.10,.56,-.46],[.16,.66,-.46]],[.11,.116,.105,.09],gold);
 stroke(body,[[.27,.75,-.12],[.40,.69,-.28],[.50,.77,-.37]],[.12,.11,.10],sun);
 ell(body,.15,.65,-.46,.127,.109,.11,sun,9,4);
 ell(body,.50,.77,-.37,.138,.109,.11,sun,9,4);
 ell(head,0,0,0,.382,.37,.339,gold,14,7);
 ell(head,.025,-.105,-.246,.28,.15,.177,sun,12,5);
 stroke(head,[[-.105,-.144,-.398],[-.006,-.162,-.42],[.097,-.14,-.407]],[.011,.014,.01],'#8a4f36',5);
 stroke(head,[[-.34,.046,-.06],[-.386,.039,.12],[-.28,.03,.239]],[.044,.044,.04],'#614633',6);
 stroke(head,[[.34,.046,-.06],[.386,.039,.12],[.28,.03,.239]],[.044,.044,.04],'#614633',6);
 for(const x of [-.169,.169]){
  ell(head,x,.086,-.276,.184,.185,.10,'#87592d',12,5);
  head.mat=4;ell(head,x,.089,-.308,.173,.169,.088,'#4c4d54',12,5);
  head.mat=3;ell(head,x,.094,-.344,.135,.140,.067,'#f7fcf7',12,5);
  ell(head,x+.010,.086,-.403,.049,.080,.017,'#273449',10,5);
  ell(head,x+.003,.118,-.423,.019,.027,.008,white,6,3);
 }
 head.mat=4;stroke(head,[[-.042,.095,-.37],[.042,.095,-.37]],[.025,.025],'#55565b');
 head.mat=0;
 for(const [x,dx,h] of [[-.15,-.10,.15],[-.055,-.035,.21],[.053,.01,.16]])
  stroke(head,[[x,.298,-.035],[x+dx*.6,.345+h*.6,-.01],[x+dx,.345+h,.033]],[.045,.028,.005],'#503d2a',5);
 // Bamboo fly rod, black reel spool, coral float, bent-steel towing hook.
 const p=[[0,-.13,0],[.15,.14,0],[.39,.45,0],[.73,.68,-.02],[1.12,.81,-.04],[1.48,.81,-.06],[1.71,.73,-.08]];
 stroke(rod,p,[.062,.056,.049,.042,.035,.027,.014],'#e8af57',7);
 stroke(rod,[[-.145,-.31,0],[.10,.11,0]],[.073,.068],'#6e392b',7);
 for(const k of [1,3,5]){
  const a=p[k],b=p[k+1];stroke(rod,[a,a.map((v,i)=>mix(v,b[i],.13))],[.039,.036],'#9b4739',7);
 }
 rod.mat=4;rod.tube(.12,-.02,-.11,.12,-.02,.096,.115,.115,'#6e6873',10);
 rod.tube(.12,-.02,-.126,.12,-.02,-.112,.096,.096,'#dad1ad',10);
 rod.mat=3;ell(rod,.19,-.065,-.14,.039,.035,.029,'#ac4b37',8,3);
 hook.mat=4;
 stroke(hook,[[0,.05,0],[0,-.07,0],[.02,-.116,0],[.078,-.134,0],[.124,-.096,0],[.13,-.038,0]],[.024,.023,.022,.022,.019,.006],'#d1d8d8',7);
 hook.mat=3;ell(hook,0,.095,0,.052,.087,.054,'#e45236',10,5);
 ell(hook,0,.115,0,.054,.018,.055,white,9,3);
 cord.mat=5;cord.tube(0,0,0,0,0,1,.014,.014,'#ffe8a4',6);
 const meshes=[body,head,rod,hook,cord];
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const range=(a,b,t)=>smooth((t-a)/(b-a));
 function local(x,y,z,yaw,ox,oy,oz){
  return [x+Math.cos(yaw)*ox+Math.sin(yaw)*oz,y+oy,z-Math.sin(yaw)*ox+Math.cos(yaw)*oz];
 }
 function link(m,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
  if(len>.025)m.draw(cord,...a,Math.atan2(dx,dz),len,0,Math.atan2(dy,Math.hypot(dx,dz)));
 }
 function draw(m,r,now){
  let out=0,origin=r,pre=1,t=0;
  if(r.falling)pre=clamp(r.fallTime/.87,0,1);
  else if(r.rescue>0)t=clamp(1-r.rescue/1.18,0,1);
  else{
   if(!r.marshalExit)return;
   if(now-r.marshalExit.at>.62){r.marshalExit=null;return}
   out=clamp((now-r.marshalExit.at)/.62,0,1);origin=r.marshalExit;t=1;
  }
  // The cloud approaches from the outside of the chase view, hangs over the
  // pickup, then accelerates up and sideways once the real kart has landed.
  const yaw=origin.hd+.06*Math.sin(now*3),arrive=1-range(0,.83,pre);
  const leave=range(.89,1,t)*.12+out;
  const airy=Math.sin(now*4.8);
  const pos=local(origin.x,origin.y,origin.z,yaw,-2.0-2.7*arrive-8*leave*leave,.0,.12+.92*arrive+4*leave*leave);
  const floor=origin.groundY,cy=Math.max(origin.y+2.42,floor+2.15)+.075*airy+1.5*arrive+4.5*leave*leave;
  const cx=pos[0],cz=pos[2];
  if(!m.vis(cx,cy,cz,4.2))return;
  const reel=range(.10,.44,t)-range(.62,.86,t);
  const headAt=local(cx,cy,cz,yaw,.02,1.07,-.07);
  const hand=local(cx,cy,cz,yaw,.48,.76,-.34);
  const roll=.12+.50*(arrive+.42*reel+leave)-.25*range(.4,1,pre)*(1-range(.08,.28,t));
  const ox=1.71*Math.cos(roll)-.73*Math.sin(roll),oy=1.71*Math.sin(roll)+.73*Math.cos(roll);
  const tip=local(...hand,yaw,ox,oy,-.08);
  const target=local(origin.x,origin.y,origin.z,origin.hd,-.26,.76,-.78);
  const grab=range(.38,.97,pre)*(1-range(.88,.993,t));
  const caught=[mix(tip[0],target[0],grab),mix(tip[1]-.20,target[1],grab),mix(tip[2],target[2],grab)];
  const slack=(1-grab)*Math.min(1,grab*8)*.32;
  const mid=[mix(tip[0],caught[0],.50)+slack*.6,mix(tip[1],caught[1],.50)-slack,mix(tip[2],caught[2],.50)+slack*.52];
  m.draw(body,cx,cy,cz,yaw);
  m.draw(head,...headAt,yaw-.11*reel,1,0,.04+.12*reel);
  m.draw(rod,...hand,yaw,1,roll);
  link(m,tip,mid);link(m,mid,caught);
  m.draw(hook,...caught,yaw,1);
 }
 function drawRace(m){
  if(me.falling||me.rescue>0||me.marshalExit)draw(m.forObject?m.forObject(me.marshalShadowKey||(me.marshalShadowKey={}),2):m,me,worldT);
  for(const r of cars){
   if(r===me||!(r.falling||r.rescue>0||r.marshalExit)||Math.hypot(me.x-r.x,me.z-r.z)>28)continue;
   if(r.marshalExit&&worldT-r.marshalExit.at>.62&&!r.falling&&!r.rescue){r.marshalExit=null;continue}
   draw(m.forObject?m.forObject(r.marshalShadowKey||(r.marshalShadowKey={}),2):m,r,worldT);break;
  }
 }
 return {meshes,drawRace};
})();
