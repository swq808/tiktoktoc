import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import aiRoutes from './routes/ai.js';
import statsRoutes from './routes/stats.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import announcementsRoutes from './routes/announcements.js';
import { ensureDataFiles } from './lib/store.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

ensureDataFiles();

app.use(express.json({ limit: '256kb' }));
app.use(
  session({
    name: 'ttt.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get('/api/healthz', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementsRoutes);

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tic Tac Toe AI listening on port ${PORT}`);
});
