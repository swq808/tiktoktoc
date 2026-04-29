// Shared utilities used across pages.
export async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getMe() {
  try {
    const { user } = await api('/api/auth/me');
    return user;
  } catch { return null; }
}

export async function renderNav(activePath) {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return null;
  const user = await getMe();
  const link = (href, label) =>
    `<a href="${href}" class="${activePath === href ? 'active' : ''}">${label}</a>`;
  nav.innerHTML = `
    <div class="brand">
      <div class="logo">T</div>
      <div>Tic Tac Toe AI</div>
    </div>
    <div class="links">
      ${link('/', 'Home')}
      ${user ? link('/game', 'Play') : ''}
      ${link('/stats', 'Stats')}
      ${link('/checkpoints', 'Checkpoints')}
      ${user
        ? `<span class="who">@${escapeHtml(user.username)}</span>
           <button class="ghost" id="logoutBtn">Log out</button>`
        : link('/login', 'Log in / Sign up')}
    </div>
  `;
  const logoutBtn = nav.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }
  return user;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function showError(container, message) {
  if (!container) return;
  container.innerHTML = `<div class="alert error">${escapeHtml(message)}</div>`;
}

export function clearError(container) {
  if (container) container.innerHTML = '';
}
