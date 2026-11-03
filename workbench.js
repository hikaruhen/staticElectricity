'use strict';
// Quantities are representative charge units, not counts of individual electrons.
const matter=[
 {id:'fur',name:'毛皮',kind:'fur',color:'#bd9164',rank:0},
 {id:'glass',name:'玻璃',kind:'rod',color:'#b7e2eb',rank:1},
 {id:'silk',name:'絲絹',kind:'silk',color:'#d9b9d7',rank:1.5},
 {id:'plastic',name:'塑膠',kind:'rod',color:'#91bead',rank:2}
];
const ballKind={id:'ball',name:'帶電金屬球',kind:'ball',color:'#dee7e7',rank:null};
const componentKinds=[{id:'electroscope',name:'金箔驗電器',kind:'scope-icon'},{id:'metal-sphere',name:'金屬球（絕緣支架）',kind:'sphere-icon'},{id:'earth',name:'大地／接地線',kind:'earth-icon'}];
const kind=id=>id==='ball'?ballKind:matter.find(m=>m.id===id)||componentKinds.find(m=>m.id===id);
const EPS=1e-7,benchModes=['materials','induction','quiz'];
const bench={objects:[],electrons:12,earth:0,ground:false,cable:{x:0,y:0},drag:null,flight:null,next:1,travel:0,contact:null,removedCharge:0,importedCharge:0,message:'',width:900,selected:null,events:[],quiz:null};
const ionSlots=Array.from({length:12},(_,i)=>({x:(i%4-1.5)*39,y:(Math.floor(i/4)-1)*38}));
let ballSetting=6,quizTask='contact',quizSign=1,trayDrag=null,materialGhost=null;
const previousMode=switchMode,previousReset=reset;
function benchSize(){bench.width=900;return bench.width;}
function scaleBench(){return bench.width<600?.7:1;}
function sphere(){return {x:bench.width*.69,y:245,r:bench.width<600?83:110};}
function earthPoint(){return state.mode==='induction'&&bench.free?.earth?bench.free.earth:{x:bench.width-48,y:440};}
function terminal(){const s=sphere();return {x:s.x+s.r*.68,y:s.y+s.r*.68};}
function halfSize(o){return (o.id==='ball'?65:100)*scaleBench();}
function objectCharge(o){return 12-o.e;}
function systemCharge(){if(state.mode==='induction')return freeSystemCharge();return bench.objects.reduce((n,o)=>n+objectCharge(o),0)+(state.mode==='materials'?0:12-bench.electrons+bench.earth)+bench.removedCharge;}
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
 if(type==='contact-start'){q.flags.contact=true;if(q.task==='induction')failQuiz('帶電金屬球碰到目標球，這次已包含接觸起電。請重新挑戰感應起電。');}
 if(type==='ground-connect'){
  if(q.task==='contact')failQuiz('接觸起電任務不使用接地。請重試，直接接觸並分開兩球。');
  else if(q.flags.near&&sourceNear())q.flags.grounded=true;
  else failQuiz('接地前須先把帶電金屬球靠近目標球，且保持不接觸。請重試。');
 }
 if(type==='transfer'&&data.reason==='ground'&&q.flags.grounded&&sourceNear())q.flags.exchange=true;
 if(type==='transfer'&&data.reason==='contact')q.flags.transferred=true;
 if(type==='contact-settled')q.flags.settled=true;
 if(type==='ground-disconnect'&&q.task==='induction'){
  if(q.flags.exchange&&sourceNear()&&!data.pending)q.flags.disconnected=true;
  else failQuiz('請先讓接地電子轉移完成，再保持帶電金屬球靠近、拖開接地夾。請重試。');
 }
 if(type==='source-move'){
  if(sourceNear()&&!bench.ground&&!q.flags.disconnected)q.flags.near=true;
  if(sourceFar()){
   if(q.task==='induction'&&bench.ground)failQuiz('你先移開帶電金屬球、仍保持接地，目標球將回到中性。請重試並先斷地。');
   q.flags.far=true;
  }else q.flags.far=false;
 }
 if(type==='remove'&&data.uid===q.source)failQuiz('指定帶電金屬球被刪除了，不能用替換物品完成任務。請重新挑戰。');
}
function addObject(id,x,y,charge=0){
 if(state.mode==='induction'&&componentKinds.some(m=>m.id===id))return addFreeComponent(id,x,y);
 if(!kind(id))return null;
 const o={uid:bench.next++,id,x:clamp(x,75,bench.width-75),y:clamp(y,105,390),e:12-charge};
 if(id==='ball'&&state.mode==='induction')Object.assign(o,{base:12,capacity:1,r:65,type:'charged-sphere'});
 bench.objects.push(o);bench.selected=o.uid;bench.importedCharge+=charge;
 bench.message=charge?'這顆球在實驗桌外已帶電；拖入不是完成起電。請操作它影響中性目標球。':'拖曳物品與另一種材質接觸並來回摩擦。';
 if(state.mode!=='materials')placeObject(o,o.x,o.y);
 renderBench();return o;
}
function initBench(){
 benchSize();Object.assign(bench,{objects:[],electrons:12,earth:0,ground:false,cable:earthPoint(),drag:null,flight:null,selected:null,travel:0,contact:null,removedCharge:0,importedCharge:0,message:'',events:[],quiz:null});
 if(state.mode==='induction')initFreeBench();
 if(state.mode==='quiz'){
  bench.quiz={task:quizTask,source:null,initialCharge:quizSign*6,flags:{},invalid:'',passed:false,feedback:'尚未檢查。請直接操作指定帶電金屬球與目標球。'};
  const o=addObject('ball',bench.width<600?80:170,135,bench.quiz.initialCharge);bench.quiz.source=o.uid;
 }
}
switchMode=function(mode){
 const old=state.mode;if(old==='induction'&&old!==mode){for(const c of freeConductors())cancelScopeInternal(c);document.querySelectorAll('[data-internal-electron]').forEach(e=>e.remove());}if(old==='induction'&&bench.flight)cancelFreeFlight();clearTray();bench.drag=null;bench.flight=null;previousMode(mode);
 if(benchModes.includes(mode)){
  if(old!==mode)initBench();
  buildBenchControls();renderBench();
 }
};
reset=function(){if(benchModes.includes(state.mode)){clearTray();initBench();buildBenchControls();renderBench();}else previousReset();};
$('resetBench').onclick=()=>reset();
function html(tag,attrs={},text=''){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')e.className=v;else e.setAttribute(k,v);}e.textContent=text;return e;}
function buildBenchControls(){
 $('materialTray')?.remove();$('sourceControls')?.remove();
 const c=$('exploreControls');c.replaceChildren();
 c.append(html('h2',{},state.mode==='materials'?'摩擦起電':state.mode==='quiz'?'實作測驗':'自由操作起電'));
 if(state.mode==='quiz'){
  const l=html('label',{for:'quizTask'},'選擇任務'),select=html('select',{id:'quizTask'});
  for(const [value,text]of [['contact','接觸起電'],['induction','感應起電']])select.add(new Option(text,value));
  select.value=quizTask;select.onchange=()=>{quizTask=select.value;quizSign=quizTask==='contact'?1:-1;reset();};c.append(l,select);
  const polarity=html('div',{class:'quizPolarity',role:'group','aria-label':'測驗來源球電性'});
  for(const [value,id,label] of [[1,'quizPositive','正電球 ＋6'],[-1,'quizNegative','負電球 −6']]){
   const button=html('button',{id,'aria-pressed':String(quizSign===value)},label);button.onclick=()=>{if(quizSign!==value){quizSign=value;reset();}};polarity.append(button);
  }
  c.append(html('p',{class:'note'},'來源球電性（切換會開始新題）'),polarity);
  const initial=bench.quiz.initialCharge,targetSign=initial>0?'負':'正';
  const instruction=html('p',{id:'quizGoal',class:'quizGoal'},quizTask==='contact'?`目標：用指定 ${chargeLabel(initial)} 帶電金屬球接觸原本中性的目標球，等分享完成後移開；兩球各留下 ${chargeLabel(initial/2)}。不要接地。`:`目標：用指定 ${chargeLabel(initial)} 帶電金屬球，讓原本中性的目標球不經接觸而留下${targetSign}電。先靠近、接地、等轉移完成，再斷地、移開帶電金屬球。`);
  c.append(instruction,html('p',{class:'note'},'指定球原本已帶電；得分對象是固定的中性目標球。沒有新增帶電金屬球入口，不能以預設電量替代操作。'));
  const check=html('button',{id:'checkQuiz',class:'primary'},'檢查操作結果');check.onclick=checkQuiz;
  const retry=html('button',{id:'retryQuiz'},'重新挑戰本題');retry.onclick=()=>reset();
  c.append(html('ol',{id:'quizSteps',class:'quizSteps'}),check,html('p',{id:'quizFeedback',role:'status',class:'quizFeedback'}),retry);
 }else{
  const tray=html('div',{id:'materialTray',class:'materialTray','aria-label':'材料架：毛皮、玻璃、絲絹、塑膠'});
  for(const m of matter)tray.append(makeTile(m));
  c.append(tray);
  if(state.mode==='induction'){
   const source=html('div',{id:'sourceControls',class:'sourceControls'});
   const label=html('label',{for:'ballCharge'},'帶電金屬球（外部已帶電）');
   const range=html('input',{id:'ballCharge',type:'range',min:-8,max:8,step:1,value:ballSetting});
   const output=html('output',{id:'ballChargeRead',for:'ballCharge'},chargeLabel(ballSetting));range.oninput=()=>{ballSetting=+range.value;output.textContent=chargeLabel(ballSetting);};
   const tile=makeTile(ballKind);tile.id='chargedBallTile';tile.dataset.source='ball';
   source.append(label,output,range,tile,html('p',{class:'note'},'先設定正／負電量，再把球拖進桌面。此設定只作用於下一顆球；不會改變桌上物品。'));
   const components=html('div',{id:'freeComponentTray',class:'materialTray','aria-label':'拖入導體與大地'});
   for(const m of componentKinds){const tile=makeTile(m);tile.dataset.component=m.id;tile.id={electroscope:'electroscopeTile','metal-sphere':'metalSphereTile',earth:'earthTile'}[m.id];components.append(tile);}
   c.append(html('p',{class:'miniLabel'},'元件：拖入白框'),components,source,html('p',{class:'note'},'空桌開始，自行拖入材料、導體與大地。玻璃與乾燥絲絹摩擦：玻璃正、絲絹負；序列受配方與濕度影響。大地／接地線共用一組，拖入後綠夾可接任一導體。'));

  }
  c.append(html('p',{class:'note'},state.mode==='materials'?'三種材質各自拖入，接觸後來回摩擦。塑膠在此假設為乾燥聚乙烯表面；摩擦序列只作教學示意。':'自行摩擦材質，或拖入外部已帶電的導電球。靠近、接觸目標球；拖動綠夾接地或斷地。＋背景固定，只有 − 轉移。'));
 }
 const remove=html('button',{id:'removeSelected'},'刪除選取物品');remove.onclick=()=>removeObject(bench.selected);
 c.append(remove,html('div',{id:'benchRead',class:'benchRead','aria-live':'polite'}),html('p',{class:'note'},'紅色＋是固定正電背景，藍色−是電子分布示意。每格代表大量電荷；物件淨電荷及外部交換採整數格，每次轉移 1 格。內部標記只表示重新分布，不另增加電荷。'));
}
function makeTile(m){
 const tile=html('div',{class:'materialTile',tabindex:0,role:'button','aria-label':`拖入${m.name}；Enter 放到桌面`});
 if(m.id!=='ball'&&!componentKinds.some(c=>c.id===m.id))tile.dataset.material=m.id;
 const icon=el('svg',{viewBox:'-110 -85 220 180','aria-hidden':true});drawShape(icon,m);tile.append(icon,document.createTextNode(m.name));
 tile.addEventListener('pointerdown',e=>startTray(e,m.id));
 tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();addObject(m.id,bench.width<600?80:170,145+bench.objects.length%2*180,m.id==='ball'?ballSetting:0);}});
 return tile;
}
function drawShape(g,m){
 const common={stroke:'#54706c','stroke-width':2};
 if(m.kind==='scope-icon'){g.append(el('rect',{x:-65,y:-35,width:130,height:115,rx:13,fill:'#eff7f7',stroke:'#719596','stroke-width':4}),el('path',{d:'M0 -60V12M0 12L-28 65M0 12L28 65',stroke:'#bd8e20','stroke-width':7,fill:'none'}),el('ellipse',{cx:0,cy:-65,rx:23,ry:13,fill:'#bacfcd',stroke:'#638783','stroke-width':3}));return;}
 if(m.kind==='sphere-icon'){g.append(el('rect',{x:-12,y:25,width:24,height:65,fill:'#bac8bf'}),el('circle',{cy:-15,r:54,fill:'#dae7e5',stroke:'#638783','stroke-width':4}));return;}
 if(m.kind==='earth-icon'){g.append(el('path',{d:'M-75 -40Q-20 -70 0 -20V28m-38 0h76m-62 16h48m-36 16h24',fill:'none',stroke:'#368069','stroke-width':7}),el('circle',{cx:-75,cy:-40,r:18,fill:'#e1f2dd',stroke:'#368069','stroke-width':4}));return;}
 if(m.kind==='silk'){g.append(el('path',{d:'M-98 -55Q-50 -76 0 -55T98 -55L90 58Q45 78 0 58T-98 58Z',fill:m.color,...common}));for(let j=0;j<5;j++)g.append(el('path',{d:`M${-74+j*36} -53Q${-94+j*36} 0 ${-74+j*36} 58`,stroke:'#b58bb4','stroke-width':2,fill:'none'}));return;}
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
  const visible=o.e-(bench.flight?.from===o&&!bench.flight.reserved?(bench.flight.amount||1):0);
  if(o.id==='ball'){
   // Sparse, fixed positive background. Each stationary ball glyph represents two units.
   for(let i=0;i<6;i++){const a=i*Math.PI/3;chargeText(g,Math.cos(a)*45,Math.sin(a)*45,true,{'data-ion':o.uid+'-'+i,'data-metal-ion':'ball:'+o.uid,'data-charge-weight':2});}
   drawMetalElectronCloud(g,o);
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
 const distribution=metalElectronDistribution('quiz-target');return distribution.positions.map(p=>({x:distribution.node.x+p.x,y:distribution.node.y+p.y}));
}
function renderBench(){
 if(!benchModes.includes(state.mode))return;
 if(state.mode==='induction'){renderFreeBench();return;}
 const svg=$('exploreSvg'),induction=state.mode!=='materials';svg.setAttribute('viewBox',`0 0 ${bench.width} 540`);svg.setAttribute('aria-label',state.mode==='quiz'?'測驗模式：操作指定帶電金屬球、目標球與接地夾':induction?'自由操作起電：拖動材質、帶電金屬球與接地夾':'摩擦起電：拖入毛皮、玻璃、塑膠後摩擦');svg.replaceChildren();
 svg.append(el('rect',{x:8,y:45,width:bench.width-16,height:475,rx:22,fill:'#f0f4ea',stroke:'#cbd9ca','stroke-dasharray':'7 7'}));
 $('sceneTitle').textContent=state.mode==='quiz'?'測驗模式 · '+(quizTask==='contact'?'接觸起電':'感應起電'):induction?'自由操作起電':'摩擦起電';
 $('exploreHint').textContent=state.mode==='quiz'?'直接拖動指定帶電金屬球與接地夾，再按「檢查操作結果」':induction?'拖入物品，自由決定靠近、接觸、接地與斷地的順序':'從材料架拖入物品，兩物接觸並來回摩擦';
 if(induction){
  const s=sphere(),end=terminal(),earth=earthPoint();svg.append(el('rect',{x:s.x-18,y:s.y+s.r-5,width:36,height:100,fill:'#bac8bf'}),el('circle',{cx:s.x,cy:s.y,r:s.r,fill:'#dae7e5',stroke:'#638783','stroke-width':3,'data-target-sphere':true}),el('text',{x:s.x-(bench.width<600?45:0),y:485,class:'benchLabel'},'目標金屬球 · 絕緣支架'));
  const net=12-bench.electrons,polarity=Math.abs(net)<EPS?'neutral':net>0?'positive':'negative',color=polarity==='neutral'?'#355d59':net>0?'#c63e36':'#176bb5';
  const badge=el('g',{'data-target-charge':Number(net.toFixed(4)),'data-polarity':polarity,role:'img','aria-label':`絕緣支架上的金屬導體球，淨電荷${chargeLabel(net)}`});
  badge.append(el('rect',{x:s.x-130,y:64,width:260,height:64,rx:12,fill:'#fffdf6',stroke:color,'stroke-width':2}),el('text',{x:s.x,y:86,'text-anchor':'middle','font-size':17,fill:'#355d59'},'目標金屬球 · 淨電荷'),el('text',{x:s.x,y:113,'text-anchor':'middle','font-size':26,'font-weight':700,fill:color},polarity==='neutral'?'中性 · 0 格':`${net>0?'正':'負'}電 · ${chargeLabel(net)}`));svg.append(badge);
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
 if(state.mode==='induction'){freeStart(from,to,reason,amount);return;}
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
const materialGeometryCache=new Map();
function materialGeometry(id){
 if(materialGeometryCache.has(id))return materialGeometryCache.get(id);
 let svg=document.getElementById('materialGeometrySvg');if(!svg){svg=el('svg',{id:'materialGeometrySvg',width:1,height:1,'aria-hidden':'true',style:'position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none;overflow:visible'});document.body.append(svg);}
 const g=el('g');drawShape(g,kind(id));svg.append(g);const shape=g.firstElementChild,length=shape.getTotalLength(),points=[];
 for(let d=0;d<length;d+=2){const p=shape.getPointAtLength(d);points.push({x:p.x,y:p.y});}
 const geometry={shape,points};materialGeometryCache.set(id,geometry);return geometry;
}
function touchingMaterials(a,b){
 if(Math.abs(a.x-b.x)>220*scaleBench()||Math.abs(a.y-b.y)>180*scaleBench())return false;
 const ga=materialGeometry(a.id),gb=materialGeometry(b.id),dx=(a.x-b.x)/scaleBench(),dy=(a.y-b.y)/scaleBench();
 return ga.points.some(p=>gb.shape.isPointInFill(new DOMPoint(p.x+dx,p.y+dy)))||gb.points.some(p=>ga.shape.isPointInFill(new DOMPoint(p.x-dx,p.y-dy)));
}
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
function cancelFlight(){if(state.mode==='induction'){cancelFreeFlight();return;}if(!bench.flight||bench.flight.returning)return;const f=bench.flight;f.returnFraction=clamp((performance.now()-f.start)/f.duration,0,1);f.returning=true;f.start=performance.now();f.duration=Math.max(100,750*f.returnFraction);}
function placeObject(o,x,y){
 if(state.mode==='induction'){placeFreeSource(o,x,y);return;}
 o.x=clamp(x,75,bench.width-75);o.y=clamp(y,105,390);
 if(state.mode==='materials')return;
 const s=sphere(),min=s.r+halfSize(o),dx=o.x-s.x,dy=o.y-s.y,d=Math.hypot(dx,dy);
 if(d<min){o.x=clamp(s.x+dx/(d||1)*min,75,bench.width-75);o.y=clamp(s.y+dy/(d||1)*min,105,390);if(Math.hypot(o.x-s.x,o.y-s.y)<min-1){o.x=s.x-min;o.y=s.y;}}
}
function refreshContact(o){
 if(state.mode==='induction')return;
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
 if(o.uid===bench.quiz?.source)record('source-move');if(state.mode==='induction'&&bench.flight&&!freeFlightValid(bench.flight))cancelFreeFlight();renderBench();
}
function removeObject(uid){
 if(state.mode==='induction'&&uid==='earth'){removeFreeEarth();return;}
 if(state.mode==='induction'&&String(uid).startsWith('conductor:')){removeFreeConductor(String(uid).slice(10));return;}
 const o=bench.objects.find(o=>o.uid===uid);if(!o)return;
 if(bench.flight&&(bench.flight.from===o||bench.flight.to===o)){if(state.mode==='induction')cancelFreeFlight();else bench.flight=null;}
 if(state.mode==='induction'){for(const[key,c]of bench.free.contacts)if(c.a===o||c.b===o)bench.free.contacts.delete(key);if(bench.free.groundId===o.uid){bench.free.groundId=null;bench.cable=earthPoint();}if(bench.contact?.a===o||bench.contact?.b===o)bench.contact=null;}
 if(bench.contact?.object===o)bench.contact=null;if(bench.drag?.o===o)bench.drag=null;
 bench.removedCharge+=objectCharge(o);bench.objects=bench.objects.filter(v=>v!==o);bench.selected=null;record('remove',{uid});
 bench.message='物品已移出；電荷隨物品帶走。';renderBench();
}
function startTray(e,id){
 if(e.button!==0||state.mode==='quiz')return;
 trayDrag={id,charge:id==='ball'?ballSetting:0,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();document.body.classList.add('placingMaterial');
 materialGhost=html('div',{class:'materialGhost'});const icon=el('svg',{viewBox:'-110 -85 220 180'});drawShape(icon,kind(id));materialGhost.append(icon,document.createTextNode(kind(id).name));materialGhost.style.left=e.clientX+'px';materialGhost.style.top=e.clientY+'px';document.documentElement.append(materialGhost);
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
 if(state.mode==='induction'&&freePointerDown(e))return;
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
 if(state.mode==='induction'&&d.type==='free-earth'){const old={...bench.free.earth};bench.free.earth.x=clamp(p.x+d.dx,55,850);bench.free.earth.y=clamp(p.y+d.dy,110,440);if(!freeGroundOwner()){bench.cable.x+=bench.free.earth.x-old.x;bench.cable.y+=bench.free.earth.y-old.y;}renderFreeBench();return;}
 if(state.mode==='induction'&&d.type==='free-clip'){bench.cable={x:clamp(p.x,25,875),y:clamp(p.y,70,475)};renderFreeBench();return;}
 if(state.mode==='induction'&&d.type==='conductor'){moveFreeConductor(d.c,p.x+d.dx,p.y+d.dy);return;}
 if(d.type==='clip'){bench.cable={x:clamp(p.x,25,bench.width-25),y:clamp(p.y,85,475)};renderBench();}else moveObject(d.o,p.x+d.dx,p.y+d.dy);
});
function endBenchDrag(){
 if(state.mode==='induction'){endFreeDrag();return;}
 if(bench.drag?.type==='clip'){
  const t=terminal();bench.ground=Math.hypot(bench.cable.x-t.x,bench.cable.y-t.y)<54;
  if(bench.ground){if(bench.flight?.reason==='contact')cancelFlight();bench.cable=t;record('ground-connect');if(bench.contact)bench.contact=null;}
 }
 bench.drag=null;renderBench();
}
svgBench.addEventListener('pointerup',endBenchDrag);svgBench.addEventListener('pointercancel',()=>{if(bench.drag)endBenchDrag();});svgBench.addEventListener('lostpointercapture',()=>{if(bench.drag)endBenchDrag();});
svgBench.addEventListener('keydown',e=>{
 if(state.mode==='induction'&&freeKeyDown(e))return;
 const g=e.target.closest('[data-object]');if(!g||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
 e.preventDefault();const o=bench.objects.find(o=>o.uid===+g.dataset.object);moveObject(o,o.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),o.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0));svgBench.querySelector(`[data-object="${o.uid}"]`)?.focus();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){clearTray();bench.drag=null;}
 if(['Delete','Backspace'].includes(e.key)&&benchModes.includes(state.mode)&&!e.target.closest('input,select,textarea,[contenteditable]')){e.preventDefault();removeObject(bench.selected);}
});
function benchTick(t){
 if(state.mode==='induction'){freeTick(t);}else if(benchModes.includes(state.mode)){
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
 if(!problem&&(!source||bench.flight||bench.ground))problem='請保留指定帶電金屬球、等電子轉移結束，並確認接地已斷開。';
 if(!problem&&q.task==='contact'){
  if(!flags.contact||!flags.transferred||!flags.settled)problem='還沒有完成接觸與電荷分享。請將指定球碰到目標球，等待轉移停止。';
  else if(contactNow(source)||!sourceFar())problem='電荷已分享，請把帶電金屬球移遠，再檢查結果。';
  else if(Math.abs(sq-q.initialCharge/2)>EPS||Math.abs(objectCharge(source)-q.initialCharge/2)>EPS)problem=`兩球尚未各保留 ${chargeLabel(q.initialCharge/2)}。請重新挑戰，勿接地或改變指定物品。`;
 }else if(!problem){
  if(!flags.near||!flags.grounded||!flags.exchange||!flags.disconnected||!flags.far)problem='還沒有完成「靠近 → 接地並轉移 → 先斷地 → 移開」的有效過程。只靠近造成極化不算起電。';
  else if(!sourceFar()||sq*q.initialCharge>=-EPS||Math.abs(objectCharge(source)-q.initialCharge)>EPS||Math.abs(sq+bench.earth)>EPS)problem=`請確認來源球已移遠，目標球留下${q.initialCharge>0?'負':'正'}電，且來源電量維持 ${chargeLabel(q.initialCharge)}。`;
 }
 if(!problem&&Math.abs(systemCharge()-bench.importedCharge)>EPS)problem='電荷總量不一致，請重試本題。';
 q.passed=!problem;q.feedback=problem||(q.task==='contact'?`完成！你透過實際接觸轉移電子，再分開兩球；兩球各留下 ${chargeLabel(q.initialCharge/2)}。`:`完成！未經接觸，先斷地再移開來源，目標球留下 ${chargeLabel(sq)}；來源仍為 ${chargeLabel(q.initialCharge)}。`);updateQuizUI();
}
function updateQuizUI(){
 if(state.mode!=='quiz'||!bench.quiz||!$('quizSteps'))return;
 const q=bench.quiz,f=q.flags,steps=q.task==='contact'?[['contact','曾實際接觸'],['transferred','發生接觸電子轉移'],['settled','分享完成並停止'],['far','來源球已移遠']]:[['near','帶電金屬球靠近，保持不接觸'],['grounded','靠近後接地'],['exchange','電子經大地交換'],['disconnected','保持靠近，等轉移完再斷地'],['far','最後移開帶電金屬球']];
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

// Free bench conductors: separate net charge, polarization, and contact capacitance.
// Quiz keeps its original fixed target and original solver above.
function initFreeBench(){
 bench.free={conductors:[],earth:null,groundId:null,contacts:new Map(),internalNext:1,externalNext:1};
}
function freeConductors(){return bench.free?.conductors||[];}
function freeCharge(c){return c.base-c.e;}
function freeOwnerCharge(o){return o.base===undefined?objectCharge(o):freeCharge(o);}
function freeCapacity(o){return o.base===undefined?1:o.capacity;}
function freeCenter(c){return{x:c.x,y:c.type==='scope'?c.y-85:c.y};}
function freeRadius(o){return o.base===undefined?halfSize(o):o.r;}
function freeEndpoint(o){if(o==='earth')return earthPoint();return o.base===undefined?{x:o.x,y:o.y}:freeCenter(o);}
function freeTerminal(c){const p=freeCenter(c);return c.type==='scope'?{x:p.x+36,y:p.y+8}:{x:c.x+c.r*.68,y:c.y+c.r*.68};}
function electricalConductors(){return [...freeConductors(),...bench.objects.filter(o=>o.id==='ball')];}
function freeGroundOwner(){if(!bench.free?.earth)return null;return electricalConductors().find(c=>c.uid===bench.free.groundId);}
function freeGap(a,b){
 const material=[a,b].find(o=>o.base===undefined&&o.id!=='ball');
 if(material){const c=material===a?b:a,p=freeEndpoint(c),dx=Math.abs(p.x-material.x)-76,dy=Math.abs(p.y-material.y)-36;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)-24-freeRadius(c);}
 const p=freeEndpoint(a),q=freeEndpoint(b);return Math.hypot(p.x-q.x,p.y-q.y)-freeRadius(a)-freeRadius(b);
}
function freeTouch(a,b){return Math.abs(freeGap(a,b))<1.5;}
function freeField(c){
 let p=0;for(const o of [...bench.objects,...freeConductors()]){if(o===c)continue;const q=freeOwnerCharge(o),coupling=clamp((155-freeGap(c,o))/180,0,.85);p+=q*coupling;}
 return clamp(p,-8,8);
}
function integerCharge(value){return Math.sign(value)*Math.floor(Math.abs(value)+.5+1e-9);}
function integerContactTarget(a,b){
 const total=freeCharge(a)+freeOwnerCharge(b),magnitude=Math.abs(total),ideal=magnitude*a.capacity/(a.capacity+freeCapacity(b)),base=Math.floor(ideal),fraction=ideal-base;
 // Same owner receives a tied remainder for either sign; sum never changes.
 const extra=fraction>.5+1e-9||(Math.abs(fraction-.5)<=1e-9&&String(a.uid).localeCompare(String(b.uid))<0);
 return Math.sign(total)*(base+(extra?1:0));
}
function freeGroundTarget(c){return integerCharge(-freeField(c));}
function freeLeafState(c){
 const q=freeCharge(c),field=integerCharge(freeField(c)),leafCharges=c.leafCharges||[0,0],leaf=leafCharges[0]+leafCharges[1],cap=q-leaf;
 return{net:q,field,leaf,leafCharges:[...leafCharges],cap,targetLeaf:clamp(.45*(q+field),-10,10),angle:Math.min(52,20*Math.sqrt(Math.max(0,leafCharges[0]*leafCharges[1])))};
}
function freeSystemCharge(){return bench.objects.reduce((n,o)=>n+objectCharge(o),0)+freeConductors().reduce((n,c)=>n+freeCharge(c),0)+bench.earth+bench.removedCharge+(bench.flight?.reserved?-1:0);}
function syncFreeBench(){const target=freeConductors().find(c=>c.type==='sphere');bench.electrons=target?target.e:12;bench.ground=!!freeGroundOwner();}
function addFreeComponent(id,x,y){
 if(state.mode!=='induction')return null;
 if(id==='earth'){
  if(bench.free.earth){bench.message='桌上已有共用大地，請移動現有元件。';renderFreeBench();return bench.free.earth;}
  bench.free.earth={uid:'earth',x:clamp(x,55,850),y:clamp(y,110,440)};bench.cable={x:clamp(x-60,25,875),y:clamp(y-45,70,475)};bench.selected='earth';renderFreeBench();return bench.free.earth;
 }
 const scope=id==='electroscope',c=scope?{uid:'scope'+bench.next++,type:'scope',x:clamp(x,90,810),y:clamp(y,180,300),e:24,base:24,capacity:.6,r:30,leafCharges:[0,0],internal:null}:{uid:'sphere'+bench.next++,type:'sphere',x:clamp(x,120,780),y:clamp(y,155,315),e:12,base:12,capacity:1,r:110};
 freeConductors().push(c);bench.selected='conductor:'+c.uid;moveFreeConductor(c,c.x,c.y);bench.message='已拖入中性'+(scope?'金箔驗電器':'絕緣支架金屬球')+'，可靠近、接觸或接地。';renderFreeBench();return c;
}
function removeFreeEarth(){
 if(!bench.free.earth)return;if(bench.flight?.reason==='ground')cancelFreeFlight();
 bench.removedCharge+=bench.earth;bench.earth=0;bench.free.earth=null;bench.free.groundId=null;bench.ground=false;if(bench.drag?.type==='free-earth'||bench.drag?.type==='free-clip')bench.drag=null;bench.selected=null;bench.message='大地／接地線已移出，已斷地；移出電荷仍計入守恆帳。';renderFreeBench();
}

function removeFreeConductor(uid){
 const c=freeConductors().find(v=>v.uid===uid);if(!c)return;cancelScopeInternal(c);
 if(bench.flight&&(bench.flight.from===c||bench.flight.to===c||bench.flight.via===c))cancelFreeFlight();
 if(bench.drag?.c===c)bench.drag=null;
 if(bench.free.groundId===uid){bench.free.groundId=null;bench.cable=earthPoint();}
 bench.removedCharge+=freeCharge(c);bench.free.conductors=freeConductors().filter(v=>v!==c);for(const[key,contact]of bench.free.contacts)if(contact.a===c||contact.b===c)bench.free.contacts.delete(key);bench.contact=null;bench.selected=null;
 bench.message='物品已移出，淨電荷隨物品帶走；相關轉移及接地已取消。重置可恢復目標球。';syncFreeBench();renderFreeBench();
}
function placeFreeSource(o,x,y){
 o.x=clamp(x,75,825);o.y=clamp(y,105,390);
 const obstacles=[...freeConductors(),...bench.objects.filter(v=>v.id==='ball'&&v!==o)];
 for(let pass=0;pass<3;pass++)for(const c of obstacles){
  const gap=freeGap(c,o);if(gap>=0)continue;const ox=o.x,oy=o.y;o.x+=.1;const gx=(freeGap(c,o)-gap)/.1;o.x=ox;o.y+=.1;const gy=(freeGap(c,o)-gap)/.1;o.y=oy;const norm=Math.hypot(gx,gy)||1;o.x=clamp(o.x-gx/norm*gap,75,825);o.y=clamp(o.y-gy/norm*gap,105,390);
 } if(o.id==='ball'&&obstacles.some(c=>freeGap(c,o)<-1)){
  const initial={x:o.x,y:o.y},choices=[];for(const c of obstacles){const p=freeCenter(c);for(let j=0;j<32;j++){const angle=j*Math.PI/16,x=p.x+(c.r+65+.5)*Math.cos(angle),y=p.y+(c.r+65+.5)*Math.sin(angle);if(x<75||x>825||y<105||y>390)continue;const saved={x:o.x,y:o.y};o.x=x;o.y=y;if(obstacles.every(other=>freeGap(other,o)>=-1))choices.push({x,y,d:Math.hypot(x-initial.x,y-initial.y)});Object.assign(o,saved);}}
  choices.sort((a,b)=>a.d-b.d);if(choices.length){o.x=choices[0].x;o.y=choices[0].y;}
 }
}
function moveFreeConductor(c,x,y){
 c.x=clamp(x,c.type==='sphere'?120:90,c.type==='sphere'?780:810);c.y=clamp(y,c.type==='sphere'?155:180,c.type==='sphere'?315:300);
 // Solid metal heads cannot pass through other heads or source objects.
 for(let pass=0;pass<3;pass++)for(const o of [...bench.objects,...freeConductors()]){if(o===c)continue;const gap=freeGap(c,o);if(gap>=0)continue;const ox=c.x,oy=c.y;c.x+=.1;const gx=(freeGap(c,o)-gap)/.1;c.x=ox;c.y+=.1;const gy=(freeGap(c,o)-gap)/.1;c.y=oy;const norm=Math.hypot(gx,gy)||1;c.x-=gx/norm*gap;c.y-=gy/norm*gap;}
 c.x=clamp(c.x,c.type==='sphere'?120:90,c.type==='sphere'?780:810);c.y=clamp(c.y,c.type==='sphere'?155:180,c.type==='sphere'?315:300);
 if(bench.flight&&!freeFlightValid(bench.flight))cancelFreeFlight();bench.message='';renderFreeBench();
}
function freePairs(){
 const list=[];for(const c of freeConductors())for(const o of bench.objects)if(freeTouch(c,o))list.push({a:c,b:o});
 const cs=freeConductors();for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)if(freeTouch(cs[i],cs[j]))list.push({a:cs[i],b:cs[j]});
 const balls=bench.objects.filter(o=>o.id==='ball');for(const a of balls)for(const b of bench.objects.filter(o=>o.id!=='ball'))if(freeTouch(a,b))list.push({a,b});for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)if(freeTouch(balls[i],balls[j]))list.push({a:balls[i],b:balls[j]});
 return list;
}
function changeFreeElectrons(owner,delta){if(owner==='earth')bench.earth-=delta;else owner.e+=delta;}
function cancelFreeFlight(){const f=bench.flight;if(!f)return;if(f.reserved)changeFreeElectrons(f.from,1);bench.flight=null;}
function freeStart(from,to,reason,amount,via=null){
 if(bench.flight||amount<1-EPS)return;
 const ownerBefore=via?freeCharge(via):null;
 changeFreeElectrons(from,-1);
 bench.flight={from,to,reason,amount:1,start:performance.now(),duration:500,free:true,reserved:true,transit:-1,via,ownerBefore,id:bench.free.externalNext++};
}
function freeFlightPosition(t){
 const f=bench.flight,p=clamp((t-f.start)/f.duration,0,1);
 if(f.reason==='ground'){const c=f.via,head=freeCenter(c),end=freeTerminal(c),earth=earthPoint(),u=f.from==='earth'?1-p:p;
  if(u<.25)return{x:head.x+(end.x-head.x)*u*4,y:head.y+(end.y-head.y)*u*4};
  const v=(u-.25)/.75;return{x:(1-v)**2*end.x+2*(1-v)*v*(earth.x-90)+v*v*earth.x,y:(1-v)**2*end.y+2*(1-v)*v*(earth.y-15)+v*v*earth.y};
 }
 const a=freeEndpoint(f.from),b=freeEndpoint(f.to);return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
}
function freeFlightValid(f){
 if(f.from!=='earth'&&!bench.objects.includes(f.from)&&!freeConductors().includes(f.from))return false;
 if(f.to!=='earth'&&!bench.objects.includes(f.to)&&!freeConductors().includes(f.to))return false;
 if(f.reason==='ground'){
  if(freeGroundOwner()!==f.via)return false;const delta=freeGroundTarget(f.via)-f.ownerBefore;
  return Math.abs(delta)>EPS&&((delta>0)===(f.from===f.via));
 }
 if(f.reason==='friction')return bench.objects.includes(f.from)&&bench.objects.includes(f.to)&&touchingMaterials(f.from,f.to);
 return freeTouch(f.from,f.to);
}
function freeTick(t){
 if(!bench.free)return;
 if(advanceScopeInternal(t))renderFreeBench();
 const pairs=freePairs(),active=new Set(pairs.map(({a,b})=>a.uid+':'+b.uid));
 for(const key of bench.free.contacts.keys())if(!active.has(key))bench.free.contacts.delete(key);
 if(bench.flight&&!bench.flight.free){ // Material friction starts through the original input path.
  bench.flight.free=true;bench.flight.id=bench.free.externalNext++;
 }
 if(bench.flight){const f=bench.flight;
  if(!freeFlightValid(f)){cancelFreeFlight();renderFreeBench();}
  else if(t-f.start>=f.duration){
   changeFreeElectrons(f.to,1);bench.flight=null;syncFreeBench();renderFreeBench();
  }else if(state.show){const pos=freeFlightPosition(t);$('singleElectron')?.setAttribute('transform',`translate(${pos.x} ${pos.y})`);}
 }
 if(bench.flight)return;
 const ground=freeGroundOwner();if(ground){const delta=freeGroundTarget(ground)-freeCharge(ground);
  if(Math.abs(delta)>EPS){freeStart(delta>0?ground:'earth',delta>0?'earth':ground,'ground',Math.abs(delta),ground);renderFreeBench();return;}
 }
 bench.contact=null;
 for(const {a,b}of pairs){
  const key=a.uid+':'+b.uid;let contact=bench.free.contacts.get(key);
  if(!contact){
   const qa=freeCharge(a),qb=freeOwnerCharge(b),conductor=b.base!==undefined||b.id==='ball';
   const target=conductor?integerContactTarget(a,b):qa+Math.sign(qb)*Math.min(Math.abs(qb),Math.max(1,integerCharge(Math.abs(qb)/4)));
   contact={a,b,target,settled:false};bench.free.contacts.set(key,contact);
  }
  bench.contact=contact;
  if(b.base!==undefined||b.id==='ball')contact.target=integerContactTarget(a,b);
  const delta=freeCharge(a)-contact.target;
  if(Math.abs(delta)>EPS){freeStart(delta>0?b:a,delta>0?a:b,'contact',Math.abs(delta));renderFreeBench();return;}
  contact.settled=true;
 }
}
function freePointerDown(e){
 if(e.target.closest('[data-earth-remove]')){e.preventDefault();removeFreeEarth();return true;}
 if(e.target.closest('[data-free-earth]')){e.preventDefault();const p=point(e,svgBench),earth=bench.free.earth;bench.selected='earth';bench.drag={type:'free-earth',dx:earth.x-p.x,dy:earth.y-p.y};svgBench.setPointerCapture(e.pointerId);renderFreeBench();return true;}
 const removal=e.target.closest('[data-conductor-remove]');if(removal){e.preventDefault();removeFreeConductor(removal.dataset.conductorRemove);return true;}
 const node=e.target.closest('[data-conductor]'),clip=e.target.closest('[data-clip]');if(!node&&!clip)return false;
 e.preventDefault();const p=point(e,svgBench);
 if(clip){bench.free.groundId=null;bench.ground=false;if(bench.flight?.reason==='ground')cancelFreeFlight();bench.drag={type:'free-clip'};bench.cable={x:p.x,y:p.y};}
 else{const c=freeConductors().find(v=>v.uid===node.dataset.conductor);if(!c)return true;bench.selected='conductor:'+c.uid;bench.drag={type:'conductor',c,dx:c.x-p.x,dy:c.y-p.y};}
 svgBench.setPointerCapture(e.pointerId);renderFreeBench();return true;
}
function endFreeDrag(){
 if(bench.drag?.type==='free-clip'){
  const c=electricalConductors().find(c=>{const p=freeTerminal(c);return Math.hypot(p.x-bench.cable.x,p.y-bench.cable.y)<44;});
  bench.free.groundId=c?.uid||null;if(c)bench.cable=freeTerminal(c);
 }
 bench.drag=null;syncFreeBench();renderFreeBench();
}
function freeKeyDown(e){
 if(e.target.closest('[data-earth-remove]')&&['Enter',' '].includes(e.key)){e.preventDefault();removeFreeEarth();return true;}
 const earthNode=e.target.closest('[data-free-earth]');if(earthNode&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const earth=bench.free.earth,dx=e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0,dy=e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0;earth.x=clamp(earth.x+dx,55,850);earth.y=clamp(earth.y+dy,110,440);if(!freeGroundOwner()){bench.cable.x+=dx;bench.cable.y+=dy;}renderFreeBench();return true;}
 const remove=e.target.closest('[data-conductor-remove]');if(remove&&['Enter',' '].includes(e.key)){e.preventDefault();removeFreeConductor(remove.dataset.conductorRemove);return true;}
 const g=e.target.closest('[data-conductor]');if(!g||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return false;
 e.preventDefault();const c=freeConductors().find(c=>c.uid===g.dataset.conductor);if(!c)return true;bench.selected='conductor:'+c.uid;
 moveFreeConductor(c,c.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),c.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0));svgBench.querySelector(`[data-conductor="${c.uid}"]`)?.focus();return true;
}
function freeRemoveHandle(g,c,x,y){
 const r=el('g',{'data-conductor-remove':c.uid,transform:`translate(${x} ${y})`,tabindex:0,role:'button','aria-label':'刪除'+(c.type==='scope'?'金箔驗電器':'目標金屬球'),class:'removeObject'});
 r.append(el('circle',{r:30,fill:'transparent','pointer-events':'all'}),el('circle',{r:15,fill:'#fffdf6',stroke:'#966c5a','stroke-width':2}),el('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'central','font-size':24,fill:'#8e4537'},'×'));g.append(r);
}
function weightedElectrons(g,n,slots,region,owner){
 for(let i=0;i<Math.ceil(Math.max(0,n)/2);i++){const s=slots[i%slots.length],level=Math.floor(i/slots.length),weight=Math.min(2,n-i*2);const m=chargeText(g,s.x+level*8,s.y+level*4,false,{'data-conductor-electron':owner,'data-region':region,'data-charge-weight':weight,opacity:weight/2});m.querySelector('circle').setAttribute('r',5.5);m.querySelector('text').style.fontSize='10px';}
}
function freeRegionElectrons(g,n,slots,region,uid,neutral){
 if(n<EPS)return;for(const p of slots){const mark=chargeText(g,p.x,p.y,false,{'data-conductor-electron':uid,'data-region':region,'data-charge-weight':n/slots.length,opacity:clamp(n/neutral,0,1)});mark.querySelector('circle').setAttribute('r',5.5);mark.querySelector('text').style.fontSize='10px';}
}
function drawFreeScope(c){
 const f=freeLeafState(c),g=el('g',{'data-conductor':c.uid,'data-electroscope':c.uid,'data-net-charge':f.net,'data-leaf-charge':f.leaf,'data-leaf-angle':f.angle,transform:`translate(${c.x} ${c.y})`,tabindex:0,role:'button','aria-label':'金箔驗電器，'+chargeLabel(f.net)+'，拖曳或方向鍵移動',class:'benchObject'});
 g.append(el('rect',{x:-83,y:-40,width:166,height:180,rx:22,fill:'#fafdff99',stroke:'#8aabad','stroke-width':3,'data-glass-case':true}),el('rect',{x:-34,y:-50,width:68,height:25,rx:7,fill:'#b79072',stroke:'#896b56','data-insulator':true}),el('path',{d:'M0 -74V21',stroke:'#64827e','stroke-width':10,'data-metal-stem':true}),el('ellipse',{cx:0,cy:-85,rx:30,ry:30,fill:'#c8d9d7',stroke:'#638783','stroke-width':3,'data-metal-cap':true}),el('path',{d:'M-90 145H90',stroke:'#7b908c','stroke-width':12}));
 if(state.show){
  const slots=[-20,0,20].map(x=>({x,y:-94}));
  slots.forEach(p=>{const m=chargeText(g,p.x,p.y,true,{'data-conductor-ion':c.uid,'data-region':'cap','data-charge-weight':4});m.querySelector('circle').setAttribute('r',6);m.querySelector('text').style.fontSize='10px';});
  freeRegionElectrons(g,12-f.cap,slots.map(p=>({x:p.x,y:-76})),'cap',c.uid,12);

 }
 for(const side of [-1,1]){
  const leaf=el('g',{transform:`translate(0 20) rotate(${-side*f.angle})`,'data-gold-leaf':side,'data-charge':f.leafCharges[side===-1?0:1]});leaf.append(el('path',{d:`M${side*3} 0L${side*3} 102`,stroke:'#bd8e20','stroke-width':7,'stroke-linecap':'round'}));
  if(state.show){const slots=[{x:side*3,y:26},{x:side*3,y:54},{x:side*3,y:82}];slots.forEach((p,i)=>{const m=chargeText(leaf,p.x-7,p.y,true,{'data-conductor-ion':c.uid,'data-region':'leaf'+side,'data-charge-weight':2});m.querySelector('circle').setAttribute('r',5.5);m.querySelector('text').style.fontSize='10px';});freeRegionElectrons(leaf,6-f.leafCharges[side===-1?0:1],slots.map(p=>({x:p.x+7,y:p.y+8})),'leaf'+side,c.uid,6);}
  g.append(leaf);
 }
 g.append(el('text',{x:0,y:-129,'text-anchor':'middle','font-size':16,fill:Math.abs(f.cap)<EPS?'#355d59':f.cap>0?'#b1342d':'#176bb5','data-cap-charge':f.cap},'金屬帽：'+(Math.abs(f.cap)<EPS?'中性':f.cap>0?'正電':'負電')),el('text',{x:0,y:175,class:'benchLabel','font-size':17},'金箔驗電器 · '+chargeLabel(f.net)),el('text',{x:0,y:196,'text-anchor':'middle','font-size':15,fill:'#355d59'},f.angle>.01?'兩葉同號張開':'兩葉閉合'));
 freeRemoveHandle(g,c,92,-55);return g;
}
function drawFreeSphere(c){
 const g=el('g',{'data-conductor':c.uid,'data-target-sphere':true,'data-net-charge':freeCharge(c),transform:`translate(${c.x} ${c.y})`,tabindex:0,role:'button','aria-label':'導電金屬球（絕緣支架），可移動，'+chargeLabel(freeCharge(c)),class:'benchObject'});
 g.append(el('rect',{x:-16,y:c.r-3,width:32,height:55,fill:'#bac8bf'}),el('circle',{r:c.r,fill:'#dae7e5',stroke:'#638783','stroke-width':3}));
 if(state.show){ionSlots.forEach((pos,i)=>chargeText(g,pos.x,pos.y,true,{'data-sphere-ion':i,'data-metal-ion':'sphere:'+c.uid,'data-conductor-ion':c.uid,'data-charge-weight':1}));
  drawMetalElectronCloud(g,c);
 }
 g.append(el('text',{x:0,y:-c.r-28,class:'benchLabel','data-target-charge':freeCharge(c)},'金屬球 · '+chargeLabel(freeCharge(c))));g.append(el('text',{x:0,y:c.r+77,'text-anchor':'middle','font-size':16,fill:'#54706c'},'絕緣支架'));freeRemoveHandle(g,c,c.r+10,-c.r+10);return g;
}
function renderFreeBench(){
 if(state.mode!=='induction'||!bench.free)return;syncFreeBench();const svg=$('exploreSvg'),focus=document.activeElement?.dataset.conductor,internalNodes=new Map([...svg.querySelectorAll('[data-internal-electron]')].map(e=>[e.dataset.internalFlight,e])),externalNode=svg.querySelector('#singleElectron');svg.setAttribute('viewBox','0 0 900 540');svg.replaceChildren();
 svg.append(el('rect',{x:8,y:45,width:884,height:475,rx:22,fill:'#f0f4ea',stroke:'#cbd9ca','stroke-dasharray':'7 7'}));
 $('sceneTitle').textContent='自由操作起電';$('exploreHint').textContent='從材料架拖入物品，接觸並來回摩擦；先拖入大地／接地線，才可用綠夾接地';
 for(const c of freeConductors())svg.append(c.type==='scope'?drawFreeScope(c):drawFreeSphere(c));
 const earth=earthPoint(),owner=freeGroundOwner(),end=owner?freeTerminal(owner):bench.cable;
 if(bench.free.earth){svg.append(el('path',{d:`M${earth.x} ${earth.y}Q${earth.x-90} ${earth.y-15} ${end.x} ${end.y}`,stroke:'#368069','stroke-width':6,fill:'none','data-earth-cable':true}));
 const eg=el('g',{'data-free-earth':true,transform:`translate(${earth.x} ${earth.y})`,tabindex:0,role:'button','aria-label':'大地與接地線，可拖動或刪除',class:'benchObject'});eg.append(el('rect',{x:-40,y:-15,width:80,height:77,rx:12,fill:'#e3eee1',stroke:'#73a08b','stroke-width':2}),el('path',{d:'M0 0v17m-22 0h44m-16 9h24m-18 9h12',stroke:'#368069','stroke-width':4,fill:'none'}),el('text',{x:0,y:58,'text-anchor':'middle','font-size':16,fill:'#355d59'},'大地'));
 const del=el('g',{'data-earth-remove':true,transform:'translate(43 -18)',tabindex:0,role:'button','aria-label':'刪除大地／接地線'});del.append(el('circle',{r:25,fill:'transparent','pointer-events':'all'}),el('circle',{r:13,fill:'#fffdf6',stroke:'#966c5a'}),el('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'central','font-size':22,fill:'#8e4537'},'×'));eg.append(del);svg.append(eg);}

 for(const o of bench.objects)svg.append(drawObject(o));
 if(bench.free.earth)for(const c of electricalConductors()){const t=freeTerminal(c);svg.append(el('circle',{cx:t.x,cy:t.y,r:13,fill:'#fff',stroke:'#368069','stroke-width':3,'data-terminal':c.uid}));}
 if(bench.free.earth){const clip=el('g',{'data-clip':true,transform:`translate(${end.x} ${end.y})`,tabindex:0,role:'button','aria-label':'拖綠夾到接點接地，拖開斷地',class:'groundClip'});clip.append(el('circle',{r:30,fill:'transparent','pointer-events':'all'}),el('circle',{r:21,fill:'#e1f2dd',stroke:'#368069','stroke-width':3}),el('path',{d:'M-9 -10L9 10M9 -10L-9 10',stroke:'#368069','stroke-width':4}));svg.append(clip);}
 if(state.show)for(const c of freeConductors()){if(c.internal){const f=c.internal,pos=scopeInternalPosition(c),g=internalNodes.get(String(f.id))||makeInternalElectron(c);g.setAttribute('transform',`translate(${pos.x} ${pos.y})`);g.dataset.progress=String(f.progress);g.dataset.internalDirection=f.dir*(f.returning?-1:1)>0?'leaf-to-cap':'cap-to-leaf';svg.append(g);}}
 if(bench.flight&&state.show){const p=freeFlightPosition(performance.now()),id=String(bench.flight.id),g=externalNode?.dataset.externalFlight===id?externalNode:el('g',{id:'singleElectron','data-external-flight':id});if(!g.childNodes.length){chargeText(g,0,0,false);g.append(el('text',{x:0,y:-20,'font-size':14,fill:'#176bb5'},Number(bench.flight.amount.toFixed(4))+' 格'));}g.setAttribute('transform',`translate(${p.x} ${p.y})`);svg.append(g);}
 if(focus)svg.querySelector(`[data-conductor="${focus}"]`)?.focus({preventScroll:true});
 const selected=String(bench.selected||'');$('removeSelected').disabled=!(bench.objects.some(o=>o.uid===bench.selected)||freeConductors().some(c=>'conductor:'+c.uid===selected)||(selected==='earth'&&!!bench.free.earth));
 $('benchRead').textContent=[...bench.objects.map(o=>kind(o.id).name+'：'+chargeLabel(objectCharge(o))+(owner===o?'（接地中）':'')),...freeConductors().map(c=>(c.type==='scope'?'驗電器':'金屬球（絕緣支架）')+'：'+chargeLabel(freeCharge(c))+(owner===c?'（接地中）':'')),bench.free.earth?'大地：'+chargeLabel(bench.earth):'尚未加入大地','守恆核對：'+Number((freeSystemCharge()-bench.importedCharge).toFixed(6))+' 格'].join('\n');
 $('status').textContent=!bench.objects.length&&!freeConductors().length&&!bench.free.earth?'桌面是空的，從右側拖入材料、導體或大地開始。':bench.flight?'電子沿實際接觸或接地路徑逐格轉移；分開即取消未完成轉移。':freeConductors().some(c=>c.internal)?'帽、導桿與金箔間的電子正逐格重分布；張角跟隨目前兩葉電荷。':owner?'接地中：先斷地再移開來源可留下異號電；先移開則電子回流。':bench.message||'靠近先觀察感應；接觸才轉移。金箔張開不一定代表驗電器有淨電荷。';
}
Object.assign(window.directBench,{freeCharge,freeField,freeLeafState,freeSystemCharge,freeCenter,freeTerminal});


// Each scope has two independent leaf charges. Net charge changes only via external
// contact/ground; internal motion redistributes cap <-> one leaf without changing net.
function scopeInternalGoal(c){return freeLeafState(c).targetLeaf/2;}
function advanceScopeInternal(t){
 let changed=false;
 for(const c of freeConductors()){
  if(c.type!=='scope')continue;c.leafCharges??=[0,0];
  const goal=scopeInternalGoal(c);let f=c.internal;
  if(f){const delta=goal-c.leafCharges[f.side];
   if(Math.abs(delta)<EPS||Math.sign(delta)!==f.dir){c.internal=null;f=null;changed=true;}
   else{
    const progress=clamp((t-f.start)/420,0,1),increment=Math.min(f.amount*(progress-f.progress),Math.abs(delta));
    c.leafCharges[f.side]+=f.dir*Math.max(0,increment);f.progress=progress;changed=true;
    if(progress>=1||Math.abs(goal-c.leafCharges[f.side])<EPS){if(Math.abs(goal-c.leafCharges[f.side])<EPS)c.leafCharges[f.side]=goal;c.internal=null;f=null;}
   }
  }
  if(!f){
   const deltas=c.leafCharges.map(q=>goal-q),side=Math.abs(deltas[0])>=Math.abs(deltas[1])?0:1,delta=deltas[side];
   if(Math.abs(delta)>EPS){c.internal={id:bench.free.internalNext++,side,dir:Math.sign(delta),amount:Math.min(.5,Math.abs(delta)),start:t,progress:0};changed=true;}
  }
 }
 return changed;
}
function cancelScopeInternal(c){c.internal=null;}

function scopeInternalPosition(c){
 const f=c.internal;if(!f)return null;const angle=freeLeafState(c).angle*Math.PI/180,side=f.side===0?-1:1;
 const leaf={x:side*(3*Math.cos(angle)+75*Math.sin(angle)),y:20+75*Math.cos(angle)-3*Math.sin(angle)},points=[{x:0,y:-85},{x:0,y:-25},{x:0,y:20},leaf];
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let distance=(f.dir>0?1-f.progress:f.progress)*total;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const u=clamp(distance/lengths[i],0,1);return{x:c.x+points[i].x+(points[i+1].x-points[i].x)*u,y:c.y+points[i].y+(points[i+1].y-points[i].y)*u};}distance-=lengths[i];}
}
function makeInternalElectron(c){
 const f=c.internal,g=el('g',{'data-internal-electron':c.uid,'data-internal-flight':f.id,'data-internal-direction':f.dir>0?'leaf-to-cap':'cap-to-leaf','data-side':f.side,'pointer-events':'none'});
 g.append(el('circle',{r:10,fill:'#146cbd',stroke:'#fff','stroke-width':2}),el('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'central','font-size':17,fill:'#fff'},'−'),el('text',{x:14,y:-12,'font-size':12,fill:'#14538b'},'電子'));return g;
}
Object.assign(window.directBench,{scopeInternalGoal,scopeInternalPosition,freeGroundTarget,integerContactTarget});


// First-order, qualitative polarization of all spherical conductors. Net charge
// and fixed positive ions are independent of this position-only visualization.
function metalVisualizationNodes(){
 const nodes=bench.objects.filter(o=>o.id==='ball').map(o=>({key:'ball:'+o.uid,owner:o,x:o.x,y:o.y,r:65*scaleBench(),q:objectCharge(o),e:o.e-(bench.flight?.from===o&&!bench.flight.reserved?(bench.flight.amount||1):0),ions:Array.from({length:6},(_,i)=>({x:45/65*Math.cos(i*Math.PI/3),y:45/65*Math.sin(i*Math.PI/3)}))}));
 if(state.mode==='induction')for(const c of freeConductors().filter(c=>c.type==='sphere'))nodes.push({key:'sphere:'+c.uid,owner:c,x:c.x,y:c.y,r:c.r,q:freeCharge(c),e:c.e,ions:ionSlots.map(p=>({x:p.x/c.r,y:p.y/c.r}))});
 if(state.mode==='quiz'){const s=sphere();nodes.push({key:'quiz-target',owner:'quiz-target',x:s.x,y:s.y,r:s.r,q:12-bench.electrons,e:bench.electrons-(bench.flight?.from==='sphere'?(bench.flight.amount||1):0),ions:ionSlots.map(p=>({x:p.x/105,y:p.y/100}))});}
 return nodes;
}
function metalVisualizationSources(){
 const sources=bench.objects.filter(o=>o.id!=='ball').map(o=>({x:o.x,y:o.y,r:halfSize(o),q:objectCharge(o)}));
 if(state.mode==='induction')for(const c of freeConductors().filter(c=>c.type==='scope')){const f=freeLeafState(c),a=f.angle*Math.PI/180;sources.push({x:c.x,y:c.y-85,r:30,q:f.cap});for(const side of [-1,1])sources.push({x:c.x+side*(3*Math.cos(a)+60*Math.sin(a)),y:c.y+20+60*Math.cos(a)-3*Math.sin(a),r:10,q:f.leafCharges[side<0?0:1]});}
 return sources;
}
function metalPolarization(){
 const nodes=metalVisualizationNodes(),sources=metalVisualizationSources(),base=nodes.map(n=>{
  let x=0,y=0;for(const other of [...nodes,...sources]){if(other===n||!other.q)continue;const dx=other.x-n.x,dy=other.y-n.y,d=Math.hypot(dx,dy);if(d<1)continue;const gap=d-n.r-other.r,envelope=clamp((220-gap)/150,0,1),strength=other.q/6*Math.min(2,((n.r+other.r+80)/d)**2)*envelope;x+=strength*dx/d;y+=strength*dy/d;}
  return{x,y};
 });
 let vectors=base.map(v=>({...v}));
 // Weak induced-dipole feedback makes a neutral conductor affect its charged
 // neighbour too. Damping and a bounded response avoid runaway visual feedback.
 for(let step=0;step<6;step++)vectors=nodes.map((n,i)=>{
  let x=base[i].x,y=base[i].y;nodes.forEach((o,j)=>{if(i===j)return;const dx=n.x-o.x,dy=n.y-o.y,d=Math.hypot(dx,dy);if(d<1)return;const gap=d-n.r-o.r,k=.12*((n.r+o.r)/Math.max(d,n.r+o.r))**3*clamp((220-gap)/150,0,1),ux=dx/d,uy=dy/d,dot=vectors[j].x*ux+vectors[j].y*uy;x+=k*(3*dot*ux-vectors[j].x);y+=k*(3*dot*uy-vectors[j].y);});
  const norm=Math.hypot(x,y);if(norm>1){x/=norm;y/=norm;}return{x:.7*x+.3*vectors[i].x,y:.7*y+.3*vectors[i].y};
 });
 return nodes.map((node,i)=>{const v=vectors[i],norm=Math.hypot(v.x,v.y);return{node,vector:norm<1e-5?{x:0,y:0}:v,strength:norm<1e-5?0:1-Math.exp(-5*norm)};});
}
function metalCandidateSites(node){
 const small=node.r<80,step=(small?12:13)/node.r,limit=1-12/node.r,points=[];for(let y=-Math.floor(limit/step);y<=Math.floor(limit/step);y++)for(let x=-Math.floor(limit/step);x<=Math.floor(limit/step);x++){const p={x:x*step,y:y*step};if(Math.hypot(p.x,p.y)>limit)continue;if(node.ions.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<15/node.r))continue;points.push(p);}return points;
}
function metalUniformSites(node,count,candidates){
 const out=[],used=[],cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols),raw=Array.from({length:count},(_,i)=>({x:i%cols-(cols-1)/2,y:Math.floor(i/cols)-(rows-1)/2})),mean={x:raw.reduce((v,p)=>v+p.x,0)/count,y:raw.reduce((v,p)=>v+p.y,0)/count};
 const max=Math.max(1,...raw.map(p=>Math.hypot(p.x-mean.x,p.y-mean.y))),min=12/node.r;
 if(count%2){out.push({x:0,y:0});used.push({x:0,y:0});}
 for(let i=0;i<Math.floor(count/2);i++){
  const a=raw[i],b=raw[count-1-i],ideal={x:(a.x-b.x)/2/max*1.15,y:(a.y-b.y)/2/max*1.15};
  const options=candidates.filter(p=>Math.hypot(p.x,p.y)*2>=min&&used.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>=min&&Math.hypot(-p.x-o.x,-p.y-o.y)>=min));
  options.sort((a,b)=>(a.x-ideal.x)**2+(a.y-ideal.y)**2-((b.x-ideal.x)**2+(b.y-ideal.y)**2));const p=options[0]||{x:ideal.x,y:ideal.y};out.push({...p},{x:-p.x,y:-p.y});used.push({...p},{x:-p.x,y:-p.y});
 }
 return out;
}
function metalMarkerWeights(node){
 const n=Math.round(node.e),small=node.r<80,center=small?(n%2?1:n%4===2?2:0):n%2,weights=center?[center]:[];let remaining=n-center;
 if(small&&remaining%4===2){weights.push(1,1);remaining-=2;}
 const pairWeight=small?2:1;while(remaining>0){weights.push(pairWeight,pairWeight);remaining-=2*pairWeight;}return weights;
}
function metalElectronDistribution(owner){
 const fields=metalPolarization(),field=fields.find(f=>f.node.owner===owner||f.node.key===owner);if(!field)return{node:null,positions:[],centroid:{x:0,y:0},vector:{x:0,y:0},strength:0};
 const {node,vector,strength}=field,weights=metalMarkerWeights(node),count=weights.length,candidates=metalCandidateSites(node),uniform=metalUniformSites(node,count,candidates),norm=Math.hypot(vector.x,vector.y),u=norm?{x:vector.x/norm,y:vector.y/norm}:{x:1,y:0},v={x:-u.y,y:u.x},used=[];
 const normalized=strength===0?uniform:uniform.map(p=>{const along=p.x*u.x+p.y*u.y,across=p.x*v.x+p.y*v.y,ideal={x:u.x*(along*(1-.72*strength)+.62*strength)+v.x*across*(1-.3*strength),y:u.y*(along*(1-.72*strength)+.62*strength)+v.y*across*(1-.3*strength)};const choices=candidates.filter(p=>used.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>=12/node.r));choices.sort((a,b)=>(a.x-ideal.x)**2+(a.y-ideal.y)**2-((b.x-ideal.x)**2+(b.y-ideal.y)**2));const point=choices[0]||p;used.push(point);return point;});
 const positions=normalized.map((p,i)=>({x:p.x*node.r,y:p.y*node.r,weight:weights[i]})),centroid={x:positions.reduce((n,p)=>n+p.x*p.weight,0)/Math.max(1,node.e),y:positions.reduce((n,p)=>n+p.y*p.weight,0)/Math.max(1,node.e)};
 return{node,positions,centroid,vector,strength,uniform:strength===0};
}
function drawMetalElectronCloud(g,owner){
 const d=metalElectronDistribution(owner);if(!d.node)return;const cloud=el('g',{'data-metal-cloud':d.node.key,'data-represented-electrons':d.node.e,'data-field-x':d.vector.x,'data-field-y':d.vector.y,'data-polarization':d.strength,'data-electron-centroid-x':d.centroid.x,'data-electron-centroid-y':d.centroid.y});
 d.positions.forEach((p,i)=>{const m=chargeText(cloud,p.x,p.y,false,{'data-metal-electron':d.node.key,'data-electron-index':i,'data-charge-weight':p.weight,opacity:d.node.r<80?p.weight/2:1});m.querySelector('circle').setAttribute('r',5.5);m.querySelector('text').style.fontSize='10px';});g.append(cloud);
}
Object.assign(window.directBench,{metalVisualizationNodes,metalPolarization,metalElectronDistribution,electricalConductors});
