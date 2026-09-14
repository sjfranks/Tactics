import {TACTICAL_TILES} from './tacticalMap';

const CELL=16,ATLAS_COLS=4;
const frame=document.querySelector<HTMLElement>('#battlefield-frame')!;
const canvas=document.createElement('canvas');canvas.className='battlefield-canvas';canvas.setAttribute('aria-hidden','true');
frame.prepend(canvas);

const style=document.createElement('style');
style.textContent=`
@font-face{font-family:'IBM CGA';src:url('${import.meta.env.BASE_URL}assets/fonts/Web437_IBM_CGA.woff') format('woff');font-style:normal;font-weight:400;font-display:swap}
#battlefield-frame{position:relative;background:#000!important;overflow:hidden}
#battlefield{position:absolute!important;inset:0;z-index:3;background:transparent!important}
.battlefield-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;background:#000;image-rendering:pixelated}
.game-board{position:absolute!important;inset:0;z-index:3;background:transparent!important;width:100%!important;height:100%!important;image-rendering:pixelated}
.game-board[aria-label$="tactical battlefield"] .tiles>*,.game-board[aria-label$="tactical battlefield"] .highlights>*,.game-board[aria-label$="tactical battlefield"] .props>*,.game-board[aria-label$="tactical battlefield"] .tokens>*{opacity:0!important}
.game-board[aria-label$="tactical battlefield"] .tokens>.drag-ghost{opacity:.45!important}
.rail-sprite,#portrait{background-image:url('${import.meta.env.BASE_URL}assets/c64/unit-atlas-v2.png')!important;background-size:300% 200%!important;background-repeat:no-repeat!important;image-rendering:pixelated}
[data-id="alden"]>.rail-sprite,#portrait[data-id="alden"]{background-position:0 0!important}
[data-id="mira"]>.rail-sprite,#portrait[data-id="mira"]{background-position:50% 0!important}
[data-id="raider-1"]>.rail-sprite,#portrait[data-id="raider-1"]{background-position:100% 0!important}
[data-id="raider-2"]>.rail-sprite,#portrait[data-id="raider-2"]{background-position:0 100%!important}
[data-id="raider-3"]>.rail-sprite,#portrait[data-id="raider-3"]{background-position:50% 100%!important}
[data-id="raider-4"]>.rail-sprite,#portrait[data-id="raider-4"]{background-position:100% 100%!important}`;
document.head.appendChild(style);

const terrain=new Image();terrain.decoding='async';terrain.src=`${import.meta.env.BASE_URL}assets/c64/terrain-atlas-v2.png`;
const units=new Image();units.decoding='async';units.src=`${import.meta.env.BASE_URL}assets/c64/unit-atlas-v2.png`;
const unitCells:Record<string,[number,number]>={alden:[0,0],mira:[1,0],'raider-1':[2,0],'raider-2':[0,1],'raider-3':[1,1],'raider-4':[2,1]};

const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const n=(el:Element,a:string,d=0)=>{const v=Number(el.getAttribute(a));return Number.isFinite(v)?v:d};
const tr=(el:Element)=>{const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:+m[1],y:+m[2]}:{x:0,y:0}};
const camera=(svg:SVGSVGElement)=>{const raw=svg.querySelector('.world')?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{x:+m[1],y:+m[2],z:+m[3]}:{x:0,y:0,z:1}};

