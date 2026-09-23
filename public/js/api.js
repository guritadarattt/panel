// public/js/api.js
export function getCsrf() {
  const m = document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { ...headers } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (method !== 'GET' && method !== 'HEAD') {
    opts.headers['x-csrf-token'] = getCsrf();
  }
  const res = await fetch(path, opts);
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

export function toast(msg, kind = 'info', timeout = 3000) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.style.borderColor = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--border)';
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), timeout);
}