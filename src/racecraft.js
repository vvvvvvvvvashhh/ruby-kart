// Rivals have the same tires, boost pads, items and wake opportunities as the player.
// Their race line is chosen at human-scale intervals, independently of race position.
// New classes share the same tyres, collisions and item rules. Straight-line
// power grows faster than corner speed, preserving a braking zone at hairpins.
const raceTiers={
 50:{power:.72,corner:.88,steer:1,brake:1,glide:19,redline:28},
 100:{power:.86,corner:.95,steer:1,brake:1,glide:21.5,redline:36},
 150:{power:1,corner:1,steer:1,brake:1,glide:24,redline:42},
 200:{power:1.21,corner:1.09,steer:1.085,brake:1.13,glide:25.5,redline:51},
 250:{power:1.42,corner:1.16,steer:1.15,brake:1.26,glide:27,redline:60}
};
const engineClasses=Object.freeze(Object.keys(raceTiers).map(Number));
const rivalClasses={
 50:{skill:.32,pace:.84,corner:.71,think:.43,look:.78,apex:.36,pass:6.4,drift:.043,hold:.027,hand:2.55,itemWait:1.35,start:.66},
 100:{skill:.67,pace:.95,corner:.87,think:.23,look:1.03,apex:.52,pass:10.6,drift:.026,hold:.016,hand:3.75,itemWait:.8,start:.32},
 150:{skill:1,pace:.995,corner:.99,think:.13,look:1.23,apex:.60,pass:14.5,drift:.017,hold:.010,hand:4.6,itemWait:.49,start:.12},
 200:{skill:1.13,pace:1,corner:1.07,think:.120,look:1.32,apex:.62,pass:17,drift:.015,hold:.009,hand:5.05,itemWait:.36,start:.09,forecast:.26},
 250:{skill:1.28,pace:1,corner:1.15,think:.108,look:1.40,apex:.64,pass:19.4,drift:.013,hold:.008,hand:5.55,itemWait:.26,start:.055,forecast:.41}
};
// An 11-driver permutation, independent of grid position or character stats.
// The cup retains its seed across rounds; a new VS race draws another grid.
function rivalBand(index,fieldSeed){
 const slot=(index*(1+((fieldSeed>>>8)%10))+fieldSeed%11)%11;
 return slot<4?'pro':slot<8?'club':'rookie';
}
function drawFieldSeed(){return Math.floor(Math.random()*4294967296)}
function armRivalStarts(racers,fieldSeed,round){
 for(const r of racers.slice(1)){
  const day=((r.aiSeed*7+round*3+fieldSeed%11)%11)/10;
  const band=r.aiBand==='pro'?.78:r.aiBand==='club'?.56:.34;
  r.launchLoad=Math.min(1,band+.19*day+(cc-50)*.00045);
  r.armedStart=true;
 }
}
const rivalProfiles={};
for(const level of engineClasses){
 const base=rivalClasses[level];
 rivalProfiles[level]={};
 for(const [band,k] of [['pro',1],['club',0],['rookie',-1]]){
  rivalProfiles[level][band]={...base,band,
   skill:Math.max(.06,base.skill+.14*k),pace:base.pace+(k<0?-.072:.032*k),
   corner:base.corner*(1+.095*k),think:base.think*(1-.24*k),look:base.look*(1+.16*k),
   apex:base.apex+(k>0?.23:.12*k),pass:base.pass*(1+.24*k),passCommit:.82+.18*k,
   drift:base.drift*(1-.19*k),hold:base.hold*(1-.15*k),hand:base.hand*(1+.17*k),
   itemWait:base.itemWait*(1-.24*k),start:base.start*(1-.20*k),
   recover:.96-.31*k,brakeSlack:2.1-.8*k,brakeRamp:8+2*k,forecast:(base.forecast||0)*(1+.18*k)
  };
 }
}
function rivalStyle(r){
 if(r.craft)return r.craft;
 const seed=r.aiSeed,bias=((seed*7)%11-5)/5;
 const profile=rivalProfiles[cc][r.aiBand||'club'],pace=profile.pace+.006*((seed*5)%9-4);
 // This is willingness to use the engine, never extra power for an AI.
 r.racePace=Math.min(1,pace);
 return r.craft={profile,bias,apex:profile.apex+.035*(seed%4),lane:r.l,next:0,passSide:0,passUntil:0,held:null,traffic:new Float64Array(24)};
}
function chooseRivalLine(r,brain){
 const profile=brain.profile;
 const width=track.width(r.s),safe=width*.78,speed=r.u,seed=r.aiSeed;
 const bend=track.curvature(r.s+5+speed*.13),entry=track.curvature(r.s+14+speed*.40);
 const inside=clamp(bend*27,-1,1);
 // Set up outside a coming corner, clip its apex, then open the steering on exit.
 let racingLine=safe*(brain.bias*.20+inside*brain.apex-(1-Math.abs(inside))*clamp(entry*24,-1,1)*.43);
 let leader=null,leaderGap=Infinity;
 for(const car of cars){
  if(car===r||car.done||car.falling||car.rescue>0)continue;
  const gap=track.diff(car.s,r.s);
  if(gap>.2&&gap<leaderGap&&Math.abs(car.l-r.l)<2.65){leader=car;leaderGap=gap}
 }
 // A practiced driver stays in a productive wake before spending it to pass.
 const holdWake=(profile.forecast||profile.band==='pro'&&profile.skill>.42)&&leader&&r.boost<.12&&r.draftCharge>(profile.band==='pro'?.22:.37)&&r.draftCharge<1.44&&
  leaderGap>4&&leaderGap<10&&Math.abs(leader.u-speed)<4&&Math.abs(bend)<.033;
 if(holdWake)racingLine=mix(racingLine,leader.l,.78);
 else if(leader&&leaderGap<profile.pass&&speed>8){
  const closing=speed-leader.u;
  if((r.boost>.1||closing>1.0||leaderGap<3.3+profile.skill*1.4)&&clock>brain.passUntil){
   // Commit to a side rather than swapping direction as the two karts draw level.
   let left=leader.l+safe,right=safe-leader.l;
   // A visually clear inside lane beats a wider lane blocked by a second kart.
   for(const other of cars){
    if(other===r||other===leader||other.done||other.falling||other.rescue||Math.abs(other.y-r.y)>2)continue;
    const d=track.diff(other.s,leader.s);
    if(d< -4||d>7)continue;
    const offset=other.l-leader.l;
    left-=Math.max(0,3.2-Math.abs(offset+2.7));
    right-=Math.max(0,3.2-Math.abs(offset-2.7));
   }
   brain.passSide=Math.abs(left-right)>1.25?(left>right?-1:1):(brain.bias<0?-1:1);
   brain.passUntil=clock+profile.passCommit;
  }
  if(clock<brain.passUntil)racingLine=mix(racingLine,leader.l+brain.passSide*2.7,Math.min(.95,.48+.39*profile.skill));
  else if(leaderGap>4&&leaderGap<11&&r.draftCharge>.15)racingLine=mix(racingLine,leader.l,.48);
 }
 // A novice delayed by traffic loses the ideal turn-in on some bends.
 // Keep the mistake bounded and away from holes and open road edges.
 const travelSector=Math.floor(r.s/32);
 if(profile.band==='rookie'&&leaderGap<10&&Math.abs(entry)>.024&&
    (travelSector+seed)%5===0&&track.edgeKind(r.road.f,Math.sign(-entry))!=='void'){
  racingLine-=Math.sign(entry)*safe*.26;
 }
 const ahead=Math.max(12+profile.skill*6,speed*profile.look),f=mod(r.s,track.L)/track.L;
 const barriers=[];
 let landingLine=false;
 track.solids.planLanes(track,r,ahead,worldT,barriers);
 for(const g of track.d.gaps||[]){
  const gap=track.diff(g.f0*track.L,r.s),insideGap=f>=g.f0&&f<=g.f1;
  if(!insideGap&&(gap<=0||gap>=ahead))continue;
  if(g.launch){landingLine=true;continue}
  barriers.push([g.l0-.65,g.l1+.65,11]);
  // Commit to one bypass for the whole cutout. Chasing an item on the
  // opposite side while over the hole would change the line through it.
  if(profile.skill>.40){
   const left=g.l0-safe*.04>-safe+1,right=g.l1+safe*.04<safe-1;
   if(left||right){
    const side=left&&right?(clock<(brain.bypassUntil||0)?brain.bypassSide:(r.l<0?-1:1)):(left?-1:1);
    brain.bypassSide=side;brain.bypassUntil=clock+.8;
    if(side<0)barriers.push([g.l0-.9,2*width,25]);
    else barriers.push([-2*width,g.l1+.9,25]);
   }
  }
 }
 for(const h of track.d.hazards||[]){
  const d=track.diff(h.f*track.L,r.s);if(d< -1||d>ahead)continue;
  const when=worldT+Math.max(0,d)/Math.max(6,speed);
  if(!h.active||h.active(when)){const lane=h.center(when);barriers.push([lane-h.radius-.85,lane+h.radius+.85,7])}
 }
 for(const h of track.d.thwomps||[]){
  const d=track.diff(h.f*track.L,r.s);
  if(d>=-1&&d<ahead&&thwompHeight(worldT+Math.max(0,d)/Math.max(6,speed),h.phase)<3.1){
   const radius=2.3*(h.scale||1)+.6;barriers.push([h.l-radius,h.l+radius,7]);
  }
 }
 for(const h of traps){
  const d=track.diff(h.s,r.s);if(d>0&&d<ahead*.68)barriers.push([h.l-1.40,h.l+1.40,6])
 }
 if(profile.forecast){
  // Only react to a visible, forward-moving green shell or fireball closing
  // from the rear. A homing shell is handled by a carried item instead.
  for(const shot of shells){
   if(shot.ttl<=0||shot.owner===r||shot.kind!=='green'&&shot.kind!=='fireball')continue;
   const gap=track.diff(r.s,shot.s),forward=shot.vx*Math.sin(r.road.yaw)+shot.vz*Math.cos(r.road.yaw);
   const closing=forward-speed;if(closing<3||gap<.4||gap>closing*(.32+profile.forecast))continue;
   const sideways=shot.vx*Math.cos(r.road.yaw)-shot.vz*Math.sin(r.road.yaw);
   const lane=shot.l+sideways*gap/closing;
   if(Math.abs(lane-r.l)<2.5)barriers.push([lane-1.25,lane+1.25,8]);
  }
 }
 let rewardLane=null,reward=0;
 for(const pad of track.d.pads||[]){
  const d=track.diff(pad.f*track.L,r.s);
  if(d>1&&d<ahead*1.25&&Math.abs(pad.l-r.l)<Math.max(3,d*.43)){
   rewardLane=pad.l;reward=1.0+2.0*profile.skill;break;
  }
 }
 if(rewardLane===null&&!r.item&&!r.rollItem){
  let nearest=Infinity;
  for(const box of boxes){if(box.cool>0)continue;const d=track.diff(box.s,r.s);
   if(d<1.5||d>ahead||Math.abs(box.l-r.l)>.48*d+.7)continue;
   const effort=d*.18+Math.abs(box.l-racingLine);
   if(effort<nearest){nearest=effort;rewardLane=box.l;reward=.85+1.4*profile.skill}
  }
 }
 // On a clear approach a practiced driver can build the same coin bonus
 // as the player. A pack, gap or sharp bend takes priority over the detour.
 if(rewardLane===null&&r.coins<10&&!landingLine&&profile.band!=='rookie'&&Math.abs(bend)<.031){
  let best=Infinity;
  for(const coin of courseCoins){
   if(coin.cool>0)continue;
   const d=track.diff(coin.s,r.s),lateral=Math.abs(coin.l-r.l);
   if(d<1.2||d>ahead||lateral>.36*d||Math.abs(coin.l)>safe)continue;
   const cost=d*.14+Math.abs(coin.l-racingLine);
   if(cost<best){best=cost;rewardLane=coin.l;reward=profile.band==='pro'?2.65:1.45}
  }
 }
 // After a shove, or before a full-width gliding gap, unwind toward the
 // usable deck instead of swerving across it for another item or boost pad.
 const side=Math.sign(r.l),outward=side*(r.vx*Math.cos(r.road.yaw)-r.vz*Math.sin(r.road.yaw));
 const projected=Math.abs(r.l)+Math.max(0,outward)*(.48+.25*profile.skill);
 const edgeAhead=profile.band==='pro'&&projected>width*.81&&track.edgeKind(f,side)==='void';
 const recoverLine=(edgeAhead||Math.abs(r.l)>width*.82||r.contactLock>.24)&&speed>5;
 if(recoverLine||landingLine){
  racingLine=mix(racingLine,landingLine?0:clamp(r.l,-safe*.32,safe*.32),landingLine?.78:.67);
  reward*=.20;
 }
 const line=clamp(racingLine,-safe,safe);
 const options=[line,clamp(brain.lane,-safe,safe),-safe,-safe*.52,0,safe*.52,safe];
 if(rewardLane!==null)options.push(clamp(rewardLane,-safe,safe));
 // Nearby traffic is identical for every candidate lane in this decision.
 const traffic=brain.traffic;let count=0;
 for(const car of cars){
  if(car===r||car.done||car.falling||car.rescue>0||Math.abs(r.y-car.y)>2)continue;
  const gap=track.diff(car.s,r.s);if(gap< -2||gap>10)continue;
  const lateral=profile.forecast?(car.vx*Math.cos(r.road.yaw)-car.vz*Math.sin(r.road.yaw))*profile.forecast:0;
  traffic[count++]=car.l+clamp(lateral,-2.2,2.2);traffic[count++]=3.8*clamp((8-gap)/6,0,1);
 }
 let best=line,low=Infinity;
 for(const lane of options){
  let cost=Math.abs(lane-line)*.58+Math.abs(lane-brain.lane)*.18;
  if(rewardLane!==null)cost-=reward*Math.max(0,1-Math.abs(lane-rewardLane)/2.3);
  for(const [left,right,penalty] of barriers){
   const clearance=Math.max(left-lane,lane-right);
   if(clearance<1.1)cost+=penalty*(1-Math.max(0,clearance)/1.1);
  }
  for(let i=0;i<count;i+=2){
   const space=Math.abs(lane-traffic[i]);cost+=traffic[i+1]*Math.max(0,1-space/2.50);
  }
  if(cost<low){low=cost;best=lane}
 }
 brain.lane=best;brain.next=clock+profile.think*(.90+.05*(seed%5));
}
function planRival(r,dt){
 const brain=rivalStyle(r);
 if(r.falling||r.rescue>0)return {raw:0,dr:false,br:false};
 if(clock>=brain.next)chooseRivalLine(r,brain);
 r.aiLane=mix(r.aiLane,brain.lane,1-Math.exp(-dt*(brain.profile.hand+.14*(r.aiSeed%3))));
 const bend=track.curvature(r.s+5+r.u*.13),ahead=track.curvature(r.s+11+r.u*.20);
 // Start near the turn-in point and release before the exit, independently for each driver.
 // Skilled drivers hop while setting up the approach, then hold through
 // turn-in. Use a real upcoming bend, not straight-line boost weaving.
 const anticipate=brain.profile.band==='pro'&&r.u>12&&!r.rampFlight;
 const entryBend=anticipate?track.curvature(r.s+10+r.u*.57):0;
 const preTurn=anticipate&&Math.abs(entryBend)>brain.profile.drift+.004&&
  Math.abs(ahead)>brain.profile.hold&&Math.sign(ahead)===Math.sign(entryBend)&&Math.abs(bend)<Math.abs(entryBend);
 const dir=Math.sign(preTurn?entryBend:bend),holds=r.drift&&dir===r.driftDir&&(Math.abs(bend)>brain.profile.hold||preTurn);
 const enter=(preTurn||Math.abs(bend)>brain.profile.drift+(r.aiSeed%3)*.002)&&dir===Math.sign(ahead)&&r.u>11;
 const available=r.boost<.15&&r.grounded&&Math.abs(r.l)<r.road.w*.72;
 // Cash a full charge on a long bend rather than carry purple sparks for
 // another lap of the hairpin. The next hop still has its physical cost.
 const spend=available&&r.drift&&brain.profile.band!=='rookie'&&chargeLevel(r)===3;
 const drift=r.spin<=0&&!spend&&(r.drift?holds:enter);
 // Skilled drivers release the drift on exit, and can trick on a visible ramp.
 const second=brain.profile.band==='pro'&&r.wingOpen>.72&&!r.sailTricked&&!r.trickSpin&&r.air>1.5;
 const trick=brain.profile.skill>.5&&r.rampFlight&&r.air>.30&&(!r.tricked||second);
 // Trail-brake when the tyre-limited line requires it, including mid-boost.
 const p=brain.profile;
 const braking=!r.rampFlight&&r.grounded?clamp((r.u-(brain.cornerLimit||70)-p.brakeSlack)/p.brakeRamp,0,.87):0;
 const steer=drift?dir*Math.max(Math.min(1,Math.abs(bend)*27),brain.profile.band==='pro'?.86:.52):clamp(bend*18,-1,1);
 return {raw:steer,dr:r.rampFlight?trick:drift,br:braking};
}
function updateRaceDrafts(dt){
 if(mode==='tt')return;
 for(const r of cars){
  if(r.draftCheck===undefined||clock>=r.draftCheck){
   r.draftCheck=clock+.095;
   r.hasWake=false;
   if(r.u>12&&r.spin<=0&&r.rescue<=0&&!r.falling&&!r.done&&r.air<1.2){
    let best=14;
    for(const ahead of cars){
     if(ahead===r||ahead.done||ahead.falling||ahead.rescue>0||ahead.u<11||Math.abs(ahead.y-r.y)>1.8)continue;
     const gap=track.diff(ahead.s,r.s);
     if(gap<2.0||gap>=best||Math.abs(ahead.l-r.l)>1.22+.036*gap||Math.cos(ahead.hd-r.hd)<.83)continue;
     best=gap;r.hasWake=true;
    }
   }
  }
  r.draftCharge=clamp((r.draftCharge||0)+dt*(r.hasWake?1:-1.75),0,1.45);
  if(r.draftCharge<=.02)r.draftLock=false;
  if(r.draftCharge>=1.44&&!r.draftLock&&clock>=(r.nextDraft||0)&&r.spin<=0&&r.rescue<=0&&!r.falling&&!r.done){
   r.draftLock=true;r.nextDraft=clock+4.5;miniBoost(r,1);
   if(r===me){fxEvent('boost');notice('尾流加速',.85)}
  }
 }
}
function rivalItemReady(r){
 if(r.done||r.falling||r.rescue>0||r.spin>0||!r.item)return false;
 const b=rivalStyle(r);
 if(!b.held||b.held.item!==r.item){b.held={item:r.item,born:clock,next:clock+b.profile.itemWait*(1+.085*(r.aiSeed%4))};return false}
 if(clock<b.held.next)return false;
 b.held.next=clock+b.profile.think;const age=clock-b.held.born;
 let front=Infinity,rear=Infinity,nearby=0;
 const item=singleKind[r.item]||r.item,aimed=item==='green'||item==='flower';
 for(const other of cars){
  if(other===r||other.done||other.falling||other.rescue>0)continue;
  const gap=other.s-r.s;
  if(gap>0&&other.inv<=0&&other.star<=0){
   // Non-homing shots leave along the kart's heading; an opponent on the
   // far side of a bend is not a realistic target for a straight shot.
   const dx=other.x-r.x,dz=other.z-r.z;
   if(!aimed||dx*Math.sin(r.hd)+dz*Math.cos(r.hd)>0&&Math.abs(dx*Math.cos(r.hd)-dz*Math.sin(r.hd))<1.6+.035*gap)front=Math.min(front,gap);
  }
  if(gap<0&&Math.abs(other.l-r.l)<2.7)rear=Math.min(rear,-gap);
  if(Math.abs(gap)<12)nearby++;
 }
 const k=Math.abs(track.curvature(r.s+7)),clear=r.grounded&&r.boost<.25;
 // A strong leader can trail a single defensive item the same way a player
 // can. Keep it unless a real target or a reachable replacement is ahead.
 if(b.profile.band==='pro'&&item===r.item&&(item==='green'||item==='banana'||item==='shell')){
  r.trailing=r.item;
  const shotReady=item==='banana'?rear<7:front>2&&front<(item==='green'?20:55);
  if(!shotReady&&!boxes.some(box=>{const d=track.diff(box.s,r.s);return !box.cool&&d>0&&d<9&&Math.abs(box.l-r.l)<1.25}))return false;
 }
 const use=itemTactic(r,{front,rear,nearby,k,clear,age},b.profile.skill);
 if(use)b.held=null;
 return use;
}
