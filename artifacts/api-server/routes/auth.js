import express from 'express';
import { getUsers, saveUsers } from '../lib/store.js';

const router = express.Router();

function publicUser(u) {
  return { username: u.username, createdAt: u.createdAt };
}

router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const trimmed = String(username).trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters.' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, _ and -.' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken.' });
  }
  const newUser = {
    username: trimmed,
    // NOTE: plaintext for class learning purposes only — never do this in production.
    password: String(password),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  req.session.username = newUser.username;
  res.json({ user: publicUser(newUser) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!user || user.password !== String(password)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.username = user.username;
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ttt.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.username) return res.json({ user: null });
  const user = getUsers().find((u) => u.username === req.session.username);
  res.json({ user: user ? publicUser(user) : null });
});

export default router;
