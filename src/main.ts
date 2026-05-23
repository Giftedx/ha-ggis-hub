import './style.css';
import { createAppModel } from './app/app';
import { createKeyboardInputSampler } from './engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from './engine/fixed-step';
import { InputLogWriter } from './engine/input-log';
import { createHubRoomController } from './hub/room';
import { createCanvasRoomRenderer } from './render/canvas-room';
import { initializeHubBoundaryV2 } from './wasm/boundary';
import { loadGeneratedHubWasm } from './wasm/generated-loader';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

void start(appRoot);

async function start(root: HTMLElement): Promise<void> {
  const model = createAppModel();
  const shell = createShell(model);
  root.replaceChildren(shell.scene);

  try {
    const seed = BigInt(Date.now());
    const boundary = await initializeHubBoundaryV2(loadGeneratedHubWasm, seed);
    const renderer = createCanvasRoomRenderer(shell.canvas, boundary.room);
    const keyboard = createKeyboardInputSampler(window);

    const inputLog = new InputLogWriter({
      seed,
      coreApiVersion: boundary.apiVersion,
      startedAtUtcMs: BigInt(Date.now()),
      initialStateHash: boundary.stateHash()
    });

    function samplePackedInput(): number {
      const v = keyboard.snapshot();
      let bits = 0;
      if (v.x > 0) bits |= 0b01;
      else if (v.x < 0) bits |= 0b10;
      if (v.y > 0) bits |= 0b01 << 2;
      else if (v.y < 0) bits |= 0b10 << 2;
      return bits;
    }

    const room = createHubRoomController({ boundary, renderer });
    room.render();
    shell.status.textContent = '';

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

  scene.append(canvas, direct, status);
  return { scene, canvas, status };
}

function sizeCanvasToViewport(canvas: HTMLCanvasElement): void {
  // Internal canvas resolution. 640×360 gives each procedural sprite
  // enough pixel headroom to read as a real character (haggis, doors,
  // fire) rather than a 6× mosaic of chunky blocks, while still scaling
  // cleanly to 1080p (3×) and 1440p (4×).
  const internalWidth = 640;
  const internalHeight = 360;
  // Adapt to viewport aspect ratio so we don't letterbox awkwardly.
  // Pick the closer of 16:9 or the viewport ratio, but stay near our
  // baseline so the per-pixel layout reads at any window.
  const aspect = window.innerWidth / window.innerHeight;
  const targetWidth = Math.round(internalHeight * aspect);
  const w = Math.max(internalWidth, targetWidth);
  const h = internalHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
