'use strict';
/* =====================================================================
   EMBERWATCH — screens
   ===================================================================== */
let SCREEN=null;
function go(s){SCREEN=s;closeAllModals();if(s.enter)s.enter();}
const BATTLE_SCREEN={draw:drawBattle};
const ROMAN=['I','II','III'];
function coin(x,y){text('●',x,y,C.gold,{sh:C.edge});}
function relicIcon(r,x,y){rect(x,y,11,11,C.edge);rect(x+1,y+1,9,9,'#1a1410');frame(x+1,y+1,9,9,RELIC_COL[r]);text(RELIC_ICON[r]||'?',x+6,y+3,RELIC_COL[r],{al:'c',sh:false});}
function heroSheetUnit(h){return {id:'sheet_'+h.cls,side:'hero',kind:'pc',cls:h.cls,name:CLASSES[h.cls].name,lvl:h.lvl,hp:h.hp,maxHp:effMaxHp(h),attrs:attrsFor(h.cls,h.lvl),powers:h.powers,mom:0,st:{},shield:0,speed:CLASSES[h.cls].speed,steady:0};}

/* ---------------- backgrounds ---------------- */
const BGC={};
function paintDither(g,x,y,w,h,c1,c2,r,dens){g.fillStyle=c1;g.fillRect(x,y,w,h);g.fillStyle=c2;for(let i=0;i<w*h*dens;i++)g.fillRect(x+Math.floor(r()*w),y+Math.floor(r()*h),1,1);}
function titleBG(){
  if(BGC.title)return BGC.title;
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const r=mulberry(77);
  const sky=['#0c0810','#140a12','#1e0e14','#2a1216','#3a1814','#4e2012','#6a2c10'];
  sky.forEach((col,i)=>{g.fillStyle=col;g.fillRect(0,i*18,SW,18);g.fillStyle=sky[Math.min(6,i+1)];for(let k=0;k<260;k++){g.fillRect(Math.floor(r()*SW),i*18+12+Math.floor(r()*6),1,1);}});
  g.fillStyle='#fff4d0';for(let i=0;i<40;i++)g.fillRect(Math.floor(r()*SW),Math.floor(r()*60),1,1);
  const ridge=(base,amp,col,seed)=>{const rr=mulberry(seed);g.fillStyle=col;let h=base;for(let x=0;x<SW;x++){h+=(rr()-.5)*amp;h=clamp(h,base-30,base+20);g.fillRect(x,Math.floor(h),1,SH-Math.floor(h));}};
  g.fillStyle='#2a1418';g.beginPath();g.moveTo(200,120);g.lineTo(252,58);g.lineTo(268,58);g.lineTo(320,118);g.lineTo(320,180);g.lineTo(200,180);g.fill();
  const gl=g.createRadialGradient(260,56,2,260,56,40);gl.addColorStop(0,'rgba(255,160,60,.9)');gl.addColorStop(.3,'rgba(255,80,20,.4)');gl.addColorStop(1,'rgba(255,60,0,0)');g.fillStyle=gl;g.fillRect(200,10,120,90);
  g.fillStyle='#ff8a20';for(let i=0;i<14;i++)g.fillRect(250+Math.floor(r()*18),58+Math.floor(r()*30),1,2);
  ridge(118,3,'#1c1016',5);ridge(136,3.5,'#140c10',9);ridge(154,2.5,'#0c0709',13);
  g.fillStyle='#0c0709';g.fillRect(40,112,12,44);g.fillRect(38,108,16,5);for(let i=0;i<4;i++)g.fillRect(38+i*4,104,2,4);g.fillStyle='#ffb040';g.fillRect(45,120,2,3);g.fillRect(45,132,2,3);
  return BGC.title=c;
}
function mapBG(act,seed){
  const key='map'+act+'_'+seed;if(BGC[key])return BGC[key];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const r=mulberry(seed+act*13);
  const P=[['#3a5424','#46622a','#324a20'],['#2c322c','#343a32','#262c26'],['#2a1c18','#34241e','#221612']][act];
  paintDither(g,0,0,SW,SH,P[0],P[1],r,.18);g.fillStyle=P[2];for(let i=0;i<SW*SH*.08;i++)g.fillRect(Math.floor(r()*SW),Math.floor(r()*SH),1,1);
  const blob=(x,y,rx,ry,c1,c2)=>{for(let yy=-ry;yy<=ry;yy++){const w=Math.floor(rx*Math.sqrt(1-(yy*yy)/(ry*ry)));g.fillStyle=yy<-ry/3?c2:c1;g.fillRect(x-w,y+yy,w*2+1,1);}};
  if(act===0){
    let x=120+r()*80;g.fillStyle='#2a5a8a';for(let y=14;y<SH;y++){x+=Math.sin(y/14)*1.2+(r()-.5);g.fillStyle='#1e3e5e';g.fillRect(Math.floor(x)-3,y,7,1);g.fillStyle='#3a6a9a';g.fillRect(Math.floor(x)-2,y,5,1);if(r()<.3){g.fillStyle='#8ab8e0';g.fillRect(Math.floor(x),y,1,1);}}
    for(let i=0;i<5;i++){const fx=Math.floor(r()*300),fy=20+Math.floor(r()*140);g.fillStyle='#6a6a2e';g.fillRect(fx,fy,18,10);g.fillStyle='#7e7a38';for(let j=0;j<5;j++)g.fillRect(fx,fy+j*2,18,1);g.fillStyle='#3a2e1a';g.fillRect(fx,fy+10,18,1);}
    for(let i=0;i<14;i++){const cx=Math.floor(r()*SW),cy=20+Math.floor(r()*150);for(let j=0;j<7;j++){const tx=cx+Math.floor(r()*18-9),ty=cy+Math.floor(r()*12-6);blob(tx,ty,3,3,'#24401a','#3a6a24');g.fillStyle='#142a0e';g.fillRect(tx-1,ty+3,3,1);}}
    for(let x=-10;x<SW;x+=16+Math.floor(r()*10)){const h=10+Math.floor(r()*10),w=12+Math.floor(r()*6);g.fillStyle='#3a3a38';g.beginPath();g.moveTo(x-w,14+h+2);g.lineTo(x,14);g.lineTo(x+w,14+h+2);g.fill();g.fillStyle='#55554e';g.beginPath();g.moveTo(x-w+3,14+h+2);g.lineTo(x,14);g.lineTo(x+1,14+h+2);g.fill();g.fillStyle='#e8e8e0';g.beginPath();g.moveTo(x-3,18);g.lineTo(x,14);g.lineTo(x+3,18);g.fill();}
  }else if(act===1){
    for(let i=0;i<9;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*150);blob(px,py,8+Math.floor(r()*10),3+Math.floor(r()*3),'#1a2626','#243232');g.fillStyle='#3a4a44';g.fillRect(px-3,py-1,6,1);}
    for(let i=0;i<7;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*150);blob(px,py,9,5,'#3a4234','#48503e');g.fillStyle='#8a8a80';g.fillRect(px-1,py-7,2,3);}
    for(let i=0;i<12;i++){const px=Math.floor(r()*SW-8),py=16+Math.floor(r()*150);g.drawImage(spr('deadtree').c,px,py);}
    for(let i=0;i<10;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*150);g.fillStyle='#7a7a74';g.fillRect(px,py,2,4);g.fillStyle='#4a4a44';g.fillRect(px,py+4,2,1);}
  }else{
    for(let i=0;i<3;i++){let x=Math.floor(r()*SW),y=14;g.lineWidth=1;for(;y<SH;y++){x+=Math.round(r()*2-1)+(r()<.1?2:0);g.fillStyle='#5a1606';g.fillRect(x-2,y,5,1);g.fillStyle='#d8400c';g.fillRect(x-1,y,3,1);if(r()<.4){g.fillStyle='#ffb040';g.fillRect(x,y,1,1);}}}
    for(let i=0;i<30;i++){const px=Math.floor(r()*SW),py=16+Math.floor(r()*160),h=4+Math.floor(r()*9);g.fillStyle='#140c0a';g.beginPath();g.moveTo(px-3,py);g.lineTo(px,py-h);g.lineTo(px+3,py);g.fill();g.fillStyle='#3a2a24';g.fillRect(px,py-h+1,1,h-2);}
    g.fillStyle='#1e1412';g.beginPath();g.moveTo(262,60);g.lineTo(288,22);g.lineTo(300,22);g.lineTo(320,56);g.lineTo(320,14);g.lineTo(250,14);g.fill();
    g.fillStyle='#ff7a20';g.fillRect(288,22,12,2);
  }
  const vg=g.createRadialGradient(160,95,60,160,95,200);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,SW,SH);
  return BGC[key]=c;
}
const EMBERS=Array.from({length:30},(_,i)=>({x:Math.random()*SW,y:Math.random()*SH,s:.2+Math.random()*.5,ph:Math.random()*6}));
function drawEmbers(col){for(const e of EMBERS){e.y-=e.s;e.x+=Math.sin(NOW/900+e.ph)*.15;if(e.y<0){e.y=SH;e.x=Math.random()*SW;}rect(e.x,e.y,1,1,col||(Math.floor(NOW/200+e.ph)%2?'#ffb040':'#ff6a20'));}}

