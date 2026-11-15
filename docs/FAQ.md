# FAQ

**Does LANORA create a virtual LAN today?** No. Room management works against the API; the Windows adapter/EasyTier client is under development. Tunnel UI remains Development/unknown.

**Can the web app run on GitHub Pages?** Yes, as a static frontend. API, SQLite and relay remain self-hosted. Set API Base URL and CORS origin.

**Does API carry game traffic?** No. It is the control plane. EasyTier is intended for the peer data plane.

**Will every LAN game work?** No guarantee. EasyTier `v2.6.4` documents an optional Windows UDP broadcast relay that is disabled by default and requires administrator privileges, but LANORA does not enable or test it. Broadcast/multicast discovery varies by game. Direct IP may work where offered; each game needs testing.

**Is EasyTier bundled?** No. Compose references pinned `v2.6.4`; the Windows binary is not included.

**Is there a Windows download?** Not yet; no installer has been verified or published.

**What is the license?** Original LANORA code is MIT; third-party components retain their licenses. EasyTier is LGPL-3.0. See [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md).
