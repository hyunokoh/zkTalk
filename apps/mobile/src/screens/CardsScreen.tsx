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

interface EditState {
  id: string;
  displayName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  notes: string;
}

export default function CardsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
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
    onError: () => Alert.alert(t('common.error'), t('cards.toastSaveError') ?? 'Save failed'),
  });

  // Each picked photo runs upload → OCR → create as its own card. No
  // pre-save review modal — the user corrects fields by tapping the
  // saved card. Failed OCR still produces a card with the photo so it's
  // not lost.
  const ingestPhoto = useCallback(
    async (picked: PickedFile) => {
      setPendingCount((n) => n + 1);
      try {
        const url = await uploadImageAsset(picked, 'user_avatar');
        let extracted: Awaited<ReturnType<typeof extractBusinessCard>> | null = null;
        try {
          extracted = await extractBusinessCard(url);
        } catch {
          // ignore — save with placeholder name + photo
        }
        await createBusinessCard({
          displayName: extracted?.displayName?.trim() || t('cards.untitled'),
          company: extracted?.company ?? null,
          jobTitle: extracted?.jobTitle ?? null,
          phone: extracted?.phone ?? null,
          email: extracted?.email ?? null,
          cardImageUrl: url,
        });
        qc.invalidateQueries({ queryKey: ['business-cards'] });
      } catch {
        Alert.alert(t('cards.bulkPartialFail', { count: 1 }));
      } finally {
        setPendingCount((n) => Math.max(0, n - 1));
      }
    },
    [qc, t],
  );

  const handleTakePhoto = useCallback(async () => {
    try {
      const photo = await takePhoto();
      if (!photo) return;
      void ingestPhoto(photo);
      Alert.alert(t('cards.bulkAnotherTitle'), t('cards.bulkAnotherBody'), [
        { text: t('cards.bulkAnotherDone'), style: 'cancel' },
        { text: t('cards.bulkAnotherMore'), onPress: () => void handleTakePhoto() },
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Camera failed');
    }
  }, [ingestPhoto, t]);

  const handlePickGallery = useCallback(async () => {
    try {
      const picks = await pickImagesMulti();
      for (const p of picks) {
        void ingestPhoto(p);
      }
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Gallery failed');
    }
  }, [ingestPhoto, t]);

  const handleAddPress = useCallback(() => {
    Alert.alert(t('cards.addSheetTitle'), t('cards.addSheetBody'), [
      { text: t('cards.addPickGallery'), onPress: () => void handlePickGallery() },
      { text: t('cards.addPickCamera'), onPress: () => void handleTakePhoto() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t, handleTakePhoto, handlePickGallery]);

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
      Alert.alert(t('cards.toastNameRequired') ?? 'Name required');
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
        {pendingCount > 0 ? (
          <View style={styles.pendingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pendingText}>{t('cards.ingestPending', { count: pendingCount })}</Text>
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

      {/* Edit modal — opens when a card is tapped. */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditing(null)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('cards.editorEditTitle') ?? t('cards.title')}</Text>
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
