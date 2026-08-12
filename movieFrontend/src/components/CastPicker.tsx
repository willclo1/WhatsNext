import { useMemo, useState } from "react";
import type { CastMember } from "../types/game";
import ActorChip from "./ActorChip";

interface CastPickerProps {
    cast: CastMember[];
    onSelect: (member: CastMember) => void;
    disabledActorIds: number[];
    submitting: boolean;
}

export default function CastPicker({
    cast,
    onSelect,
    disabledActorIds,
    submitting,
}: CastPickerProps) {
    const [filter, setFilter] = useState("");

    const filtered = useMemo(() => {
        const trimmed = filter.trim().toLowerCase();

        if (!trimmed) {
            return cast;
        }

        return cast.filter(member =>
            member.name.toLowerCase().includes(trimmed),
        );
    }, [cast, filter]);

    return (
        <div>
            <input
                type="text"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                placeholder="Filter cast members…"
                className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-paper outline-none placeholder:text-muted focus:border-gold/70 focus:ring-2 focus:ring-gold/15"
            />

            <div className="mt-3 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {filtered.map(member => {
                    const isDisabled =
                        submitting || disabledActorIds.includes(member.actor_id);

                    return (
                        <button
                            key={member.actor_id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelect(member)}
                            className="text-left transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-0.5"
                        >
                            <ActorChip
                                name={member.name}
                                subtitle={member.character ?? undefined}
                            />
                        </button>
                    );
                })}

                {filtered.length === 0 && (
                    <p className="col-span-full py-4 text-center text-sm text-muted">
                        No cast members match "{filter}".
                    </p>
                )}
            </div>
        </div>
    );
}
