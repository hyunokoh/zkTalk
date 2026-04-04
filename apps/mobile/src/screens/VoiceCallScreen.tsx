import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// LiveKit native modules don't work in Expo Go - use lazy import
let AudioSession: { startAudioSession: () => Promise<void>; stopAudioSession: () => Promise<void> } | null = null;
let LiveKitRoom: React.ComponentType<any> | null = null;
let useRoomContext: (() => any) | null = null;
let useParticipants: (() => any[]) | null = null;
let useLocalParticipant: (() => any) | null = null;

try {
  const lkNative = require('@livekit/react-native');
  AudioSession = lkNative.AudioSession;
  const lkComponents = require('@livekit/components-react');
  LiveKitRoom = lkComponents.LiveKitRoom;
  useRoomContext = lkComponents.useRoomContext;
  useParticipants = lkComponents.useParticipants;
  useLocalParticipant = lkComponents.useLocalParticipant;
} catch {
  // LiveKit not available in Expo Go
}
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import { LIVEKIT_URL } from '../lib/network-config';
import { setLastVoiceChannelForCommunity } from '../lib/storage';
import { isNativeVoiceCallingAvailable } from '../lib/voice-runtime';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'VoiceCallScreen'>;

interface VoiceJoinResponse {
  token: string;
  url?: string;
  roomName?: string;
  participants?: ParticipantInfo[];
}

interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  hasCamera: boolean;
}

function ParticipantTile({ participant }: { participant: ParticipantInfo }) {
  const { t } = useTranslation();

  return (
    <View style={[styles.participantTile, participant.isSpeaking && styles.participantSpeaking]}>
      <View style={[styles.participantAvatar, participant.isMuted && styles.participantMuted]}>
        <Text style={styles.participantInitial}>
          {(participant.name || participant.identity).charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.participantName} numberOfLines={1}>
        {participant.name || participant.identity}
      </Text>
      {participant.isMuted && (
        <Text style={styles.mutedBadge}>{t('voice.muted')}</Text>
      )}
    </View>
  );
}

function CallControls({
  isMuted,
  isCameraOn,
  onToggleMute,
  onToggleCamera,
  onLeave,
}: {
  isMuted: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
        onPress={onToggleMute}
      >
        <Text style={styles.controlIcon}>{isMuted ? '\u{1F507}' : '\u{1F50A}'}</Text>
        <Text style={styles.controlLabel}>{isMuted ? t('voice.unmute') : t('voice.mute')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, isCameraOn && styles.controlButtonActive]}
        onPress={onToggleCamera}
      >
        <Text style={styles.controlIcon}>{isCameraOn ? '\u{1F4F7}' : '\u{1F4F5}'}</Text>
        <Text style={styles.controlLabel}>
          {isCameraOn ? t('voice.cameraOffShort') : t('voice.cameraOnShort')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, styles.leaveButton]}
        onPress={onLeave}
      >
        <Text style={styles.controlIcon}>{'\u{1F4DE}'}</Text>
        <Text style={[styles.controlLabel, styles.leaveLabel]}>{t('voice.leave')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function RoomView({
  channelName,
  startWithVideo,
  onLeave,
}: {
  channelName: string;
  startWithVideo: boolean;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const room = useRoomContext?.();
  const participants = useParticipants?.() ?? [];
  const localParticipant = useLocalParticipant?.();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!startWithVideo || isCameraOn || !localParticipant?.localParticipant) {
      return;
    }

    let cancelled = false;

    async function enableCamera() {
      try {
        await localParticipant.localParticipant.setCameraEnabled(true);
        if (!cancelled) {
          setIsCameraOn(true);
        }
      } catch {
        if (!cancelled) {
          Alert.alert(t('common.error'), t('voice.toggleCameraFailed'));
        }
      }
    }

    void enableCamera();

    return () => {
      cancelled = true;
    };
  }, [isCameraOn, localParticipant, startWithVideo, t]);

  const handleToggleMute = useCallback(async () => {
    try {
      if (localParticipant.localParticipant) {
        await localParticipant.localParticipant.setMicrophoneEnabled(isMuted);
        setIsMuted(!isMuted);
      }
    } catch {
      Alert.alert(t('common.error'), t('voice.toggleMicFailed'));
    }
  }, [isMuted, localParticipant, t]);

  const handleToggleCamera = useCallback(async () => {
    try {
      if (localParticipant.localParticipant) {
        await localParticipant.localParticipant.setCameraEnabled(!isCameraOn);
        setIsCameraOn(!isCameraOn);
      }
    } catch {
      Alert.alert(t('common.error'), t('voice.toggleCameraFailed'));
    }
  }, [isCameraOn, localParticipant, t]);

  const participantList: ParticipantInfo[] = useMemo(
    () =>
      participants.map((p) => ({
        identity: p.identity ?? t('common.unknown'),
        name: p.name ?? p.identity ?? t('common.unknown'),
        isSpeaking: p.isSpeaking,
        isMuted: !p.isMicrophoneEnabled,
        hasCamera: p.isCameraEnabled,
      })),
    [participants, t],
  );
  const filteredParticipantList = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return participantList;
    }

    return participantList.filter((participant) =>
      [participant.name, participant.identity]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [participantList, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.channelName}>{channelName}</Text>
        <Text style={styles.participantCount}>
          {t('voice.participants', { count: participantList.length })}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('voice.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filteredParticipantList}
        keyExtractor={(item) => item.identity}
        numColumns={2}
        contentContainerStyle={styles.participantGrid}
        columnWrapperStyle={styles.participantRow}
        renderItem={({ item }) => <ParticipantTile participant={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? t('voice.noSearchResults') : t('voice.waitingForOthers')}
            </Text>
            {searchQuery.trim() ? (
              <Text style={styles.emptySubtext}>{t('voice.noSearchResultsBody')}</Text>
            ) : null}
          </View>
        }
      />

      <CallControls
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onLeave={onLeave}
      />
    </SafeAreaView>
  );
}

