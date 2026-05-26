import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');

export function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  if (!fs.existsSync(GAMES_FILE)) fs.writeFileSync(GAMES_FILE, '[]', 'utf8');
  if (!fs.existsSync(ANNOUNCEMENTS_FILE)) fs.writeFileSync(ANNOUNCEMENTS_FILE, '[]', 'utf8');
}

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error(`[store] failed to read ${file}:`, err.message);
    return [];
  }
}

function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function getUsers() {
  return readJson(USERS_FILE);
}

export function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

export function getGames() {
  return readJson(GAMES_FILE);
}

export function saveGames(games) {
  writeJson(GAMES_FILE, games);
}

export function appendGame(game) {
  const games = getGames();
  games.push(game);
  saveGames(games);
  return game;
}

export function updateGameNote(gameId, note) {
  const games = getGames();
  const idx = games.findIndex(g => g.id === gameId);
  if (idx === -1) return null;
  games[idx].note = note;
  saveGames(games);
  return games[idx];
}

export function getAnnouncements() {
  return readJson(ANNOUNCEMENTS_FILE);
}

export function saveAnnouncements(announcements) {
  writeJson(ANNOUNCEMENTS_FILE, announcements);
}
