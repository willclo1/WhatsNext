export type GameStatus = "in_progress" | "won" | "abandoned";

export interface Game {
    game_id: number;
    start_actor_id: number;
    target_actor_id: number;
    current_actor_id: number;
    status: GameStatus;
}

export interface GameStep {
    step_number: number;
    actor_id: number;
    actor_name: string;
    movie_id: number;
    movie_title: string;
    /**
     * Poster art for this step's film. Present for hops made in this session,
     * since the chosen film already carries it; absent for history restored
     * from the API, which returns titles only. Poster falls back to a plate.
     */
    poster_path?: string | null;
}

export interface GuessResult {
    valid: boolean;
    reason?: string;
    won?: boolean;
    game_id?: number;
}

/** A rejected hop, kept until the next attempt replaces it. */
export interface GuessFeedback {
    valid: boolean;
    reason?: string;
}

export interface CastMember {
    actor_id: number;
    name: string;
    character: string | null;
    cast_order: number;
}
