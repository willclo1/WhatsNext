import { useMemo, useState } from "react";
import type { CastMember } from "../../types/game";

interface CastListProps {
    cast: CastMember[];
    visitedActorIds: number[];
    submitting: boolean;
    onChoose: (member: CastMember) => void;
}

/**
 * The cast of the chosen film. Anyone already on your route is shown but not
 * selectable — the route is a path, so it can't cross itself.
 */
export default function CastList({
    cast,
    visitedActorIds,
    submitting,
    onChoose,
}: CastListProps) {
    const [filter, setFilter] = useState("");

    const matches = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!needle) return cast;
        return cast.filter(member =>
            member.name.toLowerCase().includes(needle),
        );
    }, [cast, filter]);

    if (cast.length === 0) {
        return (
            <p className="rounded-card border border-dashed border-rail px-3 py-4 font-body text-sm text-slate">
                No cast is recorded for this film. Pick a different one to keep
                going.
            </p>
        );
    }

    return (
        <div>
            {cast.length > 8 && (
                <input
                    type="text"
                    value={filter}
                    onChange={event => setFilter(event.target.value)}
                    placeholder="Filter by name"
                    aria-label="Filter the cast by name"
                    className="mb-2 h-9 w-full rounded-card border border-rail bg-card px-3 font-body text-sm text-ink transition-colors placeholder:text-slate/70 hover:border-slate/50 focus:border-line-a focus:outline-none"
                />
            )}

            <ul className="max-h-72 overflow-y-auto">
                {matches.map(member => {
                    const visited = visitedActorIds.includes(member.actor_id);

                    return (
                        <li key={member.actor_id}>
                            <button
                                type="button"
                                disabled={visited || submitting}
                                onClick={() => onChoose(member)}
                                aria-label={
                                    visited
                                        ? `${member.name} is already on your route`
                                        : `Travel with ${member.name}`
                                }
                                className="group flex w-full items-baseline gap-2 border-b border-rail-soft py-2 text-left transition-colors last:border-b-0 enabled:hover:bg-line-a-wash disabled:cursor-not-allowed"
                            >
                                <span
                                    className={`font-display text-lg uppercase leading-tight tracking-tight ${
                                        visited
                                            ? "text-slate/60 line-through"
                                            : "text-ink group-enabled:group-hover:text-line-a"
                                    }`}
                                >
                                    {member.name}
                                </span>

                                {member.character && (
                                    <span className="min-w-0 flex-1 truncate font-body text-xs text-slate">
                                        {member.character}
                                    </span>
                                )}

                                {visited && (
                                    <span className="shrink-0 font-data text-label uppercase tracking-label text-slate">
                                        on route
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}

                {matches.length === 0 && (
                    <li className="py-3 font-body text-sm text-slate">
                        No one in this cast matches “{filter.trim()}”.
                    </li>
                )}
            </ul>
        </div>
    );
}
