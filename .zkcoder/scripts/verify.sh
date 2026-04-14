#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAILURES=0
VERIFY_SCOPE="${ZKCODER_VERIFY_SCOPE:-changed}"
VERIFY_PROFILE="${ZKCODER_VERIFY_PROFILE:-hardening}"
SCOPE_EXPLICIT=0

API_TEST_TARGETS=(
  "src/lib/__tests__/env.test.ts"
  "src/lib/__tests__/cors.test.ts"
  "src/lib/__tests__/health.test.ts"
  "src/lib/__tests__/server-log.test.ts"
  "src/modules/ai/__tests__/ai.service.test.ts"
  "src/modules/auth/__tests__/auth.service.test.ts"
  "src/modules/channel/__tests__/channel.service.test.ts"
  "src/modules/channel/__tests__/channel-access.service.test.ts"
  "src/modules/community/__tests__/community.service.test.ts"
)

SHARED_TEST_TARGETS=(
  "src/__tests__/ai-selected-message.test.ts"
  "src/__tests__/chat-surface-actions.test.ts"
  "src/__tests__/channel-visibility.test.ts"
  "src/__tests__/local-machine-bridge.test.ts"
  "src/__tests__/settings-navigation.test.ts"
  "src/__tests__/translation-display.test.ts"
  "src/__tests__/validators.test.ts"
)

WEB_TEST_TARGETS=(
  "src/lib/__tests__/api.test.ts"
  "src/lib/__tests__/ai-runtime.test.ts"
  "src/lib/__tests__/local-machine-bridge-loopback.test.ts"
  "src/lib/__tests__/local-machine-command-copy.test.ts"
  "src/lib/__tests__/local-machine-dispatch.test.ts"
  "src/lib/__tests__/runtime-config.test.ts"
  "src/lib/__tests__/selected-message-ai.test.ts"
  "src/lib/__tests__/session-token.test.ts"
  "src/lib/__tests__/upload-request.test.ts"
  "src/app/(app)/__tests__/layout.test.tsx"
  "src/app/(app)/discover/__tests__/page.test.tsx"
  "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/layout.test.tsx"
  "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx"
  "src/app/(app)/settings/__tests__/layout.test.tsx"
  "src/app/(app)/settings/__tests__/page.test.tsx"
  "src/app/(app)/settings/ai/__tests__/page.test.tsx"
  "src/components/__tests__/DesktopLocalMachineBridgeAutoConnect.test.tsx"
  "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
  "src/components/DmConversation/__tests__/DmConversation.test.tsx"
  "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
  "src/components/MessageItem/__tests__/MessageItem.test.tsx"
  "src/components/MessageList/__tests__/MessageList.test.tsx"
  "src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx"
  "src/components/VoiceRoom/__tests__/VoiceRoom.test.tsx"
  "src/app/api/public-assets/__tests__/route.test.ts"
  "src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx"
)

DESKTOP_TEST_TARGETS=(
  "local-machine-bridge.test.js"
  "protocol-route.test.js"
  "window-state.test.js"
  "go-menu.test.js"
)

MOBILE_HIGH_RISK_CHANGED_PATTERNS=(
  "apps/mobile/src/navigation/SettingsStack.tsx"
  "apps/mobile/src/navigation/types.ts"
  "apps/mobile/src/screens/SettingsScreen.tsx"
  "apps/mobile/src/screens/LanguageSettingsScreen.tsx"
  "apps/mobile/src/screens/AiSettingsScreen.tsx"
  "apps/mobile/src/screens/ChannelScreen.tsx"
  "apps/mobile/src/screens/DmScreen.tsx"
  "apps/mobile/src/screens/ThreadScreen.tsx"
  "apps/mobile/src/lib/user-settings.ts"
  "scripts/mobile-harness-regression.mjs"
  "scripts/mobile-harness-regression.test.mjs"
)

MOBILE_CONTRACT_TARGETS=(
  "mobile-risk-contracts"
)

SELECTED_MESSAGE_AI_SHARED_TEST_TARGETS=(
  "src/__tests__/ai-selected-message.test.ts"
)

SELECTED_MESSAGE_AI_WEB_TEST_TARGETS=(
  "src/lib/__tests__/selected-message-ai.test.ts"
  "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx"
  "src/app/(app)/settings/ai/__tests__/page.test.tsx"
  "src/components/DmConversation/__tests__/DmConversation.test.tsx"
  "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
  "src/components/MessageItem/__tests__/MessageItem.test.tsx"
  "src/components/MessageList/__tests__/MessageList.test.tsx"
  "src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx"
)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      VERIFY_SCOPE="all"
      SCOPE_EXPLICIT=1
      ;;
    --changed)
      VERIFY_SCOPE="changed"
      SCOPE_EXPLICIT=1
      ;;
    --api)
      VERIFY_SCOPE="api"
      SCOPE_EXPLICIT=1
      ;;
    --web)
      VERIFY_SCOPE="web"
      SCOPE_EXPLICIT=1
      ;;
    --docs)
      VERIFY_SCOPE="docs"
      SCOPE_EXPLICIT=1
      ;;
    --selected-message-ai)
      VERIFY_SCOPE="selected-message-ai"
      SCOPE_EXPLICIT=1
      ;;
    --hardening-batch|--hardening)
      VERIFY_PROFILE="hardening"
      if [[ $SCOPE_EXPLICIT -eq 0 ]]; then
        VERIFY_SCOPE="changed"
      fi
      ;;
    --release-readiness|--release)
      VERIFY_PROFILE="release"
      if [[ $SCOPE_EXPLICIT -eq 0 ]]; then
        VERIFY_SCOPE="all"
      fi
      ;;
    *)
      echo "[verify:fail] unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

pass() {
  echo "[verify:pass] $1"
}

fail() {
  echo "[verify:fail] $1"
  FAILURES=$((FAILURES + 1))
}

check_text() {
  local file="$1"
  local label="$2"
  local snippet="$3"

  node -e "const fs=require('fs'); const text=fs.readFileSync(process.argv[1],'utf8'); if(!text.includes(process.argv[2])) process.exit(1)" "$file" "$snippet" >/dev/null 2>&1 \
    && pass "$label" \
    || fail "$label"
}

check_env_key() {
  local file="$1"
  local label="$2"
  local key="$3"

  if node - "$file" "$key" >/dev/null 2>&1 <<'NODE'
const fs = require('fs');
const [file, key] = process.argv.slice(2);
const text = fs.readFileSync(file, 'utf8');
const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`^${escapedKey}=`, 'm');

if (!pattern.test(text)) {
  process.exit(1);
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_env_key_documented() {
  local file="$1"
  local label="$2"
  local key="$3"

  if node - "$file" "$key" >/dev/null 2>&1 <<'NODE'
const fs = require('fs');
const [file, key] = process.argv.slice(2);
const text = fs.readFileSync(file, 'utf8');
const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`^\\s*#?\\s*${escapedKey}=`, 'm');

if (!pattern.test(text)) {
  process.exit(1);
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_package_script() {
  local file="$1"
  local label="$2"
  local script_name="$3"

  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(typeof data.scripts?.[process.argv[2]] !== 'string' || data.scripts[process.argv[2]].trim().length === 0) process.exit(1)" "$file" "$script_name" >/dev/null 2>&1 \
    && pass "$label" \
    || fail "$label"
}

check_operator_smoke_inventory() {
  local label="$1"

  if node - "$ROOT" <<'NODE' >/dev/null 2>&1
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.argv[2];
const inventory = JSON.parse(
  execFileSync('node', ['scripts/operator-smoke-inventory.mjs', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }),
);
const contract = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'e2e', 'core-smoke-contract.json'), 'utf8'),
);

if (typeof inventory.objective !== 'string' || inventory.objective.length === 0) {
  process.exit(1);
}

const expectedSources = {
  releaseReadinessChecklist: 'docs/release-readiness-checklist-2026-03-25.md',
  finalOperatorChecklist: 'docs/final-operator-checklist-2026-04-07.md',
  criticalPathVerificationMap: 'docs/critical-path-verification-map-2026-04-07.md',
  commercializationPlan: 'docs/COMMERCIALIZATION_PLAN.md',
  coreSmokeContract: 'e2e/core-smoke-contract.json',
};

for (const [key, expectedPath] of Object.entries(expectedSources)) {
  if (inventory.sourceOfTruth?.[key] !== expectedPath) {
    process.exit(1);
  }
  if (!fs.existsSync(path.join(repoRoot, expectedPath))) {
    process.exit(1);
  }
}

const expectedAutomation = new Map([
  ['release-snapshot-refresh', 'npm run release:next'],
  ['operator-handoff-check', 'npm run operator:handoff:check'],
  ['hardening-batch', 'npm run verify:hardening'],
  ['release-readiness-batch', 'npm run verify:release-readiness'],
  ['local-commercial-verify', 'pnpm local:commercial:verify'],
  ['web-core-smoke', contract.command],
]);

if (!Array.isArray(inventory.automationCandidates) || inventory.automationCandidates.length < expectedAutomation.size) {
  process.exit(1);
}

for (const [id, command] of expectedAutomation.entries()) {
  const item = inventory.automationCandidates.find((candidate) => candidate.id === id);
  if (!item || item.command !== command) {
    process.exit(1);
  }
}

const webCoreSmoke = inventory.automationCandidates.find((candidate) => candidate.id === 'web-core-smoke');
if (!webCoreSmoke) {
  process.exit(1);
}

if (JSON.stringify(webCoreSmoke.coveredSignals) !== JSON.stringify(contract.journeys)) {
  process.exit(1);
}

if (JSON.stringify(webCoreSmoke.excludedSignals) !== JSON.stringify(contract.excludedJourneys)) {
  process.exit(1);
}

if (JSON.stringify(webCoreSmoke.specFiles) !== JSON.stringify(contract.specs)) {
  process.exit(1);
}

if (JSON.stringify(webCoreSmoke.prerequisites) !== JSON.stringify(contract.prerequisites)) {
  process.exit(1);
}

const expectedManualIds = [
  'storage-operator-gate',
  'voice-operator-gate',
  'desktop-signing',
  'real-device-ime',
];

if (!Array.isArray(inventory.keepManualOrExternal) || inventory.keepManualOrExternal.length < expectedManualIds.length) {
  process.exit(1);
}

