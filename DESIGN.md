# ha.ggis Hub — Design System

Status: canonical design system
Scope: hub-specific design tokens (colour, typography, grid, motion, elevation, sound, voice, ornament, register policy)
Sister: [Wild Haggis Survivors DESIGN.md](../wild-haggis-survivors/DESIGN.md) — same FRAME, different VALUES
Related: [ADR-0006 Highland Dawn Bothy](docs/decisions/0006-hub-visual-direction-highland-dawn-bothy.md), [Project charter](docs/foundation/00-project-charter.md), [Haggis canon](docs/research/2026-05-23-haggis-canon-and-whs-design-language.md)

## Purpose of this document

ADR-0006 locked the hub's **mood** (Highland Dawn Bothy — painterly storybook bothy interior at first light). It did not lock the **technique** — what primitives are allowed, what grid, what AA policy, what ornament budget. Without a technique spec, every art iteration is a vibes-check against a moving target.

This document is the missing technique spec. Sister project WHS already has the equivalent at the same level of crispness (`DESIGN.md` in the WHS repo) — this hub doc deliberately mirrors that **frame** and only the **frame**. The hub picks its own values from the shared haggis canon (Highland setting, Scots voice, wild-haggis protagonist) and does not adopt WHS's tokens wholesale. Family resemblance comes through the shared NOUNS (`peat`, `heather`, `whisky`) appearing in both palettes, not through shared hex.

```yaml
name: ha.ggis Hub
register: Highland Dawn Bothy
mood: painterly storybook, warm, lobby-quiet, intimate
medium: Canvas2D composite + painted WebP backdrop + procedural fallback + serif HTML chrome
sister-resemblance-rule: shared canon nouns (peat, heather, whisky), not shared hex
```

## Colours

Tokens namespaced like WHS: surfaces, brand+action, semantic, art families, text family, narrative accents. Every token has a documented role.