/* ---------------- title ---------------- */
const TITLE_SCREEN={enter(){this.save=loadSave();},draw(){
  ctx.drawImage(titleBG(),0,0);drawEmbers();
  text('EMBERWATCH',18,24,'#5a2008',{sc:3,sh:false});
  text('EMBERWATCH',16,22,C.gold,{sc:3,ol:'#2a0e04'});
  rect(16,42,textW('EMBERWATCH',3),1,C.gold2);
  text('T A C T I C S',16,46,'#ffb070',{ol:'#2a0e04'});
  text('Four heroes. Three lands. One dragon.',16,58,C.parch);
  ORDER.forEach((c,i)=>{const S=spr(c);ctx.drawImage(S.c,58+i*17,146+(Math.floor(NOW/500+i)%2));});
  const save=this.save;
  const items=[];
  if(save)items.push(['CONTINUE',()=>{continueRun();},true]);
  items.push(['NEW JOURNEY',()=>{if(save)openModal(dialog({title:'START OVER?',body:'This replaces your saved journey.',buttons:[{l:'START',hot:true,fn:()=>{newRun();go(MAP_SCREEN);}},{l:'CANCEL'}]}));else{newRun();go(MAP_SCREEN);}},!save]);
  items.push(['SKIRMISH',()=>go(SKIRMISH_SCREEN)]);
  items.push(['COMPENDIUM',()=>{SCREEN_BACK=null;go(COMP_SCREEN);}]);
  items.push(['HOW TO PLAY',openHowTo]);
  items.push(['SETTINGS',()=>openSettings(false)]);
  panel(190,64,120,items.length*16+10,{fill:'rgba(20,14,12,.9)'});
  items.forEach((it,i)=>button(196,70+i*16,108,13,it[0],it[1],{hot:!!it[2]}));
  const best=+(localStorage.getItem(BEST_KEY)||0);if(best)text(`Most battles won: ${best}`,SW-4,SH-8,C.mute,{al:'r'});
}};

