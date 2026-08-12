import { useGame } from "../hooks/useGame";
import GameHeader from "./GameHeader";
import GuessPanel from "./GuessPanel";
import PathTrail from "./PathTrail";
import StartScreen from "./StartScreen";
import WinScreen from "./WinScreen";
import ErrorState from "./ErrorState";
import LoadingState from "./LoadingState";

export default function GamePage() {
    const {
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
    } = useGame();

    if (phase === "idle") {
        return <StartScreen onStart={startNewGame} starting={false} />;
    }

    if (phase === "loading") {
        return <LoadingState />;
    }

    if (phase === "error") {
        return (
            <ErrorState
                message={error ?? "Something went wrong."}
                onRetry={startNewGame}
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
                onPlayAgain={() => {
                    resetGame();
                    startNewGame();
                }}
            />
        );
    }

    const usedActorIds = [
        startActor.actor_id,
        ...path.map(step => step.actor_id),
    ];

    return (
        <div className="space-y-6">
            <GameHeader
                startActor={startActor}
                targetActor={targetActor}
                stepsTaken={path.length}
            />

            {path.length > 0 && (
                <PathTrail startActor={startActor} steps={path} />
            )}

            <GuessPanel
                currentActor={currentActor}
                selectedMovie={selectedMovie}
                cast={cast}
                castLoading={castLoading}
                castError={castError}
                submitting={submitting}
                guessFeedback={guessFeedback}
                usedActorIds={usedActorIds}
                onSelectMovie={selectMovieForGuess}
                onClearMovie={clearSelectedMovie}
                onGuessActor={guessActor}
            />

            <div className="text-center">
                <button
                    type="button"
                    onClick={resetGame}
                    className="font-mono text-xs uppercase tracking-wide text-muted transition hover:text-paper"
                >
                    Abandon and start over
                </button>
            </div>
        </div>
    );
}
