//! Differential test surface for the hand-rolled C and WAT kernels
//! committed under [Craft commitments §B](../../docs/foundation/12-craft-commitments.md).
//!
//! The C FNV-1a hash (and, in plan 3 phase 2, the WAT xoshiro128** RNG)
//! are linked here only so they can be diffed against the canonical Rust
//! implementations in `hub-core`. They are not runtime code paths.
//!
//! ## Unsafe relaxation
//!
//! This crate is the FFI seam to the committed C kernel at
//! `c/fnv1a.c`. The workspace forbids `unsafe_code`; the
//! `#![allow(unsafe_code)]` below is the one and only relaxation in the
//! codebase, and it exists solely so the `extern "C"` block can declare
//! `fnv1a_64` and the safe wrapper can call it. No other `unsafe` is
//! permitted in this crate.

#![allow(unsafe_code)]

use core::ffi::c_uchar;

#[link(name = "fnv1a_c", kind = "static")]
unsafe extern "C" {
    fn fnv1a_64(data: *const c_uchar, len: usize) -> u64;
}

/// Compute FNV-1a 64-bit hash via the hand-rolled C kernel at
/// `c/fnv1a.c`. Differential test asserts byte-identical output to
/// `hub_core::hash::fnv1a_64`.
///
/// # Safety
///
/// This is a safe wrapper. The underlying `extern "C"` function reads
/// exactly `bytes.len()` bytes starting at `bytes.as_ptr()` and does not
/// retain the pointer after returning, so the lifetime contract is
/// guaranteed by the `&[u8]` reference.
#[must_use]
pub fn fnv1a_64_c(bytes: &[u8]) -> u64 {
    // SAFETY: `data` and `len` are derived from a live `&[u8]`; the C
    // function does not retain the pointer and only reads `len` bytes.
    unsafe { fnv1a_64(bytes.as_ptr(), bytes.len()) }
}
