// One scorebook serves both LCD layouts. The shell chooses its physical panel;
// the event state is the authority for every result and every navigation lock.
const GPBroadcast=(()=>{
 let lastState=null,lastPlan='',lastLedger='',planView='route',boardState=null,boardView='',view='stage',eventKey='',trigger=null,confirmReset=false;
 const el=id=>document.getElementById(id),z=n=>String(n).padStart(2,'0');
 const put=(id,value)=>{const n=el(id),v=String(value);if(n.textContent!==v)n.textContent=v};
 const cupName=s=>s.gp.itinerary[s.gp.round-1]?.name||s.courseName||'';
 const open=()=>!el('cupSchedule').hidden;
 function close(focus=true){
  if(!open())return;
  el('cupSchedule').hidden=true;confirmReset=false;
  if(focus&&trigger?.isConnected&&!trigger.hidden)trigger.focus({preventScroll:true});trigger=null;
  UI.refreshLabels();
 }
 function plan(s){
  const g=s.gp,items=g.itinerary,key=items.map(t=>[t.name,t.done,t.current].join('/')).join('|');
  if(lastPlan!==key){
   lastPlan=key;const list=el('gpItinerary');list.replaceChildren();
   for(const [i,stop] of items.entries()){
    const li=document.createElement('li'),n=document.createElement('b'),label=document.createElement('strong'),state=document.createElement('small');
    n.textContent=z(i+1);label.textContent=stop.name;state.textContent=stop.done?'完赛':stop.current?'本站':'待赛';
    li.dataset.progress=stop.done?'done':stop.current?'current':'upcoming';li.append(n,label,state);list.appendChild(li);
   }
  }
  el('gpReset').hidden=!g.locked;put('gpReset',confirmReset?'确认重开':'重开赛事');
  el('gpPlanNote').hidden=!g.locked&&g.saved!==false;
  put('gpPlanNote',g.saved===false?'本次进度未保存，请保留当前页面。':'继续赛事将从本站起点发车。');
  const champion=g.final&&g.rows.find(r=>r.place===1),ledger=planView==='total'&&g.completed>0;
  put('gpScheduleTitle',ledger?(champion?'总冠军 · '+champion.name+'　'+champion.total+' 分':'大奖赛总榜'):champion?'上届七站赛程':'大奖赛赛程');
  el('cupSchedule').dataset.ledger=String(g.completed>0);
  el('gpPlanTabs').hidden=!g.completed;el('gpItinerary').hidden=ledger;el('gpPlanScore').hidden=!ledger;
  el('gpRouteTab').setAttribute('aria-pressed',String(!ledger));el('gpLedgerTab').setAttribute('aria-pressed',String(ledger));
  if(ledger){
   const stamp=g.rows.map(r=>[r.id,r.place,r.total,r.coins,r.wins].join('.')).join('/');
   if(lastLedger!==stamp){
    lastLedger=stamp;const body=el('gpPlanScore').querySelector('tbody');body.replaceChildren();
    for(const r of g.rows.slice().sort((a,b)=>a.place-b.place))body.appendChild(rowCells(r,[z(r.place),r.name,r.wins,r.coins,r.total]));
    el('gpPlanScore').scrollTop=0;
   }
  }
 }
 function openPlan(button,tab){
  if(lastState?.mode!=='gp'||lastState.screen!=='menu')return;
  const sheet=el('cupSchedule'),host=el('upper').dataset.single==='true'?el('oneMenu'):el('lower');
  if(sheet.parentElement!==host)host.appendChild(sheet);
  confirmReset=false;planView=(tab==="total"||!tab&&lastState.gp.final)&&lastState.gp.completed?"total":"route";plan(lastState);trigger=button;sheet.hidden=false;el('gpClosePlan').focus({preventScroll:true});UI.refreshLabels();
 }
 function layout(skin,scene){
  if(!open())return;
  const single=skin!=='3ds',host=el(single?'oneMenu':'lower');
  if(scene==='menu'&&el('cupSchedule').parentElement===host)return;
  close(false);
  if(scene!=='menu')return;
  const focus=()=>queueMicrotask(()=>{
   const target=el(single?'oneSchedule':'dualSchedule');
   if(!target.hidden&&target.getClientRects().length)target.focus({preventScroll:true});
  });
  const settings=el('deviceDialog');
  if(settings.open)settings.addEventListener('close',focus,{once:true});else focus();
 }
 function init(){
  const sheet=el('cupSchedule');
  for(const b of [el('oneSchedule'),el('dualSchedule')])b.onclick=()=>openPlan(b);
  el('gpClosePlan').onclick=()=>close();
  for(const [id,tab] of [['gpRouteTab','route'],['gpLedgerTab','total']])el(id).onclick=()=>{planView=tab;plan(lastState)};
  el('gpReset').onclick=()=>{
   if(!confirmReset){confirmReset=true;plan(lastState);return}
   close(false);actions.resetGP();el(el('upper').dataset.single==='true'?'oneSchedule':'dualSchedule').focus({preventScroll:true});
  };
  sheet.addEventListener('keydown',e=>{
   if(e.code==='Escape'||e.code==='KeyB'){e.preventDefault();e.stopPropagation();close();return}
   // Keyboard presses inside the scorecard never leak into start-race shortcuts.
   if(e.code==='Tab'){
    const controls=Array.from(sheet.querySelectorAll('button,[tabindex="0"]')).filter(n=>!n.disabled&&n.getClientRects().length);
    const a=controls[0],b=controls.at(-1);
    if(document.activeElement===(e.shiftKey?a:b)){e.preventDefault();(e.shiftKey?b:a).focus()}
   }
   e.stopPropagation();
  });
  for(const [id,key] of [['gpStageTab','stage'],['gpTotalTab','total']])el(id).onclick=()=>setView(key);
 }
 function setView(key){
  if(!lastState?.gp||lastState.screen!=='finish'||lastState.gp.settling)return;
  if(view!==key){view=key;el('gpScoreScroll').scrollTop=0;result(lastState)}
 }
 function menu(s){
  lastState=s;const gp=s.mode==='gp'&&!!s.gp,g=s.gp;
  const show=gp&&s.screen==='menu';el('console').dataset.cup=gp?'true':'false';
  if(!show)close(false);
  el('cupBeacon').hidden=!show;el('menuPane').querySelector('.gpDualHead').hidden=!show;
  el('oneSchedule').hidden=!show;
  const locked=gp&&g.locked;
  el('dualEngineLock').hidden=!locked;
  el('oneCC').setAttribute('aria-label',locked?'大奖赛排量已锁定 · '+s.cc+'cc':'选择排量 · '+s.cc+'cc');
  for(const control of document.querySelectorAll('[data-cc],#oneCC,[data-action="garage"],#oneGarage'))control.disabled=!!locked;
  for(const id of ['coursePrev','courseNext','courseList','onePrev','oneNext','oneCoursePicker'])el(id).disabled=gp;
  if(show){
   const label=(g.final?'最终站':('第 '+g.round+' 站'))+' · '+cupName(s);
   put('cupBeaconLabel',g.final?'总冠军 · '+(g.rows.find(r=>r.place===1)?.name||'—'):('第 '+g.round+' 站 / 共 7 站'));
   put('cupDualRound','GRAND PRIX   /   '+z(g.round)+' OF 07');put('cupDualCourse',cupName(s));
   const ticks=el('cupTicks');
   const stamp=g.round+'/'+g.completed;
   if(ticks.dataset.stamp!==stamp){
    ticks.dataset.stamp=stamp;ticks.replaceChildren();
    for(const stop of g.itinerary){const i=document.createElement('i');i.className=stop.done?'done':stop.current?'current':'';ticks.appendChild(i)}
   }
   const start=g.final?'新一届大奖赛':g.locked?'继续赛事':'开始大奖赛';
   put('dualStartLabel',start);put('singleStartLabel',start);
   put('cupLine','RUBY GRAND PRIX   /   '+z(g.round));put('courseHint',g.final?'七站累计成绩':label+' · 名次分与金币分');
   if(open()){const host=el('upper').dataset.single==='true'?el('oneMenu'):el('lower');if(el('cupSchedule').parentElement!==host)close(false);else plan(s)}
  }else if(!gp){put('dualStartLabel','开始比赛');put('singleStartLabel','发车')}
  const live=gp&&(s.screen==='race'||s.screen==='countdown');
  el('gpLiveTag').hidden=!live;
  if(live){put('gpLiveTag','第 '+g.round+' 站 / '+g.total);put('screenCode','第 '+g.round+' 站 / '+g.total)}
  if(s.screen!=='finish'){eventKey='';boardState=null}
  if(typeof CupLobby!=='undefined')CupLobby.update(s);
 }
 function rowCells(row,labels,header=false){
  const tr=document.createElement('tr');
  for(const label of labels){
   const cell=document.createElement(header?'th':'td');if(header)cell.scope='col';
   cell.textContent=label;tr.appendChild(cell);
  }
  if(row){tr.dataset.mine=String(!!row.player);if(row.player){const mark=document.createElement('i');mark.textContent='你';tr.children[1].appendChild(mark)}}
  return tr;
 }
 function clockText(seconds){
  const ms=Math.max(0,Math.round((Number(seconds)||0)*1000));
  return Math.floor(ms/60000)+':'+z(Math.floor(ms/1000)%60)+'.'+String(ms%1000).padStart(3,'0');
 }
 function metrics(items,kicker){
  const summary=el('gpPersonal');summary.replaceChildren();
  if(!items.length)return;
  const caption=document.createElement('em');caption.textContent=kicker;summary.appendChild(caption);
  for(const [label,val] of items){
   const item=document.createElement('span'),v=document.createElement('b'),l=document.createElement('small');
   v.textContent=val;l.textContent=label;item.append(v,l);summary.appendChild(item);
  }
 }
 function podium(rows,withPoints){
  const band=el('gpPodium');band.hidden=!rows.length;band.replaceChildren();
  for(const [idx,r] of rows.slice(0,3).entries()){
   const slot=document.createElement('span'),rank=document.createElement('b'),person=document.createElement('strong'),value=document.createElement('small');
   rank.textContent=z(idx+1);person.textContent=r.name;value.textContent=withPoints?r.total+' 分':r.time?clockText(r.time):'未冲线';
   slot.append(rank,person,value);band.appendChild(slot);
  }
 }
 function reportArt(s){
  if(el('upper').dataset.single!=='true')return;
  el('finishRoute').setAttribute('d',SingleDisplay.outline());
  put('finishSerial','RK · '+z(s.course+1)+' / '+s.cc+'cc');
 }
 function splitTrace(laps,staged){
  const figure=el('splitPace'),values=laps.filter(t=>Number.isFinite(t)&&t>0);
  figure.hidden=values.length<2;if(figure.hidden)return;
  const fast=Math.min(...values),slow=Math.max(...values),spread=slow-fast;
  put('splitTitle',staged?'赛段用时变化':'每圈用时变化');
  put('splitRange','相差 '+spread.toFixed(2)+' 秒');
  const points=values.map((v,i)=>[4+192*i/(values.length-1),spread?37-30*(v-fast)/spread:22]);
  const line=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join('');
  figure.querySelector('.timingLine').setAttribute('d',line);
  figure.querySelector('.timingArea').setAttribute('d',line+'L196 44H4Z');
  const group=figure.querySelector('g');group.replaceChildren();
  for(const [x,y] of points){
   const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
   dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',2);group.appendChild(dot);
  }
 }
 function raceReport(s,board){
  const timed=s.mode==='tt',laps=s.lapTimes||[],rows=s.results||[],fastest=Math.min(...laps.filter(v=>v>0));
  board.hidden=false;board.dataset.kind=s.mode;board.dataset.final='false';board.dataset.wait='false';
  board.setAttribute('aria-label',timed?'计时赛成绩':'对战赛成绩');el('finishPane').dataset.cup='true';
  board.querySelector('.cupHero').dataset.round=timed?'TT':z(s.pos);
  put('gpRoundCode',timed?'TIME TRIAL   /   PERSONAL TIMING':'VERSUS   /   FINISH ORDER');
  put('gpResultTitle',timed?clockText(s.time):'第 '+s.pos+' 名');put('gpResultDeck',s.courseName+'　·　'+s.cc+'cc');
  if(timed){
   metrics([['车手',s.driverName],[s.staged?'赛段':'圈数',laps.length],['历史最佳',s.best?clockText(s.best):'—']],'计时记录');
   podium([],false);
  }else{
   metrics([['完赛用时',clockText(s.time)],['金币',s.coins],['参赛车手',rows.length]],s.driverName+' · 本站成绩');
   podium(rows.filter(r=>r.time>0),false);
  }
  reportArt(s);
  el('gpStageTab').hidden=true;el('gpTotalTab').hidden=true;
  el('finishListTitle').hidden=false;put('finishListTitle',timed?(s.staged?'赛段计时':'每圈计时'):'车手排名');
  put('gpPageCode',timed?(s.recordText||'计时完成'):rows.length+' 位车手');
  const table=el('gpScoreTable'),body=table.tBodies[0];body.replaceChildren();
  if(timed){
   table.tHead.replaceChildren(rowCells(null,[s.staged?'赛段':'圈数','用时',s.staged?'全程进度':'差最快','累计用时'],true));let total=0;
   laps.forEach((t,i)=>{
    total+=t;
    const tr=rowCells(null,[z(i+1),clockText(t),s.staged?i+1+'/'+laps.length:t===fastest?'最快':'+'+(t-fastest).toFixed(3),clockText(total)]);
    if(!s.staged&&t===fastest)tr.dataset.best='true';body.appendChild(tr);
   });
  }else{
   table.tHead.replaceChildren(rowCells(null,['名次','车手','用时','距首名'],true));
   rows.forEach((r,i)=>body.appendChild(rowCells(r,[z(i+1),r.name,r.time?clockText(r.time):'未冲线',r.time&&rows[0]?.time?(i?'+'+(r.time-rows[0].time).toFixed(2):'—'):'—'])));
  }
  if(timed)splitTrace(laps,s.staged);else el('splitPace').hidden=true;
  el('gpScoreScroll').scrollTop=0;el('gpSaveStatus').hidden=true;
  const next=tourCards[(s.course+1)%tourCards.length],button=el('finishNext'),retry=el('finishRetry');
  retry.hidden=false;retry.classList.toggle('gold',timed);retry.textContent=timed?'再跑一次':'重赛';
  button.disabled=false;button.classList.toggle('gold',!timed);button.textContent='下一条赛道';button.setAttribute('aria-label','下一条赛道 · '+next.name);
  el('finishPane').querySelector('[data-action=menu]').textContent='赛事中心';
  boardState=null;return true;
 }
 function result(s){
  lastState=s;const g=s.gp;
  const single=el('upper').dataset.single==='true';
  if(g&&g===boardState&&view===boardView&&el('cupResult').dataset.single===String(single))return true;
  const board=el('cupResult');board.dataset.single=String(single);
  if(!g&&single)return raceReport(s,board);
  board.hidden=!g||s.mode!=='gp';
  el('finishPane').dataset.cup=board.hidden?'false':'true';
  if(board.hidden){el('finishRetry').hidden=false;el('finishRetry').textContent='再跑一场';el('finishNext').disabled=false;el('finishPane').querySelector('[data-action=menu]').textContent='选赛道';boardState=null;return false}
  // Final standings can arrive after the flag. Open the champion's table
  // once when it becomes available; later manual tab changes stay put.
  const round=g.round+'/'+s.course+'/'+g.final;
  if(eventKey!==round){eventKey=round;view=g.final?'total':'stage';el('gpScoreScroll').scrollTop=0}
  boardState=g;boardView=view;board.dataset.kind='gp';reportArt(s);
  board.setAttribute('aria-label','大奖赛积分结算');el('splitPace').hidden=true;el('finishListTitle').hidden=true;el('gpStageTab').hidden=false;el('gpTotalTab').hidden=false;
  const rows=g.rows.slice(),mine=rows.find(r=>r.player),ranked=rows.slice().sort((a,b)=>a.place-b.place),winner=ranked[0];
  const final=g.final&&!g.settling,settling=g.settling;
  board.dataset.final=String(final);board.dataset.wait=String(settling);board.querySelector('.cupHero').dataset.round=z(g.round);
  put('gpRoundCode','GRAND PRIX   /   '+z(g.round)+' OF 07');
  put('gpResultTitle',final?(winner?.name||'总冠军'):settling?'等待本站结算':cupName(s));
  put('gpResultDeck',final?'七站总冠军　·　'+(winner?.total||0)+' 分':settling?'等待其余车手冲线':('本站第 '+(mine?.stagePlace||s.pos)+' 名　·　'+s.cc+'cc'));
  metrics(mine&&!settling?[['名次分','+'+mine.rankPoints],['金币分','+'+mine.coinPoints],['累计',mine.total]]:[],'我的积分');
  podium(final?ranked:[],true);
  el('gpStageTab').setAttribute('aria-pressed',String(view==='stage'));el('gpTotalTab').setAttribute('aria-pressed',String(view==='total'));
  el('gpStageTab').disabled=settling;el('gpTotalTab').disabled=settling;
  put('gpPageCode',settling?'核对中':rows.length+' 位车手');
  const table=el('gpScoreTable'),stage=view==='stage';
  table.tHead.replaceChildren(rowCells(null,stage?['名次','车手','名次分','金币→分','本站']:['排名','车手','胜场','金币','总分'],true));
  const body=table.tBodies[0];body.replaceChildren();if(!settling){
   const lines=stage?rows.sort((a,b)=>a.stagePlace-b.stagePlace):ranked;
   for(const r of lines)body.appendChild(rowCells(r,stage?[z(r.stagePlace),r.name,'+'+r.rankPoints,r.heldCoins+'→+'+r.coinPoints,r.gain]:[z(r.place),r.name,r.wins,r.coins,r.total]));
  }
  el('gpSaveStatus').hidden=g.saved!==false;
  el('finishPane').querySelector('[data-action=menu]').textContent='赛事中心';
  const next=el('finishNext');el('finishRetry').hidden=true;next.disabled=settling;next.classList.add('gold');
  const nextTrack=g.itinerary[g.round];const action=settling?'等待结算':final?'完成大奖赛':'下一站';
  put('finishNext',!settling&&!final&&nextTrack?'下一站 · '+nextTrack.name:action);
  next.setAttribute('aria-label',!settling&&!final&&nextTrack?action+' · '+nextTrack.name:action);
  put('takeKicker',final?'GRAND PRIX CHAMPION':'GRAND PRIX  /  ROUND '+z(g.round));
  put('takeTitle',final?(winner?.name||'总冠军')+' · 总冠军':'本站第 '+s.pos+' 名');
  put('takeSub',settling?'正在汇总比赛成绩':final?'七站累计 '+(winner?.total||0)+' 分':cupName(s)+'　我的积分 '+(mine?.total||0));
  return true;
 }
 return {init,menu,result,close,open,openPlan,setView,layout};
})();
// The list is a child of the trigger's grid cell. Its edges and the button's
// edges share the same LCD transform, even when viewed from the side.
const RaceChooser=(()=>{
 const modes=[['vs','对战赛','同场争夺名次'],['tt','计时赛','挑战个人纪录'],['gp','大奖赛','七站累计积分']];
 const grades={50:'轻松入门',100:'标准竞速',150:'进阶挑战',200:'高速挑战',250:'极限竞速'};
 const el=id=>document.getElementById(id);
 const controls={oneMode:'mode',oneCC:'cc'};
 let kind='',trigger=null,host=null,index=0,options=[],observer=null,swallow=null;
 function close(focus=true){
  if(!trigger)return;
  const owner=trigger;kind='';trigger=null;host=null;observer?.disconnect();
  el('raceChooser').hidden=true;owner.setAttribute('aria-expanded','false');
  if(focus&&owner.getClientRects().length)owner.focus({preventScroll:true});
  UI.refreshLabels();
 }
 function fit(){
  if(!trigger)return;
  // offsetParent distances are in unprojected LCD pixels. Only the available
  // height needs measuring; CSS supplies the exact subpixel width and edges.
  let y=0,n=trigger.parentElement;
  while(n&&n!==host){y+=n.offsetTop;n=n.offsetParent;if(n&&n!==host)y+=n.clientTop}
  el('raceChooser').style.maxHeight=Math.max(0,y-1)+'px';
 }
 function focusOption(){
  const row=options[index],list=el('raceChooser');
  row.focus({preventScroll:true});
  const top=row.offsetTop,bottom=top+row.offsetHeight;
  if(top<list.scrollTop)list.scrollTop=top;
  else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;
 }
 function move(step){
  if(!kind)return false;
  index=(index+step+options.length)%options.length;focusOption();return true;
 }
 function commit(button=options[index]){
  if(!kind||!button)return;
  const action=kind,value=button.value;close();
  if(action==='mode')actions.selectMode(value);else actions.selectCC(Number(value));
 }
 function show(key,button){
  if(button.disabled||screen!=='menu')return;
  if(button===trigger){close();return}
  if(GPBroadcast.open())GPBroadcast.close(false);
  if(trigger)close(false);
  kind=key;trigger=button;host=button.closest('#upper,#lower');
  const list=el('raceChooser'),values=key==='mode'?modes:engineClasses.map(v=>[String(v),v+'cc',grades[v]]),value=key==='mode'?mode:String(cc);
  button.parentElement.appendChild(list);list.setAttribute('aria-label',key==='mode'?'比赛模式':'发动机排量');
  list.replaceChildren();options=[];index=0;
  values.forEach(([id,label,note],i)=>{
   const row=document.createElement('button'),name=document.createElement('span'),mark=document.createElement('i');
   row.type='button';row.value=id;row.tabIndex=-1;row.setAttribute('role','option');
   row.setAttribute('aria-selected',String(id===value));row.setAttribute('aria-label',label+' · '+note);
   name.textContent=label;mark.setAttribute('aria-hidden','true');mark.textContent=id===value?'✓':'';
   row.append(name,mark);row.onclick=()=>commit(row);row.onfocus=()=>{index=i};
   list.appendChild(row);options.push(row);if(id===value)index=i;
  });
  button.setAttribute('aria-expanded','true');list.hidden=false;fit();
  observer?.observe(host);observer?.observe(button);focusOption();UI.refreshLabels();
 }
 function allowTarget(target){
  return !!target.closest?.('#raceChooser,#oneMode,#oneCC,[data-open-settings],#settingsKey,#itemBtn,#driftBtn,[data-dir]');
 }
 function stop(e){e.preventDefault();e.stopImmediatePropagation()}
 function init(){
  const list=el('raceChooser');
  for(const [id,key] of Object.entries(controls)){
   const b=el(id);b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-controls','raceChooser');b.setAttribute('aria-expanded','false');
   b.onclick=()=>show(key,b);
   b.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowUp'].includes(e.code))return;
    e.preventDefault();e.stopPropagation();if(!e.repeat)show(key,b);
   });
  }
  if(typeof ResizeObserver==='function')observer=new ResizeObserver(fit);
  document.addEventListener('pointerdown',e=>{
   if(typeof ModelCabinet!=='undefined'&&ModelCabinet.shellGesture(e))return;
   swallow=null;
   if(!trigger||allowTarget(e.target))return;
   swallow=e.pointerId;close();stop(e);
  },true);
  document.addEventListener('click',e=>{
   // Some touch browsers synthesize click even after a cancelled pointerdown.
   if(swallow!==null&&(e.pointerId===swallow||e.detail>0)){swallow=null;stop(e);return}
   if(trigger&&!allowTarget(e.target)){close();stop(e)}
  },true);
  list.addEventListener('keydown',e=>{
   if(e.code==='Tab'){close();e.stopPropagation();return}
   if(['Escape','KeyB'].includes(e.code))close();
   else if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.code))move(e.code==='ArrowDown'||e.code==='ArrowRight'?1:-1);
   else if(e.code==='Home'||e.code==='End'){index=e.code==='Home'?0:options.length-1;focusOption()}
   else if(['Enter','NumpadEnter','Space','KeyA'].includes(e.code)){if(!e.repeat)commit()}
   else return;
   e.preventDefault();e.stopPropagation();
  });
 }
 function layout(skin,scene){
  if(!trigger)return;
  if(scene!=='menu'||(host.id==='upper')!==(skin!=='3ds')||trigger.disabled){close(false);return}
  fit();
 }
 return {init,layout,show,close,move,commit,get open(){return !!kind}};
})();
// Single-LCD race information. The outline stays put; only the racer dots
// move. The full touch map can still be opened for a closer look.
const SingleDisplay=(()=>{
 let active=false,scene='',courseKey=null,scale=1,ox=0,oy=0,dots=[],lastDotTime=-1,nodes,garageHome,lastSpeed=-1,lastPaint='',lastAngle=NaN,menuKey='';
 const set=(n,v)=>{v=String(v);if(n.textContent!==v)n.textContent=v};
 function init(){
  const svg=byId('oneMap'),ns=svg.namespaceURI,group=svg.querySelector('g');
  for(let i=0;i<12;i++){const dot=document.createElementNS(ns,'circle');dot.setAttribute('r',i===11?3.6:1.9);group.appendChild(dot);dots.push(dot)}
  nodes={svg,outline:svg.querySelector('.oneOutline'),route:svg.querySelector('.oneRoute'),finish:svg.querySelector('.oneFinish'),menu:byId('oneMenu'),hud:byId('oneRace'),name:byId('oneName'),tour:byId('oneTour'),mode:byId('oneMode'),cc:byId('oneCC'),speed:document.querySelector('.oneSpeed strong'),section:document.querySelector('.oneSection')};
  Object.assign(nodes,{shop:byId('oneShop'),slot:byId('shopSlot'),garage:byId('garagePane'),driver:byId('shopDriver'),plate:byId('shopPlate'),cup:byId('oneCup'),english:byId('oneEnglish'),previewRoute:byId('menuRoute'),ticks:document.querySelector('.meterTicks i')});
  garageHome=nodes.garage.parentElement;
  const glyphs={
   driver:'M4 12a8 8 0 0 1 16 0v5l-4 3H8l-3-4Zm1-1h13l-2 4H7Z',
   body:'M2 13l3-1 3-5h6l3 4 4 1v4h-3m-12 0H2Zm5 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0m8 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
   tire:'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0ZM16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM12 3v3m9 6h-3m-6 6v3m-6-9H3',
   wing:'m2 12 10-7 10 7-6 2-4 5-4-5Zm0 0 10-1 10 1m-10-1v8',
   paint:'M12 3c-2 4-6 7-6 12a6 6 0 0 0 12 0c0-5-4-8-6-12Zm-3 12c0 2 1 3 3 3',
   tune:'M4 7h5m4 0h7M4 17h10m4 0h2M9 4h4v6H9Zm5 10h4v6h-4Z'
  };
  for(const b of nodes.garage.querySelectorAll('[data-part]')){
   b.insertAdjacentHTML('afterbegin','<svg class="partSymbol" aria-hidden="true" viewBox="0 0 24 24"><path d="'+glyphs[b.dataset.part]+'"/></svg>');
  }
  nodes.views=Array.from(nodes.shop.querySelectorAll('[data-angle]'));
  for(const b of nodes.views)b.onclick=()=>actions.orbit(angle(Number(b.dataset.angle)-garageAngle));
  const quickCourse=byId('oneCoursePicker');definitions.forEach((def,i)=>quickCourse.add(new Option(def.name,String(i))));quickCourse.onchange=()=>actions.selectCourse(Number(quickCourse.value));
  byId('onePrev').onclick=()=>actions.selectCourse(mod(course-1,definitions.length));
  byId('oneNext').onclick=()=>actions.selectCourse(mod(course+1,definitions.length));
  RaceChooser.init();
  byId('oneGarage').onclick=actions.garage;byId('oneStart').onclick=actions.start;
 }
 function view(skin,s){
  GPBroadcast.layout(skin,s);RaceChooser.layout(skin,s);
  active=skin!=='3ds';scene=s;if(!nodes)return;
  const workshop=active&&s==='garage',parent=workshop?nodes.slot:garageHome;
  if(nodes.garage.parentElement!==parent)parent.appendChild(nodes.garage);
  const lcd=byId('upper');lcd.dataset.screen=s;lcd.dataset.single=String(active);
  nodes.shop.hidden=!workshop;nodes.menu.hidden=!active||s!=='menu';nodes.hud.hidden=!active||(s!=='race'&&s!=='countdown');
  if(active&&s==='menu')updateMenu();if(s==='finish')UI.refreshResult();lastDotTime=-1;
 }
 function updateMenu(){
  const key=course+'/'+mode+'/'+cc;
  if(menuKey===key)return;menuKey=key;
  if(courseKey!==track)mapPath();
  const card=tourCards[course];byId('upper').style.setProperty('--series',card.color);
  byId('oneCoursePicker').value=String(course);set(nodes.cup,card.cup.toLowerCase()===track.d.english.toLowerCase()?card.tag:card.cup);set(nodes.english,track.d.english);
  set(nodes.name,track.d.name);set(nodes.tour,String(course+1).padStart(2,'0')+' / '+String(definitions.length).padStart(2,'0'));
  set(nodes.mode,mode==='gp'?'大奖赛':mode==='tt'?'计时赛':'对战赛');set(nodes.cc,cc+'cc');
 }
 function mapPath(){
  const end=track.d.stages?Math.ceil(track.finishFraction*track.n):track.n,pts=track.pts;
  let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
  for(let i=0;i<end;i++){const p=pts[i];x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z)}
  scale=Math.min(92/(x1-x0||1),57/(z1-z0||1));ox=53-(x0+x1)*scale/2;oy=36+(z0+z1)*scale/2;
  let path='';for(let i=0;i<end;i+=5){const p=pts[i];path+=(i?'L':'M')+(ox+p.x*scale).toFixed(1)+' '+(oy-p.z*scale).toFixed(1)}
  const f=track.d.stages?track.at(track.finishFraction*track.L):pts[0],x=ox+f.x*scale,y=oy-f.z*scale;
  path+=track.d.stages?'L'+x.toFixed(1)+' '+y.toFixed(1):'Z';
  nodes.previewRoute.setAttribute('d',path);nodes.route.setAttribute('d',path);nodes.outline.setAttribute('d',path);
  nodes.finish.setAttribute('d','M'+(x-2.9)+' '+y+'h5.8');
  courseKey=track;
 }
 function update(s){
  if(!nodes||!active)return;if(scene==='menu'){updateMenu();return}if(scene==='garage'){
   if(garageAngle!==lastAngle){lastAngle=garageAngle;for(const b of nodes.views)b.setAttribute('aria-pressed',String(Math.abs(angle(garageAngle-Number(b.dataset.angle)))<.12))}
   const paint=GARAGE.paints[s.cfg.paint].hex;if(paint!==lastPaint){nodes.shop.style.setProperty('--paint',paint);lastPaint=paint}set(nodes.driver,s.driverName);set(nodes.plate,'No. '+String(s.cfg.driver+1).padStart(2,'0'));return;
  }
  if(nodes.hud.hidden)return;
  if(lastSpeed!==s.speed){lastSpeed=s.speed;nodes.ticks.style.transform='scaleX('+Math.min(1,s.speed/160)+')'}
  set(nodes.speed,s.speed);set(nodes.section,s.section);
  if(courseKey!==track)mapPath();
  if(lastDotTime>=0&&worldT>=lastDotTime&&worldT-lastDotTime<.11)return;lastDotTime=worldT;
  for(let i=0;i<dots.length;i++){
   const r=i===11?me:cars[i+1],dot=dots[i];
   if(!r){if(!dot.hasAttribute('display'))dot.setAttribute('display','none');continue}
   if(dot.hasAttribute('display'))dot.removeAttribute('display');
   dot.setAttribute('cx',(ox+r.x*scale).toFixed(1));dot.setAttribute('cy',(oy-r.z*scale).toFixed(1));
   const color=i===11?'#ffe06b':liveries[r.id];if(dot.getAttribute('fill')!==color)dot.setAttribute('fill',color);
  }
 }
 function outline(){if(courseKey!==track)mapPath();return nodes.previewRoute.getAttribute('d')||''}
 return {init,view,update,outline};
})();
