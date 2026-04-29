# Tic Tac Toe AI

A small web app where you can sign up, play Tic Tac Toe against another human on the same screen, or face an AI opponent that picks moves with three difficulty levels and talks back in three personalities — powered by the Groq API.

## Stack

- Node.js + Express (vanilla, no TypeScript)
- Vanilla HTML / CSS / JS for the frontend
- JSON files in `data/` for storage
- `groq-sdk` for AI commentary
- `express-session` for login sessions

## Project layout

```
artifacts/api-server/
├── server.js              # Express entry point
├── package.json
├── .env.example
├── routes/
│   ├── auth.js            # /api/auth/{register,login,logout,me}
│   ├── games.js           # /api/games (POST, GET /mine)
│   ├── ai.js              # /api/ai/{move,config}
│   └── stats.js           # /api/stats/{leaderboard,ai}
├── lib/
│   ├── store.js           # JSON read/write helpers (atomic via tmp+rename)
│   ├── game.js            # board logic, win detection, minimax
│   └── groqClient.js      # Groq SDK wrapper + fallback comments
├── data/
│   ├── users.json         # plaintext for class learning purposes
│   └── games.json
└── public/
    ├── index.html         # landing page
    ├── login.html         # log in / sign up
    ├── game.html          # play vs human or AI
    ├── stats.html         # leaderboard + AI performance
    ├── checkpoints.html   # build checkpoints (public, no login)
    ├── checkpoints.json   # editable checkpoint reflections
    ├── styles.css
    ├── main.js            # shared client helpers
    └── game.js            # game-page client logic
```

## Run it

1. Copy `.env.example` to `.env` and add your `GROQ_API_KEY`. The app still runs without a key — it will use canned comments and the AI will still play legal moves.
2. From the repo root: `pnpm --filter @workspace/api-server install` (already done if you used the workspace bootstrap).
3. Start the server: `pnpm --filter @workspace/api-server run dev`. The app listens on `$PORT` (default `8080`) and is served at `/` through the Replit proxy.

## How the AI works

- The server computes the AI's move locally based on the chosen difficulty:
  - **easy**: random legal move
  - **medium**: 50/50 random vs. minimax
  - **hard**: full minimax (perfect play — unbeatable)
- Groq is asked **only** for an in-character one-liner reacting to the human's last move. This keeps moves legal even if the model returns junk.
- If `GROQ_API_KEY` is missing or the API errors out, a per-personality fallback line is used.

## Security notes

- Passwords are stored in plaintext for class learning purposes only. Production apps must hash with bcrypt/argon2.
- `data/users.json`, `data/games.json`, and `.env` are gitignored.

## Definition of done

- Sign up, log in, log out
- Play same-screen PvP and finish a full game
- Play vs AI across all three difficulties and personalities
- View leaderboard and AI performance
- Public checkpoints page describing the build
