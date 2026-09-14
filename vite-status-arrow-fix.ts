export const statusArrowFix={
  name:'status-arrow-fix',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;

    // The drag-polish transform supplies a rounded route and a terminal head.
    // Extend the shaft beneath the head so anti-aliasing cannot create a gap.
    const shaftPattern=/shaftEnd=\{x:end\.x-ux\*(?:3|6),y:end\.y-uy\*(?:3|6)\};/;
    if(!shaftPattern.test(next))throw new Error('status-arrow-fix: route shaft pattern not found');
    next=next.replace(shaftPattern,"shaftEnd={x:end.x-ux*2,y:end.y-uy*2};");

    // Composite the shaft and head in one translucent group. This prevents
    // overlap seams and avoids introducing a separate highlight line.
    const oldRouteRender=`    this.routeLayer.appendChild(svg('path',{d:path,class:'route-border-v2'+tone}));\n    this.routeLayer.appendChild(svg('path',{d:path,class:'route-ribbon-v2'+tone}));\n    this.routeLayer.appendChild(svg('polygon',{points:headPoints,class:'route-head-v2'+tone}));`;
    const newRouteRender=`    const routeColour=enemy?'#e14654':'#33c4e8';\n    const arrow=svg('g',{class:'route-arrow-v3'+tone,opacity:.68});\n    arrow.appendChild(svg('path',{d:path,fill:'none',stroke:routeColour,'stroke-width':4.8,'stroke-linecap':'round','stroke-linejoin':'round'}));\n    arrow.appendChild(svg('polygon',{points:headPoints,fill:routeColour,stroke:'none'}));\n    this.routeLayer.appendChild(arrow);`;
    if(!next.includes(oldRouteRender))throw new Error('status-arrow-fix: route render pattern not found');
    next=next.replace(oldRouteRender,newRouteRender);

    return {code:next,map:null};
  }
};
