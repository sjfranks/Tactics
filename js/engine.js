'use strict';
/* =====================================================================
   ROGUE TACTICS — rules engine. No drawing here: the UI hooks in through H.
   ===================================================================== */
/* Game rules draw from RNG. The tutorial swaps in a seeded generator so it plays out the same way every time. */
let RNG=Math.random;
const rnd=n=>Math.floor(RNG()*n);
function seedRng(seed){let a=seed>>>0;RNG=()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function unseedRng(){RNG=Math.random;}
const pick=a=>a[rnd(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const K=(x,y)=>y*COLS+x,KX=k=>k%COLS,KY=k=>Math.floor(k/COLS);
/* Distances are measured between footprints, so a 2×2 creature is beside anything touching any of its squares. */
const SZ=u=>(u&&u.sz)||1;
const gapX=(a,b)=>Math.max(0,a.x-(b.x+SZ(b)-1),b.x-(a.x+SZ(a)-1)),gapY=(a,b)=>Math.max(0,a.y-(b.y+SZ(b)-1),b.y-(a.y+SZ(a)-1));
const man=(a,b)=>gapX(a,b)+gapY(a,b);
const cheb=(a,b)=>Math.max(gapX(a,b),gapY(a,b));
const inB=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS;
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const tv=(arr,t)=>arr?(arr[t-1]||0):0;
const _n=()=>{},_a=async()=>{};
const H={dice:_a,rolls:_a,ask:async()=>true,step:_a,strike:_a,area:_a,tele:_a,death:_a,banner:_a,pause:_a,turn:_a,end:_a,pop:_n,result:_n,sfx:_n,upd:_n,spawn:_n,save:_n,combo:_n};
let G=null,CTX={mode:'run',relics:[]};
let AUTOPLAY=false;
const HIST=[];

/* ---------------- DICE ---------------- */
/* ---------------- ATTRIBUTE DICE (Core Rules 1.2–1.5) ----------------
   An attribute's number sets its die: 0 = d4 with disadvantage, 1 = d4, 2 = d6, 3 = d8, 4 = d10, 5 = d12, 6 = d20.
   A check or save succeeds on a total of 4 or more; a maximum explodes. */
const ATTR_DIE=[4,4,6,8,10,12,20];
function attrDie(v){v=clamp(Math.round(v||0),0,6);return {s:ATTR_DIE[v],net:v===0?-1:0};}
function rollEx(s){const r=1+rnd(s);LASTEX=[r];return r;}
/* ---------------- SHOWN ROLLS ----------------
   Every roll in a battle is queued (showRoll) and thrown as dice on the battle screen (H.rolls) before its effect lands.
   Dice: {s, v, k} with k 'key' (an ordinary die), 'crit' (a die on its top number: +1 Mult) or 'def' (armour). */
let LASTEX=[];const ROLLQ=[];
function showRoll(o){if(AUTOPLAY||!G||(typeof CTX!=='undefined'&&CTX&&CTX.mode==='sim'))return;ROLLQ.push(o);}
const exDice=(s,faces,k)=>faces.map(v=>({s,v,k:k||'key'}));
function rollExF(s){const t=rollEx(s);return {t,f:LASTEX.slice()};}
function dieList(r){return r.dice.map((v,i)=>({s:i<r.d.n?r.d.s:(r.d.xs||r.d.s),v,k:r.critAt[i]?'crit':'key'}));}
/* The caption under an attack's title: where its Mult comes from. */
function multCap(X){const L=(X.M||[]).map(([l,v])=>`+${v} ${l}`).concat((X.Xm||[]).map(([l,v])=>`×${v} ${l}`));return L.length?'MULT: '+L.join(', '):null;}
/* "4 +3 STR −1 armour = 6 × 2 = 12": chips, then Mult, then damage. */
function atkVerdict(r,X){if(X.immune)return 'IMMUNE: no damage';
  const steps=(X.C||[]).map(([l,v])=>` ${v>0?'+':'−'}${Math.abs(v)} ${l}`).join('');
  return `${r.total}${steps} = ${X.chips} DAMAGE × ${X.mult} MULT${X.xm!==1?' ×'+X.xm:''} = ${X.d}`;}
function exAvg(s){return (s+1)/2;}
function dieSucc(s,net){const p=s>=4?(s-3)/s:0;const k=Math.abs(net);return net>=0?1-Math.pow(1-p,k+1):Math.pow(p,k+1);}
/* The class key stat: the attribute every attack and attacking power adds once (Core Rules 3.5). */
const keyA=u=>u&&u.kind==='pc'&&CLASSES[u.cls]?CLASSES[u.cls].prime:null;
/* Hit dice and armour by class (Heroes book): [DEF die, advantage from a shield, or disadvantage with no armour]. */
const HD={fighter:10,rogue:8,wizard:6,cleric:8};
const HERO_DEF={fighter:[8,1],rogue:[4,0],wizard:[4,0],cleric:[6,1]};
const bloodied=u=>!!u&&u.hp<=u.maxHp/2;
/* Wounds (Core Rules 2.4): -1 per Wound to attack totals, saves and checks, up to -3. Nerves of Steel ignores one. */
const woundsOf=u=>u&&u.kind==='pc'?Math.max(0,Math.min(3,u.wounds||0)-(u.pas&&u.pas.nerves?1:0)):0;
/* Passive powers (Heroes book 2.1) live in u.pas; resonance (2.4) is counted per tag across the party at battle start. */
const hasP=(u,id)=>!!u&&!!u.pas&&!!u.pas[id];
/* Resonance is retired (v0.25): tags only group powers now. */
function resLv(tag,u){return 0;}
function prevHero(u){if(!G||!G.order)return null;const i=G.order.indexOf(u.id);if(i<0)return null;
  for(let k=1;k<G.order.length;k++){const o=U(G.order[(i-k+G.order.length)%G.order.length]);if(o&&o!==u&&o.kind==='pc'&&o.side===u.side&&live(o))return o;}return null;}
/* A hero set up a foe (or blessed an ally): Opening Gambit and Domino listen for this. */
function setupMade(src,t){
  if(!src||src.kind!=='pc'||!G)return;
  if(hasP(src,'gambit')&&!src.gambitUsed){src.gambitUsed=true;addMom(src,1);H.pop(src,'+1 ◆','res');}
  const S=G.setupT||(G.setupT={});if(!S[src.id]||S[src.id].r!==G.round)S[src.id]={r:G.round,ids:[]};if(t&&t.side!==src.side)S[src.id].ids.push(t.id);
}
/* The roll, spelled out: "1d8 (adv ×2: 3/7 → 7) + 3 Strength = 10: Hit + 3 sneak = 13 − 2 armour = 11".
   X comes from pcDmgX/monDmgX: its head steps (the attribute) come before the result, the rest after any extra dice. */
function dieFaces(r){
  const k=Math.abs(r.net);
  const p=r.stag?`${r.prim} staggered`:r.tries.length>1?`${r.net>0?'adv':'dis'}${k>1?' ×'+k:''}: ${r.tries.join('/')} → ${r.prim}`:String(r.prim);
  return p+(r.rest.length?', '+r.rest.join(', '):'');
}
/* The game log keeps the whole sum: "2d4 [4 1] +2 Hook Chain = 7 damage × 3 Mult (+1 crit, +1 Sneak Attack) = 24". */
function dmgLog(r,X){
  if(!r)return X&&X.d?`${X.d} damage`:'';
  const why=[...(X.M||[]).map(([l,v])=>`+${v} ${l}`),...(X.Xm||[]).map(([l,v])=>`×${v} ${l}`)].join(', ');
  return `${diceText(r.d)} [${r.dice.join(' ')}]: ${atkVerdict(r,X)}${why?` (Mult ${why})`:''}`;
}
function diceLog(r){const kept=r.stag?`[${r.prim}]`:r.tries.length>1?`[${r.tries.join('/')}→${r.prim}]`:`[${r.prim}]`;return `${diceText(r.d)}: ${kept}${r.rest.length?' '+r.rest.join(' '):''}${r.boom.length?', one more '+r.boom.join(' '):''} = ${r.total}: ${RESULT[r.res-1]}${r.stag?' (staggered)':''}`;}

/* ---------------- STATE HELPERS ---------------- */
const U=id=>G.units.find(u=>u.id===id);
const live=u=>!!u&&!u.dead&&!u.gone;
const covers=(u,x,y)=>x>=u.x&&y>=u.y&&x<u.x+SZ(u)&&y<u.y+SZ(u);
const unitAt=(x,y)=>G.units.find(u=>live(u)&&covers(u,x,y));
/* The squares a unit would fill with its top-left corner at x,y. */
function foot(u,x,y){const n=SZ(u);if(n===1)return [{x,y}];const o=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++)o.push({x:x+i,y:y+j});return o;}
const center=u=>({x:u.x+(SZ(u)-1)/2,y:u.y+(SZ(u)-1)/2});
const allies=u=>G.units.filter(o=>live(o)&&o.side===u.side);
const foesOf=u=>G.units.filter(o=>live(o)&&o.side!==u.side&&!o.caged);
const fighters=u=>foesOf(u).filter(o=>!o.object);
const heroes=()=>G.units.filter(u=>u.side==='hero'&&u.kind==='pc'&&live(u));
const mon=u=>MON[u.type];
const hasR=(r,u)=>(!u||u.side==='hero')&&!!CTX&&CTX.relics.includes(r);
const Tt=(x,y)=>G.tiles[K(x,y)];
function obAt(x,y){const t=Tt(x,y);return t.ob||(G.walls[K(x,y)]>0?'icewall':null);}
const blocked=(x,y)=>!!obAt(x,y);
function tallAt(x,y){const o=obAt(x,y);return !!o&&!!OBST[o].tall;}
const isHighT=(x,y)=>Tt(x,y).ter==='high';
const difficult=(x,y)=>{const t=Tt(x,y).ter;return t==='rough'||t==='water';};
function stepCost(u,x,y){return foot(u,x,y).some(t=>inB(t.x,t.y)&&difficult(t.x,t.y))&&!(u.side==='hero'&&hasR('fenboots'))?2:1;}
function immuneFire(u){return (u.kind==='mon'&&mon(u).fireproof)||(u.side==='hero'&&hasR('scale'));}
function hazDmg(u,h){
  if(!h)return 0;if(h.t==='trap'&&h.side===u.side)return 0;
  if((h.t==='fire'||h.t==='lava')&&immuneFire(u))return 0;
  return (HAZ[h.t].dmg?HAZ[h.t].dmg+G.act:0)+(HAZ[h.t].st.root?3:0);
}
function hazCost(u,x,y){let m=0;for(const t of foot(u,x,y))if(inB(t.x,t.y))m=Math.max(m,hazDmg(u,Tt(t.x,t.y).haz));return m;}
function log(m,c){G.log.push({m,c:c||''});if(G.log.length>400)G.log.shift();}
let NOTE=null;
function note(s){if(NOTE)NOTE.push(s);else log(s);}
function sideCol(u){return u&&u.side==='enemy'?'e':'h';}
function tileName(x,y){return 'ABCDEFGH'[x]+(ROWS-y);}

/* ---------------- LINE OF SIGHT, COVER, RANGE ---------------- */
function los(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;const n=Math.max(Math.abs(dx),Math.abs(dy))*4;
  for(let i=1;i<n;i++){const t=i/n;const x=Math.round(a.x+dx*t),y=Math.round(a.y+dy*t);
    if((x===a.x&&y===a.y)||(x===b.x&&y===b.y))continue;if(tallAt(x,y))return false;}
  return true;
}
function inCover(att,t){
  const sx=Math.sign(att.x-t.x),sy=Math.sign(att.y-t.y);
  if(sx&&inB(t.x+sx,t.y)&&blocked(t.x+sx,t.y))return true;
  if(sy&&inB(t.x,t.y+sy)&&blocked(t.x,t.y+sy))return true;
  return false;
}
function effRange(r,O){const v=r+(r>1&&isHighT(O.x,O.y)?1:0);return G&&G.enc&&G.enc.twist==='night'?Math.min(3,v):v;}

/* ---------------- MOVEMENT ---------------- */
function effSpeed(u){
  if(u.object||u.caged)return 0;
  let m=u.speed+(u.side==='hero'&&u.kind==='pc'&&hasR('boots')?1:0);
  if(u.st.stag)m=Math.floor(m/2);
  if(u.st.root)m=0;
  return m;
}
/* Reactions. Foes get one parting blow a round. Heroes react with the actions they saved at the end of their turn:
   each saved action pays for one reaction, and each kind of reaction works once between their turns (Nimble 2e). */
/* Reactions (Core Rules 3.6). A hero's actions refill at the start of their turn; any they don't spend stay ready until
   then, and each ready action can pay for one reaction on someone else's turn. Defend works any number of times; other
   reactions (from powers) once a round. The player chooses each reaction (askReact); autoplay heroes decide by rule. */
function reactLeft(u){return u.kind==='pc'&&G&&G.cur!==u.id?(u.acts||0):0;}
function reactReady(u,k){return u.kind==='pc'&&live(u)&&(u.acts||0)>=1&&!u.st.stag&&!u.caged&&!(k!=='defend'&&u.used&&u.used[k]===G.round)&&G.cur!==u.id;}
function spendReact(u,k){u.acts=Math.max(0,(u.acts||0)-1);(u.used||(u.used={}))[k]=G.round;H.upd(u);}
/* Ask the player whether a hero reacts (the screen shows what it costs and does). Autoplay and rival heroes always do;
   the caller has already checked that the reaction is worth it for them. */
async function askReact(u,title,body,yes){if(!isPlayer(u)||(typeof SET!=='undefined'&&SET.autoReact))return true;return !!(await H.ask(u,title,body,yes));}
/* Free strikes cost nothing and are not reactions; each enemy gets at most one per move (Core Rules 3.6). */
function canReact(f){return live(f)&&!f.object&&!f.caged&&f.kind!=='npc'&&!f.st.stag;}
function passable(u,x,y){
  for(const t of foot(u,x,y)){
    if(!inB(t.x,t.y)||blocked(t.x,t.y))return false;
    const o=unitAt(t.x,t.y);
    if(o&&o!==u&&(o.side!==u.side||o.object||SZ(u)>1))return false;
  }
  return true;
}
/* Can u stand with its corner at x,y (every square free of obstacles and other units)? */
function fits(u,x,y){return foot(u,x,y).every(t=>{if(!inB(t.x,t.y)||blocked(t.x,t.y))return false;const o=unitAt(t.x,t.y);return !o||o===u;});}
/* Layered search by movement spent: minimises parting blows, then hazard damage, then cost. */
function reach(u,mp){
  const rs=fighters(u).filter(f=>f.kind==='pc'&&hasP(f,'sentinel')&&reactReady(f,'sentinel'));
  const sz=SZ(u);const start={x:u.x,y:u.y,sz,s:0,prov:0,haz:0,prev:null};
  const layers=[];for(let s=0;s<=mp;s++)layers.push(new Map());
  layers[0].set(K(u.x,u.y),start);
  for(let s=0;s<=mp;s++){
    for(const n of layers[s].values()){
      for(const[dx,dy]of DIRS){
        const x=n.x+dx,y=n.y+dy;
        if(!passable(u,x,y))continue;
        const s2=s+stepCost(u,x,y);if(s2>mp)continue;
        let p=n.prov;for(const f of rs)if(man(f,n)===1&&man(f,{x,y,sz})!==1)p++;
        const h=n.haz+hazCost(u,x,y);
        const k=K(x,y),L=layers[s2],ex=L.get(k);
        if(!ex||p*100+h<ex.prov*100+ex.haz)L.set(k,{x,y,sz,s:s2,prov:p,haz:h,prev:n});
      }
    }
  }
  const out=new Map();
  for(const L of layers)for(const n of L.values()){
    if(!fits(u,n.x,n.y))continue;
    const k=K(n.x,n.y),ex=out.get(k),sc=n.prov*100+n.haz;
    if(!ex||sc<ex.prov*100+ex.haz||(sc===ex.prov*100+ex.haz&&n.s<ex.s))out.set(k,n);
  }
  return out;
}
function pathOf(n){const p=[];while(n){p.unshift({x:n.x,y:n.y});n=n.prev;}return p;}
function freeTile(x,y,u){if(!inB(x,y)||blocked(x,y))return false;const o=unitAt(x,y);return !o||o===u;}
/* Free squares touching t's footprint. */
function freeAdj(t,u){const out=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(man(t,{x,y})===1&&freeTile(x,y,u))out.push({x,y});return out.sort((a,b)=>Math.abs(a.x-t.x)+Math.abs(a.y-t.y)-Math.abs(b.x-t.x)-Math.abs(b.y-t.y));}
function tilesWithin(O,r){const out=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(man(O,{x,y})<=r)out.push({x,y});return out;}
function adjFoe(O,a){return fighters(a).some(o=>man(o,O)===1);}

async function walk(u,path,voluntary){
  const struck=new Set();
  for(let i=1;i<path.length;i++){
    const from=path[i-1],to=path[i];
    if(voluntary){
      const rs=fighters(u).filter(f=>f.kind==='pc'&&hasP(f,'sentinel')&&reactReady(f,'sentinel')&&!struck.has(f.id)&&man(f,from)===1&&man(f,to)!==1);
      for(const f of rs){
        struck.add(f.id);
        await partingBlow(f,u);
        if(!live(u))return false;
        if(u.stopped){u.stopped=false;u.mp=0;H.pop(u,'Stopped!','call');return false;}
      }
    }
    if(i===path.length-1&&!fits(u,to.x,to.y))return false;
    if(voluntary)u.mp=Math.max(0,u.mp-stepCost(u,to.x,to.y));
    const left={x:u.x,y:u.y};
    const sc=G.enc.twist==='carry'&&u.kind==='pc'&&u.side==='hero'&&G.units.find(v=>v.carried&&live(v)&&man(v,left)===1&&man(v,to)!==1);
    u.x=to.x;u.y=to.y;await H.step(u);
    if(sc){sc.x=left.x;sc.y=left.y;await H.step(sc,true);if(!sc.said){sc.said=1;H.pop(sc,'Carried','gold');}}
    if(voluntary&&u.kind==='mon'&&mon(u).trail)setHaz(left.x,left.y,'fire',2,u.side);
    await onEnter(u);
    if(!live(u))return false;
    if(u.st.root){u.mp=0;return false;}
  }
  return true;
}
async function onEnter(u){
  if(SZ(u)>1){for(const f of foot(u,u.x,u.y))if(inB(f.x,f.y)&&Tt(f.x,f.y).haz&&live(u)){await applyHazard(u,K(f.x,f.y));break;}return;}
  const t=Tt(u.x,u.y);
  if(t.ter==='water'&&u.st.burn){delete u.st.burn;H.pop(u,'Doused','call');}
  if(u.side==='hero'&&u.kind==='pc'&&G.chests.includes(K(u.x,u.y))){
    G.chests=G.chests.filter(c=>c!==K(u.x,u.y));G.looted++;addMom(u,1);
    if(G.enc.twist==='cursed'){for(const s2 of freeAdj(u,null).slice(0,2))spawnMon('bones',s2);log('The hoard is cursed! The dead rise.','e');}H.pop(u,'Treasure!','gold');H.sfx('chest');log(`${u.name} grabs a chest (${G.looted}/3).`,'g');
  }
  if(t.haz)await applyHazard(u);
}
async function applyHazard(u,k){
  if(k==null)k=K(u.x,u.y);const h=G.tiles[k].haz;if(!h||!live(u))return;
  if(h.t==='trap'&&h.side===u.side)return;
  const Z=HAZ[h.t];
  if(Z.once)G.tiles[k].haz=null;
  if((h.t==='fire'||h.t==='lava')&&immuneFire(u))return;
  H.pop(u,Z.name+'!','bad');H.sfx(h.t==='fire'||h.t==='lava'?'fire':h.t==='acid'?'acid':'slam');
  const d=Z.dmg?Z.dmg+G.act:0;
  note(`${u.name} suffers ${Z.name.toLowerCase()}${d?` (${d} damage)`:''}.`);
  if(d)await damage(null,u,d,{hazard:true});
  if(live(u))for(const s in Z.st)addSt(u,s,Z.st[s]);
}
function setHaz(x,y,t,dur,side){
  if(!inB(x,y)||blocked(x,y))return;
  const cur=G.tiles[K(x,y)].haz;
  if(cur&&cur.dur<0&&cur.t!=='trap'&&cur.t!=='web')return;
  G.tiles[K(x,y)].haz={t,dur,side};
}
async function partingBlow(f,t){
  if(f.kind==='pc'){if(!await askReact(f,'SENTINEL',`{r:${t.name} is leaving ${f.name}'s side.} Strike it? On a hit it stops and is marked.\n\n{m:Costs 1 of ${f.name}'s ${f.acts} ready ${f.acts>1?'actions':'action'}.}`,'STRIKE'))return;spendReact(f,'sentinel');const fl=await heroStrike(f,t,'Sentinel!',{free:true});if(fl&&fl.hitIds.has(t.id)&&live(t)&&!t.object){t.stopped=true;applyMark(t,f);log(`${f.name} stops ${t.name} in its tracks.`,sideCol(f));}return;}
  let d=f.kind==='pc'?4+(f.side==='hero'&&hasR('lens')?3:0):f.swarm||f.minion?2:f.tiny?1+alive4(f):TUNE.pbBonus+Math.max(f.attrs.M,f.attrs.F)+G.dmgAdd;
  await H.strike(f,t,{free:true});
  NOTE=[];
  d=await guardHit(f,t,d);
  const dealt=await damage(f,t,d,{});
  const ex=NOTE||[];NOTE=null;
  log(`${f.name} lands a parting blow on ${t.name}: ${dealt} damage.${ex.length?' '+ex.join(' '):''}`,sideCol(f));
  if(f.kind==='pc'&&f.cls==='fighter'&&live(t)&&!t.object){t.stopped=true;applyMark(t,f);}
}
/* Forced movement (Core Rules 3.9). A slam deals one roll of the mover's weapon die (exploding) to the creature moved and to
   whatever it hits, and staggers the creature moved. A push or pull on its own staggers only if the power says so (o.stag). */
function srcDie(src){
  if(!src)return 4;
  if(src.kind==='pc'){const w=wpnOf(src)||WEAPONS[START_WEAPON[src.cls]];return w?w.dice[1]:6;}
  if(src.kind==='mon'){const A=mon(src).acts.find(a=>a.dmg||a.dice);return A?(A.dice?A.dice[1]:nearDie(A.dmg[2])):4;}
  return 4;
}
async function forceMove(t,from,n,pull,src,fl,o){
  if(t.object||!live(t))return;
  n-=(t.steady||0);
  if(n<=0){H.pop(t,'Holds firm','call');note(`${t.name} holds firm.`);return;}
  let moved=0,slam=false;
  for(let i=0;i<n&&live(t);i++){
    let dx=t.x-from.x,dy=t.y-from.y;if(pull){dx=-dx;dy=-dy;}
    let sx=0,sy=0;
    if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)sx=Math.sign(dx);else if(dy!==0)sy=Math.sign(dy);else break;
    const nx=t.x+sx,ny=t.y+sy;
    if(pull&&man({x:nx,y:ny,sz:SZ(t)},from)===0)break;
    if(!fits(t,nx,ny)){
      if(!pull){
        const sdie=srcDie(src);let sd=rollEx(sdie);let sf=exDice(sdie,LASTEX);if(src&&resLv('Reach',src)>=2){sd+=rollEx(sdie);sf=sf.concat(exDice(sdie,LASTEX));}slam=true;
        {const o2=foot(t,nx,ny).map(q=>inB(q.x,q.y)?unitAt(q.x,q.y):null).find(q=>q&&q!==t&&!q.object);showRoll({side:src?src.side:'enemy',title:'SLAM!',dice:sf.map(q=>q.k?q:Object.assign(q,{k:'key'})),verdict:`d${sdie} = ${sd} damage${o2?' to both':''}`,res:2});}H.pop(t,'Slam!','call');H.sfx('slam');if(fl)fl.slam=true;
        const o=foot(t,nx,ny).map(q=>inB(q.x,q.y)?unitAt(q.x,q.y):null).find(q=>q&&q!==t&&!q.object);
        note(`${moved?'Pushed '+moved+', s':'S'}lams ${o?'into '+o.name+' ':''}for ${sd}.`);
        if(src&&hasP(src,'wildfire')&&t.st.burn)for(const q of G.units.filter(q=>live(q)&&!q.object&&q!==t&&cheb(q,t)===1)){addSt(q,'burn',2);note(`${q.name} catches fire.`);}
        await damage(src,t,sd,{});
        if(o&&live(o))await damage(src,o,sd,{});
        if(o&&live(o)&&src&&hasP(src,'pinball')&&o.side!==src.side){stagger(o,src);if(o.st.stag)note(`${o.name} is stunned too.`);}
      }
      break;
    }
    t.x=nx;t.y=ny;moved++;await H.step(t,true);
    await onEnter(t);
  }
  if(moved>0)note(`${pull?'Pulled':'Pushed'} ${moved}.`);
  if(live(t)&&src&&src.side!==t.side&&hasP(src,'tripwire')&&(slam||(moved>0&&Tt(t.x,t.y).haz))){addSt(t,'slow',1);note('Knocked down.');}
  if(live(t)&&moved>0&&src&&src.side!==t.side&&hasP(src,'anvil')&&src.anvilR!==G.round){const A=allies(src).find(a=>a!==src&&a.kind==='pc'&&man(a,t)===1);if(A){src.anvilR=G.round;(G.pend||(G.pend=[])).push({u:A,t,label:'Anvil!'});}}
  if((slam||(moved>0&&o&&o.stag))&&live(t)){stagger(t,src);if(t.st.stag)note('Stunned.');if(fl&&fl.stagIds&&src&&src.side!==t.side)fl.stagIds.add(t.id);}
  if(moved>0&&src&&src.side!==t.side)xp(src,moved,'control');
  if(slam&&src&&src.side!==t.side)xp(src,2,'control');
}
async function teleport(u,to){await H.tele(u,to);u.x=to.x;u.y=to.y;H.upd(u);await onEnter(u);}

/* ---------------- DAMAGE & CONDITIONS ---------------- */
function momCap(u){return resLv('Surge',u)>=2?12:10;}
function addMom(u,n){if(u.kind!=='pc'||!live(u)||n<=0)return;const cap=momCap(u),over=Math.max(0,u.mom+n-cap);u.mom=Math.min(cap,u.mom+n);
  if(over&&hasP(u,'overflow')){const o=allies(u).filter(a=>a!==u&&a.kind==='pc'&&a.mom<momCap(a)).sort((a,b)=>a.mom-b.mom)[0];if(o){o.mom=Math.min(momCap(o),o.mom+over);H.pop(o,`+${over} ◆`,'res');}}}
/* Per-deed tallies for each hero (ROLE_XP), kept in G.xp for statistics; levels come from Victories at a Camp (run.js). */
let HELPER=null;
function xp(u,n,why){
  if(!u||u.kind!=='pc'||u.side!=='hero'||u.rival||!(n>0)||!G.xp)return;
  const w=(ROLE_XP[u.cls]||{})[why]||0;if(!w)return;
  const X=G.xp[u.cls]||(G.xp[u.cls]={total:0,why:{}});X.total+=n*w;X.why[why]=(X.why[why]||0)+n*w;
}
async function damage(src,t,amt,o){
  await H.rolls();
  if(!live(t)||amt<=0||t.caged)return 0;
  let a=amt;
  if(t.tiny&&o.area){a*=2;note('Swarms take double damage from area attacks.');}
  if(t.minion)a=Math.max(a,t.hp);
  if(t.leader&&G.enc.twist==='guards'&&allies(t).some(o=>o!==t&&!o.object&&man(o,t)===1)){a=Math.ceil(a/2);note('A bodyguard takes half the blow.');}
  if(t.shield>0){const s=Math.min(t.shield,a);t.shield-=s;a-=s;}
  const before=t.hp;t.hp-=a;
  const lost=Math.min(before,a);if(lost>0){if(src&&src.side!==t.side)xp(src,lost,'dealt');if(t.side==='hero')xp(t,lost,'taken');}
  if(src&&src.side!==t.side&&t.kind==='pc'){t.hitSince=true;if(a>0&&hasP(t,'adrenaline')&&!t.adrUsed){t.adrUsed=true;addMom(t,1);H.pop(t,'+1 ◆','res');}}
  H.pop(t,a<amt?`-${a} ⛨`:`-${a}`,o.crit?'crit':'dmg');
  note(`${a} damage${a<amt?` (${amt-a} absorbed)`:''} [${before}→${Math.max(0,t.hp)}].`);
  if(src&&src.kind==='mon'&&mon(src).drain&&a>0&&live(src))heal(src,Math.ceil(a/2));
  if(t.hp<=0)await kill(t,src,o);
  H.upd(t);
  return a;
}
function heal(t,n){if(!live(t)||n<=0||t.object)return 0;const b=t.hp;t.hp=Math.min(t.maxHp,t.hp+n);const g=t.hp-b;if(g>0&&HELPER&&HELPER!==t&&HELPER.kind==='pc'&&HELPER.side===t.side){G.healedR=G.healedR||{};G.healedR[HELPER.id]=G.round;if(resLv('Mend',HELPER)>=2){t.shield+=3;}}if(HELPER&&g>0)xp(HELPER,t===HELPER?g*.3:g,'heal');if(g>0){H.pop(t,'+'+g,'heal');note(`${t.name} heals ${g}.`);}H.upd(t);return g;}
async function kill(t,src,o){
  if(t.side==='hero'&&t.kind==='pc'&&hasR('phoenix')&&!G.phoenixUsed){G.phoenixUsed=true;t.hp=Math.ceil(t.maxHp/2);H.pop(t,'Phoenix!','gold');H.sfx('heal');note(`${t.name} rises from the ashes!`);return;}
  if(t.kind==='pc'&&hasP(t,'laststand')&&!t.lsUsed){t.lsUsed=true;t.hp=1;t.shield+=6;H.pop(t,'Last Stand!','gold');note(`${t.name} refuses to fall (1 health, 6 shield).`);H.upd(t);return;}
  t.dead=true;t.hp=0;t.shield=0;if(t.kind==='pc')t.grow={};
  if(t.kind==='pc'&&t.side==='hero'&&hasR('chalice'))for(const a of allies(t).filter(a=>a!==t&&a.kind==='pc'&&live(a))){addMom(a,2);H.pop(a,'Chalice +2 ◆','res');}
  if(t.kind==='pc'&&t.side==='hero'&&!t.rival&&t.wounds!=null){if(t.wounds>=woundCap()){t.slain=true;note(`${t.name} has taken one wound too many.`);}else{t.wounds++;note(`${t.name} gains a Wound (${t.wounds}).`);}}
  H.sfx(t.kind==='pc'?'fall':t.object?'crumble':'death');
  note(t.kind==='pc'?`${t.name} has fallen!`:`${t.name} is slain.`);
  await H.death(t);
  if(src&&src.side!==t.side&&!t.object)xp(src,1,'kill');
  if(t.kind==='mon'){
    const m=mon(t);
    if(t.side==='enemy'&&!t.object)G.kills++;
    if(m.fireDeath)setHaz(t.x,t.y,'fire',3,t.side);
    if(m.acidDeath)setHaz(t.x,t.y,'acid',4,t.side);
    if(m.reassemble&&!t.reassembled&&!(o&&o.radiant))t.reassembleAt=G.round;
  }
  if(src&&src.side==='hero'&&t.side!=='hero'&&hasR('fang'))heal(src,4);
  if(t.kind==='pc'&&hasP(t,'martyr'))for(const a of allies(t).filter(a=>a.kind==='pc'&&a!==t)){heal(a,rollEx(HD[a.cls]||8));cleanse(a);note(`${t.name}'s grace lifts ${a.name}.`);}
}
function applyMark(t,src){
  if(t.object)return;
  if(!t.st.mark||t.marker!==src.id)xp(src,1,'mark');
  t.st.mark=Math.max(t.st.mark||0,1+(G.cur===t.id?1:0));t.marker=src.id;
}
/* Statuses (v0.25). Stacks with a number: mult (a foe's next hit taken gets +N Mult), bless (a hero's next hit gets +N
   damage) and burn (N damage at the start of its turn, then N falls by 1); these don't wear off by themselves. Timed:
   stag (Stunned: skips its next turn), root (can't move), weak (deals half damage), mark (Taunted). Older names map onto
   these: dazed is stunned, slowed is rooted, exposed is Mult, bleeding is Burn, frightened is weak. */
const ST_MAP={daze:'stag',slow:'root',expose:'mult',bleed:'burn',fear:'weak'};
const STACKS=['mult','bless','burn'];
function addSt(t,k,v){
  if(!live(t)||t.object)return;
  k=ST_MAP[k]||k;
  if(k==='stag'){if(t.boss){t.st.mult=(t.st.mult||0)+2;H.pop(t,'+2 Mult','res');H.upd(t);return;}if(t.st.steady)return;}
  if(t.boss&&k==='root')return;
  if(k==='burn'&&immuneFire(t))return;
  if(STACKS.includes(k)){t.st[k]=(t.st[k]||0)+v;H.upd(t);return;}
  if(G.cur===t.id)v+=1;
  t.st[k]=Math.max(t.st[k]||0,v);
  H.upd(t);
}
/* Set-ups remember who made them: a hero who uses an ally's Mult, Bless or Stun scores a combo. */
const byHero=s=>s?s.id:null;
function stagger(t,src){if(!live(t)||t.object)return;const had=!!t.st.stag;addSt(t,'stag',1);if(t.st.stag&&!had){t.stagBy=byHero(src);H.pop(t,'Stunned!','call');if(src&&src.side!==t.side){setupMade(src,t);if(hasP(src,'anvil'))giveMult(t,src,2,true);}}}
/* A stunned foe (not a boss: bosses take +2 Mult instead) skips its next turn, then can't be stunned again until after
   its following turn. */
const losesTurn=u=>u.side==='enemy'&&!u.boss&&!!u.st.stag;
/* Give a foe Mult (Amplify adds 1). */
function giveMult(t,src,n,quiet){if(!live(t)||t.object||n<=0)return;if(src&&hasP(src,'amplify'))n++;t.st.mult=(t.st.mult||0)+n;t.multBy=byHero(src);if(src&&src.side!==t.side)setupMade(src,t);if(!quiet)H.pop(t,`+${n} Mult`,'res');H.upd(t);}
/* Bless a hero: +N damage on their next hit (Radiance adds 2). */
function blessUnit(a,src,n){if(!live(a)||a.object)return;n=(n||3)+(src&&hasP(src,'radiance')?2:0);a.st.bless=(a.st.bless||0)+n;a.blessBy=byHero(src);if(src&&src!==a)setupMade(src,null);H.pop(a,`Bless +${n}`,'gold');H.upd(a);}
const ST_NAME={steady:'steady',root:'rooted',stag:'stunned',weak:'weak',burn:'burning',mult:'Mult',mark:'taunted',bless:'blessed'};
function applyEff(src,t,eff,res){
  if(!eff||!live(t)||t.object)return;
  for(const k0 in eff){
    if(k0==='push'||k0==='pull')continue;
    const v=tv(eff[k0],res);if(!v)continue;
    const k=ST_MAP[k0]||k0;
    if(k==='mark'){applyMark(t,src);note('Taunted.');continue;}
    if(t.boss&&k==='root'){note(`${t.name} can't be rooted.`);continue;}
    if(k==='burn'&&immuneFire(t))continue;
    if(k==='stag'){stagger(t,src);if(t.st.stag)note('Stunned.');continue;}
    if(k==='mult'){giveMult(t,src,v);note(`+${v} Mult.`);continue;}
    addSt(t,k,v);
    if(k==='root')t.rootBy=byHero(src);
    if(k==='root'&&src&&src.side!==t.side)setupMade(src,t);
    note(k==='burn'?`Burn ${t.st.burn}.`:ST_NAME[k][0].toUpperCase()+ST_NAME[k].slice(1)+'.');if(t.side!==src.side)xp(src,1,'control');
  }
}
function cleanse(t){for(const k of['root','weak','burn','stag','mark','mult'])delete t.st[k];H.upd(t);}
function decSt(u){for(const k in u.st){if(STACKS.includes(k))continue;u.st[k]--;if(u.st[k]<=0){delete u.st[k];if(k==='mark')u.marker=null;}}}

/* ---------------- ADVANTAGE & DISADVANTAGE ---------------- */
function isMelee(p){return p.tgt==='self'||(p.tgt==='enemy'&&p.range===1)||!!p.reach||(!p.tgt&&p.range===1);}
/* Every different source of advantage or disadvantage counts once, and they stack (up to triple), cancelling one
   for one, as in Nimble 2e. Hidden counts double. The second attack a hero makes on their turn has disadvantage and
   the third double disadvantage (PF2e's multiple attack penalty); reactions are exempt. */
const BOON_W={'Hidden':2,'3rd attack':2};
const NET_CAP=3;
/* No more rushed attacks: a hero makes one basic attack a turn instead (usable). */
function mapStep(a,p){return 0;}
/* Flanking: an ally on the far side of the target, in a straight line with the attacker (Core Rules 3.5). */
function flanked(a,t,O){
  O=O||a;if(t.object)return false;
  if(SZ(t)===1&&SZ(a)===1){if(!inB(2*t.x-O.x,2*t.y-O.y))return false;const h=unitAt(2*t.x-O.x,2*t.y-O.y);return !!h&&h!==a&&h.side===a.side&&!h.object;}
  const c=center(t),oc=center({x:O.x,y:O.y,sz:SZ(a)});
  return allies(a).some(h=>h!==a&&!h.object&&man(h,t)===1&&(center(h).x-c.x)*(oc.x-c.x)+(center(h).y-c.y)*(oc.y-c.y)<0&&Math.abs(center(h).x-c.x)+Math.abs(oc.x-c.x)+Math.abs(center(h).y-c.y)+Math.abs(oc.y-c.y)>=SZ(t)+1);
}
/* Advantage and disadvantage are retired (v0.25): Mult does their job. Kept as a stub for older callers. */
function netBoon(a,t,p,O){return {net:0,pro:[],con:[],flurry:false};}
/* ---------------- DAMAGE × MULT (after Balatro) ----------------
   Every attack rolls its dice and adds them up: no misses, no advantage. A hit is DAMAGE × MULT.
   DAMAGE = the dice (the weapon die, laddered by the power) + flat bonuses (the power, Bless, Training, Opening
   Strike, relics) − the target's armour (at least 1). Attributes add nothing in battle.
   MULT  = 1, +1 for each die that shows its top number (a crit), + the target's Mult status, + other sources.
   Then ×MULT sources multiply the lot (a weakness ×2, a resistance ×½, a few Rare powers). */
const CLASS_DIE={fighter:8,rogue:4,wizard:6,cleric:6};
const DIE_SIZES=[4,6,8,10,12];
function nearDie(v){let b=4;for(const s of DIE_SIZES)if(Math.abs(s-v)<Math.abs(b-v))b=s;return b;}
/* n dice of size s plus a flat bonus b. Heroes roll their weapon's die (wd dice); foes roll their stat block's dice. */
function atkDice(u,p){
  if(p.dice)return {n:p.dice[0],s:p.dice[1],b:p.dice[2]||0};
  if(u.kind==='pc'){
    if(p.wdie)return {n:1,s:p.wdie,b:0};
    const w=wpnOf(u)||WEAPONS[START_WEAPON[u.cls]]||{dice:[1,CLASS_DIE[u.cls]||6]};
    return {n:(p.wd||1)+(w.dice[0]-1),s:w.dice[1],b:0};
  }
  if(!p.dmg)return {n:1,s:4,b:0};
  const s=nearDie(p.dmg[2]);return {n:1,s,b:Math.max(0,Math.round(p.dmg[1]-(s+1)/2))};
}
function diceText(d){return `${d.n}d${d.s}${d.xn?'+'+d.xn+'d'+d.xs:''}${d.b?'+'+d.b:''}`;}
function powDice(p,u){return atkDice(u&&u.kind==='pc'?u:{kind:'pc',cls:p.c},p);}
/* The crit chance of a set of dice: at least one shows its top number (Keen widens it by one). */
function critP(d){if(d.nocrit)return 0;const cm=clamp(d.cmin||d.s,2,d.s),q=(d.s-cm+1)/d.s;return 1-Math.pow(1-q,d.n);}
/* [miss, hit, crit] chances, kept in this shape for the forecast and the AI: there are no misses. */
function dieProbs(s,net,d){const c=critP(d||{n:1,s});return [0,1-c,c];}
/* Average dice total (a crit shows the top number on one die). */
function tierDice(d,res){const avg=(d.s+1)/2;return (res===3&&!d.nocrit?d.s+(d.n-1)*avg:d.n*avg)+(d.xn||0)*((d.xs||d.s)+1)/2+d.b;}
/* Roll an attack's dice. A die on its top number (or Keen's one below) is a crit: +1 Mult each. */
function rollDice(d,net,forceCrit,bonusDie,side){
  const dice=[];for(let i=0;i<d.n;i++)dice.push(1+rnd(d.s));for(let i=0;i<(d.xn||0);i++)dice.push(1+rnd(d.xs||d.s));
  let rr=false;if(d.reroll1){const i=dice.indexOf(1);if(i>=0){dice[i]=1+rnd(d.s);rr=true;}}
  // the tutorial has no bad luck: foes never crit
  if(G&&G.tut&&side==='enemy')for(let i=0;i<dice.length;i++)if(dice[i]===d.s&&d.s>2)dice[i]=d.s-1;
  const cm=clamp(d.cmin||d.s,2,d.s);
  const critAt=dice.map((v,i)=>!d.nocrit&&v>=(i<d.n?cm:(d.xs||d.s)));
  const crits=critAt.filter(Boolean).length;
  const total=dice.reduce((a,b)=>a+b,0)+d.b;
  return {d,dice,critAt,crits,res:crits?3:2,total,net:0,tries:[dice[0]],prim:dice[0],rest:dice.slice(1),boom:[],stag:false,rr};
}
/* The die ladder: powers step the weapon die up (hits harder) or down (crits more often). */
const LADDER=[2,4,6,8,10,12];
function ladder(s,n){if(!n)return s;let i=LADDER.indexOf(s);if(i<0)i=LADDER.findIndex(x=>x>=s);return LADDER[clamp(i+n,0,LADDER.length-1)];}
function heroStep(a,p){return (p.step||0)+(hasP(a,'wtrain')?1:0)-(hasP(a,'precision')?1:0);}
/* A power's modifiers as one line of rich text (cards, forecast, compendium): its dice (with the ladder step shown),
   flat damage, Mult and what a crit does. */
const CRIT_TXT={stun:()=>'Stun',root:()=>'Root',burn:n=>`Burn ${n}`,give:n=>`foe +${n} Mult`,push:n=>`push ${n}`,mult:n=>`+${n} Mult`,dmg:n=>`+${n} dmg`,bless:n=>`allies Bless ${n}`,act:()=>'+1 action'};
function powerMods(p,u){
  if(!p.dmg||p.noDmg)return '';
  const pc=u&&u.kind==='pc'?u:{kind:'pc',cls:p.c==='gen'||p.c==='any'?'fighter':p.c,powers:[],st:{}};
  const d=atkDice(pc,p),w=!p.wdie&&(wpnOf(pc)||WEAPONS[START_WEAPON[pc.cls]]);if(w&&w.dual)d.n++;
  const st=u?heroStep(u,p):(p.step||0),to=ladder(d.s,st);
  const L=[`{b:${d.n>1?d.n:''}d${to}}`+(st?`{m:${st>0?' ▲':' ▼'}${Math.abs(st)>1?Math.abs(st):''} from d${d.s}}`:'')];
  if(p.hits>1)L.push(`{w:×${p.hits} hits}`);
  const flat=(p.plus||0)+(u?(u.dmgPlus||0)+(u.side==='hero'&&hasR('whetstone')?1:0)+wBonus(u,p,'dmg'):0);
  if(flat)L.push(`{b:+${flat} dmg}`);
  if(p.addMult)L.push(`{r:+${p.addMult} Mult}`);
  if(p.pierceArmor)L.push('{b:ignores armour}');
  if(p.multDouble)L.push("{r:foe's Mult ×2}");
  if(p.xIfStun)L.push(`{g:×${p.xIfStun} vs Stunned}`);
  if(p.crit)L.push('{o:Crit: '+Object.keys(p.crit).map(k=>CRIT_TXT[k](p.crit[k])).join(', ')+'}');
  return L.join(' ');
}
/* Kept for older callers: there is no sure crit any more. */
function stagNet(t,net){return net;}
const stagFor=(a,t)=>false;
/* Sneak Attack (the rogue): +1 Mult against a foe that has one of her allies beside it. */
function sneakOn(a,t){return a.kind==='pc'&&a.cls==='rogue'&&!t.object&&allies(a).some(h=>h!==a&&!h.object&&h.kind!=='npc'&&man(h,t)===1);}
/* A hero's attack dice with their weapon folded in: Keen widens the crit range, a staff never crits, Steady rerolls a 1. */
function heroDice(a,p,t,O,fl){
  const d=atkDice(a,p);
  if(a.kind!=='pc'||!p.dmg||p.noDmg)return d;
  const w=p.wdie?null:(wpnOf(a)||WEAPONS[START_WEAPON[a.cls]]);
  if(w&&w.dual)d.n++;
  d.s=ladder(d.s,heroStep(a,p));
  let cm=d.s;if(w&&w.keen&&d.s>=6)cm--;d.cmin=Math.max(2,cm);
  if(w&&w.nocrit)d.nocrit=true;
  if(w&&w.steady&&a.steadyR!==G.round)d.reroll1=true;
  return d;
}
/* Armour: a flat number taken off the damage of every hit (foes only; heroes Defend instead). */
function armorOf(t){if(!t||t.kind!=='mon'||t.object)return 0;const bw=t.undead&&G&&G.units.some(o=>o!==t&&live(o)&&o.kind==='mon'&&mon(o).boneWall&&o.side===t.side&&man(o,t)===1)?1:0;return Math.max(0,(t.armor||0)+(TUNE.foeDef||0)+bw);}
function defDie(t){return 0;}
/* Damage types (Core Rules 3.11). */
function typeOf(a,p){
  if(p.dtype)return p.dtype;if(p.radiant)return 'radiant';
  if(a&&a.kind==='pc'){const w=!p.wdie&&p.dmg&&(wpnOf(a)||WEAPONS[START_WEAPON[a.cls]]);if(w&&w.dtype)return w.dtype;if(a.cls==='cleric'&&feat2(a))return 'radiant';}
  return 'physical';
}
/* 2 = weak, .5 = resists (half, at least 1), 0 = immune. Undead are weak to radiant and immune to poison and necrotic;
   incorporeal foes resist physical damage. */
function typeMul(t,ty){
  const m=t.kind==='mon'?mon(t):null;
  if(ty==='fire'&&immuneFire(t))return 0;
  if(m&&(m.immune||[]).includes(ty))return 0;
  if(t.undead&&(ty==='poison'||ty==='necrotic'))return 0;
  if((ty==='radiant'&&t.undead)||(m&&(m.weak||[]).includes(ty)))return 2;
  if(m&&((m.resist||[]).includes(ty)||(m.incorporeal&&ty==='physical')))return .5;
  return 1;
}
/* A hit: DAMAGE (C: [label, value]), MULT (M: [label, +n]) and ×MULT (Xm: [label, ×k]).
   o.dice: the rolled total (else the average); o.crits: how many dice critted (else 0, or 1 for res 3). */
function hitParts(a,p,t,res,o,foe){
  o=o||{};const C=[],M=[],Xm=[];
  const dd=foe?atkDice(a,p):(o.dd||heroDice(a,p,t));
  const dice=Math.round(o.dice!=null?o.dice:tierDice(dd,res));
  let chips=dice;const add=(v,l)=>{if(v){chips+=v;C.push([l,v]);}};
  let mult=1;const am=(v,l)=>{if(v){mult+=v;M.push([l,v]);}};
  const crits=o.crits!=null?o.crits:(res===3?1:0);
  if(!foe){
    add(p.plus||0,p.name);
    add(a.dmgPlus||0,'Training');
    add(wBonus(a,p,'dmg')+wBonus(a,p,'acc'),'weapon');
    if(a.side==='hero'&&hasR('whetstone'))add(1,'Whetstone');
    add(a.side==='hero'?(G.pcDmgAdd||0):(G.foeDmgAdd||0),'skirmish');
    if(a.st&&a.st.bless)add(a.st.bless,'Bless');
    if(hasP(a,'openstrike')&&!a.openUsed)add(3,'Opening Strike');if(hasP(a,'openstrike')&&!a.openUsed)am(1,'Opening Strike');
    add(-woundsOf(a),'Wounds');
    {const w=wpnOf(a);am(crits*(1+(hasP(a,'heavy')?1:0)+(hasP(a,'precision')?1:0)+(w&&w.vicious&&!p.wdie?1:0))+(a.side==='hero'&&hasR('dice')&&crits?1:0),crits>1?`${crits} crits`:'crit');}
    if(crits){add(hasP(a,'brutal')?3:0,'Brutal');if(p.crit){add(p.crit.dmg||0,'crit');am(p.crit.mult||0,'crit bonus');}}
    am(p.addMult||0,p.name);
    if(t&&!t.object&&t.side!==a.side){
      if(sneakOn(a,t))am(1,'Sneak Attack');
      if(bloodied(t)&&hasP(a,'finisher'))am(1,'Finisher');
      if(bloodied(t)&&a.side==='hero'&&hasR('hood'))am(1,'Executioner');
      if(a.hidden)am(1,'hidden');
    }
    if(hasP(a,'glass'))am(1,'Glass Cannon');
  }else{
    add(G.dmgAdd,'strength');
    const m=mon(a);
    if((m.savage||(m.p2&&m.p2.savage&&bloodied(a)))&&bloodied(t))add(2,'savage');
    if(allies(a).some(o2=>o2!==a&&o2.kind==='mon'&&mon(o2).aura&&man(o2,a)<=2))add(2,'aura');
    am(crits,crits>1?`${crits} crits`:'crit');
    if(m.pack&&allies(a).some(o2=>o2!==a&&!o2.object&&man(o2,t)===1))am(1,'pack');
    if(G.hordeBoon)am(1,'Bloodlust');
    if(a.hidden)am(1,'hidden');
  }
  // the target's Mult: spent by this hit
  if(t&&t.st&&t.st.mult)am(t.st.mult*(p.multDouble?2:1),p.multDouble?'Mult ×2 (Backstab)':'Mult');
  const ar=p.pierceArmor?0:armorOf(t);if(ar){const b=chips;chips=Math.max(1,chips-ar);if(chips!==b)C.push(['armour',chips-b]);}
  chips=Math.max(1,chips);
  let xm=1;const xx=(k,l)=>{if(k!==1){xm*=k;Xm.push([l,k]);}};
  if(t){
    const tm=typeMul(t,typeOf(a,p));if(tm===2)xx(2,'weakness');else if(tm===.5)xx(.5,'resists');
    if(p.xIfStun&&t.st&&t.st.stag)xx(p.xIfStun,p.name);
    if(!foe&&t.st&&t.st.root&&t.rootBy&&t.rootBy!==a.id&&hasP(U(t.rootBy),'shatter'))xx(2,'Shatter');
    if(foe){
      if(a.st&&a.st.weak)xx(.5,'weak');
      if(t.side==='hero'&&hasR('ward')&&!(t.warded||{})[a.id])xx(.5,'Warding Charm');
    }else if(a.st&&a.st.weak)xx(.5,'weak');
    if(a.st&&a.st.mark&&a.marker&&a.marker!==t.id&&live(U(a.marker)))xx(.5,'taunted');
    if(typeMul(t,typeOf(a,p))===0)return {d:0,C,M,Xm,chips,mult,xm:0,immune:true,S:[]};
  }
  const d=Math.max(1,Math.round(chips*mult*xm));
  return {d,C,M,Xm,chips,mult,xm,S:[]};
}
function pcDmgX(a,p,t,res,o){
  if(p.noDmg||!p.dmg)return {d:0,C:[],M:[],Xm:[],chips:0,mult:1,xm:1,S:[]};
  return hitParts(a,p,t,res,o,false);
}
function pcDmg(a,p,t,res,o){return pcDmgX(a,p,t,res,o).d;}
/* How many of a tiny swarm's critters are still standing (1-4). */
function alive4(u){return u.tiny?Math.max(1,Math.ceil(u.tiny*u.hp/u.maxHp)):1;}
function monDmgX(a,A,t,res,dice,crits){
  if(A.flat!=null){const d=Math.max(1,(A.per?A.flat*alive4(a):A.flat)+Math.floor(G.dmgAdd/2));return {d,C:[],M:[],Xm:[],chips:d,mult:1,xm:1,S:[]};}
  return hitParts(a,A,t,res,{dice,crits},true);
}
function monDmg(a,A,t,res,dice){return monDmgX(a,A,t,res,dice).d;}

/* ---------------- POWERS (heroes and rival heroes) ---------------- */
function powerOf(u,i){return POWERS[u.powers[i]];}
/* Attacks count toward the multiple attack penalty: anything that rolls damage at foes, and powers foes save against. */
function isAttack(p){return !!p&&!!p.dmg&&!p.noDmg&&p.tgt!=='ally'&&p.aff!=='ally';}
function powerCost(u,p){return p.cost>0&&hasP(u,'warmup')&&!u.warmUsed?p.cost-1:p.cost;}
function usable(u,p){
  if(!p||p.passive||powerCost(u,p)>u.mom)return false;
  if(p.swapPrev&&G&&G.order&&(u.repR===G.round||!prevHero(u)))return false;
  if(p.helpUp&&!G.units.some(h=>h.side===u.side&&h.kind==='pc'&&h.dead&&!h.gone&&!h.slain))return false;
  if(p.selfWind&&((u.swUsed&&!(hasR('thread',u)&&u.swUsed<2))||u.hp>=u.maxHp||(u.hd!=null&&u.hd<=0)))return false;
  if(p.revive&&!G.units.some(h=>h.side===u.side&&h.kind==='pc'&&h.dead&&!h.slain))return false;
  return true;
}
function targetsFrom(u,p,O){
  const R=[];
  if(p.tgt==='enemy'){
    const r=effRange(p.range+(p.range===1?wBonus(u,p,'reach'):wBonus(u,p,'range')),O);
    for(const e of foesOf(u)){const d=man(O,e);if(d<1||d>r)continue;if(e.hidden&&d>1)continue;if(d>1&&!los(O,e))continue;if(p.teleportAdj&&!freeAdj(e,u).length)continue;R.push({x:e.x,y:e.y});}
  }else if(p.tgt==='ally'){
    for(const a of allies(u)){
      if(a.object||(a.caged&&!p.heal))continue;
      if(a===u){if(!p.noSelf&&O.x===u.x&&O.y===u.y)R.push({x:u.x,y:u.y});continue;}
      if(p.swapPrev&&a!==prevHero(u))continue;
      if(man(O,a)<=p.range&&!(O.x===a.x&&O.y===a.y))R.push({x:a.x,y:a.y});
    }
  }else if(p.tgt==='tile'&&p.helpUp){
    for(const h of G.units.filter(h=>h.side===u.side&&h.kind==='pc'&&h.dead&&!h.gone&&!h.slain))if(man(O,h)===1&&freeTile(h.x,h.y,null))R.push({x:h.x,y:h.y});
  }else if(p.tgt==='tile'){
    const r=effRange(p.range,O);
    for(const t of tilesWithin(O,r)){
      if(p.teleport&&(man(O,t)<1||blocked(t.x,t.y)||unitAt(t.x,t.y)))continue;
      if(p.wall&&(blocked(t.x,t.y)||unitAt(t.x,t.y)))continue;
      if(!p.teleport&&blocked(t.x,t.y))continue;
      if(man(O,t)>1&&!los(O,t))continue;
      R.push(t);
    }
  }else if(p.tgt==='self')R.push({x:O.x,y:O.y});
  return R;
}
/* ---------------- ACTIONS ----------------
   A hero has three actions a turn (PF2e, Nimble 2e): a move (up to their speed, which they can break up around other
   actions), a basic attack and each power cost one. Actions left when the turn ends are saved for reactions. */
function actCost(p,u){return p.free||(p.helpUp&&hasP(u,'quickrevive'))?0:(p.acts||1);}
function canAct(u,p){return u.kind==='pc'&&usable(u,p)&&(u.acts||0)>=actCost(p,u);}
/* How far u can go now: what is left of its current move, plus a fresh move if it can spare an action
   (reserve: actions to keep for what it means to do afterwards). */
function moveBudget(u,reserve){if(u.st.root)return 0;return (u.mp||0)+(u.kind==='pc'&&(u.acts||0)-(reserve||0)>=1?effSpeed(u):0);}
function spendMove(u){if(u.kind==='pc'&&u.acts>0){u.acts--;u.mp=(u.mp||0)+effSpeed(u);u.acted=u.acts<=0;}}
function canMoveNow(u){return !u.st.root&&effSpeed(u)>0&&((u.mp||0)>0||(u.kind==='pc'&&(u.acts||0)>0));}
async function doPower(u,p,T){
  u.acts=Math.max(0,(u.acts||0)-actCost(p,u));u.acted=u.acts<=0;
  await usePower(u,p,T);
  if(isAttack(p)&&G.cur===u.id)u.atk=(u.atk||0)+1;
  if(basicP(p)&&G.cur===u.id){if(u.basicUsed&&u.flurry)u.flurry=false;u.basicUsed=true;}
  if(p.canto&&live(u))u.mp=Math.max(u.mp||0,p.canto);
  if(p.freeMove)u.mp=(u.mp||0)+p.freeMove;
}
/* Everything the active unit can do with power index pi right now. */
function unitView(u,pi){
  const V={moves:new Map(),targets:new Map(),zone:new Set()};
  if(!live(u)||G.over)return V;
  const mv=canMoveNow(u);
  if(mv)reach(u,moveBudget(u,0)).forEach((n,k)=>V.moves.set(k,n));
  if(u.kind!=='pc')return V;
  const p=powerOf(u,pi);
  if(!p||!canAct(u,p))return V;
  const here={x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null};
  const mb=moveBudget(u,actCost(p,u));
  const combo=mv&&mb>0&&(p.tgt==='enemy'||p.tgt==='ally');
  const origins=combo?[...reach(u,mb).values()]:[here];
  for(const O of origins){
    for(const t of targetsFrom(u,p,O)){const k=K(t.x,t.y);if(!V.targets.has(k))V.targets.set(k,[]);V.targets.get(k).push(O);}
    if(p.tgt==='enemy'||p.tgt==='ally')for(const t of tilesWithin(O,effRange(p.range,O)))V.zone.add(K(t.x,t.y));
  }
  return V;
}
function chooseOrigin(u,p,T,V){
  const os=V.targets.get(K(T.x,T.y));if(!os||!os.length)return null;
  const score=o=>{
    let s=o.prov*10+o.haz*2+o.s*.1;
    if(o.x===u.x&&o.y===u.y)s-=.5;
    if(o.s>(u.mp||0))s+=2;
    if(p.tgt==='enemy'&&p.range>1&&!p.reach){s-=man(o,T)*.3;if(adjFoe(o,u))s+=3;}
    if(p.tgt==='enemy'){const e=unitAt(T.x,T.y);if(e)s-=netBoon(u,e,p,o).net*1.5;}
    return s;
  };
  return os.slice().sort((a,b)=>score(a)-score(b))[0];
}
function areaTargets(u,p,C){
  const r=p.area;
  if(p.aff==='ally')return allies(u).filter(a=>!a.object&&!a.caged&&cheb(a,C)<=r);
  let L=foesOf(u).filter(e=>cheb(e,C)<=r&&!(p.tgt==='self'&&e.x===C.x&&e.y===C.y));
  if(p.aff==='undead')L=L.filter(e=>e.undead);
  if(p.onlyMult)L=L.filter(e=>e.st.mult);
  return L;
}
/* Healing: a fixed amount, or one roll of the healer's hit die (healDie, exploding). Clerics add Presence from level 2. */
function healAmt(u,base,p,roll){
  let v=p&&p.healDie?(roll?rollEx(HD[u.cls]||8):Math.round(exAvg(HD[u.cls]||8))):base;const f=LASTEX.slice(),r0=v;
  if(p&&p.healDie&&resLv('Mend',u)>=1)v+=1;
  if(u.kind==='pc'&&u.cls==='cleric'&&feat2(u))v+=3;
  if(p&&p.healDie&&roll)showRoll({side:u.side,title:p.name.toUpperCase(),dice:exDice(HD[u.cls]||8,f,'heal'),verdict:`d${HD[u.cls]||8}${v>r0?'+'+(v-r0):''} = heals ${v}`,res:3});
  return v;
}
/* What the healer's build adds when they heal ally a (roll: spend the once-a-turn bonuses). */
function healBonus(u,a,roll){
  if(!u||u.kind!=='pc')return 0;let b=0;
  if(a!==u&&hasP(u,'medic'))b+=2;
  if(u.cls==='cleric'&&hasP(u,'gift'))b+=2;
  const pv=hasP(u,'echomercy')&&u.emR!==G.round&&prevHero(u);
  if(pv&&(G.healedR||{})[pv.id]===G.round){b+=4;if(roll)u.emR=G.round;}
  return b;
}
/* Forecast rows used by the UI and by the AI. */
/* The foes a power would roll against, aimed at T from O (before any pulls it makes). */
function strikeTargets(u,p,T,O){
  if(p.tgt==='enemy'){
    const t=unitAt(T.x,T.y);if(!t)return [];const L=[t];
    if(p.chain){let last=t;const done=new Set([t.id]);for(let i=0;i<p.chain;i++){const nx=foesOf(u).filter(e=>!done.has(e.id)&&man(e,last)<=3).sort((a,b)=>man(a,last)-man(b,last))[0];if(!nx)break;done.add(nx.id);L.push(nx);last=nx;}}
    return L;
  }
  if((p.tgt==='self'||p.tgt==='tile')&&p.area!=null&&p.aff!=='ally'){let L=areaTargets(u,p,p.tgt==='self'?O:T);if(p.adjOnly)L=L.filter(t=>man(t,O)===1);return L;}
  return [];
}
/* COMBO: a hero cashes in a set-up another hero made: a foe they staggered or exposed, or their blessing. */
function comboSetters(u,p,list){
  if(u.side!=='hero'||u.kind!=='pc'||p.noDmg||!p.dmg||!list.length)return [];
  const by=new Set();
  for(const t of list){if(t.st.stag&&t.stagBy&&t.stagBy!==u.id)by.add(t.stagBy);if(t.st.mult&&t.multBy&&t.multBy!==u.id)by.add(t.multBy);}
  if(u.st.bless&&u.blessBy&&u.blessBy!==u.id)by.add(u.blessBy);
  return [...by].filter(id=>{const s=U(id);return s&&s.side==='hero';});
}
function forecast(u,p,T,O){
  O=O||u;const rows=[];
  const by=comboSetters(u,p,strikeTargets(u,p,T,O));
  const combo=u.side==='hero'?(G.combo||0)+(by.length?1:0):0;
  rows.by=by;rows.combo=combo;
  // each target: the hit as DAMAGE × MULT, its crit chance, and the lowest and highest damage the dice can give
  const mk=t=>{
    if(!p.dmg||p.noDmg)return {t,ctrl:true,probs:[0,1,0],dmg:null,mult:p.mult||0};
    const dd=heroDice(u,p,t,O),probs=dieProbs(dd.s,0,dd),k=p.hits||1;
    const X=pcDmgX(u,p,t,2,{dd}),XC=pcDmgX(u,p,t,3,{dd});
    const lo=pcDmgX(u,p,t,2,{dd,dice:dd.n+(dd.xn||0)+dd.b,crits:0}).d*k;
    const hi=pcDmgX(u,p,t,3,{dd,dice:dd.n*dd.s+(dd.xn||0)*(dd.xs||dd.s)+dd.b,crits:dd.nocrit?0:dd.n}).d*k;
    return {t,dice:dd,probs,X,XC,lo,hi,dmg:[0,X.d*k,XC.d*k],ctrl:false,sneak:sneakOn(u,t),mult:p.mult||0};};
  if(p.tgt==='enemy'){
    for(const t of strikeTargets(u,p,T,O))rows.push(mk(t));
  }else if(p.tgt==='ally'){
    const a=(T.x===u.x&&T.y===u.y)||(T.x===O.x&&T.y===O.y)?u:unitAt(T.x,T.y);
    if(a)rows.push({t:a,heal:p.heal?healAmt(u,p.heal,p)+healBonus(u,a):0,shield:p.shield||0,bless:p.bless||0,refresh:p.refresh});
  }else if(p.tgt==='self'||(p.tgt==='tile'&&p.area!=null)){
    const C=p.tgt==='self'?O:T;
    if(p.area!=null){
      if(p.aff==='ally')for(const a of areaTargets(u,p,C))rows.push({t:a,heal:p.heal?healAmt(u,p.heal,p)+healBonus(u,a):0,shield:p.shield||0,bless:p.bless||0});
      else for(const t of strikeTargets(u,p,T,O))rows.push(mk(t));
    }
  }
  return rows;
}
function evRow(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+pr*Math.min(hp,r.dmg[i]),0);}
function killP(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+(r.dmg[i]>=hp?pr:0),0);}
/* Class features from level 2 (Heroes book): journey heroes, who do not level, have them from the start; rival heroes by level. */
function feat2(u){return (u.lvl||1)>=2||(u.kind==='pc'&&!u.rival);}
function pushExtra(u,p){return (u.kind==='pc'&&u.cls==='wizard'&&feat2(u)?1:0)+(u.side==='hero'&&hasR('gauntlet')?1:0)+(hasP(u,'hardshove')?1:0)+(resLv('Reach',u)>=1?1:0);}

