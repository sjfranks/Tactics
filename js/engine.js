'use strict';
/* =====================================================================
   EMBERWATCH — rules engine. No drawing here: the UI hooks in through H.
   ===================================================================== */
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const K=(x,y)=>y*COLS+x,KX=k=>k%COLS,KY=k=>Math.floor(k/COLS);
const man=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const cheb=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const inB=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS;
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const tv=(arr,t)=>arr?(arr[t-1]||0):0;
const _n=()=>{},_a=async()=>{};
const H={step:_a,strike:_a,area:_a,tele:_a,death:_a,banner:_a,pause:_a,turn:_a,end:_a,pop:_n,result:_n,sfx:_n,upd:_n,spawn:_n,save:_n};
let G=null,CTX={mode:'run',relics:[]};
let AUTOPLAY=false;
const HIST=[];

/* ---------------- DICE ---------------- */
const D3=(()=>{const c=new Array(19).fill(0);for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++)c[a+b+d]++;return c;})();
function resOf(nat,mod){if(nat>=16)return 3;const v=nat+mod;return v<=10?1:v<=14?2:3;}
const _rp={};
function resProbs(mod){if(_rp[mod])return _rp[mod];const p=[0,0,0];for(let s=3;s<=18;s++)p[resOf(s,mod)-1]+=D3[s]/216;return _rp[mod]=p;}
function roll3(mod){const d=[1+rnd(6),1+rnd(6),1+rnd(6)];const nat=d[0]+d[1]+d[2];return {d,nat,mod,total:nat+mod,res:resOf(nat,mod)};}
function rollText(r){return `3d6 (${r.d.join('+')})${r.mod>=0?'+':''}${r.mod} = ${r.total} ${RESULT[r.res-1]}${r.nat>=16?' (natural)':''}`;}

/* ---------------- STATE HELPERS ---------------- */
const U=id=>G.units.find(u=>u.id===id);
const live=u=>!!u&&!u.dead&&!u.gone;
const unitAt=(x,y)=>G.units.find(u=>live(u)&&u.x===x&&u.y===y);
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
function stepCost(u,x,y){return difficult(x,y)&&!(u.side==='hero'&&hasR('fenboots'))?2:1;}
function immuneFire(u){return (u.kind==='mon'&&mon(u).fireproof)||(u.side==='hero'&&hasR('scale'));}
function hazDmg(u,h){
  if(!h)return 0;if(h.t==='trap'&&h.side===u.side)return 0;
  if((h.t==='fire'||h.t==='lava')&&immuneFire(u))return 0;
  return (HAZ[h.t].dmg?HAZ[h.t].dmg+G.act:0)+(HAZ[h.t].st.root?3:0);
}
function hazCost(u,x,y){return hazDmg(u,Tt(x,y).haz);}
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
function effRange(r,O){return r+(r>1&&isHighT(O.x,O.y)?1:0);}

/* ---------------- MOVEMENT ---------------- */
function effSpeed(u){
  if(u.object||u.caged)return 0;
  let m=u.speed+(u.side==='hero'&&u.kind==='pc'&&hasR('boots')?1:0);
  if(u.st.slow)m=Math.min(m,1);
  if(u.st.prone)m=Math.floor(m/2);
  if(u.st.root)m=0;
  return m;
}
function canReact(f){return live(f)&&!f.object&&!f.caged&&f.kind!=='npc'&&f.react&&!f.st.daze;}
function passable(u,x,y){
  if(!inB(x,y)||blocked(x,y))return false;
  const o=unitAt(x,y);
  if(o&&o!==u&&(o.side!==u.side||o.object))return false;
  return true;
}
/* Layered search by movement spent: minimises parting blows, then hazard damage, then cost. */
function reach(u,mp){
  const rs=u.nimble?[]:fighters(u).filter(canReact);
  const start={x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null};
  const layers=[];for(let s=0;s<=mp;s++)layers.push(new Map());
  layers[0].set(K(u.x,u.y),start);
  for(let s=0;s<=mp;s++){
    for(const n of layers[s].values()){
      for(const[dx,dy]of DIRS){
        const x=n.x+dx,y=n.y+dy;
        if(!passable(u,x,y))continue;
        const s2=s+stepCost(u,x,y);if(s2>mp)continue;
        let p=n.prov;for(const f of rs)if(man(f,n)===1&&(Math.abs(f.x-x)+Math.abs(f.y-y))!==1)p++;
        const h=n.haz+hazCost(u,x,y);
        const k=K(x,y),L=layers[s2],ex=L.get(k);
        if(!ex||p*100+h<ex.prov*100+ex.haz)L.set(k,{x,y,s:s2,prov:p,haz:h,prev:n});
      }
    }
  }
  const out=new Map();
  for(const L of layers)for(const n of L.values()){
    const o=unitAt(n.x,n.y);if(o&&o!==u)continue;
    const k=K(n.x,n.y),ex=out.get(k),sc=n.prov*100+n.haz;
    if(!ex||sc<ex.prov*100+ex.haz||(sc===ex.prov*100+ex.haz&&n.s<ex.s))out.set(k,n);
  }
  return out;
}
function pathOf(n){const p=[];while(n){p.unshift({x:n.x,y:n.y});n=n.prev;}return p;}
function freeTile(x,y,u){if(!inB(x,y)||blocked(x,y))return false;const o=unitAt(x,y);return !o||o===u;}
function freeAdj(t,u){const out=[];for(const[dx,dy]of DIRS)if(freeTile(t.x+dx,t.y+dy,u))out.push({x:t.x+dx,y:t.y+dy});return out;}
function tilesWithin(O,r){const out=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(Math.abs(x-O.x)+Math.abs(y-O.y)<=r)out.push({x,y});return out;}
function adjFoe(O,a){return fighters(a).some(o=>man(o,O)===1);}

async function walk(u,path,voluntary){
  const struck=new Set();
  for(let i=1;i<path.length;i++){
    const from=path[i-1],to=path[i];
    if(voluntary&&!u.nimble){
      const rs=fighters(u).filter(f=>canReact(f)&&!struck.has(f.id)&&man(f,from)===1&&man(f,to)!==1);
      for(const f of rs){
        struck.add(f.id);f.react=false;
        await partingBlow(f,u);
        if(!live(u))return false;
        if(u.stopped){u.stopped=false;u.mp=0;H.pop(u,'Stopped!','call');return false;}
      }
    }
    const o=unitAt(to.x,to.y);if(o&&o!==u&&i===path.length-1)return false;
    if(voluntary)u.mp=Math.max(0,u.mp-stepCost(u,to.x,to.y));
    const left={x:u.x,y:u.y};
    u.x=to.x;u.y=to.y;await H.step(u);
    if(voluntary&&u.kind==='mon'&&mon(u).trail)setHaz(left.x,left.y,'fire',2,u.side);
    await onEnter(u);
    if(!live(u))return false;
    if(u.st.root){u.mp=0;return false;}
  }
  return true;
}
async function onEnter(u){
  const t=Tt(u.x,u.y);
  if(t.ter==='water'&&u.st.burn){delete u.st.burn;H.pop(u,'Doused','call');}
  if(u.side==='hero'&&u.kind==='pc'&&G.chests.includes(K(u.x,u.y))){
    G.chests=G.chests.filter(c=>c!==K(u.x,u.y));G.looted++;addMom(u,1);H.pop(u,'Treasure!','gold');H.sfx('chest');log(`${u.name} grabs a chest (${G.looted}/3).`,'g');
  }
  if(t.haz)await applyHazard(u);
}
async function applyHazard(u){
  const k=K(u.x,u.y),h=G.tiles[k].haz;if(!h||!live(u))return;
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
  let d=f.kind==='pc'?2+Math.max(f.attrs.M,f.attrs.F)+(f.side==='hero'&&hasR('lens')?3:0):f.swarm?2:TUNE.pbBonus+Math.max(f.attrs.M,f.attrs.F)+G.dmgAdd;
  await H.strike(f,t,{free:true});
  NOTE=[];
  const dealt=await damage(f,t,d,{});
  const ex=NOTE;NOTE=null;
  log(`${f.name} lands a parting blow on ${t.name}: ${dealt} damage.${ex.length?' '+ex.join(' '):''}`,sideCol(f));
  if(f.kind==='pc'&&f.cls==='fighter'&&live(t)&&!t.object){t.stopped=true;applyMark(t,f);addMom(f,1);}
}
async function forceMove(t,from,n,pull,src,fl){
  if(t.object||!live(t))return;
  n-=(t.steady||0);
  if(n<=0){H.pop(t,'Holds firm','call');note(`${t.name} holds firm.`);return;}
  let moved=0;
  for(let i=0;i<n&&live(t);i++){
    let dx=t.x-from.x,dy=t.y-from.y;if(pull){dx=-dx;dy=-dy;}
    let sx=0,sy=0;
    if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)sx=Math.sign(dx);else if(dy!==0)sy=Math.sign(dy);else break;
    const nx=t.x+sx,ny=t.y+sy;
    if(pull&&nx===from.x&&ny===from.y)break;
    if(!inB(nx,ny)||blocked(nx,ny)||unitAt(nx,ny)){
      if(!pull){const sd=2+(n-i-1);H.pop(t,'Slam!','call');H.sfx('slam');if(fl)fl.slam=true;note(`${pull?'Pulled':'Pushed'} ${moved}, slams for ${sd}.`);moved=-1;await damage(src,t,sd,{});}
      break;
    }
    t.x=nx;t.y=ny;moved++;await H.step(t,true);
    await onEnter(t);
  }
  if(moved>0)note(`${pull?'Pulled':'Pushed'} ${moved}.`);
}
async function teleport(u,to){await H.tele(u,to);u.x=to.x;u.y=to.y;H.upd(u);await onEnter(u);}

