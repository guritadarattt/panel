// src/services/settingsService.js
import { readJSON, updateJSON } from '../database/store.js';

const DEFAULTS = {
  panelName: 'Gurita Panel',
  logoDataUrl: null,
  activeTheme: 'default',
  allowRegistration: false,
  suspendedMessage: 'Server ini sedang disuspend oleh admin.',

  // Background
  backgroundUrl: null,
  backgroundType: null,       // 'image' | 'video'
  backgroundOpacity: 1,       // 0.1 - 1.0
  backgroundBlur: 0,          // px
  backgroundUpdatedAt: null,

  // Music player
  musicEnabled: true,
  musicAutoplay: false,
  musicLoop: true,
  musicVolume: 0.5,
  musicShowOnLogin: false,

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function getSettings() {
  const s = await readJSON('settings.json');
  return { ...DEFAULTS, ...(s || {}) };
}

export async function updateSettings(patch) {
  return updateJSON('settings.json', (s) => ({
    ...DEFAULTS,
    ...(s || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  }));
}