export {};
import {MAP_WIDTH,MAP_HEIGHT,circleTouchesPolygon,loadMasks,polygonBounds,pointInside,type MaskZone} from './explorationMasks';
import {createMaskEditor} from './maskEditor';

type Vec={x:number;y:number};
type ScenarioId='broken-gate'|'ember-shrine'|'rescue-run';
type TacticsApi={start:(scenario:ScenarioId,enemies?:number,fromExploration?:boolean)=>void;getState:()=>unknown;game?:unknown};
type Prop={id:string;cell:number;x:number;y:number;w:number;h:number};
type TownInteraction={
  id:string;name:string;x:number;y:number;cell?:number;kind:'npc'|'object'|'arena';
  lines:string[];scenario?:ScenarioId;radius?:number;
};
type PartyMember={name:string;role:string;color:string;source:'heroes'|'npcs';cell:number;x:number;y:number;lag:number;lateral:number};

declare global{
  interface Window{
    __TACTICS48__?:TacticsApi;
    __EXPLORATION__?:{show:()=>void;hide:()=>void;interact:()=>void;state:()=>unknown;teleportToArena:()=>void};
  }
}

const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const shell=$<HTMLElement>('#exploration-shell');
const canvas=$<HTMLCanvasElement>('#exploration-canvas');
const context=canvas.getContext('2d',{alpha:false})!;
const title=$<HTMLElement>('#title-screen');
const battle=$<HTMLElement>('#game-shell');
const unitDrawer=$<HTMLElement>('#unit-drawer');
const stick=$<HTMLElement>('#explore-stick');
const knob=$<HTMLElement>('#explore-stick-knob');
const interactButton=$<HTMLButtonElement>('#explore-interact');
const dialogue=$<HTMLElement>('#explore-dialogue');
const dialogueSpeaker=$<HTMLElement>('#dialogue-speaker');
const dialogueCopy=$<HTMLElement>('#dialogue-copy');
const dialogueNext=$<HTMLButtonElement>('#dialogue-next');
const menuModal=$<HTMLElement>('#explore-menu-modal');
const menuKicker=$<HTMLElement>('#explore-menu-kicker');
const menuTitle=$<HTMLElement>('#explore-menu-title');
const menuContent=$<HTMLElement>('#explore-menu-content');
const menuClose=$<HTMLButtonElement>('#explore-menu-close');
const arenaPanel=$<HTMLElement>('#arena-panel');
const arenaClose=$<HTMLButtonElement>('#arena-close');
const arenaEncounters=$<HTMLElement>('#arena-encounters');
const arenaEnemyCount=$<HTMLSelectElement>('#arena-enemy-count');
const toast=$<HTMLElement>('#explore-toast');

const WORLD_W=MAP_WIDTH;
const WORLD_H=MAP_HEIGHT;
const PLAYER_RADIUS=15;
const asset=(path:string)=>import.meta.env.BASE_URL+'assets/'+path;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);

function loadImage(path:string){
  const image=new Image();
  image.decoding='async';
  image.src=asset(path);
  return image;
}

const groundImage=loadImage('exploration/avaran-ground.webp');
const objectAtlas=loadImage('exploration/avaran-objects.webp');
const npcAtlas=loadImage('exploration/avaran-npcs.webp');
const heroAtlas=loadImage('encounters/heroes-atlas.webp');

const props:Prop[]=[
  {id:'sarano-house',cell:0,x:275,y:354,w:350,h:350},
  {id:'sun-inn',cell:1,x:620,y:330,w:320,h:320},
  {id:'arena-gate',cell:2,x:965,y:286,w:360,h:300},
  {id:'old-olive',cell:3,x:355,y:842,w:290,h:290},
  {id:'cypress-wall',cell:4,x:704,y:790,w:260,h:300},
  {id:'varite-shrine',cell:5,x:265,y:722,w:225,h:225}
];
let masks:MaskZone[]=loadMasks();

