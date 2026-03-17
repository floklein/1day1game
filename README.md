# 1 Day 1 Game

Guess a hidden video game from cumulative clues.

Each run picks a target game from IGDB. Every guess is compared with that target, and matching fields stay visible so you can narrow down the answer using genres, themes, platforms, release year, developer, and franchise.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- IGDB API via Twitch OAuth

## How It Works

1. Start a random run from the home page.
2. Search for a game title.
3. Submit a guess by clicking a result or pressing Enter.
4. Read the cumulative clues.
5. Keep guessing until you find the exact game.

## Environment Variables

Create a `.env` file with:

```bash
IGDB_CLIENT_ID=your_igdb_client_id
IGDB_CLIENT_SECRET=your_igdb_client_secret
```

The app authenticates against Twitch to query IGDB.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Search is restricted to a curated pool of popular games.
- Covers are loaded from `images.igdb.com`.
- The app filters out likely non-game entries such as DLC packs, bundles, demos, and soundtracks.