/* A power's crit trigger: special effects when at least one of its dice crits. */
async function critFx(u,p,t,fl){
  const c=p.crit;H.pop(u,'Crit!','gold');
  if(c.stun&&live(t)){stagger(t,u);if(t.st.stag){note('Crit: Stunned.');if(fl&&fl.stagIds)fl.stagIds.add(t.id);}}
  if(c.root&&live(t)){addSt(t,'root',1);note('Crit: Rooted.');}
  if(c.burn&&live(t)){addSt(t,'burn',c.burn);note(`Crit: Burn ${c.burn}.`);}
  if(c.give&&live(t)){giveMult(t,u,c.give);note(`Crit: +${c.give} Mult.`);}
  if(c.push&&live(t))await forceMove(t,u,c.push,false,u,fl);
  if(c.bless)for(const a of allies(u).filter(a=>!a.object&&a.kind==='pc'&&man(a,u)<=2))blessUnit(a,u,c.bless);
  if(c.act&&u.critActR!==G.round){u.critActR=G.round;u.acts=(u.acts||0)+1;u.acted=false;H.pop(u,'+1 action','gold');note('Crit: an action back.');}
}
async function pcStrike(u,p,t,C,fl){
  const hits=p.hits||1;
  for(let h=0;h<hits&&live(t);h++){
    NOTE=[];
    let r=null,X=null,d=0;
    if(p.dmg&&!p.noDmg){
      const dd=heroDice(u,p,t,u,fl);
      r=rollDice(dd,0,false,false,u.side);
      if(r.rr)u.steadyR=G.round;
      X=pcDmgX(u,p,t,r.res,{dd,dice:r.total,crits:r.crits});d=X.d;
      showRoll({side:u.side,title:`${u.name.toUpperCase()}: ${p.name.toUpperCase()}`,sub:multCap(X),dice:dieList(r),verdict:atkVerdict(r,X),res:r.res});
      await H.rolls();
      H.result(t,r);
      // a hit spends the target's Mult, the attacker's Bless, hiding and Opening Strike
      if(t.st.mult){delete t.st.mult;t.multBy=null;}
      if(u.st.bless){delete u.st.bless;u.blessBy=null;}
      if(t.hidden)t.hidden=false;if(u.hidden)u.hidden=false;
      if(d>0&&fl.react&&u.side==='hero'&&hasR('lens'))d+=3;
      if(d>0)d=await guardHit(u,t,d,r.res===3);
      const hpB=t.hp+t.shield;
      if(d>0)await damage(u,t,d,{crit:r.res===3,radiant:typeOf(u,p)==='radiant',area:p.area!=null});
      if(!live(t)&&d>hpB&&hasP(u,'overkill')){const o=fighters(u).find(f=>f!==t&&man(f,t)===1);if(o){note(`Overkill: ${d-hpB} spills onto ${o.name}.`);await damage(u,o,d-hpB,{});}}
    }else await H.pause(80);
    fl.hitIds.add(t.id);
    if(live(t)){
      if(p.mark){applyMark(t,u);note('Taunted.');}
      if(p.mult){giveMult(t,u,p.mult);note(`+${t.st.mult} Mult.`);}
      applyEff(u,t,p.eff,2);
      if(r&&r.crits&&p.crit)await critFx(u,p,t,fl);
      // runes work on every attack the weapon makes
      const w=p.dmg&&!p.noDmg&&!p.wdie&&wpnOf(u);
      const crit=!!r&&r.res===3;
      if(crit&&live(t)&&w){
        if(w.flame)applyEff(u,t,{burn:[2,2,2]},2);
        if(w.frost)applyEff(u,t,{root:[1,1,1]},2);
        if(w.venom)applyEff(u,t,{burn:[2,2,2]},2);
      }
      if(w&&w.warding&&r)for(const a of allies(u).filter(a=>!a.object&&(a===u||man(a,u)===1))){a.shield+=2;H.pop(a,'⛨ 2','shield');}
      let push=tv(p.eff&&p.eff.push,2),pull=tv(p.eff&&p.eff.pull,2);
      if(crit&&w&&w.thunder&&!pull)push=Math.max(push,1);
      if(push&&live(t))await forceMove(t,C,push+pushExtra(u,p),false,u,fl);
      if(pull&&live(t))await forceMove(t,C,pull+pushExtra(u,p),true,u,fl);
      if(fl.stagIds&&t.st.stag&&t.stagBy===u.id)fl.stagIds.add(t.id);
    }
    const ex=NOTE||[];NOTE=null;
    log(`${u.name}: ${p.name} → ${t.name}. ${r?dmgLog(r,X)+'.':''} ${ex.join(' ')}`,sideCol(u));
  }
}
async function support(u,a,p,fl){
  NOTE=[];
  if(p.heal){const g=heal(a,healAmt(u,p.heal,p,true)+healBonus(u,a,true));if(g>0&&a!==u)fl.healedOther=true;}
  if(p.shield){a.shield+=p.shield;H.pop(a,'⛨ '+p.shield,'shield');note(`${a.name} gains ${p.shield} shield.`);if(a!==u){xp(u,p.shield/2,'support');fl.healedOther=true;}}
  if(p.bless){blessUnit(a,u,p.bless);note(`${a.name} is blessed (+${a.st.bless} damage).`);if(a!==u){xp(u,4,'support');fl.healedOther=true;}}
  if(p.cleanse){cleanse(a);note('Conditions end.');}
  const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));
  H.upd(a);
}
async function usePower(u,p,T){
  HELPER=u;try{await usePower0(u,p,T);}finally{HELPER=null;}
}
/* A reaction strike with the hero's basic attack (opportunity attacks, the rogue's Opportunist): no momentum and no
   multiple attack penalty, but it can cash in an ally's set-up for a combo. */
