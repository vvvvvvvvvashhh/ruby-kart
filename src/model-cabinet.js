// The DOM nodes themselves are projected. Their handlers, focus, save data,
// audio and the race renderer stay alive across a hardware or camera change.
const ModelCabinet=(()=>{
 const builders={'3ds':buildRuby3DS,switch:buildRubySwitch,wiiu:buildRubyWiiU};
 const extra={powerKey:'[data-skin-power]',stickRear:'[data-skin-rear]'};
 let form='flat',skin='3ds',unit,layer,painter,mesh,yaw=0,pitch=0,pose=null,frame=0,drag=null,watches,resize,densityQuery,forcedCPU=false;
 let oldPose='',oldPanel='',oldMoves='',oldLight='',oldDrag=false,mounted=false,unavailable=false;
 let lampTimer=0,lastLamp=-Infinity,lampX=0,lampY=0;
 const slots=new Map(),light=[0,0],pressed=new Map(),maps=new Map();
 const shellHeld=new Set(),shellClicks=new Map(),routes=new WeakMap();
 const announce=(reason='')=>window.dispatchEvent(new CustomEvent('modelcabinetchange',{detail:{form,reason}}));
 function matrix(q){
  const [p,b,c,d]=q,dx=b[0]-c[0],dy=b[1]-c[1],ex=d[0]-c[0],ey=d[1]-c[1];
  const sx=p[0]-b[0]+c[0]-d[0],sy=p[1]-b[1]+c[1]-d[1],det=dx*ey-ex*dy;
  if(Math.abs(det)<1e-5)return null;
  const g=(sx*ey-ex*sy)/det,h=(dx*sy-sx*dy)/det;
  return [b[0]-p[0]+g*b[0],d[0]-p[0]+h*d[0],p[0],b[1]-p[1]+g*b[1],d[1]-p[1]+h*d[1],p[1],g,h];
 }
 function localPoint(id,x,y){
  const m=maps.get(id);if(!mounted||!m)return null;const rect=unit.getBoundingClientRect();x-=rect.left;y-=rect.top;
  return pointIn(m,x,y);
 }
 function pointIn(m,x,y){
  const [a,b,c,d,e,f,g,h]=m,A=a-x*g,B=b-x*h,D=d-y*g,E=e-y*h,i=x-c,j=y-f,det=A*E-B*D;
  if(Math.abs(det)<.000001)return null;return {x:(i*E-B*j)/det,y:(A*j-i*D)/det};
 }
 // A held finger keeps the input plane it touched even if another finger
 // turns the hardware edge-on before the driving finger moves again.
 function contactSpace(id,hardware=true){
  const m=maps.get(id);if(!mounted||!m)return null;
  const box=unit.getBoundingClientRect(),roll=hardware&&skin!=='3ds'&&unit.clientHeight>unit.clientWidth*1.12;
  return (x,y)=>{const p=pointIn(m,x-box.left,y-box.top);return roll&&p?{x:1-p.y,y:p.x}:p};
 }
 function installNode(id,node,key){
  if(!node)return;const marker=document.createComment('cabinet '+id),wrap=document.createElement('div');
  node.before(marker);wrap.className=key?'cabinetKey':'cabinetLCD';wrap.dataset.anchor=id;layer.append(wrap);wrap.append(node);
  slots.set(id,{node,wrap,marker,key});
 }
 function mount(){
  installNode('upper',document.getElementById('upper'),false);installNode('lower',document.getElementById('lower'),false);
  for(const id of ['steer','dpad','itemBtn','driftBtn','rearBtn','brakeBtn','homeKey','startKey','settingsKey','mapKey','soundToggle','tiltBtn',...Object.keys(extra)])
   installNode(id,extra[id]?unit.querySelector(extra[id]):document.getElementById(id),true);
  syncDirections();watchKeys();
 }
 function restoreSlot(id){
  const slot=slots.get(id);if(!slot)return;
  slot.marker.replaceWith(slot.node);slot.wrap.remove();slots.delete(id);maps.delete(id);
 }
 function syncDirections(){
  // Switch exposes four separate buttons. Keep the actual arrow elements and
  // their listeners; only relocate these four when the chosen skin changes.
  for(const dir of ['left','up','right','down']){
   const id='dir-'+dir;
   if(skin!=='switch')restoreSlot(id);
   else if(!slots.has(id))installNode(id,unit.querySelector('[data-dir="'+dir+'"]'),true);
  }
 }
 function watchKeys(){
  watches?.disconnect();
  if(typeof MutationObserver==='undefined')return;
  watches=new MutationObserver(refresh);
  for(const {node,key} of slots.values())if(key)watches.observe(node,{attributes:true,subtree:true,attributeFilter:['class','style']});
 }
 function unmount(){
  watches?.disconnect();watches=null;
  for(const id of [...slots.keys()].reverse())restoreSlot(id);
  maps.clear();pressed.clear();
 }
 function setMesh(){const g=new CabinetMesh.Builder();builders[skin](g);mesh=g.finish();oldPose=''}
 function front(){yaw=pitch=0}
 function stopOrbit(){
  drag=null;unit?.classList.remove('orbiting');
  for(const id of shellHeld)if(unit.hasPointerCapture?.(id))unit.releasePointerCapture(id);
  shellHeld.clear();
 }
 function setSkin(next){
  if(!builders[next]||next===skin)return;skin=next;
  if(mounted)try{stopOrbit();pressed.clear();setMesh();syncDirections();watchKeys();front();paintNow()}catch{fail()}
 }
 function show(slot,id,points,screen,roll){
  let q=points&&points.map(pose.project);
  if(q&&roll&&screen)q=[q[3],q[0],q[1],q[2]];
  const cross=q?(q[1][0]-q[0][0])*(q[3][1]-q[0][1])-(q[1][1]-q[0][1])*(q[3][0]-q[0][0]):0;
  const m=cross>1?matrix(q):null,wrap=slot.wrap;
  if(!m){
   maps.delete(id);
   // Keep a held cap connected and eligible for native pointer capture
   // when its projected face turns away. New touches cannot target it.
   if(slot.key&&Array.from(pressed.values()).includes(id)){
    wrap.dataset.heldAway='';return;
   }
   delete wrap.dataset.heldAway;wrap.hidden=true;wrap.inert=true;wrap.style.cssText='';return;
  }
  delete wrap.dataset.heldAway;maps.set(id,m);wrap.hidden=false;wrap.inert=false;
  const dist=(i,j)=>Math.hypot(...points[i].map((v,k)=>v-points[j][k]));
  const layoutFit=pose.fit/pose.layoutScale;
  let w=dist(0,1)*layoutFit,h=dist(0,3)*layoutFit;
  if(roll&&screen)[w,h]=[h,w];
  if(screen){const scale=Math.max(1,Math.min(1.85,(skin==='3ds'?230:(roll?270:370))/w));w*=scale;h*=scale}
  w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  const [a,b,c,d,e,f,g,j]=m;
  wrap.style.cssText='width:'+w+'px;height:'+h+'px;transform:matrix3d('+[a/w,d/w,0,g/w,b/h,e/h,0,j/h,0,0,1,0,c,f,0,1].join(',')+')';
 }
 function moves(){
  const out={},down=(id,n)=>n&&(n.classList.contains('down')||n.classList.contains('keyDown')||n.matches(':active')||[...pressed.values()].includes(id));
  for(const [id,trans] of Object.entries(mesh.presses)){
   const n=slots.get(id)?.node;let z=down(id,n)?-.95:0,x=0,y=0;
   if(id==='steer'&&n){const css=n.querySelector('.nub')?.style;if(css)x=2.15*(Number(css.getPropertyValue('--keyJoy'))||Number(css.getPropertyValue('--joy'))||0)}
   if(id==='steer'&&skin!=='3ds'&&unit.clientHeight>unit.clientWidth*1.12){y=x;x=0}
   if(id==='dpad'&&n){const b=n.querySelector('.down,.keyDown,:active');if(b){z=-.7;const dir=b.dataset.dir;x=dir==='left'?-.42:dir==='right'?.42:0;y=dir==='up'?.42:dir==='down'?-.42:0}}
   if(x||y||z)out[id]=trans.axis.map((a,i)=>a*z+trans.right[i]*x+trans.up[i]*y);
  }
  return out;
 }
 function paint(){
  frame=0;if(!mounted)return;
  const w=unit.clientWidth,h=unit.clientHeight;if(w<2||h<2)return;
  const roll=skin!=='3ds'&&h>w*1.12;const projection=[skin,w,h,yaw,pitch,roll,globalThis.devicePixelRatio||1].join('|');
  const changed=projection!==oldPose;
  if(changed){
   const oldScale=pose?.layoutScale;pose=CabinetRender.camera(mesh.bounds,w,h,yaw,pitch,roll);
   if(pose.layoutScale!==oldScale)document.documentElement?.style.setProperty('--cabinet-scale',pose.layoutScale);
  }
  if(changed||unit.dataset.view!==oldPanel){
   for(const [id,slot] of slots){
    if(slot.key&&!changed)continue;
    let p;if(slot.key)p=(skin==='switch'&&id==='dpad')?null:mesh.keys[id];
    else if(skin==='3ds')p=mesh.panels[id];
    else if((id==='lower')===(unit.dataset.view==='panel'))p=mesh.panels.upper;
    show(slot,id,p,!slot.key,roll);
   }
   oldPose=projection;oldPanel=unit.dataset.view;
  }
  const offsets=moves(),signature=JSON.stringify(offsets),lamp=light.join(','),moving=!!drag;
  if(!changed&&signature===oldMoves&&lamp===oldLight&&moving===oldDrag)return;
  oldMoves=signature;oldLight=lamp;oldDrag=moving;
  try{painter.draw(mesh,pose,offsets,light,moving)}catch{if(painter.kind==='webgl')fallback();else fail()}
 }
 function watchDensity(){
  densityQuery?.removeEventListener?.('change',watchDensity);
  densityQuery=window.matchMedia?.('(resolution: '+(globalThis.devicePixelRatio||1)+'dppx)');
  densityQuery?.addEventListener?.('change',watchDensity);refresh();
 }
 function refresh(){if(mounted&&!frame)frame=requestAnimationFrame(paint)}
 function paintNow(){
  if(frame)cancelAnimationFrame(frame);
  frame=0;paint();
 }
 function fallback(){
  if(!mounted)return;
  forcedCPU=true;oldPose='';
  try{
   painter?.dispose();painter=CabinetRender.create(layer,true,()=>{});
   layer.dataset.renderer=painter.kind;paintNow();
  }catch{fail()}
 }
 function release(){
  mounted=false;
  clearTimeout(lampTimer);lampTimer=0;
  if(frame)cancelAnimationFrame(frame);frame=0;stopOrbit();
  resize?.disconnect();resize=null;densityQuery?.removeEventListener?.('change',watchDensity);densityQuery=null;
  document.documentElement?.style.removeProperty('--cabinet-scale');unmount();
  if(unit){
   unit.removeEventListener('pointerdown',onDown,true);unit.removeEventListener('pointermove',onMove,true);unit.removeEventListener('lostpointercapture',onUp);
   delete unit.dataset.form;unit.classList.remove('orbiting');
  }
  for(const ev of ['pointerup','pointercancel'])window.removeEventListener(ev,onUp,true);
  window.removeEventListener('click',onClick,true);shellClicks.clear();
  window.removeEventListener('resize',refresh);window.removeEventListener('pagehide',onPageHide);
  painter?.dispose?.();painter=null;layer?.remove();layer=null;mesh=pose=null;
  oldPose=oldPanel=oldMoves=oldLight='';oldDrag=false;
 }
 function onPageHide(e){if(!e.persisted)release()}
 function fail(){
  release();form='flat';unavailable=true;
  announce('此设备无法绘制机身，已启用兼容平面显示。');
 }
 function pointerRoute(e){
  if(routes.has(e))return routes.get(e);
  const control=e.target.closest('.cabinetKey'),lcd=e.target.closest('.cabinetLCD');
  let route='shell';
  if(control){
   const id=control.dataset.anchor,q=mesh.keys[id],uv=localPoint(id,e.clientX,e.clientY);
   const contact=q&&uv&&q[0].map((v,i)=>v+uv.x*(q[1][i]-v)+uv.y*(q[3][i]-v));
   if(contact&&!CabinetRender.blocked(mesh,pose,id,contact,moves(),form==='model'))route=id;
  }else if(lcd){
   const r=unit.getBoundingClientRect();
   if(form==='flat'||!painter.solid((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height))route='lcd';
  }
  routes.set(e,route);return route;
 }
 function shellGesture(e){
  return mounted&&form==='model'&&e.target.closest?.('#console')===unit&&pointerRoute(e)==='shell';
 }
 function consume(e){
  e.preventDefault?.();
  if(e.stopImmediatePropagation)e.stopImmediatePropagation();else e.stopPropagation?.();
 }
 function onDown(e){
  if(!mounted||e.button>0)return;
  shellClicks.delete(e.pointerId);
  const settings=document.getElementById('deviceDialog');
  if(settings?.open&&!e.target.closest('#settingsKey,#homeKey')){
   if(!settings.contains(e.target))consume(e);return;
  }
  const route=pointerRoute(e);
  if(route==='lcd')return;
  if(route!=='shell'){pressed.set(e.pointerId,route);refresh();return}
  if(form==='flat'){if(e.target.closest('.cabinetKey'))consume(e);return}
  consume(e);shellHeld.add(e.pointerId);unit.setPointerCapture(e.pointerId);
  if(!drag){drag={id:e.pointerId,x:e.clientX,y:e.clientY};unit.classList.add('orbiting')}
 }
 function onMove(e){
  if(!shellHeld.has(e.pointerId))return;
  consume(e);if(drag?.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  const roll=skin!=='3ds'&&unit.clientHeight>unit.clientWidth*1.12;
  yaw+=(roll?dy:dx)*.009;pitch=Math.max(-1.45,Math.min(1.45,pitch+(roll?-dx:dy)*.008));drag.x=e.clientX;drag.y=e.clientY;refresh();
 }
 function onUp(e){
  const id=pressed.get(e.pointerId);
  if(pressed.delete(e.pointerId)){
   const wrap=slots.get(id)?.wrap;
   if(wrap&&'heldAway' in wrap.dataset&&!Array.from(pressed.values()).includes(id)){
    delete wrap.dataset.heldAway;wrap.hidden=true;wrap.inert=true;wrap.style.cssText='';
   }
   refresh();
  }
  if(!shellHeld.delete(e.pointerId))return;
  if(e.type==='pointerup'){
   for(const [id,p] of shellClicks)if(e.timeStamp-p.time>1000)shellClicks.delete(id);
   shellClicks.set(e.pointerId,{time:e.timeStamp,x:e.clientX,y:e.clientY});
  }
  if(drag?.id===e.pointerId){drag=null;unit.classList.remove('orbiting');refresh()}
  consume(e);
 }
 function onClick(e){
  if(!e.detail)return;
  for(const [id,p] of shellClicks){
   if(e.timeStamp-p.time>1000){shellClicks.delete(id);continue}
   const same=e.pointerId>0?e.pointerId===id:Math.abs(e.clientX-p.x)<2&&Math.abs(e.clientY-p.y)<2;
   if(same){shellClicks.delete(id);consume(e);return}
  }
 }
 function setForm(next){
  if(next!=='flat'&&next!=='model')return form;
  if(mounted&&next===form)return form;
  if(!mounted&&unavailable&&next==='flat')return form;
  if(!mounted){
   unit=document.getElementById('console');
   try{
    setMesh();layer=document.createElement('div');layer.id='cabinetGlass';unit.append(layer);
    painter=CabinetRender.create(layer,forcedCPU,fallback);layer.dataset.renderer=painter.kind;
    unit.dataset.form=form=next;front();mount();mounted=true;unavailable=false;
    unit.addEventListener('pointerdown',onDown,true);unit.addEventListener('pointermove',onMove,true);unit.addEventListener('lostpointercapture',onUp);
    window.addEventListener('click',onClick,true);
    for(const ev of ['pointerup','pointercancel'])window.addEventListener(ev,onUp,true);
    if(typeof ResizeObserver!=='undefined'){resize=new ResizeObserver(refresh);resize.observe(unit)}
    else window.addEventListener('resize',refresh);
    watchDensity();
    window.addEventListener('pagehide',onPageHide);
    paintNow();if(mounted)announce();
   }catch{fail()}
   return form;
  }
  // Both forms use this same mounted mesh, surface, light and projection.
  // Unlocking a front view changes no pixels and never restarts the race LCD.
  stopOrbit();front();unit.dataset.form=form=next;
  paintNow();if(mounted)announce();return form;
 }
 function view(which){
  if(!mounted||form!=='model')return;
  if(which==='front')front();else if(which==='rear'){yaw=Math.PI;pitch=skin==='3ds'?-.11:0}else return;
  paintNow();
 }
 function applyLight(){
  lampTimer=0;
  if(!mounted||Math.abs(lampX-light[0])+Math.abs(lampY-light[1])<(painter.kind==='software'?.20:.045))return;
  light[0]=lampX;light[1]=lampY;lastLamp=performance.now();refresh();
 }
 function tilt(x,y){
  lampX=x;lampY=y;if(!mounted||lampTimer)return;
  if(painter.kind==='software'){
   // Key travel still updates immediately. Coalesce costly, full-case lighting
   // changes without throwing away the final orientation on release.
   if(Math.abs(x-light[0])+Math.abs(y-light[1])<.20)return;
   const delay=110-(performance.now()-lastLamp);
   if(delay>0){lampTimer=setTimeout(applyLight,delay);return}
  }
  applyLight();
 }
 return {get layoutScale(){return pose?.layoutScale||1},get projected(){return mounted},getForm:()=>form,panelVisible:id=>!mounted||maps.has(id),setForm,setSkin,localPoint,contactSpace,shellGesture,view,refresh,tilt};
})();
