# ha.ggis Hub Foundation Plan

> **Historical plan, preserved as provenance.** Links in this plan may point to docs that have since moved to `docs/archive/` as part of the 2026-05-23 foundation prune. The current canonical foundation lives at `docs/foundation/` (5 numbered files).

Status: historical plan
Scope: the plan that drove the foundation phase
Related: [Implementation sequence](2026-05-22-implementation-sequence.md), [Documentation index](../README.md), [2026-05-23 docs audit](../audit/2026-05-23-docs-audit.md)

> **Note (2026-05-23):** The prescriptive sections of this document (the F1–F6 doc-creation tasks, the architecture options list, the dependency policy template, the gate template) have all been executed. The canonical, currently-in-force versions live under `docs/foundation/`, `docs/decisions/`, and `docs/deployment/`. This plan is retained verbatim as provenance for *how* the foundation came together. Do not treat the imperative language ("create these as repo docs") as live work.
>
> The next-phase plan — what to do after the foundation — is [docs/plans/2026-05-22-implementation-sequence.md](2026-05-22-implementation-sequence.md).

> **For Hermes:** This is a planning-only foundation document. Do not scaffold or implement code from the old plan until the foundation docs and architecture decision records in this plan exist. When implementation begins, use `subagent-driven-development` task-by-task with review gates.

**Goal:** Turn `ha.ggis.xyz` into a professional-grade playable haggis game hub and portfolio-quality technical showcase, not a disposable MVP or ordinary landing page.

**Architecture:** Build a static, CDN-friendly browser app with a thin TypeScript/Vite host and a deliberately engineered game/runtime layer. The recommended technical spine is Rust/WASM for deterministic core simulation and validation, TypeScript for browser orchestration, and a renderer chosen by measured value: Pixi/custom Canvas/WebGL for the first hub slice, with WebGPU only as progressive enhancement if it earns its complexity.

**Tech Stack Direction:** Rust + WASM core, TypeScript + Vite shell, strict data-driven game adapter, Playwright/Vitest/proptest/fuzz/benchmark quality gates, Cloudflare Pages deployment with hardened headers and cache policy.

---

## 0. Current Context

Workspace:

```text
C:/Users/aggis/dev/active/ha-ggis-hub
```

Current folder contents when this plan was drafted:

```text
2026-05-22-ha-ggis-hub-new-repo.md
```

Current repository documentation has since been organized under `docs/` and `README.md`.

The existing file is a good seed for product vision, domain shape, and WHS separation. It is not yet sufficient as the canonical engineering plan because it jumps too quickly to Vite + Phaser and uses MVP framing.

Important existing decisions worth preserving:

- `ggis.xyz` redirects to `ha.ggis.xyz`.
- `ha.ggis.xyz` is the memorable destination because `ha` + `ggis` = `haggis`.
- The hub should be playable, not merely a marketing page.
- Wild Haggis Survivors remains its own project and is linked/mounted from the hub.
- The hub must include a direct non-gameplay launch path for visitors who do not immediately understand movement controls.
- Hub save/settings must remain separate from WHS save/settings.

Important new standard:

- No slop.
- No unexamined dependencies.
- No fake MVP shell.
- No technically boring default choices unless they are deliberately justified.
- The project should read like a serious portfolio artifact: architecture, testing, performance, deployment, agent workflow, and documentation must all be part of the product.

---

## 1. Reframe the Project

Do not call the first release an MVP.

Use this language instead:

```text
First Perfect Slice
```

Definition:

The smallest public slice that demonstrates the final standard of craft.

It may be small, but it must be structurally excellent:

- deliberate architecture
- clean runtime boundaries
- no sloppy TODO-driven code
- deterministic behavior where relevant
- tested core logic
- browser smoke coverage
- polished fallback paths
- secure static deployment
- documented agent rules
- documented quality gates

The first slice is not “everything.” It is a complete proof of the project’s standards.

---

## 2. Product Vision

The hub is the front door to a haggis game universe.

Public identity:

```text
ha.ggis.xyz
ha + ggis = haggis
say it without the dot
```

The site should feel like a small interactive place rather than a generic portfolio page. The visitor controls a haggis inside a bothy, glen, arcade-room, cave, or impossible little haggis hallway. Doors/portals represent games.

The first real door launches Wild Haggis Survivors.

The hub should communicate three things instantly:

1. This has personality.
2. This person can engineer.
3. This is not a template.

