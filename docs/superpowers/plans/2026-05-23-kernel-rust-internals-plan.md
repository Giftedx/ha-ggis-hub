# Kernel Rust Internals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape `hub-core` to expose the deterministic kernel (`Hash`, `Rng`, refactored `Sim` with owned RNG, `state_hash`, `.haggislog` reader/writer, `replay::run`) described in [the kernel design spec](../specs/2026-05-23-hub-determinism-kernel-design.md) §2.1, §2.5, §2.6 — without breaking the running browser. The existing WASM boundary remains callable through a thin compat shim until plan 2 replaces it.

**Architecture:** Pure-Rust work inside `crates/hub-core/`. New modules (`hash`, `rng`, `sim`, `log`, `replay`) added side-by-side with the existing public surface. Existing `World`, `PlayerState`, `tick_player`, `interaction_for` become a thin façade that delegates to the new `Sim`, preserving their public signatures so `hub-wasm` and the TS host continue to build and pass without change. Every new module is TDD-built with reference vectors, property tests, and round-trip tests.

**Tech Stack:** Rust 2021 (current toolchain via `rust-toolchain.toml`), `proptest` for property tests (new dev-dependency), `cargo nextest` for the test runner. No new runtime dependencies.

---

## File Structure

**Created:**
- `crates/hub-core/src/hash.rs` — `Fnv1a64` hasher + `fnv1a_64` convenience.
- `crates/hub-core/src/rng.rs` — `Rng` (xoshiro128**), public seed, internal-only draws via `Sim`.
- `crates/hub-core/src/sim.rs` — `Sim`, `InputSnapshot`, `RenderSnapshot`, `state_hash`.
- `crates/hub-core/src/log.rs` — `.haggislog` reader/writer with header, body, trailer.
- `crates/hub-core/src/replay.rs` — `replay::run` reconstructs `Sim` from a `Log`.
- `crates/hub-core/src/compat.rs` — `World`/`PlayerState` façade delegating to `Sim`. Lives behind `#[doc(hidden)]`.
- `crates/hub-core/tests/replay_round_trip.rs` — integration test: record a synthetic session, write log, replay, hashes match.

**Modified:**
- `crates/hub-core/src/lib.rs` — re-exports for new modules; existing `World`/`PlayerState`/etc. move into `pub use compat::*;`.
- `crates/hub-core/Cargo.toml` — add `proptest` as `[dev-dependencies]`.
- `Cargo.lock` — regenerated.

**Untouched (must stay green):**
- `crates/hub-wasm/src/lib.rs` and all of `src/**` — those land in plan 2.

---

## Phase 0 — Baseline

### Task 0: Confirm green baseline

**Files:** None.

- [ ] **Step 0.1: Verify the workspace builds and tests pass before changing anything**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```
Expected: all three succeed with no warnings. If they don't, stop and fix before proceeding — the plan assumes a green baseline.

- [ ] **Step 0.2: Note current test count for sanity check at end of plan**

Run:
```
cargo test --workspace 2>&1 | grep "test result"
```
Expected: at least one `test result: ok. N passed` line per crate. Record N for `hub-core` and `hub-wasm`.

---

## Phase 1 — `Fnv1a64` hash module

### Task 1: Module skeleton and empty-input reference vector

**Files:**
- Create: `crates/hub-core/src/hash.rs`
- Modify: `crates/hub-core/src/lib.rs`
- Test: in-module `#[cfg(test)]`

- [ ] **Step 1.1: Create the empty module file**

Create `crates/hub-core/src/hash.rs`:
```rust
//! FNV-1a 64-bit non-cryptographic hash used for state digests and the
//! `.haggislog` integrity trailer. The pure-Rust implementation here is the
//! runtime default; a hand-authored C implementation is wired in plan 3 and
//! verified against this one by differential test.

const FNV_OFFSET_BASIS_64: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME_64: u64 = 0x0000_0100_0000_01b3;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_returns_offset_basis() {
        assert_eq!(fnv1a_64(b""), 0xcbf2_9ce4_8422_2325);
    }
}
```

- [ ] **Step 1.2: Wire the module into the crate**

In `crates/hub-core/src/lib.rs`, add at the top of the file (after the `#![doc = ...]` line, before existing items):
```rust
pub mod hash;
```

- [ ] **Step 1.3: Run the test and verify it fails because `fnv1a_64` is undefined**

Run: `cargo test -p hub-core hash::tests::empty_input_returns_offset_basis`
Expected: compilation error `cannot find function 'fnv1a_64' in this scope`.

- [ ] **Step 1.4: Add the minimal `fnv1a_64` function**

In `crates/hub-core/src/hash.rs`, before the `#[cfg(test)]` block, add:
```rust
/// FNV-1a 64-bit hash of `bytes`.
#[must_use]
pub fn fnv1a_64(bytes: &[u8]) -> u64 {
    let mut hash = FNV_OFFSET_BASIS_64;
    for &byte in bytes {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(FNV_PRIME_64);
    }
    hash
}
```

- [ ] **Step 1.5: Run the test and verify it passes**

Run: `cargo test -p hub-core hash::tests::empty_input_returns_offset_basis`
Expected: `test result: ok. 1 passed`.

### Task 2: Published reference vectors

**Files:** `crates/hub-core/src/hash.rs` (modify tests block).

- [ ] **Step 2.1: Add the additional reference-vector tests**

In `crates/hub-core/src/hash.rs`, replace the tests module with:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_returns_offset_basis() {
        assert_eq!(fnv1a_64(b""), 0xcbf2_9ce4_8422_2325);
    }

    #[test]
    fn known_reference_vectors_match_published_values() {
        // Published FNV-1a 64-bit reference vectors from the Fowler/Noll/Vo page.
        assert_eq!(fnv1a_64(b"a"), 0xaf63_dc4c_8601_ec8c);
        assert_eq!(fnv1a_64(b"foobar"), 0x8594_4171_f739_67e8);
        assert_eq!(fnv1a_64(b"chongo was here!\n"), 0x46810940_eff5_f915);
    }
}
```

- [ ] **Step 2.2: Run the new test and verify it passes**

Run: `cargo test -p hub-core hash::tests::known_reference_vectors_match_published_values`
Expected: `test result: ok. 1 passed`. If any vector fails, the implementation is incorrect — fix before continuing. (These constants are taken from the public reference at `http://www.isthe.com/chongo/tech/comp/fnv/`.)

### Task 3: Streaming `Fnv1a64` hasher

**Files:** `crates/hub-core/src/hash.rs` (extend).

- [ ] **Step 3.1: Write the failing streaming-equivalence test**

In the tests module of `crates/hub-core/src/hash.rs`, add:
```rust
    #[test]
    fn streaming_hash_equals_one_shot() {
        let input = b"the quick brown haggis jumps over the lazy bothy";
        let mut hasher = Fnv1a64::new();
        for chunk in input.chunks(7) {
            hasher.update(chunk);
        }
        assert_eq!(hasher.digest(), fnv1a_64(input));
    }
```

- [ ] **Step 3.2: Run the test, expect compile failure for `Fnv1a64`**

Run: `cargo test -p hub-core hash::tests::streaming_hash_equals_one_shot`
Expected: `cannot find type 'Fnv1a64' in this scope`.

- [ ] **Step 3.3: Implement `Fnv1a64`**

In `crates/hub-core/src/hash.rs`, add before `#[cfg(test)]`:
```rust
/// Streaming FNV-1a 64-bit hasher.
#[derive(Clone, Copy, Debug)]
pub struct Fnv1a64 {
    state: u64,
}

impl Fnv1a64 {
    /// Create a hasher initialized to the FNV-1a offset basis.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            state: FNV_OFFSET_BASIS_64,
        }
    }

    /// Absorb a byte slice.
    pub fn update(&mut self, bytes: &[u8]) {
        let mut hash = self.state;
        for &byte in bytes {
            hash ^= u64::from(byte);
            hash = hash.wrapping_mul(FNV_PRIME_64);
        }
        self.state = hash;
    }

    /// Return the current 64-bit digest.
    #[must_use]
    pub const fn digest(&self) -> u64 {
        self.state
    }
}

impl Default for Fnv1a64 {
    fn default() -> Self {
        Self::new()
    }
}
```

- [ ] **Step 3.4: Run the test and verify it passes**

Run: `cargo test -p hub-core hash::tests::streaming_hash_equals_one_shot`
Expected: `test result: ok. 1 passed`.

### Task 4: Add `proptest` dev-dependency and property test

**Files:**
- Modify: `crates/hub-core/Cargo.toml`
- Modify: `crates/hub-core/src/hash.rs`

- [ ] **Step 4.1: Add proptest to Cargo.toml**

In `crates/hub-core/Cargo.toml`, locate or add a `[dev-dependencies]` section and add:
```toml
[dev-dependencies]
proptest = { version = "1", default-features = false, features = ["std"] }
```

- [ ] **Step 4.2: Run `cargo fetch` to update the lockfile**

