'use strict';
/* =====================================================================
   EMBERWATCH — synthesized sound, no files
   ===================================================================== */
const AU={ctx:null,made:0};let NB=null,MUS=null;
/* iOS: by default play alongside other apps (Spotify etc.) and respect the silent switch.
   'Silent switch: Ignore' instead takes over the audio (pauses Spotify) so the game plays even on silent. */
function auSession(){try{if(navigator.audioSession)navigator.audioSession.type=SET.loud?'playback':'ambient';}catch(e){}}
function auMake(){
  auSession();
  const Ctor=window.AudioContext||window.webkitAudioContext;if(!Ctor)return;
  try{if(AU.ctx&&AU.ctx.close)AU.ctx.close();}catch(e){}
  NB=null;AU.made=performance.now();
  AU.ctx=new Ctor();
  const c=AU.ctx;
  AU.comp=c.createDynamicsCompressor();AU.comp.threshold.value=-14;AU.comp.ratio.value=6;AU.comp.connect(c.destination);
  AU.master=c.createGain();AU.master.gain.value=.8;AU.master.connect(AU.comp);
  AU.sfxG=c.createGain();AU.sfxG.connect(AU.master);AU.musG=c.createGain();AU.musG.gain.value=0;AU.musG.connect(AU.master);
  /* A silent blip inside the tap is what actually unlocks sound on iOS. */
  const b=c.createBuffer(1,1,22050),src=c.createBufferSource();src.buffer=b;src.connect(c.destination);src.start(0);
  c.onstatechange=()=>{if(c.state==='running'&&SET.music)musicStart();};
}
/* Called on every tap. Starts audio, or wakes it after a phone call / another app / locking the screen. */
function auInit(){
  try{
    if(!AU.ctx)auMake();
    const c=AU.ctx;if(!c)return;
    if(c.state!=='running'){
      /* A context that stays 'interrupted' (iOS, after another app took the audio) is rebuilt from scratch. */
      if(c.state==='interrupted'&&performance.now()-AU.made>1000){auMake();}
      const p=AU.ctx.resume&&AU.ctx.resume();if(p&&p.catch)p.catch(()=>{});
    }
    if(SET.music&&AU.ctx.state==='running')musicStart();
  }catch(e){}
}
const auOK=()=>AU.ctx&&AU.ctx.state==='running';
for(const ev of['pointerdown','touchend','click','keydown'])window.addEventListener(ev,auInit,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{
  if(!AU.ctx)return;
  if(document.hidden){musicPause();try{AU.ctx.suspend();}catch(e){}}
  else{const p=AU.ctx.resume&&AU.ctx.resume();if(p&&p.catch)p.catch(()=>{});}
});
function tone(f,d,type,v,f2,delay){const c=AU.ctx;if(!c)return;const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.2,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AU.sfxG);o.start(t);o.stop(t+d+.05);}
function noiseBuf(){if(NB)return NB;const c=AU.ctx;NB=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;return NB;}
function noise(d,v,ff,type,delay,ff2){const c=AU.ctx;if(!c)return;const t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=noiseBuf();const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(ff||1200,t);if(ff2)f.frequency.exponentialRampToValueAtTime(ff2,t+d);const g=c.createGain();g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(AU.sfxG);s.start(t);s.stop(t+d+.05);}
function sfx(n){
  if(!SET.sfx||!auOK())return;
  switch(n){
    case 'hit':noise(.12,.35,1800,'lowpass');tone(160,.12,'square',.08,60);break;
    case 'crit':noise(.16,.45,2600);tone(180,.16,'square',.1,50);tone(1320,.2,'triangle',.08,null,.02);break;
    case 'heal':[660,880,1100].forEach((f,i)=>tone(f,.25,'sine',.09,null,i*.06));break;
    case 'holy':[784,988,1175,1568].forEach((f,i)=>tone(f,.35,'sine',.07,null,i*.05));break;
    case 'step':noise(.05,.06,500,'lowpass');break;
    case 'select':tone(560,.07,'square',.04);break;
    case 'click':tone(380,.05,'square',.035);break;
    case 'swing':noise(.12,.18,900,'bandpass',0,3000);break;
    case 'whoosh':noise(.3,.14,400,'bandpass',0,2400);break;
    case 'spell':tone(500,.3,'sine',.08,1400);noise(.25,.06,3000,'highpass');break;
    case 'fire':noise(.5,.35,900,'lowpass',0,200);tone(90,.4,'sawtooth',.06,50);break;
    case 'acid':noise(.35,.2,1400,'bandpass',0,300);tone(220,.3,'sine',.05,110);break;
    case 'ice':tone(1600,.3,'sine',.07,900);tone(2200,.2,'triangle',.04,1200,.05);break;
    case 'slam':tone(90,.25,'square',.12,40);noise(.2,.3,600);break;
    case 'death':tone(320,.4,'sawtooth',.07,70);noise(.3,.12,700);break;
    case 'crumble':noise(.7,.3,500,'lowpass',0,120);break;
    case 'fall':tone(440,.8,'triangle',.1,110);tone(330,.8,'sine',.06,82,.1);break;
    case 'chest':[880,1320,1760].forEach((f,i)=>tone(f,.18,'square',.05,null,i*.07));break;
    case 'coin':[1320,1760].forEach((f,i)=>tone(f,.12,'square',.05,null,i*.06));break;
    case 'villain':tone(73,1.1,'sawtooth',.12);tone(77,1.1,'sawtooth',.1);noise(1,.1,300);break;
    case 'turn':tone(523.3,.12,'square',.04);tone(784,.16,'square',.04,null,.08);break;
    case 'round':[392,523.3,659.3].forEach((f,i)=>tone(f,.3,'square',.04,null,i*.08));break;
    case 'victory':[523.3,659.3,784,1046.5].forEach((f,i)=>tone(f,.5,'square',.06,null,i*.13));tone(1046.5,1.2,'triangle',.06,null,.52);break;
    case 'defeat':[392,330,262,196].forEach((f,i)=>tone(f,.6,'triangle',.09,null,i*.22));break;
  }
}
/* Music: a gentle chiptune loop, pitched up so a phone speaker can play it. Bars are scheduled just
   ahead of the audio clock, so a paused/suspended context never builds up a burst of queued notes. */
