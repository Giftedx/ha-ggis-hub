#![doc = "WebAssembly boundary for ha.ggis Hub."]

mod handle;
mod room_def;
mod snapshot_view;
pub use handle::{HubErrorTag, HubHandle, hub_core_api_version_v2, replay_run};

use wasm_bindgen::prelude::*;

use hub_core::{
    Aabb, DoorDefinition, InputVector, InteractionResult, PlayerState, Position, World,
};

/// Return the current hub-core API version exposed through WASM.
#[wasm_bindgen]
#[must_use]
pub fn hub_core_api_version() -> u32 {
    hub_core::CORE_API_VERSION
}

/// Return the project name exposed through WASM for host diagnostics.
#[wasm_bindgen]
#[must_use]
pub fn hub_core_project_name() -> String {
    hub_core::PROJECT_NAME.to_owned()
}

/// Interaction kind exposed as a compact JavaScript-readable enum.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HubInteractionKind {
    /// No door is reachable.
    None,
    /// A launchable door is reachable.
    Launchable,
    /// A locked or future door is reachable.
    Locked,
}

/// Player state snapshot returned across the WASM boundary.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HubPlayerSnapshot {
    x: i32,
    y: i32,
    half_extent: i32,
    speed_per_tick: i32,
}

#[wasm_bindgen]
impl HubPlayerSnapshot {
    /// Player center x coordinate in fixed world units.
    #[must_use]
    pub fn x(&self) -> i32 {
        self.x
    }

    /// Player center y coordinate in fixed world units.
    #[must_use]
    pub fn y(&self) -> i32 {
        self.y
    }

    /// Player half extent in fixed world units after boundary sanitization.
    #[must_use]
    pub fn half_extent(&self) -> i32 {
        self.half_extent
    }

    /// Player speed per fixed tick after boundary sanitization.
    #[must_use]
    pub fn speed_per_tick(&self) -> i32 {
        self.speed_per_tick
    }
}

impl From<PlayerState> for HubPlayerSnapshot {
    fn from(player: PlayerState) -> Self {
        Self {
            x: player.position.x,
            y: player.position.y,
            half_extent: player.half_extent,
            speed_per_tick: player.speed_per_tick,
        }
    }
}

/// Door interaction snapshot returned across the WASM boundary.
#[wasm_bindgen]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HubInteractionSnapshot {
    kind: HubInteractionKind,
    id: String,
    title: String,
}

#[wasm_bindgen]
impl HubInteractionSnapshot {
    /// Interaction kind for host UI branching.
    #[must_use]
    pub fn kind(&self) -> HubInteractionKind {
        self.kind
    }

    /// Stable door id, or an empty string when no door is reachable.
    #[must_use]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    /// Visitor-facing door title, or an empty string when no door is reachable.
    #[must_use]
    pub fn title(&self) -> String {
        self.title.clone()
    }
}

impl From<InteractionResult> for HubInteractionSnapshot {
    fn from(result: InteractionResult) -> Self {
        match result {
            InteractionResult::None => Self {
                kind: HubInteractionKind::None,
                id: String::new(),
                title: String::new(),
            },
            InteractionResult::NearLaunchable { id, title } => Self {
                kind: HubInteractionKind::Launchable,
                id,
                title,
            },
            InteractionResult::NearLocked { id, title } => Self {
                kind: HubInteractionKind::Locked,
                id,
                title,
            },
        }
    }
}

/// Minimal world handle exposed to JavaScript.
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct HubWorld {
    inner: World,
}

#[wasm_bindgen]
impl HubWorld {
    /// Advance a player by one fixed tick using primitive boundary-safe values.
    ///
    /// Invalid inputs are sanitized by `hub-core`: input axes become -1/0/1,
    /// negative sizes and speeds become zero, and movement saturates instead of
    /// overflowing.
    #[must_use]
    pub fn tick_player(
        &self,
        x: i32,
        y: i32,
        half_extent: i32,
        speed_per_tick: i32,
        input_x: i8,
        input_y: i8,
    ) -> HubPlayerSnapshot {
        let player = PlayerState::new(Position::new(x, y), half_extent, speed_per_tick);
        self.inner
            .tick_player(player, InputVector::new(input_x, input_y))
            .into()
    }

    /// Derive the current door interaction for a boundary-provided player state.
    #[must_use]
    pub fn interaction_for(
        &self,
        x: i32,
        y: i32,
        half_extent: i32,
        speed_per_tick: i32,
    ) -> HubInteractionSnapshot {
        let player = PlayerState::new(Position::new(x, y), half_extent, speed_per_tick);
        self.inner.interaction_for(player).into()
    }
}

/// Create the deterministic demo world used by the current hub slice.
#[wasm_bindgen]
#[must_use]
pub fn create_demo_world() -> HubWorld {
    HubWorld {
        inner: World::new(
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
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::{HubInteractionKind, create_demo_world, hub_core_project_name};

    #[test]
    fn boundary_exposes_core_identity_for_host_initialization() {
        assert_eq!(hub_core_project_name(), "ha.ggis Hub");
    }

    #[test]
    fn boundary_ticks_player_with_sanitized_invalid_inputs() {
        let world = create_demo_world();

        let player = world.tick_player(500, 500, -80, -100, 42, -42);

        assert_eq!(player.x(), 500);
        assert_eq!(player.y(), 500);
        assert_eq!(player.half_extent(), 0);
        assert_eq!(player.speed_per_tick(), 0);
    }

    #[test]
    fn boundary_reports_launchable_and_locked_interactions() {
        let world = create_demo_world();

        let launchable = world.interaction_for(740, 500, 80, 100);
        assert_eq!(launchable.kind(), HubInteractionKind::Launchable);
        assert_eq!(launchable.id(), "wild-haggis-survivors");
        assert_eq!(launchable.title(), "Wild Haggis Survivors");

        let locked = world.interaction_for(250, 500, 80, 100);
        assert_eq!(locked.kind(), HubInteractionKind::Locked);
        assert_eq!(locked.id(), "future-bothy");
        assert_eq!(locked.title(), "Future Bothy");
    }
}
