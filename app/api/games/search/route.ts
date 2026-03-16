import { NextResponse } from "next/server";
import { searchGames } from "@/lib/igdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchGames(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to search games", error);

    return NextResponse.json(
      { error: "Unable to search games right now." },
      { status: 500 }
    );
  }
}
