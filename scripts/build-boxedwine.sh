#!/usr/bin/env bash
# Git Bash / MSYS on Windows. Tools and outputs stay outside this repository.
set -euo pipefail
TARGET="${1:-release}"
case "$TARGET" in release|jit|multiThreaded|multiThreadedJit) ;; *) echo "Unsupported target: $TARGET" >&2; exit 2;; esac
TOOLS="${WEBAOE_TOOLS:-/d/webaoe-tools}"
WORK="${WEBAOE_WORK:-/d/webaoe-work}"
EXPECTED=8790ff20428c22daa64368af9553417e4f499c94
SOURCE="$WORK/Boxedwine"
[[ "$(git -C "$SOURCE" rev-parse HEAD)" == "$EXPECTED" ]] || { echo 'Unexpected Boxedwine revision' >&2; exit 1; }
[[ -z "$(git -C "$SOURCE" status --porcelain --untracked-files=no)" ]] || { echo 'Upstream has tracked changes; record/review them first' >&2; exit 1; }
export PATH="$TOOLS/msys-make/usr/bin:$PATH"
source "$TOOLS/emsdk/emsdk_env.sh"
# Git Bash cannot execute emcc.bat by its extensionless name. Explicit Python
# commands also let upstream's build configuration helper identify the compiler.
PYTHON_WIN="$(cygpath -m "$TOOLS/emsdk/python/3.13.3_64bit/python.exe")"
EMSCRIPTEN_WIN="$(cygpath -m "$TOOLS/emsdk/upstream/emscripten")"
export SOURCE_DATE_EPOCH=1793199625
mkdir -p "$WORK/logs"
cd "$SOURCE/project/emscripten"
"$TOOLS/msys-make/usr/bin/make.exe" "$TARGET" \
  'make_jobs=2' \
  "PYTHON=$PYTHON_WIN" \
  "CC=$PYTHON_WIN $EMSCRIPTEN_WIN/emcc.py" \
  "CXX=$PYTHON_WIN $EMSCRIPTEN_WIN/em++.py" \
  2>&1 | tee "$WORK/logs/build-$TARGET.log"
