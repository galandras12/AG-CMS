const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getStore } = require('../core/store');

const BCRYPT_COST = 12;
const store = getStore('users', { users: [] });

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function findByUsernameRaw(username) {
  const { users } = store.read();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function findByIdRaw(id) {
  const { users } = store.read();
  return users.find((u) => u.id === id);
}

async function list() {
  const { users } = store.read();
  return users.map(sanitize);
}

/**
 * A felhasznalonev-egyedisegi ellenorzes szandekosan a store.update()
 * mutator BELSEJEBEN tortenik, nem elotte - igy atomi a soro-sitott
 * iras-sorral egyutt, es ket egyidejű regisztracio nem hozhat letre
 * ket azonos felhasznalonevu fiokot.
 */
async function create({ username, password, role, displayName }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role,
    displayName: displayName || username,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await store.update((data) => {
    if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw Object.assign(new Error('A felhasznalonev mar foglalt.'), { status: 409 });
    }
    data.users.push(user);
    return data;
  });

  return sanitize(user);
}

async function verifyCredentials(username, password) {
  const user = findByUsernameRaw(username);
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return sanitize(user);
}

async function update(id, patch) {
  let updated = null;
  await store.update((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      throw Object.assign(new Error('Felhasznalo nem talalhato.'), { status: 404 });
    }
    if (patch.role) user.role = patch.role;
    if (typeof patch.displayName === 'string' && patch.displayName.trim()) user.displayName = patch.displayName.trim();
    if (typeof patch.active === 'boolean') user.active = patch.active;
    user.updatedAt = new Date().toISOString();
    updated = user;
    return data;
  });
  return sanitize(updated);
}

async function setPassword(id, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  let updated = null;
  await store.update((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      throw Object.assign(new Error('Felhasznalo nem talalhato.'), { status: 404 });
    }
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    updated = user;
    return data;
  });
  return sanitize(updated);
}

async function remove(id) {
  await store.update((data) => {
    const before = data.users.length;
    data.users = data.users.filter((u) => u.id !== id);
    if (data.users.length === before) {
      throw Object.assign(new Error('Felhasznalo nem talalhato.'), { status: 404 });
    }
    return data;
  });
}

function count() {
  return store.read().users.length;
}

/** Az admin szerepkoru felhasznalok szama, egy adott id kizarasaval. */
function countAdmins(excludeId) {
  return store.read().users.filter((u) => u.role === 'admin' && u.id !== excludeId).length;
}

module.exports = {
  list,
  create,
  verifyCredentials,
  update,
  setPassword,
  remove,
  count,
  countAdmins,
  findByIdRaw,
  sanitize,
};
