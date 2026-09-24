'use strict';
/* =====================================================================
   EMBERWATCH — battle screen
   ===================================================================== */
const BX=96,BY=15,TS=16;
const B={pi:0,pend:null,inspect:null,drag:null,busy:false,page:0,terr:null,terrKey:'',gRef:null,banner:null,toast:null,vkey:'',V:null,dragTile:null,onEnd:null};
const VIS={};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------------- info text helpers (shared with compendium) ---------------- */
const EFF_NAME={push:'push',pull:'pull',slow:'slowed',root:'rooted',prone:'prone',daze:'dazed',weak:'weakened',bleed:'bleeding',burn:'burning',expose:'exposed',mark:'marked'};
function effText(eff){
  if(!eff)return '';const parts=[];
  for(const k in eff){
    const v=eff[k];const nz=v.findIndex(x=>x>0);if(nz<0)continue;
    const mv=k==='push'||k==='pull';
    const amt=mv?' '+(v[nz]===v[2]?v[2]:v.slice(nz).join('/')):'';
    parts.push((nz===0?'':nz===1?'Solid: ':'Crushing: ')+EFF_NAME[k]+amt);
  }
  return parts.length?parts.join('. ')+'.':'';
}
function dmgLine(dmg,bonus){return dmg.map(d=>d+bonus).join('/');}
function powerText(p,u){
  const ab=u?u.attrs[p.a]:null;
  const bits=[];
  bits.push(p.tgt==='self'?(p.area!=null?(p.area>=99?'Every ally':`Area ${p.area*2+1}x${p.area*2+1} around you`):'Self'):p.tgt==='tile'?`Range ${p.range}`+(p.area!=null?`, ${p.area*2+1}x${p.area*2+1} area`:''):p.tgt==='ally'?`Ally within ${p.range}`:p.range===1?'Melee':`Range ${p.range}`);
  bits.push(ATTR[p.a]);
  bits.push(p.cost?`${p.cost} momentum`:'No cost');
  let s=bits.join(' · ')+(p.free?' · free action':'')+'.\n';
  if(p.dmg&&!p.noDmg)s+=`Damage {w:${dmgLine(p.dmg,ab!=null?ab+(u.side==='hero'&&hasR('whetstone')?1:0):0)}}${ab==null?' + '+ATTR[p.a]:''}${p.hits>1?` x${p.hits}`:''}${p.radiant?' radiant':''}. `;
  if(p.heal)s+=`Heals {h:${p.heal}${u&&u.cls==='cleric'?'+'+u.attrs.P:''}}. `;
  s+=p.desc;
  const et=effText(p.eff);if(et&&!/Solid|Crushing/.test(p.desc))s+=' '+et;
  return s;
}
function monActText(A){
  if(A.tgt==='ally')return `{g:${A.name}}: heal an ally within ${A.range} for ${A.heal}.`;
  if(A.rally)return `{g:${A.name}} (${A.cost} momentum): allies beside heroes strike at once.`;
  if(A.mom)return `{g:${A.name}}: takes 3 damage to give the foes ${A.mom} momentum.`;
  if(A.trap)return `{g:${A.name}}: ${A.trap==='trap'?'hide a snare':'set fire'} on a square within ${A.range}. Every ${A.cd} rounds.`;
  const rng=A.range===1?'melee':`range ${A.range}`;
  const dm=A.flat!=null?`${A.flat} damage, never rolls`:`${A.dmg.join('/')} damage`;
  return `{g:${A.name}} (${A.a?ATTR[A.a]+', ':''}${rng}${A.area?`, ${A.area*2+1}x${A.area*2+1} area`:''}${A.cost?`, ${A.cost} momentum`:''}): ${dm}. ${effText(A.eff)}${A.hazard?` Leaves ${A.hazard==='web'?'web':A.hazard}.`:''}`;
}
function monBlock(m){
  let s=`{m:${m.role}${m.undead?', undead':''}}\nHealth ${m.hp} · Speed ${m.speed}${m.steady?` · Steadfast ${m.steady}`:''}${m.nimble?' · Nimble':''}\nMight ${m.attrs.M} · Finesse ${m.attrs.F} · Wits ${m.attrs.W} · Presence ${m.attrs.P}\n`;
  for(const A of m.acts)s+=monActText(A)+'\n';
  if(m.note)s+=m.note+'\n';
  if(m.fireproof&&m.id!=='dragon')s+='Immune to fire and burning.\n';
  if(m.va)s+='Boss surges: '+m.va.map(v=>`{r:${VA[v].name}} (${VA[v].desc})`).join(' ');
  return s;
}
function attrLine(a){return `Might ${a.M} · Finesse ${a.F} · Wits ${a.W} · Presence ${a.P}`;}
function condText(u){
  const k=Object.keys(u.st).map(s=>ST_NAME[s]);if(u.hidden)k.push('hidden');
  let s=k.length?'Conditions: '+k.join(', ')+'. ':'';
  if(u.shield>0)s+=`Shield ${u.shield}. `;
  return s;
}
function unitBody(u,full){
  let s='';
  if(u.kind==='pc'){
    s+=attrLine(u.attrs)+'\n';
    s+=`{p:◆} Momentum ${u.mom}/10 · Speed ${effSpeed(u)}\n`;
    if(G&&G.cur===u.id)s+=`Move {${u.mp>0?'h':'m'}:${u.mp} left} · Action ${u.acted?'{m:used}':'{h:ready}'}\n`;
    s+=condText(u);
    if(u.st.mark&&u.marker&&U(u.marker))s+=`(by ${U(u.marker).name}) `;
    if(full){s+='Skills: '+Object.keys(SKILLS).map(k=>{const t=CLASSES[u.cls].skills.includes(k);const v=u.attrs[SKILLS[k]]+(t?2:0);return (t?'{g:'+k+'}':k)+' '+(v>=0?'+':'')+v;}).join(', ')+'\n\n'+CLASSES[u.cls].trait+'\n';for(const id of u.powers)s+='\n'+'{g:'+POWERS[id].name+'}: '+powerText(POWERS[id],u)+'\n';}
    else if(G&&G.cur===u.id&&u.powers.length){const p=powerOf(u,B.pi);if(p)s+='\n{g:'+p.name+'}\n'+powerText(p,u);}
  }else if(u.kind==='mon'){
    const m=mon(u);
    s+=condText(u);if(s)s+='\n';
    s+=monBlock(Object.assign({},m,{hp:u.maxHp}));
  }else{
    s+=u.caged?'Caged. A hero must stand beside the cage to free them.':u.npc==='wagon'?'Keep it standing.':'Lead them to the bottom edge. Foes will hunt them.';
  }
  return s;
}
function unitSub(u){return u.kind==='pc'?`Lv ${u.lvl} ${CLASSES[u.cls].title}${u.rival?' (rival)':''}`:u.kind==='mon'?mon(u).role+(u.leader?' · chief':''):'Ally';}