const interactions:TownInteraction[]=[
  {id:'ilyra',name:'Ilyra Sanz',x:752,y:482,cell:0,kind:'npc',lines:[
    'The grain carts are late again. House Sarano says the mountain road is unsafe; the carters say Sarano has doubled the toll.',
    'If you are looking for honest work, the Free Arena is north-east of the market. Honest may be too strong a word.'
  ]},
  {id:'tomas',name:'Tomas Vela',x:622,y:520,cell:1,kind:'npc',lines:[
    'Varite from the hills, cut for a lord who has never breathed the dust. See how it shines? Pretty chains are chains all the same.',
    'Keep your voices low. Valmora has more informers than wells.'
  ]},
  {id:'maelin',name:'Sister Maelin',x:366,y:692,cell:2,kind:'npc',lines:[
    'The old spring remembers every oath sworn above it. Kings, republics, rebels—the water outlasts them all.',
    'Touch the blue stone if you wish. It is only varite. That is what the Great Houses insist, anyway.'
  ]},
  {id:'nara',name:'Nara Pell',x:1210,y:566,cell:3,kind:'npc',lines:[
    'The river is quick below the bridge. Do not mistake clear water for gentle water.',
    'Boats from Valmora carry wine north and soldiers south. Lately, more soldiers than wine.'
  ]},
  {id:'rhea',name:'Captain Rhea',x:886,y:356,cell:4,kind:'arena',scenario:'broken-gate',lines:[
    'A company fights as one body or dies as four strangers. My trial begins at a broken gate.',
    'Choose any exercise you like. I will be watching where you stand, not how loudly you swing.'
  ]},
  {id:'valeo',name:'Valeo the Scout',x:984,y:368,cell:5,kind:'arena',scenario:'ember-shrine',lines:[
    'Speed is not rushing. Speed is arriving before the enemy understands what matters.',
    'The shrine trial will teach you that—if you let it.'
  ]},
  {id:'istria',name:'Istria Pell',x:1078,y:348,cell:6,kind:'arena',scenario:'rescue-run',lines:[
    'Every battlefield is a machine. Pull one person from the gears and the whole design changes.',
    'Try the rescue exercise, or choose another trial if you prefer simpler lies.'
  ]},
  {id:'nico',name:'Nico',x:832,y:572,cell:7,kind:'npc',lines:[
    'I can run from the fountain to the arena before the bell rings. Captain Rhea says that does not make me a scout.',
    'She is wrong, obviously.'
  ]},
  {id:'sarano-door',name:'House Sarano',x:304,y:374,kind:'object',lines:['The blue-shuttered villa bears the sunburst seal of House Sarano. The door is locked from within.']},
  {id:'shrine-water',name:'The Old Spring',x:268,y:746,kind:'object',lines:['Cool water runs beneath the varite crystal. For a moment, the noise of the market seems very far away.']},
  {id:'arena-sign',name:'Free Arena Notice',x:806,y:344,kind:'object',lines:['FREE ARENA — Companies welcome. Injuries probable. Grievances settled only inside the ring.']}
];

const encounters:{id:ScenarioId;host:string;title:string;kicker:string;copy:string}[]=[
  {id:'broken-gate',host:'Captain Rhea',title:'The Broken Gate',kicker:'DESTROY · BOSS',copy:'Break the barricades and defeat the Orc War Chief.'},
  {id:'ember-shrine',host:'Valeo the Scout',title:'The Ember Shrine',kicker:'INTERRUPT · HOLD',copy:'Break both sigils, then hold the shrine for two rounds.'},
  {id:'rescue-run',host:'Istria Pell',title:'Rescue at Ash Bridge',kicker:'RESCUE · ESCORT',copy:'Open the prison, rescue the captive, and reach the exit.'}
];

