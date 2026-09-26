'use strict';
/* =====================================================================
   EMBERWATCH — pixel canvas (320×180 landscape, 196 wide portrait), input, widgets
   ===================================================================== */
let SW=320,SH=180,PORT=false;
/* The canvas stores twice as many pixels as its logical size: layout works in logical pixels, while art,
   text and fine lines can use the extra resolution. */
const RES=HIRES?2:1;
const cv=document.getElementById('game');
let ctx=cv.getContext('2d');const MAINCTX=ctx;
cv.width=SW*RES;cv.height=SH*RES;ctx.imageSmoothingEnabled=false;
/* An image made at double resolution carries _s=2 and draws at its logical size, so callers don't change. */
(function(){const P=CanvasRenderingContext2D.prototype,di=P.drawImage;
  P.drawImage=function(img,a,b,c,d,e,f,g,h){const s=img&&img._s;if(!s)return di.apply(this,arguments);
    if(arguments.length===3)return di.call(this,img,a,b,img.width/s,img.height/s);
    if(arguments.length===9)return di.call(this,img,a*s,b*s,c*s,d*s,e,f,g,h);
    return di.apply(this,arguments);};})();
function hiCanvas(w,h){const c=document.createElement('canvas');c.width=Math.round(w*RES);c.height=Math.round(h*RES);c._s=RES;const g=c.getContext('2d');g.setTransform(RES,0,0,RES,0,0);g.imageSmoothingEnabled=false;return c;}
let SCALE=1;const ROT=false;
/* Landscape screens get a 320×180 canvas; portrait screens get 180×320. */
/* Size from the visible viewport, minus the phone's safe areas (notch, home bar, browser chrome). */
const SAFE=document.createElement('div');SAFE.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';document.body.appendChild(SAFE);
/* Portrait: the canvas always matches the screen's shape. It is at least 196 wide and PORT_MIN tall;
   a short/wide screen gets a wider canvas (margins beside the board) instead of a squashed layout. */
const PORT_MIN=378;let VPKEY='';
function viewportSize(){
  const vv=window.visualViewport;
  let st=parseFloat(getComputedStyle(SAFE).paddingTop)||0;const sb=parseFloat(getComputedStyle(SAFE).paddingBottom)||0;
  let vw=vv&&vv.width>0?vv.width:window.innerWidth,vh=(vv&&vv.height>0?vv.height:window.innerHeight);
  if(!(vw>0)||!(vh>0)){vw=document.documentElement.clientWidth||320;vh=document.documentElement.clientHeight||568;}
  if(vh-st-sb>100)vh-=st+sb;else st=0;
  return {vw,vh,st,ox:vv?vv.offsetLeft||0:0,oy:vv?vv.offsetTop||0:0};
}
function fit(){
  const {vw,vh,st,ox,oy}=viewportSize();
  VPKEY=rawVP();
  PORT=vh>vw;
  let w=320,h=180;
  if(PORT){w=196;h=Math.round(w*vh/vw);if(h<PORT_MIN){h=PORT_MIN;w=Math.max(196,Math.round(h*vw/vh));}h=Math.min(h,640);}
  if(w!==SW||h!==SH){SW=w;SH=h;cv.width=SW*RES;cv.height=SH*RES;MAINCTX.imageSmoothingEnabled=false;if(typeof onResize==='function')onResize();}
  let s=Math.min(vw/SW,vh/SH);if(!PORT&&s>=3)s=Math.floor(s);
  SCALE=s;
  cv.style.width=SW*s+'px';cv.style.height=SH*s+'px';
  cv.style.left=(ox+(vw-SW*s)/2)+'px';
  cv.style.top=(oy+st+(vh-SH*s)/2)+'px';
  cv.style.transform='none';
}
/* Safari doesn't always fire resize events (toolbar show/hide, restoring a tab); re-check every frame. */
function rawVP(){const vv=window.visualViewport;return [innerWidth,innerHeight,vv&&vv.width,vv&&vv.height,vv&&vv.offsetTop].join(',');}
function refit(){if(rawVP()!==VPKEY)fit();}
if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit);}
window.addEventListener('resize',fit);window.addEventListener('orientationchange',()=>setTimeout(fit,50));fit();

