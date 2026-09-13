import Phaser from 'phaser';

type Point = { x: number; y: number };
type RailUnit = {
  id: string;
  team: 'player' | 'enemy';
  x?: number;
  y?: number;
  defending?: boolean;
};

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
  units: RailUnit[];
  draggingId?: string;
  cancelPieceDragForGesture: () => void;
  twoFingersDown: () => boolean;
  inputSuppressed: () => boolean;
  handleTwoFingerGesture: () => void;
  setLooseCameraBounds: () => void;
  fitTactical: () => void;
  centerOn: (point: Point) => void;
  defendSelected: () => void;
  finishActiveTurn: () => void;
  activeUnit: () => RailUnit | undefined;
};

const CELL = 80;
const rail = document.querySelector<HTMLElement>('#initiative-rail');
const battlefield = document.querySelector<HTMLElement>('#battlefield');
const resetView = document.querySelector<HTMLButtonElement>('#reset-view');

let nativeGestureActive = false;
let activeTouchCount = 0;
let lastMid: Point | undefined;
let lastDistance = 0;
let restoreTimer = 0;
let cameraMode: 'clean' | 'follow' = 'clean';

function getScene(): LooseScene | undefined {
  const registry = (Phaser as unknown as { GAMES?: Phaser.Game[] }).GAMES ?? [];
  const game = registry.find(Boolean);
  if (!game) return undefined;

  // ScenePlugin.isActive() was the bug here: calling it through the candidate
  // scene without a key can report false even though the scene itself is
  // running. That meant every scene-dependent camera fix silently no-op'd.
  // If getScene() resolves the registered scene, it is the scene we want.
  const candidate = game.scene.getScene('tactics') as LooseScene | undefined;
  return candidate;
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

function cleanZoom(scene: LooseScene) {
  const cam = scene.cameras.main;
  return Math.min(cam.width / (scene.cols * CELL), cam.height / (scene.rows * CELL));
}

function applyCleanView(scene: LooseScene) {
  if (scene.gameMode !== 'combat') return;
  const cam = scene.cameras.main;
  const zoom = cleanZoom(scene);
  scene.baseZoom = zoom;
  cam.stopFollow();
  cam.panEffect?.reset();
  cam.setZoom(zoom);
  cam.scrollX = scene.cols * CELL / 2 - cam.width / (2 * zoom);
  cam.scrollY = scene.rows * CELL / 2 - cam.height / (2 * zoom);
}

function centreCameraOnToken(scene: LooseScene, token: Phaser.GameObjects.Container) {
  const cam = scene.cameras.main;
  cam.scrollX = token.x - cam.width / (2 * cam.zoom);
  cam.scrollY = token.y - cam.height / (2 * cam.zoom);
}

function enterFollowMode() {
  cameraMode = 'follow';
}

function resetToCleanView(scene: LooseScene) {
  cameraMode = 'clean';
  applyCleanView(scene);
}

function tokenIsMoving(unit: RailUnit, token: Phaser.GameObjects.Container) {
  if (unit.x == null || unit.y == null) return false;
  const homeX = unit.x * CELL + CELL / 2;
  const homeY = unit.y * CELL + CELL / 2;
  return Math.abs(token.x - homeX) > 0.75 || Math.abs(token.y - homeY) > 0.75;
}

function updateCameraController(scene: LooseScene) {
  if (scene.gameMode !== 'combat') return;

  if (cameraMode === 'clean') {
    applyCleanView(scene);
    return;
  }

  const active = scene.activeUnit();
  if (!active) return;
  const token = scene.tokens.get(active.id);
  if (token && tokenIsMoving(active, token)) centreCameraOnToken(scene, token);
}

function enterGesture(scene: LooseScene) {
  window.clearTimeout(restoreTimer);
  nativeGestureActive = true;
  enterFollowMode();
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
  const patched = scene as LooseScene & { __cameraControllerInstalled?: boolean };
  if (patched.__cameraControllerInstalled) return;
  patched.__cameraControllerInstalled = true;

  patched.handleTwoFingerGesture = () => {};
  patched.twoFingersDown = () => nativeGestureActive || activeTouchCount >= 2;
  patched.inputSuppressed = () =>
    nativeGestureActive || activeTouchCount >= 2 || performance.now() < patched.suppressInputUntil;

  patched.setLooseCameraBounds = () => {
    patched.cameras.main.setBounds(-100000, -100000, 200000, 200000);
  };

  patched.fitTactical = () => applyCleanView(patched);

  const originalCenterOn = patched.centerOn.bind(patched);
  patched.centerOn = (point: Point) => {
    if (patched.gameMode === 'combat') return;
    originalCenterOn(point);
  };

  const originalDefend = patched.defendSelected.bind(patched);
  patched.defendSelected = () => {
    const before = patched.activeUnit();
    const wasDefending = Boolean(before?.defending);
    originalDefend();
    const after = patched.activeUnit();
    if (before && after?.id === before.id && !wasDefending && Boolean(after.defending)) {
      patched.finishActiveTurn();
    }
  };

  patched.setLooseCameraBounds();
  patched.events.on('update', () => updateCameraController(patched));
  resetToCleanView(patched);
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
  enterFollowMode();

  const rect = battlefield.getBoundingClientRect();
  const p1 = touchPoint(event.touches[0], rect);
  const p2 = touchPoint(event.touches[1], rect);
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const cam = scene.cameras.main;

  if (lastDistance > 0) {
    const before = cam.getWorldPoint(mid.x, mid.y);
    const min = scene.gameMode === 'combat' ? scene.baseZoom * 0.45 : 0.22;
    const max = scene.gameMode === 'combat' ? scene.baseZoom * 3.5 : 3.5;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * (distance / lastDistance), min, max));
    const after = cam.getWorldPoint(mid.x, mid.y);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
  }

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

battlefield?.addEventListener('wheel', () => enterFollowMode(), { passive: true, capture: true });

resetView?.addEventListener('click', () => {
  const scene = getScene();
  if (!scene || scene.gameMode !== 'combat') return;
  resetToCleanView(scene);
});

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
