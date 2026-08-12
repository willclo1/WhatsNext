from sqlalchemy import select
from models.sql_alch.movie_cast import MovieCast
from models.sql_alch.actors import Actors


class MovieCastRepository:

    @staticmethod
    def getCastIds(db, movie_id: int) -> set[int]:
        stmt = select(MovieCast.actor_id).where(MovieCast.movie_id == movie_id)
        return set(db.execute(stmt).scalars().all())

    @staticmethod
    def getCastWithNames(db, movie_id: int, limit: int = 20):
        stmt = (
            select(
                Actors.actor_id,
                Actors.name,
                MovieCast.character,
                MovieCast.cast_order,
            )
            .join(Actors, Actors.actor_id == MovieCast.actor_id)
            .where(MovieCast.movie_id == movie_id)
            .order_by(MovieCast.cast_order)
            .limit(limit)
        )
        return db.execute(stmt).all()
