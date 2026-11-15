# Getting started

1. Server owner: follow [Self-hosting](SELF_HOSTING.md), then share the HTTPS address.
2. Every player: get the experimental Windows EXE or Linux DEB from [GitHub Releases](https://github.com/kavianpcx/LANORA/releases) only when a Windows build is published. Set a display name in Settings; there is no login.
3. Enter the same HTTPS server address and connect. Create a public room or enter a private invite code. A host may require a password and approval.
4. The game host shares the virtual IP reported by EasyTier. Other players use the game's Direct IP option with that player IP, not the VPS IP. Verify actual connectivity; an adapter address alone is insufficient.

The server owner can check API health with `curl -f https://YOUR_DOMAIN/api/v1/health`. Games and Windows network behavior need a real two-PC test.
