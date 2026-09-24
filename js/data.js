'use strict';
/* =====================================================================
   EMBERWATCH — rules data
   ===================================================================== */
const COLS=8,ROWS=8;
const ATTR={M:'Might',F:'Finesse',W:'Wits',P:'Presence'};
const ATTR_USE={M:'Force, endurance and heavy melee.',F:'Precision, agility, stealth and ranged weapons.',W:'Reasoning, magic and reading the environment.',P:'Conviction, leadership and reading people.'};
const SKILLS={Athletics:'M',Acrobatics:'F',Stealth:'F',Thievery:'F',Magic:'W',Lore:'W',Survival:'W',Insight:'P',Influence:'P'};
const RESULT=['Glancing','Solid','Crushing'];
const TUNE={budget0:6,budgetSlope:1.45,hpSlope:.06,dmgSlope:.45,rollStep:4,bossHp:.8,foeMomRound:1,summonAt:8,
  healAfter:.15,bossEscort:.4,pbBonus:3,fallenHp:.25,momTurn:2,momStart:1,actHeal:.6,maxLvl:12};

/* ---------------- HEROES ---------------- */
const CLASSES={
  fighter:{name:'Brakka',rival:'Grask',title:'Fighter',role:'Defender',hp:34,grow:5,speed:3,attrs:{M:3,F:1,W:0,P:1},prime:'M',second:'P',steady:1,
    skills:['Athletics','Survival'],start:['grind','tide','sweep'],
    trait:'Sentinel: her parting blows stop a foe in its tracks and mark it. A marked foe that attacks anyone else takes a hindrance, and she strikes it if it stands beside her. Gains momentum when hit.'},
  rogue:{name:'Vex',rival:'Shade',title:'Rogue',role:'Striker',hp:22,grow:3,speed:4,attrs:{M:0,F:3,W:1,P:1},prime:'F',second:'W',nimble:true,
    skills:['Acrobatics','Stealth','Thievery'],start:['pierce','knives','tumble'],
    trait:'Nimble: never provokes parting blows. Sneak Attack: extra damage on an attack with a boon. She gains a boon when an ally stands beside her target. Gains momentum on a sneak attack.'},
  wizard:{name:'Orin',rival:'Morvane',title:'Wizard',role:'Controller',hp:20,grow:3,speed:3,attrs:{M:0,F:1,W:3,P:0},prime:'W',second:'F',
    skills:['Magic','Lore'],start:['missile','thunder','frost'],
    trait:'Force Adept: his pushes and pulls move foes 1 extra square. Gains momentum when a power hits 2 or more foes or slams one into something.'},
  cleric:{name:'Sela',rival:'Ilsa',title:'Cleric',role:'Leader',hp:26,grow:4,speed:3,attrs:{M:1,F:0,W:1,P:3},prime:'P',second:'M',
    skills:['Insight','Influence','Lore'],start:['flame','brand','healWord'],
    trait:'Channel Divinity: her heals are stronger by her Presence. Radiant damage is doubled against undead. Gains momentum when she heals an ally.'},
};
const ORDER=['fighter','rogue','wizard','cleric'];
function attrsFor(cls,lvl){const C=CLASSES[cls];const a=Object.assign({},C.attrs);a[C.prime]+=(lvl>=4)+(lvl>=7)+(lvl>=10);a[C.second]+=(lvl>=6)+(lvl>=11);return a;}