/* ---------------- DAMAGE & CONDITIONS ---------------- */
function addMom(u,n){if(u.kind==='pc'&&live(u))u.mom=Math.min(10,u.mom+n);}
async function damage(src,t,amt,o){
  if(!live(t)||amt<=0||t.caged)return 0;
  let a=amt;
  if(t.shield>0){const s=Math.min(t.shield,a);t.shield-=s;a-=s;}
  const before=t.hp;t.hp-=a;
  H.pop(t,a<amt?`-${a} ⛨`:`-${a}`,o.crit?'crit':'dmg');
  note(`${a} damage${a<amt?` (${amt-a} absorbed)`:''} [${before}→${Math.max(0,t.hp)}].`);
  if(t.kind==='pc'&&t.cls==='fighter'&&a>0)addMom(t,1);
  if(src&&src.kind==='mon'&&mon(src).drain&&a>0&&live(src))heal(src,Math.ceil(a/2));
  if(t.hp<=0)await kill(t,src,o);
  H.upd(t);
  return a;
}
function heal(t,n){if(!live(t)||n<=0||t.object)return 0;const b=t.hp;t.hp=Math.min(t.maxHp,t.hp+n);const g=t.hp-b;if(g>0){H.pop(t,'+'+g,'heal');note(`${t.name} heals ${g}.`);}H.upd(t);return g;}
async function kill(t,src,o){
  if(t.side==='hero'&&t.kind==='pc'&&hasR('phoenix')&&!G.phoenixUsed){G.phoenixUsed=true;t.hp=Math.ceil(t.maxHp/2);H.pop(t,'Phoenix!','gold');H.sfx('heal');note(`${t.name} rises from the ashes!`);return;}
  t.dead=true;t.hp=0;t.shield=0;
  H.sfx(t.kind==='pc'?'fall':t.object?'crumble':'death');
  note(t.kind==='pc'?`${t.name} has fallen!`:`${t.name} is slain.`);
  await H.death(t);
  if(t.kind==='mon'){
    const m=mon(t);
    if(t.side==='enemy'&&!t.object)G.kills++;
    if(m.fireDeath)setHaz(t.x,t.y,'fire',3,t.side);
    if(m.acidDeath)setHaz(t.x,t.y,'acid',4,t.side);
    if(m.reassemble&&!t.reassembled&&!(o&&o.radiant))t.reassembleAt=G.round;
  }
  if(src&&src.side==='hero'&&t.side!=='hero'&&hasR('fang'))heal(src,4);
}
function applyMark(t,src){
  if(t.object)return;
  t.st.mark=Math.max(t.st.mark||0,1+(G.cur===t.id?1:0));t.marker=src.id;
}
function addSt(t,k,v){
  if(!live(t)||t.object)return;
  if(t.boss&&(k==='daze'||k==='root'))return;
  if(k==='burn'&&immuneFire(t))return;
  if(G.cur===t.id)v+=1;
  t.st[k]=Math.max(t.st[k]||0,v);
  H.upd(t);
}
const ST_NAME={slow:'slowed',root:'rooted',prone:'prone',daze:'dazed',weak:'weakened',bleed:'bleeding',burn:'burning',expose:'exposed',mark:'marked',bless:'blessed'};
function applyEff(src,t,eff,res){
  if(!eff||!live(t)||t.object)return;
  for(const k in eff){
    if(k==='push'||k==='pull')continue;
    const v=tv(eff[k],res);if(!v)continue;
    if(k==='mark'){applyMark(t,src);note('Marked.');continue;}
    if(t.boss&&(k==='daze'||k==='root')){note(`${t.name} shrugs off ${ST_NAME[k]}.`);continue;}
    if(k==='burn'&&immuneFire(t))continue;
    if(k==='bleed')t.bleedDmg=src.side==='hero'?3:2+G.act;
    addSt(t,k,v);note(ST_NAME[k][0].toUpperCase()+ST_NAME[k].slice(1)+'.');
  }
}
function cleanse(t){for(const k of['slow','root','weak','bleed','burn','daze','prone','mark'])delete t.st[k];H.upd(t);}
function decSt(u){for(const k in u.st){u.st[k]--;if(u.st[k]<=0){delete u.st[k];if(k==='mark')u.marker=null;}}}

/* ---------------- BOONS & HINDRANCES ---------------- */
function isMelee(p){return p.tgt==='self'||(p.tgt==='enemy'&&p.range===1)||!!p.reach||(!p.tgt&&p.range===1);}
function netBoon(a,t,p,O){
  O=O||a;const pro=[],con=[];const melee=isMelee(p);
  if(a.st.bless)pro.push('Blessed');
  if(a.hidden)pro.push('Hidden','Hidden');
  if(p.edge)pro.push(p.name);
  if(t.st.expose)pro.push('Exposed');else if(t.st.root)pro.push('Rooted');else if(t.st.daze)pro.push('Dazed');else if(t.st.prone&&melee)pro.push('Prone');
  if(melee&&!t.object){
    if(a.kind==='pc'&&a.cls==='rogue'){if(allies(a).some(h=>h!==a&&!h.object&&man(h,t)===1))pro.push('Ally beside');}
    else if(inB(2*t.x-O.x,2*t.y-O.y)){const h=unitAt(2*t.x-O.x,2*t.y-O.y);if(h&&h!==a&&h.side===a.side&&!h.object)pro.push('Flanking');}
  }
  if(isHighT(O.x,O.y)&&!isHighT(t.x,t.y))pro.push('High ground');
  if(a.kind==='mon'){
    const m=mon(a);
    if(m.pack&&allies(a).some(o=>o!==a&&!o.object&&man(o,t)===1))pro.push('Pack');
    if(allies(a).some(o=>o!==a&&o.kind==='mon'&&mon(o).aura&&man(o,O)<=2))pro.push('Aura');
  }
  if(a.brutal)pro.push('Brutal');
  if(a.side==='enemy'&&G.hordeBoon)pro.push('Horde');
  if(a.side==='enemy'&&t.side==='hero'&&hasR('ward')&&!(t.warded||{})[a.id])con.push('Warding Charm');
  if(a.st.weak)con.push('Weakened');
  if(a.st.prone)con.push('Prone');
  if(a.st.mark&&a.marker&&a.marker!==t.id&&live(U(a.marker)))con.push('Marked');
  if(!melee){
    if(adjFoe(O,a))con.push('Foe beside you');
    if(p.area==null&&man(O,t)>1&&inCover(O,t))con.push('Cover');
  }
  const net=clamp(Math.min(2,pro.length)-Math.min(2,con.length),-2,2);
  return {net,pro,con};
}
function attackMod(a,attr){let m=(a.attrs&&a.attrs[attr])||0;if(a.kind==='mon')m+=G.rollAdd;if(a.side==='hero'&&a.kind==='pc'&&hasR('dice'))m++;return m;}
const sneakBonus=a=>2+Math.floor(a.lvl/3);
function pcDmg(a,p,t,res,net){
  if(p.noDmg||!p.dmg)return 0;
  let d=p.dmg[res-1]+(a.attrs[p.a]||0);
  if(a.side==='hero'&&hasR('whetstone'))d+=1;
  if(a.cls==='rogue'&&net>0)d+=sneakBonus(a);
  if(p.radiant&&t.undead)d*=2;
  if(p.execute&&t.hp<=t.maxHp/2)d*=2;
  return Math.max(0,d);
}
function monDmg(a,A,t,res){
  if(A.flat!=null)return A.flat+Math.floor(G.dmgAdd/2);
  let d=A.dmg[res-1]+G.dmgAdd;
  if(mon(a).savage&&t.hp<=t.maxHp/2)d+=2;
  return d;
}

