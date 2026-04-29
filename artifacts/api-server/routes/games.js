import express from 'express';
import { appendGame, getGames } from '../lib/store.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

router.post('/', requireAuth, (req, res) => {
  const { mode, result, board, moves, opponent, difficulty, personality, playerMark } = req.body || {};
  if (!['pvp', 'pvai'].includes(mode)) return res.status(400).json({ error: 'Invalid mode.' });
  if (!['win', 'loss', 'draw'].includes(result)) return res.status(400).json({ error: 'Invalid result.' });
  if (!Array.isArray(board) || board.length !== 9) return res.status(400).json({ error: 'Invalid board.' });

  const game = {
    id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: req.session.username,
    mode,
    result, // win/loss/draw — from the logged-in player's perspective
    board,
    moves: Array.isArray(moves) ? moves : [],
    opponent: opponent || null, // 'human' or 'ai'
    difficulty: difficulty || null,
    personality: personality || null,
    playerMark: playerMark || 'X',
    playedAt: new Date().toISOString(),
  };
  appendGame(game);
  res.json({ game });
});

router.get('/mine', requireAuth, (req, res) => {
  const games = getGames().filter((g) => g.username === req.session.username);
  games.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  res.json({ games: games.slice(0, 50) });
});

export default router;
