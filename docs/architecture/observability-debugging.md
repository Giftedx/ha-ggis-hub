# Observability and Debugging

Status: implemented (dev-mode overlay shipped 2026-05-24; production posture always-on)
Scope: diagnostics needed to keep the hub debuggable without polluting production
Related: [Testing strategy](testing-strategy.md), [Runtime boundaries](runtime-boundaries.md)

## Principle

A premium interactive app needs observability even if it has no backend.

## Development diagnostics

Dev-mode overlay: append `?debug` (or `?debug=1`) to any URL. The overlay (`src/debug/overlay.ts`) attaches a `<pre class="debug-overlay">` panel fixed to the top-right of the viewport. Updated every RAF frame. Pointer-events off so it never blocks interaction or door-tap.

Fields:

| Field | Source |
|-------|--------|
| FPS (30-frame rolling average) | `createFpsTracker` from `src/debug/overlay.ts` |
| Frame time (ms) | Current `delta` in the RAF loop |
| Tick | `stepState.tick` |
| Player X, Y (world coords) | `room.lastSnapshot().playerX/Y` |
| Active door interaction | `snapshot.interactionKind` + `snapshot.doors[snapshot.interactionDoorIndex].id` |
| WASM init time (ms) | `performance.now()` delta around `initializeHubBoundaryV2` |

The overlay is only activated when `?debug` is present in the URL. On production loads the conditional branch is never entered; the `createDebugOverlay` and `createFpsTracker` exports remain in the bundle (static import) but are never called.

## Production diagnostics

Production avoids noisy logs. User-facing failures show clean fallback UI with a direct-play link (`awa' in →`) so a player can always reach the game even when the bothy fails to load.

Wired in `src/main.ts`:

- WASM initialization failure → `shell.status.textContent = 'the bothy wouldnae load — try the corner link'`
- Renderer failure (null Canvas2D context) → `createCanvasRoomRenderer` throws `'Canvas2D context is unavailable'`, caught by the same try/catch
- Console error output in development for the caught exception (the stack trace is present; the status fallback is what the visitor sees)

Optional later:

- Privacy-conscious error reporting
- Build version/hash display in diagnostics panel
- Local export of debug snapshot/replay

## Debug invariants

Debug tools must not become required for normal play. A real visitor should understand the first slice without opening devtools.
