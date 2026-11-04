const renderer=new Motor(byId('scene')),skyLayer=byId('sky'),fxLayer=byId('fx'),mini=byId('map'),mapCtx=mini.getContext('2d'),miniSize=observeCanvasSize(mini);
const meshCache=new Map(),wingCache=new Map(),ghostCache=new Map();let camera=null,lastCamType='',mapPlate=null,mapProj=null;
function vehicleMesh(build,lod,anti){
 let key=partKey(build,lod,anti);if(meshCache.has(key)){const v=meshCache.get(key);meshCache.delete(key);meshCache.set(key,v);return v}
 let m=rubyKart(build,lod,anti);meshCache.set(key,m);
 if(meshCache.size>48){let first=meshCache.keys().next().value,old=meshCache.get(first);renderer.release(old);meshCache.delete(first)}return m;
}
function ghostTint(g){
 for(let i=0;i<g.d.length;i+=9){g.d[i+6]=-1;g.d[i+8]=7}
 return g;
}
let ghostBuild='';
function echoMesh(b,anti){
 const base=partKey(b,1,false),key=partKey(b,1,anti);
 if(ghostBuild!==base){
  for(const g of ghostCache.values()){if(g.ghostWing)renderer.release(g.ghostWing);renderer.release(g)}
  ghostCache.clear();ghostBuild=base;
 }
 if(!ghostCache.has(key))ghostCache.set(key,ghostTint(rubyKart(b,1,anti)));
 return ghostCache.get(key);
}
// Each yield separates CPU mesh creation, collision/shadow proxy construction,
// GPU uploads and worker transfer. Completed resources are reused on retries.
let gridPlan=null,warmTicket=null;
const separateWarmSlice=Symbol('next preparation slice');
const preparedModels=new WeakMap(),preparedRenderers=new WeakMap();
function* warmMeshes(models,owner){
 const pending=[];
 for(const g of models){
  if(!g||preparedRenderers.get(g)===owner)continue;
  renderer.upload(g);if(owner instanceof SoftRaster)owner.prep(g);
  pending.push(g);yield;
 }
 if(owner instanceof WorkerRaster&&pending.length){
  while(!owner.prewarmMeshes(pending,renderer))yield;
  yield; // The next slice is woken by the worker's warm acknowledgment.
 }
 for(const g of pending)preparedRenderers.set(g,owner);
}
function* prepRaceAssets(plan){
 const {track:courseTrack,owner}=plan,canFly=!!courseTrack.d.ramps?.length;
 const states=courseTrack.d.antiGravity?[courseTrack.antiGravity(0),!courseTrack.antiGravity(0)]:[courseTrack.antiGravity(0)];
 if(WorldShadows.prepare){WorldShadows.prepare(courseTrack);yield}
 if(WorldShadows.warmDetail){while(!WorldShadows.warmDetail(courseTrack,plan.x,plan.z))yield separateWarmSlice}
 const locales=new Set([courseTrack.d.id]);
 if(courseTrack.d.environment)for(let i=0;i<32;i++)locales.add(courseTrack.d.environment(i/32));
 if(RubyAtmos.prepare)for(const theme of locales){RubyAtmos.prepare(theme);yield}
 if(RubyRoadFX.prepare){while(!RubyRoadFX.prepare(renderer,plan.fleet))yield separateWarmSlice;yield}
 // Coins and boxes appear at the start. Defensive items, fire and explosions
 // are first used later in a race, but need the same meshes inside the worker.
 const kinds=plan.fleet.length>1?['box','coin','banana','shell','green','spiny','bomb','fireball','mushroom']:['coin'];
 const itemModels=[];
 for(const kind of kinds){const g=propMesh(kind);itemModels.push(g);if(g.farDetail)itemModels.push(g.farDetail);yield}
 yield* warmMeshes(itemModels,owner);
 WorldShadows.proxy(RubyRescue.meshes[0]);yield;
 yield* warmMeshes(RubyRescue.meshes,owner);
 for(const anti of states){
  for(const level of [0,2,1]){
   for(let i=level?1:0;i<(level?plan.fleet.length:1);i++){
    const b=plan.fleet[i].cfg,mesh=vehicleMesh(b,level,anti);yield;
    if(preparedModels.get(mesh)!==plan.quality){WorldShadows.proxy(mesh);preparedModels.set(mesh,plan.quality);yield}
    const rig=rubyDriveRig(b,anti,mesh);yield;
    WorldShadows.proxy(rig.rider);WorldShadows.proxy(rig.fixed);yield;
    if(rig.arms)for(const arm of rig.arms){WorldShadows.proxy(arm.mesh);yield* warmMeshes([arm.mesh],owner)}
    if(level===0)yield* warmMeshes([rig.chassis,rig.rider,...rig.wheels.map(w=>w.mesh)],owner);
    else yield* warmMeshes(mesh.farDetail?[mesh,mesh.farDetail,rig.fixed,rig.rider]:[mesh,rig.fixed,rig.rider],owner);
    if(level!==2&&canFly){
     const wing=wingMesh(b);canopyCells(b,wing);WorldShadows.proxy(wing);
     yield* warmMeshes([wing],owner);
    }
   }
  }
  if(plan.ghost){
   const ghost=echoMesh(plan.ghost,anti);
   if(canFly&&!ghost.ghostWing)ghost.ghostWing=ghostTint(rubyWing(plan.ghost));
   yield* warmMeshes([ghost,ghost.ghostWing],owner);
  }
 }
 const props=courseTrack.props;
 if(typeof prepareScenery==='function')prepareScenery(props);
 const distance=o=>{const p=o.center||o;return Math.hypot(p.x-plan.x,p.z-plan.z)-(o.r||0)};
 // Warm the actual GL scene chunks and software-detail variants the race uses.
 // Start-area resources gate the grid; distant sections can use the rest of
 // the menu/countdown, so a long circuit never holds the starting lights.
 const parts=[],seen=new Set();
 if(renderer.batched){
  let chunks=renderer.scenePlans.get(props);
  if(!chunks){chunks=sceneryPlan(props,!!renderer.instances);renderer.scenePlans.set(props,chunks)}
  for(const chunk of chunks)if(chunk.props.length>1){
   parts.push({d:Math.min(...chunk.props.map(distance)),chunk});for(const o of chunk.props)seen.add(o.g);
  }
 }
 const nearest=new Map();
 for(const o of props){
  const d=distance(o);
  if(!nearest.has(o.g)||d<nearest.get(o.g))nearest.set(o.g,d);
 }
 for(const [g,d] of nearest){
  if(!seen.has(g))parts.push({d,g});
  if(g.farDetail)parts.push({d,g:g.farDetail});
 }
 parts.sort((a,b)=>a.d-b.d);let batch=[],verts=0;
 for(const part of parts){
  if(!plan.ready&&part.d>105){yield* warmMeshes(batch,owner);batch=[];verts=0;plan.ready=true;yield}
  if(part.chunk){if(!part.chunk.buf)renderer.createSceneChunk(part.chunk);yield}
  else{
   batch.push(part.g);verts+=part.g.n||part.g.d.length/9;
   if(batch.length>=12||verts>=6000){yield* warmMeshes(batch,owner);batch=[];verts=0}
  }
 }
 yield* warmMeshes(batch,owner);plan.ready=true;
}
function gridForRace(){
 const owner=renderer.cpu||renderer,quality=WorldShadows.getQuality();
 if(gridPlan?.fleet===cars&&gridPlan.track===track&&gridPlan.owner===owner&&gridPlan.quality===quality)return gridPlan;
 const ghost=mode==='tt'&&ghostData?.cfg||null;
 const key=course+'/'+cars.map((r,i)=>partKey(r.cfg,i?1:0,false)).join(':')+'/'+(ghost?partKey(ghost,1,false):'');
 if(gridPlan?.key===key&&gridPlan.track===track&&gridPlan.owner===owner&&gridPlan.quality===quality){gridPlan.fleet=cars;return gridPlan}
 const plan={key,track,fleet:cars,ghost,owner,quality,x:me.x,z:me.z,ready:false,done:false,waitAt:null};
 plan.work=prepRaceAssets(plan);return gridPlan=plan;
}
function cancelGridWarm(){
 if(!warmTicket)return;
 if(warmTicket.idle){if(typeof cancelIdleCallback==='function')cancelIdleCallback(warmTicket.id)}else clearTimeout(warmTicket.id);
 warmTicket=null;
}
function warmGarageGrid(){
 if(screen!=='menu'&&screen!=='countdown'||document.hidden){cancelGridWarm();return}
 const plan=gridForRace();if(warmTicket?.plan===plan)return;
 cancelGridWarm();if(plan.done)return;
 if(renderer.cpu?.warming){renderer.cpu.afterWarm=warmGarageGrid;return}
 // A timer gets a turn during an impatient launch even on a continuously
 // busy event loop. In menus, the browser can schedule work in its idle time.
 const idle=screen==='menu'&&typeof requestIdleCallback==='function';
 const ticket={plan,idle,id:0};warmTicket=ticket;
 const run=deadline=>{
  if(warmTicket!==ticket)return;
  warmTicket=null;
  if(document.hidden||screen!=='menu'&&screen!=='countdown'||gridForRace()!==plan)return;
  const end=performance.now()+(screen==='countdown'?3.4:2.7);
  try{
   for(let i=0;i<16&&!renderer.cpu?.warming&&performance.now()<end;i++){
    if(deadline&&!deadline.didTimeout&&deadline.timeRemaining()<1.2)break;
    const task=plan.work.next();if(task.done){plan.done=true;break}if(task.value===separateWarmSlice)break;
   }
  }catch(error){
   // Rendering still owns its normal lazy construction path on an unexpected
   // backend/asset failure. A failed optional preload must not lock the grid.
   plan.ready=plan.done=true;console.warn('Race preparation interrupted',error);
  }
  if(!plan.done)warmGarageGrid();
 };
 ticket.id=idle?requestIdleCallback(run,{timeout:85}):setTimeout(()=>run(null),screen==='countdown'?3:12);
}
function gridStarting(){
 if(screen!=='countdown')return false;
 const plan=gridForRace();if(plan.ready)return false;
 const now=performance.now();plan.waitAt??=now;
 return now-plan.waitAt<1800;
}
function wingMesh(b){
 const kind=b.wing||0,key=kind*8+((kind===0||kind===3)?b.paint||0:0);
 if(!wingCache.has(key))wingCache.set(key,rubyWing(b));
 return wingCache.get(key);
}
function turntable(){
 const g=new Geo();g.mat=4;g.tube(0,-.35,0,0,-.14,0,3.55,3.58,'#484450',72);
 g.mat=3;g.tube(0,-.145,0,0,.005,0,3.55,3.44,'#4b3940',72);g.tube(0,.006,0,0,.015,0,3.31,3.31,'#424148',64);
 for(let i=0;i<72;i++){let a=i*TAU/72,b=(i+.69)*TAU/72;g.mat=i%6===0?5:4;let r=i%6===0?3.18:3.26;const p=(v,R,y)=>[Math.sin(v)*R,y,Math.cos(v)*R];g.quad(p(a,r,.025),p(b,r,.025),p(b,3.30,.025),p(a,3.30,.025),i%6===0?'#ffd49d':'#bd8c83');if(i%3===0){g.mat=2;g.quad(p(a,3.566,-.11),p(b,3.566,-.11),p(b,3.56,-.06),p(a,3.56,-.06),'#fb607a')}}
 return g;
}
const plinth=turntable(),sceneItems=new Map();
function propMesh(k){if(!sceneItems.has(k))sceneItems.set(k,raceItemMesh(k));return sceneItems.get(k)}
function visScreen(){if(screen==='help')return priorHelp==='pause'?heldScreen:priorHelp;if(screen==='pause')return heldScreen;return screen}
function lookAt(eye,target,fov){let x=target.x-eye.x,z=target.z-eye.z;return {...eye,yaw:Math.atan2(x,z),pitch:Math.atan2(target.y-eye.y,Math.hypot(x,z)),fov:fov*Math.PI/180}}
// Sample the latest fixed tick. Between ticks, advance straight-line ground
// motion by at most one tick; jumps, impacts and course edges use their solved pose.
let poseFrame=0,poseAlpha=1,poseAhead=0,sceneTime=0,echoTime=0;
function visualRacer(r){
 const old=r.prevPose;
 if(!old||!poseAhead||!r.grounded||r.spin>0||r.rescue||r.rampFlight||r.hopArc>0||r.contactLock>0||
    Math.abs(r.l)>r.road.w-.9||Math.abs(r.s-old.s)>1.2||Math.abs(r.y-old.y)>.19)return r;
 if(r.poseStamp===poseFrame)return r.predictionSafe?r.viewPose:r;
 const q=r.viewPose||(r.viewPose=Object.create(r)),frac=poseAhead/STEP;r.poseStamp=poseFrame;
 q.x=r.x+(r.x-old.x)*frac;q.z=r.z+(r.z-old.z)*frac;q.y=r.y+(r.y-old.y)*frac;
 q.s=r.s+(r.s-old.s)*frac;q.l=r.l+(r.l-old.l)*frac;q.hd=r.hd+clamp(angle(r.hd-old.hd),-.055,.055)*frac;
 q.roll=r.roll+clamp(r.roll-old.roll,-.06,.06)*frac;q.pitch=r.pitch+clamp(r.pitch-old.pitch,-.045,.045)*frac;
 q.groundY=r.groundY+(r.groundY-old.groundY)*frac;q.odo=r.odo+(r.odo-old.odo)*frac;q.road=track.at(q.s,q.l);
 q.road.s=q.s;q.road.l=q.l;q.road.w=r.road.w;r.predictionSafe=!track.gap(q.road);
 if(r.predictionSafe&&q.y>r.y&&track.solids.overheadCells.size){
  const scale=r.shrinkUntil>clock?lightningScale(r):1;
  r.predictionSafe=q.y+riderClearance(r)*scale<track.solids.underside(r.x,r.z,q.x,q.z,.81*scale,r.y-.015,worldT,true)-.003;
 }
 return r.predictionSafe?q:r;
}
function setViewTime(context){
 poseFrame++;poseAhead=context==='race'&&screen==='race'?Math.min(STEP,Math.max(0,tickBank)):0;
 sceneTime=worldT+poseAhead;echoTime=clock+poseAhead;
}
// The chase boom follows heading and length in kart-local space. Translating
// the kart never stretches the boom, even when display intervals alternate.
let chase=null;
function chaseFov(radians){
 // The native 5:3 and 16:9 screens keep the original lens. A tall race view
 // needs more horizontal coverage so its upcoming apex stays in frame.
 const size=renderer.cssSize(),aspect=size.width/Math.max(1,size.height);
 if(aspect>=1.05||size.width===0)return radians*180/Math.PI;
 return 2*Math.atan(Math.tan(radians*.5)/(.28+.72*aspect/1.05))*180/Math.PI;
}
function cameraClearance(eye,r,dt,rear){
 let mountY=r.y+1.15;const key=rear?'rearClear':'frontClear';
 // Under aircraft, keep a full-length boom below the wing and nacelles.
 // Look a few ticks ahead to lower smoothly before a portal, then restore
 // the normal race camera when the back of the boom clears the roof.
 const solids=track.solids,passage=track.d.cameraPassage;
 let floorY=-Infinity;
 if(passage){
  const bay=Math.abs(track.diff(r.s,passage.f*track.L)),blend=clamp((28-bay)/12,0,1);
  if(blend){
   // The empty lanes run on either side of the solid cargo bulkheads. A
   // kart can yaw while crossing the portal; the camera keeps looking along
   // its lane instead of swinging sideways through the next bulkhead.
   const t=clamp((r.l-.35)/2.4,0,1),lane=mix(Math.min(passage.lowLane,r.l),passage.highLane,t*t*(3-2*t));
   const steered=r.l+(lane-r.l)*blend,len=Math.hypot(eye.x-r.x,eye.z-r.z);
   const guide=track.at(r.s+(rear?len:-len),steered);guide.l=steered;guide.s=r.s+(rear?len:-len);
   const gx=guide.x-r.x,gz=guide.z-r.z,scale=len/Math.max(.01,Math.hypot(gx,gz));
   eye.x=mix(eye.x,r.x+gx*scale,blend);eye.z=mix(eye.z,r.z+gz*scale,blend);
   floorY=guide.y+track.lift(guide)+.58;
  }
 }
 if(solids.overheadCells.size){
  const name=rear?'rearCabinDrop':'frontCabinDrop',floor=r.y+.12,clearance=.69;
  const actual=solids.underside(r.x,r.z,eye.x,eye.z,.28,floor,worldT);
  const dx=r.vx*.19,dz=r.vz*.19;
  const soon=solids.underside(r.x+dx,r.z+dz,eye.x+dx,eye.z+dz,.31,floor,worldT);
  const required=Math.max(0,eye.y-actual+clearance),target=Math.max(required,eye.y-soon+clearance);
  const drop=Math.max(required,mix(chase[name]??0,target,1-Math.exp(-dt*(target>0?17:4.3))));
  chase[name]=drop;
  eye.y=Math.min(actual-.28,Math.max(floorY,eye.y-drop));
  mountY=Math.max(r.y+.15,Math.min(mountY,actual-.42));
 }
 const hit=track.solids.queryWorld(r.x,mountY,r.z,eye.x,eye.y,eye.z,.19,.22,worldT);
 const safe=hit?Math.max(.025,hit.time-.028):1;
 const factor=Math.min(safe,mix(chase[key]??1,safe,1-Math.exp(-dt*6)));
 chase[key]=factor;
 eye.x=mix(r.x,eye.x,factor);eye.y=mix(mountY,eye.y,factor);eye.z=mix(r.z,eye.z,factor);
}
const mildCamera=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
// Separate lens envelope: even a short boost hits before its exhaust reaches full strength.
const rushFov=[0,12,22,31];
function rushLens(previous,target,dt){
 const rate=target>previous?16:5.4;
 return mix(previous,target,1-Math.exp(-dt*rate));
}
function chaseCamera(r,dt,context){
 const travel=r.u>1.5?Math.atan2(r.vx,r.vz):r.hd, speed=clamp(r.u/39,0,1.3);
 // A departing ramp needs room for the canopy before it finishes unfolding.
 const flight=Math.max(r.wingOpen||0,r.rampFlight?.85:0);
 const probe=clamp(8+r.u*.33,8,22)+flight*5,road=r.road;
 const ahead=track.at(r.s+probe,r.l*.77);
 const curvatureLook=clamp(angle(ahead.yaw-road.yaw),-.33,.33);
 const staging=context==='countdown'?clamp((count-1.20)/2.25,0,1):0;
 const grid=staging*staging*(3-2*staging);
 const safeLook=clamp(1-Math.abs(angle(travel-road.yaw)),0,1);
 const recovery=r.falling||r.rescue>0?1:0;
 const final=context==='finish'?clamp(finishAge/2.8,0,1):0;
 const orbit=final*final*(3-2*final);
 const sideShot=context==='finish'&&DeviceShell.finishSide;
 const victoryArc=sideShot?.13*Math.sin(Math.max(0,finishAge-2.8)*.33):0;
 const heading=travel+angle(r.hd-travel)*.10+curvatureLook*.25*safeLook-.33*grid-(.97+victoryArc)*orbit;
 const tier=context==='race'&&!mildCamera?.matches?boostTier(r):0;
 const distance=6.60+.67*speed-.48*rushFov[tier]/31+.95*grid+.65*orbit+2.15*flight+1.75*recovery;
 const height=4.02+.45*speed+.78*grid+.4*orbit+2.30*flight;
 const approach=Math.atan2(ahead.x-r.x,ahead.z-r.z);
 const aim=travel+clamp(angle(approach-travel),-.36,.36)*safeLook*.79;
 const fov=(52+.95*speed+1.1*grid+5*recovery)*Math.PI/180;
 // On low pontoons and apron grass, frame the actual driving layer even
 // if the nearest race spline is on a higher bridge.
 const floorOffset=r.cameraFloorOffset||0;
 const ground=recovery?r.groundY:road.y+floorOffset,ride=Math.max(0,r.y-ground-.095);
 if(!chase||lastCamType!=='chase'+course||(!recovery&&chase.recovery<.05&&Math.hypot(chase.x-r.x,chase.z-r.z)>8)){
  chase={heading,length:distance,height,aim,fov,rush:0,ground,ride,flight,recovery,x:r.x,z:r.z};
 }else{
  const motion=1-Math.exp(-dt*9.8),view=1-Math.exp(-dt*7.5);
  chase.heading+=angle(heading-chase.heading)*motion;chase.aim+=angle(aim-chase.aim)*motion;
  chase.length=mix(chase.length,distance,view);chase.height=mix(chase.height,height,view);
  chase.fov=mix(chase.fov,fov,view);chase.ground=mix(chase.ground,ground,1-Math.exp(-dt*18));
  chase.ride=mix(chase.ride,ride,1-Math.exp(-dt*(r.rampFlight?13:7)));chase.flight=mix(chase.flight,flight,view);chase.recovery=mix(chase.recovery,recovery,view);
  chase.x=r.x;chase.z=r.z;
 }
 chase.rush=mildCamera?.matches?0:rushLens(chase.rush||0,rushFov[tier],dt);
 const lensKick=chase.rush*Math.PI/180;
 lastCamType='chase'+course;
 // Mount the boom above the driver and aim at the approaching pavement.
 // The eye rises with a jump; the target stays closer to the landing lane.
 const baseY=chase.ground+chase.ride*.86;
 const behind=track.elevation(r.s-chase.length,r.l)+floorOffset;
 const eye={x:r.x-Math.sin(chase.heading)*chase.length,y:Math.max(behind+1.85,baseY+chase.height)+chase.recovery,z:r.z-Math.cos(chase.heading)*chase.length};
 const lookAhead=(8.15+3.15*speed+4.2*chase.flight)*(1-orbit)*(1-.64*chase.recovery)+1.4*orbit;
 const gradeY=clamp((ahead.y+floorOffset-ground)/probe,-.28,.28)*lookAhead;
 const target={x:r.x+Math.sin(chase.aim)*lookAhead,y:chase.ground+chase.ride*.55+.48+.54*orbit+gradeY+clamp(r.y-ground,-4,0)*.50,z:r.z+Math.cos(chase.aim)*lookAhead};
 // Frame the submerged kart and the overhead rescuer together through the swing.
 const towFocus=(r.y+Math.max(r.y+2.42,chase.ground+2.15)+1.1)*.5;
 target.y=mix(target.y,towFocus,chase.recovery);
 if(context==='race'&&rearRequested){
  const frontDistance=4.85+.28*speed+1.65*chase.flight+1.75*chase.recovery,rearLook=(5.80+2.5*chase.flight)*(1-.54*chase.recovery);
  const front={x:r.x+Math.sin(chase.heading)*frontDistance,y:baseY+3.40+1.9*chase.flight,z:r.z+Math.cos(chase.heading)*frontDistance};
  const back={x:r.x-Math.sin(chase.heading)*rearLook,y:chase.ground+.55+chase.ride*.61+clamp(behind-ground,-3,3)*.72,z:r.z-Math.cos(chase.heading)*rearLook};
  back.y=mix(back.y,towFocus,chase.recovery);cameraClearance(front,r,dt,true);camera=lookAt(front,back,chaseFov((59+4*chase.recovery)*Math.PI/180+.72*lensKick));return camera;
 }
 cameraClearance(eye,r,dt,false);camera=lookAt(eye,target,chaseFov(chase.fov+lensKick));
 if(sideShot){
  // Aim just to the right of the real kart so it stays visible beside the
  // classification. Keep the collision-tested camera origin on the circuit.
  const frame=renderer.cssSize(),aspect=frame.width/Math.max(1,frame.height);
  const driverYaw=Math.atan2(r.x-eye.x,r.z-eye.z);
  camera.yaw=driverYaw+Math.atan(.45*Math.tan(camera.fov*.5)*aspect/Math.max(.75,Math.cos(camera.pitch)));
 }
 return camera;
}
function workshopCamera(a){
 const frame=renderer.cssSize(),aspect=clamp(frame.width/Math.max(1,frame.height),.5,3);
 const kart=localBox(vehicleMesh(cfg,0,false)),wing=garageWing?localBox(wingMesh(cfg)):kart;
 const x0=Math.min(kart.x-kart.hx,wing.x-wing.hx),x1=Math.max(kart.x+kart.hx,wing.x+wing.hx);
 const y0=Math.min(kart.y-kart.hy,wing.y-wing.hy)+.055,y1=Math.max(kart.y+kart.hy,wing.y+wing.hy)+.055;
 const z0=Math.min(kart.z-kart.hz,wing.z-wing.hz),z1=Math.max(kart.z+kart.hz,wing.z+wing.hz);
 const cx=(x1+x0)*.5,cy=(y1+y0)*.5,cz=(z1+z0)*.5,s=Math.sin(a),c=Math.cos(a);
 const tilt=.18,up=Math.sin(tilt),level=Math.cos(tilt),fov=40,tan=Math.tan(fov*Math.PI/360);
 // All four wings, wide tyres and tall drivers fit the actual display rectangle.
 let distance=0;
 for(let i=0;i<8;i++){
  const x=((i&1)?x1:x0)-cx,y=((i&2)?y1:y0)-cy,z=((i&4)?z1:z0)-cz;
  const forward=x*s+z*c,depth=forward*level+y*up;
  distance=Math.max(distance,depth+Math.abs(x*c-z*s)/(tan*aspect*.92),depth+Math.abs(y*level-forward*up)/(tan*.84));
 }
 return lookAt({x:cx+distance*level*s,y:cy+distance*up,z:cz+distance*level*c},{x:cx,y:cy,z:cz},fov);
}
// The entry poster is a portrait of the registered kart. The live race grid
// stays in simulation space and appears when the starting lights come on.
const cupPoster={track:null,road:null,origin:null};
function entryPose(){
 if(cupPoster.track!==track){
  const road=track.at(-18.8,1.25);road.l=1.25;road.w=track.width(-18.8);
  cupPoster.track=track;cupPoster.road=road;
  cupPoster.origin={x:road.x,y:road.y+track.lift(road)+.12,z:road.z};
 }
 return cupPoster;
}
function entryCamera(){
 const {road,origin}=entryPose(),box=localBox(vehicleMesh(cfg,0,track.antiGravity(road.f)));
 const css=renderer.cssSize(),asp=clamp(css.width/Math.max(1,css.height),.42,3),wide=clamp((asp-.72)/.68,0,1);
 const yaw=road.yaw-2.33+.035*Math.sin(ambientT*.20),b=road.yaw+.35+.055*Math.sin(ambientT*.17);
 const pitch=-.145,tan=Math.tan(42*Math.PI/360),hx=tan*asp,hy=tan;
 const sn=Math.sin(b),cs=Math.cos(b),sp=Math.sin(pitch),cp=Math.cos(pitch);
 // Normalised device coordinates; leave the lower-left text and footer clear.
 const cx=.32*wide,cy=.12,halfW=mix(.84,.46,wide),halfH=mix(.41,.57,wide);
 const rel=yaw-b,cr=Math.cos(rel),sr=Math.sin(rel);
 let d=3;
 for(let i=0;i<8;i++){
  const x=(i&1?1:-1)*box.hx,y=(i&2?1:-1)*box.hy,z=(i&4?1:-1)*box.hz;
  const u=x*cr+z*sr,along=-x*sr+z*cr,v=cp*y-sp*along,w=cp*along+sp*y;
  d=Math.max(d,(u-(cx+halfW)*hx*w)/(halfW*hx),(-u+(cx-halfW)*hx*w)/(halfW*hx),
   (v-(cy+halfH)*hy*w)/(halfH*hy),(-v+(cy-halfH)*hy*w)/(halfH*hy));
 }
 d*=1.04;
 const center={x:origin.x+box.x*Math.cos(yaw)+box.z*Math.sin(yaw),y:origin.y+box.y,z:origin.z-box.x*Math.sin(yaw)+box.z*Math.cos(yaw)};
 const side=cx*hx*d,up=cy*hy*d,along=cp*d-sp*up;
 const eye={x:center.x-sn*along-cs*side,y:center.y-sp*d-cp*up,z:center.z-cs*along+sn*side};
 return {...eye,yaw:b,pitch,fov:42*Math.PI/180};
}
function composeCamera(dt,context){
 if(context==='menu'&&mode==='gp'&&visScreen()==='menu'){lastCamType='cup'+course;camera=entryCamera();return camera}
 const key=context+course;let target;
 if(context==='garage'){
  if(byId('upper').dataset?.single==='true')target=workshopCamera(garageAngle);
  else{
   if(ambientT-garageTouched>1.8)garageAngle+=dt*.20;
   const a=garageAngle,d=garageWing?6.55:5.3,y=garageWing?2.45:1.77;
   target=lookAt({x:d*Math.sin(a),y:y+.14*Math.cos(a*.75),z:d*Math.cos(a)},{x:0,y:garageWing?1.58:.98,z:0},41.5);
  }
 }
 else if(context==='menu'){
 let q=track.at(-18.8,1.25),b=q.yaw+.04*Math.sin(ambientT*.18),right=[Math.cos(b),-Math.sin(b)],forward=[Math.sin(b),Math.cos(b)];
 let d=6.1,hx=q.x-right[0]*2.25-forward[0]*d,hz=q.z-right[1]*2.25-forward[1]*d;
 target=lookAt({x:hx,y:q.y+2.04,z:hz},{x:q.x+forward[0]*2.6-right[0]*.65,y:q.y+1.64,z:q.z+forward[1]*2.6-right[1]*.65},52)}
 else return chaseCamera(visualRacer(me),dt,context);
 if(!camera||lastCamType!==key||Math.hypot(camera.x-target.x,camera.z-target.z)>17){camera=target;lastCamType=key;return camera}
 const f=1-Math.exp(-dt*(context==='garage'?17:32)),b=1-Math.exp(-dt*10.7);for(let k of ['x','y','z'])camera[k]=mix(camera[k],target[k],f);camera.yaw+=angle(target.yaw-camera.yaw)*(context==='race'?1-Math.exp(-dt*15):b);camera.pitch=mix(camera.pitch,target.pitch,b);camera.fov=mix(camera.fov,target.fov,b);return camera;
}
function gridTireLoad(r){
 if(screen==='countdown')return r===me?GridCharge.level:clamp((2.7-count)/1.62,0,r.launchLoad||0);
 if(screen!=='race')return 0;
 const age=clock-(r===me?0:r.delay);
 return age>=0&&age<.22?(r===me?rocketStart:r.launchLoad||0)*(1-age/.22):0;
}
// Visual response only. The two render passes read the same eased sample,
// including when interpolation has advanced beyond the last physics tick.
function riderTurnLean(r,v,t){
 if(r.leanTime===t)return r.turnLean;
 const dt=r.leanTime===undefined||t<r.leanTime?0:Math.min(.10,t-r.leanTime);
 if(!dt)r.turnLean=0;
 r.leanTime=t;
 const drift=clamp(r.driftBlend||0,0,1),pace=clamp(r.u/13,0,1);
 const rack=clamp(v.delta/(r.t.steer||.52),-1,1),yaw=clamp(r.yawRate/1.48,-1,1);
 // Rack and yaw drive the ordinary lean. A sustained slide follows its own
 // direction even while the front wheels countersteer.
 const turn=.47*rack+.53*yaw,slide=r.driftDir||Math.sign(turn);
 const corner=turn*(.135+.077*pace);
 const driftLean=slide*(.255+.065*pace)*(.97+.03*turn*slide);
 const target=r.spin>0||r.rescue>0||r.falling?0:-2*mix(corner,driftLean,drift)*(r.grounded?1:.45)*pace;
 const returning=Math.abs(target)<Math.abs(r.turnLean);
 r.turnLean+=(target-r.turnLean)*(1-Math.exp(-dt*(returning?9.8:10.6)));
 return r.turnLean;
}
// One continuous colour for the body, perched driver, articulated wheels and wing.
const invincibleColours=[0xffc943,0x68f1a7,0x55cbff,0xa090ff,0xff83bd,0xff945c];
function invincibleTint(remaining,time,id,since=-Infinity){
 if(!(remaining>0))return 0;
 const p=mod(time*.47+(id||0)*.083,1)*6,i=p|0,f=p-i,t=f*f*(3-2*f);
 const a=invincibleColours[i],b=invincibleColours[(i+1)%6];
 const red=Math.round(mix(a>>16,b>>16,t)),green=Math.round(mix(a>>8&255,b>>8&255,t)),blue=Math.round(mix(a&255,b&255,t));
 const fade=clamp(remaining/.42,0,1)*clamp(.55+(time-since)*4,0,1);
 return ((Math.round(232*fade)<<24)|(red<<16)|(green<<8)|blue)>>>0;
}
// Chassis and shadow use the same visual turn while the open canopy stays
// on its actual collision-tested trajectory. A low ceiling gets a rider pose.
function airborneTrickPhase(r,v){
 if(r.wingLaunchTrick)return (1-v.trickSpin/.43)*TAU;
 const u=clamp(1-v.trickSpin/sailTrickTime,0,1);
 return u*u*(3-2*u)*TAU;
}
function drawVehicle(r,menuHero=false,caster=null){
 const v=menuHero?r:visualRacer(r);let x=v.x,y=v.y,z=v.z,yaw=v.hd,roll=v.roll,pitch=v.pitch,mesh;
 if(menuHero){const {road:p,origin}=entryPose();x=origin.x;y=origin.y;z=origin.z;yaw=p.yaw-2.33+.035*Math.sin(ambientT*.20);roll=p.bank*Math.cos(yaw-p.yaw);pitch=p.bank*Math.sin(yaw-p.yaw)}
 const burnout=!menuHero?gridTireLoad(r):0;
 if(burnout){
  const phase=r===me?GridCharge.spinDistance+Math.min(.22,clock)*18:(3.45-Math.max(count,0)+Math.min(.22,clock))*7+r.aiSeed,base=yaw;
  yaw+=Math.sin(phase*.59)*.080*burnout;
  // Keep the front axle planted while the rear tires walk across the grid.
  x+=.76*(Math.sin(base)-Math.sin(yaw));z+=.76*(Math.cos(base)-Math.cos(yaw));
  y+=burnout*(.004+.004*Math.sin(phase*3.4));
  roll+=burnout*(.013*Math.sin(phase*1.9)+.004*Math.sin(phase*3.8));
  pitch+=burnout*(.005+.003*Math.sin(phase*2.7));
 }
 const dist=Math.hypot(renderer.cam.x-x,renderer.cam.z-z);
 const focal=renderer.f*renderer.renderHeight*.5;
 if(caster?dist>90&&!caster.sampleFar:dist>232||!renderer.vis(x,y,z,4))return;
 const p=menuHero?entryPose().road:v.road;
 if(!caster&&!(r.star>0)&&r.inv>0&&r.rescue<=0&&sceneTime-(r.impactAt??-Infinity)>.85&&sceneTime-(r.strikeAt??-Infinity)>1.05&&Math.floor(worldT*11)%3===0&&r!==me)return;

 const nearBand=clamp(focal*.067,10,34);
 const lod=r===me?0:dist>nearBand*(r.displayLevel===2?.86:1.03)?2:1;
 const anti=track.antiGravity(p.f);
 if(!r.displayMesh||r.displayLevel!==lod||r.displayAnti!==anti){r.displayMesh=vehicleMesh(r.cfg,lod,anti);r.displayLevel=lod;r.displayAnti=anti}
 mesh=r.displayMesh;const size=menuHero?1:lightningScale(r);
 const running=!menuHero&&screen==='race';let lean=running?riderTurnLean(r,v,sceneTime):0;
 const sailTrick=r.trickSpin>0&&!r.wingLaunchTrick;
 const wingYaw=yaw,wingRoll=roll,wingPitch=pitch;
 if(r.trickSpin>0){
  const phase=airborneTrickPhase(r,v),dir=r.trickSide||(r.driftDir||(r.steer<0?-1:1));
  if(r.wingLaunchTrick)roll+=dir*phase;
  else if(r.trickTight)lean=clamp(lean+dir*.60*Math.sin(phase),-.64,.64);
  else {yaw+=dir*phase;roll+=dir*.16*Math.sin(phase);pitch+=.09*Math.sin(phase*.5)}
 }
 const proxy=mesh.farDetail,distant=r!==me&&proxy&&proxy.error*size*focal<(r.distantShape?.96:.76)*Math.max(1,dist-2);
 // Spend the second draw only while the helmet displacement is visible.
 const showLean=running&&!distant&&(r===me||Math.abs(lean)*size*focal>dist);

 if(r.spin>0){
  const phase=1-clamp(v.spin/(r.spinLength||.88),0,1),kick=Math.sin(Math.PI*phase);
  yaw+=(.5-.5*Math.cos(phase*Math.PI))*TAU;
  y+=kick*(r.impactKind==='bomb'||r.impactKind==='spiny'?.83:r.impactKind==='banana'?.10:.28);roll+=kick*.20;
 }
 if(caster){
  const sink=r===me&&caster.focusCaster?caster.focusCaster:caster.forObject?caster.forObject(r,3):caster;
  if(showLean)drawSeatedKart(sink,rubyDriveRig(r.cfg,anti,mesh),x,y,z,yaw,size,roll,pitch,lean);
  else sink.draw(mesh,x,y,z,yaw,size,roll,pitch);
  if(!menuHero&&r.wingOpen>0&&!r.rescue&&!r.done)drawRubyWing(sink,wingMesh(r.cfg),mesh,x,y,z,sailTrick?wingYaw:yaw,sailTrick?wingRoll:roll,sailTrick?wingPitch:pitch,r.wingOpen,size);
  return;
 }
 if(!menuHero&&r.impactAt!=null&&sceneTime-r.impactAt<.72&&dist<45){
  const t=clamp((sceneTime-r.impactAt)/.72,0,1);
  for(let j=0;j<r.impactLost;j++){
   const side=j?1:-1,a=yaw+side*1.17,dist=.5+2.2*t;
   renderer.draw(propMesh('coin'),x+dist*Math.sin(a),y+.35+4*t*(1-t),z+dist*Math.cos(a),a+t*8,.58*(1-.59*t));
  }
 }
 if(!menuHero&&(sceneTime-(r.strikeAt??-Infinity)<1.05||sceneTime-(r.impactAt??-Infinity)<.85)){
  const p=r.hitPose||(r.hitPose={});p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.scale=size;p.frame=poseFrame;
 }
 if(!menuHero&&(visScreen()==='race'&&(r===me||r.fxPick===poseFrame)||screen==='countdown'&&burnout>0)){
  const socket=r.socketBuffer=rubyKartSockets(mesh,x,y,z,yaw,roll,pitch,r.socketBuffer,size);
  for(const w of socket.wheels){
   if(screen==='countdown'){
    const dx=w.x-v.x,dz=w.z-v.z;
    w.roadY=v.groundY+(dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))*Math.tan(p.bank);
    w.bank=p.bank;w.valid=true;w.surface=track.d.id;
   }else{
    const q=track.locate(w.x,w.z,v.s);w.roadY=q.y+track.lift(q)+(track.d.impactLift?track.d.impactLift(q.f,sceneTime):0);w.bank=q.bank;w.valid=!track.gap(q);
    w.surface=(track.d.surfaces||[]).some(zone=>q.f>=zone.f0&&q.f<=zone.f1)?'ice':track.d.id;
   }
  }
  r.fxStamp=poseFrame;r.fxYaw=yaw;
 }
 renderer.starTint=!menuHero&&r.star>0?invincibleTint(r.star,sceneTime,r.id,r.starGlowSince):0;
 if(r===me&&!menuHero){const rig=rubyDriveRig(r.cfg,anti,mesh);drawRubyRig(renderer,rig,x,y,z,yaw,roll,pitch,v.odo,v.delta,size,GridCharge.spinDistance,lean)}
 else{
  r.distantShape=!!distant;
  if(showLean)drawSeatedKart(renderer,rubyDriveRig(r.cfg,anti,mesh),x,y,z,yaw,size,roll,pitch,lean);
  else renderer.draw(distant?proxy:mesh,x,y,z,yaw,size,roll,pitch);
 }
 if(!menuHero&&r.wingOpen>0&&!r.rescue&&!r.done&&(r===me||dist<64)){
  drawRubyWing(renderer,wingMesh(r.cfg),mesh,x,y,z,sailTrick?wingYaw:yaw,sailTrick?wingRoll:roll,sailTrick?wingPitch:pitch,r.wingOpen,size);
 }
 renderer.starTint=0;
}
const fxNearby=[];
function chooseEmitters(){
 fxNearby.length=0;let first=null,second=null,one=25*25,two=one;
 for(let i=1;i<cars.length;i++){const r=cars[i],dx=r.x-me.x,dz=r.z-me.z,d=dx*dx+dz*dz;
  if(d<one){second=first;two=one;first=r;one=d}else if(d<two){second=r;two=d}
 }
 if(first){first.fxPick=poseFrame;fxNearby.push(first)}if(second){second.fxPick=poseFrame;fxNearby.push(second)}
}
function vehicleFX(r,v,ctx){
 const road=r.road,f=road.f;
 const surface=(track.d.surfaces||[]).some(g=>f>=g.f0&&f<=g.f1)?'ice':track.d.id;
 return {raceKey:cars,id:r.id,theme:renderer.theme,screen:ctx,gridLoad:ctx==='countdown'?gridTireLoad(r):0,gridTime:3.45-count,speed:v.u*3.6,slip:v.slip,steer:v.steer,driftBlend:v.driftBlend,
  boostStrength:v.boostStrength,mushroom:r.boost>0&&clock-(r.lastMushroom??-10)<1.8,grounded:r.grounded,surface,gradePitch:v.pitch,wet:track.d.id==='harbor'&&f>.61&&f<.81,brake:r===me?inputs.brake:0,boost:r.boost>0,driftLevel:chargeLevel(r),
  charging:!!r.drift,air:r.air>.32,hit:r.flash,rescue:r.rescue>0,finishAge,
  star:r.star>0,starLight:r.star>0?invincibleTint(r.star,sceneTime,r.id,r.starGlowSince):0,car:{x:v.x,y:v.y,z:v.z,yaw:r.fxStamp===poseFrame?r.fxYaw:v.hd,groundY:v.groundY,bank:road.bank},
  sockets:r.fxStamp===poseFrame?r.socketBuffer:null,finish:ctx==='finish',spin:r.spin};
}
function drawPickups(t,caster){
 for(let type=0;type<2;type++){
  const items=type?boxes:courseCoins;let mesh=null;
  for(const obj of items){
   if(obj.cool>0)continue;let p=obj.drawPoint;
   if(!p||obj.moving&&obj.drawTime!==t){
    const pos=obj.moving?boxStation(obj,t):obj.s;
    p=track.at(pos,obj.l,p);p.w=track.width(pos);p.l=obj.l;p.hole=track.gap(p);
    obj.drawPoint=p;obj.drawTime=t;
   }
   const dx=p.x-renderer.cam.x,dz=p.z-renderer.cam.z;
   if(p.hole||dx*dx+dz*dz>185*185||!renderer.vis(p.x,p.y+1,p.z,2.2))continue;
   // A slight turn about the road's heading keeps the same readable face
   // on approach. Bobbing uses a fixed seed, independent of station updates.
   const phase=type?obj.f*17+obj.l*.42:obj.s;
   const y=p.y+(type?1.23:.96)+Math.sin(t*(type?1.65:1.85)+phase)*(type?.065:.055);
   const yaw=type?p.yaw+.42+.22*Math.sin(t*1.05+phase):Math.atan2(dx,dz)+.42*Math.sin(t*1.7+phase);
   if(!mesh){mesh=propMesh(type?'box':'coin');if(!caster)renderer.beginCopies(mesh)}
   if(caster)caster.forObject(obj,0).draw(mesh,p.x,y,p.z,yaw,1,type?.14:0,type?.12:0);
   else renderer.drawCopy(p.x,y,p.z,yaw,type?.14:0,type?.12:0);
  }
  if(mesh&&!caster)renderer.flushCopies();
 }
}
function drawWorld(context){
 const t=(context==='menu'?ambientT:sceneTime);
 const menu=context==='menu',solo=menu&&mode==='gp'&&visScreen()==='menu';
 const count=solo?1:menu?Math.min(5,cars.length):cars.length;
 const caster=WorldShadows.begin(renderer,track,context,t,menu?entryPose().origin:me);
 if(caster){
  if(menu){for(let i=1;i<count;i++)drawVehicle(cars[i],false,caster);drawVehicle(me,true,caster)}
  else for(const r of cars)drawVehicle(r,false,caster);
  if(caster.forObject){drawPickups(t,caster);if(context==='race'||context==='finish')drawRaceItems(t,caster)}
  if(context==='race')RubyRescue.drawRace(caster);
 }
 WorldShadows.sync(renderer);
 renderer.drawScenery(track.props,t);
 drawPickups(t,null);
 if(context==='race'||context==='finish')drawRaceItems(t);
 if(menu){
  for(let i=1;i<count;i++)drawVehicle(cars[i]);drawVehicle(me,true)
 }else{
  if(mode==='tt'&&ghostData){
   const g=echoAt(echoTime);if(g&&renderer.vis(g.x,g.y,g.z,4)){
    const mesh=echoMesh(ghostData.cfg,track.antiGravity(mod(g.s,track.L)/track.L));renderer.draw(mesh,g.x,g.y,g.z,g.yaw,1,g.roll,g.pitch);
    if(g.wingOpen>.012){
     if(!mesh.ghostWing)mesh.ghostWing=ghostTint(rubyWing(ghostData.cfg));
     drawRubyWing(renderer,mesh.ghostWing,mesh,g.x,g.y,g.z,g.yaw,g.roll,g.pitch,g.wingOpen);
    }
   }
  }
  if(context==='race')RubyRescue.drawRace(renderer);
  for(let i=cars.length-1;i>=0;i--)drawVehicle(cars[i])
 }
}
let launchPresented=false,pendingDrawTime=0,showFPS=readSave('fpsDisplay',false)===true;
// Measure the actual cost of a completed scene, including worker turnaround.
// Only the 3D backing store changes size. The touch surface and HUD stay native.
const displayModes=['auto','fast','sharp'],displayLabels={auto:'自动',fast:'流畅',sharp:'原画'};
let displayMode=readSave('displayMode','auto');if(!displayModes.includes(displayMode))displayMode='auto';
// Software can spend measured spare time on finer track edges on a wide LCD.
// The starting scale stays at 1; framePolicy promotes only after five quiet windows.
const sampleScale=renderer.g?[.62,.73,.85,1,1.16]:[.78,.89,1,1.16,1.33,1.50];
const previewCaps=[400,500,625,720,850];let previewLevel=0;
function detailedPreview(context){return context==='garage'||context==='menu'&&(mode==='gp'||renderer.cssSize().width>=600)}
const frameWindow={key:'',time:0,count:0,fps:0,last:0,level:displayMode==='fast'?0:renderer.g?3:2,slow:0,fast:0,limit:0,hold:0,
 work:new Float32Array(192),gap:new Float32Array(192)};
