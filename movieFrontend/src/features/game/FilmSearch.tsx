import { useEffect, useId, useRef, useState } from "react";
import { useFilmSearch } from "./useFilmSearch";
import type { Movie } from "../../types/movie";
import Poster from "../../components/Poster";

interface FilmSearchProps {
    /** Whose filmography we're looking through — used for the field label. */
    actorName: string;
    onSelect: (film: Movie) => void;
}

function year(date: string | null): string {
    return date ? date.slice(0, 4) : "—";
}

/**
 * A real combobox: arrow keys move the active option, Enter picks it, Escape
 * closes the list. The previous version was a div of buttons, which looked
 * like a combobox but couldn't be driven from the keyboard.
 */
export default function FilmSearch({ actorName, onSelect }: FilmSearchProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();
    const labelId = useId();

    const { films, loading, error } = useFilmSearch(query);
    const showList = open && query.trim().length > 0;

    // Reset the highlight whenever the candidate set changes.
    useEffect(() => {
        setActiveIndex(0);
    }, [films]);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    // Keep the active option in view when arrowing past the fold.
    useEffect(() => {
        if (!showList) return;
        listRef.current
            ?.querySelector(`[data-index="${activeIndex}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, showList]);

    function choose(film: Movie) {
        onSelect(film);
        setQuery("");
        setOpen(false);
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            setOpen(false);
            return;
        }

        if (!showList || films.length === 0) {
            if (event.key === "ArrowDown") setOpen(true);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex(index => (index + 1) % films.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(index => (index - 1 + films.length) % films.length);
        } else if (event.key === "Enter") {
            event.preventDefault();
            choose(films[activeIndex]);
        }
    }

    return (
        <div ref={rootRef} className="relative">
            <label
                id={labelId}
                htmlFor={`${listId}-input`}
                className="mb-1.5 block font-body text-sm text-slate"
            >
                Find a film {actorName} was in
            </label>

            <input
                id={`${listId}-input`}
                type="text"
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    showList && films.length > 0
                        ? `${listId}-option-${activeIndex}`
                        : undefined
                }
                autoComplete="off"
                value={query}
                onChange={event => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Search by title"
                className="h-11 w-full rounded-card border border-rail bg-card px-3 font-body text-base text-ink transition-colors placeholder:text-slate/70 hover:border-slate/50 focus:border-line-a focus:outline-none"
            />

            {/*
              Results sit in the flow rather than floating over the page. The
              route is a line that grows downward, so searching lengthens it
              instead of hiding the stations underneath — no overlap, and
              nothing is covered on a narrow screen.
            */}
            {showList && (
                <div className="mt-1 w-full overflow-hidden rounded-card border border-rail bg-card shadow-menu">
                    {loading && (
                        <p
                            className="px-3 py-3 font-data text-xs uppercase tracking-label text-slate"
                            role="status"
                        >
                            Searching
                        </p>
                    )}

                    {error && !loading && (
                        <p className="px-3 py-3 font-body text-sm text-line-b">
                            {error}
                        </p>
                    )}

                    {!loading && !error && films.length === 0 && (
                        <p className="px-3 py-3 font-body text-sm text-slate">
                            No film matches “{query.trim()}”. Check the spelling,
                            or try the original title.
                        </p>
                    )}

                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-labelledby={labelId}
                        className="max-h-72 overflow-y-auto"
                    >
                        {!loading &&
                            !error &&
                            films.map((film, index) => (
                                <li
                                    key={film.tmdb_id}
                                    id={`${listId}-option-${index}`}
                                    data-index={index}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => choose(film)}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-rail-soft px-3 py-2 last:border-b-0 ${
                                        index === activeIndex
                                            ? "bg-line-a-wash"
                                            : "bg-card"
                                    }`}
                                >
                                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-station bg-rail-soft">
                                        <Poster
                                            path={film.poster_path}
                                            title={film.title}
                                            size="w92"
                                        />
                                    </div>

                                    <span className="min-w-0 flex-1 truncate font-body text-sm font-semibold text-ink">
                                        {film.title}
                                    </span>

                                    <span className="shrink-0 font-data text-meta text-slate">
                                        {year(film.release_date)}
                                    </span>
                                </li>
                            ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
