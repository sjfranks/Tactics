import './phaser.css';

type Team='player'|'enemy';
type Mode='tactical'|'exploration';
type GameMode='combat'|'explore';
type CameraMode='clean'|'follow';
type Point={x:number;y:number};
type Unit=Point&{id:string;name:string;team:Team;hp:number;maxHp:number;damage:number;initiativeMod:number;initiativeScore:number;actionsUsed:number;defending:boolean};
type Snapshot={units:Unit[];selectedId:string;round:number;activeIndex:number};
type PendingAttack={actorId:string;targetId:string};

type Prototype={cols:number;rows:number;obstacles:Point[];units:Array<Omit<Unit,'initiativeScore'|'actionsUsed'|'defending'>>};

const CELL=80,MOVE=2,ACTIONS=3,HEAL=2,ENCOUNTER_DISTANCE=4;
const NS='http://www.w3.org/2000/svg';
const START_PARTY={x:15,y:24};
const PROTOTYPES:Record<Mode,Prototype>={
  tactical:{cols:6,rows:8,obstacles:[{x:2,y:4}],units:[
    {id:'alden',name:'Alden',team:'player',x:1,y:6,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',team:'player',x:4,y:6,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'North Raider',team:'enemy',x:1,y:1,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Hill Raider',team:'enemy',x:4,y:2,hp:3,maxHp:3,damage:1,initiativeMod:0}
  ]},
  exploration:{cols:30,rows:30,obstacles:[{x:15,y:18}],units:[
    {id:'alden',name:'Alden',team:'player',x:14,y:20,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',team:'player',x:16,y:21,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'North Raider',team:'enemy',x:14,y:15,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Hill Raider',team:'enemy',x:17,y:17,hp:3,maxHp:3,damage:1,initiativeMod:0}
  ]}
};

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const ui={
  battlefield:$('#battlefield'),frame:$('#battlefield-frame'),rail:$('#initiative-rail'),instruction:$('#instruction'),
  undo:$('#undo-action') as HTMLButtonElement,reset:$('#reset-view') as HTMLButtonElement,
  actionToggle:$('#ability-menu-toggle') as HTMLButtonElement,actionPanel:$('#ability-menu-panel'),heal:$('#heal-action') as HTMLButtonElement,defend:$('#defend-action') as HTMLButtonElement,
  statsToggle:$('#stats-toggle') as HTMLButtonElement,logToggle:$('#log-toggle') as HTMLButtonElement,logPanel:$('#combat-log-panel'),logList:$('#combat-log-list'),logClose:$('#log-close') as HTMLButtonElement,
  restart:$('#restart') as HTMLButtonElement,restartOverlay:$('#restart-overlay') as HTMLButtonElement,tactical:$('#tactical-mode') as HTMLButtonElement,exploration:$('#exploration-mode') as HTMLButtonElement,settings:$('#settings-menu') as HTMLDetailsElement,
  drawer:$('#unit-drawer'),selectedName:$('#selected-name'),selectedTeam:$('#selected-team'),health:$('#health-text'),attack:$('#attack-stat'),movement:$('#movement-stat'),initiative:$('#initiative-stat'),actions:$('#actions-stat'),portrait:$('#portrait'),
  resultOverlay:$('#result-overlay'),resultTitle:$('#result-title'),resultCopy:$('#result-copy'),forecast:$('#combat-forecast'),matchup:$('#forecast-matchup'),forecastResult:$('#forecast-result')
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
  pendingAttack?:PendingAttack;history:Snapshot[]=[];logEntries:Array<{round:number;text:string}>=[];
  svg?:SVGSVGElement;world?:SVGGElement;routeLayer?:SVGGElement;tokenLayer?:SVGGElement;
  scale=1;tx=0;ty=0;pointers=new Map<number,{x:number;y:number}>();gestureStart?:{distance:number;mid:Point;scale:number;tx:number;ty:number};
  drag?:{id:string;pointerId:number;origin:Point;token:SVGGElement};
  timerIds:number[]=[];busy=false;

  constructor(){this.reset('tactical');this.bindGlobal();}

  reset(mode=this.mode){
    this.clearTimers();this.mode=mode;this.gameMode=mode==='exploration'?'explore':'combat';this.cameraMode='clean';this.scale=1;this.tx=0;this.ty=0;
    const p=PROTOTYPES[mode];this.cols=p.cols;this.rows=p.rows;this.obstacles=p.obstacles.map(o=>({...o}));this.units=p.units.map(u=>({...u,initiativeScore:0,actionsUsed:0,defending:false}));this.party={...START_PARTY};
    this.selectedId='alden';this.round=1;this.activeIndex=0;this.gameOver=false;this.pendingAttack=undefined;this.history=[];this.logEntries=[];this.busy=false;
    if(this.gameMode==='combat'){this.rollInitiative();this.log('Round 1 begins.');}
    this.render();if(this.gameMode==='combat')this.beginTurn();
    ui.resultOverlay.hidden=true;this.closeActionMenu();this.closeLog();
  }

  bindGlobal(){
    ui.forecast.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();void this.confirmAttack();});
    ui.undo.addEventListener('click',()=>this.undo());ui.reset.addEventListener('click',()=>this.resetView());
    ui.actionToggle.addEventListener('click',()=>{const open=ui.actionPanel.hidden;ui.actionPanel.hidden=!open;ui.actionToggle.setAttribute('aria-expanded',String(open));});
    ui.heal.addEventListener('click',()=>this.healSelected());ui.defend.addEventListener('click',()=>this.defendSelected());
    ui.statsToggle.addEventListener('click',()=>{const open=ui.drawer.classList.toggle('open');ui.statsToggle.setAttribute('aria-expanded',String(open));});
    ui.logToggle.addEventListener('click',()=>{const open=ui.logPanel.hidden;ui.logPanel.hidden=!open;ui.logToggle.setAttribute('aria-expanded',String(open));this.renderLog();});ui.logClose.addEventListener('click',()=>this.closeLog());
    ui.restart.addEventListener('click',()=>{this.reset();ui.settings.open=false;});ui.restartOverlay.addEventListener('click',()=>this.reset());
    ui.tactical.addEventListener('click',()=>{this.reset('tactical');ui.settings.open=false;});ui.exploration.addEventListener('click',()=>{this.reset('exploration');ui.settings.open=false;});
    window.addEventListener('resize',()=>this.layout());
  }

  rollInitiative(){
    const rolls:string[]=[];for(const u of this.living()){const die=Math.floor(Math.random()*20)+1;u.initiativeScore=die+u.initiativeMod;rolls.push(`${u.name}: ${die}${u.initiativeMod>=0?'+':''}${u.initiativeMod} = ${u.initiativeScore}`);}
    this.turnOrder=[...this.living()].sort((a,b)=>b.initiativeScore-a.initiativeScore||b.initiativeMod-a.initiativeMod).map(u=>u.id);this.log(`Initiative — ${rolls.join(' · ')}`);
  }

  active(){return this.unit(this.turnOrder[this.activeIndex]);}
  unit(id?:string){return id?this.units.find(u=>u.id===id&&u.hp>0):undefined;}
  selected(){return this.unit(this.selectedId);}
  living(team?:Team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
  hasAction(u:Unit){return u.actionsUsed<ACTIONS;}
  isActivePlayer(u:Unit){return this.gameMode==='combat'&&!this.gameOver&&this.active()?.id===u.id&&u.team==='player';}

  beginTurn(){
    if(this.gameOver||this.gameMode!=='combat')return;
    while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;
    if(this.activeIndex>=this.turnOrder.length){this.round++;this.activeIndex=0;this.living().forEach(u=>u.actionsUsed=0);this.log(`Round ${this.round} begins.`);while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;}
    const a=this.active();if(!a)return;a.actionsUsed=0;this.selectedId=a.id;this.pendingAttack=undefined;this.history=[];this.hideForecast();this.closeActionMenu();this.render();this.message(`${a.name}'s turn.`);
    if(a.team==='enemy')this.schedule(420,()=>void this.runEnemy());
  }

  finishTurn(){if(this.gameOver)return;this.clearTimers();this.pendingAttack=undefined;this.hideForecast();this.closeActionMenu();this.activeIndex++;this.history=[];this.schedule(220,()=>this.beginTurn());}
  maybeFinish(u:Unit){if(u.actionsUsed>=ACTIONS)this.schedule(320,()=>this.finishTurn());}

  render(){
    const w=this.cols*CELL,h=this.rows*CELL;ui.battlefield.innerHTML='';
    const s=svg('svg',{class:'game-board',viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'xMidYMin meet','aria-label':this.gameMode==='combat'?'6 by 8 tactical battlefield':'exploration map'});s.style.aspectRatio=`${this.cols} / ${this.rows}`;
    const defs=svg('defs');const marker=svg('marker',{id:'route-arrow',markerWidth:12,markerHeight:12,refX:9,refY:6,orient:'auto',markerUnits:'strokeWidth'});marker.appendChild(svg('path',{d:'M 0 0 L 12 6 L 0 12 z',fill:'#78e5ff'}));defs.appendChild(marker);s.appendChild(defs);
    const world=svg('g',{class:'world'}),tiles=svg('g',{class:'tiles'}),highlights=svg('g',{class:'highlights'}),props=svg('g',{class:'props'}),route=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});world.append(tiles,highlights,props,route,tokens);s.appendChild(world);ui.battlefield.appendChild(s);this.svg=s;this.world=world;this.routeLayer=route;this.tokenLayer=tokens;
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const r=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:`tile tile-${(x+y)%3}`,'data-x':x,'data-y':y});r.addEventListener('pointerup',e=>{if((e.target as Element).closest('.unit-token'))return;void this.handleCell(x,y);});tiles.appendChild(r);
      for(let i=0;i<6;i++){const seed=(x*97+y*53+i*31)%997;tiles.appendChild(svg('circle',{cx:x*CELL+8+(seed%64),cy:y*CELL+8+((seed*7)%64),r:1+(seed%2),class:'grass-speck'}));}
    }
    this.paintHighlights(highlights);
    for(const o of this.obstacles){const g=svg('g',{transform:`translate(${o.x*CELL+CELL/2} ${o.y*CELL+CELL/2})`,class:'obstacle'});g.append(svg('circle',{r:24}),svg('circle',{r:14,class:'obstacle-core'}));const t=svg('text',{x:0,y:7,'text-anchor':'middle'});t.textContent='✦';g.appendChild(t);props.appendChild(g);}
    if(this.gameMode==='combat')this.living().forEach(u=>tokens.appendChild(this.makeToken(u)));else tokens.appendChild(this.makePartyToken());
    this.applyCamera();this.syncUI();this.layout();this.bindSvgGestures();
  }

  layout(){
    if(!this.svg)return;const rect=this.svg.getBoundingClientRect();document.documentElement.style.setProperty('--board-bottom',`${Math.round(rect.bottom)}px`);
  }

  makeToken(u:Unit){
    const g=svg('g',{class:`unit-token ${u.team} ${this.active()?.id===u.id?'active':''}`,transform:`translate(${u.x*CELL+CELL/2} ${u.y*CELL+CELL/2})`,'data-id':u.id});
    g.appendChild(svg('circle',{r:27,class:'token-outer'}));g.appendChild(svg('circle',{r:22,class:'token-inner'}));
    const text=svg('text',{x:0,y:7,'text-anchor':'middle',class:'token-glyph'});text.textContent=this.glyph(u);g.appendChild(text);
    const hpBack=svg('rect',{x:-22,y:25,width:44,height:7,rx:3,class:'hp-back'}),hp=svg('rect',{x:-20,y:27,width:40*(u.hp/u.maxHp),height:3,rx:1.5,class:'hp-fill'});g.append(hpBack,hp);
    if(u.defending){const shield=svg('text',{x:24,y:-20,'text-anchor':'middle',class:'shield-mark'});shield.textContent='◆';g.appendChild(shield);}
    if(this.active()?.id===u.id){for(let i=0;i<ACTIONS;i++)g.appendChild(svg('circle',{cx:(i-1)*12,cy:38,r:4,class:i>=u.actionsUsed?'action-dot':'action-dot spent'}));}
    g.addEventListener('pointerup',e=>{e.stopPropagation();if(this.drag&&this.drag.id===u.id)return;this.handleUnit(u.id);});
    if(u.team==='player')g.addEventListener('pointerdown',e=>this.beginDrag(e,u,g));
    return g;
  }

  makePartyToken(){const g=svg('g',{class:'unit-token player party-token',transform:`translate(${this.party.x*CELL+CELL/2} ${this.party.y*CELL+CELL/2})`,'data-id':'party'});g.appendChild(svg('circle',{r:28,class:'token-outer'}));const t=svg('text',{x:0,y:9,'text-anchor':'middle',class:'token-glyph'});t.textContent='✦';g.appendChild(t);g.addEventListener('pointerdown',e=>this.beginPartyDrag(e,g));return g;}

  glyph(u:Unit){return u.id==='alden'?'♞':u.id==='mira'?'✦':'♜';}

  paintHighlights(layer:SVGGElement){
    if(this.gameMode!=='combat')return;const s=this.selected();if(!s)return;
    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+3,y:p.y*CELL+3,width:CELL-6,height:CELL-6,rx:7,class:cls}));
    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));const threat=new Set<string>();this.reachable(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(`${n.x},${n.y}`)));threat.forEach(k=>{const[x,y]=k.split(',').map(Number);add({x,y},'enemy-threat');});return;}
    if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))add(e,'attack-range');});
  }

  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;g.classList.add('dragging');const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',`translate(${p.x} ${p.y})`);const d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.classList.remove('dragging');const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}

  beginPartyDrag(e:PointerEvent,g:SVGGElement){e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:'party',pointerId:e.pointerId,origin:{...this.party},token:g};const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',`translate(${p.x} ${p.y})`);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};this.drag=undefined;void this.moveParty(d);};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}

  bindSvgGestures(){if(!this.svg)return;const s=this.svg;s.onpointerdown=e=>{if((e.target as Element).closest('.unit-token'))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});s.setPointerCapture(e.pointerId);if(this.pointers.size===2)this.beginGesture();};s.onpointermove=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2)this.updateGesture();};const end=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);if(this.pointers.size<2)this.gestureStart=undefined;};s.onpointerup=end;s.onpointercancel=end;}

  beginGesture(){const pts=[...this.pointers.values()];const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};this.gestureStart={distance:Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y),mid,scale:this.scale,tx:this.tx,ty:this.ty};this.cameraMode='follow';}
  updateGesture(){if(!this.gestureStart||!this.svg)return;const pts=[...this.pointers.values()];const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},dist=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);const rect=this.svg.getBoundingClientRect(),sx=this.cols*CELL/rect.width,sy=this.rows*CELL/rect.height;const nextScale=Math.max(.55,Math.min(3.2,this.gestureStart.scale*(dist/this.gestureStart.distance)));const dx=(mid.x-this.gestureStart.mid.x)*sx,dy=(mid.y-this.gestureStart.mid.y)*sy;this.scale=nextScale;this.tx=this.gestureStart.tx+dx;this.ty=this.gestureStart.ty+dy;this.applyCamera();}
  applyCamera(){this.world?.setAttribute('transform',`translate(${this.tx} ${this.ty}) scale(${this.scale})`);}
  resetView(){this.cameraMode='clean';this.scale=1;this.tx=0;this.ty=0;this.applyCamera();}
  followToken(x:number,y:number){if(this.cameraMode!=='follow')return;const w=this.cols*CELL,h=this.rows*CELL;this.tx=w/2-x*this.scale;this.ty=h/2-y*this.scale;this.applyCamera();}

  svgPoint(clientX:number,clientY:number){if(!this.svg)return{x:0,y:0};const p=this.svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=this.world?.getScreenCTM();if(!ctm)return{x:0,y:0};const q=p.matrixTransform(ctm.inverse());return{x:q.x,y:q.y};}

  async handleCell(x:number,y:number){if(this.busy||this.gameOver)return;if(this.gameMode==='explore'){await this.moveParty({x,y});return;}const a=this.active();if(!a||a.team!=='player'||!this.hasAction(a))return;const occ=this.at(x,y);if(occ?.team==='enemy'&&this.canAttack(a,occ)){this.previewAttack(a,occ);return;}if(occ)return;const r=this.findRoute(a,{x,y},a.id);if(r.length>1&&r.length-1<=MOVE)await this.moveActive(a,r);}
  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.pendingAttack&&id===this.pendingAttack.targetId){void this.confirmAttack();return;}if(a?.team==='player'&&t.team==='enemy'&&this.canAttack(a,t)){this.previewAttack(a,t);return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}

  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}
  previewAttack(a:Unit,t:Unit){if(!this.canAttack(a,t))return;this.pendingAttack={actorId:a.id,targetId:t.id};this.selectedId=t.id;const dmg=Math.max(0,a.damage-(t.defending?1:0));ui.matchup.textContent=`${a.name} → ${t.name}`;ui.forecastResult.textContent=`${dmg} damage · tap here or target to attack`;ui.forecast.hidden=false;this.render();}
  hideForecast(){ui.forecast.hidden=true;}
  async confirmAttack(){const p=this.pendingAttack;if(!p||this.busy)return;const a=this.unit(p.actorId),t=this.unit(p.targetId);if(!a||!t)return;this.pendingAttack=undefined;this.hideForecast();await this.attack(a,t);}

  record(){const a=this.active();if(a?.team==='player')this.history.push({units:this.units.map(u=>({...u})),selectedId:this.selectedId,round:this.round,activeIndex:this.activeIndex});}
  undo(){const a=this.active();if(!a||a.team!=='player'||!this.history.length||this.busy)return;const s=this.history.pop()!;this.units=s.units.map(u=>({...u}));this.selectedId=s.selectedId;this.round=s.round;this.activeIndex=s.activeIndex;this.pendingAttack=undefined;this.hideForecast();this.render();this.message('Undid one action.');}

  async moveActive(u:Unit,r:Point[]){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;this.record();this.busy=true;this.drawRoute(r);const g=this.tokenElement(u.id);if(g)await this.animateRoute(g,r,150);const d=r[r.length-1];u.x=d.x;u.y=d.y;u.actionsUsed++;this.busy=false;this.render();this.maybeFinish(u);}
  async moveEnemy(u:Unit,r:Point[]){this.busy=true;this.drawRoute(r,true);const g=this.tokenElement(u.id);if(g)await this.animateRoute(g,r,145);const d=r[r.length-1];u.x=d.x;u.y=d.y;u.actionsUsed++;this.busy=false;this.render();}
  animateRoute(g:SVGGElement,r:Point[],stepMs:number){return (async()=>{for(const p of r.slice(1)){const start=this.tokenTranslation(g),end={x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2};await this.tween(stepMs,t=>{const e=.5-.5*Math.cos(Math.PI*t),x=start.x+(end.x-start.x)*e,y=start.y+(end.y-start.y)*e;g.setAttribute('transform',`translate(${x} ${y})`);this.followToken(x,y);});}})();}
  tokenTranslation(g:SVGGElement){const tr=g.getAttribute('transform')||'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(tr);return{x:m?Number(m[1]):0,y:m?Number(m[2]):0};}
  tween(ms:number,update:(t:number)=>void){return new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-start)/ms);update(t);if(t<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});}

  async attack(a:Unit,t:Unit){if(!this.canAttack(a,t)||this.busy)return;if(a.team==='player')this.record();this.busy=true;const g=this.tokenElement(a.id);if(g){const start=this.tokenTranslation(g),target={x:t.x*CELL+CELL/2,y:t.y*CELL+CELL/2},dx=target.x-start.x,dy=target.y-start.y,len=Math.hypot(dx,dy)||1,lunge={x:start.x+dx/len*18,y:start.y+dy/len*18};await this.tween(80,q=>g.setAttribute('transform',`translate(${start.x+(lunge.x-start.x)*q} ${start.y+(lunge.y-start.y)*q})`));await this.tween(90,q=>g.setAttribute('transform',`translate(${lunge.x+(start.x-lunge.x)*q} ${lunge.y+(start.y-lunge.y)*q})`));}
    a.actionsUsed++;let dmg=a.damage;if(t.defending){dmg=Math.max(0,dmg-1);t.defending=false;}t.hp=Math.max(0,t.hp-dmg);this.log(`${a.name} attacks ${t.name}: ${dmg} damage${t.hp<=0?' — defeated':''}.`);this.selectedId=a.id;this.busy=false;this.checkGameOver();this.render();if(!this.gameOver&&a.team==='player')this.maybeFinish(a);
  }

  healSelected(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||u.hp>=u.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,u.maxHp-u.hp);u.hp+=n;u.actionsUsed++;this.log(`${u.name} uses Heal: +${n} HP.`);this.closeActionMenu();this.render();this.maybeFinish(u);}
  defendSelected(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||u.defending||this.busy)return;this.record();u.defending=true;u.actionsUsed++;this.log(`${u.name} uses Defend.`);this.closeActionMenu();this.render();this.finishTurn();}

  async runEnemy(){const e=this.active();if(!e||e.team!=='enemy'||this.gameOver||this.busy)return;if(!this.hasAction(e)){this.finishTurn();return;}this.selectedId=e.id;this.render();const target=[...this.living('player')].sort((a,b)=>this.distance(e,a)-this.distance(e,b))[0];if(!target)return;if(this.distance(e,target)===1){await this.attack(e,target);if(!this.gameOver)this.schedule(360,()=>void this.runEnemy());return;}const opts=this.reachable(e,MOVE).map(p=>({p,r:this.findRoute(e,p,e.id)})).filter(o=>o.r.length>1).sort((a,b)=>this.distance(a.p,target)-this.distance(b.p,target)||a.r.length-b.r.length);if(opts[0])await this.moveEnemy(e,opts[0].r);else e.actionsUsed++;this.schedule(320,()=>void this.runEnemy());}

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
  syncUI(){const a=this.active();ui.undo.disabled=!a||a.team!=='player'||!this.history.length;ui.actionToggle.disabled=!a||a.team!=='player'||!this.hasAction(a)||this.gameOver;ui.heal.disabled=!a||a.team!=='player'||!this.hasAction(a)||a.hp>=a.maxHp;ui.defend.disabled=!a||a.team!=='player'||!this.hasAction(a)||a.defending;ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical'));ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));
    const s=this.selected()??a??this.living()[0];if(s){ui.selectedName.textContent=s.name;ui.selectedTeam.textContent=s.team==='player'?'Hero':'Enemy';ui.health.textContent=`${s.hp} / ${s.maxHp}`;ui.attack.textContent=String(s.damage);ui.movement.textContent=String(MOVE);ui.initiative.textContent=`${s.initiativeMod>=0?'+':''}${s.initiativeMod} (${s.initiativeScore})`;ui.actions.textContent=a?.id===s.id?`${ACTIONS-s.actionsUsed} / ${ACTIONS}`:'—';ui.portrait.textContent=this.glyph(s);}
    ui.rail.innerHTML='';for(const [i,id] of this.turnOrder.entries()){const u=this.unit(id);if(!u)continue;const b=document.createElement('button');b.type='button';b.className=`initiative-token ${u.team}${i===this.activeIndex?' active':''}`;b.setAttribute('aria-label',`${u.name}${i===this.activeIndex?', current turn':''}`);b.innerHTML=`<span>${this.glyph(u)}</span><small>${u.name}</small>`;b.addEventListener('click',()=>{this.selectedId=u.id;this.render();});ui.rail.appendChild(b);}const active=ui.rail.querySelector<HTMLElement>('.active');if(active)requestAnimationFrame(()=>active.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));}
  log(text:string){this.logEntries.push({round:this.round,text});this.renderLog();}
  renderLog(){ui.logList.innerHTML='';for(const e of this.logEntries){const row=document.createElement('div');row.className='log-entry';row.innerHTML=`<b>R${e.round}</b><span>${e.text}</span>`;ui.logList.appendChild(row);}ui.logList.scrollTop=ui.logList.scrollHeight;}
  closeActionMenu(){ui.actionPanel.hidden=true;ui.actionToggle.setAttribute('aria-expanded','false');}
  closeLog(){ui.logPanel.hidden=true;ui.logToggle.setAttribute('aria-expanded','false');}
  message(t:string){ui.instruction.textContent=t;}
  schedule(ms:number,fn:()=>void){const id=window.setTimeout(()=>{this.timerIds=this.timerIds.filter(x=>x!==id);fn();},ms);this.timerIds.push(id);}
  clearTimers(){this.timerIds.forEach(clearTimeout);this.timerIds=[];}
}

new Game();
