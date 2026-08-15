#!/usr/bin/env bash
#
# Deploys Six Degrees to the Raspberry Pi. Run from the repo root on the Mac.
#
#   ./deploy.sh              code only (frontend + API), ~20s
#   ./deploy.sh --with-data  also pushes actors / movie_cast / terminus_pairs
#
# Code-only is the normal path. Use --with-data after re-running
# movieDBBuild/rebuild_cast.py, or after regenerating terminus_pairs.
#
# Game history is preserved: actors is upserted through a staging table rather
# than replaced, because games.start_actor_id and game_steps.actor_id have
# foreign keys into it.

set -euo pipefail

PI_HOST="${PI_HOST:-will_clore1@willspi.local}"
REMOTE="${REMOTE:-/opt/sixdegrees}"
SITE="${SITE:-https://sixdegreesofkevin123.duckdns.org}"
LOCAL_DB="${LOCAL_DB:-movies}"
REMOTE_DB="${REMOTE_DB:-postgresql://sixdegrees:sixdegrees@127.0.0.1/movies}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

WITH_DATA=false
[[ "${1:-}" == "--with-data" ]] && WITH_DATA=true

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step "Building frontend"
# VITE_* values are baked in at build time, so the production API URL has to be
# set here rather than on the Pi.
(
  cd movieFrontend
  VITE_API_URL="$SITE/api" \
  VITE_TMDB_IMAGE_URL="https://image.tmdb.org/t/p" \
    npm run build
)

step "Shipping frontend"
rsync -az --delete movieFrontend/dist/ "$PI_HOST:$REMOTE/movieFrontend/dist/"

step "Shipping API"
rsync -az --delete \
  --exclude venv --exclude __pycache__ --exclude '.env' --exclude '*.pyc' \
  CoreAPI/ "$PI_HOST:$REMOTE/CoreAPI/"

step "Syncing Python dependencies"
ssh "$PI_HOST" "$REMOTE/CoreAPI/venv/bin/pip install -q -r $REMOTE/CoreAPI/requirements.txt"

if $WITH_DATA; then
  step "Exporting data"
  TMP=$(mktemp -d)
  trap 'rm -rf "$TMP"' EXIT

  psql -d "$LOCAL_DB" -q -c "\copy (SELECT actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus FROM actors) TO '$TMP/actors.csv' CSV"
  psql -d "$LOCAL_DB" -q -c "\copy (SELECT movie_id,actor_id,character,cast_order FROM movie_cast) TO '$TMP/movie_cast.csv' CSV"
  psql -d "$LOCAL_DB" -q -c "\copy (SELECT start_actor_id,target_actor_id,hops FROM terminus_pairs) TO '$TMP/terminus_pairs.csv' CSV"

  step "Uploading data"
  scp -q "$TMP"/*.csv "$PI_HOST:/tmp/"

  step "Loading data"
  ssh "$PI_HOST" "psql '$REMOTE_DB' -v ON_ERROR_STOP=1 -q" <<'SQL'
ALTER TABLE actors
    ADD COLUMN IF NOT EXISTS profile_path         varchar(255),
    ADD COLUMN IF NOT EXISTS known_for_department varchar(50),
    ADD COLUMN IF NOT EXISTS popularity           double precision,
    ADD COLUMN IF NOT EXISTS headline_count       integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS costar_degree        integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_terminus          boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS terminus_pairs (
    start_actor_id  int      NOT NULL,
    target_actor_id int      NOT NULL,
    hops            smallint NOT NULL,
    PRIMARY KEY (start_actor_id, target_actor_id)
);

BEGIN;

-- Staging, so existing actor rows referenced by games survive the reload.
CREATE TEMP TABLE actors_new (LIKE actors) ON COMMIT DROP;
\copy actors_new (actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus) FROM '/tmp/actors.csv' CSV

INSERT INTO actors (actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus)
SELECT actor_id,name,profile_path,known_for_department,popularity,headline_count,costar_degree,is_terminus FROM actors_new
ON CONFLICT (actor_id) DO UPDATE SET
    name = EXCLUDED.name,
    profile_path = EXCLUDED.profile_path,
    known_for_department = EXCLUDED.known_for_department,
    popularity = EXCLUDED.popularity,
    headline_count = EXCLUDED.headline_count,
    costar_degree = EXCLUDED.costar_degree,
    is_terminus = EXCLUDED.is_terminus;

-- Both are fully derived, so replacing wholesale is safer than reconciling.
TRUNCATE movie_cast;
\copy movie_cast (movie_id,actor_id,character,cast_order) FROM '/tmp/movie_cast.csv' CSV

TRUNCATE terminus_pairs;
\copy terminus_pairs (start_actor_id,target_actor_id,hops) FROM '/tmp/terminus_pairs.csv' CSV

COMMIT;

SELECT 'actors' t, count(*) FROM actors
UNION ALL SELECT 'movie_cast', count(*) FROM movie_cast
UNION ALL SELECT 'terminus_pairs', count(*) FROM terminus_pairs;
SQL

  ssh "$PI_HOST" "rm -f /tmp/actors.csv /tmp/movie_cast.csv /tmp/terminus_pairs.csv"
fi

step "Restarting API"
ssh "$PI_HOST" "sudo systemctl restart sixdegrees-api"
sleep 3

step "Verifying"
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE")
api=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/api/health")
echo "site $code   api $api"

if [[ "$code" != "200" || "$api" != "200" ]]; then
  echo "FAILED - check: ssh $PI_HOST 'journalctl -u sixdegrees-api -n 30 --no-pager'" >&2
  exit 1
fi

# A game can only be created if terminus_pairs is populated, so this is the
# check that actually proves data and code agree.
curl -s -X POST "$SITE/api/games" | head -c 160
echo
printf '\n\033[1mDeployed: %s\033[0m\n' "$SITE"
