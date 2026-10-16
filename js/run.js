'use strict';
/* =====================================================================
   ROGUE TACTICS — the journey (Core Rules chapter 4): map, Victories, Camps, hit dice and Wounds, power drafts,
   the smith, events, dramatic tasks, negotiations, road events and saves
   ===================================================================== */
let RUN=null;
const SAVE_KEY='emberwatch.v5.run',BEST_KEY='emberwatch.v3.best';
const MAP_F=7,MAP_L=4;
const NODE_INFO={
  battle:{name:'Battle',desc:'A fight on the road. Win for gold, 1 Victory and a reward: 1 of 3 cards.'},
  elite:{name:'Elite Battle',desc:'A dangerous champion and its guards. Win for gold, 2 Victories, two rewards (Uncommon or better) and treasure.'},
  event:{name:'Event',desc:'Something unusual lies ahead: a choice, a test of your attributes, a race against time or a hard bargain.'},
  road:{name:'Road',desc:'Anything can happen on the road: an ambush, a hazard, a stranger, a find, an omen or a quiet mile.'},
  shop:{name:'Merchant',desc:'Buy weapons, powers, relics and supplies. The smith tempers, hones and inscribes weapons.'},
  rest:{name:'Camp',desc:'Heal with your hit dice, refill them and remove a Wound. Victories reset.'},
  treasure:{name:'Treasure',desc:'An unguarded cache: a relic, a weapon, or a power draft for one hero.'},
  boss:{name:'Boss',desc:''},
};
const living=()=>RUN.heroes.filter(h=>!h.dead);
const heroOf=cls=>RUN.heroes.find(h=>h.cls===cls);
const hasClass=cls=>living().some(h=>h.cls===cls);
const hdMax=h=>TUNE.hdBase+(RUN&&RUN.gear.includes('kettle')?1:0);
const priceMul=()=>(wornR('seal')?.75:1)*(RUN&&RUN.dread>=5?1.25:1);
const wornR=r=>!!RUN&&RUN.gear.includes(r);
const slotsOf=h=>TUNE.slots;
const heroAttrs=h=>attrsFor(h.cls,h.lvl,h.up);
function newHeroes(){return ORDER.map(c=>({cls:c,lvl:1,maxHp:CLASSES[c].hp,hp:CLASSES[c].hp,hd:2,wounds:0,up:{},powers:CLASSES[c].start.slice(),weapon:START_WEAPON[c]}));}
function newRun(dread){
  unseedRng();
  const L=legacy();if(dread==null)dread=Math.min(L.dreadMax,L.lastDread||0);
  RUN={v:12,dread,act:0,map:genMap(0),pos:null,gold:dread>=2?0:40,vic:0,wup:{},heroes:newHeroes(),relics:[],gear:[],stash:[],stats:{wins:0,kills:0,battles:0,gold:0},stage:'map',pending:null,seen:[],shop:null,event:null,enc:null,camp:null,task:null,talk:null};
  for(const h of RUN.heroes)h.hd=hdMax(h);
  if(dread>=6)for(const n of Object.values(RUN.map.nodes))if(n.diff==='easy'&&n.f>0)n.diff='medium';
  RUN.boons=boonOffers();
  CTX={mode:'run',relics:RUN.gear,vic:0,dread};
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
  const wpick=f=>{const w=[['battle',42],['event',16]];if(f>=1)w.push(['road',10]);if(f>=2){w.push(['elite',13],['shop',10]);}if(f>=2&&f<5)w.push(['rest',9]);let t=0;for(const x of w)t+=x[1];let r=Math.random()*t;for(const x of w){r-=x[1];if(r<0)return x[0];}return 'battle';};
  let shops=0;
  for(const n of Object.values(nodes)){
    n.type=n.f===0?'battle':n.f===MAP_F-1?'rest':n.f===3&&rnd(2)?'treasure':wpick(n.f);
    if(n.type==='shop'&&++shops>2)n.type='battle';
  }
  for(const n of Object.values(nodes)){n.mission=rollMission(n,act);if(n.type==='battle')n.diff=n.f===0||(Math.random()<TUNE.easyShare&&!(RUN&&RUN.dread>=6))?'easy':'medium';if(n.type==='elite')n.diff='hard';}
  const r=mulberry(act*1000+Object.keys(nodes).length*7+rnd(1000));
  for(const n of Object.values(nodes)){n.x=22+n.f*37+Math.round(r()*6-3);n.y=40+n.l*34+Math.round(r()*8-4);}
  nodes.boss={id:'boss',f:MAP_F,l:1.5,type:'boss',x:292,y:93};
  for(const n of Object.values(nodes))if(n.f===MAP_F-1)edges.add(n.id+'>boss');
  return {act,nodes,edges:[...edges],seed:rnd(1e6),visited:[]};
}
/* Each battle on the map knows its mission from the start, so the map can show it. */
function rollMission(n,act){
  if(n.type==='elite')return pick(['rout','assassinate','rout']);
  if(n.type!=='battle')return null;
  if(act===0&&n.f===0)return 'rout';
  return pick(MISSION_BY_ACT[act]);
}
function nodeMission(n){if(!n.mission&&(n.type==='battle'||n.type==='elite')){n.mission=rollMission(n,RUN.act);saveGame();}return n.mission;}
function availableNodes(){
  const M=RUN.map;
  if(!RUN.pos)return Object.values(M.nodes).filter(n=>n.f===0).map(n=>n.id);
  return M.edges.filter(e=>e.split('>')[0]===RUN.pos).map(e=>e.split('>')[1]);
}
function nodeF(n,elite){const base=RUN.act*4+Math.min(3,Math.floor(n.f/2));return n.type==='boss'?RUN.act*4+3:Math.min(RUN.act*4+3,base+(elite?1:0));}
function curNode(){return RUN.map.nodes[RUN.pos]||{f:0,type:'battle'};}
/* Arriving at a stop. Returns what the screen should show next. */
function arrive(id){
  const n=RUN.map.nodes[id];if(!n)return null;
  RUN.pos=id;RUN.map.visited.push(id);
  if(n.type==='battle'||n.type==='elite'||n.type==='boss'){
    const f=nodeF(n,n.type==='elite');
    const type=n.type==='boss'?'boss':nodeMission(n);
    return {battle:genEncounter(f,type,{act:RUN.act,elite:n.type==='elite',diff:n.diff,party:living().length}),kind:n.type};
  }
  if(n.type==='shop'){RUN.stage='shop';RUN.shop=genShop();saveGame();return {screen:'shop'};}
  if(n.type==='rest'){makeCamp();return {screen:'rest'};}
  if(n.type==='treasure'){RUN.stage='reward';const h=pick(living());RUN.pending={steps:['loot'],gold:10+rnd(15),kind:'treasure',draftFor:h.cls};RUN.gold+=RUN.pending.gold;saveGame();return {screen:'reward'};}
  if(n.type==='road'){RUN.event={road:1+rnd(6),done:null};const ev=eventOf(RUN.event);if(ev.kind==='talk'){startTalk(ev);return {screen:'talk'};}RUN.stage='event';saveGame();return {screen:'event'};}
  if(n.type==='event'){
    let pool=EVENTS.filter(e=>!RUN.seen.includes(e.id));if(!pool.length){RUN.seen=[];pool=EVENTS.slice();}
    const ev=pick(pool);RUN.seen.push(ev.id);
    if(ev.kind==='task'){startTask(ev);return {screen:'task'};}
    if(ev.kind==='talk'){startTalk(ev);return {screen:'talk'};}
    RUN.stage='event';RUN.event={id:ev.id,done:null};saveGame();return {screen:'event'};
  }
  return null;
}
function travel(id){
  const r=arrive(id);if(!r)return;
  if(r.battle)startRunBattle(r.battle,r.kind);
  else if(r.screen==='reward')goReward();
  else go({shop:SHOP_SCREEN,rest:REST_SCREEN,event:EVENT_SCREEN,task:TASK_SCREEN,talk:TALK_SCREEN}[r.screen]||MAP_SCREEN);
}
function startRunBattle(enc,kind){
  CTX={mode:'run',relics:RUN.gear,vic:RUN.vic,dread:RUN.dread||0};
  RUN.stage='battle';RUN.enc=enc;RUN.encKind=kind||'battle';
  for(const h of living())if(h.hp<=0)h.hp=1;
  setupBattle(enc,living());
  if(kind==='boss'&&RUN.omen){RUN.omen=false;for(const u of G.units)if(u.side==='hero'&&u.kind==='pc')u.mom=Math.min(5,u.mom+1);log('The omen holds: every hero starts with 1 more momentum.','g');}
  beginBattleScreen(onRunBattleEnd);
}
function beginBattleScreen(onEnd){
  B.onEnd=onEnd;B.busy=false;B.pend=null;B.inspect=null;B.vkey='';B.gRef=null;
  for(const k in VIS)delete VIS[k];FX.length=0;PARTS.length=0;B.flash=null;B.banner=null;SHK.m=0;
  scrollTo('card',0);
  go(BATTLE_SCREEN);
  (async()=>{await sleep(300);if(!AUTOPLAY&&G&&!G.tut&&!comboSeen())await showComboIntro();if(!AUTOPLAY&&G&&!G.tut&&(G.enc.type!=='rout'||G.enc.twist))await showObjective();await nextTurn();const u=playerUnit();if(u)selfPend(u);})();
}
function effMaxHp(h){return h.maxHp+(RUN&&RUN.gear.includes('heart')?8:0)+((h.powers||[]).includes('hardy')?6:0);}
function onRunBattleEnd(o){
  if(o==='win'){
    openModal(dialog({title:'VICTORY',body:`${G.enc.title} is won.`,closable:false,buttons:[{l:'CONTINUE',hot:true,fn:()=>{resolveVictory();goReward();}}]}));
  }else{
    RUN.stage='lost';const best=+(localStorage.getItem(BEST_KEY)||0);
    try{if(RUN.stats.wins>best)localStorage.setItem(BEST_KEY,RUN.stats.wins);}catch(e){}
    legacyEnd(false);clearSave();
    openModal(dialog({title:'DEFEAT',body:`The company has fallen at ${G.enc.title}.`,closable:false,buttons:[{l:'THE TALE',hot:true,fn:()=>go(END_SCREEN)}]}));
  }
}
/* After a won battle (Core Rules 2.4, 4.2): gold and Victories; Down heroes stand at 1 HP; Wounds and spent hit dice
   carry on until a Camp; a hero Downed with 3 Wounds already is dead. Elites and bosses give every hero a power draft. */
