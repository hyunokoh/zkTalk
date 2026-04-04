import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  claimSimulatorHarnessMarker,
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateForumPost'>;

export default function CreateForumPostScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const devCreateAttemptedRef = useRef(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      api<{
        thread: { id: string; rootMessageId: string };
      }>(`/api/channels/${route.params.channelId}/threads`, {
        method: 'POST',
        body: {
          title: title.trim(),
          bodyMarkdown: body.trim(),
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['forum-threads', route.params.channelId] });
      navigation.replace('ThreadScreen', {
        threadId: result.thread.id,
        channelId: route.params.channelId,
        communityId: route.params.communityId,
        channelName: route.params.channelName,
        rootMessageId: result.thread.rootMessageId,
      });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('forum.createError'),
      );
    },
  });

  const handleCreate = useCallback(() => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('forum.titleRequired'));
      return;
    }

    if (!body.trim()) {
      Alert.alert(t('common.error'), t('forum.bodyRequired'));
      return;
    }

    createMutation.mutate();
  }, [body, createMutation, t, title]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devCreateAttemptedRef.current) {
      return;
    }

    async function runDevCreateForumPost() {
      const parsed = await readSimulatorHarnessJson<
        | {
            title?: string;
            body?: string;
          }
        | undefined
      >('dev-create-forum-post.json');
      if (!parsed) {
        return;
      }

      devCreateAttemptedRef.current = true;
      await deleteSimulatorHarnessFile('dev-create-forum-post.json');

      setTitle(parsed?.title?.trim() || 'Simulator forum post test');
      setBody(parsed?.body?.trim() || 'Simulator forum post body');
    }

    void runDevCreateForumPost();
  }, []);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || !devCreateAttemptedRef.current || createMutation.isPending) {
      return;
    }

    if (!title.trim() || !body.trim()) {
      return;
    }

    async function submitDevCreateForumPost() {
      const claimed = await claimSimulatorHarnessMarker(
        'dev-create-forum-post-submitted.txt',
        title.trim(),
      );
      if (!claimed) {
        return;
      }

      createMutation.mutate();
    }

    void submitDevCreateForumPost();
  }, [body, createMutation, title]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>{t('forum.postTitle')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('forum.postTitlePlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={300}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('forum.postContent')}</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder={t('forum.postContentPlaceholder')}
            placeholderTextColor={colors.textDim}
            multiline
            textAlignVertical="top"
            maxLength={40000}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {createMutation.isPending ? t('forum.posting') : t('forum.createPost')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fs.lg,
  },
  bodyInput: {
    minHeight: 180,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
});
