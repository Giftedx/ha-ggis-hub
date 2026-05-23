// Package fnv implements FNV-1a 64-bit hash. Hand-rolled to match the
// Rust implementation in crates/hub-core/src/hash.rs and the C
// implementation in c/fnv1a.c. Used for the report signature in
// internal/report so the haggis-eval JSON bundle can be verified as
// untampered.
package fnv

const (
	offsetBasis64 uint64 = 0xcbf29ce484222325
	prime64       uint64 = 0x100000001b3
)

// Fnv1a64 returns the FNV-1a 64-bit hash of data.
func Fnv1a64(data []byte) uint64 {
	h := offsetBasis64
	for _, b := range data {
		h ^= uint64(b)
		h *= prime64
	}
	return h
}

// Hasher is a streaming FNV-1a 64-bit hasher.
type Hasher struct {
	state uint64
}

// NewHasher returns a hasher seeded with the FNV-1a offset basis.
func NewHasher() *Hasher {
	return &Hasher{state: offsetBasis64}
}

// Write absorbs bytes into the hasher.
func (h *Hasher) Write(p []byte) {
	s := h.state
	for _, b := range p {
		s ^= uint64(b)
		s *= prime64
	}
	h.state = s
}

// Digest returns the current 64-bit digest.
func (h *Hasher) Digest() uint64 {
	return h.state
}