/* a: attribute used. dmg: damage by result (Glancing/Solid/Crushing) before the attribute is added. eff values are by result too. */
const POWERS={
  /* ---- Fighter ---- */
  grind:{c:'fighter',lv:1,a:'M',name:'Grinding Strike',cost:0,tgt:'enemy',range:1,dmg:[3,6,9],mark:1,eff:{push:[0,0,1]},desc:'Mark the foe. Crushing: push 1.'},
  tide:{c:'fighter',lv:1,a:'M',name:'Tide of Iron',cost:0,tgt:'enemy',range:1,dmg:[2,4,6],mark:1,eff:{push:[1,1,2]},follow:true,desc:'Push the foe and step into the gap. Mark.'},
  sweep:{c:'fighter',lv:1,a:'M',name:'Sweeping Blow',cost:2,tgt:'self',area:1,aff:'foe',dmg:[2,4,6],mark:1,eff:{prone:[0,0,1]},desc:'Hit every foe around you, diagonals too, and mark them. Crushing: prone.'},
  cagi:{c:'fighter',lv:1,a:'P',name:'Come and Get It',cost:3,tgt:'self',area:2,aff:'foe',pullFirst:2,adjOnly:true,dmg:[2,4,6],mark:1,desc:'Pull every foe within 2 up to 2 squares toward you and mark them, then strike those beside you.'},
  shieldWall:{c:'fighter',lv:1,a:'M',name:'Shield Wall',cost:2,tgt:'self',area:1,aff:'ally',shield:6,markAround:1,desc:'You and allies around you gain 6 shield. Mark adjacent foes.'},
  hook:{c:'fighter',lv:3,a:'M',name:'Hook Chain',cost:2,tgt:'enemy',range:3,reach:true,dmg:[2,4,6],mark:1,eff:{pull:[1,2,3],slow:[0,1,1]},desc:'Reach 3. Pull the foe toward you. Solid: slowed. Mark.'},
  crush:{c:'fighter',lv:3,a:'M',name:'Crushing Blow',cost:3,tgt:'enemy',range:1,dmg:[5,8,11],mark:1,eff:{prone:[0,1,1],daze:[0,0,1]},desc:'Solid: prone. Crushing: dazed. Mark.'},
  hurl:{c:'fighter',lv:3,a:'M',name:'Hurl',cost:2,tgt:'enemy',range:1,dmg:[1,3,5],eff:{push:[2,3,4]},desc:'Heave the foe away. Perfect for throwing it into fire or lava.'},
  interpose:{c:'fighter',lv:5,a:'M',name:'Interpose',cost:2,tgt:'ally',range:3,noSelf:true,swap:true,shield:6,markAround:1,desc:'Swap places with an ally within 3. Both gain 6 shield; mark foes beside you.'},
  unbreak:{c:'fighter',lv:5,a:'M',name:'Unbreakable',cost:3,tgt:'self',area:2,aff:'foe',noDmg:true,selfHeal:12,mark:1,desc:'Heal 12 and mark every foe within 2.'},
  whirl:{c:'fighter',lv:7,a:'M',name:'Whirlwind',cost:5,tgt:'self',area:1,aff:'foe',dmg:[5,8,12],mark:1,eff:{push:[1,1,2]},desc:'Strike, push and mark every foe around you.'},
  quake:{c:'fighter',lv:7,a:'M',name:'Earthbreaker',cost:4,tgt:'self',area:1,aff:'foe',dmg:[3,5,7],mark:1,eff:{prone:[1,1,1],slow:[1,1,1]},desc:'Knock every foe around you prone and slow them.'},
  bastion:{c:'fighter',lv:9,a:'P',name:'Last Bastion',cost:5,tgt:'self',area:3,aff:'ally',heal:8,shield:8,markAround:2,desc:'Allies within 3 heal 8 and gain 8 shield. Mark foes within 2.'},
  titan:{c:'fighter',lv:9,a:'M',name:"Titan's Blow",cost:6,tgt:'enemy',range:1,dmg:[10,15,21],mark:1,eff:{push:[2,3,4]},desc:'A colossal blow that hurls the foe away.'},
  cleave:{c:'fighter',lv:1,a:'M',name:'Cleave',cost:0,tgt:'enemy',range:1,dmg:[2,4,6],mark:1,cleave:true,desc:'Mark the foe. Another foe beside you takes damage equal to your Might.'},
  spin:{c:'fighter',lv:3,a:'M',name:'Leg Sweep',cost:2,tgt:'enemy',range:1,dmg:[3,5,7],mark:1,eff:{prone:[1,1,1]},desc:'Knock the foe prone. Mark.'},
  /* ---- Rogue ---- */
  pierce:{c:'rogue',lv:1,a:'F',name:'Piercing Strike',cost:0,tgt:'enemy',range:1,dmg:[3,6,9],desc:'A precise thrust.'},
  knives:{c:'rogue',lv:1,a:'F',name:'Knife Toss',cost:0,tgt:'enemy',range:4,dmg:[2,4,6],proj:'#e6ecf2',desc:'Range 4.'},
  tumble:{c:'rogue',lv:1,a:'F',name:'Hit and Run',cost:1,tgt:'enemy',range:1,dmg:[3,5,8],canto:2,desc:'Strike, then move up to 2 more squares.'},
  deepcut:{c:'rogue',lv:1,a:'F',name:'Deep Cut',cost:2,tgt:'enemy',range:1,dmg:[3,5,7],eff:{bleed:[2,2,3]},desc:'The foe is bleeding.'},
  shadow:{c:'rogue',lv:1,a:'F',name:'Shadowstep',cost:3,tgt:'enemy',range:5,teleportAdj:true,edge:1,dmg:[4,7,10],desc:'Teleport beside a foe within 5 and strike with a boon.'},
  barrage:{c:'rogue',lv:3,a:'F',name:'Blinding Barrage',cost:3,tgt:'self',area:1,aff:'foe',dmg:[2,4,6],eff:{daze:[0,1,1]},desc:'Hit every foe around you. Solid: dazed.'},
  vanish:{c:'rogue',lv:3,a:'F',name:'Vanish',cost:2,tgt:'self',free:true,hide:true,freeMove:2,desc:'Free action. Become hidden and gain 2 more movement.'},
  assassinate:{c:'rogue',lv:5,a:'F',name:'Assassinate',cost:5,tgt:'enemy',range:1,dmg:[6,10,14],execute:true,desc:'Double damage against a foe at half health or less.'},
  twin:{c:'rogue',lv:5,a:'F',name:'Twin Fangs',cost:3,tgt:'enemy',range:1,dmg:[3,5,7],hits:2,desc:'Strike twice.'},
  dance:{c:'rogue',lv:7,a:'F',name:'Dance of Blades',cost:5,tgt:'self',area:1,aff:'foe',dmg:[4,7,10],canto:3,desc:'Strike every foe around you, then move 3.'},
  cripple:{c:'rogue',lv:7,a:'F',name:'Crippling Shot',cost:3,tgt:'enemy',range:5,dmg:[3,5,8],eff:{slow:[1,1,0],root:[0,0,1],expose:[1,1,1]},proj:'#e6ecf2',desc:'Range 5. Slowed and exposed. Crushing: rooted.'},
  deathmark:{c:'rogue',lv:9,a:'F',name:'Death Mark',cost:4,tgt:'enemy',range:6,dmg:[4,6,9],eff:{expose:[2,2,2],bleed:[2,2,3]},gainRes:2,proj:'#9a7bff',desc:'Range 6. Exposed and bleeding. Regain 2 momentum.'},
  cuts:{c:'rogue',lv:9,a:'F',name:'Thousand Cuts',cost:6,tgt:'enemy',range:1,dmg:[4,7,10],hits:3,desc:'Strike three times.'},
  sly:{c:'rogue',lv:1,a:'P',name:'Sly Flourish',cost:2,tgt:'enemy',range:1,dmg:[3,6,9],eff:{daze:[0,1,1]},desc:'Solid: dazed.'},
  position:{c:'rogue',lv:3,a:'F',name:'Positioning Strike',cost:2,tgt:'enemy',range:1,dmg:[2,4,6],eff:{push:[1,2,3]},desc:'Push the foe where you want it.'},
  /* ---- Wizard ---- */
  missile:{c:'wizard',lv:1,a:'W',name:'Magic Missile',cost:0,tgt:'enemy',range:5,dmg:[2,4,5],proj:'#c39bff',desc:'Range 5.'},
  thunder:{c:'wizard',lv:1,a:'W',name:'Thunderwave',cost:0,tgt:'self',area:1,aff:'foe',dmg:[1,2,4],eff:{push:[1,2,3]},desc:'Push every foe around you away.'},
  frost:{c:'wizard',lv:1,a:'W',name:'Ray of Frost',cost:2,tgt:'enemy',range:4,dmg:[2,4,6],eff:{slow:[1,1,1],root:[0,0,1]},proj:'#8fe3ff',desc:'Range 4. Slowed. Crushing: rooted.'},
  fireball:{c:'wizard',lv:1,a:'W',name:'Fireball',cost:4,tgt:'tile',range:4,area:1,aff:'foe',dmg:[3,6,9],fx:'fire',igniteCenter:true,desc:'Range 4. Blast a 3x3 area. The centre bursts into fire.'},
  web:{c:'wizard',lv:1,a:'W',name:'Web',cost:3,tgt:'tile',range:4,area:1,aff:'foe',dmg:[1,2,3],eff:{slow:[1,0,0],root:[0,1,1]},fx:'web',webArea:true,desc:'Range 4, 3x3. Slowed; Solid: rooted. Empty squares fill with web.'},
  blink:{c:'wizard',lv:3,a:'W',name:'Blink',cost:1,tgt:'tile',range:4,teleport:true,free:true,desc:'Free action. Teleport up to 4 squares.'},
  icewall:{c:'wizard',lv:3,a:'W',name:'Wall of Ice',cost:3,tgt:'tile',range:4,wall:true,desc:'Raise a 3-square wall of ice for 2 rounds. Blocks movement and sight.'},
  repulse:{c:'wizard',lv:3,a:'W',name:'Repulsion',cost:2,tgt:'enemy',range:3,dmg:[2,3,5],eff:{push:[2,3,4]},proj:'#c39bff',desc:'Range 3. Push the foe far away.'},
  cloud:{c:'wizard',lv:5,a:'W',name:'Stinking Cloud',cost:4,tgt:'tile',range:4,area:1,aff:'foe',dmg:[1,2,3],eff:{weak:[1,1,1]},zone:{dmg:3,eff:'weak'},fx:'poison',desc:'3x3 zone for 2 rounds: foes starting a turn inside take 3 damage and are weakened.'},
  chain:{c:'wizard',lv:5,a:'W',name:'Chain Lightning',cost:5,tgt:'enemy',range:4,dmg:[4,7,10],chain:2,proj:'#fff27a',desc:'Range 4. Arcs to 2 more foes within 3.'},
  hypno:{c:'wizard',lv:7,a:'W',name:'Hypnotic Pattern',cost:4,tgt:'tile',range:4,area:1,aff:'foe',noDmg:true,eff:{slow:[1,0,0],daze:[0,1,1],expose:[0,1,1]},fx:'arcane',desc:'3x3. Slowed; Solid: dazed and exposed.'},
  gravity:{c:'wizard',lv:7,a:'W',name:'Gravity Well',cost:4,tgt:'tile',range:4,area:2,aff:'foe',pullCenter:2,dmg:[2,3,5],eff:{prone:[0,0,1]},fx:'arcane',desc:'5x5. Pull every foe 2 toward the centre.'},
  meteor:{c:'wizard',lv:9,a:'W',name:'Meteor Swarm',cost:6,tgt:'tile',range:6,area:2,aff:'foe',dmg:[5,8,12],eff:{prone:[0,1,1]},fx:'fire',igniteCenter:true,desc:'Range 6, 5x5 blast. Solid: prone.'},
  disint:{c:'wizard',lv:9,a:'W',name:'Disintegrate',cost:5,tgt:'enemy',range:4,dmg:[8,12,18],proj:'#7dff8a',desc:'Range 4. An annihilating ray.'},
  scorch:{c:'wizard',lv:1,a:'W',name:'Scorching Burst',cost:1,tgt:'tile',range:5,area:1,aff:'foe',dmg:[1,2,3],fx:'fire',igniteCenter:true,desc:'Range 5. Small 3x3 burst. The centre catches fire.'},
  daggers:{c:'wizard',lv:3,a:'W',name:'Cloud of Daggers',cost:2,tgt:'tile',range:4,area:0,aff:'foe',dmg:[2,4,6],zone:{dmg:3,r:0},fx:'arcane',desc:'Range 4. Whirling blades fill one square for 2 rounds.'},
  /* ---- Cleric ---- */
  flame:{c:'cleric',lv:1,a:'P',name:'Sacred Flame',cost:0,tgt:'enemy',range:4,dmg:[2,4,5],radiant:true,healNear:3,proj:'#ffe38a',desc:'Range 4, radiant. Your most wounded ally within 3 heals 3.'},
  brand:{c:'cleric',lv:1,a:'M',name:'Righteous Brand',cost:0,tgt:'enemy',range:1,dmg:[2,4,6],eff:{expose:[1,1,1]},desc:'The foe is exposed.'},
  healWord:{c:'cleric',lv:1,a:'P',name:'Healing Word',cost:1,tgt:'ally',range:4,heal:7,cleanse:true,desc:'Range 4. Heal 7 and end conditions.'},
  bless:{c:'cleric',lv:1,a:'P',name:'Bless',cost:2,tgt:'self',area:2,aff:'ally',empower:1,desc:'You and allies within 2 are blessed until the end of their next turn.'},
  sanct:{c:'cleric',lv:1,a:'P',name:'Sanctuary',cost:2,tgt:'ally',range:4,heal:3,shield:10,desc:'Range 4. Heal 3 and gain 10 shield.'},
  inspire:{c:'cleric',lv:3,a:'P',name:'Inspire',cost:4,tgt:'ally',range:3,noSelf:true,refresh:true,desc:'An ally within 3 immediately takes an extra turn after yours.'},
  turn:{c:'cleric',lv:3,a:'P',name:'Turn Undead',cost:3,tgt:'self',area:2,aff:'undead',dmg:[2,4,6],radiant:true,eff:{push:[1,2,2],daze:[0,0,1]},desc:'Undead within 2 take radiant damage and are pushed back.'},
  burst:{c:'cleric',lv:5,a:'P',name:'Radiant Burst',cost:4,tgt:'self',area:1,aff:'foe',dmg:[3,5,8],radiant:true,allyHeal:4,desc:'Radiant blast around you. Nearby allies heal 4.'},
  guide:{c:'cleric',lv:5,a:'P',name:'Guiding Bolt',cost:3,tgt:'enemy',range:5,dmg:[4,7,10],radiant:true,eff:{expose:[1,1,2]},proj:'#ffe38a',desc:'Range 5, radiant. The foe is exposed.'},
  healStrike:{c:'cleric',lv:3,a:'M',name:'Healing Strike',cost:2,tgt:'enemy',range:1,dmg:[3,5,8],radiant:true,mark:1,healNear:8,desc:'Radiant strike that marks the foe. Your most wounded ally within 3 heals 8.'},
  beacon:{c:'cleric',lv:5,a:'P',name:'Beacon of Hope',cost:4,tgt:'self',area:3,aff:'foe',noDmg:true,eff:{weak:[1,1,1]},allyHeal:6,desc:'Foes within 3 are weakened. Allies within 3 heal 6.'},
  massHeal:{c:'cleric',lv:7,a:'P',name:'Mass Cure',cost:5,tgt:'self',area:99,aff:'ally',heal:12,cleanse:true,desc:'Every ally heals 12 and ends conditions.'},
  guardians:{c:'cleric',lv:7,a:'P',name:'Spirit Guardians',cost:4,tgt:'self',area:1,aff:'foe',dmg:[2,3,4],radiant:true,zone:{dmg:4,eff:'slow',radiant:true},fx:'holy',desc:'3x3 zone for 2 rounds: foes starting a turn inside take 4 radiant and are slowed.'},
  revive:{c:'cleric',lv:9,a:'P',name:'Revivify',cost:5,tgt:'self',revive:true,desc:'A fallen hero rises beside you with 40% health.'},
  holy:{c:'cleric',lv:9,a:'P',name:'Holy Word',cost:6,tgt:'self',area:3,aff:'foe',dmg:[4,7,10],radiant:true,eff:{daze:[0,1,1]},allyHeal:8,fx:'holy',desc:'Foes within 3 take radiant damage; Solid: dazed. Allies within 3 heal 8.'},
};
for(const k in POWERS)POWERS[k].id=k;