/* ---------------- colours ---------------- */
const C={bg:'#0d0b0a',panel:'#1c1613',panel2:'#29201a',panel3:'#372a20',edge:'#050303',rim:'#6a5236',rim2:'#9a7a48',hi:'#4a3a2a',
  gold:'#f0c050',gold2:'#a07828',parch:'#e8dcc0',mute:'#9a8a70',dim:'#5e5446',red:'#e8584a',red2:'#7a2018',green:'#78d070',green2:'#2a6a2a',
  blue:'#70b8f8',blue2:'#24508a',kw:'#6fe0ff',mom:'#c090ff',mom2:'#5a3a9a',white:'#f8f4e8',orange:'#ff9a40'};
/* High resolution mode uses a bright, illustrated fantasy palette. The classic palette is untouched. */
if(HIRES)Object.assign(C,{bg:'#111c32',panel:'#182b4a',panel2:'#234366',panel3:'#315579',edge:'#091426',rim:'#bda774',rim2:'#f6dfa0',hi:'#52739b',gold:'#ffe49b',gold2:'#c4a35d',parch:'#f9f5e9',mute:'#b7c8d9',dim:'#72839a',red:'#f26e70',red2:'#832d48',green:'#86dcaa',green2:'#267e70',blue:'#90d4ff',blue2:'#376bac',kw:'#a2edff',mom:'#d7aeff',mom2:'#704aa4',white:'#ffffff',orange:'#ffc17a'});
const MC={g:C.gold,r:C.red,h:C.green,b:C.blue,m:C.mute,p:C.mom,w:C.white,o:C.orange,k:C.kw};

/* ---------------- time & sleep ---------------- */
let NOW=0;
const SET={music:true,sfx:true,speed:1,autoEnd:true};
try{Object.assign(SET,JSON.parse(localStorage.getItem('emberwatch.v3.settings')||'{}'));}catch(e){}
function saveSet(){try{localStorage.setItem('emberwatch.v3.settings',JSON.stringify(SET));}catch(e){}}
const spd=()=>(SET.speed===2?.45:SET.speed===0?1.5:1)*(window.__SPEED!=null?window.__SPEED:1);
const sleep=ms=>new Promise(r=>setTimeout(r,ms*spd()));

/* ---------------- hit regions & input ---------------- */
let HITS=[],PHITS=[],SCROLLER=null;
const PTR={down:false,x:0,y:0,x0:0,y0:0,drag:false,hit:null,id:null};
function hit(x,y,w,h,o){const r=Object.assign({x,y,w,h},o);if(SCROLLER&&!r.scroll&&!r.drag)r.scroll=SCROLLER;HITS.push(r);}
function hitAt(px,py,list){for(let i=list.length-1;i>=0;i--){const r=list[i];if(px>=r.x&&py>=r.y&&px<r.x+r.w&&py<r.y+r.h)return r;}return null;}
function toCanvas(ev){
  const r=cv.getBoundingClientRect();
  return {x:(ev.clientX-r.left)*SW/r.width,y:(ev.clientY-r.top)*SH/r.height};
}
window.addEventListener('pointerdown',ev=>{
  const p=toCanvas(ev);PTR.down=true;PTR.x=PTR.x0=p.x;PTR.y=PTR.y0=p.y;PTR.ly=p.y;PTR.drag=false;PTR.id=ev.pointerId;
  PTR.hit=hitAt(p.x,p.y,PHITS);
  if(PTR.hit&&PTR.hit.press)PTR.hit.press(p.x,p.y);
});
window.addEventListener('pointermove',ev=>{
  const p=toCanvas(ev);PTR.x=p.x;PTR.y=p.y;
  if(!PTR.down||ev.pointerId!==PTR.id)return;
  const h=PTR.hit;
  if(!PTR.drag&&Math.hypot(p.x-PTR.x0,p.y-PTR.y0)>4&&h&&(h.drag||h.scroll)){PTR.drag=true;if(h.dragStart)h.dragStart(PTR.x0,PTR.y0);}
  if(PTR.drag&&h){if(h.scroll)h.scroll(p.y-PTR.ly);if(h.drag)h.drag(p.x,p.y);}
  PTR.ly=p.y;
});
window.addEventListener('pointerup',ev=>{
  if(!PTR.down||ev.pointerId!==PTR.id)return;
  const p=toCanvas(ev);PTR.down=false;
  const h=PTR.hit;
  if(PTR.drag){if(h&&h.drop)h.drop(p.x,p.y);PTR.drag=false;return;}
  const h2=hitAt(p.x,p.y,PHITS);
  if(h&&h2&&(h===h2||(h.id&&h.id===h2.id))&&h.fn){sfx('click');h.fn(p.x,p.y);}
});
window.addEventListener('pointercancel',()=>{PTR.down=false;PTR.drag=false;});
cv.addEventListener('wheel',ev=>{const p=toCanvas(ev);const h=hitAt(p.x,p.y,PHITS);if(h&&h.scroll){h.scroll(-ev.deltaY/4);ev.preventDefault();}},{passive:false});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&MODALS.length){const m=MODALS[MODALS.length-1];if(m.closable!==false)closeModal();}});

