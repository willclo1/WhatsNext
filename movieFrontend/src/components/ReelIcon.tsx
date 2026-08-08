interface ReelIconProps {
    className?: string;
}

export default function ReelIcon({
    className = "h-6 w-6",
}: ReelIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="6.3" r="1.5" />
            <circle cx="16.6" cy="14.3" r="1.5" />
            <circle cx="7.4" cy="14.3" r="1.5" />
        </svg>
    );
}
