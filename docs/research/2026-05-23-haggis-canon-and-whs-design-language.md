# Haggis canon and Wild Haggis Survivors design language

Status: canonical research reference
Date: 2026-05-23
Scope: what a haggis is, what the wild haggis is, how Wild Haggis Survivors
       presents both, and what that means for the ha.ggis Hub aesthetic
Related: [Project charter](../foundation/00-project-charter.md), [Stack decision record](../foundation/05-stack-decision-record.md), [Quality manifesto](../foundation/11-quality-manifesto.md)
Reference images: [`refs/`](refs/) — saved sibling images, do not delete.

This doc exists because the first wave of hub visual iteration was built
without any of this context, and the result was a generic brown-egg
character on a generic bothy backdrop — none of it spoke the same visual
language as the games it is meant to launch. Future contributors and
agents should read this before touching the hub renderer.

---

## What the hub is, and what it is not

ha.ggis Hub is the **lobby** for a planned family of haggis-themed games
hosted under `ha.ggis.xyz`. It is **not a game itself**. Its job is:

- Be the cohesive front-door brand for the haggis-games family.
- Present each available game as a clearly-themed door / portal the
  visitor walks the haggis up to.
- Hand off cleanly into the chosen game (currently an external launch;
  later may host the game's build directly under the same domain).

The hub is **its own scene** with its own composition, but every other
shipped haggis-themed game will have its **own genre, style, gameplay,
and aesthetic**. The hub must:

- Feel like family with each game (shared brand tokens, shared character
  identity, shared voice).
- Stay neutral enough that it doesn't pre-commit visitors to one game's
  vibe.
- Show the player as the wild haggis (the recurring protagonist across
  the family), not as game-specific costume variants.

Wild Haggis Survivors is the first such game and the brand anchor for
all the others. Until the second game ships, the hub's "match" target is
WHS's design language verbatim.

---

## Haggis canon

### Haggis (the food)

Scotland's national dish. A savoury pudding traditionally encased in a
sheep's stomach, made of the sheep's pluck (heart, lungs, liver) minced
with chopped onion, oatmeal, suet, salt, and spices (coriander, mace,
black pepper). Cooked slowly; served with **neeps** (mashed turnips/swede)
and **tatties** (mashed potatoes), often with a dram of Scotch and a
peppery whisky sauce. Iconic centrepiece of Burns Night (25 January),
when the host recites Burns' _Address to a Haggis_ before piping it in.
Crumbly, peppery, hearty.

This is what visitors will picture if they don't know better. The hub's
character is **not** this haggis.

### Wild haggis (Haggis scoticus)

A fictional creature of Scottish folklore, traditionally invoked to tease
visitors who don't know the food is what gets eaten. Defining features:

- Small, round, **furry** highland creature. Heather-coloured fur — browns,
  ginger, sometimes mottled — so it blends into the moor.
- **Four legs of uneven length.** Two on one side are noticeably longer
  than the two on the other. This lets the creature run easily around the
  sides of steep highland slopes — but only in one direction.
- Two sub-varieties: **left-longer** (runs clockwise around a mountain when
  viewed from above) and **right-longer** (anti-clockwise). The two
  varieties cannot interbreed (per the joke) because they only ever face
  the same direction.
- Cute, small ears; beady eyes; a button nose.

The recurring joke: "wild haggis are caught by chasing them in the
opposite direction; they cannot turn." 

This is what the player character represents.

### Sources

- [Wild haggis — Wikipedia](https://en.wikipedia.org/wiki/Wild_haggis)
- [What is Wild Haggis — Haggis Wildlife Foundation](https://haggiswildlifefoundation.com/what-is-wild-haggis/)
- [The Myth and Mystery of Scotland's Wild Haggis — Gastro Obscura](https://www.atlasobscura.com/articles/what-is-haggis)
- [Haggis — Wikipedia](https://en.wikipedia.org/wiki/Haggis)
- [Haggis — VisitScotland](https://www.visitscotland.com/things-to-do/food-drink/haggis)

---

## Wild Haggis Survivors — design language

Source: `C:\Users\aggis\dev\active\wild-haggis-survivors\DESIGN.md` and
the live dev site at <https://wild-haggis-survivors.pages.dev/>.

WHS is a **Highland-at-dusk, Scots-tinted bullet-heaven** (Vampire-Survivors
genre). Built with Phaser 4 + TypeScript + Vite. All sprites are
**drawn in code** (no external image assets) — a constraint the hub also
satisfies.

The player character in WHS is a wild haggis whose uneven legs become
the game's signature mechanic: **every input drifts a few degrees
clockwise**. So the brand-iconic uneven-leg trait is canonicalised in
gameplay rather than in static silhouette.

### Player sprite (canonical)

See [`refs/2026-05-23-whs-player-sprites.png`](refs/2026-05-23-whs-player-sprites.png).
Key visual properties:

- Roundish slightly oval body, **flattened bottom**, no visible legs at
  rest (legs only show through movement/animation in-game).
- **Big expressive eyes**: white sclera with large dark pupils, drawn high
  in the face for "cute" proportions.
- Small **pink button nose** between the eyes.
- **No visible ears** in the standard sprite. (Some variants — bee, ranger
  — add helmets/bandanas/goggles instead.)
- Default fur colour: warm tan / peat-brown (DESIGN.md `art-peat-mid:
  #5a3e20`).
- Variants change colour and add headgear (green with goggles, grey with
  bee stripes, etc.). The hub player is the **default brown variant**.

### Colour palette

Tokens excerpted from WHS `DESIGN.md`. The hub should pull these into
its own palette wholesale so the brand reads as one family. Names are
the WHS token names — keep them when porting:

| Token | Hex | Role |
|---|---|---|
| `background` | `#1a1a2e` | Night-moor base — the screen behind everything |
| `surface` | `#111728` | Primary panel fill |
| `surface-dim` | `#0a0a14` | Heavy ink — text stroke on bold titles |
| `surface-container` | `#1a1a28` | Card/tile interior |
| `outline` | `#2a3450` | Standard panel border |
| `primary` | `#005eb8` | **Scottish blue** — primary action |
| `secondary` | `#d4a017` | **Whisky gold** — accent, titles, currency |
| `tertiary` | `#6b3fa0` | **Heather purple** — moor flora |
| `art-peat-mid` | `#5a3e20` | **Haggis body default** |
| `art-peat-shadow` | `#3a2818` | Haggis underbody |
| `art-peat-warm` | `#4a2e18` | Haggis warm shade |
| `art-heather-mid` | `#9070b0` | Heather plant |
| `art-loch-mid` | `#4a7090` | Loch / cool water |
| `art-stone-mid` | `#4a4a50` | Stone walls, cairns |
| `art-gold-warm` | `#d4b055` | Warm gold accents |
| `world-grass` | `#2d5a27` | Highland grass floor |
| `text-bright` | `#e4e9f0` | Bold titles |
| `text-primary` | `#c4cdd8` | Default body |
| `warm-tan` | `#e8d4a0` | HUD secondary, tertiary button text |

The hub's current brown-bothy palette (`#24170f`, `#7a3f18`, etc.) is
**off-brand** and should be retired in favour of the WHS night-moor
palette.

### Typography

- **Single monospace family across the entire game.** No sans, no serif.
- **Bold + heavy ink stroke** on titles (3–7 px stroke widths). Pixel-art
  chunkiness is the typographic signature.
- **Subtitle** is the only italic role.
- Square corners everywhere; only circular pip dots use radius.
- 8 px grid for all layout spacing.

### Voice / copy

WHS is bilingual (English baseline + Scots overlay, lazy-loaded). The
default English voice has **a Scots tint**:

- "A wee word before ye start"
- "Ye can change it any time"
- Scene transitions, banter, and menu copy lean on Burns-adjacent
  phrasing where it fits.

The hub should match this register. Door prompts:

- `Enter Wild Haggis Survivors` → **`Awa' in, the moor awaits`** (or similar
  Scots-tinted phrasing). At minimum, avoid plain "Click to play" copy.
- Locked door: not "Locked Future Bothy" but something like
  **`Locked. Another bothy, another day.`**

### Accessibility

WHS gates first-launch on a photosensitivity warning. The hub doesn't
flash anything currently, but the **Reduced Motion** path the hub already
honours (lantern halo, fire flicker, haggis bob suppressed) is the right
posture. Any future hub animation must also honour that.

### Live screenshot

See [`refs/2026-05-23-whs-live-warning.png`](refs/2026-05-23-whs-live-warning.png).
Visual signature on first load: deep near-black background, gold-bordered
modal panel, gold heading text (`A wee word before ye start`), tan body
copy, tan-on-brown primary button (`I understand`) with gold border, all
monospace, all square corners.

---

## What the hub must do differently from where it stands today

1. **Palette swap.** Drop the brown bothy palette. Adopt the WHS night-moor
   palette verbatim. Walls become stone-grey, floor becomes peat dark,
   background becomes near-black navy.
2. **Typography swap.** Drop Georgia serif. Single monospace family with
   heavy stroked titles.
3. **Square corners.** Drop the rounded corner radii in CSS.
4. **Haggis redesign.** Round body, no ears, no visible legs at rest, big
   eyes, pink nose, peat-brown fur. Match WHS sprite proportions.
5. **Voice.** Door prompts and the tiny direct-play link should be in
   Scots-tinted English ("Awa' in", "Bide a while", etc.) — not "Enter".
6. **Brand consistency assertion.** The hub IS the lobby for haggis
   games; future games slot in as additional doors. Hub copy and visuals
   must read as the same brand as WHS.

These changes are scoped for a follow-up implementation slice. This doc
captures the canon so the work is grounded in the real source material
rather than reinvented from scratch a third time.
