'use strict';
/* =====================================================================
   EMBERWATCH — painted pixel illustrations for events and places.
   Each scene paints a static layer once (cached) and animates a few
   things on top every frame: mist, flames, wisps, swinging ropes.
   ===================================================================== */
const ILW=176,ILH=96;
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
/* A small pixel painter over a 2D context. Everything lands on whole pixels. */
function painter(g){
  const P={
    g,
    px(x,y,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),1,1);},
    rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},
    /* vertical gradient through a list of colours, ordered-dithered between bands */
    grad(x,y,w,h,cols){const n=cols.length-1;for(let yy=0;yy<h;yy++){const t=h>1?yy/(h-1)*n:0;const i=Math.min(n-1,Math.floor(t)),f=t-i;
      for(let xx=0;xx<w;xx++){const th=(BAYER[(yy&3)*4+(xx&3)]+.5)/16;g.fillStyle=f>th?cols[i+1]:cols[i];g.fillRect(x+xx,y+yy,1,1);}}},
    poly(pts,c){g.fillStyle=c;let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
      for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const yc=y+.5,xs=[];
        for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=yc&&b[1]>yc)||(b[1]<=yc&&a[1]>yc))xs.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
        xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2){const xa=Math.round(xs[i]),xb=Math.round(xs[i+1]);if(xb>xa)g.fillRect(xa,y,xb-xa,1);}}},
    ell(cx,cy,rx,ry,c){g.fillStyle=c;for(let y=-ry;y<=ry;y++){const w=rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry)));g.fillRect(Math.round(cx-w),Math.round(cy+y),Math.round(2*w)+1,1);}},
    line(x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);g.fillStyle=c;const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
      for(let i=0;i<400;i++){g.fillRect(x0,y0,1,1);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}},
    /* rope/curve through a quadratic bezier */
    curve(x0,y0,cx,cy,x1,y1,c){let lx=x0,ly=y0;for(let i=1;i<=24;i++){const t=i/24,u=1-t;const x=u*u*x0+2*u*t*cx+t*t*x1,y=u*u*y0+2*u*t*cy+t*t*y1;P.line(lx,ly,x,y,c);lx=x;ly=y;}},
    /* a jagged silhouette filled down to `bottom` */
    ridge(base,amp,step,c,r,x0,x1,bottom){x0=x0||0;x1=x1==null?ILW:x1;bottom=bottom||ILH;let h=base;g.fillStyle=c;
      for(let x=x0;x<x1;x++){if(x%step===0)h=base+(r()-.5)*2*amp;g.fillRect(x,Math.round(h),1,bottom-Math.round(h));}},
    /* smooth hills: sum of sines */
    hills(base,amp,freq,ph,c,bottom){g.fillStyle=c;bottom=bottom||ILH;for(let x=0;x<ILW;x++){const h=base+Math.sin(x*freq+ph)*amp+Math.sin(x*freq*2.3+ph*1.7)*amp*.35;g.fillRect(x,Math.round(h),1,bottom-Math.round(h));}},
    speck(x,y,w,h,n,cols,r){for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(r()*cols.length)];g.fillRect(x+Math.floor(r()*w),y+Math.floor(r()*h),1,1);}},
    /* soft light: concentric translucent discs */
    glow(cx,cy,r,rgb,a){for(let i=4;i>=1;i--){g.fillStyle=`rgba(${rgb},${a*(5-i)/10})`;const rr=Math.round(r*i/4);for(let y=-rr;y<=rr;y++){const w=Math.floor(Math.sqrt(rr*rr-y*y));g.fillRect(cx-w,cy+y,2*w+1,1);}}},
    /* draw a little ASCII sprite; '.' is transparent */
    spr(rows,pal,x,y,flip){for(let yy=0;yy<rows.length;yy++){const r=rows[yy];for(let xx=0;xx<r.length;xx++){const ch=r[xx];if(ch==='.')continue;g.fillStyle=pal[ch]||'#f0f';g.fillRect(x+(flip?r.length-1-xx:xx),y+yy,1,1);}}},
  };
  return P;
}
const ILLC={};
function illusLayer(id){
  if(ILLC[id])return ILLC[id];
  const c=document.createElement('canvas');c.width=ILW;c.height=ILH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const S=ILLUS[id];if(S)S.paint(painter(g),mulberry(S.seed||7));
  return ILLC[id]=c;
}
/* Draw a scene at (x,y) with its frame. The animated layer draws straight onto the screen. */
function drawIllus(id,x,y){
  x=Math.round(x);y=Math.round(y);
  rect(x-2,y-2,ILW+4,ILH+4,C.edge);rect(x-1,y-1,ILW+2,ILH+2,C.rim);
  ctx.drawImage(illusLayer(id),x,y);
  const S=ILLUS[id];
  if(S&&S.anim){ctx.save();ctx.beginPath();ctx.rect(x,y,ILW,ILH);ctx.clip();const P=painter(ctx);S.anim(P,x,y,NOW/1000);ctx.restore();}
  for(const[cx,cy]of[[x-2,y-2],[x+ILW-1,y-2],[x-2,y+ILH-1],[x+ILW-1,y+ILH-1]]){rect(cx,cy,3,3,C.gold2);rect(cx+1,cy+1,1,1,C.gold);}
}
/* shared animated bits */
function drawMist(P,ox,oy,t,y0,h,col,speed,n){for(let i=0;i<n;i++){const yy=y0+i*(h/n);const off=((t*speed*(1+i*.3)+i*37)%(ILW+80))-40;
  for(let k=0;k<3;k++){const x=ox+((off+k*70)%(ILW+80))-40;P.g.fillStyle=col;P.g.fillRect(Math.round(x),Math.round(oy+yy),46,2);P.g.fillRect(Math.round(x+6),Math.round(oy+yy-1),30,1);P.g.fillRect(Math.round(x+10),Math.round(oy+yy+2),24,1);}}}