/* ---------------- POWERS (heroes and rival heroes) ---------------- */
function powerOf(u,i){return POWERS[u.powers[i]];}
function usable(u,p){
  if(!p||p.cost>u.mom)return false;
  if(p.revive&&!G.units.some(h=>h.side===u.side&&h.kind==='pc'&&h.dead))return false;
  return true;
}
function targetsFrom(u,p,O){
  const R=[];
  if(p.tgt==='enemy'){
    const r=effRange(p.range,O);
    for(const e of foesOf(u)){const d=man(O,e);if(d<1||d>r)continue;if(d>1&&!los(O,e))continue;if(p.teleportAdj&&!freeAdj(e,u).length)continue;R.push({x:e.x,y:e.y});}
  }else if(p.tgt==='ally'){
    for(const a of allies(u)){
      if(a.object||(a.caged&&!p.heal))continue;
      if(a===u){if(!p.noSelf&&O.x===u.x&&O.y===u.y)R.push({x:u.x,y:u.y});continue;}
      if(man(O,a)<=p.range&&!(O.x===a.x&&O.y===a.y))R.push({x:a.x,y:a.y});
    }
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
function canMoveNow(u){return u.mp>0&&!(u.st.daze&&u.acted)&&!u.st.root;}
/* Everything the active unit can do with power index pi right now. */
function unitView(u,pi){
  const V={moves:new Map(),targets:new Map(),zone:new Set()};
  if(!live(u)||G.over)return V;
  const mv=canMoveNow(u);
  if(mv)reach(u,u.mp).forEach((n,k)=>V.moves.set(k,n));
  if(u.acted||u.kind!=='pc')return V;
  const p=powerOf(u,pi);
  if(!p||!usable(u,p))return V;
  const here={x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null};
  const combo=mv&&!u.st.daze&&(p.tgt==='enemy'||p.tgt==='ally');
  const origins=combo?[...V.moves.values()]:[here];
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
  return L;
}
function healAmt(u,base){return base+(u.cls==='cleric'?u.attrs.P:0);}
/* Forecast rows used by the UI and by the AI. */
function forecast(u,p,T,O){
  O=O||u;const rows=[];
  const mk=t=>{const nb=netBoon(u,t,p,O);const mod=attackMod(u,p.a)+2*nb.net;const probs=resProbs(mod);
    return {t,net:nb.net,pro:nb.pro,con:nb.con,mod,probs,dmg:[1,2,3].map(r=>pcDmg(u,p,t,r,nb.net)*(p.hits||1)),ctrl:!!p.noDmg};};
  if(p.tgt==='enemy'){
    const t=unitAt(T.x,T.y);if(!t)return rows;
    rows.push(mk(t));
    if(p.chain){let last=t;const done=new Set([t.id]);for(let i=0;i<p.chain;i++){const nx=foesOf(u).filter(e=>!done.has(e.id)&&man(e,last)<=3).sort((a,b)=>man(a,last)-man(b,last))[0];if(!nx)break;done.add(nx.id);rows.push(mk(nx));last=nx;}}
  }else if(p.tgt==='ally'){
    const a=(T.x===u.x&&T.y===u.y)?u:unitAt(T.x,T.y);
    if(a)rows.push({t:a,heal:p.heal?healAmt(u,p.heal):0,shield:p.shield||0,refresh:p.refresh});
  }else if(p.tgt==='self'||(p.tgt==='tile'&&p.area!=null)){
    const C=p.tgt==='self'?O:T;
    if(p.area!=null){
      if(p.aff==='ally')for(const a of areaTargets(u,p,C))rows.push({t:a,heal:p.heal?healAmt(u,p.heal):0,shield:p.shield||0,empower:p.empower});
      else for(const t of areaTargets(u,p,C))rows.push(mk(t));
    }
  }
  return rows;
}
function evRow(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+pr*Math.min(hp,r.dmg[i]),0);}
function killP(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+(r.dmg[i]>=hp?pr:0),0);}
function pushExtra(u){return (u.kind==='pc'&&u.cls==='wizard'?1:0)+(u.side==='hero'&&hasR('gauntlet')?1:0);}

