#!/bin/sh
set -eu
cd "${BUILD_WORKSPACE_DIRECTORY:?Run with bazel run //:dev}"
exec python3 tools/dev.py
