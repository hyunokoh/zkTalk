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
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
  type CreateBusinessCardInput,
} from '../lib/api-business-cards';
import { api } from '../lib/api';
import {
  takePhoto,
  pickImagesMulti,
  uploadImageAsset,
  type PickedFile,
} from '../lib/file-picker';

interface StagedPhoto {
  id: string;
  picked: PickedFile;
}

interface EditState {
  id: string;
  displayName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  notes: string;
}

function makeStageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CardsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Photos the user has captured/picked but NOT yet committed. OCR + save
  // only run when the user taps "저장 (N장)" — they can retake or remove
  // any item before that point.
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [savingCount, setSavingCount] = useState(0);
  const [editing, setEditing] = useState<EditState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['business-cards', search.trim()],
    queryFn: () => fetchBusinessCards({ search: search.trim() || undefined }),
  });

  const cards = data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBusinessCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-cards'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateBusinessCardInput> }) =>
      api<{ card: BusinessCard }>(`/api/business-cards/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-cards'] });
      setEditing(null);
    },
    onError: () => Alert.alert(t('common.error'), t('cards.toastSaveError')),
  });

  // ---- staging: just collect photos, don't upload yet ---------------------
  const addToStage = useCallback((picks: PickedFile[]) => {
    const stamped = picks.map((p) => ({ id: makeStageId(), picked: p }));
    setStaged((prev) => [...prev, ...stamped]);
  }, []);

  const removeStaged = useCallback((id: string) => {
    setStaged((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const photo = await takePhoto();
      if (!photo) return;
      addToStage([photo]);
      // Burst-mode loop: after a successful capture, ask whether to keep
      // shooting. The OS camera screen already gave the user a Use/Retake
      // step so by the time we get here the photo is intentional.
      Alert.alert(t('cards.bulkAnotherTitle'), t('cards.bulkAnotherBody'), [
        { text: t('cards.bulkAnotherDone'), style: 'cancel' },
        { text: t('cards.bulkAnotherMore'), onPress: () => void handleTakePhoto() },
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Camera failed');
    }
  }, [addToStage, t]);

  const handlePickGallery = useCallback(async () => {
    try {
      const picks = await pickImagesMulti();
      if (picks.length > 0) addToStage(picks);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Gallery failed');
    }
  }, [addToStage, t]);

  const handleAddPress = useCallback(() => {
    Alert.alert(t('cards.addSheetTitle'), t('cards.addSheetBody'), [
      { text: t('cards.addPickGallery'), onPress: () => void handlePickGallery() },
      { text: t('cards.addPickCamera'), onPress: () => void handleTakePhoto() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t, handleTakePhoto, handlePickGallery]);

  // ---- commit: only NOW do upload + OCR + save ----------------------------
  const handleSaveAll = useCallback(async () => {
    if (staged.length === 0) return;
    const pending = staged;
    setStaged([]);
    setSavingCount(pending.length);

    let saved = 0;
    let failed = 0;
    await Promise.all(
      pending.map(async (item) => {
        try {
          const url = await uploadImageAsset(item.picked, 'user_avatar');
          let extracted: Awaited<ReturnType<typeof extractBusinessCard>> | null = null;
          try {
            extracted = await extractBusinessCard(url);
          } catch {
            // OCR failed — still save card with photo so it's not lost
          }
          await createBusinessCard({
            displayName: extracted?.displayName?.trim() || t('cards.untitled'),
            company: extracted?.company ?? null,
            jobTitle: extracted?.jobTitle ?? null,
            phone: extracted?.phone ?? null,
            email: extracted?.email ?? null,
            cardImageUrl: url,
          });
          saved += 1;
        } catch {
          failed += 1;
        } finally {
          setSavingCount((n) => Math.max(0, n - 1));
        }
      }),
    );

    qc.invalidateQueries({ queryKey: ['business-cards'] });
    if (failed > 0) {
      Alert.alert(t('cards.bulkPartialFail', { count: failed }));
    }
  }, [staged, qc, t]);

  // ---- tap-to-edit --------------------------------------------------------
  const openEdit = useCallback((card: BusinessCard) => {
    setEditing({
      id: card.id,
      displayName: card.displayName,
      company: card.company ?? '',
      jobTitle: card.jobTitle ?? '',
      phone: card.phone ?? '',
      email: card.email ?? '',
      notes: card.notes ?? '',
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editing) return;
    if (!editing.displayName.trim()) {
      Alert.alert(t('cards.toastNameRequired'));
      return;
    }
    updateMut.mutate({
      id: editing.id,
      patch: {
        displayName: editing.displayName.trim(),
        company: editing.company.trim() || null,
        jobTitle: editing.jobTitle.trim() || null,
        phone: editing.phone.trim() || null,
        email: editing.email.trim() || null,
        notes: editing.notes.trim() || null,
      },
    });
  }, [editing, updateMut, t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('cards.title')}</Text>
        {savingCount > 0 ? (
          <View style={styles.pendingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pendingText}>{t('cards.ingestPending', { count: savingCount })}</Text>
          </View>
        ) : null}
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

      {/* Staging area — visible while there are uncommitted photos */}
      {staged.length > 0 ? (
        <View style={styles.stagePanel}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageTitle}>{t('cards.stageTitle', { count: staged.length })}</Text>
            <Text style={styles.stageHint}>{t('cards.stageHint')}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageRow}
          >
            {staged.map((item) => (
              <View key={item.id} style={styles.stageItem}>
                <Image source={{ uri: item.picked.uri }} style={styles.stageThumb} />
                <TouchableOpacity onPress={() => removeStaged(item.id)} style={styles.stageRemove}>
                  <Text style={styles.stageRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={handleAddPress} style={styles.stageAddMore}>
              <Text style={styles.stageAddMoreText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity style={styles.stageSaveBtn} onPress={() => void handleSaveAll()}>
            <Text style={styles.stageSaveText}>
              {t('cards.stageSave', { count: staged.length })}
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
            <TouchableOpacity style={styles.cardItem} onPress={() => openEdit(item)} activeOpacity={0.7}>
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
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(item.displayName, t('cards.deleteConfirm'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => deleteMut.mutate(item.id),
                    },
                  ]);
                }}
                style={styles.cardDelete}
              >
                <Text style={styles.cardDeleteText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditing(null)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('cards.editorEditTitle')}</Text>
            <TouchableOpacity onPress={saveEdit} disabled={updateMut.isPending}>
              <Text style={[styles.modalSave, updateMut.isPending && { opacity: 0.5 }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
          {editing ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              {(
                [
                  ['displayName', t('cards.field.displayName')],
                  ['company', t('cards.field.company')],
                  ['jobTitle', t('cards.field.jobTitle')],
                  ['phone', t('cards.field.phone')],
                  ['email', t('cards.field.email')],
                ] as const
              ).map(([field, label]) => (
                <View key={field} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editing[field]}
                    onChangeText={(v) => setEditing((prev) => (prev ? { ...prev, [field]: v } : prev))}
                    placeholder={label}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={
                      field === 'phone' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'
                    }
                    autoCapitalize={field === 'email' ? 'none' : 'sentences'}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
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
    gap: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: fs.xl, fontWeight: '700', flex: 1 },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pendingText: { color: colors.textMuted, fontSize: fs.xs },
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
  // staging
  stagePanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stageHeader: { marginBottom: spacing.sm },
  stageTitle: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '700' },
  stageHint: { color: colors.textMuted, fontSize: fs.xs, marginTop: 2 },
  stageRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  stageItem: { position: 'relative' },
  stageThumb: { width: 80, height: 100, borderRadius: borderRadius.md, backgroundColor: colors.background },
  stageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageRemoveText: { color: colors.textPrimary, fontSize: fs.base, lineHeight: 18, fontWeight: '700' },
  stageAddMore: {
    width: 80,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageAddMoreText: { color: colors.textMuted, fontSize: 28, fontWeight: '300' },
  stageSaveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  stageSaveText: { color: colors.white, fontSize: fs.base, fontWeight: '700' },
  // edit modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalCancel: { color: colors.textMuted, fontSize: fs.base },
  modalTitle: { color: colors.textPrimary, fontSize: fs.base, fontWeight: '700' },
  modalSave: { color: colors.primary, fontSize: fs.base, fontWeight: '700' },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  fieldGroup: { gap: 4 },
  fieldLabel: { color: colors.textMuted, fontSize: fs.xs, fontWeight: '600' },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fs.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
