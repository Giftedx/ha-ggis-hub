# Kernel Hard-Language Differentials Implementation Plan

> **Historical plan, preserved as provenance.** The hard-language differential
> work described here has landed: C FNV-1a, WAT xoshiro128**, hub-hardlang
> differential tests, and the corresponding `haggis-eval` gates are current
> shipped surfaces. Current truth lives in [`asm/`](../../../asm/),
> [`c/`](../../../c/), [`crates/hub-hardlang/`](../../../crates/hub-hardlang/),
> [Craft commitments](../../foundation/12-craft-commitments.md), and
> [Quality gates](../../foundation/07-quality-gates.md). Do not treat unchecked
> task boxes or "to implement this plan" language below as live work.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the two hard-language committed artifacts from [Craft commitments §B](../../foundation/12-craft-commitments.md) — a hand-authored `asm/xoshiro128_starstar.wat` RNG kernel and a hand-rolled `c/fnv1a.c` hash kernel — with differential tests asserting byte-identical behaviour against the existing Rust implementations over millions of draws / fuzzed bytes.

**Architecture:** New workspace crate `crates/hub-hardlang/` carries both differential test surfaces. The C source lives at workspace-root `c/fnv1a.c` and is compiled via `cc-rs` at build time into a native object linked into the crate. The WAT source lives at workspace-root `asm/xoshiro128_starstar.wat` and is compiled in-process at test time via the pure-Rust `wat` crate, then executed under `wasmi` (an interpreter — no JIT toolchain needed). Both differentials run under `cargo test -p hub-hardlang` and are wired into the workspace `cargo test --workspace` gate. Plan 4's `haggis-eval` CLI surfaces them as `haggis-eval differential rng` and `haggis-eval differential hash` subcommands.

**Tech Stack:** Rust 2024 edition, `cc` build-dep for the C side, `wat` + `wasmi` dev-deps for the WAT side, `proptest` dev-dep for fuzz. A working C compiler (clang/gcc/MSVC) must be on PATH for native test builds. No new runtime deps; no host changes.

---

## File Structure

**Created (new):**
- `crates/hub-hardlang/Cargo.toml` — declares the new crate, depends on `hub-core` for the Rust reference implementations.
- `crates/hub-hardlang/build.rs` — compiles `../../c/fnv1a.c` via `cc-rs` into a native object.
- `crates/hub-hardlang/src/lib.rs` — `extern "C"` declaration of the C hash + safe Rust wrapper `pub fn fnv1a_64_c(bytes: &[u8]) -> u64`; WAT RNG runtime in `pub fn next_u32_wat(state: &mut [u32; 4]) -> u32` that lazily compiles the WAT and calls its single export under `wasmi`.
- `crates/hub-hardlang/tests/differential_hash.rs` — integration test diffing `fnv1a_64_c` against `hub_core::hash::Fnv1a64` over published vectors + 100 000 fuzzed inputs.
- `crates/hub-hardlang/tests/differential_rng.rs` — integration test diffing `next_u32_wat` against `hub_core::rng::Rng::next_u32` over 1 000 000 draws from fixed seeds.
- `c/fnv1a.c` — ~40 LOC hand-written FNV-1a 64-bit hash.
- `asm/xoshiro128_starstar.wat` — hand-authored xoshiro128** kernel exporting `next_u32(state_ptr: i32) -> i32`.

**Modified:**
- `Cargo.toml` (workspace) — add `crates/hub-hardlang` to `[workspace].members`.
- `crates/hub-core/src/rng.rs` — expose a `pub(crate)` helper that the new crate can use to construct an `Rng` from raw `[u32; 4]` state (so the differential test can seed both backends from a shared SplitMix64 expansion). This is a small surface widening, scoped to within-workspace use.

**Untouched (must stay green):**
- All of `src/**`, `hub-wasm`, all generated bindings. No host changes.

---

## Phase 0 — Baseline

### Task 0: Confirm baseline + toolchain

- [ ] **Step 0.1: Confirm baseline gates pass**

