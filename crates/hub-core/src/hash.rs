//! FNV-1a 64-bit non-cryptographic hash used for state digests and the
//! `.haggislog` integrity trailer. The pure-Rust implementation here is the
//! runtime default; a hand-authored C implementation is wired in plan 3 and
//! verified against this one by differential test.

const FNV_OFFSET_BASIS_64: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME_64: u64 = 0x0000_0100_0000_01b3;

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

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn empty_input_returns_offset_basis() {
        assert_eq!(fnv1a_64(b""), 0xcbf2_9ce4_8422_2325);
    }

    #[test]
    fn known_reference_vectors_match_published_values() {
        // Published FNV-1a 64-bit reference vectors from the Fowler/Noll/Vo page.
        assert_eq!(fnv1a_64(b"a"), 0xaf63_dc4c_8601_ec8c);
        assert_eq!(fnv1a_64(b"foobar"), 0x8594_4171_f739_67e8);
        assert_eq!(fnv1a_64(b"chongo was here!\n"), 0x4681_0940_eff5_f915);
    }

    #[test]
    fn default_produces_same_initial_state_as_new() {
        let via_new = Fnv1a64::new();
        let via_default = Fnv1a64::default();
        assert_eq!(via_new.digest(), via_default.digest());
    }

    #[test]
    fn streaming_hash_equals_one_shot() {
        let input = b"the quick brown haggis jumps over the lazy bothy";
        let mut hasher = Fnv1a64::new();
        for chunk in input.chunks(7) {
            hasher.update(chunk);
        }
        assert_eq!(hasher.digest(), fnv1a_64(input));
    }

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
}
