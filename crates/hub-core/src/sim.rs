//! Deterministic hub simulation. Owns the RNG. Exposes a flat
//! `RenderSnapshot` so the WASM boundary can copy a fixed-shape buffer
//! per tick with zero allocations.
//!
//! Bit layout of `InputSnapshot`:
//!
//! | bits   | field        | values                            |
//! |--------|--------------|-----------------------------------|
//! | 0..=1  | x axis       | 0 = none, 1 = +, 2 = -, 3 = reserved |
//! | 2..=3  | y axis       | 0 = none, 1 = +, 2 = -, 3 = reserved |
//! | 4      | interact     | 0 / 1                             |
//! | 5..=15 | reserved     | must be zero                      |

/// Tick-aligned packed input. Construct via `InputSnapshot::idle()` or
/// `InputSnapshot::from_axes(...)` — never by hand-packing bits, so the
/// representation can evolve behind a stable constructor.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct InputSnapshot(u16);

impl InputSnapshot {
    const X_MASK: u16 = 0b0000_0000_0000_0011;
    const Y_MASK: u16 = 0b0000_0000_0000_1100;
    const INTERACT_MASK: u16 = 0b0000_0000_0001_0000;

    /// All-zero input — no movement, no interaction. The replay engine fills
    /// frames omitted from the log with the previously-held input; `idle()`
    /// is also the initial value at tick zero.
    #[must_use]
    pub const fn idle() -> Self {
        Self(0)
    }

    /// Pack two signed axes (-1, 0, 1) and an interact flag into the snapshot.
    /// Values outside that range are clamped.
    #[must_use]
    pub fn from_axes(x: i8, y: i8, interact: bool) -> Self {
        let xb: u16 = match x.signum() {
            1 => 0b01,
            -1 => 0b10,
            _ => 0b00,
        };
        let yb: u16 = match y.signum() {
            1 => 0b01,
            -1 => 0b10,
            _ => 0b00,
        };
        let mut bits: u16 = xb | (yb << 2);
        if interact {
            bits |= Self::INTERACT_MASK;
        }
        Self(bits)
    }

    /// Raw packed representation, useful at the WASM boundary.
    #[must_use]
    pub const fn raw(self) -> u16 {
        self.0
    }

    /// Build from a raw packed value. Reserved bits are masked off; an input
    /// with the reserved-bit pattern is treated as if those bits were zero.
    #[must_use]
    pub const fn from_raw(raw: u16) -> Self {
        Self(raw & (Self::X_MASK | Self::Y_MASK | Self::INTERACT_MASK))
    }

    /// X axis as -1 / 0 / 1.
    #[must_use]
    pub const fn x(self) -> i8 {
        match self.0 & Self::X_MASK {
            0b01 => 1,
            0b10 => -1,
            _ => 0,
        }
    }

    /// Y axis as -1 / 0 / 1.
    #[must_use]
    pub const fn y(self) -> i8 {
        match (self.0 & Self::Y_MASK) >> 2 {
            0b01 => 1,
            0b10 => -1,
            _ => 0,
        }
    }

    /// True when the interact bit is set.
    #[must_use]
    pub const fn interact(self) -> bool {
        (self.0 & Self::INTERACT_MASK) != 0
    }
}

/// Maximum number of doors that can appear in a single `RenderSnapshot`.
/// The first room ships with two; the cap is conservative for the kernel
/// slice and can be raised behind an API-version bump later.
pub const MAX_DOORS_PER_SNAPSHOT: usize = 8;

/// Identifier capacity. Door ids are stable kebab-case strings under this cap.
pub const DOOR_ID_CAPACITY: usize = 32;

/// Interaction kind as a stable `u8` for the WASM boundary.
#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InteractionKind {
    /// No door is currently reachable.
    None = 0,
    /// Player overlaps a launchable door.
    Launchable = 1,
    /// Player overlaps a locked/future door.
    Locked = 2,
}

/// Door state inside the flat snapshot.
#[repr(C)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DoorSlot {
    /// Door id, zero-padded ASCII. Use `DoorSlot::id_str()` to read.
    pub id: [u8; DOOR_ID_CAPACITY],
    /// Minimum x of the door's axis-aligned bounding box, fixed world units.
    pub bounds_min_x: i32,
    /// Minimum y of the door's axis-aligned bounding box, fixed world units.
    pub bounds_min_y: i32,
    /// Maximum x of the door's axis-aligned bounding box, fixed world units.
    pub bounds_max_x: i32,
    /// Maximum y of the door's axis-aligned bounding box, fixed world units.
    pub bounds_max_y: i32,
    /// 1 if the door is launchable, 0 if locked. Matches `InteractionKind`.
    pub status: u8,
    /// Reserved padding so the slot lays out on a 4-byte boundary across targets.
    pub padding: [u8; 3],
}

