//! End-to-end check that a recorded log round-trips through encode -> decode ->
//! replay -> identical final state hash, using only the crate's public surface.

use hub_core::CORE_API_VERSION;
use hub_core::log::{Log, LogWriter, WriterConfig};
use hub_core::replay::{self, ReplayError};
use hub_core::sim::{InputSnapshot, Sim};

#[test]
fn public_surface_supports_full_record_and_replay_cycle() {
    let seed = 0x1234_5678_9abc_def0;
    let mut sim = Sim::new(seed);
    let mut writer = LogWriter::new(WriterConfig {
        seed,
        core_api_version: CORE_API_VERSION,
        started_at_utc_ms: 0,
        initial_state_hash: sim.state_hash(),
    });

    let mut held = InputSnapshot::idle();
    let inputs = [
        (0u32, InputSnapshot::from_axes(0, 1, false)),
        (4u32, InputSnapshot::from_axes(1, 1, false)),
        (9u32, InputSnapshot::from_axes(0, 0, true)),
        (15u32, InputSnapshot::idle()),
    ];
    let total_ticks = 32u32;
    let mut iter = inputs.iter().peekable();
    for tick in 0..total_ticks {
        if let Some(&&(t, input)) = iter.peek()
            && t == tick
        {
            writer.append(t, input);
            held = input;
            iter.next();
        }
        sim.tick(held);
    }

    let bytes = writer.finish(total_ticks, sim.state_hash());
    let log = Log::decode(&bytes, CORE_API_VERSION).expect("decode succeeds");
    let outcome = replay::run(&log).expect("replay succeeds");
    assert_eq!(outcome.ticks, total_ticks);
    assert_eq!(outcome.final_state_hash, sim.state_hash());
    let _: Result<_, ReplayError> = Ok(outcome); // make the use site obvious
}
