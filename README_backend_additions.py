# === repository/MovieCastRepo.py — add this method ===
#
# Existing getCastIds() returns just actor_ids (used for guess validation).
# The frontend also needs names + character + billing order to render a
# pickable cast list, so add a second method rather than overloading the
# first — they serve different callers with different needs.

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


# === repository/ActorRepo.py — new file ===

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


# === repository/GameStepRepo.py — add this method ===
#
# getUsedActorsAndMovies() (sets, for repeat-checking) already exists.
# This one returns ordered, name-enriched rows for the frontend's path
# display, so it doesn't have to make N extra actor/movie lookups itself.

from models.sql_alch.movies import Movie


class GameStepRepository:

    @staticmethod
    def getHistory(db, game_id: int):
        stmt = (
            select(
                GameStep.step_number,
                GameStep.actor_id,
                Actors.name.label("actor_name"),
                GameStep.movie_id,
                Movie.title.label("movie_title"),
            )
            .join(Actors, Actors.actor_id == GameStep.actor_id)
            .join(Movie, Movie.tmdb_id == GameStep.movie_id)
            .where(GameStep.game_id == game_id)
            .order_by(GameStep.step_number)
        )
        return db.execute(stmt).all()


# === services/movieService.py — add ===

class MovieService:
    # ...existing search_movie...

    @staticmethod
    def getCast(db, movie_id: int):
        return MovieCastRepository.getCastWithNames(db, movie_id)


# === services/actorService.py — new file ===

class ActorService:

    @staticmethod
    def getActor(db, actor_id: int):
        return ActorRepository.getById(db, actor_id)

    @staticmethod
    def searchActors(db, query: str, limit: int = 8):
        return ActorRepository.search(db, query, limit)


# === services/gameService.py — add ===

class GameService:
    # ...existing createGame, processGuess...

    @staticmethod
    def getGame(db, game_id: int):
        return GameRepository.getById(db, game_id)

    @staticmethod
    def getHistory(db, game_id: int):
        return GameStepRepository.getHistory(db, game_id)


    # === routers/movieRouter.py — add ===
    #
    @router.get("/{tmdb_id}/cast")
    async def get_movie_cast(tmdb_id: int, db: Session = Depends(get_db)):
        rows = MovieService.getCast(db, tmdb_id)
        return [
            {
                "actor_id": r.actor_id,
                "name": r.name,
                "character": r.character,
                "cast_order": r.cast_order,
            }
            for r in rows
        ]


# === routers/actorRouter.py — new file ===
#
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from configSettings.database import get_db
from services.actorService import ActorService

router = APIRouter(prefix="/actors", tags=["actors"])

@router.get("/search")
async def search_actors(q: str, limit: int = 8, db: Session = Depends(get_db)):
    results = ActorService.searchActors(db, q, limit)
    return [{"actor_id": a.actor_id, "name": a.name} for a in results]

@router.get("/{actor_id}")
async def get_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = ActorService.getActor(db, actor_id)
    if actor is None:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {"actor_id": actor.actor_id, "name": actor.name}


# === routers/gameRouter.py — add ===
#
@router.get("/{game_id}/history")
async def get_game_history(game_id: int, db: Session = Depends(get_db)):
    rows = GameService.getHistory(db, game_id)
    return [
        {
            "step_number": r.step_number,
            "actor_id": r.actor_id,
            "actor_name": r.actor_name,
            "movie_id": r.movie_id,
            "movie_title": r.movie_title,
        }
        for r in rows
    ]

# Also register: app.include_router(actor_router) in your entrypoint.
