import './phaser.css';

type Team='player'|'enemy';
type Weapon='melee'|'ranged';
type TargetingMode='attack'|'heal'|'magic';
type MapKey='6x8'|'8x10'|'12x16'|'20x20'|'30x30';
type Point={x:number;y:number};
type Obstacle=Point&{kind:number};
type Unit=Point&{
  id:string;name:string;role:string;team:Team;art:string;weapon:Weapon;
  hp:number;maxHp:number;damage:number;initiativeMod:number;initiativeScore:number;
  actionsUsed:number;defending:boolean;hiding:boolean;charged:boolean;
  abilityUsed:string[];
};
type LogEntry={round:number;text:string};
type Snapshot={units:Unit[];selectedId:string;round:number;activeIndex:number;logEntries:LogEntry[]};
type EncounterConfig={map:MapKey;move:number;enemies:number;players:number};
type HeroTemplate=Omit<Unit,keyof Point|'initiativeScore'|'actionsUsed'|'defending'|'hiding'|'charged'|'abilityUsed'>;

const CELL=16;
const ACTIONS=2;
const HEAL=2;
const HEAL_RANGE=1;
const RANGED_RANGE=2;
const DEFAULT_TILES_WIDE=6;
const NS='http://www.w3.org/2000/svg';
const MAPS:Record<MapKey,{cols:number;rows:number;background:string;obstacleKinds:number[]}>={
  '6x8':{cols:6,rows:8,background:'meadow-6x8.webp',obstacleKinds:[0,1,2,3]},
  '8x10':{cols:8,rows:10,background:'meadow-6x8.webp',obstacleKinds:[0,1,2,3]},
  '12x16':{cols:12,rows:16,background:'desert-12x16.webp',obstacleKinds:[4,5]},
  '20x20':{cols:20,rows:20,background:'snow-20x20.webp',obstacleKinds:[6,7]},
  '30x30':{cols:30,rows:30,background:'highland-30x30.webp',obstacleKinds:[0,1,2,3]}
};
const HEROES:HeroTemplate[]=[
  {id:'alden',name:'Aldren',role:'Archer',team:'player',art:'alden',weapon:'ranged',hp:5,maxHp:5,damage:2,initiativeMod:2},
  {id:'mira',name:'Mira',role:'Healer',team:'player',art:'mira',weapon:'melee',hp:4,maxHp:4,damage:2,initiativeMod:4},
  {id:'lyra',name:'Lyra',role:'Wizard',team:'player',art:'lyra',weapon:'ranged',hp:4,maxHp:4,damage:2,initiativeMod:3},
  {id:'nox',name:'Nox',role:'Thief',team:'player',art:'nox',weapon:'melee',hp:4,maxHp:4,damage:2,initiativeMod:5},
  {id:'seraphine',name:'Seraphine',role:'Paladin',team:'player',art:'seraphine',weapon:'melee',hp:7,maxHp:7,damage:2,initiativeMod:0},
  {id:'garrick',name:'Garrick',role:'Fighter',team:'player',art:'garrick',weapon:'melee',hp:6,maxHp:6,damage:3,initiativeMod:1}
];
const ENEMIES=[
  {name:'Goblin Raider',role:'Raider',art:'raider-1',weapon:'melee' as Weapon,hp:3,damage:1,initiativeMod:1},
  {name:'Goblin Skirmisher',role:'Skirmisher',art:'raider-2',weapon:'melee' as Weapon,hp:3,damage:1,initiativeMod:2},
  {name:'Goblin Archer',role:'Archer',art:'raider-3',weapon:'ranged' as Weapon,hp:3,damage:1,initiativeMod:3},
  {name:'Goblin Brute',role:'Brute',art:'raider-4',weapon:'melee' as Weapon,hp:5,damage:2,initiativeMod:-1}
];
const ICONS={
  attack:'<svg viewBox="0 0 24 24"><g transform="rotate(-43 12 12)"><path d="M10.8 3h2.4l-.35 10.1h-1.7L10.8 3Z"/><path d="M8.4 13h7.2v1.8H8.4zM11 14.5h2v4.1h-2z"/><circle cx="12" cy="19.4" r="1.25"/></g><g transform="rotate(43 12 12)"><path d="M10.8 3h2.4l-.35 10.1h-1.7L10.8 3Z"/><path d="M8.4 13h7.2v1.8H8.4zM11 14.5h2v4.1h-2z"/><circle cx="12" cy="19.4" r="1.25"/></g></svg>',
  defend:'<svg viewBox="0 0 24 24"><path d="M12 2.5 19 5.6v5.2c0 5-2.8 8.5-7 10.7-4.2-2.2-7-5.7-7-10.7V5.6L12 2.5Z"/></svg>',
  heal:'<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/></svg>',
  magic:'<svg viewBox="0 0 24 24"><path d="m13 2-2 7 5-2-7 15 2-9-5 2L13 2Z"/><path d="m18 3 .6 1.7L20 5l-1.4.5L18 7l-.5-1.5L16 5l1.5-.3L18 3Z"/></svg>',
  hide:'<svg viewBox="0 0 24 24"><path d="M4 8c2.5-3 13.5-3 16 0l-2 10c-2 2.5-4 3.5-6 3.5S8 20.5 6 18L4 8Z"/><path d="M7 12c1.2-1 2.7-1 4 0-1 2-3 2-4 0Zm6 0c1.3-1 2.8-1 4 0-1 2-3 2-4 0Z" class="cutout"/></svg>',
  charge:'<svg viewBox="0 0 24 24"><path d="M13 2 4 13h6l-1 9 10-13h-6V2Z"/></svg>',
  pass:'<svg viewBox="0 0 24 24"><path d="M5 3h14v3c0 3-2.2 5-4.8 6 2.6 1 4.8 3 4.8 6v3H5v-3c0-3 2.2-5 4.8-6C7.2 11 5 9 5 6V3Zm3 3c0 2 1.8 3.2 4 4 2.2-.8 4-2 4-4H8Zm4 8c-2.2.8-4 2-4 4h8c0-2-1.8-3.2-4-4Z"/></svg>'
};

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const ui={
  title:$('#title-screen'),form:$('#encounter-form') as HTMLFormElement,map:$('#map-size') as HTMLSelectElement,
  move:$('#move-speed') as HTMLInputElement,enemies:$('#enemy-count') as HTMLInputElement,players:$('#player-count') as HTMLInputElement,
  shell:$('#game-shell'),viewport:$('.battlefield-viewport'),battlefield:$('#battlefield'),frame:$('#battlefield-frame'),
  railDrawer:$('#initiative-drawer'),rail:$('#initiative-rail'),railToggle:$('#rail-toggle') as HTMLButtonElement,hotbar:$('#action-hotbar'),
  instruction:$('#instruction'),undo:$('#undo-action') as HTMLButtonElement,utilityToggle:$('#utility-toggle') as HTMLButtonElement,
  utilityPanel:$('#utility-panel'),zoomReset:$('#zoom-reset') as HTMLButtonElement,statsToggle:$('#stats-toggle') as HTMLButtonElement,
  logToggle:$('#log-toggle') as HTMLButtonElement,logPanel:$('#combat-log-panel'),logList:$('#combat-log-list'),logClose:$('#log-close') as HTMLButtonElement,
  setup:$('#setup-action') as HTMLButtonElement,restartOverlay:$('#restart-overlay') as HTMLButtonElement,setupOverlay:$('#setup-overlay') as HTMLButtonElement,
  drawer:$('#unit-drawer'),selectedName:$('#selected-name'),selectedClass:$('#selected-class'),selectedTeam:$('#selected-team'),
  health:$('#health-text'),attack:$('#attack-stat'),movement:$('#movement-stat'),initiative:$('#initiative-stat'),portrait:$('#portrait'),
  resultOverlay:$('#result-overlay'),resultTitle:$('#result-title'),resultCopy:$('#result-copy')
};

