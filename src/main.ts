import Phaser from 'phaser';
import './phaser.css';

type Team = 'player' | 'enemy';
type PrototypeMode = 'tactical' | 'exploration';
type GameMode = 'combat' | 'explore';
type Point = { x:number; y:number };
type Unit = Point & { id:string; name:string; mark:string; team:Team; hp:number; maxHp:number; damage:number; initiativeMod:number; initiativeScore:number; actionsUsed:number; defending:boolean; };
type PrototypeUnit = Omit<Unit,'initiativeScore'|'actionsUsed'|'defending'>;
type Prototype = { cols:number; rows:number; obstacles:Point[]; units:PrototypeUnit[] };
type PendingAttack = { actorId:string; targetId:string };
type Snapshot = { units:Unit[]; selectedId:string; round:number; activeIndex:number };
type LogEntry = { round:number; text:string };

const CELL=80, MOVE=2, ACTIONS_PER_TURN=3, HEAL_AMOUNT=2, ENCOUNTER_DISTANCE=4;
const STARTING_PARTY={id:'party',x:15,y:24};
const PROTOTYPES:Record<PrototypeMode,Prototype>={
  tactical:{cols:6,rows:8,obstacles:[{x:2,y:4}],units:[
    {id:'alden',name:'Alden',mark:'A',team:'player',x:1,y:6,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',mark:'M',team:'player',x:4,y:6,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'North Raider',mark:'R',team:'enemy',x:1,y:1,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Hill Raider',mark:'R',team:'enemy',x:4,y:2,hp:3,maxHp:3,damage:1,initiativeMod:0}
  ]},
  exploration:{cols:30,rows:30,obstacles:[{x:15,y:18}],units:[
    {id:'alden',name:'Alden',mark:'A',team:'player',x:14,y:20,hp:5,maxHp:5,damage:2,initiativeMod:2},
    {id:'mira',name:'Mira',mark:'M',team:'player',x:16,y:21,hp:4,maxHp:4,damage:2,initiativeMod:4},
    {id:'raider-1',name:'North Raider',mark:'R',team:'enemy',x:14,y:15,hp:3,maxHp:3,damage:1,initiativeMod:1},
    {id:'raider-2',name:'Hill Raider',mark:'R',team:'enemy',x:17,y:17,hp:3,maxHp:3,damage:1,initiativeMod:0}
  ]}
};

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const ui={
  instruction:$('#instruction'), initiativeRail:$('#initiative-rail'),
  undo:$('#undo-action') as HTMLButtonElement, actionToggle:$('#ability-menu-toggle') as HTMLButtonElement,
  actionPanel:$('#ability-menu-panel'), heal:$('#heal-action') as HTMLButtonElement, defend:$('#defend-action') as HTMLButtonElement,
  statsToggle:$('#stats-toggle') as HTMLButtonElement, logToggle:$('#log-toggle') as HTMLButtonElement,
  logPanel:$('#combat-log-panel'), logList:$('#combat-log-list'), logClose:$('#log-close') as HTMLButtonElement,
  restart:$('#restart') as HTMLButtonElement, restartOverlay:$('#restart-overlay') as HTMLButtonElement,
  tactical:$('#tactical-mode') as HTMLButtonElement, exploration:$('#exploration-mode') as HTMLButtonElement,
  settings:$('#settings-menu') as HTMLDetailsElement, drawer:$('#unit-drawer'),
  selectedName:$('#selected-name'),selectedTeam:$('#selected-team'),health:$('#health-text'),attack:$('#attack-stat'),movement:$('#movement-stat'),initiative:$('#initiative-stat'),actions:$('#actions-stat'),portrait:$('#portrait'),
  resultOverlay:$('#result-overlay'),resultTitle:$('#result-title'),resultCopy:$('#result-copy'),
  forecast:$('#combat-forecast'),matchup:$('#forecast-matchup'),forecastResult:$('#forecast-result')
};

let scene:TacticsScene;

class TacticsScene extends Phaser.Scene {
  mode:PrototypeMode='tactical'; gameMode:GameMode='combat';
  cols=6; rows=8; obstacles:Point[]=[]; units:Unit[]=[]; party={...STARTING_PARTY};
  selectedId='alden'; round=1; turnOrder:string[]=[]; activeIndex=0; gameOver=false;
  cells=new Map<string,Phaser.GameObjects.Rectangle>(); tokens=new Map<string,Phaser.GameObjects.Container>();
  routeGraphics?:Phaser.GameObjects.Graphics; destinationGraphics?:Phaser.GameObjects.Graphics;
  pendingAttack?:PendingAttack; draggingId?:string; dragRoute:Point[]=[]; dragAttackTargetId?:string;
  actionHistory:Snapshot[]=[]; scheduledEvents:Phaser.Time.TimerEvent[]=[]; combatLog:LogEntry[]=[];
  baseZoom=1; gestureDistance=0; gestureMid?:Point; gestureActive=false; suppressInputUntil=0;

