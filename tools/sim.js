#!/usr/bin/env node
/* Rogue Tactics journey simulator.
   Plays whole journeys headlessly with the heroes' autoplay AI and reports win rates, where runs end,
   how worn down the party is before each boss, and how often winning runs picked each power.
   Usage: node tools/sim.js [runs=200] [seed=1] [--json]            */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const RUNS=+(process.argv[2]||200),SEED0=+(process.argv[3]||1),JSON_OUT=process.argv.includes('--json');
const root=path.join(__dirname,'..');

/* ---- load the game rules into a sandbox that looks enough like a browser ---- */
const store={};
const ctx={console,performance:{now:()=>Date.now()},setTimeout,clearTimeout,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
  window:{}};
ctx.globalThis=ctx;vm.createContext(ctx);
let rngState=1;
vm.runInContext(`Math.random=()=>{let t=(globalThis.__seed+=0x6D2B79F5)|0;t=Math.imul(t^t>>>15,1|t);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};globalThis.__seed=1;`,ctx);
for(const f of['data.js','engine.js','run.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',f),'utf8'),ctx,{filename:f});
vm.runInContext(`Object.assign(TUNE,${process.env.TUNE||'{}'});`,ctx);
// MONS='{"lich":{"hp":100}}' overrides monster stats, for tuning one foe at a time
vm.runInContext(`for(const [k,v] of Object.entries(${process.env.MONS||'{}'}))Object.assign(MON[k],v);`,ctx);
// PRE='...' runs any code after the data loads, e.g. to try new power costs
if(process.env.PRE)vm.runInContext(process.env.PRE,ctx);
// INSTR=file.js loads instrumentation code into the sandbox; __I is printed at the end
if(process.env.INSTR){vm.runInContext(fs.readFileSync(process.env.INSTR,'utf8'),ctx);process.on('exit',()=>console.log('INSTR',JSON.stringify(vm.runInContext('globalThis.__I',ctx))));}
// USES=1 prints how often the autoplay heroes used each power
if(process.env.USES){vm.runInContext(`globalThis.__USES={};const __up=usePower;usePower=async function(u,p,T){if(u.side==='hero')__USES[p.name]=(__USES[p.name]||0)+1;return __up(u,p,T);};`,ctx);
  process.on('exit',()=>{const U=vm.runInContext('__USES',ctx);console.log('POWER USES',Object.entries(U).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(', '));});}
vm.runInContext(`
CTX={mode:'sim',relics:[]};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function go(){} function goReward(){} function toast(){} function sfx(){}
const _roundEnd=roundEnd;roundEnd=async function(){if(G.round>=30){G.over=true;G.result='lose';return;}return _roundEnd();};
`,ctx);

