const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-auth-test-'));
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

test('POST /api/auth/login rejects unknown users', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'whatever123' }),
    });
    assert.equal(res.status, 401);
  });
});

test('login sets an HttpOnly cookie and /me reflects the authenticated user', async () => {
  await usersModel.create({ username: 'tester', password: 'correct-password-1', role: 'editor', displayName: 'Tester' });

  await withServer(async (baseUrl) => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'tester', password: 'correct-password-1' }),
    });
    assert.equal(loginRes.status, 200);

    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert.match(setCookieHeader, /agcms_session=/);
    assert.match(setCookieHeader, /HttpOnly/i);

    const body = await loginRes.json();
    assert.equal(body.user.username, 'tester');
    assert.equal(body.user.passwordHash, undefined);

    const cookie = extractCookie(loginRes);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.user.username, 'tester');
    assert.equal(meBody.user.role, 'editor');
  });
});

test('GET /api/auth/me without a session returns 401', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
  });
});

test('editor role cannot access admin-only user management endpoints', async () => {
  await usersModel.create({ username: 'editor2', password: 'correct-password-2', role: 'editor' });

  await withServer(async (baseUrl) => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'editor2', password: 'correct-password-2' }),
    });
    const cookie = extractCookie(loginRes);

    const usersRes = await fetch(`${baseUrl}/api/users`, { headers: { Cookie: cookie } });
    assert.equal(usersRes.status, 403);
  });
});

test('admin can create, list and delete users; cannot delete the last admin', async () => {
  const admin = await usersModel.create({ username: 'boss', password: 'correct-password-3', role: 'admin' });

  await withServer(async (baseUrl) => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'boss', password: 'correct-password-3' }),
    });
    const cookie = extractCookie(loginRes);

    const createRes = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ username: 'newbie', password: 'correct-password-4', role: 'editor' }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).user;

    const listRes = await fetch(`${baseUrl}/api/users`, { headers: { Cookie: cookie } });
    const list = (await listRes.json()).users;
    assert.ok(list.some((u) => u.username === 'newbie'));

    const deleteNewbieRes = await fetch(`${baseUrl}/api/users/${created.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(deleteNewbieRes.status, 204);

    // boss az egyetlen admin ezen a ponton -> torlese tiltott (nem sajat magat torolna, hanem masikat probalna, de itt sajat magat probalja)
    const deleteSelfRes = await fetch(`${baseUrl}/api/users/${admin.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(deleteSelfRes.status, 400);
  });
});

after(() => {
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
});