impl DoorSlot {
    /// Read the door id as a string slice up to the first NUL byte.
    #[must_use]
    pub fn id_str(&self) -> &str {
        let end = self
            .id
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(self.id.len());
        core::str::from_utf8(&self.id[..end]).unwrap_or("")
    }
}

/// Flat plain-old-data render snapshot. Zero allocations, `#[repr(C)]`, copied
/// across the WASM boundary into a `Uint32Array` view on the TS side.
#[repr(C)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RenderSnapshot {
    /// Player center x in fixed world units.
    pub player_x: i32,
    /// Player center y in fixed world units.
    pub player_y: i32,
    /// Player half-extent used for bounds and door proximity.
    pub player_half_extent: i32,
    /// World width in fixed world units.
    pub world_width: i32,
    /// World height in fixed world units.
    pub world_height: i32,
    /// Current interaction kind, matches `InteractionKind` as a `u8`.
    pub interaction_kind: u8,
    /// Index into `doors` of the active interaction door, or 0 when none.
    pub interaction_door_index: u8,
    /// Reserved padding so `door_count` lands on a 4-byte boundary across targets.
    pub interaction_padding: [u8; 2],
    /// Number of populated entries in `doors`, always `<= MAX_DOORS_PER_SNAPSHOT`.
    pub door_count: u8,
    /// Reserved padding so `doors` lays out on a 4-byte boundary across targets.
    pub door_table_padding: [u8; 3],
    /// Fixed-capacity door table. Only the first `door_count` entries are valid.
    pub doors: [DoorSlot; MAX_DOORS_PER_SNAPSHOT],
}

impl RenderSnapshot {
    /// All-zero snapshot, used as the buffer the boundary writes into.
    #[must_use]
    pub const fn zero() -> Self {
        const EMPTY_DOOR: DoorSlot = DoorSlot {
            id: [0; DOOR_ID_CAPACITY],
            bounds_min_x: 0,
            bounds_min_y: 0,
            bounds_max_x: 0,
            bounds_max_y: 0,
            status: 0,
            padding: [0; 3],
        };
        Self {
            player_x: 0,
            player_y: 0,
            player_half_extent: 0,
            world_width: 0,
            world_height: 0,
            interaction_kind: 0,
            interaction_door_index: 0,
            interaction_padding: [0; 2],
            door_count: 0,
            door_table_padding: [0; 3],
            doors: [EMPTY_DOOR; MAX_DOORS_PER_SNAPSHOT],
        }
    }
}

use crate::rng::Rng;

const WORLD_W: i32 = 1_000;
const WORLD_H: i32 = 1_000;
const PLAYER_HALF: i32 = 80;
const PLAYER_SPEED_PER_TICK: i32 = 100;
const DIAGONAL_SCALE_PER_MILLE: i32 = 707;

/// First-room door layout. Kept identical to the current
/// `crates/hub-wasm/src/lib.rs::create_demo_world` so visible behaviour is
/// preserved while the kernel is rebuilt underneath.
const FIRST_ROOM_DOORS: &[(&str, i32, i32, i32, i32, bool)] = &[
    ("wild-haggis-survivors", 820, 420, 940, 580, true),
    ("future-bothy", 80, 420, 200, 580, false),
];

/// Deterministic hub simulation.
#[derive(Clone, Debug)]
pub struct Sim {
    player_x: i32,
    player_y: i32,
    rng: Rng,
}

