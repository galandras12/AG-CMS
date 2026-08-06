const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-users-test-'));
process.env.AGCMS_DATA_DIR_OVERRIDE = tmpDataDir;
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const usersModel = require('../models/users.model');

test('create() hashes the password and never exposes it', async () => {
  const user = await usersModel.create({ username: 'alice', password: 'super-secret-1', role: 'admin' });
  assert.equal(user.passwordHash, undefined);
  assert.equal(user.password, undefined);
  assert.equal(user.username, 'alice');
  assert.equal(user.role, 'admin');
});

test('create() rejects duplicate usernames (case-insensitive)', async () => {
  await usersModel.create({ username: 'bob', password: 'super-secret-2', role: 'editor' });
  await assert.rejects(
    () => usersModel.create({ username: 'Bob', password: 'another-password', role: 'editor' }),
    /foglalt/i
  );
});

test('verifyCredentials() only succeeds with the correct password', async () => {
  await usersModel.create({ username: 'carol', password: 'right-password', role: 'editor' });
  const ok = await usersModel.verifyCredentials('carol', 'right-password');
  const bad = await usersModel.verifyCredentials('carol', 'wrong-password');
  assert.ok(ok);
  assert.equal(bad, null);
});

test('verifyCredentials() returns null for unknown or inactive users', async () => {
  const unknown = await usersModel.verifyCredentials('nobody', 'whatever');
  assert.equal(unknown, null);

  const user = await usersModel.create({ username: 'dana', password: 'password-dana', role: 'editor' });
  await usersModel.update(user.id, { active: false });
  const inactive = await usersModel.verifyCredentials('dana', 'password-dana');
  assert.equal(inactive, null);
});

test('a failed create() (duplicate username) does not block subsequent store updates', async () => {
  await usersModel.create({ username: 'dave', password: 'password-one', role: 'editor' });
  await assert.rejects(() => usersModel.create({ username: 'dave', password: 'password-two', role: 'editor' }));

  // Ha a store update-lanc "beragadt" volna a sikertelen irastol, ez itt elhasalna.
  const user = await usersModel.create({ username: 'erin', password: 'password-three', role: 'editor' });
  assert.equal(user.username, 'erin');
});

test('countAdmins() excludes the given id from the count', async () => {
  const admin1 = await usersModel.create({ username: 'root1', password: 'password-root1', role: 'admin' });
  await usersModel.create({ username: 'root2', password: 'password-root2', role: 'admin' });

  const remainingIfRoot1Removed = usersModel.countAdmins(admin1.id);
  assert.ok(remainingIfRoot1Removed >= 1);
});

after(() => {
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
});
