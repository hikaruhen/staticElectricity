'use strict';
// Navigation and Coulomb comparisons. The direct bench owns its physical state.
const lab={baseline:{r:2,q1:2,q2:-2}};
const baseSwitch=switchMode,baseReset=reset,baseCoulomb=renderCoulomb;
switchMode=function(mode){
 baseSwitch(mode);
 const extra=['materials','induction','quiz'].includes(mode);
 for(const name of ['static','coulomb']){$(name+'Scene').hidden=mode!==name;$(name+'Controls').hidden=mode!==name;}
 $('exploreScene').hidden=!extra;$('exploreControls').hidden=!extra;
 $('charges').parentElement.hidden=mode==='coulomb';$('calculateForce').hidden=mode!=='coulomb';
 for(const name of ['static','materials','induction','coulomb','quiz']){const tab=$(name+'Tab');tab.classList.toggle('active',mode===name);tab.setAttribute('aria-selected',mode===name);}
};
reset=function(){baseReset();if(state.mode==='coulomb'){lab.baseline={r:2,q1:2,q2:-2};renderCoulomb();}};
renderCoulomb=function(){
 baseCoulomb();const reveal=state.forceAnswerKey===coulombAnswerKey();const b=lab.baseline,base=force(b.q1,b.q2,b.r),now=force(state.q1,state.q2,state.r),max=Math.max(base,now,1e-12);
 const distance=state.r/b.r,distanceEffect=1/(distance*distance),product=Math.abs(state.q1*state.q2),baseProduct=Math.abs(b.q1*b.q2),productEffect=baseProduct?product/baseProduct:null,ratio=base?now/base:null;
 const fmt=n=>n.toFixed(3),distanceText=`距離 ${distance.toFixed(2)} 倍 → 力 ${fmt(distanceEffect)} 倍`,productText=productEffect===null?'電荷乘積基準為 0：無倍率':`電荷乘積大小 ${productEffect.toFixed(2)} 倍 → 力 ${fmt(productEffect)} 倍`,combined=ratio===null?'基準力為 0：請重取非零基準':`兩項合併 → 力 ${fmt(ratio)} 倍`;
 $('baseBar').style.width=100*base/max+'%';$('nowBar').style.width=100*now/max+'%';
 const appendForceText=(parent,text,svg=false)=>{
  const match=text.match(/力 [0-9.]+ 倍/);
  if(!match){parent.append(document.createTextNode(text));return;}
  if(!reveal){parent.append(document.createTextNode(text.slice(0,match.index)+'？'));return;}
  parent.append(document.createTextNode(text.slice(0,match.index)));
  const result=svg?el('tspan',{fill:'#b1342d','data-force-ratio':true},match[0]):document.createElement('span');
  if(!svg){result.className='forceRatio';result.textContent=match[0];}
  parent.append(result,document.createTextNode(text.slice(match.index+match[0].length)));
 };
 $('ratioRead').replaceChildren();
 for(const text of [distanceText+'（電量固定）',productText+'（距離固定）',combined]){const line=document.createElement('span');line.className='ratioLine';appendForceText(line,text);$('ratioRead').append(line);}

 $('canvasCompare')?.remove();const g=el('g',{id:'canvasCompare'}),mobile=innerWidth<=720,size=mobile?23:30;
 for(const[id,text,y]of [['distanceEffect',distanceText,36],['productEffect',productText,80],['combinedEffect',combined,124]]){const line=el('text',{id,x:22,y,'font-size':size,'font-weight':700,fill:'#355d59'});appendForceText(line,text,true);g.append(line);}
 const relation=state.q1*state.q2===0?'無作用力':state.q1*state.q2<0?'異號相吸':'同號相斥';
 g.append(el('text',{id:'canvasRelation',x:mobile?225:450,y:475,'text-anchor':'middle','font-size':mobile?26:32,'font-weight':700,fill:state.q1*state.q2===0?'#65796f':'#b1342d'},reveal?relation:''));
 $('coulombSvg').append(g);
};
for(const [i,name] of ['static','materials','induction','coulomb','quiz'].entries()){const tab=$(name+'Tab');tab.firstChild.textContent='0'+(i+1)+' ';document.querySelector('nav').append(tab);tab.onclick=()=>switchMode(name);}
$('setBaseline').onclick=()=>{state.forceAnswerKey=null;lab.baseline={r:state.r,q1:state.q1,q2:state.q2};renderCoulomb();};
$('reset').onclick=()=>reset();
$('arrow').setAttribute('markerUnits','userSpaceOnUse');$('arrow').setAttribute('markerWidth',10);$('arrow').setAttribute('markerHeight',10);