const lead={x:790,y:850};
const party:PartyMember[]=[
  {name:'Garrick',role:'Fighter',color:'#d7b15d',source:'heroes',cell:3,x:lead.x,y:lead.y,lag:0,lateral:0},
  {name:'Nox',role:'Rogue',color:'#62865a',source:'heroes',cell:1,x:lead.x-18,y:lead.y+34,lag:8,lateral:-15},
  {name:'Lyra',role:'Wizard',color:'#536d9f',source:'heroes',cell:0,x:lead.x+18,y:lead.y+58,lag:14,lateral:15},
  {name:'Mira',role:'Cleric',color:'#d8d7c0',source:'npcs',cell:2,x:lead.x,y:lead.y+84,lag:21,lateral:-10}
];

let objectCells:HTMLCanvasElement[]=[];
let npcCells:HTMLCanvasElement[]=[];
let heroCells:HTMLCanvasElement[]=[];
const bottomInsets=new WeakMap<HTMLCanvasElement,number>();
let assetsReady=false;
let active=false;
let input:Vec={x:0,y:0};
let camera={x:lead.x,y:lead.y};
let trail:Vec[]=[{...lead}];
let lastTime=performance.now();
let nearest:TownInteraction|undefined;
let toastTimer=0;
let dialogueState:{speaker:string;lines:string[];index:number;onComplete?:()=>void}|undefined;
let stickPointer:number|undefined;
let stickOrigin:Vec={x:0,y:0};
let stickMoved=false;
let keyboardInput:Vec={x:0,y:0};

function extractAtlas(image:HTMLImageElement,cols:number,rows:number){
  const cells:HTMLCanvasElement[]=[];
  const sourceW=Math.floor(image.naturalWidth/cols),sourceH=Math.floor(image.naturalHeight/rows);
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const cell=document.createElement('canvas');cell.width=sourceW;cell.height=sourceH;
    const cellContext=cell.getContext('2d',{willReadFrequently:true})!;
    cellContext.drawImage(image,col*sourceW,row*sourceH,sourceW,sourceH,0,0,sourceW,sourceH);
    const imageData=cellContext.getImageData(0,0,sourceW,sourceH),data=imageData.data,copy=new Uint8ClampedArray(data);
    const sample=(x:number,y:number)=>{const index=(clamp(y,0,sourceH-1)*sourceW+clamp(x,0,sourceW-1))*4;return[copy[index],copy[index+1],copy[index+2]] as [number,number,number];};
    for(let y=0;y<sourceH;y++)for(let x=0;x<sourceW;x++){
      const index=(y*sourceW+x)*4,r=copy[index],g=copy[index+1],b=copy[index+2];
      const candidates=[sample(2,y),sample(sourceW-3,y),sample(x,2),sample(x,sourceH-3)];
      let difference=999;
      for(const candidate of candidates){const dr=r-candidate[0],dg=g-candidate[1],db=b-candidate[2];difference=Math.min(difference,Math.sqrt(dr*dr+dg*dg+db*db));}
      const alpha=clamp((difference-18)/54,0,1);
      data[index+3]=Math.round(copy[index+3]*alpha);
    }
    for(let y=sourceH-1;y>=0;y--){
      let solid=0;for(let x=0;x<sourceW;x++)if(data[(y*sourceW+x)*4+3]>100)solid++;
      if(solid>=4){bottomInsets.set(cell,sourceH-1-y);break;}
    }
    cellContext.clearRect(0,0,sourceW,sourceH);cellContext.putImageData(imageData,0,0);cells.push(cell);
  }
  return cells;
}

Promise.all([groundImage.decode(),objectAtlas.decode(),npcAtlas.decode(),heroAtlas.decode()]).then(()=>{
  objectCells=extractAtlas(objectAtlas,3,2);
  npcCells=extractAtlas(npcAtlas,4,2);
  heroCells=extractAtlas(heroAtlas,2,2);
  assetsReady=true;
}).catch(()=>{assetsReady=false;});

function isPaused(){return!dialogue.hidden||!menuModal.hidden||!arenaPanel.hidden||editor.isOpen();}

