'use strict';
/* =====================================================================
   ROGUE TACTICS — rules data
   ===================================================================== */
const COLS=6,ROWS=8;
const ATTR={M:'Strength',F:'Dexterity',W:'Intelligence',P:'Presence'};
const ATTR_SHORT={M:'STR',F:'DEX',W:'INT',P:'PRE'};
const ATTR_USE={M:'Force, endurance and heavy melee.',F:'Precision, agility, stealth and ranged weapons.',W:'Reasoning, magic and reading the environment.',P:'Conviction, leadership and reading people.'};
const RESULT=['Miss','Hit','Critical hit'];
const RESULT_SHORT=['Miss','Hit','Crit'];
/* Difficulty, tuned with tools/sim.js (whole journeys played by the autoplay AI). Encounter budgets: see encBudget in
   engine.js (es0/esLvl: a hero's strength by level, esUnit: strength to foe cost, actMul: each region's foes, solo: a
   boss's share of its fight, eliteCost: an elite's cost multiplier, bossAct: each region's boss health). */
const TUNE={es0:4,esLvl:.85,esUnit:.4,solo:1.25,eliteCost:1.3,hpSlope:.015,dmgSlope:.08,rollStep:4,bossHp:.55,foeMomRound:1,foeMomRamp:0,eliteMul:[.7,.4,.5],eliteBudget:[1.4,1.35,.95],summonAt:8,actMul:[1.1,1.05,.65],bossAct:[1.2,1.45,.3],
  pbBonus:3,fallenHp:.25,momTurn:0,momStart:0,momVal:.9,maxLvl:10,xpLvl:80,easyShare:.25,sneak:3,aiCombo:1,saveBase:12,
  actions:3,extraActs:2,guardMin:4,aiMoveCost:1.5,aiHold:1,
  /* maliceMul scales Malice gain (1 = the rule book: the round number + Downs each round),
     and foeDef shifts every foe's DEF die up or down the ladder. */
  maliceMul:1,foeDef:0,
  /* bossCap: Reinforcements stop once a boss fight has this many foes, so a long boss fight does not snowball */
  bossCap:4,
  /* battleMul: each region's ordinary battles (not elites or bosses) */
  battleMul:[2,2.2,1.25],
  /* Journey heroes do not level up (Core Rules 4.2): they hold TUNE.hdBase hit dice and TUNE.slots powers, and grow by the
     rewards they pick after each fight. growChance: the chance that a reward card is growth (health or a key stat) */
  hdBase:3,slots:8,growChance:.3,vigor:1.5};
/* Experience (after PF2e): encounters give XP by difficulty (Easy 30, Medium 60, Hard 90, Extreme 120; see DIFF in
   engine.js) and accomplishments 10 to 30. XP is banked and turns into levels at a Camp: every TUNE.xpLvl XP is a level,
   which keeps heroes on the book's level bands (1-3, 4-6, 7-9). */
/* Dread (the ascension ladder): winning a journey at a Dread level unlocks the next. Each level keeps the ones below it.
   CTX.dread is set for run battles; engine hooks call dreadOn(n). */
const DREAD=[
  {name:'Bolder Foes',desc:'Foes have 15% more health.'},
  {name:'Lean Purses',desc:'You start with no gold, and battles pay 20% less.'},
  {name:'Hardened Elites',desc:'Elite battles field 25% more foes.'},
  {name:'Gathering Dark',desc:'Foes gain 1 more Malice every other round.'},
  {name:'Dear Markets',desc:'Merchants and the smith charge 25% more.'},
  {name:'No Easy Roads',desc:'Only the first battle of each land is Easy.'},
  {name:'Tyrants',desc:'Bosses have 20% more health.'},
  {name:'Gritty',desc:'The third Down kills a hero, not the fourth.'},
];
function dreadOn(n){return typeof CTX!=='undefined'&&!!CTX&&(CTX.dread||0)>=n;}
function woundCap(){return dreadOn(8)?2:3;}
const xpAt=l=>Math.max(0,l-1)*TUNE.xpLvl;
/* Power rarity (Heroes book 2.1). */
const RARITY={C:'Common',U:'Uncommon',R:'Rare'};
const RAR_W={C:60,U:30,R:10};
/* Old per-deed experience weights, still tallied in battle for the statistics. How much each kind of deed is worth to each role: defenders shove foes around and soak blows, strikers
   deal damage and finish foes, controllers catch many foes and hinder them, leaders mend and empower. Everyone
   earns some for combos: setting one up for a friend (setup) or cashing in a friend's set-up (combo). */
const ROLE_XP={
  fighter:{dealt:.5,taken:.8,control:3,mark:1.5,heal:.2,support:1,kill:4,setup:8,combo:3},
  rogue:{dealt:1.3,taken:.2,control:1,mark:0,heal:.2,support:1,kill:7,setup:3,combo:8},
  wizard:{dealt:.6,taken:.2,control:2.5,mark:0,heal:.2,support:1,kill:4,setup:6,combo:5},
  cleric:{dealt:.4,taken:.2,control:1,mark:0,heal:1.3,support:1.5,kill:3,setup:8,combo:3},
};
const XP_WHY={dealt:'Damage dealt',taken:'Blows absorbed',control:'Foes moved and hindered',mark:'Foes marked',heal:'Healing',support:'Allies empowered',kill:'Foes slain',setup:'Combos set up for allies',combo:'Combos landed'};

/* ---------------- HEROES ---------------- */
/* Every hero has a job in the combo game. The fighter throws foes off balance and makes them fight her; the wizard
   does it to whole groups; the cleric blesses friends and exposes foes; the rogue cashes it all in. */
const CLASSES={
  fighter:{name:'Brakka',rival:'Grask',title:'Fighter',role:'Tank',hp:40,grow:6,hd:10,speed:3,attrs:{M:3,F:2,W:1,P:3},prime:'M',second:'P',steady:1,
    spec:'Forcing doors and bars, lifting and bracing, intimidating, soldiers and war.',start:['tide','hook','brace'],
    style:'The stagger engine: shoves and drags foes off balance for her friends, and makes them fight her instead.',
    xpText:'Battles by difficulty (Easy 30, Medium 60, Hard 90, a boss 120 XP) and deeds on the road (10 to 30). Every 80 XP is a level, gained at a Camp.',
    trait:'Heavy armour and a shield: Defend rolls a d8 with advantage. Steadfast 1. Reaction, Intercept: she takes a blow meant for an ally beside her. Her marks taunt: a marked foe that can reach her must attack her.',
    pro:'she'},
  rogue:{name:'Vex',rival:'Shade',title:'Rogue',role:'Striker',hp:32,grow:5,hd:8,speed:4,attrs:{M:2,F:3,W:3,P:1},prime:'F',second:'W',
    spec:'Locks, traps, pockets, sneaking past guards, spotting an ambush.',start:['pierce','deepcut','finisher'],
    style:'The crit engine: finishes the foes her friends set up, then slips away.',
    xpText:'Battles by difficulty (Easy 30, Medium 60, Hard 90, a boss 120 XP) and deeds on the road (10 to 30). Every 80 XP is a level, gained at a Camp.',
    trait:'Sneak Attack: one extra weapon die against a foe that is staggered, exposed, rooted, dazed or flanked, or from hiding. Nimble from level 2: never provokes free strikes. Reaction, Opportunist: when an ally hits a foe beside her, she attacks it too.',
    pro:'she'},
  wizard:{name:'Orin',rival:'Morvane',title:'Wizard',role:'Controller',hp:24,grow:4,hd:6,speed:4,attrs:{M:1,F:3,W:3,P:2},prime:'W',second:'F',
    spec:'Magic items and runes, ancient writing, wards and rituals, strange beasts.',start:['scorch','frost','eager'],
    style:'The lock engine: roots, burns and shoves whole groups of foes, so his friends\' hits land harder.',
    xpText:'Battles by difficulty (Easy 30, Medium 60, Hard 90, a boss 120 XP) and deeds on the road (10 to 30). Every 80 XP is a level, gained at a Camp.',
    trait:'His Arcane Staff never misses but never crits. Force Adept from level 2: his pushes and pulls move foes 1 extra square. Reaction, Repelling Ward: when a foe steps up beside him, he pushes it 1 square away.',
    pro:'he'},
  cleric:{name:'Sela',rival:'Ilsa',title:'Cleric',role:'Support',hp:32,grow:5,hd:8,speed:3,attrs:{M:3,F:1,W:2,P:3},prime:'P',second:'M',
    spec:'Healing the sick, spirits and the undead, shrines and holy relics, telling truth from lies.',start:['brand','healWord','medic'],
    style:'The favour engine: blesses her friends, exposes foes for them and mends their wounds.',
    xpText:'Battles by difficulty (Easy 30, Medium 60, Hard 90, a boss 120 XP) and deeds on the road (10 to 30). Every 80 XP is a level, gained at a Camp.',
    trait:'Medium armour and a shield: Defend rolls a d6 with advantage. Mace or sling. Channel Divinity from level 2: her heals add her Presence and her attacks deal radiant damage. Reaction, Warding Word: when a foe hits an ally within 3 for 4 or more, she halves it.',
    pro:'she'},
};
const ORDER=['fighter','rogue','wizard','cleric'];
/* Levels (up to 12, about 3 per land) raise the main attribute at 3, 6, 9 and 12 and the second one at 5, 8 and 11. */
function attrsFor(cls,lvl,up){const C=CLASSES[cls];const a=Object.assign({},C.attrs);a[C.prime]=Math.min(5,a[C.prime]+(lvl>=4)+(lvl>=8));for(const k in up||{})a[k]=Math.min(5,(a[k]||0)+up[k]);return a;}

/* Powers (Heroes book, Part 2). Every power is active (costs MP and actions) or passive (always on, or triggers by
   itself). Class powers carry their class in c; general powers (c:'gen') can be taken by anyone. rar is the rarity
   (C, U, R: offered from levels 1, 3 and 5), tag the resonance tag. wd: how many weapon dice an attacking power rolls,
   before the weapon's own extra dice. eff values are by result: [miss, hit, crit]. */
