export const layoutPolish = {
  name: 'layout-polish',
  enforce: 'pre' as const,
  transform(code:string,id:string){
    if(!id.endsWith('/src/phaser.css'))return null;
    return {code:code+`
:root{--portrait-stage-h:min(100dvh,calc(100vw * 1.78))}
html,body,.game-shell,.battlefield-viewport{overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.piece-dragging,.piece-dragging body{overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important}
.drag-ghost{opacity:.42;filter:drop-shadow(0 0 7px rgba(109,224,255,.95))}.route-line{pointer-events:none;fill:none;stroke-linecap:round;stroke-linejoin:round}.route-outline{stroke:#f4fbff;stroke-width:24;filter:drop-shadow(0 0 5px rgba(63,197,255,.85))}.route-core{stroke:#41bfff;stroke-width:15}.route-outline.enemy{stroke:#fff0f0}.route-core.enemy{stroke:#ee5361}.route-head{fill:#41bfff;stroke:#f4fbff;stroke-width:6;stroke-linejoin:round;filter:drop-shadow(0 0 5px rgba(63,197,255,.85));pointer-events:none}.route-head.enemy{fill:#ee5361;stroke:#fff0f0}.spell-range{fill:#7b54c8;fill-opacity:.43;stroke:#d7b8ff;stroke-width:3;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;pointer-events:none}
.hud-left,.hud-right{transform:translate3d(0,0,0);backface-visibility:hidden;will-change:transform;contain:layout paint}.game-board{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}.unit-token{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
@media (orientation:portrait){.battlefield-viewport{top:0;bottom:auto;height:var(--portrait-stage-h)}.hud-left,.hud-right{bottom:max(12px,env(safe-area-inset-bottom))}}
@media (display-mode:standalone) and (orientation:portrait){.battlefield-viewport{top:max(0px,calc((100dvh - var(--portrait-stage-h))/2))}}
@media (orientation:landscape){.battlefield-viewport{inset:0;padding-bottom:116px}.battlefield-frame{top:0;left:50%!important;right:auto;width:auto!important;height:calc(100dvh - 116px)!important;max-width:100vw;transform:translateX(-50%)}.battlefield{height:100%;width:auto}.game-board{height:100%!important;width:auto!important;max-height:calc(100dvh - 116px);max-width:100vw;margin:0 auto}.initiative-dock{top:auto!important;bottom:max(2px,env(safe-area-inset-bottom));left:20%!important;right:20%!important;height:108px}.initiative-rail{height:108px;padding-top:27px;padding-bottom:12px}.hud-left,.hud-right{bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:9px}.hud-left{left:max(18px,env(safe-area-inset-left))}.hud-right{right:max(18px,env(safe-area-inset-right))}.hud-circle{width:48px;height:48px}}
`,map:null};
  }
};
