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
            className="group w-full text-left outline-none"
        >
            <div className="overflow-hidden rounded-xl bg-[#141419] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/15 group-focus-visible:ring-2 group-focus-visible:ring-[#E8A84A]">
                <div className="aspect-[2/3] overflow-hidden bg-[#1B1B22]">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={`${movie.title} poster`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#686870]">
                            No poster available
                        </div>
                    )}
                </div>

                <div className="space-y-1 p-4">
                    <h2 className="line-clamp-2 font-semibold leading-snug text-[#F5F5F2]">
                        {movie.title}
                    </h2>

                    <div className="flex items-center gap-2 text-sm text-[#A4A4AC]">
                        {year && <span>{year}</span>}

                        {year && movie.vote_average !== null && (
                            <span className="text-[#686870]">·</span>
                        )}

                        {movie.vote_average !== null && (
                            <span className="text-[#E8A84A]">
                                {movie.vote_average.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
