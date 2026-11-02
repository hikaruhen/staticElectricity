'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const state={mode:'static',balls:[],total:0,show:true,drag:null,transfers:[],sweaterPresent:true,removedCharge:0,staticNotice:'',forceAnswerKey:null,q1:2,q2:-2,r:2,cx:450};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const force=(a,b,r)=>8.99e9*Math.abs(a*1e-6*b*1e-6)/(r*r);
function el(tag,attrs={},text=''){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
function sign(parent,x,y,positive,opacity=1,attrs={}){const color=positive?'#c63e36':'#176bb5',g=el('g',{class:'chargeMark',transform:`translate(${x} ${y})`,x,y,opacity,...attrs});g.append(el('circle',{r:8,fill:'#fffdf6',stroke:color,'stroke-width':1.8}));const text=el('text',{x:0,y:.5,class:`charge ${positive?'pos':'neg'}`,fill:color,style:'font-size:13px;pointer-events:none'},positive?'＋':'−');g.append(text);parent.append(g);return g;}

function reset(){state.forceAnswerKey=null;if(state.mode==='static'){state.balls=[{x:410,y:210,n:0,vx:0,vy:0,free:true,rub:0,present:true},{x:620,y:290,n:0,vx:0,vy:0,free:true,rub:0,present:true}];state.total=0;state.transfers=[];state.sweaterPresent=true;state.removedCharge=0;state.staticNotice='';state.drag=null;renderStatic();drawBalloonTransfer();}else{state.q1=2;state.q2=-2;state.r=2;state.cx=450;renderCoulomb();}}
function switchMode(mode){if(state.mode!==mode)state.forceAnswerKey=null;if(state.mode==='static'&&mode!=='static')cancelBalloonTransfer();state.drag=null;state.mode=mode;const s=mode==='static';$('staticScene').hidden=!s;$('staticControls').hidden=!s;$('coulombScene').hidden=s;$('coulombControls').hidden=s;for(const [id,active] of [['staticTab',s],['coulombTab',!s]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',active);}$('charges').parentElement.hidden=!s;$('sceneTitle').textContent=s?'氣球與毛衣':'電荷間的作用力';if(s)renderStatic();else if(mode==='coulomb')renderCoulomb();}
function balloonContactPoint(b){
 if(!state.sweaterPresent||!b?.present)return null;
 const shape=$('sweaterShape'),inside=(x,y)=>shape?.isPointInFill?shape.isPointInFill(new DOMPoint(x,y)):(x>=110&&x<=230&&y>=120&&y<=350);
 const angle=Math.atan2(220-b.y,170-b.x);
 for(let j=0;j<36;j++){const a=angle+j*Math.PI/18,x=b.x+58*Math.cos(a),y=b.y+72*Math.sin(a);if(inside(x,y))return{x,y};}
 if(inside(b.x,b.y))return{x:b.x-24,y:b.y};
 for(const[x,y]of [[80,110],[140,80],[200,80],[260,110],[300,185],[250,210],[230,170],[230,360],[110,360],[110,170],[90,210],[40,185]])if(((x-b.x)/58)**2+((y-b.y)/72)**2<=1)return{x,y};
 return null;
}
function cancelBalloonTransfer(ball=null){
 const e=state.transfers[0];if(e&&(ball===null||e.ball===ball)){if(e.started)state.total--;state.transfers=[];}
 for(const b of state.balls)b.rub=0;
 drawBalloonTransfer();
}
function rub(i){
 const b=state.balls[i];
 if(!b?.present)return;
 if(state.mode!=='static'||!state.show||state.transfers.length||b.n>=8||!balloonContactPoint(b))return;
 // No waiting queue: only this contact's current electron can be in transit.
 state.transfers=[{ball:i,t:0,started:true}];state.total++;b.rub=0;renderStatic();
}
function drawBalloonTransfer(){
 const layer=$('transfers');layer.replaceChildren();const e=state.transfers[0];
 if(!state.show||!e?.started)return;
 const b=state.balls[e.ball],contact=balloonContactPoint(b);if(!contact)return;
 const t=Math.min(e.t,1),end={x:contact.x+(b.x-contact.x)*.48,y:contact.y+(b.y-contact.y)*.48};
 const x=contact.x+(end.x-contact.x)*t,y=contact.y+(end.y-contact.y)*t;
 const g=el('g',{'data-balloon-transfer':e.ball,transform:`translate(${x} ${y})`});
 const mark=sign(g,0,0,false);mark.querySelector('circle').setAttribute('r',12);mark.querySelector('circle').setAttribute('stroke-width',2);mark.querySelector('text').style.fontSize='18px';layer.append(g);
}
function advanceBalloonTransfer(dt){
 const e=state.transfers[0];if(!e)return false;
 if(!state.show||!balloonContactPoint(state.balls[e.ball])){cancelBalloonTransfer();return true;}
 e.t+=dt/.28;
 if(e.t>=1){state.balls[e.ball].n++;state.transfers=[];return true;}
 return false;
}
function staticBalance(){
 return (state.sweaterPresent?state.total:0)-state.balls.reduce((n,b)=>n+(b.present?b.n:0),0)-(state.transfers[0]?.started?1:0)+state.removedCharge;
}
function balloonPolarization(i){
 const b=state.balls[i],o=state.balls[1-i];
 if(!b?.present||b.n||!o?.present||!o.n)return{x:0,y:0,strength:0};
 const dx=b.x-o.x,dy=b.y-o.y,d=Math.max(1,Math.hypot(dx,dy));
 const strength=clamp(o.n/2*(200/Math.max(120,d))**2,0,1);
 return{x:6*strength*dx/d,y:6*strength*dy/d,strength};
}
function balloonPairInteraction(){
 const[a,b]=state.balls;
 if(!a?.present||!b?.present||(!a.n&&!b.n))return{x:0,y:0,kind:'none'};
 let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d<.001){dx=-1;dy=0;d=1;}
 if(a.n&&b.n){const f=a.n*b.n*16000/Math.max(100,d)**2;return{x:f*dx/d,y:f*dy/d,kind:'repulsion'};}
 const n=a.n||b.n,f=Math.min(18,4*n*n*(180/Math.max(140,d))**5);
 return{x:-f*dx/d,y:-f*dy/d,kind:'polarization'};
}
function staticDeleteHandle(parent,value,x,y){
 const name=value==='sweater'?'毛衣':value==='0'?'黃色氣球':'藍色氣球';
 const g=el('g',{'data-static-remove':value,transform:`translate(${x} ${y})`,tabindex:0,role:'button','aria-label':'刪除'+name,class:'staticRemove'});
 g.append(el('circle',{r:36,fill:'transparent','pointer-events':'all'}),el('circle',{r:14,fill:'#fffdf6',stroke:'#8d5a4e','stroke-width':2}),el('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'central','font-size':23,fill:'#8d4537'},'×'));parent.append(g);
}
function removeStaticObject(value){
 if(state.mode!=='static')return;
 const sweater=value==='sweater',i=Number(value);
 if(sweater?!state.sweaterPresent:!state.balls[i]?.present)return;
 if(sweater)cancelBalloonTransfer();else cancelBalloonTransfer(i);
 if(state.drag&&(sweater||state.drag.i===i)){
  const pointer=state.drag.pointerId;state.drag=null;const svg=$('staticSvg');
  if(Number.isInteger(pointer)&&svg.hasPointerCapture(pointer))svg.releasePointerCapture(pointer);
 }
 if(sweater){state.removedCharge+=state.total;state.total=0;state.sweaterPresent=false;}
 else{const b=state.balls[i];state.removedCharge-=b.n;b.n=0;b.present=false;b.free=false;}
 // Deletion is an editing interruption: restart remaining motion from rest in its new field.
 for(const b of state.balls){b.vx=0;b.vy=0;b.rub=0;}
 state.staticNotice=(sweater?'毛衣':i?'藍色氣球':'黃色氣球')+'已移除，電荷隨物品帶走；重設可復原。';renderStatic();
}
function renderStatic(){
 const focusIndex=document.activeElement?.getAttribute('data-ball'),focusRemove=document.activeElement?.getAttribute('data-static-remove'),layer=$('balloons');layer.replaceChildren();
 state.balls.forEach((b,i)=>{
  if(!b.present)return;const pol=balloonPolarization(i);
  const g=el('g',{class:'balloon',transform:`translate(${b.x} ${b.y})`,tabindex:0,role:'button','aria-label':`${i?'藍色':'黃色'}氣球，${b.n?'帶負電':'中性，淨電荷零'}，方向鍵移動`,'data-ball':i,'data-net-charge':-b.n,'data-polarized':pol.strength>.06});
  g.append(el('path',{d:'M0 72Q-16 100 2 125T0 175',fill:'none',stroke:'#8e9f95','stroke-width':2}),el('ellipse',{rx:58,ry:72,fill:`url(#${i?'blue':'yellow'})`,stroke:i?'#468c9e':'#bb8d2e','stroke-width':2}),el('path',{d:'M-7 71L7 71 0 60Z',fill:i?'#65b2bd':'#dfac40'}),el('ellipse',{cx:-22,cy:-32,rx:10,ry:18,fill:'white',opacity:.35,transform:'rotate(25 -22 -32)'}));
  if(state.show){
   for(let j=0;j<6;j++){
    const x=(j%3-1)*28,y=j<3?-24:24,offset=j<3?1:-1;
    const ion=sign(g,x,y,true,.9,{'data-static-ion':i+'-'+j});ion.querySelector('circle').setAttribute('r',6);ion.querySelector('text').style.fontSize='10px';
    const electron=sign(g,x+offset*8+pol.x,y+offset*16+pol.y,false,.9,{'data-bound-electron':i+'-'+j});electron.querySelector('circle').setAttribute('r',6);electron.querySelector('text').style.fontSize='10px';
   }
   for(let j=0;j<b.n;j++){const a=j*Math.PI/4;sign(g,Math.cos(a)*42,Math.sin(a)*55,false,1,{'data-excess-electron':i+'-'+j});}
  }
  g.append(el('text',{y:-91,'text-anchor':'middle',fill:'#3b5d56','font-size':17},`${i?'B 藍色':'A 黃色'} · ${b.n?'負電':'中性'}`));
  if(pol.strength>.06)g.append(el('text',{y:103,'text-anchor':'middle',fill:'#285f63','font-size':15},'極化中 · 淨電荷 0'));
  layer.append(g);staticDeleteHandle(layer,String(i),b.x+52,b.y-62);
 });
 if(focusIndex!==null&&focusIndex!==undefined)layer.querySelector(`[data-ball="${focusIndex}"]`)?.focus({preventScroll:true});
 if(focusRemove!==null&&focusRemove!==undefined)$('staticSvg').querySelector(`[data-static-remove="${focusRemove}"]`)?.focus({preventScroll:true});
 $('sweaterGroup').style.display=state.sweaterPresent?'':'none';
 const sw=$('sweaterCharges');sw.replaceChildren();if(state.show&&state.sweaterPresent)for(let j=0;j<state.total;j++)sign(sw,128+j%4*28,160+Math.floor(j/4)*43,true);
 const wall=$('wallCharges');wall.replaceChildren();if(state.show)for(let j=0;j<14;j++){
  const y=70+j*26,influence=state.balls.reduce((sum,b)=>sum+(b.present?b.n/8*Math.exp(-Math.abs(b.y-y)/140)*Math.max(0,1-(785-b.x)/380):0),0),shift=clamp(influence,0,1)*13;sign(wall,820,y,true);sign(wall,842+shift,y,false);
 }
 for(const[i,id]of [[0,'yellowRead'],[1,'blueRead']]){const b=state.balls[i];$(id).textContent=!b.present?'已移除':b.n?`−${b.n} 格電子`:balloonPolarization(i).strength>.06?'中性（極化）':'中性';}
 $('sweaterRead').textContent=!state.sweaterPresent?'已移除':state.total?`＋${state.total} 格電荷`:'中性';
 for(const[i,id]of [[0,'removeYellow'],[1,'removeBlue']])$(id).disabled=!state.balls[i].present;
 $('removeSweater').disabled=!state.sweaterPresent;$('rub').disabled=!state.sweaterPresent||!state.balls[0].present||state.balls[0].n>=8;
 let message=state.sweaterPresent?'拖動氣球在毛衣上來回摩擦，再靠近另一顆氣球。':'毛衣已移除。拖動氣球靠近彼此，放手觀察；重設可復原物品。';
 const pair=balloonPairInteraction();
 if(pair.kind==='polarization')message='負電氣球使中性氣球的束縛電子微偏移而互相吸引；中性球淨電荷仍為 0。';
 else if(pair.kind==='repulsion')message='兩顆氣球都帶負電，互相排斥。';
 if(!state.balls.some(b=>b.present))message='兩顆氣球已移除；按重設復原。';
 if(state.staticNotice)message=state.staticNotice;
 if(state.transfers.length)message='接觸摩擦中：一次只轉移一顆；離開毛衣即中止未完成的轉移。';
 $('status').textContent=message;drawBalloonTransfer();
}
function snapCoulombDistance(value){
 const distance=clamp(value,.5,5),integer=Math.round(distance);
 return integer>=1&&integer<=5&&Math.abs(distance-integer)<=.1+1e-6?integer:distance;
}
$('distance').addEventListener('keydown',e=>{
 const step={ArrowLeft:-.05,ArrowDown:-.05,ArrowRight:.05,ArrowUp:.05,PageDown:-.5,PageUp:.5}[e.key];
 if(step===undefined&&!['Home','End'].includes(e.key))return;
 e.preventDefault();state.r=e.key==='Home'?.5:e.key==='End'?5:clamp(Number((state.r+step).toFixed(6)),.5,5);renderCoulomb();
});
function coulombAnswerKey(){return JSON.stringify([state.q1,state.q2,state.r]);}
function renderCoulomb(){const {q1,q2,r}=state;const answerKey=coulombAnswerKey(),reveal=state.forceAnswerKey===answerKey;if(!reveal)state.forceAnswerKey=null;const sep=r*140;state.cx=clamp(state.cx,75+sep/2,825-sep/2);const mobile=innerWidth<=720,viewWidth=mobile?450:900; $('coulombSvg').setAttribute('viewBox',`0 0 ${viewWidth} 490`); const xs=[state.cx-sep/2,state.cx+sep/2].map(x=>mobile?40+(x-75)/750*370:x); $('q1').value=q1;$('q2').value=q2;$('distance').value=r;for(const i of [1,2])$(`q${i}Read`).textContent=`${state['q'+i]>0?'+':''}${state['q'+i]} μC`;$('distanceRead').textContent=`${r.toFixed(2)} m`;
const f=force(q1,q2,r),attract=q1*q2<0,zero=q1*q2===0;const describe=zero?'電力為零':attract?'異號相吸':'同號相斥';$('forceRead').textContent=reveal?`${f<.001&&f!==0?f.toExponential(2):f.toFixed(4)} N`:'按「計算」顯示';$('forceRead').dataset.revealed=String(reveal);$('relation').textContent=describe;$('status').textContent=zero?'有一個點電荷的電量為零，兩者間的庫倫力為零。':`${describe}。改變距離或電量，觀察兩支等長、反向的力箭頭。`;
$('particles').replaceChildren();xs.forEach((x,i)=>{const q=i?q2:q1,g=el('g',{class:'particle',tabindex:0,role:'slider','aria-label':`電荷 ${i?'B':'A'} 位置`,'aria-valuemin':.5,'aria-valuemax':5,'aria-valuenow':r,'data-particle':i});g.append(el('circle',{cx:x,cy:285,r:Math.min(34,(xs[1]-xs[0])/2-5),fill:'#fffdf6',stroke:q===0?'#83998c':q>0?'#c63e36':'#176bb5','stroke-width':4}));g.append(el('text',{x,y:287,'text-anchor':'middle','dominant-baseline':'central','font-size':Math.min(35,(xs[1]-xs[0])*.65),fill:q===0?'#65796f':q>0?'#c63e36':'#176bb5'},q===0?'0':q>0?'＋':'−'));g.append(el('text',{x,y:345+(xs[1]-xs[0]<100&&i?30:0),'text-anchor':'middle','font-size':mobile?17:20,fill:'#355d59'},`${i?'B':'A'} · ${q>0?'+':''}${q} μC`));$('particles').append(g);});
const arrows=$('forceArrows');arrows.replaceChildren();if(!zero){const dirs=[attract?1:-1,attract?-1:1],available=Math.min(145,...xs.map((x,i)=>dirs[i]>0?viewWidth-20-x:x-20));const length=Math.min(available,f*2100),shown=Math.max(1,length),ctm=$('coulombSvg').getScreenCTM(),unit=1/Math.max(.1,Math.hypot(ctm?.a??1,ctm?.b??0));xs.forEach((x,i)=>{const dir=(i?-1:1)*(attract?1:-1),y=i?405:180;arrows.append(el('line',{x1:x,y1:285+(i?38:-38),x2:x,y2:y,stroke:'#d12d2d','stroke-width':2.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'4 5','data-force-guide':true}));arrows.append(el('line',{x1:x,y1:y,x2:x+dir*shown,y2:y,stroke:'#d12d2d','stroke-width':7,'stroke-linecap':'round','vector-effect':'non-scaling-stroke','data-force-vector':true}));const tip=x+dir*shown;arrows.append(el('polygon',{points:`${tip},${y} ${tip-dir*12*unit},${y-7*unit} ${tip-dir*12*unit},${y+7*unit}`,fill:'#d12d2d','data-force-head':true}));arrows.append(el('text',{x,y:y+(i?30:-22),'text-anchor':'middle','font-size':16,fill:'#355d59','data-absolute-force':i?'B':'A'},`F${i?'B':'A'} = ${reveal?f.toPrecision(3)+' N':'？'}${f*2100>available?'（箭頭截短）':''}`));});}
const ruler=$('ruler');ruler.replaceChildren();ruler.append(el('path',{d:`M${xs[0]} 240V220H${xs[1]}V240`,stroke:'#d12d2d','stroke-width':2.5,'vector-effect':'non-scaling-stroke',fill:'none'}));ruler.append(el('text',{x:(xs[0]+xs[1])/2,y:210,'text-anchor':'middle',fill:'#45685d','font-size':20},`r = ${r.toFixed(2)} m`));$('doubleDistance').disabled=r>2.5;$('halfDistance').disabled=r<1;
}
function point(e,svg){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
for(const [id,attr]of [['staticSvg','data-ball'],['coulombSvg','data-particle']]){const svg=$(id);svg.addEventListener('pointerdown',e=>{const removal=e.target.closest('[data-static-remove]');if(attr==='data-ball'&&removal){e.preventDefault();removeStaticObject(removal.dataset.staticRemove);return;}const g=e.target.closest(`[${attr}]`);if(!g)return;const i=Number(g.getAttribute(attr)),p=point(e,svg);state.drag={i,pointerId:e.pointerId,last:p,offset:attr==='data-ball'?{x:state.balls[i].x-p.x,y:state.balls[i].y-p.y}:null};if(attr==='data-ball'){if(!state.balls[i].present)return;state.staticNotice='';state.balls[i].free=false;state.balls[i].vx=0;state.balls[i].vy=0;}svg.setPointerCapture(e.pointerId);e.preventDefault();});svg.addEventListener('pointermove',e=>{if(!state.drag)return;const p=point(e,svg),{i,last}=state.drag; if(attr==='data-particle'&&innerWidth<=720)p.x=75+(p.x-40)/370*750;if(attr==='data-ball'){moveBall(i,p.x+state.drag.offset.x,p.y+state.drag.offset.y,Math.hypot(p.x-last.x,p.y-last.y));}else{const sep=state.r*140,other=i?state.cx-sep/2:state.cx+sep/2;const x=i?clamp(p.x,other+70,825):clamp(p.x,75,other-70);state.r=snapCoulombDistance(Math.abs(x-other)/140);const snappedX=other+(i?1:-1)*state.r*140;state.cx=(snappedX+other)/2;renderCoulomb();}state.drag.last=p;});const end=()=>{if(state.drag&&attr==='data-ball')state.balls[state.drag.i].free=true;state.drag=null;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
svg.addEventListener('keydown',e=>{const removal=e.target.closest('[data-static-remove]');if(removal&&['Enter',' '].includes(e.key)){e.preventDefault();removeStaticObject(removal.dataset.staticRemove);return;}const g=e.target.closest(`[${attr}]`);if(!g||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const i=Number(g.getAttribute(attr));if(attr==='data-ball'){const b=state.balls[i];b.free=false;moveBall(i,b.x+(e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0),b.y+(e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0),15);}else{state.r=clamp(state.r+(e.key==='ArrowLeft'?-.1:.1),.5,5);renderCoulomb();}svg.querySelector(`[${attr}="${i}"]`).focus();});}
function moveBall(i,x,y,movement){
 const b=state.balls[i];if(!b?.present)return;state.staticNotice='';const before={x:b.x,y:b.y},wasContact=!!balloonContactPoint(b);
 b.x=clamp(x,65,725);b.y=clamp(y,105,335);const contact=!!balloonContactPoint(b),distance=Math.hypot(b.x-before.x,b.y-before.y);
 if(!contact){cancelBalloonTransfer(i);b.rub=0;}
 else if(wasContact&&distance>0&&state.show&&!state.transfers.length){b.rub+=distance;if(b.rub>=28){b.rub=0;rub(i);}}
 else b.rub=0;
 renderStatic();
}
$('calculateForce').onclick=()=>{state.forceAnswerKey=coulombAnswerKey();renderCoulomb();};
$('rub').onclick=()=>{const b=state.balls[0];b.x=245;b.y=225;b.free=false;rub(0);};$('release').onclick=()=>state.balls.forEach(b=>b.free=true);$('reset').onclick=reset;$('staticTab').onclick=()=>switchMode('static');$('coulombTab').onclick=()=>switchMode('coulomb');$('charges').onchange=e=>{state.show=e.target.checked;if(!state.show)cancelBalloonTransfer();renderStatic();};for(const id of ['q1','q2','distance'])$(id).oninput=e=>{state[id==='distance'?'r':id]=id==='distance'?snapCoulombDistance(Number(e.target.value)):Number(e.target.value);renderCoulomb();};$('doubleDistance').onclick=()=>{state.r=Math.min(5,state.r*2);renderCoulomb();};$('halfDistance').onclick=()=>{state.r=Math.max(.5,state.r/2);renderCoulomb();};$('flip').onclick=()=>{state.q2=-state.q2;renderCoulomb();};
function resolveBalloonContact(){
 const[a,b]=state.balls;if(!a.present||!b.present||(!a.free&&!b.free))return false;
 let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d<.001){dx=-1;dy=0;d=1;}
 const ux=dx/d,uy=dy/d,min=2/Math.sqrt((ux/58)**2+(uy/72)**2);if(d>=min)return false;
 const wa=a.free?(b.free?.5:1):0,wb=b.free?(a.free?.5:1):0,overlap=min-d;
 a.x=clamp(a.x+ux*overlap*wa,65,725);a.y=clamp(a.y+uy*overlap*wa,105,335);
 b.x=clamp(b.x-ux*overlap*wb,65,725);b.y=clamp(b.y-uy*overlap*wb,105,335);
 const relative=(a.vx-b.vx)*ux+(a.vy-b.vy)*uy;if(relative<0){a.vx-=relative*ux*wa;a.vy-=relative*uy*wa;b.vx+=relative*ux*wb;b.vy+=relative*uy*wb;}
 return true;
}
let previous=0;function tick(time){
 const dt=Math.min((time-previous)/1000,.035);previous=time;
 if(state.mode==='static'){
  let changed=false;const pair=balloonPairInteraction();
  state.balls.forEach((b,i)=>{
   if(!b.present||!b.free)return;
   let ax=(i?-1:1)*pair.x,ay=(i?-1:1)*pair.y;
   if(state.sweaterPresent&&state.total>0&&b.n){
    const dx=170-b.x,dy=220-b.y,d=Math.hypot(dx,dy);if(d>65){const f=b.n*55000/Math.max(12000,d*d);ax+=f*dx/d;ay+=f*dy/d;}
   }
   if(b.n&&b.x>480)ax+=b.n*95000/Math.max(6000,(800-b.x)**2);
   b.vx=(b.vx+ax*dt)*Math.exp(-2.2*dt);b.vy=(b.vy+ay*dt)*Math.exp(-2.2*dt);
   const x=clamp(b.x+b.vx*dt*13,65,725),y=clamp(b.y+b.vy*dt*13,105,335);
   if(Math.abs(x-b.x)+Math.abs(y-b.y)>.00001)changed=true;b.x=x;b.y=y;
  });
  if(resolveBalloonContact())changed=true;
  if(advanceBalloonTransfer(dt))changed=true;
  if(changed)renderStatic();drawBalloonTransfer();
 }
 requestAnimationFrame(tick);
}
reset();requestAnimationFrame(tick);
$('removeYellow').onclick=()=>removeStaticObject('0');$('removeBlue').onclick=()=>removeStaticObject('1');$('removeSweater').onclick=()=>removeStaticObject('sweater');
window.chargeLab={state,force,staticBalance,balloonPairInteraction,balloonPolarization};


window.addEventListener('resize',()=>{if(state.mode==='coulomb')renderCoulomb();});