/* ---- one journey ---- */
vm.runInContext(`
AUTOPLAY=true;
async function simBattle(enc,kind){
  CTX={mode:'sim',relics:RUN.gear,vic:RUN.vic};RUN.encKind=kind;
  for(const h of living())if(h.hp<=0)h.hp=1;
  setupBattle(enc,living());
  if(kind==='boss'&&RUN.omen){RUN.omen=false;for(const u of G.units)if(u.side==='hero'&&u.kind==='pc')u.mom=Math.min(5,u.mom+1);}
  let guard=0;await nextTurn();
  while(!G.over&&guard++<5){await nextTurn();}
  const hs=G.units.filter(u=>u.side==='hero'&&u.kind==='pc');
  globalThis.__last={hpEnd:hs.reduce((a,h)=>a+Math.max(0,h.dead?0:h.hp),0)/hs.reduce((a,h)=>a+h.maxHp,0),rounds:G.round,
    why:G.result==='win'?'':hs.every(h=>h.dead)?'wipe':G.round>=30?'timeout':'objective',down:hs.filter(h=>h.dead).length,combos:G.combos||0};
  if(!G.over)return 'lose';
  return G.result;
}
function hpFrac(){let a=0,b=0;for(const h of living()){a+=Math.max(0,h.hp);b+=effMaxHp(h);}return b?a/b:0;}
/* Catch Breath before a fight when a hero is below 60%. */
function simCatch(){for(const h of living())while(h.hd>0&&h.hp<effMaxHp(h)*.6)catchBreath(h);}
function takeOffers(P,S){
  let g=0;
  while(P&&P.steps&&P.steps.length&&g++<40){
    const s=nextRewardStep();if(!s)break;
    if(s==='summary'){takeReward(null);continue;}
    const o=P.offers;const choice=o&&o.length?o[Math.floor(Math.random()*o.length)]:null;
    let drop=null;
    if(s==='draft'&&choice){const h=heroOf(choice.cls);if(h.powers.length>=slotsOf(h))drop=h.powers[Math.floor(Math.random()*h.powers.length)];
      S.picks.push(choice.id);(S.offers=S.offers||[]).push({o:o.map(x=>x.id),p:choice.id});}
    takeReward(choice,drop);
  }
  for(const h of living()){const best=RUN.stash.filter(id=>WEAPONS[id].cls===h.cls).sort((a,b)=>WEAPONS[b].tier-WEAPONS[a].tier)[0];if(best&&WEAPONS[best].tier>WEAPONS[h.weapon].tier&&!RUN.wup[h.weapon])equipWeapon(h.cls,best);}
  RUN.pending=null;
}
function simCamp(S){
  (S.restHp=S.restHp||[]).push(+hpFrac().toFixed(2));
  for(const h of living())if(h.wounds>=2)tendWound(h.cls);
  if(breakCamp()==='reward')takeOffers(RUN.pending,S);
  RUN.stage='map';
}
async function simFollow(F,S,n){
  if(F.battle){const r=await simBattle(F.battle.enc||F.battle,'battle');S.battles++;const L=globalThis.__last;
    (S.fights=S.fights||[]).push({act:RUN.act,kind:'battle',type:F.battle.type,foes:[],hp:+L.hpEnd.toFixed(2),r:L.rounds,down:L.down,why:L.why,combos:L.combos});
    if(r!=='win'){S.diedAt='event@'+RUN.act;S.why=L.why;return false;}resolveVictory();takeOffers(RUN.pending,S);}
  else if(F.reward)takeOffers(RUN.pending,S);
  return true;
}
async function simRun(seed){
  globalThis.__seed=seed*7919+13;
  newRun();
  const S={seed,result:'lose',act:0,floor:0,battles:0,picks:[],bossHp:[],bossLvl:[],bossGold:[],hpAfter:[],diedAt:null,shopSpent:0,goldEnd:0,weapons:[],relics:[],deaths:0,wounds:[]};
  while(true){
    simCatch();
    const av=availableNodes().map(id=>RUN.map.nodes[id]);
    let n;const hf=hpFrac();
    const tired=living().some(h=>h.wounds>=2)||living().reduce((a,h)=>a+h.hd,0)<living().length;
    const want=hf<.45||tired?['rest','shop','event','road','treasure','battle','elite']:hf<.7?['rest','treasure','event','shop','road','battle','elite']:null;
    if(want){for(const t of want){const c=av.filter(q=>q.type===t);if(c.length){n=c[Math.floor(Math.random()*c.length)];break;}}}
    if(!n)n=av[Math.floor(Math.random()*av.length)];
    S.floor=n.f;S.act=RUN.act;
    if(n.type==='battle'||n.type==='elite'||n.type==='boss'){
      if(n.type==='boss'){S.bossHp.push(+hpFrac().toFixed(2));S.bossLvl.push(living().map(h=>h.lvl).join(','));S.bossGold.push(RUN.gold);}
      const A=arrive(n.id);const enc=A.battle;const type=enc.type;
      (S.preHp=S.preHp||[]).push({act:RUN.act,kind:n.type,hp:+hpFrac().toFixed(2)});
      const r=await simBattle(enc,n.type);S.battles++;
      const L=globalThis.__last;(S.fights=S.fights||[]).push({act:RUN.act,kind:n.type,type,twist:enc.twist,foes:enc.enemies.map(e=>e.type||'rival'),hp:+L.hpEnd.toFixed(2),r:L.rounds,down:L.down,why:L.why,combos:L.combos});
      if(r!=='win'){S.diedAt=(n.type==='boss'?'boss':n.type)+'@'+RUN.act+':'+type;S.why=L.why;break;}
      resolveVictory();S.hpAfter.push(+hpFrac().toFixed(2));S.deaths=RUN.heroes.filter(h=>h.dead).length;
      const P=RUN.pending,final=P&&P.final,boss=n.type==='boss';takeOffers(P,S);
      if(final){S.result='win';break;}
      if(boss){RUN.act++;RUN.map=genMap(RUN.act);RUN.pos=null;makeCamp({newAct:true});simCamp(S);}
      if(!living().length)break;
      continue;
    }
    const A=arrive(n.id);
    if(n.type==='rest'){simCamp(S);}
    else if(n.type==='shop'){
      const items=RUN.shop.items;const g0=RUN.gold;
      if(living().reduce((a,h)=>a+h.hd,0)<living().length*1.5){const it=items.find(i=>i.kind==='heal');if(it)buyItem(it);}
      for(const it of shuffle(items.filter(i=>i.kind==='weapon')))if(RUN.gold>=it.price&&hasClass(WEAPONS[it.id].cls)&&WEAPONS[it.id].tier>WEAPONS[heroOf(WEAPONS[it.id].cls).weapon].tier)buyItem(it);
      for(const it of shuffle(items.filter(i=>i.kind!=='heal'&&i.kind!=='weapon')))if(RUN.gold>=it.price&&Math.random()<.75){const h=it.kind==='power'?heroOf(it.cls):null;const drop=h&&h.powers.length>=slotsOf(h)?h.powers[0]:null;if(buyItem(it,drop)&&it.kind==='power')S.picks.push(it.id);}
      // the smith: temper a random hero's weapon if there is gold to spare
      for(const h of shuffle(living().slice())){const m=smithMenu(h.weapon).find(o=>o.k==='temper');if(m&&RUN.gold>=m.cost+20){smithDo(h.weapon,m);break;}}
      S.shopSpent+=g0-RUN.gold;RUN.shop=null;RUN.stage='map';
      takeOffers({steps:[]},S);
    }else if(n.type==='treasure'){takeOffers(RUN.pending,S);}
    else if(A&&A.screen==='event'){
      const ev=eventOf(RUN.event);const opts=ev.opts.filter(optOk);
      const o=opts.find(q=>q.cls&&q.auto)||opts[Math.floor(Math.random()*opts.length)];
      const res=resolveEvent(o);RUN.event=null;
      if(!await simFollow(afterOutcome(res),S,n))break;
    }else if(A&&A.screen==='task'){
      let g=0;while(!RUN.task.done&&g++<40){for(const h of living()){if(RUN.task.done||RUN.task.acted.includes(h.cls))continue;
        const ap=taskApproaches().sort((a,b)=>checkChance(h,b.a,b.cls===h.cls?1:0)-checkChance(h,a.a,a.cls===h.cls?1:0))[0];taskAttempt(h.cls,ap);}}
      const res=finishTask();if(!await simFollow(afterOutcome(res),S,n))break;
    }else if(A&&A.screen==='talk'){
      let g=0;while(!RUN.talk.done&&g++<5){const args=talkArgs();const arg=args.sort((a,b)=>checkChance(bestFor(b.a,b.cls),b.a,talkNet(b))-checkChance(bestFor(a.a,a.cls),a.a,talkNet(a)))[0];talkArg(arg);}
      const res=finishTalk();if(!await simFollow(afterOutcome(res),S,n))break;
    }
    RUN.stage='map';
    if(!living().length)break;
  }
  S.goldEnd=RUN.gold;const LV=RUN.heroes;S.lvlEnd=LV.reduce((a,h)=>a+h.lvl,0)/LV.length;S.weapons=LV.map(h=>h.weapon);S.relics=RUN.gear.slice();S.lvls=LV.map(h=>h.lvl);
  S.deaths=RUN.heroes.filter(h=>h.dead).length;S.woundsEnd=RUN.heroes.reduce((a,h)=>a+(h.wounds||0),0);
  return S;
}
`,ctx);

