import { renderNav, api, escapeHtml } from '/main.js';

const user = await renderNav('/game');
if (!user) {
  window.location.href = '/login';
}

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

const state = {
  mode: 'pvai',          // 'pvai' | 'pvp'
  difficulty: 'medium',
  personality: 'trash_talker',
  playerMark: 'X',       // human in PvAI; first player in PvP
  board: Array(9).fill(null),
  current: 'X',
  moves: [],             // [{ index, mark }]
  winner: null,          // 'X' | 'O' | 'draw' | null
  winLine: null,
  busy: false,
  saved: false,
};

const els = {
  board: document.getElementById('board'),
  modeTabs: document.querySelectorAll('#modeTabs button'),
  markTabs: document.querySelectorAll('#markTabs button'),
  difficulty: document.getElementById('difficulty'),
  personality: document.getElementById('personality'),
  aiOptions: document.getElementById('aiOptions'),
  newGame: document.getElementById('newGameBtn'),
  turnLabel: document.getElementById('turnLabel'),
  scoreLabel: document.getElementById('scoreLabel'),
  gameOver: document.getElementById('gameOver'),
  aiBubbleWrap: document.getElementById('aiBubbleWrap'),
  aiBubble: document.getElementById('aiBubble'),
  aiBubbleText: document.getElementById('aiBubbleText'),
  aiBubbleLabel: document.getElementById('aiBubbleLabel'),
  recent: document.getElementById('recentGames'),
  aiStatusNote: document.getElementById('aiStatusNote'),
};

// ---- Setup controls ----
els.modeTabs.forEach(b => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  els.modeTabs.forEach(x => x.classList.toggle('active', x === b));
  els.aiOptions.style.display = state.mode === 'pvai' ? '' : 'none';
}));
els.markTabs.forEach(b => b.addEventListener('click', () => {
  state.playerMark = b.dataset.mark;
  els.markTabs.forEach(x => x.classList.toggle('active', x === b));
}));
els.difficulty.addEventListener('change', () => { state.difficulty = els.difficulty.value; });
els.personality.addEventListener('change', () => { state.personality = els.personality.value; });
els.newGame.addEventListener('click', startNewGame);

// Load AI config (personality list, key status)
try {
  const cfg = await api('/api/ai/config');
  els.personality.innerHTML = cfg.personalities
    .map(p => `<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('');
  state.personality = cfg.personalities[0]?.id || 'trash_talker';
  if (!cfg.groqEnabled) {
    els.aiStatusNote.innerHTML = 'Note: GROQ_API_KEY isn\'t set, so the AI uses canned comments. Moves still work normally.';
  } else {
    els.aiStatusNote.textContent = 'Groq is connected. The AI will pick a move and respond in character.';
  }
} catch (e) {
  els.aiStatusNote.textContent = `Could not load AI config: ${e.message}`;
}

// ---- Board rendering ----
function render() {
  els.board.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Cell ${i + 1}`);
    const v = state.board[i];
    if (v) {
      cell.textContent = v;
      cell.classList.add('filled', v === 'X' ? 'x' : 'o');
    }
    if (state.winLine?.includes(i)) cell.classList.add('win');
    if (state.winner || state.busy || v) cell.classList.add('disabled');
    cell.addEventListener('click', () => onCellClick(i));
    els.board.appendChild(cell);
  }
  if (state.winner) {
    els.turnLabel.textContent = state.winner === 'draw' ? 'Draw' : `${state.winner} wins!`;
  } else {
    if (state.mode === 'pvai') {
      const youMove = state.current === state.playerMark;
      els.turnLabel.textContent = youMove ? 'Your move' : 'AI thinking…';
    } else {
      els.turnLabel.textContent = `${state.current} to move`;
    }
  }
}

function checkWinner(board) {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(v => v !== null)) return { winner: 'draw', line: null };
  return { winner: null, line: null };
}

async function onCellClick(i) {
  if (state.busy || state.winner) return;
  if (state.board[i] !== null) return;
  if (state.mode === 'pvai' && state.current !== state.playerMark) return;

  applyMoveLocal(i, state.current);
  if (afterMoveCheck()) return;

  if (state.mode === 'pvai') {
    await playAiTurn(i);
  }
}

function applyMoveLocal(i, mark) {
  state.board[i] = mark;
  state.moves.push({ index: i, mark });
  state.current = mark === 'X' ? 'O' : 'X';
  render();
}

function afterMoveCheck() {
  const res = checkWinner(state.board);
  if (res.winner) {
    state.winner = res.winner;
    state.winLine = res.line;
    onGameOver();
    return true;
  }
  return false;
}

