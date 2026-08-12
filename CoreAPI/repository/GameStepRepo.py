# repository/GameStepRepo.py
from sqlalchemy import select
from models.sql_alch.game_step import GameStep
from models.sql_alch.actors import Actors
from models.sql_alch.movies import Movie


class GameStepRepository:

    @staticmethod
    def getUsedActorsAndMovies(db, game_id: int) -> tuple[set[int], set[int]]:
        stmt = select(GameStep.actor_id, GameStep.movie_id).where(
            GameStep.game_id == game_id
        )
        rows = db.execute(stmt).all()

        used_actors = {row[0] for row in rows}
        used_movies = {row[1] for row in rows}

        return used_actors, used_movies

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