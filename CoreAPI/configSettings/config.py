from dotenv import load_dotenv
import os

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not TMDB_API_KEY:
    raise RuntimeError("TMDB_API_KEY missing")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing")

# Browsers block the deployed frontend unless its exact origin is listed here,
# so this has to change per environment. Comma-separated, e.g.
#   ALLOWED_ORIGINS=https://sixdegrees.pages.dev,https://sixdegrees.com
# Unset means local development.
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if origin.strip()
]