export default function VoiceCallScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { channelId, channelName, communityId, startWithVideo = false } = route.params;
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLeftRef = useRef(false);
  const devActionAttemptedRef = useRef(false);

  const leaveVoice = useCallback(async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    try {
      await api(`/api/channels/${channelId}/voice/leave`, {
        method: 'POST',
      });
    } catch {
      // Best effort — leaving the room locally should still work
    } finally {
      await AudioSession?.stopAudioSession();
    }
  }, [channelId]);

  useEffect(() => {
    let cancelled = false;

    async function joinVoice() {
      try {
        // Start audio session for iOS
        await AudioSession?.startAudioSession();

        const data = await api<VoiceJoinResponse>(
          `/api/channels/${channelId}/voice/join`,
          { method: 'POST' },
        );

        const nextWsUrl = data.url ?? LIVEKIT_URL;
        if (!data.token || !nextWsUrl) {
          throw new Error(t('voice.invalidSession'));
        }

        if (!cancelled) {
          setToken(data.token);
          setWsUrl(nextWsUrl);
          setIsConnecting(false);
        }
        void setLastVoiceChannelForCommunity(communityId, channelId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('voice.joinFailed'));
          setIsConnecting(false);
        }
      }
    }

    joinVoice();

    return () => {
      cancelled = true;
      leaveVoice().catch(() => {});
    };
  }, [channelId, communityId, leaveVoice, t]);

  const handleLeave = useCallback(async () => {
    await leaveVoice();
    navigation.goBack();
  }, [leaveVoice, navigation]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }
    if (!token || !wsUrl) {
      return;
    }

    devActionAttemptedRef.current = true;

    async function runDevVoiceAction() {
      const action = await readSimulatorHarnessJson<{ type: 'cycle' }>('dev-voice-action.json');
      if (!action) return;

      try {
        if (action.type !== 'cycle') {
          throw new Error('Unsupported voice dev action');
        }

        const participants = await api<{ participants: Array<{ userId: string }> }>(
          `/api/channels/${channelId}/voice/participants`,
        );

        await leaveVoice();

        await writeSimulatorHarnessJson(
          'dev-voice-result.json',
          {
            ok: true,
            action: action.type,
            channelId,
            participantCount: participants.participants.length,
            wsUrl,
            hasToken: Boolean(token),
          },
        );

        navigation.goBack();
      } catch (devError) {
        await writeSimulatorHarnessJson(
          'dev-voice-result.json',
          {
            ok: false,
            error: devError instanceof Error ? devError.message : String(devError),
            channelId,
          },
        );
      }
    }

    void runDevVoiceAction();
  }, [channelId, leaveVoice, navigation, token, wsUrl]);

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('voice.connecting')}</Text>
          <Text style={styles.loadingSubtext}>{channelName}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>{'\u{26A0}\u{FE0F}'}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>{t('voice.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !wsUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>{'\u{26A0}\u{FE0F}'}</Text>
          <Text style={styles.errorText}>{t('voice.invalidSession')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>{t('voice.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!LiveKitRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>{'\u{1F4DE}'}</Text>
          <Text style={styles.errorText}>{t('voice.notAvailableTitle')}</Text>
          <Text style={styles.errorSubtext}>
            {isNativeVoiceCallingAvailable ? t('voice.notAvailable') : t('voice.notAvailableBody')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>{t('voice.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect
      options={{
        adaptiveStream: { pixelDensity: 'screen' },
      }}
    >
      <RoomView channelName={channelName} startWithVideo={startWithVideo} onLeave={handleLeave} />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  loadingText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.xl,
  },
  loadingSubtext: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.body,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorSubtext: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  channelName: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  participantCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.text,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  participantGrid: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  participantRow: {
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  participantTile: {
    alignItems: 'center',
    width: '45%',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  participantSpeaking: {
    borderColor: colors.success,
  },
  participantAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  participantMuted: {
    backgroundColor: colors.surfaceLight,
  },
  participantInitial: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  participantName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  mutedBadge: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
  },
  controlButtonActive: {
    backgroundColor: colors.surfaceLight,
  },
  leaveButton: {
    backgroundColor: colors.danger,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  leaveLabel: {
    color: colors.white,
  },
});