async function heroStrike(u,t,label,o){
  const id=u.powers.find(k=>POWERS[k]&&POWERS[k].basic)||BASIC[u.cls];const p=POWERS[id];if(!p||!live(t)||!live(u))return null;
  const fl={hitIds:new Set(),stagIds:new Set(),sneak:false,healedOther:false,slam:false,combo:false,usedBless:false,react:true,free:!!(o&&o.free)};
  H.pop(u,label,'call');
  const by=comboSetters(u,p,[t]);if(by.length)comboHit(u,by,fl);
  const h0=HELPER;HELPER=u;
  try{await H.strike(u,t,{proj:p.proj,power:p});await pcStrike(u,p,t,{x:u.x,y:u.y},fl);}finally{HELPER=h0;}
  u.openUsed=true;
  H.upd(u);return fl;
}
/* Defend (Core Rules 3.6): a hero hit by something that is not a crit may spend a saved action to roll their armour die
   and take that much less (+2 with a shield, +2 Brace, +2 when an ally Blocks). Glass Cannon heroes cannot Defend.
   Then a cleric within 3 may halve a hit of 4 or more (Warding Word). */
function defendRoll(t,extra){const [s,sh]=HERO_DEF[t.cls]||[4,0];const w=wpnOf(t);const shield=sh>0&&!(w&&w.twoHanded);
  const shep=allies(t).some(c=>c!==t&&hasP(c,'shepherd')&&cheb(c,t)===1);
  const v0=rollEx(s);let plus=0;const why=[];
  if(shield){plus+=2;why.push('+2 shield');}if(extra){plus+=2;why.push('+2 Block');}if(shep){plus+=2;why.push('+2 Shepherd');}if(t.swDef){plus+=2;why.push('+2 Second Wind');}
  if(hasP(t,'brace')&&t.braceR!==G.round){t.braceR=G.round;plus+=2;why.push('+2 Brace');}
  return {s,rolls:[v0],v:v0+plus,plus,why,dice:[{s,v:v0,k:'def'}]};}
