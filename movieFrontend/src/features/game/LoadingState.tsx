/*
  The loading state is the diagram being surveyed: three stations whose track
  hasn't been laid yet. It occupies the same grid as the real route, so nothing
  jumps when the game arrives.
*/
export default function LoadingState() {
    return (
        <div role="status" aria-live="polite" className="animate-rise">
            <p className="font-data text-meta uppercase tracking-plate text-slate">
                Plotting your route
            </p>

            <ol className="mt-6" aria-hidden="true">
                {[0, 1, 2].map(index => (
                    <li
                        key={index}
                        className="relative pb-8 pl-(--rail-gutter)"
                    >
                        {index < 2 && (
                            <span className="absolute inset-y-0 left-(--rail-x) w-(--rail-w) -translate-x-1/2 bg-[repeating-linear-gradient(180deg,var(--color-rail)_0_6px,transparent_6px_12px)]" />
                        )}

                        <span className="absolute left-(--rail-x) top-1 size-(--rail-node) -translate-x-1/2 rounded-full bg-rail ring-[3px] ring-paper" />

                        <span
                            className="block h-6 max-w-[18rem] rounded-station bg-rail-soft"
                            style={{ width: `${70 - index * 15}%` }}
                        />
                    </li>
                ))}
            </ol>
        </div>
    );
}