function resolveVictory(){
  const enc=G.enc,kind=RUN.encKind;
  RUN.stats.wins++;RUN.stats.battles++;RUN.stats.kills+=G.kills;
  let gold=kind==='boss'?45+rnd(15):kind==='elite'?26+rnd(12):10+rnd(8)+RUN.act*3;
  if(enc.type==='loot'&&G.looted>=3)gold+=30;
  if(RUN.gear.includes('coin'))gold=Math.round(gold*1.5);
  if(RUN.dread>=2)gold=Math.round(gold*.8);
  RUN.gold+=gold;
  RUN.stats.elites=(RUN.stats.elites||0)+(kind==='elite'?1:0);RUN.stats.bosses=(RUN.stats.bosses||0)+(kind==='boss'?1:0);
  legacyAdd({battles:1,kills:G.kills,elites:kind==='elite'?1:0,bosses:kind==='boss'?1:0});RUN.stats.gold+=gold;
  const vic=kind==='boss'?3:kind==='elite'?2:1;RUN.vic+=vic;
  const notes=[];
  const tri=Math.max(1,...G.units.filter(x=>x.side==='hero'&&x.kind==='pc'&&!x.dead&&x.pas&&x.pas.triage).map(x=>HD[x.cls]||8));
  for(const h of living()){
    const u=G.units.find(x=>x.id==='h_'+h.cls);if(!u)continue;const mhp=effMaxHp(h);
    const w0=h.wounds||0;h.wounds=u.wounds||0;if(u.hd!=null)h.hd=u.hd;
    if(u.slain){h.dead=true;h.hp=0;notes.push(`{r:${CLASSES[h.cls].name} is dead.} The fourth Down was one too many.`);continue;}
    if(u.dead)h.hp=Math.min(mhp,tri);else h.hp=Math.min(mhp,u.hp);
    if(wornR('waterskin'))h.hp=Math.min(mhp,h.hp+Math.round(mhp*.15));
    if(h.wounds>w0)notes.push(`${CLASSES[h.cls].name} gains a Wound (${h.wounds} of 3).`);
    // Growth counters (Heroes book 2.3) travel with the hero; going Down wiped them in battle
    h.grow=Object.assign({},u.grow||{});if(!u.dead&&u.pas&&u.pas.pride)h.grow.pride=Math.min(4,(h.grow.pride||0)+1);h.glow=!u.dead&&u.pas&&u.pas.afterglow?Math.min(3,Math.floor(u.mom/2)):0;
  }
  // Rewards (after Slay the Spire): every fight offers a pick of 3 cards; elites and bosses offer two, with better rarity
  const steps=['summary'],min=kind==='boss'?'R':kind==='elite'?'U':null,picks=kind==='battle'?1:2;
  const who=Array.from({length:picks},()=>({party:true,min}));for(const w of who)steps.push('draft');
  if(kind==='elite')steps.push('loot');
  if(kind==='boss')steps.push('relic');
  RUN.pending={steps,gold,kind,vic,diff:enc.diff,notes,who,final:kind==='boss'&&RUN.act>=2};
  RUN.stage='reward';G=null;
  saveGame();
}

