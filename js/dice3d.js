'use strict';
/* =====================================================================
   EMBERWATCH — the damage dice, rolled in 3D.
   three.js renders each die into a tiny offscreen canvas (a few dozen pixels), which is copied into the
   pixel-art canvas, so the dice stay crisp and chunky like everything else. Without WebGL or three.js the
   dice are drawn flat. Only heroes' attacks are shown; the engine calls H.dice before damage lands.
   ===================================================================== */
const DICE3D={ok:null,r:null,scene:null,cam:null,geo:{},px:28};
const DIE_COL={fighter:'#8fb4ff',rogue:'#5fe08a',wizard:'#c08aff',cleric:'#ffe08a'};
function dice3dInit(){
  if(DICE3D.ok!==null)return DICE3D.ok;
  try{
    if(!window.THREE)return false;   // not loaded yet: try again next roll
    const c=document.createElement('canvas');
    const r=new THREE.WebGLRenderer({canvas:c,antialias:false,alpha:true,preserveDrawingBuffer:true});
    r.setPixelRatio(1);r.setSize(DICE3D.px,DICE3D.px,false);r.setClearColor(0x000000,0);
    const scene=new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff,.6));
    const L=new THREE.DirectionalLight(0xffffff,.9);L.position.set(-1.2,2,2.5);scene.add(L);
    const cam=new THREE.OrthographicCamera(-1.35,1.35,1.35,-1.35,.1,10);cam.position.set(0,0,4);cam.lookAt(0,0,0);
    Object.assign(DICE3D,{ok:true,r,scene,cam});
  }catch(e){DICE3D.ok=false;}
  return DICE3D.ok;
}
/* d10: a pentagonal trapezohedron (two apexes, a zig-zag ring of ten). */
function d10Geo(){
  const T=[0,0,1.05],Bt=[0,0,-1.05],ring=[];
  for(let i=0;i<10;i++){const a=i*Math.PI/5;ring.push([Math.cos(a),Math.sin(a),i%2?-.12:.12]);}
  const pos=[];const tri=(a,b,c)=>pos.push(...a,...b,...c);
  for(let k=0;k<5;k++){const i=2*k;
    tri(T,ring[i],ring[(i+1)%10]);tri(T,ring[(i+1)%10],ring[(i+2)%10]);
    tri(Bt,ring[(i+2)%10],ring[(i+1)%10]);tri(Bt,ring[(i+3)%10],ring[(i+2)%10]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
function dieGeo(s){
  if(DICE3D.geo[s])return DICE3D.geo[s];
  const g=s===4?new THREE.TetrahedronGeometry(1.25):s===6?new THREE.BoxGeometry(1.35,1.35,1.35):s===8?new THREE.OctahedronGeometry(1.2):
    s===10?d10Geo():new THREE.DodecahedronGeometry(1.15);
  return DICE3D.geo[s]={g,edges:new THREE.EdgesGeometry(g)};
}
/* Draw one die at board position (x,y), tumbling while spin>0. */
function drawDie3d(s,col,rot,x,y,glow){
  const G3=dieGeo(s);
  const mesh=new THREE.Mesh(G3.g,new THREE.MeshPhongMaterial({color:new THREE.Color(col),flatShading:true,shininess:18,side:THREE.DoubleSide}));
  const line=new THREE.LineSegments(G3.edges,new THREE.LineBasicMaterial({color:0x140c08}));
  const grp=new THREE.Group();grp.add(mesh);grp.add(line);grp.rotation.set(rot.x,rot.y,rot.z);
  DICE3D.scene.add(grp);DICE3D.r.render(DICE3D.scene,DICE3D.cam);DICE3D.scene.remove(grp);
  mesh.material.dispose();line.material.dispose();
  const P=DICE3D.px;
  ctx.drawImage(DICE3D.r.domElement,Math.round(x-P/2),Math.round(y-P/2));
}
/* Flat fallback: a chunky square die. */
function drawDie2d(s,col,t,x,y,glow){
  const P=16,j=Math.round(Math.sin(t*20)*2);
  rect(x-P/2-1,y-P/2-1+j,P+2,P+2,C.edge);rect(x-P/2,y-P/2+j,P,P,glow?'#ffd040':col);rect(x-P/2,y-P/2+j,P,2,'rgba(255,255,255,.35)');
}
/* Animate the dice of one attack roll above the target: the primary die (and any advantage re-rolls, the
   dropped ones dimmed), the other dice, then each exploding die in turn. Resolves when they have landed. */
function rollDiceFx(u,t,r){
  const use3d=dice3dInit();
  const col=DIE_COL[u.cls]||'#c8c0b0';
  const dice=[];const keep=r.stag?-1:r.tries.indexOf(r.prim);
  r.tries.forEach((v,i)=>dice.push({v,prim:i===keep,dim:i!==keep}));
  if(r.stag)dice.push({v:r.prim,prim:true});   // a staggered foe: the die simply shows the top number
  for(const v of r.rest)dice.push({v});
  const boom=r.boom.map(v=>({v,boom:true}));
  const all=dice.concat(boom);
  const P=use3d?DICE3D.px:16,gap=P+2,n=all.length;
  const c=tc(t);const cx=clamp(tc(t).x,BX+(n*gap)/2+4,BX+COLS*TS-(n*gap)/2-4),cy=Math.max(BY+P/2+12,c.y-TS*SZ(t)/2-P/2-14);
  const T0=NOW,roll=420*spd(),step=260*spd();
  all.forEach((d,i)=>{d.t0=T0+(d.boom?roll+(i-dice.length)*step+step:0);d.rot={x:Math.random()*6,y:Math.random()*6,z:Math.random()*6};d.w={x:8+Math.random()*6,y:7+Math.random()*6,z:3+Math.random()*4};});
  const crit=r.res===3;let sounded=0;
  const end=all.length?all[all.length-1].t0+roll+380*spd():T0;
  return new Promise(res=>{
    fx({dur:(end-T0)/spd()+900,done:res,draw(p){
      const now=NOW;const hold=end+450*spd();const fade=now>hold?Math.max(0,1-(now-hold)/(400*spd())):1;
      // the dice tray: a dark plate the dice land on, so they read against any ground
      const shown=all.filter(d=>now>=d.t0).length;const tw=Math.max(1,shown)*gap+8,th=P+22;
      ctx.globalAlpha=fade*.88;rect(cx-tw/2,cy-P/2-12,tw,th,'#140d09');ctx.globalAlpha=fade;frame(cx-tw/2,cy-P/2-12,tw,th,crit&&now>=T0+roll?'#f0c050':C.rim);ctx.globalAlpha=1;
      for(let i=0;i<all.length;i++){const d=all[i];if(now<d.t0)continue;
        const q=Math.min(1,(now-d.t0)/roll);const e=1-Math.pow(1-q,3);
        if(q<1&&d.boom&&!d.snd){d.snd=1;sfx('gem');}
        const x=cx-(shown-1)*gap/2+i*gap,y=cy-Math.round((1-e)*8)+(q<1?Math.round(Math.abs(Math.sin(q*9))*(1-q)*3):0);
        const k=(1-e);const rot={x:d.rot.x+d.w.x*k,y:d.rot.y+d.w.y*k,z:d.rot.z+d.w.z*k};
        const glow=q>=1&&(d.boom||d.prim&&crit);
        ctx.globalAlpha=fade*(d.dim&&q>=1?.45:1);
        if(use3d)drawDie3d(r.d.s,d.boom||(d.prim&&crit&&q>=1)?'#f0c050':col,rot,x,y,glow&&fade>.5);else drawDie2d(r.d.s,col,1-q,x,y,glow);
        if(q>=1){text(String(d.v),x,cy+P/2-1,d.dim?'#8a8070':glow?'#ffe070':C.white,{al:'c',ol:C.edge});}
        if(d.boom&&q>=1)text('+',x-gap/2,cy+P/2-1,'#ffd040',{al:'c',ol:C.edge});
        ctx.globalAlpha=1;}
      if(!sounded&&now>=T0){sounded=1;sfx('dice');}
      ctx.globalAlpha=fade;
      if(now>=T0+roll)text(crit?(r.stag?'STAGGERED: CRIT!':'CRIT! EXPLODES'):r.res===1?'GRAZE':'= '+r.total,cx,cy-P/2-9,crit?'#ffe070':r.res===1?'#c8b8a0':C.parch,{al:'c',ol:C.edge});
      else text(diceText(r.d),cx,cy-P/2-9,C.mute,{al:'c',ol:C.edge});
      if(crit&&now>=end-380*spd())text('= '+r.total,cx+tw/2-3,cy-P/2-9,'#fff4c0',{al:'r',ol:C.edge});
      ctx.globalAlpha=1;
    }});
    // let play continue once the last die has landed; the dice fade out on their own
    setTimeout(res,Math.max(0,end-T0));
  });
}
H.dice=async(u,t,r)=>{if(AUTOPLAY||!r||u.side!=='hero'||!t||!t.id)return;try{await rollDiceFx(u,t,r);}catch(e){console.error(e);}};
