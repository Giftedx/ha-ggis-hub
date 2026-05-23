import './style.css';
import { createAppModel } from './app/app';
import { createKeyboardInputSampler } from './engine/input';
import { createHubRoomController, DEFAULT_HUB_ROOM_DOORS } from './hub/room';
import { createCanvasRoomRenderer } from './render/canvas-room';
import { initializeHubCore } from './wasm/boundary';
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
    const core = await initializeHubCore(loadGeneratedHubWasm);
    const renderer = createCanvasRoomRenderer(shell.canvas);
    const input = createKeyboardInputSampler(window);
    const room = createHubRoomController({
      world: core.world,
      doors: DEFAULT_HUB_ROOM_DOORS,
      renderer,
      input,
      initialPlayer: { x: 500, y: 500, halfExtent: 80, speedPerTick: 18 }
    });

    room.render();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shell.status.textContent = 'Reduced motion is on: room animation is paused; direct play remains available.';
      return;
    }

    const animate = (): void => {
      room.tick();
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
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
