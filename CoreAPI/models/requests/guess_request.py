from pydantic import BaseModel

class GuessRequest(BaseModel):
    actor_id: int
    movie_id: int