impl Sim {
    /// Construct a new simulation seeded with `seed`. State at tick zero is
    /// fully determined by `seed`.
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self {
            player_x: 500,
            player_y: 500,
            rng: Rng::seed(seed),
        }
    }

    /// Copy the current sim state into a fresh `RenderSnapshot`.
    #[must_use]
    pub fn render_snapshot(&self) -> RenderSnapshot {
        let mut snapshot = RenderSnapshot::zero();
        snapshot.world_width = WORLD_W;
        snapshot.world_height = WORLD_H;
        snapshot.player_x = self.player_x;
        snapshot.player_y = self.player_y;
        snapshot.player_half_extent = PLAYER_HALF;
        snapshot.door_count = door_index_to_u8(FIRST_ROOM_DOORS.len());
        for (i, &(id, min_x, min_y, max_x, max_y, launchable)) in
            FIRST_ROOM_DOORS.iter().enumerate()
        {
            let slot = &mut snapshot.doors[i];
            for (byte, source) in slot.id.iter_mut().zip(id.bytes()) {
                *byte = source;
            }
            slot.bounds_min_x = min_x;
            slot.bounds_min_y = min_y;
            slot.bounds_max_x = max_x;
            slot.bounds_max_y = max_y;
            slot.status = if launchable {
                InteractionKind::Launchable as u8
            } else {
                InteractionKind::Locked as u8
            };
        }
        snapshot.interaction_kind = self.compute_interaction_kind();
        snapshot.interaction_door_index = self.compute_interaction_door_index();
        snapshot
    }

    fn compute_interaction_kind(&self) -> u8 {
        match self.interaction_index() {
            Some(idx) => {
                if FIRST_ROOM_DOORS[idx].5 {
                    InteractionKind::Launchable as u8
                } else {
                    InteractionKind::Locked as u8
                }
            }
            None => InteractionKind::None as u8,
        }
    }

    fn compute_interaction_door_index(&self) -> u8 {
        self.interaction_index().map_or(0, door_index_to_u8)
    }

    fn interaction_index(&self) -> Option<usize> {
        let p_min_x = self.player_x.saturating_sub(PLAYER_HALF);
        let p_min_y = self.player_y.saturating_sub(PLAYER_HALF);
        let p_max_x = self.player_x.saturating_add(PLAYER_HALF);
        let p_max_y = self.player_y.saturating_add(PLAYER_HALF);
        FIRST_ROOM_DOORS
            .iter()
            .position(|&(_, min_x, min_y, max_x, max_y, _)| {
                p_min_x <= max_x && p_max_x >= min_x && p_min_y <= max_y && p_max_y >= min_y
            })
    }

    /// Advance the simulation by one fixed tick using the packed input.
    /// Returns a fresh `RenderSnapshot` reflecting post-tick state.
    pub fn tick(&mut self, input: InputSnapshot) -> RenderSnapshot {
        let x = input.x();
        let y = input.y();
        let diagonal = x != 0 && y != 0;
        let speed = if diagonal {
            scale_per_mille(PLAYER_SPEED_PER_TICK, DIAGONAL_SCALE_PER_MILLE)
        } else {
            PLAYER_SPEED_PER_TICK
        };

        let dx = i32::from(x).saturating_mul(speed);
        let dy = i32::from(y).saturating_mul(speed);

        let min = PLAYER_HALF;
        let max_x = WORLD_W - PLAYER_HALF;
        let max_y = WORLD_H - PLAYER_HALF;

        self.player_x = clamp(self.player_x.saturating_add(dx), min, max_x);
        self.player_y = clamp(self.player_y.saturating_add(dy), min, max_y);

        self.render_snapshot()
    }

    /// Borrow the internal RNG for tests and for future per-tick draws when
    /// gameplay needs them. Pub-crate because RNG state should not be poked
    /// from outside the simulation.
    #[allow(dead_code)]
    pub(crate) fn rng_mut(&mut self) -> &mut Rng {
        &mut self.rng
    }

    /// FNV-1a 64-bit digest over every gameplay-relevant byte. Bytes are
    /// emitted in a fixed canonical order so two `Sim`s with identical state
    /// always produce identical hashes regardless of how they were built.
    #[must_use]
    pub fn state_hash(&self) -> u64 {
        let mut hasher = crate::hash::Fnv1a64::new();
        hasher.update(&self.player_x.to_le_bytes());
        hasher.update(&self.player_y.to_le_bytes());
        hasher.update(&self.rng_state_bytes());
        hasher.digest()
    }

    fn rng_state_bytes(&self) -> [u8; 16] {
        let mut bytes = [0u8; 16];
        let state = self.rng.state();
        bytes[0..4].copy_from_slice(&state[0].to_le_bytes());
        bytes[4..8].copy_from_slice(&state[1].to_le_bytes());
        bytes[8..12].copy_from_slice(&state[2].to_le_bytes());
        bytes[12..16].copy_from_slice(&state[3].to_le_bytes());
        bytes
    }
}

const fn clamp(value: i32, min: i32, max: i32) -> i32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn scale_per_mille(value: i32, scale: i32) -> i32 {
    let scaled = i64::from(value) * i64::from(scale) / 1_000;
    i32::try_from(scaled).unwrap_or(i32::MAX)
}

