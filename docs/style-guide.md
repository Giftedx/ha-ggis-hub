# Documentation Style Guide

Status: canonical documentation policy
Scope: how Markdown docs are named, structured, cross-linked, and maintained
Related: [Documentation index](README.md), [Autopilot rules](foundation/11-quality-manifesto.md#autopilot-rules)

## File naming

- Use lowercase kebab-case for general docs.
- Use a two-digit ordered prefix for foundation docs: `00-`, `01-`, … No hard upper bound; new ordered docs append.
- Use ADR numbers for decisions: `0001-short-title.md`.
- Use ISO dates for audits and plans: `YYYY-MM-DD-short-title.md`.

## Required header block

Every canonical doc should start with:

```text
# Title

Status: <one of the recognised statuses, optionally specialized>
Scope: what this document covers
Related: links to nearest docs
```

## Status meanings

Recognised root statuses:

- `canonical`: accepted policy or source of truth.
- `accepted`: accepted ADR decision.
- `proposed`: a draft decision requiring later acceptance.
- `planned`: target design that is not implemented yet.
- `current audit`: factual snapshot at audit time.
- `historical`: a snapshot that has been superseded but is retained as provenance (audits, completed plans). Implementation must not be driven from a historical doc.
- `superseded`: replaced by another document; do not implement from it.
- `section index`: a directory-level overview/catalogue of other docs.

Specialization is allowed when it clarifies the role — e.g. `canonical foundation policy`, `canonical scope definition`, `planned architecture`, `planned deployment foundation`. The root status must remain recognisable so readers can scan quickly.

## Examples and commands

Commands must be labelled by state:

- `current`: runnable in the current repo.
- `planned`: target command once scaffold exists.
- `example`: illustrative only.

Never present a planned command as current.

## Cross-linking

- Prefer relative links.
- Link to canonical docs rather than duplicating policy.
- Archive links are allowed only for provenance.

## Drift rule

If code/config changes make a doc inaccurate, update the doc in the same slice. Documentation drift is a correctness bug.
