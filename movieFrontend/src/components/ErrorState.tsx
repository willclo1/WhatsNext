import ReelIcon from "./ReelIcon";

interface ErrorStateProps {
    message: string;
    onRetry: () => void;
}

export default function ErrorState({
    message,
    onRetry,
}: ErrorStateProps) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-velvet/20 bg-ink-soft px-6 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-velvet/40 text-velvet-soft">
                <ReelIcon className="h-6 w-6" />
            </div>

            <h2 className="font-display text-2xl italic text-paper">
                Something went wrong
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-paper-dim">
                {message}
            </p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-6 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
                Try again
            </button>
        </div>
    );
}
