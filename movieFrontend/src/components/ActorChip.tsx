import PersonAvatar from "./PersonAvatar";

interface ActorChipProps {
    name: string;
    subtitle?: string;
    highlight?: "gold" | "velvet" | "none";
}

export default function ActorChip({
    name,
    subtitle,
    highlight = "none",
}: ActorChipProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
            <PersonAvatar name={name} size="sm" highlight={highlight} />

            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-paper">
                    {name}
                </p>

                {subtitle && (
                    <p className="truncate font-mono text-[11px] uppercase tracking-wide text-muted">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
