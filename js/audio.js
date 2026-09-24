'use strict';
/* =====================================================================
   EMBERWATCH — synthesized sound, no files
   ===================================================================== */
const AU={ctx:null};let NB=null,MUS=null;
function auInit(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume();return;}
  try{const Ctor=window.AudioContext||window.webkitAudioContext;if(!Ctor)return;AU.ctx=new Ctor();
    AU.master=AU.ctx.createGain();AU.master.gain.value=.5;AU.master.connect(AU.ctx.destination);
    AU.sfxG=AU.ctx.createGain();AU.sfxG.connect(AU.master);AU.musG=AU.ctx.createGain();AU.musG.gain.value=0;AU.musG.connect(AU.master);
    if(SET.music)musicStart();}catch(e){}
}
function tone(f,d,type,v,f2,delay){const c=AU.ctx;if(!c)return;const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.2,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AU.sfxG);o.start(t);o.stop(t+d+.05);}
function noiseBuf(){if(NB)return NB;const c=AU.ctx;NB=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;return NB;}
function noise(d,v,ff,type,delay,ff2){const c=AU.ctx;if(!c)return;const t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=noiseBuf();const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(ff||1200,t);if(ff2)f.frequency.exponentialRampToValueAtTime(ff2,t+d);const g=c.createGain();g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(AU.sfxG);s.start(t);s.stop(t+d+.05);}
function sfx(n){
  if(!SET.sfx||!AU.ctx)return;
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
function musicStart(){
  if(!AU.ctx||MUS)return;AU.musG.gain.setTargetAtTime(.18,AU.ctx.currentTime,1.2);
  const chords=[[146.8,220,293.7],[116.5,174.6,233.1],[174.6,220,261.6],[130.8,196,261.6]];
  const scale=[293.7,349.2,392,440,523.3,587.3,698.5];let i=0;
  const bar=()=>{const c=AU.ctx,t=c.currentTime+.05;const ch=chords[i++%4];
    for(const f of ch){const o=c.createOscillator();o.type='square';o.frequency.value=f;const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=520;const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.022,t+1.2);g.gain.linearRampToValueAtTime(.0001,t+4.4);o.connect(fl);fl.connect(g);g.connect(AU.musG);o.start(t);o.stop(t+4.5);}
    const o=c.createOscillator();o.type='triangle';o.frequency.value=ch[0]/2;const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.09,t+.3);g.gain.linearRampToValueAtTime(.0001,t+4);o.connect(g);g.connect(AU.musG);o.start(t);o.stop(t+4.1);
    for(let k=0;k<8;k++){if(Math.random()<.5){const f=scale[Math.floor(Math.random()*scale.length)]*(Math.random()<.25?2:1);const p=c.createOscillator();p.type='square';p.frequency.value=f;const pg=c.createGain();const tt=t+k*.5;pg.gain.setValueAtTime(.0001,tt);pg.gain.exponentialRampToValueAtTime(.025,tt+.01);pg.gain.exponentialRampToValueAtTime(.0001,tt+.45);p.connect(pg);pg.connect(AU.musG);p.start(tt);p.stop(tt+.5);}}
    for(const k of[0,1,2,3]){noise(.12,k%2?.05:.12,k%2?2000:140,k%2?'highpass':'lowpass',t-c.currentTime+k);}
  };
  bar();MUS=setInterval(bar,4000);
}
function musicStop(){if(MUS){clearInterval(MUS);MUS=null;}if(AU.ctx)AU.musG.gain.setTargetAtTime(0,AU.ctx.currentTime,.3);}
