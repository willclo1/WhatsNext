export interface Movie {
    tmdb_id: number;
    title: string;
    original_title: string | null;
    overview: string | null;
    release_date: string | null;
    original_language: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    popularity: number | null;
    vote_average: number | null;
    vote_count: number | null;
    adult: boolean | null;
    updated_at: string | null;
}

export interface MovieSearchResponse {
    results: Movie[];
    count: number;
}
