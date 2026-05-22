# 2026-05-23 Documentation Audit

Status: historical audit report
Superseded by: [Slice 1 executable foundation report](2026-05-23-slice-1-executable-foundation-report.md)
Scope: third documentation pass — full inventory, drift check, structural normalization, and gap closure
Related: [2026-05-22 docs audit](2026-05-22-docs-audit.md), [2026-05-22 foundation strengthening report](2026-05-22-foundation-strengthening-report.md), [Documentation index](../README.md), [Style guide](../style-guide.md)

## Purpose

The first two audits established the documentation set and strengthened it. This pass treats the docs as a finished foundation artifact and goes through them as an outside reader would: looking for unanswered questions, contradictions, stale prescriptive content, structural drift, broken cross-references, and missing pieces a new contributor would notice.

The intent is that after this pass a new contributor can read the docs alone and have no obvious questions left.

## Repository state audited

Markdown files (Glob `**/*.md`):

```text
README.md
AGENTS.md
CONTRIBUTING.md
docs/README.md
docs/style-guide.md
docs/glossary.md
docs/foundation/00-project-charter.md
docs/foundation/01-engineering-principles.md
docs/foundation/02-technical-bar.md
docs/foundation/03-product-vision.md
docs/foundation/04-architecture-options.md
docs/foundation/05-stack-decision-record.md
docs/foundation/06-dependency-policy.md
docs/foundation/07-quality-gates.md
docs/foundation/08-agent-operating-mode.md
docs/foundation/09-release-definition.md
docs/foundation/10-first-perfect-slice.md
docs/foundation/11-quality-manifesto.md
docs/architecture/overview.md
docs/architecture/runtime-boundaries.md
docs/architecture/data-and-save-boundaries.md
docs/architecture/testing-strategy.md
docs/architecture/evaluation-strategy.md
docs/architecture/autopilot-system.md
docs/architecture/security-model.md
docs/architecture/observability-debugging.md
docs/decisions/adr-template.md
docs/decisions/0001-rust-wasm-core-typescript-host.md
docs/decisions/0002-renderer-evaluation-plan.md
docs/decisions/0003-whs-integration-strategy.md
docs/decisions/0004-language-and-craft-philosophy.md
docs/plans/2026-05-22-ha-ggis-hub-foundation.md
docs/plans/2026-05-22-implementation-sequence.md
docs/deployment/cloudflare-pages.md
docs/research/2026-05-22-foundation-research-notes.md
docs/audit/2026-05-22-docs-audit.md
docs/audit/2026-05-22-foundation-strengthening-report.md
docs/archive/2026-05-22-original-ha-ggis-hub-plan.md
.hermes/plans/2026-05-22_234351-ha-ggis-hub-foundation.md
```

Non-Markdown implementation/config files:

```text
none
```

Repo is not initialized as a git repository. There is no `LICENSE`, `.gitignore`, `SECURITY.md`, or `CHANGELOG.md`.

## Findings

### F1. Reading-order divergence between root and docs index

