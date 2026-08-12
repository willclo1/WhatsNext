from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from configSettings.database import get_db
from services.gameService import GameService
from models.requests.guess_request import GuessRequest

router = APIRouter(
    prefix="/games",
    tags=["games"],
)

@router.post("", status_code=201)
async def create_game(db: Session = Depends(get_db)):
    game = GameService.createGame(db)

    return {
        "game_id": game.id,
        "start_actor_id": game.start_actor_id,
        "target_actor_id": game.target_actor_id,
        "current_actor_id": game.current_actor_id,
        "status": game.status,
    }


@router.post("/{game_id}/guess")
async def submit_guess(game_id: int, guess: GuessRequest, db: Session = Depends(get_db)):
    result = GameService.processGuess(
        db, game_id, guess.actor_id, guess.movie_id
    )

    if result.get("reason") == "game_not_found":
        raise HTTPException(status_code=404, detail="Game not found")

    return result

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


