import { useState } from "react";
import { TMDB_IMAGE_URL } from "../config";

type PosterSize = "w92" | "w154" | "w185" | "w342";

interface PosterProps {
    path: string | null | undefined;
    /** Film title — used for the fallback plate and the alt text. */
    title: string;
    size?: PosterSize;
}

/**
 * Poster art fills its parent. Films are the only imagery in this design, so
 * a missing poster gets a legible plate rather than an empty box: on a map,
 * an unlabelled station is worse than a plain one.
 */
export default function Poster({ path, title, size = "w185" }: PosterProps) {
    const [failed, setFailed] = useState(false);

    if (!path || failed) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-rail-soft p-1">
                <span className="line-clamp-4 text-center font-display text-meta leading-tight text-slate uppercase">
                    {title}
                </span>
            </div>
        );
    }

    return (
        <img
            src={`${TMDB_IMAGE_URL}/${size}${path}`}
            alt={`${title} poster`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
        />
    );
}
