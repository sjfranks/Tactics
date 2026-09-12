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
  actionsUsed: number;
  defending: boolean;
};
type Obstacle = Point & { name: string };
type PrototypeUnit = Omit<Unit, 'actionsUsed' | 'defending'>;
type Prototype = { cols: number; rows: number; obstacles: Obstacle[]; units: PrototypeUnit[] };
type PendingAttack = { actorId: string; targetId: string };
type TurnSnapshot = { units: Unit[]; selectedId: string; turn: number; phase: Team };

const CELL = 80;
const MOVE = 2;
const ACTIONS_PER_TURN = 3;
const HEAL_AMOUNT = 2;
const ENCOUNTER_DISTANCE = 4;
const STARTING_PARTY = { id: 'party', name: 'Party', mark: '✦', team: 'player' as const, x: 15, y: 24 };

const PROTOTYPES: Record<PrototypeMode, Prototype> = {
  tactical: {
    cols: 6,
    rows: 8,
    obstacles: [{ x: 2, y: 4, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 1, y: 6, hp: 5, maxHp: 5, damage: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 4, y: 6, hp: 4, maxHp: 4, damage: 2 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 1, y: 1, hp: 3, maxHp: 3, damage: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 4, y: 2, hp: 3, maxHp: 3, damage: 1 }
    ]
  },
  exploration: {
    cols: 30,
    rows: 30,
    obstacles: [{ x: 15, y: 18, name: 'Ancient pillar' }],
    units: [
      { id: 'alden', name: 'Alden', mark: 'A', team: 'player', x: 14, y: 20, hp: 5, maxHp: 5, damage: 2 },
      { id: 'mira', name: 'Mira', mark: 'M', team: 'player', x: 16, y: 21, hp: 4, maxHp: 4, damage: 2 },
      { id: 'raider-1', name: 'North Raider', mark: 'R', team: 'enemy', x: 14, y: 15, hp: 3, maxHp: 3, damage: 1 },
      { id: 'raider-2', name: 'Hill Raider', mark: 'R', team: 'enemy', x: 17, y: 17, hp: 3, maxHp: 3, damage: 1 }
    ]
  }
};

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const actionsEl = $('.actions');
const undoButton = $('#end-turn') as HTMLButtonElement;

const actionMenuWrap = document.createElement('div');
actionMenuWrap.className = 'ability-menu';
actionMenuWrap.innerHTML = `
  <button id="ability-menu-toggle" class="secondary-button" type="button" aria-expanded="false">Actions ▴</button>
  <div id="ability-menu-panel" class="ability-menu-panel" hidden>
    <button id="heal-action" type="button"><strong>Heal</strong><span>Restore ${HEAL_AMOUNT} HP · 1 action</span></button>
    <button id="defend-action" type="button"><strong>Defend</strong><span>-1 damage from next attack · 1 action</span></button>
  </div>
`;
actionsEl.prepend(actionMenuWrap);

const style = document.createElement('style');
style.textContent = `
  .ability-menu{position:relative;flex:1;min-width:0}
  .ability-menu>button{width:100%;min-height:46px;border-radius:12px;padding:0 14px}
  .ability-menu-panel{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:50;padding:6px;border:1px solid #53647b;border-radius:12px;background:rgba(18,28,44,.98);box-shadow:0 10px 28px rgba(0,0,0,.45)}
  .ability-menu-panel[hidden]{display:none}
  .ability-menu-panel button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;padding:8px 10px;border:0;border-radius:9px;color:#eef6ff;background:#1a283b;text-align:left;touch-action:manipulation}
  .ability-menu-panel button+button{margin-top:5px}
  .ability-menu-panel button:disabled{opacity:.42}
  .ability-menu-panel strong{font-size:.9rem}
  .ability-menu-panel span{color:#9fb0c5;font-size:.72rem;text-align:right}
`;
document.head.appendChild(style);

const ui = {
  instruction: $('#instruction'),
  roster: $('#player-roster'),
  undo: undoButton,
  actionToggle: $('#ability-menu-toggle') as HTMLButtonElement,
  actionPanel: $('#ability-menu-panel'),
  heal: $('#heal-action') as HTMLButtonElement,
  defend: $('#defend-action') as HTMLButtonElement,
  restart: $('#restart') as HTMLButtonElement,
  restartOverlay: $('#restart-overlay') as HTMLButtonElement,
  tactical: $('#tactical-mode') as HTMLButtonElement,
  exploration: $('#exploration-mode') as HTMLButtonElement,
  settings: $('#settings-menu') as HTMLDetailsElement,
  turnPill: $('#turn-pill'),
  turnNumber: $('#turn-number'),
  drawer: $('#unit-drawer'),
  drawerToggle: $('#drawer-toggle') as HTMLButtonElement,
  selectedName: $('#selected-name'),
  selectedTeam: $('#selected-team'),
  health: $('#health-text'),
  attack: $('#attack-stat'),
  movement: $('#movement-stat'),
  portrait: $('#portrait'),
  resultOverlay: $('#result-overlay'),
  resultTitle: $('#result-title'),
  resultCopy: $('#result-copy'),
  forecast: $('#combat-forecast'),
  matchup: $('#forecast-matchup'),
  forecastResult: $('#forecast-result')
};

let scene: TacticsScene;

