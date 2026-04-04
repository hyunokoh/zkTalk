const test = require('node:test');
const assert = require('node:assert/strict');
const { GO_MENU_ITEMS, buildGoMenuSubmenu } = require('./go-menu');

test('GO_MENU_ITEMS exposes the expected desktop navigation entries', () => {
  assert.deepEqual(
    GO_MENU_ITEMS.map((item) => item.label ?? item.type),
    [
      'Home',
      'DMs',
      'Friends',
      'Settings',
      'Share My Profile',
      'separator',
      'Paste mobile profile',
    ],
  );

  assert.equal(GO_MENU_ITEMS[0].accelerator, 'CmdOrCtrl+1');
  assert.equal(GO_MENU_ITEMS[1].accelerator, 'CmdOrCtrl+2');
  assert.equal(GO_MENU_ITEMS[4].actionUrl, 'zktalk://open-profile-share');
  assert.equal(GO_MENU_ITEMS[6].actionUrl, 'zktalk://open-shared-profile-from-clipboard');
});

test('buildGoMenuSubmenu wires menu clicks to desktop actions', async () => {
  const calls = [];
  const submenu = buildGoMenuSubmenu((url) => {
    calls.push(url);
    return Promise.resolve();
  });

  assert.equal(submenu[0].label, 'Home');
  assert.equal(submenu[5].type, 'separator');
  assert.equal(submenu[6].label, 'Paste mobile profile');

  submenu[0].click();
  submenu[6].click();

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls, [
    'zktalk://open-home',
    'zktalk://open-shared-profile-from-clipboard',
  ]);
});
