//! Owns a `Sim` plus the byte buffers the WASM boundary publishes to the
//! TypeScript host. Replaces the legacy per-tick allocating boundary; old
//! exports remain in `lib.rs` during the migration plan and are removed
//! once consumers move.

use wasm_bindgen::prelude::*;

use hub_core::CORE_API_VERSION;
use hub_core::log::Log;
use hub_core::replay;
use hub_core::sim::{InputSnapshot, Sim};

use crate::room_def;
use crate::snapshot_view::{SNAPSHOT_BYTES, write_snapshot};

/// Error tag returned by `tick`. Zero is success.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HubErrorTag {
    /// Operation completed successfully.
    Ok = 0,
    /// The `input_packed` value contained reserved bits or otherwise
    /// could not be reconstructed into a valid `InputSnapshot`.
    InvalidInput = 1,
}

/// Owning handle exposed to JavaScript. Pointer fields and the snapshot byte
/// buffer live in linear memory so the TS side can build zero-copy views.
#[wasm_bindgen]
pub struct HubHandle {
    sim: Sim,
    snapshot_buffer: Vec<u8>,
    last_error: String,
    log_writer: Option<hub_core::log::LogWriter>,
}

#[wasm_bindgen]
impl HubHandle {
    /// Create a new handle, seeding `Sim` with the supplied seed and
    /// publishing the initial render snapshot into the snapshot buffer.
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(seed: u64) -> Self {
        let sim = Sim::new(seed);
        let mut snapshot_buffer = vec![0u8; SNAPSHOT_BYTES];
        write_snapshot(&mut snapshot_buffer, &sim.render_snapshot());
        Self {
            sim,
            snapshot_buffer,
            last_error: String::new(),
            log_writer: None,
        }
    }

    /// Advance one tick. Writes the post-tick render snapshot into the
    /// snapshot buffer in place. Returns `HubErrorTag::Ok` on success.
    pub fn tick(&mut self, input_packed: u32) -> HubErrorTag {
        // Lower 16 bits are the InputSnapshot raw; anything above that
        // or outside the current InputSnapshot mask is reserved. Reject
        // reserved bits here rather than silently letting the core mask them,
        // so boundary callers get a stable error for malformed packed input.
        let Ok(raw) = u16::try_from(input_packed) else {
            self.last_error = format!("input_packed has reserved high bits: {input_packed:#010x}");
            return HubErrorTag::InvalidInput;
        };
        let input = InputSnapshot::from_raw(raw);
        if input.raw() != raw {
            self.last_error = format!("input_packed has reserved bits: {input_packed:#010x}");
            return HubErrorTag::InvalidInput;
        }
        if raw & 0b0011 == 0b0011 || raw & 0b1100 == 0b1100 {
            self.last_error =
                format!("input_packed has reserved axis encoding: {input_packed:#010x}");
            return HubErrorTag::InvalidInput;
        }
        let snapshot = self.sim.tick(input);
        write_snapshot(&mut self.snapshot_buffer, &snapshot);

        if let Some(writer) = self.log_writer.as_mut() {
            // The handle does not know the current tick index — caller
            // tracks it. For now the writer is opt-in and the caller writes
            // records directly through `LogWriter::append`; the embedded
            // writer is reserved for future symmetric in-WASM capture.
            let _ = writer;
        }
        HubErrorTag::Ok
    }

    /// Pointer to the snapshot buffer in linear memory.
    #[must_use]
    pub fn snapshot_ptr(&self) -> *const u8 {
        self.snapshot_buffer.as_ptr()
    }

    /// Length of the snapshot buffer in bytes (stable for the handle's lifetime).
    #[must_use]
    pub fn snapshot_len(&self) -> usize {
        self.snapshot_buffer.len()
    }

    /// FNV-1a 64-bit digest over the current Sim state.
    #[must_use]
    pub fn state_hash(&self) -> u64 {
        self.sim.state_hash()
    }

