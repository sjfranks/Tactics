'use strict';
/* =====================================================================
   ROGUE TACTICS — journey screens (Core Rules chapter 4): rewards and power drafts, the Camp, events and checks,
   dramatic tasks, negotiations and the smith
   ===================================================================== */

/* A list to pick from, in a window. items: [{l, sub, v, dis}] */
function pickList(title,items,pick,o){
  o=o||{};scrollTo('plist',0);
  openModal({closable:true,draw(){
    dim();const w=Math.min(o.w||210,SW-12),rowH=o.rowH||24,h=Math.min(SH-24,items.length*rowH+34),x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);
    panel(x,y,w,h,{title});
    scrollArea('plist',x+5,y+12,w-9,h-32,items.length*rowH,(yy,clip)=>{items.forEach((it,i)=>{const cy=yy+i*rowH;
      rect(x+6,cy,w-14,rowH-2,it.dis?'#141010':'#241a12');frame(x+6,cy,w-14,rowH-2,it.dis?C.edge:C.rim);
      text(fitText(it.l,w-24),x+10,cy+4,it.dis?C.dim:C.gold);if(it.sub){const L=wrap(it.sub,w-24);L.slice(0,Math.max(1,Math.floor((rowH-12)/7))).forEach((l,j)=>text(l,x+10,cy+12+j*7,C.mute));}
      if(!it.dis&&cy+rowH>clip[0]&&cy<clip[1])hit(x+6,cy,w-14,rowH-2,{fn:()=>{closeModal();sfx('select');pick(it.v);},id:'pl'+i});});});
    button(x+w/2-30,y+h-17,60,13,'CANCEL',closeModal,{});
  }});
}
/* Pick a power to discard when a hero's slots are full. */
function askDiscard(h,then){
  pickList(`${CLASSES[h.cls].name.toUpperCase()}: SLOTS FULL`,h.powers.map(id=>({l:POWERS[id].name,sub:`Discard it. ${RARITY[POWERS[id].rar]||''} ${POWERS[id].passive?'passive':'active'}.`,v:id})),then);
}
const heroName=cls=>CLASSES[cls].name;
const hpCol=f=>f>.5?'#50c050':f>.25?'#d8b030':'#d04030';
/* The party along the bottom: health, hit dice and Wounds. */
function partyStrip(y){
  const L=RUN.heroes,hw=Math.floor(SW/L.length);
  rect(0,y,SW,SH-y,'rgba(12,8,6,.92)');rect(0,y,SW,1,C.rim);
  L.forEach((h,i)=>{const x=i*hw;const u=heroSheetUnit(h);
    if(h.dead){ctx.globalAlpha=.35;portrait(u,x+3,y+3,18);ctx.globalAlpha=1;text('dead',x+23,y+6,C.red);return;}
    portrait(u,x+3,y+3,18);hit(x,y,hw,SH-y,{fn:()=>openUnitInfo(u,{plain:true}),id:'ps'+i});
    const f=h.hp/effMaxHp(h);bar(x+23,y+4,hw-26,4,f,hpCol(f));text(`${h.hp}`,x+23,y+10,C.parch);
    text(`⚅${h.hd}`,x+hw-3,y+10,'#8ad0ff',{al:'r'});if(h.wounds)text('✚'.repeat(Math.min(3,h.wounds)),x+23,y+17,C.red);});
}
function stripH(){return 26;}

