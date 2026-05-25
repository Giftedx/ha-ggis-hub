import type { AppModel } from './app';

export interface SceneElements {
  readonly scene: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly status: HTMLElement;
  readonly hint: HTMLElement;
  readonly fallback: HTMLElement;
}

export function createShell(model: AppModel): SceneElements {
  const scene = document.createElement('section');
  scene.className = 'scene';
  scene.setAttribute('aria-label', 'ha.ggis hub bothy');

  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-label', model.projectName);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', 'scene-fallback-instructions');
  sizeCanvasToViewport(canvas);
  window.addEventListener('resize', () => { sizeCanvasToViewport(canvas); }, { passive: true });

  // Domain wordmark — makes the ha + ggis = haggis pun visible on the
  // page itself, not just in the browser tab or address bar.
  const brand = document.createElement('h1');
  brand.className = 'scene-brand';
  brand.textContent = 'ha · ggis';

  const direct = document.createElement('a');
  direct.className = 'scene-direct';
  direct.href = model.directPlay.target;
  direct.textContent = 'awa’ in →';
  direct.rel = 'noopener noreferrer';
  direct.setAttribute('aria-label', `awa’ in → — ${model.directPlay.label}`);

  const fallback = createFallbackHelp(model);

  const status = document.createElement('p');
  status.className = 'scene-status';
  status.setAttribute('role', 'status');

  // First-time hint — main.ts dismisses it on first input or after a
  // few seconds. Aria-hidden because the persistent fallback panel now
  // owns the semantic control instructions for assistive tech.
  const hint = document.createElement('p');
  hint.className = 'scene-hint';
  hint.textContent = 'walk wi’ arrows/WASD or drag · chap/tap a door';
  hint.setAttribute('aria-hidden', 'true');

  scene.append(canvas, brand, direct, fallback, hint, status);
  return { scene, canvas, status, hint, fallback };
}

function createFallbackHelp(model: AppModel): HTMLElement {
  const fallback = document.createElement('aside');
  fallback.className = 'scene-fallback';
  fallback.setAttribute('aria-labelledby', 'scene-fallback-title');

  const title = document.createElement('h2');
  title.id = 'scene-fallback-title';
  title.textContent = 'Bothy help';

  const instructions = document.createElement('p');
  instructions.id = 'scene-fallback-instructions';
  instructions.textContent = 'Walk wi’ arrows or WASD, then press Enter, Space, or E tae chap a door. On touch, drag tae walk or tap a door.';

  const directText = document.createElement('p');
  const link = document.createElement('a');
  link.href = model.directPlay.target;
  link.rel = 'noopener noreferrer';
  link.textContent = `Play ${model.directPlay.title} direct`;
  directText.append('No canvas controls? ', link, '.');

  fallback.append(title, instructions, directText);
  return fallback;
}

export function sizeCanvasToViewport(canvas: HTMLCanvasElement): void {
  // Internal canvas resolution. The hub is a small intimate Highland
  // bothy, not a stadium — we lock the playfield to a 3:2 aspect ratio
  // (540×360) so any viewport wider than 3:2 gets letterboxed via CSS
  // (object-fit:contain) instead of stretching the room sideways. The
  // previous code adapted internal width to viewport aspect which gave
  // a billiard-table feel on widescreens.
  const dpr = Math.round(window.devicePixelRatio || 1);
  const w = 540 * dpr;
  const h = 360 * dpr;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
