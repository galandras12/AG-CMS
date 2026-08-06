process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || require('crypto').randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EncryptedJSONStore } = require('../core/store');

test('encrypted store round-trips data through an update() cycle', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-test-'));
  const store = new EncryptedJSONStore('unit-test', { items: [] }, tmpDir);

  const written = await store.update((data) => {
    data.items.push({ id: 1, note: 'hello' });
    return data;
  });
  assert.equal(written.items[0].note, 'hello');

  const reloaded = store.read();
  assert.deepEqual(reloaded, written);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('data is not stored as plaintext on disk', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-test-'));
  const secretMarker = 'PLAINTEXT_MARKER_should_not_appear_on_disk';
  const store = new EncryptedJSONStore('secret-test', { items: [] }, tmpDir);

  await store.update((data) => {
    data.items.push({ note: secretMarker });
    return data;
  });

  const rawBytes = fs.readFileSync(path.join(tmpDir, 'secret-test.enc'));
  assert.equal(rawBytes.includes(secretMarker), false);
  // A titkositott fajl legalabb IV (12) + TAG (16) byte-ot tartalmaz a ciphertext elott.
  assert.ok(rawBytes.length > 28);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('store creates default data on first read when the file is missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-test-'));
  const store = new EncryptedJSONStore('defaults-test', { seeded: true }, tmpDir);

  const data = store.read();
  assert.deepEqual(data, { seeded: true });
  assert.ok(fs.existsSync(path.join(tmpDir, 'defaults-test.enc')));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('concurrent update() calls are serialized and do not lose writes', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-test-'));
  const store = new EncryptedJSONStore('concurrency-test', { counter: 0 }, tmpDir);

  await Promise.all(
    Array.from({ length: 20 }, () =>
      store.update((data) => {
        data.counter += 1;
        return data;
      })
    )
  );

  assert.equal(store.read().counter, 20);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
