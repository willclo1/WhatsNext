from database import SessionLocal
from tmdb import TMDBClient
from movie_mapper import tmdb_to_movie
from bulk_insert import insert_movies

class MovieImporter:

    def __init__(self, batch_size=100):
        self.batch_size = batch_size
        self.client = TMDBClient()


    def import_movies(self, movie_ids):

        session = SessionLocal()

        batch = []

        try:
            for index, movie_id in enumerate(movie_ids, start=1):

                data = self.client.get_movie(movie_id)

                if not data:
                    continue

                movie = tmdb_to_movie(data)

                batch.append(movie)


                if len(batch) >= self.batch_size:
                    self.save_batch(session, batch)

                    print(
                        f"Imported {index} movies"
                    )

                    batch.clear()


            # Save leftovers
            if batch:
                self.save_batch(session, batch)


        finally:
            session.close()
            self.client.close()


    def save_batch(self, session, movies):
        try: 
            insert_movies(session, movies)
            session.commit()
        except Exception:
            session.rollback()
            raise
