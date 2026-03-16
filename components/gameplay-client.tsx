"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  GameSearchResult,
  GuessComparisonResult,
  TargetFieldAvailability,
  YearComparisonState,
} from "@/lib/igdb";

type GameplayClientProps = {
  targetId: number;
  targetFieldAvailability: TargetFieldAvailability;
};

type ClueSummary = {
  genres: string[];
  themes: string[];
  platforms: string[];
  gameModes: string[];
  playerPerspectives: string[];
  primaryDevelopers: string[];
  franchises: string[];
  yearLowerBound: number | null;
  yearUpperBound: number | null;
  exactYear: number | null;
};

const clueChipClassName =
  "rounded-full border px-3 py-1 text-xs font-medium tracking-wide";

function clueEntriesFromSummary(
  clues: ClueSummary,
  availability: TargetFieldAvailability
) {
  const unknownTone = "border-rose-300/30 bg-rose-400/12 text-rose-50";
  const partialTone = "border-amber-300/30 bg-amber-400/12 text-amber-50";
  const exactTone = "border-emerald-300/30 bg-emerald-400/12 text-emerald-50";

  return [
    {
      key: "genres",
      title: "Genre",
      value: !availability.hasGenres
        ? "No genre"
        : clues.genres.length > 0
          ? clues.genres.join(", ")
          : "Unknown",
      tone: !availability.hasGenres || clues.genres.length > 0 ? exactTone : unknownTone,
    },
    {
      key: "themes",
      title: "Theme",
      value: !availability.hasThemes
        ? "No theme"
        : clues.themes.length > 0
          ? clues.themes.join(", ")
          : "Unknown",
      tone: !availability.hasThemes || clues.themes.length > 0 ? exactTone : unknownTone,
    },
    {
      key: "platforms",
      title: "Platform",
      value: !availability.hasPlatforms
        ? "No platform"
        : clues.platforms.length > 0
          ? clues.platforms.join(", ")
          : "Unknown",
      tone:
        !availability.hasPlatforms || clues.platforms.length > 0
          ? exactTone
          : unknownTone,
    },
    {
      key: "modes",
      title: "Mode",
      value: !availability.hasGameModes
        ? "No mode"
        : clues.gameModes.length > 0
          ? clues.gameModes.join(", ")
          : "Unknown",
      tone:
        !availability.hasGameModes || clues.gameModes.length > 0
          ? exactTone
          : unknownTone,
    },
    {
      key: "perspectives",
      title: "Perspective",
      value: !availability.hasPlayerPerspectives
        ? "No perspective"
        : clues.playerPerspectives.length > 0
          ? clues.playerPerspectives.join(", ")
          : "Unknown",
      tone:
        !availability.hasPlayerPerspectives || clues.playerPerspectives.length > 0
          ? exactTone
          : unknownTone,
    },
    {
      key: "developer",
      title: "Developer",
      value: !availability.hasPrimaryDeveloper
        ? "No developer"
        : clues.primaryDevelopers.length > 0
          ? clues.primaryDevelopers.join(", ")
          : "Unknown",
      tone:
        !availability.hasPrimaryDeveloper || clues.primaryDevelopers.length > 0
          ? exactTone
          : unknownTone,
    },
    {
      key: "franchise",
      title: "Franchise",
      value: !availability.hasFranchise
        ? "No franchise"
        : clues.franchises.length > 0
          ? clues.franchises.join(", ")
          : "Unknown",
      tone:
        !availability.hasFranchise || clues.franchises.length > 0
          ? exactTone
          : unknownTone,
    },
    {
      key: "year",
      title: "Release year",
      value: !availability.hasReleaseYear
        ? "No release year"
        : clues.exactYear
          ? `${clues.exactYear}`
          : clues.yearLowerBound && clues.yearUpperBound
            ? `${clues.yearLowerBound} - ${clues.yearUpperBound}`
            : clues.yearLowerBound
              ? `After ${clues.yearLowerBound}`
              : clues.yearUpperBound
                ? `Before ${clues.yearUpperBound}`
                : "Unknown",
      tone: !availability.hasReleaseYear
        ? exactTone
        : clues.exactYear
          ? exactTone
          : clues.yearLowerBound || clues.yearUpperBound
            ? partialTone
            : unknownTone,
    },
  ];
}

function getYearHintLabel(state: YearComparisonState, year: number | null) {
  if (!year) {
    return "Release year unknown";
  }

  switch (state) {
    case "exact":
      return `Released in ${year}`;
    case "target_is_earlier":
      return `Before ${year}`;
    case "target_is_later":
      return `After ${year}`;
    default:
      return `Guessed year: ${year}`;
  }
}