async function pcStrike(u,p,t,C,fl){
  const hits=p.hits||1;
  for(let h=0;h<hits&&live(t);h++){
    const nb=netBoon(u,t,p,u);
    const r=roll3(attackMod(u,p.a)+2*nb.net);
    const d=pcDmg(u,p,t,r.res,nb.net);
    if(u.cls==='rogue'&&nb.net>0&&d>0)fl.sneak=true;
    H.result(t,r);
    NOTE=[];
    if(u.hidden&&h===0){u.hidden=false;}
    if(d>0)await damage(u,t,d,{crit:r.res===3,radiant:p.radiant});
    fl.hitIds.add(t.id);
    if(live(t)){
      if(p.mark){applyMark(t,u);note('Marked.');}
      applyEff(u,t,p.eff,r.res);
      const push=tv(p.eff&&p.eff.push,r.res),pull=tv(p.eff&&p.eff.pull,r.res);
      if(push)await forceMove(t,C,push+pushExtra(u),false,u,fl);
      if(pull&&live(t))await forceMove(t,C,pull+pushExtra(u),true,u,fl);
    }
    const ex=NOTE;NOTE=null;
    const why=(nb.pro.length?' +'+nb.pro.join(', +'):'')+(nb.con.length?' -'+nb.con.join(', -'):'');
    log(`${u.name}: ${p.name} → ${t.name}. ${rollText(r)}${why?' ('+why.trim()+')':''}. ${ex.join(' ')}`,sideCol(u));
  }
}
async function support(u,a,p,fl){
  NOTE=[];
  if(p.heal){const g=heal(a,healAmt(u,p.heal));if(g>0&&a!==u)fl.healedOther=true;}
  if(p.shield){a.shield+=p.shield;H.pop(a,'⛨ '+p.shield,'shield');note(`${a.name} gains ${p.shield} shield.`);}
  if(p.empower){a.st.bless=Math.max(a.st.bless||0,p.empower+(G.cur===a.id?1:0));H.pop(a,'Blessed','gold');note(`${a.name} is blessed.`);}
  if(p.cleanse){cleanse(a);note('Conditions end.');}
  const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));
  H.upd(a);
}
async function usePower(u,p,T){
  u.mom-=p.cost;
  const fl={hitIds:new Set(),sneak:false,healedOther:false,slam:false};
  if(p.tgt!=='enemy'||p.area!=null)log(`${u.name} uses ${p.name}.`,sideCol(u));
  if(p.tgt==='enemy'){
    const t=unitAt(T.x,T.y);if(!t)return;
    if(p.teleportAdj){const spot=freeAdj(t,u).sort((a,b)=>man(a,u)-man(b,u))[0];if(spot)await teleport(u,spot);}
    await H.strike(u,t,{proj:p.proj,power:p});
    const pre={x:t.x,y:t.y};
    await pcStrike(u,p,t,{x:u.x,y:u.y},fl);
    if(p.follow&&live(u)&&!unitAt(pre.x,pre.y)&&man(u,pre)===1&&!blocked(pre.x,pre.y)){u.x=pre.x;u.y=pre.y;await H.step(u);await onEnter(u);}
    if(p.cleave&&live(u)){const o=fighters(u).find(f=>f!==t&&man(f,u)===1);if(o){await H.strike(u,o,{});NOTE=[];await damage(u,o,u.attrs.M+(hasR('whetstone',u)?1:0),{});const ex=NOTE;NOTE=null;log(`Cleave hits ${o.name}: ${ex.join(' ')}`,sideCol(u));}}
    if(p.chain){
      let last=t;const done=new Set([t.id]);
      for(let i=0;i<p.chain;i++){
        const nx=foesOf(u).filter(e=>!done.has(e.id)&&man(e,last)<=3).sort((a,b)=>man(a,last)-man(b,last))[0];
        if(!nx)break;done.add(nx.id);await H.strike(last,nx,{proj:p.proj,chain:true});await pcStrike(u,p,nx,{x:u.x,y:u.y},fl);last=nx;
      }
    }
  }else if(p.tgt==='ally'){
    const a=(T.x===u.x&&T.y===u.y)?u:unitAt(T.x,T.y);if(!a)return;
    if(p.swap){const ux=u.x,uy=u.y;u.x=a.x;u.y=a.y;a.x=ux;a.y=uy;await H.tele(u,u,true);H.upd(a);if(p.shield){u.shield+=p.shield;H.pop(u,'⛨ '+p.shield,'shield');}}
    if(p.refresh){if(!G.extra.includes(a.id))G.extra.push(a.id);H.pop(a,'Inspired!','gold');H.sfx('holy');log(`${a.name} will take an extra turn.`,sideCol(u));}
    await support(u,a,p,fl);
  }else if(p.teleport){
    await teleport(u,T);
  }else if(p.wall){
    for(const dx of[-1,0,1]){const x=T.x+dx,y=T.y;if(inB(x,y)&&!blocked(x,y)&&!unitAt(x,y))G.walls[K(x,y)]=3;}
    await H.area(T,0,'ice');H.sfx('ice');
  }else if(p.revive){
    const f=G.units.filter(h=>h.side===u.side&&h.kind==='pc'&&h.dead).pop();
    const spot=freeAdj(u,u)[0]||tilesWithin(u,3).find(t=>freeTile(t.x,t.y,null));
    if(f&&spot){f.dead=false;f.hp=Math.ceil(f.maxHp*.4);f.x=spot.x;f.y=spot.y;f.st={};f.shield=0;H.spawn(f);H.sfx('holy');log(`${f.name} is revived!`,sideCol(u));}
  }else if(p.area!=null&&!p.hide){
    const C=p.tgt==='self'?{x:u.x,y:u.y}:{x:T.x,y:T.y};
    await H.area(C,Math.min(p.area,8),p.fx||(p.aff==='ally'?'holy':'force'));
    NOTE=[];
    if(p.pullFirst){for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object).sort((a,b)=>man(a,C)-man(b,C))){await forceMove(f,C,p.pullFirst,true,u,fl);if(live(f))applyMark(f,u);}}
    if(p.pullCenter){for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object).sort((a,b)=>man(a,C)-man(b,C)))await forceMove(f,C,p.pullCenter,true,u,fl);}
    const pre=NOTE;NOTE=null;if(pre.length)log(pre.join(' '),sideCol(u));
    let list=areaTargets(u,p,C);
    if(p.adjOnly)list=list.filter(t=>cheb(t,u)===1);
    const pushy=p.eff&&p.eff.push;
    list.sort((a,b)=>pushy?man(b,C)-man(a,C):man(a,C)-man(b,C));
    for(const t of list){if(p.aff==='ally')await support(u,t,p,fl);else await pcStrike(u,p,t,C,fl);}
    if(p.allyHeal){NOTE=[];for(const a of allies(u).filter(a=>!a.object&&!a.caged&&cheb(a,C)<=p.area)){const g=heal(a,healAmt(u,p.allyHeal));if(g>0&&a!==u)fl.healedOther=true;}const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
    if(p.zone)G.zones.push({x:C.x,y:C.y,r:p.zone.r!=null?p.zone.r:1,rounds:2,dmg:p.zone.dmg,eff:p.zone.eff,radiant:!!p.zone.radiant,fx:p.fx,side:u.side});
    if(p.igniteCenter){setHaz(C.x,C.y,'fire',3,u.side);log(`Fire takes hold at ${tileName(C.x,C.y)}.`,sideCol(u));}
    if(p.webArea)for(let y=C.y-1;y<=C.y+1;y++)for(let x=C.x-1;x<=C.x+1;x++)if(inB(x,y)&&!unitAt(x,y)&&!Tt(x,y).haz)setHaz(x,y,'web',3,u.side);
  }
  if(p.selfHeal){NOTE=[];heal(u,p.selfHeal);const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
  if(p.markAround)for(const f of fighters(u).filter(e=>cheb(e,u)<=p.markAround))applyMark(f,u);
  if(p.healNear){const w=allies(u).filter(a=>!a.object&&!a.caged&&man(a,u)<=3&&a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(w){NOTE=[];const g=heal(w,p.healNear);const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));if(g>0&&w!==u)fl.healedOther=true;}}
  if(p.gainRes)addMom(u,p.gainRes);
  if(p.hide){u.hidden=true;H.pop(u,'Hidden','call');H.sfx('whoosh');}
  if(u.cls==='rogue'&&fl.sneak){addMom(u,1);H.pop(u,'+1 ◆','res');}
  if(u.cls==='wizard'&&(fl.hitIds.size>=2||fl.slam)){addMom(u,1);H.pop(u,'+1 ◆','res');}
  if(u.cls==='cleric'&&fl.healedOther){addMom(u,1);H.pop(u,'+1 ◆','res');}
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
  const n=reach(u,u.mp).get(K(dest.x,dest.y));if(!n||(n.x===u.x&&n.y===u.y))return false;
  pushSnap();G.cmd++;
  await walk(u,pathOf(n),true);
  u.moved=true;
  if(u.st.daze&&!u.acted){u.acted=true;}
  if(live(u))afterUnit(u);
  await checkEnd();H.save();
  return true;
}
async function cmdAct(u,pi,T,origin){
  const p=powerOf(u,pi);
  if(!G.await||G.cur!==u.id||u.acted||!usable(u,p))return false;
  pushSnap();G.cmd++;
  if(origin&&(origin.x!==u.x||origin.y!==u.y)){
    const n=reach(u,u.mp).get(K(origin.x,origin.y));if(!n)return false;
    await walk(u,pathOf(n),true);u.moved=true;
    if(!live(u)||G.over||u.x!==origin.x||u.y!==origin.y){afterUnit(u);await checkEnd();H.save();return false;}
    if(!targetsFrom(u,p,u).some(t=>t.x===T.x&&t.y===T.y)){afterUnit(u);await checkEnd();H.save();return false;}
  }
  await usePower(u,p,T);
  if(!p.free){u.acted=true;u.mp=0;}
  if(u.st.daze)u.mp=0;
  if(p.canto&&live(u))u.mp=p.canto;
  if(p.freeMove)u.mp+=p.freeMove;
  if(live(u))afterUnit(u);
  await checkEnd();H.save();
  return true;
}
function turnDone(u){return !live(u)||(u.acted&&u.mp<=0)||(u.kind==='npc'&&u.mp<=0);}

