import { useEffect, useRef, useState } from "react";
import { searchMovies } from "../api/movies";
import type { Movie } from "../types/movie";

interface MovieSearchState {
    movies: Movie[];
    loading: boolean;
    error: string | null;
}

const DEBOUNCE_MS = 280;

export function useMovieSearch(query: string): MovieSearchState {
    const [state, setState] = useState<MovieSearchState>({
        movies: [],
        loading: false,
        error: null,
    });

    const requestId = useRef(0);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            requestId.current += 1;
            setState({
                movies: [],
                loading: false,
                error: null,
            });
            return;
        }

        const currentRequestId = ++requestId.current;
        const controller = new AbortController();

        setState(previous => ({
            ...previous,
            loading: true,
            error: null,
        }));

        const timeout = window.setTimeout(async () => {
            try {
                const response = await searchMovies(
                    trimmedQuery,
                    controller.signal,
                );

                if (currentRequestId !== requestId.current) {
                    return;
                }

                setState({
                    movies: response.results,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                if (
                    controller.signal.aborted ||
                    currentRequestId !== requestId.current
                ) {
                    return;
                }

                setState({
                    movies: [],
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Something went wrong while searching.",
                });
            }
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [query]);

    return state;
}
