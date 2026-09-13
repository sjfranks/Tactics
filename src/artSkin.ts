import { ART } from './generatedAssets';

const style=document.createElement('style');
style.textContent=`
.initiative-token{background:#111923;overflow:visible}
.initiative-token>span{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#111923}
.initiative-token img{width:88%;height:88%;display:block;object-fit:contain;object-position:50% 50%;transform:none;pointer-events:none;margin:auto}
.initiative-token.active img{filter:drop-shadow(0 0 5px rgba(50,188,255,.7))}
#portrait{background-position:50% 50%;background-size:contain;background-repeat:no-repeat;background-color:#111923;color:transparent;overflow:hidden}
`;
document.head.appendChild(style);

function replaceNames(){
  const swaps:[string,string][]=[['North Raider','Goblin Raider'],['Hill Raider','Goblin Skirmisher']];
  for(const el of document.querySelectorAll<HTMLElement>('#selected-name,.initiative-token small,.log-entry span')){
    let text=el.textContent??'';for(const[a,b]of swaps)text=text.replaceAll(a,b);if(el.textContent!==text)el.textContent=text;
  }
  for(const b of document.querySelectorAll<HTMLButtonElement>('.initiative-token')){
    const label=b.getAttribute('aria-label')??'';for(const[a,c]of swaps)if(label.includes(a))b.setAttribute('aria-label',label.replaceAll(a,c));
    const name=b.querySelector('small')?.textContent??'';
    const id=name.includes('Goblin Raider')?'raider-1':name.includes('Goblin Skirmisher')?'raider-2':name.includes('Alden')?'alden':name.includes('Mira')?'mira':'';
    const src=id==='raider-1'?ART.goblin1:id==='raider-2'?ART.goblin2:id==='alden'?ART.alden:id==='mira'?ART.mira:'';
    const span=b.querySelector('span');let img=b.querySelector<HTMLImageElement>('img');
    if(src&&span&&!img){span.textContent='';img=document.createElement('img');img.src=src;img.alt='';span.appendChild(img)}
    if(img&&id)img.dataset.artId=id;
  }
  const portrait=document.querySelector<HTMLElement>('#portrait'),name=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';
  const src=name.includes('Goblin Raider')?ART.goblin1:name.includes('Goblin Skirmisher')?ART.goblin2:name.includes('Alden')?ART.alden:name.includes('Mira')?ART.mira:'';
  if(portrait)portrait.style.backgroundImage=src?`url("${src}")`:'';
}
function apply(){replaceNames();}
new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true,characterData:true});apply();
