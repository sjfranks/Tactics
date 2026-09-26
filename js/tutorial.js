'use strict';
/* =====================================================================
   EMBERWATCH — the tutorial, in the manner of the Fire Emblem tutorials:
   a scripted first battle. Characters talk in a text box (tap to continue); when it is time to act,
   a pointer shows exactly what to tap and only that action is allowed. Between steps the battle
   plays out normally.
   ===================================================================== */
const TUT_KEY='emberwatch.v3.tut';
function tutDone(){try{return !!localStorage.getItem(TUT_KEY);}catch(e){return false;}}

const tutGob=()=>G.units.filter(u=>u.side==='enemy'&&live(u)&&!u.object);
const tutHero=cls=>G.units.find(u=>u.kind==='pc'&&u.cls===cls&&live(u));
/* squares the active hero can move to that end beside a goblin (or any move, if none do) */
function tutMovesNearFoe(){const V=view();if(!V)return [];const all=[...V.moves.values()].filter(n=>!unitAt(n.x,n.y));
  const near=all.filter(n=>tutGob().some(g=>man(g,n)===1));return (near.length?near:all).map(n=>({x:n.x,y:n.y}));}
function tutTargets(){const V=view();if(!V)return [];return [...V.targets.keys()].map(k=>unitAt(KX(k),KY(k))).filter(u=>u&&u.side==='enemy').map(u=>({x:u.x,y:u.y}));}
const onTurn=cls=>()=>{const u=playerUnit();return !!u&&u.cls===cls&&!B.busy;};

/* The script. say: a line of dialogue (who: narrator | fighter | cleric). do: an action the player must take.
   wait: hold until the battle reaches a state. run: a scripted event. free: the player is on their own. */
const TUT_SCRIPT=[
  {say:'narrator',text:'The Greenmarch road, at dusk. For a week, goblins have been raiding travellers here.'},
  {say:'fighter',text:'There they are. Four of the little wretches. Stand back, this won\'t take long.'},
  {wait:onTurn('fighter')},
  {say:'narrator',text:'It is Brakka\'s turn. On a turn, a hero can {g:move} and use one {g:power}, in either order.'},
  {do:'move',text:'Tap a glowing square to move Brakka beside a goblin.',tiles:tutMovesNearFoe},
  {say:'narrator',text:'{r:Red squares} show foes her selected power can reach. Her selected power is {g:Grinding Strike}, the gold card below.'},
  {do:'target',text:'Tap the goblin next to Brakka.',tiles:tutTargets,pi:0},
  {say:'narrator',text:'This is the {g:forecast}. Every attack rolls three dice: a {g:Graze}, a {g:Hit} or a {g:Critical hit}. It shows the damage of each and how likely it is.'},
  {do:'confirm',text:'Tap the goblin again to strike!'},
  {say:'fighter',text:'Ha! And now you\'re {g:marked}. Go after anyone but me, and you\'ll regret it.'},
  {say:'narrator',text:'Brakka has moved and attacked, so her turn is done. Then the goblins take theirs.'},
  {do:'end',text:'Tap END TURN.'},
  {wait:()=>G.round>=2},
  {run:()=>tutJoin()},
  {say:'cleric',text:'Brakka! I saw the smoke from the road. Hold on, I\'m with you!'},
  {say:'fighter',text:'Sela! About time. Stay close and keep me standing.'},
  {say:'narrator',text:'{g:Sela}, the cleric, joins the fight. She fights up close to heal, bless and move her allies.'},
  {wait:onTurn('fighter')},
  {run:()=>{const f=tutHero('fighter');if(f)f.mom=Math.max(f.mom,2);}},
  {say:'narrator',text:'See the purple gems? That is {p:◆ momentum}. Brakka gains 1 every turn and 1 more each time she is hit. Powers with a {p:◆} cost spend it.'},
  {do:'power',text:'Tap {g:Hook Chain} to select it. It costs 2 momentum.',pi:2},
  {say:'narrator',text:'Hook Chain reaches 3 squares and drags a foe to Brakka.'},
  {do:'target',text:'Tap a goblin to hook it.',tiles:tutTargets,pi:2},
  {do:'confirm',text:'Tap it again to pull!'},
  {say:'fighter',text:'Get over here!'},
  {do:'end',text:'Tap END TURN. It\'s Sela\'s turn next.'},
  {wait:onTurn('cleric')},
  {say:'narrator',text:'Sela\'s {g:Rallying Strike} hits a foe and {g:blesses} the ally nearest her: {g:advantage} on their next attack (+2 to the roll).'},
  {do:'move',text:'Tap a glowing square to move Sela beside a goblin.',tiles:tutMovesNearFoe},
  {do:'target',text:'Tap a goblin beside Sela.',tiles:tutTargets,pi:0},
  {do:'confirm',text:'Tap it again to strike!'},
  {say:'cleric',text:'Light guide your arm, Brakka!'},
  {do:'end',text:'Tap END TURN.'},
  {wait:onTurn('fighter')},
  {say:'narrator',text:'See the {r:fire}? Anything shoved into a {r:hazard} suffers it. {g:Tide of Iron} pushes a foe away and Brakka steps after it.'},
  {do:'power',text:'Tap {g:Tide of Iron}.',pi:1},
  {do:'target',text:'Tap a goblin. Push it toward the flames if you can!',tiles:tutTargets,pi:1},
  {do:'confirm',text:'Tap it again to shove!'},
  {say:'narrator',text:'One more thing. The pink {r:◆} at the top counts the foes\' momentum. When it fills, they unleash a {r:threat}: here, {r:Bloodlust} (every foe gets advantage). Deeper in, the threats get worse.'},
  {say:'narrator',text:'You\'re ready. Finish off the goblins! You can tap any unit to see what it does, and tap blue words for help.'},
  {free:true,text:'Defeat the goblins!'},
];

