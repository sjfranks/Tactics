export const mapBackground={
  name:'map-background',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(id.endsWith('/src/main.ts')){
      const from="const world=svg('g',{class:'world'}),tiles=svg('g',{class:'tiles'}),highlights=svg('g',{class:'highlights'}),props=svg('g',{class:'props'}),route=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});world.append(tiles,highlights,props,route,tokens);";
      const to="const world=svg('g',{class:'world'}),mapArt=svg('image',{href:'./tactical-map.jpg',x:0,y:0,width:w,height:h,preserveAspectRatio:'xMidYMid slice',class:'map-art'}),tiles=svg('g',{class:'tiles'}),highlights=svg('g',{class:'highlights'}),props=svg('g',{class:'props'}),route=svg('g',{class:'routes'}),tokens=svg('g',{class:'tokens'});world.append(mapArt,tiles,highlights,props,route,tokens);";
      if(!code.includes(from))throw new Error('map-background: world pattern not found');
      return {code:code.replace(from,to),map:null};
    }
    if(id.endsWith('/src/phaser.css')){
      return {code:code+`\n/* Painted tactical map sits beneath a deliberately subtle gameplay grid. */\n.map-art{pointer-events:none}\n.tile{fill:transparent!important;stroke:rgba(255,255,255,.18)!important;stroke-width:.55!important}\n.grass-speck{display:none!important}\n.obstacle>rect,.obstacle>circle,.obstacle-core,.obstacle text{opacity:0!important;pointer-events:none!important}\n`,map:null};
    }
    return null;
  }
};
