#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${GURITA_DIR:-/opt/gurita-panel}"
echo "This will remove Gurita Panel from $APP_DIR"
read -r -p "Type 'yes' to continue: " ans
if [ "$ans" != "yes" ]; then echo "Aborted."; exit 0; fi
rm -rf "$APP_DIR"
echo "Removed."