  constructor(){super('tactics');}
  create(){
    scene=this; this.input.addPointer(2);
    this.input.on('pointerdown',()=>{
      if(this.twoFingersDown()){
        this.gestureActive=true;
        this.suppressInputUntil=performance.now()+320;
        this.cancelPieceDragForGesture();
      }
    });
    this.input.on('pointermove',()=>this.handleTwoFingerGesture());
    this.input.on('pointerup',()=>{
      if(this.gestureActive){
        this.suppressInputUntil=performance.now()+320;
        this.cancelPieceDragForGesture();
      }
      if(!this.input.pointer1.isDown&&!this.input.pointer2.isDown){
        this.gestureDistance=0;this.gestureMid=undefined;this.gestureActive=false;
      }
    });
    this.input.on('wheel',(_p:Phaser.Input.Pointer,_go:unknown[],_dx:number,dy:number)=>this.setCameraZoom(this.cameras.main.zoom*(dy>0?.9:1.1)));
    this.scale.on('resize',()=>this.time.delayedCall(80,()=>this.handleResize()));
    this.reset('tactical');
  }

  reset(mode=this.mode){
    this.cancelScheduledEvents(); this.tweens.killAll(); this.mode=mode;
    const p=PROTOTYPES[mode]; this.gameMode=mode==='exploration'?'explore':'combat'; this.cols=p.cols; this.rows=p.rows;
    this.obstacles=p.obstacles.map(o=>({...o})); this.units=p.units.map(u=>({...u,initiativeScore:0,actionsUsed:0,defending:false}));
    this.party={...STARTING_PARTY}; this.selectedId='alden'; this.round=1; this.activeIndex=0; this.gameOver=false; this.turnOrder=[]; this.actionHistory=[]; this.combatLog=[];
    this.pendingAttack=undefined; this.draggingId=undefined; this.dragRoute=[]; this.dragAttackTargetId=undefined; this.gestureActive=false; this.suppressInputUntil=0; this.closeActionMenu(); this.hideForecast(); this.closeLog();
    this.buildBoard(); this.setLooseCameraBounds();
    if(this.gameMode==='combat'){this.fitTactical();this.rollInitiativeOnce();this.log('Round 1 begins.');this.beginActiveTurn();}
    else {this.baseZoom=.85;this.cameras.main.setZoom(.85);this.centerOn(this.party);this.syncUI();}
    ui.resultOverlay.hidden=true;
  }

  rollInitiativeOnce(){
    const rolls:string[]=[];
    for(const u of this.living()){const die=Phaser.Math.Between(1,20);u.initiativeScore=die+u.initiativeMod;rolls.push(`${u.name}: ${die}${u.initiativeMod>=0?'+':''}${u.initiativeMod} = ${u.initiativeScore}`);}
    this.turnOrder=[...this.living()].sort((a,b)=>b.initiativeScore-a.initiativeScore||b.initiativeMod-a.initiativeMod).map(u=>u.id); this.activeIndex=0;
    this.log(`Initiative — ${rolls.join(' · ')}`);
  }

  activeUnit(){return this.unit(this.turnOrder[this.activeIndex]);}
  isActivePlayer(u:Unit){return this.gameMode==='combat'&&this.activeUnit()?.id===u.id&&u.team==='player'&&!this.gameOver;}
  hasAction(u:Unit){return u.actionsUsed<ACTIONS_PER_TURN;}
  useAction(u:Unit){u.actionsUsed=Math.min(ACTIONS_PER_TURN,u.actionsUsed+1);}
  inputSuppressed(){return this.gestureActive||this.twoFingersDown()||performance.now()<this.suppressInputUntil;}

  beginActiveTurn(){
    if(this.gameOver||this.gameMode!=='combat')return;
    while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;
    if(this.activeIndex>=this.turnOrder.length){this.round++;this.activeIndex=0;this.living().forEach(u=>u.actionsUsed=0);this.log(`Round ${this.round} begins.`);while(this.activeIndex<this.turnOrder.length&&!this.unit(this.turnOrder[this.activeIndex]))this.activeIndex++;}
    const active=this.activeUnit(); if(!active)return;
    active.actionsUsed=0; this.selectedId=active.id; this.pendingAttack=undefined; this.hideForecast(); this.closeActionMenu(); this.actionHistory=[];
    this.buildBoard(); this.syncUI(); this.centerOn(active); this.message(`${active.name}'s turn.`);
    if(active.team==='enemy')this.schedule(420,()=>void this.runEnemyAction());
  }

  finishActiveTurn(){if(this.gameOver)return;this.cancelScheduledEvents();this.pendingAttack=undefined;this.hideForecast();this.closeActionMenu();this.activeIndex++;this.actionHistory=[];this.schedule(220,()=>this.beginActiveTurn());}
  maybeFinishTurn(u:Unit){if(u.actionsUsed>=ACTIONS_PER_TURN)this.schedule(350,()=>this.finishActiveTurn());}

