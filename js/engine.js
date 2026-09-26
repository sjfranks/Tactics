'use strict';
/* =====================================================================
   EMBERWATCH — rules engine. No drawing here: the UI hooks in through H.
   ===================================================================== */
const rnd=n=>Math.floor(Math.random()*n);
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
const H={step:_a,strike:_a,area:_a,tele:_a,death:_a,banner:_a,pause:_a,turn:_a,end:_a,pop:_n,result:_n,sfx:_n,upd:_n,spawn:_n,save:_n,combo:_n};
let G=null,CTX={mode:'run',relics:[]};
let AUTOPLAY=false;
const HIST=[];

/* ---------------- DICE ---------------- */
const D3=(()=>{const c=new Array(19).fill(0);for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++)c[a+b+d]++;return c;})();
function resOf(nat,mod){if(nat>=16)return 3;const v=nat+mod;return v<=10?1:v<=14?2:3;}
const _rp={};
function resProbs(mod){if(_rp[mod])return _rp[mod];const p=[0,0,0];for(let s=3;s<=18;s++)p[resOf(s,mod)-1]+=D3[s]/216;return _rp[mod]=p;}
function roll3(mod){const d=[1+rnd(6),1+rnd(6),1+rnd(6)];const nat=d[0]+d[1]+d[2];return {d,nat,mod,total:nat+mod,res:resOf(nat,mod)};}
function rollText(r){return `3d6 (${r.d.join('+')})${r.mod>=0?'+':''}${r.mod} = ${r.total}: ${RESULT[r.res-1]}${r.stag?' (staggered)':r.nat>=16&&r.total<15?' (16+ on the dice)':''}`;}

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
  if(u.st.slow)m=Math.min(m,1);
  if(u.st.stag)m=Math.floor(m/2);
  if(u.st.root)m=0;
  return m;
}
function canReact(f){return live(f)&&!f.object&&!f.caged&&f.kind!=='npc'&&f.react&&!f.st.daze&&!f.st.stag;}
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
  const rs=u.nimble?[]:fighters(u).filter(canReact);
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
    if(voluntary&&!u.nimble){
      const rs=fighters(u).filter(f=>canReact(f)&&!struck.has(f.id)&&man(f,from)===1&&man(f,to)!==1);
      for(const f of rs){
        struck.add(f.id);f.react=false;
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
  let d=f.kind==='pc'?2+Math.max(f.attrs.M,f.attrs.F)+(f.side==='hero'&&hasR('lens')?3:0):f.swarm||f.minion?2:f.tiny?1+alive4(f):TUNE.pbBonus+Math.max(f.attrs.M,f.attrs.F)+G.dmgAdd;
  await H.strike(f,t,{free:true});
  NOTE=[];
  const dealt=await damage(f,t,d,{});
  const ex=NOTE||[];NOTE=null;
  log(`${f.name} lands a parting blow on ${t.name}: ${dealt} damage.${ex.length?' '+ex.join(' '):''}`,sideCol(f));
  if(f.kind==='pc'&&f.cls==='fighter'&&live(t)&&!t.object){t.stopped=true;applyMark(t,f);addMom(f,1);}
}
/* Pushes and pulls throw a creature off balance: once it has been moved (or slammed into something) it is
   staggered. A creature slammed into another creature knocks that one off balance too. */
async function forceMove(t,from,n,pull,src,fl){
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
        const sd=2+(n-i-1);slam=true;H.pop(t,'Slam!','call');H.sfx('slam');if(fl)fl.slam=true;
        const o=foot(t,nx,ny).map(q=>inB(q.x,q.y)?unitAt(q.x,q.y):null).find(q=>q&&q!==t&&!q.object);
        note(`${moved?'Pushed '+moved+', s':'S'}lams ${o?'into '+o.name+' ':''}for ${sd}.`);
        await damage(src,t,sd,{});
        if(o&&live(o)){await damage(src,o,2,{});if(live(o)){stagger(o,src);note(`${o.name} is knocked off balance.`);}}
      }
      break;
    }
    t.x=nx;t.y=ny;moved++;await H.step(t,true);
    await onEnter(t);
  }
  if(moved>0)note(`${pull?'Pulled':'Pushed'} ${moved}.`);
  if((moved>0||slam)&&live(t)){stagger(t,src);note('Staggered.');if(fl&&fl.stagIds&&src&&src.side!==t.side)fl.stagIds.add(t.id);}
  if(moved>0&&src&&src.side!==t.side)xp(src,moved,'control');
  if(slam&&src&&src.side!==t.side)xp(src,2,'control');
}
async function teleport(u,to){await H.tele(u,to);u.x=to.x;u.y=to.y;H.upd(u);await onEnter(u);}

