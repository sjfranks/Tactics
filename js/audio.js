'use strict';
/* =====================================================================
   EMBERWATCH — synthesized sound effects and music. No audio files:
   everything is built from oscillators and noise, through a shared
   reverb, and kept in the range a phone speaker can actually play.
   ===================================================================== */
const AU={ctx:null,made:0};let NB=null,MUS=null;
const MUSVOL=.34;
/* iOS: by default play alongside other apps (Spotify etc.) and respect the silent switch.
   'Silent switch: Ignore' instead takes over the audio (pauses Spotify) so the game plays even on silent. */
function auSession(){try{if(navigator.audioSession)navigator.audioSession.type=SET.loud?'playback':'ambient';}catch(e){}}
/* A looping, silent <audio> element puts iOS in media-playback mode, which also makes Web Audio ignore
   the silent switch. This covers iPhones without navigator.audioSession, and backs it up on newer ones. */
let SILENT=null;
function silentWav(){const n=4000,b=new Uint8Array(44+n),v=new DataView(b.buffer);const w=(o,s)=>{for(let i=0;i<s.length;i++)b[o+i]=s.charCodeAt(i);};
  w(0,'RIFF');v.setUint32(4,36+n,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,'data');v.setUint32(40,n,true);b.fill(128,44);
  let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return 'data:audio/wav;base64,'+btoa(s);}
function silentKeepAlive(){
  try{
    if(!SET.loud){if(SILENT&&!SILENT.paused)SILENT.pause();return;}
    if(!SILENT){SILENT=document.createElement('audio');SILENT.src=silentWav();SILENT.loop=true;SILENT.setAttribute('playsinline','');SILENT.setAttribute('webkit-playsinline','');SILENT.preload='auto';}
    if(SILENT.paused){const p=SILENT.play();if(p&&p.catch)p.catch(()=>{});}
  }catch(e){}
}
/* Settings toggle: switch mode inside the tap, then rebuild audio so iOS applies it. */
function setPlayOnSilent(on){
  SET.loud=on;saveSet();auSession();silentKeepAlive();
  try{musicPause();auMake();const p=AU.ctx&&AU.ctx.resume&&AU.ctx.resume();if(p&&p.catch)p.catch(()=>{});if(SET.music)musicStart();sfx('select');}catch(e){}
}
function impulse(c,dur,decay){const n=Math.floor(c.sampleRate*dur),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}return b;}
function auMake(){
  auSession();
  const Ctor=window.AudioContext||window.webkitAudioContext;if(!Ctor)return;
  try{if(AU.ctx&&AU.ctx.close)AU.ctx.close();}catch(e){}
  NB=null;AU.made=performance.now();MUSIC.track=null;MUSIC.switchAt=0;
  AU.ctx=new Ctor();
  const c=AU.ctx;
  AU.comp=c.createDynamicsCompressor();AU.comp.threshold.value=-16;AU.comp.knee.value=10;AU.comp.ratio.value=5;AU.comp.attack.value=.004;AU.comp.release.value=.18;AU.comp.connect(c.destination);
  AU.master=c.createGain();AU.master.gain.value=.9;AU.master.connect(AU.comp);
  try{AU.verb=c.createConvolver();AU.verb.buffer=impulse(c,1.7,2.8);AU.verb.connect(AU.master);}catch(e){AU.verb=null;}
  AU.sfxG=c.createGain();AU.sfxG.gain.value=.95;AU.sfxG.connect(AU.master);
  AU.duck=c.createGain();AU.duck.gain.value=1;AU.duck.connect(AU.master);
  AU.musG=c.createGain();AU.musG.gain.value=.0001;AU.musG.connect(AU.duck);
  if(AU.verb){const a=c.createGain();a.gain.value=.16;AU.sfxG.connect(a);a.connect(AU.verb);const b=c.createGain();b.gain.value=.3;AU.duck.connect(b);b.connect(AU.verb);}
  /* A silent blip inside the tap is what actually unlocks sound on iOS. */
  const b=c.createBuffer(1,1,22050),src=c.createBufferSource();src.buffer=b;src.connect(c.destination);src.start(0);
  c.onstatechange=()=>{if(c.state==='running'&&SET.music)musicStart();};
}
/* Called on every tap. Starts audio, or wakes it after a phone call / another app / locking the screen. */
function auInit(){
  try{
    silentKeepAlive();
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
  if(document.hidden){musicPause();try{AU.ctx.suspend();}catch(e){}if(SILENT&&!SILENT.paused)SILENT.pause();}
  else{const p=AU.ctx.resume&&AU.ctx.resume();if(p&&p.catch)p.catch(()=>{});}
});

