import React, { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

import LoginScreen from './src/screens/LoginScreen';
import { MainTabs } from './src/navigation';
import { useTranslation } from './src/lib/i18n';
import { useAuthStore } from './src/stores/auth';
import { useWebSocketConnection } from './src/hooks/useWebSocket';
import { startNetworkListener, stopNetworkListener, processQueue } from './src/lib/offline-queue';
import { registerForPushNotifications, unregisterPushToken } from './src/lib/notifications';
import { wsManager } from './src/lib/websocket';
import { colors } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkBar from './src/components/NetworkBar';
import { getToken } from './src/lib/storage';
import type { RootStackParamList } from './src/navigation/types';
import { API_ORIGIN } from './src/lib/network-config';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessFile,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from './src/lib/simulator-harness';

const Stack = createNativeStackNavigator<RootStackParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Deep linking configuration
const linking = {
  prefixes: [Linking.createURL('/'), 'zktalk://'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              ChannelScreen: {
                path: 'channel/:channelId',
                parse: {
                  channelId: (channelId: string) => channelId,
                },
              },
            },
          },
          DmTab: {
            screens: {
              DmScreen: {
                path: 'dm/:conversationId',
                parse: {
                  conversationId: (conversationId: string) => conversationId,
                },
              },
            },
          },
          SettingsTab: {
            screens: {
              QrScan: 'qr-scan',
              MyQr: 'my-qr',
              Backup: 'backup',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginWithSessionToken = useAuthStore((s) => s.loginWithSessionToken);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const previousNavigationUserIdRef = useRef<string | null>(null);
  const autoLoginInFlightRef = useRef(false);
  const failedAutoLoginTokenRef = useRef<string | null>(null);
  const devRouteInFlightRef = useRef(false);
  const [isNavigationReady, setNavigationReady] = React.useState(false);

  // Connect WebSocket when authenticated
  useWebSocketConnection();

  useEffect(() => {
    useAuthStore.getState().fetchUser();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void useAuthStore.getState().fetchUser();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !isSimulatorHarnessEnabled) return;
    let cancelled = false;

    async function tryAutoLogin() {
      if (cancelled || autoLoginInFlightRef.current) {
        return;
      }

      autoLoginInFlightRef.current = true;
      const configuredToken = (
        (process.env.EXPO_PUBLIC_DEV_SESSION_TOKEN as string | undefined) ??
        (typeof Constants.expoConfig?.extra?.devSessionToken === 'string'
          ? Constants.expoConfig.extra.devSessionToken
          : '')
      ).trim();
      const fileToken = (await readSimulatorHarnessFile('dev-session-token.txt')).trim();
      const token = configuredToken || fileToken;

      try {
        await writeSimulatorHarnessJson(
          'auto-login-marker.txt',
          {
            apiOrigin: API_ORIGIN,
            stage: 'started',
          },
        );
        if (!token) {
          failedAutoLoginTokenRef.current = null;
          await writeSimulatorHarnessJson(
            'auto-login-marker.txt',
            {
              apiOrigin: API_ORIGIN,
              stage: 'no-token',
              configuredTokenLength: configuredToken.length,
              fileTokenLength: fileToken.length,
            },
          );
          return;
        }

        if (failedAutoLoginTokenRef.current === token) {
          await writeSimulatorHarnessJson(
            'auto-login-marker.txt',
            {
              apiOrigin: API_ORIGIN,
              stage: 'skipped-retrying-known-bad-token',
              tokenLength: token.length,
            },
          );
          return;
        }

        const storedToken = await getToken();
        if (storedToken === token && user) {
          failedAutoLoginTokenRef.current = null;
          await writeSimulatorHarnessJson(
            'auto-login-marker.txt',
            {
              apiOrigin: API_ORIGIN,
              stage: 'already-logged-in',
              loggedIn: true,
            },
          );
          return;
        }

        await writeSimulatorHarnessJson(
          'auto-login-marker.txt',
          {
            apiOrigin: API_ORIGIN,
            configuredTokenLength: configuredToken.length,
            fileTokenLength: fileToken.length,
            hasToken: Boolean(token),
            replacingSession: Boolean(storedToken && storedToken !== token),
          },
        );

        await loginWithSessionToken(token);
        failedAutoLoginTokenRef.current = null;
        await writeSimulatorHarnessJson(
          'auto-login-marker.txt',
          {
            apiOrigin: API_ORIGIN,
            configuredTokenLength: configuredToken.length,
            fileTokenLength: fileToken.length,
            hasToken: Boolean(token),
            loggedIn: true,
          },
        );
      } catch (err) {
        failedAutoLoginTokenRef.current = token;
        await writeSimulatorHarnessJson(
          'auto-login-marker.txt',
          {
            apiOrigin: API_ORIGIN,
            stage: 'failed-needs-new-token',
            tokenLength: token.length,
            error: err instanceof Error ? err.message : String(err),
          },
        );
        throw err;
      } finally {
        autoLoginInFlightRef.current = false;
      }
    }

    tryAutoLogin().catch((err) => {
      void writeSimulatorHarnessJson(
        'auto-login-marker.txt',
        {
          apiOrigin: API_ORIGIN,
          error: err instanceof Error ? err.message : String(err),
        },
      );
      console.warn('[App] Failed to auto-login simulator session:', err);
    });

    const interval = setInterval(() => {
      void tryAutoLogin();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoading, loginWithSessionToken, user]);

  useEffect(() => {
    if (!isNavigationReady || !navigationRef.current) {
      return;
    }

    const nextUserId = user?.id ?? null;
    if (previousNavigationUserIdRef.current === nextUserId) {
      return;
    }

    previousNavigationUserIdRef.current = nextUserId;

    // Clear user-scoped cache and reset navigation so a new login never lands
    // on a stale channel/DM route from a different account.
    queryClient.clear();

    if (nextUserId) {
      navigationRef.current.resetRoot({
        index: 0,
        routes: [
          {
            name: 'Main',
            params: {
              screen: 'HomeTab',
              params: {
                screen: 'HomeScreen',
              },
            },
          },
        ],
      });
      return;
    }

    navigationRef.current.resetRoot({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [isNavigationReady, user?.id]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || isLoading || !user) return;
    if (!isNavigationReady || !navigationRef.current) return;
    let cancelled = false;

    async function tryDevRoute() {
      if (cancelled || devRouteInFlightRef.current) {
        return;
      }

      devRouteInFlightRef.current = true;

      const routeData = await readSimulatorHarnessJson<
        | {
            type: 'home';
            communityId?: string;
          }
        | {
            type: 'createChannel';
            communityId?: string;
          }
        | {
            type: 'manageChannels';
            communityId?: string;
          }
        | {
            type: 'manageCategories';
            communityId?: string;
          }
        | {
            type: 'communityMembers';
            communityId?: string;
            communityName?: string;
          }
        | {
            type: 'communityEvents';
            communityId?: string;
            communityName?: string;
          }
        | {
            type: 'editCommunityEvent';
            communityId?: string;
            communityName?: string;
            eventId?: string;
          }
        | {
            type: 'communityReports';
            communityId?: string;
            communityName?: string;
          }
        | {
            type: 'communityAuditLog';
            communityId?: string;
            communityName?: string;
          }
        | {
            type: 'communityOnboarding';
            communityId?: string;
            communityName?: string;
          }
        | {
            type: 'editCommunity';
            communityId?: string;
            communityName?: string;
            iconUrl?: string | null;
            description?: string | null;
            visibility?: 'public' | 'invite_only' | 'private';
          }
        | {
            type: 'editChannel';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'channelPins';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'channelSearch';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'voiceCall';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'channel';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'dm';
            conversationId?: string;
            userId?: string;
            displayName?: string;
          }
        | {
            type: 'event';
            communityId?: string;
            eventId?: string;
            eventTitle?: string;
          }
        | {
            type: 'eventAttendees';
            communityId?: string;
            eventId?: string;
            eventTitle?: string;
          }
        | {
            type: 'polls';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'createPoll';
            channelId?: string;
            channelName?: string;
          }
        | {
            type: 'forum';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'createForumPost';
            channelId?: string;
            communityId?: string;
            channelName?: string;
          }
        | {
            type: 'thread';
            threadId?: string;
            channelId?: string;
            communityId?: string;
            channelName?: string;
            rootMessageId?: string;
          }
        | {
            type: 'inbox';
          }
        | {
            type: 'bookmarks';
          }
        | {
            type: 'friends';
          }
        | {
            type: 'dmList';
          }
        | {
            type: 'settings';
          }
        | {
            type: 'backup';
          }
        | {
            type: 'joinInvite';
          }
        | {
            type: 'editProfile';
          }
        | {
            type: 'linkedAccounts';
          }
        | {
            type: 'createCommunity';
          }
        | {
            type: 'discover';
          }
        | {
            type: 'myQr';
          }
        | {
            type: 'qrScan';
          }
      >('dev-route.json');
      if (!routeData || cancelled) {
        devRouteInFlightRef.current = false;
        return;
      }

      try {
        const writeMarker = async (data: Record<string, unknown>) =>
          writeSimulatorHarnessJson('dev-route-result.json', data, true);

        if (routeData?.type === 'home') {
          await writeMarker({ matched: 'home', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'HomeScreen',
              ...(routeData.communityId
                ? {
                    params: {
                      selectedCommunityId: routeData.communityId,
                    },
                  }
                : {}),
            },
          });
        } else if (routeData?.type === 'createChannel' && routeData.communityId) {
          await writeMarker({ matched: 'createChannel', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CreateChannel',
              params: {
                communityId: routeData.communityId,
              },
            },
          });
        } else if (routeData?.type === 'manageChannels' && routeData.communityId) {
          await writeMarker({ matched: 'manageChannels', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ManageChannels',
              params: {
                communityId: routeData.communityId,
              },
            },
          });
        } else if (routeData?.type === 'manageCategories' && routeData.communityId) {
          await writeMarker({ matched: 'manageCategories', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ManageCategories',
              params: {
                communityId: routeData.communityId,
              },
            },
          });
        } else if (routeData?.type === 'communityMembers' && routeData.communityId) {
          await writeMarker({ matched: 'communityMembers', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CommunityMembers',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
              },
            },
          });
        } else if (routeData?.type === 'communityEvents' && routeData.communityId) {
          await writeMarker({ matched: 'communityEvents', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CommunityEvents',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
              },
            },
          });
        } else if (routeData?.type === 'editCommunityEvent' && routeData.communityId) {
          await writeMarker({ matched: 'editCommunityEvent', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'EditCommunityEvent',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
                eventId: routeData.eventId,
              },
            },
          });
        } else if (routeData?.type === 'communityReports' && routeData.communityId) {
          await writeMarker({ matched: 'communityReports', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CommunityReports',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
              },
            },
          });
        } else if (routeData?.type === 'communityAuditLog' && routeData.communityId) {
          await writeMarker({ matched: 'communityAuditLog', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CommunityAuditLog',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
              },
            },
          });
        } else if (routeData?.type === 'communityOnboarding' && routeData.communityId) {
          await writeMarker({ matched: 'communityOnboarding', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CommunityOnboarding',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
              },
            },
          });
        } else if (routeData?.type === 'editCommunity' && routeData.communityId) {
          await writeMarker({ matched: 'editCommunity', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'EditCommunity',
              params: {
                communityId: routeData.communityId,
                communityName: routeData.communityName,
                iconUrl: routeData.iconUrl ?? null,
                description: routeData.description ?? null,
                visibility: routeData.visibility,
              },
            },
          });
        } else if (
          routeData?.type === 'editChannel' &&
          routeData.channelId &&
          routeData.communityId &&
          routeData.channelName
        ) {
          await writeMarker({ matched: 'editChannel', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'EditChannel',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (routeData?.type === 'channelPins' && routeData.channelId) {
          await writeMarker({ matched: 'channelPins', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ChannelPins',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (
          routeData?.type === 'channelSearch' &&
          routeData.channelId &&
          routeData.communityId
        ) {
          await writeMarker({ matched: 'channelSearch', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ChannelSearch',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (
          routeData?.type === 'voiceCall' &&
          routeData.channelId &&
          routeData.communityId &&
          routeData.channelName
        ) {
          await writeMarker({ matched: 'voiceCall', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'VoiceCallScreen',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (routeData?.type === 'channel' && routeData.channelId) {
          await writeMarker({ matched: 'channel', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ChannelScreen',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (routeData?.type === 'dm' && routeData.conversationId) {
          await writeMarker({ matched: 'dm', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'DmTab',
            params: {
              screen: 'DmScreen',
              params: {
                conversationId: routeData.conversationId,
                userId: routeData.userId,
                displayName: routeData.displayName,
              },
            },
          });
        } else if (routeData?.type === 'dmList') {
          await writeMarker({ matched: 'dmList', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'DmTab',
            params: {
              screen: 'DmListScreen',
            },
          });
        } else if (routeData?.type === 'event' && routeData.eventId && routeData.communityId) {
          await writeMarker({ matched: 'event', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'EventDetails',
              params: {
                communityId: routeData.communityId,
                eventId: routeData.eventId,
                eventTitle: routeData.eventTitle,
              },
            },
          });
        } else if (
          routeData?.type === 'eventAttendees' &&
          routeData.eventId &&
          routeData.communityId
        ) {
          await writeMarker({ matched: 'eventAttendees', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'EventAttendees',
              params: {
                communityId: routeData.communityId,
                eventId: routeData.eventId,
                eventTitle: routeData.eventTitle,
              },
            },
          });
        } else if (routeData?.type === 'polls' && routeData.channelId) {
          await writeMarker({ matched: 'polls', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ChannelPolls',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (routeData?.type === 'createPoll' && routeData.channelId) {
          await writeMarker({ matched: 'createPoll', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CreatePoll',
              params: {
                channelId: routeData.channelId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (routeData?.type === 'forum' && routeData.channelId && routeData.communityId) {
          await writeMarker({ matched: 'forum', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ForumChannelScreen',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (
          routeData?.type === 'createForumPost' &&
          routeData.channelId &&
          routeData.communityId
        ) {
          await writeMarker({ matched: 'createForumPost', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CreateForumPost',
              params: {
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
              },
            },
          });
        } else if (
          routeData?.type === 'thread' &&
          routeData.threadId &&
          routeData.channelId
        ) {
          await writeMarker({ matched: 'thread', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ThreadScreen',
              params: {
                threadId: routeData.threadId,
                channelId: routeData.channelId,
                communityId: routeData.communityId,
                channelName: routeData.channelName,
                rootMessageId: routeData.rootMessageId,
              },
            },
          });
        } else if (routeData?.type === 'inbox') {
          await writeMarker({ matched: 'inbox', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'DmTab',
            params: {
              screen: 'DmListScreen',
            },
          });
        } else if (routeData?.type === 'bookmarks') {
          await writeMarker({ matched: 'bookmarks', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'Bookmarks',
            },
          });
        } else if (routeData?.type === 'friends') {
          await writeMarker({ matched: 'friends', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'FriendsTab',
          });
        } else if (routeData?.type === 'backup') {
          await writeMarker({ matched: 'backup', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'Backup',
            },
          });
        } else if (routeData?.type === 'settings') {
          await writeMarker({ matched: 'settings', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'SettingsScreen',
            },
          });
        } else if (routeData?.type === 'joinInvite') {
          await writeMarker({ matched: 'joinInvite', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'JoinInvite',
            },
          });
        } else if (routeData?.type === 'editProfile') {
          await writeMarker({ matched: 'editProfile', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'EditProfile',
            },
          });
        } else if (routeData?.type === 'linkedAccounts') {
          await writeMarker({ matched: 'linkedAccounts', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'LinkedAccounts',
            },
          });
        } else if (routeData?.type === 'createCommunity') {
          await writeMarker({ matched: 'createCommunity', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'CreateCommunity',
            },
          });
        } else if (routeData?.type === 'discover') {
          await writeMarker({ matched: 'discover->home', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'HomeScreen',
            },
          });
        } else if (routeData?.type === 'myQr') {
          await writeMarker({ matched: 'myQr', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'MyQr',
            },
          });
        } else if (routeData?.type === 'qrScan') {
          await writeMarker({ matched: 'qrScan', routeData });
          navigationRef.current?.navigate('Main', {
            screen: 'SettingsTab',
            params: {
              screen: 'QrScan',
            },
          });
        } else {
          await writeMarker({ matched: null, routeData });
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-route.json');
        devRouteInFlightRef.current = false;
      }
    }

    void tryDevRoute();
    const interval = setInterval(() => {
      void tryDevRoute();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoading, isNavigationReady, user]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (!user) {
      const previousUserId = previousUserIdRef.current;
      wsManager.disconnect();
      if (previousUserId) {
        unregisterPushToken().catch((err) => {
          console.warn('[App] Failed to unregister push token:', err);
        });
      }
      previousUserIdRef.current = null;
      return;
    }

    previousUserIdRef.current = user.id;

    registerForPushNotifications().catch((err) => {
      console.warn('[App] Failed to register push notifications:', err);
    });
  }, [user]);

  // Start offline queue network listener
  useEffect(() => {
    startNetworkListener((count) => {
      if (count > 0) {
        Alert.alert(
          t('offlineQueue.sentTitle'),
          t('offlineQueue.sentBody', { count }),
        );
      }
    });

    // Process any existing queue on app start
    processQueue();

    return () => {
      stopNetworkListener();
    };
  }, [t]);

  // Handle notification taps for deep linking
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | {
              channelId?: string;
              communityId?: string;
              channelName?: string;
              conversationId?: string;
              userId?: string;
              displayName?: string;
            }
          | undefined;

        if (!data || !navigationRef.current) return;

        // Navigate using the nested tab structure
        if (data.channelId) {
          navigationRef.current.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'ChannelScreen',
              params: {
                channelId: data.channelId,
                communityId: data.communityId ?? '',
                channelName: data.channelName ?? '',
              },
            },
          });
        } else if (data.conversationId) {
          navigationRef.current.navigate('Main', {
            screen: 'DmTab',
            params: {
              screen: 'DmScreen',
              params: {
                conversationId: data.conversationId,
                userId: data.userId ?? '',
                displayName: data.displayName ?? '',
              },
            },
          });
        }
      },
    );

    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return null; // Splash screen shows here
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NetworkBar />
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={() => setNavigationReady(true)}
          >
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              {user ? (
                <Stack.Screen name="Main" component={MainTabs} />
              ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
