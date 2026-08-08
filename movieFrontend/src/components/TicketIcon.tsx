interface TicketIconProps {
    className?: string;
}

export default function TicketIcon({
    className = "h-5 w-5",
}: TicketIconProps) {
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
            <path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a1.6 1.6 0 0 0 0 5v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1.6 1.6 0 0 0 0-5Z" />
            <path d="M14 6.5v11" strokeDasharray="1.6 2.4" />
        </svg>
    );
}
