# ADR-0009: Chap Knock SFX and the Sound-Policy Split

Status: accepted
Date: 2026-07-10
Related: [ADR-0007](0007-hub-settings-persistence.md), [ADR-0008](0008-hub-progress-save.md), [Craft commitments](../foundation/12-craft-commitments.md), [DESIGN.md — Sound](../../DESIGN.md)

## Context

The hub trains every visitor to "chap a door tae go in", and the locked door
answers a chap with a rotating Scots retort — but silently. A knock you can
hear is the missing half of the verb. The open question was the sound policy:
DESIGN.md said "explicit opt-in only", written when the only sound was
ambient music, and a knock that nobody hears by default is barely worth
shipping.

## Decision

The sound policy splits into two classes:

- **Ambient audio (music)** stays strictly opt-in: no autoplay, no preload,
  playback only after an explicit press of the music pill.
- **Interaction feedback (SFX)** defaults on with a persisted opt-out: it
  only ever plays *inside the visitor's own chap gesture* (keyboard interact
  or pointer tap), never spontaneously, so it is standard game feedback
  rather than autoplay.

The knock itself is hand-rolled WebAudio in `src/app/sfx.ts` — no sample
assets, no library. One chap-chap is two knocks 160ms apart; each knock is a
low triangle thump with a steep pitch drop plus a short square knuckle tick,
each through its own exponential-decay gain envelope. The AudioContext is
created lazily inside the first audible chap (a user gesture, so autoplay
policies are satisfied), reused for the session, and closed on destroy.
Platforms without WebAudio degrade to silence.

The preference persists as `sfx.enabled` in `ggis_hub_settings`, bumping the
envelope to **schema 2** — the first real migration through the shared
versioned-record codec (ADR-0008). The v1→v2 migration verifies the v1
digest before adopting the stored music preference and defaults `sfx.enabled`
to true; v0 migrates likewise. Both controllers now read-modify-write the
shared record so neither can clobber the other's section.

A "sounds on / sounds aff" pill sits left of the music pill (its own
`.scene-sfx` class so existing smoke selectors stay stable). Both pills'
accessible names lead with their visible text (WCAG 2.5.3 label-in-name) —
fixing a latent violation in the music button's playing state that the a11y
gate never saw because it never clicked the button.

The knock fires only for the locked door's chap. Launching a playable door
stays silent: navigation tears the page down mid-sound, and the knock is the
locked door *answering*, not a launch fanfare.

## Alternatives considered

- Keep all sound opt-in (knock behind the music toggle or its own opt-in).
  Rejected: a feedback sound nobody hears by default is dead weight, and
  gating feedback behind ambient-music consent muddles both meanings.
- Ship a recorded knock sample. Rejected: an MP3/OGG asset plus loader for a
  120ms sound, against the hand-roll-first craft commitment; the synthesized
  knock is ~60 lines and byte-free.
- Play the knock on launch too. Rejected: `window.location.assign` cuts the
  sound off mid-thump — worse than silence.

## Consequences

Positive:

- The bothy's core verb finally sounds like itself, with a one-click opt-out
  that survives revisits.
- The settings migration table has a real, golden-fixture-tested v1→v2
  worked example.
- Two WCAG 2.5.3 label-in-name defects (one latent) are fixed and the a11y
  gate now checks the new pill's focus indicator.

Negative:

- The stored settings golden pins moved to schema 2 — any tooling that
  hard-coded the v1 string must follow the migration path.
- The sound-policy is now two rules instead of one; DESIGN.md carries the
  split and future audio must pick its class deliberately.

## Reversal path

Easy. Removing the pill and the knock player returns the hub to music-only
sound; stored schema-2 records still parse (sfx section simply unused).
