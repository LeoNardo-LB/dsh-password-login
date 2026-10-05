#!/usr/bin/env bash
# dsh-password-login local E2E: five phases against a real dsh web host on an
# isolated DSH_HOME. Non-loopback peer classes are covered by the docker
# phase (e2e/docker/run.sh). Every phase verdict must be PASS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="${E2E_BASE:-/tmp/dsh-pw-e2e}"
PORT="${E2E_PORT:-8180}"
BASE="http://127.0.0.1:${PORT}"
P=/plugins/dsh-password-login
EVIDENCE="$BASE_DIR/evidence"
mkdir -p "$EVIDENCE"

log() { printf '\n== %s ==\n' "$*"; }
fail() { printf 'E2E FAILED: %s\n' "$*" >&2; exit 1; }

setup_home() {
  local home="$1"
  rm -rf "$home"
  mkdir -p "$home/profiles/web"
  cat > "$home/profiles/web/package.json" << 'EOF'
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } }
}
EOF
  echo '[]' > "$home/profiles/web/cordis.yml"
  cat > "$home/profiles/web/pnpm-workspace.yaml" << 'EOF'
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
EOF
}

mount_plugin() {
  local home="$1" attempt
  for attempt in 1 2 3; do
    if DSH_HOME="$home" dsh plugin --profile web add "$ROOT" >>"$EVIDENCE/mount.log" 2>&1; then
      if DSH_HOME="$home" dsh --profile web --dump-config 2>/dev/null | grep -q 'dsh-password-login'; then
        return 0
      fi
    fi
    echo "mount attempt ${attempt} failed; retrying" >> "$EVIDENCE/mount.log"
    sleep 2
  done
  fail "plugin did not mount under $home (see $EVIDENCE/mount.log)"
}

boot() { # boot <home> [global dsh options like --patch <yml>]
  local home="$1"; shift
  pkill -f "dsh .*--port ${PORT}" 2>/dev/null || true
  sleep 0.5
  if [[ $# -eq 0 ]]; then
    DSH_HOME="$home" dsh web --host 127.0.0.1 --port "$PORT" --no-open >>"$EVIDENCE/dsh-web.log" 2>&1 &
  else
    DSH_HOME="$home" dsh --profile web "$@" --host 127.0.0.1 --port "$PORT" --no-open >>"$EVIDENCE/dsh-web.log" 2>&1 &
  fi
  echo $!
}

wait_up() {
  for _ in $(seq 1 60); do
    if curl -s -o /dev/null --max-time 1 "$BASE/"; then return 0; fi
    sleep 1
  done
  fail "host did not come up"
}

wait_port_clear() {
  for _ in $(seq 1 30); do
    if ! ss -tln 2>/dev/null | grep -q ":${PORT} "; then return 0; fi
    sleep 1
  done
  fail "port ${PORT} still occupied"
}

drive() { # drive <phase>
  local phase="$1" state_file="$EVIDENCE/state.env"
  if [[ -f "$state_file" ]]; then export E2E_COOKIE_R2="$(cat "$state_file")"; fi
  E2E_STATE_FILE="$state_file" node "$ROOT/e2e/driver.mjs" --base="$BASE" --phase="$phase" | tee "$EVIDENCE/phase-$phase.jsonl"
}

stop_host() {
  local pid="$1"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  pkill -f "dsh .*--port ${PORT}" 2>/dev/null || true
  wait_port_clear
}

# ---------------------------------------------------------------- Phase A
log 'Phase A: fresh home, unset → full lifecycle'
HOME_A="$BASE_DIR/home-a"; setup_home "$HOME_A"; mount_plugin "$HOME_A"
: > "$EVIDENCE/dsh-web.log"
PID=$(boot "$HOME_A"); wait_up
drive A || fail 'phase A'
stop_host "$PID"

# ---------------------------------------------------------------- Phase B
log 'Phase B: pure restart (password untouched) must not revoke'
PID=$(boot "$HOME_A"); wait_up
drive B || fail 'phase B'
stop_host "$PID"

# ---------------------------------------------------------------- Phase C
log 'Phase C: config-channel password change revokes once'
PATCH=$(grep -rl 'next-pass' "$HOME_A/profiles/web" --include='*.yml' | head -1)
[[ -n "${PATCH:-}" ]] || fail "persisted password patch not found under $HOME_A"
sed -i 's/next-pass/cfgpass/g' "$PATCH"
echo "edited: $PATCH"
PID=$(boot "$HOME_A"); wait_up
drive C || fail 'phase C'
stop_host "$PID"

# ---------------------------------------------------------------- Phase D
log 'Phase D: enabled=false behaves as not installed'
cat > "$BASE_DIR/disable.yml" << 'EOF'
- id: dsh-password-login
  config:
    enabled: false
EOF
PID=$(boot "$HOME_A" --patch "$BASE_DIR/disable.yml"); wait_up
drive D || fail 'phase D'
stop_host "$PID"

# ---------------------------------------------------------------- Phase E
log 'Phase E: env-seeded password (DSH_PASSWORD_LOGIN_PASSWORD)'
HOME_E="$BASE_DIR/home-e"; setup_home "$HOME_E"; mount_plugin "$HOME_E"
PID=$(DSH_PASSWORD_LOGIN_PASSWORD=envseed boot "$HOME_E"); wait_up
drive E || fail 'phase E'
stop_host "$PID"

log 'ALL LOCAL PHASES PASS'
