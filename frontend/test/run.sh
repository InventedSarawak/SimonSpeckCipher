#!/bin/bash
# Rebuild, re-trace ref.py in Python, and compare every intermediate value with the page's JavaScript.
set -e
cd "$(dirname "$0")/.."
./build.sh
python3 -I -B test/trace.py "$PWD" > test/trace.json
node test/verify.mjs index.html test/trace.json