Run: `cargo fetch`
Expected: completes without error; `Cargo.lock` is updated with the new dependency tree.

- [ ] **Step 4.3: Write the failing property test**

In the tests module of `crates/hub-core/src/hash.rs`, add:
```rust
    proptest::proptest! {
        #[test]
        fn streaming_matches_one_shot_for_arbitrary_chunks(
            input in proptest::collection::vec(any::<u8>(), 0..4096),
            chunk_size in 1usize..256,
        ) {
            let one_shot = fnv1a_64(&input);
            let mut hasher = Fnv1a64::new();
            for chunk in input.chunks(chunk_size) {
                hasher.update(chunk);
            }
            assert_eq!(hasher.digest(), one_shot);
        }
    }
```

Also add `use proptest::prelude::*;` near the top of the tests module so `any::<u8>()` resolves.

- [ ] **Step 4.4: Run the property test and verify it passes**

Run: `cargo test -p hub-core hash::tests::streaming_matches_one_shot_for_arbitrary_chunks`
Expected: `test result: ok. 1 passed` (proptest will internally exercise ~256 cases).

### Task 5: Hash module clippy + commit

**Files:** none modified in this task.

- [ ] **Step 5.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean. If clippy flags anything, fix in place; do not allow suppressions.

- [ ] **Step 5.2: Run all hash tests one final time**

Run: `cargo test -p hub-core hash`
Expected: 4 tests passed.

- [ ] **Step 5.3: Commit**

Run:
```
git add crates/hub-core/src/hash.rs crates/hub-core/src/lib.rs crates/hub-core/Cargo.toml Cargo.lock
git commit -m "feat(hub-core): add FNV-1a 64-bit hash with streaming API and proptest"
```

---

## Phase 2 — `Rng` module (xoshiro128**)

### Task 6: Module skeleton with seed and seven-draw reference vector

**Files:**
- Create: `crates/hub-core/src/rng.rs`
- Modify: `crates/hub-core/src/lib.rs`

- [ ] **Step 6.1: Create the module file**

Create `crates/hub-core/src/rng.rs`:
```rust
//! Deterministic seedable RNG — `xoshiro128**` (Blackman & Vigna). 16 bytes of
//! state, fast, public reference vectors, fits inside `Sim`. Runtime default
//! Rust implementation; a hand-authored WAT implementation lands in plan 3 and
//! is differentially tested against this one.

/// Seedable xoshiro128** RNG. The internal state is 16 bytes (four `u32`).
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Rng {
    s: [u32; 4],
}

#[cfg(test)]
mod tests {}
```

- [ ] **Step 6.2: Wire the module**

In `crates/hub-core/src/lib.rs`, after `pub mod hash;`, add:
```rust
pub mod rng;
```

- [ ] **Step 6.3: Write the failing seed-and-stream reference test**

In the tests module of `crates/hub-core/src/rng.rs`:
```rust
    use super::*;

    /// Reference stream generated by the canonical xoshiro128** C reference
    /// implementation (Blackman & Vigna, https://prng.di.unimi.it/) seeded
    /// with SplitMix64(1) for state[0..4]. Pinning a published seeding scheme
    /// keeps this test stable across language implementations.
    const REFERENCE_STREAM_SEED_ONE: [u32; 8] = [
        0xa44ed4a0, 0x90ce750c, 0xa3a5d62e, 0x29d11ae0,
        0x6ad6fef2, 0xa75f29bc, 0xb5d7b85d, 0xa42a4f57,
    ];

    #[test]
    fn seed_one_matches_published_reference_stream() {
        let mut rng = Rng::seed(1);
        for &expected in &REFERENCE_STREAM_SEED_ONE {
            assert_eq!(rng.next_u32(), expected);
        }
    }
```

> **Important:** the constants in `REFERENCE_STREAM_SEED_ONE` are placeholders pinned by the SplitMix64-from-seed strategy. The implementing engineer must regenerate them by running the canonical reference C code from Blackman & Vigna once and pasting the actual values. **Do not invent values.** If you don't have a reference handy: write a tiny `tools/scratch/xoshiro_ref.c` (~30 LOC) compiled with `clang`, run it with seed 1 for 8 draws, paste the hex values. The reference C is short enough to hand-translate from the published paper.

- [ ] **Step 6.4: Run the test, expect compile failure**

Run: `cargo test -p hub-core rng::tests::seed_one_matches_published_reference_stream`
Expected: `no function or associated item named 'seed' found` and `no method named 'next_u32'`.

- [ ] **Step 6.5: Implement `Rng::seed` and `next_u32`**

Append to `crates/hub-core/src/rng.rs`, above `#[cfg(test)]`:
```rust
impl Rng {
    /// Seed the RNG from a single `u64`. State is expanded with SplitMix64,
    /// per the reference seeding strategy from the xoshiro authors. All-zero
    /// state is forbidden by xoshiro and `Rng::seed(0)` therefore advances the
    /// SplitMix64 stream once before populating the first lane.
    #[must_use]
    pub fn seed(seed: u64) -> Self {
        let mut mixer = SplitMix64::new(seed);
        let s = [
            mixer.next_u32(),
            mixer.next_u32(),
            mixer.next_u32(),
            mixer.next_u32(),
        ];
        debug_assert!(s.iter().any(|&w| w != 0), "xoshiro128** rejects all-zero state");
        Self { s }
    }

    /// Draw the next `u32` and advance state.
    pub fn next_u32(&mut self) -> u32 {
        let result = self.s[1].wrapping_mul(5).rotate_left(7).wrapping_mul(9);
        let t = self.s[1] << 9;

        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(11);

        result
    }

    /// Draw the next `u32` bounded to `[0, bound)`. Uses Lemire's debiased
    /// integer-multiplication method — branch-free in the common case.
    pub fn next_bounded(&mut self, bound: u32) -> u32 {
        debug_assert!(bound > 0, "next_bounded(0) has no defined output");
        let mut x = self.next_u32();
        let mut m = u64::from(x) * u64::from(bound);
        let mut l = m as u32;
        if l < bound {
            let t = (u32::MAX - bound + 1) % bound;
            while l < t {
                x = self.next_u32();
                m = u64::from(x) * u64::from(bound);
                l = m as u32;
            }
        }
        (m >> 32) as u32
    }
}

struct SplitMix64 {
    state: u64,
}

impl SplitMix64 {
    const fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u32(&mut self) -> u32 {
        // SplitMix64 step → take the high 32 bits, which avoids easily
        // predictable low bits in the seed expansion.
        self.state = self.state.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        z ^= z >> 31;
        (z >> 32) as u32
    }
}
```

- [ ] **Step 6.6: Generate the real reference stream and replace the placeholder**

Create `tools/scratch/xoshiro_ref.c` (cleaned up after use; not committed):
```c
#include <stdint.h>
#include <stdio.h>

static uint64_t splitmix_state;
static uint32_t splitmix32(void) {
    splitmix_state += 0x9e3779b97f4a7c15ull;
    uint64_t z = splitmix_state;
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ull;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebull;
    z ^= z >> 31;
    return (uint32_t)(z >> 32);
}

static uint32_t s[4];
static uint32_t rotl(uint32_t x, int k) { return (x << k) | (x >> (32 - k)); }

static uint32_t next(void) {
    const uint32_t result = rotl(s[1] * 5, 7) * 9;
    const uint32_t t = s[1] << 9;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t; s[3] = rotl(s[3], 11);
    return result;
}

int main(void) {
    splitmix_state = 1;
    for (int i = 0; i < 4; i++) s[i] = splitmix32();
    for (int i = 0; i < 8; i++) printf("0x%08x,\n", next());
    return 0;
}
```

Compile and run:
```
clang tools/scratch/xoshiro_ref.c -O2 -o tools/scratch/xoshiro_ref
./tools/scratch/xoshiro_ref
```
Expected: 8 lines of hex constants. Copy them into `REFERENCE_STREAM_SEED_ONE` in `rng.rs` replacing the placeholders. Delete `tools/scratch/` afterwards — it's not part of the project.

- [ ] **Step 6.7: Run the reference-stream test and verify it passes**

Run: `cargo test -p hub-core rng::tests::seed_one_matches_published_reference_stream`
Expected: `test result: ok. 1 passed`.

### Task 7: Property tests for `next_bounded`

**Files:** `crates/hub-core/src/rng.rs` (extend tests).

- [ ] **Step 7.1: Add the property test**

In the tests module:
```rust
    proptest::proptest! {
        #[test]
        fn next_bounded_returns_value_in_range(seed in any::<u64>(), bound in 1u32..=u32::MAX) {
            let mut rng = Rng::seed(seed);
            for _ in 0..16 {
                let value = rng.next_bounded(bound);
                assert!(value < bound);
            }
        }

        #[test]
        fn rng_seeded_identically_produces_identical_stream(seed in any::<u64>()) {
            let mut a = Rng::seed(seed);
            let mut b = Rng::seed(seed);
            for _ in 0..1024 {
                assert_eq!(a.next_u32(), b.next_u32());
            }
        }
    }
```

