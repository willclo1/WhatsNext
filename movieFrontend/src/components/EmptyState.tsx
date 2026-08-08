import ReelIcon from "./ReelIcon";

export default function EmptyState() {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-line bg-ink-soft px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 text-gold-soft">
                <ReelIcon className="h-7 w-7" />
            </div>

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Ready when you are
            </p>

            <h2 className="mt-3 font-display text-2xl italic text-paper">
                Find your next movie
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-paper-dim">
                Search by title to explore your collection.
            </p>
        </div>
    );
}
