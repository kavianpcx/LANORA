# Installation

## Windows

Download [LANORA 0.2.0-alpha.8 for Windows x64](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_x64-setup.exe) and its [SHA-256 file](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_x64-setup.exe.sha256), verify the checksum, and run the installer. The installer is per-user. Start LANORA from the Start menu. A real Windows virtual-network session is not verified.

## Linux

Download [LANORA 0.2.0-alpha.8 for Linux x64](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_amd64.deb) and its [SHA-256 file](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_amd64.deb.sha256). Verify the checksum, then install it with:

~~~sh
sudo apt install ./LANORA_VERSION_amd64.deb
~~~

If the file manager saved it under a different name, replace the example filename. Launch LANORA from the app menu. The package configures the required EasyTier network capability.

## Connect

Enter the server HTTPS address and choose a display name. Click Connect. If the server requires a player password, LANORA asks for it in a separate dialog; otherwise it joins without prompting. Wait until EasyTier reports your virtual IP. Share the game host's virtual IP with other players. No account is required.

Public servers must use a valid HTTPS certificate. Use `http://localhost:8080`, `http://127.0.0.1:8080`, or `http://[::1]:8080` only when the backend is running on the same computer as LANORA. The API's internal/default port is 8080; a localhost URL never reaches a backend on a different VPS. Bare loopback addresses such as `localhost:8080` use HTTP automatically. Public addresses default to HTTPS; LANORA does not downgrade them to HTTP.
