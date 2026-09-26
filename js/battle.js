'use strict';
/* =====================================================================
   EMBERWATCH — battle screen
   ===================================================================== */
/* The board is drawn into its own canvas (board space, origin BX/BY inside a margin) and copied onto the
   screen. Portrait uses 32px tiles with 32×32 sprites; landscape uses 16px tiles. Q scales fixed offsets. */
let TS=16,Q=1;const BM=14;let BX=BM,BY=BM;
let OX=112,OY=15,BK=1,PL={};let BCV=null,BCX=null;
function battleLayout(){
  if(PORT){
    /* top bar · info bar · board · hint · power tray · controls. Spare height becomes breathing room around the board. */
    TS=32;Q=2;BK=1;OX=Math.floor((SW-COLS*TS)/2);
    const boardH=ROWS*TS+6;let spare=SH-(15+24+boardH+10+44+20+3);
    const big=spare>=10;if(big)spare-=10;
    const hint2=spare>=7;if(hint2)spare-=7;
    const ctrlH=big?24:20,trayH=big?50:44,hintH=hint2?17:10;
    const ctrlY=SH-ctrlH-2,trayY=ctrlY-trayH-1,hintY=trayY-hintH;
    const top=15+24,boardY=top+Math.floor((hintY-top-boardH)/2);
    PL={compact:!big,topH:15,infoY:15,infoH:24,boardY,hintY,hintH,trayY,trayH,ctrlY,ctrlH,plate:boardY-top>=13?{y:top+Math.floor((boardY-top-11)/2)}:null};
    OY=boardY+3;
  }else{TS=16;Q=1;PL={};BK=1;OX=96+Math.floor((128-COLS*TS)/2);OY=15;}
}
function drawBoardLayer(){
  const w=COLS*TS+2*BM,h=ROWS*TS+2*BM;
  if(!BCV||BCV.width!==w*RES||BCV.height!==h*RES){BCV=hiCanvas(w,h);BCX=BCV.getContext('2d');}
  const main=ctx;ctx=BCX;ctx.setTransform(RES,0,0,RES,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,w,h);
  try{drawBoard();}finally{ctx=main;}
  const sh=shakeOff();
  ctx.drawImage(BCV,0,0,w,h,OX-BM*BK+sh.x,OY-BM*BK+sh.y,w*BK,h*BK);
  ctx.save();ctx.translate(OX-BM*BK+sh.x,OY-BM*BK+sh.y);try{drawFX();drawParts();}finally{ctx.restore();}
  hit(OX,OY,COLS*TS*BK,ROWS*TS*BK,boardInput);
}
const B={pi:0,pend:null,inspect:null,drag:null,busy:false,page:0,terr:null,terrKey:'',gRef:null,banner:null,toast:null,vkey:'',V:null,dragTile:null,onEnd:null};
const VIS={};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------------- info text helpers (shared with compendium) ---------------- */
const EFF_NAME={push:'push',pull:'pull',slow:'slowed',root:'rooted',prone:'prone',daze:'dazed',weak:'weakened',bleed:'bleeding',burn:'burning',expose:'exposed',mark:'marked'};
function effText(eff){
  if(!eff)return '';
  const T=['graze','hit','crit'],out=[[],[],[]];
  for(const k in eff){
    const v=eff[k];const nz=v.findIndex(x=>x>0);if(nz<0)continue;
    let t=EFF_NAME[k];
    if(k==='push'||k==='pull'){t+=' '+v[nz];const ex=[];for(let i=nz+1;i<3;i++)if(v[i]!==v[i-1])ex.push(`${v[i]} on a ${T[i]}`);if(ex.length)t+=` (${ex.join(', ')})`;}
    else if(v.slice(nz).includes(0))t+=nz===0&&v[1]===0?' (only on a graze)':' (not on a crit)';
    out[nz].push(t);
  }
  const parts=[];
  if(out[0].length){const s0=out[0].join(', ');parts.push(s0[0].toUpperCase()+s0.slice(1));}
  if(out[1].length)parts.push('On a hit: '+out[1].join(', '));
  if(out[2].length)parts.push('On a crit: '+out[2].join(', '));
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
  const et=effText(p.eff);if(et&&!/on a hit|on a crit/i.test(p.desc)&&!Object.keys(p.eff).some(k=>p.desc.toLowerCase().includes(EFF_NAME[k])))s+=' '+et;
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
    s+=`Speed ${effSpeed(u)}\n`;
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

/* ---------------- effects: particles, shake, flashes ---------------- */
const PARTS=[];let PLAST=0;
const SHK={m:0,t0:0,d:1};
function shake(m,d){const cur=SHK.m*Math.max(0,1-(NOW-SHK.t0)/SHK.d);if(m>=cur){SHK.m=m;SHK.t0=NOW;SHK.d=d||260;}}
function shakeOff(){const p=(NOW-SHK.t0)/SHK.d;if(!SHK.m||p>=1)return {x:0,y:0};const m=SHK.m*(1-p)*(1-p);return {x:Math.round((Math.random()*2-1)*m),y:Math.round((Math.random()*2-1)*m)};}
function part(o){o.t0=NOW;o.life=o.life||600;PARTS.push(o);if(PARTS.length>700)PARTS.shift();return o;}
/* A spray of particles. o: {cols, n, speed, spread, a0, up, g, drag, life, size, jit, shrink} */
function burst(x,y,o){const n=o.n||10;for(let i=0;i<n;i++){const a=(o.a0!=null?o.a0-(o.spread||0)/2:0)+Math.random()*(o.spread!=null?o.spread:Math.PI*2);const sp=(o.speed||40)*(.35+Math.random()*.9);
  part({x:x+(Math.random()-.5)*(o.jit||0),y:y+(Math.random()-.5)*(o.jitY!=null?o.jitY:(o.jit||0)),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(o.up||0),g:o.g||0,drag:o.drag||0,life:(o.life||500)*(.6+Math.random()*.7),cols:o.cols,size:o.size||1,shrink:o.shrink,glow:o.glow});}}
function drawParts(){
  const dt=Math.min(50,NOW-(PLAST||NOW))/1000/spd();PLAST=NOW;
  for(let i=PARTS.length-1;i>=0;i--){const p=PARTS[i];const age=(NOW-p.t0)/(p.life*spd());if(age>=1){PARTS.splice(i,1);continue;}
    p.vy+=p.g*dt;if(p.drag){const k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k;}p.x+=p.vx*dt;p.y+=p.vy*dt;
    const col=p.cols[Math.min(p.cols.length-1,Math.floor(age*p.cols.length))];const sz=p.shrink?Math.max(1,Math.round(p.size*(1-age*.8))):p.size;
    if(p.glow){ctx.globalAlpha=.3*(1-age);rect(p.x-1,p.y-1,sz+2,sz+2,col);ctx.globalAlpha=1;}
    rect(p.x,p.y,sz,sz,col);}
}
const ELEM={
  fire:['#fff4c0','#ffd040','#ff8a20','#d8401a','#6a2a1a'],frost:['#ffffff','#c8f4ff','#7ad8ff','#3a90d0'],arcane:['#ffffff','#e0c8ff','#b080ff','#6a3ab0'],
  holy:['#ffffff','#fff4c0','#ffe070','#d8a030'],dark:['#e0c8ff','#9a6ad8','#5a2a8a','#2a1040'],necro:['#e0ffe0','#8aff9a','#3aaa5a','#1a4a2a'],
  acid:['#e0ffb0','#9ad84a','#5a9a22','#2a4a10'],steel:['#ffffff','#e0e6ee','#a8b0bc','#6a7482'],blood:['#ff8070','#e04040','#a01a1a','#5a0a0a'],
  bone:['#fffae8','#e0d8b8','#a8a088','#6a6458'],earth:['#c8b090','#9a8060','#6a5440','#3a2e24'],lightning:['#ffffff','#fffbb0','#ffe040','#c89020'],
  poison:['#e0ffb0','#b8f070','#7ab040','#3a6a1a'],web:['#ffffff','#e8eef0','#c8d4d8','#8a9498'],smoke:['#8a8078','#6a605a','#4a4440','#2a2624'],
};
function uc(u){const p=uPos(u),h=TS*SZ(u)/2;return {x:BX+p.x+h,y:BY+p.y+h};}
function tc(t){return t.id==='tile'||!t.id?{x:BX+t.x*TS+TS/2,y:BY+t.y*TS+TS/2}:uc(t);}
function flashBoard(col,dur,a){B.flash={t0:NOW,dur:dur||120,col,a:a||.35};}
/* impact spray by element */
function impact(pt,kind,big){
  const k={fire:'fire',fireball:'fire',frost:'frost',arcane:'arcane',holy:'holy',dark:'dark',necro:'necro',acid:'acid',web:'web',lightning:'lightning',beam:'necro',arrow:'steel',knife:'steel',axe:'steel',lob:'earth',slash:'steel',claw:'blood',blunt:'earth'}[kind]||'steel';
  const cols=ELEM[k];const m=big?1.6:1;
  burst(pt.x,pt.y,{n:Math.round(12*m),speed:55*m,cols,life:420,size:k==='steel'?1:2,shrink:true,drag:3,g:k==='acid'||k==='blood'?120:0,glow:k!=='steel'&&k!=='earth'&&k!=='blood'});
  if(k==='fire'){burst(pt.x,pt.y-2,{n:6,speed:10,up:18,cols:ELEM.smoke,life:900,size:2,drag:1});}
  if(k==='holy'||k==='arcane'||k==='frost'||k==='lightning')ring(pt,cols[2],big?16:11,260);
}
function ring(pt,col,r,dur){fx({dur,draw(p){ctx.globalAlpha=1-p;const rr=Math.max(1,Math.round(r*(.3+.7*p)));const n=Math.max(8,rr*3);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;rect(pt.x+Math.cos(a)*rr,pt.y+Math.sin(a)*rr*.8,1,1,col);}ctx.globalAlpha=1;}});}
/* spark colours taken from a sprite, so things crumble into their own pixels */
const SPRCOL=new Map();
function spriteCols(S){if(SPRCOL.has(S))return SPRCOL.get(S);let out=['#ffffff'];try{const d=S.c.getContext('2d').getImageData(0,0,S.c.width,S.c.height).data;const set=new Set();for(let i=0;i<d.length;i+=4*7)if(d[i+3]>200)set.add('#'+((1<<24)|(d[i]<<16)|(d[i+1]<<8)|d[i+2]).toString(16).slice(1));out=[...set].slice(0,24);}catch(e){}SPRCOL.set(S,out);return out;}

/* ---------------- engine hooks ---------------- */
function vis(u){return VIS[u.id]||(VIS[u.id]={});}
function uPos(u){
  const v=vis(u);let x=u.x*TS,y=u.y*TS;
  if(v.anim){const p=(NOW-v.anim.t0)/v.anim.dur;if(p>=1)v.anim=null;else{const e=p<.5?2*p*p:1-2*(1-p)*(1-p);x=v.anim.fx+(v.anim.tx-v.anim.fx)*e;y=v.anim.fy+(v.anim.ty-v.anim.fy)*e-(v.anim.hop?Math.sin(p*Math.PI)*v.anim.hop:0);}}
  if(!v.anim)v.last={x:u.x*TS,y:u.y*TS};
  if(v.off){const p=(NOW-v.off.t0)/v.off.dur;if(p>=1)v.off=null;else{const k=p<.2?-p/.2*.3:p<.45?-.3+(p-.2)/.25*1.3:1-(p-.45)/.55;x+=v.off.dx*k;y+=v.off.dy*k;}}
  if(v.kb){const p=(NOW-v.kb.t0)/v.kb.dur;if(p>=1)v.kb=null;else{const k=(1-p)*(1-p);x+=v.kb.dx*k;y+=v.kb.dy*k;}}
  return {x:Math.round(x),y:Math.round(y)};
}
H.step=async(u,forced)=>{const v=vis(u);const cur=v.last||{x:u.x*TS,y:u.y*TS};const d=(forced?90:130)*spd();v.anim={fx:cur.x,fy:cur.y,tx:u.x*TS,ty:u.y*TS,t0:NOW,dur:d,hop:forced?0:Q+1};v.last={x:u.x*TS,y:u.y*TS};
  sfx(forced?'slide':'step');if(!forced&&!u.object){setTimeout(()=>burst(BX+u.x*TS+TS/2,BY+u.y*TS+TS-3,{n:4,speed:14,up:6,cols:ELEM.earth,life:320,size:1,drag:4,jit:6*Q,jitY:1}),d*.8);}
  await sleep(forced?90:130);};
