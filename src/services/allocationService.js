// src/services/allocationService.js
import { readJSON, insertOne, deleteOne, updateOne, generateId, writeJSON } from '../database/store.js';
import { assertInt, assertString } from '../utils/validation.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

const RESERVED = new Set([22, 80, 443, 3000, 3306, 5432, 6379, 8080, 8443, 27017]);

function validatePort(port) {
  const p = assertInt(port, 'port', { min: 1, max: 65535 });
  if (p < 1024) throw badRequest('Port di bawah 1024 tidak diizinkan (privileged)');
  if (RESERVED.has(p)) throw badRequest(`Port ${p} direservasi panel`);
  return p;
}

export async function listAllocations({ serverId = null, ownerId = null } = {}) {
  let all = await readJSON('allocations.json');
  if (!Array.isArray(all)) all = [];
  if (serverId) all = all.filter((a) => a.serverId === serverId);
  if (ownerId) all = all.filter((a) => a.ownerId === ownerId);
  return all;
}

export async function getAllocation(id) {
  const all = await readJSON('allocations.json');
  return all.find((a) => a.id === id) || null;
}

export async function findByPort(ip, port, protocol = 'tcp') {
  const all = await readJSON('allocations.json');
  return all.find((a) => a.ip === ip && a.port === port && a.protocol === protocol) || null;
}

export async function createAllocation({ serverId, ownerId, ip = '0.0.0.0', port, protocol = 'tcp', notes = '' }) {
  if (!serverId) throw badRequest('serverId wajib');
  if (!ownerId) throw badRequest('ownerId wajib');
  const p = validatePort(port);
  assertString(ip, 'ip', { min: 1, max: 64 });
  if (!['tcp', 'udp'].includes(protocol)) throw badRequest('protocol harus tcp/udp');

  const dup = await findByPort(ip, p, protocol);
  if (dup) throw conflict(`Port ${ip}:${p}/${protocol} sudah dipakai server ${dup.serverId}`);

  const now = new Date().toISOString();
  const alloc = {
    id: generateId('alc'),
    serverId,
    ownerId,
    ip,
    port: p,
    protocol,
    notes: String(notes || '').slice(0, 200),
    createdAt: now,
    updatedAt: now,
  };
  await insertOne('allocations.json', alloc);
  return alloc;
}

export async function deleteAllocation(id) {
  return deleteOne('allocations.json', (a) => a.id === id);
}

export async function deleteAllocationsForServer(serverId) {
  const all = await readJSON('allocations.json');
  const remaining = (all || []).filter((a) => a.serverId !== serverId);
  await writeJSON('allocations.json', remaining);
  return all.length - remaining.length;
}

export async function updateAllocation(id, patch) {
  const target = await getAllocation(id);
  if (!target) throw notFound('Allocation tidak ditemukan');
  const safe = {};
  if (patch.notes !== undefined) safe.notes = String(patch.notes).slice(0, 200);
  return updateOne('allocations.json', (a) => a.id === id, safe);
}

export async function findFreePort({ ip = '0.0.0.0', start = 20000, end = 40000, protocol = 'tcp' } = {}) {
  const all = await readJSON('allocations.json');
  const used = new Set((all || []).filter((a) => a.ip === ip && a.protocol === protocol).map((a) => a.port));
  for (let p = start; p <= end; p++) {
    if (!used.has(p) && !RESERVED.has(p)) return p;
  }
  throw conflict('Tidak ada port bebas di range yang ditentukan');
}