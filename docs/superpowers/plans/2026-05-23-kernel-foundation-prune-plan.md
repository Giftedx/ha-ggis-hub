# Kernel Foundation Prune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 13 numbered foundation docs to the five canonical ones from [kernel design spec §7](../specs/2026-05-23-hub-determinism-kernel-design.md): `00-project-charter`, `05-stack-decision-record`, `07-quality-gates`, `11-quality-manifesto`, `12-craft-commitments`. Distill load-bearing content from the 8 archived docs into the 5 kept docs (no information loss). Archive per-slice audit reports (slice 1–5) since `haggis-eval` FNV-signed tamper-evident JSON reports now replace them as the slice-level evidence per spec. Sweep every cross-reference in the repo so no link is broken.

**Architecture:** This is a pure docs reorganization. No code touched, no gates added, no tests changed. The work is mechanical but cross-cutting — ~94 references across 36 files. One subagent reads the 8 archive-target docs, distills unique content into the 5 keepers, moves the originals under `docs/archive/` with one-paragraph supersession notes, and runs a search-and-replace sweep over every cross-reference. Then runs a link-integrity grep to confirm zero dangling refs.

**Tech Stack:** Markdown only. No tooling beyond `grep`, `mv`/`git mv`, and the file editing tools.

---

## File Structure

**Kept and edited (5 canonical foundation docs):**
- `docs/foundation/00-project-charter.md` — absorbs the product-vision content from 03 (first impression, tone, hub fiction, required user paths, non-goals).
- `docs/foundation/05-stack-decision-record.md` — already has the "why not Phaser/Bevy/WebGPU" summary; absorbs nothing structural from 04 (the architecture-options doc is moved to `docs/research/` as historical evaluation).
- `docs/foundation/07-quality-gates.md` — absorbs the technical-bar content from 02 (baseline, architecture, correctness, performance, security, documentation, visual bars) and the release-definition content from 09 (release requirements, blockers, preview vs production, rollback).
- `docs/foundation/11-quality-manifesto.md` — absorbs the engineering-principles content from 01 (10 named principles) and the agent-operating-mode content from 08 (pre-flight, planning, implementation, verification, reporting, escalation rules).
- `docs/foundation/12-craft-commitments.md` — absorbs the dependency-policy content from 06 (allowed/requires-ADR/suspicious classes, required rationale, lockfiles, licenses, removal).

**Moved to `docs/archive/` with supersession notes:**
- `docs/foundation/01-engineering-principles.md` → `docs/archive/2026-05-23-foundation-01-engineering-principles.md`
- `docs/foundation/02-technical-bar.md` → `docs/archive/2026-05-23-foundation-02-technical-bar.md`
- `docs/foundation/03-product-vision.md` → `docs/archive/2026-05-23-foundation-03-product-vision.md`
- `docs/foundation/06-dependency-policy.md` → `docs/archive/2026-05-23-foundation-06-dependency-policy.md`
- `docs/foundation/08-agent-operating-mode.md` → `docs/archive/2026-05-23-foundation-08-agent-operating-mode.md`
- `docs/foundation/09-release-definition.md` → `docs/archive/2026-05-23-foundation-09-release-definition.md`
- `docs/foundation/10-first-perfect-slice.md` → `docs/archive/2026-05-23-foundation-10-first-perfect-slice.md`
- `docs/audit/2026-05-23-slice-1-executable-foundation-report.md` → `docs/archive/2026-05-23-slice-1-executable-foundation-report.md`
- `docs/audit/2026-05-23-slice-2-hub-core-movement-and-doors-report.md` → `docs/archive/2026-05-23-slice-2-hub-core-movement-and-doors-report.md`
- `docs/audit/2026-05-23-slice-3-wasm-boundary-report.md` → `docs/archive/2026-05-23-slice-3-wasm-boundary-report.md`
- `docs/audit/2026-05-23-slice-4-typescript-host-lifecycle-report.md` → `docs/archive/2026-05-23-slice-4-typescript-host-lifecycle-report.md`
- `docs/audit/2026-05-23-slice-5-canvas2d-first-room-report.md` → `docs/archive/2026-05-23-slice-5-canvas2d-first-room-report.md`

**Moved to `docs/research/`:**
- `docs/foundation/04-architecture-options.md` → `docs/research/2026-05-23-architecture-options-evaluation.md`. This is research content, not policy — it documents alternatives considered, which is exactly what `docs/research/` is for.

