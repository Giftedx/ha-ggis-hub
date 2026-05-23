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
