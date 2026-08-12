import { useEffect, useRef, useState } from "react";
import { searchActors } from "../api/actors";
import type { Actor } from "../types/actor";

interface ActorSearchState {
    actors: Actor[];
    loading: boolean;
    error: string | null;
}

const DEBOUNCE_MS = 250;

export function useActorSearch(query: string): ActorSearchState {
    const [state, setState] = useState<ActorSearchState>({
        actors: [],
        loading: false,
        error: null,
    });

    const requestId = useRef(0);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            requestId.current += 1;
            setState({
                actors: [],
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
                const results = await searchActors(
                    trimmedQuery,
                    controller.signal,
                );

                if (currentRequestId !== requestId.current) {
                    return;
                }

                setState({
                    actors: results,
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
                    actors: [],
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
