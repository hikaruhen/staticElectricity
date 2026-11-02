'use strict';
// Navigation and Coulomb comparisons. The direct bench owns its physical state.
const lab={baseline:{r:2,q1:2,q2:-2}};
const baseSwitch=switchMode,baseReset=reset,baseCoulomb=renderCoulomb;
switchMode=function(mode){
 baseSwitch(mode);
 const extra=['materials','induction','quiz'].includes(mode);
 for(const name of ['static','coulomb']){$(name+'Scene').hidden=mode!==name;$(name+'Controls').hidden=mode!==name;}
 $('exploreScene').hidden=!extra;$('exploreControls').hidden=!extra;
 $('charges').parentElement.hidden=mode==='coulomb';
 for(const name of ['static','materials','induction','coulomb','quiz']){const tab=$(name+'Tab');tab.classList.toggle('active',mode===name);tab.setAttribute('aria-selected',mode===name);}
};
reset=function(){baseReset();if(state.mode==='coulomb'){lab.baseline={r:2,q1:2,q2:-2};renderCoulomb();}};
renderCoulomb=function(){
 baseCoulomb();const b=lab.baseline,base=force(b.q1,b.q2,b.r),now=force(state.q1,state.q2,state.r),max=Math.max(base,now,1e-12);
 const distance=state.r/b.r,distanceEffect=1/(distance*distance),product=Math.abs(state.q1*state.q2),baseProduct=Math.abs(b.q1*b.q2),productEffect=baseProduct?product/baseProduct:null,ratio=base?now/base:null;
 const fmt=n=>n.toFixed(3),distanceText=`距離 ${distance.toFixed(2)} 倍 → 力 ${fmt(distanceEffect)} 倍`,productText=productEffect===null?'電荷乘積基準為 0：無倍率':`電荷乘積大小 ${productEffect.toFixed(2)} 倍 → 力 ${fmt(productEffect)} 倍`,combined=ratio===null?'基準力為 0，請重新取非零基準':`兩項合併 → 力 ${fmt(ratio)} 倍`;
 $('baseBar').style.width=100*base/max+'%';$('nowBar').style.width=100*now/max+'%';
 $('ratioRead').textContent=distanceText+'（電量固定）\n'+productText+'（距離固定）\n'+combined;
 $('canvasCompare')?.remove();const g=el('g',{id:'canvasCompare'}),mobile=innerWidth<=720,size=mobile?23:30;
 for(const[id,text,y]of [['distanceEffect',distanceText,35],['productEffect',productText,74],['combinedEffect',combined,110]])g.append(el('text',{id,x:22,y,'font-size':id==='combinedEffect'?size-5:size,'font-weight':id==='combinedEffect'?500:700,fill:'#355d59'},text));
 const relation=state.q1*state.q2===0?'無作用力':state.q1*state.q2<0?'異號相吸':'同號相斥';
 g.append(el('text',{id:'canvasRelation',x:mobile?225:450,y:475,'text-anchor':'middle','font-size':mobile?26:32,'font-weight':700,fill:state.q1*state.q2===0?'#65796f':'#b1342d'},relation));
 $('coulombSvg').append(g);
};
for(const [i,name] of ['static','materials','induction','coulomb','quiz'].entries()){const tab=$(name+'Tab');tab.firstChild.textContent='0'+(i+1)+' ';document.querySelector('nav').append(tab);tab.onclick=()=>switchMode(name);}
$('setBaseline').onclick=()=>{lab.baseline={r:state.r,q1:state.q1,q2:state.q2};renderCoulomb();};
$('reset').onclick=()=>reset();
$('arrow').setAttribute('markerUnits','userSpaceOnUse');$('arrow').setAttribute('markerWidth',10);$('arrow').setAttribute('markerHeight',10);
