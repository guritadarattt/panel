// public/js/login.js
import { api, toast } from '/js/api.js';

// Load branding
(async () => {
  try {
    const info = await api('/api/public/info');
    if (info?.panelName) {
      document.title = `Login — ${info.panelName}`;
      const el = document.getElementById('brandName');
      if (el) el.textContent = info.panelName;
    }
    if (info?.logoDataUrl) {
      const el = document.getElementById('brandLogo');
      if (el) el.innerHTML = `<img src="${info.logoDataUrl}" style="max-width:100%; max-height:100%;" />`;
    }
  } catch { /* ignore */ }
})();

const form = document.getElementById('loginForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    toast('Username & password wajib diisi', 'error');
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await api('/api/auth/login', { method: 'POST', body: { username, password } });
    location.href = '/dashboard';
  } catch (err) {
    toast(err.message || 'Login gagal', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

// Sudah login? redirect
(async () => {
  try {
    const me = await api('/api/auth/me');
    if (me?.user) location.href = '/dashboard';
  } catch { /* ignore */ }
})();