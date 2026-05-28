# Wee Chieftain sprite — image generation prompts

**Goal:** Replace the procedural Canvas2D `drawBothyHaggis()` with a painted sprite that
visually belongs in the same storybook world as the `bothy-storybook-backdrop.webp`.

**Date:** 2026-05-28  
**Status:** v2 (revised 2026-05-29) — the v1 text-only generation failed (came out a glossy
3D-render potato: no brows, no nose, off-centre googly eyes; see § Integration status). v2
mandates **image-conditioning on the backdrop** + a **face-feature acceptance gate**.

---

## v2 strategy — READ FIRST (why v1 failed, and the fix)

The v1 prompt below is *spec-complete* — it already says "gouache on toned paper", "no 3D
render", "no photorealism", "bold expressive brows", "tiny nose dot". The model produced a
glossy, airbrushed 3D-render potato with no brows, no nose, and off-centre googly eyes
**anyway**. Lesson: **text alone does not enforce medium or face detail** for this subject —
the model latches onto "brown oval pudding" and falls back to its stock render. v2 therefore
changes the *method*, not just the words.

1. **Condition on the backdrop image — now mandatory, not an optional reinforcer.** Plain
   text-to-image is exactly what failed. Use the painted backdrop
   (`public/art/bothy-storybook-backdrop.webp`, exported to JPEG) as a hard style lock:
   - **Midjourney:** `--sref <backdrop.jpg> --sw 100 --style raw` (max style weight; do not
     trust the word "gouache" to carry the medium on its own).
   - **DALL-E / ChatGPT:** upload the backdrop, instruct "paint this character in *exactly*
     this medium, palette, and edge quality", then **inpaint the face** to add the brows +
     nose dot if the first pass drops them (it will).
   - **Stable Diffusion / FLUX:** img2img or IP-Adapter/style-transfer off the backdrop at
     moderate denoise, or a gouache/illustration LoRA — never plain txt2img.

2. **Run the face-feature gate before accepting (see § Checklist).** v1 would have *passed*
   the old checklist (it had eyes, an oval, legs, a warm palette) — the checklist never tested
   the things v1 actually missed. The tightened gate now leads with them. If matte gouache
   surface / bold brows / nose dot / centred focused eyes are not ALL present → inpaint or
   regenerate. **Do not accept.**

3. **Deliver the animation set, not just one idle.** The hub bobs (breath), walks, and flips
   the sprite for facing. Generate the idle **plus** the two walk-lean variations (below) in
   the same style and seed so the walk-cycle works; a lone idle is adoptable but flat.

Context: the procedural-vs-sprite comparison (2026-05-28) found the procedural haggis clears
the bar as the live stand-in, and the sprite's *only* genuine edge is painted surface/volume —
which is exactly what the medium-match in step 1 must capture, or there is no reason to swap.

---

## What we are matching

The backdrop (`public/art/bothy-storybook-backdrop.webp`) is a **hand-painted storybook
illustration** of a Highland bothy interior at dawn. Style markers:

- Warm, painterly, soft-edged — not crisp, not pixel art, not vector
- Gouache or watercolour feel — opaque mid-tones, slightly chalky highlights
- Palette: peat brown, oat tan, dawn pink, heather purple, ember amber, whisky gold
- Mood: intimate, domestic, quietly magical — a wee room in the early morning

The character must feel painted by the same hand as that backdrop.

---

## The character

**Name:** The Wee Chieftain  
**What it is:** a living whole-haggis pudding that has wandered into the bothy. Food-shaped
first, creature second. The joke is that this is literally the Scottish dish — squat oval
cooked casing, oat flecks on the surface, tied ends — and it has eyes and legs.

**Key visual facts (from `DESIGN.md` and `bothy-haggis.ts`):**

| Feature | Detail |
|---|---|
| Body shape | Squat oval — wider than tall, ~1.6:1 ratio. Not round, not tubular. Haggis-pudding shaped. |
| Casing | Cooked brown exterior. Deep at the base, mid brown across the body, amber lit highlight on the upper-left face. |
| Seams/ties | Subtle tied casing suggestion at left and right ends (the haggis is tied before boiling) — don't overdo these |
| Oat flecks | 2–3 small oat-coloured patches embedded in the casing surface |
| Eyes | Large, prominent, front-facing. Cream/eggshell whites, large dark pupils angled very slightly inward (not wall-eyed). Thin eyelid covering the top arc of each white so the gaze reads as focused. The eyes carry most of the personality. |
| Brows | One bold expressive arc per eye. Slightly raised — curious or cheerful, not angry. |
| Nose | Tiny dot below and between the eyes. Anchors the face. |
| Smile | Wide, joyful. A simple arc. Not a grin showing teeth. |
| Legs | Four tiny legs emerging from the underside — comically small relative to the body. Two slightly longer on the "back" side, two slightly shorter in "front" — the uneven-leg gag. Stubby, rounded-ended. |
| Heather patch | Optional: small heather-purple grounding shadow/patch beneath the legs |
| Scale | Small. Roughly head-height of an adult human at bothy scale — not enormous, not tiny. Should look like it could walk under the door without ducking. |

