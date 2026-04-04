const GO_MENU_ITEMS = [
  {
    label: 'Home',
    accelerator: 'CmdOrCtrl+1',
    actionUrl: 'zktalk://open-home',
  },
  {
    label: 'DMs',
    accelerator: 'CmdOrCtrl+2',
    actionUrl: 'zktalk://open-dms',
  },
  {
    label: 'Friends',
    accelerator: 'CmdOrCtrl+3',
    actionUrl: 'zktalk://open-friends',
  },
  {
    label: 'Settings',
    accelerator: 'CmdOrCtrl+,',
    actionUrl: 'zktalk://open-settings-hub',
  },
  {
    label: 'Share My Profile',
    accelerator: 'CmdOrCtrl+Shift+S',
    actionUrl: 'zktalk://open-profile-share',
  },
  {
    type: 'separator',
  },
  {
    label: 'Paste mobile profile',
    accelerator: 'CmdOrCtrl+Shift+V',
    actionUrl: 'zktalk://open-shared-profile-from-clipboard',
  },
];

function buildGoMenuSubmenu(handleDesktopAction) {
  return GO_MENU_ITEMS.map((item) => {
    if (item.type === 'separator') {
      return { type: 'separator' };
    }

    return {
      label: item.label,
      accelerator: item.accelerator,
      click: () => {
        handleDesktopAction(item.actionUrl).catch(() => {});
      },
    };
  });
}

module.exports = {
  GO_MENU_ITEMS,
  buildGoMenuSubmenu,
};
