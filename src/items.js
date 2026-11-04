// One item slot, as on Wii U. Three-piece items keep independent visible charges.
const itemNames={banana:'香蕉皮',green:'绿龟壳',shell:'红龟壳',mushroom:'冲刺蘑菇',star:'无敌星',coin:'金币',
 tripleGreen:'三重绿龟壳',tripleRed:'三重红龟壳',tripleBanana:'三重香蕉',tripleMushroom:'三重蘑菇',
 bomb:'炸弹兵',spiny:'刺刺龟壳',lightning:'闪电',horn:'超级喇叭',golden:'黄金蘑菇',flower:'火之花'};
const singleKind={tripleGreen:'green',tripleRed:'shell',tripleBanana:'banana',tripleMushroom:'mushroom'};
const itemWeights={
 lead:{coin:28,banana:32,green:24,horn:6,bomb:6,mushroom:4},
 pack:{coin:6,banana:10,green:10,shell:17,mushroom:16,tripleGreen:8,tripleRed:4,tripleBanana:7,tripleMushroom:9,bomb:8,horn:5,flower:7},
 chase:{shell:9,mushroom:8,tripleGreen:9,tripleRed:14,tripleBanana:4,tripleMushroom:22,bomb:6,star:10,spiny:12,lightning:6,golden:9,flower:4}
};
let itemBursts=[];
const lastRare={spiny:-Infinity,lightning:-Infinity};
function resetItemWorld(){
 itemBursts.length=0;lastRare.spiny=lastRare.lightning=-Infinity;
}
function collectible(r){return !r.done&&!r.rescue&&!r.falling}
function raceLeader(){let leader=null;for(const r of cars)if(collectible(r)&&(!leader||r.s>leader.s))leader=r;return leader}
function itemPool(r){
 const lead=raceLeader();let place=1;
 for(const a of cars)if(a!==r&&(a.done||a.s>r.s))place++;
 const gap=Math.max(0,(lead?.s??r.s)-r.s);
 return place===1?itemWeights.lead:(place>=6&&gap>12||place>=3&&gap>55)?itemWeights.chase:itemWeights.pack;
}
function itemAllowed(kind){
 if(kind==='spiny')return clock>=12&&clock-lastRare.spiny>17&&!shells.some(h=>h.kind==='spiny')&&!cars.some(r=>r.item==='spiny');
 if(kind==='lightning')return clock>=19&&clock-lastRare.lightning>23&&!cars.some(r=>r.item==='lightning');
 return true;
}
function drawRaceItem(r){
 const pool=itemPool(r),eligible=Object.keys(pool).filter(itemAllowed);
 let ticket=Math.random()*eligible.reduce((total,k)=>total+pool[k],0);
 let choice=eligible.at(-1);
 for(const k of eligible){ticket-=pool[k];if(ticket<0){choice=k;break}}
 r.item=choice;r.charges=choice==='flower'?10:singleKind[choice]?3:1;r.trailing='';r.itemUntil=0;r.nextShot=0;
 if(choice in lastRare)lastRare[choice]=clock;
 if(r===me){fxEvent('item');notice('获得'+itemNames[choice],.9)}
}
function useCharge(r){
 if(--r.charges<=0){r.item='';r.charges=0;r.itemUntil=0}
 r.trailing='';
}
function itemPoint(s,l){
 const p=track.at(s,l);p.y+=track.lift({...p,s,l,w:track.width(s)});
 return p;
}
function burst(kind,x,y,z,size){
 if(itemBursts.length>=20)itemBursts.shift();
 itemBursts.push({kind,x,y,z,size,start:clock});
}
function within(x,y,z,r,pad){return Math.abs(r.y-y)<pad&&Math.hypot(x-r.x,z-r.z)<pad}
function explodeItem(kind,s,l,radius,owner,hitOwner=true){
 const p=itemPoint(s,l),y=p.y+.45;
 burst(kind,p.x,y,p.z,radius);
 if(within(p.x,y,p.z,me,32))fxEvent(kind==='horn'?'horn':'explode');
 for(const r of cars){
  if(!collectible(r)||(!hitOwner&&r===owner)||!within(p.x,y,p.z,r,radius))continue;
  damage(r,kind);
 }
 for(const list of [shells,traps])for(const h of list){
  if(h.ttl<=0||Math.abs(track.diff(h.s,s))>radius||Math.abs(h.l-l)>radius)continue;
  const q=itemPoint(h.s,h.l);if(Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<=radius)h.ttl=0;
 }
}
function makeShot(r,kind){
 const speed=48+cc*.06,ds=2.0;
 let x=r.x+ds*Math.sin(r.hd),z=r.z+ds*Math.cos(r.hd);
 if(kind!=='spiny'){
  const hit=track.solids.queryWorld(r.x,r.y+.16,r.z,x,r.y+.16,z,.39,.53,worldT);
  if(hit){const t=Math.max(0,hit.time-.01);x=mix(r.x,x,t);z=mix(r.z,z,t)}
 }
 const road=track.locate(x,z,r.s);
 if(shells.length>=30)shells.shift();
 let target=null;
 if(kind==='shell'){
  for(const c of cars)if(c!==r&&collectible(c)&&c.s>r.s+.4&&(!target||c.s<target.s))target=c;
 }
 if(kind==='spiny')target=raceLeader();
 shells.push({kind,owner:r,s:road.s,l:road.l,x,z,vx:speed*Math.sin(r.hd),vz:speed*Math.cos(r.hd),
  target,prevS:road.s,prevL:road.l,ttl:kind==='spiny'?30:kind==='fireball'?1.25:8,born:clock,bounces:0,hover:0,road});
}
function useRaceItem(r){
 if(!r.item||!collectible(r))return;
 const id=r.item,kind=singleKind[id]||id;
 if(kind==='golden'||kind==='flower'){
  if(r.itemUntil&&clock>=r.itemUntil){r.item='';r.charges=0;r.itemUntil=0;return}
  if(clock<(r.nextShot||0))return;
  r.nextShot=clock+(kind==='flower'?.16:.20);
  if(!r.itemUntil)r.itemUntil=clock+(kind==='flower'?9:7.5);
  if(kind==='flower'){
   useCharge(r);makeShot(r,'fireball');if(r===me)fxEvent('fireball');
  }else{
   giveBoost(r,1.18,2);r.pulse=Math.max(r.pulse,4.7);r.lastMushroom=clock;
   if(r===me){fxEvent('golden');notice('黄金蘑菇 · 再按加速',.7)}
  }
  return;
 }
 useCharge(r);
 if(r===me&&kind!=='horn')fxEvent(kind);
 if(kind==='mushroom'||kind==='star'){
  const star=kind==='star',duration=star?7.5:1.65;giveBoost(r,duration,star?3:2);r.pulse=Math.max(r.pulse,4.85);
  if(star){
   if(!r.star)r.starGlowSince=worldT;
   r.star=duration;r.spin=r.hitDrag=r.flash=r.inv=0;r.shrinkUntil=0;r.strikeAt=r.impactAt=-Infinity;
  }else r.lastMushroom=clock;
  if(r===me){notice(star?'无敌星！':'蘑菇冲刺！',.75)}
 }else if(kind==='coin'){
  r.coins=Math.min(10,r.coins+2);if(r===me)notice('获得两枚金币',.85);
 }else if(kind==='banana'||kind==='bomb'){
  if(traps.length>=32)traps.shift();
  const bomb=kind==='bomb';
  traps.push({kind,s:r.s+(bomb?2.4:-2.8),l:r.l,ttl:bomb?2.5:30,owner:r,born:clock,roll:bomb?Math.max(11,r.u*.83):0});
 }else if(kind==='horn'){
  explodeItem('horn',r.s,r.l,8,r,false);if(r===me)notice('超级喇叭！',.75);
 }else if(kind==='lightning'){
  for(const other of cars){
   if(other===r||!collectible(other)||other.star>0)continue;
   other.item='';other.charges=0;other.trailing='';other.itemUntil=0;other.rollItem=0;
   other.shrinkUntil=clock+(other.s>r.s?5.7:3.8);
   other.strikeAt=worldT;other.strikeYaw=other.hd;
   damage(other,'lightning');
  }
  if(r!==me)fxEvent('lightning');
  if(r===me)notice('闪电击中对手',.95);
 }else makeShot(r,kind);
}
// Pressing a single defensive item holds it behind the kart. Releasing throws it.
// Each physical input owns its own hold, so pressing E and touching A cannot fire twice.
const guardInputs=new Set();
function cancelItemGuard(){guardInputs.clear();if(me)me.trailing=''}
function itemButton(down,source,cancel=false){
 if(screen==='countdown'||GridCharge.owns(source)){
  if(down&&screen==='countdown')GridCharge.press(source);else if(!down)GridCharge.release(source,cancel);return;
 }
 if(down){
  if(guardInputs.has(source))return;
  const already=guardInputs.size>0;guardInputs.add(source);
  if(already)return;
  if(screen==='race'&&collectible(me)&&['banana','green','shell'].includes(me.item)){
   soundUnlock();me.trailing=me.item;
  }else actions.use();
 }else{
  if(!guardInputs.delete(source)||guardInputs.size||!me.trailing)return;
  const stillHeld=me.trailing===me.item;me.trailing='';
  if(!cancel&&stillHeld&&screen==='race')useRaceItem(me);
 }
}
function orbitCount(r){return r.item==='tripleGreen'||r.item==='tripleRed'||r.item==='tripleBanana'?r.charges:0}
function usesShield(r,fromBehind){
 if(!orbitCount(r)&&!(fromBehind&&r.trailing&&r.trailing===r.item))return false;
 useCharge(r);if(r===me){fxEvent('guard');notice('挡住了！',.65)}return true;
}
function threatNear(r,range){
 for(const h of shells)if(h.ttl>0&&h.owner!==r&&(h.target===r||h.kind==='green')&&Math.abs(track.diff(h.s,r.s))<range&&Math.abs(h.l-r.l)<4)return true;
 return false;
}
function itemTactic(r,{front,rear,nearby,k,clear,age},skill){
 const kind=singleKind[r.item]||r.item;
 if(skill>1){
  // Hold a mushroom for the same timed spiny-shell dodge available to players.
  const incoming=shells.find(h=>h.ttl>0&&h.kind==='spiny'&&h.target===r);
  if(incoming&&(kind==='mushroom'||kind==='golden'))return incoming.hover>0&&incoming.hover<.22;
  if(kind==='mushroom'&&clear&&k<.028&&r.u>9){
   // Spend the boost on an exit, not just before a blind hairpin.
   if(track.paceAt(r.s+10)>r.u*.92&&track.paceAt(r.s+20)>r.u*.9)return true;
   return age>6;
  }
 }
 if(kind==='horn')return threatNear(r,5.8+2*skill)||(nearby&&age>.8&&Math.min(front,rear)<6)||age>13;
 if(kind==='coin')return true;
 if(kind==='golden')return r.boost<.45&&(clear||age>3||r.itemUntil>clock);
 if(kind==='flower')return front<28||age>2;
 if(kind==='lightning')return age>1.4&&cars.some(c=>c!==r&&collectible(c)&&c.star<=0&&c.s>r.s);
 if(kind==='spiny')return raceLeader()!==r;
 if(kind==='bomb')return (front<22&&front>4)||age>4.8;
 if(kind==='shell'||kind==='green'||kind==='banana'){
  if(skill>.28&&kind===r.item&&threatNear(r,skill>1?16+(skill-1)*18:13)){r.trailing=r.item;return false}
  if(kind==='banana')return rear<8||(age>2&&k>.030)||age>7;
  return front>2&&front<(kind==='shell'?58:22)||age>8;
 }
 if(kind==='mushroom')return clear&&((k<.022&&r.u>8)||age>5);
 return kind==='star'&&(nearby>=2||age>2.5);
}
function contactShot(h,r,fromBehind){
 if(!collectible(r))return false;
 if(!r.star&&!usesShield(r,fromBehind)&&damage(r,h.kind)){
  if(h.owner===me){fxEvent('confirm');notice((itemNames[h.kind]||'火球')+'命中！',.8)}
 }
 h.ttl=0;return true;
}
function advanceGreen(h,dt){
 const speed=Math.hypot(h.vx,h.vz),base=itemPoint(h.s,h.l);
 let remaining=dt;
 for(let bounce=0;remaining>.00001&&bounce<3;bounce++){
  const dx=h.vx*remaining,dz=h.vz*remaining,height=base.y+(h.kind==='fireball'?.28:.13);
  const hit=track.solids.queryWorld(h.x,height,h.z,h.x+dx,height,h.z+dz,.39,.53,worldT,remaining);
  if(!hit){h.x+=dx;h.z+=dz;break}
  h.x+=dx*hit.time+hit.nx*(hit.push+.016);h.z+=dz*hit.time+hit.nz*(hit.push+.016);
  const dot=h.vx*hit.nx+h.vz*hit.nz;
  if(hit.ny||++h.bounces>(h.kind==='fireball'?1:4)){h.ttl=0;return}
  if(dot<0){h.vx-=2*dot*hit.nx;h.vz-=2*dot*hit.nz}
  remaining*=1-hit.time;
 }
 const p=track.locate(h.x,h.z,h.s,false,h.road),side=Math.sign(p.l),edge=p.w+track.shoulder(p.f,side);
 if(Math.abs(p.l)>edge-.55&&track.edgeKind(p.f,side)==='rail'){
  const nx=Math.cos(p.yaw)*side,nz=-Math.sin(p.yaw)*side,dot=h.vx*nx+h.vz*nz;
  if(dot>0){
   h.vx-=2*dot*nx;h.vz-=2*dot*nz;const q=track.at(p.s,side*(edge-.6));h.x=q.x;h.z=q.z;
   p.l=side*(edge-.6);if(++h.bounces>(h.kind==='fireball'?1:4)){h.ttl=0;return}
  }
 }else if(track.gap(p)||Math.abs(p.l)>p.w+29){h.ttl=0;return}
 h.s=p.s;h.l=p.l;
 for(const r of cars){
  if(!collectible(r)||(r===h.owner&&clock-h.born<.5)||r.air>1.6||Math.abs(r.y-p.y)>2.1)continue;
  if(Math.hypot(r.x-h.x,r.z-h.z)>1.47+speed*dt*.2)continue;
  if(contactShot(h,r,Math.cos(r.hd-Math.atan2(h.vx,h.vz))>0))return;
 }
}
function advanceHoming(h,dt){
 const blue=h.kind==='spiny';
 if(blue&&h.hover===0)h.target=raceLeader();
 if(h.target&&!collectible(h.target))h.target=null;
 const target=h.target;
 if(blue&&!target){h.ttl=0;return}
 if(blue&&h.hover>0){
  h.s=target.s;h.l=target.l;h.hover-=dt;
  if(h.hover<=0){h.ttl=0;
   if(clock-(target.lastMushroom??-10)<.25){burst('horn',target.x,target.y,target.z,3);if(target===me)notice('冲刺躲开了刺刺龟壳',.8)}
   else explodeItem('spiny',h.s,h.l,6.6,h.owner);
  }return;
 }
 const old=h.s,oldL=h.l;if(target){h.l=mix(h.l,target.l,1-Math.exp(-dt*(blue?5:4.8)))}
 h.s+=Math.max((blue?60:45)+cc*.075,(target?.u||0)+(blue?18:9))*dt;
 if(target===me&&!h.warned&&target.s-h.s<28){h.warned=true;fxEvent('warning');notice(blue?'刺刺龟壳逼近！':'红龟壳逼近！',.9)}
 if(blue){
  if(h.target.s<=h.s+1.2){h.hover=.9;h.s=target.s;h.l=target.l}
  else for(const r of cars)if(r!==h.owner&&r!==target&&collectible(r)&&r.air<1.6&&Math.abs(track.diff(r.s,h.s))<1.05&&Math.abs(r.l-h.l)<1.2)damage(r,'spiny');
 }else{
  const a=itemPoint(old,oldL),b=itemPoint(h.s,h.l);
  if(track.solids.queryWorld(a.x,a.y+.16,a.z,b.x,b.y+.16,b.z,.39,.53,worldT,dt)){h.ttl=0;return}
  for(const r of cars){
   if(!collectible(r)||(r===h.owner&&clock-h.born<.5)||r.air>1.7)continue;
   const ds=track.diff(r.s,old);
   if(ds>=-.2&&ds<=h.s-old+1.2&&Math.abs(r.l-h.l)<1.45){contactShot(h,r,true);return}
  }
 }
}
function stepHeldOrbits(r){
 const mushroom=r.item==='tripleMushroom',count=mushroom?r.charges:orbitCount(r);if(!count||!collectible(r))return;
 for(const c of cars){
  if(c===r||!collectible(c)||c.inv>0||Math.abs(r.y-c.y)>1.6||Math.abs(track.diff(c.s,r.s))>4||Math.hypot(c.x-r.x,c.z-r.z)>3.3)continue;
  for(let j=0;j<count;j++){
   const a=clock*3.2+j*TAU/count+r.id*.7;
   if(Math.hypot(c.x-r.x-Math.sin(a)*2.03,c.z-r.z-Math.cos(a)*2.03)<1.05){
    const kind=singleKind[r.item]||r.item;useCharge(r);
    if(mushroom){giveBoost(c,1.4,2);c.pulse=Math.max(c.pulse,4.2);if(c===me)fxEvent('boost')}
    else damage(c,kind);
    return;
   }
  }
 }
}
function tickRaceItems(dt){
 for(const r of cars){
  if(r.itemUntil&&clock>=r.itemUntil){r.item='';r.itemUntil=0;r.charges=0;r.trailing=''}
  if(!collectible(r)){r.trailing='';continue}
  stepHeldOrbits(r);
 }
 for(const h of traps){
  if(h.ttl<=0)continue;
  h.ttl-=dt;
  const bomb=h.kind==='bomb';
  if(bomb){h.s+=h.roll*dt;h.roll*=Math.exp(-3.3*dt)}
  let detonate=bomb&&h.ttl<=0;
  for(const r of cars){
   if(!collectible(r)||(r===h.owner&&clock-h.born<(bomb?.85:1.25))||r.air>1.6)continue;
   if(Math.abs(r.l-h.l)>(bomb?2.2:1.25)||Math.abs(track.diff(r.s,h.s))>(bomb?2.25:1.42))continue;
   if(bomb)detonate=true;
   else{damage(r,'banana');h.ttl=0}
   break;
  }
  if(detonate){h.ttl=0;explodeItem('bomb',h.s,h.l,6.4,h.owner)}
 }
 for(const h of shells){
  if(h.ttl<=0)continue;h.ttl-=dt;if(h.ttl<=0)continue;
  if(h.kind==='green'||h.kind==='fireball')advanceGreen(h,dt);else advanceHoming(h,dt);
 }
 compactLive(traps);compactLive(shells);
 for(let i=itemBursts.length-1;i>=0;i--)if(clock-itemBursts[i].start>.56)itemBursts.splice(i,1);
}
function compactLive(items){
 let keep=0;for(const it of items)if(it.ttl>0)items[keep++]=it;items.length=keep;
}
// Held items and projectiles reuse meshes cached by propMesh.
function raceItemMesh(kind){
 if(kind==='green'||kind==='spiny'){
  const g=new Geo();g.merge(getRubyItemMesh('shell'));
  const blue=kind==='spiny';
  for(let i=0;i<g.d.length;i+=9){
   const red=g.d[i+3],gr=g.d[i+4],bl=g.d[i+5];if(red<gr*1.55||red<bl*1.6)continue;
   g.d[i+3]=blue?gr*.80:gr*.67;g.d[i+4]=blue?red*.70:red*.91;g.d[i+5]=blue?red:bl*.95;
  }
  if(blue){
   g.mat=3;g.tube(0,.75,0,0,1.15,0,.14,.01,'#ffefcc',7);
   for(let i=0;i<6;i++){const a=i*TAU/6,x=Math.sin(a),z=Math.cos(a);g.tube(x*.39,.52,z*.40,x*.65,.79,z*.67,.11,0,'#fff0d4',6)}
  }
  return g;
 }
 if(kind==='bomb'){
  const g=new Geo();g.mat=3;
  g.ell(0,.57,0,.49,.49,.48,'#2c364b',11,7);
  for(const side of [-1,1]){
   g.ell(side*.24,.13,.10,.21,.12,.30,'#f4ac39',9,4);
   g.ell(side*.105,.62,.442,.045,.11,.032,'#fff5de',6,4);
   g.tube(side*.19,.57,-.45,side*.29,.62,-.66,.055,.068,'#deb650',6);
   g.ell(side*.31,.61,-.62,.13,.12,.036,'#ffdd69',7,4);
  }
  g.tube(0,.94,0,0,1.07,0,.17,.14,'#e4b547',8);g.tube(0,1.05,0,.09,1.28,.05,.038,.03,'#d9cabb',6);
  g.mat=5;g.ell(.09,1.29,.05,.09,.10,.08,'#ffb737',7,4);return g;
 }
 if(kind==='fireball'){
  const g=new Geo();g.mat=5;
  g.ell(0,.27,0,.30,.28,.30,'#ff7036',9,5);
  g.ell(.05,.27,.14,.21,.20,.19,'#ffda48',8,4);
  g.tube(0,.31,-.12,0,.56,-.62,.21,0,'#f78531',7);
  return g;
 }
 return getRubyItemMesh(kind);
}
function drawRaceItems(t,caster=null){
 const sink=(key)=>caster?caster.forObject(key,1):renderer;
 for(const h of traps){
  const p=itemPoint(h.s,h.l);if(!renderer.vis(p.x,p.y,p.z,2.4))continue;
  const bomb=h.kind==='bomb',scale=bomb&&h.ttl<.8?1+.13*Math.sin(t*28):1;
  sink(h).draw(propMesh(h.kind),p.x,p.y+.07,p.z,p.yaw+(bomb?t*.8:0),scale,p.bank);
 }
 for(const h of shells){
  const p=itemPoint(mix(h.prevS??h.s,h.s,poseAlpha),mix(h.prevL??h.l,h.l,poseAlpha));
  const blue=h.kind==='spiny',fire=h.kind==='fireball',extra=blue?(h.hover>0?2.8*Math.min(1,h.hover/.3)+.25:.82):fire?.08+.83*Math.abs(Math.sin((t-h.born)*8.5)):.08;
  if(renderer.vis(p.x,p.y+extra,p.z,2.4))sink(h).draw(propMesh(h.kind),p.x,p.y+extra,p.z,fire?Math.atan2(h.vx,h.vz):t*(blue?7:4),blue?1.35:1,p.bank);
 }
 for(const r of cars){
  const n=r.item==='tripleMushroom'?r.charges:orbitCount(r);if(!collectible(r)||(!n&&!r.trailing)||!renderer.vis(r.x,r.y,r.z,4))continue;
  const v=visualRacer(r),kind=singleKind[r.item]||r.item;
  if(n){for(let j=0;j<n;j++){
   const a=t*3.2+j*TAU/n+r.id*.7;
   const keys=r.orbitShadowKeys||(r.orbitShadowKeys=[{},{},{}]);sink(keys[j]).draw(propMesh(kind),v.x+Math.sin(a)*2.03,v.y+.19,v.z+Math.cos(a)*2.03,a,.93);
  }}else {const key=r.trailingShadowKey||(r.trailingShadowKey={});sink(key).draw(propMesh(kind),v.x-1.56*Math.sin(v.hd),v.y+.08,v.z-1.56*Math.cos(v.hd),v.hd,1)}
 }

}
function lightningScale(r){
 const remaining=(r.shrinkUntil||0)-clock;
 if(remaining<=0)return 1;
 const age=r.strikeAt==null?1:worldT-r.strikeAt,hit=clamp(age/.17,0,1);
 const shrink=hit*hit*(3-2*hit),recover=clamp(remaining/.44,0,1);
 return 1-.46*shrink*recover*recover*(3-2*recover);
}