Run, expecting all green:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```
On PowerShell:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
Expected: 39 cargo tests, 43 vitest tests, all clean.

- [ ] **Step 0.2: Confirm a C compiler is on PATH**

Try in order: `clang --version`, `gcc --version`, `cl /?` (Windows MSVC — typically activated via `vcvars64.bat`).

At least one must print a version. Plan 1's RNG reference-vector regeneration confirmed MSVC works on this machine. If none of the three resolve, install one before continuing. The plan assumes the implementer can compile C natively.

- [ ] **Step 0.3: Note current commit SHA**

Run: `git rev-parse HEAD`. Record the SHA — used as baseline for diffstats and rollback if needed.

---

## Phase 1 — C FNV-1a kernel + native differential

### Task 1: Author the C source

**Files:**
- Create: `c/fnv1a.c`

- [ ] **Step 1.1: Create `c/` and write the source**

Create directory `c/` at the workspace root, then create `c/fnv1a.c`:
```c
/*
 * FNV-1a 64-bit hash (Fowler/Noll/Vo) — committed C kernel.
 *
 * Differentially tested against crates/hub-core/src/hash.rs by
 * crates/hub-hardlang/tests/differential_hash.rs. Both implementations
 * MUST agree byte-for-byte on every input.
 *
 * Algorithm constants taken from the public reference at
 * http://www.isthe.com/chongo/tech/comp/fnv/.
 */

#include <stddef.h>
#include <stdint.h>

static const uint64_t FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325ULL;
static const uint64_t FNV_PRIME_64        = 0x100000001b3ULL;

uint64_t fnv1a_64(const uint8_t *data, size_t len) {
    uint64_t hash = FNV_OFFSET_BASIS_64;
    for (size_t i = 0; i < len; i++) {
        hash ^= (uint64_t)data[i];
        hash *= FNV_PRIME_64;
    }
    return hash;
}
```

### Task 2: Bootstrap the `hub-hardlang` crate

**Files:**
- Create: `crates/hub-hardlang/Cargo.toml`
- Create: `crates/hub-hardlang/build.rs`
- Create: `crates/hub-hardlang/src/lib.rs`
- Modify: `Cargo.toml` (workspace)

- [ ] **Step 2.1: Add the crate to the workspace**

In the root `Cargo.toml`, append to `[workspace].members`:
```toml
[workspace]
members = [
  "crates/hub-core",
  "crates/hub-wasm",
  "crates/hub-hardlang",
]
```

- [ ] **Step 2.2: Write the crate manifest**

Create `crates/hub-hardlang/Cargo.toml`:
```toml
[package]
name = "hub-hardlang"
version = "0.1.0"
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true

[lints]
workspace = true

[dependencies]

[build-dependencies]
cc = "1"

[dev-dependencies]
hub-core = { path = "../hub-core" }
proptest = { version = "1", default-features = false, features = ["std"] }
```

- [ ] **Step 2.3: Write the build script**

Create `crates/hub-hardlang/build.rs`:
```rust
fn main() {
    println!("cargo:rerun-if-changed=../../c/fnv1a.c");
    cc::Build::new()
        .file("../../c/fnv1a.c")
        .warnings(true)
        .extra_warnings(true)
        .compile("fnv1a_c");
}
```

`cc::Build::compile` produces a static library `libfnv1a_c.a` and emits `cargo:rustc-link-lib=static=fnv1a_c` automatically, so the FFI symbol becomes visible to `extern "C"` declarations in the crate.

- [ ] **Step 2.4: Write the safe Rust wrapper**

Create `crates/hub-hardlang/src/lib.rs`:
```rust
//! Differential test surface for the hand-rolled C and WAT kernels
//! committed under [Craft commitments §B](../../docs/foundation/12-craft-commitments.md).
//!
//! The C FNV-1a hash and the WAT xoshiro128** RNG are linked here only so
//! they can be diffed against the canonical Rust implementations in
//! `hub-core`. They are not runtime code paths.

#![allow(unsafe_code)] // FFI to a small, committed C kernel is the point.

use core::ffi::c_uchar;

#[link(name = "fnv1a_c", kind = "static")]
unsafe extern "C" {
    fn fnv1a_64(data: *const c_uchar, len: usize) -> u64;
}

/// Compute FNV-1a 64-bit hash via the hand-rolled C kernel at
/// `c/fnv1a.c`. Differential test asserts byte-identical output to
/// `hub_core::hash::fnv1a_64`.
#[must_use]
pub fn fnv1a_64_c(bytes: &[u8]) -> u64 {
    // SAFETY: `data` and `len` are derived from a live `&[u8]`; the C
    // function does not retain the pointer and only reads `len` bytes.
    unsafe { fnv1a_64(bytes.as_ptr(), bytes.len()) }
}
```

> The `#![allow(unsafe_code)]` is the one place in this codebase where the workspace `unsafe_code = "forbid"` lint must be relaxed — calling into the committed C kernel through an FFI shim is the explicit point of the crate. Document the relaxation in a module-level comment. Other relaxations remain forbidden; clippy continues to apply.

