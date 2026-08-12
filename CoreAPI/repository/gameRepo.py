from sqlalchemy import select, func

from sqlalchemy.orm import Session
import random
from models.sql_alch.game import Game
from models.sql_alch.actors import Actors
from sqlalchemy import select, func, text
from models.sql_alch.game_step import GameStep
from models.sql_alch.movie_cast import MovieCast

class GameRepository:

    @staticmethod

    def createGame(db: Session):

        MIN_HOPS = 2

        MAX_HOPS = 6

        # Pick how difficult this game will be.

        hop_count = random.randint(MIN_HOPS, MAX_HOPS)

        # Pick a random starting actor.

        start_actor_id = db.execute(

            select(Actors.actor_id)

            .order_by(func.random())

            .limit(1)

        ).scalar_one()

        current_actor_id = start_actor_id

        visited_actors = {start_actor_id}

        for _ in range(hop_count):

            # Pick a random movie that the current actor was in.

            movie_id = db.execute(

                select(MovieCast.movie_id)

                .where(MovieCast.actor_id == current_actor_id)

                .order_by(func.random())

                .limit(1)

            ).scalar_one_or_none()

            if movie_id is None:

                raise ValueError(

                    f"Actor {current_actor_id} has no movies."

                )

            # Pick another actor from that movie.

            next_actor_id = db.execute(

                select(MovieCast.actor_id)

                .where(

                    MovieCast.movie_id == movie_id,

                    MovieCast.actor_id != current_actor_id,

                    ~MovieCast.actor_id.in_(visited_actors),

                )

                .order_by(func.random())

                .limit(1)

            ).scalar_one_or_none()

            if next_actor_id is None:

                # We hit a dead end. Try creating another game.

                return GameRepository.createGame(db)

            visited_actors.add(next_actor_id)

            current_actor_id = next_actor_id

        target_actor_id = current_actor_id

        new_game = Game(

            start_actor_id=start_actor_id,

            target_actor_id=target_actor_id,

            current_actor_id=start_actor_id,

            status="in_progress",

        )

        db.add(new_game)

        db.commit()

        db.refresh(new_game)

        return new_game

    @staticmethod
    def recordGuess(db: Session, game_id: int, actor_id: int, movie_id: int, step_number: int):
        game = db.query(Game).filter(Game.id == game_id).first()

        if game is None:
            return None

        new_step = GameStep(
            game_id=game_id,
            step_number=step_number,
            actor_id=actor_id,
            movie_id=movie_id,
        )

        db.add(new_step)
        game.current_actor_id = actor_id

        db.commit()

        return game


    # def updateGameStep(db: Session, tmdb_id:int):
    #     stmt = (


    #     )
    #     return db.scalars(stmt).first()

    @staticmethod
    def getById(db: Session, game_id: int) -> Game | None:
        return db.query(Game).filter(Game.id == game_id).first()