/* ---------------- overworld map ---------------- */
function roadLine(x1,y1,x2,y2,col,dark){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i+=3){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);rect(x-1,y-1,3,3,dark);rect(x,y,2,2,col);}}
let MAPSEL=null;
const MAP_SCREEN={enter(){MAPSEL=null;},draw(){
  const M=RUN.map;ctx.drawImage(mapBG(RUN.act,M.seed),0,0);
  if(RUN.act===1){for(let i=0;i<4;i++){const y=30+i*38+Math.sin(NOW/3000+i)*6;ctx.globalAlpha=.08;rect(0,y,SW,10,'#d0d8d0');ctx.globalAlpha=1;}}
  if(RUN.act===2)drawEmbers();
  const avail=new Set(availableNodes());
  const vis=new Set(M.visited);
  for(const e of M.edges){const[a,b]=e.split('>');const A=M.nodes[a],Bn=M.nodes[b];const walked=vis.has(a)&&vis.has(b)&&M.visited.indexOf(b)===M.visited.indexOf(a)+1;roadLine(A.x,A.y,Bn.x,Bn.y,walked?'#e8c070':'#7a5a34','#1a0e08');}
  for(const n of Object.values(M.nodes)){
    const av=avail.has(n.id),vd=vis.has(n.id);const big=n.type==='boss';const r=big?11:7;
    if(av){const p=Math.floor(NOW/250)%2;circle(n.x,n.y,r+2+p,C.gold);}
    circle(n.x,n.y,r+1,C.edge);circle(n.x,n.y,r,vd?'#3a3028':'#e8dcc0');circle(n.x,n.y,r-1,vd?'#2a221c':'#c8b890');
    if(big){const S=spr(MON[BOSSES[RUN.act]].art);ctx.drawImage(S.c,n.x-8,n.y-9);}else ctx.drawImage(icon(n.type),n.x-5,n.y-5);
    if(vd&&n.id!==RUN.pos){ctx.globalAlpha=.6;circle(n.x,n.y,r-1,'#1a1410');ctx.globalAlpha=1;text('✓',n.x,n.y-2,C.mute,{al:'c'});}
    hit(n.x-r-2,n.y-r-2,2*r+4,2*r+4,{fn:()=>mapNodeTap(n,av),id:'node'+n.id});
  }
  const cur=RUN.pos?M.nodes[RUN.pos]:{x:6,y:95};
  ctx.drawImage(spr('fighter').c,cur.x-8,cur.y-20+(Math.floor(NOW/400)%2));
  rect(0,0,SW,13,'rgba(12,8,6,.92)');rect(0,13,SW,1,C.rim);
  text(`ACT ${ROMAN[RUN.act]} · ${ACTS[RUN.act].sub.toUpperCase()}`,4,4,C.gold);
  coin(SW-40,4);text(String(RUN.gold),SW-32,4,C.gold);
  rect(0,SH-16,SW,16,'rgba(12,8,6,.92)');rect(0,SH-17,SW,1,C.rim);
  RUN.heroes.forEach((h,i)=>{const x=3+i*38;ctx.drawImage(spr(h.cls).c,0,0,16,12,x,SH-14,16,12);bar(x+17,SH-12,19,4,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}`,x+17,SH-7,C.parch);hit(x,SH-15,36,14,{fn:()=>openUnitInfo(heroSheetUnit(h)),id:'mh'+i});});
  RUN.relics.slice(0,8).forEach((r,i)=>{relicIcon(r,158+i*12,SH-14);hit(158+i*12,SH-14,11,11,{fn:()=>msg(RELICS[r].name,RELICS[r].desc,null,160),id:'mr'+r});});
  if(RUN.relics.length>8)text('+'+(RUN.relics.length-8),256,SH-11,C.mute);
  button(282,SH-14,35,11,'MENU',()=>openSettings(false,true),{});
  if(!RUN.pos&&RUN.act===0&&!M.visited.length){const p=.6+.4*Math.sin(NOW/300);ctx.globalAlpha=p;text('Choose where to go first',160,20,C.parch,{al:'c',ol:C.edge});ctx.globalAlpha=1;}
}};
function mapNodeTap(n,av){
  const I=NODE_INFO[n.type];const body=n.type==='boss'?`${MON[BOSSES[RUN.act]].name}. ${BOSS_TXT[RUN.act]}`:I.desc;
  openModal(dialog({title:(n.type==='boss'?'BOSS':I.name.toUpperCase()),body:body+(av?'':'\n{m:You cannot reach this yet.}'),w:170,buttons:av?[{l:'TRAVEL',hot:true,fn:()=>travel(n.id)},{l:'CANCEL'}]:[{l:'OK'}]}));
}

/* ---------------- rewards ---------------- */
function goReward(){if(!nextRewardStep()){finishRewards();return;}go(REWARD_SCREEN);}
function offerCard(x,y,w,h,draw,fn,id){panel(x,y,w,h,{});draw(x+4,y+4,w-8,h-8);hit(x,y,w,h,{fn,id});}
const REWARD_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);drawEmbers('#6a3a1a');
  const P=RUN.pending;const s=nextRewardStep();if(!s){finishRewards();return;}
  const head=P.kind==='treasure'?'TREASURE':P.kind==='rest'?'TRAINING':P.kind==='event'?'FORTUNE':'VICTORY';
  text(head,SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let sub='';
  if(P.gold)sub+=`+${P.gold} gold. `;
  if(P.lvl)sub+=`Every hero reaches level ${P.lvl}.`+([4,7,10].includes(P.lvl)?' Primary attributes rise!':'');
  text(sub,SW/2,22,C.parch,{al:'c'});
  const title=s==='train'?'Choose a power to learn':'Choose a relic';
  text(title,SW/2,32,C.mute,{al:'c'});
  const offers=P.offers;const w=100,gap=4;const x0=Math.floor((SW-offers.length*w-(offers.length-1)*gap)/2);
  offers.forEach((o,i)=>{
    const x=x0+i*(w+gap),y=42;
    offerCard(x,y,w,112,(cx,cy,cw)=>{
      if(s==='train'){const p=POWERS[o.id];const h=RUN.heroes.find(q=>q.cls===o.cls);ctx.drawImage(spr(o.cls).c,cx,cy);text(CLASSES[o.cls].name,cx+18,cy+1,C.mute);text(p.name,cx+18,cy+8,C.gold);
        const u=heroSheetUnit(h);const body=powerText(p,u);rich(body,cx,cy+19,cw,C.parch);}
      else{relicIcon(o,cx,cy);text(RELICS[o].name,cx+14,cy+3,C.gold);rich(RELICS[o].desc,cx,cy+16,cw,C.parch);}
    },()=>{sfx('chest');takeReward(o);if(!nextRewardStep())finishRewards();},'offer'+i);
  });
  button(SW/2-30,160,60,13,'SKIP',()=>{takeReward(null);if(!nextRewardStep())finishRewards();},{});
}};

/* ---------------- shop ---------------- */
const SHOP_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);
  text('MERCHANT',SW/2,5,C.gold,{al:'c',sc:2,ol:C.edge});
  coin(SW-44,6);text(String(RUN.gold),SW-36,6,C.gold);
  const items=RUN.shop.items;
  items.forEach((it,i)=>{
    const x=6+(i%3)*104,y=24+Math.floor(i/3)*68,w=100,h=64;
    panel(x,y,w,h,{fill:it.sold?'#141010':C.panel});
    const cx=x+5,cy=y+5,cw=w-10;
    if(it.sold){text('SOLD',x+w/2,y+28,C.dim,{al:'c',sc:2});return;}
    let name,desc;
    if(it.kind==='relic'){relicIcon(it.id,cx,cy);name=RELICS[it.id].name;desc=RELICS[it.id].desc;text(name,cx+14,cy+3,C.gold);}
    else if(it.kind==='power'){ctx.drawImage(spr(it.cls).c,cx,cy-2);name=POWERS[it.id].name;desc=`${CLASSES[it.cls].name} learns this power. `+POWERS[it.id].desc;text(name,cx+18,cy+1,C.gold);text(CLASSES[it.cls].name,cx+18,cy+8,C.mute);}
    else{text('+',cx+4,cy+2,C.green,{sc:2});name='Healing Draught';desc='Every hero heals 40% of their health.';text(name,cx+14,cy+3,C.gold);}
    rich(desc,cx,cy+17,cw,C.parch,{nohit:true});
    const ok=RUN.gold>=it.price;coin(x+w-30,y+h-12);text(String(it.price),x+w-22,y+h-12,ok?C.gold:C.red);
    hit(x,y,w,h,{fn:()=>{const body=(it.kind==='power'?powerText(POWERS[it.id],heroSheetUnit(RUN.heroes.find(q=>q.cls===it.cls))):desc)+`\n\nPrice: ${it.price} gold.`;
      openModal(dialog({title:name.toUpperCase(),body,w:200,buttons:[{l:'BUY',hot:true,disabled:!ok,fn:()=>buyItem(it)},{l:'CANCEL'}]}));},id:'shop'+i});
  });
  button(SW/2-35,162,70,14,'LEAVE',()=>{RUN.stage='map';RUN.shop=null;saveGame();go(MAP_SCREEN);},{hot:true});
}};

/* ---------------- campfire ---------------- */
function campfire(cx,cy,sc){
  rect(cx-10*sc,cy+2*sc,20*sc,3*sc,'#2a1a10');
  for(let i=0;i<6;i++){const h=(5+Math.floor((Math.sin(NOW/90+i*1.7)+1)*4))*sc;const x=cx-6*sc+i*2*sc;rect(x,cy+2*sc-h,2*sc,h,'#e0501a');rect(x,cy+2*sc-Math.floor(h*.6),2*sc,Math.floor(h*.6),'#ffb030');if(h>7*sc)rect(x,cy+2*sc-Math.floor(h*.3),sc,2*sc,'#fff0a0');}
  ctx.globalAlpha=.1+.03*Math.sin(NOW/150);circle(cx,cy,20*sc,'#ff8a30');circle(cx,cy,12*sc,'#ffb050');ctx.globalAlpha=1;
}
const REST_SCREEN={draw(){
  rect(0,0,SW,SH,'#08060a');
  for(let i=0;i<30;i++)rect((i*53)%SW,(i*37)%80,1,1,'#8a8070');
  rect(0,110,SW,70,'#141a10');
  campfire(160,112,2);
  ORDER.forEach((c,i)=>{const S=spr(c);const pos=[[112,104],[128,120],[184,120],[200,104]][i];ctx.drawImage(i<2?S.c:S.f,0,0,16,16,pos[0],pos[1],16,16);});
  text('CAMPFIRE',SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  text('The night is quiet. Choose how to spend it.',SW/2,24,C.parch,{al:'c'});
  button(40,146,110,16,'REST · heal 40%',()=>{RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*.4)));sfx('heal');RUN.stage='map';saveGame();go(MAP_SCREEN);},{hot:true});
  button(170,146,110,16,'TRAIN · learn a power',()=>{RUN.stage='reward';RUN.pending={steps:['train'],kind:'rest'};saveGame();goReward();},{hot:true});
  RUN.heroes.forEach((h,i)=>{const x=40+i*62;text(CLASSES[h.cls].name,x,40,C.parch);bar(x,48,50,4,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}/${effMaxHp(h)}`,x,54,C.mute);});
}};

