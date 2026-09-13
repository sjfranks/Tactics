import { ART } from './generatedAssets';

const NS='http://www.w3.org/2000/svg';
const TACTICAL_BACKGROUND=`${import.meta.env.BASE_URL}assets/tactical-background-hi.jpg`;
const styled=new WeakSet<Element>();

const style=document.createElement('style');
style.textContent=`
.battlefield{background:#000!important;background-image:none!important}.game-board{background:#000!important}.terrain-background{pointer-events:none}.game-board.screenshot-terrain .tile{fill:transparent!important;stroke:rgba(12,17,10,.52)!important;stroke-width:1.15!important;vector-effect:non-scaling-stroke}.game-board.screenshot-terrain .grass-speck{display:none}
.move-range{fill:#329bda!important;fill-opacity:.38!important;stroke:#72ddff!important;stroke-width:2.6!important;filter:drop-shadow(0 0 3px rgba(50,185,255,.5))}.attack-range{fill:#c53f3f!important;fill-opacity:.34!important;stroke:#ff756d!important}.enemy-range{fill:#a92f38!important;fill-opacity:.22!important;stroke:#ff747c!important}.enemy-threat{fill:#ce7045!important;fill-opacity:.16!important}
.unit-token .token-inner{fill:#101722;stroke:#d7c9ae;stroke-opacity:.62}.unit-token.player .token-outer{fill:#112942;stroke:#8ddcff}.unit-token.enemy .token-outer{fill:#46151b;stroke:#ff5550}.unit-token.active .token-outer{stroke:#e8fbff;stroke-width:5;filter:drop-shadow(0 0 7px #2abaff)}.token-art{pointer-events:none}.obstacle-art{pointer-events:none;filter:drop-shadow(0 4px 5px rgba(0,0,0,.55))}.obstacle>circle,.obstacle>text{display:none}
.initiative-token{background:#111923;overflow:hidden}.initiative-token>span{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center}.initiative-token img{width:112%;height:112%;display:block;object-fit:cover;object-position:50% 48%;transform:translate(-6%,-6%);pointer-events:none}.initiative-token.active img{filter:drop-shadow(0 0 5px rgba(50,188,255,.7))}
.selection-corners{pointer-events:none;fill:none;stroke:#e7fbff;stroke-width:4;stroke-linecap:square;filter:drop-shadow(0 0 3px #23b7ff)}.selection-corners.enemy{stroke:#ffd8d3;filter:drop-shadow(0 0 3px #ff4d4d)}
`;
document.head.appendChild(style);

function artForId(id:string){if(id==='alden')return ART.alden;if(id==='mira')return ART.mira;if(id==='raider-1')return ART.goblin1;return ART.goblin2;}
function addSvgImage(parent:Element,href:string,x:number,y:number,width:number,height:number,cls:string,fit='xMidYMid slice'){
  const im=document.createElementNS(NS,'image');im.setAttribute('href',href);im.setAttribute('x',String(x));im.setAttribute('y',String(y));im.setAttribute('width',String(width));im.setAttribute('height',String(height));im.setAttribute('class',cls);im.setAttribute('preserveAspectRatio',fit);im.style.pointerEvents='none';parent.appendChild(im);return im;
}
function currentBoard(){const boards=[...document.querySelectorAll<SVGSVGElement>('.game-board')];return boards[boards.length-1];}
function skinBoard(){
  const svg=currentBoard();if(!svg)return;const vb=svg.viewBox.baseVal;if(vb.width!==480||vb.height!==640)return;
  const tiles=svg.querySelector<SVGGElement>('.tiles');
  if(tiles&&!styled.has(tiles)){
    svg.classList.add('screenshot-terrain');
    const im=document.createElementNS(NS,'image');im.setAttribute('href',TACTICAL_BACKGROUND);im.setAttribute('x','0');im.setAttribute('y','0');im.setAttribute('width','480');im.setAttribute('height','640');im.setAttribute('preserveAspectRatio','none');im.setAttribute('class','terrain-background');im.style.pointerEvents='none';tiles.insertBefore(im,tiles.firstChild);styled.add(tiles);
  }
  for(const token of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]')){if(styled.has(token))continue;const id=token.dataset.id??'';if(id==='party')continue;token.querySelector('.token-glyph')?.remove();const im=addSvgImage(token,artForId(id),-29,-29,58,58,'token-art');const hp=token.querySelector('.hp-back');if(hp)token.insertBefore(im,hp);styled.add(token);}
  for(const obstacle of svg.querySelectorAll<SVGGElement>('.obstacle')){if(styled.has(obstacle))continue;addSvgImage(obstacle,ART.campfire,-31,-31,62,62,'obstacle-art');styled.add(obstacle);}
}
function replaceNames(){const swaps:[string,string][]=[['North Raider','Goblin Raider'],['Hill Raider','Goblin Skirmisher']];for(const el of document.querySelectorAll<HTMLElement>('#selected-name,.initiative-token small,.log-entry span')){let text=el.textContent??'';for(const[a,b]of swaps)text=text.replaceAll(a,b);if(el.textContent!==text)el.textContent=text;}for(const b of document.querySelectorAll<HTMLButtonElement>('.initiative-token')){const label=b.getAttribute('aria-label')??'';for(const[a,c]of swaps)if(label.includes(a))b.setAttribute('aria-label',label.replaceAll(a,c));if(b.querySelector('img'))continue;const name=b.querySelector('small')?.textContent??'';const src=name.includes('Goblin Raider')?ART.goblin1:name.includes('Goblin Skirmisher')?ART.goblin2:name.includes('Alden')?ART.alden:name.includes('Mira')?ART.mira:'';const span=b.querySelector('span');if(src&&span){span.textContent='';const img=document.createElement('img');img.src=src;img.alt='';span.appendChild(img);}}}
function drawSelectionCorners(){const svg=currentBoard(),layer=svg?.querySelector<SVGGElement>('.highlights');if(!svg||!layer)return;layer.querySelector('.selection-corners')?.remove();const name=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';const id=name.includes('Alden')?'alden':name.includes('Mira')?'mira':name.includes('Goblin Raider')?'raider-1':name.includes('Goblin Skirmisher')?'raider-2':'';const token=id?svg.querySelector<SVGGElement>(`.unit-token[data-id="${id}"]`):null;if(!token)return;const m=/translate\(([-.\d]+)[ ,]([-.\d]+)\)/.exec(token.getAttribute('transform')??'');if(!m)return;const cx=Number(m[1]),cy=Number(m[2]),x=cx-40,y=cy-40,p=5,l=15;const g=document.createElementNS(NS,'g');g.setAttribute('class',`selection-corners ${token.classList.contains('enemy')?'enemy':''}`);const path=document.createElementNS(NS,'path');path.setAttribute('d',`M ${x+p+l} ${y+p} H ${x+p} V ${y+p+l} M ${x+80-p-l} ${y+p} H ${x+80-p} V ${y+p+l} M ${x+p} ${y+80-p-l} V ${y+80-p} H ${x+p+l} M ${x+80-p-l} ${y+80-p} H ${x+80-p} V ${y+80-p-l}`);g.appendChild(path);layer.appendChild(g);}
function apply(){skinBoard();replaceNames();drawSelectionCorners();}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}).observe(document.body,{childList:true,subtree:true});apply();
