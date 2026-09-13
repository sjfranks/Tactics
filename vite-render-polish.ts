export const renderPolish={
  name:'render-polish',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;
    const swap=(from:string,to:string,name:string)=>{if(!next.includes(from))throw new Error(`render-polish: ${name} pattern not found`);next=next.replace(from,to);};
    swap(`    const w=this.cols*CELL,h=this.rows*CELL;ui.battlefield.innerHTML='';`,`    const w=this.cols*CELL,h=this.rows*CELL;const oldBoard=ui.battlefield.querySelector<SVGSVGElement>('.game-board');`,'preserve old board');
    swap(`    this.applyCamera();this.syncUI();this.layout();this.bindSvgGestures();`,`    this.applyCamera();this.syncUI();this.layout();this.bindSvgGestures();oldBoard?.remove();`,'swap completed board');
    return {code:next,map:null};
  }
};
