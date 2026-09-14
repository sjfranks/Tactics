export const statusArrowFix={
  name:'status-arrow-fix',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;

    const beginTurnFrom="const a=this.active();if(!a)return;a.actionsUsed=0;this.selectedId=a.id;";
    const beginTurnTo="const a=this.active();if(!a)return;a.actionsUsed=0;a.defending=false;this.selectedId=a.id;";
    if(!next.includes(beginTurnFrom))throw new Error('status-arrow-fix: begin turn pattern not found');
    next=next.replace(beginTurnFrom,beginTurnTo);

    const shaftFrom="shaftEnd={x:last.x-ux*3,y:last.y-uy*3};";
    const shaftTo="shaftEnd={x:last.x-ux*6,y:last.y-uy*6};";
    if(!next.includes(shaftFrom))throw new Error('status-arrow-fix: route shaft pattern not found');
    next=next.replace(shaftFrom,shaftTo);

    return {code:next,map:null};
  }
};