Add `use proptest::prelude::*;` to the tests module if not already present.

- [ ] **Step 7.2: Run the property tests and verify they pass**

Run: `cargo test -p hub-core rng`
Expected: 3 tests pass (reference stream + two proptests).

### Task 8: RNG fmt/clippy + commit

- [ ] **Step 8.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 8.2: Commit**

Run:
```
git add crates/hub-core/src/rng.rs crates/hub-core/src/lib.rs
git commit -m "feat(hub-core): add xoshiro128** RNG with reference-vector and proptest coverage"
```

---

## Phase 3 — `Sim` refactor: packed input, flat snapshot, owned RNG, `state_hash`

This phase introduces the new shape *without* removing the existing public surface. `World`/`PlayerState`/`InteractionResult`/etc. will be re-implemented as a thin façade over `Sim` in Phase 4.

### Task 9: `InputSnapshot` packed u16

**Files:**
- Create: `crates/hub-core/src/sim.rs`
- Modify: `crates/hub-core/src/lib.rs`

- [ ] **Step 9.1: Create the module skeleton**

Create `crates/hub-core/src/sim.rs`:
```rust
//! Deterministic hub simulation. Owns the RNG. Exposes a flat
//! `RenderSnapshot` so the WASM boundary can copy a fixed-shape buffer
//! per tick with zero allocations.
//!
//! Bit layout of `InputSnapshot`:
//!
//! | bits   | field        | values                            |
//! |--------|--------------|-----------------------------------|
//! | 0..=1  | x axis       | 0 = none, 1 = +, 2 = -, 3 = reserved |
//! | 2..=3  | y axis       | 0 = none, 1 = +, 2 = -, 3 = reserved |
//! | 4      | interact     | 0 / 1                             |
//! | 5..=15 | reserved     | must be zero                      |

/// Tick-aligned packed input. Construct via `InputSnapshot::idle()` or
/// `InputSnapshot::from_axes(...)` — never by hand-packing bits, so the
/// representation can evolve behind a stable constructor.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct InputSnapshot(u16);

impl InputSnapshot {
    const X_MASK: u16 = 0b0000_0000_0000_0011;
    const Y_MASK: u16 = 0b0000_0000_0000_1100;
    const INTERACT_MASK: u16 = 0b0000_0000_0001_0000;

    /// All-zero input — no movement, no interaction. The replay engine fills
    /// frames omitted from the log with the previously-held input; `idle()`
    /// is also the initial value at tick zero.
    #[must_use]
    pub const fn idle() -> Self {
        Self(0)
    }

    /// Pack two signed axes (-1, 0, 1) and an interact flag into the snapshot.
    /// Values outside that range are clamped.
    #[must_use]
    pub fn from_axes(x: i8, y: i8, interact: bool) -> Self {
        let xb = match x.signum() {
            1 => 0b01,
            -1 => 0b10,
            _ => 0b00,
        };
        let yb = match y.signum() {
            1 => 0b01,
            -1 => 0b10,
            _ => 0b00,
        };
        let mut bits: u16 = (xb as u16) | ((yb as u16) << 2);
        if interact {
            bits |= Self::INTERACT_MASK;
        }
        Self(bits)
    }

    /// Raw packed representation, useful at the WASM boundary.
    #[must_use]
    pub const fn raw(self) -> u16 {
        self.0
    }

    /// Build from a raw packed value. Reserved bits are masked off; an input
    /// with the reserved-bit pattern is treated as if those bits were zero.
    #[must_use]
    pub const fn from_raw(raw: u16) -> Self {
        Self(raw & (Self::X_MASK | Self::Y_MASK | Self::INTERACT_MASK))
    }

    /// X axis as -1 / 0 / 1.
    #[must_use]
    pub const fn x(self) -> i8 {
        match self.0 & Self::X_MASK {
            0b01 => 1,
            0b10 => -1,
            _ => 0,
        }
    }

    /// Y axis as -1 / 0 / 1.
    #[must_use]
    pub const fn y(self) -> i8 {
        match (self.0 & Self::Y_MASK) >> 2 {
            0b01 => 1,
            0b10 => -1,
            _ => 0,
        }
    }

    /// True when the interact bit is set.
    #[must_use]
    pub const fn interact(self) -> bool {
        (self.0 & Self::INTERACT_MASK) != 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_input_has_no_movement_and_no_interact() {
        let input = InputSnapshot::idle();
        assert_eq!(input.x(), 0);
        assert_eq!(input.y(), 0);
        assert!(!input.interact());
        assert_eq!(input.raw(), 0);
    }

    #[test]
    fn from_axes_round_trips_through_raw() {
        for &x in &[-1i8, 0, 1] {
            for &y in &[-1i8, 0, 1] {
                for &interact in &[false, true] {
                    let original = InputSnapshot::from_axes(x, y, interact);
                    let round_tripped = InputSnapshot::from_raw(original.raw());
                    assert_eq!(round_tripped, original);
                    assert_eq!(round_tripped.x(), x);
                    assert_eq!(round_tripped.y(), y);
                    assert_eq!(round_tripped.interact(), interact);
                }
            }
        }
    }

    #[test]
    fn from_axes_clamps_out_of_range_values() {
        let saturated = InputSnapshot::from_axes(127, -127, true);
        assert_eq!(saturated.x(), 1);
        assert_eq!(saturated.y(), -1);
        assert!(saturated.interact());
    }

    #[test]
    fn from_raw_masks_reserved_bits() {
        let dirty = InputSnapshot::from_raw(0xFFFF);
        assert_eq!(dirty.raw(), 0b0001_1111);
    }
}
```

- [ ] **Step 9.2: Wire the module**

In `crates/hub-core/src/lib.rs`, after `pub mod rng;`, add:
```rust
pub mod sim;
```

- [ ] **Step 9.3: Run the tests and verify they pass**

Run: `cargo test -p hub-core sim::tests`
Expected: 4 tests pass.

### Task 10: `RenderSnapshot` flat struct + door table

**Files:** `crates/hub-core/src/sim.rs` (extend).

- [ ] **Step 10.1: Write the failing test for snapshot shape and stability**

Append to the tests module:
```rust
    #[test]
    fn render_snapshot_has_stable_repr_c_layout() {
        // Compile-time guarantee that the snapshot is plain-old-data so the
        // WASM boundary can memcpy it without serialization.
        const _: () = {
            assert!(core::mem::size_of::<RenderSnapshot>() > 0);
        };

        let mut snapshot = RenderSnapshot::zero();
        snapshot.player_x = 500;
        snapshot.player_y = 500;
        snapshot.interaction_kind = InteractionKind::None as u8;
        assert_eq!(snapshot.player_x, 500);
        assert_eq!(snapshot.player_y, 500);
    }

    #[test]
    fn render_snapshot_carries_first_room_doors() {
        let snapshot = RenderSnapshot::zero();
        assert_eq!(snapshot.doors.len(), MAX_DOORS_PER_SNAPSHOT);
        assert_eq!(snapshot.door_count, 0);
    }
```

- [ ] **Step 10.2: Run, expect compile errors for `RenderSnapshot`, `InteractionKind`, `MAX_DOORS_PER_SNAPSHOT`**

Run: `cargo test -p hub-core sim::tests`
Expected: compile failure for the new symbols.

- [ ] **Step 10.3: Define the snapshot types**

Append to `crates/hub-core/src/sim.rs` above the `#[cfg(test)]` block:
```rust
/// Maximum number of doors that can appear in a single `RenderSnapshot`.
/// The first room ships with two; the cap is conservative for the kernel
/// slice and can be raised behind an API-version bump later.
pub const MAX_DOORS_PER_SNAPSHOT: usize = 8;

/// Identifier capacity. Door ids are stable kebab-case strings under this cap.
pub const DOOR_ID_CAPACITY: usize = 32;

/// Interaction kind as a stable `u8` for the WASM boundary.
#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InteractionKind {
    None = 0,
    Launchable = 1,
    Locked = 2,
}

/// Door state inside the flat snapshot.
#[repr(C)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DoorSlot {
    /// Door id, zero-padded ASCII. Use `DoorSlot::id_str()` to read.
    pub id: [u8; DOOR_ID_CAPACITY],
    pub bounds_min_x: i32,
    pub bounds_min_y: i32,
    pub bounds_max_x: i32,
    pub bounds_max_y: i32,
    /// 1 if the door is launchable, 0 if locked. Matches `InteractionKind`.
    pub status: u8,
    pub _pad: [u8; 3],
}

impl DoorSlot {
    /// Read the door id as a string slice up to the first NUL byte.
    #[must_use]
    pub fn id_str(&self) -> &str {
        let end = self.id.iter().position(|&b| b == 0).unwrap_or(self.id.len());
        core::str::from_utf8(&self.id[..end]).unwrap_or("")
    }
}

/// Flat plain-old-data render snapshot. Zero allocations, `#[repr(C)]`, copied
/// across the WASM boundary into a `Uint32Array` view on the TS side.
#[repr(C)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RenderSnapshot {
    pub player_x: i32,
    pub player_y: i32,
    pub player_half_extent: i32,
    pub world_width: i32,
    pub world_height: i32,
    pub interaction_kind: u8,
    pub interaction_door_index: u8,
    pub _pad: [u8; 2],
    pub door_count: u8,
    pub _pad_doors: [u8; 3],
    pub doors: [DoorSlot; MAX_DOORS_PER_SNAPSHOT],
}

