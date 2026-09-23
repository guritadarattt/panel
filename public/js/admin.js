// public/js/admin.js
import { mountShell } from '/js/shell.js';
import { api, toast } from '/js/api.js';
import { promptModal, confirmModal } from '/js/contextMenu.js';

const { user, main } = await mountShell({ active: 'admin' });
if (user.role !== 'admin') { location.href = '/dashboard'; }

const titleEl = main.querySelector('#title');
const tabContent = main.querySelector('#tab-content');

async function loadTab(name) {
  main.querySelectorAll('.tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === name)
  );
  if (name === 'settings') return renderSettings();
  if (name === 'appearance') return renderAppearance();
  if (name === 'theme') return renderTheme();
  if (name === 'users') return renderUsers();
  if (name === 'servers') return renderServers();
  if (name === 'audit') return renderAudit();
}
/* ========================================================
   PANEL SETTINGS
======================================================== */
async function renderSettings() {
  const { settings } = await api('/api/settings');

  tabContent.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">Panel Identity</h2>
      <label>Nama Panel</label>
      <input id="panelName" value="${escapeAttr(settings.panelName || 'Gurita Panel')}" maxlength="64" />
      <div style="height:8px;"></div>
      <label>Pesan saat server disuspend</label>
      <input id="suspendedMessage" value="${escapeAttr(settings.suspendedMessage || '')}" maxlength="300" />
      <div style="height:8px;"></div>
      <label style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="allowReg" style="width:auto;" ${settings.allowRegistration ? 'checked' : ''}>
        Izinkan registrasi user baru
      </label>
      <div class="row" style="margin-top:14px;">
        <button id="saveSettings" class="primary">Save</button>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0;">Logo Panel</h2>
      <p class="muted">Upload gambar (PNG/JPG/SVG/WebP/GIF). Maks 512 KB.</p>
      <div class="row" style="align-items:center; gap:16px; flex-wrap:wrap;">
        <div id="logoPreview" style="
          width:80px; height:80px; border-radius:12px;
          border:1px solid var(--border); background: var(--bg-3);
          display:flex; align-items:center; justify-content:center; overflow:hidden;
        "></div>
        <div>
          <input type="file" id="logoInput" accept="image/*" style="display:none" />
          <button id="uploadLogoBtn">Upload Logo</button>
          <button id="deleteLogoBtn" class="danger">Hapus Logo</button>
        </div>
      </div>
    </div>
  `;

  drawLogoPreview(settings.logoDataUrl);

  tabContent.querySelector('#saveSettings').addEventListener('click', async () => {
    try {
      await api('/api/settings', {
        method: 'PATCH',
        body: {
          panelName: tabContent.querySelector('#panelName').value.trim(),
          suspendedMessage: tabContent.querySelector('#suspendedMessage').value,
          allowRegistration: tabContent.querySelector('#allowReg').checked,
        },
      });
      toast('Settings tersimpan', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });

  const logoInput = tabContent.querySelector('#logoInput');
  tabContent.querySelector('#uploadLogoBtn').addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 512 * 1024) { toast('File >512 KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api('/api/settings/logo', {
          method: 'POST',
          body: { dataUrl: reader.result },
        });
        drawLogoPreview(res.settings.logoDataUrl);
        toast('Logo diupload', 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
    reader.readAsDataURL(f);
  });

  tabContent.querySelector('#deleteLogoBtn').addEventListener('click', async () => {
    const ok = await confirmModal({ title: 'Hapus Logo', message: 'Hapus logo panel?', okText: 'Hapus' });
    if (!ok) return;
    try {
      await api('/api/settings/logo', { method: 'DELETE' });
      drawLogoPreview(null);
      toast('Logo dihapus', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}

function drawLogoPreview(dataUrl) {
  const el = tabContent.querySelector('#logoPreview');
  if (!el) return;
  if (dataUrl) {
    el.innerHTML = `<img src="${dataUrl}" style="max-width:100%; max-height:100%;" />`;
  } else {
    el.innerHTML = `<span class="muted" style="font-size:28px;">🐙</span>`;
  }
}

/* ========================================================
   USER MANAGEMENT
======================================================== */
async function renderUsers() {
  async function draw() {
    const { users } = await api('/api/users');
    tabContent.innerHTML = `
      <div class="card">
        <div class="row" style="margin-bottom:10px;">
          <h2 style="flex:1; margin:0;">Users</h2>
          <button id="newUser" class="primary">+ New User</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Max Srv</th>
              <th>RAM</th>
              <th>CPU</th>
              <th>Disk</th>
              <th style="width:200px;"></th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td>
                  <select data-role="${u.id}" style="width:auto; padding:4px 6px;">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                    <option value="reseller" ${u.role === 'reseller' ? 'selected' : ''}>reseller</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                  </select>
                </td>
                <td>
                  <span class="badge ${u.status === 'active' ? 'green' : 'red'}">${u.status}</span>
                </td>
                <td>${u.resourceLimits?.maxServers ?? '—'}</td>
                <td>${u.resourceLimits?.maxRam ?? '—'} MB</td>
                <td>${u.resourceLimits?.maxCpu ?? '—'}%</td>
                <td>${u.resourceLimits?.maxDisk ?? '—'} MB</td>
                <td class="row">
                <button data-edit="${u.id}">Edit</button>
                ${u.status === 'active'
                  ? `<button data-ban="${u.id}" class="danger">Suspend</button>`
                  : `<button data-unban="${u.id}">Aktifkan</button>`}
                <button data-del="${u.id}" class="danger">Hapus</button>
              </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    tabContent.querySelector('#newUser').addEventListener('click', createUserFlow);

    // Role change
    tabContent.querySelectorAll('select[data-role]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/api/users/${sel.dataset.role}`, {
            method: 'PATCH',
            body: { role: sel.value },
          });
          toast('Role diubah', 'success');
        } catch (e) { toast(e.message, 'error'); draw(); }
      });
    });

    // Ban / unban / delete
    tabContent.querySelectorAll('[data-ban]').forEach((b) =>
      b.addEventListener('click', async () => {
        const ok = await confirmModal({
          title: 'Suspend User',
          message: 'User tidak akan bisa login lagi sampai diaktifkan.',
          okText: 'Suspend',
        });
        if (!ok) return;
        try {
          await api(`/api/users/${b.dataset.ban}/ban`, { method: 'POST' });
          toast('User disuspend', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );

    tabContent.querySelectorAll('[data-unban]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await api(`/api/users/${b.dataset.unban}/unban`, { method: 'POST' });
          toast('User diaktifkan', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );
        // Edit user
    tabContent.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', async () => {
        const u = users.find((x) => x.id === b.dataset.edit);
        if (!u) return;
        openEditUserModal(u, draw);
      })
    );

    tabContent.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        const ok = await confirmModal({
          title: 'Hapus User',
          message: 'User dan semua sesinya akan dihapus. Server miliknya TIDAK dihapus otomatis.',
          okText: 'Hapus',
        });
        if (!ok) return;
        try {
          await api(`/api/users/${b.dataset.del}`, { method: 'DELETE' });
          toast('User dihapus', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );
  }
  draw();
}

async function createUserFlow() {
  const username = await promptModal({ title: 'User Baru', label: 'Username', okText: 'Lanjut' });
  if (!username) return;
  const email = await promptModal({ title: 'User Baru', label: 'Email', okText: 'Lanjut' });
  if (!email) return;
  const password = await promptModal({ title: 'User Baru', label: 'Password (min 8)', okText: 'Lanjut' });
  if (!password) return;
  const role = await promptModal({ title: 'User Baru', label: 'Role (user/reseller/admin)', defaultValue: 'user', okText: 'Buat' });
  if (!role) return;

  try {
    await api('/api/users', {
      method: 'POST',
      body: {
        username, email, password, role,
        resourceLimits: { maxServers: 3, maxRam: 2048, maxDisk: 5120, maxCpu: 200 },
      },
    });
    toast('User dibuat', 'success');
    renderUsers();
  } catch (e) { toast(e.message, 'error'); }
}

/* ========================================================
   SERVER MANAGEMENT
======================================================== */
async function renderServers() {
  async function draw() {
    const [{ servers }, { users }] = await Promise.all([
      api('/api/admin/servers'),
      api('/api/users'),
    ]);

    tabContent.innerHTML = `
      <div class="card">
        <div class="row" style="margin-bottom:10px;">
          <h2 style="flex:1; margin:0;">Servers</h2>
          <button id="newServer" class="primary">+ New Server</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Runtime</th>
              <th>Status</th>
              <th>RAM</th>
              <th>CPU</th>
              <th>Disk</th>
              <th style="width:200px;"></th>
            </tr>
          </thead>
          <tbody>
            ${servers.map((s) => `
              <tr>
                <td><a href="/server?id=${s.id}">${escapeHtml(s.name)}</a></td>
                <td>${escapeHtml(s.ownerUsername)}</td>
                <td>${escapeHtml(s.runtime)}</td>
                <td><span class="badge ${badgeClass(s.status)}">${s.status}</span></td>
                <td>${s.resources.memory} MB</td>
                <td>${s.resources.cpu}%</td>
                <td>${s.resources.disk} MB</td>
                <td class="row">
                  <button data-edit="${s.id}">Edit</button>
                  ${s.status === 'suspended'
                    ? `<button data-unsusp="${s.id}">Unsuspend</button>`
                    : `<button data-susp="${s.id}" class="danger">Suspend</button>`}
                  <button data-del="${s.id}" class="danger">Hapus</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${servers.length === 0 ? '<p class="muted" style="margin-top:10px;">Belum ada server.</p>' : ''}
      </div>`;

    tabContent.querySelector('#newServer').addEventListener('click', () => newServerFlow(users));

    tabContent.querySelectorAll('[data-susp]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await api(`/api/admin/servers/${b.dataset.susp}/suspend`, { method: 'POST' });
          toast('Server disuspend', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );
    tabContent.querySelectorAll('[data-unsusp]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await api(`/api/admin/servers/${b.dataset.unsusp}/unsuspend`, { method: 'POST' });
          toast('Server diaktifkan', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );
    tabContent.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        const ok = await confirmModal({
          title: 'Hapus Server',
          message: 'Server, file, dan allocation akan dihapus permanen.',
          okText: 'Hapus',
        });
        if (!ok) return;
        try {
          await api(`/api/admin/servers/${b.dataset.del}`, { method: 'DELETE' });
          toast('Server dihapus', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );
        // Edit server
    tabContent.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = servers.find((x) => x.id === b.dataset.edit);
        if (!s) return;
        openEditServerModal(s, users, draw);
      })
    );
  }

  draw();
}

function newServerFlow(users) {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal-backdrop';
  wrapper.innerHTML = `
    <div class="modal-card" style="min-width:420px;">
      <h3 style="margin-top:0;">Server Baru</h3>
      <label>Nama Server</label>
      <input id="srvName" placeholder="Bot Gurita" />
      <label>Pemilik Server</label>
      <select id="srvOwner">
        ${users.map((u) => `<option value="${u.id}">${escapeHtml(u.username)} (${u.role})</option>`).join('')}
      </select>
      <label>Bahasa Pemrograman / Runtime</label>
      <select id="srvRuntime">
        <option value="node">Node.js</option>
        <option value="python3">Python 3</option>
        <option value="java">Java</option>
        <option value="php">PHP</option>
        <option value="ruby">Ruby</option>
        <option value="bun">Bun</option>
        <option value="deno">Deno</option>
        <option value="npm">npm script</option>
      </select>
      <label>Startup Command</label>
      <input id="srvStartup" placeholder="node index.js" />
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:8px;">
        <div><label>RAM (MB)</label><input id="srvRam" type="number" value="512" /></div>
        <div><label>CPU (%)</label><input id="srvCpu" type="number" value="50" /></div>
        <div><label>Disk (MB)</label><input id="srvDisk" type="number" value="1024" /></div>
      </div>
      <div class="row" style="margin-top:14px; justify-content:flex-end;">
        <button id="srvCancel">Cancel</button>
        <button id="srvCreate" class="primary">Buat Server</button>
      </div>
    </div>`;
  document.body.appendChild(wrapper);

  const close = () => wrapper.remove();
  wrapper.querySelector('#srvCancel').addEventListener('click', close);
  wrapper.addEventListener('click', (e) => { if (e.target === wrapper) close(); });

  wrapper.querySelector('#srvCreate').addEventListener('click', async () => {
    const body = {
      name: wrapper.querySelector('#srvName').value.trim(),
      ownerId: wrapper.querySelector('#srvOwner').value,
      runtime: wrapper.querySelector('#srvRuntime').value,
      startup: wrapper.querySelector('#srvStartup').value.trim(),
      resources: {
        memory: Number(wrapper.querySelector('#srvRam').value),
        cpu: Number(wrapper.querySelector('#srvCpu').value),
        disk: Number(wrapper.querySelector('#srvDisk').value),
        pids: 100,
      },
    };
    if (!body.name) { toast('Nama server wajib', 'error'); return; }
    if (!body.startup) { toast('Startup command wajib', 'error'); return; }
    try {
      await api('/api/admin/servers', { method: 'POST', body });
      toast('Server dibuat', 'success');
      close();
      renderServers();
    } catch (e) { toast(e.message, 'error'); }
  });
}

/* ========================================================
   Edit Server Modal
======================================================== */
function openEditServerModal(s, users, onSuccess) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `
    <div class="modal-card" style="min-width:520px; max-width:92vw; max-height:90vh; overflow-y:auto;">
      <h3 style="margin-top:0;">Edit Server</h3>
      <p class="muted" style="font-size:12px; margin-top:0;">
        Server ID: <code>${escapeHtml(s.id)}</code>
      </p>

      <label>Nama Server</label>
      <input id="esName" value="${escapeAttr(s.name)}" maxlength="64" />

      <label>Pemilik Server</label>
      <select id="esOwner">
        ${users.map((u) => `
          <option value="${u.id}" ${u.id === s.ownerId ? 'selected' : ''}>
            ${escapeHtml(u.username)} (${escapeHtml(u.role)})${u.status === 'suspended' ? ' — suspended' : ''}
          </option>
        `).join('')}
      </select>

      <label>Runtime / Bahasa Pemrograman</label>
      <select id="esRuntime">
        ${['node','python3','python','java','php','ruby','bun','deno','npm','pnpm','yarn']
          .map((rt) => `<option value="${rt}" ${rt === s.runtime ? 'selected' : ''}>${rt}</option>`)
          .join('')}
      </select>

      <label>Startup Command</label>
      <input id="esStartup" value="${escapeAttr(s.startup)}" maxlength="512" />

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; margin-top:12px;">
        <div><label>RAM (MB)</label><input id="esRam" type="number" value="${s.resources.memory}" /></div>
        <div><label>CPU (%)</label><input id="esCpu" type="number" value="${s.resources.cpu}" /></div>
        <div><label>Disk (MB)</label><input id="esDisk" type="number" value="${s.resources.disk}" /></div>
        <div><label>PIDs</label><input id="esPids" type="number" value="${s.resources.pids}" /></div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; margin-top:14px;">
        <input type="checkbox" id="esAutoRestart" style="width:auto;" ${s.autoRestart ? 'checked' : ''}>
        Auto restart saat crash
      </label>

      <div id="esError" class="muted" style="margin-top:8px; font-size:13px; color: var(--red);"></div>

      <div class="row" style="margin-top:16px; justify-content:flex-end;">
        <button id="esCancel">Cancel</button>
        <button id="esSave" class="primary">Simpan Perubahan</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  const close = () => back.remove();
  back.querySelector('#esCancel').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });

  back.querySelector('#esSave').addEventListener('click', async () => {
    const errEl = back.querySelector('#esError');
    errEl.textContent = '';

    const patch = {
      name: back.querySelector('#esName').value.trim(),
      ownerId: back.querySelector('#esOwner').value,
      runtime: back.querySelector('#esRuntime').value,
      startup: back.querySelector('#esStartup').value.trim(),
      autoRestart: back.querySelector('#esAutoRestart').checked,
      resources: {
        memory: Number(back.querySelector('#esRam').value),
        cpu: Number(back.querySelector('#esCpu').value),
        disk: Number(back.querySelector('#esDisk').value),
        pids: Number(back.querySelector('#esPids').value),
      },
    };

    if (!patch.name) { errEl.textContent = 'Nama wajib diisi'; return; }
    if (!patch.startup) { errEl.textContent = 'Startup command wajib diisi'; return; }
    if (!Number.isFinite(patch.resources.memory) || patch.resources.memory < 64) {
      errEl.textContent = 'RAM minimal 64 MB'; return;
    }
    if (!Number.isFinite(patch.resources.cpu) || patch.resources.cpu < 5) {
      errEl.textContent = 'CPU minimal 5%'; return;
    }
    if (!Number.isFinite(patch.resources.disk) || patch.resources.disk < 32) {
      errEl.textContent = 'Disk minimal 32 MB'; return;
    }
    if (!Number.isFinite(patch.resources.pids) || patch.resources.pids < 16) {
      errEl.textContent = 'PIDs minimal 16'; return;
    }

    const btn = back.querySelector('#esSave');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    try {
      await api(`/api/admin/servers/${s.id}`, { method: 'PATCH', body: patch });
      toast('Server diperbarui', 'success');
      close();
      if (typeof onSuccess === 'function') onSuccess();
    } catch (e) {
      errEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Simpan Perubahan';
    }
  });
}
/* ========================================================
   AUDIT LOG
======================================================== */
async function renderAudit() {
  const { logs } = await api('/api/audit?limit=100');
  tabContent.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">Audit Log</h2>
      ${logs.length === 0
        ? '<p class="muted">Belum ada aktivitas.</p>'
        : `<table>
            <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Target</th><th>Result</th></tr></thead>
            <tbody>
              ${logs.map((l) => `
                <tr>
                  <td>${new Date(l.createdAt).toLocaleString()}</td>
                  <td>${escapeHtml(l.action)}</td>
                  <td>${escapeHtml(l.userId || '—')}</td>
                  <td>${escapeHtml(l.target || '—')}</td>
                  <td>${escapeHtml(l.result || 'ok')}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>`;
}

/* ========================================================
   GitHub import modal
======================================================== */
function openGithubImportModal(onSuccess) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `
    <div class="modal-card" style="min-width:480px; max-width:90vw;">
      <h3 style="margin-top:0;">Import Tema dari GitHub</h3>
      <p class="muted" style="margin-top:0; font-size:13px;">
        Hanya repository <strong>publik</strong>. Panel akan download zip-nya dan extract
        ke folder <code>themes/</code>.
      </p>
      <label>URL Repository</label>
      <input id="ghUrl" placeholder="https://github.com/user/repo" />
      <p class="muted" style="margin-top:6px; font-size:12px;">
        Format yang didukung:<br>
        • <code>https://github.com/user/repo</code><br>
        • <code>https://github.com/user/repo/tree/main</code><br>
        • <code>https://github.com/user/repo/tree/main/subfolder</code>
      </p>
      <div id="ghProgress" class="muted" style="margin-top:12px; font-size:13px;"></div>
      <div class="row" style="margin-top:14px; justify-content:flex-end;">
        <button id="ghCancel">Cancel</button>
        <button id="ghImport" class="primary">Import</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  const close = () => back.remove();
  const input = back.querySelector('#ghUrl');
  const progress = back.querySelector('#ghProgress');
  const importBtn = back.querySelector('#ghImport');

  input.focus();

  back.querySelector('#ghCancel').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') importBtn.click(); });

  importBtn.addEventListener('click', async () => {
    const url = input.value.trim();
    if (!url) { progress.textContent = 'URL wajib diisi'; return; }

    importBtn.disabled = true;
    importBtn.textContent = 'Importing…';
    progress.textContent = 'Mengunduh dari GitHub…';

    try {
      const res = await api('/api/themes/import-github', {
        method: 'POST',
        body: { url },
      });
      progress.textContent = `✓ Berhasil import: ${res.theme.displayName} v${res.theme.version}`;
      progress.style.color = 'var(--green)';
      toast('Tema berhasil diimport', 'success');
      setTimeout(() => {
        close();
        if (typeof onSuccess === 'function') onSuccess();
      }, 900);
    } catch (e) {
      progress.textContent = `✗ ${e.message}`;
      progress.style.color = 'var(--red)';
      importBtn.disabled = false;
      importBtn.textContent = 'Import';
    }
  });
}

/* ========================================================
   Edit User Modal
======================================================== */
function openEditUserModal(u, onSuccess) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `
    <div class="modal-card" style="min-width:420px; max-width:90vw;">
      <h3 style="margin-top:0;">Edit User</h3>
      <p class="muted" style="font-size:12px; margin-top:0;">
        User ID: <code>${escapeHtml(u.id)}</code>
      </p>

      <label>Username</label>
      <input id="euUsername" value="${escapeAttr(u.username)}" maxlength="32" />

      <label>Email</label>
      <input id="euEmail" type="email" value="${escapeAttr(u.email)}" maxlength="254" />

      <label>Role</label>
      <select id="euRole">
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
        <option value="reseller" ${u.role === 'reseller' ? 'selected' : ''}>reseller</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
      </select>

      <label>Status</label>
      <select id="euStatus">
        <option value="active" ${u.status === 'active' ? 'selected' : ''}>active</option>
        <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>suspended</option>
      </select>

      <hr style="border-color: var(--border); margin: 16px 0;" />

      <label>Reset Password (opsional)</label>
      <input id="euPassword" type="password" placeholder="Kosongkan jika tidak diubah" autocomplete="new-password" />
      <p class="muted" style="font-size:12px; margin-top:2px;">
        Berguna kalau user lupa sandi. Password lama akan langsung diganti.
      </p>

      <div id="euError" class="muted" style="margin-top:8px; font-size:13px; color: var(--red);"></div>

      <div class="row" style="margin-top:14px; justify-content:flex-end;">
        <button id="euCancel">Cancel</button>
        <button id="euSave" class="primary">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  const close = () => back.remove();
  back.querySelector('#euCancel').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });

  back.querySelector('#euSave').addEventListener('click', async () => {
    const errEl = back.querySelector('#euError');
    errEl.textContent = '';

    const patch = {
      username: back.querySelector('#euUsername').value.trim(),
      email: back.querySelector('#euEmail').value.trim(),
      role: back.querySelector('#euRole').value,
      status: back.querySelector('#euStatus').value,
    };
    const newPass = back.querySelector('#euPassword').value;
    if (newPass) {
      if (newPass.length < 8) {
        errEl.textContent = 'Password minimal 8 karakter';
        return;
      }
      patch.password = newPass;
    }

    const btn = back.querySelector('#euSave');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: patch });
      toast('User diperbarui', 'success');
      close();
      if (typeof onSuccess === 'function') onSuccess();
    } catch (e) {
      errEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });
}

/* ========================================================
   HELPERS
======================================================== */
function badgeClass(status) {
  if (status === 'running') return 'green';
  if (status === 'crashed') return 'red';
  if (status === 'starting') return 'yellow';
  if (status === 'suspended') return 'red';
  return 'gray';
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
function escapeAttr(s) {
  return escapeHtml(s);
}

/* ========================================================
   INIT
======================================================== */
// Hash-based tab: #settings, #users, #servers, #audit
function initialTab() {
  const h = (location.hash || '').replace('#', '');
  if (['settings', 'appearance', 'theme', 'users', 'servers', 'audit'].includes(h)) return h;
  return 'settings';
}
/* ========================================================
   APPEARANCE
======================================================== */
async function renderAppearance() {
  async function draw() {
    const { settings } = await api('/api/settings');
    const { tracks } = await api('/api/media/music');

    const bgUrl = settings.backgroundUrl
      ? `${settings.backgroundUrl}?t=${settings.backgroundUpdatedAt || Date.now()}`
      : null;

    tabContent.innerHTML = `
      <div class="card">
        <h2 style="margin-top:0;">Background Panel</h2>
        <p class="muted" style="margin-top:0;">
          Foto (JPG/PNG/WebP/GIF) atau video (MP4/WebM). Maks 20 MB.
        </p>
        <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
          <div id="bgPreview" style="
            width:320px; height:180px; border-radius:10px;
            border:1px solid var(--border); background: var(--bg-3);
            display:flex; align-items:center; justify-content:center;
            overflow:hidden;
          ">
            ${bgUrl
              ? (settings.backgroundType === 'video'
                ? `<video src="${bgUrl}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
                : `<img src="${bgUrl}" style="width:100%;height:100%;object-fit:cover;" />`)
              : '<span class="muted">Tidak ada background</span>'}
          </div>
          <div>
            <input type="file" id="bgInput" accept="image/*,video/mp4,video/webm" style="display:none" />
            <button id="bgUploadBtn" class="primary">📷 Upload Background</button>
            <button id="bgDeleteBtn" class="danger">Hapus Background</button>
            <div style="margin-top:12px;">
              <label>Opacity (0.1 – 1.0)</label>
              <input id="bgOpacity" type="number" min="0.1" max="1" step="0.05" value="${settings.backgroundOpacity ?? 1}" style="max-width:120px;" />
              <label style="margin-top:8px;">Blur (px)</label>
              <input id="bgBlur" type="number" min="0" max="40" step="1" value="${settings.backgroundBlur ?? 0}" style="max-width:120px;" />
              <div class="row" style="margin-top:8px;">
                <button id="bgSaveStyle">Simpan Style</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;">Music Player</h2>
        <p class="muted" style="margin-top:0;">
          Upload lagu (MP3/OGG/WAV/M4A). Maks 15 MB per lagu, maks 50 lagu.
        </p>
        <div class="row" style="flex-wrap:wrap; gap:16px; margin-bottom:10px;">
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="muEnabled" style="width:auto;" ${settings.musicEnabled ? 'checked' : ''}>
            Aktifkan music player
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="muAutoplay" style="width:auto;" ${settings.musicAutoplay ? 'checked' : ''}>
            Autoplay
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="muLoop" style="width:auto;" ${settings.musicLoop ? 'checked' : ''}>
            Loop
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="muShowLogin" style="width:auto;" ${settings.musicShowOnLogin ? 'checked' : ''}>
            Tampil di halaman login
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            Volume:
            <input id="muVolume" type="number" min="0" max="1" step="0.05" value="${settings.musicVolume ?? 0.5}" style="max-width:80px;">
          </label>
          <button id="muSave" class="primary">Simpan Pengaturan</button>
        </div>

        <div class="row" style="margin-bottom:10px; flex-wrap:wrap;">
          <input type="file" id="muInput" accept=".mp3,.ogg,.wav,.m4a,audio/*" style="display:none" />
          <button id="muUploadBtn" class="primary">🎵 Upload Lagu</button>
          <span class="muted" style="font-size:12px;">${tracks.length} / 50 lagu</span>
        </div>

        <div id="muList"></div>
      </div>
    `;

    /* ---------- Background upload ---------- */
    const bgInput = tabContent.querySelector('#bgInput');
    tabContent.querySelector('#bgUploadBtn').addEventListener('click', () => bgInput.click());
    bgInput.addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 20 * 1024 * 1024) { toast('File > 20 MB', 'error'); return; }
      const fd = new FormData(); fd.append('file', f);
      const csrf = (document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/) || [])[1] || '';
      const res = await fetch('/api/media/background', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: { 'x-csrf-token': decodeURIComponent(csrf) },
      });
      if (!res.ok) {
        let msg = 'Upload gagal';
        try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
        toast(msg, 'error');
      } else {
        toast('Background diupload', 'success');
        draw();
      }
      bgInput.value = '';
    });

    tabContent.querySelector('#bgDeleteBtn').addEventListener('click', async () => {
      const ok = await confirmModal({ title: 'Hapus Background', message: 'Hapus background aktif?', okText: 'Hapus' });
      if (!ok) return;
      try {
        await api('/api/media/background', { method: 'DELETE' });
        toast('Background dihapus', 'success');
        draw();
      } catch (e) { toast(e.message, 'error'); }
    });

    tabContent.querySelector('#bgSaveStyle').addEventListener('click', async () => {
      const opacity = Number(tabContent.querySelector('#bgOpacity').value);
      const blur = Number(tabContent.querySelector('#bgBlur').value);
      try {
        await api('/api/media/appearance', {
          method: 'PATCH',
          body: { backgroundOpacity: opacity, backgroundBlur: blur },
        });
        toast('Style disimpan', 'success');
      } catch (e) { toast(e.message, 'error'); }
    });

    /* ---------- Music settings ---------- */
    tabContent.querySelector('#muSave').addEventListener('click', async () => {
      try {
        await api('/api/media/appearance', {
          method: 'PATCH',
          body: {
            musicEnabled: tabContent.querySelector('#muEnabled').checked,
            musicAutoplay: tabContent.querySelector('#muAutoplay').checked,
            musicLoop: tabContent.querySelector('#muLoop').checked,
            musicShowOnLogin: tabContent.querySelector('#muShowLogin').checked,
            musicVolume: Number(tabContent.querySelector('#muVolume').value),
          },
        });
        toast('Pengaturan disimpan', 'success');
      } catch (e) { toast(e.message, 'error'); }
    });

    /* ---------- Music list ---------- */
    const list = tabContent.querySelector('#muList');
    if (tracks.length === 0) {
      list.innerHTML = '<p class="muted">Belum ada lagu.</p>';
    } else {
      list.innerHTML = `
        <table>
          <thead><tr><th>Judul</th><th>Ukuran</th><th>Diunggah</th><th></th></tr></thead>
          <tbody>
            ${tracks.map((t) => `
              <tr>
                <td>🎵 ${escapeHtml(t.title)}</td>
                <td>${(t.size / 1024 / 1024).toFixed(2)} MB</td>
                <td>${new Date(t.mtime).toLocaleString()}</td>
                <td>
                  <button data-play="${escapeHtml(t.url)}">▶</button>
                  <button data-del="${escapeHtml(t.filename)}" class="danger">Hapus</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      list.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', async () => {
          const ok = await confirmModal({
            title: 'Hapus Lagu',
            message: 'Hapus lagu ini dari daftar?',
            okText: 'Hapus',
          });
          if (!ok) return;
          try {
            await api(`/api/media/music/${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE' });
            toast('Lagu dihapus', 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      );
      list.querySelectorAll('[data-play]').forEach((b) =>
        b.addEventListener('click', () => {
          const a = new Audio(b.dataset.play);
          a.volume = 0.5;
          a.play().catch(() => toast('Gagal play', 'error'));
        })
      );
    }

    /* ---------- Upload music ---------- */
    const muInput = tabContent.querySelector('#muInput');
    tabContent.querySelector('#muUploadBtn').addEventListener('click', () => muInput.click());
    muInput.addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 15 * 1024 * 1024) { toast('File > 15 MB', 'error'); return; }
      const fd = new FormData(); fd.append('file', f);
      const csrf = (document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/) || [])[1] || '';
      const res = await fetch('/api/media/music', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: { 'x-csrf-token': decodeURIComponent(csrf) },
      });
      if (!res.ok) {
        let msg = 'Upload gagal';
        try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
        toast(msg, 'error');
      } else {
        toast('Lagu diupload', 'success');
        draw();
      }
      muInput.value = '';
    });
  }

  draw();
}
/* ========================================================
   THEME
======================================================== */
async function renderTheme() {
  async function draw() {
    const { themes, active } = await api('/api/themes');

   tabContent.innerHTML = `
  <div class="card">
    <div class="row" style="margin-bottom:10px; flex-wrap:wrap; gap:8px;">
      <h2 style="flex:1; margin:0;">Themes</h2>
      <input type="file" id="themeUpload" accept=".zip" style="display:none" />
      <button id="uploadThemeBtn" class="primary">📦 Upload .zip</button>
      <button id="importGithubBtn">🐙 Import dari GitHub</button>
      <button id="reloadThemeBtn">⟳ Reload</button>
    </div>
    <p class="muted" style="margin-top:0;">
      Tema CSS-only. Upload zip (<code>package.json</code> + <code>theme.css</code>) atau
      import langsung dari repository GitHub publik.
    </p>
    <div id="themeGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px; margin-top:14px;"></div>
  </div>`;

    const grid = tabContent.querySelector('#themeGrid');

    if (themes.length === 0) {
      grid.innerHTML = '<p class="muted">Belum ada tema. Upload satu.</p>';
    } else {
      for (const t of themes) {
        const isActive = t.folder === active;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.margin = '0';
        card.innerHTML = `
          <div style="
            height:120px; border-radius:8px; border:1px solid var(--border);
            background: var(--bg-3); display:flex; align-items:center;
            justify-content:center; overflow:hidden; margin-bottom:10px;
          ">
            ${t.preview
              ? `<img src="/api/themes/${encodeURIComponent(t.folder)}/preview" style="max-width:100%; max-height:100%;" />`
              : '<span class="muted" style="font-size:12px;">no preview</span>'}
          </div>
          <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(t.displayName)}</div>
          <div class="muted" style="font-size:12px; margin-bottom:6px;">
            v${escapeHtml(t.version)} · ${escapeHtml(t.author)}
          </div>
          <div class="muted" style="font-size:12px; min-height:32px;">
            ${escapeHtml(t.description || '')}
          </div>
          <div class="row" style="margin-top:10px;">
            ${isActive
              ? '<span class="badge green">Active</span>'
              : `<button class="primary" data-act="${escapeHtml(t.folder)}">Activate</button>`}
            <div class="grow"></div>
            ${t.folder === 'default'
              ? ''
              : `<button class="danger" data-del="${escapeHtml(t.folder)}">Hapus</button>`}
          </div>
        `;
        grid.appendChild(card);
      }
    }

    grid.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await api(`/api/themes/${encodeURIComponent(b.dataset.act)}/activate`, { method: 'POST' });
          toast('Tema diaktifkan. Reload…', 'success');
          setTimeout(() => location.reload(), 600);
        } catch (e) { toast(e.message, 'error'); }
      })
    );

    grid.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        const ok = await confirmModal({
          title: 'Hapus Tema',
          message: `Hapus tema "${b.dataset.del}"?`,
          okText: 'Hapus',
        });
        if (!ok) return;
        try {
          await api(`/api/themes/${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE' });
          toast('Tema dihapus', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      })
    );

    const uploadInput = tabContent.querySelector('#themeUpload');
        // ---- Import dari GitHub ----
    tabContent.querySelector('#importGithubBtn').addEventListener('click', () => {
      openGithubImportModal(draw);
    });
    tabContent.querySelector('#uploadThemeBtn').addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      const csrf = (document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/) || [])[1] || '';
      const res = await fetch('/api/themes/upload', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: { 'x-csrf-token': decodeURIComponent(csrf) },
      });
      if (!res.ok) {
        let msg = 'Upload gagal';
        try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
        toast(msg, 'error');
      } else {
        toast('Tema diupload', 'success');
        draw();
      }
      uploadInput.value = '';
    });

    tabContent.querySelector('#reloadThemeBtn').addEventListener('click', draw);
  }

  draw();
}
main.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    location.hash = b.dataset.tab;
    loadTab(b.dataset.tab);
  })
);
window.addEventListener('hashchange', () => loadTab(initialTab()));

loadTab(initialTab());