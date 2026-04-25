import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import { colors, spacing, borderRadius, fontSize as fs } from '../theme';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface IssuedApiKey extends Omit<ApiKey, 'lastUsedAt' | 'revokedAt'> {
  plaintextKey: string;
}

const DEFAULT_SCOPES = ['me:read', 'messages:read'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ApiKeysScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      api<{ keys: ApiKey[]; availableScopes: string[] }>('/api/api-keys'),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api<{ key: IssuedApiKey }>('/api/api-keys', {
        method: 'POST',
        body: { name, scopes: selectedScopes },
      }),
    onSuccess: (res) => {
      setIssued(res.key);
      setName('');
      setSelectedScopes(DEFAULT_SCOPES);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) =>
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to create API key',
      ),
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) =>
      api(`/api/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (err) =>
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to revoke key',
      ),
  });

  const confirmRevoke = (keyId: string, label: string) => {
    Alert.alert(
      t('apiKeys.revoke'),
      `${label}\n\n${t('apiKeys.revokeConfirm')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('apiKeys.revoke'),
          style: 'destructive',
          onPress: () => revokeMut.mutate(keyId),
        },
      ],
    );
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const copyKey = (key: string) => {
    Clipboard.setString(key);
    Alert.alert(t('apiKeys.toastCopied'));
  };

  const availableScopes = data?.availableScopes ?? DEFAULT_SCOPES;
  const activeKeys = (data?.keys ?? []).filter((k) => !k.revokedAt);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>{t('apiKeys.help')}</Text>

        {issued ? (
          <View style={styles.issuedCard}>
            <Text style={styles.issuedTitle}>{t('apiKeys.issuedTitle')}</Text>
            <Text style={styles.issuedHint}>{t('apiKeys.issuedHint')}</Text>
            <View style={styles.keyBox}>
              <Text style={styles.keyText} numberOfLines={1} selectable>
                {issued.plaintextKey}
              </Text>
            </View>
            <View style={styles.issuedActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => copyKey(issued.plaintextKey)}
              >
                <Text style={styles.primaryBtnText}>{t('apiKeys.copy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => setIssued(null)}
              >
                <Text style={styles.dismissBtnText}>{t('apiKeys.dismiss')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('apiKeys.newKey')}</Text>
          <Text style={styles.label}>{t('apiKeys.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('apiKeys.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('apiKeys.scopesLabel')}</Text>
          <View style={styles.chipRow}>
            {availableScopes.map((scope) => {
              const active = selectedScopes.includes(scope);
              return (
                <TouchableOpacity
                  key={scope}
                  onPress={() => toggleScope(scope)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {scope}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.createBtn,
              (!name.trim() || selectedScopes.length === 0 || createMut.isPending) &&
                styles.createBtnDisabled,
            ]}
            onPress={() => createMut.mutate()}
            disabled={
              !name.trim() || selectedScopes.length === 0 || createMut.isPending
            }
          >
            <Text style={styles.createBtnText}>
              {createMut.isPending ? t('apiKeys.creating') : t('apiKeys.create')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('apiKeys.activeKeys')}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : activeKeys.length === 0 ? (
            <Text style={styles.empty}>{t('apiKeys.noKeys')}</Text>
          ) : (
            activeKeys.map((key) => (
              <View key={key.id} style={styles.keyCard}>
                <View style={styles.keyCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.keyName}>{key.name}</Text>
                    <Text style={styles.keyPrefix}>{key.keyPrefix}…</Text>
                    <Text style={styles.keyScopes}>{key.scopes.join(', ')}</Text>
                    <Text style={styles.keyMeta}>
                      {t('apiKeys.lastUsed')}: {formatDate(key.lastUsedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => confirmRevoke(key.id, key.name)}
                  >
                    <Text style={styles.revokeBtnText}>{t('apiKeys.revoke')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  help: { color: colors.textSecondary, fontSize: fs.sm, lineHeight: 20 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '600',
  },
  label: { color: colors.textMuted, fontSize: fs.xs, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: fs.xs, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: colors.white, fontSize: fs.base, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: fs.sm },
  keyCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  keyCardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  keyName: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '600' },
  keyPrefix: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  keyScopes: { color: colors.textSecondary, fontSize: fs.xs, marginTop: 2 },
  keyMeta: { color: colors.textDim, fontSize: fs.xs, marginTop: 2 },
  revokeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  revokeBtnText: { color: colors.textSecondary, fontSize: fs.xs, fontWeight: '600' },
  issuedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  issuedTitle: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '700' },
  issuedHint: { color: colors.textMuted, fontSize: fs.xs },
  keyBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  keyText: { color: colors.textPrimary, fontFamily: 'Menlo', fontSize: fs.xs },
  issuedActions: { flexDirection: 'row', gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryBtnText: { color: colors.white, fontSize: fs.sm, fontWeight: '600' },
  dismissBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dismissBtnText: { color: colors.textMuted, fontSize: fs.sm },
});