async function guardHit(src,t,d,crit){
  if(!src||!t||src.side===t.side||!live(t))return d;
  const gFree=t.kind==='pc'&&resLv('Guard',t)>=2&&t.g2R!==G.round&&canReact(t)&&G.cur!==t.id;
  // Defend: autoplay heroes defend hits of TUNE.guardMin or more; the player is asked (a 1-damage hit is not worth it)
  if(!crit&&t.kind==='pc'&&d>=(isPlayer(t)?2:TUNE.guardMin)&&!hasP(t,'glass')&&(gFree||reactReady(t,'defend'))){
    const B=G.units.find(F=>F!==t&&F.kind==='pc'&&F.side===t.side&&hasP(F,'block')&&man(F,t)===1&&live(F));
    const [ds,sh]=HERO_DEF[t.cls]||[4,0];
    const ok=gFree||await askReact(t,'DEFEND?',`{r:${src.name} hits ${t.name} for ${d}.}\n\nDefend: roll ${t.name}'s armour die (d${ds}${sh>0?' +2 shield':''}) and take that much less.\n\n{m:${gFree?'Free (Guard resonance).':`Costs 1 of ${t.name}'s ${t.acts} ready ${t.acts>1?'actions':'action'}.`}}`,'DEFEND');
    if(ok){
      if(gFree)t.g2R=G.round;else spendReact(t,'defend');
      if(B)H.pop(B,'Block!','call');
      const R=defendRoll(t,B?1:0);const nd=Math.max(1,d-R.v);
      showRoll({side:t.side,title:`${t.name.toUpperCase()} DEFENDS`,sub:R.why.length?R.why.join(', '):`Armour d${R.s}`,dice:R.dice,verdict:`Blocks ${R.v}: ${d} → ${nd} damage`,res:2});
      H.pop(t,'Defend','shield');t.hitSince=true;
      note(`${t.name} defends, spending a ready action${B?' ('+B.name+' blocks)':''} (d${R.s} [${R.rolls[0]}]${R.why.length?' '+R.why.join(' '):''}: ${R.v}): ${d} to ${nd}.`);d=nd;
      if(hasP(t,'counterguard')&&t.cgR!==G.round){t.cgR=G.round;addMom(t,1);}
    }
  }
  if(d<4)return d;
  const C=t.side==='hero'&&G.units.find(c=>c!==t&&c.kind==='pc'&&hasP(c,'warding')&&c.side===t.side&&man(c,t)<=3&&reactReady(c,'warding'));
  if(C&&await askReact(C,'WARDING WORD?',`{r:${t.name} is about to take ${d} damage.} ${C.name} can speak a Warding Word to halve it.\n\n{m:Costs 1 of ${C.name}'s ${C.acts} ready ${C.acts>1?'actions':'action'}.}`,'WARD')){
    spendReact(C,'warding');const nd=Math.floor(d/2);H.pop(C,'Warding Word','gold');H.pop(t,'Warded','shield');note(`${C.name}'s Warding Word halves it: ${d} to ${nd}.`);return nd;}
  return d;
}
/* Intercept: the fighter spends a saved action to take a blow meant for an ally beside her. */
function interceptor(v,src){
  if(!v)return null;
  return G.units.find(F=>F!==v&&F.kind==='pc'&&hasP(F,'intercept')&&F.side===v.side&&man(F,v)===1&&reactReady(F,'intercept'))||null;
}
/* Repelling Ward: when a foe steps up beside the wizard, the wizard spends a saved action to push it 1 square away. */
async function repelWard(e){
  if(!live(e)||e.object)return;
  const W=G.units.find(w=>w.kind==='pc'&&hasP(w,'repel')&&w.side!==e.side&&man(w,e)===1&&reactReady(w,'repel'));if(!W)return;
  if(!await askReact(W,'REPELLING WARD?',`{r:${e.name} has stepped up beside ${W.name}.} Push it 1 square away?\n\n{m:Costs 1 of ${W.name}'s ${W.acts} ready ${W.acts>1?'actions':'action'}.}`,'PUSH'))return;
  spendReact(W,'repel');H.pop(W,'Repelling Ward','call');await H.strike(W,e,{proj:'#c39bff'});
  NOTE=[];await forceMove(e,W,1,false,W,null,{noStag:true});const ex=NOTE||[];NOTE=null;
  log(`${W.name}'s Repelling Ward shoves ${e.name} away. ${ex.join(' ')}`,sideCol(W));
}
/* Opportunist: when an ally hits a foe beside the rogue, the rogue spends a saved action to strike it too (not a
   staggered foe: that one still loses its turn). */
async function opportunist(u,fl){
  if(u.kind!=='pc'||!fl.hitIds.size)return;
  for(const R of G.units.filter(r=>r!==u&&r.kind==='pc'&&hasP(r,'opportunist')&&r.side===u.side)){
    const t=[...fl.hitIds].map(U).find(t=>t&&live(t)&&!t.object&&t.side!==R.side&&!t.st.stag&&man(R,t)===1);
    if(t&&reactReady(R,'opportunist')&&await askReact(R,'OPPORTUNIST?',`{g:${u.name} hit ${t.name}, right beside ${R.name}.} Strike it too, with ${R.name}'s basic attack?\n\n{m:Costs 1 of ${R.name}'s ${R.acts} ready ${R.acts>1?'actions':'action'}.}`,'STRIKE')){spendReact(R,'opportunist');await heroStrike(R,t,'Opportunist!');if(G.over)return;}
  }
}
/* Bless the ally best placed to use it: nearest to a foe, within r of u. */
function blessNear(u,r,fl){
  const c=allies(u).filter(a=>a!==u&&!a.object&&!a.caged&&a.kind!=='npc'&&man(a,u)<=r);if(!c.length)return;
  const fo=fighters(u);const score=a=>Math.min(9,...fo.map(f=>man(f,a)));c.sort((a,b)=>score(a)-score(b));const a=c[0];
  blessUnit(a,u);log(`${a.name} is blessed.`,sideCol(u));xp(u,4,'support');fl.healedOther=true;
}
/* A combo: +2 momentum for the hero who cashed in the set-up and for each hero who made it, plus Set-up I resonance,
   Conductor and Rhythm. One per action. */
function comboHit(u,by,fl){
  if(fl.combo)return;fl.combo=true;
  G.combo=(G.combo||0)+1;G.combos=(G.combos||0)+1;
  addMom(u,2+(u.side==='hero'&&hasR('drum')?1:0));xp(u,1,'combo');
  if(resLv('Set-up',u)>=1&&G.comboR!==G.round){G.comboR=G.round;addMom(u,1);}
  if(hasP(u,'conductor'))for(const h of allies(u).filter(h=>h!==u&&h.kind==='pc'))addMom(h,1);
  const grow=h=>{if(hasP(h,'rhythm')){h.grow=h.grow||{};h.grow.rhythm=Math.min(4,(h.grow.rhythm||0)+1);}};grow(u);
  const names=[];
  for(const id of by){const s=U(id);if(!s||s===u)continue;if(live(s))addMom(s,2);xp(s,1,'setup');grow(s);names.push(s.name);}
  H.combo(u,G.combo,by);
  log(`Combo ×${G.combo}! ${names.join(' and ')} set it up for ${u.name}: +2 momentum each. `,'g');
}
/* Saves are retired (v0.25): effects simply happen, and bosses shrug off Stun (they take +2 Mult instead). */
function saveText(){return '';}
async function usePower0(u,p,T){
  const cost=powerCost(u,p);u.mom-=cost;if(p.cost>0)u.warmUsed=true;
  if(cost>=3&&u.kind==='pc')for(const h of allies(u).filter(h=>h!==u&&hasP(h,'echo')&&prevHero(h)===u)){addMom(h,1);H.pop(h,'+1 ◆','res');}
  if(p.swapPrev)u.repR=G.round;
  await usePower1(u,p,T);
  if(isAttack(p)&&u.kind==='pc'){u.openUsed=true;u.firstR=G.round;}
  await afterPower(u);
}
/* Follow-Through and Anvil fire once the power has finished. */
async function afterPower(u){
  if(G.over)return;
  const fq=G.ftq||[];G.ftq=[];
  for(const tid of fq){const t=U(tid);if(!live(t))continue;
    for(const h of heroes().filter(h=>h.side!==t.side&&h.stagBy!==t.id&&hasP(h,'followthru')&&t.stagBy!==h.id&&man(h,t)<=3&&man(h,t)>1&&!h.st.root)){
      const R=reach(h,2);let b=null;for(const n of R.values()){if(n.prov)continue;const d=man(n,t);if(!b||d<b.d)b={d,n};}
      if(b&&(b.n.x!==h.x||b.n.y!==h.y)){log(`${h.name} follows through.`,sideCol(h));await walk(h,pathOf(b.n),true);if(G.over)return;}
    }}
  const pq=G.pend||[];G.pend=[];
  for(const q of pq){if(live(q.u)&&live(q.t)&&!G.over)await heroStrike(q.u,q.t,q.label);}
}
async function usePower1(u,p,T){
  const fl={hitIds:new Set(),stagIds:new Set(),sneak:false,healedOther:false,slam:false,combo:false,usedBless:false};
  if(p.tgt!=='enemy'||p.area!=null)log(`${u.name} uses ${p.name}.`,sideCol(u));
  const by=comboSetters(u,p,strikeTargets(u,p,T,{x:u.x,y:u.y}));
  if(by.length)comboHit(u,by,fl);
  if(p.tgt==='enemy'){
    const t=unitAt(T.x,T.y);if(!t)return;
    if(p.teleportAdj){const spot=freeAdj(t,u).sort((a,b)=>man(a,u)-man(b,u))[0];if(spot)await teleport(u,spot);}
    await H.strike(u,t,{proj:p.proj,power:p});
    const pre={x:t.x,y:t.y};
    await pcStrike(u,p,t,{x:u.x,y:u.y},fl);
    if(p.blessNear&&live(u))blessNear(u,p.blessNear,fl);
    if(p.follow&&live(u)&&!unitAt(pre.x,pre.y)&&man(u,pre)===1&&!blocked(pre.x,pre.y)){u.x=pre.x;u.y=pre.y;await H.step(u);await onEnter(u);}
    if(p.cleave&&live(u)){const o=fighters(u).find(f=>f!==t&&man(f,u)===1);if(o){await H.strike(u,o,{});NOTE=[];await damage(u,o,3+(hasR('whetstone',u)?1:0),{});const ex=NOTE||[];NOTE=null;log(`Cleave hits ${o.name}: ${ex.join(' ')}`,sideCol(u));}}
    if(p.chain){
      let last=t;const done=new Set([t.id]);
      for(let i=0;i<p.chain;i++){
        const nx=foesOf(u).filter(e=>!done.has(e.id)&&man(e,last)<=3).sort((a,b)=>man(a,last)-man(b,last))[0];
        if(!nx)break;done.add(nx.id);await H.strike(last,nx,{proj:p.proj,chain:true});await pcStrike(u,p,nx,{x:u.x,y:u.y},fl);last=nx;
      }
    }
  }else if(p.tgt==='ally'){
    const a=(T.x===u.x&&T.y===u.y)?u:unitAt(T.x,T.y);if(!a)return;
    if(p.swap){const ux=u.x,uy=u.y;u.x=a.x;u.y=a.y;a.x=ux;a.y=uy;await H.tele(u,u,true);H.upd(a);if(p.shield){u.shield+=p.shield;H.pop(u,'⛨ '+p.shield,'shield');}xp(u,3,'support');fl.healedOther=true;await onEnter(u);if(live(a))await onEnter(a);}
    if(p.refresh){xp(u,8,'support');if(!G.extra.includes(a.id))G.extra.push(a.id);H.pop(a,'Inspired!','gold');H.sfx('holy');log(`${a.name} will take an extra turn.`,sideCol(u));}
    await support(u,a,p,fl);
  }else if(p.helpUp){
    const f=G.units.find(h=>h.side===u.side&&h.kind==='pc'&&h.dead&&!h.gone&&!h.slain&&h.x===T.x&&h.y===T.y);
    if(f&&freeTile(f.x,f.y,null)){const hu=rollEx(HD[f.cls]||8);showRoll({side:u.side,title:'HELP UP',dice:exDice(HD[f.cls]||8,LASTEX,'heal'),verdict:`${f.name} stands with ${Math.min(f.maxHp,hu)} HP`,res:3});await H.rolls();f.dead=false;f.hp=Math.min(f.maxHp,hu);f.st={};f.shield=0;H.spawn(f);H.sfx('heal');xp(u,4,'support');fl.healedOther=true;log(`${u.name} helps ${f.name} up (${f.hp} HP).`,sideCol(u));}
  }else if(p.teleport){
    await teleport(u,T);
  }else if(p.wall){
    for(const dx of[-1,0,1]){const x=T.x+dx,y=T.y;if(inB(x,y)&&!blocked(x,y)&&!unitAt(x,y))G.walls[K(x,y)]=3;}
    await H.area(T,0,'ice');H.sfx('ice');
  }else if(p.revive){
    const f=G.units.filter(h=>h.side===u.side&&h.kind==='pc'&&h.dead&&!h.slain).pop();
    const spot=freeAdj(u,u)[0]||tilesWithin(u,3).find(t=>freeTile(t.x,t.y,null));
    if(f&&spot){f.dead=false;f.hp=Math.min(f.maxHp,rollEx(HD[f.cls]||8)+rollEx(HD[f.cls]||8));f.x=spot.x;f.y=spot.y;f.st={};f.shield=0;H.spawn(f);H.sfx('holy');log(`${f.name} is revived!`,sideCol(u));}
  }else if(p.area!=null&&!p.hide){
    const C=p.tgt==='self'?{x:u.x,y:u.y}:{x:T.x,y:T.y};
    await H.area(C,Math.min(p.area,8),p.fx||(p.aff==='ally'?'holy':'force'));
    NOTE=[];
    if(p.pullFirst){for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object).sort((a,b)=>man(a,C)-man(b,C))){await forceMove(f,C,p.pullFirst+pushExtra(u,p),true,u,fl);if(live(f)){applyMark(f,u);if(p.pullStag){stagger(f,u);if(f.st.stag)fl.stagIds.add(f.id);}}}}
    if(p.pullCenter){for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object).sort((a,b)=>man(a,C)-man(b,C)))await forceMove(f,C,p.pullCenter+pushExtra(u,p),true,u,fl);}
    const pre=NOTE||[];NOTE=null;if(pre.length)log(pre.join(' '),sideCol(u));
    let list=areaTargets(u,p,C);
    if(p.adjOnly)list=list.filter(t=>man(t,u)===1);
    if(p.noDmg&&!p.eff&&!p.mark&&!p.mult)list=[];
    const pushy=p.eff&&p.eff.push;
    list.sort((a,b)=>pushy?man(b,C)-man(a,C):man(a,C)-man(b,C));
    for(const t of list){if(p.aff==='ally')await support(u,t,p,fl);else await pcStrike(u,p,t,C,fl);}
    if(p.allyHeal){NOTE=[];for(const a of allies(u).filter(a=>!a.object&&!a.caged&&cheb(a,C)<=p.area)){const g=heal(a,healAmt(u,p.allyHeal)+healBonus(u,a,true));if(g>0&&a!==u)fl.healedOther=true;}const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
    if(p.zone)G.zones.push({x:C.x,y:C.y,r:p.zone.r!=null?p.zone.r:1,rounds:2,dmg:p.zone.dmg,eff:p.zone.eff,radiant:!!p.zone.radiant,fx:p.fx,side:u.side});
    if(p.igniteCenter){setHaz(C.x,C.y,'fire',3,u.side);log(`Fire takes hold at ${tileName(C.x,C.y)}.`,sideCol(u));}
    if(p.webArea)for(let y=C.y-1;y<=C.y+1;y++)for(let x=C.x-1;x<=C.x+1;x++)if(inB(x,y)&&!unitAt(x,y)&&!Tt(x,y).haz)setHaz(x,y,'web',3,u.side);
  }
  if(p.shieldDice){const w=wpnOf(u)||WEAPONS[START_WEAPON[u.cls]];let v=0,sf=[];for(let i=0;i<p.shieldDice;i++){v+=rollEx(w.dice[1]);sf=sf.concat(exDice(w.dice[1],LASTEX,'def'));}showRoll({side:u.side,title:p.name.toUpperCase(),dice:sf,verdict:`+${v} shield`,res:3});await H.rolls();u.shield+=v;H.pop(u,'⛨ '+v,'shield');log(`${u.name} gains ${v} shield.`,sideCol(u));}
  if(p.selfWind){u.swUsed=(+u.swUsed||0)+1;if(u.hd!=null)u.hd--;NOTE=[];const r0=rollEx(HD[u.cls]||8),swf=LASTEX.slice(),r=r0+(resLv('Mend',u)>=1?1:0)+(hasP(u,'gift')?2:0);
    showRoll({side:u.side,title:'SECOND WIND',dice:exDice(HD[u.cls]||8,swf,'heal'),verdict:`d${HD[u.cls]||8}+${r-r0+3} = heals ${r+3}`,res:3});await H.rolls();heal(u,r+3);const ex=NOTE||[];NOTE=null;log(`${u.name} catches a second wind (d${HD[u.cls]||8}: ${r} + Strength ${u.attrs.M||0}). ${ex.join(' ')}`,sideCol(u));}
  if(p.selfHeal){NOTE=[];heal(u,p.selfHeal);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
  if(p.markAround)for(const f of fighters(u).filter(e=>cheb(e,u)<=p.markAround))applyMark(f,u);
  if(p.healNear){const w=allies(u).filter(a=>!a.object&&!a.caged&&man(a,u)<=3&&a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(w){NOTE=[];const g=heal(w,p.healNear);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));if(g>0&&w!==u)fl.healedOther=true;}}
  if(p.gainRes)addMom(u,p.gainRes);
  if(p.hide){u.hidden=true;H.pop(u,'Hidden','call');H.sfx('whoosh');}
  // momentum comes from combos (comboHit) and from the first basic attack of each turn
  if(u.side==='hero')G.ftq=(G.ftq||[]).concat([...fl.stagIds]);
  if((basicP(p)||p.sling)&&u.kind==='pc'&&G.cur===u.id&&!u.momBasic){u.momBasic=true;const n=1+(u.side==='hero'&&hasR('map')?1:0);addMom(u,n);H.pop(u,`+${n} ◆`,'res');}
  if(!G.over)await opportunist(u,fl);
  H.upd(u);
}