const POWERS={
  /* ---- Basic attacks: one weapon die plus the key stat ---- */
  sword:{c:'fighter',lv:1,a:'M',name:'Sword',basic:true,cost:0,tgt:'enemy',range:1,dmg:[1,1,1],wd:1,desc:'A plain weapon attack: your weapon die plus your Strength.'},
  blades:{c:'rogue',lv:1,a:'F',name:'Blades',basic:true,cost:0,tgt:'enemy',range:1,dmg:[1,1,1],wd:1,desc:'Quick knife work: your weapon die plus your Dexterity. A pair of blades gives advantage on one attack each round.'},
  missile:{c:'wizard',lv:1,a:'W',name:'Staff Bolt',basic:true,cost:0,tgt:'enemy',range:4,dmg:[1,1,1],wd:1,proj:'#c39bff',desc:'Range 4. A dart of force from your staff: your weapon die plus your Intelligence. The Arcane Staff never misses, but never crits.'},
  mace:{c:'cleric',lv:1,a:'P',name:'Mace',basic:true,cost:0,tgt:'enemy',range:1,dmg:[1,1,1],wd:1,desc:'A solid blow: your weapon die plus your Presence.'},
  sling:{c:'cleric',lv:1,a:'P',name:'Sling',innate:true,cost:0,tgt:'enemy',range:3,dmg:[1,1,1],wd:1,wdie:4,proj:'#d8c8a0',sling:true,desc:'Range 3. Your sling: a d4 plus your Presence. The first sling or mace attack each turn earns momentum.'},
  /* ---- Innate set-ups: always known, no slot ---- */
  shove:{c:'fighter',lv:1,a:'M',name:'Shove',innate:true,cost:0,tgt:'enemy',range:1,noDmg:true,shove:1,save:{a:'M',eff:'stag'},desc:'No damage. Push the foe 1 square. It makes a Strength save or is staggered.'},
  force:{c:'wizard',lv:1,a:'W',name:'Force Push',innate:true,cost:0,tgt:'enemy',range:4,noDmg:true,shove:1,save:{a:'M',eff:'stag'},proj:'#c39bff',desc:'Range 4. No damage. Push the foe 1 square away. It makes a Strength save or is staggered.'},
  guidance:{c:'cleric',lv:1,a:'P',name:'Guidance',innate:true,cost:0,tgt:'ally',range:3,noSelf:true,empower:1,desc:'Range 3. Bless an ally: advantage on their next attack.'},

  /* ---- Rogue: the crit engine ---- */
  pierce:{c:'rogue',rar:'C',tag:'Burst',lv:1,a:'F',name:'Piercing Strike',cost:1,tgt:'enemy',range:1,dmg:[1,1,1],wd:2,pierceArmor:true,desc:'Attack with 2 weapon dice. It ignores DEF.'},
  deepcut:{c:'rogue',rar:'C',tag:'Set-up',lv:1,a:'F',name:'Deep Cut',cost:1,tgt:'enemy',range:1,dmg:[1,1,1],wd:2,eff:{bleed:[0,2,2]},desc:'Attack with 2 weapon dice. On a hit the foe is bleeding.'},
  tumble:{c:'rogue',rar:'C',tag:'Reach',lv:1,a:'F',name:'Hit and Run',cost:1,tgt:'enemy',range:1,dmg:[1,1,1],wd:2,canto:2,desc:'Attack with 2 weapon dice, then move up to 2 squares.'},
  feint:{c:'rogue',rar:'C',tag:'Set-up',lv:1,a:'F',name:'Feint',cost:1,tgt:'enemy',range:1,noDmg:true,save:{a:'W',eff:'expose'},desc:'No damage. The foe makes an Intelligence save or is exposed: your allies attack it with advantage.'},
  vanish:{c:'rogue',rar:'C',tag:'Burst',lv:1,a:'F',name:'Vanish',cost:1,tgt:'self',free:true,hide:true,freeMove:2,desc:'Free power. Become hidden and gain 2 more movement.'},
  backstab:{c:'rogue',rar:'C',tag:'Burst',lv:1,passive:true,name:'Backstab',desc:'Attacking from hiding, your Sneak Attack rolls 2 extra weapon dice instead of 1.'},
  openveins:{c:'rogue',rar:'C',tag:'Set-up',lv:1,passive:true,name:'Open Veins',desc:'Your critical hits make the foe bleed.'},
  shadow:{c:'rogue',rar:'U',tag:'Reach',lv:3,a:'F',name:'Shadowstep',cost:2,tgt:'enemy',range:5,teleportAdj:true,edge:1,dmg:[1,1,1],wd:2,desc:'Teleport beside a foe within 5 and attack it with advantage and 2 weapon dice.'},
  counter:{c:'rogue',rar:'U',tag:'Guard',lv:3,passive:true,react:true,name:'Counterattack',desc:'Reaction (1 action, once a round): a foe misses you with a melee attack. Make a basic attack against it.'},
  needle:{c:'rogue',rar:'U',tag:'Burst',lv:3,passive:true,name:'Needle and Thread',desc:'If your weapon is a d2, your extra weapon dice (Sneak Attack and powers) roll d6 instead.'},
  flurry:{c:'rogue',rar:'R',tag:'Burst',lv:5,passive:true,name:'Flurry',desc:'Each time you land a critical hit on your turn, your next basic attack this turn is not rushed.'},
  coup:{c:'rogue',rar:'R',tag:'Burst',lv:5,passive:true,name:'Coup de Grâce',desc:'Your critical hits against a staggered foe deal double damage.'},

  /* ---- Fighter: the stagger engine ---- */
  tide:{c:'fighter',rar:'C',tag:'Set-up',stagPush:1,lv:1,a:'M',name:'Tide of Iron',cost:1,tgt:'enemy',range:1,dmg:[1,1,1],wd:1,mark:1,eff:{push:[1,1,2]},follow:true,desc:'Attack. On a hit, push the foe 1 square (2 on a crit) and step into its square. It is staggered and marked.'},
  hook:{c:'fighter',rar:'C',tag:'Reach',stagPush:1,lv:1,a:'M',name:'Hook Chain',cost:1,tgt:'enemy',range:3,reach:true,dmg:[1,1,1],wd:1,mark:1,eff:{pull:[2,2,2],slow:[0,1,1]},desc:'Range 3. Attack. On a hit, drag the foe 2 squares to you: it is slowed, staggered and marked.'},
  shieldWall:{c:'fighter',rar:'C',tag:'Guard',lv:1,a:'M',name:'Shield Wall',cost:1,tgt:'self',area:1,aff:'ally',shield:6,markAround:1,desc:'You and allies around you gain 6 shield. Adjacent foes are marked.'},
  sweep:{c:'fighter',rar:'C',tag:'Burst',lv:1,a:'M',name:'Sweep',cost:1,tgt:'self',area:1,adjOnly:true,aff:'foe',dmg:[1,1,1],wd:1,dis:1,desc:'Attack every foe beside you, each with 1 disadvantage.'},
  bodyguard:{c:'fighter',rar:'C',tag:'Guard',lv:1,passive:true,name:'Bodyguard',desc:'When you Intercept, the attack against you has disadvantage.'},
  sentinel:{c:'fighter',rar:'C',tag:'Guard',lv:1,passive:true,name:'Sentinel',desc:'Your free strikes end the foe\'s move, mark it, and roll 1 extra weapon die.'},
  block:{c:'fighter',rar:'U',tag:'Guard',lv:3,passive:true,react:true,name:'Block',desc:'Reaction (1 action, once a round): an ally beside you Defends. They roll with 1 extra advantage.'},
  anvil:{c:'fighter',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Anvil',desc:'When a foe you push or pull ends beside an ally, that ally makes a basic attack against it at no cost (once a round).'},
  shieldbreaker:{c:'fighter',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Shieldbreaker',desc:'Your critical hits leave the foe exposed.'},
  heavy:{c:'fighter',rar:'U',tag:'Burst',lv:3,passive:true,name:'Heavy Blows',desc:'With a two-handed weapon, your critical hits roll 1 extra weapon die.'},
  bloodwater:{c:'fighter',rar:'U',tag:'Burst',lv:3,passive:true,name:'Blood in the Water',desc:'Your attacks against a bleeding foe roll 1 extra weapon die.'},
  cagi:{c:'fighter',rar:'R',tag:'Set-up',lv:5,a:'M',name:'Come and Get It',cost:3,acts:2,tgt:'self',area:2,aff:'foe',pullFirst:2,pullStag:true,noDmg:true,desc:'No damage. Pull every foe within 2 up to 2 squares toward you. They are staggered and marked.'},
  quake:{c:'fighter',rar:'R',tag:'Reach',lv:5,a:'M',name:'Earthshaker',cost:3,acts:2,tgt:'self',area:1,adjOnly:true,aff:'foe',noDmg:true,eff:{push:[1,1,1],slow:[1,1,1]},desc:'Every foe beside you is pushed 1 square and knocked down (slowed). Foes that slam are staggered.'},

  /* ---- Wizard: the lock engine. Her powers roll her staff's die ---- */
  thunder:{c:'wizard',rar:'C',tag:'Reach',lv:1,a:'W',name:'Thunderwave',cost:1,tgt:'self',area:1,adjOnly:true,aff:'foe',dmg:[1,1,1],wd:1,dtype:'force',eff:{push:[2,2,2]},desc:'1 weapon die of force damage to every foe beside you, and push them 2. Foes that slam are staggered.'},
  scorch:{c:'wizard',rar:'C',tag:'Set-up',lv:1,a:'W',name:'Scorching Burst',cost:1,tgt:'tile',range:5,area:1,aff:'foe',dmg:[1,1,1],wd:1,dtype:'fire',fx:'fire',igniteCenter:true,burnCenter:true,desc:'Range 5, 3x3. 1 weapon die of fire damage. The centre foe is burning and the centre square catches fire.'},
  frost:{c:'wizard',rar:'C',tag:'Set-up',lv:1,a:'W',name:'Ray of Frost',cost:1,tgt:'enemy',range:4,dmg:[1,1,1],wd:1,dtype:'cold',eff:{slow:[0,1,1],root:[0,0,1]},proj:'#8fe3ff',desc:'Range 4. 1 weapon die of cold damage. On a hit the foe is slowed (rooted on a crit).'},
  blink:{c:'wizard',rar:'C',tag:'Reach',lv:1,a:'W',name:'Blink',cost:1,tgt:'tile',range:3,teleport:true,free:true,desc:'Free power. Teleport up to 3 squares.'},
  mshield:{c:'wizard',rar:'C',tag:'Guard',lv:1,a:'W',name:'Mage Shield',cost:1,tgt:'self',free:true,shieldDice:2,desc:'Free power. Gain a shield of 2 rolls of your weapon die.'},
  kindling:{c:'wizard',rar:'C',tag:'Burst',lv:1,passive:true,name:'Kindling',desc:'Your fire powers roll 1 extra weapon die against burning foes.'},
  web:{c:'wizard',rar:'U',tag:'Set-up',lv:3,a:'W',name:'Web',cost:2,tgt:'tile',range:4,area:1,aff:'foe',noDmg:true,eff:{slow:[1,1,1],root:[0,1,1]},fx:'web',webArea:true,desc:'Range 4, 3x3. No damage. Foes are slowed, and rooted unless the roll misses. Empty squares fill with web.'},
  battlemage:{c:'wizard',rar:'U',tag:'Burst',lv:3,passive:true,name:'Battlemage',desc:'Your Arcane Staff can crit (it still never misses).'},
  shatter:{c:'wizard',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Shatter',desc:'Allies\' critical hits against a foe you rooted deal double damage.'},
  rod:{c:'wizard',rar:'U',tag:'Burst',lv:3,passive:true,name:'Lightning Rod',desc:'Your area powers roll 1 extra weapon die against foes marked by an ally.'},
  wildfire:{c:'wizard',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Wildfire',desc:'When a burning foe slams, every creature beside it starts burning.'},
  fireball:{c:'wizard',rar:'R',tag:'Burst',lv:5,a:'W',name:'Fireball',cost:3,acts:2,tgt:'tile',range:4,area:1,aff:'foe',dmg:[1,1,1],wd:2,dtype:'fire',fx:'fire',igniteCenter:true,burnCenter:true,desc:'Range 4, 3x3. 2 weapon dice of fire damage. The centre foe is burning.'},
  gravity:{c:'wizard',rar:'R',tag:'Reach',lv:5,a:'W',name:'Gravity Well',cost:3,tgt:'tile',range:4,area:3,aff:'foe',pullCenter:1,noDmg:true,fx:'arcane',desc:'Range 4. Pull every foe within 3 of the square 1 square toward it.'},

  /* ---- Cleric: the favour engine ---- */
  healWord:{c:'cleric',rar:'C',tag:'Mend',lv:1,a:'P',name:'Healing Word',cost:1,tgt:'ally',range:4,heal:5,healDie:true,cleanse:true,desc:'Range 4. An ally heals one roll of your hit die (it explodes) and ends its conditions.'},
  transpose:{c:'cleric',rar:'C',tag:'Guard',lv:1,a:'P',name:'Divine Shift',cost:1,tgt:'ally',range:4,noSelf:true,swap:true,shield:4,desc:'Swap places with an ally within 4. You both gain 4 shield.'},
  bless:{c:'cleric',rar:'C',tag:'Set-up',lv:1,a:'P',name:'Bless',cost:1,tgt:'self',area:2,aff:'ally',empower:1,desc:'You and allies within 2 are blessed: advantage on your next attack.'},
  sanct:{c:'cleric',rar:'C',tag:'Guard',lv:1,a:'P',name:'Sanctuary',cost:1,tgt:'ally',range:4,shield:8,desc:'Range 4. An ally gains 8 shield.'},
  brand:{c:'cleric',rar:'C',tag:'Set-up',lv:1,a:'P',name:'Brand of Judgment',cost:1,tgt:'enemy',range:1,dmg:[1,1,1],wd:1,edgeBloodied:true,eff:{expose:[1,1,1]},desc:'Attack. On a hit the foe is exposed. Against a bloodied foe the attack has advantage.'},
  gift:{c:'cleric',rar:'C',tag:'Mend',lv:1,passive:true,name:'Healer\'s Gift',desc:'Your healing powers heal 2 more, and your Second Wind heals 2 more.'},
  shepherd:{c:'cleric',rar:'C',tag:'Guard',lv:1,passive:true,name:'Shepherd',desc:'Link: allies around you Defend with 1 extra advantage.'},
  favour:{c:'cleric',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Divine Favour',desc:'An ally you blessed who lands a critical hit deals double damage.'},
  smite:{c:'cleric',rar:'U',tag:'Burst',lv:3,passive:true,name:'Smite',desc:'Your hits against an exposed foe roll 1 extra weapon die.'},
  revive:{c:'cleric',rar:'U',tag:'Mend',lv:3,a:'P',name:'Revivify',cost:2,tgt:'self',revive:true,desc:'A Down ally stands up beside you with 2 rolls of their hit die.'},
  martyr:{c:'cleric',rar:'U',tag:'Mend',lv:3,passive:true,name:'Martyr\'s Grace',desc:'Reckless. When you go Down, every other hero heals one roll of their hit die and ends its conditions.'},
  judgment:{c:'cleric',rar:'R',tag:'Burst',lv:5,a:'P',name:'Judgment Day',cost:3,acts:2,tgt:'self',area:4,aff:'foe',onlyExposed:true,dmg:[1,1,1],wd:2,fx:'holy',desc:'Attack every exposed foe within 4 with 2 weapon dice.'},

  /* ---- General powers: any class ---- */
  gambit:{c:'gen',rar:'C',tag:'Set-up',lv:1,passive:true,name:'Opening Gambit',desc:'The first time each battle you set up a foe (stagger, expose or root it, or bless an ally), gain 1 momentum.'},
  exploit:{c:'gen',rar:'C',tag:'Set-up',lv:1,passive:true,name:'Exploit Weakness',desc:'Your attacks against an exposed foe crit on the top number or one below (d6 or larger).'},
  followthru:{c:'gen',rar:'C',tag:'Set-up',lv:1,passive:true,name:'Follow-Through',desc:'When an ally staggers a foe within 3 of you, move up to 2 squares toward it at no cost.'},
  domino:{c:'gen',rar:'U',tag:'Set-up',lv:3,passive:true,name:'Domino',desc:'Chain: if the hero before you set up a foe this round, gain 1 momentum when your turn starts, and your attacks against that foe have 1 extra advantage this turn.'},
  rhythm:{c:'gen',rar:'U',tag:'Set-up',lv:3,passive:true,grow:true,name:'Rhythm',desc:'Growth: each combo you take part in adds a counter (max 4). At 2 counters your first attack each round rolls 1 extra weapon die; at 4, 2 extra.'},
  conductor:{c:'gen',rar:'R',tag:'Set-up',lv:5,passive:true,name:'Conductor',desc:'When you cash in a combo, every other hero gains 1 momentum.'},
  openstrike:{c:'gen',rar:'C',tag:'Burst',lv:1,passive:true,name:'Opening Strike',desc:'Your first attack in each battle rolls 2 extra weapon dice.'},
  finisher:{c:'gen',rar:'C',tag:'Burst',lv:1,passive:true,name:'Finisher',desc:'Your attacks against a bloodied foe roll 1 extra weapon die.'},
  feet:{c:'gen',rar:'C',tag:'Burst',lv:1,passive:true,name:'Set Your Feet',desc:'If you have not moved this turn, your first attack rolls 1 extra weapon die.'},
  overkill:{c:'gen',rar:'U',tag:'Burst',lv:3,passive:true,name:'Overkill',desc:'When your attack drops a foe, the leftover damage hits another foe beside it (ignoring DEF).'},
  pride:{c:'gen',rar:'U',tag:'Burst',lv:3,passive:true,grow:true,name:'Veteran\'s Pride',desc:'Growth: after each battle you finish without going Down, add a counter (max 4). At 2 counters your first attack each round rolls 1 extra weapon die; at 4, 2 extra.'},
  glass:{c:'gen',rar:'R',tag:'Burst',lv:5,passive:true,name:'Glass Cannon',desc:'Reckless. All your hits roll 1 extra weapon die. You Defend with disadvantage.'},
  brace:{c:'gen',rar:'C',tag:'Guard',lv:1,passive:true,name:'Brace',desc:'Your first Defend each round adds 2 to the roll.'},
  hardy:{c:'gen',rar:'C',tag:'Guard',lv:1,passive:true,name:'Hardy',desc:'6 more maximum health.'},
  counterguard:{c:'gen',rar:'U',tag:'Guard',lv:3,passive:true,name:'Counter-Guard',desc:'After you Defend, gain 1 momentum (once a round).'},
  bulwark:{c:'gen',rar:'U',tag:'Guard',lv:3,passive:true,name:'Bulwark Chain',desc:'Chain: if the hero before you Defended or was hit since your last turn, start your turn with a shield of 4.'},
  nerves:{c:'gen',rar:'U',tag:'Guard',lv:3,passive:true,name:'Nerves of Steel',desc:'Ignore 1 point of your Wound penalty. (Wounds arrive with the next update.)'},
  laststand:{c:'gen',rar:'R',tag:'Guard',lv:5,passive:true,name:'Last Stand',desc:'Once a battle, when you would go Down, stay at 1 health and gain a shield of 6.'},
  quick:{c:'gen',rar:'C',tag:'Reach',lv:1,passive:true,name:'Quick Feet',desc:'1 more speed.'},
  hardshove:{c:'gen',rar:'C',tag:'Reach',lv:1,passive:true,name:'Hard Shove',desc:'Your pushes and pulls move 1 square further.'},
  tripwire:{c:'gen',rar:'C',tag:'Reach',lv:1,passive:true,name:'Trip Wire',desc:'A foe you slam, or push into a hazard, is also knocked down (slowed).'},
  pinball:{c:'gen',rar:'U',tag:'Reach',lv:3,passive:true,name:'Pinball',desc:'When you slam a foe into another foe, both are staggered.'},
  reposition:{c:'gen',rar:'U',tag:'Reach',lv:3,a:'F',name:'Reposition',cost:0,free:true,tgt:'ally',range:3,noSelf:true,swap:true,swapPrev:true,desc:'Chain. Free power, once a round: swap places with the hero just before you in the turn order, if within 3.'},
  eager:{c:'gen',rar:'C',tag:'Surge',lv:1,passive:true,name:'Eager',desc:'Start each battle with 1 more momentum (no hero starts with more than 5).'},
  adrenaline:{c:'gen',rar:'C',tag:'Surge',lv:1,passive:true,name:'Adrenaline',desc:'The first time each battle a hit damages you, gain 1 momentum.'},
  warmup:{c:'gen',rar:'C',tag:'Surge',lv:1,passive:true,name:'Warm-up',desc:'Your first power each battle costs 1 less momentum.'},
  overflow:{c:'gen',rar:'U',tag:'Surge',lv:3,passive:true,name:'Overflow',desc:'When you would gain momentum at your maximum, the ally with the least gains it instead.'},
  echo:{c:'gen',rar:'U',tag:'Surge',lv:3,passive:true,name:'Echo',desc:'Chain: when the hero before you spends 3 or more momentum on a power, gain 1.'},
  afterglow:{c:'gen',rar:'R',tag:'Surge',lv:5,passive:true,grow:true,name:'Afterglow',desc:'Growth: at the end of each battle, keep half your momentum (max 3) for the start of the next (the 5 cap applies).'},
  medic:{c:'gen',rar:'C',tag:'Mend',lv:1,passive:true,name:'Field Medic',desc:'When you heal an ally, they heal 2 more.'},
  rallyp:{c:'gen',rar:'C',tag:'Mend',lv:1,passive:true,name:'Rally',desc:'Link: at the start of your turn, allies around you gain a shield of 2.'},
  quickrevive:{c:'gen',rar:'C',tag:'Mend',lv:1,passive:true,name:'Quick Revive',desc:'Help Up costs you no action.'},
  triage:{c:'gen',rar:'U',tag:'Mend',lv:3,passive:true,name:'Triage',desc:'Heroes who are Down when a battle is won stand up with health equal to your hit die\'s top number, instead of 1.'},
  echomercy:{c:'gen',rar:'U',tag:'Mend',lv:3,passive:true,name:'Echoing Mercy',desc:'Chain: if the hero before you healed an ally this round, your first heal this turn heals 4 more.'},
};
/* Every hero has these two (Core Rules 2.4 and 2.5). They take no slot. */
POWERS.secondwind={c:'any',innate:true,lv:1,a:'M',name:'Second Wind',cost:0,tgt:'self',selfWind:true,noDmg:true,desc:'Once per battle: heal one roll of your hit die (it explodes) plus your Strength, spending a hit die. Your next Defend before your next turn has advantage.'};
POWERS.helpup={c:'any',innate:true,lv:1,a:'P',name:'Help Up',cost:0,tgt:'tile',range:1,helpUp:true,noDmg:true,desc:'An ally beside you who is Down stands up with health equal to one roll of their hit die.'};
for(const k in POWERS)POWERS[k].id=k;

/* ---------------- MONSTERS (Bestiary) ---------------- */
/* attrs: M/F/W/P (Strength, Dexterity, Intelligence, Presence). role: how it fights. armor 1/2/3 = DEF d4/d6/d8.
   Attacks roll dice [n, die, bonus]; 'flat' attacks never roll. saves: + / − slants. terr: Terrifying rating.
   weak / resist / immune: damage types. eff values are by result: [miss, hit, crit]. */
const MON={
  runner:{name:'Goblin Rabble',plural:'goblin rabble',role:'Minion',act:0,art:'rabble',hp:1,speed:4,attrs:{M:1,F:2,W:1,P:1},minion:true,cost:.5,acts:[{name:'Stab',range:1,flat:2}],note:'Dies to anything. Four to a horde.'},
  rats:{name:'Rat Swarm',plural:'rat swarms',role:'Swarm',act:0,art:'rat',hp:4,tiny:4,speed:4,attrs:{M:1,F:2,W:1,P:1},saves:{F:1},cost:2,acts:[{name:'Gnaw',range:1,flat:1,per:true,eff:{bleed:[0,2,2]}}],note:'Damage equals the critters still standing. Gnawing leaves the prey bleeding.'},
  cutter:{name:'Goblin Cutthroat',plural:'goblin cutthroats',role:'Skirmisher',act:0,art:'goblin',hp:10,speed:4,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,M:-1},cost:1.2,pack:true,acts:[{name:'Jagged Blade',a:'F',range:1,dmg:[2,4,6],dice:[1,6,1],eff:{bleed:[0,0,2]}}],note:'Pack: advantage when another foe stands beside its prey.'},
  sniper:{name:'Goblin Sniper',role:'Artillery',act:0,art:'goblinArcher',hp:10,speed:3,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,P:-1},cost:2,skulk:true,acts:[{name:'Arrow',a:'F',range:5,dmg:[2,4,6],dice:[1,6,1]}],note:'Skulk: slips 1 square away after shooting.'},
  trapper:{name:'Goblin Trapper',role:'Lurker',act:0,art:'trapper',hp:12,speed:3,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,W:-1},cost:2,acts:[{name:'Hatchet',a:'F',range:1,dmg:[2,4,6],dice:[1,6,1]},{name:'Set Snare',range:3,trap:'trap',cd:2}],note:'Hides snares on the battlefield.'},
  wolf:{name:'Dire Wolf',role:'Skirmisher',act:0,art:'wolf',hp:14,speed:5,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,W:-1},cost:2,nimble:true,pack:true,acts:[{name:'Bite',a:'F',range:1,dmg:[2,4,6],dice:[1,6,1],eff:{stag:[0,0,1]}}],note:'Pack. Nimble. A critical bite staggers.'},
  hobgob:{name:'Hobgoblin Guard',role:'Soldier',act:0,art:'hobgoblin',hp:22,speed:3,attrs:{M:2,F:2,W:1,P:1},saves:{M:1,F:-1},steady:1,armor:2,cost:3,acts:[{name:'Spear Wall',a:'M',range:1,dmg:[3,5,7],dice:[1,6,2],eff:{mark:[0,1,1]}}],note:'Steadfast 1. On a hit: marks the hero.'},
  orc:{name:'Orc Brute',role:'Brute',act:0,art:'orc',hp:28,speed:3,attrs:{M:2,F:1,W:1,P:1},saves:{M:1,W:-1},armor:1,cost:3,savage:true,acts:[{name:'Greataxe',a:'M',range:1,dmg:[3,6,9],dice:[1,8,2],eff:{push:[0,1,2]}}],note:'Savage: +2 damage to bloodied heroes.'},
  hexer:{name:'Goblin Hexer',role:'Controller',act:0,art:'goblinShaman',hp:14,speed:3,attrs:{M:1,F:2,W:2,P:1},saves:{W:1,M:-1},cost:3,acts:[{name:'Hex Bolt',a:'W',range:4,dmg:[2,3,5],dice:[1,4,1],eff:{slow:[0,1,1],weak:[0,0,1]}},{name:'Mend',tgt:'ally',range:4,heal:7}],note:'Mend 7: heals allies.'},
  lurker:{name:'Mire Lurker',role:'Lurker',act:0,art:'ooze',hp:16,speed:4,attrs:{M:1,F:3,W:1,P:1},saves:{F:1,M:-1},cost:2.5,startHidden:true,acts:[{name:'Tongue Lash',a:'F',range:3,dmg:[3,5,7],dice:[1,6,2],eff:{pull:[2,2,2]}}],note:'Starts hidden in the reeds. Its tongue drags heroes 2 squares.'},
  captain:{name:'Bandit Captain',role:'Leader',act:0,art:'bandit',hp:32,speed:4,attrs:{M:2,F:3,W:1,P:2},saves:{F:1,M:-1},cost:5,aura:true,acts:[{name:'Sabre',a:'F',range:1,dmg:[4,6,9],dice:[1,8,2]},{name:'Rally',tgt:'self',cost:2,rally:true}],note:'Aura: allies within 2 gain advantage. Rally ◆2: allies beside heroes strike.'},
  marshogre:{name:'Marsh Ogre',role:'Brute',act:0,art:'ogre',hp:34,sz:2,speed:3,attrs:{M:3,F:1,W:1,P:1},saves:{M:1,F:-1},steady:1,armor:2,terr:1,cost:6,acts:[{name:'Club',a:'M',range:1,dmg:[4,7,10],dice:[1,8,3]},{name:'Smash',a:'M',range:1,area:1,dmg:[6,9,13],dice:[2,8,3],cost:2,eff:{push:[0,1,1]}}],note:'Large. Terrifying 1. Smash ◆2: 2 dice against a hero and everyone around it, pushing them.'},
  warlord:{name:'Orc Warlord',role:'Boss',act:0,art:'warlord',hp:110,speed:4,attrs:{M:3,F:3,W:1,P:3},saves:{M:1,W:-1},steady:2,armor:2,terr:1,boss:true,attacks:2,p2:{savage:true},acts:[{name:'Cleaving Axe',a:'M',range:1,dmg:[4,7,10],dice:[1,8,3],eff:{push:[1,1,2]}},{name:'Hurled Axe',a:'M',range:4,dmg:[3,5,7],dice:[1,6,1],cost:2}],va:['horde','warcry','laststand'],note:'Attacks twice. Terrifying 1. Bloodied: gains Savage. Surges on rounds 1, 3 and 5.'},
  bats:{name:'Bat Swarm',plural:'bat swarms',role:'Swarm',act:1,art:'bat',hp:4,tiny:4,speed:5,attrs:{M:1,F:2,W:1,P:1},saves:{F:1},nimble:true,cost:2,acts:[{name:'Bite',range:1,flat:1,per:true}],note:'Damage equals the bats still flying. Nimble.'},
  bones:{name:'Risen Bones',plural:'risen bones',role:'Minion',act:1,art:'bones',hp:1,speed:3,attrs:{M:1,F:1,W:1,P:1},undead:true,minion:true,cost:.5,acts:[{name:'Bone Claw',range:1,flat:3}]},
  spiderlings:{name:'Spiderling Swarm',plural:'spiderling swarms',role:'Swarm',act:1,art:'spiderling',hp:3,tiny:4,speed:4,attrs:{M:1,F:2,W:1,P:1},saves:{F:1},cost:2,acts:[{name:'Skittering Bites',range:1,flat:1,per:true,eff:{slow:[0,1,1]}}],note:'Damage equals the spiders still standing. Their bites slow.'},
  necro:{name:'Necromancer',plural:'necromancers',role:'Controller',act:1,art:'necromancer',hp:20,speed:3,attrs:{M:1,F:2,W:3,P:1},saves:{W:1,M:-1},cost:4,summon:'bones',summonN:3,summonCap:6,acts:[{name:'Grave Bolt',a:'W',range:4,dmg:[3,5,7],dice:[1,6,2],eff:{weak:[0,1,1]}}],note:'Every other round, raises up to 3 Risen Bones around itself.'},
  brood:{name:'Brood Mother',plural:'brood mothers',role:'Brute',act:1,art:'broodmother',hp:46,sz:2,speed:3,attrs:{M:3,F:2,W:1,P:1},saves:{M:1,F:1},steady:2,armor:2,cost:6,summon:'spiderlings',summonN:1,summonCap:2,summonVerb:'hatches',summonCall:'Hatch!',
    acts:[{name:'Venom Fangs',a:'F',range:1,dmg:[4,7,10],dice:[1,10,2],eff:{bleed:[0,3,3]}},{name:'Web Spray',a:'F',range:4,dmg:[1,2,3],dice:[1,4,0],eff:{root:[1,1,1]},cost:2,hazard:'web'}],note:'Large. Every other round, hatches a swarm of spiderlings.'},
  skeleton:{name:'Skeleton Warrior',role:'Soldier',act:1,art:'skeleton',hp:16,speed:3,attrs:{M:2,F:1,W:1,P:1},saves:{M:1,P:-1},armor:2,undead:true,reassemble:true,cost:2,acts:[{name:'Rusty Blade',a:'M',range:1,dmg:[3,5,7],dice:[1,6,2],eff:{mark:[0,0,1]}}],note:'Undead. Reassembles once unless slain by radiant damage.'},
  skarcher:{name:'Skeleton Archer',role:'Artillery',act:1,art:'skeletonArcher',hp:12,speed:3,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,P:-1},undead:true,cost:2,acts:[{name:'Bone Arrow',a:'F',range:5,dmg:[2,4,6],dice:[1,6,1]}],note:'Undead.'},
  zombie:{name:'Barrow Zombie',role:'Brute',act:1,art:'zombie',hp:32,speed:2,attrs:{M:2,F:1,W:1,P:1},saves:{M:1,F:-1},armor:1,undead:true,cost:3,acts:[{name:'Grave Grasp',a:'M',range:1,dmg:[4,6,9],dice:[1,8,2],eff:{root:[0,1,1]}}],note:'Undead. On a hit: rooted.'},
  ghoul:{name:'Ghoul',role:'Skirmisher',act:1,art:'ghoul',hp:18,speed:4,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,W:-1},undead:true,nimble:true,cost:3,acts:[{name:'Paralyzing Claw',a:'F',range:1,dmg:[2,4,6],dice:[1,6,1],eff:{daze:[0,0,1],slow:[0,1,0]}}],note:'Undead. Nimble. On a crit: dazed.'},
  spider:{name:'Barrow Spider',role:'Lurker',act:1,art:'spider',hp:15,speed:4,attrs:{M:1,F:2,W:1,P:1},saves:{F:1,M:-1},cost:2,acts:[{name:'Venom Bite',a:'F',range:1,dmg:[2,4,6],dice:[1,6,1],eff:{bleed:[0,2,2]}},{name:'Web Spit',a:'F',range:4,dmg:[1,2,3],dice:[1,4,0],eff:{root:[1,1,1]},cost:2,hazard:'web'}],note:'Spits web that roots its prey.'},
  ooze:{name:'Grave Ooze',role:'Brute',act:1,art:'ooze',hp:26,speed:2,attrs:{M:2,F:1,W:1,P:1},saves:{M:1,W:-1},cost:3,acidDeath:true,acts:[{name:'Acid Slam',a:'M',range:1,dmg:[3,5,7],dice:[1,6,2],eff:{weak:[0,1,1]}},{name:'Acid Spit',a:'M',range:3,dmg:[1,2,3],dice:[1,4,0],cost:2,hazard:'acid'}],note:'Spits pools of acid. Leaves acid where it dies.'},
  cultist:{name:'Grave Cultist',role:'Controller',act:1,art:'cultist',hp:14,speed:3,attrs:{M:1,F:2,W:2,P:1},saves:{W:1,M:-1},cost:3,acts:[{name:'Withering Curse',a:'W',range:4,dmg:[2,4,6],dice:[1,6,1],eff:{weak:[0,1,1],bleed:[0,0,2]}},{name:'Dark Offering',tgt:'self',mom:2}],note:'Can bleed itself to feed the foes\' Malice.'},
  shade:{name:'Wailing Shade',role:'Lurker',act:1,art:'wight',hp:16,speed:4,attrs:{M:1,F:3,W:1,P:2},saves:{P:1,M:-1},undead:true,incorporeal:true,skulk:true,startHidden:true,cost:3,acts:[{name:'Chill Touch',a:'P',range:1,dmg:[3,5,7],dice:[1,6,2],eff:{weak:[0,1,1]}}],note:'Undead. Incorporeal: resists physical damage. Starts hidden. Skulk.'},
  wight:{name:'Barrow Wight',role:'Soldier',act:1,art:'wight',hp:44,speed:3,attrs:{M:3,F:1,W:1,P:2},saves:{M:1,W:-1},steady:1,armor:2,terr:1,undead:true,drain:true,aura:true,cost:6,acts:[{name:'Draining Touch',a:'M',range:1,dmg:[4,7,10],dice:[1,10,2],eff:{weak:[1,1,1]}}],note:'Undead. Drain: heals half the damage it deals. Aura. Terrifying 1.'},
  warden:{name:'Bone Warden',role:'Soldier',act:1,art:'skeleton',hp:48,speed:3,attrs:{M:3,F:1,W:1,P:1},saves:{M:1,W:-1},steady:2,armor:3,undead:true,boneWall:true,cost:6,acts:[{name:'Bone Cleaver',a:'M',range:1,dmg:[4,7,10],dice:[1,8,3],eff:{mark:[0,1,1]}}],note:'Undead. Bone Wall: undead allies beside it roll their DEF with advantage.'},
  lich:{name:'The Lich',role:'Boss',act:1,art:'lich',hp:150,speed:3,attrs:{M:1,F:3,W:4,P:3},saves:{W:1,M:-1},steady:2,terr:2,undead:true,boss:true,attacks:1,summon:'bones',summonN:3,summonCap:6,p2:{summonEvery:1},acts:[{name:'Necrotic Bolt',a:'W',range:5,dmg:[5,8,11],dice:[1,10,4],eff:{weak:[0,0,1]}},{name:'Grave Chill',a:'W',range:4,area:1,dmg:[3,5,7],dice:[1,6,2],eff:{slow:[1,1,1]},cost:3}],va:['raise','siphon','nova'],note:'Raises the dead every other round (every round when bloodied). Terrifying 2. Surges on rounds 1, 3 and 5.'},
  imp:{name:'Ember Imp',plural:'ember imps',role:'Minion',act:2,art:'imp',hp:1,speed:5,attrs:{M:1,F:2,W:1,P:1},minion:true,nimble:true,fireDeath:true,cost:.5,acts:[{name:'Firebolt',range:3,flat:3}],note:'Fireproof. Bursts into fire when slain.'},
  hound:{name:'Ember Hound',role:'Skirmisher',act:2,art:'wolf',hp:20,speed:5,attrs:{M:2,F:2,W:1,P:1},saves:{F:1,W:-1},nimble:true,pack:true,cost:3,acts:[{name:'Burning Bite',a:'F',range:1,dmg:[3,5,7],dice:[1,6,2],eff:{burn:[0,0,2]}}],note:'Fireproof. Pack. Nimble. A critical bite sets you burning.'},
  gnoll:{name:'Gnoll Marauder',role:'Skirmisher',act:2,art:'gnoll',hp:24,speed:4,attrs:{M:2,F:2,W:1,P:1},saves:{M:1,W:-1},armor:1,savage:true,cost:3,acts:[{name:'Flail',a:'M',range:1,dmg:[3,6,8],dice:[1,8,2],eff:{bleed:[0,0,2]}}],note:'Savage: +2 damage to bloodied heroes.'},
  priest:{name:'Cinder Priest',role:'Leader',act:2,art:'firePriest',hp:22,speed:3,attrs:{M:1,F:2,W:2,P:3},saves:{P:1,M:-1},aura:true,cost:4,acts:[{name:'Scorch',a:'P',range:4,dmg:[3,5,7],dice:[1,6,2],eff:{burn:[1,1,2]}},{name:'Kindle',range:4,trap:'fire',cd:2},{name:'Mend',tgt:'ally',range:4,heal:8}],note:'Fireproof. Aura. Sets the ground on fire. Mend 8.'},
  drake:{name:'Fire Drake',role:'Artillery',act:2,art:'drake',hp:28,speed:4,attrs:{M:2,F:3,W:1,P:1},saves:{F:1,M:-1},armor:1,cost:4,acts:[{name:'Firespit',a:'F',range:4,dmg:[3,5,8],dice:[1,8,1],eff:{burn:[0,1,1]}},{name:'Flame Breath',a:'F',range:3,area:1,dmg:[3,5,7],dice:[1,6,2],cost:3,hazard:'fire'}],note:'Fireproof. Flame Breath ◆3 leaves fire behind.'},
  wraith:{name:'Ash Wraith',role:'Lurker',act:2,art:'wight',hp:22,speed:4,attrs:{M:1,F:3,W:1,P:3},saves:{P:1,M:-1},undead:true,incorporeal:true,startHidden:true,cost:3,acts:[{name:'Ash Touch',a:'P',range:1,dmg:[4,6,9],dice:[1,8,2],eff:{weak:[0,1,1]}}],note:'Undead. Incorporeal. Fireproof. Starts hidden.'},
  ogre:{name:'Ogre Smasher',role:'Brute',act:2,art:'ogre',hp:54,speed:3,attrs:{M:4,F:1,W:1,P:1},saves:{M:1,F:-1},steady:2,armor:2,terr:1,cost:6,acts:[{name:'Greatclub',a:'M',range:1,dmg:[5,8,12],dice:[1,12,2],eff:{push:[1,2,3],stag:[0,1,1]}}],note:'Terrifying 1. Its blows hurl heroes away, staggered.'},
  golem:{name:'Rock Golem',plural:'rock golems',role:'Soldier',act:2,art:'golem',hp:66,sz:2,speed:2,attrs:{M:4,F:1,W:1,P:1},saves:{M:1,W:-1},steady:3,armor:3,resist:['physical'],immune:['poison'],cost:6,
    acts:[{name:'Crushing Fists',a:'M',range:1,dmg:[5,8,12],dice:[1,12,2],eff:{push:[1,1,2]}},{name:'Hurl Boulder',a:'M',range:4,dmg:[4,6,9],dice:[1,8,2],cost:2,eff:{stag:[0,1,1]}}],note:'Large. Resists physical damage. Slow, but nothing moves it far.'},
  hulk:{name:'Magma Hulk',role:'Controller',act:2,art:'magma',hp:38,speed:3,attrs:{M:3,F:1,W:1,P:1},saves:{M:1,F:-1},steady:1,armor:2,trail:true,cost:5,acts:[{name:'Molten Fist',a:'M',range:1,dmg:[4,6,9],dice:[1,8,2],eff:{slow:[1,1,1],burn:[0,1,1]}}],note:'Fireproof. Leaves a trail of fire where it walks.'},
  dragon:{name:'Ashen Dragon',role:'Boss',act:2,art:'dragon64',hp:200,sz:2,speed:4,attrs:{M:4,F:3,W:2,P:3},saves:{M:1,F:1,W:-1},steady:3,armor:3,terr:3,boss:true,attacks:2,fireproof:true,weak:['cold'],p2:{breathCost:2},acts:[{name:'Rending Claws',a:'M',range:1,dmg:[5,8,12],dice:[1,10,3]},{name:'Tail Lash',a:'M',range:2,dmg:[4,6,9],dice:[1,8,3],eff:{push:[2,2,2]}},{name:'Fire Breath',a:'M',range:3,area:1,dmg:[5,8,11],dice:[1,10,3],cost:3,hazard:'fire',breath:true}],va:['presence','buffet','inferno'],note:'Large. Attacks twice. Fireproof; weak to cold. Terrifying 3. Bloodied: Fire Breath costs ◆2. Surges on rounds 1, 3 and 5.'},
  horror:{name:'Bound Horror',role:'Brute',act:-1,art:'horror',hp:50,speed:3,attrs:{M:3,F:1,W:2,P:1},saves:{M:1},steady:2,armor:2,cost:0,acts:[{name:'Rending Tendrils',a:'M',range:2,dmg:[5,8,11],dice:[1,10,3],eff:{pull:[1,1,2]}}]},
  pillar:{name:'Ritual Pillar',role:'Object',act:-1,art:'pillar',hp:18,speed:0,attrs:{M:0,F:0,W:0,P:0},object:true,cost:0,acts:[]},
};
for(const k in MON){MON[k].id=k;MON[k].fireproof=MON[k].fireproof||['imp','priest','drake','hulk','hound','wraith'].includes(k);}
const VA={
  horde:{name:'Rally the Horde',desc:'A horde of goblins pours in, and every foe has advantage this round.'},
  warcry:{name:'Warcry',desc:'Heroes within 3 are weakened and marked by the Warlord.'},
  laststand:{name:'Last Stand',desc:'The Warlord heals 15 and the foes gain 5 Malice.'},
  raise:{name:'Raise the Dead',desc:'Four Risen Bones knit together across the moor.'},
  siphon:{name:'Soul Siphon',desc:'Every hero within 4 makes a Presence save or loses 4 health to the Lich.'},
  nova:{name:'Death Nova',desc:'Every hero takes 6 necrotic damage, or half on a Presence save.'},
  presence:{name:'Presence (PRE)',forms:['presence','PRE'],text:'Awareness, will and charm. The cleric\'s key stat. Checks: noticing things, reading people, persuading, performing. Most arguments in a negotiation.'},
  buffet:{name:'Wing Buffet',desc:'Heroes within 2 are hurled 2 squares away, staggered.'},
  inferno:{name:'Inferno',desc:'The dragon floods a row with fire: Dexterity save or 8 damage.'},
};
const ACT_POOL=[['runner','cutter','cutter','rats','sniper','trapper','wolf','hobgob','orc','hexer','lurker'],['bones','bats','spiderlings','skeleton','skarcher','zombie','ghoul','spider','ooze','cultist','necro','wight','shade'],['imp','gnoll','priest','drake','ogre','hulk','golem','cultist','orc','hound','wraith']];
/* Minions come in hordes of four for the price of one ordinary foe. */
const SWARM=['runner','bones','imp'];
const LEADERS=['captain','wight','priest'];
const ELITES=[['captain','marshogre','orc','hobgob'],['wight','brood','necro','warden'],['ogre','golem','hulk']];
const BOSSES=['warlord','lich','dragon'];
const ACTS=[{name:'Act I',sub:'The Greenmarch'},{name:'Act II',sub:'The Barrow Moors'},{name:'Act III',sub:'The Ashen Waste'}];

