import { NextResponse } from "next/server";
import { getRandomPopularGameId } from "@/lib/igdb";

export async function GET() {
  try {
    const gameId = await getRandomPopularGameId();
    return NextResponse.json({ gameId });
  } catch (error) {
    console.error("Failed to get a random game", error);

    return NextResponse.json(
      { error: "Unable to start a new game right now." },
      { status: 500 }
    );
  }
}