/* ---------------- primitives ---------------- */
const hp=v=>Math.round(v*2)/2;
function rect(x,y,w,h,c){ctx.fillStyle=c;if(!HIRES){ctx.fillRect(x|0,y|0,w|0,h|0);return;}const x0=hp(x),y0=hp(y);ctx.fillRect(x0,y0,hp(x+w)-x0,hp(y+h)-y0);}
function frame(x,y,w,h,c){rect(x,y,w,1,c);rect(x,y+h-1,w,1,c);rect(x,y,1,h,c);rect(x+w-1,y,1,h,c);}
function emblemRound(x,y,w,h,r,fill,stroke){
  if(w<=0||h<=0)return;
  const rr=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.roundRect(x+.25,y+.25,w-.5,h-.5,rr);
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.75;ctx.stroke();}
}
function emblemGrad(y,h,top,bottom){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
/* Gritty bevelled panel with bronze rim and corner rivets. */
function panel(x,y,w,h,o){
  o=o||{};const fill=o.fill||C.panel;
  if(HIRES){
    ctx.save();ctx.shadowColor='rgba(2,10,27,.55)';ctx.shadowBlur=5;ctx.shadowOffsetY=2;
    emblemRound(x,y,w,h,3,emblemGrad(y,h,fill==C.panel?'#34567d':fill,fill),C.rim);ctx.restore();
    emblemRound(x+1.5,y+1.5,w-3,h-3,2,null,'rgba(255,244,207,.45)');
    rect(x+5,y+3,Math.max(0,w-10),.5,'rgba(255,255,255,.24)');
    if(o.title){const tw=textW(o.title)+14,tx=x+(w-tw)/2;emblemRound(tx,y-3,tw,10,3,emblemGrad(y-3,10,'#527cb0','#203d69'),C.rim2);text(o.title,x+w/2,y,C.white,{al:'c',sh:'#132544'});}
    return;
  }
  rect(x,y,w,h,C.edge);
  rect(x+1,y+1,w-2,h-2,o.rim||C.rim);
  rect(x+2,y+2,w-4,h-4,C.edge);
  rect(x+3,y+3,w-6,h-6,fill);
  rect(x+3,y+3,w-6,1,o.top||C.hi);
  if(!o.plain){for(const[cx,cy]of[[x+1,y+1],[x+w-3,y+1],[x+1,y+h-3],[x+w-3,y+h-3]]){rect(cx,cy,2,2,C.rim2);}}
  if(o.title){const tw=textW(o.title)+8;rect(x+Math.floor((w-tw)/2),y-1,tw,8,C.edge);rect(x+Math.floor((w-tw)/2)+1,y,tw-2,6,o.rim||C.rim);text(o.title,x+w/2,y,C.parch,{al:'c',sh:C.edge});}
}
function inset(x,y,w,h,fill){if(HIRES){emblemRound(x,y,w,h,2,fill||'#142a4b','rgba(202,222,243,.65)');return;}rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,fill||C.panel2);rect(x+1,y+h-2,w-2,1,'#3a2e24');}
function bar(x,y,w,h,f,col,bg){if(HIRES){emblemRound(x,y,w,h,h/2,bg||'#14243b',C.rim);const fw=Math.max(0,(w-2)*clamp(f,0,1));if(fw>0)emblemRound(x+1,y+1,fw,h-2,(h-2)/2,emblemGrad(y,h,'#d8ffe3',col));return;}rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,bg||'#2a1010');const fw=Math.max(0,Math.round((w-2)*clamp(f,0,1)));rect(x+1,y+1,fw,h-2,col);if(h>3)rect(x+1,y+1,fw,1,'rgba(255,255,255,.35)');}
function button(x,y,w,h,label,fn,o){
  o=o||{};const dis=!!o.disabled;
  const pressed=PTR.down&&!PTR.drag&&PTR.hit&&PTR.hit.id===('b'+x+','+y)&&PTR.x>=x&&PTR.y>=y&&PTR.x<x+w&&PTR.y<y+h;
  if(HIRES){
    const top=dis?'#48556a':o.hot?'#f6d787':o.on?'#74bdf3':'#608cc2';
    const bottom=dis?'#29374b':o.hot?'#b47731':o.on?'#2b66a4':'#244a80';
    ctx.save();ctx.shadowColor=o.glow||o.on?'rgba(145,216,255,.65)':'rgba(2,13,34,.6)';ctx.shadowBlur=o.glow?7:2;ctx.shadowOffsetY=1;
    emblemRound(x,y,w,h,Math.min(3,h/3),emblemGrad(y,h,top,bottom),o.hot||o.on?C.rim2:'#9ab9d3');ctx.restore();
    emblemRound(x+1,y+1,w-2,h-2,Math.min(2,h/3),null,'rgba(255,255,255,.3)');
    if(label!=null&&label!=='')text(label,x+w/2,y+Math.floor((h-5)/2)+(pressed?1:0),dis?'#a2a9b7':o.tc|| (o.hot?'#30223a':C.white),{al:'c',sh:o.hot?'#ffefcf':'#122b4d'});
    if(!dis&&fn)hit(x,y,w,h,{fn,id:'b'+x+','+y});else if(dis)hit(x,y,w,h,{id:'b'+x+','+y});return;
  }
  const base=o.col||(o.hot?'#7a4a1a':'#3a2e24');
  rect(x,y,w,h,C.edge);
  rect(x+1,y+1,w-2,h-2,dis?'#2a2420':(o.on?'#5a4a1a':base));
  if(!pressed&&!dis){rect(x+1,y+1,w-2,1,o.hot?'#c8883a':'#6a5440');rect(x+1,y+h-2,w-2,1,'#1a120c');}
  else rect(x+1,y+1,w-2,1,'#1a120c');
  if(o.on)frame(x+1,y+1,w-2,h-2,C.gold);
  if(o.glow&&!dis){const a=.35+.35*Math.sin(NOW/170);ctx.globalAlpha=a;frame(x-1,y-1,w+2,h+2,'#ffd870');frame(x,y,w,h,'#ffd870');ctx.globalAlpha=1;}
  const tc=dis?C.dim:(o.tc||(o.hot?C.white:C.parch));
  if(label!=null&&label!=='')text(label,x+w/2,y+Math.floor((h-5)/2)+(pressed?1:0),tc,{al:'c',sh:C.edge});
  if(!dis&&fn)hit(x,y,w,h,{fn,id:'b'+x+','+y});
  else if(dis)hit(x,y,w,h,{id:'b'+x+','+y});
}
function circle(cx,cy,r,col){ctx.fillStyle=col;for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(r*r-y*y+r*.8));ctx.fillRect(cx-w,cy+y,w*2+1,1);}}
/* Unit token drawn inside a ring (turn order list). */
function token(u,cx,cy,r,ring){
  circle(cx,cy,r+1,C.edge);circle(cx,cy,r,ring||sideRing(u));circle(cx,cy,r-1,'#1a1410');
  ctx.save();ctx.beginPath();ctx.arc(cx+.5,cy+.5,r-1,0,7);ctx.clip();
  const S=cardSprite(u,PORT);const hx=Math.round((S.lft+S.rgt)/2),hy=PORT?Math.min(S.top+r+3,Math.round((S.top+S.bot)/2)):Math.min(S.top+r,Math.round((S.top+S.bot)/2));ctx.drawImage(S.c,cx-hx,cy-hy);ctx.restore();
}
function sideRing(u){return u.side==='enemy'?(u.boss?'#f0c050':'#c83a30'):u.kind==='npc'?'#6ac86a':'#4a8ae0';}
/* ---------------- momentum gems, portraits, status icons ---------------- */
/* A 7×7 diamond. 'full' = momentum you have, 'empty' = an unfilled slot, 'cost' = would be spent (blinks), 'foe' = the foes' pool. */
function gem(x,y,state){
  x=Math.round(x);y=Math.round(y);state=state||'full';
  const blink=Math.floor(NOW/260)%2;
  const fill=state==='empty'?'#231a2e':state==='cost'?(blink?'#f4e8ff':'#a070e0'):state==='foe'?'#e0609a':state==='gain'?'#ffffff':C.mom;
  for(let r=0;r<7;r++){const hw=3-Math.abs(r-3);rect(x+3-hw,y+r,hw*2+1,1,C.edge);}
  for(let r=0;r<5;r++){const hw=2-Math.abs(r-2);rect(x+3-hw,y+1+r,hw*2+1,1,fill);}
  if(state==='empty'){rect(x+3,y+3,1,1,'#3e3050');}
  else{rect(x+2,y+2,1,1,'rgba(255,255,255,.85)');rect(x+3,y+1,1,1,'rgba(255,255,255,.6)');rect(x+4,y+4,1,1,'rgba(0,0,0,.25)');rect(x+3,y+5,1,1,'rgba(0,0,0,.25)');}
}
/* A row of momentum gems. cost>0 makes the gems that a selected power would spend blink. */
function gemRow(x,y,n,max,cost,gainT){
  for(let i=0;i<max;i++){
    let st=i<n?'full':'empty';
    if(cost&&i<n&&i>=n-cost)st='cost';
    if(gainT&&i<n&&i>=n-gainT.n&&NOW-gainT.t<600&&Math.floor((NOW-gainT.t)/100)%2===0)st='gain';
    gem(x+i*6,y,st);
  }
  return max*6+1;
}
function chip(x,y,w,h,fill,rim){if(HIRES){emblemRound(x,y,w,h,Math.min(3,h/3),emblemGrad(y,h,'#36577d','#1b3458'),rim||C.rim);return;}rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,rim||C.rim);rect(x+2,y+2,w-4,h-4,fill||C.panel);rect(x+2,y+2,w-4,1,'rgba(255,255,255,.08)');}
/* Square framed portrait: head and shoulders of the unit's sprite on a side-coloured backdrop. */
function portrait(u,x,y,s,o){
  o=o||{};
  const foe=u.side==='enemy';
  const bg=foe?(u.boss?'#3a2a0e':'#3a1614'):u.kind==='npc'?'#16301a':'#16223e';
  const rim=foe?(u.boss?C.gold:'#b84030'):u.kind==='npc'?'#5aa85a':'#4a80d0';
  rect(x,y,s,s,C.edge);rect(x+1,y+1,s-2,s-2,o.rim||rim);rect(x+2,y+2,s-4,s-4,bg);
  rect(x+2,y+s-6,s-4,4,'rgba(0,0,0,.25)');
  const S=cardSprite(u,true);
  const cx=Math.round((S.lft+S.rgt)/2);
  const big=S.bot-S.top>26&&S.rgt-S.lft>26;
  ctx.save();ctx.beginPath();ctx.rect(x+2,y+2,s-4,s-4);ctx.clip();
  const sx=x+Math.floor(s/2)-cx,sy=y+2-S.top+(big?2:1)+(o.dy||0);
  if(o.dim)ctx.globalAlpha=.45;
  ctx.drawImage(o.dead?S.bk:S.c,sx,sy);
  ctx.globalAlpha=1;
  ctx.restore();
}
function unitStatuses(u){
  const out=Object.keys(u.st||{}).filter(k=>STATUS7[k]);
  if(u.hidden)out.push('hidden');
  if(u.shield>0)out.push('shield');
  return out;
}
function statusRow(u,x,y,max){const L=unitStatuses(u).slice(0,max||6);L.forEach((k,i)=>{const c=statusIcon(k);if(c)ctx.drawImage(c,x+i*8,y);});return L.length*8;}
/* Cards and tokens always want a figure about 32 pixels tall, so large creatures use their half-size image there. */
function cardSprite(u,hi){const S=unitSprite(u,hi);return hi&&S.c.height/(S.c._s||1)>32?unitSprite(u,false):S;}
function unitSprite(u,hi){const f=hi?sprH:HIRES?sprM:spr;if(u.kind==='pc')return f(u.cls,u.rival?'rival':null);if(u.kind==='npc')return f(u.npc);return f(MON[u.type].art);}