function projKind(o){
  const p=o.power;
  if(p){if(p.id==='chain')return 'lightning';if(p.id==='disint')return 'beam';if(p.fx==='fire'||p.id==='scorch')return 'fireball';if(p.proj==='#8fe3ff')return 'frost';if(p.proj==='#ffe38a')return 'holy';
    if(p.proj==='#e6ecf2')return p.id==='knives'?'knife':'arrow';if(p.proj==='#9a7bff')return 'dark';return 'arcane';}
  if(o.chain)return 'lightning';
  const A=o.act;if(A){const n=A.name;if(/Arrow/.test(n))return 'arrow';if(/Fire|Scorch|Kindle|Flame|Firespit|Firebolt/.test(n))return 'fireball';if(/Necrotic/.test(n))return 'necro';if(/Bolt|Curse|Hex/.test(n))return 'dark';
    if(/Chill/.test(n))return 'frost';if(/Web/.test(n))return 'web';if(/Acid/.test(n))return 'acid';if(/Axe/.test(n))return 'axe';if(/Snare/.test(n))return 'lob';}
  return o.proj==='#ff7a2a'?'fireball':'arcane';
}
function meleeKind(a,o){if(o.act){const n=o.act.name;if(/Bite|Claw|Tendril|Grasp|Touch/.test(n))return 'claw';if(/club|Slam|Fist|Flail|Lash/i.test(n))return 'blunt';}
  if(o.power&&/mace|hammer|fist|quake/.test(POWER_ICON[o.power.id]||''))return 'blunt';return 'slash';}
H.strike=async(a,t,o)=>{
  o=o||{};
  if(o.support){sfx('holy');const c=tc(t);burst(c.x,c.y,{n:14,speed:18,up:24,cols:ELEM.holy,life:700,size:1,drag:2,jit:TS*.6,glow:true});await sleep(220);return;}
  if(o.proj){const k=projKind(o);sfx(k==='fireball'?'firecast':k==='arrow'||k==='knife'||k==='axe'?'bow':k==='lightning'?'zap':k==='holy'?'holycast':k==='frost'?'icecast':'spell');await projectile(a,t,k);}
  else{
    const k=meleeKind(a,o);sfx('swing');const v=vis(a);const dx=Math.sign(t.x-a.x),dy=Math.sign(t.y-a.y);
    v.off={dx:dx*7*Q,dy:dy*7*Q,t0:NOW,dur:220*spd()};await sleep(95);
    const c=tc(t);slashFx(c,dx,dy,k);impact(c,k);
    if(t.id&&t.id!=='tile'){const tv=vis(t);tv.kb={dx:dx*3*Q,dy:dy*3*Q,t0:NOW,dur:200*spd()};}
    await sleep(40);
  }
  if(t.id&&t.id!=='tile')vis(t).flash=NOW+110*spd();
};
function slashFx(c,dx,dy,kind){
  const ang=Math.atan2(dy,dx)+Math.PI/2;const R=TS*.42;
  if(kind==='claw'){fx({dur:220,draw(p){ctx.globalAlpha=1-p;for(let k=-1;k<=1;k++){const n=Math.floor(Math.min(1,p*3)*10);for(let i=0;i<n;i++){const q=i/9-.5;rect(c.x+Math.cos(ang)*q*R*1.6+Math.cos(ang+Math.PI/2)*k*4,c.y+Math.sin(ang)*q*R*1.6+Math.sin(ang+Math.PI/2)*k*4+q*6,2,1,i>6?'#ffffff':'#ff6a5a');}}ctx.globalAlpha=1;}});return;}
  if(kind==='blunt'){fx({dur:200,draw(p){ctx.globalAlpha=1-p;const r=Math.round(4+p*TS*.3);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;rect(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r,2,2,i%2?'#fff4c0':'#ffffff');}ctx.globalAlpha=1;}});shake(1.5,120);return;}
  fx({dur:200,draw(p){const n=14;ctx.globalAlpha=p<.6?1:(1-p)/.4;for(let i=0;i<n;i++){const q=i/(n-1);if(q>p*2.2)break;const a=ang-1.2+q*2.4+Math.PI;const w=Math.round(Math.sin(q*Math.PI)*2)+1;
    rect(c.x+Math.cos(a)*R,c.y+Math.sin(a)*R,w,w,q>.3&&q<.7?'#ffffff':'#c8d4e0');}ctx.globalAlpha=1;}});
}
async function projectile(a,t,kind){
  const s=uc(a),e=tc(t);s.y-=2;e.y-=2;
  const dist=Math.hypot(e.x-s.x,e.y-s.y);
  if(kind==='lightning'||kind==='beam'){await beam(s,e,kind);impact(e,kind,true);if(t.id&&t.id!=='tile')vis(t).kb={dx:Math.sign(e.x-s.x)*2*Q,dy:Math.sign(e.y-s.y)*2*Q,t0:NOW,dur:180*spd()};return;}
  const arcing=kind==='arrow'||kind==='lob'||kind==='axe'||kind==='knife';
  const dur=Math.min(440,110+dist*(arcing?2.4:2.9));
  const H0=arcing?Math.min(16,dist*.16):0;
  await new Promise(res=>fx({dur,done:res,draw(p){
    const x=s.x+(e.x-s.x)*p,y=s.y+(e.y-s.y)*p-Math.sin(p*Math.PI)*H0;
    const vx=e.x-s.x,vy=(e.y-s.y)-Math.cos(p*Math.PI)*Math.PI*H0;
    drawProj(kind,x,y,vx,vy,p);
  }}));
  impact(e,kind,kind==='fireball');
  if(kind==='fireball'){shake(2,160);}
  if(t.id&&t.id!=='tile'){vis(t).kb={dx:Math.sign(e.x-s.x)*2*Q,dy:Math.sign(e.y-s.y)*2*Q,t0:NOW,dur:180*spd()};}
}
function drawProj(kind,x,y,vx,vy,p){
  const L=Math.hypot(vx,vy)||1,ux=vx/L,uy=vy/L;
  const trail=(cols,n,sz,glow)=>{for(let i=0;i<n;i++)part({x:x-ux*i*2+(Math.random()-.5)*2,y:y-uy*i*2+(Math.random()-.5)*2,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:260,cols,size:sz,shrink:true,glow});};
  if(kind==='arrow'){for(let i=0;i<7;i++)rect(x-ux*i,y-uy*i,1,1,i<2?'#ffffff':i>4?'#d84a3a':'#b08a5a');return;}
  if(kind==='knife'||kind==='axe'){const f=Math.floor(p*12)%4;const pts=[[[-2,0],[-1,0],[0,0],[1,0],[2,0]],[[-2,-2],[-1,-1],[0,0],[1,1],[2,2]],[[0,-2],[0,-1],[0,0],[0,1],[0,2]],[[2,-2],[1,-1],[0,0],[-1,1],[-2,2]]][f];
    for(const[dx,dy]of pts)rect(x+dx,y+dy,1,1,kind==='axe'?'#a8b0bc':'#e8eef4');if(kind==='axe')rect(x-1,y-1,2,2,'#6a7482');return;}
  if(kind==='lob'){rect(x-1,y-1,3,3,'#6a6a70');rect(x-1,y-1,1,1,'#a8a8b0');return;}
  const pal={fireball:ELEM.fire,frost:ELEM.frost,arcane:ELEM.arcane,holy:ELEM.holy,dark:ELEM.dark,necro:ELEM.necro,acid:ELEM.acid,web:ELEM.web}[kind]||ELEM.arcane;
  const r=kind==='fireball'?3:2;
  trail(pal.slice(1),kind==='fireball'?2:1,kind==='fireball'?2:1,true);
  ctx.globalAlpha=.35;rect(x-r-1,y-r-1,2*r+3,2*r+3,pal[2]);ctx.globalAlpha=1;
  rect(x-r,y-r+1,2*r+1,2*r-1,pal[2]);rect(x-r+1,y-r,2*r-1,2*r+1,pal[2]);rect(x-r+1,y-r+1,2*r-1,2*r-1,pal[1]);rect(x-1,y-1,2,2,pal[0]);
  if(kind==='frost'){rect(x-ux*4,y-uy*4,1,1,'#ffffff');}
}
async function beam(s,e,kind){
  const cols=kind==='lightning'?ELEM.lightning:ELEM.necro;
  await new Promise(res=>fx({dur:280,done:res,draw(p){
    ctx.globalAlpha=p<.7?1:(1-p)/.3;
    if(kind==='lightning'){const seg=8;let lx=s.x,ly=s.y;const seed=Math.floor(NOW/50);const r=mulberry(seed);
      for(let i=1;i<=seg;i++){const q=i/seg;const nx=s.x+(e.x-s.x)*q+(i<seg?(r()-.5)*10:0),ny=s.y+(e.y-s.y)*q+(i<seg?(r()-.5)*10:0);
        const n=Math.max(1,Math.round(Math.hypot(nx-lx,ny-ly)));for(let j=0;j<=n;j++){const xx=lx+(nx-lx)*j/n,yy=ly+(ny-ly)*j/n;rect(xx-1,yy-1,3,3,'rgba(255,240,120,.35)');rect(xx,yy,1,1,cols[0]);}lx=nx;ly=ny;}}
    else{const n=Math.max(1,Math.round(Math.hypot(e.x-s.x,e.y-s.y)));const w=Math.round(3-p*2);for(let j=0;j<=n;j+=1){const xx=s.x+(e.x-s.x)*j/n,yy=s.y+(e.y-s.y)*j/n;rect(xx-w,yy-w,2*w+1,2*w+1,'rgba(120,255,150,.25)');rect(xx-1,yy-1,2,2,j%3?cols[1]:cols[0]);}}
    ctx.globalAlpha=1;}}));
}
/* area blasts by kind */
function areaFx(C0,r,kind){
  const c={x:BX+C0.x*TS+TS/2,y:BY+C0.y*TS+TS/2};const rr=Math.min(r,7);
  const col={fire:'#ff8a20',force:'#b48aff',arcane:'#b48aff',holy:'#ffe890',ice:'#a8e8ff',web:'#e8f0f0',poison:'#9ae050',row:'#ff6a20'}[kind]||'#ffffff';
  fx({dur:420,draw(p){ctx.globalAlpha=(1-p)*.45;if(kind==='row')rect(BX,BY+C0.y*TS,COLS*TS,TS,col);else rect(BX+(C0.x-rr)*TS,BY+(C0.y-rr)*TS,(2*rr+1)*TS,(2*rr+1)*TS,col);ctx.globalAlpha=1;}});
  if(kind==='row'){for(let x=0;x<COLS;x++)setTimeout(()=>{const px=BX+x*TS+TS/2,py=BY+C0.y*TS+TS/2;burst(px,py,{n:14,speed:40,up:20,cols:ELEM.fire,life:600,size:2,shrink:true,drag:2,jit:TS*.6,glow:true});burst(px,py,{n:4,speed:8,up:20,cols:ELEM.smoke,life:1000,size:2,drag:1});},x*50*spd());shake(4,420);return;}
  const R=(rr+.5)*TS;
  if(kind==='fire'){shake(3.5,320);flashBoard('#ffb060',140,.25);
    burst(c.x,c.y,{n:40+rr*20,speed:R*2.2,cols:ELEM.fire,life:520,size:2,shrink:true,drag:3.2,glow:true});
    burst(c.x,c.y,{n:10+rr*6,speed:R*.6,up:14,cols:ELEM.smoke,life:1100,size:3,drag:1.5,jit:R});}
  else if(kind==='force'||kind==='arcane'){shake(2.5,260);ring(c,kind==='force'?'#d8c8ff':'#c890ff',R,320);ring(c,'#ffffff',R*.7,260);
    burst(c.x,c.y,{n:16+rr*10,speed:R*2,cols:kind==='force'?ELEM.earth:ELEM.arcane,life:420,size:1,shrink:true,drag:3});}
  else if(kind==='holy'){flashBoard('#fff4c0',160,.22);
    for(let y=C0.y-rr;y<=C0.y+rr;y++)for(let x=C0.x-rr;x<=C0.x+rr;x++){if(!inB(x,y))continue;const px=BX+x*TS+TS/2,py=BY+y*TS+TS/2;
      fx({dur:520,draw(p){ctx.globalAlpha=(1-p)*.7;const h=Math.round(TS*1.3*(p<.3?p/.3:1));rect(px-2,py+TS/2-h,4,h,'#fff4c0');rect(px-1,py+TS/2-h,2,h,'#ffffff');ctx.globalAlpha=1;}});
      burst(px,py,{n:4,speed:10,up:24,cols:ELEM.holy,life:700,size:1,drag:2,jit:TS*.5,glow:true});}}
  else if(kind==='ice'||kind==='web'){burst(c.x,c.y,{n:24+rr*12,speed:R*1.8,cols:kind==='ice'?ELEM.frost:ELEM.web,life:520,size:2,shrink:true,drag:3,glow:kind==='ice'});ring(c,kind==='ice'?'#c8f4ff':'#ffffff',R,300);}
  else if(kind==='poison'){for(let i=0;i<10+rr*8;i++){const a=Math.random()*Math.PI*2,d=Math.random()*R;part({x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d,vx:Math.cos(a)*8,vy:-6-Math.random()*6,life:900,cols:ELEM.poison,size:3,drag:1});}}
}
H.area=async(C,r,kind)=>{areaFx(C,r,kind);sfx(kind==='fire'||kind==='row'?'boom':kind==='ice'||kind==='web'?'ice':kind==='holy'?'holy':kind==='poison'?'acid':'thump');await sleep(320);};
H.tele=async(u)=>{const v=vis(u);const a=uc(u);burst(a.x,a.y,{n:16,speed:30,cols:ELEM.arcane,life:420,size:1,shrink:true,drag:2,glow:true});v.fade={t0:NOW,dur:160*spd(),out:true};sfx('whoosh');await sleep(170);
  v.fade={t0:NOW,dur:160*spd(),out:false};v.last={x:u.x*TS,y:u.y*TS};v.anim=null;const b=uc(u);burst(b.x,b.y,{n:16,speed:30,cols:ELEM.arcane,life:420,size:1,shrink:true,drag:2,glow:true});ring(b,'#c890ff',TS*.5,260);await sleep(120);};
