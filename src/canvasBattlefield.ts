import { ART } from './generatedAssets';
import { BATTLEFIELD_BACKGROUND } from './background';

const CELL=80;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const mapArt=document.createElement('img');
mapArt.className='battlefield-map-art';
mapArt.setAttribute('aria-hidden','true');
mapArt.alt='';
mapArt.src=BATTLEFIELD_BACKGROUND;
const canvas=document.createElement('canvas');
canvas.className='battlefield-canvas';
canvas.setAttribute('aria-hidden','true');
frame.prepend(canvas);
frame.prepend(mapArt);

const style=document.createElement('style');
style.textContent=`
#battlefield-frame{position:relative;background:#000!important;overflow:hidden}
#battlefield{position:absolute!important;inset:0;z-index:3;background:transparent!important}
.battlefield-map-art{position:absolute;z-index:1;pointer-events:none;display:block;object-fit:fill;transform-origin:0 0;will-change:transform;-webkit-user-drag:none;user-select:none}
.battlefield-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;background:transparent!important}
.game-board{position:absolute!important;inset:0;z-index:3;background:transparent!important;width:100%!important;height:100%!important}
.game-board[aria-label="6 by 8 tactical battlefield"] .tiles>*,
.game-board[aria-label="6 by 8 tactical battlefield"] .highlights>*,
.game-board[aria-label="6 by 8 tactical battlefield"] .props>*,
.game-board[aria-label="6 by 8 tactical battlefield"] .tokens>*{opacity:0!important}
.game-board[aria-label="6 by 8 tactical battlefield"] .tokens>.drag-ghost{opacity:.42!important}
`;
document.head.appendChild(style);

const art:Record<string,HTMLImageElement>={};
for(const [id,src] of Object.entries({alden:ART.alden,mira:ART.mira,'raider-1':ART.goblin1,'raider-2':ART.goblin2,campfire:ART.campfire})){
  const im=new Image();im.decoding='async';im.src=src;art[id]=im;
}

const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const n=(el:Element,a:string,d=0)=>{const v=Number(el.getAttribute(a));return Number.isFinite(v)?v:d};
const tr=(el:Element)=>{const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:+m[1],y:+m[2]}:{x:0,y:0}};
const camera=(svg:SVGSVGElement)=>{const raw=svg.querySelector('.world')?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{x:+m[1],y:+m[2],z:+m[3]}:{x:0,y:0,z:1}};
function rr(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){c.beginPath();c.roundRect(x,y,w,h,r)}

