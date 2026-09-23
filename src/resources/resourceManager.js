// src/resources/resourceManager.js
import si from 'systeminformation';
import fs from 'node:fs/promises';
import { readCgroupStats } from '../process/cgroupManager.js';
import { getRuntimeIfExists } from '../process/processManager.js';

export async function hostStats() {
  const [cpu, mem, fsSize, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time(),
  ]);
  const disk = fsSize.find((d) => d.mount === '/') || fsSize[0] || null;
  return {
    cpu: { usagePercent: Number(cpu.currentLoad.toFixed(2)) },
    memory: {
      total: mem.total,
      used: mem.active,
      free: mem.available,
      usagePercent: Number(((mem.active / mem.total) * 100).toFixed(2)),
    },
    disk: disk
      ? {
          total: disk.size,
          used: disk.used,
          free: disk.available,
          usagePercent: Number(disk.use.toFixed(2)),
          mount: disk.mount,
        }
      : null,
    uptime: time.uptime,
  };
}

export async function serverStats(serverId, { pid = null, resources = {} } = {}) {
  const rt = getRuntimeIfExists(serverId);
  const realPid = pid || rt?.pid || null;

  // cgroup stats
  const cg = await readCgroupStats(serverId);

  let memoryBytes = cg.memoryBytes ?? null;
  let cpuPercent = null;
  let diskUsageBytes = null;

  if (memoryBytes === null && realPid) {
    try {
      const status = await fs.readFile(`/proc/${realPid}/status`, 'utf8');
      const m = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (m) memoryBytes = Number(m[1]) * 1024;
    } catch {
      memoryBytes = null;
    }
  }

  if (realPid) {
    try {
      const stat = await fs.readFile(`/proc/${realPid}/stat`, 'utf8');
      // fields: pid comm state ppid ... utime stime ...
      const parts = stat.split(' ');
      const utime = Number(parts[13]);
      const stime = Number(parts[14]);
      const totalTicks = utime + stime;
      const hz = 100; // usually 100 on Linux
      const uptimeMs = rt?.startedAt ? Date.now() - rt.startedAt : null;
      if (uptimeMs && uptimeMs > 0) {
        cpuPercent = Number(((totalTicks / hz) * 1000 / uptimeMs * 100).toFixed(2));
      }
    } catch {
      cpuPercent = null;
    }
  }

  // Disk usage of server dir
  try {
    const { config } = await import('../config/index.js');
    const { default: path } = await import('node:path');
    const dir = path.join(config.paths.serverRoot, serverId);
    diskUsageBytes = await dirSize(dir);
  } catch {
    diskUsageBytes = null;
  }

  return {
    serverId,
    pid: realPid,
    status: rt?.status || 'stopped',
    memoryBytes,
    cpuPercent,
    diskUsageBytes,
    cgroup: cg,
    resourceLimits: resources,
    cgroupActive: cg.available && !!cg.memoryBytes,
  };
}

async function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = cur + '/' + e.name;
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        try {
          const s = await fs.stat(p);
          total += s.size;
        } catch {}
      }
    }
  }
  return total;
}