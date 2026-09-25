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
  const key='title'+SW;if(BGC[key])return BGC[key];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const r=mulberry(77);
  const sky=['#0c0810','#140a12','#1e0e14','#2a1216','#3a1814','#4e2012','#6a2c10'];const bh=Math.ceil(SH*.1);
  sky.forEach((col,i)=>{g.fillStyle=col;g.fillRect(0,i*bh,SW,bh);g.fillStyle=sky[Math.min(6,i+1)];for(let k=0;k<260;k++){g.fillRect(Math.floor(r()*SW),i*bh+bh-6+Math.floor(r()*6),1,1);}});
  g.fillStyle=sky[6];g.fillRect(0,7*bh,SW,SH);
  g.fillStyle='#fff4d0';for(let i=0;i<40;i++)g.fillRect(Math.floor(r()*SW),Math.floor(r()*SH*.33),1,1);
  const ridge=(base,amp,col,seed)=>{const rr=mulberry(seed);g.fillStyle=col;let h=base;for(let x=0;x<SW;x++){h+=(rr()-.5)*amp;h=clamp(h,base-30,base+20);g.fillRect(x,Math.floor(h),1,SH-Math.floor(h));}};
  const vx=SW*.81,vy=SH*.32;
  g.fillStyle='#2a1418';g.beginPath();g.moveTo(vx-60,SH*.67);g.lineTo(vx-8,vy);g.lineTo(vx+8,vy);g.lineTo(vx+60,SH*.66);g.lineTo(vx+60,SH);g.lineTo(vx-60,SH);g.fill();
  const gl=g.createRadialGradient(vx,vy-2,2,vx,vy-2,40);gl.addColorStop(0,'rgba(255,160,60,.9)');gl.addColorStop(.3,'rgba(255,80,20,.4)');gl.addColorStop(1,'rgba(255,60,0,0)');g.fillStyle=gl;g.fillRect(vx-60,vy-50,120,90);
  g.fillStyle='#ff8a20';for(let i=0;i<14;i++)g.fillRect(vx-10+Math.floor(r()*18),vy+Math.floor(r()*30),1,2);
  ridge(SH*.66,3,'#1c1016',5);ridge(SH*.76,3.5,'#140c10',9);ridge(SH*.86,2.5,'#0c0709',13);
  const tx=Math.round(SW*.125),ty=Math.round(SH*.62);
  g.fillStyle='#0c0709';g.fillRect(tx,ty,12,SH);g.fillRect(tx-2,ty-4,16,5);for(let i=0;i<4;i++)g.fillRect(tx-2+i*4,ty-8,2,4);g.fillStyle='#ffb040';g.fillRect(tx+5,ty+8,2,3);g.fillRect(tx+5,ty+20,2,3);
  return BGC[key]=c;
}
function mapBG(act,seed,hh){
  const SH=hh||screenH();const key='map'+act+'_'+seed+'_'+SW+'_'+SH;if(BGC[key])return BGC[key];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const r=mulberry(seed+act*13);
  const P=[['#3a5424','#46622a','#324a20'],['#2c322c','#343a32','#262c26'],['#2a1c18','#34241e','#221612']][act];
  paintDither(g,0,0,SW,SH,P[0],P[1],r,.18);g.fillStyle=P[2];for(let i=0;i<SW*SH*.08;i++)g.fillRect(Math.floor(r()*SW),Math.floor(r()*SH),1,1);
  const blob=(x,y,rx,ry,c1,c2)=>{for(let yy=-ry;yy<=ry;yy++){const w=Math.floor(rx*Math.sqrt(1-(yy*yy)/(ry*ry)));g.fillStyle=yy<-ry/3?c2:c1;g.fillRect(x-w,y+yy,w*2+1,1);}};
  if(act===0){
    let x=120+r()*80;g.fillStyle='#2a5a8a';for(let y=14;y<SH;y++){x+=Math.sin(y/14)*1.2+(r()-.5);g.fillStyle='#1e3e5e';g.fillRect(Math.floor(x)-3,y,7,1);g.fillStyle='#3a6a9a';g.fillRect(Math.floor(x)-2,y,5,1);if(r()<.3){g.fillStyle='#8ab8e0';g.fillRect(Math.floor(x),y,1,1);}}
    for(let i=0;i<5;i++){const fx=Math.floor(r()*(SW-20)),fy=20+Math.floor(r()*(SH-40));g.fillStyle='#6a6a2e';g.fillRect(fx,fy,18,10);g.fillStyle='#7e7a38';for(let j=0;j<5;j++)g.fillRect(fx,fy+j*2,18,1);g.fillStyle='#3a2e1a';g.fillRect(fx,fy+10,18,1);}
    for(let i=0;i<14;i++){const cx=Math.floor(r()*SW),cy=20+Math.floor(r()*(SH-30));for(let j=0;j<7;j++){const tx=cx+Math.floor(r()*18-9),ty=cy+Math.floor(r()*12-6);blob(tx,ty,3,3,'#24401a','#3a6a24');g.fillStyle='#142a0e';g.fillRect(tx-1,ty+3,3,1);}}
    for(let x=-10;x<SW;x+=16+Math.floor(r()*10)){const h=10+Math.floor(r()*10),w=12+Math.floor(r()*6);g.fillStyle='#3a3a38';g.beginPath();g.moveTo(x-w,14+h+2);g.lineTo(x,14);g.lineTo(x+w,14+h+2);g.fill();g.fillStyle='#55554e';g.beginPath();g.moveTo(x-w+3,14+h+2);g.lineTo(x,14);g.lineTo(x+1,14+h+2);g.fill();g.fillStyle='#e8e8e0';g.beginPath();g.moveTo(x-3,18);g.lineTo(x,14);g.lineTo(x+3,18);g.fill();}
  }else if(act===1){
    for(let i=0;i<9;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*(SH-30));blob(px,py,8+Math.floor(r()*10),3+Math.floor(r()*3),'#1a2626','#243232');g.fillStyle='#3a4a44';g.fillRect(px-3,py-1,6,1);}
    for(let i=0;i<7;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*(SH-30));blob(px,py,9,5,'#3a4234','#48503e');g.fillStyle='#8a8a80';g.fillRect(px-1,py-7,2,3);}
    for(let i=0;i<12;i++){const px=Math.floor(r()*SW-8),py=16+Math.floor(r()*(SH-30));g.drawImage(spr('deadtree').c,px,py);}
    for(let i=0;i<10;i++){const px=Math.floor(r()*SW),py=20+Math.floor(r()*(SH-30));g.fillStyle='#7a7a74';g.fillRect(px,py,2,4);g.fillStyle='#4a4a44';g.fillRect(px,py+4,2,1);}
  }else{
    for(let i=0;i<3;i++){let x=Math.floor(r()*SW),y=14;g.lineWidth=1;for(;y<SH;y++){x+=Math.round(r()*2-1)+(r()<.1?2:0);g.fillStyle='#5a1606';g.fillRect(x-2,y,5,1);g.fillStyle='#d8400c';g.fillRect(x-1,y,3,1);if(r()<.4){g.fillStyle='#ffb040';g.fillRect(x,y,1,1);}}}
    for(let i=0;i<30;i++){const px=Math.floor(r()*SW),py=16+Math.floor(r()*(SH-20)),h=4+Math.floor(r()*9);g.fillStyle='#140c0a';g.beginPath();g.moveTo(px-3,py);g.lineTo(px,py-h);g.lineTo(px+3,py);g.fill();g.fillStyle='#3a2a24';g.fillRect(px,py-h+1,1,h-2);}
    const vx=SW-26;g.fillStyle='#1e1412';g.beginPath();g.moveTo(vx-26,60);g.lineTo(vx,22);g.lineTo(vx+12,22);g.lineTo(SW,56);g.lineTo(SW,14);g.lineTo(vx-38,14);g.fill();
    g.fillStyle='#ff7a20';g.fillRect(vx,22,12,2);
  }
  const vg=g.createRadialGradient(SW/2,SH/2,60,SW/2,SH/2,Math.max(SW,SH)*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,SW,SH);
  return BGC[key]=c;
}
const EMBERS=Array.from({length:30},(_,i)=>({x:Math.random()*SW,y:Math.random()*SH,s:.2+Math.random()*.5,ph:Math.random()*6}));
function drawEmbers(col){for(const e of EMBERS){e.y-=e.s;e.x+=Math.sin(NOW/900+e.ph)*.15;if(e.y<0){e.y=SH;e.x=Math.random()*SW;}rect(e.x,e.y,1,1,col||(Math.floor(NOW/200+e.ph)%2?'#ffb040':'#ff6a20'));}}

