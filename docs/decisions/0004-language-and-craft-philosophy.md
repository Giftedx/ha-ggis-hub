# ADR-0004: Language and Craft Philosophy

Status: accepted  
Date: 2026-05-22  
Related: [Quality manifesto](../foundation/11-quality-manifesto.md), [Stack decision record](../foundation/05-stack-decision-record.md), [Dependency policy](../foundation/06-dependency-policy.md), [Craft commitments](../foundation/12-craft-commitments.md)

## Context

The project is a professional portfolio artifact and labour of love. The user explicitly values hard, technically impressive languages and targets: Assembly, WebAssembly, C, Rust, and Go. They prefer premium optimized quality and are willing to work harder to avoid shallow, dependency-heavy output.

## Decision

Use systems-level language choices where they create real project value.

Default hierarchy for this project:

1. Rust for deterministic core logic, correctness, testability, and WASM delivery.
2. WebAssembly as the browser boundary for Rust core behavior.
3. TypeScript for browser orchestration because DOM, CSS, input, audio, and Vite are browser-native concerns.
4. Go only if future tooling, deployment orchestration, or local services need a simple durable binary.
5. C only for a specific low-level component with a clear reason.
6. Assembly only for deliberate measured showcases, not ordinary project glue.

## Rationale

This gives the project technical depth without fake difficulty. Rust/WASM demonstrates systems competence in the browser. TypeScript keeps the browser host practical. Go/C/Assembly remain available when they create value rather than complexity theater.

## Consequences

Positive:

- the project has a defensible premium technical identity
- deterministic logic is testable outside the browser
- future agent/eval loops can target headless core behavior
- language choices support portfolio storytelling

Negative:

- build complexity is higher than a pure TypeScript app
- agents must understand boundaries before editing
- some slices will move slower than framework-first development

## Guardrail

Harder technology must earn its keep. If a language choice does not improve quality, performance, correctness, control, or professional signal, it should not be used.

The specific artifacts this guardrail has approved — an FNV-1a hash in C, a xoshiro128\*\* kernel in WebAssembly Text, and a `haggis-eval` CLI in Go — are committed in [Craft commitments](../foundation/12-craft-commitments.md). Any future use of C, WAT, Assembly, or Go must be added to that doc (or rejected there) before any code is written.
