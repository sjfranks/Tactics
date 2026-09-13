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
  mode: string;
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

function getScene(): LooseScene | undefined {
  const game = Phaser.GAMES.find(Boolean);
  if (!game) return undefined;
  const candidate = game.scene.getScene('tactics') as LooseScene | undefined;
  return candidate?.scene?.isActive() ? candidate : undefined;
}

function downPointers(scene: LooseScene) {
  return scene.input.manager.pointers.filter(pointer => pointer.isDown);
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

function installSceneFixes(scene: LooseScene) {
  const patched = scene as LooseScene & {
    __mobilePolishInstalled?: boolean;
    __gestureLock?: boolean;
    __lastGestureMid?: Point;
    __lastGestureDistance?: number;
  };
  if (patched.__mobilePolishInstalled) return;
  patched.__mobilePolishInstalled = true;

  patched.twoFingersDown = () => downPointers(patched).length >= 2;
  patched.inputSuppressed = () => Boolean(
    patched.__gestureLock ||
    patched.gestureActive ||
    downPointers(patched).length >= 2 ||
    performance.now() < patched.suppressInputUntil
  );

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

  patched.handleTwoFingerGesture = () => {
    const pointers = downPointers(patched);
    if (pointers.length < 2) return;

    if (!patched.__gestureLock) {
      patched.__gestureLock = true;
      patched.gestureActive = true;
      patched.cancelPieceDragForGesture();
      setPieceDragging(patched, false);
      patched.__lastGestureMid = undefined;
      patched.__lastGestureDistance = undefined;
    }

    const [p1, p2] = pointers;
    const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const cam = patched.cameras.main;

    if (patched.__lastGestureDistance && patched.__lastGestureDistance > 0) {
      const worldBefore = cam.getWorldPoint(midpoint.x, midpoint.y);
      const min = patched.gameMode === 'combat' ? patched.baseZoom * 0.45 : 0.22;
      const max = patched.gameMode === 'combat' ? patched.baseZoom * 3.5 : 3.5;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (distance / patched.__lastGestureDistance), min, max));
      const worldAfter = cam.getWorldPoint(midpoint.x, midpoint.y);
      cam.scrollX += worldBefore.x - worldAfter.x;
      cam.scrollY += worldBefore.y - worldAfter.y;
    }

    if (patched.__lastGestureMid) {
      cam.scrollX -= (midpoint.x - patched.__lastGestureMid.x) / cam.zoom;
      cam.scrollY -= (midpoint.y - patched.__lastGestureMid.y) / cam.zoom;
    }

    patched.__lastGestureDistance = distance;
    patched.__lastGestureMid = midpoint;
    patched.gestureDistance = distance;
    patched.gestureMid = midpoint;
    patched.suppressInputUntil = Number.POSITIVE_INFINITY;
  };

  patched.input.on('pointerdown', () => {
    if (downPointers(patched).length < 2) return;
    patched.__gestureLock = true;
    patched.gestureActive = true;
    patched.suppressInputUntil = Number.POSITIVE_INFINITY;
    patched.cancelPieceDragForGesture();
    setPieceDragging(patched, false);
  });

  patched.input.on('pointerup', () => {
    // Run after the scene's original pointer-up handler and restore the correct
    // gesture state using all Phaser pointers, not just pointer1/pointer2.
    patched.time.delayedCall(0, () => {
      const remaining = downPointers(patched).length;
      if (patched.__gestureLock && remaining > 0) {
        patched.gestureActive = true;
        patched.suppressInputUntil = Number.POSITIVE_INFINITY;
        return;
      }
      if (!patched.__gestureLock) return;

      patched.__gestureLock = false;
      patched.gestureActive = false;
      patched.gestureDistance = 0;
      patched.gestureMid = undefined;
      patched.__lastGestureDistance = undefined;
      patched.__lastGestureMid = undefined;
      patched.suppressInputUntil = performance.now() + 500;
      patched.cancelPieceDragForGesture();
      setPieceDragging(patched, true);
    });
  });

  patched.setLooseCameraBounds();
  if (patched.gameMode === 'combat') patched.fitTactical();
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

// Stop browser gesture defaults before Phaser sees the touch stream.
battlefield?.addEventListener('touchstart', event => {
  if (event.touches.length >= 2) event.preventDefault();
}, { passive: false, capture: true });
battlefield?.addEventListener('touchmove', event => {
  if (event.touches.length >= 2) event.preventDefault();
}, { passive: false, capture: true });

// The rail is rebuilt as combat state changes. Only re-centre when the active
// combatant itself changes, so manual rail scrolling remains usable mid-turn.
let lastActiveLabel = '';
function centreActivePortrait() {
  if (!rail) return;
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
  new MutationObserver(centreActivePortrait).observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  centreActivePortrait();
}
