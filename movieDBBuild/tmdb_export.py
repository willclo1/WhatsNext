import gzip
from datetime import datetime
import json
import httpx
from pathlib import Path


EXPORT_URL = "https://files.tmdb.org/p/exports/movie_ids_{date}.json.gz"


class TMDBExport:

    def __init__(self, folder="data"):
        self.folder = Path(folder)
        self.folder.mkdir(exist_ok=True)


    def download(self, date: str):

        output = self.folder / f"movie_ids_{date}.json.gz"

        if output.exists():
            print("Export already exists")
            return output

        url = EXPORT_URL.format(date=date)

        print("Downloading:", url)

        response = httpx.get(
            url,
            timeout=120
        )

        response.raise_for_status()

        output.write_bytes(response.content)

        print("Saved:", output)

        return output

    
    def ids(self, file):

        with gzip.open(
            file,
            "rt",
            encoding="utf-8"
        ) as f:

            for line in f:
                movie = json.loads(line)

                yield movie["id"]
    def download_latest(self):

        date = datetime.now().strftime("%m_%d_%Y")

        return self.download(date)
