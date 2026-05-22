# Security Policy

Status: canonical security policy (executable foundation phase)
Scope: how to report vulnerabilities in `ha.ggis Hub`
Related: [Security model](docs/architecture/security-model.md), [Dependency policy](docs/foundation/06-dependency-policy.md), [Quality gates](docs/foundation/07-quality-gates.md)

## Current phase

The project has an executable foundation skeleton but no public release, no deployed production surface, and no production user data. The dominant security concerns at this stage are:

- supply chain for the newly introduced Rust/WASM and TypeScript build dependencies
- unsafe browser/WASM boundary patterns as the scaffold grows
- documentation drift that would lead future implementers into an insecure pattern
- accidental commitment of secrets into the repository

See [docs/architecture/security-model.md](docs/architecture/security-model.md) for the full threat model.

## Supported versions

No release has been cut. Once a public release exists, this section will list which versions receive security updates.

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

The project's intended public posture is recorded in [docs/architecture/security-model.md](docs/architecture/security-model.md) and the planned `public/_headers` in [docs/deployment/cloudflare-pages.md](docs/deployment/cloudflare-pages.md). Any deviation from those at release time is a release blocker per [docs/foundation/07-quality-gates.md](docs/foundation/07-quality-gates.md).
