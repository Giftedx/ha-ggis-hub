//! `.haggislog` binary input log format. See the kernel design spec §2.5 for
//! the byte layout. The writer assembles a header, appends sparse body
//! records, and finalises a trailer. The reader parses the same. Body
//! `input_packed` records store the core `InputSnapshot` in the low 16 bits;
//! high bits are browser-only record-local intent pulses ignored by native
//! deterministic movement replay.

use crate::hash::Fnv1a64;
use crate::sim::InputSnapshot;

/// Four-byte magic at the head of every `.haggislog` buffer.
pub const MAGIC: [u8; 4] = *b"HGLG";
/// Log format version the writer emits and the reader accepts.
pub const FORMAT_VERSION: u16 = 1;

/// Errors produced by `.haggislog` decoding.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LogError {
    /// Buffer does not start with the `HGLG` magic.
    BadMagic,
    /// Format version is not supported by this build.
    UnsupportedFormatVersion(u16),
    /// `core_api_version` in the log does not equal the running build's value.
    CoreApiVersionMismatch {
        /// Value recorded in the log header.
        log: u32,
        /// Value reported by the currently-running build.
        running: u32,
    },
    /// Buffer is shorter than the declared structure requires.
    Truncated,
    /// Trailer digest does not match a recomputed digest of (header + body
    /// + `final_state_hash` + `total_ticks`).
    DigestMismatch {
        /// Digest read from the trailer.
        expected: u64,
        /// Digest computed over the bytes preceding the trailer digest.
        actual: u64,
    },
}

/// Parsed `.haggislog` document. Owns its body bytes; the typed view is built
/// on demand.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Log {
    /// Format version read from the header.
    pub format_version: u16,
    /// Core API version that wrote the log.
    pub core_api_version: u32,
    /// RNG seed the original session used.
    pub seed: u64,
    /// Wall-clock start timestamp, milliseconds since the Unix epoch.
    pub started_at_utc_ms: u64,
    /// `state_hash` of the simulation at tick zero.
    pub initial_state_hash: u64,
    /// Sparse input records, ordered by ascending `tick_index`.
    pub records: Vec<LogRecord>,
    /// `state_hash` of the simulation after the last applied tick.
    pub final_state_hash: u64,
    /// Total number of ticks the session ran.
    pub total_ticks: u32,
}

/// One sparse body record. The writer only emits a record when the input has
/// changed; the reader holds the previous value for omitted frames.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LogRecord {
    /// Tick index at which the input took effect.
    pub tick_index: u32,
    /// Input snapshot applied at that tick.
    pub input: InputSnapshot,
}

/// Header fields supplied when constructing a writer.
#[derive(Clone, Copy, Debug)]
pub struct WriterConfig {
    /// RNG seed for the session being logged.
    pub seed: u64,
    /// Core API version of the build that produced the log.
    pub core_api_version: u32,
    /// Wall-clock start timestamp, milliseconds since the Unix epoch.
    pub started_at_utc_ms: u64,
    /// `state_hash` of the simulation at tick zero.
    pub initial_state_hash: u64,
}

/// Total byte length of the fixed-layout header.
pub const HEADER_LEN: usize = 4   // magic
    + 2 // format_version
    + 4 // core_api_version
    + 8 // seed
    + 8 // started_at_utc_ms
    + 8 // initial_state_hash
    ;

/// Byte length of one body record (`tick_index` + packed input as `u32`). The
/// low 16 bits of the packed input are the core input snapshot; high bits are
/// host-only intent pulses ignored by `parse_body` for native replay.
pub const RECORD_LEN: usize = 4 + 4;
/// Byte length of the trailer (`final_state_hash` + `total_ticks` + digest).
pub const TRAILER_LEN: usize = 8 + 4 + 8;

/// Append-only `.haggislog` writer.
pub struct LogWriter {
    bytes: Vec<u8>,
}

impl LogWriter {
    /// Begin a new log. The header is written immediately.
    #[must_use]
    pub fn new(config: WriterConfig) -> Self {
        let mut bytes = Vec::with_capacity(HEADER_LEN);
        bytes.extend_from_slice(&MAGIC);
        bytes.extend_from_slice(&FORMAT_VERSION.to_le_bytes());
        bytes.extend_from_slice(&config.core_api_version.to_le_bytes());
        bytes.extend_from_slice(&config.seed.to_le_bytes());
        bytes.extend_from_slice(&config.started_at_utc_ms.to_le_bytes());
        bytes.extend_from_slice(&config.initial_state_hash.to_le_bytes());
        Self { bytes }
    }

