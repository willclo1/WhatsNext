# Deploying Six Degrees

Three pieces, three hosts, all on free tiers:

| Piece | Host | Notes |
|---|---|---|
| `movieFrontend/` — static Vite build | Cloudflare Pages | No sleep, git-push deploys |
| `CoreAPI/` — FastAPI | Render (free web service) | Sleeps when idle, see [Cold starts](#cold-starts) |
| Postgres + `pg_trgm` | Neon | Must support extensions |

Free tiers change often — confirm current limits before you build around them.

---

## 1. Database

Your local database reports 622 MB, but only ~1.6 MB of that is real data; the
rest is bloat left over from importing the full TMDB dump and then culling it
down. `pg_dump` exports live rows only, so **the dump is ~680 KB** and the
bloat never travels with it. Nothing needs fixing before you migrate.

To reclaim the space locally (optional, takes an exclusive lock):

```bash
psql -d movies -c "VACUUM FULL; REINDEX DATABASE movies;"
```

### Dump

```bash
pg_dump -d movies -Fc --no-owner --no-privileges -f movies.dump
```

The dump contains five tables — `movies`, `actors`, `movie_cast`, `games`,
`game_steps` — and issues `CREATE EXTENSION IF NOT EXISTS pg_trgm`.

To ship the film data without your local game history, add
`--exclude-table-data=games --exclude-table-data=game_steps`.

### Restore

Create a Neon project, then enable the extension **before** restoring — a
managed role may not be allowed to create it mid-restore:

```bash
psql "$NEON_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
pg_restore -d "$NEON_URL" --no-owner --no-privileges movies.dump
```

Verify the trigram search actually works, since it is the one thing a
restricted host can silently break:

```bash
psql "$NEON_URL" -c "SELECT name FROM actors WHERE similarity(name,'keanu') > 0.2 LIMIT 3;"
```

If that returns rows, `/actors/search` will work.

---

## 2. API

Render → New Web Service → point at this repo.

| Setting | Value |
|---|---|
| Root directory | `CoreAPI` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |

`--host 0.0.0.0` and `$PORT` are both required; binding to localhost or a fixed
port makes the service unreachable.

### Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string, rewritten as below |
| `TMDB_API_KEY` | your key |
| `ALLOWED_ORIGINS` | your deployed frontend origin — see step 4 |

**Rewrite the Neon URL's scheme.** Neon hands you `postgresql://…`, but this
app uses the psycopg 3 driver, so SQLAlchemy needs:

```
postgresql+psycopg://user:password@host/dbname?sslmode=require
```

Without `+psycopg`, SQLAlchemy reaches for `psycopg2`, which is not installed
and will not be.

### Python version

Pin it — hosts otherwise pick their own default, which may be older than the
one this was validated on (3.14.6). On Render, set `PYTHON_VERSION`.

---

## 3. Frontend

Cloudflare Pages → Create project → connect the repo.

| Setting | Value |
|---|---|
| Root directory | `movieFrontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

### Environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-api>.onrender.com` |
| `VITE_TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p` |

**These are read at build time, not run time.** Vite substitutes them into the
bundle during `npm run build`, so changing one means triggering a rebuild — and
if they are missing the build fails loudly in `src/config.ts`, which is
deliberate. Setting them in the host's runtime environment does nothing.

---

## 4. Connect the two

Once the frontend has a URL, set `ALLOWED_ORIGINS` on the API to that exact
origin and redeploy:

```
ALLOWED_ORIGINS=https://sixdegrees.pages.dev
```

Comma-separate to allow several (a custom domain plus the `.pages.dev` one).
Scheme and host must match exactly — no trailing slash, no path. Unset, it
falls back to `http://localhost:5173` for local development.

Confirm from the browser console on the deployed site:

```js
fetch("https://<your-api>.onrender.com/health").then(r => r.json()).then(console.log)
```

A CORS error here means `ALLOWED_ORIGINS` does not match your origin exactly.

---

## Gotchas

### Cold starts

Render's free tier sleeps after ~15 minutes idle, and the next visitor waits
through a cold boot. The app handles it correctly — the request is slow, not
broken — but it is the first thing people will notice. If that matters, move
the API to a host that scales to zero with faster wake-up (Google Cloud Run)
rather than one that sleeps.

Neon also scales to zero, adding a smaller delay on the first query.

### psycopg needs the binary wheel

`requirements.txt` pins `psycopg[binary]`, which bundles its own libpq. Plain
`psycopg` falls back to a pure-Python implementation that requires libpq on the
host — fine on your Mac, broken in a slim container. Do not relax that pin.

### Game variety

The database holds 500 actors and 2,620 films. That is plenty to host, but it
is a small pool for a connections game, and it is why `GameRepository.createGame`
recursively retries when it picks a start actor that dead-ends. Re-run the
importer in `movieDBBuild/` if you want more variety.

---

## Local development

```bash
psql -c "CREATE DATABASE movies;" && pg_restore -d movies movies.dump
cd CoreAPI && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn main:app --reload
```

```bash
cd movieFrontend && npm install && npm run dev
```

Both read `.env` at the repo root (`TMDB_API_KEY`, `DATABASE_URL`);
`movieFrontend/.env` holds the two `VITE_` variables.