/* ---------------- HAZARDS & TERRAIN ---------------- */
const HAZ={
  fire:{name:'Fire',dmg:3,st:{burn:1},desc:'Deals 3 damage and sets burning when a creature enters it or ends its turn in it.'},
  acid:{name:'Acid Pool',dmg:3,st:{weak:1},desc:'Deals 3 damage and weakens a creature that enters it or ends its turn in it.'},
  lava:{name:'Lava',dmg:8,st:{burn:2},desc:'Deals 8 damage and sets burning when a creature enters it or ends its turn in it.'},
  trap:{name:'Snare',dmg:4,st:{root:1},once:true,desc:'A hidden snare. Deals 4 damage and roots the first enemy of the trapper to enter it.'},
  web:{name:'Web',dmg:0,st:{root:1},once:true,desc:'Sticky web. Roots the next creature to enter it, then tears.'},
};
const OBST={
  rock:{name:'Boulder',tall:true},tree:{name:'Tree',tall:true},deadtree:{name:'Dead Tree',tall:true},spire:{name:'Basalt Spire',tall:true},
  column:{name:'Column',tall:true},crate:{name:'Crates',cover:true},lowwall:{name:'Low Wall',cover:true},tomb:{name:'Gravestone',cover:true},
  sarc:{name:'Sarcophagus',cover:true},icewall:{name:'Wall of Ice',tall:true},
};