/* ---------------- MONSTERS ---------------- */
/* attrs: M/F/W/P. Each attack names the attribute it rolls with. 'flat' attacks never roll. */
const MON={
  runner:{name:'Goblin Runner',role:'Swarm',act:0,art:'goblin',hp:5,speed:4,attrs:{M:0,F:2,W:0,P:0},swarm:true,cost:.7,acts:[{name:'Stab',range:1,flat:3}]},
  sniper:{name:'Goblin Sniper',role:'Artillery',act:0,art:'goblinArcher',hp:10,speed:3,attrs:{M:0,F:2,W:1,P:0},cost:2,skulk:true,acts:[{name:'Arrow',a:'F',range:5,dmg:[2,4,6]}],note:'Slips 1 square away after shooting.'},
  trapper:{name:'Goblin Trapper',role:'Ambusher',act:0,art:'trapper',hp:12,speed:3,attrs:{M:1,F:2,W:1,P:0},cost:2,acts:[{name:'Hatchet',a:'F',range:1,dmg:[2,4,6]},{name:'Set Snare',range:3,trap:'trap',cd:2}],note:'Hides snares on the battlefield.'},
  wolf:{name:'Dire Wolf',role:'Harrier',act:0,art:'wolf',hp:14,speed:5,attrs:{M:1,F:2,W:0,P:0},cost:2,nimble:true,pack:true,acts:[{name:'Bite',a:'F',range:1,dmg:[2,4,6],eff:{prone:[0,0,1]}}],note:'Pack: boon when another foe stands beside its prey. Nimble.'},
  hobgob:{name:'Hobgoblin Guard',role:'Defender',act:0,art:'hobgoblin',hp:22,speed:3,attrs:{M:2,F:1,W:0,P:1},steady:1,cost:3,acts:[{name:'Spear Wall',a:'M',range:1,dmg:[3,5,7],eff:{mark:[0,1,1]}}],note:'Solid: marks the hero.'},
  orc:{name:'Orc Brute',role:'Brute',act:0,art:'orc',hp:28,speed:3,attrs:{M:3,F:0,W:0,P:0},cost:3,savage:true,acts:[{name:'Greataxe',a:'M',range:1,dmg:[3,6,9],eff:{push:[0,1,2]}}],note:'Savage: +2 damage to bloodied heroes.'},
  hexer:{name:'Goblin Hexer',role:'Support',act:0,art:'goblinShaman',hp:14,speed:3,attrs:{M:0,F:1,W:2,P:1},cost:3,acts:[{name:'Hex Bolt',a:'W',range:4,dmg:[2,3,5],eff:{slow:[0,1,1],weak:[0,0,1]}},{name:'Mend',tgt:'ally',range:4,heal:7}],note:'Heals allies.'},
  captain:{name:'Bandit Captain',role:'Leader',act:0,art:'bandit',hp:32,speed:4,attrs:{M:2,F:3,W:1,P:2},cost:5,aura:true,acts:[{name:'Sabre',a:'F',range:1,dmg:[4,6,9]},{name:'Rally',tgt:'self',cost:2,rally:true}],note:'Aura: allies within 2 gain a boon. Rally: allies beside heroes strike.'},
  warlord:{name:'Orc Warlord',role:'Boss',act:0,art:'warlord',hp:80,speed:4,attrs:{M:3,F:1,W:1,P:3},steady:2,boss:true,attacks:2,acts:[{name:'Cleaving Axe',a:'M',range:1,dmg:[4,7,10],eff:{push:[1,1,2]}},{name:'Hurled Axe',a:'M',range:4,dmg:[3,5,7],cost:2}],va:['horde','warcry','laststand'],note:'Attacks twice. Boss surges on rounds 1, 3 and 5.'},
  bats:{name:'Bat Swarm',role:'Swarm',act:1,art:'bat',hp:4,speed:5,attrs:{M:0,F:2,W:0,P:0},swarm:true,nimble:true,cost:.7,acts:[{name:'Bite',range:1,flat:3}]},
  skeleton:{name:'Skeleton',role:'Defender',act:1,art:'skeleton',hp:16,speed:3,attrs:{M:2,F:1,W:0,P:0},undead:true,reassemble:true,cost:2,acts:[{name:'Rusty Blade',a:'M',range:1,dmg:[3,5,7],eff:{mark:[0,0,1]}}],note:'Reassembles once unless slain by radiant damage.'},
  skarcher:{name:'Skeleton Archer',role:'Artillery',act:1,art:'skeletonArcher',hp:12,speed:3,attrs:{M:0,F:2,W:0,P:0},undead:true,cost:2,acts:[{name:'Bone Arrow',a:'F',range:5,dmg:[2,4,6]}]},
  zombie:{name:'Barrow Zombie',role:'Brute',act:1,art:'zombie',hp:32,speed:2,attrs:{M:2,F:0,W:0,P:0},undead:true,cost:3,acts:[{name:'Grave Grasp',a:'M',range:1,dmg:[4,6,9],eff:{root:[0,1,1]}}],note:'Solid: rooted.'},
  ghoul:{name:'Ghoul',role:'Harrier',act:1,art:'ghoul',hp:18,speed:4,attrs:{M:1,F:2,W:0,P:0},undead:true,nimble:true,cost:3,acts:[{name:'Paralyzing Claw',a:'F',range:1,dmg:[2,4,6],eff:{daze:[0,0,1],slow:[0,1,0]}}],note:'Nimble. Crushing: dazed.'},
  spider:{name:'Barrow Spider',role:'Ambusher',act:1,art:'spider',hp:15,speed:4,attrs:{M:1,F:2,W:0,P:0},cost:2,acts:[{name:'Venom Bite',a:'F',range:1,dmg:[2,4,6],eff:{bleed:[0,2,2]}},{name:'Web Spit',a:'F',range:4,dmg:[1,2,3],eff:{root:[1,1,1]},cost:2,hazard:'web'}],note:'Spits web that roots its prey.'},
  ooze:{name:'Grave Ooze',role:'Brute',act:1,art:'ooze',hp:26,speed:2,attrs:{M:2,F:0,W:0,P:0},cost:3,acidDeath:true,acts:[{name:'Acid Slam',a:'M',range:1,dmg:[3,5,7],eff:{weak:[0,1,1]}},{name:'Acid Spit',a:'M',range:3,dmg:[1,2,3],cost:2,hazard:'acid'}],note:'Spits pools of acid. Leaves acid where it dies.'},
  cultist:{name:'Grave Cultist',role:'Hexer',act:1,art:'cultist',hp:14,speed:3,attrs:{M:0,F:1,W:2,P:1},cost:3,acts:[{name:'Withering Curse',a:'W',range:4,dmg:[2,4,6],eff:{weak:[0,1,1],bleed:[0,0,2]}},{name:'Dark Offering',tgt:'self',mom:2}],note:'Can bleed itself to feed the foes\' momentum.'},
  wight:{name:'Barrow Wight',role:'Champion',act:1,art:'wight',hp:44,speed:3,attrs:{M:3,F:1,W:1,P:2},steady:1,undead:true,drain:true,aura:true,cost:6,acts:[{name:'Draining Touch',a:'M',range:1,dmg:[4,7,10],eff:{weak:[1,1,1]}}],note:'Heals half the damage it deals. Aura: allies within 2 gain a boon.'},
  lich:{name:'The Lich',role:'Boss',act:1,art:'lich',hp:80,speed:3,attrs:{M:0,F:1,W:4,P:3},steady:2,undead:true,boss:true,attacks:1,summon:'skeleton',acts:[{name:'Necrotic Bolt',a:'W',range:5,dmg:[4,7,10],eff:{weak:[0,0,1]}},{name:'Grave Chill',a:'W',range:4,area:1,dmg:[3,5,7],eff:{slow:[1,1,1]},cost:3}],va:['raise','siphon','nova'],note:'Raises skeletons. Boss surges on rounds 1, 3 and 5.'},
  imp:{name:'Ember Imp',role:'Swarm',act:2,art:'imp',hp:5,speed:5,attrs:{M:0,F:2,W:1,P:0},swarm:true,nimble:true,fireDeath:true,cost:.7,acts:[{name:'Firebolt',range:3,flat:3}],note:'Bursts into fire when slain.'},
  gnoll:{name:'Gnoll Marauder',role:'Harrier',act:2,art:'gnoll',hp:24,speed:4,attrs:{M:3,F:1,W:0,P:0},savage:true,cost:3,acts:[{name:'Flail',a:'M',range:1,dmg:[3,6,8],eff:{bleed:[0,0,2]}}],note:'Savage: +2 damage to bloodied heroes.'},
  priest:{name:'Cinder Priest',role:'Leader',act:2,art:'firePriest',hp:22,speed:3,attrs:{M:0,F:1,W:2,P:3},aura:true,cost:4,acts:[{name:'Scorch',a:'P',range:4,dmg:[3,5,7],eff:{burn:[1,1,2]}},{name:'Kindle',range:4,trap:'fire',cd:2},{name:'Mend',tgt:'ally',range:4,heal:8}],note:'Sets the ground on fire. Aura: allies within 2 gain a boon.'},
  drake:{name:'Fire Drake',role:'Artillery',act:2,art:'drake',hp:28,speed:4,attrs:{M:2,F:2,W:0,P:0},cost:4,acts:[{name:'Firespit',a:'F',range:4,dmg:[3,5,8],eff:{burn:[0,1,1]}},{name:'Flame Breath',a:'F',range:3,area:1,dmg:[3,5,7],cost:3,hazard:'fire'}],note:'Flame Breath leaves fire behind.'},
  ogre:{name:'Ogre Smasher',role:'Champion',act:2,art:'ogre',hp:54,speed:3,attrs:{M:4,F:0,W:0,P:0},steady:2,cost:6,acts:[{name:'Greatclub',a:'M',range:1,dmg:[5,8,12],eff:{push:[1,2,3],prone:[0,0,1]}}]},
  hulk:{name:'Magma Hulk',role:'Controller',act:2,art:'magma',hp:38,speed:3,attrs:{M:3,F:0,W:0,P:0},steady:1,trail:true,cost:5,acts:[{name:'Molten Fist',a:'M',range:1,dmg:[4,6,9],eff:{slow:[1,1,1],burn:[0,1,1]}}],note:'Leaves a trail of fire where it walks.'},
  dragon:{name:'Ashen Dragon',role:'Boss',act:2,art:'dragon',hp:140,speed:4,attrs:{M:4,F:2,W:2,P:3},steady:3,boss:true,attacks:2,fireproof:true,acts:[{name:'Rending Claws',a:'M',range:1,dmg:[5,8,12]},{name:'Tail Lash',a:'M',range:2,dmg:[4,6,9],eff:{push:[1,2,2]}},{name:'Fire Breath',a:'M',range:3,area:1,dmg:[5,8,11],cost:3,hazard:'fire'}],va:['presence','buffet','inferno'],note:'Attacks twice. Boss surges on rounds 1, 3 and 5.'},
  horror:{name:'Bound Horror',role:'Champion',act:-1,art:'horror',hp:50,speed:3,attrs:{M:3,F:1,W:2,P:0},steady:2,cost:0,acts:[{name:'Rending Tendrils',a:'M',range:2,dmg:[5,8,11],eff:{pull:[1,1,2]}}]},
  pillar:{name:'Ritual Pillar',role:'Object',act:-1,art:'pillar',hp:18,speed:0,attrs:{M:0,F:0,W:0,P:0},object:true,cost:0,acts:[]},
};
for(const k in MON){MON[k].id=k;MON[k].fireproof=MON[k].fireproof||['imp','priest','drake','hulk'].includes(k);}
const VA={
  horde:{name:'Rally the Horde',desc:'Goblins pour in and every foe gains a boon this round.'},
  warcry:{name:'Warcry',desc:'Heroes within 3 are weakened and marked.'},
  laststand:{name:'Last Stand',desc:'The Warlord heals and his momentum surges.'},
  raise:{name:'Raise the Dead',desc:'Bones knit together across the moor.'},
  siphon:{name:'Soul Siphon',desc:'Every hero within 4 bleeds life into the Lich.'},
  nova:{name:'Death Nova',desc:'A wave of necrotic power washes over the heroes.'},
  presence:{name:'Terrifying Presence',desc:'Every hero is weakened. The foes gain momentum.'},
  buffet:{name:'Wing Buffet',desc:'Heroes within 2 are pushed away and knocked prone.'},
  inferno:{name:'Inferno',desc:'The dragon floods a row with fire.'},
};
const ACT_POOL=[['runner','sniper','trapper','wolf','hobgob','orc','hexer'],['bats','skeleton','skarcher','zombie','ghoul','spider','ooze','cultist','wight'],['imp','gnoll','priest','drake','ogre','hulk','cultist','orc']];
const SWARM=['runner','bats','imp'];
const LEADERS=['captain','wight','priest'];
const ELITES=[['captain','orc','hobgob'],['wight','zombie','ooze'],['ogre','hulk','drake']];
const BOSSES=['warlord','lich','dragon'];
const ACTS=[{name:'Act I',sub:'The Greenmarch'},{name:'Act II',sub:'The Barrow Moors'},{name:'Act III',sub:'The Ashen Waste'}];

