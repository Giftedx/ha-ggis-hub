# ADR-0007: Hub Settings Persistence

Status: accepted
Date: 2026-06-27
Related: [Data and save boundaries](../architecture/data-and-save-boundaries.md), [Craft commitments](../foundation/12-craft-commitments.md), [ADR-0003](0003-whs-integration-strategy.md)

## Context

The hub has a real browser-owned preference now: the opt-in music control. The
project already reserved `ggis_hub_settings`, but the data-boundary docs still
described all hub persistence as deferred.

This decision needs to persist hub-owned preferences without crossing into Wild
Haggis Survivors state, without adding a storage library, and without implying
that the browser may autoplay music on a future visit.

## Decision

The TypeScript host owns `ggis_hub_settings` as a versioned localStorage record.
Schema 1 stores:

```json
{
  "schema": 1,
  "music": {
    "enabled": true,
    "trackIndex": 1
  },
  "digest": "fnv1a64-hex"
}
```

The digest is a keyless FNV-1a 64-bit checksum of the canonical schema payload
without the `digest` field. It is tamper-evident against accidental corruption;
it is not a cryptographic signature. Corrupt, malformed, or unavailable storage
falls back to defaults and must not block hub startup.

The music controller may use the saved track index immediately, but it must not
autoplay audio on page load. The `enabled` flag records the visitor's last
explicit playback preference; playback still requires a fresh user gesture.

`ggis_hub_save` remains deferred until the hub has actual progress,
customisation, or another gameplay state worth saving.

## Alternatives considered

- Keep all persistence deferred. This avoids storage complexity but loses a
  real user preference and leaves the documented key unused.
- Build the full Rust save schema now. That would satisfy the long-term
  save-framework commitment, but the hub has no progress state yet, so it would
  be an empty framework.
- Reuse or inspect WHS localStorage keys. Rejected: the hub must not write or
  scrape WHS internals.

## Rationale

Settings are a browser-host concern. Keeping this first persistence slice in
TypeScript keeps the storage API near the DOM/audio controller and avoids a
Rust/WASM round trip for a small preference object. The FNV digest reuses the
project's existing hand-rolled checksum primitive and gives tests a concrete
corruption boundary without adding a dependency.

Separating `ggis_hub_settings` from `ggis_hub_save` also keeps the future save
framework honest: when gameplay state exists, it can receive its own ADR,
fixtures, migration tests, and integrity policy instead of inheriting a
music-preference shape.

## Consequences

Positive:

- The hub now has a real, owned settings persistence path.
- WHS keys remain off-limits.
- Browser storage failures stay non-fatal.
- The first migration path is tested through a legacy v0 fixture.

Negative:

- The TypeScript FNV helper is now shared by both `.haggislog` and settings
  persistence, so changes to it need both surfaces in mind.
- The `enabled` flag cannot mean "autoplay on startup" because browsers block
  unprompted audio; it means "last explicit playback preference".

## Reversal path

Moderate. If hub settings grow beyond simple browser preferences, the record can
be superseded by a `ggis_hub_save` schema or a Rust/WASM-backed serializer. A new
ADR should define that transition and include migration from schema 1.

## Follow-up ADRs expected

- Save schema and migration policy for `ggis_hub_save` once the hub has
  progress, customisation, or another gameplay state worth persisting.
