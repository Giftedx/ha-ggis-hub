//! Replay engine. Reconstructs `Sim` from a log seed and feeds each tick's
//! input, filling unrecorded frames with the previously-held input. Asserts
//! that the final `state_hash` matches the log's trailer.

use crate::log::{Log, LogError};
use crate::sim::{InputSnapshot, Sim};

/// Errors produced by `replay::run`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReplayError {
    /// The log's trailer disagrees with the replayed final state hash.
    Divergence {
        /// Tick index at which the divergence was observed (currently always
        /// `total_ticks` since the check is done once after the final tick).
        at_tick: u32,
        /// Final state hash recorded in the log trailer.
        expected: u64,
        /// Final state hash produced by the replayed simulation.
        actual: u64,
    },
    /// A log record points at a tick already past the declared `total_ticks`.
    RecordPastEnd {
        /// Tick index carried by the offending record.
        record_tick: u32,
        /// Declared total tick count from the log trailer.
        total_ticks: u32,
    },
    /// Log decoding itself failed.
    InvalidLog(LogError),
}

impl From<LogError> for ReplayError {
    fn from(err: LogError) -> Self {
        Self::InvalidLog(err)
    }
}

/// Result of a successful replay.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ReplayOutcome {
    /// Final state hash produced by the replayed simulation; equal to the
    /// trailer's `final_state_hash` when this outcome is returned.
    pub final_state_hash: u64,
    /// Total number of ticks the replay advanced.
    pub ticks: u32,
}

/// Replay `log` and confirm the trailer hash matches.
///
/// # Errors
///
/// Returns [`ReplayError::Divergence`] when the replayed final state hash
/// does not match the log trailer, or [`ReplayError::RecordPastEnd`] when a
/// log record references a tick at or beyond `total_ticks`.
pub fn run(log: &Log) -> Result<ReplayOutcome, ReplayError> {
    let mut sim = Sim::new(log.seed);
    let mut held_input = InputSnapshot::idle();
    let mut record_iter = log.records.iter().peekable();

    for tick_index in 0..log.total_ticks {
        if let Some(record) = record_iter.peek() {
            if record.tick_index == tick_index {
                held_input = record.input;
                record_iter.next();
            } else if record.tick_index < tick_index {
                return Err(ReplayError::RecordPastEnd {
                    record_tick: record.tick_index,
                    total_ticks: log.total_ticks,
                });
            }
        }
        sim.tick(held_input);
    }

    if let Some(record) = record_iter.next() {
        return Err(ReplayError::RecordPastEnd {
            record_tick: record.tick_index,
            total_ticks: log.total_ticks,
        });
    }

    let actual = sim.state_hash();
    if actual != log.final_state_hash {
        return Err(ReplayError::Divergence {
            at_tick: log.total_ticks,
            expected: log.final_state_hash,
            actual,
        });
    }

    Ok(ReplayOutcome {
        final_state_hash: actual,
        ticks: log.total_ticks,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::log::{LogWriter, WriterConfig};

    #[test]
    fn captured_session_replays_to_identical_state_hash() {
        // Record a tiny session by driving a Sim manually.
        let seed = 99;
        let mut sim = Sim::new(seed);
        let initial_state_hash = sim.state_hash();

        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });

        let scripted = [
            (0u32, InputSnapshot::from_axes(1, 0, false)),
            (5u32, InputSnapshot::from_axes(1, 1, false)),
            (12u32, InputSnapshot::idle()),
        ];
        let total_ticks = 20u32;
        let mut held = InputSnapshot::idle();
        let mut iter = scripted.iter().peekable();
        for tick in 0..total_ticks {
            if let Some(&&(record_tick, record_input)) = iter.peek()
                && record_tick == tick
            {
                writer.append(record_tick, record_input);
                held = record_input;
                iter.next();
            }
            sim.tick(held);
        }

        let final_state_hash = sim.state_hash();
        let bytes = writer.finish(total_ticks, final_state_hash);

        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let outcome = run(&log).expect("replay succeeds");
        assert_eq!(outcome.final_state_hash, final_state_hash);
        assert_eq!(outcome.ticks, total_ticks);
    }

    #[test]
    fn divergent_trailer_hash_is_reported() {
        let seed = 0;
        let initial_state_hash = Sim::new(seed).state_hash();
        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });
        writer.append(0, InputSnapshot::from_axes(1, 0, false));
        // Deliberately wrong final hash.
        let bytes = writer.finish(3, 0xdead_dead_dead_dead);
        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let err = run(&log).expect_err("must diverge");
        assert!(matches!(
            err,
            ReplayError::Divergence {
                expected: 0xdead_dead_dead_dead,
                ..
            }
        ));
    }
}
