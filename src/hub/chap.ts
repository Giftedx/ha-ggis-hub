// Chap responses for the coming-soon door. The hub trains every visitor to
// "chap a door tae go in" (hint banner + fallback help); the launchable door
// rewards that with a launch, so chapping the locked door must answer too —
// not sit silent. Each retort pairs a terse canvas sign (uppercase pixel-font
// signage, rendered over the door for ~CHAP_PROMPT_WINDOW_MS) with a fuller
// spoken line for the live status region (visible chrome + screen-reader).
//
// Scots-tinted lobby voice (DESIGN.md voice.open) — warm and a wee bit playful,
// never curt. Rotation is deterministic (index-driven, no RNG) so the canvas
// sign and the status line always agree and the determinism gate is unmoved.

export interface ChapRetort {
  /** Terse uppercase canvas sign shown over the door (pixel-font charset). */
  readonly sign: string;
  /** Fuller Scots line for the .scene-status live region. */
  readonly spoken: string;
}

export const CHAP_RETORTS: readonly ChapRetort[] = [
  {
    sign: 'NAE HAME YET.',
    spoken: "Ye chap, but naught stirs — there's nae hame ahint this door yet.",
  },
  {
    sign: 'BOLTED FAST.',
    spoken: "Bolted fast, this yin. The neist bothy's no' ready — comin' wi' the next moon.",
  },
  {
    sign: 'BIDE A WEE.',
    spoken: "Haud on a wee — this door opens wi' the next moon, no' afore.",
  },
  {
    sign: "NO' THE NOO.",
    spoken: "No' the noo, friend — but bide a while. This yin's comin' wi' the next moon.",
  },
];

/** Pick the retort for a chap count, wrapping round the table. Deterministic. */
export function chapRetortAt(index: number): ChapRetort {
  return CHAP_RETORTS[index % CHAP_RETORTS.length]!;
}
