//! Build script: compile the committed C kernel at `c/fnv1a.c` (workspace
//! root) into a static library named `libfnv1a_c.a` (or `fnv1a_c.lib` on
//! MSVC) and emit the corresponding `cargo:rustc-link-lib=static=fnv1a_c`
//! directive so the FFI symbol becomes visible to `extern "C"` in
//! `src/lib.rs`.

fn main() {
    println!("cargo:rerun-if-changed=../../c/fnv1a.c");
    cc::Build::new()
        .file("../../c/fnv1a.c")
        .warnings(true)
        .extra_warnings(true)
        .compile("fnv1a_c");
}