function highlights(c:CanvasRenderingContext2D,svg:SVGSVGElement){
  const defs:any={'move-range':['rgba(50,155,218,.38)','#72ddff'],'attack-range':['rgba(197,63,63,.34)','#ff756d'],'enemy-range':['rgba(169,47,56,.22)','#ff747c'],'enemy-threat':['rgba(206,112,69,.16)','rgba(206,112,69,.3)'],'spell-range':['rgba(123,84,200,.43)','#d7b8ff']};
  for(const [cls,p] of Object.entries(defs) as any)for(const el of svg.querySelectorAll<SVGRectElement>(`.${cls}`)){c.fillStyle=p[0];c.strokeStyle=p[1];c.lineWidth=2;rr(c,n(el,'x'),n(el,'y'),n(el,'width'),n(el,'height'),7);c.fill();c.stroke()}
}
function grid(c:CanvasRenderingContext2D){
  c.save();c.strokeStyle='rgba(12,17,10,.62)';c.lineWidth=1.35;
  for(let x=0;x<=480;x+=CELL){c.beginPath();c.moveTo(x,0);c.lineTo(x,640);c.stroke()}
  for(let y=0;y<=640;y+=CELL){c.beginPath();c.moveTo(0,y);c.lineTo(480,y);c.stroke()}
  c.restore();
}
function selectedId(){const s=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';if(s.includes('Alden'))return'alden';if(s.includes('Mira'))return'mira';if(s.includes('Goblin Raider')||s.includes('North Raider'))return'raider-1';if(s.includes('Goblin Skirmisher')||s.includes('Hill Raider'))return'raider-2';return''}
function corners(c:CanvasRenderingContext2D,svg:SVGSVGElement){const id=selectedId(),g=id?svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`):null;if(!g)return;const p=tr(g),x=p.x-40,y=p.y-40,o=6,l=15;c.strokeStyle=g.classList.contains('enemy')?'#ffd8d3':'#e7fbff';c.lineWidth=3;for(const[a,b,sx,sy]of [[x+o,y+o,1,1],[x+80-o,y+o,-1,1],[x+o,y+80-o,1,-1],[x+80-o,y+80-o,-1,-1]] as const){c.beginPath();c.moveTo(a+sx*l,b);c.lineTo(a,b);c.lineTo(a,b+sy*l);c.stroke()}}

function drawPortrait(c:CanvasRenderingContext2D,id:string){
  const im=art[id];if(!im?.complete||!im.naturalWidth)return;
  const size=46;c.drawImage(im,-size/2,-size/2,size,size);
}
function actionDots(c:CanvasRenderingContext2D,g:SVGGElement){
  const dots=[...g.querySelectorAll<SVGCircleElement>('.action-dot')];
  for(const d of dots){c.beginPath();c.arc(n(d,'cx'),n(d,'cy'),4.5,0,Math.PI*2);c.fillStyle=d.classList.contains('spent')?'rgba(255,255,255,.2)':'#77d8ff';c.fill();c.strokeStyle=d.classList.contains('spent')?'rgba(255,255,255,.25)':'#effcff';c.lineWidth=1.25;c.stroke()}
}
function token(c:CanvasRenderingContext2D,g:SVGGElement){
  if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'';if(!art[id])return;const p=tr(g),enemy=g.classList.contains('enemy'),active=g.classList.contains('active');
  c.save();c.translate(p.x,p.y);c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.fillStyle=enemy?'#46151b':'#112942';c.fill();c.lineWidth=active?5:3;c.strokeStyle=active?'#e8fbff':enemy?'#ff5550':'#8ddcff';c.stroke();
  c.save();c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.clip();drawPortrait(c,id);c.restore();
  const hp=g.querySelector<SVGRectElement>('.hp-fill');c.fillStyle='rgba(0,0,0,.7)';rr(c,-22,25,44,7,3);c.fill();c.fillStyle='#7ee28d';rr(c,-20,27,hp?n(hp,'width',40):40,3,1.5);c.fill();actionDots(c,g);
  if(g.querySelector('.shield-mark')){c.fillStyle='#b9dcff';c.font='15px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('◆',24,-20)}c.restore();
}
function obstacle(c:CanvasRenderingContext2D,g:SVGGElement){const p=tr(g),im=art.campfire;if(im.complete&&im.naturalWidth)c.drawImage(im,p.x-31,p.y-31,62,62)}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){
  const r=frame.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
  if(w!==backingW||h!==backingH){backingW=w;backingH=h;canvas.width=w;canvas.height=h}
  const s=Math.min(r.width/480,r.height/640),ox=(r.width-480*s)/2,cam=camera(svg);
  mapArt.style.left=`${ox}px`;mapArt.style.top='0px';mapArt.style.width=`${480*s}px`;mapArt.style.height=`${640*s}px`;mapArt.style.transform=`translate(${cam.x*s}px,${cam.y*s}px) scale(${cam.z})`;
  const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);
  c.save();c.translate(ox+cam.x*s,cam.y*s);c.scale(s*cam.z,s*cam.z);highlights(c,svg);grid(c);corners(c,svg);for(const g of svg.querySelectorAll<SVGGElement>('.obstacle'))obstacle(c,g);for(const g of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))token(c,g);c.restore();
}

let lastTactical:SVGSVGElement|undefined;
function loop(){
  const svg=latest();
  if(svg&&svg.viewBox.baseVal.width===480&&svg.viewBox.baseVal.height===640){lastTactical=svg;mapArt.style.display='block';canvas.style.display='block';draw(svg)}
  else if(!svg&&lastTactical){mapArt.style.display='block';canvas.style.display='block'}
  else if(svg){lastTactical=undefined;mapArt.style.display='none';canvas.style.display='none'}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