- [ ] **Step 2.5: Verify the crate builds**

Run: `cargo build -p hub-hardlang`
Expected: succeeds; one warning about unused `fnv1a_64_c` would normally fire but `#[must_use]` does not affect dead-code analysis on `pub` items, so the workspace lints should stay quiet.

If `cc::Build` cannot find a compiler, `cargo build` will print the usual `cc-rs` error pointing at the missing toolchain. Fix locally and rerun.

### Task 3: Differential test — published vectors

**Files:**
- Create: `crates/hub-hardlang/tests/differential_hash.rs`

- [ ] **Step 3.1: Author the vector test**

Create `crates/hub-hardlang/tests/differential_hash.rs`:
```rust
//! Differential test: C FNV-1a (c/fnv1a.c) vs Rust FNV-1a
//! (hub_core::hash). Both implementations must agree byte-for-byte on
//! every input.

use hub_core::hash::fnv1a_64 as fnv1a_64_rust;
use hub_hardlang::fnv1a_64_c;
use proptest::prelude::*;

/// Published reference vectors from the FNV reference page
/// (http://www.isthe.com/chongo/tech/comp/fnv/). The Rust implementation
/// is already tested against these; here we assert the C implementation
/// agrees with both the published value and the Rust implementation.
const REFERENCE_VECTORS: &[(&[u8], u64)] = &[
    (b"", 0xcbf2_9ce4_8422_2325),
    (b"a", 0xaf63_dc4c_8601_ec8c),
    (b"foobar", 0x8594_4171_f739_67e8),
    (b"chongo was here!\n", 0x4681_0940_eff5_f915),
];

#[test]
fn c_matches_published_reference_vectors() {
    for (input, expected) in REFERENCE_VECTORS {
        let c_value = fnv1a_64_c(input);
        let rust_value = fnv1a_64_rust(input);
        assert_eq!(c_value, *expected, "C disagrees with published vector for {input:?}");
        assert_eq!(rust_value, *expected, "Rust drifted from published vector for {input:?}");
        assert_eq!(c_value, rust_value, "C and Rust disagree for {input:?}");
    }
}

proptest! {
    /// Fuzz: 100 000 random byte sequences up to 4 KiB. C and Rust must
    /// produce identical 64-bit digests for every one. `proptest`'s
    /// default config caps cases at 256; we override here to hit the
    /// 100 000 the spec calls for.
    #![proptest_config(ProptestConfig { cases: 100_000, .. ProptestConfig::default() })]
    #[test]
    fn c_matches_rust_for_arbitrary_bytes(
        input in proptest::collection::vec(any::<u8>(), 0..4096),
    ) {
        prop_assert_eq!(fnv1a_64_c(&input), fnv1a_64_rust(&input));
    }
}
```

- [ ] **Step 3.2: Run the differential**

Run: `cargo test -p hub-hardlang --test differential_hash`
Expected: 2 tests pass. The fuzz test runs 100 000 cases — on a modern machine this completes in a few seconds. If it diverges on any case, `proptest` shrinks to a minimal failing input and the test fails with both digests printed.

### Task 4: Phase 1 fmt/clippy + commit

