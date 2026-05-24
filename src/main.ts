import './style.css';
import { createAppModel } from './app/app';
import { createKeyboardInputSampler } from './engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from './engine/fixed-step';
import { InputLogWriter } from './engine/input-log';
import { createHubRoomController } from './hub/room';
import { createCanvasRoomRenderer } from './render/canvas-room';
import { createLaunchPlan, performLaunch, type LaunchNavigator } from './navigation/launch';
import { HUB_GAME_REGISTRY, getGameById } from './games/registry';
import { renderPixelText, measurePixelText, PIXEL_FONT_HEIGHT } from './render/sprites/pixel-font';
import { initializeHubBoundaryV2 } from './wasm/boundary';
import { loadGeneratedHubWasm } from './wasm/generated-loader';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

const previewParam = new URLSearchParams(window.location.search).get('preview');
if (previewParam === 'pixel-text') {
  renderPixelTextPreview(appRoot);
} else {
  void start(appRoot);
}

// Dev-only: render a sample sentence in the hand-painted pixel font so I
// can verify the glyphs read at viewport-relevant scales.
// Usage: http://localhost:5173/?preview=pixel-text
function renderPixelTextPreview(root: HTMLElement): void {
  const sample = "AWA' IN — WHS";
  const scale = 4;
  const padding = 40;
  const textWidth = measurePixelText(sample, scale);
  const textHeight = PIXEL_FONT_HEIGHT * scale;
  const canvas = document.createElement('canvas');
  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  canvas.style.margin = '40px auto';
  canvas.style.background = '#2a1810';
  canvas.style.border = '2px solid #c4a878';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    root.textContent = 'no canvas context';
    return;
  }
  ctx.imageSmoothingEnabled = false;
  // Contrast background INSIDE the canvas (deep peat under cream text)
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Paint the sample line in tatties-cream (PALETTE.bone)
  const x = padding;
  const y = padding;
  renderPixelText(ctx, sample, x, y, scale, '#f0e6c8');

  // Render a second line below at scale 2 so I can verify the glyphs
  // still read at the smaller scale the in-scene prompts will use.
  const smallScale = 2;
  const smallY = y + textHeight + 24;
  // Resize canvas to fit the second line
  const smallWidth = measurePixelText(sample, smallScale);
  if (smallWidth + padding * 2 > canvas.width) {
    canvas.width = smallWidth + padding * 2;
    // Repaint background since resizing clears the canvas
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderPixelText(ctx, sample, x, y, scale, '#f0e6c8');
  }
  canvas.height = smallY + PIXEL_FONT_HEIGHT * smallScale + padding;
  // Resizing height also clears the canvas — repaint everything
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderPixelText(ctx, sample, x, y, scale, '#f0e6c8');
  renderPixelText(ctx, sample, x, smallY, smallScale, '#f0e6c8');

  const label = document.createElement('p');
  label.textContent = `pixel-font preview: "${sample}" at scale ${scale}× (top) and ${smallScale}× (bottom)`;
  label.style.textAlign = 'center';
  label.style.color = '#c4a878';
  label.style.fontFamily = 'Georgia, serif';
  label.style.fontStyle = 'italic';
  label.style.margin = '20px';
  root.style.overflow = 'auto';
  root.style.height = '100vh';
  root.replaceChildren(label, canvas);
}

