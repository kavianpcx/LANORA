# Installation

## Windows

Download the LANORA NSIS installer from [GitHub Releases](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.3), check its adjacent SHA-256 file, and run it. The installer is per-user. Start LANORA from the Start menu. The current alpha build has been installed and launched by GitHub Actions on a Windows runner; a real Windows virtual-network session is not verified.

## Linux

Download the Debian package from the same release and verify its SHA-256 file. Install it with:

~~~sh
sudo apt install ./LANORA_VERSION_amd64.deb
~~~

If the file manager saved it under a different name, replace the example filename. Launch LANORA from the app menu. The package configures the required EasyTier network capability.

## Connect

Enter the server HTTPS address and the private access code from the server owner. Choose a display name, click Connect, and wait until EasyTier reports your virtual IP. Share the game host's virtual IP with other players. No account is required.

Public servers must use a valid HTTPS certificate. HTTP is only allowed for loopback development servers.
