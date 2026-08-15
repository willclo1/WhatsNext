import { useCallback, useEffect, useState } from "react";
import {
    createGame,
    getGame,
    getGameHistory,
    submitGuess,
    leaveGame as leaveGameApi,
} from "../../api/games";
import { getActor } from "../../api/actors";
import { getFilmCast } from "../../api/movies";
import { ApiError } from "../../api/http";
import type { Actor } from "../../types/actor";
import type { CastMember, Game, GameStep, GuessFeedback } from "../../types/game";
import type { Movie } from "../../types/movie";

const STORAGE_KEY = "sixdegrees.game";
const LEGACY_KEY = "sixdegrees.gameId";

interface SavedGame {
    id: number;
    token: string;
}

/**
 * Reads the resumable game. The token is stored with the id because without
 * it the server rejects every state-changing call, so a saved id alone is
 * worthless — including anything left by the pre-token version of this app.
 */
function readSaved(): SavedGame | null {
    window.localStorage.removeItem(LEGACY_KEY);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<SavedGame>;
        if (typeof parsed.id === "number" && typeof parsed.token === "string") {
            return { id: parsed.id, token: parsed.token };
        }
    } catch {
        // Corrupt or legacy value; fall through and start clean.
    }

    window.localStorage.removeItem(STORAGE_KEY);
    return null;
}

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

    const resumeGame = useCallback(async (saved: SavedGame) => {
        const gameId = saved.id;
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

            // getGame never returns the token, so carry the stored one forward.
            setGame({ ...loaded, token: saved.token });
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
        const saved = readSaved();

        if (saved) {
            resumeGame(saved);
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

            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ id: created.game_id, token: created.token }),
            );

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
                    game.token ?? "",
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
                    profile_path: member.profile_path,
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
        // Discard the abandoned game server-side. Deliberately not awaited:
        // the player asked to leave, so the UI shouldn't wait on a network
        // round trip, and a failed cleanup costs nothing but a stale row.
        if (game) {
            void leaveGameApi(game.game_id, game.token ?? "").catch(() => {});
        }

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
    }, [game]);

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