```yaml
colors:
  # ── Surfaces ────────────────────────────────────────────────
  # Warm-dark palette — bothy at dawn, embers banked, lit from within.
  background: "#1a0e08"             # Ink-deep — outermost letterbox, deepest shadow
  surface: "#24170f"                # Warm bothy brown — primary panel fill
  surface-dim: "#150a05"            # Near-black — text stroke, deepest recess
  surface-bright: "#3a2418"         # Peat brown — secondary surface, beam wall
  surface-container-lowest: "#0a0604" # Deepest ink — boot fade base
  surface-container-low: "#1a0e08"    # Default ambient
  surface-container: "#24170f"        # Card / overlay interior
  surface-container-high: "#3a2418"   # Tertiary button fill
  surface-container-highest: "#5a3a20" # Secondary button fill, mid-warm wood
  on-surface: "#f0e6c8"              # Tatties-cream — default body text
  on-surface-variant: "#c4a878"      # Oat-tan — secondary labels
  outline: "#3a2418"                 # Standard border, beam edge
  outline-variant: "#5a3a20"         # Fine-print dividers, wood grain

  # ── Brand & action ──────────────────────────────────────────
  # Active is warm dawn-amber; locked is heather-purple; ornament is brass.
  primary: "#e4a020"                 # Neeps-orange — launchable door lantern, primary glow
  on-primary: "#1a0e08"
  primary-container: "#c8842a"       # Whisky-amber — primary hover / pressed
  secondary: "#7a4a9c"               # Heather-purple — locked door, dawn sky shoulder
  on-secondary: "#f0e6c8"
  secondary-container: "#9c6abc"     # Heather lit — locked hover state
  tertiary: "#c8842a"                # Whisky-amber — brass detail, polished signpost
  on-tertiary: "#1a0e08"

  # ── Semantic ────────────────────────────────────────────────
  error: "#c44218"                   # Ember-red — failure (kept rare; ember is the only red)
  on-error: "#f0e6c8"
  success: "#5a7a5a"                 # Bracken-green — confirmation, hung herbs
  warning: "#e4a020"                 # Neeps-orange shared with primary (warm warn)
  crit: "#fff0c8"                    # Flame-core white — rare, hottest highlight

  # ── Art palette — six families, sprite anchors ──────────────
  # These ramps drive every procedural and sprite draw in the scene.
  # Family names share with WHS where canon does (peat, heather, whisky);
  # hub-unique families (oat, tatties, neeps, dawn, cairn, bracken)
  # appear after the shared ones to make the lineage visible in the file.

  # — Shared canon families —
  art-peat-deep: "#1a0e1a"           # Deepest peat shadow (red-violet shift)
  art-peat-shadow: "#2a1408"
  art-peat-mid: "#3a2418"            # Wall and floor mid-tone
  art-peat-warm: "#5a3a20"
  art-heather-shadow: "#28182c"
  art-heather-mid: "#7a4a9c"         # Locked-door halo, dawn sky shoulder
  art-heather-bright: "#9c6abc"
  art-whisky-deep: "#7a5018"
  art-whisky-mid: "#c8842a"          # Brass handle, polished signpost
  art-whisky-bright: "#e4b048"

  # — Hub-unique families —
  art-oat-dark: "#7a5230"            # Plank lit body
  art-oat-mid: "#a07050"
  art-oat-bright: "#c4a878"          # Lit wood, oat-tan plaster
  art-tatties-cream: "#f0e6c8"       # Paper, text, plaster highlight
  art-tatties-warm: "#f4d8a0"
  art-neeps-mid: "#e4a020"           # Lantern glow, ember
  art-neeps-bright: "#ffd078"
  art-dawn-pink: "#f4c8b8"           # Window wash, brightest sky
  art-dawn-peach: "#f4b078"
  art-cairn-stone: "#b8a878"         # Rim stones, sill, hearthstone highlight
  art-cairn-dark: "#6a4828"
  art-bracken-green: "#5a7a5a"       # Hung herbs, framed-picture accent
  art-ember-red: "#c44218"           # Active ember (small accent only)
  art-ember-hot: "#ffb028"           # Hottest ember tip

  # — Mascot haggis family —
  # The Wee Chieftain is the hub's food-shaped mascot. These stops are
  # deliberately warmer and glossier than the bothy wood ramp so the
  # character reads as cooked casing, not furniture.
  art-haggis-ink: "#1a0e08"          # Body outline, legs, eye underlay
  art-haggis-casing-deep: "#3a1e12"  # Lower casing shadow
  art-haggis-casing-mid: "#7a3f24"   # Primary cooked casing
  art-haggis-casing-light: "#9c5630" # Lit casing face
  art-haggis-casing-highlight: "#b46a38"
  art-haggis-seam: "#2a1408"         # Casing seams and low smile
  art-haggis-crumb-light: "#f4d8a0"  # Pale exposed oat/stuffing cutaway
  art-haggis-crumb-dark: "#3a2a1a"   # Dark oat/stuffing speck
  art-haggis-crumb-mid: "#6a4a28"    # Warm oat/stuffing patch
  art-haggis-oat: "#d8b46a"          # Bright oat flecks
  art-haggis-eye: "#f0e6c8"          # Cream eye whites
  art-haggis-pupil: "#0a0604"
  art-haggis-eye-glint: "#fff0c8"
  art-haggis-twine: "#c4a878"        # Tied-end collar
  art-haggis-twine-shadow: "#5a3a20"
  art-haggis-tartan-red: "#9c2018"   # Tiny collar accent only
  art-haggis-tartan-green: "#1f4628"

  # ── Text family (warm cream → ink, six stops) ───────────────
  text-bright: "#fff0c8"             # Flame-core — display-only emphasis
  text-primary: "#f0e6c8"            # Tatties-cream — default body
  text-secondary: "#c4a878"          # Oat-tan — secondary labels
  text-muted: "#a08868"              # Subdued body
  text-subtitle: "#8a6f4a"           # Italic context — door titles, italics
  text-dim: "#5a3a20"                # Footer / fine print
  text-hint: "#3a2418"               # On-light backgrounds only

  # ── Narrative accents ───────────────────────────────────────
  dawn-glow: "#f4c8b8"               # Dawn pink — window beam wash
  hearth-glow: "#ffb028"             # Ember bloom on floor
  lantern-halo: "#e4a020"            # Launchable lantern fixture
  locked-halo: "#7a4a9c"             # Locked door fixture (heather counterpoint)
```