    /// Append a record. Caller is responsible for only appending when the
    /// input has changed; this method does not deduplicate.
    pub fn append(&mut self, tick_index: u32, input: InputSnapshot) {
        self.bytes.extend_from_slice(&tick_index.to_le_bytes());
        self.bytes
            .extend_from_slice(&u32::from(input.raw()).to_le_bytes());
    }

    /// Finalise with trailer fields and return the assembled byte vector.
    #[must_use]
    pub fn finish(mut self, total_ticks: u32, final_state_hash: u64) -> Vec<u8> {
        self.bytes
            .extend_from_slice(&final_state_hash.to_le_bytes());
        self.bytes.extend_from_slice(&total_ticks.to_le_bytes());
        let digest = digest_of_header_and_body(&self.bytes);
        self.bytes.extend_from_slice(&digest.to_le_bytes());
        self.bytes
    }
}

/// Parsed header fields and the cursor where the body begins.
struct ParsedHeader {
    format_version: u16,
    core_api_version: u32,
    seed: u64,
    started_at_utc_ms: u64,
    initial_state_hash: u64,
}

/// Parsed trailer fields.
struct ParsedTrailer {
    final_state_hash: u64,
    total_ticks: u32,
    claimed_digest: u64,
}

impl Log {
    /// Parse a complete `.haggislog` buffer and validate the trailer digest.
    ///
    /// # Errors
    ///
    /// Returns a [`LogError`] when the buffer is too short, has the wrong
    /// magic or format version, was produced by a different
    /// `core_api_version`, or fails the trailer digest check.
    pub fn decode(bytes: &[u8], running_core_api_version: u32) -> Result<Self, LogError> {
        if bytes.len() < HEADER_LEN + TRAILER_LEN {
            return Err(LogError::Truncated);
        }
        let header = parse_header(bytes, running_core_api_version)?;
        let trailer_start = bytes.len() - TRAILER_LEN;
        let records = parse_body(&bytes[HEADER_LEN..trailer_start])?;
        let trailer = parse_trailer(&bytes[trailer_start..]);

        let actual_digest = {
            let mut hasher = Fnv1a64::new();
            hasher.update(&bytes[..trailer_start + 12]);
            hasher.digest()
        };
        if trailer.claimed_digest != actual_digest {
            return Err(LogError::DigestMismatch {
                expected: trailer.claimed_digest,
                actual: actual_digest,
            });
        }

        Ok(Log {
            format_version: header.format_version,
            core_api_version: header.core_api_version,
            seed: header.seed,
            started_at_utc_ms: header.started_at_utc_ms,
            initial_state_hash: header.initial_state_hash,
            records,
            final_state_hash: trailer.final_state_hash,
            total_ticks: trailer.total_ticks,
        })
    }
}

/// Decode the fixed-size header. Caller must guarantee `bytes.len() >=
/// HEADER_LEN`; `Log::decode` checks this before calling.
fn parse_header(bytes: &[u8], running_core_api_version: u32) -> Result<ParsedHeader, LogError> {
    let magic: [u8; 4] = bytes[0..4]
        .try_into()
        .expect("HEADER_LEN guarantees 4 bytes");
    if magic != MAGIC {
        return Err(LogError::BadMagic);
    }
    let format_version = u16::from_le_bytes(
        bytes[4..6]
            .try_into()
            .expect("HEADER_LEN guarantees 2 bytes"),
    );
    if format_version != FORMAT_VERSION {
        return Err(LogError::UnsupportedFormatVersion(format_version));
    }
    let core_api_version = u32::from_le_bytes(
        bytes[6..10]
            .try_into()
            .expect("HEADER_LEN guarantees 4 bytes"),
    );
    if core_api_version != running_core_api_version {
        return Err(LogError::CoreApiVersionMismatch {
            log: core_api_version,
            running: running_core_api_version,
        });
    }
    let seed = u64::from_le_bytes(
        bytes[10..18]
            .try_into()
            .expect("HEADER_LEN guarantees 8 bytes"),
    );
    let started_at_utc_ms = u64::from_le_bytes(
        bytes[18..26]
            .try_into()
            .expect("HEADER_LEN guarantees 8 bytes"),
    );
    let initial_state_hash = u64::from_le_bytes(
        bytes[26..34]
            .try_into()
            .expect("HEADER_LEN guarantees 8 bytes"),
    );
    Ok(ParsedHeader {
        format_version,
        core_api_version,
        seed,
        started_at_utc_ms,
        initial_state_hash,
    })
}