/* ---------------- RELICS ---------------- */
const RELICS={
  boots:{name:'Boots of Striding',price:120,desc:'+1 speed for every hero.'},
  whetstone:{name:'Dwarven Whetstone',price:130,desc:'+1 damage on every hero attack.'},
  heart:{name:'Heart of the Oak',price:110,desc:'+8 max health for every hero.'},
  hymn:{name:'Battle Hymn',price:100,desc:'Heroes start each battle with +2 momentum.'},
  map:{name:"Tactician's Map",price:140,desc:'The first basic attack each turn gives +1 more momentum.'},
  phoenix:{name:'Phoenix Feather',price:130,desc:'The first hero to fall each battle rises at half health.'},
  fang:{name:'Vampire Fang',price:110,desc:'A hero heals 4 whenever they slay a foe.'},
  bulwark:{name:'Bulwark Sigil',price:100,desc:'Heroes start each battle with 8 shield.'},
  dice:{name:'Loaded Bones',price:150,desc:'Hero critical hits roll one extra die.'},
  lens:{name:'Sentinel Lens',price:90,desc:'Hero reaction strikes (free strikes, Opportunist, Counterattack) deal +3 damage.'},
  ward:{name:'Warding Charm',price:110,desc:'Each foe has disadvantage on its first attack against each hero each battle.'},
  scale:{name:'Salamander Scale',price:100,desc:'Heroes ignore fire and lava damage and cannot be set burning.'},
  gauntlet:{name:'Gauntlet of Force',price:120,desc:'Hero pushes and pulls move 1 extra square.'},
  fenboots:{name:'Fenwalker Boots',price:90,desc:'Heroes ignore difficult terrain.'},
  hourglass:{name:'Hourglass of Haste',price:80,desc:'Heroes add 3 to their initiative rolls.'},
  coin:{name:'Lucky Coin',price:70,desc:'Earn 50% more gold.'},
  waterskin:{name:'Healer\'s Satchel',price:90,desc:'Heroes heal an extra 15% after every battle.'},
  /* Relics unlocked by the Legacy (run.js, LEGACY_UNLOCKS) */
  drum:{name:'War Drum',price:120,desc:'The hero who cashes in a combo gains 1 more momentum.',lock:1},
  tome:{name:"Scholar's Tome",price:110,desc:'Power drafts offer 4 powers instead of 3.',lock:1},
  kettle:{name:'Camp Kettle',price:90,desc:'Every hero holds 1 more hit die. Camps remove 2 Wounds instead of 1.',lock:1},
  seal:{name:"Merchant's Seal",price:60,desc:'Merchants and the smith charge 25% less.',lock:1},
  hood:{name:"Executioner's Hood",price:130,desc:'Heroes attack bloodied foes (at half health or less) with advantage.',lock:1},
  ember:{name:'Ember Censer',price:110,desc:'Every foe but a boss starts each battle burning (3 fire damage on its first turn). Minions burn away.',lock:1},
  thread:{name:"Mender's Thread",price:90,desc:'Each hero can use Second Wind twice a battle.',lock:1},
  crown:{name:'Crown of Thorns',price:100,desc:'Heroes start each battle with 3 more momentum, but foes gain 2 more Malice every round.',lock:1},
  chalice:{name:'Blood Chalice',price:100,desc:'When a hero goes Down, every other hero gains 2 momentum.',lock:1},
};
/* Weapons: each sets the dice of its hero's basic attack (Sword, Blades, Bolt or Mace), may add damage, and some
   carry a trait. tier 1 is what each hero starts with. */
