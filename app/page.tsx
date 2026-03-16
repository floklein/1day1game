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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(111,76,255,0.22),_transparent_45%),linear-gradient(180deg,_#0f1020_0%,_#111827_100%)] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center justify-center">
        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/8 p-10 text-center shadow-2xl shadow-black/25 backdrop-blur">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            1 Day 1 Game
          </h1>
          <p className="mt-4 text-base leading-7 text-white/75 sm:text-lg">
            Start with a random game, then guess the hidden title from
            cumulative clues.
          </p>
          <form action={startRandomGame} className="mt-10">
            <Button
              type="submit"
              size="lg"
              className="h-14 rounded-full bg-white px-8 text-base font-semibold text-slate-950 hover:bg-white/90"
            >
              Random
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
