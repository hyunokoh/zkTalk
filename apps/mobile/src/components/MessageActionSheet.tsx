import React, { memo, useCallback } from 'react';
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Alert,
  Share,
  Clipboard,
  View,
} from 'react-native';
import { useTranslation } from '../lib/i18n';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];
export interface ActionSheetMessage {
  id: string;
  bodyPlaintext: string;
  bodyMarkdown?: string;
  authorUserId: string;
  authorName?: string;
}

interface MessageActionSheetProps {
  message: ActionSheetMessage;
  isOwn: boolean;
  onReply?: () => void;
  onThread?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  onTranslate?: () => void;
  onReact?: (emoji: string) => void;
  onPin?: () => void;
  onBookmark?: () => void;
  onAiReplyDraft?: () => void;
  onAiRewriteDraft?: () => void;
  aiStatusLabel?: string;
  aiStatusTone?: 'live' | 'mock' | 'unavailable';
  aiStatusDescription?: string;
  aiActionsDisabled?: boolean;
  onClose: () => void;
  onDelete?: (message: ActionSheetMessage) => void;
}

const MessageActionSheet = memo(function MessageActionSheet({
  message,
  isOwn,
  onReply,
  onThread,
  onEdit,
  onReport,
  onTranslate,
  onReact,
  onPin,
  onBookmark,
  onAiReplyDraft,
  onAiRewriteDraft,
  aiStatusLabel,
  aiStatusTone = 'live',
  aiStatusDescription,
  aiActionsDisabled = false,
  onClose,
  onDelete,
}: MessageActionSheetProps) {
  const { t } = useTranslation();

  const handleCopy = useCallback(() => {
    const text = message.bodyPlaintext || message.bodyMarkdown || '';
    try {
      if (typeof Clipboard?.setString === 'function') {
        Clipboard.setString(text);
        onClose();
        return;
      }
    } catch {
      // Fall back to share sheet below.
    }

    Share.share({ message: text }).catch(() => {
      Alert.alert(t('common.error'), t('message.copyFailed'));
    });
    onClose();
  }, [message, onClose, t]);

  const handleReply = useCallback(() => {
    onReply?.();
    onClose();
  }, [onClose, onReply]);

  const handleThread = useCallback(() => {
    onThread?.();
    onClose();
  }, [onClose, onThread]);

  const handleEdit = useCallback(() => {
    onEdit?.();
    onClose();
  }, [onClose, onEdit]);

  const handleTranslate = useCallback(() => {
    if (aiActionsDisabled) {
      return;
    }

    onTranslate?.();
    onClose();
  }, [aiActionsDisabled, onClose, onTranslate]);

  const handleReport = useCallback(() => {
    onReport?.();
    onClose();
  }, [onClose, onReport]);

  const handleReact = useCallback(
    (emoji: string) => {
      onReact?.(emoji);
      onClose();
    },
    [onClose, onReact],
  );

  const handlePin = useCallback(() => {
    onPin?.();
    onClose();
  }, [onClose, onPin]);

  const handleBookmark = useCallback(() => {
    onBookmark?.();
    onClose();
  }, [onBookmark, onClose]);

  const handleAiReplyDraft = useCallback(() => {
    if (aiActionsDisabled) {
      return;
    }

    onAiReplyDraft?.();
    onClose();
  }, [aiActionsDisabled, onAiReplyDraft, onClose]);

  const handleAiRewriteDraft = useCallback(() => {
    if (aiActionsDisabled) {
      return;
    }

    onAiRewriteDraft?.();
    onClose();
  }, [aiActionsDisabled, onAiRewriteDraft, onClose]);

  const handleDelete = useCallback(() => {
    onDelete?.(message);
    onClose();
  }, [message, onDelete, onClose]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} accessible={false}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet} accessible={false}>
              {(onAiReplyDraft || onAiRewriteDraft || aiStatusLabel) && (
                <View
                  style={styles.aiSection}
                  testID="message-action-sheet-ai-section"
                  accessible={false}
                >
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.aiTitle}>{t('ai.messageActionsTitle')}</Text>
                    {aiStatusLabel ? (
                      <View
                        testID="message-action-sheet-ai-status"
                        style={[
                          styles.aiStatusBadge,
                          aiStatusTone === 'mock'
                            ? styles.aiStatusBadgeMock
                            : aiStatusTone === 'unavailable'
                              ? styles.aiStatusBadgeUnavailable
                              : styles.aiStatusBadgeLive,
                        ]}
                      >
                        <Text style={styles.aiStatusBadgeText}>{aiStatusLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  {aiStatusDescription ? (
                    <Text style={styles.aiDescription}>{aiStatusDescription}</Text>
                  ) : null}
                  <View style={styles.aiActionsRow}>
                    {onAiReplyDraft ? (
                      <TouchableOpacity
                        testID="message-action-sheet-ai-reply-draft"
                        accessible
                        style={[
                          styles.aiActionCard,
                          aiActionsDisabled && styles.aiActionCardDisabled,
                        ]}
                        onPress={handleAiReplyDraft}
                        disabled={aiActionsDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={t('ai.messageReplyDraft')}
                        accessibilityHint={t('ai.messageReplyDraftHint')}
                        accessibilityState={{ disabled: aiActionsDisabled }}
                        importantForAccessibility="yes"
                      >
                        <Text style={styles.aiActionIcon}>{'\u2728'}</Text>
                        <Text style={styles.aiActionTitle}>{t('ai.messageReplyDraft')}</Text>
                        <Text style={styles.aiActionBody}>{t('ai.messageReplyDraftHint')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {onAiRewriteDraft ? (
                      <TouchableOpacity
                        testID="message-action-sheet-ai-rewrite-draft"
                        accessible
                        style={[
                          styles.aiActionCard,
                          aiActionsDisabled && styles.aiActionCardDisabled,
                        ]}
                        onPress={handleAiRewriteDraft}
                        disabled={aiActionsDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={t('ai.messageRewriteDraft')}
                        accessibilityHint={t('ai.messageRewriteDraftHint')}
                        accessibilityState={{ disabled: aiActionsDisabled }}
                        importantForAccessibility="yes"
                      >
                        <Text style={styles.aiActionIcon}>{'\u270D\uFE0F'}</Text>
                        <Text style={styles.aiActionTitle}>{t('ai.messageRewriteDraft')}</Text>
                        <Text style={styles.aiActionBody}>{t('ai.messageRewriteDraftHint')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {onTranslate ? (
                      <TouchableOpacity
                        testID="message-action-sheet-ai-translate-inline"
                        accessible
                        style={[
                          styles.aiActionCard,
                          aiActionsDisabled && styles.aiActionCardDisabled,
                        ]}
                        onPress={handleTranslate}
                        disabled={aiActionsDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={t('ai.messageTranslateInline')}
                        accessibilityHint={t('ai.messageTranslateInlineHint')}
                        accessibilityState={{ disabled: aiActionsDisabled }}
                        importantForAccessibility="yes"
                      >
                        <Text style={styles.aiActionIcon}>{'\u{1F310}'}</Text>
                        <Text style={styles.aiActionTitle}>{t('ai.messageTranslateInline')}</Text>
                        <Text style={styles.aiActionBody}>{t('ai.messageTranslateInlineHint')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
              {onReact && (
                <View style={styles.reactionSection} accessible={false}>
                  <Text style={styles.reactionTitle}>{t('message.react')}</Text>
                  <View style={styles.reactionRow}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.reactionButton}
                        onPress={() => handleReact(emoji)}
                      >
                        <Text style={styles.reactionButtonText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.actionsGrid} accessible={false}>
                {onReply && (
                  <TouchableOpacity
                    testID="message-action-sheet-reply"
                    style={styles.actionItem}
                    onPress={handleReply}
                    accessibilityRole="button"
                  >
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.reply')}</Text>
                  </TouchableOpacity>
                )}

                {isOwn && onEdit && (
                  <TouchableOpacity
                    testID="message-action-sheet-edit"
                    style={styles.actionItem}
                    onPress={handleEdit}
                    accessibilityRole="button"
                  >
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{270F}\u{FE0F}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                )}

                {onThread && (
                  <TouchableOpacity
                    testID="message-action-sheet-thread"
                    style={styles.actionItem}
                    onPress={handleThread}
                    accessibilityRole="button"
                  >
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F9F5}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.thread')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  testID="message-action-sheet-copy"
                  style={styles.actionItem}
                  onPress={handleCopy}
                  accessibilityRole="button"
                >
                  <View style={styles.actionIconBg}>
                    <Text style={styles.actionIcon}>{'\u{1F4CB}'}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{t('message.copy')}</Text>
                </TouchableOpacity>

                {!isOwn && onReport && (
                  <TouchableOpacity
                    testID="message-action-sheet-report"
                    style={styles.actionItem}
                    onPress={handleReport}
                    accessibilityRole="button"
                  >
                    <View style={[styles.actionIconBg, styles.deleteIconBg]}>
                      <Text style={styles.actionIcon}>{'\u{1F6A9}'}</Text>
                    </View>
                    <Text style={[styles.actionLabel, styles.deleteLabel]}>
                      {t('message.report')}
                    </Text>
                  </TouchableOpacity>
                )}

                {onPin && (
                  <TouchableOpacity
                    testID="message-action-sheet-pin"
                    style={styles.actionItem}
                    onPress={handlePin}
                    accessibilityRole="button"
                  >
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F4CC}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.pin')}</Text>
                  </TouchableOpacity>
                )}

                {onBookmark && (
                  <TouchableOpacity
                    testID="message-action-sheet-bookmark"
                    style={styles.actionItem}
                    onPress={handleBookmark}
                    accessibilityRole="button"
                  >
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F516}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.bookmark')}</Text>
                  </TouchableOpacity>
                )}

                {isOwn && onDelete && (
                  <TouchableOpacity
                    testID="message-action-sheet-delete"
                    style={styles.actionItem}
                    onPress={handleDelete}
                    accessibilityRole="button"
                  >
                    <View style={[styles.actionIconBg, styles.deleteIconBg]}>
                      <Text style={styles.actionIcon}>{'\u{1F5D1}\u{FE0F}'}</Text>
                    </View>
                    <Text style={[styles.actionLabel, styles.deleteLabel]}>
                      {t('message.delete')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

export default MessageActionSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  aiSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  aiTitle: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '700',
  },
  aiStatusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  aiStatusBadgeLive: {
    backgroundColor: 'rgba(70, 181, 127, 0.18)',
  },
  aiStatusBadgeMock: {
    backgroundColor: 'rgba(244, 187, 68, 0.18)',
  },
  aiStatusBadgeUnavailable: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  aiStatusBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiDescription: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  aiActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  aiActionCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    padding: spacing.md,
    minHeight: 116,
  },
  aiActionCardDisabled: {
    opacity: 0.55,
  },
  aiActionIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  aiActionTitle: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  aiActionBody: {
    color: colors.textSecondary,
    fontSize: fs.xs,
    lineHeight: 17,
  },
  reactionSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  reactionTitle: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginBottom: spacing.sm,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonText: {
    fontSize: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deleteIconBg: {
    backgroundColor: colors.error + '20',
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    textAlign: 'center',
  },
  deleteLabel: {
    color: colors.error,
  },
});
