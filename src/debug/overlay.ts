// Dev-only diagnostics overlay. Mounted when the page is loaded with
// `?debug=1` (or `?debug`). Never affects production bundles — the
// createDebugOverlay export is tree-shakeable and only called from the
// conditional branch in main.ts.

export interface DebugStats {
  readonly fps: number;
  readonly frameMs: number;
  readonly tick: number;
  readonly playerX: number;
  readonly playerY: number;
  readonly interactionKind: 'none' | 'launchable' | 'locked';
  readonly interactionDoorId: string | null;
  readonly wasmInitMs: number;
}

export interface DebugOverlay {
  update(stats: DebugStats): void;
  destroy(): void;
}

export function createDebugOverlay(container: HTMLElement): DebugOverlay {
  const el = document.createElement('pre');
  el.className = 'debug-overlay';
  container.appendChild(el);

  return {
    update(stats: DebugStats): void {
      el.textContent = formatStats(stats);
    },
    destroy(): void {
      el.remove();
    },
  };
}

// Rolling FPS tracker. Keeps a sliding window of the last `windowSize`
// frame deltas and returns the mean FPS + current frame time each record.
export function createFpsTracker(windowSize = 30): {
  record(deltaMs: number): { fps: number; frameMs: number };
} {
  const buf: number[] = [];
  return {
    record(deltaMs: number): { fps: number; frameMs: number } {
      buf.push(deltaMs);
      if (buf.length > windowSize) buf.shift();
      const sum = buf.reduce((a, b) => a + b, 0);
      const avg = sum / buf.length;
      return { fps: avg > 0 ? 1000 / avg : 0, frameMs: deltaMs };
    },
  };
}

export function formatStats(s: DebugStats): string {
  const fps = s.fps.toFixed(0).padStart(3);
  const ms = s.frameMs.toFixed(1).padStart(5);
  const px = Math.round(s.playerX).toString().padStart(4);
  const py = Math.round(s.playerY).toString().padStart(4);
  const door =
    s.interactionKind === 'none'
      ? 'none'
      : `${s.interactionKind}${s.interactionDoorId ? ` [${s.interactionDoorId}]` : ''}`;
  const wasm = s.wasmInitMs > 0 ? ` (wasm init ${s.wasmInitMs.toFixed(0)}ms)` : '';
  return [
    `FPS  ${fps}   frame ${ms} ms${wasm}`,
    `tick ${s.tick}`,
    `pos  ${px}, ${py}`,
    `door ${door}`,
  ].join('\n');
}
