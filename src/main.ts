import './phaser.css';
import {
  CONDITIONS,ENEMIES,ENEMY_ATTACKS,HEROES,POWERS,SCENARIOS,chebyshev,pointKey,powerById,scenarioById,
  type Condition,type EnemyRole,type Point,type Power,type Scenario,type ScenarioId,type Stat,type Team,type Terrain,type TerrainKind,type Unit
} from './tactics48';

const COLS=6;
const ROWS=8;
const CELL=16;
const NS='http://www.w3.org/2000/svg';
const MAX_MOMENTUM=5;
const SUPPORT_DEFENSE=8;
const TIERS=['TIER 1','TIER 2','TIER 3'] as const;

type LogEntry={round:number;text:string};
type Zone={id:string;kind:'sanctuary';cells:Point[];ownerId:string;expiresRound:number};
type ObjectiveState={sigils:number;hold:number;rescued:boolean;carrierId?:string};
type Targeting={powerId:string;chosenId?:string};
type Preview={
  powerId:string;
  targets:string[];
  point?:Point;
  cells?:Point[];
  route?:Point[];
  chosenId?:string;
  title:string;
  copy:string;
};
type GameSnapshot={
  units:Unit[];terrain:Terrain[];zones:Zone[];momentum:number;objective:ObjectiveState;
  logEntries:LogEntry[];selectedId:string;activeId?:string;round:number;firstRoundFlankAwarded:boolean;
};
type RouteResult={path:Point[];cost:number};
type RollResult={dice:[number,number];bonus:number;total:number;defense:number;tier:0|1|2;modifiers:string[]};

const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const ui={
  title:$('#title-screen'),form:$('#encounter-form') as HTMLFormElement,scenario:$('#scenario-select') as HTMLSelectElement,
  enemyCount:$('#enemy-count') as HTMLSelectElement,scenarioPreview:$('#scenario-preview'),
  shell:$('#game-shell'),viewport:$('.battlefield-viewport'),frame:$('#battlefield-frame'),battlefield:$('#battlefield'),
  side:$('#side-label'),round:$('#round-label'),railRound:$('#rail-round'),objectiveKicker:$('#objective-kicker'),
  objectiveLabel:$('#objective-label'),objectiveButton:$('#objective-button') as HTMLButtonElement,momentum:$('#momentum-pips'),
  instruction:$('#instruction'),hotbar:$('#action-hotbar'),rail:$('#activation-rail'),railDrawer:$('#activation-drawer'),
  railToggle:$('#rail-toggle') as HTMLButtonElement,utilityToggle:$('#utility-toggle') as HTMLButtonElement,utilityPanel:$('#utility-panel'),
  setup:$('#setup-action') as HTMLButtonElement,helpToggle:$('#help-toggle') as HTMLButtonElement,
  help:$('#help-overlay'),helpClose:$('#help-close') as HTMLButtonElement,helpDone:$('#help-done') as HTMLButtonElement,
  statsToggle:$('#stats-toggle') as HTMLButtonElement,drawer:$('#unit-drawer'),drawerClose:$('#drawer-close') as HTMLButtonElement,
  selectedTeam:$('#selected-team'),selectedName:$('#selected-name'),selectedClass:$('#selected-class'),portrait:$('#portrait'),
  health:$('#health-text'),defense:$('#defense-stat'),movement:$('#movement-stat'),might:$('#might-stat'),
  agility:$('#agility-stat'),will:$('#will-stat'),passive:$('#passive-stat'),reactionRow:$('#reaction-row'),
  reaction:$('#reaction-stat'),statusChips:$('#status-chips'),powerList:$('#power-list'),
  logToggle:$('#log-toggle') as HTMLButtonElement,logPanel:$('#combat-log-panel'),logList:$('#combat-log-list'),
  logClose:$('#log-close') as HTMLButtonElement,undo:$('#undo-action') as HTMLButtonElement,
  zoomReset:$('#zoom-reset') as HTMLButtonElement,decision:$('#decision-panel'),decisionKicker:$('#decision-kicker'),
  decisionTitle:$('#decision-title'),decisionCopy:$('#decision-copy'),decisionConfirm:$('#decision-confirm') as HTMLButtonElement,
  decisionCancel:$('#decision-cancel') as HTMLButtonElement,result:$('#result-overlay'),resultTitle:$('#result-title'),
  resultCopy:$('#result-copy'),restart:$('#restart-overlay') as HTMLButtonElement,setupOverlay:$('#setup-overlay') as HTMLButtonElement
};

const ICONS:Record<string,string>={
  'heavy-strike':'⚔','shield-bash':'⬟','come-and-get-me':'⌁',cleave:'⚔',whirlwind:'⟳',
  backstab:'◆','dashing-strike':'➜',swap:'⇄',vanish:'◌',
  fireball:'●','force-wave':'≋','ice-wall':'▥',teleport:'✦',vortex:'◎',
  smite:'✚',restore:'♥',sanctuary:'◇',command:'☝',
  interact:'✋',rally:'↥',end:'⌛'
};

function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={}){
  const element=document.createElementNS(NS,tag) as SVGElementTagNameMap[K];
  for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
  return element;
}
function cloneUnit(unit:Unit):Unit{return{...unit,conditions:{...unit.conditions},powers:[...unit.powers]};}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function sign(value:number){return value===0?0:value>0?1:-1;}
function signed(value:number){return(value>=0?'+':'')+value;}
function delay(ms:number){return new Promise<void>(resolve=>window.setTimeout(resolve,ms));}

class Game{
  scenario:Scenario=SCENARIOS[0];
  enemyCount=5;
  units:Unit[]=[];
  terrain:Terrain[]=[];
  zones:Zone[]=[];
  round=1;
  activeTeam:Team='player';
  activeId?:string;
  selectedId='';
  momentum=0;
  objective:ObjectiveState={sigils:0,hold:0,rescued:false};
  firstRoundFlankAwarded=false;
  targeting?:Targeting;
  preview?:Preview;
  forcedMoverId?:string;
  forcedMoveRange=0;
  forcedMoveReason='';
  snapshot?:GameSnapshot;
  logEntries:LogEntry[]=[];
  gameOver=false;
  busy=false;
  railOpen=false;
  svg?:SVGSVGElement;
  world?:SVGGElement;
  routeLayer?:SVGGElement;
  tokenLayer?:SVGGElement;
  scale=1;
  tx=0;
  ty=0;
  cameraDirty=false;
  pointers=new Map<number,{x:number;y:number}>();
  gesture?:{distance:number;scale:number;anchor:Point;mid:Point;mode:'wait'|'pan'|'zoom'};
  gestureActive=false;
  gestureSuppressUntil=0;
  drag?:{id:string;pointerId:number;ghost:SVGGElement};

  constructor(){
    this.bindGlobal();
    this.updateScenarioPreview();
    this.renderMomentum();
    (window as typeof window&{__TACTICS48__?:unknown}).__TACTICS48__={
      getState:()=>this.debugState(),
      start:(scenario:ScenarioId='broken-gate',enemies=5)=>this.startEncounter(scenario,enemies),
      game:this
    };
  }

  bindGlobal(){
    ui.scenario.addEventListener('change',()=>this.updateScenarioPreview());
    ui.form.addEventListener('submit',event=>{
      event.preventDefault();
      this.startEncounter(ui.scenario.value as ScenarioId,clamp(Number(ui.enemyCount.value)||5,4,8));
    });
    ui.setup.addEventListener('click',()=>this.showSetup());
    ui.setupOverlay.addEventListener('click',()=>this.showSetup());
    ui.restart.addEventListener('click',()=>this.startEncounter(this.scenario.id,this.enemyCount));
    ui.objectiveButton.addEventListener('click',()=>this.showObjective());
    ui.utilityToggle.addEventListener('click',()=>this.toggleUtility());
    ui.railToggle.addEventListener('click',()=>this.toggleRail());
    ui.statsToggle.addEventListener('click',()=>this.toggleDrawer());
    ui.drawerClose.addEventListener('click',()=>this.closeDrawer());
    ui.helpToggle.addEventListener('click',()=>this.showHelp(true));
    ui.helpClose.addEventListener('click',()=>this.showHelp(false));
    ui.helpDone.addEventListener('click',()=>this.showHelp(false));
    ui.logToggle.addEventListener('click',()=>this.toggleLog());
    ui.logClose.addEventListener('click',()=>this.closeLog());
    ui.undo.addEventListener('click',()=>this.undoActivation());
    ui.zoomReset.addEventListener('click',()=>this.resetCamera());
    ui.decisionCancel.addEventListener('click',()=>this.cancelPreview());
    ui.decisionConfirm.addEventListener('click',()=>void this.confirmPreview());
    window.addEventListener('resize',()=>this.layout());
  }

  updateScenarioPreview(){
    const scenario=scenarioById(ui.scenario.value);
    ui.scenarioPreview.textContent=scenario.objective;
  }

  startEncounter(id:ScenarioId,count:number){
    this.scenario=scenarioById(id);
    this.enemyCount=count;
    this.units=[];
    this.terrain=this.scenario.terrain.map((terrain,index)=>({...terrain,id:'terrain-'+index}));
    this.zones=[];
    this.round=1;
    this.activeTeam='player';
    this.activeId=undefined;
    this.momentum=0;
    this.objective={sigils:0,hold:0,rescued:false};
    this.firstRoundFlankAwarded=false;
    this.targeting=undefined;
    this.preview=undefined;
    this.forcedMoverId=undefined;
    this.snapshot=undefined;
    this.logEntries=[];
    this.gameOver=false;
    this.busy=false;
    this.scale=1;this.tx=0;this.ty=0;this.cameraDirty=false;

    HEROES.forEach((template,index)=>{
      const p=this.scenario.heroSpawns[index];
      this.units.push(this.makeUnit(template,'hero-'+template.key,p));
    });
    const order=['brute','skirmisher','controller','guardian','archer','skirmisher','archer','guardian'];
    for(let index=0;index<count;index++){
      const template=ENEMIES.find(enemy=>enemy.key===order[index])??ENEMIES[index%ENEMIES.length];
      const unit=this.makeUnit(template,'enemy-'+(index+1),this.scenario.enemySpawns[index]);
      if(id==='broken-gate'&&index===0){unit.name='Orc War Chief';unit.hp=24;unit.maxHp=24;unit.defense=10;unit.elite=true;}
      this.units.push(unit);
    }
    this.selectedId=this.units[0].id;
    ui.title.hidden=true;ui.shell.hidden=false;ui.drawer.hidden=false;ui.result.hidden=true;this.closeDrawer();this.closeLog();this.showHelp(false);
    this.log(this.scenario.name+': '+this.scenario.objective);
    this.log('Round 1 begins. Choose any ready hero.');
    this.message('Choose any ready hero to begin.');
    this.render();
  }

