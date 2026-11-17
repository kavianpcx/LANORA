# Deployment and release policy

LANORA is self-hosted. The server owner runs the API, SQLite database, HTTPS endpoint, and EasyTier relay on a Linux VPS. Desktop installers are published on GitHub Releases; there is no hosted LANORA service or GitHub Pages site.

## Current server and desktop version

The current pre-release is 0.2.0-alpha.8. Its source, Docker Compose configuration, and server installer are on release/0.2.x. The installer builds the API from that checkout and updates the server in place. There is no separate server image tag to change independently of the source release.

Use the same branch to install or update a server:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

See [Self-hosting](SELF_HOSTING.md) for firewall, password policy, status, and update steps.

## Release workflow

Pull requests run checks and platform package builds. A push to release/0.2.x runs the Windows, Linux, and server-validation jobs. After all three pass, the workflow verifies the packages' SHA-256 sidecars and confirms the version tag is unused, then publishes a GitHub pre-release. The current [0.2.0-alpha.8 release](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.8) has Windows x64 and Linux x64 assets plus checksums.

The workflow refuses to overwrite an existing tag. Do not move a published tag or promote an experimental release to stable without evidence from real Windows PCs on separate networks, Windows tunnel/game traffic, and game-specific compatibility tests.
