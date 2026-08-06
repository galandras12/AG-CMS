const { getStore } = require('../core/store');

/**
 * Az admin fooldal (dashboard) blokkjai. A "system" blokk mindig az elso,
 * es nem mozgathato/rejtheto el - lasd a specifikaciot: az AG-CMS neve,
 * verzioszama, frissites datuma es egy rövid changelog itt jelenik meg.
 */
const FIXED_BLOCK = 'system';
const DEFAULT_BLOCKS = ['system', 'recentPosts', 'quickActions', 'userSummary', 'mediaSummary'];

const store = getStore('dashboardLayouts', { layouts: {} });

function getLayout(userId) {
  const { layouts } = store.read();
  const saved = layouts[userId];
  if (!saved) {
    return { order: DEFAULT_BLOCKS.slice(), hidden: [] };
  }
  // Ha kesobb uj blokktipus kerul a keszletbe, automatikusan a vegere kerul a mentett sorrendben.
  const order = [...saved.order.filter((b) => DEFAULT_BLOCKS.includes(b)), ...DEFAULT_BLOCKS.filter((b) => !saved.order.includes(b))];
  return { order, hidden: (saved.hidden || []).filter((b) => b !== FIXED_BLOCK) };
}

async function saveLayout(userId, { order, hidden }) {
  const sanitizedOrder = [
    FIXED_BLOCK,
    ...order.filter((b) => b !== FIXED_BLOCK && DEFAULT_BLOCKS.includes(b)),
  ];
  for (const block of DEFAULT_BLOCKS) {
    if (!sanitizedOrder.includes(block)) sanitizedOrder.push(block);
  }
  const sanitizedHidden = (hidden || []).filter((b) => b !== FIXED_BLOCK && DEFAULT_BLOCKS.includes(b));

  await store.update((data) => {
    data.layouts[userId] = { order: sanitizedOrder, hidden: sanitizedHidden };
    return data;
  });

  return getLayout(userId);
}

module.exports = { getLayout, saveLayout, DEFAULT_BLOCKS, FIXED_BLOCK };
