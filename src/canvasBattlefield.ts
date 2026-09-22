const CELL=16;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const canvasClasses=['battlefield-canvas','battlefield-token-canvas','battlefield-status-canvas'];
const canvases=canvasClasses.map(className=>{const canvas=document.createElement('canvas');canvas.className=className;canvas.setAttribute('aria-hidden','true');frame.appendChild(canvas);return canvas;});
const [groundCanvas,tokenCanvas,statusCanvas]=canvases;
const asset=(path:string)=>import.meta.env.BASE_URL+'assets/'+path;
const load=(path:string)=>{const image=new Image();image.decoding='async';image.src=asset(path);return image;};
const background=load('encounters/avaran-arena-6x8.webp');
const legacyUnits=load('emblem/units.png');
const heroes=load('encounters/heroes-atlas.webp');
const enemies=load('encounters/tactics48-enemies-atlas.webp');

const legacyCells:Record<string,[number,number]>={mira:[1,0]};
const heroCells:Record<string,[number,number]>={lyra:[0,0],nox:[1,0],garrick:[1,1]};
const enemyCells:Record<string,[number,number]>={
  'enemy-skirmisher':[0,0],'enemy-brute':[1,0],'enemy-controller':[2,0],'enemy-guardian':[0,1],'enemy-archer':[1,1]
};
const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const numberAttr=(element:Element,name:string,fallback=0)=>{const value=Number(element.getAttribute(name));return Number.isFinite(value)?value:fallback;};
const translation=(element:Element)=>{const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(element.getAttribute('transform')||'');return match?{x:Number(match[1]),y:Number(match[2])}:{x:0,y:0};};
const camera=(svg:SVGSVGElement)=>{const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\) scale\(([-.\d]+)\)/.exec(svg.querySelector('.world')?.getAttribute('transform')||'');return match?{x:Number(match[1]),y:Number(match[2]),z:Number(match[3])}:{x:0,y:0,z:1};};

function backdrop(context:CanvasRenderingContext2D,svg:SVGSVGElement,w:number,h:number){
  if(background.complete&&background.naturalWidth)context.drawImage(background,0,0,background.naturalWidth,background.naturalHeight,0,0,w,h);
  else{context.fillStyle='#54743b';context.fillRect(0,0,w,h);}
  const scenario=svg.dataset.scenario;
  if(scenario==='ember-shrine'){context.fillStyle='rgba(50,20,78,.20)';context.fillRect(0,0,w,h);}
  if(scenario==='rescue-run'){context.fillStyle='rgba(44,37,30,.19)';context.fillRect(0,0,w,h);}
  const vignette=context.createRadialGradient(w/2,h/2,12,w/2,h/2,h*.72);vignette.addColorStop(0,'rgba(255,255,255,0)');vignette.addColorStop(1,'rgba(3,10,17,.28)');context.fillStyle=vignette;context.fillRect(0,0,w,h);
}

function grid(context:CanvasRenderingContext2D,w:number,h:number){
  context.save();context.strokeStyle='rgba(16,31,33,.28)';context.lineWidth=.46;
  for(let x=CELL;x<w;x+=CELL){context.beginPath();context.moveTo(x,0);context.lineTo(x,h);context.stroke();}
  for(let y=CELL;y<h;y+=CELL){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke();}context.restore();
}

function rangeCell(context:CanvasRenderingContext2D,x:number,y:number,fill:string,stroke:string,line=1){
  context.save();context.fillStyle=fill;context.fillRect(x+.55,y+.55,CELL-1.1,CELL-1.1);context.strokeStyle=stroke;context.lineWidth=line;context.strokeRect(x+1,y+1,CELL-2,CELL-2);context.restore();
}

