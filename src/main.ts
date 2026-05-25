import './style.css';
import { createAppModel } from './app/app';
import { createDoorStatusAnnouncer } from './app/door-status';
import { createShell } from './app/shell';
import { createKeyboardInputSampler } from './engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from './engine/fixed-step';
import { InputLogWriter } from './engine/input-log';
import { createHubRoomController } from './hub/room';
import { createCanvasRoomRenderer, computeVisualDoorBounds } from './render/canvas-room';
import { createLaunchPlan, performLaunch, type LaunchNavigator } from './navigation/launch';
import { HUB_GAME_REGISTRY, getGameById, validateRoomRegistryCoherence } from './games/registry';
import { initializeHubBoundaryV2 } from './wasm/boundary';
import { loadGeneratedHubWasm } from './wasm/generated-loader';
import { createDebugOverlay, createFpsTracker } from './debug/overlay';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

void start(appRoot);

async function start(root: HTMLElement): Promise<void> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // createAppModel() may throw (e.g. missing registry entries in a broken build).
  // Guard it separately so failures before shell exists still log loudly, then bail.
  let model: ReturnType<typeof createAppModel>;
  try {
    model = createAppModel();
  } catch (error: unknown) {
    console.error(error);
    return;
  }
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
    const wasmInitStart = performance.now();
    const boundary = await initializeHubBoundaryV2(loadGeneratedHubWasm, seed);
    const roomRegistryErrors = validateRoomRegistryCoherence(boundary.room.doors, HUB_GAME_REGISTRY);
    if (roomRegistryErrors.length > 0) {
      throw new Error(`Room/registry mismatch: ${roomRegistryErrors.join('; ')}`);
    }
    const wasmInitMs = performance.now() - wasmInitStart;
    const canvasSurface = {
      get width() { return 540; },
      get height() { return 360; },
      getContext(kind: '2d') { return shell.canvas.getContext(kind); }
    };
    const fixedVisualGatePhase = new URLSearchParams(window.location.search).get('visualGatePhase');
    const parsedVisualGatePhase = fixedVisualGatePhase !== null && /^\d+(?:\.\d+)?$/.test(fixedVisualGatePhase)
      ? Number(fixedVisualGatePhase)
      : undefined;
    const fixedPhaseSeconds = parsedVisualGatePhase !== undefined &&
      Number.isFinite(parsedVisualGatePhase) && parsedVisualGatePhase >= 0 && parsedVisualGatePhase <= 86_400
      ? parsedVisualGatePhase
      : undefined;
    const renderer = createCanvasRoomRenderer(canvasSurface, boundary.room, { reducedMotion, fixedPhaseSeconds });
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
    const announceDoorStatus = createDoorStatusAnnouncer({
      status: shell.status,
      registry: HUB_GAME_REGISTRY,
      fallbackText: reducedMotion ? 'reduced motion · the bothy bides quiet' : ''
    });
    // Visual door bounds in logical canvas pixels (0–540 × 0–360) — computed once
    // because doors never move. Used by the tap-launch path so the tap zone is
    // pixel-identical to the painted door rather than the raw sim bounds (which differ
    // by ~10 px after snapDoorToWall shifts the door into the wall mass).
    const logicalSurface = { width: 540, height: 360 } as const;
    const visualDoorBounds = computeVisualDoorBounds(logicalSurface, boundary.room);
    room.render();
    announceDoorStatus(room.lastSnapshot());
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

    // Launch navigator — always uses location.assign today. Route targets
    // will need pushState + lifecycle host wiring when WHS mounts in-repo.
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
      if (game === undefined) {
        shell.status.textContent = 'that door leads nowhere yet';
        return;
      }
      const plan = createLaunchPlan(game);
      if (plan.kind !== 'launchable') {
        const title = plan.kind === 'unavailable' ? plan.title : game.title;
        shell.status.textContent = `${title} door — comin’ soon.`;
        return;
      }
      performLaunch(plan, launchNavigator);
    }

    /** Matches hub_core::sim::InputSnapshot interact bit (bit 4). */
    const INTERACT_BIT = 0b1_0000;

    // Keyboard path: when the haggis is at a launchable door AND
    // Enter/Space/E is pressed (edge-triggered).
    function maybeLaunchFromInteract(packedMovement: number, tick: number): void {
      if (!keyboard.consumeInteract()) return;
      inputLog.recordIfChanged(tick, packedMovement | INTERACT_BIT);
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
    //   1. If the press is INSIDE a launchable door's visual bounds → launch.
    //      Tap check uses logical canvas coords (0–540 × 0–360) matched against
    //      computeVisualDoorBounds so the tap zone is pixel-identical to the
    //      painted door, not the raw sim bounds (which differ after snapDoorToWall).
    //   2. Otherwise → begin pointer-drive walk: the haggis walks
    //      toward the pointer for as long as it's held down.
    shell.canvas.addEventListener('pointerdown', (event) => {
      const rect = shell.canvas.getBoundingClientRect();
      const dpr = Math.round(window.devicePixelRatio || 1);
      const logicalX = ((event.clientX - rect.left) / rect.width) * (shell.canvas.width / dpr);
      const logicalY = ((event.clientY - rect.top) / rect.height) * (shell.canvas.height / dpr);
      const snapshot = room.lastSnapshot();
      for (const vb of visualDoorBounds) {
        const doorSnap = snapshot.doors.find((d) => d.id === vb.id);
        if (doorSnap?.status !== 'launchable') continue;
        if (logicalX >= vb.x && logicalX <= vb.x + vb.width &&
            logicalY >= vb.y && logicalY <= vb.y + vb.height) {
          launchDoorById(vb.id);
          return;
        }
      }
      const { x: worldX, y: worldY } = pointerToWorld(event);
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

    let stepState = INITIAL_FIXED_STEP_STATE;
    window.addEventListener('beforeunload', () => {
      const bytes = inputLog.finish(stepState.tick, boundary.stateHash());
      (window as unknown as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog = bytes;
    });

    const debugMode = new URLSearchParams(window.location.search).has('debug');
    const overlay = debugMode ? createDebugOverlay(shell.scene) : null;
    const fpsTracker = debugMode ? createFpsTracker(30) : null;

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
        maybeLaunchFromInteract(packed, stepState.tick);
      } else {
        // No tick advanced this frame but we still want animation (fire,
        // lanterns) to update — re-render the last snapshot.
        room.render();
      }
      stepState = pumped.state;
      announceDoorStatus(room.lastSnapshot());
      if (overlay !== null && fpsTracker !== null) {
        const snapshot = room.lastSnapshot();
        const { fps, frameMs } = fpsTracker.record(delta);
        overlay.update({
          fps, frameMs,
          tick: stepState.tick,
          playerX: snapshot.playerX,
          playerY: snapshot.playerY,
          interactionKind: snapshot.interactionKind,
          interactionDoorId: snapshot.interactionKind !== 'none'
            ? (snapshot.doors[snapshot.interactionDoorIndex]?.id ?? null)
            : null,
          wasmInitMs,
        });
      }
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);

    // Returning from a background tab leaves a huge delta in the accumulator
    // (e.g. 5 min hidden = 17,997 uncapped ticks, only 8 pump but ~300s carry).
    // Reset both the frame timer and accumulator so the first post-return
    // frame sees delta ~0 and the sim does not burst at max ticks/frame.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        last = performance.now();
        stepState = { tick: stepState.tick, accumulatorMs: 0 };
      }
    });
  } catch (error: unknown) {
    shell.status.textContent = 'the bothy wouldnae load — try the corner link';
    console.error(error);
  }
}
