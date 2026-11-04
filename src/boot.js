let audioBank=0,lastAudioMode='',physicsWake=0;
function updateGame(dt){
 ambientT+=dt;let runningTime=dt;const paused=screen==='pause'||screen==='help';
 if(!paused){toastT=Math.max(0,toastT-dt);annT=Math.max(0,annT-dt)}
 if(screen==='countdown'&&!gridStarting()){GridCharge.tick(Math.min(dt,Math.max(0,count)));count-=dt;let n=Math.ceil(count);if(n>0&&n<=3&&countLast!==n){countLast=n;banner(String(n),.83);fxEvent('count')}
 if(count<=0){runningTime=Math.max(0,-count);count=0;rocketStart=GridCharge.launch();if(rocketStart){gridBoost(me,rocketStart);notice('火箭起步！',1.1);fxEvent('boost')}changeScreen('race');banner('GO!',.84);captureEcho(true);fxEvent('go')}}
 if(screen==='race'){
  tickBank=Math.min(.30,tickBank+runningTime);
  // Repay a late display tick in small slices so touch events get another turn.
  const deadline=performance.now()+3.4;let ticks=0;
  while(tickBank+1e-9>=STEP&&screen==='race'&&ticks<6){
   stepRace(STEP);tickBank=Math.max(0,tickBank-STEP);if(++ticks>=2&&performance.now()>=deadline)break;
  }
  if(tickBank>=STEP&&!physicsWake&&screen==='race'){
   physicsWake=setTimeout(()=>{
    physicsWake=0;if(screen==='race'&&!document.hidden&&tickBank>=STEP)advanceClock(performance.now());
   },4);
  }
 }
 if(screen==='finish'){
  finishRoll(dt);
  FinishReading.tick(dt,finishWindowActive&&!document.hidden&&!DeviceShell.modalOpen&&!DeviceShell.resultHidden);
 }
 const audioMode=screen==='race'?'race':screen==='countdown'?'countdown':screen==='garage'||screen==='menu'?'menu':screen==='finish'?'finish':'pause';
 audioBank+=dt;
 if(audioBank>=.028||audioMode!==lastAudioMode){lastAudioMode=audioMode;const elapsed=audioBank;audioBank=0;
 if(!noSound)try{KartAudio.tick(elapsed,me.u/raceTiers[cc].redline,audioMode,me.drift?Math.min(1,me.charge+.15):0,course,me.lap,track.d.laps,{podium:screen==='finish'&&mode==='gp'&&GrandPrix.complete,cupFinal:mode==='gp'&&course===definitions.length-1,startIn:screen==='countdown'&&count<3.45?count:null,cc,starRemaining:me.star,holdingStar:me.item==='star',itemRace:mode!=='tt',raceTime:clock,speedMS:me.u,throttle:DriveBindings.auto||inputs.gas,chargeHeld:typeof GridCharge!=='undefined'&&GridCharge.held,launchCharge:typeof GridCharge!=='undefined'?GridCharge.level:0,slip:me.slip,driftBlend:me.driftBlend,boostStrength:me.boostStrength,grounded:me.grounded,brake:inputs.brake,surface:(track.d.surfaces||[]).some(g=>me.road.f>=g.f0&&me.road.f<=g.f1)?'ice':track.d.id})}catch{noSound=true}}
 if(ambientT-lastUI>.06||lastUI<0){UI.update(state());lastUI=ambientT}
 mapClock-=dt;if(mapClock<=0&&(screen==='menu'||screen==='countdown'||screen==='race')){mapClock=screen==='menu'?.32:.066;paintMini()}
}
// Keyboard aliases release independently. A finger resting on the same cap is tracked by the UI.
const faceIds={A:'itemBtn',B:'driftBtn',X:'brakeBtn',Y:'rearBtn'};
function capNode(slot){return faceIds[slot]?byId(faceIds[slot]):document.querySelector('[data-dir="'+slot+'"]')}
function arrowHint(code,pressed){
 if(code.startsWith('Arrow'))capNode(code.slice(5).toLowerCase())?.classList.toggle('keyDown',pressed);
}
function syncKeyHints(){
 const nub=byId('steer').querySelector('.nub'),direction=keyboardSteer();
 if(direction)nub.style.setProperty('--keyJoy',direction);else nub.style.removeProperty('--keyJoy');
 for(const slot of DriveBindings.slots){const a=DriveBindings.capAction(slot);capNode(slot)?.classList.toggle('keyDown',!!a&&DriveBindings.down(a,keys))}
}
let finishWindowActive=true;
const finishCodes=new Set(['Enter','NumpadEnter','Space','KeyA','KeyB','Escape']);
window.addEventListener('keydown',e=>{
 if(!DeviceShell.modalOpen&&finishCodes.has(e.code)&&!e.repeat)FinishReading.down('key/'+e.code);
},true);
window.addEventListener('keyup',e=>{if(finishCodes.has(e.code))FinishReading.up('key/'+e.code)},true);
// Include a projected cabinet's press even if it began before the flag. Direct
// actions still go through permit(); scroll/tabs remain usable during the hold.
window.addEventListener('pointerdown',e=>{
 if(DeviceShell.modalOpen||e.button!==0||!e.target.closest?.('#console'))return;
 if(ModelCabinet.shellGesture(e))return;
 if(e.target.closest('#gpScoreScroll,#gpStageTab,#gpTotalTab,#resultsList'))return;
 FinishReading.down('pointer/'+e.pointerId);
},true);
for(const event of ['pointerup','pointercancel'])window.addEventListener(event,e=>FinishReading.up('pointer/'+e.pointerId),true);
window.addEventListener('focus',()=>{finishWindowActive=true;FinishReading.suspend()});
window.addEventListener('keydown',e=>{
 if(typeof DeviceShell!=='undefined'&&DeviceShell.modalOpen||e.altKey||e.ctrlKey||e.metaKey)return;
 const k=e.code,live=screen==='race'||screen==='countdown';
 if(e.target.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return;
 if(k==='Enter'&&e.target.closest?.('button')){if(e.repeat)e.preventDefault();return}
 const binding=DriveBindings.keyAction(k);
 if(k==='Escape'||binding==='pause'&&(live||screen==='pause')){
  e.preventDefault();if(e.repeat)return;
  if(live)pauseRace();else if(k==='Escape')UI.menuButton('B');else if(screen==='pause')resume();
  return;
 }
 if(!live){
  if(k==='Enter'||k==='KeyA'||k==='KeyB'){
   e.preventDefault();if(!e.repeat)UI.menuButton(k==='KeyB'?'B':'A');
  }else if(k==='ArrowLeft'||k==='ArrowRight'){
   if((screen==='garage'||screen==='menu'||screen==='finish'&&mode==='gp')&&!e.repeat){if(UI.menuDirection(k==='ArrowLeft'?'left':'right'))arrowHint(k,true)}
   e.preventDefault();
  }
  return;
 }
 if(k==='Enter'){e.preventDefault();if(!e.repeat)pauseRace();return}
 if(!binding)return;
 e.preventDefault();
 if(keys[k]||e.repeat)return;
 keys[k]=true;syncKeyHints();
 if(binding==='recover')actions.recover();
 else if(binding==='rear')syncRearView();
 else if(binding==='item')actions.itemButton(true,k);
 else queueControls(e.timeStamp);
});
window.addEventListener('keyup',e=>{
 const k=e.code,binding=DriveBindings.keyAction(k);if(!keys[k]){if(screen!=='race'&&screen!=='countdown')arrowHint(k,false);return}
 delete keys[k];syncKeyHints();
 if(binding==='rear')syncRearView();else if(binding==='item')actions.itemButton(false,k);else queueControls(e.timeStamp);
});
function onHide(){if(screen==='countdown'||screen==='race')pauseRace();inputReset()}
window.addEventListener('blur',()=>{finishWindowActive=false;FinishReading.suspend(true);onHide()});
document.addEventListener('visibilitychange',()=>{FinishReading.suspend(true);if(document.hidden)onHide();else finishWindowActive=typeof document.hasFocus!=='function'||document.hasFocus()});
window.addEventListener('resize',()=>{miniKey='';mapClock=0});
const gameCanvas=byId('scene');gameCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onHide();notice('显卡连接已中断，请刷新继续',6)});
let frameTs=0,lastDraw=0,nextDraw=0,lastRate=0,rasterWaiting=false,panelHz=60;
const syncPeriods=new Float64Array(24);let syncN=0,vsyncStamp=0;
function sampleRefresh(ms){
 const delta=ms-vsyncStamp;vsyncStamp=ms;
 if(delta<4||delta>24)return;
 syncPeriods[syncN++%24]=delta;if(syncN%24)return;
 const sorted=syncPeriods.slice().sort(),median=sorted[11];
 if(sorted[17]-sorted[6]>1.3)return;
 const hz=1000/median;
 for(const rate of [60,72,75,90,100,120,144,165,180,240])if(Math.abs(rate-hz)<rate*.038){panelHz=rate;break}
}
function renderRate(){
 if(screen==='help'||screen==='pause')return 10;
 if(screen==='menu'||screen==='garage'||screen==='finish')return panelHz/Math.max(1,Math.round(panelHz/30));
 const budget=renderer.g?(panelHz<=100?100:82):renderer.cpu instanceof WorkerRaster?(frameWindow.unlocked&&panelHz<=100?100:75):frameWindow.unlocked?75:33;
 const cap=frameWindow.limit?Math.min(frameWindow.limit,budget):budget;
 return panelHz/Math.max(1,Math.ceil(panelHz/cap-1e-6));
}
// Sample work on the selected backend. Worker rasterization can run in
// parallel with physics; on the synchronous path those costs share a thread.
const frameCosts={updates:0,logic:0,submit:0,present:0,work:0,samples:0,period:0};
renderer.optionalBudget=1;
function noteFrameCost(submit,period){
 const w=frameWindow;
 const last=w.count?w.work[(w.count-1)%w.work.length]:frameCosts.present;
 frameCosts.logic=frameCosts.updates;frameCosts.submit=submit;frameCosts.present=last;frameCosts.period=period;
 const main=submit+frameCosts.updates;
 const work=renderer.cpu instanceof WorkerRaster?Math.max(main,last):Math.max(submit,last,renderer.gpuCost||0)+frameCosts.updates;
 frameCosts.updates=0;frameCosts.samples++;
 if(screen!=='race'&&screen!=='countdown'){frameCosts.work=0;renderer.optionalBudget=1;return}
 frameCosts.work=mix(frameCosts.work||work,Math.min(work,period*3),work>frameCosts.work?.21:.07);
 // Leave time for touch, DOM compositing and driver work outside this JS.
 // Optional accents recede first; the existing resolution policy stays in charge.
 const room=clamp((period*.86-frameCosts.work)/(period*.46),0,1);
 renderer.optionalBudget=mix(renderer.optionalBudget,room,room<renderer.optionalBudget?.18:.055);
}
let frozenScreen='',frozenFitW=0,frozenFitH=0,frozenDetail=0,frozenTrack=null;
function drawDue(ms){
 if(ms+.65<nextDraw)return;
 if(DeviceShell.sceneHidden){frameCosts.updates=0;nextDraw=ms+1000/Math.max(1,lastRate);rasterWaiting=false;return}
 const frozen=screen==='pause'||screen==='help';
 if(frozen){
  const fit=renderer.cssSize();
  if(frozenScreen===screen&&frozenTrack===track&&fit.width===frozenFitW&&fit.height===frozenFitH&&renderer.extraDetail===frozenDetail){
   frameCosts.updates=0;nextDraw=ms+1000/lastRate;rasterWaiting=false;return;
  }
  if(!renderer.cpu?.busy){frozenScreen=screen;frozenTrack=track;frozenFitW=fit.width;frozenFitH=fit.height;frozenDetail=renderer.extraDetail}
 }else{frozenScreen='';frozenTrack=null}
 if(renderer.cpu?.busy){rasterWaiting=true;return}
 rasterWaiting=false;const elapsed=Math.min(.18,Math.max(0,(ms-lastDraw)/1000)),interval=1000/lastRate;
 lastDraw=ms;nextDraw+=Math.max(1,1+Math.floor((ms+.65-nextDraw)/interval))*interval;
 if(renderer.cpu instanceof WorkerRaster)renderer.cpu.sampleAt=frameTs;
 const start=performance.now();render(elapsed);noteFrameCost(performance.now()-start,interval);
}
let activeInputUntil=0;
function noteDrivingInput(now){
 activeInputUntil=now+170;
}
function advanceClock(ms){
 if(frameTs&&ms<=frameTs)return;
 const dt=frameTs?Math.min(.17,(ms-frameTs)/1000):.016;
 frameTs=ms;const start=performance.now();updateGame(dt);frameCosts.updates+=performance.now()-start;
}
let workerWake=0;
function resumeRaster(){
 // A missed slot can start immediately even if v-sync has not yet presented
 // the last bitmap. Hold one finished bitmap and at most one in-flight frame.
 if(document.hidden||!lastRate)return;
 const now=performance.now(),cpu=renderer.cpu;
 // Commit a steering response before the browser composites the next display
 // tick. On a throttled rAF the worker can also deliver a complete frame itself.
 if(cpu.ready&&(now<activeInputUntil||now-lastVsync>1000/panelHz*1.5)){
  cpu.lockPresent=false;presentRate=0;cpu.present(renderer);
 }
 const starved=now-lastVsync>1000/panelHz*1.5;
 if(now+.65>=nextDraw&&(rasterWaiting||starved)){advanceClock(now);drawDue(now)}
 else if(starved&&!workerWake&&screen==='race'){
  // If the worker finishes early, wake once at the true draw deadline. A
  // busy worker wakes us on completion; an idle worker never waits a full tick.
  workerWake=setTimeout(()=>{
   workerWake=0;if(!document.hidden&&!cpu.busy&&performance.now()-lastVsync>1000/panelHz*1.45)gameFrame(performance.now(),true);
  },Math.max(1,nextDraw-now));
 }
}
let presentAt=0,presentRate=0,presentPanel=0;
function presentRaster(ms,hz,heartbeatTick){
 const cpu=renderer.cpu;cpu.onready=resumeRaster;
 cpu.lockPresent=!heartbeatTick&&screen==='race'&&panelHz>hz&&syncN>=24&&ms>=activeInputUntil;
 if(!cpu.lockPresent){presentRate=0;cpu.present(renderer);return}
 const interval=1000/hz;
 if(hz!==presentRate||panelHz!==presentPanel){
  presentRate=hz;presentPanel=panelHz;presentAt=(lastRate===hz?nextDraw:ms)+(panelHz>=120?1000/panelHz:0);
 }
 if(ms+.65<presentAt)return;
 const cutoff=ms-interval-(panelHz>=120?1000/panelHz:0)+.65;
 presentAt+=Math.max(1,1+Math.floor((ms+.65-presentAt)/interval))*interval;cpu.present(renderer,cutoff);
}
function gameFrame(ms,heartbeatTick=false){
 if(document.hidden){frameTs=0;lastRate=0;rasterWaiting=false;frameCosts.updates=0;cancelGridWarm();return}
 if(renderer.cpu instanceof WorkerRaster)presentRaster(ms,renderRate(),heartbeatTick);
 if(frameTs&&ms<frameTs)ms=frameTs;
 advanceClock(ms);
 if(screen==='menu'||screen==='countdown')warmGarageGrid();
 const hz=renderRate();if(hz!==lastRate){lastRate=hz;nextDraw=ms;lastDraw=ms-1000/hz}
 drawDue(ms);
}
// Some embedded browsers throttle rAF even while a visible canvas is receiving worker frames.
let lastVsync=performance.now(),heartbeat=0;
function animate(ms){requestAnimationFrame(animate);lastVsync=performance.now();sampleRefresh(ms);gameFrame(ms)}
function syncHeartbeat(){
 clearTimeout(heartbeat);
 if(document.hidden)return;
 const now=performance.now(),silence=now-lastVsync,live=screen==='race'||screen==='countdown';
 // A visible embedding can deliver long, irregular rAF gaps. Wake just after a
 // missed refresh, then follow the same fractional drawing clock as real v-sync.
 const grace=live?Math.max(19,1000/panelHz*1.4):45;
 if(silence>=grace)gameFrame(now,true);
 const active=silence>=grace,period=1000/(lastRate||60);
 // While a worker is late, its completion will request the next scene.
 // Don't poll an expired deadline at 2 ms intervals.
 const wait=active?(renderer.cpu?.busy?Math.min(period,16.67):Math.max(5,Math.min(period,nextDraw-performance.now()))):Math.max(5,grace-silence);
 heartbeat=setTimeout(syncHeartbeat,wait);
}
document.addEventListener('visibilitychange',()=>{lastVsync=performance.now();syncHeartbeat()});
// A first visit to the itinerary or the settings is also an audio gesture.
function unlockFirstGesture(e){
 if(!e.isTrusted||!sound||document.hidden||e.target?.closest?.('#soundToggle'))return;
 if(e.type==='keydown'&&(e.metaKey||e.altKey||e.ctrlKey||['Shift','Control','Alt','Meta'].includes(e.key)))return;
 window.removeEventListener('pointerup',unlockFirstGesture,true);
 window.removeEventListener('keydown',unlockFirstGesture,true);
 soundUnlock();
}
window.addEventListener('pointerup',unlockFirstGesture,true);
window.addEventListener('keydown',unlockFirstGesture,true);
if(mode==='gp')GrandPrix.prepareMenu();
loadCircuit();setup(false);UI.init(actions);DeviceShell.init();UI.show(state());paintMini();render(0);requestAnimationFrame(animate);syncHeartbeat();
