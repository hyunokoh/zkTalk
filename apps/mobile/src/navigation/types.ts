import type { NavigatorScreenParams } from '@react-navigation/native';

// Home Stack
export type HomeStackParamList = {
  HomeScreen: {
    selectedCommunityId?: string;
    restoreChannelId?: string;
  } | undefined;
  CommunityMembers: {
    communityId: string;
    communityName?: string;
  };
  CommunityEvents: {
    communityId: string;
    communityName?: string;
  };
  EditCommunityEvent: {
    communityId: string;
    communityName?: string;
    eventId?: string;
  };
  EventAttendees: {
    communityId: string;
    eventId: string;
    eventTitle?: string;
  };
  EventDetails: {
    communityId: string;
    eventId: string;
    eventTitle?: string;
  };
  CommunityReports: {
    communityId: string;
    communityName?: string;
  };
  CommunityAuditLog: {
    communityId: string;
    communityName?: string;
  };
  CommunityOnboarding: {
    communityId: string;
    communityName?: string;
  };
  EditCommunity: {
    communityId: string;
    communityName?: string;
    iconUrl?: string | null;
    description?: string | null;
    visibility?: 'public' | 'invite_only' | 'private';
  };
  EditChannel: {
    channelId: string;
    communityId: string;
    channelName?: string;
  };
  ChannelPolls: {
    channelId: string;
    communityId?: string;
    channelName?: string;
  };
  CreatePoll: {
    channelId: string;
    channelName?: string;
  };
  ManageCategories: {
    communityId: string;
    communityName?: string;
  };
  ManageChannels: {
    communityId: string;
    communityName?: string;
  };
  ChannelPins: {
    channelId: string;
    channelName?: string;
    communityId?: string;
  };
  ChannelSearch: {
    channelId: string;
    communityId: string;
    channelName?: string;
  };
  ThreadScreen: {
    threadId: string;
    channelId: string;
    communityId?: string;
    channelName?: string;
    rootMessageId?: string;
    focusMessageId?: string;
  };
  ForumChannelScreen: {
    channelId: string;
    communityId: string;
    channelName?: string;
  };
  CreateForumPost: {
    channelId: string;
    communityId: string;
    channelName?: string;
  };
  JoinInvite: undefined;
  ChannelScreen: {
    channelId: string;
    communityId?: string;
    channelName?: string;
    focusMessageId?: string;
  };
  VoiceCallScreen: {
    channelId: string;
    channelName: string;
    communityId: string;
    startWithVideo?: boolean;
  };
  CreateCommunity: undefined;
  CreateChannel: { communityId: string };
};

// DM Stack
export type DmStackParamList = {
  DmListScreen: undefined;
  DmScreen: {
    conversationId: string;
    userId?: string;
    displayName?: string;
  };
};

// Friends Stack (single screen for now)
export type FriendsStackParamList = {
  FriendsScreen: undefined;
};

// Discover Stack
export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
};

// Settings Stack
export type SettingsStackParamList = {
  SettingsScreen:
    | {
        focusTarget?: 'main' | 'account' | 'notifications' | 'data_privacy';
      }
    | undefined;
  LanguageSettings: {
    focusTarget?: 'language';
  } | undefined;
  AiSettings:
    | {
        focusTarget?: 'ai_translation' | 'machine_control';
      }
    | undefined;
  EditProfile: undefined;
  LinkedAccounts: undefined;
  QrScan: undefined;
  MyQr: undefined;
  Backup: undefined;
  Bookmarks: undefined;
  ApiKeys: undefined;
  Cards: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  DmTab: NavigatorScreenParams<DmStackParamList>;
  FriendsTab: undefined;
  DiscoverTab: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// Root Navigator (auth switch)
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};