async function start(root: HTMLElement): Promise<void> {
  const model = createAppModel();
  const shell = createShell(model);
  root.replaceChildren(shell.scene);

  try {
    // Seed: defaults to Date.now() so each visit feels fresh, but a
    // `?seed=N` URL param overrides for determinism smoke tests + any
    // future replay/share-a-room features.
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const seed = seedParam !== null && /^\d+$/.test(seedParam)
      ? BigInt(seedParam)
      : BigInt(Date.now());
    const boundary = await initializeHubBoundaryV2(loadGeneratedHubWasm, seed);
    const renderer = createCanvasRoomRenderer(shell.canvas, boundary.room);
    const keyboard = createKeyboardInputSampler(window);

    const inputLog = new InputLogWriter({
      seed,
      coreApiVersion: boundary.apiVersion,
      startedAtUtcMs: BigInt(Date.now()),
      initialStateHash: boundary.stateHash()
    });

    // Pointer-drive: when the user is holding the pointer down on the
    // canvas (but NOT on a door, which launches instead), walk the
    // haggis toward the pointer. Touch-primary for mobile, also works
    // with a desktop mouse held down.
    let pointerActive = false;
    /** Latest pointer position in world coords. Updated on move while down. */
    let pointerWorldX = 0;
    let pointerWorldY = 0;
    /** Dead-zone radius around the haggis where we stop walking — prevents
     * jitter when the haggis is roughly at the pointer. */
    const POINTER_DEADZONE = 18;

    function samplePackedInput(): number {
      // Keyboard takes precedence — if the user is touching a key, use
      // keyboard. Falls back to pointer-drive if pointer is active.
      const v = keyboard.snapshot();
      let bits = 0;
      if (v.x !== 0 || v.y !== 0) {
        if (v.x > 0) bits |= 0b01;
        else if (v.x < 0) bits |= 0b10;
        if (v.y > 0) bits |= 0b01 << 2;
        else if (v.y < 0) bits |= 0b10 << 2;
        return bits;
      }
      if (pointerActive) {
        const snapshot = room.lastSnapshot();
        const dx = pointerWorldX - snapshot.playerX;
        const dy = pointerWorldY - snapshot.playerY;
        if (Math.hypot(dx, dy) > POINTER_DEADZONE) {
          if (dx > POINTER_DEADZONE * 0.4) bits |= 0b01;
          else if (dx < -POINTER_DEADZONE * 0.4) bits |= 0b10;
          if (dy > POINTER_DEADZONE * 0.4) bits |= 0b01 << 2;
          else if (dy < -POINTER_DEADZONE * 0.4) bits |= 0b10 << 2;
        }
      }
      return bits;
    }

    const room = createHubRoomController({ boundary, renderer });
    room.render();
    // Canvas-aware paint mark. The bothy is canvas-first so chrome's LCP
    // heuristic doesn't score the (briefly blank) canvas as a contentful
    // element — LCP ends up matching FCP at whatever DOM text the page
    // ships, not the actual first-bothy-paint moment. We record our own
    // W3C User Timing mark right after the renderer's first draw issues,
    // scheduled inside a requestAnimationFrame so the compositor has
    // posted the frame to the screen by the time the mark fires. The
    // smoke-paint-timing.mjs gate asserts the mark's startTime against
    // `paint.max_ms.hubFirstFrame` in perf-budgets.json.
    requestAnimationFrame(() => {
      performance.mark('hub:firstFrame');
    });
    shell.status.textContent = '';

    // Dev / smoke-test hooks: expose snapshot + state hash via window so
    // Playwright smokes can assert on simulation state (e.g. pointer-
    // drive actually moved the haggis; same seed + input → same state
    // hash). No production cost.
    const winHooks = window as unknown as {
      __roomSnapshot?: () => unknown;
      __stateHash?: () => bigint;
      __seed?: bigint;
    };
    winHooks.__roomSnapshot = () => room.lastSnapshot();
    winHooks.__stateHash = () => boundary.stateHash();
    winHooks.__seed = seed;

    // Real launch navigator — external-url → window.location.assign,
    // route → same-origin pushState. Wraps window.location so tests can
    // substitute a fake LaunchNavigator (tests don't talk to window).
    const launchNavigator: LaunchNavigator = {
      navigate(target: string): void {
        window.location.assign(target);
      }
    };

    // Single launch entry point. Both the keyboard-interact path (walk
    // haggis to door + Enter) and the touch-tap path (tap door on
    // mobile) call this — keeps the launch contract in one place.
    function launchDoorById(doorId: string): void {
      const game = getGameById(HUB_GAME_REGISTRY, doorId);
      if (game === undefined) return;
      const plan = createLaunchPlan(game);
      performLaunch(plan, launchNavigator);
    }

    // Keyboard path: when the haggis is at a launchable door AND
    // Enter/Space/E is pressed (edge-triggered).
    function maybeLaunchFromInteract(): void {
      if (!keyboard.consumeInteract()) return;
      const snapshot = room.lastSnapshot();
      if (snapshot.interactionKind !== 'launchable') return;
      const door = snapshot.doors[snapshot.interactionDoorIndex];
      if (door === undefined) return;
      launchDoorById(door.id);
    }

    // Pointer translation helper — canvas pixel coords → world coords.
    function pointerToWorld(event: PointerEvent): { x: number; y: number } {
      const snapshot = room.lastSnapshot();
      const rect = shell.canvas.getBoundingClientRect();
      const canvasX = ((event.clientX - rect.left) / rect.width) * shell.canvas.width;
      const canvasY = ((event.clientY - rect.top) / rect.height) * shell.canvas.height;
      return {
        x: (canvasX / shell.canvas.width) * snapshot.worldWidth,
        y: (canvasY / shell.canvas.height) * snapshot.worldHeight
      };
    }

    // Touch / mouse pointerdown: two semantics.
    //   1. If the press is INSIDE a launchable door's bounds → launch.
    //   2. Otherwise → begin pointer-drive walk: the haggis walks
    //      toward the pointer for as long as it's held down.
    shell.canvas.addEventListener('pointerdown', (event) => {
      dismissHint();
      const { x: worldX, y: worldY } = pointerToWorld(event);
      const snapshot = room.lastSnapshot();
      for (const door of snapshot.doors) {
        if (door.status !== 'launchable') continue;
        const { minX, minY, maxX, maxY } = door.bounds;
        if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
          launchDoorById(door.id);
          return;
        }
      }
      pointerActive = true;
      pointerWorldX = worldX;
      pointerWorldY = worldY;
      shell.canvas.setPointerCapture(event.pointerId);
    });

    // Pointer drag — update the walk target.
    shell.canvas.addEventListener('pointermove', (event) => {
      if (!pointerActive) return;
      const { x, y } = pointerToWorld(event);
      pointerWorldX = x;
      pointerWorldY = y;
    });

    // Release → stop walking. Both pointerup and pointercancel (touch
    // canceled by gesture) end the drive cleanly.
    const endPointer = (event: PointerEvent): void => {
      if (!pointerActive) return;
      pointerActive = false;
      if (shell.canvas.hasPointerCapture(event.pointerId)) {
        shell.canvas.releasePointerCapture(event.pointerId);
      }
    };
    shell.canvas.addEventListener('pointerup', endPointer);
    shell.canvas.addEventListener('pointercancel', endPointer);

    // First-time visitor hint: fade on first input OR after 6 seconds.
    // CSS handles the fade transition; we just toggle the class and
    // remove the element after the transition completes.
    let hintDismissed = false;
    function dismissHint(): void {
      if (hintDismissed) return;
      hintDismissed = true;
      shell.hint.classList.add('scene-hint--fading');
      window.setTimeout(() => shell.hint.remove(), 800);
    }
    window.addEventListener('keydown', dismissHint, { once: true });
    window.setTimeout(dismissHint, 6000);

    let stepState = INITIAL_FIXED_STEP_STATE;
    window.addEventListener('beforeunload', () => {
      const bytes = inputLog.finish(stepState.tick, boundary.stateHash());
      (window as unknown as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog = bytes;
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shell.status.textContent = 'reduced motion · the bothy bides quiet';
      return;
    }

    const config = { tickMs: 1000 / 60, maxTicksPerPump: 8 };
    let last = performance.now();
    const loop = (now: number): void => {
      const delta = now - last;
      last = now;
      const pumped = pumpFixedStep(config, stepState, delta);
      if (pumped.ticksToAdvance > 0) {
        const packed = samplePackedInput();
        inputLog.recordIfChanged(stepState.tick, packed);
        for (let i = 0; i < pumped.ticksToAdvance; i += 1) {
          room.tick(packed);
        }
        // Check interact AFTER tick so the snapshot is fresh — the
        // haggis may have moved into the door's interaction zone this
        // tick, and we want the same-frame Enter press to launch.
        maybeLaunchFromInteract();
      } else {
        // No tick advanced this frame but we still want animation (fire,
        // lanterns) to update — re-render the last snapshot.
        room.render();
      }
      stepState = pumped.state;
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  } catch (error: unknown) {
    shell.status.textContent = 'the bothy wouldnae load — try the corner link';
    console.error(error);
  }
}

interface SceneElements {
  readonly scene: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly status: HTMLElement;
  readonly hint: HTMLElement;
}

function createShell(model: ReturnType<typeof createAppModel>): SceneElements {
  const scene = document.createElement('section');
  scene.className = 'scene';
  scene.setAttribute('aria-label', 'ha.ggis hub bothy');

  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-label', model.projectName);
  canvas.setAttribute('role', 'img');
  sizeCanvasToViewport(canvas);
  window.addEventListener('resize', () => sizeCanvasToViewport(canvas), { passive: true });

  const direct = document.createElement('a');
  direct.className = 'scene-direct';
  direct.href = model.directPlay.target;
  direct.textContent = 'awa’ in →';
  direct.rel = 'noopener noreferrer';
  direct.setAttribute('aria-label', model.directPlay.label);

  const status = document.createElement('p');
  status.className = 'scene-status';
  status.setAttribute('role', 'status');

  // First-time hint — main.ts dismisses it on first input or after a
  // few seconds. Aria-hidden because screen readers should read the
  // `direct` link's aria-label instead, not this transient overlay.
  const hint = document.createElement('p');
  hint.className = 'scene-hint';
  hint.textContent = 'walk wi’ the arrows · chap a door tae go in';
  hint.setAttribute('aria-hidden', 'true');

  scene.append(canvas, direct, hint, status);
  return { scene, canvas, status, hint };
}

function sizeCanvasToViewport(canvas: HTMLCanvasElement): void {
  // Internal canvas resolution. The hub is a small intimate Highland
  // bothy, not a stadium — we lock the playfield to a 3:2 aspect ratio
  // (540×360) so any viewport wider than 3:2 gets letterboxed via CSS
  // (object-fit:contain) instead of stretching the room sideways. The
  // previous code adapted internal width to viewport aspect which gave
  // a billiard-table feel on widescreens.
  const w = 540;
  const h = 360;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
