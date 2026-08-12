import { request } from "./http";
import type { MovieSearchResponse } from "../types/movie";
import type { CastMember } from "../types/game";

/** How many films the search dropdown can show at once. */
export const FILM_SEARCH_LIMIT = 12;

export function searchFilms(
    query: string,
    signal?: AbortSignal,
): Promise<MovieSearchResponse> {
    return request<MovieSearchResponse>("/movie/search", {
        signal,
        query: { q: query, limit: FILM_SEARCH_LIMIT },
    });
}

export function getFilmCast(
    tmdbId: number,
    signal?: AbortSignal,
): Promise<CastMember[]> {
    return request<CastMember[]>(`/movie/${tmdbId}/cast`, { signal });
}
