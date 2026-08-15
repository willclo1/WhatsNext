from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from configSettings.database import get_db
from services.actorService import ActorService

router = APIRouter(prefix="/actors", tags=["actors"])

@router.get("/search")
async def search_actors(q: str, limit: int = 8, db: Session = Depends(get_db)):
    results = ActorService.searchActors(db, q, limit)
    return [
        {"actor_id": a.actor_id, "name": a.name, "profile_path": a.profile_path}
        for a in results
    ]

@router.get("/{actor_id}")
async def get_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = ActorService.getActor(db, actor_id)
    if actor is None:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {
        "actor_id": actor.actor_id,
        "name": actor.name,
        "profile_path": actor.profile_path,
    }