`README.md` "Start here" listed 11 entries in an order the editor judged most useful (manifesto promoted to #3). `docs/README.md` "Recommended reading order" listed 16 entries in numeric/alphabetic order. The two were not contradictory, but a contributor who read both saw two different recommended paths without explanation of which to follow.

Fix applied: README's quick path now explicitly defers to the docs index for the full ordered list and only highlights the small required-before-edits set. docs/README explains both the canonical numeric order and the recommended emphasis path.

### F2. Foundation plan in `docs/plans/` is now a historical artifact

`docs/plans/2026-05-22-ha-ggis-hub-foundation.md` is a near-verbatim copy of `.hermes/plans/2026-05-22_234351-ha-ggis-hub-foundation.md`. It uses imperative language ("Create these as repo docs before implementation") for files that have all been created. A reader could mistake it for a current to-do list.

Fix applied: status block on the docs/plans copy clarifies that the prescribed foundation-doc tasks (F1–F6) are complete and the live policy now lives in `docs/foundation/` and `docs/decisions/`. The document is preserved verbatim for provenance.

### F3. `.hermes/plans/` contains tool state that mirrors archived content

`.hermes/plans/2026-05-22_234351-ha-ggis-hub-foundation.md` is the original Hermes-tool plan that was copied into `docs/plans/` and (with adjustments) drove the foundation phase. It is not user-edited canonical content. Leaving it in the repository is harmless but it can confuse contributors who do not realize it is a tool artifact.

Fix applied: not removed (low-risk and provenance is real). The new doc index and AGENTS.md explicitly state that `.hermes/` is tooling state, not canonical content. Cleanup is listed as an open question rather than executed.

### F4. Glossary missing terms heavily used in architecture and product docs

Terms missing definitions: `Bothy`, `Slice`/`First slice`, `Registry`, `Game module`, `Game instance`, `Direct play`, `Smoke test`, `Eval`/`Evaluation`, `Autopilot`, `Quality gate`, `Reduced motion`, `Door`.

Fix applied: glossary expanded with these terms and cross-linked to canonical docs that own them.

### F5. ADR template does not match how proposed/decision-pending ADRs are actually written

The template assumes a decision has been made (sections: Context, Decision, Alternatives, Rationale, Consequences, Reversal path). ADR-0002 ("Renderer evaluation plan") and ADR-0003 ("WHS integration strategy") are decision-pending: they describe what must be chosen later. None of the existing ADRs follow the template exactly.

Fix applied: template now documents two shapes — a decision-pending shape (used by ADR-0002 and ADR-0003) and an accepted-decision shape (used by ADR-0001 and ADR-0004) — and explains when to use each. Existing ADRs are not rewritten; they remain consistent within their respective shapes.

### F6. "Missing implementation files by design" was incomplete

`docs/README.md` listed 10 planned files but omitted entries that other foundation/plan docs mention as planned: `tsconfig.json`, `eslint.config.js`, `prettier.config.js`, `Cargo.lock`, `wrangler.toml` (conditional), `index.html`, `src/style.css`, `crates/hub-core/src/lib.rs`, `crates/hub-wasm/src/lib.rs`.

Fix applied: list expanded and split into "tooling and config", "Rust workspace", "TypeScript host", and "deployment" subgroups so the gap is legible by area.

### F7. AGENTS.md and CONTRIBUTING.md reading lists are inconsistent

Both files list a short reading set for a specific audience (agents / contributors). AGENTS.md omits the quality manifesto, engineering principles, and project charter — three documents the project's own quality bar treats as load-bearing. CONTRIBUTING.md omits the stack decision record and the manifesto.

Fix applied: both lists updated to a consistent minimum (charter, principles, quality manifesto, agent operating mode, stack decision record, quality gates) with audience-specific extensions.

### F8. Status strings drift slightly from style guide

Style guide enumerates: `canonical/proposed/planned/superseded/current audit`. Actual usage includes legitimate extensions: `canonical foundation policy`, `canonical research summary`, `canonical decision`, `canonical scope definition`, `canonical documentation policy`, `canonical terminology`, `canonical plan`, `current research notes`, `foundation-phase contributor guide`, `current audit report`, `planned architecture`, `planned deployment foundation`, `planned implementation sequence`, `accepted`, `proposed`, `superseded and archived`.

These are reasonable specializations of the canonical statuses and are clearer than the generic forms. The style guide didn't sanction them.

Fix applied: style guide updated to permit specialization (`canonical foundation policy`, `planned architecture`, etc.) as long as the root status (`canonical`, `planned`, `accepted`, `proposed`, `superseded`, `current audit`) is recognisable. Existing docs unchanged.

### F9. No section indices for `docs/architecture/` and `docs/decisions/`

`docs/README.md` lists every doc, but the architecture and decisions sections are large enough that a per-section index with one-line summaries would help a reader who has landed in the section directly (e.g. from a GitHub directory view).

Fix applied: added `docs/architecture/README.md` and `docs/decisions/README.md` with status, scope, and a one-line summary for each doc.

### F10. Two audit reports both claim "current audit report" status

The 2026-05-22 documentation audit and 2026-05-22 foundation strengthening report are both labelled `Status: current audit report`. The strengthening report supersedes the first audit's "remaining work" section. This audit supersedes both.

Fix applied: both prior audit reports updated to `Status: historical audit report` with a one-line forward reference to this audit.

### F11. Stale numbered-prefix wording in style guide

Style guide says foundation docs use `00-...md` through `10-...md`. There is now an `11-quality-manifesto.md`. Wording was technically wrong.

Fix applied: style guide now says foundation docs use a two-digit ordered prefix (`00-`, `01-`, …) with no hard upper bound.

### F12. No security-disclosure path

The repo declares a strong security bar (`docs/architecture/security-model.md`, dependency policy, CSP plan) but provides no channel for a third party to report a vulnerability. Standard for portfolio-grade public repos.

Fix applied: added `SECURITY.md` at the repository root with reporting guidance scoped to the project's current pre-implementation phase. The actual contact channel is left as a one-line placeholder for the maintainer to fill in (see open questions).

### F13. No LICENSE file

The dependency policy enumerates acceptable third-party licenses, but the project itself has no license. For a portfolio project intended for public hosting at `ha.ggis.xyz`, an absence of license means "all rights reserved by default" — restricting reuse and signalling oversight.

Not fixed autonomously. Listed under open questions — license choice is a product/legal decision.

### F14. Repo is not a git repository

`.git` is absent. Several docs (e.g. agent operating mode "inspect current branch/status") assume git exists. Not currently misleading because the foundation phase is explicit, but a contributor expecting `git log` to give context will hit immediately.

Not fixed autonomously. Listed under open questions — git initialization is a workflow decision (when to start tracking, whether to use this directory as the canonical repo or fork an existing remote).

### F15. Minor terminology drift: "first slice" vs "First Perfect Slice"

Most docs use "First Perfect Slice" precisely. A few use "first slice" or "first public slice" interchangeably (e.g. architecture overview, evaluation strategy, foundation/04, foundation/05).

Fix applied: glossary now states explicitly that "first slice", "first public slice", and "First Perfect Slice" refer to the same scope (defined in `docs/foundation/10-first-perfect-slice.md`). Existing docs unchanged.

### F16. ADR-0002 status semantics

`ADR-0002` is `Status: proposed` but the document does not propose a specific decision; it lays out the criteria for the decision and what evidence the decision needs. This is closer to a "decision plan" or "research scope" than a classic ADR.

Fix applied: ADR template now explicitly supports a "decision-pending" shape; ADR-0002 fits that shape and its status remains `proposed` (a proposed decision plan), with a brief in-document note clarifying that the decision itself has not been made yet.

### F17. Cross-link verification

Every Markdown-to-Markdown link in the canonical docs was checked. All resolve to existing files.

No fix needed.

### F18. No `TODO` / `FIXME` / `TBD` markers in canonical docs

Grep confirms the only occurrences of `TODO` are conceptual references in `engineering-principles` and `agent-operating-mode` (rejecting TODO-driven code), and the same references in the archived/duplicate foundation plans. No real to-do markers exist in current canonical docs.

No fix needed.

## Fixes applied (summary)

- `README.md` — reading order clarified to defer to docs index for the full path
- `docs/README.md` — recommended reading order normalized; "Missing implementation files" list expanded and grouped; new section indices linked
- `docs/style-guide.md` — numbered-prefix wording fixed; status-specialization clause added
- `docs/glossary.md` — twelve new terms; "First Perfect Slice" synonyms clarified
- `docs/decisions/adr-template.md` — two ADR shapes documented (accepted, decision-pending)
- `docs/decisions/0002-renderer-evaluation-plan.md` — in-document note clarifying decision-pending shape
- `docs/audit/2026-05-22-docs-audit.md` — status changed to historical with forward reference
- `docs/audit/2026-05-22-foundation-strengthening-report.md` — status changed to historical with forward reference
- `docs/plans/2026-05-22-ha-ggis-hub-foundation.md` — front-matter clarifies its current historical role
- `AGENTS.md` — required reading list reconciled
- `CONTRIBUTING.md` — required reading list reconciled
- `SECURITY.md` (new, root)
- `docs/architecture/README.md` (new) — architecture section index
- `docs/decisions/README.md` (new) — ADR index with statuses
- `docs/audit/2026-05-23-docs-audit.md` (this file, new)

## Code/config drift check

Historical note: this section describes the pre-Slice-1 repository state as audited at the time. The current executable scaffold state is recorded in [Slice 1 executable foundation report](2026-05-23-slice-1-executable-foundation-report.md). At the time of this audit there was no implementation; docs accurately labelled everything as planned, and the foundation phase had no documentation-side blockers to implementation start.

## Open questions

Decisions that genuinely require maintainer input:

1. **Project license**. The repo has no `LICENSE`. Recommended default for a portfolio repo: `MIT` (permissive, dependency-policy-aligned) or `Apache-2.0` (permissive with patent grant). Choose one before public deployment.
2. **Repository identity**. Should this directory be `git init`-ed as a fresh repo, or should the foundation docs land in an existing remote (e.g. `github.com/<owner>/ha-ggis-hub`)? Several docs assume git exists.
3. **`.hermes/plans/` retention**. The directory contains tool state that mirrors `docs/archive/` provenance. Retain in repo, gitignore, or delete?
4. **`SECURITY.md` contact channel**. The new `SECURITY.md` references a placeholder reporting channel. Replace with `michael.mcmillan93@gmail.com` (or a project-specific alias / GitHub Security Advisories once the remote exists).
5. **Outstanding foundation-phase open decisions, unchanged from prior audits**:
   - First-slice renderer (Canvas2D vs PixiJS) — tracked in ADR-0002.
   - WHS launch strategy (external URL vs `/wild-haggis-survivors/` mount) — tracked in ADR-0003.
   - Cloudflare Pages build vs GitHub Actions + Wrangler.
   - Final visual direction for the first bothy/hub room.

## Deliberately scoped out

- No `LICENSE` was added; choice belongs to the maintainer.
- No `git init` was performed; this directory's relationship to any remote is the maintainer's call.
- `.hermes/plans/` not removed (low risk; provenance preserved).
- No `CHANGELOG.md` added; changelogs are most useful when implementation ships, and a doc-side changelog would duplicate the audit chain.
- No `CODE_OF_CONDUCT.md` added; deferred until public collaboration begins.
- ADRs `0002` and `0003` are not promoted from `proposed` to `accepted`; the underlying decisions are open.
- Existing ADRs were not rewritten to match the template strictly; reconciliation went the other way (template now supports both shapes).
- Foundation docs and architecture docs were not rewritten for consistency — they are already consistent in substance, and rewriting for cosmetic style drift would risk regressing real content.
