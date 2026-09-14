import {TACTICAL_TILES} from './tacticalMap';

const CELL=16,ATLAS_COLS=4,TILE_SOURCE=96,UNIT_SOURCE=100;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const canvas=document.createElement('canvas');canvas.className='battlefield-canvas';canvas.setAttribute('aria-hidden','true');frame.prepend(canvas);

const style=document.createElement('style');
style.textContent=`
#battlefield-frame{position:relative;background:#476b3d!important;overflow:hidden}
#battlefield{position:absolute!important;inset:0;z-index:3;background:transparent!important}
.battlefield-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;background:#476b3d}
.game-board{position:absolute!important;inset:0;z-index:3;background:transparent!important;width:100%!important;height:100%!important}
.game-board[aria-label$="tactical battlefield"] .tiles>*,.game-board[aria-label$="tactical battlefield"] .highlights>*,.game-board[aria-label$="tactical battlefield"] .props>*,.game-board[aria-label$="tactical battlefield"] .tokens>*{opacity:0!important}
.game-board[aria-label$="tactical battlefield"] .tokens>.drag-ghost{opacity:.58!important}
.rail-sprite,#portrait{background-image:url('${import.meta.env.BASE_URL}assets/portrait-sheet.webp')!important;background-size:500% 300%!important;background-repeat:no-repeat!important;background-color:#14243b!important}
[data-id="alden"]>.rail-sprite,#portrait[data-id="alden"]{background-position:0 0!important}
[data-id="mira"]>.rail-sprite,#portrait[data-id="mira"]{background-position:25% 0!important}
[data-id^="raider"]>.rail-sprite,#portrait[data-id^="raider"]{background-position:25% 100%!important}
`;document.head.appendChild(style);

const terrain=new Image();terrain.decoding='async';terrain.src=`${import.meta.env.BASE_URL}assets/emblem/terrain.svg`;
const units=new Image();units.decoding='async';units.src=`${import.meta.env.BASE_URL}assets/emblem/units.svg`;
const unitCells:Record<string,number>={alden:0,mira:1,'raider-1':2,'raider-2':3,'raider-3':4,'raider-4':5};

const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const n=(el:Element,a:string,d=0)=>{const v=Number(el.getAttribute(a));return Number.isFinite(v)?v:d};
const tr=(el:Element)=>{const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:+m[1],y:+m[2]}:{x:0,y:0}};
const camera=(svg:SVGSVGElement)=>{const raw=svg.querySelector('.world')?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{x:+m[1],y:+m[2],z:+m[3]}:{x:0,y:0,z:1}};

