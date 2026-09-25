'use strict';
/* =====================================================================
   EMBERWATCH — the journey: overworld map, rewards, shops, events, saves
   ===================================================================== */
let RUN=null;
const SAVE_KEY='emberwatch.v3.run',BEST_KEY='emberwatch.v3.best';
const MAP_F=7,MAP_L=4;
const NODE_INFO={
  battle:{name:'Battle',desc:'A fight on the road. Win for gold, a level and a new power.'},
  elite:{name:'Elite Battle',desc:'A dangerous champion and its guards. Win for gold, a level, a new power and a relic.'},
  event:{name:'Unknown',desc:'Something unusual lies ahead. Your skills may be tested.'},
  shop:{name:'Merchant',desc:'A travelling merchant. Spend gold on relics, training and healing.'},
  rest:{name:'Campfire',desc:'A safe camp. Rest to heal, or train a new power.'},
  treasure:{name:'Treasure',desc:'An unguarded cache. Choose a relic.'},
  boss:{name:'Boss',desc:''},
};
function newHeroes(){return ORDER.map(c=>({cls:c,lvl:1,maxHp:CLASSES[c].hp,hp:CLASSES[c].hp,powers:CLASSES[c].start.slice()}));}
function newRun(){
  RUN={v:7,act:0,map:genMap(0),pos:null,gold:40,heroes:newHeroes(),relics:[],stats:{wins:0,kills:0,battles:0,gold:0},stage:'map',pending:null,seen:[],shop:null,event:null,enc:null};
  saveGame();
}
function genMap(act){
  const nodes={},edges=new Set();
  const has=(a,b)=>edges.has(a+'>'+b);
  const starts=shuffle([0,1,2,3]);
  for(let p=0;p<4;p++){
    let l=p<3?starts[p]:rnd(MAP_L);
    for(let f=0;f<MAP_F;f++){
      const id=f+'_'+l;nodes[id]=nodes[id]||{id,f,l};
      if(f<MAP_F-1){let nl=clamp(l+rnd(3)-1,0,MAP_L-1);if(nl!==l&&has((f)+'_'+nl,(f+1)+'_'+l))nl=l;edges.add(id+'>'+(f+1)+'_'+nl);l=nl;}
    }
  }
  const wpick=f=>{const w=[['battle',45],['event',22]];if(f>=2){w.push(['elite',13],['shop',10]);}if(f>=2&&f<5)w.push(['rest',9]);let t=0;for(const x of w)t+=x[1];let r=Math.random()*t;for(const x of w){r-=x[1];if(r<0)return x[0];}return 'battle';};
  let shops=0;
  for(const n of Object.values(nodes)){
    n.type=n.f===0?'battle':n.f===MAP_F-1?'rest':n.f===3&&rnd(2)?'treasure':wpick(n.f);
    if(n.type==='shop'&&++shops>2)n.type='battle';
  }
  const r=mulberry(act*1000+Object.keys(nodes).length*7+rnd(1000));
  for(const n of Object.values(nodes)){n.x=22+n.f*37+Math.round(r()*6-3);n.y=40+n.l*34+Math.round(r()*8-4);}
  nodes.boss={id:'boss',f:MAP_F,l:1.5,type:'boss',x:292,y:93};
  for(const n of Object.values(nodes))if(n.f===MAP_F-1)edges.add(n.id+'>boss');
  return {act,nodes,edges:[...edges],seed:rnd(1e6),visited:[]};
}
function availableNodes(){
  const M=RUN.map;
  if(!RUN.pos)return Object.values(M.nodes).filter(n=>n.f===0).map(n=>n.id);
  return M.edges.filter(e=>e.split('>')[0]===RUN.pos).map(e=>e.split('>')[1]);
}
function nodeF(n,elite){const base=RUN.act*4+Math.min(3,Math.floor(n.f/2));return n.type==='boss'?RUN.act*4+3:Math.min(RUN.act*4+3,base+(elite?1:0));}
function travel(id){
  const n=RUN.map.nodes[id];if(!n)return;
  RUN.pos=id;RUN.map.visited.push(id);
  if(n.type==='battle'||n.type==='elite'||n.type==='boss'){
    const f=nodeF(n,n.type==='elite');
    const type=n.type==='boss'?'boss':n.type==='elite'?pick(['rout','assassinate','rout']):(RUN.stats.battles===0?'rout':pick(MISSION_BY_ACT[RUN.act]));
    startRunBattle(genEncounter(f,type,{act:RUN.act,elite:n.type==='elite'}),n.type);
  }else if(n.type==='shop'){RUN.stage='shop';RUN.shop=genShop();saveGame();go(SHOP_SCREEN);}
  else if(n.type==='rest'){RUN.stage='rest';saveGame();go(REST_SCREEN);}
  else if(n.type==='treasure'){RUN.stage='reward';RUN.pending={steps:['relic2'],gold:10+rnd(15),kind:'treasure'};RUN.gold+=RUN.pending.gold;saveGame();goReward();}
  else if(n.type==='event'){
    let pool=EVENTS.filter(e=>!RUN.seen.includes(e.id));if(!pool.length){RUN.seen=[];pool=EVENTS.slice();}
    const ev=pick(pool);RUN.seen.push(ev.id);RUN.stage='event';RUN.event={id:ev.id,done:null};saveGame();go(EVENT_SCREEN);
  }
}
function startRunBattle(enc,kind){
  CTX={mode:'run',relics:RUN.relics};
  RUN.stage='battle';RUN.enc=enc;RUN.encKind=kind||'battle';
  for(const h of RUN.heroes)if(h.hp<=0)h.hp=1;
  setupBattle(enc,RUN.heroes);
  beginBattleScreen(onRunBattleEnd);
}
function beginBattleScreen(onEnd){
  B.onEnd=onEnd;B.busy=false;B.pend=null;B.inspect=null;B.vkey='';B.gRef=null;
  for(const k in VIS)delete VIS[k];FX.length=0;PARTS.length=0;B.flash=null;B.banner=null;SHK.m=0;
  scrollTo('card',0);
  go(BATTLE_SCREEN);
  (async()=>{await sleep(300);await nextTurn();const u=playerUnit();if(u)selfPend(u);})();
}
function effMaxHp(h){return h.maxHp+(RUN&&RUN.relics.includes('heart')?8:0);}
function onRunBattleEnd(o){
  if(o==='win'){
    openModal(dialog({title:'VICTORY',body:`${G.enc.title} is won.`,closable:false,buttons:[{l:'CONTINUE',hot:true,fn:()=>{resolveVictory();goReward();}}]}));
  }else{
    RUN.stage='lost';const best=+(localStorage.getItem(BEST_KEY)||0);
    try{if(RUN.stats.wins>best)localStorage.setItem(BEST_KEY,RUN.stats.wins);}catch(e){}
    clearSave();
    openModal(dialog({title:'DEFEAT',body:`The company has fallen at ${G.enc.title}.`,closable:false,buttons:[{l:'THE TALE',hot:true,fn:()=>go(END_SCREEN)}]}));
  }
}
function resolveVictory(){
  const enc=G.enc,kind=RUN.encKind;
  RUN.stats.wins++;RUN.stats.battles++;RUN.stats.kills+=G.kills;
  let gold=kind==='boss'?60+rnd(20):kind==='elite'?35+rnd(15):14+rnd(10)+RUN.act*4;
  if(enc.type==='loot'&&G.looted>=3)gold+=30;
  if(RUN.relics.includes('coin'))gold=Math.round(gold*1.5);
  RUN.gold+=gold;RUN.stats.gold+=gold;
  const heal=TUNE.healAfter+(RUN.relics.includes('waterskin')?.15:0);
  for(const h of RUN.heroes){
    const u=G.units.find(x=>x.id==='h_'+h.cls);const mhp=effMaxHp(h);
    if(!u||u.dead)h.hp=Math.ceil(mhp*TUNE.fallenHp);
    else h.hp=Math.min(mhp,u.hp+Math.ceil(mhp*heal));
    if(h.lvl<TUNE.maxLvl){const g=CLASSES[h.cls].grow;h.lvl++;h.maxHp+=g;h.hp=Math.min(effMaxHp(h),h.hp+g);}
  }
  const steps=['train'];
  if(kind==='elite'||kind==='boss')steps.push('relic');
  RUN.pending={steps,gold,kind,lvl:RUN.heroes[0].lvl};
  RUN.stage='reward';G=null;
  if(kind==='boss'){
    RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*TUNE.actHeal)));
    if(RUN.act>=2){RUN.pending.final=true;}
  }
  saveGame();
}
function powerOffers(n){
  const cand=[];
  for(const h of RUN.heroes)for(const id in POWERS){const p=POWERS[id];if(p.c===h.cls&&p.lv<=h.lvl&&!h.powers.includes(id))cand.push({cls:h.cls,id});}
  shuffle(cand);const out=[];const seen=new Set();
  for(const c of cand){if(!seen.has(c.cls)){out.push(c);seen.add(c.cls);}if(out.length>=n)break;}
  for(const c of cand){if(out.length>=n)break;if(!out.includes(c))out.push(c);}
  return out;
}
function relicOffers(n){return shuffle(Object.keys(RELICS).filter(r=>!RUN.relics.includes(r))).slice(0,n);}
function nextRewardStep(){
  const P=RUN.pending;if(!P||!P.steps.length){return null;}
  const s=P.steps[0];
  if(!P.offers){P.offers=s==='train'?powerOffers(3):s==='relic'?relicOffers(3):relicOffers(2);}
  if(!P.offers.length){P.steps.shift();P.offers=null;return nextRewardStep();}
  return s;
}
function takeReward(choice){
  const P=RUN.pending;const s=P.steps.shift();P.offers=null;
  if(s==='train'&&choice)RUN.heroes.find(h=>h.cls===choice.cls).powers.push(choice.id);
  if((s==='relic'||s==='relic2')&&choice)gainRelic(choice);
  saveGame();
}
function gainRelic(r){if(RUN.relics.includes(r))return;RUN.relics.push(r);if(r==='heart')RUN.heroes.forEach(h=>h.hp+=8);}
function finishRewards(){
  const P=RUN.pending;RUN.pending=null;
  if(P&&P.final){RUN.stage='won';try{localStorage.setItem(BEST_KEY,Math.max(+(localStorage.getItem(BEST_KEY)||0),RUN.stats.wins));}catch(e){}clearSave();go(END_SCREEN);return;}
  if(P&&P.kind==='boss'){RUN.act++;RUN.map=genMap(RUN.act);RUN.pos=null;}
  RUN.stage='map';saveGame();go(MAP_SCREEN);
}
/* ---------------- shop ---------------- */
function genShop(){
  const items=[];
  for(const r of relicOffers(3))items.push({kind:'relic',id:r,price:RELICS[r].price+rnd(20)-10});
  for(const o of powerOffers(2))items.push({kind:'power',cls:o.cls,id:o.id,price:55+POWERS[o.id].lv*5});
  items.push({kind:'heal',price:35});
  return {items};
}
function buyItem(it){
  if(it.sold||RUN.gold<it.price)return false;
  RUN.gold-=it.price;it.sold=true;sfx('coin');
  if(it.kind==='relic')gainRelic(it.id);
  if(it.kind==='power')RUN.heroes.find(h=>h.cls===it.cls).powers.push(it.id);
  if(it.kind==='heal')RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*.4)));
  saveGame();return true;
}
/* ---------------- events ---------------- */
function bestAt(skill){
  let best=null;
  for(const h of RUN.heroes){const a=attrsFor(h.cls,h.lvl)[SKILLS[skill]]+(CLASSES[h.cls].skills.includes(skill)?2:0);if(!best||a>best.mod)best={h,mod:a};}
  return best;
}
/* Chance that the party's best hero passes a skill check. */
function checkChance(skill,dc){const b=bestAt(skill);let p=0;for(let t=3;t<=18;t++)if(t+b.mod>=dc)p+=D3[t]/216;return {p,b};}
function resolveEvent(opt){
  let out=opt.win,roll=null;
  if(opt.cost){if(RUN.gold<opt.cost)return {text:'You cannot afford it.',fail:true};RUN.gold-=opt.cost;}
  if(opt.check){const b=bestAt(opt.check.skill);const d=[1+rnd(6),1+rnd(6),1+rnd(6)];const tot=d[0]+d[1]+d[2]+b.mod;
    roll={who:CLASSES[b.h.cls].name,cls:b.h.cls,skill:opt.check.skill,d,mod:b.mod,tot,dc:opt.check.dc,ok:tot>=opt.check.dc};out=roll.ok?opt.win:opt.lose;}
  const lines=[out.text];
  if(out.gold){RUN.gold=Math.max(0,RUN.gold+out.gold);lines.push(out.gold>0?`{g:+${out.gold} gold.}`:`{r:${out.gold} gold.}`);}
  if(out.heal){RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*out.heal)));lines.push(`{h:The party heals ${Math.round(out.heal*100)}%.}`);}
  if(out.dmg){RUN.heroes.forEach(h=>h.hp=Math.max(1,h.hp-out.dmg));lines.push(`{r:Everyone takes ${out.dmg} damage.}`);}
  if(out.relic)lines.push('{g:A relic awaits.}');
  if(out.train)lines.push('{g:A hero can learn a new power.}');
  if(out.fight)lines.push('{r:A fight!}');
  const res={text:lines.join('\n'),roll,label:opt.label,relic:!!out.relic,train:!!out.train,fight:out.fight};
  saveGame();return res;
}
/* ---------------- saves ---------------- */
function saveGame(){
  try{
    if(!RUN||RUN.stage==='lost'||RUN.stage==='won'||CTX.mode!=='run')return;
    const d={RUN};
    if(RUN.stage==='battle'&&G&&!G.over&&G.await)d.G=G;
    else if(RUN.stage==='battle'){const old=loadSave();if(old&&old.G&&G&&!G.over)d.G=old.G;}
    localStorage.setItem(SAVE_KEY,JSON.stringify(d));
  }catch(e){}
}
function loadSave(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return d&&d.RUN&&d.RUN.v===7?d:null;}catch(e){return null;}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
function continueRun(){
  const d=loadSave();if(!d)return;RUN=d.RUN;CTX={mode:'run',relics:RUN.relics};
  if(RUN.stage==='battle'){
    if(d.G){G=d.G;HIST.length=0;G.await=true;pushSnap();B.onEnd=onRunBattleEnd;B.busy=false;B.pend=null;B.inspect=null;B.vkey='';B.gRef=null;for(const k in VIS)delete VIS[k];go(BATTLE_SCREEN);const u=playerUnit();if(u){B.pi=defaultPower(u);selfPend(u);}}
    else startRunBattle(RUN.enc,RUN.encKind);
  }
  else if(RUN.stage==='reward'&&RUN.pending)goReward();
  else if(RUN.stage==='shop')go(SHOP_SCREEN);
  else if(RUN.stage==='rest')go(REST_SCREEN);
  else if(RUN.stage==='event')go(EVENT_SCREEN);
  else{RUN.stage='map';go(MAP_SCREEN);}
}
