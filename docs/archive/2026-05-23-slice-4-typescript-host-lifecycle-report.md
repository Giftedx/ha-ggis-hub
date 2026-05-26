# 2026-05-23 Slice 4 TypeScript host lifecycle report

> **Archived 2026-05-23.** Per-slice audit reports are superseded by the `haggis-eval` FNV-signed tamper-evident JSON reports under `target/haggis-eval/` (see [tools/haggis-eval/README.md](../../tools/haggis-eval/README.md)). Preserved for provenance.

Status: current implementation report
Scope: Slice 4 TypeScript host game-module contract, lifecycle host, keyboard input sampling, registry mapping, direct-play launch planning, and minimal app-shell direct play surface
Related: [Implementation sequence](../plans/2026-05-22-implementation-sequence.md), [Quality gates](../foundation/07-quality-gates.md), [Runtime boundaries](../architecture/runtime-boundaries.md), [First Perfect Slice](../foundation/10-first-perfect-slice.md)

## Summary

Slice 4 is complete for the dependency-free TypeScript host lifecycle foundation.

The host now has typed seams for game modules, mount lifecycle, keyboard input sampling, game registry validation/mapping, and direct-play launch planning. The visible shell exposes a registry-backed `Play Wild Haggis Survivors` link without choosing a renderer or claiming the first room exists.

No new dependencies were added.

## Files changed

- `src/app/app.ts`
- `src/app/app.test.ts`
- `src/engine/game-module.ts`
- `src/engine/input.ts`
- `src/engine/input.test.ts`
- `src/engine/lifecycle.ts`
- `src/engine/lifecycle.test.ts`
- `src/games/registry.ts`
- `src/games/registry.test.ts`
- `src/main.ts`
- `src/navigation/launch.ts`
- `src/navigation/launch.test.ts`
- `src/style.css`
- `README.md`
- `docs/README.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/plans/2026-05-22-implementation-sequence.md`
- `docs/audit/2026-05-23-slice-4-typescript-host-lifecycle-report.md`

## Behavior added

- `GameModule`, `GameInstance`, and `GameMountOptions` define the host-side game lifecycle contract.
- `createGameLifecycleHost(target)` owns one mounted game instance at a time and forwards `pause`, `resume`, and `destroy` safely.
- Replacement launches preload before destroying the current instance, then destroy the previous instance before mounting the replacement.
- Failed replacement preload leaves the existing instance running.
- Failed mount can clean up an explicitly attached partial instance before rethrowing.
- `inputVectorFromPressedKeys(...)` maps Arrow and WASD key state to compact `-1/0/1` axes compatible with `hub-core` movement input.
- `createKeyboardInputSampler(...)` owns browser keydown/keyup listeners and removes them on `destroy()`.
- `HUB_GAME_REGISTRY` maps stable game ids to launch metadata for the live external `wild-haggis-survivors.pages.dev` build and the locked `future-bothy` door.
- Registry validation rejects duplicate ids, non-kebab-case ids, playable entries without launch targets, non-playable entries with launch targets, unsafe route targets, and non-HTTPS external URLs.
- WASM door interactions map to registry entries by stable id, not by title.
- Direct-play launch planning returns serializable plans and performs browser navigation only for launchable plans through an injected navigator.
- The app model and shell expose a registry-backed `Play Wild Haggis Survivors` link.

## TDD evidence

The Slice 4 tests were written before their implementation modules existed. The initial narrow run failed as expected:

```text
pnpm exec vitest run src/games/registry.test.ts src/navigation/launch.test.ts src/engine/input.test.ts src/engine/lifecycle.test.ts
Error: Cannot find module './registry'
Error: Cannot find module './launch'
Error: Cannot find module './input'
Error: Cannot find module './lifecycle'
```

After implementing the host modules, the narrow Slice 4 gate passed:

```text
pnpm exec vitest run src/app/app.test.ts src/games/registry.test.ts src/navigation/launch.test.ts src/engine/input.test.ts src/engine/lifecycle.test.ts
5 passed, 21 tests passed
```

## Verification

Slice-local verification run during implementation:

```text
pnpm exec vitest run src/games/registry.test.ts src/navigation/launch.test.ts src/engine/input.test.ts src/engine/lifecycle.test.ts
pnpm exec vitest run src/app/app.test.ts
pnpm exec vitest run src/app/app.test.ts src/games/registry.test.ts src/navigation/launch.test.ts src/engine/input.test.ts src/engine/lifecycle.test.ts
pnpm exec tsc --noEmit
```

Result: passed after the expected red phase and TypeScript test cleanups.

Final full skeleton gate is recorded in the session completion report.

## Open risks / deferred work

- Renderer choice and first room remain Slice 5 work; this slice intentionally did not select Canvas2D or PixiJS.
- The actual generated `wasm-bindgen` JavaScript package is still behind the existing injected loader seam.
- The registry duplicates door ids/titles already hard-coded in the Rust demo world; future world construction should converge on data-driven definitions instead of long-term duplication.
- The registry intentionally uses the live external `https://wild-haggis-survivors.pages.dev/` build for direct play until ADR-0003 closes the final WHS mount strategy.
- Browser smoke testing remains planned until Playwright config is introduced.