function highlights(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const definitions:Record<string,[string,string,number]>={
    'move-range':['rgba(41,151,224,.34)','rgba(176,232,255,.9)',.8],
    'free-move-range':['rgba(45,201,214,.34)','rgba(202,255,245,.92)',.9],
    'power-range':['rgba(124,74,193,.27)','rgba(218,190,255,.8)',.7],
    'enemy-target':['rgba(215,49,68,.40)','rgba(255,188,176,.95)',1],
    'ally-target':['rgba(45,176,105,.40)','rgba(196,255,211,.95)',1],
    'ally-range':['rgba(45,176,105,.28)','rgba(190,255,214,.8)',.8],
    'area-preview':['rgba(232,109,38,.48)','rgba(255,225,146,.98)',1.2],
    'target-preview':['rgba(224,51,64,.54)','rgba(255,240,180,.98)',1.2],
    'enemy-move-range':['rgba(174,43,63,.19)','rgba(245,124,139,.62)',.65],
    'enemy-threat':['rgba(219,61,67,.13)','rgba(245,124,139,.38)',.45]
  };
  for(const [className,palette] of Object.entries(definitions))for(const element of svg.querySelectorAll<SVGRectElement>('.'+className)){
    rangeCell(context,numberAttr(element,'x'),numberAttr(element,'y'),palette[0],palette[1],palette[2]);
  }
}

function roundedRect(context:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  context.beginPath();context.moveTo(x+r,y);context.arcTo(x+w,y,x+w,y+h,r);context.arcTo(x+w,y+h,x,y+h,r);context.arcTo(x,y+h,x,y,r);context.arcTo(x,y,x+w,y,r);context.closePath();
}

function terrain(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  for(const element of svg.querySelectorAll<SVGGElement>('.terrain-cell')){
    const p=translation(element),kind=element.dataset.kind||'',x=p.x,y=p.y,cx=x+8,cy=y+8;
    context.save();
    if(kind==='wall'||kind==='icewall'){
      const ice=kind==='icewall';context.fillStyle=ice?'rgba(153,225,246,.88)':'rgba(54,60,65,.88)';roundedRect(context,x+1,y+1,14,14,2);context.fill();context.strokeStyle=ice?'#ecffff':'#aeb4b0';context.lineWidth=.7;context.stroke();
      context.strokeStyle=ice?'rgba(38,114,157,.7)':'rgba(20,24,26,.75)';for(let row=0;row<3;row++){context.beginPath();context.moveTo(x+2,y+4+row*4);context.lineTo(x+14,y+4+row*4);context.stroke();}context.restore();continue;
    }
    if(kind==='cover'){
      context.fillStyle='rgba(74,42,22,.82)';roundedRect(context,x+2,y+5,12,7,2);context.fill();context.strokeStyle='#d2ad6d';context.lineWidth=.8;context.stroke();context.fillStyle='#3d2417';context.fillRect(x+4,y+6,1,5);context.fillRect(x+11,y+6,1,5);
    }else if(kind==='difficult'){
      context.fillStyle='rgba(63,84,40,.32)';context.fillRect(x+.5,y+.5,15,15);context.strokeStyle='rgba(179,206,103,.75)';context.lineWidth=.7;for(let i=1;i<15;i+=4){context.beginPath();context.moveTo(x+i,y+15);context.quadraticCurveTo(x+i-2,y+9,x+i+1,y+5);context.stroke();}
    }else if(kind==='hazard'){
      context.fillStyle='rgba(194,57,27,.42)';context.fillRect(x+.5,y+.5,15,15);context.fillStyle='#ffcf52';for(const dx of[-4,0,4]){context.beginPath();context.moveTo(cx+dx,cy+5);context.quadraticCurveTo(cx+dx-3,cy,cx+dx+1,cy-5);context.quadraticCurveTo(cx+dx+4,cy,cx+dx,cy+5);context.fill();}
    }else if(kind==='high'){
      context.fillStyle='rgba(190,158,91,.24)';context.fillRect(x+.5,y+.5,15,15);context.strokeStyle='rgba(251,224,154,.8)';context.lineWidth=.7;for(const inset of[2.2,4.5])context.strokeRect(x+inset,y+inset,16-inset*2,16-inset*2);
    }else if(kind==='objective'){
      context.fillStyle='rgba(248,190,53,.22)';context.fillRect(x+.5,y+.5,15,15);context.strokeStyle='#ffe18d';context.lineWidth=1;context.beginPath();context.arc(cx,cy,5.2,0,Math.PI*2);context.stroke();context.beginPath();context.moveTo(cx,cy-4);context.lineTo(cx+3.5,cy+3);context.lineTo(cx-4,cy-1);context.closePath();context.stroke();
    }else if(kind==='exit'){
      context.fillStyle='rgba(44,183,225,.29)';context.fillRect(x+.5,y+.5,15,15);context.fillStyle='#9beaff';context.beginPath();context.moveTo(cx,cy-5);context.lineTo(cx+5,cy+1);context.lineTo(cx+2,cy+1);context.lineTo(cx+2,cy+5);context.lineTo(cx-2,cy+5);context.lineTo(cx-2,cy+1);context.lineTo(cx-5,cy+1);context.closePath();context.fill();
    }else if(kind==='captive'){
      context.fillStyle='rgba(72,57,47,.62)';context.fillRect(x+1,y+1,14,14);context.strokeStyle='#e2c58e';context.lineWidth=1;for(let bar=3;bar<15;bar+=4){context.beginPath();context.moveTo(x+bar,y+1);context.lineTo(x+bar,y+15);context.stroke();}context.beginPath();context.arc(cx,cy-2,2,0,Math.PI*2);context.stroke();context.beginPath();context.moveTo(cx,cy);context.lineTo(cx,cy+5);context.stroke();
    }else if(kind==='destructible'||kind==='door'){
      context.fillStyle=kind==='door'?'rgba(57,43,39,.90)':'rgba(84,49,24,.85)';roundedRect(context,x+1,y+1,14,14,1.5);context.fill();context.strokeStyle='#d2a965';context.lineWidth=.8;context.stroke();context.strokeStyle='#392313';for(let stripe=-8;stripe<16;stripe+=5){context.beginPath();context.moveTo(x+stripe,y+15);context.lineTo(x+stripe+15,y);context.stroke();}
    }else if(kind==='rune'){
      context.fillStyle='rgba(92,31,130,.42)';context.fillRect(x+.5,y+.5,15,15);context.strokeStyle='#e3a8ff';context.lineWidth=1;context.beginPath();context.arc(cx,cy,5.2,0,Math.PI*2);context.stroke();context.beginPath();context.moveTo(cx,cy-5);context.lineTo(cx+4,cy+3);context.lineTo(cx-4,cy+3);context.closePath();context.stroke();
    }
    context.restore();
  }
}