function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={}){
  const el=document.createElementNS(NS,tag) as SVGElementTagNameMap[K];
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  return el;
}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function pointKey(p:Point){return p.x+','+p.y;}
function copyUnit(u:Unit):Unit{return {...u,abilityUsed:[...u.abilityUsed]};}

class Game{
  config:EncounterConfig={map:'6x8',move:3,enemies:4,players:2};
  cols=6;rows=8;mapKey:MapKey='6x8';obstacles:Obstacle[]=[];units:Unit[]=[];
  selectedId='alden';round=1;turnOrder:string[]=[];activeIndex=0;gameOver=false;
  targetingMode?:TargetingMode;magicTargets=new Set<string>();history:Snapshot[]=[];logEntries:LogEntry[]=[];
  svg?:SVGSVGElement;world?:SVGGElement;routeLayer?:SVGGElement;tokenLayer?:SVGGElement;
  scale=1;tx=0;ty=0;cameraMode:'clean'|'follow'='clean';
  pointers=new Map<number,{x:number;y:number}>();
  gestureStart?:{distance:number;scale:number;anchor:Point;startClientMid:Point;lastMid:Point;mode:'undecided'|'pan'|'zoom'};
  drag?:{id:string;pointerId:number;origin:Point;token:SVGGElement};
  timerIds:number[]=[];busy=false;gestureActive=false;gestureSuppressUntil=0;railOpen=false;
  cameraDirty=false;

  constructor(){this.bindGlobal();}

  bindGlobal(){
    ui.form.addEventListener('submit',event=>{event.preventDefault();this.startFromForm();});
    ui.utilityToggle.addEventListener('click',()=>{const open=ui.utilityPanel.hidden;ui.utilityPanel.hidden=!open;ui.utilityToggle.setAttribute('aria-expanded',String(open));ui.utilityToggle.classList.toggle('open',open);});
    ui.railToggle.addEventListener('click',()=>this.toggleRail());
    ui.undo.addEventListener('click',()=>this.undo());
    ui.zoomReset.addEventListener('click',()=>this.resetCamera());
    ui.statsToggle.addEventListener('click',()=>{if(ui.shell.hidden||!ui.title.hidden)return;const open=ui.drawer.classList.toggle('open');ui.statsToggle.setAttribute('aria-expanded',String(open));});
    ui.logToggle.addEventListener('click',()=>{const open=ui.logPanel.hidden;ui.logPanel.hidden=!open;ui.logToggle.setAttribute('aria-expanded',String(open));this.renderLog();});
    ui.logClose.addEventListener('click',()=>this.closeLog());
    ui.setup.addEventListener('click',()=>this.showSetup());
    ui.setupOverlay.addEventListener('click',()=>this.showSetup());
    ui.restartOverlay.addEventListener('click',()=>this.startEncounter(this.config));
    window.addEventListener('resize',()=>this.layout());
  }

  startFromForm(){
    const map=(ui.map.value in MAPS?ui.map.value:'6x8') as MapKey;
    this.config={map,move:clamp(Number(ui.move.value)||3,2,8),enemies:clamp(Number(ui.enemies.value)||4,1,16),players:clamp(Number(ui.players.value)||2,1,6)};
    ui.move.value=String(this.config.move);ui.enemies.value=String(this.config.enemies);ui.players.value=String(this.config.players);
    this.startEncounter(this.config);
  }

  startEncounter(config:EncounterConfig){
    this.clearTimers();this.config={...config};this.mapKey=config.map;
    const map=MAPS[this.mapKey];this.cols=map.cols;this.rows=map.rows;
    this.units=this.makeUnits(config.players,config.enemies);
    this.obstacles=this.makeObstacles();
    this.round=1;this.activeIndex=0;this.gameOver=false;this.targetingMode=undefined;this.magicTargets.clear();this.history=[];this.logEntries=[];this.busy=false;this.railOpen=false;
    this.rollInitiative();this.selectedId=this.turnOrder[0]||this.units[0]?.id||'';
    this.scale=this.defaultScale();this.cameraMode=this.scale>1.01?'follow':'clean';this.tx=0;this.ty=0;this.cameraDirty=false;
    ui.title.hidden=true;ui.shell.hidden=false;ui.drawer.hidden=false;ui.resultOverlay.hidden=true;ui.drawer.classList.remove('open');ui.railDrawer.classList.remove('open');ui.railDrawer.setAttribute('aria-hidden','true');ui.railToggle.setAttribute('aria-expanded','false');this.closeLog();
    this.log('Round 1 begins.');this.render();this.beginTurn();
  }

  showSetup(){
    this.clearTimers();this.busy=false;ui.shell.hidden=true;ui.drawer.classList.remove('open');ui.drawer.hidden=true;ui.statsToggle.setAttribute('aria-expanded','false');ui.title.hidden=false;ui.resultOverlay.hidden=true;
  }

  makeUnits(playerCount:number,enemyCount:number){
    const out:Unit[]=[];
    const playerSpots=this.spawnCells(false);
    for(let i=0;i<playerCount;i++){
      const h=HEROES[i],p=playerSpots[i];
      out.push({...h,...p,initiativeScore:0,actionsUsed:0,defending:false,hiding:false,charged:false,abilityUsed:[]});
    }
    const occupied=new Set(out.map(pointKey));
    const enemySpots=this.spawnCells(true).filter(p=>!occupied.has(pointKey(p)));
    for(let i=0;i<enemyCount;i++){
      let p=enemySpots.splice(Math.floor(Math.random()*enemySpots.length),1)[0];
      if(!p)p=this.randomFreeCell(occupied);
      occupied.add(pointKey(p));const e=ENEMIES[Math.floor(Math.random()*ENEMIES.length)];
      out.push({id:'enemy-'+(i+1),name:e.name+' '+(i+1),role:e.role,team:'enemy',art:e.art,weapon:e.weapon,x:p.x,y:p.y,hp:e.hp,maxHp:e.hp,damage:e.damage,initiativeMod:e.initiativeMod,initiativeScore:0,actionsUsed:0,defending:false,hiding:false,charged:false,abilityUsed:[]});
    }
    return out;
  }

