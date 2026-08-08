from sqlalchemy import select

from sqlalchemy.orm import Session

from models.sql_alch.movies import Movie

class MovieRepository:
    def searchMovies(db: Session, search: str, limit: int):
        stmt = (
            select(
                Movie.tmdb_id,
                Movie.title,
                Movie.release_date,
                Movie.poster_path,
                Movie.vote_average,
            )
            .where(Movie.title.ilike(f"%{search}%"))
            .order_by(Movie.popularity.desc())
            .limit(limit)
        )

        return db.execute(stmt).all()

    def getMovie(db: Session, tmdb_id:int):
        stmt = (select(Movie).where(Movie.tmdb_id == tmdb_id))
        return db.scalars(stmt).first()
