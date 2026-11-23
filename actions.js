/* Economic Empire VI: one authoritative game economy and mission controller. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = n => '$' + n.toLocaleString('en-US');
  const missions = [
    {name:'THE STARTUP',category:'OPPORTUNITY COST',description:'You can open only one business.',question:'A cafe would earn $8,000 and a store would earn $6,000. You choose the cafe. What is the opportunity cost?',options:['$8,000','$6,000','$14,000','$2,000'],correct:1,why:'The opportunity cost is the next-best alternative you give up: the $6,000 store.',reward:2000},
    {name:'MARKET SHOCK',category:'SUPPLY & DEMAND',description:'Demand for your product is rising.',question:'Demand increases while supply stays constant. What happens to equilibrium price and quantity?',options:['Both decrease','Price increases; quantity decreases','Both increase','Price decreases; quantity increases'],correct:2,why:'The demand curve shifts right, increasing both equilibrium price and equilibrium quantity.',reward:3000},
    {name:'FACTORY TYCOON',category:'PRODUCTION COSTS',description:'Your factory is expanding.',question:'If marginal cost is below average total cost, what happens to average total cost as output increases?',options:['It decreases','It increases','It stays unchanged','It becomes zero'],correct:0,why:'A marginal value below the current average pulls that average down.',reward:4000},
    {name:'COMPETITION WAR',category:'MARKET STRUCTURES',description:'Choose your profit-maximizing production level.',question:'At an interior profit-maximizing output, which condition holds?',options:['P = ATC in every market','MR = MC','Total revenue is zero','Marginal cost is zero'],correct:1,why:'Firms maximize profit where marginal revenue equals marginal cost, provided the output is viable.',reward:5000},
    {name:'ECONOMIC CRISIS',category:'GOVERNMENT INTERVENTION',description:'A new policy affects prices.',question:'What results from a binding price ceiling below equilibrium in a competitive market?',options:['A surplus','An increase in supply','A shortage','Guaranteed higher profits'],correct:2,why:'At the capped price, quantity demanded exceeds quantity supplied, creating a shortage.',reward:7000}
  ];
  const products = {
    cars:[{id:'compact',name:'City Compact',price:3000,desc:'Starter city car'},{id:'sport',name:'Vice Sport GT',price:8000,desc:'Faster sports car'},{id:'super',name:'Neon Supercar',price:18000,desc:'Premium high-speed car'}],
    businesses:[{id:'cafe',name:'Sunset Cafe',price:4000,desc:'Earn $300 after each newly completed mission'},{id:'factory',name:'Market Factory',price:12000,desc:'Earn $900 after each newly completed mission'},{id:'tower',name:'Empire Tower',price:25000,desc:'Earn $2,000 after each newly completed mission'}],
    gear:[{id:'pulse',name:'Pulse Trainer Upgrade',price:1500,desc:'Increases target practice range'},{id:'neon',name:'Neon Trainer Skin',price:2500,desc:'Changes the pulse trainer glow'}]
  };
  const state = {started:false,cash:10000,xp:0,completed:new Set(),owned:new Set(),active:null,answered:false,tab:'cars',phone:false};
  let toastTimer;
  function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3200);}
  function hud(){ $('cash').textContent=fmt(state.cash);$('xp').textContent=state.xp;$('progress').textContent=`${state.completed.size}/5`;$('phoneBalance').textContent=fmt(state.cash); }
  function playing(){return state.started&&state.active===null&&!state.phone&&$('win').classList.contains('hidden');}
  function start(){state.started=true;$('menu').classList.add('hidden');$('win').classList.add('hidden');$('hud').classList.remove('hidden');hud();toast('Welcome to Market City! Walk to marker 1 and press E.');}
  function closeMission(){ $('mission').classList.add('hidden');state.active=null;state.answered=false; }
  function openMission(index){
    if(!playing()||!Number.isInteger(index)||index<0||index>=missions.length)return;
    if(state.completed.has(index)){toast('Already completed!');return;}
    if(index>0&&!state.completed.has(index-1)){toast('Complete the previous mission first.');return;}
    const m=missions[index];state.active=index;state.answered=false;
    $('category').textContent=`MISSION ${index+1} / 5 · ${m.category}`;$('missionName').textContent=m.name;$('description').textContent=m.description;$('question').textContent=m.question;
    $('answers').replaceChildren();$('explanation').classList.add('hidden');$('next').classList.add('hidden');
    m.options.forEach((option,i)=>{const b=document.createElement('button');b.textContent=`${'ABCD'[i]}. ${option}`;b.addEventListener('click',()=>answer(i));$('answers').appendChild(b);});
    $('mission').classList.remove('hidden');
  }
  function answer(choice){
    if(state.active===null||state.answered)return;
    state.answered=true;const m=missions[state.active];const correct=choice===m.correct;
    if(correct){
      state.cash+=m.reward;state.xp+=100;state.completed.add(state.active);
      let income=0;
      if(state.owned.has('cafe'))income+=300;
      if(state.owned.has('factory'))income+=900;
      if(state.owned.has('tower'))income+=2000;
      state.cash+=income;
      $('explanation').textContent=`✓ CORRECT! ${m.why} Earned ${fmt(m.reward)} + 100 XP${income?` + ${fmt(income)} business income`:''}.`;
    } else {
      state.cash=Math.max(0,state.cash-500);
      $('explanation').textContent=`✕ INCORRECT. Correct answer: ${'ABCD'[m.correct]}. ${m.options[m.correct]}. ${m.why} Lost $500. Return to retry.`;
    }
    [...$('answers').children].forEach((b,i)=>{b.disabled=true;b.style.borderColor=i===m.correct?'#28f4d1':i===choice?'#ff6b7e':'#ffffff30';});
    $('explanation').classList.remove('hidden');$('next').textContent=correct?'CONTINUE':'TRY AGAIN LATER';$('next').classList.remove('hidden');hud();
  }
  function continueMission(){const passed=state.active!==null&&state.completed.has(state.active);closeMission();if(state.completed.size===5){$('hud').classList.add('hidden');$('win').classList.remove('hidden');$('finalStats').textContent=`${fmt(state.cash)} · ${state.xp} XP`;return;}$('objective').textContent=`${state.completed.size}/5 completed. Find marker ${state.completed.size+1}.`;toast(passed?'Mission completed! Find the next marker.':'Try that mission again.');}
  function renderShop(){
    $('phoneBalance').textContent=fmt(state.cash);$('products').replaceChildren();
    products[state.tab].forEach(item=>{
      const card=document.createElement('div');card.className='product';const title=document.createElement('h3');title.textContent=item.name;const desc=document.createElement('p');desc.textContent=`${item.desc} · ${fmt(item.price)}`;const btn=document.createElement('button');const owned=state.owned.has(item.id);btn.textContent=owned?(state.tab==='cars'?'SPAWN':'OWNED'):'BUY';btn.disabled=owned&&state.tab!=='cars';
      btn.addEventListener('click',()=>{
        if(state.owned.has(item.id)){if(state.tab==='cars')window.dispatchEvent(new CustomEvent('spawn-car',{detail:{id:item.id}}));closePhone();return;}
        if(state.cash<item.price){toast('Not enough money. Complete more missions!');return;}
        state.cash-=item.price;state.owned.add(item.id);hud();
        if(state.tab==='cars')window.dispatchEvent(new CustomEvent('spawn-car',{detail:{id:item.id}}));
        if(state.tab==='gear')window.dispatchEvent(new CustomEvent('gear-upgrade',{detail:{id:item.id}}));
        toast(`${item.name} purchased!`);renderShop();
      });card.append(title,desc,btn);$('products').appendChild(card);
    });
  }
  function closePhone(){state.phone=false;$('phone').classList.add('hidden');}
  function togglePhone(){if(!state.started||state.active!==null||!$('win').classList.contains('hidden'))return;state.phone=!state.phone;$('phone').classList.toggle('hidden',!state.phone);if(state.phone)renderShop();}
  function reset(){state.started=false;state.cash=10000;state.xp=0;state.completed.clear();state.owned.clear();state.active=null;state.answered=false;closePhone();closeMission();window.dispatchEvent(new Event('game-restart'));$('win').classList.add('hidden');start();$('objective').textContent='Find glowing marker 1 and press E.';}
  $('start').addEventListener('click',start);$('closeMission').addEventListener('click',closeMission);$('next').addEventListener('click',continueMission);$('phoneButton').addEventListener('click',togglePhone);$('closePhone').addEventListener('click',closePhone);$('reset').addEventListener('click',reset);$('again').addEventListener('click',reset);
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderShop();}));
  window.addEventListener('economic-mission',e=>openMission(e.detail.index));
  window.addEventListener('game-message',e=>{if(state.started)toast(e.detail.message);});
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='p'&&!e.repeat)togglePhone();if(e.key==='Escape'){if(state.phone)closePhone();else if(state.active!==null)closeMission();}});
  window.gameAPI={playing,hasPhoneOpen:()=>state.phone,hasGear:id=>state.owned.has(id)};
  hud();
})();