/// Convert a door table index to the snapshot's `u8` field, saturating to
/// `u8::MAX` when the index exceeds the byte range. Door counts are bounded
/// by `MAX_DOORS_PER_SNAPSHOT` so saturation cannot happen at runtime; the
/// `try_from` form keeps clippy satisfied and documents the invariant.
fn door_index_to_u8(index: usize) -> u8 {
    u8::try_from(index).unwrap_or(u8::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_input_has_no_movement_and_no_interact() {
        let input = InputSnapshot::idle();
        assert_eq!(input.x(), 0);
        assert_eq!(input.y(), 0);
        assert!(!input.interact());
        assert_eq!(input.raw(), 0);
    }

    #[test]
    fn from_axes_round_trips_through_raw() {
        for &x in &[-1i8, 0, 1] {
            for &y in &[-1i8, 0, 1] {
                for &interact in &[false, true] {
                    let original = InputSnapshot::from_axes(x, y, interact);
                    let round_tripped = InputSnapshot::from_raw(original.raw());
                    assert_eq!(round_tripped, original);
                    assert_eq!(round_tripped.x(), x);
                    assert_eq!(round_tripped.y(), y);
                    assert_eq!(round_tripped.interact(), interact);
                }
            }
        }
    }

    #[test]
    fn from_axes_clamps_out_of_range_values() {
        let saturated = InputSnapshot::from_axes(127, -127, true);
        assert_eq!(saturated.x(), 1);
        assert_eq!(saturated.y(), -1);
        assert!(saturated.interact());
    }

    #[test]
    fn from_raw_masks_reserved_bits() {
        let dirty = InputSnapshot::from_raw(0xFFFF);
        assert_eq!(dirty.raw(), 0b0001_1111);
    }

    #[test]
    fn render_snapshot_has_stable_repr_c_layout() {
        // Compile-time guarantee that the snapshot is plain-old-data so the
        // WASM boundary can memcpy it without serialization.
        const _: () = {
            assert!(core::mem::size_of::<RenderSnapshot>() > 0);
        };

        let mut snapshot = RenderSnapshot::zero();
        snapshot.player_x = 500;
        snapshot.player_y = 500;
        snapshot.interaction_kind = InteractionKind::None as u8;
        assert_eq!(snapshot.player_x, 500);
        assert_eq!(snapshot.player_y, 500);
    }

    #[test]
    fn render_snapshot_carries_first_room_doors() {
        let snapshot = RenderSnapshot::zero();
        assert_eq!(snapshot.doors.len(), MAX_DOORS_PER_SNAPSHOT);
        assert_eq!(snapshot.door_count, 0);
    }

    #[test]
    fn sim_seed_zero_constructs_first_room() {
        let sim = Sim::new(0);
        let snapshot = sim.render_snapshot();
        assert_eq!(snapshot.world_width, 1_000);
        assert_eq!(snapshot.world_height, 1_000);
        assert_eq!(snapshot.player_x, 500);
        assert_eq!(snapshot.player_y, 500);
        assert_eq!(snapshot.door_count, 2);
        assert_eq!(snapshot.doors[0].id_str(), "wild-haggis-survivors");
        assert_eq!(snapshot.doors[1].id_str(), "future-bothy");
    }

    #[test]
    fn tick_cardinal_movement_advances_one_fixed_unit() {
        let mut sim = Sim::new(0);
        let snapshot = sim.tick(InputSnapshot::from_axes(1, 0, false));
        assert_eq!(snapshot.player_x, 600);
        assert_eq!(snapshot.player_y, 500);
    }

    #[test]
    fn tick_diagonal_movement_is_normalised() {
        let mut sim = Sim::new(0);
        let snapshot = sim.tick(InputSnapshot::from_axes(1, -1, false));
        assert_eq!(snapshot.player_x, 570);
        assert_eq!(snapshot.player_y, 430);
    }

    #[test]
    fn tick_clamps_player_inside_world_bounds() {
        let mut sim = Sim::new(0);
        // Walk hard left for enough ticks to hit the wall.
        for _ in 0..20 {
            sim.tick(InputSnapshot::from_axes(-1, 0, false));
        }
        let snapshot = sim.render_snapshot();
        assert_eq!(snapshot.player_x, PLAYER_HALF);
    }

    #[test]
    fn state_hash_changes_after_tick_with_input() {
        let mut sim = Sim::new(0);
        let hash_before = sim.state_hash();
        sim.tick(InputSnapshot::from_axes(1, 0, false));
        let hash_after = sim.state_hash();
        assert_ne!(hash_before, hash_after);
    }

    #[test]
    fn state_hash_stable_across_identical_seed_and_history() {
        let mut a = Sim::new(42);
        let mut b = Sim::new(42);
        let inputs = [
            InputSnapshot::from_axes(1, 0, false),
            InputSnapshot::from_axes(1, 1, false),
            InputSnapshot::idle(),
            InputSnapshot::from_axes(0, -1, true),
        ];
        for &input in &inputs {
            a.tick(input);
            b.tick(input);
        }
        assert_eq!(a.state_hash(), b.state_hash());
    }
}
