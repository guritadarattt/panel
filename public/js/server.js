// public/js/server.js
import { mountShell } from '/js/shell.js';
import { api, toast } from '/js/api.js';
import { showContextMenu, promptModal, confirmModal } from '/js/contextMenu.js';
// xterm.js di-load via <script> biasa (bukan ES module) supaya kompatibel
// dengan CSP 'self' tanpa perlu buka CDN.
// Lihat public/vendor/xterm/
const Terminal = window.Terminal;
const FitAddon = window.FitAddon.FitAddon;

const { main } = await mountShell({ active: 'servers' });
const id = new URLSearchParams(location.search).get('id');
if (!id) { location.href = '/dashboard'; }

const title = main.querySelector('#title');
const tabContent = main.querySelector('#tab-content');
let ws = null;
let termEl = null;

/* ---------- Shell (ephemeral PTY) ---------- */
async function renderShell() {
  tabContent.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:8px; flex-wrap:wrap; gap:6px;">
        <span id="shellStatus" class="badge gray">connecting…</span>
        <div class="grow"></div>
        <button id="shellCloseBtn" class="danger">Close Shell</button>
      </div>

      <div id="shellHost" style="height:460px; background:#0a0c12; border:1px solid var(--border); border-radius:8px; padding:6px;"></div>

      <div class="row" style="margin-top:10px; flex-wrap:wrap; gap:6px;">
        <span class="muted" style="font-size:12px;">Shortcut:</span>
        <button class="ghost shortcut-btn" data-sc="\u0003" title="Kill proses di foreground">Ctrl+C</button>
        <button class="ghost shortcut-btn" data-sc="\u0004" title="EOF / logout">Ctrl+D</button>
        <button class="ghost shortcut-btn" data-sc="\u001a" title="Suspend proses (jobs)">Ctrl+Z</button>
        <button class="ghost shortcut-btn" data-sc="\u000c" title="Clear screen">Ctrl+L</button>
        <button class="ghost shortcut-btn" data-sc="\t" title="Autocomplete">Tab</button>
        <button class="ghost shortcut-btn" data-sc="\u001b[A" title="Perintah sebelumnya">↑</button>
        <button class="ghost shortcut-btn" data-sc="\u001b[B" title="Perintah berikutnya">↓</button>
        <button class="ghost shortcut-btn" data-sc="clear\r" title="Bersihkan layar">clear</button>
        <button class="ghost shortcut-btn" data-sc="ls -la\r" title="List file">ls -la</button>
        <button class="ghost shortcut-btn" data-sc="pwd\r" title="Lokasi sekarang">pwd</button>
      </div>

      <p class="muted" style="margin-top:10px; font-size:12px;">
        Shell ini terikat pada tab ini. Kalau browser ditutup atau Anda pindah tab lain,
        shell akan dimatikan otomatis. Kerjaan background (server utama) tetap berjalan.
      </p>
    </div>`;

  const status = tabContent.querySelector('#shellStatus');
  const host = tabContent.querySelector('#shellHost');

  const term = new Terminal({
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontSize: 13,
    theme: { background: '#0a0c12', foreground: '#d7dbe5' },
    cursorBlink: true,
    convertEol: false,   // shell kirim \r\n sendiri
    scrollback: 5000,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  try { fit.fit(); } catch {}

  let ws = null;
  let closedByUser = false;

  function connectShell() {
    if (ws) { try { ws.close(); } catch {} ws = null; }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws/shell/${id}`);

    ws.onopen = () => {
      status.textContent = 'connected';
      status.className = 'badge green';
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      term.focus();
    };

    ws.onclose = () => {
      if (closedByUser) {
        status.textContent = 'closed';
        status.className = 'badge gray';
      } else {
        status.textContent = 'disconnected';
        status.className = 'badge red';
      }
    };

    ws.onerror = () => {
      status.textContent = 'error';
      status.className = 'badge red';
    };

    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'data') {
        term.write(m.data);
      } else if (m.type === 'ready') {
        status.textContent = 'connected';
        status.className = 'badge green';
      } else if (m.type === 'exit') {
        term.write(`\r\n\x1b[33m[shell exit ${m.exitCode}]\x1b[0m\r\n`);
        status.textContent = 'exited';
        status.className = 'badge gray';
      } else if (m.type === 'closed') {
        term.write(`\r\n\x1b[33m[shell closed: ${m.reason}]\x1b[0m\r\n`);
      } else if (m.type === 'error') {
        term.write(`\r\n\x1b[31m[error] ${m.message}\x1b[0m\r\n`);
      }
    };
  }

  connectShell();

  // Keypress user → kirim raw ke PTY
  term.onData((data) => {
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });

  // Resize
  const onResize = () => {
    try {
      fit.fit();
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    } catch {}
  };
  window.addEventListener('resize', onResize);

  // Tombol shortcut → kirim kode kontrol ke PTY
  tabContent.querySelectorAll('.shortcut-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sc = btn.dataset.sc;
      if (!sc) return;
      // decode \uXXXX dan \r
      const decoded = sc
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data: decoded }));
        term.focus();
      }
    });
  });

  // Tombol close manual
  tabContent.querySelector('#shellCloseBtn').addEventListener('click', () => {
    closedByUser = true;
    if (ws) { try { ws.close(); } catch {} ws = null; }
    status.textContent = 'closed';
    status.className = 'badge gray';
    term.write('\r\n\x1b[33m[shell ditutup oleh user]\x1b[0m\r\n');
  });

  // Cleanup saat pindah tab / browser tutup
  const observer = new MutationObserver(() => {
    if (!document.body.contains(host)) {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      if (ws) { try { ws.close(); } catch {} ws = null; }
    }
  });
  observer.observe(tabContent, { childList: true });

  window.addEventListener('beforeunload', () => {
    if (ws) { try { ws.close(); } catch {} }
  }, { once: true });
}