/* Weapons (Core Rules 6.3, Heroes book Part 3). The die is the engine: powers roll it too. Runes: keen (crit on the top
   number or one below; d6+), vicious (a crit rolls 1 more die), steady (reroll a 1 once a turn), flame / frost / radiant
   (damage type; flame burns and frost slows on a crit), venom (a crit makes the foe bleed), thunder (a crit pushes 1),
   warding (a hit shields you and adjacent allies for 2), long (+1 range or reach), twin (a pair). */
const WEAPONS={
  longsword:{dice:[1,6],cls:'fighter',tier:1,name:'Longsword',runes:[],desc:'A plain, trusty blade.'},
  battleaxe:{dice:[1,8],cls:'fighter',tier:2,name:'Battleaxe',runes:[],desc:'A heavier blade: d8.'},
  warhammer:{dice:[1,6],cls:'fighter',tier:2,name:'Thunder Hammer',runes:['thunder'],desc:'Thunder: a critical hit pushes the foe 1 square.'},
  flameblade:{dice:[1,8],cls:'fighter',tier:3,name:'Flameforged Blade',runes:['flame','keen'],desc:'Flame and Keen: fire damage, crits on 7 or 8 and sets foes burning.'},
  maul:{dice:[1,10],cls:'fighter',tier:4,name:'Titan\'s Maul',twoHanded:true,runes:['thunder','keen'],desc:'Two-handed (no shield). Thunder and Keen.'},
  daggers:{dice:[1,4],dual:1,cls:'rogue',tier:1,name:'Twinblades',runes:[],desc:'A pair of blades: advantage on one attack each round.'},
  serrated:{dice:[1,4],dual:1,cls:'rogue',tier:2,name:'Serrated Twinblades',runes:['venom'],desc:'Venom: critical hits make the foe bleed.'},
  rapier:{dice:[1,6],cls:'rogue',tier:2,name:'Duelist\'s Rapier',runes:['keen'],desc:'Keen: crits on a 5 or 6.'},
  needles:{dice:[1,2],dual:1,cls:'rogue',tier:3,name:'Shadow Needles',runes:['venom'],desc:'A d2 pair: half your swings miss, half are critical hits that ignore DEF. Venom.'},
  kingslayer:{dice:[1,6],dual:1,cls:'rogue',tier:4,name:'Kingslayer',runes:['vicious','venom'],desc:'A pair. Vicious and Venom.'},
  wand:{dice:[1,4],cls:'wizard',tier:1,name:'Arcane Staff',nocrit:1,nomiss:1,runes:[],desc:'Never misses, never crits.'},
  reachwand:{dice:[1,4],cls:'wizard',tier:2,name:'Staff of Reach',nocrit:1,nomiss:1,runes:['long'],desc:'Long: 1 more square of range.'},
  emberstaff:{dice:[1,6],cls:'wizard',tier:2,name:'Emberstaff',nocrit:1,nomiss:1,runes:['flame'],desc:'A d6 staff. Flame: fire damage.'},
  frostorb:{dice:[1,6],cls:'wizard',tier:3,name:'Frost Orb',nocrit:1,nomiss:1,runes:['frost','long'],desc:'A d6 staff. Frost and Long.'},
  magistaff:{dice:[1,8],cls:'wizard',tier:4,name:'Staff of the Magi',nocrit:1,nomiss:1,runes:['keen','long'],desc:'A d8 staff. Keen (with Battlemage) and Long.'},
  mace:{dice:[1,6],cls:'cleric',tier:1,name:'Iron Mace',runes:[],desc:'Blunt and honest.'},
  blessedmace:{dice:[1,8],cls:'cleric',tier:2,name:'Blessed Mace',runes:['radiant'],desc:'A d8 mace. Radiant.'},
  censer:{dice:[1,6],cls:'cleric',tier:2,name:'Warding Censer',runes:['warding'],desc:'Warding: a hit shields you and adjacent allies for 2.'},
  sunflail:{dice:[1,8],cls:'cleric',tier:3,name:'Sunforged Flail',runes:['radiant','keen'],desc:'A d8 flail. Radiant and Keen.'},
  dawn:{dice:[1,10],cls:'cleric',tier:4,name:'Relic of Dawn',runes:['radiant','warding'],desc:'A d10 mace. Radiant and Warding.'},
};
const RUNE_KEYS=['keen','vicious','steady','flame','frost','radiant','venom','thunder','warding','long','twin'];
/* Rune flags: w.keen, w.flame... plus what they change (range, damage type, a pair). */
function weaponFlags(w){for(const r of RUNE_KEYS)delete w[r];for(const r of w.runes)w[r]=1;w.range=w.reach=w.long?1:0;
  w.dtype=w.radiant?'radiant':w.flame?'fire':w.frost?'cold':undefined;if(w.twin)w.dual=1;return w;}
for(const k in WEAPONS){const w=WEAPONS[k];w.id=k;w.base=k;weaponFlags(w);}
/* Light weapons (the rogue's) can be honed down to a d2. Plain weapons have 1 rune socket, magic ones (tier 3+) 2. */
const isLight=w=>w.cls==='rogue';
const weaponSockets=w=>Math.max(w.runes.length,w.tier>=3?2:1);
/* A weapon as the smith has left it: RUN.wup[id] holds its die and runes (Heroes book 3.2). */
function weaponData(id){
  const b=WEAPONS[id];const ok=typeof CTX!=='undefined'&&CTX&&(CTX.mode==='run'||CTX.mode==='sim');const U=ok&&typeof RUN!=='undefined'&&RUN&&RUN.wup?RUN.wup[id]:null;if(!b||!U)return b;
  const w=Object.assign({},b,{dice:[b.dice[0],U.s||b.dice[1]],runes:(U.runes||b.runes).slice(),dual:b.dual,sockets:U.sockets});
  if(w.dice[1]===2)w.nomiss=0;return weaponFlags(w);
}
const START_WEAPON={fighter:'longsword',rogue:'daggers',wizard:'wand',cleric:'mace'};
const WEAPON_PRICE=[0,0,70,120,180];
const RUNE_DESC={keen:'Crits on the top number or one below it (d6 or larger).',vicious:'A crit rolls 1 more weapon die.',steady:'Once a turn, reroll a weapon die that came up 1.',
  flame:'Fire damage. A crit sets the foe burning.',frost:'Cold damage. A crit slows the foe.',radiant:'Radiant damage: double against the undead.',venom:'A crit makes the foe bleed.',
  thunder:'A crit pushes the foe 1 square.',warding:'A hit shields you and allies beside you for 2.',long:'1 more square of reach or range.',twin:'A light weapon becomes a pair: advantage on one attack each round.'};