(async()=>{
  const out=[];const t0=Date.now();
  for(let i=0;i<RUNS;i++){const S=await vm.runInContext(`simRun(${SEED0+i})`,ctx);out.push(S);
    if(!JSON_OUT&&(i+1)%25===0)process.stderr.write(`${i+1}/${RUNS} runs, ${((Date.now()-t0)/1000).toFixed(0)}s\n`);}
  if(JSON_OUT){console.log(JSON.stringify(out));return;}
  report(out);
})();

function report(R){
  const n=R.length,wins=R.filter(r=>r.result==='win');
  const pct=v=>(100*v).toFixed(0)+'%';
  console.log(`\nRUNS ${n}   WIN RATE ${pct(wins.length/n)}`);
  const died={};for(const r of R)if(r.diedAt){const k=r.diedAt.split(':')[0];died[k]=(died[k]||0)+1;}
  console.log('Runs ended at:',Object.entries(died).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${pct(v/n)}`).join(', '));
  const reach=[0,1,2].map(a=>R.filter(r=>r.bossHp.length>a).length);
  console.log('Reached boss of act 1/2/3:',reach.map(v=>pct(v/n)).join(' / '),'   beat act 1/2/3:',[0,1,2].map(a=>pct(R.filter(r=>r.act>a||r.result==='win').length/n)).join(' / '));
  for(let a=0;a<3;a++){const hs=R.filter(r=>r.bossHp.length>a);if(!hs.length)continue;
    const avg=k=>hs.reduce((s,r)=>s+r[k][a],0)/hs.length;
    const lv=hs.reduce((s,r)=>s+r.bossLvl[a].split(',').reduce((x,y)=>x+ +y,0)/4,0)/hs.length;
    console.log(`Act ${a+1} boss: party health on arrival ${pct(avg('bossHp'))}, gold ${avg('bossGold').toFixed(0)}, average hero level ${lv.toFixed(1)}`);}
  {const W=R.filter(r=>r.result==='win');if(W.length)console.log(`Average hero level at the end of a won journey: ${(W.reduce((s,r)=>s+r.lvlEnd,0)/W.length).toFixed(1)}`);}
  console.log(`Heroes dead per run: ${(R.reduce((s,r)=>s+r.deaths,0)/n).toFixed(2)}   Wounds at the end: ${(R.reduce((s,r)=>s+(r.woundsEnd||0),0)/n).toFixed(1)}`);
  const hpa=R.flatMap(r=>r.hpAfter);console.log(`Party health after a battle (avg): ${pct(hpa.reduce((a,b)=>a+b,0)/hpa.length)}   shop spend/run: ${(R.reduce((s,r)=>s+r.shopSpent,0)/n).toFixed(0)}   gold left at end: ${(R.reduce((s,r)=>s+r.goldEnd,0)/n).toFixed(0)}`);
  const W={};for(const r of R)if(r.why)W[r.why]=(W[r.why]||0)+1;console.log('Loss reasons:',JSON.stringify(W));
  for(let a=0;a<3;a++)for(const k of['battle','elite','boss']){const F=R.flatMap(r=>(r.fights||[]).filter(f=>f.act===a&&f.kind===k));if(!F.length)continue;
    const won=F.filter(f=>!f.why);console.log(`  act ${a+1} ${k.padEnd(6)} n=${String(F.length).padStart(4)}  lost ${pct(1-won.length/F.length).padStart(4)}  health left when won ${pct(won.reduce((s,f)=>s+f.hp,0)/Math.max(1,won.length)).padStart(4)}  heroes down ${(won.reduce((s,f)=>s+f.down,0)/Math.max(1,won.length)).toFixed(2)}  rounds ${(won.reduce((s,f)=>s+f.r,0)/Math.max(1,won.length)).toFixed(1)}  combos/round ${(F.reduce((s,f)=>s+(f.combos||0),0)/Math.max(1,F.reduce((s,f)=>s+f.r,0))).toFixed(2)}`);}
  const mt={};for(const r of R)if(r.diedAt){const m=r.diedAt.split(':')[1];if(m)mt[m]=(mt[m]||0)+1;}
  console.log('Deaths by mission:',Object.entries(mt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(', '));
  const rh=R.flatMap(r=>r.restHp||[]);console.log(`Party health on reaching a campfire: ${pct(rh.reduce((a,b)=>a+b,0)/Math.max(1,rh.length))}`);
  for(let a=0;a<3;a++){const ph=R.flatMap(r=>(r.preHp||[]).filter(q=>q.act===a&&q.kind==='battle').map(q=>q.hp));if(ph.length)console.log(`  act ${a+1}: party health going into a normal battle ${pct(ph.reduce((x,y)=>x+y,0)/ph.length)}`);}
  // power balance, fair version: among runs offered a power, win rate when it was taken vs passed over
  {const T={};for(const r of R){const seen=new Set();for(const e of r.offers||[])for(const id of e.o){if(seen.has(id))continue;seen.add(id);const t=T[id]=T[id]||{p:0,pw:0,s:0,sw:0};if(e.p===id){t.p++;if(r.result==='win')t.pw++;}else{t.s++;if(r.result==='win')t.sw++;}}}
   const rows=Object.entries(T).filter(([k,t])=>t.p>=8&&t.s>=8).map(([k,t])=>({k,d:t.pw/t.p-t.sw/t.s,p:t.p,wp:t.pw/t.p,ws:t.sw/t.s})).sort((a,b)=>b.d-a.d);
   console.log('\nPOWER EFFECT (first time offered: win rate if taken vs passed over)');
   for(const r of rows)console.log(`  ${r.k.padEnd(12)} taken ${String(r.p).padStart(4)} win ${pct(r.wp).padStart(4)}  passed win ${pct(r.ws).padStart(4)}  effect ${(r.d>=0?'+':'')+(100*r.d).toFixed(0)}pts${r.d>.15?'  <-- strong':r.d<-.12?'  <-- weak':''}`);}
  return;
  // power balance: win rate of runs that picked a power vs the base rate
  const base=wins.length/n;const P={};
  for(const r of R){for(const id of new Set(r.picks)){(P[id]=P[id]||{n:0,w:0,depth:0});P[id].n++;if(r.result==='win')P[id].w++;P[id].depth+=r.bossHp.length;}}
  const rows=Object.entries(P).map(([id,v])=>({id,n:v.n,wr:v.w/v.n,depth:v.depth/v.n})).sort((a,b)=>b.wr-a.wr);
  const avgDepth=R.reduce((s,r)=>s+r.bossHp.length,0)/n;
  console.log(`\nPOWER PICKS (win rate when picked; base ${pct(base)}; bosses reached, base ${avgDepth.toFixed(2)})`);
  for(const r of rows)if(r.n>=Math.max(5,n*.03))console.log(`  ${r.id.padEnd(12)} picked ${String(r.n).padStart(4)}  win ${pct(r.wr).padStart(4)}  bosses ${r.depth.toFixed(2)}${r.wr>base*1.6&&r.wr-base>.08?'  <-- strong':r.wr<base*.5&&base-r.wr>.08?'  <-- weak':''}`);
}
