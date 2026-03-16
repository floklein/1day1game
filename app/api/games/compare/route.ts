import { NextResponse } from "next/server";
import { compareGuess } from "@/lib/igdb";

type ComparePayload = {
  targetId?: number;
  guessId?: number;
};

export async function POST(request: Request) {
  let payload: ComparePayload;

  try {
    payload = (await request.json()) as ComparePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetId = Number(payload.targetId);
  const guessId = Number(payload.guessId);

  if (
    !Number.isInteger(targetId) ||
    targetId <= 0 ||
    !Number.isInteger(guessId) ||
    guessId <= 0
  ) {
    return NextResponse.json(
      { error: "targetId and guessId must be positive integers." },
      { status: 400 }
    );
  }

  try {
    const result = await compareGuess(targetId, guessId);

    if (!result) {
      return NextResponse.json(
        { error: "Unable to compare this guess." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to compare guess", error);

    return NextResponse.json(
      { error: "Unable to compare the guess right now." },
      { status: 500 }
    );
  }
}
