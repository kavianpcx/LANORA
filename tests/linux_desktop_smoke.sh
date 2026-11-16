#!/usr/bin/env bash
set -euo pipefail
export WEBKIT_DISABLE_DMABUF_RENDERER=1
# Xvfb has no usable accelerated compositor. Keep this override in the
# headless test, rather than slowing down every installed Linux client.
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export LIBGL_ALWAYS_SOFTWARE=1
openbox --sm-disable >/dev/null 2>&1 &
wm_pid=$!
lanora-desktop &
app_pid=$!
trap 'kill "$app_pid" "$wm_pid" 2>/dev/null || true' EXIT
window=''
for _ in $(seq 1 30); do
  kill -0 "$app_pid"
  window=$(xdotool search --all --onlyvisible --pid "$app_pid" --name LANORA 2>/dev/null | head -n 1 || true)
  [[ -z "$window" ]] || break
  sleep 1
done
[[ -n "$window" ]] || { echo 'Native window did not appear'; exit 1; }
# Allow WebKit to paint before capturing this real native window.
sleep 3
import -window root native-startup.png
echo NATIVE_SCREENSHOT_START
base64 -w 1000 native-startup.png
echo NATIVE_SCREENSHOT_END
xdotool windowactivate --sync "$window"
xdotool key Escape
# Exercise the custom frontend fullscreen key path, then restore.
xdotool key F11
for _ in $(seq 1 10); do
  if xprop -id "$window" _NET_WM_STATE | grep -q _NET_WM_STATE_FULLSCREEN; then break; fi
  sleep 1
done
xprop -id "$window" _NET_WM_STATE | grep -q _NET_WM_STATE_FULLSCREEN || {
  echo 'Frontend F11 did not enter fullscreen; check screenshot and WebKit startup'; exit 1;
}
xdotool key F11
sleep 1
if xprop -id "$window" _NET_WM_STATE | grep -q _NET_WM_STATE_FULLSCREEN; then echo 'Fullscreen restore failed';exit 1;fi
xdotool key alt+F4
for _ in $(seq 1 15); do
  if ! kill -0 "$app_pid" 2>/dev/null; then wait "$app_pid"; echo 'PASS: installed native app opened and closed'; exit 0; fi
  sleep 1
done
echo 'Native app did not exit after window close';exit 1