/* ---------------- engine hooks ---------------- */
function vis(u){return VIS[u.id]||(VIS[u.id]={});}
function uPos(u){
  const v=vis(u);let x=u.x*TS,y=u.y*TS;
  if(v.anim){const p=(NOW-v.anim.t0)/v.anim.dur;if(p>=1)v.anim=null;else{x=v.anim.fx+(v.anim.tx-v.anim.fx)*p;y=v.anim.fy+(v.anim.ty-v.anim.fy)*p;}}
  if(!v.anim)v.last={x:u.x*TS,y:u.y*TS};
  if(v.off){const p=(NOW-v.off.t0)/v.off.dur;if(p>=1)v.off=null;else{const k=p<.5?p*2:(1-p)*2;x+=v.off.dx*k;y+=v.off.dy*k;}}
  return {x:Math.round(x),y:Math.round(y)};
}
H.step=async(u,forced)=>{const v=vis(u);const cur=v.last||{x:u.x*TS,y:u.y*TS};const d=(forced?90:120)*spd();v.anim={fx:cur.x,fy:cur.y,tx:u.x*TS,ty:u.y*TS,t0:NOW,dur:d};v.last={x:u.x*TS,y:u.y*TS};sfx('step');await sleep(forced?90:120);};
H.strike=async(a,t,o)=>{
  o=o||{};
  if(o.support){sfx('holy');await sleep(200);return;}
  if(o.proj){sfx(o.power&&o.power.fx==='fire'?'fire':'spell');await projectile(a,t,o.proj);}
  else{sfx('swing');const v=vis(a);v.off={dx:(t.x-a.x)*6,dy:(t.y-a.y)*6,t0:NOW,dur:180*spd()};await sleep(120);}
  if(t.id&&t.id!=='tile')vis(t).flash=NOW+120*spd();
};
H.area=async(C,r,kind)=>{areaFlash(C,r,kind);sfx(kind==='fire'?'fire':kind==='ice'||kind==='web'?'ice':kind==='holy'?'holy':'spell');await sleep(300);};
H.tele=async(u)=>{const v=vis(u);v.fade={t0:NOW,dur:160*spd(),out:true};sfx('whoosh');await sleep(170);v.fade={t0:NOW,dur:160*spd(),out:false};v.last={x:u.x*TS,y:u.y*TS};await sleep(120);};
H.death=async(u)=>{const v=vis(u);v.dying={t0:NOW,dur:380*spd()};await sleep(260);};
H.pause=ms=>sleep(ms);
H.pop=(u,txt,cls)=>popup(u,txt,cls);
H.result=(t,r)=>{popup(t,RESULT[r.res-1]+' '+r.total,'res'+r.res);sfx(r.res===3?'crit':'hit');};
H.sfx=n=>sfx(n);
H.upd=()=>{};
H.spawn=u=>{const v=vis(u);v.dying=null;v.fade={t0:NOW,dur:250*spd(),out:false};v.last={x:u.x*TS,y:u.y*TS};};
H.save=()=>{if(typeof saveGame==='function')saveGame();};
H.turn=async u=>{
  const v=vis(u);v.last={x:u.x*TS,y:u.y*TS};
  B.pend=null;B.inspect=null;
  if(isPlayer(u)){B.pi=defaultPower(u);B.page=Math.floor(B.pi/8);sfx('turn');B.toast={t0:NOW,dur:900,text:`${u.name}'s turn`,col:C.blue};}
  else{B.toast={t0:NOW,dur:700,text:`${u.name}`,col:u.side==='enemy'?C.red:C.blue};await sleep(260);}
};
H.banner=async(kind,b,va)=>{
  if(kind==='round'){sfx('round');B.banner={t0:NOW,dur:900*spd(),title:'ROUND '+G.round,sub:''};await sleep(700);}
  else if(kind==='villain'){B.banner={t0:NOW,dur:1900*spd(),title:va.name,sub:va.desc,unit:b,villain:true};await sleep(1700);}
};
H.end=async o=>{await sleep(500);sfx(o==='win'?'victory':'defeat');if(B.onEnd)B.onEnd(o);};
function defaultPower(u){if(!u.powers||!u.powers.length)return 0;const i=u.powers.findIndex(id=>usable(u,POWERS[id])&&POWERS[id].tgt!=='self');return Math.max(0,i);}

function popup(u,txt,cls){
  const n=FX.filter(f=>f.pop&&f.uid===u.id&&NOW-f.t0<500).length;
  const col={dmg:C.white,crit:C.gold,heal:C.green,shield:C.blue,gold:C.gold,call:C.parch,res:C.mom,bad:C.red,res1:'#b0a898',res2:C.white,res3:C.gold}[cls]||C.white;
  const x=BX+u.x*TS+8,y=BY+u.y*TS-2-n*7;
  fx({pop:true,uid:u.id,dur:1000,draw(p){text(txt,x,y-Math.round(p*10),col,{al:'c',ol:C.edge});}});
}
async function projectile(a,t,col){
  const x1=BX+a.x*TS+8,y1=BY+a.y*TS+7,x2=BX+t.x*TS+8,y2=BY+t.y*TS+7;
  const dur=Math.min(320,90+Math.hypot(x2-x1,y2-y1)*3);
  await new Promise(res=>fx({dur,done:res,draw(p){const x=x1+(x2-x1)*p,y=y1+(y2-y1)*p;for(let i=0;i<4;i++){const q=Math.max(0,p-i*.05);rect(x1+(x2-x1)*q-1,y1+(y2-y1)*q-1,3-(i>1?1:0),3-(i>1?1:0),i?col+'88':C.white);}rect(x-1,y-1,3,3,col);}}));
}
function areaFlash(C0,r,kind){
  const col={fire:'#ff8a20',force:'#b48aff',arcane:'#b48aff',holy:'#ffe890',ice:'#a8e8ff',web:'#e8f0f0',poison:'#9ae050',row:'#ff6a20'}[kind]||'#ffffff';
  fx({dur:500,draw(p){ctx.globalAlpha=(1-p)*.6;if(kind==='row')rect(BX,BY+C0.y*TS,COLS*TS,TS,col);else{const rr=Math.min(r,7);rect(BX+(C0.x-rr)*TS,BY+(C0.y-rr)*TS,(2*rr+1)*TS,(2*rr+1)*TS,col);}ctx.globalAlpha=1;}});
}