  makeUnit(template:typeof HEROES[number],id:string,p:Point):Unit{
    return{
      ...template,id,x:p.x,y:p.y,maxHp:template.hp,activated:false,moved:false,acted:false,reactionUsed:false,
      downed:false,conditions:{},bonusMove:0,carriedObjective:false,powers:[...template.powers]
    };
  }

  showSetup(){
    this.gameOver=true;this.busy=false;this.activeId=undefined;ui.shell.hidden=true;ui.title.hidden=false;ui.result.hidden=true;this.closeDrawer();this.closeLog();
  }

  active(){return this.activeId?this.unit(this.activeId):undefined;}
  unit(id?:string){return id?this.units.find(unit=>unit.id===id):undefined;}
  selected(){return this.unit(this.selectedId);}
  heroes(includeDowned=false){return this.units.filter(unit=>unit.team==='player'&&(includeDowned||!unit.downed)&&unit.hp>0);}
  enemies(){return this.units.filter(unit=>unit.team==='enemy'&&unit.hp>0);}
  combatants(){return this.units.filter(unit=>unit.team==='enemy'?unit.hp>0:true);}
  ready(team:Team){return this.units.filter(unit=>unit.team===team&&!unit.activated&&unit.hp>0&&!unit.downed);}
  hasReady(team:Team){return this.ready(team).length>0;}
  isActiveHero(unit:Unit){return unit.team==='player'&&unit.id===this.activeId&&this.activeTeam==='player'&&!this.gameOver;}
  terrainAt(p:Point,kind?:TerrainKind){return this.terrain.find(t=>t.x===p.x&&t.y===p.y&&(!kind||t.kind===kind));}
  unitAt(p:Point,includeDowned=true){return this.units.find(unit=>unit.x===p.x&&unit.y===p.y&&(unit.hp>0||(includeDowned&&unit.team==='player'&&unit.downed)));}
  inBounds(p:Point){return p.x>=0&&p.y>=0&&p.x<COLS&&p.y<ROWS;}
  stat(unit:Unit,stat:Stat){return unit[stat];}
  isBlockingTerrain(terrain?:Terrain){return Boolean(terrain&&['wall','destructible','door','icewall','captive','rune'].includes(terrain.kind));}
  isBlocked(p:Point,movingId?:string,ignoreUnits=false){
    if(!this.inBounds(p)||this.isBlockingTerrain(this.terrainAt(p)))return true;
    if(ignoreUnits)return false;
    const occupant=this.unitAt(p);
    return Boolean(occupant&&occupant.id!==movingId&&(occupant.hp>0||occupant.downed));
  }
  isHigh(unit:Unit){return Boolean(this.terrainAt(unit,'high'));}
  moveAllowance(unit:Unit){return Math.max(1,unit.move-(unit.conditions.Slowed?1:0));}

  activateHero(unit:Unit){
    if(this.busy||this.gameOver||this.activeTeam!=='player'||unit.team!=='player'||unit.activated||unit.downed||unit.hp<=0)return;
    const current=this.active();
    if(current&&(current.moved||current.acted||current.bonusMove>0)){this.message('Finish '+current.name+'’s activation first.');return;}
    this.activeId=unit.id;this.selectedId=unit.id;unit.moved=false;unit.acted=false;unit.bonusMove=0;
    this.removeStartEffects(unit);
    this.snapshot=this.makeSnapshot();
    this.cancelTargeting(false);
    this.log(unit.name+' activates.');
    this.message(unit.name+': Move and take one Action in either order.');
    this.render();
  }

  removeStartEffects(unit:Unit){
    delete unit.conditions.Guarded;
    if(unit.role==='Wizard')this.terrain=this.terrain.filter(t=>!(t.kind==='icewall'&&t.ownerId===unit.id));
    if(unit.role==='Cleric')this.zones=this.zones.filter(zone=>zone.ownerId!==unit.id);
  }

  async finishActivation(){
    const unit=this.active();if(!unit||this.busy||this.gameOver)return;
    this.cancelTargeting(false);
    unit.activated=true;
    if(unit.conditions.Burning&&unit.hp>0){
      this.log(unit.name+' burns for 2 damage.');
      await this.directDamage(unit,2,'Burning');
    }
    for(const condition of ['Exposed','Rooted','Slowed'] as Condition[]){
      if(unit.conditions[condition]){
        unit.conditions[condition]!--;
        if((unit.conditions[condition]??0)<=0)delete unit.conditions[condition];
      }
    }
    unit.bonusMove=0;
    this.activeId=undefined;
    this.snapshot=undefined;
    if(this.checkGameOver())return;
    if(this.hasReady('enemy')){
      this.activeTeam='enemy';this.render();this.message('Enemy activation…');await delay(420);await this.runEnemyActivation();
    }else if(this.hasReady('player')){
      this.activeTeam='player';this.render();this.message('Choose another ready hero.');
    }else await this.beginRound();
  }

  async completeEnemyActivation(unit:Unit){
    unit.activated=true;
    if(unit.conditions.Burning&&unit.hp>0){this.log(unit.name+' burns for 2 damage.');await this.directDamage(unit,2,'Burning');}
    for(const condition of ['Exposed','Rooted','Slowed'] as Condition[]){
      if(unit.conditions[condition]){unit.conditions[condition]!--;if((unit.conditions[condition]??0)<=0)delete unit.conditions[condition];}
    }
    this.activeId=undefined;
    if(this.checkGameOver())return;
    if(this.hasReady('player')){this.activeTeam='player';this.render();this.message('Choose a ready hero.');}
    else if(this.hasReady('enemy')){this.activeTeam='enemy';this.render();await delay(320);await this.runEnemyActivation();}
    else await this.beginRound();
  }

  async beginRound(){
    this.scoreEndOfRound();
    if(this.checkGameOver())return;
    this.round++;
    if(this.scenario.roundLimit<99&&this.round>this.scenario.roundLimit){
      this.endGame(false,'The enemy ritual overwhelms the shrine at the start of round '+this.round+'.');return;
    }
    for(const unit of this.units){unit.activated=false;unit.reactionUsed=false;unit.moved=false;unit.acted=false;unit.bonusMove=0;}
    this.activeTeam='player';this.activeId=undefined;
    this.log('Round '+this.round+' begins.');
    this.render();this.message('Round '+this.round+': choose any ready hero.');
  }

  scoreEndOfRound(){
    if(this.scenario.id!=='ember-shrine'||this.objective.sigils<2)return;
    const shrine=this.terrain.filter(t=>t.kind==='objective');
    const heroControls=shrine.some(cell=>this.heroes().some(hero=>hero.x===cell.x&&hero.y===cell.y));
    const enemyControls=shrine.some(cell=>this.enemies().some(enemy=>enemy.x===cell.x&&enemy.y===cell.y));
    if(heroControls&&!enemyControls){this.objective.hold++;this.gainMomentum(1,'holding the Ember Shrine');this.log('Shrine held: '+this.objective.hold+' / 2 rounds.');}
  }

  checkGameOver(){
    if(this.gameOver)return true;
    if(!this.heroes().length){this.endGame(false,'Every hero is Downed.');return true;}
    if(this.scenario.id==='broken-gate'){
      const chief=this.units.find(unit=>unit.name==='Orc War Chief');
      if(!chief||chief.hp<=0){this.endGame(true,'The War Chief falls and the broken gate is yours.');return true;}
    }
    if(this.scenario.id==='ember-shrine'&&this.objective.sigils>=2&&this.objective.hold>=2){
      this.endGame(true,'The sigils are broken and the Ember Shrine holds.');return true;
    }
    if(this.scenario.id==='rescue-run'&&this.objective.rescued&&this.objective.carrierId){
      const carrier=this.unit(this.objective.carrierId);
      if(carrier&&this.terrainAt(carrier,'exit')){this.endGame(true,carrier.name+' carries the captive to safety.');return true;}
    }
    return false;
  }

  endGame(victory:boolean,copy:string){
    this.gameOver=true;this.busy=false;this.activeId=undefined;ui.result.hidden=false;
    ui.result.querySelector('.eyebrow')!.textContent=victory?'MISSION COMPLETE':'MISSION FAILED';
    ui.resultTitle.textContent=victory?'Victory':'Defeat';ui.resultCopy.textContent=copy;this.log((victory?'Victory — ':'Defeat — ')+copy);this.render();
  }

  makeSnapshot():GameSnapshot{
    return{units:this.units.map(cloneUnit),terrain:this.terrain.map(t=>({...t})),zones:this.zones.map(z=>({...z,cells:z.cells.map(p=>({...p}))})),
      momentum:this.momentum,objective:{...this.objective},logEntries:this.logEntries.map(e=>({...e})),selectedId:this.selectedId,
      activeId:this.activeId,round:this.round,firstRoundFlankAwarded:this.firstRoundFlankAwarded};
  }

  undoActivation(){
    if(!this.snapshot||this.busy||this.activeTeam!=='player'||this.gameOver)return;
    const snapshot=this.snapshot;
    this.units=snapshot.units.map(cloneUnit);this.terrain=snapshot.terrain.map(t=>({...t}));
    this.zones=snapshot.zones.map(z=>({...z,cells:z.cells.map(p=>({...p}))}));this.momentum=snapshot.momentum;
    this.objective={...snapshot.objective};this.logEntries=snapshot.logEntries.map(e=>({...e}));this.selectedId=snapshot.selectedId;
    this.activeId=snapshot.activeId;this.round=snapshot.round;this.firstRoundFlankAwarded=snapshot.firstRoundFlankAwarded;
    this.targeting=undefined;this.preview=undefined;this.forcedMoverId=undefined;this.renderLog();this.render();this.message('Activation rewound.');
  }

  gainMomentum(amount:number,reason:string){
    const before=this.momentum;this.momentum=clamp(this.momentum+amount,0,MAX_MOMENTUM);
    if(this.momentum>before){this.log('Momentum +'+(this.momentum-before)+' — '+reason+'.');this.showMomentumPulse();}
  }
  spendMomentum(cost:number){if(this.momentum<cost)return false;this.momentum-=cost;return true;}

  effectiveDefense(target:Unit,source?:Unit,ranged=false){
    let defense=target.defense;
    const reasons:string[]=[];
    if(target.conditions.Guarded){defense++;reasons.push('Guarded');}
    if(target.conditions.Exposed){defense--;reasons.push('Exposed');}
    if(this.inSanctuary(target)){defense++;reasons.push('Sanctuary');}
    if(target.team==='enemy'&&this.enemies().some(unit=>unit.role==='Guardian'&&unit.id!==target.id&&chebyshev(unit,target)<=1)){defense++;reasons.push('Guardian');}
    if(ranged&&source&&this.hasCover(source,target)){defense++;reasons.push('Cover');}
    return{value:defense,reasons};
  }

