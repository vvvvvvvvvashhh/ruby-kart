const DeviceShell=(()=>{
 const skins=['3ds','switch','wiiu'];
 const cueStyles=['full','arrow','off'];
 const forms=['flat','model'];
 const shadows={
  low:'车边保留细投影，远处的动态阴影更新较慢。',
  standard:'附近道路保留清晰的栏杆、树枝和桁架投影，赛车和机关实时投影。',
  high:'扩大精细投影的范围，进一步细化轮胎、车手与滑翔翼的影子。'
 };
 const names={'3ds':'Nintendo 3DS',switch:'Nintendo Switch',wiiu:'Wii U GamePad'};
 let unit,studio,dialog,mapKey,input,page='hardware';
 let lastScene='',returnToRace=false,live=false,finishSide=false;
 let formReason='',opener=null;
 const isolated=new Set();
 let tutorStart=null,tutorFrame=0,tutorLevel=0,tutorOwner=null;
 const saved=(key,allowed,initial)=>{const x=readSave(key,initial);return allowed.includes(x)?x:initial};
 function pressed(selector,field,val){
  dialog.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[field]===val)));
 }
 function select(key,save=true){
  if(!skins.includes(key))key='3ds';
  if(save&&unit.dataset.skin===key)return;
  unit.dataset.skin=key;studio.dataset.device=key;
  for(const b of byId('machinePicker').querySelectorAll('[data-choice]'))b.setAttribute('aria-pressed',String(b.dataset.choice===key));
  const keyName=key==='3ds'?'SELECT':key==='wiiu'?'− / SELECT':'左下方形键';
  byId('settingsKey').setAttribute('aria-label',keyName+' · 游戏设置');
  byId('settingsKey').title=keyName+' · 打开或关闭游戏设置';
  byId('deviceHeadingModel').textContent=names[key];
  byId('deviceEdition').textContent={'3ds':'宝石红 · 双屏',switch:'霓虹红蓝 · 单屏',wiiu:'珍珠白 · 单屏'}[key];
  const icon=byId('machinePicker').querySelector('[data-choice="'+key+'"]').querySelector('svg');
  if(icon)byId('settingHardwareMark').replaceChildren(icon.cloneNode(true));
  if(typeof ModelCabinet!=='undefined')ModelCabinet.setSkin(key);
  if(save)writeSave('deviceSkin',key);
  byId('deviceHint').textContent=key==='3ds'?'3DS 上屏驾驶，下屏查看地图。':'赛车、车库和比赛仪表共用机身内的屏幕。';
  viewFor(screen,true);drawGuide();
 }
 function setView(panel){
  const single=unit.dataset.skin!=='3ds';
  unit.dataset.view=panel?'panel':'main';
  if(!single||!live)unit.dataset.mapZoom='false';
  syncMapKey();
  byId('upper').inert=single&&panel;byId('lower').inert=single&&!panel;
  placePanel();
  frozenScreen='';nextDraw=0;mapClock=0;
  if(typeof ModelCabinet!=='undefined')ModelCabinet.refresh();
 }
 // The physical LCD may be rotated or projected. Its untransformed content
 // box determines whether half a screen has enough room for readable results.
 function placeResult(){
  const upper=byId('upper'),single=unit.dataset.skin!=='3ds',finish=lastScene==='finish';
  const pane=byId('finishPane'),host=single&&finish?upper:byId('lower');
  if(pane.parentElement!==host){
   const focused=document.activeElement,restore=focused&&pane.contains?.(focused);
   host.append(pane);if(restore&&focused.isConnected)focused.focus({preventScroll:true});
  }
  const side=single&&finish&&upper.clientWidth>=320&&upper.clientWidth>=upper.clientHeight*1.38&&upper.clientHeight>0;
  const layout=finish?(single?(side?'side':'full'):'dual'):'';
  if(upper.dataset.finishLayout!==layout){
   upper.dataset.finishLayout=layout;finishSide=side;nextDraw=0;frozenScreen='';
  }
 }
 function viewFor(scene,force=false){
  if(!unit||(!force&&lastScene===scene))return;
  lastScene=scene;live=scene==='race'||scene==='countdown';
  SingleDisplay.view(unit.dataset.skin,scene);
  setView(!live&&scene!=='menu'&&scene!=='garage'&&!(scene==='finish'&&unit.dataset.skin!=='3ds'));
  placeResult();
 }
 function syncMapKey(){
  const single=unit.dataset.skin!=='3ds',zoom=unit.dataset.mapZoom==='true';
  const name=unit.dataset.skin==='switch'?'− 键':'TV';
  mapKey.disabled=!single||!live;
  mapKey.setAttribute('aria-pressed',String(zoom));
  mapKey.setAttribute('aria-label',name+' · '+(zoom?'缩小实时地图':'放大实时地图'));
  mapKey.title=mapKey.getAttribute('aria-label');
 }
 function toggleMap(){
  if(!live||unit.dataset.skin==='3ds'||dialog.open)return;
  unit.dataset.mapZoom=String(unit.dataset.mapZoom!=='true');syncMapKey();
 }
 function syncForm(active,reason=''){
  const model=active==='model';
  formReason=reason;
  byId('modelViewToolbar').hidden=!model;
  for(const input of dialog.querySelectorAll('[name="deviceForm"]'))input.checked=input.value===active;
  const hint=model?'拖动外壳旋转掌机。另一根手指可以同时转向或按键。点「回正」回到正面。':'机身锁定正面。切换到立体模型后，可以拖动同一台掌机查看背面。';
  byId('deviceFormHint').textContent=reason||hint;
 }
 function selectForm(value,save=true){
  if(!forms.includes(value))return;
  const actual=typeof ModelCabinet==='undefined'?'flat':ModelCabinet.setForm(value);
  const failed=actual!==value;
  const compatibility=typeof ModelCabinet==='undefined'||ModelCabinet.projected===false;
  syncForm(actual,failed||compatibility?(formReason||'此设备无法绘制机身，已启用兼容平面显示。'):'');
  if(save&&!writeSave('deviceForm',value))byId('deviceFormHint').textContent+=' 本次已应用，浏览器未能保存此选择。';
  frozenScreen='';nextDraw=0;
 }
 function syncExtras(){
  for(const [source,dest,title] of [['soundToggle','settingsSound','声音'],['tiltBtn','settingsTilt','体感']]){
   const on=byId(source).getAttribute('aria-pressed')==='true',button=byId(dest);
   button.setAttribute('aria-pressed',String(on));button.textContent=title+' · '+(on?'开':'关');
  }
  const status=byId('tiltMsg');
  byId('motionHint').textContent=status.textContent&&!status.hidden?status.textContent:'开启体感后可倾斜手机观察机身反光。';
  syncRenderStats();
 }
 function syncRenderStats(){
  const stats=byId('racePerf');stats.hidden=byId('fpsToggle').getAttribute('aria-pressed')!=='true';
  if(!stats.hidden)stats.textContent=typeof frameWindow!=='undefined'&&frameWindow.lastRaceReport?'最近比赛　'+frameWindow.lastRaceReport:'跑一段比赛后，这里会显示本机帧率和帧时间。';
 }
 function selectShadow(key,save=true){
  if(!Object.hasOwn(shadows,key))return;
  WorldShadows.setQuality(key);
  const active=WorldShadows.getQuality();
  for(const radio of dialog.querySelectorAll('[name="shadowQuality"]'))radio.checked=radio.value===active;
  const persisted=!save||writeSave('shadowQuality',active);
  byId('shadowHint').textContent=shadows[active]+(persisted?'':' 本次已应用，浏览器未能保存此选择。');
  frozenScreen='';nextDraw=0;
 }
 function selectCue(key,save=true){
  if(!cueStyles.includes(key))return;
  studio.dataset.cue=key;pressed('[data-cue-choice]','cueChoice',key);
  byId('cueHint').textContent={full:'中央显示弯型和距离，路面箭头标出方向。临近弯道时提示变为金色，入弯时变为宝石红。',arrow:'中央只保留箭头与进度条，路面箭头仍会显示。金色表示准备入弯，宝石红表示现在入弯。',off:'隐藏中央提示和路面箭头，仍可在地图上查看路线。'}[key];
  if(save)writeSave('turnCue',key);
 }
 function drawGuide(){
  const key=unit.dataset.skin,keyboard=input==='keys',auto=DriveBindings.auto;
  const label=a=>DriveBindings.label(a,keyboard?'keys':'pad'),drift=label('drift'),item=label('item'),gas=label('gas');
  pressed('[data-input]','input',input);byId('guideHardware').textContent=names[key];
  const bindings=[
   ['菜单确认',keyboard?'← → 选择，Enter 确认':'方向键选择，A 确认'],
   ['火箭起步','第二盏灯亮时按住 '+item+'，保持到绿灯'],
   ['油门',auto?'自动给油':'按住 '+gas],['转向',(keyboard?'':'摇杆或 ')+label('left')+' ／ '+label('right')],
   ['漂移 / 特技',drift],['刹车',label('brake')],['道具 / 防御',item],['后视','按住 '+label('rear')],
   ['回到赛道',label('recover')],['暂停 / 继续',keyboard?label('pause'):key==='3ds'?'START':'＋']
  ];
  byId('driveBindings').replaceChildren(...bindings.flatMap(([label,value])=>{
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;return [dt,dd]
  }));
  const steps=['转向并起跳','按住 '+drift,'出弯松手'];
  byId('driftSteps').replaceChildren(...steps.map((msg,i)=>{const step=document.createElement('span');step.textContent=(i+1)+'　'+msg;return step}));
  byId('tutorHelp').textContent=keyboard?'按住 '+drift+'，看到火花后松开。也可以按住下方按钮练习。':'长按下方按钮，等火花变色再松手。比赛中，转向时按住 '+drift+'。';
  byId('unitHow').textContent=(auto?'赛车自动给油。':'按住 '+gas+' 加速，松手收油。')+'按住 '+item+' 可以拖住香蕉或单个龟壳，松开投出。翼展开后点按 '+drift+' 做滑翔特技；若正按住，先松开再按。'+(key==='3ds'?'下屏可看地图，SELECT 打开游戏设置。':(key==='switch'?'左下方形键打开设置，− 键放大地图，HOME 返回赛事主界面。':'按 TV 键放大地图，按 SELECT 打开设置。'));
 }
 function practiceStart(source){
  if(tutorOwner!==null||page!=='guide'||!dialog.open)return;
  tutorOwner=source;tutorStart=performance.now();tutorLevel=-1;
  const btn=byId('driftTutor'),out=byId('tutorResult');
  const tick=now=>{
   if(tutorStart===null)return;
   const charge=(now-tutorStart)*.001*1.28,level=chargeLevel({charge});
   btn.style.setProperty('--fill',String(Math.min(1,charge/2.9)));
   if(level!==tutorLevel){tutorLevel=level;btn.dataset.level=level;out.textContent=['保持按住，等待轮胎起火花。','蓝色火花 · 松手可获得迷你涡轮','橙色火花 · 松手可获得超级涡轮','紫色火花 · 松手可获得究极涡轮'][level]}
   if(level<3)tutorFrame=requestAnimationFrame(tick)
  };
  tick(tutorStart);
 }
 function practiceEnd(source,cancel=false){
  if(tutorOwner===null||source!==tutorOwner)return;
  // Release can arrive between screen repaints, especially in an embedded preview.
  // Measure the actual hold rather than reading the last animated bar.
  tutorLevel=chargeLevel({charge:(performance.now()-tutorStart)*.00128});
  cancelAnimationFrame(tutorFrame);tutorStart=null;tutorOwner=null;
  const btn=byId('driftTutor');btn.style.setProperty('--fill','0');btn.dataset.level='0';
  byId('tutorResult').textContent=cancel?'可以重新练习。':['松得早了一点，按到出现蓝色火花再松。','迷你涡轮！下次试着蓄到橙色。','超级涡轮！长弯里可以继续蓄到紫色。','究极涡轮！'][tutorLevel];tutorLevel=0;
 }
 function bindChanged(){drawGuide();UI.refreshLabels()}
 function showPage(k){
  if(!['hardware','drive','guide'].includes(k))k='hardware';
  if(typeof DriveSetup!=='undefined')DriveSetup.cancelCapture();
  practiceEnd(tutorOwner,true);page=k;pressed('[data-page]','page',k);
  for(const [tab,id] of [['hardware','hardwarePage'],['drive','drivePage'],['guide','controlsPage']]){
   const pane=byId(id);pane.hidden=k!==tab;if(k===tab)pane.scrollTop=0;
  }
 }
 function clearIsolation(){for(const node of isolated)node.inert=false;isolated.clear()}
 function isolatePanel(){
  clearIsolation();
  // Keep both physical exits connected even when their wrappers are projected.
  const liveBranches=new Set();
  for(const origin of [dialog,byId('settingsKey'),byId('homeKey')]){
   for(let n=origin;n&&n!==studio;n=n.parentElement)liveBranches.add(n);
  }
  for(const branch of liveBranches){
   for(const sibling of branch.parentElement?.children||[]){
    if(liveBranches.has(sibling)||sibling.inert)continue;
    sibling.inert=true;isolated.add(sibling);
   }
  }
 }
 function placePanel(){
  const lower=unit.dataset.skin==='3ds'||unit.dataset.view==='panel';
  const host=byId(lower?'lower':'upper');
  if(dialog.parentElement===host)return;
  if(dialog.open)clearIsolation();
  host.append(dialog);
  if(dialog.open)isolatePanel();
 }
 function navigationKey(e){
  if(e.defaultPrevented)return;
  if(e.code==='Escape'){e.preventDefault();e.stopPropagation();dismiss();return}
  if(e.key!=='Tab')return;
  // Native radio groups occupy a single tab stop. Keep arrow-key selection.
  const stops=[...dialog.querySelectorAll('button,input,summary,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length&&(n.type!=='radio'||n.checked));
  const at=stops.indexOf(document.activeElement),next=e.shiftKey?at-1:at+1;
  if(!stops.length||at>=0&&next>=0&&next<stops.length)return;
  e.preventDefault();stops[e.shiftKey?stops.length-1:0].focus();
 }
 function dismiss(goHome=false){
  if(!dialog.open)return;
  if(typeof DriveSetup!=='undefined')DriveSetup.cancelCapture();
  practiceEnd(tutorOwner,true);dialog.open=false;dialog.hidden=true;byId('settingsKey').setAttribute('aria-expanded','false');clearIsolation();
  const resume=returnToRace;returnToRace=false;
  if(resume&&!goHome&&screen==='pause')actions.resume();
  const focus=goHome?byId('homeKey'):opener?.isConnected&&!opener.closest('[hidden],[inert]')?opener:byId('settingsKey');
  focus.focus({preventScroll:true});opener=null;frozenScreen='';nextDraw=0;
 }
 function syncAssist(){
  const b=byId('cornerAssist');b.setAttribute('aria-pressed',String(assist));b.textContent=assist?'已开启':'已关闭';
 }
 function open(next='hardware',source=document.activeElement){
  if(dialog.open)return;
  opener=source;
  if(typeof RaceChooser!=='undefined'&&RaceChooser.open)RaceChooser.close(false);
  if(screen==='finish')FinishReading.suspend();
  if(typeof ModelCabinet!=='undefined'&&ModelCabinet.getForm()==='model')ModelCabinet.view('front');
  returnToRace=screen==='race'||screen==='countdown';
  if(returnToRace)actions.pause();
  placePanel();syncAssist();syncExtras();showPage(next);dialog.hidden=false;dialog.open=true;byId('settingsKey').setAttribute('aria-expanded','true');isolatePanel();
  dialog.querySelector('[data-page="'+page+'"]').focus({preventScroll:true});
 }
 function telemetry(s){SingleDisplay.update(s)}
 function init(){
  unit=byId('console');studio=byId('studio');dialog=byId('deviceDialog');mapKey=byId('mapKey');
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(lastScene==='finish')placeResult()}).observe(byId('upper'));
  window.addEventListener('modelcabinetchange',e=>{
   const state=e.detail;
   if(!state||!forms.includes(state.form))return;
   syncForm(state.form,state.reason||'');
   if(dialog.open)isolatePanel();
  });
  for(const [id,target] of [['modelFront','front'],['modelRear','rear']]){
   const button=byId(id);
   button.onclick=()=>{if(typeof ModelCabinet!=='undefined'&&ModelCabinet.getForm()==='model')ModelCabinet.view(target)};
   for(const event of ['keydown','keyup'])button.addEventListener(event,e=>{
    if(e.code==='Enter'||e.code==='Space')e.stopPropagation();
   });
  }
  byId('settingsSound').onclick=()=>{actions.sound();syncExtras()};
  byId('settingsTilt').onclick=()=>{byId('tiltBtn').click();syncExtras()};
  if(typeof MutationObserver!=='undefined'){
   const observer=new MutationObserver(()=>{if(dialog.open)syncExtras()});
   for(const id of ['tiltBtn','soundToggle'])observer.observe(byId(id),{attributes:true,attributeFilter:['aria-pressed']});
   observer.observe(byId('tiltMsg'),{attributes:true,attributeFilter:['hidden'],childList:true});
  }
  SingleDisplay.init();input=saved('guideInput',['keys','pad'],matchMedia('(pointer:coarse)').matches?'pad':'keys');
  for(const id of ['displayMode','fpsToggle']){const button=byId(id);button.type='button';byId('renderSettings').append(button)}
  byId('fpsToggle').addEventListener('click',syncRenderStats);
  byId('renderSettings').after(byId('racePerf'));
  byId('mixSettings').append(byId('scoreVolume').closest('label'));
  byId('cornerAssist').onclick=()=>{actions.assist();syncAssist()};
  for(const b of studio.querySelectorAll('[data-open-settings]'))b.onclick=()=>open('hardware',b);
  const settingsKey=byId('settingsKey');
  settingsKey.onclick=()=>dialog.open?dismiss():open('hardware',settingsKey);
  byId('homeKey').onclick=()=>{
   if(dialog.open)dismiss(true);
   if(typeof RaceChooser!=='undefined'&&RaceChooser.open)RaceChooser.close(false);
   if(screen!=='menu')actions.menu();
  };
  byId('guideDevice').onclick=()=>open('guide',byId('guideDevice'));mapKey.onclick=toggleMap;
  for(const b of byId('machinePicker').querySelectorAll('[data-choice]'))b.onclick=()=>select(b.dataset.choice);
  for(const radio of dialog.querySelectorAll('[name="deviceForm"]'))radio.onchange=()=>{if(radio.checked)selectForm(radio.value)};
  for(const radio of dialog.querySelectorAll('[name="shadowQuality"]'))radio.onchange=()=>{if(radio.checked)selectShadow(radio.value)};
  for(const b of dialog.querySelectorAll('[data-cue-choice]'))b.onclick=()=>selectCue(b.dataset.cueChoice);
  for(const b of dialog.querySelectorAll('[data-input]'))b.onclick=()=>{practiceEnd(tutorOwner,true);input=b.dataset.input;writeSave('guideInput',input);drawGuide()};
  for(const b of dialog.querySelectorAll('[data-page]'))b.onclick=()=>showPage(b.dataset.page);
  for(const b of unit.querySelectorAll('[data-skin-power]'))b.onclick=()=>{if(screen==='race'||screen==='countdown')actions.pause();else if(screen==='pause'||screen==='help')actions.resume();else if(screen!=='menu')actions.menu()};
  const tutor=byId('driftTutor');
  tutor.onpointerdown=e=>{if(e.button>0)return;e.preventDefault();tutor.setPointerCapture(e.pointerId);practiceStart(e.pointerId)};
  tutor.onpointerup=e=>practiceEnd(e.pointerId);tutor.onlostpointercapture=tutor.onpointercancel=e=>practiceEnd(e.pointerId,true);
  dialog.addEventListener('keydown',e=>{
   navigationKey(e);if(e.defaultPrevented)return;
   const isDrift=DriveBindings.keyAction(e.code)==='drift'&&(e.code!=='Space'||e.target===tutor||!e.target.closest('button,input'));
   if(page==='guide'&&(isDrift||e.code==='Enter'&&e.target===tutor)){e.preventDefault();if(!e.repeat)practiceStart(e.code)}
  });
  dialog.addEventListener('keyup',e=>{if(e.code===tutorOwner){e.preventDefault();practiceEnd(e.code)}});
  for(const ev of ['pointerdown','pointerup','click','keydown','keyup'])dialog.addEventListener(ev,e=>e.stopPropagation());
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();dismiss()};
  dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
  window.addEventListener('focusin',e=>{if(dialog.open&&!dialog.contains(e.target)&&!e.target.closest?.('#settingsKey,#homeKey'))dialog.querySelector('[data-page="'+page+'"]').focus({preventScroll:true})});
  window.addEventListener('blur',()=>{practiceEnd(tutorOwner,true);if(typeof DriveSetup!=='undefined')DriveSetup.cancelCapture()});
  if(typeof DriveSetup!=='undefined')DriveSetup.mount(byId('driveSetupMount'),bindChanged);
  selectShadow(saved('shadowQuality',Object.keys(shadows),'standard'),false);
  selectCue(saved('turnCue',cueStyles,'full'),false);
  select(saved('deviceSkin',skins,'3ds'),false);
  selectForm(saved('deviceForm',forms,'model'),false);
 }
 // Do not draw an entire race or map into an LCD facing away from the player.
 const modelHides=id=>typeof ModelCabinet!=='undefined'&&ModelCabinet.panelVisible?.(id)===false;
 const resultDisplay=()=>unit?.dataset.skin==='3ds'?'lower':'upper';
 const panelHidden=id=>!!unit&&(dialog?.open&&dialog.parentElement===byId(id)||byId(id).inert||modelHides(id));
 return {init,viewFor,open,telemetry,get finishSide(){return finishSide},
 get resultHidden(){return panelHidden(resultDisplay())},get modalOpen(){return !!dialog?.open},get mapHidden(){return panelHidden('lower')},
 get sceneHidden(){return panelHidden('upper')||lastScene==='finish'&&unit?.dataset.skin!=='3ds'&&!finishSide}};
})();