/* ---------------- UNIT ACTIONS (player API) ---------------- */
function afterUnit(u){
  const vil=G.units.find(v=>v.kind==='npc'&&v.npc==='villager');
  if(vil&&vil.caged&&heroes().some(h=>man(h,vil)===1)){vil.caged=false;H.pop(vil,'Freed!','gold');H.sfx('chest');log('The captive is freed! They will follow your orders.','g');H.upd(vil);}
  if(G.enc.type==='breakout'&&u.side==='hero'&&u.kind==='pc'&&live(u)&&u.y===0){u.gone=true;H.pop(u,'Escaped!','gold');H.sfx('holy');log(`${u.name} escapes!`,'g');H.death(u);}
}
async function cmdMove(u,dest){
  if(!G.await||G.cur!==u.id||!canMoveNow(u))return false;
  const n=reach(u,moveBudget(u,0)).get(K(dest.x,dest.y));if(!n||(n.x===u.x&&n.y===u.y))return false;
  pushSnap();G.cmd++;
  if(n.s>(u.mp||0))spendMove(u);
  await walk(u,pathOf(n),true);
  u.moved=true;
  if(live(u))afterUnit(u);
  await checkEnd();H.save();
  return true;
}
async function cmdAct(u,pi,T,origin){
  const p=powerOf(u,pi);
  if(!G.await||G.cur!==u.id||!canAct(u,p))return false;
  pushSnap();G.cmd++;
  if(origin&&(origin.x!==u.x||origin.y!==u.y)){
    const n=reach(u,moveBudget(u,actCost(p,u))).get(K(origin.x,origin.y));if(!n)return false;
    if(n.s>(u.mp||0))spendMove(u);
    await walk(u,pathOf(n),true);u.moved=true;
    if(!live(u)||G.over||u.x!==origin.x||u.y!==origin.y){afterUnit(u);await checkEnd();H.save();return false;}
    if(!targetsFrom(u,p,u).some(t=>t.x===T.x&&t.y===T.y)){afterUnit(u);await checkEnd();H.save();return false;}
  }
  await doPower(u,p,T);
  if(live(u))afterUnit(u);
  await checkEnd();H.save();
  return true;
}
function turnDone(u){return !live(u)||(u.kind==='pc'?(u.acts||0)<=0&&!((u.mp||0)>0&&canMoveNow(u)):(u.mp||0)<=0);}

/* ---------------- UNDO ---------------- */
function snapG(){return JSON.stringify(G);}
function stateKey(){return JSON.stringify(G,(k,v)=>k==='log'||k==='await'||k==='cur'?undefined:v);}
function pushSnap(){const k=stateKey();if(HIST.length&&HIST[HIST.length-1].k===k)return;HIST.push({s:snapG(),k,cur:G.cur});if(HIST.length>80)HIST.shift();}
let _uc={key:'',v:false};
function canUndo(){
  if(!G||!G.await||G.over||!HIST.length)return false;
  const key=G.cmd+'|'+G.cur+'|'+G.log.length+'|'+HIST.length;
  if(_uc.key!==key){const k=stateKey();_uc={key,v:HIST.some(e=>e.k!==k)};}
  return _uc.v;
}
function undo(){
  ROLLQ.length=0;
  if(!canUndo())return false;
  const k=stateKey();
  while(HIST.length&&HIST[HIST.length-1].k===k)HIST.pop();
  const e=HIST.pop();if(!e)return false;
  G=JSON.parse(e.s);G.await=true;
  G.log.push({m:'Undone.',c:'g'});
  _uc.key='';
  return true;
}

/* ---------------- MONSTER AI ---------------- */
function distField(sources){
  const d=new Map();const q=[];
  for(const s of sources){const k=K(s.x,s.y);if(!d.has(k)){d.set(k,0);q.push({x:s.x,y:s.y});}}
  while(q.length){const n=q.shift();const c=d.get(K(n.x,n.y));for(const[dx,dy]of DIRS){const x=n.x+dx,y=n.y+dy,k=K(x,y);if(!inB(x,y)||blocked(x,y)||d.has(k))continue;d.set(k,c+1);q.push({x,y});}}
  return d;
}
function evMon(e,A,t,O){
  const nb=netBoon(e,t,A,O);
  let probs=A.flat!=null?[0,1,0]:dieProbs(atkDice(e,A).s,0,atkDice(e,A));
  const hp=t.hp+t.shield;let ev=0,kp=0;
  for(let i=0;i<3;i++){const d=monDmg(e,A,t,i+1);ev+=probs[i]*Math.min(hp,d);if(d>=hp)kp+=probs[i];}
  return {ev,kill:kp,net:nb.net};
}
/* Rough value of pushing/pulling t into hazards or obstacles. */
function forcedValue(src,t,from,n,pull){
  if(t.object||!n)return 0;n-=(t.steady||0);if(n<=0)return 0;
  let x=t.x,y=t.y,v=0;
  for(let i=0;i<n;i++){
    let dx=x-from.x,dy=y-from.y;if(pull){dx=-dx;dy=-dy;}
    let sx=0,sy=0;if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)sx=Math.sign(dx);else if(dy!==0)sy=Math.sign(dy);else break;
    const nx=x+sx,ny=y+sy;if(pull&&man({x:nx,y:ny,sz:SZ(t)},from)===0)break;
    if(!fits(t,nx,ny)){if(!pull)v+=2+(n-i-1);break;}
    x=nx;y=ny;v+=hazCost(t,x,y)*1.2;
  }
  return v;
}
/* Foes work against the mission: most of them go for the captive, the shrine, the wagon, the chests or the
   exits rather than simply the nearest hero. Which foes do is fixed per foe so their behaviour is steady. */
