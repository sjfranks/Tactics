'use strict';
/* =====================================================================
   ROGUE TACTICS — the damage dice, thrown in 3D.
   Like the Dice Roller plugin for Obsidian: numbered dice (d4, d6, d8, d10, d12) are thrown onto the board with
   real physics (cannon.js) and drawn with three.js. The game has already rolled the numbers, so each throw is
   simulated first, then the die is renumbered so the face that ends up on top shows the rolled number, and
   the recorded tumble is played back. Without WebGL or the libraries, attacks simply skip the dice.
   ===================================================================== */
const DICE3D={ok:null,r:null,scene:null,cam:null,cv:null,W:10,D:13,shapes:{},busy:false,objs:[]};

/* ---------- die shapes: vertices, then faces found as the convex hull (planar polygons, outward winding) ---------- */
function dieVerts(s){
  const P=(1+Math.sqrt(5))/2;
  // a d2 is a coin: a thin sixteen-sided disc, 1 on one face and 2 on the other
  if(s===2){const v=[];for(let i=0;i<16;i++){const a=i*Math.PI/8;for(const y of[-.2,.2])v.push([Math.cos(a),y,Math.sin(a)]);}return v;}
  if(s===4)return [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
  if(s===6)return [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  if(s===8)return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  if(s===10){const v=[[0,1,0],[0,-1,0]];for(let i=0;i<10;i++){const a=i*Math.PI/5;v.push([Math.cos(a),i%2?-.1056:.1056,Math.sin(a)]);}return v;}
  const v=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])v.push([x,y,z]);
  for(const a of[-1,1])for(const b of[-1,1]){v.push([0,a/P,b*P]);v.push([a/P,b*P,0]);v.push([a*P,0,b/P]);}
  return v;
}
function hullFaces(V){
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const norm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
  const faces=[],seen=new Set();
  for(let i=0;i<V.length;i++)for(let j=i+1;j<V.length;j++)for(let k=j+1;k<V.length;k++){
    let n=cross(sub(V[j],V[i]),sub(V[k],V[i]));if(Math.hypot(...n)<1e-6)continue;n=norm(n);
    let d=dot(n,V[i]);if(d<0){n=n.map(x=>-x);d=-d;}
    if(V.some(p=>dot(n,p)>d+1e-4))continue;
    const on=V.map((p,q)=>Math.abs(dot(n,p)-d)<1e-4?q:-1).filter(q=>q>=0);const key=on.slice().sort((a,b)=>a-b).join(',');
    if(seen.has(key))continue;seen.add(key);
    const c=[0,0,0];on.forEach(q=>{c[0]+=V[q][0]/on.length;c[1]+=V[q][1]/on.length;c[2]+=V[q][2]/on.length;});
    const u=norm(sub(V[on[0]],c)),w=cross(n,u);
    on.sort((a,b)=>{const pa=sub(V[a],c),pb=sub(V[b],c);return Math.atan2(dot(pa,w),dot(pa,u))-Math.atan2(dot(pb,w),dot(pb,u));});
    // the face's true centre (its area centroid) so numbers sit in the middle of kite faces too
    let A=0;const ac=[0,0,0];for(let t=1;t+1<on.length;t++){const a=V[on[0]],b=V[on[t]],e=V[on[t+1]],ar=Math.hypot(...cross(sub(b,a),sub(e,a)))/2;A+=ar;for(let q=0;q<3;q++)ac[q]+=ar*(a[q]+b[q]+e[q])/3;}
    faces.push({v:on,n,c:A>0?ac.map(x=>x/A):c});
  }
  return faces;
}
/* One shape per die size: geometry with a material group and texture coordinates per face, and a physics hull. */
function dieShape(s,k){
  k=k||1;const key=s+'@'+k;if(DICE3D.shapes[key])return DICE3D.shapes[key];
  const sc={2:.9,4:.62,6:.46,8:.62,10:.6,12:.38}[s]*k;
  const V=dieVerts(s).map(p=>p.map(x=>x*sc));const F=hullFaces(V);
  const pos=[],uv=[],g=new THREE.BufferGeometry();let at=0;
  F.forEach((f,fi)=>{
    const c=f.c,u=[V[f.v[0]][0]-c[0],V[f.v[0]][1]-c[1],V[f.v[0]][2]-c[2]];const ul=Math.hypot(...u);const U=u.map(x=>x/ul);
    const W=[f.n[1]*U[2]-f.n[2]*U[1],f.n[2]*U[0]-f.n[0]*U[2],f.n[0]*U[1]-f.n[1]*U[0]];
    const R=Math.max(...f.v.map(q=>Math.hypot(V[q][0]-c[0],V[q][1]-c[1],V[q][2]-c[2])));
    const tuv=q=>{const p=[V[q][0]-c[0],V[q][1]-c[1],V[q][2]-c[2]];return [.5+.5*(p[0]*U[0]+p[1]*U[1]+p[2]*U[2])/R,.5+.5*(p[0]*W[0]+p[1]*W[1]+p[2]*W[2])/R];};
    f.uv=f.v.map(tuv);
    for(let t=1;t+1<f.v.length;t++)for(const q of[f.v[0],f.v[t],f.v[t+1]]){pos.push(...V[q]);uv.push(...tuv(q));}
    g.addGroup(at,3*(f.v.length-2),fi);at+=3*(f.v.length-2);
  });
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const hull=new CANNON.ConvexPolyhedron(V.map(p=>new CANNON.Vec3(...p)),F.map(f=>f.v.slice()));
  return DICE3D.shapes[key]={s,V,F,g,hull};
}
/* A face's picture: its number (or, on a d4, the numbers of its three corners, each read from that corner). */
function faceTex(S,fi,labels,col,ink){
  const N=128,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');
  g.fillStyle=col;g.fillRect(0,0,N,N);
  const draw=(txt,x,y,size,rot)=>{g.save();g.translate(x,y);g.rotate(rot);g.font=`bold ${size}px Georgia,serif`;g.textAlign='center';g.textBaseline='alphabetic';
    const m=g.measureText(txt);g.translate(0,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
    g.lineWidth=size/9;g.strokeStyle=ink==='#ffffff'?'rgba(0,0,0,.55)':'rgba(255,255,255,.4)';g.strokeText(txt,0,0);g.fillStyle=ink;g.fillText(txt,0,0);
    if(txt==='6'||txt==='9'){g.fillRect(-size*.22,size*.42,size*.44,size*.08);}g.restore();};
  const f=S.F[fi];
  if(S.s===2){if(labels[fi]!==''){g.strokeStyle=ink;g.globalAlpha=.55;g.lineWidth=5;g.beginPath();g.arc(N/2,N/2,N*.4,0,Math.PI*2);g.stroke();g.globalAlpha=1;draw(String(labels[fi]),N/2,N/2,64,0);}}
  else if(S.s===4){f.v.forEach((q,k)=>{const [u,v]=f.uv[k];const x=(.5+(u-.5)*.62)*N,y=(1-(.5+(v-.5)*.62))*N;const rot=Math.atan2(x-N/2,-(y-N/2));draw(String(labels[q]),x,y,34,rot);});}
  else draw(String(labels[fi]),N/2,N/2,S.s===6?70:S.s===12?54:60,0);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
}
function setLabels(obj,labels){
  obj.labels=labels;
  obj.mats.forEach((m,fi)=>{if(m.map)m.map.dispose();m.map=faceTex(obj.S,fi,labels,obj.col,obj.ink);m.needsUpdate=true;});
}
/* Which label is on top: the face pointing most upward (on a d4, the corner pointing up). */
function topIndex(obj,q){
  const Q=new THREE.Quaternion(q.x,q.y,q.z,q.w);let best=-1,bv=-1e9;
  if(obj.S.s===4){obj.S.V.forEach((p,i)=>{const y=new THREE.Vector3(...p).applyQuaternion(Q).y;if(y>bv){bv=y;best=i;}});}
  else obj.S.F.forEach((f,i)=>{const y=new THREE.Vector3(...f.n).applyQuaternion(Q).y;if(y>bv){bv=y;best=i;}});
  return best;
}

/* ---------- the stage: a transparent canvas laid exactly over the board ---------- */
function dice3dInit(){
  if(DICE3D.ok!==null)return DICE3D.ok;
  if(!window.THREE||!window.CANNON)return false;   // still loading: try again next roll
  try{
    const cv=document.createElement('canvas');cv.id='dice3d';
    cv.style.cssText='position:fixed;pointer-events:none;z-index:5;display:none;transition:opacity .35s';document.body.appendChild(cv);
    const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setClearColor(0x000000,0);
    r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff4e0,0x302018,.75));
    const L=new THREE.DirectionalLight(0xffffff,.85);L.position.set(-4,14,6);L.castShadow=true;L.shadow.mapSize.set(1024,1024);
    Object.assign(L.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});scene.add(L);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.35}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const cam=new THREE.PerspectiveCamera(30,1,1,100);
    Object.assign(DICE3D,{ok:true,r,scene,cam,cv});
  }catch(e){console.error(e);DICE3D.ok=false;}
  return DICE3D.ok;
}
/* Size the stage to the board as it sits on screen, and aim the camera so the tray fills it. */
function dice3dFit(){
  const rc=cv.getBoundingClientRect(),k=rc.width/SW;
  const x=rc.left+OX*k,y=rc.top+OY*k,w=COLS*TS*BK*k,h=ROWS*TS*BK*k;
  const S=DICE3D.cv.style;S.left=x+'px';S.top=y+'px';S.width=w+'px';S.height=h+'px';
  const dpr=Math.min(2,window.devicePixelRatio||1);DICE3D.r.setPixelRatio(dpr);DICE3D.r.setSize(w,h,false);
  DICE3D.W=10;DICE3D.D=10*h/w;
  const cam=DICE3D.cam;cam.aspect=w/h;const dist=DICE3D.D/2/Math.tan(cam.fov*Math.PI/360)+1;
  cam.position.set(0,dist*.97,dist*.24);cam.lookAt(0,0,0);cam.updateProjectionMatrix();
}
function makeDie(s,col,ink,labels,o){
  o=o||{};const S=dieShape(s,o.k);
  const mats=S.F.map(()=>new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45,metalness:.05,transparent:true,emissive:o.glow||0x000000,emissiveIntensity:o.glow?.3:0}));
  const mesh=new THREE.Mesh(S.g,mats);mesh.castShadow=true;
  const obj={S,mesh,mats,col,ink};setLabels(obj,labels);return obj;
}
function defaultLabels(s){return Array.from({length:s},(_,i)=>i+1);}