/* ---------------- hit dice, Camps and levels ---------------- */
/* Catch Breath (Core Rules 2.5): spend a hit die out of battle to heal one roll of it (exploding) plus STR. */
function healRoll(h){return rollEx(HD[h.cls]||8)+(heroAttrs(h).M||0);}
function catchBreath(h){
  if(h.dead||h.hd<=0||h.hp>=effMaxHp(h))return 0;
  h.hd--;const b=h.hp;h.hp=Math.min(effMaxHp(h),h.hp+healRoll(h));return h.hp-b;
}
/* A Camp (Core Rules 4.7): heal with all remaining hit dice, refill them and remove a Wound; the Victories reset.
   Downtime follows on the Camp screen. Heroes do not level up: they grow by the rewards they pick after each fight. */
function makeCamp(o){
  o=o||{};const C={lines:[],drafts:[],tended:{},trained:{},newAct:!!o.newAct};
  for(const h of living()){
    let healed=0;while(h.hd>0&&h.hp<effMaxHp(h))healed+=catchBreath(h);
    const w=h.wounds>0;if(w)h.wounds=Math.max(0,h.wounds-(wornR('kettle')?2:1));
    h.hd=hdMax(h);
    C.lines.push({cls:h.cls,healed,wound:w});
  }
  RUN.vic=0;RUN.camp=C;RUN.stage='rest';saveGame();
  return C;
}
const TEND_COST=25,TRAIN_COST=25;
function tendWound(cls){const h=heroOf(cls),C=RUN.camp;if(!h||!C||h.wounds<=0||C.tended[cls]||RUN.gold<TEND_COST)return false;RUN.gold-=TEND_COST;h.wounds--;C.tended[cls]=1;saveGame();return true;}
/* Train: discard a power and draft a replacement of the same rarity. */
function trainPower(cls,id){const h=heroOf(cls),C=RUN.camp;const i=h?h.powers.indexOf(id):-1;if(i<0||!C||RUN.gold<TRAIN_COST)return false;
  RUN.gold-=TRAIN_COST;h.powers.splice(i,1);C.drafts.push({cls,only:POWERS[id].rar||'C'});C.trained[cls]=1;saveGame();return true;}
/* Hand a general power to another hero (at a Camp). */
function handOver(from,to,id){const a=heroOf(from),b=heroOf(to);if(!a||!b||POWERS[id].c!=='gen'||b.powers.includes(id)||b.powers.length>=slotsOf(b))return false;a.powers.splice(a.powers.indexOf(id),1);b.powers.push(id);saveGame();return true;}
function breakCamp(){
  const C=RUN.camp;RUN.camp=null;
  if(C&&C.drafts.length){RUN.stage='reward';RUN.pending={steps:C.drafts.map(()=>'draft'),who:C.drafts.slice(),kind:'camp'};saveGame();return 'reward';}
  RUN.stage='map';saveGame();return 'map';
}

/* ---------------- power drafts (Heroes book 2.1) ---------------- */
const RAR_RANK={C:0,U:1,R:2};
function rollRarity(){const t=RAR_W.C+RAR_W.U+RAR_W.R;let r=Math.random()*t;for(const k of['C','U','R']){r-=RAR_W[k];if(r<0)return k;}return 'C';}
/* Three powers for a hero: at least one class power and one general power. o.min: at least one of that rarity or
   better; o.only: all of that rarity. */
function draftOffers(h,o){
  o=o||{};const own=new Set(h.powers);
  const pool=Object.keys(POWERS).filter(id=>{const p=POWERS[id];return (p.c===h.cls||p.c==='gen')&&!p.basic&&!p.innate&&p.rar&&!own.has(id)&&(!o.only||p.rar===o.only);});
  const out=[];
  const take=f=>{const r=o.only||rollRarity();let c=pool.filter(id=>f(POWERS[id])&&POWERS[id].rar===r&&!out.includes(id));if(!c.length)c=pool.filter(id=>f(POWERS[id])&&!out.includes(id));if(c.length)out.push(pick(c));};
  take(p=>p.c===h.cls);take(p=>p.c==='gen');take(()=>true);if(wornR('tome'))take(()=>true);
  if(o.min&&!out.some(id=>RAR_RANK[POWERS[id].rar]>=RAR_RANK[o.min])){const c=pool.filter(id=>RAR_RANK[POWERS[id].rar]>=RAR_RANK[o.min]&&!out.includes(id));if(c.length)out[out.length-1]=pick(c);}
  return shuffle(out).map(id=>({cls:h.cls,id}));
}
/* A reward pick (after Slay the Spire): three cards from the whole party. Each is a power for one hero (a different
   hero each, where possible), or now and then a growth card: more health, or +1 to a hero's key stat. */
