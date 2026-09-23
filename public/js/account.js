// public/js/account.js
import { mountShell } from '/js/shell.js';
import { api, toast } from '/js/api.js';

const { user, main } = await mountShell({ active: 'account' });

function fill(u) {
  const q = (id) => main.querySelector(id);
  q('#userId').value = u.id;
  q('#userRole').value = u.role;
  q('#username').value = u.username;
  q('#email').value = u.email;

  q('#infoStatus').textContent = u.status;
  q('#infoCreated').textContent = new Date(u.createdAt).toLocaleString();
  q('#infoUpdated').textContent = new Date(u.updatedAt).toLocaleString();
  const lim = u.resourceLimits || {};
  q('#infoMaxServers').textContent = lim.maxServers ?? '—';
  q('#infoMaxRam').textContent = (lim.maxRam ?? '—') + ' MB';
  q('#infoMaxCpu').textContent = (lim.maxCpu ?? '—') + '%';
  q('#infoMaxDisk').textContent = (lim.maxDisk ?? '—') + ' MB';
}

async function refresh() {
  const { user: u } = await api('/api/account/me');
  fill(u);
}

await refresh();

/* ---------- Simpan profil ---------- */
main.querySelector('#saveProfile').addEventListener('click', async () => {
  const username = main.querySelector('#username').value.trim();
  const email = main.querySelector('#email').value.trim();
  if (!username) return toast('Username wajib diisi', 'error');
  if (!email) return toast('Email wajib diisi', 'error');

  const btn = main.querySelector('#saveProfile');
  btn.disabled = true;
  btn.textContent = 'Menyimpan…';
  try {
    await api('/api/account/profile', {
      method: 'PATCH',
      body: { username, email },
    });
    toast('Profil diperbarui', 'success');
    await refresh();
    // Refresh sidebar (username baru)
    setTimeout(() => location.reload(), 600);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Perubahan';
  }
});

/* ---------- Ubah password ---------- */
main.querySelector('#savePassword').addEventListener('click', async () => {
  const currentPassword = main.querySelector('#currentPassword').value;
  const newPassword = main.querySelector('#newPassword').value;
  const confirmPassword = main.querySelector('#confirmPassword').value;

  if (!currentPassword) return toast('Password saat ini wajib diisi', 'error');
  if (!newPassword || newPassword.length < 8) return toast('Password baru min 8 karakter', 'error');
  if (newPassword !== confirmPassword) return toast('Konfirmasi tidak cocok', 'error');

  const btn = main.querySelector('#savePassword');
  btn.disabled = true;
  btn.textContent = 'Mengubah…';
  try {
    await api('/api/account/password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword },
    });
    toast('Password diubah', 'success');
    main.querySelector('#currentPassword').value = '';
    main.querySelector('#newPassword').value = '';
    main.querySelector('#confirmPassword').value = '';
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ubah Password';
  }
});