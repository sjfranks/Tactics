import { ART } from './generatedAssets';

const style=document.createElement('style');
style.textContent=`
.initiative-token{background:#111923;overflow:hidden}.initiative-token>span{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center}.initiative-token img{width:112%;height:112%;display:block;object-fit:cover;object-position:50% 48%;transform:translate(-6%,-6%);pointer-events:none}.initiative-token.active img{filter:drop-shadow(0 0 5px rgba(50,188,255,.7))}
#portrait{background-position:center;background-size:cover;background-repeat:no-repeat;color:transparent;overflow:hidden}
`;
document.head.appendChild(style);

function replaceNames(){
  const swaps:[string,string][]=[['North Raider','Goblin Raider'],['Hill Raider','Goblin Skirmisher']];
  for(const el of document.querySelectorAll<HTMLElement>('#selected-name,.initiative-token small,.log-entry span')){
    let text=el.textContent??'';for(const[a,b]of swaps)text=text.replaceAll(a,b);if(el.textContent!==text)el.textContent=text;
  }
  for(const b of document.querySelectorAll<HTMLButtonElement>('.initiative-token')){
    const label=b.getAttribute('aria-label')??'';for(const[a,c]of swaps)if(label.includes(a))b.setAttribute('aria-label',label.replaceAll(a,c));
    if(b.querySelector('img'))continue;const name=b.querySelector('small')?.textContent??'';const src=name.includes('Goblin Raider')?ART.goblin1:name.includes('Goblin Skirmisher')?ART.goblin2:name.includes('Alden')?ART.alden:name.includes('Mira')?ART.mira:'';
    const span=b.querySelector('span');if(src&&span){span.textContent='';const img=document.createElement('img');img.src=src;img.alt='';span.appendChild(img);}
  }
  const portrait=document.querySelector<HTMLElement>('#portrait'),name=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';
  const src=name.includes('Goblin Raider')?ART.goblin1:name.includes('Goblin Skirmisher')?ART.goblin2:name.includes('Alden')?ART.alden:name.includes('Mira')?ART.mira:'';
  if(portrait)portrait.style.backgroundImage=src?`url("${src}")`:'';
}
function apply(){replaceNames();}
new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true,characterData:true});apply();