function tutStep(){const T=G&&G.tut;return T?TUT_SCRIPT[T.i]:null;}
function tutNext(){const T=G.tut;T.i++;T.t0=NOW;T.skip=false;tutPoll();}
/* Runs every frame: carries out run steps, finishes waits, and skips action steps that can't be done. */
function tutPoll(){
  const T=G&&G.tut;if(!T)return;
  for(let guard=0;guard<20;guard++){
    const S=TUT_SCRIPT[T.i];if(!S)return;
    if(S.run){S.run();T.i++;T.t0=NOW;continue;}
    if(S.wait){if(S.wait()){T.i++;T.t0=NOW;continue;}return;}
    if(S.say&&S.when&&!S.when()){T.i++;T.t0=NOW;continue;}
    if(S.do){
      if(!playerUnit()||B.busy)return;
      const bad=(S.do==='target'||S.do==='move')&&!S.tiles().length||S.do==='confirm'&&!B.pend||S.do==='power'&&!usable(playerUnit(),powerOf(playerUnit(),S.pi));
      if(bad){T.i++;T.t0=NOW;continue;}
      if(S.do==='target'&&S.pi!=null&&B.pi!==S.pi){B.pi=S.pi;B.pend=null;B.vkey='';}
    }
    return;
  }
}
/* Input gate: returns true when the tutorial allows this action. */
function tutAllow(kind,a){
  const S=tutStep();if(!S||S.free||S.wait)return true;
  if(S.say)return false;
  const inT=(L,x,y)=>L.some(t=>t.x===x&&t.y===y);
  let ok=false;
  if(S.do==='move')ok=(kind==='tap'||kind==='move')&&inT(S.tiles(),a.x,a.y);
  else if(S.do==='target')ok=kind==='tap'&&inT(S.tiles(),a.x,a.y);
  else if(S.do==='confirm')ok=kind==='confirm'||(kind==='tap'&&B.pend&&B.pend.k===K(a.x,a.y));
  else if(S.do==='power')ok=kind==='power'&&a===S.pi;
  else if(S.do==='end')ok=kind==='end';
  if(!ok){G.tut.nudge=NOW;sfx('select');}
  return ok;
}
/* Called after an action happens, to advance the script. */
function tutEvent(ev){
  const S=tutStep();if(!S||!S.do)return;
  const done=S.do==='move'&&ev==='moved'||S.do==='target'&&ev==='pend'&&B.pend||S.do==='confirm'&&ev==='acted'||S.do==='power'&&ev==='power'||S.do==='end'&&ev==='ended';
  if(done)tutNext();
}
function tutJoin(){
  if(tutHero('cleric'))return;
  const h={cls:'cleric',lvl:1,hp:CLASSES.cleric.hp,maxHp:CLASSES.cleric.hp,powers:CLASSES.cleric.start.slice(),weapon:START_WEAPON.cleric};
  let spot=null;for(const [x,y] of [[3,7],[2,7],[4,7],[1,7],[3,6],[4,6],[1,6]])if(!spot&&freeTile(x,y,null))spot={x,y};
  if(!spot)return;
  const c=makePc(h,spot.x,spot.y,'hero');G.units.push(c);c.init=99;
  const fi=G.order.indexOf('h_fighter');G.order.splice(fi+1,0,c.id);
  H.spawn(c);sfx('holy');log('Sela joins the fight!','g');
}