const GROW={
  vigor:{name:'Vigor',desc:h=>`+${vigorOf(h)} max health, healed at once.`},
  train:{name:'Training',desc:h=>`+1 ${ATTR[CLASSES[h.cls].prime]}, ${CLASSES[h.cls].name}'s key stat (to ${Math.min(5,heroAttrs(h)[CLASSES[h.cls].prime]+1)}): every attack and power hits harder.`},
};
const vigorOf=h=>Math.round((HD[h.cls]||8)*TUNE.vigor);
function growOk(h,k){return k!=='train'||heroAttrs(h)[CLASSES[h.cls].prime]<5;}
function growHero(h,k){
  if(k==='vigor'){const n=vigorOf(h);h.maxHp+=n;h.hp+=n;return `${CLASSES[h.cls].name} gains ${n} max health.`;}
  if(k==='train'){const a=CLASSES[h.cls].prime;h.up=h.up||{};h.up[a]=(h.up[a]||0)+1;return `${CLASSES[h.cls].name}'s ${ATTR[a]} rises to ${heroAttrs(h)[a]}.`;}
}
function partyDraftOffers(o){
  o=o||{};const out=[],used=new Set();let grown=false;
  const heroes=shuffle(living().slice());
  for(let i=0;i<3+(wornR('tome')?1:0);i++){
    const h=heroes[i%heroes.length];if(!h)break;
    if(!grown&&!o.min&&Math.random()<TUNE.growChance){const k=Math.random()<.35&&growOk(h,'train')?'train':'vigor';out.push({cls:h.cls,grow:k});grown=true;continue;}
    const own=new Set(h.powers);
    const pool=Object.keys(POWERS).filter(id=>{const p=POWERS[id];return (p.c===h.cls||p.c==='gen')&&!p.basic&&!p.innate&&p.rar&&!own.has(id)&&!used.has(h.cls+id);});
    if(!pool.length)continue;
    const r=rollRarity();let c=pool.filter(id=>POWERS[id].rar===r);if(!c.length)c=pool;
    const id=pick(c);used.add(h.cls+id);out.push({cls:h.cls,id});
  }
  if(o.min&&!out.some(x=>x.id&&RAR_RANK[POWERS[x.id].rar]>=RAR_RANK[o.min])){
    for(const h of shuffle(living().slice())){const c=Object.keys(POWERS).filter(id=>{const p=POWERS[id];return (p.c===h.cls||p.c==='gen')&&!p.basic&&!p.innate&&p.rar&&RAR_RANK[p.rar]>=RAR_RANK[o.min]&&!h.powers.includes(id);});
      if(c.length){out[out.length-1]={cls:h.cls,id:pick(c)};break;}}
  }
  return out;
}
const SKIP_PAY=10,REROLL_COST=10;
/* Learn a power; with every slot full, `drop` names the power to discard. */
function learnPower(cls,id,drop){
  const h=heroOf(cls);if(!h||h.powers.includes(id))return false;
  if(h.powers.length>=slotsOf(h)){const i=h.powers.indexOf(drop);if(i<0)return false;h.powers.splice(i,1);}
  h.powers.push(id);return true;
}
function relicOffers(n){return shuffle(Object.keys(RELICS).filter(r=>!RUN.relics.includes(r)&&relicUnlocked(r))).slice(0,n);}
function weaponOffers(n){
  const tiers=RUN.act===0?[2,2,3]:RUN.act===1?[2,3,3,4]:[3,4,4];
  const owned=new Set([...RUN.stash,...RUN.heroes.map(h=>h.weapon)]);
  const pool=Object.values(WEAPONS).filter(w=>tiers.includes(w.tier)&&!owned.has(w.id)&&hasClass(w.cls));
  return shuffle(pool).slice(0,n).map(w=>({weapon:w.id}));
}
/* A new weapon goes straight into the hand of a hero still using their starting one; otherwise into the pack. */
function gainWeapon(id){
  const w=WEAPONS[id];const h=RUN.heroes.find(q=>q.cls===w.cls);
  if(h&&WEAPONS[h.weapon].tier<w.tier&&WEAPONS[h.weapon].tier===1&&!RUN.wup[h.weapon]){h.weapon=id;return `${CLASSES[w.cls].name} takes up the ${w.name}.`;}
  RUN.stash.push(id);return `The ${w.name} goes into the pack. Equip it from the Equipment screen.`;
}
function equipWeapon(cls,id){const h=RUN.heroes.find(q=>q.cls===cls);if(!h||WEAPONS[id].cls!==cls)return;const i=RUN.stash.indexOf(id);if(i<0)return;RUN.stash.splice(i,1);RUN.stash.push(h.weapon);h.weapon=id;saveGame();}
function toggleRelic(r,replace){
  const i=RUN.gear.indexOf(r);
  if(i>=0)RUN.gear.splice(i,1);
  else if(RUN.gear.length<2)RUN.gear.push(r);
  else if(replace!=null)RUN.gear[replace]=r;
  RUN.heroes.forEach(h=>h.hp=Math.min(h.hp,effMaxHp(h)));
  saveGame();
}
/* Reward steps: summary, draft (one hero at a time, from P.who), loot, relic, relic2, weapon. */
function draftHero(){const P=RUN.pending;while(P.who&&P.who.length){const w=P.who[0];if(w.party&&living().length)return {h:null,w};const h=heroOf(w.cls);if(h&&!h.dead)return {h,w};P.who.shift();}return null;}
function nextRewardStep(){
  const P=RUN.pending;if(!P||!P.steps.length){return null;}
  const s=P.steps[0];
  if(s==='summary')return s;
  if(s==='draft'){const d=draftHero();if(!d){P.steps.shift();P.offers=null;return nextRewardStep();}if(!P.offers)P.offers=d.w.party?partyDraftOffers(d.w):draftOffers(d.h,d.w);}
  if(!P.offers){P.offers=s==='relic'?relicOffers(3):s==='weapon'?weaponOffers(2):s==='loot'?relicOffers(P.draftFor?1:2).concat(weaponOffers(1),P.draftFor&&heroOf(P.draftFor)&&!heroOf(P.draftFor).dead?[{draft:P.draftFor}]:[]):relicOffers(2);}
  if(!P.offers.length){P.steps.shift();P.offers=null;if(s==='draft'&&P.who)P.who.shift();return nextRewardStep();}
  return s;
}
function takeReward(choice,drop){
  const P=RUN.pending;const s=P.steps.shift();P.offers=null;P.rerolled=false;
  if(s==='draft'){const d=P.who.shift();if(choice&&choice.grow)P.note=growHero(heroOf(choice.cls),choice.grow);else if(choice)learnPower(choice.cls,choice.id,drop);else{RUN.gold+=SKIP_PAY;P.note=`Skipped: +${SKIP_PAY} gold.`;}}
  else if(choice&&choice.draft){P.steps.unshift('draft');P.who=[{party:true}];}
  else if(choice&&choice.weapon)P.note=gainWeapon(choice.weapon);
  else if((s==='relic'||s==='relic2'||s==='loot')&&choice)gainRelic(choice);
  saveGame();
}
function rerollDraft(){const P=RUN.pending;if(!P||P.rerolled||RUN.gold<REROLL_COST)return false;RUN.gold-=REROLL_COST;P.rerolled=true;P.offers=null;nextRewardStep();saveGame();return true;}
function gainRelic(r){if(RUN.relics.includes(r))return;RUN.relics.push(r);if(RUN.gear.length<2){RUN.gear.push(r);if(r==='heart')RUN.heroes.forEach(h=>h.hp+=8);}}
/* After the rewards: back to the map, or (after a boss) into the next region by way of a Camp. */
function finishRewards(){
  const P=RUN.pending;RUN.pending=null;
  if(P&&P.final){RUN.stage='won';try{localStorage.setItem(BEST_KEY,Math.max(+(localStorage.getItem(BEST_KEY)||0),RUN.stats.wins));}catch(e){}legacyEnd(true);clearSave();go(END_SCREEN);return;}
  if(P&&P.kind==='boss'){RUN.act++;RUN.map=genMap(RUN.act);RUN.pos=null;makeCamp({newAct:true});go(REST_SCREEN);return;}
  RUN.stage='map';saveGame();go(MAP_SCREEN);
}

/* ---------------- the smith (Heroes book 3.2) ---------------- */
const LADDER=[2,4,6,8,10,12];
function wup(id){RUN.wup=RUN.wup||{};return RUN.wup[id]||(RUN.wup[id]={s:WEAPONS[id].dice[1],runes:WEAPONS[id].runes.slice()});}
function smithMenu(id){
  const b=WEAPONS[id],w=weaponData(id),s=w.dice[1],i=LADDER.indexOf(s),out=[];
  if(i<LADDER.length-1){const to=LADDER[i+1];out.push({k:'temper',label:`Temper: d${s} to d${to}`,cost:to<=6?40:to===8?80:160});}
  if(i>1||(i===1&&isLight(b)&&!b.nomiss))out.push({k:'hone',label:`Hone: d${s} to d${LADDER[i-1]}`,cost:40});
  const dt=w.runes.some(r=>r==='flame'||r==='frost'||r==='radiant');
  if(w.runes.length<weaponSockets(b))for(const r of RUNE_KEYS){
    if(w.runes.includes(r))continue;if(r==='keen'&&s<6)continue;if(r==='twin'&&(!isLight(b)||w.dual))continue;if(dt&&(r==='flame'||r==='frost'||r==='radiant'))continue;
    out.push({k:'inscribe',rune:r,label:`Inscribe ${RUNE_NAME[r]}`,cost:60});}
  for(const r of w.runes)out.push({k:'erase',rune:r,label:`Remove ${RUNE_NAME[r]}`,cost:20});
  for(const o of out)o.cost=Math.round(o.cost*priceMul());
  return out;
}
function smithDo(id,o){
  if(RUN.gold<o.cost)return false;RUN.gold-=o.cost;const U=wup(id);
  if(o.k==='temper')U.s=LADDER[LADDER.indexOf(U.s)+1];
  if(o.k==='hone')U.s=LADDER[LADDER.indexOf(U.s)-1];
  if(o.k==='inscribe')U.runes.push(o.rune);
  if(o.k==='erase')U.runes.splice(U.runes.indexOf(o.rune),1);
  saveGame();return true;
}

