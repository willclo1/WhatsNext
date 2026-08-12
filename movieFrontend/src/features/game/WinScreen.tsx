import type { Actor } from "../../types/actor";
import type { GameStep } from "../../types/game";
import RouteMap from "./RouteMap";

interface WinScreenProps {
    startActor: Actor;
    targetActor: Actor;
    steps: GameStep[];
    onStartAnother: () => void;
}

/*
  Winning doesn't switch to a different screen — the same route map stays put
  and its last gap closes. The reward is seeing the line you drew complete.
*/
export default function WinScreen({
    startActor,
    targetActor,
    steps,
    onStartAnother,
}: WinScreenProps) {
    return (
        <div className="animate-rise">
            <p className="font-data text-meta uppercase tracking-plate text-line-b">
                Route complete
            </p>

            <h2 className="mt-2 max-w-[16ch] text-[clamp(2.25rem,8vw,3.75rem)] text-ink">
                {startActor.name} to {targetActor.name}
            </h2>

            <p className="mt-3 font-body text-lg text-slate">
                You connected them in {steps.length}{" "}
                {steps.length === 1 ? "hop" : "hops"}.
            </p>

            <button
                type="button"
                onClick={onStartAnother}
                className="mt-6 h-12 rounded-card bg-line-a px-7 font-display text-xl uppercase tracking-wide text-card transition-colors hover:bg-ink"
            >
                Start another route
            </button>

            <div className="mt-12 border-t border-rail pt-8">
                <RouteMap
                    startActor={startActor}
                    targetActor={targetActor}
                    steps={steps}
                    complete
                />
            </div>
        </div>
    );
}