  spawnCells(enemy:boolean){
    const cells:Point[]=[];
    const rows=enemy?Array.from({length:Math.max(2,Math.ceil(this.rows*.42))},(_,i)=>i):Array.from({length:Math.max(2,Math.ceil(this.rows*.28))},(_,i)=>this.rows-1-i);
    const centre=(this.cols-1)/2;
    const xs=Array.from({length:this.cols},(_,x)=>x).sort((a,b)=>Math.abs(a-centre)-Math.abs(b-centre));
    for(const y of rows)for(const x of xs)cells.push({x,y});
    return cells;
  }

  randomFreeCell(occupied:Set<string>){
    const available:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(!occupied.has(x+','+y))available.push({x,y});
    return available[Math.floor(Math.random()*available.length)]||{x:0,y:0};
  }

  makeObstacles(){
    const reserved=new Set(this.units.map(pointKey));
    const obstacles:Obstacle[]=[];
    const target=Math.min(Math.floor(this.cols*this.rows*.1),Math.max(0,this.cols*this.rows-this.units.length-8));
    const candidates:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(!reserved.has(x+','+y))candidates.push({x,y});
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    const kinds=MAPS[this.mapKey].obstacleKinds;
    for(const p of candidates){
      if(obstacles.length>=target)break;
      const trial=[...obstacles,{...p,kind:kinds[Math.floor(Math.random()*kinds.length)]}];
      if(this.walkableConnected(trial))obstacles.splice(0,obstacles.length,...trial);
    }
    return obstacles;
  }

  walkableConnected(obstacles:Obstacle[]){
    const blocked=new Set(obstacles.map(pointKey));let start:Point|undefined,total=0;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(!blocked.has(x+','+y)){total++;start??={x,y};}
    if(!start)return false;const seen=new Set([pointKey(start)]),queue=[start];
    while(queue.length){const p=queue.shift()!;for(const n of this.neighbors(p))if(!blocked.has(pointKey(n))&&!seen.has(pointKey(n))){seen.add(pointKey(n));queue.push(n);}}
    return seen.size===total;
  }

  rollInitiative(){
    const rolls:string[]=[];
    for(const u of this.living()){const die=Math.floor(Math.random()*20)+1;u.initiativeScore=die+u.initiativeMod;rolls.push(u.name+': '+u.initiativeScore);}
    this.turnOrder=[...this.living()].sort((a,b)=>b.initiativeScore-a.initiativeScore||b.initiativeMod-a.initiativeMod).map(u=>u.id);
    this.log('Initiative — '+rolls.join(' · '));
  }

