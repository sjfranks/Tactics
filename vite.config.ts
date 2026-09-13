import { defineConfig } from 'vite';

const gestureGuard = {
  name: 'gesture-guard',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('/src/main.ts')) return null;
    let next = code;
    const swap = (from:string,to:string,name:string)=>{if(!next.includes(from))throw new Error(`gesture-guard: ${name} pattern not found`);next=next.replace(from,to);};

    swap(
      `  timerIds:number[]=[];busy=false;`,
      `  timerIds:number[]=[];busy=false;gestureActive=false;gestureSuppressUntil=0;`,
      'gesture state'
    );

    swap(
      `      const r=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:\`tile tile-${'${(x+y)%3}'}\`,'data-x':x,'data-y':y});r.addEventListener('pointerup',e=>{if((e.target as Element).closest('.unit-token'))return;void this.handleCell(x,y);});tiles.appendChild(r);`,
      `      const r=svg('rect',{x:x*CELL,y:y*CELL,width:CELL,height:CELL,class:\`tile tile-${'${(x+y)%3}'}\`,'data-x':x,'data-y':y});r.addEventListener('pointerup',e=>{if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if((e.target as Element).closest('.unit-token'))return;void this.handleCell(x,y);});tiles.appendChild(r);`,
      'cell gesture guard'
    );

    swap(
      `    g.addEventListener('pointerup',e=>{e.stopPropagation();if(this.drag&&this.drag.id===u.id)return;this.handleUnit(u.id);});`,
      `    g.addEventListener('pointerup',e=>{e.stopPropagation();if(this.gestureActive||performance.now()<this.gestureSuppressUntil)return;if(this.drag&&this.drag.id===u.id)return;this.handleUnit(u.id);});`,
      'token gesture guard'
    );

    const oldBind=`  bindSvgGestures(){if(!this.svg)return;const s=this.svg;s.onpointerdown=e=>{if((e.target as Element).closest('.unit-token'))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});s.setPointerCapture(e.pointerId);if(this.pointers.size===2)this.beginGesture();};s.onpointermove=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2)this.updateGesture();};const end=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);if(this.pointers.size<2)this.gestureStart=undefined;};s.onpointerup=end;s.onpointercancel=end;}`;
    const newBind=`  bindSvgGestures(){if(!this.svg)return;const s=this.svg;s.onpointerdown=e=>{this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{s.setPointerCapture(e.pointerId);}catch{}if(this.pointers.size===2){this.gestureActive=true;this.gestureSuppressUntil=performance.now()+450;if(this.drag){this.drag=undefined;this.render();return;}this.beginGesture();}};s.onpointermove=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){this.gestureActive=true;this.gestureSuppressUntil=performance.now()+450;this.updateGesture();}};const end=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);if(this.pointers.size<2){if(this.gestureActive)this.gestureSuppressUntil=performance.now()+450;this.gestureActive=false;this.gestureStart=undefined;}};s.onpointerup=end;s.onpointercancel=end;}`;
    swap(oldBind,newBind,'gesture binding');
    return {code:next,map:null};
  }
};

export default defineConfig({
  base: '/Tactics/',
  plugins: [gestureGuard],
  build: { outDir: 'build', emptyOutDir: true }
});