const RUNE_NAME={keen:'Keen',vicious:'Vicious',steady:'Steady',flame:'Flame',frost:'Frost',radiant:'Radiant',venom:'Venom',thunder:'Thunder',warding:'Warding',long:'Long',twin:'Twin'};
function weaponText(w){const b=[`d${w.dice[1]}`];if(w.twoHanded)b.push('two-handed');if(w.dual)b.push('pair');if(w.nocrit)b.push('no crits');if(w.nomiss)b.push('no misses');const r=w.runes.map(k=>RUNE_NAME[k]);return `Weapon die ${b.join(', ')}${r.length?'. Runes: '+r.join(', '):''}. Every attack and attacking power rolls it. `+w.desc;}
/* Foe Malice buys threats (Bestiary). Which ones a battle can use depends on its type and region. */
const THREATS={
  bloodlust:{name:'Bloodlust',cost:3,desc:'Every foe has advantage on its attacks this round.'},
  hazard:{name:'Eruption',cost:5,desc:'The ground erupts beneath heroes. Move off it or suffer!',names:['Wildfire','Acid Seep','Eruption']},
  reinforce:{name:'Reinforcements',cost:7,desc:'A horde of minions pours in from the edges.'},
  rite:{name:'Dark Rite',cost:6,desc:'Every foe is wrapped in shield.'},
};
const RELIC_ICON={boots:'↑',whetstone:'◆',heart:'♥',hymn:'♦',map:'★',phoenix:'▲',fang:'v',bulwark:'⛨',dice:'#',lens:'o',ward:'*',scale:'~',gauntlet:'→',fenboots:'≈',hourglass:'8',coin:'$',waterskin:'+',drum:'D',tome:'B',kettle:'K',seal:'S',hood:'H',ember:'E',thread:'T',crown:'C',chalice:'U'};
const RELIC_COL={boots:'#c89060',whetstone:'#8ac8f0',heart:'#e04848',hymn:'#e0b040',map:'#e0d0a0',phoenix:'#ff8a30',fang:'#e8e8e8',bulwark:'#6a9ae0',dice:'#f0f0f0',lens:'#8ae0c0',ward:'#b08af0',scale:'#ff6a3a',gauntlet:'#a8b0b8',fenboots:'#6ab070',hourglass:'#e0c070',coin:'#ffd040',waterskin:'#80d090',drum:'#e8503c',tome:'#6aa4f0',kettle:'#a09890',seal:'#e8503c',hood:'#7a3ac8',ember:'#ff8a20',thread:'#e8503c',crown:'#9a6a18',chalice:'#f4c848'};

/* ---------------- MISSIONS ---------------- */
const MISSIONS={
  rout:{name:'Rout',desc:'Defeat every foe.',titles:['Crossroads Ambush','The Burned Mill','Raider Camp','The Broken Bridge','Ruined Watchtower','Smugglers\' Hollow']},
  ambush:{name:'Ambush',desc:'You are surrounded. Defeat every foe.',titles:['Trap in the Glade','Encircled','Knife in the Dark']},
  hold:{name:'Hold the Shrine',desc:'End 3 rounds with a hero on the shrine and no foe on it. More foes arrive.',titles:['The Wayshrine','Standing Stones','Beacon Hill']},
  rescue:{name:'Rescue',desc:'Reach the caged captive to free them, then lead them to the bottom edge. If they fall, you fail.',titles:['The Miller\'s Daughter','A Captured Scout','The Lost Pilgrim']},
  loot:{name:'Plunder',desc:'Grab all 3 chests (or defeat every foe). All 3 earns bonus gold.',titles:['The Tax Wagon','Barrow Hoard','Dragon\'s Tithe']},
  survive:{name:'Survive',desc:'Hold out for 5 rounds against endless reinforcements.',titles:['Siege of the Gate','The Long Night','Last Light']},
  assassinate:{name:'Assassinate',desc:'Slay the chief. Its allies fight harder near it.',titles:['Cut Off the Head','The Tyrant\'s Guard','A Crown of Ash']},
  ritual:{name:'Stop the Ritual',desc:'Topple both ritual pillars within 5 rounds, or a Bound Horror breaks free.',titles:['The Black Candle','Circle of Bones','The Cinder Rite']},
  defend:{name:'Defend the Wagon',desc:'Keep the supply wagon standing for 5 rounds.',titles:['Supply Run','The Refugee Cart','Last Wagon Out']},
  breakout:{name:'Breakout',desc:'Every surviving hero must escape through the top edge.',titles:['Collapse','Out of the Pit','Run for the Pass']},
  boss:{name:'Boss',desc:'Defeat the boss.',titles:['']},
};
/* Each region puts its own spin on a mission (the first region plays them straight). */
const TWISTS={
  'rescue:1':{id:'carry',name:'Broken Leg',desc:'Carry a wounded captive to the bottom edge. If they fall, you fail.',text:'The captive cannot walk. A hero standing beside them carries them: they are dragged along behind whichever hero moves away from their side.'},
  'hold:1':{id:'restless',name:'Restless Barrow',text:'The dead claw up beside the shrine every round.'},
  'loot:1':{id:'cursed',name:'Cursed Hoard',text:'Each chest you open raises Risen Bones beside you.'},
  'survive:1':{id:'night',name:'The Long Night',text:'Thick fog: no one, friend or foe, can attack or cast beyond 3 squares.'},
  'assassinate:1':{id:'flee',name:'The Chief Flees',text:'Slay the chief before the end of round 6, or it escapes and the battle is lost.'},
  'ambush:2':{id:'ring',name:'Ring of Fire',text:'Fires burn around the edges of the field, and flare up again on round 3.'},
  'survive:2':{id:'lava',name:'Rising Lava',text:'From round 3, lava floods one more row from the top each round (up to the third row).'},
  'assassinate:2':{id:'guards',name:'Bodyguards',text:'The chief takes half damage while one of its guards stands beside it.'},
  'ritual:2':{id:'blood',name:'Blood Pillars',text:'Each pillar heals 6 every round while a foe stands beside it.'},
  'loot:2':{id:'melt',name:'Molten Vault',text:'Chests still unopened melt away at the end of round 4.'},
  'breakout:2':{id:'collapse',name:'Collapsing Cavern',text:'From round 2, lava rises from the bottom edge, one row each round.'},
};
const MISSION_BY_ACT=[['rout','ambush','hold','rescue','loot'],['rout','hold','rescue','loot','survive','assassinate','ritual'],['rout','ambush','survive','assassinate','ritual','defend','breakout','loot']];
const BOSS_TXT=['The Orc Warlord attacks twice, pushes heroes aside and calls in his horde.','The Lich raises the dead in threes and drains the living.','The Ashen Dragon attacks twice, breathes fire and scatters heroes with its wings.'];

