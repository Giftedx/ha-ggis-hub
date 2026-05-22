#![doc = "WebAssembly boundary for ha.ggis Hub."]

use wasm_bindgen::prelude::*;

/// Return the current hub-core API version exposed through WASM.
#[wasm_bindgen]
#[must_use]
pub fn hub_core_api_version() -> u32 {
    hub_core::CORE_API_VERSION
}
