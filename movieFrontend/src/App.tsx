import GamePage from "./features/game/GamePage";

export default function App() {
    return (
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 sm:px-8">
            <header className="border-b-[3px] border-ink py-5">
                <h1 className="text-2xl leading-none text-ink sm:text-[1.75rem]">
                    Six Degrees
                </h1>
            </header>

            <main className="flex-1 py-10 sm:py-14">
                <GamePage />
            </main>

            <footer className="border-t border-rail py-5">
                <p className="font-data text-label uppercase tracking-label text-slate">
                    Film data and artwork from TMDB
                </p>
            </footer>
        </div>
    );
}
