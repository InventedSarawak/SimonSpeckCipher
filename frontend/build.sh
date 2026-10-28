#!/bin/bash
# Joins src/ into one self-contained page, index.html. The page itself needs no build step;
# this only exists so the sources can be edited as separate files.
set -e
cd "$(dirname "$0")"
{
  cat src/01-head.html
  sed '/<script type="text\/plain" id="ref-py">/,$d' src/02-body.html
  printf '<script type="text/plain" id="ref-py">'; cat ref.py; printf '</script>\n'
  echo; echo '<script id="ref-js">'; cat src/03-ref.js; echo '</script>'
  echo '<script id="trace-js">'; cat src/04-trace.js; echo '</script>'
  # The app files share one scope. The wrapper is added here, not in the files, so each file parses on its own.
  echo '<script id="app-js">'; echo '(() => {'; cat src/05-app-*.js; echo '})();'; echo '</script>'
  echo '</body>'; echo '</html>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes, $(wc -l < index.html) lines)"
