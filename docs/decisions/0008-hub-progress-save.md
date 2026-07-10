# ADR-0008: Hub Progress Save

Status: accepted
Date: 2026-07-10
Related: [Data and save boundaries](../architecture/data-and-save-boundaries.md), [ADR-0007](0007-hub-settings-persistence.md), [Craft commitments](../foundation/12-craft-commitments.md), [Implementation sequence — Slice 7](../plans/2026-05-22-implementation-sequence.md)

## Context

Slice 7 deferred the save framework "until the hub has stateful progress to
persist", and ADR-0007 repeated the trigger: `ggis_hub_save` waits for real
progress. The hub now has three pieces of visitor history worth remembering —
how often someone has come by, how the conversation with the coming-soon door
has gone (the chap retort rotation), and which doors they have actually gone
through. Session-local counters lost all three on every reload: the locked
door restarted its patter, and the bothy greeted its regulars like strangers.

This decision also needed to resolve a framework question: settings
(ADR-0007) hand-rolled its envelope inline, and a second persisted record
would either duplicate that envelope logic or extract it.

## Decision

The TypeScript host owns `ggis_hub_save` as a versioned localStorage record.
Schema 1 stores:

```json
{
  "schema": 1,
  "visits": 3,
  "lockedChaps": 5,
  "doorEntries": { "wild-haggis-survivors": 2 },
  "digest": "fnv1a64-hex"
}
```

Both hub records now share one hand-rolled envelope implementation:
`src/app/versioned-record.ts` owns the `{ schema, ...payload, digest }`
layout, the keyless FNV-1a 64 digest (tamper-evident, not cryptographic),
the corrupt-record → defaults degradation, and a migration table that maps
old stored records directly to the current value shape. `settings.ts` was
refactored onto the codec with its serialized bytes pinned by a golden test;
`progress.ts` is the second consumer. Each module owns only what its payload
means (validation, defaults, migrations).

Progress is **host-side only**. Nothing in `ggis_hub_save` enters the Rust
sim: seeds, state hashes, `.haggislog` replay, and the determinism gate are
untouched. Progress surfaces are presentation:

- the chap retort rotation indexes the lifetime `lockedChaps` count, so the
  locked door picks up the conversation where it left off;
- the status region greets a returning visitor (`visits >= 2`) through the
  announcer's fallback line (reduced-motion keeps its own quieter line);
- doors the visitor has entered before prompt `AWA' BACK IN` instead of
  `AWA' IN` (renderer receives the entered-door id set at mount).

All three surfaces are inert for a fresh visitor, so the visual golden,
browser smokes, and gate captures — which always start from empty storage —
see the first-visit hub unchanged.

## Alternatives considered

- Keep counters session-local. Loses the conversation-with-the-door charm
  and leaves the reserved key and Slice 7 commitment permanently open.
- Persist progress inside the Rust core and serialize through WASM. Rejected:
  progress is browser history about the visitor, not sim state; pushing it
  through the core would entangle the deterministic state hash with
  wall-clock visitor identity.
- A second inline envelope in `progress.ts` (copy the settings pattern).
  Rejected: two copies of digest/migration/fallback glue is exactly the
  drift the quality manifesto warns about; the codec extraction keeps one
  tested implementation.
- Mantel trinket art keyed to progress. Deferred: the painted backdrop owns
  the mantel pixels; procedural trinkets over painterly art need an art pass,
  not a persistence slice.

## Rationale

The trigger condition Slice 7 set ("run-history, customization, settings")
is now genuinely met by run-history. Keeping the framework in TypeScript
matches ADR-0007's reasoning: browser records live near the DOM host. The
migration table is deliberately a flat "old record → current value" mapping
rather than chained schema transforms — with one or two live versions per
record, per-era parse functions with golden fixtures are the honest amount
of machinery, and the settings v0 migration already demonstrates the pattern
the next schema bump will follow.

## Consequences

Positive:

- Slice 7's deferred save framework exists, tested, with golden envelope
  fixtures for both records.
- The bothy remembers its regulars; the locked door's patter is a
  conversation, not a loop reset.
- Future stateful slices add a payload field + migration entry instead of
  new storage plumbing.

Negative:

- The stored envelope is now a compatibility surface with visitors'
  browsers; the golden byte pins must be updated deliberately on any schema
  bump, never incidentally.
- `visits` counts hub loads, so gate runs and smoke tests inflate it inside
  their own browser contexts (fresh contexts per run keep gates untouched).

## Reversal path

Easy. Deleting the progress record returns every surface to first-visit
copy; the key degrades to defaults on any parse failure by construction.

## Follow-up ADRs expected

- Settings schema 2+ (first real migration through the shared codec) when a
  new preference lands.
