"""
Derives everything the game selects on, from movie_cast.

Run after rebuild_cast.py, before `deploy.sh --with-data`:

    rebuild_cast.py   films + credits from TMDB
    build_graph.py    scores, terminus flags, playable pairs   <- this
    deploy.sh --with-data

Three things get computed here.

`headline_count` -- how many films an actor is billed in the top HEADLINE_BILLING
of, among films with at least HEADLINE_VOTES ratings. This is the "everyone
knows them" measure. TMDB's own `popularity` is deliberately not used: it is a
rolling trend score that spikes when someone is in the news, so it measures
attention this week rather than durable fame.

`costar_degree` -- distinct co-stars, i.e. how well connected a node is.

`terminus_pairs` -- every pair of terminus actors whose shortest path is
between MIN_HOPS and MAX_HOPS, precomputed by breadth-first search so game
creation is a single indexed row read. One-hop pairs are excluded on purpose:
direct co-stars give the answer away on the first search.
"""

import collections
import os
import sys

import psycopg

HEADLINE_BILLING = 3
HEADLINE_VOTES = 3000

MIN_HEADLINES = 5
MIN_DEGREE = 25

MIN_HOPS = 2
MAX_HOPS = 3


def load_dsn() -> str:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    with open(os.path.join(root, ".env")) as handle:
        for line in handle:
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return (
                    line.split("=", 1)[1]
                    .strip()
                    .strip("\"'")
                    .replace("postgresql+psycopg://", "postgresql://")
                )

    raise SystemExit("DATABASE_URL not found in .env")


def score_actors(conn: psycopg.Connection) -> None:
    print("scoring actors")

    conn.execute(
        """
        UPDATE actors a SET headline_count = COALESCE(h.n, 0)
        FROM (
            SELECT mc.actor_id, count(*) n
            FROM movie_cast mc
            JOIN movies m ON m.tmdb_id = mc.movie_id
            WHERE mc.cast_order <= %s AND m.vote_count >= %s
            GROUP BY 1
        ) h WHERE h.actor_id = a.actor_id
        """,
        (HEADLINE_BILLING, HEADLINE_VOTES),
    )

    conn.execute(
        """
        UPDATE actors a SET costar_degree = COALESCE(d.n, 0)
        FROM (
            SELECT x.actor_id, count(DISTINCT y.actor_id) n
            FROM movie_cast x
            JOIN movie_cast y ON y.movie_id = x.movie_id
                             AND y.actor_id <> x.actor_id
            GROUP BY 1
        ) d WHERE d.actor_id = a.actor_id
        """
    )

    # Reset first: an actor who no longer clears the bar must lose the flag,
    # or a shrinking corpus leaves stale endpoints behind.
    conn.execute("UPDATE actors SET is_terminus = false")
    conn.execute(
        """
        UPDATE actors SET is_terminus = true
        WHERE headline_count >= %s AND costar_degree >= %s
        """,
        (MIN_HEADLINES, MIN_DEGREE),
    )
    conn.commit()


def build_pairs(conn: psycopg.Connection) -> None:
    print("loading graph")

    cast_of = collections.defaultdict(list)
    films_of = collections.defaultdict(list)

    for movie_id, actor_id in conn.execute(
        "SELECT movie_id, actor_id FROM movie_cast"
    ):
        cast_of[movie_id].append(actor_id)
        films_of[actor_id].append(movie_id)

    pool = sorted(
        row[0] for row in conn.execute(
            "SELECT actor_id FROM actors WHERE is_terminus"
        )
    )

    if not pool:
        raise SystemExit("no terminus actors - check the scoring thresholds")

    print(f"breadth-first search from {len(pool)} terminus actors")

    # Both ends of a pair must be recognisable. The search still traverses the
    # whole graph -- character actors are the connective tissue -- but only
    # terminus-to-terminus pairs are recorded as playable.
    in_pool = set(pool)

    rows = []

    for source in pool:
        seen = {source}
        frontier = [source]

        for hops in range(1, MAX_HOPS + 1):
            nxt = []

            for actor in frontier:
                for movie in films_of[actor]:
                    for other in cast_of[movie]:
                        if other in seen:
                            continue

                        seen.add(other)
                        nxt.append(other)

                        # Store each pair once, lower id first. createGame
                        # flips the direction at random when serving it.
                        if hops >= MIN_HOPS and other > source and other in in_pool:
                            rows.append((source, other, hops))

            frontier = nxt

            if not frontier:
                break

    conn.execute("""
        CREATE TABLE IF NOT EXISTS terminus_pairs (
            start_actor_id  int      NOT NULL,
            target_actor_id int      NOT NULL,
            hops            smallint NOT NULL,
            PRIMARY KEY (start_actor_id, target_actor_id)
        )
    """)
    conn.execute("TRUNCATE terminus_pairs")

    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO terminus_pairs VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
            rows,
        )

    conn.commit()


def report(conn: psycopg.Connection) -> None:
    terminus = conn.execute(
        "SELECT count(*) FROM actors WHERE is_terminus"
    ).fetchone()[0]

    print(f"\nterminus actors: {terminus}")
    print("playable pairs:")

    for hops, count in conn.execute(
        "SELECT hops, count(*) FROM terminus_pairs GROUP BY 1 ORDER BY 1"
    ):
        print(f"  {hops} hops: {count}")

    print("\nsample endpoints:")
    for (name,) in conn.execute(
        "SELECT name FROM actors WHERE is_terminus ORDER BY random() LIMIT 8"
    ):
        print(f"  {name}")


def main() -> int:
    conn = psycopg.connect(load_dsn())

    score_actors(conn)
    build_pairs(conn)
    report(conn)

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
