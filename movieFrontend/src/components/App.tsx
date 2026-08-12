import GamePage from "./components/GamePage";
import ReelIcon from "./components/ReelIcon";

export default function App() {
    return (
        <div className="min-h-screen bg-ink text-paper">
            <header className="border-b border-line">
                <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-6">
                    <ReelIcon className="h-6 w-6 text-gold-soft" />

                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                            The Marquee
                        </p>
                        <h1 className="font-display text-xl italic text-paper">
                            Six Degrees
                        </h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 py-10">
                <GamePage />
            </main>
        </div>
    );
}
