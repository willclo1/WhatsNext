interface NoResultsStateProps {
    query: string;
}

export default function NoResultsState({
    query,
}: NoResultsStateProps) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#101015] px-6 text-center">
            <h2 className="text-xl font-semibold text-[#F5F5F2]">
                No movies found
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#686870]">
                Nothing matched{" "}
                <span className="text-[#A4A4AC]">"{query}"</span>.
                Try another title.
            </p>
        </div>
    );
}
