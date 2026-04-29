# Workspace

## Overview

pnpm workspace monorepo. The main artifact is the **Tic Tac Toe AI** app — a vanilla HTML/CSS/JS frontend served by an Express server with JSON-file storage and Groq-powered AI commentary.

## Artifacts

### Tic Tac Toe AI (`artifacts/api-server`)

A full-stack web app where users can sign up, play same-screen PvP, or face an AI opponent across three difficulties (easy / medium / hard) and three personalities (trash-talker / cheerleader / zen master). Saves games to JSON, shows a leaderboard and AI performance stats, plus a public Checkpoints page.

- **Stack**: Node.js + Express (vanilla JS, no TypeScript), `express-session`, `dotenv`, `groq-sdk`, vanilla HTML/CSS/JS frontend.
- **Storage**: JSON files in `artifacts/api-server/data/` (`users.json`, `games.json`).
- **AI strategy**: The server computes legal moves locally with minimax (hard mode is unbeatable). Groq is asked only for the in-character one-liner, with a per-personality fallback if the API key is missing or fails.
- **Pages**: `/` landing, `/login`, `/game`, `/stats`, `/checkpoints`.
- **Required secret**: `GROQ_API_KEY` (optional — app falls back to canned comments without it).
- **Optional env**: `SESSION_SECRET` (set in production).
- **Entry point**: `artifacts/api-server/server.js`.

### Canvas (`artifacts/mockup-sandbox`)

Auto-created design canvas for UI mockups. Not used by the Tic Tac Toe app.

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — start the Tic Tac Toe server (also runs in the workflow)
- `restart_workflow "artifacts/api-server: Tic Tac Toe Server"` — restart after code changes

## Notes

- The artifact is `kind = "api"` with `paths = ["/"]` so the Node server handles both API routes and static `/public` files.
- Passwords are stored in plaintext in `data/users.json` per the project brief (class learning context only — never do this in production).
