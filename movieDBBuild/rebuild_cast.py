"""
Rebuilds actors + movie_cast from TMDB credits.

Why this exists rather than a fix to cast_importer.py: the old importer left
the database with 3.7 cast members per film and 37% of films unusable (zero or
one credit), which made the game undiscoverable — players could see a path in
theory but never on screen.

Two decisions drive everything here:

  * Only the top TOP_BILLED credits are kept. Beyond ~12 you are into one-line
    parts that add graph noise and no recognition value.
  * Only `known_for_department == "Acting"` is kept, or directors and writers
    with cameos end up as traversable nodes.

`profile_path` rides along in the credits payload, so actor images cost no
extra API calls.
"""

import asyncio
import os
import sys

import httpx
import psycopg

TOP_BILLED = 12
WORKERS = 20
BATCH = 400

API = "https://api.themoviedb.org/3/movie/{}/credits"


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    with open(path) as handle:
        for line in handle:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip("\"'")
    return env


def add_columns(conn: psycopg.Connection) -> None:
    """Idempotent: safe to re-run."""
    conn.execute("""
        ALTER TABLE actors
            ADD COLUMN IF NOT EXISTS profile_path         varchar(255),
            ADD COLUMN IF NOT EXISTS known_for_department varchar(50),
            ADD COLUMN IF NOT EXISTS popularity           double precision,
            ADD COLUMN IF NOT EXISTS headline_count       integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS costar_degree        integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_terminus          boolean NOT NULL DEFAULT false
    """)
    conn.commit()


async def fetch(client: httpx.AsyncClient, movie_id: int, sem: asyncio.Semaphore):
    async with sem:
        for attempt in range(3):
            try:
                response = await client.get(API.format(movie_id), timeout=20)
                if response.status_code == 429:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                if response.status_code != 200:
                    return None
                return response.json()
            except (httpx.HTTPError, ValueError):
                await asyncio.sleep(1 + attempt)
        return None


def extract(payload) -> tuple[list, list]:
    """Split a credits payload into actor rows and movie_cast rows."""
    if not payload:
        return [], []

    movie_id = payload.get("id")
    actors, cast = [], []

    for member in payload.get("cast", []):
        order = member.get("order")

        if order is None or order >= TOP_BILLED:
            continue
        if member.get("known_for_department") != "Acting":
            continue

        actors.append((
            member["id"],
            member.get("name"),
            member.get("profile_path"),
            member.get("known_for_department"),
            member.get("popularity"),
        ))
        cast.append((movie_id, member["id"], member.get("character"), order))

    return actors, cast


def save(conn: psycopg.Connection, actors: list, cast: list) -> None:
    if not actors:
        return

    # Dedupe within the batch: Postgres rejects a multi-row upsert that
    # touches the same key twice, and popular actors recur constantly.
    actors = list({row[0]: row for row in actors}.values())
    cast = list({(row[0], row[1]): row for row in cast}.values())

    with conn.cursor() as cur:
        cur.executemany("""
            INSERT INTO actors (actor_id, name, profile_path, known_for_department, popularity)
            VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT (actor_id) DO UPDATE SET
                name = EXCLUDED.name,
                profile_path = COALESCE(EXCLUDED.profile_path, actors.profile_path),
                known_for_department = EXCLUDED.known_for_department,
                popularity = EXCLUDED.popularity
        """, actors)

        cur.executemany("""
            INSERT INTO movie_cast (movie_id, actor_id, character, cast_order)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (movie_id, actor_id) DO UPDATE SET
                character = EXCLUDED.character,
                cast_order = EXCLUDED.cast_order
        """, cast)

    conn.commit()


async def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(root, ".env"))

    key = env.get("TMDB_API_KEY")
    dsn = env["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")

    headers = {"accept": "application/json"}
    params = {}
    if key.startswith("ey"):
        headers["Authorization"] = f"Bearer {key}"
    else:
        params["api_key"] = key

    conn = psycopg.connect(dsn)
    add_columns(conn)

    movie_ids = [r[0] for r in conn.execute(
        "SELECT tmdb_id FROM movies ORDER BY vote_count DESC NULLS LAST"
    ).fetchall()]

    # movie_cast is fully derived, so rebuilding it is cheaper than
    # reconciling stale rows (the old import left cast_order up to 205).
    conn.execute("DELETE FROM movie_cast")
    conn.commit()

    print(f"Rebuilding cast for {len(movie_ids)} films (top {TOP_BILLED} billed)")

    sem = asyncio.Semaphore(WORKERS)
    actor_buf, cast_buf, done, missing = [], [], 0, 0

    async with httpx.AsyncClient(headers=headers, params=params) as client:
        for start in range(0, len(movie_ids), BATCH):
            chunk = movie_ids[start:start + BATCH]
            results = await asyncio.gather(*(fetch(client, m, sem) for m in chunk))

            for payload in results:
                actors, cast = extract(payload)
                if not cast:
                    missing += 1
                actor_buf.extend(actors)
                cast_buf.extend(cast)

            save(conn, actor_buf, cast_buf)
            actor_buf.clear()
            cast_buf.clear()

            done += len(chunk)
            print(f"  {done}/{len(movie_ids)}", flush=True)

    print(f"films with no usable credits: {missing}")
    conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
