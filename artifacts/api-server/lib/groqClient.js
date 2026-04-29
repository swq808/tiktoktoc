import Groq from 'groq-sdk';
import { pickMoveByDifficulty, legalMoves } from './game.js';

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.GROQ_API_KEY) return null;
  _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

export const PERSONALITIES = {
  trash_talker: {
    label: 'Trash Talker',
    description:
      "You're a cocky Tic Tac Toe AI. Roast the human's move briefly. Keep it playful, never mean. 1-2 short sentences.",
  },
  cheerleader: {
    label: 'Cheerleader',
    description:
      "You're a peppy, encouraging Tic Tac Toe coach. Hype the human up about their move regardless of how good it was. 1-2 short sentences.",
  },
  zen_master: {
    label: 'Zen Master',
    description:
      "You're a calm zen Tic Tac Toe sage. Speak in short philosophical observations about the move just played. 1-2 short sentences.",
  },
};

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

function fallbackComment(personality, lastHumanMove) {
  const cell = lastHumanMove == null ? null : lastHumanMove + 1;
  const where = cell ? `cell ${cell}` : 'an opening move';
  if (personality === 'trash_talker') return `Cute play at ${where}. Watch this.`;
  if (personality === 'cheerleader') return `Nice move at ${where}! You've got this!`;
  return `You played ${where}. The board reveals what it must.`;
}

function boardToString(board) {
  const cells = board.map((c) => (c === null ? '.' : c));
  return `${cells[0]} ${cells[1]} ${cells[2]}\n${cells[3]} ${cells[4]} ${cells[5]}\n${cells[6]} ${cells[7]} ${cells[8]}`;
}

function tryParseJson(text) {
  if (!text) return null;
  // Strip markdown fences just in case
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find a JSON object substring
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Ask Groq for a move + comment. Strategy:
 *   - Compute the deterministic move locally based on difficulty (this guarantees legality
 *     and skill level — Groq alone is unreliable at Tic Tac Toe).
 *   - Ask Groq for an in-character comment about the human's last move.
 *   - If the API or parsing fails, fall back to a canned line so the game never breaks.
 */
export async function getAiMove({ board, aiMark, humanMark, difficulty, personality, lastHumanMove }) {
  const moves = legalMoves(board);
  if (moves.length === 0) return null;

  const move = pickMoveByDifficulty(board, aiMark, humanMark, difficulty);
  const personalityCfg = PERSONALITIES[personality] || PERSONALITIES.trash_talker;

  const client = getClient();
  if (!client) {
    return { move, comment: fallbackComment(personality, lastHumanMove), source: 'fallback-no-key' };
  }

  const prompt = `${personalityCfg.description}

Tic Tac Toe state (cells 0-8, '.' = empty):
${boardToString(board)}

You are '${aiMark}'. The human just played '${humanMark}' at cell ${lastHumanMove ?? 'N/A'}.
You are about to play cell ${move}.
Return ONLY valid JSON in the exact shape:
{"comment": "<your in-character one-liner about the human's last move>"}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 80,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: personalityCfg.description },
        { role: 'user', content: prompt },
      ],
    });
    const text = completion.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);
    const comment = (parsed && typeof parsed.comment === 'string' && parsed.comment.trim())
      || fallbackComment(personality, lastHumanMove);
    return { move, comment: comment.slice(0, 200), source: 'groq' };
  } catch (err) {
    console.error('[groq] error:', err.message);
    return { move, comment: fallbackComment(personality, lastHumanMove), source: 'fallback-error' };
  }
}

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}
