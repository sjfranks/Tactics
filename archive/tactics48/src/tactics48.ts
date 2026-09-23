export type Team='player'|'enemy';
export type Point={x:number;y:number};
export type Stat='might'|'agility'|'will';
export type Condition='Dazed'|'Exposed'|'Rooted'|'Slowed'|'Burning'|'Guarded';
export type HeroRole='Fighter'|'Rogue'|'Wizard'|'Cleric';
export type EnemyRole='Skirmisher'|'Brute'|'Controller'|'Guardian'|'Archer';
export type Role=HeroRole|EnemyRole;
export type TargetKind='enemy'|'ally'|'cell'|'self'|'adjacent-enemies'|'area';
export type TerrainKind='wall'|'cover'|'difficult'|'hazard'|'high'|'objective'|'exit'|'captive'|'destructible'|'door'|'rune'|'icewall';
export type ScenarioId='broken-gate'|'ember-shrine'|'rescue-run';

export type TierValues=[number,number,number];

export interface Power {
  id:string;
  name:string;
  owner:HeroRole;
  stat?:Stat;
  target:TargetKind;
  range:number;
  damage?:TierValues;
  momentum?:number;
  reaction?:boolean;
  passive?:boolean;
  description:string;
  tierText?:[string,string,string];
}

export interface UnitTemplate {
  key:string;
  name:string;
  role:Role;
  team:Team;
  art:string;
  hp:number;
  defense:number;
  move:number;
  might:number;
  agility:number;
  will:number;
  powers:string[];
  passive:string;
  reaction?:string;
  range?:number;
}

export interface Unit extends UnitTemplate,Point {
  id:string;
  maxHp:number;
  activated:boolean;
  moved:boolean;
  acted:boolean;
  reactionUsed:boolean;
  downed:boolean;
  conditions:Partial<Record<Condition,number>>;
  bonusMove:number;
  carriedObjective:boolean;
  elite?:boolean;
}

export interface Terrain extends Point {
  id:string;
  kind:TerrainKind;
  hp?:number;
  ownerId?:string;
  expiresRound?:number;
}

export interface Scenario {
  id:ScenarioId;
  name:string;
  kicker:string;
  objective:string;
  objectiveShort:string;
  failure:string;
  roundLimit:number;
  background:string;
  heroSpawns:Point[];
  enemySpawns:Point[];
  terrain:Array<Omit<Terrain,'id'>>;
}

export const CONDITIONS:Record<Condition,string>={
  Dazed:'−1 to the next power roll.',
  Exposed:'−1 Defense until the end of the next activation.',
  Rooted:'Cannot move voluntarily until the end of the next activation.',
  Slowed:'Move is reduced by 1 until the end of the next activation.',
  Burning:'Take 2 damage after each activation until removed.',
  Guarded:'+1 Defense until the start of the next activation.'
};