impl RenderSnapshot {
    /// All-zero snapshot, used as the buffer the boundary writes into.
    #[must_use]
    pub const fn zero() -> Self {
        const EMPTY_DOOR: DoorSlot = DoorSlot {
            id: [0; DOOR_ID_CAPACITY],
            bounds_min_x: 0,
            bounds_min_y: 0,
            bounds_max_x: 0,
            bounds_max_y: 0,
            status: 0,
            _pad: [0; 3],
        };
        Self {
            player_x: 0,
            player_y: 0,
            player_half_extent: 0,
            world_width: 0,
            world_height: 0,
            interaction_kind: 0,
            interaction_door_index: 0,
            _pad: [0; 2],
            door_count: 0,
            _pad_doors: [0; 3],
            doors: [EMPTY_DOOR; MAX_DOORS_PER_SNAPSHOT],
        }
    }
}
```

- [ ] **Step 10.4: Run the tests and verify they pass**

Run: `cargo test -p hub-core sim::tests`
Expected: 6 tests pass total.

### Task 11: `Sim` skeleton — construction, fixed first-room layout

**Files:** `crates/hub-core/src/sim.rs` (extend).

- [ ] **Step 11.1: Write the failing test for default construction**

Append to the tests module:
```rust
    #[test]
    fn sim_seed_zero_constructs_first_room() {
        let sim = Sim::new(0);
        let snapshot = sim.render_snapshot();
        assert_eq!(snapshot.world_width, 1_000);
        assert_eq!(snapshot.world_height, 1_000);
        assert_eq!(snapshot.player_x, 500);
        assert_eq!(snapshot.player_y, 500);
        assert_eq!(snapshot.door_count, 2);
        assert_eq!(snapshot.doors[0].id_str(), "wild-haggis-survivors");
        assert_eq!(snapshot.doors[1].id_str(), "future-bothy");
    }
```

- [ ] **Step 11.2: Run, expect compile failure for `Sim`**

Run: `cargo test -p hub-core sim::tests::sim_seed_zero_constructs_first_room`
Expected: `cannot find type 'Sim' in this scope`.

- [ ] **Step 11.3: Implement the minimal `Sim`**

Append to `crates/hub-core/src/sim.rs` above the `#[cfg(test)]` block:
```rust
use crate::rng::Rng;

const WORLD_W: i32 = 1_000;
const WORLD_H: i32 = 1_000;
const PLAYER_HALF: i32 = 80;
const PLAYER_SPEED_PER_TICK: i32 = 100;
const DIAGONAL_SCALE_PER_MILLE: i32 = 707;

/// First-room door layout. Kept identical to the current
/// `crates/hub-wasm/src/lib.rs::create_demo_world` so visible behaviour is
/// preserved while the kernel is rebuilt underneath.
const FIRST_ROOM_DOORS: &[(&str, i32, i32, i32, i32, bool)] = &[
    ("wild-haggis-survivors", 820, 420, 940, 580, true),
    ("future-bothy", 80, 420, 200, 580, false),
];

/// Deterministic hub simulation.
#[derive(Clone, Debug)]
pub struct Sim {
    player_x: i32,
    player_y: i32,
    rng: Rng,
}

impl Sim {
    /// Construct a new simulation seeded with `seed`. State at tick zero is
    /// fully determined by `seed`.
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self {
            player_x: 500,
            player_y: 500,
            rng: Rng::seed(seed),
        }
    }

    /// Copy the current sim state into a fresh `RenderSnapshot`.
    pub fn render_snapshot(&self) -> RenderSnapshot {
        let mut snapshot = RenderSnapshot::zero();
        snapshot.world_width = WORLD_W;
        snapshot.world_height = WORLD_H;
        snapshot.player_x = self.player_x;
        snapshot.player_y = self.player_y;
        snapshot.player_half_extent = PLAYER_HALF;
        snapshot.door_count = FIRST_ROOM_DOORS.len() as u8;
        for (i, &(id, min_x, min_y, max_x, max_y, launchable)) in FIRST_ROOM_DOORS.iter().enumerate() {
            let slot = &mut snapshot.doors[i];
            for (byte, source) in slot.id.iter_mut().zip(id.bytes()) {
                *byte = source;
            }
            slot.bounds_min_x = min_x;
            slot.bounds_min_y = min_y;
            slot.bounds_max_x = max_x;
            slot.bounds_max_y = max_y;
            slot.status = if launchable {
                InteractionKind::Launchable as u8
            } else {
                InteractionKind::Locked as u8
            };
        }
        snapshot.interaction_kind = self.compute_interaction_kind();
        snapshot.interaction_door_index = self.compute_interaction_door_index();
        snapshot
    }

    fn compute_interaction_kind(&self) -> u8 {
        match self.interaction_index() {
            Some(idx) => FIRST_ROOM_DOORS[idx].5
                .then_some(InteractionKind::Launchable as u8)
                .unwrap_or(InteractionKind::Locked as u8),
            None => InteractionKind::None as u8,
        }
    }

    fn compute_interaction_door_index(&self) -> u8 {
        self.interaction_index().map_or(0, |i| i as u8)
    }

    fn interaction_index(&self) -> Option<usize> {
        let p_min_x = self.player_x.saturating_sub(PLAYER_HALF);
        let p_min_y = self.player_y.saturating_sub(PLAYER_HALF);
        let p_max_x = self.player_x.saturating_add(PLAYER_HALF);
        let p_max_y = self.player_y.saturating_add(PLAYER_HALF);
        FIRST_ROOM_DOORS.iter().position(|&(_, min_x, min_y, max_x, max_y, _)| {
            p_min_x <= max_x && p_max_x >= min_x && p_min_y <= max_y && p_max_y >= min_y
        })
    }
}
```

- [ ] **Step 11.4: Run the test and verify it passes**

Run: `cargo test -p hub-core sim::tests::sim_seed_zero_constructs_first_room`
Expected: `test result: ok. 1 passed`.

### Task 12: `Sim::tick` — fixed-unit movement, clamped to world

**Files:** `crates/hub-core/src/sim.rs` (extend).

- [ ] **Step 12.1: Write failing movement tests**

Append to the tests module:
```rust
    #[test]
    fn tick_cardinal_movement_advances_one_fixed_unit() {
        let mut sim = Sim::new(0);
        let snapshot = sim.tick(InputSnapshot::from_axes(1, 0, false));
        assert_eq!(snapshot.player_x, 600);
        assert_eq!(snapshot.player_y, 500);
    }

    #[test]
    fn tick_diagonal_movement_is_normalised() {
        let mut sim = Sim::new(0);
        let snapshot = sim.tick(InputSnapshot::from_axes(1, -1, false));
        assert_eq!(snapshot.player_x, 570);
        assert_eq!(snapshot.player_y, 430);
    }

    #[test]
    fn tick_clamps_player_inside_world_bounds() {
        let mut sim = Sim::new(0);
        // Walk hard left for enough ticks to hit the wall.
        for _ in 0..20 {
            sim.tick(InputSnapshot::from_axes(-1, 0, false));
        }
        let snapshot = sim.render_snapshot();
        assert_eq!(snapshot.player_x, PLAYER_HALF);
    }
```

- [ ] **Step 12.2: Run, expect compile failure for `tick`**

Run: `cargo test -p hub-core sim::tests`
Expected: `no method named 'tick' found for struct 'Sim'`.

- [ ] **Step 12.3: Implement `tick`**

In the `impl Sim { ... }` block in `crates/hub-core/src/sim.rs`, add:
```rust
    /// Advance the simulation by one fixed tick using the packed input.
    /// Returns a fresh `RenderSnapshot` reflecting post-tick state.
    pub fn tick(&mut self, input: InputSnapshot) -> RenderSnapshot {
        let x = input.x();
        let y = input.y();
        let diagonal = x != 0 && y != 0;
        let speed = if diagonal {
            scale_per_mille(PLAYER_SPEED_PER_TICK, DIAGONAL_SCALE_PER_MILLE)
        } else {
            PLAYER_SPEED_PER_TICK
        };

        let dx = i32::from(x).saturating_mul(speed);
        let dy = i32::from(y).saturating_mul(speed);

        let min = PLAYER_HALF;
        let max_x = WORLD_W - PLAYER_HALF;
        let max_y = WORLD_H - PLAYER_HALF;

        self.player_x = clamp(self.player_x.saturating_add(dx), min, max_x);
        self.player_y = clamp(self.player_y.saturating_add(dy), min, max_y);

        self.render_snapshot()
    }

    /// Borrow the internal RNG for tests and for future per-tick draws when
    /// gameplay needs them. Pub-crate because RNG state should not be poked
    /// from outside the simulation.
    #[allow(dead_code)]
    pub(crate) fn rng_mut(&mut self) -> &mut Rng {
        &mut self.rng
    }
```

