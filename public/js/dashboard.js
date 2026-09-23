// public/js/dashboard.js
import { mountShell } from '/js/shell.js';
import { api, toast } from '/js/api.js';

const { user, main } = await mountShell({ active: 'dashboard' });
const stats = main.querySelector('#stats');
const table = main.querySelector('#serversTable');

function badgeClass(status) {
  if (status === 'running') return 'green';
  if (status === 'crashed') return 'red';
  if (status === 'starting') return 'yellow';
  if (status === 'suspended') return 'red';
  return 'gray';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const isAdmin = user.role === 'admin';

async function refresh() {
  const { servers } = await api('/api/servers');
  const statsResp = isAdmin ? await api('/api/host/stats').catch(() => null) : null;

  stats.innerHTML = `
    <div class="card"><div class="stat-label">Servers</div><div class="stat">${servers.length}</div></div>
    <div class="card"><div class="stat-label">Running</div><div class="stat">${servers.filter(s => s.status === 'running').length}</div></div>
    <div class="card"><div class="stat-label">Stopped</div><div class="stat">${servers.filter(s => s.status !== 'running' && s.status !== 'suspended').length}</div></div>
    <div class="card"><div class="stat-label">Host CPU</div><div class="stat">${statsResp ? statsResp.stats.cpu.usagePercent + '%' : '—'}</div></div>
    <div class="card"><div class="stat-label">Host RAM</div><div class="stat">${statsResp ? statsResp.stats.memory.usagePercent + '%' : '—'}</div></div>
    <div class="card"><div class="stat-label">Cgroups</div><div class="stat">${statsResp ? (statsResp.cgroups.available ? 'active' : 'unavailable') : '—'}</div></div>
  `;

  // Sembunyikan tombol create kalau bukan admin
  const createBtn = main.querySelector('#createBtn');
  if (createBtn) createBtn.style.display = isAdmin ? '' : 'none';

  if (servers.length === 0) {
    table.innerHTML = '<p class="muted">No servers yet.</p>';
    return;
  }

  table.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Runtime</th><th>Status</th><th>RAM</th><th>CPU</th><th>Disk</th><th></th></tr></thead>
      <tbody>
        ${servers.map((s) => `
          <tr>
            <td><a href="/server?id=${s.id}">${escapeHtml(s.name)}</a></td>
            <td>${escapeHtml(s.runtime)}</td>
            <td><span class="badge ${badgeClass(s.status)}">${s.status}</span></td>
            <td>${s.resources.memory} MB</td>
            <td>${s.resources.cpu}%</td>
            <td>${s.resources.disk} MB</td>
            <td class="row">
              ${s.status === 'suspended'
                ? '<span class="muted">suspended</span>'
                : `<button data-act="start" data-id="${s.id}">Start</button>
                   <button data-act="stop" data-id="${s.id}">Stop</button>
                   <button data-act="restart" data-id="${s.id}">Restart</button>`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  table.querySelectorAll('button[data-act]').forEach((b) => {
    b.addEventListener('click', async () => {
      const act = b.dataset.act;
      const id = b.dataset.id;
      try {
        await api(`/api/servers/${id}/${act}`, { method: 'POST' });
        toast(`Server ${act} ok`, 'success');
        refresh();
      } catch (e) { toast(e.message, 'error'); }
    });
  });
}

// Tombol create server hanya muncul kalau admin
const createBtn = main.querySelector('#createBtn');
if (createBtn) {
  if (!isAdmin) {
    createBtn.style.display = 'none';
  } else {
    createBtn.addEventListener('click', () => {
      location.href = '/admin#servers';
    });
  }
}

refresh();