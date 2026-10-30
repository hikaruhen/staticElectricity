'use strict';
// Quantities are representative charge units, not counts of individual electrons.
const matter=[
 {id:'fur',name:'毛皮',kind:'fur',color:'#bd9164',rank:0},
 {id:'glass',name:'玻璃',kind:'rod',color:'#b7e2eb',rank:1},
 {id:'plastic',name:'塑膠',kind:'rod',color:'#91bead',rank:2}
];
const ballKind={id:'ball',name:'帶電球',kind:'ball',color:'#dee7e7',rank:null};
const kind=id=>id==='ball'?ballKind:matter.find(m=>m.id===id);
const EPS=1e-7,benchModes=['materials','induction','quiz'];
const bench={objects:[],electrons:12,earth:0,ground:false,cable:{x:0,y:0},drag:null,flight:null,next:1,travel:0,contact:null,removedCharge:0,importedCharge:0,message:'',width:900,selected:null,events:[],quiz:null};
const ionSlots=Array.from({length:12},(_,i)=>({x:(i%4-1.5)*39,y:(Math.floor(i/4)-1)*38}));
let ballSetting=6,quizTask='contact',trayDrag=null,materialGhost=null;
const previousMode=switchMode,previousReset=reset;
function benchSize(){bench.width=900;return bench.width;}
function scaleBench(){return bench.width<600?.7:1;}
function sphere(){return {x:bench.width*.69,y:245,r:bench.width<600?83:110};}
function earthPoint(){return {x:bench.width-48,y:440};}
function terminal(){const s=sphere();return {x:s.x+s.r*.68,y:s.y+s.r*.68};}
function halfSize(o){return (o.id==='ball'?65:100)*scaleBench();}
function objectCharge(o){return 12-o.e;}
function systemCharge(){return bench.objects.reduce((n,o)=>n+objectCharge(o),0)+(state.mode==='materials'?0:12-bench.electrons+bench.earth)+bench.removedCharge;}
function chargeLabel(q){return Math.abs(q)<EPS?'中性':(q>0?'＋':'−')+Number(Math.abs(q).toFixed(4))+' 格';}
function sourceObject(){return bench.objects.find(o=>o.uid===bench.quiz?.source);}
function surfaceGap(o){const s=sphere();return Math.hypot(s.x-o.x,s.y-o.y)-s.r-halfSize(o);}
function sourceNear(){const o=sourceObject();return !!o&&Math.abs(objectCharge(o))>EPS&&surfaceGap(o)<100*scaleBench()&&!contactNow(o);}
function sourceFar(){const o=sourceObject();return !!o&&surfaceGap(o)>=140*scaleBench();}
function failQuiz(message){if(bench.quiz&&!bench.quiz.invalid){bench.quiz.invalid=message;bench.quiz.passed=false;}}
function record(type,data={}){
 const event={type,...data};bench.events.push(event);
 const q=bench.quiz;if(state.mode!=='quiz'||!q)return;
 if(q.passed){q.passed=false;q.feedback='你已繼續操作，請重新檢查目前結果。';}
 if(type==='contact-start'){q.flags.contact=true;if(q.task==='induction')failQuiz('帶電球碰到目標球，這次已包含接觸起電。請重新挑戰感應起電。');}
 if(type==='ground-connect'){
  if(q.task==='contact')failQuiz('接觸起電任務不使用接地。請重試，直接接觸並分開兩球。');
  else if(q.flags.near&&sourceNear())q.flags.grounded=true;
  else failQuiz('接地前須先把帶電球靠近目標球，且保持不接觸。請重試。');
 }
 if(type==='transfer'&&data.reason==='ground'&&q.flags.grounded&&sourceNear())q.flags.exchange=true;
 if(type==='transfer'&&data.reason==='contact')q.flags.transferred=true;
 if(type==='contact-settled')q.flags.settled=true;
 if(type==='ground-disconnect'&&q.task==='induction'){
  if(q.flags.exchange&&sourceNear()&&!data.pending)q.flags.disconnected=true;
  else failQuiz('請先讓接地電子轉移完成，再保持帶電球靠近、拖開接地夾。請重試。');
 }
 if(type==='source-move'){
  if(sourceNear()&&!bench.ground&&!q.flags.disconnected)q.flags.near=true;
  if(sourceFar()){
   if(q.task==='induction'&&bench.ground)failQuiz('你先移開帶電球、仍保持接地，目標球將回到中性。請重試並先斷地。');
   q.flags.far=true;
  }else q.flags.far=false;
 }
 if(type==='remove'&&data.uid===q.source)failQuiz('指定帶電球被刪除了，不能用替換物品完成任務。請重新挑戰。');
}
function addObject(id,x,y,charge=0){
 if(!kind(id))return null;
 const o={uid:bench.next++,id,x:clamp(x,75,bench.width-75),y:clamp(y,105,390),e:12-charge};
 bench.objects.push(o);bench.selected=o.uid;bench.importedCharge+=charge;
 bench.message=charge?'這顆球在實驗桌外已帶電；拖入不是完成起電。請操作它影響中性目標球。':'拖曳物品與另一種材質接觸並來回摩擦。';
 if(state.mode!=='materials')placeObject(o,o.x,o.y);
 renderBench();return o;
}
function initBench(){
 benchSize();Object.assign(bench,{objects:[],electrons:12,earth:0,ground:false,cable:earthPoint(),drag:null,flight:null,selected:null,travel:0,contact:null,removedCharge:0,importedCharge:0,message:'',events:[],quiz:null});
 if(state.mode==='quiz'){
  bench.quiz={task:quizTask,source:null,initialCharge:quizTask==='contact'?6:-6,flags:{},invalid:'',passed:false,feedback:'尚未檢查。請直接操作指定帶電球與目標球。'};
  const o=addObject('ball',bench.width<600?80:170,135,bench.quiz.initialCharge);bench.quiz.source=o.uid;
 }
}
switchMode=function(mode){
 const old=state.mode;clearTray();bench.drag=null;bench.flight=null;previousMode(mode);
 if(benchModes.includes(mode)){
  if(old!==mode)initBench();
  buildBenchControls();renderBench();
 }
};
reset=function(){if(benchModes.includes(state.mode)){clearTray();initBench();buildBenchControls();renderBench();}else previousReset();};
function html(tag,attrs={},text=''){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')e.className=v;else e.setAttribute(k,v);}e.textContent=text;return e;}
function buildBenchControls(){
 $('materialTray')?.remove();$('sourceControls')?.remove();
 const c=$('exploreControls');c.replaceChildren();
 c.append(html('h2',{},state.mode==='materials'?'摩擦起電':state.mode==='quiz'?'實作測驗':'自由操作起電'));
 if(state.mode==='quiz'){
  const l=html('label',{for:'quizTask'},'選擇任務'),select=html('select',{id:'quizTask'});
  for(const [value,text]of [['contact','接觸起電'],['induction','感應起電']])select.add(new Option(text,value));
  select.value=quizTask;select.onchange=()=>{quizTask=select.value;reset();};c.append(l,select);
  const instruction=html('p',{id:'quizGoal',class:'quizGoal'},quizTask==='contact'?'目標：用指定 ＋6 格帶電球接觸原本中性的目標球，等分享完成後移開；兩球各留下 ＋3 格。不要接地。':'目標：用指定 −6 格帶電球，讓原本中性的目標球不經接觸而留下正電。先靠近、接地、等轉移完成，再斷地、移開帶電球。');
  c.append(instruction,html('p',{class:'note'},'指定球原本已帶電；得分對象是固定的中性目標球。沒有新增帶電球入口，不能以預設電量替代操作。'));
  const check=html('button',{id:'checkQuiz',class:'primary'},'檢查操作結果');check.onclick=checkQuiz;
  const retry=html('button',{id:'retryQuiz'},'重新挑戰本題');retry.onclick=()=>reset();
  c.append(html('ol',{id:'quizSteps',class:'quizSteps'}),check,html('p',{id:'quizFeedback',role:'status',class:'quizFeedback'}),retry);
 }else{
  const tray=html('div',{id:'materialTray',class:'materialTray','aria-label':'材料架：毛皮、玻璃、塑膠'});
  for(const m of matter)tray.append(makeTile(m));
  c.append(tray);
  if(state.mode==='induction'){
   const source=html('div',{id:'sourceControls',class:'sourceControls'});
   const label=html('label',{for:'ballCharge'},'直接帶電球（外部已帶電）');
   const range=html('input',{id:'ballCharge',type:'range',min:-8,max:8,step:1,value:ballSetting});
   const output=html('output',{id:'ballChargeRead',for:'ballCharge'},chargeLabel(ballSetting));range.oninput=()=>{ballSetting=+range.value;output.textContent=chargeLabel(ballSetting);};
   const tile=makeTile(ballKind);tile.id='chargedBallTile';tile.dataset.source='ball';
   source.append(label,output,range,tile,html('p',{class:'note'},'先設定正／負電量，再把球拖進桌面。此設定只作用於下一顆球；不會改變桌上物品。'));
   c.append(source);
  }
  c.append(html('p',{class:'note'},state.mode==='materials'?'三種材質各自拖入，接觸後來回摩擦。塑膠在此假設為乾燥聚乙烯表面；摩擦序列只作教學示意。':'自行摩擦材質，或拖入外部已帶電的導電球。靠近、接觸目標球；拖動綠夾接地或斷地。＋背景固定，只有 − 轉移。'));
 }
 const remove=html('button',{id:'removeSelected'},'刪除選取物品');remove.onclick=()=>removeObject(bench.selected);
 c.append(remove,html('div',{id:'benchRead',class:'benchRead','aria-live':'polite'}),html('p',{class:'note'},'紅色＋固定正電背景；藍色−為代表性電子標記。每格代表大量電荷，分數格不是半顆電子。帶電球內每個固定符號代表 2 格；移動標記另標示轉移量。兩顆導電球採相同有效容量；絕緣材質僅示意局部接觸轉移。'));
}
function makeTile(m){
 const tile=html('div',{class:'materialTile',tabindex:0,role:'button','aria-label':`拖入${m.name}；Enter 放到桌面`});
 if(m.id!=='ball')tile.dataset.material=m.id;
 const icon=el('svg',{viewBox:'-110 -85 220 180','aria-hidden':true});drawShape(icon,m);tile.append(icon,document.createTextNode(m.name));
 tile.addEventListener('pointerdown',e=>startTray(e,m.id));
 tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();addObject(m.id,bench.width<600?80:170,145+bench.objects.length%2*180,m.id==='ball'?ballSetting:0);}});
 return tile;
}
function drawShape(g,m){
 const common={stroke:'#54706c','stroke-width':2};
 if(m.kind==='ball'){
  g.append(el('circle',{r:65,fill:m.color,...common}),el('path',{d:'M-37 -22Q-23 -48 0 -42',fill:'none',stroke:'#fff','stroke-width':9,'stroke-linecap':'round'}));return;
 }
 if(m.kind==='rod')g.append(el('rect',{x:-100,y:-60,width:200,height:120,rx:24,fill:m.color,...common}),el('ellipse',{cx:-83,cy:0,rx:17,ry:57,fill:m.id==='glass'?'#e4f6f8':'#ffffff25',...common}),el('path',{d:'M-55 -43H70',stroke:'#ffffff88','stroke-width':8,'stroke-linecap':'round'}));
 else{g.append(el('path',{d:'M-96 -61Q-48 -85 0 -63T96 -65L84 65Q40 85-4 65T-96 65Z',fill:m.color,...common}));for(let j=0;j<5;j++)for(let i=0;i<10;i++)g.append(el('path',{d:`M${-88+i*18} ${-50+j*25}l8 -14 3 15`,fill:'none',stroke:'#805d3e','stroke-width':2,opacity:.6}));}
}
function chargeText(g,x,y,positive,attrs={}){return sign(g,x,y,positive,1,attrs);}
function drawObject(o){
 const m=kind(o.id),g=el('g',{transform:`translate(${o.x} ${o.y}) scale(${scaleBench()})`,'data-object':o.uid,'data-kind':o.id,tabindex:0,role:'button','aria-label':`${m.name}，${chargeLabel(objectCharge(o))}，拖曳或方向鍵移動`,class:'benchObject'});
 drawShape(g,m);
 if(state.show){
  const visible=o.e-(bench.flight?.from===o?(bench.flight.amount||1):0);
  if(o.id==='ball'){
   // Sparse, fixed positive background. Each stationary ball glyph represents two units.
   for(let i=0;i<6;i++){const a=i*Math.PI/3;chargeText(g,Math.cos(a)*45,Math.sin(a)*45,true,{'data-ion':o.uid+'-'+i,'data-charge-weight':2});}
   const slots=[[0,0],[-22.5,0],[22.5,0],[-11.25,-20],[11.25,-20],[-11.25,20],[11.25,20],[-33.75,-20],[33.75,20],[-33.75,20]];
   for(let i=0;i<visible/2;i++){const [x,y]=slots[i];chargeText(g,x,y,false,{opacity:Math.min(1,visible/2-i),'data-charge-weight':2});}
  }else{
   ionSlots.forEach((p,i)=>chargeText(g,p.x-6,p.y,true,{'data-ion':o.uid+'-'+i}));
   for(let i=0;i<visible;i++){const p=i<12?{x:ionSlots[i].x+9,y:ionSlots[i].y+14}:{x:i<15?-85:85,y:[-40,0,40][(i-12)%3]};chargeText(g,p.x,p.y,false,{opacity:Math.min(1,visible-i)});}
  }
 }
 g.append(el('text',{x:0,y:o.id==='ball'?94:91,class:'benchLabel'},m.name+' · '+chargeLabel(objectCharge(o))));
 const remove=el('g',{'data-remove':o.uid,transform:`translate(${o.id==='ball'?75:90} -78)`,role:'button','aria-label':'刪除'+m.name,class:'removeObject'});
 remove.append(el('circle',{r:54,fill:'transparent','pointer-events':'all','data-hit-area':true}),el('circle',{r:19,fill:'#fff',stroke:'#966c5a','stroke-width':2}),el('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'central',fill:'#8e4537','font-size':23},'×'));g.append(remove);return g;
}
function influence(){
 const s=sphere();let value=0;
 for(const o of bench.objects){const q=objectCharge(o);if(Math.abs(q)<EPS)continue;const gap=surfaceGap(o),strength=clamp((140*scaleBench()-gap)/(110*scaleBench()),0,1);value+=q/6*strength*(s.x>=o.x?1:-1);}
 return clamp(value,-1,1);
}
function electronPositions(){
 const s=sphere(),n=bench.electrons,f=influence(),out=[];
 const ions=ionSlots.map(p=>({x:p.x*s.r/105,y:p.y*s.r/100})),slots=[];
 // Choose separated sites inside the conductor, keeping every fixed ion in place.
 // Sorting by the desired near/far position prevents ring-like electron arrangements.
 for(let y=-90;y<=90;y+=18)for(let x=-90;x<=90;x+=18){if(Math.hypot(x,y)>s.r-12||ions.some(p=>Math.hypot(x-p.x,y-p.y)<16))continue;slots.push({x,y});}
 for(let i=0;i<n;i++){
  const row=i%6,col=Math.floor(i/6),y=(row-2.5)*s.r*.25,cols=Math.ceil(n/6),flatX=(col-(cols-1)/2)*s.r*.74;
  const edge=Math.sqrt(Math.max(0,s.r*s.r*.8-y*y)),end=-Math.sign(f||1)*(edge-10-col*18);
  const desired={x:flatX*(1-Math.abs(f))+end*Math.abs(f),y};
  slots.sort((a,b)=>(a.x-desired.x)**2+(a.y-desired.y)**2-((b.x-desired.x)**2+(b.y-desired.y)**2));
  const p=slots.shift();if(p)out.push({x:s.x+p.x,y:s.y+p.y});
 }
 return out;
}
function renderBench(){
 if(!benchModes.includes(state.mode))return;
 const svg=$('exploreSvg'),induction=state.mode!=='materials';svg.setAttribute('viewBox',`0 0 ${bench.width} 540`);svg.setAttribute('aria-label',state.mode==='quiz'?'測驗模式：操作指定帶電球、目標球與接地夾':induction?'自由操作起電：拖動材質、帶電球與接地夾':'摩擦起電：拖入毛皮、玻璃、塑膠後摩擦');svg.replaceChildren();
 svg.append(el('rect',{x:8,y:45,width:bench.width-16,height:475,rx:22,fill:'#f0f4ea',stroke:'#cbd9ca','stroke-dasharray':'7 7'}));
 $('sceneTitle').textContent=state.mode==='quiz'?'測驗模式 · '+(quizTask==='contact'?'接觸起電':'感應起電'):induction?'自由操作起電':'摩擦起電';
 $('exploreHint').textContent=state.mode==='quiz'?'直接拖動指定帶電球與接地夾，再按「檢查操作結果」':induction?'拖入物品，自由決定靠近、接觸、接地與斷地的順序':'從材料架拖入物品，兩物接觸並來回摩擦';
 if(induction){
  const s=sphere(),end=terminal(),earth=earthPoint();svg.append(el('rect',{x:s.x-18,y:s.y+s.r-5,width:36,height:100,fill:'#bac8bf'}),el('circle',{cx:s.x,cy:s.y,r:s.r,fill:'#dae7e5',stroke:'#638783','stroke-width':3,'data-target-sphere':true}),el('text',{x:s.x-(bench.width<600?45:0),y:485,class:'benchLabel'},'目標金屬球 · 絕緣支架'));
  if(state.show){ionSlots.forEach((p,i)=>chargeText(svg,s.x+p.x*s.r/105,s.y+p.y*s.r/100,true,{'data-sphere-ion':i}));const hide=bench.flight?.from==='sphere'?(bench.flight.amount||1):0;electronPositions().forEach((p,i)=>{if(i<bench.electrons-hide){const mark=chargeText(svg,p.x,p.y,false,{'data-sphere-electron':i,opacity:Math.min(1,bench.electrons-hide-i)});mark.querySelector('circle').setAttribute('r',7);mark.querySelector('text').style.fontSize='12px';}});}
  const cable=bench.ground?end:bench.cable;svg.append(el('path',{d:`M${earth.x} ${earth.y}Q${earth.x-100} ${earth.y-20} ${cable.x} ${cable.y}`,fill:'none',stroke:'#368069','stroke-width':7}),el('path',{d:`M${earth.x} ${earth.y}v17m-25 0h50m-18 10h28m-20 10h12`,stroke:'#368069','stroke-width':4,fill:'none'}),el('text',{x:earth.x-5,y:505,class:'benchLabel'},'大地'));
  svg.append(el('circle',{cx:end.x,cy:end.y,r:15,fill:'#fff',stroke:'#368069','stroke-width':4,'data-terminal':true}));
  const clip=el('g',{'data-clip':true,tabindex:0,role:'button','aria-label':'拖曳接地夾到接點，或拖開斷地',transform:`translate(${cable.x} ${cable.y})`,class:'groundClip'});
  clip.append(el('circle',{r:54,fill:'transparent','pointer-events':'all','data-hit-area':true}),el('circle',{r:25,fill:'#e1f2dd',stroke:'#368069','stroke-width':3}),el('path',{d:'M-10 -12L10 12M10 -12L-10 12',stroke:'#368069','stroke-width':5}));svg.append(clip);
 }
 for(const o of bench.objects)svg.append(drawObject(o));
 if(bench.flight&&state.show){const p=flightPosition(performance.now()),g=el('g',{id:'singleElectron',transform:`translate(${p.x} ${p.y})`});chargeText(g,0,0,false);g.append(el('text',{x:0,y:-20,'text-anchor':'middle','font-size':14,fill:'#176bb5'},Number(bench.flight.amount.toFixed(4))+' 格'));svg.append(g);}
 if($('removeSelected'))$('removeSelected').disabled=!bench.objects.some(o=>o.uid===bench.selected);
 if($('benchRead'))$('benchRead').textContent=(bench.objects.length?bench.objects.map(o=>kind(o.id).name+'：'+chargeLabel(objectCharge(o))).join(' ｜ '):'先把物品拖進實驗桌')+(induction?`\n目標球：${chargeLabel(12-bench.electrons)}\n大地：${chargeLabel(bench.earth)}${bench.ground?'（接地中）':'（未接地）'}`:'');
 let message=bench.message;
 if(induction){message=bench.flight?(bench.flight.reason==='ground'?'電子正沿接地線逐格轉移。':'電子正在接觸處逐格轉移。'):bench.ground?'接地中：改變帶電物的位置，觀察大地與目標球交換電子。':bench.contact&&contactNow(bench.contact.object)?'接觸中：電子轉移至平衡後停止；拖開即可保留電荷。':Math.abs(influence())>.05?'未接地也未接觸：電子只在球內重分布，這是靜電感應。':'拖動帶電物靠近，或接觸目標球。淨電荷不會因移開而憑空消失。';}
 $('status').textContent=message||'拖入不同材質，接觸後來回摩擦。';updateQuizUI();
}
function endpoint(owner){if(owner==='sphere')return sphere();if(owner==='earth')return earthPoint();return {x:owner.x,y:owner.y};}
function beginTransfer(from,to,reason,amount=1){
 if(bench.flight||amount<EPS)return;bench.flight={from,to,reason,amount:Math.min(1,amount),start:performance.now(),duration:750,a:endpoint(from),b:endpoint(to)};
}
function flightPosition(t){
 const f=bench.flight,progress=clamp((t-f.start)/f.duration,0,1),p=f.returning?f.returnFraction*(1-progress):progress;
 if(f.reason==='ground'){
  const earth=earthPoint(),end=terminal(),u=f.from==='sphere'?p:1-p;
  if(u<.25){const v=u/.25,s=sphere();return{x:s.x+(end.x-s.x)*v,y:s.y+(end.y-s.y)*v};}
  const v=(u-.25)/.75;return{x:(1-v)**2*end.x+2*(1-v)*v*(earth.x-100)+v*v*earth.x,y:(1-v)**2*end.y+2*(1-v)*v*(earth.y-20)+v*v*earth.y};
 }
 // Contact transfer stays on the line through the touching surfaces, never jumps across air.
 const a=endpoint(f.from),b=endpoint(f.to);return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
}
function finishTransfer(){
 const f=bench.flight;if(!f)return;if(f.returning){bench.flight=null;return;}
 const change=(owner,delta)=>{if(owner==='sphere')bench.electrons+=delta;else if(owner==='earth')bench.earth-=delta;else owner.e+=delta;};
 change(f.from,-f.amount);change(f.to,f.amount);bench.flight=null;
 record('transfer',{reason:f.reason,amount:f.amount,from:f.from==='sphere'||f.from==='earth'?f.from:f.from.uid,to:f.to==='sphere'||f.to==='earth'?f.to:f.to.uid});
}
function touchingMaterials(a,b){return Math.abs(a.x-b.x)<185*scaleBench()&&Math.abs(a.y-b.y)<125*scaleBench();}
function friction(o,dist){
 bench.travel+=dist;if(bench.travel<55||bench.flight||o.id==='ball')return;
 for(const b of bench.objects){
  if(o===b||b.id==='ball'||!touchingMaterials(o,b))continue;
  const ar=kind(o.id).rank,br=kind(b.id).rank;if(ar===br){bench.message='相同材質：此簡化模型沒有淨電子轉移。';continue;}
  const from=ar<br?o:b,to=from===o?b:o;if(from.e<=6||to.e>=18)continue;
  bench.travel=0;beginTransfer(from,to,'friction',Math.min(1,from.e-6,18-to.e));bench.message='摩擦轉移電子；正電背景留在各自材質上。';break;
 }
}
function contactNow(o){return state.mode!=='materials'&&benchModes.includes(state.mode)&&bench.objects.includes(o)&&Math.abs(surfaceGap(o))<7&&Math.abs(o.y-sphere().y)<sphere().r*.9;}
function cancelFlight(){if(!bench.flight||bench.flight.returning)return;const f=bench.flight;f.returnFraction=clamp((performance.now()-f.start)/f.duration,0,1);f.returning=true;f.start=performance.now();f.duration=Math.max(100,750*f.returnFraction);}
function placeObject(o,x,y){
 o.x=clamp(x,75,bench.width-75);o.y=clamp(y,105,390);
 if(state.mode==='materials')return;
 const s=sphere(),min=s.r+halfSize(o),dx=o.x-s.x,dy=o.y-s.y,d=Math.hypot(dx,dy);
 if(d<min){o.x=clamp(s.x+dx/(d||1)*min,75,bench.width-75);o.y=clamp(s.y+dy/(d||1)*min,105,390);if(Math.hypot(o.x-s.x,o.y-s.y)<min-1){o.x=s.x-min;o.y=s.y;}}
}
function refreshContact(o){
 if(state.mode==='materials')return;
 if(contactNow(o)){
  if(!bench.contact||bench.contact.object!==o){
   if(bench.flight?.reason==='contact')cancelFlight();
   const qs=12-bench.electrons,qo=objectCharge(o);
   bench.contact={object:o,target:o.id==='ball'?(qo+qs)/2:qs+(qo-qs)*.25,settled:false};
   record('contact-start',{uid:o.uid});
  }
 }else if(bench.contact?.object===o){if(bench.flight?.reason==='contact')cancelFlight();bench.contact=null;record('contact-end',{uid:o.uid});}
}
function moveObject(o,x,y){
 const previous={x:o.x,y:o.y};placeObject(o,x,y);refreshContact(o);
 if(bench.flight?.reason==='friction'&&!touchingMaterials(bench.flight.from,bench.flight.to))cancelFlight();
 friction(o,Math.hypot(o.x-previous.x,o.y-previous.y));
 if(o.uid===bench.quiz?.source)record('source-move');renderBench();
}
function removeObject(uid){
 const o=bench.objects.find(o=>o.uid===uid);if(!o)return;
 if(bench.flight&&(bench.flight.from===o||bench.flight.to===o))bench.flight=null;
 if(bench.contact?.object===o)bench.contact=null;if(bench.drag?.o===o)bench.drag=null;
 bench.removedCharge+=objectCharge(o);bench.objects=bench.objects.filter(v=>v!==o);bench.selected=null;record('remove',{uid});
 bench.message='物品已移出；電荷隨物品帶走。';renderBench();
}
function startTray(e,id){
 if(e.button!==0||state.mode==='quiz')return;
 trayDrag={id,charge:id==='ball'?ballSetting:0,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();document.body.classList.add('placingMaterial');
 materialGhost=html('div',{class:'materialGhost'});const icon=el('svg',{viewBox:'-110 -85 220 180'});drawShape(icon,kind(id));materialGhost.append(icon,document.createTextNode(kind(id).name));materialGhost.style.left=e.clientX+'px';materialGhost.style.top=e.clientY+'px';document.body.append(materialGhost);
}
function clearTray(){trayDrag=null;materialGhost?.remove();materialGhost=null;document.body.classList.remove('placingMaterial');}
document.addEventListener('pointermove',e=>{if(materialGhost){materialGhost.style.left=e.clientX+'px';materialGhost.style.top=e.clientY+'px';}});
document.addEventListener('pointerup',e=>{
 if(!trayDrag)return;const r=$('exploreSvg').getBoundingClientRect();
 if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){const p=point(e,$('exploreSvg'));addObject(trayDrag.id,p.x,p.y,trayDrag.charge);}
 clearTray();
});
document.addEventListener('pointercancel',()=>{clearTray();bench.drag=null;});
const svgBench=$('exploreSvg');
svgBench.addEventListener('pointerdown',e=>{
 const removal=e.target.closest('[data-remove]');if(removal){e.preventDefault();removeObject(+removal.dataset.remove);return;}
 const object=e.target.closest('[data-object]'),clip=e.target.closest('[data-clip]');if(!object&&!clip)return;
 e.preventDefault();const p=point(e,svgBench);
 if(clip){
  const wasGround=bench.ground,pending=!!bench.flight;
  if(bench.flight?.reason==='ground')cancelFlight();bench.ground=false;
  if(wasGround)record('ground-disconnect',{pending});
  bench.drag={type:'clip'};bench.cable={x:p.x,y:p.y};
 }else{const o=bench.objects.find(o=>o.uid===+object.dataset.object);bench.drag={type:'object',o,dx:o.x-p.x,dy:o.y-p.y};bench.selected=o.uid;bench.travel=0;}
 svgBench.setPointerCapture(e.pointerId);renderBench();
});
svgBench.addEventListener('pointermove',e=>{
 if(!bench.drag)return;const p=point(e,svgBench),d=bench.drag;
 if(d.type==='clip'){bench.cable={x:clamp(p.x,25,bench.width-25),y:clamp(p.y,85,475)};renderBench();}else moveObject(d.o,p.x+d.dx,p.y+d.dy);
});
function endBenchDrag(){
 if(bench.drag?.type==='clip'){
  const t=terminal();bench.ground=Math.hypot(bench.cable.x-t.x,bench.cable.y-t.y)<54;
  if(bench.ground){if(bench.flight?.reason==='contact')cancelFlight();bench.cable=t;record('ground-connect');if(bench.contact)bench.contact=null;}
 }
 bench.drag=null;renderBench();
}
svgBench.addEventListener('pointerup',endBenchDrag);svgBench.addEventListener('pointercancel',()=>{if(bench.drag)endBenchDrag();});svgBench.addEventListener('lostpointercapture',()=>{if(bench.drag)endBenchDrag();});
svgBench.addEventListener('keydown',e=>{
 const g=e.target.closest('[data-object]');if(!g||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
 e.preventDefault();const o=bench.objects.find(o=>o.uid===+g.dataset.object);moveObject(o,o.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),o.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0));svgBench.querySelector(`[data-object="${o.uid}"]`)?.focus();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){clearTray();bench.drag=null;}
 if(['Delete','Backspace'].includes(e.key)&&benchModes.includes(state.mode)&&!e.target.closest('input,select,textarea,[contenteditable]')){e.preventDefault();removeObject(bench.selected);}
});
function benchTick(t){
 if(benchModes.includes(state.mode)){
  if(bench.flight){
   if(bench.flight.reason==='ground'&&!bench.flight.returning){const delta=12+Math.round(influence()*6)-bench.electrons;if(!bench.ground||Math.abs(delta)<EPS||(delta>0)!==(bench.flight.to==='sphere'))cancelFlight();}
   if(t-bench.flight.start>=bench.flight.duration){finishTransfer();renderBench();}
   else{const p=flightPosition(t);$('singleElectron')?.setAttribute('transform',`translate(${p.x} ${p.y})`);}
  }
  if(state.mode!=='materials'&&!bench.flight){
   if(bench.ground){
    const target=12+Math.round(influence()*6),delta=target-bench.electrons;
    if(Math.abs(delta)>EPS){beginTransfer(delta>0?'earth':'sphere',delta>0?'sphere':'earth','ground',Math.min(1,Math.abs(delta)));renderBench();}
   }else if(bench.contact&&contactNow(bench.contact.object)){
    const contact=bench.contact,delta=(12-bench.electrons)-contact.target;
    if(Math.abs(delta)>EPS){beginTransfer(delta>0?contact.object:'sphere',delta>0?'sphere':contact.object,'contact',Math.min(1,Math.abs(delta)));renderBench();}
    else if(!contact.settled){contact.settled=true;record('contact-settled');renderBench();}
   }
  }
 }
 requestAnimationFrame(benchTick);
}
function checkQuiz(){
 const q=bench.quiz;if(!q)return;const source=sourceObject(),flags=q.flags,sq=12-bench.electrons;
 let problem=q.invalid;
 if(!problem&&(!source||bench.flight||bench.ground))problem='請保留指定帶電球、等電子轉移結束，並確認接地已斷開。';
 if(!problem&&q.task==='contact'){
  if(!flags.contact||!flags.transferred||!flags.settled)problem='還沒有完成接觸與電荷分享。請將指定球碰到目標球，等待轉移停止。';
  else if(contactNow(source)||!sourceFar())problem='電荷已分享，請把帶電球移遠，再檢查結果。';
  else if(Math.abs(sq-3)>EPS||Math.abs(objectCharge(source)-3)>EPS)problem='兩球尚未各保留 ＋3 格。請重新挑戰，勿接地或改變指定物品。';
 }else if(!problem){
  if(!flags.near||!flags.grounded||!flags.exchange||!flags.disconnected||!flags.far)problem='還沒有完成「靠近 → 接地並轉移 → 先斷地 → 移開」的有效過程。只靠近造成極化不算起電。';
  else if(!sourceFar()||sq<=EPS||Math.abs(objectCharge(source)+6)>EPS||Math.abs(sq+bench.earth)>EPS)problem='請確認帶電球已移遠，目標球留下正電，且來源球電量維持 −6 格。';
 }
 if(!problem&&Math.abs(systemCharge()-bench.importedCharge)>EPS)problem='電荷總量不一致，請重試本題。';
 q.passed=!problem;q.feedback=problem||(q.task==='contact'?'完成！你透過實際接觸轉移電子，再分開兩球；兩球各留下 ＋3 格。':'完成！未經接觸，你讓電子經大地交換，先斷地再移開來源，目標球留下正電。');updateQuizUI();
}
function updateQuizUI(){
 if(state.mode!=='quiz'||!bench.quiz||!$('quizSteps'))return;
 const q=bench.quiz,f=q.flags,steps=q.task==='contact'?[['contact','曾實際接觸'],['transferred','發生接觸電子轉移'],['settled','分享完成並停止'],['far','來源球已移遠']]:[['near','帶電球靠近，保持不接觸'],['grounded','靠近後接地'],['exchange','電子經大地交換'],['disconnected','保持靠近，等轉移完再斷地'],['far','最後移開帶電球']];
 $('quizSteps').replaceChildren(...steps.map(([key,text])=>html('li',{'data-step':key,'data-done':!!f[key]},(f[key]?'✓ ':'○ ')+text)));
 $('quizFeedback').textContent=q.invalid||q.feedback;$('quizFeedback').dataset.result=q.passed?'pass':q.invalid?'invalid':'pending';
}
const oldCharges=$('charges').onchange;$('charges').onchange=e=>{state.show=e.target.checked;if(benchModes.includes(state.mode))renderBench();else if(state.mode==='static')oldCharges(e);};
// A fixed model coordinate system makes resize/fullscreen a view-only change.
// Ground connections, in-flight quantities, contact and quiz evidence stay intact.
window.addEventListener('resize',()=>{if(benchModes.includes(state.mode))renderBench();});

$('rub').hidden=true;$('release').hidden=true;
window.directBench={bench,matter,influence,electronPositions,systemCharge};
requestAnimationFrame(benchTick);
