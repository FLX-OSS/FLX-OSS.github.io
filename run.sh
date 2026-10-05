#!/usr/bin/env bash

set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Stop a previous static preview, rebuild local content, and serve the new output.
npm run dev
