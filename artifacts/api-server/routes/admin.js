import express from 'express';
import { getUsers, saveUsers, getGames, getAnnouncements, saveAnnouncements } from '../lib/store.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in.' });
  const user = getUsers().find((u) => u.username === req.session.username);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

router.use(requireAdmin);

router.get('/stats', (req, res) => {
  const users = getUsers();
  const games = getGames();
  const today = new Date().toISOString().slice(0, 10);
  const gamesToday = games.filter((g) => g.playedAt && g.playedAt.startsWith(today)).length;
  res.json({
    totalUsers: users.length,
    totalGames: games.length,
    gamesToday,
  });
});

router.get('/users', (req, res) => {
  const users = getUsers();
  const games = getGames();
  const result = users.map((u) => {
    const { password, ...rest } = u;
    const userGames = games.filter((g) => g.username === u.username);
    return {
      ...rest,
      gameCount: userGames.length,
      wins: userGames.filter((g) => g.result === 'win').length,
    };
  });
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ users: result });
});

router.get('/announcements', (req, res) => {
  res.json({ announcements: getAnnouncements() });
});

router.post('/announcements', (req, res) => {
  const { title, body, status } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Body is required.' });

  const announcements = getAnnouncements();
  const newAnn = {
    id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(title).trim(),
    body: String(body).trim(),
    status: status === 'inactive' ? 'inactive' : 'active',
    createdAt: new Date().toISOString(),
    createdBy: req.session.username,
  };
  announcements.push(newAnn);
  saveAnnouncements(announcements);
  res.json({ announcement: newAnn });
});

router.put('/announcements/:id', (req, res) => {
  const { id } = req.params;
  const { title, body, status } = req.body || {};
  const announcements = getAnnouncements();
  const idx = announcements.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Announcement not found.' });

  if (title !== undefined) announcements[idx].title = String(title).trim();
  if (body !== undefined) announcements[idx].body = String(body).trim();
  if (status !== undefined) announcements[idx].status = status === 'active' ? 'active' : 'inactive';
  announcements[idx].updatedAt = new Date().toISOString();

  saveAnnouncements(announcements);
  res.json({ announcement: announcements[idx] });
});

router.delete('/announcements/:id', (req, res) => {
  const { id } = req.params;
  const announcements = getAnnouncements();
  const idx = announcements.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Announcement not found.' });
  announcements.splice(idx, 1);
  saveAnnouncements(announcements);
  res.json({ ok: true });
});

router.put('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'Role must be "admin" or "user".' });
  }
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });

  const adminUser = users.find((u) => u.username === req.session.username);
  if (users[idx].id === adminUser.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  }

  users[idx].role = role;
  users[idx].roleUpdatedAt = new Date().toISOString();
  users[idx].roleUpdatedBy = req.session.username;
  saveUsers(users);

  const { password, ...rest } = users[idx];
  res.json({ user: rest });
});

export default router;