function tile(c:CanvasRenderingContext2D,index:number,x:number,y:number){if(!terrain.complete)return;const sx=index%ATLAS_COLS*16,sy=Math.floor(index/ATLAS_COLS)*16;c.drawImage(terrain,sx,sy,16,16,x,y,16,16)}
function map(c:CanvasRenderingContext2D){for(let y=0;y<TACTICAL_TILES.length;y++)for(let x=0;x<TACTICAL_TILES[y].length;x++)tile(c,TACTICAL_TILES[y][x],x*CELL,y*CELL)}
function rangeCell(c:CanvasRenderingContext2D,x:number,y:number,fill:string,stroke:string,pattern=false){c.save();c.fillStyle=fill;c.fillRect(x,y,CELL,CELL);c.strokeStyle=stroke;c.lineWidth=1;c.strokeRect(x+.5,y+.5,CELL-1,CELL-1);if(pattern){c.fillStyle=stroke;for(let py=3;py<CELL-2;py+=6)for(let px=((py/3)%2?3:6);px<CELL-2;px+=6)c.fillRect(x+px,y+py,1,1)}c.restore()}
function highlights(c:CanvasRenderingContext2D,svg:SVGSVGElement){const defs:Record<string,[string,string,boolean]>={
  'move-range':['rgba(32,88,118,.18)','#54b6d2',true],'weapon-range':['rgba(105,83,0,.16)','#f2dc62',true],
  'attack-range':['rgba(142,36,36,.22)','#df5656',true],'enemy-range':['rgba(142,36,36,.16)','#bd4848',true],
  'enemy-threat':['rgba(142,80,41,.13)','#a26435',false],'spell-range':['rgba(102,57,132,.18)','#bc7bd6',true],
  'heal-target':['rgba(55,135,55,.20)','#78d978',true]};
 for(const [cls,p] of Object.entries(defs))for(const el of svg.querySelectorAll<SVGRectElement>(`.${cls}`)){const x=Math.round((n(el,'x')-3)/CELL)*CELL,y=Math.round((n(el,'y')-3)/CELL)*CELL;rangeCell(c,x,y,p[0],p[1],p[2])}
}
function grid(c:CanvasRenderingContext2D,w:number,h:number){c.save();c.strokeStyle='rgba(165,205,185,.12)';c.lineWidth=.35;for(let x=0;x<=w;x+=CELL){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=CELL){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore()}
function selectedId(){return document.querySelector<HTMLElement>('#portrait')?.dataset.id??''}
function selection(c:CanvasRenderingContext2D,svg:SVGSVGElement){const id=selectedId(),g=id?svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`):null;if(!g)return;const p=tr(g),enemy=g.classList.contains('enemy');c.strokeStyle=enemy?'#c46c71':'#75cec8';c.lineWidth=1;c.strokeRect(Math.floor(p.x-7.5)+.5,Math.floor(p.y-7.5)+.5,15,15)}
function actionDots(c:CanvasRenderingContext2D,g:SVGGElement){for(const d of g.querySelectorAll<SVGCircleElement>('.action-dot')){c.fillStyle=d.classList.contains('spent')?'#4a4a4a':'#edf171';c.fillRect(Math.round(n(d,'cx')-1),9,2,2)}}
function token(c:CanvasRenderingContext2D,g:SVGGElement){if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'',cell=unitCells[id];if(!cell||!units.complete)return;const p=tr(g),enemy=g.classList.contains('enemy'),active=g.classList.contains('active');c.save();c.translate(Math.round(p.x),Math.round(p.y));if(active){c.fillStyle='#fff';c.fillRect(-9,6,18,2);c.fillStyle=enemy?'#df5656':'#54b6d2';c.fillRect(-8,6,16,1)}c.drawImage(units,cell[0]*24,cell[1]*24,24,24,-12,-17,24,24);const hp=g.querySelector<SVGRectElement>('.hp-fill'),ratio=hp?Math.min(1,n(hp,'width',12)/12):1;c.fillStyle='#000';c.fillRect(-8,7,16,4);c.fillStyle='#fff';c.fillRect(-7,8,14,2);c.fillStyle=enemy?'#df5656':'#78d978';c.fillRect(-7,8,Math.round(14*ratio),2);actionDots(c,g);if(g.querySelector('.shield-mark')){c.fillStyle='#54b6d2';c.fillRect(7,-11,4,5);c.fillStyle='#fff';c.fillRect(8,-10,2,3)}c.restore()}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){const r=frame.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(w!==backingW||h!==backingH){backingW=w;backingH=h;canvas.width=w;canvas.height=h}const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,s=Math.min(r.width/worldW,r.height/worldH),ox=(r.width-worldW*s)/2,cam=camera(svg),c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.save();c.translate(ox+cam.x*s,cam.y*s);c.scale(s*cam.z,s*cam.z);map(c);highlights(c,svg);grid(c,worldW,worldH);selection(c,svg);for(const g of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))token(c,g);c.restore()}
function loop(){const svg=latest();if(svg?.getAttribute('aria-label')?.endsWith('tactical battlefield')){canvas.style.display='block';draw(svg)}else canvas.style.display='none';requestAnimationFrame(loop)}
requestAnimationFrame(loop);