/* ---------------- events ---------------- */
const EVENT_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);drawEmbers('#4a2a1a');
  const ev=EVENTS.find(e=>e.id===RUN.event.id);
  panel(20,8,280,164,{title:ev.title.toUpperCase()});
  const R=RUN.event.done;
  if(!R){
    const h=rich(ev.text,30,20,260,C.parch);
    ev.opts.forEach((o,i)=>{
      let lab=o.label;if(o.check){const b=bestAt(o.check.skill);lab+=` (${o.check.skill} ${o.check.dc}, ${CLASSES[b.h.cls].name} ${b.mod>=0?'+':''}${b.mod})`;}
      if(o.cost)lab+=` (${o.cost} gold)`;
      button(30,34+h+i*17,260,14,lab,()=>{const r=resolveEvent(o);if(r.fail){msg('Not enough gold',r.text);return;}RUN.event.done=r;saveGame();},{disabled:o.cost&&RUN.gold<o.cost});
    });
  }else{
    rich(R.text,30,22,260,C.parch);
    button(110,150,100,14,'CONTINUE',()=>{
      const r=RUN.event.done;RUN.event=null;
      if(r.fight){const n=RUN.map.nodes[RUN.pos];startRunBattle(genEncounter(nodeF(n),'rout',{act:RUN.act}),'battle');return;}
      if(r.relic||r.train){RUN.stage='reward';RUN.pending={steps:[r.relic?'relic2':'train'],kind:'event'};saveGame();goReward();return;}
      RUN.stage='map';saveGame();go(MAP_SCREEN);},{hot:true});
  }
  coin(SW-50,SH-7);text(String(RUN.gold),SW-42,SH-7,C.gold);
}};

