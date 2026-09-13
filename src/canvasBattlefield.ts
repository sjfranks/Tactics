import { ART } from './generatedAssets';
import { BATTLEFIELD_BACKGROUND } from './background';

const CELL=80;
const canvas=document.createElement('canvas');
canvas.className='battlefield-canvas';
canvas.setAttribute('aria-hidden','true');
canvas.style.cssText='position:absolute;pointer-events:none;z-index:0;display:none;background:#000;';

const style=document.createElement('style');
style.textContent=`
#battlefield{position:relative;background:#000!important;overflow:hidden}
.battlefield-canvas{image-rendering:auto}
.game-board{position:relative;z-index:1;background:transparent!important}
.game-board.canvas-rendered .tiles>*{opacity:0!important}
.game-board.canvas-rendered .highlights>*{opacity:0!important}
.game-board.canvas-rendered .props>*{opacity:0!important}
.game-board.canvas-rendered .tokens>*{opacity:0!important}
.game-board.canvas-rendered .tokens>.drag-ghost{opacity:.42!important}
`;
document.head.appendChild(style);

const battlefield=document.querySelector<HTMLElement>('#battlefield');
if(battlefield)battlefield.prepend(canvas);

const bg=new Image();
bg.decoding='async';
bg.src=BATTLEFIELD_BACKGROUND;
const portraits:Record<string,HTMLImageElement>={};
for(const [id,src] of Object.entries({alden:ART.alden,mira:ART.mira,'raider-1':ART.goblin1,'raider-2':ART.goblin2,campfire:ART.campfire})){
  const im=new Image();im.decoding='async';im.src=src;portraits[id]=im;
}

