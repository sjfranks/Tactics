const rail = document.querySelector<HTMLElement>('#initiative-rail');
const battlefieldFrame = document.querySelector<HTMLElement>('#battlefield-frame');
const initiativeDock = document.querySelector<HTMLElement>('.initiative-dock');

// Presentation-only polish. Camera and gesture behavior live in TacticsScene so
// there is a single authoritative camera controller.
const style = document.createElement('style');
style.textContent = `
  .initiative-dock{height:122px!important;overflow:visible!important;align-items:flex-end!important}
  .initiative-rail{height:122px!important;padding-top:38px!important;padding-bottom:14px!important;align-items:flex-end!important}
  .initiative-token{overflow:visible!important;margin-bottom:20px!important;transform-origin:center bottom!important}
  .initiative-token.active{transform:scale(1.2)!important;transform-origin:center bottom!important}
  .initiative-name{position:absolute;left:50%;top:calc(100% + 5px);transform:translateX(-50%);max-width:74px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.86);font:700 10px/1.1 Inter,system-ui,sans-serif;text-shadow:0 1px 3px #000;pointer-events:none}
  .initiative-token.active .initiative-name{color:#fff;font-weight:900}

  /* Portrait tactical composition: the 6x8 board owns the full screen width.
     Because the board itself is 6:8, sizing the Phaser parent to that same
     aspect ratio lets TacticsScene.fitTactical() fill it exactly with no black
     side/top margins. The initiative rail is positioned immediately beneath
     the rendered board by syncPortraitLayout(). */
  @media (orientation:portrait){
    .battlefield-frame{
      top:0!important;
      left:0!important;
      right:0!important;
      bottom:auto!important;
      width:100%!important;
      height:auto!important;
      aspect-ratio:6 / 8;
    }
    .battlefield{inset:0!important;width:100%!important;height:100%!important}
  }
`;
document.head.appendChild(style);

function syncPortraitLayout() {
  if (!battlefieldFrame || !initiativeDock) return;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  if (!portrait) {
    initiativeDock.style.top = '';
    initiativeDock.style.bottom = '';
    return;
  }

  const board = battlefieldFrame.getBoundingClientRect();
  // The rail has intentional top padding so the active portrait can scale
  // without clipping. Pull the dock upward slightly so the visible portraits
  // begin immediately after the board rather than leaving a dead strip.
  initiativeDock.style.top = `${Math.round(board.bottom - 24)}px`;
  initiativeDock.style.bottom = 'auto';
}

function refreshPortraitComposition() {
  syncPortraitLayout();
  // Phaser's RESIZE scale mode responds to the browser resize event. Triggering
  // one after the CSS aspect-ratio change makes the camera immediately adopt
  // the new full-width 6x8 parent dimensions; Reset View then restores the same
  // framing later through TacticsScene.fitTactical().
  window.dispatchEvent(new Event('resize'));
  window.setTimeout(syncPortraitLayout, 120);
}

window.addEventListener('resize', syncPortraitLayout);
window.addEventListener('orientationchange', () => window.setTimeout(refreshPortraitComposition, 80));
requestAnimationFrame(refreshPortraitComposition);

function decorateRail() {
  if (!rail) return;
  rail.querySelectorAll<HTMLButtonElement>('.initiative-token').forEach(token => {
    if (token.querySelector('.initiative-name')) return;
    const aria = token.getAttribute('aria-label') ?? '';
    const name = aria.replace(/,?\s*current turn\s*$/i, '').trim();
    const label = document.createElement('span');
    label.className = 'initiative-name';
    label.textContent = name;
    token.appendChild(label);
  });
}

let lastActiveLabel = '';
function centreActivePortrait() {
  if (!rail) return;
  decorateRail();
  const active = rail.querySelector<HTMLButtonElement>('.initiative-token.active');
  if (!active) return;
  const label = active.getAttribute('aria-label') ?? '';
  if (label === lastActiveLabel) return;
  lastActiveLabel = label;
  requestAnimationFrame(() => {
    const left = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
    rail.scrollTo({ left, behavior: 'smooth' });
  });
}

if (rail) {
  new MutationObserver(() => {
    decorateRail();
    centreActivePortrait();
  }).observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  decorateRail();
  centreActivePortrait();
}
