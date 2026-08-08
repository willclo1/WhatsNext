from sqlalchemy.dialects.postgresql import insert

from models import Movie


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
