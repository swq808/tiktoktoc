import express from 'express';
import { getGames } from '../lib/store.js';

const router = express.Router();

router.get('/leaderboard', (_req, res) => {
  const games = getGames();
  const byUser = new Map();
  for (const g of games) {
    if (!byUser.has(g.username)) {
      byUser.set(g.username, { username: g.username, wins: 0, losses: 0, draws: 0, total: 0 });
    }
    const row = byUser.get(g.username);
    row.total += 1;
    if (g.result === 'win') row.wins += 1;
    else if (g.result === 'loss') row.losses += 1;
    else if (g.result === 'draw') row.draws += 1;
  }
  const rows = Array.from(byUser.values()).map((r) => ({
    ...r,
    points: r.wins * 3 + r.draws,
    winRate: r.total > 0 ? r.wins / r.total : 0,
  }));
  rows.sort((a, b) => b.points - a.points || b.winRate - a.winRate || b.total - a.total);
  res.json({ leaderboard: rows });
});

router.get('/ai', (_req, res) => {
  const games = getGames().filter((g) => g.mode === 'pvai');
  const byDifficulty = {};
  const byPersonality = {};
  for (const g of games) {
    const d = g.difficulty || 'unknown';
    if (!byDifficulty[d]) byDifficulty[d] = { difficulty: d, aiWins: 0, aiLosses: 0, draws: 0, total: 0 };
    byDifficulty[d].total += 1;
    if (g.result === 'loss') byDifficulty[d].aiWins += 1;
    else if (g.result === 'win') byDifficulty[d].aiLosses += 1;
    else if (g.result === 'draw') byDifficulty[d].draws += 1;

    const p = g.personality || 'unknown';
    if (!byPersonality[p]) byPersonality[p] = { personality: p, aiWins: 0, aiLosses: 0, draws: 0, total: 0 };
    byPersonality[p].total += 1;
    if (g.result === 'loss') byPersonality[p].aiWins += 1;
    else if (g.result === 'win') byPersonality[p].aiLosses += 1;
    else if (g.result === 'draw') byPersonality[p].draws += 1;
  }
  const finalize = (row) => ({
    ...row,
    aiWinRate: row.total > 0 ? row.aiWins / row.total : 0,
  });
  res.json({
    totalAiGames: games.length,
    byDifficulty: Object.values(byDifficulty).map(finalize),
    byPersonality: Object.values(byPersonality).map(finalize),
  });
});

export default router;