H.death=async(u)=>{const v=vis(u);v.dying={t0:NOW,dur:420*spd()};v.flash=NOW+90*spd();
  const S=unitSprite(u,Q>1);const cols=u.undead?ELEM.bone:spriteCols(S);const c=uc(u);
  setTimeout(()=>{for(let i=0;i<(u.boss?60:26);i++){const col=cols[Math.floor(Math.random()*cols.length)];part({x:c.x+(Math.random()-.5)*TS*.55,y:c.y+(Math.random()-.5)*TS*.7,vx:(Math.random()-.5)*50,vy:-15-Math.random()*40,g:90,drag:.5,life:800+Math.random()*400,cols:[col,col,col],size:u.boss?2:(Math.random()<.5?2:1)});}},90*spd());
  if(u.boss){shake(6,700);flashBoard('#ffffff',220,.4);}else shake(u.kind==='pc'?3:2,200);
  await sleep(u.boss?520:280);};
H.pause=ms=>sleep(ms);
H.pop=(u,txt,cls)=>{popup(u,txt,cls);
  if(!live(u)&&!(VIS[u.id]&&VIS[u.id].dying))return;
  const c=uc(u);
  if(cls==='heal'){burst(c.x,c.y+4,{n:12,speed:10,up:26,cols:['#ffffff','#b8ffb0','#60d060'],life:800,size:1,drag:2,jit:TS*.6,glow:true});}
  else if(cls==='shield'){ring(c,'#8ac8ff',TS*.55,340);burst(c.x,c.y,{n:8,speed:16,cols:['#ffffff','#b0dcff','#60a0e0'],life:500,size:1,drag:2,glow:true});}
  else if(cls==='res'){sfx('gem');burst(c.x,c.y-6,{n:6,speed:14,up:12,cols:['#ffffff','#e0c8ff','#c090ff'],life:600,size:1,drag:2,glow:true});}
  else if(cls==='gold'){burst(c.x,c.y-6,{n:10,speed:22,up:18,cols:ELEM.holy,life:700,size:1,drag:2,glow:true});}
};
H.result=(t,r)=>{
  const lab=r.res===3?'CRIT!':r.res===2?'HIT':'GRAZE';
  popup(t,lab,'res'+r.res);
  if(r.res===3){sfx('crit');shake(4,300);flashBoard('#fff0c0',110,.3);const c=uc(t);burst(c.x,c.y,{n:18,speed:70,cols:ELEM.holy,life:480,size:2,shrink:true,drag:3,glow:true});}
  else sfx(r.res===2?'hit':'graze');
};
H.sfx=n=>sfx(n);
H.upd=()=>{};
H.spawn=u=>{const v=vis(u);v.dying=null;v.fade={t0:NOW,dur:300*spd(),out:false};v.last={x:u.x*TS,y:u.y*TS};v.anim=null;
  const c={x:BX+u.x*TS+TS/2,y:BY+u.y*TS+TS/2};burst(c.x,c.y+TS*.3,{n:12,speed:20,up:10,cols:u.undead?ELEM.bone:ELEM.smoke,life:600,size:2,drag:2,jit:TS*.5});};
H.save=()=>{if(typeof saveGame==='function')saveGame();};
H.turn=async u=>{
  const v=vis(u);v.last={x:u.x*TS,y:u.y*TS};
  B.pend=null;B.inspect=null;
  const c=uc(u);ring({x:c.x,y:c.y+TS*.25},u.side==='enemy'?'#ff8a6a':'#8ac0ff',TS*.6,420);
  if(isPlayer(u)){B.pi=defaultPower(u);B.page=Math.floor(B.pi/(PORT?4:(u.powers.length>8?7:8)));sfx('turn');B.toast={t0:NOW,dur:900,text:`${u.name}'s turn`,col:C.blue};}
  else{sfx('foeturn');B.toast={t0:NOW,dur:700,text:`${u.name}`,col:u.side==='enemy'?C.red:C.blue};await sleep(300);}
};
H.banner=async(kind,b,va)=>{
  if(kind==='round'){sfx('round');B.banner={t0:NOW,dur:1000*spd(),title:'ROUND '+G.round,sub:G.foeMom>0?`The foes gather momentum: ◆${G.foeMom}`:''};await sleep(780);}
  else if(kind==='villain'){shake(3,500);B.banner={t0:NOW,dur:2000*spd(),title:va.name,sub:va.desc,unit:b,villain:true};await sleep(1750);}
};
H.end=async o=>{
  await sleep(350);
  sfx(o==='win'?'victory':'defeat');
  B.banner={t0:NOW,dur:1500*spd(),title:o==='win'?'VICTORY!':'DEFEAT',sub:o==='win'?G.enc.title||'':'The company falls.',win:o==='win',lose:o!=='win'};
  if(o==='win'){for(const h of G.units.filter(x=>x.side==='hero'&&live(x))){const c=uc(h);burst(c.x,c.y,{n:22,speed:40,up:40,g:50,cols:ELEM.holy,life:1100,size:2,shrink:true,drag:1,glow:true});}}
  else{flashBoard('#400000',600,.4);}
  await sleep(1300);
  if(B.onEnd)B.onEnd(o);
};
function defaultPower(u){if(!u.powers||!u.powers.length)return 0;const i=u.powers.findIndex(id=>usable(u,POWERS[id])&&POWERS[id].tgt!=='self');return Math.max(0,i);}

