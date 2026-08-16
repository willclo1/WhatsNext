# Six Degrees — project handoff

Context for picking this project up cold. Updated 2026-08-16.

**Live:** https://sixdegreesofkevin123.duckdns.org
**Hosting:** self-hosted on a Raspberry Pi (Debian 13 / Trixie, aarch64, 4 GB) at home.

---

## What the project is

A "six degrees of Kevin Bacon" game. You're given two actors and connect them
by naming a film one appeared in, then jumping to a co-star from that film's
cast, repeating until you reach the target.

```
movieSuggestor/
├── CoreAPI/          FastAPI backend (routers → services → repository)
├── movieFrontend/    React 19 + Vite 7 + Tailwind v4
├── movieDBBuild/     TMDB importers + graph builder (offline, not the running app)
├── deploy.sh         one-command deploy from the Mac
└── DEPLOY.md         host setup notes (STALE — see "Known gaps")

~/C-Server/           the web server, a separate repo (see "Serving")
```

---

## Architecture

**Backend** — FastAPI, SQLAlchemy 2.x, Postgres 17 via `psycopg[binary]`.
Layered: `routers/` → `services/` → `repository/`. Entry point `main:app`.
Config from env via `configSettings/config.py`, which **raises if
`TMDB_API_KEY` or `DATABASE_URL` is missing** — even though the API itself
never calls TMDB.

**Frontend** — no router; a five-phase state machine in
`features/game/useGame.ts` (`idle | loading | playing | won | error`) drives
everything. Files are grouped by feature, not by type. Design tokens live in
`src/design/tokens.css` and are the single source of truth — no hex values
belong in components.

**Serving** — a **hand-written C++ web server** (`~/C-Server`) terminates TLS,
serves the built SPA, and reverse-proxies `/api/*` to uvicorn on
`127.0.0.1:8000`. It replaced Caddy on 2026-08-16. Site and API share an
origin, so CORS is never exercised in production.

---

## The web server (C-Server)

Originally a university team project (Nolen, Newton, Clore, Mauldin, Crayne)
that served static files over plain HTTP. Extended to face the public
internet.

```
C-Server/
├── server.cpp          listeners, accept loop, signals
├── Config/             config file + flags + route table
├── Net/                Stream abstraction (plain | TLS), TlsContext
├── HTTP/               HttpParser, HttpResponse, HttpHandler, StaticFiles, Proxy
├── Thread/ThreadPool   bounded queue, fixed workers
├── Logger/             error log + Common Log Format access log
├── Stats/              counters
└── test/PathTest.cpp   path traversal tests
```

**Only third-party dependency is OpenSSL.** plog was removed; logging is
self-contained.

### Things to know before changing it

- **TLS certificates are not managed by the server.** certbot issues and
  renews them (webroot validation); the server reads the PEMs at startup. A
  deploy hook at `/etc/letsencrypt/renewal-hooks/deploy/restart-cserver.sh`
  restarts the server after renewal — **without it, a renewed certificate
  would not take effect** because certs load once at boot.
- **`X-Forwarded-For` is load-bearing.** The FastAPI rate limiter keys on
  client address and uvicorn runs with `--proxy-headers`. If the proxy stops
  sending that header, every request looks like `127.0.0.1` and the whole
  internet shares one rate-limit bucket. `Proxy.cpp` strips any
  client-supplied copy first, or anyone could spoof an address.
- **Runs as a non-root `cserver` user**, binding 80/443 via
  `CAP_NET_BIND_SERVICE` and reading the private key through the `ssl-cert`
  group. Unit is hardened (`ProtectSystem=strict`, `NoNewPrivileges`,
  `MemoryDenyWriteExecute`, docroot read-only).
- **Config** lives at `/etc/cserver/sixdegrees.conf` on the Pi; the source of
  truth is `C-Server/sixdegrees.conf`. Longest route prefix wins.

### Security bugs fixed in the inherited code

| Bug | Detail |
|---|---|
| **Path traversal was exploitable** | The parser stripped `../` substrings in a loop. `....//` inverts that: removing the inner `../` *produces* `../`. Now percent-decoded and resolved segment-by-segment on a stack, plus a `realpath` containment check in `StaticFiles` so a symlink can't escape either. `test/PathTest.cpp` covers it — 26/26 pass. |
| **Requests truncated at 1023 bytes** | One fixed-buffer `read()`, parse whatever arrived. Now incremental: read until headers complete, then exactly `Content-Length` bytes, bounded by config. |
| **Data races** | `currentNumThreads` was written from the accept thread and workers with no synchronisation; `statusCounts` was mutated without its mutex. `Stats` now owns its locking and its maps are private. |
| **~8 concurrent users → 503** | Thread-per-connection capped at 50, with browsers opening ~6 connections each. Now a bounded queue with fixed workers. |
| **Duplicate `Content-Length`** | Introduced during this work: forwarding the client's header *and* setting our own. A request-smuggling vector. Caught by capturing the raw upstream request. |