**Modified (cross-reference sweep):**
- `README.md` (root) — three refs
- `AGENTS.md` — two refs
- `CONTRIBUTING.md` — two refs
- `SECURITY.md` — one ref
- `docs/README.md` — sixteen refs; index needs full rewrite
- `docs/glossary.md` — six refs
- `docs/style-guide.md` — one ref
- `docs/architecture/README.md` — one ref
- `docs/architecture/autopilot-system.md` — one ref
- `docs/architecture/data-and-save-boundaries.md` — one ref
- `docs/architecture/evaluation-strategy.md` — one ref
- `docs/architecture/security-model.md` — two refs
- `docs/architecture/testing-strategy.md` — one ref
- `docs/decisions/0001-rust-wasm-core-typescript-host.md` — one ref
- `docs/decisions/0002-renderer-evaluation-plan.md` — one ref
- `docs/decisions/0004-language-and-craft-philosophy.md` — one ref
- `docs/decisions/0005-canvas2d-first-room-renderer.md` — one ref
- `docs/decisions/README.md` — one ref
- `docs/deployment/cloudflare-pages.md` — one ref
- `docs/plans/2026-05-22-implementation-sequence.md` — one ref
- `docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md` — one ref
- `docs/audit/2026-05-22-docs-audit.md`, `docs/audit/2026-05-23-docs-audit.md` — these are themselves historical; can be left untouched or also moved into `docs/archive/`. Leave for now.

For every ref to an archived doc:
- If the reference is in a KEPT canonical doc (charter, stack, gates, manifesto, craft-commitments): rewrite to point at the new home (e.g., `[Agent operating mode](08-agent-operating-mode.md)` → the relevant section of `[Quality manifesto](11-quality-manifesto.md#autopilot-rules)`).
- If the reference is in an ADR or architecture doc: same — rewrite to the new home.
- If the reference is in a plan that is itself historical/superseded (e.g., `2026-05-22-ha-ggis-hub-foundation.md` with 22 refs): do NOT update. Plans are point-in-time artifacts; rewriting their references rewrites history. Add a one-line banner at the top of each historical plan noting "references in this plan may point to docs that were later moved to docs/archive/; the plan is preserved as provenance".

---

## Phase 0 — Baseline

### Task 0: Confirm baseline + take inventory snapshot

- [ ] **Step 0.1: Run gates**