**Personality:** warm, cheerful, a bit round and proud. The food mascot that knows it's a
mascot. Not cute-anime. Not horror. Not generic cartoon animal. Specifically: a haggis
pudding that is delighted to exist.

---

## Technical requirements for the sprite

- **Transparent background** (PNG with alpha channel)
- **Front-facing pose** — the character faces the viewer (slight 3/4 is fine, but no full side-on)
- **Neutral/idle pose** — standing, slight weight, not mid-stride. The game will move
  the sprite vertically (breath bob) and horizontally (position) at runtime.
- **Canvas size suggestion:** 256×256 or 512×512 with the character filling ~70–80% of
  the canvas height. The engine will scale it down to ~80–100 px wide at runtime.
- **No cast shadow** in the sprite itself — the ground shadow is drawn separately in Canvas2D.
- **No background elements** — pure character, transparent everything else.

---

## Primary prompt (Midjourney v7 / DALL-E / Firefly)

```
A charming storybook illustration of a living Scottish haggis pudding character.
The haggis is a squat oval cooked-casing shape, wider than tall, warm brown with 
amber highlights and a few pale oat flecks on its surface. It has two large 
front-facing eyes with cream whites and dark pupils, bold expressive brows, a tiny 
nose dot, and a wide happy smile. Four comically small stubby legs protrude from 
the underside. Painterly storybook illustration style, gouache on toned paper, 
warm earthy palette (peat brown, amber, oat cream), soft edges, no outlines — 
the kind of character that would live in a Highland bothy. Front-facing, neutral 
standing pose. Transparent background, game character sprite.
```

### Style reinforcers (append to above, pick what resonates)

```
// For a tighter painterly match to the backdrop:
in the style of a hand-painted Scottish children's book illustration, 
similar to Mairi Hedderwick "Katie Morag" or Debi Gliori illustration style, 
warm gouache, soft painterly texture

// For more character personality:
expressive animated character design, warm and endearing, not cute-anime, 
character reads as the food dish first — the oval shape should clearly 
suggest a haggis pudding before it suggests a creature

// For clean sprite output:
isolated character, clean transparent background, no shadow, 
no background elements, suitable for compositing over a painted scene
```

### Negative prompt

```
no background, no scenery, no shadow under character, no pixel art, 
no anime, no manga, no chibi, no photorealism, no 3D render, no CGI, 
no glossy or plastic or waxy surface, no airbrushed sheen, no specular 
highlights, no smooth 3D shading, no Halloween or horror tone, no sharp 
outlines, no vector style, no flat colours, no stock cute potato, no 
off-centre face, no googly eyes — this is specifically a matte 
gouache-painted haggis pudding that has come alive, centred and front-facing
```

---

## Variation prompts

### Walk pose (for animation frame)

```
[same base prompt] but mid-stride — two legs slightly raised, two on the ground. 
The body tilts very slightly in the direction of movement. Same front-facing angle.
```

### Walk pose left-leaning

```
[same base prompt, walk pose] body weight shifted slightly left, left side legs 
raised, right side planted.
```

### Walk pose right-leaning

```
[same base prompt, walk pose] body weight shifted slightly right, right side legs 
raised, left side planted.
```

### Close-crop (for favicon / OG card)

```
[same base prompt] tight crop, just the head and upper body, no legs visible. 
Good for a circular icon crop.
```

---

## Model-specific notes

### Midjourney v7

- Use `--style raw` to get more painterly/illustrative results with less MJ house style
- Use `--ar 1:1` for the sprite, `--ar 3:2` for OG card
- Use `--no background` in the `--no` param
- Upload the actual backdrop image as a style reference with `--sref [url] --sw 80`
  — this is the most direct way to get style matching. Export a JPEG of the
  backdrop and use it as the style reference image.

### DALL-E (via ChatGPT / API)

- DALL-E is strong at following specific character descriptions
- Ask explicitly for "PNG with transparent background" — it supports this
- Iterate by uploading the generated image and asking for adjustments:
  "Make the body more clearly oval/wider than tall", "Add more painting texture",
  "Make the eyes larger", etc.
- Use the Edit/Inpaint endpoint to fix specific areas without regenerating entirely

### Stable Diffusion / FLUX.1

- FLUX.1 [dev] or [schnell] with the `painterly illustration` LoRA if available
- Use an illustration-fine-tuned checkpoint
- The negative prompt is important here — add `ugly, deformed, extra limbs`
- Run at 768×768 or 1024×1024, then resize
- Use background removal (rembg) afterwards for clean alpha

### Adobe Firefly

- Firefly is good for commercial-safe assets
- Use "Generative Fill" to clean up background after generation
- "Content type: Art" → "Style: Illustration/Painterly"

---

## Checklist before using a generated sprite

**Face-feature gate — these are exactly what v1 failed; check them FIRST, and reject on any miss:**

