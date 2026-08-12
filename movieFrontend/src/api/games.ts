import { API_URL } from "../config";
import type { Game, GameStep, GuessResult } from "../types/game";

async function getErrorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();

        if (typeof body?.detail === "string") {
            return body.detail;
        }
    } catch {
        // Ignore JSON parsing errors.
    }

    return `Request failed with status ${response.status}`;
}

export async function createGame(signal?: AbortSignal): Promise<Game> {
    const url = new URL("/games", API_URL);

    const response = await fetch(url, { method: "POST", signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}

export async function getGame(
    gameId: number,
    signal?: AbortSignal,
): Promise<Game> {
    const url = new URL(`/games/${gameId}`, API_URL);

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}

export async function getGameHistory(
    gameId: number,
    signal?: AbortSignal,
): Promise<GameStep[]> {
    const url = new URL(`/games/${gameId}/history`, API_URL);

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}

export async function submitGuess(
    gameId: number,
    actorId: number,
    movieId: number,
    signal?: AbortSignal,
): Promise<GuessResult> {
    const url = new URL(`/games/${gameId}/guess`, API_URL);

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: actorId, movie_id: movieId }),
        signal,
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}
