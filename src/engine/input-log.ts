const MAGIC = [0x48, 0x47, 0x4c, 0x47]; // "HGLG"
const FORMAT_VERSION = 1;

export interface InputLogConfig {
  readonly seed: bigint;
  readonly coreApiVersion: number;
  readonly startedAtUtcMs: bigint;
  readonly initialStateHash: bigint;
}

/** Sparse append-only `.haggislog` writer matching the byte layout in
 *  the kernel spec §2.5 / hub_core::log. */
export class InputLogWriter {
  private bytes: number[] = [];
  // Replay treats omitted frames as "held input from the last record, or
  // idle (0) before any record". Initialise to idle so the first idle frame
  // is correctly omitted from the body — matches the native LogWriter
  // contract where the caller decides when to append.
  private lastWrittenInput = 0;

  constructor(config: InputLogConfig) {
    for (const m of MAGIC) this.bytes.push(m);
    pushU16(this.bytes, FORMAT_VERSION);
    pushU32(this.bytes, config.coreApiVersion);
    pushU64(this.bytes, config.seed);
    pushU64(this.bytes, config.startedAtUtcMs);
    pushU64(this.bytes, config.initialStateHash);
  }

  /** Append a record at `tickIndex` if the input differs from the last one. */
  recordIfChanged(tickIndex: number, inputPacked: number): void {
    if (this.lastWrittenInput === inputPacked) return;
    pushU32(this.bytes, tickIndex);
    pushU32(this.bytes, inputPacked);
    this.lastWrittenInput = inputPacked;
  }

  /** Finalize with trailer fields (final_state_hash, total_ticks, digest)
   *  and return the assembled buffer. Digest is FNV-1a 64-bit over header
   *  + body + final_state_hash + total_ticks, matching the spec.
   *  Non-destructive: this.bytes is unchanged, so finish() is idempotent
   *  and safe to call multiple times (e.g. beforeunload + pagehide). */
  finish(totalTicks: number, finalStateHash: bigint): Uint8Array {
    const buf = [...this.bytes];
    pushU64(buf, finalStateHash);
    pushU32(buf, totalTicks);
    const digest = fnv1a64(buf);
    pushU64(buf, digest);
    return Uint8Array.from(buf);
  }
}

function pushU16(out: number[], value: number): void {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushU32(out: number[], value: number): void {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function pushU64(out: number[], value: bigint): void {
  const low = Number(value & 0xffffffffn);
  const high = Number((value >> 32n) & 0xffffffffn);
  pushU32(out, low);
  pushU32(out, high);
}

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
