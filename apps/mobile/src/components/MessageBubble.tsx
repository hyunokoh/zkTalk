import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import Avatar from './Avatar';

interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

interface MessagePollOption {
  id: string;
  text: string;
  voteCount: number;
  voted: boolean;
}

interface MessagePoll {
  id: string;
  question: string;
  options: MessagePollOption[];
  totalVotes: number;
  closed: boolean;
  footerLabel?: string;
}

const LONG_MESSAGE_COLLAPSE_LENGTH = 1200;
const LONG_MESSAGE_COLLAPSE_LINES = 10;

function isLongMessage(body: string): boolean {
  return body.length > LONG_MESSAGE_COLLAPSE_LENGTH || body.split('\n').length > LONG_MESSAGE_COLLAPSE_LINES;
}

function getCollapsedBody(body: string): string {
  const truncatedByLines = body.split('\n').slice(0, LONG_MESSAGE_COLLAPSE_LINES).join('\n');
  const truncated = truncatedByLines.slice(0, LONG_MESSAGE_COLLAPSE_LENGTH).trimEnd();
  return truncated.length === body.trimEnd().length ? truncated : `${truncated}…`;
}

function formatUnreadCount(readCount: number): string {
  return String(Math.min(99, Math.max(0, Math.trunc(readCount))));
}

interface MessageBubbleProps {
  authorName: string;
  authorAvatarUrl?: string | null;
  body: string;
  time: string;
  isOwn: boolean;
  topic?: string | null;
  replyAuthorName?: string;
  replyBody?: string;
  translatedBody?: string;
  translatedLabel?: string;
  translationVariant?: 'manual' | 'automatic';
  translationStatusLabel?: string;
  translationStatusIssue?: string;
  isEncrypted?: boolean;
  isEdited?: boolean;
  editedLabel?: string;
  readCount?: number;
  reactions?: MessageReaction[];
  onPressReaction?: (emoji: string) => void;
  onPressAddReaction?: () => void;
  onPressMore?: () => void;
  poll?: MessagePoll;
  onPressPollOption?: (optionId: string, voted: boolean) => void;
  threadButtonLabel?: string;
  onPressThread?: () => void;
  showAvatar?: boolean;
  showAuthorName?: boolean;
  startsGroup?: boolean;
  endsGroup?: boolean;
  showActionChips?: boolean;
}