/* Floating combat text. Damage and healing numbers are big; results and calls are small. Stacks upward. */
function popup(u,txt,cls){
  if(cls==='dmg'||cls==='crit')txt=String(txt).replace(/^-/,'');
  const col={dmg:C.white,crit:'#ffd040',heal:'#80ff80',shield:'#8ac8ff',gold:C.gold,call:C.parch,res:'#e0c8ff',bad:'#ff7060',res1:'#b8b0a0',res2:C.white,res3:'#ffd040'}[cls]||C.white;
  const big=cls==='dmg'||cls==='crit'||cls==='heal';const hh=big?13:8;
  let off=0;for(const f of FX)if(f.pop&&f.uid===u.id&&NOW-f.t0<520)off+=f.hh;
  const p0=uPos(u);const x=BX+p0.x+TS/2,y=BY+p0.y-3-off;
  const out=cls==='dmg'?'#4a0a0a':cls==='crit'?'#5a2400':cls==='heal'?'#0a3a0a':C.edge;
  fx({pop:true,uid:u.id,hh,dur:big?1150:900,draw(p){
    const rise=(1-Math.pow(1-p,3))*(big?12:9);
    const sc=big?2:1;const pop=big&&p<.07;
    const jx=cls==='crit'&&p<.2?Math.round((Math.random()-.5)*3):0;
    ctx.globalAlpha=p>.72?(1-p)/.28:1;
    text(txt,x+jx,Math.round(y-rise-(big?6:0)-(pop?2:0)),col,{al:'c',ol:out,sc:pop&&cls==='crit'?3:sc});
    ctx.globalAlpha=1;}});
}
/* ---------------- terrain (the classic look; terrain.js paints the hi-res one) ---------------- */
const GROUND=[
  {base:['#4e6a2c','#577530','#48642a','#5f7d37'],light:'#7e9c48',grid:'#2c3a18',tuft:['#3e5a24','#6a8a3a','#8cae4e'],flowers:['#f4e070','#f4f0e8','#e8706a','#b8a8f4'],pebble:['#8a8a78','#5e5e50'],
   high:['#6e8a44','#7c984e','#667f3e'],cliff:['#5a4a34','#46382a','#6e5a40','#2e241a'],water:['#2c5a86','#1e4266','#3a6e9e','#9ad0f0'],rough:'bramble'},
  {base:['#3e4636','#454d3c','#393f31','#4b5341'],light:'#5e6850',grid:'#22281e',tuft:['#343a2c','#56604a','#727c60'],flowers:['#9a7ab0','#c8a8d8'],pebble:['#7a7a70','#50504a'],
   high:['#5a6250','#646c58','#525a4a'],cliff:['#4a4a44','#383834','#5e5e56','#26261e'],water:['#2e3e3c','#222e2c','#3e5250','#8aa8a0'],rough:'bones'},
  {base:['#3c2e28','#44342c','#362822','#4c3a30'],light:'#5a463a',grid:'#1e1410',tuft:['#2a1e18','#5a4a42','#6a5a50'],flowers:[],pebble:['#6a5a52','#443a34'],
   high:['#5e4a3e','#6a5446','#544236'],cliff:['#3a2a22','#2a1e18','#4e3a2e','#1a100c'],water:['#5a1a0a','#3a0e06','#8a2a0a','#ffb040'],rough:'rubble'},
];
function buildTerrainLo(){
  const c=document.createElement('canvas');c.width=COLS*TS;c.height=ROWS*TS;const g=c.getContext('2d');
  const act=G.act,P=GROUND[act];const r=mulberry(G.enc.f*991+act*7+(G.enc.title||'').length*13);
  const px=(x,y,col)=>{g.fillStyle=col;g.fillRect(x,y,1,1);};
  const box=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  const rn=n=>Math.floor(r()*n),A=Q*Q;
  const ter=(x,y)=>inB(x,y)?G.tiles[K(x,y)].ter:'edge';
  const blob=(cx,cy,rad,col)=>{for(let y=-rad;y<=rad;y++)for(let x=-rad;x<=rad;x++){const d=(x*x+y*y)/(rad*rad);if(d<=1&&(d<.55||BAYER[((cy+y)&3)*4+((cx+x)&3)]>d*16-4))px(cx+x,cy+y,col);}};
  const tuft=(x,y)=>{px(x,y,P.tuft[0]);px(x-1,y-1,P.tuft[1]);px(x+1,y-1,P.tuft[1]);px(x,y-1,P.tuft[1]);if(Q>1){px(x-1,y-2,P.tuft[2]);px(x+1,y-3,P.tuft[2]);px(x,y-2,P.tuft[1]);}};
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    const X=tx*TS,Y=ty*TS,t=G.tiles[K(tx,ty)];
    box(X,Y,TS,TS,P.base[(tx+ty)%2?1:0]);
    for(let i=0;i<2+rn(2);i++)blob(X+2+rn(TS-4),Y+2+rn(TS-4),2+rn(3*Q),P.base[2+rn(2)]);
    for(let i=0;i<20*A;i++)px(X+rn(TS),Y+rn(TS),P.base[rn(4)]);
    if(act<2)for(let i=0;i<3*Q;i++)tuft(X+2+rn(TS-4),Y+4+rn(TS-6));
    if(act===0&&r()<.4){const fx=X+3+rn(TS-6),fy=Y+3+rn(TS-6),fc=P.flowers[rn(P.flowers.length)];px(fx,fy,fc);if(Q>1){px(fx+1,fy,fc);px(fx,fy+1,fc);px(fx+1,fy+1,'#fff8c0');px(fx,fy+2,P.tuft[0]);}}
    if(act===1&&r()<.5){const fx=X+3+rn(TS-6),fy=Y+3+rn(TS-6);for(let i=0;i<4;i++)px(fx+rn(4),fy+rn(3),P.flowers[rn(2)]);}
    if(r()<.5){const sx=X+3+rn(TS-8),sy=Y+3+rn(TS-6);box(sx,sy,2+rn(2),Q,P.pebble[0]);box(sx,sy+Q,2+rn(2),1,P.pebble[1]);}
    if(act===2){if(r()<.55){let x=X+rn(TS),y=Y+rn(TS);for(let i=0;i<7*Q;i++){px(x,y,'#241814');if(r()<.25)px(x,y,'#7a2a0a');x+=Math.round(r()*2-1);y+=Math.round(r()*2-1);if(x<X||x>=X+TS||y<Y||y>=Y+TS)break;}}
      if(r()<.3){const ex=X+4+rn(TS-8),ey=Y+4+rn(TS-8);px(ex,ey,'#c8400c');px(ex+1,ey,'#ff7a1a');}}
    if(t.ter==='high'){
      box(X,Y,TS,TS,P.high[0]);
      for(let i=0;i<2;i++)blob(X+3+rn(TS-6),Y+3+rn(TS-6),2+rn(2*Q),P.high[2]);
      for(let i=0;i<16*A;i++)px(X+rn(TS),Y+rn(TS),P.high[rn(3)]);
      if(act<2)for(let i=0;i<2*Q;i++)tuft(X+3+rn(TS-6),Y+5+rn(TS-10));
      const up=ter(tx,ty-1)==='high',dn=ter(tx,ty+1)==='high',lf=ter(tx-1,ty)==='high',rt=ter(tx+1,ty)==='high';
      if(!up){box(X,Y,TS,1,'rgba(255,255,220,.35)');box(X,Y+1,TS,1,'rgba(255,255,220,.12)');}
      if(!lf)box(X,Y,1,TS,'rgba(255,255,220,.18)');
      if(!rt)box(X+TS-1,Y,1,TS,'rgba(0,0,0,.3)');
      if(!dn){const ch=3*Q;const cy=Y+TS-ch;
        box(X,cy,TS,ch,P.cliff[0]);box(X,cy,TS,1,P.cliff[2]);box(X,Y+TS-1,TS,1,P.cliff[3]);
        for(let x=X;x<X+TS;x+=2+rn(3)){box(x,cy+1+rn(ch-2),1,1+rn(2),P.cliff[1]);if(r()<.4)px(x+1,cy+1,P.cliff[2]);}
        box(X,cy-1,TS,1,'rgba(0,0,0,.25)');}
    }
    if(t.ter==='water'){
      const W=P.water;box(X,Y,TS,TS,W[0]);
      for(let i=0;i<10*A;i++)px(X+rn(TS),Y+rn(TS),W[1]);
      for(let i=0;i<3*Q;i++){const x=X+2+rn(TS-8),y=Y+4+rn(TS-8);box(x,y,2+rn(4),1,W[2]);}
      const edge=(dx,dy)=>ter(tx+dx,ty+dy)!=='water';
      if(edge(0,-1)){box(X,Y,TS,Q+1,W[1]);for(let x=X;x<X+TS;x++)if((x+ty)%3)px(x,Y+Q+1,W[3]);}
      if(edge(0,1)){for(let x=X;x<X+TS;x++)if((x+ty)%2)px(x,Y+TS-2,W[3]);box(X,Y+TS-1,TS,1,W[2]);}
      if(edge(-1,0))for(let y=Y;y<Y+TS;y++)if((y+tx)%2)px(X+1,y,W[3]);
      if(edge(1,0))for(let y=Y;y<Y+TS;y++)if((y+tx)%2)px(X+TS-2,y,W[3]);
    }
    if(t.ter==='rough'){
      if(P.rough==='bramble'){box(X,Y,TS,TS,'rgba(30,40,10,.25)');for(let i=0;i<3;i++){const bx=X+5+rn(TS-10),by=Y+6+rn(TS-12),rad=2+rn(2)*Q/2;blob(bx,by,rad+1,'#1e2e10');blob(bx,by-1,rad,'#2e4418');for(let k=0;k<5;k++)px(bx-rad+rn(rad*2),by-rad+rn(rad*2),'#46602a');px(bx+1,by-1,'#c8303a');if(Q>1)px(bx-2,by+1,'#c8303a');px(bx+rad+1,by,'#5a4020');px(bx-rad-1,by-1,'#5a4020');}}
      else if(P.rough==='bones'){box(X,Y,TS,TS,'rgba(20,20,10,.2)');for(let i=0;i<9*Q;i++)px(X+rn(TS),Y+rn(TS),r()<.5?'#6a6a5a':'#8a8a78');
        for(let i=0;i<2;i++){const bx=X+4+rn(TS-12),by=Y+5+rn(TS-10);box(bx,by,3*Q,1,'#e0d8c0');px(bx-1,by-1,'#e0d8c0');px(bx-1,by+1,'#e0d8c0');px(bx+3*Q,by-1,'#e0d8c0');px(bx+3*Q,by+1,'#e0d8c0');box(bx,by+1,3*Q,1,'#8a8470');}
        if(r()<.5){const sx=X+6+rn(TS-14),sy=Y+6+rn(TS-14);box(sx,sy,5,4,'#e0d8c0');box(sx+1,sy+4,3,1,'#c8c0a8');px(sx+1,sy+1,'#2a2420');px(sx+3,sy+1,'#2a2420');px(sx+2,sy+3,'#6a6458');}}
      else{box(X,Y,TS,TS,'rgba(0,0,0,.15)');for(let i=0;i<4+rn(3);i++){const sx=X+2+rn(TS-8),sy=Y+3+rn(TS-8),w=2+rn(3)*Q/2,h=2+rn(2);box(sx,sy+h,w+1,1,'rgba(0,0,0,.4)');box(sx,sy,w,h,'#6a5a50');box(sx,sy,w,1,'#8a7a6e');px(sx+w-1,sy+h-1,'#4a3c34');}}
    }
    g.fillStyle=P.grid;g.globalAlpha=.4;g.fillRect(X,Y,TS,1);g.fillRect(X,Y,1,TS);g.globalAlpha=1;
  }
  // shadows cast by cliffs onto the ground below
  for(let ty=0;ty<ROWS-1;ty++)for(let tx=0;tx<COLS;tx++){if(ter(tx,ty)==='high'&&ter(tx,ty+1)!=='high'){box(tx*TS,(ty+1)*TS,TS,Q+1,'rgba(0,0,0,.28)');box(tx*TS,(ty+1)*TS+Q+1,TS,Q,'rgba(0,0,0,.12)');}}
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    const t=G.tiles[K(tx,ty)];if(!t.ob)continue;
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(tx*TS+3*Q,ty*TS+13*Q,10*Q,2*Q);g.fillRect(tx*TS+4*Q,ty*TS+15*Q,8*Q,Q);
    const S=Q>1?sprH(t.ob):spr(t.ob);g.drawImage((t.v||0)%2?S.f:S.c,tx*TS,ty*TS);
  }
  const W=COLS*TS,Hh=ROWS*TS;const vg=g.createRadialGradient(W/2,Hh/2,W*.35,W/2,Hh/2,Math.max(W,Hh)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.3)');g.fillStyle=vg;g.fillRect(0,0,W,Hh);
  return c;
}
/* One tongue of flame: outer red, orange body, yellow core, white tip. */
function flameTongue(cx,base,h,w,t,seed){
  const sway=Math.sin(t*7+seed)*w*.25;
  const layer=(hh,ww,col)=>{for(let i=0;i<hh;i++){const f=i/hh;const wd=Math.max(1,Math.round(ww*Math.pow(1-f,.75)));const x=Math.round(cx-wd/2+sway*f);rect(x,base-i,wd,1,col);}};
  layer(h,w,'#c8301a');layer(Math.round(h*.8),w-2,'#ff7a1a');layer(Math.round(h*.55),Math.max(2,w-4),'#ffc040');layer(Math.round(h*.28),Math.max(1,w-6),'#fff4c0');
}
function drawHazard(h,X,Y,k){
  const t=NOW/1000;const seed=(k*37)%11;const T=TS;
  if(h.t==='fire'){
    rect(X+3*Q,Y+12*Q,10*Q,3*Q,'#2a0e06');rect(X+4*Q,Y+12*Q,8*Q,Q,'#5a1a08');
    for(let i=0;i<4*Q;i++){const ex=X+4*Q+(i*5+seed)%(8*Q),on=Math.sin(t*6+i*1.9+seed)>0;rect(ex,Y+13*Q+(i%2),1,1,on?'#ff9a30':'#8a2a0a');}
    const hs=[7,10,8];[-4,0,4].forEach((dx,i)=>{const hh=Math.round((hs[i]+Math.sin(t*(9+i)+seed+i*2)*2.2)*Q);flameTongue(X+T/2+dx*Q,Y+13*Q,hh,(i===1?6:5)*Q/2+2,t,seed+i*1.7);});
    for(let i=0;i<3;i++){const ph=(t*1.2+i*.33+seed*.1)%1;rect(X+T/2+Math.sin(t*3+i*2)*5*Q/2,Y+10*Q-ph*12*Q,1,1,ph<.6?'#ffd060':'#ff7a20');}
  }else if(h.t==='lava'){
    rect(X,Y,T,T,'#3a0c04');rect(X+1,Y+1,T-2,T-2,'#8a1e06');
    for(let i=0;i<5*Q;i++){const a=t*.8+i*1.7+seed;const x=X+2+Math.floor((Math.sin(a)+1)*(T/2-3)),y=Y+2+Math.floor((Math.cos(a*.7+i)+1)*(T/2-3));rect(x,y,3,2,i%3?'#ff6a10':'#ffc040');if(i%4===0)rect(x+1,y,1,1,'#fff0b0');}
    for(let i=0;i<3*Q;i++){const x=X+2+(i*7+seed)%(T-6),y=Y+2+(i*11+seed*3)%(T-6);rect(x,y,4,2,'#3a0c04');rect(x,y,4,1,'#5a1a08');}
    const b=(t*.9+seed*.13)%1;if(b<.25){rect(X+T/2-1+seed%5,Y+T/2-2+seed%4,3,3,'#ffd060');}
    rect(X,Y,T,1,'#1a0602');ctx.globalAlpha=.15+.08*Math.sin(t*2+seed);rect(X,Y,T,T,'#ff8a20');ctx.globalAlpha=1;
  }else if(h.t==='acid'){
    const cx=X+T/2,cy=Y+T/2+Q;
    const pool=(rx,ry,col,dx,dy)=>{for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(1-(y*y)/(ry*ry)));rect(cx+dx-w,cy+dy+y,2*w+1,1,col);}};
    pool(6*Q,4*Q,'#16280a',0,0);pool(4*Q,3*Q,'#16280a',-3*Q,-2*Q);pool(3*Q,2*Q,'#16280a',4*Q,2*Q);
    pool(6*Q-1,4*Q-1,'#4a8a1a',0,0);pool(4*Q-1,3*Q-1,'#4a8a1a',-3*Q,-2*Q);pool(3*Q-1,2*Q-1,'#4a8a1a',4*Q,2*Q);
    pool(4*Q,2*Q,'#6ab02a',-Q,-Q);rect(cx-4*Q,cy-3*Q,4*Q,1,'#b8f070');rect(cx-4*Q,cy-3*Q+1,Q+1,1,'#e0ffb0');
    for(let i=0;i<3*Q;i++){const ph=(t*1.1+i*.37+seed*.1)%1;const bx=cx-4*Q+((i*5+seed)%(8*Q)),by=cy+2*Q-Math.floor(ph*4*Q);if(ph<.85)rect(bx,by,ph>.6?2:1,ph>.6?2:1,'#d8ffa0');else rect(bx-1,by,3,1,'rgba(216,255,160,.6)');}
    for(let i=0;i<2;i++){const ph=(t*.5+i*.5+seed*.07)%1;ctx.globalAlpha=(1-ph)*.3;rect(cx-3*Q+i*6*Q+Math.sin(t+i)*2,cy-4*Q-ph*8*Q,3,2,'#b8f070');ctx.globalAlpha=1;}
  }else if(h.t==='trap'){
    rect(X+3*Q,Y+10*Q,10*Q,2*Q,'rgba(0,0,0,.35)');
    rect(X+3*Q,Y+9*Q,10*Q,2*Q,'#5a5a62');rect(X+3*Q,Y+9*Q,10*Q,1,'#8a8a94');
    for(let i=0;i<5*Q;i++){const tx0=X+3*Q+i*2;rect(tx0,Y+7*Q,1,2*Q,i%2?'#c8c8d0':'#a8a8b0');rect(tx0,Y+11*Q,1,Q+1,i%2?'#c8c8d0':'#a8a8b0');}
    rect(X+7*Q,Y+9*Q,2*Q,2*Q,'#2a2a30');rect(X+7*Q,Y+9*Q,Q,Q,'#6a6a74');
    if(Math.floor(t*2+seed)%6===0)rect(X+5*Q,Y+7*Q,1,1,'#ffffff');
  }else if(h.t==='web'){
    ctx.globalAlpha=.8;const cx=X+T/2,cy=Y+T/2,e=T/2-2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;for(let d=0;d<e;d++)rect(Math.round(cx+Math.cos(a)*d),Math.round(cy+Math.sin(a)*d),1,1,'#e8eef0');}
    for(const rr of Q>1?[4,8,12]:[3,6]){let lx=null,ly=null;for(let i=0;i<=8;i++){const a=i*Math.PI/4;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;if(lx!=null){const n=Math.max(Math.abs(x-lx),Math.abs(y-ly));for(let j=0;j<=n;j++)rect(Math.round(lx+(x-lx)*j/n),Math.round(ly+(y-ly)*j/n+Math.sin(j)*0.5),1,1,'#c8d4d8');}lx=x;ly=y;}}
    ctx.globalAlpha=1;
  }
  if(h.dur>0){for(let i=0;i<h.dur;i++){rect(X+2+i*4,Y+2,3,3,C.edge);rect(X+3+i*4,Y+3,1,1,C.parch);}}
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
  if(undo()){for(const k in VIS)delete VIS[k];PARTS.length=0;FX.length=0;sfx('whoosh');flashBoard('#8ab8ff',180,.18);B.pend=null;B.inspect=null;B.vkey='';const u=playerUnit();if(u){B.pi=Math.min(B.pi,Math.max(0,(u.powers||[]).length-1));selfPend(u);}saveGame();}
}
function boardTap(x,y){
  if(!G||G.over)return;
  const t=unitAt(x,y);const k=t&&SZ(t)>1?K(t.x,t.y):K(x,y);
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
function tileAt(px,py){const x=Math.floor((px-OX)/(TS*BK)),y=Math.floor((py-OY)/(TS*BK));return inB(x,y)?{x,y}:null;}
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
  battleLayout();
  if(B.drag&&!PTR.down){B.drag=null;B.dragTile=null;B.dragPos=null;}
  if(B.gRef!==G){B.gRef=G;const key=TS+G.enc.title+G.enc.f+G.tiles.map(t=>(t.ob||'')+(t.ter||'')).join();if(key!==B.terrKey){B.terrKey=key;B.terr=buildTerrain();}}
  if(PORT){
    ctx.drawImage(stoneBG(),0,0);
    drawBoardFrame();
    drawTopBarP();drawInfoBarP();drawTurnPlate();drawHintP();drawTrayP();drawCtrlBar();
  }else{
    rect(0,0,SW,SH,C.bg);
    drawTop();drawLeft();drawRight();drawHotbar();
    rect(OX-2,OY-2,COLS*TS*BK+4,ROWS*TS*BK+4,C.edge);rect(OX-1,OY-1,COLS*TS*BK+2,ROWS*TS*BK+2,C.rim);
  }
  B.preview=null;const pu=playerUnit();if(pu&&B.pend&&pu.kind==='pc'){const pp=powerOf(pu,B.pi);if(pp){try{const rows=forecast(pu,pp,B.pend.T,B.pend.O);B.preview={};for(const r of rows)if(r.dmg&&r.t.side!==pu.side)B.preview[r.t.id]=r.dmg[1];}catch(e){}}}
  drawBoardLayer();
  if(PORT)drawForecastOverlay();
  if(B.banner)drawBanner();
}
/* Round, boss-surge and victory plates slide across the middle of the board. */
function drawBanner(){
  const b=B.banner;const p=(NOW-b.t0)/b.dur;if(p>=1){B.banner=null;return;}
  const bw=COLS*TS*BK,cx=OX+bw/2,cy=OY+Math.round(ROWS*TS*BK/2);
  const big=b.win||b.lose;const h=b.sub?(big?40:34):24;
  const inT=.14,outT=.86;const sl=p<inT?1-p/inT:p>outT?-(p-outT)/(1-outT):0;
  const x0=Math.round(sl*SW*.9);
  const plate=b.villain?['#3a0a08','#8a2a1a','#ff8a60']:b.lose?['#2a0606','#6a1a14','#ff6a5a']:b.win?['#3a2a08','#a07828','#fff0b0']:['#10182a','#3a4a7a','#c8d8ff'];
  ctx.globalAlpha=.55*(1-Math.abs(sl));rect(0,cy-h/2-6,SW,h+12,'#000');ctx.globalAlpha=1;
  const y=cy-h/2;
  rect(x0,y,SW,h,plate[0]);rect(x0,y,SW,1,plate[1]);rect(x0,y+h-1,SW,1,plate[1]);rect(x0,y+2,SW,1,plate[1]);rect(x0,y+h-3,SW,1,plate[1]);
  for(let i=0;i<SW;i+=6)rect(x0+i,y+1,3,1,plate[2]);
  const ty=y+(b.sub?5:7);
  if(b.unit){portrait(b.unit,x0+6,y+Math.floor((h-22)/2),22);}
  const tsc=big?3:(b.unit&&textW(b.title,2)>SW-70?1:2);const tcx=x0+SW/2+(b.unit?14:0);
  text(b.title,tcx,ty+(tsc===1?3:0),b.villain?'#ffb080':b.lose?'#ff8070':b.win?'#ffe070':C.gold,{al:'c',sc:tsc,ol:C.edge});
  if(b.sub){const sx=x0+(b.unit?32:8),sw=SW-(b.unit?40:16),sy=ty+(big?18:13);if(layoutRich(b.sub,sw,C.parch).length<=1&&!b.unit)text(b.sub.replace(/\{[a-z]:([^}]*)\}/g,'$1'),x0+SW/2,sy,C.parch,{al:'c'});else rich(b.sub,sx,sy,sw,C.parch,{nohit:true});}
}
function stoneBG(){
  const key='stone'+SW+'x'+SH;if(BGC[key])return BGC[key];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const r=mulberry(9);
  g.fillStyle='#120d0a';g.fillRect(0,0,SW,SH);
  for(let y=0;y<SH;y+=12){const off=(y/12)%2?9:0;for(let x=-off;x<SW;x+=18){const sh=['#17110d','#1a130f','#15100c'][Math.floor(r()*3)];g.fillStyle=sh;g.fillRect(x+1,y+1,16,10);g.fillStyle='#0c0806';g.fillRect(x,y,18,1);g.fillRect(x,y,1,12);g.fillStyle='rgba(255,230,200,.03)';g.fillRect(x+1,y+1,16,1);}}
  for(let i=0;i<SW*SH*.01;i++){g.fillStyle=r()<.5?'#1e1712':'#0e0a08';g.fillRect(Math.floor(r()*SW),Math.floor(r()*SH),1,1);}
  return BGC[key]=c;
}
/* Bronze frame around the board with corner studs. */
function drawBoardFrame(){
  const x=OX-3,y=OY-3,w=COLS*TS+6,h=ROWS*TS+6;
  rect(x-1,y-1,w+2,h+2,'rgba(0,0,0,.5)');
  rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,C.rim);rect(x+1,y+1,w-2,1,C.rim2);rect(x+1,y+1,1,h-2,'#8a6a40');rect(x+2,y+2,w-4,h-4,C.edge);
  for(const[cx,cy]of[[x,y],[x+w-4,y],[x,y+h-4],[x+w-4,y+h-4]]){rect(cx,cy,4,4,C.edge);rect(cx+1,cy+1,2,2,C.gold);rect(cx+1,cy+1,1,1,'#fff0b0');}
}
function drawTopBarP(){
  const E=G.enc,h=15;
  rect(0,0,SW,h,'#1a1310');rect(0,h-2,SW,1,'#2e241c');rect(0,h-1,SW,1,C.edge);
  const mb=15;button(SW-mb-2,1,mb,12,'≡',()=>openSettings(true),{});
  const rd=`ROUND ${G.round}`,rw=textW(rd)+10;let x=SW-mb-4-rw;
  chip(x,1,rw,12,'#241c16',C.rim);text(rd,x+rw/2,4,C.parch,{al:'c'});
  const fm=String(Math.max(0,G.foeMom)),fw=textW(fm)+16;x-=fw+2;
  chip(x,1,fw,12,'#2e1426','#8a3a6a');gem(x+3,3,'foe');text(fm,x+12,4,'#ffc8e0');
  hit(x,1,fw,12,{fn:openFoeMomInfo,id:'fm'});
  const ow=x-4;chip(2,1,ow,12,'#241c16',C.rim);
  text(fitText(objText(),ow-10),7,4,C.gold);
  hit(2,1,ow,12,{fn:openMissionInfo,id:'obj'});
}
function openMissionInfo(){const E=G.enc;msg(E.title||MISSIONS[E.type].name,`{g:${MISSIONS[E.type].name}.} `+(E.type==='boss'?BOSS_TXT[E.act]:MISSIONS[E.type].desc)+`\n\n{m:Objective: ${objText()}.}`);}
function openFoeMomInfo(){msg('FOE MOMENTUM',`The foes share one pool of momentum, shown as {r:◆${Math.max(0,G.foeMom)}}. It grows every round. They spend it on brutal attacks (advantage), their special attacks and, when it runs high, reinforcements.`);}
/* Name, health and momentum of the active (or inspected) unit. Tap for the full character sheet. */
const MOMSEEN={};
function drawInfoBarP(){
  const y=PL.infoY,h=PL.infoH,w=SW;
  rect(0,y,w,h,'#1c1512');rect(0,y+h-1,w,1,C.edge);rect(0,y,w,1,'#2e241c');
  const u=playerUnit(),insp=B.inspect?U(B.inspect):null;
  const show=insp&&(live(insp)||insp.dead)?insp:(activeUnit()||u);
  if(!show){text('Waiting…',w/2,y+9,C.mute,{al:'c'});return;}
  const foe=show.side==='enemy',pc=show.kind==='pc';
  portrait(show,2,y+1,h-2,{dead:!live(show)});
  const tx=h+2,rx=w-(insp?16:4);
  const nw=text(fitText(show.name,rx-tx-34),tx,y+3,foe?'#ff9a80':C.gold);
  statusRow(show,tx+nw+3,y+2,Math.floor((rx-tx-nw-40)/8));
  const hp=`${Math.max(0,show.hp)}/${show.maxHp}`;
  text(hp,rx,y+3,C.parch,{al:'r'});
  if(show.shield>0)text(`+${show.shield}⛨`,rx-textW(hp)-3,y+3,C.blue,{al:'r'});
  const gw=pc?61:0,bw=rx-tx-(pc?gw+3:0);
  const f=Math.max(0,show.hp)/show.maxHp;
  bar(tx,y+13,bw,7,f,foe?'#d04030':f>.5?'#50c050':f>.25?'#d8b030':'#d04030');
  if(pc){
    const ms=MOMSEEN[show.id];let gain=null;
    if(!ms||ms.n!==show.mom){MOMSEEN[show.id]={n:show.mom,t:ms&&show.mom>ms.n?NOW:(ms?ms.t:0),d:ms&&show.mom>ms.n?show.mom-ms.n:(ms?ms.d:0)};}
    const M=MOMSEEN[show.id];if(M.t&&NOW-M.t<700)gain={n:M.d,t:M.t};
    let cost=0;if(u===show&&!u.acted&&!insp){const p=powerOf(u,B.pi);if(p&&p.cost&&usable(u,p))cost=p.cost;}
    gemRow(rx-gw+1,y+13,show.mom,10,cost,gain);
    hit(rx-gw,y+11,gw,11,{fn:()=>openGloss('momentum'),id:'infomom'});
  }
  hit(0,y,rx-(pc?gw:0),h,{fn:()=>openUnitInfo(show),id:'infoline'});
  if(insp)button(w-14,y+6,12,12,'×',()=>{B.inspect=null;},{});
}
/* "ORIN'S TURN" plate in the space above the board. */
function drawTurnPlate(){
  const cur=activeUnit();
  if(!PL.plate||!cur||!live(cur))return;
  const foe=cur.side==='enemy';
  const t=(isPlayer(cur)?cur.name+"'s turn":cur.name).toUpperCase();
  const w=textW(t)+24,x=Math.floor((SW-w)/2),y=PL.plate.y;
  rect(x,y,w,11,C.edge);rect(x+1,y+1,w-2,9,foe?'#5a1a14':'#1a2e5a');rect(x+1,y+1,w-2,1,foe?'#a03a2a':'#4a6ab0');
  rect(x-4,y+5,4,1,foe?'#a03a2a':'#4a6ab0');rect(x+w,y+5,4,1,foe?'#a03a2a':'#4a6ab0');
  gem(x+3,y+2,foe?'foe':'full');gem(x+w-10,y+2,foe?'foe':'full');
  text(t,SW/2,y+3,foe?'#ffc0b0':'#d8e8ff',{al:'c'});
}
/* One or two lines of guidance above the powers. */
function hintLines(){
  const u=playerUnit(),au=activeUnit();
  if(G.over)return [G.result==='win'?'{g:Victory!}':'{r:Defeat.}'];
  if(!u){return au&&live(au)?[(au.side==='enemy'?'{r:':'{b:')+au.name+'} is acting…']:['…'];}
  if(u.kind==='npc')return ['Tap a blue square to move the captive, then {g:End Turn}.'];
  const p=powerOf(u,B.pi);const V=view();
  if(B.pend&&p)return [p.tgt==='enemy'?'Tap the target again or press {g:STRIKE}.':'Tap again or press {g:CONFIRM} to use it.',p.desc];
  if(u.acted){return V&&V.moves.size>1?['Move with your remaining steps, or {g:End Turn}.']:['Nothing left to do. Tap {g:End Turn}.'];}
  if(p&&!usable(u,p))return [`{r:${p.name} needs ◆${p.cost}.} You have ◆${u.mom}.`,'Pick another power, or move.'];
  if(p){
    const how=p.tgt==='enemy'?'Tap a red foe to attack, or a blue square to move.':p.tgt==='ally'?'Tap a green ally, or a blue square to move.':p.tgt==='tile'?(p.area!=null?'Tap an orange square to aim, or move.':'Tap a purple square, or move.'):'Tap the card again to use it, or move.';
    return [how,p.desc];
  }
  return ['Tap a blue square to move.'];
}
function drawHintP(){
  const y=PL.hintY,h=PL.hintH;
  rect(0,y,SW,h,'#16100d');
  const L=hintLines();
  const lines=h>=17?L.slice(0,2):L.slice(0,1);
  lines.forEach((l,i)=>{
    const one=layoutRich(l,SW-8,C.parch);
    const txt=one.length>1?fitRich(l,SW-10):l;
    rich(txt,4,y+2+i*8,SW-8,i?C.mute:C.parch,{nohit:true});
  });
  const u=playerUnit();if(u&&u.kind==='pc'){const p=powerOf(u,B.pi);if(p)hit(0,y,SW,h,{fn:()=>msg(p.name,powerText(p,u),null,200),id:'hint'});}
}
/* Truncate rich text to one line. */
function fitRich(s,w){let t=s;while(t.length>4&&layoutRich(t+'…',w,C.parch).length>1)t=t.slice(0,-1);
  const open=(t.match(/\{[a-z]:/g)||[]).length,close=(t.match(/\}/g)||[]).length;return t+(open>close?'}':'')+'…';}