/* ---------------- end ---------------- */
const END_SCREEN={draw(){
  const won=RUN.stage==='won';
  rect(0,0,SW,SH,won?'#140e06':'#0e0606');drawEmbers(won?'#ffb040':'#6a2010');
  const S=spr(won?'dragon':'fighter');ctx.drawImage(S.c,0,0,16,16,SW/2-16,14,32,32);
  text(won?'THE DRAGON FALLS':'THE WATCH IS BROKEN',SW/2,52,won?C.gold:C.red,{al:'c',sc:2,ol:C.edge});
  text(won?'Emberwatch stands. Songs will be sung of this company.':`Your company fell in ${ACTS[RUN.act].sub}. Another will rise.`,SW/2,70,C.parch,{al:'c'});
  const st=[['BATTLES WON',RUN.stats.wins],['FOES SLAIN',RUN.stats.kills],['GOLD EARNED',RUN.stats.gold]];
  st.forEach((s,i)=>{const x=40+i*84;panel(x,84,76,30,{});text(String(s[1]),x+38,90,C.gold,{al:'c',sc:2});text(s[0],x+38,104,C.mute,{al:'c'});});
  RUN.heroes.forEach((h,i)=>{ctx.drawImage(spr(h.cls).c,100+i*32,122);text('Lv '+h.lvl,108+i*32,140,C.parch,{al:'c'});});
  button(60,156,90,14,'NEW JOURNEY',()=>{newRun();go(MAP_SCREEN);},{hot:true});
  button(170,156,90,14,'TITLE',()=>go(TITLE_SCREEN),{});
}};

/* ---------------- settings & help ---------------- */
function openSettings(inBattle,onMap){
  openModal({closable:true,draw(){
    dim();const w=180,items=[];
    items.push([`Music: ${SET.music?'On':'Off'}`,()=>{SET.music=!SET.music;auInit();SET.music?musicStart():musicStop();saveSet();}]);
    items.push([`Sound effects: ${SET.sfx?'On':'Off'}`,()=>{SET.sfx=!SET.sfx;saveSet();}]);
    items.push([`Animation speed: ${['Slow','Normal','Fast'][SET.speed]}`,()=>{SET.speed=(SET.speed+1)%3;saveSet();}]);
    items.push([`Auto end turn: ${SET.autoEnd?'On':'Off'}`,()=>{SET.autoEnd=!SET.autoEnd;saveSet();}]);
    items.push(['How to play',openHowTo]);
    items.push(['Glossary',()=>{SCREEN_BACK=SCREEN;COMP.tab=3;go(COMP_SCREEN);}]);
    if(inBattle&&CTX.mode==='run')items.push(['Save and quit to title',()=>{saveGame();G=null;go(TITLE_SCREEN);}]);
    if(inBattle&&CTX.mode==='skirmish')items.push(['Leave skirmish',()=>{G=null;go(SKIRMISH_SCREEN);}]);
    if(onMap)items.push(['Quit to title',()=>{saveGame();go(TITLE_SCREEN);}]);
    if((inBattle||onMap)&&CTX.mode==='run'&&RUN)items.push(['Abandon journey',()=>openModal(dialog({title:'ABANDON?',body:'Your heroes, relics and progress will be lost.',buttons:[{l:'ABANDON',hot:true,fn:()=>{clearSave();RUN=null;G=null;go(TITLE_SCREEN);}},{l:'CANCEL'}]}))]);
    const h=items.length*15+30;const x=(SW-w)/2,y=(SH-h)/2;
    panel(x,y,w,h,{title:'SETTINGS'});
    items.forEach((it,i)=>button(x+8,y+10+i*15,w-16,13,it[0],it[1],{}));
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{hot:true});
  }});
}
const HOWTO=`{g:The journey.} Lead four heroes along a branching road through three lands. Pick your path on the map: battles, elite fights, merchants, campfires, treasure and strange events. Each land ends with a boss.

{g:Turns.} Everyone rolls initiative (d20 + Finesse) at the start of a battle. Heroes and foes act in that order, and it repeats every round. Tap TURN ORDER entries or the ORDER button to see who acts next.

{g:Moving.} On a hero's turn, tap a blue square to move, or drag the hero. You can move in several steps until your speed runs out. Taking an action ends your movement (Hit and Run and a few others give some back). Water, brambles and rubble are difficult terrain.

{g:Acting.} Pick a power from the bar at the bottom. Tap a red target to see the forecast, then tap it again or press STRIKE. Powers that need no target (like Thunderwave) activate when you tap their card a second time. If a target is out of reach, the hero moves there first.

{g:Attack rolls.} Roll 3d6 plus the power's attribute. 10 or less is Glancing, 11 to 14 is Solid, 15 or more is Crushing. Each net boon adds 2 and each net hindrance subtracts 2. Flanking, high ground, and exposed, prone or rooted targets give boons. Cover, being weakened and shooting beside a foe give hindrances.

{g:Parting blows.} Stepping out of a square beside a foe lets it strike you. The path turns red and the hero glows purple when that will happen. Rogues never provoke.

{g:Hazards.} Fire, acid and lava hurt anyone who enters them or starts a turn in them, even when pushed or pulled in. Some foes set snares, spit acid or light fires. Push your enemies into them!

{g:Momentum.} Heroes gain momentum every turn and spend it on stronger powers. Foes share their own momentum pool.

{g:Undo.} UNDO rewinds your last move or action. Press it again to go back to the previous hero's turn, undoing whatever the foes did in between.

Tap any {k:blue underlined word} to see what it means.`;
function openHowTo(){openModal(dialog({title:'HOW TO PLAY',body:HOWTO,w:280,buttons:[{l:'CLOSE',hot:true}]}));}

