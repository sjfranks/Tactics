import Phaser from 'phaser';
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
  initiativeMod: number;
  initiativeScore: number;
  actionsUsed: number;
  defending: boolean;
};
type PrototypeUnit = Omit<Unit, 'initiativeScore' | 'actionsUsed' | 'defending'>;
type Obstacle = Point & { name: string };
type Prototype = { cols: number; rows: number; obstacles: Obstacle[]; units: PrototypeUnit[] };
type PendingAttack = { actorId: string; targetId: string };
type TurnSnapshot = { units: Unit[]; selectedId: string; round: number; turnOrder: string[]; activeIndex: number };

const CELL = 80;
const MOVE = 2;
const ACTIONS_PER_TURN = 3;
const HEAL_AMOUNT = 2;
const ENCOUNTER_DISTANCE = 4;
const STARTING_PARTY = { id: 'party', name: 'Party', mark: '✦', team: 'player' as const, x: 15, y: 24 };

const PROTOTYPES: Record<PrototypeMode, Prototype> = {
  tactical: {
    cols: 6, rows: 8,
    obstacles: [{ x: 2, y: 4, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 1, y: 6, hp: 5, maxHp: 5, damage: 2, initiativeMod: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 4, y: 6, hp: 4, maxHp: 4, damage: 2, initiativeMod: 4 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 1, y: 1, hp: 3, maxHp: 3, damage: 1, initiativeMod: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 4, y: 2, hp: 3, maxHp: 3, damage: 1, initiativeMod: 0 }
    ]
  },
  exploration: {
    cols: 30, rows: 30,
    obstacles: [{ x: 15, y: 18, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 14, y: 20, hp: 5, maxHp: 5, damage: 2, initiativeMod: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 16, y: 21, hp: 4, maxHp: 4, damage: 2, initiativeMod: 4 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 14, y: 15, hp: 3, maxHp: 3, damage: 1, initiativeMod: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 17, y: 17, hp: 3, maxHp: 3, damage: 1, initiativeMod: 0 }
    ]
  }
};

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const ui = {
  instruction: $('#instruction'),
  roundNumber: $('#round-number'), turnLabel: $('#turn-label'), initiativeRail: $('#initiative-rail'),
  undo: $('#undo-action') as HTMLButtonElement,
  actionToggle: $('#ability-menu-toggle') as HTMLButtonElement,
  actionPanel: $('#ability-menu-panel'), heal: $('#heal-action') as HTMLButtonElement, defend: $('#defend-action') as HTMLButtonElement,
  statsToggle: $('#stats-toggle') as HTMLButtonElement,
  restart: $('#restart') as HTMLButtonElement, restartOverlay: $('#restart-overlay') as HTMLButtonElement,
  tactical: $('#tactical-mode') as HTMLButtonElement, exploration: $('#exploration-mode') as HTMLButtonElement,
  settings: $('#settings-menu') as HTMLDetailsElement,
  drawer: $('#unit-drawer'), selectedName: $('#selected-name'), selectedTeam: $('#selected-team'), health: $('#health-text'),
  attack: $('#attack-stat'), movement: $('#movement-stat'), initiative: $('#initiative-stat'), actions: $('#actions-stat'), portrait: $('#portrait'),
  resultOverlay: $('#result-overlay'), resultTitle: $('#result-title'), resultCopy: $('#result-copy'),
  forecast: $('#combat-forecast'), matchup: $('#forecast-matchup'), forecastResult: $('#forecast-result')
};

let scene: TacticsScene;

class TacticsScene extends Phaser.Scene {
  mode: PrototypeMode = 'tactical';
  gameMode: GameMode = 'combat';
  cols = 6; rows = 8; obstacles: Obstacle[] = []; units: Unit[] = [];
  party = { ...STARTING_PARTY };
  selectedId = 'alden'; round = 1; turnOrder: string[] = []; activeIndex = 0; gameOver = false;
  cells = new Map<string, Phaser.GameObjects.Rectangle>();
  tokens = new Map<string, Phaser.GameObjects.Container>();
  routeGraphics?: Phaser.GameObjects.Graphics;
  destinationGraphics?: Phaser.GameObjects.Graphics;
  pendingAttack?: PendingAttack;
  draggingId?: string;
  dragRoute: Point[] = [];
  dragAttackTargetId?: string;
  actionHistory: TurnSnapshot[] = [];
  scheduledEvents: Phaser.Time.TimerEvent[] = [];
  pinchDistance = 0;
  baseZoom = 1;

  constructor() { super('tactics'); }