/// Decode the variable-length body into typed records. Browser-only high-half
/// intent pulses are deliberately masked away here; native replay consumes only
/// the low 16-bit core `InputSnapshot` and leaves launch side effects to host
/// replay tooling.
fn parse_body(body: &[u8]) -> Result<Vec<LogRecord>, LogError> {
    if !body.len().is_multiple_of(RECORD_LEN) {
        return Err(LogError::Truncated);
    }
    let mut records = Vec::with_capacity(body.len() / RECORD_LEN);
    for chunk in body.chunks_exact(RECORD_LEN) {
        let tick_index = u32::from_le_bytes(
            chunk[0..4]
                .try_into()
                .expect("RECORD_LEN guarantees 4 bytes"),
        );
        let raw_u32 = u32::from_le_bytes(
            chunk[4..8]
                .try_into()
                .expect("RECORD_LEN guarantees 4 bytes"),
        );
        records.push(LogRecord {
            tick_index,
            input: InputSnapshot::from_raw(low_u16(raw_u32)),
        });
    }
    Ok(records)
}

/// Decode the fixed-size trailer. Caller must guarantee `trailer.len() >=
/// TRAILER_LEN`; `Log::decode` checks this before calling.
fn parse_trailer(trailer: &[u8]) -> ParsedTrailer {
    let final_state_hash = u64::from_le_bytes(
        trailer[0..8]
            .try_into()
            .expect("TRAILER_LEN guarantees 8 bytes"),
    );
    let total_ticks = u32::from_le_bytes(
        trailer[8..12]
            .try_into()
            .expect("TRAILER_LEN guarantees 4 bytes"),
    );
    let claimed_digest = u64::from_le_bytes(
        trailer[12..20]
            .try_into()
            .expect("TRAILER_LEN guarantees 8 bytes"),
    );
    ParsedTrailer {
        final_state_hash,
        total_ticks,
        claimed_digest,
    }
}

/// Low 16 bits of a `u32`, expressed as a masked `try_from` so clippy can
/// prove the conversion is lossless. Native replay consumes this low half as
/// the core `InputSnapshot`; browser hosts may use high bits for record-local
/// intent pulses that are ignored here.
fn low_u16(value: u32) -> u16 {
    u16::try_from(value & u32::from(u16::MAX)).expect("masked u32 fits in u16")
}

