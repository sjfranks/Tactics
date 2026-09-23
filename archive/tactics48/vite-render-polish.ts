export const renderPolish={
  name:'render-polish',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    const from=`  followToken(x:number,y:number){if(this.cameraMode!=='follow')return;const w=this.cols*CELL,h=this.rows*CELL;this.tx=w/2-x*this.scale;this.ty=h/2-y*this.scale;this.applyCamera();}`;
    const to=`  followToken(x:number,y:number){if(this.cameraMode!=='follow'||this.scale<=1.01)return;const w=this.cols*CELL,h=this.rows*CELL;this.tx=w/2-x*this.scale;this.ty=h/2-y*this.scale;this.applyCamera();}`;
    if(!code.includes(from))throw new Error('render-polish: followToken pattern not found');
    return {code:code.replace(from,to),map:null};
  }
};