function zones(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  for(const element of svg.querySelectorAll<SVGRectElement>('.sanctuary-zone')){
    const x=numberAttr(element,'x'),y=numberAttr(element,'y');context.save();context.fillStyle='rgba(243,220,111,.25)';context.fillRect(x+.5,y+.5,15,15);context.strokeStyle='rgba(255,247,187,.9)';context.lineWidth=.9;context.setLineDash([2,1.5]);context.strokeRect(x+1,y+1,14,14);context.restore();
  }
}

function spriteSource(art:string){
  if(legacyCells[art])return{image:legacyUnits,cell:legacyCells[art],cols:3,rows:2};
  if(heroCells[art])return{image:heroes,cell:heroCells[art],cols:2,rows:2};
  return{image:enemies,cell:enemyCells[art]??[0,0] as [number,number],cols:3,rows:2};
}

function drawUnit(context:CanvasRenderingContext2D,element:SVGGElement){
  const art=element.dataset.art||'',source=spriteSource(art),image=source.image;if(!image.complete||!image.naturalWidth)return;
  const p=translation(element),sourceW=image.naturalWidth/source.cols,sourceH=image.naturalHeight/source.rows,enemy=element.classList.contains('enemy'),spent=element.classList.contains('spent'),downed=element.classList.contains('downed'),active=element.classList.contains('active'),elite=element.classList.contains('elite'),ghost=element.classList.contains('drag-ghost');
  context.save();context.translate(Math.round(p.x),Math.round(p.y));if(downed)context.rotate(-Math.PI/2);context.globalAlpha=ghost?.55:spent?.58:downed?.48:1;
  if(active){context.shadowColor=enemy?'rgba(255,76,92,.95)':'rgba(75,208,255,.95)';context.shadowBlur=4;}
  context.fillStyle=enemy?'rgba(72,18,27,.9)':'rgba(16,43,76,.9)';context.strokeStyle=elite?'#ffd464':enemy?'#e64d5d':'#53c7ef';context.lineWidth=elite?1.4:1;
  roundedRect(context,-7.5,-7.8,15,15,3.2);context.fill();context.stroke();context.clip();
  const [col,row]=source.cell;context.drawImage(image,col*sourceW,row*sourceH,sourceW,sourceH,-7.35,-7.65,14.7,14.7);context.restore();
  if(ghost)return;
  const hp=Math.max(0,Number(element.dataset.hp)||0),max=Math.max(1,Number(element.dataset.maxHp)||1),ratio=hp/max;
  context.save();context.translate(Math.round(p.x),Math.round(p.y));context.fillStyle='#111a29';context.fillRect(-7,6.2,14,2.8);context.fillStyle='#f4ead2';context.fillRect(-6.5,6.7,13,1.8);context.fillStyle=enemy?'#ed4b58':'#50ce70';context.fillRect(-6.5,6.7,13*ratio,1.8);
  if(element.dataset.reactionUsed==='0'){context.fillStyle='#f5dc83';context.strokeStyle='#36280d';context.lineWidth=.5;context.beginPath();context.arc(-5.7,-6,1.4,0,Math.PI*2);context.fill();context.stroke();}
  if(element.dataset.carrier==='1'){context.fillStyle='#77e9ff';context.font='bold 4px system-ui';context.textAlign='center';context.fillText('◆',5.5,-4.5);}
  context.restore();
}

