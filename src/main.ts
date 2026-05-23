import './style.css';
import { createAppModel } from './app/app';
import { createKeyboardInputSampler } from './engine/input';
import { INITIAL_FIXED_STEP_STATE, pumpFixedStep } from './engine/fixed-step';
import { InputLogWriter } from './engine/input-log';
import { createHubRoomController } from './hub/room';
import { createCanvasRoomRenderer } from './render/canvas-room';
import { initializeHubBoundaryV2 } from './wasm/boundary-v2';
import { loadGeneratedHubWasm } from './wasm/generated-loader';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

void start(appRoot);

async function start(root: HTMLElement): Promise<void> {
  const model = createAppModel();
  const shell = createShell(model);
  root.replaceChildren(shell.section);

  try {
    const seed = BigInt(Date.now());
    // Type seam: the existing generated-loader was typed for the OLD
    // generated bindings shape. Phase 6 deletes the old boundary and
    // retypes the loader; until then the cast is the one-line escape
    // hatch documented in the migration plan.
    const boundary = await initializeHubBoundaryV2(
      loadGeneratedHubWasm as unknown as () => Promise<any>,
      seed
    );
    const renderer = createCanvasRoomRenderer(shell.canvas, boundary.room);
    const keyboard = createKeyboardInputSampler(window);

    const inputLog = new InputLogWriter({
      seed,
      coreApiVersion: boundary.apiVersion,
      startedAtUtcMs: BigInt(Date.now()),
      initialStateHash: boundary.stateHash()
    });

    const input = {
      packedInput: (): number => {
        const v = keyboard.snapshot();
        let bits = 0;
        if (v.x > 0) bits |= 0b01;
        else if (v.x < 0) bits |= 0b10;
        if (v.y > 0) bits |= 0b01 << 2;
        else if (v.y < 0) bits |= 0b10 << 2;
        return bits;
      }
    };

    const room = createHubRoomController({ boundary, renderer, input });
    room.render();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shell.status.textContent =
        'Reduced motion is on: room animation is paused; direct play remains available.';
      return;
    }

    const config = { tickMs: 1000 / 60, maxTicksPerPump: 8 };
    let stepState = INITIAL_FIXED_STEP_STATE;
    let last = performance.now();
    const loop = (now: number): void => {
      const delta = now - last;
      last = now;
      const pumped = pumpFixedStep(config, stepState, delta);
      if (pumped.ticksToAdvance > 0) {
        const packed = input.packedInput();
        inputLog.recordIfChanged(stepState.tick, packed);
        for (let i = 0; i < pumped.ticksToAdvance; i += 1) {
          room.tick();
        }
      }
      stepState = pumped.state;
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);

    window.addEventListener('beforeunload', () => {
      const bytes = inputLog.finish(stepState.tick, boundary.stateHash());
      (window as unknown as { __lastHaggisLog?: Uint8Array }).__lastHaggisLog = bytes;
    });
  } catch (error: unknown) {
    shell.status.textContent = 'The playable room could not load. Direct play is still available below.';
    console.error(error);
  }
}

interface ShellElements {
  readonly section: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly status: HTMLElement;
}

function createShell(model: ReturnType<typeof createAppModel>): ShellElements {
  const shell = document.createElement('section');
  shell.className = 'shell';
  shell.setAttribute('aria-labelledby', 'project-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'say it without the dot';

  const title = document.createElement('h1');
  title.id = 'project-title';
  title.textContent = model.projectName;

  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = 'A tiny playable haggis bothy, driven by Rust/WASM state and rendered with Canvas2D.';

  const roomFrame = document.createElement('figure');
  roomFrame.className = 'room-frame';

  const canvas = document.createElement('canvas');
  canvas.className = 'room-canvas';
  canvas.width = 800;
  canvas.height = 500;
  canvas.setAttribute('aria-label', 'Playable haggis hub room. Use WASD or arrow keys to move.');
  canvas.setAttribute('role', 'img');

  const caption = document.createElement('figcaption');
  caption.textContent = 'Move with WASD or arrow keys. Walk to a glowing door, or use direct play.';

  roomFrame.append(canvas, caption);

  const directPlay = document.createElement('a');
  directPlay.className = 'direct-play';
  directPlay.href = model.directPlay.target;
  directPlay.textContent = model.directPlay.label;
  directPlay.setAttribute('aria-label', `${model.directPlay.label} from ha.ggis Hub`);
  directPlay.rel = 'noopener noreferrer';

  const status = document.createElement('p');
  status.className = 'runtime-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading playable room…';

  const facts = document.createElement('dl');
  facts.className = 'facts';
  facts.setAttribute('aria-label', 'Current project foundation state');

  const factEntries: ReadonlyArray<readonly [string, string]> = [
    ['Public target', model.publicUrl],
    ['Stack', model.stack],
    ['Phase', model.phase]
  ];

  for (const [label, value] of factEntries) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');

    term.textContent = label;
    description.textContent = value;

    row.append(term, description);
    facts.append(row);
  }

  shell.append(eyebrow, title, tagline, roomFrame, directPlay, status, facts);
  return { section: shell, canvas, status };
}
