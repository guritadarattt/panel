// public/js/shell.js
import { api } from './api.js';

async function loadBranding() {
  try {
    const info = await api('/api/public/info');
    return info || { panelName: 'Gurita Panel', logoDataUrl: null };
  } catch {
    return { panelName: 'Gurita Panel', logoDataUrl: null };
  }
}

export async function mountShell({ active }) {
  const [me, branding] = await Promise.all([
    api('/api/auth/me'),
    loadBranding(),
  ]);

  if (!me?.user) { location.href = '/'; return null; }
  const isAdmin = me.user.role === 'admin';

  const brandLogoHtml = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="logo" style="height:22px;vertical-align:middle;margin-right:8px;border-radius:4px;" />`
    : '🐙';

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="brand">${brandLogoHtml}<span>${escapeHtml(branding.panelName)}</span></div>
        <nav>
      <a href="/dashboard" data-active="dashboard">Dashboard</a>
      <a href="/dashboard#servers" data-active="servers">My Servers</a>
      <a href="/account" data-active="account">Account</a>
      ${isAdmin ? '<a href="/admin" data-active="admin">Admin</a>' : ''}
      <a href="#" id="logout">Logout</a>
    </nav>
    <div style="position:absolute; bottom:12px; left:16px; right:16px;" class="muted">
      <small>Signed in as <strong>${escapeHtml(me.user.username)}</strong> (${me.user.role})</small>
    </div>
  `;
  sidebar.querySelector(`[data-active="${active}"]`)?.classList.add('active');
  sidebar.querySelector('#logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/api/auth/logout', { method: 'POST' });
    location.href = '/';
  });

  const main = document.querySelector('.main') || document.createElement('main');
  main.classList.add('main');

  const layout = document.createElement('div');
  layout.className = 'layout';
  layout.appendChild(sidebar);
  layout.appendChild(main);

  document.body.innerHTML = '';
  document.body.appendChild(layout);

  // update document.title
  document.title = `${branding.panelName} — ${active}`;

  return { user: me.user, main, branding };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}