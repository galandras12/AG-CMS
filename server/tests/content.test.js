const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-content-test-'));
process.env.AGCMS_DATA_DIR_OVERRIDE = tmpDataDir;
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../app');
const usersModel = require('../models/users.model');

async function withServer(fn) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function extractCookie(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  return raw.split(';')[0];
}

async function loginAs(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return extractCookie(res);
}

test('posts CRUD: editor can create/update/delete, invalid status is rejected', async () => {
  await usersModel.create({ username: 'writer', password: 'password-writer', role: 'editor' });

  await withServer(async (baseUrl) => {
    const cookie = await loginAs(baseUrl, 'writer', 'password-writer');

    const createRes = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Első bejegyzés', contentMarkdown: '# Szia' }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).post;
    assert.equal(created.status, 'draft');
    assert.equal(created.slug, 'elso-bejegyzes');

    const badStatusRes = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'X', status: 'not-a-status' }),
    });
    assert.equal(badStatusRes.status, 400);

    const updateRes = await fetch(`${baseUrl}/api/posts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ status: 'published' }),
    });
    assert.equal(updateRes.status, 200);
    assert.equal((await updateRes.json()).post.effectiveStatus, 'published');

    const listRes = await fetch(`${baseUrl}/api/posts?status=published`, { headers: { Cookie: cookie } });
    const { posts } = await listRes.json();
    assert.ok(posts.some((p) => p.id === created.id));

    const deleteRes = await fetch(`${baseUrl}/api/posts/${created.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });
});

test('duplicate post titles get a unique slug appended', async () => {
  await usersModel.create({ username: 'writer2', password: 'password-writer2', role: 'editor' });

  await withServer(async (baseUrl) => {
    const cookie = await loginAs(baseUrl, 'writer2', 'password-writer2');

    const first = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Ugyanaz a cím' }),
    });
    const second = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Ugyanaz a cím' }),
    });

    const firstPost = (await first.json()).post;
    const secondPost = (await second.json()).post;
    assert.notEqual(firstPost.slug, secondPost.slug);
  });
});

test('media upload rejects disallowed mime types and serves accepted uploads', async () => {
  await usersModel.create({ username: 'uploader', password: 'password-uploader', role: 'editor' });

  await withServer(async (baseUrl) => {
    const cookie = await loginAs(baseUrl, 'uploader', 'password-uploader');

    const badForm = new FormData();
    badForm.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'note.txt');
    const badRes = await fetch(`${baseUrl}/api/media`, { method: 'POST', headers: { Cookie: cookie }, body: badForm });
    assert.equal(badRes.status, 400);

    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    const goodForm = new FormData();
    goodForm.append('file', new Blob([pngBytes], { type: 'image/png' }), 'pixel.png');
    const goodRes = await fetch(`${baseUrl}/api/media`, { method: 'POST', headers: { Cookie: cookie }, body: goodForm });
    assert.equal(goodRes.status, 201);
    const media = (await goodRes.json()).media;
    assert.equal(media.originalName, 'pixel.png');

    const fileRes = await fetch(`${baseUrl}${media.url}`);
    assert.equal(fileRes.status, 200);

    const listRes = await fetch(`${baseUrl}/api/media`, { headers: { Cookie: cookie } });
    assert.equal((await listRes.json()).media.length, 1);

    const deleteRes = await fetch(`${baseUrl}/api/media/${media.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });
});

test('settings: GET is public, PATCH requires admin role', async () => {
  await usersModel.create({ username: 'settingseditor', password: 'password-settings', role: 'editor' });
  await usersModel.create({ username: 'settingsadmin', password: 'password-settings2', role: 'admin' });

  await withServer(async (baseUrl) => {
    const publicRes = await fetch(`${baseUrl}/api/settings`);
    assert.equal(publicRes.status, 200);
    assert.equal((await publicRes.json()).settings.siteName, 'AG-CMS');

    const editorCookie = await loginAs(baseUrl, 'settingseditor', 'password-settings');
    const editorPatchRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: editorCookie },
      body: JSON.stringify({ siteName: 'Should not work' }),
    });
    assert.equal(editorPatchRes.status, 403);

    const adminCookie = await loginAs(baseUrl, 'settingsadmin', 'password-settings2');
    const adminPatchRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ siteName: 'New name', seo: { sitemapEnabled: true } }),
    });
    assert.equal(adminPatchRes.status, 200);
    const settings = (await adminPatchRes.json()).settings;
    assert.equal(settings.siteName, 'New name');
    assert.equal(settings.seo.sitemapEnabled, true);
    // A patch nem torolte a tobbi seo mezot (merge, nem overwrite).
    assert.ok('robotsTxt' in settings.seo);
  });
});

test('widgets: create, reorder and delete', async () => {
  await usersModel.create({ username: 'widgetuser', password: 'password-widget', role: 'editor' });

  await withServer(async (baseUrl) => {
    const cookie = await loginAs(baseUrl, 'widgetuser', 'password-widget');

    const w1 = await fetch(`${baseUrl}/api/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ type: 'text', title: 'Első', config: { content: 'Hello' } }),
    });
    const w2 = await fetch(`${baseUrl}/api/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ type: 'socialLinks', title: 'Social', config: { links: [] } }),
    });
    assert.equal(w1.status, 201);
    assert.equal(w2.status, 201);

    const invalidType = await fetch(`${baseUrl}/api/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ type: 'not-a-type' }),
    });
    assert.equal(invalidType.status, 400);

    const widget1 = (await w1.json()).widget;
    const widget2 = (await w2.json()).widget;

    const reorderRes = await fetch(`${baseUrl}/api/widgets/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ order: [widget2.id, widget1.id] }),
    });
    assert.equal(reorderRes.status, 200);
    const reordered = (await reorderRes.json()).widgets;
    assert.equal(reordered[0].id, widget2.id);

    const deleteRes = await fetch(`${baseUrl}/api/widgets/${widget1.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });
});

