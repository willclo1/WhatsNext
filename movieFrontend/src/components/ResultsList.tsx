import type { Movie } from "../types/movie";
import MovieCard from "./MovieCard";

interface ResultsListProps {
    movies: Movie[];
    onMovieClick: (movie: Movie) => void;
}

export default function ResultsList({
    movies,
    onMovieClick,
}: ResultsListProps) {
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map(movie => (
                <MovieCard
                    key={movie.tmdb_id}
                    movie={movie}
                    onClick={onMovieClick}
                />
            ))}
        </div>
    );
}
