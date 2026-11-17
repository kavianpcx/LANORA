# LANORA network service

The desktop's native EasyTier supervisor is in apps/desktop/src-tauri/src/main.rs. The current Windows and Linux packages bundle pinned EasyTier 2.6.4 resources.

The server API discovers the player-password policy, enforces it on join, creates a per-device session, and returns network credentials only after authorization. Passwordless mode skips the player password but still creates an authenticated API session. Administrator authentication and the internal relay credential are independent of player access.

The desktop starts EasyTier with DHCP, reads the real adapter IP, and reports heartbeat presence separately from peer routes. Do not report a healthy API or a started process as a working peer connection. Linux namespace CI verifies relay TCP/UDP traffic; separate public networks, Windows adapter/firewall behavior, Windows game traffic, and game-specific discovery remain unverified.
