import type { Movie } from "../types/movie";
import { TMDB_IMAGE_URL } from "../config";

interface MovieCardProps {
    movie: Movie;
    onClick: (movie: Movie) => void;
}

function getYear(date: string | null): string | null {
    return date ? date.slice(0, 4) : null;
}

export default function MovieCard({
    movie,
    onClick,
}: MovieCardProps) {
    const year = getYear(movie.release_date);

    const posterUrl = movie.poster_path
        ? `${TMDB_IMAGE_URL}/w500${movie.poster_path}`
        : null;

    return (
        <button
            type="button"
            onClick={() => onClick(movie)}
            className="lift group w-full text-left outline-none"
        >
            <div className="overflow-hidden rounded-lg bg-surface ring-1 ring-line group-hover:-translate-y-1 group-hover:ring-gold/40 group-hover:shadow-[0_18px_40px_-18px_rgb(232_170_61_/_0.35)] group-focus-visible:ring-2 group-focus-visible:ring-gold">
                <div className="relative aspect-[2/3] overflow-hidden bg-ink-soft">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={`${movie.title} poster`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
                            No poster available
                        </div>
                    )}

                    {movie.vote_average !== null && (
                        <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-1 font-mono text-xs font-semibold text-gold-soft backdrop-blur">
                            ★ {movie.vote_average.toFixed(1)}
                        </span>
                    )}
                </div>

                <div className="perforation" />

                <div className="space-y-1 p-4">
                    <h2 className="line-clamp-2 font-semibold leading-snug text-paper">
                        {movie.title}
                    </h2>

                    {year && (
                        <p className="font-mono text-xs tracking-wide text-muted">
                            {year}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );
}