function buildClueSummary(history: GuessComparisonResult[]): ClueSummary {
  const genres = new Set<string>();
  const themes = new Set<string>();
  const platforms = new Set<string>();
  const gameModes = new Set<string>();
  const playerPerspectives = new Set<string>();
  const primaryDevelopers = new Set<string>();
  const franchises = new Set<string>();

  let yearLowerBound: number | null = null;
  let yearUpperBound: number | null = null;
  let exactYear: number | null = null;

  for (const attempt of history) {
    attempt.comparison.sharedGenres.forEach((value) => genres.add(value));
    attempt.comparison.sharedThemes.forEach((value) => themes.add(value));
    attempt.comparison.sharedPlatforms.forEach((value) => platforms.add(value));
    attempt.comparison.sharedGameModes.forEach((value) =>
      gameModes.add(value)
    );
    attempt.comparison.sharedPlayerPerspectives.forEach((value) =>
      playerPerspectives.add(value)
    );

    if (attempt.comparison.primaryDeveloperMatch && attempt.guess.primaryDeveloper) {
      primaryDevelopers.add(attempt.guess.primaryDeveloper);
    }

    if (attempt.comparison.franchiseMatch && attempt.guess.franchise) {
      franchises.add(attempt.guess.franchise);
    }

    const guessedYear = attempt.guess.releaseYear;

    if (!guessedYear) {
      continue;
    }

    if (attempt.comparison.year === "exact") {
      exactYear = guessedYear;
      yearLowerBound = guessedYear;
      yearUpperBound = guessedYear;
      continue;
    }

    if (attempt.comparison.year === "target_is_later") {
      yearLowerBound =
        yearLowerBound === null
          ? guessedYear
          : Math.max(yearLowerBound, guessedYear);
    }

    if (attempt.comparison.year === "target_is_earlier") {
      yearUpperBound =
        yearUpperBound === null
          ? guessedYear
          : Math.min(yearUpperBound, guessedYear);
    }
  }

  return {
    genres: Array.from(genres),
    themes: Array.from(themes),
    platforms: Array.from(platforms),
    gameModes: Array.from(gameModes),
    playerPerspectives: Array.from(playerPerspectives),
    primaryDevelopers: Array.from(primaryDevelopers),
    franchises: Array.from(franchises),
    yearLowerBound,
    yearUpperBound,
    exactYear,
  };
}

