# LANORA network service

The Windows native supervisor lives in `apps/desktop/src-tauri/src/main.rs`. The Windows workflow stages the pinned EasyTier v2.6.4 release as a Tauri resource. The desktop client receives network credentials only after approved room membership, starts EasyTier with DHCP, and queries its node IP. A production implementation still needs a signed installer, Windows elevation and adapter validation, peer metrics, firewall rule ownership, reconnect testing, and cleanup validation.

Do not display a successful peer connection based on a healthy API, process launch, or adapter IP. Peer traffic and relay fallback have not been validated on two Windows PCs.
