# 2026-05-22 Foundation Research Notes

Status: current research notes  
Scope: external references and uncertainty log for foundation docs

## External checks performed

Automated fetch checks were performed for selected public references:

- MDN Content Security Policy `script-src`: reachable with HTTP 200.
- rustwasm wasm-bindgen guide: reachable with HTTP 200.
- Cloudflare Pages headers/redirects docs: automated fetch returned HTTP 403 from this environment, so deployment details are treated as planned and must be re-verified manually or through browser access before production.

## Research-informed positions

- WASM under CSP commonly needs explicit script policy support; current docs use `wasm-unsafe-eval` as the planned baseline and require verification during implementation.
- wasm-bindgen/wasm-pack remains the planned initial Rust-to-browser boundary tooling.
- Cloudflare Pages `_headers` and `_redirects` are documented as planned files and must be verified against Cloudflare’s current behavior before production launch.

## Uncertainties to resolve during implementation

- Exact CSP needed by the final Vite/WASM output.
- Whether Cloudflare Pages build image can comfortably install and run the Rust/WASM toolchain.
- Whether HSTS preload is safe for all relevant subdomains.
- Whether first-slice renderer needs PixiJS or can remain Canvas2D.

## Policy

Do not treat these notes as implementation proof. They are research inputs. Production deployment still requires direct verification against built artifacts and the hosting environment.
