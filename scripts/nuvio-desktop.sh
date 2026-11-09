#!/usr/bin/env sh
# Run Nuvio Desktop on an off-screen Xvfb display with an isolated HOME.
# The app never appears on the user's screen and its data stays in .deps/gui.
#
# Usage:
#   scripts/nuvio-desktop.sh start
#   scripts/nuvio-desktop.sh shot .deps/gui/shot.png
#   scripts/nuvio-desktop.sh click 500 400
#   scripts/nuvio-desktop.sh type "Serial Experiments Lain"
#   scripts/nuvio-desktop.sh key Return
#   scripts/nuvio-desktop.sh scroll down 5
#   scripts/nuvio-desktop.sh stop
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
GUI="$ROOT/.deps/gui"
APP="$GUI/Nuvio.AppImage"
DISPLAY_NUM="${NUVIO_DISPLAY:-:99}"
export DISPLAY="$DISPLAY_NUM"

start_xvfb() {
  if [ -f "$GUI/xvfb.pid" ] && kill -0 "$(cat "$GUI/xvfb.pid")" 2>/dev/null; then
    return
  fi
  Xvfb "$DISPLAY_NUM" -screen 0 1920x1080x24 -nolisten tcp > "$GUI/xvfb.log" 2>&1 &
  echo $! > "$GUI/xvfb.pid"
  sleep 1
}

start_app() {
  start_xvfb
  if [ -f "$GUI/nuvio.pid" ] && kill -0 "$(cat "$GUI/nuvio.pid")" 2>/dev/null; then
    return
  fi
  mkdir -p "$GUI/home" "$GUI/tmp"
  HOME="$GUI/home" \
  XDG_CONFIG_HOME="$GUI/home/.config" \
  XDG_DATA_HOME="$GUI/home/.local/share" \
  XDG_CACHE_HOME="$GUI/home/.cache" \
  TMPDIR="$GUI/tmp" \
  SKIKO_RENDER_API=SOFTWARE \
  LIBGL_ALWAYS_SOFTWARE=1 \
  "$APP" > "$GUI/nuvio.log" 2>&1 &
  echo $! > "$GUI/nuvio.pid"
  sleep 8
  WIN=$(xdotool search --name '^Nuvio$' 2>/dev/null | head -1 || true)
  if [ -n "$WIN" ]; then
    xdotool windowmove "$WIN" 0 0 2>/dev/null || true
    xdotool windowsize "$WIN" 1920 1080 2>/dev/null || true
  fi
}

stop_all() {
  if [ -f "$GUI/nuvio.pid" ]; then
    kill "$(cat "$GUI/nuvio.pid")" 2>/dev/null || true
    rm -f "$GUI/nuvio.pid"
  fi
  if [ -f "$GUI/xvfb.pid" ]; then
    kill "$(cat "$GUI/xvfb.pid")" 2>/dev/null || true
    rm -f "$GUI/xvfb.pid"
  fi
}

cmd="${1:-start}"
shift 2>/dev/null || true

case "$cmd" in
  start) start_app ;;
  stop) stop_all ;;
  restart) stop_all; sleep 1; start_app ;;
  shot)
    start_app
    xdotool search --name '^Nuvio$' >/dev/null 2>&1 || true
    import -window root "${1:-$GUI/shot.png}"
    echo "${1:-$GUI/shot.png}"
    ;;
  click)
    start_app
    xdotool mousemove "$1" "$2" click 1
    ;;
  type)
    start_app
    xdotool type --delay 20 "$*"
    ;;
  key)
    start_app
    xdotool key "$1"
    ;;
  scroll)
    start_app
    amount="${2:-5}"
    button=5
    [ "${1:-down}" = "up" ] && button=4
    i=0
    while [ "$i" -lt "$amount" ]; do
      xdotool click "$button"
      i=$((i + 1))
    done
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 2
    ;;
esac
