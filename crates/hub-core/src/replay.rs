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
    /// A log record carries a `tick_index` that has already been passed by the
    /// replay cursor — records must appear in strictly ascending tick order.
    RecordOutOfOrder {
        /// Tick index carried by the offending record.
        record_tick: u32,
        /// Current replay cursor when the bad record was encountered.
        current_tick: u32,
    },
    /// A log record points at a tick at or beyond the declared `total_ticks`
    /// — i.e., the body extends past the end of the declared session.
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
/// Returns:
/// - [`ReplayError::Divergence`] when the replayed final state hash does not
///   match the log trailer.
/// - [`ReplayError::RecordOutOfOrder`] when a record's `tick_index` is less
///   than the current replay cursor (records must be strictly ascending).
/// - [`ReplayError::RecordPastEnd`] when a record references a tick at or
///   beyond `total_ticks`.
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
                return Err(ReplayError::RecordOutOfOrder {
                    record_tick: record.tick_index,
                    current_tick: tick_index,
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
    use crate::sim::Sim;

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

    #[test]
    fn out_of_order_record_is_reported() {
        let seed = 0;
        let initial_state_hash = Sim::new(seed).state_hash();
        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });
        // Append in the wrong order — second record's tick_index sits behind
        // the cursor that the first record will have advanced.
        writer.append(5, InputSnapshot::from_axes(1, 0, false));
        writer.append(3, InputSnapshot::idle());
        let bytes = writer.finish(10, 0);
        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let err = run(&log).expect_err("must reject out-of-order record");
        assert!(matches!(
            err,
            ReplayError::RecordOutOfOrder {
                record_tick: 3,
                current_tick: 6,
            }
        ));
    }

    #[test]
    fn record_past_declared_end_is_reported() {
        let seed = 0;
        let initial_state_hash = Sim::new(seed).state_hash();
        let mut writer = LogWriter::new(WriterConfig {
            seed,
            core_api_version: crate::CORE_API_VERSION,
            started_at_utc_ms: 0,
            initial_state_hash,
        });
        // Record sits at tick 100 but session declares only 5 ticks total.
        writer.append(100, InputSnapshot::from_axes(1, 0, false));
        let bytes = writer.finish(5, 0);
        let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
        let err = run(&log).expect_err("must reject record past declared end");
        assert!(matches!(
            err,
            ReplayError::RecordPastEnd {
                record_tick: 100,
                total_ticks: 5,
            }
        ));
    }
}

#[cfg(test)]
mod prop_tests {
    use super::*;
    use crate::log::{LogWriter, WriterConfig};
    use crate::sim::Sim;
    use proptest::prelude::*;

    proptest::proptest! {
        /// Replay always produces the same final state hash as direct execution,
        /// for any seed and any set of input changes within a 100-tick session.
        #[test]
        fn replay_matches_direct_execution_for_any_session(
            seed in any::<u64>(),
            // btree_map gives sorted, deduplicated tick_indexes — valid log order.
            changes in proptest::collection::btree_map(
                0u32..100u32,
                ((-1i8..=1i8), (-1i8..=1i8), any::<bool>()),
                0..10usize
            )
        ) {
            let total_ticks = 100u32;
            let initial_state_hash = Sim::new(seed).state_hash();

            let mut writer = LogWriter::new(WriterConfig {
                seed,
                core_api_version: crate::CORE_API_VERSION,
                started_at_utc_ms: 0,
                initial_state_hash,
            });

            let mut sim = Sim::new(seed);
            let mut held = InputSnapshot::idle();
            let mut changes_iter = changes.iter().peekable();

            for tick in 0..total_ticks {
                if let Some((tick_idx, (x, y, interact))) = changes_iter.peek()
                    && **tick_idx == tick
                {
                    let input = InputSnapshot::from_axes(*x, *y, *interact);
                    writer.append(tick, input);
                    held = input;
                    changes_iter.next();
                }
                sim.tick(held);
            }

            let final_hash = sim.state_hash();
            let bytes = writer.finish(total_ticks, final_hash);
            let log = Log::decode(&bytes, crate::CORE_API_VERSION).expect("decode");
            let outcome = run(&log).expect("replay");
            prop_assert_eq!(outcome.final_state_hash, final_hash);
            prop_assert_eq!(outcome.ticks, total_ticks);
        }
    }
}
