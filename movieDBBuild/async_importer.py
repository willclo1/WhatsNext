import asyncio

from database import SessionLocal
from tmdb import TMDBClient
from movie_mapper import tmdb_to_movie
from bulk_insert import insert_movies


class AsyncMovieImporter:


    def __init__(
        self,
        workers=20,
        batch_size=100
    ):

        self.workers = workers
        self.batch_size = batch_size
        self.client = TMDBClient()


    async def fetch_movie(
        self,
        movie_id,
        semaphore
    ):

        async with semaphore:

            try:
                return await self.client.get_movie(movie_id)

            except Exception as e:
                print(
                    "Failed:",
                    movie_id,
                    e
                )

                return None


    async def run(self, ids):

        semaphore = asyncio.Semaphore(self.workers)

        session = SessionLocal()

        batch = []

        tasks = []

        count = 0

        try:
            for movie_id in ids:

                tasks.append(
                    self.fetch_movie(
                        movie_id,
                        semaphore
                    )
                )

                if len(tasks) >= self.workers:

                    results = await asyncio.gather(*tasks)

                    tasks.clear()

                    for data in results:

                        if data:
                            batch.append(
                                tmdb_to_movie(data)
                            )

                        if len(batch) >= self.batch_size:

                            insert_movies(
                                session,
                                batch
                            )

                            session.commit()

                            count += len(batch)

                            print(
                                f"Imported {count} movies"
                            )

                            batch.clear()


            # Finish remaining API requests
            if tasks:
                results = await asyncio.gather(*tasks)

                for data in results:
                    if data:
                        batch.append(
                            tmdb_to_movie(data)
                        )


            # Save final batch
            if batch:

                insert_movies(
                    session,
                    batch
                )

                session.commit()

                count += len(batch)

                print(
                    f"Imported {count} movies"
                )

        finally:
            session.close()
            await self.client.close()
