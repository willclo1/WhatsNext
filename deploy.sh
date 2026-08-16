#!/usr/bin/env bash
#
# Deploys Six Degrees to the Raspberry Pi. Run from anywhere; paths resolve
# relative to the repo.
#
#   ./deploy.sh                 code only (frontend + API)
#   ./deploy.sh --with-data     also push actors / movie_cast / terminus_pairs
#   ./deploy.sh --with-server   also rebuild and install the C++ web server
#   ./deploy.sh --check         preflight only, change nothing
#   ./deploy.sh --help
#
# The C++ server reads static files from disk on every request, so a frontend
# deploy needs no server restart -- only --with-server touches it.
#
# Safety properties worth knowing:
#
#   * The previous release is snapshotted on the Pi before anything is
#     overwritten, and restored automatically if the new one fails its health
#     check. A broken deploy self-heals rather than leaving the site down.
#   * Schema migrations run before the code that depends on them.
#   * actors is upserted through a staging table rather than replaced, because
#     games and game_steps hold foreign keys into it. Game history survives.
#   * --with-data refuses to run if the local data is empty, so a half-built
#     database cannot overwrite a working one.
#   * --with-server builds on the Pi and only swaps the binary in once the
#     build and its path tests pass, so a compile error never reaches
#     production.

set -euo pipefail

PI_HOST="${PI_HOST:-will_clore1@willspi.local}"
REMOTE="${REMOTE:-/opt/sixdegrees}"
SITE="${SITE:-https://sixdegreesofkevin123.duckdns.org}"
LOCAL_DB="${LOCAL_DB:-movies}"
REMOTE_DB="${REMOTE_DB:-postgresql://sixdegrees:sixdegrees@127.0.0.1/movies}"

# The web server lives in its own repository, beside this one by default.
SERVER_SRC="${SERVER_SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/C-Server}"
SERVER_REMOTE="${SERVER_REMOTE:-/opt/cserver}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

WITH_DATA=false
WITH_SERVER=false
CHECK_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --with-data)   WITH_DATA=true ;;
        --with-server) WITH_SERVER=true ;;
        --check)     CHECK_ONLY=true ;;
        -h|--help)   awk 'NR>1 && /^#/ {sub(/^# ?/,""); print; next} NR>1 {exit}' "$0"; exit 0 ;;
        *)           echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
    esac
done

if [[ -t 1 ]]; then
    BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; OFF=$'\033[0m'
else
    BOLD=""; DIM=""; RED=""; GREEN=""; OFF=""
fi

