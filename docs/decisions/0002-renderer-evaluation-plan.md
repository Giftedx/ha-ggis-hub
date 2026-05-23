# ADR-0002: Renderer Evaluation Plan

Status: superseded by [ADR-0005](0005-canvas2d-first-room-renderer.md)
Date: 2026-05-22
Related: [Architecture options](../foundation/04-architecture-options.md), [Runtime boundaries](../architecture/runtime-boundaries.md), [ADR template](adr-template.md)

This ADR uses the decision-pending shape. The renderer choice has not been made; this document commits to *how* it will be made and what evidence must exist before a follow-up ADR records the actual choice.

## Context

The accepted architecture requires a replaceable renderer. The first public slice needs intentional visuals but should not take on unnecessary rendering complexity.

## Decision to make

Choose the first-slice renderer:

- Canvas2D custom renderer
- PixiJS renderer
- another option only if justified by evidence

## Evaluation criteria

- bundle size
- first-load impact
- ability to render the first bothy room cleanly
- lifecycle cleanup complexity
- accessibility/fallback compatibility
- visual polish ceiling
- how much engine behavior it smuggles into architecture
- testability under Playwright

## Current recommendation

Start with Canvas2D if the first room remains simple. Choose PixiJS only if sprite batching, filters, texture management, or effects clearly justify the dependency.

## Required evidence before accepting

- a short spike or written comparison
- estimated bundle impact
- lifecycle cleanup plan
- test plan
- dependency rationale if PixiJS is chosen
