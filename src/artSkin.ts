const PORTRAIT_SHEET=`${import.meta.env.BASE_URL}assets/portrait-sheet.webp`;
const PORTRAIT_POSITIONS:Record<string,string>={alden:'0% 0%',mira:'25.3% 0%','raider-1':'25.3% 92%','raider-2':'25.3% 92%','raider-3':'25.3% 92%','raider-4':'25.3% 92%'};

const style=document.createElement('style');
style.textContent=`
.initiative-token{background:#111923;overflow:visible}
.initiative-token>span{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center;background-color:#111923;background-image:url("${PORTRAIT_SHEET}");background-size:500% 300%;background-repeat:no-repeat}
.initiative-token.active>span{filter:drop-shadow(0 0 5px rgba(50,188,255,.7))}
#portrait{background-position:50% 50%;background-size:cover;background-repeat:no-repeat;background-color:#111923;color:transparent;overflow:hidden}
`;
document.head.appendChild(style);

function replaceNames(){
 const swaps:[string,string][]=[['North Raider','Goblin Raider'],['Hill Raider','Goblin Skirmisher']];
 for(const el of document.querySelectorAll<HTMLElement>('#selected-name,.initiative-token small,.log-entry span')){let text=el.textContent??'';for(const[a,b]of swaps)text=text.replaceAll(a,b);if(el.textContent!==text)el.textContent=text}
 for(const b of document.querySelectorAll<HTMLButtonElement>('.initiative-token')){
  const label=b.getAttribute('aria-label')??'';for(const[a,c]of swaps)if(label.includes(a))b.setAttribute('aria-label',label.replaceAll(a,c));
  const name=b.querySelector('small')?.textContent??'';const id=name.includes('Goblin Raider')?'raider-1':name.includes('Goblin Skirmisher')?'raider-2':name.includes('Goblin Archer')?'raider-3':name.includes('Goblin Brute')?'raider-4':name.includes('Alden')?'alden':name.includes('Mira')?'mira':'';
  const span=b.querySelector<HTMLElement>('span');if(span&&id){span.textContent='';span.dataset.artId=id;span.style.backgroundPosition=PORTRAIT_POSITIONS[id]??'0% 0%';}
 }
 const portrait=document.querySelector<HTMLElement>('#portrait'),name=document.querySelector<HTMLElement>('#selected-name')?.textContent??'';const id=name.includes('Goblin Raider')?'raider-1':name.includes('Goblin Skirmisher')?'raider-2':name.includes('Goblin Archer')?'raider-3':name.includes('Goblin Brute')?'raider-4':name.includes('Alden')?'alden':name.includes('Mira')?'mira':'';if(portrait){portrait.style.backgroundImage=id?`url("${PORTRAIT_SHEET}")`:'';portrait.style.backgroundSize='500% 300%';portrait.style.backgroundPosition=PORTRAIT_POSITIONS[id]??'0% 0%';}
}
let queued=false;function apply(){queued=false;replaceNames()}new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(apply)}}).observe(document.body,{childList:true,subtree:true,characterData:true});apply();