function FieldRow({
  label,
  values,
  sharedValues,
}: {
  label: string;
  values: string[];
  sharedValues: string[];
}) {
  if (values.length === 0) {
    return null;
  }

  const shared = new Set(sharedValues);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isMatch = shared.has(value);

          return (
            <span
              key={`${label}-${value}`}
              className={cn(
                clueChipClassName,
                isMatch
                  ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-100"
                  : "border-white/10 bg-white/5 text-white/55"
              )}
            >
              {value}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function GuessCard({ attempt }: { attempt: GuessComparisonResult }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/6 p-4 shadow-lg shadow-black/10 backdrop-blur sm:p-5">
      <div className="flex items-start gap-4">
        {attempt.guess.coverUrl ? (
          <Image
            src={attempt.guess.coverUrl}
            alt={attempt.guess.name}
            width={88}
            height={116}
            className="h-[116px] w-[88px] rounded-2xl border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-[116px] w-[88px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-center text-xs text-white/40">
            No cover
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {attempt.guess.name}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Guess #{attempt.guessNumber}
              </p>
            </div>
            {attempt.isCorrect ? (
              <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">
                Correct
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/60">
                Keep going
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow
              label="Genres"
              values={attempt.guess.genres}
              sharedValues={attempt.comparison.sharedGenres}
            />
            <FieldRow
              label="Themes"
              values={attempt.guess.themes}
              sharedValues={attempt.comparison.sharedThemes}
            />
            <FieldRow
              label="Platforms"
              values={attempt.guess.platforms}
              sharedValues={attempt.comparison.sharedPlatforms}
            />
            <FieldRow
              label="Modes"
              values={attempt.guess.gameModes}
              sharedValues={attempt.comparison.sharedGameModes}
            />
            <FieldRow
              label="Perspective"
              values={attempt.guess.playerPerspectives}
              sharedValues={attempt.comparison.sharedPlayerPerspectives}
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                Release year
              </p>
              <span
                className={cn(
                  clueChipClassName,
                  attempt.comparison.year === "exact"
                    ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-100"
                    : "border-amber-300/35 bg-amber-300/12 text-amber-50"
                )}
              >
                {getYearHintLabel(
                  attempt.comparison.year,
                  attempt.guess.releaseYear
                )}
              </span>
            </div>

            {attempt.guess.primaryDeveloper ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                  Primary developer
                </p>
                <span
                  className={cn(
                    clueChipClassName,
                    attempt.comparison.primaryDeveloperMatch
                      ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/55"
                  )}
                >
                  {attempt.guess.primaryDeveloper}
                </span>
              </div>
            ) : null}

            {attempt.guess.franchise ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                  Franchise
                </p>
                <span
                  className={cn(
                    clueChipClassName,
                    attempt.comparison.franchiseMatch
                      ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/55"
                  )}
                >
                  {attempt.guess.franchise}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function GameplayClient({
  targetId,
  targetFieldAvailability,
}: GameplayClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [history, setHistory] = useState<GuessComparisonResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isGuessing, startGuessTransition] = useTransition();
  const [isStartingRandom, startRandomTransition] = useTransition();

  const deferredQuery = useDeferredValue(query);
  const guessedIds = useMemo(() => new Set(history.map((item) => item.guess.id)), [history]);
  const clues = useMemo(() => buildClueSummary(history), [history]);
  const clueEntries = useMemo(
    () => clueEntriesFromSummary(clues, targetFieldAvailability),
    [clues, targetFieldAvailability]
  );
  const solved = history.some((item) => item.isCorrect);

  useEffect(() => {
    if (deferredQuery.trim().length < 2 || solved) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    startSearchTransition(async () => {
      try {
        const response = await fetch(
          `/api/games/search?q=${encodeURIComponent(deferredQuery.trim())}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const payload = (await response.json()) as { results: GameSearchResult[] };
        setResults(payload.results.filter((item) => !guessedIds.has(item.id)));
        setSearchError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setResults([]);
        setSearchError("Unable to search games right now.");
      }
    });

    return () => controller.abort();
  }, [deferredQuery, guessedIds, solved]);

  function submitGuess(gameId: number) {
    if (solved || guessedIds.has(gameId)) {
      return;
    }

    setGuessError(null);
    setQuery("");
    setResults([]);

    startGuessTransition(async () => {
      try {
        const response = await fetch("/api/games/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetId,
            guessId: gameId,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Comparison failed");
        }

        const payload = (await response.json()) as GuessComparisonResult;

        setHistory((current) => [
          ...current,
          { ...payload, guessNumber: current.length + 1 },
        ]);
      } catch (error) {
        console.error(error);
        setGuessError(
          error instanceof Error ? error.message : "Unable to submit guess."
        );
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (results.length > 0) {
      submitGuess(results[0].id);
    }
  }

  function startRandomGame() {
    startRandomTransition(async () => {
      try {
        const response = await fetch("/api/games/random");

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to start a new game.");
        }

        const payload = (await response.json()) as { gameId: number };
        router.push(`/${payload.gameId}`);
      } catch (error) {
        console.error(error);
        setGuessError(
          error instanceof Error
            ? error.message
            : "Unable to start a new game right now."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-2xl shadow-black/10 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Find the hidden game
              </h1>
            </div>
            <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10">
              {history.length} guess{history.length > 1 ? "es" : ""}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                Cumulative clues
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {clueEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className={cn(
                      "min-h-24 rounded-2xl border p-3",
                      entry.tone
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
                      {entry.title}
                    </p>
                    <p className="mt-3 text-sm leading-6">
                      {entry.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="space-y-3">
              <label
                htmlFor="game-search"
                className="block text-xs font-semibold uppercase tracking-[0.22em] text-white/45"
              >
                Search a game
              </label>
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-2">
                <input
                  id="game-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    solved
                      ? "Puzzle solved"
                      : "Type a game title and press Enter or choose a result"
                  }
                  disabled={solved || isGuessing}
                  className="w-full rounded-[1.25rem] bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>

            {searchError ? (
              <p className="text-sm text-rose-200">{searchError}</p>
            ) : null}

            {!solved && results.length > 0 ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70">
                <ul className="divide-y divide-white/8">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => submitGuess(result.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/6"
                      >
                        {result.coverUrl ? (
                          <Image
                            src={result.coverUrl}
                            alt={result.name}
                            width={44}
                            height={58}
                            className="h-[58px] w-[44px] rounded-xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-[58px] w-[44px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-[10px] text-white/35">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {result.name}
                          </p>
                          <p className="text-xs text-white/50">
                            {result.releaseYear ?? "Unknown year"}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      </header>

      {guessError ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {guessError}
        </div>
      ) : null}

      {solved ? (
        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5 text-emerald-50 shadow-lg shadow-emerald-950/15">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
            Solved
          </p>
          <p className="mt-2 text-lg font-medium">
            You found the hidden game in {history.length} guess
            {history.length > 1 ? "es" : ""}.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={startRandomGame}
            disabled={isStartingRandom}
            className="mt-5 h-14 rounded-full bg-white px-8 text-base font-semibold text-slate-950 hover:bg-white/90"
          >
            Random
          </Button>
        </section>
      ) : null}

      {isSearching ? (
        <p className="text-sm text-white/45">Searching…</p>
      ) : null}
      {isGuessing ? (
        <p className="text-sm text-white/45">Comparing your guess…</p>
      ) : null}

      <section className="space-y-4 pb-10">
        {history.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-white/45">
            Your guess history will appear here.
          </div>
        ) : (
          history
            .slice()
            .reverse()
            .map((attempt) => (
              <GuessCard key={attempt.guess.id} attempt={attempt} />
            ))
        )}
      </section>
    </div>
  );
}
