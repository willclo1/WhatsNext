from sqlalchemy.orm import Session
from repository.movieRepo import MovieRepository

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