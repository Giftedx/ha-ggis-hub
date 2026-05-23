#![doc = "Deterministic core primitives for ha.ggis Hub."]

pub mod hash;
pub mod log;
pub mod replay;
pub mod rng;
pub mod sim;

/// Human-readable project name shared across core and host surfaces.
pub const PROJECT_NAME: &str = "ha.ggis Hub";

/// Version of the public `hub-core` API exposed to host boundaries.
pub const CORE_API_VERSION: u32 = 1;
