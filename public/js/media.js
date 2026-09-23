// public/js/media.js
/* Background loader + mini music player global */

(async function initMedia() {
  try {
    const res = await fetch('/api/media/appearance', { credentials: 'same-origin' });
    if (!res.ok) return;
    const cfg = await res.json();

    if (cfg.backgroundUrl) applyBackground(cfg);

    if (cfg.musicEnabled) {
      const isLogin = location.pathname === '/' || location.pathname === '/login';
      if (!isLogin || cfg.musicShowOnLogin) {
        await initMiniPlayer(cfg);
      }
    }
  } catch {
    /* silent */
  }
})();

/* =========================================================
   BACKGROUND
========================================================= */
function applyBackground(cfg) {
  let bg = document.getElementById('gurita-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'gurita-bg';
    bg.style.cssText = `
      position: fixed; inset: 0; z-index: -2;
      pointer-events: none;
      overflow: hidden;
    `;
    document.body.prepend(bg);
  }

  const url = cfg.backgroundUrl + '?t=' + (cfg.backgroundUpdatedAt || Date.now());
  const opacity = typeof cfg.backgroundOpacity === 'number' ? cfg.backgroundOpacity : 1;
  const blur = typeof cfg.backgroundBlur === 'number' ? cfg.backgroundBlur : 0;
  const filter = blur > 0 ? `blur(${blur}px)` : 'none';

  if (cfg.backgroundType === 'video') {
    bg.innerHTML = `
      <video autoplay muted loop playsinline
        style="width:100%; height:100%; object-fit:cover; opacity:${opacity}; filter:${filter};">
        <source src="${url}" />
      </video>
    `;
  } else {
    bg.innerHTML = `
      <div style="
        width:100%; height:100%;
        background-image: url('${url}');
        background-size: cover;
        background-position: center;
        opacity:${opacity};
        filter:${filter};
      "></div>
    `;
  }

  let overlay = document.getElementById('gurita-bg-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gurita-bg-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: -1;
      pointer-events: none;
      background: rgba(10, 12, 18, 0.55);
    `;
    document.body.prepend(overlay);
  }
}

/* =========================================================
   MINI MUSIC PLAYER
========================================================= */

// SVG icons (inline, tidak butuh font eksternal)
const ICONS = {
  music: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`,
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`,
  prev: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6l-9 6 9 6z"/></svg>`,
  next: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l9 6-9 6z"/></svg>`,
  volume: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>`,
  muted: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z" opacity="0.3"/></svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"/></svg>`,
};

const PLAYER_POS_KEY = 'gurita_music_pos_v2';
const PLAYER_STATE_KEY = 'gurita_music_state_v2';
const PLAYER_SIZE = 56; // ukuran collapsed (px)

async function initMiniPlayer(cfg) {
  let playlistRes;
  try {
    playlistRes = await fetch('/api/media/playlist', { credentials: 'same-origin' });
  } catch { return; }
  if (!playlistRes.ok) return;

  const { tracks } = await playlistRes.json();
  if (!tracks || tracks.length === 0) return;

  // ---- Bangun DOM ----
  const root = document.createElement('div');
  root.id = 'gurita-mp';
  root.innerHTML = `
    <audio id="gmp-audio"></audio>

    <!-- Collapsed icon -->
    <button id="gmp-icon" title="Music player">
      ${ICONS.music}
      <span id="gmp-badge" class="gmp-badge" style="display:none;"></span>
    </button>

    <!-- Expanded panel -->
    <div id="gmp-panel" class="gmp-panel" style="display:none;">
      <div id="gmp-drag-handle" class="gmp-drag">
        <span class="gmp-grip">⋮⋮</span>
      </div>
      <div class="gmp-body">
        <div class="gmp-title" id="gmp-title">—</div>
        <div class="gmp-sub" id="gmp-sub">0 / ${tracks.length}</div>
        <div class="gmp-controls">
          <button class="gmp-btn" id="gmp-prev" title="Sebelumnya">${ICONS.prev}</button>
          <button class="gmp-btn gmp-btn-main" id="gmp-toggle" title="Play">${ICONS.play}</button>
          <button class="gmp-btn" id="gmp-next" title="Berikutnya">${ICONS.next}</button>
          <button class="gmp-btn" id="gmp-mute" title="Volume">${ICONS.volume}</button>
          <button class="gmp-btn gmp-btn-close" id="gmp-close" title="Tutup">${ICONS.close}</button>
        </div>
        <div class="gmp-vol-wrap">
          <input type="range" id="gmp-vol" min="0" max="100" step="1" />
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ---- CSS ----
  if (!document.getElementById('gurita-mp-style')) {
    const style = document.createElement('style');
    style.id = 'gurita-mp-style';
    style.textContent = `
      #gurita-mp {
        position: fixed;
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
        user-select: none;
        touch-action: none;
      }
      #gurita-mp * { box-sizing: border-box; }

      /* ---- Collapsed icon ---- */
      #gmp-icon {
        width: ${PLAYER_SIZE}px; height: ${PLAYER_SIZE}px;
        border-radius: 50%;
        background: rgba(20, 25, 35, 0.92);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(124, 92, 255, 0.4);
        color: #e6e8ee;
        cursor: grab;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        transition: transform 0.15s, border-color 0.15s;
        position: relative;
      }
      #gmp-icon:hover {
        transform: scale(1.06);
        border-color: #7c5cff;
      }
      #gmp-icon:active { cursor: grabbing; transform: scale(0.98); }

      #gmp-badge {
        position: absolute;
        bottom: 2px; right: 2px;
        width: 8px; height: 8px;
        border-radius: 50%;
        background: #22c55e;
        border: 2px solid rgba(20, 25, 35, 0.92);
      }

      /* ---- Expanded panel ---- */
      .gmp-panel {
        width: 260px;
        background: rgba(20, 25, 35, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        color: #e6e8ee;
        overflow: hidden;
      }

      .gmp-drag {
        height: 18px;
        display: flex; align-items: center; justify-content: center;
        cursor: grab;
        background: rgba(124, 92, 255, 0.15);
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .gmp-drag:active { cursor: grabbing; }
      .gmp-grip {
        font-size: 10px;
        letter-spacing: -2px;
        color: rgba(230, 232, 238, 0.4);
        line-height: 1;
      }

      .gmp-body { padding: 10px 12px 12px; }

      .gmp-title {
        font-size: 13px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      .gmp-sub {
        font-size: 11px; color: #8a93a6;
        margin-bottom: 8px;
      }

      .gmp-controls {
        display: flex; align-items: center; justify-content: center;
        gap: 4px;
        margin-bottom: 6px;
      }
      .gmp-btn {
        background: transparent;
        border: none;
        color: #e6e8ee;
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.1s, color 0.1s;
      }
      .gmp-btn:hover { background: rgba(255,255,255,0.08); }
      .gmp-btn-main {
        background: #7c5cff;
        color: #fff;
        width: 34px; height: 34px;
        border-radius: 50%;
      }
      .gmp-btn-main:hover { background: #8d6eff; }
      .gmp-btn-close { color: #8a93a6; }
      .gmp-btn-close:hover { color: #ef4444; }

      .gmp-vol-wrap { padding: 2px 4px; }
      .gmp-vol-wrap input[type=range] {
        width: 100%;
        accent-color: #7c5cff;
        cursor: pointer;
      }

      @media (max-width: 480px) {
        .gmp-panel { width: 220px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ---- Referensi elemen ----
  const audio = root.querySelector('#gmp-audio');
  const icon = root.querySelector('#gmp-icon');
  const panel = root.querySelector('#gmp-panel');
  const dragHandle = root.querySelector('#gmp-drag-handle');
  const btnToggle = root.querySelector('#gmp-toggle');
  const btnPrev = root.querySelector('#gmp-prev');
  const btnNext = root.querySelector('#gmp-next');
  const btnMute = root.querySelector('#gmp-mute');
  const btnClose = root.querySelector('#gmp-close');
  const volSlider = root.querySelector('#gmp-vol');
  const titleEl = root.querySelector('#gmp-title');
  const subEl = root.querySelector('#gmp-sub');
  const badge = root.querySelector('#gmp-badge');

  // ---- State ----
  let idx = 0;
  let expanded = false;
  let wasPlaying = false;
  audio.volume = typeof cfg.musicVolume === 'number' ? cfg.musicVolume : 0.5;
  volSlider.value = Math.round(audio.volume * 100);

  /* =========================================================
     POSISI
  ========================================================= */
  function savePos(x, y) {
    localStorage.setItem(PLAYER_POS_KEY, JSON.stringify({ x, y }));
  }
  function loadPos() {
    try {
      const raw = localStorage.getItem(PLAYER_POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        // Validasi masih dalam viewport
        const maxX = window.innerWidth - PLAYER_SIZE - 8;
        const maxY = window.innerHeight - PLAYER_SIZE - 8;
        return {
          x: Math.max(8, Math.min(maxX, p.x)),
          y: Math.max(8, Math.min(maxY, p.y)),
        };
      }
    } catch {}
    return null;
  }
  function setPos(x, y) {
    root.style.left = x + 'px';
    root.style.top = y + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  }

  // Posisi awal: default kanan bawah
  const saved = loadPos();
  if (saved) {
    setPos(saved.x, saved.y);
  } else {
    const x = window.innerWidth - PLAYER_SIZE - 20;
    const y = window.innerHeight - PLAYER_SIZE - 20;
    setPos(x, y);
  }

  /* =========================================================
     DRAG
  ========================================================= */
  let dragging = false;
  let dragMoved = false;
  let dragStart = { x: 0, y: 0 };
  let elemStart = { x: 0, y: 0 };

  function startDrag(e) {
    // Jangan drag kalau klik tombol di dalam panel
    if (e.target.closest('button') && expanded) return;
    if (e.target.closest('input')) return;

    dragging = true;
    dragMoved = false;
    const point = getPoint(e);
    dragStart = point;
    const rect = root.getBoundingClientRect();
    elemStart = { x: rect.left, y: rect.top };
    e.preventDefault();
  }

  function moveDrag(e) {
    if (!dragging) return;
    const point = getPoint(e);
    const dx = point.x - dragStart.x;
    const dy = point.y - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;

    let nx = elemStart.x + dx;
    let ny = elemStart.y + dy;

    // Batasi dalam viewport
    const rect = root.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 4;
    const maxY = window.innerHeight - rect.height - 4;
    nx = Math.max(4, Math.min(maxX, nx));
    ny = Math.max(4, Math.min(maxY, ny));

    setPos(nx, ny);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (dragMoved) {
      const rect = root.getBoundingClientRect();
      savePos(rect.left, rect.top);
    } else {
      // Dianggap klik, bukan drag → toggle expand
      toggleExpand();
    }
  }

  function getPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  // Ikon = handle drag (collapsed)
  icon.addEventListener('mousedown', startDrag);
  icon.addEventListener('touchstart', startDrag, { passive: false });
  // Grip di panel = handle drag (expanded)
  dragHandle.addEventListener('mousedown', startDrag);
  dragHandle.addEventListener('touchstart', startDrag, { passive: false });

  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('touchmove', moveDrag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  /* =========================================================
     EXPAND / COLLAPSE
  ========================================================= */
  function toggleExpand() {
    expanded = !expanded;

    if (expanded) {
      // Cari posisi panel supaya tidak keluar viewport
      icon.style.display = 'none';
      panel.style.display = 'block';

      // Recalculate posisi: kalau mentok kanan, geser kiri
      const rect = panel.getBoundingClientRect();
      let x = parseFloat(root.style.left) || 0;
      let y = parseFloat(root.style.top) || 0;

      if (x + rect.width > window.innerWidth - 8) {
        x = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight - 8) {
        y = window.innerHeight - rect.height - 8;
      }
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      setPos(x, y);
    } else {
      panel.style.display = 'none';
      icon.style.display = 'flex';

      // Recalculate posisi icon
      const rect = icon.getBoundingClientRect();
      let x = parseFloat(root.style.left) || 0;
      let y = parseFloat(root.style.top) || 0;
      if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
      if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      setPos(x, y);
      savePos(x, y);
    }
  }

  // Klik ikon (bukan drag) → expand
  // (Sudah dihandle endDrag: kalau tidak drag → toggleExpand)

  /* =========================================================
     AUDIO
  ========================================================= */
  function loadTrack(i, { autoplay = false } = {}) {
    idx = ((i % tracks.length) + tracks.length) % tracks.length;
    const t = tracks[idx];
    audio.src = t.url;
    titleEl.textContent = t.title;
    subEl.textContent = `${idx + 1} / ${tracks.length}`;
    if (autoplay) play();
  }

  function updatePlayIcon() {
    if (audio.paused) {
      btnToggle.innerHTML = ICONS.play;
      btnToggle.title = 'Play';
      badge.style.display = 'none';
    } else {
      btnToggle.innerHTML = ICONS.pause;
      btnToggle.title = 'Pause';
      badge.style.display = 'block';
    }
  }

  function play() {
    audio.play().then(() => {
      updatePlayIcon();
    }).catch(() => {
      updatePlayIcon();
    });
  }
  function pause() {
    audio.pause();
    updatePlayIcon();
  }

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) play(); else pause();
  });

  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    loadTrack(idx - 1, { autoplay: !audio.paused });
  });

  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    loadTrack(idx + 1, { autoplay: !audio.paused });
  });

  let lastVolume = audio.volume;
  btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
      volSlider.value = 0;
      btnMute.innerHTML = ICONS.muted;
    } else {
      audio.volume = lastVolume || 0.5;
      volSlider.value = Math.round(audio.volume * 100);
      btnMute.innerHTML = ICONS.volume;
    }
  });

  volSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    audio.volume = Number(volSlider.value) / 100;
    if (audio.volume > 0) btnMute.innerHTML = ICONS.volume;
    else btnMute.innerHTML = ICONS.muted;
    // Simpan preferensi volume
    try {
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify({
        volume: audio.volume,
        idx,
      }));
    } catch {}
  });

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    pause();
    root.style.display = 'none';
    localStorage.setItem('gurita_music_hidden_v2', '1');
  });

  audio.addEventListener('ended', () => {
    if (cfg.musicLoop || idx < tracks.length - 1) {
      loadTrack(idx + 1, { autoplay: true });
    } else {
      updatePlayIcon();
    }
  });

  audio.addEventListener('error', () => {
    if (tracks.length > 1) {
      loadTrack(idx + 1, { autoplay: !audio.paused });
    }
  });

  audio.addEventListener('play', updatePlayIcon);
  audio.addEventListener('pause', updatePlayIcon);

  /* =========================================================
     RESTORE
  ========================================================= */
  if (localStorage.getItem('gurita_music_hidden_v2') === '1') {
    root.style.display = 'none';
  }

  try {
    const st = JSON.parse(localStorage.getItem(PLAYER_STATE_KEY) || '{}');
    if (typeof st.volume === 'number') {
      audio.volume = st.volume;
      volSlider.value = Math.round(st.volume * 100);
    }
    if (typeof st.idx === 'number' && st.idx >= 0 && st.idx < tracks.length) {
      loadTrack(st.idx);
    } else {
      loadTrack(0);
    }
  } catch {
    loadTrack(0);
  }

  updatePlayIcon();

  // Autoplay (browser kemungkinan blokir, itu normal)
  if (cfg.musicAutoplay) {
    play();
  }
}