function selection(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const element=svg.querySelector<SVGGElement>('.unit-token.selected');if(!element)return;const p=translation(element),enemy=element.classList.contains('enemy'),x=p.x-8,y=p.y-8;
  context.save();context.strokeStyle=enemy?'#ff6572':'#72dcff';context.lineWidth=1.7;context.shadowColor=context.strokeStyle;context.shadowBlur=2.5;
  const segments=[[x+1,y+1,x+5,y+1],[x+1,y+1,x+1,y+5],[x+15,y+1,x+11,y+1],[x+15,y+1,x+15,y+5],[x+1,y+15,x+5,y+15],[x+1,y+15,x+1,y+11],[x+15,y+15,x+11,y+15],[x+15,y+15,x+15,y+11]];
  for(const [a,b,c,d] of segments){context.beginPath();context.moveTo(a,b);context.lineTo(c,d);context.stroke();}context.restore();
}

function statusMarkers(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const colors:Record<string,string>={Dazed:'#bca7ff',Exposed:'#ff8b94',Rooted:'#8c6a42',Slowed:'#8bdfff',Burning:'#ff9a3c',Guarded:'#ffe793'};
  for(const element of svg.querySelectorAll<SVGGElement>('.unit-token')){
    const p=translation(element),statuses=[...element.querySelectorAll<SVGGElement>('.status-marker')].map(marker=>marker.dataset.status||'');
    statuses.forEach((status,index)=>{context.save();context.fillStyle=colors[status]||'#fff';context.strokeStyle='#1b1c22';context.lineWidth=.5;context.beginPath();context.arc(p.x-5+index*2.6,p.y-8.1,1.2,0,Math.PI*2);context.fill();context.stroke();context.restore();});
  }
}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){
  const rect=frame.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(width!==backingW||height!==backingH){backingW=width;backingH=height;for(const canvas of canvases){canvas.width=width;canvas.height=height;}}
  const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,baseScale=rect.width/worldW,cam=camera(svg),contexts=canvases.map(canvas=>canvas.getContext('2d')!),[ground,tokens,status]=contexts;
  for(const context of contexts){context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,rect.width,rect.height);context.save();context.translate(cam.x*baseScale,cam.y*baseScale);context.scale(baseScale*cam.z,baseScale*cam.z);}
  backdrop(ground,svg,worldW,worldH);highlights(ground,svg);zones(ground,svg);terrain(ground,svg);grid(ground,worldW,worldH);
  for(const element of svg.querySelectorAll<SVGGElement>('.unit-token'))drawUnit(tokens,element);
  selection(status,svg);statusMarkers(status,svg);
  for(const context of contexts)context.restore();
}

function loop(){const svg=latest();if(svg)draw(svg);requestAnimationFrame(loop);}
requestAnimationFrame(loop);