## Typography

Hub voice is humanist serif — book-feel, lobby-quiet. WHS uses monospace stroked titles (arcade register). This is the deliberate visual contrast that signals "different product, same family".

```yaml
typography:
  # Display + body share one humanist serif family. Pixel-font is used
  # ONLY for in-canvas signage (door labels, prompt) where it reads as
  # hand-painted lettering on wood. Two registers, one each per surface.

  # — HTML chrome (CSS-rendered) —
  display:
    fontFamily: '"Old Standard TT", Georgia, "Iowan Old Style", "Apple Garamond", Baskerville, "Times New Roman", serif'
    fontSize: 48px
    fontWeight: "400"
    lineHeight: 56px
    fontStyle: normal
    letterSpacing: 0.01em
    notes: |
      Self-hosted Old Standard TT shipped 2026-05-27: three woff2 files
      (latin subset, ~73 KB total) in public/fonts/. The italic 400 is
      preloaded in <head> so the chrome renders in-font on first paint.
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 34px
    letterSpacing: 0.01em
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 22px
  italic-context:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: 13px
    fontWeight: "400"
    fontStyle: italic
    lineHeight: 18px
    notes: Hint banner, direct-play link, status line.

  # — In-canvas signage (pixel-font, sprite-rendered) —
  signage:
    family: "pixel-font (hand-painted, see src/render/sprites/pixel-font.ts)"
    glyphHeight: 7 px source, scaled 2× or 4× to surface
    cases: UPPERCASE ONLY — pixel-font is a single-case family
    role: door signs, prompt text, mantel inscription, hearth lintel motto
```

## Grid + spacing

```yaml
spacing:
  # HTML chrome — fluid via rem.
  chrome:
    xs: 0.4rem
    sm: 0.6rem
    md: 0.85rem
    lg: 1.2rem
    xl: 2rem

  # Canvas world — integer pixel grid. The bothy is authored at 540×360
  # internal resolution and CSS-scales to the viewport with object-fit:
  # contain so any wider viewport letterboxes deeper peat-brown around
  # the scene (frames the bothy as a picture, never stretches it).
  canvas:
    internalWidth: 540
    internalHeight: 360
    aspect: "3:2"               # Locked. Letterbox over stretch.
    coordPolicy: "integer pixels — every fillRect snaps"
    backWallThick: 96
    sideWallThick: 24
    frontWallThick: 24
    smoothingEnabled: false     # ctx.imageSmoothingEnabled = false (pixel-honest)
    devicePixelRatio: "canvas.width/height scaled by Math.round(devicePixelRatio); ctx.setTransform(dpr,0,0,dpr,0,0) each frame; surface exposes logical 540×360 (shipped 2026-05-24)"
```

## Elevation + ornament

