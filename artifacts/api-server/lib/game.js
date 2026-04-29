export const EMPTY_BOARD = () => Array(9).fill(null);

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

export function legalMoves(board) {
  const moves = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) moves.push(i);
  return moves;
}

export function applyMove(board, index, mark) {
  if (index < 0 || index > 8) throw new Error('Move out of range');
  if (board[index] !== null) throw new Error('Cell already taken');
  const next = board.slice();
  next[index] = mark;
  return next;
}

// Minimax for "hard" mode — perfect play.
function minimax(board, mark, aiMark, humanMark) {
  const result = checkWinner(board);
  if (result.winner === aiMark) return { score: 10 };
  if (result.winner === humanMark) return { score: -10 };
  if (result.winner === 'draw') return { score: 0 };

  const moves = legalMoves(board);
  let best = null;
  for (const m of moves) {
    const next = applyMove(board, m, mark);
    const opp = mark === aiMark ? humanMark : aiMark;
    const { score } = minimax(next, opp, aiMark, humanMark);
    const adjusted = score - Math.sign(score) * 0.1; // prefer faster wins / slower losses
    if (best === null) {
      best = { move: m, score: adjusted };
    } else if (mark === aiMark ? adjusted > best.score : adjusted < best.score) {
      best = { move: m, score: adjusted };
    }
  }
  return best || { score: 0 };
}

export function pickMoveByDifficulty(board, aiMark, humanMark, difficulty) {
  const moves = legalMoves(board);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (difficulty === 'medium') {
    // 50% optimal, 50% random — feels imperfect but threatening.
    if (Math.random() < 0.5) return moves[Math.floor(Math.random() * moves.length)];
    return minimax(board, aiMark, aiMark, humanMark).move;
  }
  // hard
  return minimax(board, aiMark, aiMark, humanMark).move;
}
