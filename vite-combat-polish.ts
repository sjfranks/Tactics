export const combatPolish = {
  name:'combat-polish',
  enforce:'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/main.ts'))return null;
    let next=code;
    const swap=(from:string,to:string,name:string)=>{if(!next.includes(from))throw new Error(`combat-polish: ${name} pattern not found`);next=next.replace(from,to);};

    swap(`  timerIds:number[]=[];busy=false;gestureActive=false;gestureSuppressUntil=0;`,`  timerIds:number[]=[];busy=false;gestureActive=false;gestureSuppressUntil=0;healTargeting=false;`,'state');
    swap(`    ui.heal.addEventListener('click',()=>this.healSelected());ui.defend.addEventListener('click',()=>this.defendSelected());`,`    ui.heal.addEventListener('click',()=>this.beginHealTargeting());ui.defend.addEventListener('click',()=>this.defendSelected());`,'heal listener');

    const oldPaint=`  paintHighlights(layer:SVGGElement){\n    if(this.gameMode!=='combat')return;const s=this.selected();if(!s)return;\n    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+3,y:p.y*CELL+3,width:CELL-6,height:CELL-6,rx:7,class:cls}));\n    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));const threat=new Set<string>();this.reachable(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(\`${'${n.x},${n.y}'}\`)));threat.forEach(k=>{const[x,y]=k.split(',').map(Number);add({x,y},'enemy-threat');});return;}\n    if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))add(e,'attack-range');});\n  }`;
    const newPaint=`  paintHighlights(layer:SVGGElement){\n    if(this.gameMode!=='combat')return;const s=this.selected(),a=this.active();if(!s)return;\n    const add=(p:Point,cls:string)=>layer.appendChild(svg('rect',{x:p.x*CELL+3,y:p.y*CELL+3,width:CELL-6,height:CELL-6,rx:7,class:cls}));\n    if(this.healTargeting&&a?.team==='player'){for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const p={x,y};if(this.distance(a,p)<=2)add(p,'spell-range');}return;}\n    if(s.team==='enemy'){this.reachable(s,MOVE).forEach(p=>add(p,'enemy-range'));const threat=new Set<string>();this.reachable(s,MOVE).forEach(p=>this.neighbors(p).forEach(n=>threat.add(\`${'${n.x},${n.y}'}\`)));threat.forEach(k=>{const[x,y]=k.split(',').map(Number);add({x,y},'enemy-threat');});return;}\n    if(!this.isActivePlayer(s)||!this.hasAction(s))return;this.reachable(s,MOVE).forEach(p=>{if(p.x!==s.x||p.y!==s.y)add(p,'move-range');});this.living('enemy').forEach(e=>{if(this.canAttack(s,e))add(e,'attack-range');});\n  }`;
    swap(oldPaint,newPaint,'paint');

    swap(`  async handleCell(x:number,y:number){if(this.busy||this.gameOver)return;if(this.gameMode==='explore'){await this.moveParty({x,y});return;}const a=this.active();if(!a||a.team!=='player'||!this.hasAction(a))return;`,
      `  async handleCell(x:number,y:number){if(this.busy||this.gameOver)return;if(this.gameMode==='explore'){await this.moveParty({x,y});return;}if(this.healTargeting)return;const a=this.active();if(!a||a.team!=='player'||!this.hasAction(a))return;`,'handleCell');

    swap(`  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.pendingAttack&&id===this.pendingAttack.targetId){void this.confirmAttack();return;}if(a?.team==='player'&&t.team==='enemy'&&this.canAttack(a,t)){this.previewAttack(a,t);return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}`,
      `  handleUnit(id:string){if(this.busy||this.gameOver||this.gameMode!=='combat')return;const t=this.unit(id);if(!t)return;const a=this.active();if(this.healTargeting){if(a?.team==='player'&&t.team==='player'&&this.distance(a,t)<=2){this.healTarget(t);}return;}if(this.pendingAttack&&id===this.pendingAttack.targetId){void this.confirmAttack();return;}if(a?.team==='player'&&t.team==='enemy'&&this.canAttack(a,t)){this.previewAttack(a,t);return;}this.pendingAttack=undefined;this.hideForecast();this.selectedId=id;this.render();}`,'handleUnit');

    swap(`  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}`,
      `  routeToAttack(a:Unit,t:Unit){if(ACTIONS-a.actionsUsed<2)return[];const options=this.neighbors(t).filter(p=>!this.at(p.x,p.y)&&!this.isObstacle(p.x,p.y)).map(p=>this.findRoute(a,p,a.id)).filter(r=>r.length>1&&r.length-1<=MOVE).sort((x,y)=>x.length-y.length);return options[0]??[];}\n  async moveAndAttack(a:Unit,t:Unit){const r=this.routeToAttack(a,t);if(!r.length)return;await this.moveActive(a,r);if(!this.gameOver&&t.hp>0&&this.canAttack(a,t))await this.attack(a,t);}\n  canAttack(a:Unit,t:Unit){return this.hasAction(a)&&a.team!==t.team&&this.distance(a,t)===1;}`,'move+attack');

    swap(`  healSelected(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||u.hp>=u.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,u.maxHp-u.hp);u.hp+=n;u.actionsUsed++;this.log(\`${'${u.name}'} uses Heal: +${'${n}'} HP.\`);this.closeActionMenu();this.render();this.maybeFinish(u);}`,
      `  beginHealTargeting(){const u=this.active();if(!u||u.team!=='player'||!this.hasAction(u)||this.busy)return;this.healTargeting=true;this.pendingAttack=undefined;this.hideForecast();this.closeActionMenu();this.selectedId=u.id;this.message('Choose a hero within 2 squares to heal.');this.render();}\n  healTarget(t:Unit){const u=this.active();if(!u||u.team!=='player'||t.team!=='player'||!this.hasAction(u)||this.distance(u,t)>2||t.hp>=t.maxHp||this.busy)return;this.record();const n=Math.min(HEAL,t.maxHp-t.hp);t.hp+=n;u.actionsUsed++;this.healTargeting=false;this.log(\`${'${u.name}'} heals ${'${t.name}'}: +${'${n}'} HP.\`);this.selectedId=t.id;this.render();this.maybeFinish(u);}`,'heal methods');

    swap(`ui.heal.disabled=!a||a.team!=='player'||!this.hasAction(a)||a.hp>=a.maxHp;`,`ui.heal.disabled=!a||a.team!=='player'||!this.hasAction(a);`,'heal availability');
    return {code:next,map:null};
  }
};