---

## Design direction (deliberate, don't undo casually)

The UI is a **pocket transit map**. The game is wayfinding: you plot a route
between two termini and each film is an interchange.

- **Palette** — pale map stock `#EDF0F4`, ink `#0D1520`, signage blue
  `#0B69C7` (track travelled), signal red `#C81B33` (terminus ahead).
- **Type** — Barlow Condensed (stations), Barlow (prose), Martian Mono (data).
- **Signature** — `features/game/RouteMap.tsx`: one continuous rail, solid
  behind you, dashed ahead, posters clipped in as interchanges.

State is expressed **structurally**, never with status pills — "you are here"
is a ring plus the attached panel; the goal is dashed track. Built to an
explicit brief banning emoji, status pills, gradient text, glassmorphism,
glowing borders, and three-feature-card rows. An earlier gold/velvet "cinema
marquee" direction was **rejected** — don't drift back toward it.

The `frontend-design` skill (`~/.claude/skills/frontend-design/`) informed
this and is worth reading before UI changes.

**Open question:** research into peer sites (Framed, CineNerdle, A24) suggests
the current start screen leads with words where the best movie games lead with
imagery. Framed puts the film still front and centre, above the fold, playable
immediately. That critique was in progress when work moved to the server.

---

## The data problem, and how it was fixed

This was the main body of work and the most important thing to understand.

### Symptom

81 games played, **70 abandoned at step 0**. Players opened the board and made
no move.

### Diagnosis

Not connectivity — **discoverability**. The graph was fully connected (any two
actors within 2 hops), but the path existed only in the database:

| | Before | After |
|---|---|---|
| Actors | 500 | 14,345 |
| Cast links | 8,147 | 31,637 |
| Avg cast per film | 3.7 | 11.8 |
| Films with 0–1 cast (unusable) | 1,000 of 2,686 (37%) | 0 |
| Actors with photos | 0 | 13,220 |

The old `cast_importer.py` silently dropped rows in its batching loop — on
refetch, all 2,686 films returned full credits. Replaced, not fixed, by
**`movieDBBuild/rebuild_cast.py`**.

### Selection rules now in force

- **Movie corpus** — `vote_count` filtered (currently ~2,686 films at ≥1000).
- **Cast depth** — top 12 billed only (`cast_order <= 12`), and only
  `known_for_department == "Acting"` so directors' cameos aren't traversable.
- **"Everyone knows" = headline count** — films where an actor is billed
  `cast_order <= 3` in a film with `vote_count >= 3000`. Validated against
  real data and needed no tuning: ranks Hanks, Depp, Pitt, Cruise, De Niro at
  the top, excludes character actors.
  **Do not use TMDB `popularity`** — a rolling trend score that spikes on
  news, not durable fame.
- **Terminus pool** — `headline_count >= 5 AND costar_degree >= 25`, giving
  409 actors, flagged `actors.is_terminus`.

### Key architectural insight

Keep far **more** actors than you'd ever use as an endpoint. Character actors
are bad targets but excellent connectors — deleting them shreds the graph. The
question "which actors to keep" conflates two sets that want opposite things.

### terminus_pairs

`terminus_pairs (start_actor_id, target_actor_id, hops)` is precomputed by
BFS: 76,478 rows, 70,630 at 2 hops and 5,848 at 3. **1-hop pairs are excluded**
— direct co-stars give the answer away. `createGame` picks a random row,
replacing an old random walk that drew from all 14k actors.

**This table is required.** `createGame` raises if empty. Regenerate whenever
`movie_cast` changes.

---

## API security

- **Per-game ownership token.** Game ids are sequential integers; before this,
  anyone could walk `/games/1..N` and delete or play other people's routes.
  `games.token` (UUID) is issued once at creation, required in `X-Game-Token`
  on every state-changing call, compared with `secrets.compare_digest`.
  **Reads never return it** — `GET /games/{id}` stays open so a player can
  resume, but a read must not hand out the means to mutate.
- **Rate limits** via slowapi: 30/hour on game creation, 120/min on guesses,
  600/hour default so a new endpoint inherits a limit.
- **Input clamps** — `limit` is `1..50` (was unbounded: `limit=5000` returned
  1,807 rows), query strings capped at 100 chars.
- **`CoreAPI/schema.sql`** holds idempotent migrations, run on every deploy
  *before* the code that needs them.

---

## Deploying

```bash
./deploy.sh                 # frontend + API
./deploy.sh --with-data     # also actors / movie_cast / terminus_pairs
./deploy.sh --with-server    # also rebuild + install the C++ server
./deploy.sh --check         # preflight only
```

The C++ server reads static files per request, so **a frontend deploy needs no
server restart** — only `--with-server` touches it.

`--with-server` builds on the Pi (not cross-compiled — it links the Pi's own
OpenSSL), runs the path-traversal tests, and **only then** swaps the binary in
via atomic rename. A compile error or a failed test never reaches production.

