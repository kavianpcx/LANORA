#!/usr/bin/env bash
set -euo pipefail
export WEBKIT_DISABLE_DMABUF_RENDERER=1
lanora-desktop &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' EXIT
window=''
for _ in $(seq 1 30); do
  kill -0 "$app_pid"
  window=$(xdotool search --pid "$app_pid" --name LANORA 2>/dev/null | head -n 1 || true)
  [[ -z "$window" ]] || break
  sleep 1
done
[[ -n "$window" ]] || { echo 'Native window did not appear'; exit 1; }
# Allow WebKit to paint before capturing this real native window.
sleep 3
import -window "$window" native-startup.png
xdotool key --window "$window" Escape
xdotool windowclose "$window"
for _ in $(seq 1 15); do
  if ! kill -0 "$app_pid" 2>/dev/null; then wait "$app_pid"; echo 'PASS: installed native app opened and closed'; exit 0; fi
  sleep 1
done
echo 'Native app did not exit after window close';exit 1