/* ---------------- UNDO ---------------- */
function snapG(){return JSON.stringify(G);}
function stateKey(){return JSON.stringify(G,(k,v)=>k==='log'||k==='await'?undefined:v);}
function pushSnap(){const k=stateKey();if(HIST.length&&HIST[HIST.length-1].k===k)return;HIST.push({s:snapG(),k,cur:G.cur});if(HIST.length>80)HIST.shift();}
let _uc={key:'',v:false};
function canUndo(){
  if(!G||!G.await||G.over||!HIST.length)return false;
  const key=G.cmd+'|'+G.cur+'|'+G.log.length+'|'+HIST.length;
  if(_uc.key!==key){const k=stateKey();_uc={key,v:HIST.some(e=>e.k!==k)};}
  return _uc.v;
}
function undo(){
  if(!canUndo())return false;
  const k=stateKey();
  while(HIST.length&&HIST[HIST.length-1].k===k)HIST.pop();
  const e=HIST.pop();if(!e)return false;
  G=JSON.parse(e.s);G.await=true;
  G.log.push({m:`Undone: back to ${U(G.cur)?U(G.cur).name:'?'}'s turn.`,c:'g'});
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
  const probs=A.flat!=null?[0,1,0]:resProbs(attackMod(e,A.a)+2*nb.net);
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
    const nx=x+sx,ny=y+sy;if(pull&&nx===from.x&&ny===from.y)break;
    if(!inB(nx,ny)||blocked(nx,ny)||unitAt(nx,ny)){if(!pull)v+=2+(n-i-1);break;}
    x=nx;y=ny;v+=hazCost(t,x,y)*1.2;
  }
  return v;
}
function monCanAct(A,e){return (!A.cost||G.foeMom>=A.cost)&&!(A.cd&&(e.cd||{})[A.name]>G.round);}
function planMon(e){
  const m=mon(e);const R=reach(e,e.mp);
  const acts=m.acts.filter(A=>monCanAct(A,e));
  const targets=foesOf(e);
  const vil=G.units.find(v=>v.kind==='npc'&&v.npc==='villager'&&live(v)&&!v.caged);
  const wag=G.units.find(v=>v.kind==='npc'&&v.npc==='wagon'&&live(v));
  const tail=e.id.charCodeAt(e.id.length-1);
  let srcs=targets.filter(t=>!t.object);
  if(e.side==='enemy'&&wag&&tail%3!==0)srcs=[wag];
  if(e.side==='enemy'&&vil&&tail%2===0)srcs=[vil];
  if(e.side==='enemy'&&G.enc.type==='hold'&&tail%2===0)srcs=srcs.concat(G.enc.zone.map(z=>({x:z[0],y:z[1]})));
  if(!srcs.length)srcs=targets;
  const field=distField(srcs);
  const provCost=e.hp<=8?14:6;
  const ranged=m.acts[0]&&m.acts[0].range>1;
  let best={s:-1e9,node:null,act:null,target:null};
  for(const n of R.values()){
    const moved=n.x!==e.x||n.y!==e.y;
    let base=-n.prov*provCost-n.haz*2-hazCost(e,n.x,n.y)*1.5;
    if(ranged)base-=fighters(e).filter(h=>man(h,n)===1).length*4;
    if(isHighT(n.x,n.y))base+=1;
    if(G.enc.type==='hold'&&e.side==='enemy'&&G.enc.zone.some(z=>z[0]===n.x&&z[1]===n.y))base+=4;
    const fd=field.has(K(n.x,n.y))?field.get(K(n.x,n.y)):40;
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
        const d=man(n,t);if(d<1||d>effRange(A.range,n))continue;if(d>1&&!los(n,t))continue;
        const r=evMon(e,A,t,n);
        let s=base+r.ev*(t.kind==='pc'?1+(1-t.hp/t.maxHp)*.5+(t.cls==='wizard'||t.cls==='cleric'?.25:0):1.3)+r.kill*(t.kind==='pc'?22:35);
        if(t.kind==='npc')s+=6;
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
  let brutal=false;
  if(best.act&&best.target&&!best.tile&&!best.act.tgt&&best.act.flat==null&&G.foeMom>=3+(best.act.cost||0)){
    const r=evMon(e,best.act,best.target,best.node);
    e.brutal=true;const r2=evMon(e,best.act,best.target,best.node);e.brutal=false;
    if(e.boss||r2.kill-r.kill>.25)brutal=true;
  }
  return Object.assign(best,{brutal});
}
async function monAttack(e,A,t,isTile){
  if(!live(e))return;
  if(A.cost)G.foeMom-=A.cost;
  if(A.cd){e.cd=e.cd||{};e.cd[A.name]=G.round+A.cd;}
  if(isTile){
    await H.strike(e,{x:t.x,y:t.y,id:'tile'},{proj:A.trap==='fire'?'#ff7a2a':'#c8b060',monster:true});
    setHaz(t.x,t.y,A.trap,A.trap==='trap'?-1:3,e.side);
    log(`${e.name}: ${A.name} at ${tileName(t.x,t.y)}.`,'e');H.sfx(A.trap==='fire'?'fire':'click');
    return;
  }
  if(!live(t))return;
  if(A.tgt==='ally'){await H.strike(e,t,{support:true});NOTE=[];heal(t,A.heal+G.dmgAdd);const ex=NOTE;NOTE=null;log(`${e.name} mends ${t.name}. ${ex.join(' ')}`,'e');return;}
  if(A.rally){H.pop(e,'Rally!','call');log(`${e.name} rallies its allies!`,'e');for(const f of allies(e).filter(f=>f!==e&&!f.object&&man(f,e)<=3)){const h=fighters(f).find(h=>man(h,f)===1);if(h)await partingBlow(f,h);}return;}
  if(A.mom){H.pop(e,'Offering','call');NOTE=[];await damage(null,e,3,{});NOTE=null;G.foeMom+=A.mom;log(`${e.name} bleeds itself to feed the foes' momentum (+${A.mom}).`,'e');return;}
  await H.strike(e,t,{proj:A.range>1&&man(e,t)>1?(A.area?'#ff7a2a':'#ff9a7a'):null,monster:true});
  const victims=A.area?foesOf(e).filter(o=>cheb(o,t)<=A.area):[t];
  if(A.area)await H.area(t,A.area,'fire');
  for(const v of victims){
    if(!live(v))continue;
    const nb=netBoon(e,v,A,e);
    const r=A.flat!=null?null:roll3(attackMod(e,A.a)+2*nb.net);
    const res=r?r.res:2;
    if(v.side==='hero'&&hasR('ward')){v.warded=v.warded||{};v.warded[e.id]=1;}
    if(r)H.result(v,r);
    NOTE=[];
    await damage(e,v,monDmg(e,A,v,res),{crit:res===3});
    if(live(v)){
      applyEff(e,v,A.eff,res);
      const push=tv(A.eff&&A.eff.push,res),pull=tv(A.eff&&A.eff.pull,res);
      if(push)await forceMove(v,e,push,false,e,null);
      if(pull&&live(v))await forceMove(v,e,pull,true,e,null);
    }
    const ex=NOTE;NOTE=null;
    const why=(nb.pro.length?' +'+nb.pro.join(', +'):'')+(nb.con.length?' -'+nb.con.join(', -'):'');
    log(`${e.name}: ${A.name} → ${v.name}. ${r?rollText(r):'Swarm hit'}${why&&r?' ('+why.trim()+')':''}. ${ex.join(' ')}`,'e');
  }
  if(A.hazard){
    if(A.area){for(let y=t.y-A.area;y<=t.y+A.area;y++)for(let x=t.x-A.area;x<=t.x+A.area;x++)if(inB(x,y))setHaz(x,y,A.hazard,3,e.side);}
    else setHaz(t.x,t.y,A.hazard,3,e.side);
  }
  if(e.st.mark&&e.marker&&e.marker!==t.id&&live(e)){const F=U(e.marker);if(live(F)&&F.kind==='pc'&&F.cls==='fighter'&&man(F,e)===1&&canReact(F)){F.react=false;H.pop(F,'Sentinel!','call');await partingBlow(F,e);}}
}
async function monTurn(e){
  const m=mon(e);
  if(e.object||!live(e))return;
  if(m.summon&&G.round%2===0&&allies(e).filter(f=>f.type===m.summon).length<2){const s=freeAdj(e,null)[0];if(s){H.pop(e,'Rise!','call');log(`${e.name} raises a ${MON[m.summon].name.toLowerCase()}.`,'e');spawnMon(m.summon,s,{side:e.side});await H.pause(250);}}
  const plan=planMon(e);
  if(!plan.node)return;
  if(plan.brutal){G.foeMom-=3;e.brutal=true;H.pop(e,'Brutal!','call');}
  const moved=plan.node.x!==e.x||plan.node.y!==e.y;
  if(moved){await walk(e,pathOf(plan.node),true);if(!live(e))return;afterUnit(e);if(await checkEnd())return;}
  let A=plan.act,t=plan.target;
  if(A&&!(e.st.daze&&moved)){
    if(plan.tile){if(man(e,t)<=A.range)await monAttack(e,A,t,true);}
    else{
      if(!A.tgt&&(!live(t)||man(e,t)>effRange(A.range,e)||man(e,t)<1)){
        t=foesOf(e).filter(x=>{const d=man(e,x);return d>=1&&d<=effRange(A.range,e)&&(d===1||los(e,x));}).sort((a,b)=>a.hp-b.hp)[0];
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
    for(const a of opts)for(const x of foesOf(e)){const d=man(e,x);if(d<1||d>effRange(a.range,e)||(d>1&&!los(e,x)))continue;const r=evMon(e,a,x,e);const s=r.ev+r.kill*20-(a.cost||0)*1.3;if(!bb||s>bb.s)bb={s,a,x};}
    if(bb){await H.pause(160);await monAttack(e,bb.a,bb.x);}
  }
  if(m.skulk&&live(e)){const s=freeAdj(e,e).filter(t=>!Tt(t.x,t.y).haz).sort((a,b)=>minDist(b,e)-minDist(a,e))[0];if(s&&minDist(s,e)>minDist(e,e)){e.x=s.x;e.y=s.y;await H.step(e);}}
  afterUnit(e);
}
function minDist(p,u){let m=99;for(const h of fighters(u))m=Math.min(m,man(h,p));return m;}

/* ---------------- HERO-KIT AI (rival parties, autoplay) ---------------- */
function threatened(t){return foesOf(t).some(f=>!f.object&&man(f,t)<=5);}
function valuePower(u,p,T,O){
  const rows=forecast(u,p,T,O);let v=0,hits=0;
  for(const r of rows){
    if(r.dmg){
      if(r.t.side===u.side)continue;hits++;
      v+=evRow(r)+killP(r)*(r.t.boss?10:r.t.kind==='npc'?25:18)+(r.t.pillar?5:0);
      if(p.eff)v+=Object.keys(p.eff).filter(k=>k!=='push'&&k!=='pull').length*1.2;
      if(p.mark)v+=.5;
      if(p.eff&&(p.eff.push||p.eff.pull))v+=forcedValue(u,r.t,p.tgt==='enemy'?O:(p.tgt==='self'?O:T),tv(p.eff.push||p.eff.pull,2)+pushExtra(u),!!p.eff.pull);
    }else{
      const t=r.t,miss=t.maxHp-t.hp;
      if(r.heal)v+=miss>=4?Math.min(miss,r.heal)*1.1:0;
      if(r.shield)v+=r.shield*(threatened(t)?.5:.05);
      if(r.empower)v+=1.5;
      if(r.refresh&&t.id!==u.id)v+=7;
    }
  }
  if(p.tgt!=='ally'&&p.aff!=='ally'&&!hits&&!p.revive&&!p.selfHeal)return -99;
  if(p.zone)v+=3*hits;
  if(p.igniteCenter)v+=1;
  if(p.revive)v+=25;
  if(p.selfHeal)v+=Math.min(u.maxHp-u.hp,p.selfHeal)*.8;
  return v-p.cost*.9;
}
function planPc(u,stayOnly){
  const nodes=stayOnly||!canMoveNow(u)?[{x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null}]:[...reach(u,u.mp).values()];
  let best={s:.5,O:null,pi:-1,T:null};
  const foes=fighters(u);
  for(let pi=0;pi<u.powers.length;pi++){
    const p=powerOf(u,pi);if(!usable(u,p)||u.acted||p.teleport||p.wall||p.hide)continue;
    const org=(p.tgt==='enemy'||p.tgt==='ally'||p.tgt==='self')&&!u.st.daze?nodes:nodes.filter(n=>n.x===u.x&&n.y===u.y);
    for(const O of org){
      let pen=O.prov*8+O.haz*1.5+hazCost(u,O.x,O.y)*1.2;
      const ranged=p.tgt==='enemy'&&p.range>1||p.tgt==='tile'||p.tgt==='ally';
      if(ranged&&foes.some(f=>man(f,O)===1))pen+=2.5;
      let T=targetsFrom(u,p,O);
      if(p.tgt==='tile')T=T.filter(t=>foes.some(f=>cheb(f,t)<=(p.area||0)));
      for(const t of T){const s=valuePower(u,p,t,O)-pen;if(s>best.s)best={s,O,pi,T:t};}
    }
  }
  return best;
}
async function pcTurn(u){
  if(u.kind==='npc'){
    if(u.npc==='villager'&&!u.caged&&canMoveNow(u)){const R=reach(u,u.mp);let b=null;for(const n of R.values()){const s=n.y*3-n.prov*5-n.haz;if(!b||s>b.s)b={s,n};}if(b&&(b.n.x!==u.x||b.n.y!==u.y)){await walk(u,pathOf(b.n),true);afterUnit(u);}}
    return;
  }
  for(let it=0;it<2&&live(u)&&!G.over;it++){
    const best=planPc(u,it>0);
    if(best.O){
      if(best.O.x!==u.x||best.O.y!==u.y){await walk(u,pathOf(best.O),true);u.moved=true;if(!live(u)||G.over)return;afterUnit(u);if(await checkEnd())return;if(u.x!==best.O.x||u.y!==best.O.y)continue;}
      const p=powerOf(u,best.pi);
      if(!targetsFrom(u,p,u).some(t=>t.x===best.T.x&&t.y===best.T.y))return;
      await usePower(u,p,best.T);
      u.acted=true;u.mp=p.canto||0;afterUnit(u);if(await checkEnd())return;
      if(p.canto&&live(u)){const R=reach(u,u.mp);let b=null;for(const n of R.values()){const s=-n.prov*8-n.haz*2+Math.min(3,minDist(n,u))*1.5;if(!b||s>b.s)b={s,n};}if(b&&(b.n.x!==u.x||b.n.y!==u.y))await walk(u,pathOf(b.n),true);}
      return;
    }
    if(it===0&&canMoveNow(u)){
      const foes=fighters(u);if(!foes.length)return;
      const ranged=u.cls==='wizard'||u.cls==='cleric';
      const field=distField(foes);let b=null;
      for(const n of reach(u,u.mp).values()){const fd=field.has(K(n.x,n.y))?field.get(K(n.x,n.y)):40;const want=ranged?3:1;const s=-Math.abs(fd-want)*2-n.prov*8-n.haz*2-hazCost(u,n.x,n.y)-(ranged&&fd===1?3:0);if(!b||s>b.s)b={s,n};}
      if(b&&(b.n.x!==u.x||b.n.y!==u.y)){await walk(u,pathOf(b.n),true);u.moved=true;if(!live(u))return;afterUnit(u);if(await checkEnd())return;}
    }else return;
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
    case 'horde':{for(let i=0;i<3;i++){const s=edgeSpot('top',b.side);if(s)spawnMon('runner',s,{side:b.side});}G.hordeBoon=true;break;}
    case 'warcry':for(const h of hs.filter(h=>man(h,b)<=3)){addSt(h,'weak',1);applyMark(h,b);}break;
    case 'laststand':heal(b,24);G.foeMom+=3;break;
    case 'raise':{for(let i=0;i<2;i++){const s=edgeSpot('top',b.side);if(s)spawnMon('bats',s,{side:b.side});}const s=freeAdj(b,null)[0];if(s)spawnMon('skeleton',s,{side:b.side});break;}
    case 'siphon':{let tot=0;for(const h of hs.filter(h=>man(h,b)<=4)){tot+=await damage(b,h,4,{});}heal(b,tot);break;}
    case 'nova':for(const h of hs){await damage(b,h,5,{});}break;
    case 'presence':for(const h of hs)addSt(h,'weak',1);G.foeMom+=4;break;
    case 'buffet':for(const h of hs.filter(h=>cheb(h,b)<=2)){await damage(b,h,5,{});await forceMove(h,b,2,false,b,null);addSt(h,'prone',1);}break;
    case 'inferno':{
      const rows={};for(const h of hs)rows[h.y]=(rows[h.y]||0)+1;
      const y=+Object.keys(rows).sort((a,c)=>rows[c]-rows[a])[0];
      await H.area({x:3.5,y},0,'row');
      for(const h of hs.filter(h=>h.y===y))await damage(b,h,10,{});
      for(const h of hs.filter(h=>Math.abs(h.y-y)===1))await damage(b,h,4,{});
      for(let x=0;x<COLS;x++)setHaz(x,y,'fire',2,b.side);
      break;}
  }
  const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),'e');
}

/* ---------------- SPAWNING ---------------- */
function edgeSpot(where,side){
  const c=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(!freeTile(x,y,null)||Tt(x,y).haz)continue;
    const ok=where==='top'?y<=1:where==='bottom'?y===ROWS-1:(y<=1||((x===0||x===COLS-1)&&y<=5));
    if(ok&&G.units.filter(u=>live(u)&&u.side!==side).every(h=>man(h,{x,y})>=2))c.push({x,y});
  }
  return c.length?pick(c):null;
}
function initRoll(u){return 1+rnd(20)+(u.attrs.F||0)+(u.side==='hero'&&hasR('hourglass')?3:0);}
function ordCmp(a,b){return b.init-a.init||((a.side==='hero'?0:1)-(b.side==='hero'?0:1))||((b.attrs.F||0)-(a.attrs.F||0));}
function insertOrder(u){
  u.init=initRoll(u);
  let i=G.order.findIndex(id=>{const o=U(id);return o&&ordCmp(u,o)<0;});if(i<0)i=G.order.length;
  G.order.splice(i,0,u.id);if(i<=G.ti)G.ti++;
}
function makeMon(type,x,y,extra){
  extra=extra||{};const m=MON[type];const f=G.enc.f;
  const mult=m.boss?TUNE.bossHp*(1+.03*f):(m.object?1+.08*f:1+TUNE.hpSlope*f);
  const hp=Math.round(m.hp*mult*(extra.leader?1.6:1)*(extra.elite?1.3:1));
  return {id:'e'+(G.uid++),side:extra.side||'enemy',kind:'mon',type,name:(extra.leader?'Chief ':'')+m.name,x,y,hp,maxHp:hp,speed:m.speed,
    attrs:Object.assign({},m.attrs),steady:m.steady||0,st:{},shield:0,react:true,mp:0,
    undead:!!m.undead,boss:!!m.boss,swarm:!!m.swarm,nimble:!!m.nimble,object:!!m.object,leader:!!extra.leader,pillar:type==='pillar',cd:{}};
}
function spawnMon(type,spot,extra){const e=makeMon(type,spot.x,spot.y,extra);G.units.push(e);if(!e.object)insertOrder(e);H.spawn(e);return e;}
function makePc(h,x,y,side){
  const C=CLASSES[h.cls];const rival=side==='enemy';const mhp=h.maxHp+(!rival&&hasR('heart')?8:0);
  return {id:(rival?'r_':'h_')+h.cls,side,kind:'pc',cls:h.cls,name:rival?C.rival:C.name,x,y,hp:Math.min(h.hp,mhp),maxHp:mhp,speed:C.speed,lvl:h.lvl,
    attrs:attrsFor(h.cls,h.lvl),steady:C.steady||0,nimble:!!C.nimble,mom:TUNE.momStart+(!rival&&hasR('hymn')?2:0),powers:h.powers.slice(),st:{},shield:0,react:true,mp:0,rival};
}