/* ---------------- shop (Core Rules 4.8) ---------------- */
const POWER_PRICE={C:30,U:60,R:120};
function genShop(){
  const items=[];
  for(const r of relicOffers(2))items.push({kind:'relic',id:r,price:RELICS[r].price+rnd(20)-10});
  const hs=shuffle(living().slice()).slice(0,2);
  for(const h of hs){const o=draftOffers(h)[0];if(o)items.push({kind:'power',cls:o.cls,id:o.id,price:POWER_PRICE[POWERS[o.id].rar]||60});}
  for(const o of weaponOffers(2))items.push({kind:'weapon',id:o.weapon,price:WEAPON_PRICE[WEAPONS[o.weapon].tier]+rnd(16)-8});
  items.push({kind:'heal',price:30});
  for(const it of items)it.price=Math.round(it.price*priceMul());
  return {items};
}
function buyItem(it,drop){
  if(it.sold||RUN.gold<it.price)return false;
  if(it.kind==='power'&&!learnPower(it.cls,it.id,drop))return false;
  RUN.gold-=it.price;it.sold=true;sfx('coin');
  if(it.kind==='relic')gainRelic(it.id);
  if(it.kind==='weapon')toast(gainWeapon(it.id));
  if(it.kind==='heal')for(const h of living())h.hd=Math.min(hdMax(h),h.hd+2);
  saveGame();return true;
}

/* ---------------- checks (Core Rules 1.3) ---------------- */
const effAttr=(h,a)=>heroAttrs(h)[a]||0;
/* The living hero best at an attribute (Wounds count against them). */
function bestFor(a,cls){const L=cls?living().filter(h=>h.cls===cls):living();return L.slice().sort((x,y)=>(effAttr(y,a)-Math.min(3,y.wounds||0))-(effAttr(x,a)-Math.min(3,x.wounds||0)))[0];}
/* Roll an attribute die: 4+ succeeds, a kept 1 is a critical failure (not on a d20), a kept maximum explodes. */
function rollCheck(h,a,net){
  const d=attrDie(effAttr(h,a)),n=clamp(d.net+(net||0),-NET_CAP,NET_CAP),rolls=[];
  for(let i=0;i<=Math.abs(n);i++)rolls.push(1+rnd(d.s));
  const kept=n>=0?Math.max(...rolls):Math.min(...rolls),boom=kept===d.s&&d.s>1;
  const w=Math.min(3,h.wounds||0),tot=kept+(boom?rollEx(d.s):0)-w;
  const crit=kept===1&&d.s<20;
  return {cls:h.cls,who:CLASSES[h.cls].name,a,s:d.s,net:n,rolls,kept,boom,w,tot,crit,ok:!crit&&tot>=4};
}
/* Chance a check succeeds: the kept die must reach 4 after Wounds, or come up its maximum (it explodes past them). */
function checkChance(h,a,net){const d=attrDie(effAttr(h,a));const n=clamp(d.net+(net||0),-NET_CAP,NET_CAP),w=Math.min(3,h.wounds||0),k=Math.abs(n);
  const ok=f=>f>1&&(f===d.s||f-w>=4);let P=0;
  // P(kept die = f) for the highest (advantage) or lowest (disadvantage) of k+1 dice
  for(let f=1;f<=d.s;f++){const hi=Math.pow(f/d.s,k+1)-Math.pow((f-1)/d.s,k+1),lo=Math.pow((d.s-f+1)/d.s,k+1)-Math.pow((d.s-f)/d.s,k+1);if(ok(f))P+=n>=0?hi:lo;}
  return P;}
/* Chance that at least half the party succeeds at a group check. */
function groupChance(a){let D=[1];for(const h of living()){const p=checkChance(h,a,0),N=new Array(D.length+1).fill(0);D.forEach((q,i)=>{N[i]+=q*(1-p);N[i+1]+=q*p;});D=N;}
  const need=Math.ceil(living().length/2);return D.reduce((t,q,i)=>t+(i>=need?q:0),0);}
const helpNet=()=>living().length>1?1:0;

/* ---------------- events and road events (Core Rules 4.3, 4.6) ---------------- */
const HAZ_ROAD=[{name:'A Grass Fire',a:'F',text:'The wind turns, and a wall of fire races across the meadow toward you.'},
  {name:'The Sucking Bog',a:'M',text:'The path sinks into black, acid-stung mud. Every step pulls at your boots.'},
  {name:'The Lava Fissures',a:'F',text:'The ground splits. Lava wells up between the rocks you must cross.'}];
