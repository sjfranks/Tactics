const CELL=16;
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
.rail-sprite,#portrait{background-image:url('${import.meta.env.BASE_URL}assets/emblem/units.png')!important;background-size:300% 200%!important;background-repeat:no-repeat!important;background-color:#14243b!important}
[data-id="alden"]>.rail-sprite,#portrait[data-id="alden"]{background-position:0 0!important}
[data-id="mira"]>.rail-sprite,#portrait[data-id="mira"]{background-position:50% 0!important}
[data-id="raider-1"]>.rail-sprite,#portrait[data-id="raider-1"]{background-position:100% 0!important}
[data-id="raider-2"]>.rail-sprite,#portrait[data-id="raider-2"]{background-position:0 100%!important}
[data-id="raider-3"]>.rail-sprite,#portrait[data-id="raider-3"]{background-position:50% 100%!important}
[data-id="raider-4"]>.rail-sprite,#portrait[data-id="raider-4"]{background-position:100% 100%!important}
`;document.head.appendChild(style);

const battleMap=new Image();battleMap.decoding='async';battleMap.src=`${import.meta.env.BASE_URL}assets/emblem/battle-map.png`;
const units=new Image();units.decoding='async';units.src=`${import.meta.env.BASE_URL}assets/emblem/units.png`;
const unitCells:Record<string,[number,number]>={alden:[0,0],mira:[1,0],'raider-1':[2,0],'raider-2':[0,1],'raider-3':[1,1],'raider-4':[2,1]};

const latest=()=>[...document.querySelectorAll<SVGSVGElement>('.game-board')].at(-1);
const n=(el:Element,a:string,d=0)=>{const v=Number(el.getAttribute(a));return Number.isFinite(v)?v:d};
const tr=(el:Element)=>{const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(el.getAttribute('transform')??'');return m?{x:+m[1],y:+m[2]}:{x:0,y:0}};
const camera=(svg:SVGSVGElement)=>{const raw=svg.querySelector('.world')?.getAttribute('transform')??'';const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)\s*scale\(([-.\d]+)\)/.exec(raw);return m?{x:+m[1],y:+m[2],z:+m[3]}:{x:0,y:0,z:1}};

function backdrop(c:CanvasRenderingContext2D,w:number,h:number){if(battleMap.complete&&battleMap.naturalWidth)c.drawImage(battleMap,0,0,battleMap.naturalWidth,battleMap.naturalHeight,0,0,w,h);else{c.fillStyle='#6f984e';c.fillRect(0,0,w,h)}}
function rangeCell(c:CanvasRenderingContext2D,x:number,y:number,fill:string,stroke:string){c.save();c.fillStyle=fill;c.fillRect(x+.5,y+.5,CELL-1,CELL-1);c.strokeStyle=stroke;c.lineWidth=.8;c.strokeRect(x+1,y+1,CELL-2,CELL-2);c.restore()}
function highlights(c:CanvasRenderingContext2D,svg:SVGSVGElement){const defs:Record<string,[string,string]>={
 'move-range':['rgba(46,151,229,.34)','rgba(181,231,255,.92)'],'weapon-range':['rgba(214,61,75,.30)','rgba(255,181,170,.92)'],
 'attack-range':['rgba(214,45,60,.44)','rgba(255,224,190,.96)'],'enemy-range':['rgba(190,45,61,.26)','rgba(246,125,133,.84)'],
 'enemy-threat':['rgba(196,55,67,.18)','rgba(224,95,105,.55)'],'spell-range':['rgba(150,83,210,.28)','rgba(224,193,255,.9)'],
 'heal-target':['rgba(55,176,105,.38)','rgba(195,255,210,.95)']};
 for(const [cls,p] of Object.entries(defs))for(const el of svg.querySelectorAll<SVGRectElement>(`.${cls}`)){const x=Math.round((n(el,'x')-3)/CELL)*CELL,y=Math.round((n(el,'y')-3)/CELL)*CELL;rangeCell(c,x,y,p[0],p[1])}
}
function grid(c:CanvasRenderingContext2D,w:number,h:number){c.save();c.strokeStyle='rgba(19,39,35,.24)';c.lineWidth=.45;for(let x=CELL;x<w;x+=CELL){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=CELL;y<h;y+=CELL){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore()}
function selectedId(){return document.querySelector<HTMLElement>('#portrait')?.dataset.id??''}
function selection(c:CanvasRenderingContext2D,svg:SVGSVGElement){const g=svg.querySelector<SVGGElement>('.unit-token.active');if(!g)return;const p=tr(g),enemy=g.classList.contains('enemy'),x=Math.round(p.x)-8,y=Math.round(p.y)-8,glass=c.createLinearGradient(x,y,x+16,y+16);glass.addColorStop(0,enemy?'rgba(170,35,55,.48)':'rgba(17,92,205,.48)');glass.addColorStop(1,enemy?'rgba(242,74,78,.35)':'rgba(42,225,238,.44)');c.save();c.fillStyle=glass;c.shadowColor=enemy?'rgba(255,70,82,.7)':'rgba(65,226,255,.85)';c.shadowBlur=2;c.fillRect(x+.75,y+.75,14.5,14.5);c.shadowBlur=0;c.strokeStyle=enemy?'#8d2039':'#1269bd';c.lineWidth=2;c.strokeRect(x+1,y+1,14,14);c.strokeStyle=enemy?'#ff9898':'#69e7ff';c.lineWidth=.9;c.strokeRect(x+2,y+2,12,12);c.strokeStyle='#fff';c.lineWidth=1.5;const k=4,edges=[[x+1,y+1,x+1+k,y+1],[x+1,y+1,x+1,y+1+k],[x+15,y+1,x+15-k,y+1],[x+15,y+1,x+15,y+1+k],[x+1,y+15,x+1+k,y+15],[x+1,y+15,x+1,y+15-k],[x+15,y+15,x+15-k,y+15],[x+15,y+15,x+15,y+15-k]];for(const e of edges){c.beginPath();c.moveTo(e[0],e[1]);c.lineTo(e[2],e[3]);c.stroke()}c.restore()}
function token(c:CanvasRenderingContext2D,g:SVGGElement){if(g.classList.contains('drag-ghost'))return;const id=g.dataset.id??'',cell=unitCells[id];if(!cell||!units.complete||!units.naturalWidth)return;const p=tr(g),enemy=g.classList.contains('enemy');c.save();c.translate(Math.round(p.x),Math.round(p.y));const sw=units.naturalWidth/3,sh=units.naturalHeight/2;c.drawImage(units,cell[0]*sw,cell[1]*sh,sw,sh,-7.5,-8,15,15);const hp=g.querySelector<SVGRectElement>('.hp-fill'),ratio=hp?Math.min(1,n(hp,'width',12)/12):1;c.fillStyle='#172239';c.fillRect(-7,6,14,3);c.fillStyle='#f2e6c5';c.fillRect(-6.5,6.5,13,2);c.fillStyle=enemy?'#e94b58':'#58c96a';c.fillRect(-6.5,6.5,Math.round(13*ratio),2);if(g.querySelector('.shield-mark')){c.save();c.translate(5,-6);c.fillStyle='#f5e6b7';c.strokeStyle='#234f82';c.lineWidth=.8;c.beginPath();c.moveTo(0,-3);c.lineTo(3,-2);c.lineTo(2.5,1);c.quadraticCurveTo(1.5,3,0,4);c.quadraticCurveTo(-1.5,3,-2.5,1);c.lineTo(-3,-2);c.closePath();c.fill();c.stroke();c.restore()}c.restore()}

let backingW=0,backingH=0;
function draw(svg:SVGSVGElement){const r=frame.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(devicePixelRatio||1,3),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(w!==backingW||h!==backingH){backingW=w;backingH=h;canvas.width=w;canvas.height=h}const worldW=svg.viewBox.baseVal.width,worldH=svg.viewBox.baseVal.height,s=Math.min(r.width/worldW,r.height/worldH),ox=(r.width-worldW*s)/2,cam=camera(svg),c=canvas.getContext('2d')!;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.save();c.translate(ox+cam.x*s,cam.y*s);c.scale(s*cam.z,s*cam.z);backdrop(c,worldW,worldH);highlights(c,svg);grid(c,worldW,worldH);selection(c,svg);for(const g of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]'))token(c,g);c.restore()}
function loop(){const svg=latest();if(svg?.getAttribute('aria-label')?.endsWith('tactical battlefield')){canvas.style.display='block';draw(svg)}else canvas.style.display='none';requestAnimationFrame(loop)}
requestAnimationFrame(loop);