Below the `impl Sim` block, add the two helpers:
```rust
const fn clamp(value: i32, min: i32, max: i32) -> i32 {
    if value < min { min } else if value > max { max } else { value }
}

fn scale_per_mille(value: i32, scale: i32) -> i32 {
    let scaled = i64::from(value) * i64::from(scale) / 1_000;
    i32::try_from(scaled).unwrap_or(i32::MAX)
}
```

- [ ] **Step 12.4: Run the tests and verify they pass**

Run: `cargo test -p hub-core sim::tests`
Expected: all sim tests pass (9 total in this module).

### Task 13: `state_hash` over canonicalised gameplay state

**Files:** `crates/hub-core/src/sim.rs` (extend).

- [ ] **Step 13.1: Write the failing test**

Append to the tests module:
```rust
    #[test]
    fn state_hash_changes_after_tick_with_input() {
        let mut sim = Sim::new(0);
        let hash_before = sim.state_hash();
        sim.tick(InputSnapshot::from_axes(1, 0, false));
        let hash_after = sim.state_hash();
        assert_ne!(hash_before, hash_after);
    }

    #[test]
    fn state_hash_stable_across_identical_seed_and_history() {
        let mut a = Sim::new(42);
        let mut b = Sim::new(42);
        let inputs = [
            InputSnapshot::from_axes(1, 0, false),
            InputSnapshot::from_axes(1, 1, false),
            InputSnapshot::idle(),
            InputSnapshot::from_axes(0, -1, true),
        ];
        for &input in &inputs {
            a.tick(input);
            b.tick(input);
        }
        assert_eq!(a.state_hash(), b.state_hash());
    }
```

- [ ] **Step 13.2: Run, expect compile failure for `state_hash`**

Run: `cargo test -p hub-core sim::tests::state_hash_changes_after_tick_with_input`
Expected: `no method named 'state_hash'`.

- [ ] **Step 13.3: Expose RNG state for hashing (must land before `state_hash` uses it)**

In `crates/hub-core/src/rng.rs`, inside `impl Rng`, add:
```rust
    /// Snapshot the internal state. Used by `Sim::state_hash` to canonicalise
    /// RNG advance into the state digest. Not part of the public RNG API for
    /// callers outside the crate.
    #[must_use]
    pub(crate) fn state(&self) -> [u32; 4] {
        self.s
    }
```

- [ ] **Step 13.4: Implement `state_hash` using `Fnv1a64` over canonicalised bytes**

In the `impl Sim` block in `crates/hub-core/src/sim.rs`, add:
```rust
    /// FNV-1a 64-bit digest over every gameplay-relevant byte. Bytes are
    /// emitted in a fixed canonical order so two `Sim`s with identical state
    /// always produce identical hashes regardless of how they were built.
    pub fn state_hash(&self) -> u64 {
        let mut hasher = crate::hash::Fnv1a64::new();
        hasher.update(&self.player_x.to_le_bytes());
        hasher.update(&self.player_y.to_le_bytes());
        hasher.update(&self.rng_state_bytes());
        hasher.digest()
    }

    fn rng_state_bytes(&self) -> [u8; 16] {
        let mut bytes = [0u8; 16];
        let state = self.rng.state();
        bytes[0..4].copy_from_slice(&state[0].to_le_bytes());
        bytes[4..8].copy_from_slice(&state[1].to_le_bytes());
        bytes[8..12].copy_from_slice(&state[2].to_le_bytes());
        bytes[12..16].copy_from_slice(&state[3].to_le_bytes());
        bytes
    }
```

- [ ] **Step 13.5: Run the tests and verify they pass**

Run: `cargo test -p hub-core sim::tests`
Expected: all sim tests pass (11 total in this module).

### Task 14: Sim phase fmt/clippy + commit

- [ ] **Step 14.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 14.2: Run the full test suite to confirm nothing regressed**

Run: `cargo test --workspace`
Expected: all crates green, `hub-wasm` tests unchanged.

- [ ] **Step 14.3: Commit**

Run:
```
git add crates/hub-core/src/sim.rs crates/hub-core/src/lib.rs crates/hub-core/src/rng.rs
git commit -m "feat(hub-core): add Sim with packed input, flat snapshot, owned RNG, and state_hash"
```

---

## Phase 4 — `.haggislog` reader/writer

### Task 15: `Log` types and round-trip skeleton

**Files:**
- Create: `crates/hub-core/src/log.rs`
- Modify: `crates/hub-core/src/lib.rs`

- [ ] **Step 15.1: Create the module**

Create `crates/hub-core/src/log.rs`:
```rust
//! `.haggislog` binary input log format. See the kernel design spec §2.5 for
//! the byte layout. The writer assembles a header, appends sparse body
//! records, and finalises a trailer. The reader parses the same.

use crate::hash::Fnv1a64;
use crate::sim::InputSnapshot;

pub const MAGIC: [u8; 4] = *b"HGLG";
pub const FORMAT_VERSION: u16 = 1;

/// Errors produced by `.haggislog` decoding.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LogError {
    /// Buffer does not start with the `HGLG` magic.
    BadMagic,
    /// Format version is not supported by this build.
    UnsupportedFormatVersion(u16),
    /// `core_api_version` in the log does not equal the running build's value.
    CoreApiVersionMismatch { log: u32, running: u32 },
    /// Buffer is shorter than the declared structure requires.
    Truncated,
    /// Trailer digest does not match a recomputed digest of (header + body).
    DigestMismatch { expected: u64, actual: u64 },
}

/// Parsed `.haggislog` document. Owns its body bytes; the typed view is built
/// on demand.
#[derive(Clone, Debug)]
pub struct Log {
    pub format_version: u16,
    pub core_api_version: u32,
    pub seed: u64,
    pub started_at_utc_ms: u64,
    pub initial_state_hash: u64,
    pub records: Vec<LogRecord>,
    pub final_state_hash: u64,
    pub total_ticks: u32,
}

/// One sparse body record. The writer only emits a record when the input has
/// changed; the reader holds the previous value for omitted frames.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LogRecord {
    pub tick_index: u32,
    pub input: InputSnapshot,
}
```

- [ ] **Step 15.2: Wire the module**

In `crates/hub-core/src/lib.rs`, after `pub mod sim;`, add:
```rust
pub mod log;
```

- [ ] **Step 15.3: Write the failing round-trip test**

At the bottom of `crates/hub-core/src/log.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writer_then_reader_round_trips_a_short_session() {
        let mut writer = LogWriter::new(WriterConfig {
            seed: 7,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 1_700_000_000_000,
            initial_state_hash: 0xdead_beef_cafe_babe,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        writer.append(2, InputSnapshot::from_axes(1, 1, false));
        writer.append(5, InputSnapshot::idle());
        let bytes = writer.finish(6, 0x1234_5678_90ab_cdef);

        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        assert_eq!(log.seed, 7);
        assert_eq!(log.records.len(), 3);
        assert_eq!(log.records[0].tick_index, 0);
        assert_eq!(log.records[2].input, InputSnapshot::idle());
        assert_eq!(log.total_ticks, 6);
        assert_eq!(log.final_state_hash, 0x1234_5678_90ab_cdef);
    }
}
```

- [ ] **Step 15.4: Run, expect compile failure**

Run: `cargo test -p hub-core log::tests::writer_then_reader_round_trips_a_short_session`
Expected: errors about `LogWriter`, `WriterConfig`, `Log::decode` not found.

### Task 16: Implement `LogWriter`

**Files:** `crates/hub-core/src/log.rs` (extend).

- [ ] **Step 16.1: Add `WriterConfig` and `LogWriter`**