function tile(c:CanvasRenderingContext2D,index:number,x:number,y:number){if(!terrain.complete)return;const sx=index%ATLAS_COLS*TILE_SOURCE,sy=Math.floor(index/ATLAS_COLS)*TILE_SOURCE;c.drawImage(terrain,sx,sy,TILE_SOURCE,TILE_SOURCE,x,y,CELL,CELL)}
function map(c:CanvasRenderingContext2D){for(let y=0;y<TACTICAL_TILES.length;y++)for(let x=0;x<TACTICAL_TILES[y].length;x++)tile(c,TACTICAL_TILES[y][x],x*CELL,y*CELL)}
function rangeCell(c:CanvasRenderingContext2D,x:number,y:number,fill:string,stroke:string){c.save();c.fillStyle=fill;c.fillRect(x+.5,y+.5,CELL-1,CELL-1);c.strokeStyle=stroke;c.lineWidth=.8;c.strokeRect(x+1,y+1,CELL-2,CELL-2);c.restore()}
function highlights(c:CanvasRenderingContext2D,svg:SVGSVGElement){const defs:Record<string,[string,string]>={
 'move-range':['rgba(46,151,229,.34)','rgba(181,231,255,.92)'],'weapon-range':['rgba(214,61,75,.30)','rgba(255,181,170,.92)'],
 'attack-range':['rgba(214,45,60,.44)','rgba(255,224,190,.96)'],'enemy-range':['rgba(190,45,61,.26)','rgba(246,125,133,.84)'],
 'enemy-threat':['rgba(196,55,67,.18)','rgba(224,95,105,.55)'],'spell-range':['rgba(150,83,210,.28)','rgba(224,193,255,.9)'],
 'heal-target':['rgba(55,176,105,.38)','rgba(195,255,210,.95)']};
 for(const [cls,p] of Object.entries(defs))for(const el of svg.querySelectorAll<SVGRectElement>(`.${cls}`)){const x=Math.round((n(el,'x')-3)/CELL)*CELL,y=Math.round((n(el,'y')-3)/CELL)*CELL;rangeCell(c,x,y,p[0],p[1])}
}
function grid(c:CanvasRenderingContext2D,w:number,h:number){c.save();c.strokeStyle='rgba(39,57,42,.23)';c.lineWidth=.35;for(let x=0;x<=w;x+=CELL){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=CELL){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore()}
function selectedId(){return document.querySelector<HTMLElement>('#portrait')?.dataset.id??''}
function selection(c:CanvasRenderingContext2D,svg:SVGSVGElement){const id=selectedId(),g=id?svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`):null;if(!g)return;const p=tr(g),enemy=g.classList.contains('enemy');c.save();c.strokeStyle=enemy?'#ed5360':'#64d7ff';c.lineWidth=1.3;c.beginPath();c.arc(p.x,p.y-1,11,0,Math.PI*2);c.stroke();c.restore()}
function actionDots(c:CanvasRenderingContext2D,g:SVGGElement){for(const d of g.querySelectorAll<SVGCircleElement>('.action-dot')){c.fillStyle=d.classList.contains('spent')?'#435166':'#ffe994';c.beginPath();c.arc(n(d,'cx'),10,1.25,0,Math.PI*2);c.fill()}}
function token(c:CanvasRenderingContext2D,g:SVGGElement){if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'',cell=unitCells[id];if(cell===undefined||!units.complete)return;const p=tr(g),enemy=g.classList.contains('enemy'),active=g.classList.contains('active');c.save();c.translate(Math.round(p.x),Math.round(p.y));c.fillStyle='rgba(17,27,32,.30)';c.beginPath();c.ellipse(0,7,10,4,0,0,Math.PI*2);c.fill();if(active){c.fillStyle=enemy?'rgba(240,70,80,.62)':'rgba(67,190,255,.68)';c.beginPath();c.ellipse(0,6,12,5,0,0,Math.PI*2);c.fill()}c.drawImage(units,cell*UNIT_SOURCE,0,UNIT_SOURCE,UNIT_SOURCE,-15,-21,30,30);const hp=g.querySelector<SVGRectElement>('.hp-fill'),ratio=hp?Math.min(1,n(hp,'width',12)/12):1;c.fillStyle='#172239';c.fillRect(-9,8,18,4);c.fillStyle='#f2e6c5';c.fillRect(-8,9,16,2);c.fillStyle=enemy?'#e94b58':'#58c96a';c.fillRect(-8,9,Math.round(16*ratio),2);actionDots(c,g);if(g.querySelector('.shield-mark')){c.fillStyle='#5aa7df';c.beginPath();c.arc(9,-12,4,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.fillRect(8,-14,2,4)}c.restore()}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){const r=frame.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(w!==backingW||h!==backingH){backingW=w;backingH=h;canvas.width=w;canvas.height=h}const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,s=Math.min(r.width/worldW,r.height/worldH),ox=(r.width-worldW*s)/2,cam=camera(svg),c=canvas.getContext('2d')!;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.save();c.translate(ox+cam.x*s,cam.y*s);c.scale(s*cam.z,s*cam.z);map(c);highlights(c,svg);grid(c,worldW,worldH);selection(c,svg);for(const g of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))token(c,g);c.restore()}
function loop(){const svg=latest();if(svg?.getAttribute('aria-label')?.endsWith('tactical battlefield')){canvas.style.display='block';draw(svg)}else canvas.style.display='none';requestAnimationFrame(loop)}
requestAnimationFrame(loop);
