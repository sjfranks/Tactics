'use strict';
/* =====================================================================
   EMBERWATCH — pixel canvas (320×180 landscape, 196 wide portrait), input, widgets
   ===================================================================== */
let SW=320,SH=180,PORT=false;
const cv=document.getElementById('game');
let ctx=cv.getContext('2d');const MAINCTX=ctx;
cv.width=SW;cv.height=SH;ctx.imageSmoothingEnabled=false;
let SCALE=1;const ROT=false;
/* Landscape screens get a 320×180 canvas; portrait screens get 180×320. */
/* Size from the visible viewport, minus the phone's safe areas (notch, home bar, browser chrome). */
const SAFE=document.createElement('div');SAFE.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';document.body.appendChild(SAFE);
function fit(){
  const vv=window.visualViewport;
  const st=parseFloat(getComputedStyle(SAFE).paddingTop)||0,sb=parseFloat(getComputedStyle(SAFE).paddingBottom)||0;
  const vw=vv?vv.width:window.innerWidth,vh=(vv?vv.height:window.innerHeight)-st-sb;
  PORT=vh>vw;
  const w=PORT?196:320,h=PORT?clamp(Math.round(196*vh/vw),330,560):180;
  if(w!==SW||h!==SH){SW=w;SH=h;cv.width=SW;cv.height=SH;MAINCTX.imageSmoothingEnabled=false;if(typeof onResize==='function')onResize();}
  let s=Math.min(vw/SW,vh/SH);if(s>=3)s=Math.floor(s);
  SCALE=s;
  cv.style.width=SW*s+'px';cv.style.height=SH*s+'px';
  cv.style.left=((vv?vv.offsetLeft:0)+(vw-SW*s)/2)+'px';
  cv.style.top=((vv?vv.offsetTop:0)+st+(vh-SH*s)/2)+'px';
  cv.style.transform='none';
}
if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit);}
window.addEventListener('resize',fit);window.addEventListener('orientationchange',()=>setTimeout(fit,50));fit();

/* ---------------- colours ---------------- */
const C={bg:'#0d0b0a',panel:'#1c1613',panel2:'#29201a',panel3:'#372a20',edge:'#050303',rim:'#6a5236',rim2:'#9a7a48',hi:'#4a3a2a',
  gold:'#f0c050',gold2:'#a07828',parch:'#e8dcc0',mute:'#9a8a70',dim:'#5e5446',red:'#e8584a',red2:'#7a2018',green:'#78d070',green2:'#2a6a2a',
  blue:'#70b8f8',blue2:'#24508a',kw:'#6fe0ff',mom:'#c090ff',mom2:'#5a3a9a',white:'#f8f4e8',orange:'#ff9a40'};
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
  auInit();
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
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w|0,h|0);}
function frame(x,y,w,h,c){rect(x,y,w,1,c);rect(x,y+h-1,w,1,c);rect(x,y,1,h,c);rect(x+w-1,y,1,h,c);}
/* Gritty bevelled panel with bronze rim and corner rivets. */
function panel(x,y,w,h,o){
  o=o||{};const fill=o.fill||C.panel;
  rect(x,y,w,h,C.edge);
  rect(x+1,y+1,w-2,h-2,o.rim||C.rim);
  rect(x+2,y+2,w-4,h-4,C.edge);
  rect(x+3,y+3,w-6,h-6,fill);
  rect(x+3,y+3,w-6,1,o.top||C.hi);
  if(!o.plain){for(const[cx,cy]of[[x+1,y+1],[x+w-3,y+1],[x+1,y+h-3],[x+w-3,y+h-3]]){rect(cx,cy,2,2,C.rim2);}}
  if(o.title){const tw=textW(o.title)+8;rect(x+Math.floor((w-tw)/2),y-1,tw,8,C.edge);rect(x+Math.floor((w-tw)/2)+1,y,tw-2,6,o.rim||C.rim);text(o.title,x+w/2,y,C.parch,{al:'c',sh:C.edge});}
}
function inset(x,y,w,h,fill){rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,fill||C.panel2);rect(x+1,y+h-2,w-2,1,'#3a2e24');}
function bar(x,y,w,h,f,col,bg){rect(x,y,w,h,C.edge);rect(x+1,y+1,w-2,h-2,bg||'#2a1010');const fw=Math.max(0,Math.round((w-2)*clamp(f,0,1)));rect(x+1,y+1,fw,h-2,col);if(h>3)rect(x+1,y+1,fw,1,'rgba(255,255,255,.35)');}
function button(x,y,w,h,label,fn,o){
  o=o||{};const dis=!!o.disabled;
  const pressed=PTR.down&&!PTR.drag&&PTR.hit&&PTR.hit.id===('b'+x+','+y)&&PTR.x>=x&&PTR.y>=y&&PTR.x<x+w&&PTR.y<y+h;
  const base=o.col||(o.hot?'#7a4a1a':'#3a2e24');
  rect(x,y,w,h,C.edge);
  rect(x+1,y+1,w-2,h-2,dis?'#2a2420':(o.on?'#5a4a1a':base));
  if(!pressed&&!dis){rect(x+1,y+1,w-2,1,o.hot?'#c8883a':'#6a5440');rect(x+1,y+h-2,w-2,1,'#1a120c');}
  else rect(x+1,y+1,w-2,1,'#1a120c');
  if(o.on)frame(x+1,y+1,w-2,h-2,C.gold);
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
  const S=unitSprite(u,PORT);const hx=Math.round((S.lft+S.rgt)/2),hy=PORT?Math.min(S.top+r+3,Math.round((S.top+S.bot)/2)):Math.min(S.top+r,Math.round((S.top+S.bot)/2));ctx.drawImage(S.c,cx-hx,cy-hy);ctx.restore();
}
function sideRing(u){return u.side==='enemy'?(u.boss?'#f0c050':'#c83a30'):u.kind==='npc'?'#6ac86a':'#4a8ae0';}
function unitSprite(u,hi){const f=hi?sprH:spr;if(u.kind==='pc')return f(u.cls,u.rival?'rival':null);if(u.kind==='npc')return f(u.npc);return f(MON[u.type].art);}

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
function layoutRich(s,w,col,nokw){
  const atoms=atomize(s,col,nokw);const lines=[[]];let x=0;
  for(let i=0;i<atoms.length;i++){
    const a=atoms[i];
    if(a.nl){lines.push([]);x=0;continue;}
    let gw=textW(a.t);for(let j=i+1;j<atoms.length&&!atoms[j].nl&&!atoms[j].sp;j++)gw+=textW(atoms[j].t)+1;
    const spw=a.sp&&x>0?3:0;
    if(x>0&&a.sp&&x+spw+gw>w){lines.push([]);x=0;}
    const gap=x>0?(a.sp?3:1):0;
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
