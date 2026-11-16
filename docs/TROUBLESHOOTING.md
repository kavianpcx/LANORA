# Troubleshooting

**Server check fails:** confirm DNS, Caddy TLS, and `curl -f https://YOUR_DOMAIN/api/v1/health` on a separate network. Use HTTPS with a valid certificate; check ports 80/443 and `docker compose logs --tail=100 caddy api`.

**No public rooms:** refresh; private rooms need invite codes. Check the room's visibility and acceptance setting.

**Join fails:** check the invite code, password, capacity, approval status, and per-IP rate limit. The host may need to approve the pending member.

**No virtual IP:** check EasyTier process, adapter permissions, Windows firewall rules, and reachability of `LANORA_RELAY_PEER_URL` on TCP/UDP 11010. Do not disable the entire firewall. The UI should display unknown rather than invent a value.

**Game cannot connect:** the target is the host player's virtual IP. Test direct connectivity separately; an assigned IP is insufficient. Some games require broadcast discovery, which is unverified. See [Networking](NETWORKING.md).

**Linux window is blank:** some WebKitGTK/graphics combinations cannot render with accelerated compositing (including the headless Xvfb CI environment). Close LANORA, then try this one-time diagnostic launch:

```sh
WEBKIT_DISABLE_COMPOSITING_MODE=1 lanora-desktop
```

This uses a slower rendering path; LANORA does not force it for every Linux user. If it helps, report your distribution, desktop session and GPU without including secrets. See [Tauri's Linux graphics guide](https://tauri.app/develop/debug/linux-graphics/). A blank window is a rendering failure, not a successful connection.