The playable hub should also have normal web affordances:

- direct “Play Wild Haggis Survivors” button
- keyboard controls explanation
- accessible non-canvas links
- graceful reduced-motion mode
- mobile/touch fallback
- about/technical writeup path later

---

## 3. Non-Negotiable Engineering Principles

Create these as repo docs before implementation:

```text
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
```

The principles should say, explicitly:

- The project is a portfolio-grade systems-quality browser app.
- Small scope is allowed; weak foundations are not.
- Dependencies must be justified.
- Core logic should be deterministic and testable.
- Browser rendering must not own gameplay truth.
- Public release requires passing quality gates, not vibes.
- Agent autonomy is allowed only through documented workflows and verification.
- Placeholder art is allowed only for internal iteration; public-facing placeholder slop is not accepted.

---

## 4. Architecture Options Considered

### Option A: Vite + TypeScript + Phaser

Summary:

A practical 2D game stack matching Wild Haggis Survivors knowledge.

Pros:

- Fastest to make playable.
- Familiar ecosystem.
- Built-in scenes, input, physics, asset loading.
- Strong enough for conventional 2D browser games.

Cons:

- Less technically distinctive.
- Phaser scene lifecycle can become the architecture by accident.
- Easy to couple game state to rendering.
- Less aligned with the user’s Rust/WASM/systems-quality preference.
- Does not by itself make the project portfolio-impressive.

Verdict:

Useful as a fallback or for secondary games. Do not make it the unquestioned foundation.

### Option B: Vite + TypeScript + Pixi/custom loop

Summary:

A browser app shell with a renderer-first 2D runtime and a custom deterministic update loop.

Pros:

- More control than Phaser.
- Smaller conceptual surface.
- Good rendering performance.
- Strong fit for polished 2D hub visuals.
- Lets us build a custom game adapter and state model.

Cons:

- Must implement scene lifecycle, input, collision, interaction prompts, debug overlays.
- Still mostly TypeScript unless paired with WASM.

Verdict:

Good pragmatic rendering option for the hub shell and first playable room.

### Option C: Rust/WASM simulation core + TypeScript renderer/host

Summary:

Rust owns deterministic state, movement, interactions, registry validation, save schema, and future game simulation. TypeScript owns DOM, asset loading, input capture, audio, navigation, and rendering orchestration.

Pros:

- Strong technical signal.
- Excellent testability outside the browser.
- Deterministic replay/debug possibilities.
- Clear separation between simulation truth and presentation.
- Natural foundation for agent-playable simulations and future automated evals.
- Aligns with systems-language preferences.

Cons:

- More build complexity.
- WASM boundary must be carefully designed.
- Debugging can be slower.
- Bad JS/WASM call patterns can erase performance benefits.

Verdict:

Recommended foundation.

### Option D: Rust + Bevy compiled to WASM

Summary:

All-Rust game engine compiled to browser.

Pros:

- Strong Rust/ECS story.
- Technically impressive.
- Native testing/profiling story.

Cons:

- Larger WASM payload.
- More complicated browser integration.
- Less natural for a lightweight portfolio hub.
- Web build/mobile/browser polish risk.

Verdict:

Consider only if a standalone future game wants to be a Bevy showcase. Not recommended as the hub foundation.

### Option E: Fully custom WebGL2/WebGPU renderer

Summary:

Hand-rolled renderer and runtime.

Pros:

- Maximum technical flex.
- Full control over visual identity.
- Excellent portfolio story if done well.

Cons:

- High risk and time cost.
- Text rendering, atlases, batching, context loss, device fallback, asset pipeline, and debugging are all real work.
- WebGPU-only would reduce compatibility.

Verdict:

Use custom rendering selectively. WebGPU can be an enhancement later, not the only path for the first slice.

---

## 5. Recommended Technical Spine

Use this as the target architecture unless later research disproves it:

```text
ha-ggis-hub/
  docs/
    foundation/
    decisions/
    plans/
  crates/
    hub-core/
      Cargo.toml
      src/
        lib.rs
        math.rs
        input.rs
        simulation.rs
        registry.rs
        interaction.rs
        save.rs
    hub-wasm/
      Cargo.toml
      src/
        lib.rs
  src/
    app/
      bootstrap.ts
      routes.ts
      errors.ts
    engine/
      GameModule.ts
      fixedTimestep.ts
      input.ts
      lifecycle.ts
      diagnostics.ts
    games/
      registry.ts
      registry.test.ts
    render/
      canvasRenderer.ts or pixiRenderer.ts
    wasm/
      loadHubCore.ts
    ui/
      directPlay.ts
      reducedMotion.ts
  public/
    _headers
    _redirects
  tests/
    e2e/
    visual/
    performance/
  package.json
  Cargo.toml
  pnpm-lock.yaml
  vite.config.ts
  playwright.config.ts
```

