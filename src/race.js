const byId=id=>document.getElementById(id);
function readSave(k,defaultValue){try{return JSON.parse(localStorage.getItem('ruby.mk8.3.'+k))??defaultValue}catch{return defaultValue}}
function writeSave(k,v){try{localStorage.setItem('ruby.mk8.3.'+k,JSON.stringify(v));return true}catch{return false}}
// Keyboard actions and physical cap assignments are shared by the driving
// simulation, projected hardware, on-screen help and the binding editor.
const DriveBindings=(()=>{
 const names={left:'向左转',right:'向右转',gas:'油门',brake:'刹车',drift:'漂移 / 特技',item:'使用道具',rear:'后视',pause:'暂停',recover:'回到赛道'};
 const primary={left:'ArrowLeft',right:'ArrowRight',gas:'KeyW',brake:'ArrowDown',drift:'Space',item:'KeyE',rear:'KeyC',pause:'KeyP',recover:'KeyR'};
 const aliases={left:['KeyA'],right:['KeyD'],brake:['KeyS','KeyX'],drift:['KeyB'],item:['ArrowUp'],rear:['KeyY']};
 const slots=['A','B','X','Y','up','down','left','right'],padNames={A:'A',B:'B',X:'X',Y:'Y',up:'十字上',down:'十字下',left:'十字左',right:'十字右'};
 const automatic={left:'left',right:'right',gas:'up',brake:'X',drift:'B',item:'A',rear:'Y',recover:'down'};
 const manual={...automatic,gas:'A',item:'up'};
 const key='driverControls.v1',data=readSave(key,null);
 const validKey=k=>typeof k==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Comma|Period|Slash|Bracket(Left|Right)|Minus|Equal|Backslash|Semicolon|Quote|Backquote)$/.test(k);
 function clean(saved,defaults,test){
  if(!saved||typeof saved!=='object')return {...defaults};
  const copy={};for(const a of Object.keys(defaults))copy[a]=saved[a]??defaults[a];
  if(saved.recover===undefined&&Object.keys(copy).some(k=>k!=='recover'&&copy[k]===copy.recover)){
   const available=defaults===primary?['KeyR','KeyT','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','KeyM']:slots;
   copy.recover=available.find(k=>!Object.values(copy).includes(k));
  }
  const values=Object.values(copy);return values.every(test)&&new Set(values).size===values.length?copy:{...defaults};
 }
 // Keep the original automatic throttle for established profiles.
 const old=['mode','course','cc','build','assist','deviceSkin','shadowQuality','grandPrix.v1'].some(k=>readSave(k,null)!==null);
 let auto=typeof data?.auto==='boolean'?data.auto:old;
 let kb=clean(data?.keys,primary,validKey),pa=clean(data?.autoPad,automatic,s=>slots.includes(s)),pm=clean(data?.manualPad,manual,s=>slots.includes(s));
 let lookup={},keyList={};
 function index(){
  lookup={};keyList={};for(const a of Object.keys(kb)){lookup[kb[a]]=a;keyList[a]=[kb[a]]}
  for(const [a,list] of Object.entries(aliases))if(kb[a]===primary[a])for(const k of list)if(!lookup[k]){lookup[k]=a;keyList[a].push(k)}
  lookup.Escape='pause';keyList.pause.push('Escape');
 }
 index();
 const pad=()=>auto?pa:pm;
 const save=()=>writeSave(key,{auto,keys:kb,autoPad:pa,manualPad:pm});
 if(!data)save();
 function capAction(slot){const map=pad();for(const a of Object.keys(map))if(map[a]===slot)return a;
  return slot==='down'?'brake':null}
 function bind(type,a,code){
  const map=type==='keys'?kb:pad();
  if(!Object.hasOwn(map,a)||(type==='keys'?!validKey(code):!slots.includes(code)))return {valid:false};
  let swapped=null;for(const k of Object.keys(map))if(k!==a&&map[k]===code){map[k]=map[a];swapped=k;break}
  map[a]=code;index();return {valid:true,swapped,saved:save()};
 }
 function reset(type){if(type==='keys')kb={...primary};else if(auto)pa={...automatic};else pm={...manual};index();return save()}
 function keyName(k){
  const text={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'空格',Escape:'Esc',ShiftLeft:'左 Shift',ShiftRight:'右 Shift',Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Minus:'−',Equal:'=',Backslash:'\\',Backquote:'`'};
  return text[k]||k.replace(/^Key|^Digit/,'').replace('Numpad','小键盘 ');
 }
 function label(a,type){return type==='keys'?keyList[a].map(keyName).join(' / '):a==='pause'?'START / ＋':padNames[pad()[a]]}
 return {names,slots,padNames,validKey,keyName,label,capAction,bind,reset,get auto(){return auto},setAuto(v){auto=!!v;return save()},
  keyAction:k=>lookup[k],cap:a=>pad()[a],primaryKey:a=>kb[a],down:(a,held)=>keyList[a].some(k=>held[k])};
})();
const allowed={driver:12,body:GARAGE.bodies.length,tire:GARAGE.tires.length,wing:GARAGE.wings.length,paint:GARAGE.paints.length};
function cleanBuild(raw){let c={};for(const [k,n] of Object.entries(allowed))c[k]=clamp(Number(raw?.[k])|0,0,n-1);for(const k of ['gear','spring','bias'])c[k]=clamp(Number(raw?.[k])|0,-1,1);return c}
const definitions=[parkDefinition(),rainbowDefinition(),harborDefinition(),summitDefinition(),forgeDefinition(),airportDefinition(),warioDefinition()];
const tourCards=[
 {name:'宝宝公园',tag:'GCN · CLASSIC',cup:'CROSSING CUP',hint:'守住内线，连续七圈抢位。',color:'#d89086',icon:'wheel'},
 {name:'彩虹之路',tag:'SNES · CLASSIC',cup:'TRIFORCE CUP',hint:'看准石咚咚落点，再越过分叉。',color:'#9690f1',icon:'star'},
 {name:'琥珀海港',tag:'TOUR 01',cup:'AMBER HARBOR',hint:'沿岸抢内线，瞄准码头跳台。',color:'#f5ae65',icon:'sail'},
 {name:'雪线速降',tag:'TOUR 02',cup:'SNOWLINE SUMMIT',hint:'顺坡攒火花，过旗门再抢冰面跳台。',color:'#8bd1e3',icon:'peak'},
 {name:'熔炉要塞',tag:'TOUR 03',cup:'FURNACE KEEP',hint:'看准摆锤空隙，切向熔桥加速带。',color:'#ed7c56',icon:'keep'},
 {name:'阳光机场',tag:'Wii U · SUNSHINE',cup:'SUNSHINE AIRPORT',hint:'从航站楼冲上跑道，顺着蓝色引导灯飞过停机坪。',color:'#38afc2',icon:'plane'},
 {name:'瓦里奥滑雪场',tag:'Wii U · ALPINE',cup:'MOUNT WARIO',hint:'从货舱一路滑向山脚，穿冰洞、过水坝，在看台前冲线。',color:'#538ac7',icon:'ski'}
];
const circuits=new Map(),savedRaceMode=readSave('mode','vs');
let course=clamp(Number(readSave('course',2))|0,0,definitions.length-1),cfg=cleanBuild(readSave('build',{})),mode=['gp','tt'].includes(savedRaceMode)?savedRaceMode:'vs',cc=Number(readSave('cc',100));if(!engineClasses.includes(cc))cc=100;
let screen='menu',heldScreen='menu',priorHelp='menu',sound=readSave('sound',true)!==false,assist=readSave('assist',true)!==false;
let track,me,cars=[],boxes=[],courseCoins=[],traps=[],shells=[],ghostData=null,recording=[],bestData={},scoreKey='',rank=1,standings=[],finishedAt=0,recordToast='';
let count=0,countLast=4,worldT=0,clock=0,ambientT=0,finishAge=0,toast='',toastT=0,ann='',annT=0,inputs={steer:0,drift:false,brake:false,gas:false},keys={},lastGhost=0,ghostR=null,garageAngle=.68,garageWing=false,garageTouched=-8,angleVelocity=0,miniKey='',tickBank=0;
let classifying=false;
let hotItem='',lastUI=-1,mapClock=0,logicCounter=0,started=false,noSound=false;
const avatars=[0,1,2,3,4,5,6,7,8,9,10,11];
function soundUnlock(){if(noSound)return;try{KartAudio.unlock();KartAudio.mute(!sound)}catch{noSound=true}}
function fxEvent(n){if(classifying)return;if(!noSound&&sound)try{KartAudio.event(n)}catch{}}
function notice(txt,sec=1.1){if(classifying)return;toast=txt;toastT=sec}
function banner(txt,sec=1.05){if(classifying)return;ann=txt;annT=sec}
function fmtRuby(t,ms=3){if(!Number.isFinite(t)||t<0)return '—';return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+String(Math.floor((t%1)*1000)).padStart(3,'0').slice(0,ms)}
const touchControl={steer:0,digital:0,drift:false,brake:false,gas:false,rear:false},controlQueue=[];
let rearRequested=false,rocketStart=0,startPlace=8,lastPassFX=-5,versusFieldSeed=0;
// The start lights own this charge; holding across GO never throws a race item.
const GridCharge=(()=>{
 const held=new Set();let level=0,full=false,spinDistance=0;
 function press(id){
  if(held.has(id))return;
  if(!held.size){soundUnlock();fxEvent('gridCharge')}
  held.add(id);
 }
 function release(id,cancel=false){held.delete(id);if(cancel&&!held.size){level=0;full=false}}
 function tick(dt){
  if(held.size)level=Math.min(1,level+dt/1.62);
  else level=Math.max(0,level-dt*1.65);
  spinDistance+=dt*level*(4+17*level);
  if(level>=1&&!full){full=true;fxEvent('gridReady')}
  if(level<.75)full=false;
 }
 function reset(newGrid=false){held.clear();level=0;full=false;if(newGrid)spinDistance=0}
 function launch(){return held.size&&level>=.12?level:0}
 return {press,release,tick,reset,launch,owns:id=>held.has(id),get level(){return level},get held(){return held.size>0},get spinDistance(){return spinDistance}};
})();
function inputReset(){
 GridCharge.reset();cancelItemGuard();
 inputs={steer:0,drift:false,brake:false,gas:false};Object.assign(touchControl,inputs);touchControl.digital=0;touchControl.rear=false;rearRequested=false;keys={};controlQueue.length=0;
 if(me){me.wasHeld=false;me.hopAwait=false;me.drift=0;me.charge=0}
}
function keyboardSteer(){return Number(DriveBindings.down('right',keys))-Number(DriveBindings.down('left',keys))}
function keyboardDrift(){return DriveBindings.down('drift',keys)}
function keyboardBrake(){return DriveBindings.down('brake',keys)}
function keyboardRear(){return DriveBindings.down('rear',keys)}
function syncRearView(){
 const requested=screen==='race'&&(touchControl.rear||keyboardRear());
 if(requested!==rearRequested&&typeof noteDrivingInput==='function')noteDrivingInput(performance.now());
 rearRequested=requested;
}
function queueControls(stamp){
 if(screen!=='race'&&screen!=='countdown')return;
 const steer=keyboardSteer()||touchControl.digital||touchControl.steer,gas=DriveBindings.down('gas',keys)||touchControl.gas;
 const drift=touchControl.drift||keyboardDrift(),brake=keyboardBrake()?1:touchControl.brake;
 if(screen==='countdown'){inputs.steer=steer;inputs.drift=drift;inputs.brake=brake;inputs.gas=gas;return}
 const tail=controlQueue[controlQueue.length-1],last=tail||inputs;
 if(last.steer===steer&&last.drift===drift&&last.brake===brake&&last.gas===gas)return;
 // Touch hardware can have sampled the finger before a long JavaScript frame.
 // Use that sample's time, and bound the input horizon when the game is behind.
 const now=performance.now();if(typeof noteDrivingInput==='function')noteDrivingInput(now);
 if(stamp>1e12&&Number.isFinite(performance.timeOrigin))stamp-=performance.timeOrigin;
 if(!Number.isFinite(stamp)||stamp<=0||stamp>now)stamp=now;
 const elapsed=typeof frameTs==='number'&&frameTs?(stamp-frameTs)*.001:0;
 const lead=clamp(tickBank+elapsed,0,3*STEP);
 const at=Math.max(tail?.at||clock,clock+STEP*Math.max(1,Math.ceil(lead/STEP-1e-7)));
 if(tail&&tail.drift===drift&&tail.gas===gas&&Math.abs(tail.at-at)<1e-7){
  tail.steer=steer;tail.brake=brake;return;
 }
 controlQueue.push({steer,drift,brake,gas,at});
}
function consumeControls(time){
 let changed=false;
 while(controlQueue.length&&controlQueue[0].at<=time+1e-7){
  const next=controlQueue[0],edge=next.drift!==inputs.drift||next.gas!==inputs.gas;
  if(edge&&changed)break;controlQueue.shift();inputs.steer=next.steer;inputs.drift=next.drift;inputs.brake=next.brake;inputs.gas=next.gas;
  if(edge)changed=true;
 }
}
const poseKeys=['x','y','z','hd','roll','pitch','vx','vz','u','delta','s','l','groundY','odo','air','driftBlend','boostStrength','slip','steer','yawRate','trickSpin','spin','rescue'];
function stashPose(r){
 const p=r.prevPose||(r.prevPose={});
 p.x=r.x;p.y=r.y;p.z=r.z;p.hd=r.hd;p.roll=r.roll;p.pitch=r.pitch;
 p.vx=r.vx;p.vz=r.vz;p.u=r.u;p.delta=r.delta;p.s=r.s;p.l=r.l;
 p.groundY=r.groundY;p.odo=r.odo;p.air=r.air;p.driftBlend=r.driftBlend;
 p.boostStrength=r.boostStrength;p.slip=r.slip;p.steer=r.steer;p.yawRate=r.yawRate;
 p.trickSpin=r.trickSpin;p.spin=r.spin;p.rescue=r.rescue;p.road=r.road;
}
function updateScoreKey(){scoreKey='course2.'+course+'.'+mode+'.'+cc;let d=readSave('pb.'+scoreKey,{});bestData=d&&typeof d==='object'?d:{};let g=bestData.ghost;ghostData=mode==='tt'&&g&&Array.isArray(g.samples)&&g.samples.length>=2&&g.samples.length<17000?g:null;ghostR=null}
function loadCircuit(){
 if(typeof cancelGridWarm==='function')cancelGridWarm();
 if(circuits.has(course)){track=circuits.get(course);circuits.delete(course)}
 else{
  if(circuits.size>=2){const first=circuits.keys().next().value,retired=circuits.get(first);circuits.delete(first);
   if(typeof renderer!=='undefined')for(const g of new Set(retired.props.map(o=>o.g)))renderer.release(g);
  }
  track=new Circuit(definitions[course]);
 }
 circuits.set(course,track);miniKey='';updateScoreKey()
}
function partKey(b,lod,anti){return [b.driver,b.body,b.tire,b.wing,b.paint,lod,+anti].join('.')}
function aiBuild(id,i){return {driver:id,body:(i*5+1)%GARAGE.bodies.length,tire:(i*3+2)%GARAGE.tires.length,wing:i%GARAGE.wings.length,paint:[0,3,6,1,2,4,0,3,7,6,0,1][id],gear:0,spring:0,bias:0}}
// The lens coasts after the finish, but the scorecard stays until a fresh
// player action. Only time spent actually looking at its completed results
// counts; an open guide, settings dialog or hidden browser tab pauses it.
const FinishReading=(()=>{
 let job=null;
 const held=new Set(),blocked=new Set(),releaseGap=.38;
 function begin(){
  const duration=mode==='gp'?(course===definitions.length-1?5:4):2;
  job={duration,elapsed:0,quiet:0,presented:false,running:false};
  blocked.clear();for(const key of held)blocked.add(key);
 }
 function present(){
  if(screen!=='finish'||mode==='gp'&&GrandPrix.busy)return;
  if(!job)begin();
  job.presented=true;
 }
 function ready(){return !!job?.presented&&job.elapsed>=job.duration&&!blocked.size&&job.quiet<=0}
 function tick(dt,visible){
  if(!job)return;
  if(!visible||!job.presented){job.running=false;return}
  if(!job.running){job.running=true;return}
  // Cap the first interval after a long task or sleeping display. No single
  // frame is allowed to expire an unseen result.
  const step=Math.min(.10,Math.max(0,dt));
  job.elapsed=Math.min(job.duration,job.elapsed+step);job.quiet=Math.max(0,job.quiet-step);
 }
 function down(source){
  const heldBefore=held.has(source);held.add(source);
  if(job&&screen==='finish'&&!ready()&&!heldBefore){
   blocked.add(source);job.quiet=releaseGap;
  }
 }
 function up(source){
  held.delete(source);if(blocked.delete(source)&&job)job.quiet=releaseGap;
 }
 function suspend(release=false){
  if(job)job.running=false;
  if(release){held.clear();if(blocked.size&&job)job.quiet=releaseGap;blocked.clear()}
 }
 function permit(){
  if(screen!=='finish'&&!(screen==='help'&&priorHelp==='finish'))return true;
  if(ready())return true;
  if(job)job.quiet=releaseGap;
  return false;
 }
 function status(){
  if(!job)return {ready:false,shown:false,seconds:0,fraction:0};
  return {ready:ready(),shown:job.presented,seconds:Math.ceil(Math.max(0,job.duration-job.elapsed)),fraction:job.elapsed/job.duration};
 }
 function reset(){job=null;blocked.clear()}
 return {begin,present,tick,down,up,suspend,permit,status,reset};
})();
// All three consumers (collision, rendering and shadow) follow the same
// world-time trajectory. Velocity reaches zero at both ends of the run.
function boxStation(box,t){
 if(!box.moving)return box.s;
 const center=box.f*track.L,rate=(3.1+Math.abs(box.l)*.36)/10.5;
 return center+10.5*Math.cos(t*rate+box.phase*.18);
}
function setup(start){
 FinishReading.reset();clock=0;lastPassFX=-5;rocketStart=0;count=3.45;countLast=4;worldT=0;finishedAt=0;finishAge=0;lastGhost=-1;ghostR=null;traps=[];shells=[];resetItemWorld();recording=[];recordToast='';logicCounter=0;
 ann='';toast='';toastT=0;annT=0;inputReset();GridCharge.reset(true);tickBank=0;garageWing=false;
 const vs=mode!=='tt',slot=startPlace-1;
 if(start&&mode==='vs')versusFieldSeed=drawFieldSeed();
 const fieldSeed=mode==='gp'?GrandPrix.fieldSeed:versusFieldSeed;
 const gridS=i=>-3-3.6*Math.floor(i/2)-(i%2)*.75,gridL=i=>i%2?1.95:-1.95;
 me=vehicle({...cfg},vs?gridS(slot):-1.8,vs?gridL(slot):0);me.item=vs?'':'mushroom';me.charges=vs?0:3;cars=[me];
 if(vs)avatars.filter(i=>i!==cfg.driver).forEach((id,j)=>{const qualified=mode==='gp'?GrandPrix.gridSlot(id):-1,i=qualified>=0?qualified:j<slot?j:j+1,r=vehicle(aiBuild(id,j),gridS(i),gridL(i));r.aiSeed=j+1;r.aiBand=rivalBand(j,fieldSeed);
  const profile=rivalProfiles[cc][r.aiBand];r.delay=profile.start*(.84+.13*(j%4));
  cars.push(r)});
 if(vs)armRivalStarts(cars,fieldSeed,course);
 rank=vs?startPlace:1;standings=[];boxes=[];let rows=track.d.itemRows??[.105,.337,.577,.86];
 if(vs)for(const f of rows){let n=track.d.movingBoxes?6:5;for(let i=0;i<n;i++){const l=track.d.half*(2*(i+.5)/n-1)*.99;boxes.push({f,l,s:f*track.L,cool:0,moving:!!track.d.movingBoxes,phase:i*.13})}}
 courseCoins=[];for(const [f,frac,n] of (track.d.coins||(course===0?[[.27,-.38,4],[.57,.17,4],[.88,-.28,4]]:[[.07,-.30,4],[.26,.34,5],[.459,-.24,3],[.62,.35,5],[.808,-.24,4],[.963,.3,3]]))){for(let i=0;i<n;i++)courseCoins.push({s:f*track.L+i*3.35,l:frac*track.d.half,cool:0})}
 updateScoreKey();if(start)fxEvent('start');
}
function changeScreen(s){
 if(s!==screen&&typeof cancelGridWarm==='function')cancelGridWarm();
 if(screen==='finish'&&s!=='finish')FinishReading.suspend();screen=s;lastUI=-1;UI.show(state());mapClock=0;if(s==='menu'||s==='garage'||s==='countdown')lastCamType='';}
