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
    onTranslate?.();
    onClose();
  }, [onClose, onTranslate]);

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

  const handleDelete = useCallback(() => {
    onDelete?.(message);
    onClose();
  }, [message, onDelete, onClose]);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {onReact && (
                <View style={styles.reactionSection}>
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
              <View style={styles.actionsGrid}>
                {onReply && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleReply}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.reply')}</Text>
                  </TouchableOpacity>
                )}

                {isOwn && onEdit && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{270F}\u{FE0F}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                )}

                {onThread && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleThread}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F9F5}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.thread')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionItem} onPress={handleCopy}>
                  <View style={styles.actionIconBg}>
                    <Text style={styles.actionIcon}>{'\u{1F4CB}'}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{t('message.copy')}</Text>
                </TouchableOpacity>

                {onTranslate && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleTranslate}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F310}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.translate')}</Text>
                  </TouchableOpacity>
                )}

                {!isOwn && onReport && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
                    <View style={[styles.actionIconBg, styles.deleteIconBg]}>
                      <Text style={styles.actionIcon}>{'\u{1F6A9}'}</Text>
                    </View>
                    <Text style={[styles.actionLabel, styles.deleteLabel]}>
                      {t('message.report')}
                    </Text>
                  </TouchableOpacity>
                )}

                {onPin && (
                  <TouchableOpacity style={styles.actionItem} onPress={handlePin}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F4CC}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.pin')}</Text>
                  </TouchableOpacity>
                )}

                {onBookmark && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleBookmark}>
                    <View style={styles.actionIconBg}>
                      <Text style={styles.actionIcon}>{'\u{1F516}'}</Text>
                    </View>
                    <Text style={styles.actionLabel}>{t('message.bookmark')}</Text>
                  </TouchableOpacity>
                )}

                {isOwn && onDelete && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
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