const MessageBubble = memo(function MessageBubble({
  authorName,
  authorAvatarUrl,
  body,
  time,
  isOwn,
  topic,
  replyAuthorName,
  replyBody,
  translatedBody,
  translatedLabel,
  translationVariant,
  translationStatusLabel,
  translationStatusIssue,
  isEncrypted,
  isEdited,
  editedLabel,
  readCount,
  reactions,
  onPressReaction,
  onPressAddReaction,
  onPressMore,
  poll,
  onPressPollOption,
  threadButtonLabel,
  onPressThread,
  showAvatar = true,
  showAuthorName = true,
  startsGroup = true,
  endsGroup = true,
  showActionChips = false,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayBody = useMemo(() => {
    if (!body || isExpanded || !isLongMessage(body)) {
      return body;
    }
    return getCollapsedBody(body);
  }, [body, isExpanded]);
  const hasBubbleContent = Boolean(
    body || replyBody || poll || translatedBody || threadButtonLabel,
  );
  const hasReactions = Boolean(reactions?.length);
  const meta = (
    <>
      {readCount !== undefined && readCount > 0 ? (
        <Text style={styles.readCount}>{formatUnreadCount(readCount)}</Text>
      ) : null}
      {!hasReactions ? (
        <>
          {isEdited && editedLabel ? <Text style={styles.time}>{editedLabel}</Text> : null}
          <Text style={styles.time}>{time}</Text>
        </>
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.row,
        isOwn && styles.rowOwn,
        !startsGroup && styles.rowCompactTop,
        !endsGroup && styles.rowCompactBottom,
      ]}
    >
      {!isOwn ? (
        <View style={styles.avatarCol}>
          {showAvatar ? <Avatar name={authorName} avatarUrl={authorAvatarUrl} size={34} /> : null}
        </View>
      ) : null}

      <View style={[styles.content, isOwn && styles.contentOwn]}>
        {!isOwn && showAuthorName ? <Text style={styles.authorName}>{authorName}</Text> : null}
        {topic ? <Text style={styles.topicBadge}>{topic}</Text> : null}

        <View style={[styles.bubbleStack, isOwn && styles.bubbleStackOwn]}>
          <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
            {isOwn ? (
              <View style={[styles.metaColumn, styles.metaColumnOwn, !hasBubbleContent && styles.metaColumnOnly]}>
                {meta}
              </View>
            ) : null}
            {hasBubbleContent ? (
              <View style={styles.bubbleWrap}>
                {endsGroup ? (
                  <View
                    style={[
                      styles.tail,
                      isOwn ? styles.tailOwn : styles.tailOther,
                      isOwn ? styles.tailOwnColor : styles.tailOtherColor,
                    ]}
                  />
                ) : null}

                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  {replyBody ? (
                    <View style={styles.replyPreview}>
                      {replyAuthorName ? (
                        <Text style={styles.replyAuthor} numberOfLines={1}>
                          {replyAuthorName}
                        </Text>
                      ) : null}
                      <Text style={styles.replyBody} numberOfLines={1}>
                        {replyBody}
                      </Text>
                    </View>
                  ) : null}

                  {body ? (
                    <>
                      <Text style={styles.body}>
                        {isEncrypted ? '\u{1F512} ' : ''}
                        {displayBody}
                      </Text>
                      {isLongMessage(body) ? (
                        <TouchableOpacity onPress={() => setIsExpanded((prev) => !prev)} activeOpacity={0.8} style={styles.longMessageButton}>
                          <Text style={styles.longMessageButtonText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : null}

                  {poll ? (
                    <View style={styles.pollCard}>
                      <View style={styles.pollHeader}>
                        <Text style={styles.pollBadge}>{'\u{1F5F3}'}</Text>
                        <Text style={styles.pollQuestion}>{poll.question}</Text>
                      </View>
                      {poll.options.map((option) => {
                        const percentage =
                          poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                        return (
                          <TouchableOpacity
                            key={option.id}
                            activeOpacity={onPressPollOption ? 0.8 : 1}
                            disabled={!onPressPollOption || poll.closed}
                            onPress={() => onPressPollOption?.(option.id, option.voted)}
                            style={[
                              styles.pollOption,
                              option.voted && styles.pollOptionActive,
                              poll.closed && styles.pollOptionClosed,
                            ]}
                          >
                            <View
                              style={[
                                styles.pollOptionFill,
                                option.voted ? styles.pollOptionFillActive : styles.pollOptionFillInactive,
                                { width: `${percentage}%` },
                              ]}
                            />
                            <View style={styles.pollOptionRow}>
                              <Text
                                style={[
                                  styles.pollOptionText,
                                  option.voted && styles.pollOptionTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {option.text}
                              </Text>
                              <Text style={styles.pollOptionMeta}>
                                {percentage}% ({option.voteCount})
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {poll.footerLabel ? <Text style={styles.pollFooter}>{poll.footerLabel}</Text> : null}
                    </View>
                  ) : null}

                  {translatedBody ? (
                    <View
                      style={[
                        styles.translatedWrap,
                        translationVariant === 'manual'
                          ? styles.translatedWrapManual
                          : translationVariant === 'automatic'
                            ? styles.translatedWrapAutomatic
                            : null,
                      ]}
                    >
                      {translatedLabel ? (
                        <Text
                          style={[
                            styles.translatedLabel,
                            translationVariant === 'manual'
                              ? styles.translatedLabelManual
                              : translationVariant === 'automatic'
                                ? styles.translatedLabelAutomatic
                                : null,
                          ]}
                        >
                          {translatedLabel}
                        </Text>
                      ) : null}
                      <Text style={styles.translatedBody}>{translatedBody}</Text>
                    </View>
                  ) : null}

                  {translationStatusLabel ? (
                    <View style={styles.translationStatusWrap}>
                      <Text style={styles.translationStatusLabel}>
                        {translationStatusLabel}
                      </Text>
                      {translationStatusIssue ? (
                        <Text style={styles.translationStatusIssue}>
                          {translationStatusIssue}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {threadButtonLabel ? (
                    <TouchableOpacity
                      style={styles.threadButton}
                      activeOpacity={onPressThread ? 0.75 : 1}
                      disabled={!onPressThread}
                      onPress={onPressThread}
                    >
                      <Text style={styles.threadButtonText}>{threadButtonLabel}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}
            {!isOwn ? (
              <View style={[styles.metaColumn, styles.metaColumnOther, !hasBubbleContent && styles.metaColumnOnly]}>
                {meta}
              </View>
            ) : null}
          </View>

          {reactions && reactions.length > 0 ? (
            <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              {reactions.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  activeOpacity={onPressReaction ? 0.7 : 1}
                  disabled={!onPressReaction}
                  onPress={() => onPressReaction?.(reaction.emoji)}
                  style={[
                    styles.reactionChip,
                    reaction.reactedByMe && styles.reactionChipActive,
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionCount}>{reaction.count}</Text>
                </TouchableOpacity>
              ))}
              {showActionChips && onPressAddReaction ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onPressAddReaction}
                  style={styles.reactionAddChip}
                >
                  <Text style={styles.reactionAddEmoji}>{'\u{1F60A}'}</Text>
                  <Text style={styles.reactionAddLabel}>+</Text>
                </TouchableOpacity>
              ) : null}
              {showActionChips && onPressMore ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onPressMore}
                  style={styles.reactionMoreChip}
                >
                  <Text style={styles.reactionMoreLabel}>{'\u{22EF}'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : showActionChips && onPressAddReaction ? (
            <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onPressAddReaction}
                style={styles.reactionAddChip}
              >
                <Text style={styles.reactionAddEmoji}>{'\u{1F60A}'}</Text>
                <Text style={styles.reactionAddLabel}>+</Text>
              </TouchableOpacity>
              {onPressMore ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onPressMore}
                  style={styles.reactionMoreChip}
                >
                  <Text style={styles.reactionMoreLabel}>{'\u{22EF}'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : showActionChips && onPressMore ? (
            <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onPressMore}
                style={styles.reactionMoreChip}
              >
                <Text style={styles.reactionMoreLabel}>{'\u{22EF}'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

export default MessageBubble;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowCompactTop: {
    paddingTop: 0,
  },
  rowCompactBottom: {
    paddingBottom: 1,
  },
  avatarCol: {
    marginRight: spacing.sm,
    width: 34,
    alignItems: 'center',
    paddingTop: 2,
  },
  content: {
    maxWidth: '78%',
  },
  contentOwn: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  authorName: {
    marginBottom: 3,
    marginLeft: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  topicBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: '#2b2d31',
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '700',
    overflow: 'hidden',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  bubbleStack: {
    alignItems: 'flex-start',
  },
  bubbleStackOwn: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  bubbleWrap: {
    position: 'relative',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 19,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleOwn: {
    backgroundColor: colors.talkOwnBubble,
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
  bubbleOther: {
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  tail: {
    position: 'absolute',
    bottom: 7,
    width: 11,
    height: 11,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  tailOther: {
    left: -4,
  },
  tailOwn: {
    right: -4,
  },
  tailOtherColor: {
    backgroundColor: colors.talkOtherBubble,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
  },
  tailOwnColor: {
    backgroundColor: colors.talkOwnBubble,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
  },
  replyPreview: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#2b2d31',
    borderLeftWidth: 2,
    borderLeftColor: '#5865f2',
  },
  replyAuthor: {
    marginBottom: 3,
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  replyBody: {
    color: colors.talkMeta,
    fontSize: fs.sm,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fs.base,
    lineHeight: 22,
  },
  longMessageButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#2b2d31',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  longMessageButtonText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  translatedWrap: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: '#2b2d31',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  translatedWrapManual: {
    backgroundColor: 'rgba(14, 116, 144, 0.16)',
    borderColor: 'rgba(125, 211, 252, 0.4)',
  },
  translatedWrapAutomatic: {
    backgroundColor: 'rgba(6, 95, 70, 0.18)',
    borderColor: 'rgba(110, 231, 183, 0.34)',
  },
  translatedLabel: {
    marginBottom: 3,
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  translatedLabelManual: {
    color: '#bae6fd',
  },
  translatedLabelAutomatic: {
    color: '#a7f3d0',
  },
  translatedBody: {
    color: colors.textPrimary,
    fontSize: fs.base,
    lineHeight: 20,
  },
  translationStatusWrap: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  translationStatusLabel: {
    color: '#fef3c7',
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  translationStatusIssue: {
    marginTop: spacing.xs,
    color: '#fef3c7',
    fontSize: fs.sm,
    lineHeight: 20,
  },
  threadButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.talkAction,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  threadButtonText: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  pollCard: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: '#2b2d31',
    gap: spacing.xs,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  pollBadge: {
    fontSize: fs.base,
  },
  pollQuestion: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '700',
  },
  pollOption: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  pollOptionActive: {
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
  },
  pollOptionClosed: {
    opacity: 0.9,
  },
  pollOptionFill: {
    ...StyleSheet.absoluteFillObject,
    right: 'auto',
  },
  pollOptionFillActive: {
    backgroundColor: 'rgba(88, 101, 242, 0.28)',
  },
  pollOptionFillInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pollOptionRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pollOptionText: {
    flex: 1,
    color: '#243544',
    fontSize: fs.sm,
    fontWeight: '600',
  },
  pollOptionTextActive: {
    color: '#8a6d00',
  },
  pollOptionMeta: {
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '600',
  },
  pollFooter: {
    marginTop: 4,
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '600',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 6,
    marginLeft: 1,
  },
  reactionsRowOwn: {
    justifyContent: 'flex-end',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.74)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  reactionChipActive: {
    backgroundColor: 'rgba(254, 229, 0, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(240, 215, 76, 0.85)',
  },
  reactionAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  reactionAddEmoji: {
    fontSize: fs.sm,
  },
  reactionAddLabel: {
    color: '#53697f',
    fontSize: fs.xs,
    fontWeight: '700',
  },
  reactionMoreChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  reactionMoreLabel: {
    color: '#53697f',
    fontSize: fs.base,
    fontWeight: '700',
    lineHeight: fs.base,
  },
  reactionEmoji: {
    fontSize: fs.base,
  },
  reactionCount: {
    color: '#5d6d7e',
    fontSize: fs.sm,
    fontWeight: '600',
  },
  metaColumn: {
    minWidth: 14,
    alignSelf: 'flex-end',
    gap: 1,
  },
  metaColumnOther: {
    alignItems: 'flex-start',
  },
  metaColumnOwn: {
    alignItems: 'flex-end',
  },
  metaColumnOnly: {
    paddingBottom: 2,
  },
  time: {
    color: colors.talkMeta,
    fontSize: 10,
    fontWeight: '500',
  },
  readCount: {
    color: colors.talkMeta,
    fontSize: 10,
    fontWeight: '800',
  },
});
