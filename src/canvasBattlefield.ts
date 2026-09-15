const CELL=16;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const canvases=['battlefield-canvas','battlefield-token-canvas','battlefield-status-canvas','battlefield-cue-canvas'].map(className=>{const canvas=document.createElement('canvas');canvas.className=className;canvas.setAttribute('aria-hidden','true');frame.appendChild(canvas);return canvas;});
const [groundCanvas,tokenCanvas,statusCanvas,cueCanvas]=canvases;
const asset=(path:string)=>import.meta.env.BASE_URL+'assets/'+path;
const load=(path:string)=>{const image=new Image();image.decoding='async';image.src=asset(path);return image;};
const backgrounds:Record<string,HTMLImageElement>={
  '6x8':load('encounters/meadow-6x8.webp'),
  '8x10':load('encounters/meadow-6x8.webp'),
  '12x16':load('encounters/desert-12x16.webp'),
  '20x20':load('encounters/snow-20x20.webp'),
  '30x30':load('encounters/highland-30x30.webp')
};
const existingUnits=load('emblem/units.png');
const newHeroes=load('encounters/heroes-atlas.webp');
const obstacles=load('encounters/obstacles-atlas.webp');
const existingCells:Record<string,[number,number]>={
  alden:[0,0],mira:[1,0],'raider-1':[2,0],'raider-2':[0,1],'raider-3':[1,1],'raider-4':[2,1]
};
const heroCells:Record<string,[number,number]>={lyra:[0,0],nox:[1,0],seraphine:[0,1],garrick:[1,1]};
const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const numberAttr=(element:Element,name:string,fallback=0)=>{const value=Number(element.getAttribute(name));return Number.isFinite(value)?value:fallback;};
const translation=(element:Element)=>{const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(element.getAttribute('transform')||'');return match?{x:Number(match[1]),y:Number(match[2])}:{x:0,y:0};};
const camera=(svg:SVGSVGElement)=>{const match=/translate\(([-.\d]+)[ ,]([-.\d]+)\) scale\(([-.\d]+)\)/.exec(svg.querySelector('.world')?.getAttribute('transform')||'');return match?{x:Number(match[1]),y:Number(match[2]),z:Number(match[3])}:{x:0,y:0,z:1};};

