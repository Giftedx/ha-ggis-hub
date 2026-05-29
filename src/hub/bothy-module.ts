import type { SceneElements } from '../app/shell';
import { createDoorStatusAnnouncer } from '../app/door-status';
import { createKeyboardInputSampler } from '../engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from '../engine/fixed-step';
import type { GameInstance, GameModule, GameMountOptions } from '../engine/game-module';
import { InputLogWriter } from '../engine/input-log';
import { HUB_GAME_REGISTRY, getGameById, validateRoomRegistryCoherence } from '../games/registry';
import { chapRetortAt } from './chap';
import { createHubRoomController } from './room';
import { createLaunchPlan, performLaunch } from '../navigation/launch';
import { createBrowserLaunchNavigator } from '../navigation/browser-navigator';
import { createCanvasRoomRenderer, computeVisualDoorBounds } from '../render/canvas-room';
import { initializeHubBoundaryV2 } from '../wasm/boundary';
import { loadGeneratedHubWasm } from '../wasm/generated-loader';
import { createDebugOverlay, createFpsTracker } from '../debug/overlay';

export const HUB_BOTHY_GAME_ID = 'hub-bothy';

/** Matches hub_core::sim::InputSnapshot interact bit (bit 4). */
const INTERACT_BIT = 0b1_0000;

const POINTER_DEADZONE = 18;