function restart(){
 if(!FinishReading.permit())return;
 if(mode==='gp'){
  if(screen==='finish')return nextRace();
  if(!GrandPrix.startStage())return;
  if(track?.d!==definitions[course])loadCircuit();
 }
 soundUnlock();setup(true);changeScreen('countdown');started=true}
function nextRace(){
 if(screen!=='finish'||!FinishReading.permit())return;
 if(mode==='gp'){
  if(GrandPrix.busy)return;
  if(GrandPrix.complete){returnMenu();return}
  if(!GrandPrix.startStage())return;
  loadCircuit();soundUnlock();setup(true);changeScreen('countdown');started=true;return;
 }
 if(mode==='vs')startPlace=clamp(rank,1,12);
 course=(course+1)%definitions.length;writeSave('course',course);loadCircuit();restart();
}
function returnMenu(){if(!FinishReading.permit())return;if(mode==='gp'){if(GrandPrix.busy)return;GrandPrix.prepareMenu()}startPlace=8;inputReset();loadCircuit();setup(false);changeScreen('menu')}
function safeChoice(fn){if(screen!=='menu'&&screen!=='garage')return;fn();fxEvent('select');UI.show(state());mapClock=0}
function resume(){if(screen==='help'){changeScreen(priorHelp);return}if(screen==='pause'){changeScreen(heldScreen);soundUnlock()}}
function pauseRace(){if(screen==='pause')return resume();if(screen==='finish'||screen==='menu'||screen==='garage'||screen==='help')return;heldScreen=screen;inputReset();changeScreen('pause')}
function canRecover(){
 return !!me&&!me.done&&!me.rescue&&clock>=(me.recoverAfter||0)&&(screen==='race'||screen==='pause'&&heldScreen==='race');
}
function recover(){
 if(!canRecover())return;
 if(screen==='pause')resume();
 me.safeS=Math.min(me.safeS,me.s);
 me.stillSince=null;me.recoverAfter=clock+2.35;
 startTow(me,false);
}
function watchPosition(r){
 if(r.done||r.rescue||r.falling||!r.grounded){r.stillSince=null;return}
 if(r.stillSince==null||(r.x-r.stillX)**2+(r.z-r.stillZ)**2>1.44){
  r.stillX=r.x;r.stillZ=r.z;r.stillSince=clock;
 }
}
function showHelp(){if(screen==='help')return resume();priorHelp=screen;inputReset();changeScreen('help')}
const actions={itemButton,selectCourse:i=>safeChoice(()=>{if(mode==='gp'||!Number.isInteger(i)||!definitions[i]||i===course)return;soundUnlock();course=i;writeSave('course',course);loadCircuit();setup(false)}),
 selectMode:m=>safeChoice(()=>{if(!['tt','vs','gp'].includes(m)||mode===m)return;soundUnlock();
 const old=mode;mode=m;
 if(m==='gp')GrandPrix.prepareMenu();
 else if(old==='gp'){
  course=clamp(Number(readSave('course',0))|0,0,definitions.length-1);cfg=cleanBuild(readSave('build',{}));cc=Number(readSave('cc',100));if(!engineClasses.includes(cc))cc=100;
 }
 startPlace=8;writeSave('mode',mode);loadCircuit();setup(false)}),
 selectCC:v=>safeChoice(()=>{v=Number(v);if(!engineClasses.includes(v)||mode==='gp'&&GrandPrix.locked())return;soundUnlock();cc=v;writeSave('cc',cc);setup(false)}),
 previewPart:part=>{garageWing=part==='wing'},
 setPart:(k,v)=>{if(screen!=='garage'||mode==='gp'&&GrandPrix.locked()||!(k in allowed||['gear','spring','bias'].includes(k)))return;let prev=cfg.wing;cfg=cleanBuild({...cfg,[k]:v});writeSave('build',cfg);garageWing=k==='wing';if(k!=='wing'&&['gear','spring','bias'].includes(k))garageWing=false;fxEvent('select');UI.update(state());if(k==='wing'&&cfg.wing!==prev)notice(GARAGE.wings[cfg.wing].name,.65)},
 garage:()=>{if(screen==='menu'&&(mode!=='gp'||!GrandPrix.locked())){soundUnlock();garageAngle=.72;garageWing=false;garageTouched=ambientT;changeScreen('garage');fxEvent('select')}},
 menu:returnMenu,start:restart,nextRace,resetGP:()=>{if(screen==='menu'&&mode==='gp'&&GrandPrix.reset())returnMenu()}, pause:pauseRace,resume,recover,help:showHelp,use:()=>{soundUnlock();if(screen==='race')useItem(me)},
 sound:()=>{sound=!sound;writeSave('sound',sound);soundUnlock();try{KartAudio.mute(!sound)}catch{}UI.update(state())},
 gas:(v,t)=>{touchControl.gas=!!v;queueControls(t)},
 padSteer:(v,t)=>{touchControl.digital=v;queueControls(t)},
 steer:(v,t)=>{touchControl.steer=clamp(v,-1,1);queueControls(t)},drift:(v,t)=>{touchControl.drift=!!v;queueControls(t)},brake:(v,t)=>{touchControl.brake=clamp(Number(v)||0,0,1);queueControls(t)},
 cancelDrift:t=>{touchControl.drift=false;if(keyboardDrift())return;controlQueue.length=0;inputs.drift=false;if(me){me.wasHeld=false;me.hopAwait=false;me.drift=0;me.charge=0}queueControls(t)},
 rearView:v=>{touchControl.rear=!!v;syncRearView()},orbit:delta=>{if(screen==='garage'){garageAngle+=delta;garageTouched=ambientT}},tilt:()=>{},assist:()=>{assist=!assist;writeSave('assist',assist);UI.update(state())}};
