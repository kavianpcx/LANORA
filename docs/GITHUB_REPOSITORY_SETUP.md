# Repository and releases

LANORA is a desktop client and a self-hosted server, not a hosted website. The default branch is main. The current experimental app/server release is maintained on release/0.2.x; readmes and installation instructions link to its 0.2.0-alpha.8 release.

The CI workflow checks Go API behavior, Docker deployment, server setup commands, and repository consistency. The desktop workflow builds and installs Windows and Linux packages. Pushes to release/0.2.x publish a pre-release only after those checks pass and the asset checksums verify.

Users download installers from [GitHub Releases](https://github.com/kavianpcx/LANORA/releases). Server owners clone release/0.2.x and run scripts/setup-server.sh on their Linux VPS. There is no GitHub Pages site or separately managed server image.
