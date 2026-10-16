'use strict';
/* =====================================================================
   ROGUE TACTICS — the Legacy screens: boons at the start of a journey, the Dread ladder and the Chronicle
   (what carries over between journeys). The rules are in run.js.
   ===================================================================== */

/* ---------------- boons ---------------- */
const BSEL={i:null};
function boonCardH(b,w){return 30+richH(boonText(b),w-36);}
const BOON_SCREEN={enter(){BSEL.i=null;scrollTo('boon',0);},draw(){
  ctx.drawImage(stoneBG(),0,0);drawEmbers('#6a3a1a');
  text('THE ROAD BEGINS',SW/2,6,C.gold,{al:'c',sc:2,ol:C.edge});
  let y=24;const x=6,w=SW-12;
  y+=rich('Fortune meets you at the gate with two gifts and a bargain. Choose one.',x,y,w,C.parch)+3;
  if(RUN.dread){text(`DREAD ${RUN.dread}: ${DREAD[RUN.dread-1].name.toUpperCase()}${RUN.dread>1?' AND BELOW':''}`,SW/2,y,C.red,{al:'c'});y+=10;}
  const B=RUN.boons||[];const bottom=SH-24;let ch=0;for(const b of B)ch+=boonCardH(b,w)+5;
  scrollArea('boon',x,y,w+2,bottom-y,ch,(yy,clip)=>{let cy=yy;B.forEach((b,i)=>{const D=BOONS[b.id],h=boonCardH(b,w),on=BSEL.i===i;
    panel(x,cy,w,h,{fill:on?'#2e2410':D.bargain?'#241014':'#1e1612',rim:on?C.gold:D.bargain?C.red2:undefined});
    if(on){ctx.globalAlpha=.3+.25*Math.sin(NOW/180);frame(x-1,cy-1,w+2,h+2,C.gold);ctx.globalAlpha=1;}
    const ic=mapIcon(D.bargain?'elite':b.id==='tutor'||b.id==='veteran'?'rest':b.id==='armory'||b.id==='smith'?'shop':'treasure');if(ic)ctx.drawImage(ic,x+4,cy+4);
    text(D.name,x+32,cy+5,D.bargain?'#ff8a6a':C.gold);text(D.bargain?'A bargain: power at a price':'A gift',x+32,cy+13,C.mute);
    rich(boonText(b),x+32,cy+22,w-36,C.parch,{clip});
    if(cy+h>clip[0]&&cy<clip[1])hit(x,Math.max(cy,clip[0]),w,Math.min(cy+h,clip[1])-Math.max(cy,clip[0]),{fn:()=>{BSEL.i=i;sfx('select');},id:'boon'+i});
    cy+=h+5;});});
  const sel=BSEL.i!=null?B[BSEL.i]:null;
  const done=r=>{if(r==='reward')goReward();else go(MAP_SCREEN);};
  button(SW/2-64,SH-19,56,15,'NONE',()=>{done(takeBoon(null));},{});
  button(SW/2+2,SH-19,62,15,'TAKE',()=>{if(!sel)return;sfx(BOONS[sel.id].bargain?'villain':'chest');done(takeBoon(sel));},{hot:true,disabled:!sel,glow:!!sel});
}};
/* The map sends a fresh journey to its boon first. */
{const enter0=MAP_SCREEN.enter;MAP_SCREEN.enter=function(){if(RUN&&RUN.boons&&RUN.stage==='map'){go(BOON_SCREEN);return;}return enter0.call(this);};}

/* ---------------- the Dread ladder ---------------- */
function chooseDread(then){
  const L=legacy();
  if(!L.dreadMax){then(0);return;}
  const items=[{l:'Dread 0: the open road',sub:'The journey as it was meant to be.',v:0}];
  for(let i=1;i<=L.dreadMax;i++)items.push({l:`Dread ${i}: ${DREAD[i-1].name}`,sub:DREAD[i-1].desc+(i>1?' And every level below.':''),v:i});
  pickList('CHOOSE YOUR DREAD',items.reverse(),v=>{L.lastDread=v;saveLegacy();then(v);},{rowH:30,w:230});
}
function setOut(){chooseDread(d=>{newRun(d);go(MAP_SCREEN);});}

