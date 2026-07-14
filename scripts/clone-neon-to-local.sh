#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "WARNING: scripts/clone-neon-to-local.sh is deprecated." >&2
echo "Use scripts/clone-production-db-to-local.sh instead." >&2

exec "${SCRIPT_DIR}/clone-production-db-to-local.sh"