```yaml
elevation:
  # Hub is warm + glowing, not flat-pixel like WHS. Smooth radial
  # gradient bloom is allowed for the hearth glow and dawn pool;
  # everything else is hard-edged.

  base:
    dim: 0

  overlay-vignette:
    color: "#1a0e08"
    alpha-corner: 0.55
    alpha-center: 0
    notes: "Soft falloff at corners — focuses attention inward."

  beam-dawn:
    source: "back-wall window centre"
    fan-half-width-top: 36 px
    fan-half-width-bottom: 110 px
    primary-color: "{colors.art-dawn-pink}"
    edge-color: "{colors.art-dawn-peach}"
    register: "smooth radial — single deliberate exception to hard-edged policy"

  hearth-bloom:
    radii: [120, 95, 70, 45] px
    alpha-per-ring: [0.055, 0.110, 0.165, 0.220] (× flicker)
    register: "smooth radial — second deliberate exception"

  painted-storybook-backdrop:
    role: "primary live art mass; hand-painted Highland Dawn Bothy backdrop carries the room, dawn view, door staging, hearth, and floor"
    asset: "public/art/bothy-storybook-backdrop.webp"
    source: "generated from the ADR-0006 visual brief, normalized to 1080×720 WebP"
    runtime-policy: "draw with CanvasRenderingContext2D.drawImage once loaded; keep procedural Canvas2D diorama as no-image fallback"
    overlay-policy: "player haggis, interaction prompt, vignette, particles, and runtime state remain Canvas2D overlays"

  panoramic-dawn-view:
    role: "fallback back-wall art mass; replaces the small central window when the painted backdrop has not loaded"
    size: "432×108 px on the canonical 540×360 surface"
    value-policy: "heather-purple sky, peach dawn band, cream sun core, dark mountain silhouettes, bracken foreground"

  hearth-inglenook:
    role: "large stone focal mass behind the hearth so the fire reads as architecture, not a loose UI tile"
    outer-arch: "132×134 px at the room centre"
    value-policy: "lit-stone surround, cool shadow interior, cream block highlights"

  door-fixtures:
    launchable: "lit lantern (PX.haloWarm glow) + full-opacity bone sign — drawLantern + drawSign in canvas-room.ts — shipped 2026-05-27"
    locked: "dimmed sign only — 0.65 opacity, PX.haloCool label text — drawLockedDoorSign in canvas-room.ts — shipped 2026-05-27"
    rationale: "launchable door is the primary CTA; locked door reads 'coming' without competing — opacity + colour signal the distinction, not absence"

ornament:
  # Ornament budget per scene: at most 3 framed objects, 2 dried-herb
  # bundles, 2 domestic prop anchors, 1 mantel inscription, 1 hearth
  # lintel motto, 1 structured floor runner, and 1 hearth-inglenook
  # focal structure. Keep quiet zones.
  framed-objects-max: 3
  framed-objects-spent: 1       # 1 unfinished Highland painting (left back wall) — shipped 2026-05-24
  dried-herb-bundles-max: 2
  dried-herb-bundles-spent: 2   # 2 bundles from ceiling beam (x=80, x=460) — shipped 2026-05-24
  domestic-props-max: 2
  domestic-props-spent: 2       # 1 back-wall crockery/herb shelf + 1 floor log basket — shipped 2026-05-27
  painted-storybook-backdrop-spent: 1 # 1080×720 WebP primary backdrop — shipped 2026-05-27
  panoramic-dawn-view-spent: 1 # fallback 432×108 px Highland dawn panorama — revised 2026-05-27
  floor-runner-spent: 1         # fallback structured heather runner between Wee Chieftain and hearth — revised 2026-05-27
  hearth-inglenook-spent: 1     # fallback stone focal mass behind hearth — shipped 2026-05-27
  inscriptions-max: 2          # mantel + lintel
  inscriptions-spent: 2        # hearth lintel + mantel — both shipped
  quiet-zone-policy: "upper-left and lower-right of the floor stay empty"
```

## Mascot — Wee Chieftain

