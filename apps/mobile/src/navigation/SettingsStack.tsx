import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LinkedAccountsScreen from '../screens/LinkedAccountsScreen';
import QrScanScreen from '../screens/QrScanScreen';
import MyQrScreen from '../screens/MyQrScreen';
import BackupScreen from '../screens/BackupScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ApiKeysScreen from '../screens/ApiKeysScreen';
import { useTranslation } from '../lib/i18n';
import { colors } from '../theme';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundDark },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageSettingsScreen}
        options={{ title: t('settings.language') }}
      />
      <Stack.Screen
        name="AiSettings"
        component={AiSettingsScreen}
        options={{ title: t('settings.aiTranslation') }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('settings.editProfile') }}
      />
      <Stack.Screen
        name="LinkedAccounts"
        component={LinkedAccountsScreen}
        options={{ title: t('settings.linkedAccounts') }}
      />
      <Stack.Screen
        name="QrScan"
        component={QrScanScreen}
        options={{ title: t('settings.scanQr') }}
      />
      <Stack.Screen
        name="MyQr"
        component={MyQrScreen}
        options={{ title: t('settings.myQr') }}
      />
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{ title: t('settings.backup') }}
      />
      <Stack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: t('settings.bookmarks') }}
      />
      <Stack.Screen
        name="ApiKeys"
        component={ApiKeysScreen}
        options={{ title: t('apiKeys.title') }}
      />
    </Stack.Navigator>
  );
}
