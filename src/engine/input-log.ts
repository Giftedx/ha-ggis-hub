const MAGIC = [0x48, 0x47, 0x4c, 0x47]; // "HGLG"
const FORMAT_VERSION = 1;
const CORE_INPUT_MASK = 0xffff;

/**
 * Record-local browser intent pulse. Stored in the high half of the body
 * record's `input_packed` u32 so native movement replay can keep masking to the
 * low 16-bit `hub_core::InputSnapshot` without a format-version bump.
 */
export const INPUT_LOG_INTERACT_EDGE_FLAG = 0x0001_0000;

export interface InputLogConfig {
  readonly seed: bigint;
  readonly coreApiVersion: number;
  readonly startedAtUtcMs: bigint;
  readonly initialStateHash: bigint;
}

export interface InputLogTickIntent {
  /** True exactly on the tick where the browser host consumed Enter/Space/E. */
  readonly interactEdge?: boolean;
}

/** Sparse append-only `.haggislog` writer matching the byte layout in
 *  the kernel spec §2.5 / hub_core::log.
 *
 *  Body records remain `(tick_index: u32, input_packed: u32)` in format v1.
 *  `input_packed` low 16 bits are the held core `InputSnapshot`; high bits are
 *  record-local browser intent pulses. Native deterministic movement replay
 *  ignores the high bits, so movement-only logs and intent-annotated logs use
 *  the same v1 reader path. */
export class InputLogWriter {
  private bytes: number[] = [];
  // Replay treats omitted frames as "held core input from the last record, or
  // idle (0) before any record". Browser intent flags are record-local pulses
  // and are not held across omitted frames.
  private lastWrittenCoreInput = 0;

  constructor(config: InputLogConfig) {
    for (const m of MAGIC) this.bytes.push(m);
    pushU16(this.bytes, FORMAT_VERSION);
    pushU32(this.bytes, config.coreApiVersion);
    pushU64(this.bytes, config.seed);
    pushU64(this.bytes, config.startedAtUtcMs);
    pushU64(this.bytes, config.initialStateHash);
  }

  /** Append a record at `tickIndex` if the core movement input differs from the last one. */
  recordIfChanged(tickIndex: number, inputPacked: number): void {
    this.recordTick(tickIndex, inputPacked);
  }

  /**
   * Append a tick record when the held core input changes OR when a browser
   * intent pulse must be preserved. Intent pulses are record-local; omitted
   * frames continue holding only the low 16-bit core input.
   */
  recordTick(tickIndex: number, inputPacked: number, intent: InputLogTickIntent = {}): void {
    const coreInput = inputPacked & CORE_INPUT_MASK;
    const intentFlags = inputLogIntentFlags(intent);
    if (intentFlags === 0 && this.lastWrittenCoreInput === coreInput) return;
    pushU32(this.bytes, tickIndex);
    pushU32(this.bytes, coreInput | intentFlags);
    this.lastWrittenCoreInput = coreInput;
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

function inputLogIntentFlags(intent: InputLogTickIntent): number {
  return intent.interactEdge === true ? INPUT_LOG_INTERACT_EDGE_FLAG : 0;
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
