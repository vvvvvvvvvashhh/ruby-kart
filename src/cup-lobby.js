// The championship has its own lobby. Its poster sits on the real upper LCD;
// the existing input handlers, projected screens and race chooser stay in place.
const CupLobby=(()=>{
 let poster,desk,stamp='',marks=[];
 const el=id=>document.getElementById(id),pad=n=>String(n).padStart(2,'0');
 const trophy='<svg class="lobbyTrophy" viewBox="0 0 54 52" aria-hidden="true"><defs><linearGradient id="lobbyCupGold" x2=".18" y2="1"><stop stop-color="#fff6ce"/><stop offset=".34" stop-color="#ffd576"/><stop offset=".65" stop-color="#df9660"/><stop offset="1" stop-color="#ffe6a2"/></linearGradient></defs><g fill="none" stroke="url(#lobbyCupGold)" stroke-width="2.5" stroke-linejoin="round"><path d="M16 12H6c0 10 7 14 13 14M38 12h10c0 10-7 14-13 14"/></g><path fill="url(#lobbyCupGold)" d="M14 8h26l-2.3 12.4c-.8 5.5-4.9 9-8.6 10.4v5.5l6.3 3.1v3.2H18.6v-3.2l6.3-3.1v-5.5c-3.7-1.4-7.8-4.9-8.6-10.4z"/><path fill="#8f452c" d="m27 13 1.7 3.5 3.9.6-2.8 2.7.7 3.8-3.5-1.8-3.5 1.8.7-3.8-2.8-2.7 3.9-.6z"/><path stroke="#ffeab8" stroke-width="1.6" d="M12 8h30M17 44h20"/></svg>';
 function openSchedule(button,tab,index=null){
  GPBroadcast.openPlan(button,tab);
  for(const old of el('gpItinerary').querySelectorAll('[data-lobby-mark]'))delete old.dataset.lobbyMark;
  if(index==null)return;
  const row=el('gpItinerary')?.children[index];
  if(row){
   row.dataset.lobbyMark='';
   row.scrollIntoView({block:'nearest',inline:'nearest'});
  }
 }
 function build(){
  poster=document.createElement('section');poster.id='cupLobbyPoster';poster.hidden=true;poster.setAttribute('aria-label','大奖赛报名区');
  poster.innerHTML='<header class="lobbyMast"><span class="lobbyCrest">'+trophy+'</span><div><small>RUBY <i>/</i> GRAND PRIX</small><h2>七站大奖赛</h2><span class="menuCredit">'+rubySignature+'</span></div></header>'+
   '<div class="lobbyCount" aria-hidden="true"><small>ROUND</small><span><b></b><i>/ 07</i></span></div>'+
   '<div class="lobbyFoot"><div class="lobbyCopy"><p class="lobbyBrow"><i></i><strong></strong><span></span></p><h3></h3><p class="lobbySub"></p></div>'+
   '<div class="lobbyStrip"><ol class="lobbyRail" aria-label="七站赛程"></ol><div class="lobbyActions"><button type="button" class="lobbyTotal" aria-controls="cupSchedule">积分榜</button></div></div></div>';
  el('upper').appendChild(poster);
  desk=document.createElement('div');desk.id='cupLobbyDesk';desk.hidden=true;
  desk.innerHTML='<div class="lobbyDeskCopy"><small></small><strong></strong></div><div class="lobbyDeskActions"><button type="button" class="lobbyTotal" aria-controls="cupSchedule">积分榜</button></div>';
  el('menuPane').prepend(desk);
  for(const [mount,button] of [[poster.querySelector('.lobbyActions'),el('oneSchedule')],[desk.querySelector('.lobbyDeskActions'),el('dualSchedule')]]){
   button.textContent='赛程';button.setAttribute('aria-label','查看七站赛程');button.onclick=()=>openSchedule(button,'route');
   mount.prepend(button);
   const total=mount.querySelector('.lobbyTotal');
   total.onclick=()=>openSchedule(total,'total');
  }
  const rail=poster.querySelector('.lobbyRail');
  for(let i=0;i<7;i++){
   const slot=document.createElement('li'),button=document.createElement('button'),label=document.createElement('span');
   button.type='button';button.setAttribute('aria-controls','cupSchedule');button.textContent=label.textContent=pad(i+1);
   button.onclick=()=>openSchedule(button,'route',i);
   slot.append(button,label);rail.appendChild(slot);marks.push(slot);
  }
 }
 function update(s){
  const active=s.screen==='menu'&&s.mode==='gp'&&!!s.gp,unit=el('console');
  if(!active){
   if(poster&&!poster.hidden){poster.hidden=desk.hidden=true;delete unit.dataset.cupLobby;stamp=''}
   return;
  }
  if(!poster)build();
  const g=s.gp,phase=g.lobbyPhase,champion=phase==='champion',resume=phase==='resume';
  const stop=g.itinerary[g.nextCourse],winner=champion?g.rows.find(x=>x.place===1):null,player=g.rows.find(x=>x.player);
  const round=g.nextRound,total=g.total,next=stop?.name||s.courseName;
  const cta=champion?'开新一届':resume?'继续第 '+round+' 站':'报名参赛';
  // GPBroadcast also handles the shared non-cup menu. Restore our action
  // wording even when the rest of this poster is already up to date.
  for(const id of ['dualStartLabel','singleStartLabel']){
   const label=el(id);if(label.textContent!==cta)label.textContent=cta;
  }
  poster.hidden=desk.hidden=false;unit.dataset.cupLobby=phase;
  el('screenLabel').textContent='GRAND PRIX';el('screenCode').textContent=champion?'冠军名册':resume?'赛事进行中':'开放报名';
  const key=[phase,round,total,next,s.cc,winner?.id,winner?.total,player?.place,player?.total,g.saved].join('/');
  if(stamp===key)return;stamp=key;
  poster.dataset.phase=phase;desk.dataset.phase=phase;
  const put=(n,t)=>{if(n.textContent!==t)n.textContent=t};
  put(poster.querySelector('.lobbyCount small'),champion?'新一届首站':resume?'下一站':'揭幕站');
  put(poster.querySelector('.lobbyCount b'),pad(round));
  put(poster.querySelector('.lobbyBrow strong'),champion?'上届冠军':resume?'即将出赛':'首站报名');
  put(poster.querySelector('.lobbyBrow span'),champion?'DEFENDING CHAMPION':resume?'NEXT ON THE GRID':'OPENING ROUND');
  put(poster.querySelector('h3'),winner?.name||next);
  const rank=player?.place?'总榜第 '+player.place+' 名 · '+player.total+' 分':'本站尚未结算';
  put(poster.querySelector('.lobbySub'),champion?(winner?winner.total+' 分　·　':'')+'新一届从'+next+'出发':resume?rank:'12 位车手 · 名次分与金币分');
  put(desk.querySelector('small'),champion?'NEW SEASON':resume?'NEXT ROUND':'ENTRY GRID');
  put(desk.querySelector('strong'),champion?'新一届 · '+next:'第 '+round+' 站 · '+next);
  for(const box of [poster,desk]){
   const b=box.querySelector('.lobbyTotal');b.hidden=!g.completed;b.textContent=champion?'冠军榜':'积分榜';
   b.setAttribute('aria-label',champion?'查看上届冠军与总榜':'查看大奖赛积分榜');
  }
  for(const [i,slot] of marks.entries()){
   const item=g.itinerary[i],selected=i===g.nextCourse;
   const status=selected?'current':!champion&&i<g.completed?'done':'upcoming';
   slot.dataset.phase=status;
   const button=slot.querySelector('button'),label=slot.querySelector('span'),name='第 '+(i+1)+' 站 · '+(item?.name||'')+(selected?' · 下一站':status==='done'?' · 已完赛':'');
   button.title=name;button.setAttribute('aria-label',name+'，查看赛程');label.setAttribute('aria-label',name);
   if(selected)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  }
 }
 return {update};
})();
