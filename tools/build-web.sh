#!/bin/sh
set -eu
cd "${BUILD_WORKSPACE_DIRECTORY:?Run with bazel run //:web_build}/frontend"
node node_modules/typescript/bin/tsc --noEmit
exec node node_modules/vite/bin/vite.js build
