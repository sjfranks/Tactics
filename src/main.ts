import Phaser from 'phaser';
import '../dist/styles.css';
import './phaser.css';

type Team = 'player' | 'enemy';
type PrototypeMode = 'tactical' | 'exploration';
type GameMode = 'combat' | 'explore';
type Point = { x: number; y: number };
type Unit = Point & {
  id: string;
  name: string;
  mark: string;
  team: Team;
  hp: number;
  maxHp: number;
  damage: number;
  acted: boolean;
};
type Obstacle = Point & { name: string };
type Prototype = { cols: number; rows: number; zoom: number; obstacles: Obstacle[]; units: Omit<Unit, 'acted'>[] };

type PendingAttack = { actorId: string; targetId: string; route: Point[] };

const CELL = 80;
const MOVE = 2;
const ENCOUNTER_DISTANCE = 4;
const STARTING_PARTY = { id: 'party', name: 'Party', mark: '✦', team: 'player' as const, x: 15, y: 24 };
const PROTOTYPES: Record<PrototypeMode, Prototype> = {
  tactical: {
    cols: 6, rows: 8, zoom: 1, obstacles: [{ x: 2, y: 4, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 1, y: 6, hp: 5, maxHp: 5, damage: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 4, y: 6, hp: 4, maxHp: 4, damage: 2 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 1, y: 1, hp: 3, maxHp: 3, damage: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 4, y: 2, hp: 3, maxHp: 3, damage: 1 }
    ]
  },
  exploration: {
    cols: 30, rows: 30, zoom: 5, obstacles: [{ x: 15, y: 18, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 14, y: 20, hp: 5, maxHp: 5, damage: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 16, y: 21, hp: 4, maxHp: 4, damage: 2 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 14, y: 15, hp: 3, maxHp: 3, damage: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 17, y: 17, hp: 3, maxHp: 3, damage: 1 }
    ]
  }
};

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const ui = {
  instruction: $('#instruction'), roster: $('#player-roster'), endTurn: $('#end-turn') as HTMLButtonElement,
  restart: $('#restart') as HTMLButtonElement, restartOverlay: $('#restart-overlay') as HTMLButtonElement,
  tactical: $('#tactical-mode') as HTMLButtonElement, exploration: $('#exploration-mode') as HTMLButtonElement,
  settings: $('#settings-menu') as HTMLDetailsElement, turnPill: $('#turn-pill'), turnNumber: $('#turn-number'),
  drawer: $('#unit-drawer'), drawerToggle: $('#drawer-toggle') as HTMLButtonElement,
  selectedName: $('#selected-name'), selectedTeam: $('#selected-team'), health: $('#health-text'),
  attack: $('#attack-stat'), movement: $('#movement-stat'), portrait: $('#portrait'),
  resultOverlay: $('#result-overlay'), resultTitle: $('#result-title'), resultCopy: $('#result-copy'),
  forecast: $('#combat-forecast'), matchup: $('#forecast-matchup'), forecastResult: $('#forecast-result')
};

let scene: TacticsScene;

class TacticsScene extends Phaser.Scene {
  mode: PrototypeMode = 'tactical';
  gameMode: GameMode = 'combat';
  cols = 6; rows = 8; obstacles: Obstacle[] = []; units: Unit[] = [];
  party = { ...STARTING_PARTY };
  selectedId = 'alden'; turn = 1; phase: Team = 'player'; gameOver = false;
  cells = new Map<string, any>();
  tokens = new Map<string, any>();
  routeGraphics?: any;
  destinationGraphics?: any;
  panOrigin?: { x: number; y: number; scrollX: number; scrollY: number };
  pinchDistance = 0;
  pendingAttack?: PendingAttack;
  draggingId?: string;
  dragRoute: Point[] = [];

  constructor() { super('tactics'); }

