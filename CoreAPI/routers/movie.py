from fastapi import APIRouter, Depends
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
async def search_movie(q: str, limit: int = 10, db: Session = Depends(get_db)):
    return MovieService.search_movie(db, q, limit)


# full movie object
@router.get("/{tmdb_id}", response_model=MovieResponse)
async def get_movie(tmdb_id: int, db: Session = Depends(get_db)):
    return MovieService.getMovie(db, tmdb_id) 





