# Pixel Art Plan — ha.ggis Hub Scene

**Status:** locked. Stop reactive iteration; execute against this plan.
**Origin:** owner correction: *"you need to go research pixel art and plan out your work better."* Two hours of reactive cycles produced output the owner still called "ugly sloppy mess" despite an AI reviewer giving generous incremental scores. This is the missing planning step.

## What I researched

Sources studied (sprite-AI backgrounds guide, pixelparmesan dithering, pixnote 15 pro techniques):

### Pro principles I have been violating

1. **Silhouette test.** *"If you can tell what it is from the silhouette alone, your design is successful."* Every haggis iteration v1–v8 fails this: the reviewer's own words across cycles — "hay bale, sea urchin, tribble, brown blob with hair, poo emoji with eyes." None of these silhouettes say WILD HAGGIS.

2. **Dithering — avoid for small objects, character skin, areas needing readability.** *"Extraneous dithering creates visual noise or the unwanted illusion of texture."* I have used Bayer dither for hearth bloom, beam edges, wall corners, dawn-pool internal, mullion shadows. Half of these are amateur-mistake-tier per the pro guide.

3. **Hue shifting.** *"Shadows shift toward red-purple (warm) or blue-purple (cool). Highlights shift toward yellow."* My palette ramps are single-hue value steps. No hue shift. Pro shading uses hue shift across the ramp.

4. **Limit color count.** *"4-16 colors. Constraints force creativity."* My PALETTE has ~25 distinct hex values. Too many; the scene reads as muddy because the colours are too close in hue.

5. **Check at 1x scale regularly.** *"When zoomed in you obsess over details and lose sight of the overall balance."* I have been authoring sprites at 16x preview then complaining at 1x. Wrong workflow.

6. **Material rendering.** *"Metal: extreme light-dark contrast, sharp small highlights."* My hearth iron is subtle low-contrast — reads as just-another-dark-thing.

7. **Atmospheric perspective.** *"Objects further away should have less contrast, less saturation, colors that shift toward sky."* My scene has uniform contrast everywhere. The back wall and the foreground have the same value range. No depth cue.

8. **Eye guidance.** *"Eyes are drawn to the brightest colors and highest contrast — direct attention to focal points like character faces."* The brightest pixels in my frame are the hearth ember + the WHS sign + the window. NONE are on the haggis. The protagonist is in the dimmest area.

9. **Quiet zones / breath.** *"Backgrounds should support not upstage the character."* I've been ADDING furniture and decoration to fill space. Pro guidance: leave breath. The reviewer noted "more props won't move the needle."

10. **Reference-driven design.** I have 200+ wild-haggis reference images in `refs/`. I've barely studied them carefully before each sprite attempt.

### What the WILD HAGGIS silhouette actually is (from my own refs)

After studying `refs/myth-020.jpg` (AI photoreal), `refs/wild-haggis-1.jpg` and `refs/wild-haggis-kelvingrove-cropped.jpg` (taxidermies):

- **Body shape:** LOW-SLUNG OVAL — wider than tall. Closer to a furry potato lying on its long side than to a chibi ball. ~3:2 width-to-height ratio.
- **Mane:** the defining feature. LONG FLOWING STRANDS cascading from the back/top all the way DOWN past the body line on both sides. Irregular strand tips break the outline. Mane = the silhouette's character. Without the drape it's not a haggis.
- **Face:** small, poking out at the FRONT (one end of the oval). Not centered.
- **Snout:** dark wedge protruding forward from the face plane. ~⅓ the face height, prominent.
- **Eyes:** small, dark, deep-set. Often hidden behind hair.
- **Ears:** small, triangular, upright, often just barely visible above the mane.
- **Legs:** tiny stubs, often hidden by the cascading mane.
- **Colour:** ginger / blonde / grey mane. Dark brown body underneath. Dark almost-black face skin. Pink-grey snout tip.

The CHIBI-ROUND v8 with face-centred-in-body failed because it broke the canonical silhouette — wild haggis is NOT round-faced, it's a low oval with mane drape and a face poking forward.

## Plan: rebuild the scene with discipline

### Decision: drop one approach, commit to one register

The scene currently mixes:
- Hard-pixel sprite art (haggis, hearth, walls, doors, lantern, sign, furniture)
- Bayer dither overlays (hearth bloom, beam edges, mullion)
- Procedural fillRect-based effects (wall AO, sun glow, smoke wisps)

That's 3 visual registers competing. **Commit to ONE:** **hand-painted sprite-only.** All effects become PART OF SPRITES, not overlays. Light bakes into the floor sprite. Smoke is a sprite. Hearth glow is part of the hearth sprite frames. Mullion shadow IS the floor tile under the window.