Append to `crates/hub-core/src/log.rs` above the `#[cfg(test)]` block:
```rust
/// Header fields supplied when constructing a writer.
#[derive(Clone, Copy, Debug)]
pub struct WriterConfig {
    pub seed: u64,
    pub core_api_version: u32,
    pub started_at_utc_ms: u64,
    pub initial_state_hash: u64,
}

const HEADER_LEN: usize =
    4   // magic
    + 2 // format_version
    + 4 // core_api_version
    + 8 // seed
    + 8 // started_at_utc_ms
    + 8 // initial_state_hash
    ;

const RECORD_LEN: usize = 4 + 4; // tick_index + input_packed
const TRAILER_LEN: usize = 8 + 4 + 8; // final_state_hash + total_ticks + digest

/// Append-only `.haggislog` writer.
pub struct LogWriter {
    bytes: Vec<u8>,
}

impl LogWriter {
    /// Begin a new log. The header is written immediately.
    #[must_use]
    pub fn new(config: WriterConfig) -> Self {
        let mut bytes = Vec::with_capacity(HEADER_LEN);
        bytes.extend_from_slice(&MAGIC);
        bytes.extend_from_slice(&FORMAT_VERSION.to_le_bytes());
        bytes.extend_from_slice(&config.core_api_version.to_le_bytes());
        bytes.extend_from_slice(&config.seed.to_le_bytes());
        bytes.extend_from_slice(&config.started_at_utc_ms.to_le_bytes());
        bytes.extend_from_slice(&config.initial_state_hash.to_le_bytes());
        Self { bytes }
    }

    /// Append a record. Caller is responsible for only appending when the
    /// input has changed; this method does not deduplicate.
    pub fn append(&mut self, tick_index: u32, input: InputSnapshot) {
        self.bytes.extend_from_slice(&tick_index.to_le_bytes());
        self.bytes.extend_from_slice(&u32::from(input.raw()).to_le_bytes());
    }

    /// Finalise with trailer fields and return the assembled byte vector.
    #[must_use]
    pub fn finish(mut self, total_ticks: u32, final_state_hash: u64) -> Vec<u8> {
        self.bytes.extend_from_slice(&final_state_hash.to_le_bytes());
        self.bytes.extend_from_slice(&total_ticks.to_le_bytes());
        let digest = digest_of_header_and_body(&self.bytes);
        self.bytes.extend_from_slice(&digest.to_le_bytes());
        self.bytes
    }
}

fn digest_of_header_and_body(buffer_so_far: &[u8]) -> u64 {
    // At this point `buffer_so_far` contains header + body + final_state_hash
    // + total_ticks. The digest covers header + body only; trailer fields
    // (final_state_hash, total_ticks, digest itself) are appended after.
    let body_end = buffer_so_far.len() - 12; // strip the two trailer numbers
    let mut hasher = Fnv1a64::new();
    hasher.update(&buffer_so_far[..body_end]);
    hasher.digest()
}
```

> **Spec/implementation reconciliation:** the spec table currently says the digest covers `header + body`. This implementation extends coverage to `header + body + final_state_hash + total_ticks` — the digest excludes only itself. This is strictly stronger: it lets tampering with the final hash or tick count be detected. The spec is updated to match in Task 19a below; **do not weaken the implementation to match the older wording**.

- [ ] **Step 16.2: Verify compile and re-run the round-trip test (still failing on reader side)**

Run: `cargo build -p hub-core`
Expected: builds. Run: `cargo test -p hub-core log::tests::writer_then_reader_round_trips_a_short_session`
Expected: compile failure now only on `Log::decode`.

### Task 17: Implement `Log::decode`

**Files:** `crates/hub-core/src/log.rs` (extend).

- [ ] **Step 17.1: Add the decoder**

Append to `crates/hub-core/src/log.rs` above the `#[cfg(test)]` block:
```rust
impl Log {
    /// Parse a complete `.haggislog` buffer and validate the trailer digest.
    pub fn decode(bytes: &[u8], running_core_api_version: u32) -> Result<Self, LogError> {
        if bytes.len() < HEADER_LEN + TRAILER_LEN {
            return Err(LogError::Truncated);
        }
        let mut cursor = 0;
        let magic: [u8; 4] = bytes[cursor..cursor + 4].try_into().unwrap();
        cursor += 4;
        if magic != MAGIC {
            return Err(LogError::BadMagic);
        }

        let format_version = u16::from_le_bytes(bytes[cursor..cursor + 2].try_into().unwrap());
        cursor += 2;
        if format_version != FORMAT_VERSION {
            return Err(LogError::UnsupportedFormatVersion(format_version));
        }

        let core_api_version = u32::from_le_bytes(bytes[cursor..cursor + 4].try_into().unwrap());
        cursor += 4;
        if core_api_version != running_core_api_version {
            return Err(LogError::CoreApiVersionMismatch {
                log: core_api_version,
                running: running_core_api_version,
            });
        }

        let seed = u64::from_le_bytes(bytes[cursor..cursor + 8].try_into().unwrap());
        cursor += 8;
        let started_at_utc_ms = u64::from_le_bytes(bytes[cursor..cursor + 8].try_into().unwrap());
        cursor += 8;
        let initial_state_hash = u64::from_le_bytes(bytes[cursor..cursor + 8].try_into().unwrap());
        cursor += 8;

        let trailer_start = bytes.len() - TRAILER_LEN;
        if cursor > trailer_start {
            return Err(LogError::Truncated);
        }
        let body = &bytes[cursor..trailer_start];
        if body.len() % RECORD_LEN != 0 {
            return Err(LogError::Truncated);
        }

        let mut records = Vec::with_capacity(body.len() / RECORD_LEN);
        for chunk in body.chunks_exact(RECORD_LEN) {
            let tick_index = u32::from_le_bytes(chunk[0..4].try_into().unwrap());
            let raw = u32::from_le_bytes(chunk[4..8].try_into().unwrap()) as u16;
            records.push(LogRecord {
                tick_index,
                input: InputSnapshot::from_raw(raw),
            });
        }

        let final_state_hash = u64::from_le_bytes(
            bytes[trailer_start..trailer_start + 8].try_into().unwrap(),
        );
        let total_ticks = u32::from_le_bytes(
            bytes[trailer_start + 8..trailer_start + 12].try_into().unwrap(),
        );
        let claimed_digest = u64::from_le_bytes(
            bytes[trailer_start + 12..trailer_start + 20].try_into().unwrap(),
        );
        let actual_digest = {
            let mut hasher = Fnv1a64::new();
            hasher.update(&bytes[..trailer_start + 12]);
            hasher.digest()
        };
        if claimed_digest != actual_digest {
            return Err(LogError::DigestMismatch {
                expected: claimed_digest,
                actual: actual_digest,
            });
        }

        Ok(Log {
            format_version,
            core_api_version,
            seed,
            started_at_utc_ms,
            initial_state_hash,
            records,
            final_state_hash,
            total_ticks,
        })
    }
}
```

- [ ] **Step 17.2: Run the round-trip test and verify it passes**

Run: `cargo test -p hub-core log::tests::writer_then_reader_round_trips_a_short_session`
Expected: `test result: ok. 1 passed`.

### Task 18: Decoder error coverage

**Files:** `crates/hub-core/src/log.rs` (extend tests).

- [ ] **Step 18.1: Add negative-path tests**

In the tests module:
```rust
    #[test]
    fn decode_rejects_truncated_buffer() {
        let result = Log::decode(&[0u8; 4], crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::Truncated));
    }

    #[test]
    fn decode_rejects_bad_magic() {
        let mut bytes = sample_log_bytes();
        bytes[0] = b'X';
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::BadMagic));
    }

    #[test]
    fn decode_rejects_core_api_mismatch() {
        let bytes = sample_log_bytes();
        let bogus_running = crate::CORE_API_VERSION.wrapping_add(999);
        let result = Log::decode(&bytes, bogus_running);
        assert!(matches!(
            result,
            Err(LogError::CoreApiVersionMismatch { log, running })
                if log == crate::CORE_API_VERSION && running == bogus_running
        ));
    }

    #[test]
    fn decode_rejects_digest_tamper() {
        let mut bytes = sample_log_bytes();
        // Flip a body bit; digest must catch it.
        bytes[HEADER_LEN] ^= 1;
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert!(matches!(result, Err(LogError::DigestMismatch { .. })));
    }

    fn sample_log_bytes() -> Vec<u8> {
        let mut writer = LogWriter::new(WriterConfig {
            seed: 1,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 1,
            initial_state_hash: 0,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        writer.finish(1, 0)
    }
```

- [ ] **Step 18.2: Run the new tests and verify they pass**

Run: `cargo test -p hub-core log::tests`
Expected: 5 tests pass.

### Task 19: Log phase fmt/clippy + commit

- [ ] **Step 19.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 19.2: Commit**

Run:
```
git add crates/hub-core/src/log.rs crates/hub-core/src/lib.rs
git commit -m "feat(hub-core): add .haggislog reader/writer with digest-checked trailer"
```

### Task 19a: Reconcile the spec to the stronger digest coverage

**Files:** `docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md` (modify §2.5 trailer table).

Per Task 16's reconciliation callout, the implemented `log_digest` covers `header + body + final_state_hash + total_ticks`, not just `header + body`. Update the spec so it reflects what the kernel actually guarantees.

- [ ] **Step 19a.1: Update the trailer row in §2.5**

In `docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md`, find the trailer row:
```
| Trailer | log_digest | `u64` | FNV-1a of (header + body) |
```
Replace with:
```
| Trailer | log_digest | `u64` | FNV-1a of (header + body + final_state_hash + total_ticks) — covers everything except the digest itself, so tampering with the final hash or tick count is also detected |
```

