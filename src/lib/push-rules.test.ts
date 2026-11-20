import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { messagingSenderId, notificationLink } from './push-rules';

describe('Firebase web push', () => {
  it('derives sender id from Firebase app id', () => {
    strictEqual(messagingSenderId('1:123456:web:abc'), '123456');
  });
  it('keeps notification navigation on the app origin', () => {
    strictEqual(notificationLink('//external.test', 'https://app.test'), 'https://app.test/espace');
    strictEqual(notificationLink('/famille/cours', 'https://app.test'), 'https://app.test/famille/cours');
  });
});