const MUSIC={next:0,i:0};
function musicBar(t){
  const c=AU.ctx;
  const chords=[[293.7,440,587.3],[233.1,349.2,466.2],[349.2,440,523.3],[261.6,392,523.3]];
  const scale=[587.3,698.5,784,880,1046.5,1174.7,1396.9];
  const ch=chords[MUSIC.i++%4];
  for(const f of ch){const o=c.createOscillator();o.type='triangle';o.frequency.value=f;const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.035,t+.8);g.gain.linearRampToValueAtTime(.0001,t+3.9);o.connect(g);g.connect(AU.musG);o.start(t);o.stop(t+4);}
  const bo=c.createOscillator();bo.type='square';bo.frequency.value=ch[0]/2;const bf=c.createBiquadFilter();bf.type='lowpass';bf.frequency.value=900;const bg=c.createGain();
  for(const k of[0,1.5,2,3]){bg.gain.setValueAtTime(.0001,t+k);bg.gain.exponentialRampToValueAtTime(.05,t+k+.02);bg.gain.exponentialRampToValueAtTime(.0001,t+k+.4);}
  bo.connect(bf);bf.connect(bg);bg.connect(AU.musG);bo.start(t);bo.stop(t+4);
  for(let k=0;k<8;k++){if(Math.random()<.55){const f=scale[Math.floor(Math.random()*scale.length)];const p=c.createOscillator();p.type='square';p.frequency.value=f;const pf=c.createBiquadFilter();pf.type='lowpass';pf.frequency.value=2400;const pg=c.createGain();const tt=t+k*.5;pg.gain.setValueAtTime(.0001,tt);pg.gain.exponentialRampToValueAtTime(.022,tt+.01);pg.gain.exponentialRampToValueAtTime(.0001,tt+.4);p.connect(pf);pf.connect(pg);pg.connect(AU.musG);p.start(tt);p.stop(tt+.45);}}
}
function musicTick(){
  if(!auOK()||!SET.music)return;
  const now=AU.ctx.currentTime;
  if(MUSIC.next<now+.05)MUSIC.next=now+.1;
  while(MUSIC.next<now+1.2){musicBar(MUSIC.next);MUSIC.next+=4;}
}
function musicStart(){
  if(!auOK()||MUS)return;AU.musG.gain.cancelScheduledValues(AU.ctx.currentTime);AU.musG.gain.setTargetAtTime(.5,AU.ctx.currentTime,1.2);
  MUSIC.next=0;musicTick();MUS=setInterval(musicTick,300);
}
function musicPause(){if(MUS){clearInterval(MUS);MUS=null;}}
function musicStop(){musicPause();if(AU.ctx)AU.musG.gain.setTargetAtTime(0,AU.ctx.currentTime,.3);}