/* ---------------- terrain ---------------- */
const GROUND=[
  {base:['#4a6428','#52702e','#44602a','#5a7834'],spot:['#6a8a3a','#3a5020','#7a6a3a'],grid:'#2c3a18'},
  {base:['#3a4034','#40473a','#353b30','#474e40'],spot:['#565e48','#2c3228','#5a5a4a'],grid:'#22281e'},
  {base:['#3a2c26','#42322a','#342620','#4a372e'],spot:['#5a4a42','#2a1e1a','#6a3a1a'],grid:'#1e1410'},
];
function buildTerrain(){
  const c=document.createElement('canvas');c.width=COLS*TS;c.height=ROWS*TS;const g=c.getContext('2d');
  const act=G.act,P=GROUND[act];const r=mulberry(G.enc.f*991+act*7+(G.enc.title||'').length*13);
  const px=(x,y,col)=>{g.fillStyle=col;g.fillRect(x,y,1,1);};
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    const X=tx*TS,Y=ty*TS,t=G.tiles[K(tx,ty)];
    g.fillStyle=P.base[(tx+ty)%2?1:0];g.fillRect(X,Y,TS,TS);
    for(let i=0;i<26;i++)px(X+Math.floor(r()*TS),Y+Math.floor(r()*TS),P.base[Math.floor(r()*4)]);
    for(let i=0;i<5;i++)px(X+Math.floor(r()*TS),Y+Math.floor(r()*TS),P.spot[Math.floor(r()*P.spot.length)]);
    if(act===0)for(let i=0;i<4;i++){const x=X+1+Math.floor(r()*14),y=Y+2+Math.floor(r()*12);px(x,y,'#7a9a44');px(x,y-1,'#8aaa50');}
    if(act===2&&r()<.35){let x=X+Math.floor(r()*16),y=Y+Math.floor(r()*16);for(let i=0;i<6;i++){px(x,y,'#8a2a0a');x+=Math.round(r()*2-1);y+=Math.round(r()*2-1);}}
    if(t.ter==='high'){
      g.fillStyle=act===0?'#6e8a44':act===1?'#5a6250':'#5e4a3e';g.fillRect(X,Y,TS,TS);
      for(let i=0;i<14;i++)px(X+Math.floor(r()*TS),Y+Math.floor(r()*TS),act===0?'#7e9a50':act===1?'#687060':'#6e5a4c');
      const up=ty>0&&G.tiles[K(tx,ty-1)].ter==='high',dn=ty<ROWS-1&&G.tiles[K(tx,ty+1)].ter==='high',lf=tx>0&&G.tiles[K(tx-1,ty)].ter==='high',rt=tx<COLS-1&&G.tiles[K(tx+1,ty)].ter==='high';
      if(!up){g.fillStyle='rgba(255,255,220,.25)';g.fillRect(X,Y,TS,1);}
      if(!dn){g.fillStyle=act===2?'#2a1a14':'#2a2a1a';g.fillRect(X,Y+TS-3,TS,3);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(X,Y+TS-4,TS,1);}
      if(!lf){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(X,Y,1,TS);}
      if(!rt){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(X+TS-1,Y,1,TS);}
    }
    if(t.ter==='water'){
      g.fillStyle=act===1?'#2a3a3a':'#28486a';g.fillRect(X,Y,TS,TS);
      g.fillStyle=act===1?'#1e2a2a':'#1c3450';g.fillRect(X,Y,TS,2);
      for(let i=0;i<5;i++){const x=X+2+Math.floor(r()*11),y=Y+4+Math.floor(r()*10);g.fillStyle=act===1?'#4a5a50':'#4a7aa8';g.fillRect(x,y,3,1);}
    }
    if(t.ter==='rough'){
      for(let i=0;i<7;i++){const x=X+1+Math.floor(r()*13),y=Y+2+Math.floor(r()*12);
        if(act===0){px(x,y,'#2a3a14');px(x+1,y,'#3a4a1a');px(x,y-1,'#5a4020');px(x+2,y-1,'#2a3a14');}
        else if(act===1){px(x,y,'#d0c8a8');px(x+1,y,'#d0c8a8');px(x+2,y+1,'#8a846a');}
        else{px(x,y,'#7a706a');px(x+1,y,'#5a524c');px(x,y+1,'#4a423c');}}
    }
    g.fillStyle=P.grid;g.globalAlpha=.45;g.fillRect(X,Y,TS,1);g.fillRect(X,Y,1,TS);g.globalAlpha=1;
  }
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    const t=G.tiles[K(tx,ty)];if(!t.ob)continue;
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(tx*TS+3,ty*TS+12,10,3);
    const S=spr(t.ob);g.drawImage((t.v||0)%2?S.f:S.c,tx*TS,ty*TS);
  }
  const vg=g.createRadialGradient(64,64,40,64,64,100);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=vg;g.fillRect(0,0,128,128);
  return c;
}
function drawHazard(h,X,Y,k){
  const t=NOW/1000;const seed=(k*37)%11;
  if(h.t==='fire'||h.t==='lava'){
    if(h.t==='lava'){rect(X,Y,TS,TS,'#5a1606');rect(X+1,Y+1,TS-2,TS-2,'#b8300c');
      for(let i=0;i<6;i++){const a=t*1.3+i*1.7+seed;rect(X+2+Math.floor((Math.sin(a)+1)*5.5),Y+2+Math.floor((Math.cos(a*.8+i)+1)*5.5),2,2,i%2?'#ff9a20':'#ffd050');}
      rect(X,Y,TS,1,'#2a0a04');}
    else{rect(X+2,Y+11,12,3,'#3a1206');}
    for(let i=0;i<5;i++){const fh=4+Math.floor((Math.sin(t*9+i*2.1+seed)+1)*3)+(h.t==='lava'?-2:0);const fx0=X+3+i*2;
      rect(fx0,Y+13-fh,2,fh,'#e0501a');rect(fx0,Y+14-Math.floor(fh*.6),2,Math.floor(fh*.6)-1,'#ffb030');if(fh>6)rect(fx0,Y+13-Math.floor(fh*.3),1,2,'#fff0a0');}
  }else if(h.t==='acid'){
    rect(X+1,Y+2,TS-2,TS-3,'#2a4a10');rect(X+2,Y+3,TS-4,TS-5,'#6aa82a');rect(X+3,Y+4,TS-6,2,'#9ad84a');
    for(let i=0;i<3;i++){const ph=(t*1.4+i*.37+seed*.1)%1;const bx=X+4+((i*5+seed)%8),by=Y+11-Math.floor(ph*6);rect(bx,by,ph>.8?2:1,ph>.8?2:1,'#d8ffa0');}
  }else if(h.t==='trap'){
    ctx.globalAlpha=.8;rect(X+3,Y+9,10,2,'#6a6a70');for(let i=0;i<5;i++){rect(X+3+i*2,Y+7,1,2,'#a8a8b0');rect(X+3+i*2,Y+11,1,2,'#a8a8b0');}rect(X+7,Y+9,2,2,'#3a3a40');ctx.globalAlpha=1;
  }else if(h.t==='web'){
    ctx.globalAlpha=.75;for(let i=0;i<14;i++){rect(X+1+i,Y+1+i,1,1,'#e8eef0');rect(X+14-i,Y+1+i,1,1,'#e8eef0');}rect(X+1,Y+8,14,1,'#c8d0d4');rect(X+8,Y+1,1,14,'#c8d0d4');ctx.globalAlpha=1;
  }
  if(h.dur>0){for(let i=0;i<h.dur;i++)rect(X+1+i*3,Y+1,2,1,C.parch);}
}

