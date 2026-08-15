import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from configSettings.database import get_db
from configSettings.limits import limiter
from services.gameService import GameService
from models.requests.guess_request import GuessRequest

router = APIRouter(
    prefix="/games",
    tags=["games"],
)


def owned_game(
    game_id: int,
    x_game_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Resolves a game only for the client that created it.

    Game ids are sequential, so without this anyone could walk the range and
    delete or play other people's routes. The token is returned once, at
    creation, and never exposed by a read endpoint.
    """

    game = GameService.getGame(db, game_id)

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    # compare_digest keeps the check constant-time, so the response time
    # doesn't leak how much of the token was guessed correctly.
    if not x_game_token or not secrets.compare_digest(
        str(game.token), x_game_token
    ):
        raise HTTPException(
            status_code=403,
            detail="This route belongs to a different player.",
        )

    return game


@router.post("", status_code=201)
@limiter.limit("30/hour")
async def create_game(request: Request, db: Session = Depends(get_db)):
    game = GameService.createGame(db)

    return {
        "game_id": game.id,
        # The only time the token is ever sent. The client stores it and
        # returns it on every state-changing call.
        "token": str(game.token),
        "start_actor_id": game.start_actor_id,
        "target_actor_id": game.target_actor_id,
        "current_actor_id": game.current_actor_id,
        "status": game.status,
    }


@router.post("/{game_id}/guess")
@limiter.limit("120/minute")
async def submit_guess(
    request: Request,
    guess: GuessRequest,
    game=Depends(owned_game),
    db: Session = Depends(get_db),
):
    result = GameService.processGuess(
        db, game.id, guess.actor_id, guess.movie_id
    )

    if result.get("reason") == "game_not_found":
        raise HTTPException(status_code=404, detail="Game not found")

    return result


@router.get("/{game_id}")
async def get_game(game_id: int, db: Session = Depends(get_db)):
    game = GameService.getGame(db, game_id)

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    # Deliberately omits the token: reads stay open so a player can resume,
    # but a read must never hand out the means to mutate.
    return {
        "game_id": game.id,
        "start_actor_id": game.start_actor_id,
        "target_actor_id": game.target_actor_id,
        "current_actor_id": game.current_actor_id,
        "status": game.status,
    }


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


@router.delete("/{game_id}", status_code=204)
async def leave_game(game=Depends(owned_game), db: Session = Depends(get_db)):
    """Discards an abandoned route. Idempotent: deleting a game that is
    already gone succeeds, so a retry from the client is harmless."""
    GameService.leaveGame(db, game.id)
    return None
