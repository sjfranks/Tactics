export const statusArrowFix={
  name:'status-arrow-fix',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;

    // Defend lasts through the enemy phase, then always expires as soon as
    // that unit becomes active again. Make this replacement idempotent so it
    // remains reliable if another pre-transform has already touched the line.
    const beginTurnPattern=/const a=this\.active\(\);if\(!a\)return;a\.actionsUsed=0;(?:a\.defending=false;)?this\.selectedId=a\.id;/;
    if(!beginTurnPattern.test(next))throw new Error('status-arrow-fix: begin turn pattern not found');
    next=next.replace(beginTurnPattern,"const a=this.active();if(!a)return;a.actionsUsed=0;a.defending=false;this.selectedId=a.id;");

    // The drag-polish transform creates the route implementation before this
    // plugin runs. Stop the shaft at the arrowhead base.
    const shaftPattern=/shaftEnd=\{x:last\.x-ux\*(?:3|6),y:last\.y-uy\*(?:3|6)\};/;
    if(!shaftPattern.test(next))throw new Error('status-arrow-fix: route shaft pattern not found');
    next=next.replace(shaftPattern,"shaftEnd={x:last.x-ux*6,y:last.y-uy*6};");

    // Render shaft + head as one composited translucent object. Both pieces
    // use exactly the same solid colour before group opacity is applied, so
    // their overlap cannot create a darker seam. There is deliberately no
    // separate white/head outline or differently coloured shaft outline.
    const oldRouteRender=`    this.routeLayer.appendChild(svg('path',{d:path,class:'route-border-v2'+tone}));\n    this.routeLayer.appendChild(svg('path',{d:path,class:'route-ribbon-v2'+tone}));\n    this.routeLayer.appendChild(svg('polygon',{points:headPoints,class:'route-head-v2'+tone}));`;
    const newRouteRender=`    const routeColour=enemy?'#e14654':'#33c4e8';\n    const arrow=svg('g',{class:'route-arrow-v3'+tone,opacity:.68});\n    arrow.appendChild(svg('path',{d:path,fill:'none',stroke:routeColour,'stroke-width':4.8,'stroke-linecap':'round','stroke-linejoin':'round'}));\n    arrow.appendChild(svg('polygon',{points:headPoints,fill:routeColour,stroke:'none'}));\n    this.routeLayer.appendChild(arrow);`;
    if(!next.includes(oldRouteRender))throw new Error('status-arrow-fix: route render pattern not found');
    next=next.replace(oldRouteRender,newRouteRender);

    return {code:next,map:null};
  }
};
