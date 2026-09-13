import { defineConfig } from 'vite';

const tacticalPolish = {
  name: 'tactical-polish',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.endsWith('/src/phaser.css')) {
      return {
        code: code + `
:root{--portrait-stage-h:min(100dvh,calc(100vw * 1.78))}
html,body,.game-shell,.battlefield-viewport{overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.piece-dragging,.piece-dragging body{overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important}
.drag-ghost{opacity:.42;filter:drop-shadow(0 0 7px rgba(109,224,255,.95))}
.route-line{pointer-events:none;fill:none;stroke-linecap:round;stroke-linejoin:round}
.route-outline{stroke:#f4fbff;stroke-width:24;filter:drop-shadow(0 0 5px rgba(63,197,255,.85))}
.route-core{stroke:#41bfff;stroke-width:15}
.route-outline.enemy{stroke:#fff0f0}.route-core.enemy{stroke:#ee5361}
.route-head{fill:#41bfff;stroke:#f4fbff;stroke-width:6;stroke-linejoin:round;filter:drop-shadow(0 0 5px rgba(63,197,255,.85));pointer-events:none}
.route-head.enemy{fill:#ee5361;stroke:#fff0f0}
.spell-range{fill:#7b54c8;fill-opacity:.43;stroke:#d7b8ff;stroke-width:3;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;pointer-events:none}
.unit-token.heal-target .token-outer{stroke:#e2c4ff!important;filter:drop-shadow(0 0 7px rgba(188,121,255,.95))}
.hud-left,.hud-right{transform:translate3d(0,0,0);backface-visibility:hidden;will-change:transform;contain:layout paint}
.game-board{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.unit-token{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
@media (orientation:portrait){
  .battlefield-viewport{top:0;bottom:auto;height:var(--portrait-stage-h)}
  .hud-left,.hud-right{bottom:max(12px,env(safe-area-inset-bottom))}
}
@media (display-mode:standalone) and (orientation:portrait){
  .battlefield-viewport{top:max(0px,calc((100dvh - var(--portrait-stage-h))/2))}
}
@media (orientation:landscape){
  .battlefield-viewport{inset:0;padding-bottom:116px}
  .battlefield-frame{top:0;left:50%!important;right:auto;width:auto!important;height:calc(100dvh - 116px)!important;max-width:100vw;transform:translateX(-50%)}
  .battlefield{height:100%;width:auto}
  .game-board{height:100%!important;width:auto!important;max-height:calc(100dvh - 116px);max-width:100vw;margin:0 auto}
  .initiative-dock{top:auto!important;bottom:max(2px,env(safe-area-inset-bottom));left:20%!important;right:20%!important;height:108px}
  .initiative-rail{height:108px;padding-top:27px;padding-bottom:12px}
  .hud-left,.hud-right{bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:9px}
  .hud-left{left:max(18px,env(safe-area-inset-left))}
  .hud-right{right:max(18px,env(safe-area-inset-right))}
  .hud-circle{width:48px;height:48px}
}
`,
        map: null
      };
    }
    if (!id.endsWith('/src/main.ts')) return null;

    let next = code;
    const swap = (from: string, to: string, name: string) => {
      if (!next.includes(from)) throw new Error(`tactical-polish: ${name} pattern not found`);
      next = next.replace(from, to);
    };

    swap(
      `  timerIds:number[]=[];busy=false;`,
      `  timerIds:number[]=[];busy=false;healTargeting=false;`,
      'healTargeting state'
    );

    swap(
      `    ui.heal.addEventListener('click',()=>this.healSelected());ui.defend.addEventListener('click',()=>this.defendSelected());`,
      `    ui.heal.addEventListener('click',()=>this.beginHealTargeting());ui.defend.addEventListener('click',()=>this.defendSelected());`,
      'heal listener'
    );

    swap(
      `  layout(){\n    if(!this.svg)return;const rect=this.svg.getBoundingClientRect();document.documentElement.style.setProperty('--board-bottom',\`${'${Math.round(rect.bottom)}'}px\`);\n  }`,
      `  layout(){\n    if(!this.svg)return;const rect=this.svg.getBoundingClientRect(),viewport=document.querySelector<HTMLElement>('.battlefield-viewport')?.getBoundingClientRect();const localBottom=viewport?rect.bottom-viewport.top:rect.height;document.documentElement.style.setProperty('--board-bottom',\`${'${Math.round(localBottom)}'}px\`);\n  }`,
      'layout'
    );

    const oldPaint = `  paintHighlights(layer:SVGGElement){\n    if(this.gameMode!=='combat')return;const s=this.selected();if(!s)return;\n    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+3,y:p.y*CELL+3,width:CELL-6,height:CELL-6,rx:7,class:cls}));\n    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));const threat=new Set<string>();this.reachable(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(\`${'${n.x},${n.y}'}\`)));threat.forEach(k=>{const[x,y]=k.split(',').map(Number);add({x,y},'enemy-threat');});return;}\n    if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))add(e,'attack-range');});\n  }`;
    const newPaint = `  paintHighlights(layer:SVGGElement){\n    if(this.gameMode!=='combat')return;const s=this.selected(),a=this.active();if(!s)return;\n    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+3,y:p.y*CELL+3,width:CELL-6,height:CELL-6,rx:7,class:cls}));\n    if(this.healTargeting&&a?.team==='player'){for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x,y};if(this.distance(a,p)<=2)add(p,'spell-range');}return;}\n    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));const threat=new Set<string>();this.reachable(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(\`${'${n.x},${n.y}'}\`)));threat.forEach(k=>{const[x,y]=k.split(',').map(Number);add({x,y},'enemy-threat');});return;}\n    if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))add(e,'attack-range');});\n  }`;
    swap(oldPaint,newPaint,'paintHighlights');

    const oldBeginDrag = `  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;g.classList.add('dragging');const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',\`translate(${'${p.x}'} ${'${p.y}'})\`);const d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.classList.remove('dragging');const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}`;

    const newBeginDrag = `  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){\n    if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy||this.healTargeting)return;\n    e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);\n    document.documentElement.classList.add('piece-dragging');\n    const blockNativeDrag=(te:TouchEvent)=>te.preventDefault();document.addEventListener('touchmove',blockNativeDrag,{passive:false});\n    this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;\n    const ghost=g.cloneNode(true) as SVGGElement;ghost.removeAttribute('data-id');ghost.classList.add('drag-ghost');ghost.style.pointerEvents='none';this.tokenLayer?.appendChild(ghost);\n    const cleanup=()=>{document.removeEventListener('touchmove',blockNativeDrag);document.documentElement.classList.remove('piece-dragging');};\n    const routeFor=(d:Point,target?:Unit)=>{if(target?.team==='enemy'){if(this.canAttack(u,target))return[];return this.routeToAttack(u,target);}const r=this.findRoute(u,d,u.id);return r.length>1&&r.length-1<=MOVE?r:[];};\n    const move=(ev:PointerEvent)=>{\n      if(!this.drag||ev.pointerId!==this.drag.pointerId)return;ev.preventDefault();ev.stopPropagation();\n      const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);\n      ghost.setAttribute('transform',\`translate(${'${p.x}'} ${'${p.y}'})\`);this.drawRoute(routeFor(d,target));\n    };\n    const finish=(ev:PointerEvent)=>{\n      ev.preventDefault();ev.stopPropagation();g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();\n      const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;\n      if(target?.team==='enemy'){if(this.canAttack(u,target)){this.previewAttack(u,target);return;}if(this.routeToAttack(u,target).length){void this.moveAndAttack(u,target);return;}this.render();return;}\n      const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();\n    };\n    const cancel=()=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();this.drag=undefined;this.render();};\n    g.addEventListener('pointermove',move);g.addEventListener('pointerup',finish);g.addEventListener('pointercancel',cancel);\n  }`;
    swap(oldBeginDrag,newBeginDrag,'beginDrag');

    swap(
      `  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.pendingAttack&&id===this.pendingAttack.targetId){void this.confirmAttack();return;}if(a?.team==='player'&&t.team==='enemy'&&this.canAttack(a,t)){this.previewAttack(a,t);return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}`,
      `  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.healTargeting){if(a?.team==='player'&&t.team==='player'&&this.distance(a,t)<=2){this.healTarget(t);}return;}if(this.pendingAttack&&id===this.pendingAttack.targetId){void this.confirmAttack();return;}if(a?.team==='player'&&t.team==='enemy'&&this.canAttack(a,t)){this.previewAttack(a,t);return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}`,
      'handleUnit'
    );

    swap(
      `  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}`,
      `  routeToAttack(a:Unit,t:Unit){if(ACTIONS-a.actionsUsed<2)return[];const options=this.neighbors(t).filter(p=>!this.at(p.x,p.y)&&!this.isObstacle(p.x,p.y)).map(p=>this.findRoute(a,p,a.id)).filter(r=>r.length>1&&r.length-1<=MOVE).sort((x,y)=>x.length-y.length);return options[0]??[];}\n  async moveAndAttack(a:Unit,t:Unit){const r=this.routeToAttack(a,t);if(!r.length)return;await this.moveActive(a,r);if(!this.gameOver&&t.hp>0&&this.canAttack(a,t))await this.attack(a,t);}\n  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}`,
      'moveAndAttack methods'
    );

    swap(
      `  healSelected(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||u.hp>=u.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,u.maxHp-u.hp);u.hp+=n;u.actionsUsed++;this.log(\`${'${u.name}'} uses Heal: +${'${n}'} HP.\`);this.closeActionMenu();this.render();this.maybeFinish(u);}`,
      `  beginHealTargeting(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||this.busy)return;this.healTargeting=true;this.pendingAttack=undefined;this.hideForecast();this.closeActionMenu();this.selectedId=u.id;this.message('Choose a hero within 2 squares to heal.');this.render();}\n  healTarget(t:Unit){const u=this.active();if(!u||u.team!=='player'||t.team!=='player'||!this.hasAction(u)||this.distance(u,t)>2||t.hp>=t.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,t.maxHp-t.hp);t.hp+=n;u.actionsUsed++;this.healTargeting=false;this.log(\`${'${u.name}'} heals ${'${t.name}'}: +${'${n}'} HP.\`);this.selectedId=t.id;this.render();this.maybeFinish(u);}`,
      'heal targeting'
    );

    const oldDrawRoute = `  drawRoute(r:Point[],enemy=false){if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;const points=r.map(p=>\`${'${p.x*CELL+CELL/2},${p.y*CELL+CELL/2}'}\`).join(' ');this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line ${'${enemy?\'enemy\':\'\'}'}\`,'marker-end':'url(#route-arrow)'}));}`;
    const newDrawRoute = `  drawRoute(r:Point[],enemy=false){\n    if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;\n    const centres=r.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}));const first=centres[0],second=centres[1],last=centres[centres.length-1],prev=centres[centres.length-2];\n    const startLen=Math.hypot(second.x-first.x,second.y-first.y)||1,start={x:first.x+(second.x-first.x)/startLen*31,y:first.y+(second.y-first.y)/startLen*31};\n    const dx=last.x-prev.x,dy=last.y-prev.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,shaftEnd={x:last.x-ux*12,y:last.y-uy*12};\n    const pts=[start,...centres.slice(1,-1),shaftEnd],points=pts.map(p=>\`${'${p.x},${p.y}'}\`).join(' ');\n    this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-outline ${'${enemy?\'enemy\':\'\'}'}\`}));this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-core ${'${enemy?\'enemy\':\'\'}'}\`}));\n    const tip={x:last.x+ux*7,y:last.y+uy*7},base={x:last.x-ux*26,y:last.y-uy*26},arrowPoints=\`${'${tip.x},${tip.y} ${base.x+px*17},${base.y+py*17} ${base.x-px*17},${base.y-py*17}'}\`;\n    this.routeLayer.appendChild(svg('polygon',{points:arrowPoints,class:\`route-head ${'${enemy?\'enemy\':\'\'}'}\`}));\n  }`;
    swap(oldDrawRoute,newDrawRoute,'drawRoute');

    return { code: next, map: null };
  }
};

export default defineConfig({
  base: '/Tactics/',
  plugins: [tacticalPolish],
  build: { outDir: 'build', emptyOutDir: true }
});