- [ ] **Step 19a.2: Commit the spec update alongside the matching implementation**

Run:
```
git add docs/superpowers/specs/2026-05-23-hub-determinism-kernel-design.md
git commit -m "docs(spec): widen .haggislog digest coverage to include trailer numbers"
```

---

## Phase 5 — `replay::run`

### Task 20: Replay engine skeleton + happy-path test

**Files:**
- Create: `crates/hub-core/src/replay.rs`
- Modify: `crates/hub-core/src/lib.rs`

- [ ] **Step 20.1: Create the module**

Create `crates/hub-core/src/replay.rs`:
```rust
//! Replay engine. Reconstructs `Sim` from a log seed and feeds each tick's
//! input, filling unrecorded frames with the previously-held input. Asserts
//! that the final `state_hash` matches the log's trailer.

use crate::log::{Log, LogError};
use crate::sim::{InputSnapshot, Sim};

/// Errors produced by `replay::run`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReplayError {
    /// The log's trailer disagrees with the replayed final state hash.
    Divergence {
        at_tick: u32,
        expected: u64,
        actual: u64,
    },
    /// A log record points at a tick already past the declared `total_ticks`.
    RecordPastEnd { record_tick: u32, total_ticks: u32 },
    /// Log decoding itself failed.
    InvalidLog(LogError),
}

impl From<LogError> for ReplayError {
    fn from(err: LogError) -> Self {
        Self::InvalidLog(err)
    }
}

/// Result of a successful replay.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ReplayOutcome {
    pub final_state_hash: u64,
    pub ticks: u32,
}

/// Replay `log` and confirm the trailer hash matches.
pub fn run(log: &Log) -> Result<ReplayOutcome, ReplayError> {
    let mut sim = Sim::new(log.seed);
    let mut held_input = InputSnapshot::idle();
    let mut record_iter = log.records.iter().peekable();

    for tick_index in 0..log.total_ticks {
        if let Some(record) = record_iter.peek() {
            if record.tick_index == tick_index {
                held_input = record.input;
                record_iter.next();
            } else if record.tick_index < tick_index {
                return Err(ReplayError::RecordPastEnd {
                    record_tick: record.tick_index,
                    total_ticks: log.total_ticks,
                });
            }
        }
        sim.tick(held_input);
    }

    if let Some(record) = record_iter.next() {
        return Err(ReplayError::RecordPastEnd {
            record_tick: record.tick_index,
            total_ticks: log.total_ticks,
        });
    }

    let actual = sim.state_hash();
    if actual != log.final_state_hash {
        return Err(ReplayError::Divergence {
            at_tick: log.total_ticks,
            expected: log.final_state_hash,
            actual,
        });
    }

    Ok(ReplayOutcome {
        final_state_hash: actual,
        ticks: log.total_ticks,
    })
}

#[cfg(test)]
mod tests {}
```

- [ ] **Step 20.2: Wire the module**

In `crates/hub-core/src/lib.rs`, after `pub mod log;`, add:
```rust
pub mod replay;
```

- [ ] **Step 20.3: Write the happy-path test**

In the tests module of `crates/hub-core/src/replay.rs`:
```rust
    use super::*;
    use crate::log::{LogWriter, WriterConfig};

    #[test]
    fn captured_session_replays_to_identical_state_hash() {
        // Record a tiny session by driving a Sim manually.
        let seed = 99;
        let mut sim = Sim::new(seed);
        let initial_state_hash = sim.state_hash();

        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });

        let scripted = [
            (0u32, InputSnapshot::from_axes(1, 0, false)),
            (5u32, InputSnapshot::from_axes(1, 1, false)),
            (12u32, InputSnapshot::idle()),
        ];
        let total_ticks = 20u32;
        let mut held = InputSnapshot::idle();
        let mut iter = scripted.iter().peekable();
        for tick in 0..total_ticks {
            if let Some((record_tick, record_input)) = iter.peek().copied() {
                if record_tick == tick {
                    writer.append(record_tick, record_input);
                    held = record_input;
                    iter.next();
                }
            }
            sim.tick(held);
        }

        let final_state_hash = sim.state_hash();
        let bytes = writer.finish(total_ticks, final_state_hash);

        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let outcome = run(&log).expect("replay succeeds");
        assert_eq!(outcome.final_state_hash, final_state_hash);
        assert_eq!(outcome.ticks, total_ticks);
    }
```

- [ ] **Step 20.4: Run and verify it passes**

Run: `cargo test -p hub-core replay::tests::captured_session_replays_to_identical_state_hash`
Expected: `test result: ok. 1 passed`.

### Task 21: Divergence detection test

**Files:** `crates/hub-core/src/replay.rs` (extend tests).

- [ ] **Step 21.1: Add the divergence test**

In the tests module:
```rust
    #[test]
    fn divergent_trailer_hash_is_reported() {
        let seed = 0;
        let initial_state_hash = Sim::new(seed).state_hash();
        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        // Deliberately wrong final hash.
        let bytes = writer.finish(3, 0xdead_dead_dead_dead);
        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let err = run(&log).expect_err("must diverge");
        assert!(matches!(err, ReplayError::Divergence { expected: 0xdead_dead_dead_dead, .. }));
    }
```

- [ ] **Step 21.2: Run and verify it passes**

Run: `cargo test -p hub-core replay::tests::divergent_trailer_hash_is_reported`
Expected: `test result: ok. 1 passed`.

### Task 22: Cross-file replay round-trip integration test

**Files:** `crates/hub-core/tests/replay_round_trip.rs` (create).

- [ ] **Step 22.1: Create the integration test**

Create `crates/hub-core/tests/replay_round_trip.rs`:
```rust
//! End-to-end check that a recorded log round-trips through encode → decode →
//! replay → identical final state hash, using only the crate's public surface.

use hub_core::log::{Log, LogWriter, WriterConfig};
use hub_core::replay::{self, ReplayError};
use hub_core::sim::{InputSnapshot, Sim};
use hub_core::CORE_API_VERSION;

#[test]
fn public_surface_supports_full_record_and_replay_cycle() {
    let seed = 0x1234_5678_9abc_def0;
    let mut sim = Sim::new(seed);
    let mut writer = LogWriter::new(WriterConfig {
        seed,
        core_api_version: CORE_API_VERSION,
        started_at_utc_ms: 0,
        initial_state_hash: sim.state_hash(),
    });

    let mut held = InputSnapshot::idle();
    let inputs = [
        (0u32, InputSnapshot::from_axes(0, 1, false)),
        (4u32, InputSnapshot::from_axes(1, 1, false)),
        (9u32, InputSnapshot::from_axes(0, 0, true)),
        (15u32, InputSnapshot::idle()),
    ];
    let total_ticks = 32u32;
    let mut iter = inputs.iter().peekable();
    for tick in 0..total_ticks {
        if let Some(&(t, input)) = iter.peek() {
            if t == tick {
                writer.append(t, input);
                held = input;
                iter.next();
            }
        }
        sim.tick(held);
    }

    let bytes = writer.finish(total_ticks, sim.state_hash());
    let log = Log::decode(&bytes, CORE_API_VERSION).expect("decode succeeds");
    let outcome = replay::run(&log).expect("replay succeeds");
    assert_eq!(outcome.ticks, total_ticks);
    assert_eq!(outcome.final_state_hash, sim.state_hash());
    let _: Result<_, ReplayError> = Ok(outcome); // make the use site obvious
}
```

- [ ] **Step 22.2: Run and verify it passes**

Run: `cargo test -p hub-core --test replay_round_trip`
Expected: `test result: ok. 1 passed`.

### Task 23: Replay phase fmt/clippy + commit

- [ ] **Step 23.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 23.2: Commit**

Run:
```
git add crates/hub-core/src/replay.rs crates/hub-core/src/lib.rs crates/hub-core/tests/replay_round_trip.rs
git commit -m "feat(hub-core): add replay::run with divergence detection and integration test"
```

---

## Phase 6 — Compat shim: keep `hub-wasm` and the browser green

The pre-existing public surface (`World`, `PlayerState`, `DoorDefinition`, `InteractionResult`, `Aabb`, `Position`, `InputVector`, `core_identity`, `CORE_API_VERSION`, `PROJECT_NAME`) is currently re-exported from `lib.rs`. `hub-wasm` consumes it. We need to move that surface into a `compat` module that delegates to `Sim`, keeping the old public API stable.

### Task 24: Move legacy types into `compat`

**Files:**
- Create: `crates/hub-core/src/compat.rs`
- Modify: `crates/hub-core/src/lib.rs`

- [ ] **Step 24.1: Move the existing legacy code into `compat.rs`**

Create `crates/hub-core/src/compat.rs`. Copy the entire body of the current `crates/hub-core/src/lib.rs` *except* the `#[cfg(test)] mod tests { ... }` block at the bottom and the new `pub mod hash; pub mod rng; pub mod sim; pub mod log; pub mod replay;` lines added in earlier phases. The legacy items to move are:

