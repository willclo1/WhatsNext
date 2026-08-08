import ReelIcon from "./ReelIcon";

interface NoResultsStateProps {
    query: string;
}

export default function NoResultsState({
    query,
}: NoResultsStateProps) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-line bg-ink-soft px-6 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-line text-muted">
                <ReelIcon className="h-6 w-6" />
            </div>

            <h2 className="font-display text-2xl italic text-paper">
                No movies found
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-paper-dim">
                Nothing matched{" "}
                <span className="font-mono text-paper">"{query}"</span>.
                Try another title.
            </p>
        </div>
    );
}
