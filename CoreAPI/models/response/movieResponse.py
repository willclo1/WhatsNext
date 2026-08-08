from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tmdb_id: int
    title: str
    original_title: str | None = None
    overview: str | None = None
    release_date: date | None = None
    original_language: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    popularity: float | None = None
    vote_average: float | None = None
    vote_count: int | None = None
    adult: bool | None = None
    updated_at: datetime | None = None