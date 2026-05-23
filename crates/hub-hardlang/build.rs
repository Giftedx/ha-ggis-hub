//! Build script: compile the committed C kernel at `c/fnv1a.c` (workspace
//! root) into a static library named `libfnv1a_c.a` (or `fnv1a_c.lib` on
//! MSVC) and emit the corresponding `cargo:rustc-link-lib=static=fnv1a_c`
//! directive so the FFI symbol becomes visible to `extern "C"` in
//! `src/lib.rs`.
//!
//! Skipped on `wasm32` targets — this crate is a native-only test surface
//! and there is no consumer for its FFI on wasm32. `cc-rs` cannot find a
//! `clang` cross-compiler on most dev machines without extra toolchain
//! setup, so a guard here keeps `cargo check --target wasm32-unknown-unknown`
//! green for the workspace.

fn main() {
    println!("cargo:rerun-if-changed=../../c/fnv1a.c");
    if std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() == Ok("wasm32") {
        return;
    }
    cc::Build::new()
        .file("../../c/fnv1a.c")
        .warnings(true)
        .extra_warnings(true)
        .compile("fnv1a_c");
}
