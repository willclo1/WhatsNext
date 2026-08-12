import { useCallback, useEffect, useState } from "react";
import {
    createGame,
    getGame,
    getGameHistory,
    submitGuess,
} from "../../api/games";
import { getActor } from "../../api/actors";
import { getFilmCast } from "../../api/movies";
import { ApiError } from "../../api/http";
import type { Actor } from "../../types/actor";
import type { CastMember, Game, GameStep, GuessFeedback } from "../../types/game";
import type { Movie } from "../../types/movie";

const STORAGE_KEY = "sixdegrees.gameId";

export type Phase = "idle" | "loading" | "playing" | "won" | "error";

function messageFrom(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

/**
 * Owns all game state. Components below this are presentational — they render
 * what they're handed and call back up.
 */
export function useGame() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [game, setGame] = useState<Game | null>(null);
    const [startActor, setStartActor] = useState<Actor | null>(null);
    const [targetActor, setTargetActor] = useState<Actor | null>(null);
    const [currentActor, setCurrentActor] = useState<Actor | null>(null);
    const [path, setPath] = useState<GameStep[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [selectedFilm, setSelectedFilm] = useState<Movie | null>(null);
    const [cast, setCast] = useState<CastMember[]>([]);
    const [castLoading, setCastLoading] = useState(false);
    const [castError, setCastError] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<GuessFeedback | null>(null);

    const resumeGame = useCallback(async (gameId: number) => {
        setPhase("loading");
        setError(null);

        try {
            const [loaded, history] = await Promise.all([
                getGame(gameId),
                getGameHistory(gameId),
            ]);

            const [start, target, current] = await Promise.all([
                getActor(loaded.start_actor_id),
                getActor(loaded.target_actor_id),
                getActor(loaded.current_actor_id),
            ]);

            setGame(loaded);
            setStartActor(start);
            setTargetActor(target);
            setCurrentActor(current);
            setPath(history);
            setPhase(loaded.status === "won" ? "won" : "playing");
        } catch (resumeError) {
            // Drop the unusable id so the next load starts clean, and surface
            // the failure — the previous version fell through to the start
            // screen with the message set but never rendered.
            window.localStorage.removeItem(STORAGE_KEY);

            // A missing game is expected here (it expired or was finished
            // elsewhere), and the API's wording for it means nothing to a
            // player. Only an unreachable server is worth quoting.
            const offline = resumeError instanceof ApiError && resumeError.isOffline;

            setError(
                offline
                    ? messageFrom(resumeError, "The server didn't respond.")
                    : "The route you were on is no longer available. Start a new one.",
            );
            setPhase("error");
        }
    }, []);

    useEffect(() => {
        const savedId = window.localStorage.getItem(STORAGE_KEY);
        const parsed = savedId ? Number(savedId) : NaN;

        if (Number.isFinite(parsed)) {
            resumeGame(parsed);
        }
    }, [resumeGame]);

    const startGame = useCallback(async () => {
        setPhase("loading");
        setError(null);
        setPath([]);
        setSelectedFilm(null);
        setCast([]);
        setFeedback(null);

        try {
            const created = await createGame();

            const [start, target] = await Promise.all([
                getActor(created.start_actor_id),
                getActor(created.target_actor_id),
            ]);

            window.localStorage.setItem(STORAGE_KEY, String(created.game_id));

            setGame(created);
            setStartActor(start);
            setTargetActor(target);
            setCurrentActor(start);
            setPhase("playing");
        } catch (startError) {
            setError(messageFrom(startError, "The route couldn't be started."));
            setPhase("error");
        }
    }, []);

    const selectFilm = useCallback(async (film: Movie) => {
        setSelectedFilm(film);
        setCast([]);
        setCastError(null);
        setCastLoading(true);
        setFeedback(null);

        try {
            setCast(await getFilmCast(film.tmdb_id));
        } catch (castFetchError) {
            setCastError(
                messageFrom(
                    castFetchError,
                    "The cast for this film couldn't be loaded.",
                ),
            );
        } finally {
            setCastLoading(false);
        }
    }, []);

    const clearFilm = useCallback(() => {
        setSelectedFilm(null);
        setCast([]);
        setCastError(null);
        setFeedback(null);
    }, []);

    const chooseActor = useCallback(
        async (member: CastMember) => {
            if (!game || !selectedFilm) return;

            setSubmitting(true);
            setFeedback(null);

            try {
                const result = await submitGuess(
                    game.game_id,
                    member.actor_id,
                    selectedFilm.tmdb_id,
                );

                if (!result.valid) {
                    setFeedback({ valid: false, reason: result.reason });
                    return;
                }

                setPath(previous => [
                    ...previous,
                    {
                        step_number: previous.length + 1,
                        actor_id: member.actor_id,
                        actor_name: member.name,
                        movie_id: selectedFilm.tmdb_id,
                        movie_title: selectedFilm.title,
                        poster_path: selectedFilm.poster_path,
                    },
                ]);
                setCurrentActor({
                    actor_id: member.actor_id,
                    name: member.name,
                });
                setSelectedFilm(null);
                setCast([]);
                setFeedback({ valid: true });

                if (result.won) {
                    setPhase("won");
                    window.localStorage.removeItem(STORAGE_KEY);
                }
            } catch (guessError) {
                setFeedback({
                    valid: false,
                    reason: messageFrom(
                        guessError,
                        "That hop couldn't be submitted. Try again.",
                    ),
                });
            } finally {
                setSubmitting(false);
            }
        },
        [game, selectedFilm],
    );

    const leaveGame = useCallback(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setGame(null);
        setStartActor(null);
        setTargetActor(null);
        setCurrentActor(null);
        setPath([]);
        setSelectedFilm(null);
        setCast([]);
        setFeedback(null);
        setError(null);
        setPhase("idle");
    }, []);

    return {
        phase,
        startActor,
        targetActor,
        currentActor,
        path,
        error,
        selectedFilm,
        cast,
        castLoading,
        castError,
        submitting,
        feedback,
        startGame,
        selectFilm,
        clearFilm,
        chooseActor,
        leaveGame,
    };
}
