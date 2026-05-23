//! Differential test surface for the hand-rolled C and WAT kernels
//! committed under [Craft commitments §B](../../docs/foundation/12-craft-commitments.md).
//!
//! The C FNV-1a hash and the WAT xoshiro128** RNG are linked here only so
//! they can be diffed against the canonical Rust implementations in
//! `hub-core`. They are not runtime code paths.
//!
//! ## Unsafe relaxation
//!
//! This crate is the FFI seam to the committed C kernel at
//! `c/fnv1a.c`. The workspace forbids `unsafe_code`; the
//! `#![allow(unsafe_code)]` below is the one and only relaxation in the
//! codebase, and it exists solely so the `extern "C"` block can declare
//! `fnv1a_64` and the safe wrapper can call it. No other `unsafe` is
//! permitted in this crate.
//!
//! ## WAT runtime
//!
//! The WAT xoshiro128** kernel at `asm/xoshiro128_starstar.wat` is
//! compiled and instantiated under `wasmi` by `tests/differential_rng.rs`.
//! The driver code (`make_wat_rng`, `WatRngError`) lives in that
//! integration test rather than in this library because `wat` and
//! `wasmi` are `[dev-dependencies]` — per plan 3's directive to keep
//! them out of the production build graph — and `src/lib.rs` cannot
//! reference dev-deps. We re-export the WAT source string here so the
//! test can read it through a stable, in-crate path.

#![allow(unsafe_code)]

// The C FFI surface is only available on native targets — `build.rs`
// skips the `cc::Build` step under wasm32 because cc-rs cannot find a
// clang cross-compiler. The C wrapper is gated to match so `cargo check
// --target wasm32-unknown-unknown` stays green workspace-wide.
#[cfg(not(target_arch = "wasm32"))]
mod c_ffi {
    use core::ffi::c_uchar;

    #[link(name = "fnv1a_c", kind = "static")]
    unsafe extern "C" {
        fn fnv1a_64(data: *const c_uchar, len: usize) -> u64;
    }

    /// Compute FNV-1a 64-bit hash via the hand-rolled C kernel at
    /// `c/fnv1a.c`. Differential test asserts byte-identical output to
    /// `hub_core::hash::fnv1a_64`. Not available on `wasm32` targets;
    /// the wasm-side differential lands in plan 4 via Playwright.
    ///
    /// # Safety
    ///
    /// This is a safe wrapper. The underlying `extern "C"` function reads
    /// exactly `bytes.len()` bytes starting at `bytes.as_ptr()` and does
    /// not retain the pointer after returning, so the lifetime contract
    /// is guaranteed by the `&[u8]` reference.
    #[must_use]
    pub fn fnv1a_64_c(bytes: &[u8]) -> u64 {
        // SAFETY: `data` and `len` are derived from a live `&[u8]`; the C
        // function does not retain the pointer and only reads `len` bytes.
        unsafe { fnv1a_64(bytes.as_ptr(), bytes.len()) }
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub use c_ffi::fnv1a_64_c;

/// The committed hand-authored WAT source for the xoshiro128** kernel.
/// Re-exported here so the WAT-runtime integration test under `tests/`
/// can compile it via `wat::parse_str` without duplicating the
/// `include_str!` path glue.
pub const XOSHIRO_WAT_SOURCE: &str = include_str!("../../../asm/xoshiro128_starstar.wat");
