import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getRandomPopularGameId } from "@/lib/igdb";

export default function Home() {
  async function startRandomGame() {
    "use server";

    const gameId = await getRandomPopularGameId();
    redirect(`/${gameId}`);
  }

  return (
    <main className="relative box-border h-screen overflow-hidden px-4 py-4 text-white sm:px-6 sm:py-5">
      <div className="mx-auto flex h-full max-w-6xl items-center">
        <section className="arcade-panel w-full rounded-[1.6rem] px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <div className="arcade-grid-bg pointer-events-none absolute inset-0 opacity-70" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:items-end">
            <div className="max-w-xl">
              <p className="arcade-kicker">Daily Game Guess</p>
              <h1 className="arcade-display arcade-text-glow mt-2 text-4xl leading-[0.95] font-semibold sm:text-5xl lg:text-6xl">
                Guess the hidden game from the clues you unlock.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                Start a random game. After each wrong guess, new clues reveal
                matching genres, themes, release year, and more.
              </p>

              <form action={startRandomGame} className="mt-6">
                <Button type="submit" size="lg" className="min-w-48 px-5">
                  Start Random Run
                </Button>
              </form>
            </div>

            <aside className="arcade-panel-soft rounded-[1.35rem] p-4 lg:p-5">
              <p className="arcade-kicker">How It Works</p>
              <h2 className="arcade-display mt-2 text-xl font-semibold text-white">
                One hidden game to find.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Each guess is compared with the target game. Shared fields stay
                visible so you can narrow down the answer.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-[0.8rem] border border-[#324055] bg-[#111927] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Start with any guess
                </span>
                <span className="rounded-[0.8rem] border border-[#324055] bg-[#111927] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Clues stay visible
                </span>
                <span className="rounded-[0.8rem] border border-[#324055] bg-[#111927] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Find the exact title
                </span>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
