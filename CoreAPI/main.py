from fastapi import FastAPI
from routers.movie import router as MovieRouter
from routers.game import router as GameRouter
from routers.actor import router as ActorRouter
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://127.0.0.1:5173",

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)
app.include_router(MovieRouter)
app.include_router(GameRouter)
app.include_router(ActorRouter)