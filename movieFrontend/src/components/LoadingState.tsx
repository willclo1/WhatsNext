export default function LoadingState() {
    return (
        <div
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            aria-label="Loading search results"
        >
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                    <div className="aspect-[2/3] animate-pulse rounded-xl bg-[#18181E]" />
                    <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-[#18181E]" />
                    <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#18181E]" />
                </div>
            ))}
        </div>
    );
}
