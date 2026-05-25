# Visual gate goldens

This directory holds the project's **visual gate** — the missing eye-gate that catches aesthetic drift the other gates can't see.

Every other gate verifies mechanism (typecheck, vitest, build, perf budgets, determinism, security headers). This one verifies what the visitor actually SEES.

## Files

| File | Purpose |
|---|---|
| `visual-budgets.json` | Per-scene aHash + tolerance. The source of truth for "what the bothy should look like." |
| `<scene-name>.png` | The captured golden screenshot. Human-reviewable. The hash above is computed from this. |

## How the gate works

1. The gate script (`scripts/smoke-visual-gate.mjs`) opens the deployed hub at a deterministic seed and animation phase (`?seed=42&visualGatePhase=0`).
2. Captures the playfield canvas as PNG bytes.
3. Resizes to 16×16 grayscale via `sharp`.
4. Computes a **256-bit average hash (aHash)**: each downsampled pixel is 1 if brighter than the frame mean, 0 otherwise.
5. Compares against the recorded golden hash via **Hamming distance**.
6. Passes if the distance is within the per-scene tolerance (currently 8 / 256 ≈ 3%).

The fixed animation phase keeps particles, hearth flicker, dust motes, dawn pulse, and haggis breath from spending the Hamming budget on timing noise. The tolerance is reserved for browser/OS antialiasing noise and real layout or palette drift.

## Why aHash

We're catching **perceptual** drift (the bothy now looks visibly different), not pixel-exact diffs (which would fail on every frame because of particles). aHash on a small downsampled grayscale image is the simplest tool that works:

- Different palette → mean shifts → every bit flips → big Hamming distance
- Different layout → bright clusters move between cells → bits flip in that region
- Same scene, sub-pixel browser/OS antialiasing noise → usually 0–8 bits flip → within tolerance

After the 2026-05-25 determinism pass, `bothy-idle-seed-42` is captured with `visualGatePhase=0`; three consecutive local verifies returned **0 / 256** Hamming distance. Before that freeze, normal animation timing alone could push local verifies to 10–12 bits against the golden, which was noise rather than an art regression.

This is dogfood-grade. If the project wants stronger guarantees later, swap aHash for `pHash` (DCT-based) or pixel-level `pixelmatch` — the script is one function-swap away.

## When to capture vs verify

```bash
# Bootstrap or re-baseline a scene (e.g. after intentional art changes):
node scripts/run-visual-gate.mjs capture

# CI / pre-merge check:
node scripts/run-visual-gate.mjs verify
```

`capture` overwrites the PNG and the hash entry. `verify` reads them and reports drift.

**Capture is a deliberate act.** It says: "I have looked at the new screenshot and confirm it is now the correct reference." Do not bake `capture` into CI; bake `verify` only.

## Scenes covered

The current scene list is defined in `scripts/smoke-visual-gate.mjs` under `SCENES`. Add new scenes there as the surface grows (e.g., title card, locked-door close-up, mobile-portrait viewport, reduced-motion variant).

## How to interpret a DRIFT report

The script prints:

```
[smoke-visual-gate]   golden:   <64 hex chars>
[smoke-visual-gate]   current:  <64 hex chars>
[smoke-visual-gate]   hamming:  N / 256 (tolerance T)  DRIFT
```

Open the current screenshot side-by-side with the golden PNG in this directory. Decide:

- **Drift was intentional** (you changed the haggis sprite / palette / layout on purpose) → re-capture.
- **Drift is regression** (you didn't mean to change anything visible) → investigate the code change that caused it.

The signed JSON report from `haggis-eval all` surfaces every visual-gate result (the `visual` subcommand is wired into `all` as of 2026-05-24); look in `target/haggis-eval/all-*.json` for the `visual` category entry.
