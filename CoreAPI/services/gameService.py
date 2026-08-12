from sqlalchemy.orm import Session
from repository.gameRepo import GameRepository
from repository.MovieCastRepo import MovieCastRepository
from repository.GameStepRepo import GameStepRepository


class GameService:

    @staticmethod
    def createGame(db: Session):
        return GameRepository.createGame(db)

    @staticmethod
    def getGame(db: Session, game_id: int):
        return GameRepository.getById(db, game_id)

    @staticmethod
    def processGuess(db: Session, game_id: int, actor_id: int, movie_id: int):
        game = GameRepository.getById(db, game_id)

        if game is None:
            return {"valid": False, "reason": "game_not_found"}

        cast_ids = MovieCastRepository.getCastIds(db, movie_id)

        if game.current_actor_id not in cast_ids:
            return {"valid": False, "reason": "prev_actor_not_in_movie"}

        if actor_id not in cast_ids:
            return {"valid": False, "reason": "guessed_actor_not_in_movie"}

        used_actors, used_movies = GameStepRepository.getUsedActorsAndMovies(db, game_id)

        if actor_id in used_actors or movie_id in used_movies:
            return {"valid": False, "reason": "repeat"}

        won = game.target_actor_id in cast_ids

        GameRepository.recordGuess(
            db, game.id, actor_id, movie_id, step_number=len(used_actors) + 1
        )

        return {"valid": True, "won": won, "game_id": game.id}

    @staticmethod
    def getGame(db, game_id: int):
        return GameRepository.getById(db, game_id)
    
    @staticmethod
    def getHistory(db, game_id: int):
        return GameStepRepository.getHistory(db, game_id)