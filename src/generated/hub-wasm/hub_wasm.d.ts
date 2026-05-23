/* tslint:disable */
/* eslint-disable */

/**
 * Error tag returned by `tick`. Zero is success.
 */
export enum HubErrorTag {
    /**
     * Operation completed successfully.
     */
    Ok = 0,
    /**
     * The `input_packed` value contained reserved bits or otherwise
     * could not be reconstructed into a valid `InputSnapshot`.
     */
    InvalidInput = 1,
}

/**
 * Owning handle exposed to JavaScript. Pointer fields and the snapshot byte
 * buffer live in linear memory so the TS side can build zero-copy views.
 */
export class HubHandle {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Length of the last error message in bytes.
     */
    error_message_len(): number;
    /**
     * Pointer to the last error message string. Length is `error_message_len`.
     * Valid until the next boundary call.
     */
    error_message_ptr(): number;
    /**
     * Create a new handle, seeding `Sim` with the supplied seed and
     * publishing the initial render snapshot into the snapshot buffer.
     */
    constructor(seed: bigint);
    /**
     * Build a JSON room descriptor from the current snapshot. Init-only —
     * the host should call this once at handle creation and cache the result.
     */
    room_definition(): string;
    /**
     * Length of the snapshot buffer in bytes (stable for the handle's lifetime).
     */
    snapshot_len(): number;
    /**
     * Pointer to the snapshot buffer in linear memory.
     */
    snapshot_ptr(): number;
    /**
     * FNV-1a 64-bit digest over the current Sim state.
     */
    state_hash(): bigint;
    /**
     * Advance one tick. Writes the post-tick render snapshot into the
     * snapshot buffer in place. Returns `HubErrorTag::Ok` on success.
     */
    tick(input_packed: number): HubErrorTag;
}

/**
 * Interaction kind exposed as a compact JavaScript-readable enum.
 */
export enum HubInteractionKind {
    /**
     * No door is reachable.
     */
    None = 0,
    /**
     * A launchable door is reachable.
     */
    Launchable = 1,
    /**
     * A locked or future door is reachable.
     */
    Locked = 2,
}

/**
 * Door interaction snapshot returned across the WASM boundary.
 */
export class HubInteractionSnapshot {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Stable door id, or an empty string when no door is reachable.
     */
    id(): string;
    /**
     * Interaction kind for host UI branching.
     */
    kind(): HubInteractionKind;
    /**
     * Visitor-facing door title, or an empty string when no door is reachable.
     */
    title(): string;
}

/**
 * Player state snapshot returned across the WASM boundary.
 */
export class HubPlayerSnapshot {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Player half extent in fixed world units after boundary sanitization.
     */
    half_extent(): number;
    /**
     * Player speed per fixed tick after boundary sanitization.
     */
    speed_per_tick(): number;
    /**
     * Player center x coordinate in fixed world units.
     */
    x(): number;
    /**
     * Player center y coordinate in fixed world units.
     */
    y(): number;
}

/**
 * Minimal world handle exposed to JavaScript.
 */
export class HubWorld {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Derive the current door interaction for a boundary-provided player state.
     */
    interaction_for(x: number, y: number, half_extent: number, speed_per_tick: number): HubInteractionSnapshot;
    /**
     * Advance a player by one fixed tick using primitive boundary-safe values.
     *
     * Invalid inputs are sanitized by `hub-core`: input axes become -1/0/1,
     * negative sizes and speeds become zero, and movement saturates instead of
     * overflowing.
     */
    tick_player(x: number, y: number, half_extent: number, speed_per_tick: number, input_x: number, input_y: number): HubPlayerSnapshot;
}

/**
 * Create the deterministic demo world used by the current hub slice.
 */
export function create_demo_world(): HubWorld;

/**
 * Return the current hub-core API version exposed through WASM.
 */
export function hub_core_api_version(): number;

/**
 * Hub core API version exposed to JS so the host can refuse a binding /
 * host pair whose protocol versions disagree.
 */
export function hub_core_api_version_v2(): number;

/**
 * Return the project name exposed through WASM for host diagnostics.
 */
export function hub_core_project_name(): string;

/**
 * Replay a `.haggislog` byte buffer natively inside WASM and return the
 * final state hash. Used by the in-browser determinism gate; can be called
 * without owning a `HubHandle`.
 *
 * On success the returned `u64` is the final state hash from the replayed
 * session. On failure the high 32 bits encode a non-zero error code and the
 * low 32 bits are zero:
 * - `(1u64 << 32)` = log decode failure
 * - `(2u64 << 32)` = replay divergence
 *
 * Callers should compare the returned hash against an expected value; a
 * mismatch (including the error patterns) signals an unsuccessful replay.
 */
export function replay_run(log_bytes: Uint8Array): bigint;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_hubhandle_free: (a: number, b: number) => void;
    readonly hub_core_api_version_v2: () => number;
    readonly hubhandle_error_message_len: (a: number) => number;
    readonly hubhandle_error_message_ptr: (a: number) => number;
    readonly hubhandle_new: (a: bigint) => number;
    readonly hubhandle_room_definition: (a: number) => [number, number];
    readonly hubhandle_snapshot_len: (a: number) => number;
    readonly hubhandle_snapshot_ptr: (a: number) => number;
    readonly hubhandle_state_hash: (a: number) => bigint;
    readonly hubhandle_tick: (a: number, b: number) => number;
    readonly replay_run: (a: number, b: number) => bigint;
    readonly __wbg_hubinteractionsnapshot_free: (a: number, b: number) => void;
    readonly __wbg_hubplayersnapshot_free: (a: number, b: number) => void;
    readonly __wbg_hubworld_free: (a: number, b: number) => void;
    readonly create_demo_world: () => number;
    readonly hub_core_api_version: () => number;
    readonly hub_core_project_name: () => [number, number];
    readonly hubinteractionsnapshot_id: (a: number) => [number, number];
    readonly hubinteractionsnapshot_kind: (a: number) => number;
    readonly hubinteractionsnapshot_title: (a: number) => [number, number];
    readonly hubplayersnapshot_half_extent: (a: number) => number;
    readonly hubplayersnapshot_speed_per_tick: (a: number) => number;
    readonly hubplayersnapshot_x: (a: number) => number;
    readonly hubplayersnapshot_y: (a: number) => number;
    readonly hubworld_interaction_for: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly hubworld_tick_player: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
