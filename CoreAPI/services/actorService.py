from repository.actorRepo import ActorRepository
from sqlalchemy.orm import Session

class ActorService:

    @staticmethod
    def getActor(db, actor_id: int):
        return ActorRepository.getById(db, actor_id)

    @staticmethod
    def searchActors(db, query: str, limit: int = 8):
        return ActorRepository.search(db, query, limit)