/* ---------------- DAMAGE & CONDITIONS ---------------- */
function addMom(u,n){if(u.kind==='pc'&&live(u))u.mom=Math.min(10,u.mom+n);}
/* Experience: each hero earns it for the deeds of their role (ROLE_XP), tallied per battle in G.xp. */
let HELPER=null;
function xp(u,n,why){
  if(!u||u.kind!=='pc'||u.side!=='hero'||u.rival||!(n>0)||!G.xp)return;
  const w=(ROLE_XP[u.cls]||{})[why]||0;if(!w)return;
  const X=G.xp[u.cls]||(G.xp[u.cls]={total:0,why:{}});X.total+=n*w;X.why[why]=(X.why[why]||0)+n*w;
}
async function damage(src,t,amt,o){
  if(!live(t)||amt<=0||t.caged)return 0;
  let a=amt;
  if(t.tiny&&o.area){a*=2;note('Swarms take double damage from area attacks.');}
  if(t.minion)a=Math.max(a,t.hp);
  if(t.leader&&G.enc.twist==='guards'&&allies(t).some(o=>o!==t&&!o.object&&man(o,t)===1)){a=Math.ceil(a/2);note('A bodyguard takes half the blow.');}
  if(t.shield>0){const s=Math.min(t.shield,a);t.shield-=s;a-=s;}
  const before=t.hp;t.hp-=a;
  const lost=Math.min(before,a);if(lost>0){if(src&&src.side!==t.side)xp(src,lost,'dealt');if(t.side==='hero')xp(t,lost,'taken');}
  H.pop(t,a<amt?`-${a} ⛨`:`-${a}`,o.crit?'crit':'dmg');
  note(`${a} damage${a<amt?` (${amt-a} absorbed)`:''} [${before}→${Math.max(0,t.hp)}].`);
  if(t.kind==='pc'&&t.cls==='fighter'&&a>0)addMom(t,1);
  if(src&&src.kind==='mon'&&mon(src).drain&&a>0&&live(src))heal(src,Math.ceil(a/2));
  if(t.hp<=0)await kill(t,src,o);
  H.upd(t);
  return a;
}
function heal(t,n){if(!live(t)||n<=0||t.object)return 0;const b=t.hp;t.hp=Math.min(t.maxHp,t.hp+n);const g=t.hp-b;if(HELPER&&g>0)xp(HELPER,t===HELPER?g*.3:g,'heal');if(g>0){H.pop(t,'+'+g,'heal');note(`${t.name} heals ${g}.`);}H.upd(t);return g;}
async function kill(t,src,o){
  if(t.side==='hero'&&t.kind==='pc'&&hasR('phoenix')&&!G.phoenixUsed){G.phoenixUsed=true;t.hp=Math.ceil(t.maxHp/2);H.pop(t,'Phoenix!','gold');H.sfx('heal');note(`${t.name} rises from the ashes!`);return;}
  t.dead=true;t.hp=0;t.shield=0;
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
}
function applyMark(t,src){
  if(t.object)return;
  if(!t.st.mark||t.marker!==src.id)xp(src,1,'mark');
  t.st.mark=Math.max(t.st.mark||0,1+(G.cur===t.id&&G.phase!=='heroes'?1:0));t.marker=src.id;
}
function addSt(t,k,v){
  if(!live(t)||t.object)return;
  if(t.boss&&(k==='daze'||k==='root'))return;
  if(k==='burn'&&immuneFire(t))return;
  if(G.cur===t.id&&G.phase!=='heroes')v+=1;
  t.st[k]=Math.max(t.st[k]||0,v);
  H.upd(t);
}
/* Set-ups remember which hero made them, so the hero who cashes one in scores a combo with them. */
const byHero=s=>s&&s.kind==='pc'&&s.side==='hero'?s.id:null;
function stagger(t,src){if(!live(t)||t.object)return;addSt(t,'stag',1);t.stagBy=byHero(src);}
function blessUnit(a,src){if(!live(a)||a.object)return;a.st.bless=Math.max(a.st.bless||0,2);a.blessBy=byHero(src);H.pop(a,'Blessed','gold');H.upd(a);}
const ST_NAME={slow:'slowed',root:'rooted',stag:'staggered',daze:'dazed',weak:'weakened',bleed:'bleeding',burn:'burning',expose:'exposed',mark:'marked',bless:'blessed'};
function applyEff(src,t,eff,res){
  if(!eff||!live(t)||t.object)return;
  for(const k in eff){
    if(k==='push'||k==='pull')continue;
    const v=tv(eff[k],res);if(!v)continue;
    if(k==='mark'){applyMark(t,src);note('Marked.');continue;}
    if(t.boss&&(k==='daze'||k==='root')){note(`${t.name} shrugs off ${ST_NAME[k]}.`);continue;}
    if(k==='burn'&&immuneFire(t))continue;
    if(k==='bleed')t.bleedDmg=src.side==='hero'?3:2+G.act;
    if(k==='stag')stagger(t,src);else addSt(t,k,v);
    if(k==='expose')t.exposeBy=byHero(src);
    note(ST_NAME[k][0].toUpperCase()+ST_NAME[k].slice(1)+'.');if(t.side!==src.side)xp(src,1,'control');
  }
}
function cleanse(t){for(const k of['slow','root','weak','bleed','burn','daze','stag','mark'])delete t.st[k];H.upd(t);}
function decSt(u){for(const k in u.st){u.st[k]--;if(u.st[k]<=0){delete u.st[k];if(k==='mark')u.marker=null;}}}

/* ---------------- ADVANTAGE & DISADVANTAGE ---------------- */
function isMelee(p){return p.tgt==='self'||(p.tgt==='enemy'&&p.range===1)||!!p.reach||(!p.tgt&&p.range===1);}
function netBoon(a,t,p,O){
  O=O||a;const pro=[],con=[];const melee=isMelee(p);
  if(a.st.bless)pro.push('Blessed');
  if(a.hidden)pro.push('Hidden','Hidden');
  if(p.edge)pro.push(p.name);
  if(t.st.root)pro.push('Rooted');else if(t.st.daze)pro.push('Dazed');
  if(melee&&!t.object){
    if(a.kind==='pc'&&a.cls==='rogue'){if(allies(a).some(h=>h!==a&&!h.object&&man(h,t)===1))pro.push('Ally beside');}
    else if(SZ(t)===1&&SZ(a)===1){if(inB(2*t.x-O.x,2*t.y-O.y)){const h=unitAt(2*t.x-O.x,2*t.y-O.y);if(h&&h!==a&&h.side===a.side&&!h.object)pro.push('Flanking');}}
    else{const c=center(t),oc=center({x:O.x,y:O.y,sz:SZ(a)});if(allies(a).some(h=>h!==a&&!h.object&&man(h,t)===1&&(center(h).x-c.x)*(oc.x-c.x)+(center(h).y-c.y)*(oc.y-c.y)<0&&Math.abs(center(h).x-c.x)+Math.abs(oc.x-c.x)+Math.abs(center(h).y-c.y)+Math.abs(oc.y-c.y)>=SZ(t)+1))pro.push('Flanking');}
  }
  if(isHighT(O.x,O.y)&&!isHighT(t.x,t.y))pro.push('High ground');
  if(a.kind==='mon'){
    const m=mon(a);
    if(m.pack&&allies(a).some(o=>o!==a&&!o.object&&man(o,t)===1))pro.push('Pack');
    if(allies(a).some(o=>o!==a&&o.kind==='mon'&&mon(o).aura&&man(o,O)<=2))pro.push('Aura');
  }
  if(a.side==='enemy'&&G.hordeBoon)pro.push('Bloodlust');
  if(a.side==='enemy'&&t.side==='hero'&&hasR('ward')&&!(t.warded||{})[a.id])con.push('Warding Charm');
  if(a.st.weak)con.push('Weakened');
  if(a.st.mark&&a.marker&&a.marker!==t.id&&live(U(a.marker)))con.push('Marked');
  if(!melee){
    if(adjFoe(O,a))con.push('Foe beside you');
    if(p.area==null&&man(O,t)>1&&inCover(O,t))con.push('Cover');
  }
  const net=clamp(Math.min(2,pro.length)-Math.min(2,con.length),-2,2);
  return {net,pro,con};
}
function attackMod(a,attr){let m=(a.attrs&&a.attrs[attr])||0;if(a.kind==='mon')m+=G.rollAdd;if(a.side==='hero'&&a.kind==='pc'&&hasR('dice'))m++;return m;}
const sneakBonus=a=>TUNE.sneak+Math.floor(a.lvl/3);
/* A foe is "set up" when an ally has thrown it off balance, exposed it, pinned it or stands beside it. */
function setUp(a,t){return !t.object&&(!!t.st.stag||!!t.st.expose||!!t.st.root||!!t.st.daze||allies(a).some(h=>h!==a&&!h.object&&man(h,t)===1));}
function sneakOn(a,t){return a.kind==='pc'&&a.cls==='rogue'&&(!!a.hidden||setUp(a,t));}
/* Exposed: every hit against it deals extra damage until the end of its next turn. */
const EXPOSE_DMG=3;
/* The combo bonus heroes add to every hit for the rest of their turn. */
function comboBonus(n){return Math.min(3,n||0);}
/* Damage of a hero-kit power. o.sneak and o.combo override what the current state says (used while a strike
   is resolving, after the set-up it used is gone). */