export function createBothyGameModule(shell: SceneElements): GameModule {
  return {
    id: HUB_BOTHY_GAME_ID,
    title: 'ha.ggis Hub',
    async mount(_target: HTMLElement, options: GameMountOptions): Promise<GameInstance> {
      const seedParam = new URLSearchParams(window.location.search).get('seed');
      const seed =
        seedParam !== null && /^\d+$/.test(seedParam) ? BigInt(seedParam) : BigInt(Date.now());

      const wasmInitStart = performance.now();
      const boundary = await initializeHubBoundaryV2(loadGeneratedHubWasm, seed);
      const roomRegistryErrors = validateRoomRegistryCoherence(
        boundary.room.doors,
        HUB_GAME_REGISTRY
      );
      if (roomRegistryErrors.length > 0) {
        boundary.destroy();
        throw new Error(`Room/registry mismatch: ${roomRegistryErrors.join('; ')}`);
      }
      const wasmInitMs = performance.now() - wasmInitStart;

      const canvasSurface = {
        get width() {
          return 540;
        },
        get height() {
          return 360;
        },
        /* v8 ignore next — called by canvas-room.ts internals; mocked at createCanvasRoomRenderer boundary in tests */
        getContext(kind: '2d') {
          return shell.canvas.getContext(kind);
        },
      };

      const fixedVisualGatePhase = new URLSearchParams(window.location.search).get(
        'visualGatePhase'
      );
      const parsedVisualGatePhase =
        fixedVisualGatePhase !== null && /^\d+(?:\.\d+)?$/.test(fixedVisualGatePhase)
          ? Number(fixedVisualGatePhase)
          : undefined;
      const fixedPhaseSeconds =
        parsedVisualGatePhase !== undefined &&
        Number.isFinite(parsedVisualGatePhase) &&
        parsedVisualGatePhase >= 0 &&
        parsedVisualGatePhase <= 86_400
          ? parsedVisualGatePhase
          : undefined;

      const renderer = createCanvasRoomRenderer(canvasSurface, boundary.room, {
        reducedMotion: options.reducedMotion,
        fixedPhaseSeconds,
      });
      const keyboard = createKeyboardInputSampler(window);
      const inputLog = new InputLogWriter({
        seed,
        coreApiVersion: boundary.apiVersion,
        startedAtUtcMs: BigInt(Date.now()),
        initialStateHash: boundary.stateHash(),
      });

      let pointerActive = false;
      let pointerWorldX = 0;
      let pointerWorldY = 0;
      let chapCount = 0;
      let paused = false;
      let rafId = 0;
      let firstFrameRafId = 0;
      let destroyed = false;

      const room = createHubRoomController({ boundary, renderer });
      const announceDoorStatus = createDoorStatusAnnouncer({
        status: shell.status,
        registry: HUB_GAME_REGISTRY,
        fallbackText: options.reducedMotion ? 'reduced motion · the bothy bides quiet' : '',
      });

      const logicalSurface = { width: 540, height: 360 } as const;
      const visualDoorBounds = computeVisualDoorBounds(logicalSurface, boundary.room);
      const launchNavigator = createBrowserLaunchNavigator();

      function samplePackedInput(): number {
        const v = keyboard.snapshot();
        let bits = 0;
        if (v.x !== 0 || v.y !== 0) {
          if (v.x > 0) bits |= 0b01;
          else if (v.x < 0) bits |= 0b10;
          if (v.y > 0) bits |= 0b01 << 2;
          else if (v.y < 0) bits |= 0b10 << 2;
        } else if (pointerActive) {
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
        if (keyboard.interactHeld()) {
          bits |= INTERACT_BIT;
        }
        return bits;
      }

      function launchDoorById(doorId: string): void {
        const game = getGameById(HUB_GAME_REGISTRY, doorId);
        if (game === undefined) {
          shell.status.textContent = 'that door leads nowhere yet';
          return;
        }
        const plan = createLaunchPlan(game);
        if (plan.kind !== 'launchable') {
          /* v8 ignore next — createLaunchPlan only returns launchable|unavailable; game.title fallback is unreachable */
          const title = plan.kind === 'unavailable' ? plan.title : game.title;
          shell.status.textContent = `${title} door — comin’ soon.`;
          return;
        }
        performLaunch(plan, launchNavigator);
      }

      // Answer a chap on the coming-soon door. The hint banner trains every
      // visitor to "chap a door tae go in"; the locked door must respond to
      // that verb, not sit silent. Rotates a Scots retort through the status
      // line (visible + screen-reader) and the over-door canvas sign.
      function chapLockedDoor(): void {
        const retort = chapRetortAt(chapCount);
        chapCount += 1;
        shell.status.textContent = retort.spoken;
        renderer.notifyChap(retort.sign);
      }

      function maybeLaunchFromInteract(): void {
        if (!keyboard.consumeInteract()) return;
        const snapshot = room.lastSnapshot();
        const door = snapshot.doors[snapshot.interactionDoorIndex];
        if (door === undefined) return;
        if (snapshot.interactionKind === 'launchable') {
          launchDoorById(door.id);
        } else if (snapshot.interactionKind === 'locked') {
          chapLockedDoor();
        }
      }

      function pointerToWorld(event: PointerEvent): { x: number; y: number } {
        const snapshot = room.lastSnapshot();
        const rect = shell.canvas.getBoundingClientRect();
        return {
          x: ((event.clientX - rect.left) / rect.width) * snapshot.worldWidth,
          y: ((event.clientY - rect.top) / rect.height) * snapshot.worldHeight,
        };
      }

      const onPointerDown = (event: PointerEvent): void => {
        const rect = shell.canvas.getBoundingClientRect();
        /* v8 ignore next — devicePixelRatio is always ≥1 in browser and test stubs */
        const dpr = Math.round(window.devicePixelRatio || 1);
        const logicalX = ((event.clientX - rect.left) / rect.width) * (shell.canvas.width / dpr);
        const logicalY = ((event.clientY - rect.top) / rect.height) * (shell.canvas.height / dpr);
        const snapshot = room.lastSnapshot();
        for (const vb of visualDoorBounds) {
          const doorSnap = snapshot.doors.find((d) => d.id === vb.id);
          /* v8 ignore next — visualDoorBounds always mirrors snapshot doors; registry coherence is validated at mount */
          if (doorSnap === undefined) continue;
          if (
            logicalX >= vb.x &&
            logicalX <= vb.x + vb.width &&
            logicalY >= vb.y &&
            logicalY <= vb.y + vb.height
          ) {
            if (doorSnap.status === 'launchable') {
              launchDoorById(vb.id);
            } else {
              chapLockedDoor();
            }
            return;
          }
        }
        const { x: worldX, y: worldY } = pointerToWorld(event);
        pointerActive = true;
        pointerWorldX = worldX;
        pointerWorldY = worldY;
        shell.canvas.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent): void => {
        if (!pointerActive) return;
        const { x, y } = pointerToWorld(event);
        pointerWorldX = x;
        pointerWorldY = y;
      };

      const endPointer = (event: PointerEvent): void => {
        if (!pointerActive) return;
        pointerActive = false;
        if (shell.canvas.hasPointerCapture(event.pointerId)) {
          shell.canvas.releasePointerCapture(event.pointerId);
        }
      };

      const onBeforeUnload = (): void => {
        const bytes = inputLog.finish(stepState.tick, boundary.stateHash());
        (window as unknown as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog = bytes;
      };

      shell.canvas.addEventListener('pointerdown', onPointerDown);
      shell.canvas.addEventListener('pointermove', onPointerMove);
      shell.canvas.addEventListener('pointerup', endPointer);
      shell.canvas.addEventListener('pointercancel', endPointer);
      window.addEventListener('beforeunload', onBeforeUnload);

      room.render();
      announceDoorStatus(room.lastSnapshot());
      firstFrameRafId = requestAnimationFrame(() => {
        performance.mark('hub:firstFrame');
      });

      const winHooks = window as unknown as {
        __roomSnapshot?: () => unknown;
        __stateHash?: () => bigint;
        __seed?: bigint;
      };
      /* v8 ignore start — browser-only dev hooks; called by smoke-determinism.mjs, not unit tests */
      winHooks.__roomSnapshot = () => room.lastSnapshot();
      winHooks.__stateHash = () => boundary.stateHash();
      /* v8 ignore stop */
      winHooks.__seed = seed;

      const debugMode = new URLSearchParams(window.location.search).has('debug');
      const overlay = debugMode ? createDebugOverlay(shell.scene) : null;
      const fpsTracker = debugMode ? createFpsTracker(30) : null;

      const config = { tickMs: 1000 / 60, maxTicksPerPump: 8 };
      let stepState = INITIAL_FIXED_STEP_STATE;
      let last = performance.now();

      const onVisibilityChange = (): void => {
        if (document.visibilityState === 'visible') {
          last = performance.now();
          stepState = { tick: stepState.tick, accumulatorMs: 0 };
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      const loop = (now: number): void => {
        if (destroyed) return;
        rafId = window.requestAnimationFrame(loop);
        const delta = now - last;
        last = now;
        const pumped = pumpFixedStep(config, stepState, delta);
        if (!paused && pumped.ticksToAdvance > 0) {
          const packed = samplePackedInput();
          inputLog.recordIfChanged(stepState.tick, packed);
          for (let i = 0; i < pumped.ticksToAdvance; i += 1) {
            room.tick(packed);
          }
          maybeLaunchFromInteract();
        }
        room.render();
        stepState = pumped.state;
        announceDoorStatus(room.lastSnapshot());
        if (overlay !== null && fpsTracker !== null) {
          const snapshot = room.lastSnapshot();
          const { fps, frameMs } = fpsTracker.record(delta);
          overlay.update({
            fps,
            frameMs,
            tick: stepState.tick,
            playerX: snapshot.playerX,
            playerY: snapshot.playerY,
            interactionKind: snapshot.interactionKind,
            interactionDoorId:
              snapshot.interactionKind !== 'none'
                ? (snapshot.doors[snapshot.interactionDoorIndex]?.id ?? null)
                : null,
            wasmInitMs,
          });
        }
      };
      rafId = window.requestAnimationFrame(loop);

      return {
        pause(): void {
          paused = true;
        },
        resume(): void {
          paused = false;
          last = performance.now();
        },
        destroy(): void {
          if (destroyed) return;
          destroyed = true;
          window.cancelAnimationFrame(rafId);
          window.cancelAnimationFrame(firstFrameRafId);
          shell.canvas.removeEventListener('pointerdown', onPointerDown);
          shell.canvas.removeEventListener('pointermove', onPointerMove);
          shell.canvas.removeEventListener('pointerup', endPointer);
          shell.canvas.removeEventListener('pointercancel', endPointer);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          window.removeEventListener('beforeunload', onBeforeUnload);
          keyboard.destroy();
          room.destroy();
          delete winHooks.__roomSnapshot;
          delete winHooks.__stateHash;
          delete winHooks.__seed;
          overlay?.destroy();
        },
      };
    },
  };
}