/* ---------------- GLOSSARY (clickable keywords) ---------------- */
const GLOSS={
  strength:{name:'Strength (STR)',forms:['strength','STR'],text:'Power and toughness. The fighter\'s key stat. Added to Second Wind and every hit die you spend to heal. Checks: lifting, breaking, climbing, enduring.'},
  dexterity:{name:'Dexterity (DEX)',forms:['dexterity','DEX'],text:'Speed and agility. The rogue\'s key stat, and the die for initiative. Checks: balancing, sneaking, stealing, quick hands.'},
  intelligence:{name:'Intelligence (INT)',forms:['intelligence','INT'],text:'Learning and reasoning. The wizard\'s key stat. Checks: history, magic and religion, foraging, making and fixing things.'},
  frightened:{name:'Frightened',forms:['frightened'],text:'Its attacks have disadvantage. Heroes facing a Terrifying foe make a Presence save at the start of the battle or are frightened until the end of their first turn.'},
  passive:{name:'Passive power',forms:['passive'],text:'Always on, or fires by itself when its trigger happens. Passive powers cost no momentum and no action.'},
  presence:{name:'Presence',forms:['presence'],text:'Conviction, leadership and reading people. Skills: Insight, Influence.'},
  attack:{name:'Damage Dice',forms:['damage dice','damage roll','weapon dice','weapon die'],text:'Every attack rolls weapon dice and adds the hero\'s key stat once. A basic attack rolls 1 weapon die; powers say how many. The first die decides the result: a 1 is a miss, the top number is a critical hit, anything else a hit. Other dice only add damage. A better weapon makes every attack and power better.'},
  graze:{name:'Miss',forms:['misses','missed','miss'],text:'A 1 on the first damage die (the primary die, thrown larger and in ivory). The attack deals no damage and none of its effects. Wizard staffs never miss.'},
  hit:{name:'Hit',forms:['on a hit'],text:'Anything between a 1 and the top number on the first damage die. Effects listed "on a hit" happen on a Hit or a Critical hit.'},
  crit:{name:'Critical Hit',forms:['critical hits','critical hit','on a crit','crits','crit'],text:'The top number on the first damage die (a 4 on a d4, a 2 on a d2), or one below it with a Keen weapon. Roll one more die and add it, and one more again each time the top number comes up. Critical hits ignore DEF and add any "on a crit" effects. Small dice crit more often; some powers double a critical hit\'s damage (up to ×3).'},
  advantage:{name:'Advantage',forms:['double advantage','advantage'],text:'Roll the die again and keep the best: on an attack that is the first damage die, on a check or save the attribute die. It comes from flanking, high ground, dazed, rooted or exposed targets, being blessed or hidden, Help, and some powers. Different sources stack, up to triple, and cancel disadvantage one for one.'},
  disadvantage:{name:'Disadvantage',forms:['disadvantage'],text:'Roll the die again and keep the worst. It comes from being weakened, frightened or marked by someone else, a target in cover, shooting while a foe stands beside you, and attacking more than once in a turn. Different sources stack.'},
  momentum:{name:'Momentum (MP)',forms:['momentum'],text:'Heroes start a battle with momentum equal to the party\'s Victories since the last Camp (up to 3). They gain 1 for their first basic attack each turn and 2 for each combo they land or set up, and spend it on powers. It holds up to 10.'},
  savingthrow:{name:'Saving Throw',forms:['saving throws','saving throw','save'],text:'When something acts on you, roll the die for the attribute it names (Strength 3 is a d8, for example): 4 or more saves. Each class saves with advantage in one attribute and disadvantage in another; foes list their own. Wounds count against a hero\'s saves.'},
  initiative:{name:'Initiative',forms:['initiative'],text:'At the start of a battle everyone rolls their Dexterity die (it explodes on its top number). Turns go from highest to lowest, heroes and foes mixed, and the order stays the same all battle. Ties go to the higher Dexterity, then to heroes. Minions of one kind share a roll.'},
  actions:{name:'Actions',forms:['three actions','actions'],text:'On their turn a hero has three actions. Moving (up to their speed, split up as they like), a basic attack and each power cost one, in any order. A reaction on someone else\'s turn costs one action from your next turn. Foes simply move and act.'},
  parting:{name:'Free Strike',forms:['free strikes','free strike','parting blows','parting blow','opportunity attacks','opportunity attack'],text:'When a creature steps away from an enemy beside it, that enemy gets a free strike: a basic attack. It costs nothing, and each enemy gets at most one per move. Staggered and dazed creatures can\'t make one.'},
  reaction:{name:'Reaction',forms:['reactions','reaction'],text:'Something a hero does on someone else\'s turn: Defend, a class reaction, or helping. Each reaction costs 1 action from the hero\'s next turn. Defend has no limit; other reactions work once a round. The game reacts for you, and always leaves you at least 1 action.'},
  defend:{name:'Defend',forms:['defends','defend'],text:'A reaction: when a foe hits a hero for 4 or more with anything but a critical hit, the hero spends 1 action from their next turn to roll their armour\'s DEF die (it explodes; a shield gives advantage) and takes that much less damage, but at least 1.'},
  mapen:{name:'Multiple Attacks',forms:['2nd attack','3rd attack'],text:'The second attack a hero makes in a turn has disadvantage, and the third double disadvantage. Reactions don\'t count. For powers a foe saves against, the foe rolls its save again and keeps the best instead.'},
  mark:{name:'Marked',forms:['marks','marked','mark'],text:'A marked creature has disadvantage on attacks that don\'t include whoever marked it. A foe the fighter marks can only attack her while it can reach her.'},
  push:{name:'Push',forms:['pushes','pushed','push','shoves','shove'],text:'Move the target directly away. A creature pushed into something slams. A push on its own staggers only if the power says so.'},
  pull:{name:'Pull',forms:['pulls','pulled','pull','drags','drag'],text:'Move the target directly toward the source. A pull on its own staggers only if the power says so.'},
  slam:{name:'Slam',forms:['slams','slam'],text:'A creature pushed into something takes one roll of the pusher\'s weapon die (it explodes), and so does whatever it hits. A slam staggers the creature that was pushed.'},
  steady:{name:'Steadfast',forms:['steadfast'],text:'Reduces how far this creature is pushed or pulled.'},
  stag:{name:'Staggered',forms:['staggered','staggers','stagger','off balance'],text:'Thrown off balance by a slam or a power that staggers. Half speed and no reactions. A staggered foe loses its next turn, unless someone other than the hero who staggered it hits it first: that hit is a sure critical hit, and the foe keeps its turn. A boss never loses its turn; the next attack against it has double advantage instead. A staggered hero has 1 fewer action on their next turn.'},
  daze:{name:'Dazed',forms:['dazed','daze'],text:'A dazed hero has only one action on its turn; a dazed foe can move or act, not both. Neither can react.'},
  slow:{name:'Slowed',forms:['slowed','slow'],text:'Speed drops to 1.'},
  root:{name:'Rooted',forms:['rooted','roots','root'],text:'Cannot move. Attacks against it have advantage.'},
  weak:{name:'Weakened',forms:['weakened','weakens','weak'],text:'Has disadvantage on its attacks.'},
  bleed:{name:'Bleeding',forms:['bleeding','bleeds','bleed'],text:'At the start of each of its turns it takes one roll of the weapon die of whoever made it bleed.'},
  burn:{name:'Burning',forms:['burning'],text:'Takes 3 fire damage at the start of each of its turns. Stepping into water puts it out.'},
  expose:{name:'Exposed',forms:['exposed','expose'],text:'Attacks against it by the allies of whoever exposed it have advantage, until the end of its next turn.'},
  bless:{name:'Blessed',forms:['blessed','bless','blessing'],text:'Advantage on the next attack. It lasts until then, or the end of the blessed hero\'s next turn.'},
  hidden:{name:'Hidden',forms:['hidden','hide'],text:'Unseen. The next attack has double advantage, then the creature is revealed.'},
  shield:{name:'Shield',forms:['shield'],text:'Absorbs damage before health. Shields fade at the start of the owner\'s next turn.'},
  flank:{name:'Flanking',forms:['flanking','flank'],text:'A melee attack has advantage when an ally stands on the far side of the target.'},
  cover:{name:'Cover',forms:['cover'],text:'Crates, low walls and gravestones give cover: a ranged attack against a creature standing behind one has disadvantage. Tall obstacles block sight completely.'},
  high:{name:'High Ground',forms:['high ground'],text:'Raised ground. Attacks from high ground against creatures below have advantage, and ranged powers reach 1 square further.'},
  difficult:{name:'Difficult Terrain',forms:['difficult terrain'],text:'Water, brambles, rubble and ash cost 2 movement to enter.'},
  hazard:{name:'Hazard',forms:['hazards','hazard'],text:'Fire, acid, lava, snares and webs. Creatures suffer a hazard when they enter it, even when pushed or pulled in, or start their turn in it.'},
  fire:{name:'Fire',forms:['fire'],text:HAZ.fire.desc},
  acid:{name:'Acid',forms:['acid'],text:HAZ.acid.desc},
  lava:{name:'Lava',forms:['lava'],text:HAZ.lava.desc},
  snare:{name:'Snare',forms:['snares','snare'],text:HAZ.trap.desc},
  web:{name:'Web',forms:['web'],text:HAZ.web.desc},
  sneak:{name:'Sneak Attack',forms:['sneak attacks','sneak attack'],text:'The rogue rolls one extra weapon die against a foe that is staggered, exposed, rooted, dazed or flanked, or when attacking from hiding.'},
  combo:{name:'Combo',forms:['combos','combo'],text:'When a hero cashes in a set-up another hero made (attacks a foe they staggered or exposed, or uses their blessing), it is a combo: the hero and each hero who set it up gain 2 momentum.'},
  setup:{name:'Set-up',forms:['set-ups','set-up','set up'],text:'A foe is set up when it is staggered, exposed, rooted or dazed, or flanked. Allies cash set-ups in for combos, and the rogue\'s Sneak Attack rolls an extra die against them. Nobody cashes in their own set-up.'},
  armor:{name:'DEF',forms:['armored','armor','armour','DEF'],text:'Armour gives a creature a DEF die (d4 to d10). Foes roll it against every hit that is not a critical hit and take that much less damage, but at least 1. Heroes roll theirs when they Defend.'},
  intent:{name:'Intent',forms:['intents','intent'],text:'Tap INTENT during a hero\'s turn to see what each foe means to do on its next turn: whom it will attack, and roughly how much damage it will deal. They change as you shove foes around, taunt them or get out of reach.'},
  nimble:{name:'Nimble',forms:['nimble'],text:'Never provokes free strikes.'},
  swarm:{name:'Swarm',forms:['swarms','swarm'],text:'Up to four tiny critters sharing one square and one pool of health. You attack the swarm as a single foe. Area attacks deal double damage to it, and it deals less damage as its critters fall. Its attacks never roll.'},
  minion:{name:'Minion',forms:['minions','minion'],text:'A foe with a single hit point: any hit slays it. Minions come in hordes, often raised or rallied by a boss or summoner. Their attacks never roll.'},
  large:{name:'Large',forms:['large'],text:'A huge creature that fills a 2×2 block of squares. It is beside anything touching any of its squares, and needs a 2×2 gap to move through.'},
  undead:{name:'Undead',forms:['undead'],text:'Weak to radiant damage (double) and immune to poison and necrotic damage.'},
  radiant:{name:'Radiant',forms:['radiant'],text:'Holy damage. Doubled against undead, and stops skeletons reassembling. The cleric always deals it; Radiant weapons do too.'},
  surge:{name:'Boss Surge',forms:['boss surges','boss surge'],text:'A boss unleashes a special action at the start of its turn on rounds 1, 3 and 5.'},
  threat:{name:'Malice',forms:['malice','threats','threat'],text:'Foes gain Malice every round: the round number, plus 1 for each hero who is Down (shown in the top bar). When they have enough, they unleash their next threat. Harder battles and later regions unlock nastier threats.'},
  zone:{name:'Zone',forms:['zone'],text:'A lingering area. It affects foes that start their turn inside it.'},
  dread:{name:'Dread',forms:['dread'],text:'The difficulty ladder. Slay the Ashen Dragon to unlock Dread 1; win at your highest Dread to unlock the next, up to 8. Each level adds a hardship and keeps the ones below it, and raises your score by a quarter. Choose it when you set out.'},
  boon:{name:'Boon',forms:['boons','boon'],text:'At the start of each journey, fortune offers two gifts and a bargain: choose one. Bargains are stronger, but cost you something, such as a Wound on every hero.'},
  legacy:{name:'Chronicle',forms:['chronicle','legacy'],text:'What carries over between journeys: your totals, your best score, the Dread you have unlocked, and relics unlocked by milestones. Unlocked relics can turn up in treasure, shops and rewards. Open it from the title screen.'},
  victory:{name:'Victories',forms:['victories','victory'],text:'The party\'s wins since its last Camp: a battle is 1, an elite 2, a boss 3, a dramatic task or negotiation 1. Every hero starts a battle with momentum equal to the Victories (up to 3). A Camp resets them.'},
  reward:{name:'Reward',forms:['rewards','reward'],text:'After every battle won, pick 1 of 3 cards: a power for one hero (shown on the card), or a growth card. Elites give two rewards with at least one Uncommon power, bosses two with at least one Rare. Skip a reward for 10 gold, or pay 10 to reroll the cards once. Heroes do not level up: rewards are how they grow.'},
  growth:{name:'Growth',forms:['growth'],text:'A reward card that makes a hero stronger instead of teaching a power. Vigor: max health equal to their hit die (d10: +10). Training: +1 to their key stat, up to 5.'},
  difficulty:{name:'Difficulty',forms:['difficulty'],text:'How big an encounter is: Easy, Medium, Hard (elites) or Extreme (bosses). The first battle of each land is Easy, and so are about a quarter of the rest.'},
  camp:{name:'Camp',forms:['camps','camp'],text:'A safe stop on the map. Every hero heals with their remaining hit dice, refills them and removes a Wound, and the Victories reset. Then spend gold on downtime: tend wounds or retrain a power.'},
  hitdice:{name:'Hit Dice',forms:['hit dice','hit die'],text:'Each hero has a pool of 3 hit dice of their class\'s die. Out of battle, spend one to heal one roll of it (exploding) plus Strength. Second Wind spends one in battle. A Camp refills the pool.'},
  wound:{name:'Wounds',forms:['wounds','wound'],text:'A hero who goes Down gains a Wound: -1 to the total of every attack, save and check (up to -3). A hero who goes Down with 3 Wounds already dies. Each Camp removes one, and gold can buy another.'},
  down:{name:'Down',forms:['is down','are down','goes down','go down','downed'],text:'A hero at 0 health is Down: they can\'t act, foes ignore them, and they gain a Wound. An ally beside them can Help them up, and healing stands them up too. After a won battle Down heroes stand up with 1 health. If every hero is Down, the battle is lost.'},
  bloodied:{name:'Bloodied',forms:['bloodied'],text:'At or below half health. Bloodied does nothing by itself, but bosses change phase, some foes turn savage and some powers hit harder.'},
  check:{name:'Check',forms:['checks','check'],text:'Roll the die for an attribute: 4 or more succeeds, a 1 is a critical failure, the top number explodes. Difficulty only comes from advantage and disadvantage. Another hero can Help (+1 advantage). Class options need the right hero, and often no roll at all.'},
  task:{name:'Dramatic Task',forms:['dramatic tasks','dramatic task'],text:'A race against time. Each round every hero makes one attempt with an approach of their choice: success earns 1 token, an exploding roll 2, a critical failure loses 1. Reach the target before the rounds run out; a little short succeeds at a cost.'},
  negotiation:{name:'Negotiation',forms:['negotiations','negotiation'],text:'Up to three rounds of arguments against someone with something at stake. Their mood sets the dice; strong arguments add advantage, offensive ones disadvantage. Each success earns influence, and gold can buy it. 2 influence: they agree, for a price; 3: fully.'},
  draft:{name:'Power Draft',forms:['power drafts','power draft','drafts','draft'],text:'One hero picks 1 of 3 powers (at least one for their class and one general power), or skips for 10 gold. Drafts come from boons, treasure, training at a Camp and some events. Most new powers come from rewards. With every slot full, learning a power replaces one.'},
  slots:{name:'Power Slots',forms:['power slots','power slot','slots'],text:'A hero can know 8 powers. Innate powers (basic attacks, Shove, Guidance, Second Wind, Help Up) take no slot.'},
  rarity:{name:'Rarity',forms:['common','uncommon','rare'],text:'Powers are Common, Uncommon or Rare. Drafts roll Common 60%, Uncommon 30%, Rare 10%; elites promise an Uncommon and bosses a Rare.'},
  resonance:{name:'Resonance',forms:['resonance'],text:'Every power has a tag: Set-up, Burst, Guard, Reach, Surge or Mend. With 4 powers of a tag across the party, everyone gets its first resonance; with 8, the second. Burst I, for example, lets each hero reroll a 1 once a battle.'},
  chain:{name:'Chain',forms:[],text:'A power that reacts to the hero just before you in the turn order.'},
  link:{name:'Link',forms:[],text:'A power that reacts to allies in the 8 squares around you.'},
  growth:{name:'Growth',forms:[],text:'A power with counters that build up over the whole journey. Going Down loses them.'},
  reckless:{name:'Reckless',forms:[],text:'A big upside with a real drawback.'},
  rune:{name:'Runes',forms:['runes','rune'],text:'Inscribed in a weapon\'s sockets by the smith (plain weapons have 1, magic ones 2). Keen widens the crit range, Vicious and Steady improve crits and 1s, Flame, Frost and Radiant change the damage type, Venom and Thunder add to crits, Warding shields, Long reaches further, Twin makes a pair.'},
  smith:{name:'Smith',forms:['smith'],text:'At a merchant. Temper a weapon (a bigger die), hone it (a smaller die; only the rogue\'s light weapons go down to a d2), or inscribe and remove runes.'},
  d2:{name:'d2 Weapon',forms:['d2'],text:'A needle-thin blade honed below a d4. Half its swings miss and half are critical hits, which ignore DEF and love every power that doubles a crit.'},
  keystat:{name:'Key Stat',forms:['key stat'],text:'The attribute a class fights with: Strength for the fighter, Dexterity for the rogue, Intelligence for the wizard, Presence for the cleric. It is added once to every hit.'},
  weakness:{name:'Weak, Resist, Immune',forms:['weakness','resists','resistance','immune'],text:'Damage types: physical, fire, cold, force, radiant, necrotic and poison. A weakness doubles the damage, a resistance halves it (at least 1), an immunity stops it. Incorporeal foes resist physical damage.'},
  terrifying:{name:'Terrifying',forms:['terrifying'],text:'At the start of the battle, every hero makes a Presence save with disadvantage equal to the foe\'s rating, or is frightened until the end of their first turn.'},
  help:{name:'Help',forms:['helps','helping'],text:'One hero gives another +1 advantage on a check. In a dramatic task, helping uses up the helper\'s attempt.'},
  teleport:{name:'Teleport',forms:['teleport'],text:'Move instantly without provoking free strikes.'},
  free:{name:'Free Action',forms:['free action'],text:'Costs none of your three actions.'},
};

/* ---------------- EVENTS (Core Rules 4.3 to 4.5) ----------------
   An option tests an attribute (a), with extra advantage (adv) or none; the party's best hero rolls it and another
   hero Helps (+1 advantage). Class options (cls) need that class: auto ones need no roll, the rest roll with advantage.
   There is always a safe option. Outcomes: gold, heal (rolls of each hero's hit die), hdUp (hit dice back), dmg (every
   hero), hurt (the hero who rolled), wound (the hero who rolled), vic (Victories), relic, weapon, draft, fight.
   A critical failure (crit) is worse than a failure (lose); without one, the roller also takes 4 damage. */