async function refreshHeader() {
  const { server } = await api(`/api/servers/${id}`);
  const alloc = await api(`/api/servers/${id}/allocations`).catch(() => ({ allocations: [] }));
  const ports = alloc.allocations.map((a) => a.port).join(', ') || '—';
  title.textContent = `${server.name} — ${server.id}  ·  ports: ${ports}`;
}

async function loadTab(name) {
  main.querySelectorAll('.tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === name)
  );
  if (ws) { ws.close(); ws = null; }
  if (name === 'console') return renderConsole();
  if (name === 'files') return renderFiles();
  if (name === 'resources') return renderResources();
  if (name === 'allocations') return renderAllocations();
  if (name === 'settings') return renderSettings();
  if (name === 'shell') return renderShell();
}

/* ---------- Console ---------- */
function appendLine(stream, line, ts) {
  if (!termEl) return;
  const d = document.createElement('div');
  d.className = `line ${stream}`;
  const t = ts ? new Date(ts).toLocaleTimeString() : '';
  d.textContent = `${t} ${line}`;
  termEl.appendChild(d);
  termEl.scrollTop = termEl.scrollHeight;
}

async function renderConsole() {
  tabContent.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:8px;">
        <span id="connStatus" class="badge gray">connecting…</span>
        <div class="grow"></div>
        <button id="clearBtn">Clear</button>
      </div>
      <div id="term" class="terminal"></div>
      <div class="row" style="margin-top:8px;">
        <input id="cmdInput" placeholder="Type input and press Enter" />
        <button id="sendBtn" class="primary">Send</button>
      </div>
    </div>`;
  termEl = tabContent.querySelector('#term');
  const status = tabContent.querySelector('#connStatus');

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws/console/${id}`);
  ws.onopen = () => { status.textContent = 'connected'; status.className = 'badge green'; };
  ws.onclose = () => { status.textContent = 'disconnected'; status.className = 'badge red'; };
  ws.onerror = () => { status.textContent = 'error'; status.className = 'badge red'; };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'line') appendLine(m.stream, m.line, m.ts);
    else if (m.type === 'status') status.textContent = m.status;
    else if (m.type === 'error') appendLine('stderr', m.message);
  };

  const send = () => {
    const v = tabContent.querySelector('#cmdInput').value;
    if (!v) return;
    ws?.send(JSON.stringify({ type: 'command', data: v }));
    tabContent.querySelector('#cmdInput').value = '';
  };
  tabContent.querySelector('#sendBtn').addEventListener('click', send);
  tabContent.querySelector('#cmdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  tabContent.querySelector('#clearBtn').addEventListener('click', () => {
    termEl.innerHTML = '';
  });
}

