from datetime import date

from pydantic import BaseModel, ConfigDict


class MovieSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tmdb_id: int
    title: str
    release_date: date | None = None
    poster_path: str | None = None
    vote_average: float | None = None