const EVENTS=[
  {id:'bridge',title:'The Collapsed Bridge',text:'A rope bridge over a gorge has half given way. A merchant\'s strongbox dangles from the wreckage below.',opts:[
    {label:'Haul up the strongbox',a:'M',win:{gold:45,text:'Muscles burn, but the strongbox comes up full of coin.'},lose:{dmg:4,text:'The rope snaps back and lashes the whole party.'}},
    {label:'Brace the beam while the others cross',cls:'fighter',auto:true,win:{gold:30,text:'Brakka holds the beam like a doorpost. Everyone crosses, strongbox and all.'}},
    {label:'Dance across the beams',a:'F',win:{weapon:true,text:'On the far side, a traveller\'s pack holds a fine weapon.'},lose:{hurt:5,text:'A slip, a scramble and a lot of bruises.'}},
    {label:'Go the long way round (each hero spends a hit die)',hd:1,win:{text:'The detour is long and cold.'}}]},
  {id:'pilgrim',title:'The Wandering Pilgrim',text:'An old woman in grey rags offers to pray over your wounds, for a price.',opts:[
    {label:'Read her intentions',a:'P',win:{heal:1,text:'She is genuine. Her prayer mends the whole party.'},lose:{gold:-20,text:'She lifts a purse while you watch her eyes.'}},
    {label:'Tell true faith from false',cls:'cleric',auto:true,win:{heal:1,hdUp:1,text:'Sela knows the old words. The two of them pray together, and the party is mended.'}},
    {label:'Pay her 30 gold',cost:30,win:{heal:2,text:'Warm light washes over the party.'}},
    {label:'Walk on',win:{text:'She mutters a curse, or a blessing.'}}]},
  {id:'shrine',title:'A Forgotten Shrine',text:'Runes circle a moss-covered altar. Something old still hums inside the stone.',opts:[
    {label:'Read the inscription',a:'W',win:{draft:true,text:'The runes teach an old technique.'},lose:{text:'The script is too worn to read.'},crit:{hurt:6,text:'A misread word, and cold green fire leaps from the stone.'}},
    {label:'Pray at the altar',cls:'cleric',auto:true,win:{relic:true,text:'The altar answers Sela\'s prayer with a humming relic.'}},
    {label:'Pay 30 gold for a blessing',cost:30,win:{hdUp:2,text:'You leave an offering. The party feels rested.'}},
    {label:'Pry out the offerings',win:{gold:40,fight:'rout',text:'Coins rattle loose, and the shrine\'s guardians wake.'}}]},
  {id:'toll',title:'The Goblin Toll',text:'Goblins block the road with a cart and demand a toll: 25 gold.',opts:[
    {label:'Talk your way past',a:'P',win:{text:'The goblins let you pass, grumbling.'},lose:{fight:'rout',text:'Talk fails. Knives come out.'}},
    {label:'Slip past in the dark',cls:'rogue',a:'F',win:{gold:15,text:'Vex leads the party round the cart, and lifts a purse on the way.'},lose:{fight:'ambush',text:'A goblin trips over Vex. They are all around you.'}},
    {label:'Pay 25 gold',cost:25,win:{text:'They count every coin, then wave you on.'}},
    {label:'Clear the road',win:{fight:'rout',vic:0,text:'You draw steel.'}}]},
  {id:'reliquary',title:'The Locked Reliquary',text:'A sealed iron casket rests in a roadside chapel. Something clicks inside it when you touch the lid.',opts:[
    {label:'Lift the relic without springing the trap',a:'F',win:{relic:true,text:'Steady hands. The relic is yours.'},lose:{dmg:3,text:'A needle trap! Its poison spreads through the party.'}},
    {label:'Disarm the trap',cls:'rogue',auto:true,win:{relic:true,text:'Vex finds the needle, bends it back and opens the lid.'}},
    {label:'Force it open',a:'M',win:{weapon:true,text:'Hinges scream and give way. A blessed weapon lies inside.'},lose:{hurt:6,text:'The casket bursts into flame.'}},
    {label:'Leave it be',win:{text:'Some things are locked for a reason.'}}]},
  {id:'hunter',title:'The Wounded Hunter',text:'A hunter lies in the heather with a bolt in his leg.',opts:[
    {label:'Tend his wound',a:'W',win:{gold:25,hdUp:1,text:'He shares his camp and a purse of coin.'},lose:{text:'You do your best. He limps away, silent.'}},
    {label:'Heal him',cls:'cleric',auto:true,win:{gold:30,heal:1,text:'Sela closes the wound. The grateful hunter shares his supper and his purse.'}},
    {label:'Search his pack',win:{gold:30,text:'You take what he has. It doesn\'t sit well.'}},
    {label:'Leave him',win:{text:'You press on.'}}]},
  {id:'mist',title:'Shapes in the Mist',text:'Figures move in the fog ahead, spears glinting.',opts:[
    {label:'Slip past unseen',a:'F',win:{gold:20,text:'You pass unseen and lift a purse from a sleeping sentry.'},lose:{fight:'ambush',text:'A twig snaps. They charge.'}},
    {label:'Spot the ambush first',cls:'rogue',auto:true,win:{gold:20,vic:1,text:'Vex sees the trap before it springs. You turn it around and scatter them.'}},
    {label:'Attack first',win:{fight:'rout',text:'Surprise is yours.'}}]},
  {id:'smith',title:'The Wandering Smith',text:'A dwarf smith has set up her anvil by the road. She eyes your gear and sniffs.',opts:[
    {label:'Help at the forge',a:'M',win:{weapon:true,text:'You work the bellows till dawn. She gives you a blade for your trouble.'},lose:{hurt:4,text:'A spray of sparks. She shoos you away.'}},
    {label:'Read the runes on her anvil',cls:'wizard',auto:true,win:{weapon:true,gold:10,text:'Orin names every rune. Delighted, she gives him her best piece and a tip.'}},
    {label:'Pay 60 gold',cost:60,win:{weapon:true,text:'She sells you her best piece.'}},
    {label:'Move on',win:{text:'The ring of her hammer fades behind you.'}}]},
  {id:'field',title:'The Old Battlefield',text:'Rusted arms and bones lie thick in the grass where two armies met long ago.',opts:[
    {label:'Search the fallen',a:'W',win:{weapon:true,text:'Beneath a broken shield lies a weapon still keen.'},lose:{fight:'rout',text:'The bones stir. Something did not rest.'}},
    {label:'Lay the dead to rest',cls:'cleric',auto:true,win:{heal:1,draft:true,text:'Sela speaks the rites. The dead sleep, and a fallen captain\'s ghost teaches you a trick of war.'}},
    {label:'Pass by',win:{text:'You leave the dead to their sleep.'}}]},
  {id:'well',title:'The Whispering Well',text:'Voices rise from a dry well, promising power to those who listen.',opts:[
    {label:'Listen closely',a:'P',win:{draft:true,text:'The voices teach a secret before fading.'},lose:{hurt:5,text:'The voices rise to a scream that rattles your bones.'},crit:{wound:1,text:'The voices find something in you and twist it.'}},
    {label:'Seal it with a ward',cls:'wizard',a:'W',win:{relic:true,text:'Orin\'s ward silences the voices. At the bottom lies what they guarded.'},lose:{hurt:4,text:'The ward cracks. A cold wind slams him back.'}},
    {label:'Toss in 20 gold',cost:20,win:{hdUp:1,text:'The well sighs. You feel rested.'}},
    {label:'Seal it with stones',win:{text:'The whispers stop.'}}]},

  {id:'gambler',ill:'merchant',title:'A Game of Bones',text:'A grinning stranger rattles three bones in a cup. "Thirty gold says you can\'t beat my throw."',opts:[
    {label:'Play: stake 30 gold',cost:30,a:'F',win:{gold:75,text:'Your bones come up sixes. The stranger pays, still grinning.'},lose:{text:'Snake eyes. The stranger pockets your gold.'}},
    {label:'Load the bones when he looks away',cls:'rogue',auto:true,win:{gold:50,text:'Vex palms a loaded bone. The stranger pays up, and stops grinning.'}},
    {label:'Read his tells',a:'P',win:{gold:35,text:'You see him palm a bone, and he pays you to keep quiet.'},lose:{gold:-15,text:'He spots you watching and charges you for the lesson.'}},
    {label:'Walk on',win:{text:'The rattle of bones fades behind you.'}}]},
  {id:'witch',ill:'well',title:'The Crossroads Witch',text:'Where four roads meet, a witch stirs a pot that smells of iron. "Power has a price," she says. "Blood will do."',opts:[
    {label:'Pay in blood (every hero takes 8 damage)',win:{dmg:8,relic:true,text:'She fills a vial from each of you, and hands over something that hums.'}},
    {label:'Trade secrets of the art',cls:'wizard',auto:true,win:{draft:true,text:'Orin and the witch talk until dawn. One of you learns a new trick.'}},
    {label:'Ask her what lies ahead',a:'W',win:{omen:true,text:'She reads the steam. You know what waits at the end of this road: every hero starts the boss battle with 1 more momentum.'},lose:{gold:-10,text:'She charges you 10 gold for a riddle.'}},
    {label:'Leave her to her pot',win:{text:'Her laughter follows you down the road.'}}]},
  {id:'deserter',ill:'hunter',title:'The Deserter',text:'A scarred orc sits by the road with his axe across his knees. He has left the warband, and they want him back.',opts:[
    {label:'Win his trust',a:'P',win:{omen:true,gold:15,text:'He tells you all he knows of the master he fled. Every hero starts the boss battle with 1 more momentum.'},lose:{fight:'ambush',text:'His old warband finds you both. Fight!'}},
    {label:'Spar with him, warrior to warrior',cls:'fighter',auto:true,win:{vic:1,text:'Brakka and the orc trade blows till both are grinning. He goes on his way, and the party feels sharp.'}},
    {label:'Turn him in for the bounty',win:{gold:40,text:'Forty gold, and a look you will remember.'}},
    {label:'Let him be',win:{text:'He nods once and limps away.'}}]},
  /* Dramatic tasks (Core Rules 4.4): every hero makes one attempt a round; success 1 token, an exploding roll 2, a
     critical failure loses 1. win / cost (1-2 short) / lose (more than 2 short). */
  {id:'fire',kind:'task',ill:'mist',title:'The Burning Mill',text:'Smoke pours from a mill by the river. Villagers are trapped on the upper floor, and the roof is going.',rounds:3,target:8,approaches:[
    {label:'Carry people out',a:'M'},{label:'Climb the waterwheel',a:'F'},{label:'Find the safe way through',a:'W'},{label:'Calm the crowd',a:'P'},
    {label:'Smash a wall open',a:'M',cls:'fighter'},{label:'Quench the flames with a prayer',a:'P',cls:'cleric'}],
    win:{gold:40,vic:1,text:'Every villager gets out. The miller presses his savings on you.'},cost:{vic:1,dmg:3,text:'Everyone gets out, but the heroes are scorched.'},lose:{dmg:6,text:'The roof falls in. Some are lost, and the heroes are burned.'}},
  {id:'river',kind:'task',ill:'bridge',title:'The Flooded Ford',text:'The ford is in flood. The wagon with your supplies must cross before the water rises any higher.',rounds:3,target:6,approaches:[
    {label:'Haul on the ropes',a:'M'},{label:'Lead the mules',a:'P'},{label:'Leap the stepping stones with a line',a:'F'},{label:'Read the current',a:'W'},
    {label:'Ward the wagon from the water',a:'W',cls:'wizard'}],
    win:{vic:1,hdUp:1,gold:15,text:'The wagon crosses dry. A good meal on the far bank.'},cost:{vic:1,gold:-15,text:'You cross, but a crate of coin is swept away.'},lose:{hd:1,gold:-20,text:'The wagon tips. You spend the night drying out what is left.'}},
  {id:'ritual',kind:'task',ill:'shrine',title:'The Moonrise Rite',text:'Cultists have fled a stone circle, leaving a rite half done. When the moon rises it will finish itself.',rounds:4,target:10,approaches:[
    {label:'Topple the standing stones',a:'M'},{label:'Snatch the idols from the altar',a:'F'},{label:'Unpick the circle',a:'W'},{label:'Chant against it',a:'P'},
    {label:'Counter the spell',a:'W',cls:'wizard'},{label:'Consecrate the ground',a:'P',cls:'cleric'}],
    win:{vic:1,relic:true,text:'The rite collapses. The cult\'s relic lies cold on the altar.'},cost:{vic:1,hurt:6,text:'The rite breaks, and its backlash catches one of you.'},lose:{fight:'rout',text:'The moon rises. Something answers the call.'}},

  /* Negotiations (Core Rules 4.5): up to three rounds; one argument a round, rolled by the best hero with Help.
     mood: -1 hostile, 0 wary, 1 friendly. Gifts and evidence (adv 1) help; offence (adv -1) hurts. results[tokens]. */
  {id:'captain',kind:'talk',ill:'toll',title:'The Gate Captain',text:'A tired captain holds the only bridge. His orders say no one crosses.',who:'The captain',request:'Let you cross, and lend you supplies.',mood:0,pay:25,args:[
    {label:'Appeal to his duty: the road needs clearing',a:'P'},{label:'Show him the raiders\' orders you found',a:'W',adv:1},{label:'Threaten him',a:'M',adv:-1},
    {label:'Soldier to soldier',a:'P',cls:'fighter',adv:1}],
    results:[{fight:'rout',text:'He calls his guards. So be it.'},{gold:-10,text:'He lets you cross, for a fee.'},{text:'He waves you through.'},{gold:30,hdUp:1,text:'He waves you through with a sack of supplies and a purse.'}]},
  {id:'guild',kind:'talk',ill:'merchant',title:'The Guild Master',text:'A guild master has a cellar full of old weapons and no one to sell them to.',who:'The guild master',request:'Sell you her best weapon cheap.',mood:1,pay:30,args:[
    {label:'Flatter her taste',a:'P'},{label:'Point out the flaws in her stock',a:'W'},{label:'Haggle hard',a:'P',adv:-1},
    {label:'Read the maker\'s marks',a:'W',cls:'wizard',adv:1}],
    results:[{text:'She shows you the door.'},{gold:-40,weapon:true,text:'She sells you a weapon at the full price.'},{gold:-15,weapon:true,text:'She sells you a weapon for a song.'},{weapon:true,gold:10,text:'She gives you the weapon, and a tip for clearing the road.'}]},
  {id:'chief',kind:'talk',ill:'mist',title:'The Hobgoblin Chief',text:'A hobgoblin chief and his warband block the pass. He is curious, and hungry.',who:'The chief',request:'Let you pass without a fight.',mood:-1,pay:40,args:[
    {label:'Offer him a better target',a:'W'},{label:'Stare him down',a:'P'},{label:'Show him your blades',a:'M',adv:1},
    {label:'Steal his banner while he talks',a:'F',cls:'rogue',adv:1}],
    results:[{fight:'rout',text:'He laughs and raises his axe.'},{gold:-20,text:'He takes a toll and lets you by.'},{text:'He lets you pass.'},{vic:1,gold:20,text:'He lets you pass, and pays you to go and bother his rivals.'}]},
];
