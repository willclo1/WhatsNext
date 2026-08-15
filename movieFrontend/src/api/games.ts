import { request } from "./http";
import type { Game, GameStep, GuessResult } from "../types/game";

export function createGame(signal?: AbortSignal): Promise<Game> {
    return request<Game>("/games", { method: "POST", signal });
}

export function getGame(gameId: number, signal?: AbortSignal): Promise<Game> {
    return request<Game>(`/games/${gameId}`, { signal });
}

export function getGameHistory(
    gameId: number,
    signal?: AbortSignal,
): Promise<GameStep[]> {
    return request<GameStep[]>(`/games/${gameId}/history`, { signal });
}

export function submitGuess(
    gameId: number,
    token: string,
    actorId: number,
    movieId: number,
    signal?: AbortSignal,
): Promise<GuessResult> {
    return request<GuessResult>(`/games/${gameId}/guess`, {
        method: "POST",
        body: { actor_id: actorId, movie_id: movieId },
        token,
        signal,
    });
}

export function leaveGame(
    gameId: number,
    token: string,
    signal?: AbortSignal,
): Promise<void> {
    return request<void>(`/games/${gameId}`, {
        method: "DELETE",
        token,
        signal,
    });
}