/* ---------------- drawing ---------------- */
const TUT_WHO={fighter:{name:'Brakka',unit:{kind:'pc',cls:'fighter',side:'hero'}},cleric:{name:'Sela',unit:{kind:'pc',cls:'cleric',side:'hero'}}};
function tutPointer(x,y,dir){
  const b=Math.round(Math.sin(NOW/140)*2);const c='#ffe070',o=C.edge;
  if(dir==='down'){const yy=y-10+b;for(let i=0;i<5;i++){rect(x-i-1,yy-i-1,2*i+3,1,o);}for(let i=0;i<4;i++)rect(x-i,yy-i,2*i+1,1,c);rect(x-1,yy-10,3,7,o);rect(x,yy-9,1,6,c);}
  else if(dir==='left'){const xx=x+10-b;for(let i=0;i<5;i++)rect(xx+i+1,y-i-1,1,2*i+3,o);for(let i=0;i<4;i++)rect(xx+i,y-i,1,2*i+1,c);rect(xx+4,y-1,7,3,o);rect(xx+4,y,6,1,c);}
  else{const yy=y+10-b;for(let i=0;i<5;i++){rect(x-i-1,yy+i+1,2*i+3,1,o);}for(let i=0;i<4;i++)rect(x-i,yy+i,2*i+1,1,c);rect(x-1,yy+4,3,7,o);rect(x,yy+4,1,6,c);}
}
function tutGlowRect(x,y,w,h){const a=.55+.45*Math.sin(NOW/170);ctx.globalAlpha=.18+.12*a;rect(x,y,w,h,'#ffe070');ctx.globalAlpha=a;frame(x-1,y-1,w+2,h+2,'#ffe070');frame(x,y,w,h,'#fff4c0');frame(x+1,y+1,w-2,h-2,'#ffe070');ctx.globalAlpha=1;}
/* Spotlight: darken every board square except the ones the player should tap. */
function tutDimBoard(keep){ctx.globalAlpha=.5;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!keep.some(t=>t.x===x&&t.y===y))rect(OX+x*TS*BK,OY+y*TS*BK,TS*BK,TS*BK,'#000');ctx.globalAlpha=1;}
function drawTutHint(){
  const T=G.tut;if(!T)return;tutPoll();const S=tutStep();if(!S)return;
  const tile=(x,y)=>({x:OX+x*TS*BK,y:OY+y*TS*BK,s:TS*BK});
  if(S.say){
    // dim the field a little and show the text box; a tap anywhere continues
    ctx.globalAlpha=.45;rect(0,0,SW,SH,'#000');ctx.globalAlpha=1;
    const who=TUT_WHO[S.say];const bw=PORT?SW-8:SW-120,bx=PORT?4:60;
    const L=layoutRich(S.text,bw-(who?44:16),C.parch);const bh=Math.max(46,L.length*8+20),by=PORT?SH-bh-6:SH-bh-4;
    panel(bx,by,bw,bh,{fill:'#1c150f',rim:C.gold});
    let tx=bx+8;
    if(who){inset(bx+5,by+6,30,30,'#243048');portrait(who.unit,bx+6,by+7,28);rect(bx+5,by-6,textW(who.name)+10,10,C.edge);rect(bx+6,by-5,textW(who.name)+8,8,'#5a3a14');text(who.name,bx+10,by-4,C.gold);tx=bx+40;}
    // typewriter: reveal the text over time
    const full=S.text.replace(/\{[a-z]:([^}]*)\}/g,'$1').length;const shown=Math.min(full,Math.floor((NOW-T.t0)/22));
    T.typed=shown>=full;
    ctx.save();ctx.beginPath();const lines=L.length;const perLine=full/lines;const lineShown=Math.floor(shown/perLine);
    ctx.rect(bx,by,bw,6+Math.min(lines,lineShown+1)*8);ctx.clip();rich(S.text,tx,by+6,bw-(who?44:16),who?'#fff4d8':'#e8dcc0',{nohit:true});ctx.restore();
    if(T.typed&&Math.floor(NOW/300)%2)text('▼',bx+bw-10,by+bh-10,C.gold);
    hit(0,0,SW,SH,{id:'tutsay',fn:()=>{if(!T.typed){T.t0=-1e9;return;}sfx('click');tutNext();}});
    return;
  }
  if(S.wait||S.run)return;
  // action or free-play instruction
  const nud=T.nudge&&NOW-T.nudge<400?Math.round(Math.sin((NOW-T.nudge)/25)*3):0;
  const bw=PORT?SW-12:92,bx=(PORT?6:4)+nud;const L=layoutRich(S.text,bw-12,C.parch);const bh=L.length*8+10,by=PORT?OY+2:18;
  panel(bx,by,bw,bh,{fill:S.free?'#141a10':'#2a1e08',rim:S.free?C.green:C.gold});rich(S.text,bx+6,by+5,bw-12,'#fff4d8',{nohit:true});
  if(S.free)return;
  if(S.do==='move'||S.do==='target'){const L2=S.tiles();tutDimBoard(L2.concat(S.do==='move'?[playerUnit()]:[]));for(const t of L2){const q=tile(t.x,t.y);tutGlowRect(q.x+1,q.y+1,q.s-2,q.s-2);}
    const f=L2[0];if(f){const q=tile(f.x,f.y);tutPointer(q.x+q.s/2,q.y+4,'down');}}
  else if(S.do==='confirm'&&B.pend){const q=tile(KX(B.pend.k),KY(B.pend.k));const r=PORT&&B.strikeR;
    if(r){tutGlowRect(r.x,r.y,r.w,r.h);tutPointer(r.x+r.w/2,r.y+r.h,'up');}else{tutGlowRect(q.x+1,q.y+1,q.s-2,q.s-2);tutPointer(q.x+q.s/2,q.y+4,'down');}}
  else if(S.do==='power'){tutDimBoard([]);const r=B.cardR&&B.cardR[S.pi];if(r){tutGlowRect(r.x,r.y,r.w,r.h);if(r.x+r.w+14<SW)tutPointer(r.x+r.w,r.y+r.h/2,'left');else tutPointer(r.x+r.w/2,r.y,'down');}}
  else if(S.do==='end'){tutDimBoard([]);const r=B.endR;if(r){tutGlowRect(r.x,r.y,r.w,r.h);tutPointer(r.x+r.w/2,r.y,'down');}}
}

