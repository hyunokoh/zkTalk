import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../lib/i18n';
import { colors, spacing, borderRadius, fontSize as fs } from '../theme';
import {
  fetchBusinessCards,
  createBusinessCard,
  deleteBusinessCard,
  extractBusinessCard,
  type BusinessCard,
} from '../lib/api-business-cards';
import {
  takePhoto,
  pickImagesMulti,
  uploadImageAsset,
  type PickedFile,
} from '../lib/file-picker';

type RowStatus = 'uploading' | 'extracting' | 'ready' | 'saving' | 'saved' | 'error';

interface BulkRow {
  id: string;
  uri: string;
  cardImageUrl: string | null;
  status: RowStatus;
  errorMessage?: string;
  fields: {
    displayName: string;
    company: string;
    jobTitle: string;
    phone: string;
    email: string;
  };
}

const EMPTY_FIELDS: BulkRow['fields'] = {
  displayName: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
};

function makeRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CardsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['business-cards', search.trim()],
    queryFn: () => fetchBusinessCards({ search: search.trim() || undefined }),
  });

  const cards = data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBusinessCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-cards'] }),
  });

  // ---- bulk add: kick off OCR for one picked file --------------------------
  const ingestPicked = useCallback(
    async (picked: PickedFile) => {
      const row: BulkRow = {
        id: makeRowId(),
        uri: picked.uri,
        cardImageUrl: null,
        status: 'uploading',
        fields: { ...EMPTY_FIELDS },
      };
      setBulkRows((prev) => [...prev, row]);
      setBulkOpen(true);

      try {
        const url = await uploadImageAsset(picked, 'user_avatar');
        setBulkRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, cardImageUrl: url, status: 'extracting' } : r)),
        );
        try {
          const fields = await extractBusinessCard(url);
          setBulkRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    status: 'ready',
                    fields: {
                      displayName: fields.displayName ?? '',
                      company: fields.company ?? '',
                      jobTitle: fields.jobTitle ?? '',
                      phone: fields.phone ?? '',
                      email: fields.email ?? '',
                    },
                  }
                : r,
            ),
          );
        } catch (err) {
          // Image uploaded fine but OCR failed — keep the row so user can fill
          setBulkRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, status: 'ready', errorMessage: err instanceof Error ? err.message : 'OCR failed' }
                : r,
            ),
          );
        }
      } catch (err) {
        setBulkRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, status: 'error', errorMessage: err instanceof Error ? err.message : 'Upload failed' }
              : r,
          ),
        );
      }
    },
    [],
  );

  // ---- camera "take another" loop -----------------------------------------
  const handleTakePhoto = useCallback(async () => {
    try {
      const photo = await takePhoto();
      if (!photo) return;
      void ingestPicked(photo);
      // Ask if the user wants to keep snapping. Async loop, but we don't
      // block the UI — each snapped photo enters OCR in the background.
      Alert.alert(
        t('cards.bulkAnotherTitle'),
        t('cards.bulkAnotherBody'),
        [
          { text: t('cards.bulkAnotherDone'), style: 'cancel' },
          { text: t('cards.bulkAnotherMore'), onPress: () => void handleTakePhoto() },
        ],
      );
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Camera failed',
      );
    }
  }, [ingestPicked, t]);

  const handlePickGallery = useCallback(async () => {
    try {
      const picks = await pickImagesMulti();
      for (const p of picks) {
        void ingestPicked(p);
      }
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Gallery failed',
      );
    }
  }, [ingestPicked, t]);

  const handleAddPress = useCallback(() => {
    Alert.alert(t('cards.addSheetTitle'), t('cards.addSheetBody'), [
      { text: t('cards.addPickGallery'), onPress: () => void handlePickGallery() },
      { text: t('cards.addPickCamera'), onPress: () => void handleTakePhoto() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t, handleTakePhoto, handlePickGallery]);

  const updateField = useCallback((id: string, field: keyof BulkRow['fields'], value: string) => {
    setBulkRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, fields: { ...r.fields, [field]: value } } : r)),
    );
  }, []);

  const removeRow = useCallback((id: string) => {
    setBulkRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSaveAll = useCallback(async () => {
    const saveable = bulkRows.filter(
      (r) => r.status === 'ready' && r.fields.displayName.trim().length > 0,
    );
    if (saveable.length === 0) {
      Alert.alert(t('cards.bulkNeedNames'));
      return;
    }
    setSavingAll(true);
    let failed = 0;

    await Promise.all(
      saveable.map(async (row) => {
        setBulkRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, status: 'saving' } : r)),
        );
        try {
          await createBusinessCard({
            displayName: row.fields.displayName.trim(),
            company: row.fields.company.trim() || null,
            jobTitle: row.fields.jobTitle.trim() || null,
            phone: row.fields.phone.trim() || null,
            email: row.fields.email.trim() || null,
            cardImageUrl: row.cardImageUrl ?? null,
          });
          setBulkRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, status: 'saved' } : r)),
          );
        } catch {
          failed += 1;
          setBulkRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, status: 'error' } : r)),
          );
        }
      }),
    );

    setSavingAll(false);
    qc.invalidateQueries({ queryKey: ['business-cards'] });

    if (failed === 0) {
      Alert.alert(t('cards.bulkSavedToast', { count: saveable.length }));
      setBulkRows((prev) => prev.filter((r) => r.status !== 'saved'));
      if (bulkRows.every((r) => r.status === 'saved' || r.status === 'error')) {
        setBulkOpen(false);
      }
    } else {
      Alert.alert(t('cards.bulkPartialFail', { count: failed }));
    }
  }, [bulkRows, qc, t]);

  // ---------------------------------------------------------------------- UI
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('cards.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddPress}>
          <Text style={styles.addBtnText}>+ {t('cards.addNew')}</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={t('cards.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
      />

      {bulkOpen && bulkRows.length > 0 ? (
        <View style={styles.bulkPanel}>
          <View style={styles.bulkHeader}>
            <Text style={styles.bulkTitle}>{t('cards.bulkTitle')}</Text>
            <TouchableOpacity onPress={() => setBulkOpen(false)}>
              <Text style={styles.bulkCollapse}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.bulkScroll}>
            {bulkRows.map((row) => (
              <View key={row.id} style={styles.bulkRow}>
                <Image source={{ uri: row.uri }} style={styles.bulkThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkStatus}>
                    {row.status === 'uploading' && t('cards.bulkUploading')}
                    {row.status === 'extracting' && t('cards.bulkExtracting')}
                    {row.status === 'ready' && t('cards.bulkReady')}
                    {row.status === 'saving' && t('cards.bulkRowSaving')}
                    {row.status === 'saved' && t('cards.bulkRowSaved')}
                    {row.status === 'error' && (row.errorMessage || t('cards.bulkRowError'))}
                  </Text>
                  <TextInput
                    style={styles.bulkInput}
                    value={row.fields.displayName}
                    onChangeText={(v) => updateField(row.id, 'displayName', v)}
                    placeholder={t('cards.field.displayName')}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.bulkInput}
                    value={row.fields.company}
                    onChangeText={(v) => updateField(row.id, 'company', v)}
                    placeholder={t('cards.field.company')}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.bulkInput}
                    value={row.fields.phone}
                    onChangeText={(v) => updateField(row.id, 'phone', v)}
                    placeholder={t('cards.field.phone')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={styles.bulkInput}
                    value={row.fields.email}
                    onChangeText={(v) => updateField(row.id, 'email', v)}
                    placeholder={t('cards.field.email')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={() => removeRow(row.id)} style={styles.bulkRemove}>
                  <Text style={styles.bulkRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.saveAllBtn, savingAll && styles.saveAllDisabled]}
            onPress={() => void handleSaveAll()}
            disabled={savingAll}
          >
            <Text style={styles.saveAllText}>
              {savingAll
                ? t('cards.bulkSaving')
                : t('cards.bulkSaveAll', { count: bulkRows.filter((r) => r.status === 'ready').length })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : cards.length === 0 ? (
        <Text style={styles.empty}>{t('cards.empty')}</Text>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cardItem}>
              {item.cardImageUrl ? (
                <Image source={{ uri: item.cardImageUrl }} style={styles.cardThumb} />
              ) : (
                <View style={[styles.cardThumb, styles.cardThumbEmpty]}>
                  <Text style={styles.cardInitial}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.displayName}</Text>
                {item.company || item.jobTitle ? (
                  <Text style={styles.cardSubtitle}>
                    {[item.jobTitle, item.company].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {item.phone ? <Text style={styles.cardMeta}>📞 {item.phone}</Text> : null}
                {item.email ? <Text style={styles.cardMeta}>✉ {item.email}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(item.displayName, t('cards.deleteConfirm'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => deleteMut.mutate(item.id),
                    },
                  ])
                }
                style={styles.cardDelete}
              >
                <Text style={styles.cardDeleteText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: fs.xl, fontWeight: '700', flex: 1 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: { color: colors.white, fontSize: fs.sm, fontWeight: '600' },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontSize: fs.sm },
  list: { padding: spacing.lg, gap: spacing.sm },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardThumb: { width: 64, height: 64, borderRadius: borderRadius.md, backgroundColor: colors.background },
  cardThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardInitial: { color: colors.primary, fontSize: fs.xl, fontWeight: '700' },
  cardName: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '600' },
  cardSubtitle: { color: colors.textSecondary, fontSize: fs.sm, marginTop: 2 },
  cardMeta: { color: colors.textMuted, fontSize: fs.xs, marginTop: 2 },
  cardDelete: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardDeleteText: { color: colors.textMuted, fontSize: fs.xs },
  bulkPanel: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    maxHeight: 480,
    overflow: 'hidden',
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bulkTitle: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '700' },
  bulkCollapse: { color: colors.textMuted, fontSize: fs.sm },
  bulkScroll: { maxHeight: 320 },
  bulkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bulkThumb: { width: 56, height: 72, borderRadius: borderRadius.sm, backgroundColor: colors.background },
  bulkStatus: { color: colors.textMuted, fontSize: fs.xs, marginBottom: spacing.xs },
  bulkInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fs.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 4,
  },
  bulkRemove: { padding: spacing.xs },
  bulkRemoveText: { color: colors.textMuted, fontSize: fs.lg },
  saveAllBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveAllDisabled: { opacity: 0.5 },
  saveAllText: { color: colors.white, fontSize: fs.base, fontWeight: '700' },
});
