const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const U64_MASK = 0xffffffffffffffffn;

export function fnv1a64(bytes: readonly number[]): bigint {
  let h = FNV_OFFSET_BASIS;
  for (const b of bytes) {
    h = (h ^ BigInt(b)) & U64_MASK;
    h = (h * FNV_PRIME) & U64_MASK;
  }
  return h;
}
