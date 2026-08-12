import { useCallback, useEffect, useState } from "react";
import {
    createGame,
    getGame,
    getGameHistory,
    submitGuess as submitGuessApi,
} from "../api/games";
import { getActor } from "../api/actors";
import { getMovieCast } from "../api/movies";
import type { Game, GameStep, CastMember } from "../types/game";
import type { Actor } from "../types/actor";
import type { Movie } from "../types/movie";

const STORAGE_KEY = "connections.gameId";

type Phase = "idle" | "loading" | "playing" | "won" | "error";

interface GuessFeedback {
    valid: boolean;
    reason?: string;
}

export function useGame() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [game, setGame] = useState<Game | null>(null);
    const [startActor, setStartActor] = useState<Actor | null>(null);
    const [targetActor, setTargetActor] = useState<Actor | null>(null);
    const [currentActor, setCurrentActor] = useState<Actor | null>(null);
    const [path, setPath] = useState<GameStep[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [cast, setCast] = useState<CastMember[]>([]);
    const [castLoading, setCastLoading] = useState(false);
    const [castError, setCastError] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [guessFeedback, setGuessFeedback] = useState<GuessFeedback | null>(
        null,
    );

    const loadGame = useCallback(async (gameId: number) => {
        setPhase("loading");
        setError(null);

        try {
            const [loadedGame, history] = await Promise.all([
                getGame(gameId),
                getGameHistory(gameId),
            ]);

            const [start, target, current] = await Promise.all([
                getActor(loadedGame.start_actor_id),
                getActor(loadedGame.target_actor_id),
                getActor(loadedGame.current_actor_id),
            ]);

            setGame(loadedGame);
            setStartActor(start);
            setTargetActor(target);
            setCurrentActor(current);
            setPath(history);
            setPhase(loadedGame.status === "won" ? "won" : "playing");
        } catch (loadError) {
            window.localStorage.removeItem(STORAGE_KEY);

            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Unable to load your game.",
            );
            setPhase("idle");
        }
    }, []);

    useEffect(() => {
        const savedId = window.localStorage.getItem(STORAGE_KEY);

        if (savedId) {
            loadGame(Number(savedId));
        }
        // Only ever runs once, on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startNewGame = useCallback(async () => {
        setPhase("loading");
        setError(null);
        setPath([]);
        setSelectedMovie(null);
        setCast([]);
        setGuessFeedback(null);

        try {
            const newGame = await createGame();

            const [start, target] = await Promise.all([
                getActor(newGame.start_actor_id),
                getActor(newGame.target_actor_id),
            ]);

            window.localStorage.setItem(STORAGE_KEY, String(newGame.game_id));

            setGame(newGame);
            setStartActor(start);
            setTargetActor(target);
            setCurrentActor(start);
            setPhase("playing");
        } catch (startError) {
            setError(
                startError instanceof Error
                    ? startError.message
                    : "Unable to start a new game.",
            );
            setPhase("error");
        }
    }, []);

    const selectMovieForGuess = useCallback(async (movie: Movie) => {
        setSelectedMovie(movie);
        setCast([]);
        setCastError(null);
        setCastLoading(true);
        setGuessFeedback(null);

        try {
            const members = await getMovieCast(movie.tmdb_id);
            setCast(members);
        } catch (fetchError) {
            setCastError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "Unable to load the cast for this movie.",
            );
        } finally {
            setCastLoading(false);
        }
    }, []);

    const clearSelectedMovie = useCallback(() => {
        setSelectedMovie(null);
        setCast([]);
        setCastError(null);
        setGuessFeedback(null);
    }, []);

    const guessActor = useCallback(
        async (actor: CastMember) => {
            if (!game || !selectedMovie) {
                return;
            }

            setSubmitting(true);
            setGuessFeedback(null);

            try {
                const result = await submitGuessApi(
                    game.game_id,
                    actor.actor_id,
                    selectedMovie.tmdb_id,
                );

                if (!result.valid) {
                    setGuessFeedback({ valid: false, reason: result.reason });
                    return;
                }

                const nextStep: GameStep = {
                    step_number: path.length + 1,
                    actor_id: actor.actor_id,
                    actor_name: actor.name,
                    movie_id: selectedMovie.tmdb_id,
                    movie_title: selectedMovie.title,
                };

                setPath(previous => [...previous, nextStep]);
                setCurrentActor({ actor_id: actor.actor_id, name: actor.name });
                setSelectedMovie(null);
                setCast([]);
                setGuessFeedback({ valid: true });

                if (result.won) {
                    setPhase("won");
                    window.localStorage.removeItem(STORAGE_KEY);
                }
            } catch (guessError) {
                setGuessFeedback({
                    valid: false,
                    reason:
                        guessError instanceof Error
                            ? guessError.message
                            : "Something went wrong submitting that guess.",
                });
            } finally {
                setSubmitting(false);
            }
        },
        [game, selectedMovie, path.length],
    );

    const resetGame = useCallback(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setGame(null);
        setStartActor(null);
        setTargetActor(null);
        setCurrentActor(null);
        setPath([]);
        setSelectedMovie(null);
        setCast([]);
        setGuessFeedback(null);
        setPhase("idle");
    }, []);

    return {
        phase,
        startActor,
        targetActor,
        currentActor,
        path,
        error,
        selectedMovie,
        cast,
        castLoading,
        castError,
        submitting,
        guessFeedback,
        startNewGame,
        selectMovieForGuess,
        clearSelectedMovie,
        guessActor,
        resetGame,
    };
}
