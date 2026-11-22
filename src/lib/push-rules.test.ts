import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { attentionCount, messagingSenderId, needsPushInvitation, notificationLink, requiresHomeScreen } from './push-rules';

describe('Firebase web push', () => {
  it('invites an inactive device at each login', () => {
    strictEqual(needsPushInvitation(false, false), true);
    strictEqual(needsPushInvitation(true, false), false);
  });
  it('defers only during the current login session', () => {
    strictEqual(needsPushInvitation(false, true), false);
    strictEqual(needsPushInvitation(false, false), true);
  });
  it('requires home screen installation on iPhone before activation', () => {
    strictEqual(requiresHomeScreen(true, false), true);
    strictEqual(requiresHomeScreen(true, true), false);
  });
  it('counts only signaled payments and pending teacher files', () => {
    strictEqual(attentionCount(2, 3), 5);
    strictEqual(attentionCount(0, 0), 0);
  });
  it('derives sender id from Firebase app id', () => {
    strictEqual(messagingSenderId('1:123456:web:abc'), '123456');
  });
  it('keeps notification navigation on the app origin', () => {
    strictEqual(notificationLink('//external.test', 'https://app.test'), 'https://app.test/espace');
    strictEqual(notificationLink('/famille/cours', 'https://app.test'), 'https://app.test/famille/cours');
  });
});