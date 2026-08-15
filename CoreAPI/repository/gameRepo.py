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

        # Both endpoints come from terminus_pairs, which is precomputed from
        # actors flagged is_terminus (lead billing in widely-seen films) and
        # holds only pairs whose shortest path is 2 or 3 hops. That replaces
        # the old random walk, which drew from every actor in the table --
        # fine when there were 500, but the table now holds 14k, most of them
        # character actors nobody could name, let alone aim for.
        #
        # Excluding 1-hop pairs matters too: direct co-stars give the answer
        # away on the first search.

        pair = db.execute(

            text(
                """
                SELECT start_actor_id, target_actor_id
                FROM terminus_pairs
                ORDER BY random()
                LIMIT 1
                """
            )

        ).first()

        if pair is None:

            raise RuntimeError(
                "terminus_pairs is empty - run the pair builder before "
                "serving games."
            )

        start_actor_id, target_actor_id = pair

        # Pairs are stored once, with the lower actor_id first. Flipping at
        # random keeps players from noticing the ordering.

        if random.random() < 0.5:

            start_actor_id, target_actor_id = target_actor_id, start_actor_id

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