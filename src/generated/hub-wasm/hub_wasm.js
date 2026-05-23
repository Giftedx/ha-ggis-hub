/* @ts-self-types="./hub_wasm.d.ts" */

/**
 * Error tag returned by `tick`. Zero is success.
 * @enum {0 | 1}
 */
export const HubErrorTag = Object.freeze({
    /**
     * Operation completed successfully.
     */
    Ok: 0, "0": "Ok",
    /**
     * The `input_packed` value contained reserved bits or otherwise
     * could not be reconstructed into a valid `InputSnapshot`.
     */
    InvalidInput: 1, "1": "InvalidInput",
});

/**
 * Owning handle exposed to JavaScript. Pointer fields and the snapshot byte
 * buffer live in linear memory so the TS side can build zero-copy views.
 */
export class HubHandle {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HubHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hubhandle_free(ptr, 0);
    }
    /**
     * Length of the last error message in bytes.
     * @returns {number}
     */
    error_message_len() {
        const ret = wasm.hubhandle_error_message_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Pointer to the last error message string. Length is `error_message_len`.
     * Valid until the next boundary call.
     * @returns {number}
     */
    error_message_ptr() {
        const ret = wasm.hubhandle_error_message_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new handle, seeding `Sim` with the supplied seed and
     * publishing the initial render snapshot into the snapshot buffer.
     * @param {bigint} seed
     */
    constructor(seed) {
        const ret = wasm.hubhandle_new(seed);
        this.__wbg_ptr = ret;
        HubHandleFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Build a JSON room descriptor from the current snapshot. Init-only —
     * the host should call this once at handle creation and cache the result.
     * @returns {string}
     */
    room_definition() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hubhandle_room_definition(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Length of the snapshot buffer in bytes (stable for the handle's lifetime).
     * @returns {number}
     */
    snapshot_len() {
        const ret = wasm.hubhandle_snapshot_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Pointer to the snapshot buffer in linear memory.
     * @returns {number}
     */
    snapshot_ptr() {
        const ret = wasm.hubhandle_snapshot_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * FNV-1a 64-bit digest over the current Sim state.
     * @returns {bigint}
     */
    state_hash() {
        const ret = wasm.hubhandle_state_hash(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Advance one tick. Writes the post-tick render snapshot into the
     * snapshot buffer in place. Returns `HubErrorTag::Ok` on success.
     * @param {number} input_packed
     * @returns {HubErrorTag}
     */
    tick(input_packed) {
        const ret = wasm.hubhandle_tick(this.__wbg_ptr, input_packed);
        return ret;
    }
}
if (Symbol.dispose) HubHandle.prototype[Symbol.dispose] = HubHandle.prototype.free;

/**
 * Interaction kind exposed as a compact JavaScript-readable enum.
 * @enum {0 | 1 | 2}
 */
export const HubInteractionKind = Object.freeze({
    /**
     * No door is reachable.
     */
    None: 0, "0": "None",
    /**
     * A launchable door is reachable.
     */
    Launchable: 1, "1": "Launchable",
    /**
     * A locked or future door is reachable.
     */
    Locked: 2, "2": "Locked",
});

/**
 * Door interaction snapshot returned across the WASM boundary.
 */
export class HubInteractionSnapshot {
    static __wrap(ptr) {
        const obj = Object.create(HubInteractionSnapshot.prototype);
        obj.__wbg_ptr = ptr;
        HubInteractionSnapshotFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HubInteractionSnapshotFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hubinteractionsnapshot_free(ptr, 0);
    }
    /**
     * Stable door id, or an empty string when no door is reachable.
     * @returns {string}
     */
    id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hubinteractionsnapshot_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Interaction kind for host UI branching.
     * @returns {HubInteractionKind}
     */
    kind() {
        const ret = wasm.hubinteractionsnapshot_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * Visitor-facing door title, or an empty string when no door is reachable.
     * @returns {string}
     */
    title() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hubinteractionsnapshot_title(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) HubInteractionSnapshot.prototype[Symbol.dispose] = HubInteractionSnapshot.prototype.free;

/**
 * Player state snapshot returned across the WASM boundary.
 */
export class HubPlayerSnapshot {
    static __wrap(ptr) {
        const obj = Object.create(HubPlayerSnapshot.prototype);
        obj.__wbg_ptr = ptr;
        HubPlayerSnapshotFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HubPlayerSnapshotFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hubplayersnapshot_free(ptr, 0);
    }
    /**
     * Player half extent in fixed world units after boundary sanitization.
     * @returns {number}
     */
    half_extent() {
        const ret = wasm.hubplayersnapshot_half_extent(this.__wbg_ptr);
        return ret;
    }
    /**
     * Player speed per fixed tick after boundary sanitization.
     * @returns {number}
     */
    speed_per_tick() {
        const ret = wasm.hubplayersnapshot_speed_per_tick(this.__wbg_ptr);
        return ret;
    }
    /**
     * Player center x coordinate in fixed world units.
     * @returns {number}
     */
    x() {
        const ret = wasm.hubplayersnapshot_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * Player center y coordinate in fixed world units.
     * @returns {number}
     */
    y() {
        const ret = wasm.hubplayersnapshot_y(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) HubPlayerSnapshot.prototype[Symbol.dispose] = HubPlayerSnapshot.prototype.free;

/**
 * Minimal world handle exposed to JavaScript.
 */
export class HubWorld {
    static __wrap(ptr) {
        const obj = Object.create(HubWorld.prototype);
        obj.__wbg_ptr = ptr;
        HubWorldFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HubWorldFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hubworld_free(ptr, 0);
    }
    /**
     * Derive the current door interaction for a boundary-provided player state.
     * @param {number} x
     * @param {number} y
     * @param {number} half_extent
     * @param {number} speed_per_tick
     * @returns {HubInteractionSnapshot}
     */
    interaction_for(x, y, half_extent, speed_per_tick) {
        const ret = wasm.hubworld_interaction_for(this.__wbg_ptr, x, y, half_extent, speed_per_tick);
        return HubInteractionSnapshot.__wrap(ret);
    }
    /**
     * Advance a player by one fixed tick using primitive boundary-safe values.
     *
     * Invalid inputs are sanitized by `hub-core`: input axes become -1/0/1,
     * negative sizes and speeds become zero, and movement saturates instead of
     * overflowing.
     * @param {number} x
     * @param {number} y
     * @param {number} half_extent
     * @param {number} speed_per_tick
     * @param {number} input_x
     * @param {number} input_y
     * @returns {HubPlayerSnapshot}
     */
    tick_player(x, y, half_extent, speed_per_tick, input_x, input_y) {
        const ret = wasm.hubworld_tick_player(this.__wbg_ptr, x, y, half_extent, speed_per_tick, input_x, input_y);
        return HubPlayerSnapshot.__wrap(ret);
    }
}
if (Symbol.dispose) HubWorld.prototype[Symbol.dispose] = HubWorld.prototype.free;

/**
 * Create the deterministic demo world used by the current hub slice.
 * @returns {HubWorld}
 */
export function create_demo_world() {
    const ret = wasm.create_demo_world();
    return HubWorld.__wrap(ret);
}

/**
 * Return the current hub-core API version exposed through WASM.
 * @returns {number}
 */
export function hub_core_api_version() {
    const ret = wasm.hub_core_api_version();
    return ret >>> 0;
}

/**
 * Hub core API version exposed to JS so the host can refuse a binding /
 * host pair whose protocol versions disagree.
 * @returns {number}
 */
export function hub_core_api_version_v2() {
    const ret = wasm.hub_core_api_version_v2();
    return ret >>> 0;
}

/**
 * Return the project name exposed through WASM for host diagnostics.
 * @returns {string}
 */
export function hub_core_project_name() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.hub_core_project_name();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

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
 * @param {Uint8Array} log_bytes
 * @returns {bigint}
 */
export function replay_run(log_bytes) {
    const ptr0 = passArray8ToWasm0(log_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.replay_run(ptr0, len0);
    return BigInt.asUintN(64, ret);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_1506f2235d1bdba0: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./hub_wasm_bg.js": import0,
    };
}

const HubHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hubhandle_free(ptr, 1));
const HubInteractionSnapshotFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hubinteractionsnapshot_free(ptr, 1));
const HubPlayerSnapshotFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hubplayersnapshot_free(ptr, 1));
const HubWorldFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hubworld_free(ptr, 1));

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('hub_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
