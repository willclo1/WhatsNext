from sqlalchemy.orm import Session
from repository.movieRepo import MovieRepository
from repository.MovieCastRepo import MovieCastRepository

class MovieService:
    def search_movie(db: Session, search: str, limit: int = 10):
        movies = MovieRepository.searchMovies(db, search, limit)
        return {
            "results": movies,
            "count": len(movies)
        }

    def getMovie(db: Session, tmdb_id:int):
        movie = MovieRepository.getMovie(db, tmdb_id)
        return movie

    @staticmethod
    def getCast(db, movie_id: int):
        return MovieCastRepository.getCastWithNames(db, movie_id)