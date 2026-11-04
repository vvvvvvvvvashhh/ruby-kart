const G=9.81,STEP=1/90;
const drivers=['马里奥','路易吉','碧姬','奇诺比奥','耀西','酷霸王','森喜刚','慢慢龟','金属马里奥','玫瑰金碧姬','红耀西','蓝奇诺比奥'];
const liveries=['#f34a44','#41b05b','#ff81b7','#458dde','#91d344','#dd9444','#b16c45','#ffd55b','#b9e3e7','#dd9b9d','#cf3f4c','#437be1'];
function vehicle(cfg,s,l){
 const p=track.at(s,l),t=tune(cfg),road=track.locate(p.x,p.z,s);
 const floor=track.surfaceAt?track.surface(road):undefined;
 p.y=floor??(p.y+track.roadLift(road));return {id:cfg.driver,cfg,t,x:p.x,y:p.y+.095,z:p.z,hd:p.yaw,vx:0,vz:0,vy:0,yawRate:0,roll:p.bank,pitch:0,rollV:0,pitchV:0,delta:0,steer:0,s,l,road,u:0,lat:0,groundY:p.y,grounded:true,free:0,air:0,hop:0,boost:0,star:0,spin:0,inv:0,rescue:0,flash:0,charge:0,drift:0,driftDir:0,wasHeld:false,slip:0,slipV:0,steerV:0,driftBlend:0,boostStrength:0,pulse:0,trickBuffer:0,hopAwait:false,hopArc:0,rampFlight:false,wingOpen:0,wingLaunchTrick:false,tricked:false,trickSpin:0,odo:0,safeS:s,safeL:l,falling:false,fallTime:0,fallLip:p.y,gate:0,lap:1,laps:[],lastLap:0,done:0,coins:0,item:'',charges:0,rollItem:0,delay:0,aiSeed:0,aiLane:l,stuck:0,swap:0,contactLock:0};
}
function rivalCorner(r,travel,fullRate){
 const brain=rivalStyle(r),pf=brain.profile,distance=clamp(4+r.u*(.29+.07*pf.skill),4.6,17);
 const side=Math.sign(r.l),beyond=track.edgeKind(r.road.f,side)==='rail'&&Math.abs(r.l)>r.road.w+track.shoulder(r.road.f,side);
 let aim=r.aiLane;
 if(beyond){
  // A guardrail can start alongside a kart already on the shoulder.
  // Follow its outside face to the end instead of trying to steer through it.
  const s=r.s+distance,f=mod(s,track.L)/track.L;
  if(track.edgeKind(f,side)==='rail')aim=side*(track.width(s)+track.shoulder(f,side)+1.20);
 }
 const p=track.at(r.s+distance,aim),error=angle(Math.atan2(p.x-r.x,p.z-r.z)-travel);
 const turn=clamp(2*Math.max(4,r.u)*Math.sin(error)/distance,-fullRate,fullRate);
 if(brain.brakeAt===undefined||clock>=brain.brakeAt){
  brain.brakeAt=clock+Math.min(.18,pf.think);
  let limit=70;
  for(const ahead of [0,6+r.u*.12,12+r.u*.29,20+r.u*.43]){
   const k=Math.abs(track.curvature(r.s+ahead)),corner=Math.min(65,fullRate*pf.corner/(k+.001));
   limit=Math.min(limit,Math.sqrt(corner*corner+ahead*(16+pf.skill*7)));
  }
  if(pf.forecast){
   // At high speed a pad can hide the next braking zone. Scan the road's
   // baked envelope through stopping distance, including the current boost.
   for(const seconds of [.55,1.05,1.6]){
    const ahead=r.u*seconds,pace=track.paceAt(r.s+ahead);
    limit=Math.min(limit,Math.sqrt((pace*(pf.corner+.20))**2+2*ahead*10.2));
   }
   const outward=side*r.u*Math.sin(angle(travel-r.road.yaw));
   if(outward>2&&track.edgeKind(r.road.f,side)==='void'&&Math.abs(r.l)+outward*.48>r.road.w-.75){
    limit=Math.min(limit,Math.max(11,track.paceAt(r.s)*.65));
   }
  }
  brain.cornerLimit=limit;
 }
 return {turn,limit:brain.cornerLimit};
}
function giveBoost(r,seconds,tier){
 if(!r.boost){r.mediumRushUntil=0;r.strongRushUntil=0}
 r.boost=Math.max(r.boost,seconds);
 if(tier>=2)r.mediumRushUntil=Math.max(r.mediumRushUntil||0,clock+seconds);
 if(tier===3)r.strongRushUntil=Math.max(r.strongRushUntil||0,clock+seconds);
}
function boostTier(r){
 if(!r||!r.boost||r.spin||r.falling||r.rescue||r.done)return 0;
 return r.strongRushUntil>clock?3:r.mediumRushUntil>clock?2:1;
}
function gridBoost(r,charge){
 giveBoost(r,.18+1.10*charge,charge>=.85?3:charge>=.52?2:1);
 r.pulse=8.5*charge;
}
function miniBoost(r,level){
 giveBoost(r,r.t.turbo*(.52+.34*level),level);
 // Release the stored energy over a short surge, with an immediate audiovisual cue.
 r.pulse=Math.max(r.pulse,2.5+level*1.2);
}
function circuitCross(a,b,f){return b>a&&Math.floor((b-f*track.L)/track.L)>Math.floor((a-f*track.L)/track.L)}
// Exact critically damped response over one tick. Position and angular velocity
// survive a change of target, including a full reversal or a drift release.
function settleDrive(r,value,velocity,target,omega,dt){
 const offset=r[value]-target,rate=r[velocity],slope=rate+omega*offset,decay=Math.exp(-omega*dt);
 r[value]=target+(offset+slope*dt)*decay;r[velocity]=(rate-omega*slope*dt)*decay;
}
const sailTrickTime=.60;
function sailTurnHasRoom(r){
 // The wing keeps its original physical pose. Check the pirouette envelope
 // once at the button press, including where the kart will be at the exit.
 if(r.air<.65&&r.vy<0)return false;
 const endX=r.x+r.vx*sailTrickTime,endZ=r.z+r.vz*sailTrickTime,radius=1.75;
 const rise=Math.max(0,r.vy)**2/(2*G),top=riderClearance(r)+rise+.35;
 const solids=track.solids;
 if(solids.overheadCells.size&&solids.underside(r.x,r.z,endX,endZ,radius,r.y-8,worldT)<r.y+top)return false;
 for(let i=0;i<=3;i++){
  const t=i/3;
  if(solids.nearby(mix(r.x,endX,t),r.y-.25,mix(r.z,endZ,t),radius,top+.25,worldT))return false;
 }
 return true;
}
function updateDrift(r,cmd,dt,ai){
 const speed=r.u,pressed=cmd.dr&&!r.wasHeld,released=!cmd.dr&&r.wasHeld;
 if(pressed&&r.rampFlight)r.trickBuffer=.16;
 if(pressed&&speed>5.5&&r.grounded&&r.spin<=0){
  r.hop=.34;r.hopAwait=true;
  // Jump pads are ballistic. A drift hop has its own short suspension impulse.
  r.hopArc=.235;r.free=.08;r.vy=3.50;if(!ai)fxEvent('hop');
  r.trickBuffer=.13;
 }
 if(pressed&&r.hopArc>0&&!r.drift&&!r.spin)r.hopAwait=true;
 if(r.rampFlight&&r.trickBuffer>0&&r.trickSpin<=0&&r.spin<=0&&!r.falling&&!r.rescue){
  const sail=r.wingOpen>=.08;
  if(sail?!r.sailTricked:!r.tricked){
   r.wingLaunchTrick=!sail;r.trickSide=r.driftDir||(r.steer<0?-1:1);
   r.tricked=true;r.trickSpin=sail?sailTrickTime:.43;
   if(sail){r.sailTricked=true;r.trickTight=!sailTurnHasRoom(r)}
   if(!ai){fxEvent('trick');notice(sail?'滑翔特技':'空中特技',.75)}
  }
  r.trickBuffer=0;
 }
 if(r.hopAwait&&cmd.dr&&Math.abs(cmd.raw)>.105&&r.hop>0&&!r.spin){
  r.drift=1;r.driftDir=Math.sign(cmd.raw);r.charge=0;r.hopAwait=false;if(!ai)fxEvent('drift');
 }
 if(released||!r.hop)r.hopAwait=false;
 if(r.drift&&(released||r.spin||speed<4.5)){
  const level=chargeLevel(r);
  if(released&&!r.spin&&speed>6&&level){miniBoost(r,level);if(!ai){fxEvent('mini'+level);notice(['','迷你涡轮','超级迷你涡轮','究极迷你涡轮'][level],.85)}}
  r.drift=0;r.charge=0;
 }
 r.wasHeld=!!cmd.dr;
 if(r.drift&&r.grounded){
  const old=chargeLevel(r),inside=clamp(r.steer*r.driftDir,-1,1);
  r.charge+=dt*(.91+.55*inside+.19*clamp(speed/32,0,1));
  if(!ai&&chargeLevel(r)>old)fxEvent('spark'+chargeLevel(r));
 }
 r.driftBlend=mix(r.driftBlend,r.drift?1:0,1-Math.exp(-dt*(r.drift?9.5:7.2)));
}
// The front axle steers the chassis. The tire contact patches rotate the velocity
// vector towards it over time, independently of the visible tail angle.
function driveOnPlane(r,cmd,dt,assisted,ai,grade){
 const t=r.t,road=r.road,speed=Math.hypot(r.vx,r.vz),tier=raceTiers[cc];
 let travel=speed>.3?Math.atan2(r.vx,r.vz):r.hd;
 let grip=1;for(const g of track.d.surfaces||[])if(road.f>=g.f0&&road.f<=g.f1)grip=g.grip;
 const input=clamp(cmd.raw,-1,1);
 // The player's steering rack drives both the visible wheels and the tyre forces.
 // Keep a short spring response for a smooth release and a continuous reversal.
 settleDrive(r,'steer','steerV',input,ai?(input?31:25):52,dt);
 const steering=clamp(r.steer,-1,1),inside=steering*r.driftDir;
 const gripBuild=clamp(t.steer/.52*Math.sqrt(t.grip/1.50),.79,1.24);
 // The glider takes more bank at high airspeed. Keep control authority on
 // high-class landings even after a boosted approach to a descending turn.
 const airTurn=r.rampFlight&&cc>150?1+.35*clamp((speed-tier.glide)/15,0,1):1;
 const turnLimit=(1.67-.28*clamp(speed/42,0,1))*gripBuild*Math.min(1,Math.max(speed/7,r.solidTurn>0?.54:0))*grip*tier.steer*airTurn;
 const normal=steering*(.82+.18*Math.abs(steering))*turnLimit;
 const drift=r.driftDir*turnLimit*(.87+.55*inside)*(1+.08*Number(cmd.br||0));
 const guide=ai?rivalCorner(r,travel,turnLimit):null;
 let desired=guide?guide.turn:mix(normal,drift,r.driftBlend);
 if(assisted&&!ai&&speed>4&&r.grounded&&track.edgeKind(road.f,Math.sign(r.l))!=='runoff'&&Math.abs(r.l)<road.w){
  const out=Math.sin(angle(travel-road.yaw)),pred=r.l+out*speed*.32;
  const edge=clamp((Math.abs(pred)-road.w*.76)/(road.w*.22),0,1);
  if(out*pred>0)desired-=Math.sign(pred)*edge*edge*turnLimit*.78*(1-r.driftBlend)*(1-.68*Math.abs(steering));
 }
 if(r.spin>0)desired=0;
 const oldRate=r.yawRate;
 r.yawRate=mix(r.yawRate,desired,1-Math.exp(-dt*(r.rampFlight?7:ai?19:26)*grip));
 let chassis=angle(r.hd-r.slip)+(oldRate+r.yawRate)*.5*dt;
 if(r.contactLock>0)chassis+=angle(travel-chassis)*(1-Math.exp(-dt*2.5));
 const traction=(16-2.6*clamp(speed/35,0,1)-4*r.driftBlend)*grip*(r.rampFlight?.62:1);
 travel+=angle(chassis-travel)*(1-Math.exp(-dt*traction));
 const tail=r.driftDir*(.27+.13*inside+.06*clamp(speed/32,0,1));
 settleDrive(r,'slip','slipV',tail*r.driftBlend,r.drift?15:14,dt);
 r.hd=angle(chassis+r.slip);
 const rackAngle=clamp(steering*(1-.38*r.driftBlend)-r.driftDir*r.driftBlend*.17,-1,1)*t.steer;
 r.delta=ai?mix(r.delta,rackAngle,1-Math.exp(-dt*19)):rackAngle;
 r.boostStrength=mix(r.boostStrength,r.boost>0?1:0,1-Math.exp(-dt*(r.boost>0?16:7)));
 const ccScale=tier.power,gear=r.cfg.gear||0,bias=r.cfg.bias||0;
 let top=clamp((37+gear*2.6)*Math.sqrt((t.engine/2670)*(.82/t.aero)),28,45)*ccScale*(1+r.coins*.006);
 top*=track.pace.cruise;
 if(ai)top*=r.racePace||.94;
 top*=1+.19*r.boostStrength;
 if(r.shrinkUntil>clock)top*=.69;
 // The painted line is not a collider. A drivable shoulder progressively
 // loses speed; a mushroom or star carries its boost across the rough patch.
 const dirt=r.grounded&&!r.star&&r.boost<=0?clamp((Math.abs(r.l)-road.w+.12)/1.7,0,1):0;
 top*=1-.48*dirt;
 if(guide)top=Math.min(top,Math.max(8,guide.limit));
 if(assisted&&!ai&&r.grounded&&speed>12&&!r.rampFlight){
  // Brake progressively for a bend whose radius exceeds the kart's available
  // yaw rate. Look ahead by stopping distance, not by distance to the edge.
  if(r.speedPlanAt===undefined||clock>=r.speedPlanAt){
   r.speedPlanAt=clock+.10;let limit=70;
   for(const ds of [0,speed*.26,speed*.55,speed*.95,speed*1.35]){
    const k=Math.abs(track.curvature(r.s+ds)),corner=clamp(turnLimit*(.89+.13*r.driftBlend)/(k+.001),12,68);
    limit=Math.min(limit,Math.sqrt(corner*corner+ds*20));
   }
   r.speedPlan=limit;
  }
  top=Math.min(top,r.speedPlan*(1+.12*r.boostStrength));
 }
 if(!r.rampFlight){
  // Race class and gearing still set straight-line speed. Give a drifting
  // kart more cornering headroom and keep an actual turbo useful.
  const corner=track.paceAt(r.s)*tier.corner*Math.sqrt(gripBuild)
   *(ai?1.06:assisted?1:1.11)*(1+.17*r.driftBlend+.14*r.boostStrength);
  top=Math.min(top,corner);
 }
 const force=t.engine/t.mass*(1-.105*gear)*ccScale*(1.15+.85*r.boostStrength)*(1-Number(cmd.br||0))/(1+speed*.012);
 const powered=cmd.gas!==false||r.boost>0;
 let accel=clamp((top-speed)*2.8,-13*tier.brake,powered?force:0)-(G*(1.82+bias*.12)*tier.brake*Number(cmd.br||0))-G*Math.sin(Math.atan(grade))*(r.grounded?1:.12);
 if(!powered&&r.grounded)accel-=1.35+.033*speed+.0008*speed*speed;
 if(r.rampFlight){
  // With the wheels off the surface, the engine no longer drives the kart.
  // A shallow descent trades height for a little speed; drag absorbs an
  // oversized launch without snapping the kart to a fixed airspeed.
  const cruise=tier.glide+2*r.boostStrength+clamp(-r.vy*.23,-1.2,1.9);
  const airBrake=cc>150?9+13*clamp((speed-cruise-7)/17,0,1):9;
  accel=clamp((cruise-speed)*.83,-airBrake,2.6)-2.2*Number(cmd.br||0);
 }
 if(r.spin>0){const lost=(r.hitDrag||0)*(1-Math.exp(-dt*11));r.hitDrag=(r.hitDrag||0)-lost;accel=-10-lost/dt;r.pulse=0}
 const surge=r.pulse*(1-Math.exp(-dt*9));r.pulse-=surge;
 const next=!powered&&r.grounded&&speed<.10&&surge<.01?0:Math.max(0,speed+accel*dt+surge);
 r.vx=next*Math.sin(travel);r.vz=next*Math.cos(travel);r.lat=-next*Math.sin(angle(r.hd-travel));r.u=next;r.odo+=next*dt;
 return (next-speed)/dt;
}
function startTow(r,ai){
 r.snowEntryS=undefined;
 r.rescue=1.18;r.blockAge=0;r.falling=false;r.marshalExit=null;r.tow=null;r.wingOpen=0;r.rampFlight=false;r.hopArc=0;
 r.hop=0;r.hopAwait=false;r.tricked=false;r.trickSpin=r.trickBuffer=0;r.slip=r.slipV=r.driftBlend=r.pulse=r.drift=r.charge=0;
 r.coins=Math.max(0,r.coins-3);
 if(!ai){notice('救援中 · 返回赛道',1.2);fxEvent('rescue')}
}
// Only pay for wheel queries at a lip, over a gap, or on an explicitly
// registered off-road floor. The wheelbase, tyre width, drift heading and
// lightning scale are those of the visible kart.
function wheelDeckHeight(r,p,maxY,followGrade=false){
 const chassis=GARAGE.bodies[r.cfg.body]||GARAGE.bodies[0],axles=chassis.axles;
 const tire=GARAGE.tires[r.cfg.tire]||GARAGE.tires[0],bike=!axles[0];
 const scale=r.shrinkUntil>clock?lightningScale(r):1;
 const sn=Math.sin(r.hd),cs=Math.cos(r.hd),probe=r.wheelProbe||(r.wheelProbe={});
 let highest=-Infinity;
 for(let axle=0;axle<2;axle++){
  const reach=(axles[axle]+(bike?0:tire.r*.03)+tire.w*(bike?.80:axle?.90:1.04)*.41)*scale;
  const z=axles[axle+2]*scale;
  for(let side=-1;side<=1;side+=2){
   const x=side*reach;
   track.locate(r.x+x*cs+z*sn,r.z-x*sn+z*cs,p.s,false,probe);
   let h=track.surfaceAt?track.surface(probe,maxY):undefined;
   if(h===undefined&&!track.roadGap(probe))h=probe.y+track.roadLift(probe);
   if(h!=null&&h<=maxY){
    // Express tyre heights at the chassis centre when bridging a dip in a
    // banked road. At an actual edge use the unmodified physical support.
    highest=Math.max(highest,followGrade?h-(probe.y-p.y):h);
   }
  }
 }
 return highest;
}
function leaveDeck(r,lip){
 r.falling=true;r.fallLip=lip;r.fallTime=0;r.grounded=false;r.rampFlight=false;
 r.hop=r.hopArc=r.trickBuffer=r.trickSpin=r.drift=r.charge=r.driftBlend=r.pulse=0;
 r.wingOpen=0;r.hopAwait=false;r.vy=Math.min(r.vy,0);
}
function fallStep(r,dt,ai){
 // Once below an unsupported lip, the kart cannot steer back through it.
 // It can still cross a lower registered floor while descending.
 const oldY=r.y;r.fallTime+=dt;r.vy-=G*dt;
 // Tumble once support is lost. Preserve momentum at the lip, then bleed it
 // continuously instead of carrying full racing speed throughout the drop.
 const drag=3.8,keep=Math.exp(-drag*dt),distance=(1-keep)/drag;
 r.x+=r.vx*distance;r.z+=r.vz*distance;r.y+=r.vy*dt;
 r.vx*=keep;r.vz*=keep;r.u=Math.hypot(r.vx,r.vz);
 r.pitch=mix(r.pitch,-.40,1-Math.exp(-dt*2.8));
 if(track.surfaceAt){
  const p=track.locate(r.x,r.z,r.s,false,r.fallRoad);r.fallRoad=p;
  let floor=track.surface(p,oldY+.06);
  if(floor===null){const wheel=wheelDeckHeight(r,p,oldY+.06);if(Number.isFinite(wheel))floor=wheel}
  // Cross the *lower* floor from above. Falling past a pier can never put
  // the kart back on the top of the very deck it just left.
  if(floor!=null&&floor<r.fallLip-.24){
   if(oldY>=floor-.06&&r.y<=floor+.095){
    r.y=floor+.095;r.vy=0;r.falling=false;r.grounded=true;r.air=0;r.free=0;
    r.groundY=floor;r.cameraFloorOffset=Math.min(0,floor-p.y);r.road=p;r.s=p.s;r.l=p.l;r.lastRoof=null;return;
   }
   if(r.y>floor&&r.fallTime<3.5)return;
  }
 }
 if(r.y<r.fallLip-4.2||r.fallTime>1.15)startTow(r,ai);
}
// A marshal can move the kart backwards to find pavement. Full-width launch
// gaps also need a run-up from our six-metre-per-second restart speed.
function towLanding(r){
 const start=r.safeS,courseStart=track.d.stages?Math.min(0,start):start-track.L;
 const launches=(track.d.gaps||[]).filter(g=>g.launch);
 for(let s=start;;s=Math.max(courseStart,s-3)){
  const w=track.width(s);
  for(const lane of [clamp(r.safeL,-w*.50,w*.50),0,-w*.63,w*.63]){
   const clear=[0,1.5,3,4.5,6].every(ds=>{
    const at=s+ds,w=track.width(at);
    return [-.55,.55].every(dx=>{const p=track.at(at,lane+dx);p.l=lane+dx;p.w=w;return Math.abs(p.l)<w-.25&&!track.gap(p)});
   });
   if(!clear)continue;
   const a=track.at(s,lane),b=track.at(s+5,lane);
   a.y+=track.lift({...a,l:lane,w});b.y+=track.lift({...b,l:lane,w:track.width(s+5)});
   if(track.solids.queryWorld(a.x,a.y+.10,a.z,b.x,b.y+.10,b.z,.83,1.55,worldT))continue;
   if(launches.some(g=>mod(g.f0*track.L-s,track.L)<18&&lane+.55>g.l0&&lane-.55<g.l1))continue;
   const p=track.at(s,lane);p.y+=track.lift({...p,l:lane,w});
   return {s,l:lane,p};
  }
  if(s===courseStart)break;
 }
 // Every built-in circuit has a supported grid, including point-to-point races.
 const s=Math.min(0,start),p=track.at(s,0);p.y+=track.lift({...p,l:0,w:track.width(s)});
 return {s,l:0,p};
}
function advanceTow(r,dt){
 r.wingOpen=0;
 if(!r.tow)r.tow={x:r.x,y:r.y,z:r.z,hd:r.hd,ground:r.groundY,...towLanding(r)};
 const tow=r.tow,p=tow.p;r.rescue=Math.max(0,r.rescue-dt);
 const t=1-r.rescue/1.18;
 const eased=(a,b)=>{const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u)};
 const e=eased(.19,.84),lift=eased(.065,.46),setDown=eased(.57,.90);
 r.x=mix(tow.x,p.x,e);r.z=mix(tow.z,p.z,e);r.groundY=mix(tow.ground,p.y,e);
 const crest=Math.max(tow.y,p.y)+2.28;
 r.y=mix(mix(tow.y,crest,lift),p.y+.095,setDown);
 r.hd=tow.hd+angle(p.yaw-tow.hd)*e;r.vx=r.vz=r.vy=r.u=r.yawRate=0;
 r.air=Math.max(0,r.y-p.y);r.pitch*=Math.exp(-dt*7);r.roll=mix(r.roll,p.bank,1-Math.exp(-dt*8));
 if(r.rescue===0){r.marshalExit={x:p.x,y:p.y+.095,z:p.z,hd:p.yaw,groundY:p.y,at:worldT};Object.assign(r,{s:tow.s,l:tow.l,road:track.locate(p.x,p.z,tow.s),groundY:p.y,grounded:true,air:0,delta:0,steer:0,steerV:0,u:6,lat:0,vx:6*Math.sin(p.yaw),vz:6*Math.cos(p.yaw),inv:1.15,rollV:0,pitchV:0,stuck:0,tow:null})}
}
// Clearance affects the deployed canopy individually, so a low beam can
// fold its leading edge while leaving the kart free to travel underneath.
const packedSails=[];
function canopyCells(cfg,mesh=null){
 const kind=(cfg.wing||0)%4;if(packedSails[kind])return packedSails[kind];
 const d=(mesh||rubyWing(cfg)).d,cells=new Map(),step=.62;
 // Bound the real wing mesh once in small local columns. This includes the
 // curved trim and wires between its centre and tips, independent of paint.
 for(let i=0;i<d.length;i+=27){
  const xmin=Math.min(d[i],d[i+9],d[i+18]),xmax=Math.max(d[i],d[i+9],d[i+18]);
  const ymin=Math.min(d[i+1],d[i+10],d[i+19]),ymax=Math.max(d[i+1],d[i+10],d[i+19]);
  const zmin=Math.min(d[i+2],d[i+11],d[i+20]),zmax=Math.max(d[i+2],d[i+11],d[i+20]);
  for(let ix=Math.floor(xmin/step);ix<=Math.floor(xmax/step);ix++)for(let iz=Math.floor(zmin/step);iz<=Math.floor(zmax/step);iz++){
   const key=ix*64+iz;let v=cells.get(key);
   if(!v){v=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];cells.set(key,v)}
   v[0]=Math.min(v[0],Math.max(xmin,ix*step));v[3]=Math.max(v[3],Math.min(xmax,(ix+1)*step));
   v[1]=Math.min(v[1],ymin);v[4]=Math.max(v[4],ymax);
   v[2]=Math.min(v[2],Math.max(zmin,iz*step));v[5]=Math.max(v[5],Math.min(zmax,(iz+1)*step));
  }
 }
 return packedSails[kind]=Array.from(cells.values(),v=>{
  const hx=(v[3]-v[0])*.5,hy=(v[4]-v[1])*.5,hz=(v[5]-v[2])*.5;
  return {x:(v[3]+v[0])*.5,y:(v[4]+v[1])*.5-.80,z:(v[5]+v[2])*.5+.59,hx,hy,hz,rad:Math.hypot(hx,hz)};
 });
}
function sailClearance(r,opening){
 const solids=track.solids;
 const vault=solids.hasRoofMesh&&solids.underside(r.x,r.z,r.x,r.z,3.75,r.y-.2,worldT,true)<r.y+4.9;
 if(!vault&&!solids.nearby(r.x,r.y-.25,r.z,3.75,4.9,worldT))return opening;
 const tire=GARAGE.tires[r.cfg.tire]||GARAGE.tires[0];
 const lift=(track.antiGravity(r.road.f)?.14:0)+(tire.r-.35)*.72;
 const scale=r.shrinkUntil>clock?lightningScale(r):1,b=r.sailBasis||(r.sailBasis=new Float64Array(9));
 garageChassisBasis(r.hd,r.roll,r.pitch,b);
 const y=.8+lift,z=-.59,x0=r.x+scale*(b[1]*y+b[2]*z),y0=r.y+scale*(b[4]*y+b[5]*z),z0=r.z+scale*(b[7]*y+b[8]*z);
 const cells=canopyCells(r.cfg),tilt=Math.hypot(b[1],b[7]);
 function fits(open){
  const size=scale*open*open*(3-2*open);
  for(const v of cells){
   const x=x0+size*(b[0]*v.x+b[1]*v.y+b[2]*v.z),z=z0+size*(b[6]*v.x+b[7]*v.y+b[8]*v.z);
   const dy=size*(Math.abs(b[3])*v.hx+Math.abs(b[4])*v.hy+Math.abs(b[5])*v.hz)+.012;
   const y=y0+size*(b[3]*v.x+b[4]*v.y+b[5]*v.z)-dy,rad=size*(v.rad+tilt*v.hy)+.012;
   if(vault&&y+2*dy>=solids.underside(x,z,x,z,rad,r.y-.2,worldT,true)-.04)return false;
   if(solids.queryWorld(x,y,z,x,y,z,rad,2*dy,worldT))return false;
  }
  return true;
 }
 if(fits(opening))return opening;
 let lo=0,hi=opening;
 for(let j=0;j<8;j++){const mid=(lo+hi)*.5;if(fits(mid))lo=mid;else hi=mid}
 return lo;
}
// Heights of the seated and leaning rider silhouettes on standard tyres.
// Check the actual meshes in the airport clearance regression when editing them.
const kartRiderTop=[2.23,2.38,2.21,2.21,2.02,2.09,2.05,1.93,2.23,2.21,2.02,2.21];
const bikeRiderTop=[2.22,2.36,2.24,2.21,1.99,2.09,2.06,1.91,2.22,2.24,1.99,2.21];
function riderClearance(r){
 if(r.roofBodyHeight===undefined){
  const tops=r.cfg.body===4?bikeRiderTop:kartRiderTop,tyre=GARAGE.tires[r.cfg.tire]||GARAGE.tires[0];
  r.roofBodyHeight=tops[r.cfg.driver]+.72*(tyre.r-.35);
 }
 return r.roofBodyHeight+(track.antiGravity(r.road.f)?.14:0)+.035;
}
// Resolve only the blocked component of travel. The remaining time and
// tangential velocity survive the contact, so guard posts can be grazed.
function moveThroughScenery(r,dt,ai){
 const scale=r.shrinkUntil>clock?lightningScale(r):1,radius=.81*scale,h=1.52*scale;
 const riderH=track.solids.overheadCells.size?riderClearance(r)*scale:h;
 let remaining=dt,x=r.x,z=r.z,y=r.y,vy=r.vy,roof=null,ceiling=null;
 for(let pass=0;remaining>.00001&&pass<3;pass++){
  const dx=r.vx*remaining,dz=r.vz*remaining,dy=vy*remaining;
  const hit=track.solids.queryWorld(x,y,z,x+dx,y+dy,z+dz,radius,h,worldT,remaining,riderH);
  if(!hit){x+=dx;z+=dz;break}
  x+=dx*hit.time;z+=dz*hit.time;y+=dy*hit.time;
  const push=hit.push+.002;
  if(hit.ny){
   // A thin roof already intersecting a rising kart is a ceiling. Only
   // downward arrival from its top can give the kart a supporting roof.
   if(hit.ny>0&&(!hit.item.ceilingOnly||r.y>=hit.roof-.01&&r.vy<=0)){roof=hit.roof;y=roof+.002;vy=Math.max(0,vy)}
   else{ceiling=hit.bottom-(hit.item.ceilingOnly||hit.item.cameraOverhead?riderH:h)-.003;y=ceiling;vy=Math.min(0,vy)}
  }else{
   x+=push*hit.nx;z+=push*hit.nz;r.solidTurn=.45;
   const incoming=(r.vx-hit.vx)*hit.nx+(r.vz-hit.vz)*hit.nz;
   if(incoming<0){r.vx-=incoming*hit.nx;r.vz-=incoming*hit.nz}
   if(-incoming>3.5&&r.contactLock<=0){r.contactLock=.36;r.flash=.12;if(!ai)fxEvent('bump')}
  }
  if(hit.item.hazard&&damage(r)&&!ai)notice(hit.item.hazard,.85);
  remaining*=1-hit.time;
 }
 r.x=x;r.z=z;r.solidRoof=roof;r.solidCeiling=ceiling;
 if(ceiling!==null){r.y=Math.min(r.y,ceiling);r.vy=Math.min(0,r.vy);r.hopArc=0}
}
// When a rival ends up in a real corner off its line, first seek a clear
// way back. A pinned kart eventually calls the same marshal as a fallen one.
function rivalUnstick(r,p,dt){
 if(!r.grounded||r.spin||r.rescue){r.blockAge=0;return}
 if(!r.blockAge){
  if(!r.solidTurn||r.u>3.8)return;
  r.blockS=r.s;r.blockX=r.x;r.blockZ=r.z;r.triedExit=false;
 }
 if(r.s>r.blockS+2||Math.hypot(r.x-r.blockX,r.z-r.blockZ)>2.6){r.blockAge=0;return}
 r.blockAge=(r.blockAge||0)+dt;
 if(r.blockAge>4.2){r.blockAge=r.stuck=0;startTow(r,true);return}
 if(r.blockAge<rivalStyle(r).profile.recover||r.triedExit)return;
 r.triedExit=true;
 const target=track.at(r.s+5,clamp(r.l,-p.w*.42,p.w*.42)),toward=Math.atan2(target.x-r.x,target.z-r.z);
 for(const turn of [0,.65,-.65,1.3,-1.3,2.1,-2.1,Math.PI]){
  const yaw=toward+turn,dx=Math.sin(yaw),dz=Math.cos(yaw),x=r.x+3.2*dx,z=r.z+3.2*dz;
  const road=track.locate(x,z,r.s);if(track.gap(road))continue;
  if(track.solids.queryWorld(r.x,r.y,r.z,x,r.y,z,.81,1.52,worldT))continue;
  r.hd=angle(yaw);r.vx=3.1*dx;r.vz=3.1*dz;r.yawRate=0;r.stuck=0;r.contactLock=.40;break;
 }
}
// A ski run can have consecutive arms of a U-turn on the same snowfield.
// Keep the local projection while on the road. After crossing open snow,
// reattach only to a nearer forward ribbon at the kart's actual height.
function snowRejoin(r,p){
 const dx=r.x-p.x,dz=r.z-p.z,d2=dx*dx+dz*dz;
 if(d2<=(p.w+.35)**2){r.snowEntryS=undefined;return}
 if(r.snowEntryS===undefined){
  if(track.edgeKind(p.f,Math.sign(p.l))!=='runoff')return;
  r.snowEntryS=r.s;
 }
 if(r.u<2||clock<(r.nextSnowCheck||0))return;
 r.nextSnowCheck=clock+.08;
 const q=r.snowProbe=track.locate(r.x,r.z,r.s,true,r.snowProbe),entry=r.snowEntryS;
 const ahead=q.s-entry,exit=Math.hypot(r.x-q.x,r.z-q.z);
 if(ahead<12||ahead>Math.min(115,track.L*.18)||q.s-p.s<16||exit>q.w+.20||exit*exit+4>=d2)return;
 if(Math.floor(q.s/track.L)!==Math.floor(entry/track.L))return;
 if(track.d.stages&&(q.s<0||q.s>=track.d.stages[r.lap-1]*track.L))return;
 if(track.roadGap(q)||track.edgeKind(q.f,Math.sign(q.l))==='rail')return;
 if((r.vx*Math.sin(q.yaw)+r.vz*Math.cos(q.yaw))/r.u<-.18)return;
 const floor=track.surface(q,r.y+.55);
 const roadY=q.y+track.roadLift(q),ground=floor===undefined?roadY:floor;
 if(ground===null||Math.abs(ground-roadY)>.85||r.y-ground<-.45||r.y-ground>1.05)return;
 Object.assign(p,q);r.snowEntryS=undefined;return entry;
}
function dynamics(r,dt,command,assisted,ai){
 const spring=r.cfg.spring||0;
 if(r.solidTurn>0)r.solidTurn=Math.max(0,r.solidTurn-dt);
 if(r.inv)r.inv=Math.max(0,r.inv-dt);if(r.flash)r.flash=Math.max(0,r.flash-dt);
 if(r.star)r.star=Math.max(0,r.star-dt);if(r.boost)r.boost=Math.max(0,r.boost-dt);
 if(r.spin)r.spin=Math.max(0,r.spin-dt);if(r.free)r.free=Math.max(0,r.free-dt);
 if(r.hop)r.hop=Math.max(0,r.hop-dt);if(r.contactLock)r.contactLock=Math.max(0,r.contactLock-dt);
 if(r.trickBuffer)r.trickBuffer=Math.max(0,r.trickBuffer-dt);if(r.trickSpin)r.trickSpin=Math.max(0,r.trickSpin-dt);
 if(r.rescue>0||r.falling){
  r.wasHeld=!!command.dr;
  if(r.falling)fallStep(r,dt,ai);else advanceTow(r,dt);
  return;
 }
 r.u=Math.hypot(r.vx,r.vz);
 updateDrift(r,command,dt,ai);
 const vzGrade=(track.elevation(r.s+1.5,r.l)-track.elevation(r.s-1.5,r.l))/3;
 const ax=driveOnPlane(r,command,dt,assisted,ai,vzGrade),ay=r.u*r.yawRate;
 const previousY=r.y;moveThroughScenery(r,dt,ai);
 const previousRoad=r.road;
 let old=r.s,p=track.locate(r.x,r.z,r.s,false,r.nextRoad);
 const ski=track.d.id==='summit'||track.d.id==='wario';
 const cutFrom=ski?snowRejoin(r,p):undefined;
 // Items, pads and ramps must not fire along the skipped part of the spline.
 if(cutFrom!==undefined)old=p.s;
 const side=Math.sign(p.l),kind=track.edgeKind(p.f,side);
 const fence=p.w+track.shoulder(p.f,side);
 const exterior=side*previousRoad.l>previousRoad.w+track.shoulder(previousRoad.f,side);
 const distance=side*p.l-fence;
 if(kind==='rail'&&(exterior?distance<.69:distance>-.69)&&Math.abs(r.y-p.y)<1.65){
  const normal=exterior?-side:side;
  const wall=track.at(p.s,side*(fence+(exterior?.69:-.69))),wx=Math.cos(p.yaw)*normal,wz=-Math.sin(p.yaw)*normal,nv=r.vx*wx+r.vz*wz;
  r.x=wall.x;r.z=wall.z;
  if(nv>.05){
   r.vx-=1.14*nv*wx;r.vz-=1.14*nv*wz;const rough=Math.min(.18,nv*.007);
   r.vx*=1-rough;r.vz*=1-rough;r.yawRate-=normal*Math.min(.7,nv*.043);
   if(nv>3.8&&r.contactLock<=0){r.flash=.16;r.contactLock=.64;if(!ai)fxEvent('hit')}
  }
  p=track.locate(r.x,r.z,p.s,false,p)
 }
 // A rolling tyre can follow a curb or a steep bank. A falling kart can
 // land only on a surface at or below its current feet, not an upper deck.
 const supportCap=r.y+(r.grounded||r.hopArc>0?.42:.075)+Math.max(0,r.vy)*dt;
 const sampled=track.surfaceAt?track.surface(p,supportCap):undefined;
 const overVoid=sampled===undefined?track.roadGap(p):sampled===null;
 const wave=track.d.impactLift?track.d.impactLift(p.f,worldT):0;
 const nominal=p.y+track.roadLift(p);
 let roadBase=(sampled??nominal)+wave;
 // Keep a kart supported on the roof it actually landed on, even when its
 // centreline projection is over water. Leaving the footprint releases it.
 let roof=r.solidRoof;
 if(roof===null&&r.lastRoof!=null&&Math.abs(r.y-r.lastRoof)<.36){
  const floor=track.solids.queryWorld(r.x,r.y+.18,r.z,r.x,r.y-.33,r.z,.72,.04,worldT);
  if(floor?.ny>0)roof=floor.roof;
 }
 r.lastRoof=roof;
 const rainbow=track.d.id==='rainbow';
 let supported=!overVoid;
 let edgeFloor=sampled!=null&&(Math.abs(p.l)>p.w-1.4||Math.abs(sampled-nominal)>.42);
 // An interior split can leave a sliver of tarmac under the chassis with
 // the wheels on either side. Treat its actual tyre patches like an outer lip.
 if(sampled!=null&&!edgeFloor&&track.d.gaps){
  const reach=1.45/track.L;
  for(const g of track.d.gaps)if(p.f>=g.f0-reach&&p.f<=g.f1+reach&&p.l>=g.l0-1.2&&p.l<=g.l1+1.2){edgeFloor=true;break}
 }
 // On a short depression the nose and rear axle may both still be on the
 // previous level. Ask the actual tyre patches before losing that support.
 let axleSupported=false;
 const depression=!overVoid&&r.grounded&&!r.rampFlight&&r.free<=0&&r.groundY-roadBase>.13;
 if(roof===null&&(track.surfaceAt||rainbow)&&(overVoid||edgeFloor||depression)){
  const tyreBridge=depression&&!overVoid&&!edgeFloor;
  const wheels=wheelDeckHeight(r,p,supportCap,tyreBridge);
  if(Number.isFinite(wheels)){
   supported=true;
   if(tyreBridge){axleSupported=wheels+wave>roadBase+.025;roadBase=Math.max(roadBase,Math.min(r.groundY,wheels+wave))}
   else roadBase=(overVoid?wheels:Math.max(sampled??nominal,wheels))+wave;
  }else if(edgeFloor)supported=false;
 }
 const safe=roof!==null||supported;
 r.cameraFloorOffset=roof===null&&supported&&sampled!==undefined&&roadBase<p.y-.35?roadBase-p.y:0;
 const base=roof===null?roadBase:Math.max(roadBase,roof);
 if(roof!==null&&r.y<roof+.08){r.y=roof+.08;r.vy=Math.max(0,r.vy)}
 const priorBase=r.groundY,groundV=clamp((base-priorBase)/dt,-12,12);r.groundY=base;
 for(const ra of track.d.ramps||[]){
  if(!r.rampFlight&&(r.grounded||r.hopArc>0||r.y>=priorBase-.15&&r.y<=priorBase+1.10&&r.vy>=-2.0)&&circuitCross(old,p.s,ra.f)&&p.l>=ra.l0&&p.l<=ra.l1&&r.u>6){
   r.free=.32;r.rampFlight=true;r.tricked=false;r.sailTricked=false;r.trickSpin=0;r.wingLaunchTrick=false;r.hopArc=0;r.hop=0;r.hopAwait=false;
   const launchCap=cc>150?8.6-1.6*clamp((r.u-32)/18,0,1):8.6;
   let kick=clamp(r.u*(ra.rise||1.1)/(ra.length||7)+1.7,3.2,launchCap);
   if(ra.covered){
    // Test the predicted arc at the matching time on the sloping vault.
    // A lower roof far down the descent should not cancel a clean launch.
    const apex=kick/G,head=riderClearance(r)+.18;
    for(let i=1;i<=4;i++){
     const t=apex*i/4,x=r.x+r.vx*t,z=r.z+r.vz*t;
     const bottom=track.solids.underside(x,z,x,z,.86,r.y-8,worldT,true);
     if(Number.isFinite(bottom))kick=Math.min(kick,(bottom-r.y-head)/t+.5*G*t);
    }
    kick=Math.max(0,kick);
   }
   r.vy=kick;r.grounded=false;
   if(!ai){notice('滑翔翼展开',.8);fxEvent('jump')}
  }
 }
 const missedLanding=r.rampFlight&&sampled==null&&!supported&&kind==='void'&&Math.abs(p.l)>fence+3&&side*(r.vx*Math.cos(p.yaw)-r.vz*Math.sin(p.yaw))>1;
 // A Thwomp wave may rise above a grounded kart. The rigid bridge plane
 // itself can never catch a descending kart from underneath.
 const beneathDeck=rainbow&&roof===null&&r.vy<=0&&(r.y<p.y-.36||overVoid&&r.y<roadBase-.28);
 if(beneathDeck||missedLanding||(!safe&&(!r.rampFlight||r.vy<=0&&r.y<base-.12))||(!r.grounded&&r.y<priorBase-.36&&r.vy<0)){
  r.l=p.l;r.road=p;r.nextRoad=previousRoad;leaveDeck(r,priorBase);return;
 }
 if(r.hopArc>0&&safe&&!r.rampFlight){
  r.hopArc=Math.max(0,r.hopArc-dt);const t=1-r.hopArc/.235;
  r.y=base+.095+.205*4*t*(1-t);r.vy=groundV+.82*(1-2*t)/.235;r.grounded=!r.hopArc;
 }else{
 r.hopArc=0;
 // A tyre already pressing on continuous tarmac can extend into a shallow
 // dip. Limit extension to the suspension stroke, and release it at a real step.
 const stroke=.15-.025*spring,groundStep=base-priorBase;
 const seated=safe&&r.grounded&&!r.rampFlight&&r.free<=0&&Math.abs(previousY-priorBase-.09)<.31;
 const reach=stroke+Math.min(.30,r.u*dt*.72);
 const rolling=seated&&Math.abs(groundStep)<=(axleSupported?Math.max(reach,.42):reach);
 // The body follows the road grade. A narrow ridge between tyre contacts
 // must not turn a one-tick height difference into launch velocity.
 const rideV=seated?mix(r.rideV??(vzGrade*(r.vx*Math.sin(p.yaw)+r.vz*Math.cos(p.yaw))),groundV,1-Math.exp(-dt*13)):groundV;
 r.rideV=seated?rideV:undefined;
 if(rolling||(safe&&r.free<=0&&r.y<base+.22&&(r.grounded||r.y>=priorBase-.15&&r.vy-groundV<.4))){
  if(!r.grounded&&r.vy-groundV<-2.6&&!ai){fxEvent('land');r.pitchV-=.23}
  if(r.rampFlight){if(r.tricked){miniBoost(r,1);if(!ai){fxEvent('boost');notice('特技落地加速',.8)}}r.rampFlight=false;r.tricked=false}
  let ks=160*(1+spring*.27),cs=19*(1+spring*.15);r.vy+=dt*(ks*(base+.09-r.y)-cs*(r.vy-rideV));r.grounded=true;
 }else{
  r.grounded=false;
  // The open sail slows descent slightly. The launch impulse, race gates and
  // track contact still use the same ramp and road as every other vehicle.
  const lift=r.rampFlight&&r.vy<0?.34*r.t.lift*r.wingOpen*clamp(r.u/22,0,1):0;
  r.vy-=G*(r.hop&&!r.rampFlight&&safe?1.95:1-lift)*dt;
 }
 r.y+=dt*r.vy;
 if(rolling&&r.y>base+.09+stroke){
  r.y=base+.09+stroke;r.vy=Math.min(r.vy,rideV);
 }
 if(safe&&r.free<=0&&r.y<base-.04&&r.y>base-1.2&&r.vy<groundV){r.y=base-.04;r.vy=Math.max(r.vy,rideV-.2);r.grounded=true}
 }
 // Suspension and the drift-hop arc are evaluated after horizontal CCD.
 // Check their actual endpoint too, so a rise over the wing deck cannot
 // carry the driver's head through a roof between physics ticks.
 if(track.solids.overheadCells.size&&(r.y>previousY||track.solids.hasRoofMesh&&!r.grounded)){
  const scale=r.shrinkUntil>clock?lightningScale(r):1;
  const bottom=track.solids.underside(r.x,r.z,r.x,r.z,.81*scale,previousY-.015,worldT,true);
  const top=riderClearance(r)*scale;
  if(r.y+top>bottom-.003)r.solidCeiling=Math.min(r.solidCeiling??Infinity,bottom-top-.003);
 }
 if(r.solidCeiling!==null&&r.y>r.solidCeiling){r.y=r.solidCeiling;r.vy=Math.min(0,r.vy);r.hopArc=0}
 r.air=Math.max(0,r.y-base-.095);
 for(const pad of track.d.pads||[]){if(circuitCross(old,p.s,pad.f)&&Math.abs(p.l-pad.l)<=pad.w*.5&&r.air<.9){
  miniBoost(r,1);if(!ai){notice('加速带',.75);fxEvent('boost')}
 }}
 if(r.grounded&&safe&&roof===null&&!r.solidTurn&&Math.abs(p.l)<p.w-1.3){r.safeS=p.s;r.safeL=p.l}
 if((sampled===undefined||!supported)&&Math.hypot(r.x-p.x,r.z-p.z)>p.w+26){startTow(r,ai);return}
 // A drift hop and a fall from an unprotected edge never arm the glider.
 // Leave room to roll the chassis on a takeoff trick before the rig unfolds.
 const deploy=r.rampFlight&&!r.grounded&&!r.rescue&&!(r.wingLaunchTrick&&r.trickSpin>0);
 r.wingOpen=deploy?sailClearance(r,Math.min(1,r.wingOpen+dt*4.0)):Math.max(0,r.wingOpen-dt*5.8);
 const lateral=ay/G,tilt=clamp(lateral*.026,-.105,.105)/(1+spring*.25),rollTo=p.bank+tilt+(r.driftDir*r.driftBlend*.055),pitchTo=Math.atan(vzGrade)+clamp(ax/G*.048,-.105,.080);
 r.rollV+=(95*(rollTo-r.roll)-15*r.rollV)*dt;r.roll+=r.rollV*dt;r.pitchV+=(79*(pitchTo-r.pitch)-14*r.pitchV)*dt;r.pitch+=r.pitchV*dt;r.ax=ax;
 r.s=p.s;r.l=p.l;r.road=p;r.nextRoad=previousRoad;r.u=Math.hypot(r.vx,r.vz);
 const gateFrom=cutFrom??old;
 if(r.s>=gateFrom&&(cutFrom!==undefined||r.s-gateFrom<track.L*.13)){
  const staged=!!track.d.stages,gate=staged?track.stageGates[r.gate]:r.gate*track.L/8;
  if(r.s>=gate&&(!staged||gateFrom<=gate))r.gate++;
  const end=staged?track.d.stages[r.lap-1]*track.L:r.lap*track.L;
  const passed=staged?r.gate>r.lap*4:r.gate>=r.lap*8;
  if(passed&&r.s>=end&&!r.done){
   r.laps.push(clock-r.lastLap);r.lastLap=clock;
   if(r.lap>=track.d.laps)r.done=clock;
   else{r.lap++;if(!ai){banner(staged?(r.lap===track.d.laps?'FINAL SECTION':'SECTION '+r.lap):(r.lap===track.d.laps?'FINAL LAP':'LAP '+r.lap),1.2);fxEvent('lap')}}
  }
 }
 if(ai&&kind==='rail'&&exterior){
  if(r.shoulderStamp===undefined||r.s>r.shoulderStamp+2.5){r.shoulderStamp=r.s;r.shoulderTime=0}
  else if((r.shoulderTime+=dt)>4){r.shoulderStamp=undefined;startTow(r,true);return}
 }else r.shoulderStamp=undefined;
 if(ai&&!r.done)rivalUnstick(r,p,dt);
 if((ai||assisted&&command.gas)&&!command.br&&r.u<2.4&&clock>4)r.stuck+=dt;else r.stuck=0;
 if(r.stuck>2.15&&r.grounded){r.hd=p.yaw;r.vx=4*Math.sin(p.yaw);r.vz=4*Math.cos(p.yaw);r.yawRate=0;r.stuck=0}
}
function chargeLevel(r){return r.charge>=2.9?3:r.charge>=1.72?2:r.charge>=.80?1:0}
function shiftAfterBump(r,dx,dz){
 const scale=r.shrinkUntil>clock?lightningScale(r):1;
 const hit=track.solids.queryWorld(r.x,r.y,r.z,r.x+dx,r.y,r.z+dz,.81*scale,1.52*scale,worldT);
 const t=hit?hit.time:1;r.x+=dx*t;r.z+=dz*t;
}
function bumpCars(a,b){
 if(a.falling||b.falling||a.rescue>0||b.rescue>0||Math.abs(a.y-b.y)>1.65)return;
 // Elliptical contact in the average road frame.
 const yaw=a.road.yaw,cr=Math.cos(yaw),sr=Math.sin(yaw),dx=b.x-a.x,dz=b.z-a.z,rx=dx*cr-dz*sr,rz=dx*sr+dz*cr,q=rx*rx/(1.62*1.62)+rz*rz/(2.22*2.22);if(q>=1)return;
 const len=Math.max(.05,Math.hypot(rx/(1.62*1.62),rz/(2.22*2.22)));let nx=(rx/(1.62*1.62)*cr+rz/(2.22*2.22)*sr)/len,nz=(rz/(2.22*2.22)*cr-rx/(1.62*1.62)*sr)/len;if(Math.abs(nx)+Math.abs(nz)<.02)nx=1;
 if((a.star>0)!==(b.star>0)){
  const attacker=a.star>0?a:b,target=attacker===a?b:a,sign=attacker===a?1:-1;
  // Only the struck kart moves. Let its regular airborne dynamics handle
  // the arc, ceilings, barriers and landing; protection prevents repeat hits.
  const depth=(1-Math.sqrt(q))*.77;
  shiftAfterBump(target,sign*nx*depth,sign*nz*depth);
  if(damage(target,'star')){
   const side=Math.sign(target.l-attacker.l)||(target.id%2?1:-1);
   let kx=sign*nx+.42*side*cr,kz=sign*nz-.42*side*sr;
   const length=Math.hypot(kx,kz)||1,impulse=clamp(attacker.u*.18,4.8,7.5);
   kx*=impulse/length;kz*=impulse/length;
   target.vx=target.vx*.70+kx;target.vz=target.vz*.70+kz;target.vy=Math.max(target.vy,5.6);
   target.grounded=false;target.hop=target.hopArc=target.trickSpin=0;target.free=Math.max(target.free,.22);
   if(attacker===me){fxEvent('confirm');notice('撞飞 · '+drivers[target.id],.78)}
  }
  return;
 }
 const ia=1/a.t.mass,ib=1/b.t.mass,pen=(1-Math.sqrt(q))*.77/(ia+ib);shiftAfterBump(a,-nx*pen*ia,-nz*pen*ia);shiftAfterBump(b,nx*pen*ib,nz*pen*ib);
 const v=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(v<0){let J=-(1.26)*v/(ia+ib);a.vx-=J*ia*nx;a.vz-=J*ia*nz;b.vx+=J*ib*nx;b.vz+=J*ib*nz;
 if(-v>2.9&&a.contactLock<=0&&b.contactLock<=0){a.contactLock=b.contactLock=.46;if(track.antiGravity(a.road.f)&&track.antiGravity(b.road.f)){giveBoost(a,.37,1);giveBoost(b,.37,1);if(a===me||b===me){notice('反重力碰撞加速',.72);fxEvent('boost')}}else if(a===me||b===me){me.flash=.14;fxEvent('bump')}}}
}
