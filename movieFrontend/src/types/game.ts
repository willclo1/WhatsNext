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
}

export interface GuessResult {
    valid: boolean;
    reason?: string;
    won?: boolean;
    game_id?: number;
}

export interface CastMember {
    actor_id: number;
    name: string;
    character: string | null;
    cast_order: number;
}