function powerStat(u,p){
  const b=(u.attrs[p.a]||0)+(u.side==='hero'&&hasR('whetstone')?1:0);
  let a='';
  if(p.dmg&&!p.noDmg){const lo=p.dmg[0]+b,hi=p.dmg[2]+b;a=`${lo}-${hi}${p.hits>1?'×'+p.hits:''} dmg`;}
  else if(p.heal)a=`heal ${healAmt(u,p.heal)}`;
  else if(p.shield)a=`${p.shield}⛨`;
  else if(p.selfHeal)a=`heal ${p.selfHeal}`;
  let r='';
  if(p.tgt==='self')r=p.area!=null?(p.area>=99?'all allies':`${p.area*2+1}x${p.area*2+1}`):'self';
  else if(p.tgt==='tile')r=p.area!=null?`${p.area*2+1}x${p.area*2+1}`:`range ${p.range}`;
  else r=p.range===1?'melee':`range ${p.range}`;
  return a?a+' · '+r:r;
}
function drawTrayP(){
  const py=PL.trayY,ph=PL.trayH;
  rect(0,py,SW,ph,'#140e0b');rect(0,py,SW,1,C.edge);rect(0,py+1,SW,1,'#2e241c');
  const u=playerUnit();
  if(!u){const au=activeUnit();if(au&&live(au)){portrait(au,SW/2-11,py+Math.floor((ph-22)/2),22);}return;}
  if(u.kind==='npc'){rich('The captive can only move. Tap a blue square, then End Turn.',8,py+8,SW-16,C.parch);return;}
  const n=u.powers.length,per=4,pages=Math.ceil(n/per);B.page=clamp(B.page,0,Math.max(0,pages-1));
  const side=pages>1?11:0;
  const gap=3,pw=Math.floor((SW-6-gap-side)/2),phh=Math.floor((ph-5-gap)/2);
  const SWIPE={drag:()=>{},dragStart:(x)=>{B.swipe=x;},drop:(x)=>{const d=x-(B.swipe||x);if(d<-12)B.page=Math.min(pages-1,B.page+1);else if(d>12)B.page=Math.max(0,B.page-1);}};
  hit(0,py,SW,ph,Object.assign({id:'tray'},SWIPE));
  for(let sl=0;sl<per;sl++){
    const i=B.page*per+sl;const x=3+(sl%2)*(pw+gap),y=py+3+Math.floor(sl/2)*(phh+gap);
    if(i>=n){rect(x,y,pw,phh,'#110c09');frame(x,y,pw,phh,'#1e1712');continue;}
    powerPill(u,i,x,y,pw,phh);
    hit(x,y,pw,phh,Object.assign({fn:()=>cardTap(i),id:'card'+i},SWIPE));
  }
  if(pages>1){const bx=SW-side-1;button(bx,py+3,side-1,ph-6,'',()=>{B.page=(B.page+1)%pages;sfx('select');},{});
    text('▶',bx+side/2-1,py+ph/2-6,C.gold,{al:'c'});for(let i=0;i<pages;i++){rect(bx+3,py+ph/2+2+i*4,side-7,3,C.edge);rect(bx+4,py+ph/2+3+i*4,side-9,1,i===B.page?C.gold:C.dim);}}
}
function powerPill(u,i,x,y,w,h){
  const p=powerOf(u,i);const ok=usable(u,p)&&!u.acted;const on=i===B.pi;const afford=u.mom>=(p.cost||0);
  rect(x,y,w,h,C.edge);
  rect(x+1,y+1,w-2,h-2,on?'#4e3a18':ok?'#2c221a':'#1a1411');
  rect(x+1,y+1,w-2,1,on?'#c09040':ok?'#4e3e2e':'#241c16');
  rect(x+1,y+h-2,w-2,1,on?'#2a1e0c':'#140e0a');
  if(on){frame(x,y,w,h,C.gold);const a=.25+.2*Math.sin(NOW/200);ctx.globalAlpha=a;frame(x-1,y-1,w+2,h+2,C.gold);ctx.globalAlpha=1;}
  const ic=powerIcon(p);const iy=y+Math.floor((h-16)/2);
  if(!ok)ctx.globalAlpha=.4;ctx.drawImage(ic,x+2,iy);ctx.globalAlpha=1;
  const tx=x+20;const cw=p.cost?18:p.free?16:0;
  text(fitText(p.name,w-22-cw),tx,y+3,on?C.gold:ok?C.parch:C.dim);
  text(fitText(powerStat(u,p),w-22),tx,y+h-8,ok?(on?'#d8c8a0':C.mute):'#4a4038');
  if(p.cost){gem(x+w-17,y+2,afford?'full':'empty');text(String(p.cost),x+w-9,y+3,afford?'#e0c8ff':C.red);}
  else if(p.free)text('free',x+w-3,y+3,ok?C.green:C.dim,{al:'r'});
}
function drawTop(){
  rect(0,0,SW,12,C.panel);rect(0,11,SW,1,C.rim);rect(0,12,SW,1,C.edge);
  const E=G.enc;
  const obj=objText();
  text(MISSIONS[E.type].name.toUpperCase(),3,3,C.gold);
  const ow=textW(MISSIONS[E.type].name.toUpperCase());
  text('· '+obj,6+ow,3,C.parch);
  hit(0,0,160,12,{fn:openMissionInfo,id:'obj'});
  text('ROUND '+G.round,SW/2+36,3,C.parch,{al:'c'});
  const fm=Math.max(0,G.foeMom);text('Foes',SW-14-textW(String(fm)),3,C.mom,{al:'r'});gem(SW-12-textW(String(fm)),2,'foe');text(String(fm),SW-3,3,'#ffc8e0',{al:'r'});
  hit(SW-50,0,50,12,{fn:openFoeMomInfo,id:'fm'});
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
  ctx.drawImage(B.terr,BX,BY);
  const t=NOW/1000;
  for(let k=0;k<G.tiles.length;k++){const T0=G.tiles[k],X=BX+KX(k)*TS,Y=BY+KY(k)*TS;
    if(T0.ter==='water'){for(let j=0;j<Q;j++){const ph=Math.floor(t*3+k+j*2)%4;rect(X+3*Q+ph*2*Q+j*5,Y+6*Q+((k+j)%3)*3*Q,2*Q,1,'rgba(200,230,255,.5)');}}
    if(T0.haz)drawHazard(T0.haz,X,Y,k);}
  if(G.enc.zone.length){const zx=Math.min(...G.enc.zone.map(z=>z[0])),zy=Math.min(...G.enc.zone.map(z=>z[1]));const a=.5+.3*Math.sin(t*3);ctx.globalAlpha=a;frame(BX+zx*TS+1,BY+zy*TS+1,2*TS-2,2*TS-2,C.gold);frame(BX+zx*TS+3,BY+zy*TS+3,2*TS-6,2*TS-6,C.gold2);ctx.globalAlpha=1;}
  if(G.enc.type==='breakout')for(let x=0;x<COLS;x++){ctx.globalAlpha=.45+.25*Math.sin(t*4+x);text('↑',BX+x*TS+TS/2-1,BY+3*Q,C.gold,{al:'c'});ctx.globalAlpha=1;}
  if(G.enc.type==='rescue')for(let x=0;x<COLS;x++){ctx.globalAlpha=.35+.2*Math.sin(t*4+x);text('↓',BX+x*TS+TS/2-1,BY+(ROWS-1)*TS+TS/2-2,C.green,{al:'c'});ctx.globalAlpha=1;}
  for(const k of G.chests){const ic=Q>1?iconH('treasure'):icon('treasure');ctx.drawImage(ic,BX+KX(k)*TS+3*Q-1,BY+KY(k)*TS+3*Q+Math.round(Math.sin(t*3+k)*Q));}
  for(const z of G.zones){const col={poison:'#9ae050',holy:'#ffe890',arcane:'#b48aff'}[z.fx]||'#b48aff';ctx.globalAlpha=.18+.08*Math.sin(t*3);rect(BX+(z.x-z.r)*TS,BY+(z.y-z.r)*TS,(2*z.r+1)*TS,(2*z.r+1)*TS,col);ctx.globalAlpha=1;}
  for(const k in G.walls){ctx.drawImage((Q>1?sprH('icewall'):HIRES?sprM('icewall'):spr('icewall')).c,BX+KX(+k)*TS,BY+KY(+k)*TS);}
  drawHighlights();
  drawPath();
  const us=G.units.filter(u=>live(u)||(VIS[u.id]&&VIS[u.id].dying&&NOW-VIS[u.id].dying.t0<VIS[u.id].dying.dur)).sort((a,b)=>a.y-b.y);
  const cur=activeUnit();
  if(cur&&live(cur)){const p=uPos(cur);const X=BX+p.x,Y=BY+p.y;const a=Math.floor(t*4)%2;const c=C.gold;const L=2+Q;const bs=TS*SZ(cur);
    for(const[dx,dy,sx,sy]of[[0,0,1,1],[bs-L,0,-1,1],[0,bs-L,1,-1],[bs-L,bs-L,-1,-1]]){rect(X+dx-a*sx,Y+dy+(sy<0?L-1:0)-a*sy,L,1,c);rect(X+dx+(sx<0?L-1:0)-a*sx,Y+dy-a*sy,1,L,c);}}
  for(const u of us)drawUnit(u);
  if(B.drag){const u=U(B.drag.id);if(u&&B.dragPos){const S=unitSprite(u,Q>1);ctx.globalAlpha=.8;ctx.drawImage(S.c,Math.round((B.dragPos.x-OX)/BK+BX-TS/2),Math.round((B.dragPos.y-OY)/BK+BY-TS*.75));ctx.globalAlpha=1;}}
  if(B.flash){const p=(NOW-B.flash.t0)/(B.flash.dur*spd());if(p>=1)B.flash=null;else{ctx.globalAlpha=B.flash.a*(1-p);rect(BX,BY,COLS*TS,ROWS*TS,B.flash.col);ctx.globalAlpha=1;}}
  if(B.toast&&PORT&&PL.plate)B.toast=null;
  if(B.toast){const p=(NOW-B.toast.t0)/B.toast.dur;if(p>=1)B.toast=null;else{ctx.globalAlpha=Math.min(1,(1-p)*3);const w=textW(B.toast.text)+10;rect(BX+COLS*TS/2-w/2,BY+1,w,9,'rgba(10,6,4,.8)');text(B.toast.text,BX+COLS*TS/2,BY+3,B.toast.col,{al:'c'});ctx.globalAlpha=1;}}
}
function drawUnit(u){
  const v=vis(u);const p=uPos(u);const X=BX+p.x,Y=BY+p.y;const n=SZ(u),W=TS*n;
  let a=1;
  if(v.dying){const q=(NOW-v.dying.t0)/v.dying.dur;a=Math.max(0,1-q*1.4);}
  if(v.fade){const q=(NOW-v.fade.t0)/v.fade.dur;if(q>=1)v.fade=null;else a*=v.fade.out?1-q:q;}
  if(u.hidden)a*=.5;
  const flash=v.flash&&NOW<v.flash;
  const idle=!v.anim&&!v.dying&&live(u);
  const seed=u.id.charCodeAt(u.id.length-1);
  if(u.tiny){
    // a swarm: one small critter per quarter of its health, each bobbing on its own beat
    const S=HIRES?sprM(MON[u.type].art):spr(MON[u.type].art);const k=live(u)?alive4(u):Math.max(1,Math.ceil(u.tiny/2));const h=TS/2;
    const spots=[[1,1],[h-1,2],[2,h-1],[h-2,h-2]];
    for(let i=0;i<k;i++){const[dx,dy]=spots[i];const b=idle&&Math.floor(NOW/(260+i*70)+i+seed)%2?1:0;const f=(seed+i)%2;
      ctx.globalAlpha=a*.35;rect(X+dx+2*Q,Y+dy+h-2,h-4*Q,2,'#000');ctx.globalAlpha=a;
      ctx.drawImage(flash?S.wh:f?S.f:S.c,X+dx,Y+dy-b,h,h);}
  }else{
    ctx.globalAlpha=a*.4;rect(X+3*Q*n,Y+W-3*Q,W-6*Q*n,3*Q,'#000');rect(X+4*Q*n,Y+W-3*Q-1,W-8*Q*n,1,'#000');ctx.globalAlpha=a;
    const ring=sideRing(u);rect(X+4*Q*n,Y+W-2*Q+1,W-8*Q*n,1,ring);rect(X+3*Q*n,Y+W-2*Q,Q,1,ring);rect(X+W-3*Q*n-Q,Y+W-2*Q,Q,1,ring);
    const S=unitSprite(u,Q>1);
    const bob=idle&&Math.floor(NOW/520+(seed%3))%2?1:0;
    ctx.drawImage(flash?S.wh:S.c,X,Y-Q+bob);
  }
  if(u.caged){ctx.globalAlpha=a*.9;for(let i=0;i<5;i++)rect(X+(2+i*3)*Q,Y+Q,Q>1?2:1,14*Q,'#6a6a70');rect(X+Q,Y+Q,14*Q,Q,'#8a8a90');rect(X+Q,Y+14*Q,14*Q,Q,'#8a8a90');}
  ctx.globalAlpha=1;
  if(!live(u))return;
  // health bar, with the damage a pending attack would do blinking on it (minions just get a pip)
  if(u.minion){rect(X+TS/2-3,Y+TS-3,6,4,C.edge);rect(X+TS/2-2,Y+TS-2,4,2,'#e05040');}
  else{
    const f=Math.max(0,u.hp)/u.maxHp,bw=W-4*Q,bx=X+2*Q,by=Y+W-2;
    rect(bx,by,bw,Q>1?4:3,C.edge);
    const fw=Math.max(1,Math.round((bw-2)*f));
    const hcol=u.side==='enemy'?(f>.5?'#e05040':'#ff8a50'):(f>.5?'#60d060':f>.25?'#e0c040':'#e05040');
    rect(bx+1,by+1,fw,Q>1?2:1,hcol);
    if(u.tiny)for(let i=1;i<u.tiny;i++)rect(bx+1+Math.round((bw-2)*i/u.tiny),by+1,1,Q>1?2:1,C.edge);
    const pv=B.preview&&B.preview[u.id];
    if(pv){const lw=Math.min(fw,Math.round((bw-2)*pv/u.maxHp));if(Math.floor(NOW/180)%2)rect(bx+1+fw-lw,by+1,lw,Q>1?2:1,'#ffffff');}
  }
  if(u.shield>0){const ic=statusIcon('shield');if(ic)ctx.drawImage(ic,X+W-8,Y+W-10);}
  const sts=unitStatuses(u).filter(k=>k!=='shield');
  sts.slice(0,3).forEach((k,i)=>{const ic=statusIcon(k);if(ic)ctx.drawImage(ic,X+W-7,Y-1+i*7);});
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
  const tcol=!p?'#e84030':p.tgt==='enemy'?'#e84030':p.tgt==='ally'?'#50d060':p.tgt==='tile'&&p.area!=null?'#ffa040':'#c080ff';
  V.zone.forEach(k=>{if(!V.moves.has(k)&&!V.targets.has(k)){ctx.globalAlpha=.25;rect(BX+KX(k)*TS+TS/2-1,BY+KY(k)*TS+TS/2-1,2,2,tcol);ctx.globalAlpha=1;}});
  V.moves.forEach(n=>{if(n.x===u.x&&n.y===u.y)return;if(unitAt(n.x,n.y))return;tileRect(n.x,n.y,n.prov?'#a070ff':'#4a90f0',.26);});
  if(p&&p.tgt!=='self')V.targets.forEach((os,k)=>{const o=p.tgt!=='tile'&&unitAt(KX(k),KY(k));if(o&&SZ(o)>1)foot(o,o.x,o.y).forEach(f=>tileRect(f.x,f.y,tcol,.32));else tileRect(KX(k),KY(k),tcol,p.tgt==='tile'?.18:.32);});
  if(B.pend&&p){
    const T=B.pend.T;const a=.35+.15*Math.sin(NOW/150);
    if(p.area!=null){const C0=p.tgt==='self'?u:T;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(cheb({x,y},C0)<=p.area&&!(p.tgt==='self'&&x===u.x&&y===u.y))tileRect(x,y,'#ffa040',a);}
    if(p.wall)for(const dx of[-1,0,1])if(inB(T.x+dx,T.y))tileRect(T.x+dx,T.y,'#a8e8ff',a);
    const tu=p.tgt!=='tile'&&unitAt(T.x,T.y),bs=TS*(tu?SZ(tu):1);const X=BX+(tu?tu.x:T.x)*TS,Y=BY+(tu?tu.y:T.y)*TS;const k=Math.round(1+Math.sin(NOW/110)*1.5),L=5+Q;const rc=p.tgt==='ally'?'#90ff90':'#ffffff';
    for(const[dx,dy,sx,sy]of[[0,0,1,1],[bs-1,0,-1,1],[0,bs-1,1,-1],[bs-1,bs-1,-1,-1]]){rect(X+dx+(sx<0?-L+1:0)-k*sx,Y+dy-k*sy,L,1,rc);rect(X+dx-k*sx,Y+dy+(sy<0?-L+1:0)-k*sy,1,L,rc);}
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
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];const x1=BX+a.x*TS+TS/2-1,y1=BY+a.y*TS+TS/2-1,x2=BX+b.x*TS+TS/2-1,y2=BY+b.y*TS+TS/2-1;
    const minx=Math.min(x1,x2),miny=Math.min(y1,y2);rect(minx,miny,Math.abs(x2-x1)+2,Math.abs(y2-y1)+2,C.edge);rect(minx,miny,Math.abs(x2-x1)+2,Math.abs(y2-y1)+2,col);}
  const e=path[path.length-1];const m=TS/2-3;rect(BX+e.x*TS+m,BY+e.y*TS+m,6,6,C.edge);rect(BX+e.x*TS+m+1,BY+e.y*TS+m+1,4,4,col);
}
function drawLeft(){
  const px=0,py=PORT?PL.infoY:13,pw=PORT?SW:95,ph=PORT?PL.infoH:133;
  const u=playerUnit();
  const insp=B.inspect?U(B.inspect):null;
  panel(px,py,pw,ph,{});
  if(B.pend&&u&&!insp){drawForecast(u,px+4,py+3,pw-8,ph-6);return;}
  const show=insp&&(live(insp)||insp.dead)?insp:(activeUnit()||u);
  if(!show){text('Waiting…',px+pw/2,py+ph/2,C.mute,{al:'c'});return;}
  drawUnitCard(show,px+4,py+3,pw-8,ph-7,!!insp);
}
function drawForecastOverlay(){
  const u=playerUnit();if(!u||!B.pend||B.inspect)return;
  const h=92,y=B.pend.T.y<3?OY+ROWS*TS-h-2:OY+2;
  ctx.globalAlpha=.95;panel(2,y,SW-4,h,{});ctx.globalAlpha=1;
  drawForecast(u,6,y+3,SW-12,h-6);
}
function drawUnitCard(u,x,y,w,h,closable){
  inset(x,y,34,34,'#15100c');
  ctx.drawImage(cardSprite(u,true).c,x+1,y+1);
  hit(x,y,34,34,{fn:()=>openUnitInfo(u),id:'cardspr'});
  text(u.name,x+37,y+1,u.side==='enemy'?'#ff9a80':C.gold);
  text(unitSub(u),x+37,y+8,C.mute);
  bar(x+37,y+16,w-37,5,u.hp/u.maxHp,u.side==='enemy'?'#d04030':'#50c050');
  text(`${Math.max(0,u.hp)}/${u.maxHp}`,x+37,y+23,C.parch);
  let by=y+37;
  if(u.kind==='pc'){let cost=0;const pu=playerUnit();if(pu===u&&!u.acted){const p=powerOf(u,B.pi);if(p&&p.cost&&usable(u,p))cost=p.cost;}gemRow(x,by,u.mom,10,cost);hit(x,by,62,8,{fn:()=>openGloss('momentum'),id:'cmom'});by+=10;}
  if(closable){button(x+w-9,y-1,9,8,'×',()=>{B.inspect=null;},{});}
  const body=unitBody(u,false);
  const bh=richH(body,w-4);
  scrollArea('card',x,by,w,h-(by-y)-1,bh,(yy,clip)=>rich(body,x+1,yy,w-4,C.parch,{clip}));
}
function forcedPreview(u,p,t,O){
  const eff=p.eff||{};const n=(tv(eff.push,2)||tv(eff.pull,2));if(!n||t.object)return '';
  const from=p.tgt==='enemy'?O:(p.tgt==='self'?O:B.pend.T);
  let x=t.x,y=t.y,m=n+pushExtra(u)-(t.steady||0);const hz=[];
  for(let i=0;i<m;i++){let dx=x-from.x,dy=y-from.y;if(eff.pull){dx=-dx;dy=-dy;}let sx=0,sy=0;if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)sx=Math.sign(dx);else if(dy!==0)sy=Math.sign(dy);else break;
    const nx=x+sx,ny=y+sy;if(eff.pull&&nx===from.x&&ny===from.y)break;if(!inB(nx,ny)||blocked(nx,ny)||unitAt(nx,ny)){if(!eff.pull)hz.push('slam');break;}x=nx;y=ny;const h=Tt(x,y).haz;if(h&&hazDmg(t,h))hz.push(HAZ[h.t].name.toLowerCase());}
  return hz.length?`{o:On a hit: ${eff.pull?'pulled':'pushed'} into ${[...new Set(hz)].join(', ')}!}`:'';
}
function drawForecast(u,x,y0,w,h){
  const p=powerOf(u,B.pi);const P=B.pend;const rows=forecast(u,p,P.T,P.O);const r=rows[0];
  const wide=w>=150;let y=y0;
  const bxw=wide&&r&&r.dmg?90:0,lw=w-bxw;
  ctx.drawImage(powerIcon(p),x,y);
  text(fitText(p.name,lw-22),x+19,y+1,C.gold);
  if(p.cost){gem(x+19,y+8,'full');text(String(p.cost),x+27,y+9,'#e0c8ff');}else text(p.free?'free action':'no cost',x+19,y+9,C.mute);
  y+=19;
  const tgt=r&&r.t;
  if(tgt){portrait(tgt,x,y,16);text(fitText(tgt.name,lw-20),x+19,y+1,tgt.side===u.side?'#90e890':'#ff9a80');
    text(`HP ${tgt.hp}/${tgt.maxHp}`+(rows.length>1?`  +${rows.length-1} more`:''),x+19,y+9,C.mute);y+=19;}
  else{text(p.tgt==='self'||p.area!=null?'No one in the area.':'',x,y,C.mute);y+=10;}
  let body='';
  if(r&&r.dmg){
    const labels=['GRAZE','HIT','CRIT'];const bx0=wide?x+w-87:x,by=wide?y0:y;
    for(let i=0;i<3;i++){const bx=bx0+i*29;const best=r.probs[i]===Math.max(...r.probs);
      rect(bx,by,27,30,C.edge);rect(bx+1,by+1,25,28,i===2?'#3e2c0e':'#1e1712');rect(bx+1,by+1,25,1,i===2?'#8a6a2a':'#3a2e24');if(best)frame(bx,by,27,30,i===2?C.gold:C.rim2);
      text(labels[i],bx+14,by+3,i===2?C.gold:i===1?C.parch:C.mute,{al:'c'});
      text(r.ctrl?'—':String(r.dmg[i]),bx+14,by+10,i===2?'#ffd040':C.white,{al:'c',sc:2,sh:C.edge});
      text(Math.round(r.probs[i]*100)+'%',bx+14,by+22,i===2?'#ffe8a0':C.parch,{al:'c'});}
    if(!wide)y+=33;
    const kp=killP(r);
    const at=u.attrs[p.a]||0,extra=r.mod-2*r.net-at;
    body+=`Roll 3d6 {w:${r.mod>=0?'+':''}${r.mod}}{m: (${ATTR[p.a]} ${at>=0?'+':''}${at}${extra?`, relic +${extra}`:''}${r.net?`, ${r.net>0?'+':''}${r.net*2} from ${r.net>0?'advantage':'disadvantage'}`:''})}${kp>0?`  {r:☠ ${Math.round(kp*100)}% kill}`:''}\n`;
    if(r.pro.length)body+=r.pro.map(s=>`{h:+ ${s}}`).join('  ')+'  ';
    if(r.con.length)body+=r.con.map(s=>`{r:− ${s}}`).join('  ');
    if(r.pro.length||r.con.length)body+='\n';
    const fp=forcedPreview(u,p,tgt,P.O);if(fp)body+=fp+'\n';
  }else if(r){
    body+=(r.heal?`Heals {h:${r.heal}}. `:'')+(r.shield?`Shield {b:${r.shield}}. `:'')+(r.empower?'Blessed. ':'')+(r.refresh?'Takes an extra turn. ':'')+'\n';
  }
  if(P.O&&P.O.prov)body+=`{r:! Moving there provokes ${P.O.prov} parting blow${P.O.prov>1?'s':''}.}\n`;
  if(P.O&&P.O.haz)body+=`{o:! The path crosses a hazard.}\n`;
  body+=p.desc;
  y=Math.max(y,wide&&r&&r.dmg?y0+33:y);
  const bot=y0+h-15;
  const bh=richH(body,w-2);
  scrollArea('fc',x,y,w,bot-2-y,bh,(yy,clip)=>rich(body,x+1,yy,w-3,C.parch,{clip}));
  button(x,bot,w-27,13,p.tgt==='enemy'?'STRIKE':'CONFIRM',confirmPend,{hot:true,disabled:B.busy});
  button(x+w-25,bot,25,13,'×',()=>{B.pend=null;},{});
}
function drawCtrlBar(){
  const y=PL.ctrlY,h=PL.ctrlH,pu=playerUnit();
  const bs=[['↶ UNDO',undoUI,{disabled:B.busy||!canUndo()}],['LOG',openLog,{}],['TURNS',openOrder,{}]];
  const bw=Math.floor((SW-4)*.2)+1;
  bs.forEach((b,i)=>button(2+i*(bw+2),y,bw,h,b[0],b[1],b[2]));
  const ex=2+3*(bw+2),done=!!pu&&turnDone(pu);
  button(ex,y,SW-2-ex,h,pu?'END TURN':'…',endTurnUI,{hot:!!pu,disabled:!pu||B.busy,glow:done});
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
  const py=PORT?PL.trayY:146,ph=PORT?PL.trayH:34;
  panel(0,py,SW,ph,{});
  const u=playerUnit();const au=activeUnit();
  if(!u){const t=au&&live(au)?`${au.name} is acting…`:'';text(t,SW/2,py+ph/2-3,C.mute,{al:'c'});return;}
  if(u.kind==='npc'){rich('The captive can only move. Tap a blue square, then End Turn.',8,py+8,SW-16,C.parch);return;}
  const pcw=Math.floor((SW-8)/4);
  const cols=PORT?4:8,rowsN=1,cw=PORT?pcw-2:38,chh=PORT?29:28,x0=PORT?4:4,y0=PORT?py+3:149,sx=PORT?pcw:39,sy=31;
  const slots=cols*rowsN;
  const n=u.powers.length;const per=PORT?4:(n>slots?slots-1:slots);const pages=Math.ceil(n/per);B.page=Math.min(B.page,pages-1);
  const start=B.page*per;
  const SWIPE=PORT?{drag:()=>{},dragStart:(x)=>{B.swipe=x;},drop:(x)=>{const d=x-(B.swipe||x);if(d<-12)B.page=Math.min(pages-1,B.page+1);else if(d>12)B.page=Math.max(0,B.page-1);}}:{};
  if(PORT)hit(0,py,SW,ph,Object.assign({id:'tray'},SWIPE));
  for(let i=start;i<Math.min(n,start+per);i++){
    const p=powerOf(u,i);const slot=i-start;const x=x0+(slot%cols)*sx,y=y0+Math.floor(slot/cols)*sy;
    const ok=usable(u,p)&&!u.acted;const on=i===B.pi;
    rect(x,y,cw,chh,C.edge);rect(x+1,y+1,cw-2,chh-2,on?'#4a3818':ok?'#2e241c':'#1e1814');rect(x+1,y+1,cw-2,1,on?'#a07828':ok?'#5a4632':'#2a221c');
    if(on){frame(x,y,cw,chh,C.gold);}
    if(!ok)ctx.globalAlpha=.4;ctx.drawImage(powerIcon(p),x+2,y+2);ctx.globalAlpha=1;
    if(p.cost){gem(x+cw-15,y+2,u.mom>=p.cost?'full':'empty');text(String(p.cost),x+cw-7,y+3,u.mom>=p.cost?'#e0c8ff':C.red);}
    else if(p.free)text('free',x+cw-2,y+3,ok?C.green:C.dim,{al:'r'});
    text(fitText(p.name,cw-4),x+cw/2,y+chh-8,on?C.gold:ok?C.parch:C.dim,{al:'c',sh:C.edge});
    hit(x,y,cw,chh,Object.assign({fn:()=>cardTap(i),id:'card'+i},SWIPE));
  }
  if(PORT){
    if(pages>1&&!PL.compact){for(let i=0;i<pages;i++){const dx=SW/2-(pages*6)/2+i*6;rect(dx,y0+chh+3,4,4,C.edge);rect(dx+1,y0+chh+4,2,2,i===B.page?C.gold:C.dim);hit(dx-1,y0+chh+1,6,8,{fn:()=>{B.page=i;},id:'dot'+i});}}
    return;}
  if(pages>1){const sl=slots-1;button(x0+(sl%cols)*sx,y0+Math.floor(sl/cols)*sy,cw,chh,`${B.page+1}/${pages} ▶`,()=>{B.page=(B.page+1)%pages;},{});}
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
  scrollTo('order',0);
  openModal({closable:true,draw(){
    dim();const w=Math.min(200,SW-8),h=PORT?SH-24:164,x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);panel(x,y,w,h,{title:'TURN ORDER'});
    text('Initiative: d20 + Finesse, highest first.',x+w/2,y+9,C.mute,{al:'c'});
    const list=upcoming(24);const RH=26;let ch=0;let lr=G.round;for(const e of list){if(e.round!==lr){ch+=11;lr=e.round;}ch+=RH;}
    scrollArea('order',x+5,y+18,w-9,h-38,ch,(yy,clip)=>{let cy=yy,lr2=G.round;
      for(const e of list){
        if(e.round!==lr2){rect(x+10,cy+5,w-20,1,C.dim);const t=' ROUND '+e.round+' ';rect(x+w/2-textW(t)/2,cy+2,textW(t),7,C.panel);text(t,x+w/2,cy+3,C.mute,{al:'c'});cy+=11;lr2=e.round;}
        const u=e.u,foe=u.side==='enemy';
        if(cy+RH>=clip[0]&&cy<=clip[1]){
          if(e.now){rect(x+6,cy,w-15,RH-2,'#3e3018');frame(x+6,cy,w-15,RH-2,C.gold);}else rect(x+6,cy,w-15,RH-2,'#1e1713');
          portrait(u,x+8,cy+1,22);
          text(u.name,x+33,cy+3,e.now?C.gold:foe?'#ff9a80':C.parch);
          text(e.now?'NOW':e.extra?'EXTRA TURN':'Init '+u.init,x+w-12,cy+3,e.now?C.gold:C.mute,{al:'r'});
          const f=Math.max(0,u.hp)/u.maxHp;bar(x+33,cy+12,54,6,f,foe?'#d04030':'#50c050');text(`${Math.max(0,u.hp)}/${u.maxHp}`,x+90,cy+12,C.parch);
          statusRow(u,x+w-12-Math.min(4,unitStatuses(u).length)*8,cy+11,4);
          hit(x+6,Math.max(cy,clip[0]),w-15,RH-2,{fn:()=>openUnitInfo(u),id:'ord'+cy});
        }
        cy+=RH;
      }});
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{hot:true});
  }});
}
function openLog(){
  const lines=G.log.slice().reverse();
  const col=c=>c==='e'?'#ffb0a0':c==='h'?'#b8d8ff':c==='g'?C.gold:C.parch;
  scrollTo('log',0);
  openModal({closable:true,draw(){
    dim();const w=Math.min(280,SW-8),h=SH-12,x=Math.floor((SW-w)/2),y=6;panel(x,y,w,h,{title:'BATTLE LOG'});
    let ch=0;const hs=lines.map(l=>{const hh=richH(l.m,w-24)+3;ch+=hh;return hh;});
    scrollArea('log',x+6,y+9,w-10,h-28,ch,(yy,clip)=>{let cy=yy;lines.forEach((l,i)=>{if(cy+hs[i]>=clip[0]&&cy<=clip[1])rich(l.m,x+10,cy,w-24,col(l.c),{clip});cy+=hs[i];});});
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{});
  }});
}