function backdrop(context:CanvasRenderingContext2D,svg:SVGSVGElement,w:number,h:number){
  const image=backgrounds[svg.dataset.map||'6x8'];
  if(image?.complete&&image.naturalWidth)context.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,0,0,w,h);
  else{context.fillStyle='#668b49';context.fillRect(0,0,w,h);}
}
function rangeCell(context:CanvasRenderingContext2D,x:number,y:number,fill:string,stroke:string){
  context.save();context.fillStyle=fill;context.fillRect(x+.5,y+.5,CELL-1,CELL-1);context.strokeStyle=stroke;context.lineWidth=.8;context.strokeRect(x+1,y+1,CELL-2,CELL-2);context.restore();
}
function highlights(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const definitions:Record<string,[string,string]>={
    'move-range':['rgba(46,151,229,.34)','rgba(181,231,255,.9)'],
    'weapon-range':['rgba(214,61,75,.30)','rgba(255,181,170,.88)'],
    'attack-range':['rgba(214,45,60,.44)','rgba(255,224,190,.94)'],
    'enemy-range':['rgba(190,45,61,.26)','rgba(246,125,133,.8)'],
    'spell-range':['rgba(126,78,198,.29)','rgba(220,187,255,.88)'],
    'heal-target':['rgba(55,176,105,.4)','rgba(195,255,210,.92)'],
    'magic-target':['rgba(132,82,205,.42)','rgba(229,201,255,.92)'],
    'magic-selected':['rgba(190,123,246,.62)','rgba(255,239,177,.96)']
  };
  for(const [className,palette] of Object.entries(definitions))for(const element of svg.querySelectorAll<SVGRectElement>('.'+className)){const x=Math.round((numberAttr(element,'x')-2)/CELL)*CELL,y=Math.round((numberAttr(element,'y')-2)/CELL)*CELL;rangeCell(context,x,y,palette[0],palette[1]);}
}
function blockedTerrain(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const moveCells=[...svg.querySelectorAll<SVGRectElement>('.move-range')].map(element=>({x:Math.round((numberAttr(element,'x')-2)/CELL),y:Math.round((numberAttr(element,'y')-2)/CELL)}));
  for(const element of svg.querySelectorAll<SVGRectElement>('.blocked-range')){
    const cellX=Math.round((numberAttr(element,'x')-2)/CELL),cellY=Math.round((numberAttr(element,'y')-2)/CELL),distance=moveCells.length?Math.min(...moveCells.map(p=>Math.abs(p.x-cellX)+Math.abs(p.y-cellY))):Infinity,fillAlpha=distance<=1?.19:distance===2?.11:0,hatchAlpha=distance<=1?.38:distance===2?.24:0;
    if(!fillAlpha)continue;const x=cellX*CELL,y=cellY*CELL;context.save();context.fillStyle='rgba(91,99,109,'+fillAlpha+')';context.fillRect(x+.5,y+.5,CELL-1,CELL-1);context.beginPath();context.rect(x+.5,y+.5,CELL-1,CELL-1);context.clip();context.strokeStyle='rgba(226,231,236,'+hatchAlpha+')';context.lineWidth=1.15;
    for(let offset=-CELL;offset<CELL*2;offset+=5){context.beginPath();context.moveTo(x+offset,y+CELL);context.lineTo(x+offset+CELL,y);context.stroke();}context.restore();
  }
}
function grid(context:CanvasRenderingContext2D,w:number,h:number){
  context.save();context.strokeStyle='rgba(20,38,39,.22)';context.lineWidth=.42;
  for(let x=CELL;x<w;x+=CELL){context.beginPath();context.moveTo(x,0);context.lineTo(x,h);context.stroke();}
  for(let y=CELL;y<h;y+=CELL){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke();}context.restore();
}
function props(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  if(!obstacles.complete||!obstacles.naturalWidth)return;const sourceW=obstacles.naturalWidth/4,sourceH=obstacles.naturalHeight/2;
  for(const element of svg.querySelectorAll<SVGGElement>('.obstacle')){const p=translation(element),kind=Number(element.dataset.kind)||0,col=kind%4,row=Math.floor(kind/4);context.drawImage(obstacles,col*sourceW,row*sourceH,sourceW,sourceH,p.x-7.7,p.y-7.7,15.4,15.4);}
}
function drawUnit(context:CanvasRenderingContext2D,element:SVGGElement){
  const art=element.dataset.art||'',existing=existingCells[art],modern=heroCells[art],image=existing?existingUnits:newHeroes,cell=existing||modern;if(!cell||!image.complete||!image.naturalWidth)return;
  const p=translation(element),cols=existing?3:2,rows=2,sourceW=image.naturalWidth/cols,sourceH=image.naturalHeight/rows,ghost=element.classList.contains('drag-ghost'),stealthed=element.classList.contains('stealthed');
  context.save();context.translate(Math.round(p.x),Math.round(p.y));if(ghost)context.globalAlpha=.58;else if(stealthed)context.globalAlpha=.42;
  if(ghost){context.shadowColor='rgba(92,223,255,.9)';context.shadowBlur=2.5;}
  context.drawImage(image,cell[0]*sourceW,cell[1]*sourceH,sourceW,sourceH,-7.5,-8,15,15);
  if(!ghost){const hp=element.querySelector<SVGRectElement>('.hp-fill'),ratio=hp?Math.min(1,numberAttr(hp,'width',13)/13):1;context.globalAlpha=1;context.fillStyle='#132039';context.fillRect(-7,6,14,3);context.fillStyle='#f3e8c8';context.fillRect(-6.5,6.5,13,2);context.fillStyle=element.classList.contains('enemy')?'#ea4b58':'#56ca6a';context.fillRect(-6.5,6.5,Math.round(13*ratio),2);}context.restore();
}
function selection(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  const id=document.querySelector<HTMLElement>('#portrait')?.dataset.id||'',element=id?svg.querySelector<SVGGElement>('.unit-token[data-id="'+id+'"]'):null;if(!element)return;
  const p=translation(element),enemy=element.classList.contains('enemy'),x=Math.round(p.x)-8,y=Math.round(p.y)-8,k=4,edges=[[x+1,y+1,x+1+k,y+1],[x+1,y+1,x+1,y+1+k],[x+15,y+1,x+15-k,y+1],[x+15,y+1,x+15,y+1+k],[x+1,y+15,x+1+k,y+15],[x+1,y+15,x+1,y+15-k],[x+15,y+15,x+15-k,y+15],[x+15,y+15,x+15,y+15-k]];
  context.save();context.strokeStyle=enemy?'#e53e51':'#238bd0';context.lineWidth=2.4;context.shadowColor=enemy?'rgba(239,63,82,.7)':'rgba(44,166,234,.78)';context.shadowBlur=2;for(const edge of edges){context.beginPath();context.moveTo(edge[0],edge[1]);context.lineTo(edge[2],edge[3]);context.stroke();}context.restore();
}
function shield(context:CanvasRenderingContext2D,x:number,y:number){
  context.save();context.translate(x,y);context.fillStyle='#fff';context.strokeStyle='#111';context.lineWidth=.9;context.beginPath();context.moveTo(0,-3);context.lineTo(3,-2);context.lineTo(2.5,1);context.quadraticCurveTo(1.5,3,0,4);context.quadraticCurveTo(-1.5,3,-2.5,1);context.lineTo(-3,-2);context.closePath();context.fill();context.stroke();context.restore();
}
function hood(context:CanvasRenderingContext2D,x:number,y:number){
  context.save();context.translate(x,y);context.fillStyle='#fff';context.strokeStyle='#111';context.lineWidth=.8;context.beginPath();context.moveTo(0,-3.5);context.quadraticCurveTo(3,-2.2,3,1.3);context.quadraticCurveTo(1.6,3.2,0,3.4);context.quadraticCurveTo(-1.6,3.2,-3,1.3);context.quadraticCurveTo(-3,-2.2,0,-3.5);context.fill();context.stroke();context.fillStyle='#111';context.beginPath();context.ellipse(0,.5,1.6,1.2,0,0,Math.PI*2);context.fill();context.restore();
}
function statuses(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  for(const element of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]')){const p=translation(element);if(element.querySelector('.shield-mark'))shield(context,Math.round(p.x)+5,Math.round(p.y)-6);if(element.querySelector('.hide-mark'))hood(context,Math.round(p.x)+5,Math.round(p.y)-6);}
}
function sword(context:CanvasRenderingContext2D,angle:number){context.save();context.rotate(angle*Math.PI/180);context.beginPath();context.moveTo(0,-4.6);context.lineTo(1,-3.45);context.lineTo(.65,1.15);context.lineTo(-.65,1.15);context.lineTo(-1,-3.45);context.closePath();context.fill();context.fillRect(-1.8,1,3.6,.8);context.fillRect(-.55,1.65,1.1,2.25);context.beginPath();context.arc(0,4,.65,0,Math.PI*2);context.fill();context.restore();}
function attackCues(context:CanvasRenderingContext2D,svg:SVGSVGElement){
  for(const element of svg.querySelectorAll<SVGGElement>('.attack-action-cue')){const p=translation(element),ranged=element.classList.contains('ranged');context.save();context.translate(p.x,p.y);context.shadowColor='rgba(21,8,11,.42)';context.shadowBlur=1;context.shadowOffsetY=1;context.fillStyle='#f3a1aa';context.strokeStyle='#7f1d2d';context.lineWidth=1.15;context.beginPath();context.arc(0,0,4.7,0,Math.PI*2);context.fill();context.stroke();context.shadowColor='transparent';context.fillStyle='#bd2940';context.scale(.74,.74);if(ranged){context.rotate(42*Math.PI/180);context.beginPath();context.moveTo(-.62,4.1);context.lineTo(.62,4.1);context.lineTo(.62,-1.15);context.lineTo(2.35,-1.15);context.lineTo(0,-4.25);context.lineTo(-2.35,-1.15);context.lineTo(-.62,-1.15);context.closePath();context.fill();}else{sword(context,-43);sword(context,43);}context.restore();}
}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){
  const rect=frame.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(width!==backingW||height!==backingH){backingW=width;backingH=height;for(const canvas of canvases){canvas.width=width;canvas.height=height;}}
  const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,baseScale=rect.width/worldW,cam=camera(svg),contexts=canvases.map(canvas=>canvas.getContext('2d')!),[ground,tokens,statusLayer,cues]=contexts;
  for(const context of contexts){context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,rect.width,rect.height);context.save();context.translate(cam.x*baseScale,cam.y*baseScale);context.scale(baseScale*cam.z,baseScale*cam.z);}
  backdrop(ground,svg,worldW,worldH);highlights(ground,svg);grid(ground,worldW,worldH);props(ground,svg);blockedTerrain(ground,svg);
  for(const element of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))drawUnit(tokens,element);
  selection(statusLayer,svg);statuses(statusLayer,svg);attackCues(cues,svg);
  for(const context of contexts)context.restore();
}
function loop(){const svg=latest();if(svg)draw(svg);requestAnimationFrame(loop);}
requestAnimationFrame(loop);
