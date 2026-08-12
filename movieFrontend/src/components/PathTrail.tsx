import type { Actor } from "../types/actor";
import type { GameStep } from "../types/game";
import ActorChip from "./ActorChip";
import MovieChip from "./MovieChip";

interface PathTrailProps {
    startActor: Actor;
    steps: GameStep[];
}

export default function PathTrail({ startActor, steps }: PathTrailProps) {
    return (
        <div className="rounded-xl border border-line bg-surface/60 p-5">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Your chain
            </p>

            <div className="flex flex-wrap items-center gap-3">
                <ActorChip name={startActor.name} highlight="gold" />

                {steps.map(step => (
                    <div
                        key={step.step_number}
                        className="flex items-center gap-3"
                    >
                        <span className="text-line">—</span>
                        <MovieChip title={step.movie_title} />
                        <span className="text-line">—</span>
                        <ActorChip name={step.actor_name} />
                    </div>
                ))}
            </div>
        </div>
    );
}
