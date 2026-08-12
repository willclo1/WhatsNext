import { useState } from "react";
import { useGame } from "./useGame";
import RouteMap from "./RouteMap";
import HopPanel from "./HopPanel";
import StartScreen from "./StartScreen";
import WinScreen from "./WinScreen";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

export default function GamePage() {
    const {
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
    } = useGame();

    const [confirmingLeave, setConfirmingLeave] = useState(false);

    if (phase === "idle") {
        return <StartScreen onStart={startGame} />;
    }

    if (phase === "loading") {
        return <LoadingState />;
    }

    if (phase === "error") {
        return (
            <ErrorState
                message={error ?? "Something stopped the route."}
                onRetry={startGame}
            />
        );
    }

    if (!startActor || !targetActor || !currentActor) {
        return <LoadingState />;
    }

    if (phase === "won") {
        return (
            <WinScreen
                startActor={startActor}
                targetActor={targetActor}
                steps={path}
                onStartAnother={() => {
                    leaveGame();
                    startGame();
                }}
            />
        );
    }

    const visitedActorIds = [
        startActor.actor_id,
        ...path.map(step => step.actor_id),
    ];

    return (
        <div>
            <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-rail pb-3">
                <h2 className="text-2xl text-ink">Your route</h2>
                <p className="font-data text-meta uppercase tracking-label text-slate">
                    {path.length} {path.length === 1 ? "hop" : "hops"}
                </p>
            </div>

            <RouteMap
                startActor={startActor}
                targetActor={targetActor}
                steps={path}
            >
                <HopPanel
                    currentActor={currentActor}
                    selectedFilm={selectedFilm}
                    cast={cast}
                    castLoading={castLoading}
                    castError={castError}
                    submitting={submitting}
                    feedback={feedback}
                    visitedActorIds={visitedActorIds}
                    onSelectFilm={selectFilm}
                    onClearFilm={clearFilm}
                    onChooseActor={chooseActor}
                />
            </RouteMap>

            <div className="mt-12 border-t border-rail pt-4">
                {!confirmingLeave ? (
                    <button
                        type="button"
                        onClick={() => setConfirmingLeave(true)}
                        className="font-body text-sm text-slate underline underline-offset-2 hover:text-ink"
                    >
                        Leave this route
                    </button>
                ) : (
                    // Leaving discards the chain with no way back, so it asks
                    // first — the old version wiped the game on one click.
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <p className="font-body text-sm text-ink">
                            Leaving discards the {path.length}{" "}
                            {path.length === 1 ? "hop" : "hops"} you've made.
                        </p>
                        <button
                            type="button"
                            onClick={leaveGame}
                            className="font-body text-sm font-semibold text-line-b underline underline-offset-2 hover:text-ink"
                        >
                            Leave this route
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingLeave(false)}
                            className="font-body text-sm text-slate underline underline-offset-2 hover:text-ink"
                        >
                            Keep playing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