  recordAction(){const active=this.activeUnit();if(!active||active.team!=='player')return;this.actionHistory.push({units:this.units.map(u=>({...u})),selectedId:this.selectedId,round:this.round,activeIndex:this.activeIndex});this.syncUI();}
  undoLastAction(){
    const active=this.activeUnit(); if(!active||active.team!=='player'||!this.actionHistory.length)return;
    this.cancelScheduledEvents();this.tweens.killAll();const s=this.actionHistory.pop()!;this.units=s.units.map(u=>({...u}));this.selectedId=s.selectedId;this.round=s.round;this.activeIndex=s.activeIndex;this.pendingAttack=undefined;this.hideForecast();this.closeActionMenu();this.gameOver=false;ui.resultOverlay.hidden=true;this.buildBoard();this.syncUI();this.message('Undid one action.');
  }

  buildBoard(){
    this.children.removeAll(true);this.cells.clear();this.tokens.clear();this.routeGraphics=undefined;this.destinationGraphics=undefined;
    this.add.rectangle(this.cols*CELL/2,this.rows*CELL/2,this.cols*CELL,this.rows*CELL,0x6a713d,1).setDepth(-20);
    const texture=this.add.graphics().setDepth(-18);
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const base=(x+y)%3===0?0x747744:0x68703d;
      const c=this.add.rectangle(x*CELL+CELL/2,y*CELL+CELL/2,CELL-2,CELL-2,base,1).setStrokeStyle(1,0x242719,.72).setInteractive({useHandCursor:true});
      c.on('pointerup',()=>this.handleCell(x,y));this.cells.set(`${x},${y}`,c);
      for(let i=0;i<8;i++){
        const seed=(x*97+y*53+i*31)%997;
        const px=x*CELL+8+(seed%64),py=y*CELL+8+((seed*7)%64);
        texture.fillStyle(i%3===0?0x9a8a52:0x4d5b32,.18).fillCircle(px,py,1+(seed%3));
      }
    }
    for(const o of this.obstacles){
      this.add.circle(o.x*CELL+CELL/2,o.y*CELL+CELL/2,24,0x34302c,1).setStrokeStyle(4,0x82745f);
      this.add.circle(o.x*CELL+CELL/2,o.y*CELL+CELL/2,15,0x151514,1).setStrokeStyle(3,0x4f473e);
      this.add.text(o.x*CELL+CELL/2,o.y*CELL+CELL/2,'✦',{color:'#d88f36',fontSize:'20px'}).setOrigin(.5);
    }
    if(this.gameMode==='explore')this.createPartyToken();else this.living().forEach(u=>this.createToken(u)); this.refreshHighlights();
  }

  tokenGlyph(u:Unit){if(u.id==='alden')return '♞';if(u.id==='mira')return '✦';return '♜';}
  createToken(u:Unit){
    const c=this.add.container(u.x*CELL+CELL/2,u.y*CELL+CELL/2),active=this.activeUnit()?.id===u.id;
    const outer=this.add.circle(0,0,CELL*.33,u.team==='player'?0x173b5d:0x63202a).setStrokeStyle(active?6:4,active?0x69d6ff:(u.team==='player'?0xa9dfff:0xff8378),1);
    const inner=this.add.circle(0,0,CELL*.27,u.team==='player'?0x293d51:0x43302d,1).setStrokeStyle(2,0xd8c7a5,.55);
    const portrait=this.add.text(0,-6,this.tokenGlyph(u),{fontFamily:'Georgia',fontStyle:'bold',fontSize:u.team==='player'?'31px':'29px',color:u.team==='player'?'#f0e1c3':'#d7d19a'}).setOrigin(.5);
    const hpBack=this.add.rectangle(0,24,42,7,0x0b0e11,1).setStrokeStyle(1,0xf1f4f7,.8);
    const hpWidth=38*(u.hp/u.maxHp);const hp=this.add.rectangle(-19+hpWidth/2,24,hpWidth,4,u.team==='player'?0x61d45f:0xe24747,1);
    c.add([outer,inner,portrait,hpBack,hp]);
    if(u.defending)c.add([this.add.circle(22,-22,11,0x203c68,.98).setStrokeStyle(2,0xd9efff,1),this.add.text(22,-23,'◆',{fontSize:'12px',color:'#d9efff'}).setOrigin(.5)]);
    if(active)for(let i=0;i<ACTIONS_PER_TURN;i++){const available=i>=u.actionsUsed;c.add(this.add.circle((i-1)*12,34,4,available?(u.team==='player'?0x8ce9ff:0xff9b9b):0x263746,available?1:.6).setStrokeStyle(1,0xffffff,available?.9:.18));}
    c.setSize(CELL*.76,CELL*.76).setInteractive({useHandCursor:true});c.setData('dragged',false);
    if(u.team==='player'){this.input.setDraggable(c);c.on('dragstart',()=>this.beginUnitDrag(u,c));c.on('drag',(p:Phaser.Input.Pointer)=>this.updateUnitDrag(u,c,p));c.on('dragend',()=>this.finishUnitDrag(u,c));}
    c.on('pointerup',(_p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(this.inputSuppressed()){c.setData('dragged',false);return;}if(c.getData('dragged')){c.setData('dragged',false);return;}this.handleUnit(u.id);});this.tokens.set(u.id,c);
  }
  createPartyToken(){const c=this.add.container(this.party.x*CELL+CELL/2,this.party.y*CELL+CELL/2);c.add([this.add.circle(0,0,CELL*.34,0x563eaf).setStrokeStyle(4,0xffe6a3),this.add.text(0,0,'✦',{fontSize:'31px',color:'#fff'}).setOrigin(.5)]).setSize(CELL*.8,CELL*.8).setInteractive({useHandCursor:true});this.input.setDraggable(c);c.on('dragstart',()=>{if(this.inputSuppressed())return;this.draggingId='party';c.setData('dragged',true)});c.on('drag',(p:Phaser.Input.Pointer)=>this.updatePartyDrag(c,p));c.on('dragend',()=>this.finishPartyDrag(c));this.tokens.set('party',c);}

  cancelPieceDragForGesture(){
    if(!this.draggingId)return;
    if(this.draggingId==='party'){
      const t=this.tokens.get('party');if(t){t.x=this.party.x*CELL+CELL/2;t.y=this.party.y*CELL+CELL/2;t.setData('dragged',false);}
    } else {
      const u=this.unit(this.draggingId),t=this.tokens.get(this.draggingId);if(u&&t){t.x=u.x*CELL+CELL/2;t.y=u.y*CELL+CELL/2;t.setDepth(0).setAlpha(1).setData('dragged',false);}
    }
    this.draggingId=undefined;this.dragRoute=[];this.dragAttackTargetId=undefined;this.clearDragDestination();
  }
  beginUnitDrag(u:Unit,t:Phaser.GameObjects.Container){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.inputSuppressed())return;this.clearAttackPreview();this.selectedId=u.id;this.draggingId=u.id;this.dragRoute=[];this.dragAttackTargetId=undefined;t.setData('dragged',true).setDepth(40).setAlpha(.88);this.refreshHighlights();this.syncUI();}
  updateUnitDrag(u:Unit,t:Phaser.GameObjects.Container,p:Phaser.Input.Pointer){if(this.draggingId!==u.id||this.inputSuppressed())return;const w=this.cameras.main.getWorldPoint(p.x,p.y),d={x:Math.floor(w.x/CELL),y:Math.floor(w.y/CELL)},occ=this.at(d.x,d.y);this.dragAttackTargetId=undefined;if(occ?.team==='enemy'&&this.canAttack(u,occ)){this.dragAttackTargetId=occ.id;t.x=w.x;t.y=w.y;this.showDragAttackTarget(occ);return;}const r=this.findRoute(u,d,u.id),legal=r.length>1&&r.length-1<=MOVE&&!occ;this.dragRoute=legal?r:[];t.x=w.x;t.y=w.y;this.showDragDestination(legal?d:undefined,legal?r:undefined);}
  finishUnitDrag(u:Unit,t:Phaser.GameObjects.Container){if(this.draggingId!==u.id)return;const suppressed=this.inputSuppressed();this.draggingId=undefined;t.setDepth(0).setAlpha(1);const r=this.dragRoute,targetId=this.dragAttackTargetId;this.dragRoute=[];this.dragAttackTargetId=undefined;this.clearDragDestination();t.x=u.x*CELL+CELL/2;t.y=u.y*CELL+CELL/2;if(suppressed){t.setData('dragged',false);return;}if(targetId){const target=this.unit(targetId);if(target)this.previewAttack(u,target);return;}if(r.length>1)void this.moveActive(u,r);}

  handleUnit(id:string){if(this.gameOver||this.gameMode!=='combat'||this.inputSuppressed())return;const target=this.unit(id);if(!target)return;if(this.pendingAttack&&id===this.pendingAttack.targetId){this.confirmAttack();return;}const active=this.activeUnit();if(active?.team==='player'&&target.team==='enemy'&&this.canAttack(active,target)){this.previewAttack(active,target);return;}this.clearAttackPreview();this.selectedId=id;this.refreshHighlights();this.syncUI();this.message(`${target.name} selected.`);}
  handleCell(x:number,y:number){if(this.gameOver||this.draggingId||this.inputSuppressed())return;if(this.gameMode==='explore'){this.moveParty({x,y});return;}const active=this.activeUnit();if(!active||active.team!=='player'||!this.hasAction(active))return;if(this.pendingAttack){const t=this.unit(this.pendingAttack.targetId);if(t&&t.x===x&&t.y===y){this.confirmAttack();return;}}const occ=this.at(x,y);if(occ?.team==='enemy'&&this.canAttack(active,occ)){this.previewAttack(active,occ);return;}if(occ)return;this.clearAttackPreview();const r=this.findRoute(active,{x,y},active.id);if(r.length>1&&r.length-1<=MOVE)void this.moveActive(active,r);}

  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}
  previewAttack(a:Unit,t:Unit){if(!this.canAttack(a,t))return;this.pendingAttack={actorId:a.id,targetId:t.id};this.selectedId=t.id;this.refreshHighlights();this.syncUI();const dmg=Math.max(0,a.damage-(t.defending?1:0));ui.matchup.textContent=`${a.name} → ${t.name}`;ui.forecastResult.textContent=`${dmg} damage · tap here or target to attack`;ui.forecast.hidden=false;ui.forecast.tabIndex=0;ui.forecast.classList.add('clickable');}
  confirmAttack(){if(this.inputSuppressed())return;const p=this.pendingAttack;if(!p)return;const a=this.unit(p.actorId),t=this.unit(p.targetId);if(!a||!t)return;this.pendingAttack=undefined;this.hideForecast();void this.attack(a,t);}
  clearAttackPreview(){this.pendingAttack=undefined;this.hideForecast();this.routeGraphics?.clear();}
  hideForecast(){ui.forecast.hidden=true;ui.forecast.tabIndex=-1;ui.forecast.classList.remove('clickable');}

  async moveActive(u:Unit,r:Point[]){if(!this.isActivePlayer(u)||!this.hasAction(u))return;this.recordAction();this.clearAttackPreview();const token=this.tokens.get(u.id);if(!token)return;const d=r[r.length-1];this.drawRoute(r,u.team);await this.tweenTo({targets:token,x:d.x*CELL+CELL/2,y:d.y*CELL+CELL/2,duration:170*(r.length-1),ease:'Sine.easeInOut'});u.x=d.x;u.y=d.y;this.useAction(u);this.routeGraphics?.clear();this.rebuildToken(u);this.refreshHighlights();this.syncUI();this.maybeFinishTurn(u);}
  async attack(a:Unit,t:Unit){if(!this.canAttack(a,t))return;if(a.team==='player')this.recordAction();await this.animateAttack(a,t);this.useAction(a);let damage=a.damage;if(t.defending){damage=Math.max(0,damage-1);t.defending=false;}t.hp=Math.max(0,t.hp-damage);this.floatText(t,damage===0?'BLOCK':`-${damage}`,damage===0?'#d9efff':'#fff1a8');this.log(`${a.name} attacks ${t.name}: ${damage} damage${t.hp<=0?' — defeated':''}.`);this.selectedId=a.id;if(t.hp<=0){this.tokens.get(t.id)?.destroy();this.tokens.delete(t.id);}else this.rebuildToken(t);this.rebuildToken(a);this.checkGameOver();this.refreshHighlights();this.syncUI();if(!this.gameOver&&a.team==='player')this.maybeFinishTurn(a);}
  healSelected(){const u=this.activeUnit();if(!u||u.team!=='player'||!this.hasAction(u)||u.hp>=u.maxHp)return;this.recordAction();const amount=Math.min(HEAL_AMOUNT,u.maxHp-u.hp);u.hp+=amount;this.useAction(u);this.floatText(u,`+${amount}`,'#b8ffd0');this.log(`${u.name} uses Heal: +${amount} HP.`);this.closeActionMenu();this.rebuildToken(u);this.syncUI();this.refreshHighlights();this.maybeFinishTurn(u);}
  defendSelected(){const u=this.activeUnit();if(!u||u.team!=='player'||!this.hasAction(u)||u.defending)return;this.recordAction();u.defending=true;this.useAction(u);this.log(`${u.name} uses Defend.`);this.closeActionMenu();this.rebuildToken(u);this.syncUI();this.refreshHighlights();this.maybeFinishTurn(u);}

  async runEnemyAction(){const e=this.activeUnit();if(!e||e.team!=='enemy'||this.gameOver)return;if(!this.hasAction(e)){this.finishActiveTurn();return;}this.selectedId=e.id;this.refreshHighlights();this.syncUI();const heroes=[...this.living('player')].sort((a,b)=>this.distance(e,a)-this.distance(e,b)),target=heroes[0];if(!target)return;if(this.distance(e,target)===1){await this.attack(e,target);if(!this.gameOver)this.schedule(380,()=>void this.runEnemyAction());return;}const opts=this.reachableTiles(e,MOVE).map(p=>({p,r:this.findRoute(e,p,e.id)})).filter(o=>o.r.length>1).sort((a,b)=>this.distance(a.p,target)-this.distance(b.p,target)||a.r.length-b.r.length);if(opts[0])await this.moveEnemy(e,opts[0].r);else this.useAction(e);this.schedule(340,()=>void this.runEnemyAction());}
  async moveEnemy(e:Unit,r:Point[]){const token=this.tokens.get(e.id);if(!token)return;const d=r[r.length-1];this.drawRoute(r,'enemy');await this.tweenTo({targets:token,x:d.x*CELL+CELL/2,y:d.y*CELL+CELL/2,duration:160*(r.length-1),ease:'Sine.easeInOut'});e.x=d.x;e.y=d.y;this.useAction(e);this.routeGraphics?.clear();this.rebuildToken(e);this.refreshHighlights();this.syncUI();}

  refreshHighlights(){this.cells.forEach((c,k)=>{const[x,y]=k.split(',').map(Number);c.setStrokeStyle(1,0x242719,.72);c.setFillStyle((x+y)%3===0?0x747744:0x68703d,1);});if(this.gameMode!=='combat')return;const s=this.selected();if(!s)return;if(s.team==='enemy'){this.reachableTiles(s,MOVE).forEach(p=>this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0x9b3942,.5).setStrokeStyle(2,0xff747c,.82));const threat=new Set<string>();this.reachableTiles(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(`${n.x},${n.y}`)));threat.forEach(k=>this.cells.get(k)?.setFillStyle(0xb35d3b,.42));this.cells.get(`${s.x},${s.y}`)?.setStrokeStyle(5,0xffd5a6,1);return;}if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachableTiles(s,MOVE).forEach(p=>{if(!(p.x===s.x&&p.y===s.y))this.cells.get(`${p.x},${p.y}`)?.setFillStyle(0x2e82b9,.58).setStrokeStyle(3,0x72dfff,.95);});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))this.cells.get(`${e.x},${e.y}`)?.setFillStyle(0xb34842,.8).setStrokeStyle(4,0xff9a78,1);});}

  showDragDestination(d?:Point,r?:Point[]){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;if(!d||!r){this.routeGraphics?.clear();return;}this.drawRoute(r,'player');const g=this.add.graphics().setDepth(35);g.fillStyle(0x6bdcff,.24).fillRoundedRect(d.x*CELL+5,d.y*CELL+5,CELL-10,CELL-10,10);g.lineStyle(5,0xb8f5ff,1).strokeRoundedRect(d.x*CELL+5,d.y*CELL+5,CELL-10,CELL-10,10);this.destinationGraphics=g;}
  showDragAttackTarget(t:Unit){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;const g=this.add.graphics().setDepth(35);g.fillStyle(0xd14b3f,.34).fillRoundedRect(t.x*CELL+4,t.y*CELL+4,CELL-8,CELL-8,10);g.lineStyle(6,0xffd18a,1).strokeRoundedRect(t.x*CELL+4,t.y*CELL+4,CELL-8,CELL-8,10);this.destinationGraphics=g;}
  clearDragDestination(){this.destinationGraphics?.destroy();this.destinationGraphics=undefined;this.routeGraphics?.clear();}
  drawRoute(r:Point[],team:Team){this.routeGraphics?.destroy();if(r.length<2)return;const g=this.add.graphics().setDepth(30),outer=team==='enemy'?0x7a1724:0x075f88,inner=team==='enemy'?0xf05663:0x62dcff;const pts=r.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2})),prev=pts[pts.length-2],end=pts[pts.length-1],ang=Math.atan2(end.y-prev.y,end.x-prev.x),ux=Math.cos(ang),uy=Math.sin(ang),px=-uy,py=ux,shaft={x:end.x-ux*13,y:end.y-uy*13};for(const [w,c] of [[24,outer],[14,inner]] as const){g.lineStyle(w,c,1);g.beginPath();[...pts.slice(0,-1),shaft].forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.strokePath();}const base={x:end.x-ux*17,y:end.y-uy*17},tip={x:end.x+ux*24,y:end.y+uy*24};g.fillStyle(outer,1).fillTriangle(tip.x,tip.y,base.x+px*22,base.y+py*22,base.x-px*22,base.y-py*22);const ib={x:end.x-ux*14,y:end.y-uy*14},it={x:end.x+ux*17,y:end.y+uy*17};g.fillStyle(inner,1).fillTriangle(it.x,it.y,ib.x+px*13,ib.y+py*13,ib.x-px*13,ib.y-py*13);this.routeGraphics=g;}
  async animateAttack(a:Unit,t:Unit){const at=this.tokens.get(a.id),tt=this.tokens.get(t.id);if(!at||!tt)return;const bx=at.x,by=at.y,dx=tt.x-at.x,dy=tt.y-at.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;at.setDepth(45);await this.tweenTo({targets:at,x:bx+ux*22,y:by+uy*22,duration:85,ease:'Quad.easeOut'});this.cameras.main.shake(90,.0035);await this.tweenTo({targets:at,x:bx,y:by,duration:100,ease:'Quad.easeIn'});at.setDepth(0);}
  floatText(u:Unit,text:string,color:string){const token=this.tokens.get(u.id);if(!token)return;const t=this.add.text(token.x,token.y-20,text,{fontFamily:'Georgia',fontStyle:'bold',fontSize:'23px',color,stroke:'#10202a',strokeThickness:5}).setOrigin(.5).setDepth(70);this.tweens.add({targets:t,y:t.y-34,alpha:0,duration:520,onComplete:()=>t.destroy()});}
  tweenTo(config:Phaser.Types.Tweens.TweenBuilderConfig){return new Promise<void>(resolve=>this.tweens.add({...config,onComplete:()=>resolve()}));}

  twoFingersDown(){return this.input.pointer1.isDown&&this.input.pointer2.isDown;}
  handleTwoFingerGesture(){
    if(!this.twoFingersDown())return;
    this.gestureActive=true;this.suppressInputUntil=performance.now()+320;this.cancelPieceDragForGesture();
    const p1=this.input.pointer1,p2=this.input.pointer2,d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y),mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2},cam=this.cameras.main;
    if(this.gestureDistance>0){
      const before=cam.getWorldPoint(mid.x,mid.y);this.setCameraZoom(cam.zoom*(d/this.gestureDistance));const after=cam.getWorldPoint(mid.x,mid.y);cam.scrollX+=before.x-after.x;cam.scrollY+=before.y-after.y;
    }
    if(this.gestureMid){cam.scrollX-=(mid.x-this.gestureMid.x)/cam.zoom;cam.scrollY-=(mid.y-this.gestureMid.y)/cam.zoom;}
    this.gestureDistance=d;this.gestureMid=mid;
  }
  setLooseCameraBounds(){const w=this.cols*CELL,h=this.rows*CELL;this.cameras.main.setBounds(-w*2,-h*2,w*5,h*5);}
  setCameraZoom(z:number){const min=this.gameMode==='combat'?this.baseZoom*.55:.28,max=this.gameMode==='combat'?this.baseZoom*3.2:3.2;this.cameras.main.setZoom(Phaser.Math.Clamp(z,min,max));}
  fitTactical(){const cam=this.cameras.main;this.baseZoom=Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL));cam.setZoom(this.baseZoom);cam.centerOn(this.cols*CELL/2,this.rows*CELL/2);}
  handleResize(){this.setLooseCameraBounds();if(this.gameMode==='combat')this.fitTactical();else this.centerOn(this.party);}
  centerOn(p:Point){this.cameras.main.pan(p.x*CELL+CELL/2,p.y*CELL+CELL/2,160,'Sine.easeOut');}

  updatePartyDrag(token:Phaser.GameObjects.Container,p:Phaser.Input.Pointer){if(this.draggingId!=='party'||this.inputSuppressed())return;const w=this.cameras.main.getWorldPoint(p.x,p.y),d={x:Math.floor(w.x/CELL),y:Math.floor(w.y/CELL)},r=this.findRoute(this.party,d,'party',true);this.dragRoute=r.length>1?r:[];token.x=w.x;token.y=w.y;}
  finishPartyDrag(token:Phaser.GameObjects.Container){if(this.draggingId!=='party')return;const suppressed=this.inputSuppressed();this.draggingId=undefined;const r=this.dragRoute;this.dragRoute=[];token.x=this.party.x*CELL+CELL/2;token.y=this.party.y*CELL+CELL/2;token.setData('dragged',false);if(!suppressed&&r.length>1)this.moveParty(r[r.length-1]);}
  moveParty(d:Point){const r=this.findRoute(this.party,d,'party',true);if(r.length<2)return;const token=this.tokens.get('party')!,end=r[r.length-1];this.tweens.add({targets:token,x:end.x*CELL+CELL/2,y:end.y*CELL+CELL/2,duration:Math.min(1300,80*(r.length-1)),onComplete:()=>{this.party.x=end.x;this.party.y=end.y;this.centerOn(this.party);const e=this.living('enemy').find(x=>this.distance(this.party,x)<=ENCOUNTER_DISTANCE);if(e)this.schedule(350,()=>this.reset('tactical'));}});}

  findRoute(start:Point,d:Point,movingId:string,explore=false):Point[]{if(d.x<0||d.y<0||d.x>=this.cols||d.y>=this.rows||this.isObstacle(d.x,d.y))return[];const key=(p:Point)=>`${p.x},${p.y}`,q:Point[]=[{...start}],prev=new Map<string,Point|null>([[key(start),null]]);while(q.length){const cur=q.shift()!;if(key(cur)===key(d))break;for(const n of this.neighbors(cur)){const occ=this.at(n.x,n.y),blocked=explore?occ?.team==='enemy':!!occ&&occ.id!==movingId;if(prev.has(key(n))||this.isObstacle(n.x,n.y)||blocked)continue;prev.set(key(n),cur);q.push(n);}}if(!prev.has(key(d)))return[];const r:Point[]=[];let cur:Point|null={...d};while(cur){r.unshift(cur);cur=prev.get(key(cur))??null;}return r;}
  reachableTiles(u:Unit,max:number){const out:Point[]=[];for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){if(this.at(x,y)&&!(u.x===x&&u.y===y))continue;const r=this.findRoute(u,{x,y},u.id);if(r.length&&r.length-1<=max)out.push({x,y});}return out;}
  at(x:number,y:number){return this.units.find(u=>u.hp>0&&u.x===x&&u.y===y);}
  unit(id?:string){return id?this.units.find(u=>u.id===id&&u.hp>0):undefined;}
  selected(){return this.unit(this.selectedId);}
  living(team?:Team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
  distance(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
  isObstacle(x:number,y:number){return this.obstacles.some(o=>o.x===x&&o.y===y);}
  neighbors(p:Point){return[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n=>n.x>=0&&n.y>=0&&n.x<this.cols&&n.y<this.rows);}

  schedule(delay:number,cb:()=>void){const e=this.time.delayedCall(delay,()=>{this.scheduledEvents=this.scheduledEvents.filter(x=>x!==e);cb();});this.scheduledEvents.push(e);return e;}
  cancelScheduledEvents(){this.scheduledEvents.forEach(e=>e.remove(false));this.scheduledEvents=[];}
  rebuildToken(u:Unit){this.tokens.get(u.id)?.destroy();this.createToken(u);}
  checkGameOver(){const h=this.living('player'),e=this.living('enemy');if(h.length&&e.length)return;this.gameOver=true;this.cancelScheduledEvents();this.clearAttackPreview();ui.resultOverlay.hidden=false;ui.resultTitle.textContent=h.length?'Victory':'Defeat';ui.resultCopy.textContent=h.length?'The pass is secure.':'The party has fallen.';this.log(h.length?'Victory.':'Defeat.');this.syncUI();}
  message(t:string){ui.instruction.textContent=t;}
  log(text:string){this.combatLog.push({round:this.round,text});this.renderLog();}
  renderLog(){ui.logList.innerHTML='';for(const entry of this.combatLog){const row=document.createElement('div');row.className='log-entry';row.innerHTML=`<b>R${entry.round}</b><span>${entry.text}</span>`;ui.logList.appendChild(row);}ui.logList.scrollTop=ui.logList.scrollHeight;}
  closeActionMenu(){ui.actionPanel.hidden=true;ui.actionToggle.setAttribute('aria-expanded','false');}
  closeLog(){ui.logPanel.hidden=true;ui.logToggle.setAttribute('aria-expanded','false');}

  syncUI(){const active=this.activeUnit();ui.undo.disabled=!active||active.team!=='player'||this.actionHistory.length===0;ui.actionToggle.disabled=!active||active.team!=='player'||!this.hasAction(active)||this.gameOver;ui.heal.disabled=!active||active.team!=='player'||!this.hasAction(active)||active.hp>=active.maxHp;ui.defend.disabled=!active||active.team!=='player'||!this.hasAction(active)||active.defending;ui.tactical.setAttribute('aria-pressed',String(this.mode==='tactical'));ui.exploration.setAttribute('aria-pressed',String(this.mode==='exploration'));
    const s=this.selected()??active??this.living()[0];if(s){ui.selectedName.textContent=s.name;ui.selectedTeam.textContent=s.team==='player'?'Hero':'Enemy';ui.health.textContent=`${s.hp} / ${s.maxHp}`;ui.attack.textContent=String(s.damage);ui.movement.textContent=String(MOVE);ui.initiative.textContent=`${s.initiativeMod>=0?'+':''}${s.initiativeMod} (${s.initiativeScore})`;ui.actions.textContent=active?.id===s.id?`${ACTIONS_PER_TURN-s.actionsUsed} / ${ACTIONS_PER_TURN}`:'—';ui.portrait.textContent=this.tokenGlyph(s);}
    ui.initiativeRail.innerHTML='';let activeButton:HTMLButtonElement|undefined;this.turnOrder.forEach((id,i)=>{const u=this.unit(id);if(!u)return;const b=document.createElement('button');b.type='button';b.className=`initiative-token ${u.team}${i===this.activeIndex?' active':''}`;b.setAttribute('role','listitem');b.setAttribute('aria-label',`${u.name}${i===this.activeIndex?', current turn':''}`);b.innerHTML=`<span>${this.tokenGlyph(u)}</span>`;if(i===this.activeIndex)activeButton=b;b.addEventListener('click',()=>{this.clearAttackPreview();this.selectedId=u.id;this.refreshHighlights();this.syncUI();this.centerOn(u);});ui.initiativeRail.appendChild(b);});
    if(activeButton)requestAnimationFrame(()=>activeButton?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:'battlefield',backgroundColor:'#000000',resolution:Math.min(window.devicePixelRatio||1,3),scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%',autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,pixelArt:false,roundPixels:false,transparent:false},scene:TacticsScene});
ui.forecast.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();scene.confirmAttack();});
ui.forecast.addEventListener('click',()=>scene.confirmAttack());
ui.forecast.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();scene.confirmAttack();}});
ui.undo.addEventListener('click',()=>scene.undoLastAction());
ui.actionToggle.addEventListener('click',()=>{const open=ui.actionPanel.hidden;ui.actionPanel.hidden=!open;ui.actionToggle.setAttribute('aria-expanded',String(open));});
ui.heal.addEventListener('click',()=>scene.healSelected()); ui.defend.addEventListener('click',()=>scene.defendSelected());
ui.statsToggle.addEventListener('click',()=>{const open=ui.drawer.classList.toggle('open');ui.statsToggle.setAttribute('aria-expanded',String(open));});
ui.logToggle.addEventListener('click',()=>{const open=ui.logPanel.hidden;ui.logPanel.hidden=!open;ui.logToggle.setAttribute('aria-expanded',String(open));scene.renderLog();}); ui.logClose.addEventListener('click',()=>scene.closeLog());
ui.restart.addEventListener('click',()=>{scene.reset();ui.settings.open=false;});ui.restartOverlay.addEventListener('click',()=>scene.reset());ui.tactical.addEventListener('click',()=>{scene.reset('tactical');ui.settings.open=false;});ui.exploration.addEventListener('click',()=>{scene.reset('exploration');ui.settings.open=false;});