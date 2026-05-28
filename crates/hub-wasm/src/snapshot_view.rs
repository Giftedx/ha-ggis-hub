//! Maps `hub_core::sim::RenderSnapshot` into a flat little-endian byte
//! buffer that the TypeScript host reads as a `Uint32Array` view into
//! linear memory. The layout is documented here and mirrored in the TS
//! decoder at `src/wasm/snapshot-codec.ts`.

use hub_core::sim::{DOOR_ID_CAPACITY, DoorSlot, MAX_DOORS_PER_SNAPSHOT, RenderSnapshot};

/// Total snapshot byte length: 8 header i32s + `MAX_DOORS_PER_SNAPSHOT` door slots.
/// One door slot = `DOOR_ID_CAPACITY` id bytes + 4 i32 bounds + 1 status u8 + 3 pad.
pub const SNAPSHOT_BYTES: usize = 8 * 4 + MAX_DOORS_PER_SNAPSHOT * (DOOR_ID_CAPACITY + 4 * 4 + 4);

/// Header word offsets within the snapshot buffer.
pub mod header {
    /// `player_x` (i32 little-endian)
    pub const PLAYER_X: usize = 0;
    /// `player_y`
    pub const PLAYER_Y: usize = 4;
    /// `player_half_extent`
    pub const PLAYER_HALF: usize = 8;
    /// `world_width`
    pub const WORLD_W: usize = 12;
    /// `world_height`
    pub const WORLD_H: usize = 16;
    /// `interaction_kind` (u8 packed into low byte of an i32 word)
    pub const INTERACTION_KIND: usize = 20;
    /// `interaction_door_index`
    pub const INTERACTION_DOOR_INDEX: usize = 24;
    /// `door_count`
    pub const DOOR_COUNT: usize = 28;
    /// First byte of the door table.
    pub const DOOR_TABLE_START: usize = 32;
}

/// Per-door slot length within the door table.
pub const DOOR_SLOT_LEN: usize = DOOR_ID_CAPACITY + 4 * 4 + 4;

/// Write a `RenderSnapshot` into the caller-provided byte buffer.
///
/// # Panics
///
/// Panics if `buffer.len() != SNAPSHOT_BYTES`.
pub fn write_snapshot(buffer: &mut [u8], snapshot: &RenderSnapshot) {
    assert_eq!(
        buffer.len(),
        SNAPSHOT_BYTES,
        "snapshot buffer must be {SNAPSHOT_BYTES} bytes"
    );

    buffer[header::PLAYER_X..][..4].copy_from_slice(&snapshot.player_x.to_le_bytes());
    buffer[header::PLAYER_Y..][..4].copy_from_slice(&snapshot.player_y.to_le_bytes());
    buffer[header::PLAYER_HALF..][..4].copy_from_slice(&snapshot.player_half_extent.to_le_bytes());
    buffer[header::WORLD_W..][..4].copy_from_slice(&snapshot.world_width.to_le_bytes());
    buffer[header::WORLD_H..][..4].copy_from_slice(&snapshot.world_height.to_le_bytes());
    buffer[header::INTERACTION_KIND..][..4]
        .copy_from_slice(&i32::from(snapshot.interaction_kind).to_le_bytes());
    buffer[header::INTERACTION_DOOR_INDEX..][..4]
        .copy_from_slice(&i32::from(snapshot.interaction_door_index).to_le_bytes());
    buffer[header::DOOR_COUNT..][..4]
        .copy_from_slice(&i32::from(snapshot.door_count).to_le_bytes());

    let count = usize::from(snapshot.door_count).min(MAX_DOORS_PER_SNAPSHOT);
    for (i, door) in snapshot.doors[..count].iter().enumerate() {
        let base = header::DOOR_TABLE_START + i * DOOR_SLOT_LEN;
        write_door(&mut buffer[base..base + DOOR_SLOT_LEN], door);
    }
}

fn write_door(buffer: &mut [u8], door: &DoorSlot) {
    buffer[..DOOR_ID_CAPACITY].copy_from_slice(&door.id);
    let mut offset = DOOR_ID_CAPACITY;
    for field in [
        door.bounds_min_x,
        door.bounds_min_y,
        door.bounds_max_x,
        door.bounds_max_y,
    ] {
        buffer[offset..offset + 4].copy_from_slice(&field.to_le_bytes());
        offset += 4;
    }
    buffer[offset..offset + 4].copy_from_slice(&i32::from(door.status).to_le_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;
    use hub_core::sim::Sim;

    #[test]
    fn snapshot_buffer_length_is_constant() {
        // Pin the exact byte count so any struct or formula change breaks loudly.
        const _: () = assert!(SNAPSHOT_BYTES == 448); // 8 header words + 8 × 52-byte door slots
        let mut buffer = vec![0u8; SNAPSHOT_BYTES];
        let snapshot = Sim::new(0).render_snapshot();
        write_snapshot(&mut buffer, &snapshot);
        assert_eq!(buffer.len(), SNAPSHOT_BYTES);
    }

    #[test]
    fn header_fields_round_trip() {
        let mut buffer = vec![0u8; SNAPSHOT_BYTES];
        let snapshot = Sim::new(0).render_snapshot();
        write_snapshot(&mut buffer, &snapshot);

        let read_i32 =
            |offset: usize| i32::from_le_bytes(buffer[offset..offset + 4].try_into().unwrap());
        assert_eq!(read_i32(header::PLAYER_X), 340);
        assert_eq!(read_i32(header::PLAYER_Y), 540);
        assert_eq!(read_i32(header::WORLD_W), 1_000);
        assert_eq!(read_i32(header::WORLD_H), 1_000);
        assert_eq!(read_i32(header::DOOR_COUNT), 2);
    }

    #[test]
    fn first_door_id_is_wild_haggis_survivors() {
        let mut buffer = vec![0u8; SNAPSHOT_BYTES];
        let snapshot = Sim::new(0).render_snapshot();
        write_snapshot(&mut buffer, &snapshot);

        let id_bytes = &buffer[header::DOOR_TABLE_START..][..DOOR_ID_CAPACITY];
        let nul = id_bytes
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(id_bytes.len());
        assert_eq!(
            std::str::from_utf8(&id_bytes[..nul]).unwrap(),
            "wild-haggis-survivors"
        );
    }
}