/* ---------------- building blocks ---------------- */
function noiseBuf(){if(NB)return NB;const c=AU.ctx;NB=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;return NB;}
/* a pitched blip: frequency sweeps f0→f1 while the level decays */
function tn(t,f0,f1,dur,v,type,out){const c=AU.ctx;const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.012,dur*.2));g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out||AU.sfxG);o.start(t);o.stop(t+dur+.05);}
/* filtered noise with a sweeping cutoff */
function nz(t,dur,v,type,f0,f1,q,out){const c=AU.ctx;const s=c.createBufferSource();s.buffer=noiseBuf();s.loop=true;const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(f0||1200,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+dur);if(q)f.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(out||AU.sfxG);s.start(t,Math.random()*.5);s.stop(t+dur+.05);}
function envAt(g,t,peak,a,d,s,dur,r){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.linearRampToValueAtTime(peak*s,t+a+d);const end=t+Math.max(a+d,dur);g.gain.setValueAtTime(peak*s,end);g.gain.linearRampToValueAtTime(.0001,end+r);return end+r;}
const NOTE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midiOf(n){const m=/^([A-G])(#|b)?(-?\d)$/.exec(n);if(!m)return 60;return 12*(+m[3]+1)+NOTE_PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);}
const mf=m=>440*Math.pow(2,(m-69)/12);
const freq=n=>mf(midiOf(n));

/* ---------------- instruments ---------------- */
const INST={
  /* square lead with a detuned saw underneath and delayed vibrato */
  lead(t,f,d,v,out){const c=AU.ctx;const g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=Math.min(4200,f*4.5);fl.Q.value=.6;
    const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(f,t);const o2=c.createOscillator();o2.type='sawtooth';o2.frequency.setValueAtTime(f,t);o2.detune.value=-9;const g2=c.createGain();g2.gain.value=.35;
    const lfo=c.createOscillator();lfo.frequency.value=5.3;const lg=c.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.007,t+.3);lfo.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
    o.connect(fl);o2.connect(g2);g2.connect(fl);fl.connect(g);g.connect(out);
    const end=envAt(g,t,v*.11,.012,.12,.7,d*.92,.09);for(const n of[o,o2,lfo]){n.start(t);n.stop(end+.02);}},
  /* soft breathy flute: triangle + a little noise */
  flute(t,f,d,v,out){const c=AU.ctx;const g=c.createGain();const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(f,t);const o2=c.createOscillator();o2.type='sine';o2.frequency.setValueAtTime(f*2,t);const g2=c.createGain();g2.gain.value=.18;
    const lfo=c.createOscillator();lfo.frequency.value=4.8;const lg=c.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.008,t+.35);lfo.connect(lg);lg.connect(o.frequency);
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(out);
    const end=envAt(g,t,v*.2,.05,.15,.8,d*.95,.14);for(const n of[o,o2,lfo]){n.start(t);n.stop(end+.02);}},
  /* plucked string: bright attack that closes down quickly */
  pluck(t,f,d,v,out){const c=AU.ctx;const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(f,t);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(Math.min(5000,f*7),t);fl.frequency.exponentialRampToValueAtTime(Math.max(200,f*1.2),t+.28);
    const g=c.createGain();const L=Math.min(d,.5)+.25;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*.11,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+L);o.connect(fl);fl.connect(g);g.connect(out);o.start(t);o.stop(t+L+.02);},
  /* warm pad: two detuned saws through a low filter, slow swell */
  pad(t,f,d,v,out){const c=AU.ctx;const g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=900;fl.Q.value=.4;
    const os=[-7,7].map(dt=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.detune.value=dt;o.connect(fl);return o;});fl.connect(g);g.connect(out);
    const end=envAt(g,t,v*.035,.35,.3,.85,d,.5);for(const o of os){o.start(t);o.stop(end+.02);}},
  /* bass: triangle body plus a filtered square so small speakers still hear it */
  bass(t,f,d,v,out){const c=AU.ctx;const g=c.createGain();const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(f,t);const o2=c.createOscillator();o2.type='square';o2.frequency.setValueAtTime(f,t);
    const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=Math.min(1400,f*5);const g2=c.createGain();g2.gain.value=.3;o.connect(g);o2.connect(fl);fl.connect(g2);g2.connect(g);g.connect(out);
    const end=envAt(g,t,v*.26,.006,.12,.65,d*.9,.06);o.start(t);o.stop(end+.02);o2.start(t);o2.stop(end+.02);},
  /* bell: inharmonic partials, long ring */
  bell(t,f,d,v,out){for(const[k,a]of[[1,1],[2.76,.32],[5.4,.1],[2,.25]]){tn(t,f*k,f*k,Math.max(.6,d+.8)/(k>2?1.6:1),v*.09*a,'sine',out);}},
  kick(t,v,out){tn(t,150,46,.2,v*.7,'sine',out);nz(t,.012,v*.12,'highpass',3000,3000,0,out);},
  snare(t,v,out){nz(t,.16,v*.3,'bandpass',1900,1500,.7,out);tn(t,200,150,.08,v*.16,'triangle',out);},
  hat(t,v,out,open){nz(t,open?.12:.035,v*.1,'highpass',7500,7500,0,out);},
};
function jingle(notes,inst,out){const c=AU.ctx;const t0=c.currentTime+.02;for(const[n,at,dur,v]of notes)INST[inst](t0+at,freq(n),dur,v||1,out||AU.sfxG);}

