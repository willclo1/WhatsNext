export default function LoadingState() {
    return (
        <div
            className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            aria-label="Loading search results"
        >
            {Array.from({ length: 10 }).map((_, index) => (
                <div
                    key={index}
                    className="overflow-hidden rounded-lg bg-surface ring-1 ring-line"
                >
                    <div className="aspect-[2/3] animate-pulse bg-surface-raised" />
                    <div className="perforation" />
                    <div className="space-y-2 p-4">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-raised" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-raised" />
                    </div>
                </div>
            ))}
        </div>
    );
}