function pcDmg(a,p,t,res,o){
  o=o||{};
  if(p.noDmg||!p.dmg)return 0;
  let d=p.dmg[res-1]+(a.attrs[p.a]||0)+wBonus(a,p,'dmg');
  if(a.side==='hero'&&hasR('whetstone'))d+=1;
  d+=a.side==='hero'?(G.pcDmgAdd||0):(G.foeDmgAdd||0);
  if(o.sneak!=null?o.sneak:sneakOn(a,t))d+=sneakBonus(a);
  if(t.st.expose)d+=EXPOSE_DMG;
  if(a.side==='hero')d+=comboBonus(o.combo!=null?o.combo:G.phase==='heroes'?G.combo:0);
  if((p.radiant||wBonus(a,p,'radiant'))&&t.undead)d*=2;
  if(p.execute&&t.hp<=t.maxHp/2)d*=2;
  if(t.armor&&res<3)d=Math.max(1,d-t.armor);
  return Math.max(0,d);
}
/* What an attack on a staggered creature becomes: a critical hit (bosses: one step better). */
function stagRes(t,res){return t.boss?Math.min(3,res+1):3;}
function stagProbs(t,probs){return t.boss?[0,probs[0],probs[1]+probs[2]]:[0,0,1];}
/* How many of a tiny swarm's critters are still standing (1-4). */
function alive4(u){return u.tiny?Math.max(1,Math.ceil(u.tiny*u.hp/u.maxHp)):1;}
function monDmg(a,A,t,res){
  const ex=t.st&&t.st.expose?EXPOSE_DMG:0;
  if(A.flat!=null)return Math.max(1,(A.per?A.flat*alive4(a):A.flat)+Math.floor(G.dmgAdd/2))+ex;
  let d=Math.max(1,A.dmg[res-1]+G.dmgAdd);
  if(mon(a).savage&&t.hp<=t.maxHp/2)d+=2;
  return d+ex;
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
    const r=effRange(p.range+(p.range===1?wBonus(u,p,'reach'):wBonus(u,p,'range')),O);
    for(const e of foesOf(u)){const d=man(O,e);if(d<1||d>r)continue;if(d>1&&!los(O,e))continue;if(p.teleportAdj&&!freeAdj(e,u).length)continue;R.push({x:e.x,y:e.y});}
  }else if(p.tgt==='ally'){
    for(const a of allies(u)){
      if(a.object||(a.caged&&!p.heal))continue;
      if(a===u){if(!p.noSelf&&O.x===u.x&&O.y===u.y)R.push({x:u.x,y:u.y});continue;}
      if(p.refresh&&G.phase==='heroes'&&a.side==='hero'&&!a.acted)continue;
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
/* The foes a power would roll against, aimed at T from O (before any pulls it makes). */
function strikeTargets(u,p,T,O){
  if(p.tgt==='enemy'){
    const t=unitAt(T.x,T.y);if(!t)return [];const L=[t];
    if(p.chain){let last=t;const done=new Set([t.id]);for(let i=0;i<p.chain;i++){const nx=foesOf(u).filter(e=>!done.has(e.id)&&man(e,last)<=3).sort((a,b)=>man(a,last)-man(b,last))[0];if(!nx)break;done.add(nx.id);L.push(nx);last=nx;}}
    return L;
  }
  if((p.tgt==='self'||p.tgt==='tile')&&p.area!=null&&p.aff!=='ally'){let L=areaTargets(u,p,p.tgt==='self'?O:T);if(p.adjOnly)L=L.filter(t=>cheb(t,O)===1);return L;}
  return [];
}
/* COMBO: a hero cashes in a set-up another hero made this turn: a foe they staggered or exposed, or their blessing. */
function comboSetters(u,p,list){
  if(u.side!=='hero'||u.kind!=='pc'||G.phase!=='heroes'||p.noDmg||!p.dmg||!list.length)return [];
  const by=new Set();
  for(const t of list){if(t.st.stag&&t.stagBy&&t.stagBy!==u.id)by.add(t.stagBy);if(t.st.expose&&t.exposeBy&&t.exposeBy!==u.id)by.add(t.exposeBy);}
  if(u.st.bless&&u.blessBy&&u.blessBy!==u.id)by.add(u.blessBy);
  return [...by].filter(id=>{const s=U(id);return s&&s.side==='hero';});
}
function forecast(u,p,T,O){
  O=O||u;const rows=[];
  const by=comboSetters(u,p,strikeTargets(u,p,T,O));
  const combo=u.side==='hero'&&G.phase==='heroes'?(G.combo||0)+(by.length?1:0):0;
  rows.by=by;rows.combo=combo;
  const mk=t=>{const nb=netBoon(u,t,p,O);const mod=attackMod(u,p.a)+wBonus(u,p,'acc')+2*nb.net;let probs=resProbs(mod);
    const st=!!t.st.stag&&!p.noDmg&&!!p.dmg&&!t.object;if(st)probs=stagProbs(t,probs);
    return {t,net:nb.net,pro:nb.pro,con:nb.con,mod,probs,stag:st,expose:!!t.st.expose,sneak:sneakOn(u,t)&&!!p.dmg&&!p.noDmg,dmg:[1,2,3].map(r=>pcDmg(u,p,t,r,{combo})*(p.hits||1)),ctrl:!!p.noDmg};};
  if(p.tgt==='enemy'){
    for(const t of strikeTargets(u,p,T,O))rows.push(mk(t));
  }else if(p.tgt==='ally'){
    const a=(T.x===u.x&&T.y===u.y)||(T.x===O.x&&T.y===O.y)?u:unitAt(T.x,T.y);
    if(a)rows.push({t:a,heal:p.heal?healAmt(u,p.heal):0,shield:p.shield||0,refresh:p.refresh});
  }else if(p.tgt==='self'||(p.tgt==='tile'&&p.area!=null)){
    const C=p.tgt==='self'?O:T;
    if(p.area!=null){
      if(p.aff==='ally')for(const a of areaTargets(u,p,C))rows.push({t:a,heal:p.heal?healAmt(u,p.heal):0,shield:p.shield||0,empower:p.empower});
      else for(const t of strikeTargets(u,p,T,O))rows.push(mk(t));
    }
  }
  return rows;
}
function evRow(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+pr*Math.min(hp,r.dmg[i]),0);}
function killP(r){if(!r.dmg)return 0;const hp=r.t.hp+r.t.shield;return r.probs.reduce((s,pr,i)=>s+(r.dmg[i]>=hp?pr:0),0);}
function pushExtra(u,p){return (u.kind==='pc'&&u.cls==='wizard'?1:0)+(u.side==='hero'&&hasR('gauntlet')?1:0)+(p?wBonus(u,p,'push'):0);}

async function pcStrike(u,p,t,C,fl){
  const hits=p.hits||1;
  for(let h=0;h<hits&&live(t);h++){
    const nb=netBoon(u,t,p,u);
    const sn=sneakOn(u,t);
    const r=roll3(attackMod(u,p.a)+wBonus(u,p,'acc')+2*nb.net);
    if(nb.pro.includes('Blessed'))fl.usedBless=true;
    // a staggered creature can't defend itself: the attack is a critical hit (a boss's is one step better)
    if(t.st.stag&&!p.noDmg&&p.dmg&&!t.object){r.res=stagRes(t,r.res);r.stag=true;delete t.st.stag;t.stagBy=null;H.pop(t,'Off balance!','call');}
    const d=pcDmg(u,p,t,r.res,{sneak:sn});
    if(sn&&d>0)fl.sneak=true;
    H.result(t,r);
    NOTE=[];
    if(u.hidden&&h===0){u.hidden=false;}
    if(d>0)await damage(u,t,d,{crit:r.res===3,radiant:p.radiant,area:p.area!=null});
    fl.hitIds.add(t.id);
    if(live(t)){
      if(p.mark){applyMark(t,u);note('Marked.');}
      applyEff(u,t,p.eff,r.res);
      if(fl.stagIds&&t.st.stag&&t.stagBy===u.id)fl.stagIds.add(t.id);
      const w=basicP(p)&&wpnOf(u);
      if(w&&live(t)){
        if(w.burn&&r.res===3)applyEff(u,t,{burn:[0,0,2]},3);
        if(w.bleed&&r.res>=2)applyEff(u,t,{bleed:[0,2,2]},r.res);
        if(w.slow&&r.res>=2)applyEff(u,t,{slow:[0,1,1]},r.res);
      }
      if(w&&w.keen&&r.res===3){addMom(u,1);H.pop(u,'+1 ◆','res');}
      if(w&&w.ward&&r.res>=2)for(const a of allies(u).filter(a=>!a.object&&(a===u||man(a,u)===1))){a.shield+=w.ward;H.pop(a,'⛨ '+w.ward,'shield');if(a!==u)xp(u,w.ward/2,'support');}
      const push=tv(p.eff&&p.eff.push,r.res),pull=tv(p.eff&&p.eff.pull,r.res);
      if(push)await forceMove(t,C,push+pushExtra(u,p),false,u,fl);
      if(pull&&live(t))await forceMove(t,C,pull+pushExtra(u,p),true,u,fl);
    }
    const ex=NOTE||[];NOTE=null;
    const why=(nb.pro.length?' +'+nb.pro.join(', +'):'')+(nb.con.length?' -'+nb.con.join(', -'):'');
    log(`${u.name}: ${p.name} → ${t.name}. ${rollText(r)}${why?' ('+why.trim()+')':''}. ${ex.join(' ')}`,sideCol(u));
  }
}
async function support(u,a,p,fl){
  NOTE=[];
  if(p.heal){const g=heal(a,healAmt(u,p.heal));if(g>0&&a!==u)fl.healedOther=true;}
  if(p.shield){a.shield+=p.shield;H.pop(a,'⛨ '+p.shield,'shield');note(`${a.name} gains ${p.shield} shield.`);if(a!==u){xp(u,p.shield/2,'support');fl.healedOther=true;}}
  if(p.empower){blessUnit(a,u);note(`${a.name} is blessed.`);if(a!==u){xp(u,4,'support');fl.healedOther=true;}}
  if(p.cleanse){cleanse(a);note('Conditions end.');}
  const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));
  H.upd(a);
}
async function usePower(u,p,T){
  HELPER=u;try{await usePower0(u,p,T);}finally{HELPER=null;}
}
/* Bless the ally best placed to use it: nearest to a foe, within r of u. */
function blessNear(u,r,fl){
  const c=allies(u).filter(a=>a!==u&&!a.object&&!a.caged&&a.kind!=='npc'&&man(a,u)<=r);if(!c.length)return;
  const fo=fighters(u);const score=a=>Math.min(9,...fo.map(f=>man(f,a)));c.sort((a,b)=>score(a)-score(b));const a=c[0];
  blessUnit(a,u);log(`${a.name} is blessed.`,sideCol(u));xp(u,4,'support');fl.healedOther=true;
}
/* A combo: +1 momentum for the hero who cashed in the set-up and for each hero who made it, and every hero hit
   for the rest of the turn deals +1 damage per combo so far (up to +3). One per action. */
