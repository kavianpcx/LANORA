# Deployment and release policy

Follow [Self-hosting](SELF_HOSTING.md) for the VPS. GitHub Pages and a website are not part of this product. The API, database and relay stay on the owner's VPS; desktop downloads are served by GitHub.

The latest published experimental prerelease is `0.2.0-alpha.8`. The current source candidate is `0.3.0-alpha.1`; its download links must not be advertised until the signed release workflow completes. Pull-request workflows build and test Windows and Linux packages and run API, Docker, Debian-control-file, and namespace checks. A push to `release/0.2.x` publishes Windows and Linux packages only after all required jobs pass and refuses to reuse an existing version tag.

The Windows release build enables Tauri's official updater only on the release branch. It requires the repository Actions secret `TAURI_SIGNING_PRIVATE_KEY`, the optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` when the key is encrypted, and the repository variable `TAURI_UPDATER_PUBLIC_KEY`. The private key is never committed. The workflow signs the actual NSIS installer, publishes its `.sig` and checksums, builds `latest.json` from that artifact, then updates `updates/alpha/latest.json` for the stable HTTPS raw-GitHub endpoint. The first updater-enabled build needs a manual installation from Alpha 8; earlier binaries have no updater code.

Generate the keypair locally with the documented Tauri signer CLI (`npx tauri signer generate -- -w <private-key-path>`). Store the private-key contents and its password in GitHub Actions secrets, and put only the matching public key in the repository variable. Keep a protected offline backup of the private key. Never paste or commit it. The release workflow deliberately fails if these values are missing; do not bypass that guard or publish an unsigned updater package.

After an authorized maintainer approves a release:

1. Review the exact commit's CI and [test matrix](../tests/NETWORK_TEST_MATRIX.md).
2. Publish only packages from a successful desktop workflow run for that commit, with the bundled third-party notices and an honest list of remaining limits.
3. Create a new SemVer prerelease tag only once, at the reviewed commit. Never move an existing release tag.
4. Keep it marked prerelease until Windows adapter/firewall behavior and two-PC gaming over independent internet connections have been verified.

A build artifact is not proof of installation or connectivity. Do not promote this alpha to stable while end-to-end network and privilege tests are missing.

The updater manifest-generation test checks formatting and artifact URL construction only. It does not verify a real signature or end-to-end installation. Before claiming automatic updates work, install an older updater-enabled package, publish a newer signed package, and verify download, signature rejection, installation, relaunch, and local-settings preservation on Windows.
