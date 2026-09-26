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
const tutFoe=k=>{const u=G.tut&&G.units.find(o=>o.id===G.tut.ids[k]);return u&&live(u)?u:null;};
const onTurn=cls=>()=>{const u=playerUnit();return !!u&&u.cls===cls&&!B.busy;};
function tutFreeMoves(){const V=view();if(!V)return [];return [...V.moves.values()].filter(n=>!unitAt(n.x,n.y)&&!Tt(n.x,n.y).haz);}
/* squares the active hero can step to that are beside a given foe */
function tutBeside(k){const f=tutFoe(k);if(!f)return [];return tutFreeMoves().filter(n=>man(f,n)===1).map(n=>({x:n.x,y:n.y}));}
function tutInTargets(k,minD,pi){const f=tutFoe(k);const u=playerUnit();const V=pi!=null&&u?unitView(u,pi):view();if(!f||!u||!V||!V.targets.has(K(f.x,f.y)))return [];if(minD&&man(f,u)<minD)return [];return [{x:f.x,y:f.y}];}

/* The script. say: a line of dialogue (who: narrator | fighter | cleric); text may be a function. do: an action the
   player must take (tiles: which squares to spotlight). wait: hold until the battle reaches a state. run: a scripted
   event. free: the player is on their own. when: skip the step if false. */
const TUT_SCRIPT=[
  {say:'narrator',text:'The Greenmarch road, at dusk. For a week now, goblins have been ambushing travellers here.'},
  {say:'fighter',text:'There they are: a cutthroat, an archer and a hulking brute. Stand back, this won\'t take long.'},
  {wait:onTurn('fighter')},
  {say:'narrator',text:'Everyone takes turns in {g:initiative} order. On her turn a hero can move, then attack. Brakka is a fighter: she wants to be up close.'},
  {do:'move',text:'Move Brakka next to the cutthroat.',tiles:()=>tutBeside('cut')},
  {do:'power',pi:1,text:'Tap {g:Grinding Strike}, a heavy blow.'},
  {do:'target',pi:1,text:'Now attack the cutthroat!',tiles:()=>tutInTargets('cut',0,1)},
  {say:'narrator',text:'Before you strike, the {g:forecast} shows what could happen. Every attack is a {g:Graze}, a {g:Hit} or a {g:Critical hit}: you see the damage and the odds of each.'},
  {do:'confirm',text:'Tap the cutthroat again to strike.'},
  {say:'fighter',text:()=>tutFoe('cut')?'Now you\'re {g:marked}. You want anyone else? You\'ll have to go through me.':'One down!'},
  {say:'narrator',text:'A foe she marks can only attack her. Tap {g:INTENT} at any time to see whom each foe means to attack next.'},
  {do:'end',text:'Brakka is done. Tap END TURN, and the goblins take their turn.'},
  {wait:()=>G.round>=2&&onTurn('fighter')()},
  {run:()=>tutJoin()},
  {say:'cleric',text:'Brakka! I saw the smoke from the road. I\'m with you!'},
  {say:'fighter',text:'Sela! Good timing. Let\'s show this brute how we fight.'},
  {say:'narrator',text:'Sela acts right after Brakka. Heroes can {g:set up} attacks for each other, but a set-up only lasts until the foe\'s own turn: so the order matters.'},
  {say:'narrator',text:'See the fire beside the brute? {g:Tide of Iron} shoves a foe back, and anything shoved into a {r:hazard} suffers it. Better still, a foe that is shoved or dragged is {g:staggered}: the next attack on it is a sure {g:critical hit}.',when:()=>tutInTargets('brute',0,0).length},
  {do:'power',pi:0,text:'Tap {g:Tide of Iron}.',when:()=>B.pi!==0},
  {do:'target',pi:0,text:'Shove the brute into the fire!',tiles:()=>tutInTargets('brute',0,0)},
  {do:'confirm',text:'Tap the brute again to shove it.'},
  {say:'fighter',text:'Off balance, and on fire! Sela, now!',when:()=>G.tut.lastDone==='confirm'&&tutFoe('brute')&&tutFoe('brute').st.stag},
  {do:'end',text:'Tap END TURN. Sela is next, before the brute can recover.'},
  {wait:onTurn('cleric')},
  {say:'narrator',text:'Sela is a cleric. Her {g:Rallying Strike} hits a foe and {g:blesses} the ally nearest her: advantage on their next attack.'},
  {do:'move',text:'Move Sela next to the brute.',tiles:()=>tutBeside('brute')},
  {do:'target',pi:0,text:'Now strike the brute!',tiles:()=>tutInTargets('brute',0,0)},
  {say:'narrator',text:()=>tutFoe('brute')&&tutFoe('brute').st.stag?'The forecast shows a sure critical hit, and it goes right through the brute\'s {g:armor}. Brakka set it up, so it\'s a {g:COMBO}: both heroes gain {p:◆ momentum}, and hits deal extra damage for the rest of the round.':'Every blow Sela lands blesses Brakka.'},
  {do:'confirm',text:'Tap the brute again to strike.'},
  {say:'cleric',text:'Light guide your arm, Brakka!',when:()=>G.tut.lastDone==='confirm'},
  {do:'end',text:'Tap END TURN.'},
  {wait:()=>G.round>=3&&onTurn('fighter')()},
  {run:()=>{const f=tutHero('fighter');if(f)f.mom=Math.max(f.mom,2);}},
  {say:'narrator',text:'Brakka is still {g:blessed}. And every hit she took gave her {p:◆ momentum}, the purple gems by her name. {g:Hook Chain} costs 2: it reaches 3 squares and drags a foe to Brakka, staggered.',when:()=>tutInTargets('archer',0,2).length},
  {do:'power',pi:2,text:'Tap {g:Hook Chain}.',when:()=>tutInTargets('archer',0,2).length},
  {do:'target',pi:2,text:'Drag that archer out of hiding!',tiles:()=>tutInTargets('archer',0,2)},
  {do:'confirm',text:'Tap the archer again to pull.'},
  {say:'fighter',text:'Get over here!',when:()=>G.tut.lastDone==='confirm'},
  {say:'narrator',text:'Sela\'s blessing made that a combo too. That is the heart of every battle: one hero sets up the next. Shove and drag foes off balance, bless and expose them, then cash it all in. Chain combos for bigger hits.'},
  {say:'narrator',text:'One more thing: the pink {r:◆} at the top is the foes\' own momentum. When it fills, they unleash a {r:threat}, like {r:Bloodlust}: every foe gets advantage for a round. Keep an eye on it.'},
  {run:()=>{for(const u of tutGob()){u.pinned=false;if(u.tutSpeed!=null)u.speed=u.tutSpeed;}}},
  {say:'narrator',text:()=>tutFoe('archer')&&tutFoe('archer').st.stag?'The goblins are on the move now. The archer is staggered: Sela can land a sure critical hit on it. Finish them off!':'The goblins are on the move now. Finish them off! Tap any foe to see what it does.'},
  {free:true,text:'Defeat the goblins!'},
];