/* ---------------- HAZARDS & TERRAIN ---------------- */
const HAZ={
  fire:{name:'Fire',dmg:3,st:{burn:1},desc:'Deals 3 damage and sets burning when a creature enters it or starts its turn in it.'},
  acid:{name:'Acid Pool',dmg:3,st:{weak:1},desc:'Deals 3 damage and weakens a creature that enters it or starts its turn in it.'},
  lava:{name:'Lava',dmg:8,st:{burn:2},desc:'Deals 8 damage and sets burning when a creature enters it or starts its turn in it.'},
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
  map:{name:"Tactician's Map",price:140,desc:'+1 momentum for every hero at the start of their turn.'},
  phoenix:{name:'Phoenix Feather',price:130,desc:'The first hero to fall each battle rises at half health.'},
  fang:{name:'Vampire Fang',price:110,desc:'A hero heals 4 whenever they slay a foe.'},
  bulwark:{name:'Bulwark Sigil',price:100,desc:'Heroes start each battle with 8 shield.'},
  dice:{name:'Loaded Bones',price:150,desc:'+1 to every hero attack roll.'},
  lens:{name:'Sentinel Lens',price:90,desc:'Hero parting blows deal +3 damage.'},
  ward:{name:'Warding Charm',price:110,desc:'Each foe takes a hindrance on its first attack against each hero each battle.'},
  scale:{name:'Salamander Scale',price:100,desc:'Heroes ignore fire and lava damage and cannot be set burning.'},
  gauntlet:{name:'Gauntlet of Force',price:120,desc:'Hero pushes and pulls move 1 extra square.'},
  fenboots:{name:'Fenwalker Boots',price:90,desc:'Heroes ignore difficult terrain.'},
  hourglass:{name:'Hourglass of Haste',price:80,desc:'Heroes add 3 to their initiative rolls.'},
  coin:{name:'Lucky Coin',price:70,desc:'Earn 50% more gold.'},
  waterskin:{name:'Healer\'s Satchel',price:90,desc:'Heroes heal an extra 15% after every battle.'},
};
const RELIC_ICON={boots:'↑',whetstone:'◆',heart:'♥',hymn:'♦',map:'★',phoenix:'▲',fang:'v',bulwark:'⛨',dice:'#',lens:'o',ward:'*',scale:'~',gauntlet:'→',fenboots:'≈',hourglass:'8',coin:'$',waterskin:'+'};
const RELIC_COL={boots:'#c89060',whetstone:'#8ac8f0',heart:'#e04848',hymn:'#e0b040',map:'#e0d0a0',phoenix:'#ff8a30',fang:'#e8e8e8',bulwark:'#6a9ae0',dice:'#f0f0f0',lens:'#8ae0c0',ward:'#b08af0',scale:'#ff6a3a',gauntlet:'#a8b0b8',fenboots:'#6ab070',hourglass:'#e0c070',coin:'#ffd040',waterskin:'#80d090'};

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
const MISSION_BY_ACT=[['rout','ambush','hold','rescue','loot'],['rout','hold','rescue','loot','survive','assassinate','ritual'],['rout','ambush','survive','assassinate','ritual','defend','breakout','loot']];
const BOSS_TXT=['The Orc Warlord attacks twice, pushes heroes aside and calls in his horde.','The Lich raises the dead and drains the living.','The Ashen Dragon attacks twice, breathes fire and scatters heroes with its wings.'];

