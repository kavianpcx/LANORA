# Installation

For the server, follow [Self-hosting](SELF_HOSTING.md). For players, use the explicit published EXE/DEB links and candidate-build status in the [README](../README.md); do not guess a release URL.

Windows 10/11 x64 uses an NSIS installer. The bundle includes EasyTier v2.6.4 and its notices. Windows adapter privileges and firewall behavior still require validation on clean player machines. Linux x64 Debian/Ubuntu uses a DEB; installation grants network capabilities to EasyTier and needs administrator permission. This capability model is unsuitable for untrusted multiuser systems without additional restriction; see [Security](SECURITY.md).

Open the installed application, choose a local nickname/avatar, then enter the server owner's HTTPS address. There is no browser app or account registration. First-run and real package-installation evidence are recorded in the [audit](AUDIT_0.2.0.md). For source builds, use [Building](BUILDING.md).