### Palette: consolidate to 16 colours with hue shift

Replace the current 25+ PALETTE tokens with a **single 16-colour palette** organised as 4 ramps of 4 each, with proper hue shift:

- **Warm wood ramp (4):** shadowDeep-purpleblack → woodDarkRed → woodMidOrange → woodLitYellow (yellow shift on highlight)
- **Cool stone ramp (4):** stoneDeepIndigo → stoneShadowPurpleGrey → stoneMidWarmTan → stoneLitCream (purple shift on shadow, cream lit)
- **Haggis ramp (4):** haggisDeepBrown → haggisMidGinger → haggisLitBlonde → haggisHighlightCream
- **Hearth/accent ramp (4):** emberDeepRed → emberMidOrange → emberHotYellow → emberCoreWhite

Drop the random other tokens (heather purple, neeps orange, etc) UNLESS they fit one of these ramps.

### Composition: rule-of-thirds, haggis is the brightest mass

- Haggis at left-third (already done — keep)
- Hearth at right-bottom-third (currently bottom-centre — move)
- Window at top-centre (already correct — keep)
- The BRIGHTEST PIXEL CLUSTER in the frame is on the HAGGIS — paint a dawn-cream highlight on the mane tips so the eye lands there, not on the hearth ember
- Quiet zones preserved: the upper-left and lower-right of the floor stay relatively empty (no furniture)

### Sprite list with success criteria

| Sprite | Target | Silhouette test | Notes |
|---|---|---|---|
| **Haggis** | 36×22 oval, mane-drape silhouette | Black-on-white passes "wild haggis" reading | Face on right (toward hearth gaze); hanging strand pixels break the outline |
| **Hearth** | 24×16 (keep size) | Reads as iron pot from silhouette | More extreme iron-to-ember contrast (metal-rendering principle) |
| **Wall tile** | 16×16 (keep) | Reads as masonry from a 3-tone thumbnail | Drop the value-zonal overlay; let tile variants do the work |
| **Floor tile** | NEW: 16×16 tileable wood plank with grain | 3-tone shading per tile, irregular grain | Replaces the procedural floor + zone dither + mullion. Mullion is a SECOND tile variant. |
| **Window** | 24×18 already exists; refine | 3-band hard ramp (already correct) | Sun glow becomes 1 painted pixel cluster, not dither |
| **Door** | Keep | (existing sprites OK) | |
| **Sign** | Keep | (subagent's wood-grain version OK) | |
| **Lantern** | Keep | (subagent's version OK) | |
| **Furniture** | Keep | (existing kettle/stool/basket OK) | But reduce density (quiet zones) |

### Execution order (no jumping)

1. **Build the new palette** (palette.ts rewrite). 16 colours, 4 ramps, hue shifted. Delete the old ~25 tokens.
2. **Re-author the haggis** with the canonical silhouette (mane drape + low oval + face poking right). Test the silhouette BEFORE colouring — paint it in 1 colour first, verify it reads as wild haggis.
3. **Build floor tile sprite** + mullion variant tile. Replace procedural floor + beam zone fills + mullion shadow with tile placement.
4. **Strip overlays:** delete the bayer dither bloom for hearth (it's now a hearth sprite glow); delete the beam edge dither; delete the wall AO band dither; delete dust-mote-as-effect (becomes a periodic sprite blit instead).
5. **Repaint hearth sprite** with extreme metal-vs-ember contrast.
6. **Apply atmospheric perspective:** the back wall row of tiles is desaturated + lighter; mid-room normal; foreground (front-wall, near-camera) more saturated.
7. **Verify focal point:** brightest cream cluster lands on the haggis mane-tip. If hearth wins, dim it.
8. Brutal review.

### Success criteria — must pass ALL

- **Silhouette test:** show the haggis sprite as black-on-white only — a stranger correctly identifies it as a small Highland creature with mane.
- **Three-tone thumbnail test:** convert the scene screenshot to 3 values (white / grey / black). The protagonist must be readable as a distinct shape with the cleanest contrast.
- **Eye-trail test:** a stranger scrolling past stops on the haggis, not on the hearth or sign.
- **No dither on small sprites / character skin** (rules.md §1 violations removed).
- **Palette ≤16 colours total** across all sprites.

### What I am NOT doing

- More furniture
- More iterations on the existing approach
- Polishing one bloom radius
- Adding more dither

If after executing this plan the scene STILL reads as "ugly sloppy mess", then I commit honestly: hand-coded pixel art via me as author has a hard ceiling below "premium portfolio." The next move is then to source actual game art (AI-generated or commissioned) — there is no further iteration that will close the gap.
