import httpx

from config import TMDB_API_KEY


class TMDBClient:

    def __init__(self):
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {TMDB_API_KEY}",
                "accept": "application/json",
            },
            timeout=30,
        )


    async def get_movie(self, movie_id):

        response = await self.client.get(
            f"https://api.themoviedb.org/3/movie/{movie_id}"
        )

        if response.status_code == 404:
            return None

        response.raise_for_status()

        return response.json()


    async def get_credits(self, movie_id):

        response = await self.client.get(
            f"https://api.themoviedb.org/3/movie/{movie_id}/credits"
        )

        if response.status_code == 404:
            return None

        response.raise_for_status()

        return response.json()


    async def close(self):
        await self.client.aclose()