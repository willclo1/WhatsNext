# MovieSuggestor Frontend

A cinematic React + TypeScript + Tailwind frontend for the MovieSuggestor FastAPI backend.

## Backend endpoints expected

### Search

`GET /movie/search?q=<query>&limit=<limit>`

Example response:

```json
{
  "results": [
    {
      "tmdb_id": 557,
      "title": "Spider-Man",
      "release_date": "2002-05-01",
      "poster_path": "/nXdAh5vUwERL4WGVMaee8RoDEAS.jpg",
      "vote_average": 7.339
    }
  ],
  "count": 1
}
```

### Movie by ID

`GET /movie/{tmdb_id}`

The frontend expects the full MovieResponse fields:

- tmdb_id
- title
- original_title
- overview
- release_date
- original_language
- poster_path
- backdrop_path
- popularity
- vote_average
- vote_count
- adult
- updated_at

## Environment

The frontend uses:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_TMDB_IMAGE_URL=https://image.tmdb.org/t/p
```

No API or image URLs are hardcoded into the application code.

## Run

```bash
npm install
npm run dev
```

The search starts automatically as the user types after a 280ms debounce.

Search requests are cancelled and stale responses are ignored so rapidly changing searches cannot overwrite newer results.

Clicking a movie opens a detail modal and fetches the full movie by ID.