/* ---------------- battle flow from the UI ---------------- */
function activeUnit(){return G&&G.cur?U(G.cur):null;}
function playerUnit(){const u=activeUnit();return G&&G.await&&u&&live(u)&&isPlayer(u)?u:null;}
function view(){
  const u=playerUnit();if(!u)return null;
  const key=[G.cmd,G.cur,B.pi,u.x,u.y,u.mp,u.acted,u.mom,HIST.length,G.units.map(o=>o.x+','+o.y+(live(o)?'':'d')).join(';'),JSON.stringify(G.walls)].join('|');
  if(key!==B.vkey){B.vkey=key;B.V=unitView(u,B.pi);}
  return B.V;
}
function setPend(k){
  const u=playerUnit();const V=view();if(!u||!V)return;
  const p=powerOf(u,B.pi);if(!p)return;
  const T={x:KX(k),y:KY(k)};let O={x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null};
  if(p.tgt==='enemy'||p.tgt==='ally')O=chooseOrigin(u,p,T,V)||O;
  B.pend={k,T,O};B.inspect=null;sfx('select');
}
function selfPend(u){const p=powerOf(u,B.pi);if(p&&p.tgt==='self'&&usable(u,p)&&!u.acted)B.pend={k:K(u.x,u.y),T:{x:u.x,y:u.y},O:{x:u.x,y:u.y,s:0,prov:0,haz:0,prev:null}};}
async function afterCmd(u){
  B.busy=false;B.pend=null;B.vkey='';
  if(!G||G.over)return;
  if(live(u)&&!u.acted)selfPend(u);
  if(SET.autoEnd&&G.await&&G.cur===u.id&&turnDone(u)){await sleep(250);if(G&&G.await&&G.cur===u.id&&!B.busy)await endTurnUI();}
}
async function doMove(n){
  const u=playerUnit();if(!u||B.busy)return;
  B.busy=true;B.pend=null;
  try{await cmdMove(u,{x:n.x,y:n.y});}catch(e){console.error(e);}
  await afterCmd(u);
}
async function confirmPend(){
  const u=playerUnit();const P=B.pend;if(!u||!P||B.busy)return;
  B.busy=true;
  try{await cmdAct(u,B.pi,P.T,P.O);}catch(e){console.error(e);}
  await afterCmd(u);
}
async function endTurnUI(){
  if(!G||!G.await||B.busy)return;
  B.busy=true;B.pend=null;B.inspect=null;
  try{await playerEndTurn();}catch(e){console.error(e);}
  B.busy=false;B.vkey='';
  const u=playerUnit();if(u)selfPend(u);
}
function undoUI(){
  if(B.busy||!canUndo())return;
  if(undo()){for(const k in VIS)delete VIS[k];B.pend=null;B.inspect=null;B.vkey='';const u=playerUnit();if(u){B.pi=Math.min(B.pi,Math.max(0,(u.powers||[]).length-1));selfPend(u);}saveGame();}
}
function boardTap(x,y){
  if(!G||G.over)return;
  const k=K(x,y),t=unitAt(x,y);
  const u=playerUnit();
  if(!u||B.busy){if(t){B.inspect=t.id;}return;}
  const V=view();const p=u.kind==='pc'?powerOf(u,B.pi):null;
  if(B.pend&&B.pend.k===k)return confirmPend();
  if(p&&!u.acted&&V.targets.has(k)){
    if((p.tgt==='enemy'||p.tgt==='ally')&&t)return setPend(k);
    if(p.tgt==='tile')return setPend(k);
    if(p.tgt==='self'&&t===u)return setPend(k);
  }
  if(V.moves.has(k)&&!t)return doMove(V.moves.get(k));
  if(t&&t!==u){B.inspect=t.id;B.pend=null;return;}
  if(t===u){B.inspect=null;selfPend(u);return;}
  B.pend=null;B.inspect=null;
}
function tileAt(px,py){const x=Math.floor((px-BX)/TS),y=Math.floor((py-BY)/TS);return inB(x,y)?{x,y}:null;}
const boardInput={
  fn:(px,py)=>{const t=tileAt(px,py);if(t)boardTap(t.x,t.y);},
  dragStart:(px,py)=>{const t=tileAt(px,py);const u=playerUnit();if(t&&u&&!B.busy&&u.x===t.x&&u.y===t.y)B.drag={id:u.id};},
  drag:(px,py)=>{if(!B.drag)return;B.dragPos={x:px,y:py};const t=tileAt(px,py);B.dragTile=t;
    const u=playerUnit();const V=view();if(!u||!V||!t)return;const k=K(t.x,t.y);const p=u.kind==='pc'?powerOf(u,B.pi):null;const o=unitAt(t.x,t.y);
    if(p&&!u.acted&&V.targets.has(k)&&o&&o!==u&&(p.tgt==='enemy'||p.tgt==='ally')){if(!B.pend||B.pend.k!==k)setPend(k);}else B.pend=null;},
  drop:(px,py)=>{if(!B.drag)return;B.drag=null;B.dragTile=null;const t=tileAt(px,py);const u=playerUnit();if(!t||!u)return;const k=K(t.x,t.y);const V=view();
    if(B.pend&&B.pend.k===k)return confirmPend();
    if(V&&V.moves.has(k)&&!unitAt(t.x,t.y))return doMove(V.moves.get(k));},
  id:'board'
};

