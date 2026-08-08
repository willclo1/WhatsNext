from pydantic import BaseModel
from models.response.searchResponse import MovieSearchResult

class MovieSearchResponse(BaseModel):
    results: list[MovieSearchResult]
    count: int