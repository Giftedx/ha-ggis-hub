//! Init-only room descriptor. Built once at handle creation and read by the
//! TypeScript host into a static lookup table. Hand-formatted JSON keeps the
//! crate dependency-free.

use core::fmt::Write as _;

use hub_core::sim::{DoorSlot, MAX_DOORS_PER_SNAPSHOT, RenderSnapshot};

/// Build the room descriptor JSON for the given snapshot. Output is stable
/// across calls for an identical snapshot.
#[must_use]
pub fn render(snapshot: &RenderSnapshot) -> String {
    let mut out = String::with_capacity(512);
    out.push_str("{\"worldWidth\":");
    write_i32(&mut out, snapshot.world_width);
    out.push_str(",\"worldHeight\":");
    write_i32(&mut out, snapshot.world_height);
    out.push_str(",\"doors\":[");
    for i in 0..usize::from(snapshot.door_count).min(MAX_DOORS_PER_SNAPSHOT) {
        if i > 0 {
            out.push(',');
        }
        write_door(&mut out, &snapshot.doors[i]);
    }
    out.push_str("]}");
    out
}

fn write_door(out: &mut String, door: &DoorSlot) {
    out.push_str("{\"id\":\"");
    let nul = door
        .id
        .iter()
        .position(|&b| b == 0)
        .unwrap_or(door.id.len());
    let id = core::str::from_utf8(&door.id[..nul]).unwrap_or("");
    debug_assert!(
        id.bytes()
            .all(|b| b.is_ascii() && b != b'"' && b != b'\\' && b >= 0x20),
        "door id must be printable ASCII without JSON special characters"
    );
    out.push_str(id);
    out.push_str("\",\"boundsMinX\":");
    write_i32(out, door.bounds_min_x);
    out.push_str(",\"boundsMinY\":");
    write_i32(out, door.bounds_min_y);
    out.push_str(",\"boundsMaxX\":");
    write_i32(out, door.bounds_max_x);
    out.push_str(",\"boundsMaxY\":");
    write_i32(out, door.bounds_max_y);
    out.push_str(",\"status\":");
    write_i32(out, i32::from(door.status));
    out.push('}');
}

fn write_i32(out: &mut String, value: i32) {
    let _ = write!(out, "{value}");
}

#[cfg(test)]
mod tests {
    use super::*;
    use hub_core::sim::Sim;

    #[test]
    fn descriptor_contains_world_dimensions_and_both_doors() {
        let snapshot = Sim::new(0).render_snapshot();
        let json = render(&snapshot);
        assert!(json.contains("\"worldWidth\":1000"));
        assert!(json.contains("\"worldHeight\":1000"));
        assert!(json.contains("\"id\":\"wild-haggis-survivors\""));
        assert!(json.contains("\"id\":\"just-five-more-minutes\""));
        assert!(json.contains("\"id\":\"future-bothy\""));
        assert!(json.contains("\"status\":1")); // launchable
        assert!(json.contains("\"status\":2")); // locked
    }

    #[test]
    fn descriptor_is_stable_across_calls() {
        let snapshot = Sim::new(0).render_snapshot();
        assert_eq!(render(&snapshot), render(&snapshot));
    }
}
