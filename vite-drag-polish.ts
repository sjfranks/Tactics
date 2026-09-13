export const dragPolish={
  name:'drag-polish',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;
    const swap=(from:string,to:string,name:string)=>{if(!next.includes(from))throw new Error(`drag-polish: ${name} pattern not found`);next=next.replace(from,to);};
    const oldBegin=`  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy)return;e.stopPropagation();g.setPointerCapture(e.pointerId);this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;g.classList.add('dragging');const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;const p=this.svgPoint(ev.clientX,ev.clientY);g.setAttribute('transform',\`translate(${'${p.x}'} ${'${p.y}'})\`);const d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)};const r=this.findRoute(u,d,u.id);this.drawRoute(r.length>1&&r.length-1<=MOVE?r:[]);};const up=(ev:PointerEvent)=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.classList.remove('dragging');const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'&&this.canAttack(u,target)){this.previewAttack(u,target);return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);}`;
    const newBegin=`  beginDrag(e:PointerEvent,u:Unit,g:SVGGElement){\n    if(!this.isActivePlayer(u)||!this.hasAction(u)||this.busy||this.healTargeting||this.gestureActive)return;\n    e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);document.documentElement.classList.add('piece-dragging');\n    const blockNativeDrag=(te:TouchEvent)=>te.preventDefault();document.addEventListener('touchmove',blockNativeDrag,{passive:false});\n    this.drag={id:u.id,pointerId:e.pointerId,origin:{x:u.x,y:u.y},token:g};this.selectedId=u.id;\n    const highlightLayer=this.svg?.querySelector<SVGGElement>('.highlights');if(highlightLayer){highlightLayer.innerHTML='';this.paintHighlights(highlightLayer);}\n    const ghost=g.cloneNode(true) as SVGGElement;ghost.removeAttribute('data-id');ghost.classList.add('drag-ghost');ghost.style.pointerEvents='none';this.tokenLayer?.appendChild(ghost);\n    const cleanup=()=>{document.removeEventListener('touchmove',blockNativeDrag);document.documentElement.classList.remove('piece-dragging');};\n    const routeFor=(d:Point,target?:Unit)=>{if(target?.team==='enemy'){if(this.canAttack(u,target))return[];return this.routeToAttack(u,target);}const r=this.findRoute(u,d,u.id);return r.length>1&&r.length-1<=MOVE?r:[];};\n    const move=(ev:PointerEvent)=>{if(!this.drag||ev.pointerId!==this.drag.pointerId)return;ev.preventDefault();ev.stopPropagation();const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);ghost.setAttribute('transform',\`translate(${'${p.x}'} ${'${p.y}'})\`);this.drawRoute(routeFor(d,target));};\n    const finish=(ev:PointerEvent)=>{ev.preventDefault();ev.stopPropagation();g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();if(this.gestureActive||performance.now()<this.gestureSuppressUntil){this.drag=undefined;this.render();return;}const p=this.svgPoint(ev.clientX,ev.clientY),d={x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)},target=this.at(d.x,d.y);this.drag=undefined;if(target?.team==='enemy'){if(this.canAttack(u,target)){this.previewAttack(u,target);return;}if(this.routeToAttack(u,target).length){void this.moveAndAttack(u,target);return;}this.render();return;}const r=this.findRoute(u,d,u.id);if(r.length>1&&r.length-1<=MOVE&&!target)void this.moveActive(u,r);else this.render();};\n    const cancel=()=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',finish);g.removeEventListener('pointercancel',cancel);ghost.remove();cleanup();this.drag=undefined;this.render();};\n    g.addEventListener('pointermove',move);g.addEventListener('pointerup',finish);g.addEventListener('pointercancel',cancel);\n  }`;
    swap(oldBegin,newBegin,'drag');

    const oldDraw=`  drawRoute(r:Point[],enemy=false){if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;const points=r.map(p=>\`${'${p.x*CELL+CELL/2},${p.y*CELL+CELL/2}'}\`).join(' ');this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line ${'${enemy?\'enemy\':\'\'}'}\`,'marker-end':'url(#route-arrow)'}));}`;
    const newDraw=`  drawRoute(r:Point[],enemy=false){
    if(!this.routeLayer)return;this.routeLayer.innerHTML='';if(r.length<2)return;
    const centres=r.map(p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}));
    const first=centres[0],second=centres[1],last=centres[centres.length-1],prev=centres[centres.length-2];
    const sl=Math.hypot(second.x-first.x,second.y-first.y)||1;
    const start={x:first.x+(second.x-first.x)/sl*31,y:first.y+(second.y-first.y)/sl*31};
    const dx=last.x-prev.x,dy=last.y-prev.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux;
    const shaftEnd={x:last.x+ux*2,y:last.y+uy*2};
    const pts=[start,...centres.slice(1,-1),shaftEnd],points=pts.map(p=>\`${'${p.x},${p.y}'}\`).join(' ');
    const outerTip={x:last.x+ux*7,y:last.y+uy*7},outerBase={x:last.x-ux*24,y:last.y-uy*24};
    const outerPoints=\`${'${outerTip.x},${outerTip.y} ${outerBase.x+px*16},${outerBase.y+py*16} ${outerBase.x-px*16},${outerBase.y-py*16}'}\`;
    const innerTip={x:last.x+ux*3,y:last.y+uy*3},innerBase={x:last.x-ux*20,y:last.y-uy*20};
    const innerPoints=\`${'${innerTip.x},${innerTip.y} ${innerBase.x+px*11.5},${innerBase.y+py*11.5} ${innerBase.x-px*11.5},${innerBase.y-py*11.5}'}\`;
    this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-outline ${'${enemy?\'enemy\':\'\'}'}\`}));
    this.routeLayer.appendChild(svg('polygon',{points:outerPoints,class:\`route-head-outline ${'${enemy?\'enemy\':\'\'}'}\`}));
    this.routeLayer.appendChild(svg('polyline',{points,class:\`route-line route-core ${'${enemy?\'enemy\':\'\'}'}\`}));
    this.routeLayer.appendChild(svg('polygon',{points:innerPoints,class:\`route-head-core ${'${enemy?\'enemy\':\'\'}'}\`}));
  }`;
    swap(oldDraw,newDraw,'route');
    return {code:next,map:null};
  }
};
