//! Differential test: WAT xoshiro128** (`asm/xoshiro128_starstar.wat`) vs
//! Rust xoshiro128** (`hub_core::rng`). Both must produce byte-identical
//! u32 streams from any seed.
//!
//! The 1 000 000-draw stream from seed 1 is the spec's gate
//! (docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md
//! §2.2). Smaller streams from a handful of seeds give faster feedback
//! during local development.
//!
//! ## Why the WAT runtime lives here, not in `src/lib.rs`
//!
//! Plan 3 phase 2 calls for `wat` and `wasmi` to be `[dev-dependencies]`
//! so they stay out of the production / wasm32 build graph. Dev-deps
//! are invisible to `src/lib.rs`, so `make_wat_rng` and `WatRngError`
//! live here in the integration test that needs them. The WAT source
//! itself is re-exported as `hub_hardlang::XOSHIRO_WAT_SOURCE` so this
//! file does not need to know the `../../../asm/...` include path.

use hub_core::rng::Rng;
use hub_hardlang::XOSHIRO_WAT_SOURCE;
use wasmi::{Engine, Linker, Memory, Module, Store, TypedFunc};

/// Errors produced while bootstrapping the WAT module.
#[derive(Debug)]
enum WatRngError {
    /// `wat` could not parse `xoshiro128_starstar.wat`.
    Parse(wat::Error),
    /// `wasmi` could not load the compiled module or its export shape did
    /// not match the expected `(memory, next_u32)` surface.
    Instantiate(String),
}

impl core::fmt::Display for WatRngError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::Parse(e) => write!(f, "WAT parse error: {e}"),
            Self::Instantiate(s) => write!(f, "WAT instantiation error: {s}"),
        }
    }
}

impl std::error::Error for WatRngError {}

/// `state_ptr` we hand to the WAT kernel on every call. The kernel does
/// not care which offset we choose; offset zero keeps host glue trivial.
const STATE_PTR: i32 = 0;

/// Compile and instantiate the committed WAT RNG kernel under `wasmi`,
/// returning a closure that advances the host-owned `[u32; 4]` state in
/// place and returns the same `u32` the Rust `Rng` would produce.
///
/// # Errors
///
/// Returns [`WatRngError::Parse`] if the WAT source fails to compile and
/// [`WatRngError::Instantiate`] if the resulting module does not expose
/// the expected `(memory, next_u32)` shape.
fn make_wat_rng() -> Result<impl FnMut(&mut [u32; 4]) -> u32, WatRngError> {
    let wasm_bytes = wat::parse_str(XOSHIRO_WAT_SOURCE).map_err(WatRngError::Parse)?;
    let engine = Engine::default();
    let module = Module::new(&engine, &wasm_bytes[..])
        .map_err(|e| WatRngError::Instantiate(e.to_string()))?;
    let mut store: Store<()> = Store::new(&engine, ());
    let linker: Linker<()> = Linker::new(&engine);
    let instance_pre = linker
        .instantiate(&mut store, &module)
        .map_err(|e| WatRngError::Instantiate(e.to_string()))?;
    let instance = instance_pre
        .start(&mut store)
        .map_err(|e| WatRngError::Instantiate(e.to_string()))?;

    let memory: Memory = instance
        .get_memory(&store, "memory")
        .ok_or_else(|| WatRngError::Instantiate("missing `memory` export".into()))?;
    let next_u32: TypedFunc<i32, i32> = instance
        .get_typed_func(&store, "next_u32")
        .map_err(|e| WatRngError::Instantiate(format!("next_u32: {e}")))?;

    Ok(move |state: &mut [u32; 4]| -> u32 {
        let mut bytes = [0u8; 16];
        bytes[0..4].copy_from_slice(&state[0].to_le_bytes());
        bytes[4..8].copy_from_slice(&state[1].to_le_bytes());
        bytes[8..12].copy_from_slice(&state[2].to_le_bytes());
        bytes[12..16].copy_from_slice(&state[3].to_le_bytes());
        memory
            .write(&mut store, STATE_PTR as usize, &bytes)
            .expect("memory write");

        let result_i32 = next_u32.call(&mut store, STATE_PTR).expect("next_u32 call");

        memory
            .read(&store, STATE_PTR as usize, &mut bytes)
            .expect("memory read");
        state[0] = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
        state[1] = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
        state[2] = u32::from_le_bytes(bytes[8..12].try_into().unwrap());
        state[3] = u32::from_le_bytes(bytes[12..16].try_into().unwrap());

        result_i32.cast_unsigned()
    })
}

fn diff_streams(seed_state: [u32; 4], draws: usize) {
    let mut wat_rng = make_wat_rng().expect("WAT module instantiates");
    let mut rust_rng = Rng::from_state(seed_state);
    let mut wat_state = seed_state;
    for i in 0..draws {
        let w = wat_rng(&mut wat_state);
        let r = rust_rng.next_u32();
        assert_eq!(w, r, "WAT/Rust diverged at draw {i}");
    }
}

#[test]
fn wat_matches_rust_for_seed_one_short_stream() {
    // Use the same SplitMix64 expansion the kernel itself uses, by
    // building a Rust Rng from seed(1) and reading its starting state.
    let starting_state = Rng::seed(1).state();
    diff_streams(starting_state, 1_024);
}

#[test]
fn wat_matches_rust_for_multiple_seeds_medium_stream() {
    for seed in [0u64, 1, 42, 9999, u64::MAX] {
        let starting_state = Rng::seed(seed).state();
        diff_streams(starting_state, 16_384);
    }
}

/// The spec-gated 1M-draw differential. Slower (~5-15 s under wasmi);
/// gated behind `#[ignore]` for the everyday `cargo test` run and
/// invoked explicitly in CI / by `haggis-eval differential rng`.
#[test]
#[ignore = "spec gate; takes 5-15s — run with `cargo test -- --include-ignored`"]
fn wat_matches_rust_for_seed_one_million_draws() {
    let starting_state = Rng::seed(1).state();
    diff_streams(starting_state, 1_000_000);
}
