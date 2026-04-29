import express from 'express';
import { checkWinner, legalMoves } from '../lib/game.js';
import { getAiMove, DIFFICULTIES, PERSONALITIES, hasGroqKey } from '../lib/groqClient.js';

const router = express.Router();

router.get('/config', (_req, res) => {
  res.json({
    difficulties: DIFFICULTIES,
    personalities: Object.entries(PERSONALITIES).map(([id, cfg]) => ({ id, label: cfg.label })),
    groqEnabled: hasGroqKey(),
  });
});

router.post('/move', async (req, res, next) => {
  try {
    const { board, aiMark, humanMark, difficulty, personality, lastHumanMove } = req.body || {};
    if (!Array.isArray(board) || board.length !== 9) return res.status(400).json({ error: 'Invalid board.' });
    if (!['X', 'O'].includes(aiMark) || !['X', 'O'].includes(humanMark) || aiMark === humanMark) {
      return res.status(400).json({ error: 'Invalid marks.' });
    }
    if (!DIFFICULTIES.includes(difficulty)) return res.status(400).json({ error: 'Invalid difficulty.' });
    if (!PERSONALITIES[personality]) return res.status(400).json({ error: 'Invalid personality.' });

    const winState = checkWinner(board);
    if (winState.winner) return res.status(400).json({ error: 'Game already over.' });
    if (legalMoves(board).length === 0) return res.status(400).json({ error: 'No legal moves.' });

    const result = await getAiMove({
      board, aiMark, humanMark, difficulty, personality,
      lastHumanMove: typeof lastHumanMove === 'number' ? lastHumanMove : null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
