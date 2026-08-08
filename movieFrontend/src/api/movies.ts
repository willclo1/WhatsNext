import { API_URL } from "../config";
import type { Movie, MovieSearchResponse } from "../types/movie";

async function getErrorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();

        if (typeof body?.detail === "string") {
            return body.detail;
        }

        if (Array.isArray(body?.detail)) {
            return "The server rejected the request.";
        }
    } catch {
        // Ignore JSON parsing errors.
    }

    return `Request failed with status ${response.status}`;
}

export async function searchMovies(
    query: string,
    signal?: AbortSignal,
): Promise<MovieSearchResponse> {
    const url = new URL("/movie/search", API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "20");

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}

export async function getMovie(
    tmdbId: number,
    signal?: AbortSignal,
): Promise<Movie> {
    const url = new URL(`/movie/${tmdbId}`, API_URL);

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}
