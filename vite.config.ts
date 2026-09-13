import { defineConfig } from 'vite';

const dragRoutePolish = {
  name: 'drag-route-polish',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.endsWith('/src/phaser.css')) {
      return {
        code: code + `\n.drag-ghost{opacity:.42;filter:drop-shadow(0 0 7px rgba(109,224,255,.95))}.route-line{pointer-events:none;fill:none;stroke-linecap:round;stroke-linejoin:round}.route-outline{stroke:#f4fbff;stroke-width:24;filter:drop-shadow(0 0 5px rgba(63,197,255,.85))}.route-core{stroke:#41bfff;stroke-width:15}.route-outline.enemy{stroke:#fff0f0}.route-core.enemy{stroke:#ee5361}.route-head{fill:#41bfff;stroke:#f4fbff;stroke-width:6;stroke-linejoin:round;filter:drop-shadow(0 0 5px rgba(63,197,255,.85));pointer-events:none}.route-head.enemy{fill:#ee5361;stroke:#fff0f0}.hud-left,.hud-right{transform:translateZ(0);will-change:transform;contain:layout paint}.game-board{overscroll-behavior:none;-webkit-user-select:none}.unit-token{touch-action:none}\n`,
        map: null
      };
    }
    if (!id.endsWith('/src/main.ts')) return null;

    const oldBeginDrag = `  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;g.classList.add('dragging');const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',\`translate(\${p.x} \${p.y})\`);const d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.classList.remove('dragging');const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}`;

    const newBeginDrag = `  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){
    if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;
    e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);
    this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;
    const ghost=g.cloneNode(true) as SVGGElement;ghost.removeAttribute('data-id');ghost.classList.add('drag-ghost');ghost.style.pointerEvents='none';this.tokenLayer?.appendChild(ghost);
    const move=(ev:PointerEvent)=>{
      if(!this.drag||ev.pointerId!==this.drag.pointerId)return;ev.preventDefault();ev.stopPropagation();
      const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};
      ghost.setAttribute('transform',\`translate(\${p.x} \${p.y})\`);
      const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);
    };
    const finish=(ev:PointerEvent)=>{
      ev.preventDefault();ev.stopPropagation();
      g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();
      const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;
      if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}
      const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();
    };
    const cancel=()=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();this.drag=undefined;this.render();};
    g.addEventListener('pointermove',move);g.addEventListener('pointerup',finish);g.addEventListener('pointercancel',cancel);
  }`;

    const oldDrawRoute = `  drawRoute(r:Point[],enemy=false){if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;const points=r.map(p=>\`\${p.x*CELL+CELL/2},\${p.y*CELL+CELL/2}\`).join(' ');this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line \${enemy?'enemy':''}\`,'marker-end':'url(#route-arrow)'}));}`;

    const newDrawRoute = `  drawRoute(r:Point[],enemy=false){
    if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;
    const centres=r.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}));
    const first=centres[0],second=centres[1],last=centres[centres.length-1],prev=centres[centres.length-2];
    const startLen=Math.hypot(second.x-first.x,second.y-first.y)||1;
    const start={x:first.x+(second.x-first.x)/startLen*31,y:first.y+(second.y-first.y)/startLen*31};
    const pts=[start,...centres.slice(1)];const points=pts.map(p=>\`\${p.x},\${p.y}\`).join(' ');
    this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-outline \${enemy?'enemy':''}\`}));
    this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-core \${enemy?'enemy':''}\`}));
    const dx=last.x-prev.x,dy=last.y-prev.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux;
    const tip={x:last.x+ux*7,y:last.y+uy*7},base={x:last.x-ux*26,y:last.y-uy*26};
    const arrowPoints=\`\${tip.x},\${tip.y} \${base.x+px*17},\${base.y+py*17} \${base.x-px*17},\${base.y-py*17}\`;
    this.routeLayer.appendChild(svg('polygon',{points:arrowPoints,class:\`route-head \${enemy?'enemy':''}\`}));
  }`;

    if (!code.includes(oldBeginDrag)) throw new Error('drag-route-polish: beginDrag pattern not found');
    if (!code.includes(oldDrawRoute)) throw new Error('drag-route-polish: drawRoute pattern not found');
    const next = code.replace(oldBeginDrag, newBeginDrag).replace(oldDrawRoute, newDrawRoute);
    return { code: next, map: null };
  }
};

export default defineConfig({
  base: '/Tactics/',
  plugins: [dragRoutePolish],
  build: { outDir: 'build', emptyOutDir: true }
});
