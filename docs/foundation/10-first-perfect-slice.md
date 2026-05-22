# 10 First Perfect Slice

Status: canonical scope definition  
Scope: first public-quality deliverable  
Related: [Product vision](03-product-vision.md), [Technical bar](02-technical-bar.md), [Release definition](09-release-definition.md)

## Definition

The First Perfect Slice is the smallest public slice that demonstrates the final standard of craft.

It is not an MVP. It is small by design and excellent by requirement.

## Included product scope

- `ha.ggis.xyz` brand treatment.
- Visible domain joke: `ha + ggis = haggis` or `say it without the dot`.
- A tiny playable haggis hub room/bothy.
- Keyboard movement for the haggis.
- One active Wild Haggis Survivors door.
- At least one locked/future door.
- Door interaction prompt.
- Direct `Play Wild Haggis Survivors` button outside the canvas.
- Basic responsive fallback.
- Reduced-motion consideration.

## Included engineering scope

- Rust `hub-core` for movement/interaction state.
- WASM wrapper for browser use.
- TypeScript/Vite host.
- Replaceable renderer.
- Data-driven game registry.
- Explicit game module lifecycle.
- Unit tests for registry, launch URL, input mapping.
- Rust tests for movement bounds and door interaction.
- Browser smoke test for load and direct play.
- Deployment header/redirect plan.

## Excluded from first slice

- accounts
- cloud save
- multiplayer
- achievements
- large overworld
- multiple complete games
- WebGPU-only renderer
- complex custom asset pipeline
- final WHS static mount if an external link is safer initially

## Human playability test

A real visitor must be able to answer without guidance:

- What is this?
- How do I move?
- How do I play Wild Haggis Survivors?
- What does `ha.ggis` mean?
- What do locked/future doors imply?

If the answer requires contributor explanation, the slice is not done.

## Engineering acceptance test

The slice is not done until the relevant gates in [Quality gates](07-quality-gates.md) pass and docs are updated to match the implementation.
