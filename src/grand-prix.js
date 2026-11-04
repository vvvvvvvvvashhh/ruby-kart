// Store completed classifications, not derived totals. Re-entering a results
// screen can neither award a stage twice nor change a driver's old score.
const GrandPrix=(()=>{
 const points=[15,12,10,9,8,7,6,5,4,3,2,1],key='grandPrix.v1',count=definitions.length;
 let session=restore(readSave(key,null)),saved=true,pending=null,cached=null,cacheKey='';
 function restore(data){
  if(!data||data.version!==1||!engineClasses.includes(data.cc)||!data.build||!Number.isInteger(data.build.driver)||data.build.driver<0||data.build.driver>=12||!Array.isArray(data.rounds)||data.rounds.length>count)return null;
  for(const [i,stage] of data.rounds.entries()){
   if(!stage||stage.course!==i||!Array.isArray(stage.entries)||stage.entries.length!==12)return null;
   const ids=new Set();
   for(const row of stage.entries){
    if(!row||!Number.isInteger(row.id)||row.id<0||row.id>=12||ids.has(row.id)||!Number.isInteger(row.coins)||row.coins<0||row.coins>10||!Number.isFinite(row.time)||row.time<0)return null;
    ids.add(row.id);
   }
  }
  // Older checkpoints predate mixed-skill grids. Their returning rivals
  // get a repeatable draw without making the player restart the cup.
  const fieldSeed=Number.isInteger(data.fieldSeed)&&data.fieldSeed>=0&&data.fieldSeed<=0xffffffff?
   data.fieldSeed:(Math.imul(data.cc+data.build.driver,2654435761)>>>0);
  return {version:1,cc:data.cc,build:cleanBuild(data.build),fieldSeed,rounds:data.rounds};
 }
 function persist(){saved=writeSave(key,session);cached=null}
 function locked(){return !!session&&session.rounds.length<count}
 function nextCourse(){return locked()?session.rounds.length:0}
 function prepareMenu(){
  if(locked()){cc=session.cc;cfg={...session.build}}
  course=nextCourse();cached=null;
 }
 function startStage(){
  if(pending)return false;
  if(!locked()){session={version:1,cc,build:{...cfg},fieldSeed:drawFieldSeed(),rounds:[]};persist()}
  prepareMenu();const last=session.rounds.at(-1);
  startPlace=last?last.entries.findIndex(a=>a.id===cfg.driver)+1:8;
  return true;
 }
 function gridSlot(id){return session?.rounds.at(-1)?.entries.findIndex(a=>a.id===id)??-1}
 function reset(){if(pending)return false;session=null;persist();prepareMenu();startPlace=8;return true}
 function totals(){
  const player=session?.build.driver??cfg.driver;
  const rows=drivers.map((name,id)=>({id,name,player:id===player,place:0,total:0,wins:0,coins:0,stagePlace:0,heldCoins:0,rankPoints:0,coinPoints:0,gain:0}));
  for(const stage of session?.rounds||[])for(const [i,item] of stage.entries.entries()){
   const row=rows[item.id];row.stagePlace=i+1;row.heldCoins=item.coins;row.rankPoints=points[i];row.coinPoints=Math.floor(item.coins/2);
   row.gain=row.rankPoints+row.coinPoints;row.coins+=item.coins;row.total+=row.gain;if(i===0)row.wins++;
  }
  rows.sort((a,b)=>b.total-a.total||b.wins-a.wins||b.coins-a.coins||a.stagePlace-b.stagePlace||a.id-b.id);
  if(session?.rounds.length)rows.forEach((r,i)=>r.place=i+1);return rows;
 }
 function view(){
  if(mode!=='gp')return null;
  const completed=session?.rounds.length||0,round=screen==='finish'?course+1:Math.min(count,completed+1);
  const k=[course,screen,round,completed,!!pending,cfg.driver,saved].join('/');
  if(cached&&cacheKey===k)return cached;
  const rows=totals(),next=nextCourse();cacheKey=k;
  cached={round,total:count,completed,final:completed===count,settling:!!pending,locked:locked(),course,pointsTable:points,rows,saved,
   lobbyPhase:completed===count?'champion':locked()?'resume':'entry',nextRound:next+1,nextCourse:next,
   itinerary:tourCards.map((c,i)=>({course:i,name:c.name,done:i<completed,current:completed<count&&i===round-1}))};
  return cached;
 }
 function commit(racers){
  if(!locked()||session.rounds.length!==course)return;
  const list=classify(racers);
  standings=list.map(r=>({id:r.id,name:drivers[r.id],time:r.done||0,player:r.id===session.build.driver}));
  rank=standings.findIndex(r=>r.player)+1;
  session.rounds.push({course,entries:list.map(r=>({id:r.id,coins:clamp(r.coins|0,0,10),time:r.done||0}))});
  persist();
 }
 function classify(racers){
  return [...racers].sort((a,b)=>a.done&&b.done?a.done-b.done||a.id-b.id:a.done?-1:b.done?1:b.gate-a.gate||b.s-a.s||a.id-b.id);
 }
 // The finish camera coasts at real speed. In a short time slice the other
 // drivers complete the same race with the same AI, items, contact and coins.
 function capture(){return {me,cars,boxes,courseCoins,traps,shells,itemBursts,clock,worldT,logicCounter}}
 function restoreWorld(w){({me,cars,boxes,courseCoins,traps,shells,itemBursts,clock,worldT,logicCounter}=w)}
 function atFlag(){
  if(!locked()||session.rounds.length!==course||pending)return;
  if(cars.every(r=>r.done)){commit(cars);return}
  const world=capture();pending={world,end:clock+300};cached=null;
  // Render-only copies keep the player's finish camera, lap time and HUD
  // independent of the accelerated classification.
  cars=cars.map(r=>({...r,road:{...r.road},prevPose:r.prevPose?{...r.prevPose}:null}));
  me=cars[0];boxes=boxes.map(b=>({...b}));courseCoins=courseCoins.map(c=>({...c}));traps=[];shells=[];itemBursts=[];
 }
 function settle(){
  if(!pending)return;
  const presentation=capture(),job=pending;let complete=false;
  try{
   classifying=true;restoreWorld(job.world);
   const deadline=performance.now()+2.7;
   for(let n=0;n<72;n++){
    clock+=STEP;worldT+=STEP;logicCounter++;advanceRivals(STEP);updateRaceDrafts(STEP);pickups(STEP);
    complete=cars.every(r=>r.done)||clock>=job.end;
    if(complete||performance.now()>=deadline)break;
   }
   job.world=capture();
  }finally{restoreWorld(presentation);classifying=false}
  if(complete){pending=null;commit(job.world.cars);if(screen==='finish')UI.show(state())}
 }
 return {prepareMenu,startStage,gridSlot,reset,locked,view,atFlag,settle,get fieldSeed(){return session?.fieldSeed??0},get busy(){return !!pending},get complete(){return session?.rounds.length===count}};
})();
