import asyncio

from database import Base, engine
import models

from tmdb_export import TMDBExport
from async_importer import AsyncMovieImporter


async def main():

    Base.metadata.create_all(engine)

    export = TMDBExport()

    file = export.download_latest()

    importer = AsyncMovieImporter(
        workers=20,
        batch_size=100
    )

    ids = export.ids(file)

    await importer.run(ids)


if __name__ == "__main__":
    asyncio.run(main())
