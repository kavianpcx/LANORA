#!/usr/bin/env bash
set -euo pipefail
export WEBKIT_DISABLE_DMABUF_RENDERER=1
# Xvfb has no usable accelerated compositor. Keep this override in the
# headless test, rather than slowing down every installed Linux client.
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export LIBGL_ALWAYS_SOFTWARE=1
openbox --sm-disable >/dev/null 2>&1 &
wm_pid=$!
# Do not race window creation against the window manager's startup.
for _ in $(seq 1 20); do
  xprop -root _NET_SUPPORTING_WM_CHECK | grep -q 'window id' && break
  sleep 1
done
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
xdotool windowmap --sync "$window"
xdotool windowactivate --sync "$window"
# Allow WebKit to paint before capturing this real native window.
sleep 5
xwininfo -id "$window"
xprop -id "$window" _NET_WM_PID _NET_WM_STATE WM_CLASS
import -window root native-startup.png
for viewport in 760x600 760x900 1366x768 1920x1080; do
  width=${viewport%x*}
  height=${viewport#*x}
  xdotool windowsize --sync "$window" "$width" "$height"
  xdotool windowmove --sync "$window" 0 0
  geometry=$(xdotool getwindowgeometry --shell "$window")
  actual_width=$(awk -F= '$1 == "WIDTH" {print $2}' <<<"$geometry")
  actual_height=$(awk -F= '$1 == "HEIGHT" {print $2}' <<<"$geometry")
  [[ "$actual_width" == "$width" && "$actual_height" == "$height" ]] || {
    echo "Requested ${viewport}, got ${actual_width}x${actual_height}"; exit 1;
  }
  sleep 1
  import -window "$window" "native-startup-${viewport}.png"
done
# Verify Persian text and both theme palettes without moving the LTR app shell.
xdotool windowsize --sync "$window" 760 900
xdotool key Tab Tab Tab Tab Return
xdotool key Tab Return
sleep 1
import -window "$window" native-startup-fa-light.png
xdotool key Tab Return
sleep 1
import -window "$window" native-startup-fa-dark.png
xdotool key Shift+Tab Shift+Tab Shift+Tab Return
sleep 1
import -window "$window" native-startup-en-dark.png
xdotool key Tab Tab Return
sleep 1
import -window "$window" native-startup-en-light.png
# Select an avatar, save a display name through Continue, and exercise Back.
xdotool key Shift+Tab Shift+Tab Shift+Tab Shift+Tab Shift+Tab
xdotool key Right
xdotool key Tab Tab
xdotool key ctrl+a
xdotool type --clearmodifiers --delay 15 'UI Tester'
xdotool key Return
sleep 1
xdotool key Tab Tab Return
sleep 1
import -window "$window" native-profile-back.png
# Escape closes the native dialog and keeps the first-run profile on this device.
xdotool key Escape
sleep 1
# Open Settings from the title bar, edit the name, and verify the saved profile.
xdotool key Tab Return
sleep 1
xdotool key Tab
xdotool key ctrl+a
xdotool type --clearmodifiers --delay 15 'Edited Player'
xdotool key Return
sleep 1
import -window "$window" native-settings-saved.png
echo NATIVE_SCREENSHOT_START
base64 -w 1000 native-startup.png
echo NATIVE_SCREENSHOT_END
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