function blocked(x:number,y:number){
  if(x<PLAYER_RADIUS||y<PLAYER_RADIUS||x>WORLD_W-PLAYER_RADIUS||y>WORLD_H-PLAYER_RADIUS)return true;
  return masks.some(mask=>mask.kind==='collision'&&circleTouchesPolygon({x,y},PLAYER_RADIUS,mask.points));
}

function moveParty(delta:number){
  const vector={x:input.x+keyboardInput.x,y:input.y+keyboardInput.y};
  const magnitude=Math.hypot(vector.x,vector.y);
  if(!magnitude||isPaused())return;
  const normalized={x:vector.x/Math.max(1,magnitude),y:vector.y/Math.max(1,magnitude)};
  const speed=170,dx=normalized.x*speed*delta,dy=normalized.y*speed*delta;
  if(!blocked(lead.x+dx,lead.y))lead.x+=dx;
  if(!blocked(lead.x,lead.y+dy))lead.y+=dy;
  if(distance(lead,trail[0])>5){trail.unshift({...lead});if(trail.length>120)trail.length=120;}
}

function updateFollowers(delta:number){
  party[0].x=lead.x;party[0].y=lead.y;
  for(let index=1;index<party.length;index++){
    const member=party[index],target=trail[Math.min(member.lag,trail.length-1)]??lead,next=trail[Math.min(member.lag+2,trail.length-1)]??target;
    const dx=target.x-next.x,dy=target.y-next.y,length=Math.hypot(dx,dy)||1;
    const desired={x:target.x-dy/length*member.lateral,y:target.y+dx/length*member.lateral};
    const ease=1-Math.exp(-delta*7);member.x+=(desired.x-member.x)*ease;member.y+=(desired.y-member.y)*ease;
  }
}

function resize(){
  const rect=shell.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.floor(rect.width*ratio));canvas.height=Math.max(1,Math.floor(rect.height*ratio));
  canvas.style.width=rect.width+'px';canvas.style.height=rect.height+'px';
}

function drawPlaceholder(x:number,y:number,color:string){
  context.save();context.fillStyle='rgba(12,18,21,.45)';context.beginPath();context.ellipse(x,y+2,21,8,0,0,Math.PI*2);context.fill();
  context.fillStyle=color;context.beginPath();context.arc(x,y-23,12,0,Math.PI*2);context.fill();context.fillRect(x-13,y-18,26,24);context.restore();
}

function drawCell(cell:HTMLCanvasElement|undefined,x:number,y:number,w:number,h:number,footOffset=0,ctx=context){
  if(!cell)return false;ctx.drawImage(cell,x-w/2,y-h+footOffset,w,h);return true;
}
function groundedOffset(cell:HTMLCanvasElement|undefined,height:number){return cell?height*(bottomInsets.get(cell)??0)/cell.height+2:0;}

function drawProp(prop:Prop,ctx=context){
  const cell=objectCells[prop.cell];
  if(!drawCell(cell,prop.x,prop.y,prop.w,prop.h,0,ctx)){
    ctx.fillStyle='rgba(121,83,47,.8)';ctx.fillRect(prop.x-prop.w*.35,prop.y-prop.h*.45,prop.w*.7,prop.h*.45);
  }
}

function overlayForeground(point:Vec,height:number,width:number){
  for(const mask of masks){
    if(mask.kind!=='foreground'||point.y>=(mask.depthY??polygonBounds(mask.points).y1))continue;
    const bounds=polygonBounds(mask.points);
    if(point.x+width/2<bounds.x0||point.x-width/2>bounds.x1||point.y+6<bounds.y0||point.y-height>bounds.y1)continue;
    context.save();context.beginPath();mask.points.forEach((vertex,index)=>index?context.lineTo(vertex.x,vertex.y):context.moveTo(vertex.x,vertex.y));context.closePath();context.clip();
    if(mask.source&&mask.source!=='ground'){
      const prop=props.find(item=>item.id===mask.source);if(prop)drawProp(prop);
    }else if(groundImage.complete&&groundImage.naturalWidth)context.drawImage(groundImage,0,0,WORLD_W,WORLD_H);
    context.restore();
  }
}