function objSources(e,vil,wag){
  const E=G.enc,h=((parseInt(e.id.slice(1))||0)*37+13)%100/100;
  const pick2=(f,L)=>h<f?L:null;
  switch(E.type){
    case 'rescue':return vil&&live(vil)?pick2(vil.carried?.55:.7,[vil]):null;
    case 'hold':return pick2(.65,E.zone.map(z=>({x:z[0],y:z[1]})));
    case 'defend':return wag&&live(wag)?pick2(.8,[wag]):null;
    case 'loot':return G.chests.length?pick2(.5,G.chests.map(k=>({x:KX(k),y:KY(k)}))):null;
    case 'breakout':{const L=[];for(let x=0;x<COLS;x++)if(!blocked(x,0))L.push({x,y:0});return pick2(.5,L);}
    case 'ritual':{const P=G.units.filter(u=>u.pillar&&live(u));return P.length?pick2(.45,P):null;}
    case 'assassinate':{const L=G.units.find(u=>u.leader&&live(u));if(!L||L===e)return null;return pick2(.5,[L]);}
  }
  return null;
}
/* How much a hero standing at O would further the mission (used by the hero autoplay). */
function objBonus(u,O){
  const E=G.enc;if(u.side!=='hero'||u.kind!=='pc')return 0;let b=0;
  if(E.type==='hold'&&E.zone.some(z=>z[0]===O.x&&z[1]===O.y))b+=3;
  if(E.type==='loot'&&G.chests.includes(K(O.x,O.y)))b+=5;
  if(E.type==='rescue'){const v=G.units.find(q=>q.npc==='villager'&&live(q));
    if(v&&v.caged&&man(O,v)===1)b+=4;
    if(v&&v.carried){const holding=man(u,v)===1;if(holding)b+=(O.y-u.y)*1.6;else if(!heroes().some(o=>o!==u&&man(o,v)===1)&&man(O,v)===1)b+=3;}}
  if(E.type==='breakout'&&(G.round>=2||fighters(u).length<3))b+=(u.y-O.y)*1.5+(O.y===0?6:0);
  return b;
}
/* Taunt: a foe the fighter has marked can only attack her while it can reach her. */
function tauntOf(e){if(!e.st.mark||!e.marker)return null;const F=U(e.marker);return F&&live(F)&&F.kind==='pc'&&F.cls==='fighter'&&F.side!==e.side?F:null;}
function canHitFrom(A,t,n){const d=man(n,t);return d>=1&&d<=effRange(A.range,n)&&(d===1||los(n,t));}
function monCost(A,e){const p2=e&&mon(e).p2;return p2&&p2.breathCost&&A.cost&&/Breath/.test(A.name)&&bloodied(e)?Math.min(A.cost,p2.breathCost):A.cost;}
function monCanAct(A,e){return (!A.cost||G.foeMom>=monCost(A,e))&&!(A.cd&&(e.cd||{})[A.name]>G.round);}
function planMon(e){
  const m=mon(e);const R=reach(e,e.mp);
  const acts=m.acts.filter(A=>monCanAct(A,e));
  const targets=foesOf(e);
  const vil=G.units.find(v=>v.kind==='npc'&&v.npc==='villager'&&live(v)&&!v.caged);
  const wag=G.units.find(v=>v.kind==='npc'&&v.npc==='wagon'&&live(v));
  const tail=e.id.charCodeAt(e.id.length-1);
  let srcs=targets.filter(t=>!t.object);
  const obj=e.side==='enemy'&&!e.boss?objSources(e,vil,wag):null;if(obj&&obj.length)srcs=obj;
  if(!srcs.length)srcs=targets;
  const field=distField(srcs);
  const provCost=e.hp<=8?14:6;
  const ranged=m.acts[0]&&m.acts[0].range>1;
  const taunt=tauntOf(e);let tauntOK=false;
  if(taunt)for(const n of R.values()){if(e.st.daze&&(n.x!==e.x||n.y!==e.y))continue;if(acts.some(A=>!A.tgt&&!A.trap&&canHitFrom(A,taunt,n))){tauntOK=true;break;}}
  let best={s:-1e9,node:null,act:null,target:null};
  for(const n of R.values()){
    const moved=n.x!==e.x||n.y!==e.y;
    let base=-n.prov*provCost-n.haz*2-hazCost(e,n.x,n.y)*1.5;
    if(ranged)base-=fighters(e).filter(h=>man(h,n)===1).length*4;
    if(isHighT(n.x,n.y))base+=1;
    if(G.enc.type==='hold'&&e.side==='enemy'&&G.enc.zone.some(z=>z[0]===n.x&&z[1]===n.y))base+=8;
    if(G.enc.type==='loot'&&e.side==='enemy'&&G.chests.includes(K(n.x,n.y)))base+=5;
    let fd=40;for(const f of foot(e,n.x,n.y)){const k=K(f.x,f.y);if(field.has(k))fd=Math.min(fd,field.get(k));}
    const mo=base-fd*1.5-(moved?0:.3);
    if(mo>best.s)best={s:mo,node:n,act:null,target:null};
    if(e.st.daze&&moved)continue;
    for(const A of acts){
      if(A.tgt==='ally'){
        for(const a of allies(e).filter(a=>!a.object)){const miss=a.maxHp-a.hp;if(man(n,a)>A.range||miss<5)continue;const s=base+Math.min(miss,A.heal+G.dmgAdd)*1.1+(a.boss?4:0);if(s>best.s)best={s,node:n,act:A,target:a};}
        continue;
      }
      if(A.tgt==='self'){
        let s=-1e9;
        if(A.rally){const c=allies(e).filter(f=>f!==e&&man(f,e)<=3&&fighters(f).some(h=>man(h,f)===1)).length;s=base+c*4-A.cost*1.5;}
        if(A.mom)s=base+(targets.some(t=>man(t,n)<=4)?-5:3);
        if(s>best.s)best={s,node:n,act:A,target:e};
        continue;
      }
      if(A.trap){
        for(const t of tilesWithin(n,A.range)){
          if(blocked(t.x,t.y)||Tt(t.x,t.y).haz)continue;if(man(n,t)>1&&!los(n,t))continue;
          const o=unitAt(t.x,t.y);let s=-1e9;
          if(A.trap==='trap'){if(o)continue;const adj=fighters(e).filter(h=>man(h,t)===1).length;if(adj)s=base+4+adj;}
          else{if(o&&o.side!==e.side&&!immuneFire(o))s=base+7;else if(!o){const adj=fighters(e).filter(h=>man(h,t)===1&&!immuneFire(h)).length;if(adj)s=base+2+adj;}}
          if(s>best.s)best={s,node:n,act:A,target:t,tile:true};
        }
        continue;
      }
      for(const t of targets){
        if(tauntOK&&t!==taunt)continue;
        const d=man(n,t);if(d<1||d>effRange(A.range,n))continue;if(d>1&&!los(n,t))continue;
        const r=evMon(e,A,t,n);
        let s=base+r.ev*(t.kind==='pc'?1+(1-t.hp/t.maxHp)*.5+(t.cls==='wizard'||t.cls==='cleric'?.25:0):1.3)+r.kill*(t.kind==='pc'?22:35);
        if(t.kind==='npc')s+=t.npc==='villager'?12:8;
        if(A.area)for(const o of foesOf(e))if(o!==t&&cheb(o,t)<=A.area){const r2=evMon(e,A,o,n);s+=r2.ev+r2.kill*15;}
        if(A.eff)s+=1.5;
        if(A.eff&&(A.eff.push||A.eff.pull))s+=forcedValue(e,t,n,tv(A.eff.push||A.eff.pull,2),!!A.eff.pull);
        if(A.hazard)s+=2;
        if(A.cost)s-=A.cost*1.3;
        if(e.st.mark&&e.marker&&e.marker!==t.id){const F=U(e.marker);if(live(F)&&man(F,n)===1)s-=6;}
        if(s>best.s)best={s,node:n,act:A,target:t};
      }
    }
  }
  return best;
}
async function monAttack(e,A,t,isTile){
  if(!live(e))return;
  if(A.cost)G.foeMom-=monCost(A,e);
  if(A.cd){e.cd=e.cd||{};e.cd[A.name]=G.round+A.cd;}
  if(isTile){
    await H.strike(e,{x:t.x,y:t.y,id:'tile'},{proj:A.trap==='fire'?'#ff7a2a':'#c8b060',monster:true,act:A});
    setHaz(t.x,t.y,A.trap,A.trap==='trap'?-1:3,e.side);
    log(`${e.name}: ${A.name} at ${tileName(t.x,t.y)}.`,'e');H.sfx(A.trap==='fire'?'fire':'click');
    return;
  }
  if(!live(t))return;
  if(A.tgt==='ally'){await H.strike(e,t,{support:true});NOTE=[];heal(t,A.heal+G.dmgAdd);const ex=NOTE||[];NOTE=null;log(`${e.name} mends ${t.name}. ${ex.join(' ')}`,'e');return;}
  if(A.rally){H.pop(e,'Rally!','call');log(`${e.name} rallies its allies!`,'e');for(const f of allies(e).filter(f=>f!==e&&!f.object&&man(f,e)<=3)){const h=fighters(f).find(h=>man(h,f)===1);if(h)await partingBlow(f,h);}return;}
  if(A.mom){H.pop(e,'Offering','call');NOTE=[];await damage(null,e,3,{});NOTE=null;G.foeMom+=A.mom;log(`${e.name} bleeds itself to feed the foes' momentum (+${A.mom}).`,'e');return;}
  if(!A.area){const F=interceptor(t,e);if(F&&await askReact(F,'INTERCEPT?',`{r:${e.name} is about to attack ${t.name}.} ${F.name} can step in and take the blow instead.\n\n{m:Costs 1 of ${F.name}'s ${F.acts} ready ${F.acts>1?'actions':'action'}.}`,'INTERCEPT')){spendReact(F,'intercept');H.pop(F,'Intercept!','call');log(`${F.name} steps in to take the blow meant for ${t.name}!`,sideCol(F));t=F;if(hasP(F,'bodyguard'))e._bg=F.id;}}
  const counters=[];
  await H.strike(e,t,{proj:A.range>1&&man(e,t)>1?(A.area?'#ff7a2a':'#ff9a7a'):null,monster:true,act:A});
  const victims=A.area?foesOf(e).filter(o=>cheb(o,t)<=A.area):[t];
  if(A.area)await H.area(t,A.area,/Chill/.test(A.name)?'ice':'fire');
  for(const v of victims){
    if(!live(v))continue;
    const r=A.flat!=null?null:rollDice(atkDice(e,A),0,false,false,e.side);
    const res=r?r.res:2;
    NOTE=[];
    const X=monDmgX(e,A,v,res,r?r.total:null,r?r.crits:0);
    if(v.side==='hero'&&hasR('ward')){v.warded=v.warded||{};v.warded[e.id]=1;}
    if(r){showRoll({side:e.side,title:`${e.name.toUpperCase()}: ${A.name.toUpperCase()}`,sub:multCap(X),dice:dieList(r),verdict:atkVerdict(r,X),res:r.res});await H.rolls();}
    if(r)H.result(v,r);
    if(v.st.mult){delete v.st.mult;v.multBy=null;}
    if(X.d>0)await damage(e,v,await guardHit(e,v,X.d,res===3),{crit:res===3,area:!!A.area});
    // Counterattack: a hero hit in melee may strike back
    if(live(v)&&!A.area&&man(e,v)===1&&hasP(v,'counter')&&reactReady(v,'counter'))counters.push(v);
    if(live(v)){
      applyEff(e,v,A.eff,res);
      const push=tv(A.eff&&A.eff.push,res),pull=tv(A.eff&&A.eff.pull,res);
      if(push)await forceMove(v,e,push,false,e,null);
      if(pull&&live(v))await forceMove(v,e,pull,true,e,null);
    }
    const ex=NOTE||[];NOTE=null;
    log(`${e.name}: ${A.name} → ${v.name}. ${r?dmgLog(r,X):'Swarm hit: '+X.d+' damage'}. ${ex.join(' ')}`,'e');
  }
  e._bg=null;
  if(e.hidden){e.hidden=false;H.upd(e);}
  for(const v of counters){if(!live(v)||!live(e)||G.over)break;if(!await askReact(v,'COUNTERATTACK?',`{g:${e.name} hit ${v.name} in melee.} Strike back with a basic attack?\n\n{m:Costs 1 of ${v.name}'s ${v.acts} ready ${v.acts>1?'actions':'action'}.}`,'STRIKE'))continue;spendReact(v,'counter');await heroStrike(v,e,'Counter!');}
  if(A.hazard){
    if(A.area){for(let y=t.y-A.area;y<=t.y+A.area;y++)for(let x=t.x-A.area;x<=t.x+A.area;x++)if(inB(x,y))setHaz(x,y,A.hazard,3,e.side);}
    else setHaz(t.x,t.y,A.hazard,3,e.side);
  }
}
async function monTurn(e){
  const m=mon(e);
  if(e.object||!live(e))return;
  if(m.summon&&(G.round%2===0||(m.p2&&m.p2.summonEvery&&bloodied(e)))){const cap=m.summonCap||2,n=Math.min(m.summonN||1,cap-allies(e).filter(f=>f.type===m.summon).length,12-G.units.filter(u=>live(u)&&u.side===e.side).length);
    const spots=freeAdj(e,null).filter(t=>!Tt(t.x,t.y).haz);let made=0;
    for(let i=0;i<n&&spots.length;i++){const s=spots.shift();spawnMon(m.summon,s,{side:e.side});made++;}
    if(made){H.pop(e,m.summonCall||'Rise!','call');log(`${e.name} ${m.summonVerb||'raises'} ${made>1?made+' '+MON[m.summon].plural:'a '+MON[m.summon].name.toLowerCase()}.`,'e');await H.pause(250);}}
  const plan=planMon(e);
  if(!plan.node)return;
  const moved=plan.node.x!==e.x||plan.node.y!==e.y;
  if(moved){await walk(e,pathOf(plan.node),true);if(!live(e))return;afterUnit(e);if(await checkEnd())return;await repelWard(e);if(!live(e)||G.over)return;}
  let A=plan.act,t=plan.target;
  if(A&&!(e.st.daze&&moved)){
    if(plan.tile){if(man(e,t)<=A.range)await monAttack(e,A,t,true);}
    else{
      if(!A.tgt&&(!live(t)||man(e,t)>effRange(A.range,e)||man(e,t)<1)){
        const c=foesOf(e).filter(x=>canHitFrom(A,x,e)).sort((a,b)=>a.hp-b.hp);const tt=tauntOf(e);
        t=tt&&c.includes(tt)?tt:c[0];
      }
      if(t||A.tgt)await monAttack(e,A,t||e);
    }
  }
  e.brutal=false;
  if(G.over||!live(e))return;
  const extra=(m.attacks||1)-1;
  for(let i=0;i<extra&&live(e)&&!G.over&&!e.st.daze;i++){
    const opts=m.acts.filter(a=>!a.tgt&&!a.trap&&monCanAct(a,e));
    let bb=null;
    const tt=tauntOf(e),mustT=!!tt&&opts.some(a=>canHitFrom(a,tt,e));
    for(const a of opts)for(const x of foesOf(e)){if(mustT&&x!==tt)continue;if(!canHitFrom(a,x,e))continue;const r=evMon(e,a,x,e);const s=r.ev+r.kill*20-(a.cost||0)*1.3;if(!bb||s>bb.s)bb={s,a,x};}
    if(bb){await H.pause(160);await monAttack(e,bb.a,bb.x);}
  }
  if(m.skulk&&live(e)&&!e.pinned){const s=freeAdj(e,e).filter(t=>!Tt(t.x,t.y).haz).sort((a,b)=>minDist(b,e)-minDist(a,e))[0];if(s&&minDist(s,e)>minDist(e,e)){e.x=s.x;e.y=s.y;await H.step(e);}}
  afterUnit(e);
}
function minDist(p,u){let m=99;for(const h of fighters(u))m=Math.min(m,man(h,p));return m;}

/* ---------------- HERO-KIT AI (rival parties, autoplay) ---------------- */
function threatened(t){return foesOf(t).some(f=>!f.object&&man(f,t)<=5);}
/* ---- set-ups, as the hero AI sees them: a set-up is worth the extra damage the best hero still to act this round
   would get by cashing it in, plus the momentum the combo pays. Cached for the length of one planPc call. ---- */
let SETUP_C=null;
function payers(u,t){
  if(u.side!=='hero')return [];
  const oi=id=>G.order.indexOf(id);const ti=t?oi(t.id):-1;
  const later=G.order.slice(G.ti+1).concat(G.extra).map(U).filter(h=>h&&h!==u&&live(h)&&h.side==='hero'&&h.kind==='pc'&&!h.caged);
  // a foe that acts before the ally shakes the set-up off first
  return t?later.filter(h=>G.extra.includes(h.id)||ti<=G.ti||oi(h.id)<ti):later;
}
/* What a set-up on t is worth to ally h: a Stun is worth tripling an Assassinate. */
function payoffGain(h,t,kind){
  let best=0;
  for(const id of h.powers){
    const q=POWERS[id];if(!q.dmg||q.noDmg||q.tgt!=='enemy'||!usable(h,q))continue;
    const rng=q.range+(q.range===1?wBonus(h,q,'reach'):wBonus(h,q,'range'));
    if(man(h,t)>h.mp+rng)continue;
    if(kind==='stag'&&q.xIfStun&&!t.boss)best=Math.max(best,2*pcDmg(h,q,t,2));
  }
  return best;
}
function setupWorth(u,t,kind){
  const key=u.id+t.id+kind;if(SETUP_C&&key in SETUP_C)return SETUP_C[key];
  const P=payers(u,t);let v=0;
  if(P.length&&live(t)&&!t.object){
    const g=P.map(h=>payoffGain(h,t,kind));
    v=kind==='expose'?g.reduce((a,b)=>a+b,0):Math.max(0,...g);
    if(v>0)v=v*.85+2;
  }
  if(SETUP_C)SETUP_C[key]=v;
  return v;
}
/* What making t lose its turn is worth: roughly the damage it would have dealt. */
function skipWorth(t){
  if(!t||t.side!=='enemy'||t.boss||t.st.steady||t.object||t.kind!=='mon')return 0;
  const A=mon(t).acts.find(a=>!a.tgt&&!a.trap);if(!A)return 0;
  return .8*(A.flat!=null?A.flat:tierDice(atkDice(t,A),2)+G.dmgAdd)*(mon(t).attacks||1);
}
/* How much the fighter gains by taunting t: it would otherwise go after one of her softer friends. */
function tauntWorth(u,t){
  if(u.kind!=='pc'||u.cls!=='fighter'||(t.st.mark&&t.marker===u.id)||t.object)return 0;
  const rng=t.kind==='mon'?Math.max(1,...mon(t).acts.filter(a=>!a.tgt&&!a.trap).map(a=>a.range)):2;
  return allies(u).some(h=>h!==u&&!h.object&&man(h,t)<=effSpeed(t)+rng)?2:.5;
}
function valuePower(u,p,T,O){
  const rows=forecast(u,p,T,O);let v=0,hits=0;
  const P=payers(u).length>0;
  const sv=x=>{v+=x*(TUNE.aiCombo||0);};
  // Mult on a foe is worth roughly a share of the next ally hit on it; Stun is worth the foe's skipped turn
  const multWorth=n=>n*(TUNE.aiMult!=null?TUNE.aiMult:2.5)*(P?1:.5);
  for(const r of rows){
    if(r.ctrl&&r.t.side!==u.side&&!r.t.object){
      hits++;const e=p.eff||{};
      if(r.mult)v+=multWorth(r.mult+(hasP(u,'amplify')?1:0));
      if(tv(e.stag,2)&&!r.t.st.stag&&!r.t.st.steady)v+=r.t.boss?multWorth(2):skipWorth(r.t);
      if(e.push||e.pull)v+=forcedValue(u,r.t,p.tgt==='enemy'?O:(p.tgt==='self'?O:T),tv(e.push||e.pull,2)+pushExtra(u,p),!!e.pull);
      if(p.mark)v+=.5+tauntWorth(u,r.t);
      continue;
    }
    if(r.dmg){
      if(r.t.side===u.side)continue;hits++;
      v+=evRow(r)+killP(r)*(r.t.boss?10:r.t.kind==='npc'?25:18)+(r.t.pillar?5:0)+(r.t.leader&&G.enc.type==='assassinate'?evRow(r)*.8+killP(r)*30:0)+(r.t.pillar?evRow(r)*.5:0);
      if(p.eff)v+=Object.keys(p.eff).filter(k=>k!=='push'&&k!=='pull').length*1.2;
      if(p.crit){const c=p.crit;v+=r.probs[2]*((c.stun?skipWorth(r.t):0)+(c.give?multWorth(c.give):0)+(c.bless?c.bless*1.5:0)+(c.act?4:0)+(c.burn||0)+(c.root?1:0));}
      if(p.mark)v+=.5+tauntWorth(u,r.t)*(1-killP(r));
      if(p.eff&&(p.eff.push||p.eff.pull))v+=forcedValue(u,r.t,p.tgt==='enemy'?O:(p.tgt==='self'?O:T),tv(p.eff.push||p.eff.pull,2)+pushExtra(u,p),!!p.eff.pull);
      if(P){
        const alive=1-killP(r),e=p.eff||{};
        const fm=(tv(e.push,2)||tv(e.pull,2))?(tv(e.push,2)||tv(e.pull,2))+pushExtra(u,p)-(r.t.steady||0):0;
        if(fm>0||tv(e.stag,2)){sv(alive*setupWorth(u,r.t,'stag')*(rows.length>1?.6:1));v+=alive*skipWorth(r.t);}
        if(tv(e.expose,2))sv(alive*setupWorth(u,r.t,'expose'));
      }
      if(r.mult)v+=multWorth(r.mult)*(1-killP(r));
    }else{
      const t=r.t,miss=t.maxHp-t.hp;
      if(r.heal)v+=miss>=4?Math.min(miss,r.heal)*1.1:0;
      if(r.shield)v+=r.shield*(threatened(t)?.5:.05);
      if(r.bless){if(t!==u&&fighters(t).some(f=>man(f,t)<=(t.speed||3)+1))v+=r.bless*.9;else v+=.5;}
      if(r.refresh&&t.id!==u.id)v+=8;
      if(p.swap&&t.id!==u.id){const ta=threatened(t),tu=threatened(u);v+=(ta&&t.hp<t.maxHp*.5?5:0)+(u.cls==='cleric'&&!tu&&ta?1:0)-(t.kind==='pc'&&t.cls==='wizard'&&!ta?2:0);}
    }
  }
  // Come and Get It and Gravity Well drag foes in, leaving them staggered for the heroes still to act
  if(p.pullFirst||p.pullCenter){const C=p.tgt==='self'?O:T;for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object&&man(e,C)>0&&(e.steady||0)<(p.pullFirst||p.pullCenter))){hits++;if(P)sv(setupWorth(u,f,'stag')*.7);v+=skipWorth(f);if(p.pullFirst)v+=tauntWorth(u,f);}}
  if(p.blessNear&&hits){const c=allies(u).filter(a=>a!==u&&!a.object&&!a.caged&&a.kind!=='npc'&&man(a,O)<=p.blessNear);if(c.length){const fo=fighters(u);const sc=a=>Math.min(9,...fo.map(f=>man(f,a)));c.sort((a,b)=>sc(a)-sc(b));if(P&&payers(u).includes(c[0])&&sc(c[0])<=c[0].mp+2)sv(4);else v+=1;}}
  if(p.helpUp)return 22-p.cost*TUNE.momVal;
  if(p.selfWind){const miss=u.maxHp-u.hp;return miss>=u.maxHp*.45?Math.min(miss,exAvg(HD[u.cls]||8)+3)*.9:-99;}
  if(p.tgt!=='ally'&&p.aff!=='ally'&&!hits&&!p.revive&&!p.selfHeal)return -99;
  if(p.zone)v+=3*hits;
  if(p.igniteCenter)v+=1;
  if(p.revive)v+=25;
  if(p.selfHeal)v+=Math.min(u.maxHp-u.hp,p.selfHeal)*.8;
  // momentum spent is worth something, and a basic attack earns 1
  return v-(p.cost-(p.basic?1:0))*TUNE.momVal;
}
/* Unused actions are lost at the end of a turn (reactions come out of the next turn), so the AI never holds actions back.
   (Under the older rules, holdValue scored saving an action for a reaction.) */
