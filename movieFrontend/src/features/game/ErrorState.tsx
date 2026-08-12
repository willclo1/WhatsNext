interface ErrorStateProps {
    message: string;
    onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <div className="animate-rise max-w-lg">
            <p className="font-data text-meta uppercase tracking-plate text-line-b">
                Line closed
            </p>

            <h2 className="mt-2 text-[clamp(2rem,7vw,3rem)] text-ink">
                The route stopped here
            </h2>

            <p className="mt-3 border-l-[3px] border-line-b bg-line-b-wash py-2 pl-3 font-body text-base text-ink">
                {message}
            </p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-6 h-12 rounded-card bg-line-a px-7 font-display text-xl uppercase tracking-wide text-card transition-colors hover:bg-ink"
            >
                Start a route
            </button>
        </div>
    );
}