  create() {
    scene = this;
    this.input.addPointer(2);
    this.input.on('pointerdown', (pointer: any) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer: any) => this.onPointerMove(pointer));
    this.input.on('pointerup', () => { this.panOrigin = undefined; this.pinchDistance = 0; });
    this.input.on('wheel', (_p: any, _go: unknown[], _dx: number, dy: number) => {
      if (this.gameMode === 'explore') this.setZoom(this.cameras.main.zoom * (dy > 0 ? .9 : 1.1));
    });
    this.reset('tactical');
  }

  reset(mode = this.mode) {
    this.mode = mode;
    const p = PROTOTYPES[mode];
    this.gameMode = mode === 'exploration' ? 'explore' : 'combat';
    this.cols = p.cols; this.rows = p.rows; this.obstacles = p.obstacles.map(o => ({ ...o }));
    this.units = p.units.map(u => ({ ...u, acted: false })); this.party = { ...STARTING_PARTY };
    this.selectedId = 'alden'; this.turn = 1; this.phase = 'player'; this.gameOver = false;
    this.pendingAttack = undefined; this.draggingId = undefined; this.dragRoute = [];
    this.hideForecast();
    this.buildBoard();
    this.cameras.main.setBounds(0, 0, this.cols * CELL, this.rows * CELL);
    if (this.gameMode === 'combat') this.fitTactical(); else { this.setZoom(.85); this.centerOn(this.party); }
    ui.resultOverlay.hidden = true;
    this.message(this.gameMode === 'explore' ? 'Tap a destination or drag the party token to explore.' : 'Tap or drag a hero to move. Tap a raider to preview an attack.');
    this.syncUI();
  }

  buildBoard() {
    this.children.removeAll(true); this.cells.clear(); this.tokens.clear();
    const bg = this.add.graphics(); bg.fillStyle(0x243d44).fillRect(0, 0, this.cols * CELL, this.rows * CELL);
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const fill = (x + y) % 3 === 0 ? 0x536f5b : 0x496957;
      const cell = this.add.rectangle(x * CELL + CELL/2, y * CELL + CELL/2, CELL-4, CELL-4, fill, .95)
        .setStrokeStyle(1, 0x8198b5, .25).setInteractive({ useHandCursor: true });
      cell.setData({ x, y }); cell.on('pointerup', () => this.handleCell(x, y)); this.cells.set(`${x},${y}`, cell);
    }
    for (const o of this.obstacles) {
      this.add.rectangle(o.x*CELL+CELL/2, o.y*CELL+CELL/2, CELL*.58, CELL*.58, 0x465563).setStrokeStyle(3,0x9aa8b4);
      this.add.text(o.x*CELL+CELL/2, o.y*CELL+CELL/2, '◆', { color:'#d8e0e6', fontSize:'25px' }).setOrigin(.5);
    }
    if (this.gameMode === 'explore') this.createPartyToken(); else this.units.filter(u => u.hp > 0).forEach(u => this.createToken(u));
    this.refreshHighlights();
  }

  createToken(unit: Unit) {
    const c = this.add.container(unit.x*CELL+CELL/2, unit.y*CELL+CELL/2);
    const circle = this.add.circle(0,0,CELL*.31, unit.team === 'player' ? 0x1677b8 : 0xb73847).setStrokeStyle(3,0xffffff,.8);
    const text = this.add.text(0,-3,unit.mark,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'28px',color:'#fff'}).setOrigin(.5);
    const hp = this.add.text(0,25,`${unit.hp}/${unit.maxHp}`,{fontSize:'11px',color:'#d8ffe8'}).setOrigin(.5);
    c.add([circle,text,hp]).setSize(CELL*.72,CELL*.72).setInteractive({ useHandCursor:true });
    c.setData('unitId', unit.id); c.setData('dragged', false);
    if (unit.team === 'player') {
      this.input.setDraggable(c);
      c.on('dragstart', () => this.beginUnitDrag(unit, c));
      c.on('drag', (pointer:any) => this.updateUnitDrag(unit, c, pointer));
      c.on('dragend', () => this.finishUnitDrag(unit, c));
    }
    c.on('pointerup', (_p: any, _lx:number, _ly:number, event:any) => {
      event.stopPropagation();
      if (c.getData('dragged')) { c.setData('dragged', false); return; }
      this.handleUnit(unit.id);
    });
    this.tokens.set(unit.id,c);
  }

  createPartyToken() {
    const c = this.add.container(this.party.x*CELL+CELL/2,this.party.y*CELL+CELL/2);
    const circle = this.add.circle(0,0,CELL*.34,0x563eaf).setStrokeStyle(4,0xffe6a3);
    const text = this.add.text(0,0,'✦',{fontSize:'31px',color:'#fff'}).setOrigin(.5);
    c.add([circle,text]).setSize(CELL*.8,CELL*.8).setInteractive({useHandCursor:true});
    c.setData('dragged', false); this.input.setDraggable(c);
    c.on('dragstart', () => { this.draggingId='party'; c.setData('dragged', true); this.panOrigin=undefined; });
    c.on('drag', (pointer:any) => this.updatePartyDrag(c,pointer));
    c.on('dragend', () => this.finishPartyDrag(c));
    this.tokens.set('party',c);
  }

  beginUnitDrag(unit:Unit, token:any) {
    if (this.gameOver || this.gameMode !== 'combat' || this.phase !== 'player' || unit.acted) return;
    this.clearAttackPreview();
    this.selectedId=unit.id; this.draggingId=unit.id; this.dragRoute=[]; token.setData('dragged',true); token.setDepth(40); token.setAlpha(.88);
    this.refreshHighlights(); this.syncUI();
  }

  updateUnitDrag(unit:Unit, token:any, pointer:any) {
    if (this.draggingId !== unit.id || unit.acted) return;
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    const dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)};
    const route=this.findRoute(unit,dest,unit.id);
    const legal=route.length>1 && route.length-1<=MOVE && !this.at(dest.x,dest.y);
    this.dragRoute=legal?route:[];
    token.x=world.x; token.y=world.y;
    this.showDragDestination(legal?dest:undefined, legal?route:undefined);
  }

  finishUnitDrag(unit:Unit, token:any) {
    if (this.draggingId !== unit.id) return;
    this.draggingId=undefined; token.setDepth(0); token.setAlpha(1);
    const route=this.dragRoute; this.dragRoute=[]; this.clearDragDestination();
    if (route.length>1) {
      const start=route[0]; token.x=start.x*CELL+CELL/2; token.y=start.y*CELL+CELL/2;
      this.moveUnit(unit,route,true);
    } else {
      token.x=unit.x*CELL+CELL/2; token.y=unit.y*CELL+CELL/2;
    }
  }

  updatePartyDrag(token:any,pointer:any) {
    if(this.draggingId!=='party') return;
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y); const dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)};
    const route=this.findRoute(this.party,dest,'party',true); this.dragRoute=route.length>1?route:[];
    token.x=world.x;token.y=world.y;this.showDragDestination(this.dragRoute.length?dest:undefined,this.dragRoute.length?this.dragRoute:undefined);
  }

  finishPartyDrag(token:any) {
    if(this.draggingId!=='party')return; this.draggingId=undefined; const route=this.dragRoute;this.dragRoute=[];this.clearDragDestination();
    token.x=this.party.x*CELL+CELL/2;token.y=this.party.y*CELL+CELL/2;
    if(route.length>1)this.moveParty(route[route.length-1]);
  }

  showDragDestination(dest?:Point,route?:Point[]) {
    this.destinationGraphics?.destroy(); this.destinationGraphics=undefined;
    if(!dest||!route){this.routeGraphics?.clear();return;}
    this.drawRoute(route,'player'); const g=this.add.graphics().setDepth(35);g.fillStyle(0x71e4ff,.28).fillRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);g.lineStyle(5,0x9cf0ff,1).strokeRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);this.destinationGraphics=g;
  }
  clearDragDestination(){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;this.routeGraphics?.clear();}

  handleUnit(id: string) {
    if (this.gameOver || this.gameMode !== 'combat' || this.phase !== 'player') return;
    const target = this.unit(id); if (!target) return;
    if (target.team === 'player') {
      this.clearAttackPreview(); this.selectedId = id; this.message(`${target.name} selected.`); this.refreshHighlights(); this.syncUI(); return;
    }
    const actor = this.selected(); if (actor && this.canAttack(actor,target)) this.previewAttack(actor,target);
  }

  handleCell(x:number,y:number) {
    if (this.gameOver || this.draggingId) return;
    if (this.gameMode === 'explore') { this.moveParty({x,y}); return; }
    if (this.phase !== 'player') return;
    const actor = this.selected(); if (!actor || actor.acted) return;
    const occupant = this.at(x,y);
    if (occupant?.team === 'enemy' && this.canAttack(actor,occupant)) { this.previewAttack(actor,occupant); return; }
    this.clearAttackPreview();
    const route = this.findRoute(actor,{x,y},actor.id);
    if (route.length > 1 && route.length-1 <= MOVE) this.moveUnit(actor,route,true);
  }

  previewAttack(actor:Unit,target:Unit) {
    const route=this.attackRoute(actor,target); if(!route)return;
    this.pendingAttack={actorId:actor.id,targetId:target.id,route};
    this.drawRoute([...route,{x:target.x,y:target.y}],actor.team);
    this.refreshHighlights();
    const remaining=Math.max(0,target.hp-actor.damage);
    ui.matchup.textContent=`${actor.name} → ${target.name}`;
    ui.forecastResult.textContent=`${actor.damage} damage · ${target.hp} → ${remaining} HP · tap to confirm`;
    ui.forecast.hidden=false; ui.forecast.tabIndex=0;
    this.message(`Preview: ${actor.name} attacks ${target.name} for ${actor.damage}. Confirm the attack.`);
  }

  confirmAttack() {
    const pending=this.pendingAttack;if(!pending)return;
    const actor=this.unit(pending.actorId),target=this.unit(pending.targetId);this.pendingAttack=undefined;this.hideForecast();
    if(actor&&target)this.attack(actor,target,pending.route);
  }

  clearAttackPreview(){this.pendingAttack=undefined;this.hideForecast();this.routeGraphics?.clear();this.refreshHighlights();}
  hideForecast(){ui.forecast.hidden=true;ui.forecast.tabIndex=-1;}

  moveUnit(unit:Unit, route:Point[], consumeAction:boolean) {
    const token = this.tokens.get(unit.id); if (!token) return;
    this.clearAttackPreview(); const dest = route[route.length-1]; this.drawRoute(route, unit.team);
    this.tweens.add({ targets:token, x:dest.x*CELL+CELL/2, y:dest.y*CELL+CELL/2, duration:180*(route.length-1), ease:'Sine.easeInOut', onComplete:()=>{
      unit.x=dest.x; unit.y=dest.y; if (consumeAction) unit.acted=true; this.routeGraphics?.clear(); this.refreshHighlights(); this.syncUI();
    }});
  }

  async attack(actor:Unit,target:Unit,knownRoute?:Point[]) {
    if (actor.acted || target.hp<=0) return;
    const route = knownRoute ?? this.attackRoute(actor,target); if (!route) return;
    if (route.length>1) await new Promise<void>(resolve=>{
      const token=this.tokens.get(actor.id)!; const dest=route[route.length-1]; this.drawRoute(route,actor.team);
      this.tweens.add({targets:token,x:dest.x*CELL+CELL/2,y:dest.y*CELL+CELL/2,duration:170*(route.length-1),onComplete:()=>{actor.x=dest.x;actor.y=dest.y;resolve();}});
    });
    actor.acted=true; target.hp=Math.max(0,target.hp-actor.damage); this.message(`${actor.name} hits ${target.name} for ${actor.damage}.`);
    const t=this.tokens.get(target.id); if (t) this.tweens.add({targets:t,alpha:.25,duration:80,yoyo:true,repeat:2,onComplete:()=>{ if(target.hp<=0){t.destroy();this.tokens.delete(target.id);} else this.rebuildToken(target); }});
    this.routeGraphics?.clear(); this.checkGameOver(); this.refreshHighlights(); this.syncUI();
  }

  rebuildToken(unit:Unit) { const old=this.tokens.get(unit.id); old?.destroy(); this.createToken(unit); }

  endPlayerTurn() {
    if (this.gameOver || this.gameMode !== 'combat' || this.phase !== 'player') return;
    this.clearAttackPreview(); this.phase='enemy'; this.syncUI(); this.message('Enemies are moving…');
    this.time.delayedCall(300,()=>this.enemyTurn());
  }

  enemyTurn() {
    const enemies=this.living('enemy'); let delay=0;
    enemies.forEach(enemy=>{ this.time.delayedCall(delay,()=>this.enemyAct(enemy)); delay+=500; });
    this.time.delayedCall(delay+150,()=>{ if(this.gameOver)return; this.phase='player'; this.turn++; this.living('player').forEach(u=>u.acted=false); this.syncUI(); this.refreshHighlights(); this.message('Your turn.'); });
  }

  enemyAct(enemy:Unit) {
    const heroes=this.living('player'); if(!heroes.length)return;
    heroes.sort((a,b)=>this.distance(enemy,a)-this.distance(enemy,b)); const target=heroes[0];
    if(this.distance(enemy,target)===1){ target.hp=Math.max(0,target.hp-enemy.damage); this.message(`${enemy.name} hits ${target.name} for ${enemy.damage}.`); if(target.hp<=0){this.tokens.get(target.id)?.destroy();this.tokens.delete(target.id);} else this.rebuildToken(target); this.checkGameOver(); return; }
    const neighbors=this.neighbors(target).filter(p=>!this.at(p.x,p.y)&&!this.isObstacle(p.x,p.y));
    const options=neighbors.map(p=>({p,route:this.findRoute(enemy,p,enemy.id)})).filter(o=>o.route.length>1&&o.route.length-1<=MOVE).sort((a,b)=>a.route.length-b.route.length);
    if(options[0]) this.moveUnit(enemy,options[0].route,false);
  }

  moveParty(dest:Point) {
    const route=this.findRoute(this.party,dest,'party',true); if(route.length<2)return;
    const token=this.tokens.get('party')!; const end=route[route.length-1]; this.drawRoute(route,'player');
    this.tweens.add({targets:token,x:end.x*CELL+CELL/2,y:end.y*CELL+CELL/2,duration:Math.min(1300,80*(route.length-1)),onComplete:()=>{
      this.party.x=end.x;this.party.y=end.y;this.routeGraphics?.clear();this.centerOn(this.party);
      const enemy=this.living('enemy').find(e=>this.distance(this.party,e)<=ENCOUNTER_DISTANCE);
      if(enemy){ this.message(`Enemy spotted: ${enemy.name}. Combat begins.`); this.time.delayedCall(350,()=>this.reset('tactical')); }
    }});
  }

  findRoute(start:Point,dest:Point,movingId:string,explore=false):Point[] {
    if(dest.x<0||dest.y<0||dest.x>=this.cols||dest.y>=this.rows||this.isObstacle(dest.x,dest.y))return[];
    const key=(p:Point)=>`${p.x},${p.y}`; const q:Point[]=[{x:start.x,y:start.y}]; const prev=new Map<string,Point|null>([[key(start),null]]);
    while(q.length){const cur=q.shift()!;if(key(cur)===key(dest))break;for(const n of this.neighbors(cur)){const occ=this.at(n.x,n.y);const blocked=explore?occ?.team==='enemy':!!occ&&occ.id!==movingId;if(prev.has(key(n))||this.isObstacle(n.x,n.y)||blocked)continue;prev.set(key(n),cur);q.push(n);}}
    if(!prev.has(key(dest)))return[];const route:Point[]=[];let cur:Point|null={...dest};while(cur){route.unshift(cur);cur=prev.get(key(cur))??null;}return route;
  }

  attackRoute(actor:Unit,target:Unit):Point[]|null {
    if(actor.acted||actor.team===target.team)return null;
    if(this.distance(actor,target)===1)return [{x:actor.x,y:actor.y}];
    const candidates=this.neighbors(target).map(p=>({p,route:this.findRoute(actor,p,actor.id)})).filter(o=>o.route.length>1&&o.route.length-1<=MOVE).sort((a,b)=>a.route.length-b.route.length);
    return candidates[0]?.route ?? null;
  }
  canAttack(a:Unit,t:Unit){return !!this.attackRoute(a,t);}
  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  unit(id:string){return this.units.find(u=>u.id===id&&u.hp>0);}
  selected(){return this.unit(this.selectedId);}
  living(team:Team){return this.units.filter(u=>u.team===team&&u.hp>0);}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  neighbors(p:Point){return [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>n.x>=0&&n.y>=0&&n.x<this.cols&&n.y<this.rows);}

  drawRoute(route:Point[],team:Team){ this.routeGraphics?.destroy(); const g=this.add.graphics().setDepth(20); g.lineStyle(8,team==='enemy'?0xe95868:0x39bfe9,.9); g.beginPath(); route.forEach((p,i)=>{const x=p.x*CELL+CELL/2,y=p.y*CELL+CELL/2;i?g.lineTo(x,y):g.moveTo(x,y);}); g.strokePath(); this.routeGraphics=g; }

  refreshHighlights() {
    this.cells.forEach((cell,key)=>{cell.setStrokeStyle(1,0x8198b5,.25);cell.setFillStyle(((Number(key.split(',')[0])+Number(key.split(',')[1]))%3===0)?0x536f5b:0x496957,.95);});
    if(this.gameMode!=='combat'||this.phase!=='player')return; const actor=this.selected(); if(!actor||actor.acted)return;
    this.cells.forEach((cell)=>{const{x,y}=cell.data.values;const route=this.findRoute(actor,{x,y},actor.id);if(!this.at(x,y)&&route.length>1&&route.length-1<=MOVE){cell.setFillStyle(0x1c90be,.62).setStrokeStyle(3,0x71e4ff,.95);}});
    this.living('enemy').forEach(e=>{if(this.canAttack(actor,e))this.cells.get(`${e.x},${e.y}`)?.setFillStyle(0xa33638,.75).setStrokeStyle(4,0xff9a78,1);});
    if(this.pendingAttack){const t=this.unit(this.pendingAttack.targetId);if(t)this.cells.get(`${t.x},${t.y}`)?.setFillStyle(0xd14b3f,.92).setStrokeStyle(5,0xffd18a,1);}
  }

  fitTactical(){ const cam=this.cameras.main; const zoom=Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL)); cam.setZoom(zoom); cam.centerOn(this.cols*CELL/2,this.rows*CELL/2); }
  setZoom(z:number){const cam=this.cameras.main;cam.setZoom(Phaser.Math.Clamp(z,.35,2.4));}
  centerOn(p:Point){this.cameras.main.pan(p.x*CELL+CELL/2,p.y*CELL+CELL/2,220,'Sine.easeOut');}

  onPointerDown(pointer:any){ if(this.gameMode!=='explore'||this.draggingId)return; this.panOrigin={x:pointer.x,y:pointer.y,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY}; }
  onPointerMove(pointer:any){ if(this.gameMode!=='explore'||this.draggingId)return; const p1=this.input.pointer1,p2=this.input.pointer2; if(p1.isDown&&p2.isDown){const d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y);if(this.pinchDistance){this.setZoom(this.cameras.main.zoom*(d/this.pinchDistance));}this.pinchDistance=d;return;} if(pointer.isDown&&this.panOrigin){const cam=this.cameras.main;cam.scrollX=this.panOrigin.scrollX-(pointer.x-this.panOrigin.x)/cam.zoom;cam.scrollY=this.panOrigin.scrollY-(pointer.y-this.panOrigin.y)/cam.zoom;} }

  checkGameOver(){const heroes=this.living('player'),enemies=this.living('enemy');if(heroes.length&&enemies.length)return;this.gameOver=true;this.clearAttackPreview();ui.resultOverlay.hidden=false;ui.resultTitle.textContent=heroes.length?'Victory':'Defeat';ui.resultCopy.textContent=heroes.length?'The pass is secure.':'The party has fallen.';}
  message(text:string){ui.instruction.textContent=text;}
  syncUI(){
    ui.turnNumber.textContent=String(this.turn); ui.turnPill.textContent=this.gameMode==='explore'?'Explore':this.phase==='player'?'Player':'Enemy'; ui.turnPill.classList.toggle('enemy',this.phase==='enemy');
    ui.endTurn.hidden=this.gameMode==='explore'; ui.endTurn.disabled=this.phase!=='player'||this.gameOver;
    ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical')); ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));
    const s=this.selected()??this.living('player')[0]; if(s){ui.selectedName.textContent=s.name;ui.selectedTeam.textContent=s.team==='player'?'Hero':'Enemy';ui.health.textContent=`${s.hp} / ${s.maxHp}`;ui.attack.textContent=String(s.damage);ui.movement.textContent=String(MOVE);ui.portrait.textContent=s.mark;}
    ui.roster.innerHTML=''; for(const u of this.living('player')){const b=document.createElement('button');b.type='button';b.className=`roster-token${u.id===this.selectedId?' selected':''}${u.acted?' acted':''}`;b.textContent=u.mark;b.setAttribute('aria-label',`${u.name}, ${u.hp} of ${u.maxHp} health`);b.addEventListener('click',()=>{this.clearAttackPreview();this.selectedId=u.id;this.refreshHighlights();this.syncUI();if(this.gameMode==='combat')this.centerOn(u);});ui.roster.appendChild(b);}
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'battlefield',
  backgroundColor: '#243d44',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: { antialias: true, pixelArt: false },
  scene: TacticsScene
});

ui.forecast.addEventListener('click',()=>scene.confirmAttack());
ui.forecast.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();scene.confirmAttack();}});
ui.endTurn.addEventListener('click',()=>scene.endPlayerTurn());
ui.restart.addEventListener('click',()=>{scene.reset();ui.settings.open=false;});
ui.restartOverlay.addEventListener('click',()=>scene.reset());
ui.tactical.addEventListener('click',()=>{scene.reset('tactical');ui.settings.open=false;});
ui.exploration.addEventListener('click',()=>{scene.reset('exploration');ui.settings.open=false;});
ui.drawerToggle.addEventListener('click',()=>{const open=ui.drawer.classList.toggle('open');ui.drawerToggle.setAttribute('aria-expanded',String(open));});