/* ---------------- sound effects ---------------- */
function sfx(n){
  if(!SET.sfx||!auOK())return;
  const t=AU.ctx.currentTime+.005,R=Math.random;
  switch(n){
    case 'click':tn(t,1500,1100,.035,.06,'square');break;
    case 'tick':tn(t,760+R()*80,760,.025,.022,'square');break;
    case 'select':tn(t,880,880,.045,.05,'square');tn(t+.045,1320,1320,.06,.045,'square');break;
    case 'step':nz(t,.06,.4,'lowpass',700,220);tn(t,120,70,.05,.08,'sine');break;
    case 'slide':nz(t,.14,.35,'bandpass',700,300,1);break;
    case 'swing':nz(t,.16,.6,'bandpass',600,3400,1.3);break;
    case 'graze':tn(t,320,160,.07,.12,'triangle');nz(t,.05,.1,'highpass',2400,1200);break;
    case 'hit':tn(t,180,58,.11,.32,'sine');nz(t,.09,.28,'lowpass',2600,380);break;
    case 'crit':tn(t,150,36,.4,.6,'sine');nz(t,.34,.42,'lowpass',4200,180);tn(t+.012,1319,1319,.55,.07,'triangle');tn(t+.012,1976,1976,.45,.045,'sine');nz(t+.02,.5,.08,'highpass',6000,3000);break;
    case 'slam':tn(t,110,38,.28,.45,'sine');nz(t,.22,.32,'lowpass',900,100);break;
    case 'bow':tn(t,280,190,.12,.16,'triangle');nz(t,.08,.25,'highpass',4200,2200);break;
    case 'spell':tn(t,480,1500,.26,.07,'sine');for(let i=0;i<4;i++)tn(t+i*.045,1400+i*320,1400+i*320,.22,.03,'sine');break;
    case 'firecast':nz(t,.4,.55,'bandpass',300,2600,.8);tn(t,120,70,.32,.1,'sawtooth');break;
    case 'icecast':for(let i=0;i<5;i++){const f=1900+R()*1100;tn(t+i*.035,f,f*.97,.2,.045,'sine');}break;
    case 'holycast':for(const f of[784,988,1175])tn(t,f,f,.55,.045,'sine');nz(t,.4,.04,'highpass',6000,6000);break;
    case 'zap':nz(t,.26,.24,'highpass',1400,4200);tn(t,95,60,.26,.12,'sawtooth');for(let i=0;i<5;i++)nz(t+R()*.22,.02,.16,'highpass',3000,3000);break;
    case 'boom':nz(t,.85,.6,'lowpass',2800,70);tn(t,115,32,.65,.6,'sine');for(let i=0;i<6;i++)nz(t+.05+R()*.4,.03,.1,'bandpass',1800+R()*1500,1500,1.5);break;
    case 'thump':tn(t,230,48,.36,.42,'sine');nz(t,.3,.24,'lowpass',950,140);break;
    case 'fire':nz(t,.45,.28,'lowpass',1300,220);for(let i=0;i<6;i++)nz(t+R()*.4,.018,.14,'highpass',2500+R()*2000,2500);break;
    case 'acid':for(let i=0;i<5;i++){const f=280+R()*320;tn(t+i*.06,f,f*1.9,.06,.07,'sine');}nz(t,.3,.08,'bandpass',900,400,1);break;
    case 'ice':tn(t,2500,1600,.26,.06,'sine');tn(t+.05,3200,2200,.22,.04,'triangle');break;
    case 'holy':for(const[f,i]of[[523.3,0],[659.3,1],[784,2],[1046.5,3]])tn(t+i*.05,f,f,.7,.05,'sine');break;
    case 'heal':for(const[f,i]of[[659.3,0],[880,1],[1174.7,2],[1568,3]])tn(t+i*.055,f,f,.45,.055,'sine');nz(t+.1,.3,.03,'highpass',7000,7000);break;
    case 'gem':tn(t,1760,1760,.09,.035,'sine');tn(t+.05,2637,2637,.12,.03,'sine');break;
    case 'death':tn(t,270,52,.5,.18,'sawtooth');nz(t,.35,.14,'lowpass',800,120);break;
    case 'fall':for(const[f,i]of[[440,0],[349.2,1],[293.7,2]])tn(t+i*.16,f,f*.98,.6,.09,'triangle');break;
    case 'crumble':nz(t,.8,.34,'lowpass',720,80);for(let i=0;i<5;i++)nz(t+R()*.5,.04,.12,'bandpass',600+R()*600,400,2);break;
    case 'chest':tn(t,170,260,.22,.05,'sawtooth');for(const[f,i]of[[1568,0],[2093,1],[1760,2],[2349,3]])tn(t+.2+i*.05,f,f,.12,.04,'square');break;
    case 'coin':case 'buy':tn(t,1318.5,1318.5,.08,.05,'square');tn(t+.07,1760,1760,.22,.05,'square');break;
    case 'learn':for(const[f,i]of[[1046.5,0],[1318.5,1],[1568,2],[2093,3]])tn(t+i*.07,f,f,.6,.05,'sine');nz(t,.6,.03,'highpass',6000,6000);break;
    case 'villain':tn(t,73.4,73.4,1.3,.14,'sawtooth');tn(t,110,110,1.3,.08,'sawtooth');tn(t,146.8,138,1.3,.05,'sawtooth');nz(t,1.3,.12,'lowpass',260,120);break;
    case 'turn':tn(t,1046.5,1046.5,.2,.045,'sine');tn(t+.08,1568,1568,.3,.045,'sine');break;
    case 'foeturn':tn(t,196,190,.2,.07,'triangle');break;
    case 'foes':tn(t,98,92,.55,.16,'sawtooth');nz(t,.25,.2,'lowpass',500,120);tn(t+.16,73.4,70,.7,.11,'triangle');break;
    case 'combo':tn(t,220,440,.18,.06,'sawtooth');for(const[f,i]of[[880,0],[1108.7,1],[1318.5,2],[1760,3]])tn(t+i*.045,f,f,.28,.045,'square');tn(t+.18,2217.5,2217.5,.4,.035,'sine');break;
    case 'round':nz(t,.12,.2,'bandpass',1800,1400,.8);tn(t,150,90,.2,.3,'sine');for(const f of[220,331,440])tn(t+.06,f,f*.99,1.1,.045,'sine');break;
    case 'whoosh':nz(t,.34,.45,'bandpass',380,2600,1);break;
    case 'dice':{let at=0;for(let i=0;i<8;i++){at+=.04+R()*.04;nz(t+at,.025,.22*(1-i/10),'bandpass',2200+R()*1600,2000,2.2);}break;}
    case 'success':for(const[f,i]of[[784,0],[987.8,1],[1174.7,2],[1568,3]])tn(t+i*.06,f,f,.35,.05,'square');tn(t+.24,1568,1568,.6,.04,'sine');break;
    case 'fail':tn(t,330,220,.3,.1,'square');tn(t+.22,262,165,.5,.1,'square');break;
    case 'victory':duck(2.6);jingle([['G4',0,.1],['C5',.1,.1],['E5',.2,.1],['G5',.3,.12],['C6',.45,.9],['E5',.45,.9,.6],['G5',.45,.9,.6]],'lead');
      for(let i=0;i<6;i++)INST.snare(t+i*.06,.5+i*.08,AU.sfxG);INST.kick(t+.45,1,AU.sfxG);nz(t+.45,1.2,.12,'highpass',5000,3000);
      jingle([['C4',.45,1.1],['G4',.45,1.1],['E4',.45,1.1]],'pad');break;
    case 'defeat':duck(3);jingle([['E5',0,.35],['D5',.4,.35],['C5',.8,.35],['A4',1.2,1.3]],'flute');jingle([['A3',0,2.4],['C4',0,2.4],['E4',0,2.4]],'pad');INST.bell(t+1.2,freq('A3'),1.5,1,AU.sfxG);break;
  }
}
function duck(sec){if(!AU.duck)return;const t=AU.ctx.currentTime;AU.duck.gain.cancelScheduledValues(t);AU.duck.gain.setValueAtTime(AU.duck.gain.value,t);AU.duck.gain.linearRampToValueAtTime(.18,t+.08);AU.duck.gain.setValueAtTime(.18,t+sec);AU.duck.gain.linearRampToValueAtTime(1,t+sec+1.2);}

