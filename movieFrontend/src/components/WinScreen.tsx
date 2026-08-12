import type { Actor } from "../types/actor";
import type { GameStep } from "../types/game";
import PathTrail from "./PathTrail";
import ReelIcon from "./ReelIcon";

interface WinScreenProps {
    startActor: Actor;
    targetActor: Actor;
    steps: GameStep[];
    onPlayAgain: () => void;
}

export default function WinScreen({
    startActor,
    targetActor,
    steps,
    onPlayAgain,
}: WinScreenProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center rounded-xl border border-gold/30 bg-ink-soft px-6 py-10 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 text-gold-soft">
                    <ReelIcon className="h-7 w-7" />
                </div>

                <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold-soft">
                    Connected
                </p>

                <h2 className="mt-3 font-display text-3xl italic text-paper">
                    {startActor.name} → {targetActor.name}
                </h2>

                <p className="mt-2 text-sm text-paper-dim">
                    You made it in {steps.length}{" "}
                    {steps.length === 1 ? "step" : "steps"}.
                </p>

                <button
                    type="button"
                    onClick={onPlayAgain}
                    className="mt-6 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                    Play again
                </button>
            </div>

            <PathTrail startActor={startActor} steps={steps} />
        </div>
    );
}
