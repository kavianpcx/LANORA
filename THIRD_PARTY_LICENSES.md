# Third-party software and notices

LANORA's original source is licensed under MIT (see [`LICENSE`](LICENSE)). This does not relicense third-party software. Each dependency remains under its own license.

## EasyTier

The networking integration targets EasyTier `v2.6.4`. The upstream `LICENSE` file identifies LGPL-3.0; see the exact [v2.6.4 source license](https://github.com/EasyTier/EasyTier/blob/v2.6.4/LICENSE) and [release assets](https://github.com/EasyTier/EasyTier/releases/tag/v2.6.4). EasyTier is currently referenced as a separately licensed container image and as an expected desktop sidecar; no EasyTier executable is bundled in this source snapshot or any LANORA installer.

If a future LANORA release redistributes an EasyTier binary, that release must ship the matching LGPL-3.0 text and notices, identify the exact source/build and any LANORA modifications, provide the corresponding source or another LGPL-compliant source offer, preserve recipients' ability to replace/relink the library where the delivery form requires it, and avoid terms or signing controls that prevent lawful reverse engineering for debugging modifications. The precise obligations depend on whether EasyTier is unmodified, dynamically linked, or statically linked. Review the actual package layout and source offer before publishing binaries.

## Direct application dependencies

| Component | Use | License identified by upstream/package metadata |
|---|---|---|
| React, React DOM | Web and desktop UI | MIT |
| React Router | Web routing | MIT |
| Vite and React plugin | Web build | MIT |
| Tailwind CSS and Vite plugin | Web styling/build | MIT |
| Lucide React | UI icons | ISC |
| Zustand | Web session/preferences state | MIT |
| Gorilla WebSocket | API WebSocket events | BSD-2-Clause |
| modernc SQLite | API database driver | BSD-3-Clause |
| Tauri 2 and Rust dependencies | Desktop shell | Per-crate licenses; transitive inventory is not yet generated |

This is a direct-dependency summary, not a complete transitive Software Bill of Materials. Before an installer or production container is published, run a license/SBOM inventory over `package-lock.json`, `go.sum`, Rust `Cargo.lock`, and container images, then attach the notices required for that exact artifact. No custom or third-party brand artwork is included; LANORA's SVG marks in `assets/` are original project assets.

## Web lockfile inventory

A package-metadata scan of the committed `apps/web/package-lock.json` (167 resolved npm packages at this snapshot) found: MIT (142), ISC (6), Apache-2.0 (3), MPL-2.0 (12 platform/build packages), BSD-3-Clause (1), CC-BY-4.0 (1), BlueOak-1.0.0 (1), and 0BSD (1). The MPL-2.0 entries are `lightningcss` and platform packages used in the build toolchain; `caniuse-lite` carries CC-BY-4.0. Their code is not intentionally vendored into the source tree. Preserve their upstream notices and review the exact artifact inventory if any package code is redistributed. This scan reports package metadata and is not legal advice or a substitute for a generated SBOM.

The `apps/desktop/src-tauri/Cargo.toml` declares Tauri, tauri-build, serde, serde_json, thiserror, tokio, and url. There is no `Cargo.lock` in this snapshot, so versions/transitive crate license expressions have not been resolved or audited. `services/api/go.mod` directly declares Gorilla WebSocket (BSD-2-Clause) and modernc SQLite (BSD-3-Clause); the full Go dependency/license inventory is also pending because no `go.sum` is checked in. Before packaging binaries or production images, resolve lockfiles, generate an SBOM, retain required notices, and review licenses for the exact target artifacts.

A second package-metadata scan of `apps/desktop/package-lock.json` found 130 resolved npm packages: MIT (107), `Apache-2.0 OR MIT` (13), Apache-2.0 (2), ISC (6), BSD-3-Clause (1), and CC-BY-4.0 (1); no package lacked a declared license in the lockfile metadata. This complements, but does not replace, a file-level notice/SBOM review for a built desktop installer. The desktop Rust/Tauri dependency tree remains unresolved until Cargo is available and `Cargo.lock` is generated.
