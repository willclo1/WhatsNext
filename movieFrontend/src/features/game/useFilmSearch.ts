import { useEffect, useRef, useState } from "react";
import { searchFilms } from "../../api/movies";
import type { Movie } from "../../types/movie";

interface FilmSearchState {
    films: Movie[];
    loading: boolean;
    error: string | null;
}

const DEBOUNCE_MS = 280;

const IDLE: FilmSearchState = { films: [], loading: false, error: null };

/** Debounced film lookup. Late responses are discarded, not rendered. */
export function useFilmSearch(query: string): FilmSearchState {
    const [state, setState] = useState<FilmSearchState>(IDLE);
    const requestId = useRef(0);

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed) {
            requestId.current += 1;
            setState(IDLE);
            return;
        }

        const currentId = ++requestId.current;
        const controller = new AbortController();

        setState(previous => ({ ...previous, loading: true, error: null }));

        const timeout = window.setTimeout(async () => {
            try {
                const response = await searchFilms(trimmed, controller.signal);

                if (currentId === requestId.current) {
                    setState({
                        films: response.results,
                        loading: false,
                        error: null,
                    });
                }
            } catch (error) {
                if (controller.signal.aborted || currentId !== requestId.current) {
                    return;
                }

                setState({
                    films: [],
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "The search didn't complete. Try again.",
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