test('dashboard layout: fixed "system" block always stays first', async () => {
  await usersModel.create({ username: 'dashuser', password: 'password-dash', role: 'editor' });

  await withServer(async (baseUrl) => {
    const cookie = await loginAs(baseUrl, 'dashuser', 'password-dash');

    const defaultRes = await fetch(`${baseUrl}/api/dashboard/layout`, { headers: { Cookie: cookie } });
    const defaultLayout = (await defaultRes.json()).layout;
    assert.equal(defaultLayout.order[0], 'system');

    const saveRes = await fetch(`${baseUrl}/api/dashboard/layout`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ order: ['mediaSummary', 'system', 'recentPosts'], hidden: ['userSummary'] }),
    });
    assert.equal(saveRes.status, 200);
    const saved = (await saveRes.json()).layout;
    assert.equal(saved.order[0], 'system');
    assert.ok(saved.order.includes('mediaSummary'));
    assert.deepEqual(saved.hidden, ['userSummary']);

    const blocksDataRes = await fetch(`${baseUrl}/api/dashboard/blocks-data`, { headers: { Cookie: cookie } });
    const blocksData = await blocksDataRes.json();
    assert.equal(blocksData.system.name, 'AG-CMS');
  });
});

test('admin menu is role-filtered and can be extended via admin:menu:register', async () => {
  const hooks = require('../core/hooks');
  const adminMenu = require('../core/adminMenu');
  // A valodi sample-menu-item plugint toltjuk be es regisztraljuk, ugyanugy
  // ahogy server.js tenne induláskor - igy a teszt a tenyleges plugin +
  // hook + route integraciot fedi le, nem csak a route logikajat.
  const samplePlugin = require('../../plugins/sample-menu-item/index.js');
  samplePlugin.register(hooks);
  await hooks.trigger('admin:menu:register', { registerItem: adminMenu.registerMenuItem });

  await usersModel.create({ username: 'menueditor', password: 'password-menu', role: 'editor' });
  await usersModel.create({ username: 'menuadmin', password: 'password-menu2', role: 'admin' });

  await withServer(async (baseUrl) => {
    const editorCookie = await loginAs(baseUrl, 'menueditor', 'password-menu');
    const editorRes = await fetch(`${baseUrl}/api/admin/menu`, { headers: { Cookie: editorCookie } });
    const editorMenu = (await editorRes.json()).menu;
    assert.ok(editorMenu.some((item) => item.id === 'dashboard'));
    assert.ok(!editorMenu.some((item) => item.id === 'users'), 'editor should not see the admin-only users menu item');
    assert.ok(editorMenu.some((item) => item.id === 'sample-plugin-help'), 'plugin-registered menu item should be present');

    const adminCookie = await loginAs(baseUrl, 'menuadmin', 'password-menu2');
    const adminRes = await fetch(`${baseUrl}/api/admin/menu`, { headers: { Cookie: adminCookie } });
    const adminMenuList = (await adminRes.json()).menu;
    assert.ok(adminMenuList.some((item) => item.id === 'users'));
  });

  adminMenu.reset();
});

after(() => {
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
});