/* ---------------- music ---------------- */
/* Each track: tempo, one chord per bar, melody lines (16 steps a bar: note, '-' hold, '.' rest), and patterns
   that follow the chord (R root, T third, F fifth, O octave, t/f an octave up, L fifth below), plus drums. */
const TRACKS={
  title:{bpm:84,chords:['Dm','Bb','F','C','Dm','Bb','Gm','A'],
    lead:{inst:'flute',v:1,bars:['D5 - - - A4 - - - F4 - G4 - A4 - - -','Bb4 - - - A4 - G4 - F4 - - - D4 - - -','C5 - - - A4 - - - F4 - A4 - C5 - - -','E5 - - - D5 - C5 - G4 - - - - - - -',
      'D5 - - - F5 - - - E5 - D5 - C5 - A4 -','Bb4 - - - D5 - - - F5 - - - D5 - - -','G4 - - - Bb4 - D5 - C5 - Bb4 - A4 - G4 -','A4 - - - - - - - C#5 - - - E5 - - -']},
    pad:{inst:'pad',oct:4,v:1},bass:{inst:'bass',oct:3,v:.9,pat:'R - - - - - - - R - - - F - - -'},
    arp:{inst:'pluck',oct:4,v:.5,pat:'R . F . O . F . t . F . O . F .'},drums:{kick:'x...............'}},
  map:{bpm:104,chords:['D','G','D','A','Bm','G','A','D'],
    lead:{inst:'lead',v:.8,bars:['F#4 - A4 - D5 - - - C#5 - B4 - A4 - - -','B4 - - - G4 - B4 - D5 - - - B4 - - -','A4 - F#4 - A4 - D5 - F#5 - E5 - D5 - - -','E5 - - - C#5 - A4 - E4 - - - - - - -',
      'F#5 - E5 - D5 - - - B4 - D5 - F#5 - - -','G5 - F#5 - E5 - D5 - B4 - - - G4 - - -','A4 - C#5 - E5 - - - D5 - C#5 - B4 - A4 -','D5 - - - - - - - A4 - F#4 - D4 - - -']},
    pad:{inst:'pad',oct:4,v:.7},bass:{inst:'bass',oct:3,v:1,pat:'R . . . F . . . O . . . F . . .'},
    arp:{inst:'pluck',oct:4,v:.35,pat:'. . T . . . F . . . T . . . F .'},drums:{kick:'x.......x.......',hat:'..x...x...x...x.'}},
  battle:{bpm:132,chords:['Em','C','D','B','Em','G','Am','B'],
    lead:{inst:'lead',v:.85,bars:['E5 - - B4 - - E5 - F#5 - G5 - F#5 - E5 -','E5 - - - C5 - - - G4 - - - C5 - - -','D5 - - A4 - - D5 - E5 - F#5 - E5 - D5 -','D#5 - - - B4 - - - F#4 - - - B4 - D#5 -',
      'E5 - G5 - B5 - - - A5 - G5 - F#5 - E5 -','D5 - - - B4 - - - G4 - B4 - D5 - - -','C5 - - - E5 - - - A5 - G5 - E5 - C5 -','B4 - - - D#5 - - - F#5 - - - B5 - - -']},
    pad:{inst:'pad',oct:4,v:.6},bass:{inst:'bass',oct:3,v:1,pat:'R . R . O . R . R . R . O . F .'},
    drums:{kick:'x.....x.x.......',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.'}},
  boss:{bpm:148,chords:['Dm','Eb','Dm','C','Bb','A','Dm','A'],
    lead:{inst:'lead',v:.9,bars:['D5 - - - A4 - - - D5 - F5 - E5 - D5 -','Eb5 - - - Bb4 - - - G4 - - - Bb4 - Eb5 -','D5 - F5 - A5 - - - G5 - F5 - E5 - D5 -','C5 - - - E5 - - - G5 - - - E5 - C5 -',
      'D5 - - - F5 - - - Bb5 - A5 - G5 - F5 -','E5 - - - C#5 - - - A4 - C#5 - E5 - A5 -','F5 - E5 - D5 - - - A4 - - - D5 - - -','C#5 - - - E5 - - - A5 - - - G5 - E5 -']},
    pad:{inst:'pad',oct:3,v:.9},bass:{inst:'bass',oct:3,v:1,pat:'R R O R R R O R R R O R R O R O'},
    drums:{kick:'x...x...x...x...',snare:'....x.......x..x',hat:'xxxxxxxxxxxxxxxx'}},
  camp:{bpm:70,chords:['F','Am','Bb','C','F','Dm','Bb','C'],
    lead:{inst:'flute',v:.8,bars:['A4 - - - - - C5 - - - A4 - G4 - - -','E4 - - - - - - - A4 - - - C5 - - -','D5 - - - C5 - Bb4 - A4 - - - F4 - - -','G4 - - - - - - - - - - - E4 - - -',
      'F4 - A4 - C5 - - - F5 - - - E5 - C5 -','D5 - - - - - A4 - - - F4 - A4 - - -','Bb4 - - - A4 - G4 - F4 - - - D4 - - -','E4 - - - G4 - - - C5 - - - - - - -']},
    bass:{inst:'bass',oct:3,v:.8,pat:'R - - - - - - - F - - - - - - -'},arp:{inst:'pluck',oct:4,v:.55,pat:'R . F . O . t . f . t . O . F .'}},
  shop:{bpm:112,chords:['G','C','D','G','G','Em','A','D'],
    lead:{inst:'lead',v:.6,bars:['G4 - B4 - D5 - B4 - G4 - B4 - D5 - - -','E5 - - - C5 - E5 - G5 - E5 - C5 - - -','F#5 - E5 - D5 - C5 - B4 - A4 - F#4 - - -','G4 - - - B4 - - - G4 - - - - - - -',
      'B4 - D5 - G5 - D5 - B4 - D5 - G5 - - -','G5 - F#5 - E5 - D5 - E5 - - - B4 - - -','A4 - C#5 - E5 - C#5 - A4 - - - D5 - - -','F#5 - - - A5 - F#5 - D5 - - - - - - -']},
    bass:{inst:'bass',oct:3,v:.9,pat:'R . . . F . . . R . . . F . . .'},arp:{inst:'pluck',oct:4,v:.45,pat:'. . T . . . F . . . T . . . F .'},drums:{kick:'x.......x.......',hat:'....x.......x...'}},
  event:{bpm:66,chords:['Am','F','Dm','E','Am','F','G','E'],
    bell:{inst:'bell',v:1,bars:['E5 - - - - - - - A5 - - - - - - -','C5 - - - - - - - F5 - - - E5 - - -','D5 - - - - - - - A4 - - - - - - -','G#4 - - - - - - - B4 - - - E5 - - -',
      'A5 - - - - - - - E5 - - - C5 - - -','F5 - - - - - - - C5 - - - A4 - - -','B4 - - - - - - - D5 - - - G5 - - -','G#5 - - - - - - - E5 - - - B4 - - -']},
    pad:{inst:'pad',oct:3,v:1.2},bass:{inst:'bass',oct:3,v:.6,pat:'R - - - - - - - - - - - - - - -'}},
};
function chordOf(name){const m=/^([A-G][b#]?)(m|dim)?$/.exec(name)||['','C',''];const root=midiOf(m[1]+'4')%12;const q=m[2]||'';return {root,iv:q==='m'?[0,3,7]:q==='dim'?[0,3,6]:[0,4,7]};}
function degree(ch,tok,oct){const b=12*(oct+1)+ch.root,[,th,fi]=ch.iv;return ({R:b,T:b+th,F:b+fi,O:b+12,t:b+12+th,f:b+12+fi,o:b+24,L:b+fi-12})[tok]||b;}
function schedStep(T,step,t){
  const nb=T.chords.length,bar=Math.floor(step/16)%nb,s=step%16,sd=60/T.bpm/4,out=AU.musG;
  const ch=chordOf(T.chords[bar]);
  for(const key of['lead','bell']){const L=T[key];if(!L)continue;const row=L.bars[bar%L.bars.length].split(/\s+/);const tok=row[s];if(!tok||tok==='.'||tok==='-')continue;
    let n=1;while(row[s+n]==='-')n++;INST[L.inst](t,freq(tok),n*sd,L.v*(.92+Math.random()*.08),out);}
  if(T.pad&&s===0)for(const iv of ch.iv)INST[T.pad.inst](t,mf(12*(T.pad.oct+1)+ch.root+iv),sd*15,T.pad.v,out);
  for(const key of['bass','arp']){const L=T[key];if(!L)continue;const row=L.pat.split(/\s+/);const tok=row[s];if(!tok||tok==='.'||tok==='-')continue;
    let n=1;while(row[s+n]==='-')n++;INST[L.inst](t,mf(degree(ch,tok,L.oct)),n*sd,L.v*(s%4===0?1:.85),out);}
  if(T.drums){const D=T.drums;
    if(D.kick&&D.kick[s]==='x')INST.kick(t,.9,out);if(D.snare&&D.snare[s]==='x')INST.snare(t,.8,out);if(D.hat&&D.hat[s]==='x')INST.hat(t,s%4===0?.9:.6,out,false);}
}
const MUSIC={track:null,step:0,next:0,switchAt:0};
function musicTick(){
  if(!auOK()||!SET.music)return;
  const c=AU.ctx,now=c.currentTime;
  const want=typeof musicWanted==='function'?musicWanted():'title';
  if(want!==MUSIC.track){
    if(!MUSIC.switchAt){AU.musG.gain.cancelScheduledValues(now);AU.musG.gain.setValueAtTime(Math.max(.0001,AU.musG.gain.value),now);AU.musG.gain.linearRampToValueAtTime(.0001,now+.45);MUSIC.switchAt=now+.5;}
    else if(now>=MUSIC.switchAt){MUSIC.track=want;MUSIC.step=0;MUSIC.next=now+.05;MUSIC.switchAt=0;
      AU.musG.gain.cancelScheduledValues(now);AU.musG.gain.setValueAtTime(.0001,now);if(want)AU.musG.gain.linearRampToValueAtTime(MUSVOL,now+1.4);}
    return;
  }
  const T=TRACKS[MUSIC.track];if(!T)return;
  const sd=60/T.bpm/4;
  if(MUSIC.next<now)MUSIC.next=now+.05;
  while(MUSIC.next<now+.3){schedStep(T,MUSIC.step,MUSIC.next);MUSIC.step++;MUSIC.next+=sd;}
}
function musicStart(){if(!auOK()||MUS)return;MUSIC.next=0;musicTick();MUS=setInterval(musicTick,80);}
function musicPause(){if(MUS){clearInterval(MUS);MUS=null;}}
function musicStop(){musicPause();MUSIC.track=null;MUSIC.switchAt=0;if(AU.ctx){const t=AU.ctx.currentTime;AU.musG.gain.cancelScheduledValues(t);AU.musG.gain.setTargetAtTime(.0001,t,.25);}}
