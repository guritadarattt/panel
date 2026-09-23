// src/process/cgroupManager.js
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

const CGROUP_ROOT = config.cgroups.root;
const V2_MARKER = '/sys/fs/cgroup/cgroup.controllers';

export function cgroupsAvailable() {
  try {
    return fsSync.existsSync(V2_MARKER);
  } catch {
    return false;
  }
}

export async function ensureCgroupRoot() {
  if (!config.cgroups.enabled || !cgroupsAvailable()) return false;
  try {
    await fs.mkdir(CGROUP_ROOT, { recursive: true });
    return true;
  } catch (e) {
    logger.warn('Cannot create cgroup root', { err: e.message });
    return false;
  }
}

export async function createCgroup(serverId, resources) {
  if (!config.cgroups.enabled || !cgroupsAvailable()) {
    return { active: false, reason: 'cgroups_unavailable' };
  }
  try {
    await ensureCgroupRoot();
    const cg = path.join(CGROUP_ROOT, serverId);
    await fs.mkdir(cg, { recursive: true });

    const applied = {};

    // memory.max in bytes
    if (resources.memory) {
      const bytes = Math.max(64, Number(resources.memory)) * 1024 * 1024;
      await fs.writeFile(path.join(cg, 'memory.max'), String(bytes)).catch(() => {});
      applied.memory = bytes;
    }

    // cpu.max: "<quota> <period>" microseconds. period = 100000 (100ms).
    if (resources.cpu) {
      const period = 100000;
      // cpu = percent of one core (100 => 1 core)
      const quota = Math.max(1000, Math.floor((Number(resources.cpu) / 100) * period));
      await fs.writeFile(path.join(cg, 'cpu.max'), `${quota} ${period}`).catch(() => {});
      applied.cpu = { quota, period };
    }

    // pids.max
    if (resources.pids) {
      await fs.writeFile(path.join(cg, 'pids.max'), String(Number(resources.pids))).catch(() => {});
      applied.pids = Number(resources.pids);
    }

    return { active: true, path: cg, applied };
  } catch (e) {
    logger.warn('createCgroup failed', { err: e.message });
    return { active: false, reason: e.message };
  }
}

export async function attachPid(serverId, pid) {
  if (!config.cgroups.enabled || !cgroupsAvailable()) return false;
  try {
    const cg = path.join(CGROUP_ROOT, serverId);
    await fs.writeFile(path.join(cg, 'cgroup.procs'), String(pid));
    return true;
  } catch (e) {
    logger.warn('attachPid failed', { err: e.message });
    return false;
  }
}

export async function removeCgroup(serverId) {
  if (!config.cgroups.enabled || !cgroupsAvailable()) return;
  const cg = path.join(CGROUP_ROOT, serverId);
  try {
    await fs.rmdir(cg);
  } catch {
    /* ignore */
  }
}

export async function readCgroupStats(serverId) {
  if (!config.cgroups.enabled || !cgroupsAvailable()) {
    return { available: false };
  }
  const cg = path.join(CGROUP_ROOT, serverId);
  const out = { available: true, path: cg };
  try {
    const memCurrent = await fs.readFile(path.join(cg, 'memory.current'), 'utf8').catch(() => null);
    if (memCurrent) out.memoryBytes = Number(memCurrent.trim());
    const cpuStat = await fs.readFile(path.join(cg, 'cpu.stat'), 'utf8').catch(() => null);
    if (cpuStat) {
      out.cpu = {};
      for (const line of cpuStat.split('\n')) {
        const [k, v] = line.trim().split(/\s+/);
        if (k) out.cpu[k] = Number(v);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}