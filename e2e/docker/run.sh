#!/usr/bin/env bash
# dsh-password-login docker E2E: non-loopback peer classes. A real dsh host
# runs in the container bound to its bridge IP (the CLI guards only the
# literal 0.0.0.0); probes from the host arrive via the docker bridge as
# NON-loopback remoteAddresses, covering the fail-closed matrix local
# loopback testing cannot reach. True loopback peers come from inside the
# container via curl --interface 127.0.0.1 source binding.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE=dsh-pw-e2e:latest
CONTAINER=dsh-pw-e2e
HOST_PORT=8181

log() { printf '\n== %s ==\n' "$*"; }
fail() { printf 'DOCKER E2E FAILED: %s\n' "$*" >&2; docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; exit 1; }

log 'build image'
docker build -q -t "$IMAGE" "$ROOT/e2e/docker" >/dev/null || fail 'image build'

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -p "${HOST_PORT}:8180" -v "$ROOT:/plugin:ro" "$IMAGE" sleep infinity >/dev/null || fail 'run container'

CT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER")
[[ -n "$CT_IP" ]] || fail 'no container IP'
echo "container ip: $CT_IP"

in_ct() { docker exec "$CONTAINER" bash -c "$*"; }
# Loopback-peer probe: connect to 127.0.0.1 inside the container.
ct_loopback() { docker exec "$CONTAINER" curl -s "$@"; }
# Non-loopback peer probe from inside the container (source = bridge IP).
ct_remote() { docker exec "$CONTAINER" curl -s "$@"; }

log 'setup profile + mount plugin'
in_ct 'mkdir -p /e2e/home/profiles/web && cd /e2e/home/profiles/web \
  && printf "{\"name\":\"dsh-profile-web\",\"private\":true,\"dependencies\":{},\"dsh\":{\"profile\":{\"bundles\":[\"@deepseek-ai/dsh-base\",\"@deepseek-ai/dsh-web-app\"]}}}" > package.json \
  && echo "[]" > cordis.yml \
  && printf "packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n" > pnpm-workspace.yaml' || fail 'profile init'
in_ct 'DSH_HOME=/e2e/home dsh plugin --profile web add /plugin' >/dev/null || fail 'plugin mount'
in_ct 'DSH_HOME=/e2e/home dsh --profile web --dump-config' 2>/dev/null | grep -q dsh-password-login || fail 'plugin not in composed tree'

log 'boot dsh web (0.0.0.0:8180 via webserver config patch — the real LAN deployment form; the CLI flag itself guards 0.0.0.0)'
in_ct "printf -- '- id: webserver\n  config:\n    host: 0.0.0.0\n    port: 8180\n' > /e2e/lan.yml"
docker exec -d "$CONTAINER" bash -c 'DSH_HOME=/e2e/home dsh --profile web --patch /e2e/lan.yml --no-open > /e2e/dsh-web.log 2>&1'
for _ in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 1 "http://localhost:${HOST_PORT}/"; then break; fi
  sleep 1
done
curl -s -o /dev/null --max-time 2 "http://localhost:${HOST_PORT}/" || { in_ct 'tail -5 /e2e/dsh-web.log'; fail 'host did not come up'; }

pass=0; total=0
check() { # check <name> <expected> <actual>
  total=$((total + 1))
  if [[ "$2" == "$3" ]]; then
    pass=$((pass + 1)); printf 'PASS %s (%s)\n' "$1" "$3"
  else
    printf 'FAIL %s (expected %s, got %s)\n' "$1" "$2" "$3"
  fi
}

log 'NON-LOOPBACK matrix (from the host through the published port)'
P="plugins/dsh-password-login"
check 'unset /session → 403 (fail-closed)' 403 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/$P/session")"
check 'unset /login → 403' 403 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/$P/login")"
check 'unset /rotate first-set → 403' 403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"next":"dockpass"}' "http://localhost:${HOST_PORT}/$P/rotate")"
check 'cross-peer sanity: inside-remote /session → 403 too' 403 "$(ct_remote -o /dev/null -w '%{http_code}' "http://$CT_IP:8180/$P/session")"

log 'LOOPBACK matrix (inside the container via 127.0.0.1)'
check 'loopback /session free-mint → 200' 200 "$(ct_loopback -o /dev/null -w '%{http_code}' "http://127.0.0.1:8180/$P/session")"
check 'loopback first-set /rotate → 200' 200 "$(ct_loopback -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"next":"dockpass"}' "http://127.0.0.1:8180/$P/rotate")"

log 'PASSWORD mode from the NON-LOOPBACK side (knowledge is the key)'
check 'non-loopback /session no auth → 401' 401 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/$P/session")"
check 'non-loopback /session wrong bearer → 401' 401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer nope' "http://localhost:${HOST_PORT}/$P/session")"
SESSION_HEADERS=$(curl -s -D - -o /dev/null -H 'Authorization: Bearer dockpass' "http://localhost:${HOST_PORT}/$P/session")
check 'non-loopback /session right bearer → 200' 200 "$(printf '%s' "$SESSION_HEADERS" | head -1 | tr -d '\r' | grep -o '[0-9][0-9][0-9]' | head -1)"
COOKIE=$(printf '%s' "$SESSION_HEADERS" | grep -i '^set-cookie: dsh-auth-' | head -1 | cut -d' ' -f2- | cut -d';' -f1)
[[ -n "$COOKIE" ]] || fail 'no cookie minted for correct bearer'
check 'minted cookie accepted at root (golden, cross-peer)' 200 "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $COOKIE" "http://localhost:${HOST_PORT}/")"
API_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Cookie: $COOKIE" -H 'content-type: application/json' -d '{}' "http://localhost:${HOST_PORT}/api/remote.mux")
[[ "$API_CODE" != "401" ]] && check 'minted cookie passes /api admission (cross-peer)' ok ok || check 'minted cookie passes /api admission (cross-peer)' ok "bad($API_CODE)"
check 'non-loopback /login Basic right → 303' 303 "$(curl -s -o /dev/null -w '%{http_code}' -u ':dockpass' "http://localhost:${HOST_PORT}/$P/login")"

log 'teardown'
docker rm -f "$CONTAINER" >/dev/null

if [[ "$pass" -eq "$total" ]]; then
  printf '\nDOCKER E2E PASS (%d/%d)\n' "$pass" "$total"
else
  printf '\nDOCKER E2E FAIL (%d/%d)\n' "$pass" "$total"
  exit 1
fi
