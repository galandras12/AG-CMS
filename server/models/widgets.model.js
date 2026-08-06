const crypto = require('crypto');
const { getStore } = require('../core/store');
const hooks = require('../core/hooks');

const store = getStore('widgets', { items: [] });
const VALID_TYPES = ['text', 'recentPosts', 'socialLinks'];
const VALID_REGIONS = ['sidebar', 'footer'];

async function list() {
  return store.read().items.slice().sort((a, b) => a.order - b.order);
}

async function create({ type, title, config, region }) {
  let item = null;
  await store.update((data) => {
    const siblings = data.items.filter((w) => w.region === (region || 'sidebar'));
    const maxOrder = siblings.reduce((max, w) => Math.max(max, w.order), -1);
    item = {
      id: crypto.randomUUID(),
      type,
      title: title || '',
      config: config || {},
      region: region || 'sidebar',
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };
    data.items.push(item);
    return data;
  });
  await hooks.trigger('widgets:afterChange', { action: 'create', widget: item });
  return item;
}

async function update(id, patch) {
  let updated = null;
  await store.update((data) => {
    const item = data.items.find((w) => w.id === id);
    if (!item) {
      throw Object.assign(new Error('Widget nem talalhato.'), { status: 404 });
    }
    if (typeof patch.title === 'string') item.title = patch.title;
    if (patch.config) item.config = patch.config;
    if (patch.region && VALID_REGIONS.includes(patch.region)) item.region = patch.region;
    updated = item;
    return data;
  });
  await hooks.trigger('widgets:afterChange', { action: 'update', widget: updated });
  return updated;
}

async function reorder(order) {
  await store.update((data) => {
    order.forEach((id, index) => {
      const item = data.items.find((w) => w.id === id);
      if (item) item.order = index;
    });
    return data;
  });
  const items = await list();
  await hooks.trigger('widgets:afterChange', { action: 'reorder', widgets: items });
  return items;
}

async function remove(id) {
  await store.update((data) => {
    const before = data.items.length;
    data.items = data.items.filter((w) => w.id !== id);
    if (data.items.length === before) {
      throw Object.assign(new Error('Widget nem talalhato.'), { status: 404 });
    }
    return data;
  });
  await hooks.trigger('widgets:afterChange', { action: 'remove', id });
}

module.exports = { list, create, update, reorder, remove, VALID_TYPES, VALID_REGIONS };
