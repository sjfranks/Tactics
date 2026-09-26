'use strict';
/* =====================================================================
   EMBERWATCH — battle terrain
   Painted straight into device pixels (64 per portrait tile, 32 per landscape tile) so the ground carries the
   same fine detail as the sprites: blades of grass, flowers, worn dirt, pebbles, banks, cliffs and brambles.
   ===================================================================== */
const RGB=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];};
const TERR=[
  {name:'greenmarch',
   ground:['#2f5621','#386428','#41722d','#4b8032','#588e38'],
   blade:['#23431a','#33602a','#4d8634','#6ca443','#94c95a'],
   dirt:['#3e2b1c','#553b26','#684a30','#7b5a3b','#8e6c49'],dirtT:.66,
   pebble:['#5c584c','#858170','#aaa692','#cfcbb6'],
   flowers:[['#f4f1e6','#f0cc48'],['#f2cf48','#c07a1c'],['#ea7aa2','#fff0a0'],['#8ea8f2','#f8f0b0'],['#f4f1e6','#e89030']],
   bush:['#16300f','#21441a','#2f5a22','#40742c','#578e38','#78ac4a'],berry:['#8a1824','#d23c48','#ff9a9a'],
   cliff:['#211f1b','#34312a','#48443a','#5e594c','#77715f','#948d78'],
   water:['#12304e','#18406a','#1f5080','#2a6394','#3a7aa8','#5a9cc4'],foam:'#d6ecf6',
   grid:'#10200a',lift:.1},
  {name:'hollow',
   ground:['#22281f','#2a3126','#323a2d','#3b4535','#45503d'],
   blade:['#1b2017','#323c2a','#48533a','#62694a','#848a64'],
   dirt:['#231d19','#2e2620','#3a3029','#463a31','#52463b'],dirtT:.63,
   pebble:['#44443c','#66665a','#88887a','#aaa898'],
   flowers:[['#a888c4','#e6d6f6'],['#d8d2bc','#8a8474'],['#7aa0a0','#d0f0e8']],
   bush:['#15130f','#221e18','#302a22','#3e362c','#524838','#6a5e48'],berry:['#3a1830','#7a3a6a','#c080b0'],
   bone:['#6e6856','#9a937c','#c4bda4','#e4ddc6'],
   cliff:['#161613','#22221d','#2f2f28','#3e3e35','#4f4f44','#646456'],
   water:['#0c1614','#112120','#172c29','#1f3833','#2c4a42','#44665a'],foam:'#8fb4a4',
   grid:'#090c07',lift:.12},
  {name:'ashlands',
   ground:['#1e1614','#261c19','#2f231f','#392a25','#43322b'],
   dirt:['#2e2826','#3b3431','#48403c','#564d48','#655b55'],dirtT:.62,
   pebble:['#241a16','#3e2e27','#5a443a','#76594b'],
   cliff:['#140d0b','#1f1511','#2b1d17','#38261e','#473027','#583c31'],
   lava:['#3a0c04','#6a1606','#a8300a','#e05a10','#ff9a28','#ffd060','#fff4c0'],
   grid:'#0a0605',lift:.1},
].map(p=>{const o={};for(const k in p){const v=p[k];o[k]=typeof v==='string'&&v[0]==='#'?RGB(v):Array.isArray(v)?v.map(e=>typeof e==='string'?RGB(e):Array.isArray(e)?e.map(RGB):e):v;}return o;});
function noise2(seed){
  const R=mulberry(seed),N=32,Gd=new Float32Array(N*N);for(let i=0;i<N*N;i++)Gd[i]=R();
  const at=(i,j)=>Gd[(j&31)*32+(i&31)],s=t=>t*t*(3-2*t);
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=s(x-xi),v=s(y-yi);const a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
}
const fbm=(n,x,y)=>n(x,y)*.55+n(x*2.03+17.1,y*2.03+5.7)*.3+n(x*4.1+3.3,y*4.1+11.9)*.15;
const hash2=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);h=Math.imul(h^h>>>13,1274126177);return ((h^h>>>16)>>>0)/4294967296;};
function buildTerrain(){
  const T=TS*RES,S=T/64,W=COLS*T,H=ROWS*T;
  const c=document.createElement('canvas');c.width=W;c.height=H;c._s=RES;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const act=G.act,P=TERR[act];const seed=G.enc.f*991+act*7+(G.enc.title||'').length*13;const r=mulberry(seed);
  const rn=n=>Math.floor(r()*n),rr=(a,b)=>a+r()*(b-a);
  const im=g.createImageData(W,H),D=im.data;
  const put=(x,y,col,a)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4;
    if(a===undefined||a>=1){D[i]=col[0];D[i+1]=col[1];D[i+2]=col[2];}else{D[i]+=(col[0]-D[i])*a;D[i+1]+=(col[1]-D[i+1])*a;D[i+2]+=(col[2]-D[i+2])*a;}D[i+3]=255;};
  const mulPx=(x,y,f,add)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4;D[i]=D[i]*f+(add||0);D[i+1]=D[i+1]*f+(add||0);D[i+2]=D[i+2]*f+(add||0)*.7;};
  const ter=(x,y)=>inB(x,y)?G.tiles[K(x,y)].ter:'edge';
  const tileTer=(px,py)=>ter(Math.floor(px/T),Math.floor(py/T));
  const Z=Math.max(1,Math.round(S)),bay=(x,y)=>BAYER[(y&3)*4+(x&3)]/16-.47;
  const n1=noise2(seed+1),n2=noise2(seed+2),n3=noise2(seed+3);
  const kind=new Uint8Array(W*H);// 0 ground · 1 dirt · 2 water · 3 cliff face · 4 lava crack
  /* ---- 1. ground and worn dirt ---- */
  const GR=P.ground,DR=P.dirt,nG=GR.length;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const u=x/T,v=y/T,b=bay(x,y);
    const d=fbm(n2,u*.85+3.1,v*.85+7.3);
    if(d>P.dirtT+b*.012){kind[y*W+x]=1;
      const rim=d<P.dirtT+.018;const t=fbm(n3,u*3.2,v*3.2)+b*.16;
      put(x,y,rim?DR[1]:DR[Math.max(1,Math.min(4,1+Math.floor((t-.28)*6.5)))]);}
    else{const gv=fbm(n1,u*1.25,v*1.25)+b*.1+(hash2(x,y)-.5)*.05;put(x,y,GR[Math.max(0,Math.min(nG-1,Math.floor((gv-.26)/.48*nG)))]);}
  }
  // speckle the dirt with grit
  for(let i=0;i<W*H/28;i++){const x=rn(W),y=rn(H);if(kind[y*W+x]!==1)continue;put(x,y,r()<.5?DR[0]:DR[4],.7);}
  /* ---- 2. the ashlands: glowing cracks and cinders instead of grass ---- */
  if(P.lava){
    const L=P.lava;
    for(let i=0;i<COLS*ROWS*1.3;i++){let x=rn(W),y=rn(H),a=r()*Math.PI*2;const n=Math.round(rr(14,40)*S);
      for(let j=0;j<n;j++){a+=rr(-.6,.6);x+=Math.cos(a)*Z;y+=Math.sin(a)*Z*.8;
        const hot=j>2&&j<n-3&&hash2(x*3,y*7)<.55;put(x,y,[18,9,7]);put(x+1,y,[34,20,16],.6);if(hot){put(x,y,L[j%3?2:3]);put(x,y-1,L[1],.5);if(hash2(x,y)<.25)put(x,y,L[4]);}
        if(r()<.06){const b2=a+rr(-1.4,1.4);let bx=x,by=y;for(let k=0;k<n/4;k++){bx+=Math.cos(b2)*Z;by+=Math.sin(b2)*Z;put(bx,by,[22,12,9]);}}}}
    for(let i=0;i<W*H/260;i++){const x=rn(W),y=rn(H);put(x,y,[150,140,132],.5);}
    for(let i=0;i<COLS*ROWS*2;i++){const x=rn(W),y=rn(H);put(x,y,L[4]);put(x+1,y,L[2],.8);put(x,y+1,L[1],.7);}
  }
  /* ---- 3. grass: clusters of shaded blades ---- */
  const blade=(x,y,h,lean,tone)=>{const R=P.blade;for(let i=0;i<h;i++){const f=h>1?i/(h-1):1;const k=Math.max(0,Math.min(4,Math.round(tone-1+f*2.2)));put(x+Math.round(lean*f*f*h*.45),y-i,R[k]);}};
  const grassAt=(x,y)=>kind[(y|0)*W+(x|0)]===0;
  if(P.blade){
    const tufts=[];
    const nT=Math.round(COLS*ROWS*(act===0?46:30));
    for(let i=0;i<nT;i++){const x=rn(W),y=rn(H);const dens=fbm(n1,x/T*2+9,y/T*2+4);if(r()>dens*1.4)continue;
      const k=kind[y*W+x];if(k===1&&r()<.85)continue;tufts.push({x,y,dens});}
    tufts.sort((a,b)=>a.y-b.y);
    for(const t of tufts){const n=2+rn(4),tall=t.dens>.55?1.3:1;const base=1+(t.dens>.5?1:0)+(r()<.3?1:0);
      for(let j=0;j<n;j++){const bx=t.x+Math.round(rr(-3,3)*S),by=t.y+Math.round(rr(-1,1.5)*S);if(!grassAt(bx,by)&&r()<.7)continue;
        blade(bx,by,Math.max(2,Math.round(rr(3,7)*S*tall)),rr(-1,1),base+(r()<.25?1:0));}}
    // lone light blades for sparkle
    for(let i=0;i<W*H/140;i++){const x=rn(W),y=rn(H);if(grassAt(x,y))blade(x,y,Math.max(2,Math.round(rr(2,4)*S)),rr(-1,1),3);}
  }
  /* ---- 4. flowers and pebbles ---- */
  if(P.flowers){
    const patches=Math.round(COLS*ROWS*(act===0?.9:.35));
    for(let i=0;i<patches;i++){const cx=rn(W),cy=rn(H);const F=P.flowers[rn(P.flowers.length)];const n=1+rn(act===0?6:3);
      for(let j=0;j<n;j++){const x=cx+Math.round(rr(-8,8)*S),y=cy+Math.round(rr(-5,5)*S);if(!grassAt(x,y))continue;
        put(x,y+Z,P.blade[1]);put(x,y+2*Z,P.blade[1]);
        if(S>=1&&r()<.7){put(x,y,F[1]);put(x-1,y,F[0]);put(x+1,y,F[0]);put(x,y-1,F[0]);put(x,y+1,F[0]);put(x+1,y+1,F[0],.45);put(x-1,y-1,F[0],.35);}
        else put(x,y,F[0]);}}
  }
  const pebble=(x,y,w,h)=>{const PB=P.pebble;
    for(let yy=-h;yy<=h+1;yy++)for(let xx=-w-1;xx<=w+1;xx++){const e=(xx*xx)/(w*w)+((yy-1)*(yy-1))/(h*h);if(e<=1)put(x+xx,y+yy+1,[0,0,0],.28);}
    for(let yy=-h;yy<=h;yy++)for(let xx=-w;xx<=w;xx++){const e=(xx*xx)/(w*w)+(yy*yy)/(h*h);if(e>1)continue;
      const l=-(xx/w)*.5-(yy/h)*.75;put(x+xx,y+yy,PB[e>.72?(l>.2?1:0):l>.45?3:l>-.1?2:1]);}};
  for(let i=0;i<COLS*ROWS*(act===2?2.2:1.2);i++){const x=rn(W),y=rn(H);const onDirt=kind[y*W+x]===1;if(!onDirt&&r()<.6)continue;
    pebble(x,y,Math.max(1,Math.round(rr(1.4,3.4)*S)),Math.max(1,Math.round(rr(1,2.2)*S)));}
  /* ---- 5. water (or nothing, in the ashlands): a pixel mask with rounded shores, an earthen bank on the far side,
     then depth from a distance field so ponds shade from foam to shallows to deep ---- */
  if(P.water){
    const wm=new Uint8Array(W*H),R=Math.round(12*S),WA=P.water;let any=false;
    const land=(x,y)=>{const t=ter(x,y);return t!=='water'&&t!=='edge';};
    for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){if(ter(tx,ty)!=='water')continue;any=true;
      const lN=land(tx,ty-1),lS=land(tx,ty+1),lW=land(tx-1,ty),lE=land(tx+1,ty);
      for(let y=0;y<T;y++)for(let x=0;x<T;x++){
        let d=1e9;if(lN)d=Math.min(d,y);if(lS)d=Math.min(d,T-1-y);if(lW)d=Math.min(d,x);if(lE)d=Math.min(d,T-1-x);
        const cx=x<R?R-x:x>T-1-R?x-(T-1-R):0,cy=y<R?R-y:y>T-1-R?y-(T-1-R):0;
        if(cx&&cy&&((x<R&&lW)||(x>=R&&lE))&&((y<R&&lN)||(y>=R&&lS)))d=Math.min(d,R-Math.hypot(cx,cy));
        const X0=tx*T+x,Y0=ty*T+y;const wob=n3(X0/T*5,Y0/T*5)*3*S;
        if(d>=wob)wm[Y0*W+X0]=1;}}
    if(any){
      const run=new Int16Array(W*H),bank=Math.round(8*S),sm=new Uint8Array(W*H);
      for(let x=0;x<W;x++){let k=999;for(let y=0;y<H;y++){const i=y*W+x;if(!wm[i]){k=0;continue;}k++;run[i]=k;if(k>bank)sm[i]=1;}}
      // chamfer distance from the shore (banks count as shore)
      const dt=new Float32Array(W*H);for(let i=0;i<W*H;i++)dt[i]=sm[i]?1e6:0;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!sm[i])continue;let v=dt[i];if(x>0)v=Math.min(v,dt[i-1]+1);if(y>0){v=Math.min(v,dt[i-W]+1);if(x>0)v=Math.min(v,dt[i-W-1]+1.41);if(x<W-1)v=Math.min(v,dt[i-W+1]+1.41);}dt[i]=v;}
      for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(!sm[i])continue;let v=dt[i];if(x<W-1)v=Math.min(v,dt[i+1]+1);if(y<H-1){v=Math.min(v,dt[i+W]+1);if(x<W-1)v=Math.min(v,dt[i+W+1]+1.41);if(x>0)v=Math.min(v,dt[i+W-1]+1.41);}dt[i]=v;}
      const CL=P.cliff;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!wm[i])continue;kind[i]=2;
        if(!sm[i]){const k=run[i]-1;const band=Math.floor((k+n2(x/T*6,y/T)*3)/(2.6*S))%2;
          put(x,y,CL[k<Z?4:k>=bank-Z?0:k>=bank-2*Z?1:band?3:2]);if(hash2(x,y>>2)<.06)put(x,y,CL[1]);continue;}
        const d=Math.min(dt[i],1e4)+(hash2(x,y)-.5)*.8;
        const band=d<3*S?4:d<8*S?3:d<15*S?2:d<26*S?1:0;const dith=bay(x,y)*.5;
        const e=d<3*S?d/(3*S):d<8*S?(d-3*S)/(5*S):d<15*S?(d-8*S)/(7*S):(d-15*S)/(11*S);
        put(x,y,WA[Math.max(0,band-(e+dith>.92&&band>0?1:0))]);
        if(run[i]<=bank+5*S)put(x,y,[0,0,0],.22*(1-(run[i]-bank)/(5*S)));
        if(d<1.3*S)put(x,y,P.foam,.9);else if(d<2.8*S&&hash2(x>>1,y)<.45)put(x,y,P.foam,.4);}
      // glints and, in the hollow, lily pads
      for(let i=0;i<COLS*ROWS*3;i++){const x=rn(W),y=rn(H);if(!sm[y*W+x]||dt[y*W+x]<4*S)continue;const l=Math.round(rr(3,10)*S);
        for(let j=0;j<l;j++)if(sm[y*W+x+j])put(x+j,y,WA[5],j===0||j===l-1?.35:.75);}
      if(act===1)for(let i=0;i<COLS*ROWS;i++){const x=rn(W),y=rn(H),rd=Math.round(rr(2.5,4)*S);if(!sm[y*W+x]||dt[y*W+x]<rd+2)continue;
        for(let yy=-rd;yy<=rd;yy++)for(let xx=-rd;xx<=rd;xx++){if(xx*xx+yy*yy*1.8>rd*rd)continue;if(xx>0&&Math.abs(yy)<=Math.floor(xx/2))continue;put(x+xx,y+yy,yy<0?[92,120,64]:[62,88,46]);}}
    }
  }
  /* ---- 6. brambles, bones or rubble ---- */
  const L3=[-.5,-.68,.53];
  const sphere=(cx,cy,rx,ry,ramp,tex,out)=>{const n=ramp.length;
    for(let yy=-ry-1;yy<=ry+1;yy++)for(let xx=-rx-1;xx<=rx+1;xx++){const e=(xx*xx)/(rx*rx)+(yy*yy)/(ry*ry);if(e>1){if(out&&e<1+2.4/Math.max(rx,ry))put(cx+xx,cy+yy,ramp[0]);continue;}
      const nx=xx/rx,ny=yy/ry,nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny));let l=nx*L3[0]+ny*L3[1]+nz*L3[2];l=l*.5+.5;
      if(tex)l+=(hash2(cx+xx,cy+yy)-.5)*tex;put(cx+xx,cy+yy,ramp[Math.max(0,Math.min(n-1,Math.floor(l*n+bay(cx+xx,cy+yy)*.6)))]);}};
  const shadowEll=(cx,cy,rx,ry,a)=>{for(let yy=-ry;yy<=ry;yy++)for(let xx=-rx;xx<=rx;xx++){const e=(xx*xx)/(rx*rx)+(yy*yy)/(ry*ry);if(e<=1)put(cx+xx,cy+yy,[0,0,0],a*(e<.55?1:.6));}};
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    if(ter(tx,ty)!=='rough')continue;const X=tx*T,Y=ty*T;
    if(act===0){
      const clumps=[];for(let i=0;i<3+rn(2);i++)clumps.push({x:X+Math.round(rr(14,50)*S),y:Y+Math.round(rr(16,52)*S),R:rr(8,12)*S});
      clumps.sort((a,b)=>a.y-b.y);
      for(const b of clumps){shadowEll(b.x+Z,Math.round(b.y+b.R*.55),Math.round(b.R*1.1),Math.round(b.R*.45),.4);}
      for(const b of clumps){const lobes=[];for(let j=0;j<5;j++){const a=j/5*Math.PI*2+rr(0,1);lobes.push({x:b.x+Math.cos(a)*b.R*.45,y:b.y+Math.sin(a)*b.R*.3-b.R*.1,r:b.R*rr(.45,.62)});}
        lobes.push({x:b.x,y:b.y-b.R*.25,r:b.R*.6});lobes.sort((a,c)=>a.y-c.y);
        for(const l of lobes)sphere(Math.round(l.x),Math.round(l.y),Math.round(l.r),Math.round(l.r*.85),P.bush,.5,true);
        for(let j=0;j<Math.round(14*S);j++){const x=Math.round(b.x+rr(-b.R*.8,b.R*.8)),y=Math.round(b.y+rr(-b.R*.8,b.R*.4));put(x,y,P.bush[5],.8);put(x+1,y+1,P.bush[1],.7);}
        for(let j=0;j<2+rn(3);j++){const x=Math.round(b.x+rr(-b.R*.6,b.R*.6)),y=Math.round(b.y+rr(-b.R*.6,b.R*.2));put(x,y,P.berry[1]);put(x+1,y,P.berry[0]);put(x,y+1,P.berry[0]);put(x+1,y+1,P.berry[0]);if(S>=1)put(x,y,P.berry[2]);}
        for(let j=0;j<3;j++){const a=rr(0,Math.PI*2),x0=b.x+Math.cos(a)*b.R*.95,y0=b.y+Math.sin(a)*b.R*.7;for(let k=0;k<3*Z;k++)put(x0+Math.cos(a)*k,y0+Math.sin(a)*k,[90,64,32]);}}
    }else if(act===1){
      for(let y=0;y<T;y++)for(let x=0;x<T;x++){const e=Math.hypot(x-T/2,(y-T/2)*1.2)/(T*.46)+(n3((X+x)/T*4,(Y+y)/T*4)-.5)*.5;if(e<1){put(X+x,Y+y,P.dirt[e>.85?1:2+(hash2(X+x,Y+y)<.2?1:0)]);kind[(Y+y)*W+X+x]=1;}}
      const BN=P.bone;
      for(let i=0;i<2+rn(2);i++){const x0=X+rr(12,44)*S,y0=Y+rr(14,50)*S,a=rr(-.5,.5)+(r()<.5?0:Math.PI/2),len=rr(8,13)*S;const dx=Math.cos(a),dy=Math.sin(a);
        for(let k=0;k<=len;k++){const x=Math.round(x0+dx*k),y=Math.round(y0+dy*k);put(x,y+Z,[0,0,0],.35);put(x,y,BN[2]);put(x,y-1,BN[3]);if(Z>1)put(x,y+1,BN[1]);}
        for(const e of[0,len]){const ex=Math.round(x0+dx*e),ey=Math.round(y0+dy*e);sphere(ex-Math.round(dy*1.4*S),ey+Math.round(dx*1.4*S)-1,Math.max(1,Math.round(1.6*S)),Math.max(1,Math.round(1.4*S)),BN,0,false);sphere(ex+Math.round(dy*1.4*S),ey-Math.round(dx*1.4*S)-1,Math.max(1,Math.round(1.6*S)),Math.max(1,Math.round(1.4*S)),BN,0,false);}}
      if(r()<.7){const sx=X+Math.round(rr(18,44)*S),sy=Y+Math.round(rr(18,44)*S),rx=Math.round(5*S),ry=Math.round(4.4*S);shadowEll(sx+Z,sy+ry,rx+Z,Math.round(2*S),.4);
        sphere(sx,sy,rx,ry,BN,.15,true);for(let xx=-Math.round(3*S);xx<=Math.round(3*S);xx++)for(let yy=0;yy<=Math.round(2.4*S);yy++)put(sx+xx,sy+ry+yy-Z,BN[yy>=Math.round(2*S)?0:1+(xx&1)]);
        const ex=Math.round(2*S),ey=Math.round(.5*S);for(const s of[-1,1])for(let yy=0;yy<Math.max(1,Math.round(2*S));yy++)for(let xx=0;xx<Math.max(1,Math.round(2*S));xx++)put(sx+s*ex+(s<0?-xx:xx-Z+1)+(s<0?Z-1:0),sy+ey+yy,[24,20,16]);
        put(sx,sy+Math.round(2.4*S),[40,34,28]);}
      for(let i=0;i<6;i++){const x=X+rn(T),y=Y+rn(T);blade(x,y,Math.max(2,Math.round(rr(3,6)*S)),rr(-1.5,1.5),2);}
    }else{
      const rocks=[];for(let i=0;i<3+rn(3);i++)rocks.push({x:X+Math.round(rr(10,54)*S),y:Y+Math.round(rr(12,54)*S),rx:Math.round(rr(3,7)*S),ry:Math.round(rr(2.4,5)*S)});
      rocks.sort((a,b)=>a.y-b.y);
      for(const k of rocks){shadowEll(k.x+Z,k.y+k.ry,k.rx+Z,Math.max(1,Math.round(k.ry*.5)),.45);sphere(k.x,k.y,Math.max(1,k.rx),Math.max(1,k.ry),P.cliff.slice(1),.35,true);
        const kx=k.x-Math.round(k.rx*.3),ky=k.y-Math.round(k.ry*.2);put(kx,ky,P.cliff[5]);put(kx+1,ky,P.cliff[4]);
        if(r()<.5){for(let j=0;j<k.rx;j++)put(k.x-Math.round(k.rx*.3)+j,k.y+Math.round(k.ry*.2)+(j>>1),P.lava[3],j%3?.8:.4);}}
    }
  }
  /* ---- 7. raised ground: lifted top, lit rim, cliff face and the shadow it throws ---- */
  const ch=Math.round(15*S);
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    if(ter(tx,ty)!=='high')continue;const X=tx*T,Y=ty*T;
    const up=ter(tx,ty-1)==='high',dn=ter(tx,ty+1)==='high',lf=ter(tx-1,ty)==='high',rt=ter(tx+1,ty)==='high';
    const lim=dn?T:T-ch;
    for(let y=0;y<lim;y++)for(let x=0;x<T;x++)mulPx(X+x,Y+y,1+P.lift,6);
    if(!up)for(let x=0;x<T;x++){put(X+x,Y,[255,250,215],.34);put(X+x,Y+1,[255,250,215],.16);}
    if(!lf)for(let y=0;y<lim;y++){put(X,Y+y,[255,250,215],.22);}
    if(!rt)for(let y=0;y<lim;y++){put(X+T-1,Y+y,[0,0,0],.32);put(X+T-2,Y+y,[0,0,0],.15);}
    if(!dn){const CL=P.cliff,cy=Y+T-ch;
      // the face is a row of weathered rock columns, each lit from the left
      let x=X;while(x<X+T){const w=Math.max(3,Math.round(rr(4,10)*S)),crack=Math.round(rr(ch*.35,ch*.8));
        for(let xx=0;xx<w&&x+xx<X+T;xx++){const f=xx/(w-1||1);
          for(let y=0;y<ch;y++){const X0=x+xx,Y0=cy+y;kind[Y0*W+X0]=3;
            let k=f<.25?4:f<.7?3:2;if(hash2(X0,Y0>>1)<.1)k--;if(y===crack&&f>.2&&f<.9)k=1;
            if(xx===w-1)k=0;if(y<Z)k=5;else if(y<2*Z)k=Math.min(k,2);if(y>=ch-Z)k=0;else if(y>=ch-2*Z)k=Math.min(k,1);
            if(xx===0&&!lf&&x===X)k=Math.min(5,k+1);
            put(X0,Y0,CL[Math.max(0,Math.min(5,k))]);}}
        x+=w;}
      if(P.blade)for(let x=X;x<X+T;x+=1+rn(2)){const n=rn(Math.round(5*S)+1);for(let j=0;j<n;j++)put(x,cy+Z+j,P.blade[j<1?3:2]);}
      else for(let x=X;x<X+T;x++)put(x,cy-1,CL[5],.5);
      if(inB(tx,ty+1))for(let y=0;y<Math.round(10*S);y++){const a=.45*(1-y/(10*S));for(let x=0;x<T;x++)put(X+x,Y+T+y,[0,0,0],a);}
    }
  }
  /* ---- 8. grid: a dark seam with a faint lit edge, so squares read without fighting the art ---- */
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){const X=tx*T,Y=ty*T;
    for(let i=0;i<T;i++){put(X+i,Y,P.grid,.34);put(X,Y+i,P.grid,.34);put(X+i,Y+Z,[255,255,230],.05);put(X+Z,Y+i,[255,255,230],.05);}}
  g.putImageData(im,0,0);
  /* ---- 9. obstacles, each grounded with a soft shadow and a few blades in front ---- */
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
    const t=G.tiles[K(tx,ty)];if(!t.ob)continue;const X=tx*T,Y=ty*T;
    g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(X+T/2+2*S,Y+T*.86,T*.36,T*.1,0,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(X+T/2+S,Y+T*.86,T*.28,T*.07,0,0,Math.PI*2);g.fill();
    const Sp=sprH(t.ob);g.drawImage((t.v||0)%2?Sp.f:Sp.c,X,Y,T,T);
    if(P.blade)for(let i=0;i<Math.round(7*S);i++){const bx=X+Math.round(rr(12,52)*S),by=Y+Math.round(rr(56,62)*S);const h=Math.max(2,Math.round(rr(2,5)*S));
      for(let j=0;j<h;j++){const col=P.blade[Math.min(4,1+Math.round(j/h*2.4))];g.fillStyle=`rgb(${col})`;g.fillRect(bx,by-j,1,1);}}
  }
  const vg=g.createRadialGradient(W/2,H/2,W*.38,W/2,H/2,Math.max(W,H)*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.32)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  return c;
}