function roadEvent(k){
  const act=RUN.act,dmg=4+2*act;
  if(k===1)return {id:'road1',ill:'mist',title:'Ambush!',text:'Arrows hiss out of the brush. A horde of minions and their leader spring from cover.',opts:[{label:'Fight!',win:{fight:'ambush',text:'Back to back!'}}]};
  if(k===2){const H=HAZ_ROAD[act];return {id:'road2',ill:'bridge',title:H.name,text:H.text+' Every hero rolls: the party gets through if at least half succeed.',opts:[
    {label:`Push through (every hero rolls ${ATTR_SHORT[H.a]})`,group:H.a,win:{text:'You make it through.'},lose:{text:'You make it through, scorched and bruised.'},failHurt:dmg},
    {label:'Find a way around (each hero spends a hit die)',hd:1,win:{text:'The detour is long and tiring.'}}]};}
  if(k===3)return Object.assign({},TALKS_ROAD[act],{id:'road3'});
  if(k===4)return {id:'road4',ill:'field',title:'Something in the Grass',text:'A dead traveller\'s pack lies half hidden by the road.',opts:[
    {label:'Search the pack carefully',a:'F',win:{gold:15,weapon:true,text:'A purse, and a fine weapon wrapped in oilcloth.'},lose:{gold:15,text:'Just a few coins.'}},
    {label:'Read the traveller\'s journal',a:'W',win:{gold:15,relic:true,text:'The journal tells of a cache nearby. You find it.'},lose:{gold:15,text:'The ink has run. You take the coins.'}},
    {label:'Take the coins and go',win:{gold:15,text:'A few coins for the road.'}}]};
  if(k===5)return {id:'road5',ill:'well',title:'An Omen',text:'Crows wheel overhead in a pattern that seems to mean something.',opts:[
    {label:'Read the signs',a:'P',win:{omen:true,text:'You know what waits at the end of this road. Every hero starts the boss battle with 1 more momentum.'},lose:{text:'Just crows.'}},
    {label:'Walk on',win:{text:'The crows scatter.'}}]};
  return {id:'road6',ill:'hunter',title:'A Quiet Mile',text:'A sunny stretch of road, a stream, and nobody trying to kill you.',opts:[{label:'Rest a while',win:{heal:1,text:'Everyone catches their breath (a free roll of their hit die).'}}]};
}
const TALKS_ROAD=[
  {kind:'talk',ill:'merchant',title:'A Pedlar',text:'A pedlar with a heavy cart flags you down.',who:'The pedlar',request:'Sell you supplies at a fair price.',mood:1,pay:15,args:[{label:'Chat about the road ahead',a:'P'},{label:'Spot what she really needs',a:'W'},{label:'Haggle',a:'P',adv:-1}],
    results:[{text:'She rattles off before you can buy anything.'},{gold:-10,hdUp:1,text:'You buy food and bandages.'},{hdUp:1,text:'She gives you food and bandages for a story.'},{hdUp:2,gold:10,text:'She stocks you up, and pays you for news.'}]},
  {kind:'talk',ill:'pilgrim',title:'A Moor Guide',text:'A gaunt guide offers to show you the safe paths across the moor.',who:'The guide',request:'Guide you for a fair price.',mood:0,pay:20,args:[{label:'Ask about the barrows',a:'W'},{label:'Win him over',a:'P'},{label:'Threaten him',a:'M',adv:-1}],
    results:[{dmg:3,text:'He leads you into a bog and vanishes.'},{gold:-15,text:'He guides you, for a price.'},{hdUp:1,text:'He guides you to a sheltered camp.'},{hdUp:1,relic:true,text:'He shows you a hidden barrow, and its treasure.'}]},
  {kind:'talk',ill:'smith',title:'An Ash Trader',text:'A trader in a mask sells water and charms at a lonely well.',who:'The trader',request:'Share her water and her charms.',mood:-1,pay:30,args:[{label:'Offer news of the dragon',a:'W',adv:1},{label:'Bargain',a:'P'},{label:'Show your blades',a:'M',adv:-1}],
    results:[{text:'She draws her veil and turns away.'},{gold:-20,hdUp:1,text:'Water, at a price.'},{hdUp:2,text:'She shares her water freely.'},{hdUp:2,relic:true,text:'Water, and a charm against the fire.'}]},
];
function eventOf(E){return E.road?roadEvent(E.road):EVENTS.find(e=>e.id===E.id);}
/* Can the party take this option? Class options need the class; costs need the gold. */
function optOk(o){return (!o.cls||hasClass(o.cls))&&(!o.cost||RUN.gold>=o.cost);}
/* Who rolls an option, and with what. */
function optRoller(o){if(o.group||!o.a)return null;const h=bestFor(o.a,o.cls);return h?{h,net:(o.cls?1:0)+(o.adv||0)+helpNet()}:null;}
/* Apply an outcome. Returns the text lines and any follow-up (fight, relic, weapon, draft). */
function applyOutcome(out,roller){
  out=out||{};const L=[out.text||''],f={};
  const H=living();
  if(out.gold){RUN.gold=Math.max(0,RUN.gold+out.gold);L.push(out.gold>0?`{g:+${out.gold} gold.}`:`{r:${out.gold} gold.}`);}
  if(out.heal){for(const h of H)for(let i=0;i<out.heal;i++)h.hp=Math.min(effMaxHp(h),h.hp+healRoll(h));L.push(`{h:Every hero heals ${out.heal>1?out.heal+' rolls':'a roll'} of their hit die.}`);}
  if(out.hdUp){for(const h of H)h.hd=Math.min(hdMax(h),h.hd+out.hdUp);L.push(`{h:Every hero regains ${out.hdUp} hit ${out.hdUp>1?'dice':'die'}.}`);}
  if(out.hd){for(const h of H)h.hd=Math.max(0,h.hd-out.hd);L.push(`{r:Every hero spends ${out.hd} hit die.}`);}
  if(out.dmg){for(const h of H)h.hp=Math.max(1,h.hp-out.dmg);L.push(`{r:Every hero takes ${out.dmg} damage.}`);}
  if(out.hurt&&roller){roller.hp=Math.max(1,roller.hp-out.hurt);L.push(`{r:${CLASSES[roller.cls].name} takes ${out.hurt} damage.}`);}
  if(out.wound&&roller){roller.wounds=Math.min(3,(roller.wounds||0)+out.wound);L.push(`{r:${CLASSES[roller.cls].name} gains a Wound.}`);}
  if(out.vic){RUN.vic+=out.vic;L.push(`{g:+${out.vic} Victory.}`);}
  if(out.omen){RUN.omen=true;}
  if(out.relic){f.relic=true;L.push('{g:A relic awaits.}');}
  if(out.weapon){f.weapon=true;L.push('{g:A weapon awaits.}');}
  if(out.draft){f.draft=true;L.push('{g:A hero can draft a power.}');}
  if(out.fight){f.fight=out.fight;L.push('{r:A fight!}');}
  return {text:L.filter(Boolean).join('\n'),f};
}
function resolveEvent(o){
  legacyAdd({events:1});
  if(!optOk(o))return {text:o.cls&&!hasClass(o.cls)?'Nobody in the party can do that.':'You cannot afford it.',fail:true};
  if(o.cost)RUN.gold-=o.cost;
  let out=o.win,roll=null,roller=null,group=null;
  if(o.group){
    group=living().map(h=>rollCheck(h,o.group,0));const ok=group.filter(r=>r.ok).length;
    out=ok*2>=group.length?o.win:o.lose;
    if(o.failHurt)for(const r of group)if(!r.ok){const h=heroOf(r.cls);h.hp=Math.max(1,h.hp-o.failHurt);}
    if(group.some(r=>r.crit)){RUN.gold=Math.max(0,RUN.gold-10);}
  }else if(o.a&&!o.auto){
    const R=optRoller(o);roller=R.h;roll=rollCheck(R.h,o.a,R.net);roll.help=helpNet()>0;
    out=roll.ok?o.win:roll.crit?(o.crit||Object.assign({},o.lose,{hurt:((o.lose&&o.lose.hurt)||0)+4})):o.lose;
  }else if(o.cls){roller=bestFor('M',o.cls);out=o.win;}
  const A=applyOutcome(out,roller);
  if(group){const fails=group.filter(r=>!r.ok);if(fails.length&&o.failHurt)A.text+=`\n{r:${fails.map(r=>r.who).join(', ')} ${fails.length>1?'take':'takes'} ${o.failHurt} damage.}`;if(group.some(r=>r.crit))A.text+='\n{r:A critical failure: 10 gold is lost in the scramble.}';}
  const res=Object.assign({text:A.text,roll,group,label:o.label},A.f);
  saveGame();return res;
}
/* What follows an outcome: a fight, a reward step, or back to the map. */
function afterOutcome(r){
  if(r.fight){const n=curNode();return {battle:genEncounter(nodeF(n),r.fight==='ambush'?'ambush':'rout',{act:RUN.act,diff:'easy',party:living().length}),kind:'battle'};}
  const steps=[];if(r.relic)steps.push('relic2');if(r.weapon)steps.push('weapon');if(r.draft)steps.push('draft');
  if(steps.length){RUN.stage='reward';RUN.pending={steps,kind:'event',who:r.draft?[{party:true}]:[]};saveGame();return {reward:true};}
  RUN.stage='map';saveGame();return {map:true};
}