/* The tutorial battle: a small, fixed skirmish in the Greenmarch. */
function startTutorial(){
  CTX={mode:'tutorial',relics:[]};
  const enc=genEncounter(0,'rout',{act:0,hazards:false,title:'First Blood',enemies:[{type:'cutter'},{type:'cutter'},{type:'runner'},{type:'runner'}]});
  for(const t of enc.tiles){t.ob=null;t.ter=null;t.haz=null;}
  const at=(x,y)=>enc.tiles[K(x,y)];
  at(0,4).ob='rock';at(5,2).ob='tree';at(5,5).ter='rough';at(0,1).ter='rough';
  at(2,1).haz={t:'fire',dur:-1};at(4,2).haz={t:'fire',dur:-1};
  const pos=[[2,3],[3,1],[1,2],[4,1]];enc.enemies.forEach((e,i)=>{e.x=pos[i][0];e.y=pos[i][1];});
  enc.heroPos='normal';
  const f={cls:'fighter',lvl:1,hp:CLASSES.fighter.hp,maxHp:CLASSES.fighter.hp,powers:CLASSES.fighter.start.slice(),weapon:START_WEAPON.fighter};
  setupBattle(enc,[f]);
  const fu=G.units.find(u=>u.cls==='fighter');fu.x=2;fu.y=6;
  G.order=[fu.id,...G.order.filter(id=>id!==fu.id)];
  G.tut={i:0,t0:NOW};G.dmgAdd=-1;
  beginBattleScreen(o=>{
    try{localStorage.setItem(TUT_KEY,'1');}catch(e){}
    if(o==='win')openModal(dialog({title:'TUTORIAL COMPLETE',closable:false,w:210,
      body:'Well fought! After every battle your heroes earn {g:gold}, {g:experience} for doing their jobs (Brakka: shoving foes and soaking blows; Sela: healing and blessing), and a choice of {g:new power}.\n\nOn the map, pick your path. Watch each battle\'s {g:mission}: foes will fight to stop you. Tap {g:EQUIP} to change weapons and the two relics you wear.\n\nYour journey begins with all four heroes.',
      buttons:[{l:'BEGIN JOURNEY',hot:true,fn:()=>{G=null;newRun();go(MAP_SCREEN);}}]}));
    else openModal(dialog({title:'DEFEAT',closable:false,body:'Brakka falls. Try again, or skip ahead to the journey.',buttons:[{l:'RETRY',hot:true,fn:startTutorial},{l:'SKIP',fn:()=>{G=null;newRun();go(MAP_SCREEN);}}]}));
  });
}
/* New Journey: offer the tutorial first. */
function startJourney(){
  const done=tutDone();
  openModal(dialog({title:'NEW JOURNEY',w:200,body:done?'Play the short tutorial again, or set out at once?':'Would you like a short tutorial first? Brakka the fighter learns the ropes against a few goblins, then Sela joins her. It takes a few minutes.',
    buttons:[{l:'TUTORIAL',hot:!done,fn:startTutorial},{l:done?'SET OUT':'SKIP',hot:done,fn:()=>{newRun();go(MAP_SCREEN);}}]}));
}
