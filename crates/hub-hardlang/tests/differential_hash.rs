//! Differential test: C FNV-1a (c/fnv1a.c) vs Rust FNV-1a
//! (`hub_core::hash`). Both implementations must agree byte-for-byte on
//! every input.

use hub_core::hash::fnv1a_64 as fnv1a_64_rust;
use hub_hardlang::fnv1a_64_c;
use proptest::prelude::*;

/// Published reference vectors from the FNV reference page
/// (<http://www.isthe.com/chongo/tech/comp/fnv/>). The Rust implementation
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
        assert_eq!(
            c_value, *expected,
            "C disagrees with published vector for {input:?}"
        );
        assert_eq!(
            rust_value, *expected,
            "Rust drifted from published vector for {input:?}"
        );
        assert_eq!(c_value, rust_value, "C and Rust disagree for {input:?}");
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 100_000, .. ProptestConfig::default() })]

    /// Fuzz: 100 000 random byte sequences up to 4 KiB. C and Rust must
    /// produce identical 64-bit digests for every one. `proptest`'s
    /// default config caps cases at 256; the inner-attribute override
    /// above bumps it to the 100 000 the spec calls for.
    #[test]
    fn c_matches_rust_for_arbitrary_bytes(
        input in proptest::collection::vec(any::<u8>(), 0..4096),
    ) {
        prop_assert_eq!(fnv1a_64_c(&input), fnv1a_64_rust(&input));
    }
}
