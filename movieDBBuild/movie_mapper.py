from datetime import datetime
from models import Movie


def tmdb_to_movie(data: dict) -> Movie:
    return Movie(
        tmdb_id=data["id"],
        title=data.get("title"),
        original_title=data.get("original_title"),
        overview=data.get("overview"),

        release_date=data.get("release_date") or None,

        original_language=data.get("original_language"),

        poster_path=data.get("poster_path"),
        backdrop_path=data.get("backdrop_path"),

        popularity=data.get("popularity"),
        vote_average=data.get("vote_average"),
        vote_count=data.get("vote_count"),

        adult=data.get("adult", False),

        updated_at=datetime.utcnow(),
    )
