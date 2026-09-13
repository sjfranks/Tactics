import Phaser from 'phaser';

type Point = { x: number; y: number };
type RailUnit = { id: string; team: 'player' | 'enemy'; x?: number; y?: number; defending?: boolean };
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
  moveActive: (unit: RailUnit, route: Point[]) => Promise<void>;
  moveEnemy: (enemy: RailUnit, route: Point[]) => Promise<void>;
  defendSelected: () => void;
  finishActiveTurn: () => void;
  activeUnit: () => RailUnit | undefined;
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

function cameraNeedsFollow(scene: LooseScene) {
  if (scene.gameMode !== 'combat') return true;
  const cam = scene.cameras.main;
  const visibleWorldWidth = cam.width / cam.zoom;
  const visibleWorldHeight = cam.height / cam.zoom;
  return scene.cols * CELL > visibleWorldWidth + 2 || scene.rows * CELL > visibleWorldHeight + 2;
}

function centreCameraOnToken(scene: LooseScene, token: Phaser.GameObjects.Container) {
  const cam = scene.cameras.main;
  cam.scrollX = token.x - cam.width / (2 * cam.zoom);
  cam.scrollY = token.y - cam.height / (2 * cam.zoom);
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

  // Default tactical view: show the entire 6x8 board, centred and as large as
  // possible without cropping. UI may overlay it, but the camera itself does
  // not zoom or pan away from this view until the user zooms in.
  patched.fitTactical = () => {
    const cam = patched.cameras.main;
    patched.baseZoom = Math.min(cam.width / (patched.cols * CELL), cam.height / (patched.rows * CELL));
    cam.setZoom(patched.baseZoom);
    cam.scrollX = patched.cols * CELL / 2 - cam.width / (2 * cam.zoom);
    cam.scrollY = patched.rows * CELL / 2 - cam.height / (2 * cam.zoom);
  };

  // Main game code calls centerOn at turn changes and when inspecting units.
  // At the full-board default zoom that would unnecessarily pull the board off
  // centre, so only honour it when the current zoom actually requires panning.
  const originalCenterOn = patched.centerOn.bind(patched);
  patched.centerOn = (point: Point) => {
    if (patched.gameMode === 'combat' && !cameraNeedsFollow(patched)) return;
    originalCenterOn(point);
  };

  const followMovement = async (
    unit: RailUnit,
    route: Point[],
    original: (unit: RailUnit, route: Point[]) => Promise<void>
  ) => {
    const cam = patched.cameras.main;
    const token = patched.tokens.get(unit.id);
    const follow = Boolean(token && cameraNeedsFollow(patched));

    if (follow && token) {
      // Exact follow in both axes keeps the moving token centred while its
      // movement tween runs. At full-board zoom this branch is skipped.
      cam.startFollow(token, true, 1, 1);
      centreCameraOnToken(patched, token);
    }

    try {
      await original(unit, route);
    } finally {
      if (follow) {
        cam.stopFollow();
        const current = patched.tokens.get(unit.id);
        if (current) centreCameraOnToken(patched, current);
      }
    }
  };

  const originalMoveActive = patched.moveActive.bind(patched);
  patched.moveActive = (unit: RailUnit, route: Point[]) =>
    followMovement(unit, route, originalMoveActive);

  const originalMoveEnemy = patched.moveEnemy.bind(patched);
  patched.moveEnemy = (unit: RailUnit, route: Point[]) =>
    followMovement(unit, route, originalMoveEnemy);

  // Defend still consumes an action and applies its one-hit shield, but it now
  // immediately ends that player's turn regardless of unused actions.
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
