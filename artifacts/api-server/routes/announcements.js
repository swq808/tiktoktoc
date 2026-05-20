import express from 'express';
import { getAnnouncements } from '../lib/store.js';

const router = express.Router();

router.get('/', (req, res) => {
  const all = getAnnouncements();
  const active = all.filter((a) => a.status === 'active');
  active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ announcements: active });
});

export default router;
