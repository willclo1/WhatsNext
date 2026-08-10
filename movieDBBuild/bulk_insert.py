from sqlalchemy.dialects.postgresql import insert

from models import Movie, Actors, MovieCast


def insert_movies(session, movies):

    if not movies:
        return

    values = [
        {
            "tmdb_id": movie.tmdb_id,
            "title": movie.title,
            "original_title": movie.original_title,
            "overview": movie.overview,
            "release_date": movie.release_date,
            "original_language": movie.original_language,
            "poster_path": movie.poster_path,
            "backdrop_path": movie.backdrop_path,
            "popularity": movie.popularity,
            "vote_average": movie.vote_average,
            "vote_count": movie.vote_count,
            "adult": movie.adult,
            "updated_at": movie.updated_at,
        }
        for movie in movies
    ]

    stmt = insert(Movie).values(values)

    stmt = stmt.on_conflict_do_update(
        index_elements=["tmdb_id"],
        set_=dict(
            title=stmt.excluded.title,
            overview=stmt.excluded.overview,
            popularity=stmt.excluded.popularity,
            vote_average=stmt.excluded.vote_average,
            vote_count=stmt.excluded.vote_count,
            updated_at=stmt.excluded.updated_at,
        )
    )

    session.execute(stmt)


def insert_actors(session, actors):

    if not actors:
        return

    # The same actor shows up in many movies within a batch - dedupe
    # by actor_id or Postgres will reject the multi-row insert for
    # affecting the same row twice.
    unique = {actor["actor_id"]: actor for actor in actors}.values()

    stmt = insert(Actors).values(list(unique))

    stmt = stmt.on_conflict_do_update(
        index_elements=["actor_id"],
        set_=dict(
            name=stmt.excluded.name,
        )
    )

    session.execute(stmt)


def insert_movie_cast(session, cast):

    if not cast:
        return

    # Same guard as insert_actors: a (movie_id, actor_id) pair should
    # only ever appear once per movie's credits, but dedupe defensively.
    unique = {
        (row["movie_id"], row["actor_id"]): row
        for row in cast
    }.values()

    stmt = insert(MovieCast).values(list(unique))

    stmt = stmt.on_conflict_do_update(
        index_elements=["movie_id", "actor_id"],
        set_=dict(
            character=stmt.excluded.character,
            cast_order=stmt.excluded.cast_order,
        )
    )

    session.execute(stmt)