STARTED=$SECONDS
step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$OFF"; }
ok()   { printf '    %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
die()  { printf '\n%sdeploy failed:%s %s\n' "$RED" "$OFF" "$1" >&2; exit 1; }

# ---------------------------------------------------------------- preflight

step "Preflight"

command -v npm    >/dev/null || die "npm not found"
command -v rsync  >/dev/null || die "rsync not found"

ssh -o BatchMode=yes -o ConnectTimeout=10 "$PI_HOST" true 2>/dev/null \
    || die "cannot reach $PI_HOST over ssh"
ok "$PI_HOST reachable"

ssh "$PI_HOST" "test -d $REMOTE/CoreAPI/venv" \
    || die "$REMOTE/CoreAPI/venv missing on the Pi - not a deployed install"
ok "remote install present"

if $WITH_DATA; then
    command -v psql >/dev/null || die "psql not found (needed for --with-data)"

    read -r n_actors n_cast n_pairs <<<"$(psql -d "$LOCAL_DB" -tAF' ' -c "
        SELECT (SELECT count(*) FROM actors),
               (SELECT count(*) FROM movie_cast),
               (SELECT count(*) FROM terminus_pairs)" 2>/dev/null)" \
        || die "cannot read local database '$LOCAL_DB'"

    # Shipping an empty table would take the live game down, and the failure
    # would only surface when a player tried to start a route.
    [[ "${n_pairs:-0}" -gt 0 ]] \
        || die "terminus_pairs is empty locally - run movieDBBuild/build_graph.py first"
    [[ "${n_cast:-0}" -gt 0 ]] \
        || die "movie_cast is empty locally - run movieDBBuild/rebuild_cast.py first"

    ok "local data: $n_actors actors, $n_cast cast links, $n_pairs pairs"
fi

if $WITH_SERVER; then
    [[ -d "$SERVER_SRC" ]] \
        || die "C++ server source not found at $SERVER_SRC (set SERVER_SRC)"

    [[ -f "$SERVER_SRC/Makefile" ]] \
        || die "$SERVER_SRC has no Makefile"

    ssh "$PI_HOST" "test -f /etc/cserver/sixdegrees.conf" \
        || die "the Pi has no /etc/cserver/sixdegrees.conf - server not installed yet"

    ok "server source at $SERVER_SRC"
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    printf '    %suncommitted changes in the working tree%s\n' "$DIM" "$OFF"
fi

if $CHECK_ONLY; then
    printf '\n%sPreflight passed.%s Nothing was changed.\n' "$BOLD" "$OFF"
    exit 0
fi

# ------------------------------------------------------------------- build

step "Building frontend"
# VITE_* values are inlined at build time, so the production API URL has to be
# set here — the Pi never reads them.
(
    cd movieFrontend
    VITE_API_URL="$SITE/api" \
    VITE_TMDB_IMAGE_URL="https://image.tmdb.org/t/p" \
        npm run build >/dev/null
) || die "frontend build failed (run 'npm run build' in movieFrontend to see why)"
ok "$(find movieFrontend/dist -type f | wc -l | tr -d ' ') files"

# ---------------------------------------------------------------- snapshot

step "Snapshotting current release"
ssh "$PI_HOST" "
    set -e
    rm -rf $REMOTE/.rollback
    mkdir -p $REMOTE/.rollback
    cp -a $REMOTE/CoreAPI $REMOTE/.rollback/CoreAPI
    cp -a $REMOTE/movieFrontend/dist $REMOTE/.rollback/dist
    # The web server binary is owned by root, so copying it needs sudo.
    sudo cp -a $SERVER_REMOTE/server $REMOTE/.rollback/server 2>/dev/null || true
" || die "could not snapshot the current release"
ok "rollback point saved"

rollback() {
    printf '\n%srolling back%s\n' "$RED" "$OFF" >&2
    ssh "$PI_HOST" "
        set -e
        rm -rf $REMOTE/CoreAPI $REMOTE/movieFrontend/dist
        cp -a $REMOTE/.rollback/CoreAPI $REMOTE/CoreAPI
        cp -a $REMOTE/.rollback/dist $REMOTE/movieFrontend/dist

        if [ -f $REMOTE/.rollback/server ]; then
            sudo install -o root -g root -m 755 \
                $REMOTE/.rollback/server $SERVER_REMOTE/server.new
            sudo mv -f $SERVER_REMOTE/server.new $SERVER_REMOTE/server
            sudo systemctl restart cserver
        fi

        sudo systemctl restart sixdegrees-api
    " >/dev/null 2>&1 || printf '%srollback itself failed - the Pi needs a look%s\n' "$RED" "$OFF" >&2
}

# -------------------------------------------------------------------- ship

step "Shipping code"
rsync -az --delete movieFrontend/dist/ "$PI_HOST:$REMOTE/movieFrontend/dist/"
rsync -az --delete \
    --exclude venv --exclude __pycache__ --exclude '.env' --exclude '*.pyc' \
    CoreAPI/ "$PI_HOST:$REMOTE/CoreAPI/"
ok "frontend and API in place"

step "Applying schema migrations"
# Idempotent, and always before the restart: code must never reach a Pi whose
# schema predates it.
ssh "$PI_HOST" "psql '$REMOTE_DB' -q -v ON_ERROR_STOP=1" < CoreAPI/schema.sql \
    || { rollback; die "schema migration failed"; }
ok "schema current"

step "Syncing Python dependencies"
ssh "$PI_HOST" "$REMOTE/CoreAPI/venv/bin/pip install -q -r $REMOTE/CoreAPI/requirements.txt" \
    || { rollback; die "pip install failed"; }
ok "dependencies current"

# ------------------------------------------------------------------ server

if $WITH_SERVER; then
    step "Building web server on the Pi"

    # Built on the Pi rather than cross-compiled: it links against the Pi's
    # own OpenSSL, and a mismatch there would only surface at runtime.
    rsync -az --delete \
        --exclude .git --exclude '*.o' --exclude server --exclude 'test/pathtest' \
        "$SERVER_SRC/" "$PI_HOST:~/C-Server/"

    ssh "$PI_HOST" "cd ~/C-Server && make clean >/dev/null && make -j4" \
        >/dev/null 2>&1 || {
            ssh "$PI_HOST" "cd ~/C-Server && make -j4 2>&1 | grep -E 'error|Error' | head -20" >&2
            die "web server build failed"
        }
    ok "compiled"

    # Path normalisation is the security-critical part. A binary that fails
    # these must not reach a public listener.
    ssh "$PI_HOST" "cd ~/C-Server && g++ -std=c++20 -pthread -I. -O1 \
        -o test/pathtest test/PathTest.cpp HTTP/HttpParser.cpp Net/Stream.cpp \
        -lssl -lcrypto && ./test/pathtest > /tmp/pathtest.out 2>&1" \
        || {
            ssh "$PI_HOST" "grep FAIL /tmp/pathtest.out | head" >&2
            die "path traversal tests failed - binary not installed"
        }
    ok "path tests passed"

    # Write beside the target and rename over it. Copying onto a running
    # binary fails with ETXTBSY; rename only swaps the directory entry, so
    # the running process keeps the old inode until it restarts.
    ssh "$PI_HOST" "
        set -e
        sudo install -o root -g root -m 755 ~/C-Server/server $SERVER_REMOTE/server.new
        sudo mv -f $SERVER_REMOTE/server.new $SERVER_REMOTE/server
        sudo systemctl restart cserver
    " || { rollback; die "installing the web server failed"; }

    for _ in $(seq 1 15); do
        sleep 1
        [[ "$(curl -fsS -o /dev/null -w '%{http_code}' "$SITE" 2>/dev/null)" == "200" ]] && break
    done
    ok "web server restarted"
fi

# -------------------------------------------------------------------- data

if $WITH_DATA; then
    step "Backing up remote data"
    ssh "$PI_HOST" "pg_dump '$REMOTE_DB' -Fc -f /tmp/predeploy.dump" \
        || die "remote backup failed - refusing to overwrite data"
    ok "remote backup at /tmp/predeploy.dump"

    step "Exporting local data"
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT

    psql -d "$LOCAL_DB" -q -c "\copy (SELECT actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus FROM actors) TO '$TMP/actors.csv' CSV"
    psql -d "$LOCAL_DB" -q -c "\copy (SELECT movie_id,actor_id,character,cast_order FROM movie_cast) TO '$TMP/movie_cast.csv' CSV"
    psql -d "$LOCAL_DB" -q -c "\copy (SELECT start_actor_id,target_actor_id,hops FROM terminus_pairs) TO '$TMP/terminus_pairs.csv' CSV"
    ok "$(du -sh "$TMP" | cut -f1) exported"

    step "Loading data"
    scp -q "$TMP"/*.csv "$PI_HOST:/tmp/"

    # One transaction: either the whole dataset lands or none of it does.
    ssh "$PI_HOST" "psql '$REMOTE_DB' -v ON_ERROR_STOP=1 -q" <<'SQL' \
        || { rollback; die "data load failed - restore with: pg_restore -c -d DB /tmp/predeploy.dump"; }
BEGIN;

-- Staging, so actor rows referenced by existing games survive the reload.
CREATE TEMP TABLE actors_new (LIKE actors) ON COMMIT DROP;
\copy actors_new (actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus) FROM '/tmp/actors.csv' CSV

INSERT INTO actors (actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus)
SELECT actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus FROM actors_new
ON CONFLICT (actor_id) DO UPDATE SET
    name                 = EXCLUDED.name,
    profile_path         = EXCLUDED.profile_path,
    known_for_department = EXCLUDED.known_for_department,
    popularity           = EXCLUDED.popularity,
    headline_count       = EXCLUDED.headline_count,
    costar_degree        = EXCLUDED.costar_degree,
    is_terminus          = EXCLUDED.is_terminus;

-- Both are fully derived, so replacing wholesale beats reconciling.
TRUNCATE movie_cast;
\copy movie_cast (movie_id,actor_id,character,cast_order) FROM '/tmp/movie_cast.csv' CSV

TRUNCATE terminus_pairs;
\copy terminus_pairs (start_actor_id,target_actor_id,hops) FROM '/tmp/terminus_pairs.csv' CSV

COMMIT;
SQL

    ssh "$PI_HOST" "rm -f /tmp/actors.csv /tmp/movie_cast.csv /tmp/terminus_pairs.csv"
    ok "data loaded"
fi

# ----------------------------------------------------------------- restart

step "Restarting API"
ssh "$PI_HOST" "sudo systemctl restart sixdegrees-api" \
    || { rollback; die "systemctl restart failed"; }

# Poll rather than sleep a fixed amount: a cold start varies, and a service
# that never answers must fail here with an accurate message rather than
# further down where the symptom looks like a data problem.
healthy=false
for _ in $(seq 1 15); do
    sleep 1
    if [[ "$(curl -fsS -o /dev/null -w '%{http_code}' "$SITE/api/health" 2>/dev/null)" == "200" ]]; then
        healthy=true
        break
    fi
done

if ! $healthy; then
    rollback
    die "API did not come up within 15s - check: ssh $PI_HOST 'journalctl -u sixdegrees-api -n 40 --no-pager'"
fi
ok "service up"

# ------------------------------------------------------------------ verify

step "Verifying"

site=$(curl -s -o /dev/null -w '%{http_code}' "$SITE")
[[ "$site" == "200" ]] || { rollback; die "site returned $site"; }
ok "site 200"

# A full round trip: creating a game proves terminus_pairs is populated, and
# the token check proves code and schema agree. Health alone proves neither.
game=$(curl -fsS -X POST "$SITE/api/games" 2>/dev/null) \
    || { rollback; die "could not create a game - is terminus_pairs populated?"; }

game_id=$(printf '%s' "$game" | sed -n 's/.*"game_id":\([0-9]*\).*/\1/p')
token=$(printf '%s'  "$game" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

[[ -n "$game_id" && -n "$token" ]] || { rollback; die "game response missing id or token"; }
ok "game $game_id created with a token"

denied=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$SITE/api/games/$game_id")
[[ "$denied" == "403" ]] || { rollback; die "ownership check is not enforced (got $denied)"; }
ok "unauthorised delete refused"

curl -s -o /dev/null -X DELETE "$SITE/api/games/$game_id" -H "X-Game-Token: $token"
ok "test game cleaned up"

for unit in cserver sixdegrees-api; do
    state=$(ssh "$PI_HOST" "systemctl is-active $unit" 2>/dev/null || true)
    [[ "$state" == "active" ]] || { rollback; die "$unit is $state"; }
done
ok "cserver and sixdegrees-api active"

ssh "$PI_HOST" "rm -rf $REMOTE/.rollback"

printf '\n%sDeployed in %ss%s  %s\n' \
    "$BOLD" "$((SECONDS - STARTED))" "$OFF" "$SITE"