async function playAiTurn(lastHumanMove) {
  state.busy = true;
  showAiBubble({ thinking: true, text: 'Thinking…' });
  render();
  const aiMark = state.playerMark === 'X' ? 'O' : 'X';
  try {
    const res = await api('/api/ai/move', {
      method: 'POST',
      body: {
        board: state.board,
        aiMark,
        humanMark: state.playerMark,
        difficulty: state.difficulty,
        personality: state.personality,
        lastHumanMove,
      },
    });
    if (typeof res?.move !== 'number') throw new Error('AI returned no move.');
    applyMoveLocal(res.move, aiMark);
    showAiBubble({ thinking: false, text: res.comment || '' });
    afterMoveCheck();
  } catch (e) {
    showAiBubble({ thinking: false, text: `AI hiccup: ${e.message}` });
  } finally {
    state.busy = false;
    render();
  }
}

let ttsEnabled = true;

const ttsToggle = document.getElementById('ttsToggle');
ttsToggle.addEventListener('click', () => {
  ttsEnabled = !ttsEnabled;
  ttsToggle.textContent = ttsEnabled ? '🔊' : '🔇';
  ttsToggle.title = ttsEnabled ? 'Mute voice' : 'Unmute voice';
  if (!ttsEnabled) window.speechSynthesis.cancel();
});

function speakText(text) {
  if (!ttsEnabled || !text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = personalityPitch(state.personality);
  window.speechSynthesis.speak(utter);
}

function personalityPitch(id) {
  if (id === 'trash_talker') return 1.3;
  if (id === 'cheerleader') return 1.5;
  if (id === 'zen_master') return 0.7;
  return 1.0;
}

function showAiBubble({ thinking, text }) {
  els.aiBubbleWrap.style.display = state.mode === 'pvai' ? '' : 'none';
  els.aiBubble.classList.toggle('thinking', !!thinking);
  els.aiBubbleLabel.textContent = personalityLabel(state.personality);
  els.aiBubbleText.textContent = text;
  if (!thinking && text) speakText(text);
}

function personalityLabel(id) {
  const opt = els.personality.querySelector(`option[value="${id}"]`);
  return opt ? opt.textContent : 'AI';
}

async function onGameOver() {
  // Determine result from logged-in player's POV.
  let result;
  if (state.winner === 'draw') result = 'draw';
  else if (state.mode === 'pvai') {
    result = state.winner === state.playerMark ? 'win' : 'loss';
  } else {
    // PvP: count X player as the logged-in player by convention.
    result = state.winner === state.playerMark ? 'win' : 'loss';
  }

  const banner = state.winner === 'draw'
    ? 'Draw — well played.'
    : (state.mode === 'pvai'
        ? (result === 'win' ? `You beat the AI as ${state.playerMark}!` : `AI takes it. Try again?`)
        : `${state.winner} wins!`);
  els.gameOver.style.display = '';
  els.gameOver.textContent = banner;

  // Save once.
  if (!state.saved) {
    state.saved = true;
    try {
      await api('/api/games', {
        method: 'POST',
        body: {
          mode: state.mode,
          result,
          board: state.board.slice(),
          moves: state.moves.slice(),
          opponent: state.mode === 'pvai' ? 'ai' : 'human',
          difficulty: state.mode === 'pvai' ? state.difficulty : null,
          personality: state.mode === 'pvai' ? state.personality : null,
          playerMark: state.playerMark,
        },
      });
      loadRecent();
    } catch (e) {
      console.warn('save failed', e.message);
    }
  }
  render();
}

async function loadRecent() {
  try {
    const { games } = await api('/api/games/mine');
    if (!games.length) {
      els.recent.innerHTML = 'No games yet — your finished games show up here.';
      return;
    }
    els.recent.innerHTML = games.slice(0, 5).map(g => {
      const badge = `<span class="badge ${g.result}">${g.result}</span>`;
      const meta = g.mode === 'pvai'
        ? `vs AI · ${g.difficulty} · ${g.personality?.replaceAll('_',' ') || ''}`
        : 'vs friend';
      const when = new Date(g.playedAt).toLocaleString();
      return `<div style="padding:8px 0; border-bottom:1px solid var(--border);">
        ${badge} <span style="color:var(--text);">${escapeHtml(meta)}</span>
        <div class="muted" style="font-size:12px;">${escapeHtml(when)}</div>
      </div>`;
    }).join('');
  } catch (e) {
    els.recent.textContent = `Could not load history: ${e.message}`;
  }
}

function startNewGame() {
  state.board = Array(9).fill(null);
  state.current = 'X';
  state.moves = [];
  state.winner = null;
  state.winLine = null;
  state.saved = false;
  state.busy = false;
  els.gameOver.style.display = 'none';
  els.aiBubbleWrap.style.display = 'none';
  render();
  // If AI moves first, kick it off.
  if (state.mode === 'pvai' && state.playerMark === 'O') {
    playAiTurn(null);
  }
}

// Initial render
render();
loadRecent();
