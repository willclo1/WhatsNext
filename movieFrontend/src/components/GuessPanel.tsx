import type { Actor } from "../types/actor";
import type { CastMember } from "../types/game";
import type { Movie } from "../types/movie";
import CastPicker from "./CastPicker";
import MovieChip from "./MovieChip";
import MovieSearchCombobox from "./MovieSearchCombobox";
import CloseIcon from "./CloseIcon";

interface GuessFeedback {
    valid: boolean;
    reason?: string;
}

interface GuessPanelProps {
    currentActor: Actor;
    selectedMovie: Movie | null;
    cast: CastMember[];
    castLoading: boolean;
    castError: string | null;
    submitting: boolean;
    guessFeedback: GuessFeedback | null;
    usedActorIds: number[];
    onSelectMovie: (movie: Movie) => void;
    onClearMovie: () => void;
    onGuessActor: (member: CastMember) => void;
}

const REASON_MESSAGES: Record<string, string> = {
    prev_actor_not_in_movie: "That movie doesn't include your current actor.",
    guessed_actor_not_in_movie: "That actor wasn't in this movie.",
    repeat: "You've already used that actor or movie in this game.",
    game_not_found: "This game no longer exists — start a new one.",
};

function describeReason(reason?: string): string {
    if (!reason) {
        return "That guess wasn't valid.";
    }

    return REASON_MESSAGES[reason] ?? "That guess wasn't valid.";
}

export default function GuessPanel({
    currentActor,
    selectedMovie,
    cast,
    castLoading,
    castError,
    submitting,
    guessFeedback,
    usedActorIds,
    onSelectMovie,
    onClearMovie,
    onGuessActor,
}: GuessPanelProps) {
    return (
        <div className="rounded-xl border border-line bg-ink-soft p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Next move
            </p>

            <p className="mt-2 text-sm leading-6 text-paper-dim">
                Find a movie{" "}
                <span className="font-semibold text-paper">
                    {currentActor.name}
                </span>{" "}
                was in, then pick a co-star to move to.
            </p>

            <div className="mt-4">
                {!selectedMovie ? (
                    <MovieSearchCombobox onSelect={onSelectMovie} />
                ) : (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-gold/30 bg-ink px-4 py-3">
                        <MovieChip title={selectedMovie.title} />

                        <button
                            type="button"
                            onClick={onClearMovie}
                            aria-label="Choose a different movie"
                            className="rounded-full p-1.5 text-muted transition hover:text-paper"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {selectedMovie && (
                <div className="mt-4">
                    {castLoading && (
                        <p className="text-sm text-muted">Loading cast…</p>
                    )}

                    {castError && (
                        <p className="text-sm text-velvet-soft">
                            {castError}
                        </p>
                    )}

                    {!castLoading && !castError && (
                        <CastPicker
                            cast={cast}
                            onSelect={onGuessActor}
                            disabledActorIds={usedActorIds}
                            submitting={submitting}
                        />
                    )}
                </div>
            )}

            {guessFeedback && !guessFeedback.valid && (
                <p className="mt-4 rounded-md border border-velvet/30 bg-velvet/10 px-4 py-3 text-sm text-velvet-soft">
                    {describeReason(guessFeedback.reason)}
                </p>
            )}
        </div>
    );
}