- [ ] **Step 4.1: Run workspace gates**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```
All green. The new crate should add 2 tests to the workspace total (39 → 41 ish).

- [ ] **Step 4.2: Commit**

Run:
```
git add c/ crates/hub-hardlang/ Cargo.toml
git commit -m "feat(hardlang): add c/fnv1a.c with C/Rust differential test"
```

---

## Phase 2 — WAT xoshiro128** kernel + native differential

### Task 5: Author the WAT source

**Files:**
- Create: `asm/xoshiro128_starstar.wat`

- [ ] **Step 5.1: Create `asm/` and write the WAT**

Create directory `asm/` at workspace root, then create `asm/xoshiro128_starstar.wat`:
```wat
;; xoshiro128** PRNG kernel (Blackman & Vigna, https://prng.di.unimi.it/)
;; Committed hand-authored WebAssembly Text artifact per
;; docs/foundation/12-craft-commitments.md §B.
;;
;; Memory contract:
;;   The host allocates the four-word RNG state externally and passes a
;;   pointer (in linear-memory bytes) on every call. We read 4 u32s LE
;;   starting at state_ptr, advance them per the xoshiro128** step, and
;;   write the updated state back to the same offsets.
;;
;; Differentially tested against crates/hub-core/src/rng.rs by
;; crates/hub-hardlang/tests/differential_rng.rs. Byte-identical output
;; over a 1 000 000-draw stream from seed 1 is the gate.

(module
  ;; 1 page = 64 KiB. We need 16 bytes for state at host-chosen offset;
  ;; one page is wildly more than required and keeps host integration
  ;; trivial.
  (memory (export "memory") 1)

  ;; next_u32(state_ptr: i32) -> i32
  ;; Read [s0, s1, s2, s3] from state_ptr, advance state, write back,
  ;; return the xoshiro128** mixed output.
  (func (export "next_u32") (param $state_ptr i32) (result i32)
    (local $s0 i32)
    (local $s1 i32)
    (local $s2 i32)
    (local $s3 i32)
    (local $t  i32)
    (local $result i32)

    ;; Load state.
    (local.set $s0 (i32.load (local.get $state_ptr)))
    (local.set $s1 (i32.load (i32.add (local.get $state_ptr) (i32.const 4))))
    (local.set $s2 (i32.load (i32.add (local.get $state_ptr) (i32.const 8))))
    (local.set $s3 (i32.load (i32.add (local.get $state_ptr) (i32.const 12))))

    ;; result = rotl(s1 * 5, 7) * 9
    (local.set $result
      (i32.mul
        (i32.rotl
          (i32.mul (local.get $s1) (i32.const 5))
          (i32.const 7))
        (i32.const 9)))

    ;; t = s1 << 9
    (local.set $t (i32.shl (local.get $s1) (i32.const 9)))

    ;; s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3;
    (local.set $s2 (i32.xor (local.get $s2) (local.get $s0)))
    (local.set $s3 (i32.xor (local.get $s3) (local.get $s1)))
    (local.set $s1 (i32.xor (local.get $s1) (local.get $s2)))
    (local.set $s0 (i32.xor (local.get $s0) (local.get $s3)))

    ;; s2 ^= t; s3 = rotl(s3, 11);
    (local.set $s2 (i32.xor (local.get $s2) (local.get $t)))
    (local.set $s3 (i32.rotl (local.get $s3) (i32.const 11)))

    ;; Store state back.
    (i32.store (local.get $state_ptr)                                (local.get $s0))
    (i32.store (i32.add (local.get $state_ptr) (i32.const 4))        (local.get $s1))
    (i32.store (i32.add (local.get $state_ptr) (i32.const 8))        (local.get $s2))
    (i32.store (i32.add (local.get $state_ptr) (i32.const 12))       (local.get $s3))

    (local.get $result)
  )
)
```

> Approximately 60 lines of body (within the spec's 80–120-line allowance). All shift/rotate/xor operations map 1:1 to the Rust implementation in `crates/hub-core/src/rng.rs::Rng::next_u32`. Reader can put the two side-by-side and confirm.

### Task 6: Expose `Rng` state construction for differential seeding

**Files:**
- Modify: `crates/hub-core/src/rng.rs`

- [ ] **Step 6.1: Add `Rng::from_state` as a public helper**

In `crates/hub-core/src/rng.rs`, inside `impl Rng`, add (placed alongside the existing `state()` helper):
```rust
    /// Construct an `Rng` from raw `[u32; 4]` state. Used by
    /// differential testing in `hub-hardlang` to seed the WAT and Rust
    /// backends from a shared SplitMix64 expansion, and acceptable for
    /// production callers that have their own seed-expansion strategy
    /// (e.g. derived from a save-file header). Prefer [`Rng::seed`] for
    /// everyday use.
    #[must_use]
    pub fn from_state(s: [u32; 4]) -> Self {
        debug_assert!(s.iter().any(|&w| w != 0), "xoshiro128** rejects all-zero state");
        Self { s }
    }
```

This is a small, documented widening of the public RNG API — preferable to a Cargo-feature flag or duplicating the function under `cfg` gates.

- [ ] **Step 6.2: Add a test for the new helper inside hub-core**

In the existing `mod tests` block of `crates/hub-core/src/rng.rs`, add:
```rust
    #[test]
    fn from_state_produces_same_stream_as_matching_seed_expansion() {
        let mut from_seed = Rng::seed(1);
        let expected_state = from_seed.state();
        let mut from_state = Rng::from_state(expected_state);
        for _ in 0..256 {
            assert_eq!(from_state.next_u32(), from_seed.next_u32());
        }
    }
```

- [ ] **Step 6.3: Verify**

Run: `cargo test -p hub-core rng`
Expected: existing 3 tests pass + the new one (4 total).

Run: `cargo clippy --workspace --all-targets -- -D warnings`
Expected: clean. The new `pub fn from_state` is `#[must_use]` and documented; no lints should fire.

### Task 7: Add `wat` + `wasmi` dev-deps and the WAT runtime

**Files:**
- Modify: `crates/hub-hardlang/Cargo.toml`
- Modify: `crates/hub-hardlang/src/lib.rs`

- [ ] **Step 7.1: Add the dev-deps**

In `crates/hub-hardlang/Cargo.toml`, extend `[dev-dependencies]`:
```toml
[dev-dependencies]
hub-core = { path = "../hub-core" }
proptest = { version = "1", default-features = false, features = ["std"] }
wat = "1"
wasmi = "0.45"
```

> The `wasmi` interpreter is a pure-Rust WebAssembly runtime — no JIT, no native code generation, much lighter than `wasmtime` for our test workload (a 1M-iteration loop calling a 60-line function).

- [ ] **Step 7.2: Run `cargo fetch` so the lockfile picks up the new deps**

Run: `cargo fetch`
Expected: completes, `Cargo.lock` updated.

- [ ] **Step 7.3: Add the WAT runtime to `lib.rs`**

In `crates/hub-hardlang/src/lib.rs`, append below the existing C wrapper:
```rust
// ---- WAT xoshiro128** runtime --------------------------------------

const XOSHIRO_WAT_SOURCE: &str = include_str!("../../../asm/xoshiro128_starstar.wat");

/// Errors produced while bootstrapping the WAT module.
#[derive(Debug)]
pub enum WatRngError {
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

/// Compile and instantiate the WAT RNG kernel under `wasmi`, returning a
/// callable closure. Each call advances the host-owned `[u32; 4]` state in
/// place and returns the same `u32` the Rust `Rng` would produce.
///
/// The returned closure carries the `wasmi` store and memory handle. Drop
/// it when done to release the wasm module.
///
/// # Errors
///
/// Returns [`WatRngError::Parse`] if the WAT source fails to compile and
/// [`WatRngError::Instantiate`] if the resulting module does not expose
/// the expected `(memory, next_u32)` shape.
pub fn make_wat_rng()
    -> Result<impl FnMut(&mut [u32; 4]) -> u32, WatRngError>
{
    use wasmi::{Engine, Linker, Memory, Module, Store, TypedFunc};

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

    // We always pass state_ptr = 0 — the kernel does not care which offset
    // and the host has the whole page to play with.
    const STATE_PTR: i32 = 0;

    Ok(move |state: &mut [u32; 4]| -> u32 {
        // Write state into linear memory.
        let mut bytes = [0u8; 16];
        bytes[0..4].copy_from_slice(&state[0].to_le_bytes());
        bytes[4..8].copy_from_slice(&state[1].to_le_bytes());
        bytes[8..12].copy_from_slice(&state[2].to_le_bytes());
        bytes[12..16].copy_from_slice(&state[3].to_le_bytes());
        memory.write(&mut store, STATE_PTR as usize, &bytes).expect("memory write");

        // Call the kernel.
        let result_i32 = next_u32.call(&mut store, STATE_PTR).expect("next_u32 call");

        // Read updated state back.
        memory.read(&store, STATE_PTR as usize, &mut bytes).expect("memory read");
        state[0] = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
        state[1] = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
        state[2] = u32::from_le_bytes(bytes[8..12].try_into().unwrap());
        state[3] = u32::from_le_bytes(bytes[12..16].try_into().unwrap());

        result_i32 as u32
    })
}
```

> Path note: `include_str!("../../../asm/xoshiro128_starstar.wat")` resolves relative to the source file — `crates/hub-hardlang/src/lib.rs` → up three → workspace root → `asm/xoshiro128_starstar.wat`. Verify the path is correct with `cargo build -p hub-hardlang` after editing.

> wasmi API note: this code is written against wasmi 0.45's typical `Engine` / `Linker` / `Module` / `Store` / `InstancePre::start` API. If `cargo build` errors on a method name, consult the wasmi version's docs (`cargo doc -p wasmi --open`) — the kernel of the runtime (write 16 bytes into linear memory, call `next_u32(0)`, read 16 bytes back, read i32 return) is portable across versions; only the construction glue changes.

- [ ] **Step 7.4: Verify the crate still builds**

Run: `cargo build -p hub-hardlang --tests`
Expected: succeeds with no warnings. If the include_str! path is wrong, you'll get a clear filesystem error pointing to the wrong path — fix and rerun.

### Task 8: WAT differential test

**Files:**
- Create: `crates/hub-hardlang/tests/differential_rng.rs`

- [ ] **Step 8.1: Author the differential test**

Create `crates/hub-hardlang/tests/differential_rng.rs`:
```rust
//! Differential test: WAT xoshiro128** (asm/xoshiro128_starstar.wat) vs
//! Rust xoshiro128** (hub_core::rng). Both must produce byte-identical
//! u32 streams from any seed.
//!
//! The 1 000 000-draw stream from seed 1 is the spec's gate
//! (docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md
//! §2.2). Smaller streams from a handful of seeds give faster feedback
//! during local development.

use hub_core::rng::Rng;
use hub_hardlang::make_wat_rng;

fn rust_rng_from_seed_state(state: [u32; 4]) -> Rng {
    Rng::from_state(state)
}

fn diff_streams(seed_state: [u32; 4], draws: usize) {
    let mut wat_rng = make_wat_rng().expect("WAT module instantiates");
    let mut rust_rng = rust_rng_from_seed_state(seed_state);
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

/// The spec-gated 1M-draw differential. Slower (~5–15 s under wasmi);
/// gated behind `#[ignore]` for the everyday `cargo test` run and
/// invoked explicitly in CI / by `haggis-eval differential rng`.
#[test]
#[ignore = "spec gate; takes 5-15s — run with `cargo test -- --include-ignored`"]
fn wat_matches_rust_for_seed_one_million_draws() {
    let starting_state = Rng::seed(1).state();
    diff_streams(starting_state, 1_000_000);
}
```

> The `Rng::state` getter is currently `pub(crate)` (added in plan 1 for `state_hash`). Since `hub-hardlang` is a different crate, we need `Rng::state` to be reachable. **Add a pub helper instead of widening `state` itself**: the test calls `Rng::seed(seed).state()` only to learn the starting state for diffing — the same information is available by constructing the Rng and immediately reading the four bytes. Promote `state` to `pub` with the same docstring you used for `from_state`, since the two are dual operations: one promotes raw state to an Rng, the other extracts it.

- [ ] **Step 8.2: Widen `Rng::state` to `pub`**

In `crates/hub-core/src/rng.rs`, change the existing `pub(crate) fn state(&self) -> [u32; 4]` to:
```rust
    /// Snapshot the internal state as four little-endian-ordered `u32`
    /// words. Used by `Sim::state_hash` to canonicalise RNG advance into
    /// the state digest, and by `hub-hardlang`'s differential test to
    /// seed both backends from a shared SplitMix64 expansion.
    #[must_use]
    pub fn state(&self) -> [u32; 4] {
        self.s
    }
```

Update any callers — `crates/hub-core/src/sim.rs` already calls `self.rng.state()`; that call site is unchanged because `pub` is strictly looser than `pub(crate)`.

- [ ] **Step 8.3: Run the differential test**

Run: `cargo test -p hub-hardlang --test differential_rng`
Expected: 2 tests pass (the 1M one is `#[ignore]`d and skipped by default).

- [ ] **Step 8.4: Run the spec-gated 1M-draw test as a one-off**

Run: `cargo test -p hub-hardlang --test differential_rng -- --include-ignored wat_matches_rust_for_seed_one_million_draws`
Expected: passes in 5–15 seconds. If it diverges, the assert prints the draw index — bisect from there to localise the WAT bug.

### Task 9: Phase 2 fmt/clippy + commit

- [ ] **Step 9.1: Run workspace gates**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```
On PowerShell, also:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
All green. Workspace test count should be 41 + 3 differential tests = 44 (the 1M-draw test is ignored by default and not counted).

- [ ] **Step 9.2: Commit**

Run:
```
git add asm/ crates/hub-hardlang/ crates/hub-core/src/rng.rs Cargo.lock
git commit -m "feat(hardlang): add asm/xoshiro128_starstar.wat with WAT/Rust differential test"
```

---

## Phase 3 — Final verification

### Task 10: Whole-workspace green check

- [ ] **Step 10.1: Run every gate end-to-end**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo test --workspace -- --include-ignored
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```
On PowerShell:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
All green. The `--include-ignored` run picks up the 1M-draw WAT differential, takes 5–15 extra seconds, and confirms the spec-gated test passes.

- [ ] **Step 10.2: Confirm test counts**

Expected final counts after this plan:
- `cargo test --workspace`: hub-core (29ish unit + 1 integration), hub-wasm (10), hub-hardlang (4 non-ignored).
- `cargo test --workspace -- --include-ignored`: same + 1 (the 1M-draw test).
- vitest: 43 (unchanged — no host changes).

- [ ] **Step 10.3: Confirm the four committed artifacts exist and are non-empty**

Run: `ls -l c/fnv1a.c asm/xoshiro128_starstar.wat crates/hub-hardlang/tests/differential_hash.rs crates/hub-hardlang/tests/differential_rng.rs`
Expected: four files, none empty.

- [ ] **Step 10.4: Confirm spec coverage**

Read `docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md` §2.2 (WAT) and §2.3 (C). Each spec bullet has a corresponding artifact or test:
- §2.2 "Hand-authored. Target ~80–120 lines": `asm/xoshiro128_starstar.wat` ✓ (~80 lines).
- §2.2 "Single exported function `next_u32(state_ptr: i32) -> i32`": ✓.
- §2.2 "Loaded behind an opt-in test feature": served by the `#[ignore]`-gated 1M-draw test plus `haggis-eval differential rng` in plan 4.
- §2.2 "Differential test seeds both backends identically, draws N (1M)": ✓ (`wat_matches_rust_for_seed_one_million_draws`).
- §2.3 "~40 LOC": `c/fnv1a.c` is ~25 LOC including blank lines and comments ✓.
- §2.3 "Public signature `uint64_t fnv1a_64(const uint8_t* data, size_t len)`": ✓.
- §2.3 "Compiled twice from one source file: clang for native via cc-rs; clang --target=wasm32 for browser": native side ✓ (cc-rs); wasm32 side is plan 4 (`haggis-eval` wires the browser-side differential).
- §2.3 "Differential test: published vectors + 100k fuzz": ✓ (`c_matches_published_reference_vectors` + `c_matches_rust_for_arbitrary_bytes` with 100 000 cases).

---

## Acceptance criteria

The plan is complete when:

1. `c/fnv1a.c` exists and is the only place the C hash algorithm is implemented (~25 LOC, single source file).
2. `asm/xoshiro128_starstar.wat` exists, hand-authored, ~60–120 lines, exports `(memory, next_u32)`.
3. `crates/hub-hardlang/` exists as a workspace member with `build.rs`, `Cargo.toml`, `src/lib.rs`, and two integration tests.
4. `cargo test -p hub-hardlang` runs the two non-ignored tests in seconds; both pass.
5. `cargo test -p hub-hardlang -- --include-ignored` runs the 1M-draw spec gate in under 30 seconds; it passes.
6. `cargo test --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo fmt --all -- --check`, and the wasm32 cargo check all pass.
7. Vitest count unchanged at 43; no host files were touched.
8. `Rng::state` is now `pub` (was `pub(crate)`) and `Rng::from_state` is new `pub`. Both are documented as the differential-test surface and as a deliberate (small) widening of the kernel API.

## Out of scope for this plan

- `haggis-eval differential rng` and `haggis-eval differential hash` subcommands — plan 4 (`kernel-haggis-eval`) wires these as CLI gates. The differentials themselves already exist after this plan; plan 4 only orchestrates them.
- The wasm32 side of the C differential (compiling `c/fnv1a.c` for wasm32-unknown-unknown and running it in the browser) — plan 4 introduces it because it requires a Playwright-driven WASM load.
- Foundation document prune — plan 5.
