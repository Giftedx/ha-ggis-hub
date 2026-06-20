# Security Policy

Status: canonical security policy (live static-app phase)
Scope: how to report vulnerabilities in `ha.ggis Hub`
Related: [Security model](docs/architecture/security-model.md), [Dependency policy](docs/foundation/12-craft-commitments.md#dependency-policy), [Quality gates](docs/foundation/07-quality-gates.md)

## Current phase

The project is live at `https://ha.ggis.xyz/` with static routes for the hub,
Wild Haggis Survivors (`/wild/`), and Just Five More Minutes
(`/just-five-more-minutes/`). It still has no accounts, backend, payments, or
production user data. The dominant security concerns at this stage are:

- supply chain for the Rust/WASM, TypeScript, Go, and mounted-game build inputs
- unsafe browser/WASM boundary patterns as the hub grows
- deployment/header drift on the Cloudflare Pages edge
- documentation drift that would lead future implementers into an insecure pattern
- accidental commitment of secrets into the repository

See [docs/architecture/security-model.md](docs/architecture/security-model.md) for the full threat model.

## Supported versions

No tagged version-support policy exists yet. The supported public surface is the
current Cloudflare Pages production deployment for `ha.ggis.xyz` and the current
`main` branch state that produces it.

## Reporting a vulnerability

If you believe you have found a security issue in this repository — including documentation that would lead an implementer into an insecure configuration (CSP relaxation, header weakening, supply-chain advice, exposed secret guidance) — please report it privately rather than opening a public issue.

Preferred channel (placeholder — maintainer to update):

```text
security@<project-domain>
```

Until the project's contact channel is finalized, please reach out via the maintainer's GitHub profile or the address on the public project page once one exists. Do not open a public issue for a sensitive disclosure.

Please include:

- a description of the issue
- the file(s) or document(s) involved
- impact and any reproduction steps
- whether the issue is being disclosed elsewhere

## What to expect

This project is maintained by an individual. There is no on-call rotation. A reasonable acknowledgement target is 7 days. Fixes for in-repository documentation issues should land in the same review window once acknowledged.

## Out of scope

- Generic security best-practice suggestions that do not correspond to a concrete document or commit.
- Issues in unrelated third-party hosts that happen to be linked from this repository.
- Vulnerabilities in `Wild Haggis Survivors` — that is a separate project and must be reported there.

## Hardening commitments

The project's intended public posture is recorded in [docs/architecture/security-model.md](docs/architecture/security-model.md), the shipped `public/_headers`, and [docs/deployment/cloudflare-pages.md](docs/deployment/cloudflare-pages.md). Any deviation at deploy time is a release blocker per [docs/foundation/07-quality-gates.md](docs/foundation/07-quality-gates.md) and should be caught by `pnpm run production:check`.
