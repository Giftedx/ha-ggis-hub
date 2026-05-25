import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShell, sizeCanvasToViewport } from './shell';
import type { AppModel } from './app';

class FakeElement {
  readonly children: Array<FakeElement | string> = [];
  readonly attributes = new Map<string, string>();
  className = '';
  id = '';
  textContent = '';
  href = '';
  rel = '';
  width = 0;
  height = 0;

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: Array<FakeElement | string>): void {
    for (const node of nodes) {
      this.children.push(node);
      if (typeof node === 'string') {
        this.textContent += node;
      }
    }
  }
}

const MODEL: AppModel = {
  projectName: 'ha.ggis Hub',
  directPlay: {
    label: 'Play Wild Haggis Survivors',
    target: 'https://wild-haggis-survivors.pages.dev/',
    title: 'Wild Haggis Survivors'
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDom(devicePixelRatio = 1): { created: FakeElement[]; resizeListeners: EventListenerOrEventListenerObject[] } {
  const created: FakeElement[] = [];
  const resizeListeners: EventListenerOrEventListenerObject[] = [];
  vi.stubGlobal('document', {
    createElement(tag: string): FakeElement {
      const el = new FakeElement(tag);
      created.push(el);
      return el;
    }
  });
  vi.stubGlobal('window', {
    devicePixelRatio,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (type === 'resize') resizeListeners.push(listener);
    }
  });
  return { created, resizeListeners };
}

function childWithClass(parent: FakeElement, className: string): FakeElement {
  const found = parent.children.find((child) => child instanceof FakeElement && child.className === className);
  expect(found).toBeInstanceOf(FakeElement);
  return found as FakeElement;
}

function childByTag(parent: FakeElement, tagName: string): FakeElement {
  const found = parent.children.find((child) => child instanceof FakeElement && child.tagName === tagName);
  expect(found).toBeInstanceOf(FakeElement);
  return found as FakeElement;
}

function recursiveText(node: FakeElement): string {
  return [node.textContent, ...node.children.map((child) => (
    typeof child === 'string' ? child : recursiveText(child)
  ))].join(' ');
}

describe('createShell', () => {
  it('creates the playable scene shell with a named canvas and direct-play link', () => {
    const { resizeListeners } = stubDom();

    const shell = createShell(MODEL) as unknown as { scene: FakeElement; canvas: FakeElement; status: FakeElement };

    expect(shell.scene.tagName).toBe('section');
    expect(shell.scene.className).toBe('scene');
    expect(shell.scene.getAttribute('aria-label')).toBe('ha.ggis hub bothy');
    expect(shell.canvas.className).toBe('scene-canvas');
    expect(shell.canvas.getAttribute('role')).toBe('img');
    expect(shell.canvas.getAttribute('aria-label')).toBe('ha.ggis Hub');
    expect(shell.canvas.getAttribute('aria-describedby')).toBe('scene-fallback-instructions');
    expect(shell.canvas.width).toBe(540);
    expect(shell.canvas.height).toBe(360);
    expect(resizeListeners).toHaveLength(1);

    const direct = childWithClass(shell.scene, 'scene-direct');
    expect(direct.href).toBe('https://wild-haggis-survivors.pages.dev/');
    expect(direct.rel).toBe('noopener noreferrer');
    expect(direct.textContent).toBe('awa’ in →');
    expect(direct.getAttribute('aria-label')).toBe('awa’ in → — Play Wild Haggis Survivors');

    expect(shell.status.getAttribute('role')).toBe('status');
  });

  it('exposes persistent semantic fallback instructions and a direct game link', () => {
    stubDom();

    const shell = createShell(MODEL) as unknown as { scene: FakeElement; fallback: FakeElement };
    const fallback = childWithClass(shell.scene, 'scene-fallback');
    expect(shell.fallback).toBe(fallback);
    expect(fallback.tagName).toBe('aside');
    expect(fallback.getAttribute('aria-hidden')).toBeNull();
    expect(fallback.getAttribute('aria-labelledby')).toBe('scene-fallback-title');

    const heading = childByTag(fallback, 'h2');
    expect(heading.id).toBe('scene-fallback-title');
    expect(heading.textContent).toBe('Bothy help');

    const text = recursiveText(fallback);
    expect(text).toContain('arrows');
    expect(text).toContain('WASD');
    expect(text).toContain('Enter');
    expect(text).toContain('Space');
    expect(text).toContain('chap a door');
    expect(text).toContain('No canvas controls?');

    const directParagraph = fallback.children.filter((child) => child instanceof FakeElement && child.tagName === 'p')[1] as FakeElement;
    const link = childByTag(directParagraph, 'a');
    expect(link.href).toBe('https://wild-haggis-survivors.pages.dev/');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.textContent).toBe('Play Wild Haggis Survivors direct');
    expect(link.getAttribute('aria-label')).toBeNull();
  });
});

describe('sizeCanvasToViewport', () => {
  it('locks the internal canvas resolution to the 3:2 playfield scaled by DPR', () => {
    stubDom(2);
    const canvas = new FakeElement('canvas') as unknown as HTMLCanvasElement;

    sizeCanvasToViewport(canvas);

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(720);
  });
});
