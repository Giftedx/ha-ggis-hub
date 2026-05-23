#![doc = "Deterministic core primitives for ha.ggis Hub."]

pub mod hash;
pub mod rng;

/// Human-readable project name shared across core and host surfaces.
pub const PROJECT_NAME: &str = "ha.ggis Hub";

/// Version of the public `hub-core` API exposed to host boundaries.
pub const CORE_API_VERSION: u32 = 1;

/// Stable identity information for the deterministic hub core.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CoreIdentity {
    /// Human-readable project name.
    pub project_name: &'static str,
    /// Public core API version.
    pub api_version: u32,
}

/// Return identity metadata for diagnostics, host display, and boundary tests.
#[must_use]
pub const fn core_identity() -> CoreIdentity {
    CoreIdentity {
        project_name: PROJECT_NAME,
        api_version: CORE_API_VERSION,
    }
}

/// World-space point in fixed integer units.
///
/// The core intentionally avoids floating point for first-slice movement so
/// native tests, WASM, and future replay all agree on exact positions.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Position {
    /// Horizontal coordinate in fixed world units.
    pub x: i32,
    /// Vertical coordinate in fixed world units.
    pub y: i32,
}

impl Position {
    /// Create a fixed-unit world position.
    #[must_use]
    pub const fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }
}

/// Axis-aligned bounds in fixed world units.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Aabb {
    /// Inclusive minimum corner.
    pub min: Position,
    /// Inclusive maximum corner.
    pub max: Position,
}

impl Aabb {
    /// Create bounds from a minimum corner and non-negative size.
    #[must_use]
    pub const fn from_min_size(min: Position, width: i32, height: i32) -> Self {
        let safe_width = non_negative_i32(width);
        let safe_height = non_negative_i32(height);
        Self {
            min,
            max: Position::new(
                min.x.saturating_add(safe_width),
                min.y.saturating_add(safe_height),
            ),
        }
    }

    /// Return true when two boxes overlap or touch.
    #[must_use]
    pub const fn intersects(self, other: Self) -> bool {
        self.min.x <= other.max.x
            && self.max.x >= other.min.x
            && self.min.y <= other.max.y
            && self.max.y >= other.min.y
    }

    const fn clamp_center(self, position: Position, half_extent: i32) -> Position {
        let min_x = self.min.x.saturating_add(half_extent);
        let max_x = self.max.x.saturating_sub(half_extent);
        let min_y = self.min.y.saturating_add(half_extent);
        let max_y = self.max.y.saturating_sub(half_extent);

        Position::new(
            clamp_i32(position.x, min_x, max_x),
            clamp_i32(position.y, min_y, max_y),
        )
    }
}

/// Tick-aligned directional input.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct InputVector {
    /// Horizontal input, normalized to -1, 0, or 1.
    pub x: i8,
    /// Vertical input, normalized to -1, 0, or 1.
    pub y: i8,
}

impl InputVector {
    /// Create an input vector, clamping each axis to deterministic unit input.
    #[must_use]
    pub const fn new(x: i8, y: i8) -> Self {
        Self {
            x: sign_i8(x),
            y: sign_i8(y),
        }
    }
}

/// Player simulation state owned by the deterministic core.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PlayerState {
    /// Player center position.
    pub position: Position,
    /// Half-size used for bounds and door proximity.
    pub half_extent: i32,
    /// Cardinal movement speed per fixed simulation tick.
    pub speed_per_tick: i32,
}

impl PlayerState {
    /// Create a player state.
    #[must_use]
    pub const fn new(position: Position, half_extent: i32, speed_per_tick: i32) -> Self {
        Self {
            position,
            half_extent: non_negative_i32(half_extent),
            speed_per_tick: non_negative_i32(speed_per_tick),
        }
    }

    /// Return player bounds for collision/proximity checks.
    #[must_use]
    pub const fn bounds(self) -> Aabb {
        Aabb {
            min: Position::new(
                self.position.x.saturating_sub(self.half_extent),
                self.position.y.saturating_sub(self.half_extent),
            ),
            max: Position::new(
                self.position.x.saturating_add(self.half_extent),
                self.position.y.saturating_add(self.half_extent),
            ),
        }
    }
}