/* ---------------- compendium ---------------- */
const COMP={tab:0,cls:0,sel:null};
const COMP_SCREEN={enter(){COMP.sel=null;scrollTo('clist',0);scrollTo('cdet',0);},draw(){
  rect(0,0,SW,SH,C.bg);
  const tabs=['HEROES','RELICS','BESTIARY','GLOSSARY'];
  tabs.forEach((t,i)=>button(4+i*62,3,60,12,t,()=>{COMP.tab=i;COMP.sel=null;scrollTo('clist',0);scrollTo('cdet',0);},{on:COMP.tab===i}));
  button(SW-54,3,50,12,'BACK',()=>{const b=SCREEN_BACK||TITLE_SCREEN;SCREEN_BACK=null;go(b);},{hot:true});
  let entries=[];
  if(COMP.tab===0){
    ORDER.forEach((c,i)=>button(4+i*48,18,46,11,CLASSES[c].title.toUpperCase(),()=>{COMP.cls=i;COMP.sel=null;scrollTo('clist',0);},{on:COMP.cls===i}));
    const cls=ORDER[COMP.cls];
    entries=[{k:'class',label:CLASSES[cls].name+' · class',col:C.gold}].concat(Object.values(POWERS).filter(p=>p.c===cls).sort((a,b)=>a.lv-b.lv||a.cost-b.cost).map(p=>({k:p.id,label:p.name,sub:`L${p.lv}`})));
  }else if(COMP.tab===1)entries=Object.keys(RELICS).map(r=>({k:r,label:RELICS[r].name,relic:r}));
  else if(COMP.tab===2){for(let a=0;a<3;a++){entries.push({hdr:ACTS[a].sub});for(const m of Object.values(MON))if(m.act===a)entries.push({k:m.id,label:m.name,sprite:m.art});}entries.push({hdr:'Special'});for(const m of Object.values(MON))if(m.act<0)entries.push({k:m.id,label:m.name,sprite:m.art});}
  else entries=Object.keys(GLOSS).sort((a,b)=>GLOSS[a].name.localeCompare(GLOSS[b].name)).map(k=>({k,label:GLOSS[k].name}));
  const ly=COMP.tab===0?32:18;
  panel(2,ly-2,112,SH-ly,{plain:true});
  if(!COMP.sel&&entries.length)COMP.sel=entries.find(e=>e.k).k;
  const rowH=e=>e.hdr?9:e.sprite?15:10;
  const ch=entries.reduce((s,e)=>s+rowH(e),0)+4;
  scrollArea('clist',5,ly+1,106,SH-ly-6,ch,(yy,clip)=>{let y=yy;for(const e of entries){const h=rowH(e);
    if(e.hdr){text(e.hdr.toUpperCase(),8,y+2,C.mute,{sh:false});y+=h;continue;}
    if(COMP.sel===e.k)rect(5,y,104,h,'#3a2e1a');
    let tx=8;if(e.sprite){ctx.drawImage(spr(e.sprite).c,6,y-1);tx=24;}if(e.relic){relicIcon(e.relic,6,y);tx=19;}
    text(e.label,tx,y+(e.sprite?5:2),COMP.sel===e.k?C.gold:(e.col||C.parch));if(e.sub)text(e.sub,106,y+2,C.mute,{al:'r'});
    if(y+h>clip[0]&&y<clip[1])hit(5,Math.max(y,clip[0]),104,h,{fn:()=>{COMP.sel=e.k;scrollTo('cdet',0);},id:'ce'+e.k});
    y+=h;}});
  panel(116,ly-2,SW-118,SH-ly,{});
  const dx=122,dw=SW-132;let title='',body='',art=null;
  const k=COMP.sel;
  if(COMP.tab===0){
    const cls=ORDER[COMP.cls];
    if(k==='class'){const Cc=CLASSES[cls];title=`${Cc.name}, ${Cc.title}`;art=cls;const a=Cc.attrs;
      body=`{m:${Cc.role}} · Health ${Cc.hp} (+${Cc.grow} per level) · Speed ${Cc.speed}\n${attrLine(a)}\nPrimary: ${ATTR[Cc.prime]} (rises at levels 4, 7, 10). Secondary: ${ATTR[Cc.second]}.\nTrained skills: ${Cc.skills.join(', ')}.\n\n${Cc.trait}\n\nStarting powers: ${Cc.start.map(id=>POWERS[id].name).join(', ')}.`;}
    else if(POWERS[k]){const p=POWERS[k];title=p.name;art=cls;body=`{m:Level ${p.lv} ${CLASSES[cls].title} power}\n`+powerText(p,null);}
  }else if(COMP.tab===1&&RELICS[k]){title=RELICS[k].name;body=RELICS[k].desc+`\n\n{m:Merchant price about ${RELICS[k].price} gold.}`;}
  else if(COMP.tab===2&&MON[k]){const m=MON[k];title=m.name;art=m.art;body=monBlock(m)+(m.act>=0?`\n{m:Found in ${ACTS[m.act].sub}.}`:'');}
  else if(COMP.tab===3&&GLOSS[k]){title=GLOSS[k].name;body=GLOSS[k].text;}
  let y=ly+3;
  if(art){inset(dx,y,34,34,'#15100c');ctx.drawImage(spr(art).c,0,0,16,16,dx+1,y+1,32,32);text(title,dx+38,y+2,C.gold);y+=38;}
  else{text(title,dx,y,C.gold);y+=10;}
  const bh=richH(body,dw);
  scrollArea('cdet',dx,y,dw+4,SH-y-6,bh,(yy,clip)=>rich(body,dx,yy,dw,C.parch,{clip}));
}};
let SCREEN_BACK=null;