function holdValue(u,k){return 0;}
function planPc(u){
  const here={x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null};
  const R=canMoveNow(u)&&moveBudget(u,1)>0?[...reach(u,moveBudget(u,1)).values()]:[here];
  let best={s:-99,O:null,pi:-1,T:null};
  const foes=fighters(u);
  const taunt=u.side==='enemy'?tauntOf(u):null;
  SETUP_C={};
  try{
    for(let pi=0;pi<u.powers.length;pi++){
      const p=powerOf(u,pi);if(!canAct(u,p)||p.teleport||p.wall||p.hide||p.free)continue;
      const org=(p.tgt==='enemy'||p.tgt==='ally'||p.tgt==='self')?R:[here];
      // a rival the fighter has taunted must attack her with any power that can reach her
      const mustT=taunt&&p.tgt==='enemy'&&org.some(O=>targetsFrom(u,p,O).some(q=>covers(taunt,q.x,q.y)));
      for(const O of org){
        let pen=O.prov*8+O.haz*1.5+hazCost(u,O.x,O.y)*1.2-objBonus(u,O)+(O.s>(u.mp||0)?TUNE.aiMoveCost:0);
        const ranged=p.tgt==='enemy'&&p.range>1||p.tgt==='tile'||p.tgt==='ally';
        if(ranged&&foes.some(f=>man(f,O)===1))pen+=2.5;
        let T=targetsFrom(u,p,O);
        if(p.tgt==='tile'&&!p.helpUp)T=T.filter(t=>foes.some(f=>cheb(f,t)<=(p.area||0)));
        if(mustT)T=T.filter(q=>covers(taunt,q.x,q.y));
        // the AI may move first and then use a power on itself
        if(p.tgt==='ally'&&!p.noSelf&&(O.x!==u.x||O.y!==u.y))T=T.concat([{x:O.x,y:O.y}]);
        for(const t of T){const s=valuePower(u,p,t,O)-pen;if(s>best.s)best={s,O,pi,T:t};}
      }
    }
  }finally{SETUP_C=null;}
  return best;
}
/* Autoplay heroes (and rival heroes): spend actions while they are worth more than saving them for reactions. */
async function pcTurn(u){
  if(u.kind==='npc'){
    if(u.npc==='villager'&&!u.caged&&canMoveNow(u)){const R=reach(u,u.mp);let b=null;for(const n of R.values()){const s=n.y*3-n.prov*5-n.haz;if(!b||s>b.s)b={s,n};}if(b&&(b.n.x!==u.x||b.n.y!==u.y)){await walk(u,pathOf(b.n),true);afterUnit(u);}}
    return;
  }
  for(let g=0;g<8&&live(u)&&!G.over&&!u.gone&&(u.acts||0)>0;g++){
    const best=planPc(u);
    if(best.O&&best.s>holdValue(u,u.acts)){
      const p=powerOf(u,best.pi);
      if(best.O.x!==u.x||best.O.y!==u.y){
        if(best.O.s>(u.mp||0))spendMove(u);
        await walk(u,pathOf(best.O),true);u.moved=true;if(!live(u)||G.over)return;afterUnit(u);if(await checkEnd())return;
        if(u.x!==best.O.x||u.y!==best.O.y)continue;
      }
      if(!canAct(u,p)||!targetsFrom(u,p,u).some(t=>t.x===best.T.x&&t.y===best.T.y))continue;
      await doPower(u,p,best.T);afterUnit(u);if(await checkEnd())return;
      if(p.canto&&live(u)&&u.mp>0){const R=reach(u,u.mp);let b=null;for(const n of R.values()){const s=-n.prov*8-n.haz*2+Math.min(3,minDist(n,u))*1.5;if(!b||s>b.s)b={s,n};}if(b&&(b.n.x!==u.x||b.n.y!==u.y))await walk(u,pathOf(b.n),true);u.mp=0;}
      continue;
    }
    // nothing within reach is worth an action: close in (or work the mission) while no foe can be hit from here
    if(best.O||!canMoveNow(u))break;
    const foes=fighters(u);if(!foes.length)break;
    const ranged=u.cls==='wizard'||u.cls==='cleric';
    const field=distField(foes);let b=null;
    for(const n of reach(u,moveBudget(u,0)).values()){const fd=field.has(K(n.x,n.y))?field.get(K(n.x,n.y)):40;const want=ranged?3:1;const s=-Math.abs(fd-want)*2-n.prov*8-n.haz*2-hazCost(u,n.x,n.y)-(ranged&&fd===1?3:0)+objBonus(u,n)*1.5;if(!b||s>b.s)b={s,n};}
    if(!b||(b.n.x===u.x&&b.n.y===u.y))break;
    if(b.n.s>(u.mp||0))spendMove(u);
    await walk(u,pathOf(b.n),true);u.moved=true;if(!live(u))return;afterUnit(u);if(await checkEnd())return;
  }
}

/* ---------------- BOSS SURGES ---------------- */
async function villain(b){
  if(![1,3,5].includes(G.round)||b.surged===G.round)return;
  b.surged=G.round;
  const idx=[1,3,5].indexOf(G.round);const va=mon(b).va&&mon(b).va[idx];if(!va)return;
  log(`${b.name}: ${VA[va].name}!`,'e');H.sfx('villain');
  await H.banner('villain',b,VA[va]);
  const hs=fighters(b);
  NOTE=[];
  switch(va){
    case 'horde':{for(let i=0;i<4;i++){const s=edgeSpot('top',b.side);if(s)spawnMon('runner',s,{side:b.side});}G.hordeBoon=true;break;}
    case 'warcry':for(const h of hs.filter(h=>man(h,b)<=3)){addSt(h,'weak',1);applyMark(h,b);}break;
    case 'laststand':heal(b,15);G.foeMom+=5;break;
    case 'raise':{for(let i=0;i<4;i++){const s=edgeSpot('any',b.side);if(s)spawnMon('bones',s,{side:b.side});}break;}
    case 'siphon':{let tot=0;for(const h of hs.filter(h=>man(h,b)<=4))tot+=await damage(b,h,4,{});heal(b,tot);break;}
    case 'nova':for(const h of hs)await damage(b,h,4,{});break;
    case 'presence':for(const h of hs)addSt(h,'weak',1);G.foeMom+=3;break;
    case 'buffet':for(const h of hs.filter(h=>cheb(h,b)<=2)){await forceMove(h,b,2,false,b,null);if(live(h))addSt(h,'root',1);}break;
    case 'inferno':{
      const rows={};for(const h of hs)rows[h.y]=(rows[h.y]||0)+1;
      const y=+Object.keys(rows).sort((a,c)=>rows[c]-rows[a])[0];
      await H.area({x:(COLS-1)/2,y},0,'row');
      for(const h of hs.filter(h=>h.y===y))await damage(b,h,6,{});
      for(let x=0;x<COLS;x++)setHaz(x,y,'fire',2,b.side);
      break;}
  }
  const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),'e');
}

/* ---------------- SPAWNING ---------------- */
/* ---------------- REGIONAL TWISTS ---------------- */
function lavaRow(y){for(let x=0;x<COLS;x++)if(!blocked(x,y)){G.tiles[K(x,y)].haz={t:'lava',dur:-1,side:'enemy'};}H.sfx('fire');}
async function roundTwist(E){
  const tw=E.twist,r=G.round;if(!tw)return;
  if(tw==='restless'){const z=E.zone.map(([x,y])=>({x,y}));const c=[];for(const q of z)for(const f of freeAdj(q,null))if(!z.some(w=>w.x===f.x&&w.y===f.y)&&!c.some(w=>w.x===f.x&&w.y===f.y))c.push(f);
    for(const s2 of shuffle(c).slice(0,2))spawnMon('bones',s2);if(c.length)log('The dead claw up beside the shrine.','e');}
  if(tw==='flee'&&r>6){const L=G.units.find(u=>u.leader&&live(u));if(L){L.gone=true;G.escaped=true;H.pop(L,'Escaped!','bad');H.death(L);log(`${L.name} escapes!`,'e');}}
  if(tw==='melt'&&r>4&&G.chests.length){G.chests=[];G.melted=true;log('The remaining chests melt into the lava.','e');H.sfx('fire');}
  if(tw==='lava'&&r>=3){const y=r-3;if(y<=2){lavaRow(y);log('Lava floods the field!','e');}}
  if(tw==='collapse'&&r>=2){const y=ROWS-r+1;if(y>=4){lavaRow(y);log('The cavern collapses: lava rises!','e');}}
  if(tw==='ring'&&r===3)ringFire(4);
  if(tw==='blood')for(const p of G.units.filter(u=>u.pillar&&live(u)))if(allies(p).some(o=>o!==p&&!o.object&&man(o,p)===1)){heal(p,6);}
}
function ringFire(n){const c=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if((x===0||x===COLS-1||y===0||y===ROWS-1)&&!unitAt(x,y)&&!blocked(x,y))c.push({x,y});for(const t of shuffle(c).slice(0,n||5))setHaz(t.x,t.y,'fire',3,'enemy');}
/* ---------------- FOE THREATS ---------------- */
/* Malice (Bestiary): the foes gain the round number each round, plus 1 for each hero who is Down. */
function downHeroes(){return G.units.filter(u=>u.side==='hero'&&u.kind==='pc'&&u.dead&&!u.gone).length;}
function maliceGain(){return Math.round((G.round+downHeroes())*(TUNE.maliceMul!=null?TUNE.maliceMul:1))+(hasR('crown')?2:0)+(G.round%2===1&&dreadOn(4)?1:0);}
function maliceNext(){return Math.round((G.round+1+downHeroes())*(TUNE.maliceMul!=null?TUNE.maliceMul:1));}
/* Threats unlock by battle type and region (Bestiary). */
function threatList(E){
  // the first land's ordinary battles have no threats at all; elites and bosses bring Bloodlust and Eruption
  if(E.act<1&&!E.elite&&E.type!=='boss')return [];
  const L=['bloodlust'];
  if(E.elite||E.type==='boss'||E.act>=1)L.push('hazard');if(E.act>=1)L.push('reinforce');if(E.act>=2)L.push('rite');return L;
}
function threatName(id){const T=THREATS[id];return T.names?T.names[G.act]:T.name;}
function nextThreat(){const L=threatList(G.enc);return L[(G.threatN||0)%L.length];}
async function fireThreat(id){
  const T=THREATS[id];log(`The foes spend ◆${T.cost}: ${threatName(id)}! ${T.desc}`,'e');H.sfx('villain');
  await H.banner('threat',null,{name:threatName(id),desc:T.desc});
  const hs=fighters({side:'enemy'});
  if(id==='bloodlust')G.hordeBoon=true;
  else if(id==='hazard'){const t=['fire','acid','fire'][G.act];const n=Math.min(hs.length,1+G.act);for(const h of shuffle(hs.slice()).slice(0,n)){for(const f of foot(h,h.x,h.y))setHaz(f.x,f.y,t,3,'enemy');H.pop(h,threatName(id)+'!','bad');}}
  else if(id==='reinforce'){for(let i=0;i<3+G.act;i++){if(G.units.filter(u=>live(u)&&u.side==='enemy').length>=(G.enc.type==='boss'?TUNE.bossCap:12))break;const s=edgeSpot('any','enemy');if(s)spawnMon(SWARM[G.act],s);}}
  else if(id==='rite'){const n=4+2*G.act;for(const f of G.units.filter(u=>live(u)&&u.side==='enemy'&&!u.object)){f.shield+=n;H.pop(f,'⛨ '+n,'shield');H.upd(f);}}
}
function edgeSpot(where,side){
  const c=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(!freeTile(x,y,null)||Tt(x,y).haz)continue;
    const ok=where==='top'?y<=1:where==='bottom'?y===ROWS-1:(y<=1||((x===0||x===COLS-1)&&y<=5));
    if(ok&&G.units.filter(u=>live(u)&&u.side!==side).every(h=>man(h,{x,y})>=2))c.push({x,y});
  }
  return c.length?pick(c):null;
}
function initRoll(u){const d=attrDie(Math.max(1,u.attrs.F||0));const k=u.side==='hero'&&hasR('hourglass')?1:0;const r=[];for(let i=0;i<=k;i++)r.push(rollEx(d.s));return Math.max(...r);}
function ordCmp(a,b){return b.init-a.init||((b.attrs.F||0)-(a.attrs.F||0))||((a.side==='hero'?0:1)-(b.side==='hero'?0:1));}
function insertOrder(u){
  u.init=initRoll(u);
  let i=G.order.findIndex(id=>{const o=U(id);return o&&ordCmp(u,o)<0;});if(i<0)i=G.order.length;
  G.order.splice(i,0,u.id);if(i<=G.ti)G.ti++;
}
function makeMon(type,x,y,extra){
  extra=extra||{};const m=MON[type];const f=G.enc.f;
  const mult=(m.boss?TUNE.bossHp*((TUNE.bossAct||[])[G.act]||1)*(dreadOn(7)?1.2:1)*(1+(TUNE.bossSlope!=null?TUNE.bossSlope:.03)*f):(m.object?1+.08*f:1+TUNE.hpSlope*f))*(m.object?1:G.foeHp||1)*(m.object||m.minion?1:TUNE.foeHpMul);
  const hp=m.minion?1:Math.round(m.hp*(m.tiny||1)*mult*(extra.leader?1.3:1)*(extra.elite?1+.3*((TUNE.eliteMul||[])[G.act]||1):1));
  return {id:'e'+(G.uid++),side:extra.side||'enemy',kind:'mon',type,name:(extra.leader?'Chief ':'')+m.name,x,y,hp,maxHp:hp,speed:m.speed,
    attrs:Object.assign({},m.attrs),steady:m.steady||0,armor:m.armor||0,st:{},shield:0,react:true,mp:0,
    undead:!!m.undead,boss:!!m.boss,swarm:!!m.swarm,minion:!!m.minion,tiny:m.tiny||0,sz:m.sz||1,nimble:!!m.nimble,object:!!m.object,leader:!!extra.leader,pillar:type==='pillar',cd:{},hidden:!!m.startHidden&&!extra.side};
}
function spawnMon(type,spot,extra){const e=makeMon(type,spot.x,spot.y,extra);G.units.push(e);if(!e.object)insertOrder(e);H.spawn(e);return e;}
/* Weapons power up basic powers: the at-wills that cost no momentum. */
const basicP=p=>!!p&&!!p.basic;
const BASIC={fighter:'sword',rogue:'blades',wizard:'missile',cleric:'mace'};
const SETUP={fighter:'shove',wizard:'force',cleric:'guidance'};
/* Every hero carries their basic weapon attack first, then the powers they have learned. */
const EXTRA={};
function withBasic(cls,powers){const b=[BASIC[cls],SETUP[cls]].filter(Boolean),u=(EXTRA[cls]||[]).concat(['secondwind','helpup']);return b.concat((powers||[]).filter(id=>!b.includes(id)&&!u.includes(id)&&POWERS[id]),u.filter(id=>POWERS[id]));}
function wpnOf(u){return u&&u.kind==='pc'&&u.wpn?(u.wpd||WEAPONS[u.wpn]):null;}
function wBonus(u,p,k){const w=wpnOf(u);return w&&basicP(p)?(w[k]||0):0;}
function rivalWeapon(cls,lvl){const t=Math.min(4,1+Math.floor((lvl+1)/3));const L=Object.values(WEAPONS).filter(w=>w.cls===cls&&w.tier<=t).sort((a,b)=>b.tier-a.tier);return (L[0]||WEAPONS[START_WEAPON[cls]]).id;}
function makePc(h,x,y,side){
  const C=CLASSES[h.cls];const rival=side==='enemy';
  const all=withBasic(h.cls,h.powers),pas={};for(const id of all)if(POWERS[id].passive)pas[id]=1;
  const mhp=h.maxHp+(!rival&&hasR('heart')?8:0)+(pas.hardy?6:0);
  const vic=!rival&&typeof CTX!=='undefined'&&CTX&&CTX.vic!=null?Math.min(3,CTX.vic):TUNE.momStart;
  const mom=Math.min(5,vic+(pas.eager?1:0)+(!rival&&pas.afterglow?(h.glow||0):0)+(!rival&&G&&G.resN&&resLv('Surge',{side})>=1?1:0))+(!rival&&hasR('hymn')?2:0)+(!rival&&hasR('crown')?3:0);
  return {id:(rival?'r_':'h_')+h.cls,side,kind:'pc',cls:h.cls,name:rival?C.rival:C.name,x,y,hp:Math.min(h.hp,mhp),maxHp:mhp,speed:C.speed+(pas.quick?1:0),dmgPlus:rival?0:(h.dmgPlus||0),lvl:h.lvl,
    wpn:h.weapon||(rival?rivalWeapon(h.cls,h.lvl):START_WEAPON[h.cls]),attrs:attrsFor(h.cls,h.lvl,rival?null:h.up),steady:C.steady||0,nimble:!!C.nimble&&((h.lvl||1)>=2||!rival),hdMax:!rival&&typeof hdMax==='function'&&typeof RUN!=='undefined'&&RUN&&CTX&&(CTX.mode==='run'||CTX.mode==='sim')?hdMax(h):undefined,mom,acts:1,powers:all.filter(id=>!POWERS[id].passive),pas,wounds:rival?0:(h.wounds||0),hd:rival||h.hd==null?null:h.hd,wpd:rival?null:weaponData(h.weapon||START_WEAPON[h.cls]),grow:Object.assign({},h.grow||{}),st:{},shield:0,react:true,mp:0,rival};
}

/* ---------------- ENCOUNTERS ----------------
   Budgets are built the way the tabletop games build fights, then tuned with tools/sim.js:
   - Party strength (Draw Steel): each hero is worth 4 + 2 x level, at the level a party is expected to have reached at
     this depth of the journey (three levels a region), so fighting more battles still pays off.
   - Difficulty and XP (PF2e's encounter builder, at three quarters of its numbers): an encounter has an XP budget for
     four heroes: Easy 30, Medium 60, Hard 90, Extreme 120. A foe as strong as one hero at the party's level is worth
     30 XP, so a Medium fight is two of them, or more weaker foes. Each hero more or fewer than four adds or takes away
     a quarter of the budget, as PF2e's character adjustment does. Most battles are Medium (the first is Easy, and
     some are), elites Hard, bosses Extreme; winning gives the encounter's XP. Missions with waves of reinforcements,
     or other ways to win, spend a smaller share of the budget on foes at the start.
   - Foe values (D&D 4e, Draw Steel): each foe costs what it is worth (4 minions = 1 standard foe). An elite costs a
     third more, and a solo boss takes most of an extreme budget, leaving the rest for its escort.
   - Nimble's rule of thumb: 1 to 4 foes a hero, not counting minions. */