function drawNpc(npc:TownInteraction,time:number){
  const bob=Math.sin(time*.002+npc.x)*.5;
  context.save();context.fillStyle='rgba(10,17,20,.42)';context.beginPath();context.ellipse(npc.x,npc.y+2,19,7,0,0,Math.PI*2);context.fill();context.restore();
  const cell=npc.cell===undefined?undefined:npcCells[npc.cell];
  if(!drawCell(cell,npc.x,npc.y,72,96,groundedOffset(cell,96)+bob))drawPlaceholder(npc.x,npc.y,'#a57146');
  overlayForeground(npc,96,72);
  if(nearest?.id===npc.id){
    context.save();context.strokeStyle='#ffe5a0';context.lineWidth=2;context.beginPath();context.ellipse(npc.x,npc.y+1,27,12,0,0,Math.PI*2);context.stroke();
    context.fillStyle='#fff3bd';context.strokeStyle='#38210f';context.lineWidth=3;context.font='900 20px Georgia';context.textAlign='center';context.strokeText('!',npc.x,npc.y-76);context.fillText('!',npc.x,npc.y-76);context.restore();
  }
}

function drawParty(member:PartyMember,index:number,time:number){
  const bob=Math.sin(time*.011-index*.8)*(Math.hypot(input.x+keyboardInput.x,input.y+keyboardInput.y)>.1?1:0);
  context.save();context.fillStyle='rgba(7,14,18,.5)';context.beginPath();context.ellipse(member.x,member.y+3,index?18:22,index?6:8,0,0,Math.PI*2);context.fill();
  if(index===0){context.strokeStyle='#91e7ff';context.lineWidth=2;context.beginPath();context.ellipse(member.x,member.y+1,27,12,0,0,Math.PI*2);context.stroke();}context.restore();
  const cells=member.source==='heroes'?heroCells:npcCells;
  const spriteHeight=index?82:92,spriteWidth=index?70:78;
  const cell=cells[member.cell];
  if(!drawCell(cell,member.x,member.y,spriteWidth,spriteHeight,groundedOffset(cell,spriteHeight)+bob))drawPlaceholder(member.x,member.y,member.color);
  overlayForeground(member,spriteHeight,spriteWidth);
}

function drawWorld(time:number){
  const rect=shell.getBoundingClientRect(),viewW=rect.width,viewH=rect.height,ratio=Math.min(window.devicePixelRatio||1,2);
  context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,viewW,viewH);
  context.fillStyle='#11181b';context.fillRect(0,0,viewW,viewH);
  const zoom=clamp(viewW/430,.78,1.08),halfW=viewW/(2*zoom),halfH=viewH/(2*zoom);
  const targetX=clamp(lead.x,halfW,WORLD_W-halfW),targetY=clamp(lead.y,halfH,WORLD_H-halfH);
  camera.x+=(targetX-camera.x)*.12;camera.y+=(targetY-camera.y)*.12;
  context.save();context.translate(viewW/2-camera.x*zoom,viewH/2-camera.y*zoom);context.scale(zoom,zoom);
  if(groundImage.complete&&groundImage.naturalWidth)context.drawImage(groundImage,0,0,WORLD_W,WORLD_H);
  else{context.fillStyle='#bf9b62';context.fillRect(0,0,WORLD_W,WORLD_H);}

  const drawable:Array<{y:number;draw:()=>void}>=props.map(prop=>({y:prop.y,draw:()=>drawProp(prop)}));
  for(const npc of interactions.filter(item=>item.cell!==undefined))drawable.push({y:npc.y,draw:()=>drawNpc(npc,time)});
  party.forEach((member,index)=>drawable.push({y:member.y,draw:()=>drawParty(member,index,time)}));
  drawable.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
  context.restore();

  const shade=context.createLinearGradient(0,0,0,viewH);shade.addColorStop(0,'rgba(14,20,24,.18)');shade.addColorStop(.55,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(4,9,13,.2)');context.fillStyle=shade;context.fillRect(0,0,viewW,viewH);
}