  inSanctuary(unit:Unit){return this.zones.some(zone=>zone.kind==='sanctuary'&&zone.cells.some(cell=>cell.x===unit.x&&cell.y===unit.y)&&unit.team==='player');}

  hasCover(source:Unit,target:Unit){
    if(this.terrainAt(target,'cover'))return true;
    const dx=sign(source.x-target.x),dy=sign(source.y-target.y);
    return Boolean(this.terrainAt({x:target.x+dx,y:target.y+dy},'cover'));
  }

  isFlanked(target:Unit,byTeam:Team='player'){
    const adjacent=this.units.filter(unit=>unit.team===byTeam&&unit.hp>0&&!unit.downed&&chebyshev(unit,target)===1);
    for(let i=0;i<adjacent.length;i++)for(let j=i+1;j<adjacent.length;j++){
      const a={x:sign(adjacent[i].x-target.x),y:sign(adjacent[i].y-target.y)};
      const b={x:sign(adjacent[j].x-target.x),y:sign(adjacent[j].y-target.y)};
      if(a.x===-b.x&&a.y===-b.y)return true;
    }
    return false;
  }

  isolated(unit:Unit){return !this.units.some(other=>other.team===unit.team&&other.id!==unit.id&&other.hp>0&&!other.downed&&chebyshev(other,unit)<=2);}

  rollPower(source:Unit,stat:Stat,target:Unit|undefined,defense:number,ranged=false,extraBonus=0):RollResult{
    const dice:[number,number]=[this.rollDie(6),this.rollDie(6)];
    let bonus=this.stat(source,stat)+extraBonus;
    const modifiers:string[]=[];
    if(source.conditions.Dazed){bonus--;delete source.conditions.Dazed;modifiers.push('Dazed −1');}
    if(target&&source.team==='player'&&target.team==='enemy'&&this.isFlanked(target,'player')){
      bonus++;modifiers.push('Flank +1');
      if(this.round===1&&!this.firstRoundFlankAwarded){this.firstRoundFlankAwarded=true;this.gainMomentum(1,'first-round flank');}
    }
    if(source.role==='Skirmisher'&&target&&this.isolated(target)){bonus++;modifiers.push('Isolated +1');}
    const total=dice[0]+dice[1]+bonus;
    const tier:0|1|2=total<=defense-3?0:total>=defense+3?2:1;
    return{dice,bonus,total,defense,tier,modifiers};
  }

  rollDie(sides:number){return Math.floor(Math.random()*sides)+1;}
  rollText(roll:RollResult){return'2d6 ['+roll.dice.join(', ')+'] '+signed(roll.bonus)+' = '+roll.total+' vs '+roll.defense+' — '+TIERS[roll.tier]+(roll.modifiers.length?' ('+roll.modifiers.join(', ')+')':'');}

  powerRange(source:Unit,power:Power){return power.range+(this.isHigh(source)&&power.range>1?1:0);}

  hasLineOfSight(a:Point,b:Point){
    const points=this.lineCells(a,b).slice(1,-1);
    return!points.some(point=>{const terrain=this.terrainAt(point);return terrain&&['wall','destructible','door','icewall'].includes(terrain.kind);});
  }

