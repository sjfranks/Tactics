'use strict';
/* =====================================================================
   EMBERWATCH — the tutorial: Brakka alone against goblins, then Sela arrives.
   Hints appear in a panel over the board and advance as the player does what they ask.
   ===================================================================== */
const TUT_KEY='emberwatch.v3.tut';
function tutDone(){try{return !!localStorage.getItem(TUT_KEY);}catch(e){return false;}}
/* Each step shows when `show` matches an event and clears when `until` happens ('ok' waits for a tap). */
const TUT_STEPS=[
  {show:(e,u)=>e==='turn'&&u.cls==='fighter',until:'move',
   text:'This is {g:Brakka}, the fighter. The {b:blue squares} show where she can move this turn. Tap one, or drag her, to close in on the goblins.'},
  {show:e=>e==='move',until:'act',
   text:'{r:Red squares} show foes her power can reach. Tap a goblin to see the {g:forecast}: the damage for a {g:Graze}, a {g:Hit} or a {g:Critical hit}, and how likely each is. Tap it again to strike.'},
  {show:e=>e==='act',until:'end',
   text:'Each turn a hero can move and use one power. Her basic attacks {g:mark} foes: a marked foe that attacks anyone else has disadvantage. Her turn ends once she has moved and acted, or tap {g:END TURN}.'},
  {show:e=>e==='joined',until:'ok',
   text:'Help arrives! {g:Sela} the cleric joins the fight. Heroes are strongest together: Sela blesses allies and swaps places with them, while Brakka shoves foes where she wants them.'},
  {show:(e,u)=>e==='turn'&&u.cls==='cleric',until:'act',
   text:'Sela\'s {g:Rallying Strike} hits a foe and {g:blesses} the nearest ally: advantage on their next attack. Move her beside a goblin and strike. (Tap any power below for its details.)'},
  {show:(e,u)=>e==='turn'&&u.cls==='fighter'&&G.round>=2,until:'act',
   text:'Brakka has {p:◆ momentum} now: 1 each turn, and 1 more each time she is hit. Powers with a {p:◆} cost spend it, like {g:Hook Chain}, which drags a foe to her. See the {r:fire}? A foe shoved into a {r:hazard} suffers it: try {g:Tide of Iron}!'},
  {show:e=>e==='act',until:'ok',
   text:'The foes bank momentum too: the pink {r:◆} at the top counts toward their next {r:threat}. Here it is {r:Bloodlust} (advantage for every foe). Deeper into the journey they learn worse. Now finish them off!'},
];
function tutEvent(ev,u){
  const T=G&&G.tut;if(!T)return;
  if(ev==='round'&&G.round===2&&!T.joined){T.joined=true;tutJoin();tutEvent('joined');return;}
  const S=TUT_STEPS[T.i];if(!S)return;
  const N0=TUT_STEPS[T.i+1];
  if(T.shown&&S.until==='ok'&&N0&&ev!=='ok'&&N0.show(ev,u||{})){T.i++;T.t0=NOW;return;}
  if(T.shown&&S.until===ev){T.i++;T.shown=false;const N=TUT_STEPS[T.i];if(N&&N.show(ev,u))T.shown=true,T.t0=NOW;return;}
  if(!T.shown&&S.show(ev,u||{})){T.shown=true;T.t0=NOW;}
}
function tutJoin(){
  const h={cls:'cleric',lvl:1,hp:CLASSES.cleric.hp,maxHp:CLASSES.cleric.hp,powers:CLASSES.cleric.start.slice(),weapon:START_WEAPON.cleric};
  let spot=null;for(const [x,y] of [[3,7],[2,7],[4,7],[1,7],[3,6]])if(!spot&&freeTile(x,y,null))spot={x,y};
  if(!spot)return;
  const c=makePc(h,spot.x,spot.y,'hero');G.units.push(c);insertOrder(c);H.spawn(c);sfx('holy');log('Sela joins the fight!','g');
}
function drawTutHint(){
  const T=G.tut;if(!T||!T.shown)return;const S=TUT_STEPS[T.i];if(!S)return;
  const w=PORT?SW-12:92,x=PORT?6:4,tw=w-12;const L=layoutRich(S.text,tw,C.parch);const h=L.length*8+(S.until==='ok'?24:12);
  const y=PORT?OY+2:18;
  const a=Math.min(1,(NOW-(T.t0||0))/250);ctx.globalAlpha=a;
  panel(x,y,w,h,{fill:'#1c1408',rim:C.gold});
  const pulse=.4+.3*Math.sin(NOW/250);ctx.globalAlpha=a*pulse;frame(x-1,y-1,w+2,h+2,'#ffe070');ctx.globalAlpha=a;
  rich(S.text,x+6,y+5,tw,C.parch);
  if(S.until==='ok')button(x+w/2-22,y+h-17,44,13,'GOT IT',()=>{sfx('select');tutEvent('ok');},{hot:true});
  else hit(x,y,w,h,{id:'tuthint'});
  ctx.globalAlpha=1;
}
/* The tutorial battle: a small, fixed skirmish in the Greenmarch. */
function startTutorial(){
  CTX={mode:'tutorial',relics:[]};
  const enc=genEncounter(0,'rout',{act:0,hazards:false,title:'First Blood',enemies:[{type:'cutter'},{type:'cutter'},{type:'runner'},{type:'runner'}]});
  for(const t of enc.tiles){t.ob=null;t.ter=null;t.haz=null;}
  const at=(x,y)=>enc.tiles[K(x,y)];
  at(0,4).ob='rock';at(5,2).ob='tree';at(5,5).ter='rough';at(0,1).ter='rough';
  at(3,3).haz={t:'fire',dur:-1};at(0,2).haz={t:'fire',dur:-1};
  const pos=[[2,3],[3,4],[1,2],[4,2]];enc.enemies.forEach((e,i)=>{e.x=pos[i][0];e.y=pos[i][1];});
  enc.heroPos='normal';
  const f={cls:'fighter',lvl:1,hp:CLASSES.fighter.hp,maxHp:CLASSES.fighter.hp,powers:CLASSES.fighter.start.slice(),weapon:START_WEAPON.fighter};
  setupBattle(enc,[f]);
  const fu=G.units.find(u=>u.cls==='fighter');fu.x=2;fu.y=6;
  G.order=[fu.id,...G.order.filter(id=>id!==fu.id)];
  G.tut={i:0,shown:false};
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
