def tmdb_to_actors(credits: dict) -> list[dict]:
    """
    Extract actor records from a TMDB /movie/{id}/credits payload.

    Returns plain dicts (not Actors instances) since insert_actors()
    upserts by actor_id and the same actor commonly appears across
    many movies in a batch.
    """

    if not credits:
        return []

    actors = []

    for member in credits.get("cast", []):

        actors.append(
            {
                "actor_id": member["id"],
                "name": member.get("name"),
            }
        )

    return actors


def tmdb_to_movie_cast(credits: dict) -> list[dict]:
    """
    Extract movie/actor links (with character + billing order) from a
    TMDB /movie/{id}/credits payload.
    """

    if not credits:
        return []

    movie_id = credits.get("id")

    cast = []

    for member in credits.get("cast", []):

        cast.append(
            {
                "movie_id": movie_id,
                "actor_id": member["id"],
                "character": member.get("character"),
                "cast_order": member.get("order"),
            }
        )

    return cast