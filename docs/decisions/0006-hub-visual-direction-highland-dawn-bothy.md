# 0006 Hub visual direction — Highland Dawn Bothy

Status: accepted
Date: 2026-05-23
Supersedes: nothing (clarifies and replaces the WHS-tokens-wholesale stance previously implied by the project charter and an earlier draft of `docs/research/2026-05-23-haggis-canon-and-whs-design-language.md`)
Related: [Project charter](../foundation/00-project-charter.md), [Haggis canon and WHS design language](../research/2026-05-23-haggis-canon-and-whs-design-language.md), [ADR-0003 WHS integration strategy](0003-whs-integration-strategy.md), [ADR-0005 Canvas2D first-room renderer](0005-canvas2d-first-room-renderer.md)

## Context

The hub is the lobby for a planned family of haggis-themed games. Wild Haggis Survivors (WHS) is the first game in the family. An earlier iteration of this project treated WHS's published `DESIGN.md` as the family's design language and rebuilt the hub against the WHS palette (`#1a1a2e`, `#d4a017`), monospace typography, and Scots-combat voice. The owner pushed back: the hub is its own product with its own visual language, related to WHS only through shared **canon** (the Highland setting, the Scots-tinted voice family, the haggis joke, and the uneven-leg gag). Three directions were sketched as alternatives:

- **A. Highland Dawn Bothy** — painterly storybook bothy interior at first light. Warm dawn through a small window. Haggis just woken by the embers. Doors line the walls.
- **B. Burns Night Hall** — top-down Burns-Supper table. Tartan tablecloth. Plated haggis + neeps + tatties + whisky glass. Doors as picture frames on the walls.
- **C. Heather Moor Map** — hand-drawn cartographic top-down map of a small patch of moor. Doors as place markers (cottage, standing stones, loch, cairn).

The owner picked direction A.

## Decision

The hub's visual direction is **Highland Dawn Bothy** — a painterly storybook bothy interior at dawn. The Wee Chieftain, the hub's living whole-haggis mascot, has just woken by the embers of last night's fire and is choosing which door (which game) to step out into today. The hub does **not** adopt WHS's `DESIGN.md` tokens. The hub picks its own palette, typography, register, mood, and mascot design from the shared haggis canon.

### Palette (locked)

| Token | Hex | Role |
|---|---|---|
| `peat-brown` | `#3a2418` | floor planks, beams, deepest ink |
| `oat-tan` | `#c4a878` | wood, walls, lighter timbers |
| `tatties-cream` | `#f0e6c8` | paper, text, plaster highlight |
| `neeps-orange` | `#e4a020` | lantern glow, signpost, hearth ember |
| `heather-purple` | `#7a4a9c` | shadows, dawn sky shoulder, rug |
| `dawn-pink` | `#f4c8b8` | window wash, brightest sky |
| `whisky-amber` | `#c8842a` | brass, polished detail |
| `bracken-green` | `#5a7a5a` | hung herbs, accent detail |
| `cairn-stone` | `#b8a878` | rim stones, sill, hearthstone highlight |
| `ember-red` | `#c44218` | active embers (small accent only) |
| `ink-deep` | `#1a0e08` | outline, text shadow |

### Typography (locked)

- **Display + body:** humanist serif via system stack — `Georgia, "Iowan Old Style", "Apple Garamond", "Baskerville", "Times New Roman", serif`. No monospace.
- **Hub door signs:** the same serif, bold.
- **Hub voice:** Scots-tinted English, warmer and slower than WHS combat register. Welcoming, lobby-mood.

### Mood + composition

- Side-on interior view of a small Highland bothy at first light.
- Small arched window on the back wall pouring **dawn pink + heather purple** light, not moonlight.
- **Banked embers** in the hearth, not a roaring fire.
- Floor: warm peat-stained boards.
- Walls: oat-tan plastered stone with warm sandstone tone (not the cold blue-grey of the WHS-clone iteration).
- Wall decorations swap from "crossed claymores + tartan banner" (which read as a generic Highland-warrior brochure) to **dried herbs / hung lantern silhouette / a wee framed painting** — domestic, not martial.
- Rug under the hearth: woven heather-purple with cream stripes (real heather-moor flora as the source).

### What stays from the prior renderer

- The four-wall bothy composition.
- Doors set into the walls with stone arches and iron hinges.
- A lantern + signpost above each launchable door.
- The player rendered as a small Highland haggis mascot in the centre.
- The fire pit as a focal point.

### What changes

- All palette tokens swap from WHS values to the table above.
- All typography swaps from monospace to humanist serif.
- The window scene swaps from "night sky + moon + stars" to "dawn pink + heather purple sky + soft sun glow".
- The wall decorations swap from "crossed claymores + tartan banner" to domestic-storybook motifs (dried herbs, hung lantern, framed painting).
- The rug swaps from red-brown to heather purple.
- The flame palette softens toward orange/amber (banked embers, not blaze).
- Hub voice copy stays Scots-tinted but warmer in register.

## Consequences

- The hub stops looking like a WHS clone. Visitors see two related-but-distinct products in the family, which is the point.
- The WHS sprite reference in `docs/research/refs/` remains useful for **readability lessons** (clear eyes, silhouette, uneven legs, charm) but not for **character anatomy or design tokens**. The hub mascot is food-shaped first and intentionally distinct from the WHS wild-haggis character.
- The hub's `DESIGN.md`-equivalent design tokens live in this ADR until they're large enough to warrant their own document. If the hub adds a second visual surface (a settings screen, a credits scene), promote them.
- Future haggis-themed games will follow the same principle: each picks its own visual direction grounded in shared canon. The hub does not impose its tokens on them either.

## Implementation notes

- `src/style.css` — replace WHS CSS variables with `--hub-*` tokens from the palette table; replace monospace `font-family` with the humanist serif stack.
- `src/render/canvas-room.ts` — replace the `PX` palette object with new token values; rewrite `drawTopWallWindow` to render dawn sky (not night sky); rewrite `drawWallHanging` to use domestic motifs (drop crossed claymores + tartan banner); swap rug colours in `drawFloorRug`; swap sign + prompt typography to serif; keep the player scale readable without overpowering the bothy.
- `src/render/bothy-haggis.ts` — render The Wee Chieftain as a glossy whole-haggis food mascot: squat oval casing with surface oat flecks and seam texture, big directed cream eyes with eyelid arcs, bold authored brows, wide confident smile, and tiny asymmetric uneven legs.
- `src/main.ts` — copy stays Scots-tinted; existing strings ("the bothy bides quiet", "the bothy wouldnae load", "awa' in →") match the new lobby register and stay.
- Tests in `src/render/canvas-room.test.ts` assert text content and call order, not font value or colour values, so they should continue to pass.