export const POWERS:Record<string,Power>={
  'heavy-strike':{id:'heavy-strike',name:'Heavy Strike',owner:'Fighter',stat:'might',target:'enemy',range:1,damage:[3,5,8],description:'A dependable blow. A strong hit also Pushes 1.',tierText:['3 damage','5 damage','8 damage · Push 1']},
  'shield-bash':{id:'shield-bash',name:'Shield Bash',owner:'Fighter',stat:'might',target:'enemy',range:1,damage:[2,4,6],description:'Drive a foe out of position and become Guarded.',tierText:['2 damage · Push 1','4 damage · Push 1','6 damage · Push 2']},
  'come-and-get-me':{id:'come-and-get-me',name:'Come & Get Me',owner:'Fighter',target:'area',range:2,description:'Pull every enemy within 2 one square closer; become Guarded.'},
  cleave:{id:'cleave',name:'Cleave',owner:'Fighter',stat:'might',target:'adjacent-enemies',range:1,damage:[2,4,6],description:'Attack up to two adjacent enemies with one action.',tierText:['2 damage','4 damage','6 damage']},
  whirlwind:{id:'whirlwind',name:'Whirlwind',owner:'Fighter',stat:'might',target:'adjacent-enemies',range:1,damage:[3,5,7],momentum:4,description:'Heroic: attack every adjacent enemy, then hurl each away.',tierText:['3 damage · Push 1','5 damage · Push 1','7 damage · Push 2']},
  intercept:{id:'intercept',name:'Intercept',owner:'Fighter',target:'ally',range:2,reaction:true,description:'When an enemy closes on a nearby ally, step in and become its target.'},
  sticky:{id:'sticky',name:'Sticky',owner:'Fighter',target:'self',range:0,passive:true,description:'Enemies pay +1 movement to leave your reach.'},

  backstab:{id:'backstab',name:'Backstab',owner:'Rogue',stat:'agility',target:'enemy',range:1,damage:[2,4,6],description:'Deal +3 damage against a Flanked enemy.',tierText:['2 damage','4 damage','6 damage']},
  'dashing-strike':{id:'dashing-strike',name:'Dashing Strike',owner:'Rogue',stat:'agility',target:'enemy',range:3,damage:[2,4,6],description:'Move up to 2, strike, then gain a free Move 1.',tierText:['2 damage','4 damage','6 damage · Exposed']},
  swap:{id:'swap',name:'Swap',owner:'Rogue',target:'ally',range:1,description:'Exchange places with an adjacent ally; both become Guarded.'},
  vanish:{id:'vanish',name:'Vanish',owner:'Rogue',target:'cell',range:3,momentum:2,description:'Heroic: move through enemies up to 3 and ignore engagement.'},
  'slip-away':{id:'slip-away',name:'Slip Away',owner:'Rogue',target:'self',range:0,passive:true,description:'Ignore the +1 movement cost for leaving engagement.'},

  fireball:{id:'fireball',name:'Fireball',owner:'Wizard',stat:'will',target:'area',range:5,damage:[2,4,6],description:'Blast a 2×2 area. Strong hits inflict Burning.',tierText:['2 damage','4 damage','6 damage · Burning']},
  'force-wave':{id:'force-wave',name:'Force Wave',owner:'Wizard',stat:'will',target:'cell',range:3,damage:[2,3,5],description:'Strike every enemy in a 3-square line and Push 1.',tierText:['2 damage · Push 1','3 damage · Push 1','5 damage · Push 1']},
  'ice-wall':{id:'ice-wall',name:'Ice Wall',owner:'Wizard',target:'cell',range:4,description:'Create 3 connected wall squares until your next activation.'},
  teleport:{id:'teleport',name:'Teleport',owner:'Wizard',target:'ally',range:3,description:'Move yourself or an ally to an empty square within 3.'},
  vortex:{id:'vortex',name:'Vortex',owner:'Wizard',target:'area',range:5,momentum:3,description:'Heroic: pull enemies in a 3×3 area toward its centre and Daze them.'},

  smite:{id:'smite',name:'Smite',owner:'Cleric',stat:'will',target:'enemy',range:1,damage:[2,4,7],description:'On a solid hit, a nearby ally steps 1 for free.',tierText:['2 damage','4 damage · ally steps 1','7 damage · ally steps 1']},
  restore:{id:'restore',name:'Restore',owner:'Cleric',stat:'will',target:'ally',range:3,description:'Heal an ally or revive a Downed hero; on T2+ remove a condition.',tierText:['Heal 3','Heal 5 · cleanse','Heal 7 · cleanse']},
  sanctuary:{id:'sanctuary',name:'Sanctuary',owner:'Cleric',target:'area',range:4,momentum:3,description:'Heroic: create a 2×2 zone; allies inside gain +1 Defense.'},
  command:{id:'command',name:'Command',owner:'Cleric',target:'ally',range:3,description:'An ally within 3 immediately moves up to 2.'},
  'divine-intervention':{id:'divine-intervention',name:'Divine Intervention',owner:'Cleric',target:'ally',range:3,reaction:true,description:'Reduce damage to a nearby ally by 2 and Slide them 1.'}
};

export const HEROES:UnitTemplate[]=[
  {key:'garrick',name:'Garrick',role:'Fighter',team:'player',art:'garrick',hp:24,defense:10,move:3,might:4,agility:1,will:1,powers:['heavy-strike','shield-bash','come-and-get-me','cleave','whirlwind'],passive:'Sticky — enemies pay +1 Move to leave Garrick.',reaction:'Intercept — protect a nearby ally.'},
  {key:'nox',name:'Nox',role:'Rogue',team:'player',art:'nox',hp:18,defense:10,move:4,might:1,agility:4,will:2,powers:['backstab','dashing-strike','swap','vanish'],passive:'Slip Away — ignore engagement movement tax.'},
  {key:'lyra',name:'Lyra',role:'Wizard',team:'player',art:'lyra',hp:16,defense:8,move:3,might:0,agility:2,will:4,powers:['fireball','force-wave','ice-wall','teleport','vortex'],passive:'Arcane Reach — high ground adds 1 to power range.'},
  {key:'mira',name:'Mira',role:'Cleric',team:'player',art:'mira',hp:20,defense:9,move:3,might:2,agility:1,will:4,powers:['smite','restore','sanctuary','command'],passive:'Beacon — Downed heroes remain on the field and can be restored.',reaction:'Divine Intervention — reduce and redirect incoming harm.'}
];

export const ENEMIES:UnitTemplate[]=[
  {key:'skirmisher',name:'Goblin Skirmisher',role:'Skirmisher',team:'enemy',art:'enemy-skirmisher',hp:9,defense:8,move:4,might:2,agility:3,will:0,powers:[],range:1,passive:'After attacking, Slide 1. +1 Power against isolated heroes.'},
  {key:'brute',name:'Orc Brute',role:'Brute',team:'enemy',art:'enemy-brute',hp:16,defense:9,move:2,might:4,agility:0,will:1,powers:[],range:1,passive:'Heavy blows Push; a collision deals +2 damage.'},
  {key:'controller',name:'Cultist Controller',role:'Controller',team:'enemy',art:'enemy-controller',hp:10,defense:9,move:3,might:0,agility:1,will:3,powers:[],range:3,passive:'Creates hazards and pulls heroes into them.'},
  {key:'guardian',name:'Skeleton Guardian',role:'Guardian',team:'enemy',art:'enemy-guardian',hp:13,defense:10,move:2,might:3,agility:0,will:1,powers:[],range:2,passive:'Adjacent allies gain +1 Defense; can Brace for them.'},
  {key:'archer',name:'Goblin Archer',role:'Archer',team:'enemy',art:'enemy-archer',hp:8,defense:8,move:3,might:0,agility:3,will:0,powers:[],range:5,passive:'+2 damage when no hero is within 2.'}
];