/* ---------------- dramatic tasks (Core Rules 4.4) ---------------- */
function taskEv(){return RUN.task&&EVENTS.find(e=>e.id===RUN.task.id);}
function startTask(ev){RUN.stage='task';RUN.task={id:ev.id,round:1,tokens:0,acted:[],help:0,last:null,done:null};saveGame();}
function taskApproaches(){return taskEv().approaches.filter(a=>!a.cls||hasClass(a.cls));}
function taskAttempt(cls,ap){
  const T=RUN.task,h=heroOf(cls);if(!T||T.done||T.acted.includes(cls)||!h)return null;
  const net=T.help+(ap.cls===cls?1:0);T.help=0;
  const r=rollCheck(h,ap.a,net);const g=r.crit?-1:r.ok?(r.boom?2:1):0;T.tokens=Math.max(0,T.tokens+g);
  T.acted.push(cls);T.last=Object.assign(r,{label:ap.label,g});advanceTask();saveGame();return r;
}
function taskHelp(cls){const T=RUN.task;if(!T||T.done||T.acted.includes(cls))return;T.help=1;T.acted.push(cls);T.last={who:CLASSES[cls].name,helpOnly:true};advanceTask();saveGame();}
function advanceTask(){
  const T=RUN.task,ev=taskEv();
  if(T.tokens>=ev.target){T.done='win';return;}
  if(living().every(h=>T.acted.includes(h.cls))){T.round++;T.acted=[];T.help=0;if(T.round>ev.rounds)T.done=ev.target-T.tokens<=2?'cost':'lose';}
}
function finishTask(){legacyAdd({events:1});const T=RUN.task,ev=taskEv();const out=T.done==='win'?ev.win:T.done==='cost'?ev.cost:ev.lose;const A=applyOutcome(out);RUN.task=null;return Object.assign({text:A.text},A.f);}

