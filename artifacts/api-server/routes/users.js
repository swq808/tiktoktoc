import express from 'express';
import { getUsers, saveUsers, getGames } from '../lib/store.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

router.get('/profile', requireAuth, (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.username === req.session.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const games = getGames().filter((g) => g.username === req.session.username);
  const wins = games.filter((g) => g.result === 'win').length;
  const losses = games.filter((g) => g.result === 'loss').length;
  const draws = games.filter((g) => g.result === 'draw').length;

  res.json({
    user: publicUser(user),
    stats: { total: games.length, wins, losses, draws },
  });
});

router.put('/profile', requireAuth, (req, res) => {
  const allowed = ['displayName', 'bio', 'favPersonality', 'favDifficulty', 'country', 'gamesGoal', 'avatarColor', 'preferredMark', 'website'];
  const updates = req.body || {};

  if (updates.displayName !== undefined) {
    const dn = String(updates.displayName).trim();
    if (dn.length > 40) return res.status(400).json({ error: 'Display name must be 40 characters or fewer.' });
  }
  if (updates.bio !== undefined && String(updates.bio).length > 200) {
    return res.status(400).json({ error: 'Bio must be 200 characters or fewer.' });
  }
  if (updates.gamesGoal !== undefined) {
    const g = Number(updates.gamesGoal);
    if (!Number.isInteger(g) || g < 1 || g > 9999) {
      return res.status(400).json({ error: 'Games goal must be a whole number between 1 and 9999.' });
    }
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.username === req.session.username);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });

  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      users[idx][key] = key === 'gamesGoal' ? Number(updates[key]) : String(updates[key]).trim();
    }
  });

  saveUsers(users);
  res.json({ user: publicUser(users[idx]) });
});

export default router;
