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
        <div className="min-h-screen bg-[#0B0B0F] text-[#F5F5F2]">
            <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0B0F]/90 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
                    <div className="flex items-center gap-5">
                        <div className="shrink-0">
                            <h1 className="text-xl font-semibold tracking-tight">
                                WhatNext
                            </h1>

                            <p className="mt-0.5 hidden text-xs text-[#686870] sm:block">
                                Discover you next watch
                            </p>
                        </div>

                        <div className="ml-auto w-full max-w-xl">
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
                {trimmedQuery && !loading && !error && (
                    <div className="mb-7">
                        <p className="text-sm text-[#686870]">
                            Results for
                        </p>

                        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
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
