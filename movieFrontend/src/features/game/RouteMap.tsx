import type { ReactNode } from "react";
import type { Actor } from "../../types/actor";
import type { GameStep } from "../../types/game";
import Poster from "../../components/Poster";

/*
  The signature element.

  One continuous rail runs down the page. Track behind you is solid and drawn
  in line-a; track ahead of you is dashed and grey. Actors are stations on it,
  films are interchanges, and the panel you work in hangs off the station you
  are standing at. Every piece of game state — where you started, where you've
  been, where you are, what's left — is read off the diagram itself, so none of
  it needs a badge to explain it.

  Each row draws its own segment of rail, which is what makes the solid-to-
  dashed transition land exactly at the right station.
*/

type Track = "travelled" | "ahead" | "none";

interface RowProps {
    track: Track;
    marker: ReactNode;
    children: ReactNode;
    /** Staggers the page-load sequence; capped so long routes stay snappy. */
    index?: number;
}

function Row({ track, marker, children, index = 0 }: RowProps) {
    const trackClass =
        track === "travelled"
            ? "bg-line-a"
            : "bg-[repeating-linear-gradient(180deg,var(--color-rail)_0_6px,transparent_6px_12px)]";

    return (
        <li
            className="relative animate-station-in pb-6 pl-(--rail-gutter)"
            style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
        >
            {track !== "none" && (
                <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-(--rail-x) w-(--rail-w) origin-top -translate-x-1/2 animate-track-draw ${trackClass}`}
                />
            )}

            <span
                aria-hidden="true"
                className="absolute left-(--rail-x) top-1 -translate-x-1/2"
            >
                {marker}
            </span>

            {children}
        </li>
    );
}

/** Filled disc — a station you stopped at. */
function StationDot({ tone = "a" }: { tone?: "a" | "b" }) {
    return (
        <span
            className={`block size-(--rail-node) rounded-full ring-[3px] ring-paper ${
                tone === "a" ? "bg-line-a" : "bg-line-b"
            }`}
        />
    );
}

/** Double ring — you are standing here. */
function CurrentDot() {
    return (
        <span className="flex size-(--rail-node) items-center justify-center rounded-full bg-card ring-[3px] ring-line-a">
            <span className="block size-1.5 rounded-full bg-line-a" />
        </span>
    );
}

/** Hollow ring — a terminus you have not reached. */
function TerminusRing() {
    return (
        <span className="block size-(--rail-node) rounded-full bg-paper ring-[3px] ring-line-b" />
    );
}

/** Rotated square — an interchange, i.e. a film you changed lines at. */
function InterchangeTick() {
    return <span className="block size-2.5 rotate-45 bg-line-a" />;
}

function StationName({
    name,
    label,
    tone = "ink",
}: {
    name: string;
    label?: string;
    tone?: "ink" | "a" | "b";
}) {
    const nameTone =
        tone === "a" ? "text-line-a" : tone === "b" ? "text-line-b" : "text-ink";

    return (
        <div className="-mt-1">
            {label && (
                <p className="font-data text-label uppercase leading-normal tracking-label text-slate">
                    {label}
                </p>
            )}
            <p
                className={`font-display text-2xl uppercase leading-none tracking-tight sm:text-[1.75rem] ${nameTone}`}
            >
                {name}
            </p>
        </div>
    );
}

function Interchange({ step, index }: { step: GameStep; index: number }) {
    return (
        <Row track="travelled" marker={<InterchangeTick />} index={index}>
            <div className="flex items-center gap-3">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-station bg-rail-soft shadow-poster">
                    <Poster
                        path={step.poster_path}
                        title={step.movie_title}
                        size="w92"
                    />
                </div>

                <div className="min-w-0">
                    <p className="font-data text-label uppercase tracking-label text-slate">
                        via
                    </p>
                    <p className="truncate font-body text-sm font-semibold text-ink">
                        {step.movie_title}
                    </p>
                </div>
            </div>
        </Row>
    );
}

interface RouteMapProps {
    startActor: Actor;
    targetActor: Actor;
    steps: GameStep[];
    /** Rendered against the station you're currently standing on. */
    children?: ReactNode;
    /** When the route is complete, the last gap closes onto the target. */
    complete?: boolean;
}

export default function RouteMap({
    startActor,
    targetActor,
    steps,
    children,
    complete = false,
}: RouteMapProps) {
    const atStart = steps.length === 0;
    const currentName = steps[steps.length - 1]?.actor_name ?? startActor.name;

    return (
        <ol className="relative">
            <Row
                track="travelled"
                marker={atStart && !complete ? <CurrentDot /> : <StationDot />}
                index={0}
            >
                <StationName
                    name={startActor.name}
                    label={atStart && !complete ? "Start · you are here" : "Start"}
                    tone="a"
                />
            </Row>

            {steps.map((step, position) => {
                const isLast = position === steps.length - 1;
                const rowIndex = position * 2 + 1;
                const arrived = complete && isLast;

                return (
                    <li key={step.step_number}>
                        <ol>
                            <Interchange step={step} index={rowIndex} />

                            <Row
                                track={isLast && !complete ? "ahead" : "travelled"}
                                marker={
                                    arrived ? (
                                        <StationDot tone="b" />
                                    ) : isLast ? (
                                        <CurrentDot />
                                    ) : (
                                        <StationDot />
                                    )
                                }
                                index={rowIndex + 1}
                            >
                                <StationName
                                    name={step.actor_name}
                                    label={
                                        arrived
                                            ? "Target reached"
                                            : isLast
                                              ? "You are here"
                                              : undefined
                                    }
                                    tone={arrived ? "b" : "ink"}
                                />

                                {isLast && children}
                            </Row>
                        </ol>
                    </li>
                );
            })}

            {atStart && (
                <Row track="ahead" marker={null} index={1}>
                    <div className="-mt-2">{children}</div>
                </Row>
            )}

            {!complete && (
                <li className="relative z-0 animate-station-in pl-(--rail-gutter)">
                    <span
                        aria-hidden="true"
                        className="absolute left-(--rail-x) top-1 -translate-x-1/2"
                    >
                        <TerminusRing />
                    </span>
                    <StationName name={targetActor.name} label="Target" tone="b" />
                </li>
            )}

            <span className="sr-only">
                {complete
                    ? `Route complete: ${startActor.name} to ${targetActor.name} in ${steps.length} ${steps.length === 1 ? "hop" : "hops"}.`
                    : `You are at ${currentName}. Target: ${targetActor.name}.`}
            </span>
        </ol>
    );
}