renderer.fastDisplay=displayMode==='fast';renderer.extraDetail=displayMode==='sharp'?1:sampleScale[frameWindow.level];
function cycleDisplayMode(){
 displayMode=displayModes[(displayModes.indexOf(displayMode)+1)%displayModes.length];writeSave('displayMode',displayMode);
 const w=frameWindow;w.level=displayMode==='fast'?0:renderer.g?3:2;w.hold=w.slow=w.fast=w.limit=0;
 w.key='';renderer.fastDisplay=displayMode==='fast';renderer.extraDetail=displayMode==='sharp'?1:sampleScale[w.level];
}
function framePolicy(w,rate,work,p90,elapsed){
 const period=1000/rate,ratio=w.fps/rate;
 const pressure=work>period*.97||ratio<.86&&p90>period*1.38;
 w.slow=pressure?w.slow+1:0;w.fast=!pressure&&ratio>.94&&work<period*.62?w.fast+1:0;
 w.hold=Math.max(0,w.hold-elapsed);
 // A browser without a worker can still exceed 30 FPS on a small canvas.
 // Also unlock native 90/100 Hz when a worker has measured headroom.
 const panel=typeof panelHz==='number'?panelHz:60;
 const mainOnly=!renderer.g&&!(renderer.cpu instanceof WorkerRaster);
 const canRaise=mainOnly||!renderer.g&&panel>75&&panel<=100;
 const upper=mainOnly?Math.min(panel,72):panel;
 if(canRaise){
  const spare=work<1000/upper*.69&&ratio>.9;
  w.room=spare?(w.room||0)+1:0;
  if(!w.unlocked&&w.room>=4&&!w.hold){w.unlocked=true;w.hold=3200;w.room=0}
  else if(w.unlocked&&w.slow>=2&&work>1000/upper*1.22&&ratio<.8&&!w.hold){w.unlocked=false;w.hold=4500;w.room=0}
 }
 const low=0,high=displayMode==='fast'?1:sampleScale.length-1;
 if(w.hold>0)return;
 if(w.slow>=2){
  if(displayMode!=='sharp'&&w.level>low){w.level--;w.hold=1350}
  else if(work>period*1.45&&ratio<.78){
   const panel=typeof panelHz==='number'?panelHz:60,divisor=Math.round(panel/rate);
   if(panel/(divisor+1)>=29){w.limit=panel/(divisor+1);w.hold=2500}
  }
  w.slow=w.fast=0;
 }else if(w.fast>=5){
  if(w.limit){w.limit=0;w.hold=4000}
  else if(displayMode!=='sharp'&&w.level<high){w.level++;w.hold=5200}
  w.fast=0;
 }
}
function recordPresentedFrame(context,began,renderedAt){
 const now=performance.now(),w=frameWindow,key=renderer.theme+'/'+(screen==='pause'||screen==='help'?screen:context);
 if(w.key!==key||!w.time){w.key=key;w.time=now;w.count=0;w.last=now;w.fast=w.slow=0}
 const index=w.count++%w.work.length;
 const ready=renderedAt??now,paint=Math.max(0,now-ready);
 // Worker completion can wait for v-sync. Count actual composition separately.
 const overlayCost=renderer.lastOverlayCost||0;
 w.work[index]=Math.max(0,ready-began)+(renderedAt===undefined?0:Math.min(paint,overlayCost));
 if(renderer.gpuCost>0)w.work[index]=Math.max(w.work[index],renderer.gpuCost);
 w.gap[index]=Math.min(250,now-w.last);w.last=now;
 const calibrating=context==='countdown'&&screen==='countdown';
 const span=now-w.time;if(span<(calibrating?600:1050))return;
 w.fps=Math.round(w.count*1000/span);
 const count=Math.min(w.count,w.work.length),busy=w.work.subarray(0,count),gaps=w.gap.subarray(0,count);busy.sort();gaps.sort();
 if(!renderer.g&&displayMode==='auto'&&screen===context&&detailedPreview(context)){
  const cost=busy[(count-1)*.85|0];
  if(cost>27||w.fps<22)previewLevel=Math.max(0,previewLevel-1);
  else if(cost<16&&w.fps>=25)previewLevel=Math.min(previewCaps.length-1,previewLevel+1);
 }
 if(calibrating&&displayMode!=='sharp'){
  const hz=typeof lastRate==='number'&&lastRate?lastRate:60;
  // The complete starting grid is already visible during the lights. Calibrate
  // under its real load so buffer reallocations usually finish before GO.
  const stressed=busy[(count-1)*.8|0]>1000/hz*1.04&&w.fps<hz*.90;
  if(stressed&&w.level>0){w.level--;renderer.extraDetail=sampleScale[w.level];w.hold=1400}
 }
 if(context==='race'&&screen==='race'){
  if(showFPS){
   const backend=renderer.g?'图形处理器':renderer.cpu instanceof WorkerRaster?'后台软件渲染':'软件渲染';
   w.lastRaceReport=backend+' · '+w.fps+' FPS · P95 '+gaps[(count-1)*.95|0].toFixed(1)+' ms · '+renderer.cv.width+'×'+renderer.cv.height;
  }
  const hz=typeof lastRate==='number'&&lastRate?lastRate:60;
  framePolicy(w,hz,busy[(count-1)*.8|0],gaps[(count-1)*.9|0],span);
  renderer.extraDetail=displayMode==='sharp'?1:sampleScale[w.level];
 }
 if(showFPS)byId('fpsMeter').textContent=(renderer.g?'GPU':'CPU')+' · '+w.fps+' FPS';
 w.count=0;w.time=now;
}

