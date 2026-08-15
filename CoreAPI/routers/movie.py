from fastapi import APIRouter, Depends, Query
from models.response.searchList import MovieSearchResponse
from models.response.movieResponse import MovieResponse
from configSettings.database import get_db
from services.movieService import MovieService
from sqlalchemy.orm import Session

# 1. Initialize the router with a prefix and tags for automatic documentation
router = APIRouter(
    prefix="/movie",
    tags=["movie"],
)


# name, id , pic
@router.get("/search", response_model=MovieSearchResponse)
async def search_movie(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return MovieService.search_movie(db, q, limit)

@router.get("/{tmdb_id}/cast")
async def get_movie_cast(tmdb_id: int, db: Session = Depends(get_db)):
    rows = MovieService.getCast(db, tmdb_id)
    return [
        {
            "actor_id": r.actor_id,
            "name": r.name,
            "profile_path": r.profile_path,
            "character": r.character,
            "cast_order": r.cast_order,
        }
        for r in rows
    ]