```yaml
mascot:
  name: "Wee Chieftain"
  shape: "haggis pudding — food-shaped first, creature second"
  rationale: |
    A haggis is a Scots word for a savoury pudding (oatmeal, offal, suet,
    cased in stomach) before it was adopted as the name of a mythical creature.
    The Wee Chieftain reads as the food artefact: squat oval casing, tied ends,
    oat cutaway — then secondarily as a mascot with face and legs.
  renderer: "src/render/bothy-haggis.ts — drawBothyHaggis(ctx, cx, cy, scale, frame)"
  design-units: "body outline ~50 wide × ~30 tall; legs ~7 below baseline; tied ends ~±25 from centre"
  render-scale: 2.0   # HAGGIS_SCALE in canvas-room.ts — body 100 px wide on 540 px canvas
  storybook-scale: 1.18   # used when painted backdrop is loaded
  placement: "doorway centre, 10×scale px above floor contact point; hard-contact shadow r=68"
  animation: "breathY bob (sine, 6s period), frontLegY / backLegY walk swing"

  design-decisions:
    brows:
      rule: "one bold arc per eye — 86% alpha, 0.80×scale lineWidth"
      rationale: "six low-alpha strokes were invisible at room scale; clear arcs read as authored expression"
    eyes:
      outline: "4.8×scale"
      white: "4.0×scale"
      eyelid: "rx=4.2×scale, ry=1.2×scale — half-covers top of white; directed rather than vacant"
      pupil: "2.2×scale — large enough to track"
    cutaway:
      position: "left-of-centre (offsetX=3 design units from body centre)"
      rationale: "centred cutaway read as wound; left-of-centre reads as cross-section window into stuffing"
    face-zone:
      rule: "casing seam strokes crossing the face area use alpha ≤ 0.18"
      rationale: "high-alpha seams competed with eyes and smile at room scale"
```

## Motion

```yaml
motion:
  ease-default: "smoothstep-equivalent (CSS: ease, JS: sine in-out)"

  # — UI chrome —
  hint-fade: 700ms ease
  hint-dwell-before-fade: 6000ms
  hint-fade-on-input: true

  # — Scene animation —
  hearth-flicker: 7 fps (HEARTH_FRAME_COUNT = 4)
  ember-spark-life: ~1500ms per particle, 5 concurrent
  smoke-wisp-life: ~3000ms per particle, 8 concurrent
  dust-mote-drift: ~5000ms per cycle, 14 concurrent

  # — A11y —
  reduced-motion:
    current: "dampen — particles + hearth flicker + dawn pulse suppressed; walk + door launch preserved; status 'reduced motion · the bothy bides quiet' shown (shipped 2026-05-24)"
```

## Sound

```yaml
sound:
  policy: "explicit opt-in only; no autoplay, no preload on first paint"
  control:
    selector: ".scene-music"
    placement: "top-right chrome, after direct/fallback links in DOM tab order"
    visible-labels: ["music", "music on"]
    accessible-labels: ["Play hub music: {track title}", "Pause hub music"]
  playlist:
    - title: "Flower of Scotland"
      audio: "public/music/flower-of-scotland.mp3"
      midi-source: "public/music/flower-of-scotland.mid"
      source-url: "https://www.wario.style/s/7u0vk4ok"
    - title: "Scotland the Brave"
      audio: "public/music/scotland-the-brave.mp3"
      midi-source: "public/music/scotland-the-brave.mid"
      source-url: "https://www.wario.style/s/tw6IWdAL"
  runtime:
    implementation: "HTMLAudioElement playlist controller in src/app/music.ts"
    volume: 0.38
    advance: "on ended, move to next track and keep playing only if user already opted in"
```

## Voice + register

```yaml
voice:
  language: "Scots-tinted English"
  register: "warmer + slower than WHS combat voice; welcoming, lobby-mood"
  audience: "first-time visitor who may or may not have heard the URL pun"
  pronouns: "ye, ye'r, yer"
  contractions: "wi', tae, awa', wouldnae, cannae, dinnae"
  greeting-form: "awa' in" (come in)

  # — Locked phrases (tested, do not modify without updating tests) —
  locked:
    launchable-prompt: "AWA' IN — {GAME TITLE}\nPRESS ENTER"
    locked-prompt:     "{DOOR TITLE}\nCOMIN' SOON."  # dynamic — door title from registry; see formatPromptText in canvas-room.ts
    none-prompt:       ""
    direct-play-link:  "awa' in →"
    hint-banner:       "walk wi' the arrows · chap a door tae go in"
    status-reduced-motion: "reduced motion · the bothy bides quiet"
    status-error:      "the bothy wouldnae load — try the corner link"

  # — Open voice budget (free to author) —
  open:
    mantel-inscription: "Hame's best."  # shipped 2026-05-27 — shortened to fit pixel-font (64 px at scale 1); drawMantelInscription in canvas-room.ts (fallback path only; archY−9 px above inglenook arch)
    hearth-lintel-motto: "Bide a while."  # shipped 2026-05-24 — rendered in canvas-room.ts drawHearthLintelMotto
    coming-soon-door:   "Comin' wi' the next moon."
    framed-painting-caption: "(unfinished)"  # in-painting content shipped 2026-05-24; caption not rendered (pixel-font space too tight at this scale)
```

