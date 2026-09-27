'use strict';
/* =====================================================================
   EMBERWATCH — the damage dice, thrown in 3D.
   Like the Dice Roller plugin for Obsidian: numbered dice (d4, d6, d8, d10, d12) are thrown onto the board with
   real physics (cannon.js) and drawn with three.js. The game has already rolled the numbers, so each throw is
   simulated first, then the die is renumbered so the face that ends up on top shows the rolled number, and
   the recorded tumble is played back. Without WebGL or the libraries, attacks simply skip the dice.
   ===================================================================== */
const DICE3D={ok:null,r:null,scene:null,cam:null,cv:null,W:10,D:13,shapes:{},busy:false,objs:[]};
const DIE_COL={fighter:'#3a6ab8',rogue:'#2e8a4e',wizard:'#7a44c8',cleric:'#c8a032'};
const DIE_INK={fighter:'#ffffff',rogue:'#ffffff',wizard:'#ffffff',cleric:'#2a1a08'};

/* ---------- die shapes: vertices, then faces found as the convex hull (planar polygons, outward winding) ---------- */
function dieVerts(s){
  const P=(1+Math.sqrt(5))/2;
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
    faces.push({v:on,n,c});
  }
  return faces;
}
/* One shape per die size: geometry with a material group and texture coordinates per face, and a physics hull. */
function dieShape(s,k){
  k=k||1;const key=s+'@'+k;if(DICE3D.shapes[key])return DICE3D.shapes[key];
  const sc={4:.62,6:.46,8:.62,10:.6,12:.38}[s]*k;
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
  const draw=(txt,x,y,size,rot)=>{g.save();g.translate(x,y);g.rotate(rot);g.font=`bold ${size}px Georgia,serif`;g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=size/9;g.strokeStyle=ink==='#ffffff'?'rgba(0,0,0,.55)':'rgba(255,255,255,.4)';g.strokeText(txt,0,0);g.fillStyle=ink;g.fillText(txt,0,0);
    if(txt==='6'||txt==='9'){g.fillRect(-size*.22,size*.42,size*.44,size*.08);}g.restore();};
  const f=S.F[fi];
  if(S.s===4){f.v.forEach((q,k)=>{const [u,v]=f.uv[k];const x=(.5+(u-.5)*.62)*N,y=(1-(.5+(v-.5)*.62))*N;const rot=Math.atan2(x-N/2,-(y-N/2));draw(String(labels[q]),x,y,34,rot);});}
  else draw(String(labels[fi]),N/2,N/2+(S.s===8?8:0),S.s===6?70:S.s===12?54:60,0);
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

/* Throw the dice of one attack roll. The primary die, the one that decides a miss, a hit or a critical hit, is
   thrown larger and in ivory; the other dice only add damage. With advantage the primary is thrown more than once
   and glows green (keep the best), with disadvantage it glows red (keep the worst); the dropped ones fade, and a
   banner on the board says which it is. Then each extra die a critical hit rolls, in turn. */
const PRIME_COL={0:'#efe4c6',1:'#9fe08a',[-1]:'#f2927c'},PRIME_INK='#2a1406',ADV_GLOW=0x1f8030,DIS_GLOW=0x901818,BOOM_GLOW=0xc06008;
async function throwDice(u,t,r){
  const s=r.d.s,col=DIE_COL[u.cls]||'#806040',ink=DIE_INK[u.cls]||'#fff';
  clearDice();dice3dFit();
  const cvS=DICE3D.cv.style;cvS.display='block';cvS.opacity='1';DICE3D.busy=true;
  const keep=r.stag?-1:r.tries.indexOf(r.prim),k=Math.abs(r.net),multi=!r.stag&&r.tries.length>1;
  const glow=multi?(r.net>0?ADV_GLOW:DIS_GLOW):0;
  const first=[];
  r.tries.forEach((v,i)=>first.push({v,dim:i!==keep,prime:true,glow,kept:i===keep}));
  if(r.stag)first.push({v:r.prim,prime:true,kept:true});
  for(const v of r.rest)first.push({v});
  const label={text:diceText(r.d),res:null,crit:false,done:0,mark:null,miss:false,
    sub:multi?(r.net>0?`ADVANTAGE${k>1?' ×'+k:''}: best of ${r.tries.length}`:`DISADVANTAGE${k>1?' ×'+k:''}: worst of ${r.tries.length}`):r.stag?'STAGGERED: sure critical hit':null,
    subCol:multi?(r.net>0?'#7cf08a':'#ff7a6a'):'#ffe070'};
  fx({dur:60000,draw(){
    if(!DICE3D.busy&&!label.done)label.done=NOW;const a=label.done?Math.max(0,1-(NOW-label.done)/400):1;if(a<=0){this.dur=0;return;}
    ctx.globalAlpha=a;const txt=label.res||label.text;const w=textW(txt)+10;const x=BX+COLS*TS/2-w/2,y=BY+3;
    rect(x,y,w,11,'rgba(14,9,6,.85)');frame(x,y,w,11,label.crit?'#f0c050':label.miss?'#c04030':C.rim);text(txt,x+w/2,y+3,label.crit?'#ffe070':label.miss?'#ff8a70':C.parch,{al:'c'});
    if(label.sub){const sw=textW(label.sub)+10,sx=BX+COLS*TS/2-sw/2,sy=y+13;const pulse=.75+.25*Math.sin(NOW/140);
      rect(sx,sy,sw,11,'rgba(14,9,6,.85)');ctx.globalAlpha=a*pulse;frame(sx,sy,sw,11,label.subCol);ctx.globalAlpha=a;text(label.sub,sx+sw/2,sy+3,label.subCol,{al:'c'});}
    if(label.mark){const m=label.mark,c=label.miss?'#ff6a50':label.crit?'#ffe070':'#fff4c0',bob=Math.round(Math.sin(NOW/160)*1.5);
      const tx=label.miss?'MISS':label.crit?'CRIT':'COUNTS';const tw=textW(tx)+6,ty=m.y-TS*.62+bob;
      rect(m.x-tw/2,ty-9,tw,9,'rgba(14,9,6,.85)');frame(m.x-tw/2,ty-9,tw,9,c);text(tx,m.x,ty-7,c,{al:'c'});
      for(let i=0;i<3;i++)rect(m.x-2+i,ty+i,5-2*i,1,c);}
    ctx.globalAlpha=1;}});
  const throwSet=async list=>{
    const objs=list.map(q=>q.prime?makeDie(s,PRIME_COL[q.glow?Math.sign(r.net):0],PRIME_INK,defaultLabels(s),{k:1.3,glow:q.glow}):makeDie(s,col,ink,defaultLabels(s),{glow:q.glow}));
    objs.forEach(o=>DICE3D.scene.add(o.mesh));
    const n=simulate(objs,DICE3D.objs);
    objs.forEach((o,i)=>forceTop(o,list[i].v));
    DICE3D.objs.push(...objs);sfx('dice');
    await playback(DICE3D.objs,objs,n);
    objs.forEach((o,i)=>{if(list[i].dim)o.mats.forEach(m=>{m.opacity=.3;m.emissiveIntensity=0;});});
    DICE3D.r.render(DICE3D.scene,DICE3D.cam);
    return objs;
  };
  const objs=await throwSet(first);
  // point at the die that counts
  const ki=first.findIndex(q=>q.kept);
  if(ki>=0){const p=objs[ki].last.p,v=new THREE.Vector3(p.x,p.y,p.z).project(DICE3D.cam);label.mark={x:BX+(v.x+1)/2*COLS*TS,y:BY+(1-v.y)/2*ROWS*TS};}
  if(r.res===1){label.miss=true;sfx('graze');}
  if(r.res===3){label.crit=true;label.text=(r.stag?'STAGGERED: ':'')+'CRIT! Roll one more…';sfx('crit');
    for(const v of r.boom){await sleep(160);await throwSet([{v,glow:BOOM_GLOW}]);sfx('gem');}}
  label.res=r.res===1?'MISS: a 1 on the first die':`${diceText(r.d)} = ${r.total}`+(r.res===3?' CRIT!':'');
  await sleep(multi||r.res!==2?620:420);
  // the dice fade away while the blow lands
  cvS.opacity='0';DICE3D.busy=false;
  setTimeout(()=>{if(!DICE3D.busy){cvS.display='none';clearDice();}},450);
}
H.dice=async(u,t,r)=>{
  if(AUTOPLAY||!r||u.side!=='hero'||!t||!t.id||SET.dice3d===false)return;
  try{if(dice3dInit())await throwDice(u,t,r);}catch(e){console.error(e);DICE3D.busy=false;if(DICE3D.cv)DICE3D.cv.style.display='none';}
};
