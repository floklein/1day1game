import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameplayClient } from "@/components/gameplay-client";
import { getGameForComparison, getTargetFieldAvailability } from "@/lib/igdb";

type GamePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "Guess the game",
  description: "Find the hidden game from cumulative clues.",
};

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  const targetId = Number(id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    notFound();
  }

  const targetGame = await getGameForComparison(targetId);

  if (!targetGame) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(111,76,255,0.18),_transparent_40%),linear-gradient(180deg,_#0b1020_0%,_#111827_100%)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <GameplayClient
          targetId={targetId}
          targetFieldAvailability={getTargetFieldAvailability(targetGame)}
        />
      </div>
    </main>
  );
}
