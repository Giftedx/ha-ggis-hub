# Rendering rulebook — ha.ggis Hub bothy scene

**Status:** living document — updated after the WHS bothy port (2026-05-23) superseded several original hard-pixel rules. The spirit is unchanged: no programmer art, every draw call obeys these rules or the scene reads wrong.
**Origin:** brutal art-direction review (see chat log + `palette.ts`). Rules revised when the dithered-glow approach was tried against the WHS warm-plaster substrate and read as noise rather than atmosphere.

The reviewer's verdict that crystallised this doc: *"Every pixel obeys the same rules or none of it works. Your actual risk isn't skill ceiling; it's that you keep adding features before enforcing a single rendering rulebook."*

## 1. Glow policy — smooth for natural light, hard-pixel elsewhere

The original rule (all glows must be dithered) was written before the WHS bothy port. When dithered halos were tried against the warm peat-plaster substrate they read as static noise, not warm light. The rule was revised.

**STILL FORBIDDEN:**
- `createRadialGradient` / `createLinearGradient` — reads flat and CSS-like against the hand-drawn substrate
- Gaussian-style blurry shadows
- Anti-aliased browser `fillText` for diegetic in-scene labels (see Rule 6)

**PERMITTED for natural light sources (lantern, hearth, dawn beam):**
- Stacked translucent ellipses: up to 4 layers, alpha ≤ 0.12 per layer, all layers the same hue. The sum reads as warm atmospheric light. This is NOT a radial gradient — it is a few discrete opacity steps that keep the painter's touch visible at native resolution.
- The pulsing `* flickerPhase` multiplier is fine; it gives the lantern and embers life.

**REQUIRED for everything else (interaction highlights, door glow, contact shadows):**
- Hard-pixel fills at fixed alpha (0.3–0.5). No stacked fades.
- Interaction glow on doors: one or two concentric ellipses at the same hue, fixed low alpha.

## 2. Light direction — single source, baked

- Sole in-scene light source: the back-wall window beam. Dawn pours forward+down through the window onto the floor.
- Light is BAKED INTO PIXEL COLOUR:
  - Inside the dawn pool → use lit/dawn tokens from `palette.ts` (`PALETTE.litWoodMid`, `PALETTE.dawnGold`, etc.)
  - Edge / spill → `PALETTE.edgeTan`, `PALETTE.edgePink`, `PALETTE.edgeBrown`
  - Outside → shadow tokens (`PALETTE.shadowWoodMid`, `PALETTE.shadowCool`, etc.)
- `lightZoneAt(x, y, beam)` in `palette.ts` is the single source of truth for zone classification.
- The pool/shadow boundary on the floor: 1–2px dithered transition, not a razor diagonal.
- Light TOUCHES things:
  - 1 warm pixel at the bottom edge of the haggis (light spill onto the creature from below).
  - 1 warm pixel inside the door frame on the lit side.
  - Hearth glow: the broad translucent ellipses in `renderRoom` handle the floor wash; no extra per-plank dithering needed beyond what the WHS floor drawer provides.

## 3. Shadow shape — `hardContactShadow`, not invented variants

Contact shadows use `hardContactShadow(ctx, cx, footY, halfWidth, depth)` from `palette.ts`. This function draws a hard-pixel ellipse at fixed alpha (0.40) — same alpha for every scanline, no fade-with-distance.

Do not invent a new contact shadow variant. If the existing function does not fit a new use case, extend `palette.ts` and document the case; do not inline it.

No nested shrinking ellipses with varying alpha for shadows (that is the prohibited soft-glow pattern applied to shadows).

## 4. Outline policy — chiaroscuro for geometry, body-mass ring for protagonist

**Geometry (doors, walls, floor planks):**
- 1px hard outline ONLY on the SHADOW SIDE (away from light source).
- Use `PALETTE.ink` for the outline pixel. Never a full perimeter outline.
- Rim-light on the lit side: 1px hard pixels in `PALETTE.dawnHighlight`.

**Protagonist (bothy haggis):**
- The sack body uses a slightly-larger `sackBase` quadratic path beneath the `sackMid` fill path. This reads as the body-edge line in low-key dim bothy lighting and is correct — the haggis is the hero element and earns a full-perimeter ink ring at this scale.
- Tied neck (twine wraps, fabric ears), face (eyes, snout, smile), legs: no separate outline; the layering of ink-dark under lighter fills provides the depth.

## 5. Palette discipline — DESIGN.md tokens, not invented hex

The `PALETTE` object in `palette.ts` exposes tokens for computational use (light-zone classification, beam geometry, shadow color). The `PX` constant in `canvas-room.ts` provides local bothy rendering tokens.

**Rule:** every colour in every draw function must trace back to a named token in `DESIGN.md` (the source-of-truth palette). Inline hex is acceptable ONLY inside a named constant block (`PX`, `BOTHY_HAGGIS_PALETTE`, etc.) — never inside draw logic.

If a new colour is genuinely needed, add it to `DESIGN.md` and then to the appropriate constant block. Do not invent off-palette hex inside function bodies.

## 6. Text policy — pixel-font sprite only

`fillText` with browser fonts is FORBIDDEN inside the canvas. Browser fonts are anti-aliased and break the aesthetic.

All diegetic labels (door signs, interaction prompts) use `renderPixelText` / `measurePixelText` from `src/render/sprites/pixel-font.ts`. The pixel font is fully implemented and supports the ASCII range used by all current labels.

## 7. Tile variation — break the grid

- Wall plaster: the WHS `drawWhsBothyWalls` port provides variation via its own internal geometry. Do not override with a flat fill.
- Floor planks: `drawWhsBothyFloor` provides vertical seam alternation + knot positions. Preserve; do not replace with a uniform fill.
- New tiles added after the WHS port must provide ≥4 visually distinct variants in rotation.

## 8. Sprites in the scene — match the bar

- The lantern sprite (hard pixels, clear silhouette, palette-discipline) is the fidelity bar for hard-pixel sprites.
- Procedural draws (haggis, hearth, bothy walls) follow the WHS-quality AA-smooth Canvas2D register: ellipses, arcs, layered fills. The two registers coexist; what must not happen is a mix WITHIN one draw (e.g. shaded body + flat-coloured legs on the same sprite).
- No sprite ships with mixed register.

## 9. Composition policy — break the centerline

- Haggis spawn: `(340, 540)` in 1000×1000 world space — left third.
- Hearth and window stay center for the beam geometry, but the protagonist breaks that axis.
- Avoid stacking three centered elements on the same vertical axis.

## When to break a rule

- Performance: if a strict implementation tanks frame rate (>2ms/frame for a single effect), document the deviation and verify via a timing measurement before shipping.
- Aesthetic evidence: if a rule produces demonstrably worse art than the deviation (as happened with the dithered-glow rule), update the rule rather than silently breaking it. Document WHY.
- Otherwise: do not break.
