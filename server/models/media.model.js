const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getStore } = require('../core/store');
const hooks = require('../core/hooks');
const config = require('../config');

const store = getStore('media', { items: [] });

function ensureMediaDir() {
  fs.mkdirSync(config.mediaDir, { recursive: true });
}

async function list() {
  return store.read().items.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

function findByIdRaw(id) {
  return store.read().items.find((m) => m.id === id) || null;
}

async function registerUpload({ originalName, mimeType, size, storedFilename, uploadedBy, altText }) {
  const item = {
    id: crypto.randomUUID(),
    filename: storedFilename,
    url: `/media/${storedFilename}`,
    originalName,
    mimeType,
    size,
    altText: altText || '',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };

  await store.update((data) => {
    data.items.push(item);
    return data;
  });

  await hooks.trigger('media:afterUpload', item);
  return item;
}

async function updateAltText(id, altText) {
  let updated = null;
  await store.update((data) => {
    const item = data.items.find((m) => m.id === id);
    if (!item) {
      throw Object.assign(new Error('Mediafajl nem talalhato.'), { status: 404 });
    }
    item.altText = altText || '';
    updated = item;
    return data;
  });
  return updated;
}

async function remove(id) {
  const existing = findByIdRaw(id);
  if (!existing) {
    throw Object.assign(new Error('Mediafajl nem talalhato.'), { status: 404 });
  }

  await store.update((data) => {
    const before = data.items.length;
    data.items = data.items.filter((m) => m.id !== id);
    if (data.items.length === before) {
      throw Object.assign(new Error('Mediafajl nem talalhato.'), { status: 404 });
    }
    return data;
  });

  fs.rm(path.join(config.mediaDir, existing.filename), { force: true }, () => {});
}

module.exports = { list, findByIdRaw, registerUpload, updateAltText, remove, ensureMediaDir };
