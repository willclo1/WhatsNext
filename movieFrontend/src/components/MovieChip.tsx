import TicketIcon from "./TicketIcon";

interface MovieChipProps {
    title: string;
}

export default function MovieChip({ title }: MovieChipProps) {
    return (
        <div className="flex items-center gap-2 rounded-full border border-dashed border-gold/30 bg-ink-soft px-3 py-1.5 text-gold-soft">
            <TicketIcon className="h-4 w-4" />
            <span className="whitespace-nowrap text-xs font-medium">
                {title}
            </span>
        </div>
    );
}
