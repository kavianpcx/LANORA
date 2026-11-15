# LANORA network service

The Windows native supervisor currently lives in `apps/desktop/src-tauri/src/main.rs`. This directory reserves the standalone service boundary planned for a later phase. A production implementation still needs Windows service lifecycle, signed/pinned EasyTier `v2.6.4` binaries, config validation against that exact release, authoritative peer/adapter status, firewall rule ownership, reconnection and cleanup.

Do not display a successful network status based only on successful child-process launch. `engine_start` currently reports `starting` and has no verified tunnel health channel.
