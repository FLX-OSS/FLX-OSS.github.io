#!/usr/bin/env bash

set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Stop a previous static preview, rebuild local content, and serve the new output.
npm run preview -- stop || true
npm exec -- astro build
npm run preview