// Compile sustained bends once from the same centerline used by physics. Tiny
// left/right spline ripples are not instructions; a stage ends at its finish.
function readBends(circuit){
 const open=!!circuit.d.stages,end=circuit.L*circuit.finishFraction,count=Math.ceil(end/2),step=end/count;
 const samples=new Float32Array(count),sides=new Int8Array(count);
 for(let i=0;i<count;i++){
  const s=(i+.5)*step;
  const avg=(circuit.curvature(s-step)*.25+circuit.curvature(s)*.50+circuit.curvature(s+step)*.25);
  samples[i]=avg;sides[i]=Math.abs(avg)>.0105?Math.sign(avg):0;
 }
 const bends=[];let startIndex=0;
 // Start a closed circuit at a group boundary so a bend across the finish line stays whole.
 if(!open){const boundary=sides.findIndex((side,i)=>side!==sides[(i+count-1)%count]);if(boundary>=0)startIndex=boundary}
 for(let n=0;n<count;){
  const i=(n+startIndex)%count,side=sides[i];let span=1,total=Math.abs(samples[i])*step,peak=Math.abs(samples[i]);
  while(n+span<count&&sides[(i+span)%count]===side){
   const value=Math.abs(samples[(i+span)%count]);total+=value*step;peak=Math.max(peak,value);span++;
  }
  if(side&&span*step>=5&&total>=.26&&peak>=.015){
   bends.push({start:i*step,length:span*step,dir:side>0?'right':'left',
    shape:total>2.12?'hairpin':peak>.045&&total>.59?'sharp':'curve'});
  }
  n+=span;
 }
 return bends;
}
function paceNotes(r){
 let nextTurn='straight',turnDistance=0,turnShape='',turnPhase='',turnKey=-1,turnFill=0;
 const turns=track.paceTurns||(track.paceTurns=readBends(track));
 const speed=Math.max(0,r.u),look=clamp(speed*2.15+7,18,75),entry=clamp(speed*.62,4,14);
 const open=!!track.d.stages;let nearest=null,nearD=Infinity,active=null,travel=0;
 for(const turn of turns){
  const offset=open?r.s-turn.start:mod(r.s-turn.start,track.L);
  if(offset>=0&&offset<turn.length){active=turn;travel=offset;continue}
  const ahead=open?turn.start-r.s:mod(turn.start-r.s,track.L);
  if(ahead>=0&&ahead<=look&&ahead<nearD){nearD=ahead;nearest=turn}
 }
 let turn=nearest;
 if(active&&(travel<entry||!nearest)){
  turn=active;turnPhase=travel<entry?'enter':'inside';turnFill=1;
 }else if(nearest){
  turnDistance=nearD;turnPhase=nearD<=Math.max(5,speed*.70)?'near':'ahead';
  turnFill=clamp(1-nearD/look,0,1);
 }
 if(turn){nextTurn=turn.dir;turnShape=turn.shape;turnKey=turn.start}
 let raceGap='';
 if(mode!=='tt'){let nearest=null,gap=Infinity;
  for(const other of cars){if(other===r)continue;const d=other.s-r.s;if(d>0&&d<gap){nearest=other;gap=d}}
  let behind=false;if(!nearest){behind=true;for(const other of cars){if(other===r)continue;const d=r.s-other.s;if(d>=0&&d<gap){nearest=other;gap=d}}}
  if(nearest)raceGap=(behind?'后车':'前车')+' · '+drivers[nearest.id]+' '+Math.round(gap)+' m';
 }
 return {nextTurn,turnDistance,turnShape,turnPhase,turnKey,turnFill,raceGap,guideClear:!rearRequested&&!r.falling&&!r.rescue&&!r.spin};
}
function state(){
 const p=me,lev=p?chargeLevel(p):0,night=course===1;let section=night?'星光路段':'反重力区',courseSection=section;
 if(p){let f=p.road.f;if(track.d.sections){section=track.d.sections[0][1];for(const [at,name] of track.d.sections)if(f>=at)section=name}else if(night){if((track.d.gaps||[]).some(g=>f>g.f0-.03&&f<g.f1+.015))section='分叉跳台';else if(track.d.thwomps.some(k=>Math.abs(f-k.f)<.02))section='石咚咚区';else if(Math.abs(p.road.k)>.015)section='倾斜弯道'}else if(Math.abs(p.road.k)>.018)section='回头弯';
 courseSection=section;
 if(p.falling)section='坠落中';else if(p.rescue>0)section='救援中';else if(!p.grounded&&p.wingOpen>.18)section='滑翔中';else if(!p.grounded&&p.air>.3)section='腾空';else if(p.spin>0)section='打滑中';else if(p.boost>.1)section='涡轮加速'}
 return {...(p?paceNotes(p):{}),preparing:screen==='countdown'&&typeof gridStarting==='function'&&gridStarting(),countdown:count,rocketStart,launchCharge:GridCharge.level,chargeHeld:GridCharge.held,finishAge,screen,cfg,course,mode,cc,canRecover:canRecover(),stuckHint:screen==='race'&&canRecover()&&me.stillSince!=null&&clock-me.stillSince>=5,gp:mode==='gp'?GrandPrix.view():null,assist,sound,staged:!!track.d.stages,lap:p?.lap||1,laps:track.d.laps,pos:rank,total:cars.length,speed:Math.round(Math.hypot(p?.vx||0,p?.vz||0)*3.6),time:clock,best:bestData.time||0,bestLap:bestData.lap||0,lapTimes:p?.laps??[],coins:p?.coins||0,item:p?.item||'',charges:p?.charges||0,itemSeconds:p?.itemUntil>clock?Math.ceil(p.itemUntil-clock):0,roulette:(p?.rollItem||0)>0,driftLevel:lev,driftCharge:p?.charge||0,boost:(p?.boost||0)>0,rush:boostTier(p),charging:!!p?.drift,air:(p?.air||0)>.25,courseSection,section,announce:annT>0?ann:'',toast:toastT>0?toast:'',results:standings,ghost:!!ghostData,courseName:track.d.name,courseEn:track.d.english,driverName:drivers[cfg.driver],recordText:recordToast};
}
function gainItem(r){drawRaceItem(r)}
function useItem(r){useRaceItem(r)}
const impactLabels={green:'绿龟壳击中',shell:'红龟壳击中',spiny:'刺刺龟壳爆炸',banana:'踩到香蕉皮',bomb:'炸弹兵爆炸',fireball:'被火球击中',lightning:'被闪电击中',horn:'被喇叭震开',star:'被无敌星撞飞',hit:'撞击打滑'};
function damage(r,kind='hit'){
 if(r.inv>0||r.star>0||!collectible(r))return false;
 r.impactKind=kind;r.impactAt=worldT;r.impactLost=Math.min(2,r.coins);
 r.impactX=r.x;r.impactY=r.y;r.impactZ=r.z;r.impactYaw=r.hd;r.impactVX=r.vx;r.impactVZ=r.vz;
 r.spinLength=kind==='star'?1.08:kind==='fireball'?.53:.88;r.spin=r.spinLength;r.boost=0;r.pulse=0;r.charge=0;r.hopAwait=false;r.drift=0;
 r.inv=1.7;r.coins-=r.impactLost;r.hitDrag=(kind==='fireball'?.32:.48)*r.u;r.flash=.40;
 if(r===me&&kind!=='lightning')fxEvent(kind==='banana'?'hitPeel':['green','shell','spiny','fireball'].includes(kind)?'hitShell':'hit');
 return true;
}
// Put a car in every longitudinal bin within reach of a pickup. Bit order
// is grid order, so two cars touching the same item keep their original priority.
function pickupCandidates(){
 const cells=track.pickupCells||(track.pickupCells=new Uint16Array(Math.max(1,Math.floor(track.L/10))));
 cells.fill(0);const size=track.L/cells.length;
 for(let i=0;i<cars.length;i++){
  const r=cars[i];if(!collectible(r)||r.air>2.1)continue;
  const s=mod(r.s,track.L),index=Math.min(cells.length-1,Math.floor(s/size)),bit=1<<i;
  cells[index]|=bit;
  if(s-index*size<=1.501)cells[(index||cells.length)-1]|=bit;
  if((index+1)*size-s<=1.501)cells[(index+1)%cells.length]|=bit;
 }
 return cells;
}
function pickups(dt){
 const cells=pickupCandidates(),size=track.L/cells.length;
 for(let box of boxes){
  box.cool=Math.max(0,box.cool-dt);
  if(box.moving)box.s=boxStation(box,worldT);
  if(box.cool)continue;
  if(box.moving||box.cell===undefined)box.cell=Math.min(cells.length-1,Math.floor(mod(box.s,track.L)/size));
  for(let mask=cells[box.cell];mask;mask&=mask-1){
   const r=cars[31-Math.clz32(mask&-mask)];
   if(r.item||r.rollItem>0||Math.abs(r.l-box.l)>1.60||Math.abs(track.diff(r.s,box.s))>1.50)continue;
   r.rollItem=.75;box.cool=2.15;if(r===me)fxEvent('box');break
  }
 }
 for(let c of courseCoins){
  c.cool=Math.max(0,c.cool-dt);if(c.cool)continue;
  if(c.cell===undefined)c.cell=Math.min(cells.length-1,Math.floor(mod(c.s,track.L)/size));
  for(let mask=cells[c.cell];mask;mask&=mask-1){
   const r=cars[31-Math.clz32(mask&-mask)];
   if(Math.abs(r.l-c.l)>1.38||r.air>2||Math.abs(track.diff(r.s,c.s))>1.32)continue;
   r.coins=Math.min(10,r.coins+1);c.cool=3.6;if(r===me)fxEvent('coin');break
  }
 }
 for(let r of cars){if(r.rollItem>0&&(r.rollItem-=dt)<=0)gainItem(r);if(r!==me&&rivalItemReady(r))useItem(r);
 for(const h of track.d.hazards||[]){if(!h.physical&&Math.abs(track.diff(r.s,h.f*track.L))<1.5+h.radius&&Math.abs(r.l-h.center(worldT))<.7+h.radius&&r.air<2&&(!h.active||h.active(worldT))){if(damage(r)&&r===me)notice(h.name||'撞上摆锤',.85)}}
 for(let th of track.d.thwomps||[]){if(th.physical||Math.abs(r.l-th.l)>2.45*(th.scale||1)||Math.abs(track.diff(r.s,th.f*track.L))>2.1*(th.scale||1)||thwompHeight(worldT,th.phase)>1.54+r.air)continue;if(damage(r)&&r===me)notice('被石咚咚砸中了！',.9)}}
 tickRaceItems(dt);
}
function captureEcho(force=false){
 if(mode!=='tt'||recording.length>=16000||(!force&&clock-lastGhost<.098))return;lastGhost=clock;
 const sample=[Math.round(clock*1000),Math.round(me.x*100),Math.round(me.y*100),Math.round(me.z*100),Math.round(me.hd*1000),Math.round(me.roll*1000),Math.round(me.pitch*1000),Math.round(me.s*100)];
 if(me.wingOpen>0)sample.push(Math.round(me.wingOpen*255));
 recording.push(sample);
}
function echoAt(t){if(!ghostData)return null;let a=ghostData.samples,ms=t*1000;if(ms>a.at(-1)[0]||!a.length)return null;
 let lo=0,hi=a.length-1;while(hi-lo>1){let m=(lo+hi)>>1;if(a[m][0]<=ms)lo=m;else hi=m}
 let p=a[lo],q=a[hi],k=clamp((ms-p[0])/(q[0]-p[0]||1),0,1);if(Math.hypot(q[1]-p[1],q[3]-p[3])>1400)k=0;
 return {x:mix(p[1],q[1],k)/100,y:mix(p[2],q[2],k)/100,z:mix(p[3],q[3],k)/100,yaw:p[4]/1000+angle((q[4]-p[4])/1000)*k,roll:mix(p[5],q[5],k)/1000,pitch:mix(p[6],q[6],k)/1000,s:mix(p[7],q[7],k)/100,wingOpen:mix(p[8]||0,q[8]||0,k)/255};}
