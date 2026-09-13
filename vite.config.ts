import { defineConfig } from 'vite';

const tacticalRuntimeFixes = {
  name: 'tactical-runtime-fixes',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('/src/main.ts')) return null;

    let next = code;

    const activeMoveCall = "await this.moveToken(token,d,170*(r.length-1));";
    const enemyMoveCall = "await this.moveToken(token,d,160*(r.length-1));";
    if (!next.includes(activeMoveCall) || !next.includes(enemyMoveCall)) {
      throw new Error('tactical-runtime-fixes: movement call patterns were not found');
    }
    next = next.replace(activeMoveCall, "await this.moveTokenAlongRoute(token,r,170);");
    next = next.replace(enemyMoveCall, "await this.moveTokenAlongRoute(token,r,160);");

    const oldMoveToken = `  moveToken(token:Phaser.GameObjects.Container,d:Point,duration:number){\n    return new Promise<void>(resolve=>{\n      this.tweens.add({\n        targets:token,\n        x:d.x*CELL+CELL/2,\n        y:d.y*CELL+CELL/2,\n        duration,\n        ease:'Sine.easeInOut',\n        onUpdate:()=>{\n          if(this.gameMode==='combat'&&this.cameraMode==='follow')this.centerCameraOnToken(token);\n        },\n        onComplete:()=>{\n          if(this.gameMode==='combat'&&this.cameraMode==='follow')this.centerCameraOnToken(token);\n          resolve();\n        }\n      });\n    });\n  }`;

    const newMoveToken = `  async moveTokenAlongRoute(token:Phaser.GameObjects.Container,r:Point[],stepDuration:number){\n    for(const p of r.slice(1)){\n      await new Promise<void>(resolve=>{\n        this.tweens.add({\n          targets:token,\n          x:p.x*CELL+CELL/2,\n          y:p.y*CELL+CELL/2,\n          duration:stepDuration,\n          ease:'Sine.easeInOut',\n          onUpdate:()=>{\n            if(this.gameMode==='combat'&&this.cameraMode==='follow')this.centerCameraOnToken(token);\n          },\n          onComplete:()=>{\n            if(this.gameMode==='combat'&&this.cameraMode==='follow')this.centerCameraOnToken(token);\n            resolve();\n          }\n        });\n      });\n    }\n  }`;

    if (!next.includes(oldMoveToken)) {
      throw new Error('tactical-runtime-fixes: moveToken method pattern was not found');
    }
    next = next.replace(oldMoveToken, newMoveToken);

    const oldFit = `  fitTactical(){\n    const cam=this.cameras.main;\n    this.cameraMode='clean';\n    this.baseZoom=Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL));\n    cam.stopFollow();\n    cam.panEffect?.reset();\n    cam.setZoom(this.baseZoom);\n    cam.scrollX=this.cols*CELL/2-cam.width/(2*cam.zoom);\n    cam.scrollY=this.rows*CELL/2-cam.height/(2*cam.zoom);\n  }`;

    const newFit = `  fitTactical(){\n    const cam=this.cameras.main;\n    this.cameraMode='clean';\n    const portrait=cam.height>=cam.width;\n    this.baseZoom=portrait\n      ? cam.width/(this.cols*CELL)\n      : Math.min(cam.width/(this.cols*CELL),cam.height/(this.rows*CELL));\n    cam.stopFollow();\n    cam.panEffect?.reset();\n    cam.setZoom(this.baseZoom);\n    if(portrait){\n      cam.scrollX=0;\n      cam.scrollY=0;\n      const dock=document.querySelector<HTMLElement>('.initiative-dock');\n      if(dock){\n        const boardBottom=this.rows*CELL*this.baseZoom;\n        dock.style.top=\\`\${Math.round(boardBottom-18)}px\\`;\n        dock.style.bottom='auto';\n      }\n    }else{\n      cam.scrollX=this.cols*CELL/2-cam.width/(2*cam.zoom);\n      cam.scrollY=this.rows*CELL/2-cam.height/(2*cam.zoom);\n      const dock=document.querySelector<HTMLElement>('.initiative-dock');\n      if(dock){dock.style.top='';dock.style.bottom='';}\n    }\n  }`;

    if (!next.includes(oldFit)) {
      throw new Error('tactical-runtime-fixes: fitTactical method pattern was not found');
    }
    next = next.replace(oldFit, newFit);

    return { code: next, map: null };
  }
};

export default defineConfig({
  base: '/Tactics/',
  plugins: [tacticalRuntimeFixes],
  build: { outDir: 'build', emptyOutDir: true }
});
