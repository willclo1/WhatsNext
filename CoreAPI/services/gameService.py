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

        # You win by *moving to* the target, not by finding a film they happen
        # to be in. The old check (`target in cast_ids`) declared a win even
        # when the player picked a different co-star, which left the recorded
        # path ending somewhere other than the target.
        won = actor_id == game.target_actor_id

        GameRepository.recordGuess(
            db, game.id, actor_id, movie_id, step_number=len(used_actors) + 1
        )

        if won:
            # Persist the outcome. Without this the column never leaves
            # "in_progress", and the only way to count completions is to
            # check whether some step happens to match the target.
            game.status = "won"
            db.commit()

        return {"valid": True, "won": won, "game_id": game.id}

    @staticmethod
    def leaveGame(db, game_id: int) -> bool:
        """Abandoning a route discards it -- an unfinished game is not a
        record of anything, and leaving them behind just grows the table."""
        return GameRepository.deleteGame(db, game_id)

    @staticmethod
    def getGame(db, game_id: int):
        return GameRepository.getById(db, game_id)
    
    @staticmethod
    def getHistory(db, game_id: int):
        return GameStepRepository.getHistory(db, game_id)