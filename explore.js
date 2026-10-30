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
 baseCoulomb();const b=lab.baseline,base=force(b.q1,b.q2,b.r),now=force(state.q1,state.q2,state.r),max=Math.max(base,now,1e-12),ratio=base?now/base:0;
 $('baseBar').style.width=100*base/max+'%';$('nowBar').style.width=100*now/max+'%';
 $('ratioRead').textContent=base?`距離：${(state.r/b.r).toFixed(2)} 倍｜電力：${ratio.toFixed(3)} 倍${Math.abs(ratio-.25)<.0001?'（¼）':''}${Math.abs(ratio-4)<.0001?'（4 倍）':''}`:'基準力為零，請設定非零電量後重新取基準。';
 $('canvasCompare')?.remove();const g=el('g',{id:'canvasCompare'});
 g.append(el('text',{x:22,y:28,'font-size':16,fill:'#355d59'},base?`距離 ${(state.r/b.r).toFixed(2)} 倍 → 力 ${(now/base).toFixed(3)} 倍`:'基準力為零：請重新設定基準'));
 for(const [i,value] of [base,now].entries()){g.append(el('text',{x:22,y:54+i*25,'font-size':14,fill:'#355d59'},i?'現在':'基準'),el('rect',{x:66,y:42+i*25,width:250*value/max,height:15,rx:3,fill:i?'#dd9362':'#7faca5'}));}
 $('coulombSvg').append(g);
};
for(const [i,name] of ['static','materials','induction','coulomb','quiz'].entries()){const tab=$(name+'Tab');tab.firstChild.textContent='0'+(i+1)+' ';document.querySelector('nav').append(tab);tab.onclick=()=>switchMode(name);}
$('setBaseline').onclick=()=>{lab.baseline={r:state.r,q1:state.q1,q2:state.q2};renderCoulomb();};
$('reset').onclick=()=>reset();
$('arrow').setAttribute('markerUnits','userSpaceOnUse');$('arrow').setAttribute('markerWidth',10);$('arrow').setAttribute('markerHeight',10);
