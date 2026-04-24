const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GO_MENU_ITEMS,
  buildGoMenuSubmenu,
  getDesktopMenuLabels,
  getGoMenuItems,
  normalizeDesktopLocale,
} = require('./go-menu');

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

test('getGoMenuItems localizes the desktop go menu for Korean', () => {
  assert.equal(normalizeDesktopLocale('ko-KR'), 'ko');
  assert.equal(normalizeDesktopLocale('en-US'), 'en');
  assert.deepEqual(
    getGoMenuItems('ko').map((item) => item.label ?? item.type),
    ['홈', 'DM', '친구', '설정', '내 프로필 공유', 'separator', '모바일 프로필 붙여넣기'],
  );
});

test('getDesktopMenuLabels localizes the top-level desktop menu copy', () => {
  assert.deepEqual(getDesktopMenuLabels('en'), {
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    go: 'Go',
    help: 'Help',
    home: 'Home',
    dms: 'DMs',
    friends: 'Friends',
    settings: 'Settings',
    shareProfile: 'Share My Profile',
    pasteMobileProfile: 'Paste mobile profile',
    connectionSettings: 'Connection settings',
    openDesktopConfig: 'Open desktop config',
    openDesktopLogs: 'Open desktop logs',
    diagnostics: 'Diagnostics',
    openWebsite: 'Open zkTalk website',
    openAppDataFolder: 'Open app data folder',
    exportSupportBundle: 'Export support bundle',
    copyDiagnosticsSummary: 'Copy diagnostics summary',
    retryConnection: 'Retry connection',
    openConfigFile: 'Open config file',
    openLogs: 'Open logs',
    backToApp: 'Back to app',
    desktopConfigMeta: 'Desktop config',
    desktopLogsMeta: 'Desktop logs',
    apiUrlLabel: 'API URL',
    wsUrlLabel: 'WebSocket URL',
    livekitUrlLabel: 'LiveKit URL',
    webUrlLabel: 'Optional external web URL',
    localAgentLanguagePresetLabel: 'Local agent language preset',
    localAgentLanguagePresetHint:
      'This preset is reserved for the desktop-first local Codex bridge so host and worker machines render predictable language output.',
    agentDeviceBridgeEnabledLabel: 'Enable this computer as an Agent host',
    agentDeviceBridgeEnabledHint:
      'When enabled, this desktop registers itself as a command target and can run /device.codex instructions with its local Codex session.',
    desktopConfigPathHint: 'Desktop config: {{path}}',
    saveAndRetry: 'Save and retry',
    openConfigFileError: 'Could not open the desktop config file.',
    openLogsError: 'Could not open the desktop log file.',
    savingConnectionSettings: 'Saving desktop connection settings...',
    savedConnectionSettings: 'Saved. Reconnecting to zkTalk...',
    saveConnectionSettingsError: 'Could not save desktop settings.',
    connectionSettingsTitle: 'Desktop connection settings',
    connectionSettingsBody:
      'Update the URLs zkTalk uses on this computer.\n\nTip: You only need API URL for most local setups. WebSocket URL can usually be derived automatically.',
  });

  assert.deepEqual(getDesktopMenuLabels('ko'), {
    edit: '편집',
    view: '보기',
    window: '창',
    go: '이동',
    help: '도움말',
    home: '홈',
    dms: 'DM',
    friends: '친구',
    settings: '설정',
    shareProfile: '내 프로필 공유',
    pasteMobileProfile: '모바일 프로필 붙여넣기',
    connectionSettings: '연결 설정',
    openDesktopConfig: '데스크톱 설정 파일 열기',
    openDesktopLogs: '데스크톱 로그 열기',
    diagnostics: '진단',
    openWebsite: 'zkTalk 웹사이트 열기',
    openAppDataFolder: '앱 데이터 폴더 열기',
    exportSupportBundle: '지원 번들 내보내기',
    copyDiagnosticsSummary: '진단 요약 복사',
    retryConnection: '연결 다시 시도',
    openConfigFile: '설정 파일 열기',
    openLogs: '로그 열기',
    backToApp: '앱으로 돌아가기',
    desktopConfigMeta: '데스크톱 설정',
    desktopLogsMeta: '데스크톱 로그',
    apiUrlLabel: 'API URL',
    wsUrlLabel: 'WebSocket URL',
    livekitUrlLabel: 'LiveKit URL',
    webUrlLabel: '외부 웹 URL (선택)',
    localAgentLanguagePresetLabel: '로컬 에이전트 언어 프리셋',
    localAgentLanguagePresetHint:
      '이 프리셋은 데스크톱 우선 로컬 Codex 브리지 전용입니다. 호스트와 워커 머신이 예측 가능한 언어 출력으로 동작하도록 맞춥니다.',
    agentDeviceBridgeEnabledLabel: '이 컴퓨터를 Agent 호스트로 사용',
    agentDeviceBridgeEnabledHint:
      '켜면 이 데스크톱이 명령 대상 디바이스로 등록되고, 로컬 Codex 세션으로 /device.codex 명령을 실행할 수 있습니다.',
    desktopConfigPathHint: '데스크톱 설정: {{path}}',
    saveAndRetry: '저장 후 다시 시도',
    openConfigFileError: '데스크톱 설정 파일을 열지 못했습니다.',
    openLogsError: '데스크톱 로그 파일을 열지 못했습니다.',
    savingConnectionSettings: '데스크톱 연결 설정을 저장하는 중입니다...',
    savedConnectionSettings: '저장했습니다. zkTalk에 다시 연결하는 중입니다...',
    saveConnectionSettingsError: '데스크톱 설정을 저장하지 못했습니다.',
    connectionSettingsTitle: '데스크톱 연결 설정',
    connectionSettingsBody:
      '이 컴퓨터에서 zkTalk가 사용할 URL을 수정합니다.\n\n팁: 대부분의 로컬 환경에서는 API URL만 맞추면 됩니다. WebSocket URL은 보통 자동으로 유도할 수 있습니다.',
  });
});

test('buildGoMenuSubmenu wires localized menu clicks to desktop actions', async () => {
  const calls = [];
  const submenu = buildGoMenuSubmenu(
    (url) => {
      calls.push(url);
      return Promise.resolve();
    },
    { locale: 'ko' },
  );

  assert.equal(submenu[0].label, '홈');
  assert.equal(submenu[5].type, 'separator');
  assert.equal(submenu[6].label, '모바일 프로필 붙여넣기');

  submenu[0].click();
  submenu[6].click();

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls, [
    'zktalk://open-home',
    'zktalk://open-shared-profile-from-clipboard',
  ]);
});
