import Phaser from 'phaser';

type Point = { x: number; y: number };
type LooseScene = Phaser.Scene & {
  gestureActive: boolean;
  gestureDistance: number;
  gestureMid?: Point;
  suppressInputUntil: number;
  baseZoom: number;
  cols: number;
  rows: number;
  gameMode: string;
  tokens: Map<string, Phaser.GameObjects.Container>;
  units: Array<{ id: string; team: 'player' | 'enemy' }>;
  draggingId?: string;
  cancelPieceDragForGesture: () => void;
  twoFingersDown: () => boolean;
  inputSuppressed: () => boolean;
  handleTwoFingerGesture: () => void;
  setLooseCameraBounds: () => void;
  fitTactical: () => void;
};

const CELL = 80;
const rail = document.querySelector<HTMLElement>('#initiative-rail');
const battlefield = document.querySelector<HTMLElement>('#battlefield');

let nativeGestureActive = false;
let activeTouchCount = 0;
let lastMid: Point | undefined;
let lastDistance = 0;
let restoreTimer = 0;

function getScene(): LooseScene | undefined {
  const registry = (Phaser as unknown as { GAMES?: Phaser.Game[] }).GAMES ?? [];
  const game = registry.find(Boolean);
  if (!game) return undefined;
  const candidate = game.scene.getScene('tactics') as LooseScene | undefined;
  return candidate?.scene?.isActive() ? candidate : undefined;
}

function setPieceDragging(scene: LooseScene, enabled: boolean) {
  for (const unit of scene.units) {
    if (unit.team !== 'player') continue;
    const token = scene.tokens.get(unit.id);
    if (token) scene.input.setDraggable(token, enabled);
  }
  const party = scene.tokens.get('party');
  if (party) scene.input.setDraggable(party, enabled);
}

function enterGesture(scene: LooseScene) {
  window.clearTimeout(restoreTimer);
  nativeGestureActive = true;
  scene.gestureActive = true;
  scene.suppressInputUntil = Number.POSITIVE_INFINITY;
  scene.cancelPieceDragForGesture();
  setPieceDragging(scene, false);
}

function leaveGesture(scene: LooseScene) {
  nativeGestureActive = false;
  lastMid = undefined;
  lastDistance = 0;
  scene.gestureActive = false;
  scene.gestureDistance = 0;
  scene.gestureMid = undefined;
  scene.suppressInputUntil = performance.now() + 450;
  scene.cancelPieceDragForGesture();
  window.clearTimeout(restoreTimer);
  restoreTimer = window.setTimeout(() => setPieceDragging(scene, true), 450);
}

function installSceneFixes(scene: LooseScene) {
  const patched = scene as LooseScene & { __mobilePolishInstalled?: boolean };
  if (patched.__mobilePolishInstalled) return;
  patched.__mobilePolishInstalled = true;

  // Native touch handlers below own all two-finger camera gestures. Phaser's
  // original handler is deliberately disabled so it cannot fight the camera.
  patched.handleTwoFingerGesture = () => {};
  patched.twoFingersDown = () => nativeGestureActive || activeTouchCount >= 2;
  patched.inputSuppressed = () =>
    nativeGestureActive || activeTouchCount >= 2 || performance.now() < patched.suppressInputUntil;

  patched.setLooseCameraBounds = () => {
    patched.cameras.main.setBounds(-100000, -100000, 200000, 200000);
  };

  patched.fitTactical = () => {
    const cam = patched.cameras.main;
    patched.baseZoom = Math.min(cam.width / (patched.cols * CELL), cam.height / (patched.rows * CELL));
    cam.setZoom(patched.baseZoom);
    cam.scrollX = patched.cols * CELL / 2 - cam.width / (2 * cam.zoom);
    cam.scrollY = patched.rows * CELL / 2 - cam.height / (2 * cam.zoom);
  };

  patched.setLooseCameraBounds();
}

function waitForScene() {
  const scene = getScene();
  if (scene) {
    installSceneFixes(scene);
    return;
  }
  requestAnimationFrame(waitForScene);
}
waitForScene();

function touchPoint(touch: Touch, rect: DOMRect): Point {
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function beginOrUpdateGesture(event: TouchEvent) {
  activeTouchCount = event.touches.length;
  if (event.touches.length < 2) return;

  const scene = getScene();
  if (!scene || !battlefield) return;
  event.preventDefault();

  if (!nativeGestureActive) enterGesture(scene);

  const rect = battlefield.getBoundingClientRect();
  const p1 = touchPoint(event.touches[0], rect);
  const p2 = touchPoint(event.touches[1], rect);
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const cam = scene.cameras.main;

  // Pinch around the midpoint, keeping the world point under the fingers fixed.
  if (lastDistance > 0) {
    const before = cam.getWorldPoint(mid.x, mid.y);
    const min = scene.gameMode === 'combat' ? scene.baseZoom * 0.45 : 0.22;
    const max = scene.gameMode === 'combat' ? scene.baseZoom * 3.5 : 3.5;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * (distance / lastDistance), min, max));
    const after = cam.getWorldPoint(mid.x, mid.y);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
  }

  // Two-finger translation pans freely, even when the whole board is visible.
  if (lastMid) {
    cam.scrollX -= (mid.x - lastMid.x) / cam.zoom;
    cam.scrollY -= (mid.y - lastMid.y) / cam.zoom;
  }

  lastMid = mid;
  lastDistance = distance;
  scene.gestureDistance = distance;
  scene.gestureMid = mid;
}

function endGesture(event: TouchEvent) {
  activeTouchCount = event.touches.length;
  const scene = getScene();
  if (!scene) return;

  // Keep the lock while even one finger from a two-finger gesture remains.
  if (nativeGestureActive && event.touches.length > 0) {
    event.preventDefault();
    scene.gestureActive = true;
    scene.suppressInputUntil = Number.POSITIVE_INFINITY;
    return;
  }

  if (nativeGestureActive) {
    event.preventDefault();
    leaveGesture(scene);
  }
}

battlefield?.addEventListener('touchstart', beginOrUpdateGesture, { passive: false, capture: true });
battlefield?.addEventListener('touchmove', beginOrUpdateGesture, { passive: false, capture: true });
battlefield?.addEventListener('touchend', endGesture, { passive: false, capture: true });
battlefield?.addEventListener('touchcancel', endGesture, { passive: false, capture: true });

// Add names beneath the initiative portraits and give the enlarged active token
// enough vertical room to remain fully visible.
const style = document.createElement('style');
style.textContent = `
  .initiative-dock{height:104px!important;overflow:visible!important}
  .initiative-rail{padding-top:24px!important;padding-bottom:12px!important;overflow-y:visible!important}
  .initiative-token{overflow:visible!important;margin-bottom:18px!important}
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
