// Keep the title up through downloading, cold setup and the first visible race frame.
const RubyLaunch=(()=>{
 const root=document.documentElement,card=document.getElementById('titleCard');
 let shownAt,ready=false,skipped=false,timer=0;
 requestAnimationFrame(t=>{shownAt=t});
 function finish(){
  if(root.dataset.launch!=='reveal')return;
  clearTimeout(timer);card.hidden=true;delete root.dataset.launch;
  document.getElementById('studio').inert=false;
  window.removeEventListener('keydown',key,true);
 }
 function reveal(){
  if(!ready||root.dataset.launch!=='cover')return;
  clearTimeout(timer);root.dataset.launch='reveal';
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduced)finish();else timer=setTimeout(finish,380);
 }
 function skip(){skipped=true;if(ready)reveal()}
 function key(e){
  if(e.ctrlKey||e.metaKey||e.altKey||e.key==='Tab')return;
  e.stopImmediatePropagation();
  if(e.key==='Enter'||e.key===' '||e.key==='Escape'){e.preventDefault();if(!e.repeat)skip()}
 }
 card.addEventListener('click',skip);window.addEventListener('keydown',key,true);
 return {
  start(run){
   // Two animation frames make room for the browser to paint the static title
   // even when the entire offline file comes from cache.
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    try{run()}catch(error){document.getElementById('launchError').hidden=false;throw error}
   }));
  },
  presented(){
   if(ready)return;ready=true;
   timer=setTimeout(reveal,skipped?0:Math.max(0,1250-(performance.now()-(shownAt??performance.now()))));
  }
 };
})();
