process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || require('crypto').randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const hooks = require('../core/hooks');

const { HookRegistry } = hooks;

test('trigger runs handlers in registration order, forwarding mutated payloads', async () => {
  const registry = new HookRegistry();
  const calls = [];

  registry.on('demo', (payload) => {
    calls.push('first');
    return { ...payload, first: true };
  });
  registry.on('demo', (payload) => {
    calls.push('second');
    assert.equal(payload.first, true);
    return payload;
  });

  const result = await registry.trigger('demo', { first: false });
  assert.deepEqual(calls, ['first', 'second']);
  assert.equal(result.first, true);
});

test('trigger on an event with no handlers returns the original payload', async () => {
  const registry = new HookRegistry();
  const result = await registry.trigger('nothing-registered', { a: 1 });
  assert.deepEqual(result, { a: 1 });
});

test('off() removes a previously registered handler', async () => {
  const registry = new HookRegistry();
  let calls = 0;
  const handler = () => {
    calls += 1;
  };

  registry.on('demo', handler);
  registry.off('demo', handler);
  await registry.trigger('demo', {});

  assert.equal(calls, 0);
});
