from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from configSettings.config import ALLOWED_ORIGINS
from routers.movie import router as MovieRouter
from routers.game import router as GameRouter
from routers.actor import router as ActorRouter

app = FastAPI(title="Six Degrees API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(MovieRouter)
app.include_router(GameRouter)
app.include_router(ActorRouter)


@app.get("/health", tags=["ops"])
async def health():
    """Liveness probe. Hosts use this to tell a cold start from a crash."""
    return {"status": "ok"}