function comboHit(u,by,fl){
  if(fl.combo)return;fl.combo=true;
  G.combo=(G.combo||0)+1;G.combos=(G.combos||0)+1;
  addMom(u,1);xp(u,1,'combo');
  const names=[];
  for(const id of by){const s=U(id);if(!s||s===u)continue;if(live(s))addMom(s,1);xp(s,1,'setup');names.push(s.name);}
  H.combo(u,G.combo,by);
  log(`Combo ×${G.combo}! ${names.join(' and ')} set it up for ${u.name}: +1 momentum each. Hero hits deal +${comboBonus(G.combo)} damage for the rest of the turn.`,'g');
}
async function usePower0(u,p,T){
  u.mom-=p.cost;
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
    if(p.cleave&&live(u)){const o=fighters(u).find(f=>f!==t&&man(f,u)===1);if(o){await H.strike(u,o,{});NOTE=[];await damage(u,o,u.attrs.M+(hasR('whetstone',u)?1:0),{});const ex=NOTE||[];NOTE=null;log(`Cleave hits ${o.name}: ${ex.join(' ')}`,sideCol(u));}}
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
    if(p.refresh){xp(u,8,'support');if(G.phase==='heroes'&&a.side==='hero'){a.acted=false;a.moved=false;a.waited=false;a.mp=effSpeed(a);}else if(!G.extra.includes(a.id))G.extra.push(a.id);H.pop(a,'Inspired!','gold');H.sfx('holy');log(`${a.name} can move and act again.`,sideCol(u));}
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
    const pre=NOTE||[];NOTE=null;if(pre.length)log(pre.join(' '),sideCol(u));
    let list=areaTargets(u,p,C);
    if(p.adjOnly)list=list.filter(t=>cheb(t,u)===1);
    if(p.noDmg&&!p.eff&&!p.mark)list=[];
    const pushy=p.eff&&p.eff.push;
    list.sort((a,b)=>pushy?man(b,C)-man(a,C):man(a,C)-man(b,C));
    for(const t of list){if(p.aff==='ally')await support(u,t,p,fl);else await pcStrike(u,p,t,C,fl);}
    if(p.allyHeal){NOTE=[];for(const a of allies(u).filter(a=>!a.object&&!a.caged&&cheb(a,C)<=p.area)){const g=heal(a,healAmt(u,p.allyHeal));if(g>0&&a!==u)fl.healedOther=true;}const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
    if(p.zone)G.zones.push({x:C.x,y:C.y,r:p.zone.r!=null?p.zone.r:1,rounds:2,dmg:p.zone.dmg,eff:p.zone.eff,radiant:!!p.zone.radiant,fx:p.fx,side:u.side});
    if(p.igniteCenter){setHaz(C.x,C.y,'fire',3,u.side);log(`Fire takes hold at ${tileName(C.x,C.y)}.`,sideCol(u));}
    if(p.webArea)for(let y=C.y-1;y<=C.y+1;y++)for(let x=C.x-1;x<=C.x+1;x++)if(inB(x,y)&&!unitAt(x,y)&&!Tt(x,y).haz)setHaz(x,y,'web',3,u.side);
  }
  if(p.selfHeal){NOTE=[];heal(u,p.selfHeal);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}
  if(p.markAround)for(const f of fighters(u).filter(e=>cheb(e,u)<=p.markAround))applyMark(f,u);
  if(p.healNear){const w=allies(u).filter(a=>!a.object&&!a.caged&&man(a,u)<=3&&a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(w){NOTE=[];const g=heal(w,p.healNear);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));if(g>0&&w!==u)fl.healedOther=true;}}
  if(p.gainRes)addMom(u,p.gainRes);
  if(p.hide){u.hidden=true;H.pop(u,'Hidden','call');H.sfx('whoosh');}
  if(fl.usedBless){delete u.st.bless;u.blessBy=null;}
  if(u.cls==='rogue'&&fl.sneak){addMom(u,1);H.pop(u,'+1 ◆','res');}
  if(u.cls==='wizard'&&(fl.stagIds.size>=2||fl.slam)){addMom(u,1);H.pop(u,'+1 ◆','res');}
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
  let probs=A.flat!=null?[0,1,0]:resProbs(attackMod(e,A.a)+2*nb.net);
  if(A.flat==null&&t.st.stag)probs=stagProbs(t,probs);
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
function monCanAct(A,e){return (!A.cost||G.foeMom>=A.cost)&&!(A.cd&&(e.cd||{})[A.name]>G.round);}
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
  if(A.cost)G.foeMom-=A.cost;
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
  await H.strike(e,t,{proj:A.range>1&&man(e,t)>1?(A.area?'#ff7a2a':'#ff9a7a'):null,monster:true,act:A});
  const victims=A.area?foesOf(e).filter(o=>cheb(o,t)<=A.area):[t];
  if(A.area)await H.area(t,A.area,/Chill/.test(A.name)?'ice':'fire');
  for(const v of victims){
    if(!live(v))continue;
    const nb=netBoon(e,v,A,e);
    const r=A.flat!=null?null:roll3(attackMod(e,A.a)+2*nb.net);
    if(r&&v.st.stag){r.res=stagRes(v,r.res);r.stag=true;delete v.st.stag;v.stagBy=null;H.pop(v,'Off balance!','call');}
    const res=r?r.res:2;
    if(v.side==='hero'&&hasR('ward')){v.warded=v.warded||{};v.warded[e.id]=1;}
    if(r)H.result(v,r);
    NOTE=[];
    await damage(e,v,monDmg(e,A,v,res),{crit:res===3,area:!!A.area});
    if(live(v)){
      applyEff(e,v,A.eff,res);
      const push=tv(A.eff&&A.eff.push,res),pull=tv(A.eff&&A.eff.pull,res);
      if(push)await forceMove(v,e,push,false,e,null);
      if(pull&&live(v))await forceMove(v,e,pull,true,e,null);
    }
    const ex=NOTE||[];NOTE=null;
    const why=(nb.pro.length?' +'+nb.pro.join(', +'):'')+(nb.con.length?' -'+nb.con.join(', -'):'');
    log(`${e.name}: ${A.name} → ${v.name}. ${r?rollText(r):'Swarm hit'}${why&&r?' ('+why.trim()+')':''}. ${ex.join(' ')}`,'e');
  }
  if(A.hazard){
    if(A.area){for(let y=t.y-A.area;y<=t.y+A.area;y++)for(let x=t.x-A.area;x<=t.x+A.area;x++)if(inB(x,y))setHaz(x,y,A.hazard,3,e.side);}
    else setHaz(t.x,t.y,A.hazard,3,e.side);
  }
}
async function monTurn(e){
  const m=mon(e);
  if(e.object||!live(e))return;
  if(m.summon&&G.round%2===0){const cap=m.summonCap||2,n=Math.min(m.summonN||1,cap-allies(e).filter(f=>f.type===m.summon).length,12-G.units.filter(u=>live(u)&&u.side===e.side).length);
    const spots=freeAdj(e,null).filter(t=>!Tt(t.x,t.y).haz);let made=0;
    for(let i=0;i<n&&spots.length;i++){const s=spots.shift();spawnMon(m.summon,s,{side:e.side});made++;}
    if(made){H.pop(e,m.summonCall||'Rise!','call');log(`${e.name} ${m.summonVerb||'raises'} ${made>1?made+' '+MON[m.summon].plural:'a '+MON[m.summon].name.toLowerCase()}.`,'e');await H.pause(250);}}
  const plan=planMon(e);
  if(!plan.node)return;
  const moved=plan.node.x!==e.x||plan.node.y!==e.y;
  if(moved){await walk(e,pathOf(plan.node),true);if(!live(e))return;afterUnit(e);if(await checkEnd())return;}
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
/* ---- set-ups, as the hero AI sees them: a set-up is worth the extra damage the best hero still to act this turn
   would get by cashing it in, plus the momentum the combo pays. Cached for the length of one planPc call. ---- */
let SETUP_C=null;
function payers(u){return u.side==='hero'&&G.phase==='heroes'?readyHeroes().filter(h=>h!==u&&h.kind==='pc'&&!h.acted):[];}
function payoffGain(h,t,kind){
  let best=0;
  for(const id of h.powers){
    const q=POWERS[id];if(!q.dmg||q.noDmg||q.tgt!=='enemy'||!usable(h,q))continue;
    const rng=q.range+(q.range===1?wBonus(h,q,'reach'):wBonus(h,q,'range'));
    if(man(h,t)>h.mp+rng)continue;
    const pr=resProbs(attackMod(h,q.a)+wBonus(h,q,'acc'));const d=[1,2,3].map(r=>pcDmg(h,q,t,r));
    const exp=pr[0]*d[0]+pr[1]*d[1]+pr[2]*d[2];
    let g=kind==='stag'?(t.boss?pr[0]*(d[1]-d[0])+pr[1]*(d[2]-d[1]):d[2]-exp):kind==='expose'?EXPOSE_DMG*(q.hits||1):(pr[0]*.4+pr[1]*.4)*(d[2]-d[0])*.6;
    if(h.cls==='rogue'&&kind!=='bless'&&!sneakOn(h,t))g+=sneakBonus(h);
    best=Math.max(best,g);
  }
  return best;
}
function setupWorth(u,t,kind){
  const key=u.id+t.id+kind;if(SETUP_C&&key in SETUP_C)return SETUP_C[key];
  const P=payers(u);let v=0;
  if(P.length&&live(t)&&!t.object){
    const g=P.map(h=>payoffGain(h,t,kind));
    v=kind==='expose'?g.reduce((a,b)=>a+b,0):Math.max(0,...g);
    if(v>0)v=v*.85+2;
  }
  if(SETUP_C)SETUP_C[key]=v;
  return v;
}
/* How much the fighter gains by taunting t: it would otherwise go after one of her softer friends. */
function tauntWorth(u,t){
  if(u.kind!=='pc'||u.cls!=='fighter'||(t.st.mark&&t.marker===u.id)||t.object)return 0;
  const rng=t.kind==='mon'?Math.max(1,...mon(t).acts.filter(a=>!a.tgt&&!a.trap).map(a=>a.range)):2;
  return allies(u).some(h=>h!==u&&!h.object&&man(h,t)<=effSpeed(t)+rng)?2:.5;
}
let VP_SETUP=0;
function valuePower(u,p,T,O){
  const rows=forecast(u,p,T,O);let v=0,hits=0;
  const P=payers(u).length>0;const v0=[0];
  const sv=x=>{if(!TUNE.aiCombo)return;v+=x;v0[0]+=x;};
  for(const r of rows){
    if(r.dmg){
      if(r.t.side===u.side)continue;hits++;
      v+=evRow(r)+killP(r)*(r.t.boss?10:r.t.kind==='npc'?25:18)+(r.t.pillar?5:0)+(r.t.leader&&G.enc.type==='assassinate'?evRow(r)*.8+killP(r)*30:0)+(r.t.pillar?evRow(r)*.5:0);
      if(p.eff)v+=Object.keys(p.eff).filter(k=>k!=='push'&&k!=='pull').length*1.2;
      if(p.mark)v+=.5+tauntWorth(u,r.t)*(1-killP(r));
      if(p.eff&&(p.eff.push||p.eff.pull))v+=forcedValue(u,r.t,p.tgt==='enemy'?O:(p.tgt==='self'?O:T),tv(p.eff.push||p.eff.pull,2)+pushExtra(u,p),!!p.eff.pull);
      if(P){
        const alive=1-killP(r),e=p.eff||{};
        const fm=(tv(e.push,2)||tv(e.pull,2))?(tv(e.push,2)||tv(e.pull,2))+pushExtra(u,p)-(r.t.steady||0):0;
        if(fm>0||tv(e.stag,2))sv(alive*setupWorth(u,r.t,'stag')*(rows.length>1?.6:1));
        if(tv(e.expose,2))sv(alive*setupWorth(u,r.t,'expose'));
      }
      if(r.stag)v+=1;
    }else{
      const t=r.t,miss=t.maxHp-t.hp;
      if(r.heal)v+=miss>=4?Math.min(miss,r.heal)*1.1:0;
      if(r.shield)v+=r.shield*(threatened(t)?.5:.05);
      if(r.empower){if(t!==u&&P&&payers(u).includes(t)&&fighters(t).some(f=>man(f,t)<=t.mp+2))sv(4);else v+=1;}
      if(r.refresh&&t.id!==u.id)v+=8;
      if(p.swap&&t.id!==u.id){const ta=threatened(t),tu=threatened(u);v+=(ta&&t.hp<t.maxHp*.5?5:0)+(u.cls==='cleric'&&!tu&&ta?1:0)-(t.kind==='pc'&&t.cls==='wizard'&&!ta?2:0);}
    }
  }
  // Come and Get It and Gravity Well drag foes in, leaving them staggered for the heroes still to act
  if(p.pullFirst||p.pullCenter){const C=p.tgt==='self'?O:T;for(const f of foesOf(u).filter(e=>cheb(e,C)<=p.area&&!e.object&&man(e,C)>0&&(e.steady||0)<(p.pullFirst||p.pullCenter))){hits++;if(P)sv(setupWorth(u,f,'stag')*.7);if(p.pullFirst)v+=tauntWorth(u,f);}}
  if(p.blessNear&&hits){const c=allies(u).filter(a=>a!==u&&!a.object&&!a.caged&&a.kind!=='npc'&&man(a,O)<=p.blessNear);if(c.length){const fo=fighters(u);const sc=a=>Math.min(9,...fo.map(f=>man(f,a)));c.sort((a,b)=>sc(a)-sc(b));if(P&&payers(u).includes(c[0])&&sc(c[0])<=c[0].mp+2)sv(4);else v+=1;}}
  if(p.tgt!=='ally'&&p.aff!=='ally'&&!hits&&!p.revive&&!p.selfHeal)return -99;
  if(p.zone)v+=3*hits;
  if(p.igniteCenter)v+=1;
  if(p.revive)v+=25;
  if(p.selfHeal)v+=Math.min(u.maxHp-u.hp,p.selfHeal)*.8;
  VP_SETUP=v0[0];
  return v-p.cost*.9;
}
function planPc(u,stayOnly){
  const nodes=stayOnly||!canMoveNow(u)?[{x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null}]:[...reach(u,u.mp).values()];
  let best={s:.5,O:null,pi:-1,T:null};
  const foes=fighters(u);
  const taunt=u.side==='enemy'?tauntOf(u):null;
  SETUP_C={};
  try{
    for(let pi=0;pi<u.powers.length;pi++){
      const p=powerOf(u,pi);if(!usable(u,p)||u.acted||p.teleport||p.wall||p.hide)continue;
      const org=(p.tgt==='enemy'||p.tgt==='ally'||p.tgt==='self')&&!u.st.daze?nodes:nodes.filter(n=>n.x===u.x&&n.y===u.y);
      // a rival the fighter has taunted must attack her with any power that can reach her
      const mustT=taunt&&p.tgt==='enemy'&&org.some(O=>targetsFrom(u,p,O).some(q=>covers(taunt,q.x,q.y)));
      for(const O of org){
        let pen=O.prov*8+O.haz*1.5+hazCost(u,O.x,O.y)*1.2-objBonus(u,O);
        const ranged=p.tgt==='enemy'&&p.range>1||p.tgt==='tile'||p.tgt==='ally';
        if(ranged&&foes.some(f=>man(f,O)===1))pen+=2.5;
        let T=targetsFrom(u,p,O);
        if(p.tgt==='tile')T=T.filter(t=>foes.some(f=>cheb(f,t)<=(p.area||0)));
        if(mustT)T=T.filter(q=>covers(taunt,q.x,q.y));
        // the AI may move first and then use a power on itself
        if(p.tgt==='ally'&&!p.noSelf&&(O.x!==u.x||O.y!==u.y))T=T.concat([{x:O.x,y:O.y}]);
        for(const t of T){const s=valuePower(u,p,t,O)-pen;if(s>best.s)best={s,O,pi,T:t,setup:VP_SETUP};}
      }
    }
  }finally{SETUP_C=null;}
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
      for(const n of reach(u,u.mp).values()){const fd=field.has(K(n.x,n.y))?field.get(K(n.x,n.y)):40;const want=ranged?3:1;const s=-Math.abs(fd-want)*2-n.prov*8-n.haz*2-hazCost(u,n.x,n.y)-(ranged&&fd===1?3:0)+objBonus(u,n)*1.5;if(!b||s>b.s)b={s,n};}
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
    case 'horde':{for(let i=0;i<4;i++){const s=edgeSpot('top',b.side);if(s)spawnMon('runner',s,{side:b.side});}G.hordeBoon=true;break;}
    case 'warcry':for(const h of hs.filter(h=>man(h,b)<=3)){addSt(h,'weak',1);applyMark(h,b);}break;
    case 'laststand':heal(b,24);G.foeMom+=3;break;
    case 'raise':{for(let i=0;i<4;i++){const s=edgeSpot('any',b.side);if(s)spawnMon('bones',s,{side:b.side});}break;}
    case 'siphon':{let tot=0;for(const h of hs.filter(h=>man(h,b)<=4)){tot+=await damage(b,h,4,{});}heal(b,tot);break;}
    case 'nova':for(const h of hs){await damage(b,h,5,{});}break;
    case 'presence':for(const h of hs)addSt(h,'weak',1);G.foeMom+=4;break;
    case 'buffet':for(const h of hs.filter(h=>cheb(h,b)<=2)){await damage(b,h,5,{});await forceMove(h,b,2,false,b,null);stagger(h,b);}break;
    case 'inferno':{
      const rows={};for(const h of hs)rows[h.y]=(rows[h.y]||0)+1;
      const y=+Object.keys(rows).sort((a,c)=>rows[c]-rows[a])[0];
      await H.area({x:(COLS-1)/2,y},0,'row');
      for(const h of hs.filter(h=>h.y===y))await damage(b,h,8,{});
      for(const h of hs.filter(h=>Math.abs(h.y-y)===1))await damage(b,h,4,{});
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
function threatList(E){
  const d=E.f+(E.elite?2:0)+(E.type==='boss'?3:0);const L=['bloodlust'];
  if(d>=2)L.push('hazard');if(d>=4)L.push('reinforce');if(d>=8)L.push('rite');return L;
}
function threatName(id){const T=THREATS[id];return T.names?T.names[G.act]:T.name;}
function nextThreat(){const L=threatList(G.enc);return L[(G.threatN||0)%L.length];}
async function fireThreat(id){
  const T=THREATS[id];log(`The foes spend ◆${T.cost}: ${threatName(id)}! ${T.desc}`,'e');H.sfx('villain');
  await H.banner('threat',null,{name:threatName(id),desc:T.desc});
  const hs=fighters({side:'enemy'});
  if(id==='bloodlust')G.hordeBoon=true;
  else if(id==='hazard'){const t=['fire','acid','fire'][G.act];const n=Math.min(hs.length,1+G.act);for(const h of shuffle(hs.slice()).slice(0,n)){for(const f of foot(h,h.x,h.y))setHaz(f.x,f.y,t,3,'enemy');H.pop(h,threatName(id)+'!','bad');}}
  else if(id==='reinforce'){for(let i=0;i<3+G.act;i++){if(G.units.filter(u=>live(u)&&u.side==='enemy').length>=12)break;const s=edgeSpot('any','enemy');if(s)spawnMon(SWARM[G.act],s);}}
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
function initRoll(u){return 1+rnd(20)+(u.attrs.F||0);}
function ordCmp(a,b){return b.init-a.init||((a.side==='hero'?0:1)-(b.side==='hero'?0:1))||((b.attrs.F||0)-(a.attrs.F||0));}
function insertOrder(u){
  u.init=initRoll(u);if(u.side==='hero')return;
  let i=G.order.findIndex(id=>{const o=U(id);return o&&ordCmp(u,o)<0;});if(i<0)i=G.order.length;
  G.order.splice(i,0,u.id);if(i<=G.ti)G.ti++;
}
function makeMon(type,x,y,extra){
  extra=extra||{};const m=MON[type];const f=G.enc.f;
  const mult=(m.boss?TUNE.bossHp*(1+.03*f):(m.object?1+.08*f:1+TUNE.hpSlope*f))*(m.object?1:G.foeHp||1);
  const hp=m.minion?1:Math.round(m.hp*(m.tiny||1)*mult*(extra.leader?1.3:1)*(extra.elite?1.3:1));
  return {id:'e'+(G.uid++),side:extra.side||'enemy',kind:'mon',type,name:(extra.leader?'Chief ':'')+m.name,x,y,hp,maxHp:hp,speed:m.speed,
    attrs:Object.assign({},m.attrs),steady:m.steady||0,armor:m.armor||0,st:{},shield:0,react:true,mp:0,
    undead:!!m.undead,boss:!!m.boss,swarm:!!m.swarm,minion:!!m.minion,tiny:m.tiny||0,sz:m.sz||1,nimble:!!m.nimble,object:!!m.object,leader:!!extra.leader,pillar:type==='pillar',cd:{}};
}
function spawnMon(type,spot,extra){const e=makeMon(type,spot.x,spot.y,extra);G.units.push(e);if(!e.object)insertOrder(e);H.spawn(e);return e;}
/* Weapons power up basic powers: the at-wills that cost no momentum. */
const basicP=p=>!!p&&p.cost===0&&!!p.dmg;
function wpnOf(u){return u&&u.kind==='pc'&&u.wpn?WEAPONS[u.wpn]:null;}
function wBonus(u,p,k){const w=wpnOf(u);return w&&basicP(p)?(w[k]||0):0;}
function rivalWeapon(cls,lvl){const t=Math.min(4,1+Math.floor((lvl+1)/3));const L=Object.values(WEAPONS).filter(w=>w.cls===cls&&w.tier<=t).sort((a,b)=>b.tier-a.tier);return (L[0]||WEAPONS[START_WEAPON[cls]]).id;}
function makePc(h,x,y,side){
  const C=CLASSES[h.cls];const rival=side==='enemy';const mhp=h.maxHp+(!rival&&hasR('heart')?8:0);
  return {id:(rival?'r_':'h_')+h.cls,side,kind:'pc',cls:h.cls,name:rival?C.rival:C.name,x,y,hp:Math.min(h.hp,mhp),maxHp:mhp,speed:C.speed,lvl:h.lvl,
    wpn:h.weapon||(rival?rivalWeapon(h.cls,h.lvl):START_WEAPON[h.cls]),attrs:attrsFor(h.cls,h.lvl),steady:C.steady||0,nimble:!!C.nimble,mom:TUNE.momStart+(!rival&&hasR('hymn')?2:0),powers:h.powers.slice(),st:{},shield:0,react:true,mp:0,rival};
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
  const enc={type,f,act,enemies:[],npcs:[],zone:[],chests:[],elite:!!opt.elite,twist:tw?tw.id:null,
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
    let budget=TUNE.budget0+TUNE.budgetSlope*f;
    const mult={hold:.7,survive:.6,defend:.65,rescue:.8,loot:.9,ritual:.75,assassinate:.8,ambush:1.1,breakout:.85,boss:TUNE.bossEscort,rout:1};
    budget*=(mult[type]||1)*((TUNE.actMul||[1,1,1])[act]||1);
    if(type==='boss')list.push({type:BOSSES[act],boss:true});
    if(type==='assassinate')list.push({type:LEADERS[act],leader:true});
    if(opt.elite){const t=pick(ELITES[act]);list.push({type:t,elite:true});budget*=.85;}
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
  G={enc,units:[],uid:1,round:1,ti:-1,order:[],extra:[],cur:null,await:false,cmd:0,foeMom:enc.act,hold:0,looted:0,ritual:5,ritualFailed:false,kills:0,xp:{},
    chests:enc.chests.map(c=>K(c[0],c[1])),walls:{},zones:[],over:false,result:null,phoenixUsed:false,hordeBoon:false,log:[],
    tiles:JSON.parse(JSON.stringify(enc.tiles)),act:enc.act,dmgAdd:Math.floor(enc.f*TUNE.dmgSlope),rollAdd:Math.floor(enc.f/TUNE.rollStep)};
  G.threatN=0;G.threat=nextThreat();
  // skirmish difficulty adjusters
  const MD=enc.mods||{};G.foeHp=MD.foeHp||1;G.dmgAdd+=MD.foeDmg||0;G.pcDmgAdd=MD.partyDmg||0;G.foeDmgAdd=MD.foeDmg||0;
  HIST.length=0;
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
  for(const u of G.units)if(!u.object)u.init=initRoll(u);
  G.order=G.units.filter(u=>!u.object&&u.side!=='hero').sort(ordCmp).map(u=>u.id);
  G.phase='heroes';G.phaseOn=false;G.ti=-1;G.combo=0;
  if(enc.twist==='ring')ringFire();
  log(`${enc.title}: ${MISSIONS[enc.type].name}.`,'g');
  if(G.order.length)log('Foes act in order: '+G.order.map(id=>{const u=U(id);return `${u.name} ${u.init}`;}).join(', ')+'.','g');
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
  if(u.st.bleed){H.pop(u,'Bleeding','bad');NOTE=[];await damage(null,u,u.bleedDmg||3,{});const ex=NOTE||[];NOTE=null;log(`${u.name} bleeds: ${ex.join(' ')}`,sideCol(u));}
  if(live(u)&&u.st.burn&&!immuneFire(u)){H.pop(u,'Burning','bad');H.sfx('fire');NOTE=[];await damage(null,u,3,{});const ex=NOTE||[];NOTE=null;log(`${u.name} burns: ${ex.join(' ')}`,sideCol(u));}
  for(const z of G.zones){if(!live(u)||u.object||z.side===u.side||cheb(u,z)>z.r)continue;
    NOTE=[];await damage(null,u,(z.radiant&&u.undead?2:1)*z.dmg,{radiant:z.radiant});if(live(u)&&z.eff){addSt(u,z.eff,1);note(ST_NAME[z.eff]+'.');}const ex=NOTE||[];NOTE=null;log(`${u.name} is caught in a zone: ${ex.join(' ')}`,sideCol(u));}
  u.mp=live(u)?effSpeed(u):0;
  await checkEnd();
}
async function endTurn(u){
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
  G.foeMom+=TUNE.foeMomRound+Math.floor(G.round/2);
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
  log(`— Round ${G.round} —`,'g');
}
/* ---------------- ROUNDS: your turn (every hero, in any order), then the foes' turn ---------------- */
function heroSide(){return G.units.filter(u=>u.side==='hero'&&live(u)&&!u.object&&!u.caged&&(u.kind==='pc'||u.kind==='npc'));}
function ready(u){return !!u&&u.side==='hero'&&live(u)&&!u.caged&&!u.object&&!u.waited&&!turnDone(u);}
function readyHeroes(){return heroSide().filter(ready);}
async function startHeroPhase(){
  G.phase='heroes';G.phaseOn=true;G.combo=0;
  for(const u of heroSide()){
    if(G.round>1)u.shield=0;
    u.react=true;u.acted=false;u.moved=false;u.waited=false;
    if(u.kind==='pc')u.mom=Math.min(10,u.mom+TUNE.momTurn+(hasR('map')?1:0));
  }
  await H.banner('round');
  for(const u of heroSide()){
    if(u.st.bleed){H.pop(u,'Bleeding','bad');NOTE=[];await damage(null,u,u.bleedDmg||3,{});const ex=NOTE||[];NOTE=null;log(`${u.name} bleeds: ${ex.join(' ')}`,sideCol(u));}
    if(live(u)&&u.st.burn&&!immuneFire(u)){H.pop(u,'Burning','bad');H.sfx('fire');NOTE=[];await damage(null,u,3,{});const ex=NOTE||[];NOTE=null;log(`${u.name} burns: ${ex.join(' ')}`,sideCol(u));}
    for(const z of G.zones){if(!live(u)||z.side===u.side||cheb(u,z)>z.r)continue;
      NOTE=[];await damage(null,u,z.dmg,{});if(live(u)&&z.eff){addSt(u,z.eff,1);note(ST_NAME[z.eff]+'.');}const ex=NOTE||[];NOTE=null;log(`${u.name} is caught in a zone: ${ex.join(' ')}`,sideCol(u));}
    if(G.over)return;
  }
  for(const u of heroSide())u.mp=effSpeed(u)+(G.round===1&&hasR('hourglass')&&u.kind==='pc'&&effSpeed(u)>0?2:0);
  await checkEnd();
}
/* End of your turn: the heroes' conditions tick down, then any hero standing in a hazard suffers it. */
async function endHeroPhase(){
  for(const u of G.units)if(u.side==='hero'&&live(u))decSt(u);
  for(const u of heroSide()){const h=Tt(u.x,u.y).haz;if(h&&!HAZ[h.t].once&&live(u)){NOTE=[];await applyHazard(u);const ex=NOTE||[];NOTE=null;if(ex.length)log(ex.join(' '),sideCol(u));}}
  G.phase='foes';G.phaseOn=false;G.cur=null;G.await=false;G.ti=-1;G.combo=0;
  if(await checkEnd())return;
  await H.banner('foes');
}
/* Picks a hero to act: the one whose best move is worth most (setups count the payoff they enable). */
async function autoHeroPhase(){
  for(let guard=0;guard<16&&!G.over;guard++){
    const R=readyHeroes();if(!R.length)return;
    let best=null;
    for(const u of R){const P=u.kind==='npc'?{s:-5,setup:0}:planPc(u);const s=P.s+(P.setup||0)*TUNE.aiSetup;if(!best||s>best.s)best={u,s};}
    const u=best.u;G.cur=u.id;await H.turn(u);
    await pcTurn(u);
    if(G.over)return;
    u.waited=true;
    await checkEnd();
  }
}
function selectHero(u){if(!G||!G.await||G.phase!=='heroes'||!ready(u))return false;G.cur=u.id;H.turn(u);return true;}
async function nextTurn(){
  while(G&&!G.over){
    if(G.phase==='heroes'){
      if(!G.phaseOn){await startHeroPhase();if(G.over)return;}
      if(AUTOPLAY){await autoHeroPhase();if(G.over)return;await endHeroPhase();continue;}
      const R=readyHeroes();
      if(R.length){if(!R.some(u=>u.id===G.cur))G.cur=R[0].id;G.await=true;pushSnap();H.upd();H.save();await H.turn(U(G.cur));return;}
      await endHeroPhase();continue;
    }
    let u=null;
    if(G.extra.length){u=U(G.extra.shift());if(!live(u)||u.caged)continue;}
    else{
      G.ti++;
      if(G.ti>=G.order.length){await roundEnd();if(G.over)return;G.phase='heroes';G.phaseOn=false;G.ti=-1;continue;}
      u=U(G.order[G.ti]);
      if(!u||!live(u)||u.object||u.caged||u.side==='hero')continue;
    }
    G.cur=u.id;
    await beginTurn(u);
    if(G.over)return;
    if(!live(u)){G.cur=null;continue;}
    G.await=false;
    try{await (u.kind==='mon'?monTurn(u):pcTurn(u));}catch(e){console.error(e);}
    if(G.over)return;
    await endTurn(u);
    if(G.over)return;
    await H.pause(80);
  }
}
/* END TURN: every hero is finished for this round; the foes take their turn. */
async function playerEndTurn(){
  if(!G||!G.await||G.over)return;
  G.await=false;
  await endHeroPhase();
  if(!G.over)await nextTurn();
}
/* Who acts next: during your turn the heroes (ready or done), then the foes in order; then next round. */
function upcoming(n){
  const out=[];if(!G)return out;
  const foesFrom=(i,round)=>{for(let j=i;j<G.order.length&&out.length<n;j++){const u=U(G.order[j]);if(u&&live(u)&&!u.object&&!u.caged&&u.side!=='hero')out.push({u,round,now:G.phase==='foes'&&G.cur===u.id});}};
  if(G.phase==='heroes'){for(const u of heroSide())out.push({u,round:G.round,hero:true,done:!ready(u),now:G.cur===u.id});foesFrom(0,G.round);}
  else foesFrom(Math.max(0,G.ti),G.round);
  if(out.length<n){for(const u of heroSide())if(out.length<n)out.push({u,round:G.round+1,hero:true});foesFrom(0,G.round+1);}
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