- [ ] **Matte gouache surface** — chalky/painterly like the backdrop; NOT glossy, airbrushed, plastic, or 3D-rendered
- [ ] **Bold brow arc over each eye** — present and expressive (v1 had none)
- [ ] **Tiny nose dot** below and between the eyes (v1 had none)
- [ ] **Face centred & front-facing** — eyes on the vertical centreline, symmetric (v1's were shoved to one side)
- [ ] **Eyes focused** — eyelid arc over the top of each white, pupils angled slightly inward (not blank googly eyes)
- [ ] **Reads as a haggis** — tied casing ends + embedded oat flecks, not a bare potato

**General:**

- [ ] Body reads as a haggis pudding shape (wider than tall, cooked oval)
- [ ] Eyes are front-facing and have personality (not side-facing, not blank)
- [ ] Legs are four, comically small, stubby
- [ ] Colour palette: warm brown/amber casing, cream eye whites, dark pupils
- [ ] Style matches backdrop warmth (not cold, not over-saturated)
- [ ] Background is fully transparent (check PNG alpha channel)
- [ ] Character fills ~70–80% of canvas height
- [ ] No cast shadow baked into sprite
- [ ] Readable when scaled to ~80–100 px wide on a 540 px canvas — print it tiny and check

---

## Integration note (once sprite is approved)

Once the generated sprite is approved and cleaned up:

1. Save to `public/art/wee-chieftain-idle.png` (or `.webp`)
2. The `drawBothyHaggis()` call in `src/render/canvas-room.ts` is replaced with an
   `ctx.drawImage()` call using the preloaded image
3. The breath-bob animation becomes a `translateY` on the draw position
4. Walk cycle: either use separate `wee-chieftain-walk-l.png` / `wee-chieftain-walk-r.png`,
   or use a horizontal-flip transform for left/right facing
5. `bothy-haggis.ts` and `BothyHaggisContext` can be deleted once the sprite path is stable
6. `public/og.svg` / `public/favicon.svg` are updated to match the new sprite design
7. Visual golden must be re-captured after the swap

The procedural fallback (`drawBothyHaggis`) can live alongside the sprite path during
transition — load the image, if loaded draw sprite, else draw procedural.

---

## Integration status — 2026-05-29 (SHIPPED — sprite is the live render)

**Decision:** Shipped per owner direction on 2026-05-29. The generated asset
(`public/art/wee-chieftain-idle.png`) is committed and wired into `drawHaggis` (canvas-room.ts)
as the **primary render**; the hand-rolled procedural `drawBothyHaggis()` stays as the no-image
fallback. Visual golden re-captured (gate distance 0); built via `build:all` and deployed to
ha.ggis.xyz. The earlier review flagged this asset as off-brief vs the gouache backdrop (glossy
sheen, missing brows/nose) — that critique and the v2 regen strategy above stand for a future
matte-gouache replacement, but the owner's call is to ship this asset now.

**Why the current PNG misses the brief (checklist failures):**

- **Style does not match the backdrop** — the #1 requirement. It reads as a glossy,
  airbrushed/3D-rendered potato, not gouache-on-toned-paper painted by the same hand. The
  backdrop is soft, chalky, painterly; the sprite is smooth and photoreal-ish. They clash.
- **Missing the bold expressive brows** — the brief makes the brows carry personality; the
  asset has none.
- **Missing the tiny nose dot** that anchors the face.
- Eyes read as generic googly-eyes rather than the focused, slightly-inward gaze with
  eyelid arc described in the brief.

For a portfolio centerpiece this is a downgrade from the procedural haggis, which clears the
bar. Regenerate with stronger style-reference weighting on the backdrop (`--sref` of the
actual backdrop JPEG) and explicit brows/nose, then re-run the checklist above before
swapping.

**Preserved integration code** (drop into `drawBothyHaggis()` in `src/render/canvas-room.ts`,
just after `const bodyCy = ...`; restore the module-level `WEE_CHIEFTAIN_SPRITE_SRC` const +
`loadWeeChieftainSprite()` loader alongside the storybook-backdrop loader):

```ts
const sprite = loadWeeChieftainSprite();
if (
  sprite !== null &&
  sprite.complete &&
  sprite.naturalWidth > 0 &&
  typeof ctx.drawImage === 'function'
) {
  const SPRITE_W = Math.round(60 * HAGGIS_SCALE);
  const SPRITE_H = Math.round(SPRITE_W * (sprite.naturalHeight / sprite.naturalWidth));
  // Feet sit at ~92% down the sprite PNG; shadow hugs that level, not the bbox bottom.
  hardContactShadow(ctx, cx, cy + bob - Math.round(SPRITE_H * 0.08), Math.round(SPRITE_W * 0.3), 2);
  const xform = ctx as unknown as {
    translate(x: number, y: number): void;
    scale(x: number, y: number): void;
  };
  const smooth = ctx as unknown as { imageSmoothingEnabled?: boolean };
  smooth.imageSmoothingEnabled = true;
  ctx.save();
  if (facingLeft) {
    xform.translate(bodyCx, 0);
    xform.scale(-1, 1);
    xform.translate(-bodyCx, 0);
  }
  ctx.drawImage(sprite, bodyCx - Math.round(SPRITE_W / 2), cy + bob - SPRITE_H, SPRITE_W, SPRITE_H);
  ctx.restore();
  smooth.imageSmoothingEnabled = false;
  return;
}
```
