import { useEffect, useState } from "react";
import type { Movie } from "../types/movie";
import { getMovie } from "../api/movies";
import { TMDB_IMAGE_URL } from "../config";
import CloseIcon from "./CloseIcon";

interface MovieDetailModalProps {
    movie: Movie;
    onClose: () => void;
}

function getYear(date: string | null): string | null {
    return date ? date.slice(0, 4) : null;
}

export default function MovieDetailModal({
    movie,
    onClose,
}: MovieDetailModalProps) {
    const [details, setDetails] = useState<Movie>(movie);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError(null);

        getMovie(movie.tmdb_id, controller.signal)
            .then(setDetails)
            .catch(requestError => {
                if (controller.signal.aborted) return;

                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Unable to load movie details.",
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [movie.tmdb_id]);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const year = getYear(details.release_date);

    const posterUrl = details.poster_path
        ? `${TMDB_IMAGE_URL}/w780${details.poster_path}`
        : null;

    const backdropUrl = details.backdrop_path
        ? `${TMDB_IMAGE_URL}/original${details.backdrop_path}`
        : null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-[#0B0B0F]/95 p-4 backdrop-blur-md sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${details.title} details`}
            onMouseDown={event => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="relative mx-auto min-h-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#101015] shadow-2xl">
                {backdropUrl && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden">
                        <img
                            src={backdropUrl}
                            alt=""
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#101015]/10 via-[#101015]/70 to-[#101015]" />
                    </div>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close movie details"
                    className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-[#F5F5F2] backdrop-blur transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A84A]"
                >
                    <CloseIcon />
                </button>

                <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:grid-cols-[280px_1fr]">
                    <div>
                        <div className="mx-auto max-w-[280px] overflow-hidden rounded-xl bg-[#1B1B22] shadow-2xl lg:mx-0">
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={`${details.title} poster`}
                                    className="w-full"
                                />
                            ) : (
                                <div className="flex aspect-[2/3] items-center justify-center p-6 text-center text-sm text-[#686870]">
                                    No poster available
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 sm:pt-8">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#A4A4AC]">
                            {year && <span>{year}</span>}

                            {year && details.original_language && (
                                <span className="text-[#686870]">·</span>
                            )}

                            {details.original_language && (
                                <span>
                                    {details.original_language.toUpperCase()}
                                </span>
                            )}

                            {details.vote_average != null && (
                                <>
                                    <span className="text-[#686870]">·</span>
                                    <span className="font-medium text-[#E8A84A]">
                                        {details.vote_average.toFixed(1)}/10
                                    </span>
                                </>
                            )}
                        </div>

                        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#F5F5F2] sm:text-5xl">
                            {details.title}
                        </h1>

                        {details.original_title &&
                            details.original_title !== details.title && (
                                <p className="mt-2 text-sm text-[#686870]">
                                    {details.original_title}
                                </p>
                            )}

                        {details.overview && (
                            <section className="mt-8">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#686870]">
                                    Synopsis
                                </h2>

                                <p className="mt-3 max-w-2xl text-base leading-7 text-[#C4C4CA]">
                                    {details.overview}
                                </p>
                            </section>
                        )}

                        <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
                            {details.vote_count != null && (
                                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                                    <p className="text-xs uppercase tracking-wider text-[#686870]">
                                        Votes
                                    </p>
                                    <p className="mt-1 text-[#F5F5F2]">
                                        {details.vote_count.toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {details.popularity != null && (
                                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                                    <p className="text-xs uppercase tracking-wider text-[#686870]">
                                        Popularity
                                    </p>
                                    <p className="mt-1 text-[#F5F5F2]">
                                        {details.popularity.toFixed(1)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {loading && (
                            <p className="mt-8 text-sm text-[#686870]">
                                Loading full details…
                            </p>
                        )}

                        {error && (
                            <p className="mt-8 text-sm text-red-300">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
