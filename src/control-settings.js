// The editor lives inside the LCD. Gameplay and the guide read the same mappings.
const DriveSetup=(()=>{
 const actions=['gas','brake','left','right','drift','item','rear','pause','recover'];
 const paths={
  gas:'M8 15 11 4h4l-3 11z M10 11l3-4',brake:'M5 7h10v7H5z M8 9v3m4-3v3',
  left:'M15 10H4m5-5-5 5 5 5',right:'M5 10h11m-5-5 5 5-5 5',
  drift:'M3 15c1-3 7-2 8-5s-3-3-2-6m3 1 4 1-2 4',
  item:'M4 6 10 3l6 3v8l-6 3-6-3z M4 6l6 3 6-3m-6 3v8',
  rear:'M3 6h14l-2 7H5z M10 13v3',pause:'M7 5v10m6-10v10',recover:'M4 9a6 6 0 1 1 2 5M4 4v5h5'
 };
 let host=null,notify=null,source='keys',listening=null,wired=false;
 const consumed=new Set();
 function status(message,action=listening){
  host.querySelector('.bindingStatus').textContent=message;
  // A short LCD can show only two rows. Keep capture and swap feedback
  // beside the edited action even when the footer is below the fold.
  for(const row of host.querySelectorAll('[data-action]')){
   const note=row.querySelector('.bindingFeedback');
   note.hidden=row.dataset.action!==action;
   if(!note.hidden)note.textContent=message;
  }
 }
 function cancelCapture(){
  if(!listening)return;
  listening=null;refresh();status('已取消录键。');
 }
 function refresh(){
  const b=DriveBindings,auto=b.auto,keys=source==='keys';
  host.querySelector('[data-auto]').setAttribute('aria-checked',String(auto));
  host.querySelector('.driveAutoState').textContent=auto?'开':'关';
  host.querySelector('.driveAutoHint').textContent=auto?'比赛中自动给油，仍可随时刹车。':'按住油门加速，松开后滑行。';
  for(const node of host.querySelectorAll('[data-source]'))node.setAttribute('aria-pressed',String(node.dataset.source===source));
  host.dataset.source=source;
  for(const row of host.querySelectorAll('[data-action]')){
   const a=row.dataset.action,label=b.names[a],button=row.querySelector('button');
   button.hidden=!keys;button.setAttribute('aria-pressed',String(listening===a));
   button.querySelector('.bindingKey').textContent=listening===a?'按新键…':b.label(a,'keys');
   button.setAttribute('aria-label',label+'，当前 '+b.label(a,'keys')+'，点击修改');
   const select=row.querySelector('select');
   if(select){select.hidden=keys;select.value=b.cap(a)}
  }
  host.querySelector('.driveReset').textContent=keys?'恢复键盘默认':'恢复掌机默认';
 }
 function changed(message,saved,action){
  refresh();status(message+(saved===false?' 本次已生效，未能保存。':''),action);
  notify?.();
 }
 function bind(action,code){
  const b=DriveBindings,result=b.bind(source,action,code);
  if(!result.valid){status('这个键不能分配。请按字母、数字、方向键或空格，Esc 取消。');return}
  listening=null;
  const name=source==='keys'?b.keyName(code):b.padNames[code];
  changed(result.swapped?b.names[action]+'改为 '+name+'，已和「'+b.names[result.swapped]+'」换键。':
   b.names[action]+'已设为 '+name+'。',result.saved,action);
 }
 function handleClick(e){
  const button=e.target.closest('button');if(!button||!host.contains(button))return;
  if(button.hasAttribute('data-auto')){
   cancelCapture();const saved=DriveBindings.setAuto(!DriveBindings.auto);
   changed(DriveBindings.auto?'已切换到自动油门按键配置。':'已切换到手动油门按键配置。',saved);return;
  }
  if(button.dataset.source){
   cancelCapture();source=button.dataset.source;refresh();
   status(source==='keys'?'点选动作后按新键，Esc 取消。':'点按右侧按键名称，选择机身按键。');return;
  }
  if(button.matches('.driveReset')){
   cancelCapture();changed(source==='keys'?'键盘已恢复默认。':'当前油门模式的掌机按键已恢复默认。',DriveBindings.reset(source));return;
  }
  if(source!=='keys'||!button.matches('.bindingRecord'))return;
  const a=button.closest('[data-action]').dataset.action;
  if(listening===a){cancelCapture();return}
  listening=a;refresh();button.focus({preventScroll:true});status('为「'+DriveBindings.names[a]+'」按一个新键，Esc 取消。');
 }
 function active(){
  const dialog=host?.closest('dialog');
  return host?.isConnected&&!host.closest('[hidden],[inert]')&&(!dialog||dialog.open);
 }
 function keydown(e){
  if(consumed.has(e.code)){
   if(e.repeat){e.preventDefault();e.stopImmediatePropagation();return}
   consumed.delete(e.code);
  }
  if(!listening)return;
  if(!active()){cancelCapture();return}
  if(e.code==='Tab'){cancelCapture();return}
  e.preventDefault();e.stopImmediatePropagation();
  if(e.repeat)return;
  consumed.add(e.code);
  if(e.code==='Escape'){cancelCapture();return}
  if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey&&!e.code.startsWith('Shift')||!DriveBindings.validKey(e.code)){
   status('请单独按一个可分配的键。Esc 取消。');return;
  }
  bind(listening,e.code);
 }
 function resetFocus(){consumed.clear();cancelCapture()}
 function wire(){
  if(wired)return;wired=true;
  window.addEventListener('keydown',keydown,true);
  window.addEventListener('keyup',e=>{
   if(consumed.delete(e.code)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  window.addEventListener('blur',resetFocus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetFocus()});
 }
 function mount(node,onChange){
  if(!node)return;notify=onChange;
  if(node===host){refresh();return}
  cancelCapture();host=node;
  const icon=a=>'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="'+paths[a]+'"/></svg>';
  const options=DriveBindings.slots.map(s=>'<option value="'+s+'">'+DriveBindings.padNames[s]+'</option>').join('');
  const rows=actions.map(a=>{
   const name=DriveBindings.names[a];
   const pad=a==='pause'?'<span class="bindingFixed">START / ＋</span>':
    '<select aria-label="'+name+'，选择掌机按键">'+options+'</select>';
   return '<div class="bindingRow" data-action="'+a+'"><span class="bindingName">'+icon(a)+name+'</span>'+
    '<button class="bindingRecord" type="button"><span class="bindingKey"></span></button>'+pad+'<small class="bindingFeedback" aria-hidden="true" hidden></small></div>';
  }).join('');
  node.classList.add('driveSetup');
  node.innerHTML='<div class="driveAutoLine"><div><strong>自动前进</strong><p class="driveAutoHint"></p></div>'+
   '<button type="button" role="switch" aria-label="自动前进" data-auto><i aria-hidden="true"></i><span class="driveAutoState"></span></button></div>'+
   '<div class="bindingHeader"><h3 class="deviceSection">驾驶键位</h3><div class="bindingTabs" role="group" aria-label="输入设备">'+
   '<button type="button" data-source="keys">键盘</button><button type="button" data-source="pad">掌机</button></div></div>'+
   '<div class="bindingList">'+rows+'</div>'+
   '<div class="bindingFoot"><span class="bindingStatus" role="status" aria-live="polite"></span><button type="button" class="driveReset"></button></div>';
  node.onclick=handleClick;
  node.onchange=e=>{
   const select=e.target.closest('select');if(!select||source!=='pad')return;
   bind(select.closest('[data-action]').dataset.action,select.value);
  };
  node.onfocusout=e=>{if(listening&&e.target.closest('.bindingRecord'))cancelCapture()};
  refresh();status(source==='keys'?'点选动作后按新键，Esc 取消。':'点按右侧按键名称，选择机身按键。');wire();
 }
 return {mount,cancelCapture};
})();