fn digest_of_header_and_body(buffer_so_far: &[u8]) -> u64 {
    // At this point `buffer_so_far` contains header + body + final_state_hash
    // + total_ticks. The digest covers everything except itself, so tampering
    // with the trailer numbers is detected too.
    let mut hasher = Fnv1a64::new();
    hasher.update(buffer_so_far);
    hasher.digest()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writer_then_reader_round_trips_a_short_session() {
        let mut writer = LogWriter::new(WriterConfig {
            seed: 7,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 1_700_000_000_000,
            initial_state_hash: 0xdead_beef_cafe_babe,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        writer.append(2, InputSnapshot::from_axes(1, 1, false));
        writer.append(5, InputSnapshot::idle());
        let bytes = writer.finish(6, 0x1234_5678_90ab_cdef);

        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        assert_eq!(log.seed, 7);
        assert_eq!(log.records.len(), 3);
        assert_eq!(log.records[0].tick_index, 0);
        assert_eq!(log.records[2].input, InputSnapshot::idle());
        assert_eq!(log.total_ticks, 6);
        assert_eq!(log.final_state_hash, 0x1234_5678_90ab_cdef);
    }

    #[test]
    fn decode_rejects_truncated_buffer() {
        let result = Log::decode(&[0u8; 4], crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::Truncated));
    }

    #[test]
    fn decode_rejects_bad_magic() {
        let mut bytes = sample_log_bytes();
        bytes[0] = b'X';
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::BadMagic));
    }

    #[test]
    fn decode_rejects_core_api_mismatch() {
        let bytes = sample_log_bytes();
        let bogus_running = crate::CORE_API_VERSION.wrapping_add(999);
        let result = Log::decode(&bytes, bogus_running);
        assert!(matches!(
            result,
            Err(LogError::CoreApiVersionMismatch { log, running })
                if log == crate::CORE_API_VERSION && running == bogus_running
        ));
    }

    #[test]
    fn decode_rejects_unsupported_format_version() {
        let mut bytes = sample_log_bytes();
        // Overwrite format_version field (bytes 4..6) with an unknown version.
        let unknown: u16 = 999;
        bytes[4..6].copy_from_slice(&unknown.to_le_bytes());
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::UnsupportedFormatVersion(999)));
    }

    #[test]
    fn decode_rejects_non_aligned_body() {
        // Insert one padding byte into the body region (after the header, before
        // the trailer). parse_body is called before the digest check in decode(),
        // so the non-aligned body triggers Truncated before the digest fires.
        let mut bytes = sample_log_bytes();
        bytes.insert(HEADER_LEN, 0xFF);
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert_eq!(result, Err(LogError::Truncated));
    }

    #[test]
    fn decode_rejects_digest_tamper() {
        let mut bytes = sample_log_bytes();
        // Flip a body bit; digest must catch it.
        bytes[HEADER_LEN] ^= 1;
        let result = Log::decode(&bytes, crate::CORE_API_VERSION);
        assert!(matches!(result, Err(LogError::DigestMismatch { .. })));
    }

    #[test]
    fn decode_masks_browser_intent_high_bits_from_core_input() {
        let mut writer = LogWriter::new(WriterConfig {
            seed: 1,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 1,
            initial_state_hash: 0,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        let mut bytes = writer.finish(1, 0);

        // Body layout: tick_index u32, then input_packed u32. Set bit 16 in
        // input_packed to simulate the TypeScript host's record-local
        // interact-edge pulse, then refresh the trailer digest so decode() can
        // reach parse_body.
        let input_packed_offset = HEADER_LEN + 4;
        bytes[input_packed_offset + 2] |= 0x01;
        let digest_offset = bytes.len() - 8;
        let digest = digest_of_header_and_body(&bytes[..digest_offset]);
        bytes[digest_offset..].copy_from_slice(&digest.to_le_bytes());

        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        assert_eq!(log.records[0].input, InputSnapshot::from_axes(1, 0, false));
    }

    fn sample_log_bytes() -> Vec<u8> {
        let mut writer = LogWriter::new(WriterConfig {
            seed: 1,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 1,
            initial_state_hash: 0,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        writer.finish(1, 0)
    }
}

#[cfg(test)]
mod prop_tests {
    use super::*;
    use proptest::prelude::*;

    proptest::proptest! {
        /// Any log that can be written round-trips through decode with the
        /// same seed, record count, total_ticks, and final_state_hash.
        #[test]
        fn log_encode_decode_round_trips_for_any_session(
            seed in any::<u64>(),
            final_state_hash in any::<u64>(),
            // btree_map gives sorted, deduplicated tick_indexes.
            records in proptest::collection::btree_map(
                0u32..200u32,
                ((-1i8..=1i8), (-1i8..=1i8), any::<bool>()),
                0..8usize
            )
        ) {
            let total_ticks = 200u32;
            let mut writer = LogWriter::new(WriterConfig {
                seed,
                core_api_version: crate::CORE_API_VERSION,
                started_at_utc_ms: 0,
                initial_state_hash: 0,
            });

            for (&tick_idx, &(x, y, interact)) in &records {
                writer.append(tick_idx, InputSnapshot::from_axes(x, y, interact));
            }
            let bytes = writer.finish(total_ticks, final_state_hash);

            let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
            prop_assert_eq!(log.seed, seed);
            prop_assert_eq!(log.records.len(), records.len());
            prop_assert_eq!(log.total_ticks, total_ticks);
            prop_assert_eq!(log.final_state_hash, final_state_hash);

            for (i, (&tick_idx, &(x, y, interact))) in records.iter().enumerate() {
                let rec = &log.records[i];
                prop_assert_eq!(rec.tick_index, tick_idx);
                prop_assert_eq!(rec.input.x(), x.signum());
                prop_assert_eq!(rec.input.y(), y.signum());
                prop_assert_eq!(rec.input.interact(), interact);
            }
        }
    }
}
