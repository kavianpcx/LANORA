# LANORA Desktop Design System

This document records the visual rules used by the LANORA desktop client. It is intentionally small and maps to the tokens and components in `apps/desktop/src/style.css`.

## Product principles

- Help a player connect to their own server, then create or join a room.
- Keep server reachability, room membership, tunnel state, virtual IP and peer reachability visibly separate.
- Put the next useful action first. Keep network detail available without making it a prerequisite for play.
- Never use color, animation, room membership or an assigned IP alone to claim that another player is reachable.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F2F4F9` | `#111725` | Application workspace |
| `--surface` | `#FFFFFF` | `#192234` | Main panels and dialogs |
| `--surface-raised` | `#FFFFFF` | `#202B40` | Hovered or lifted content |
| `--surface-quiet` | `#EDF0F7` | `#232F45` | Secondary controls and selected areas |
| `--ink` | `#182135` | `#F1F4FC` | Primary text |
| `--muted` | `#5C6578` | `#B4BFD1` | Supporting text |
| `--line` | `#D9DEEA` | `#33415C` | Borders and separators |
| `--accent` | `#4355DB` | `#A7B1FF` | Primary action, focus and navigation |
| `--accent-soft` | `#E7EAFF` | `#2A3554` | Selected and icon surfaces |
| `--lime` | `#CAEF5C` | `#CAEF5C` | Small brand highlights |
| `--success` | `#14785B` | `#81D2AE` | Verified success only |
| `--danger` | `#BD484D` | `#FFAAA9` | Errors and destructive actions |

Use the theme tokens instead of one-off colors for new UI. The sidebar is a fixed LANORA navy surface (`#1A2943`) with high-contrast text in both themes. Never encode a status with color alone; include a label or icon.

## Typography

- English: Inter, weights 400, 600 and 700.
- Persian: Vazirmatn, weights 400, 600 and 700. Fonts are bundled and work offline.
- Use a comfortable 1.5–1.7 line height for body copy. Keep paragraph measure short.
- Avoid letter spacing on Persian text.
- Set URLs, ports, invitation codes, virtual IPs and version strings to LTR and use a monospaced face where exact copying matters.

## Layout and spacing

Use a 4 px base rhythm: `4, 8, 12, 16, 24, 32, 40, 48`. Prefer `8–24 px` gaps for controls and `24–40 px` between sections. The desktop shell uses a 56 px integrated title bar, a 235 px connection guide (collapses to 74 px below 850 px), and a content column up to 980 px. At 600 px and below, hide the sidebar and retain the main actions.

The shipped window starts at 1100 × 760 px and remains resizable. Its minimum is 760 × 600 px, so interactive controls must fit at that size. Keep the title bar in the normal window flow; it is not an overlay.

## Shape and elevation

- Small controls: 8–12 px radius.
- Room rows and profile controls: 12–16 px radius.
- Main panels and dialogs: 18–20 px radius.
- Use one quiet shadow on large surfaces. Avoid glow, stacked shadows and decorative gradients.
- Use 1 px borders for separation in both themes.

## Iconography

Use Lucide outline icons at 14–21 px, with one stroke weight per control group. The LANORA mark represents connected peers with three nodes and a shared path; do not substitute a generic Wi-Fi or copied gaming-service mark. Icons support text labels and must not be the only label on an action.

## Buttons and forms

- Primary buttons use `--accent`, have a 44 px minimum height and contain one clear verb.
- Secondary buttons have a surface fill, border and primary text.
- Subtle buttons are for reversible, low-priority actions such as refresh or back.
- Danger styling is reserved for leave/close actions and errors.
- Disabled controls remain legible and expose a reason nearby when the reason is not obvious.
- Inputs are 48 px high, visibly labeled and keyboard focusable. Technical values remain LTR in Persian mode.
- Do not submit duplicate requests while a previous operation is pending.

## Dialogs and feedback

Dialogs use the same surface and border tokens, have a clear heading, and keep focus contained. Escape and the close control dismiss non-destructive dialogs. Room creation and joining are reversible and do not need confirmation. Closing a hosted room is destructive to other members and must be clearly labeled.

Use a skeleton only while the corresponding request is pending. Show inline, localized error text with a retry or correction path. Show success only after the operation succeeds. Persistent status text is reserved for server and network states; short-lived notices are used for actions such as copying an address.

## Motion and accessibility

- Motion is limited to short, purposeful transitions (about 120–180 ms).
- Loading motion indicates an active request; no decorative wait is added.
- Respect `prefers-reduced-motion` by disabling animation and transitions.
- Preserve keyboard operation, visible focus, accessible names for icon buttons, and live announcements for connection status.
- Keep body text and controls readable at the minimum supported window size; do not communicate state by color alone.

## Installer and application icon

The source mark is `assets/lanora-mark.svg`. Its transparent 1024 px PNG, Windows ICO and Tauri size variants are generated from that source and checked into `apps/desktop/src-tauri/icons/`. The NSIS header and sidebar bitmaps use the same blue, lime and peer-node mark. Keep the mark simple enough to remain distinct at 16 px.