  active(){return this.unit(this.turnOrder[this.activeIndex]);}
  unit(id?:string){return id?this.units.find(u=>u.id===id&&u.hp>0):undefined;}
  selected(){return this.unit(this.selectedId);}
  living(team?:Team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
  visibleHeroes(){return this.living('player').filter(u=>!u.hiding);}
  hasAction(u:Unit){return u.actionsUsed<ACTIONS;}
  canMove(u:Unit){return u.actionsUsed===0;}
  moveRange(u:Unit){return this.config.move*(u.charged?2:1);}
  weaponKind(u:Unit){return u.weapon;}
  isActivePlayer(u:Unit){return !this.gameOver&&this.active()?.id===u.id&&u.team==='player';}
  defaultTilesWide(){return this.mapKey==='8x10'?8:DEFAULT_TILES_WIDE;}
  defaultScale(){return Math.max(1,this.cols/this.defaultTilesWide());}
  maxScale(){return Math.max(this.defaultScale(),this.cols/3);}

  beginTurn(){
    if(this.gameOver)return;
    while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;
    if(this.activeIndex>=this.turnOrder.length){
      this.round++;this.activeIndex=0;this.living().forEach(u=>u.actionsUsed=0);this.log('Round '+this.round+' begins.');
      while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;
    }
    const a=this.active();if(!a)return;a.actionsUsed=0;a.charged=false;a.defending=false;this.selectedId=a.id;this.targetingMode=undefined;this.magicTargets.clear();
    this.centerCamera((a.x+.5)*CELL,(a.y+.5)*CELL,this.scale);this.render();this.message(a.name+'\'s turn.');
    if(a.team==='enemy')this.schedule(440,()=>void this.runEnemy());
  }

  finishTurn(){
    if(this.gameOver)return;const a=this.active();if(a)a.charged=false;
    this.clearTimers();this.targetingMode=undefined;this.magicTargets.clear();this.activeIndex++;this.schedule(220,()=>this.beginTurn());
  }
  maybeFinish(u:Unit){if(u.actionsUsed>=ACTIONS)this.schedule(360,()=>this.finishTurn());}

  render(){
    const w=this.cols*CELL,h=this.rows*CELL;ui.battlefield.innerHTML='';
    const s=svg('svg',{class:'game-board',viewBox:'0 0 '+w+' '+h,preserveAspectRatio:'xMidYMin meet','aria-label':this.cols+' by '+this.rows+' tactical battlefield','data-map':this.mapKey});
    const world=svg('g',{class:'world'}),tiles=svg('g',{class:'tiles'}),highlights=svg('g',{class:'highlights'}),props=svg('g',{class:'props'}),route=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});
    world.append(tiles,highlights,props,route,tokens);s.appendChild(world);ui.battlefield.appendChild(s);this.svg=s;this.world=world;this.routeLayer=route;this.tokenLayer=tokens;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const cell=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:'tile','data-x':x,'data-y':y});
      cell.addEventListener('pointerup',event=>{if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if((event.target as Element).closest('.unit-token'))return;void this.handleCell(x,y);});tiles.appendChild(cell);
    }
    this.paintHighlights(highlights);
    for(const o of this.obstacles){const g=svg('g',{transform:'translate('+(o.x*CELL+CELL/2)+' '+(o.y*CELL+CELL/2)+')',class:'obstacle','data-kind':o.kind});g.appendChild(svg('rect',{x:-8,y:-8,width:16,height:16}));props.appendChild(g);}
    this.living().forEach(u=>tokens.appendChild(this.makeToken(u)));
    this.applyCamera();this.syncUI();this.layout();this.bindSvgGestures();
  }

  layout(){
    const vr=ui.viewport.getBoundingClientRect(),hotbar=ui.hotbar.getBoundingClientRect();
    const available=Math.max(240,vr.height-Math.max(98,hotbar.height));
    const aspect=this.mapKey==='8x10'?8/10:3/4,height=Math.min(available,vr.width/aspect);ui.frame.style.setProperty('--frame-aspect',String(aspect));
    ui.frame.style.width=Math.min(vr.width,height*aspect)+'px';ui.frame.style.height=height+'px';
  }

  makeToken(u:Unit){
    const classes=['unit-token',u.team,this.active()?.id===u.id?'active':'',u.hiding?'stealthed':''].filter(Boolean).join(' ');
    const g=svg('g',{class:classes,transform:'translate('+(u.x*CELL+CELL/2)+' '+(u.y*CELL+CELL/2)+')','data-id':u.id,'data-art':u.art});
    g.appendChild(svg('rect',{x:-8,y:-8,width:16,height:16,class:'token-outer'}));
    const hpBack=svg('rect',{x:-7,y:6,width:14,height:3,class:'hp-back'}),hp=svg('rect',{x:-6.5,y:6.5,width:13*(u.hp/u.maxHp),height:2,class:'hp-fill'});g.append(hpBack,hp);
    if(u.defending)g.appendChild(svg('g',{class:'shield-mark'}));
    if(u.hiding)g.appendChild(svg('g',{class:'hide-mark'}));
    g.addEventListener('pointerup',event=>{event.stopPropagation();if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if(this.drag&&this.drag.id===u.id)return;this.handleUnit(u.id);});
    if(u.team==='player')g.addEventListener('pointerdown',event=>this.beginDrag(event,u,g));
    return g;
  }

  paintHighlights(layer:SVGGElement){
    const s=this.selected(),a=this.active();if(!s)return;
    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+2,y:p.y*CELL+2,width:CELL-4,height:CELL-4,rx:2,class:cls}));
    if(this.targetingMode&&a?.team==='player'){
      if(this.targetingMode==='heal'){for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.distance(a,{x,y})<=HEAL_RANGE)add({x,y},'spell-range');this.living('player').filter(u=>this.distance(a,u)<=HEAL_RANGE&&u.hp<u.maxHp).forEach(u=>add(u,'heal-target'));return;}
      if(this.targetingMode==='magic'){this.living('enemy').forEach(u=>add(u,this.magicTargets.has(u.id)?'magic-selected':'magic-target'));return;}
      const kind=this.weaponKind(a);for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.inWeaponRange(a,{x,y},kind))add({x,y},'weapon-range');
      this.living('enemy').filter(u=>this.canAttack(a,u,kind)).forEach(u=>add(u,'attack-range'));return;
    }
    if(s.team==='enemy'){this.reachable(s,this.moveRange(s)).forEach(p=>add(p,'enemy-range'));return;}
    if(!this.isActivePlayer(s)||!this.canMove(s))return;
    for(const o of this.obstacles)add(o,'blocked-range');
    this.reachable(s,this.moveRange(s)).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});
  }

  bindSvgGestures(){
    if(!this.svg)return;const s=this.svg;
    s.onpointerdown=event=>{if((event.target as Element).closest('.unit-token'))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});try{s.setPointerCapture(event.pointerId);}catch{}if(this.pointers.size===2){this.gestureActive=true;this.gestureSuppressUntil=performance.now()+500;this.beginGesture();}};
    s.onpointermove=event=>{if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(this.pointers.size===2)this.updateGesture();};
    const end=(event:PointerEvent)=>{this.pointers.delete(event.pointerId);if(this.pointers.size<2){this.gestureStart=undefined;this.gestureActive=false;this.gestureSuppressUntil=performance.now()+500;}};
    s.onpointerup=end;s.onpointercancel=end;
  }

  rootPoint(clientX:number,clientY:number){
    if(!this.svg)return{x:0,y:0};const p=this.svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=this.svg.getScreenCTM();if(!ctm)return{x:0,y:0};const q=p.matrixTransform(ctm.inverse());return{x:q.x,y:q.y};
  }
  clampCamera(){
    const w=this.cols*CELL,h=this.rows*CELL,rect=ui.frame.getBoundingClientRect(),visibleW=w,visibleH=rect.width>0?rect.height/rect.width*w:h;
    const limit=(offset:number,size:number,visible:number)=>size*this.scale<=visible?(visible-size*this.scale)/2:Math.min(0,Math.max(visible-size*this.scale,offset));
    this.tx=limit(this.tx,w,visibleW);this.ty=limit(this.ty,h,visibleH);
  }
  centerCamera(x:number,y:number,scale=this.scale){
    this.scale=clamp(scale,1,this.maxScale());const w=this.cols*CELL,rect=ui.frame.getBoundingClientRect(),visibleH=rect.width>0?rect.height/rect.width*w:this.rows*CELL;this.tx=w/2-x*this.scale;this.ty=visibleH/2-y*this.scale;this.clampCamera();
  }
  resetCamera(){
    const a=this.active()??this.selected();this.cameraMode=this.defaultScale()>1.01?'follow':'clean';
    if(a)this.centerCamera((a.x+.5)*CELL,(a.y+.5)*CELL,this.defaultScale());else{this.scale=this.defaultScale();this.tx=0;this.ty=0;}
    this.cameraDirty=false;this.applyCamera();this.syncUI();
  }
  beginGesture(){
    const pts=[...this.pointers.values()];if(pts.length<2)return;
    const clientMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},mid=this.rootPoint(clientMid.x,clientMid.y);
    this.gestureStart={distance:Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),scale:this.scale,anchor:{x:(mid.x-this.tx)/this.scale,y:(mid.y-this.ty)/this.scale},startClientMid:clientMid,lastMid:mid,mode:'undecided'};
  }
  updateGesture(){
    const g=this.gestureStart;if(!g)return;const pts=[...this.pointers.values()];if(pts.length<2)return;
    const clientMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},mid=this.rootPoint(clientMid.x,clientMid.y),distance=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),ratio=distance/g.distance,travel=Math.hypot(clientMid.x-g.startClientMid.x,clientMid.y-g.startClientMid.y);
    if(g.mode==='undecided'){if(Math.abs(Math.log(ratio))>.045)g.mode='zoom';else if(travel>9)g.mode='pan';else return;this.cameraMode='follow';this.cameraDirty=true;}
    if(g.mode==='pan'){this.tx+=mid.x-g.lastMid.x;this.ty+=mid.y-g.lastMid.y;g.lastMid=mid;}else{const next=clamp(g.scale*ratio,1,this.maxScale());this.scale=next;this.tx=mid.x-g.anchor.x*next;this.ty=mid.y-g.anchor.y*next;}
    this.clampCamera();this.applyCamera();this.syncUI();
  }
  applyCamera(){this.world?.setAttribute('transform','translate('+this.tx+' '+this.ty+') scale('+this.scale+')');}
  followToken(x:number,y:number){if(this.cameraMode!=='follow'||this.scale<=1.01)return;this.centerCamera(x,y);this.applyCamera();}
  svgPoint(clientX:number,clientY:number){
    if(!this.svg)return{x:0,y:0};const p=this.svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=this.world?.getScreenCTM();if(!ctm)return{x:0,y:0};const q=p.matrixTransform(ctm.inverse());return{x:q.x,y:q.y};
  }

  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){
    if(!this.isActivePlayer(u)||!this.canMove(u)||this.busy||this.targetingMode||this.gestureActive)return;
    e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);document.documentElement.classList.add('piece-dragging');
    const block=(event:TouchEvent)=>event.preventDefault();document.addEventListener('touchmove',block,{passive:false});
    this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;
    const ghost=g.cloneNode(true) as SVGGElement;ghost.dataset.id=u.id;ghost.classList.add('drag-ghost');ghost.style.pointerEvents='none';this.tokenLayer?.appendChild(ghost);let approach={x:u.x,y:u.y};
    const cleanup=()=>{document.removeEventListener('touchmove',block);document.documentElement.classList.remove('piece-dragging');};
    const routeFor=(d:Point)=>{const r=this.findRoute(u,d,u.id);return r.length>1&&r.length-1<=this.moveRange(u)?r:[];};
    const planFor=(target:Unit,entry:Point=approach)=>{
      const kind=this.weaponKind(u),range=kind==='ranged'?RANGED_RANGE:1;if(this.canAttack(u,target,kind))return{route:[{x:u.x,y:u.y}],kind};
      let dx=entry.x-target.x,dy=entry.y-target.y;if(dx===0&&dy===0){dx=u.x-target.x;dy=u.y-target.y;}
      const dir=Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx)||1,y:0}:{x:0,y:Math.sign(dy)||1},preferred={x:target.x+dir.x*range,y:target.y+dir.y*range};
      const preferredRoute=this.validDestination(preferred,u.id)?this.findRoute(u,preferred,u.id):[];
      if(preferredRoute.length>1&&preferredRoute.length-1<=this.moveRange(u))return{route:preferredRoute,kind};
      let best:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const spot={x,y};if(!this.inWeaponRange(spot,target,kind)||!this.validDestination(spot,u.id))continue;const r=this.findRoute(u,spot,u.id);if(r.length>1&&r.length-1<=this.moveRange(u)&&(!best.length||r.length<best.length))best=r;}
      return best.length?{route:best,kind}:undefined;
    };
    const move=(event:PointerEvent)=>{if(!this.drag||event.pointerId!==this.drag.pointerId)return;event.preventDefault();const p=this.svgPoint(event.clientX,event.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);if(target?.team!=='enemy'&&this.inBounds(d))approach=d;ghost.setAttribute('transform','translate('+p.x+' '+p.y+')');const plan=target?.team==='enemy'?planFor(target,approach):undefined;if(target?.team==='enemy'&&plan){this.drawRoute(plan.route);this.drawAttackCue(target,plan.kind);}else this.drawRoute(routeFor(d));};
    const finish=(event:PointerEvent)=>{event.preventDefault();g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();const p=this.svgPoint(event.clientX,event.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'){const plan=planFor(target,approach);if(plan){void this.moveThenAttack(u,target,plan.route,plan.kind);return;}}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=this.moveRange(u)&&!target)void this.moveActive(u,r);else this.render();};
    const cancel=()=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();this.drag=undefined;this.render();};
    g.addEventListener('pointermove',move);g.addEventListener('pointerup',finish);g.addEventListener('pointercancel',cancel);
  }

  async moveThenAttack(u:Unit,target:Unit,route:Point[],kind:Weapon){
    if(route.length>1){this.record();u.defending=false;this.busy=true;this.drawRoute(route);const token=this.tokenElement(u.id);if(token)await this.animateRoute(token,route,130);const end=route[route.length-1];u.x=end.x;u.y=end.y;u.actionsUsed=1;this.busy=false;this.render();}
    await this.attack(u,target,kind);
  }

  async handleCell(x:number,y:number){
    if(this.busy||this.gameOver)return;
    if(this.targetingMode){this.targetingMode=undefined;this.magicTargets.clear();this.render();this.message('Action cancelled.');return;}
    const a=this.active();if(!a||a.team!=='player'||!this.canMove(a))return;const target=this.at(x,y);if(target)return;const r=this.findRoute(a,{x,y},a.id);if(r.length>1&&r.length-1<=this.moveRange(a))await this.moveActive(a,r);
  }

  handleUnit(id:string){
    if(this.busy||this.gameOver)return;const t=this.unit(id);if(!t)return;const a=this.active();
    if(this.targetingMode&&a?.team==='player'){
      if(this.targetingMode==='heal'){if(t.team==='player'&&this.distance(a,t)<=HEAL_RANGE&&t.hp<t.maxHp)this.healTarget(t);else this.message('Choose an injured hero within one square.');return;}
      if(this.targetingMode==='magic'){if(t.team!=='enemy')return;if(this.magicTargets.has(t.id))this.magicTargets.delete(t.id);else if(this.magicTargets.size<3)this.magicTargets.add(t.id);if(this.magicTargets.size===3)void this.castMagicMissile();else{this.render();this.message('Choose up to three enemies, then tap Magic Missile again.');}return;}
      const kind=this.weaponKind(a);if(t.team==='enemy'&&this.canAttack(a,t,kind)){void this.attack(a,t,kind);return;}this.message(kind==='ranged'?'Choose an enemy two squares away in a straight line.':'Choose an adjacent enemy.');return;
    }
    this.targetingMode=undefined;this.magicTargets.clear();this.selectedId=id;this.render();
  }

  beginTargeting(kind:TargetingMode){
    const a=this.active();if(!a||a.team!=='player'||!this.hasAction(a)||this.busy)return;
    if(this.targetingMode===kind){if(kind==='magic'&&this.magicTargets.size){void this.castMagicMissile();return;}this.targetingMode=undefined;this.magicTargets.clear();this.render();this.message('Action cancelled.');return;}
    this.targetingMode=kind;this.magicTargets.clear();this.selectedId=a.id;this.render();
    this.message(kind==='heal'?'Choose an injured hero within one square.':kind==='magic'?'Choose up to three enemies, then tap Magic Missile again.':this.weaponKind(a)==='ranged'?'Choose an enemy two squares away in a straight line.':'Choose an adjacent enemy.');
  }

  inWeaponRange(a:Point,b:Point,kind:Weapon){const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);return kind==='ranged'?((dx===RANGED_RANGE&&dy===0)||(dy===RANGED_RANGE&&dx===0)):dx+dy===1;}
  canAttack(a:Unit,t:Unit,kind:Weapon=this.weaponKind(a)){return this.hasAction(a)&&a.team!==t.team&&this.inWeaponRange(a,t,kind);}
  attackDamage(a:Unit,t:Unit){const hiddenBonus=a.hiding?2:1;return Math.max(0,a.damage*hiddenBonus-(t.defending?1:0));}

  record(){
    const a=this.active();if(a?.team!=='player')return;const last=this.history[this.history.length-1];if(last?.round===this.round&&last.activeIndex===this.activeIndex)return;
    this.history.push({units:this.units.map(copyUnit),selectedId:this.selectedId,round:this.round,activeIndex:this.activeIndex,logEntries:this.logEntries.map(e=>({...e}))});if(this.history.length>30)this.history.shift();
  }
  undo(){
    const a=this.active();if(!a||a.team!=='player'||!this.history.length||this.busy)return;this.clearTimers();const snap=this.history.pop()!;
    this.units=snap.units.map(copyUnit);this.selectedId=snap.selectedId;this.round=snap.round;this.activeIndex=snap.activeIndex;this.logEntries=snap.logEntries.map(e=>({...e}));this.targetingMode=undefined;this.magicTargets.clear();this.busy=false;this.gameOver=false;ui.resultOverlay.hidden=true;this.renderLog();this.render();this.message('Rewound to '+(this.active()?.name||'the hero')+'\'s last decision.');
  }

  async moveActive(u:Unit,route:Point[]){
    if(!this.isActivePlayer(u)||!this.canMove(u)||this.busy)return;this.record();u.defending=false;this.busy=true;this.drawRoute(route);const token=this.tokenElement(u.id);if(token)await this.animateRoute(token,route,130);const end=route[route.length-1];u.x=end.x;u.y=end.y;u.actionsUsed=1;this.busy=false;this.render();this.message('Choose an action.');
  }
  async moveEnemy(u:Unit,route:Point[]){
    u.defending=false;this.busy=true;this.drawRoute(route,true);const token=this.tokenElement(u.id);if(token)await this.animateRoute(token,route,125);const end=route[route.length-1];u.x=end.x;u.y=end.y;u.actionsUsed=1;this.busy=false;this.render();
  }
  animateRoute(g:SVGGElement,route:Point[],stepMs:number){return(async()=>{for(const p of route.slice(1)){const start=this.tokenTranslation(g),end={x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2};await this.tween(stepMs,t=>{const eased=.5-.5*Math.cos(Math.PI*t),x=start.x+(end.x-start.x)*eased,y=start.y+(end.y-start.y)*eased;g.setAttribute('transform','translate('+x+' '+y+')');this.followToken(x,y);});}})();}
  tokenTranslation(g:SVGGElement){const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(g.getAttribute('transform')||'');return{x:match?Number(match[1]):0,y:match?Number(match[2]):0};}
  tween(ms:number,update:(t:number)=>void){return new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-start)/ms);update(t);if(t<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});}

  async attack(a:Unit,t:Unit,kind:Weapon=this.weaponKind(a)){
    if(!this.canAttack(a,t,kind)||this.busy)return;if(a.team==='player')this.record();const wasHidden=a.hiding;a.defending=false;a.hiding=false;this.busy=true;
    const token=this.tokenElement(a.id);if(token){const start=this.tokenTranslation(token),target={x:t.x*CELL+CELL/2,y:t.y*CELL+CELL/2},dx=target.x-start.x,dy=target.y-start.y,len=Math.hypot(dx,dy)||1,lunge={x:start.x+dx/len*(kind==='ranged'?3:6),y:start.y+dy/len*(kind==='ranged'?3:6)};await this.tween(80,q=>token.setAttribute('transform','translate('+(start.x+(lunge.x-start.x)*q)+' '+(start.y+(lunge.y-start.y)*q)+')'));await this.tween(90,q=>token.setAttribute('transform','translate('+(lunge.x+(start.x-lunge.x)*q)+' '+(lunge.y+(start.y-lunge.y)*q)+')'));}
    const rect=this.tokenElement(t.id)?.getBoundingClientRect();a.actionsUsed=2;const dmg=Math.max(0,a.damage*(wasHidden?2:1)-(t.defending?1:0));t.defending=false;t.hp=Math.max(0,t.hp-dmg);
    this.log(a.name+' attacks '+t.name+' for '+dmg+' damage'+(wasHidden?' from hiding':'')+(t.hp<=0?' — defeated':'')+'.');this.selectedId=a.id;this.targetingMode=undefined;this.busy=false;this.checkGameOver();this.render();this.showFloating(t,'−'+dmg,'damage',rect);if(!this.gameOver)this.maybeFinish(a);
  }

  healTarget(t:Unit){
    const u=this.active();if(!u||u.id!=='mira'||t.team!=='player'||!this.hasAction(u)||this.distance(u,t)>HEAL_RANGE||t.hp>=t.maxHp||this.busy)return;
    this.record();const amount=Math.min(HEAL,t.maxHp-t.hp);t.hp+=amount;u.actionsUsed=2;this.targetingMode=undefined;this.log(u.name+' heals '+t.name+' for '+amount+' HP.');this.selectedId=t.id;this.render();this.showFloating(t,'+'+amount,'healing');this.maybeFinish(u);
  }
  defendSelected(){const u=this.active();if(u?.team==='player'&&this.hasAction(u)&&!u.defending&&!this.busy)this.defendUnit(u,true);}
  defendUnit(u:Unit,save=false){if(save)this.record();u.defending=true;u.actionsUsed=2;this.targetingMode=undefined;this.log(u.name+' uses Defend.');this.render();this.maybeFinish(u);}
  passTurn(){const u=this.active();if(!u||u.team!=='player'||this.busy)return;this.record();u.actionsUsed=ACTIONS;this.targetingMode=undefined;this.magicTargets.clear();this.log(u.name+' passes.');this.render();this.maybeFinish(u);}

  hideSelected(){
    const u=this.active();if(!u||u.id!=='nox'||!this.hasAction(u)||this.busy)return;this.record();const success=Math.random()<.75;u.actionsUsed=2;u.defending=false;u.hiding=success;this.log(u.name+(success?' slips into hiding.':' fails to hide.'));this.render();this.showFloating(u,success?'SUCCESS':'FAIL',success?'success':'failure');this.maybeFinish(u);
  }
  chargeSelected(){
    const u=this.active();if(!u||u.id!=='garrick'||u.abilityUsed.includes('charge')||!this.canMove(u)||this.busy)return;this.record();u.abilityUsed.push('charge');u.charged=true;this.log(u.name+' prepares to Charge.');this.render();this.message('Charge active: movement doubled this turn.');
  }
  async castMagicMissile(){
    const u=this.active();if(!u||u.id!=='lyra'||u.abilityUsed.includes('magic')||!this.hasAction(u)||!this.magicTargets.size||this.busy)return;
    this.record();const targets=[...this.magicTargets].map(id=>this.unit(id)).filter(Boolean) as Unit[],rects=new Map(targets.map(t=>[t.id,this.tokenElement(t.id)?.getBoundingClientRect()]));
    u.abilityUsed.push('magic');u.actionsUsed=2;this.targetingMode=undefined;this.magicTargets.clear();
    for(const t of targets){t.defending=false;t.hp=Math.max(0,t.hp-2);}
    this.log(u.name+' casts Magic Missile at '+targets.map(t=>t.name).join(', ')+'.');this.checkGameOver();this.render();targets.forEach(t=>this.showFloating(t,'−2','damage',rects.get(t.id)));if(!this.gameOver)this.maybeFinish(u);
  }

  routeToRange(u:Unit,t:Unit,kind:Weapon){
    let best:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x,y};if(!this.inWeaponRange(p,t,kind)||!this.validDestination(p,u.id))continue;const route=this.findRoute(u,p,u.id);if(route.length&&(!best.length||route.length<best.length))best=route;}return best;
  }
  async runEnemy(){
    const enemy=this.active();if(!enemy||enemy.team!=='enemy'||this.gameOver||this.busy)return;this.selectedId=enemy.id;this.render();
    const candidates=this.visibleHeroes();if(!candidates.length){this.schedule(280,()=>this.defendUnit(enemy));return;}
    const kind=this.weaponKind(enemy);let target:Unit|undefined,best:Point[]=[];
    for(const hero of candidates){const route=this.routeToRange(enemy,hero,kind);if(route.length&&(!best.length||route.length<best.length)){target=hero;best=route;}}
    target??=[...candidates].sort((a,b)=>this.distance(enemy,a)-this.distance(enemy,b))[0];if(!target){this.finishTurn();return;}
    if(this.canAttack(enemy,target,kind)){this.showEnemyAttack(target,kind,()=>void this.attack(enemy,target!,kind));return;}
    if(best.length>1){await this.moveEnemy(enemy,best.slice(0,Math.min(best.length,this.moveRange(enemy)+1)));}
    const live=this.unit(target.id);if(live&&this.canAttack(enemy,live,kind))this.showEnemyAttack(live,kind,()=>void this.attack(enemy,live,kind));else this.schedule(300,()=>this.defendUnit(enemy));
  }

  drawRoute(route:Point[],enemy=false){
    if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(route.length<2)return;
    const centres=route.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2})),first=centres[0],last=centres[centres.length-1],before=centres[centres.length-2];
    const dx=last.x-before.x,dy=last.y-before.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,shaft={x:last.x-ux*2,y:last.y-uy*2};
    let d='M '+first.x+' '+first.y;const points=[...centres.slice(1,-1),shaft],radius=4;
    for(let i=0;i<points.length;i++){const corner=points[i];if(i===points.length-1){d+=' L '+corner.x+' '+corner.y;break;}const prior=i===0?first:points[i-1],after=points[i+1],aLen=Math.hypot(corner.x-prior.x,corner.y-prior.y)||1,bLen=Math.hypot(after.x-corner.x,after.y-corner.y)||1,r=Math.min(radius,aLen/2,bLen/2),enter={x:corner.x-(corner.x-prior.x)/aLen*r,y:corner.y-(corner.y-prior.y)/aLen*r},exit={x:corner.x+(after.x-corner.x)/bLen*r,y:corner.y+(after.y-corner.y)/bLen*r};d+=' L '+enter.x+' '+enter.y+' Q '+corner.x+' '+corner.y+' '+exit.x+' '+exit.y;}
    const tip={x:last.x+ux*4,y:last.y+uy*4},base={x:last.x-ux*6,y:last.y-uy*6},head=tip.x+','+tip.y+' '+(base.x+px*4.5)+','+(base.y+py*4.5)+' '+(base.x-px*4.5)+','+(base.y-py*4.5),colour=enemy?'#e14654':'#33c4e8',group=svg('g',{class:'route-arrow '+(enemy?'enemy':''),opacity:.68});
    group.append(svg('path',{d,fill:'none',stroke:colour,'stroke-width':4.8,'stroke-linecap':'round','stroke-linejoin':'round'}),svg('polygon',{points:head,fill:colour}));this.routeLayer.appendChild(group);
  }
  drawAttackCue(t:Unit,kind:Weapon){
    if(!this.routeLayer)return;const q={x:t.x*CELL+CELL/2+5,y:t.y*CELL+CELL/2-8},cue=svg('g',{transform:'translate('+q.x+' '+q.y+')',class:'attack-action-cue '+kind}),icon=svg('g',{class:'attack-cue-icon'});cue.appendChild(svg('circle',{cx:0,cy:0,r:4.7}));
    if(kind==='melee')for(const angle of[-43,43]){const sword=svg('g',{transform:'rotate('+angle+')'});sword.append(svg('path',{d:'M 0 -4.6 L 1 -3.45 L .65 1.15 L -.65 1.15 L -1 -3.45 Z'}),svg('rect',{x:-1.8,y:1,width:3.6,height:.8}),svg('rect',{x:-.55,y:1.65,width:1.1,height:2.25}),svg('circle',{cx:0,cy:4,r:.65}));icon.appendChild(sword);}else icon.appendChild(svg('path',{d:'M -.62 4.1 L .62 4.1 L .62 -1.15 L 2.35 -1.15 L 0 -4.25 L -2.35 -1.15 L -.62 -1.15 Z',transform:'rotate(42)'}));
    cue.appendChild(icon);this.routeLayer.appendChild(cue);
  }
  showEnemyAttack(t:Unit,kind:Weapon,act:()=>void){this.render();this.drawAttackCue(t,kind);this.schedule(460,act);}
  tokenElement(id:string){return this.tokenLayer?.querySelector<SVGGElement>('.unit-token[data-id="'+id+'"]');}

  validDestination(p:Point,movingId:string){const occupant=this.at(p.x,p.y);return this.inBounds(p)&&!this.isObstacle(p.x,p.y)&&(!occupant||occupant.id===movingId);}
  findRoute(start:Point,d:Point,movingId:string){
    if(!this.validDestination(d,movingId))return[];const queue:Point[]=[{...start}],prev=new Map<string,Point|null>([[pointKey(start),null]]);
    while(queue.length){const cur=queue.shift()!;if(pointKey(cur)===pointKey(d))break;for(const n of this.neighbors(cur)){const occupied=this.at(n.x,n.y);if(prev.has(pointKey(n))||this.isObstacle(n.x,n.y)||(occupied&&occupied.id!==movingId))continue;prev.set(pointKey(n),cur);queue.push(n);}}
    if(!prev.has(pointKey(d)))return[];const out:Point[]=[];let cur:Point|null={...d};while(cur){out.unshift(cur);cur=prev.get(pointKey(cur))??null;}return out;
  }
  reachable(u:Unit,max:number){const out:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){if(!this.validDestination({x,y},u.id))continue;const route=this.findRoute(u,{x,y},u.id);if(route.length&&route.length-1<=max)out.push({x,y});}return out;}
  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  inBounds(p:Point){return p.x>=0&&p.y>=0&&p.x<this.cols&&p.y<this.rows;}
  neighbors(p:Point){return[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>this.inBounds(n));}

  toggleRail(){
    this.railOpen=!this.railOpen;ui.railDrawer.classList.toggle('open',this.railOpen);ui.railDrawer.setAttribute('aria-hidden',String(!this.railOpen));ui.railToggle.setAttribute('aria-expanded',String(this.railOpen));ui.railToggle.classList.toggle('open',this.railOpen);
  }
  spriteClass(art:string){return 'sprite-'+art.replace('-','');}
  renderHotbar(){
    ui.hotbar.innerHTML='';const a=this.active();if(!a||a.team!=='player'||this.gameOver)return;
    const button=(id:string,label:string,icon:string,handler:()=>void,disabled=false,active=false)=>{
      const b=document.createElement('button');b.type='button';b.className='hotbar-action'+(active?' selected':'');b.dataset.action=id;b.disabled=disabled;b.innerHTML='<span class="hotbar-icon">'+icon+'</span><b>'+label+'</b>';b.addEventListener('click',handler);ui.hotbar.appendChild(b);
    };
    const canAct=this.hasAction(a),kind=this.weaponKind(a),hasTarget=this.living('enemy').some(t=>this.canAttack(a,t,kind));
    button('attack','Attack',ICONS.attack,()=>this.beginTargeting('attack'),!canAct||!hasTarget,this.targetingMode==='attack');
    button('defend','Defend',ICONS.defend,()=>this.defendSelected(),!canAct||a.defending);
    if(a.id==='mira')button('heal','Heal',ICONS.heal,()=>this.beginTargeting('heal'),!canAct||!this.living('player').some(u=>this.distance(a,u)<=HEAL_RANGE&&u.hp<u.maxHp),this.targetingMode==='heal');
    if(a.id==='lyra'&&!a.abilityUsed.includes('magic'))button('magic','Magic Missile'+(this.magicTargets.size?' '+this.magicTargets.size+'/3':''),ICONS.magic,()=>this.beginTargeting('magic'),!canAct,this.targetingMode==='magic');
    if(a.id==='nox'&&!a.hiding)button('hide','Hide',ICONS.hide,()=>this.hideSelected(),!canAct);
    if(a.id==='garrick'&&!a.abilityUsed.includes('charge'))button('charge',a.charged?'Charged':'Charge',ICONS.charge,()=>this.chargeSelected(),!this.canMove(a),a.charged);
    button('pass','Pass',ICONS.pass,()=>this.passTurn(),this.busy);
  }
  syncUI(){
    const a=this.active(),selected=this.selected()??a??this.living()[0];ui.undo.disabled=!a||a.team!=='player'||!this.history.length;ui.zoomReset.disabled=!this.cameraDirty;
    if(selected){ui.drawer.dataset.team=selected.team;ui.selectedName.textContent=selected.name;ui.selectedClass.textContent=selected.role;ui.selectedTeam.textContent=selected.team==='player'?'Hero':'Enemy';ui.health.textContent=selected.hp+' / '+selected.maxHp;ui.attack.textContent=String(selected.damage);ui.movement.textContent=String(this.moveRange(selected));ui.initiative.textContent=(selected.initiativeMod>=0?'+':'')+selected.initiativeMod+' ('+selected.initiativeScore+')';ui.portrait.className='portrait '+this.spriteClass(selected.art);ui.portrait.dataset.id=selected.id;}
    ui.rail.innerHTML='';
    for(const [index,id] of this.turnOrder.entries()){const u=this.unit(id);if(!u)continue;const b=document.createElement('button');b.type='button';b.className='initiative-token '+u.team+(index===this.activeIndex?' active':'')+(u.id===this.selectedId?' selected':'');b.dataset.id=u.id;b.setAttribute('aria-label',u.name+(index===this.activeIndex?', current turn':''));b.innerHTML='<span class="rail-sprite '+this.spriteClass(u.art)+'"></span><small>'+u.name+'</small>';b.addEventListener('click',()=>{this.targetingMode=undefined;this.magicTargets.clear();this.selectedId=u.id;this.cameraMode=this.defaultScale()>1.01?'follow':'clean';this.centerCamera((u.x+.5)*CELL,(u.y+.5)*CELL,this.defaultScale());this.cameraDirty=false;this.render();});ui.rail.appendChild(b);}
    const current=ui.rail.querySelector<HTMLElement>('.active');if(current&&this.railOpen)requestAnimationFrame(()=>current.scrollIntoView({behavior:'smooth',block:'center'}));this.renderHotbar();
  }

  checkGameOver(){
    const heroes=this.living('player'),enemies=this.living('enemy');if(heroes.length&&enemies.length)return;this.gameOver=true;this.clearTimers();ui.resultOverlay.hidden=false;ui.resultTitle.textContent=heroes.length?'Victory':'Defeat';ui.resultCopy.textContent=heroes.length?'The field is secure.':'The company has fallen.';this.log(heroes.length?'Victory.':'Defeat.');
  }
  showFloating(u:Unit,text:string,kind:'damage'|'healing'|'success'|'failure',anchor?:DOMRect){
    requestAnimationFrame(()=>{const rect=anchor??this.tokenElement(u.id)?.getBoundingClientRect();if(!rect)return;const vr=ui.viewport.getBoundingClientRect(),el=document.createElement('span');el.className='combat-float '+kind;el.textContent=text;el.style.left=rect.left-vr.left+rect.width/2+'px';el.style.top=rect.top-vr.top-2+'px';ui.viewport.appendChild(el);window.setTimeout(()=>el.remove(),1000);});
  }
  log(text:string){this.logEntries.push({round:this.round,text});this.renderLog();}
  renderLog(){ui.logList.innerHTML='';for(const entry of this.logEntries){const row=document.createElement('div');row.className='log-entry';row.innerHTML='<b>R'+entry.round+'</b><span>'+entry.text+'</span>';ui.logList.appendChild(row);}ui.logList.scrollTop=ui.logList.scrollHeight;}
  closeLog(){ui.logPanel.hidden=true;ui.logToggle.setAttribute('aria-expanded','false');}
  message(text:string){ui.instruction.textContent=text;}
  schedule(ms:number,fn:()=>void){const id=window.setTimeout(()=>{this.timerIds=this.timerIds.filter(value=>value!==id);fn();},ms);this.timerIds.push(id);}
  clearTimers(){this.timerIds.forEach(clearTimeout);this.timerIds=[];}
}

new Game();
