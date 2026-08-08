interface ErrorStateProps {
    message: string;
    onRetry: () => void;
}

export default function ErrorState({
    message,
    onRetry,
}: ErrorStateProps) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-red-400/10 bg-[#121216] px-6 text-center">
            <div className="mb-5 h-2 w-10 rounded-full bg-red-400/70" />

            <h2 className="text-xl font-semibold text-[#F5F5F2]">
                Something went wrong
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#686870]">
                {message}
            </p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-6 rounded-lg bg-[#E8A84A] px-4 py-2.5 text-sm font-semibold text-[#0B0B0F] transition hover:bg-[#F0B45A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A84A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F]"
            >
                Try again
            </button>
        </div>
    );
}