/* ---------------- ENCOUNTERS ---------------- */
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
    const nOb=2+rnd(3),nCov=2+rnd(3);
    for(let i=0;i<nOb;i++){const k=spot(1,5);if(k>=0)tiles[k].ob=pick(th.obs);}
    for(let i=0;i<nCov;i++){const k=spot(1,5);if(k>=0)tiles[k].ob=pick(th.cov);}
    const cluster=(ter,n,y0,y1)=>{let k=spot(y0,y1);if(k<0)return;for(let i=0;i<n&&k>=0;i++){tiles[k].ter=ter;const opts=DIRS.map(([dx,dy])=>({x:KX(k)+dx,y:KY(k)+dy})).filter(t=>inB(t.x,t.y)&&free(K(t.x,t.y)));if(!opts.length)break;const t=pick(opts);k=K(t.x,t.y);}};
    for(let i=0;i<1+rnd(2);i++)cluster('high',2+rnd(2),2,5);
    for(let i=0;i<1+rnd(2);i++)cluster(th.water&&rnd(2)?'water':'rough',2+rnd(3),1,6);
    if(hazOn){const n=th.hazN[0]+rnd(th.hazN[1]-th.hazN[0]+1);for(let i=0;i<n;i++){const h=pick(th.haz);if(h==='lava'){let k=spot(2,5);for(let j=0;j<1+rnd(2)&&k>=0;j++){tiles[k].haz={t:'lava',dur:-1};const o=DIRS.map(([dx,dy])=>({x:KX(k)+dx,y:KY(k)+dy})).filter(t=>inB(t.x,t.y)&&free(K(t.x,t.y)));const q=o.length?pick(o):null;k=q?K(q.x,q.y):-1;}}else{const k=spot(1,6);if(k>=0)tiles[k].haz={t:h,dur:-1};}}}
    const start=[...reserved].map(k=>({x:KX(k),y:KY(k)})).find(p=>p.y>=5)||{x:3,y:7};
    if(connectedTiles(tiles,start))return tiles;
  }
  return Array.from({length:COLS*ROWS},()=>({ob:null,ter:null,haz:null,v:0}));
}
const HERO_POS={
  normal:{fighter:[3,6],rogue:[4,6],cleric:[3,7],wizard:[4,7]},
  center:{fighter:[3,3],rogue:[4,3],cleric:[3,4],wizard:[4,4]},
  wagon:{fighter:[3,5],rogue:[4,6],cleric:[2,6],wizard:[3,7]},
};
function genEncounter(f,type,opt){
  opt=opt||{};
  const act=opt.act!=null?opt.act:Math.min(2,Math.floor(f/4));
  const M=MISSIONS[type];
  const enc={type,f,act,enemies:[],npcs:[],zone:[],chests:[],elite:!!opt.elite,
    title:type==='boss'?MON[BOSSES[act]].name:opt.title||pick(M.titles),
    heroPos:type==='ambush'?'center':type==='defend'?'wagon':'normal'};
  const reserved=new Set();
  const hp=HERO_POS[enc.heroPos];for(const c in hp)reserved.add(K(...hp[c]));
  if(type==='hold')enc.zone=[[3,3],[4,3],[3,4],[4,4]];
  if(type==='rescue'){const x=1+rnd(6);enc.npcs.push({kind:'villager',x,y:3});}
  if(type==='defend')enc.npcs.push({kind:'wagon',x:3,y:6});
  if(type==='ritual')enc.enemies.push({type:'pillar',x:1,y:1},{type:'pillar',x:6,y:1});
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
    let budget=TUNE.budget0+TUNE.budgetSlope*f;
    const mult={hold:.7,survive:.6,defend:.65,rescue:.8,loot:.9,ritual:.75,assassinate:.8,ambush:1.1,breakout:.85,boss:TUNE.bossEscort,rout:1};
    budget*=mult[type]||1;
    if(type==='boss')list.push({type:BOSSES[act],boss:true});
    if(type==='assassinate')list.push({type:LEADERS[act],leader:true});
    if(opt.elite){const t=pick(ELITES[act]);list.push({type:t,elite:true});budget*=.85;}
    const pool=ACT_POOL[act];let g=0;
    while(list.length<10&&g++<80){
      const aff=pool.filter(t=>(SWARM.includes(t)?2:MON[t].cost)<=budget&&!(type==='boss'&&MON[t].cost>=5));
      if(!aff.length)break;
      const t=pick(aff);
      if(SWARM.includes(t)){for(let i=0;i<3&&list.length<10;i++)list.push({type:t});budget-=2;}
      else{list.push({type:t});budget-=MON[t].cost;}
    }
  }
  let spots=[];
  const rowsFor=type==='rescue'?[0,1]:type==='breakout'?[1,2,3]:[0,1,2];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const k=K(x,y);if((reserved.has(k)&&!(y===0&&type!=='breakout'))||blockedK(k))continue;
    if(enc.npcs.some(n=>n.x===x&&n.y===y)||enc.enemies.some(n=>n.x===x&&n.y===y))continue;
    if(type==='ambush'){if((x===0||x===COLS-1||y===0||y===ROWS-1)&&cheb({x,y},{x:3.5,y:3.5})>=2)spots.push({x,y});}
    else if(rowsFor.includes(y))spots.push({x,y});
  }
  shuffle(spots);
  for(const e of list){
    let s;
    if(e.boss||e.leader||e.elite)s=spots.find(t=>t.y===0&&(t.x===3||t.x===4))||spots.find(t=>t.y<=1)||spots[0];
    else s=spots[0];
    if(!s)break;
    spots=spots.filter(t=>t!==s);
    enc.enemies.push(Object.assign({},e,{x:s.x,y:s.y}));
  }
  return enc;
}

