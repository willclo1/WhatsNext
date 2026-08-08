import { useState } from "react";
import type { Movie } from "./types/movie";
import { useMovieSearch } from "./hooks/useMovieSearch";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import LoadingState from "./components/LoadingState";
import EmptyState from "./components/EmptyState";
import NoResultsState from "./components/NoResultsState";
import ErrorState from "./components/ErrorState";
import MovieDetailModal from "./components/MovieDetailModal";
import TicketIcon from "./components/TicketIcon";

export default function App() {
    const [query, setQuery] = useState("");
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    const { movies, loading, error } = useMovieSearch(query);

    const trimmedQuery = query.trim();

    function handleRetry() {
        const currentQuery = trimmedQuery;

        setQuery("");

        window.setTimeout(() => {
            setQuery(currentQuery);
        }, 0);
    }

    return (
        <div className="min-h-screen bg-transparent text-paper">
            <header className="sticky top-0 z-30 bg-ink/92 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="shrink-0">
                            <div className="flex items-center gap-2 text-gold">
                                <TicketIcon className="h-5 w-5" />
                                <h1 className="font-display text-2xl italic tracking-tight text-paper">
                                    WhatNext
                                </h1>
                            </div>

                            <p className="mt-1 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:block">
                                Pick tonight's screening
                            </p>
                        </div>

                        <div className="w-full sm:ml-auto sm:max-w-xl">
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                            />
                        </div>
                    </div>
                </div>

                <div className="sprocket-strip" />
            </header>

            <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
                {trimmedQuery && !loading && !error && (
                    <div className="mb-7">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                            Now showing results for
                        </p>

                        <h2 className="mt-1 font-display text-3xl italic tracking-tight text-paper">
                            {trimmedQuery}
                        </h2>
                    </div>
                )}

                {!trimmedQuery && <EmptyState />}

                {trimmedQuery && loading && <LoadingState />}

                {trimmedQuery && !loading && error && (
                    <ErrorState
                        message={error}
                        onRetry={handleRetry}
                    />
                )}

                {trimmedQuery &&
                    !loading &&
                    !error &&
                    movies.length === 0 && (
                        <NoResultsState query={trimmedQuery} />
                    )}

                {trimmedQuery &&
                    !loading &&
                    !error &&
                    movies.length > 0 && (
                        <ResultsList
                            movies={movies}
                            onMovieClick={setSelectedMovie}
                        />
                    )}
            </main>

            {selectedMovie && (
                <MovieDetailModal
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                />
            )}
        </div>
    );
}
