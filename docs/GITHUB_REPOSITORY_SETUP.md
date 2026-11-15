# GitHub repository settings

These values are prepared for repository `kavianpcx/lanora`. Repository settings and social preview cannot be changed from this workspace's GitHub connector, so apply them in **Settings** after creating the repository.

## About

Description:

> LANORA is an open-source, self-hosted virtual LAN gaming platform that lets friends create private rooms and play LAN-supported games together over the internet.

Topics (one at a time): `virtual-lan`, `lan-gaming`, `gaming`, `self-hosted`, `p2p`, `vpn`, `easytier`, `tauri`, `react`, `typescript`, `rust`, `windows`, `open-source`.

Website: leave blank until the Pages workflow succeeds. Then set the observed deployment URL (expected project path: `https://kavianpcx.github.io/lanora/`; this is not an active site until verified).

## Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Push to `main` or run **Actions → Deploy web to GitHub Pages → Run workflow**.
4. Wait for both build and deploy jobs to pass. Verify the published page and API CORS before setting Website metadata.

Pages serves the static frontend only. The Go API, SQLite volume and network relay must run on infrastructure you control.

## Social preview

Open **Settings → General → Social preview → Edit** and upload `assets/social-preview.png` (1200×630). The artwork is a branded development preview and explicitly says the network tunnel is not released; it is not a screenshot of a working product.

## Release policy

Use SemVer and prerelease labels (for example `0.1.0-alpha.1`) only after a corresponding commit is tested. Do not create a binary release until Windows packaging succeeds, third-party notices are included, and actual two-client network behavior has been verified. No release currently exists.
