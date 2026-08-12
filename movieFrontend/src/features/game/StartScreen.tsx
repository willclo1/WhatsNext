interface StartScreenProps {
    onStart: () => void;
}

/*
  The hero is the diagram itself, drawn in miniature with the rules of the
  game as its station labels. It states what you do rather than describing it,
  and it teaches the notation used by the live route on the next screen.
*/

const LEGEND = [
    { marker: "start", text: "You begin at one actor." },
    { marker: "film", text: "Name a film they appeared in." },
    { marker: "stop", text: "Move to anyone in its cast." },
    { marker: "target", text: "Keep going until you reach the target." },
];

export default function StartScreen({ onStart }: StartScreenProps) {
    return (
        <div className="animate-rise">
            <h2 className="max-w-[14ch] text-[clamp(2.75rem,11vw,5rem)] text-ink">
                Connect two actors
            </h2>

            <p className="mt-5 max-w-md font-body text-lg text-slate">
                Every film they share is a stop on the line. Find a route from
                the first actor to the second.
            </p>

            <ol className="mt-14">
                {LEGEND.map((item, index) => {
                    const last = index === LEGEND.length - 1;

                    return (
                        <li
                            key={item.marker}
                            className="relative animate-station-in pb-7 pl-(--rail-gutter)"
                            style={{ animationDelay: `${index * 70}ms` }}
                        >
                            {!last && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute inset-y-0 left-(--rail-x) w-(--rail-w) -translate-x-1/2 ${
                                        index === LEGEND.length - 2
                                            ? "bg-[repeating-linear-gradient(180deg,var(--color-rail)_0_6px,transparent_6px_12px)]"
                                            : "bg-line-a"
                                    }`}
                                />
                            )}

                            <span
                                aria-hidden="true"
                                className="absolute left-(--rail-x) top-1 -translate-x-1/2"
                            >
                                {item.marker === "film" ? (
                                    <span className="block size-2.5 rotate-45 bg-line-a" />
                                ) : item.marker === "target" ? (
                                    <span className="block size-(--rail-node) rounded-full bg-paper ring-[3px] ring-line-b" />
                                ) : (
                                    <span className="block size-(--rail-node) rounded-full bg-line-a ring-[3px] ring-paper" />
                                )}
                            </span>

                            <p className="-mt-1 font-body text-base text-ink">
                                {item.text}
                            </p>
                        </li>
                    );
                })}
            </ol>

            <button
                type="button"
                onClick={onStart}
                className="mt-2 h-12 rounded-card bg-line-a px-7 font-display text-xl uppercase tracking-wide text-card transition-colors hover:bg-ink"
            >
                Start a route
            </button>
        </div>
    );
}