  create() {
    scene = this;
    this.input.addPointer(2);
    this.input.on('pointermove', () => this.handlePinch());
    this.input.on('pointerup', () => { if(!this.input.pointer1.isDown || !this.input.pointer2.isDown) this.pinchDistance = 0; });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => this.setCameraZoom(this.cameras.main.zoom * (dy > 0 ? .9 : 1.1)));
    this.scale.on('resize', () => this.time.delayedCall(80, () => this.handleResize()));
    this.reset('tactical');
  }

  reset(mode = this.mode) {
    this.cancelScheduledEvents(); this.tweens.killAll();
    this.mode = mode; const p = PROTOTYPES[mode]; this.gameMode = mode === 'exploration' ? 'explore' : 'combat';
    this.cols = p.cols; this.rows = p.rows; this.obstacles = p.obstacles.map(o => ({...o}));
    this.units = p.units.map(u => ({...u, initiativeScore: 0, actionsUsed: 0, defending: false})); this.party = {...STARTING_PARTY};
    this.selectedId = 'alden'; this.round = 1; this.turnOrder = []; this.activeIndex = 0; this.gameOver = false; this.actionHistory = [];
    this.pendingAttack=undefined; this.draggingId=undefined; this.dragRoute=[]; this.dragAttackTargetId=undefined; this.closeActionMenu(); this.hideForecast();
    this.buildBoard(); this.cameras.main.setBounds(0,0,this.cols*CELL,this.rows*CELL);
    if(this.gameMode==='combat'){ this.fitTactical(); this.rollInitiative(); this.beginActiveTurn(); }
    else { this.baseZoom=.85; this.cameras.main.setZoom(.85); this.centerOn(this.party); ui.turnLabel.textContent='Explore'; this.syncUI(); }
    ui.resultOverlay.hidden=true;
  }

  rollInitiative() {
    for(const u of this.living()) { u.initiativeScore = Phaser.Math.Between(1,20) + u.initiativeMod; u.actionsUsed = 0; }
    this.turnOrder = this.living().sort((a,b)=>b.initiativeScore-a.initiativeScore || b.initiativeMod-a.initiativeMod).map(u=>u.id);
    this.activeIndex = 0;
  }

  activeUnit(){ return this.unit(this.turnOrder[this.activeIndex]); }
  isActivePlayer(unit:Unit){ return this.gameMode==='combat' && this.activeUnit()?.id===unit.id && unit.team==='player' && !this.gameOver; }
  hasAction(unit:Unit){ return unit.actionsUsed < ACTIONS_PER_TURN; }
  useAction(unit:Unit){ unit.actionsUsed=Math.min(ACTIONS_PER_TURN,unit.actionsUsed+1); }

  beginActiveTurn() {
    if(this.gameOver || this.gameMode!=='combat') return;
    while(this.activeIndex < this.turnOrder.length && !this.unit(this.turnOrder[this.activeIndex])) this.activeIndex++;
    if(this.activeIndex >= this.turnOrder.length){ this.round++; this.rollInitiative(); }
    const active=this.activeUnit(); if(!active)return;
    active.actionsUsed=0; this.selectedId=active.id; this.pendingAttack=undefined; this.hideForecast(); this.closeActionMenu();
    this.buildBoard(); this.syncUI(); this.centerOn(active);
    this.message(`${active.name}'s turn · ${ACTIONS_PER_TURN} actions.`);
    if(active.team==='enemy') this.schedule(450,()=>void this.runEnemyAction());
  }

  finishActiveTurn() {
    if(this.gameOver)return;
    this.cancelScheduledEvents(); this.pendingAttack=undefined; this.hideForecast(); this.closeActionMenu(); this.activeIndex++; this.actionHistory=[];
    this.schedule(260,()=>this.beginActiveTurn());
  }

  maybeFinishTurn(unit:Unit) { if(unit.actionsUsed>=ACTIONS_PER_TURN) this.schedule(420,()=>this.finishActiveTurn()); }

  recordAction(selectedId:string) {
    this.cancelScheduledEvents();
    this.actionHistory.push({units:this.units.map(u=>({...u})),selectedId,round:this.round,turnOrder:[...this.turnOrder],activeIndex:this.activeIndex});
    this.syncUI();
  }

  undoLastAction() {
    const active=this.activeUnit(); if(!active || active.team!=='player' || !this.actionHistory.length)return;
    this.cancelScheduledEvents(); this.tweens.killAll(); const s=this.actionHistory.pop()!;
    this.units=s.units.map(u=>({...u})); this.selectedId=s.selectedId; this.round=s.round; this.turnOrder=[...s.turnOrder]; this.activeIndex=s.activeIndex;
    this.pendingAttack=undefined; this.hideForecast(); this.closeActionMenu(); this.gameOver=false; ui.resultOverlay.hidden=true; this.buildBoard(); this.syncUI();
    this.message('Undid one action.');
  }

  buildBoard() {
    this.children.removeAll(true); this.cells.clear(); this.tokens.clear(); this.routeGraphics=undefined; this.destinationGraphics=undefined;
    this.add.graphics().fillStyle(0x1c3138).fillRect(0,0,this.cols*CELL,this.rows*CELL);
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) {
      const fill=(x+y)%3===0?0x526d54:0x48644f;
      const cell=this.add.rectangle(x*CELL+CELL/2,y*CELL+CELL/2,CELL-3,CELL-3,fill,.97).setStrokeStyle(1,0x23382e,.7).setInteractive({useHandCursor:true});
      cell.on('pointerup',()=>this.handleCell(x,y)); this.cells.set(`${x},${y}`,cell);
    }
    for(const o of this.obstacles){ this.add.rectangle(o.x*CELL+CELL/2,o.y*CELL+CELL/2,CELL*.58,CELL*.58,0x465563).setStrokeStyle(3,0x9aa8b4); this.add.text(o.x*CELL+CELL/2,o.y*CELL+CELL/2,'◆',{color:'#d8e0e6',fontSize:'25px'}).setOrigin(.5); }
    if(this.gameMode==='explore') this.createPartyToken(); else this.living().forEach(u=>this.createToken(u));
    this.refreshHighlights();
  }

  createToken(unit:Unit) {
    const c=this.add.container(unit.x*CELL+CELL/2,unit.y*CELL+CELL/2);
    const active=this.activeUnit()?.id===unit.id;
    const circle=this.add.circle(0,0,CELL*.31,unit.team==='player'?0x1b78b5:0xb43b49).setStrokeStyle(active?5:3,active?0x72d8ff:0xffffff,.95);
    const text=this.add.text(0,-7,unit.mark,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'27px',color:'#fff'}).setOrigin(.5);
    const hp=this.add.text(0,19,`${unit.hp}/${unit.maxHp}`,{fontSize:'11px',color:'#d8ffe8'}).setOrigin(.5); c.add([circle,text,hp]);
    if(unit.defending){ const badge=this.add.circle(20,-20,11,0x203c68,.98).setStrokeStyle(2,0xd9efff,1); const sh=this.add.text(20,-21,'◆',{fontSize:'12px',color:'#d9efff'}).setOrigin(.5); c.add([badge,sh]); }
    if(active){ for(let i=0;i<ACTIONS_PER_TURN;i++){const available=i>=unit.actionsUsed; c.add(this.add.circle((i-1)*12,31,4,available?(unit.team==='player'?0x8ce9ff:0xff9b9b):0x263746,available?1:.6).setStrokeStyle(1,0xffffff,available?.9:.18));} }
    c.setSize(CELL*.72,CELL*.72).setInteractive({useHandCursor:true}); c.setData('dragged',false);
    if(unit.team==='player'){ this.input.setDraggable(c); c.on('dragstart',()=>this.beginUnitDrag(unit,c)); c.on('drag',(pointer:Phaser.Input.Pointer)=>this.updateUnitDrag(unit,c,pointer)); c.on('dragend',()=>this.finishUnitDrag(unit,c)); }
    c.on('pointerup',(_p:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();if(c.getData('dragged')){c.setData('dragged',false);return;}this.handleUnit(unit.id);});
    this.tokens.set(unit.id,c);
  }

  createPartyToken(){ const c=this.add.container(this.party.x*CELL+CELL/2,this.party.y*CELL+CELL/2);c.add([this.add.circle(0,0,CELL*.34,0x563eaf).setStrokeStyle(4,0xffe6a3),this.add.text(0,0,'✦',{fontSize:'31px',color:'#fff'}).setOrigin(.5)]).setSize(CELL*.8,CELL*.8).setInteractive({useHandCursor:true});this.input.setDraggable(c);c.on('dragstart',()=>{this.draggingId='party';c.setData('dragged',true)});c.on('drag',(p:Phaser.Input.Pointer)=>this.updatePartyDrag(c,p));c.on('dragend',()=>this.finishPartyDrag(c));this.tokens.set('party',c); }

  beginUnitDrag(unit:Unit,token:Phaser.GameObjects.Container){ if(!this.isActivePlayer(unit)||!this.hasAction(unit))return;this.clearAttackPreview();this.selectedId=unit.id;this.draggingId=unit.id;this.dragRoute=[];this.dragAttackTargetId=undefined;token.setData('dragged',true).setDepth(40).setAlpha(.88);this.refreshHighlights();this.syncUI(); }
  updateUnitDrag(unit:Unit,token:Phaser.GameObjects.Container,pointer:Phaser.Input.Pointer){ if(this.draggingId!==unit.id)return;const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);const dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)};const occ=this.at(dest.x,dest.y);this.dragAttackTargetId=undefined;
    if(occ?.team==='enemy'&&this.canAttack(unit,occ)){this.dragAttackTargetId=occ.id;this.dragRoute=[];token.x=world.x;token.y=world.y;this.showDragAttackTarget(occ);return;}
    const route=this.findRoute(unit,dest,unit.id);const legal=route.length>1&&route.length-1<=MOVE&&!occ;this.dragRoute=legal?route:[];token.x=world.x;token.y=world.y;this.showDragDestination(legal?dest:undefined,legal?route:undefined); }
  finishUnitDrag(unit:Unit,token:Phaser.GameObjects.Container){ if(this.draggingId!==unit.id)return;this.draggingId=undefined;token.setDepth(0).setAlpha(1);const route=this.dragRoute;const targetId=this.dragAttackTargetId;this.dragRoute=[];this.dragAttackTargetId=undefined;this.clearDragDestination();token.x=unit.x*CELL+CELL/2;token.y=unit.y*CELL+CELL/2;if(targetId){const t=this.unit(targetId);if(t)this.previewAttack(unit,t);return;}if(route.length>1)void this.moveActive(unit,route); }

  handleUnit(id:string){ if(this.gameOver||this.gameMode!=='combat')return;const target=this.unit(id);if(!target)return;
    if(this.pendingAttack&&id===this.pendingAttack.targetId){this.confirmAttack();return;}
    const active=this.activeUnit();
    if(active?.team==='player'&&target.team==='enemy'&&this.canAttack(active,target)){this.previewAttack(active,target);return;}
    this.clearAttackPreview();this.selectedId=id;this.refreshHighlights();this.syncUI();this.message(`${target.name} selected.`); }

  handleCell(x:number,y:number){ if(this.gameOver||this.draggingId)return;if(this.gameMode==='explore'){this.moveParty({x,y});return;}const active=this.activeUnit();if(!active||active.team!=='player'||!this.hasAction(active))return;
    if(this.pendingAttack){const t=this.unit(this.pendingAttack.targetId);if(t&&t.x===x&&t.y===y){this.confirmAttack();return;}}
    const occ=this.at(x,y);if(occ?.team==='enemy'&&this.canAttack(active,occ)){this.previewAttack(active,occ);return;}if(occ)return;
    this.clearAttackPreview();const route=this.findRoute(active,{x,y},active.id);if(route.length>1&&route.length-1<=MOVE)void this.moveActive(active,route); }

  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}
  previewAttack(actor:Unit,target:Unit){if(!this.canAttack(actor,target))return;this.pendingAttack={actorId:actor.id,targetId:target.id};this.selectedId=target.id;this.refreshHighlights();this.syncUI();const reduction=target.defending?1:0;const dmg=Math.max(0,actor.damage-reduction);ui.matchup.textContent=`${actor.name} → ${target.name}`;ui.forecastResult.textContent=`${dmg} damage · 1 action · tap to confirm`;ui.forecast.hidden=false;ui.forecast.tabIndex=0;}
  confirmAttack(){const p=this.pendingAttack;if(!p)return;const a=this.unit(p.actorId),t=this.unit(p.targetId);this.pendingAttack=undefined;this.hideForecast();if(a&&t)void this.attack(a,t);}
  clearAttackPreview(){this.pendingAttack=undefined;this.hideForecast();this.routeGraphics?.clear();}
  hideForecast(){ui.forecast.hidden=true;ui.forecast.tabIndex=-1;}

  async moveActive(unit:Unit,route:Point[]){if(!this.isActivePlayer(unit)||!this.hasAction(unit))return;this.recordAction(unit.id);this.clearAttackPreview();const token=this.tokens.get(unit.id);if(!token)return;const dest=route[route.length-1];this.drawRoute(route,unit.team);await this.tweenTo({targets:token,x:dest.x*CELL+CELL/2,y:dest.y*CELL+CELL/2,duration:170*(route.length-1),ease:'Sine.easeInOut'});unit.x=dest.x;unit.y=dest.y;this.useAction(unit);this.routeGraphics?.clear();this.rebuildToken(unit);this.refreshHighlights();this.syncUI();this.maybeFinishTurn(unit);}

  async attack(actor:Unit,target:Unit){if(!this.canAttack(actor,target))return;if(actor.team==='player')this.recordAction(actor.id);await this.animateAttack(actor,target);this.useAction(actor);let damage=actor.damage;if(target.defending){damage=Math.max(0,damage-1);target.defending=false;}target.hp=Math.max(0,target.hp-damage);this.floatText(target,damage===0?'BLOCK':`-${damage}`,damage===0?'#d9efff':'#fff1a8');this.selectedId=actor.id;this.message(`${actor.name} hits ${target.name} for ${damage}.`);if(target.hp<=0){this.tokens.get(target.id)?.destroy();this.tokens.delete(target.id);}else this.rebuildToken(target);this.rebuildToken(actor);this.checkGameOver();this.refreshHighlights();this.syncUI();if(!this.gameOver&&actor.team==='player')this.maybeFinishTurn(actor);}

  healSelected(){const u=this.activeUnit();if(!u||u.team!=='player'||!this.hasAction(u)||u.hp>=u.maxHp)return;this.recordAction(u.id);const amount=Math.min(HEAL_AMOUNT,u.maxHp-u.hp);u.hp+=amount;this.useAction(u);this.floatText(u,`+${amount}`,'#b8ffd0');this.closeActionMenu();this.rebuildToken(u);this.syncUI();this.refreshHighlights();this.maybeFinishTurn(u);}
  defendSelected(){const u=this.activeUnit();if(!u||u.team!=='player'||!this.hasAction(u)||u.defending)return;this.recordAction(u.id);u.defending=true;this.useAction(u);this.closeActionMenu();this.rebuildToken(u);this.syncUI();this.refreshHighlights();this.message(`${u.name} is defending against the next attack.`);this.maybeFinishTurn(u);}

  async runEnemyAction(){const enemy=this.activeUnit();if(!enemy||enemy.team!=='enemy'||this.gameOver)return;if(!this.hasAction(enemy)){this.finishActiveTurn();return;}this.selectedId=enemy.id;this.refreshHighlights();this.syncUI();const heroes=this.living('player');if(!heroes.length)return;heroes.sort((a,b)=>this.distance(enemy,a)-this.distance(enemy,b));const target=heroes[0];
    if(this.distance(enemy,target)===1){await this.attack(enemy,target);if(!this.gameOver)this.schedule(420,()=>void this.runEnemyAction());return;}
    const options=this.reachableTiles(enemy,MOVE).map(p=>({p,route:this.findRoute(enemy,p,enemy.id)})).filter(o=>o.route.length>1).sort((a,b)=>this.distance(a.p,target)-this.distance(b.p,target)||a.route.length-b.route.length);const best=options[0];if(best){await this.moveEnemy(enemy,best.route);}else this.useAction(enemy);this.rebuildToken(enemy);this.syncUI();this.schedule(380,()=>void this.runEnemyAction()); }
  async moveEnemy(enemy:Unit,route:Point[]){const token=this.tokens.get(enemy.id);if(!token)return;const dest=route[route.length-1];this.drawRoute(route,'enemy');await this.tweenTo({targets:token,x:dest.x*CELL+CELL/2,y:dest.y*CELL+CELL/2,duration:170*(route.length-1),ease:'Sine.easeInOut'});enemy.x=dest.x;enemy.y=dest.y;this.useAction(enemy);this.routeGraphics?.clear();this.rebuildToken(enemy);this.refreshHighlights();this.syncUI();}

  refreshHighlights(){this.cells.forEach((cell,key)=>{const[x,y]=key.split(',').map(Number);cell.setStrokeStyle(1,0x23382e,.7);cell.setFillStyle((x+y)%3===0?0x526d54:0x48644f,.97);});if(this.gameMode!=='combat')return;const selected=this.selected();if(!selected)return;
    if(selected.team==='enemy'){this.reachableTiles(selected,MOVE).forEach(p=>this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0xa92f3e,.46).setStrokeStyle(2,0xff747c,.72));const threat=new Set<string>();this.reachableTiles(selected,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(`${n.x},${n.y}`)));threat.forEach(k=>this.cells.get(k)?.setFillStyle(0xb76640,.38));this.cells.get(`${selected.x},${selected.y}`)?.setStrokeStyle(5,0xffd5a6,1);return;}
    if(!this.isActivePlayer(selected)||!this.hasAction(selected))return;this.reachableTiles(selected,MOVE).forEach(p=>{if(!(p.x===selected.x&&p.y===selected.y))this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0x238dc1,.5).setStrokeStyle(3,0x71e4ff,.9);});this.living('enemy').forEach(e=>{if(this.canAttack(selected,e))this.cells.get(`${e.x},${e.y}`)?.setFillStyle(0xb34842,.74).setStrokeStyle(4,0xff9a78,1);});}

  showDragDestination(dest?:Point,route?:Point[]){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;if(!dest||!route){this.routeGraphics?.clear();return;}this.drawRoute(route,'player');const g=this.add.graphics().setDepth(35);g.fillStyle(0x6bdcff,.24).fillRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);g.lineStyle(5,0xb8f5ff,1).strokeRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);this.destinationGraphics=g;}
  showDragAttackTarget(target:Unit){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;const g=this.add.graphics().setDepth(35);g.fillStyle(0xd14b3f,.34).fillRoundedRect(target.x*CELL+4,target.y*CELL+4,CELL-8,CELL-8,10);g.lineStyle(6,0xffd18a,1).strokeRoundedRect(target.x*CELL+4,target.y*CELL+4,CELL-8,CELL-8,10);this.destinationGraphics=g;}
  clearDragDestination(){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;this.routeGraphics?.clear();}

  drawRoute(route:Point[],team:Team){this.routeGraphics?.destroy();if(route.length<2)return;const g=this.add.graphics().setDepth(30);const outer=team==='enemy'?0x7a1724:0x075f88,inner=team==='enemy'?0xf05663:0x62dcff,shine=team==='enemy'?0xffa0a8:0xc6f7ff;const pts=route.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}));const prev=pts[pts.length-2],end=pts[pts.length-1];const angle=Math.atan2(end.y-prev.y,end.x-prev.x),ux=Math.cos(angle),uy=Math.sin(angle),px=-uy,py=ux;const shaftEnd={x:end.x-ux*13,y:end.y-uy*13},shaftPts=[...pts.slice(0,-1),shaftEnd];const stroke=(w:number,c:number,a=1)=>{g.lineStyle(w,c,a);g.beginPath();shaftPts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.strokePath();};stroke(24,outer,.96);stroke(14,inner,1);stroke(4,shine,.72);const base={x:end.x-ux*17,y:end.y-uy*17},tip={x:end.x+ux*24,y:end.y+uy*24},left={x:base.x+px*22,y:base.y+py*22},right={x:base.x-px*22,y:base.y-py*22};g.fillStyle(outer,1).fillTriangle(tip.x,tip.y,left.x,left.y,right.x,right.y);const ib={x:end.x-ux*14,y:end.y-uy*14},it={x:end.x+ux*17,y:end.y+uy*17},il={x:ib.x+px*13,y:ib.y+py*13},ir={x:ib.x-px*13,y:ib.y-py*13};g.fillStyle(inner,1).fillTriangle(it.x,it.y,il.x,il.y,ir.x,ir.y);this.routeGraphics=g;}

  async animateAttack(actor:Unit,target:Unit){const a=this.tokens.get(actor.id),t=this.tokens.get(target.id);if(!a||!t)return;const bx=a.x,by=a.y,dx=t.x-a.x,dy=t.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;a.setDepth(45);await this.tweenTo({targets:a,x:bx+ux*22,y:by+uy*22,duration:85,ease:'Quad.easeOut'});const ix=(a.x+t.x)/2,iy=(a.y+t.y)/2,slash=this.add.graphics().setDepth(60);slash.lineStyle(7,0xfff1a8,1).beginPath().moveTo(ix-uy*18-ux*8,iy+ux*18-uy*8).lineTo(ix+uy*18+ux*8,iy-ux*18+uy*8).strokePath();this.tweens.add({targets:slash,alpha:0,duration:180,onComplete:()=>slash.destroy()});this.tweens.add({targets:t,x:t.x+ux*7,y:t.y+uy*7,alpha:.5,duration:65,yoyo:true,repeat:1});this.cameras.main.shake(90,.0035);await this.tweenTo({targets:a,x:bx,y:by,duration:100,ease:'Quad.easeIn'});a.setDepth(0);}
  floatText(unit:Unit,text:string,color:string){const token=this.tokens.get(unit.id);if(!token)return;const t=this.add.text(token.x,token.y-20,text,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'23px',color,stroke:'#10202a',strokeThickness:5}).setOrigin(.5).setDepth(70);this.tweens.add({targets:t,y:t.y-34,alpha:0,duration:520,onComplete:()=>t.destroy()});}
  tweenTo(config:Phaser.Types.Tweens.TweenBuilderConfig){return new Promise<void>(resolve=>this.tweens.add({...config,onComplete:()=>resolve()}));}

  handlePinch(){const p1=this.input.pointer1,p2=this.input.pointer2;if(!(p1.isDown&&p2.isDown)){this.pinchDistance=0;return;}const d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y);if(this.pinchDistance>0)this.setCameraZoom(this.cameras.main.zoom*(d/this.pinchDistance));this.pinchDistance=d;}
  setCameraZoom(z:number){const min=this.gameMode==='combat'?this.baseZoom*.72:.35,max=this.gameMode==='combat'?this.baseZoom*2.6:2.6;this.cameras.main.setZoom(Phaser.Math.Clamp(z,min,max));}
  fitTactical(){const cam=this.cameras.main;this.baseZoom=Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL));cam.setZoom(this.baseZoom);cam.centerOn(this.cols*CELL/2,this.rows*CELL/2);}
  handleResize(){if(this.gameMode==='combat')this.fitTactical();else{this.cameras.main.setBounds(0,0,this.cols*CELL,this.rows*CELL);this.centerOn(this.party);}}
  centerOn(p:Point){this.cameras.main.pan(p.x*CELL+CELL/2,p.y*CELL+CELL/2,180,'Sine.easeOut');}

  updatePartyDrag(token:Phaser.GameObjects.Container,pointer:Phaser.Input.Pointer){if(this.draggingId!=='party')return;const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y),dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)},route=this.findRoute(this.party,dest,'party',true);this.dragRoute=route.length>1?route:[];token.x=world.x;token.y=world.y;this.showDragDestination(this.dragRoute.length?dest:undefined,this.dragRoute.length?this.dragRoute:undefined);}
  finishPartyDrag(token:Phaser.GameObjects.Container){if(this.draggingId!=='party')return;this.draggingId=undefined;const route=this.dragRoute;this.dragRoute=[];this.clearDragDestination();token.x=this.party.x*CELL+CELL/2;token.y=this.party.y*CELL+CELL/2;if(route.length>1)this.moveParty(route[route.length-1]);}
  moveParty(dest:Point){const route=this.findRoute(this.party,dest,'party',true);if(route.length<2)return;const token=this.tokens.get('party')!,end=route[route.length-1];this.drawRoute(route,'player');this.tweens.add({targets:token,x:end.x*CELL+CELL/2,y:end.y*CELL+CELL/2,duration:Math.min(1300,80*(route.length-1)),onComplete:()=>{this.party.x=end.x;this.party.y=end.y;this.routeGraphics?.clear();this.centerOn(this.party);const enemy=this.living('enemy').find(e=>this.distance(this.party,e)<=ENCOUNTER_DISTANCE);if(enemy)this.schedule(350,()=>this.reset('tactical'));}});}

  findRoute(start:Point,dest:Point,movingId:string,explore=false):Point[]{if(dest.x<0||dest.y<0||dest.x>=this.cols||dest.y>=this.rows||this.isObstacle(dest.x,dest.y))return[];const key=(p:Point)=>`${p.x},${p.y}`,q:Point[]=[{x:start.x,y:start.y}],prev=new Map<string,Point|null>([[key(start),null]]);while(q.length){const cur=q.shift()!;if(key(cur)===key(dest))break;for(const n of this.neighbors(cur)){const occ=this.at(n.x,n.y),blocked=explore?occ?.team==='enemy':!!occ&&occ.id!==movingId;if(prev.has(key(n))||this.isObstacle(n.x,n.y)||blocked)continue;prev.set(key(n),cur);q.push(n);}}if(!prev.has(key(dest)))return[];const route:Point[]=[];let cur:Point|null={...dest};while(cur){route.unshift(cur);cur=prev.get(key(cur))??null;}return route;}
  reachableTiles(unit:Unit,maxMove:number){const out:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){if(this.at(x,y)&&!(unit.x===x&&unit.y===y))continue;const r=this.findRoute(unit,{x,y},unit.id);if(r.length&&r.length-1<=maxMove)out.push({x,y});}return out;}
  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  unit(id?:string){return id?this.units.find(u=>u.id===id&&u.hp>0):undefined;}
  selected(){return this.unit(this.selectedId);}
  living(team?:Team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  neighbors(p:Point){return[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>n.x>=0&&n.y>=0&&n.x<this.cols&&n.y<this.rows);}

  schedule(delay:number,cb:()=>void){const e=this.time.delayedCall(delay,()=>{this.scheduledEvents=this.scheduledEvents.filter(x=>x!==e);cb();});this.scheduledEvents.push(e);return e;}
  cancelScheduledEvents(){this.scheduledEvents.forEach(e=>e.remove(false));this.scheduledEvents=[];}
  rebuildToken(unit:Unit){this.tokens.get(unit.id)?.destroy();this.createToken(unit);}
  checkGameOver(){const heroes=this.living('player'),enemies=this.living('enemy');if(heroes.length&&enemies.length)return;this.gameOver=true;this.cancelScheduledEvents();this.clearAttackPreview();ui.resultOverlay.hidden=false;ui.resultTitle.textContent=heroes.length?'Victory':'Defeat';ui.resultCopy.textContent=heroes.length?'The pass is secure.':'The party has fallen.';this.syncUI();}
  message(text:string){ui.instruction.textContent=text;}
  closeActionMenu(){ui.actionPanel.hidden=true;ui.actionToggle.setAttribute('aria-expanded','false');}

  syncUI(){ui.roundNumber.textContent=String(this.round);const active=this.activeUnit();ui.turnLabel.textContent=this.gameMode==='explore'?'Explore':active?`${active.name}'s Turn`:'Rolling initiative…';
    ui.undo.disabled=!active||active.team!=='player'||this.actionHistory.length===0;ui.actionToggle.disabled=!active||active.team!=='player'||!this.hasAction(active)||this.gameOver;
    ui.heal.disabled=!active||active.team!=='player'||!this.hasAction(active)||active.hp>=active.maxHp;ui.defend.disabled=!active||active.team!=='player'||!this.hasAction(active)||active.defending;
    ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical'));ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));
    const s=this.selected()??active??this.living()[0];if(s){ui.selectedName.textContent=s.name;ui.selectedTeam.textContent=s.team==='player'?'Hero':'Enemy';ui.health.textContent=`${s.hp} / ${s.maxHp}`;ui.attack.textContent=String(s.damage);ui.movement.textContent=String(MOVE);ui.initiative.textContent=`${s.initiativeMod>=0?'+':''}${s.initiativeMod} (${s.initiativeScore})`;ui.actions.textContent=active?.id===s.id?`${ACTIONS_PER_TURN-s.actionsUsed} / ${ACTIONS_PER_TURN}`:'—';ui.portrait.textContent=s.mark;}
    ui.initiativeRail.innerHTML='';this.turnOrder.forEach((id,index)=>{const u=this.unit(id);if(!u)return;const b=document.createElement('button');b.type='button';b.className=`initiative-token ${u.team}${index===this.activeIndex?' active':''}${index<this.activeIndex?' done':''}`;b.setAttribute('role','listitem');b.setAttribute('aria-label',`${u.name}, initiative ${u.initiativeScore}${index===this.activeIndex?', current turn':''}`);b.innerHTML=`<span>${u.mark}</span><i class="initiative-score">${u.initiativeScore}</i>`;b.addEventListener('click',()=>{this.clearAttackPreview();this.selectedId=u.id;this.refreshHighlights();this.syncUI();this.centerOn(u);});ui.initiativeRail.appendChild(b);});
    const current=ui.initiativeRail.querySelector('.active') as HTMLElement|null;current?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:'battlefield',backgroundColor:'#243d44',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},render:{antialias:true,pixelArt:false},scene:TacticsScene});
ui.forecast.addEventListener('click',()=>scene.confirmAttack());
ui.forecast.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();scene.confirmAttack();}});
ui.undo.addEventListener('click',()=>scene.undoLastAction());
ui.actionToggle.addEventListener('click',()=>{const open=ui.actionPanel.hidden;ui.actionPanel.hidden=!open;ui.actionToggle.setAttribute('aria-expanded',String(open));});
ui.heal.addEventListener('click',()=>scene.healSelected());
ui.defend.addEventListener('click',()=>scene.defendSelected());
ui.statsToggle.addEventListener('click',()=>{const open=ui.drawer.classList.toggle('open');ui.statsToggle.setAttribute('aria-expanded',String(open));});
ui.restart.addEventListener('click',()=>{scene.reset();ui.settings.open=false;});
ui.restartOverlay.addEventListener('click',()=>scene.reset());
ui.tactical.addEventListener('click',()=>{scene.reset('tactical');ui.settings.open=false;});
ui.exploration.addEventListener('click',()=>{scene.reset('exploration');ui.settings.open=false;});
