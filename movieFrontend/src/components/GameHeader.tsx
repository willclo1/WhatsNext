import type { Actor } from "../types/actor";
import PersonAvatar from "./PersonAvatar";

interface GameHeaderProps {
    startActor: Actor;
    targetActor: Actor;
    stepsTaken: number;
}

export default function GameHeader({
    startActor,
    targetActor,
    stepsTaken,
}: GameHeaderProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-line bg-ink-soft">
            <div className="sprocket-strip" />

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-6 sm:p-8">
                <div className="flex flex-col items-center gap-3 text-center">
                    <PersonAvatar
                        name={startActor.name}
                        size="lg"
                        highlight="gold"
                    />

                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                            Starting at
                        </p>
                        <p className="mt-1 font-display text-xl italic text-paper">
                            {startActor.name}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-muted">
                    <span className="font-mono text-2xl">→</span>
                    <span className="font-mono text-[11px] uppercase tracking-wide">
                        {stepsTaken} {stepsTaken === 1 ? "step" : "steps"}
                    </span>
                </div>

                <div className="flex flex-col items-center gap-3 text-center">
                    <PersonAvatar
                        name={targetActor.name}
                        size="lg"
                        highlight="velvet"
                    />

                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                            Reach
                        </p>
                        <p className="mt-1 font-display text-xl italic text-paper">
                            {targetActor.name}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
