import './phaser.css';
import {TACTICAL_COLS,TACTICAL_ROWS,TACTICAL_OBSTACLES} from './tacticalMap';

type Team='player'|'enemy';
type Mode='tactical'|'exploration';
type GameMode='combat'|'explore';
type CameraMode='clean'|'follow';
type TargetingMode='attack'|'heal';
type Point={x:number;y:number};
type Unit=Point&{id:string;name:string;team:Team;hp:number;maxHp:number;damage:number;initiativeMod:number;initiativeScore:number;actionsUsed:number;defending:boolean};
type Snapshot={units:Unit[];selectedId:string;round:number;activeIndex:number;logEntries:string[]};
type PendingAttack={actorId:string;targetId:string;kind:'melee'|'ranged'};

type Prototype={cols:number;rows:number;obstacles:Point[];units:Array<Omit<Unit,'initiativeScore'|'actionsUsed'|'defending'>>};

const CELL=16,MOVE=3,ACTIONS=2,HEAL=2,RANGED_RANGE=2,HEAL_RANGE=1,ENCOUNTER_DISTANCE=4,DEFAULT_TILES_WIDE=6,MIN_SCALE=1;
const NS='http://www.w3.org/2000/svg';
const START_PARTY={x:15,y:24};
const PROTOTYPES:Record<Mode,Prototype>={
  tactical:{cols:TACTICAL_COLS,rows:TACTICAL_ROWS,obstacles:TACTICAL_OBSTACLES,units:[
    {id:'alden',name:'Aldren',team:'player',x:2,y:7,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',team:'player',x:3,y:7,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'Goblin Raider',team:'enemy',x:1,y:1,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Goblin Skirmisher',team:'enemy',x:4,y:1,hp:3,maxHp:3,damage:1,initiativeMod:0},
    {id:'raider-3',name:'Goblin Archer',team:'enemy',x:1,y:4,hp:3,maxHp:3,damage:1,initiativeMod:3},
    {id:'raider-4',name:'Goblin Brute',team:'enemy',x:4,y:4,hp:4,maxHp:4,damage:2,initiativeMod:-1}
  ]},
  exploration:{cols:30,rows:30,obstacles:[{x:15,y:18}],units:[
    {id:'alden',name:'Aldren',team:'player',x:14,y:20,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',team:'player',x:16,y:21,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'Goblin Raider',team:'enemy',x:14,y:15,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Goblin Skirmisher',team:'enemy',x:17,y:17,hp:3,maxHp:3,damage:1,initiativeMod:0}
  ]}
};

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const ui={
  viewport:$('.battlefield-viewport'),battlefield:$('#battlefield'),frame:$('#battlefield-frame'),rail:$('#initiative-rail'),instruction:$('#instruction'),
  undo:$('#undo-action') as HTMLButtonElement,utilityToggle:$('#utility-toggle') as HTMLButtonElement,utilityPanel:$('#utility-panel'),
  actionBar:$('#action-bar'),actionToggle:$('#action-toggle') as HTMLButtonElement,zoomReset:$('#zoom-reset') as HTMLButtonElement,attackAction:$('#attack-action') as HTMLButtonElement,heal:$('#heal-action') as HTMLButtonElement,defend:$('#defend-action') as HTMLButtonElement,
  statsToggle:$('#stats-toggle') as HTMLButtonElement,logToggle:$('#log-toggle') as HTMLButtonElement,logPanel:$('#combat-log-panel'),logList:$('#combat-log-list'),logClose:$('#log-close') as HTMLButtonElement,
  restart:$('#restart') as HTMLButtonElement,restartOverlay:$('#restart-overlay') as HTMLButtonElement,tactical:$('#tactical-mode') as HTMLButtonElement,exploration:$('#exploration-mode') as HTMLButtonElement,settings:$('#settings-menu') as HTMLDetailsElement,
  drawer:$('#unit-drawer'),selectedName:$('#selected-name'),selectedTeam:$('#selected-team'),health:$('#health-text'),attack:$('#attack-stat'),movement:$('#movement-stat'),initiative:$('#initiative-stat'),portrait:$('#portrait'),
  resultOverlay:$('#result-overlay'),resultTitle:$('#result-title'),resultCopy:$('#result-copy'),forecast:$('#combat-forecast'),forecastIcon:$('#forecast-icon'),matchup:$('#forecast-matchup'),forecastResult:$('#forecast-result')
};

function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={}){
  const el=document.createElementNS(NS,tag) as SVGElementTagNameMap[K];
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
  return el;
}

class Game{
  mode:Mode='tactical';gameMode:GameMode='combat';cameraMode:CameraMode='clean';
  cols=6;rows=8;obstacles:Point[]=[];units:Unit[]=[];party={...START_PARTY};
  selectedId='alden';round=1;turnOrder:string[]=[];activeIndex=0;gameOver=false;
  pendingAttack?:PendingAttack;targetingMode?:TargetingMode;history:Snapshot[]=[];logEntries:Array<{round:number;text:string}>=[];
  svg?:SVGSVGElement;world?:SVGGElement;routeLayer?:SVGGElement;tokenLayer?:SVGGElement;
  scale=1;tx=0;ty=0;pointers=new Map<number,{x:number;y:number}>();gestureStart?:{distance:number;scale:number;anchor:Point;startClientMid:Point;lastMid:Point;mode:'undecided'|'pan'|'zoom'};
  drag?:{id:string;pointerId:number;origin:Point;token:SVGGElement};
  timerIds:number[]=[];busy=false;gestureActive=false;gestureSuppressUntil=0;actionsOpen=false;