/* ---------- Files ---------- */
async function renderFiles() {
  let cwd = '.';
  const selected = new Set();

  const relPath = (name) => (cwd === '.' ? name : `${cwd}/${name}`);

  async function openEditor(name) {
    const rel = relPath(name);
    const { content } = await api(`/api/servers/${id}/files/read?path=${encodeURIComponent(rel)}`);
    const w = document.createElement('div');
    w.className = 'card';
    w.innerHTML = `
      <h3></h3>
      <textarea id="ed" style="height:300px;font-family:monospace;"></textarea>
      <div class="row" style="margin-top:8px;">
        <button class="primary" id="save">Save</button>
        <button id="close">Close</button>
      </div>`;
    w.querySelector('h3').textContent = name;
    tabContent.appendChild(w);
    w.querySelector('#ed').value = content;
    w.querySelector('#save').addEventListener('click', async () => {
      try {
        await api(`/api/servers/${id}/files/write`, {
          method: 'POST',
          body: { path: rel, content: w.querySelector('#ed').value },
        });
        toast('Saved', 'success');
      } catch (e) { toast(e.message, 'error'); }
    });
    w.querySelector('#close').addEventListener('click', () => w.remove());
  }

  async function downloadFile(name) {
    const rel = relPath(name);
    const url = `/api/servers/${id}/files/download?path=${encodeURIComponent(rel)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadZip(paths) {
    const csrf = (document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/) || [])[1] || '';
    const res = await fetch(`/api/servers/${id}/files/zip`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': decodeURIComponent(csrf),
      },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) {
      let msg = 'Zip gagal';
      try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
      toast(msg, 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archive.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Download .zip dimulai', 'success');
  }

  async function unzipFile(name) {
    const rel = relPath(name);
    const ok = await confirmModal({
      title: 'Extract ZIP',
      message: `Extract "${name}" ke folder saat ini?`,
      okText: 'Extract',
      danger: false,
    });
    if (!ok) return;
    try {
      await api(`/api/servers/${id}/files/unzip`, {
        method: 'POST',
        body: { path: rel, dest: cwd },
      });
      toast('Extract selesai', 'success');
      draw();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function renameEntry(name) {
    const newName = await promptModal({
      title: 'Rename',
      label: 'Nama baru',
      defaultValue: name,
      okText: 'Rename',
    });
    if (!newName || newName === name) return;
    try {
      await api(`/api/servers/${id}/files/rename`, {
        method: 'POST',
        body: { path: cwd, from: name, to: newName },
      });
      toast('Renamed', 'success');
      draw();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteEntry(name) {
    const ok = await confirmModal({
      title: 'Hapus',
      message: `Hapus "${name}"? Tindakan ini tidak bisa dibatalkan.`,
      okText: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/servers/${id}/files?path=${encodeURIComponent(relPath(name))}`, {
        method: 'DELETE',
      });
      toast('Dihapus', 'success');
      draw();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function buildMenuItems(entry) {
    const items = [];
    if (entry.isDir) {
      items.push({
        label: 'Open',
        icon: '📂',
        onClick: () => {
          cwd = cwd === '.' ? entry.name : `${cwd}/${entry.name}`;
          draw();
        },
      });
    } else {
      items.push({
        label: 'Edit',
        icon: '✏️',
        onClick: () => openEditor(entry.name),
      });
      items.push({
        label: 'Download',
        icon: '⬇️',
        onClick: () => downloadFile(entry.name),
      });
      if (entry.name.toLowerCase().endsWith('.zip')) {
        items.push({
          label: 'Unzip',
          icon: '📦',
          onClick: () => unzipFile(entry.name),
        });
      }
    }
    items.push({ separator: true });
    items.push({
      label: 'Rename',
      icon: '🔤',
      onClick: () => renameEntry(entry.name),
    });
    items.push({
      label: 'Delete',
      icon: '🗑️',
      danger: true,
      onClick: () => deleteEntry(entry.name),
    });
    return items;
  }

  async function draw() {
    const { entries } = await api(`/api/servers/${id}/files?path=${encodeURIComponent(cwd)}`);
    selected.clear();

    tabContent.innerHTML = `
      <div class="card">
        <div class="row" style="margin-bottom:8px; flex-wrap:wrap;">
          <input id="cwd" />
          <button id="up">..</button>
          <button id="mkfile">New File</button>
          <button id="mkfolder">New Folder</button>
          <input type="file" id="uploader" style="display:none" />
          <button id="uploadBtn" class="primary">Upload</button>
          <div class="grow"></div>
          <button id="zipBtn" title="Download file terpilih sebagai ZIP">📦 Zip Selected</button>
        </div>
        <table class="file-table">
          <thead>
            <tr>
              <th style="width:28px;"><input type="checkbox" id="selectAll" style="width:auto;"></th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified</th>
              <th>Mode</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody id="filesBody"></tbody>
        </table>
        <p class="muted" style="margin-top:8px; font-size:12px;">
          Klik kanan baris file untuk opsi (rename, unzip, download, delete).
        </p>
      </div>`;

    tabContent.querySelector('#cwd').value = cwd;
    const tbody = tabContent.querySelector('#filesBody');

    for (const e of entries) {
      const tr = document.createElement('tr');
      tr.dataset.name = e.name;

      const tdCheck = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.style.width = 'auto';
      cb.addEventListener('change', () => {
        if (cb.checked) { selected.add(e.name); tr.classList.add('row-selected'); }
        else { selected.delete(e.name); tr.classList.remove('row-selected'); }
      });
      tdCheck.appendChild(cb);

      const tdName = document.createElement('td');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = `${e.isDir ? '📁' : '📄'} ${e.name}`;
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (e.isDir) {
          cwd = cwd === '.' ? e.name : `${cwd}/${e.name}`;
          draw();
        } else {
          openEditor(e.name);
        }
      });
      tdName.appendChild(link);

      const tdSize = document.createElement('td');
      tdSize.textContent = e.isDir ? '—' : String(e.size);

      const tdMod = document.createElement('td');
      tdMod.textContent = new Date(e.modified).toLocaleString();

      const tdMode = document.createElement('td');
      tdMode.textContent = e.mode;

      const tdAct = document.createElement('td');
      tdAct.className = 'actions-cell';
      const dots = document.createElement('button');
      dots.className = 'dots-btn';
      dots.type = 'button';
      dots.textContent = '⋯';
      dots.title = 'Menu';
      dots.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const rect = dots.getBoundingClientRect();
        showContextMenu(
          { clientX: rect.right - 4, clientY: rect.bottom + 2 },
          buildMenuItems(e)
        );
      });
      tdAct.appendChild(dots);

      tr.addEventListener('contextmenu', (ev) => {
        if (ev.target.tagName === 'INPUT') return;
        ev.preventDefault();
        showContextMenu(ev, buildMenuItems(e));
      });

      tr.append(tdCheck, tdName, tdSize, tdMod, tdMode, tdAct);
      tbody.appendChild(tr);
    }

    const selectAll = tabContent.querySelector('#selectAll');
    selectAll.addEventListener('change', () => {
      tbody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        if (cb === selectAll) return;
        cb.checked = selectAll.checked;
        const tr = cb.closest('tr');
        const name = tr.dataset.name;
        if (selectAll.checked) { selected.add(name); tr.classList.add('row-selected'); }
        else { selected.delete(name); tr.classList.remove('row-selected'); }
      });
    });

    tabContent.querySelector('#zipBtn').addEventListener('click', () => {
      if (selected.size === 0) {
        toast('Pilih minimal 1 file/folder dulu', 'error');
        return;
      }
      const paths = [...selected].map((n) => (cwd === '.' ? n : `${cwd}/${n}`));
      downloadZip(paths);
    });

    tabContent.querySelector('#cwd').addEventListener('change', (e) => {
      cwd = e.target.value;
      draw();
    });
    tabContent.querySelector('#up').addEventListener('click', () => {
      cwd = cwd.split('/').slice(0, -1).join('/') || '.';
      draw();
    });
    tabContent.querySelector('#mkfile').addEventListener('click', async () => {
      const name = await promptModal({ title: 'File Baru', label: 'Nama file', okText: 'Buat' });
      if (!name) return;
      try {
        await api(`/api/servers/${id}/files/create`, {
          method: 'POST',
          body: { path: cwd, name, type: 'file' },
        });
        draw();
      } catch (err) { toast(err.message, 'error'); }
    });
    tabContent.querySelector('#mkfolder').addEventListener('click', async () => {
      const name = await promptModal({ title: 'Folder Baru', label: 'Nama folder', okText: 'Buat' });
      if (!name) return;
      try {
        await api(`/api/servers/${id}/files/create`, {
          method: 'POST',
          body: { path: cwd, name, type: 'folder' },
        });
        draw();
      } catch (err) { toast(err.message, 'error'); }
    });
    tabContent.querySelector('#uploadBtn').addEventListener('click', () =>
      tabContent.querySelector('#uploader').click()
    );
    tabContent.querySelector('#uploader').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('file', f);
      const csrf = (document.cookie.match(/(?:^|;\s*)gurita_csrf=([^;]+)/) || [])[1] || '';
      const res = await fetch(`/api/servers/${id}/files/upload`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: { 'x-csrf-token': decodeURIComponent(csrf) },
      });
      if (!res.ok) toast('Upload failed', 'error');
      else { toast('Uploaded', 'success'); draw(); }
    });
  }

  draw();
}

