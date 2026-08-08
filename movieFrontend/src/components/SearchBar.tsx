import SearchIcon from "./SearchIcon";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export default function SearchBar({
    value,
    onChange,
}: SearchBarProps) {
    return (
        <div className="relative w-full">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#686870]" />

            <input
                type="search"
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder="Search movies..."
                aria-label="Search movies"
                autoComplete="off"
                className="h-14 w-full rounded-xl border border-white/10 bg-[#141419] pl-12 pr-4 text-base text-[#F5F5F2] outline-none placeholder:text-[#686870] transition focus:border-[#E8A84A]/60 focus:ring-2 focus:ring-[#E8A84A]/10"
            />
        </div>
    );
}
