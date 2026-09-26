'use strict';
/* =====================================================================
   EMBERWATCH — character sheets and power cards
   Laid out in sections instead of one paragraph: header, momentum,
   attributes and skills, trait, conditions, powers.
   ===================================================================== */
const POSS={she:'her',he:'his',they:'their'};
function secHead(label,x,y,w,col){
  const tw=textW(label),cx=x+Math.floor(w/2);
  const l0=x,l1=Math.round(cx-tw/2-4),r0=Math.round(cx+tw/2+4),r1=x+w;
  rect(l0,y+3,Math.max(0,l1-l0),1,C.rim);rect(r0,y+3,Math.max(0,r1-r0),1,C.rim);
  rect(l1-2,y+2,2,3,C.rim2);rect(r0,y+2,2,3,C.rim2);
  text(label,cx,y,col||C.gold,{al:'c'});
  return 10;
}
/* ---------- power text pieces ---------- */
function powerReach(p){
  if(p.tgt==='self')return p.area!=null?(p.area>=99?'Every ally':`Around you, ${p.area*2+1}x${p.area*2+1}`):'Yourself';
  if(p.tgt==='tile')return `Range ${p.range}`+(p.area!=null?`, ${p.area*2+1}x${p.area*2+1} area`:'');
  if(p.tgt==='ally')return p.noSelf?`Another ally within ${p.range}`:`Ally within ${p.range}`;
  return p.range===1?'Melee':`Range ${p.range}`;
}
function powerDmgLine(p,u){
  const b=u?(u.attrs[p.a]||0)+(u.side==='hero'&&hasR('whetstone')?1:0):0;
  if(p.dmg&&!p.noDmg){const d=p.dmg.map(v=>v+b);
    return `{m:Graze} {w:${d[0]}} {m:·} {m:Hit} {w:${d[1]}} {m:·} {m:Crit} {w:${d[2]}}${p.hits>1?` {w:×${p.hits}}`:''}${u?'':' {m:+ '+ATTR[p.a]+'}'}${p.radiant?' radiant':''}`;}
  if(p.heal)return `{h:Heals ${u?healAmt(u,p.heal):p.heal+(p.c==='cleric'?' + Presence':'')}}`+(p.shield?` {b:and ${p.shield} shield}`:'');
  if(p.shield)return `{b:${p.shield} shield}`;
  return '';
}
function powerDesc(p){
  let s=p.desc;
  const et=effText(p.eff);if(et&&!/on a hit|on a crit/i.test(p.desc)&&!Object.keys(p.eff).some(k=>p.desc.toLowerCase().includes(EFF_NAME[k])))s+=' '+et;
  return s;
}
function powerBlockH(p,u,w){const dl=powerDmgLine(p,u);return 21+(dl?LINE_H:0)+richH(powerDesc(p),w-4)+3;}
/* A power as a card: icon, name, cost, reach, damage by result and what it does. Returns its height. */
function powerBlock(p,u,x,y,w,o){
  o=o||{};const h=powerBlockH(p,u,w);
  if(!o.bare){rect(x,y,w,h,'#1c1512');rect(x,y,w,1,'#2e241c');rect(x,y+h-1,w,1,C.edge);}
  inset(x+1,y+1,20,20,'#100b08');ctx.drawImage(powerIcon(p),x+3,y+3);
  const cw=p.cost?20:p.free?20:0;
  text(fitText(p.name,w-26-cw),x+24,y+3,C.gold);
  if(p.cost){const poor=!!(u&&G&&G.units&&G.units.includes(u)&&u.mom<p.cost);gem(x+w-19,y+2,poor?'empty':'full');text(String(p.cost),x+w-11,y+3,poor?C.red:'#e0c8ff');}
  else if(p.free)text('free',x+w-3,y+3,C.green,{al:'r'});
  text(fitText(`${powerReach(p)} · ${ATTR[p.a]}${p.free?' · free action':''}`,w-26),x+24,y+11,C.mute);
  let cy=y+22;
  const dl=powerDmgLine(p,u);if(dl){rich(dl,x+3,cy,w-6,C.parch,{clip:o.clip,nohit:!!o.nohit});cy+=LINE_H;}
  rich(powerDesc(p),x+3,cy,w-6,C.parch,{clip:o.clip,nohit:!!o.nohit});
  if(o.fn)hit(x,y,w,h,{fn:o.fn,id:o.id||'pb'+p.id+y});
  return h;
}
/* ---------- monster attacks ---------- */
function monActLines(A){
  if(A.tgt==='ally')return {sub:`Ally within ${A.range}`,dmg:`{h:Heals ${A.heal}}`,desc:''};
  if(A.rally)return {sub:'Nearby allies',dmg:'',desc:'Every ally beside a hero strikes it at once.'};
  if(A.mom)return {sub:'Itself',dmg:'',desc:`Takes 3 damage to give the foes ${A.mom} momentum.`};
  if(A.trap)return {sub:`Range ${A.range}`,dmg:'',desc:`${A.trap==='trap'?'Hides a snare':'Sets fire'} on a square. Every ${A.cd} rounds.`};
  const sub=(A.range===1?'Melee':`Range ${A.range}`)+(A.area?`, ${A.area*2+1}x${A.area*2+1} area`:'')+(A.a?` · ${ATTR[A.a]}`:'');
  const dmg=A.flat!=null?`{w:${A.flat}} damage, never rolls`:`{m:Graze} {w:${A.dmg[0]}} {m:·} {m:Hit} {w:${A.dmg[1]}} {m:·} {m:Crit} {w:${A.dmg[2]}}`;
  const desc=(effText(A.eff)+(A.hazard?` Leaves ${A.hazard==='web'?'web':A.hazard}.`:'')).trim();
  return {sub,dmg,desc};
}
function monActH(A,w){const L=monActLines(A);return 21+(L.dmg?LINE_H:0)+(L.desc?richH(L.desc,w-4):0)+3;}
function monActBlock(A,x,y,w,o){
  o=o||{};const L=monActLines(A);const h=monActH(A,w);
  rect(x,y,w,h,'#1c1512');rect(x,y,w,1,'#2e241c');rect(x,y+h-1,w,1,C.edge);
  inset(x+1,y+1,20,20,'#100b08');ctx.drawImage(monActIcon(A),x+3,y+3);
  text(fitText(A.name,w-44),x+24,y+3,'#ffb0a0');
  if(A.cost){gem(x+w-19,y+2,'foe');text(String(A.cost),x+w-11,y+3,'#ffc8e0');}
  text(fitText(L.sub,w-26),x+24,y+11,C.mute);
  let cy=y+22;
  if(L.dmg){rich(L.dmg,x+3,cy,w-6,C.parch,{clip:o.clip});cy+=LINE_H;}
  if(L.desc)rich(L.desc,x+3,cy,w-6,C.parch,{clip:o.clip});
  return h;
}
/* ---------- the sheet ---------- */
function momRules(u){
  const Cc=CLASSES[u.cls],P=POSS[Cc.pro]||'their',hero=u.side==='hero';
  const L=[`+${TUNE.momTurn+(hero&&hasR('map')?1:0)} at the start of each of ${P} turns.`].concat(Cc.mom);
  L.push(`Starts each battle with ${TUNE.momStart+(hero&&hasR('hymn')?2:0)}. Holds up to 10.`);
  return L;
}
function attrTiles(a,x,y,w,clip){
  const tw=Math.floor((w-6)/4);
  ['M','F','W','P'].forEach((k,i)=>{
    const tx=x+i*(tw+2);
    rect(tx,y,tw,22,C.edge);rect(tx+1,y+1,tw-2,20,'#241b15');rect(tx+1,y+1,tw-2,1,'#3a2e24');
    text(ATTR[k].toUpperCase(),tx+tw/2,y+3,C.mute,{al:'c'});
    const v=a[k];text((v>0?'+':'')+v,tx+tw/2,y+11,v>=3?C.gold:v>0?C.white:C.parch,{al:'c',sc:2,sh:C.edge});
    if(!clip||(y>=clip[0]&&y+22<=clip[1]))hit(tx,y,tw,22,{fn:()=>openGloss(ATTR[k].toLowerCase()),id:'at'+k+y});
  });
  return 24;
}
/* Lays out (and draws) a unit's sheet. Returns its height. */
function sheetLayout(u,x,y,w,clip,o){
  o=o||{};let cy=y;
  const pc=u.kind==='pc',m=u.kind==='mon'?mon(u):null,foe=u.side==='enemy';
  // header
  portrait(u,x,cy,38,{dead:u.dead});
  const nm=u.name.toUpperCase();const big=textW(nm,2)<=w-44;
  text(big?nm:fitText(u.name,w-44),x+42,cy+1,foe?'#ffb0a0':C.gold,big?{sc:2,ol:C.edge}:{});
  const sub=pc?`Level ${u.lvl} ${CLASSES[u.cls].title} · ${CLASSES[u.cls].role}${u.rival?' · rival':''}`:m?m.role+(u.leader?' · chief':'')+(m.undead?' · undead':''):'Ally';
  text(fitText(sub,w-44),x+42,cy+(big?13:10),C.mute);
  const f=Math.max(0,u.hp)/u.maxHp;
  bar(x+42,cy+21,w-44-textW(`${u.maxHp}/${u.maxHp}`)-4,6,f,foe?'#d04030':'#50c050');
  text(`${Math.max(0,u.hp)}/${u.maxHp}`,x+w,cy+21,C.parch,{al:'r'});
  const stats=[`Speed ${G&&!o.plain&&live(u)?effSpeed(u):u.speed}`];
  if(G&&!o.plain&&u.init!=null)stats.push(`Initiative ${u.init}`);
  if(u.steady)stats.push(`Steadfast ${u.steady}`);
  if(u.shield>0)stats.push(`{b:Shield ${u.shield}}`);
  rich(stats.join(' · '),x+42,cy+30,w-44,C.parch,{clip});
  cy+=42;
  if(o.classInfo&&pc){const Cc=CLASSES[u.cls];cy+=rich(`Health ${Cc.hp}, +${Cc.grow} per level. {g:${ATTR[Cc.prime]}} rises at levels 4, 7 and 10; ${ATTR[Cc.second]} at 6 and 11.`,x,cy,w,C.parch,{clip})+4;}
  // conditions
  const sts=unitStatuses(u).filter(k=>k!=='shield');
  if(sts.length&&G&&!o.plain){
    cy+=secHead('CONDITIONS',x,cy,w,C.red);
    for(const k of sts){const g=GLOSS[{slow:'slow',root:'root',prone:'prone',daze:'daze',weak:'weak',bleed:'bleed',burn:'burn',expose:'expose',mark:'mark',bless:'bless',hidden:'hidden'}[k]];
      const ic=statusIcon(k);if(ic)ctx.drawImage(ic,x,cy);
      const hh=rich(`{w:${g?g.name:k}.} `+(g?g.text:''),x+10,cy,w-10,C.parch,{clip});cy+=Math.max(9,hh)+2;}
    if(u.st.mark&&u.marker&&G&&U(u.marker)){cy+=rich(`{m:Marked by ${U(u.marker).name}.}`,x+10,cy,w-10,C.parch,{clip})+2;}
    cy+=3;
  }
  if(pc){
    // momentum
    cy+=secHead('MOMENTUM',x,cy,w,C.mom);
    if(!o.plain){gemRow(x,cy,u.mom||0,10);text(`${u.mom||0} / 10`,x+64,cy+1,'#e0c8ff');cy+=10;}
    for(const l of momRules(u)){gem(x+1,cy,'full');cy+=Math.max(9,rich(l,x+10,cy+1,w-10,C.parch,{clip}))+1;}
    cy+=rich('Spend momentum on powers that show a {p:◆} cost.',x,cy+1,w,C.mute,{clip})+5;
    // attributes & skills
    cy+=secHead('ATTRIBUTES',x,cy,w);
    cy+=attrTiles(u.attrs,x,cy,w,clip)+2;
    const Cc=CLASSES[u.cls];const sk=Object.keys(SKILLS);const colW=Math.floor((w-4)/2);
    sk.forEach((k,i)=>{const t=Cc.skills.includes(k);const v=u.attrs[SKILLS[k]]+(t?2:0);const sx=x+(i%2)*(colW+4),sy=cy+Math.floor(i/2)*8;
      if(t)rect(sx,sy+2,2,2,C.gold);text(k,sx+4,sy,t?C.gold:C.parch);text((v>=0?'+':'')+v,sx+colW,sy,t?C.gold:C.mute,{al:'r'});});
    cy+=Math.ceil(sk.length/2)*8+2;
    cy+=rich('{g:Gold} skills are trained (+2). Skills are tested on the road.',x,cy,w,C.mute,{clip})+5;
    // trait
    const tr=Cc.trait,ci=tr.indexOf(':');
    cy+=secHead('TRAIT',x,cy,w);
    const rest=tr.slice(ci+1).trim();cy+=rich(`{g:${tr.slice(0,ci)}.} `+rest[0].toUpperCase()+rest.slice(1),x,cy,w,C.parch,{clip})+5;
    // powers
    cy+=secHead(`POWERS (${u.powers.length})`,x,cy,w);
    for(const id of u.powers){cy+=powerBlock(POWERS[id],u,x,cy,w,{clip})+3;}
  }else if(m){
    cy+=secHead('ATTRIBUTES',x,cy,w);
    cy+=attrTiles(u.attrs||m.attrs,x,cy,w,clip)+4;
    const acts=m.acts;
    if(acts.length){cy+=secHead(acts.length>1?'ATTACKS':'ATTACK',x,cy,w,'#ff9a80');for(const A of acts)cy+=monActBlock(A,x,cy,w,{clip})+3;cy+=2;}
    const notes=[];
    if(m.note)notes.push(m.note);
    if(m.fireproof&&m.id!=='dragon')notes.push('Immune to fire and burning.');
    if(m.minion)notes.push('Minion: any hit slays it. Its attacks never roll.');
    if(m.tiny)notes.push('Swarm: attacked as one foe, takes double damage from area attacks. Its attacks never roll.');
    if(m.sz>1&&!/Large/.test(m.note||''))notes.push('Large: fills a 2×2 block.');
    if(notes.length){cy+=secHead('TRAITS',x,cy,w);cy+=rich(notes.join(' '),x,cy,w,C.parch,{clip})+5;}
    if(m.va){cy+=secHead('BOSS SURGES',x,cy,w,C.red);cy+=rich('On rounds 1, 3 and 5 it unleashes:',x,cy,w,C.mute,{clip})+1;
      for(const v of m.va){cy+=rich(`{r:${VA[v].name}.} ${VA[v].desc}`,x,cy,w,C.parch,{clip})+2;}cy+=3;}
    if(m.act>=0&&o.found)cy+=rich(`{m:Found in ${ACTS[m.act].sub}.}`,x,cy,w,C.parch,{clip})+4;
  }else{
    cy+=rich(u.caged?'Caged. A hero must stand beside the cage to free them.':u.npc==='wagon'?'Keep it standing until the end of round 5.':'Lead them to the bottom edge. Foes will hunt them.',x,cy,w,C.parch,{clip})+4;
  }
  return cy-y;
}
/* The character sheet window. */
function openUnitInfo(u,o){
  o=o||{};scrollTo('uinfo',0);
  openModal({closable:true,draw(){
    dim();const w=Math.min(236,SW-8),h=PORT?SH-16:SH-12,x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);
    panel(x,y,w,h,{title:u.name.toUpperCase()});
    const cw=w-16;let ch=this.ch||400;
    scrollArea('uinfo',x+6,y+8,w-10,h-28,ch,(yy,clip)=>{this.ch=sheetLayout(u,x+8,yy+2,cw-2,clip,o)+6;});
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{hot:true});
  }});
}
/* A stand-in unit for a monster type (compendium, skirmish setup). */
function monSheetUnit(k){const m=MON[k];return {id:'mon_'+k,kind:'mon',type:k,side:'enemy',name:m.name,hp:m.hp,maxHp:m.hp,speed:m.speed,attrs:m.attrs,steady:m.steady||0,st:{},shield:0,boss:!!m.boss};}