/* ---------- Resources ---------- */
async function renderResources() {
  const { stats } = await api(`/api/servers/${id}/resources`);
  tabContent.innerHTML = `
    <div class="card">
      <div class="cards">
        <div class="card"><div class="stat-label">Status</div><div class="stat">${stats.status}</div></div>
        <div class="card"><div class="stat-label">PID</div><div class="stat">${stats.pid || '—'}</div></div>
        <div class="card"><div class="stat-label">Memory</div><div class="stat">${stats.memoryBytes ? (stats.memoryBytes / 1048576).toFixed(1) + ' MB' : '—'}</div></div>
        <div class="card"><div class="stat-label">CPU</div><div class="stat">${stats.cpuPercent != null ? stats.cpuPercent + '%' : '—'}</div></div>
        <div class="card"><div class="stat-label">Disk</div><div class="stat">${stats.diskUsageBytes ? (stats.diskUsageBytes / 1048576).toFixed(1) + ' MB' : '—'}</div></div>
        <div class="card"><div class="stat-label">Cgroup</div><div class="stat">${stats.cgroupActive ? 'active' : 'unavailable'}</div></div>
      </div>
      <p class="muted">Limits: RAM ${stats.resourceLimits.memory} MB · CPU ${stats.resourceLimits.cpu}% · Disk ${stats.resourceLimits.disk} MB · PIDs ${stats.resourceLimits.pids}</p>
    </div>`;
}