- `PROJECT_NAME`, `CORE_API_VERSION`, `CoreIdentity`, `core_identity()`
- `Position`, `Aabb`, `InputVector`, `PlayerState`, `DoorDefinition`, `InteractionResult`, `World`
- Their `impl` blocks
- The private helpers: `clamp_i32`, `non_negative_i32`, `scale_i32_per_mille`, `sign_i8`

The tests block stays in `lib.rs` for now (it tests the legacy surface from the crate root). After moving, prefix the test imports with `crate::compat::` to refer to the moved items.

- [ ] **Step 24.2: Rewrite `lib.rs` to expose the new modules and re-export the legacy surface**

Replace the body of `crates/hub-core/src/lib.rs` with:
```rust
#![doc = "Deterministic core primitives for ha.ggis Hub."]

pub mod hash;
pub mod rng;
pub mod sim;
pub mod log;
pub mod replay;

#[doc(hidden)]
pub mod compat;

// Re-export the legacy public surface so `hub-wasm` continues to build
// unchanged. Plan 2 removes these re-exports when the new boundary lands.
pub use compat::{
    core_identity, Aabb, CoreIdentity, DoorDefinition, InputVector, InteractionResult,
    PlayerState, Position, World, CORE_API_VERSION, PROJECT_NAME,
};

#[cfg(test)]
mod legacy_tests {
    // The original tests block from lib.rs goes here verbatim. It tests the
    // legacy surface so leaving it at the crate root makes its scope obvious.
    use crate::compat::{
        core_identity, Aabb, DoorDefinition, InputVector, InteractionResult, PlayerState,
        Position, World, CORE_API_VERSION, PROJECT_NAME,
    };

    #[test]
    fn identity_reports_project_name() {
        let identity = core_identity();
        assert_eq!(identity.project_name, "ha.ggis Hub");
        assert_eq!(PROJECT_NAME, "ha.ggis Hub");
    }

    #[test]
    fn identity_reports_api_version() {
        let identity = core_identity();
        assert_eq!(identity.api_version, 1);
        assert_eq!(CORE_API_VERSION, 1);
    }

    #[test]
    fn cardinal_movement_advances_one_fixed_tick() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);
        let moved = world.tick_player(player, InputVector::new(1, 0));
        assert_eq!(moved.position, Position::new(600, 500));
    }

    #[test]
    fn diagonal_movement_is_deterministically_normalized() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);
        let moved = world.tick_player(player, InputVector::new(1, -1));
        assert_eq!(moved.position, Position::new(570, 430));
    }

    #[test]
    fn movement_is_clamped_to_world_bounds() {
        let world = test_world();
        let player = PlayerState::new(Position::new(50, 50), 80, 100);
        let moved = world.tick_player(player, InputVector::new(-1, -1));
        assert_eq!(moved.position, Position::new(80, 80));
    }

    #[test]
    fn door_proximity_reports_active_launch_target() {
        let world = test_world();
        let player = PlayerState::new(Position::new(740, 500), 80, 100);
        let interaction = world.interaction_for(player);
        assert_eq!(
            interaction,
            InteractionResult::near_launchable("wild-haggis-survivors", "Wild Haggis Survivors")
        );
    }

    #[test]
    fn door_proximity_reports_locked_future_door_without_launching() {
        let world = test_world();
        let player = PlayerState::new(Position::new(250, 500), 80, 100);
        let interaction = world.interaction_for(player);
        assert_eq!(
            interaction,
            InteractionResult::near_locked("future-bothy", "Future Bothy")
        );
    }

    #[test]
    fn door_proximity_reports_empty_space() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);
        let interaction = world.interaction_for(player);
        assert_eq!(interaction, InteractionResult::none());
    }

    #[test]
    fn constructors_sanitize_negative_sizes_and_speed() {
        let collapsed = Aabb::from_min_size(Position::new(10, 20), -5, -10);
        assert_eq!(collapsed, Aabb::from_min_size(Position::new(10, 20), 0, 0));
        let player = PlayerState::new(Position::new(100, 100), -80, -100);
        assert_eq!(player.half_extent, 0);
        assert_eq!(player.speed_per_tick, 0);
    }

    #[test]
    fn large_tick_values_saturate_instead_of_overflowing() {
        let world = World::new(
            Aabb::from_min_size(Position::new(0, 0), i32::MAX, i32::MAX),
            Vec::new(),
        );
        let player = PlayerState::new(Position::new(i32::MAX - 10, i32::MAX - 10), 0, i32::MAX);
        let moved = world.tick_player(player, InputVector::new(1, 1));
        assert_eq!(moved.position, Position::new(i32::MAX, i32::MAX));
    }

    fn test_world() -> World {
        World::new(
            Aabb::from_min_size(Position::new(0, 0), 1_000, 1_000),
            vec![
                DoorDefinition::launchable(
                    "wild-haggis-survivors",
                    "Wild Haggis Survivors",
                    Aabb::from_min_size(Position::new(820, 420), 120, 160),
                    "https://ha.ggis.xyz/wild-haggis-survivors/",
                ),
                DoorDefinition::locked(
                    "future-bothy",
                    "Future Bothy",
                    Aabb::from_min_size(Position::new(80, 420), 120, 160),
                ),
            ],
        )
    }
}
```

> **Implementer note:** when copying the existing tests block, be deliberate — do not summarise. The intent of moving them is *zero* behavioural change.

- [ ] **Step 24.3: Run the full test suite**

Run: `cargo test --workspace`
Expected: all existing tests pass (the same count as baseline) plus the new modules' tests. `hub-wasm` tests must be green without any changes.

### Task 25: Compat phase fmt/clippy + commit

- [ ] **Step 25.1: Run fmt and clippy**

Run:
```
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 25.2: Verify wasm target still builds**

Run: `RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown`
(On Windows PowerShell use: `$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown`)
Expected: clean check.

- [ ] **Step 25.3: Commit**

Run:
```
git add crates/hub-core/src/compat.rs crates/hub-core/src/lib.rs
git commit -m "refactor(hub-core): move legacy surface to compat module behind re-exports"
```

---

## Phase 7 — Final verification

### Task 26: Whole-workspace green check

**Files:** none.

- [ ] **Step 26.1: Run every project gate currently documented in `README.md`**

Run:
```
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```
On Windows PowerShell, also run:
```
$env:RUSTFLAGS="-D warnings"; cargo check --workspace --target wasm32-unknown-unknown
```
On bash:
```
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown
```
Expected: all green.

- [ ] **Step 26.2: Run the TS gates and verify the browser still works**

Run:
```
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```
Expected: all green. `hub-wasm` still exports the same surface; TS tests still pass without modification.

- [ ] **Step 26.3: Manual smoke**

Run: `pnpm dev`
Open the printed `http://localhost:5173/` URL. Verify the haggis moves with WASD/arrows, doors highlight on overlap, direct-play link is visible. Visible behaviour must be unchanged from before this plan started.

- [ ] **Step 26.4: Capture test counts**

Run: `cargo test --workspace 2>&1 | grep "test result"`
Expected: `hub-core` shows at least the new tests added in this plan plus all baseline tests; `hub-wasm` shows the baseline count unchanged.

- [ ] **Step 26.5: Plan-completion commit (notes only — no code change)**

If there are no remaining uncommitted files, skip. Otherwise, commit any straggler formatting fixes:
```
git status
```
If everything is committed, this task ends.

---

## Acceptance criteria for this plan

The plan is complete when:

1. `hub-core` exposes `hash::Fnv1a64`, `rng::Rng`, `sim::{Sim, InputSnapshot, RenderSnapshot, state_hash}`, `log::{LogWriter, Log}`, and `replay::run` with the test coverage described in Phases 1–5.
2. `crates/hub-core/src/compat.rs` carries the previous public surface unchanged and `hub-wasm` builds and tests without modification.
3. The full `README.md` gate set passes:
   - `cargo fmt --all -- --check`
   - `cargo test --workspace`
   - `cargo clippy --workspace --all-targets -- -D warnings`
   - `cargo check --workspace --target wasm32-unknown-unknown` (with `RUSTFLAGS=-D warnings`)
   - `pnpm exec tsc --noEmit`
   - `pnpm exec vitest run`
   - `pnpm run build`
4. The browser dev server still serves the first room with unchanged visible behaviour.
5. Every task in this plan ended with a commit; the branch has one commit per task at minimum.

## Out of scope (lands in later plans)

- Collapsing the WASM boundary to the four-function surface from spec §2.4 — **plan 2**.
- Replacing the TS-side per-tick wrapper with a fixed-step accumulator and a zero-copy snapshot reader — **plan 2**.
- Browser-side input log capture — **plan 2**.
- WAT and C differential implementations — **plan 3**.
- The `haggis-eval` Go CLI — **plan 4**.
- Foundation document prune — **plan 5**.