/* ---------------- negotiations (Core Rules 4.5) ---------------- */
function talkEv(){const T=RUN.talk;return T&&(T.road!=null?Object.assign({},TALKS_ROAD[T.road]):EVENTS.find(e=>e.id===T.id));}
function startTalk(ev){RUN.stage='talk';RUN.talk={id:ev.id,road:ev.id==='road3'?RUN.act:null,round:1,tokens:0,last:null,done:null};RUN.event=null;saveGame();}
const MOOD_NAME={'-1':'hostile','0':'wary','1':'friendly'};
function talkArgs(){return talkEv().args.filter(a=>!a.cls||hasClass(a.cls));}
function talkNet(arg){return talkEv().mood+(arg.adv||0)+helpNet();}
function talkArg(arg){
  const T=RUN.talk;if(!T||T.done)return null;const h=bestFor(arg.a,arg.cls);
  const r=rollCheck(h,arg.a,talkNet(arg));const g=r.crit?-1:r.ok?(r.boom?2:1):0;T.tokens=Math.max(0,T.tokens+g);
  T.last=Object.assign(r,{label:arg.label,g});T.round++;if(T.round>3)T.done=true;saveGame();return r;
}
function talkPay(){const T=RUN.talk,ev=talkEv();if(!T||T.done||RUN.gold<ev.pay)return false;RUN.gold-=ev.pay;T.tokens++;T.last={paid:ev.pay,g:1};T.round++;if(T.round>3)T.done=true;saveGame();return true;}
function talkStop(){if(RUN.talk)RUN.talk.done=true;saveGame();}
function finishTalk(){legacyAdd({events:1});const T=RUN.talk,ev=talkEv();const k=Math.min(3,T.tokens);const out=Object.assign({},ev.results[k]);if(k>=2)out.vic=(out.vic||0)+1;
  const A=applyOutcome(out);RUN.talk=null;return Object.assign({text:A.text},A.f);}

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
function loadSave(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(d&&d.RUN&&d.RUN.v===10)migrate10(d.RUN);if(d&&d.RUN&&d.RUN.v===11)migrate11(d.RUN);return d&&d.RUN&&d.RUN.v===12?d:null;}catch(e){return null;}}
/* Runs saved before encounter XP: heroes keep their levels and start each at the bottom of it; nothing is banked yet. */
/* Runs saved before rewards replaced levels: heroes keep the levels they have; banked XP is dropped. */
function migrate11(R){R.v=12;delete R.xpBank;for(const h of R.heroes){h.up=h.up||{};delete h.xp;}if(R.camp){R.camp.drafts=R.camp.drafts||[];}}
function migrate10(R){R.v=11;R.xpBank=0;for(const h of R.heroes)h.xp=xpAt(h.lvl);for(const n of Object.values(R.map.nodes)){if(n.type==='battle'&&!n.diff)n.diff='medium';if(n.type==='elite')n.diff='hard';}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
function continueRun(){
  const d=loadSave();if(!d)return;RUN=d.RUN;CTX={mode:'run',relics:RUN.gear,vic:RUN.vic,dread:RUN.dread||0};
  if(RUN.stage==='battle'){
    if(d.G&&d.G.v===4){G=d.G;HIST.length=0;G.await=true;pushSnap();B.onEnd=onRunBattleEnd;B.busy=false;B.pend=null;B.inspect=null;B.vkey='';B.gRef=null;for(const k in VIS)delete VIS[k];go(BATTLE_SCREEN);const u=playerUnit();if(u){B.pi=defaultPower(u);selfPend(u);}}
    else startRunBattle(RUN.enc,RUN.encKind);
  }
  else if(RUN.stage==='reward'&&RUN.pending)goReward();
  else if(RUN.stage==='shop')go(SHOP_SCREEN);
  else if(RUN.stage==='rest'&&RUN.camp)go(REST_SCREEN);
  else if(RUN.stage==='event'&&RUN.event)go(EVENT_SCREEN);
  else if(RUN.stage==='task'&&RUN.task)go(TASK_SCREEN);
  else if(RUN.stage==='talk'&&RUN.talk)go(TALK_SCREEN);
  else{RUN.stage='map';go(MAP_SCREEN);}
}

/* ---------------- the Legacy: what carries over between journeys ----------------
   A profile of every journey played: totals, the Dread levels won, a short history, and relics unlocked by milestones.
   Unlocked relics join the pool that treasure, elites, bosses, merchants and boons draw from. */
const LEGACY_KEY='rogue.legacy.v1';
let UNLOCK_ALL=false;
const LEGACY_UNLOCKS=[
  {relic:'drum',need:'Finish a journey, won or lost.',ok:L=>L.runs>=1},
  {relic:'tome',need:'Win 15 battles.',ok:L=>L.battles>=15},
  {relic:'kettle',need:'Defeat a boss.',ok:L=>L.bosses>=1},
  {relic:'seal',need:'Finish 8 events.',ok:L=>L.events>=8},
  {relic:'hood',need:'Win 5 elite battles.',ok:L=>L.elites>=5},
  {relic:'thread',need:'Reach the Ashen Waste.',ok:L=>L.bestAct>=2},
  {relic:'ember',need:'Slay 250 foes.',ok:L=>L.kills>=250},
  {relic:'chalice',need:'Finish 5 journeys.',ok:L=>L.runs>=5},
  {relic:'crown',need:'Slay the Ashen Dragon.',ok:L=>L.wins>=1},
];
let LEG=null;
function legacy(){
  if(LEG)return LEG;
  let d=null;try{d=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');}catch(e){}
  LEG=Object.assign({runs:0,wins:0,battles:0,kills:0,elites:0,bosses:0,events:0,bestAct:0,dreadMax:0,lastDread:0,best:0,unlocked:[],history:[]},d||{});
  checkUnlocks();
  return LEG;
}
function saveLegacy(){try{localStorage.setItem(LEGACY_KEY,JSON.stringify(legacy()));}catch(e){}}
function relicUnlocked(r){return UNLOCK_ALL||!RELICS[r].lock||legacy().unlocked.includes(r);}
/* New unlocks earned by the totals so far. */
function checkUnlocks(){const L=legacy(),got=[];for(const u of LEGACY_UNLOCKS)if(!L.unlocked.includes(u.relic)&&u.ok(L)){L.unlocked.push(u.relic);got.push(u.relic);}return got;}
function legacyAdd(o){
  if(typeof CTX==='undefined'||!CTX||(CTX.mode!=='run'&&CTX.mode!=='sim')||AUTOPLAY)return;
  const L=legacy();for(const k in o)L[k]=(L[k]||0)+o[k];L.bestAct=Math.max(L.bestAct,RUN?RUN.act:0);
  const got=checkUnlocks();saveLegacy();
  if(got.length&&RUN){(RUN.newUnlocks=RUN.newUnlocks||[]).push(...got);for(const r of got)toast(`Unlocked: ${RELICS[r].name}!`);}
}
/* A journey's score: deeds, times the Dread. */
function runScore(won){const S=RUN.stats;return Math.round(((S.wins||0)*10+(S.elites||0)*20+(S.bosses||0)*100+(S.kills||0)+(won?300:0))*(1+.25*(RUN.dread||0)));}
/* The end of a journey: totals, the Dread ladder, the history and the unlocks. Shown on the end screen. */
function legacyEnd(won){
  if(AUTOPLAY||!RUN||RUN.legacyDone)return;RUN.legacyDone=true;
  const L=legacy(),score=runScore(won),d=RUN.dread||0;
  L.runs++;if(won)L.wins++;L.bestAct=Math.max(L.bestAct,RUN.act+(won?1:0));
  let dreadUp=false;if(won&&d>=L.dreadMax&&L.dreadMax<DREAD.length){L.dreadMax=d+1;dreadUp=true;}
  const best=score>(L.best||0);if(best)L.best=score;
  L.history.unshift({won,act:RUN.act,dread:d,score,battles:RUN.stats.wins,kills:RUN.stats.kills,pw:RUN.heroes.reduce((a,h)=>a+h.powers.length,0),t:Date.now()});
  L.history=L.history.slice(0,12);
  const got=(RUN.newUnlocks||[]).concat(checkUnlocks());
  saveLegacy();
  RUN.end={score,best,dreadUp,unlocks:[...new Set(got)]};
}

/* ---------------- boons: a gift (or a bargain) at the start of a journey ----------------
   Two gifts and one bargain, pick one. Each turns into reward steps (run through the reward screen) or a direct effect. */
const BOONS={
  cache:{name:'An Old Cache',desc:'Choose 1 of 2 relics.'},
  purse:{name:"A Patron's Purse",desc:'+100 gold.'},
  tutor:{name:"A Master's Lesson",desc:'{H} drafts a power, with at least one Rare.'},
  armory:{name:'The Armory',desc:'Choose 1 of 2 weapons.'},
  veteran:{name:'Veterans',desc:'Every hero gains max health equal to their hit die (d10: +10).'},
  smith:{name:"The Smith's Favour",desc:"{H}'s weapon is tempered one step."},
  pact:{name:'A Dark Pact',bargain:true,desc:'Choose 1 of 3 relics. Every hero starts with a Wound.'},
  hoard:{name:'A Cursed Hoard',bargain:true,desc:'+250 gold. Every hero starts with a Wound.'},
  oath:{name:'A Blood Oath',bargain:true,desc:'Every hero drafts a power, with at least one Uncommon. You start with no gold.'},
};
function boonOffers(){
  const good=shuffle(['cache','purse','tutor','armory','veteran','smith']).slice(0,2),bad=pick(['pact','hoard','oath']);
  return good.concat([bad]).map(id=>({id,cls:pick(ORDER)}));
}
function boonText(b){return BOONS[b.id].desc.replace('{H}',CLASSES[b.cls].name);}
/* Take a boon. Returns 'reward' when it opens the reward screen, otherwise 'map'. */
function takeBoon(b){
  RUN.boons=null;const steps=[],who=[];
  const wound=()=>{for(const h of RUN.heroes)h.wounds=Math.min(2,(h.wounds||0)+1);};
  switch(b&&b.id){
    case 'cache':steps.push('relic2');break;
    case 'purse':RUN.gold+=100;break;
    case 'tutor':steps.push('draft');who.push({cls:b.cls,min:'R'});break;
    case 'armory':steps.push('weapon');break;
    case 'veteran':for(const h of RUN.heroes)growHero(h,'vigor');break;
    case 'smith':{const h=heroOf(b.cls),o=smithMenu(h.weapon).find(q=>q.k==='temper');if(o){wup(h.weapon).s=LADDER[LADDER.indexOf(wup(h.weapon).s)+1];}break;}
    case 'pact':steps.push('relic');wound();break;
    case 'hoard':RUN.gold+=250;wound();break;
    case 'oath':RUN.gold=0;for(const h of RUN.heroes){steps.push('draft');who.push({cls:h.cls,min:'U'});}break;
  }
  if(steps.length){RUN.stage='reward';RUN.pending={steps,who,kind:'boon'};saveGame();return 'reward';}
  RUN.stage='map';saveGame();return 'map';
}