/* ---------------- title ---------------- */
const TITLE_SCREEN={enter(){this.save=loadSave();},draw(){
  ctx.drawImage(titleBG(),0,0);drawEmbers();
  const tw=textW('EMBERWATCH',3);const lx=PORT?Math.floor((SW-tw)/2):16,ly=PORT?30:22;
  text('EMBERWATCH',lx+2,ly+2,'#5a2008',{sc:3,sh:false});
  text('EMBERWATCH',lx,ly,C.gold,{sc:3,ol:'#2a0e04'});
  rect(lx,ly+20,tw,1,C.gold2);
  text('T A C T I C S',PORT?SW/2:lx,ly+24,'#ffb070',{ol:'#2a0e04',al:PORT?'c':undefined});
  if(PORT){text('Four heroes. Three lands.',SW/2,ly+38,C.parch,{al:'c'});text('One dragon.',SW/2,ly+46,C.parch,{al:'c'});}
  else text('Four heroes. Three lands. One dragon.',16,58,C.parch);
  const px=PORT?Math.floor(SW/2-34):58,py=PORT?Math.round(SH*.66)-18:146;
  if(PORT)ORDER.forEach((c,i)=>{ctx.drawImage(sprH(c).c,SW/2-72+i*36,py-16+(Math.floor(NOW/500+i)%2));});
  else ORDER.forEach((c,i)=>{const S=spr(c);ctx.drawImage(S.c,px+i*17,py+(Math.floor(NOW/500+i)%2));});
  const save=this.save;
  const items=[];
  if(save)items.push(['CONTINUE',()=>{continueRun();},true]);
  items.push(['NEW JOURNEY',()=>{if(save)openModal(dialog({title:'START OVER?',body:'This replaces your saved journey.',buttons:[{l:'START',hot:true,fn:()=>{newRun();go(MAP_SCREEN);}},{l:'CANCEL'}]}));else{newRun();go(MAP_SCREEN);}},!save]);
  items.push(['SKIRMISH',()=>go(SKIRMISH_SCREEN)]);
  items.push(['COMPENDIUM',()=>{SCREEN_BACK=null;go(COMP_SCREEN);}]);
  items.push(['HOW TO PLAY',openHowTo]);
  items.push(['SETTINGS',()=>openSettings(false)]);
  const mh=items.length*16+10,mx=PORT?Math.floor((SW-120)/2):190,my=PORT?SH-mh-14:64;
  panel(mx,my,120,mh,{fill:'rgba(20,14,12,.9)'});
  items.forEach((it,i)=>button(mx+6,my+6+i*16,108,13,it[0],it[1],{hot:!!it[2]}));
  const best=+(localStorage.getItem(BEST_KEY)||0);if(best)text(`Most battles won: ${best}`,SW-4,SH-8,C.mute,{al:'r'});
}};

