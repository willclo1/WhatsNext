from sqlalchemy import select, func
from models.sql_alch.actors import Actors


class ActorRepository:

    @staticmethod
    def getById(db, actor_id: int):
        return db.query(Actors).filter(Actors.actor_id == actor_id).first()

    @staticmethod
    def search(db, query: str, limit: int = 8):
        similarity = func.similarity(Actors.name, query)
        stmt = (
            select(Actors)
            .where(similarity > 0.2)
            .order_by(similarity.desc())
            .limit(limit)
        )
        return db.execute(stmt).scalars().all()