const DIFF={easy:{xp:30,name:'Easy'},medium:{xp:60,name:'Medium'},hard:{xp:90,name:'Hard'},extreme:{xp:120,name:'Extreme'}};
function encDiff(type,elite,diff){return type==='boss'?'extreme':diff||(elite?'hard':'medium');}
const MISSION_SHARE={rout:1,ambush:1.1,loot:.9,breakout:.85,rescue:.8,assassinate:.8,ritual:.75,hold:.7,defend:.65,survive:.6};
function expLevel(f){return 1+.75*f;}
function partyStrength(f){return 4*(TUNE.es0+TUNE.esLvl*expLevel(f));}
/* A foe's cost converts to XP against the party's strength: a Medium (60 XP) budget buys partyStrength x esUnit of foes. */
function encBudget(f,type,act,elite,diff,n){
  const d=encDiff(type,elite,diff);
  return partyStrength(f)*TUNE.esUnit*DIFF[d].xp/60*((n||4)/4)*((TUNE.actMul||[1,1,1])[act]||1)*(type==='boss'?1:MISSION_SHARE[type]||1)*(elite?((TUNE.eliteBudget||[])[act]||1)*(dreadOn(3)?1.25:1):1);
}
const THEMES=[
  {obs:['rock','tree','tree'],cov:['crate','lowwall'],haz:['fire'],hazN:[0,2],water:true},
  {obs:['deadtree','column','rock'],cov:['tomb','sarc','tomb'],haz:['acid'],hazN:[1,3],water:true},
  {obs:['spire','rock','spire'],cov:['lowwall','crate'],haz:['lava','lava','fire'],hazN:[2,4],water:false},
];
function connectedTiles(tiles,from){
  const seen=new Set([K(from.x,from.y)]);const q=[from];let total=0;for(const t of tiles)if(!t.ob)total++;
  while(q.length){const n=q.shift();for(const[dx,dy]of DIRS){const x=n.x+dx,y=n.y+dy,k=K(x,y);if(!inB(x,y)||tiles[k].ob||seen.has(k))continue;seen.add(k);q.push({x,y});}}
  return seen.size===total;
}
function genTerrain(act,reserved,hazOn,type){
  const th=THEMES[act];
  for(let tries=0;tries<60;tries++){
    const tiles=Array.from({length:COLS*ROWS},()=>({ob:null,ter:null,haz:null,v:rnd(4)}));
    const free=k=>!reserved.has(k)&&!tiles[k].ob&&!tiles[k].haz&&!tiles[k].ter;
    const spot=(y0,y1)=>{for(let g=0;g<40;g++){const x=rnd(COLS),y=y0+rnd(y1-y0+1),k=K(x,y);if(free(k))return k;}return -1;};
    const nOb=2+rnd(2),nCov=1+rnd(3);
    for(let i=0;i<nOb;i++){const k=spot(1,5);if(k>=0)tiles[k].ob=pick(th.obs);}
    for(let i=0;i<nCov;i++){const k=spot(1,5);if(k>=0)tiles[k].ob=pick(th.cov);}
    const cluster=(ter,n,y0,y1)=>{let k=spot(y0,y1);if(k<0)return;for(let i=0;i<n&&k>=0;i++){tiles[k].ter=ter;const opts=DIRS.map(([dx,dy])=>({x:KX(k)+dx,y:KY(k)+dy})).filter(t=>inB(t.x,t.y)&&free(K(t.x,t.y)));if(!opts.length)break;const t=pick(opts);k=K(t.x,t.y);}};
    for(let i=0;i<1+rnd(2);i++)cluster('high',2+rnd(2),2,5);
    for(let i=0;i<1+rnd(2);i++)cluster(th.water&&rnd(2)?'water':'rough',2+rnd(3),1,6);
    if(hazOn){const n=th.hazN[0]+rnd(th.hazN[1]-th.hazN[0]+1);for(let i=0;i<n;i++){const h=pick(th.haz);if(h==='lava'){let k=spot(2,5);for(let j=0;j<1+rnd(2)&&k>=0;j++){tiles[k].haz={t:'lava',dur:-1};const o=DIRS.map(([dx,dy])=>({x:KX(k)+dx,y:KY(k)+dy})).filter(t=>inB(t.x,t.y)&&free(K(t.x,t.y)));const q=o.length?pick(o):null;k=q?K(q.x,q.y):-1;}}else{const k=spot(1,6);if(k>=0)tiles[k].haz={t:h,dur:-1};}}}
    const start=[...reserved].map(k=>({x:KX(k),y:KY(k)})).find(p=>p.y>=5)||{x:2,y:7};
    if(connectedTiles(tiles,start))return tiles;
  }
  return Array.from({length:COLS*ROWS},()=>({ob:null,ter:null,haz:null,v:0}));
}
const HERO_POS={
  normal:{fighter:[2,6],rogue:[3,6],cleric:[2,7],wizard:[3,7]},
  center:{fighter:[2,3],rogue:[3,3],cleric:[2,4],wizard:[3,4]},
  wagon:{fighter:[2,5],rogue:[3,6],cleric:[1,6],wizard:[2,7]},
};
function genEncounter(f,type,opt){
  opt=opt||{};
  const act=opt.act!=null?opt.act:Math.min(2,Math.floor(f/4));
  const M=MISSIONS[type];
  const tw=TWISTS[type+':'+act];
  const diff=encDiff(type,opt.elite,opt.diff);
  const enc={type,f,act,enemies:[],npcs:[],zone:[],chests:[],elite:!!opt.elite,twist:tw?tw.id:null,diff,xp:DIFF[diff].xp,
    title:type==='boss'?MON[BOSSES[act]].name:opt.title||pick(M.titles),
    heroPos:type==='ambush'?'center':type==='defend'?'wagon':'normal'};
  const reserved=new Set();
  const hp=HERO_POS[enc.heroPos];for(const c in hp)reserved.add(K(...hp[c]));
  if(type==='hold')enc.zone=[[2,3],[3,3],[2,4],[3,4]];
  if(type==='rescue'){const x=1+rnd(4);enc.npcs.push({kind:'villager',x,y:enc.twist==='carry'?3:1,carry:enc.twist==='carry'});}
  if(type==='defend')enc.npcs.push({kind:'wagon',x:2,y:6});
  if(type==='ritual')enc.enemies.push({type:'pillar',x:1,y:1},{type:'pillar',x:4,y:1});
  enc.zone.forEach(z=>reserved.add(K(z[0],z[1])));
  enc.npcs.forEach(n=>{reserved.add(K(n.x,n.y));for(const[dx,dy]of DIRS)if(inB(n.x+dx,n.y+dy))reserved.add(K(n.x+dx,n.y+dy));});
  enc.enemies.forEach(n=>reserved.add(K(n.x,n.y)));
  for(let x=0;x<COLS;x++)for(const y of type==='ambush'?[]:[0])reserved.add(K(x,y));
  if(type==='breakout')for(let x=0;x<COLS;x++)reserved.add(K(x,0));
  enc.tiles=genTerrain(act,reserved,opt.hazards!==false,type);
  const blockedK=k=>enc.tiles[k].ob||enc.tiles[k].haz;
  if(type==='loot'){const c=[];for(let y=1;y<=4;y++)for(let x=0;x<COLS;x++)if(!reserved.has(K(x,y))&&!blockedK(K(x,y)))c.push({x,y});shuffle(c);const ch=[];for(const t of c){if(ch.every(o=>man(o,t)>=3))ch.push(t);if(ch.length===3)break;}enc.chests=ch.map(t=>[t.x,t.y]);ch.forEach(t=>reserved.add(K(t.x,t.y)));}
  let list=[];
  if(opt.enemies)list=opt.enemies.slice();
  else{
    let budget=encBudget(f,type,act,opt.elite,diff,opt.party)*(!opt.elite&&type!=='boss'?((TUNE.battleMul||[])[act]||1):1);
    if(type==='boss'){list.push({type:BOSSES[act],boss:true});budget-=encBudget(f,'rout',act,false,'medium',opt.party)*TUNE.solo;}
    if(type==='assassinate')list.push({type:LEADERS[act],leader:true});
    if(opt.elite){const t=pick(ELITES[act]);list.push({type:t,elite:true});budget-=MON[t].cost*TUNE.eliteCost;}
    const pool=ACT_POOL[act];let g=0;
    while(list.length<12&&g++<80){
      const aff=pool.filter(t=>(SWARM.includes(t)?2:MON[t].cost)<=budget&&!(type==='boss'&&MON[t].cost>=5));
      if(!aff.length)break;
      const t=pick(aff);
      if(SWARM.includes(t)){for(let i=0;i<4&&list.length<12;i++)list.push({type:t});budget-=2;}
      else{list.push({type:t});budget-=MON[t].cost;}
    }
  }
  let spots=[];
  const rowsFor=type==='rescue'?[0,1]:type==='breakout'?[1,2,3]:[0,1,2];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const k=K(x,y);if((reserved.has(k)&&!(y===0&&type!=='breakout'))||blockedK(k))continue;
    if(enc.npcs.some(n=>n.x===x&&n.y===y)||enc.enemies.some(n=>n.x===x&&n.y===y))continue;
    if(type==='ambush'){if((x===0||x===COLS-1||y===0||y===ROWS-1)&&cheb({x,y},{x:2.5,y:3.5})>=2)spots.push({x,y});}
    else if(rowsFor.includes(y))spots.push({x,y});
  }
  shuffle(spots);
  // big creatures claim a 2×2 block first, then everyone else takes a square
  list.sort((a,b)=>(MON[b.type]&&MON[b.type].sz||1)-(MON[a.type]&&MON[a.type].sz||1));
  for(const e of list){
    let s;const sz=(MON[e.type]&&MON[e.type].sz)||1;
    if(sz>1){const has=(x,y)=>spots.some(t=>t.x===x&&t.y===y);const ok=t=>has(t.x+1,t.y)&&has(t.x,t.y+1)&&has(t.x+1,t.y+1)&&has(t.x,t.y);
      const c=spots.filter(ok).sort((a,b)=>Math.abs(a.x-2)-Math.abs(b.x-2)+(a.y-b.y)*.1);s=c[0];if(!s)continue;
      spots=spots.filter(t=>!(t.x>=s.x&&t.x<=s.x+1&&t.y>=s.y&&t.y<=s.y+1));enc.enemies.push(Object.assign({},e,{x:s.x,y:s.y}));continue;}
    if(e.boss||e.leader||e.elite)s=spots.find(t=>t.y===0&&(t.x===2||t.x===3))||spots.find(t=>t.y<=1)||spots[0];
    else s=spots[0];
    if(!s)break;
    spots=spots.filter(t=>t!==s);
    enc.enemies.push(Object.assign({},e,{x:s.x,y:s.y}));
  }
  return enc;
}

/* ---------------- BATTLE LIFECYCLE ---------------- */
function setupBattle(enc,party){
  if(!(typeof CTX!=='undefined'&&CTX&&CTX.mode==='tutorial'))unseedRng();
  G={enc,units:[],uid:1,round:1,ti:-1,order:[],extra:[],cur:null,await:false,cmd:0,foeMom:0,hold:0,looted:0,ritual:5,ritualFailed:false,kills:0,xp:{},
    chests:enc.chests.map(c=>K(c[0],c[1])),walls:{},zones:[],over:false,result:null,phoenixUsed:false,hordeBoon:false,log:[],
    tiles:JSON.parse(JSON.stringify(enc.tiles)),act:enc.act,dmgAdd:Math.floor(enc.f*TUNE.dmgSlope),rollAdd:Math.floor(enc.f/TUNE.rollStep)};
  G.threatN=0;G.threat=nextThreat();G.foeMom=maliceGain();
  // skirmish difficulty adjusters
  const MD=enc.mods||{};G.foeHp=(MD.foeHp||1)*(dreadOn(1)?1.15:1);G.dmgAdd+=MD.foeDmg||0;G.pcDmgAdd=MD.partyDmg||0;G.foeDmgAdd=MD.foeDmg||0;
  HIST.length=0;
  G.resN={};for(const h of party)for(const id of h.powers||[]){const p=POWERS[id];if(p&&p.tag&&!p.innate&&!p.basic)G.resN[p.tag]=(G.resN[p.tag]||0)+1;}
  const hp=HERO_POS[enc.heroPos];
  for(const h of party)G.units.push(makePc(h,...hp[h.cls],'hero'));
  for(const n of enc.npcs){
    if(n.kind==='villager')G.units.push({id:'npc_v',side:'hero',kind:'npc',npc:'villager',name:n.carry?'Wounded Captive':'Captive',x:n.x,y:n.y,hp:(n.carry?30:20)+enc.f*3,maxHp:(n.carry?30:20)+enc.f*3,speed:n.carry?0:3,attrs:{M:0,F:1,W:0,P:0},st:{},shield:0,caged:!n.carry,carried:!!n.carry,react:false,mp:0});
    if(n.kind==='wagon')G.units.push({id:'npc_w',side:'hero',kind:'npc',npc:'wagon',name:'Supply Wagon',x:n.x,y:n.y,hp:40+enc.f*5,maxHp:40+enc.f*5,speed:0,attrs:{M:0,F:0,W:0,P:0},st:{},shield:0,object:true,react:false,mp:0});
  }
  for(const e of enc.enemies){
    if(e.pc)G.units.push(makePc({cls:e.pc,lvl:e.lvl,hp:e.hp,maxHp:e.maxHp,powers:e.powers},e.x,e.y,'enemy'));
    else G.units.push(makeMon(e.type,e.x,e.y,{leader:e.leader,elite:e.elite}));
  }
  if(hasR('bulwark'))G.units.filter(u=>u.side==='hero'&&u.kind==='pc').forEach(h=>h.shield=8);
  if(hasR('ember'))G.units.filter(u=>u.side==='enemy'&&u.kind==='mon'&&!u.object&&!u.boss).forEach(e=>{if(!immuneFire(e))e.st.burn=3;});
  for(const u of G.units)if(!u.object)u.init=initRoll(u);
  {const sh={};for(const u of G.units)if(!u.object&&(u.minion||u.swarm)){if(sh[u.type]==null)sh[u.type]=u.init;else u.init=sh[u.type];}}
  G.order=G.units.filter(u=>!u.object).sort(ordCmp).map(u=>u.id);
  G.v=4;G.combo=0;
  ROLLQ.length=0;
  if(enc.twist==='ring')ringFire();
  log(`${enc.title}: ${MISSIONS[enc.type].name}.`,'g');
  log('Initiative: '+G.order.map(id=>{const u=U(id);return `${u.name} ${u.init}`;}).join(', ')+'.','g');
  log('— Round 1 —','g');
}
function isPlayer(u){return u.side==='hero'&&(u.kind==='pc'||u.kind==='npc')&&!AUTOPLAY;}
async function beginTurn(u,extra){
  if(G.round>1||u.side!=='hero')u.shield=0;
  u.react=true;u.acted=false;u.moved=false;
  // heroes: fresh actions (fewer on an Inspired extra turn, one while dazed); unused reactions lapse
  if(u.kind==='pc'){let a=(extra?TUNE.extraActs:TUNE.actions)-(u.st.stag?1:0);if(u.st.daze)a=Math.min(a,1);u.acts=Math.max(0,a);u.atk=0;u.basicUsed=false;u.flurry=false;u.momBasic=false;u.swDef=false;}
  if(u.kind==='pc'&&TUNE.momTurn)u.mom=Math.min(momCap(u),u.mom+TUNE.momTurn);
  if(u.kind==='pc'&&live(u)){
    const pv=prevHero(u);
    if(hasP(u,'bulwark')&&pv&&pv.hitSince){u.shield+=4;H.pop(u,'⛨ 4','shield');}
    if(hasP(u,'domino')&&pv&&G.setupT&&G.setupT[pv.id]&&G.setupT[pv.id].r===G.round){addMom(u,1);u.domR=G.round;u.domT=G.setupT[pv.id].ids.slice();H.pop(u,'Domino +1 ◆','res');}
    if(hasP(u,'rallyp'))for(const a of allies(u).filter(a=>a!==u&&!a.object&&cheb(a,u)===1)){a.shield+=2;H.pop(a,'⛨ 2','shield');}
    u.hitSince=false;
  }
  await H.turn(u);
  if(u.boss)await villain(u);
  if(!live(u))return;
  // Burn: N damage at the start of its turn (ignores armour), then N falls by 1
  if(live(u)&&u.st.burn&&!immuneFire(u)){const n=u.st.burn;H.pop(u,`Burn ${n}`,'bad');H.sfx('fire');NOTE=[];await damage(null,u,n,{});if(u.st){u.st.burn=n-1;if(u.st.burn<=0)delete u.st.burn;}const ex=NOTE||[];NOTE=null;log(`${u.name} burns: ${ex.join(' ')}`,sideCol(u));}
  for(const z of G.zones){if(!live(u)||u.object||z.side===u.side||cheb(u,z)>z.r)continue;
    NOTE=[];await damage(null,u,(z.radiant&&u.undead?2:1)*z.dmg,{radiant:z.radiant});if(live(u)&&z.eff){addSt(u,z.eff,1);note(ST_NAME[z.eff]+'.');}const ex=NOTE||[];NOTE=null;log(`${u.name} is caught in a zone: ${ex.join(' ')}`,sideCol(u));}
  u.mp=live(u)&&u.kind!=='pc'?effSpeed(u):0;
  await checkEnd();
}
async function endTurn(u){
  // a hero's unused actions stay ready for reactions until their next turn starts
  if(u&&u.kind==='pc'){u.mp=0;u.acted=true;}
  if(u&&live(u)){const h=Tt(u.x,u.y).haz;if(h&&!HAZ[h.t].once){NOTE=[];await applyHazard(u);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}}
  if(u&&live(u))decSt(u);
  if(u)u.brutal=false;
  G.cur=null;G.await=false;
  await checkEnd();
}
async function roundEnd(){
  const E=G.enc;
  if(E.type==='hold'){
    const onZ=u=>E.zone.some(z=>z[0]===u.x&&z[1]===u.y);
    if(heroes().some(onZ)&&!G.units.some(u=>u.side==='enemy'&&live(u)&&!u.object&&onZ(u))){G.hold++;log(`The shrine is held (${G.hold}/3).`,'g');H.pop(heroes().find(onZ),`Held ${G.hold}/3`,'gold');}
    else log('The shrine is contested.','g');
  }
  if(E.type==='ritual'&&!G.ritualFailed){
    G.ritual--;
    if(G.ritual<=0&&G.units.some(u=>u.pillar&&live(u))){
      G.ritualFailed=true;const p=G.units.find(u=>u.pillar&&live(u));
      for(const q of G.units.filter(u=>u.pillar&&live(u))){q.dead=true;H.death(q);}
      spawnMon('horror',{x:p.x,y:p.y});log('The ritual completes. A Bound Horror breaks free!','e');H.sfx('villain');
    }
  }
  for(const u of G.units)if(u.dead&&u.reassembleAt!=null&&u.reassembleAt<G.round){u.reassembleAt=null;if(freeTile(u.x,u.y,null)){u.dead=false;u.reassembled=true;u.hp=Math.ceil(u.maxHp*.4);u.st={};H.spawn(u);H.pop(u,'Reassembles!','call');log(`${u.name} reassembles.`,'e');}}
  G.round++;
  if(await checkEnd())return;
  for(const k in G.walls){G.walls[k]--;if(G.walls[k]<=0)delete G.walls[k];}
  G.zones=G.zones.filter(z=>--z.rounds>0);
  for(const t of G.tiles)if(t.haz&&t.haz.dur>0){t.haz.dur--;if(t.haz.dur===0)t.haz=null;}
  G.hordeBoon=false;
  await roundTwist(E);if(await checkEnd())return;
  G.foeMom+=maliceGain();
  const cheap=ACT_POOL[E.act].filter(t=>!SWARM.includes(t)&&MON[t].cost<=3);
  const add=(t,where)=>{const s=edgeSpot(where,'enemy');if(s){spawnMon(t,s);log(`${MON[t].name} arrives.`,'e');}};
  const r=G.round-1;
  if(!CTX.skirmish){
    if(E.type==='hold'&&r%2===0&&r<6)for(let i=0;i<1+E.act;i++)add(pick(cheap),'top');
    if(E.type==='survive'&&r<5)for(let i=0;i<1+(r>=2)+(E.act>=2);i++)add(pick(cheap),'any');
    if(E.type==='defend'&&r<5)for(let i=0;i<1+(E.act>=1);i++)add(pick(cheap),'any');
    if(E.type==='breakout'&&r>=1)add(pick(cheap),'bottom');
  }
  if(G.threat&&G.foeMom>=THREATS[G.threat].cost){const id=G.threat;G.foeMom-=THREATS[id].cost;G.threatN=(G.threatN||0)+1;G.threat=nextThreat();await fireThreat(id);if(await checkEnd())return;}
  G.combo=0;
  log(`— Round ${G.round} —`,'g');
  await H.banner('round');
}
/* ---------------- TURNS: one initiative order, heroes and foes mixed ---------------- */
async function nextTurn(){
  while(G&&!G.over){
    await H.rolls();if(!G||G.over)return;
    let u=null;
    let extra=false;
    if(G.extra.length){u=U(G.extra.shift());if(!live(u)||u.caged)continue;extra=true;}
    else{
      G.ti++;
      if(G.ti>=G.order.length){await roundEnd();if(G.over)return;G.ti=0;}
      u=U(G.order[G.ti]);
      if(!u||!live(u)||u.object||u.caged)continue;
    }
    G.cur=u.id;
    if(losesTurn(u)){
      delete u.st.stag;u.stagBy=null;u.st.steady=2;u.react=true;
      await H.turn(u);H.pop(u,'Stunned!','call');log(`${u.name} is stunned and loses its turn.`,'e');
      await endTurn(u);if(G.over)return;await H.pause(120);continue;
    }
    await beginTurn(u,extra);
    if(G.over)return;
    if(!live(u)){G.cur=null;continue;}
    if(isPlayer(u)){G.await=true;pushSnap();H.upd();H.save();return;}
    G.await=false;
    try{await (u.kind==='mon'?monTurn(u):pcTurn(u));}catch(e){console.error(e);}
    if(G.over)return;
    await endTurn(u);
    if(G.over)return;
    await H.pause(80);
  }
}
async function playerEndTurn(){
  if(!G||!G.await||G.over)return;
  const u=U(G.cur);G.await=false;
  await endTurn(u);
  if(!G.over)await nextTurn();
}
/* Upcoming turns from the active one onward, wrapping into later rounds. */
function upcoming(n){
  const out=[];if(!G)return out;
  const cur=G.cur?U(G.cur):null;
  if(cur&&live(cur))out.push({u:cur,round:G.round,now:true});
  for(const id of G.extra){const u=U(id);if(live(u))out.push({u,round:G.round,extra:true});}
  let i=G.ti,round=G.round,guard=0;
  while(out.length<n&&guard++<200){
    i++;if(i>=G.order.length){i=0;round++;}
    const u=U(G.order[i]);if(!u||!live(u)||u.object||u.caged)continue;
    out.push({u,round});
  }
  return out;
}
function outcome(){
  const E=G.enc;const hs=G.units.filter(u=>u.side==='hero'&&u.kind==='pc');
  const standing=hs.filter(h=>!h.dead);
  if(!standing.length)return 'lose';
  if(E.type==='breakout'&&standing.every(h=>h.gone))return 'win';
  const vil=G.units.find(u=>u.npc==='villager');if(vil){if(vil.dead)return 'lose';if(!vil.caged&&vil.y===ROWS-1)return 'win';}
  const wag=G.units.find(u=>u.npc==='wagon');if(wag&&wag.dead)return 'lose';
  const foes=G.units.filter(u=>u.side==='enemy'&&live(u)&&!u.object);
  if(E.type==='boss')return G.units.some(u=>u.boss&&!u.dead)?null:'win';
  if(E.type==='assassinate'&&!G.units.some(u=>u.leader&&!u.dead))return 'win';
  if(G.escaped)return 'lose';
  if(E.type==='hold'&&G.hold>=3)return 'win';
  if((E.type==='survive'||E.type==='defend')&&G.round>5)return 'win';
  if(E.type==='loot'&&G.chests.length===0&&!G.melted)return 'win';
  if(E.type==='ritual'&&!G.ritualFailed&&!G.units.some(u=>u.pillar&&!u.dead))return 'win';
  if(!foes.length&&!(E.type==='ritual'&&G.units.some(u=>u.pillar&&!u.dead)))return 'win';
  return null;
}
async function checkEnd(){
  if(!G||G.over)return true;
  const o=outcome();if(!o)return false;
  G.over=true;G.result=o;G.await=false;
  log(o==='win'?'Victory!':'Defeat.','g');
  await H.end(o);
  return true;
}
