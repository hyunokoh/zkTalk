import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DmListScreen from '../screens/DmListScreen';
import DmScreen from '../screens/DmScreen';
import { t } from '../lib/i18n';
import { colors } from '../theme';
import type { DmStackParamList } from './types';

const Stack = createNativeStackNavigator<DmStackParamList>();

export default function DmStack() {
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
        name="DmListScreen"
        component={DmListScreen}
        options={{ title: t('dm.title'), headerShown: false }}
      />
      <Stack.Screen
        name="DmScreen"
        component={DmScreen}
        options={({ route }) => ({ title: route.params.displayName ?? t('dm.message') })}
      />
    </Stack.Navigator>
  );
}