function updateNearest(){
  const candidate=interactions.map(item=>({item,distance:distance(lead,item)})).filter(entry=>entry.distance<=(entry.item.radius??78)).sort((a,b)=>a.distance-b.distance)[0]?.item;
  if(candidate?.id===nearest?.id)return;nearest=candidate;
  interactButton.classList.toggle('active',Boolean(nearest));
  interactButton.title=nearest?'Interact with '+nearest.name:'Interact';
}

function frame(time:number){
  const delta=Math.min(.034,(time-lastTime)/1000||0);lastTime=time;
  if(active){moveParty(delta);updateFollowers(delta);updateNearest();drawWorld(time);}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function resetStick(){input={x:0,y:0};knob.style.transform='translate3d(0,0,0)';stick.classList.remove('moving');}

function setStickFromPointer(event:PointerEvent){
  const rect=stick.getBoundingClientRect(),centre={x:rect.left+rect.width/2,y:rect.top+rect.height/2},dx=event.clientX-centre.x,dy=event.clientY-centre.y,max=rect.width*.31,length=Math.hypot(dx,dy)||1,scale=Math.min(1,max/length),x=dx*scale,y=dy*scale;
  input={x:x/max,y:y/max};knob.style.transform='translate3d('+x+'px,'+y+'px,0)';
  stick.classList.add('moving');
}

stick.addEventListener('pointerdown',event=>{
  if(isPaused())return;event.preventDefault();stickPointer=event.pointerId;stickOrigin={x:event.clientX,y:event.clientY};stickMoved=false;stick.setPointerCapture(event.pointerId);
});
stick.addEventListener('pointermove',event=>{
  if(event.pointerId!==stickPointer)return;
  if(!stickMoved&&Math.hypot(event.clientX-stickOrigin.x,event.clientY-stickOrigin.y)>18)stickMoved=true;
  if(stickMoved)setStickFromPointer(event);
});
const releaseStick=(event:PointerEvent)=>{
  if(event.pointerId!==stickPointer)return;
  const tapped=!stickMoved&&Math.hypot(event.clientX-stickOrigin.x,event.clientY-stickOrigin.y)<=24;
  stickPointer=undefined;resetStick();if(tapped)interact();
};
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',event=>{if(event.pointerId===stickPointer){stickPointer=undefined;resetStick();}});

const keys=new Set<string>();
window.addEventListener('keydown',event=>{
  if(!active||isPaused()||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' '].includes(event.key))event.preventDefault();
  if(event.key===' '){interact();return;}keys.add(event.key.toLowerCase());updateKeyboard();
});
window.addEventListener('keyup',event=>{keys.delete(event.key.toLowerCase());updateKeyboard();});
function updateKeyboard(){keyboardInput={x:Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),y:Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'))};}
function clearMovementKeys(){keys.clear();updateKeyboard();}

function openDialogue(speaker:string,lines:string[],onComplete?:()=>void){
  resetStick();clearMovementKeys();dialogueState={speaker,lines,index:0,onComplete};dialogueSpeaker.textContent=speaker;dialogueCopy.textContent=lines[0];dialogueNext.innerHTML=lines.length>1?'Continue <span>›</span>':'Close <span>›</span>';dialogue.hidden=false;
}

function advanceDialogue(){
  if(!dialogueState)return;
  dialogueState.index++;
  if(dialogueState.index<dialogueState.lines.length){dialogueCopy.textContent=dialogueState.lines[dialogueState.index];dialogueNext.innerHTML=dialogueState.index===dialogueState.lines.length-1?'Close <span>›</span>':'Continue <span>›</span>';return;}
  const complete=dialogueState.onComplete;dialogueState=undefined;dialogue.hidden=true;complete?.();
}

function interact(){
  if(!active||isPaused()||!nearest){if(active&&!isPaused())showToast('Nothing nearby to interact with.');return;}
  if(nearest.kind==='arena')openDialogue(nearest.name,nearest.lines,()=>openArena(nearest?.scenario));
  else openDialogue(nearest.name,nearest.lines);
}

dialogueNext.addEventListener('click',advanceDialogue);dialogue.addEventListener('click',event=>{if(event.target===dialogue||event.target===dialogueCopy)advanceDialogue();});interactButton.addEventListener('click',interact);

function showToast(copy:string){
  window.clearTimeout(toastTimer);toast.textContent=copy;toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('visible'));toastTimer=window.setTimeout(()=>{toast.classList.remove('visible');window.setTimeout(()=>toast.hidden=true,180);},1800);
}

