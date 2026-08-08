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
            <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-gold/25" />

            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

            <input
                type="search"
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder="Search the marquee…"
                aria-label="Search movies"
                autoComplete="off"
                className="relative h-14 w-full rounded-lg border border-line bg-surface pl-12 pr-4 text-base text-paper outline-none placeholder:text-muted transition focus:border-gold/70 focus:ring-2 focus:ring-gold/15"
            />
        </div>
    );
}