/* ---------------- BATTLE LIFECYCLE ---------------- */
function setupBattle(enc,party){
  G={enc,units:[],uid:1,round:1,ti:-1,order:[],extra:[],cur:null,await:false,cmd:0,foeMom:enc.act,hold:0,looted:0,ritual:5,ritualFailed:false,kills:0,
    chests:enc.chests.map(c=>K(c[0],c[1])),walls:{},zones:[],over:false,result:null,phoenixUsed:false,hordeBoon:false,log:[],
    tiles:JSON.parse(JSON.stringify(enc.tiles)),act:enc.act,dmgAdd:Math.floor(enc.f*TUNE.dmgSlope),rollAdd:Math.floor(enc.f/TUNE.rollStep)};
  HIST.length=0;
  const hp=HERO_POS[enc.heroPos];
  for(const h of party)G.units.push(makePc(h,...hp[h.cls],'hero'));
  for(const n of enc.npcs){
    if(n.kind==='villager')G.units.push({id:'npc_v',side:'hero',kind:'npc',npc:'villager',name:'Captive',x:n.x,y:n.y,hp:20+enc.f*2,maxHp:20+enc.f*2,speed:3,attrs:{M:0,F:1,W:0,P:0},st:{},shield:0,caged:true,react:false,mp:0});
    if(n.kind==='wagon')G.units.push({id:'npc_w',side:'hero',kind:'npc',npc:'wagon',name:'Supply Wagon',x:n.x,y:n.y,hp:30+enc.f*4,maxHp:30+enc.f*4,speed:0,attrs:{M:0,F:0,W:0,P:0},st:{},shield:0,object:true,react:false,mp:0});
  }
  for(const e of enc.enemies){
    if(e.pc)G.units.push(makePc({cls:e.pc,lvl:e.lvl,hp:e.hp,maxHp:e.maxHp,powers:e.powers},e.x,e.y,'enemy'));
    else G.units.push(makeMon(e.type,e.x,e.y,{leader:e.leader,elite:e.elite}));
  }
  if(hasR('bulwark'))G.units.filter(u=>u.side==='hero'&&u.kind==='pc').forEach(h=>h.shield=8);
  for(const u of G.units)if(!u.object)u.init=initRoll(u);
  G.order=G.units.filter(u=>!u.object).sort(ordCmp).map(u=>u.id);
  log(`${enc.title}: ${MISSIONS[enc.type].name}.`,'g');
  log('Initiative: '+G.order.map(id=>{const u=U(id);return `${u.name} ${u.init}`;}).join(', ')+'.','g');
  log('— Round 1 —','g');
}
function isPlayer(u){return u.side==='hero'&&(u.kind==='pc'||u.kind==='npc')&&!AUTOPLAY;}
async function beginTurn(u){
  if(G.round>1||u.side!=='hero')u.shield=0;
  u.react=true;u.acted=false;u.moved=false;
  if(u.kind==='pc')u.mom=Math.min(10,u.mom+TUNE.momTurn+(u.side==='hero'&&hasR('map')?1:0));
  await H.turn(u);
  if(u.boss)await villain(u);
  if(!live(u))return;
  if(u.st.bleed){H.pop(u,'Bleeding','bad');NOTE=[];await damage(null,u,u.bleedDmg||3,{});const ex=NOTE;NOTE=null;log(`${u.name} bleeds: ${ex.join(' ')}`,sideCol(u));}
  if(live(u)&&u.st.burn&&!immuneFire(u)){H.pop(u,'Burning','bad');H.sfx('fire');NOTE=[];await damage(null,u,3,{});const ex=NOTE;NOTE=null;log(`${u.name} burns: ${ex.join(' ')}`,sideCol(u));}
  if(live(u)){const h=Tt(u.x,u.y).haz;if(h&&!HAZ[h.t].once){NOTE=[];await applyHazard(u);const ex=NOTE;NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}}
  for(const z of G.zones){if(!live(u)||u.object||z.side===u.side||cheb(u,z)>z.r)continue;
    NOTE=[];await damage(null,u,(z.radiant&&u.undead?2:1)*z.dmg,{radiant:z.radiant});if(live(u)&&z.eff){addSt(u,z.eff,1);note(ST_NAME[z.eff]+'.');}const ex=NOTE;NOTE=null;log(`${u.name} is caught in a zone: ${ex.join(' ')}`,sideCol(u));}
  u.mp=live(u)?effSpeed(u):0;
  await checkEnd();
}
async function endTurn(u){
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
  G.foeMom+=TUNE.foeMomRound+Math.floor(G.round/2);
  const cheap=ACT_POOL[E.act].filter(t=>!SWARM.includes(t)&&MON[t].cost<=3);
  const add=(t,where)=>{const s=edgeSpot(where,'enemy');if(s){spawnMon(t,s);log(`${MON[t].name} arrives.`,'e');}};
  const r=G.round-1;
  if(!CTX.skirmish){
    if(E.type==='hold'&&r%2===0&&r<6)for(let i=0;i<1+E.act;i++)add(pick(cheap),'top');
    if(E.type==='survive'&&r<5)for(let i=0;i<1+(r>=2)+(E.act>=2);i++)add(pick(cheap),'any');
    if(E.type==='defend'&&r<5)for(let i=0;i<1+(E.act>=1);i++)add(pick(cheap),'any');
    if(E.type==='breakout'&&r>=1)add(pick(cheap),'bottom');
    if(G.foeMom>=TUNE.summonAt&&G.units.filter(u=>u.side==='enemy'&&live(u)&&!u.object).length<8&&r>=2&&(G.summons||0)<=E.act){G.summons=(G.summons||0)+1;G.foeMom-=TUNE.summonAt;log('The foes spend momentum to summon reinforcements!','e');for(let i=0;i<3;i++)add(SWARM[E.act],'any');}
  }
  log(`— Round ${G.round} —`,'g');
  await H.banner('round');
}
async function nextTurn(){
  while(G&&!G.over){
    let u=null;
    if(G.extra.length){u=U(G.extra.shift());if(!live(u)||u.caged)continue;}
    else{
      G.ti++;
      if(G.ti>=G.order.length){await roundEnd();if(G.over)return;G.ti=0;}
      u=U(G.order[G.ti]);
      if(!u||!live(u)||u.object||u.caged)continue;
    }
    G.cur=u.id;
    await beginTurn(u);
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
    const u=U(G.order[i]);if(!u||!live(u)||u.object)continue;
    if(u.caged)continue;
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
  if(E.type==='hold'&&G.hold>=3)return 'win';
  if((E.type==='survive'||E.type==='defend')&&G.round>5)return 'win';
  if(E.type==='loot'&&G.chests.length===0)return 'win';
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
