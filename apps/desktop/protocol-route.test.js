const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractRouteFromProtocolUrl,
  extractSharedProfileRoute,
} = require('./protocol-route');

test('extractRouteFromProtocolUrl maps shared profile deep links into the friends flow', () => {
  assert.equal(
    extractRouteFromProtocolUrl(
      'zktalk://user/user-123?displayName=Alice+Example&username=alice',
    ),
    '/friends?displayName=Alice+Example&username=alice&profileUserId=user-123',
  );
});

test('extractRouteFromProtocolUrl maps regular app routes directly', () => {
  assert.equal(
    extractRouteFromProtocolUrl('zktalk://dm/conversation-1?foo=bar#latest'),
    '/dm/conversation-1?foo=bar#latest',
  );
});

test('extractSharedProfileRoute finds a profile link inside share text', () => {
  assert.equal(
    extractSharedProfileRoute(
      'Add Alice Example on zkTalk: zktalk://user/user-123?displayName=Alice+Example&username=alice',
    ),
    '/friends?displayName=Alice+Example&username=alice&profileUserId=user-123',
  );
});

test('extractSharedProfileRoute also accepts https profile links', () => {
  assert.equal(
    extractSharedProfileRoute(
      'https://zktalk.app/user/user-123?displayName=Alice+Example&username=alice',
    ),
    '/friends?displayName=Alice+Example&username=alice&profileUserId=user-123',
  );
});

test('extractSharedProfileRoute returns null for unrelated text', () => {
  assert.equal(extractSharedProfileRoute('hello world'), null);
});
