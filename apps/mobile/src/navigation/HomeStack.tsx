import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityAuditLogScreen from '../screens/CommunityAuditLogScreen';
import CommunityEventsScreen from '../screens/CommunityEventsScreen';
import CommunityMembersScreen from '../screens/CommunityMembersScreen';
import CommunityOnboardingScreen from '../screens/CommunityOnboardingScreen';
import CommunityReportsScreen from '../screens/CommunityReportsScreen';
import EditCommunityEventScreen from '../screens/EditCommunityEventScreen';
import EventAttendeesScreen from '../screens/EventAttendeesScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import EditCommunityScreen from '../screens/EditCommunityScreen';
import EditChannelScreen from '../screens/EditChannelScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import ManageChannelsScreen from '../screens/ManageChannelsScreen';
import HomeScreen from '../screens/HomeScreen';
import ChannelScreen from '../screens/ChannelScreen';
import ChannelPollsScreen from '../screens/ChannelPollsScreen';
import ChannelPinsScreen from '../screens/ChannelPinsScreen';
import ChannelSearchScreen from '../screens/ChannelSearchScreen';
import ForumChannelScreen from '../screens/ForumChannelScreen';
import CreateForumPostScreen from '../screens/CreateForumPostScreen';
import ThreadScreen from '../screens/ThreadScreen';
import JoinInviteScreen from '../screens/JoinInviteScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import CreateCommunityScreen from '../screens/CreateCommunityScreen';
import CreateChannelScreen from '../screens/CreateChannelScreen';
import { t } from '../lib/i18n';
import { colors } from '../theme';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
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
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: t('app.name'), headerShown: false }}
      />
      <Stack.Screen
        name="CommunityMembers"
        component={CommunityMembersScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('community.membersTitle', { name: route.params.communityName })
            : t('community.membersDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="CommunityEvents"
        component={CommunityEventsScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('community.eventsTitle', { name: route.params.communityName })
            : t('community.eventsDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="EditCommunityEvent"
        component={EditCommunityEventScreen}
        options={({ route }) => ({
          title: route.params.eventId ? t('event.edit') : t('event.create'),
        })}
      />
      <Stack.Screen
        name="EventAttendees"
        component={EventAttendeesScreen}
        options={({ route }) => ({
          title: route.params.eventTitle
            ? t('event.attendeesTitle', { title: route.params.eventTitle })
            : t('event.attendeesDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={({ route }) => ({
          title: route.params.eventTitle ?? t('event.detailsDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="CommunityReports"
        component={CommunityReportsScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('community.reportsTitle', { name: route.params.communityName })
            : t('community.reportsDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="CommunityAuditLog"
        component={CommunityAuditLogScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('community.auditLogTitle', { name: route.params.communityName })
            : t('community.auditLogDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="CommunityOnboarding"
        component={CommunityOnboardingScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('community.onboardingTitle', { name: route.params.communityName })
            : t('community.onboardingDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="EditCommunity"
        component={EditCommunityScreen}
        options={{ title: t('community.edit') }}
      />
      <Stack.Screen
        name="EditChannel"
        component={EditChannelScreen}
        options={{ title: t('channel.edit') }}
      />
      <Stack.Screen
        name="ChannelPolls"
        component={ChannelPollsScreen}
        options={({ route }) => ({
          title: route.params.channelName
            ? t('poll.titleWithChannel', { name: route.params.channelName })
            : t('poll.title'),
        })}
      />
      <Stack.Screen
        name="CreatePoll"
        component={CreatePollScreen}
        options={{ title: t('poll.create') }}
      />
      <Stack.Screen
        name="ManageCategories"
        component={ManageCategoriesScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('channel.categoriesTitle', { name: route.params.communityName })
            : t('channel.categoriesDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="ManageChannels"
        component={ManageChannelsScreen}
        options={({ route }) => ({
          title: route.params.communityName
            ? t('channel.orderTitle', { name: route.params.communityName })
            : t('channel.orderDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="ChannelScreen"
        component={ChannelScreen}
        options={({ route }) => ({ title: `# ${route.params.channelName ?? t('nav.channel')}` })}
      />
      <Stack.Screen
        name="ChannelPins"
        component={ChannelPinsScreen}
        options={({ route }) => ({
          title: route.params.channelName
            ? t('channel.pinsTitle', { name: route.params.channelName })
            : t('channel.pinsDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="ChannelSearch"
        component={ChannelSearchScreen}
        options={({ route }) => ({
          title: route.params.channelName
            ? t('channel.searchTitle', { name: route.params.channelName })
            : t('channel.searchDefaultTitle'),
        })}
      />
      <Stack.Screen
        name="ThreadScreen"
        component={ThreadScreen}
        options={{ title: t('message.thread') }}
      />
      <Stack.Screen
        name="ForumChannelScreen"
        component={ForumChannelScreen}
        options={({ route }) => ({
          title: route.params.channelName ? `# ${route.params.channelName}` : t('channel.typeForum'),
        })}
      />
      <Stack.Screen
        name="CreateForumPost"
        component={CreateForumPostScreen}
        options={{ title: t('forum.createPost') }}
      />
      <Stack.Screen
        name="JoinInvite"
        component={JoinInviteScreen}
        options={{ title: t('community.joinInviteTitle') }}
      />
      <Stack.Screen
        name="VoiceCallScreen"
        component={VoiceCallScreen}
        options={({ route }) => ({
          title: route.params.channelName,
          headerStyle: { backgroundColor: colors.black },
          contentStyle: { backgroundColor: colors.black },
        })}
      />
      <Stack.Screen
        name="CreateCommunity"
        component={CreateCommunityScreen}
        options={{ title: t('community.create') }}
      />
      <Stack.Screen
        name="CreateChannel"
        component={CreateChannelScreen}
        options={{ title: t('channel.create') }}
      />
    </Stack.Navigator>
  );
}