function flame(P,x,y,t,sc,seed){sc=sc||1;const f=Math.sin(t*14+seed)*.5+.5,g=Math.sin(t*9+seed*2)*.5+.5;
  const h=Math.round((3+f*2)*sc);P.rect(x-1,y-h,2*sc,h,'#ff8a20');P.rect(x-1+Math.round(g),y-h-sc,1*sc,sc,'#ffb040');P.rect(x-1+Math.round(1-g),y-Math.round(h*.6),sc,Math.round(h*.6),'#ffe070');P.px(x,y-1,'#fff6c0');}

const ILLUS={
/* ---------------- The Collapsed Bridge ---------------- */
bridge:{seed:11,paint(P,r){
  P.grad(0,0,ILW,52,['#1c2244','#3a3a64','#6a5474','#b07a6a','#e0a070']);
  P.speck(0,0,ILW,24,26,['#8a90c0','#5a6090'],r);
  P.glow(118,44,26,'255,200,140',.25);P.ell(118,44,7,7,'#ffe0a0');P.ell(118,44,5,5,'#fff4d0');
  P.hills(38,4,.045,2,'#3e3a5e');P.hills(45,3,.08,0,'#2e2a48');
  // gorge depths
  P.grad(40,50,96,46,['#2a2640','#1c1a2e','#121020']);
  P.rect(40,82,96,14,'#0e0c18');
  // left cliff
  P.poly([[0,44],[34,42],[44,46],[48,50],[46,60],[42,70],[44,82],[38,96],[0,96]],'#4a3a34');
  P.poly([[34,42],[44,46],[48,50],[46,60],[42,70],[44,82],[38,96],[30,96],[36,70],[38,54]],'#2e2420');
  P.poly([[0,42],[36,40],[46,45],[40,47],[0,47]],'#6a8a3a');P.rect(0,47,40,2,'#3e5424');
  // right cliff
  P.poly([[176,38],[136,38],[128,44],[126,54],[130,66],[127,80],[132,96],[176,96]],'#4a3a34');
  P.poly([[136,38],[128,44],[126,54],[130,66],[127,80],[132,96],[140,96],[136,76],[138,58],[134,46]],'#5e4a40');
  P.poly([[176,36],[134,36],[128,42],[176,42]],'#6a8a3a');P.rect(134,42,42,2,'#3e5424');
  P.speck(0,50,40,46,120,['#3a2c28','#5a463c','#2a201c'],r);P.speck(140,46,36,50,120,['#3a2c28','#5a463c','#2a201c'],r);
  // bridge posts
  for(const[x,y]of[[38,34],[44,35],[132,31],[138,31]]){P.rect(x,y,2,9,'#5a3a1e');P.px(x,y,'#8a5a32');}
  // intact left span, sagging, snapped at x≈92
  P.curve(39,36,64,58,92,52,'#c8a060');P.curve(45,38,68,62,92,56,'#a07840');
  for(let i=0;i<12;i++){const t=i/12,u=1-t;const x=u*u*42+2*u*t*66+t*t*92,y=u*u*39+2*u*t*62+t*t*55;P.rect(x-1,y-1,3,3,'#7a5030');P.px(x-1,y-1,'#a07040');}
  // right span hangs straight down the far cliff
  P.line(133,34,130,62,'#c8a060');P.line(139,34,136,64,'#a07840');
  for(let y=38;y<62;y+=4){P.rect(130+(62-y)/9,y,7,2,'#7a5030');P.px(131+(62-y)/9,y,'#a07040');}
  // foreground grass
  for(let x=0;x<40;x+=2){P.px(x,41-(x%3),'#8aaa4a');}
}, anim(P,ox,oy,t){
  drawMist(P,ox,oy,t,62,26,'rgba(200,190,220,.10)',6,4);
  // the strongbox swings on its rope from the broken end
  const a=Math.sin(t*1.6)*.28,L=22,ax=ox+92,ay=oy+54;const bx=ax+Math.sin(a)*L,by=ay+Math.cos(a)*L;
  P.line(ax,ay,bx,by,'#c8a060');
  P.rect(bx-5,by,10,8,'#0e0a0a');P.rect(bx-4,by+1,8,6,'#8a5a2a');P.rect(bx-4,by+1,8,2,'#b07a3a');P.rect(bx-1,by+3,2,2,'#f0c050');P.px(bx-4,by+1,'#c89050');
  // birds
  for(let i=0;i<2;i++){const bx2=ox+((t*9+i*60)%(ILW+20))-10,by2=oy+14+i*7+Math.sin(t*2+i)*2;const w=Math.floor(t*6+i)%2;P.px(bx2-1,by2-w,'#1c1a2e');P.px(bx2,by2,'#1c1a2e');P.px(bx2+1,by2-w,'#1c1a2e');}
}},
/* ---------------- The Wandering Pilgrim ---------------- */
pilgrim:{seed:23,paint(P,r){
  P.grad(0,0,ILW,60,['#241634','#4a2a4a','#8a4a4e','#d0784e','#f0b060']);
  P.glow(40,56,30,'255,190,120',.3);
  P.hills(50,4,.05,1,'#5a3a4a');P.hills(56,3,.07,3,'#3e2a3a');
  P.grad(0,62,ILW,34,['#3a2a2a','#2a1e1e','#1a1414']);
  // road winding to the horizon
  P.poly([[70,60],[78,60],[96,72],[130,96],[88,96],[74,72]],'#6a5040');
  P.poly([[72,60],[76,60],[90,72],[116,96],[100,96],[82,72]],'#7a5e48');
  P.speck(0,62,ILW,34,160,['#4a3a2a','#2e2218','#5a3a3a'],r);
  // dead tree silhouette
  P.line(150,40,150,70,'#1a1014');P.line(151,40,151,70,'#1a1014');P.line(150,52,140,44,'#1a1014');P.line(151,48,160,40,'#1a1014');P.line(145,48,142,40,'#1a1014');P.line(156,44,158,36,'#1a1014');
  // roadside stones
  P.ell(26,84,7,4,'#4a4040');P.ell(25,83,5,2,'#6a6060');P.ell(160,88,6,3,'#4a4040');
  // the pilgrim
  const pr=["....KKKK......","...KgggGK.....","..KgGssGGK....","..KgsSSsGK....","..KggsSgGK....","..KgggggGK....",".KggGgggGGK...",".KgGggGggGK...","KggGgggGggGK..","KgGggGggGgGK..","KggGggGggGgK..",".KgGgggGgGGK..",".KgggGggGgGK..","..KgGggGgGK...","..KggGgGgGK...","..KgGggGgGK...","..KKKKKKKKK...","...KsK.KsK...."];
  P.spr(pr,{K:'#141014',g:'#7a7470',G:'#4e4a48',s:'#d8a888',S:'#a07060'},98,56);
  P.line(111,52,114,74,'#6a4a2a');P.px(111,52,'#8a6a3a');
}, anim(P,ox,oy,t){
  // lantern flicker
  const f=.8+Math.sin(t*9)*.1+Math.sin(t*23)*.06;
  P.glow(ox+96,oy+67,Math.round(16*f),'255,200,110',.35);
  P.rect(ox+94,oy+64,5,6,'#0e0a0a');P.rect(ox+95,oy+65,3,4,f>.85?'#fff0a0':'#ffc850');P.line(ox+96,oy+62,ox+99,oy+59,'#3a2a1a');
  // fireflies
  for(let i=0;i<7;i++){const x=ox+20+((i*29+t*6*(i%2?1:-1))%140+140)%140,y=oy+60+Math.sin(t*1.3+i*2)*12;if(Math.sin(t*3+i*1.7)>.2)P.px(x,y,'#f8f0a0');}
}},
/* ---------------- A Forgotten Shrine ---------------- */
shrine:{seed:37,paint(P,r){
  P.grad(0,0,ILW,ILH,['#0a1414','#12241e','#1a3226','#1e3a2a']);
  // trees behind
  for(let i=0;i<9;i++){const x=i*22-6+Math.floor(r()*8),w=14+Math.floor(r()*8);P.rect(x+w/2-2,20,4,60,'#102018');P.ell(x+w/2,16+Math.floor(r()*10),w,14,i%2?'#16301e':'#1a3622');}
  // light shaft from above
  for(let y=0;y<80;y++){for(let x=0;x<34;x++){const xx=72+x+Math.round(y*.25);if((BAYER[(y&3)*4+(xx&3)])<3)P.px(xx,y,'rgba(200,255,220,.18)');}}
  P.grad(0,70,ILW,26,['#1e3a24','#16301c','#102414']);
  P.speck(0,70,ILW,26,200,['#2a4a2a','#1a3018','#3a5a30'],r);
  // standing stones
  for(const[x,h]of[[24,26],[146,30]]){P.rect(x,76-h,12,h,'#4a5250');P.rect(x,76-h,3,h,'#6a7270');P.rect(x+9,76-h,3,h,'#343a38');P.rect(x,76-h,12,2,'#5a8a4a');P.px(x+5,76-h+8,'#2e3432');}
  // altar
  P.rect(62,56,52,24,'#0e1212');P.rect(63,57,50,22,'#5a6260');P.rect(63,57,50,4,'#7a8480');P.rect(63,74,50,5,'#3e4644');
  P.rect(58,52,60,6,'#0e1212');P.rect(59,53,58,4,'#6e7874');P.rect(59,53,58,1,'#8a9490');
  P.speck(63,57,50,22,60,['#4a524e','#6a7470','#3a8a4a'],r);
  P.rect(59,52,14,2,'#4a8a3a');P.rect(98,52,20,2,'#4a8a3a');P.rect(63,61,3,10,'#3a7a36');P.rect(108,62,4,8,'#3a7a36');
  // carved circle
  P.ell(88,67,8,7,'#3e4644');P.ell(88,67,6,5,'#5a6260');
}, anim(P,ox,oy,t){
  const pulse=.5+.5*Math.sin(t*2.4);
  P.glow(ox+88,oy+67,14,'120,255,210',.25+pulse*.2);
  // runes round the carving
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+t*.3;const x=ox+88+Math.cos(a)*7,y=oy+67+Math.sin(a)*6;if((i+Math.floor(t*3))%3)P.rect(x,y,2,2,pulse>.5?'#c8fff0':'#6affc8');}
  P.rect(ox+87,oy+66,2,2,'#e8fff8');
  // rising motes
  for(let i=0;i<10;i++){const ph=(t*.25+i*.1)%1;const x=ox+64+((i*37)%48)+Math.sin(t+i)*3,y=oy+56-ph*50;if(ph<.9)P.px(x,y,ph<.5?'#a8ffe0':'#6ad0b0');}
}},
/* ---------------- The Goblin Toll ---------------- */
toll:{seed:41,paint(P,r){
  P.grad(0,0,ILW,48,['#4a8ad0','#6aa4e0','#9ac8ec','#c8e4f0']);
  for(const[x,y,w]of[[20,12,24],[100,8,30],[150,18,18]]){P.ell(x,y,w/2,4,'#e8f4f8');P.ell(x+6,y-2,w/3,4,'#ffffff');P.rect(x-w/2,y+2,w,2,'#c8dcec');}
  P.hills(40,4,.04,2,'#6a9a5a');P.hills(46,3,.06,0,'#4a7a3a');
  for(let i=0;i<14;i++){const x=i*13+Math.floor(r()*6);P.ell(x,44,6,7,'#2e5a2a');P.ell(x-1,42,4,4,'#3e6a34');}
  P.grad(0,52,ILW,44,['#5a8a3a','#4a7a30','#3a6a26']);
  P.speck(0,52,ILW,44,220,['#6a9a44','#3a6a24','#7aaa4a'],r);
  // road
  P.poly([[60,52],[100,52],[150,96],[20,96]],'#9a7a52');P.poly([[66,52],[94,52],[134,96],[38,96]],'#aa8a60');
  P.speck(30,56,110,40,140,['#8a6a44','#b89a70','#7a5a3a'],r);
  // the cart across the road
  P.rect(52,58,70,16,'#0e0a0a');P.rect(53,59,68,14,'#8a5a32');for(let x=56;x<121;x+=8)P.rect(x,59,1,14,'#5a3a1e');P.rect(53,59,68,2,'#aa7a44');
  P.rect(50,56,74,3,'#0e0a0a');P.rect(51,56,72,2,'#6a4424');
  for(const wx of[62,110]){P.ell(wx,76,7,7,'#0e0a0a');P.ell(wx,76,6,6,'#6a4424');P.ell(wx,76,3,3,'#3a2414');for(let a=0;a<6;a++)P.line(wx,76,wx+Math.cos(a)*5,76+Math.sin(a)*5,'#8a5a32');P.px(wx,76,'#c8a060');}
  // TOLL sign
  P.rect(126,40,2,34,'#5a3a1e');P.rect(116,40,24,11,'#0e0a0a');P.rect(117,41,22,9,'#c8a060');
  P.spr(["xxx.xxx.x...x..",".x..x.x.x...x..",".x..x.x.x...x..",".x..x.x.x...x..",".x..xxx.xxx.xxx"],{x:'#5a2a14'},121,43);
}, anim(P,ox,oy,t){
  const gob=["..K..K..","..KnnK..",".KnenenK","KnnnnnnK","..KnnK..",".KllllK.",".KllllK.","..K..K.."];
  const pal={K:'#1e140e',n:'#7ea844',e:'#ffe040',l:'#8a5a32'};
  for(const[i,x,y]of[[0,66,48],[1,84,46],[2,100,49]]){const b=Math.floor(t*3+i*1.3)%2;P.spr(gob,pal,ox+x,oy+y-b);
    if(i!==1){P.line(ox+x+(i?-1:8),oy+y-8-b,ox+x+(i?-1:8),oy+y+6-b,'#6a4a2a');P.px(ox+x+(i?-1:8),oy+y-9-b,'#d8dce0');}}
  // banner on the cart
  const w=Math.sin(t*4);P.line(ox+56,oy+36,ox+56,oy+57,'#5a3a1e');
  for(let i=0;i<10;i++){const yy=oy+37+Math.round(Math.sin(t*5+i*.6)*1.2);P.rect(ox+57+i,yy,1,7,i%3?'#b02a2a':'#8a1a1a');}
  P.px(ox+62,oy+40+Math.round(w),'#f0c050');
}},
/* ---------------- The Locked Reliquary ---------------- */
reliquary:{seed:53,paint(P,r){
  P.rect(0,0,ILW,ILH,'#1a1416');
  for(let y=0;y<70;y+=6){const off=(y/6)%2?7:0;for(let x=-off;x<ILW;x+=14){P.rect(x+1,y+1,12,4,['#2e2628','#342a2c','#2a2224'][Math.floor(r()*3)]);}}
  // arched window with moonlight
  P.rect(74,6,28,40,'#0e0a0c');P.ell(88,12,14,10,'#0e0a0c');
  P.grad(76,10,24,34,['#2a3a6a','#3a4a7a','#4a5a8a']);P.ell(88,14,12,8,'#2a3a6a');
  P.rect(87,6,2,40,'#0e0a0c');P.rect(76,24,24,2,'#0e0a0c');
  // moonbeam onto the altar
  for(let y=46;y<74;y++){for(let x=0;x<30;x++){const xx=76+x-Math.round((y-46)*.3);if(BAYER[(y&3)*4+(xx&3)]<4)P.px(xx,y,'rgba(160,190,255,.25)');}}
  // floor
  P.grad(0,70,ILW,26,['#2a2224','#201a1c','#161214']);
  for(let x=0;x<ILW;x+=16)P.rect(x,70,1,26,'#120e10');
  // altar
  P.rect(52,60,72,24,'#0e0a0c');P.rect(53,61,70,22,'#5a4e50');P.rect(53,61,70,3,'#7a6e70');P.rect(53,78,70,5,'#3e3436');
  P.rect(48,56,80,6,'#0e0a0c');P.rect(49,57,78,4,'#6a5e60');P.rect(49,57,78,1,'#8a7e80');
  // the iron casket with chains
  P.rect(72,40,32,18,'#0e0a0c');P.rect(73,41,30,16,'#4a4a52');P.rect(73,41,30,5,'#5e5e68');P.rect(73,46,30,1,'#2a2a30');
  for(const x of[73,102])P.rect(x,41,1,16,'#6a6a74');
  for(const[x,y]of[[75,43],[100,43],[75,54],[100,54]])P.px(x,y,'#e0b040');
  P.rect(85,48,6,6,'#0e0a0c');P.rect(86,49,4,4,'#c89030');P.px(87,50,'#0e0a0c');P.px(87,51,'#0e0a0c');
  for(let i=0;i<9;i++){P.px(70+i*4,48+(i%2),'#8a8a94');P.px(71+i*4,48+(i%2),'#5a5a64');}
  // candle stands
  for(const x of[42,134]){P.rect(x-1,52,3,28,'#3a2a1a');P.rect(x-4,78,9,3,'#3a2a1a');P.rect(x-2,48,5,6,'#e8e0c8');P.rect(x-2,48,1,6,'#fffaf0');}
}, anim(P,ox,oy,t){
  for(const[i,x]of[[0,42],[1,134]]){P.glow(ox+x,oy+44,16,'255,190,100',.28+Math.sin(t*8+i)*.04);flame(P,ox+x,oy+48,t,1,i*3);}
  P.glow(ox+88,oy+50,10,'255,210,120',.08+.06*Math.sin(t*2));
  if(Math.floor(t*1.2)%5===0){const s=(t*1.2%1);P.px(ox+76+s*24,oy+42,'#ffffff');}
  for(let i=0;i<9;i++){const ph=(t*.08+i*.11)%1;const x=ox+70+((i*13)%26)+Math.sin(t*.7+i)*3-ph*8,y=oy+50+ph*24;P.px(x,y,'rgba(220,230,255,.8)');}
}},
/* ---------------- The Wounded Hunter ---------------- */
hunter:{seed:67,paint(P,r){
  P.grad(0,0,ILW,54,['#3a2a4a','#6a3a52','#b0564a','#e08a4a','#f4c070']);
  P.ell(40,50,10,10,'#ffd890');P.ell(40,50,8,8,'#fff0c0');
  P.hills(44,5,.035,0,'#5a3a4a');P.hills(52,3,.05,2,'#4a2e40');
  P.grad(0,56,ILW,40,['#5a3a5a','#4a2a4a','#3a2038']);
  for(let i=0;i<260;i++){const x=Math.floor(r()*ILW),y=56+Math.floor(r()*40);P.px(x,y,r()<.5?'#8a4a8a':'#6a3a6a');if(r()<.3)P.px(x,y-1,'#b06aa0');}
  // rock the hunter leans on
  P.ell(118,74,16,10,'#3a3438');P.ell(116,71,13,7,'#5a5258');P.ell(113,68,8,4,'#6e666c');
  // hunter, slumped against the rock, legs out to the left
  const hu=["......KKK.......",".....KhhhK......","....KhhsshK.....","....KhssSsK.....","....KhhsshK.....",".....KggggK.....","....KggggggK....","...KggGggGggK...","...KggGggGggK...","..KsgGggGggK....","..KsKggggggK....","....KllllllK....","KKKKlllllllK....","KllllllLLllK....","KlLLLLLLLLLK....","KKKKKKKKKKK....."];
  P.spr(hu,{K:'#141014',h:'#5a3a24',s:'#d8a888',S:'#a07060',g:'#4a6a3a',G:'#344e2a',l:'#5a4a3a',L:'#3a2e24'},96,56);
  // the bolt in his leg and a little blood
  P.line(101,64,106,68,'#8a6a3a');P.px(100,63,'#d8dce0');P.px(101,63,'#d8dce0');P.px(106,69,'#a02020');P.px(105,70,'#a02020');P.px(107,70,'#7a1414');
  // dropped bow
  P.curve(76,78,86,70,96,80,'#8a5a2a');P.line(76,78,96,80,'#d8d0b8');
}, anim(P,ox,oy,t){
  // wind in the heather
  for(let i=0;i<24;i++){const x=ox+((i*37)%ILW),y=oy+86+((i*13)%10);const s=Math.round(Math.sin(t*2.5+i*.7)*1.5);P.px(x+s,y-3,'#c080b0');P.px(x+Math.round(s/2),y-2,'#8a4a8a');P.px(x,y-1,'#6a3a6a');}
  // crows circling
  for(let i=0;i<3;i++){const a=t*.6+i*2.1;const x=ox+124+Math.cos(a)*(18+i*4),y=oy+20+Math.sin(a)*6;const w=Math.floor(t*5+i)%2;P.px(x-2,y-w,'#140c10');P.px(x-1,y,'#140c10');P.px(x,y,'#140c10');P.px(x+1,y,'#140c10');P.px(x+2,y-w,'#140c10');}
}},
/* ---------------- Shapes in the Mist ---------------- */
mist:{seed:79,paint(P,r){
  P.grad(0,0,ILW,ILH,['#8a9496','#9aa4a4','#a8b0ae','#8a928e','#5e6662']);
  P.hills(40,3,.05,1,'#7a8480');
  for(let i=0;i<8;i++){const x=10+i*22+Math.floor(r()*8);P.rect(x,26,2,24,'#6e7874');P.ell(x+1,26,6,8,'#727c78');}
  P.grad(0,58,ILW,38,['#6a726e','#4e5652','#3a403c']);
  P.poly([[78,50],[98,50],[150,96],[26,96]],'#7a7a70');P.poly([[82,50],[94,50],[132,96],[44,96]],'#8a8a7e');
  P.speck(26,56,124,40,120,['#6a6a60','#9a9a8e','#5a5a52'],r);
  // spearmen in the fog, fading with distance
  const man=["..KK..","..KK..",".KKKK.","KKKKKK","KKKKKK",".KKKK.",".KKKK.",".KKKK.",".K..K.",".K..K.",".K..K."];
  for(const[x,y,c,s]of[[60,40,'#5e6864',1],[74,42,'#566060',1],[104,41,'#5a6462',1],[118,39,'#626c68',1],[88,46,'#3e4644',2],[134,48,'#444c4a',2]]){
    if(s===1){P.spr(man,{K:c},x,y);P.line(x+6,y-8,x+6,y+10,c);P.px(x+6,y-9,'#c8d0d0');}
    else{const near=["....KKK.....","...KKKKK....","...KKKKK....","....KKK.....","..KKKKKKK...",".KKKKKKKKKK.","KKKKKKKKKKKK","KKKKKKKKKKKK","KKKKKKKKKKK.",".KKKKKKKKK..",".KKKKKKKKK..","..KKKKKKK...","..KKKKKKK...","..KKKKKKK...","..KKK.KKK...","..KKK.KKK...","..KK...KK...","..KK...KK...",".KKK...KKK.."];
      P.spr(near,{K:c},x,y);P.ell(x+2,y+9,4,5,c);P.line(x+10,y-12,x+10,y+18,c);P.line(x+11,y-12,x+11,y+18,c);P.px(x+10,y-13,'#dfe6e6');P.px(x+11,y-14,'#dfe6e6');P.px(x+10,y-14,'#dfe6e6');}
  }
}, anim(P,ox,oy,t){
  drawMist(P,ox,oy,t,30,50,'rgba(220,226,224,.16)',5,6);
  drawMist(P,ox,oy,t*1.4+30,60,34,'rgba(200,206,204,.14)',7,4);
  for(const[x,y,i]of[[92,48,0],[138,50,1]]){if(Math.sin(t*1.5+i*3)>.6){P.px(ox+x,oy+y,'#ffe0a0');P.px(ox+x+2,oy+y,'#ffe0a0');}}
}},
/* ---------------- The merchant's wagon ---------------- */
merchant:{seed:103,paint(P,r){
  P.grad(0,0,ILW,58,['#2a2248','#5a3a5a','#a0584e','#e08a50','#f4c070']);
  P.hills(42,4,.05,1,'#4a3a4e');P.hills(50,3,.08,2,'#34283a');
  for(let i=0;i<10;i++){const x=i*19+Math.floor(r()*6);P.ell(x,50,7,9,'#221a2a');}
  P.grad(0,58,ILW,38,['#4a3a30','#3a2c24','#2a1e18']);
  P.speck(0,58,ILW,38,160,['#5a4636','#2e221a','#6a5440'],r);
  // wagon body
  P.rect(40,54,96,24,'#0e0a0a');P.rect(41,55,94,22,'#8a5a32');for(let x=44;x<134;x+=9)P.rect(x,55,1,22,'#5a3a1e');P.rect(41,55,94,2,'#aa7a44');
  // canvas cover
  P.poly([[38,56],[44,26],[132,26],[138,56]],'#0e0a0a');P.poly([[40,55],[46,28],[130,28],[136,55]],'#e8dcc0');
  for(let x=52;x<128;x+=14)P.poly([[x,28],[x+6,28],[x+4,55],[x-2,55]],'#c84a3a');
  P.rect(46,28,84,2,'#fff4e0');
  // open stall with shelves and goods
  P.rect(56,38,64,17,'#1a120c');P.rect(56,46,64,1,'#5a3a1e');P.rect(56,54,64,1,'#5a3a1e');
  const bottle=(x,y,c)=>{P.rect(x,y,3,5,'#0e0a0a');P.rect(x+1,y+1,1,3,c);P.px(x+1,y-1,'#8a6a4a');};
  [[60,'#e04040'],[66,'#4a8ae0'],[72,'#6ad04a'],[78,'#c080ff'],[84,'#f0c040']].forEach(([x,c])=>bottle(x,41,c));
  P.rect(92,41,8,4,'#e8dcc0');P.rect(92,41,8,1,'#fff4e0');P.rect(102,40,2,6,'#a8b0bc');P.px(102,39,'#ffffff');P.rect(107,42,6,4,'#c89030');P.px(109,43,'#fff0a0');
  [[62,'#a02020'],[70,'#3a6a2a'],[98,'#2a4a90']].forEach(([x,c])=>{P.rect(x,49,5,5,'#0e0a0a');P.rect(x+1,50,3,3,c);});
  P.rect(80,49,10,4,'#8a5a32');P.rect(80,49,10,1,'#c89050');
  // wheels
  for(const wx of[56,120]){P.ell(wx,78,9,9,'#0e0a0a');P.ell(wx,78,8,8,'#6a4424');P.ell(wx,78,4,4,'#3a2414');for(let a=0;a<8;a++)P.line(wx,78,wx+Math.cos(a*Math.PI/4)*7,78+Math.sin(a*Math.PI/4)*7,'#8a5a32');P.px(wx,78,'#c8a060');}
  // merchant with a wide hat, leaning on the counter
  const m=["...KKKKKK...","..KhhhhhhK..","KKhhhhhhhhKK","KhhhhhhhhhhK","..KssssssK..","..KsKssKsK..","..KssssssK..","...KsSSsK...","..KggggggK..",".KgGggggGgK.","KggGggggGggK"];
  P.spr(m,{K:'#141014',h:'#4a2a4a',s:'#d8a888',S:'#a07060',g:'#3a6a8a',G:'#2a4a6a'},148,44);
  P.rect(146,55,16,14,'#141014');P.rect(147,56,14,12,'#3a6a8a');P.rect(147,56,14,2,'#4a8aaa');
  P.line(150,69,150,80,'#141014');P.line(157,69,157,80,'#141014');
  // lantern post
  P.rect(30,34,2,46,'#3a2a1a');P.rect(26,34,10,2,'#3a2a1a');
}, anim(P,ox,oy,t){
  const f=.85+Math.sin(t*8)*.08+Math.sin(t*19)*.05;
  P.glow(ox+27,oy+42,Math.round(18*f),'255,200,110',.32);
  P.rect(ox+24,oy+36,6,8,'#0e0a0a');P.rect(ox+25,oy+37,4,6,f>.9?'#fff0a0':'#ffc850');
  // coins glinting on the counter
  if(Math.floor(t*1.5)%4===0)P.px(ox+109,oy+42,'#ffffff');
  // merchant's head bob
  const b=Math.floor(t*1.5)%2;P.rect(ox+152,oy+49+b,1,1,'#141014');P.rect(ox+157,oy+49+b,1,1,'#141014');
  for(let i=0;i<6;i++){const x=ox+10+((i*29+t*5)%160),y=oy+62+Math.sin(t*1.2+i*2)*10;if(Math.sin(t*3+i*1.3)>.3)P.px(x,y,'#f8f0a0');}
}},
/* ---------------- The Whispering Well ---------------- */
well:{seed:91,paint(P,r){
  P.grad(0,0,ILW,70,['#06081a','#0e1230','#1a2044','#262a50']);
  P.speck(0,0,ILW,56,60,['#6a70a0','#9aa0d0','#4a5080'],r);
  P.glow(140,18,14,'200,210,255',.18);P.ell(140,18,7,7,'#e8ecff');P.ell(142,16,6,6,'#0e1230');
  P.hills(62,3,.06,1,'#141a30');
  P.grad(0,66,ILW,30,['#1e2438','#161a2c','#0e1020']);
  for(let i=0;i<120;i++){const x=Math.floor(r()*ILW),y=66+Math.floor(r()*30);P.px(x,y,'#3a4058');if(r()<.4)P.px(x,y-1,'#4a5068');}
  // the well
  P.ell(88,62,22,6,'#0e0a0c');P.rect(66,62,44,22,'#0e0a0c');P.ell(88,84,22,6,'#0e0a0c');
  P.rect(67,62,42,22,'#4a4e5e');P.ell(88,84,21,5,'#4a4e5e');
  for(let y=64;y<86;y+=5){const off=(y/5)%2?5:0;for(let x=67+off;x<109;x+=10)P.rect(x,y,1,4,'#2e3240');P.rect(67,y+4,42,1,'#2e3240');}
  P.ell(88,62,21,5,'#5e6272');P.ell(88,62,17,3,'#06060c');
  // roof frame and rope
  P.rect(68,32,3,30,'#3a2a1e');P.rect(105,32,3,30,'#3a2a1e');P.poly([[62,34],[88,20],[114,34],[110,36],[88,25],[66,36]],'#4a3424');
  P.rect(70,40,38,2,'#5a4430');P.line(88,42,88,58,'#8a7050');P.rect(85,54,6,5,'#5a4430');P.rect(85,54,6,1,'#7a6040');
}, anim(P,ox,oy,t){
  for(let i=0;i<4;i++){const ph=(t*.18+i*.25)%1;for(let k=0;k<14;k++){const q=ph+k*.018;if(q>1)continue;const y=oy+62-q*56,x=ox+88+Math.sin(q*9+i*1.6+t)*(4+q*14);P.px(x,y,q<.5?'rgba(170,255,220,.55)':'rgba(150,200,255,.35)');}}
  P.glow(ox+88,oy+62,12,'120,255,200',.12+.06*Math.sin(t*3));
  for(let i=0;i<8;i++){const x=ox+((i*53)%ILW),y=oy+((i*31)%50);if(Math.sin(t*2+i*2.3)>.8)P.px(x,y,'#ffffff');}
}},
};
