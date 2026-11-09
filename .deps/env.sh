#!/usr/bin/env sh
# Source this before running project tools: . .deps/env.sh
if [ -n "$ZSH_VERSION" ]; then
  _mecra_root="${0:A:h}/.."
else
  _mecra_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
fi
export NODE_PATH="$_mecra_root/.deps/node_modules${NODE_PATH:+:$NODE_PATH}"
export PATH="$_mecra_root/.deps/node_modules/.bin:$PATH"
unset _mecra_root
