/**
 * Az admin oldalsav menupontjai. A beepitett elemek mellett pluginok is
 * regisztralhatnak uj menupontokat az 'admin:menu:register' hook-on
 * keresztul induláskor (lasd server.js es plugins/README.md).
 */
const DEFAULT_MENU = [
  { id: 'dashboard', label: 'nav.dashboard', icon: '🏠', order: 0 },
  { id: 'posts', label: 'nav.posts', icon: '📝', order: 10 },
  { id: 'media', label: 'nav.media', icon: '🖼️', order: 20 },
  { id: 'personalization', label: 'nav.personalization', icon: '🎨', order: 30 },
  { id: 'users', label: 'nav.users', icon: '👤', order: 40, roles: ['admin'] },
];

let extraItems = [];

function registerMenuItem(item) {
  if (!item || !item.id || !item.label) {
    throw new Error('A menupont regisztralasahoz "id" es "label" mezo kotelezo.');
  }
  extraItems.push({ order: 100, ...item });
}

function getMenu() {
  return [...DEFAULT_MENU, ...extraItems].sort((a, b) => a.order - b.order);
}

function reset() {
  extraItems = [];
}

module.exports = { registerMenuItem, getMenu, reset, DEFAULT_MENU };
