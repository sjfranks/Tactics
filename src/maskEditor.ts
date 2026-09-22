import {
  DEFAULT_MASKS,FOREGROUND_SOURCES,MAP_HEIGHT,MAP_WIDTH,cloneMasks,pointInside,saveMasks,validateMasks,
  type MaskKind,type MaskPoint,type MaskZone
} from './explorationMasks';

type EditorOptions={getMasks:()=>MaskZone[];onSave:(masks:MaskZone[])=>void;drawBase:(context:CanvasRenderingContext2D)=>void};
type DragState={kind:'vertex';index:number}|{kind:'pan';x:number;y:number;centre:MaskPoint};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const distance=(a:MaskPoint,b:MaskPoint)=>Math.hypot(a.x-b.x,a.y-b.y);

export function createMaskEditor({getMasks,onSave,drawBase}:EditorOptions){
  const element=document.querySelector<HTMLElement>('#mask-editor')!;
  const canvas=document.querySelector<HTMLCanvasElement>('#mask-editor-canvas')!;
  const context=canvas.getContext('2d')!;
  const zoneList=document.querySelector<HTMLSelectElement>('#mask-zone-list')!;
  const filter=document.querySelector<HTMLSelectElement>('#mask-filter')!;
  const name=document.querySelector<HTMLInputElement>('#mask-name')!;
  const kind=document.querySelector<HTMLSelectElement>('#mask-kind')!;
  const source=document.querySelector<HTMLSelectElement>('#mask-source')!;
  const depth=document.querySelector<HTMLInputElement>('#mask-depth')!;
  const depthRow=document.querySelector<HTMLElement>('#mask-depth-row')!;
  const hint=document.querySelector<HTMLElement>('#mask-editor-hint')!;
  const finish=document.querySelector<HTMLButtonElement>('#mask-finish')!;
  const file=document.querySelector<HTMLInputElement>('#mask-import-file')!;
  const zoomValue=document.querySelector<HTMLElement>('#mask-zoom-value')!;
  let masks:MaskZone[]=[];
  let selectedId='';
  let selectedVertex=-1;
  let drawing:MaskPoint[]|undefined;
  let drag:DragState|undefined;
  let zoom=1;
  let centre:MaskPoint={x:MAP_WIDTH/2,y:MAP_HEIGHT/2};

  for(const entry of FOREGROUND_SOURCES){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;source.appendChild(option);}

  const selected=()=>masks.find(mask=>mask.id===selectedId);
  const shown=(mask:MaskZone)=>filter.value==='all'||mask.kind===filter.value;
  const baseScale=()=>Math.min(canvas.clientWidth/MAP_WIDTH,canvas.clientHeight/MAP_HEIGHT);
  const scale=()=>baseScale()*zoom;
  const canvasPoint=(event:PointerEvent):MaskPoint=>{
    const bounds=canvas.getBoundingClientRect();
    return{x:(event.clientX-bounds.left-canvas.clientWidth/2)/scale()+centre.x,y:(event.clientY-bounds.top-canvas.clientHeight/2)/scale()+centre.y};
  };
  const clampPoint=(point:MaskPoint):MaskPoint=>({x:Math.round(clamp(point.x,0,MAP_WIDTH)),y:Math.round(clamp(point.y,0,MAP_HEIGHT))});
  const notice=(message:string)=>{hint.textContent=message;};

  function draw(){
    if(element.hidden)return;
    const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);
    context.fillStyle='#152421';context.fillRect(0,0,width,height);
    context.save();context.translate(width/2-centre.x*scale(),height/2-centre.y*scale());context.scale(scale(),scale());
    drawBase(context);
    for(const mask of masks.filter(shown)){
      context.beginPath();mask.points.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));context.closePath();
      const active=mask.id===selectedId;
      context.fillStyle=mask.kind==='collision'?'rgba(227,65,59,.30)':'rgba(64,191,233,.28)';context.fill();
      context.strokeStyle=active?'#fff1b2':mask.kind==='collision'?'#fa776e':'#79d9ef';context.lineWidth=(active?3:1.7)/scale();context.stroke();
      if(active){
        mask.points.forEach((point,index)=>{
          context.beginPath();context.arc(point.x,point.y,8/scale(),0,Math.PI*2);
          context.fillStyle=index===selectedVertex?'#ffd361':'#fff8df';context.fill();
          context.lineWidth=2/scale();context.strokeStyle='#1a2926';context.stroke();
        });
      }
    }
    if(drawing?.length){
      context.beginPath();drawing.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));
      context.strokeStyle='#ffe392';context.lineWidth=3/scale();context.stroke();
      for(const point of drawing){context.beginPath();context.arc(point.x,point.y,7/scale(),0,Math.PI*2);context.fillStyle='#fff1b4';context.fill();}
    }
    context.restore();zoomValue.textContent=zoom.toFixed(1)+'×';
  }

  function syncList(){
    zoneList.innerHTML='';
    for(const mask of masks.filter(shown)){
      const option=document.createElement('option');option.value=mask.id;option.textContent=mask.name;zoneList.appendChild(option);
    }
    if(!masks.some(mask=>mask.id===selectedId&&shown(mask)))selectedId=zoneList.value||'';
    zoneList.value=selectedId;
    syncInspector();
  }

  function syncInspector(){
    const mask=selected();
    name.disabled=kind.disabled=source.disabled=depth.disabled=!mask;
    name.value=mask?.name??'';kind.value=mask?.kind??'collision';source.value=mask?.source??'ground';
    depth.value=String(Math.round(mask?.depthY??Math.max(...(mask?.points.map(point=>point.y)??[0]))));
    depthRow.hidden=!mask||mask.kind!=='foreground';
    source.parentElement!.hidden=!mask||mask.kind!=='foreground';
    document.querySelector<HTMLButtonElement>('#mask-zone-delete')!.disabled=!mask;
    document.querySelector<HTMLButtonElement>('#mask-vertex-add')!.disabled=!mask;
    document.querySelector<HTMLButtonElement>('#mask-vertex-delete')!.disabled=!mask||selectedVertex<0||mask.points.length<=3;
    draw();
  }

  function open(){
    masks=cloneMasks(getMasks());selectedId=masks.find(mask=>mask.kind==='collision')?.id??masks[0]?.id??'';
    selectedVertex=-1;drawing=undefined;finish.hidden=true;zoom=1;centre={x:MAP_WIDTH/2,y:MAP_HEIGHT/2};
    filter.value='collision';element.hidden=false;syncList();notice('Choose an area, drag its handles to reshape it, or drag empty space to pan. Zoom in for precise edges.');requestAnimationFrame(draw);
  }
  function close(){element.hidden=true;drawing=undefined;drag=undefined;}

  canvas.addEventListener('pointerdown',event=>{
    if(element.hidden)return;
    event.preventDefault();canvas.setPointerCapture(event.pointerId);
    const point=canvasPoint(event);
    if(drawing){drawing.push(clampPoint(point));finish.disabled=drawing.length<3;notice(drawing.length+' vertices. Tap Finish outline after at least three points.');draw();return;}
    const mask=selected();
    if(mask){
      const index=mask.points.findIndex(vertex=>distance(vertex,point)<13/scale());
      if(index>=0){selectedVertex=index;drag={kind:'vertex',index};syncInspector();return;}
    }
    const hit=[...masks].reverse().find(zone=>shown(zone)&&pointInside(point,zone.points));
    if(hit){selectedId=hit.id;selectedVertex=-1;zoneList.value=hit.id;syncInspector();return;}
    drag={kind:'pan',x:event.clientX,y:event.clientY,centre:{...centre}};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||!canvas.hasPointerCapture(event.pointerId))return;
    if(drag.kind==='vertex'){
      const mask=selected();if(mask)mask.points[drag.index]=clampPoint(canvasPoint(event));
      draw();
    }else{
      centre={x:drag.centre.x-(event.clientX-drag.x)/scale(),y:drag.centre.y-(event.clientY-drag.y)/scale()};draw();
    }
  });
  const endDrag=()=>{drag=undefined;draw();};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);

  zoneList.addEventListener('change',()=>{selectedId=zoneList.value;selectedVertex=-1;syncInspector();});
  filter.addEventListener('change',syncList);
  name.addEventListener('input',()=>{const mask=selected();if(mask){mask.name=name.value;const option=[...zoneList.options].find(item=>item.value===mask.id);if(option)option.textContent=name.value;}});
  kind.addEventListener('change',()=>{const mask=selected();if(mask){mask.kind=kind.value as MaskKind;if(filter.value!=='all')filter.value=mask.kind;syncList();}});
  source.addEventListener('change',()=>{const mask=selected();if(mask)mask.source=source.value;});
  depth.addEventListener('change',()=>{const mask=selected();if(mask)mask.depthY=clamp(Number(depth.value)||0,0,MAP_HEIGHT);});

  document.querySelector<HTMLButtonElement>('#mask-add')!.addEventListener('click',()=>{
    drawing=[];finish.hidden=false;finish.disabled=true;notice('Tap the map to place outline vertices. Tap Finish outline when done.');draw();
  });
  finish.addEventListener('click',()=>{
    if(!drawing||drawing.length<3)return;
    const id='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
    const maskKind=filter.value==='foreground'?'foreground':'collision';
    const created:MaskZone={id,name:'New '+(maskKind==='collision'?'impassable':'go-behind')+' area',kind:maskKind,source:'ground',depthY:Math.max(...drawing.map(point=>point.y)),points:drawing};
    masks.push(created);selectedId=id;selectedVertex=-1;drawing=undefined;finish.hidden=true;syncList();notice('New area created. Drag its handles, give it a name, then save.');
  });
  document.querySelector<HTMLButtonElement>('#mask-vertex-add')!.addEventListener('click',()=>{
    const mask=selected();if(!mask)return;
    let edge=0,length=-1;
    mask.points.forEach((point,index)=>{const next=mask.points[(index+1)%mask.points.length],value=distance(point,next);if(value>length){length=value;edge=index;}});
    const a=mask.points[edge],b=mask.points[(edge+1)%mask.points.length];mask.points.splice(edge+1,0,{x:Math.round((a.x+b.x)/2),y:Math.round((a.y+b.y)/2)});
    selectedVertex=edge+1;syncInspector();notice('Added a vertex halfway along the longest edge. Drag its handle into place.');
  });
  document.querySelector<HTMLButtonElement>('#mask-vertex-delete')!.addEventListener('click',()=>{
    const mask=selected();if(!mask||selectedVertex<0||mask.points.length<=3)return;
    mask.points.splice(selectedVertex,1);selectedVertex=-1;syncInspector();notice('Vertex removed.');
  });
  document.querySelector<HTMLButtonElement>('#mask-zone-delete')!.addEventListener('click',()=>{
    if(!selected())return;masks=masks.filter(mask=>mask.id!==selectedId);selectedId='';selectedVertex=-1;syncList();notice('Area removed from the draft. Save to keep this change.');
  });
  document.querySelector<HTMLButtonElement>('#mask-zoom-in')!.addEventListener('click',()=>{zoom=clamp(zoom*1.5,1,12);draw();});
  document.querySelector<HTMLButtonElement>('#mask-zoom-out')!.addEventListener('click',()=>{zoom=clamp(zoom/1.5,1,12);draw();});
  document.querySelector<HTMLButtonElement>('#mask-zoom-reset')!.addEventListener('click',()=>{zoom=1;centre={x:MAP_WIDTH/2,y:MAP_HEIGHT/2};draw();});
  document.querySelector<HTMLButtonElement>('#mask-defaults')!.addEventListener('click',()=>{
    masks=cloneMasks(DEFAULT_MASKS);selectedId='';selectedVertex=-1;drawing=undefined;finish.hidden=true;syncList();notice('Default areas loaded into the draft. Tap Save masks to persist them.');
  });
  document.querySelector<HTMLButtonElement>('#mask-save')!.addEventListener('click',()=>{
    try{const saved=saveMasks(masks);masks=cloneMasks(saved);onSave(saved);notice('Saved on this device. Export JSON to back up or move these masks to another browser.');}
    catch(error){notice('Could not save: '+(error instanceof Error?error.message:'storage unavailable'));}
  });
  document.querySelector<HTMLButtonElement>('#mask-export')!.addEventListener('click',()=>{
    const payload=JSON.stringify({version:1,map:'avaran-outer-quarter',masks},null,2);
    const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='avaran-map-masks.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('JSON exported. Import this file on another device to reuse your edits.');
  });
  document.querySelector<HTMLButtonElement>('#mask-import')!.addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{
    const upload=file.files?.[0];if(!upload)return;
    try{if(upload.size>500_000)throw new Error('File is too large.');const loaded=validateMasks(JSON.parse(await upload.text()));if(!loaded)throw new Error('Invalid polygon data.');
      masks=loaded;selectedId='';selectedVertex=-1;syncList();notice('Imported '+masks.length+' areas into the draft. Tap Save masks to persist them.');
    }catch(error){notice('Import failed: '+(error instanceof Error?error.message:'invalid file'));}
    file.value='';
  });
  document.querySelector<HTMLButtonElement>('#mask-close')!.addEventListener('click',close);
  window.addEventListener('resize',draw);
  return{open,close,isOpen:()=>!element.hidden};
}
