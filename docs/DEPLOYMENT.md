# Deployment and release policy

Follow [Self-hosting](SELF_HOSTING.md) for the VPS. GitHub Pages and a website are not part of this product. The API, database and relay stay on the owner's VPS; desktop downloads are served by GitHub.

`0.2.0-alpha.2` is the current experimental prerelease version in npm, Cargo and Tauri configuration. The CI workflows build and test pull-request changes, then store Windows and Linux packages as run artifacts. They do not create tags or publish releases automatically.

After an authorized maintainer approves a release:

1. Review the exact commit's CI and [test matrix](../tests/NETWORK_TEST_MATRIX.md).
2. Publish only packages from a successful desktop workflow run for that commit, with the bundled third-party notices and an honest list of remaining limits.
3. Create a new SemVer prerelease tag only once, at the reviewed commit. Never move an existing release tag.
4. Keep it marked prerelease until Windows adapter/firewall behavior and two-PC gaming over independent internet connections have been verified.

A build artifact is not proof of installation or connectivity. Do not promote this alpha to stable while end-to-end network and privilege tests are missing.