/* ---------------- overworld map ---------------- */
function roadLine(x1,y1,x2,y2,col,dark){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i+=3){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);rect(x-1,y-1,3,3,dark);rect(x,y,2,2,col);}}
let MAPSEL=null;
function screenH(){return SH;}
/* Portrait maps are taller than the screen and scroll; landscape maps fit. */
const MAPP={top:31,fs:64};
function mapVH(){return PORT?70+6*MAPP.fs+72:SH;}
function mapViewH(){return PORT?SH-46-MAPP.top:SH;}
function nodePos(n){
  if(!PORT)return {x:n.x,y:n.y};
  const VH=mapVH();
  if(n.id==='boss')return {x:SW/2,y:36};
  const jx=(n.x*7)%7-3,jy=(n.y*5)%9-4;
  return {x:Math.round(SW/2+(n.l-1.5)*46)+jx,y:VH-44-n.f*MAPP.fs+jy};
}
const MAPS={y:0,anim:null};
function mapScrollTo(vy){MAPS.y=clamp(vy-mapViewH()/2,0,Math.max(0,mapVH()-mapViewH()));}
function startTravel(id){
  const M=RUN.map;const to=nodePos(M.nodes[id]);
  const from=RUN.pos?nodePos(M.nodes[RUN.pos]):(PORT?{x:14,y:mapVH()-20}:{x:6,y:95});
  MAPS.anim={from,to,id,t0:NOW,dur:Math.min(1400,380+Math.hypot(to.x-from.x,to.y-from.y)*9)};sfx('step');
}
const MAP_SCREEN={enter(){MAPSEL=null;MAPS.anim=null;const M=RUN.map;const cur=RUN.pos?nodePos(M.nodes[RUN.pos]):{y:mapVH()};mapScrollTo(cur.y-40);},draw(){
  const M=RUN.map;
  const oy=PORT?MAPP.top-Math.round(MAPS.y):0;
  const A=MAPS.anim;
  let tok=RUN.pos?nodePos(M.nodes[RUN.pos]):(PORT?{x:14,y:mapVH()-20}:{x:6,y:95}),hop=0;
  if(A){const p=Math.min(1,(NOW-A.t0)/A.dur);const e=p<.5?2*p*p:1-2*(1-p)*(1-p);tok={x:A.from.x+(A.to.x-A.from.x)*e,y:A.from.y+(A.to.y-A.from.y)*e};hop=Math.round(Math.abs(Math.sin(p*Math.PI*4))*3);
    if(Math.floor(p*8)!==A.step){A.step=Math.floor(p*8);sfx('step');}
    if(PORT)mapScrollTo(tok.y);
    if(p>=1){MAPS.anim=null;travel(A.id);return;}}
  if(PORT){ctx.save();ctx.beginPath();ctx.rect(0,MAPP.top,SW,mapViewH());ctx.clip();}
  ctx.drawImage(mapBG(RUN.act,M.seed,mapVH()),0,oy);
  if(RUN.act===1){for(let i=0;i<(PORT?10:4);i++){const y=oy+30+i*38+Math.sin(NOW/3000+i)*6;ctx.globalAlpha=.08;rect(0,y,SW,10,'#d0d8d0');ctx.globalAlpha=1;}}
  if(RUN.act===2)drawEmbers();
  const avail=new Set(A?[]:availableNodes());
  const vis=new Set(M.visited);
  const scr=PORT?{scroll:d=>{if(!MAPS.anim)MAPS.y=clamp(MAPS.y-d,0,Math.max(0,mapVH()-mapViewH()));}}:{};
  if(PORT)hit(0,MAPP.top,SW,mapViewH(),Object.assign({id:'mapscroll'},scr));
  for(const e of M.edges){const[a,b]=e.split('>');const P1=nodePos(M.nodes[a]),P2=nodePos(M.nodes[b]);const walked=vis.has(a)&&vis.has(b)&&M.visited.indexOf(b)===M.visited.indexOf(a)+1;roadLine(P1.x,P1.y+oy,P2.x,P2.y+oy,walked?'#e8c070':'#7a5a34','#1a0e08');}
  for(const n of Object.values(M.nodes)){
    const q=nodePos(n);const y=q.y+oy;
    const av=avail.has(n.id),vd=vis.has(n.id);const big=n.type==='boss';const r=PORT?(big?17:12):(big?11:7);
    if(av){const p=Math.floor(NOW/250)%2;circle(q.x,y,r+2+p,C.gold);}
    circle(q.x,y,r+1,C.edge);circle(q.x,y,r,vd?'#3a3028':'#e8dcc0');circle(q.x,y,r-1,vd?'#2a221c':'#c8b890');
    if(big){if(PORT){ctx.drawImage(sprH(MON[BOSSES[RUN.act]].art).c,q.x-16,y-18);}else{const S=spr(MON[BOSSES[RUN.act]].art);ctx.drawImage(S.c,q.x-8,y-9);}}
    else if(PORT)ctx.drawImage(iconH(n.type),q.x-11,y-11);else ctx.drawImage(icon(n.type),q.x-5,y-5);
    if(vd&&n.id!==RUN.pos){ctx.globalAlpha=.6;circle(q.x,y,r-1,'#1a1410');ctx.globalAlpha=1;text('✓',q.x,y-2,C.mute,{al:'c'});}
    hit(q.x-r-2,y-r-2,2*r+4,2*r+4,Object.assign({fn:()=>{if(!MAPS.anim)mapNodeTap(n,av);},id:'node'+n.id},scr));
  }
  if(PORT){const S=sprH('fighter');ctx.drawImage(S.c,Math.round(tok.x-16),Math.round(tok.y+oy-36-hop+(A?0:Math.floor(NOW/400)%2)));}
  else ctx.drawImage(spr('fighter').c,Math.round(tok.x-8),Math.round(tok.y-20-hop+(A?0:Math.floor(NOW/400)%2)));
  if(!RUN.pos&&RUN.act===0&&!M.visited.length&&!A){const p=.6+.4*Math.sin(NOW/300);ctx.globalAlpha=p;text('Choose where to go first',SW/2,PORT?oy+mapVH()-18:20,C.parch,{al:'c',ol:C.edge});ctx.globalAlpha=1;}
  if(PORT)ctx.restore();
  if(PORT){
    rect(0,0,SW,MAPP.top,'rgba(12,8,6,.95)');rect(0,MAPP.top-1,SW,1,C.rim);hit(0,0,SW,MAPP.top,{id:'mapbar'});hit(0,SH-46,SW,46,{id:'mapbar2'});
    text(`ACT ${ROMAN[RUN.act]}`,4,3,C.gold,{sc:2,ol:C.edge});
    text(ACTS[RUN.act].sub.toUpperCase(),4+textW(`ACT ${ROMAN[RUN.act]}`,2)+6,7,C.parch);
    coin(SW-34,7);text(String(RUN.gold),SW-26,7,C.gold);
    RUN.relics.slice(0,11).forEach((r,i)=>{relicIcon(r,3+i*12,17);hit(3+i*12,17,11,11,{fn:()=>msg(RELICS[r].name,RELICS[r].desc,null,160),id:'mr'+r});});
    if(RUN.relics.length>11)text('+'+(RUN.relics.length-11),3+11*12,20,C.mute);
    button(SW-40,17,37,12,'MENU',()=>openSettings(false,true),{});
    const by=SH-46;rect(0,by,SW,46,'rgba(12,8,6,.95)');rect(0,by,SW,1,C.rim);
    const hw=Math.floor(SW/4);
    RUN.heroes.forEach((h,i)=>{const x=i*hw;ctx.drawImage(sprH(h.cls).c,x+Math.floor((hw-32)/2),by+2);bar(x+3,by+36,hw-6,5,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}`,x+hw-3,by+2,C.parch,{al:'r'});hit(x,by,hw,46,{fn:()=>openUnitInfo(heroSheetUnit(h)),id:'mh'+i});});
  }else{
    rect(0,0,SW,13,'rgba(12,8,6,.92)');rect(0,13,SW,1,C.rim);
    text(`ACT ${ROMAN[RUN.act]} · ${ACTS[RUN.act].sub.toUpperCase()}`,4,4,C.gold);
    coin(SW-40,4);text(String(RUN.gold),SW-32,4,C.gold);
    rect(0,SH-16,SW,16,'rgba(12,8,6,.92)');rect(0,SH-17,SW,1,C.rim);
    RUN.heroes.forEach((h,i)=>{const x=3+i*38;ctx.drawImage(spr(h.cls).c,0,0,16,12,x,SH-14,16,12);bar(x+17,SH-12,19,4,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}`,x+17,SH-7,C.parch);hit(x,SH-15,36,14,{fn:()=>openUnitInfo(heroSheetUnit(h)),id:'mh'+i});});
    RUN.relics.slice(0,8).forEach((r,i)=>{relicIcon(r,158+i*12,SH-14);hit(158+i*12,SH-14,11,11,{fn:()=>msg(RELICS[r].name,RELICS[r].desc,null,160),id:'mr'+r});});
    if(RUN.relics.length>8)text('+'+(RUN.relics.length-8),256,SH-11,C.mute);
    button(282,SH-14,35,11,'MENU',()=>openSettings(false,true),{});
  }
}};
function mapNodeTap(n,av){
  const I=NODE_INFO[n.type];const body=n.type==='boss'?`${MON[BOSSES[RUN.act]].name}. ${BOSS_TXT[RUN.act]}`:I.desc;
  openModal(dialog({title:(n.type==='boss'?'BOSS':I.name.toUpperCase()),body:body+(av?'':'\n{m:You cannot reach this yet.}'),w:170,buttons:av?[{l:'TRAVEL',hot:true,fn:()=>startTravel(n.id)},{l:'CANCEL'}]:[{l:'OK'}]}));
}

