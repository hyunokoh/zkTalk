import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Platform, View, Image, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle, Path } from 'react-native-svg';
import HomeStack from './HomeStack';
import DmStack from './DmStack';
import SettingsStack from './SettingsStack';
import FriendsScreen from '../screens/FriendsScreen';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/auth';
import { colors } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type DmConversationSummaryRow = {
  unreadCount: number;
};

type FriendSummaryRow = {
  status: 'accepted' | 'pending' | 'blocked';
  isRequester: boolean;
};

function TabIcon({
  routeName,
  color,
  focused,
  displayName,
  avatarUrl,
}: {
  routeName: keyof MainTabParamList;
  color: string;
  focused: boolean;
  displayName?: string;
  avatarUrl?: string | null;
}) {
  const strokeWidth = focused ? 2.1 : 1.9;
  const initial = (displayName?.trim().charAt(0) || '?').toUpperCase();

  if (routeName === 'SettingsTab' && displayName) {
    return (
      <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.settingsAvatar} />
        ) : (
          <View style={styles.settingsAvatarFallback}>
            <Text style={styles.settingsAvatarInitial}>{initial}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {routeName === 'HomeTab' && (
          <>
            <Path d="M3 10.75L12 4l9 6.75" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M6.75 10.5V20h10.5v-9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {routeName === 'DmTab' && (
          <Path d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6A2.5 2.5 0 0116.5 16H10l-4.5 3v-3H7.5A2.5 2.5 0 015 13.5v-6z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {routeName === 'FriendsTab' && (
          <>
            <Path d="M15.5 19v-1.25A3.75 3.75 0 0011.75 14H7.5a3.75 3.75 0 00-3.75 3.75V19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="9.5" cy="8" r="3" stroke={color} strokeWidth={strokeWidth} />
            <Circle cx="16.5" cy="9" r="2.5" stroke={color} strokeWidth={strokeWidth} />
            <Path d="M19.75 19v-1a3.25 3.25 0 00-3.25-3.25h-1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {routeName === 'SettingsTab' && (
          <>
            <Path d="M12 3.75l1.15 2.33 2.58.38-1.86 1.82.44 2.57L12 9.77 9.69 10.85l.44-2.57-1.86-1.82 2.58-.38L12 3.75z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="12" cy="12" r="3.25" stroke={color} strokeWidth={strokeWidth} />
            <Path d="M5.5 13.2v-2.4l-1.75-1 1.25-2.17 2 .45 1.7-1.4-.15-2.05h2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.5 10.8v2.4l1.75 1-1.25 2.17-2-.45-1.7 1.4.15 2.05h-2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>
    </View>
  );
}

export default function MainTabs() {
  const queryClient = useQueryClient();
  const { lastEvent } = useWebSocket();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const dmSummaryQuery = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const result = await api<
        DmConversationSummaryRow[] | { conversations: DmConversationSummaryRow[] }
      >('/api/dm/conversations');
      return Array.isArray(result) ? result : result.conversations ?? [];
    },
  });
  const friendsSummaryQuery = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ friends: FriendSummaryRow[] }>('/api/friends'),
  });
  const unreadDmCount = useMemo(
    () =>
      (dmSummaryQuery.data ?? []).reduce(
        (sum, conversation) => sum + (conversation.unreadCount ?? 0),
        0,
      ),
    [dmSummaryQuery.data],
  );
  const pendingFriendRequestCount = useMemo(
    () =>
      (friendsSummaryQuery.data?.friends ?? []).filter(
        (friend) => friend.status === 'pending' && !friend.isRequester,
      ).length,
    [friendsSummaryQuery.data],
  );

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'message.created') {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
    }

    if (
      lastEvent.type === 'dm.message_created' ||
      lastEvent.type === 'dm.message_updated' ||
      lastEvent.type === 'dm.message_deleted' ||
      lastEvent.type === 'dm.conversation_created' ||
      lastEvent.type === 'dm.conversation_updated'
    ) {
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    }

    if (lastEvent.type === 'presence.updated') {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    }

    if (lastEvent.type === 'profile.updated') {
      const nextUser = lastEvent.payload.user;
      if (
        nextUser &&
        typeof nextUser === 'object' &&
        'id' in nextUser &&
        nextUser.id === user?.id
      ) {
        setUser(nextUser as typeof user);
      }
    }
  }, [lastEvent, queryClient, setUser, user?.id]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => (
          <TabIcon
            routeName={route.name}
            color={color}
            focused={focused}
            displayName={route.name === 'SettingsTab' ? user?.displayName : undefined}
            avatarUrl={route.name === 'SettingsTab' ? user?.avatarUrl : undefined}
          />
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarButtonTestID: 'main-tab-home',
        }}
      />
      <Tab.Screen
        name="DmTab"
        component={DmStack}
        options={{
          tabBarLabel: t('nav.dms'),
          tabBarBadge: unreadDmCount > 0 ? unreadDmCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
          tabBarButtonTestID: 'main-tab-dm',
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsScreen}
        options={{
          tabBarLabel: t('nav.friends'),
          tabBarBadge: pendingFriendRequestCount > 0 ? pendingFriendRequestCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
          headerShown: true,
          headerTitle: t('friends.title'),
          headerStyle: { backgroundColor: colors.backgroundDark },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
          tabBarButtonTestID: 'main-tab-friends',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: t('nav.settings'),
          tabBarButtonTestID: 'main-tab-settings',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#202225',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 92 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  tabIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabIconWrapActive: {
    backgroundColor: '#40444b',
  },
  settingsAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  settingsAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  settingsAvatarInitial: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#ff5d73',
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