for (const id of expectedManualIds) {
  if (!inventory.keepManualOrExternal.find((item) => item.id === id)) {
    process.exit(1);
  }
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_worktree_preservation() {
  local before_file="$1"
  local label="$2"

  if node - "$before_file" "$ROOT" <<'NODE' >/dev/null 2>&1
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [beforeFile, repoRoot] = process.argv.slice(2);

const parseStatusPaths = (text) => {
  const paths = new Set();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const subject = line.length > 3 ? line.slice(3).trim() : '';
    if (!subject) continue;

    if (subject.includes(' -> ')) {
      for (const part of subject.split(' -> ')) {
        const normalized = part.trim();
        if (normalized) paths.add(normalized);
      }
      continue;
    }

    paths.add(subject);
  }

  return paths;
};

const beforePaths = parseStatusPaths(fs.readFileSync(beforeFile, 'utf8'));
const currentStatus = execFileSync('git', ['-C', repoRoot, 'status', '--short'], { encoding: 'utf8' });
const currentPaths = parseStatusPaths(currentStatus);

const missing = [];
for (const beforePath of beforePaths) {
  if (!currentPaths.has(beforePath)) {
    missing.push(beforePath);
  }
}

if (missing.length > 0) {
  console.error(`Missing dirty-path entries since snapshot: ${missing.join(', ')}`);
  process.exit(1);
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_mobile_selected_message_ai_contract() {
  local label="$1"

  if node - "$ROOT" >/dev/null 2>&1 <<'NODE'
const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2];

const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const messageActionSheets = [
  read('apps/mobile/src/components/MessageActionSheet.tsx'),
  read('apps/mobile/src/components/MessageActionSheet.js'),
];
const aiLib = read('apps/mobile/src/lib/ai.ts');
const screens = [
  {
    name: 'channel',
    paths: [
      'apps/mobile/src/screens/ChannelScreen.tsx',
      'apps/mobile/src/screens/ChannelScreen.js',
    ],
    surface: "surface: 'channel'",
    touchableId: 'testID={`channel-message-touchable-${item.id}`}',
  },
  {
    name: 'dm',
    paths: [
      'apps/mobile/src/screens/DmScreen.tsx',
      'apps/mobile/src/screens/DmScreen.js',
    ],
    surface: "surface: 'dm'",
    touchableId: 'testID={`dm-message-touchable-${item.id}`}',
  },
  {
    name: 'thread',
    paths: [
      'apps/mobile/src/screens/ThreadScreen.tsx',
      'apps/mobile/src/screens/ThreadScreen.js',
    ],
    surface: "surface: 'thread'",
    touchableId: 'testID={`thread-message-touchable-${item.id}`}',
  },
];

const requiredActionSheetSnippets = [
  'testID="message-action-sheet-ai-section"',
  'testID="message-action-sheet-ai-status"',
  'testID="message-action-sheet-ai-reply-draft"',
  'testID="message-action-sheet-ai-rewrite-draft"',
  'testID="message-action-sheet-ai-translate-inline"',
  'onTranslate',
  'onAiReplyDraft',
  'onAiRewriteDraft',
  'aiActionsDisabled && styles.aiActionCardDisabled',
  "aiStatusTone === 'mock'",
  "aiStatusTone === 'unavailable'",
  "t('ai.messageReplyDraftHint')",
  "t('ai.messageRewriteDraftHint')",
  "t('ai.messageTranslateInlineHint')",
];

for (const messageActionSheet of messageActionSheets) {
  for (const snippet of requiredActionSheetSnippets) {
    if (!messageActionSheet.includes(snippet)) {
      process.exit(1);
    }
  }
}

const requiredAiLibSnippets = [
  'export function isAiRuntimeUsable',
  "return runtime?.status === 'configured' || runtime?.status === 'mock';",
  'export function getAiRuntimePresentation',
  "label: t('ai.runtimeLive')",
  "label: t('ai.runtimeMock')",
  "label: t('ai.runtimeDisabled')",
  "label: t('ai.runtimeMisconfigured')",
  "tone: 'live'",
  "tone: 'mock'",
  "tone: 'unavailable'",
  'export async function fetchAiRuntime()',
  "return api<AIRuntimeSummary>('/api/ai/runtime');",
  'export async function requestAiChat',
  "return getSelectedMessageAiSuccessKey(action, { mock: runtime?.status === 'mock' });",
];

for (const snippet of requiredAiLibSnippets) {
  if (!aiLib.includes(snippet)) {
    process.exit(1);
  }
}

for (const screen of screens) {
  const requiredScreenSnippets = [
    'fetchAiRuntime',
    'buildSelectedMessageAiAction',
    'getAiRuntimePresentation',
    'requestAiChat',
    'getSelectedMessageAiAppliedMessageKey',
    "t('ai.selectedMessageScopeHint')",
    "action: 'reply-draft'",
    "action: 'rewrite-draft'",
    screen.surface,
    screen.touchableId,
    'onAiReplyDraft={handleAiReplyDraft}',
    'onAiRewriteDraft={handleAiRewriteDraft}',
    'aiStatusLabel={aiStatusLabel}',
    'aiStatusTone={aiStatusTone}',
    'aiStatusDescription={aiStatusDescription}',
  ];
  const requiredRuntimePresentationSnippets = [
    'const aiRuntimePresentation = getAiRuntimePresentation(t, aiRuntime);',
    'var aiRuntimePresentation = (0, ai_1.getAiRuntimePresentation)(t, aiRuntime);',
  ];
  const requiredTranslateActionSnippets = [
    "action: 'translate-inline'",
    'handleTranslate =',
  ];
  const requiredAiActionsDisabledSnippets = [
    'aiActionsDisabled={!isAiRuntimeUsable(aiRuntime)}',
    'aiActionsDisabled={!(0, ai_1.isAiRuntimeUsable)(aiRuntime)}',
  ];

  for (const screenPath of screen.paths) {
    const text = read(screenPath);

    for (const snippet of requiredScreenSnippets) {
      if (!text.includes(snippet)) {
        process.exit(1);
      }
    }

    if (!requiredRuntimePresentationSnippets.some((snippet) => text.includes(snippet))) {
      process.exit(1);
    }

    if (!requiredTranslateActionSnippets.some((snippet) => text.includes(snippet))) {
      process.exit(1);
    }

    if (!requiredAiActionsDisabledSnippets.some((snippet) => text.includes(snippet))) {
      process.exit(1);
    }
  }
}

const localeFiles = [
  read('apps/mobile/src/lib/i18n/locales/en.ts'),
  read('apps/mobile/src/lib/i18n/locales/ko.ts'),
];

const requiredLocaleSnippets = [
  "'ai.runtimeLive'",
  "'ai.runtimeMock'",
  "'ai.runtimeDisabled'",
  "'ai.runtimeMisconfigured'",
  "'ai.runtimeLiveHint'",
  "'ai.runtimeMockHint'",
  "'ai.runtimeDisabledHint'",
  "'ai.runtimeMisconfiguredHint'",
  "'ai.selectedMessageScopeHint'",
  "'ai.replyDraftAppliedMock'",
  "'ai.rewriteDraftAppliedMock'",
];

for (const localeFile of localeFiles) {
  for (const snippet of requiredLocaleSnippets) {
    if (!localeFile.includes(snippet)) {
      process.exit(1);
    }
  }
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_mobile_channel_visibility_contract() {
  local label="$1"

  if node - "$ROOT" >/dev/null 2>&1 <<'NODE'
const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2];
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const sharedVisibility = read('packages/shared/src/utils/channel-visibility.ts');
const homeScreen = read('apps/mobile/src/screens/HomeScreen.tsx');

const sharedSnippets = [
  'export interface ChannelBrowsePresentation',
  'export function getChannelBrowsePresentation',
  'lockedCopyKey',
  'lockedPromptBodyKey',
];

for (const snippet of sharedSnippets) {
  if (!sharedVisibility.includes(snippet)) {
    process.exit(1);
  }
}

const homeScreenSnippets = [
  'getChannelBrowsePresentation',
  "t('channel.lockedBadge')",
  "t('community.channelAccessHint')",
  'const { lockedReason, lockedPromptBodyKey } = getChannelBrowsePresentation(item);',
  'const browsePresentation = getChannelBrowsePresentation(item);',
];

for (const snippet of homeScreenSnippets) {
  if (!homeScreen.includes(snippet)) {
    process.exit(1);
  }
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

check_settings_language_alignment_contract() {
  local label="$1"

  if node - "$ROOT" >/dev/null 2>&1 <<'NODE'
const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2];
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const sharedNavigation = read('packages/shared/src/utils/settings-navigation.ts');
const mobileSettingsStack = read('apps/mobile/src/navigation/SettingsStack.tsx');
const mobileSettingsScreen = read('apps/mobile/src/screens/SettingsScreen.tsx');
const mobileLanguageScreen = read('apps/mobile/src/screens/LanguageSettingsScreen.tsx');
const webSettingsLayout = read('apps/web/src/app/(app)/settings/layout.tsx');
const webSettingsLayoutTest = read('apps/web/src/app/(app)/settings/__tests__/layout.test.tsx');

const sharedSnippets = [
  "language: {",
  "mobile: 'LanguageSettings'",
  "ai_translation: {",
  "mobile: 'AiSettings'",
  "machine_control: {",
  "web: '/settings/ai#machine-control'",
];

for (const snippet of sharedSnippets) {
  if (!sharedNavigation.includes(snippet)) {
    process.exit(1);
  }
}

const mobileStackSnippets = [
  'name="LanguageSettings"',
  'component={LanguageSettingsScreen}',
  "options={{ title: t('settings.language') }}",
  'name="AiSettings"',
  'component={AiSettingsScreen}',
  "options={{ title: t('settings.aiTranslation') }}",
];

for (const snippet of mobileStackSnippets) {
  if (!mobileSettingsStack.includes(snippet)) {
    process.exit(1);
  }
}

const mobileSettingsSnippets = [
  "navigation.navigate('LanguageSettings')",
  "navigation.navigate('AiSettings')",
  "t('settings.language')",
  "t('settings.languageSectionHint')",
  "t('settings.aiTranslation')",
  "t('settings.machineControl')",
];

for (const snippet of mobileSettingsSnippets) {
  if (!mobileSettingsScreen.includes(snippet)) {
    process.exit(1);
  }
}

const mobileLanguageSnippets = [
  "testID={`language-option-${value}`}",
  "t('settings.appDisplayLanguage')",
  "t('settings.languageOptionKo')",
  "t('settings.languageOptionEn')",
  "t('settings.translationPresets')",
  "t('settings.languageTranslationBoundary')",
];

for (const snippet of mobileLanguageSnippets) {
  if (!mobileLanguageScreen.includes(snippet)) {
    process.exit(1);
  }
}

const webLayoutSnippets = [
  "t('settings.title')",
  "t('settings.listSubtitle')",
  "language: 'settings.languageSectionTitle'",
  "machine_control: 'settings.machineControlSectionTitle'",
  'SETTINGS_SECTION_ORDER.map((sectionId) => ({',
  't(SECTION_LABEL_KEYS[sectionId])',
];

for (const snippet of webLayoutSnippets) {
  if (!webSettingsLayout.includes(snippet)) {
    process.exit(1);
  }
}

const webLayoutTestSnippets = [
  'renders the settings sidebar labels in Korean when locale is ko',
  'renders the settings sidebar labels in English when locale is en',
  "name: '설정' })",
  "name: 'Settings' })",
  "name: '언어' }).getAttribute('href')",
  "name: 'Language' }).getAttribute('href')",
  "name: '머신 제어' }).getAttribute('href')",
  "name: 'Machine control' }).getAttribute('href')",
];

for (const snippet of webLayoutTestSnippets) {
  if (!webSettingsLayoutTest.includes(snippet)) {
    process.exit(1);
  }
}
NODE
  then
    pass "$label"
  else
    fail "$label"
  fi
}

read_latest_run_dir() {
  local latest_run_file="$1"

  node -e "const data=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(typeof data.runDir === 'string' ? data.runDir : '')" "$latest_run_file" 2>/dev/null
}

find_newest_run_dir() {
  local runs_dir="$1"

  node - "$runs_dir" <<'NODE'
const fs = require('fs');
const path = require('path');

const runsDir = process.argv[2];

if (!fs.existsSync(runsDir)) {
  process.exit(0);
}

const newest = fs
  .readdirSync(runsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dirPath = path.join(runsDir, entry.name);
    const stat = fs.statSync(dirPath);
    return { dirPath, mtimeMs: stat.mtimeMs };
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

if (newest) {
  process.stdout.write(newest.dirPath);
}
NODE
}

sync_latest_run_file_to_newest() {
  local root_dir="$1"
  local latest_run_file="$root_dir/.zkcoder/latest-run.json"
  local newest_run_dir

  newest_run_dir="$(find_newest_run_dir "$root_dir/.zkcoder/runs")"
  if [[ -z "$newest_run_dir" ]]; then
    return 0
  fi

  node - "$latest_run_file" "$newest_run_dir" <<'NODE'
const fs = require('fs');

const [latestRunFile, newestRunDir] = process.argv.slice(2);
const nextPayload = {
  runDir: newestRunDir,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(latestRunFile, `${JSON.stringify(nextPayload, null, 2)}\n`);
NODE
}

collect_changed_files() {
  {
    git -C "$ROOT" diff --name-only HEAD --
    git -C "$ROOT" ls-files --others --exclude-standard
  } | sed '/^$/d' | sort -u
}

changed_files_touch_prefix() {
  local prefix="$1"
  shift || true
  local file
  for file in "$@"; do
    [[ "$file" == "$prefix"* ]] && return 0
  done
  return 1
}

append_unique_target() {
  local target="$1"
  shift
  local existing

  for existing in "$@"; do
    [[ "$existing" == "$target" ]] && return 0
  done

  return 1
}

add_api_target() {
  local target="$1"

  if append_unique_target "$target" "${SELECTED_API_TESTS[@]:-}"; then
    return 0
  fi

  SELECTED_API_TESTS+=("$target")
}

add_shared_target() {
  local target="$1"

  if append_unique_target "$target" "${SELECTED_SHARED_TESTS[@]:-}"; then
    return 0
  fi

  SELECTED_SHARED_TESTS+=("$target")
}

add_web_target() {
  local target="$1"

  if append_unique_target "$target" "${SELECTED_WEB_TESTS[@]:-}"; then
    return 0
  fi

  SELECTED_WEB_TESTS+=("$target")
}

add_desktop_target() {
  local target="$1"

  if append_unique_target "$target" "${SELECTED_DESKTOP_TESTS[@]:-}"; then
    return 0
  fi

  SELECTED_DESKTOP_TESTS+=("$target")
}

add_mobile_target() {
  local target="$1"

  if append_unique_target "$target" "${SELECTED_MOBILE_TARGETS[@]:-}"; then
    return 0
  fi

  SELECTED_MOBILE_TARGETS+=("$target")
}

select_changed_targets_for_file() {
  local file="$1"

  case "$file" in
    apps/api/src/lib/__tests__/*)
      add_api_target "${file#apps/api/}"
      ;;
    packages/shared/src/__tests__/*)
      add_shared_target "${file#packages/shared/}"
      ;;
    packages/shared/src/utils/channel-visibility.ts)
      add_shared_target "src/__tests__/channel-visibility.test.ts"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/layout.test.tsx"
      ;;
    packages/shared/src/utils/chat-surface-actions.ts)
      add_shared_target "src/__tests__/chat-surface-actions.test.ts"
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/layout.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    packages/shared/src/utils/settings-navigation.ts)
      add_shared_target "src/__tests__/settings-navigation.test.ts"
      add_web_target "src/app/(app)/settings/__tests__/layout.test.tsx"
      add_web_target "src/app/(app)/settings/__tests__/page.test.tsx"
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    packages/shared/src/utils/index.ts)
      add_shared_target "src/__tests__/channel-visibility.test.ts"
      add_shared_target "src/__tests__/chat-surface-actions.test.ts"
      add_shared_target "src/__tests__/settings-navigation.test.ts"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/layout.test.tsx"
      add_web_target "src/app/(app)/settings/__tests__/layout.test.tsx"
      add_web_target "src/app/(app)/settings/__tests__/page.test.tsx"
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    packages/shared/src/utils/ai-selected-message.ts)
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      add_web_target "src/lib/__tests__/selected-message-ai.test.ts"
      add_mobile_target "mobile-risk-contracts"
      ;;
    packages/shared/src/utils/*)
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      add_web_target "src/lib/__tests__/selected-message-ai.test.ts"
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx"
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_web_target "src/components/DmConversation/__tests__/DmConversation.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_web_target "src/components/MessageItem/__tests__/MessageItem.test.tsx"
      add_web_target "src/components/MessageList/__tests__/MessageList.test.tsx"
      add_web_target "src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    apps/web/src/**/*.test.ts|apps/web/src/**/*.test.tsx)
      add_web_target "${file#apps/web/}"
      ;;
    apps/web/src/app/\(app\)/settings/page.tsx)
      add_web_target "src/app/(app)/settings/__tests__/page.test.tsx"
      ;;
    apps/web/src/app/\(app\)/settings/layout.tsx)
      add_web_target "src/app/(app)/settings/__tests__/layout.test.tsx"
      add_web_target "src/app/(app)/settings/__tests__/page.test.tsx"
      ;;
    apps/web/src/app/\(app\)/settings/ai/page.tsx)
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_web_target "src/lib/__tests__/local-machine-bridge-loopback.test.ts"
      ;;
    apps/web/src/components/DesktopLocalMachineBridgeAutoConnect.tsx|apps/web/src/components/__tests__/DesktopLocalMachineBridgeAutoConnect.test.tsx)
      add_web_target "src/components/__tests__/DesktopLocalMachineBridgeAutoConnect.test.tsx"
      ;;
    apps/web/src/lib/local-machine-bridge-loopback.ts|apps/web/src/lib/local-machine-command-copy.ts)
      add_web_target "src/lib/__tests__/local-machine-bridge-loopback.test.ts"
      ;;
    apps/desktop/local-machine-bridge.js|apps/desktop/local-machine-bridge.test.js|apps/desktop/preload.js|apps/desktop/main.js)
      add_desktop_target "local-machine-bridge.test.js"
      ;;
    apps/mobile/src/lib/ai.ts|apps/mobile/src/components/MessageActionSheet.tsx|apps/mobile/src/components/MessageActionSheet.js|apps/mobile/src/screens/ChannelScreen.tsx|apps/mobile/src/screens/ChannelScreen.js|apps/mobile/src/screens/DmScreen.tsx|apps/mobile/src/screens/DmScreen.js|apps/mobile/src/screens/ThreadScreen.tsx|apps/mobile/src/screens/ThreadScreen.js|apps/mobile/maestro/flows/channel-selected-message-ai-smoke.yaml|apps/mobile/maestro/flows/dm-selected-message-ai-smoke.yaml|apps/mobile/maestro/flows/thread-selected-message-ai-smoke.yaml|scripts/mobile-maestro-smoke.mjs)
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      add_web_target "src/lib/__tests__/selected-message-ai.test.ts"
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx"
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_web_target "src/components/DmConversation/__tests__/DmConversation.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_web_target "src/components/MessageItem/__tests__/MessageItem.test.tsx"
      add_web_target "src/components/MessageList/__tests__/MessageList.test.tsx"
      add_web_target "src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    apps/mobile/src/screens/SettingsScreen.tsx|apps/mobile/src/screens/LanguageSettingsScreen.tsx|apps/mobile/src/screens/AiSettingsScreen.tsx|apps/mobile/src/navigation/SettingsStack.tsx|apps/mobile/src/navigation/types.ts|scripts/mobile-risk-contract.test.mjs|scripts/mobile-harness-regression.mjs|scripts/mobile-harness-regression.test.mjs)
      add_shared_target "src/__tests__/settings-navigation.test.ts"
      add_shared_target "src/__tests__/translation-display.test.ts"
      add_web_target "src/app/(app)/settings/__tests__/layout.test.tsx"
      add_web_target "src/app/(app)/settings/__tests__/page.test.tsx"
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_mobile_target "mobile-risk-contracts"
      ;;
    apps/api/src/lib/env.ts|apps/api/src/lib/db/*|.env.example|.env.production.example)
      add_api_target "src/lib/__tests__/env.test.ts"
      ;;
    apps/api/src/lib/cors.ts)
      add_api_target "src/lib/__tests__/cors.test.ts"
      ;;
    apps/api/src/lib/health.ts)
      add_api_target "src/lib/__tests__/health.test.ts"
      ;;
    apps/api/src/lib/server-log.ts|apps/api/src/lib/redis.ts|apps/api/src/modules/realtime/*)
      add_api_target "src/lib/__tests__/server-log.test.ts"
      add_web_target "src/hooks/__tests__/useWebSocket.test.tsx"
      add_web_target "src/lib/__tests__/runtime-config.test.ts"
      ;;
    apps/api/src/modules/ai/*)
      add_api_target "src/modules/ai/__tests__/ai.service.test.ts"
      ;;
    apps/api/src/modules/channel/*)
      add_api_target "src/modules/channel/__tests__/channel.service.test.ts"
      add_api_target "src/modules/channel/__tests__/channel-access.service.test.ts"
      add_api_target "src/modules/community/__tests__/community.service.test.ts"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_web_target "src/app/(app)/discover/__tests__/page.test.tsx"
      ;;
    apps/api/src/modules/community/*)
      add_api_target "src/modules/community/__tests__/community.service.test.ts"
      add_api_target "src/modules/channel/__tests__/channel.service.test.ts"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_web_target "src/app/(app)/discover/__tests__/page.test.tsx"
      ;;
    apps/api/src/middleware/auth.ts|apps/api/src/modules/auth/*)
      add_api_target "src/modules/auth/__tests__/auth.service.test.ts"
      add_api_target "src/lib/__tests__/env.test.ts"
      add_web_target "src/lib/__tests__/api.test.ts"
      add_web_target "src/lib/__tests__/session-token.test.ts"
      ;;
    apps/api/src/lib/s3.ts|apps/api/src/modules/message/*|apps/api/src/modules/push-token/*)
      add_api_target "src/lib/__tests__/env.test.ts"
      add_web_target "src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx"
      add_web_target "src/app/api/public-assets/__tests__/route.test.ts"
      ;;
    apps/api/src/server.ts)
      add_api_target "src/lib/__tests__/env.test.ts"
      add_api_target "src/lib/__tests__/cors.test.ts"
      add_api_target "src/lib/__tests__/health.test.ts"
      add_api_target "src/lib/__tests__/server-log.test.ts"
      add_web_target "src/lib/__tests__/runtime-config.test.ts"
      ;;
    apps/web/src/lib/api.ts)
      add_web_target "src/lib/__tests__/api.test.ts"
      ;;
    apps/web/src/lib/session-token.ts)
      add_web_target "src/lib/__tests__/session-token.test.ts"
      add_web_target "src/lib/__tests__/api.test.ts"
      ;;
    apps/web/src/lib/runtime-config.ts)
      add_web_target "src/lib/__tests__/runtime-config.test.ts"
      add_web_target "src/hooks/__tests__/useWebSocket.test.tsx"
      ;;
    apps/web/src/hooks/useWebSocket.ts|apps/web/src/stores/unread.ts)
      add_web_target "src/hooks/__tests__/useWebSocket.test.tsx"
      add_web_target "src/app/(app)/__tests__/layout.test.tsx"
      ;;
    apps/web/src/app/api/public-assets/*|apps/web/src/lib/upload-assets.ts|apps/web/src/lib/upload-request.ts)
      add_web_target "src/app/api/public-assets/__tests__/route.test.ts"
      add_web_target "src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx"
      add_web_target "src/lib/__tests__/upload-request.test.ts"
      ;;
    apps/web/src/components/AttachmentPreview/*|apps/web/src/lib/file-preview.ts|apps/web/src/lib/client-log.ts|apps/web/src/components/P2PFileCard/*|apps/web/src/components/P2PFileShare/*)
      add_web_target "src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx"
      ;;
    apps/web/src/components/MessageComposer/*)
      add_web_target "src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx"
      add_web_target "src/app/(app)/__tests__/layout.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/components/MessageList/*|apps/web/src/components/MessageItem/*)
      add_web_target "src/components/MessageList/__tests__/MessageList.test.tsx"
      add_web_target "src/components/MessageItem/__tests__/MessageItem.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/components/ThreadPanel/*)
      add_web_target "src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/app/\(app\)/communities/\[slug\]/channels/\[channelId\]/page.tsx)
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx"
      add_web_target "src/components/MessageComposer/__tests__/MessageComposer.test.tsx"
      add_web_target "src/components/MessageList/__tests__/MessageList.test.tsx"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/app/\(app\)/communities/\[slug\]/channels/\[channelId\]/layout.tsx)
      add_web_target "src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/layout.test.tsx"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_shared_target "src/__tests__/channel-visibility.test.ts"
      ;;
    apps/web/src/app/\(app\)/discover/*)
      add_web_target "src/app/(app)/discover/__tests__/page.test.tsx"
      add_api_target "src/modules/channel/__tests__/channel.service.test.ts"
      add_api_target "src/modules/community/__tests__/community.service.test.ts"
      ;;
    apps/web/src/app/\(app\)/settings/ai/*)
      add_web_target "src/app/(app)/settings/ai/__tests__/page.test.tsx"
      add_web_target "src/lib/__tests__/selected-message-ai.test.ts"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/app/\(app\)/layout.tsx|apps/web/src/components/DmConversation/*)
      add_web_target "src/app/(app)/__tests__/layout.test.tsx"
      add_web_target "src/hooks/__tests__/useWebSocket.test.tsx"
      add_web_target "src/components/DmConversation/__tests__/DmConversation.test.tsx"
      add_web_target "src/lib/__tests__/selected-message-ai.test.ts"
      add_shared_target "src/__tests__/ai-selected-message.test.ts"
      ;;
    apps/web/src/components/ChannelSidebar/*)
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      add_api_target "src/modules/channel/__tests__/channel.service.test.ts"
      add_api_target "src/modules/channel/__tests__/channel-access.service.test.ts"
      ;;
    apps/web/src/components/VoiceRoom/*)
      add_web_target "src/components/VoiceRoom/__tests__/VoiceRoom.test.tsx"
      ;;
    docs/community-visibility-matrix-2026-04-10.md|docs/api-reference.md|e2e/tests/community-visibility.smoke.spec.ts)
      add_api_target "src/modules/channel/__tests__/channel.service.test.ts"
      add_api_target "src/modules/channel/__tests__/channel-access.service.test.ts"
      add_api_target "src/modules/community/__tests__/community.service.test.ts"
      add_web_target "src/app/(app)/discover/__tests__/page.test.tsx"
      add_web_target "src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx"
      ;;
  esac
}

select_changed_targets() {
  local changed_file

  SELECTED_API_TESTS=()
  SELECTED_SHARED_TESTS=()
  SELECTED_WEB_TESTS=()
  SELECTED_DESKTOP_TESTS=()
  SELECTED_MOBILE_TARGETS=()

  for changed_file in "${CHANGED_FILES[@]:-}"; do
    select_changed_targets_for_file "$changed_file"
  done
}

run_package_tests() {
  local package_dir="$1"
  local label="$2"
  shift 2

  if pnpm --dir "$package_dir" test -- --run "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

changed_files_include_any() {
  local changed_file
  local pattern

  for changed_file in "${CHANGED_FILES[@]:-}"; do
    for pattern in "$@"; do
      if [[ "$changed_file" == "$pattern" ]]; then
        return 0
      fi
    done
  done

  return 1
}

run_command() {
  local label="$1"
  shift

  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

run_command_in_dir() {
  local dir="$1"
  local label="$2"
  shift 2

  if (
    cd "$dir"
    "$@"
  ); then
    pass "$label"
  else
    fail "$label"
  fi
}

should_run_release_next_check() {
  local file

  for file in "$@"; do
    case "$file" in
      README.md|HANDOFF.md|docs/CURRENT_STATUS.md|docs/current-release-next.md|docs/current-release-next.json|docs/current-blockers-2026-03-25.md|docs/release-readiness-checklist-2026-03-25.md|scripts/release-next.mjs|apps/desktop/scripts/release-*)
        return 0
        ;;
    esac
  done

  return 1
}

echo "[verify] basic zkTalk repo checks..."

[[ -f "$ROOT/package.json" ]] && pass "root package.json exists" || fail "root package.json missing"
[[ -f "$ROOT/pnpm-lock.yaml" ]] && pass "pnpm-lock.yaml exists" || fail "pnpm-lock.yaml missing"
[[ -f "$ROOT/turbo.json" ]] && pass "turbo.json exists" || fail "turbo.json missing"
[[ -f "$ROOT/TASK_BRIEF.md" ]] && pass "TASK_BRIEF.md exists" || fail "TASK_BRIEF.md missing"
[[ -f "$ROOT/docs/IMPLEMENTATION_PLAN.md" ]] && pass "IMPLEMENTATION_PLAN.md exists" || fail "IMPLEMENTATION_PLAN.md missing"
[[ -f "$ROOT/docs/ZKCODER_RUNBOOK.md" ]] && pass "ZKCODER_RUNBOOK.md exists" || fail "ZKCODER_RUNBOOK.md missing"
[[ -f "$ROOT/docs/production-runtime-runbook.md" ]] && pass "production runtime runbook exists" || fail "production runtime runbook missing"
[[ -f "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" ]] && pass "high-risk touched surfaces doc exists" || fail "high-risk touched surfaces doc missing"
[[ -f "$ROOT/docs/release-readiness-checklist-2026-03-25.md" ]] && pass "release readiness checklist exists" || fail "release readiness checklist missing"
[[ -f "$ROOT/docs/current-blockers-2026-03-25.md" ]] && pass "current blockers doc exists" || fail "current blockers doc missing"
[[ -f "$ROOT/docs/README.md" ]] && pass "docs index exists" || fail "docs index missing"
[[ -f "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md" ]] && pass "desktop AI-agent feedback batch exists" || fail "desktop AI-agent feedback batch missing"
[[ -f "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md" ]] && pass "mobile AI-agent feedback batch exists" || fail "mobile AI-agent feedback batch missing"
[[ -f "$ROOT/.zkcoder/project.json" ]] && pass ".zkcoder/project.json exists" || fail ".zkcoder/project.json missing"
[[ -f "$ROOT/.zkcoder/design-summary.json" ]] && pass ".zkcoder/design-summary.json exists" || fail ".zkcoder/design-summary.json missing"
[[ -f "$ROOT/.zkcoder/queue-surface-map.json" ]] && pass ".zkcoder/queue-surface-map.json exists" || fail ".zkcoder/queue-surface-map.json missing"
[[ -f "$ROOT/.zkcoder/scripts/run-agent.sh" ]] && pass "run-agent.sh exists" || fail "run-agent.sh missing"
[[ -f "$ROOT/.zkcoder/scripts/check-queue-surfaces.mjs" ]] && pass "check-queue-surfaces.mjs exists" || fail "check-queue-surfaces.mjs missing"
[[ -f "$ROOT/e2e/core-smoke-contract.json" ]] && pass "core smoke contract exists" || fail "core smoke contract missing"

echo "[verify] config file parsing..."
node -e "JSON.parse(require('fs').readFileSync('$ROOT/.zkcoder/project.json','utf8'))" >/dev/null 2>&1 && pass "project.json is valid JSON" || fail "project.json is invalid JSON"
node -e "JSON.parse(require('fs').readFileSync('$ROOT/.zkcoder/design-summary.json','utf8'))" >/dev/null 2>&1 && pass "design summary is valid JSON" || fail "design summary is invalid JSON"
node -e "JSON.parse(require('fs').readFileSync('$ROOT/.zkcoder/queue-surface-map.json','utf8'))" >/dev/null 2>&1 && pass "queue surface map is valid JSON" || fail "queue surface map is invalid JSON"
node - "$ROOT/e2e/core-smoke-contract.json" <<'NODE' >/dev/null 2>&1 && pass "core smoke contract is valid and references existing specs" || fail "core smoke contract is invalid or references missing specs"
const fs = require('fs');
const path = require('path');

const contractPath = process.argv[2];
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const requiredKeys = ['id', 'command', 'suite', 'specs', 'journeys', 'excludedJourneys', 'prerequisites', 'failureBoundary'];

for (const key of requiredKeys) {
  if (!(key in contract)) {
    process.exit(1);
  }
}

if (!Array.isArray(contract.specs) || contract.specs.length === 0) {
  process.exit(1);
}

for (const spec of contract.specs) {
  if (typeof spec !== 'string' || spec.length === 0) {
    process.exit(1);
  }
  const specPath = path.join(path.dirname(contractPath), spec);
  if (!fs.existsSync(specPath)) {
    process.exit(1);
  }
}
NODE
node -e "const fs=require('fs'); const text=fs.readFileSync('$ROOT/pnpm-workspace.yaml','utf8'); if(!text.includes('\"apps/*\"') || !text.includes('\"packages/*\"')) process.exit(1)" >/dev/null 2>&1 && pass "pnpm workspace includes app and package globs" || fail "pnpm workspace is missing expected globs"
node -e "const fs=require('fs'); const text=fs.readFileSync('$ROOT/TASK_BRIEF.md','utf8'); if(!text.includes('# Goal') || !text.includes('# Acceptance Criteria')) process.exit(1)" >/dev/null 2>&1 && pass "task brief includes required sections" || fail "task brief missing required sections"
check_text "$ROOT/TASK_BRIEF.md" "task brief documents queue triage rule" "# Queue Triage Rule"
check_text "$ROOT/TASK_BRIEF.md" "task brief keeps external blockers out of coding missions" "credentials, certificates, third-party account access, and physical-device checks"
node -e "const fs=require('fs'); const text=fs.readFileSync('$ROOT/docs/IMPLEMENTATION_PLAN.md','utf8'); if(!text.includes('## Phase 0') || !text.includes('## Phase 1')) process.exit(1)" >/dev/null 2>&1 && pass "implementation plan includes phases" || fail "implementation plan missing phases"
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('$ROOT/.zkcoder/project.json','utf8')); const phases=data.phases||{}; if(!phases.poc || !phases.mvp || !phases.final) process.exit(1)" >/dev/null 2>&1 && pass "project phases include poc/mvp/final" || fail "project phases missing poc/mvp/final"
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('$ROOT/.zkcoder/design-summary.json','utf8')); if(!data.goal || !Array.isArray(data.acceptanceCriteria) || data.acceptanceCriteria.length===0) process.exit(1)" >/dev/null 2>&1 && pass "design summary captures mission and acceptance criteria" || fail "design summary missing mission summary"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist includes storage and voice operator gates" "## 3a. Storage and voice operator gates"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist includes release-readiness verification before storage escalation" "npm run verify:release-readiness"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist documents local LiveKit target" "ws://127.0.0.1:7880"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist routes service deployment through docs index first" "Start with the service deployment index"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runtime runbook includes feature dependency operator gates" "### 1b. Feature dependency operator gates"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release readiness checklist references storage and voice operator gate sequence" "Storage and voice follow the operator-gate sequence"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release readiness checklist defines minimal web/API regression commands" "## Minimal Web/API Regression Commands"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release readiness checklist includes local commercial verify command" "pnpm local:commercial:verify"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release readiness checklist includes core web smoke command" "pnpm e2e:smoke:web:core"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release readiness checklist includes operator smoke inventory command" "npm run operator:smoke:inventory"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook points to minimal web/API regression command section" "Minimal Web/API Regression Commands"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist points to minimal web/API regression command section" "Minimal Web/API Regression Commands"
check_text "$ROOT/README.md" "root README includes service deployment operator path" "Service deployment / operator path"
check_package_script "$ROOT/package.json" "root package.json includes release:next script" "release:next"
check_package_script "$ROOT/package.json" "root package.json includes operator handoff check script" "operator:handoff:check"
check_package_script "$ROOT/package.json" "root package.json includes hardening verify script" "verify:hardening"
check_package_script "$ROOT/package.json" "root package.json includes release-readiness verify script" "verify:release-readiness"
check_package_script "$ROOT/package.json" "root package.json includes mobile selected-message AI smoke script" "mobile:maestro:selected-message-ai"
check_package_script "$ROOT/package.json" "root package.json includes mobile DM selected-message AI smoke script" "mobile:maestro:selected-message-ai:dm"
check_package_script "$ROOT/package.json" "root package.json includes mobile thread selected-message AI smoke script" "mobile:maestro:selected-message-ai:thread"
check_package_script "$ROOT/package.json" "root package.json includes operator smoke inventory script" "operator:smoke:inventory"
check_package_script "$ROOT/package.json" "root package.json includes local commercial verify script" "local:commercial:verify"
check_package_script "$ROOT/package.json" "root package.json includes web core smoke script" "e2e:smoke:web:core"
check_package_script "$ROOT/apps/api/package.json" "api package.json includes typecheck script" "typecheck"
check_package_script "$ROOT/apps/api/package.json" "api package.json includes test script" "test"
check_package_script "$ROOT/packages/shared/package.json" "shared package.json includes test script" "test"
check_package_script "$ROOT/apps/web/package.json" "web package.json includes typecheck script" "typecheck"
check_package_script "$ROOT/apps/web/package.json" "web package.json includes test script" "test"
check_package_script "$ROOT/e2e/package.json" "e2e package.json includes core smoke script" "test:smoke:core"
check_text "$ROOT/package.json" "root package.json routes web core smoke through contract runner" 'node scripts/run-core-smoke.mjs'
check_text "$ROOT/e2e/package.json" "e2e package.json routes core smoke through contract runner" 'node ../scripts/run-core-smoke.mjs'

echo "[verify] environment example checks..."
check_env_key "$ROOT/.env.example" "development env example includes DATABASE_URL" "DATABASE_URL"
check_env_key "$ROOT/.env.example" "development env example includes REDIS_URL" "REDIS_URL"
check_env_key "$ROOT/.env.example" "development env example includes S3_ENDPOINT" "S3_ENDPOINT"
check_env_key "$ROOT/.env.example" "development env example includes S3_ACCESS_KEY" "S3_ACCESS_KEY"
check_env_key "$ROOT/.env.example" "development env example includes S3_SECRET_KEY" "S3_SECRET_KEY"
check_env_key "$ROOT/.env.example" "development env example includes S3_BUCKET" "S3_BUCKET"
check_env_key "$ROOT/.env.example" "development env example includes S3_REGION" "S3_REGION"
check_env_key "$ROOT/.env.example" "development env example includes COOKIE_SECRET" "COOKIE_SECRET"
check_env_key "$ROOT/.env.example" "development env example includes MAGIC_LINK_SECRET" "MAGIC_LINK_SECRET"
check_env_key "$ROOT/.env.example" "development env example includes EMAIL_LINK_SECRET" "EMAIL_LINK_SECRET"
check_env_key "$ROOT/.env.example" "development env example includes NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_API_URL"
check_env_key "$ROOT/.env.example" "development env example includes NEXT_PUBLIC_WS_URL" "NEXT_PUBLIC_WS_URL"
check_env_key "$ROOT/.env.example" "development env example includes NEXT_PUBLIC_LIVEKIT_URL" "NEXT_PUBLIC_LIVEKIT_URL"
check_env_key_documented "$ROOT/.env.example" "development env example documents AI_PROVIDER" "AI_PROVIDER"
check_env_key_documented "$ROOT/.env.example" "development env example documents AI_API_KEY" "AI_API_KEY"
check_env_key_documented "$ROOT/.env.example" "development env example documents OPENROUTER_API_KEY" "OPENROUTER_API_KEY"
check_env_key_documented "$ROOT/.env.example" "development env example documents OPENROUTER_SITE_URL" "OPENROUTER_SITE_URL"
check_env_key_documented "$ROOT/.env.example" "development env example documents ZKTALK_PUBLIC_APP_URL" "ZKTALK_PUBLIC_APP_URL"
check_env_key_documented "$ROOT/.env.example" "development env example documents GEMINI_API_KEY" "GEMINI_API_KEY"
check_env_key_documented "$ROOT/.env.example" "development env example documents TRANSLATION_API_KEY" "TRANSLATION_API_KEY"
check_env_key_documented "$ROOT/.env.example" "development env example documents LIVEKIT_API_KEY" "LIVEKIT_API_KEY"
check_env_key_documented "$ROOT/.env.example" "development env example documents LIVEKIT_API_SECRET" "LIVEKIT_API_SECRET"
check_env_key "$ROOT/.env.production.example" "production env example includes POSTGRES_USER" "POSTGRES_USER"
check_env_key "$ROOT/.env.production.example" "production env example includes POSTGRES_PASSWORD" "POSTGRES_PASSWORD"
check_env_key "$ROOT/.env.production.example" "production env example includes POSTGRES_DB" "POSTGRES_DB"
check_env_key "$ROOT/.env.production.example" "production env example includes S3_ACCESS_KEY" "S3_ACCESS_KEY"
check_env_key "$ROOT/.env.production.example" "production env example includes S3_SECRET_KEY" "S3_SECRET_KEY"
check_env_key "$ROOT/.env.production.example" "production env example includes S3_BUCKET" "S3_BUCKET"
check_env_key "$ROOT/.env.production.example" "production env example includes S3_REGION" "S3_REGION"
check_env_key "$ROOT/.env.production.example" "production env example includes CORS_ORIGIN" "CORS_ORIGIN"
check_env_key "$ROOT/.env.production.example" "production env example includes COOKIE_SECRET" "COOKIE_SECRET"
check_env_key "$ROOT/.env.production.example" "production env example includes MAGIC_LINK_SECRET" "MAGIC_LINK_SECRET"
check_env_key "$ROOT/.env.production.example" "production env example includes EMAIL_LINK_SECRET" "EMAIL_LINK_SECRET"
check_env_key "$ROOT/.env.production.example" "production env example includes LIVEKIT_API_KEY" "LIVEKIT_API_KEY"
check_env_key "$ROOT/.env.production.example" "production env example includes LIVEKIT_API_SECRET" "LIVEKIT_API_SECRET"
check_env_key "$ROOT/.env.production.example" "production env example includes NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_API_URL"
check_env_key "$ROOT/.env.production.example" "production env example includes NEXT_PUBLIC_WS_URL" "NEXT_PUBLIC_WS_URL"
check_env_key "$ROOT/.env.production.example" "production env example includes NEXT_PUBLIC_LIVEKIT_URL" "NEXT_PUBLIC_LIVEKIT_URL"
check_env_key "$ROOT/.env.production.example" "production env example includes PORT" "PORT"
check_env_key "$ROOT/.env.production.example" "production env example includes AI_PROVIDER" "AI_PROVIDER"
check_env_key "$ROOT/.env.production.example" "production env example includes ZKTALK_PUBLIC_APP_URL" "ZKTALK_PUBLIC_APP_URL"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents S3_ENDPOINT" "S3_ENDPOINT"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents MAGIC_LINK_EXPIRY_MINUTES" "MAGIC_LINK_EXPIRY_MINUTES"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents OPENROUTER_API_KEY" "OPENROUTER_API_KEY"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents OPENROUTER_SITE_URL" "OPENROUTER_SITE_URL"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents AI_API_KEY" "AI_API_KEY"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents GEMINI_API_KEY" "GEMINI_API_KEY"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents TRANSLATION_API_KEY" "TRANSLATION_API_KEY"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_ID"
check_env_key_documented "$ROOT/.env.production.example" "production env example documents APPLE_CLIENT_ID" "APPLE_CLIENT_ID"

echo "[verify] release-readiness doc alignment..."
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook references repo-local verify command" ".zkcoder/scripts/verify.sh"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook documents hardening verify profile" "npm run verify:hardening"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook documents release-readiness verify profile" "npm run verify:release-readiness"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook includes mvp mission command" "node /Users/hyunokoh/Documents/Projects/zkCoder/repo/src/cli.mjs run --phase mvp"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook references runtime runbook authority" "production-runtime-runbook.md"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "runbook documents validation gap ledger rule" "Current validation gap ledger"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan references runtime runbook authority" "docs/production-runtime-runbook.md"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan references implementation plan authority" "docs/IMPLEMENTATION_PLAN.md"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan records core smoke command" "Current canonical core-path smoke"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan references core smoke contract" "e2e/core-smoke-contract.json"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan references critical path verification map" "critical-path-verification-map-2026-04-07.md"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan includes validation gap ledger" "Current validation gap ledger"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan records attachment open/save validation gap" "attachment open/save"
check_text "$ROOT/docs/COMMERCIALIZATION_PLAN.md" "commercialization plan records thin voice smoke gap" "thin seeded join check"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook includes readiness endpoint guidance" "/api/health/ready"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents operator traffic gate" "operator.trafficGate"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook distinguishes liveness from readiness" "scope: process"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents current readiness dependency boundary" "today that boundary is database plus Redis"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook includes runtime dependency matrix" "Runtime dependency matrix"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook explains storage outside readiness" "Attachment upload/download is degraded even if API readiness stays green"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook explains LiveKit outside readiness" "Voice/video join fails while baseline API traffic may remain ready"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents core smoke command" "pnpm e2e:smoke:web:core"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook references core smoke contract" "e2e/core-smoke-contract.json"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook references critical path verification map" "critical-path-verification-map-2026-04-07.md"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents external blocker boundary" "External blockers that still require humans"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook includes authority boundary" "Authority boundary"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents explicit loopback CORS rule" "it is not allowed automatically"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook includes deterministic local stack contract" "Deterministic local stack contract"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents local postgres contract" "postgresql://zktalk:zktalk@localhost:5432/zktalk"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents local redis contract" "redis://localhost:6379"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents local minio bucket contract" "zktalk-uploads"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents local livekit contract" "ws://127.0.0.1:7880"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents local stack bootstrap command" "pnpm local:commercial:stack"
check_text "$ROOT/.env.production.example" "production env example documents storage outside readiness" 'outside `/api/health/ready`'
check_text "$ROOT/.env.production.example" "production env example documents LiveKit outside readiness" "current API readiness does not probe LiveKit directly"
check_text "$ROOT/.env.production.example" "production env example documents aligned public-origin contract" "These must describe the same externally reachable deployment as CORS_ORIGIN."
check_text "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" "risk doc covers web composer and file preview flows" "web composer and file preview flows"
check_text "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" "risk doc includes verify command" ".zkcoder/scripts/verify.sh"
check_text "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" "risk doc distinguishes process liveness from readiness" "process-only liveness signal"
check_text "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" "risk doc includes validation gap section" "Validation Gaps To Keep Explicit"
check_text "$ROOT/docs/high-risk-touched-surfaces-2026-04-07.md" "risk doc points gaps back to commercialization plan" "Current validation gap ledger"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist tracks unsigned handoff state" "Ready for unsigned handoff: yes"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist tracks signed release blocker state" "Ready for signed production release: no"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist documents hardening verify profile" "npm run verify:hardening"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist documents release-readiness verify profile" "npm run verify:release-readiness"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist references core smoke contract" "e2e/core-smoke-contract.json"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist references runtime runbook authority" "production-runtime-runbook.md"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist documents current readiness dependency boundary" "today that boundary is database plus Redis"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist documents readiness exclusions" "object storage and LiveKit are still production dependencies, but they remain separate operator gates"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist requires startup summary verification" "startup_summary"
check_text "$ROOT/docs/current-blockers-2026-03-25.md" "blocker doc includes repo-level next-action command" "npm run release:next"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status keeps queue discipline explicit" "Queue discipline:"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status includes operator smoke shortlist command" "npm run operator:smoke:inventory"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status links first concrete feedback batch" "First concrete desktop batch"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status records queue item 264 doc anchors" "Queue item 264 source-of-truth docs:"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status records queue item 264 status" "Queue item 264 status: documented"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status records queue item 276 doc anchor" "Queue item 276 source-of-truth doc:"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status records queue item 276 status" "Queue item 276 status: documented"
check_text "$ROOT/docs/final-operator-checklist-2026-04-07.md" "final operator checklist keeps external gaps out of engineering queue" "keep it in blocker/operator docs instead of the engineering queue"
check_text "$ROOT/docs/README.md" "docs index references production runtime runbook" "Production runtime runbook"
check_text "$ROOT/docs/README.md" "docs index references current blockers" "Current blockers"
check_text "$ROOT/docs/README.md" "docs index references touched surface risk map" "High-risk touched surfaces (2026-04-07)"
check_text "$ROOT/docs/README.md" "docs index references commercialization plan" "Commercialization plan"
check_text "$ROOT/docs/README.md" "docs index references implementation plan" "Implementation plan"
check_text "$ROOT/docs/README.md" "docs index references zkCoder runbook" "zkCoder runbook"
check_text "$ROOT/docs/README.md" "docs index references local machine bridge loopback doc" "Local machine bridge loopback (2026-04-12)"
check_text "$ROOT/docs/README.md" "docs index references chat ux alignment inventory" "Chat UX alignment inventory (2026-04-12)"
check_text "$ROOT/docs/README.md" "docs index defines service deployment default path" "## Service deployment default path"
check_text "$ROOT/docs/README.md" "docs index includes hardening verify command" "npm run verify:hardening"
check_text "$ROOT/docs/README.md" "docs index includes release-readiness verify command" "npm run verify:release-readiness"
check_text "$ROOT/docs/README.md" "docs index includes operator smoke inventory command" "npm run operator:smoke:inventory"
check_text "$ROOT/docs/README.md" "docs index references core smoke contract" "e2e/core-smoke-contract.json"
check_text "$ROOT/docs/README.md" "docs index references critical path verification map" "Critical path verification map (2026-04-07)"
check_text "$ROOT/docs/README.md" "docs index includes authority map" "Authority map"
check_text "$ROOT/docs/README.md" "docs index points operators to runtime dependency notes" "runtime dependency matrix"
check_text "$ROOT/docs/README.md" "docs index points operators to deterministic local stack contract" "deterministic local stack contract"
check_text "$ROOT/docs/README.md" "docs index points operators to validation gap ledger" "validation gap ledger"
check_text "$ROOT/docs/README.md" "docs index points operators to lightly verified critical paths" "lightly verified"
check_text "$ROOT/docs/README.md" "docs index links first concrete AI-agent feedback batch" "AI-agent feedback batch: Cautious Organizer desktop-first (2026-04-08)"
check_text "$ROOT/docs/README.md" "docs index links mobile AI-agent feedback batch" "AI-agent feedback batch: Casual Member mobile-first (2026-04-08)"
check_text "$ROOT/docs/ai-agent-feedback-template.md" "feedback template requires evidence sources" "- Evidence sources:"
check_text "$ROOT/docs/ai-agent-feedback-runbook.md" "feedback runbook requires exact repo-local evidence" "exact repo-local evidence"
check_text "$ROOT/docs/ai-agent-feedback-summary-2026-04-08.md" "feedback summary records desktop and mobile evidence passes" "completed mobile evidence pass"
check_text "$ROOT/docs/ai-agent-feedback-summary-2026-04-08.md" "feedback summary references the concrete desktop batch" "Cautious Organizer desktop-first batch (2026-04-08)"
check_text "$ROOT/docs/ai-agent-feedback-summary-2026-04-08.md" "feedback summary references the concrete mobile batch" "Casual Member mobile-first batch (2026-04-08)"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md" "feedback batch records queue item 104 execution" "Queue item 104"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md" "feedback batch grounds findings in desktop harness evidence" "desktop-harness page"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md" "feedback batch records the trust finding" "hides the destination and message context"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md" "mobile feedback batch records queue item 105 execution" "Queue item 105"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md" "mobile feedback batch grounds findings in mobile smoke evidence" "mobile-p0-smoke.mjs"
check_text "$ROOT/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md" "mobile feedback batch keeps cross-device risk separate" "cross-device continuity is still unproven"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "zkCoder runbook points to deterministic local stack contract" "Deterministic local stack contract"
check_text "$ROOT/docs/ZKCODER_RUNBOOK.md" "zkCoder runbook references critical path verification map" "critical-path-verification-map-2026-04-07.md"
check_text "$ROOT/docs/local-machine-bridge-loopback-2026-04-12.md" "loopback doc includes operator steps" "## Operator steps"
check_text "$ROOT/docs/local-machine-bridge-loopback-2026-04-12.md" "loopback doc references repo-local verify command" ".zkcoder/scripts/verify.sh"
check_text "$ROOT/docs/api-reference.md" "api reference documents readiness endpoint" "GET /api/health/ready"
check_text "$ROOT/docs/api-reference.md" "api reference documents readiness exclusions" "green readiness does not guarantee attachment upload/download or voice join paths are healthy"
check_text "$ROOT/docs/api-reference.md" "api reference documents operator traffic gate" "\"trafficGate\""
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose requires explicit CORS origin" 'CORS_ORIGIN: ${CORS_ORIGIN:?set to the exact public web origin}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes EMAIL_LINK_SECRET to api" 'EMAIL_LINK_SECRET: ${EMAIL_LINK_SECRET:-change-this-in-production}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes AI provider selection to api" 'AI_PROVIDER: ${AI_PROVIDER:-}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes OpenRouter key to api" 'OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:-}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes Anthropic key to api" 'AI_API_KEY: ${AI_API_KEY:-}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes translation key to api" 'TRANSLATION_API_KEY: ${TRANSLATION_API_KEY:-}'
check_text "$ROOT/docker/docker-compose.prod.yml" "production compose passes public app origin to api" 'ZKTALK_PUBLIC_APP_URL: ${ZKTALK_PUBLIC_APP_URL:-}'
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist references critical path verification map" "critical-path-verification-map-2026-04-07.md"
check_text "$ROOT/docs/release-readiness-checklist-2026-03-25.md" "release checklist points service deployment to docs index and runtime runbook first" "For service deployment, start at"
check_text "$ROOT/docs/CURRENT_STATUS.md" "current status includes service deployment default path" "Service deployment default path:"
check_text "$ROOT/apps/mobile/src/components/MessageActionSheet.tsx" "mobile action sheet exposes a stable AI section hook" 'testID="message-action-sheet-ai-section"'
check_text "$ROOT/apps/mobile/src/components/MessageActionSheet.tsx" "mobile action sheet exposes a stable AI reply-draft hook" 'testID="message-action-sheet-ai-reply-draft"'
check_text "$ROOT/apps/mobile/src/components/MessageActionSheet.tsx" "mobile action sheet exposes a stable AI rewrite-draft hook" 'testID="message-action-sheet-ai-rewrite-draft"'
check_text "$ROOT/apps/mobile/src/components/MessageActionSheet.tsx" "mobile action sheet keeps reply and translate in the same inspectable flow" 'testID="message-action-sheet-reply"'
check_text "$ROOT/apps/mobile/src/components/MessageActionSheet.tsx" "mobile action sheet exposes inline translation in the same AI long-press flow" 'testID="message-action-sheet-ai-translate-inline"'
check_text "$ROOT/apps/mobile/src/screens/SettingsScreen.tsx" "mobile settings keeps language entry routed through the shared IA" 'testID="settings-language-entry"'
check_text "$ROOT/apps/mobile/src/screens/SettingsScreen.tsx" "mobile settings keeps AI entry routed through the shared IA" 'testID="settings-ai-entry"'
check_text "$ROOT/apps/mobile/src/screens/SettingsScreen.tsx" "mobile settings keeps machine control entry routed through the shared IA" 'testID="settings-machine-control-entry"'
check_text "$ROOT/apps/mobile/src/navigation/SettingsStack.tsx" "mobile settings stack exposes dedicated language settings screen" 'name="LanguageSettings"'
check_text "$ROOT/apps/mobile/src/navigation/SettingsStack.tsx" "mobile settings stack exposes shared AI and machine control screen" 'name="AiSettings"'
check_text "$ROOT/apps/mobile/src/screens/LanguageSettingsScreen.tsx" "mobile language settings keeps deterministic English option hook" 'testID={`language-option-${value}`}'
check_text "$ROOT/apps/mobile/src/screens/AiSettingsScreen.tsx" "mobile AI settings keeps deterministic translation preset hook" 'testID={`ai-settings-preset-${preset.id}`}'
check_text "$ROOT/apps/desktop/go-menu.js" "desktop go/help menu exposes localized connection settings copy" "connectionSettingsTitle: '데스크톱 연결 설정'"
check_text "$ROOT/apps/desktop/main.js" "desktop connection settings page resolves menu labels from the selected app locale" "const menuLabels = getDesktopMenuLabels(appLocale);"
check_text "$ROOT/apps/desktop/main.js" "desktop connection settings page uses localized retry action copy" "{ label: menuLabels.retryConnection, href: 'zktalk://retry' }"
check_text "$ROOT/apps/mobile/src/screens/ChannelScreen.tsx" "channel screen exposes a stable long-press target for selected-message AI smoke" 'testID={`channel-message-touchable-${item.id}`}'
check_text "$ROOT/apps/mobile/src/screens/DmScreen.tsx" "dm screen exposes a stable long-press target for selected-message AI smoke" 'testID={`dm-message-touchable-${item.id}`}'
check_text "$ROOT/apps/mobile/src/screens/ThreadScreen.tsx" "thread screen exposes a stable long-press target for selected-message AI smoke" 'testID={`thread-message-touchable-${item.id}`}'
check_text "$ROOT/apps/mobile/maestro/flows/channel-selected-message-ai-smoke.yaml" "mobile maestro flow exercises selected-message AI from the channel long-press path" 'message-action-sheet-ai-section'
check_text "$ROOT/apps/mobile/maestro/flows/channel-selected-message-ai-smoke.yaml" "mobile maestro flow verifies reply and translate stay in the same action sheet" 'message-action-sheet-ai-translate-inline'
check_text "$ROOT/apps/mobile/maestro/flows/dm-selected-message-ai-smoke.yaml" "mobile maestro flow exercises selected-message AI from the DM long-press path" 'message-action-sheet-ai-section'
check_text "$ROOT/apps/mobile/maestro/flows/dm-selected-message-ai-smoke.yaml" "mobile maestro flow keeps DM translate in the same inspectable sheet" 'message-action-sheet-ai-translate-inline'
check_text "$ROOT/apps/mobile/maestro/flows/thread-selected-message-ai-smoke.yaml" "mobile maestro flow exercises selected-message AI from the thread long-press path" 'message-action-sheet-ai-section'
check_text "$ROOT/apps/mobile/maestro/flows/thread-selected-message-ai-smoke.yaml" "mobile maestro flow keeps thread translate in the same inspectable sheet" 'message-action-sheet-ai-translate-inline'
check_text "$ROOT/scripts/mobile-maestro-smoke.mjs" "mobile maestro smoke script supports selected-message AI mode" "mode === 'selected-message-ai'"
check_text "$ROOT/scripts/mobile-maestro-smoke.mjs" "mobile maestro smoke script supports selected-message AI DM mode" "mode === 'selected-message-ai-dm'"
check_text "$ROOT/scripts/mobile-maestro-smoke.mjs" "mobile maestro smoke script supports selected-message AI thread mode" "mode === 'selected-message-ai-thread'"
run_command "operator handoff check passed" node "$ROOT/scripts/check-operator-handoff.mjs" --json
check_text "$ROOT/docs/critical-path-verification-map-2026-04-07.md" "critical path map references core smoke contract" "e2e/core-smoke-contract.json"
check_text "$ROOT/docs/critical-path-verification-map-2026-04-07.md" "critical path map calls out lightly verified paths" "lightly verified"
check_text "$ROOT/docs/critical-path-verification-map-2026-04-07.md" "critical path map records attachment verification boundary" "authenticated attachment open/save"
check_text "$ROOT/docs/critical-path-verification-map-2026-04-07.md" "critical path map records full voice session gap" "full operator-visible media session"
check_text "$ROOT/docs/critical-path-verification-map-2026-04-07.md" "critical path map records DM gap" "| DM |"
check_text "$ROOT/apps/desktop/RELEASE.md" "desktop release runbook documents arm64 installer output" "dist/zkTalk-win-arm64-0.0.1.exe"
check_text "$ROOT/apps/desktop/RELEASE.md" "desktop release runbook points operators to release manifest source of truth" "Use dist/release-manifest.json as the source of truth"
check_text "$ROOT/apps/desktop/RELEASE.md" "desktop release runbook documents artifact manifest extensions" "The manifest currently collects .dmg, .exe, and .blockmap outputs from dist/."
check_text "$ROOT/apps/desktop/RELEASE.md" "desktop release runbook keeps unsigned handoff separate from signing blockers" "The unsigned handoff flow is the correct operator path when signing credentials or devices are still unavailable."
check_text "$ROOT/apps/desktop/RELEASE.md" "desktop release runbook documents release bundle contents" "dist/release-bundle/ currently contains:"
check_operator_smoke_inventory "operator smoke inventory stays aligned with current contract and blocker split"

echo "[verify] repository context checks..."
git -C "$ROOT" status --short >/dev/null 2>&1 && pass "git status works" || fail "git status failed"
git -C "$ROOT" status --short | grep -q . && pass "working tree has visible context" || pass "working tree currently clean"

if [[ -f "$ROOT/.zkcoder/plan-queue.json" ]]; then
  node -e "JSON.parse(require('fs').readFileSync('$ROOT/.zkcoder/plan-queue.json','utf8'))" >/dev/null 2>&1 && pass "plan queue is valid JSON" || fail "plan queue is invalid JSON"
fi

node "$ROOT/.zkcoder/scripts/check-queue-surfaces.mjs" >/dev/null 2>&1 \
  && pass "queue items map to active high-risk repo surfaces" \
  || fail "queue items are missing high-risk surface mappings"

echo "[verify] run artifact checks..."
LATEST_RUN_FILE="$ROOT/.zkcoder/latest-run.json"
POINTER_RUN_DIR=""
sync_latest_run_file_to_newest "$ROOT"
NEWEST_RUN_DIR="$(find_newest_run_dir "$ROOT/.zkcoder/runs")"
ACTIVE_RUN_DIR=""

if [[ -f "$LATEST_RUN_FILE" ]]; then
  node -e "JSON.parse(require('fs').readFileSync('$LATEST_RUN_FILE','utf8'))" >/dev/null 2>&1 \
    && pass "latest-run.json is valid JSON" \
    || fail "latest-run.json is invalid JSON"

  POINTER_RUN_DIR="$(read_latest_run_dir "$LATEST_RUN_FILE")"

  if [[ -n "$POINTER_RUN_DIR" && -d "$POINTER_RUN_DIR" ]]; then
    pass "latest run directory exists"
  else
    fail "latest run directory missing"
    POINTER_RUN_DIR=""
  fi
else
  fail "latest-run.json missing"
fi

if [[ -n "$NEWEST_RUN_DIR" && -d "$NEWEST_RUN_DIR" ]]; then
  pass "newest run directory exists on disk"
else
  fail "no run directories were found under .zkcoder/runs"
  NEWEST_RUN_DIR=""
fi

if [[ -n "$POINTER_RUN_DIR" && -n "$NEWEST_RUN_DIR" ]]; then
  if [[ "$POINTER_RUN_DIR" == "$NEWEST_RUN_DIR" ]]; then
    pass "latest-run.json points to the newest run directory"
  else
    fail "latest-run.json does not point to the newest run directory"
    echo "[verify:info] latest-run.json=$POINTER_RUN_DIR"
    echo "[verify:info] newest-run-dir=$NEWEST_RUN_DIR"
  fi
fi

if [[ -n "$POINTER_RUN_DIR" ]]; then
  ACTIVE_RUN_DIR="$POINTER_RUN_DIR"
elif [[ -n "$NEWEST_RUN_DIR" ]]; then
  ACTIVE_RUN_DIR="$NEWEST_RUN_DIR"
fi

if [[ -n "$ACTIVE_RUN_DIR" ]]; then
  [[ -f "$ACTIVE_RUN_DIR/run-meta.json" ]] && pass "active run meta exists" || fail "active run meta missing"
  if [[ -f "$ACTIVE_RUN_DIR/before.git-status.txt" ]]; then
    node -e "const fs=require('fs'); const text=fs.readFileSync(process.argv[1],'utf8').trim(); if(text.length === 0) process.exit(1)" "$ACTIVE_RUN_DIR/before.git-status.txt" >/dev/null 2>&1 \
      && pass "active run captured the starting worktree snapshot" \
      || fail "active run starting worktree snapshot is empty"
    check_worktree_preservation "$ACTIVE_RUN_DIR/before.git-status.txt" "starting dirty worktree entries were preserved"
  else
    fail "active run starting worktree snapshot missing"
  fi

  RUN_IS_COMPLETE=0
  if [[ -f "$ACTIVE_RUN_DIR/after.git-status.txt" || -f "$ACTIVE_RUN_DIR/verify.result.json" || -f "$ACTIVE_RUN_DIR/run-summary.json" ]]; then
    RUN_IS_COMPLETE=1
  fi

  for note_file in "$ACTIVE_RUN_DIR/worklog.md" "$ACTIVE_RUN_DIR/final-notes.md"; do
    if [[ -f "$note_file" ]]; then
      if [[ $RUN_IS_COMPLETE -eq 1 ]]; then
        node -e "const fs=require('fs'); const text=fs.readFileSync(process.argv[1],'utf8').trim(); if(text.split(/\n/).length < 2 || text.length < 20) process.exit(1)" "$note_file" >/dev/null 2>&1 \
          && pass "$(basename "$note_file") has run content" \
          || fail "$(basename "$note_file") is still a placeholder"
      else
        pass "$(basename "$note_file") exists for in-progress run"
      fi
    else
      fail "$(basename "$note_file") missing"
    fi
  done
fi

echo "[verify] dependency-aware checks..."
check_mobile_selected_message_ai_contract "mobile selected-message AI contract is wired across DM/channel/thread surfaces"
check_mobile_channel_visibility_contract "mobile channel visibility contract stays aligned with shared locked/open browse state handling"
check_settings_language_alignment_contract "settings language alignment contract stays explicit across shared navigation, mobile surfaces, and bilingual web chrome"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue records the deterministic follow-up for item 277" "### 277. Remove the most visible mobile divergence in settings, navigation, and chat surfaces"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue keeps item 278 focused on repo-local stability" "### 278. Tighten mobile stability around login, restore, core navigation, and seeded verification lanes"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue keeps item 279 focused on product-facing translation and selected-message AI" "### 279. Make mobile translation and selected-message AI settings feel product-facing"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue keeps item 280 focused on deterministic repo-local verification" "### 280. Add deterministic repo-local verification for the remaining highest-risk mobile surfaces"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue includes a friction-to-queue ownership matrix" "## Friction-to-queue matrix"
check_text "$ROOT/docs/mobile-parity-queue-2026-04-13.md" "mobile parity queue keeps follow-up queue discipline explicit" "Treat each friction cluster in the matrix above as owned by exactly one next queue item."
check_text "$ROOT/apps/mobile/src/stores/auth.ts" "mobile auth store clears stale session token after bootstrap failure" "await removeToken();"
check_text "$ROOT/apps/mobile/App.tsx" "mobile app avoids infinite simulator auto-login retries for the same bad token" "stage: 'skipped-retrying-known-bad-token'"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents the narrow mobile session restore verification lane" "\`pnpm mobile:verify:session-restore\`"
check_text "$ROOT/docs/production-runtime-runbook.md" "production runbook documents the repo-local mobile parity verification lane" "\`pnpm mobile:verify:parity\`"
check_package_script "$ROOT/package.json" "package.json exposes mobile session restore verification command" "mobile:verify:session-restore"
check_package_script "$ROOT/package.json" "package.json exposes repo-local mobile parity verification command" "mobile:verify:parity"
check_package_script "$ROOT/package.json" "package.json exposes deterministic mobile contract test command" "test:mobile-risk-contracts"
check_text "$ROOT/package.json" "mobile session restore verification launches the standalone app under strict consume" "\"mobile:verify:session-restore\": \"node scripts/mobile-harness-regression.mjs --app standalone --mode channel --launch --strict-consume\""
check_text "$ROOT/package.json" "mobile parity verification lane bundles shared, web, and harness checks" "\"mobile:verify:parity\":"
check_text "$ROOT/package.json" "mobile deterministic contract test command runs the mobile contract and harness suites" "\"test:mobile-risk-contracts\": \"node --test scripts/mobile-risk-contract.test.mjs scripts/mobile-harness-regression.test.mjs\""
check_text "$ROOT/scripts/mobile-harness-regression.mjs" "mobile harness regression refuses strict consume without launch" "--strict-consume requires --launch so route consumption is actually verified."
check_text "$ROOT/scripts/mobile-harness-regression.mjs" "mobile harness regression waits for an auto-login marker before declaring restore success" "data?.loggedIn === true || data?.stage === 'already-logged-in'"
[[ -f "$ROOT/scripts/mobile-risk-contract.test.mjs" ]] && pass "mobile risk contract test exists" || fail "mobile risk contract test missing"
check_text "$ROOT/scripts/mobile-risk-contract.test.mjs" "mobile risk contract test covers settings IA" "mobile settings IA keeps dedicated language and AI routes with focused params"
check_text "$ROOT/scripts/mobile-risk-contract.test.mjs" "mobile risk contract test covers selected-message AI sheet parity" "mobile selected-message AI stays in one inspectable action sheet across channel, DM, and thread"
if command -v pnpm >/dev/null 2>&1; then
  pass "pnpm is installed"
elif command -v corepack >/dev/null 2>&1; then
  pass "corepack is available for pnpm activation"
else
  fail "neither pnpm nor corepack is available"
fi

if [[ -d "$ROOT/node_modules" ]]; then
  pass "node_modules exists"
  echo "[verify:info] profile=$VERIFY_PROFILE scope=$VERIFY_SCOPE"
  SHOULD_RUN_API=0
  SHOULD_RUN_SHARED=0
  SHOULD_RUN_WEB=0
  SHOULD_RUN_DESKTOP=0
  SHOULD_RUN_MOBILE=0
  SHOULD_RUN_RELEASE_NEXT=0
  SELECTED_API_TESTS=()
  SELECTED_SHARED_TESTS=()
  SELECTED_WEB_TESTS=()
  SELECTED_DESKTOP_TESTS=()
  SELECTED_MOBILE_TARGETS=()
  CHANGED_FILES=()
  while IFS= read -r changed_file; do
    CHANGED_FILES+=("$changed_file")
  done < <(collect_changed_files)

  if [[ "$VERIFY_SCOPE" == "all" ]]; then
    SHOULD_RUN_RELEASE_NEXT=1
  elif should_run_release_next_check "${CHANGED_FILES[@]}"; then
    SHOULD_RUN_RELEASE_NEXT=1
  fi

  case "$VERIFY_SCOPE" in
    all)
      SHOULD_RUN_API=1
      SHOULD_RUN_SHARED=1
      SHOULD_RUN_WEB=1
      SHOULD_RUN_DESKTOP=1
      SHOULD_RUN_MOBILE=1
      ;;
    selected-message-ai)
      SHOULD_RUN_SHARED=1
      SHOULD_RUN_WEB=1
      ;;
    api)
      SHOULD_RUN_API=1
      ;;
    shared)
      SHOULD_RUN_SHARED=1
      ;;
    web)
      SHOULD_RUN_WEB=1
      ;;
    docs)
      ;;
    changed)
      if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
        SHOULD_RUN_API=1
        SHOULD_RUN_WEB=1
      else
        select_changed_targets
        [[ ${#SELECTED_API_TESTS[@]} -gt 0 ]] && SHOULD_RUN_API=1
        [[ ${#SELECTED_SHARED_TESTS[@]} -gt 0 ]] && SHOULD_RUN_SHARED=1
        [[ ${#SELECTED_WEB_TESTS[@]} -gt 0 ]] && SHOULD_RUN_WEB=1
        [[ ${#SELECTED_DESKTOP_TESTS[@]} -gt 0 ]] && SHOULD_RUN_DESKTOP=1
        [[ ${#SELECTED_MOBILE_TARGETS[@]} -gt 0 ]] && SHOULD_RUN_MOBILE=1
      fi
      ;;
  esac

  if [[ ${#CHANGED_FILES[@]} -gt 0 ]]; then
    echo "[verify:info] scope=$VERIFY_SCOPE changed_files=${#CHANGED_FILES[@]}"
  else
    echo "[verify:info] scope=$VERIFY_SCOPE changed_files=0"
  fi

  if [[ $SHOULD_RUN_API -eq 1 ]]; then
    echo "[verify] running targeted api tests..."
    if [[ "$VERIFY_SCOPE" == "changed" && ${#CHANGED_FILES[@]} -gt 0 ]]; then
      echo "[verify:info] selected api targets=${#SELECTED_API_TESTS[@]}"
      run_package_tests "$ROOT/apps/api" "targeted api tests passed" "${SELECTED_API_TESTS[@]}"
    else
      run_package_tests "$ROOT/apps/api" "targeted api tests passed" "${API_TEST_TARGETS[@]}"
    fi
  else
    echo "[verify:info] skipping api tests for scope=$VERIFY_SCOPE"
  fi

  if [[ $SHOULD_RUN_SHARED -eq 1 ]]; then
    echo "[verify] running targeted shared tests..."
    if [[ "$VERIFY_SCOPE" == "selected-message-ai" ]]; then
      run_package_tests "$ROOT/packages/shared" "selected-message AI shared tests passed" "${SELECTED_MESSAGE_AI_SHARED_TEST_TARGETS[@]}"
    elif [[ "$VERIFY_SCOPE" == "changed" && ${#CHANGED_FILES[@]} -gt 0 ]]; then
      echo "[verify:info] selected shared targets=${#SELECTED_SHARED_TESTS[@]}"
      run_package_tests "$ROOT/packages/shared" "targeted shared tests passed" "${SELECTED_SHARED_TESTS[@]}"
    else
      run_package_tests "$ROOT/packages/shared" "targeted shared tests passed" "${SHARED_TEST_TARGETS[@]}"
    fi
  else
    echo "[verify:info] skipping shared tests for scope=$VERIFY_SCOPE"
  fi

  if [[ $SHOULD_RUN_WEB -eq 1 ]]; then
    echo "[verify] running targeted web tests..."
    if [[ "$VERIFY_SCOPE" == "selected-message-ai" ]]; then
      run_package_tests "$ROOT/apps/web" "selected-message AI web tests passed" "${SELECTED_MESSAGE_AI_WEB_TEST_TARGETS[@]}"
    elif [[ "$VERIFY_SCOPE" == "changed" && ${#CHANGED_FILES[@]} -gt 0 ]]; then
      echo "[verify:info] selected web targets=${#SELECTED_WEB_TESTS[@]}"
      run_package_tests "$ROOT/apps/web" "targeted web tests passed" "${SELECTED_WEB_TESTS[@]}"
    else
      run_package_tests "$ROOT/apps/web" "targeted web tests passed" "${WEB_TEST_TARGETS[@]}"
    fi
  else
    echo "[verify:info] skipping web tests for scope=$VERIFY_SCOPE"
  fi

  if [[ $SHOULD_RUN_DESKTOP -eq 1 ]]; then
    echo "[verify] running targeted desktop tests..."
    if [[ "$VERIFY_SCOPE" == "changed" && ${#CHANGED_FILES[@]} -gt 0 ]]; then
      echo "[verify:info] selected desktop targets=${#SELECTED_DESKTOP_TESTS[@]}"
      run_package_tests "$ROOT/apps/desktop" "targeted desktop tests passed" "${SELECTED_DESKTOP_TESTS[@]}"
    else
      run_package_tests "$ROOT/apps/desktop" "targeted desktop tests passed" "${DESKTOP_TEST_TARGETS[@]}"
    fi
  else
    echo "[verify:info] skipping desktop tests for scope=$VERIFY_SCOPE"
  fi

  if [[ $SHOULD_RUN_MOBILE -eq 1 ]]; then
    echo "[verify] running deterministic mobile contract tests..."
    run_command_in_dir "$ROOT" "mobile deterministic contract tests passed" pnpm run mobile:verify:parity
  else
    echo "[verify:info] skipping mobile contract tests for scope=$VERIFY_SCOPE"
  fi

  if [[ $SHOULD_RUN_API -eq 0 && $SHOULD_RUN_SHARED -eq 0 && $SHOULD_RUN_WEB -eq 0 && $SHOULD_RUN_DESKTOP -eq 0 && $SHOULD_RUN_MOBILE -eq 0 ]]; then
    pass "dependency-aware tests skipped because changed files did not touch mapped runtime surfaces"
  fi

  if [[ $SHOULD_RUN_RELEASE_NEXT -eq 1 ]]; then
    echo "[verify] refreshing release-next snapshots..."
    run_command_in_dir "$ROOT" "repo release-next snapshot refresh passed" node scripts/release-next.mjs --json
    sync_latest_run_file_to_newest "$ROOT"
  else
    echo "[verify:info] skipping release-next snapshot refresh for scope=$VERIFY_SCOPE"
  fi

  if [[ "$VERIFY_PROFILE" == "release" ]]; then
    echo "[verify] running broader release-readiness checks..."
    run_command "local commercial verify passed" pnpm --dir "$ROOT" run local:commercial:verify
    run_command "web core smoke passed" pnpm --dir "$ROOT" run e2e:smoke:web:core
  else
    echo "[verify:info] skipping broader release-readiness checks for profile=$VERIFY_PROFILE"
  fi
else
  echo "[verify:info] node_modules is missing; skipping repo build/test commands"
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
  echo "[verify] all checks passed"
  exit 0
fi

echo "[verify] $FAILURES check(s) failed"
exit 1