Rust workspace:

- `hub-core`: native-testable deterministic logic.
- `hub-wasm`: thin wasm-bindgen boundary around `hub-core`.

TypeScript app:

- owns browser APIs and rendering.
- does not own simulation truth.
- calls WASM through coarse, data-oriented boundaries.

Rendering:

- First slice can use Canvas2D or Pixi depending on visual needs.
- Keep renderer replaceable.
- Do not make rendering state the source of truth.

---

## 6. Runtime Boundary

The hub needs a formal game adapter immediately.

TypeScript interface target:

```ts
export interface GameModule {
  readonly id: string;
  readonly title: string;
  preload?(): Promise<void>;
  mount(target: HTMLElement, options: GameMountOptions): Promise<GameInstance>;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  destroy(): void;
  serialize?(): unknown;
  restore?(state: unknown): void;
}
```

Rules:

- Hub owns navigation.
- Game owns its loop only while mounted.
- Game must pause on tab hidden.
- Game must destroy cleanly on route change.
- No orphaned `requestAnimationFrame` loops.
- No global mutable game state outside explicit runtime objects.
- Game save state must be versioned.
- Hub must be able to show a clean error UI if a game fails to mount.

---

## 7. Rust/WASM Boundary Design

Use Rust for:

- deterministic movement/state update
- player-room interaction logic
- door proximity/launch eligibility
- game registry validation
- save/settings schema and migrations
- future replay/eval/headless simulation
- future performance-sensitive game logic

Do not use Rust for:

- DOM manipulation
- CSS/layout
- audio unlock mechanics
- simple page routing
- ordinary UI

Boundary rules:

- JavaScript sends compact input snapshots.
- Rust advances simulation by integer ticks.
- Rust returns compact render packets/snapshots.
- Avoid per-entity JS/WASM calls.
- Avoid passing object graphs every frame.
- Prefer typed arrays or coarse snapshots if entity counts grow.
- Panic paths must be explicit and tested.
- Debug builds install `console_error_panic_hook`; production builds do not leak noisy internals.

Simulation rule:

```text
fixed timestep > variable dt for game truth
```

Use:

- integer ticks
- seeded deterministic RNG if randomness appears
- capped accumulator
- deterministic replay fixtures later

---

## 8. First Perfect Slice Scope

The first public-quality slice should include:

Product:

- `ha.ggis.xyz` brand treatment.
- A small playable haggis bothy/hub scene.
- Haggis movement with keyboard controls.
- One active Wild Haggis Survivors door.
- At least one locked/future door.
- Direct “Play Wild Haggis Survivors” action outside canvas.
- Visible domain joke.
- Responsive fallback.
- Reduced-motion consideration.

Engineering:

- Rust core for movement/interaction state.
- WASM wrapper with tests.
- TypeScript host with strict config.
- Data-driven game registry.
- Clean game adapter lifecycle.
- Playwright smoke test for loading and direct play.
- Unit tests for registry, launch URL, input mapping.
- Rust tests for movement bounds and interaction proximity.
- Strict build/lint/typecheck gates.
- Cloudflare Pages headers/redirects planned before launch.

Not in first slice:

- accounts
- cloud save
- multiplayer
- achievements
- huge overworld
- multiple complete games
- WebGPU-only renderer
- complex asset pipeline

---

## 9. Dependency Policy

Create `docs/foundation/06-dependency-policy.md` before implementation.

Rules:

1. Every dependency needs a reason.
2. Dependencies central to runtime architecture require an ADR.
3. Dependencies that can execute code at build time are reviewed carefully.
4. Prefer small, typed, maintained packages.
5. Avoid large framework stacks unless they buy visible value.
6. Avoid asset packs unless licenses are clean and credits are documented.
7. No dependency may be added just because it is convenient for five lines of code.
8. Hand-roll central primitives when doing so improves quality, control, or portfolio value.
9. Do not hand-roll security-sensitive primitives casually.
10. Lockfiles are mandatory.

Default allowed dependency classes:

