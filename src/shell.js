const rubySignature='<span class="signatureText">N1n3VASthR33H</span><svg class="signatureInk" aria-hidden="true" viewBox="0 0 233 34"><use href="#sigLetters" transform="translate(0 1.5)" fill="#9f4954" stroke="#38212f" stroke-width="1.5"/><use href="#sigLetters" fill="url(#sigFoil)"/><g mask="url(#sigCut)"><rect class="sigSweep" x="-50" y="0" width="46" height="34" fill="url(#sigSheen)"/></g></svg>';
const UI = (() => {
  const nodes=Object.create(null),el=id=>nodes[id]||(nodes[id]=document.getElementById(id));
  const all=q=>Array.from(document.querySelectorAll(q));
  const calls=(name,...args)=>{if(actions&&typeof actions[name]==='function')actions[name](...args)};
  const driverTitles=['马里奥','路易吉','碧姬','奇诺比奥','耀西','酷霸王','森喜刚','慢慢龟','金属马里奥','玫瑰金碧姬','红耀西','蓝奇诺比奥'];
  const portraits=['mario','luigi','peach','toad','yoshi','bowser','dk','koopa','mario','peach','yoshi','toad'];
  const englishDrivers=['Mario','Luigi','Peach','Toad','Yoshi','Bowser','Donkey Kong','Koopa Troopa','Metal Mario','Pink Gold Peach','Red Yoshi','Blue Toad'];
  const tints=['grayscale(1) contrast(1.15)','sepia(.68) hue-rotate(307deg) saturate(.76)','hue-rotate(247deg)','hue-rotate(198deg)'];
  const roles={body:'bodies',tire:'tires',wing:'wings',paint:'paints'};
  const rouletteArt=Object.keys(itemNames);
  const pron=itemNames;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const svg=(d,w=64,h=64)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" fill="none" aria-hidden="true">'+d+'</svg>';
  const symbols={wrench:svg('<path d="m12 47 19-19a13 13 0 0 1 15-16l-8 8 6 6 8-8a13 13 0 0 1-16 15L19 53Z" fill="currentColor"/><circle cx="17" cy="47" r="2.5" fill="#312535"/>'),
    flag:svg('<path d="M13 52 21 9" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M21 10q8-5 15 0t18 0l-4 22q-8 5-16 0t-17 0Z" fill="currentColor"/><g fill="#eab648"><path d="m25 13 7-1-1 6-7 1zm7 7 7 2-1 6-7-2zm10-5 7-1-1 6-7 1z"/></g>')};
  const toTime=t=>{let n=Math.max(0,Math.round((Number(t)||0)*1000));return Math.floor(n/60000)+':'+String(Math.floor(n/1000)%60).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0')};
  const num=(x,a,b)=>Math.max(a,Math.min(b,x));
  let impactOwner=null,state,actions,lastScreen='',tab='driver',cachedPart='',cachedResult='',lastItem='',lastAnn='',lastPlace='',lastCourse=-1,tiltMode=false,hasSensor=false,msgTimer,senseTimer;
  const partList=(key)=>(key==='driver'?driverTitles:((typeof GARAGE==='undefined'?{}:GARAGE)[roles[key]]||[]));
  const visible=(id,on)=>{const n=el(id);if(n.hidden===!!on)n.hidden=!on};
  const textAt=(id,text)=>{const e=el(id),s=String(text??'');if(e.textContent!==s)e.textContent=s};
  function toggleGroup(selector,val,attr,cls='on'){
    for(const b of all(selector)){const yes=b.getAttribute(attr)===String(val);b.classList.toggle(cls,yes);b.setAttribute('aria-pressed',String(yes))}
  }
  const pulseNames={wipe:'wipe',stamp:'stamp',flash:'itemFlash',paneIn:'slidePane',cueIn:'paceIn',gainTier:'tierLift',lapHit:'lapCut',tickerIn:'tickerArrival'};
  function pulse(node,cls){
    if(node.getAnimations&&node.classList.contains(cls)){
      const anim=node.getAnimations({subtree:cls==='wipe'}).find(a=>a.animationName===pulseNames[cls]);
      if(anim){anim.currentTime=0;return}
    }
    node.classList.add(cls);
  }
  function partPic(key,idx){
    if(key==='driver')return '<span style="display:block;height:100%;filter:'+(idx>=8?tints[idx-8]:'none')+'">'+iconArt(portraits[idx])+'</span>';
    let amber='#ffc56d',metal='#9aa7b5',ink='#41384b',color=(GARAGE.paints[state.cfg.paint]||GARAGE.paints[0]).hex;
    if(key==='paint'){let col=GARAGE.paints[idx].hex;return svg('<defs><radialGradient id="paintG" cx=".28" cy=".23" r=".82"><stop stop-color="#fff9e9"/><stop offset=".21" stop-color="'+col+'"/><stop offset=".75" stop-color="'+col+'"/><stop offset="1" stop-color="#332a3c"/></radialGradient></defs><path d="M11 41q1-25 26-31 15 1 18 16-2 18-20 27-18 7-24-12" fill="url(#paintG)" stroke="'+ink+'" stroke-width="2"/><path d="M16 32q8-16 22-18" stroke="#fff" opacity=".78" stroke-width="3" stroke-linecap="round"/>')}
    if(key==='tire'){let t=GARAGE.tires[idx];return svg('<ellipse cx="32" cy="54" rx="23" ry="3" fill="#c9b7bc"/><g transform="rotate(-17 32 31)"><ellipse cx="32" cy="31" rx="22" ry="25" fill="'+t.side+'" stroke="'+ink+'" stroke-width="3"/><ellipse cx="35" cy="31" rx="15" ry="21" fill="'+t.side+'" stroke="#9a8d9b" stroke-width="1.5"/><ellipse cx="35" cy="31" rx="9" ry="15" fill="'+t.rim+'" stroke="'+ink+'" stroke-width="3"/><ellipse cx="35" cy="31" rx="3.3" ry="6" fill="'+ink+'"/><path d="m16 20 4-3m-6 12 4-3m-2 14 4-4" stroke="#fff4" stroke-width="2"/></g>')}
    if(key==='wing'){let colors=[['#ef6356','#f7b94f'],['#fcf6df','#d1e7f0'],['#dcc33f','#8a6bad'],['#f8f3e7','#d2e0e2']][idx%4];return svg('<path d="m4 30 26-20q5-3 10 0l20 15-14 4-11-3-12 7Z" fill="'+colors[0]+'" stroke="'+ink+'" stroke-width="2"/><path d="m10 28 24-16-6 16-8 4zm24-15 18 12-12-1Z" fill="'+colors[1]+'"/><path d="m9 31 22 20 24-24m-31 3 7 21 10-24" stroke="'+ink+'" stroke-width="1.6"/><path d="m27 51 8-1" stroke="'+amber+'" stroke-width="4" stroke-linecap="round"/>')}
    let shape=['M8 39l7-10 14-3 7-9 6 2 2 9 10 3 4 7-5 6H13Z','M8 39h12l8-15 7-4 6 10 12 3 5 6-5 5H11Z','m5 40 22-9 6-12 8-1 3 12 14 4-3 7-25 3H10Z','m7 38 7-12 14-7 13 2 10 9 7 10-8 4H13Z','m8 41 12-8 7-14 11 4 2 6 10 3 7 8-12 3-16-5-10 6Z','m6 30 12 1 8-6 9-10 9 11 10 2 4 4-8 12H17Z'][idx%6];
    return svg('<ellipse cx="33" cy="51" rx="25" ry="3.1" fill="#cebbc0"/><path d="'+shape+'" fill="'+color+'" stroke="'+ink+'" stroke-width="2.6"/><path d="m23 31 9-9h8l2 7-14 3" fill="'+metal+'"/><path d="m15 38 9-2m14 0 12-2" stroke="'+amber+'" stroke-width="2.3"/><g fill="#342e3c" stroke="#1e1b26" stroke-width="1.2"><circle cx="17" cy="42" r="7"/><circle cx="48" cy="41" r="7"/></g><g fill="'+metal+'"><circle cx="17" cy="42" r="3.5"/><circle cx="48" cy="41" r="3.5"/></g>');
  }
  function setupGarage(){
    el('stats').innerHTML=['极速','加速','抓地','转向','涡轮'].map((x,i)=>'<div class="statsRow"><b>'+x+'</b><div class="trackStat"><span id="stat'+i+'"></span></div></div>').join('');
    const arr=[['gear','齿比','短齿','标准','长齿'],['spring','悬架','柔软','标准','偏硬'],['bias','制动','偏后','均衡','偏前']];
    el('trimSettings').innerHTML=arr.map(([k,label,...opts])=>'<div class="tuneRow"><b>'+label+'</b>'+opts.map((v,i)=>'<button data-trimkey="'+k+'" data-trimval="'+(i-1)+'">'+v+'</button>').join('')+'</div>').join('');
    all('[data-trimkey]').forEach(b=>b.onclick=()=>{calls('setPart',b.dataset.trimkey,+b.dataset.trimval)});
    all('[data-part]').forEach(b=>b.onclick=()=>{tab=b.dataset.part;calls('previewPart',tab);drawGarage(true);labelControls(state)});
    const swap=n=>{let list=partList(tab);if(list.length)calls('setPart',tab,((state.cfg[tab]||0)+n+list.length)%list.length)};
    el('partPrev').onclick=()=>swap(-1);el('partNext').onclick=()=>swap(1)
  }
  function drawGarage(force=false){
    let cfg=state.cfg;if(!cfg)return;let sig=[tab,cfg.driver,cfg.body,cfg.tire,cfg.wing,cfg.paint,cfg.gear,cfg.spring,cfg.bias].join('/');if(sig===cachedPart&&!force)return;cachedPart=sig;
    el('garagePane').dataset.part=tab;toggleGroup('[data-part]',tab,'data-part');visible('trimSettings',tab==='tune');visible('choosePart',tab!=='tune');
    if(tab==='tune'){all('[data-trimkey]').forEach(b=>{let ok=(cfg[b.dataset.trimkey]||0)===+b.dataset.trimval;b.classList.toggle('on',ok);b.setAttribute('aria-pressed',String(ok))})}
    else{let i=cfg[tab]||0,list=partList(tab),g=list[i]||list[0];el('partArt').innerHTML=partPic(tab,i);textAt('partName',tab==='driver'?driverTitles[i]:g?.name);textAt('partNumber',String(i+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0'));pulse(el('partDisplay'),'paneIn')}
    textAt('displayDriver',state.driverName||driverTitles[cfg.driver]);if(typeof tune==='function'){const t=tune(cfg),gear=cfg.gear||0,values=[(Math.sqrt(t.engine/t.aero)-44)/25+.09*gear,(t.engine/t.mass-8)/12-.08*gear,(t.grip-1.22)/.64,(t.steer-.39)/.23,(t.turbo-.6)/1.15];values.forEach((v,i)=>el('stat'+i).style.width=(100*num(v,.06,1))+'%')}
  }
  let readCueKey='',readCueFraction=-1;
  function updateResultRead(s){
    if(s.screen!=='finish')return;
    const hold=FinishReading.status(),ready=hold.ready,key=String(ready)+'/'+String(hold.shown);
    const cue=el('resultReadCue');cue.dataset.ready=String(ready);
    if(key!==readCueKey){
      readCueKey=key;textAt('readCueText',ready?'可选择下一步':hold.shown?'成绩展示中':'等待结算');
      for(const b of el('finishPane').querySelectorAll('.finishActions button'))b.setAttribute('aria-disabled',String(!ready||b.disabled));
    }
    const count=hold.shown&&!ready?hold.seconds?hold.seconds+' 秒':'松开后继续':'';
    textAt('readCueCount',count);
    if(readCueFraction!==hold.fraction){readCueFraction=hold.fraction;el('readCueProgress').style.transform='scaleX('+hold.fraction+')'}
  }
  function result(s){
    if(GPBroadcast.result(s)){cachedResult='';if(!s.gp?.settling)FinishReading.present();updateResultRead(s);return}
    const list=s.results||[],laps=s.lapTimes||[],key=[s.course,s.mode,s.time,s.pos,list.map(r=>[r.id,r.time,r.player].join('/')).join(','),laps.join(',')].join('|');
    if(key===cachedResult){FinishReading.present();updateResultRead(s);return}cachedResult=key;
    const timed=s.mode==='tt',card=tourCards[s.course];
    textAt('resultCaption',timed?(s.staged?'分段成绩':'分圈成绩'):'冲线顺序');textAt('resultCourse',card.name+' · '+s.cc+'cc');textAt('resultClock',toTime(s.time));
    const next=tourCards[(s.course+1)%tourCards.length];textAt('finishNext','下一站 ▸');
    el('finishNext').setAttribute('aria-label','下一站 · '+next.name);
    el('finishNext').classList.toggle('gold',!timed);el('finishRetry').classList.toggle('gold',timed);
    if(timed){
      const fastest=s.staged?Infinity:Math.min(...laps.filter(t=>t>0));
      el('resultsList').innerHTML=laps.map((t,i)=>'<div class="resultLine '+(t===fastest?'mine':'')+'"><b>'+(s.staged?'S':'L')+(i+1)+'</b>'+(t===fastest?'<span>最快</span>':'')+'<time>'+toTime(t)+'</time></div>').join('');
    }else{
      el('resultsList').innerHTML=list.map((r,i)=>'<div class="resultLine '+(r.player?'mine':'')+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+esc(r.name||driverTitles[r.id]||'车手')+'</span><time>'+(r.time>0?toTime(r.time):'未冲线')+'</time></div>').join('');
    }
    FinishReading.present();updateResultRead(s);
  }
  const emblems={plane:'<path d="m2 15 8-4V5q0-4 2-4t2 4v6l8 4v2l-8-2v4l2 2v1l-4-1-4 1v-1l2-2v-4l-8 2Z"/>',ski:'<path d="m2 20 8-15 6 10 2-4 5 9ZM7 11l3 2 2-3M4 22h17"/>',wheel:'<circle cx="12" cy="10" r="7"/><path d="m8 22 4-12 5 12M5 10h14M9 4l6 12m0-12L9 16"/>',star:'<path d="m12 2 2.8 6 6.7 1-4.8 4.7 1.2 6.8-5.9-3.2-6 3.2 1.2-6.8L2.5 9l6.7-1Z"/>',sail:'<path d="M13 3v13H3L13 3Zm2 3 6 10h-6zM2 18h20l-4 3H6z"/>',peak:'<path d="m2 20 8-15 5 9 3-5 5 11ZM7 11l3 2 2-3"/>',keep:'<path d="M3 21V7h3v3h3V3h3v3h3V3h2v7h2V7h2v14h-7v-5h-4v5Z"/>'};
  // The physical A/B pair follows the current pane's primary action and back action.
  const panelKeys={
    menu:{A:['开始比赛','start']},garage:{A:['用这辆车出赛','start'],B:['返回赛道选择','menu']},
    pause:{A:['继续比赛','resume'],B:['继续比赛','resume']},help:{A:['返回上一页','resume'],B:['返回上一页','resume']},
    finish:{B:['返回赛道选择','menu']}
  };
  function panelAction(letter){
    if(RaceChooser.open)return letter==='A'?['确认选项','acceptChoice']:letter==='B'?['关闭选择','cancelChoice']:null;
    if(GPBroadcast.open())return letter==='B'?['关闭赛程','closeGPPlan']:null;
    if(state?.screen==='finish'&&letter==='A'&&state.mode==='gp')return state.gp?.settling?null:[state.gp?.final?'完成大奖赛':'前往下一站','nextRace'];
    if(state?.screen==='menu'&&letter==='A'&&state.mode==='gp')return [state.gp?.final?'新一届大奖赛':state.gp?.locked?'继续大奖赛':'开始大奖赛','start'];
    if(state?.screen==='finish'&&letter==='A')return state.mode==='tt'?['再跑一场','start']:['下一站','nextRace'];
    return panelKeys[state?.screen]?.[letter];
  }
  function menuButton(letter){
    const action=panelAction(letter);if(!action)return false;
    if(action[1]==='closeGPPlan')GPBroadcast.close();
    else if(action[1]==='acceptChoice')RaceChooser.commit();
    else if(action[1]==='cancelChoice')RaceChooser.close();
    else calls(action[1]);return true;
  }
  function menuDirection(dir){
    if(RaceChooser.open)return RaceChooser.move(dir==='left'||dir==='up'?-1:1);
    if(dir!=='left'&&dir!=='right')return false;
    if(GPBroadcast.open())return true;
    if(state?.screen==='finish'&&state.mode==='gp'){GPBroadcast.setView(dir==='left'?'stage':'total');return true}
    if(state?.screen==='menu'&&state.mode==='gp')return false;
    if(state?.screen==='menu')calls('selectCourse',mod(state.course+(dir==='left'?-1:1),tourCards.length));
    else if(state?.screen==='garage'&&tab!=='tune')el(dir==='left'?'partPrev':'partNext').click();
    else return false;
    return true;
  }
  function drivingHelp(){
    const cap=a=>DriveBindings.label(a,'pad'),key=a=>DriveBindings.label(a,'keys');
    const gas=DriveBindings.auto?'已开启自动前进。':'按住 '+cap('gas')+' 或键盘 '+key('gas')+' 给油，松开滑行。';
    const launch='item';
    textAt('manualLaunch',gas+' 倒数时按住道具键 '+cap(launch)+' 或键盘 '+key(launch)+' 蓄力，按到绿灯获得起步加速。');
    textAt('manualTurn','拨动摇杆或使用 '+key('left')+'、'+key('right')+' 转向。按 '+cap('brake')+' 或键盘 '+key('brake')+' 刹车。');
    textAt('manualDrift','入弯按住 '+cap('drift')+' 或键盘 '+key('drift')+' 起漂，蓄出火花后松开加速。触屏按住漂移键向上滑，可边漂边刹。');
    textAt('manualItem','按住 '+cap('item')+' 或键盘 '+key('item')+' 可把香蕉或单个龟壳拖在车后，松开投出。');
    textAt('manualGlide','滑翔翼在跳台上自动展开。腾空时按漂移键可以做特技，按 '+cap('rear')+' 或键盘 '+key('rear')+' 可以后视。');
  }
  function labelControls(s){
    const live=s.screen==='race'||s.screen==='countdown';if(s.screen==='help')drivingHelp();
    function label(id,letter,action,shortcut){
      const node=el(id),name=letter+' · '+(action||'当前页面无操作');
      node.setAttribute('aria-label',name);node.title=name+(action&&shortcut?'（键盘 '+shortcut+'）':'');
      node.setAttribute('aria-disabled',String(!action));
    }
    const faces={A:'itemBtn',B:'driftBtn',X:'brakeBtn',Y:'rearBtn'};
    const driveName=a=>a==='item'&&s.screen==='countdown'?'按住蓄力':DriveBindings.names[a]||'';
    for(const [slot,id] of Object.entries(faces)){
      const a=DriveBindings.capAction(slot),word=live?driveName(a):panelAction(slot)?.[0];
      label(id,slot,word,live&&a?DriveBindings.label(a,'keys'):slot==='A'?'Enter':slot==='B'?'B / Esc':'');
      const sm=el(id).querySelector('small');if(sm)sm.textContent=word||'';
    }
    for(const n of padNodes.values())n.classList.remove('ready');
    const noun=s.screen==='menu'&&s.mode!=='gp'?'条赛道':s.screen==='garage'&&tab!=='tune'?'款配件':'';
    for(const button of all('[data-dir]')){
      const dir=button.dataset.dir,word={up:'上',left:'左',right:'右',down:'下'}[dir];
      const action=live?driveName(DriveBindings.capAction(dir)):RaceChooser.open?(dir==='left'||dir==='up'?'上一选项':'下一选项'):
        s.screen==='finish'&&s.mode==='gp'&&['left','right'].includes(dir)?dir==='left'?'本站成绩':'累计总榜':noun&&dir==='left'?'上一'+noun:noun&&dir==='right'?'下一'+noun:'';
      button.title='十字键'+word+' · '+(action||'当前页面无操作');
      button.setAttribute('aria-label',button.title);button.setAttribute('aria-disabled',String(!action));
    }
  }
  function show(s){
    state=s;let screen=s.screen,changed=lastScreen!==screen,live=screen==='race'||screen==='countdown';
    if(typeof DeviceShell!=='undefined')DeviceShell.viewFor(screen);
    if(changed){const launching=lastScreen==='countdown'&&screen==='race';lastScreen=screen;if(!launching)releaseInputs();if(screen==='garage')calls('previewPart',tab);if(['menu','garage','countdown'].includes(screen))pulse(el('upper'),'wipe');lastAnn='';lastItem='';lastPlace=''}
    el('console').classList.toggle('playing',live);
    const modeName=s.mode==='gp'?'大奖赛':s.mode==='tt'?'计时赛':'对战赛',labels={menu:'RACE SELECT',garage:'CUSTOM GARAGE',race:s.mode==='gp'?'GRAND PRIX':s.mode==='tt'?'TIME TRIAL':'VERSUS RACE',countdown:'STARTING GRID',finish:'FINISH LINE',pause:'PIT STOP',help:'DRIVER GUIDE'};
    textAt('screenLabel',labels[screen]||'MARIO KART 8');textAt('screenCode',tourCards[s.course].tag);
    for(const [id,on] of [['menuPane',screen==='menu'],['garagePane',screen==='garage'],['livePane',live],['pausePane',screen==='pause'],['finishPane',screen==='finish'],['helpPane',screen==='help'],['titleView',screen==='menu'],['garageView',screen==='garage'],['raceHUD',live],['raceOverlay',live],['mapBox',screen==='menu'||live],['takeover',['pause','finish','help'].includes(screen)]])visible(id,on);
    el('mapBox').classList.toggle('live',live);el('mapBox').classList.toggle('night',s.course===1);textAt('mapLegend',live?'实时地图 · 按住看后方':'COURSE MAP');
    const card=tourCards[s.course],nickname=card.name;
    textAt('courseTitle',nickname);textAt('cupLine',card.cup+' · '+card.tag);textAt('courseHint',card.hint);
    if(changed||lastCourse!==s.course){
      textAt('tourName',nickname);textAt('tourSeries',card.cup);textAt('tourCount',String(s.course+1).padStart(2,'0')+' / '+String(tourCards.length).padStart(2,'0')+' ▾');
      el('courseList').value=String(s.course);el('tourBadge').style.setProperty('--tourColor',card.color);
      el('tourBadge').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+emblems[card.icon]+'</svg>';
    }
    if(changed||lastCourse!==s.course){if(!changed&&screen==='menu')pulse(el('upper'),'wipe');lastCourse=s.course}
    toggleGroup('[data-course]',s.course,'data-course','selected');toggleGroup('[data-mode]',s.mode,'data-mode');toggleGroup('[data-cc]',s.cc,'data-cc');
    textAt('pauseCopy',nickname+' · '+s.cc+'cc · '+modeName);textAt('assistToggle','弯道辅助 · '+(s.assist===false?'关':'开'));el('assistToggle').setAttribute('aria-pressed',s.assist===false?'false':'true');
    GPBroadcast.menu(s);
    const record=el('lapRecord'),recordHost=live?el('lapHUD').closest('.raceTopRight'):el('upper');
    if(record.parentElement!==recordHost)recordHost.appendChild(record);
    record.open=false;
    visible('lapRecord',screen==='menu'||live);
    visible('speedVeil',screen==='race');
    if(!record.hidden)showLapRecord(s);
    if(screen==='garage')drawGarage(changed);
    el('takeover').classList.toggle('finishCut',screen==='finish');
    labelControls(s);
    if(screen==='finish'){if(s.mode!=='gp'){textAt('takeKicker',s.mode==='tt'?'TIME TRIAL COMPLETE':'CHEQUERED FLAG');textAt('takeTitle',s.mode==='tt'?'计时完成':'第 '+s.pos+' 名');textAt('takeSub',(s.recordText?s.recordText+'　':'')+nickname+'　'+toTime(s.time))}result(s)}
    if(screen==='pause'){textAt('takeKicker','RACE PAUSED');textAt('takeTitle','比赛暂停');textAt('takeSub',nickname+' · '+modeName)}
    if(screen==='pause')el('pauseRecovery').disabled=!s.canRecover;
    if(screen==='help'){textAt('takeKicker','DRIVER GUIDE');textAt('takeTitle','驾驶指南');textAt('takeSub','双手握持 · 自动油门')}
    if(screen==='help'){visible('racePerf',showFPS);if(showFPS)textAt('racePerf',frameWindow.lastRaceReport?'最近比赛　'+frameWindow.lastRaceReport:'跑一段比赛后，这里会显示本机帧率和帧时间。')}
    textAt('displayMode','画面 · '+displayLabels[displayMode]);visible('fpsMeter',showFPS);textAt('fpsToggle','帧率 · '+(showFPS?'开':'关'));el('fpsToggle').setAttribute('aria-pressed',String(showFPS));
    update(s,true);
  }
  let lastLapRecord=-1,lastRecordLabel='';
  function showLapRecord(s){
    const label=s.staged?'最快赛段':'最快圈速';
    let best=Number.isFinite(s.bestLap)&&s.bestLap>0?s.bestLap:0;
    if(s.screen==='race')for(const lap of s.lapTimes||[])if(Number.isFinite(lap)&&lap>0&&(!best||lap<best))best=lap;
    if(lastRecordLabel!==label){el('lapRecordLabel').setAttribute('aria-label','BEST · '+label);lastRecordLabel=label}
    if(lastLapRecord===best)return;
    lastLapRecord=best;
    textAt('lapRecordTime',best?toTime(best):'—');
  }
  function updateSignal(s){
    const onGrid=s.screen==='countdown',go=s.screen==='race'&&s.time<.82;
    visible('startSignal',onGrid||go);
    const signal=el('startSignal');
    if(onGrid||go){
      const remaining=Number.isFinite(s.countdown)?Math.ceil(s.countdown):(+s.announce||4);
      const lights=go?4:Math.max(0,Math.min(3,4-remaining));
      if(signal.dataset.phase!==String(lights)){
        signal.dataset.phase=String(lights);signal.classList.toggle('go',go);
        for(let i=1;i<=3;i++)el('startBulb'+i).classList.toggle('on',i<=lights);
      }
      const buttons=DriveBindings.label('item','pad')+' / '+DriveBindings.keyName(DriveBindings.primaryKey('item'));
      const gas=DriveBindings.label('gas','pad')+' / '+DriveBindings.keyName(DriveBindings.primaryKey('gas'));
      const charge=Math.round((s.launchCharge||0)*100);
      signal.style.setProperty('--start-charge',String(go?0:charge/100));
      signal.dataset.charging=String(!go&&charge>0);
      textAt('signalCaption',go?(s.rocketStart?'火箭起步！':DriveBindings.auto?'绿灯':'按住 '+gas+' 加速'):s.chargeHeld?(charge===100?'蓄满 · 保持到绿灯':'蓄力 '+charge+'%'):'按住 '+buttons+' 蓄力');
    }
    const ann=String(s.announce||'');
    const node=el('announce');
    if(ann!==lastAnn||(!ann&&node.firstChild)){
      lastAnn=ann;node.replaceChildren();
      if(ann){
        const grid=/^[123]$/.test(ann),start=ann==='GO!',final=ann==='FINAL LAP'||ann==='FINAL SECTION';
        const ink=document.createElement('span'),line=document.createElement('b');
        ink.className='raceStampInk';ink.dataset.kind=grid?'count':start?'go':final?'final':'lap';
        line.textContent=ann;
        ink.append(line);
        if(!grid){
          const caption=document.createElement('small');
          caption.textContent=(start?(s.staged?'SECTION ':'LAP '):'')+String(s.lap).padStart(2,'0')+' / '+String(s.laps).padStart(2,'0');
          ink.append(caption);
        }
        node.append(ink);
      }
    }
    visible('stuckRecovery',s.stuckHint);
    if(s.stuckHint)el('stuckRecovery').querySelector('small').textContent=DriveBindings.label('recover','keys')+'　/　'+DriveBindings.label('recover','pad');
    const ticker=el('toast'),notice=s.toast||'';
    if(ticker.textContent!==notice){
      textAt('toast',notice);
      if(notice){ticker.dataset.topic=/命中|击中|撞|砸/.test(notice)?'hit':/金币|获得|防住|拦截/.test(notice)?'item':'race';pulse(ticker,'tickerIn');}
    }
    if(notice)ticker.dataset.release=String(toastT<.18);
  }
  function driveDisplay(s){
    const hud=el('raceHUD'),readout=el('driveReadout'),level=s.driftLevel||0;
    const charge=s.charging&&!s.boost,boost=s.screen==='race'&&!!s.boost;
    const mode=s.screen!=='race'||!s.guideClear?'quiet':boost?'boost':charge?'charge':'quiet';
    visible('driveReadout',mode!=='quiet');
    if(hud.dataset.drive!==mode)hud.dataset.drive=mode;
    const veil=el('speedVeil'),tier=s.screen==='race'?s.rush:0;
    if(tier&&veil.dataset.tier!==String(tier))veil.dataset.tier=String(tier);
    const on=tier?'true':'false';if(veil.dataset.on!==on)veil.dataset.on=on;
    if(mode==='quiet')return;
    if(readout.dataset.level!==String(level)||readout.dataset.mode!==mode){
      if(mode==='charge'&&level>0&&readout.dataset.level!==String(level))pulse(readout,'gainTier');
      readout.dataset.level=String(level);readout.dataset.mode=mode;
    }
    textAt('driveText',boost?'加速中':level?['','蓝火','橙火','紫火'][level]+' · 松开加速':'漂移蓄力');
    const v=Math.round((boost?1:num(s.driftCharge||0,0,2.9)/2.9)*20)/20;
    const fill=el('driveFill'),val=String(v);
    if(fill.dataset.value!==val){fill.dataset.value=val;fill.style.transform='scaleX('+val+')'}
  }
  function updateNotes(s){
    const dir=s.nextTurn==='left'||s.nextTurn==='right'?s.nextTurn:'straight',mark=el('turnMark');
    if(mark.dataset.dir!==dir)mark.dataset.dir=dir;
    const distance=Number(s.turnDistance),hasDistance=Number.isFinite(distance)&&distance>5,bend=dir==='left'?'左弯':'右弯';
    const phase=s.turnPhase,rail=el('turnRail');
    const cue=s.screen==='race'&&s.time>=.9&&s.guideClear&&dir!=='straight'&&phase!=='inside'&&!s.announce;
    const appearing=rail.hidden;
    const mode=el('studio').dataset.cue||'full';
    if(cue){
      delete rail.dataset.exit;delete rail.dataset.exitAt;visible('turnRail',true);
      const key=String(s.turnKey),shape=s.turnShape;
      if(rail.dataset.dir!==dir)rail.dataset.dir=dir;
      if(rail.dataset.shape!==shape)rail.dataset.shape=shape;
      if(rail.dataset.phase!==phase)rail.dataset.phase=phase;
      if(appearing||rail.dataset.bend!==key){rail.dataset.bend=key;pulse(rail,'cueIn')}
      textAt('turnStage',phase==='enter'?'现在入弯':phase==='near'?'准备入弯':'弯道预告');
      textAt('turnRailText',(dir==='left'?'左':'右')+(shape==='hairpin'?'发夹弯':shape==='sharp'?'急弯':'弯'));
      textAt('turnRange',phase==='enter'?'IN':Math.max(1,Math.ceil(distance/2)*2));
      textAt('turnUnit',phase==='enter'?'':'m');
      const progress=el('turnProgress'),v=String(Math.round(s.turnFill*16)/16);
      if(progress.dataset.value!==v){progress.dataset.value=v;progress.style.transform='scaleX('+v+')'}
    }else if(s.screen==='race'&&s.guideClear&&!s.announce&&mode!=='off'&&!rail.hidden&&s.time>=.9){
      if(!rail.dataset.exit){rail.dataset.exit='true';rail.dataset.exitAt=String(s.time);}
      if(s.time-Number(rail.dataset.exitAt)>.18)visible('turnRail',false);
    }else{visible('turnRail',false);delete rail.dataset.exit;}
    RubyRoadFX.pace(cue&&mode!=='off'?track:null,me,s);
    const impact=el('hitCue'),struck=me?.strikeAt!=null&&me.strikeAt>=(me.impactAt??-Infinity);
    const at=struck?me?.strikeAt:me?.impactAt,age=at==null?Infinity:worldT-at;
    const gotHit=s.screen==='race'&&age>=0&&age<(struck?1.60:1.20)&&!me.falling&&!me.rescue;
    if(gotHit&&(impact.hidden||impactOwner!==me||impact.dataset.at!==String(at))){
      impactOwner=me;
      const kind=struck?'lightning':me.impactKind,art=kind==='fireball'?'flower':kind==='hit'?'star':kind;
      impact.dataset.kind=kind;impact.dataset.at=String(at);
      textAt('hitCategory',struck?'电击':kind==='banana'?'失控':kind==='spiny'||kind==='bomb'?'爆炸':'受击');
      impact.querySelector('strong').textContent=impactLabels[kind]||impactLabels.hit;
      impact.querySelector('i').innerHTML=iconArt(art);
      const lost=me.impactAt===at&&me.impactLost?' · 金币 −'+me.impactLost:'';
      const status=struck?'暂时缩小':kind==='star'?'赛车腾空':kind==='banana'?'车轮打滑':kind==='bomb'||kind==='spiny'?'车身被掀起':'车速下降';
      impact.querySelector('em').textContent=status+lost;
    }
    if(gotHit)impact.dataset.release=String(age>(struck?1.39:1.01));
    visible('hitCue',gotHit);
    driveDisplay(s);
    textAt('liveTurn',dir==='straight'?'沿直道前进':hasDistance?bend+'在前':bend+'中');
    textAt('liveSection',dir!=='straight'&&hasDistance?'约 '+Math.max(5,Math.round(distance/5)*5)+' 米':s.courseSection||s.section||tourCards[s.course].name);
    const last=s.lapTimes?.[s.lapTimes.length-1];
    textAt('liveChrono',s.mode==='tt'?(last?(s.staged?'SECTION ':'LAP ')+Math.max(1,s.lap-1)+' · '+toTime(last):s.ghost?'个人幽灵在场':s.staged?'SECTION 1':'LAP 1'):s.raceGap||('第 '+s.pos+' / '+s.total+' 位'));
    textAt('liveSpeed',Math.round(s.speed||0));
    const item=pron[s.item]||'',level=s.driftLevel||0,charged=['','蓝火','橙火','紫火'][level]||'火花';
    const message=s.screen==='countdown'?(s.preparing?'正在准备发车阵容':s.chargeHeld?'起步蓄力 '+Math.round(100*s.launchCharge)+'%':'按住 '+DriveBindings.label('item','pad')+' 蓄力'):s.section==='坠落中'?'坠落中':s.section==='救援中'?'救援中':s.section==='打滑中'?'打滑中':s.section==='滑翔中'?'滑翔中':s.air?'空中':s.boost?'加速中':level?charged+' · 松开漂移':s.charging?'蓄力中':s.roulette?'抽取道具':item?DriveBindings.label('item','pad')+' '+item:!DriveBindings.auto&&s.speed<3?'按住 '+DriveBindings.label('gas','pad')+' 加速':'巡航';
    textAt('liveStatus',message);el('liveRight').classList.toggle('hot',!!s.boost||level>0);
  }
  function update(s,fromShow=false){
    if(typeof DeviceShell!=='undefined')DeviceShell.telemetry(s);
    if(!fromShow&&s.screen!==lastScreen){show(s);return}state=s;const soundKey=el('soundToggle'),pressed=String(!!s.sound);if(soundKey.getAttribute('aria-pressed')!==pressed)soundKey.setAttribute('aria-pressed',pressed);textAt('soundToggle',s.sound?'♪ 音效':'× 静音');
    if(s.screen==='finish'){
      if(s.mode==='gp'&&!fromShow)result(s);
      else updateResultRead(s);
    }else readCueKey='';
    if(s.screen==='garage')drawGarage();
    if(s.screen==='help'){textAt('assistToggle','弯道辅助 · '+(s.assist===false?'关':'开'));el('assistToggle').setAttribute('aria-pressed',s.assist===false?'false':'true')}
    if(s.screen!=='race'&&s.screen!=='countdown')return;
    const p=s.pos||1,timed=s.mode==='tt';
    showLapRecord(s);
    visible('upperTime',timed);if(timed)textAt('clockHUD',toTime(s.time));
    const lapBadge=el('lapHUD'),lap=String(s.lap||1);
    if(lapBadge.dataset.lap!==lap){if(s.screen==='race'&&s.lap>1)pulse(lapBadge,'lapHit');lapBadge.dataset.lap=lap}
    textAt('lapHUD',(s.staged?'SECTION ':'LAP ')+lap+'/'+(s.laps||3));lapBadge.setAttribute('aria-label',s.staged?'区段':'圈数');el('lapHUD').classList.toggle('last',s.lap===s.laps);
    textAt('coinHUD',String(s.coins||0).padStart(2,'0'));visible('placeElem',!timed);
    if(p!==lastPlace){lastPlace=p;textAt('posHUD',p);textAt('suffixHUD',p===1?'st':p===2?'nd':p===3?'rd':'th');if(!timed)pulse(el('placeElem'),'stamp')}
    const art=s.roulette?rouletteArt[Math.floor(s.time/.15)%rouletteArt.length]:s.item||'';
    if(art!==lastItem||el('itemSlot').dataset.art!==art){el('itemSlot').querySelector('.currentItem')?.classList.remove('currentItem');el('itemSlot').setAttribute('aria-label',s.roulette?'道具抽取中':itemNames[art]||'无道具');lastItem=art;el('itemSlot').dataset.art=art;if(art){el('itemSlot').querySelector('[data-kind="'+art+'"]')?.classList.add('currentItem');if(!s.roulette)pulse(el('itemSlot'),'flash')}}
    const qty=s.itemSeconds&&s.item==='golden'?s.itemSeconds+'s':s.charges>1?'×'+s.charges:'';visible('itemQty',!!(s.item&&qty));if(qty)textAt('itemQty',qty);
    const itemCap=padNodes.get(DriveBindings.cap('item'));
    itemCap?.classList.toggle('ready',s.screen==='countdown'&&s.chargeHeld||s.screen==='race'&&!!s.item&&!s.roulette);
    updateSignal(s);updateNotes(s);
  }
  let steeringId=null,steeringSpace=null,orbitId=null,orbitSpace=null,orbitX=0;
  const contactSpace=(id,hardware=true)=>typeof ModelCabinet!=='undefined'?ModelCabinet.contactSpace(id,hardware):null;
  const padHeld=new Map(),padNodes=new Map();
  function syncPad(stamp,cancelDrift=false){
    let left=0,right=0,brake=0,gas=false,drift=false,rear=false;
    for(const p of padHeld.values()){
      left|=p.action==='left';right|=p.action==='right';
      brake=Math.max(brake,p.action==='brake'?1:p.slide||0);
      gas||=p.action==='gas';drift||=p.action==='drift';rear||=p.action==='rear';
    }
    const dir=right-left;
    if(touchControl.digital!==dir){calls('padSteer',dir,stamp);el('steer').querySelector('.nub')?.style.setProperty('--joy',String(dir||touchControl.steer))}
    if(touchControl.gas!==gas)calls('gas',gas,stamp);
    if(touchControl.drift!==drift){if(!drift&&cancelDrift)calls('cancelDrift',stamp);else calls('drift',drift,stamp)}
    if(touchControl.brake!==brake)calls('brake',brake,stamp);
    if(touchControl.rear!==rear)calls('rearView',rear);
  }
  function releaseInputs(cancelled=false){
    for(const [source,press] of padHeld){
      if(press.action==='item')calls('itemButton',false,source,true);
      press.node.classList.remove('down');
    }
    padHeld.clear();syncPad(undefined,cancelled===true);
    if(cancelled!==true&&typeof cancelItemGuard==='function')cancelItemGuard();
    const nub=el('steer').querySelector?.('.nub');nub?.style.removeProperty?.('--keyJoy');nub?.style.setProperty?.('--joy','0');
    for(const b of all('.physical.keyDown,[data-dir].keyDown'))b.classList.remove('keyDown');
    if(steeringId!==null){steeringId=null;calls('steer',0)}steeringSpace=orbitSpace=null;orbitId=null;
  }
  const raceInput=()=>state&&(state.screen==='race'||state.screen==='countdown');
  function bindControls(){
    const steer=el('steer'),nub=steer.querySelector?.('.nub')||steer;
    let midpoint=0,reach=1,lastX=NaN,lastValue=NaN,lastSample=0;
    const dir=e=>{
      if(e.timeStamp>0){if(e.timeStamp<lastSample)return;lastSample=e.timeStamp}
      const local=steeringSpace?.(e.clientX,e.clientY);
      const valueX=local?(local.x-.5)/.34:(e.clientX-midpoint)/reach;if(valueX===lastX)return;
      lastX=valueX;const raw=num(valueX,-1,1);
      const t=Math.max(0,(Math.abs(raw)-.05)/.95),value=Math.sign(raw)*t*(.86+.14*t);
      if(value===lastValue)return;lastValue=value;
      calls('steer',value,e.timeStamp);nub.style.setProperty('--joy',value.toFixed(3));
    };
    steer.onpointerdown=e=>{
      if(!raceInput()||steeringId!==null)return;e.preventDefault();steeringId=e.pointerId;steeringSpace=contactSpace('steer');
      const rect=steer.getBoundingClientRect();midpoint=rect.left+rect.width*.5;reach=Math.max(1,rect.width*.34);
      lastX=lastValue=NaN;lastSample=0;steer.setPointerCapture(e.pointerId);dir(e);
    };
    const steerMove=e=>{if(steeringId===e.pointerId)dir(e)};
    // Some mobile browsers deliver hardware samples ahead of pointermove.
    // Keep regular pointermove as a fallback, deduplicating identical positions.
    if('onpointerrawupdate' in steer)steer.addEventListener('pointerrawupdate',steerMove,{passive:true});
    steer.onpointermove=steerMove;
    steer.onpointerup=steer.onpointercancel=steer.onlostpointercapture=e=>{
      if(e.pointerId!==steeringId)return;steeringId=null;steeringSpace=null;calls('steer',0,e.timeStamp);nub.style.setProperty('--joy','0');
    };
    // A press owns its binding until release. Multiple fingers may hold
    // throttle, drift and a direction independently on either hardware form.
    const buttons={A:el('itemBtn'),B:el('driftBtn'),X:el('brakeBtn'),Y:el('rearBtn')};
    for(const n of el('dpad').querySelectorAll('[data-dir]'))buttons[n.dataset.dir]=n;
    for(const [slot,node] of Object.entries(buttons))padNodes.set(slot,node);
    function menuCap(slot){if(slot==='A'||slot==='B')menuButton(slot);else if(['left','right','up','down'].includes(slot))menuDirection(slot)}
    function down(slot,node,source,stamp,event){
      if(padHeld.has(source))return;
      if(!raceInput()){menuCap(slot);return}
      const action=DriveBindings.capAction(slot);
      if(action==='item')calls('itemButton',true,source);
      if(action==='recover')calls('recover');
      const space=event&&action==='drift'?contactSpace(node.id||'dir-'+slot):null;
      padHeld.set(source,{slot,node,action,space,startY:event?localY(event,space,node):0,slide:0});
      node.classList.add('down');syncPad(stamp);
    }
    function up(source,stamp,cancel){
      const p=padHeld.get(source);if(!p)return;
      padHeld.delete(source);
      if(!Array.from(padHeld.values()).some(h=>h.node===p.node))p.node.classList.remove('down');
      if(p.action==='item')calls('itemButton',false,source,cancel);
      syncPad(stamp,cancel&&p.action==='drift');
    }
    function localY(e,space,node){const p=space?.(e.clientX,e.clientY);
      return p?p.y*Math.max(24,node.clientHeight):e.clientY}
    for(const [slot,node] of Object.entries(buttons)){
      node.onpointerdown=e=>{if(e.button>0)return;e.preventDefault();node.setPointerCapture(e.pointerId);down(slot,node,e.pointerId,e.timeStamp,e)};
      node.onpointermove=e=>{
        const p=padHeld.get(e.pointerId);if(p?.action!=='drift')return;
        p.slide=num((p.startY-localY(e,p.space,node)-9)/28,0,1);syncPad(e.timeStamp);
      };
      node.onpointerup=node.onpointercancel=node.onlostpointercapture=e=>up(e.pointerId,e.timeStamp,e.type!=='pointerup');
      node.onkeydown=e=>{if(e.code!=='Enter'&&(e.code!=='Space'||raceInput()))return;e.preventDefault();e.stopPropagation();if(!e.repeat)down(slot,node,'focus-'+e.code,e.timeStamp)};
      node.onkeyup=e=>{if(e.code!=='Enter'&&(e.code!=='Space'||raceInput()))return;e.preventDefault();e.stopPropagation();up('focus-'+e.code,e.timeStamp,false)};
      node.onclick=e=>{if(e.detail!==0)return;if(!raceInput()){menuCap(slot);return}const src='activate-'+slot;down(slot,node,src,e.timeStamp);up(src,e.timeStamp,false)};
    }
    for(const node of [el('mapBox'),...all('[data-skin-rear]')]){
      node.onpointerdown=e=>{if(screen!=='race'||e.button>0)return;e.preventDefault();node.setPointerCapture(e.pointerId);
        padHeld.set(e.pointerId,{node,action:'rear',slide:0});node.classList.add('down');syncPad(e.timeStamp)};
      node.onpointerup=node.onpointercancel=node.onlostpointercapture=e=>up(e.pointerId,e.timeStamp,e.type!=='pointerup');
    }
    const top=el('upper'),garageX=e=>{const p=orbitSpace?.(e.clientX,e.clientY);return p?p.x*top.clientWidth:e.clientX};
    top.onpointerdown=e=>{
      if(DeviceShell.modalOpen||state?.screen!=='garage'||orbitId!==null||e.target.closest('button,select,input,#oneInspector'))return;
      e.preventDefault();top.setPointerCapture(e.pointerId);orbitId=e.pointerId;orbitSpace=contactSpace('upper',false);orbitX=garageX(e);
    };
    top.onpointermove=e=>{if(orbitId!==e.pointerId)return;const x=garageX(e);calls('orbit',(x-orbitX)*.012);orbitX=x};
    top.onpointerup=top.onlostpointercapture=top.onpointercancel=e=>{if(e.pointerId===orbitId){orbitId=null;orbitSpace=null}};
    window.addEventListener('blur',releaseInputs);
    // The stick's previous midpoint is no longer on the same physical screen.
    if(typeof window.matchMedia==='function'){
      const orientation=window.matchMedia('(orientation: landscape)'),reset=()=>releaseInputs(true);
      if(orientation.addEventListener)orientation.addEventListener('change',reset);else orientation.addListener?.(reset);
    }
  }
  let req=0,tx=-.32,ty=-.37,rx=-.32,ry=-.37,lastTime=0;
  let samples=null,watchCoat=null;
  // The lacquer's colour and highlight stops never change. Move small painted
  // gradient samples underneath each case's rounded clip instead of repainting
  // both gradients, and all inheriting controls, on every sensor event.
  function bandMatrix(angle,w,h,cx,cy){
    const x=Math.sin(angle),y=-Math.cos(angle);
    const length=Math.abs(x)*w+Math.abs(y)*h,across=Math.abs(y)*w+Math.abs(x)*h+2;
    const u=x*length,v=y*length,a=-y*across,b=x*across;
    return 'matrix('+[u/512,v/512,a/4,b/4,cx-(u+a)/2,cy-(v+b)/2].join(',')+')';
  }
  function glowMatrix(cx,cy,radX,radY){
    return 'matrix('+[radX/64,0,0,radY/64,cx-radX,cy-radY].join(',')+')';
  }
  function coatLight(s){
    const {w,h,band,halo}=s;if(!w||!h)return;
    const angle=(113+rx*31+ry*9)*Math.PI/180;
    const sweep=.50+rx*.48;
    band.style.transform=bandMatrix(angle,w*1.70,h*1.45,w*(.85-.75*sweep),h*.48);
    halo.style.transform=glowMatrix((.45+rx*.48)*w,(.38+ry*.72)*h,w*.42,h*.78);
  }
  // Paint a strip light and its soft bounce once, then only translate the two
  // sprites when the device or pointer moves. The castings carry the static light.
  function paintSamples(panels){
    const originals=[];
    for(const {halo,band} of panels){
      for(const [i,cv] of [halo,band].entries()){
        const ctx=cv.getContext('2d');if(!ctx)return false;
        if(originals[i]){ctx.drawImage(originals[i],0,0);continue}
        const g=i?ctx.createLinearGradient(0,0,512,0):ctx.createRadialGradient(64,64,0,64,64,64);
        const stops=i?[[0,'#ffffff00'],[.14,'#d3ddf300'],[.235,'#e8e8f53e'],[.252,'#fff7fa58'],[.270,'#eee4e51c'],[.39,'#d7ddee00'],[1,'#ffffff00']]
                     :[[0,'#fff2ed43'],[.42,'#fdd5da23'],[1,'#fee9f100']];
        for(const [offset,color] of stops)g.addColorStop(offset,color);
        ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);originals[i]=cv;
      }
    }
    return true;
  }
  function addCoats(){
    samples=all('.coat').map(plate=>{
      const [halo,band]=plate.children,r=plate.getBoundingClientRect();
      return {plate,halo,band,w:r.width,h:r.height};
    });
    if(!paintSamples(samples)){samples=[];return}
    for(const s of samples){coatLight(s);s.plate.parentElement.classList.add('movingLight')}
    if(typeof ResizeObserver==='function'){
      watchCoat=new ResizeObserver(entries=>{
        for(const e of entries){const s=samples.find(p=>p.plate===e.target);
          if(s){s.w=e.contentRect.width;s.h=e.contentRect.height;coatLight(s)}}
      });
      for(const s of samples)watchCoat.observe(s.plate);
    }else window.addEventListener('resize',()=>{
      for(const s of samples){const r=s.plate.getBoundingClientRect();s.w=r.width;s.h=r.height;coatLight(s)}
    });
  }
  function setReflect(x,y){
    tx=num(x,-1,1);ty=num(y,-1,1);
    if(!req&&Math.abs(tx-rx)+Math.abs(ty-ry)>.003)req=requestAnimationFrame(drawReflection);
  }
  function drawReflection(ms){
    req=0;
    const elapsed=lastTime?num(ms-lastTime,1,50):16.7,blend=1-Math.exp(-elapsed/60);
    lastTime=ms;rx+=(tx-rx)*blend;ry+=(ty-ry)*blend;
    if(typeof ModelCabinet!=='undefined'&&ModelCabinet.projected)ModelCabinet.tilt(rx,ry);
    else if(!samples)addCoats();else for(const s of samples)coatLight(s);
    if(typeof actions?.tilt==='function')actions.tilt(rx,ry);
    if(Math.abs(tx-rx)+Math.abs(ty-ry)>.003)req=requestAnimationFrame(drawReflection);else lastTime=0;
  }
  function message(v,ms=2600){const e=el('tiltMsg');clearTimeout(msgTimer);e.textContent=v;e.hidden=false;msgTimer=setTimeout(()=>e.hidden=true,ms)}
  let neutral=null;
  function onTilt(e){
    if(!tiltMode||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
    if(!hasSensor){hasSensor=true;clearTimeout(senseTimer);neutral=[e.gamma,e.beta];textAt('tiltBtn','◆ 体感');el('tiltBtn').setAttribute('aria-pressed','true');message('体感反光已开启')}
    const angle=(window.screen?.orientation?.angle||window.orientation||0)*Math.PI/180;
    const dx=num((e.gamma-neutral[0])/27,-1,1),dy=num((e.beta-neutral[1])/31,-1,1);
    setReflect(dx*Math.cos(angle)+dy*Math.sin(angle),dy*Math.cos(angle)-dx*Math.sin(angle));
  }
  function endSense(){tiltMode=false;hasSensor=false;neutral=null;clearTimeout(senseTimer);window.removeEventListener('deviceorientation',onTilt);el('tiltBtn').setAttribute('aria-pressed','false');textAt('tiltBtn','◇ 体感')}
  async function toggleTilt(){if(tiltMode){endSense();message('体感反光已关闭');return}
    try{const D=window.DeviceOrientationEvent;if(!D){message('可在机身上滑动，观察漆面反光');return}
      if(typeof D.requestPermission==='function'){const result=await D.requestPermission();if(result!=='granted'){message('可在机身上滑动，观察漆面反光');return}}
      tiltMode=true;hasSensor=false;window.addEventListener('deviceorientation',onTilt,{passive:true});message('请轻轻倾斜手机');
      senseTimer=setTimeout(()=>{if(!hasSensor&&tiltMode){endSense();message('未收到姿态数据，可在机身上滑动反光',3300)}},2600);
    }catch{endSense();message('可在机身上滑动，观察漆面反光')}}
  function init(handlers){
    const volume=el('scoreVolume'),savedVolume=readSave('scoreVolume',100);
    volume.value=Number.isFinite(savedVolume)?num(savedVolume,0,100):100;
    const applyVolume=()=>{el('scorePercent').textContent=volume.value+'%';KartAudio.setMusicVolume(+volume.value/100)};
    applyVolume();volume.oninput=applyVolume;volume.onchange=()=>writeSave('scoreVolume',+volume.value);

    el('itemSlot').innerHTML=rouletteArt.map(kind=>iconArt(kind).replace('<svg ','<svg data-kind="'+kind+'" ')).join('');
    actions=handlers;
    const recordLabel=el('lapRecordLabel');
    recordLabel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation()});
    recordLabel.addEventListener('click',e=>{if(e.detail)recordLabel.blur()});
    for(const mark of all('.menuCredit'))mark.innerHTML=rubySignature;
    el('coinSprite').innerHTML=iconArt('coin');all('[data-icon]').forEach(n=>n.innerHTML=symbols[n.dataset.icon]||'');
    all('[data-action]').forEach(b=>b.onclick=()=>calls(b.dataset.action));
    el('courseList').innerHTML=tourCards.map((c,i)=>'<option value="'+i+'">'+c.name+' · '+c.tag+'</option>').join('');
    el('courseList').onchange=e=>calls('selectCourse',Number(e.target.value));
    el('coursePrev').onclick=()=>calls('selectCourse',mod(state.course-1,tourCards.length));
    el('courseNext').onclick=()=>calls('selectCourse',mod(state.course+1,tourCards.length));
    el('dualRaceSetup').addEventListener('keydown',e=>{
      const button=e.target.closest('button');
      if(!button||button.disabled)return;
      const group=button.parentElement;
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();
        const options=Array.from(group.children);
        const index=e.key==='Home'?0:e.key==='End'?options.length-1:mod(options.indexOf(button)+(e.key==='ArrowLeft'?-1:1),options.length);
        options[index].focus();options[index].click();
      }else if(e.key==='ArrowUp'||e.key==='ArrowDown'){
        e.preventDefault();e.stopPropagation();
        const selector=button.hasAttribute('data-mode')?'[data-cc]':'[data-mode]';
        el('dualRaceSetup').querySelector(selector+'[aria-pressed="true"]:not(:disabled)')?.focus();
      }else if(e.code==='KeyA'){
        e.preventDefault();e.stopPropagation();if(!e.repeat)button.click();
      }
    });
    all('[data-mode]').forEach(b=>b.onclick=()=>calls('selectMode',b.dataset.mode));
    all('[data-cc]').forEach(b=>b.onclick=()=>calls('selectCC',+b.dataset.cc));el('assistToggle').onclick=()=>calls('assist');el('displayMode').onclick=()=>{cycleDisplayMode();show(state)};el('fpsToggle').onclick=()=>{showFPS=!showFPS;writeSave('fpsDisplay',showFPS);show(state)};
    el('startKey').onclick=()=>{let p=state?.screen;if(p==='race'||p==='countdown')calls('pause');else if(p==='pause'||p==='help')calls('resume');else calls('start')};
    el('tiltBtn').onclick=toggleTilt;el('tiltBtn').setAttribute('aria-pressed','false');
    const shell=el('console');let touchId=null,rect=null;
    const resetRect=()=>{rect=null};
    window.addEventListener('resize',resetRect,{passive:true});
    if(typeof ResizeObserver==='function')new ResizeObserver(resetRect).observe(shell);
    window.addEventListener('scroll',resetRect,{passive:true,capture:true});
    const reflectEvent=e=>{
      const r=rect||(rect=shell.getBoundingClientRect());if(r.width&&r.height)setReflect((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1)
    };
    shell.addEventListener('pointerdown',e=>{if(!hasSensor&&(!e.target.closest('button')||e.pointerType==='mouse'&&!raceInput())){touchId=e.pointerId;reflectEvent(e)}},{passive:true});
    shell.addEventListener('pointermove',e=>{if(!hasSensor&&(e.pointerType==='mouse'&&!raceInput()||e.pointerId===touchId))reflectEvent(e)},{passive:true});
    shell.addEventListener('animationend',e=>{for(const [cls,name] of Object.entries(pulseNames))if(e.animationName===name)e.target.classList.remove(cls)});
    for(const type of ['pointerup','pointercancel'])window.addEventListener(type,e=>{if(e.pointerId===touchId)touchId=null},{passive:true});
    GPBroadcast.init();setupGarage();bindControls();setReflect(-.32,-.37);
  }
  return {init,show,update,menuDirection,menuButton,refreshResult:()=>{if(state?.screen==='finish')result(state)},refreshLabels:()=>{if(state)labelControls(state)}};
})();