/* ---------- Allocations ---------- */
async function renderAllocations() {
  async function draw() {
    const { allocations } = await api(`/api/servers/${id}/allocations`);
    tabContent.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0;">Port Allocations</h3>
        <p class="muted" style="margin-top:0;">
          Port yang di-assign ke server ini. Port pertama otomatis tersedia
          sebagai environment variable <code>PORT</code> saat server dijalankan.
        </p>
        <div class="row" style="margin-bottom:10px; flex-wrap:wrap;">
          <input id="allocPort" type="number" placeholder="Port (kosongkan untuk auto)" style="max-width:220px;" />
          <select id="allocProto" style="max-width:120px;">
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
          </select>
          <input id="allocNotes" placeholder="Catatan (opsional)" style="max-width:260px;" />
          <button id="allocAdd" class="primary">+ Tambah</button>
        </div>
        <div id="allocList"></div>
      </div>`;

    const list = tabContent.querySelector('#allocList');
    if (!allocations.length) {
      list.innerHTML = '<p class="muted">Belum ada port yang di-assign.</p>';
    } else {
      list.innerHTML = `
        <table>
          <thead><tr><th>IP</th><th>Port</th><th>Proto</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            ${allocations.map((a) => `
              <tr>
                <td>${a.ip}</td>
                <td><strong>${a.port}</strong></td>
                <td>${a.protocol}</td>
                <td>${a.notes || '—'}</td>
                <td><button data-del="${a.id}" class="danger">Hapus</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      list.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm('Hapus allocation ini?')) return;
          try {
            await api(`/api/servers/${id}/allocations/${b.dataset.del}`, { method: 'DELETE' });
            toast('Dihapus', 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      );
    }

    tabContent.querySelector('#allocAdd').addEventListener('click', async () => {
      const portVal = tabContent.querySelector('#allocPort').value.trim();
      const body = {
        protocol: tabContent.querySelector('#allocProto').value,
        notes: tabContent.querySelector('#allocNotes').value,
      };
      if (portVal) body.port = Number(portVal);
      else body.auto = true;
      try {
        await api(`/api/servers/${id}/allocations`, { method: 'POST', body });
        toast('Allocation ditambahkan', 'success');
        draw();
      } catch (e) { toast(e.message, 'error'); }
    });
  }
  draw();
}


/* ---------- Settings (read-only untuk user, kecuali admin) ---------- */
async function renderSettings() {
  const { server } = await api(`/api/servers/${id}`);
  const { user } = await api('/api/account/me');
  const isAdmin = user.role === 'admin';

  tabContent.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">Informasi Server</h3>
      <table style="max-width:720px;">
        <tbody>
          <tr><td class="muted" style="width:180px;">Nama</td><td>${escapeHtml(server.name)}</td></tr>
          <tr><td class="muted">Server ID</td><td><code>${escapeHtml(server.id)}</code></td></tr>
          <tr><td class="muted">Runtime</td><td>${escapeHtml(server.runtime)}</td></tr>
          <tr><td class="muted">Startup Command</td><td><code>${escapeHtml(server.startup)}</code></td></tr>
          <tr><td class="muted">Auto Restart</td><td>${server.autoRestart ? 'Ya' : 'Tidak'}</td></tr>
          <tr><td class="muted">RAM</td><td>${server.resources.memory} MB</td></tr>
          <tr><td class="muted">CPU</td><td>${server.resources.cpu}%</td></tr>
          <tr><td class="muted">Disk</td><td>${server.resources.disk} MB</td></tr>
          <tr><td class="muted">PIDs</td><td>${server.resources.pids}</td></tr>
          <tr><td class="muted">Status</td><td><span class="badge ${badgeClass(server.status)}">${escapeHtml(server.status)}</span></td></tr>
          <tr><td class="muted">Dibuat</td><td>${new Date(server.createdAt).toLocaleString()}</td></tr>
          <tr><td class="muted">Diperbarui</td><td>${new Date(server.updatedAt).toLocaleString()}</td></tr>
        </tbody>
      </table>
      <p class="muted" style="margin-top:14px; font-size:12px;">
        ${isAdmin
          ? 'Sebagai admin, Anda dapat mengubah konfigurasi server melalui <a href="/admin#servers">Admin → Server Management</a>.'
          : 'Ingin mengubah resource, startup command, atau nama server? Hubungi admin.'}
      </p>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">Dependencies</h3>
      <p class="muted" style="margin-top:0;">
        Jalankan <code>npm install</code> (atau pnpm/yarn/bun) di direktori server.
        Server harus dalam keadaan <strong>stopped</strong>.
      </p>
      <div class="row" style="flex-wrap:wrap;">
        <select id="pmSelect" style="max-width:160px;">
          <option value="npm">npm</option>
          <option value="pnpm">pnpm</option>
          <option value="yarn">yarn</option>
          <option value="bun">bun</option>
        </select>
        <button id="installBtn" class="primary">📦 Run install</button>
      </div>
      <pre id="installOutput" class="terminal" style="display:none; height:240px; margin-top:12px;"></pre>
    </div>
  `;

  tabContent.querySelector('#installBtn').addEventListener('click', async () => {
    const pm = tabContent.querySelector('#pmSelect').value;
    const btn = tabContent.querySelector('#installBtn');
    const out = tabContent.querySelector('#installOutput');
    out.style.display = 'block';
    out.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Installing…';
    try {
      const res = await api(`/api/servers/${id}/install`, {
        method: 'POST',
        body: { packageManager: pm },
      });
      out.textContent += `\n[exit ${res.exitCode}] install selesai.\n`;
      toast('Install selesai', 'success');
    } catch (e) {
      out.textContent += `\n[ERROR] ${e.message}\n`;
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📦 Run install';
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function badgeClass(status) {
  if (status === 'running') return 'green';
  if (status === 'crashed') return 'red';
  if (status === 'starting') return 'yellow';
  if (status === 'suspended') return 'red';
  return 'gray';
}

main.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => loadTab(b.dataset.tab))
);
main.querySelector('#startBtn').addEventListener('click', () =>
  api(`/api/servers/${id}/start`, { method: 'POST' })
    .then(() => toast('Started', 'success'))
    .catch((e) => toast(e.message, 'error'))
);
main.querySelector('#stopBtn').addEventListener('click', () =>
  api(`/api/servers/${id}/stop`, { method: 'POST' })
    .then(() => toast('Stopped', 'success'))
    .catch((e) => toast(e.message, 'error'))
);
main.querySelector('#restartBtn').addEventListener('click', () =>
  api(`/api/servers/${id}/restart`, { method: 'POST' })
    .then(() => toast('Restarted', 'success'))
    .catch((e) => toast(e.message, 'error'))
);
main.querySelector('#killBtn').addEventListener('click', () =>
  api(`/api/servers/${id}/kill`, { method: 'POST' })
    .then(() => toast('Killed', 'success'))
    .catch((e) => toast(e.message, 'error'))
);

refreshHeader();
loadTab('console');