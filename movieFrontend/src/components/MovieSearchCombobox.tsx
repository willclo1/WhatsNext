import { useEffect, useRef, useState } from "react";
import { useMovieSearch } from "../hooks/useMovieSearch";
import type { Movie } from "../types/movie";
import SearchIcon from "./SearchIcon";

interface MovieSearchComboboxProps {
    onSelect: (movie: Movie) => void;
    placeholder?: string;
}

export default function MovieSearchCombobox({
    onSelect,
    placeholder = "Search for a movie…",
}: MovieSearchComboboxProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { movies, loading, error } = useMovieSearch(query);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSelect(movie: Movie) {
        onSelect(movie);
        setQuery("");
        setOpen(false);
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

                <input
                    type="search"
                    value={query}
                    onChange={event => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="h-12 w-full rounded-md border border-line bg-surface pl-10 pr-4 text-sm text-paper outline-none placeholder:text-muted focus:border-gold/70 focus:ring-2 focus:ring-gold/15"
                />
            </div>

            {open && query.trim() && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border border-line bg-ink-soft shadow-2xl">
                    {loading && (
                        <p className="px-4 py-3 text-sm text-muted">
                            Searching…
                        </p>
                    )}

                    {error && (
                        <p className="px-4 py-3 text-sm text-velvet-soft">
                            {error}
                        </p>
                    )}

                    {!loading && !error && movies.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted">
                            No movies found.
                        </p>
                    )}

                    {!loading &&
                        !error &&
                        movies.slice(0, 8).map(movie => (
                            <button
                                key={movie.tmdb_id}
                                type="button"
                                onClick={() => handleSelect(movie)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-paper transition hover:bg-surface"
                            >
                                <span className="truncate">
                                    {movie.title}
                                </span>

                                {movie.release_date && (
                                    <span className="shrink-0 font-mono text-xs text-muted">
                                        {movie.release_date.slice(0, 4)}
                                    </span>
                                )}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
