import SearchIcon from "./SearchIcon";

export default function EmptyState() {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#101015] px-6 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B1B22] text-[#A4A4AC]">
                <SearchIcon className="h-6 w-6" />
            </div>

            <h2 className="text-xl font-semibold text-[#F5F5F2]">
                Find your next movie
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#686870]">
                Search by title to explore your movie collection.
            </p>
        </div>
    );
}
