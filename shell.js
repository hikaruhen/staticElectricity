'use strict';
// Full-viewport by default; native fullscreen is requested only from a click.
const fsButton=$('fullscreen'),screenStatus=$('screenStatus'),help=$('principles'),helpButton=$('helpToggle');
let firstModeClick=true,statusTimer=null,returnFocus=null;
function fullElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function announceScreen(message){screenStatus.textContent=message;screenStatus.dataset.visible='true';clearTimeout(statusTimer);statusTimer=setTimeout(()=>{screenStatus.dataset.visible='false';},5000);}
function updateScreen(){const active=!!fullElement();fsButton.textContent=active?'退出全螢幕':'全螢幕';fsButton.setAttribute('aria-pressed',String(active));fsButton.title=active?'退出瀏覽器全螢幕；教具仍維持滿版':'教具預設滿版；點此進入瀏覽器全螢幕';document.body.dataset.nativeFullscreen=String(active);}
async function enterScreen(){
 if(fullElement())return;
 const request=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;
 if(!request){announceScreen('此瀏覽器不支援原生全螢幕，目前仍以滿版模式操作。');return;}
 try{await request.call(document.documentElement);updateScreen();}
 catch{announceScreen('瀏覽器未允許全螢幕；目前維持滿版。可再點「全螢幕」嘗試。');updateScreen();}
}
fsButton.addEventListener('click',async()=>{
 firstModeClick=false;
 if(fullElement()){
  const exit=document.exitFullscreen||document.webkitExitFullscreen;
  try{if(exit)await exit.call(document);}catch{announceScreen('無法退出全螢幕，請使用瀏覽器的退出方式。');}
 }else await enterScreen();
 updateScreen();
});
// Never request fullscreen on pointerdown/move: the first drag must remain a drag.
document.querySelector('nav').addEventListener('click',e=>{
 if(!e.isTrusted||!e.target.closest('button')||!firstModeClick)return;
 firstModeClick=false;void enterScreen();
},true);
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