class TacticsScene extends Phaser.Scene {
  mode: PrototypeMode = 'tactical';
  gameMode: GameMode = 'combat';
  cols = 6;
  rows = 8;
  obstacles: Obstacle[] = [];
  units: Unit[] = [];
  party = { ...STARTING_PARTY };
  selectedId = 'alden';
  turn = 1;
  phase: Team = 'player';
  gameOver = false;
  cells = new Map<string, Phaser.GameObjects.Rectangle>();
  tokens = new Map<string, Phaser.GameObjects.Container>();
  routeGraphics?: Phaser.GameObjects.Graphics;
  destinationGraphics?: Phaser.GameObjects.Graphics;
  panOrigin?: { x: number; y: number; scrollX: number; scrollY: number };
  pinchDistance = 0;
  pendingAttack?: PendingAttack;
  draggingId?: string;
  dragRoute: Point[] = [];
  dragAttackTargetId?: string;
  actionHistory: TurnSnapshot[] = [];
  scheduledEvents: Phaser.Time.TimerEvent[] = [];

  constructor() { super('tactics'); }

  create() {
    scene = this;
    this.input.addPointer(2);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', () => { this.panOrigin = undefined; this.pinchDistance = 0; });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      if (this.gameMode === 'explore') this.setZoom(this.cameras.main.zoom * (dy > 0 ? .9 : 1.1));
    });
    this.reset('tactical');
  }

  reset(mode = this.mode) {
    this.cancelScheduledEvents();
    this.mode = mode;
    const p = PROTOTYPES[mode];
    this.gameMode = mode === 'exploration' ? 'explore' : 'combat';
    this.cols = p.cols;
    this.rows = p.rows;
    this.obstacles = p.obstacles.map(o => ({ ...o }));
    this.units = p.units.map(u => ({ ...u, actionsUsed: 0, defending: false }));
    this.party = { ...STARTING_PARTY };
    this.selectedId = 'alden';
    this.turn = 1;
    this.phase = 'player';
    this.gameOver = false;
    this.pendingAttack = undefined;
    this.draggingId = undefined;
    this.dragRoute = [];
    this.dragAttackTargetId = undefined;
    this.actionHistory = [];
    this.closeActionMenu();
    this.hideForecast();
    this.buildBoard();
    this.cameras.main.setBounds(0, 0, this.cols * CELL, this.rows * CELL);
    if (this.gameMode === 'combat') this.fitTactical(); else { this.setZoom(.85); this.centerOn(this.party); }
    ui.resultOverlay.hidden = true;
    this.message(this.gameMode === 'explore'
      ? 'Tap a destination or drag the party token to explore.'
      : 'Each unit gets 3 actions. Move and attack are separate actions.');
    this.syncUI();
  }

  buildBoard() {
    this.children.removeAll(true);
    this.cells.clear();
    this.tokens.clear();
    this.routeGraphics = undefined;
    this.destinationGraphics = undefined;
    this.add.graphics().fillStyle(0x243d44).fillRect(0, 0, this.cols * CELL, this.rows * CELL);

    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const fill = (x + y) % 3 === 0 ? 0x536f5b : 0x496957;
      const cell = this.add.rectangle(x * CELL + CELL/2, y * CELL + CELL/2, CELL-4, CELL-4, fill, .95)
        .setStrokeStyle(1, 0x8198b5, .25)
        .setInteractive({ useHandCursor: true });
      cell.setData({ x, y });
      cell.on('pointerup', () => this.handleCell(x, y));
      this.cells.set(`${x},${y}`, cell);
    }

    for (const o of this.obstacles) {
      this.add.rectangle(o.x*CELL+CELL/2, o.y*CELL+CELL/2, CELL*.58, CELL*.58, 0x465563).setStrokeStyle(3,0x9aa8b4);
      this.add.text(o.x*CELL+CELL/2, o.y*CELL+CELL/2, '◆', { color:'#d8e0e6', fontSize:'25px' }).setOrigin(.5);
    }

    if (this.gameMode === 'explore') this.createPartyToken();
    else this.units.filter(u => u.hp > 0).forEach(u => this.createToken(u));
    this.refreshHighlights();
  }

  createToken(unit: Unit) {
    const c = this.add.container(unit.x*CELL+CELL/2, unit.y*CELL+CELL/2);
    const circle = this.add.circle(0,0,CELL*.31, unit.team === 'player' ? 0x1677b8 : 0xb73847).setStrokeStyle(3,0xffffff,.8);
    const text = this.add.text(0,-6,unit.mark,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'27px',color:'#fff'}).setOrigin(.5);
    const hp = this.add.text(0,20,`${unit.hp}/${unit.maxHp}`,{fontSize:'11px',color:'#d8ffe8'}).setOrigin(.5);
    c.add([circle,text,hp]);

    if (unit.defending) {
      const badge = this.add.circle(19,-20,11,0x203c68,.97).setStrokeStyle(2,0xd9efff,1);
      const shield = this.add.text(19,-21,'🛡',{fontSize:'13px'}).setOrigin(.5);
      c.add([badge,shield]);
    }

    for(let i=0;i<ACTIONS_PER_TURN;i++) {
      const available=i>=unit.actionsUsed;
      const pip=this.add.circle((i-1)*12,31,4,available ? (unit.team==='player'?0x8ce9ff:0xff9b9b) : 0x263746,available?1:.65)
        .setStrokeStyle(1,0xffffff,available ? .9 : .18);
      c.add(pip);
    }

    c.setSize(CELL*.72,CELL*.72).setInteractive({ useHandCursor:true });
    c.setData('dragged', false);
    if (unit.team === 'player') {
      this.input.setDraggable(c);
      c.on('dragstart', () => this.beginUnitDrag(unit, c));
      c.on('drag', (pointer: Phaser.Input.Pointer) => this.updateUnitDrag(unit, c, pointer));
      c.on('dragend', () => this.finishUnitDrag(unit, c));
    }
    c.on('pointerup', (_p: Phaser.Input.Pointer, _lx:number, _ly:number, event:Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (c.getData('dragged')) { c.setData('dragged', false); return; }
      this.handleUnit(unit.id);
    });
    if(unit.actionsUsed>=ACTIONS_PER_TURN)c.setAlpha(.62);
    this.tokens.set(unit.id,c);
  }

  createPartyToken() {
    const c = this.add.container(this.party.x*CELL+CELL/2,this.party.y*CELL+CELL/2);
    const circle = this.add.circle(0,0,CELL*.34,0x563eaf).setStrokeStyle(4,0xffe6a3);
    const text = this.add.text(0,0,'✦',{fontSize:'31px',color:'#fff'}).setOrigin(.5);
    c.add([circle,text]).setSize(CELL*.8,CELL*.8).setInteractive({useHandCursor:true});
    c.setData('dragged', false);
    this.input.setDraggable(c);
    c.on('dragstart', () => { this.draggingId='party'; c.setData('dragged', true); this.panOrigin=undefined; });
    c.on('drag', (pointer:Phaser.Input.Pointer) => this.updatePartyDrag(c,pointer));
    c.on('dragend', () => this.finishPartyDrag(c));
    this.tokens.set('party',c);
  }

  hasAction(unit:Unit){ return unit.actionsUsed < ACTIONS_PER_TURN; }
  useAction(unit:Unit){ unit.actionsUsed=Math.min(ACTIONS_PER_TURN,unit.actionsUsed+1); }
  canAttack(a:Unit,t:Unit){ return this.hasAction(a) && a.team!==t.team && this.distance(a,t)===1; }

  beginUnitDrag(unit:Unit, token:Phaser.GameObjects.Container) {
    if (this.gameOver || this.gameMode !== 'combat' || this.phase !== 'player' || unit.team !== 'player' || !this.hasAction(unit)) return;
    this.clearAttackPreview();
    this.selectedId=unit.id;
    this.draggingId=unit.id;
    this.dragRoute=[];
    this.dragAttackTargetId=undefined;
    token.setData('dragged',true).setDepth(40).setAlpha(.88);
    this.refreshHighlights();
    this.syncUI();
  }

  updateUnitDrag(unit:Unit, token:Phaser.GameObjects.Container, pointer:Phaser.Input.Pointer) {
    if (this.draggingId !== unit.id || !this.hasAction(unit)) return;
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    const dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)};
    const occupant=this.at(dest.x,dest.y);
    this.dragAttackTargetId=undefined;

    if(occupant?.team==='enemy' && this.canAttack(unit,occupant)) {
      this.dragAttackTargetId=occupant.id;
      this.dragRoute=[];
      token.x=world.x;
      token.y=world.y;
      this.showDragAttackTarget(occupant);
      return;
    }

    const route=this.findRoute(unit,dest,unit.id);
    const legal=route.length>1 && route.length-1<=MOVE && !occupant;
    this.dragRoute=legal?route:[];
    token.x=world.x;
    token.y=world.y;
    this.showDragDestination(legal?dest:undefined, legal?route:undefined);
  }

  finishUnitDrag(unit:Unit, token:Phaser.GameObjects.Container) {
    if (this.draggingId !== unit.id) return;
    this.draggingId=undefined;
    token.setDepth(0).setAlpha(1);
    const route=this.dragRoute;
    const attackTargetId=this.dragAttackTargetId;
    this.dragRoute=[];
    this.dragAttackTargetId=undefined;
    this.clearDragDestination();
    token.x=unit.x*CELL+CELL/2;
    token.y=unit.y*CELL+CELL/2;

    if(attackTargetId) {
      const target=this.unit(attackTargetId);
      if(target)this.previewAttack(unit,target);
      return;
    }
    if(route.length>1)this.moveUnit(unit,route,true);
  }

  updatePartyDrag(token:Phaser.GameObjects.Container,pointer:Phaser.Input.Pointer) {
    if(this.draggingId!=='party') return;
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    const dest={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)};
    const route=this.findRoute(this.party,dest,'party',true);
    this.dragRoute=route.length>1?route:[];
    token.x=world.x;
    token.y=world.y;
    this.showDragDestination(this.dragRoute.length?dest:undefined,this.dragRoute.length?this.dragRoute:undefined);
  }

  finishPartyDrag(token:Phaser.GameObjects.Container) {
    if(this.draggingId!=='party')return;
    this.draggingId=undefined;
    const route=this.dragRoute;
    this.dragRoute=[];
    this.clearDragDestination();
    token.x=this.party.x*CELL+CELL/2;
    token.y=this.party.y*CELL+CELL/2;
    if(route.length>1)this.moveParty(route[route.length-1]);
  }

  showDragDestination(dest?:Point,route?:Point[]) {
    this.destinationGraphics?.destroy();
    this.destinationGraphics=undefined;
    if(!dest||!route){this.routeGraphics?.clear();return;}
    this.drawRoute(route,'player');
    const g=this.add.graphics().setDepth(35);
    g.fillStyle(0x6bdcff,.24).fillRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);
    g.lineStyle(5,0xb8f5ff,1).strokeRoundedRect(dest.x*CELL+5,dest.y*CELL+5,CELL-10,CELL-10,10);
    this.destinationGraphics=g;
  }

  showDragAttackTarget(target:Unit) {
    this.destinationGraphics?.destroy();
    this.destinationGraphics=undefined;
    this.routeGraphics?.clear();
    const g=this.add.graphics().setDepth(35);
    g.fillStyle(0xd14b3f,.34).fillRoundedRect(target.x*CELL+4,target.y*CELL+4,CELL-8,CELL-8,10);
    g.lineStyle(6,0xffd18a,1).strokeRoundedRect(target.x*CELL+4,target.y*CELL+4,CELL-8,CELL-8,10);
    this.destinationGraphics=g;
  }

  clearDragDestination(){
    this.destinationGraphics?.destroy();
    this.destinationGraphics=undefined;
    this.routeGraphics?.clear();
  }

  handleUnit(id: string) {
    if (this.gameOver || this.gameMode !== 'combat') return;
    const target = this.unit(id);
    if (!target) return;

    if (this.pendingAttack && id === this.pendingAttack.targetId) {
      this.confirmAttack();
      return;
    }

    if (target.team === 'player') {
      if(this.phase!=='player') return;
      this.clearAttackPreview();
      this.selectedId=id;
      this.message(`${target.name} selected · ${ACTIONS_PER_TURN-target.actionsUsed} actions left.`);
      this.refreshHighlights();
      this.syncUI();
      return;
    }

    const actor = this.pendingAttack ? this.unit(this.pendingAttack.actorId) : this.selected();
    if(this.phase==='player' && actor?.team==='player' && this.canAttack(actor,target)) {
      this.previewAttack(actor,target);
      return;
    }

    this.clearAttackPreview();
    this.selectedId=id;
    this.message(`${target.name}: ${ACTIONS_PER_TURN-target.actionsUsed} actions left. Enemy movement and threat range.`);
    this.refreshHighlights();
    this.syncUI();
  }

  handleCell(x:number,y:number) {
    if (this.gameOver || this.draggingId) return;
    if (this.gameMode === 'explore') { this.moveParty({x,y}); return; }
    if (this.phase !== 'player') return;

    if (this.pendingAttack) {
      const pendingTarget=this.unit(this.pendingAttack.targetId);
      if(pendingTarget && pendingTarget.x===x && pendingTarget.y===y){ this.confirmAttack(); return; }
    }

    const actor = this.selected();
    if (!actor || actor.team!=='player' || !this.hasAction(actor)) return;
    const occupant = this.at(x,y);
    if (occupant?.team === 'enemy' && this.canAttack(actor,occupant)) {
      this.previewAttack(actor,occupant);
      return;
    }

    this.clearAttackPreview();
    const route = this.findRoute(actor,{x,y},actor.id);
    if (route.length > 1 && route.length-1 <= MOVE) this.moveUnit(actor,route,true);
  }

  previewAttack(actor:Unit,target:Unit) {
    if(!this.canAttack(actor,target))return;
    this.pendingAttack={actorId:actor.id,targetId:target.id};
    this.selectedId=target.id;
    this.refreshHighlights();
    this.syncUI();
    const remaining=Math.max(0,target.hp-actor.damage);
    ui.matchup.textContent=`${actor.name} → ${target.name}`;
    ui.forecastResult.textContent=`${actor.damage} damage · ${target.hp} → ${remaining} HP · 1 action · tap to confirm`;
    ui.forecast.hidden=false;
    ui.forecast.tabIndex=0;
    this.message(`Preview: ${actor.name} attacks ${target.name}. Movement and attack are separate actions.`);
  }

  confirmAttack() {
    const pending=this.pendingAttack;
    if(!pending)return;
    const actor=this.unit(pending.actorId),target=this.unit(pending.targetId);
    this.pendingAttack=undefined;
    this.hideForecast();
    if(actor&&target)this.attack(actor,target);
  }

  clearAttackPreview(){this.pendingAttack=undefined;this.hideForecast();this.routeGraphics?.clear();}
  hideForecast(){ui.forecast.hidden=true;ui.forecast.tabIndex=-1;}

  recordPlayerAction(selectedId:string) {
    this.cancelScheduledEvents();
    this.actionHistory.push({ units:this.units.map(u=>({...u})), selectedId, turn:this.turn, phase:'player' });
    this.syncUI();
  }

  undoLastAction() {
    if(this.gameMode!=='combat'||!this.actionHistory.length)return;
    this.cancelScheduledEvents();
    this.tweens.killAll();
    const snapshot=this.actionHistory.pop()!;
    this.pendingAttack=undefined;
    this.hideForecast();
    this.routeGraphics?.destroy();
    this.routeGraphics=undefined;
    this.gameOver=false;
    ui.resultOverlay.hidden=true;
    this.units=snapshot.units.map(u=>({...u}));
    this.selectedId=snapshot.selectedId;
    this.turn=snapshot.turn;
    this.phase='player';
    this.buildBoard();
    this.syncUI();
    this.message(`Undid one action. ${this.selected()?.name ?? 'Unit'} restored.`);
  }

  maybeAutoEndTurn() {
    if(this.gameMode!=='combat'||this.phase!=='player'||this.gameOver||!this.living('player').every(u=>u.actionsUsed>=ACTIONS_PER_TURN))return;
    this.message('All hero actions used. Enemy turn…');
    this.schedule(450,()=>this.endPlayerTurn());
  }

  moveUnit(unit:Unit, route:Point[], consumeAction:boolean) {
    const token=this.tokens.get(unit.id);
    if(!token)return;
    if(consumeAction&&unit.team==='player')this.recordPlayerAction(unit.id);
    this.clearAttackPreview();
    const dest=route[route.length-1];
    this.drawRoute(route,unit.team);
    this.tweens.add({
      targets:token,
      x:dest.x*CELL+CELL/2,
      y:dest.y*CELL+CELL/2,
      duration:180*(route.length-1),
      ease:'Sine.easeInOut',
      onComplete:()=>{
        unit.x=dest.x;
        unit.y=dest.y;
        if(consumeAction)this.useAction(unit);
        this.routeGraphics?.clear();
        this.rebuildToken(unit);
        this.refreshHighlights();
        this.syncUI();
        if(consumeAction&&unit.team==='player')this.maybeAutoEndTurn();
      }
    });
  }

  healSelected() {
    if(this.gameMode!=='combat'||this.phase!=='player'||this.gameOver)return;
    const unit=this.selected();
    if(!unit||unit.team!=='player'||!this.hasAction(unit)||unit.hp>=unit.maxHp)return;
    this.closeActionMenu();
    this.clearAttackPreview();
    this.recordPlayerAction(unit.id);
    const amount=Math.min(HEAL_AMOUNT,unit.maxHp-unit.hp);
    unit.hp+=amount;
    this.useAction(unit);
    const token=this.tokens.get(unit.id);
    if(token){
      const text=this.add.text(token.x,token.y-18,`+${amount}`,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'24px',color:'#b8ffd0',stroke:'#145b3a',strokeThickness:5}).setOrigin(.5).setDepth(70);
      this.tweens.add({targets:text,y:token.y-50,alpha:0,duration:560,ease:'Quad.easeOut',onComplete:()=>text.destroy()});
      this.tweens.add({targets:token,scale:1.12,duration:100,yoyo:true,ease:'Quad.easeOut'});
    }
    this.message(`${unit.name} heals ${amount} HP. ${ACTIONS_PER_TURN-unit.actionsUsed} actions left.`);
    this.rebuildToken(unit);
    this.refreshHighlights();
    this.syncUI();
    this.maybeAutoEndTurn();
  }

  defendSelected() {
    if(this.gameMode!=='combat'||this.phase!=='player'||this.gameOver)return;
    const unit=this.selected();
    if(!unit||unit.team!=='player'||!this.hasAction(unit)||unit.defending)return;
    this.closeActionMenu();
    this.clearAttackPreview();
    this.recordPlayerAction(unit.id);
    unit.defending=true;
    this.useAction(unit);
    this.rebuildToken(unit);
    this.refreshHighlights();
    this.syncUI();
    this.message(`${unit.name} is defending. The next incoming attack deals 1 less damage.`);
    this.maybeAutoEndTurn();
  }

  closeActionMenu(){
    ui.actionPanel.hidden=true;
    ui.actionToggle.setAttribute('aria-expanded','false');
    ui.actionToggle.textContent='Actions ▴';
  }

  toggleActionMenu(){
    if(ui.actionToggle.disabled)return;
    const opening=ui.actionPanel.hidden;
    ui.actionPanel.hidden=!opening;
    ui.actionToggle.setAttribute('aria-expanded',String(opening));
    ui.actionToggle.textContent=opening?'Actions ▾':'Actions ▴';
  }

  tweenTo(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>(resolve=>this.tweens.add({...config,onComplete:()=>resolve()}));
  }

  async animateAttack(actor:Unit,target:Unit,damage:number) {
    const a=this.tokens.get(actor.id), t=this.tokens.get(target.id);
    if(!a||!t)return;
    const baseX=a.x,baseY=a.y;
    const dx=t.x-a.x,dy=t.y-a.y;
    const len=Math.hypot(dx,dy)||1;
    const ux=dx/len,uy=dy/len;
    a.setDepth(45);
    await this.tweenTo({targets:a,x:baseX+ux*22,y:baseY+uy*22,duration:85,ease:'Quad.easeOut'});
    const impactX=(a.x+t.x)/2, impactY=(a.y+t.y)/2;
    const slash=this.add.graphics().setDepth(60);
    slash.lineStyle(7,0xfff1a8,1).beginPath().moveTo(impactX-uy*18-ux*8,impactY+ux*18-uy*8).lineTo(impactX+uy*18+ux*8,impactY-ux*18+uy*8).strokePath();
    slash.lineStyle(3,0xffffff,1).beginPath().moveTo(impactX-uy*14-ux*5,impactY+ux*14-uy*5).lineTo(impactX+uy*14+ux*5,impactY-ux*14+uy*5).strokePath();
    this.tweens.add({targets:slash,alpha:0,duration:180,onComplete:()=>slash.destroy()});
    const damageText=this.add.text(t.x,t.y-18,`-${damage}`,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'24px',color:'#fff1a8',stroke:'#7a1724',strokeThickness:5}).setOrigin(.5).setDepth(70);
    this.tweens.add({targets:damageText,y:t.y-48,alpha:0,duration:520,ease:'Quad.easeOut',onComplete:()=>damageText.destroy()});
    this.tweens.add({targets:t,x:t.x+ux*8,y:t.y+uy*8,scale:1.12,alpha:.45,duration:60,yoyo:true,repeat:2,ease:'Quad.easeInOut'});
    this.cameras.main.shake(100,.004);
    await this.tweenTo({targets:a,x:baseX,y:baseY,duration:105,ease:'Quad.easeIn'});
    a.setDepth(0);
  }

  applyDamage(target:Unit,rawDamage:number){
    const reduction=target.defending?1:0;
    const damage=Math.max(0,rawDamage-reduction);
    if(target.defending)target.defending=false;
    target.hp=Math.max(0,target.hp-damage);
    return { damage, reduction };
  }

  async attack(actor:Unit,target:Unit) {
    if(!this.canAttack(actor,target)||target.hp<=0)return;
    if(actor.team==='player')this.recordPlayerAction(actor.id);
    const previewDamage=Math.max(0,actor.damage-(target.defending?1:0));
    await this.animateAttack(actor,target,previewDamage);
    this.useAction(actor);
    const {damage,reduction}=this.applyDamage(target,actor.damage);
    this.selectedId=actor.id;
    this.message(`${actor.name} hits ${target.name} for ${damage}${reduction?' (1 blocked)':''}. ${ACTIONS_PER_TURN-actor.actionsUsed} actions left.`);
    const t=this.tokens.get(target.id);
    if(t){
      if(target.hp<=0){
        this.tweens.add({targets:t,alpha:0,scale:.7,duration:180,onComplete:()=>{t.destroy();this.tokens.delete(target.id);}});
      } else this.rebuildToken(target);
    }
    this.rebuildToken(actor);
    this.routeGraphics?.clear();
    this.checkGameOver();
    this.refreshHighlights();
    this.syncUI();
    if(actor.team==='player'&&!this.gameOver)this.maybeAutoEndTurn();
  }

  rebuildToken(unit:Unit){
    const old=this.tokens.get(unit.id);
    old?.destroy();
    if(unit.hp>0)this.createToken(unit);
  }

  endPlayerTurn() {
    if(this.gameOver||this.gameMode!=='combat'||this.phase!=='player')return;
    this.closeActionMenu();
    this.clearAttackPreview();
    this.phase='enemy';
    this.living('enemy').forEach(u=>u.actionsUsed=0);
    this.buildBoard();
    this.syncUI();
    this.message('Enemy phase.');
    this.enemyTurn();
  }

  enemyTurn() {
    const enemies=this.living('enemy');
    let delay=250;
    enemies.forEach(enemy=>{
      for(let action=0;action<ACTIONS_PER_TURN;action++){
        this.schedule(delay,()=>this.telegraphEnemy(enemy));
        delay+=220;
        this.schedule(delay,()=>this.enemyAct(enemy));
        delay+=620;
      }
    });
    this.schedule(delay,()=>{
      if(this.gameOver)return;
      this.phase='player';
      this.turn++;
      this.living('player').forEach(u=>u.actionsUsed=0);
      const first=this.living('player')[0];
      if(first)this.selectedId=first.id;
      this.buildBoard();
      this.syncUI();
      this.refreshHighlights();
      this.message('Your turn. Each hero has 3 actions.');
    });
  }

  telegraphEnemy(enemy:Unit) {
    if(enemy.hp<=0||this.gameOver||!this.hasAction(enemy))return;
    this.selectedId=enemy.id;
    this.refreshHighlights();
    this.syncUI();
    this.message(`${enemy.name}: ${ACTIONS_PER_TURN-enemy.actionsUsed} actions left.`);
  }

  enemyAct(enemy:Unit) {
    if(enemy.hp<=0||this.gameOver||!this.hasAction(enemy))return;
    const heroes=this.living('player');
    if(!heroes.length)return;
    heroes.sort((a,b)=>this.distance(enemy,a)-this.distance(enemy,b));
    const target=heroes[0];

    if(this.canAttack(enemy,target)) {
      void this.enemyAttack(enemy,target);
      return;
    }

    const options=this.reachableTiles(enemy,MOVE)
      .filter(p=>!(p.x===enemy.x&&p.y===enemy.y))
      .map(p=>({p,route:this.findRoute(enemy,p,enemy.id)}))
      .filter(o=>o.route.length>1)
      .sort((a,b)=>this.distance(a.p,target)-this.distance(b.p,target)||a.route.length-b.route.length);
    const best=options[0];
    if(best){this.moveUnit(enemy,best.route,true);return;}
    this.useAction(enemy);
    this.rebuildToken(enemy);
    this.syncUI();
  }

  async enemyAttack(enemy:Unit,target:Unit) {
    if(!this.canAttack(enemy,target))return;
    const previewDamage=Math.max(0,enemy.damage-(target.defending?1:0));
    await this.animateAttack(enemy,target,previewDamage);
    this.useAction(enemy);
    const {damage,reduction}=this.applyDamage(target,enemy.damage);
    this.message(`${enemy.name} hits ${target.name} for ${damage}${reduction?' (1 blocked)':''}. ${ACTIONS_PER_TURN-enemy.actionsUsed} actions left.`);
    const t=this.tokens.get(target.id);
    if(t){
      if(target.hp<=0){
        this.tweens.add({targets:t,alpha:0,scale:.7,duration:180,onComplete:()=>{t.destroy();this.tokens.delete(target.id);}});
      } else this.rebuildToken(target);
    }
    this.rebuildToken(enemy);
    this.checkGameOver();
    this.refreshHighlights();
    this.syncUI();
  }

  moveParty(dest:Point) {
    const route=this.findRoute(this.party,dest,'party',true);
    if(route.length<2)return;
    const token=this.tokens.get('party')!;
    const end=route[route.length-1];
    this.drawRoute(route,'player');
    this.tweens.add({targets:token,x:end.x*CELL+CELL/2,y:end.y*CELL+CELL/2,duration:Math.min(1300,80*(route.length-1)),onComplete:()=>{
      this.party.x=end.x;
      this.party.y=end.y;
      this.routeGraphics?.clear();
      this.centerOn(this.party);
      const enemy=this.living('enemy').find(e=>this.distance(this.party,e)<=ENCOUNTER_DISTANCE);
      if(enemy){this.message(`Enemy spotted: ${enemy.name}. Combat begins.`);this.schedule(350,()=>this.reset('tactical'));}
    }});
  }

  findRoute(start:Point,dest:Point,movingId:string,explore=false):Point[] {
    if(dest.x<0||dest.y<0||dest.x>=this.cols||dest.y>=this.rows||this.isObstacle(dest.x,dest.y))return[];
    const key=(p:Point)=>`${p.x},${p.y}`;
    const q:Point[]=[{x:start.x,y:start.y}];
    const prev=new Map<string,Point|null>([[key(start),null]]);
    while(q.length){
      const cur=q.shift()!;
      if(key(cur)===key(dest))break;
      for(const n of this.neighbors(cur)){
        const occ=this.at(n.x,n.y);
        const blocked=explore?occ?.team==='enemy':!!occ&&occ.id!==movingId;
        if(prev.has(key(n))||this.isObstacle(n.x,n.y)||blocked)continue;
        prev.set(key(n),cur);
        q.push(n);
      }
    }
    if(!prev.has(key(dest)))return[];
    const route:Point[]=[];
    let cur:Point|null={...dest};
    while(cur){route.unshift(cur);cur=prev.get(key(cur))??null;}
    return route;
  }

  reachableTiles(unit:Unit,maxMove:number) {
    const out:Point[]=[];
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      if(this.at(x,y)&&!(unit.x===x&&unit.y===y))continue;
      const route=this.findRoute(unit,{x,y},unit.id);
      if(route.length&&route.length-1<=maxMove)out.push({x,y});
    }
    return out;
  }

  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  unit(id:string){return this.units.find(u=>u.id===id&&u.hp>0);}
  selected(){return this.unit(this.selectedId);}
  living(team:Team){return this.units.filter(u=>u.team===team&&u.hp>0);}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  neighbors(p:Point){return[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>n.x>=0&&n.y>=0&&n.x<this.cols&&n.y<this.rows);}

  drawRoute(route:Point[],team:Team) {
    this.routeGraphics?.destroy();
    if(route.length<1)return;
    const g=this.add.graphics().setDepth(30);
    const outer=team==='enemy'?0x7a1724:0x075f88;
    const inner=team==='enemy'?0xf05663:0x62dcff;
    const shine=team==='enemy'?0xffa0a8:0xc6f7ff;
    const pts=route.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}));
    if(pts.length===1){
      g.fillStyle(outer,.95).fillCircle(pts[0].x,pts[0].y,11);
      g.fillStyle(inner,1).fillCircle(pts[0].x,pts[0].y,6.5);
      this.routeGraphics=g;
      return;
    }
    const prev=pts[pts.length-2],end=pts[pts.length-1];
    const angle=Math.atan2(end.y-prev.y,end.x-prev.x);
    const ux=Math.cos(angle),uy=Math.sin(angle),px=-uy,py=ux;
    const shaftEnd={x:end.x-ux*14,y:end.y-uy*14};
    const shaftPts=[...pts.slice(0,-1),shaftEnd];
    const stroke=(width:number,color:number,alpha=1)=>{
      g.lineStyle(width,color,alpha);
      g.beginPath();
      shaftPts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
      g.strokePath();
      shaftPts.slice(0,-1).forEach(p=>g.fillStyle(color,alpha).fillCircle(p.x,p.y,width/2));
    };
    stroke(24,outer,.96);
    stroke(14,inner,1);
    stroke(4,shine,.72);
    const base={x:end.x-ux*16,y:end.y-uy*16};
    const tip={x:end.x+ux*24,y:end.y+uy*24};
    const left={x:base.x+px*22,y:base.y+py*22};
    const right={x:base.x-px*22,y:base.y-py*22};
    g.fillStyle(outer,1).fillTriangle(tip.x,tip.y,left.x,left.y,right.x,right.y);
    const ibase={x:end.x-ux*13,y:end.y-uy*13};
    const itip={x:end.x+ux*17,y:end.y+uy*17};
    const ileft={x:ibase.x+px*13,y:ibase.y+py*13};
    const iright={x:ibase.x-px*13,y:ibase.y-py*13};
    g.fillStyle(inner,1).fillTriangle(itip.x,itip.y,ileft.x,ileft.y,iright.x,iright.y);
    g.lineStyle(3,shine,.72).beginPath().moveTo(ibase.x+px*4,ibase.y+py*4).lineTo(itip.x-ux*3,itip.y-uy*3).strokePath();
    this.routeGraphics=g;
  }

  refreshHighlights() {
    this.cells.forEach((cell,key)=>{
      const [x,y]=key.split(',').map(Number);
      cell.setStrokeStyle(1,0x8198b5,.25);
      cell.setFillStyle((x+y)%3===0?0x536f5b:0x496957,.95);
    });
    if(this.gameMode!=='combat')return;
    const actor=this.selected();
    if(!actor)return;

    if(actor.team==='enemy'){
      this.reachableTiles(actor,MOVE).forEach(p=>this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0xb73847,.48).setStrokeStyle(2,0xf47778,.7));
      const danger=new Set<string>();
      this.reachableTiles(actor,MOVE).forEach(p=>this.neighbors(p).forEach(n=>danger.add(`${n.x},${n.y}`)));
      danger.forEach(k=>this.cells.get(k)?.setFillStyle(0xc66b45,.40));
      this.cells.get(`${actor.x},${actor.y}`)?.setStrokeStyle(5,0xffd5a6,1);
      return;
    }

    if(this.phase!=='player'||!this.hasAction(actor))return;
    this.reachableTiles(actor,MOVE).forEach(p=>{
      if(!(p.x===actor.x&&p.y===actor.y))this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0x238dc1,.52).setStrokeStyle(3,0x71e4ff,.9);
    });
    this.living('enemy').forEach(e=>{
      if(this.canAttack(actor,e))this.cells.get(`${e.x},${e.y}`)?.setFillStyle(0xb34842,.72).setStrokeStyle(4,0xff9a78,1);
    });
    if(this.pendingAttack){
      const t=this.unit(this.pendingAttack.targetId);
      if(t)this.cells.get(`${t.x},${t.y}`)?.setFillStyle(0xd14b3f,.92).setStrokeStyle(5,0xffd18a,1);
    }
  }

  fitTactical(){
    const cam=this.cameras.main;
    const zoom=Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL));
    cam.setZoom(zoom);
    cam.centerOn(this.cols*CELL/2,this.rows*CELL/2);
  }
  setZoom(z:number){this.cameras.main.setZoom(Phaser.Math.Clamp(z,.35,2.4));}
  centerOn(p:Point){this.cameras.main.pan(p.x*CELL+CELL/2,p.y*CELL+CELL/2,220,'Sine.easeOut');}
  onPointerDown(pointer:Phaser.Input.Pointer){if(this.gameMode!=='explore'||this.draggingId)return;this.panOrigin={x:pointer.x,y:pointer.y,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY};}
  onPointerMove(pointer:Phaser.Input.Pointer){
    if(this.gameMode!=='explore'||this.draggingId)return;
    const p1=this.input.pointer1,p2=this.input.pointer2;
    if(p1.isDown&&p2.isDown){
      const d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y);
      if(this.pinchDistance)this.setZoom(this.cameras.main.zoom*(d/this.pinchDistance));
      this.pinchDistance=d;
      return;
    }
    if(pointer.isDown&&this.panOrigin){
      const cam=this.cameras.main;
      cam.scrollX=this.panOrigin.scrollX-(pointer.x-this.panOrigin.x)/cam.zoom;
      cam.scrollY=this.panOrigin.scrollY-(pointer.y-this.panOrigin.y)/cam.zoom;
    }
  }

  schedule(delay:number,cb:()=>void){
    const e=this.time.delayedCall(delay,()=>{
      this.scheduledEvents=this.scheduledEvents.filter(x=>x!==e);
      cb();
    });
    this.scheduledEvents.push(e);
    return e;
  }
  cancelScheduledEvents(){this.scheduledEvents.forEach(e=>e.remove(false));this.scheduledEvents=[];}
  checkGameOver(){
    const heroes=this.living('player'),enemies=this.living('enemy');
    if(heroes.length&&enemies.length)return;
    this.gameOver=true;
    this.cancelScheduledEvents();
    this.clearAttackPreview();
    ui.resultOverlay.hidden=false;
    ui.resultTitle.textContent=heroes.length?'Victory':'Defeat';
    ui.resultCopy.textContent=heroes.length?'The pass is secure.':'The party has fallen.';
    this.syncUI();
  }
  message(text:string){ui.instruction.textContent=text;}

  syncUI(){
    ui.turnNumber.textContent=String(this.turn);
    ui.turnPill.textContent=this.gameMode==='explore'?'Explore':this.phase==='player'?'Player':'Enemy';
    ui.turnPill.classList.toggle('enemy',this.phase==='enemy');
    ui.undo.hidden=this.gameMode==='explore';
    ui.undo.textContent='Undo';
    ui.undo.disabled=this.actionHistory.length===0;

    const selected=this.selected();
    const validHero=!!selected&&selected.team==='player'&&this.phase==='player'&&this.hasAction(selected)&&!this.gameOver;
    ui.actionToggle.hidden=this.gameMode==='explore';
    ui.actionToggle.disabled=!validHero;
    ui.heal.disabled=!validHero||selected!.hp>=selected!.maxHp;
    ui.defend.disabled=!validHero||selected!.defending;
    if(!validHero)this.closeActionMenu();

    ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical'));
    ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));

    const s=selected??this.living('player')[0]??this.living('enemy')[0];
    if(s){
      ui.selectedName.textContent=s.name;
      ui.selectedTeam.textContent=`${s.team==='player'?'Hero':'Enemy'} · ${ACTIONS_PER_TURN-s.actionsUsed}/${ACTIONS_PER_TURN} actions${s.defending?' · defending':''}`;
      ui.health.textContent=`${s.hp} / ${s.maxHp}`;
      ui.attack.textContent=String(s.damage);
      ui.movement.textContent=String(MOVE);
      ui.portrait.textContent=s.mark;
    }

    ui.roster.innerHTML='';
    for(const u of this.living('player')){
      const b=document.createElement('button');
      b.type='button';
      b.className=`roster-token${u.id===this.selectedId?' selected':''}${u.actionsUsed>=ACTIONS_PER_TURN?' acted':''}`;
      b.innerHTML=`<span aria-hidden="true">${u.mark}${u.defending?' 🛡':''}</span><small style="display:block;font:700 9px/1 system-ui;margin-top:1px">${'●'.repeat(ACTIONS_PER_TURN-u.actionsUsed)}${'○'.repeat(u.actionsUsed)}</small>`;
      b.setAttribute('aria-label',`${u.name}, ${u.hp} of ${u.maxHp} health, ${ACTIONS_PER_TURN-u.actionsUsed} actions remaining${u.defending?', defending':''}`);
      b.addEventListener('click',()=>{
        if(this.phase!=='player')return;
        this.closeActionMenu();
        this.clearAttackPreview();
        this.selectedId=u.id;
        this.refreshHighlights();
        this.syncUI();
        this.centerOn(u);
      });
      ui.roster.appendChild(b);
    }
  }
}

new Phaser.Game({
  type:Phaser.AUTO,
  parent:'battlefield',
  backgroundColor:'#243d44',
  scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},
  render:{antialias:true,pixelArt:false},
  scene:TacticsScene
});

ui.forecast.addEventListener('click',()=>scene.confirmAttack());
ui.forecast.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();scene.confirmAttack();}});
ui.undo.addEventListener('click',()=>scene.undoLastAction());
ui.actionToggle.addEventListener('click',()=>scene.toggleActionMenu());
ui.heal.addEventListener('click',()=>scene.healSelected());
ui.defend.addEventListener('click',()=>scene.defendSelected());
ui.restart.addEventListener('click',()=>{scene.reset();ui.settings.open=false;});
ui.restartOverlay.addEventListener('click',()=>scene.reset());
ui.tactical.addEventListener('click',()=>{scene.reset('tactical');ui.settings.open=false;});
ui.exploration.addEventListener('click',()=>{scene.reset('exploration');ui.settings.open=false;});
ui.drawerToggle.addEventListener('click',()=>{
  const open=ui.drawer.classList.toggle('open');
  ui.drawerToggle.setAttribute('aria-expanded',String(open));
});