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
  "rounded-[0.8rem] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]";

function clueEntriesFromSummary(
  clues: ClueSummary,
  availability: TargetFieldAvailability
) {
  const unknownTone =
    "border-[#324055] bg-[#111927] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
  const partialTone =
    "border-[#7f6220] bg-[#2b2312] text-[#ffe39b] shadow-[0_10px_24px_rgba(255,176,0,0.08)]";
  const exactTone =
    "border-[#1f6672] bg-[#0f2630] text-[#b7f2ff] shadow-[0_10px_24px_rgba(89,225,255,0.08)]";

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
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const isMatch = shared.has(value);

          return (
            <span
              key={`${label}-${value}`}
              className={cn(
                clueChipClassName,
                isMatch
                  ? "border-[#1f6672] bg-[#0f2630] text-[#b7f2ff]"
                  : "border-[#324055] bg-[#111927] text-slate-300"
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
    <article className="arcade-panel rounded-[1.4rem] p-3.5 sm:p-4">
      <div className="relative flex items-start gap-3">
        {attempt.guess.coverUrl ? (
          <Image
            src={attempt.guess.coverUrl}
            alt={attempt.guess.name}
            width={72}
            height={96}
            className="h-24 w-[72px] rounded-[0.85rem] border border-white/10 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
          />
        ) : (
          <div className="flex h-24 w-[72px] items-center justify-center rounded-[0.85rem] border border-dashed border-[#324055] bg-[#111927] text-center text-[10px] uppercase tracking-[0.12em] text-slate-500">
            No cover art
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {attempt.guess.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Guess #{attempt.guessNumber}
              </p>
            </div>
            {attempt.isCorrect ? (
              <span className="rounded-[0.75rem] border border-[#1f6672] bg-[#0f2630] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b7f2ff]">
                Target acquired
              </span>
            ) : (
              <span className="rounded-[0.75rem] border border-[#324055] bg-[#111927] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Signal logged
              </span>
            )}
          </div>

          <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
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

            <div className="space-y-1.5">
              <p className="arcade-kicker">
                Release year
              </p>
              <span
                className={cn(
                  clueChipClassName,
                  attempt.comparison.year === "exact"
                    ? "border-[#1f6672] bg-[#0f2630] text-[#b7f2ff]"
                    : "border-[#7f6220] bg-[#2b2312] text-[#ffe39b]"
                )}
              >
                {getYearHintLabel(
                  attempt.comparison.year,
                  attempt.guess.releaseYear
                )}
              </span>
            </div>

            {attempt.guess.primaryDeveloper ? (
              <div className="space-y-1.5">
                <p className="arcade-kicker">
                  Primary developer
                </p>
                <span
                  className={cn(
                    clueChipClassName,
                    attempt.comparison.primaryDeveloperMatch
                      ? "border-[#1f6672] bg-[#0f2630] text-[#b7f2ff]"
                      : "border-[#324055] bg-[#111927] text-slate-300"
                  )}
                >
                  {attempt.guess.primaryDeveloper}
                </span>
              </div>
            ) : null}

            {attempt.guess.franchise ? (
              <div className="space-y-1.5">
                <p className="arcade-kicker">
                  Franchise
                </p>
                <span
                  className={cn(
                    clueChipClassName,
                    attempt.comparison.franchiseMatch
                      ? "border-[#1f6672] bg-[#0f2630] text-[#b7f2ff]"
                      : "border-[#324055] bg-[#111927] text-slate-300"
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
  const runStatusLabel = solved
    ? "Target acquired"
    : isGuessing
      ? "Comparing guess"
      : isSearching
        ? "Scanning catalog"
        : "Run active";

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
    <div className="space-y-4 pb-6">
      <header className="arcade-panel rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4.5">
        <div className="arcade-grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="arcade-kicker">Game To Guess</p>
              <h1 className="arcade-display arcade-text-glow mt-1.5 text-3xl font-semibold leading-none sm:text-[2.2rem]">
                Guess the hidden game
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="arcade-status rounded-[0.8rem] px-3 py-2 text-right">
                <p className="arcade-kicker text-[0.62rem]">Attempts</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {history.length}
                </p>
              </div>
              <div className="arcade-status rounded-[0.8rem] px-3 py-2 text-right">
                <p className="arcade-kicker text-[0.62rem]">Status</p>
                <p className="mt-1 text-lg font-semibold uppercase tracking-[0.12em] text-[#59e1ff]">
                  {runStatusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <section className="arcade-panel rounded-[1.45rem] p-4 sm:p-4.5">
          <div className="relative">
            <p className="arcade-kicker">Current Clues</p>
            <h2 className="arcade-display mt-1.5 text-xl font-semibold text-white">
              Clues from your guesses
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {clueEntries.map((entry) => (
                <div
                  key={entry.key}
                  className={cn("min-h-20 rounded-[1rem] border p-3", entry.tone)}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">
                    {entry.title}
                  </p>
                  <p className="mt-2 text-sm leading-5">
                    {entry.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <section className="arcade-panel rounded-[1.45rem] p-4 sm:p-4.5">
            <div className="relative">
              <p className="arcade-kicker">Choose A Guess</p>
              <h2 className="arcade-display mt-1.5 text-xl font-semibold text-white">
                Search for a game
              </h2>
              <div className="mt-3 rounded-[1.1rem] border border-[#23344c] bg-[#0a121d]/95 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <input
                  id="game-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    solved
                      ? "Game already found"
                      : "Type a game title"
                  }
                  disabled={solved || isGuessing}
                  className="w-full rounded-[0.9rem] border border-transparent bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#59e1ff]/30"
                />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                {isSearching ? (
                  <div className="arcade-status rounded-[0.75rem] px-2.5 py-1.5 text-slate-300">
                    Searching games...
                  </div>
                ) : null}
                {isGuessing ? (
                  <div className="arcade-status rounded-[0.75rem] px-2.5 py-1.5 text-slate-300">
                    Checking your guess...
                  </div>
                ) : null}
                {searchError ? (
                  <div className="rounded-[0.75rem] border border-[#6b2a34] bg-[#2c1318] px-2.5 py-1.5 text-[#ffd8dd]">
                    {searchError}
                  </div>
                ) : null}
                {guessError ? (
                  <div className="rounded-[0.75rem] border border-[#6b2a34] bg-[#2c1318] px-2.5 py-1.5 text-[#ffd8dd]">
                    {guessError}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {!solved && results.length > 0 ? (
            <div className="arcade-panel-soft overflow-hidden rounded-[1.2rem]">
              <div className="border-b border-white/8 px-3 py-2">
                <p className="arcade-kicker">Matches</p>
              </div>
              <ul className="divide-y divide-white/8">
                {results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => submitGuess(result.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      {result.coverUrl ? (
                        <Image
                          src={result.coverUrl}
                          alt={result.name}
                          width={36}
                          height={48}
                          className="h-12 w-9 rounded-[0.65rem] border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-9 items-center justify-center rounded-[0.65rem] border border-dashed border-[#324055] bg-[#111927] text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-5 text-white">
                          {result.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {result.releaseYear ?? "Unknown year"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {solved ? (
            <section className="rounded-[1.45rem] border border-[#1f6672] bg-[linear-gradient(180deg,rgba(15,38,48,0.96),rgba(9,17,27,0.96))] p-4 text-[#d8fbff] shadow-[0_20px_50px_rgba(89,225,255,0.1)]">
              <p className="arcade-kicker text-[#8beeff]">Target Acquired</p>
              <h2 className="arcade-display mt-1.5 text-2xl font-semibold text-white">
                Correct guess.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                You guessed the game in {history.length} guess
                {history.length > 1 ? "es" : ""}.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={startRandomGame}
                disabled={isStartingRandom}
                className="mt-4 min-w-48 px-5"
              >
                {isStartingRandom ? "Loading Run" : "Start Random Run"}
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="arcade-kicker">Previous Guesses</p>
            <h2 className="arcade-display mt-1 text-2xl font-semibold text-white">
              Guess history
            </h2>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="arcade-panel-soft rounded-[1.35rem] border border-dashed border-[#324055] p-4 text-center text-sm text-slate-400">
            Your guesses will appear here.
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
