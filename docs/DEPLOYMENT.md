# Deployment and release policy

Follow [Self-hosting](SELF_HOSTING.md) for the VPS. GitHub Pages and a website are not part of this product. The API, database and relay stay on the owner's VPS; desktop downloads are served by GitHub.

The next version is `0.2.0-alpha.1` in npm, Cargo and Tauri configuration. It remains an **unreleased candidate**. The desktop workflow builds on pull requests and uploads EXE/DEB artifacts after successful checks. It has read-only repository permissions and does not create tags or publish releases automatically.

After an authorized maintainer approves a release:

1. Review the exact commit's CI and [test matrix](../tests/NETWORK_TEST_MATRIX.md).
2. Install both generated packages and complete the Windows privilege, firewall and two-internet game tests. Record results and unresolved limitations.
3. Create a matching SemVer prerelease tag such as `v0.2.0-alpha.1` at that reviewed commit. Never move an existing release tag.
4. Publish only the matching successful build artifacts, accompanying third-party notices and source reference. Keep the release marked prerelease.
5. Update both README download links and limitations together.

A build artifact is not proof of installation or connectivity. Do not promote this alpha to stable while end-to-end network and privilege tests are missing.
