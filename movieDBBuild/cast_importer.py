import asyncio

from sqlalchemy import select

from database import Base, SessionLocal, engine
import models
from models import Movie
from tmdb import TMDBClient
from cast_mapper import tmdb_to_actors, tmdb_to_movie_cast
from bulk_insert import insert_actors, insert_movie_cast


class AsyncCastImporter:
    """
    Backfills actors + movie_cast for movies that already exist in the
    database. Does NOT touch the movies table - it only reads tmdb_ids
    from it to know which movies to fetch credits for.
    """

    def __init__(
        self,
        workers=20,
        batch_size=100
    ):

        self.workers = workers
        self.batch_size = batch_size
        self.client = TMDBClient()


    def get_movie_ids(self, session):

        result = session.execute(
            select(Movie.tmdb_id)
        )

        return [row[0] for row in result]


    async def fetch_credits(
        self,
        movie_id,
        semaphore
    ):

        async with semaphore:

            try:
                return await self.client.get_credits(movie_id)

            except Exception as e:
                print(
                    "Failed:",
                    movie_id,
                    e
                )

                return None


    def save_batch(self, session, actors, cast):

        # Actors must exist before movie_cast rows can reference them.
        insert_actors(session, actors)

        insert_movie_cast(session, cast)

        session.commit()


    async def run(self, movie_ids=None):

        semaphore = asyncio.Semaphore(self.workers)

        session = SessionLocal()

        actor_batch = []
        cast_batch = []

        tasks = []

        count = 0

        try:
            if movie_ids is None:
                movie_ids = self.get_movie_ids(session)

            total = len(movie_ids)

            print(f"Backfilling cast for {total} movies")

            for movie_id in movie_ids:

                tasks.append(
                    self.fetch_credits(
                        movie_id,
                        semaphore
                    )
                )

                if len(tasks) >= self.workers:

                    results = await asyncio.gather(*tasks)

                    tasks.clear()

                    for credits_data in results:

                        if not credits_data:
                            continue

                        actor_batch.extend(
                            tmdb_to_actors(credits_data)
                        )

                        cast_batch.extend(
                            tmdb_to_movie_cast(credits_data)
                        )

                        count += 1

                    if len(actor_batch) >= self.batch_size:

                        self.save_batch(
                            session,
                            actor_batch,
                            cast_batch
                        )

                        print(
                            f"Processed cast for {count}/{total} movies"
                        )

                        actor_batch.clear()
                        cast_batch.clear()


            # Finish remaining API requests
            if tasks:
                results = await asyncio.gather(*tasks)

                for credits_data in results:

                    if not credits_data:
                        continue

                    actor_batch.extend(
                        tmdb_to_actors(credits_data)
                    )

                    cast_batch.extend(
                        tmdb_to_movie_cast(credits_data)
                    )

                    count += 1


            # Save final batch
            if actor_batch or cast_batch:

                self.save_batch(
                    session,
                    actor_batch,
                    cast_batch
                )

                print(
                    f"Processed cast for {count}/{total} movies"
                )

        finally:
            session.close()
            await self.client.close()


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    asyncio.run(AsyncCastImporter().run())