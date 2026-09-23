// public/js/contextMenu.js

let currentMenu = null;

export function closeContextMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }
}

/**
 * Tampilkan context menu.
 * @param {MouseEvent|{clientX,clientY}} ev
 * @param {Array<{label:string,icon?:string,danger?:boolean,onClick:Function}|{separator:true}>} items
 */
export function showContextMenu(ev, items) {
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'separator';
      menu.appendChild(sep);
      continue;
    }
    const row = document.createElement('div');
    row.className = 'item' + (item.danger ? ' danger' : '');
    row.innerHTML = `<span style="width:18px;display:inline-block">${item.icon || ''}</span><span>${item.label}</span>`;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      try { item.onClick(); } catch (err) { console.error(err); }
    });
    menu.appendChild(row);
  }

  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();

  let x = ev.clientX;
  let y = ev.clientY;

  if (x + rect.width > window.innerWidth - 8) {
    x = window.innerWidth - rect.width - 8;
  }
  if (y + rect.height > window.innerHeight - 8) {
    y = window.innerHeight - rect.height - 8;
  }
  if (x < 4) x = 4;
  if (y < 4) y = 4;

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.visibility = 'visible';

  currentMenu = menu;
}

document.addEventListener('click', (e) => {
  if (currentMenu && !currentMenu.contains(e.target)) closeContextMenu();
});
document.addEventListener('contextmenu', (e) => {
  if (currentMenu && !currentMenu.contains(e.target)) closeContextMenu();
});
window.addEventListener('scroll', closeContextMenu, true);
window.addEventListener('resize', closeContextMenu);
window.addEventListener('blur', closeContextMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContextMenu();
});

/** Helper modal input sederhana (untuk rename / new file / new folder) */
export function promptModal({ title, label = '', defaultValue = '', okText = 'OK' }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `
      <div class="modal-card">
        <h3></h3>
        ${label ? `<label></label>` : ''}
        <input type="text" id="modalInput" />
        <div class="row">
          <button id="modalCancel">Cancel</button>
          <button id="modalOk" class="primary"></button>
        </div>
      </div>`;
    back.querySelector('h3').textContent = title;
    if (label) back.querySelector('label').textContent = label;
    back.querySelector('#modalOk').textContent = okText;
    const input = back.querySelector('#modalInput');
    input.value = defaultValue;

    document.body.appendChild(back);
    input.focus();
    input.select();

    const done = (val) => { back.remove(); resolve(val); };
    back.querySelector('#modalOk').addEventListener('click', () => done(input.value.trim()));
    back.querySelector('#modalCancel').addEventListener('click', () => done(null));
    back.addEventListener('click', (e) => { if (e.target === back) done(null); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(input.value.trim());
      if (e.key === 'Escape') done(null);
    });
  });
}

export function confirmModal({ title, message, okText = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `
      <div class="modal-card">
        <h3></h3>
        <p class="muted" style="margin:8px 0 0;"></p>
        <div class="row">
          <button id="modalCancel">Cancel</button>
          <button id="modalOk" class="${danger ? 'danger' : 'primary'}"></button>
        </div>
      </div>`;
    back.querySelector('h3').textContent = title;
    back.querySelector('p').textContent = message || '';
    back.querySelector('#modalOk').textContent = okText;
    document.body.appendChild(back);

    const done = (val) => { back.remove(); resolve(val); };
    back.querySelector('#modalOk').addEventListener('click', () => done(true));
    back.querySelector('#modalCancel').addEventListener('click', () => done(false));
    back.addEventListener('click', (e) => { if (e.target === back) done(false); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); done(false); }
    });
  });
}