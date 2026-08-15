# Six Degrees — project handoff

Context for picking this project up cold. Written 2026-08-15.

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
├── movieDBBuild/     TMDB importers (standalone, not part of the running app)
├── deploy.sh         one-command deploy from the Mac
└── DEPLOY.md         host setup notes (partly stale — see "Known gaps")
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

**Serving** — Caddy terminates TLS and serves the built SPA, proxying
`/api/*` to uvicorn on `127.0.0.1:8000`. Site and API share an origin, so
CORS is never exercised in production.

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
is a ring plus the attached panel; the goal is dashed track. This was built to
an explicit brief banning emoji, status pills, gradient text, glassmorphism,
glowing borders, and three-feature-card rows. An earlier gold/velvet "cinema
marquee" direction was **rejected** — don't drift back toward it.

The `frontend-design` skill (installed at `~/.claude/skills/frontend-design/`)
informed this and is worth reading before UI changes.

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

The old `cast_importer.py` was silently dropping rows in its batching loop —
on refetch, all 2,686 films returned full credits. It was replaced, not fixed,
by **`movieDBBuild/rebuild_cast.py`**.

### Selection rules now in force

- **Movie corpus** — `vote_count` filtered (currently ~2,686 films at ≥1000).
- **Cast depth** — top 12 billed only (`cast_order <= 12`), and only
  `known_for_department == "Acting"` so directors' cameos aren't traversable.
- **"Everyone knows" = headline count** — number of films where an actor is
  billed `cast_order <= 3` in a film with `vote_count >= 3000`. This was
  validated against real data and needed no tuning: it ranks Hanks, Depp,
  Pitt, Cruise, De Niro at the top and excludes character actors like Harry
  Melling and Pom Klementieff.
  **Do not use TMDB `popularity`** — it's a rolling trend score that spikes on
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
— direct co-stars give the answer away. `createGame` just picks a random row,
replacing an old random walk that drew from all 14k actors.

**This table is required.** `createGame` raises if it's empty. Regenerate it
whenever `movie_cast` changes.

---

## Deploying

```bash
./deploy.sh              # code only, ~20s
./deploy.sh --with-data  # also pushes actors / movie_cast / terminus_pairs
```

Builds the frontend (baking in `VITE_API_URL`), rsyncs both halves, syncs pip
deps, optionally reloads data, restarts the API, and verifies by creating a
real game.

`actors` is **upserted through a staging table**, not replaced, because
`games` and `game_steps` have foreign keys into it. Game history survives.

After re-running the importer, the full sequence is:

```bash
./CoreAPI/venv/bin/python movieDBBuild/rebuild_cast.py
# recompute headline_count / costar_degree / is_terminus (SQL in this file's history)
# regenerate terminus_pairs via BFS
./deploy.sh --with-data
```

---

## Infrastructure gotchas (all hit at least once)

| Thing | Detail |
|---|---|
| **ufw lockout** | `ufw enable` defaults to deny-incoming. Allow **22 before enabling** or you lose SSH. |
| **Locked out with no keyboard** | Mount the SD card on the Mac and append `systemd.mask=ufw.service` to `/boot/firmware/cmdline.txt` (must stay **one line**). Boot, fix, then remove the param from the Pi itself. `cmdline.txt.bak` is on the card. |
| **nginx** | Was squatting on port 80 and blocking Caddy. Disabled. |
| **Postgres version** | Dumps came from PG17; Debian 13 ships 17, so no PGDG repo needed. Bookworm (15) would have failed. |
| **32-bit ARM** | `psycopg[binary]` has no armv7l wheel. Pi is aarch64, so fine — but on 32-bit, drop `[binary]` and use system libpq. |
| **`new URL(path, base)`** | Discards the base's path, so `https://host/api` + `/games` became `https://host/games`. `api/http.ts` now concatenates instead. |
| **Placeholders** | `PI_USER` in the systemd unit and `DBPASS` in `.env` both shipped unreplaced and caused crash loops. |
| **Certificates** | Caddy + Let's Encrypt via DuckDNS, auto-renewing. A cron job keeps DuckDNS pointed at the home IP. |
| **fail2ban** | Jail `caddy-probe` watches `/var/log/caddy/access.log` for 4xx floods, bans via ufw, LAN in `ignoreip`. The default sshd jail is near-useless here since 22 isn't forwarded. |

**Postgres is on the SD card, not an SSD.** Sustained writes kill SD cards and
they fail without warning. Nightly `pg_dump` backups were set up; moving the
data directory to USB storage is still outstanding.

---

## Bugs fixed along the way

- **`status` never persisted.** `processGuess` returned `won` to the client but
  never wrote `games.status`, so it sat at `in_progress` forever.
- **You could win without picking the target.** The check was
  `target in cast_ids` — choosing *any* co-star from a film the target
  appeared in ended the game, leaving the recorded path pointing elsewhere.
  Now `actor_id == game.target_actor_id`.
- **Restore errors were swallowed** — `loadGame`'s catch set `phase: "idle"`,
  and `ErrorState` only renders on `phase: "error"`.
- **Dead `starting` prop** hardcoded `false`.
- **Combobox wasn't a combobox** — no arrow keys, no `role="listbox"`.
- **Abandon had no confirmation.**

---

## Known gaps / next steps

1. **`DEPLOY.md` is stale.** It still describes Neon and Render. `deploy.sh`
   and this file are accurate; that one isn't.
2. **Expand the movie corpus.** Currently `vote_count >= 1000` (2,686 films).
   Dropping to ~300 would give ~10–15k films and much richer connective
   tissue. The funnel was sized at ~150k cast links / ~40k actors / ~800
   termini — comfortably under a gigabyte.
3. **86% of terminus pairs are exactly 2 hops.** Low difficulty variety.
   A larger corpus plus `hops`-based difficulty tiers would fix it —
   `terminus_pairs.hops` already exists for this.
4. **No rate limiting on `POST /games`.** No auth either, so anyone can create
   games in a loop and grow the table indefinitely.
5. **Intermediate route stations have no photos** — the game-history endpoint
   doesn't return `profile_path`. Only the two termini show faces, which was
   also a deliberate choice to keep the diagram uncluttered.
6. **Postgres data directory still on the SD card** (see above).

---

## Handy commands

```bash
ssh will_clore1@willspi.local
```

```bash
ssh will_clore1@willspi.local 'journalctl -u sixdegrees-api -n 40 --no-pager'
```

```bash
psql "postgresql://sixdegrees:sixdegrees@127.0.0.1/movies"
```

Health check everything:

```bash
ssh will_clore1@willspi.local 'systemctl is-active sixdegrees-api caddy postgresql fail2ban'
```
