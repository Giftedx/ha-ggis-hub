#![doc = "Deterministic core primitives for ha.ggis Hub."]

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

#[cfg(test)]
mod tests {
    use super::{CORE_API_VERSION, PROJECT_NAME, core_identity};

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
}
