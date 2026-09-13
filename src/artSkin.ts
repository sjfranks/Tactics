import { ART } from './generatedAssets';

const NS='http://www.w3.org/2000/svg';
const styled=new WeakSet<Element>();

const style=document.createElement('style');
style.textContent=`
.battlefield{background:#151810}.game-board{background:#151810}.terrain-art{pointer-events:none;opacity:.98}.tile{fill:rgba(16,20,13,.05)!important;stroke:rgba(15,18,11,.72)!important;stroke-width:1.35!important}.grass-speck{display:none}
.move-range{fill:#329bda!important;fill-opacity:.43!important;stroke:#72ddff!important;stroke-width:3!important;filter:drop-shadow(0 0 4px rgba(50,185,255,.55))}.attack-range{fill:#c53f3f!important;fill-opacity:.38!important;stroke:#ff756d!important}.enemy-range{fill:#a92f38!important;fill-opacity:.26!important}.enemy-threat{fill:#ce7045!important;fill-opacity:.18!important}
.unit-token .token-inner{fill:#101722;stroke:#d7c9ae;stroke-opacity:.62}.unit-token.player .token-outer{fill:#112942;stroke:#8ddcff}.unit-token.enemy .token-outer{fill:#46151b;stroke:#ff5550}.unit-token.active .token-outer{stroke:#e8fbff;stroke-width:5;filter:drop-shadow(0 0 7px #2abaff)}.token-art{pointer-events:none}.token-glyph{display:none}.obstacle-art{pointer-events:none;filter:drop-shadow(0 4px 5px rgba(0,0,0,.55))}.obstacle>circle,.obstacle>text{display:none}
.initiative-token{background:#111923}.initiative-token img{width:48px;height:48px;display:block;border-radius:50%;object-fit:contain;pointer-events:none}.initiative-token span{display:grid;place-items:center}.initiative-token.active img{filter:drop-shadow(0 0 5px rgba(50,188,255,.7))}
`;
document.head.appendChild(style);

function artForId(id:string){
  if(id==='alden')return ART.alden;
  if(id==='mira')return ART.mira;
  if(id==='raider-1')return ART.goblin1;
  return ART.goblin2;
}

function addSvgImage(parent:Element,href:string,x:number,y:number,width:number,height:number,cls:string){
  const im=document.createElementNS(NS,'image');
  im.setAttribute('href',href);im.setAttribute('x',String(x));im.setAttribute('y',String(y));im.setAttribute('width',String(width));im.setAttribute('height',String(height));im.setAttribute('class',cls);im.setAttribute('preserveAspectRatio','xMidYMid meet');
  parent.appendChild(im);return im;
}

function skinBoard(){
  const svg=document.querySelector<SVGSVGElement>('.game-board');if(!svg)return;
  const tiles=svg.querySelector('.tiles');
  if(tiles&&!styled.has(tiles)){
    const rects=[...tiles.querySelectorAll<SVGRectElement>('.tile')];
    for(const r of rects){const x=Number(r.dataset.x??0),y=Number(r.dataset.y??0);const terrain=((x*7+y*11)%5===0)?ART.tile_dirt:ART.tile_grass1;const im=document.createElementNS(NS,'image');im.setAttribute('href',terrain);im.setAttribute('x',r.getAttribute('x')??'0');im.setAttribute('y',r.getAttribute('y')??'0');im.setAttribute('width',r.getAttribute('width')??'80');im.setAttribute('height',r.getAttribute('height')??'80');im.setAttribute('class','terrain-art');im.setAttribute('preserveAspectRatio','xMidYMid slice');tiles.insertBefore(im,r);}
    styled.add(tiles);
  }
  for(const token of svg.querySelectorAll<SVGGElement>('.unit-token[data-id]')){
    if(styled.has(token))continue;const id=token.dataset.id??'';if(id==='party')continue;const glyph=token.querySelector('.token-glyph');glyph?.remove();const im=addSvgImage(token,artForId(id),-25,-25,50,50,'token-art');const hp=token.querySelector('.hp-back');if(hp)token.insertBefore(im,hp);styled.add(token);
  }
  for(const obstacle of svg.querySelectorAll<SVGGElement>('.obstacle')){if(styled.has(obstacle))continue;addSvgImage(obstacle,ART.campfire,-31,-31,62,62,'obstacle-art');styled.add(obstacle);}
}

function replaceNames(){
  const swaps:[string,string][]=[['North Raider','Goblin Raider'],['Hill Raider','Goblin Skirmisher']];
  for(const el of document.querySelectorAll<HTMLElement>('#selected-name,.initiative-token small,.log-entry span')){
    let text=el.textContent??'';for(const [a,b] of swaps)text=text.replaceAll(a,b);if(el.textContent!==text)el.textContent=text;
  }
  for(const b of document.querySelectorAll<HTMLButtonElement>('.initiative-token')){
    const label=b.getAttribute('aria-label')??'';if(label.includes('North Raider'))b.setAttribute('aria-label',label.replaceAll('North Raider','Goblin Raider'));if(label.includes('Hill Raider'))b.setAttribute('aria-label',label.replaceAll('Hill Raider','Goblin Skirmisher'));
    if(b.querySelector('img'))continue;const name=b.querySelector('small')?.textContent??'';const src=name.includes('Goblin Raider')?ART.goblin1:name.includes('Goblin Skirmisher')?ART.goblin2:name.includes('Alden')?ART.alden:name.includes('Mira')?ART.mira:'';if(src){const span=b.querySelector('span');if(span){span.textContent='';const img=document.createElement('img');img.src=src;img.alt='';span.appendChild(img);}}
  }
}

function apply(){skinBoard();replaceNames();}
new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true});
apply();
