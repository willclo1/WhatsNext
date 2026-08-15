import { useState } from "react";
import { TMDB_IMAGE_URL } from "../config";

interface PersonPhotoProps {
    path: string | null | undefined;
    /** Used for the fallback monogram; the image itself is decorative. */
    name: string;
    className?: string;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/**
 * A headshot, filling its parent. About 8% of actors have no photo on file, so
 * the monogram fallback is a normal state rather than an error one.
 *
 * `alt` is deliberately empty: every photo in this UI sits directly beside the
 * actor's name, so announcing it again is noise for a screen reader.
 */
export default function PersonPhoto({
    path,
    name,
    className = "",
}: PersonPhotoProps) {
    const [failed, setFailed] = useState(false);

    if (!path || failed) {
        return (
            <span
                aria-hidden="true"
                className={`flex h-full w-full items-center justify-center bg-rail-soft font-display text-[0.7em] leading-none text-slate ${className}`}
            >
                {initials(name)}
            </span>
        );
    }

    return (
        <img
            src={`${TMDB_IMAGE_URL}/w185${path}`}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover ${className}`}
        />
    );
}
