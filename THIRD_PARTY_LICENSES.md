# Third-party software and notices

LANORA's original source is licensed under MIT (see [`LICENSE`](LICENSE)). This does not relicense third-party software. Each dependency remains under its own license.

## EasyTier

The networking integration targets EasyTier `v2.6.4`. The upstream `LICENSE` file identifies LGPL-3.0; see the exact [v2.6.4 source license](https://github.com/EasyTier/EasyTier/blob/v2.6.4/LICENSE) and [release assets](https://github.com/EasyTier/EasyTier/releases/tag/v2.6.4). EasyTier is currently referenced as a separately licensed container image and as an expected desktop sidecar; the desktop prerelease workflow stages the upstream Windows and Linux x64 archives as a separate sidecar, checks its SHA-256, and includes the upstream LGPL-3.0 license and this notice in the installer. No EasyTier source is modified by LANORA. The matching source is available at https://github.com/EasyTier/EasyTier/tree/v2.6.4 .

When a LANORA release redistributes an EasyTier binary, that release must ship the matching LGPL-3.0 text and notices, identify the exact source/build and any LANORA modifications, provide the corresponding source or another LGPL-compliant source offer, preserve recipients' ability to replace/relink the library where the delivery form requires it, and avoid terms or signing controls that prevent lawful reverse engineering for debugging modifications. The precise obligations depend on whether EasyTier is unmodified, dynamically linked, or statically linked. Review the actual package layout and source offer before publishing binaries.

## Direct application dependencies

| Component | Use | License identified by upstream/package metadata |
|---|---|---|
| React, React DOM | Desktop UI | MIT |
| Vite and React plugin | Desktop build | MIT |
| Lucide React | UI icons | ISC |
| Gorilla WebSocket | API WebSocket events | BSD-2-Clause |
| modernc SQLite | API database driver | BSD-3-Clause |
| Tauri 2 and Rust dependencies | Desktop shell | Per-crate licenses; transitive inventory is not yet generated |

This is a direct-dependency summary, not a complete transitive Software Bill of Materials. Before an installer or production container is published, run a license/SBOM inventory over `package-lock.json`, `go.sum`, Rust `Cargo.lock`, and container images, then attach the notices required for that exact artifact. No custom or third-party brand artwork is included; LANORA's SVG marks in `assets/` are original project assets.

## Bundled fonts

The desktop frontend bundles Inter and Vazirmatn font assets from `@fontsource/inter` and `@fontsource/vazirmatn`, under their respective SIL Open Font License 1.1 notices. Package copies of OFL files should be included in binary distribution. The remaining npm and Rust dependencies require an artifact-specific license inventory before a stable release.
