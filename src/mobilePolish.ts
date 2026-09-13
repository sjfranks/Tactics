const rail = document.querySelector<HTMLElement>('#initiative-rail');

// This file now owns presentation-only polish. Camera and gesture behavior live
// in TacticsScene so there is a single authoritative camera controller.
const style = document.createElement('style');
style.textContent = `
  .initiative-dock{height:122px!important;overflow:visible!important;align-items:flex-end!important}
  .initiative-rail{height:122px!important;padding-top:38px!important;padding-bottom:14px!important;align-items:flex-end!important}
  .initiative-token{overflow:visible!important;margin-bottom:20px!important;transform-origin:center bottom!important}
  .initiative-token.active{transform:scale(1.2)!important;transform-origin:center bottom!important}
  .initiative-name{position:absolute;left:50%;top:calc(100% + 5px);transform:translateX(-50%);max-width:74px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.86);font:700 10px/1.1 Inter,system-ui,sans-serif;text-shadow:0 1px 3px #000;pointer-events:none}
  .initiative-token.active .initiative-name{color:#fff;font-weight:900}
`;
document.head.appendChild(style);

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
