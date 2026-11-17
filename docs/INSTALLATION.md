# Install LANORA

The current pre-release is 0.2.0-alpha.5. See the [release page](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.5) for notes and all assets.

## Windows 10/11, x64

1. Download the [Windows installer](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.5/LANORA_0.2.0-alpha.5_x64-setup.exe).
2. Download its [SHA-256 sidecar](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.5/LANORA_0.2.0-alpha.5_x64-setup.exe.sha256) and verify the installer hash.
3. Run the installer. It installs for the current Windows user. Open LANORA from the Start menu.

In PowerShell, compare the installer hash shown by the sidecar with:

~~~powershell
Get-FileHash .\LANORA_0.2.0-alpha.5_x64-setup.exe -Algorithm SHA256
~~~

## Linux x64, Debian/Ubuntu

1. Download the [Debian package](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.5/LANORA_0.2.0-alpha.5_amd64.deb).
2. Download its [SHA-256 sidecar](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.5/LANORA_0.2.0-alpha.5_amd64.deb.sha256).
3. Verify the hash, then install:

~~~sh
sha256sum --check LANORA_0.2.0-alpha.5_amd64.deb.sha256
sudo apt install ./LANORA_0.2.0-alpha.5_amd64.deb
~~~

Launch LANORA from the app menu. The installer configures the EasyTier network capability. Other Linux distributions are not covered by this package.

## Connect to a server

Enter the server's HTTPS address and choose a display name. Click Connect. If the server requires a player password, LANORA opens a password dialog; otherwise it joins without asking. Wait for the actual EasyTier virtual IP before sharing it with the game host. No account is required.

Public servers need a valid HTTPS certificate. HTTP is allowed only for loopback testing. A successful API connection alone does not mean the game network is ready.