function render(dt){
 if(renderer.cpu?.busy){pendingDrawTime+=dt;return}
 dt=Math.min(.18,dt+pendingDrawTime);pendingDrawTime=0;
 const began=performance.now();let ctx=visScreen();if(ctx==='countdown'&&gridStarting())ctx='menu';const rearBadge=byId('rearBadge');
 if(rearBadge)rearBadge.hidden=!(ctx==='race'&&rearRequested);setViewTime(ctx);
 const preview=detailedPreview(ctx)&&visScreen()===ctx;
 renderer.lcdScale=typeof ModelCabinet!=='undefined'?ModelCabinet.layoutScale||1:1;
 renderer.highResolution=displayMode==='sharp';
 const wideLCD=renderer.cssSize().width>=600;
 renderer.pixelCap=renderer.highResolution?(wideLCD?960:720):displayMode==='auto'&&preview?Math.min(wideLCD?850:720,previewCaps[previewLevel]):400;
 const roadF=ctx==='menu'?entryPose().road.f:me.road.f,id=ctx==='garage'?'garage':track.d.id;
 renderer.theme=ctx==='garage'?'garage':(track.d.environment?.(roadF)||id);
 renderer.begin(composeCamera(dt,ctx),sectionLight(id,roadF,ctx==='menu'?ambientT:sceneTime,renderer.sectionLight));
 if(ctx==='garage'){
  const model=vehicleMesh(cfg,0,false),caster=WorldShadows.begin(renderer,track,ctx,ambientT,me,model,garageWing);
  if(caster){caster.draw(model,0,.055,0);if(garageWing)caster.draw(wingMesh(cfg),0,.055,0)}
  WorldShadows.sync(renderer);
  renderer.draw(plinth,0,0,0);renderer.draw(model,0,.055,0);if(garageWing)renderer.draw(wingMesh(cfg),0,.055,0);
 }else{if(ctx==='race')chooseEmitters();drawWorld(ctx)}
 const skyTime=ctx==='menu'||ctx==='garage'?ambientT:sceneTime,effectsTime=ctx==='finish'?ambientT:sceneTime;
 const fx=vehicleFX(me,visualRacer(me),ctx);
 if(ctx==='race'||ctx==='countdown'){
  const field=ctx==='race'?fxNearby:cars;fx.rivals=[];
  for(const r of field)if(r!==me&&r.fxStamp===poseFrame)fx.rivals.push(vehicleFX(r,visualRacer(r),ctx));
 }
 roadEffectsWorld(renderer,fx,sceneTime);
 const worker=renderer.cpu instanceof WorkerRaster;
 // A completed worker bitmap can await v-sync while the next camera is in flight.
 const view=worker?Object.assign(Object.create(renderer),{cam:{...renderer.cam},s:renderer.s,c:renderer.c,sp:renderer.sp,cp:renderer.cp,f:renderer.f,asp:renderer.asp,theme:renderer.theme}):renderer;
 function layers(renderedAt){const started=performance.now();raceSky(skyLayer,view,fx.theme,skyTime);raceFX(fxLayer,view,fx,effectsTime);renderer.lastOverlayCost=performance.now()-started;recordPresentedFrame(ctx,began,renderedAt);
  if(!launchPresented&&renderer.renderWidth>1&&renderer.renderHeight>1){launchPresented=true;if(typeof RubyLaunch!=='undefined')RubyLaunch.presented()}
 }
 if(worker){const ownerTrack=track,ownerContext=visScreen(),ownerCars=cars;renderer.cpu.valid=()=>track===ownerTrack&&visScreen()===ownerContext&&cars===ownerCars;renderer.cpu.onpresent=layers;renderer.end()}else{renderer.end();layers()}
}
function paintMini(){
 if(DeviceShell.mapHidden)return;
 const b=miniSize(),r=Math.min(2,(devicePixelRatio||1)*(renderer.lcdScale||1)),w=Math.round(b.width*r),h=Math.round(b.height*r);if(w<2||h<2)return;if(mini.width!==w||mini.height!==h){mini.width=w;mini.height=h}
 const mKey=[course,w,h].join('/');if(miniKey!==mKey){
 miniKey=mKey;let can=document.createElement('canvas');can.width=w;can.height=h;const c=can.getContext('2d'),night=course===1;
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,night?'#212745':'#eedcc6');g.addColorStop(1,night?'#334451':'#c6d8bc');c.fillStyle=g;c.fillRect(0,0,w,h);
 c.strokeStyle=night?'#ccd3ff14':'#8166691c';c.lineWidth=.65*r;for(let i=0;i<w;i+=10*r){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke()}for(let i=0;i<h;i+=10*r){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke()}
 const a=course===0?.96:0,ca=Math.cos(a),sa=Math.sin(a),rot=(x,z)=>[x*ca+z*sa,x*sa-z*ca];
 const mapped=track.d.stages?track.pts.slice(0,Math.floor(track.finishFraction*track.n)+1):track.pts;
 let pts=mapped.map(p=>rot(p.x,p.z)),xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
 const sc=Math.min((w*.82)/(hiX-loX+track.d.half),(h*.73)/(hiY-loY+track.d.half)),ox=w*.50-(hiX+loX)*.5*sc,oy=h*.54-(hiY+loY)*.5*sc;
 mapProj=(x,z)=>{let q=rot(x,z);return [ox+q[0]*sc,oy+q[1]*sc]};
 c.lineJoin=c.lineCap='round';const route=()=>{c.beginPath();for(let i=0;i<mapped.length;i+=3){let q=mapProj(mapped[i].x,mapped[i].z);if(!i)c.moveTo(...q);else c.lineTo(...q)}if(track.d.stages){const p=track.at(track.finishFraction*track.L);c.lineTo(...mapProj(p.x,p.z))}else c.closePath()};
 route();const wide=Math.max(night?3*r:4*r,track.d.half*2*sc);
 for(const [add,col] of [[4.4,night?'#191e33':'#788779'],[2.2,night?'#b0afd8':'#fcf1d8'],[0,night?'#b0b3ff':tourCards[course].color]]){c.lineWidth=wide+add*r;c.strokeStyle=col;c.stroke()}
 if(night){let palette=['#ff738e','#ffbc7c','#ffea82','#a1e3aa','#6edce3','#81bafd','#a397f6','#eaa7ff'];for(let j=0;j<track.pts.length;j+=17){c.beginPath();for(let k=0;k<=17;k+=2){let p=track.pts[(j+k)%track.n],q=mapProj(p.x,p.z);if(k)c.lineTo(...q);else c.moveTo(...q)}c.lineWidth=wide;c.strokeStyle=palette[(j/17|0)%8];c.stroke()}}
 for(const pad of track.d.pads||[]){const pt=track.at(pad.f*track.L,pad.l),[x,y]=mapProj(pt.x,pt.z);c.fillStyle='#ffe169';c.strokeStyle='#764623';c.lineWidth=r*.8;c.beginPath();c.arc(x,y,2*r,0,TAU);c.fill();c.stroke()}
 // Draw ramp lanes once on the map plate, above boost pads and below racers.
 for(const ramp of track.d.ramps||[]){
  const pt=track.at(ramp.f*track.L,(ramp.l0+ramp.l1)*.5),[x,y]=mapProj(pt.x,pt.z);
  c.beginPath();c.moveTo(x-4.6*r,y+1.1*r);c.lineTo(x,y-2.1*r);c.lineTo(x+4.6*r,y+1.1*r);
  c.lineTo(x+1.45*r,y+.55*r);c.lineTo(x,y+2.5*r);c.lineTo(x-1.45*r,y+.55*r);c.closePath();
  c.fillStyle='#76f1e8';c.strokeStyle='#204d57';c.lineWidth=.95*r;c.fill();c.stroke();
 }
 let start=mapProj(track.pts[0].x,track.pts[0].z);for(let j=0;j<2;j++)for(let i=0;i<3;i++){c.fillStyle=(i+j)%2?'#212634':'#fff9e4';c.fillRect(start[0]+(i-1.5)*2.4*r,start[1]+(j-1)*2.4*r,2.4*r,2.4*r)}
 if(track.d.stages)track.d.stages.forEach((f,i)=>{
  const p=track.at(f*track.L),[x,y]=mapProj(p.x,p.z);c.fillStyle=i===2?'#bb2743':'#236c94';
  c.beginPath();c.arc(x,y,2.65*r,0,TAU);c.fill();c.strokeStyle='#fff6db';c.lineWidth=r;c.stroke();
 });
 mapPlate=can;
 }
 mapCtx.drawImage(mapPlate,0,0);const menu=screen==='menu';let arr=menu?[me]:[...cars.slice(1),me];for(let car of arr){let p=menu?track.at(-2,0):car,[x,y]=mapProj(p.x,p.z),mine=car===me;mapCtx.beginPath();mapCtx.arc(x,y,(mine?4:2.5)*r,0,TAU);mapCtx.fillStyle=mine?'#d62b44':liveries[car.id];mapCtx.strokeStyle=mine?'#fff7d3':'#293449';mapCtx.lineWidth=(mine?1.75:.65)*r;mapCtx.fill();mapCtx.stroke();if(mine){mapCtx.beginPath();mapCtx.arc(x,y,1.35*r,0,TAU);mapCtx.fillStyle='#fff8d9';mapCtx.fill()}}
 if(mode==='tt'&&ghostData&&!menu){let g=echoAt(clock);if(g){let q=mapProj(g.x,g.z);mapCtx.strokeStyle='#a6ffff';mapCtx.lineWidth=1.5*r;mapCtx.strokeRect(q[0]-3*r,q[1]-3*r,6*r,6*r)}}
}
