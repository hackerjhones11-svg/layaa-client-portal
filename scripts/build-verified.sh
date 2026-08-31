#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec bash "${script_dir}/sites-env.sh" -- bash "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

# Cloudflare Pages serves only dist/client. Vinext also emits a Worker
# wrangler manifest under dist/server. Replace it with a minimal Pages config
# so Cloudflare's post-build validator does not reject Worker-only fields
# (main/assets/rules), while its redirected config path remains valid.
pages_manifest="${SITES_PROJECT_ROOT}/dist/server/wrangler.json"
node - "${pages_manifest}" <<'NODE'
const fs = require("node:fs");
const path = process.argv[2];
fs.writeFileSync(
  path,
  `${JSON.stringify({
    name: "layaa-client-portal",
    compatibility_date: "2026-08-31",
    pages_build_output_dir: "../client",
  }, null, 2)}\n`,
);
NODE