function latestBoard(){const boards=[...document.querySelectorAll<SVGSVGElement>('.game-board')];return boards[boards.length-1];}
function num(el:Element,name:string,fallback=0){const v=Number(el.getAttribute(name));return Number.isFinite(v)?v:fallback;}
function translation(el:Element){const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:Number(m[1]),y:Number(m[2])}:{x:0,y:0};}
function worldTransform(svg:SVGSVGElement){const world=svg.querySelector<SVGGElement>('.world');const raw=world?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{tx:Number(m[1]),ty:Number(m[2]),scale:Number(m[3])}:{tx:0,ty:0,scale:1};}
function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect(x,y,w,h,rr);}
function tokenIdFromSelection(){const n=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';if(n.includes('Alden'))return'alden';if(n.includes('Mira'))return'mira';if(n.includes('Goblin Raider')||n.includes('North Raider'))return'raider-1';if(n.includes('Goblin Skirmisher')||n.includes('Hill Raider'))return'raider-2';return'';}

function drawFallbackTerrain(ctx:CanvasRenderingContext2D){
  const g=ctx.createLinearGradient(0,0,480,640);g.addColorStop(0,'#536b3d');g.addColorStop(.48,'#394f31');g.addColorStop(1,'#263522');ctx.fillStyle=g;ctx.fillRect(0,0,480,640);
  ctx.globalAlpha=.14;ctx.fillStyle='#c5b27c';for(let y=28;y<640;y+=47)for(let x=20;x<480;x+=53){ctx.beginPath();ctx.arc(x+((y/47)%2)*11,y,5+(x%3),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function drawBackground(ctx:CanvasRenderingContext2D){if(bg.complete&&bg.naturalWidth>0)ctx.drawImage(bg,0,0,480,640);else drawFallbackTerrain(ctx);}
function drawHighlights(ctx:CanvasRenderingContext2D,svg:SVGSVGElement){
  const defs:Record<string,{fill:string,stroke:string}>={
    'move-range':{fill:'rgba(50,155,218,.38)',stroke:'#72ddff'},'attack-range':{fill:'rgba(197,63,63,.34)',stroke:'#ff756d'},'enemy-range':{fill:'rgba(169,47,56,.22)',stroke:'#ff747c'},'enemy-threat':{fill:'rgba(206,112,69,.16)',stroke:'rgba(206,112,69,.34)'},'spell-range':{fill:'rgba(123,84,200,.43)',stroke:'#d7b8ff'}
  };
  for(const [cls,p] of Object.entries(defs))for(const el of svg.querySelectorAll<SVGRectElement>(`.highlights .${cls}`)){
    ctx.fillStyle=p.fill;ctx.strokeStyle=p.stroke;ctx.lineWidth=2;roundedRect(ctx,num(el,'x'),num(el,'y'),num(el,'width'),num(el,'height'),7);ctx.fill();ctx.stroke();
  }
}
function drawGrid(ctx:CanvasRenderingContext2D){ctx.strokeStyle='rgba(11,16,10,.52)';ctx.lineWidth=1.15;for(let x=0;x<=480;x+=CELL){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,640);ctx.stroke();}for(let y=0;y<=640;y+=CELL){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(480,y);ctx.stroke();}}
function drawSelection(ctx:CanvasRenderingContext2D,svg:SVGSVGElement){
  const id=tokenIdFromSelection();if(!id)return;const token=svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`);if(!token)return;const {x:cx,y:cy}=translation(token),x=cx-40,y=cy-40,p=6,l=15;ctx.strokeStyle=token.classList.contains('enemy')?'#ffd8d3':'#e7fbff';ctx.lineWidth=3;ctx.lineCap='square';const corners=[[x+p,y+p,1,1],[x+80-p,y+p,-1,1],[x+p,y+80-p,1,-1],[x+80-p,y+80-p,-1,-1]] as const;for(const[cx0,cy0,sx,sy]of corners){ctx.beginPath();ctx.moveTo(cx0+sx*l,cy0);ctx.lineTo(cx0,cy0);ctx.lineTo(cx0,cy0+sy*l);ctx.stroke();}}
function drawObstacle(ctx:CanvasRenderingContext2D,g:SVGGElement){const {x,y}=translation(g),im=portraits.campfire;if(im.complete&&im.naturalWidth){ctx.drawImage(im,x-31,y-31,62,62);return;}ctx.fillStyle='#b76428';ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.fill();}
function drawToken(ctx:CanvasRenderingContext2D,g:SVGGElement){
  if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'';if(id==='party')return;const {x,y}=translation(g),enemy=g.classList.contains('enemy'),active=g.classList.contains('active');
  ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fillStyle=enemy?'#46151b':'#112942';ctx.fill();ctx.lineWidth=active?5:3;ctx.strokeStyle=active?'#e8fbff':enemy?'#ff5550':'#8ddcff';ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.clip();const im=portraits[id];if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,-29,-29,58,58);}else{ctx.fillStyle='#101722';ctx.fillRect(-24,-24,48,48);ctx.fillStyle='#fff';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id==='alden'?'A':id==='mira'?'M':'G',0,1);}ctx.restore();
  const hp=g.querySelector<SVGRectElement>('.hp-fill');const width=hp?num(hp,'width',40):40;ctx.fillStyle='rgba(0,0,0,.7)';roundedRect(ctx,-22,25,44,7,3);ctx.fill();ctx.fillStyle='#7ee28d';roundedRect(ctx,-20,27,width,3,1.5);ctx.fill();
  const dots=[...g.querySelectorAll<SVGCircleElement>('.action-dot')];for(const d of dots){ctx.beginPath();ctx.arc(num(d,'cx'),num(d,'cy'),4,0,Math.PI*2);ctx.fillStyle=d.classList.contains('spent')?'rgba(255,255,255,.24)':'#8bdfff';ctx.fill();}
  if(g.querySelector('.shield-mark')){ctx.fillStyle='#b9dcff';ctx.font='15px system-ui';ctx.fillText('◆',24,-20);}ctx.restore();
}
function syncCanvas(svg:SVGSVGElement){
  const rect=svg.getBoundingClientRect();if(rect.width<2||rect.height<2)return false;const parentRect=battlefield?.getBoundingClientRect();if(!parentRect)return false;const dpr=Math.min(window.devicePixelRatio||1,3);const cssW=rect.width,cssH=rect.height;const w=Math.max(1,Math.round(cssW*dpr)),h=Math.max(1,Math.round(cssH*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}canvas.style.left=`${rect.left-parentRect.left}px`;canvas.style.top=`${rect.top-parentRect.top}px`;canvas.style.width=`${cssW}px`;canvas.style.height=`${cssH}px`;canvas.style.display='block';
  const ctx=canvas.getContext('2d');if(!ctx)return false;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle='#000';ctx.fillRect(0,0,cssW,cssH);
  const vb=svg.viewBox.baseVal,s=Math.min(cssW/vb.width,cssH/vb.height),ox=(cssW-vb.width*s)/2,oy=0,{tx,ty,scale}=worldTransform(svg);ctx.save();ctx.translate(ox+tx*s,oy+ty*s);ctx.scale(s*scale,s*scale);drawBackground(ctx);drawHighlights(ctx,svg);drawGrid(ctx);drawSelection(ctx,svg);for(const o of svg.querySelectorAll<SVGGElement>('.obstacle'))drawObstacle(ctx,o);for(const t of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))drawToken(ctx,t);ctx.restore();return true;
}
function frame(){const svg=latestBoard();if(svg&&svg.viewBox.baseVal.width===480&&svg.viewBox.baseVal.height===640){svg.classList.add('canvas-rendered');syncCanvas(svg);}else{canvas.style.display='none';svg?.classList.remove('canvas-rendered');}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