/* ---------------- drawing ---------------- */
function drawBattle(){
  if(!G)return;
  if(B.gRef!==G){B.gRef=G;const key=G.enc.title+G.enc.f+G.tiles.map(t=>(t.ob||'')+(t.ter||'')).join();if(key!==B.terrKey){B.terrKey=key;B.terr=buildTerrain();}}
  rect(0,0,SW,SH,C.bg);
  drawTop();
  drawBoard();
  drawLeft();
  drawRight();
  drawHotbar();
  drawFX();
  if(B.banner){const b=B.banner;const p=(NOW-b.t0)/b.dur;if(p>=1)B.banner=null;else{
    const h=b.sub?34:22,y=BY+64-h/2;ctx.globalAlpha=Math.min(1,Math.min(p,1-p)*6);
    rect(0,y,SW,h,'rgba(10,6,4,.85)');rect(0,y,SW,1,b.villain?C.red:C.gold2);rect(0,y+h-1,SW,1,b.villain?C.red:C.gold2);
    if(b.unit){const S=unitSprite(b.unit);ctx.drawImage(S.c,0,0,16,16,SW/2-textW(b.title,2)/2-22,y+3,16,16);}
    text(b.title,SW/2,y+5,b.villain?'#ffb070':C.gold,{al:'c',sc:2,ol:C.edge});
    if(b.sub)text(b.sub,SW/2,y+22,C.parch,{al:'c'});
    ctx.globalAlpha=1;}}
}
function drawTop(){
  rect(0,0,SW,12,C.panel);rect(0,11,SW,1,C.rim);rect(0,12,SW,1,C.edge);
  const E=G.enc;
  const obj=objText();
  text(MISSIONS[E.type].name.toUpperCase(),3,3,C.gold);
  const ow=textW(MISSIONS[E.type].name.toUpperCase());
  text('· '+obj,6+ow,3,C.parch);
  hit(0,0,160,12,{fn:()=>msg(E.title,E.type==='boss'?BOSS_TXT[E.act]:MISSIONS[E.type].desc),id:'obj'});
  text('ROUND '+G.round,SW/2+36,3,C.parch,{al:'c'});
  const fm=`Foes ◆${Math.max(0,G.foeMom)}`;text(fm,SW-4,3,C.mom,{al:'r'});
  hit(SW-textW(fm)-6,0,textW(fm)+6,12,{fn:()=>openGloss('momentum'),id:'fm'});
}
function objText(){
  const E=G.enc,t=E.type,n=G.units.filter(u=>u.side==='enemy'&&live(u)&&!u.object).length;
  switch(t){
    case 'hold':return `Hold the shrine ${G.hold}/3`;
    case 'loot':return `Chests ${G.looted}/3`;
    case 'survive':return `Survive round ${Math.min(5,G.round)}/5`;
    case 'defend':return `Defend the wagon ${Math.min(5,G.round)}/5`;
    case 'rescue':{const v=G.units.find(u=>u.npc==='villager');return v&&v.caged?'Reach the captive':'Lead the captive south';}
    case 'ritual':return G.ritualFailed?'Slay the Bound Horror':`Topple the pillars: ${G.ritual} rounds`;
    case 'breakout':return `Escape north: ${G.units.filter(u=>u.gone).length} out`;
    case 'assassinate':return 'Slay the chief';
    case 'boss':return 'Defeat '+E.title;
    default:return `${n} ${n===1?'foe':'foes'} left`;
  }
}
function tileRect(x,y,col,a){ctx.globalAlpha=a;rect(BX+x*TS+1,BY+y*TS+1,TS-2,TS-2,col);ctx.globalAlpha=Math.min(1,a*2.2);frame(BX+x*TS+1,BY+y*TS+1,TS-2,TS-2,col);ctx.globalAlpha=1;}
function drawBoard(){
  rect(BX-2,BY-2,COLS*TS+4,ROWS*TS+4,C.edge);rect(BX-1,BY-1,COLS*TS+2,ROWS*TS+2,C.rim);
  ctx.drawImage(B.terr,BX,BY);
  const t=NOW/1000;
  for(let k=0;k<G.tiles.length;k++){const T0=G.tiles[k],X=BX+KX(k)*TS,Y=BY+KY(k)*TS;
    if(T0.ter==='water'){const ph=Math.floor(t*3+k)%4;rect(X+3+ph*2,Y+6+(k%3)*3,2,1,'rgba(200,230,255,.5)');}
    if(T0.haz)drawHazard(T0.haz,X,Y,k);}
  if(G.enc.zone.length){const zx=Math.min(...G.enc.zone.map(z=>z[0])),zy=Math.min(...G.enc.zone.map(z=>z[1]));const a=.5+.3*Math.sin(t*3);ctx.globalAlpha=a;frame(BX+zx*TS+1,BY+zy*TS+1,2*TS-2,2*TS-2,C.gold);frame(BX+zx*TS+3,BY+zy*TS+3,2*TS-6,2*TS-6,C.gold2);ctx.globalAlpha=1;}
  if(G.enc.type==='breakout')for(let x=0;x<COLS;x++){ctx.globalAlpha=.45+.25*Math.sin(t*4+x);text('↑',BX+x*TS+7,BY+3,C.gold,{al:'c'});ctx.globalAlpha=1;}
  if(G.enc.type==='rescue')for(let x=0;x<COLS;x++){ctx.globalAlpha=.35+.2*Math.sin(t*4+x);text('↓',BX+x*TS+7,BY+(ROWS-1)*TS+6,C.green,{al:'c'});ctx.globalAlpha=1;}
  for(const k of G.chests){const ic=icon('treasure');ctx.drawImage(ic,BX+KX(k)*TS+3,BY+KY(k)*TS+3+Math.round(Math.sin(t*3+k)));}
  for(const z of G.zones){const col={poison:'#9ae050',holy:'#ffe890',arcane:'#b48aff'}[z.fx]||'#b48aff';ctx.globalAlpha=.18+.08*Math.sin(t*3);rect(BX+(z.x-z.r)*TS,BY+(z.y-z.r)*TS,(2*z.r+1)*TS,(2*z.r+1)*TS,col);ctx.globalAlpha=1;}
  for(const k in G.walls){ctx.drawImage(spr('icewall').c,BX+KX(+k)*TS,BY+KY(+k)*TS);}
  drawHighlights();
  drawPath();
  const us=G.units.filter(u=>live(u)||(VIS[u.id]&&VIS[u.id].dying&&NOW-VIS[u.id].dying.t0<VIS[u.id].dying.dur)).sort((a,b)=>a.y-b.y);
  const cur=activeUnit();
  if(cur&&live(cur)){const p=uPos(cur);const X=BX+p.x,Y=BY+p.y;const a=Math.floor(t*4)%2;const c=C.gold;
    for(const[dx,dy,sx,sy]of[[0,0,1,1],[TS-3,0,-1,1],[0,TS-3,1,-1],[TS-3,TS-3,-1,-1]]){rect(X+dx-a*sx,Y+dy+(sy<0?2:0)-a*sy,3,1,c);rect(X+dx+(sx<0?2:0)-a*sx,Y+dy-a*sy,1,3,c);}}
  for(const u of us)drawUnit(u);
  if(B.drag){const u=U(B.drag.id);if(u&&B.dragPos){const S=unitSprite(u);ctx.globalAlpha=.8;ctx.drawImage(S.c,Math.round(B.dragPos.x-8),Math.round(B.dragPos.y-12));ctx.globalAlpha=1;}}
  hit(BX,BY,COLS*TS,ROWS*TS,boardInput);
  if(B.toast){const p=(NOW-B.toast.t0)/B.toast.dur;if(p>=1)B.toast=null;else{ctx.globalAlpha=Math.min(1,(1-p)*3);const w=textW(B.toast.text)+10;rect(BX+64-w/2,BY+1,w,9,'rgba(10,6,4,.8)');text(B.toast.text,BX+64,BY+3,B.toast.col,{al:'c'});ctx.globalAlpha=1;}}
}
function drawUnit(u){
  const v=vis(u);const p=uPos(u);const X=BX+p.x,Y=BY+p.y;
  let a=1;
  if(v.dying){const q=(NOW-v.dying.t0)/v.dying.dur;a=Math.max(0,1-q);}
  if(v.fade){const q=(NOW-v.fade.t0)/v.fade.dur;if(q>=1)v.fade=null;else a*=v.fade.out?1-q:q;}
  if(u.hidden)a*=.55;
  ctx.globalAlpha=a*.4;rect(X+3,Y+13,10,3,'#000');ctx.globalAlpha=a;
  const ring=sideRing(u);rect(X+4,Y+14,8,1,ring);rect(X+3,Y+13,1,1,ring);rect(X+12,Y+13,1,1,ring);
  const S=unitSprite(u);
  const bob=(!v.anim&&!v.dying&&live(u)&&Math.floor(NOW/500+(u.id.charCodeAt(u.id.length-1)%3))%2)?1:0;
  const img=v.flash&&NOW<v.flash?S.wh:S.c;
  ctx.drawImage(img,X,Y-1+bob);
  if(u.caged){ctx.globalAlpha=a*.9;for(let i=0;i<5;i++)rect(X+2+i*3,Y+1,1,14,'#6a6a70');rect(X+1,Y+1,14,1,'#8a8a90');rect(X+1,Y+14,14,1,'#8a8a90');}
  ctx.globalAlpha=1;
  if(!live(u))return;
  const f=u.hp/u.maxHp;rect(X+2,Y+15,12,2,C.edge);rect(X+3,Y+15,Math.max(1,Math.round(10*f)),1,u.side==='enemy'?(f>.5?'#e05040':'#ff8a50'):(f>.5?'#60d060':f>.25?'#e0c040':'#e05040'));
  if(u.shield>0)rect(X+13,Y+14,2,2,C.blue);
  const sts=Object.keys(u.st);const SC={slow:'#70b8f8',root:'#a0a0a8',prone:'#c89060',daze:'#f0e060',weak:'#9ae050',bleed:'#e04848',burn:'#ff8a20',expose:'#ff60c0',mark:'#f0c050',bless:'#fff0a0'};
  sts.slice(0,4).forEach((s,i)=>{rect(X+13,Y+i*3,3,3,C.edge);rect(X+14,Y+1+i*3,1,1,SC[s]||'#fff');});
  if(u.kind==='pc'&&u.mom>0&&u.side==='hero'){rect(X,Y,2,2,C.mom);}
}
function drawHighlights(){
  const u=playerUnit();
  const insp=B.inspect?U(B.inspect):null;
  if(insp&&live(insp)&&insp.side==='enemy'&&!insp.object){
    const R=reach(insp,effSpeed(insp));const mv=new Set(R.keys());const at=new Set();
    let rng=1;if(insp.kind==='mon')rng=Math.max(1,...mon(insp).acts.filter(a=>!a.tgt&&!a.trap).map(a=>a.range));else rng=Math.max(1,...insp.powers.map(id=>POWERS[id].tgt==='enemy'?POWERS[id].range:1));
    for(const n of R.values())for(const t of tilesWithin(n,rng))if(man(t,n)>=1)at.add(K(t.x,t.y));
    at.forEach(k=>{if(!mv.has(k))tileRect(KX(k),KY(k),'#e84030',.12);});
    mv.forEach(k=>tileRect(KX(k),KY(k),'#ff7050',.22));
  }
  if(!u||B.busy)return;
  const V=view();if(!V)return;
  const p=u.kind==='pc'?powerOf(u,B.pi):null;
  const tcol=!p?'#e84030':p.tgt==='enemy'?'#e84030':p.tgt==='ally'?'#50d060':p.tgt==='tile'&&p.area!=null?'#ffa040':'#50b0ff';
  V.zone.forEach(k=>{if(!V.moves.has(k)&&!V.targets.has(k)){ctx.globalAlpha=.25;rect(BX+KX(k)*TS+7,BY+KY(k)*TS+7,2,2,tcol);ctx.globalAlpha=1;}});
  V.moves.forEach(n=>{if(n.x===u.x&&n.y===u.y)return;if(unitAt(n.x,n.y))return;tileRect(n.x,n.y,n.prov?'#a070ff':'#4a90f0',.26);});
  if(p&&p.tgt!=='self')V.targets.forEach((os,k)=>tileRect(KX(k),KY(k),tcol,p.tgt==='tile'?.18:.32));
  if(B.pend&&p){
    const T=B.pend.T;const a=.35+.15*Math.sin(NOW/150);
    if(p.area!=null){const C0=p.tgt==='self'?u:T;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(cheb({x,y},C0)<=p.area&&!(p.tgt==='self'&&x===u.x&&y===u.y))tileRect(x,y,'#ffa040',a);}
    if(p.wall)for(const dx of[-1,0,1])if(inB(T.x+dx,T.y))tileRect(T.x+dx,T.y,'#a8e8ff',a);
    const X=BX+T.x*TS,Y=BY+T.y*TS;ctx.globalAlpha=.6+.4*Math.sin(NOW/120);frame(X,Y,TS,TS,C.white);ctx.globalAlpha=1;
  }
}
function drawPath(){
  const u=playerUnit();if(!u)return;
  let n=null;
  if(B.pend&&B.pend.O&&B.pend.O.prev)n=B.pend.O;
  else if(B.drag&&B.dragTile){const V=view();n=V&&V.moves.get(K(B.dragTile.x,B.dragTile.y));}
  if(!n)return;
  const path=pathOf(n);if(path.length<2)return;
  const warn=n.prov>0,col=warn?'#ff6a5a':'#9ad0ff';
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];const x1=BX+a.x*TS+7,y1=BY+a.y*TS+7,x2=BX+b.x*TS+7,y2=BY+b.y*TS+7;
    const minx=Math.min(x1,x2),miny=Math.min(y1,y2);rect(minx,miny,Math.abs(x2-x1)+2,Math.abs(y2-y1)+2,C.edge);rect(minx,miny,Math.abs(x2-x1)+2,Math.abs(y2-y1)+2,col);}
  const e=path[path.length-1];rect(BX+e.x*TS+5,BY+e.y*TS+5,6,6,C.edge);rect(BX+e.x*TS+6,BY+e.y*TS+6,4,4,col);
}
function drawLeft(){
  panel(0,13,95,133,{});
  const u=playerUnit();
  const insp=B.inspect?U(B.inspect):null;
  if(B.pend&&u&&!insp){drawForecast(u);return;}
  const show=insp&&(live(insp)||insp.dead)?insp:(activeUnit()||u);
  if(!show){text('Waiting…',48,70,C.mute,{al:'c'});return;}
  drawUnitCard(show,4,16,87,126,!!insp);
}
function drawUnitCard(u,x,y,w,h,closable){
  inset(x,y,34,34,'#15100c');
  const S=unitSprite(u);ctx.drawImage(S.c,0,0,16,16,x+1,y+1,32,32);
  hit(x,y,34,34,{fn:()=>openUnitInfo(u),id:'cardspr'});
  text(u.name,x+37,y+1,u.side==='enemy'?'#ff9a80':C.gold);
  text(unitSub(u),x+37,y+8,C.mute);
  bar(x+37,y+16,w-37,5,u.hp/u.maxHp,u.side==='enemy'?'#d04030':'#50c050');
  text(`${Math.max(0,u.hp)}/${u.maxHp}`,x+37,y+23,C.parch);
  if(u.kind==='pc'){for(let i=0;i<10;i++){rect(x+37+i*5,y+30,4,4,C.edge);rect(x+38+i*5,y+31,2,2,i<u.mom?C.mom:'#2a2030');}}
  if(closable){button(x+w-9,y-1,9,8,'×',()=>{B.inspect=null;},{});}
  const body=unitBody(u,false);
  const bh=richH(body,w-4);
  scrollArea('card',x,y+37,w,h-38,bh,(yy,clip)=>rich(body,x+1,yy,w-4,C.parch,{clip}));
}
function openUnitInfo(u){
  openModal({closable:true,draw(){
    dim();const w=230,h=150,x=45,y=15;panel(x,y,w,h,{title:u.name.toUpperCase()});
    inset(x+6,y+8,36,36,'#15100c');ctx.drawImage(unitSprite(u).c,0,0,16,16,x+8,y+10,32,32);
    text(unitSub(u),x+46,y+10,C.mute);bar(x+46,y+18,80,5,u.hp/u.maxHp,u.side==='enemy'?'#d04030':'#50c050');text(`${Math.max(0,u.hp)}/${u.maxHp}`,x+130,y+18,C.parch);
    if(G&&u.init!=null)text(`Initiative ${u.init}`,x+46,y+27,C.parch);
    const body=unitBody(u,true);const bh=richH(body,w-16);
    scrollArea('uinfo',x+6,y+47,w-10,h-66,bh,(yy,clip)=>rich(body,x+8,yy,w-16,C.parch,{clip}));
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{});
  }});
}
function forcedPreview(u,p,t,O){
  const eff=p.eff||{};const n=(tv(eff.push,2)||tv(eff.pull,2));if(!n||t.object)return '';
  const from=p.tgt==='enemy'?O:(p.tgt==='self'?O:B.pend.T);
  let x=t.x,y=t.y,m=n+pushExtra(u)-(t.steady||0);const hz=[];
  for(let i=0;i<m;i++){let dx=x-from.x,dy=y-from.y;if(eff.pull){dx=-dx;dy=-dy;}let sx=0,sy=0;if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)sx=Math.sign(dx);else if(dy!==0)sy=Math.sign(dy);else break;
    const nx=x+sx,ny=y+sy;if(eff.pull&&nx===from.x&&ny===from.y)break;if(!inB(nx,ny)||blocked(nx,ny)||unitAt(nx,ny)){if(!eff.pull)hz.push('slam');break;}x=nx;y=ny;const h=Tt(x,y).haz;if(h&&hazDmg(t,h))hz.push(HAZ[h.t].name.toLowerCase());}
  return hz.length?`{o:On Solid: ${eff.pull?'pulled':'pushed'} into ${[...new Set(hz)].join(', ')}!}`:'';
}
function drawForecast(u){
  const p=powerOf(u,B.pi);const P=B.pend;const rows=forecast(u,p,P.T,P.O);const r=rows[0];
  const x=4;let y=16;
  text(p.name,x,y,C.gold);if(p.cost)text('◆'+p.cost,91,y,C.mom,{al:'r'});y+=8;
  const tgt=r&&r.t;
  if(tgt){ctx.drawImage(unitSprite(tgt).c,x,y-2);text(tgt.name,x+18,y,tgt.side===u.side?C.green:'#ff9a80');text(`HP ${tgt.hp}/${tgt.maxHp}`+(rows.length>1?`  +${rows.length-1} more`:''),x+18,y+7,C.mute);y+=17;}
  else{text(p.tgt==='self'||p.area!=null?'No one in the area.':'',x,y,C.mute);y+=10;}
  let body='';
  if(r&&r.dmg){
    const labels=['GLANCE','SOLID','CRUSH'];
    for(let i=0;i<3;i++){const bx=x+i*29;inset(bx,y,27,28,i===2?'#3a2a10':'#1e1712');text(labels[i],bx+13,y+2,i===2?C.gold:C.mute,{al:'c'});
      text(r.ctrl?'—':String(r.dmg[i]),bx+14,y+9,i===2?C.gold:C.white,{al:'c',sc:2,sh:C.edge});text(Math.round(r.probs[i]*100)+'%',bx+13,y+21,C.parch,{al:'c'});}
    y+=31;
    const kp=killP(r);
    body+=`3d6${r.mod>=0?'+':''}${r.mod}${kp>0?`  {r:☠ ${Math.round(kp*100)}% kill}`:''}\n`;
    if(r.pro.length)body+=r.pro.map(s=>`{h:+}${s}`).join(' ')+' ';
    if(r.con.length)body+=r.con.map(s=>`{r:-}${s}`).join(' ');
    if(r.pro.length||r.con.length)body+='\n';
    const fp=forcedPreview(u,p,tgt,P.O);if(fp)body+=fp+'\n';
  }else if(r){
    body+=(r.heal?`Heals {h:${r.heal}}. `:'')+(r.shield?`Shield {b:${r.shield}}. `:'')+(r.empower?'Blessed. ':'')+(r.refresh?'Takes an extra turn. ':'')+'\n';
  }
  if(P.O&&P.O.prov)body+=`{r:! Moving there provokes ${P.O.prov} parting blow${P.O.prov>1?'s':''}.}\n`;
  if(P.O&&P.O.haz)body+=`{o:! The path crosses a hazard.}\n`;
  body+=p.desc;
  const bh=richH(body,86);
  scrollArea('fc',x,y,88,126-y,bh,(yy,clip)=>rich(body,x+1,yy,85,C.parch,{clip}));
  button(x,128,60,13,p.tgt==='enemy'?'STRIKE':'CONFIRM',confirmPend,{hot:true,disabled:B.busy});
  button(x+62,128,25,13,'×',()=>{B.pend=null;},{});
}
function drawRight(){
  panel(225,13,95,133,{});
  text('TURN ORDER',272,16,C.gold,{al:'c'});
  const list=upcoming(7);let y=24,lastR=G.round;
  for(const e of list){
    if(y>78)break;
    if(e.round!==lastR){rect(230,y+1,84,1,C.dim);text('Round '+e.round,272,y-1,C.mute,{al:'c',sh:C.panel});y+=5;lastR=e.round;}
    if(y>82)break;
    const u=e.u;if(e.now){rect(229,y-1,88,12,'#3a2e1a');}
    token(u,235,y+5,5);
    text(u.name.length>13?u.name.slice(0,12)+'…':u.name,243,y+3,e.now?C.gold:u.side==='enemy'?'#ff9a80':C.parch);
    hit(229,y-1,88,12,{fn:()=>{B.inspect=u.id;},id:'to'+u.id+y});
    y+=12;
  }
  const pu=playerUnit();
  button(229,90,42,12,'ORDER',openOrder,{});
  button(273,90,43,12,'LOG',openLog,{});
  button(229,104,42,12,'UNDO',undoUI,{disabled:B.busy||!canUndo()});
  button(273,104,43,12,'MENU',()=>openSettings(true),{});
  button(229,120,87,22,pu?'END TURN':'…',endTurnUI,{hot:!!pu&&turnDone(pu),disabled:!pu||B.busy});
}
function drawHotbar(){
  panel(0,146,SW,34,{});
  const u=playerUnit();const au=activeUnit();
  if(!u){const t=au&&live(au)?(au.side==='enemy'?`${au.name} is acting…`:`${au.name} is acting…`):'';text(t,SW/2,160,C.mute,{al:'c'});return;}
  if(u.kind==='npc'){rich('The captive can only move. Tap a blue square, then End Turn.',8,156,300,C.parch);return;}
  const n=u.powers.length;const per=n>8?7:8;const pages=Math.ceil(n/per);B.page=Math.min(B.page,pages-1);
  const start=B.page*per;
  for(let i=start;i<Math.min(n,start+per);i++){
    const p=powerOf(u,i);const slot=i-start;const x=4+slot*39,y=149;
    const ok=usable(u,p)&&!u.acted;const on=i===B.pi;
    rect(x,y,38,28,C.edge);rect(x+1,y+1,36,26,on?'#4a3818':ok?'#2e241c':'#1e1814');rect(x+1,y+1,36,1,on?'#a07828':ok?'#5a4632':'#2a221c');
    if(on){frame(x,y,38,28,C.gold);}
    const lines=wrap(p.name,34).slice(0,2);
    lines.forEach((l,j)=>text(l,x+19,y+4+j*7,ok?C.parch:C.dim,{al:'c',sh:C.edge}));
    const st=p.dmg&&!p.noDmg?dmgLine(p.dmg,u.attrs[p.a]+(u.side==='hero'&&hasR('whetstone')?1:0)):p.heal?'+'+healAmt(u,p.heal):p.shield?'⛨'+p.shield:p.tgt==='self'?'self':'—';
    text(st,x+3,y+19,ok?C.white:C.dim,{sh:C.edge});
    if(p.cost)text('◆'+p.cost,x+36,y+19,u.mom>=p.cost?C.mom:'#6a4a7a',{al:'r',sh:C.edge});
    else text(p.free?'FREE':ATTR[p.a][0],x+36,y+19,C.mute,{al:'r',sh:C.edge});
    hit(x,y,38,28,{fn:()=>cardTap(i),id:'card'+i});
  }
  if(pages>1)button(4+7*39,149,38,28,`${B.page+1}/${pages} ▶`,()=>{B.page=(B.page+1)%pages;},{});
}
function cardTap(i){
  const u=playerUnit();if(!u||B.busy)return;
  const p=powerOf(u,i);
  if(i===B.pi&&B.pend&&(p.tgt==='self')){confirmPend();return;}
  if(i===B.pi&&p.tgt==='self'&&usable(u,p)&&!u.acted){selfPend(u);if(B.pend)confirmPend();return;}
  B.pi=i;B.pend=null;B.inspect=null;B.vkey='';sfx('select');
  selfPend(u);
}
function openOrder(){
  openModal({closable:true,draw(){
    dim();const x=70,y=10,w=180,h=160;panel(x,y,w,h,{title:'TURN ORDER'});
    const list=upcoming(24);let ch=0;let lr=G.round;for(const e of list){if(e.round!==lr){ch+=9;lr=e.round;}ch+=16;}
    scrollArea('order',x+6,y+9,w-10,h-28,ch,(yy,clip)=>{let cy=yy,lr2=G.round;
      for(const e of list){
        if(e.round!==lr2){text('— Round '+e.round+' —',x+w/2,cy+1,C.mute,{al:'c',sh:C.panel});cy+=9;lr2=e.round;}
        const u=e.u;if(e.now)rect(x+6,cy,w-14,15,'#3a2e1a');
        token(u,x+15,cy+7,6);
        text(u.name+(e.now?'  ◀ now':e.extra?'  (extra turn)':''),x+25,cy+2,e.now?C.gold:u.side==='enemy'?'#ff9a80':C.parch);
        text(`Init ${u.init}  ·  HP ${u.hp}/${u.maxHp}`,x+25,cy+9,C.mute);
        if(cy>clip[0]-10&&cy<clip[1])hit(x+6,Math.max(cy,clip[0]),w-14,15,{fn:()=>openUnitInfo(u),id:'ord'+cy});
        cy+=16;
      }});
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{});
  }});
}
function openLog(){
  const lines=G.log.slice().reverse();
  const col=c=>c==='e'?'#ffb0a0':c==='h'?'#b8d8ff':c==='g'?C.gold:C.parch;
  scrollTo('log',0);
  openModal({closable:true,draw(){
    dim();const x=20,y=6,w=280,h=168;panel(x,y,w,h,{title:'BATTLE LOG'});
    let ch=0;const hs=lines.map(l=>{const hh=richH(l.m,w-24)+3;ch+=hh;return hh;});
    scrollArea('log',x+6,y+9,w-10,h-28,ch,(yy,clip)=>{let cy=yy;lines.forEach((l,i)=>{if(cy+hs[i]>=clip[0]&&cy<=clip[1])rich(l.m,x+10,cy,w-24,col(l.c),{clip});cy+=hs[i];});});
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{});
  }});
}
