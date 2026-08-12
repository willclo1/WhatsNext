import ReelIcon from "./ReelIcon";

interface StartScreenProps {
    onStart: () => void;
    starting: boolean;
}

export default function StartScreen({ onStart, starting }: StartScreenProps) {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-line bg-ink-soft px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 text-gold-soft">
                <ReelIcon className="h-7 w-7" />
            </div>

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Six degrees
            </p>

            <h2 className="mt-3 font-display text-2xl italic text-paper">
                Connect two actors
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-paper-dim">
                You'll get a starting actor and a target. Find a chain of
                shared movies to connect them.
            </p>

            <button
                type="button"
                onClick={onStart}
                disabled={starting}
                className="mt-6 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
                {starting ? "Starting…" : "Start a new game"}
            </button>
        </div>
    );
}