    /// Build a JSON room descriptor from the current snapshot. Init-only —
    /// the host should call this once at handle creation and cache the result.
    #[must_use]
    pub fn room_definition(&self) -> String {
        room_def::render(&self.sim.render_snapshot())
    }

    /// Pointer to the last error message string. Length is `error_message_len`.
    /// Valid until the next boundary call.
    #[must_use]
    pub fn error_message_ptr(&self) -> *const u8 {
        self.last_error.as_ptr()
    }

    /// Length of the last error message in bytes.
    #[must_use]
    pub fn error_message_len(&self) -> usize {
        self.last_error.len()
    }
}

/// Replay a `.haggislog` byte buffer natively inside WASM and return the
/// final state hash. Used by the in-browser determinism gate; can be called
/// without owning a `HubHandle`.
///
/// On success the returned `u64` is the final state hash from the replayed
/// session. On failure the high 32 bits encode a non-zero error code and the
/// low 32 bits are zero:
/// - `(1u64 << 32)` = log decode failure
/// - `(2u64 << 32)` = replay divergence
///
/// Callers should compare the returned hash against an expected value; a
/// mismatch (including the error patterns) signals an unsuccessful replay.
#[wasm_bindgen]
#[must_use]
pub fn replay_run(log_bytes: &[u8]) -> u64 {
    let Ok(log) = Log::decode(log_bytes, CORE_API_VERSION) else {
        return 1u64 << 32;
    };
    match replay::run(&log) {
        Ok(outcome) => outcome.final_state_hash,
        Err(_) => 2u64 << 32,
    }
}

/// Hub core API version exposed to JS so the host can refuse a binding /
/// host pair whose protocol versions disagree.
#[wasm_bindgen]
#[must_use]
pub fn hub_core_api_version() -> u32 {
    CORE_API_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;
    use hub_core::log::{LogWriter, WriterConfig};

    #[test]
    fn new_handle_publishes_initial_snapshot() {
        let handle = HubHandle::new(0);
        assert_eq!(handle.snapshot_len(), SNAPSHOT_BYTES);
        assert_ne!(handle.state_hash(), 0);
    }

    #[test]
    fn tick_with_valid_input_advances_state_hash() {
        let mut handle = HubHandle::new(0);
        let before = handle.state_hash();
        let tag = handle.tick(0b0001); // x = +1
        assert_eq!(tag, HubErrorTag::Ok);
        let after = handle.state_hash();
        assert_ne!(before, after);
    }

    #[test]
    fn tick_with_reserved_bits_returns_invalid_input_and_sets_message() {
        let mut handle = HubHandle::new(0);
        let tag = handle.tick(0xFFFF_0001);
        assert_eq!(tag, HubErrorTag::InvalidInput);
        assert!(handle.error_message_len() > 0);
    }

    #[test]
    fn tick_with_low_reserved_bits_returns_invalid_input_and_sets_message() {
        let mut handle = HubHandle::new(0);
        let tag = handle.tick(0b0010_0000);
        assert_eq!(tag, HubErrorTag::InvalidInput);
        assert!(handle.error_message_len() > 0);
    }

    #[test]
    fn tick_with_reserved_axis_encoding_returns_invalid_input() {
        let mut handle = HubHandle::new(0);
        assert_eq!(handle.tick(0b0011), HubErrorTag::InvalidInput);

        let mut handle = HubHandle::new(0);
        assert_eq!(handle.tick(0b1100), HubErrorTag::InvalidInput);
    }

    #[test]
    fn room_definition_includes_known_door() {
        let handle = HubHandle::new(0);
        let descriptor = handle.room_definition();
        assert!(descriptor.contains("wild-haggis-survivors"));
    }

    #[test]
    fn replay_run_returns_final_state_hash_for_zero_tick_session() {
        // Build a log with the initial state hash as the trailer.
        let seed = 7;
        let initial = Sim::new(seed).state_hash();
        let writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash: initial,
        });
        let bytes = writer.finish(0, initial);
        let result = replay_run(&bytes);
        assert_eq!(result, initial);
    }
}