  constructor(){this.reset('tactical');this.bindGlobal();}

  reset(mode=this.mode){
    this.clearTimers();this.mode=mode;this.gameMode=mode==='exploration'?'explore':'combat';this.cameraMode=mode==='tactical'?'clean':'follow';this.scale=1;this.tx=0;this.ty=0;
    const p=PROTOTYPES[mode];this.cols=p.cols;this.rows=p.rows;this.obstacles=p.obstacles.map(o=>({...o}));this.units=p.units.map(u=>({...u,initiativeScore:0,actionsUsed:0,defending:false}));this.party={...START_PARTY};
    this.selectedId='alden';this.round=1;this.activeIndex=0;this.gameOver=false;this.pendingAttack=undefined;this.targetingMode=undefined;this.history=[];this.logEntries=[];this.busy=false;this.actionsOpen=false;
    if(this.gameMode==='combat'){this.scale=1;this.tx=0;this.ty=0;}
    if(this.gameMode==='combat'){this.rollInitiative();this.log('Round 1 begins.');}
    this.render();if(this.gameMode==='combat')this.beginTurn();
    ui.resultOverlay.hidden=true;this.closeLog();
  }

  bindGlobal(){
    ui.forecast.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();void this.confirmAttack();});
    ui.forecast.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void this.confirmAttack();}});
    ui.undo.addEventListener('click',()=>this.undo());ui.actionToggle.addEventListener('click',()=>{this.actionsOpen=!this.actionsOpen;ui.actionBar.hidden=!this.actionsOpen;ui.actionToggle.setAttribute('aria-expanded',String(this.actionsOpen));});
    ui.utilityToggle.addEventListener('click',()=>{const open=ui.utilityPanel.hidden;ui.utilityPanel.hidden=!open;ui.utilityToggle.setAttribute('aria-expanded',String(open));ui.utilityToggle.classList.toggle('open',open);});ui.zoomReset.addEventListener('click',()=>this.resetCamera());
    ui.attackAction.addEventListener('click',()=>this.beginTargeting('attack'));ui.heal.addEventListener('click',()=>this.beginTargeting('heal'));ui.defend.addEventListener('click',()=>this.defendSelected());
    ui.statsToggle.addEventListener('click',()=>{const open=ui.drawer.classList.toggle('open');ui.statsToggle.setAttribute('aria-expanded',String(open));});
    ui.logToggle.addEventListener('click',()=>{const open=ui.logPanel.hidden;ui.logPanel.hidden=!open;ui.logToggle.setAttribute('aria-expanded',String(open));this.renderLog();});ui.logClose.addEventListener('click',()=>this.closeLog());
    ui.restart.addEventListener('click',()=>{this.reset();ui.settings.open=false;});ui.restartOverlay.addEventListener('click',()=>this.reset());
    ui.tactical.addEventListener('click',()=>{this.reset('tactical');ui.settings.open=false;});ui.exploration.addEventListener('click',()=>{this.reset('exploration');ui.settings.open=false;});
    window.addEventListener('resize',()=>this.layout());
  }

  resetCamera(){this.scale=1;this.tx=0;this.ty=0;this.cameraMode='clean';this.applyCamera();this.syncUI();}

  rollInitiative(){
    const rolls:string[]=[];for(const u of this.living()){const die=Math.floor(Math.random()*20)+1;u.initiativeScore=die+u.initiativeMod;rolls.push(`${u.name}: ${die}${u.initiativeMod>=0?'+':''}${u.initiativeMod} = ${u.initiativeScore}`);}
    this.turnOrder=[...this.living()].sort((a,b)=>b.initiativeScore-a.initiativeScore||b.initiativeMod-a.initiativeMod).map(u=>u.id);this.log(`Initiative — ${rolls.join(' · ')}`);
  }

  active(){return this.unit(this.turnOrder[this.activeIndex]);}
  unit(id?:string){return id?this.units.find(u=>u.id===id&&u.hp>0):undefined;}
  selected(){return this.unit(this.selectedId);}
  living(team?:Team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
  hasAction(u:Unit){return u.actionsUsed<ACTIONS;}
  canMove(u:Unit){return u.actionsUsed===0;}
  weaponKind(u:Unit):'melee'|'ranged'{return u.id==='alden'||u.id==='raider-3'?'ranged':'melee';}
  weaponRange(u:Unit){return this.weaponKind(u)==='ranged'?RANGED_RANGE:1;}
  isActivePlayer(u:Unit){return this.gameMode==='combat'&&!this.gameOver&&this.active()?.id===u.id&&u.team==='player';}

  beginTurn(){
    if(this.gameOver||this.gameMode!=='combat')return;
    while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;
    if(this.activeIndex>=this.turnOrder.length){this.round++;this.activeIndex=0;this.living().forEach(u=>u.actionsUsed=0);this.log(`Round ${this.round} begins.`);while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;}
    const a=this.active();if(!a)return;a.actionsUsed=0;this.selectedId=a.id;this.pendingAttack=undefined;this.targetingMode=undefined;this.actionsOpen=false;this.hideForecast();if(this.cameraMode==='follow')this.centerCamera((a.x+.5)*CELL,(a.y+.5)*CELL);this.render();this.message(`${a.name}'s turn.`);
    if(a.team==='enemy')this.schedule(420,()=>void this.runEnemy());
  }

  finishTurn(){if(this.gameOver)return;this.clearTimers();this.pendingAttack=undefined;this.targetingMode=undefined;this.actionsOpen=false;this.hideForecast();this.activeIndex++;this.schedule(220,()=>this.beginTurn());}
  maybeFinish(u:Unit){if(u.actionsUsed>=ACTIONS)this.schedule(320,()=>this.finishTurn());}

  render(){
    const w=this.cols*CELL,h=this.rows*CELL;ui.battlefield.innerHTML='';
    const s=svg('svg',{class:'game-board',viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'xMidYMin meet','aria-label':this.gameMode==='combat'?`${this.cols} by ${this.rows} tactical battlefield`:'exploration map'});s.style.aspectRatio=`${this.cols} / ${this.rows}`;
    const world=svg('g',{class:'world'}),tiles=svg('g',{class:'tiles'}),highlights=svg('g',{class:'highlights'}),props=svg('g',{class:'props'}),route=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});world.append(tiles,highlights,props,route,tokens);s.appendChild(world);ui.battlefield.appendChild(s);this.svg=s;this.world=world;this.routeLayer=route;this.tokenLayer=tokens;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const r=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:`tile tile-${(x+y)%3}`,'data-x':x,'data-y':y});r.addEventListener('pointerup',e=>{if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if((e.target as Element).closest('.unit-token'))return;void this.handleCell(x,y);});tiles.appendChild(r);
      for(let i=0;i<6;i++){const seed=(x*97+y*53+i*31)%997;tiles.appendChild(svg('circle',{cx:x*CELL+8+(seed%64),cy:y*CELL+8+((seed*7)%64),r:1+(seed%2),class:'grass-speck'}));}
    }
    this.paintHighlights(highlights);
    for(const o of this.obstacles){const g=svg('g',{transform:`translate(${o.x*CELL+CELL/2} ${o.y*CELL+CELL/2})`,class:'obstacle'});g.append(svg('rect',{x:-8,y:-8,width:16,height:16}),svg('rect',{x:-5,y:-5,width:10,height:10,class:'obstacle-core'}));const t=svg('text',{x:0,y:3,'text-anchor':'middle'});t.textContent='✦';g.appendChild(t);props.appendChild(g);}
    if(this.gameMode==='combat')this.living().forEach(u=>tokens.appendChild(this.makeToken(u)));else tokens.appendChild(this.makePartyToken());
    this.paintAttackIntent();
    this.applyCamera();this.syncUI();this.layout();this.bindSvgGestures();
  }

  layout(){
    if(!this.svg)return;const rect=this.svg.getBoundingClientRect();document.documentElement.style.setProperty('--board-bottom',`${Math.round(rect.bottom)}px`);
  }

  makeToken(u:Unit){
    const g=svg('g',{class:`unit-token ${u.team} ${this.active()?.id===u.id?'active':''}`,transform:`translate(${u.x*CELL+CELL/2} ${u.y*CELL+CELL/2})`,'data-id':u.id});
    g.appendChild(svg('rect',{x:-8,y:-8,width:16,height:16,class:'token-outer'}));g.appendChild(svg('rect',{x:-7,y:-7,width:14,height:14,class:'token-inner'}));
    const text=svg('text',{x:0,y:2,'text-anchor':'middle',class:'token-glyph'});text.textContent=this.glyph(u);g.appendChild(text);
    const hpBack=svg('rect',{x:-7,y:6,width:14,height:3,class:'hp-back'}),hp=svg('rect',{x:-6,y:7,width:12*(u.hp/u.maxHp),height:1,class:'hp-fill'});g.append(hpBack,hp);
    if(u.defending){const shield=svg('text',{x:6,y:-6,'text-anchor':'middle',class:'shield-mark'});shield.textContent='🛡';g.appendChild(shield);}
    g.addEventListener('pointerup',e=>{e.stopPropagation();if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if(this.drag&&this.drag.id===u.id)return;this.handleUnit(u.id);});
    if(u.team==='player')g.addEventListener('pointerdown',e=>this.beginDrag(e,u,g));
    return g;
  }

  makePartyToken(){const g=svg('g',{class:'unit-token player party-token',transform:`translate(${this.party.x*CELL+CELL/2} ${this.party.y*CELL+CELL/2})`,'data-id':'party'});g.appendChild(svg('rect',{x:-8,y:-8,width:16,height:16,class:'token-outer'}));const t=svg('text',{x:0,y:3,'text-anchor':'middle',class:'token-glyph'});t.textContent='✦';g.appendChild(t);g.addEventListener('pointerdown',e=>this.beginPartyDrag(e,g));return g;}

  glyph(u:Unit){return u.id==='alden'?'♞':u.id==='mira'?'✦':'♜';}

  paintHighlights(layer:SVGGElement){
    if(this.gameMode!=='combat')return;const s=this.selected(),a=this.active();if(!s)return;
    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+2,y:p.y*CELL+2,width:CELL-4,height:CELL-4,rx:2,class:cls}));
    if(this.targetingMode&&a?.team==='player'){
      if(this.targetingMode==='heal'){for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.distance(a,{x,y})<=HEAL_RANGE)add({x,y},'spell-range');this.living('player').filter(u=>this.distance(a,u)<=HEAL_RANGE&&u.hp<u.maxHp).forEach(u=>add(u,'heal-target'));return;}
      const kind=this.weaponKind(a);for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){if(this.inWeaponRange(a,{x,y},kind))add({x,y},'weapon-range');}this.living('enemy').filter(u=>this.canAttack(a,u,kind)).forEach(u=>add(u,'attack-range'));return;
    }
    if(this.pendingAttack&&a?.team==='player')return;
    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));return;}
    if(!this.isActivePlayer(s)||!this.canMove(s))return;
    const blocked=(p:Point)=>{add(p,'blocked-range');const x=p.x*CELL,y=p.y*CELL;for(let offset=-CELL+8;offset<CELL;offset+=10){const x1=offset<0?x:x+offset,y1=offset<0?y+CELL+offset:y+CELL,x2=offset<0?x+CELL+offset:x+CELL,y2=offset<0?y:y+offset;layer.appendChild(svg('line',{x1,y1,x2,y2,class:'blocked-hatch'}));}};
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.isObstacle(x,y))blocked({x,y});
    this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});
  }

  paintAttackIntent(){
    if(!this.routeLayer||!this.pendingAttack)return;const a=this.unit(this.pendingAttack.actorId),t=this.unit(this.pendingAttack.targetId);if(!a||!t)return;
    const from={x:(a.x+.5)*CELL,y:(a.y+.5)*CELL},to={x:(t.x+.5)*CELL,y:(t.y+.5)*CELL},dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux;
    const start={x:from.x+ux*30,y:from.y+uy*30},tip={x:to.x-ux*31,y:to.y-uy*31},base={x:tip.x-ux*18,y:tip.y-uy*18};
    this.routeLayer.append(svg('line',{x1:start.x,y1:start.y,x2:base.x+ux*3,y2:base.y+uy*3,class:'attack-intent-outline'}),svg('polygon',{points:`${tip.x},${tip.y} ${base.x+px*11},${base.y+py*11} ${base.x-px*11},${base.y-py*11}`,class:'attack-intent-head-outline'}),svg('line',{x1:start.x,y1:start.y,x2:base.x+ux*3,y2:base.y+uy*3,class:'attack-intent-core'}),svg('polygon',{points:`${tip.x-ux*3},${tip.y-uy*3} ${base.x+px*7},${base.y+py*7} ${base.x-px*7},${base.y-py*7}`,class:'attack-intent-head-core'}),svg('circle',{cx:to.x,cy:to.y,r:34,class:'attack-target-ring'}));
    const damage=this.attackDamage(a,t,this.pendingAttack.kind),badge=svg('g',{transform:`translate(${to.x+24} ${to.y-27})`,class:'attack-damage-badge'});badge.append(svg('rect',{x:-20,y:-13,width:40,height:26,rx:13}),svg('text',{x:0,y:6,'text-anchor':'middle'}));(badge.lastChild as SVGTextElement).textContent=`−${damage}`;this.routeLayer.appendChild(badge);
  }

  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;g.classList.add('dragging');const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',`translate(${p.x} ${p.y})`);const d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.classList.remove('dragging');const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}

  beginPartyDrag(e:PointerEvent,g:SVGGElement){e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:'party',pointerId:e.pointerId,origin:{...this.party},token:g};const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',`translate(${p.x} ${p.y})`);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};this.drag=undefined;void this.moveParty(d);};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}

  bindSvgGestures(){if(!this.svg)return;const s=this.svg;s.onpointerdown=e=>{if((e.target as Element).closest('.unit-token'))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{s.setPointerCapture(e.pointerId);}catch{}if(this.pointers.size===2){this.gestureActive=true;this.gestureSuppressUntil=performance.now()+500;this.beginGesture();}};s.onpointermove=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2)this.updateGesture();};const end=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);if(this.pointers.size<2){this.gestureStart=undefined;this.gestureActive=false;this.gestureSuppressUntil=performance.now()+500;}};s.onpointerup=end;s.onpointercancel=end;}

  rootPoint(clientX:number,clientY:number){if(!this.svg)return{x:0,y:0};const p=this.svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=this.svg.getScreenCTM();if(!ctm)return{x:0,y:0};const q=p.matrixTransform(ctm.inverse());return{x:q.x,y:q.y};}
  maxScale(){return this.cols/3;}
  clampCamera(){const w=this.cols*CELL,h=this.rows*CELL,clamp=(offset:number,worldSize:number)=>{const scaled=worldSize*this.scale;if(scaled<=worldSize)return(worldSize-scaled)/2;return Math.min(0,Math.max(worldSize-scaled,offset));};this.tx=clamp(this.tx,w);this.ty=clamp(this.ty,h);}
  centerCamera(x:number,y:number,scale=this.scale){this.scale=Math.max(MIN_SCALE,Math.min(this.maxScale(),scale));const w=this.cols*CELL,h=this.rows*CELL;this.tx=w/2-x*this.scale;this.ty=h/2-y*this.scale;this.clampCamera();}
  beginGesture(){const pts=[...this.pointers.values()];if(pts.length<2)return;const clientMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},midpoint=this.rootPoint(clientMid.x,clientMid.y);this.gestureStart={distance:Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),scale:this.scale,anchor:{x:(midpoint.x-this.tx)/this.scale,y:(midpoint.y-this.ty)/this.scale},startClientMid:clientMid,lastMid:midpoint,mode:'undecided'};}
  updateGesture(){const g=this.gestureStart;if(!g)return;const pts=[...this.pointers.values()];if(pts.length<2)return;const clientMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},midpoint=this.rootPoint(clientMid.x,clientMid.y),distance=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)),ratio=distance/g.distance,centroidTravel=Math.hypot(clientMid.x-g.startClientMid.x,clientMid.y-g.startClientMid.y);
    if(g.mode==='undecided'){if(Math.abs(Math.log(ratio))>.045)g.mode='zoom';else if(centroidTravel>9)g.mode='pan';else return;this.cameraMode='follow';ui.zoomReset.disabled=false;}
    if(g.mode==='pan'){this.tx+=midpoint.x-g.lastMid.x;this.ty+=midpoint.y-g.lastMid.y;g.lastMid=midpoint;}else{const nextScale=Math.max(MIN_SCALE,Math.min(this.maxScale(),g.scale*ratio));this.scale=nextScale;this.tx=midpoint.x-g.anchor.x*nextScale;this.ty=midpoint.y-g.anchor.y*nextScale;}
    this.clampCamera();this.applyCamera();
  }
  applyCamera(){this.world?.setAttribute('transform',`translate(${this.tx} ${this.ty}) scale(${this.scale})`);}
  followToken(x:number,y:number){if(this.cameraMode!=='follow')return;this.centerCamera(x,y);this.applyCamera();}

  svgPoint(clientX:number,clientY:number){if(!this.svg)return{x:0,y:0};const p=this.svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=this.world?.getScreenCTM();if(!ctm)return{x:0,y:0};const q=p.matrixTransform(ctm.inverse());return{x:q.x,y:q.y};}

  async handleCell(x:number,y:number){if(this.busy||this.gameOver)return;if(this.gameMode==='explore'){await this.moveParty({x,y});return;}if(this.targetingMode){this.targetingMode=undefined;this.pendingAttack=undefined;this.hideForecast();this.render();this.message('Action cancelled.');return;}const a=this.active();if(!a||a.team!=='player'||!this.canMove(a))return;const occ=this.at(x,y);if(occ)return;const r=this.findRoute(a,{x,y},a.id);if(r.length>1&&r.length-1<=MOVE)await this.moveActive(a,r);}
  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.targetingMode&&a?.team==='player'){if(this.targetingMode==='heal'){if(t.team==='player'&&this.distance(a,t)<=HEAL_RANGE&&t.hp<t.maxHp)this.healTarget(t);else this.message(`Choose an injured hero within ${HEAL_RANGE} square.`);return;}const kind=this.weaponKind(a);if(t.team==='enemy'&&this.canAttack(a,t,kind)){void this.attack(a,t,kind);return;}this.message(kind==='ranged'?`Choose an enemy ${RANGED_RANGE} squares away in a straight line.`:'Choose an adjacent enemy.');return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}

  beginTargeting(kind:TargetingMode){const a=this.active();if(!a||a.team!=='player'||!this.hasAction(a)||this.busy)return;if(kind==='heal'&&a.id!=='mira')return;if(this.targetingMode===kind){this.targetingMode=undefined;this.pendingAttack=undefined;this.hideForecast();this.render();this.message('Action cancelled.');return;}this.targetingMode=kind;this.actionsOpen=false;this.pendingAttack=undefined;this.hideForecast();this.selectedId=a.id;this.render();this.message(kind==='heal'?`Choose an injured hero within ${HEAL_RANGE} square.`:this.weaponKind(a)==='ranged'?`Choose an enemy ${RANGED_RANGE} squares away in a straight line.`:'Choose an adjacent enemy.');}
  inWeaponRange(a:Point,b:Point,kind:'melee'|'ranged'){const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);return kind==='ranged'?((dx===RANGED_RANGE&&dy===0)||(dy===RANGED_RANGE&&dx===0)):dx+dy===1;}
  canAttack(a:Unit,t:Unit,kind:'melee'|'ranged'=this.weaponKind(a)){return this.hasAction(a)&&a.team!==t.team&&this.inWeaponRange(a,t,kind);}
  attackDamage(a:Unit,t:Unit,_kind:'melee'|'ranged'){return Math.max(0,a.damage-(t.defending?1:0));}
  previewAttack(a:Unit,t:Unit,kind:'melee'|'ranged'='melee'){if(!this.canAttack(a,t,kind))return;this.pendingAttack={actorId:a.id,targetId:t.id,kind};this.targetingMode=undefined;this.selectedId=a.id;const dmg=this.attackDamage(a,t,kind);ui.forecastIcon.textContent=kind==='ranged'?'➳':'⚔';ui.matchup.textContent=`${a.name} → ${t.name}`;ui.forecastResult.textContent=`${kind.toUpperCase()} · ${dmg} DMG · TAP TO CONFIRM`;ui.forecast.hidden=false;this.render();}
  hideForecast(){ui.forecast.hidden=true;}
  async confirmAttack(){const p=this.pendingAttack;if(!p||this.busy)return;const a=this.unit(p.actorId),t=this.unit(p.targetId);if(!a||!t)return;this.pendingAttack=undefined;this.hideForecast();await this.attack(a,t,p.kind);}

  record(){const a=this.active();if(a?.team!=='player')return;const last=this.history[this.history.length-1];if(last?.round===this.round&&last.activeIndex===this.activeIndex)return;this.history.push({units:this.units.map(u=>({...u})),selectedId:this.selectedId,round:this.round,activeIndex:this.activeIndex,logEntries:[...this.logEntries]});if(this.history.length>20)this.history.shift();}
  undo(){const a=this.active();if(!a||a.team!=='player'||!this.history.length||this.busy)return;this.clearTimers();const s=this.history.pop()!;this.units=s.units.map(u=>({...u}));this.selectedId=s.selectedId;this.round=s.round;this.activeIndex=s.activeIndex;this.logEntries=[...s.logEntries];this.pendingAttack=undefined;this.targetingMode=undefined;this.actionsOpen=false;this.busy=false;this.gameOver=false;ui.resultOverlay.hidden=true;this.hideForecast();this.renderLog();this.render();this.message(`Rewound to ${this.active()?.name??'the hero'}'s last decision.`);}

  async moveActive(u:Unit,r:Point[]){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;this.record();u.defending=false;this.busy=true;this.drawRoute(r);const g=this.tokenElement(u.id);g?.querySelector('.shield-mark')?.remove();if(g)await this.animateRoute(g,r,150);const d=r[r.length-1];u.x=d.x;u.y=d.y;u.actionsUsed=1;this.busy=false;this.actionsOpen=true;this.render();this.message('Choose an action.');}
  async moveEnemy(u:Unit,r:Point[]){u.defending=false;this.busy=true;this.drawRoute(r,true);const g=this.tokenElement(u.id);g?.querySelector('.shield-mark')?.remove();if(g)await this.animateRoute(g,r,145);const d=r[r.length-1];u.x=d.x;u.y=d.y;u.actionsUsed=1;this.busy=false;this.render();}
  animateRoute(g:SVGGElement,r:Point[],stepMs:number){return (async()=>{for(const p of r.slice(1)){const start=this.tokenTranslation(g),end={x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2};await this.tween(stepMs,t=>{const e=.5-.5*Math.cos(Math.PI*t),x=start.x+(end.x-start.x)*e,y=start.y+(end.y-start.y)*e;g.setAttribute('transform',`translate(${x} ${y})`);this.followToken(x,y);});}})();}
  tokenTranslation(g:SVGGElement){const tr=g.getAttribute('transform')||'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(tr);return{x:m?Number(m[1]):0,y:m?Number(m[2]):0};}
  tween(ms:number,update:(t:number)=>void){return new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-start)/ms);update(t);if(t<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});}

  async attack(a:Unit,t:Unit,kind:'melee'|'ranged'='melee'){if(!this.canAttack(a,t,kind)||this.busy)return;if(a.team==='player')this.record();a.defending=false;this.busy=true;const g=this.tokenElement(a.id);g?.querySelector('.shield-mark')?.remove();if(g){const start=this.tokenTranslation(g),target={x:t.x*CELL+CELL/2,y:t.y*CELL+CELL/2},dx=target.x-start.x,dy=target.y-start.y,len=Math.hypot(dx,dy)||1,lunge={x:start.x+dx/len*(kind==='ranged'?8:18),y:start.y+dy/len*(kind==='ranged'?8:18)};await this.tween(80,q=>g.setAttribute('transform',`translate(${start.x+(lunge.x-start.x)*q} ${start.y+(lunge.y-start.y)*q})`));await this.tween(90,q=>g.setAttribute('transform',`translate(${lunge.x+(start.x-lunge.x)*q} ${lunge.y+(start.y-lunge.y)*q})`));}
    const targetRect=this.tokenElement(t.id)?.getBoundingClientRect();a.actionsUsed=2;const dmg=this.attackDamage(a,t,kind);if(t.defending)t.defending=false;t.hp=Math.max(0,t.hp-dmg);this.log(`${a.name} uses ${kind} against ${t.name}: ${dmg} damage${t.hp<=0?' — defeated':''}.`);this.selectedId=a.id;this.targetingMode=undefined;this.actionsOpen=false;this.busy=false;this.checkGameOver();this.render();this.showFloatingNumber(t,`−${dmg}`,'damage',targetRect);if(!this.gameOver)this.maybeFinish(a);
  }

  healTarget(t:Unit){const u=this.active();if(!u||u.id!=='mira'||t.team!=='player'||!this.hasAction(u)||this.distance(u,t)>HEAL_RANGE||t.hp>=t.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,t.maxHp-t.hp);t.hp+=n;u.actionsUsed=2;this.targetingMode=undefined;this.log(`${u.name} heals ${t.name}: +${n} HP.`);this.selectedId=t.id;this.render();this.showFloatingNumber(t,`+${n}`,'healing');this.maybeFinish(u);}
  defendSelected(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||u.defending||this.busy)return;this.defendUnit(u,true);}
  defendUnit(u:Unit,record=false){if(record)this.record();u.defending=true;u.actionsUsed=2;this.actionsOpen=false;this.targetingMode=undefined;this.pendingAttack=undefined;this.hideForecast();this.log(`${u.name} uses Defend.`);this.render();this.maybeFinish(u);}

  routeToRange(u:Unit,t:Unit,kind:'melee'|'ranged'){let best:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x,y};if(!this.inWeaponRange(p,t,kind))continue;const occupant=this.at(x,y);if(occupant&&occupant.id!==u.id)continue;const r=this.findRoute(u,p,u.id);if(r.length&&(!best.length||r.length<best.length))best=r;}return best;}
  async runEnemy(){const e=this.active();if(!e||e.team!=='enemy'||this.gameOver||this.busy)return;this.selectedId=e.id;const kind=this.weaponKind(e);let target:Unit|undefined,bestRoute:Point[]=[];for(const hero of this.living('player')){const r=this.routeToRange(e,hero,kind);if(r.length&&(!bestRoute.length||r.length<bestRoute.length)){target=hero;bestRoute=r;}}if(!target){target=[...this.living('player')].sort((a,b)=>this.distance(e,a)-this.distance(e,b))[0];}if(!target){this.finishTurn();return;}if(this.canAttack(e,target,kind)){this.actionsOpen=true;this.render();this.schedule(380,()=>void this.attack(e,target!,kind));return;}if(bestRoute.length>1){const step=bestRoute.slice(0,Math.min(bestRoute.length,MOVE+1));await this.moveEnemy(e,step);}this.actionsOpen=true;this.render();this.schedule(420,()=>{const liveTarget=this.unit(target!.id);if(liveTarget&&this.canAttack(e,liveTarget,kind))void this.attack(e,liveTarget,kind);else this.defendUnit(e);});}

  async moveParty(d:Point){if(this.busy)return;const r=this.findRoute(this.party,d,'party',true);if(r.length<2){this.render();return;}this.busy=true;this.drawRoute(r);const g=this.tokenElement('party');if(g)await this.animateRoute(g,r,80);const end=r[r.length-1];this.party={...end};this.busy=false;this.render();const enemy=this.living('enemy').find(e=>this.distance(this.party,e)<=ENCOUNTER_DISTANCE);if(enemy)this.schedule(300,()=>this.reset('tactical'));}

  drawRoute(r:Point[],enemy=false){if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;const points=r.map(p=>`${p.x*CELL+CELL/2},${p.y*CELL+CELL/2}`).join(' ');this.routeLayer.appendChild(svg('polyline',{points,class:`route-line ${enemy?'enemy':''}`,'marker-end':'url(#route-arrow)'}));}
  tokenElement(id:string){return this.tokenLayer?.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`);}

  findRoute(start:Point,d:Point,movingId:string,explore=false):Point[]{if(d.x<0||d.y<0||d.x>=this.cols||d.y>=this.rows||this.isObstacle(d.x,d.y))return[];const key=(p:Point)=>`${p.x},${p.y}`,q:Point[]=[{...start}],prev=new Map<string,Point|null>([[key(start),null]]);while(q.length){const cur=q.shift()!;if(key(cur)===key(d))break;for(const n of this.neighbors(cur)){const occ=this.at(n.x,n.y),blocked=explore?occ?.team==='enemy':!!occ&&occ.id!==movingId;if(prev.has(key(n))||this.isObstacle(n.x,n.y)||blocked)continue;prev.set(key(n),cur);q.push(n);}}if(!prev.has(key(d)))return[];const out:Point[]=[];let cur:Point|null={...d};while(cur){out.unshift(cur);cur=prev.get(key(cur))??null;}return out;}
  reachable(u:Unit,max:number){const out:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){if(this.at(x,y)&&!(u.x===x&&u.y===y))continue;const r=this.findRoute(u,{x,y},u.id);if(r.length&&r.length-1<=max)out.push({x,y});}return out;}
  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  neighbors(p:Point){return[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>n.x>=0&&n.y>=0&&n.x<this.cols&&n.y<this.rows);}

  checkGameOver(){const h=this.living('player'),e=this.living('enemy');if(h.length&&e.length)return;this.gameOver=true;this.clearTimers();ui.resultOverlay.hidden=false;ui.resultTitle.textContent=h.length?'Victory':'Defeat';ui.resultCopy.textContent=h.length?'The pass is secure.':'The party has fallen.';this.log(h.length?'Victory.':'Defeat.');}
  syncUI(){const a=this.active(),playerTurn=!!a&&a.team==='player'&&!this.gameOver,kind=a?this.weaponKind(a):'melee';ui.undo.disabled=!a||a.team!=='player'||!this.history.length;ui.actionToggle.hidden=!playerTurn;ui.actionToggle.setAttribute('aria-expanded',String(this.actionsOpen));ui.actionBar.hidden=!a||!this.actionsOpen||this.gameOver;ui.actionBar.dataset.team=a?.team??'';ui.zoomReset.disabled=this.cameraMode==='clean'&&this.scale===1&&this.tx===0&&this.ty===0;const hasTarget=!!a&&this.living(a.team==='player'?'enemy':'player').some(t=>this.canAttack(a,t,kind));ui.attackAction.hidden=false;ui.attackAction.disabled=!playerTurn||!this.hasAction(a!)||!hasTarget;ui.attackAction.setAttribute('aria-pressed',String(this.targetingMode==='attack'));ui.heal.hidden=a?.id!=='mira';ui.heal.disabled=!playerTurn||!this.hasAction(a!)||!this.living('player').some(u=>this.distance(a!,u)<=HEAL_RANGE&&u.hp<u.maxHp);ui.defend.disabled=!playerTurn||!this.hasAction(a!)||!!a?.defending;ui.heal.setAttribute('aria-pressed',String(this.targetingMode==='heal'));ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical'));ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));
    const selected=this.selected()??a??this.living()[0];if(selected){ui.selectedName.textContent=selected.name;ui.selectedTeam.textContent=selected.team==='player'?'Hero':'Enemy';ui.health.textContent=`${selected.hp} / ${selected.maxHp}`;ui.attack.textContent=String(selected.damage);ui.movement.textContent=String(MOVE);ui.initiative.textContent=`${selected.initiativeMod>=0?'+':''}${selected.initiativeMod} (${selected.initiativeScore})`;ui.portrait.textContent='';ui.portrait.dataset.id=selected.id;}
    ui.rail.innerHTML='';for(const [i,id] of this.turnOrder.entries()){const u=this.unit(id);if(!u)continue;const b=document.createElement('button');b.type='button';b.className=`initiative-token ${u.team}${i===this.activeIndex?' active':''}`;b.dataset.id=u.id;b.setAttribute('aria-label',`${u.name}${i===this.activeIndex?', current turn':''}`);b.innerHTML=`<span class="rail-sprite"></span><small>${u.name}</small>`;b.addEventListener('click',()=>{this.targetingMode=undefined;this.pendingAttack=undefined;this.hideForecast();this.selectedId=u.id;this.scale=1;this.tx=0;this.ty=0;this.cameraMode='clean';this.render();});ui.rail.appendChild(b);}const current=ui.rail.querySelector<HTMLElement>('.active');if(current)requestAnimationFrame(()=>current.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));}
  showFloatingNumber(u:Unit,text:string,kind:'damage'|'healing',anchorRect?:DOMRect){requestAnimationFrame(()=>{const token=this.tokenElement(u.id),tr=anchorRect??token?.getBoundingClientRect();if(!tr)return;const vr=ui.viewport.getBoundingClientRect(),el=document.createElement('span');el.className=`combat-float ${kind}`;el.textContent=text;el.style.left=`${tr.left-vr.left+tr.width/2}px`;el.style.top=`${tr.top-vr.top-2}px`;ui.viewport.appendChild(el);window.setTimeout(()=>el.remove(),900);});}
  log(text:string){this.logEntries.push({round:this.round,text});this.renderLog();}
  renderLog(){ui.logList.innerHTML='';for(const e of this.logEntries){const row=document.createElement('div');row.className='log-entry';row.innerHTML=`<b>R${e.round}</b><span>${e.text}</span>`;ui.logList.appendChild(row);}ui.logList.scrollTop=ui.logList.scrollHeight;}
  closeLog(){ui.logPanel.hidden=true;ui.logToggle.setAttribute('aria-expanded','false');}
  message(t:string){ui.instruction.textContent=t;}
  schedule(ms:number,fn:()=>void){const id=window.setTimeout(()=>{this.timerIds=this.timerIds.filter(x=>x!==id);fn();},ms);this.timerIds.push(id);}
  clearTimers(){this.timerIds.forEach(clearTimeout);this.timerIds=[];}
}

new Game();
