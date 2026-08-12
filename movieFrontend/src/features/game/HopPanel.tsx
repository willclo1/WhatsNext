import type { Actor } from "../../types/actor";
import type { CastMember, GuessFeedback } from "../../types/game";
import type { Movie } from "../../types/movie";
import Poster from "../../components/Poster";
import CastList from "./CastList";
import FilmSearch from "./FilmSearch";

interface HopPanelProps {
    currentActor: Actor;
    selectedFilm: Movie | null;
    cast: CastMember[];
    castLoading: boolean;
    castError: string | null;
    submitting: boolean;
    feedback: GuessFeedback | null;
    visitedActorIds: number[];
    onSelectFilm: (film: Movie) => void;
    onClearFilm: () => void;
    onChooseActor: (member: CastMember) => void;
}

/**
 * Says what happened and what to do about it. The API returns a reason code;
 * these are the same facts written for the person who hit them.
 */
function explain(
    feedback: GuessFeedback,
    actorName: string,
    filmTitle: string,
): string {
    switch (feedback.reason) {
        case "prev_actor_not_in_movie":
            return `${actorName} isn't in the cast of ${filmTitle}. Choose a film they appeared in.`;
        case "guessed_actor_not_in_movie":
            return `That actor isn't in the cast of ${filmTitle}. Choose someone listed above.`;
        case "repeat":
            return "That actor or film is already on your route. Choose one you haven't used.";
        case "game_not_found":
            return "This route has expired. Start a new one to keep playing.";
        default:
            return feedback.reason ?? "That hop didn't work. Choose another.";
    }
}

/**
 * The working panel. It hangs off the station you're standing on in the route
 * map, so its position states which actor you're moving from.
 */
export default function HopPanel({
    currentActor,
    selectedFilm,
    cast,
    castLoading,
    castError,
    submitting,
    feedback,
    visitedActorIds,
    onSelectFilm,
    onClearFilm,
    onChooseActor,
}: HopPanelProps) {
    return (
        <div className="mt-3 animate-rise rounded-card border border-rail bg-card p-3 shadow-panel sm:p-4">
            {!selectedFilm ? (
                <FilmSearch
                    actorName={currentActor.name}
                    onSelect={onSelectFilm}
                />
            ) : (
                <>
                    <div className="flex items-start gap-3">
                        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-station bg-rail-soft shadow-poster">
                            <Poster
                                path={selectedFilm.poster_path}
                                title={selectedFilm.title}
                                size="w185"
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl leading-none text-ink">
                                {selectedFilm.title}
                            </h3>
                            {selectedFilm.release_date && (
                                <p className="mt-1 font-data text-meta text-slate">
                                    {selectedFilm.release_date.slice(0, 4)}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={onClearFilm}
                                className="mt-2 font-body text-sm text-line-a underline underline-offset-2 hover:text-ink"
                            >
                                Choose a different film
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <p className="mb-1 font-data text-label uppercase tracking-label text-slate">
                            Travel with
                        </p>

                        {castLoading && (
                            <p
                                className="py-3 font-body text-sm text-slate"
                                role="status"
                            >
                                Loading the cast…
                            </p>
                        )}

                        {castError && !castLoading && (
                            <p className="py-3 font-body text-sm text-line-b">
                                {castError}
                            </p>
                        )}

                        {!castLoading && !castError && (
                            <CastList
                                cast={cast}
                                visitedActorIds={visitedActorIds}
                                submitting={submitting}
                                onChoose={onChooseActor}
                            />
                        )}
                    </div>
                </>
            )}

            {feedback && !feedback.valid && (
                <p
                    role="alert"
                    className="mt-3 border-l-[3px] border-line-b bg-line-b-wash py-2 pl-3 font-body text-sm text-ink"
                >
                    {explain(
                        feedback,
                        currentActor.name,
                        selectedFilm?.title ?? "that film",
                    )}
                </p>
            )}
        </div>
    );
}
