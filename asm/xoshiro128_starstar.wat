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