/* ---------------- rich text with clickable keywords ---------------- */
const KW_MAP={};const KW_LIST=[];
for(const k in GLOSS)for(const f of GLOSS[k].forms){KW_MAP[f]=k;KW_LIST.push(f);}
KW_LIST.sort((a,b)=>b.length-a.length);
const KW_RE=new RegExp('\\b('+KW_LIST.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','gi');
function atomize(s,col,nokw){
  s=normText(s);const segs=[];const re=/\{([a-z]):([^}]*)\}/g;let last=0,m;
  while((m=re.exec(s))){if(m.index>last)segs.push({t:s.slice(last,m.index),col});segs.push({t:m[2],col:MC[m[1]]||col,mk:true});last=re.lastIndex;}
  if(last<s.length)segs.push({t:s.slice(last),col});
  const atoms=[];let sp=false;
  const words=(t,c,kw)=>{for(const tok of t.match(/\n| +|[^ \n]+/g)||[]){if(tok==='\n'){atoms.push({nl:true});sp=false;}else if(tok[0]===' ')sp=true;else{atoms.push({t:tok,col:c,sp,kw});sp=false;}}};
  for(const sg of segs){
    if(sg.mk||nokw){words(sg.t,sg.col);continue;}
    let i=0,k;KW_RE.lastIndex=0;
    while((k=KW_RE.exec(sg.t))){if(k.index>i)words(sg.t.slice(i,k.index),sg.col);atoms.push({t:k[0],col:C.kw,sp,kw:KW_MAP[k[0].toLowerCase()]});sp=false;i=KW_RE.lastIndex;}
    if(i<sg.t.length)words(sg.t.slice(i),sg.col);
  }
  return atoms;
}
const RICHC=new Map();
function layoutRich(s,w,col,nokw){
  const key=s+'\u0001'+w+'\u0001'+col+'\u0001'+(nokw?1:0);const hitc=RICHC.get(key);if(hitc)return hitc;
  if(RICHC.size>600)RICHC.clear();
  const lines=layoutRich0(s,w,col,nokw);RICHC.set(key,lines);return lines;
}
function layoutRich0(s,w,col,nokw){
  const atoms=atomize(s,col,nokw);const lines=[[]];let x=0;
  for(let i=0;i<atoms.length;i++){
    const a=atoms[i];
    if(a.nl){lines.push([]);x=0;continue;}
    let gw=textW(a.t);for(let j=i+1;j<atoms.length&&!atoms[j].nl&&!atoms[j].sp;j++)gw+=textW(atoms[j].t)+1;
    const spw=a.sp&&x>0?(HIRES?2:3):0;
    if(x>0&&a.sp&&x+spw+gw>w){lines.push([]);x=0;}
    const gap=x>0?(HIRES?(a.sp?2:.5):(a.sp?3:1)):0;
    lines[lines.length-1].push({t:a.t,col:a.col,kw:a.kw,x:x+gap});x+=gap+textW(a.t);
  }
  return lines;
}
function richH(s,w,nokw){return layoutRich(s,w,C.parch,nokw).length*LINE_H;}
function rich(s,x,y,w,col,o){
  o=o||{};const lines=layoutRich(s,w,col||C.parch,o.nokw);
  const clip=o.clip;
  lines.forEach((L,i)=>{
    const ly=y+i*LINE_H;if(clip&&(ly<clip[0]-6||ly>clip[1]))return;
    for(const a of L){
      text(a.t,x+a.x,ly,a.col,{sh:o.sh||C.edge});
      if(a.kw){const tw=textW(a.t);for(let d=0;d<tw;d+=2)rect(x+a.x+d,ly+6,1,1,C.kw);
        if(!o.nohit&&(!clip||(ly>=clip[0]&&ly<=clip[1]-4)))hit(x+a.x-1,ly-1,tw+2,9,{fn:()=>openGloss(a.kw),id:'kw'+a.kw+x+ly});}
    }
  });
  return lines.length*LINE_H;
}