/* ---------------- rewards ---------------- */
const REW={sel:null,offers:null};
function rewardCardH(s,o,w){
  if(s==='draft'||o.id){const p=POWERS[o.id];const u=heroSheetUnit(heroOf(o.cls));return Math.max(40,powerBlockH(p,u,w-34)+18);}
  if(o.draft)return 40;
  if(o.weapon)return 28+richH(weaponText(weaponData(o.weapon)),w-12)+6;
  return 28+richH(RELICS[o].desc,w-12)+6;
}
function drawSummary(P){
  const head=P.kind==='boss'?'TRIUMPH':'VICTORY';
  text(head,SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  const x=6,w=SW-12,y=24,ph=Math.min(SH-stripH()-22-y,(REW.sumH||100)+10);
  panel(x,y,w,ph,{});
  scrollArea('sum',x+4,y+4,w-8,ph-8,REW.sumH||100,(yy,clip)=>{let cy=yy+2;const tw=w-16;
    if(P.gold){const g=`+${P.gold} gold`;coin(x+6,cy);text(g,x+16,cy,C.gold);cy+=10;}
    if(P.xp)cy+=rich(`{b:+${P.xp} XP} for a${P.diff==='easy'||P.diff==='extreme'?'n':''} ${(DIFF[P.diff]||DIFF.medium).name} battle (${RUN.xpBank} XP waiting). XP becomes levels at a Camp: every ${TUNE.xpLvl} XP is a level.`,x+6,cy,tw,C.parch,{clip})+4;
    cy+=rich(`{g:+${P.vic} ${P.vic>1?'Victories':'Victory'}} (${RUN.vic} since the last Camp). Every hero starts a battle with momentum equal to the Victories, up to 3.`,x+6,cy,tw,C.parch,{clip})+4;
    for(const n of P.notes||[])cy+=rich(n,x+6,cy,tw,C.parch,{clip})+3;
    if(P.who&&P.who.length)cy+=rich(`{g:Power drafts:} every hero picks 1 of 3 powers${P.kind==='boss'?', with at least one Rare':', with at least one Uncommon'}.`,x+6,cy,tw,C.parch,{clip})+3;
    cy+=rich('{m:Out of battle, spend hit dice to heal (EQUIP, then HEAL). A Camp refills them.}',x+6,cy,tw,C.parch,{clip})+3;
    REW.sumH=cy-yy+4;});
  partyStrip(SH-stripH());
  button(SW/2-40,SH-stripH()-18,80,15,'CONTINUE',()=>{takeReward(null);if(!nextRewardStep())finishRewards();},{hot:true,glow:true});
}
const REWARD_SCREEN={draw(){
  ctx.drawImage(stoneBG(),0,0);drawEmbers('#6a3a1a');
  const P=RUN.pending;const s=nextRewardStep();if(!s){finishRewards();return;}
  button(SW-52,4,48,13,'EQUIP',()=>openEquip(),{});
  if(s==='summary'){drawSummary(P);return;}
  const head=P.kind==='treasure'?'TREASURE':P.kind==='camp'?'CAMP':P.kind==='event'?'FORTUNE':P.kind==='boss'?'TRIUMPH':'VICTORY';
  text(head,SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let ty=22;
  const d=s==='draft'?draftHero():null;
  if(d){const h=d.h;text(`${heroName(h.cls).toUpperCase()}'S POWER DRAFT`,SW/2,ty,C.gold,{al:'c'});ty+=8;
    text(fitText(`Level ${h.lvl} · slots ${h.powers.length} of ${slotsOf(h)}${h.powers.length>=slotsOf(h)?' (full: learning replaces one)':''}`,SW-8),SW/2,ty,C.mute,{al:'c'});ty+=10;}
  else{const title=s==='weapon'?'CHOOSE A WEAPON':s==='loot'?'CHOOSE YOUR SPOILS':'CHOOSE A RELIC';ty+=2;secHead(title,6,ty,SW-12);ty+=12;}
  const offers=P.offers;const w=PORT?SW-12:Math.floor((SW-12-(offers.length-1)*4)/offers.length);
  const bottom=SH-33;
  let ch=0;for(const o of offers)ch+=rewardCardH(s,o,w)+4;
  if(REW.offers!==offers){REW.offers=offers;REW.sel=null;}
  const done=()=>{if(P.note){toast(P.note);P.note=null;}if(!nextRewardStep())finishRewards();};
  const take=o=>{
    if(s==='draft'){const h=heroOf(o.cls);if(h.powers.length>=slotsOf(h)){askDiscard(h,drop=>{sfx('learn');REW.sel=null;takeReward(o,drop);done();});return;}sfx('learn');}
    else sfx('chest');
    REW.sel=null;takeReward(o);done();};
  const drawCard=(o,i,x,y,cw,clip)=>{const h=rewardCardH(s,o,cw);const on=REW.sel===i;
    panel(x,y,cw,h,{fill:on?'#2e2410':'#1e1612',rim:on?C.gold:undefined});
    if(on){const a=.3+.25*Math.sin(NOW/180);ctx.globalAlpha=a;frame(x-1,y-1,cw+2,h+2,C.gold);ctx.globalAlpha=1;}
    if(!clip||(y+h>=clip[0]&&y<=clip[1]))hit(x,Math.max(y,clip?clip[0]:y),cw,clip?Math.min(y+h,clip[1])-Math.max(y,clip[0]):h,{fn:()=>{REW.sel=i;sfx('select');},id:'offer'+i});
    if(o.id){const p=POWERS[o.id];const u=heroSheetUnit(heroOf(o.cls));
      portrait(u,x+5,y+5,22);text(p.c==='gen'?'GENERAL':CLASSES[o.cls].title.toUpperCase(),x+16,y+29,C.mute,{al:'c'});
      const rc=p.rar==='R'?'#ffb040':p.rar==='U'?'#8ad0ff':C.mute;text({C:'Common',U:'Uncom.',R:'Rare'}[p.rar]||'',x+16,y+37,rc,{al:'c'});
      powerBlock(p,u,x+30,y+5,cw-34,{bare:true,clip});}
    else if(o.draft){inset(x+5,y+5,20,20,'#100b08');ctx.drawImage(icon16('star'),x+7,y+7);text('Power draft',x+30,y+7,C.gold);text(fitText(`${heroName(o.draft)} picks 1 of 3 powers.`,cw-36),x+30,y+15,C.mute);}
    else if(o.weapon){const W=weaponData(o.weapon);inset(x+5,y+5,20,20,'#100b08');ctx.drawImage(weaponArt(o.weapon),x+7,y+7);text(W.name,x+30,y+7,C.gold);text(`${CLASSES[W.cls].name}'s weapon · tier ${W.tier}`,x+30,y+15,C.mute);rich(weaponText(W),x+6,y+28,cw-12,C.parch,{clip});}
    else{inset(x+5,y+5,20,20,'#100b08');ctx.drawImage(relicArt(o),x+7,y+7);text(RELICS[o].name,x+30,y+7,C.gold);text('Relic · '+(RUN.gear.length<2?'equips now':'goes in your pack'),x+30,y+15,C.mute);rich(RELICS[o].desc,x+6,y+28,cw-12,C.parch,{clip});}
    return h;};
  if(PORT){scrollArea('rew',6,ty,SW-10,bottom-ty-2,ch,(yy,clip)=>{let y=yy;offers.forEach((o,i)=>{y+=drawCard(o,i,6,y,w,clip)+4;});});}
  else offers.forEach((o,i)=>drawCard(o,i,6+i*(w+4),ty,w,null));
  text(fitText(REW.sel==null?'Tap a card to choose. Tap blue words for help.':'Tap '+(s==='draft'?'LEARN':'TAKE')+' to confirm.',SW-8),SW/2,SH-30,C.mute,{al:'c'});
  const sel=REW.sel!=null?offers[REW.sel]:null;
  if(s==='draft'){
    button(4,SH-19,58,15,`SKIP +${SKIP_PAY}`,()=>{REW.sel=null;takeReward(null);done();},{});
    button(66,SH-19,62,15,P.rerolled?'REROLLED':`REROLL ${REROLL_COST}`,()=>{if(rerollDraft()){REW.sel=null;sfx('dice');}},{disabled:P.rerolled||RUN.gold<REROLL_COST});
    button(SW-64,SH-19,60,15,'LEARN',()=>{if(sel!=null)take(sel);},{hot:true,disabled:sel==null,glow:sel!=null});
  }else{
    button(SW/2-64,SH-19,56,15,'SKIP',()=>{REW.sel=null;takeReward(null);done();},{});
    button(SW/2+2,SH-19,62,15,'TAKE',()=>{if(sel!=null)take(sel);},{hot:true,disabled:sel==null,glow:sel!=null});
  }
}};

/* ---------------- the Camp (Core Rules 4.7) ---------------- */
const REST_SCREEN={enter(){scrollTo('camp',0);},draw(){
  ctx.drawImage(campBG(),0,0);
  const t=NOW/1000;
  for(let i=0;i<6;i++){const x=(i*53+7)%SW,y=(i*37+5)%Math.round(SH*.3);if(Math.sin(t*2+i*1.7)>.8)rect(x,y,1,1,'#ffffff');}
  const cx=SW/2,cy=PORT?Math.round(SH*.30):60;
  const gl=.12+.03*Math.sin(t*9)+.02*Math.sin(t*23);
  ctx.globalAlpha=gl;circle(cx,cy,Math.round(SW*.42),'#ff8a30');ctx.globalAlpha=gl*1.3;circle(cx,cy,Math.round(SW*.26),'#ffb050');ctx.globalAlpha=gl*1.6;circle(cx,cy,Math.round(SW*.14),'#ffd070');ctx.globalAlpha=1;
  campfire(cx,cy,PORT?2:1);
  const seats=PORT?[[-74,-30],[-46,8],[14,8],[42,-30]]:[[-50,-10],[-34,8],[18,8],[34,-10]];
  ORDER.forEach((c,i)=>{const h=heroOf(c);if(!h||h.dead)return;const S=art(c);const off=seats[i];const x=cx+off[0],y=cy+off[1];
    const bob=Math.floor(NOW/700+i)%2;
    ctx.globalAlpha=.4;rect(x+6,y+(PORT?29:14),20,3,'#000');ctx.globalAlpha=1;
    if(PORT)ctx.drawImage(i<2?S.c:S.f,x,y-bob);else ctx.drawImage(i<2?S.c:S.f,0,0,16,16,x,y,16,16);});
  const C0=RUN.camp;if(!C0){RUN.stage='map';go(MAP_SCREEN);return;}
  text(C0.newAct?`ACT ${ROMAN[RUN.act]} · ${ACTS[RUN.act].sub.toUpperCase()}`:'CAMP',SW/2,6,C.gold,{al:'c',sc:C0.newAct&&!PORT?1:2,ol:C.edge});
  const px=6,pw=SW-12,py=PORT?Math.round(SH*.30)+44:96,bottom=SH-stripH()-22;
  panel(px,py,pw,bottom-py,{fill:'rgba(20,14,10,.92)'});
  scrollArea('camp',px+4,py+4,pw-8,bottom-py-8,C0.h||300,(yy,clip)=>{let y=yy+2;const tx=px+8,tw=pw-18;
    y+=rich(C0.newAct?'A new land. Before you set out, the company makes camp.':'The company makes camp: every hero heals with their remaining hit dice, refills them and shakes off a Wound.',tx,y,tw,C.parch,{clip})+4;
    for(const l of C0.lines){const b=[];if(l.healed)b.push(`heals ${l.healed}`);b.push(`hit dice ${heroOf(l.cls).hd}`);if(l.wound)b.push('1 Wound healed');y+=rich(`{g:${heroName(l.cls)}:} ${b.join(', ')}.`,tx,y,tw,C.parch,{clip})+1;}
    y+=4;y+=rich(C0.xp?`{b:+${C0.xp} XP} for every hero from the battles and deeds since the last Camp (every ${TUNE.xpLvl} XP is a level).`:'{m:No XP since the last Camp.}',tx,y,tw,C.parch,{clip})+3;
    for(const L of C0.leveled){y+=rich(`{g:${heroName(L.cls)} reaches level ${L.lvl1}!} ${levelGains(L.cls,L.lvl0,L.lvl1).join(', ')}.`,tx,y,tw,C.parch,{clip})+2;}
    if(C0.drafts.length)y+=rich(`{g:${C0.drafts.length} power draft${C0.drafts.length>1?'s':''}} when you break camp.`,tx,y,tw,C.parch,{clip})+3;
    y+=4;secHead('DOWNTIME',tx,y,tw);y+=12;
    const wounded=living().filter(h=>h.wounds>0&&!C0.tended[h.cls]);
    const b1=button(tx,y,tw,14,`TEND WOUNDS · ${TEND_COST} gold`,()=>pickList('TEND WOUNDS',wounded.map(h=>({l:heroName(h.cls),sub:`${h.wounds} Wound${h.wounds>1?'s':''}. Remove one.`,v:h.cls})),c=>{if(tendWound(c)){sfx('heal');toast(`${heroName(c)}: 1 Wound removed.`);}}),{disabled:!wounded.length||RUN.gold<TEND_COST});y+=17;
    button(tx,y,tw,14,`TRAIN · ${TRAIN_COST} gold`,()=>pickList('TRAIN: WHO?',living().filter(h=>h.powers.length).map(h=>({l:heroName(h.cls),sub:'Discard a power and draft one of the same rarity.',v:h.cls})),c=>{const h=heroOf(c);
      pickList('DISCARD WHICH?',h.powers.map(id=>({l:POWERS[id].name,sub:RARITY[POWERS[id].rar]||'',v:id})),id=>{if(trainPower(c,id)){sfx('learn');toast(`${heroName(c)} will draft a new ${RARITY[POWERS[id].rar]||''} power.`);}});}),{disabled:RUN.gold<TRAIN_COST});y+=17;
    const gens=living().flatMap(h=>h.powers.filter(id=>POWERS[id].c==='gen').map(id=>({h,id})));
    button(tx,y,tw,14,'HAND OVER A GENERAL POWER',()=>pickList('HAND OVER',gens.map(g=>({l:POWERS[g.id].name,sub:`From ${heroName(g.h.cls)}`,v:g})),g=>{
      pickList('TO WHOM?',living().filter(h=>h!==g.h).map(h=>({l:heroName(h.cls),sub:h.powers.includes(g.id)?'Already knows it':h.powers.length>=slotsOf(h)?'Slots full':`${h.powers.length} of ${slotsOf(h)} slots`,v:h.cls,dis:h.powers.includes(g.id)||h.powers.length>=slotsOf(h)})),to=>{if(handOver(g.h.cls,to,g.id))toast(`${heroName(to)} learns ${POWERS[g.id].name}.`);});}),{disabled:!gens.length});y+=17;
    y+=rich('{m:You can also swap relics and weapons (EQUIP).}',tx,y,tw,C.parch,{clip})+2;
    C0.h=y-yy+4;});
  partyStrip(SH-stripH());
  const gs=String(RUN.gold);coin(4,SH-stripH()-14);text(gs,14,SH-stripH()-14,C.gold);
  button(SW-52,4,48,13,'EQUIP',()=>openEquip(),{});
  button(SW/2-40,SH-stripH()-18,80,15,'BREAK CAMP',()=>{sfx('select');if(breakCamp()==='reward')goReward();else go(MAP_SCREEN);},{hot:true,glow:true});
}};

/* ---------------- events (Core Rules 4.3) ---------------- */
const EVT={t0:0,stung:true};
/* A die face with a number on it (any size of die). */
function numDie(x,y,v,o){o=o||{};rect(x,y,13,13,C.edge);rect(x+1,y+1,11,11,o.dim?'#8a8070':o.bad?'#e0a090':o.good?'#b0f0a0':'#f0e8d8');rect(x+1,y+1,11,1,'#ffffff');text(String(v),x+7,y+4,'#2a1a14',{al:'c'});}
const pctCol=p=>p>=70?C.green:p>=40?C.gold:C.red;
/* The sub-line under an option: who rolls what, and the chance. */
function optSub(o){
  if(o.group)return {t:`Every hero rolls ${ATTR_SHORT[o.group]}; half must succeed`,p:Math.round(100*groupChance(o.group))};
  if(o.cls&&o.auto)return {t:`${heroName(o.cls)}: no roll needed`,c:C.green};
  if(o.a){const R=optRoller(o);const n=R.net-(attrDie(effAttr(R.h,o.a)).net);return {t:`${heroName(R.h.cls)} rolls ${ATTR_SHORT[o.a]} d${attrDie(effAttr(R.h,o.a)).s}${R.net>0?`, +${R.net} adv`:R.net<0?`, ${R.net} dis`:''}${helpNet()?' (with Help)':''}`,p:Math.round(100*checkChance(R.h,o.a,R.net))};}
  if(o.cost)return {t:`Costs ${o.cost} gold`,c:RUN.gold>=o.cost?C.gold:C.red};
  if(o.hd)return {t:`Each hero spends ${o.hd} hit die`,c:'#8ad0ff'};
  return null;
}
function choiceButton(x,y,w,o,fn){
  const lines=wrap((o.cls?CLASSES[o.cls].title+': ':'')+o.label,w-10);const S=optSub(o);
  const dis=!optOk(o);const h=lines.length*7+(S?16:9);
  button(x,y,w,h,'',fn,{disabled:dis});
  lines.forEach((l,i)=>text(l,x+6,y+4+i*7,dis?C.dim:o.cls?C.gold:C.parch,{sh:C.edge}));
  if(S){const sy=y+4+lines.length*7+1;const pw=S.p!=null?textW(S.p+'%')+6:0;text(fitText(S.t,w-12-pw),x+6,sy,dis?C.dim:S.c||C.mute,{sh:C.edge});
    if(S.p!=null)text(S.p+'%',x+w-6,sy,pctCol(S.p),{al:'r',sh:C.edge});}
  return h;
}
/* A check: the dice tumble, then settle; the kept die is lit; then the verdict. Returns the height used, or 0 while rolling. */
function drawCheck(R,x,y,w,t0){
  const el=t0?NOW-t0:9999,dur=900,done=el>=dur;
  panel(x,y,w,40,{fill:'#1e1612'});
  text(fitText(`${R.who} rolls ${ATTR[R.a]} (d${R.s})${R.help?', with Help':''}`,w-8),x+w/2,y+4,C.parch,{al:'c'});
  const n=R.rolls.length,bx=x+w/2-(n*16-3)/2;let keptShown=false;
  R.rolls.forEach((v,i)=>{const settle=el>dur*(.5+i*.12);const shown=settle?v:1+Math.floor(NOW/70+i*2.7)%R.s;const bounce=settle?0:Math.round(Math.abs(Math.sin(el/90+i))*5*(1-el/dur));
    const kept=done&&!keptShown&&v===R.kept;if(kept)keptShown=true;
    numDie(bx+i*16,y+13-bounce,shown,{dim:done&&!kept,good:kept&&R.ok,bad:kept&&!R.ok});});
  if(!done)return 0;
  const parts=[`kept ${R.kept}`];if(R.boom)parts.push(`explodes to ${R.tot+R.w}`);if(R.w)parts.push(`−${R.w} Wounds`);
  text(fitText(`${parts.join(', ')} = ${R.tot} (needs 4+)`,w-8),x+w/2,y+30,C.white,{al:'c'});
  if(!EVT.stung){EVT.stung=true;sfx(R.ok?'success':'fail');}
  const q=Math.min(1,(el-dur)/160);const t=R.ok?(R.boom?'GREAT SUCCESS!':'SUCCESS!'):R.crit?'CRITICAL FAILURE':'FAILURE';
  ctx.globalAlpha=q;text(t,x+w/2,y+44-Math.round((1-q)*4),R.ok?C.green:C.red,{al:'c',sc:PORT||textW(t,2)<w?2:1,ol:C.edge});ctx.globalAlpha=1;
  return 60;
}
/* A group check: one line per hero. */
function drawGroup(G0,x,y,w){
  panel(x,y,w,8+G0.length*15,{fill:'#1e1612'});
  G0.forEach((r,i)=>{const cy=y+4+i*15;text(r.who,x+6,cy+3,C.parch);r.rolls.forEach((v,j)=>numDie(x+w-70+j*15,cy,v,{good:r.ok&&v===r.kept,bad:!r.ok&&v===r.kept,dim:v!==r.kept}));text(r.ok?'✓':r.crit?'✗!':'✗',x+w-8,cy+3,r.ok?C.green:C.red,{al:'r'});});
  return 12+G0.length*15;
}
function eventBody(ev,px,py,pw,ph,optsFn){
  panel(px,py,pw,ph,{});
  const tx=px+6,tw=pw-12;
  scrollArea('evt',px+4,py+4,pw-7,ph-8,EVT.ch||200,(yy,clip)=>{let y=yy+2;
    y+=rich(ev.text,tx,y,tw,C.parch,{clip})+5;
    y=optsFn(tx,y,tw,clip);
    EVT.ch=y-yy+2;});
}
function eventFrame(title,ill){
  ctx.drawImage(stoneBG(),0,0);drawEmbers('#4a2a1a');
  const T=title.toUpperCase();const big=textW(T,2)<=SW-8;
  text(T,SW/2,4,C.gold,{al:'c',sc:big?2:1,ol:C.edge});
  const ix=PORT?Math.floor((SW-ILW)/2):8,iy=PORT?18:24;
  drawIllus(ill,ix,iy);
  const bottom=PORT?SH-stripH()-2:SH-4;if(PORT)partyStrip(SH-stripH());
  const px=PORT?4:ix+ILW+8,py=PORT?iy+ILH+6:18,pw=PORT?SW-8:SW-px-4;
  const gs=String(RUN.gold);coin(px+pw-12-textW(gs),py-9);text(gs,px+pw-5,py-9,C.gold,{al:'r'});
  return {px,py,pw,ph:bottom-py,bottom};
}
function continueOutcome(r){
  const F=afterOutcome(r);
  if(F.battle){startRunBattle(F.battle,F.kind);return;}
  if(F.reward){goReward();return;}
  go(MAP_SCREEN);
}
function resultPanel(R,L,pick){
  const{px,py,pw,ph,bottom}=L;panel(px,py,pw,ph,{});const tx=px+6,tw=pw-12;let y=py+6;
  if(R.label){text(fitText(R.label,tw),tx,y,C.gold);y+=10;}
  let settled=true;
  if(R.roll){const hh=drawCheck(R.roll,tx,y,tw,EVT.t0);settled=hh>0;y+=hh||50;}
  else if(R.group){y+=drawGroup(R.group,tx,y,tw)+4;}
  if(settled){rich(R.text,tx,y,tw,C.parch);button(Math.floor(SW/2)-40,bottom-20,80,15,'CONTINUE',pick,{hot:true});}
}
const EVENT_SCREEN={enter(){EVT.t0=0;EVT.stung=true;scrollTo('evt',0);},draw(){
  if(!RUN.event){go(MAP_SCREEN);return;}
  const ev=eventOf(RUN.event);
  const L=eventFrame(ev.title,ev.ill||ev.id);
  const R=RUN.event.done;
  if(!R){
    eventBody(ev,L.px,L.py,L.pw,L.ph,(tx,y,tw)=>{
      for(const o of ev.opts.filter(o=>!o.cls||hasClass(o.cls))){y+=choiceButton(tx,y,tw,o,()=>{const r=resolveEvent(o);if(r.fail){msg('Not possible',r.text);return;}RUN.event.done=r;EVT.t0=r.roll?NOW:0;EVT.stung=false;if(r.roll||r.group)sfx('dice');saveGame();})+4;}
      return y;});
  }else resultPanel(R,L,()=>{const r=RUN.event.done;RUN.event=null;continueOutcome(r);});
}};

/* ---------------- dramatic tasks (Core Rules 4.4) ---------------- */
function tokenBar(x,y,w,n,target,col){const per=Math.max(3,Math.floor((w-2)/Math.max(target,n)));for(let i=0;i<Math.max(target,n);i++){const on=i<n;rect(x+i*per,y,per-1,6,C.edge);rect(x+i*per+1,y+1,per-3,4,on?col:i<target?'#3a2e24':'#2a1a14');}}
const TASK_SCREEN={enter(){EVT.t0=0;EVT.stung=true;scrollTo('evt',0);},draw(){
  const T=RUN.task;if(!T){go(MAP_SCREEN);return;}const ev=taskEv();
  const L=eventFrame(ev.title,ev.ill||ev.id);
  if(T.result){resultPanel(T.result,L,()=>{const r=T.result;RUN.task=null;continueOutcome(r);});return;}
  eventBody(ev,L.px,L.py,L.pw,L.ph,(tx,y,tw,clip)=>{
    text(`Round ${Math.min(T.round,ev.rounds)} of ${ev.rounds}`,tx,y,C.gold);text(`${T.tokens} / ${ev.target} tokens`,tx+tw,y,C.gold,{al:'r'});y+=9;
    tokenBar(tx,y,tw,T.tokens,ev.target,'#ffd060');y+=10;
    y+=rich('{m:Each round every hero makes one attempt: success is 1 token, an exploding roll 2, a critical failure loses 1. A hero can Help instead (+1 advantage for the next).}',tx,y,tw,C.parch,{clip})+4;
    if(T.last){const l=T.last;y+=rich(l.helpOnly?`${l.who} helps the next attempt.`:`${l.who}: ${l.label}. ${ATTR_SHORT[l.a]} d${l.s} [${l.rolls.join('/')}] → ${l.tot}: ${l.crit?'{r:critical failure, −1 token}':l.ok?`{g:success, +${l.g}}`:'{r:failure}'}.`,tx,y,tw,C.parch,{clip})+4;}
    if(T.done){y+=rich(T.done==='win'?'{g:Done!}':T.done==='cost'?'{g:Nearly. It works, at a cost.}':'{r:Time runs out.}',tx,y,tw,C.parch,{clip})+4;
      button(tx,y,tw,15,'SEE WHAT HAPPENS',()=>{T.result=finishTask();T.result.label=ev.title;RUN.task=T;saveGame();},{hot:true});return y+18;}
    const h=living().find(q=>!T.acted.includes(q.cls));if(!h)return y;
    y+=rich(`{g:${heroName(h.cls)}'s attempt}${T.help?' (helped: +1 advantage)':''}:`,tx,y,tw,C.parch,{clip})+3;
    for(const ap of taskApproaches()){const net=T.help+(ap.cls===h.cls?1:0);const p=Math.round(100*checkChance(h,ap.a,net));
const lab=(ap.cls?CLASSES[ap.cls].title+': ':'')+ap.label;const lines=wrap(lab,tw-40);const bh=lines.length*7+7;
      button(tx,y,tw,bh,'',()=>{sfx('dice');taskAttempt(h.cls,ap);},{});lines.forEach((l,i)=>text(l,tx+6,y+4+i*7,ap.cls===h.cls?C.gold:C.parch,{sh:C.edge}));
      text(`${ATTR_SHORT[ap.a]} ${p}%`,tx+tw-5,y+4,pctCol(p),{al:'r',sh:C.edge});y+=bh+3;}
    const last=living().filter(q=>!T.acted.includes(q.cls)).length<=1;
    button(tx,y,tw,13,'HELP THE NEXT HERO (+1 advantage)',()=>{taskHelp(h.cls);},{disabled:last});y+=16;
    return y;});
}};

/* ---------------- negotiations (Core Rules 4.5) ---------------- */
const TALK_SCREEN={enter(){scrollTo('evt',0);},draw(){
  const T=RUN.talk;if(!T){go(MAP_SCREEN);return;}const ev=talkEv();
  const L=eventFrame(ev.title,ev.ill||'merchant');
  if(T.result){resultPanel(T.result,L,()=>{const r=T.result;RUN.talk=null;continueOutcome(r);});return;}
  eventBody(ev,L.px,L.py,L.pw,L.ph,(tx,y,tw,clip)=>{
    y+=rich(`{g:You ask:} ${ev.request} {m:${ev.who} is ${MOOD_NAME[ev.mood]}${ev.mood<0?' (disadvantage)':ev.mood>0?' (advantage)':''}.}`,tx,y,tw,C.parch,{clip})+3;
    text(`Round ${Math.min(T.round,3)} of 3`,tx,y,C.gold);text(`Influence ${T.tokens}`,tx+tw,y,C.gold,{al:'r'});y+=9;
    tokenBar(tx,y,tw,T.tokens,3,'#c39bff');y+=10;
    y+=rich('{m:0 tokens: they refuse. 1: the least they can. 2: they agree, for a price. 3: fully, with a bonus.}',tx,y,tw,C.parch,{clip})+4;
    if(T.last){const l=T.last;y+=rich(l.paid?`You pay ${l.paid} gold: +1 influence.`:`${l.who}: ${l.label}. ${ATTR_SHORT[l.a]} d${l.s} [${l.rolls.join('/')}] → ${l.tot}: ${l.crit?'{r:it backfires, −1}':l.ok?`{g:it lands, +${l.g}}`:'{r:no effect}'}.`,tx,y,tw,C.parch,{clip})+4;}
    if(T.done){button(tx,y,tw,15,'HEAR THEIR ANSWER',()=>{const k=Math.min(3,T.tokens);T.result=finishTalk();T.result.label=['They refuse','The least they can','They agree, for a price','They agree fully'][k];RUN.talk=T;saveGame();},{hot:true});return y+18;}
    for(const arg of talkArgs()){const h=bestFor(arg.a,arg.cls);const net=talkNet(arg);const p=Math.round(100*checkChance(h,arg.a,net));
      const lab=(arg.cls?CLASSES[arg.cls].title+': ':'')+arg.label;const lines=wrap(lab,tw-40);const bh=lines.length*7+14;
      button(tx,y,tw,bh,'',()=>{sfx('dice');talkArg(arg);},{});lines.forEach((l,i)=>text(l,tx+6,y+4+i*7,arg.cls?C.gold:C.parch,{sh:C.edge}));
      text(`${p}%`,tx+tw-5,y+4,pctCol(p),{al:'r',sh:C.edge});text(fitText(`${heroName(h.cls)} rolls ${ATTR_SHORT[arg.a]}${arg.adv>0?' · a strong argument':arg.adv<0?' · it may offend':''}`,tw-12),tx+6,y+4+lines.length*7,C.mute,{sh:C.edge});y+=bh+3;}
    button(tx,y,tw,13,`PAY ${ev.pay} GOLD (+1 influence)`,()=>{if(talkPay())sfx('coin');},{disabled:RUN.gold<ev.pay});y+=16;
    button(tx,y,tw,13,'STOP HERE',()=>talkStop(),{});y+=16;
    return y;});
}};

/* ---------------- the smith (Heroes book 3.2) ---------------- */
function openSmith(){
  const L=living();
  pickList('THE SMITH',L.map(h=>{const W=weaponData(h.weapon);return {l:`${heroName(h.cls)}: ${W.name}`,sub:`d${W.dice[1]}${W.runes.length?' · '+W.runes.map(r=>RUNE_NAME[r]).join(', '):''} · ${W.runes.length} of ${weaponSockets(WEAPONS[h.weapon])} sockets`,v:h.weapon};}),id=>smithFor(id),{rowH:24});
}
function smithFor(id){
  const W=weaponData(id);const M=smithMenu(id);
  pickList(W.name.toUpperCase(),M.map(o=>({l:`${o.label} · ${o.cost} gold`,sub:o.k==='inscribe'||o.k==='erase'?RUNE_DESC[o.rune]:o.k==='temper'?'A bigger die: harder hits, rarer crits.':isLight(WEAPONS[id])&&W.dice[1]===4?'Down to a d2: half your swings miss, half crit and ignore DEF.':'A smaller die: more crits, smaller hits.',v:o,dis:RUN.gold<o.cost})),
    o=>{if(smithDo(id,o)){sfx('coin');toast(`${W.name}: ${o.label.toLowerCase()}.`);}},{rowH:30,w:220});
}