`actors` is **upserted through a staging table**, not replaced, because
`games` and `game_steps` have foreign keys into it. Game history survives.

Any failure after shipping restores the previous release automatically. This
was tested by deploying deliberately broken code twice — the site stayed at
200 throughout.

After re-running the importer, the full sequence is:

```bash
./CoreAPI/venv/bin/python movieDBBuild/rebuild_cast.py
./CoreAPI/venv/bin/python movieDBBuild/build_graph.py
./deploy.sh --with-data
```

`build_graph.py` derives `headline_count`, `costar_degree`, `is_terminus` and
`terminus_pairs`. Before it existed these were ad-hoc queries that lived
nowhere, so the database could not be rebuilt from source.

---

## Infrastructure gotchas (all hit at least once)

| Thing | Detail |
|---|---|
| **ufw lockout** | `ufw enable` defaults to deny-incoming. Allow **22 before enabling** or you lose SSH. |
| **Locked out with no keyboard** | Mount the SD card on the Mac and append `systemd.mask=ufw.service` to `/boot/firmware/cmdline.txt` (must stay **one line**). Boot, fix, remove the param from the Pi. `cmdline.txt.bak` is on the card. |
| **`Text file busy`** | You cannot `cp` over a running binary. Install beside it and `mv` — rename swaps the directory entry while the running process keeps its inode. |
| **nginx** | Was squatting on port 80. Disabled. |
| **Postgres version** | Dumps came from PG17; Debian 13 ships 17. Bookworm (15) would have failed. |
| **32-bit ARM** | `psycopg[binary]` has no armv7l wheel. Pi is aarch64, so fine. |
| **`new URL(path, base)`** | Discards the base's path, so `https://host/api` + `/games` became `https://host/games`. `api/http.ts` concatenates instead. |
| **Placeholders** | `PI_USER` in the systemd unit and `DBPASS` in `.env` both shipped unreplaced and caused crash loops. |
| **fail2ban regex** | `[^]]*` does not parse as it reads — the jail looked configured while matching **nothing**. Always verify with `fail2ban-regex`. |
| **ASan on aarch64** | Fails to map its shadow region on this kernel. Build tests without sanitizers there. |

**Postgres is on the SD card, not an SSD.** Sustained writes kill SD cards and
they fail without warning. Nightly `pg_dump` backups exist; moving the data
directory to USB storage is still outstanding.

---

## Bugs fixed along the way

- **`status` never persisted.** `processGuess` returned `won` to the client
  but never wrote `games.status`.
- **You could win without picking the target.** The check was
  `target in cast_ids` — choosing *any* co-star from a film the target
  appeared in ended the game. Now `actor_id == game.target_actor_id`.
- **IDOR on delete/guess** — see "API security".
- **Restore errors were swallowed** — `loadGame`'s catch set `phase: "idle"`,
  and `ErrorState` only renders on `phase: "error"`.
- **Dead `starting` prop** hardcoded `false`.
- **Combobox wasn't a combobox** — no arrow keys, no `role="listbox"`.
- **Abandon had no confirmation.**

---

## Known gaps / next steps

1. **`DEPLOY.md` is stale.** Still describes Neon, Render and Caddy. This file
   and `deploy.sh` are accurate; that one isn't.
2. **Start screen leads with text, not imagery.** See "Design direction".
3. **Expand the movie corpus.** Currently `vote_count >= 1000` (2,686 films).
   Dropping to ~300 would give ~10–15k films and richer connective tissue.
4. **86% of terminus pairs are exactly 2 hops.** Low difficulty variety.
   `terminus_pairs.hops` already exists to tier this.
5. **Intermediate route stations have no photos** — the history endpoint
   doesn't return `profile_path`. Only termini show faces, partly by design.
6. **Postgres data directory still on the SD card.**
7. **Abandoned games accumulate.** Leaving deletes the game, but closing the
   tab doesn't. A daily sweep of stale `in_progress` rows would fix it; the
   index is already in `schema.sql`.
8. **C-Server has no HTTP/2, no compression, no byte-range requests.** None
   are needed at this traffic level, but they're the obvious next features.

---

## Handy commands

```bash
ssh will_clore1@willspi.local
```

Health check everything:

```bash
ssh will_clore1@willspi.local 'systemctl is-active cserver sixdegrees-api postgresql fail2ban'
```

Web server logs:

```bash
ssh will_clore1@willspi.local 'sudo tail -20 /var/log/cserver/access.log; sudo journalctl -u cserver -n 20 --no-pager'
```

API logs:

```bash
ssh will_clore1@willspi.local 'journalctl -u sixdegrees-api -n 40 --no-pager'
```

Database:

```bash
psql "postgresql://sixdegrees:sixdegrees@127.0.0.1/movies"
```

**Rollback to Caddy** — still installed, just stopped and disabled:

```bash
ssh will_clore1@willspi.local 'sudo systemctl stop cserver && sudo systemctl start caddy'
```
