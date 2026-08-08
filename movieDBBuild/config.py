from dotenv import load_dotenv
import os

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not TMDB_API_KEY:
    raise RuntimeError("TMDB_API_KEY missing")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing")
