import type { SceneElements } from '../app/shell';
import { createDoorStatusAnnouncer } from '../app/door-status';
import { createKeyboardInputSampler } from '../engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from '../engine/fixed-step';
import type { GameInstance, GameModule, GameMountOptions } from '../engine/game-module';
import { InputLogWriter } from '../engine/input-log';
import { HUB_GAME_REGISTRY, validateRoomRegistryCoherence } from '../games/registry';
import { createHubRoomController } from './room';
import { performLaunch } from '../navigation/launch';
import { createBrowserLaunchNavigator } from '../navigation/browser-navigator';
import { createCanvasRoomRenderer, computeVisualDoorBounds } from '../render/canvas-room';
import { initializeHubBoundaryV2 } from '../wasm/boundary';
import { loadGeneratedHubWasm } from '../wasm/generated-loader';
import { createDebugOverlay, createFpsTracker } from '../debug/overlay';
import {
  asEventListener,
  createDomListenerBag,
  finishPointerCapture,
  launchStatusForDoor,
  logicalCanvasPoint,
  packInputForTick,
  parseFixedVisualGatePhase,
  parseSeedFromSearch,
  worldPointFromClient
} from './bothy-runtime';

export const HUB_BOTHY_GAME_ID = 'hub-bothy';

export function createBothyGameModule(shell: SceneElements): GameModule {
  return {
    id: HUB_BOTHY_GAME_ID,
    title: 'ha.ggis Hub',
    async mount(_target: HTMLElement, options: GameMountOptions): Promise<GameInstance> {
      const seed = parseSeedFromSearch(window.location.search, Date.now());

      const wasmInitStart = performance.now();
      const boundary = await initializeHubBoundaryV2(loadGeneratedHubWasm, seed);
      const roomRegistryErrors = validateRoomRegistryCoherence(boundary.room.doors, HUB_GAME_REGISTRY);
      if (roomRegistryErrors.length > 0) {
        boundary.destroy();
        throw new Error(`Room/registry mismatch: ${roomRegistryErrors.join('; ')}`);
      }
      const wasmInitMs = performance.now() - wasmInitStart;

      const canvasSurface = {
        get width() { return 540; },
        get height() { return 360; },
        getContext(kind: '2d') { return shell.canvas.getContext(kind); }
      };

      const fixedPhaseSeconds = parseFixedVisualGatePhase(window.location.search);

      const renderer = createCanvasRoomRenderer(canvasSurface, boundary.room, {
        reducedMotion: options.reducedMotion,
        fixedPhaseSeconds
      });
      const keyboard = createKeyboardInputSampler(window);
      const inputLog = new InputLogWriter({
        seed,
        coreApiVersion: boundary.apiVersion,
        startedAtUtcMs: BigInt(Date.now()),
        initialStateHash: boundary.stateHash()
      });

      let pointerActive = false;
      let pointerWorldX = 0;
      let pointerWorldY = 0;
      let paused = false;
      let rafId = 0;
      let destroyed = false;
      const listenerBag = createDomListenerBag();

      const room = createHubRoomController({ boundary, renderer });
      const announceDoorStatus = createDoorStatusAnnouncer({
        status: shell.status,
        registry: HUB_GAME_REGISTRY,
        fallbackText: options.reducedMotion ? 'reduced motion · the bothy bides quiet' : ''
      });

      const logicalSurface = { width: 540, height: 360 } as const;
      const visualDoorBounds = computeVisualDoorBounds(logicalSurface, boundary.room);
      const launchNavigator = createBrowserLaunchNavigator();

      function samplePackedInput(): number {
        const snapshot = room.lastSnapshot();
        return packInputForTick({
          keyboardVector: keyboard.snapshot(),
          keyboardInteractHeld: keyboard.interactHeld(),
          pointer: {
            active: pointerActive,
            targetX: pointerWorldX,
            targetY: pointerWorldY,
            playerX: snapshot.playerX,
            playerY: snapshot.playerY
          }
        });
      }

      function launchDoorById(doorId: string): void {
        const launchStatus = launchStatusForDoor(doorId, HUB_GAME_REGISTRY);
        if (launchStatus.kind !== 'launchable') {
          shell.status.textContent = launchStatus.statusText;
          return;
        }
        performLaunch(launchStatus.plan, launchNavigator);
      }

      function maybeLaunchFromInteract(): void {
        if (!keyboard.consumeInteract()) return;
        const snapshot = room.lastSnapshot();
        if (snapshot.interactionKind !== 'launchable') return;
        const door = snapshot.doors[snapshot.interactionDoorIndex];
        if (door === undefined) return;
        launchDoorById(door.id);
      }

      function pointerToWorld(event: PointerEvent): { x: number; y: number } {
        const snapshot = room.lastSnapshot();
        const rect = shell.canvas.getBoundingClientRect();
        return worldPointFromClient({
          clientX: event.clientX,
          clientY: event.clientY,
          rect,
          canvasWidth: shell.canvas.width,
          canvasHeight: shell.canvas.height,
          worldWidth: snapshot.worldWidth,
          worldHeight: snapshot.worldHeight
        });
      }

      const onPointerDown = (pointerEvent: PointerEvent): void => {
        const rect = shell.canvas.getBoundingClientRect();
        const { x: logicalX, y: logicalY } = logicalCanvasPoint({
          clientX: pointerEvent.clientX,
          clientY: pointerEvent.clientY,
          rect,
          canvasWidth: shell.canvas.width,
          canvasHeight: shell.canvas.height,
          devicePixelRatio: window.devicePixelRatio
        });
        const snapshot = room.lastSnapshot();
        for (const vb of visualDoorBounds) {
          const doorSnap = snapshot.doors.find((d) => d.id === vb.id);
          if (doorSnap === undefined) continue;
          if (logicalX >= vb.x && logicalX <= vb.x + vb.width &&
              logicalY >= vb.y && logicalY <= vb.y + vb.height) {
            if (doorSnap.status === 'launchable') {
              launchDoorById(vb.id);
            } else {
              const launchStatus = launchStatusForDoor(vb.id, HUB_GAME_REGISTRY);
              shell.status.textContent = launchStatus.kind === 'launchable'
                ? `${launchStatus.plan.title} door \u2014 comin\u2019 soon.`
                : launchStatus.statusText;
            }
            return;
          }
        }
        const { x: worldX, y: worldY } = pointerToWorld(pointerEvent);
        pointerActive = true;
        pointerWorldX = worldX;
        pointerWorldY = worldY;
        shell.canvas.setPointerCapture(pointerEvent.pointerId);
      };

      const onPointerMove = (event: PointerEvent): void => {
        if (!pointerActive) return;
        const { x, y } = pointerToWorld(event);
        pointerWorldX = x;
        pointerWorldY = y;
      };

      const endPointer = (event: PointerEvent): void => {
        pointerActive = finishPointerCapture({
          pointerActive,
          pointerId: event.pointerId,
          target: shell.canvas
        });
      };

      const onBeforeUnload = (): void => {
        const bytes = inputLog.finish(stepState.tick, boundary.stateHash());
        (window as unknown as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog = bytes;
      };

      listenerBag.add(shell.canvas, 'pointerdown', asEventListener((event) => {
        onPointerDown(event as PointerEvent);
      }));
      listenerBag.add(shell.canvas, 'pointermove', asEventListener((event) => {
        onPointerMove(event as PointerEvent);
      }));
      listenerBag.add(shell.canvas, 'pointerup', asEventListener((event) => {
        endPointer(event as PointerEvent);
      }));
      listenerBag.add(shell.canvas, 'pointercancel', asEventListener((event) => {
        endPointer(event as PointerEvent);
      }));
      listenerBag.add(window, 'beforeunload', onBeforeUnload);

      room.render();
      announceDoorStatus(room.lastSnapshot());
      requestAnimationFrame(() => {
        performance.mark('hub:firstFrame');
      });

      const winHooks = window as unknown as {
        __roomSnapshot?: () => unknown;
        __stateHash?: () => bigint;
        __seed?: bigint;
      };
      winHooks.__roomSnapshot = () => room.lastSnapshot();
      winHooks.__stateHash = () => boundary.stateHash();
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
      listenerBag.add(document, 'visibilitychange', onVisibilityChange);

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
        } else {
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
            wasmInitMs
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
          listenerBag.removeAll();
          keyboard.destroy();
          room.destroy();
          delete winHooks.__roomSnapshot;
          delete winHooks.__stateHash;
          delete winHooks.__seed;
          overlay?.destroy();
        }
      };
    }
  };
}