function tutStep(){const T=G&&G.tut;return T?TUT_SCRIPT[T.i]:null;}
function tutNext(){const T=G.tut;const S=TUT_SCRIPT[T.i];if(S&&S.do)T.lastDone=S.do;T.i++;T.t0=NOW;tutPoll();}
/* Runs every frame: carries out run steps, finishes waits, and skips action steps that can't be done. */
function tutPoll(){
  const T=G&&G.tut;if(!T)return;
  for(let guard=0;guard<20;guard++){
    const S=TUT_SCRIPT[T.i];if(!S)return;
    if(S.run){S.run();T.i++;T.t0=NOW;continue;}
    if(S.wait){if(S.wait()){T.i++;T.t0=NOW;continue;}return;}
    if(S.when&&!S.when()){if(S.do)T.lastDone='skip';T.i++;T.t0=NOW;continue;}
    if(S.do){
      if(!playerUnit()||B.busy)return;
      const bad=(S.do==='target'||S.do==='move')&&!S.tiles().length||S.do==='confirm'&&!B.pend||S.do==='power'&&!usable(playerUnit(),powerOf(playerUnit(),S.pi));
      if(bad){T.lastDone='skip';T.i++;T.t0=NOW;continue;}
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
  let spot=null;for(const [x,y] of [[3,6],[3,7],[2,7],[4,7],[1,7],[4,6],[1,6]])if(!spot&&freeTile(x,y,null))spot={x,y};
  if(!spot)return;
  const c=makePc(h,spot.x,spot.y,'hero');G.units.push(c);
  c.init=99;c.mom=1;
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
    // the speech box sits just above the power cards, in the middle of the player's view; a tap continues
    const msg=typeof S.text==='function'?(T.say===T.i?T.sayText:(T.say=T.i,T.sayText=S.text())):S.text;
    const who=TUT_WHO[S.say];const bw=PORT?SW-8:SW-120,bx=PORT?4:60,tw=bw-(who?44:16);
    const L=layoutRich(msg,tw,C.parch);const bh=Math.max(44,L.length*LINE_H+18);
    const by=(PORT?PL.trayY-3:SH-42)-bh;
    panel(bx,by,bw,bh,{fill:'#1c150f',rim:C.gold});
    let tx=bx+8;
    if(who){inset(bx+5,by+6,30,30,'#243048');portrait(who.unit,bx+6,by+7,28);rect(bx+5,by-6,textW(who.name)+10,10,C.edge);rect(bx+6,by-5,textW(who.name)+8,8,'#5a3a14');text(who.name,bx+10,by-4,C.gold);tx=bx+40;}
    // typewriter: one letter at a time, on lines already wrapped so words never jump
    let total=0;for(const ln of L)for(const at of ln)total+=at.t.length;
    const shown=Math.min(total,Math.floor((NOW-T.t0)/28));T.typed=shown>=total;
    if(!T.typed&&shown!==T.tick){T.tick=shown;if(shown%3===0)sfx('tick');}
    rich(msg,tx,by+7,tw,who?'#fff4d8':'#e8dcc0',{nohit:true,chars:shown});
    if(T.typed&&Math.floor(NOW/300)%2){const ax=bx+bw-11,ay=by+bh-9;rect(ax,ay,7,1,C.gold);rect(ax+1,ay+1,5,1,C.gold);rect(ax+2,ay+2,3,1,C.gold);rect(ax+3,ay+3,1,1,C.gold);}
    hit(0,0,SW,SH,{id:'tutsay',fn:()=>{if(!T.typed){T.t0=-1e9;return;}sfx('click');tutNext();}});
    return;
  }
  if(S.wait||S.run)return;
  // action or free-play instruction
  const nud=T.nudge&&NOW-T.nudge<400?Math.round(Math.sin((NOW-T.nudge)/25)*3):0;
  const bw=PORT?SW-12:92,bx=(PORT?6:4)+nud;const L=layoutRich(S.text,bw-12,C.parch);const bh=L.length*8+10;
  // keep clear of the forecast panel, which covers the top of the board when the target is low down
  const fcTop=PORT&&B.pend&&!B.inspect&&B.pend.T.y>=3;const by=PORT?(fcTop?OY+96:OY+2):18;
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
  try{localStorage.setItem(COMBO_KEY,'1');}catch(e){}
  /* The field is laid out so every lesson works: Brakka's first stop, beside the cutthroat, is also beside the
     brute, and her shove sends the brute east into the fire, where Sela can reach it. The archer waits just
     beyond Hook Chain's reach. Foes hold still until the lessons are done. */
  const enc=genEncounter(0,'rout',{act:0,hazards:false,title:'First Blood',enemies:[{type:'cutter'},{type:'sniper'},{type:'hobgob'}]});
  for(const t of enc.tiles){t.ob=null;t.ter=null;t.haz=null;}
  const at=(x,y)=>enc.tiles[K(x,y)];
  at(0,5).ob='rock';at(5,1).ob='tree';at(0,1).ob='tree';at(0,2).ter='rough';at(5,6).ter='rough';
  at(4,4).haz={t:'fire',dur:-1};
  const pos=[[2,3],[4,1],[3,4]];enc.enemies.forEach((e,i)=>{e.x=pos[i][0];e.y=pos[i][1];});
  enc.heroPos='normal';
  const f={cls:'fighter',lvl:1,hp:CLASSES.fighter.hp,maxHp:CLASSES.fighter.hp,powers:CLASSES.fighter.start.slice(),weapon:START_WEAPON.fighter};
  setupBattle(enc,[f]);
  const fu=G.units.find(u=>u.cls==='fighter');fu.x=2;fu.y=6;
  G.order=[fu.id,...G.order.filter(id=>id!==fu.id)];
  const ids={};
  for(const u of G.units.filter(u=>u.side==='enemy')){
    ids[u.type==='cutter'?'cut':u.type==='sniper'?'archer':'brute']=u.id;
    u.pinned=true;u.tutSpeed=u.speed;u.speed=0;
    if(u.type==='hobgob'){u.name='Hobgoblin Brute';u.steady=0;u.hp=u.maxHp=26;}
  }
  G.tut={i:0,t0:NOW,ids};G.dmgAdd=-1;
  beginBattleScreen(o=>{
    try{localStorage.setItem(TUT_KEY,'1');}catch(e){}
    if(o==='win')openModal(dialog({title:'TUTORIAL COMPLETE',closable:false,w:210,
      body:'Well fought! Your journey begins with all four heroes, and each has a job in the combo game: {g:Brakka} throws foes off balance and makes them fight her, {g:Orin} does it to whole groups, {g:Sela} blesses friends and exposes foes, and {g:Vex} cashes it all in.\n\nAfter every battle heroes earn {g:gold}, {g:experience} for doing their jobs, and a choice of {g:new power}. On the map, pick your path and watch each battle\'s {g:mission}. Tap {g:EQUIP} to change weapons and relics.',
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
