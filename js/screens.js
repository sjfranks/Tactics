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
/* A glint that sweeps across the letters of the logo every few seconds. */
const LOGO={};
function logoShine(lx,ly,tw){
  if(!LOGO.c){LOGO.c=document.createElement('canvas');LOGO.c.width=tw+2;LOGO.c.height=17;const m=ctx;ctx=LOGO.c.getContext('2d');try{text('EMBERWATCH',1,1,'#ffffff',{sc:3,sh:false});}finally{ctx=m;}
    LOGO.s=document.createElement('canvas');LOGO.s.width=tw+2;LOGO.s.height=17;}
  const per=3600,ph=(NOW%per)/per;if(ph>.35)return;
  const g=LOGO.s.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,tw+2,17);g.drawImage(LOGO.c,0,0);
  g.globalCompositeOperation='source-in';g.fillStyle='#fffbe0';const x=ph/.35*(tw+40)-20;
  g.beginPath();g.moveTo(x,0);g.lineTo(x+7,0);g.lineTo(x-1,17);g.lineTo(x-8,17);g.fill();
  ctx.globalAlpha=.85;ctx.drawImage(LOGO.s,lx-1,ly-1);ctx.globalAlpha=1;
}
const TITLE_SCREEN={enter(){this.save=loadSave();},draw(){
  ctx.drawImage(titleBG(),0,0);drawEmbers();
  const tw=textW('EMBERWATCH',3);const lx=PORT?Math.floor((SW-tw)/2):16,ly=PORT?30:22;
  text('EMBERWATCH',lx+2,ly+2,'#5a2008',{sc:3,sh:false});
  text('EMBERWATCH',lx,ly,C.gold,{sc:3,ol:'#2a0e04'});
  logoShine(lx,ly,tw);
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
/* A dirt road: dark edges, worn centre, and a dotted trail once walked. */
function roadLine(x1,y1,x2,y2,col,dark,walked){const n=Math.max(1,Math.max(Math.abs(x2-x1),Math.abs(y2-y1)));
  for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);rect(x-2,y-1,5,3,dark);}
  for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);rect(x-1,y,3,1,col);}
  if(walked)for(let i=2;i<n-2;i+=4){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);rect(x,y,2,1,'#fff0b0');}}
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
  for(const e of M.edges){const[a,b]=e.split('>');const P1=nodePos(M.nodes[a]),P2=nodePos(M.nodes[b]);const walked=vis.has(a)&&vis.has(b)&&M.visited.indexOf(b)===M.visited.indexOf(a)+1;roadLine(P1.x,P1.y+oy,P2.x,P2.y+oy,walked?'#c8a060':'#8a6a42','rgba(26,14,8,.75)',walked);}
  for(const n of Object.values(M.nodes)){
    const q=nodePos(n);const y=q.y+oy;
    const av=avail.has(n.id),vd=vis.has(n.id);const big=n.type==='boss';const r=PORT?(big?18:14):(big?11:7);
    ctx.globalAlpha=.35;circle(q.x+1,y+2,r+1,'#000');ctx.globalAlpha=1;
    if(av){const p=(Math.sin(NOW/180)+1)/2;ctx.globalAlpha=.35+p*.4;circle(q.x,y,r+3+Math.round(p),C.gold);ctx.globalAlpha=1;circle(q.x,y,r+2,'#fff0b0');}
    circle(q.x,y,r+1,C.edge);circle(q.x,y,r,vd?'#3a3028':(n.type==='elite'||big?'#e0c8a0':'#e8dcc0'));circle(q.x,y,r-1,vd?'#2a221c':(n.type==='elite'||big?'#b89870':'#c8b890'));
    if(!vd&&PORT){rect(q.x-r+3,y-r+4,3,1,'rgba(255,255,255,.5)');}
    if(big){if(PORT){ctx.drawImage(sprH(MON[BOSSES[RUN.act]].art).c,q.x-16,y-18);}else{const S=spr(MON[BOSSES[RUN.act]].art);ctx.drawImage(S.c,q.x-8,y-9);}}
    else if(PORT){const ic=mapIcon(n.type==='battle'&&nodeMission(n)&&n.mission!=='rout'?n.mission:n.type);if(ic){if(vd)ctx.globalAlpha=.5;ctx.drawImage(ic,q.x-12,y-12);ctx.globalAlpha=1;}}else ctx.drawImage(icon(n.type),q.x-5,y-5);
    if(vd&&n.id!==RUN.pos){ctx.globalAlpha=.6;circle(q.x,y,r-1,'#1a1410');ctx.globalAlpha=1;text('✓',q.x,y-2,C.mute,{al:'c'});}
    hit(q.x-r-2,y-r-2,2*r+4,2*r+4,Object.assign({fn:()=>{if(!MAPS.anim)mapNodeTap(n,av);},id:'node'+n.id},scr));
  }
  if(PORT){const S=sprH('fighter');const tx=Math.round(tok.x-16),ty=Math.round(tok.y+oy-38-hop+(A?0:Math.floor(NOW/400)%2));ctx.globalAlpha=.4;circle(Math.round(tok.x),Math.round(tok.y+oy-8),6,'#000');ctx.globalAlpha=1;ctx.drawImage(S.c,tx,ty);}
  else ctx.drawImage(spr('fighter').c,Math.round(tok.x-8),Math.round(tok.y-20-hop+(A?0:Math.floor(NOW/400)%2)));
  if(!RUN.pos&&RUN.act===0&&!M.visited.length&&!A){const p=.6+.4*Math.sin(NOW/300);ctx.globalAlpha=p;text('Choose where to go first',SW/2,PORT?oy+mapVH()-18:20,C.parch,{al:'c',ol:C.edge});ctx.globalAlpha=1;}
  if(PORT)ctx.restore();
  if(PORT){
    rect(0,0,SW,MAPP.top,'rgba(12,8,6,.95)');rect(0,MAPP.top-1,SW,1,C.rim);hit(0,0,SW,MAPP.top,{id:'mapbar'});hit(0,SH-46,SW,46,{id:'mapbar2'});
    text(`ACT ${ROMAN[RUN.act]}`,4,3,C.gold,{sc:2,ol:C.edge});
    text(ACTS[RUN.act].sub.toUpperCase(),4+textW(`ACT ${ROMAN[RUN.act]}`,2)+6,7,C.parch);
    coin(SW-34,7);text(String(RUN.gold),SW-26,7,C.gold);
    const nr=Math.floor((SW-50)/17);RUN.relics.slice(0,nr).forEach((r,i)=>{ctx.drawImage(relicArt(r),3+i*17,14);hit(2+i*17,13,17,18,{fn:()=>msg(RELICS[r].name,RELICS[r].desc,null,160),id:'mr'+r});});
    if(RUN.relics.length>nr)text('+'+(RUN.relics.length-nr),4+nr*17,19,C.mute);
    button(SW-40,17,37,12,'MENU',()=>openSettings(false,true),{});
    const by=SH-46;rect(0,by,SW,46,'rgba(12,8,6,.95)');rect(0,by,SW,1,C.rim);
    const hw=Math.floor(SW/4);
    RUN.heroes.forEach((h,i)=>{const x=i*hw;ctx.drawImage(sprH(h.cls).c,x+Math.floor((hw-32)/2),by+2);bar(x+3,by+36,hw-6,5,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}`,x+hw-3,by+2,C.parch,{al:'r'});hit(x,by,hw,46,{fn:()=>openUnitInfo(heroSheetUnit(h),{plain:true}),id:'mh'+i});});
  }else{
    rect(0,0,SW,13,'rgba(12,8,6,.92)');rect(0,13,SW,1,C.rim);
    text(`ACT ${ROMAN[RUN.act]} · ${ACTS[RUN.act].sub.toUpperCase()}`,4,4,C.gold);
    coin(SW-40,4);text(String(RUN.gold),SW-32,4,C.gold);
    rect(0,SH-16,SW,16,'rgba(12,8,6,.92)');rect(0,SH-17,SW,1,C.rim);
    RUN.heroes.forEach((h,i)=>{const x=3+i*38;ctx.drawImage(spr(h.cls).c,0,0,16,12,x,SH-14,16,12);bar(x+17,SH-12,19,4,h.hp/effMaxHp(h),'#50c050');text(`${h.hp}`,x+17,SH-7,C.parch);hit(x,SH-15,36,14,{fn:()=>openUnitInfo(heroSheetUnit(h),{plain:true}),id:'mh'+i});});
    RUN.relics.slice(0,8).forEach((r,i)=>{relicIcon(r,158+i*12,SH-14);hit(158+i*12,SH-14,11,11,{fn:()=>msg(RELICS[r].name,RELICS[r].desc,null,160),id:'mr'+r});});
    if(RUN.relics.length>8)text('+'+(RUN.relics.length-8),256,SH-11,C.mute);
    button(282,SH-14,35,11,'MENU',()=>openSettings(false,true),{});
  }
}};
const MISSION_BLURB={rout:'Defeat every foe.',ambush:'You start surrounded in the middle of the field.',hold:'Hold the shrine at the centre for 3 rounds while more foes arrive.',
  rescue:'Free a caged captive and lead them to safety.',loot:'Grab 3 treasure chests before the foes stop you.',survive:'Hold out for 5 rounds against endless foes.',
  assassinate:'Slay the enemy chief.',ritual:'Topple 2 ritual pillars before a horror breaks free.',defend:'Keep a supply wagon standing for 5 rounds.',breakout:'Get every hero out through the top edge.'};
function mapNodeTap(n,av){
  const I=NODE_INFO[n.type];let title=n.type==='boss'?'BOSS':I.name.toUpperCase(),body;
  if(n.type==='boss')body=`${MON[BOSSES[RUN.act]].name}. ${BOSS_TXT[RUN.act]}`;
  else if(n.type==='battle'||n.type==='elite'){const m=nodeMission(n),M=MISSIONS[m];
    title=(n.type==='elite'?'ELITE · ':'')+M.name.toUpperCase();
    body=`{g:${M.name}.} ${MISSION_BLURB[m]||M.desc}\n\n{m:${M.desc}}\n\n`+(n.type==='elite'?'{r:A dangerous champion and its guards.} Win for gold, a level, a new power and a relic.':'Win for gold, a level and a new power.');}
  else body=I.desc;
  openModal(dialog({title,body:body+(av?'':'\n{m:You cannot reach this yet.}'),w:180,buttons:av?[{l:'TRAVEL',hot:true,fn:()=>startTravel(n.id)},{l:'CANCEL'}]:[{l:'OK'}]}));
}


/* ---------------- rewards ---------------- */
function goReward(){if(!nextRewardStep()){finishRewards();return;}scrollTo('rew',0);go(REWARD_SCREEN);}
function offerCard(x,y,w,h,draw,fn,id){panel(x,y,w,h,{});draw(x+4,y+4,w-8,h-8);hit(x,y,w,h,{fn,id});}
function rewardCardH(s,o,w){if(s==='train'){const p=POWERS[o.id];const u=heroSheetUnit(RUN.heroes.find(q=>q.cls===o.cls));return Math.max(40,powerBlockH(p,u,w-34)+10);}return 28+richH(RELICS[o].desc,w-12)+6;}
const REWARD_SCREEN={draw(){
  ctx.drawImage(stoneBG(),0,0);drawEmbers('#6a3a1a');
  const P=RUN.pending;const s=nextRewardStep();if(!s){finishRewards();return;}
  const head=P.kind==='treasure'?'TREASURE':P.kind==='rest'?'TRAINING':P.kind==='event'?'FORTUNE':P.kind==='boss'?'TRIUMPH':'VICTORY';
  text(head,SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let ty=22;
  if(P.gold){const g=`+${P.gold} gold`;coin(SW/2-textW(g)/2-6,ty);text(g,SW/2+4,ty,C.gold,{al:'c'});ty+=9;}
  if(P.lvl){const t=`Every hero reaches level ${P.lvl}!`;const a=.6+.4*Math.sin(NOW/200);ctx.globalAlpha=a;rect(SW/2-textW(t)/2-4,ty-1,textW(t)+8,8,'#3a2a0c');ctx.globalAlpha=1;text(t,SW/2,ty,'#fff0b0',{al:'c'});ty+=9;
    if([4,7,10].includes(P.lvl)){text('Primary attributes rise!',SW/2,ty,C.green,{al:'c'});ty+=8;}}
  const title=s==='train'?'CHOOSE A POWER TO LEARN':'CHOOSE A RELIC';
  ty+=2;secHead(title,6,ty,SW-12);ty+=12;
  const offers=P.offers;const w=PORT?SW-12:Math.floor((SW-12-(offers.length-1)*4)/offers.length);
  const bottom=SH-33;
  let ch=0;for(const o of offers)ch+=rewardCardH(s,o,w)+4;
  if(REW.offers!==offers){REW.offers=offers;REW.sel=null;}
  const take=o=>{sfx(s==='train'?'learn':'chest');REW.sel=null;takeReward(o);if(!nextRewardStep())finishRewards();};
  const drawCard=(o,i,x,y,cw,clip)=>{const h=rewardCardH(s,o,cw);const on=REW.sel===i;
    panel(x,y,cw,h,{fill:on?'#2e2410':'#1e1612',rim:on?C.gold:undefined});
    if(on){const a=.3+.25*Math.sin(NOW/180);ctx.globalAlpha=a;frame(x-1,y-1,cw+2,h+2,C.gold);ctx.globalAlpha=1;}
    if(!clip||(y+h>=clip[0]&&y<=clip[1]))hit(x,Math.max(y,clip?clip[0]:y),cw,clip?Math.min(y+h,clip[1])-Math.max(y,clip[0]):h,{fn:()=>{REW.sel=i;sfx('select');},id:'offer'+i});
    if(s==='train'){const p=POWERS[o.id];const h0=RUN.heroes.find(q=>q.cls===o.cls);const u=heroSheetUnit(h0);
      portrait(u,x+5,y+5,22);text(CLASSES[o.cls].name,x+16,y+28,C.mute,{al:'c'});
      powerBlock(p,u,x+30,y+5,cw-34,{bare:true,clip});}
    else{inset(x+5,y+5,20,20,'#100b08');ctx.drawImage(relicArt(o),x+7,y+7);text(RELICS[o].name,x+30,y+7,C.gold);text('Relic',x+30,y+15,C.mute);rich(RELICS[o].desc,x+6,y+28,cw-12,C.parch,{clip});}
    return h;};
  if(PORT){scrollArea('rew',6,ty,SW-10,bottom-ty-2,ch,(yy,clip)=>{let y=yy;offers.forEach((o,i)=>{y+=drawCard(o,i,6,y,w,clip)+4;});});}
  else offers.forEach((o,i)=>drawCard(o,i,6+i*(w+4),ty,w,null));
  text(fitText(REW.sel==null?'Tap a card to choose. Tap blue words for help.':'Tap '+(s==='train'?'LEARN':'TAKE')+' to confirm.',SW-8),SW/2,SH-30,C.mute,{al:'c'});
  const sel=REW.sel!=null?offers[REW.sel]:null;
  button(SW/2-64,SH-19,56,15,'SKIP',()=>{REW.sel=null;takeReward(null);if(!nextRewardStep())finishRewards();},{});
  button(SW/2+2,SH-19,62,15,s==='train'?'LEARN':'TAKE',()=>{if(sel!=null)take(sel);},{hot:true,disabled:sel==null,glow:sel!=null});
}};
const REW={sel:null,offers:null};

/* ---------------- shop ---------------- */
function shopItemInfo(it){
  if(it.kind==='relic')return {name:RELICS[it.id].name,desc:RELICS[it.id].desc,tag:'Relic'};
  if(it.kind==='power')return {name:POWERS[it.id].name,desc:POWERS[it.id].desc,tag:`${CLASSES[it.cls].name} learns`};
  return {name:'Healing Draught',desc:'Every hero heals 40% of their health.',tag:'Potion'};
}
const SHOP_SCREEN={draw(){
  ctx.drawImage(stoneBG(),0,0);
  text('MERCHANT',SW/2,4,C.gold,{al:'c',sc:2,ol:C.edge});
  const ix=PORT?Math.floor((SW-ILW)/2):6,iy=PORT?18:20;
  if(PORT)drawIllus('merchant',ix,iy);
  const items=RUN.shop.items;
  const top=PORT?iy+ILH+6:18,bottom=SH-22;
  const cols=PORT?2:3,gap=4,x0=PORT?4:6,cw=Math.floor((SW-2*x0-(cols-1)*gap)/cols);
  const rows=Math.ceil(items.length/cols),chh=Math.floor((bottom-top-(rows-1)*gap)/rows);
  items.forEach((it,i)=>{
    const x=x0+(i%cols)*(cw+gap),y=top+Math.floor(i/cols)*(chh+gap);
    panel(x,y,cw,chh,{fill:it.sold?'#141010':'#1e1612'});
    if(it.sold){text('SOLD',x+cw/2,y+chh/2-5,C.dim,{al:'c',sc:2});return;}
    const I=shopItemInfo(it);
    inset(x+4,y+4,20,20,'#100b08');
    if(it.kind==='relic')ctx.drawImage(relicArt(it.id),x+6,y+6);
    else if(it.kind==='power'){ctx.drawImage(powerIcon(POWERS[it.id]),x+6,y+6);portrait({kind:'pc',cls:it.cls,side:'hero'},x+cw-18,y+4,14);}
    else ctx.drawImage(icon16('potion'),x+6,y+6);
    text(fitText(I.name,cw-30-(it.kind==='power'?16:0)),x+27,y+5,C.gold);text(fitText(I.tag,cw-30),x+27,y+13,C.mute);
    ctx.save();ctx.beginPath();ctx.rect(x+4,y+27,cw-8,chh-40);ctx.clip();rich(I.desc,x+5,y+28,cw-10,C.parch,{nohit:true});ctx.restore();
    const ok=RUN.gold>=it.price;const ps=String(it.price);
    rect(x+3,y+chh-12,cw-6,9,'#140e0a');coin(x+cw-10-textW(ps),y+chh-11);text(ps,x+cw-5,y+chh-11,ok?C.gold:C.red,{al:'r'});
    hit(x,y,cw,chh,{fn:()=>{const body=(it.kind==='power'?powerText(POWERS[it.id],heroSheetUnit(RUN.heroes.find(q=>q.cls===it.cls))):I.desc)+`\n\nPrice: ${it.price} gold. You have ${RUN.gold}.`;
      openModal(dialog({title:I.name.toUpperCase(),body,w:200,buttons:[{l:'BUY',hot:true,disabled:!ok,fn:()=>buyItem(it)},{l:'CANCEL'}]}));},id:'shop'+i});
  });
  const gs=String(RUN.gold);coin(SW-12-textW(gs),SH-15);text(gs,SW-5,SH-15,C.gold,{al:'r'});
  button(PORT?4:SW/2-35,SH-19,70,15,'LEAVE',()=>{RUN.stage='map';RUN.shop=null;saveGame();go(MAP_SCREEN);},{hot:true});
}};

/* ---------------- campfire ---------------- */
function campfire(cx,cy,sc){
  const t=NOW/1000;
  rect(cx-10*sc,cy+2*sc,20*sc,3*sc,'#2a1a10');
  // logs
  rect(cx-9*sc,cy+sc,18*sc,2*sc,'#5a3a1e');rect(cx-9*sc,cy+sc,18*sc,sc,'#7a5030');rect(cx-6*sc,cy-sc,12*sc,2*sc,'#4a2e18');
  const hs=[6,9,11,8,6];hs.forEach((h0,i)=>{const hh=Math.round((h0+Math.sin(t*(8+i)+i*1.7)*2.2)*sc);flameTongue(cx+(i-2)*3*sc,cy+sc,hh,4*sc,t,i*1.3);});
  for(let i=0;i<5;i++){const ph=(t*.7+i*.2)%1;rect(cx+Math.sin(t*2+i*1.9)*6*sc,cy-6*sc-ph*28*sc,1,1,ph<.5?'#ffd060':'#ff7a20');}
}
function campBG(){
  const key='camp'+SW+'x'+SH;if(BGC[key])return BGC[key];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');const P=painter(g);const r=mulberry(5);
  const gy=Math.round(SH*(PORT?.46:.62));
  P.grad(0,0,SW,gy,['#05060f','#0a0b1c','#121228','#1c1834']);
  P.speck(0,0,SW,gy-20,70,['#6a70a0','#9aa0d0','#4a5080','#c8d0ff'],r);
  P.glow(SW-34,50,14,'200,210,255',.15);P.ell(SW-34,50,7,7,'#e8ecff');P.ell(SW-32,48,6,6,'#0e0e22');
  for(let x=-4;x<SW;x+=9+Math.floor(r()*6)){const h=16+Math.floor(r()*18);const w=5+Math.floor(r()*4);P.poly([[x-w,gy+1],[x,gy-h],[x+w,gy+1]],'#0a0e10');P.poly([[x-w+2,gy+1],[x,gy-h+6],[x+w-2,gy+1]],'#0e1414');}
  g.fillStyle='#10160e';g.fillRect(0,gy,SW,SH-gy);
  P.speck(0,gy,SW,SH-gy,SW*2,['#1a2414','#0c120a','#202c18'],r);
  return BGC[key]=c;
}
const REST_SCREEN={draw(){
  ctx.drawImage(campBG(),0,0);
  const t=NOW/1000;
  for(let i=0;i<6;i++){const x=(i*53+7)%SW,y=(i*37+5)%Math.round(SH*.3);if(Math.sin(t*2+i*1.7)>.8)rect(x,y,1,1,'#ffffff');}
  const cx=SW/2,cy=PORT?Math.round(SH*.56):118;
  const gl=.12+.03*Math.sin(t*9)+.02*Math.sin(t*23);
  ctx.globalAlpha=gl;circle(cx,cy,Math.round(SW*.42),'#ff8a30');ctx.globalAlpha=gl*1.3;circle(cx,cy,Math.round(SW*.26),'#ffb050');ctx.globalAlpha=gl*1.6;circle(cx,cy,Math.round(SW*.14),'#ffd070');ctx.globalAlpha=1;
  campfire(cx,cy,2);
  const seats=PORT?[[-74,-30],[-46,8],[14,8],[42,-30]]:[[-50,-10],[-34,8],[18,8],[34,-10]];
  ORDER.forEach((c,i)=>{const h=RUN.heroes.find(q=>q.cls===c);const S=art(c);const off=seats[i];const x=cx+off[0],y=cy+off[1];
    const bob=Math.floor(NOW/700+i)%2;
    ctx.globalAlpha=.4;rect(x+6,y+(PORT?29:14),20,3,'#000');ctx.globalAlpha=1;
    if(PORT)ctx.drawImage(i<2?S.c:S.f,x,y-bob);else ctx.drawImage(i<2?S.c:S.f,0,0,16,16,x,y,16,16);
    if(h){const f=h.hp/effMaxHp(h);bar(x+3,y+(PORT?33:18),PORT?26:14,4,f,f>.5?'#50c050':f>.25?'#d8b030':'#d04030');}});
  text('CAMPFIRE',SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let ty=24;for(const l of wrap('The night is quiet. Choose how to spend it.',SW-8)){text(l,SW/2,ty,C.parch,{al:'c'});ty+=7;}
  const rest=()=>{RUN.heroes.forEach(h=>h.hp=Math.min(effMaxHp(h),h.hp+Math.ceil(effMaxHp(h)*.4)));sfx('heal');RUN.stage='map';saveGame();go(MAP_SCREEN);};
  const train=()=>{RUN.stage='reward';RUN.pending={steps:['train'],kind:'rest'};saveGame();goReward();};
  const bw=PORT?SW-32:110;
  const b1x=PORT?16:40,b1y=PORT?SH-50:146,b2x=PORT?16:170,b2y=PORT?SH-26:146;
  button(b1x,b1y,bw,20,'',rest,{hot:true});ctx.drawImage(icon16('heart'),b1x+4,b1y+2);text('REST',b1x+24,b1y+4,C.white);text('Every hero heals 40%',b1x+24,b1y+11,'#f0d8b0');
  button(b2x,b2y,bw,20,'',train,{hot:true});ctx.drawImage(icon16('star'),b2x+4,b2y+2);text('TRAIN',b2x+24,b2y+4,C.white);text('One hero learns a power',b2x+24,b2y+11,'#f0d8b0');
}};

/* ---------------- events ---------------- */
function optButton(x,y,w,lab,fn,o){const lines=wrap(lab,w-8);const h=lines.length*7+7;button(x,y,w,h,'',fn,o);const c=o&&o.disabled?C.dim:C.parch;lines.forEach((l,i)=>text(l,x+w/2,y+4+i*7,c,{al:'c',sh:C.edge}));return h;}
/* A choice: its label, and underneath who makes the check and how likely it is to work. */
function choiceButton(x,y,w,o,fn){
  const lines=wrap(o.label,w-10);let sub='',sc=C.mute,pct=null;
  if(o.check){const ch=checkChance(o.check.skill,o.check.dc);pct=Math.round(ch.p*100);sub=`${o.check.skill} · ${CLASSES[ch.b.h.cls].name} ${ch.b.mod>=0?'+':''}${ch.b.mod} · need ${o.check.dc}`;}
  else if(o.cost){sub=`Costs ${o.cost} gold`;sc=RUN.gold>=o.cost?C.gold:C.red;}
  const dis=!!(o.cost&&RUN.gold<o.cost);
  const h=lines.length*7+(sub?16:9);
  button(x,y,w,h,'',fn,{disabled:dis});
  lines.forEach((l,i)=>text(l,x+6,y+4+i*7,dis?C.dim:C.parch,{sh:C.edge}));
  if(sub){const sy=y+4+lines.length*7+1;const pw=pct!=null?textW(pct+'%')+6:0;text(fitText(sub,w-12-pw),x+6,sy,dis?C.dim:sc,{sh:C.edge});
    if(pct!=null){const pc=pct>=70?C.green:pct>=40?C.gold:C.red;text(pct+'%',x+w-6,sy,pc,{al:'r',sh:C.edge});}}
  return h;
}
const EVT={t0:0};
function die(x,y,v,col){rect(x,y,13,13,C.edge);rect(x+1,y+1,11,11,col||'#f0e8d8');rect(x+1,y+1,11,1,'#ffffff');rect(x+1,y+11,11,1,'#b8ac98');rect(x+11,y+1,1,11,'#c8bca8');
  const P={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]}[v]||[];
  for(const[a,b]of P)rect(x+3+a*3,y+3+b*3,2,2,'#2a1a14');}
/* 3d6 tumbling, then the total against the target number, then a SUCCESS / FAILURE stamp. Returns the height used, or 0 while rolling. */
function drawCheckRoll(R,x,y,w){
  const el=EVT.t0?NOW-EVT.t0:9999,dur=1100;const done=el>=dur;
  panel(x,y,w,42,{fill:'#1e1612'});
  text(`${R.who} tests ${R.skill}`,x+w/2,y+5,C.parch,{al:'c'});
  for(let i=0;i<3;i++){const settle=el>dur*(.55+i*.15);const v=settle?R.d[i]:1+Math.floor((NOW/70+i*2.7))%6;
    const bounce=settle?0:Math.round(Math.abs(Math.sin(el/90+i))*6*(1-el/dur));
    die(x+w/2-26+i*18,y+14-bounce,v);}
  if(!done)return 0;
  text(`${R.d.join(' + ')}  ${R.mod>=0?'+':'-'} ${Math.abs(R.mod)}  =  ${R.tot}   (needs ${R.dc})`,x+w/2,y+31,C.white,{al:'c'});
  if(!EVT.stung&&EVT.t0){EVT.stung=true;sfx(R.ok?'success':'fail');}
  const q=Math.min(1,(el-dur)/160);const t=R.ok?'SUCCESS!':'FAILURE';
  ctx.globalAlpha=q;text(t,x+w/2,y+47-Math.round((1-q)*4),R.ok?C.green:C.red,{al:'c',sc:2,ol:C.edge});ctx.globalAlpha=1;
  return 62;
}
function partyStrip(y){
  const hw=Math.floor(SW/4);
  rect(0,y,SW,SH-y,'rgba(12,8,6,.92)');rect(0,y,SW,1,C.rim);
  RUN.heroes.forEach((h,i)=>{const x=i*hw;const u=heroSheetUnit(h);portrait(u,x+3,y+3,18);
    const f=h.hp/effMaxHp(h);bar(x+23,y+6,hw-26,5,f,f>.5?'#50c050':f>.25?'#d8b030':'#d04030');text(`${h.hp}/${effMaxHp(h)}`,x+23,y+13,C.parch);});
}
const EVENT_SCREEN={enter(){EVT.t0=0;EVT.stung=true;scrollTo('evt',0);},draw(){
  ctx.drawImage(stoneBG(),0,0);drawEmbers('#4a2a1a');
  const ev=EVENTS.find(e=>e.id===RUN.event.id);
  const T=ev.title.toUpperCase();const big=textW(T,2)<=SW-8;
  text(T,SW/2,4,C.gold,{al:'c',sc:big?2:1,ol:C.edge});
  const ix=PORT?Math.floor((SW-ILW)/2):8,iy=PORT?18:24;
  drawIllus(ev.id,ix,iy);
  const bottom=PORT?SH-26:SH-4;partyStrip(PORT?SH-24:SH);
  const px=PORT?4:ix+ILW+8,py=PORT?iy+ILH+6:18,pw=PORT?SW-8:SW-px-4,ph=bottom-py;
  panel(px,py,pw,ph,{});
  const tx=px+6,tw=pw-12;
  const R=RUN.event.done;
  if(!R){
    let ch=EVT.ch||200;
    scrollArea('evt',px+4,py+4,pw-7,ph-8,ch,(yy,clip)=>{let y=yy+2;
      y+=rich(ev.text,tx,y,tw,C.parch,{clip})+5;
      for(const o of ev.opts){y+=choiceButton(tx,y,tw,o,()=>{const r=resolveEvent(o);if(r.fail){msg('Not enough gold',r.text);return;}RUN.event.done=r;EVT.t0=r.roll?NOW:0;EVT.stung=false;if(r.roll)sfx('dice');saveGame();})+4;}
      EVT.ch=y-yy+2;});
  }else{
    let y=py+6;
    text(fitText(R.label||'',tw),tx,y,C.gold);y+=10;
    let settled=true;
    if(R.roll){const hh=drawCheckRoll(R.roll,tx,y,tw);settled=hh>0;y+=hh||50;}
    if(settled){
      rich(R.text,tx,y,tw,C.parch);
      button(Math.floor(SW/2)-40,bottom-20,80,15,'CONTINUE',()=>{
        const r=RUN.event.done;RUN.event=null;
        if(r.fight){const n=RUN.map.nodes[RUN.pos];startRunBattle(genEncounter(nodeF(n),'rout',{act:RUN.act}),'battle');return;}
        if(r.relic||r.train){RUN.stage='reward';RUN.pending={steps:[r.relic?'relic2':'train'],kind:'event'};saveGame();goReward();return;}
        RUN.stage='map';saveGame();go(MAP_SCREEN);},{hot:true});
    }
  }
  const gs=String(RUN.gold);coin(px+pw-12-textW(gs),bottom-10);text(gs,px+pw-5,bottom-10,C.gold,{al:'r'});
}};

/* ---------------- end ---------------- */
const END_SCREEN={draw(){
  const won=RUN.stage==='won';
  ctx.drawImage(titleBG(),0,0);
  ctx.globalAlpha=won?.35:.55;rect(0,0,SW,SH,won?'#402a08':'#1a0404');ctx.globalAlpha=1;
  drawEmbers(won?'#ffd060':'#8a2a10');
  let y=PORT?26:12;
  const lines=PORT?(won?['THE DRAGON','FALLS']:['THE WATCH','IS BROKEN']):[won?'THE DRAGON FALLS':'THE WATCH IS BROKEN'];
  const ph=lines.length*16+10;rect(0,y-6,SW,ph,'rgba(10,6,4,.7)');rect(0,y-6,SW,1,won?C.gold2:C.red2);rect(0,y-6+ph,SW,1,won?C.gold2:C.red2);
  for(const l of lines){text(l,SW/2,y,won?'#ffe070':'#ff7a6a',{al:'c',sc:2,ol:C.edge});y+=16;}
  y+=10;for(const l of wrap(won?'Emberwatch stands. Songs will be sung of this company for an age.':`Your company fell in ${ACTS[RUN.act].sub}. Another will rise.`,SW-16)){text(l,SW/2,y,C.parch,{al:'c'});y+=7;}
  y+=8;
  const st=[['BATTLES',RUN.stats.wins],['FOES SLAIN',RUN.stats.kills],['GOLD',RUN.stats.gold]];
  const bw=PORT?Math.floor((SW-16)/3):76,gap=PORT?4:8,sx=Math.floor((SW-3*bw-2*gap)/2);
  st.forEach((s0,i)=>{const x=sx+i*(bw+gap);panel(x,y,bw,32,{fill:'#1e1612'});text(String(s0[1]),x+bw/2,y+7,C.gold,{al:'c',sc:2,ol:C.edge});text(s0[0],x+bw/2,y+22,C.mute,{al:'c'});});
  y+=44;
  const gy=PORT?Math.round(SH*.66):y+20;
  RUN.heroes.forEach((h,i)=>{if(PORT){const x=SW/2-76+i*38;const S=sprH(h.cls);ctx.globalAlpha=.4;rect(x+9,gy+30,16,3,'#000');ctx.globalAlpha=1;
      if(won)ctx.drawImage(S.c,x+3,gy+(Math.floor(NOW/400+i)%2));else{ctx.globalAlpha=.55;ctx.drawImage(S.bk,x+3,gy);ctx.globalAlpha=1;}
      text('Lv '+h.lvl,x+19,gy+36,C.parch,{al:'c'});}
    else{const x=SW/2-60+i*32;ctx.drawImage(spr(h.cls).c,x,y);text('Lv '+h.lvl,x+8,y+18,C.parch,{al:'c'});}});
  if(PORT){button(20,SH-42,SW-40,16,'NEW JOURNEY',()=>{newRun();go(MAP_SCREEN);},{hot:true});button(20,SH-22,SW-40,16,'TITLE',()=>go(TITLE_SCREEN),{});}
  else{button(60,156,90,14,'NEW JOURNEY',()=>{newRun();go(MAP_SCREEN);},{hot:true});button(170,156,90,14,'TITLE',()=>go(TITLE_SCREEN),{});}
}};

/* ---------------- settings & help ---------------- */
function openSettings(inBattle,onMap){
  openModal({closable:true,draw(){
    dim();const w=Math.min(190,SW-8),tog=[],acts=[];
    tog.push(['Music',SET.music,()=>{SET.music=!SET.music;auInit();SET.music?musicStart():musicStop();saveSet();}]);
    tog.push(['Sound effects',SET.sfx,()=>{SET.sfx=!SET.sfx;saveSet();}]);
    tog.push(['Play on silent',!!SET.loud,()=>setPlayOnSilent(!SET.loud)]);
    tog.push(['Auto end turn',SET.autoEnd,()=>{SET.autoEnd=!SET.autoEnd;saveSet();}]);
    tog.push(['Animation speed',['Slow','Normal','Fast'][SET.speed],()=>{SET.speed=(SET.speed+1)%3;saveSet();}]);
    acts.push(['How to play',openHowTo]);
    acts.push(['Glossary',()=>{SCREEN_BACK=SCREEN;COMP.tab=3;go(COMP_SCREEN);}]);
    if(inBattle&&CTX.mode==='run')acts.push(['Save and quit to title',()=>{saveGame();G=null;go(TITLE_SCREEN);}]);
    if(inBattle&&CTX.mode==='skirmish')acts.push(['Leave skirmish',()=>{G=null;go(SKIRMISH_SCREEN);}]);
    if(onMap)acts.push(['Quit to title',()=>{saveGame();go(TITLE_SCREEN);}]);
    if((inBattle||onMap)&&CTX.mode==='run'&&RUN)acts.push(['Abandon journey',()=>openModal(dialog({title:'ABANDON?',body:'Your heroes, relics and progress will be lost.',buttons:[{l:'ABANDON',hot:true,fn:()=>{clearSave();RUN=null;G=null;go(TITLE_SCREEN);}},{l:'CANCEL'}]}))]);
    const h=tog.length*16+acts.length*16+42;const x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);
    panel(x,y,w,h,{title:'SETTINGS'});
    let cy=y+10;
    for(const[l,v,fn]of tog){rect(x+6,cy,w-12,14,'#1e1612');text(l,x+10,cy+4,C.parch);
      const lab=v===true?'ON':v===false?'OFF':v;const bw=Math.max(30,textW(lab)+10);button(x+w-8-bw,cy+1,bw,12,lab,fn,{on:v===true,tc:v===false?C.mute:undefined});
      hit(x+6,cy,w-16-bw,14,{fn,id:'tg'+l});cy+=16;}
    cy+=4;
    for(const[l,fn]of acts){button(x+8,cy,w-16,13,l,fn,{});cy+=16;}
    button(x+w/2-30,y+h-16,60,12,'CLOSE',closeModal,{hot:true});
  }});
}
const HOWTO=`{g:Your turn.} Each hero can move and take one action, in either order. Tap a blue square to move, or drag the hero. You can move in several steps until your speed runs out. Taking an action ends your movement (a few powers give some back).

{g:Powers.} Pick a power card at the bottom, then tap a target: red squares are foes in range, green are allies. A forecast shows what can happen. Tap the target again, or press STRIKE, to act. Powers with no target, like Thunderwave, go off when you tap their card twice.

{g:Attack results.} Every attack rolls 3d6 and adds an attribute. A total of 10 or less is a graze, 11 to 14 is a hit, 15 or more is a critical hit. Better results deal more damage, and effects listed "on a hit" or "on a crit" only happen on those results.

{g:Boons and hindrances.} Each boon adds 2 to the roll and each hindrance takes 2 away. Flanking, high ground and exposed, prone or rooted targets give boons. Cover, being weakened and shooting with a foe beside you give hindrances.

{g:Momentum.} Shown as {p:◆} gems. Heroes gain 2 at the start of each turn, plus more from their class: each hero's sheet says how. Stronger powers cost momentum. The foes share their own pool, shown at the top of the screen.

{g:Parting blows.} Stepping away from a foe beside you lets it strike you for free. The path turns red when that will happen. Rogues never provoke them.

{g:Hazards.} Fire, acid and lava hurt anyone who enters them or starts a turn in them, even when pushed or pulled in. Push your enemies into them!

{g:Turn order.} Everyone rolls initiative (d20 + Finesse) when a battle starts. Turns go from highest to lowest, every round. TURNS shows who is next.

{g:Undo.} UNDO rewinds your last move or action. Press it again to go further back, even to a previous hero's turn.

{g:The journey.} Lead the company along a branching road through three lands: battles, elite fights, merchants, campfires, treasure and strange encounters. Each land ends with a boss.

Tap any {k:blue underlined word} to see what it means. Tap a hero's portrait to open their sheet.`;
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
  }else if(COMP.tab===1)entries=Object.keys(RELICS).map(r=>({k:r,label:RELICS[r].name,relic:r,tall:true}));
  else if(COMP.tab===2){for(let a=0;a<3;a++){entries.push({hdr:ACTS[a].sub});for(const m of Object.values(MON))if(m.act===a)entries.push({k:m.id,label:m.name,sprite:m.art});}entries.push({hdr:'Special'});for(const m of Object.values(MON))if(m.act<0)entries.push({k:m.id,label:m.name,sprite:m.art});}
  else entries=Object.keys(GLOSS).sort((a,b)=>GLOSS[a].name.localeCompare(GLOSS[b].name)).map(k=>({k,label:GLOSS[k].name}));
  const ly=COMP.tab===0?32:18;
  const lx=2,lw=PORT?SW-4:112,lh=PORT?Math.round((SH-ly)*.4):SH-ly;
  const dxp=PORT?2:116,dyp=PORT?ly-2+lh+2:ly-2,dwp=PORT?SW-4:SW-118,dhp=PORT?SH-2-dyp:SH-ly;
  panel(lx,ly-2,lw,lh,{plain:true});
  if(!COMP.sel&&entries.length)COMP.sel=entries.find(e=>e.k).k;
  const rowH=e=>e.hdr?9:e.sprite?(PORT?33:15):e.tall?18:10;
  const ch=entries.reduce((s,e)=>s+rowH(e),0)+4;
  scrollArea('clist',lx+3,ly+1,lw-6,lh-6,ch,(yy,clip)=>{let y=yy;for(const e of entries){const h=rowH(e);
    if(e.hdr){text(e.hdr.toUpperCase(),lx+6,y+2,C.mute,{sh:false});y+=h;continue;}
    if(COMP.sel===e.k)rect(lx+3,y,lw-8,h,'#3a2e1a');
    let tx=lx+6;if(e.sprite){if(PORT){ctx.drawImage(sprH(e.sprite).c,lx+4,y);tx=lx+40;}else{ctx.drawImage(spr(e.sprite).c,lx+4,y-1);tx=lx+22;}}if(e.relic){ctx.drawImage(relicArt(e.relic),lx+4,y+1);tx=lx+23;}
    text(e.label,tx,y+(e.sprite?(PORT?13:5):e.tall?5:2),COMP.sel===e.k?C.gold:(e.col||C.parch));if(e.sub)text(e.sub,lx+lw-6,y+2,C.mute,{al:'r'});
    if(y+h>clip[0]&&y<clip[1])hit(lx+3,Math.max(y,clip[0]),lw-8,h,{fn:()=>{COMP.sel=e.k;scrollTo('cdet',0);},id:'ce'+e.k});
    y+=h;}});
  panel(dxp,dyp,dwp,dhp,{});
  const dx=dxp+6,dw=dwp-14,k=COMP.sel;
  scrollArea('cdet',dx,dyp+5,dw+4,dhp-10,COMP.ch||300,(yy,clip)=>{let y=yy;
    if(COMP.tab===0){
      const cls=ORDER[COMP.cls];
      if(k==='class'){const Cc=CLASSES[cls];const u=heroSheetUnit({cls,lvl:1,hp:Cc.hp,maxHp:Cc.hp,powers:Cc.start});
        y+=sheetLayout(u,dx,y,dw,clip,{plain:true,classInfo:true});}
      else if(POWERS[k]){const p=POWERS[k];text(`Level ${p.lv} ${CLASSES[cls].title} power`,dx,y,C.mute);y+=9;y+=powerBlock(p,null,dx,y,dw,{clip})+4;
        y+=rich('Damage adds the attribute it uses. {m:Graze, Hit and Crit are the three attack results.}',dx,y,dw,C.mute,{clip});}
    }else if(COMP.tab===1&&RELICS[k]){inset(dx,y,20,20,'#100b08');ctx.drawImage(relicArt(k),dx+2,y+2);text(RELICS[k].name,dx+24,y+3,C.gold);text(`About ${RELICS[k].price} gold`,dx+24,y+11,C.mute);y+=24;
      y+=rich(RELICS[k].desc,dx,y,dw,C.parch,{clip});}
    else if(COMP.tab===2&&MON[k]){y+=sheetLayout(monSheetUnit(k),dx,y,dw,clip,{plain:true,found:true});}
    else if(COMP.tab===3&&GLOSS[k]){text(GLOSS[k].name,dx,y,C.gold,{sc:2,ol:C.edge});y+=14;y+=rich(GLOSS[k].text,dx,y,dw,C.parch,{clip});}
    COMP.ch=y-yy+6;});
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
    panel(dx,dy,dw,dh,{});
    scrollArea('skd',dx+6,dy+5,dw-10,dh-10,SK.ch||300,(yy,clip)=>{SK.ch=sheetLayout(monSheetUnit(SK.sel),dx+6,yy,dw-16,clip,{plain:true})+4;});
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

/* ---------------- music for each screen ---------------- */
function musicWanted(){
  const S=SCREEN;
  if(S===BATTLE_SCREEN)return G&&G.enc&&G.enc.type==='boss'?'boss':'battle';
  if(S===MAP_SCREEN||S===REWARD_SCREEN)return 'map';
  if(S===REST_SCREEN)return 'camp';
  if(S===SHOP_SCREEN)return 'shop';
  if(S===EVENT_SCREEN)return 'event';
  if(S===END_SCREEN)return RUN&&RUN.stage==='won'?'camp':'event';
  return 'title';
}
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