/* Simulate one throw of these dice (resting dice from earlier throws are obstacles) and record every frame. */
function simulate(dice,resting){
  const world=new CANNON.World();world.gravity.set(0,-60,0);world.broadphase=new CANNON.NaiveBroadphase();world.solver.iterations=12;
  const mat=new CANNON.Material();world.addContactMaterial(new CANNON.ContactMaterial(mat,mat,{friction:.25,restitution:.35}));
  const plane=(pos,axis,ang)=>{const b=new CANNON.Body({mass:0,material:mat});b.addShape(new CANNON.Plane());b.position.set(...pos);b.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis),ang);world.addBody(b);};
  const W=DICE3D.W/2-.3,D=DICE3D.D/2-.3;
  plane([0,0,0],[1,0,0],-Math.PI/2);plane([-W,0,0],[0,1,0],Math.PI/2);plane([W,0,0],[0,1,0],-Math.PI/2);plane([0,0,-D],[0,1,0],0);plane([0,0,D],[0,1,0],Math.PI);
  for(const o of resting){const b=new CANNON.Body({mass:0,material:mat});b.addShape(o.S.hull);b.position.copy(o.last.p);b.quaternion.copy(o.last.q);world.addBody(b);}
  const side=Math.random()<.5?-1:1;
  const bodies=dice.map((o,i)=>{
    const b=new CANNON.Body({mass:1,material:mat});b.addShape(o.S.hull);
    b.position.set(side*(W-1),3+i*.6+Math.random(),(Math.random()-.5)*D*1.2);
    b.quaternion.setFromEuler(Math.random()*6,Math.random()*6,Math.random()*6);
    b.velocity.set(-side*(14+Math.random()*8),-2,(Math.random()-.5)*10);
    b.angularVelocity.set((Math.random()-.5)*30,(Math.random()-.5)*30,(Math.random()-.5)*30);
    b.linearDamping=.1;b.angularDamping=o.S.s>=10?.35:.12;world.addBody(b);return b;});
  const frames=[];let still=0;
  for(let f=0;f<420;f++){
    world.step(1/60);
    frames.push(bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})));
    const moving=bodies.some(b=>b.velocity.length()>.12||b.angularVelocity.length()>.2);
    still=moving?0:still+1;if(still>12&&f>40)break;
  }
  dice.forEach((o,i)=>{o.frames=frames.map(fr=>fr[i]);o.last=frames[frames.length-1][i];});
  return frames.length;
}
/* Renumber a die so what lands on top reads v: swap two face numbers (d4: two corner numbers). */
function forceTop(o,v){
  const L=o.labels.slice();const ti=topIndex(o,o.last.q);const j=L.indexOf(v);
  if(j>=0&&j!==ti){const t=L[ti];L[ti]=L[j];L[j]=t;}
  setLabels(o,L);
}
/* Play the recorded frames of the dice in `play`, keeping the resting ones still; resolves when they stop. */
function playback(all,play,n){
  return new Promise(res=>{
    const t0=performance.now(),rate=60*1.5/spd();
    const tick=()=>{
      const f=Math.min(n-1,Math.floor((performance.now()-t0)/1000*rate));
      for(const o of all){const fr=play.includes(o)?o.frames[Math.min(f,o.frames.length-1)]:o.last;o.mesh.position.set(fr.p.x,fr.p.y,fr.p.z);o.mesh.quaternion.set(fr.q.x,fr.q.y,fr.q.z,fr.q.w);}
      DICE3D.r.render(DICE3D.scene,DICE3D.cam);
      if(f>=n-1)res();else requestAnimationFrame(tick);
    };tick();
  });
}
function clearDice(){for(const o of DICE3D.objs){DICE3D.scene.remove(o.mesh);o.mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}DICE3D.objs=[];}