const editor=createMaskEditor({
  getMasks:()=>masks,
  onSave:saved=>{masks=saved;showToast('Map masks saved on this device.');},
  drawBase:ctx=>{
    if(groundImage.complete&&groundImage.naturalWidth)ctx.drawImage(groundImage,0,0,WORLD_W,WORLD_H);
    else{ctx.fillStyle='#c49c67';ctx.fillRect(0,0,WORLD_W,WORLD_H);}
    props.slice().sort((a,b)=>a.y-b.y).forEach(prop=>drawProp(prop,ctx));
  }
});

function openMenu(kind:'map'|'party'|'journal'|'settings'){
  resetStick();clearMovementKeys();menuModal.hidden=false;
  if(kind==='map'){
    menuKicker.textContent='VALMORA · OUTER QUARTER';menuTitle.textContent='Settlement map';
    const dots=party.map((member,index)=>'<circle cx="'+member.x.toFixed(1)+'" cy="'+member.y.toFixed(1)+'" r="'+(index?10:15)+'" fill="'+member.color+'" stroke="#172925" stroke-width="5" class="map-party-dot"/><circle cx="'+member.x.toFixed(1)+'" cy="'+member.y.toFixed(1)+'" r="'+(index?10:15)+'" fill="none" stroke="#fff2c0" stroke-width="3"/>').join('');
    menuContent.innerHTML='<div class="settlement-map"><img src="'+asset('exploration/avaran-ground.webp')+'" alt="Map of Valmora’s Outer Quarter"/><svg viewBox="0 0 1536 1024" aria-label="Party position"><circle cx="'+lead.x+'" cy="'+lead.y+'" r="32" fill="rgba(255,227,145,.22)" stroke="#fff1b7" stroke-width="5"/>'+dots+'</svg><i class="map-arena">Free Arena</i><i class="map-market">Market</i><i class="map-shrine">Old Spring</i><i class="map-river">Pell River</i></div><p class="menu-note">Coloured circles show the company’s exact positions. The river can only be crossed at the stone bridge.</p>';
  }else if(kind==='party'){
    menuKicker.textContent='YOUR COMPANY';menuTitle.textContent='Party';
    menuContent.innerHTML='<div class="explore-party-list">'+party.map((member,index)=>'<article><span class="party-gem" style="--party:'+member.color+'">'+(index+1)+'</span><div><b>'+member.name+'</b><small>'+member.role+'</small></div><strong>'+['24','18','16','20'][index]+' HP</strong></article>').join('')+'</div><p class="menu-note">The party follows Garrick in formation. All four heroes enter arena encounters together.</p>';
  }else if(kind==='journal'){
    menuKicker.textContent='FIELD JOURNAL';menuTitle.textContent='Current leads';
    menuContent.innerHTML='<div class="journal-list"><article><small>ACTIVE</small><b>Prove the company</b><p>Speak with one of the three masters at the Free Arena and complete a tactical trial.</p></article><article><small>RUMOUR</small><b>Late grain</b><p>Market steward Ilyra says House Sarano has doubled the mountain-road toll.</p></article><article><small>RUMOUR</small><b>Pretty chains</b><p>Varite workers are speaking more openly about the Great Houses.</p></article></div>';
  }else{
    menuKicker.textContent='EXPLORATION';menuTitle.textContent='Settings';
    menuContent.innerHTML='<div class="settings-list"><article><small>DEVELOPER MODE</small><b>Edit map masks</b><p>Trace impassable ground and foreground art directly on the settlement. Drag vertices, add or remove areas, then save your work on this device.</p><button id="open-mask-editor" type="button">Open mask editor</button></article><p class="menu-note">Export a JSON backup from the editor if you want to move your masks between devices.</p></div>';
    menuContent.querySelector<HTMLButtonElement>('#open-mask-editor')!.addEventListener('click',()=>{menuModal.hidden=true;editor.open();});
  }
}

