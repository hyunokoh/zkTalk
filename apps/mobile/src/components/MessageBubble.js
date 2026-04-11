"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var theme_1 = require("../theme");
var Avatar_1 = require("./Avatar");
function formatUnreadCount(readCount) {
    return String(Math.min(99, Math.max(0, Math.trunc(readCount))));
}
var MessageBubble = (0, react_1.memo)(function MessageBubble(_a) {
    var authorName = _a.authorName, authorAvatarUrl = _a.authorAvatarUrl, body = _a.body, time = _a.time, isOwn = _a.isOwn, topic = _a.topic, replyAuthorName = _a.replyAuthorName, replyBody = _a.replyBody, translatedBody = _a.translatedBody, translatedLabel = _a.translatedLabel, isEncrypted = _a.isEncrypted, isEdited = _a.isEdited, editedLabel = _a.editedLabel, readCount = _a.readCount, reactions = _a.reactions, onPressReaction = _a.onPressReaction, onPressAddReaction = _a.onPressAddReaction, onPressMore = _a.onPressMore, poll = _a.poll, onPressPollOption = _a.onPressPollOption, threadButtonLabel = _a.threadButtonLabel, onPressThread = _a.onPressThread, _b = _a.showAvatar, showAvatar = _b === void 0 ? true : _b, _c = _a.showAuthorName, showAuthorName = _c === void 0 ? true : _c, _d = _a.startsGroup, startsGroup = _d === void 0 ? true : _d, _e = _a.endsGroup, endsGroup = _e === void 0 ? true : _e, _f = _a.showActionChips, showActionChips = _f === void 0 ? false : _f;
    var hasBubbleContent = Boolean(body || replyBody || poll || translatedBody || threadButtonLabel);
    var hasReactions = Boolean(reactions === null || reactions === void 0 ? void 0 : reactions.length);
    var meta = (<>
      {readCount !== undefined && readCount > 0 ? (<react_native_1.Text style={styles.readCount}>{formatUnreadCount(readCount)}</react_native_1.Text>) : null}
      {!hasReactions ? (<>
          {isEdited && editedLabel ? <react_native_1.Text style={styles.time}>{editedLabel}</react_native_1.Text> : null}
          <react_native_1.Text style={styles.time}>{time}</react_native_1.Text>
        </>) : null}
    </>);
    return (<react_native_1.View style={[
            styles.row,
            isOwn && styles.rowOwn,
            !startsGroup && styles.rowCompactTop,
            !endsGroup && styles.rowCompactBottom,
        ]}>
      {!isOwn ? (<react_native_1.View style={styles.avatarCol}>
          {showAvatar ? <Avatar_1.default name={authorName} avatarUrl={authorAvatarUrl} size={34}/> : null}
        </react_native_1.View>) : null}

      <react_native_1.View style={[styles.content, isOwn && styles.contentOwn]}>
        {!isOwn && showAuthorName ? <react_native_1.Text style={styles.authorName}>{authorName}</react_native_1.Text> : null}
        {topic ? <react_native_1.Text style={styles.topicBadge}>{topic}</react_native_1.Text> : null}

        <react_native_1.View style={[styles.bubbleStack, isOwn && styles.bubbleStackOwn]}>
          <react_native_1.View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
            {isOwn ? (<react_native_1.View style={[styles.metaColumn, styles.metaColumnOwn, !hasBubbleContent && styles.metaColumnOnly]}>
                {meta}
              </react_native_1.View>) : null}
            {hasBubbleContent ? (<react_native_1.View style={styles.bubbleWrap}>
                {endsGroup ? (<react_native_1.View style={[
                      styles.tail,
                      isOwn ? styles.tailOwn : styles.tailOther,
                      isOwn ? styles.tailOwnColor : styles.tailOtherColor,
                  ]}/>) : null}

                <react_native_1.View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  {replyBody ? (<react_native_1.View style={styles.replyPreview}>
                      {replyAuthorName ? (<react_native_1.Text style={styles.replyAuthor} numberOfLines={1}>
                          {replyAuthorName}
                        </react_native_1.Text>) : null}
                      <react_native_1.Text style={styles.replyBody} numberOfLines={1}>
                        {replyBody}
                      </react_native_1.Text>
                    </react_native_1.View>) : null}

                  {body ? (<react_native_1.Text style={styles.body}>
                      {isEncrypted ? "\uD83D\uDD12 " : ''}
                      {body}
                    </react_native_1.Text>) : null}

                  {poll ? (<react_native_1.View style={styles.pollCard}>
                      <react_native_1.View style={styles.pollHeader}>
                        <react_native_1.Text style={styles.pollBadge}>{"\uD83D\uDDF3"}</react_native_1.Text>
                        <react_native_1.Text style={styles.pollQuestion}>{poll.question}</react_native_1.Text>
                      </react_native_1.View>
                      {poll.options.map(function (option) {
                        var percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                        return (<react_native_1.TouchableOpacity key={option.id} activeOpacity={onPressPollOption ? 0.8 : 1} disabled={!onPressPollOption || poll.closed} onPress={function () { return onPressPollOption === null || onPressPollOption === void 0 ? void 0 : onPressPollOption(option.id, option.voted); }} style={[
                                styles.pollOption,
                                option.voted && styles.pollOptionActive,
                                poll.closed && styles.pollOptionClosed,
                            ]}>
                            <react_native_1.View style={[
                                styles.pollOptionFill,
                                option.voted ? styles.pollOptionFillActive : styles.pollOptionFillInactive,
                                { width: "".concat(percentage, "%") },
                            ]}/>
                            <react_native_1.View style={styles.pollOptionRow}>
                              <react_native_1.Text style={[
                                    styles.pollOptionText,
                                    option.voted && styles.pollOptionTextActive,
                                ]} numberOfLines={1}>
                                {option.text}
                              </react_native_1.Text>
                              <react_native_1.Text style={styles.pollOptionMeta}>
                                {percentage}% ({option.voteCount})
                              </react_native_1.Text>
                            </react_native_1.View>
                          </react_native_1.TouchableOpacity>);
                    })}
                      {poll.footerLabel ? <react_native_1.Text style={styles.pollFooter}>{poll.footerLabel}</react_native_1.Text> : null}
                    </react_native_1.View>) : null}

                  {translatedBody ? (<react_native_1.View style={styles.translatedWrap}>
                      {translatedLabel ? (<react_native_1.Text style={styles.translatedLabel}>{translatedLabel}</react_native_1.Text>) : null}
                      <react_native_1.Text style={styles.translatedBody}>{translatedBody}</react_native_1.Text>
                    </react_native_1.View>) : null}

                  {threadButtonLabel ? (<react_native_1.TouchableOpacity style={styles.threadButton} activeOpacity={onPressThread ? 0.75 : 1} disabled={!onPressThread} onPress={onPressThread}>
                      <react_native_1.Text style={styles.threadButtonText}>{threadButtonLabel}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>) : null}
                </react_native_1.View>
              </react_native_1.View>) : null}
            {!isOwn ? (<react_native_1.View style={[styles.metaColumn, styles.metaColumnOther, !hasBubbleContent && styles.metaColumnOnly]}>
                {meta}
              </react_native_1.View>) : null}
          </react_native_1.View>

          {reactions && reactions.length > 0 ? (<react_native_1.View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              {reactions.map(function (reaction) { return (<react_native_1.TouchableOpacity key={reaction.emoji} activeOpacity={onPressReaction ? 0.7 : 1} disabled={!onPressReaction} onPress={function () { return onPressReaction === null || onPressReaction === void 0 ? void 0 : onPressReaction(reaction.emoji); }} style={[
                      styles.reactionChip,
                      reaction.reactedByMe && styles.reactionChipActive,
                  ]}>
                  <react_native_1.Text style={styles.reactionEmoji}>{reaction.emoji}</react_native_1.Text>
                  <react_native_1.Text style={styles.reactionCount}>{reaction.count}</react_native_1.Text>
                </react_native_1.TouchableOpacity>); })}
              {showActionChips && onPressAddReaction ? (<react_native_1.TouchableOpacity activeOpacity={0.75} onPress={onPressAddReaction} style={styles.reactionAddChip}>
                  <react_native_1.Text style={styles.reactionAddEmoji}>{"\uD83D\uDE0A"}</react_native_1.Text>
                  <react_native_1.Text style={styles.reactionAddLabel}>+</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {showActionChips && onPressMore ? (<react_native_1.TouchableOpacity activeOpacity={0.75} onPress={onPressMore} style={styles.reactionMoreChip}>
                  <react_native_1.Text style={styles.reactionMoreLabel}>{"\u22EF"}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
            </react_native_1.View>) : showActionChips && onPressAddReaction ? (<react_native_1.View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              <react_native_1.TouchableOpacity activeOpacity={0.75} onPress={onPressAddReaction} style={styles.reactionAddChip}>
                <react_native_1.Text style={styles.reactionAddEmoji}>{"\uD83D\uDE0A"}</react_native_1.Text>
                <react_native_1.Text style={styles.reactionAddLabel}>+</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              {onPressMore ? (<react_native_1.TouchableOpacity activeOpacity={0.75} onPress={onPressMore} style={styles.reactionMoreChip}>
                  <react_native_1.Text style={styles.reactionMoreLabel}>{"\u22EF"}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
            </react_native_1.View>) : showActionChips && onPressMore ? (<react_native_1.View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
              <react_native_1.TouchableOpacity activeOpacity={0.75} onPress={onPressMore} style={styles.reactionMoreChip}>
                <react_native_1.Text style={styles.reactionMoreLabel}>{"\u22EF"}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>) : null}
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.View>);
});
exports.default = MessageBubble;
var styles = react_native_1.StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: theme_1.spacing.lg,
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
        marginRight: theme_1.spacing.sm,
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
        color: theme_1.colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    topicBadge: {
        alignSelf: 'flex-start',
        marginBottom: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: '#2b2d31',
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
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
        backgroundColor: theme_1.colors.talkOwnBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
        borderTopRightRadius: 7,
        borderBottomRightRadius: 7,
    },
    bubbleOther: {
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkOtherBubbleBorder,
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
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme_1.colors.talkOtherBubbleBorder,
    },
    tailOwnColor: {
        backgroundColor: theme_1.colors.talkOwnBubble,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
    },
    replyPreview: {
        marginBottom: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 7,
        borderRadius: 12,
        backgroundColor: '#2b2d31',
        borderLeftWidth: 2,
        borderLeftColor: '#5865f2',
    },
    replyAuthor: {
        marginBottom: 3,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    replyBody: {
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.sm,
    },
    body: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 22,
    },
    translatedWrap: {
        marginTop: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: 14,
        backgroundColor: '#2b2d31',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    translatedLabel: {
        marginBottom: 3,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    translatedBody: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    threadButton: {
        alignSelf: 'flex-start',
        marginTop: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: 7,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.talkAction,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    threadButtonText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    pollCard: {
        marginTop: theme_1.spacing.sm,
        padding: theme_1.spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: '#2b2d31',
        gap: theme_1.spacing.xs,
    },
    pollHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        marginBottom: 2,
    },
    pollBadge: {
        fontSize: theme_1.fontSize.base,
    },
    pollQuestion: {
        flex: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    pollOption: {
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    pollOptionActive: {
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
    },
    pollOptionClosed: {
        opacity: 0.9,
    },
    pollOptionFill: __assign(__assign({}, react_native_1.StyleSheet.absoluteFillObject), { right: 'auto' }),
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
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.sm,
    },
    pollOptionText: {
        flex: 1,
        color: '#243544',
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    pollOptionTextActive: {
        color: '#8a6d00',
    },
    pollOptionMeta: {
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    pollFooter: {
        marginTop: 4,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
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
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.74)',
        paddingHorizontal: theme_1.spacing.sm,
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
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 5,
    },
    reactionAddEmoji: {
        fontSize: theme_1.fontSize.sm,
    },
    reactionAddLabel: {
        color: '#53697f',
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    reactionMoreChip: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 5,
    },
    reactionMoreLabel: {
        color: '#53697f',
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
        lineHeight: theme_1.fontSize.base,
    },
    reactionEmoji: {
        fontSize: theme_1.fontSize.base,
    },
    reactionCount: {
        color: '#5d6d7e',
        fontSize: theme_1.fontSize.sm,
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
        color: theme_1.colors.talkMeta,
        fontSize: 10,
        fontWeight: '500',
    },
    readCount: {
        color: theme_1.colors.talkMeta,
        fontSize: 10,
        fontWeight: '800',
    },
});