/* ---------------- the Chronicle ---------------- */
const CHRON={h:400};
const CHRONICLE_SCREEN={enter(){scrollTo('chron',0);},draw(){
  rect(0,0,SW,SH,C.bg);
  button(4,3,22,14,'◀',()=>go(TITLE_SCREEN),{hot:true});
  text('CHRONICLE',SW/2,5,C.gold,{al:'c',sc:2,ol:C.edge});
  const L=legacy(),x=6,w=SW-12,top=22;
  scrollArea('chron',x,top,w+2,SH-top-3,CHRON.h,(yy,clip)=>{let y=yy;
    const st=[['JOURNEYS',L.runs],['DRAGONS SLAIN',L.wins],['BEST SCORE',L.best||0],['BATTLES WON',L.battles],['ELITES',L.elites],['FOES SLAIN',L.kills]];
    const cols=3,bw=Math.floor((w-(cols-1)*4)/cols);
    st.forEach((s,i)=>{const bx=x+(i%cols)*(bw+4),by=y+Math.floor(i/cols)*30;panel(bx,by,bw,26,{fill:'#1e1612'});text(String(s[1]),bx+bw/2,by+4,C.gold,{al:'c',sc:2,ol:C.edge});text(fitText(s[0],bw-4),bx+bw/2,by+18,C.mute,{al:'c'});});
    y+=Math.ceil(st.length/cols)*30+4;
    secHead('THE DREAD LADDER',x,y,w);y+=11;
    y+=rich(L.dreadMax?`Win a journey at your highest Dread to unlock the next. Unlocked: {r:Dread ${L.dreadMax}} of ${DREAD.length}.`:'Slay the Ashen Dragon to unlock {r:Dread 1}. Each Dread level makes the road harder, and scores more.',x,y,w,C.parch,{clip})+3;
    DREAD.forEach((D,i)=>{const on=i<L.dreadMax;text(`${i+1}`,x+6,y,on?C.red:C.dim,{al:'c'});text(on?D.name:'???',x+14,y,on?C.parch:C.dim);if(on)y+=rich('{m:'+D.desc+'}',x+14,y+8,w-16,C.mute,{clip})+9;else y+=9;});
    y+=4;secHead('RELICS UNLOCKED',x,y,w);y+=11;
    for(const u of LEGACY_UNLOCKS){const on=L.unlocked.includes(u.relic),R=RELICS[u.relic];
      const h=Math.max(24,14+richH(on?R.desc:u.need,w-30));
      panel(x,y,w,h,{fill:on?'#1e1612':'#141010'});
      if(!on)ctx.globalAlpha=.25;ctx.drawImage(relicArt(u.relic),x+4,y+4);ctx.globalAlpha=1;
      text(on?R.name:'Locked',x+26,y+4,on?C.gold:C.dim);rich(on?R.desc:'{m:'+u.need+'}',x+26,y+12,w-30,C.parch,{clip});
      y+=h+3;}
    y+=4;secHead('RECENT JOURNEYS',x,y,w);y+=11;
    if(!L.history.length){text('None yet.',x,y,C.mute);y+=10;}
    for(const r of L.history){const d=new Date(r.t);
      text(r.won?'Victory':`Fell in ${ACTS[Math.min(2,r.act)].sub}`,x,y,r.won?C.gold:'#ff8a6a');
      text(`${r.score} pts`,x+w,y,C.parch,{al:'r'});y+=8;
      text(fitText(`${d.getDate()}/${d.getMonth()+1} · Dread ${r.dread} · ${r.battles} battles${r.pw?` · ${r.pw} powers`:''}`,w),x,y,C.mute);y+=11;}
    CHRON.h=y-yy+6;});
}};
