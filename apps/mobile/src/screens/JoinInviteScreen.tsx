import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'JoinInvite'>;

interface JoinInviteResponse {
  membership?: {
    communityId?: string;
  };
}

function normalizeInviteCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const invitePathMatch = trimmed.match(/\/invite(?:s)?\/([a-zA-Z0-9_-]+)/i);
  if (invitePathMatch?.[1]) {
    return invitePathMatch[1];
  }

  const codeLabelMatch = trimmed.match(/code[:\s]+([a-zA-Z0-9_-]+)/i);
  if (codeLabelMatch?.[1]) {
    return codeLabelMatch[1];
  }

  const compact = trimmed.replace(/\s+/g, ' ');
  const tokens = compact.match(/[a-zA-Z0-9_-]{6,32}/g);
  if (!tokens?.length) {
    return trimmed;
  }

  return tokens[tokens.length - 1] ?? trimmed;
}

export default function JoinInviteScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState('');

  const joinMutation = useMutation({
    mutationFn: (code: string) =>
      api<JoinInviteResponse>(`/api/invites/${encodeURIComponent(code)}/join`, {
        method: 'POST',
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['communities'] });
      navigation.replace('HomeScreen', {
        selectedCommunityId: result.membership?.communityId,
      });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.joinInviteFailed'),
      );
    },
  });

  const handleJoin = useCallback(() => {
    const code = normalizeInviteCode(inviteCode);
    if (!code) {
      Alert.alert(t('common.error'), t('community.inviteCodeRequired'));
      return;
    }
    joinMutation.mutate(code);
  }, [inviteCode, joinMutation, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type?: 'join'; code?: string }>(
        'dev-join-invite-action.json',
      );
      if (!action) return;

      try {
        if (action.type !== 'join' || !action.code) return;
        setInviteCode(action.code);
        joinMutation.mutate(normalizeInviteCode(action.code));
      } finally {
        await deleteSimulatorHarnessFile('dev-join-invite-action.json');
      }
    }

    void runDevAction();
  }, [joinMutation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('community.joinInviteTitle')}</Text>
        <Text style={styles.subtitle}>{t('community.joinInviteBody')}</Text>

        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder={t('community.inviteCodePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>{t('community.inviteCodeHint')}</Text>

        <TouchableOpacity
          style={[styles.button, joinMutation.isPending && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {joinMutation.isPending ? t('community.joiningInvite') : t('community.joinInviteCta')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.white,
    fontSize: fontSize.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