/* ---------------- GLOSSARY (clickable keywords) ---------------- */
const GLOSS={
  might:{name:'Might',forms:['might'],text:'Force, endurance and heavy melee powers. Skill: Athletics.'},
  finesse:{name:'Finesse',forms:['finesse'],text:'Precision, agility, stealth and ranged weapons. Also adds to initiative. Skills: Acrobatics, Stealth, Thievery.'},
  wits:{name:'Wits',forms:['wits'],text:'Reasoning, magic and reading the environment. Skills: Magic, Lore, Survival.'},
  presence:{name:'Presence',forms:['presence'],text:'Conviction, leadership and reading people. Skills: Insight, Influence.'},
  attack:{name:'Attack Roll',forms:['attack roll','attack rolls'],text:'Roll 3d6 and add the attribute the power uses. 10 or less is Glancing, 11 to 14 is Solid, 15 or more is Crushing. A natural 16 or more on the dice is always Crushing. Each net boon adds 2; each net hindrance subtracts 2 (at most 2 either way).'},
  glancing:{name:'Glancing',forms:['glancing'],text:'The weakest result of an attack roll: 10 or less.'},
  solid:{name:'Solid',forms:['solid'],text:'The middle result of an attack roll: 11 to 14. Effects listed as "Solid" also happen on a Crushing result.'},
  crushing:{name:'Crushing',forms:['crushing'],text:'The best result of an attack roll: 15 or more, or a natural 16 or more on the dice.'},
  boon:{name:'Boon',forms:['boon','boons'],text:'+2 to an attack roll. Boons come from flanking, high ground, exposed, prone, dazed or rooted targets, being blessed or hidden, and some powers. Boons and hindrances cancel out.'},
  hindrance:{name:'Hindrance',forms:['hindrance','hindrances'],text:'-2 to an attack roll. Hindrances come from being weakened, prone or marked by someone else, a target in cover, or shooting while a foe stands beside you.'},
  momentum:{name:'Momentum',forms:['momentum'],text:'Heroes build momentum each turn and through their class trait, and spend it on stronger powers. Foes share a pool of momentum that grows each round; they spend it on brutal attacks (a boon), special attacks and reinforcements.'},
  initiative:{name:'Initiative',forms:['initiative'],text:'At the start of a battle everyone rolls d20 + Finesse. Turns go from highest to lowest, heroes and foes mixed together. The order repeats every round.'},
  parting:{name:'Parting Blow',forms:['parting blows','parting blow'],text:'When a creature moves out of a square beside a foe, that foe may use its reaction to strike it for free. Nimble creatures never provoke. Each creature has one reaction per round.'},
  reaction:{name:'Reaction',forms:['reaction'],text:'Each creature has one reaction per round, used for parting blows. It returns at the start of its turn.'},
  mark:{name:'Marked',forms:['marks','marked','mark'],text:'A marked creature takes a hindrance on attacks that don\'t include whoever marked it. A fighter who marks a foe strikes it when it attacks someone else while beside her.'},
  push:{name:'Push',forms:['pushes','pushed','push'],text:'Move the target directly away. If it hits an obstacle, a creature or the edge, it takes slam damage. Pushing a foe into fire, acid or lava makes it suffer the hazard.'},
  pull:{name:'Pull',forms:['pulls','pulled','pull'],text:'Move the target directly toward the source. It suffers any hazard it is dragged through.'},
  slam:{name:'Slam',forms:['slams','slam'],text:'A creature pushed into something takes 2 damage plus 1 for each square of push left.'},
  steady:{name:'Steadfast',forms:['steadfast'],text:'Reduces how far this creature is pushed or pulled.'},
  prone:{name:'Prone',forms:['prone'],text:'Knocked down. Melee attacks against it have a boon; its own attacks have a hindrance; its speed is halved. Lasts until the end of its next turn.'},
  daze:{name:'Dazed',forms:['dazed','daze'],text:'Can move or act on its turn, not both, and cannot take reactions.'},
  slow:{name:'Slowed',forms:['slowed','slow'],text:'Speed drops to 1.'},
  root:{name:'Rooted',forms:['rooted','roots','root'],text:'Cannot move. Attacks against it have a boon.'},
  weak:{name:'Weakened',forms:['weakened','weakens','weak'],text:'Takes a hindrance on its attacks.'},
  bleed:{name:'Bleeding',forms:['bleeding','bleeds','bleed'],text:'Takes damage at the start of each of its turns.'},
  burn:{name:'Burning',forms:['burning'],text:'Takes 3 fire damage at the start of each of its turns. Stepping into water puts it out.'},
  expose:{name:'Exposed',forms:['exposed','expose'],text:'Attacks against it have a boon.'},
  bless:{name:'Blessed',forms:['blessed','bless'],text:'Attacks with a boon.'},
  hidden:{name:'Hidden',forms:['hidden','hide'],text:'Unseen. The next attack has two boons, then the creature is revealed.'},
  shield:{name:'Shield',forms:['shield'],text:'Absorbs damage before health. Shields fade at the start of the owner\'s turn.'},
  flank:{name:'Flanking',forms:['flanking','flank'],text:'A melee attack has a boon when an ally stands on the far side of the target.'},
  cover:{name:'Cover',forms:['cover'],text:'Crates, low walls and gravestones give cover: a ranged attack against a creature standing behind one takes a hindrance. Tall obstacles block sight completely.'},
  high:{name:'High Ground',forms:['high ground'],text:'Raised ground. Attacks from high ground against creatures below have a boon, and ranged powers reach 1 square further.'},
  difficult:{name:'Difficult Terrain',forms:['difficult terrain'],text:'Water, brambles, rubble and ash cost 2 movement to enter.'},
  hazard:{name:'Hazard',forms:['hazards','hazard'],text:'Fire, acid, lava, snares and webs. Creatures suffer a hazard when they enter it, even when pushed or pulled in, or start their turn in it.'},
  fire:{name:'Fire',forms:['fire'],text:HAZ.fire.desc},
  acid:{name:'Acid',forms:['acid'],text:HAZ.acid.desc},
  lava:{name:'Lava',forms:['lava'],text:HAZ.lava.desc},
  snare:{name:'Snare',forms:['snares','snare'],text:HAZ.trap.desc},
  web:{name:'Web',forms:['web'],text:HAZ.web.desc},
  sneak:{name:'Sneak Attack',forms:['sneak attack'],text:'The rogue deals 2 extra damage (more at higher levels) on any attack with a boon.'},
  nimble:{name:'Nimble',forms:['nimble'],text:'Never provokes parting blows.'},
  swarm:{name:'Swarm',forms:['swarm'],text:'Weak foes that come in packs. Their attacks always deal the listed damage and never roll.'},
  undead:{name:'Undead',forms:['undead'],text:'Radiant damage is doubled against undead.'},
  radiant:{name:'Radiant',forms:['radiant'],text:'Holy damage. Doubled against undead and stops skeletons reassembling.'},
  surge:{name:'Boss Surge',forms:['boss surges','boss surge'],text:'A boss unleashes a special action at the start of its turn on rounds 1, 3 and 5.'},
  brutal:{name:'Brutal',forms:['brutal'],text:'A foe spends 3 momentum to gain a boon on an attack.'},
  zone:{name:'Zone',forms:['zone'],text:'A lingering area. It affects foes that start their turn inside it.'},
  teleport:{name:'Teleport',forms:['teleport'],text:'Move instantly without provoking parting blows.'},
  free:{name:'Free Action',forms:['free action'],text:'Does not use up your action for the turn.'},
};