/* ---------------- rewards ---------------- */
function goReward(){if(!nextRewardStep()){finishRewards();return;}go(REWARD_SCREEN);}
function offerCard(x,y,w,h,draw,fn,id){panel(x,y,w,h,{});draw(x+4,y+4,w-8,h-8);hit(x,y,w,h,{fn,id});}
const REWARD_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);drawEmbers('#6a3a1a');
  const P=RUN.pending;const s=nextRewardStep();if(!s){finishRewards();return;}
  const head=P.kind==='treasure'?'TREASURE':P.kind==='rest'?'TRAINING':P.kind==='event'?'FORTUNE':'VICTORY';
  text(head,SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  const subs=[];
  if(P.gold)subs.push(`+${P.gold} gold.`);
  if(P.lvl)subs.push(`Every hero reaches level ${P.lvl}.`+([4,7,10].includes(P.lvl)?' Primary attributes rise!':''));
  let ty=22;
  for(const l of wrap(PORT?subs.join('\n'):subs.join(' '),SW-8)){text(l,SW/2,ty,C.parch,{al:'c'});ty+=7;}
  const title=s==='train'?'Choose a power to learn':'Choose a relic';
  text(title,SW/2,ty+2,C.mute,{al:'c'});ty+=12;
  const offers=P.offers;const w=PORT?SW-12:100,gap=4;const x0=PORT?6:Math.floor((SW-offers.length*w-(offers.length-1)*gap)/2);
  const ch=PORT?Math.floor((SH-24-ty-gap*offers.length)/offers.length):112;
  offers.forEach((o,i)=>{
    const x=PORT?x0:x0+i*(w+gap),y=PORT?ty+i*(ch+gap):42;
    offerCard(x,y,w,ch,(cx,cy,cw)=>{
      if(s==='train'){const p=POWERS[o.id];const h=RUN.heroes.find(q=>q.cls===o.cls);const hi=PORT,ox=hi?35:18;ctx.drawImage(art(o.cls).c,cx,cy-(hi?2:0));text(CLASSES[o.cls].name,cx+ox,cy+1,C.mute);text(p.name,cx+ox,cy+8,C.gold);
        const u=heroSheetUnit(h);const body=powerText(p,u);rich(body,hi?cx+ox:cx,cy+(hi?17:19),hi?cw-ox:cw,C.parch);}
      else{relicIcon(o,cx,cy);text(RELICS[o].name,cx+14,cy+3,C.gold);rich(RELICS[o].desc,cx,cy+16,cw,C.parch);}
    },()=>{sfx('chest');takeReward(o);if(!nextRewardStep())finishRewards();},'offer'+i);
  });
  button(SW/2-30,SH-20,60,13,'SKIP',()=>{takeReward(null);if(!nextRewardStep())finishRewards();},{});
}};