function finishRace(){if(screen==='finish')return;FinishReading.begin();captureEcho(true);rank=1+cars.filter(r=>r!==me&&r.done&&r.done<me.done).length;
 const list=[...cars].sort((a,b)=>a.done&&b.done?a.done-b.done:a.done?-1:b.done?1:b.s-a.s);
 standings=list.map(a=>({id:a.id,name:drivers[a.id],time:a.done||0,player:a===me}));let newRecord=!bestData.time||clock<bestData.time;
 let newBest={...bestData,time:newRecord?clock:bestData.time,lap:Math.min(bestData.lap||Infinity,...me.laps)};
 if(mode==='tt'&&newRecord)newBest.ghost={samples:recording,cfg:{...cfg}};recordToast=newRecord?'刷新个人纪录':'比赛完成';if(!writeSave('pb.'+scoreKey,newBest))recordToast+=' · 本次成绩未能保存';bestData=newBest;
 finishAge=0;finishedAt=clock;if(mode==='gp')GrandPrix.atFlag();fxEvent('finish');banner('FINISH!',1.35);changeScreen('finish');
}
function advanceRivals(dt){
 for(let j=1;j<cars.length;j++){let r=cars[j];if(r.done||clock<r.delay)continue;
  if(r.armedStart){
   r.armedStart=false;
   if(r.s<2&&clock<=r.delay+.35){gridBoost(r,r.launchLoad)}
  }
  let c=planRival(r,dt);dynamics(r,dt,c,true,true)}
 if(mode!=='tt'){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){let a=cars[i],b=cars[j];if(!a.done&&!b.done&&Math.abs(a.x-b.x)<2.8&&Math.abs(a.z-b.z)<2.8)bumpCars(a,b)}}
}
function stepRace(dt){
 for(const r of cars)stashPose(r);for(const h of shells){h.prevS=h.s;h.prevL=h.l}
 clock+=dt;worldT+=dt;logicCounter++;consumeControls(clock);
 watchPosition(me);
 const playerCmd={raw:inputs.steer,dr:inputs.drift,br:inputs.brake,gas:DriveBindings.auto||inputs.gas};
 dynamics(me,dt,playerCmd,assist,false);
 advanceRivals(dt);
 updateRaceDrafts(dt);pickups(dt);const previousRank=rank;rank=1;for(let i=1;i<cars.length;i++)if(cars[i].done||cars[i].s>me.s)rank++;if(rank<previousRank&&clock-lastPassFX>1.7&&clock>2){lastPassFX=clock;fxEvent('overtake')}captureEcho();if(me.done)finishRace();
}

