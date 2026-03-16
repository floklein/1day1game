type IgdbNamedEntity = {
  name?: string | null;
};

type IgdbCover = {
  image_id?: string | null;
};

type IgdbInvolvedCompany = {
  developer?: boolean | null;
  company?: {
    name?: string | null;
  } | null;
};

type IgdbGameRecord = {
  id: number;
  name?: string | null;
  slug?: string | null;
  category?: number | null;
  total_rating?: number | null;
  total_rating_count?: number | null;
  first_release_date?: number | null;
  cover?: IgdbCover | null;
  genres?: IgdbNamedEntity[] | null;
  themes?: IgdbNamedEntity[] | null;
  platforms?: IgdbNamedEntity[] | null;
  game_modes?: IgdbNamedEntity[] | null;
  player_perspectives?: IgdbNamedEntity[] | null;
  franchises?: IgdbNamedEntity[] | null;
  involved_companies?: IgdbInvolvedCompany[] | null;
};

type AccessTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type PopularPoolCache = {
  games: GameSearchResult[];
  expiresAt: number;
};

export type GameSearchResult = {
  id: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

export type ComparableGame = GameSearchResult & {
  genres: string[];
  themes: string[];
  platforms: string[];
  gameModes: string[];
  playerPerspectives: string[];
  primaryDeveloper: string | null;
  franchise: string | null;
};

export type YearComparisonState =
  | "exact"
  | "target_is_earlier"
  | "target_is_later"
  | "unknown";

export type GuessComparisonResult = {
  isCorrect: boolean;
  guessNumber: number;
  guess: ComparableGame;
  comparison: {
    sharedGenres: string[];
    sharedThemes: string[];
    sharedPlatforms: string[];
    sharedGameModes: string[];
    sharedPlayerPerspectives: string[];
    year: YearComparisonState;
    primaryDeveloperMatch: boolean;
    franchiseMatch: boolean;
  };
};

const IGDB_BASE_URL = "https://api.igdb.com/v4";
const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IMAGE_SIZE = "t_cover_big";
const POPULAR_POOL_TTL_MS = 1000 * 60 * 60;
const TOKEN_BUFFER_MS = 1000 * 60;
const SEARCH_LIMIT = 8;
const POPULAR_POOL_LIMIT = 500;

let accessTokenCache: AccessTokenCache | null = null;
let popularPoolCache: PopularPoolCache | null = null;

function getRequiredEnv(name: "IGDB_CLIENT_ID" | "IGDB_CLIENT_SECRET") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildCoverUrl(imageId?: string | null) {
  if (!imageId) {
    return null;
  }

  return `https://images.igdb.com/igdb/image/upload/${IMAGE_SIZE}/${imageId}.jpg`;
}

function sanitizeNames(items?: IgdbNamedEntity[] | null) {
  return Array.from(
    new Set(
      (items ?? [])
        .map((item) => item.name?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function isLikelyNonGameTitle(name: string) {
  const normalized = name.toLocaleLowerCase();
  const blockedTerms = [
    "dlc",
    "expansion pass",
    "season pass",
    "battle pass",
    "soundtrack",
    "bundle",
    "pack",
    "demo",
    "test server",
  ];

  return blockedTerms.some((term) => normalized.includes(term));
}

function extractPrimaryDeveloper(companies?: IgdbInvolvedCompany[] | null) {
  const developer = (companies ?? []).find(
    (company) => company.developer && company.company?.name
  );

  return developer?.company?.name?.trim() ?? null;
}

function normalizeComparableGame(record: IgdbGameRecord): ComparableGame | null {
  if (!record.id || !record.name?.trim()) {
    return null;
  }

  const releaseYear = record.first_release_date
    ? new Date(record.first_release_date * 1000).getUTCFullYear()
    : null;

  return {
    id: record.id,
    name: record.name.trim(),
    coverUrl: buildCoverUrl(record.cover?.image_id),
    releaseYear,
    genres: sanitizeNames(record.genres),
    themes: sanitizeNames(record.themes),
    platforms: sanitizeNames(record.platforms),
    gameModes: sanitizeNames(record.game_modes),
    playerPerspectives: sanitizeNames(record.player_perspectives),
    primaryDeveloper: extractPrimaryDeveloper(record.involved_companies),
    franchise: sanitizeNames(record.franchises)[0] ?? null,
  };
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

async function getAccessToken() {
  const now = Date.now();

  if (accessTokenCache && accessTokenCache.expiresAt > now + TOKEN_BUFFER_MS) {
    return accessTokenCache.accessToken;
  }

  const clientId = getRequiredEnv("IGDB_CLIENT_ID");
  const clientSecret = getRequiredEnv("IGDB_CLIENT_SECRET");

  const url = new URL(TWITCH_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to authenticate with Twitch: ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  accessTokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };

  return payload.access_token;
}

async function igdbRequest<T>(endpoint: string, query: string) {
  const clientId = getRequiredEnv("IGDB_CLIENT_ID");
  const token = await getAccessToken();

  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: query,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`IGDB request failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as T;
}

function comparableFieldsQuery() {
  return [
    "id",
    "name",
    "first_release_date",
    "cover.image_id",
    "genres.name",
    "themes.name",
    "platforms.name",
    "game_modes.name",
    "player_perspectives.name",
    "franchises.name",
    "involved_companies.developer",
    "involved_companies.company.name",
  ].join(",");
}

function eligibleSearchWhereClause() {
  return "name != null";
}

export async function searchGames(query: string) {
  const sanitizedQuery = query.replace(/"/g, '\\"').trim();

  if (!sanitizedQuery) {
    return [];
  }

  const poolGames = await getPopularPoolGames();
  const normalizedQuery = sanitizedQuery.toLocaleLowerCase();

  return poolGames
    .filter((game) => game.name.toLocaleLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftStartsWith = left.name.toLocaleLowerCase().startsWith(normalizedQuery);
      const rightStartsWith = right.name.toLocaleLowerCase().startsWith(normalizedQuery);

      if (leftStartsWith !== rightStartsWith) {
        return leftStartsWith ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, SEARCH_LIMIT);
}

export async function ensureGameExists(id: number) {
  const game = await getGameForComparison(id);
  return Boolean(game);
}

export async function getGameForComparison(id: number) {
  const records = await igdbRequest<IgdbGameRecord[]>(
    "games",
    `
      fields ${comparableFieldsQuery()};
      where id = ${id} & ${eligibleSearchWhereClause()};
      limit 1;
    `
  );

  const record = records[0];

  if (!record) {
    return null;
  }

  return normalizeComparableGame(record);
}

async function getPopularPoolGames() {
  const now = Date.now();

  if (popularPoolCache && popularPoolCache.expiresAt > now) {
    return popularPoolCache.games;
  }

  const records = await igdbRequest<IgdbGameRecord[]>(
    "games",
    `
      fields id,name,category,first_release_date,cover.image_id,total_rating,total_rating_count;
      where total_rating_count != null
        & name != null;
      sort total_rating_count desc;
      limit ${POPULAR_POOL_LIMIT};
    `
  );

  const games = records
    .filter(
      (record) =>
        Boolean(record.name?.trim()) &&
        !isLikelyNonGameTitle(record.name ?? "")
    )
    .map((record) => normalizeComparableGame(record))
    .filter((record): record is ComparableGame => Boolean(record))
    .map((record) => ({
      id: record.id,
      name: record.name,
      coverUrl: record.coverUrl,
      releaseYear: record.releaseYear,
    }));

  if (games.length === 0) {
    throw new Error("Popular IGDB pool is empty.");
  }

  popularPoolCache = {
    games,
    expiresAt: now + POPULAR_POOL_TTL_MS,
  };

  return games;
}

export async function getRandomPopularGameId() {
  const games = await getPopularPoolGames();
  const randomIndex = Math.floor(Math.random() * games.length);
  return games[randomIndex].id;
}

export async function compareGuess(targetId: number, guessId: number) {
  const [targetGame, guessedGame] = await Promise.all([
    getGameForComparison(targetId),
    getGameForComparison(guessId),
  ]);

  if (!targetGame || !guessedGame) {
    return null;
  }

  let year: YearComparisonState = "unknown";

  if (
    targetGame.releaseYear !== null &&
    guessedGame.releaseYear !== null
  ) {
    if (targetGame.releaseYear === guessedGame.releaseYear) {
      year = "exact";
    } else if (targetGame.releaseYear < guessedGame.releaseYear) {
      year = "target_is_earlier";
    } else {
      year = "target_is_later";
    }
  }

  return {
    isCorrect: targetGame.id === guessedGame.id,
    guessNumber: 0,
    guess: guessedGame,
    comparison: {
      sharedGenres: intersection(guessedGame.genres, targetGame.genres),
      sharedThemes: intersection(guessedGame.themes, targetGame.themes),
      sharedPlatforms: intersection(guessedGame.platforms, targetGame.platforms),
      sharedGameModes: intersection(guessedGame.gameModes, targetGame.gameModes),
      sharedPlayerPerspectives: intersection(
        guessedGame.playerPerspectives,
        targetGame.playerPerspectives
      ),
      year,
      primaryDeveloperMatch:
        Boolean(guessedGame.primaryDeveloper) &&
        guessedGame.primaryDeveloper === targetGame.primaryDeveloper,
      franchiseMatch:
        Boolean(guessedGame.franchise) &&
        guessedGame.franchise === targetGame.franchise,
    },
  } satisfies GuessComparisonResult;
}