/* ---------------- shop ---------------- */
const SHOP_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);
  text('MERCHANT',SW/2,5,C.gold,{al:'c',sc:2,ol:C.edge});
  if(PORT){coin(SW-34,SH-17);text(String(RUN.gold),SW-26,SH-17,C.gold);}else{coin(SW-44,6);text(String(RUN.gold),SW-36,6,C.gold);}
  const items=RUN.shop.items;
  items.forEach((it,i)=>{
    const pw2=Math.floor((SW-12)/2),x=PORT?4+(i%2)*(pw2+4):6+(i%3)*104,y=PORT?24+Math.floor(i/2)*Math.min(96,Math.floor((SH-50)/3)):24+Math.floor(i/3)*68,w=PORT?pw2:100,h=PORT?Math.min(92,Math.floor((SH-50)/3)-4):64;
    panel(x,y,w,h,{fill:it.sold?'#141010':C.panel});
    const cx=x+5,cy=y+5,cw=w-10;
    if(it.sold){text('SOLD',x+w/2,y+28,C.dim,{al:'c',sc:2});return;}
    let name,desc;
    if(it.kind==='relic'){relicIcon(it.id,cx,cy);name=RELICS[it.id].name;desc=RELICS[it.id].desc;text(fitText(name,cw-14),cx+14,cy+3,C.gold);}
    else if(it.kind==='power'){if(PORT)token({kind:'pc',cls:it.cls,side:'hero'},cx+7,cy+5,7);else ctx.drawImage(spr(it.cls).c,cx,cy-2);name=POWERS[it.id].name;desc=`${CLASSES[it.cls].name} learns this power. `+POWERS[it.id].desc;text(fitText(name,cw-18),cx+18,cy+1,C.gold);text(CLASSES[it.cls].name,cx+18,cy+8,C.mute);}
    else{text('+',cx+4,cy+2,C.green,{sc:2});name='Healing Draught';desc='Every hero heals 40% of their health.';text(name,cx+14,cy+3,C.gold);}
    rich(desc,cx,cy+17,cw,C.parch,{nohit:true});
    const ok=RUN.gold>=it.price;coin(x+w-30,y+h-12);text(String(it.price),x+w-22,y+h-12,ok?C.gold:C.red);
    hit(x,y,w,h,{fn:()=>{const body=(it.kind==='power'?powerText(POWERS[it.id],heroSheetUnit(RUN.heroes.find(q=>q.cls===it.cls))):desc)+`\n\nPrice: ${it.price} gold.`;
      openModal(dialog({title:name.toUpperCase(),body,w:200,buttons:[{l:'BUY',hot:true,disabled:!ok,fn:()=>buyItem(it)},{l:'CANCEL'}]}));},id:'shop'+i});
  });
  button(PORT?6:SW/2-35,SH-18,70,14,'LEAVE',()=>{RUN.stage='map';RUN.shop=null;saveGame();go(MAP_SCREEN);},{hot:true});
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
  const cx=SW/2,cy=PORT?176:112;
  rect(0,cy-2,SW,SH,'#141a10');
  campfire(cx,cy,2);
  ORDER.forEach((c,i)=>{const S=art(c);if(PORT){const off=[[-68,-28],[-50,-4],[18,-4],[36,-28]][i];ctx.drawImage(i<2?S.c:S.f,cx+off[0],cy+off[1]);}else{const off=[[-48,-8],[-32,8],[24,8],[40,-8]][i];ctx.drawImage(i<2?S.c:S.f,0,0,16,16,cx+off[0],cy+off[1],16,16);}});
  text('CAMPFIRE',SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let ty=24;for(const l of wrap('The night is quiet. Choose how to spend it.',SW-8)){text(l,SW/2,ty,C.parch,{al:'c'});ty+=7;}
  const rest=()=>{RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*.4)));sfx('heal');RUN.stage='map';saveGame();go(MAP_SCREEN);};
  const train=()=>{RUN.stage='reward';RUN.pending={steps:['train'],kind:'rest'};saveGame();goReward();};
  if(PORT){button(16,SH-44,SW-32,16,'REST · heal 40%',rest,{hot:true});button(16,SH-24,SW-32,16,'TRAIN · learn a power',train,{hot:true});}
  else{button(40,146,110,16,'REST · heal 40%',rest,{hot:true});button(170,146,110,16,'TRAIN · learn a power',train,{hot:true});}
  RUN.heroes.forEach((h,i)=>{const x=PORT?14+(i%2)*84:40+i*62,y=PORT?44+Math.floor(i/2)*24:40;text(CLASSES[h.cls].name,x,y,C.parch);bar(x,y+8,PORT?70:50,4,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}/${effMaxHp(h)}`,x,y+14,C.mute);});
}};

/* ---------------- events ---------------- */
function optButton(x,y,w,lab,fn,o){const lines=wrap(lab,w-8);const h=lines.length*7+7;button(x,y,w,h,'',fn,o);const c=o&&o.disabled?C.dim:C.parch;lines.forEach((l,i)=>text(l,x+w/2,y+4+i*7,c,{al:'c',sh:C.edge}));return h;}
const EVENT_SCREEN={draw(){
  rect(0,0,SW,SH,C.bg);drawEmbers('#4a2a1a');
  const ev=EVENTS.find(e=>e.id===RUN.event.id);
  const px=PORT?3:20,pw=SW-2*px,tw=pw-20;
  panel(px,8,pw,SH-16,{title:ev.title.toUpperCase()});
  const R=RUN.event.done;
  if(!R){
    let y=20+rich(ev.text,px+10,20,tw,C.parch)+8;
    ev.opts.forEach((o)=>{
      let lab=o.label;if(o.check){const b=bestAt(o.check.skill);lab+=` (${o.check.skill} ${o.check.dc}, ${CLASSES[b.h.cls].name} ${b.mod>=0?'+':''}${b.mod})`;}
      if(o.cost)lab+=` (${o.cost} gold)`;
      y+=optButton(px+10,y,tw,lab,()=>{const r=resolveEvent(o);if(r.fail){msg('Not enough gold',r.text);return;}RUN.event.done=r;saveGame();},{disabled:o.cost&&RUN.gold<o.cost})+4;
    });
  }else{
    rich(R.text,px+10,22,tw,C.parch);
    button(SW/2-50,SH-34,100,14,'CONTINUE',()=>{
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
  ctx.drawImage(sprH(won?'dragon':'fighter').c,SW/2-16,14);
  let y=52;
  for(const l of PORT?(won?['THE DRAGON','FALLS']:['THE WATCH','IS BROKEN']):[won?'THE DRAGON FALLS':'THE WATCH IS BROKEN']){text(l,SW/2,y,won?C.gold:C.red,{al:'c',sc:2,ol:C.edge});y+=14;}
  y+=4;for(const l of wrap(won?'Emberwatch stands. Songs will be sung of this company.':`Your company fell in ${ACTS[RUN.act].sub}. Another will rise.`,SW-12)){text(l,SW/2,y,C.parch,{al:'c'});y+=7;}
  y+=6;
  const st=[['BATTLES',RUN.stats.wins],['FOES SLAIN',RUN.stats.kills],['GOLD',RUN.stats.gold]];
  const bw=PORT?56:76,gap=PORT?2:8,sx=Math.floor((SW-3*bw-2*gap)/2);
  st.forEach((s,i)=>{const x=sx+i*(bw+gap);panel(x,y,bw,30,{});text(String(s[1]),x+bw/2,y+6,C.gold,{al:'c',sc:2});text(s[0],x+bw/2,y+20,C.mute,{al:'c'});});
  y+=38;
  RUN.heroes.forEach((h,i)=>{if(PORT){const x=SW/2-76+i*38;ctx.drawImage(sprH(h.cls).c,x+3,y);text('Lv '+h.lvl,x+19,y+34,C.parch,{al:'c'});}else{const x=SW/2-60+i*32;ctx.drawImage(spr(h.cls).c,x,y);text('Lv '+h.lvl,x+8,y+18,C.parch,{al:'c'});}});
  if(PORT){button(20,SH-40,SW-40,14,'NEW JOURNEY',()=>{newRun();go(MAP_SCREEN);},{hot:true});button(20,SH-22,SW-40,14,'TITLE',()=>go(TITLE_SCREEN),{});}
  else{button(60,156,90,14,'NEW JOURNEY',()=>{newRun();go(MAP_SCREEN);},{hot:true});button(170,156,90,14,'TITLE',()=>go(TITLE_SCREEN),{});}
}};

/* ---------------- settings & help ---------------- */
function openSettings(inBattle,onMap){
  openModal({closable:true,draw(){
    dim();const w=Math.min(180,SW-8),items=[];
    items.push([`Music: ${SET.music?'On':'Off'}`,()=>{SET.music=!SET.music;auInit();SET.music?musicStart():musicStop();saveSet();}]);
    items.push([`Sound effects: ${SET.sfx?'On':'Off'}`,()=>{SET.sfx=!SET.sfx;saveSet();}]);
    if(navigator.audioSession)items.push([`Silent switch: ${SET.loud?'Ignore':'Obey'}`,()=>{SET.loud=!SET.loud;auSession();saveSet();}]);
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
  const tw=PORT?40:60,tsx=PORT?41:62;
  tabs.forEach((t,i)=>button(PORT?31+i*tsx:4+i*tsx,3,tw,12,t,()=>{COMP.tab=i;COMP.sel=null;scrollTo('clist',0);scrollTo('cdet',0);},{on:COMP.tab===i}));
  const back=()=>{const b=SCREEN_BACK||TITLE_SCREEN;SCREEN_BACK=null;go(b);};
  if(PORT)button(2,3,27,12,'◀',back,{hot:true});else button(SW-54,3,50,12,'BACK',back,{hot:true});
  let entries=[];
  if(COMP.tab===0){
    ORDER.forEach((c,i)=>button(PORT?2+i*tsx:4+i*48,18,PORT?tw:46,11,CLASSES[c].title.toUpperCase(),()=>{COMP.cls=i;COMP.sel=null;scrollTo('clist',0);},{on:COMP.cls===i}));
    const cls=ORDER[COMP.cls];
    entries=[{k:'class',label:CLASSES[cls].name+' · class',col:C.gold}].concat(Object.values(POWERS).filter(p=>p.c===cls).sort((a,b)=>a.lv-b.lv||a.cost-b.cost).map(p=>({k:p.id,label:p.name,sub:`L${p.lv}`})));
  }else if(COMP.tab===1)entries=Object.keys(RELICS).map(r=>({k:r,label:RELICS[r].name,relic:r}));
  else if(COMP.tab===2){for(let a=0;a<3;a++){entries.push({hdr:ACTS[a].sub});for(const m of Object.values(MON))if(m.act===a)entries.push({k:m.id,label:m.name,sprite:m.art});}entries.push({hdr:'Special'});for(const m of Object.values(MON))if(m.act<0)entries.push({k:m.id,label:m.name,sprite:m.art});}
  else entries=Object.keys(GLOSS).sort((a,b)=>GLOSS[a].name.localeCompare(GLOSS[b].name)).map(k=>({k,label:GLOSS[k].name}));
  const ly=COMP.tab===0?32:18;
  const lx=2,lw=PORT?SW-4:112,lh=PORT?Math.round((SH-ly)*.4):SH-ly;
  const dxp=PORT?2:116,dyp=PORT?ly-2+lh+2:ly-2,dwp=PORT?SW-4:SW-118,dhp=PORT?SH-2-dyp:SH-ly;
  panel(lx,ly-2,lw,lh,{plain:true});
  if(!COMP.sel&&entries.length)COMP.sel=entries.find(e=>e.k).k;
  const rowH=e=>e.hdr?9:e.sprite?(PORT?33:15):10;
  const ch=entries.reduce((s,e)=>s+rowH(e),0)+4;
  scrollArea('clist',lx+3,ly+1,lw-6,lh-6,ch,(yy,clip)=>{let y=yy;for(const e of entries){const h=rowH(e);
    if(e.hdr){text(e.hdr.toUpperCase(),lx+6,y+2,C.mute,{sh:false});y+=h;continue;}
    if(COMP.sel===e.k)rect(lx+3,y,lw-8,h,'#3a2e1a');
    let tx=lx+6;if(e.sprite){if(PORT){ctx.drawImage(sprH(e.sprite).c,lx+4,y);tx=lx+40;}else{ctx.drawImage(spr(e.sprite).c,lx+4,y-1);tx=lx+22;}}if(e.relic){relicIcon(e.relic,lx+4,y);tx=lx+17;}
    text(e.label,tx,y+(e.sprite?(PORT?13:5):2),COMP.sel===e.k?C.gold:(e.col||C.parch));if(e.sub)text(e.sub,lx+lw-6,y+2,C.mute,{al:'r'});
    if(y+h>clip[0]&&y<clip[1])hit(lx+3,Math.max(y,clip[0]),lw-8,h,{fn:()=>{COMP.sel=e.k;scrollTo('cdet',0);},id:'ce'+e.k});
    y+=h;}});
  panel(dxp,dyp,dwp,dhp,{});
  const dx=dxp+6,dw=dwp-14;let title='',body='',art=null;
  const k=COMP.sel;
  if(COMP.tab===0){
    const cls=ORDER[COMP.cls];
    if(k==='class'){const Cc=CLASSES[cls];title=`${Cc.name}, ${Cc.title}`;art=cls;const a=Cc.attrs;
      body=`{m:${Cc.role}} · Health ${Cc.hp} (+${Cc.grow} per level) · Speed ${Cc.speed}\n${attrLine(a)}\nPrimary: ${ATTR[Cc.prime]} (rises at levels 4, 7, 10). Secondary: ${ATTR[Cc.second]}.\nTrained skills: ${Cc.skills.join(', ')}.\n\n${Cc.trait}\n\nStarting powers: ${Cc.start.map(id=>POWERS[id].name).join(', ')}.`;}
    else if(POWERS[k]){const p=POWERS[k];title=p.name;art=cls;body=`{m:Level ${p.lv} ${CLASSES[cls].title} power}\n`+powerText(p,null);}
  }else if(COMP.tab===1&&RELICS[k]){title=RELICS[k].name;body=RELICS[k].desc+`\n\n{m:Merchant price about ${RELICS[k].price} gold.}`;}
  else if(COMP.tab===2&&MON[k]){const m=MON[k];title=m.name;art=m.art;body=monBlock(m)+(m.act>=0?`\n{m:Found in ${ACTS[m.act].sub}.}`:'');}
  else if(COMP.tab===3&&GLOSS[k]){title=GLOSS[k].name;body=GLOSS[k].text;}
  let y=dyp+5;
  if(art){inset(dx,y,34,34,'#15100c');ctx.drawImage(sprH(art).c,dx+1,y+1);text(title,dx+38,y+2,C.gold);y+=38;}
  else{text(title,dx,y,C.gold);y+=10;}
  const bh=richH(body,dw);
  scrollArea('cdet',dx,y,dw+4,dyp+dhp-y-4,bh,(yy,clip)=>rich(body,dx,yy,dw,C.parch,{clip}));
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
    dim();const w=Math.min(260,SW-8),h=Math.min(164,SH-16),x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);panel(x,y,w,h,{title:(PORT?CLASSES[cls].title:label+' · '+CLASSES[cls].title).toUpperCase()});
    const ps=Object.values(POWERS).filter(p=>p.c===cls).sort((a,b)=>a.lv-b.lv);
    scrollArea('pedit',x+6,y+10,w-10,h-30,ps.length*13,(yy,clip)=>{ps.forEach((p,i)=>{const cy=yy+i*13;const on=list.includes(p.id);
      rect(x+8,cy+2,8,8,C.edge);rect(x+9,cy+3,6,6,on?C.green:'#2a2018');if(on)text('✓',x+10,cy+3,C.edge,{sh:false});
      text(p.name,x+20,cy+3,on?C.gold:C.parch);const lc=`L${p.lv}${p.cost?' ◆'+p.cost:''}`;
      if(PORT)text(lc,x+w-10,cy+3,C.mute,{al:'r'});else{text(lc,x+130,cy+3,C.mute);const d=wrap(p.desc,110)[0];text(d.length<p.desc.length?d+'…':d,x+160,cy+3,C.dim);}
      if(cy+12>clip[0]&&cy<clip[1]){hit(x+8,cy,PORT?w-60:120,12,{fn:()=>{const i2=list.indexOf(p.id);if(i2>=0){if(list.length>1)list.splice(i2,1);}else list.push(p.id);},id:'pe'+p.id});
        hit(PORT?x+w-52:x+128,cy,PORT?44:w-136,12,{fn:()=>msg(p.name,powerText(p,null),null,200),id:'pd'+p.id});}
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
  const spots=[[2,0],[3,0],[1,1],[4,1]].map(([x,y])=>({x,y}));
  rivals.forEach((c,i)=>{let s=spots[i];if(enc.tiles[K(s.x,s.y)].ob||enc.enemies.some(e=>e.x===s.x&&e.y===s.y)){s=null;for(let y=0;y<3&&!s;y++)for(let x=0;x<COLS&&!s;x++)if(!enc.tiles[K(x,y)].ob&&!enc.tiles[K(x,y)].haz&&!enc.enemies.some(e=>e.x===x&&e.y===y))s={x,y};}
    if(s)enc.enemies.push({pc:c,lvl,hp:hpAt(c),maxHp:hpAt(c),powers:SK.rivalPow[c].slice(),x:s.x,y:s.y});});
  setupBattle(enc,party);
  beginBattleScreen(o=>{openModal(dialog({title:o==='win'?'VICTORY':'DEFEAT',body:o==='win'?'The skirmish is won.':'Your party has fallen.',closable:false,buttons:[{l:'BACK TO SETUP',hot:true,fn:()=>{G=null;go(SKIRMISH_SCREEN);}},{l:'REMATCH',fn:skirmishStart}]}));});
}
const SKIRMISH_SCREEN={enter(){CTX={mode:'skirmish',relics:[],skirmish:true};},draw(){
  rect(0,0,SW,SH,C.bg);
  text('SKIRMISH',PORT?34:6,4,C.gold,{sc:2,ol:C.edge});
  const tabs=PORT?['FOES','RIVALS','PARTY','FIELD']:['MONSTERS','RIVAL PARTY','YOUR PARTY','FIELD'];
  const ty=PORT?20:3;
  tabs.forEach((t,i)=>button(PORT?2+i*44:90+i*57,ty,PORT?43:55,12,t,()=>{SK.tab=i;},{on:SK.tab===i}));
  const nFoes=Object.values(SK.foes).reduce((a,b)=>a+b,0)+ORDER.filter(c=>SK.rivals[c]).length;
  if(PORT){button(2,3,27,14,'◀',()=>go(TITLE_SCREEN),{});button(SW-50,3,48,14,'START',skirmishStart,{hot:true,disabled:!nFoes});text(`${nFoes} foes`,SW-52,7,C.mute,{al:'r'});}
  else{button(SW-66,SH-17,62,14,'START',skirmishStart,{hot:true,disabled:!nFoes});button(4,SH-17,50,14,'BACK',()=>go(TITLE_SCREEN),{});text(`Foes: ${nFoes} · Level ${SK.lvl} · ${ACTS[SK.act].sub} · ${MISSIONS[SK_MISSIONS[SK.mission]].name}`,SW/2,SH-12,C.mute,{al:'c'});}
  const top=ty+15,bot=PORT?SH-2:SH-20;
  if(SK.tab===0){
    const lw=PORT?SW-4:150,lh=PORT?Math.round((bot-top)*.5):bot-top;
    panel(2,top,lw,lh,{plain:true});
    const list=Object.values(MON).filter(m=>!m.object);const bx=2+lw-46;
    const RH=PORT?33:16,by0=PORT?10:2;
    scrollArea('skm',5,top+3,lw-6,lh-6,list.length*RH,(yy,clip)=>{list.forEach((m,i)=>{const y=yy+i*RH;const n=SK.foes[m.id]||0;
      if(SK.sel===m.id)rect(5,y,lw-8,RH,'#3a2e1a');if(PORT)ctx.drawImage(sprH(m.art).c,6,y);else ctx.drawImage(spr(m.art).c,6,y);const tx=PORT?40:24;text(m.name,tx,y+(PORT?10:2),n?C.gold:C.parch);text(m.role,tx,y+(PORT?17:9),C.mute);
      if(y+RH>clip[0]&&y<clip[1]){hit(5,y,bx-8,RH,{fn:()=>{SK.sel=m.id;scrollTo('skd',0);},id:'skm'+m.id});
        button(bx,y+by0,11,11,'-',()=>{if(n>0)SK.foes[m.id]=n-1;},{disabled:!n});text(String(n),bx+17,y+by0+3,C.white,{al:'c'});button(bx+23,y+by0,11,11,'+',()=>{SK.foes[m.id]=n+1;},{disabled:nFoes>=12});}
    });});
    const dx=PORT?2:154,dy=PORT?top+lh+2:top,dw=PORT?SW-4:164,dh=PORT?bot-dy:bot-top;
    panel(dx,dy,dw,dh,{});const m=MON[SK.sel];
    inset(dx+6,dy+5,34,34,'#15100c');ctx.drawImage(sprH(m.art).c,dx+7,dy+6);text(m.name,dx+44,dy+7,C.gold);
    const body=monBlock(m);scrollArea('skd',dx+6,dy+42,dw-10,dh-46,richH(body,dw-16),(yy,clip)=>rich(body,dx+6,yy,dw-16,C.parch,{clip}));
  }else if(SK.tab===1||SK.tab===2){
    const rival=SK.tab===1;
    panel(2,top,SW-4,bot-top,{});
    let y=top+5;for(const l of wrap(rival?'Add heroes to fight against, with any powers you like.':'Choose the powers your own party brings.',SW-16)){text(l,8,y,C.mute);y+=7;}
    const rh=PORT?Math.floor((bot-y-4)/4):28;
    ORDER.forEach((c,i)=>{const yy=y+3+i*rh;const on=rival?SK.rivals[c]:true;const list=rival?SK.rivalPow[c]:SK.partyPow[c];
      if(PORT){inset(4,yy,34,34,'#15100c');ctx.drawImage(sprH(c,rival?'rival':null).c,5,yy+1);}else{inset(8,yy,24,24,'#15100c');ctx.drawImage(spr(c,rival?'rival':null).c,12,yy+4);}
      text(rival?CLASSES[c].rival:CLASSES[c].name,PORT?42:38,yy+3,on?C.gold:C.dim);text(CLASSES[c].title,PORT?42:38,yy+10,C.mute);
      const names=list.map(id=>POWERS[id].name).join(', ');
      if(PORT){const ls=wrap(names,SW-100);ls.slice(0,Math.max(1,Math.floor((rh-30)/7)+1)).forEach((l,j)=>text(l,42,yy+18+j*7,C.parch));}
      else text(names,38,yy+17,C.parch);
      const bx=PORT?SW-54:220;
      if(rival)button(bx,yy+2,PORT?48:40,12,on?'IN':'OUT',()=>{SK.rivals[c]=!SK.rivals[c];},{on});
      button(PORT?bx:264,PORT?(rival?yy+15:yy+2):yy+4,48,12,'POWERS',()=>openPowerEditor(c,list,rival?'Rival powers':'Party powers'),{});
    });
  }else{
    panel(2,top,SW-4,bot-top,{});
    const rows=[['Hero level',`${SK.lvl}`,()=>{SK.lvl=SK.lvl%12+1;}],['Land',ACTS[SK.act].sub,()=>{SK.act=(SK.act+1)%3;}],['Hazards',SK.haz?'On':'Off',()=>{SK.haz=!SK.haz;}],['Mission',MISSIONS[SK_MISSIONS[SK.mission]].name,()=>{SK.mission=(SK.mission+1)%SK_MISSIONS.length;}]];
    const bx=PORT?66:110,bw=PORT?SW-76:120;
    rows.forEach((r,i)=>{const y=top+10+i*20;text(r[0],12,y+4,C.parch);button(bx,y,bw,14,r[1],r[2],{});});
    rich('Monsters scale with hero level. The Land sets the terrain and hazards: fire in the Greenmarch, acid in the Barrow Moors, lava in the Ashen Waste.',12,top+96,SW-24,C.mute);
  }
}};

/* ---------------- main loop ---------------- */
function onResize(){for(const e of EMBERS){e.x=Math.random()*SW;e.y=Math.random()*SH;}B.gRef=null;}
function loop(t){
  NOW=t;
  try{refit();}catch(e){}
  HITS=[];
  ctx.imageSmoothingEnabled=false;
  try{
    if(SCREEN)SCREEN.draw();
    for(let i=0;i<MODALS.length;i++){const m=MODALS[i];if(i<MODALS.length-1){m.draw();HITS=HITS.filter(()=>false);}else m.draw();}
  }catch(e){console.error(e);}
  PHITS=HITS;
  requestAnimationFrame(loop);
}
