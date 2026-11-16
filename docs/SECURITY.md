# Security

## Access and secrets

- HTTPS is required for public server addresses; the desktop validates certificates normally.
- The shared code authorizes access but is different from the EasyTier network secret.
- The API stores the shared code hash, the generated network secret in persistent SQLite, and hashes of per-device random bearer tokens.
- Shared network joins are rate limited. A changed access code rotates the data-plane network identity and revokes prior device tokens when the API restarts.
- The desktop stores the shared code and token in local application storage. Disconnect calls the leave endpoint and clears the stored code.
- Server status and API logs avoid printing the shared code, relay secret, administrator token, and bearer tokens. Use the explicit server code command only on the trusted VPS terminal.
- Network settings are structured fields. The API cannot send an arbitrary command to the desktop.

## Traffic

EasyTier encrypts data-plane traffic. LANORA disables exit-node routing and does not change the operating system's default gateway or global proxy. The server API handles authorization and presence, not game packet forwarding.

## Reporting

Do not include access codes, bearer tokens, network secrets, or raw .env content in bug reports. Include the app and OS version, error text, and sanitized logs.

## Diagnostic data

Before sharing route output, remove public addresses and any usernames you do not want to publish. Never upload the private .env file.