```
cargo test --workspace
pnpm exec vitest run
```
Expected: 44 cargo + 43 vitest, all green. (Doc-only changes shouldn't break anything but this is the safety floor.)

- [ ] **Step 0.2: Capture the pre-prune ref inventory for diff**

```
grep -rln "foundation/01-\|foundation/02-\|foundation/03-\|foundation/04-\|foundation/06-\|foundation/08-\|foundation/09-\|foundation/10-" --include="*.md" . | sort > /tmp/refs-before.txt
```
(On Windows PowerShell substitute `Select-String -List -Pattern '...' -Path .\**\*.md`.)

Save the list — at the end of the plan, the corresponding file is empty (no remaining refs to archive-target paths).

---

## Phase 1 — Distill load-bearing content into the 5 keepers

For each archive-target doc, identify content NOT already covered by the keeper it merges into, and append a new section to the keeper carrying that content (preserving the wording where it's clean). Do not paraphrase aggressively — these are policy docs whose exact wording carries weight.

### Task 1: Fold 03 product vision into 00 charter

Append to `docs/foundation/00-project-charter.md` a new section `## Product vision` carrying these subsections verbatim from `03-product-vision.md`:
- "One-sentence vision"
- "First impression"
- "Tone" (including the copy snippet)
- "First hub fiction" (the Bothy)
- "Required user paths" (playable, direct, fallback)
- "Not product goals yet"

Update the charter's `Related:` line to drop the `03-product-vision.md` link.

### Task 2: Fold 01 engineering principles + 08 agent operating mode into 11 manifesto

In `docs/foundation/11-quality-manifesto.md`, add two new top-level sections:

`## Engineering principles` — carry the 10 numbered principles from `01-engineering-principles.md` verbatim.

`## Autopilot rules` — carry the content from `08-agent-operating-mode.md`:
- Prime directive
- Required pre-flight (5-item list)
- Planning rules
- Implementation rules
- Verification rules
- Reporting rules
- Stop/escalate conditions

This grows the manifesto from ~100 to ~250 lines. Acceptable — the manifesto is *the* canonical "how this project thinks" doc and that's the point.

Update the manifesto's `Related:` line to drop `01` and `08`.

### Task 3: Fold 02 technical bar + 09 release definition into 07 quality gates

In `docs/foundation/07-quality-gates.md`:

After `## Gate tiers`, before `## Initial budgets`, add `## Technical bar` carrying these subsections from `02-technical-bar.md`:
- "Baseline bar"
- "Architecture bar"
- "Correctness bar"
- "Performance bar" (note: it currently points at gates' initial budgets; that link stays valid)
- "Security bar"
- "Documentation bar"
- "Visual/product bar"

After the existing `## Release blockers` section, add `## First public release requirements` carrying the Product/Engineering/Documentation requirement lists from `09-release-definition.md`. Also add `## Preview vs production` and `## Rollback posture` from 09.

Update `Related:` to drop `02` and `09`.

### Task 4: Fold 06 dependency policy into 12 craft commitments

In `docs/foundation/12-craft-commitments.md`, add a top-level section `## Dependency policy` after `## Section D: Cross-doc updates required when this doc changes` (or before "Non-goals" — pick the placement that reads best). Carry these subsections from `06-dependency-policy.md`:
- "Principle"
- "Dependency classes" (Allowed by foundation decision / Requires ADR / Suspicious by default)
- "Required rationale for new dependencies"
- "Lockfiles"
- "License posture"
- "Removal policy"

Update `Related:` to drop `06`.

### Task 5: Verify the keepers compile (markdown-lint clean if available; otherwise visual check)

Read each of the five kept docs end-to-end. Confirm no broken internal anchors (links within the same doc), no half-merged sentences, no duplicate section headers.

### Task 6: Commit phase 1

```
git add docs/foundation/00-project-charter.md docs/foundation/07-quality-gates.md docs/foundation/11-quality-manifesto.md docs/foundation/12-craft-commitments.md
git commit -m "docs(foundation): distill engineering/agent/technical/release/dependency/vision content into the 5 canonical docs"
```

---

## Phase 2 — Move archive-target docs

### Task 7: Move the 7 foundation docs to docs/archive/ with supersession notes

For each of `01`, `02`, `03`, `06`, `08`, `09`, `10`:
1. `git mv docs/foundation/<file>.md docs/archive/2026-05-23-foundation-<file>.md`
2. Open the moved file and prepend a supersession block immediately after the H1 title:
   ```markdown
   > **Superseded and archived 2026-05-23.** Content distilled into [<new home>](<relative path to new home>) as part of the foundation prune. Preserved for provenance.
   ```
3. The `<new home>` mapping:
   - 01 → `../foundation/11-quality-manifesto.md` (Engineering principles section)
   - 02 → `../foundation/07-quality-gates.md` (Technical bar section)
   - 03 → `../foundation/00-project-charter.md` (Product vision section)
   - 06 → `../foundation/12-craft-commitments.md` (Dependency policy section)
   - 08 → `../foundation/11-quality-manifesto.md` (Autopilot rules section)
   - 09 → `../foundation/07-quality-gates.md` (First public release requirements section)
   - 10 → `../foundation/07-quality-gates.md` (the acceptance criteria for slices live in the gates; the First Perfect Slice scope as a concept is preserved by the project's actual implementation and the [WHS-stub design spec](../superpowers/specs/...) when it lands)

### Task 8: Move 04 architecture options to docs/research/

```
git mv docs/foundation/04-architecture-options.md docs/research/2026-05-23-architecture-options-evaluation.md
```
Prepend:
```markdown
> **Moved from `docs/foundation/` 2026-05-23.** This is historical evaluation, not active policy. The canonical decision lives in [Stack decision record](../foundation/05-stack-decision-record.md) and [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md).
```

### Task 9: Move slice 1–5 audit reports to docs/archive/

```
git mv docs/audit/2026-05-23-slice-1-executable-foundation-report.md docs/archive/
git mv docs/audit/2026-05-23-slice-2-hub-core-movement-and-doors-report.md docs/archive/
git mv docs/audit/2026-05-23-slice-3-wasm-boundary-report.md docs/archive/
git mv docs/audit/2026-05-23-slice-4-typescript-host-lifecycle-report.md docs/archive/
git mv docs/audit/2026-05-23-slice-5-canvas2d-first-room-report.md docs/archive/
```
For each, prepend after the H1:
```markdown
> **Archived 2026-05-23.** Per-slice audit reports are superseded by the `haggis-eval` FNV-signed tamper-evident JSON reports under `target/haggis-eval/` (see [tools/haggis-eval/README.md](../../tools/haggis-eval/README.md)). Preserved for provenance.
```

### Task 10: Commit phase 2

```
git add -A
git commit -m "docs(foundation): archive 7 foundation docs + 5 slice audits with supersession notes"
```

---

## Phase 3 — Reference sweep

### Task 11: Rewrite cross-references in the 36 affected files

For every file in the cross-reference inventory list, replace links to archive-target docs with links to the new homes. Critical files:

- `README.md` (root): links to `08-agent-operating-mode.md`, `10-first-perfect-slice.md` → repoint to `11-quality-manifesto.md#autopilot-rules` and `07-quality-gates.md#first-public-release-requirements` respectively.
- `docs/README.md`: full rewrite of the foundation section of the index. List only the five kept docs. Add a brief "Archive" line pointing at the new archive entries.
- `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`: small ref updates.
- Every architecture doc, ADR, deployment doc, glossary entry, style guide: update the small handful of refs each.
- `docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md`: update its Related-list refs.

For each rewrite, ensure the link text remains descriptive (e.g., `[Agent operating mode](../foundation/11-quality-manifesto.md#autopilot-rules)` not `[manifesto](...)`).

For plans (`docs/plans/2026-05-22-ha-ggis-hub-foundation.md` with 22 refs, etc.): do NOT rewrite. Instead add this banner at the top of each historical plan:
```markdown
> **Historical plan, preserved as provenance.** Links in this plan may point to docs that have since moved to `docs/archive/` as part of the 2026-05-23 foundation prune. The current canonical foundation lives at `docs/foundation/` (5 numbered files).
```

### Task 12: Verify no dangling refs

```
grep -rln "foundation/01-\|foundation/02-\|foundation/03-\|foundation/04-\|foundation/06-\|foundation/08-\|foundation/09-\|foundation/10-" --include="*.md" .
```
Expected: only `docs/plans/2026-05-22-ha-ggis-hub-foundation.md` and `docs/plans/2026-05-22-implementation-sequence.md` should appear (and only because they're banner-flagged historical plans). All keep-docs, ADRs, architecture docs, README files, AGENTS/CONTRIBUTING/SECURITY: zero matches.

Also check for references to moved audit files:
```
grep -rln "audit/2026-05-23-slice-" --include="*.md" .
```
Expected: zero matches outside `docs/audit/` (which now contains only the older `2026-05-22-docs-audit.md` and `2026-05-23-docs-audit.md` historical audits, themselves untouched).

### Task 13: Commit phase 3

```
git add -A
git commit -m "docs: sweep cross-references after foundation prune"
```

---

## Phase 4 — Final verification

### Task 14: Run all gates one more time

```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
cd tools/haggis-eval && go test ./... && cd ../..
```
PowerShell:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
All green. No code changes; gates should pass trivially.

### Task 15: Final inventory check

`docs/foundation/` should contain exactly 5 numbered files (00, 05, 07, 11, 12).

`docs/audit/` should contain only `2026-05-22-docs-audit.md` and `2026-05-23-docs-audit.md` (the older meta-audits; per-slice reports are gone).

`docs/archive/` should contain: the 7 foundation files, the 5 slice audit reports, the original archive entries.

`docs/research/` should contain the architecture-options doc.

---

## Acceptance criteria

The plan is complete when:

1. `docs/foundation/` has exactly 5 numbered files: `00-project-charter`, `05-stack-decision-record`, `07-quality-gates`, `11-quality-manifesto`, `12-craft-commitments`.
2. Each of the 5 keeper docs has absorbed the unique load-bearing content from the docs that fold into it; no policy is lost.
3. The 7 archived foundation docs + 5 slice audit reports live under `docs/archive/` with one-paragraph supersession notes.
4. `docs/foundation/04-architecture-options.md` lives under `docs/research/`.
5. Every cross-reference outside historical plans points at the new home (zero dangling refs to archive-target paths).
6. Historical plans carry banner notes explaining the moved-references state.
7. All workspace gates pass (no code changes, but verify nothing broke transitively).
8. `docs/README.md` index reflects the new structure.

## Out of scope for this plan

- Rewriting historical plan files' references (they are preserved as provenance).
- Touching `docs/audit/2026-05-22-docs-audit.md` and `docs/audit/2026-05-23-docs-audit.md` (older meta-audits; they document the state of the world at their dates).
- Touching `docs/archive/2026-05-22-original-ha-ggis-hub-plan.md` (already archived).
- Adding new tests or gates.
