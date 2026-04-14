import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('mobile settings IA keeps dedicated language and AI routes with focused params', () => {
  const settingsStack = readRepoFile('apps/mobile/src/navigation/SettingsStack.tsx');
  const settingsTypes = readRepoFile('apps/mobile/src/navigation/types.ts');
  const settingsScreen = readRepoFile('apps/mobile/src/screens/SettingsScreen.tsx');
  const languageSettings = readRepoFile('apps/mobile/src/screens/LanguageSettingsScreen.tsx');
  const aiSettings = readRepoFile('apps/mobile/src/screens/AiSettingsScreen.tsx');

  assert.match(settingsStack, /name="LanguageSettings"/);
  assert.match(settingsStack, /component=\{LanguageSettingsScreen\}/);
  assert.match(settingsStack, /name="AiSettings"/);
  assert.match(settingsStack, /component=\{AiSettingsScreen\}/);
  assert.match(settingsStack, /const \{ t \} = useTranslation\(\);/);
  assert.doesNotMatch(settingsStack, /import \{ t \} from '\.\.\/lib\/i18n';/);

  assert.match(
    settingsTypes,
    /SettingsScreen:\s*\|\s*\{\s*focusTarget\?: 'main' \| 'account' \| 'notifications' \| 'data_privacy';\s*\}\s*\|\s*undefined;/,
  );
  assert.match(settingsTypes, /LanguageSettings:\s*\{\s*focusTarget\?: 'language';\s*\}/);
  assert.match(
    settingsTypes,
    /AiSettings:\s*\|\s*\{\s*focusTarget\?: 'ai_translation' \| 'machine_control';\s*\}\s*\|\s*undefined;/,
  );

  assert.match(settingsScreen, /testID="settings-screen"/);
  assert.match(settingsScreen, /recordSectionOffset\('account'/);
  assert.match(settingsScreen, /recordSectionOffset\('notifications'/);
  assert.match(settingsScreen, /recordSectionOffset\('data_privacy'/);
  assert.match(settingsScreen, /testID="settings-language-entry"/);
  assert.match(settingsScreen, /navigation\.navigate\('LanguageSettings'\)/);
  assert.match(settingsScreen, /testID="settings-ai-entry"/);
  assert.match(settingsScreen, /testID="settings-machine-control-entry"/);
  assert.match(settingsScreen, /getMobileSettingsFocusTarget\('machine_control'\)/);

  assert.match(languageSettings, /testID="language-settings-open-home"/);
  assert.match(languageSettings, /testID="language-settings-translation-entry"/);
  assert.match(languageSettings, /testID="language-settings-machine-control-entry"/);
  assert.match(languageSettings, /getMobileSettingsFocusTarget\('ai_translation'\)/);
  assert.match(languageSettings, /getMobileSettingsFocusTarget\('machine_control'\)/);
  assert.match(languageSettings, /testID=\{`language-option-\$\{value\}`\}/);

  assert.match(aiSettings, /testID="ai-settings-screen"/);
  assert.match(aiSettings, /testID="ai-settings-open-language"/);
  assert.match(aiSettings, /testID="ai-settings-open-home"/);
  assert.match(aiSettings, /recordSectionOffset\('ai_translation'/);
  assert.match(aiSettings, /recordSectionOffset\('machine_control'/);
  assert.match(aiSettings, /testID=\{`ai-settings-preset-\$\{preset\.id\}`\}/);
  assert.match(aiSettings, /testID="ai-settings-custom-save"/);
});

test('mobile selected-message AI stays in one inspectable action sheet across channel, DM, and thread', () => {
  const actionSheet = readRepoFile('apps/mobile/src/components/MessageActionSheet.tsx');
  const channelScreen = readRepoFile('apps/mobile/src/screens/ChannelScreen.tsx');
  const dmScreen = readRepoFile('apps/mobile/src/screens/DmScreen.tsx');
  const threadScreen = readRepoFile('apps/mobile/src/screens/ThreadScreen.tsx');

  const aiSectionStart = actionSheet.indexOf('testID="message-action-sheet-ai-section"');
  const replyIndex = actionSheet.indexOf('testID="message-action-sheet-ai-reply-draft"');
  const rewriteIndex = actionSheet.indexOf('testID="message-action-sheet-ai-rewrite-draft"');
  const translateIndex = actionSheet.indexOf('testID="message-action-sheet-ai-translate-inline"');
  const replyActionIndex = actionSheet.indexOf('testID="message-action-sheet-reply"');

  assert.notEqual(aiSectionStart, -1);
  assert.notEqual(replyIndex, -1);
  assert.notEqual(rewriteIndex, -1);
  assert.notEqual(translateIndex, -1);
  assert.notEqual(replyActionIndex, -1);
  assert.ok(replyIndex > aiSectionStart, 'AI reply draft action should live inside the AI section.');
  assert.ok(
    rewriteIndex > replyIndex,
    'AI rewrite draft action should remain grouped after AI reply draft.',
  );
  assert.ok(
    translateIndex > rewriteIndex,
    'Inline translation should remain grouped in the same AI action section.',
  );
  assert.ok(
    replyActionIndex > translateIndex,
    'Standard reply should stay below the AI section so long-press AI flows remain inspectable.',
  );

  assert.match(channelScreen, /testID=\{`channel-message-touchable-\$\{item\.id\}`\}/);
  assert.match(dmScreen, /testID=\{`dm-message-touchable-\$\{item\.id\}`\}/);
  assert.match(threadScreen, /testID=\{`thread-message-touchable-\$\{item\.id\}`\}/);
});