  lineCells(a:Point,b:Point){
    const points:Point[]=[];let x=a.x,y=a.y;
    const dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y),sx=a.x<b.x?1:-1,sy=a.y<b.y?1:-1;let err=dx-dy;
    while(true){points.push({x,y});if(x===b.x&&y===b.y)break;const e2=2*err;if(e2>-dy){err-=dy;x+=sx;}if(e2<dx){err+=dx;y+=sy;}}
    return points;
  }

  tierPreview(power:Power){
    if(power.tierText)return power.tierText.map((text,index)=>'T'+(index+1)+' '+text).join(' · ');
    return power.description;
  }

  beginPower(powerId:string){
    const source=this.active(),power=powerById(powerId);
    if(!source||source.team!=='player'||source.acted||this.busy||!power)return;
    if(power.momentum&&this.momentum<power.momentum){this.message(power.name+' needs '+power.momentum+' Momentum.');return;}
    this.cancelPreview(false);
    this.targeting={powerId};
    if(['come-and-get-me','cleave','whirlwind'].includes(powerId)){
      const targets=this.enemies().filter(enemy=>chebyshev(source,enemy)<=power.range).slice(0,powerId==='cleave'?2:99);
      if(!targets.length){this.message('No enemies are in reach.');this.targeting=undefined;return;}
      this.setPreview({powerId,targets:targets.map(t=>t.id),title:power.name,copy:this.tierPreview(power)});
      return;
    }
    this.preview=undefined;
    this.message(this.targetPrompt(power));
    this.render();
  }

  targetPrompt(power:Power){
    if(power.id==='fireball'||power.id==='vortex'||power.id==='sanctuary')return'Choose the '+(power.id==='vortex'?'3×3 centre.':'2×2 area.');
    if(power.id==='force-wave')return'Choose a direction for the 3-square line.';
    if(power.id==='ice-wall')return'Choose the centre of the three-square wall.';
    if(power.id==='vanish')return'Choose an empty destination within 3.';
    if(power.id==='teleport')return'Choose yourself or an ally within 3.';
    if(power.id==='command')return'Choose an ally within 3.';
    if(power.target==='ally')return'Choose an ally in range.';
    return'Choose an enemy in range.';
  }

  cancelTargeting(render=true){this.targeting=undefined;this.preview=undefined;ui.decision.hidden=true;if(render)this.render();}
  cancelPreview(render=true){this.preview=undefined;ui.decision.hidden=true;if(render)this.render();}

  setPreview(preview:Preview){
    this.preview=preview;
    ui.decisionKicker.textContent=preview.powerId==='__move__'?'MOVE PREVIEW':'POWER PREVIEW';
    ui.decisionTitle.textContent=preview.title;ui.decisionCopy.textContent=preview.copy;ui.decision.hidden=false;
    this.render();
  }

  async confirmPreview(){
    const preview=this.preview;if(!preview||this.busy)return;
    this.preview=undefined;ui.decision.hidden=true;
    if(preview.powerId==='__move__'){await this.confirmMove(preview);return;}
    await this.executePower(preview);
  }

  async executePower(preview:Preview){
    const source=this.active(),power=powerById(preview.powerId);if(!source||!power||source.acted)return;
    if(power.momentum&&!this.spendMomentum(power.momentum)){this.message('Not enough Momentum.');return;}
    source.acted=true;this.targeting=undefined;this.busy=true;
    switch(power.id){
      case'heavy-strike':await this.singleAttack(source,this.unit(preview.targets[0])!,power,tier=>{if(tier===2)this.pushFrom(source,this.unit(preview.targets[0])!,1);});break;
      case'shield-bash':await this.singleAttack(source,this.unit(preview.targets[0])!,power,tier=>{source.conditions.Guarded=1;this.pushFrom(source,this.unit(preview.targets[0])!,tier===2?2:1);});break;
      case'come-and-get-me':
        source.conditions.Guarded=1;for(const id of preview.targets){const target=this.unit(id);if(target?.hp)this.pullToward(source,target,1);}this.log(source.name+' uses Come & Get Me, pulling '+preview.targets.length+' enemies.');break;
      case'cleave':for(const id of preview.targets){const target=this.unit(id);if(target?.hp)await this.singleAttack(source,target,power);}break;
      case'whirlwind':for(const id of preview.targets){const target=this.unit(id);if(target?.hp){const result=await this.singleAttack(source,target,power);if(target.hp>0)this.pushFrom(source,target,result.tier===2?2:1);}}break;
      case'backstab':await this.singleAttack(source,this.unit(preview.targets[0])!,power,undefined,this.isFlanked(this.unit(preview.targets[0])!,'player')?3:0);break;
      case'dashing-strike':{
        if(preview.route&&preview.route.length>1)await this.animateUnitRoute(source,preview.route,false);
        const target=this.unit(preview.targets[0]);if(target?.hp){const result=await this.singleAttack(source,target,power);if(result.tier===2)target.conditions.Exposed=1;}
        source.bonusMove=1;this.forcedMoverId=source.id;this.forcedMoveRange=1;this.forcedMoveReason='Dashing Strike';break;
      }
      case'swap':{const ally=this.unit(preview.targets[0])!;const old={x:source.x,y:source.y};source.x=ally.x;source.y=ally.y;ally.x=old.x;ally.y=old.y;source.conditions.Guarded=1;ally.conditions.Guarded=1;this.log(source.name+' swaps places with '+ally.name+'.');break;}
      case'vanish':if(preview.route)await this.animateUnitRoute(source,preview.route,false);this.log(source.name+' vanishes through the melee.');break;
      case'fireball':for(const id of preview.targets){const target=this.unit(id);if(target?.hp){const result=await this.singleAttack(source,target,power);if(result.tier===2&&target.hp>0)target.conditions.Burning=99;}}break;
      case'force-wave':for(const id of preview.targets){const target=this.unit(id);if(target?.hp){await this.singleAttack(source,target,power);if(target.hp>0)this.pushFrom(source,target,1);}}break;
      case'ice-wall':
        for(const cell of preview.cells??[])this.terrain.push({id:'ice-'+source.id+'-'+pointKey(cell),kind:'icewall',...cell,ownerId:source.id,expiresRound:this.round+1});
        this.log(source.name+' raises a three-square Ice Wall.');break;
      case'teleport':{const ally=this.unit(preview.chosenId);if(ally&&preview.point){ally.x=preview.point.x;ally.y=preview.point.y;this.triggerTerrain(ally);this.log(source.name+' teleports '+ally.name+'.');}break;}
      case'vortex':
        for(const id of preview.targets){const target=this.unit(id);if(target?.hp&&preview.point){this.forceTowardPoint(target,preview.point,1);target.conditions.Dazed=1;}}
        this.log(source.name+' opens a Vortex; '+preview.targets.length+' enemies are pulled and Dazed.');break;
      case'smite':{
        const result=await this.singleAttack(source,this.unit(preview.targets[0])!,power);
        if(result.tier>=1){const ally=this.heroes().filter(hero=>hero.id!==source.id&&chebyshev(hero,source)<=1)[0];if(ally){this.forcedMoverId=ally.id;this.forcedMoveRange=1;this.forcedMoveReason='Smite';ally.bonusMove=1;}}
        break;
      }
      case'restore':await this.restore(source,this.unit(preview.targets[0])!);break;
      case'sanctuary':
        this.zones=this.zones.filter(zone=>zone.ownerId!==source.id);
        this.zones.push({id:'sanctuary-'+this.round,kind:'sanctuary',cells:preview.cells??[],ownerId:source.id,expiresRound:this.round+1});
        this.log(source.name+' consecrates a Sanctuary.');break;
      case'command':{
        const ally=this.unit(preview.chosenId);if(ally){this.forcedMoverId=ally.id;this.forcedMoveRange=2;this.forcedMoveReason='Command';ally.bonusMove=2;this.log(source.name+' commands '+ally.name+' to move.');}
        break;
      }
    }
    this.busy=false;
    this.checkGameOver();
    this.render();
    if(this.forcedMoverId){this.message(this.unit(this.forcedMoverId)?.name+': choose a free Move '+this.forcedMoveRange+' destination.');}
    else this.afterPlayerDecision(source);
  }

  async singleAttack(source:Unit,target:Unit,power:Power,after?:(tier:0|1|2)=>void,extraDamage=0){
    const ranged=chebyshev(source,target)>1;
    const defense=this.effectiveDefense(target,source,ranged);
    const roll=this.rollPower(source,power.stat??'might',target,defense.value,ranged);
    const damage=(power.damage?.[roll.tier]??0)+extraDamage;
    const targetRect=this.tokenElement(target.id)?.getBoundingClientRect();
    this.log(source.name+' uses '+power.name+' on '+target.name+': '+this.rollText(roll)+(defense.reasons.length?' ['+defense.reasons.join(', ')+']':'')+'.');
    await this.attackAnimation(source,target,ranged);
    await this.dealDamage(source,target,damage,power.name,targetRect);
    after?.(roll.tier);
    return roll;
  }

  async restore(source:Unit,target:Unit){
    const roll=this.rollPower(source,'will',undefined,SUPPORT_DEFENSE,false);
    const healing=[3,5,7][roll.tier];
    const wasDowned=target.downed;
    target.downed=false;target.hp=Math.min(target.maxHp,Math.max(0,target.hp)+healing);
    if(roll.tier>=1){const condition=(Object.keys(target.conditions) as Condition[])[0];if(condition)delete target.conditions[condition];}
    this.log(source.name+' uses Restore on '+target.name+': '+this.rollText(roll)+'. '+healing+' HP restored'+(wasDowned?'; revived':'')+'.');
    this.showFloating(target,'+'+healing,'healing');
  }

  async dealDamage(source:Unit|undefined,target:Unit,amount:number,cause:string,anchor?:DOMRect){
    if(amount<=0||target.hp<=0)return;
    let reduced=amount;
    if(source&&target.team==='player'){
      const cleric=this.heroes().find(hero=>hero.role==='Cleric'&&!hero.reactionUsed&&chebyshev(hero,target)<=3);
      if(cleric){
        cleric.reactionUsed=true;reduced=Math.max(0,reduced-2);
        this.log(cleric.name+' uses Divine Intervention: '+target.name+' takes 2 less damage.');
        this.slideAway(target,source,1);
      }
    }else if(source&&target.team==='enemy'){
      const guardian=this.enemies().find(enemy=>enemy.role==='Guardian'&&enemy.id!==target.id&&!enemy.reactionUsed&&chebyshev(enemy,target)<=1);
      if(guardian){
        guardian.reactionUsed=true;reduced=Math.max(0,reduced-2);
        this.log(guardian.name+' Braces for '+target.name+': 2 damage prevented.');
      }
    }
    target.hp=Math.max(0,target.hp-reduced);
    this.showFloating(target,'−'+reduced,'damage',anchor);
    if(target.hp<=0){
      if(target.team==='player'){
        target.downed=true;target.carriedObjective=false;
        if(this.objective.carrierId===target.id){this.objective.carrierId=undefined;this.objective.rescued=false;this.terrain.push({id:'dropped-captive',kind:'captive',x:target.x,y:target.y});this.log('The captive is dropped.');}
        this.log(target.name+' is Downed.');
      }else{
        this.log(target.name+' is defeated.');
        if(source?.team==='player')this.gainMomentum(1,'defeating '+target.name);
      }
    }else this.log(target.name+' takes '+reduced+' damage from '+cause+' ('+target.hp+'/'+target.maxHp+' HP).');
    this.render();
    await delay(180);
  }

  async directDamage(target:Unit,amount:number,cause:string){
    const anchor=this.tokenElement(target.id)?.getBoundingClientRect();
    target.hp=Math.max(0,target.hp-amount);this.showFloating(target,'−'+amount,'damage',anchor);
    if(target.hp<=0){
      if(target.team==='player'){target.downed=true;this.log(target.name+' is Downed by '+cause+'.');}
      else this.log(target.name+' is defeated by '+cause+'.');
    }else this.log(target.name+' takes '+amount+' '+cause+' damage.');
    this.render();await delay(180);
  }

  pushFrom(source:Point,target:Unit,spaces:number){this.forceMove(target,{x:sign(target.x-source.x),y:sign(target.y-source.y)},spaces,'Push');}
  pullToward(source:Point,target:Unit,spaces:number){this.forceMove(target,{x:sign(source.x-target.x),y:sign(source.y-target.y)},spaces,'Pull');}
  forceTowardPoint(target:Unit,point:Point,spaces:number){this.forceMove(target,{x:sign(point.x-target.x),y:sign(point.y-target.y)},spaces,'Pull');}
  slideAway(target:Unit,source:Point,spaces:number){this.forceMove(target,{x:sign(target.x-source.x),y:sign(target.y-source.y)},spaces,'Slide');}

  forceMove(target:Unit,direction:Point,spaces:number,label:string){
    if(!target||target.hp<=0||(!direction.x&&!direction.y))return;
    for(let step=0;step<spaces;step++){
      const next={x:target.x+direction.x,y:target.y+direction.y};
      if(this.isBlocked(next,target.id)){
        target.hp=Math.max(0,target.hp-2);this.log(label+' slams '+target.name+' into an obstacle for 2 collision damage.');
        this.showFloating(target,'−2','damage');
        if(target.hp<=0){if(target.team==='player'){target.downed=true;this.log(target.name+' is Downed.');}else{this.log(target.name+' is defeated.');this.gainMomentum(1,'a terrain collision');}}
        break;
      }
      target.x=next.x;target.y=next.y;this.triggerTerrain(target);
    }
  }

  triggerTerrain(unit:Unit){
    const hazard=this.terrainAt(unit,'hazard');if(!hazard||unit.hp<=0)return;
    unit.hp=Math.max(0,unit.hp-2);unit.conditions.Burning=99;
    this.log(unit.name+' enters fire: 2 damage and Burning.');
    this.showFloating(unit,'−2','damage');
    if(unit.hp<=0){if(unit.team==='player')unit.downed=true;else this.gainMomentum(1,'hazard defeat');}
  }

  async attackAnimation(source:Unit,target:Unit,ranged:boolean){
    const token=this.tokenElement(source.id);if(!token)return;
    const start=this.tokenTranslation(token),end={x:target.x*CELL+CELL/2,y:target.y*CELL+CELL/2};
    const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy)||1,distance=ranged?2.5:5;
    const lunge={x:start.x+dx/length*distance,y:start.y+dy/length*distance};
    await this.tween(80,t=>token.setAttribute('transform','translate('+(start.x+(lunge.x-start.x)*t)+' '+(start.y+(lunge.y-start.y)*t)+')'));
    await this.tween(90,t=>token.setAttribute('transform','translate('+(lunge.x+(start.x-lunge.x)*t)+' '+(lunge.y+(start.y-lunge.y)*t)+')'));
  }

  afterPlayerDecision(source:Unit){
    this.render();
    if(source.acted&&source.moved){void this.finishActivation();return;}
    if(source.acted)this.message(source.name+' may still Move, or end the activation.');
    else if(source.moved)this.message(source.name+' may now use one Action.');
    else this.message(source.name+': Move and take one Action in either order.');
  }

  async handleCell(x:number,y:number){
    ui.battlefield.dataset.lastInput=x+','+y;
    if(this.busy||this.gameOver||performance.now()<this.gestureSuppressUntil)return;
    const point={x,y};
    if(this.preview&&this.preview.powerId!=='__move__')this.cancelPreview(false);
    if(this.targeting){this.targetCell(point);return;}
    if(this.forcedMoverId){await this.moveForcedUnit(point);return;}
    const source=this.active();
    if(source?.team==='player'&&!source.moved&&!source.conditions.Rooted){
      const route=this.findRoute(source,point,source.id,this.moveAllowance(source));
      if(route.path.length>1){
        this.setPreview({powerId:'__move__',targets:[],point,route:route.path,title:'Move '+route.cost,copy:this.movePreviewCopy(source,route)});
        return;
      }
    }
    const terrain=this.terrainAt(point);
    if(terrain)this.message(this.terrainDescription(terrain.kind));
  }

  movePreviewCopy(source:Unit,route:RouteResult){
    const notes:string[]=[];
    if(route.path.some(point=>this.terrainAt(point,'difficult')))notes.push('difficult ground');
    if(route.path.some(point=>this.terrainAt(point,'hazard')))notes.push('enters fire');
    if(this.engaged(source))notes.push(source.role==='Rogue'?'Slip Away':'disengage +1');
    return route.cost+' / '+this.moveAllowance(source)+' Move'+(notes.length?' · '+notes.join(' · '):'');
  }

  async confirmMove(preview:Preview){
    const source=this.active();if(!source)return;
    const route=preview.route?.length?preview.route:(preview.point?this.findRoute(source,preview.point,source.id,this.moveAllowance(source)).path:[]);
    if(route.length<2){this.message('That movement route is no longer available.');this.render();return;}
    this.busy=true;await this.animateUnitRoute(source,route,true);source.moved=true;this.busy=false;
    this.log(source.name+' moves '+(route.length-1)+' square'+(route.length===2?'':'s')+'.');
    this.cancelTargeting(false);this.checkGameOver();this.render();this.afterPlayerDecision(source);
  }

  async moveForcedUnit(point:Point){
    const mover=this.unit(this.forcedMoverId);if(!mover)return;
    const route=this.findRoute(mover,point,mover.id,this.forcedMoveRange,true,this.forcedMoveReason==='Vanish');
    if(route.path.length<2){this.message('Choose a reachable empty square.');return;}
    this.busy=true;await this.animateUnitRoute(mover,route.path,false);mover.bonusMove=0;this.forcedMoverId=undefined;this.forcedMoveRange=0;
    const source=this.active();this.busy=false;this.render();if(source)this.afterPlayerDecision(source);
  }

  targetCell(point:Point){
    const source=this.active(),targeting=this.targeting;if(!source||!targeting)return;
    const power=powerById(targeting.powerId);if(!power)return;
    const range=this.powerRange(source,power);
    if(power.id==='vanish'){
      const route=this.findRoute(source,point,source.id,range,true,true);
      if(route.path.length<2){this.message('Choose an empty square within 3.');return;}
      this.setPreview({powerId:power.id,targets:[],point,route:route.path,title:power.name,copy:'Spend 2 Momentum · Move '+route.cost+' through units; no reactions.'});return;
    }
    if(power.id==='fireball'||power.id==='sanctuary'){
      if(chebyshev(source,point)>range||!this.hasLineOfSight(source,point)){this.message('That area is out of range or sight.');return;}
      const x=clamp(point.x,0,COLS-2),y=clamp(point.y,0,ROWS-2),cells=[{x,y},{x:x+1,y},{x,y:y+1},{x:x+1,y:y+1}];
      const targets=power.id==='fireball'?this.enemies().filter(enemy=>cells.some(cell=>pointKey(cell)===pointKey(enemy))).map(unit=>unit.id):[];
      this.setPreview({powerId:power.id,targets,point:{x,y},cells,title:power.name,copy:power.id==='fireball'?(targets.length?this.tierPreview(power)+' · '+targets.length+' target'+(targets.length===1?'':'s'):'No enemies in the blast.'):'Spend 3 Momentum · Allies in the zone gain +1 Defense.'});return;
    }
    if(power.id==='vortex'){
      if(chebyshev(source,point)>range||!this.hasLineOfSight(source,point)){this.message('That centre is out of range or sight.');return;}
      const cells:Point[]=[];for(let y=point.y-1;y<=point.y+1;y++)for(let x=point.x-1;x<=point.x+1;x++)if(this.inBounds({x,y}))cells.push({x,y});
      const targets=this.enemies().filter(enemy=>cells.some(cell=>pointKey(cell)===pointKey(enemy))).map(unit=>unit.id);
      this.setPreview({powerId:power.id,targets,point,cells,title:power.name,copy:'Spend 3 Momentum · Pull '+targets.length+' enemies 1 and Daze them.'});return;
    }
    if(power.id==='force-wave'){
      const dx=point.x-source.x,dy=point.y-source.y;
      if(!dx&&!dy)return;
      const direction=Math.abs(dx)>=Math.abs(dy)?{x:sign(dx),y:0}:{x:0,y:sign(dy)};
      const cells:Point[]=[];for(let step=1;step<=range;step++){const cell={x:source.x+direction.x*step,y:source.y+direction.y*step};if(!this.inBounds(cell)||this.isBlockingTerrain(this.terrainAt(cell)))break;cells.push(cell);}
      const targets=this.enemies().filter(enemy=>cells.some(cell=>pointKey(cell)===pointKey(enemy))).map(unit=>unit.id);
      if(!targets.length){this.message('No enemies are in that line.');return;}
      this.setPreview({powerId:power.id,targets,cells,point,title:power.name,copy:this.tierPreview(power)+' · '+targets.length+' target'+(targets.length===1?'':'s')});return;
    }
    if(power.id==='ice-wall'){
      if(chebyshev(source,point)>range||!this.hasLineOfSight(source,point)){this.message('That wall is out of range or sight.');return;}
      const horizontal=Math.abs(point.x-source.x)<=Math.abs(point.y-source.y);
      const cells=[-1,0,1].map(offset=>horizontal?{x:point.x+offset,y:point.y}:{x:point.x,y:point.y+offset}).filter(cell=>this.inBounds(cell)&&!this.unitAt(cell)&&!this.isBlockingTerrain(this.terrainAt(cell)));
      if(cells.length<2){this.message('There is not enough clear space for the wall.');return;}
      this.setPreview({powerId:power.id,targets:[],cells,point,title:power.name,copy:'Create '+cells.length+' blocking wall squares until Lyra’s next activation.'});return;
    }
    if((power.id==='teleport'||power.id==='command')&&targeting.chosenId){
      const ally=this.unit(targeting.chosenId)!;
      const moveRange=power.id==='teleport'?3:2;
      if(chebyshev(ally,point)>moveRange||this.isBlocked(point,ally.id)){this.message('Choose an empty square within '+moveRange+'.');return;}
      this.setPreview({powerId:power.id,targets:[],chosenId:ally.id,point,title:power.name,copy:(power.id==='teleport'?'Teleport ':'Command ')+ally.name+' to this square.'});return;
    }
  }

  handleUnit(id:string){
    if(this.busy||this.gameOver)return;
    const target=this.unit(id);if(!target)return;
    const source=this.active();
    if(this.targeting&&source?.team==='player'){this.targetUnit(source,target);return;}
    if(this.activeTeam==='player'&&target.team==='player'&&!target.activated&&!target.downed&&target.hp>0){this.activateHero(target);return;}
    this.selectedId=id;this.render();
  }

  targetUnit(source:Unit,target:Unit){
    const targeting=this.targeting!,power=powerById(targeting.powerId);if(!power)return;
    const range=this.powerRange(source,power);
    if(power.id==='teleport'||power.id==='command'){
      if(!targeting.chosenId){
        if(target.team!=='player'||target.downed||chebyshev(source,target)>range){this.message('Choose a living ally in range.');return;}
        targeting.chosenId=target.id;this.message('Now choose an empty destination for '+target.name+'.');this.render();return;
      }
    }
    if(power.target==='ally'){
      if(target.team!=='player'||(target.downed&&power.id!=='restore')||chebyshev(source,target)>range){this.message('That ally is not a valid target.');return;}
      this.setPreview({powerId:power.id,targets:[target.id],chosenId:target.id,title:power.name,copy:power.id==='restore'?this.tierPreview(power):power.description});return;
    }
    if(power.target==='enemy'){
      if(target.team!=='enemy'||target.hp<=0||chebyshev(source,target)>range||!this.hasLineOfSight(source,target)){this.message('That enemy is out of range or sight.');return;}
      let route:Point[]|undefined;
      if(power.id==='dashing-strike'&&chebyshev(source,target)>1){
        const approach=this.routeToRange(source,target,1,2,true);if(!approach.path.length){this.message('No Dashing Strike route reaches that enemy.');return;}route=approach.path;
      }
      this.setPreview({powerId:power.id,targets:[target.id],route,title:power.name,copy:this.tierPreview(power)+(power.id==='backstab'&&this.isFlanked(target,'player')?' · FLANKED: +1 roll, +3 damage':'')});return;
    }
  }

  beginInteract(){
    const source=this.active();if(!source||source.acted)return;
    const target=this.interactableNear(source);if(!target)return;
    this.targeting=undefined;source.acted=true;
    if(target.kind==='rune'){
      this.terrain=this.terrain.filter(t=>t.id!==target.id);this.objective.sigils++;this.gainMomentum(1,'interrupting a void sigil');this.log(source.name+' interrupts a void sigil ('+this.objective.sigils+'/2).');
    }else if(target.kind==='captive'){
      this.terrain=this.terrain.filter(t=>t.id!==target.id);this.objective.rescued=true;this.objective.carrierId=source.id;source.carriedObjective=true;this.gainMomentum(1,'rescuing the captive');this.log(source.name+' rescues the captive and begins the escort.');
    }else{
      this.terrain=this.terrain.filter(t=>t.id!==target.id);this.gainMomentum(1,target.kind==='door'?'opening a route':'destroying terrain');this.log(source.name+(target.kind==='door'?' opens the prison door.':' smashes the barricade.'));
    }
    this.checkGameOver();this.render();this.afterPlayerDecision(source);
  }

  interactableNear(source:Unit){return this.terrain.find(t=>['rune','captive','door','destructible'].includes(t.kind)&&chebyshev(source,t)<=1);}

  rally(){
    const source=this.active();if(!source||source.acted)return;
    const target=this.units.find(unit=>unit.team==='player'&&unit.downed&&chebyshev(source,unit)<=1);
    if(!target)return;source.acted=true;target.downed=false;target.hp=3;this.log(source.name+' rallies '+target.name+' back to 3 HP.');this.showFloating(target,'+3','healing');this.render();this.afterPlayerDecision(source);
  }

  terrainDescription(kind:TerrainKind){
    const descriptions:Record<TerrainKind,string>={
      wall:'Wall — blocks movement and line of sight.',cover:'Cover — +1 Defense against ranged attacks.',
      difficult:'Difficult terrain — costs +1 Move.',hazard:'Fire — 2 damage on entry and Burning.',
      high:'High ground — +1 range.',objective:'Ember Shrine — hold after both sigils are broken.',
      exit:'Exit — bring the rescued captive here.',captive:'Captive — an adjacent hero can rescue them.',
      destructible:'Barricade — an adjacent hero can destroy it.',door:'Prison door — an adjacent hero can open it.',
      rune:'Void sigil — an adjacent hero can interrupt it.',icewall:'Ice Wall — blocks movement and sight until Lyra’s next activation.'
    };return descriptions[kind];
  }

  engaged(unit:Unit){return this.units.some(other=>other.team!==unit.team&&other.hp>0&&!other.downed&&chebyshev(other,unit)<=1);}

  neighbors(point:Point){
    const out:Point[]=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const next={x:point.x+dx,y:point.y+dy};if(!this.inBounds(next))continue;
      if(dx&&dy){
        const a={x:point.x+dx,y:point.y},b={x:point.x,y:point.y+dy};
        if(this.isBlockingTerrain(this.terrainAt(a))&&this.isBlockingTerrain(this.terrainAt(b)))continue;
      }
      out.push(next);
    }return out;
  }

  stepCost(unit:Unit,from:Point,to:Point,start:Point,ignoreEngage=false){
    let cost=1;if(this.terrainAt(to,'difficult'))cost++;
    if(!ignoreEngage&&pointKey(from)===pointKey(start)&&this.engaged(unit)&&unit.role!=='Rogue')cost++;
    return cost;
  }

  findRoute(unit:Unit,destination:Point,movingId:string,maxCost=99,ignoreEngage=false,ignoreUnits=false):RouteResult{
    if(this.isBlocked(destination,movingId,ignoreUnits))return{path:[],cost:Infinity};
    const start={x:unit.x,y:unit.y},dist=new Map<string,number>([[pointKey(start),0]]),prev=new Map<string,Point|null>([[pointKey(start),null]]),queue:Point[]=[start];
    while(queue.length){
      queue.sort((a,b)=>(dist.get(pointKey(a))??99)-(dist.get(pointKey(b))??99));const current=queue.shift()!,currentCost=dist.get(pointKey(current))!;
      if(pointKey(current)===pointKey(destination))break;
      for(const next of this.neighbors(current)){
        if(this.isBlocked(next,movingId,ignoreUnits))continue;
        const cost=currentCost+this.stepCost(unit,current,next,start,ignoreEngage);if(cost>maxCost)continue;
        if(cost<(dist.get(pointKey(next))??Infinity)){dist.set(pointKey(next),cost);prev.set(pointKey(next),current);queue.push(next);}
      }
    }
    const total=dist.get(pointKey(destination));if(total===undefined)return{path:[],cost:Infinity};
    const path:Point[]=[];let current:Point|null={...destination};while(current){path.unshift(current);current=prev.get(pointKey(current))??null;}
    return{path,cost:total};
  }

  reachable(unit:Unit,maxCost:number,ignoreEngage=false,ignoreUnits=false){
    const results:RouteResult[]=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const route=this.findRoute(unit,{x,y},unit.id,maxCost,ignoreEngage,ignoreUnits);if(route.path.length)results.push(route);
    }return results;
  }

  routeToRange(unit:Unit,target:Unit,range:number,maxCost:number,ignoreEngage=false){
    let best:RouteResult={path:[],cost:Infinity};
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const point={x,y};if(chebyshev(point,target)>range||this.isBlocked(point,unit.id))continue;
      const route=this.findRoute(unit,point,unit.id,maxCost,ignoreEngage);if(route.path.length&&route.cost<best.cost&&this.hasLineOfSight(point,target))best=route;
    }return best;
  }

  async animateUnitRoute(unit:Unit,path:Point[],trigger:boolean){
    const token=this.tokenElement(unit.id);
    for(const point of path.slice(1)){
      const start=token?this.tokenTranslation(token):{x:unit.x*CELL+CELL/2,y:unit.y*CELL+CELL/2},end={x:point.x*CELL+CELL/2,y:point.y*CELL+CELL/2};
      if(token)await this.tween(115,t=>{const ease=.5-.5*Math.cos(Math.PI*t);token.setAttribute('transform','translate('+(start.x+(end.x-start.x)*ease)+' '+(start.y+(end.y-start.y)*ease)+')');});
      unit.x=point.x;unit.y=point.y;if(trigger)this.triggerTerrain(unit);
      if(unit.hp<=0)break;
    }
  }

  tween(ms:number,update:(t:number)=>void){return new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-start)/ms);update(t);if(t<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});}
  tokenTranslation(element:SVGGElement){const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(element.getAttribute('transform')||'');return{x:match?Number(match[1]):0,y:match?Number(match[2]):0};}
  tokenElement(id:string){return this.tokenLayer?.querySelector<SVGGElement>('.unit-token[data-id="'+id+'"]');}

  async runEnemyActivation(){
    if(this.gameOver)return;
    const enemy=this.chooseEnemy();if(!enemy){if(!this.hasReady('player'))await this.beginRound();return;}
    this.activeId=enemy.id;this.selectedId=enemy.id;enemy.moved=false;enemy.acted=false;this.removeStartEffects(enemy);
    this.log(enemy.name+' activates.');this.render();await delay(350);
    this.busy=true;
    const target=this.chooseHeroTarget(enemy);
    if(!target){this.busy=false;await this.completeEnemyActivation(enemy);return;}
    if(enemy.role==='Archer'&&this.heroes().some(hero=>chebyshev(enemy,hero)<=2))await this.enemyReposition(enemy,target,true);
    if(enemy.role==='Controller'){
      const hazardNear=this.terrain.some(t=>t.kind==='hazard'&&chebyshev(t,target)<=1);
      if(!hazardNear&&chebyshev(enemy,target)<=3&&this.hasLineOfSight(enemy,target)){
        const cell=this.neighbors(target).filter(p=>!this.terrainAt(p)&&!this.unitAt(p)).sort((a,b)=>chebyshev(a,enemy)-chebyshev(b,enemy))[0];
        if(cell){this.terrain.push({id:'cult-fire-'+this.round+'-'+enemy.id,kind:'hazard',...cell,ownerId:enemy.id});enemy.acted=true;this.log(enemy.name+' conjures a burning hazard beside '+target.name+'.');this.render();await delay(420);}
      }
    }
    if(!enemy.acted&&!this.canEnemyAttack(enemy,target)){
      const attack=ENEMY_ATTACKS[enemy.role as EnemyRole],route=this.routeToRange(enemy,target,attack.range,this.moveAllowance(enemy));
      if(route.path.length>1){await this.animateUnitRoute(enemy,route.path,true);enemy.moved=true;this.render();await delay(260);}
    }
    let actualTarget=target;
    if(!enemy.acted&&this.canEnemyAttack(enemy,target)){
      actualTarget=this.maybeIntercept(enemy,target);if(actualTarget.id!==target.id){this.render();await delay(360);}
      await this.enemyAttack(enemy,actualTarget);enemy.acted=true;
    }
    if(enemy.role==='Skirmisher'&&enemy.acted&&enemy.hp>0)await this.enemySlide(enemy,actualTarget);
    if(!enemy.moved&&enemy.hp>0)await this.enemyReposition(enemy,actualTarget,enemy.role==='Archer');
    this.busy=false;this.render();await delay(300);await this.completeEnemyActivation(enemy);
  }

  chooseEnemy(){
    const ready=this.ready('enemy');
    const priority:EnemyRole[]=['Controller','Skirmisher','Brute','Guardian','Archer'];
    return ready.sort((a,b)=>priority.indexOf(a.role as EnemyRole)-priority.indexOf(b.role as EnemyRole))[0];
  }

  chooseHeroTarget(enemy:Unit){
    const heroes=this.heroes();if(!heroes.length)return undefined;
    return heroes.sort((a,b)=>{
      if(enemy.role==='Skirmisher'){const isolatedDelta=Number(this.isolated(b))-Number(this.isolated(a));if(isolatedDelta)return isolatedDelta;}
      if(enemy.role==='Archer'||enemy.role==='Controller'){const hpDelta=a.hp-b.hp;if(hpDelta)return hpDelta;}
      return chebyshev(enemy,a)-chebyshev(enemy,b);
    })[0];
  }

  canEnemyAttack(enemy:Unit,target:Unit){
    const attack=ENEMY_ATTACKS[enemy.role as EnemyRole];
    return chebyshev(enemy,target)<=attack.range+(this.isHigh(enemy)&&attack.range>1?1:0)&&this.hasLineOfSight(enemy,target);
  }

  maybeIntercept(enemy:Unit,target:Unit){
    if(chebyshev(enemy,target)>1)return target;
    const fighter=this.heroes().find(hero=>hero.role==='Fighter'&&!hero.reactionUsed&&hero.id!==target.id&&chebyshev(hero,target)<=2);
    if(!fighter)return target;
    const destinations=this.neighbors(enemy).filter(point=>!this.isBlocked(point,fighter.id)).sort((a,b)=>chebyshev(a,fighter)-chebyshev(b,fighter));
    const destination=destinations[0];if(!destination||chebyshev(fighter,destination)>1)return target;
    fighter.x=destination.x;fighter.y=destination.y;fighter.reactionUsed=true;
    this.log(fighter.name+' Intercepts, stepping in front of '+target.name+'.');return fighter;
  }

  async enemyAttack(enemy:Unit,target:Unit){
    const attack=ENEMY_ATTACKS[enemy.role as EnemyRole],ranged=attack.range>1;
    const defense=this.effectiveDefense(target,enemy,ranged),roll=this.rollPower(enemy,attack.stat,target,defense.value,ranged);
    let damage=attack.damage[roll.tier];
    if(enemy.role==='Archer'&&!this.heroes().some(hero=>chebyshev(enemy,hero)<=2))damage+=2;
    const anchor=this.tokenElement(target.id)?.getBoundingClientRect();
    this.log(enemy.name+' uses '+attack.name+' on '+target.name+': '+this.rollText(roll)+(defense.reasons.length?' ['+defense.reasons.join(', ')+']':'')+'.');
    await this.attackAnimation(enemy,target,ranged);await this.dealDamage(enemy,target,damage,attack.name,anchor);
    if(target.hp<=0)return;
    if(enemy.role==='Brute')this.pushFrom(enemy,target,roll.tier===2?2:1);
    if(enemy.role==='Controller'){
      const hazard=this.terrain.filter(t=>t.kind==='hazard').sort((a,b)=>chebyshev(a,target)-chebyshev(b,target))[0];
      if(hazard)this.forceTowardPoint(target,hazard,1);else this.pullToward(enemy,target,1);
      if(roll.tier===2&&target.hp>0){target.conditions.Slowed=1;this.log(target.name+' is Slowed by the Shadow Hook.');}
    }
    if(enemy.role==='Guardian'&&roll.tier===2&&target.hp>0){target.conditions.Rooted=1;this.log(target.name+' is Rooted by the Grave Pike.');}
  }

  async enemySlide(enemy:Unit,target:Unit){
    const options=this.neighbors(enemy).filter(p=>!this.isBlocked(p,enemy.id)).sort((a,b)=>chebyshev(b,target)-chebyshev(a,target));
    if(!options[0])return;await this.animateUnitRoute(enemy,[{x:enemy.x,y:enemy.y},options[0]],true);this.log(enemy.name+' Slides 1 after attacking.');this.render();await delay(180);
  }

  async enemyReposition(enemy:Unit,target:Unit,retreat=false){
    if(enemy.moved||enemy.conditions.Rooted)return;
    const reachable=this.reachable(enemy,this.moveAllowance(enemy));
    if(!reachable.length)return;
    const role=enemy.role;
    reachable.sort((a,b)=>{
      const pa=a.path.at(-1)!,pb=b.path.at(-1)!;
      if(role==='Guardian'){
        const allies=this.enemies().filter(unit=>unit.id!==enemy.id);
        const da=Math.min(...allies.map(unit=>chebyshev(pa,unit)),9),db=Math.min(...allies.map(unit=>chebyshev(pb,unit)),9);return da-db;
      }
      if(retreat||role==='Archer')return chebyshev(pb,target)-chebyshev(pa,target);
      return chebyshev(pa,target)-chebyshev(pb,target);
    });
    const route=reachable[0];if(route.path.length>1){await this.animateUnitRoute(enemy,route.path,true);enemy.moved=true;this.render();await delay(180);}
  }

  render(){
    if(ui.shell.hidden)return;
    ui.battlefield.innerHTML='';
    const board=svg('svg',{class:'game-board',viewBox:'0 0 '+(COLS*CELL)+' '+(ROWS*CELL),preserveAspectRatio:'xMidYMin meet','data-scenario':this.scenario.id,'aria-label':'6 by 8 battlefield'});
    const world=svg('g',{class:'world'}),tiles=svg('g',{class:'tiles'}),terrain=svg('g',{class:'terrain-layer'}),zones=svg('g',{class:'zones'}),highlights=svg('g',{class:'highlights'}),routes=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});
    world.append(tiles,terrain,zones,highlights,routes,tokens);board.appendChild(world);ui.battlefield.appendChild(board);
    this.svg=board;this.world=world;this.routeLayer=routes;this.tokenLayer=tokens;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const cell=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:'tile','data-x':x,'data-y':y});
      tiles.appendChild(cell);
    }
    for(const item of this.terrain){
      const group=svg('g',{class:'terrain-cell terrain-'+item.kind,transform:'translate('+(item.x*CELL)+' '+(item.y*CELL)+')','data-kind':item.kind,'data-id':item.id,'data-x':item.x,'data-y':item.y});
      group.appendChild(svg('rect',{width:CELL,height:CELL}));terrain.appendChild(group);
    }
    for(const zone of this.zones)for(const cell of zone.cells){
      const element=svg('rect',{class:'zone sanctuary-zone',x:cell.x*CELL,y:cell.y*CELL,width:CELL,height:CELL,'data-kind':zone.kind});zones.appendChild(element);
    }
    this.paintHighlights(highlights);
    for(const unit of this.combatants())tokens.appendChild(this.makeToken(unit));
    if(this.preview?.route)this.drawRoute(this.preview.route);
    this.applyCamera();this.syncUI();this.layout();this.bindGestures();
  }

  paintHighlights(layer:SVGGElement){
    const add=(point:Point,className:string)=>layer.appendChild(svg('rect',{x:point.x*CELL+1,y:point.y*CELL+1,width:CELL-2,height:CELL-2,rx:2,class:className}));
    if(this.preview?.cells)this.preview.cells.forEach(point=>add(point,'area-preview'));
    if(this.preview?.targets)for(const id of this.preview.targets){const unit=this.unit(id);if(unit)add(unit,'target-preview');}
    if(this.forcedMoverId){
      const mover=this.unit(this.forcedMoverId);if(mover)this.reachable(mover,this.forcedMoveRange,true).forEach(route=>add(route.path.at(-1)!,'free-move-range'));return;
    }
    const source=this.active();
    if(this.targeting&&source?.team==='player'){
      const power=powerById(this.targeting.powerId),range=this.powerRange(source,power);
      if(this.targeting.chosenId){
        const ally=this.unit(this.targeting.chosenId);if(ally)this.reachable(ally,power.id==='command'?2:3,true).forEach(route=>add(route.path.at(-1)!,'ally-range'));
      }else if(['fireball','force-wave','ice-wall','vortex','sanctuary','vanish'].includes(power.id)){
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(chebyshev(source,{x,y})<=range)add({x,y},power.id==='vanish'?'free-move-range':'power-range');
      }else if(power.target==='ally'){
        this.units.filter(unit=>unit.team==='player'&&chebyshev(source,unit)<=range&&(power.id==='restore'||!unit.downed)).forEach(unit=>add(unit,'ally-target'));
      }else this.enemies().filter(enemy=>chebyshev(source,enemy)<=range&&this.hasLineOfSight(source,enemy)).forEach(enemy=>add(enemy,'enemy-target'));
      return;
    }
    if(source?.team==='player'&&!source.moved&&!source.conditions.Rooted)this.reachable(source,this.moveAllowance(source)).forEach(route=>{const point=route.path.at(-1)!;if(pointKey(point)!==pointKey(source))add(point,'move-range');});
    const selected=this.selected();if(selected?.team==='enemy'&&(!source||selected.id!==source.id)){
      this.reachable(selected,this.moveAllowance(selected)).forEach(route=>add(route.path.at(-1)!,'enemy-move-range'));
      const range=ENEMY_ATTACKS[selected.role as EnemyRole]?.range??1;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(chebyshev(selected,{x,y})<=range)add({x,y},'enemy-threat');
    }
  }

  makeToken(unit:Unit){
    const className=['unit-token',unit.team,unit.id===this.activeId?'active':'',unit.id===this.selectedId?'selected':'',unit.activated?'spent':'',unit.downed?'downed':'',unit.elite?'elite':''].filter(Boolean).join(' ');
    const group=svg('g',{class:className,transform:'translate('+(unit.x*CELL+CELL/2)+' '+(unit.y*CELL+CELL/2)+')','data-id':unit.id,'data-art':unit.art,'data-hp':unit.hp,'data-max-hp':unit.maxHp,'data-role':unit.role,'data-reaction-used':unit.reactionUsed?'1':'0','data-carrier':unit.carriedObjective?'1':'0'});
    group.appendChild(svg('rect',{x:-8,y:-8,width:16,height:16,class:'token-hitbox'}));
    for(const condition of Object.keys(unit.conditions))group.appendChild(svg('g',{class:'status-marker status-'+condition.toLowerCase(),'data-status':condition}));
    group.addEventListener('pointerup',event=>{event.stopPropagation();if(this.drag?.id===unit.id||this.gestureActive||performance.now()<this.gestureSuppressUntil)return;this.handleUnit(unit.id);});
    if(unit.team==='player')group.addEventListener('pointerdown',event=>this.beginDrag(event,unit,group));
    return group;
  }

  renderHotbar(){
    ui.hotbar.innerHTML='';const source=this.active();
    if(!source||source.team!=='player'||this.gameOver){
      const prompt=document.createElement('div');prompt.className='hotbar-prompt';prompt.textContent=this.activeTeam==='player'?'Tap a glowing hero to activate':'Enemy activation';ui.hotbar.appendChild(prompt);return;
    }
    const add=(id:string,label:string,disabled=false,selected=false,meta='')=>{
      const button=document.createElement('button');button.type='button';button.className='hotbar-action'+(selected?' selected':'');button.disabled=disabled;button.dataset.action=id;
      button.innerHTML='<span class="hotbar-icon">'+(ICONS[id]??'•')+'</span><b>'+label+'</b>'+(meta?'<small>'+meta+'</small>':'');
      button.addEventListener('click',()=>{
        if(id==='interact')this.beginInteract();else if(id==='rally')this.rally();else if(id==='end')void this.finishActivation();else this.beginPower(id);
      });ui.hotbar.appendChild(button);
    };
    for(const id of source.powers){
      const power=POWERS[id],cost=power.momentum?'◆'+power.momentum:'ACTION';
      add(id,power.name,source.acted||Boolean(power.momentum&&this.momentum<power.momentum),this.targeting?.powerId===id,cost);
    }
    if(this.interactableNear(source))add('interact','Interact',source.acted,false,'ACTION');
    if(this.units.some(unit=>unit.team==='player'&&unit.downed&&chebyshev(source,unit)<=1))add('rally','Rally',source.acted,false,'ACTION');
    add('end','End',false,false,(source.moved?'M✓':'MOVE')+' · '+(source.acted?'A✓':'ACT'));
  }

  syncUI(){
    ui.round.textContent=String(this.round);ui.railRound.textContent=String(this.round);
    ui.side.textContent=this.activeTeam==='player'?(this.activeId?'HERO ACTIVE':'CHOOSE HERO'):'ENEMY ACTIVATION';
    ui.objectiveKicker.textContent=this.scenario.kicker;ui.objectiveLabel.textContent=this.objectiveProgress();
    this.renderMomentum();ui.undo.disabled=!this.snapshot||this.busy||this.activeTeam!=='player';
    const selected=this.selected()??this.active()??this.units[0];if(selected)this.syncDrawer(selected);
    this.renderRail();this.renderHotbar();
  }

  objectiveProgress(){
    if(this.scenario.id==='ember-shrine')return'Sigils '+this.objective.sigils+'/2 · Hold '+this.objective.hold+'/2';
    if(this.scenario.id==='rescue-run')return this.objective.rescued?'Escort captive to exit':'Rescue the captive';
    const chief=this.units.find(unit=>unit.name==='Orc War Chief');return chief&&chief.hp>0?'War Chief '+chief.hp+'/'+chief.maxHp+' HP':'War Chief defeated';
  }

  renderMomentum(){
    ui.momentum.innerHTML='';for(let index=0;index<MAX_MOMENTUM;index++){const pip=document.createElement('i');pip.className=index<this.momentum?'filled':'';ui.momentum.appendChild(pip);}
  }

  showMomentumPulse(){ui.momentum.classList.remove('pulse');requestAnimationFrame(()=>ui.momentum.classList.add('pulse'));}

  syncDrawer(unit:Unit){
    ui.drawer.dataset.team=unit.team;ui.selectedTeam.textContent=unit.team==='player'?'Hero':'Enemy';ui.selectedName.textContent=unit.name;
    ui.selectedClass.textContent=unit.role+(unit.elite?' · Elite':'');ui.portrait.className='portrait '+this.spriteClass(unit.art);ui.portrait.dataset.id=unit.id;
    ui.health.textContent=(unit.downed?'DOWNED · ':'')+unit.hp+' / '+unit.maxHp;ui.defense.textContent=String(this.effectiveDefense(unit).value);
    ui.movement.textContent=String(this.moveAllowance(unit));ui.might.textContent=signed(unit.might);ui.agility.textContent=signed(unit.agility);ui.will.textContent=signed(unit.will);
    ui.passive.textContent=unit.passive;ui.reactionRow.hidden=!unit.reaction;ui.reaction.textContent=unit.reaction??'—';
    ui.statusChips.innerHTML='';
    for(const condition of Object.keys(unit.conditions) as Condition[]){const chip=document.createElement('span');chip.textContent=condition;chip.title=CONDITIONS[condition];ui.statusChips.appendChild(chip);}
    if(unit.activated){const chip=document.createElement('span');chip.textContent='Spent';ui.statusChips.appendChild(chip);}
    if(unit.carriedObjective){const chip=document.createElement('span');chip.textContent='Escort';ui.statusChips.appendChild(chip);}
    ui.powerList.innerHTML='';
    if(unit.team==='player')for(const id of unit.powers){const power=POWERS[id],row=document.createElement('article');row.innerHTML='<b>'+power.name+(power.momentum?' · ◆'+power.momentum:'')+'</b><p>'+power.description+'</p>';ui.powerList.appendChild(row);}
    else{const attack=ENEMY_ATTACKS[unit.role as EnemyRole],row=document.createElement('article');row.innerHTML='<b>'+attack.name+' · Range '+attack.range+'</b><p>'+attack.damage.join(' / ')+' damage · '+attack.effect+'</p>';ui.powerList.appendChild(row);}
  }

  renderRail(){
    ui.rail.innerHTML='';
    for(const unit of this.units.filter(unit=>unit.hp>0||unit.downed)){
      const button=document.createElement('button');button.type='button';
      button.className='initiative-token '+unit.team+(unit.id===this.activeId?' active':'')+(unit.id===this.selectedId?' selected':'')+(unit.activated?' spent':'')+(unit.downed?' downed':'');
      button.dataset.id=unit.id;button.setAttribute('aria-label',unit.name+(unit.activated?', activated':', ready'));
      button.innerHTML='<span class="rail-sprite '+this.spriteClass(unit.art)+'"></span><i></i><small>'+(unit.downed?'DOWN':unit.activated?'SPENT':'READY')+'</small>';
      button.addEventListener('click',()=>this.handleUnit(unit.id));ui.rail.appendChild(button);
    }
  }

  spriteClass(art:string){return'sprite-'+art.replaceAll('-','');}

  showObjective(){this.message(this.scenario.objective+' Failure: '+this.scenario.failure);}
  toggleUtility(){const open=ui.utilityPanel.hidden;ui.utilityPanel.hidden=!open;ui.utilityToggle.setAttribute('aria-expanded',String(open));ui.utilityToggle.classList.toggle('open',open);}
  toggleRail(){this.railOpen=!this.railOpen;ui.railDrawer.classList.toggle('open',this.railOpen);ui.railDrawer.setAttribute('aria-hidden',String(!this.railOpen));ui.railToggle.setAttribute('aria-expanded',String(this.railOpen));ui.railToggle.classList.toggle('open',this.railOpen);}
  toggleDrawer(){const open=!ui.drawer.classList.contains('open');ui.drawer.classList.toggle('open',open);ui.statsToggle.setAttribute('aria-expanded',String(open));}
  closeDrawer(){ui.drawer.classList.remove('open');ui.statsToggle.setAttribute('aria-expanded','false');}
  showHelp(open:boolean){ui.help.hidden=!open;}
  toggleLog(){const open=ui.logPanel.hidden;ui.logPanel.hidden=!open;ui.logToggle.setAttribute('aria-expanded',String(open));this.renderLog();}
  closeLog(){ui.logPanel.hidden=true;ui.logToggle.setAttribute('aria-expanded','false');}
  log(text:string){this.logEntries.push({round:this.round,text});this.renderLog();}
  renderLog(){ui.logList.innerHTML='';for(const entry of this.logEntries){const row=document.createElement('div');row.className='log-entry';row.innerHTML='<b>R'+entry.round+'</b><span>'+entry.text+'</span>';ui.logList.appendChild(row);}ui.logList.scrollTop=ui.logList.scrollHeight;}
  message(text:string){ui.instruction.textContent=text;ui.instruction.classList.remove('flash');requestAnimationFrame(()=>ui.instruction.classList.add('flash'));}

  showFloating(unit:Unit,text:string,kind:'damage'|'healing'|'tier'|'status',anchor?:DOMRect){
    requestAnimationFrame(()=>{const rect=anchor??this.tokenElement(unit.id)?.getBoundingClientRect();if(!rect)return;const viewport=ui.viewport.getBoundingClientRect(),element=document.createElement('span');element.className='combat-float '+kind;element.textContent=text;element.style.left=rect.left-viewport.left+rect.width/2+'px';element.style.top=rect.top-viewport.top+'px';ui.viewport.appendChild(element);window.setTimeout(()=>element.remove(),1000);});
  }

  drawRoute(path:Point[],enemy=false){
    if(!this.routeLayer||path.length<2)return;this.routeLayer.innerHTML='';
    const centres=path.map(point=>({x:point.x*CELL+CELL/2,y:point.y*CELL+CELL/2})),last=centres.at(-1)!,before=centres.at(-2)!;
    const dx=last.x-before.x,dy=last.y-before.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,base={x:last.x-ux*3,y:last.y-uy*3},perp={x:-uy,y:ux};
    const line=svg('polyline',{points:centres.map(p=>p.x+','+p.y).join(' '),class:'route-line '+(enemy?'enemy':''),fill:'none'});
    const head=svg('polygon',{points:(last.x+ux*3)+','+(last.y+uy*3)+' '+(base.x+perp.x*4)+','+(base.y+perp.y*4)+' '+(base.x-perp.x*4)+','+(base.y-perp.y*4),class:'route-head '+(enemy?'enemy':'')});
    this.routeLayer.append(line,head);
  }

  layout(){
    const viewport=ui.viewport.getBoundingClientRect(),header=document.querySelector<HTMLElement>('.battle-header')!,hotbar=ui.hotbar.getBoundingClientRect();
    const available=Math.max(300,viewport.height-Math.max(94,hotbar.height));
    const width=Math.min(viewport.width,available*(COLS/ROWS));ui.frame.style.width=width+'px';ui.frame.style.height=width*(ROWS/COLS)+'px';
    header.style.setProperty('--board-width',width+'px');
  }

  resetCamera(){this.scale=1;this.tx=0;this.ty=0;this.cameraDirty=false;this.applyCamera();ui.zoomReset.disabled=true;}
  applyCamera(){this.world?.setAttribute('transform','translate('+this.tx+' '+this.ty+') scale('+this.scale+')');}
  rootPoint(clientX:number,clientY:number){
    if(!this.svg)return{x:0,y:0};const point=this.svg.createSVGPoint();point.x=clientX;point.y=clientY;const matrix=this.svg.getScreenCTM();if(!matrix)return{x:0,y:0};const transformed=point.matrixTransform(matrix.inverse());return{x:transformed.x,y:transformed.y};
  }
  worldPoint(clientX:number,clientY:number){
    if(!this.world)return{x:0,y:0};const point=this.svg!.createSVGPoint();point.x=clientX;point.y=clientY;const matrix=this.world.getScreenCTM();if(!matrix)return{x:0,y:0};const transformed=point.matrixTransform(matrix.inverse());return{x:transformed.x,y:transformed.y};
  }

  bindGestures(){
    const board=this.svg;if(!board)return;
    board.onclick=event=>{
      if(this.gestureActive||performance.now()<this.gestureSuppressUntil||(event.target as Element).closest('.unit-token'))return;
      const point=this.worldPoint(event.clientX,event.clientY);
      void this.handleCell(Math.floor(point.x/CELL),Math.floor(point.y/CELL));
    };
    board.onpointerdown=event=>{
      if((event.target as Element).closest('.unit-token'))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      try{board.setPointerCapture(event.pointerId);}catch{}
      if(this.pointers.size===2){this.gestureActive=true;this.gestureSuppressUntil=performance.now()+450;const points=[...this.pointers.values()],mid={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2},root=this.rootPoint(mid.x,mid.y);this.gesture={distance:Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y),scale:this.scale,anchor:{x:(root.x-this.tx)/this.scale,y:(root.y-this.ty)/this.scale},mid,mode:'wait'};}
    };
    board.onpointermove=event=>{
      if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(this.pointers.size<2||!this.gesture)return;
      const points=[...this.pointers.values()],midClient={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2},mid=this.rootPoint(midClient.x,midClient.y),distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y),ratio=distance/Math.max(1,this.gesture.distance),travel=Math.hypot(midClient.x-this.gesture.mid.x,midClient.y-this.gesture.mid.y);
      if(this.gesture.mode==='wait'){if(Math.abs(Math.log(ratio))>.045)this.gesture.mode='zoom';else if(travel>8)this.gesture.mode='pan';else return;}
      if(this.gesture.mode==='zoom'){this.scale=clamp(this.gesture.scale*ratio,1,2.5);this.tx=mid.x-this.gesture.anchor.x*this.scale;this.ty=mid.y-this.gesture.anchor.y*this.scale;}
      else{this.tx+=midClient.x-this.gesture.mid.x;this.ty+=midClient.y-this.gesture.mid.y;this.gesture.mid=midClient;}
      this.clampCamera();this.cameraDirty=true;ui.zoomReset.disabled=false;this.applyCamera();
    };
    const end=(event:PointerEvent)=>{const wasGesture=this.gestureActive||Boolean(this.gesture);this.pointers.delete(event.pointerId);if(this.pointers.size<2){this.gesture=undefined;this.gestureActive=false;if(wasGesture)this.gestureSuppressUntil=performance.now()+350;}};
    board.onpointerup=end;board.onpointercancel=end;
  }

  clampCamera(){
    const width=COLS*CELL,height=ROWS*CELL,visibleHeight=ROWS*CELL;
    this.tx=width*this.scale<=width?(width-width*this.scale)/2:clamp(this.tx,width-width*this.scale,0);
    this.ty=height*this.scale<=visibleHeight?(visibleHeight-height*this.scale)/2:clamp(this.ty,visibleHeight-height*this.scale,0);
  }

  beginDrag(event:PointerEvent,unit:Unit,token:SVGGElement){
    if(!this.isActiveHero(unit)||unit.moved||unit.conditions.Rooted||this.targeting||this.busy||this.gestureActive)return;
    event.preventDefault();event.stopPropagation();token.setPointerCapture(event.pointerId);
    const ghost=token.cloneNode(true) as SVGGElement;ghost.classList.add('drag-ghost');ghost.style.pointerEvents='none';this.tokenLayer?.appendChild(ghost);
    this.drag={id:unit.id,pointerId:event.pointerId,ghost};
    const move=(pointer:PointerEvent)=>{
      if(!this.drag||pointer.pointerId!==this.drag.pointerId)return;const world=this.worldPoint(pointer.clientX,pointer.clientY);ghost.setAttribute('transform','translate('+world.x+' '+world.y+')');
      const destination={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)},route=this.findRoute(unit,destination,unit.id,this.moveAllowance(unit));this.routeLayer!.innerHTML='';if(route.path.length)this.drawRoute(route.path);
    };
    const finish=(pointer:PointerEvent)=>{
      token.removeEventListener('pointermove',move);token.removeEventListener('pointerup',finish);token.removeEventListener('pointercancel',cancel);ghost.remove();this.drag=undefined;
      const world=this.worldPoint(pointer.clientX,pointer.clientY),destination={x:Math.floor(world.x/CELL),y:Math.floor(world.y/CELL)},route=this.findRoute(unit,destination,unit.id,this.moveAllowance(unit));
      if(route.path.length>1)this.setPreview({powerId:'__move__',targets:[],point:destination,route:route.path,title:'Move '+route.cost,copy:this.movePreviewCopy(unit,route)});else this.render();
    };
    const cancel=()=>{token.removeEventListener('pointermove',move);token.removeEventListener('pointerup',finish);token.removeEventListener('pointercancel',cancel);ghost.remove();this.drag=undefined;this.render();};
    token.addEventListener('pointermove',move);token.addEventListener('pointerup',finish);token.addEventListener('pointercancel',cancel);
  }

  debugState(){return{scenario:this.scenario.id,round:this.round,activeTeam:this.activeTeam,activeId:this.activeId,momentum:this.momentum,objective:{...this.objective},gameOver:this.gameOver,units:this.units.map(unit=>({id:unit.id,name:unit.name,role:unit.role,team:unit.team,x:unit.x,y:unit.y,hp:unit.hp,activated:unit.activated,downed:unit.downed,moved:unit.moved,acted:unit.acted,conditions:{...unit.conditions}}))};}
}

new Game();