/* ---------------- OVERWORLD EVENTS ---------------- */
/* Each option: check {skill, dc} with win/lose outcomes, or a direct outcome.
   Outcomes: gold, heal (fraction of max), dmg (each hero), relic, train, fight ('battle'|'elite'), text. */
const EVENTS=[
  {id:'bridge',title:'The Collapsed Bridge',text:'A rope bridge over a gorge has half given way. Wreckage and a merchant\'s lost strongbox dangle below.',opts:[
    {label:'Haul up the strongbox',check:{skill:'Athletics',dc:13},win:{gold:45,text:'Muscles burn, but the strongbox comes up full of coin.'},lose:{dmg:5,text:'The rope snaps back. Everyone takes 5 damage.'}},
    {label:'Dance across the beams',check:{skill:'Acrobatics',dc:14},win:{relic:true,text:'On the far side, a traveller\'s pack holds a relic.'},lose:{dmg:4,text:'A slip and a scramble. Everyone takes 4 damage.'}},
    {label:'Take the long way round',win:{text:'The detour costs nothing but time.'}}]},
  {id:'pilgrim',title:'The Wandering Pilgrim',text:'An old woman in grey rags offers to pray over your wounds, for a price.',opts:[
    {label:'Read her intentions',check:{skill:'Insight',dc:12},win:{heal:.35,text:'She is genuine. Her prayer mends the whole party.'},lose:{gold:-20,text:'She lifts a purse while you watch her eyes.'}},
    {label:'Pay her 30 gold',cost:30,win:{heal:.5,text:'Warm light washes over the party.'}},
    {label:'Walk on',win:{text:'She mutters a curse, or a blessing.'}}]},
  {id:'shrine',title:'A Forgotten Shrine',text:'Runes circle a moss-covered altar. Something old still hums inside the stone.',opts:[
    {label:'Decipher the runes',check:{skill:'Lore',dc:13},win:{train:true,text:'The runes teach an old technique.'},lose:{text:'The script is too worn to read.'}},
    {label:'Draw on its power',check:{skill:'Magic',dc:15},win:{relic:true,text:'The altar yields a humming relic.'},lose:{dmg:6,text:'The stone lashes out. Everyone takes 6 damage.'}},
    {label:'Pry out the offerings',win:{gold:40,fight:'battle',text:'Coins rattle loose, and the shrine\'s guardians wake.'}}]},
  {id:'toll',title:'The Goblin Toll',text:'Goblins block the road with a cart and demand a toll: 25 gold a head.',opts:[
    {label:'Talk them down',check:{skill:'Influence',dc:13},win:{text:'The goblins let you pass, grumbling.'},lose:{fight:'battle',text:'Negotiations fail. Knives come out.'}},
    {label:'Pay 25 gold',cost:25,win:{text:'They count every coin, then wave you on.'}},
    {label:'Clear the road',win:{fight:'battle',text:'You draw steel.'}}]},
  {id:'reliquary',title:'The Locked Reliquary',text:'A sealed iron casket rests in a roadside chapel.',opts:[
    {label:'Pick the lock',check:{skill:'Thievery',dc:14},win:{relic:true,text:'The lock clicks. A relic lies inside.'},lose:{dmg:3,text:'A needle trap. Everyone takes 3 damage.'}},
    {label:'Force it open',check:{skill:'Athletics',dc:15},win:{relic:true,text:'Hinges scream and give way.'},lose:{dmg:6,text:'The casket bursts into flame. Everyone takes 6 damage.'}},
    {label:'Leave it be',win:{text:'Some things are locked for a reason.'}}]},
  {id:'hunter',title:'The Wounded Hunter',text:'A hunter lies in the heather with a bolt in his leg.',opts:[
    {label:'Tend his wound',check:{skill:'Survival',dc:12},win:{gold:25,heal:.2,text:'He shares his camp and a purse of coin.'},lose:{text:'You do your best. He limps away, silent.'}},
    {label:'Search his pack',win:{gold:30,text:'You take what he has. It doesn\'t sit well.'}},
    {label:'Leave him',win:{text:'You press on.'}}]},
  {id:'mist',title:'Shapes in the Mist',text:'Figures move in the fog ahead, spears glinting.',opts:[
    {label:'Slip past unseen',check:{skill:'Stealth',dc:14},win:{gold:20,text:'You pass unseen and lift a purse from a sleeping sentry.'},lose:{fight:'battle',text:'A twig snaps. They charge.'}},
    {label:'Attack first',win:{fight:'battle',text:'Surprise is yours.'}}]},
  {id:'well',title:'The Whispering Well',text:'Voices rise from a dry well, promising power to those who listen.',opts:[
    {label:'Listen closely',check:{skill:'Insight',dc:14},win:{train:true,text:'The voices teach a secret before fading.'},lose:{dmg:5,text:'The voices scream. Everyone takes 5 damage.'}},
    {label:'Toss in 20 gold',cost:20,win:{heal:.3,text:'The well sighs. Wounds close.'}},
    {label:'Seal it with stones',win:{text:'The whispers stop.'}}]},
];
