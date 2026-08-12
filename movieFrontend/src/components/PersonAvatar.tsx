interface PersonAvatarProps {
    name: string;
    size?: "sm" | "md" | "lg";
    highlight?: "gold" | "velvet" | "none";
}

const SIZE_CLASSES: Record<NonNullable<PersonAvatarProps["size"]>, string> = {
    sm: "h-9 w-9 text-xs",
    md: "h-14 w-14 text-base",
    lg: "h-20 w-20 text-xl",
};

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

export default function PersonAvatar({
    name,
    size = "md",
    highlight = "none",
}: PersonAvatarProps) {
    const ring =
        highlight === "gold"
            ? "border-gold/60 text-gold-soft"
            : highlight === "velvet"
              ? "border-velvet/50 text-velvet-soft"
              : "border-line text-paper-dim";

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-full border bg-surface font-mono font-semibold ${ring} ${SIZE_CLASSES[size]}`}
            aria-hidden="true"
        >
            {getInitials(name)}
        </div>
    );
}
