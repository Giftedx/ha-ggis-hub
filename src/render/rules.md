# Rendering rulebook — ha.ggis Hub bothy scene

**Status:** locked. Every pixel obeys these rules or the scene reads as programmer art.
**Origin:** brutal art-direction review (see chat log + `palette.ts`).

The reviewer's verdict that crystallised this doc: *"Every pixel obeys the same rules or none of it works. Your actual risk isn't skill ceiling; it's that you keep adding features before enforcing a single rendering rulebook."*

## 1. Edge hardness — no soft alpha gradients

**FORBIDDEN in scene rendering:**
- `ctx.globalAlpha = X` followed by stacked `ctx.arc(...)` rings with decreasing alpha (the "soft glow" idiom)
- `createRadialGradient` / `createLinearGradient`
- Gaussian-style blurry shadows
- Anti-aliased browser text (`fillText`) for diegetic in-scene labels — only OK for HTML UI outside the canvas

**REQUIRED:**
- Glows are dithered: a checkerboard or ordered-dither pattern of HARD PIXELS at fixed alpha (0.4–0.6). At viewport scale the dither reads as "soft" while staying pixel-honest.
- Shadows are hand-painted hard-pixel ellipses at fixed alpha. Max 2px wider than the casting sprite's footprint.
- Rim-lights are 1px hard pixels along the appropriate silhouette edge — never a continuous smooth pass.

## 2. Light direction — single source, baked

- Sole in-scene light source: the back-wall window beam. Dawn pours forward+down through the window onto the floor.
- Light is BAKED INTO PIXELS:
  - Inside the dawn pool → use `PALETTE.litWoodMid` / `litWoodHi` / `dawnGold` etc.
  - Edge / spill → use `PALETTE.edgeBrown` / `edgeTan` / `edgePink`.
  - Outside → use `PALETTE.shadowWoodMid` / `shadowWoodHi` / `shadowCool` etc.
- The classification function `lightZoneAt(x, y, beam)` in `palette.ts` is the single source of truth. Use it.
- The pool/shadow boundary on the floor must be DITHERED 1–2px (not a razor diagonal).
- Light TOUCHES things:
  - 1 warm pixel at the bottom edge of the haggis (light spill onto the creature).
  - 1 warm pixel inside the door frame on the lit side.
  - Hearth glow reaches 1 pixel onto adjacent planks as dithered warm specks.

## 3. Shadow shape — hard-pixel ellipse, fixed alpha

```
function drawContactShadow(ctx, cx, footY, halfWidth, depth, alpha=0.40):
    for dy in -depth..depth:
        t = abs(dy) / depth
        w = round(halfWidth * sqrt(1 - t*t))   # ellipse formula
        ctx.fillStyle = PALETTE.shadowDeep
        ctx.globalAlpha = alpha                # SAME alpha for whole shadow
        ctx.fillRect(cx - w, footY + dy, 2*w, 1)
    ctx.globalAlpha = 1
```

No fade-with-distance, no nested shrinking ellipses with varying alpha.

## 4. Outline policy — chiaroscuro, not cartoon

- Characters/sprites get a 1px outline ONLY on the SHADOW SIDE (the side away from the light source).
- Use `PALETTE.ink` for the outline pixel.
- Never a full perimeter outline (reads as cartoon, not pixel art).
- Rim-light is its mirror: 1px hard pixels on the LIT SIDE only, in `PALETTE.dawnHighlight`.

## 5. Palette discipline — ramps only, no off-ramp colours

`PALETTE` in `src/render/palette.ts` is the only colour source. Sprites + procedural draws import from it.

Three colour ramps:
- **Lit ramp:** `dawnHighlight → dawnGold → dawnCream → litStoneHi → litStoneMid → edgeTan`
- **Mid ramp:** `edgePink → edgeTan → edgeBrown → haggisHairMid`
- **Shadow ramp:** `shadowStoneHi → shadowStoneMid → shadowStoneDark → shadowCool → shadowDeep`

Any new sprite asset MUST source every colour from these ramps. If a colour is missing, add it to the palette module — do not inline-hex it.

## 6. Text policy — pixel-font sprite only

- `fillText` with browser fonts is forbidden in-scene. Browser fonts are anti-aliased and break the hard-pixel contract.
- Door signs, prompt labels, HUD: render via a hand-authored pixel-font sprite system.
- Stub: until the pixel-font is authored, in-scene labels render as a flat coloured rectangle placeholder. No anti-aliased letters.

## 7. Tile variation — break the grid

- Wall tiles: ≥4 visually distinct variants in rotation. At least one variant must have a different mortar rhythm so horizontal mortar lines do NOT continuously align across the wall.
- Floor planks: vertical seam alternation, plus knot positions deterministic but irregular.

## 8. Sprites in the scene — match the bar

- The lantern sprite is the current fidelity bar (clear silhouette, hard pixels, palette-discipline). Other sprites match or exceed it; if they don't, they get reauthored.
- No sprite ships with mixed register (e.g. shaded body + flat-coloured legs).

## 9. Composition policy — break the centerline

- Haggis spawn is at `(340, 540)` in 1000×1000 world space — left third.
- Hearth and window stay center for the beam geometry, but the protagonist breaks that axis.
- Avoid stacking three centered elements on the same vertical axis.

## When to break a rule

- Performance: if a strict hard-pixel implementation tanks frame rate (>2ms / frame for a single effect), document the deviation and approve via a brutal-reviewer pass before shipping.
- Otherwise: do not break.