$<HTMLButtonElement>('#explore-map-button').addEventListener('click',()=>openMenu('map'));
$<HTMLButtonElement>('#explore-party-button').addEventListener('click',()=>openMenu('party'));
$<HTMLButtonElement>('#explore-journal-button').addEventListener('click',()=>openMenu('journal'));
$<HTMLButtonElement>('#explore-settings-button').addEventListener('click',()=>openMenu('settings'));
menuClose.addEventListener('click',()=>menuModal.hidden=true);menuModal.addEventListener('click',event=>{if(event.target===menuModal)menuModal.hidden=true;});

function renderEncounters(preferred?:ScenarioId){
  arenaEncounters.innerHTML='';
  for(const encounter of encounters){
    const card=document.createElement('article');card.className='arena-card'+(encounter.id===preferred?' preferred':'');
    card.innerHTML='<div><small>'+encounter.kicker+'</small><b>'+encounter.title+'</b><p>'+encounter.copy+'</p><span>Hosted by '+encounter.host+'</span></div><button type="button">Begin</button>';
    card.querySelector('button')!.addEventListener('click',()=>launchEncounter(encounter.id));arenaEncounters.appendChild(card);
  }
}

function openArena(preferred?:ScenarioId){renderEncounters(preferred);arenaPanel.hidden=false;}
function launchEncounter(id:ScenarioId){
  const api=window.__TACTICS48__;if(!api){showToast('The arena is still preparing.');return;}
  hide();api.start(id,clamp(Number(arenaEnemyCount.value)||5,4,8),true);
}
arenaClose.addEventListener('click',()=>arenaPanel.hidden=true);arenaPanel.addEventListener('click',event=>{if(event.target===arenaPanel)arenaPanel.hidden=true;});

function show(){
  active=true;title.hidden=true;battle.hidden=true;unitDrawer.hidden=true;shell.hidden=false;dialogue.hidden=true;menuModal.hidden=true;arenaPanel.hidden=true;editor.close();lastTime=performance.now();resize();
}
function hide(){active=false;resetStick();clearMovementKeys();editor.close();shell.hidden=true;dialogue.hidden=true;menuModal.hidden=true;arenaPanel.hidden=true;}

window.addEventListener('resize',resize);
window.addEventListener('tactics:explore',()=>{show();showToast('Find the three arena masters north-east of the market.');});
window.addEventListener('tactics:encounter-start',hide);
window.addEventListener('tactics:return-to-exploration',()=>{show();showToast('The company returns to Valmora.');});

window.__EXPLORATION__={
  show,hide,interact,
  state:()=>({active,lead:{...lead},camera:{...camera},nearest:nearest?.id,assetsReady,masks:masks.length,editorOpen:editor.isOpen(),party:party.map(member=>({name:member.name,x:Math.round(member.x),y:Math.round(member.y)}))}),
  teleportToArena:()=>{lead.x=960;lead.y=420;trail=[{...lead}];party.forEach(member=>{member.x=lead.x;member.y=lead.y;});camera={...lead};updateNearest();}
};
