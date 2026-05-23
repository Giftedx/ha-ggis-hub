#![doc = "Deterministic core primitives for ha.ggis Hub."]

pub mod hash;
pub mod log;
pub mod replay;
pub mod rng;
pub mod sim;

#[doc(hidden)]
pub mod compat;

// Re-export the legacy public surface so `hub-wasm` continues to build
// unchanged. Plan 2 removes these re-exports when the new boundary lands.
pub use compat::{
    Aabb, CORE_API_VERSION, CoreIdentity, DoorDefinition, InputVector, InteractionResult,
    PROJECT_NAME, PlayerState, Position, World, core_identity,
};

#[cfg(test)]
mod legacy_tests {
    use crate::compat::{
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
