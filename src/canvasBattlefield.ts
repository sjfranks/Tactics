const CELL=80;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const mapArt=document.createElement('img');
mapArt.className='battlefield-map-art';
mapArt.setAttribute('aria-hidden','true');mapArt.alt='';mapArt.decoding='async';
mapArt.src=`${import.meta.env.BASE_URL}assets/battlefield.webp`;
const canvas=document.createElement('canvas');canvas.className='battlefield-canvas';canvas.setAttribute('aria-hidden','true');
frame.prepend(canvas);frame.prepend(mapArt);

const style=document.createElement('style');
style.textContent=`
#battlefield-frame{position:relative;background:#000!important;overflow:hidden}
#battlefield{position:absolute!important;inset:0;z-index:3;background:transparent!important}
.battlefield-map-art{position:absolute;z-index:1;pointer-events:none;display:block;object-fit:cover;object-position:center top;transform-origin:0 0;will-change:transform;image-rendering:auto}
.battlefield-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;background:transparent!important}
.game-board{position:absolute!important;inset:0;z-index:3;background:transparent!important;width:100%!important;height:100%!important}
.game-board[aria-label$="tactical battlefield"] .tiles>*,.game-board[aria-label$="tactical battlefield"] .highlights>*,.game-board[aria-label$="tactical battlefield"] .props>*,.game-board[aria-label$="tactical battlefield"] .tokens>*{opacity:0!important}
.game-board[aria-label$="tactical battlefield"] .tokens>.drag-ghost{opacity:.42!important}`;
document.head.appendChild(style);

const portraits=new Image();portraits.decoding='async';portraits.src=`${import.meta.env.BASE_URL}assets/portrait-sheet.webp`;
const portraitRects:Record<string,{x:number;y:number;width:number;height:number}>={
 alden:{x:4,y:4,width:299,height:332},mira:{x:311,y:4,width:299,height:332},
 'raider-1':{x:311,y:660,width:299,height:308},'raider-2':{x:311,y:660,width:299,height:308},
 'raider-3':{x:311,y:660,width:299,height:308},'raider-4':{x:311,y:660,width:299,height:308}
};
const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const n=(el:Element,a:string,d=0)=>{const v=Number(el.getAttribute(a));return Number.isFinite(v)?v:d};
const tr=(el:Element)=>{const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:+m[1],y:+m[2]}:{x:0,y:0}};
const camera=(svg:SVGSVGElement)=>{const raw=svg.querySelector('.world')?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{x:+m[1],y:+m[2],z:+m[3]}:{x:0,y:0,z:1}};
function rr(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){c.beginPath();c.roundRect(x,y,w,h,r)}
function rangeCell(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,fill:string,stroke:string,mode:'corners'|'dashed'|'fill'='corners'){
 c.save();c.fillStyle=fill;rr(c,x,y,w,h,7);c.fill();c.strokeStyle=stroke;c.lineWidth=1.8;
 if(mode==='dashed'){c.setLineDash([7,7]);c.stroke()}
 else if(mode==='corners'){const o=4,l=11;for(const[a,b,sx,sy]of [[x+o,y+o,1,1],[x+w-o,y+o,-1,1],[x+o,y+h-o,1,-1],[x+w-o,y+h-o,-1,-1]] as const){c.beginPath();c.moveTo(a+sx*l,b);c.lineTo(a,b);c.lineTo(a,b+sy*l);c.stroke()}}
 c.restore();
}

