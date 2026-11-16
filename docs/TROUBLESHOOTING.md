# Troubleshooting

## The app cannot reach the server

Check that the server URL is the HTTPS domain, for example https://games.example.com. Check internet access, DNS, TLS certificate validity, and that the VPS allows inbound TCP 80 and 443. Do not add -k to curl and do not disable certificate checks in the app.

On the VPS, run:

~~~sh
bash scripts/server.sh status
bash scripts/server.sh logs
~~~

To verify from outside the VPS, run curl -f https://YOUR_DOMAIN/api/v1/health from another computer.

## The access code is rejected

Ask the server owner to confirm the code. It is case-sensitive and server-specific. The owner can reveal the configured code on the VPS with:

~~~sh
bash scripts/server.sh code
~~~

If the code was rotated, all players need to reconnect with the new value. A network code must contain 16–128 characters.

## The app says relay is not configured

The server owner should check LANORA_RELAY_PEER_URL in .env and ensure TCP/UDP port 11010 is reachable. The API must be restarted after changing the variable:

~~~sh
docker compose up -d --build
bash scripts/server.sh status
~~~

## No virtual IP appears

The control API being reachable only proves that the server can authorize the client. The Windows/Linux adapter still needs to start. Retry from the app, check that LANORA is allowed to create its virtual adapter, and ask the operator to confirm the relay container is running. Do not disable the firewall globally.

On Linux, the packaged EasyTier binary needs the network capability configured by package installation. On Windows, allow the adapter/driver prompt if one is shown. The alpha has only been installed and launched by CI on Windows; a real Windows tunnel has not yet been verified.

## A friend is listed as app-online, but the game cannot reach them

App online means their client sent an API heartbeat recently. Check whether an EasyTier route is shown beside their virtual IP. Unknown route means EasyTier did not report the peer. A route still does not prove that the game accepts traffic.

Both computers should join the same server and share the host player's virtual IP through the game's Direct IP feature. LAN discovery via broadcast or multicast varies by game and has not been verified.

## The network works but regular internet is affected

LANORA starts EasyTier with exit nodes disabled and does not set the system proxy or default gateway. If your machine's normal route changes, disconnect LANORA and collect [diagnostic information](SECURITY.md#diagnostic-data) without sharing tokens or network secrets. Report the OS, LANORA version, server setup and output of route-print or ip route; redact public IPs if desired.