/* ---------------- scroll areas ---------------- */
const SCR={};
function scrollArea(id,x,y,w,h,contentH,draw){
  const st=SCR[id]||(SCR[id]={y:0});
  const max=Math.max(0,contentH-h);st.y=clamp(st.y,0,max);
  const sc=d=>{st.y=clamp(st.y-d,0,max);};
  hit(x,y,w,h,{scroll:sc,id:'scr'+id});
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  const prev=SCROLLER;SCROLLER=sc;
  try{draw(y-Math.round(st.y),[y,y+h]);}finally{SCROLLER=prev;}
  ctx.restore();
  if(max>0){const th=Math.max(8,Math.round(h*h/contentH));const ty=y+Math.round((h-th)*st.y/max);rect(x+w-2,y,2,h,'#1a120c');rect(x+w-2,ty,2,th,C.rim2);}
}
function scrollTo(id,v){(SCR[id]||(SCR[id]={y:0})).y=v;}

/* ---------------- modals ---------------- */
const MODALS=[];
function openModal(m){MODALS.push(m);}
function closeModal(){MODALS.pop();}
function closeAllModals(){MODALS.length=0;}
/* Standard dialog box: title, rich body (scrolls if long), buttons [{l,fn,hot}]. */
function dialog(o){
  return {closable:o.closable!==false,draw(){
    const w=Math.min(o.w||200,SW-8);const bodyW=w-16;
    const bh=o.body?richH(o.body,bodyW):0;
    const extra=o.extraH||0;
    const btnH=o.buttons&&o.buttons.length?16:0;
    const maxBody=SH-40-btnH-extra;
    const vis=Math.min(bh,maxBody);
    const h=Math.min(SH-8,14+vis+extra+btnH+(o.title?6:0)+6);
    const x=Math.floor((SW-w)/2),y=Math.floor((SH-h)/2);
    dim();
    panel(x,y,w,h,{title:o.title});
    let cy=y+10;
    if(o.body){if(bh>maxBody)scrollArea('dlg'+(o.title||''),x+6,cy,w-10,vis,bh,(yy,clip)=>rich(o.body,x+8,yy,bodyW,C.parch,{clip}));else rich(o.body,x+8,cy,bodyW,C.parch);cy+=vis+4;}
    if(o.extra){o.extra(x+6,cy,w-12);cy+=extra;}
    if(btnH){const bs=o.buttons;const bw=Math.min(90,Math.floor((w-12-(bs.length-1)*4)/bs.length));let bx=x+Math.floor((w-(bw*bs.length+(bs.length-1)*4))/2);
      for(const b of bs){button(bx,y+h-17,bw,12,b.l,()=>{if(!b.keep)closeModal();b.fn&&b.fn();},{hot:b.hot,disabled:b.disabled});bx+=bw+4;}}
  }};
}
function dim(){ctx.fillStyle='rgba(5,3,2,.72)';ctx.fillRect(0,0,SW,SH);hit(0,0,SW,SH,{fn:()=>{const m=MODALS[MODALS.length-1];if(m&&m.closable!==false)closeModal();},id:'dim'});}
function msg(title,body,buttons,w){openModal(dialog({title,body,buttons:buttons||[{l:'OK',hot:true}],w}));}
function openGloss(k){const g=GLOSS[k];if(!g)return;msg(g.name,g.text,null,180);}

/* ---------------- floating effects ---------------- */
const FX=[];
function fx(o){o.t0=NOW;FX.push(o);return o;}
function drawFX(){
  for(let i=FX.length-1;i>=0;i--){const f=FX[i];const p=(NOW-f.t0)/(f.dur*spd());if(p>=1){FX.splice(i,1);f.done&&f.done();continue;}f.draw(p);}
}

/* 32×32 art in portrait, 16×16 in landscape. */
function art(key,variant){return PORT?sprH(key,variant):spr(key,variant);}