const t=(kind:TerrainKind,x:number,y:number,extra:Partial<Terrain>={}):Omit<Terrain,'id'>=>({kind,x,y,...extra});

export const SCENARIOS:Scenario[]=[
  {
    id:'broken-gate',name:'The Broken Gate',kicker:'DESTROY · BOSS',
    objective:'Break the barricades and defeat the Orc War Chief. Terrain can be used for cover, collisions and high-ground shots.',
    objectiveShort:'Defeat the War Chief',failure:'All heroes are Downed.',roundLimit:99,background:'meadow-6x8.webp',
    heroSpawns:[{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7}],
    enemySpawns:[{x:2,y:0},{x:1,y:1},{x:4,y:1},{x:0,y:2},{x:5,y:2},{x:2,y:2},{x:3,y:2},{x:3,y:0}],
    terrain:[t('wall',0,0),t('wall',5,0),t('high',0,3),t('high',5,3),t('cover',1,4),t('cover',4,4),t('destructible',2,3,{hp:5}),t('destructible',3,3,{hp:5}),t('difficult',1,5),t('difficult',4,5),t('hazard',0,6),t('hazard',5,6)]
  },
  {
    id:'ember-shrine',name:'The Ember Shrine',kicker:'INTERRUPT · HOLD · SURVIVE',
    objective:'Interrupt both void sigils, then hold the four shrine squares at the end of 2 rounds before round 7.',
    objectiveShort:'Break 2 sigils · Hold 2 rounds',failure:'Round 7 begins before the shrine is secured, or all heroes are Downed.',roundLimit:6,background:'meadow-6x8.webp',
    heroSpawns:[{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7}],
    enemySpawns:[{x:1,y:0},{x:4,y:0},{x:0,y:2},{x:5,y:2},{x:2,y:1},{x:3,y:1},{x:0,y:4},{x:5,y:4}],
    terrain:[t('wall',0,0),t('wall',5,0),t('rune',1,1),t('rune',4,1),t('objective',2,3),t('objective',3,3),t('objective',2,4),t('objective',3,4),t('cover',1,3),t('cover',4,4),t('hazard',0,5),t('hazard',5,5),t('difficult',1,6),t('difficult',4,6),t('high',0,3),t('high',5,4)]
  },
  {
    id:'rescue-run',name:'Rescue at Ash Bridge',kicker:'RESCUE · ESCORT · ESCAPE',
    objective:'Open the prison, rescue the captive, and escort them to either blue exit square.',
    objectiveShort:'Rescue captive · Reach exit',failure:'All heroes are Downed.',roundLimit:99,background:'meadow-6x8.webp',
    heroSpawns:[{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7}],
    enemySpawns:[{x:1,y:0},{x:4,y:0},{x:0,y:2},{x:5,y:2},{x:1,y:3},{x:4,y:3},{x:0,y:5},{x:5,y:5}],
    terrain:[t('wall',0,0),t('wall',5,0),t('captive',2,0),t('wall',3,0),t('door',2,1),t('door',3,1),t('cover',1,2),t('cover',4,2),t('hazard',0,4),t('hazard',5,4),t('difficult',2,4),t('difficult',3,4),t('high',0,6),t('high',5,6),t('exit',2,7),t('exit',3,7)]
  }
];

export const ENEMY_ATTACKS:Record<EnemyRole,{name:string;stat:Stat;damage:TierValues;range:number;effect:string}>={
  Skirmisher:{name:'Hookblade',stat:'agility',damage:[2,4,6],range:1,effect:'Slide 1 after attacking.'},
  Brute:{name:'Crushing Maul',stat:'might',damage:[3,6,9],range:1,effect:'Push 1; T3 Push 2.'},
  Controller:{name:'Shadow Hook',stat:'will',damage:[1,3,5],range:3,effect:'Pull 1 toward a hazard.'},
  Guardian:{name:'Grave Pike',stat:'might',damage:[2,4,6],range:2,effect:'Reach 2.'},
  Archer:{name:'Black-feather Arrow',stat:'agility',damage:[2,4,6],range:5,effect:'+2 damage while unthreatened.'}
};

export const scenarioById=(id:string)=>SCENARIOS.find(s=>s.id===id)??SCENARIOS[0];
export const powerById=(id:string)=>POWERS[id];
export const pointKey=(p:Point)=>`${p.x},${p.y}`;
export const chebyshev=(a:Point,b:Point)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