/* ---------------- skirmish ---------------- */
const SK={tab:0,lvl:3,act:0,haz:true,mission:0,foes:{},rivals:{fighter:false,rogue:false,wizard:false,cleric:false},rivalPow:{},partyPow:{},sel:'orc'};
ORDER.forEach(c=>{SK.rivalPow[c]=CLASSES[c].start.slice();SK.partyPow[c]=CLASSES[c].start.slice();});
SK.foes={orc:1,runner:3};
const SK_MISSIONS=['rout','hold','survive','ambush'];
function openPowerEditor(cls,list,label){
  scrollTo('pedit',0);
  openModal({closable:true,draw(){
    dim();const x=30,y=8,w=260,h=164;panel(x,y,w,h,{title:(label+' · '+CLASSES[cls].title).toUpperCase()});
    const ps=Object.values(POWERS).filter(p=>p.c===cls).sort((a,b)=>a.lv-b.lv);
    scrollArea('pedit',x+6,y+10,w-10,h-30,ps.length*13,(yy,clip)=>{ps.forEach((p,i)=>{const cy=yy+i*13;const on=list.includes(p.id);
      rect(x+8,cy+2,8,8,C.edge);rect(x+9,cy+3,6,6,on?C.green:'#2a2018');if(on)text('✓',x+10,cy+3,C.edge,{sh:false});
      text(p.name,x+20,cy+3,on?C.gold:C.parch);text(`L${p.lv}${p.cost?' ◆'+p.cost:''}`,x+130,cy+3,C.mute);
      const d=wrap(p.desc,110)[0];text(d.length<p.desc.length?d+'…':d,x+160,cy+3,C.dim);
      if(cy+12>clip[0]&&cy<clip[1]){hit(x+8,cy,120,12,{fn:()=>{const i2=list.indexOf(p.id);if(i2>=0){if(list.length>1)list.splice(i2,1);}else list.push(p.id);},id:'pe'+p.id});
        hit(x+128,cy,w-136,12,{fn:()=>msg(p.name,powerText(p,null),null,200),id:'pd'+p.id});}
    });});
    text(`${list.length} powers`,x+8,y+h-13,C.mute);
    button(x+w/2-30,y+h-16,60,12,'DONE',closeModal,{hot:true});
  }});
}
function skirmishStart(){
  const lvl=SK.lvl;const hpAt=c=>CLASSES[c].hp+CLASSES[c].grow*(lvl-1);
  const party=ORDER.map(c=>({cls:c,lvl,maxHp:hpAt(c),hp:hpAt(c),powers:SK.partyPow[c].slice()}));
  const enemies=[];
  for(const t in SK.foes)for(let i=0;i<SK.foes[t];i++)enemies.push({type:t});
  const rivals=ORDER.filter(c=>SK.rivals[c]);
  const type=SK_MISSIONS[SK.mission];
  const f=clamp(Math.round((lvl-1)*1.0),0,11);
  CTX={mode:'skirmish',relics:[],skirmish:true};
  const enc=genEncounter(f,type,{act:SK.act,hazards:SK.haz,enemies,title:'Skirmish'});
  const spots=[[3,0],[4,0],[2,1],[5,1]].map(([x,y])=>({x,y}));
  rivals.forEach((c,i)=>{let s=spots[i];if(enc.tiles[K(s.x,s.y)].ob||enc.enemies.some(e=>e.x===s.x&&e.y===s.y)){s=null;for(let y=0;y<3&&!s;y++)for(let x=0;x<COLS&&!s;x++)if(!enc.tiles[K(x,y)].ob&&!enc.tiles[K(x,y)].haz&&!enc.enemies.some(e=>e.x===x&&e.y===y))s={x,y};}
    if(s)enc.enemies.push({pc:c,lvl,hp:hpAt(c),maxHp:hpAt(c),powers:SK.rivalPow[c].slice(),x:s.x,y:s.y});});
  setupBattle(enc,party);
  beginBattleScreen(o=>{openModal(dialog({title:o==='win'?'VICTORY':'DEFEAT',body:o==='win'?'The skirmish is won.':'Your party has fallen.',closable:false,buttons:[{l:'BACK TO SETUP',hot:true,fn:()=>{G=null;go(SKIRMISH_SCREEN);}},{l:'REMATCH',fn:skirmishStart}]}));});
}
const SKIRMISH_SCREEN={enter(){CTX={mode:'skirmish',relics:[],skirmish:true};},draw(){
  rect(0,0,SW,SH,C.bg);
  text('SKIRMISH',6,4,C.gold,{sc:2,ol:C.edge});
  const tabs=['MONSTERS','RIVAL PARTY','YOUR PARTY','FIELD'];
  tabs.forEach((t,i)=>button(90+i*57,3,55,12,t,()=>{SK.tab=i;},{on:SK.tab===i}));
  const nFoes=Object.values(SK.foes).reduce((a,b)=>a+b,0)+ORDER.filter(c=>SK.rivals[c]).length;
  button(SW-66,SH-17,62,14,'START',skirmishStart,{hot:true,disabled:!nFoes});
  button(4,SH-17,50,14,'BACK',()=>go(TITLE_SCREEN),{});
  text(`Foes: ${nFoes} · Level ${SK.lvl} · ${ACTS[SK.act].sub} · ${MISSIONS[SK_MISSIONS[SK.mission]].name}`,SW/2,SH-12,C.mute,{al:'c'});
  if(SK.tab===0){
    panel(2,18,150,SH-38,{plain:true});
    const list=Object.values(MON).filter(m=>!m.object);
    scrollArea('skm',5,21,144,SH-44,list.length*16,(yy,clip)=>{list.forEach((m,i)=>{const y=yy+i*16;const n=SK.foes[m.id]||0;
      if(SK.sel===m.id)rect(5,y,142,16,'#3a2e1a');ctx.drawImage(spr(m.art).c,6,y);text(m.name,24,y+2,n?C.gold:C.parch);text(m.role,24,y+9,C.mute);
      if(y+16>clip[0]&&y<clip[1]){hit(5,y,100,16,{fn:()=>{SK.sel=m.id;scrollTo('skd',0);},id:'skm'+m.id});
        button(106,y+2,11,11,'-',()=>{if(n>0)SK.foes[m.id]=n-1;},{disabled:!n});text(String(n),123,y+5,C.white,{al:'c'});button(129,y+2,11,11,'+',()=>{SK.foes[m.id]=n+1;},{disabled:nFoes>=12});}
    });});
    panel(154,18,164,SH-38,{});const m=MON[SK.sel];
    inset(160,23,34,34,'#15100c');ctx.drawImage(spr(m.art).c,0,0,16,16,161,24,32,32);text(m.name,198,25,C.gold);
    const body=monBlock(m);scrollArea('skd',160,60,154,SH-84,richH(body,148),(yy,clip)=>rich(body,160,yy,148,C.parch,{clip}));
  }else if(SK.tab===1||SK.tab===2){
    const rival=SK.tab===1;
    panel(2,18,SW-4,SH-38,{});
    text(rival?'Add heroes to fight against, with any powers you like.':'Choose the powers your own party brings.',8,24,C.mute);
    ORDER.forEach((c,i)=>{const y=34+i*28;const on=rival?SK.rivals[c]:true;const list=rival?SK.rivalPow[c]:SK.partyPow[c];
      inset(8,y,24,24,'#15100c');ctx.drawImage(spr(c,rival?'rival':null).c,12,y+4);
      text(rival?CLASSES[c].rival:CLASSES[c].name,38,y+3,on?C.gold:C.dim);text(CLASSES[c].title,38,y+10,C.mute);
      text(list.map(id=>POWERS[id].name).join(', '),38,y+17,C.parch);
      if(rival)button(220,y+4,40,13,on?'IN':'OUT',()=>{SK.rivals[c]=!SK.rivals[c];},{on});
      button(264,y+4,48,13,'POWERS',()=>openPowerEditor(c,list,rival?'Rival powers':'Party powers'),{});
    });
  }else{
    panel(2,18,SW-4,SH-38,{});
    const rows=[['Hero level',`${SK.lvl}`,()=>{SK.lvl=SK.lvl%12+1;}],['Land',ACTS[SK.act].sub,()=>{SK.act=(SK.act+1)%3;}],['Hazards',SK.haz?'On':'Off',()=>{SK.haz=!SK.haz;}],['Mission',MISSIONS[SK_MISSIONS[SK.mission]].name,()=>{SK.mission=(SK.mission+1)%SK_MISSIONS.length;}]];
    rows.forEach((r,i)=>{const y=30+i*20;text(r[0],14,y+4,C.parch);button(110,y,120,14,r[1],r[2],{});});
    rich('Monsters scale with hero level. The Land sets the terrain and hazards: fire in the Greenmarch, acid in the Barrow Moors, lava in the Ashen Waste.',14,114,290,C.mute);
  }
}};

/* ---------------- main loop ---------------- */
function loop(t){
  NOW=t;
  HITS=[];
  ctx.imageSmoothingEnabled=false;
  try{
    if(SCREEN)SCREEN.draw();
    for(let i=0;i<MODALS.length;i++){const m=MODALS[i];if(i<MODALS.length-1){m.draw();HITS=HITS.filter(()=>false);}else m.draw();}
  }catch(e){console.error(e);}
  PHITS=HITS;
  requestAnimationFrame(loop);
}