## Register policy — when smooth, when pixel-hard

The current implementation mixes pixel-art with smooth Canvas2D. ADR-0006 locked the painterly mood without resolving this. **This is the rule.**

```yaml
register-policy:
  default: "smooth Canvas2D, intentional anti-aliasing"
  rationale: |
    Hub's painterly storybook mood reads correct against smooth-AA primitives
    (the WHS-port haggis renderer is the best-rendered piece in the scene
    precisely because it commits to smooth). Pixel-hard authoring has been
    attempted and consistently produces output the owner has called muddy.

  exceptions:
    pixel-font-signage:
      where: "in-canvas signage (door signs, prompt, mantel inscription, lintel motto)"
      why: "reads as hand-painted lettering on wood; the only hard-edged register"
    bayer-dither-effects:
      where: "DELETED 2026-05-24 — palette.ts ditheredBloom / ditheredBloomBiased / ditheredAlphaMask / radialEllipseAlpha / ditherZoneInternal / ditherBoundary"
      why: "remnants of a locked-but-incomplete migration; smooth-only commitment verified end-to-end via visual gate"
      action: "done — all six functions and their tests removed; HardPixelContext kept for hardContactShadow"

  forbidden:
    mixed-mode-walls: "do not author the same surface in both pixel and smooth"
    procedural-painterly: "do not attempt brush-texture approximations in code"
```

## What this document is NOT

- Not a moodboard (see ADR-0006 for mood; this is technique)
- Not a re-statement of the project charter (see `docs/foundation/00-project-charter.md`)
- Not a roadmap (see `docs/plans/`)
- Not a sister-project compatibility surface (WHS owns its own tokens; this hub owns its own)

## Use rules

- Every NEW colour reference in code MUST resolve to a token here. No raw hex literals in new code.
- Every NEW typographic reference MUST resolve to a `typography.*` role here. No ad-hoc font-size values.
- Every NEW spacing value MUST snap to `spacing.chrome` or `spacing.canvas`.
- ADR drift (e.g., the daylight window in the current build) is a documented violation against this spec — see `register-policy.forbidden`. The visual gate at [`tests/golden/`](tests/golden/) catches this class of drift automatically; run `node scripts/run-visual-gate.mjs verify` before merging anything that touches the renderer.

## Sister-project comparison (orientation, not coupling)

| Surface | WHS | Hub |
|---|---|---|
| Mood | Highland-at-dusk, pulp-arcade, Scots-combat | Highland-dawn-bothy, painterly storybook, Scots-welcome |
| Background | Night-moor navy `#1a1a2e` | Ink-deep brown `#1a0e08` |
| Brand primary | Scottish-blue `#005eb8` | Neeps-orange `#e4a020` |
| Secondary | Whisky-gold `#d4a017` | Heather-purple `#7a4a9c` |
| Typography | Monospace, bold, stroked, square | Humanist serif, regular, soft, book-feel |
| Corners | Square (0px) | Subtle (2px) only on chrome pills |
| Grid | 8 px snap | 1 px (canvas), 0.4 rem (chrome) |
| Motion | Punch-yoyo, screen-shake, hit-freeze | Drift, fade, flicker — quiet ambient |
| Register | Hard-pixel everywhere | Smooth default; pixel-font signage only |
| Shared canon | peat, heather, whisky (vocabulary only) | peat, heather, whisky (vocabulary only) |

The two products read as related-but-distinct. That is the design promise.