/* Throw the dice of one roll card (see showRoll in engine.js): the die that counts is thrown larger and in ivory; with
   advantage or disadvantage several are thrown, glowing green (keep the best) or red (keep the worst), and the lost ones
   fade. Other dice are the roller's colour (blue for heroes, red for foes), DEF dice steel. Explosions and the extra dice
   of a critical hit follow one by one, glowing gold. A short caption sits at the top of the board: what the roll is,
   how advantage worked, then the result. Tap to hurry it along. */
/* Every die is the same size, and its colour says what it does: BLUE dice add DAMAGE, a die that lands on its top
   number turns RED and glows (a crit: +1 MULT), STEEL dice Defend or shield, GREEN dice heal. */
const DIE_COL={chip:['#2f6fd0','#ffffff'],crit:['#d03a2a','#ffffff'],def:['#8a9cb0','#0e1a28'],heal:['#3a9a48','#ffffff']},CRIT_GLOW=0xff3010;
const DIE3D_OK=s=>s===2||[4,6,8,10,12].includes(s);
function makeDieV(s,col,ink,o){if(s===2){const S=dieShape(2,o&&o.k);return makeDie(2,col,ink,S.F.map(f=>Math.abs(f.n[1])>.9?(f.n[1]>0?1:2):''),o);}return makeDie(s,col,ink,defaultLabels(s),o);}
function holdDice(ms){return new Promise(res=>{const t0=performance.now();const tick=()=>{if(DICE3D.skip||performance.now()-t0>=ms)res();else setTimeout(tick,30);};tick();});}
async function throwCard(o){
  clearDice();dice3dFit();DICE3D.skip=false;
  const cvS=DICE3D.cv.style;cvS.display='block';cvS.opacity='1';DICE3D.busy=true;
  const first=o.dice;
  const label={text:o.title,res:null,done:0,mark:null,col:o.res===1?'#ff8a70':o.res===3?'#9fe08a':'#ffe070',
    sub:o.sub,subCol:/MULT/.test(o.sub||'')?'#ff7a6a':'#e8dcc0'};
  DICE3D.lab=label;
  fx({dur:60000,draw(){
    if(DICE3D.lab!==label){this.dur=0;return;}
    if(!DICE3D.busy&&!label.done)label.done=NOW;const a=label.done?Math.max(0,1-(NOW-label.done)/400):1;if(a<=0){this.dur=0;return;}
    // each caption is a box of one or more lines, wrapped to the board's width; boxes stack down from the top
    ctx.globalAlpha=a;const box=(txt,y,col,rim)=>{const L=wrap(txt,COLS*TS-14),w=Math.max(...L.map(l=>textW(l)))+10,h=L.length*7+4,x=BX+COLS*TS/2-w/2;
      rect(x,y,w,h,'rgba(14,9,6,.85)');frame(x,y,w,h,rim);L.forEach((l,i)=>text(l,x+w/2,y+3+i*7,col,{al:'c'}));return y+h+2;};
    let by=box(label.text,BY+3,C.gold,C.rim);
    if(label.sub){ctx.globalAlpha=a*(.8+.2*Math.sin(NOW/140));by=box(label.sub,by,label.subCol,label.subCol);ctx.globalAlpha=a;}
    if(label.res)box(label.res,by,label.col,label.col);
    for(const m of label.marks||[]){const c='#ff8a70',bob=Math.round(Math.sin(NOW/160)*1.5),tw=textW('+1 MULT')+6,up=m.y-TS*.62<BY+40,ty=up?m.y+TS*.62+9+bob:m.y-TS*.62+bob;
      rect(m.x-tw/2,ty-9,tw,9,'rgba(14,9,6,.85)');frame(m.x-tw/2,ty-9,tw,9,c);text('+1 MULT',m.x,ty-7,c,{al:'c'});for(let i=0;i<3;i++)rect(m.x-2+i,up?ty-10-i:ty+i,5-2*i,1,c);}
    ctx.globalAlpha=1;
    if(DICE3D.busy)hit(0,0,SW,SH,{fn:()=>{DICE3D.skip=true;},id:'diceskip'});}});
  const kind=d=>d.k==='def'||d.k==='heal'?d.k:'chip';
  const objs=first.map(d=>{const c=DIE_COL[kind(d)];return makeDieV(d.s,c[0],c[1],{});});
  objs.forEach(q=>DICE3D.scene.add(q.mesh));
  const n=simulate(objs,DICE3D.objs);
  objs.forEach((q,i)=>forceTop(q,first[i].v));
  DICE3D.objs.push(...objs);sfx('dice');
  if(!DICE3D.skip)await playback(DICE3D.objs,objs,n);else objs.forEach(q=>{q.mesh.position.copy(q.last.p);q.mesh.quaternion.copy(q.last.q);});
  // crits turn red and glow once they land
  const crits=objs.filter((q,i)=>first[i].k==='crit');
  if(crits.length){
    for(const q of crits){q.col=DIE_COL.crit[0];q.ink=DIE_COL.crit[1];setLabels(q,q.labels);q.mats.forEach(m=>{if(m.emissive){m.emissive.setHex(CRIT_GLOW);m.emissiveIntensity=.35;}});}
    label.marks=crits.map(q=>{const p=q.last.p,v=new THREE.Vector3(p.x,p.y,p.z).project(DICE3D.cam);return {x:BX+(v.x+1)/2*COLS*TS,y:BY+(1-v.y)/2*ROWS*TS};});
    sfx('crit');
  }
  DICE3D.r.render(DICE3D.scene,DICE3D.cam);
  label.res=o.verdict;
  await holdDice((700+(o.verdict||'').length*18)*spd());
  cvS.opacity='0';DICE3D.busy=false;
  setTimeout(()=>{if(!DICE3D.busy){cvS.display='none';clearDice();}},450);
}
/* Attacks go through the roll cards too (H.rolls), so the old attack-only throw is not needed. */
H.dice=async()=>false;
/* Show a roll in 3D when we can; false means the caller should fall back to the flat card. */
async function dice3dRoll(o){
  if(SET.dice3d===false||!o.dice.every(d=>DIE3D_OK(d.s)))return false;
  try{if(!dice3dInit())return false;await throwCard(o);return true;}catch(e){console.error(e);DICE3D.busy=false;if(DICE3D.cv)DICE3D.cv.style.display='none';return false;}
}