// Continue the victory shot without changing finish order, lap times or the saved ghost.
function finishRoll(dt){
 if(mode==='gp')GrandPrix.settle();
 finishAge+=dt;const elapsed=Math.min(dt,Math.max(0,4.8-(finishAge-dt)));
 if(elapsed<=0)return;worldT+=elapsed;
 for(const r of cars){
  r.u*=Math.exp(-elapsed*1.12);
  const dest=track.d.stages?Math.min(r.s+r.u*elapsed,track.finishFraction*track.L+9):r.s+r.u*elapsed;
  let q=track.at(dest,r.l);
  const hit=track.solids.queryWorld(r.x,r.y,r.z,q.x,q.y+.095,q.z,.81,1.52,worldT);
  const u=hit?Math.max(0,hit.time-.012):1,next=mix(r.s,dest,u);
  if(hit){r.u=0;q=track.at(next,r.l)}
  r.odo+=Math.max(0,next-r.s);r.s=next;r.x=q.x;r.y=q.y+.095;r.z=q.z;r.hd+=angle(q.yaw-r.hd)*(1-Math.exp(-elapsed*7));
  r.vx=r.u*Math.sin(q.yaw);r.vz=r.u*Math.cos(q.yaw);r.roll=mix(r.roll,q.bank,1-Math.exp(-elapsed*7));r.groundY=q.y;r.road={...q,s:r.s,l:r.l,w:track.width(r.s)};
  r.wingOpen=Math.max(0,r.wingOpen-elapsed*5.8);r.rampFlight=false;r.delta*=Math.exp(-elapsed*9);r.spin=0;r.boost=0;r.drift=0;r.slip=0;r.trickSpin=0;r.grounded=true;
 }
}