function playerThreat(c:CanvasRenderingContext2D,svg:SVGSVGElement){
 const move=new Set<string>(),cells=new Set<string>();
 for(const el of svg.querySelectorAll<SVGRectElement>('.move-range')){
  const x=Math.round((n(el,'x')-3)/CELL),y=Math.round((n(el,'y')-3)/CELL);
  move.add(`${x},${y}`);
  const cols=svg.viewBox.baseVal.width/CELL,rows=svg.viewBox.baseVal.height/CELL;
  for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<cols&&ny>=0&&ny<rows)cells.add(`${nx},${ny}`)}
 }
 for(const k of cells)if(!move.has(k)){const[x,y]=k.split(',').map(Number);rangeCell(c,x*CELL+4,y*CELL+4,CELL-8,CELL-8,'rgba(72,8,16,.28)','rgba(224,67,76,.58)')}
}
function highlights(c:CanvasRenderingContext2D,svg:SVGSVGElement){
 playerThreat(c,svg);
 const defs:Record<string,[string,string,'corners'|'dashed'|'fill']>={
  'move-range':['rgba(35,132,184,.11)','rgba(108,211,255,.64)','corners'],
  'weapon-range':['rgba(92,43,12,.12)','rgba(244,170,87,.56)','corners'],
  'attack-range':['rgba(69,6,14,.38)','rgba(239,72,80,.76)','corners'],
  'enemy-range':['rgba(68,7,16,.28)','rgba(226,72,82,.62)','corners'],
  'enemy-threat':['rgba(91,35,17,.13)','rgba(211,111,67,.24)','fill'],
  'spell-range':['rgba(88,52,145,.14)','rgba(199,163,244,.62)','dashed'],
  'heal-target':['rgba(25,105,53,.28)','rgba(123,235,151,.76)','corners']
 };
 for(const [cls,p] of Object.entries(defs))for(const el of svg.querySelectorAll<SVGRectElement>(`.${cls}`))rangeCell(c,n(el,'x'),n(el,'y'),n(el,'width'),n(el,'height'),p[0],p[1],p[2]);
}
function grid(c:CanvasRenderingContext2D,w:number,h:number){c.save();c.strokeStyle='rgba(12,17,10,.52)';c.lineWidth=1.25;for(let x=0;x<=w;x+=CELL){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=CELL){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore()}
function selectedId(){const s=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';if(s.includes('Alden'))return'alden';if(s.includes('Mira'))return'mira';if(s.includes('Goblin Raider'))return'raider-1';if(s.includes('Goblin Skirmisher'))return'raider-2';if(s.includes('Goblin Archer'))return'raider-3';if(s.includes('Goblin Brute'))return'raider-4';return''}
function corners(c:CanvasRenderingContext2D,svg:SVGSVGElement){const id=selectedId(),g=id?svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`):null;if(!g)return;const p=tr(g),x=p.x-40,y=p.y-40,o=6,l=15;c.strokeStyle=g.classList.contains('enemy')?'#ffd8d3':'#e7fbff';c.lineWidth=3;for(const[a,b,sx,sy]of [[x+o,y+o,1,1],[x+80-o,y+o,-1,1],[x+o,y+80-o,1,-1],[x+80-o,y+80-o,-1,-1]] as const){c.beginPath();c.moveTo(a+sx*l,b);c.lineTo(a,b);c.lineTo(a,b+sy*l);c.stroke()}}

function drawPortrait(c:CanvasRenderingContext2D,id:string){
 const rect=portraitRects[id];if(!rect||!portraits.complete||!portraits.naturalWidth)return;
 const side=Math.min(rect.width,rect.height)-12,sx=rect.x+(rect.width-side)/2,sy=rect.y+(rect.height-side)/2;
 c.drawImage(portraits,sx,sy,side,side,-23,-23,46,46);
}
function actionDots(c:CanvasRenderingContext2D,g:SVGGElement){for(const d of g.querySelectorAll<SVGCircleElement>('.action-dot')){c.beginPath();c.arc(n(d,'cx'),n(d,'cy'),4.5,0,Math.PI*2);c.fillStyle=d.classList.contains('spent')?'rgba(255,255,255,.2)':'#77d8ff';c.fill();c.strokeStyle=d.classList.contains('spent')?'rgba(255,255,255,.25)':'#effcff';c.lineWidth=1.25;c.stroke()}}
function token(c:CanvasRenderingContext2D,g:SVGGElement){
 if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'';if(!portraitRects[id])return;const p=tr(g),enemy=g.classList.contains('enemy'),active=g.classList.contains('active');
 c.save();c.translate(p.x,p.y);c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.fillStyle=enemy?'#46151b':'#112942';c.fill();c.lineWidth=active?5:3;c.strokeStyle=active?'#e8fbff':enemy?'#ff5550':'#8ddcff';c.stroke();c.save();c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.clip();drawPortrait(c,id);c.restore();
 const hp=g.querySelector<SVGRectElement>('.hp-fill');c.fillStyle='rgba(0,0,0,.7)';rr(c,-22,25,44,7,3);c.fill();c.fillStyle='#7ee28d';rr(c,-20,27,hp?n(hp,'width',40):40,3,1.5);c.fill();actionDots(c,g);if(g.querySelector('.shield-mark')){c.fillStyle='#b9dcff';c.font='15px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('◆',24,-20)}c.restore();
}
let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){const r=frame.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(w!==backingW||h!==backingH){backingW=w;backingH=h;canvas.width=w;canvas.height=h}const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,s=Math.min(r.width/worldW,r.height/worldH),ox=(r.width-worldW*s)/2,cam=camera(svg);mapArt.style.left=`${ox}px`;mapArt.style.top='0px';mapArt.style.width=`${worldW*s}px`;mapArt.style.height=`${worldH*s}px`;mapArt.style.transform=`translate(${cam.x*s}px,${cam.y*s}px) scale(${cam.z})`;const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.save();c.translate(ox+cam.x*s,cam.y*s);c.scale(s*cam.z,s*cam.z);highlights(c,svg);grid(c,worldW,worldH);corners(c,svg);for(const g of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))token(c,g);c.restore()}
let lastTactical:SVGSVGElement|undefined;
function loop(){const svg=latest();if(svg?.getAttribute('aria-label')?.endsWith('tactical battlefield')){lastTactical=svg;mapArt.style.display='block';canvas.style.display='block';draw(svg)}else if(!svg&&lastTactical){mapArt.style.display='block';canvas.style.display='block'}else if(svg){lastTactical=undefined;mapArt.style.display='none';canvas.style.display='none'}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