- Vite for web build tooling.
- TypeScript for browser code.
- Vitest for unit testing.
- Playwright for browser tests.
- wasm-bindgen/wasm-pack for WASM boundary.
- proptest for Rust property tests.
- cargo-deny/cargo-audit for supply chain.
- Pixi only if selected by ADR for rendering.

Default suspicious dependency classes:

- giant UI frameworks for tiny UI
- random animation libraries
- unmaintained game helpers
- broad utility libraries
- runtime analytics SDKs
- packages with unclear licenses
- packages that require unsafe CSP relaxations

---

## 10. Quality Gates

Create `docs/foundation/07-quality-gates.md` with strict levels.

### PR gate minimum

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --workspace --all-features
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown --all-features
cargo audit
cargo deny check

pnpm install --frozen-lockfile
pnpm exec prettier . --check
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
pnpm exec vitest run --coverage
pnpm run build
pnpm exec playwright test --project=chromium
```

### Release gate

Add:

```bash
cargo llvm-cov nextest --workspace --all-features --fail-under-lines 85
cargo machete
pnpm exec size-limit
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
lhci autorun
osv-scanner --recursive .
gitleaks detect --source . -v
```

### Nightly/deep gate

Add:

```bash
cargo +nightly fuzz run <target> -- -max_total_time=1800
cargo bench --workspace
pnpm exec playwright test --grep @soak
pnpm outdated
cargo outdated --workspace
```

Initial budgets:

- Rust core line coverage: >= 85%, target 90%.
- TypeScript statement coverage: >= 85%, target 90%.
- Branch coverage: >= 80%, target 85%.
- Initial JS gzip: <= 180 KB.
- Initial CSS gzip: <= 40 KB.
- Initial WASM gzip: <= 300 KB lean / <= 500 KB substantial.
- Total critical path gzip: <= 750 KB.
- Lighthouse performance: >= 90.
- Lighthouse accessibility: >= 95.
- Lighthouse best practices: >= 95.
- LCP: <= 2.5s.
- CLS: <= 0.05.
- INP: <= 200ms.
- No console errors or unexpected warnings in Playwright smoke tests.

Block release for:

- any failing test
- lint warning
- type error
- high/critical vulnerability
- missing security headers
- bundle budget violation
- public source maps shipped by accident
- unreviewed license issue
- browser console errors
- known fuzz crash
- unbounded memory growth in soak test

---

## 11. Deployment Foundation

Recommended host:

```text
Cloudflare Pages
```

Production domain:

```text
ha.ggis.xyz
```

Redirect:

```text
ggis.xyz/* -> https://ha.ggis.xyz/$1
```

Use a Cloudflare Redirect Rule or Bulk Redirect for the apex redirect rather than app code.

Initial Pages settings:

```text
Project name: ha-ggis-hub
Production branch: main
Build command: pnpm install --frozen-lockfile && pnpm run build
Output directory: dist
Node version: 22
Preview deployments: enabled
```

If Cloudflare Pages build image makes Rust/WASM setup awkward, use GitHub Actions to install Node + Rust + wasm-pack, run the full gate, build `dist`, then deploy with Wrangler.

Create `public/_headers` before production:

```text
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), sync-xhr=(), usb=(), web-share=(self), xr-spatial-tracking=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Origin-Agent-Cluster: ?1
  Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: data:

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/
  Cache-Control: public, max-age=0, must-revalidate
```

Create `public/_redirects` when routes exist:

```text
/wild-haggis-survivors/*  /wild-haggis-survivors/index.html  200
/*  /index.html  200
```

Only enable the WHS route fallback once WHS is actually mounted as a static sub-app.

Source map policy:

- Production: no public source maps unless hidden maps are uploaded privately to an error tracker.
- Preview: source maps allowed for debugging.
- Release gate must check `dist` for accidental `.map` files.

---

## 12. Agent Operating Mode

Create `docs/foundation/08-agent-operating-mode.md`.

Rules for agents:

1. Inspect current branch/status and relevant docs before changing code.
2. Never implement from an outdated plan without checking ADRs and quality gates.
3. Prefer one coherent vertical slice over scattered edits.
4. Use TDD for core logic.
5. Add or update tests in the same slice as code.
6. Run the relevant gate before reporting success.
7. Do not leave TODOs in production code unless tracked by an issue and explicitly allowed.
8. Do not add dependencies without updating the dependency rationale.
9. Do not weaken lint/type/test gates to pass.
10. If a design changes, update the ADR or foundation doc in the same slice.
11. For game behavior, test headless logic where possible rather than relying only on visual inspection.
12. For browser behavior, use Playwright screenshots/console checks instead of “looks fine.”
13. Every public-facing slice must include a human-playability check: can a real visitor understand and use this without being coached?

Autopilot pattern:

- Planner writes a bite-sized plan.
- Builder implements a slice.
- Reviewer checks spec compliance.
- Reviewer checks code quality/security/performance.
- Gate runner verifies commands.
- Reflection updates docs/skills if the workflow changed.

---

## 13. Documentation Files to Create First

### Task F1: Archive the seed plan

Objective:

Preserve the original plan as provenance, but make it clear it is superseded.

Files:

```text
Create: docs/archive/2026-05-22-original-ha-ggis-hub-plan.md
Move/copy from: 2026-05-22-ha-ggis-hub-new-repo.md
Create: docs/plans/2026-05-22-ha-ggis-hub-foundation.md
```

Acceptance:

- The old plan is preserved.
- The new foundation plan is canonical.
- README points to the foundation docs once README exists.

### Task F2: Project charter

Create:

```text
docs/foundation/00-project-charter.md
```

Must include:

- project identity
- ha.ggis domain joke
- portfolio purpose
- non-negotiable quality statement
- relationship to Wild Haggis Survivors
- definition of “First Perfect Slice”

### Task F3: Engineering principles

Create:

```text
docs/foundation/01-engineering-principles.md
```

Must include:

- no slop
- no dependency soup
- deterministic core preference
- tests as product feature
- agent-ready architecture
- small but excellent scope

### Task F4: Architecture options and ADR

Create:

```text
docs/foundation/04-architecture-options.md
docs/foundation/05-stack-decision-record.md
```

Must compare:

- Phaser
- Pixi/custom loop
- Rust/WASM + TS renderer
- Bevy WASM
- custom WebGL2/WebGPU

Recommended decision:

```text
Adopt Rust/WASM core + TypeScript/Vite host + replaceable renderer.
```

### Task F5: Quality gates

Create:

```text
docs/foundation/07-quality-gates.md
```

Use the gates from this plan as the initial policy.

### Task F6: Agent operating mode

Create:

```text
docs/foundation/08-agent-operating-mode.md
```

This should be the first thing future autonomous agents read.

---

## 14. Implementation Roadmap After Foundation Docs

Do not begin this until F1-F6 exist.

### Phase 1: Toolchain skeleton

Files:

```text
package.json
pnpm-lock.yaml
tsconfig.json
vite.config.ts
eslint.config.js
prettier.config.js
Cargo.toml
crates/hub-core/Cargo.toml
crates/hub-wasm/Cargo.toml
.github/workflows/ci.yml
```

Acceptance:

- `pnpm install --frozen-lockfile` works after lockfile exists.
- `cargo fmt --all -- --check` works.
- `cargo test --workspace` works.
- Empty Vite app builds.
- Empty Rust workspace builds.

### Phase 2: Rust hub core

Files:

```text
crates/hub-core/src/lib.rs
crates/hub-core/src/math.rs
crates/hub-core/src/input.rs
crates/hub-core/src/simulation.rs
crates/hub-core/src/interaction.rs
crates/hub-core/src/registry.rs
```

Core behavior:

- fixed-size room bounds
- player position
- input vector
- deterministic tick update
- clamped movement
- door definitions
- proximity detection
- interaction result

Tests:

- player cannot leave bounds
- zero input does not move
- diagonal input is normalized/clamped
- player near playable door can launch
- player near locked door receives locked state
- registry rejects playable games without route

### Phase 3: WASM wrapper

Files:

```text
crates/hub-wasm/src/lib.rs
src/wasm/loadHubCore.ts
```

Acceptance:

- WASM build works.
- TypeScript can initialize core.
- Browser smoke test verifies WASM initializes.
- Boundary has no per-frame object soup.

### Phase 4: TypeScript host and adapter

Files:

```text
src/app/bootstrap.ts
src/engine/GameModule.ts
src/engine/fixedTimestep.ts
src/engine/input.ts
src/engine/lifecycle.ts
src/games/registry.ts
src/navigation/launchGame.ts
```

Acceptance:

- strict TypeScript passes.
- registry tests pass.
- launch URL tests pass.
- lifecycle tests verify pause/resume/destroy behavior.

### Phase 5: First playable scene

Files:

```text
src/render/*
src/app/bootstrap.ts
src/ui/directPlay.ts
src/style.css
index.html
```

Acceptance:

- visitor sees ha.ggis brand.
- haggis can move.
- WHS door prompt appears.
- E launches configured route.
- direct play button works.
- no console errors.
- Playwright smoke passes.

### Phase 6: Deployment hardening

Files:

```text
public/_headers
public/_redirects
docs/foundation/09-release-definition.md
docs/deployment/cloudflare-pages.md
```

Acceptance:

- headers are documented and tested.
- redirects are documented.
- source map policy exists.
- `dist` does not contain accidental maps/secrets.
- Cloudflare preview can be used safely.

---

## 15. First Canonical Commands

After implementation begins, prefer pnpm and cargo.

Bootstrap candidate:

```bash
corepack enable
pnpm install
rustup target add wasm32-unknown-unknown
rustup component add rustfmt clippy llvm-tools-preview
cargo install cargo-nextest cargo-llvm-cov cargo-audit cargo-deny cargo-machete wasm-pack
```

PR gate candidate:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --workspace --all-features
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown --all-features
cargo audit
cargo deny check
pnpm exec prettier . --check
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
pnpm exec vitest run --coverage
pnpm run build
pnpm exec playwright test --project=chromium
```

---

## 16. Risks and Mitigations

### Risk: Overengineering before visible progress

Mitigation:

Keep the first perfect slice small. Use Rust/WASM for meaningful deterministic core, but do not build a full engine before a playable room exists.

### Risk: WASM complexity slows everything

Mitigation:

Keep `hub-core` tiny and native-testable. Keep `hub-wasm` as a thin wrapper. Do not move DOM/audio/rendering into Rust.

### Risk: Custom rendering becomes a rabbit hole

Mitigation:

Use Canvas2D or Pixi for the first room unless a custom renderer ADR proves the value. Add custom shader/WebGPU effects later as progressive enhancement.

### Risk: Quality gates become too heavy too early

Mitigation:

Introduce gates in tiers:

- foundation gate immediately
- PR gate when skeleton exists
- release gate before public launch
- nightly gate once there is enough code to fuzz/benchmark

Do not delete gates to go faster. Stage them deliberately.

### Risk: Placeholder visuals undermine first impression

Mitigation:

Use deliberate minimal art direction. Programmer art is allowed internally, but the public first slice needs intentional style.

### Risk: WHS mount strategy causes routing/deployment mess

Mitigation:

First use a clear external/configured WHS URL if needed. Only mount under `/wild-haggis-survivors/` when the build and route strategy are tested.

---

## 17. Open Questions to Resolve Before Scaffolding

1. Renderer for first slice:
   - Canvas2D custom minimal renderer?
   - PixiJS renderer?
   - Phaser fallback?

Recommended default:

```text
Canvas2D or Pixi, decided by desired visual complexity. Avoid Phaser as the default unless speed beats distinctiveness.
```

2. UI framework:
   - none/vanilla TypeScript?
   - small framework?

Recommended default:

```text
No large UI framework initially. Use semantic HTML/CSS and TypeScript modules. Add a framework only when complexity earns it.
```

3. Package manager:

Recommended:

```text
pnpm
```

4. Rust build tool:

Recommended:

```text
wasm-pack initially, with wasm-bindgen under the hood.
```

5. Production WHS route:

Recommended:

```text
Start configurable. Aim for /wild-haggis-survivors/ once WHS build base and deployment copy are proven.
```

---

## 18. Definition of Done for Foundation Phase

The foundation phase is done when:

- Old seed plan is archived.
- New foundation docs exist.
- Stack decision record exists.
- Dependency policy exists.
- Quality gate policy exists.
- Agent operating mode exists.
- First Perfect Slice is defined.
- Implementation roadmap is accepted.
- No app scaffold has been created prematurely from the old plan.

Only then should implementation begin.

---

## 19. Recommended Next Action

Execute the foundation-doc batch, not the app scaffold.

Next implementation plan should create:

```text
docs/archive/2026-05-22-original-ha-ggis-hub-plan.md
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
```

Then run a review pass against the standard:

```text
Does this foundation make implementation obvious?
Does it prevent slop?
Does it justify the stack?
Does it enable agent autonomy safely?
Does it make the project technically impressive?
Does it preserve the haggis charm?
```

If yes, scaffold.

If no, strengthen the foundation before touching code.