/// Hub door definition used by the core interaction layer.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DoorDefinition {
    /// Stable door identifier used by host registries and telemetry.
    pub id: String,
    /// Visitor-facing title.
    pub title: String,
    /// Door bounds in world units.
    pub bounds: Aabb,
    /// Launch URL when the door is active; absent means locked/future.
    pub launch_url: Option<String>,
}

impl DoorDefinition {
    /// Create an active launch door.
    #[must_use]
    pub fn launchable(
        id: impl Into<String>,
        title: impl Into<String>,
        bounds: Aabb,
        launch_url: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            bounds,
            launch_url: Some(launch_url.into()),
        }
    }

    /// Create a locked/future door.
    #[must_use]
    pub fn locked(id: impl Into<String>, title: impl Into<String>, bounds: Aabb) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            bounds,
            launch_url: None,
        }
    }
}

/// Interaction state derived from the player's current tick state.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InteractionResult {
    /// No door is currently reachable.
    None,
    /// Player can launch an active door.
    NearLaunchable {
        /// Stable door identifier.
        id: String,
        /// Visitor-facing door title.
        title: String,
    },
    /// Player is near a locked/future door.
    NearLocked {
        /// Stable door identifier.
        id: String,
        /// Visitor-facing door title.
        title: String,
    },
}

impl InteractionResult {
    /// No interaction available.
    #[must_use]
    pub const fn none() -> Self {
        Self::None
    }

    /// Create an active-door interaction result.
    #[must_use]
    pub fn near_launchable(id: impl Into<String>, title: impl Into<String>) -> Self {
        Self::NearLaunchable {
            id: id.into(),
            title: title.into(),
        }
    }

    /// Create a locked-door interaction result.
    #[must_use]
    pub fn near_locked(id: impl Into<String>, title: impl Into<String>) -> Self {
        Self::NearLocked {
            id: id.into(),
            title: title.into(),
        }
    }
}

/// Minimal deterministic hub world for fixed-tick movement and door proximity.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct World {
    bounds: Aabb,
    doors: Vec<DoorDefinition>,
}

impl World {
    /// Create a world with fixed bounds and ordered door definitions.
    #[must_use]
    pub fn new(bounds: Aabb, doors: Vec<DoorDefinition>) -> Self {
        Self { bounds, doors }
    }

    /// Advance a player by one fixed simulation tick.
    #[must_use]
    pub fn tick_player(&self, player: PlayerState, input: InputVector) -> PlayerState {
        let mut next = player;
        let diagonal = input.x != 0 && input.y != 0;
        let speed = if diagonal {
            // sqrt(1/2), scaled and truncated. Integer truncation is explicit so
            // all targets produce byte-identical movement snapshots.
            scale_i32_per_mille(player.speed_per_tick, 707)
        } else {
            player.speed_per_tick
        };

        let requested = Position::new(
            player
                .position
                .x
                .saturating_add(i32::from(input.x).saturating_mul(speed)),
            player
                .position
                .y
                .saturating_add(i32::from(input.y).saturating_mul(speed)),
        );
        next.position = self.bounds.clamp_center(requested, player.half_extent);
        next
    }

    /// Return the first matching door interaction for a player state.
    ///
    /// Door definition order is the priority order until a later content slice
    /// needs an explicit nearest-door or z-order rule.
    #[must_use]
    pub fn interaction_for(&self, player: PlayerState) -> InteractionResult {
        let player_bounds = player.bounds();
        for door in &self.doors {
            if player_bounds.intersects(door.bounds) {
                return match door.launch_url {
                    Some(_) => InteractionResult::near_launchable(&door.id, &door.title),
                    None => InteractionResult::near_locked(&door.id, &door.title),
                };
            }
        }
        InteractionResult::none()
    }
}

const fn clamp_i32(value: i32, min: i32, max: i32) -> i32 {
    let effective_max = if min > max { min } else { max };
    if value < min {
        min
    } else if value > effective_max {
        effective_max
    } else {
        value
    }
}

const fn non_negative_i32(value: i32) -> i32 {
    if value < 0 { 0 } else { value }
}

