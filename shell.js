'use strict';
// Full-viewport by default; native fullscreen is requested only from a click.
const fsButton=$('fullscreen'),screenStatus=$('screenStatus'),help=$('principles'),helpButton=$('helpToggle');
let statusTimer=null,returnFocus=null,landscapeLockHeld=false;
function fullElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function announceScreen(message){screenStatus.textContent=message;screenStatus.dataset.visible='true';clearTimeout(statusTimer);statusTimer=setTimeout(()=>{screenStatus.dataset.visible='false';},5000);}
function updateLayout(){
 const coarse=matchMedia('(pointer:coarse)').matches;
 const rotated=coarse&&innerHeight>innerWidth;
 document.body.dataset.layout=rotated?'rotated-landscape':'horizontal';
 document.body.dataset.touch=String(coarse);
}
async function lockLandscape(){
 if(!matchMedia('(pointer:coarse)').matches||!screen.orientation?.lock)return;
 try{await screen.orientation.lock('landscape');landscapeLockHeld=true;document.body.dataset.orientationLock='locked';}
 catch{document.body.dataset.orientationLock='unavailable';}
 updateLayout();
}
function updateScreen(){const active=!!fullElement();fsButton.textContent=active?'退出全螢幕':'全螢幕';fsButton.setAttribute('aria-pressed',String(active));fsButton.title=active?'退出瀏覽器全螢幕；教具仍維持滿版':'教具預設滿版；點此進入瀏覽器全螢幕';document.body.dataset.nativeFullscreen=String(active);if(!active&&landscapeLockHeld){try{screen.orientation.unlock();}catch{}landscapeLockHeld=false;}updateLayout();}
async function enterScreen(){
 if(fullElement())return;
 const request=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;
 if(!request){announceScreen('此瀏覽器不支援原生全螢幕，目前仍以滿版模式操作。');return;}
 try{await request.call(document.documentElement);updateScreen();await lockLandscape();}
 catch{announceScreen('瀏覽器未允許全螢幕；目前維持滿版。可再點「全螢幕」嘗試。');updateScreen();}
}
fsButton.addEventListener('click',async()=>{
 if(fullElement()){
  const exit=document.exitFullscreen||document.webkitExitFullscreen;
  try{if(exit)await exit.call(document);}catch{announceScreen('無法退出全螢幕，請使用瀏覽器的退出方式。');}
 }else await enterScreen();
 updateScreen();
});
// Mode selection never requests fullscreen or orientation changes.
document.addEventListener('fullscreenchange',updateScreen);
document.addEventListener('webkitfullscreenchange',updateScreen);
document.addEventListener('fullscreenerror',()=>announceScreen('瀏覽器未允許全螢幕，目前仍可使用滿版教具。'));
helpButton.addEventListener('click',()=>{help.open=!help.open;});
$('helpBackdrop').addEventListener('click',()=>{help.open=false;});
help.addEventListener('toggle',()=>{
 helpButton.setAttribute('aria-expanded',String(help.open));$('helpBackdrop').hidden=!help.open;
 if(help.open){returnFocus=document.activeElement;help.querySelector('summary').focus();}
 else if(returnFocus?.isConnected)returnFocus.focus();
});
document.addEventListener('keydown',e=>{
 if(!help.open)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();help.open=false;return;}
 if(e.key==='Tab'){
  const nodes=[...help.querySelectorAll('summary,a[href],button,input,select,[tabindex="0"]')].filter(e=>e.getClientRects().length);
  const first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
 e.stopPropagation();
},true);
const shellMode=switchMode;
switchMode=function(mode){shellMode(mode);$(mode+'Tab')?.scrollIntoView({block:'nearest',inline:'nearest'});};
updateScreen();

window.addEventListener('resize',updateLayout);
matchMedia('(pointer:coarse)').addEventListener('change',updateLayout);
updateLayout();
// Rotated range controls use physical pointer coordinates; native keyboard controls remain.
let rotatedRangeDrag=null;
function updatePointerRange(e){
 const input=rotatedRangeDrag.input,r=input.getBoundingClientRect();
 const vertical=document.body.dataset.layout==='rotated-landscape';
 const length=vertical?r.height:r.width,position=vertical?e.clientY-r.top:e.clientX-r.left;
 const inset=Math.min(8,length/4),ratio=clamp((position-inset)/(length-2*inset),0,1);
 const min=Number(input.min||0),max=Number(input.max||100),step=Number(input.step)||1;
 input.value=String(clamp(min+Math.round((max-min)*ratio/step)*step,min,max));
 input.dispatchEvent(new Event('input',{bubbles:true}));
}
document.addEventListener('pointerdown',e=>{
 const input=e.target.closest('input[type=range]');
 if(!input||document.body.dataset.layout!=='rotated-landscape'||e.button!==0)return;
 e.preventDefault();e.stopPropagation();rotatedRangeDrag={input,pointer:e.pointerId};
 input.focus({preventScroll:true});input.setPointerCapture(e.pointerId);updatePointerRange(e);
},true);
document.addEventListener('pointermove',e=>{
 if(!rotatedRangeDrag||e.pointerId!==rotatedRangeDrag.pointer)return;
 e.preventDefault();e.stopPropagation();updatePointerRange(e);
},true);
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{
 if(!rotatedRangeDrag||e.pointerId!==rotatedRangeDrag.pointer)return;
 if(type==='pointerup')updatePointerRange(e);
 const input=rotatedRangeDrag.input;rotatedRangeDrag=null;
 input.dispatchEvent(new Event('change',{bubbles:true}));
},true);
/* Rotated overflow panes can deliver touch pointerup without a compatibility click.
   Activate a stationary touch release once, and suppress a later duplicate click. */
let touchButtonPress=null,lastTouchButton=null;
document.addEventListener('pointerdown',e=>{
 if(document.body.dataset.layout!=='rotated-landscape'||e.pointerType!=='touch')return;
 const button=e.target.closest('button,summary');if(!button||button.disabled)return;
 touchButtonPress={button,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
},true);
document.addEventListener('pointermove',e=>{
 if(touchButtonPress?.pointer===e.pointerId&&Math.hypot(e.clientX-touchButtonPress.x,e.clientY-touchButtonPress.y)>10)touchButtonPress.moved=true;
},true);
document.addEventListener('pointerup',e=>{
 const press=touchButtonPress;if(!press||press.pointer!==e.pointerId)return;touchButtonPress=null;
 const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('button,summary');
 if(press.moved||hit!==press.button||press.button.disabled)return;
 e.preventDefault();lastTouchButton={button:press.button,id:press.button.id,time:performance.now()};
 press.button.click();
},true);
document.addEventListener('pointercancel',()=>{touchButtonPress=null;},true);
document.addEventListener('click',e=>{
 const button=e.target.closest('button,summary'),last=lastTouchButton;
 if(e.isTrusted&&e.detail>0&&last&&performance.now()-last.time<750&&(button===last.button||(button?.id&&button.id===last.id))&&(e.pointerType!=='mouse'||e.sourceCapabilities?.firesTouchEvents)){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