fn scale_i32_per_mille(value: i32, scale: i32) -> i32 {
    let scaled = i64::from(value) * i64::from(scale) / 1_000;
    i32::try_from(scaled).unwrap_or(i32::MAX)
}

const fn sign_i8(value: i8) -> i8 {
    if value < 0 {
        -1
    } else if value > 0 {
        1
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::{
        Aabb, CORE_API_VERSION, DoorDefinition, InputVector, InteractionResult, PROJECT_NAME,
        PlayerState, Position, World, core_identity,
    };

    #[test]
    fn identity_reports_project_name() {
        let identity = core_identity();
        assert_eq!(identity.project_name, "ha.ggis Hub");
        assert_eq!(PROJECT_NAME, "ha.ggis Hub");
    }

    #[test]
    fn identity_reports_api_version() {
        let identity = core_identity();
        assert_eq!(identity.api_version, 1);
        assert_eq!(CORE_API_VERSION, 1);
    }

    #[test]
    fn cardinal_movement_advances_one_fixed_tick() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);

        let moved = world.tick_player(player, InputVector::new(1, 0));

        assert_eq!(moved.position, Position::new(600, 500));
    }

    #[test]
    fn diagonal_movement_is_deterministically_normalized() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);

        let moved = world.tick_player(player, InputVector::new(1, -1));

        assert_eq!(moved.position, Position::new(570, 430));
    }

    #[test]
    fn movement_is_clamped_to_world_bounds() {
        let world = test_world();
        let player = PlayerState::new(Position::new(50, 50), 80, 100);

        let moved = world.tick_player(player, InputVector::new(-1, -1));

        assert_eq!(moved.position, Position::new(80, 80));
    }

    #[test]
    fn door_proximity_reports_active_launch_target() {
        let world = test_world();
        let player = PlayerState::new(Position::new(740, 500), 80, 100);

        let interaction = world.interaction_for(player);

        assert_eq!(
            interaction,
            InteractionResult::near_launchable("wild-haggis-survivors", "Wild Haggis Survivors")
        );
    }

    #[test]
    fn door_proximity_reports_locked_future_door_without_launching() {
        let world = test_world();
        let player = PlayerState::new(Position::new(250, 500), 80, 100);

        let interaction = world.interaction_for(player);

        assert_eq!(
            interaction,
            InteractionResult::near_locked("future-bothy", "Future Bothy")
        );
    }

    #[test]
    fn door_proximity_reports_empty_space() {
        let world = test_world();
        let player = PlayerState::new(Position::new(500, 500), 80, 100);

        let interaction = world.interaction_for(player);

        assert_eq!(interaction, InteractionResult::none());
    }

    #[test]
    fn constructors_sanitize_negative_sizes_and_speed() {
        let collapsed = Aabb::from_min_size(Position::new(10, 20), -5, -10);
        assert_eq!(collapsed, Aabb::from_min_size(Position::new(10, 20), 0, 0));

        let player = PlayerState::new(Position::new(100, 100), -80, -100);
        assert_eq!(player.half_extent, 0);
        assert_eq!(player.speed_per_tick, 0);
    }

    #[test]
    fn large_tick_values_saturate_instead_of_overflowing() {
        let world = World::new(
            Aabb::from_min_size(Position::new(0, 0), i32::MAX, i32::MAX),
            Vec::new(),
        );
        let player = PlayerState::new(Position::new(i32::MAX - 10, i32::MAX - 10), 0, i32::MAX);

        let moved = world.tick_player(player, InputVector::new(1, 1));

        assert_eq!(moved.position, Position::new(i32::MAX, i32::MAX));
    }

    fn test_world() -> World {
        World::new(
            Aabb::from_min_size(Position::new(0, 0), 1_000, 1_000),
            vec![
                DoorDefinition::launchable(
                    "wild-haggis-survivors",
                    "Wild Haggis Survivors",
                    Aabb::from_min_size(Position::new(820, 420), 120, 160),
                    "https://ha.ggis.xyz/wild-haggis-survivors/",
                ),
                DoorDefinition::locked(
                    "future-bothy",
                    "Future Bothy",
                    Aabb::from_min_size(Position::new(80, 420), 120, 160),
                ),
            ],
        )
    }
}
