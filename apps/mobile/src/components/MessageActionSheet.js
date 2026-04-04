"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
var REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];
var MessageActionSheet = (0, react_1.memo)(function MessageActionSheet(_a) {
    var message = _a.message, isOwn = _a.isOwn, onReply = _a.onReply, onThread = _a.onThread, onEdit = _a.onEdit, onReport = _a.onReport, onTranslate = _a.onTranslate, onReact = _a.onReact, onPin = _a.onPin, onBookmark = _a.onBookmark, onClose = _a.onClose, onDelete = _a.onDelete;
    var t = (0, i18n_1.useTranslation)().t;
    var handleCopy = (0, react_1.useCallback)(function () {
        var text = message.bodyPlaintext || message.bodyMarkdown || '';
        try {
            if (typeof (react_native_1.Clipboard === null || react_native_1.Clipboard === void 0 ? void 0 : react_native_1.Clipboard.setString) === 'function') {
                react_native_1.Clipboard.setString(text);
                onClose();
                return;
            }
        }
        catch (_a) {
            // Fall back to share sheet below.
        }
        react_native_1.Share.share({ message: text }).catch(function () {
            react_native_1.Alert.alert(t('common.error'), t('message.copyFailed'));
        });
        onClose();
    }, [message, onClose, t]);
    var handleReply = (0, react_1.useCallback)(function () {
        onReply === null || onReply === void 0 ? void 0 : onReply();
        onClose();
    }, [onClose, onReply]);
    var handleThread = (0, react_1.useCallback)(function () {
        onThread === null || onThread === void 0 ? void 0 : onThread();
        onClose();
    }, [onClose, onThread]);
    var handleEdit = (0, react_1.useCallback)(function () {
        onEdit === null || onEdit === void 0 ? void 0 : onEdit();
        onClose();
    }, [onClose, onEdit]);
    var handleTranslate = (0, react_1.useCallback)(function () {
        onTranslate === null || onTranslate === void 0 ? void 0 : onTranslate();
        onClose();
    }, [onClose, onTranslate]);
    var handleReport = (0, react_1.useCallback)(function () {
        onReport === null || onReport === void 0 ? void 0 : onReport();
        onClose();
    }, [onClose, onReport]);
    var handleReact = (0, react_1.useCallback)(function (emoji) {
        onReact === null || onReact === void 0 ? void 0 : onReact(emoji);
        onClose();
    }, [onClose, onReact]);
    var handlePin = (0, react_1.useCallback)(function () {
        onPin === null || onPin === void 0 ? void 0 : onPin();
        onClose();
    }, [onClose, onPin]);
    var handleBookmark = (0, react_1.useCallback)(function () {
        onBookmark === null || onBookmark === void 0 ? void 0 : onBookmark();
        onClose();
    }, [onBookmark, onClose]);
    var handleDelete = (0, react_1.useCallback)(function () {
        onDelete === null || onDelete === void 0 ? void 0 : onDelete(message);
        onClose();
    }, [message, onDelete, onClose]);
    return (<react_native_1.Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <react_native_1.TouchableWithoutFeedback onPress={onClose}>
        <react_native_1.View style={styles.overlay}>
          <react_native_1.TouchableWithoutFeedback>
            <react_native_1.View style={styles.sheet}>
              {onReact && (<react_native_1.View style={styles.reactionSection}>
                  <react_native_1.Text style={styles.reactionTitle}>{t('message.react')}</react_native_1.Text>
                  <react_native_1.View style={styles.reactionRow}>
                    {REACTION_EMOJIS.map(function (emoji) { return (<react_native_1.TouchableOpacity key={emoji} style={styles.reactionButton} onPress={function () { return handleReact(emoji); }}>
                        <react_native_1.Text style={styles.reactionButtonText}>{emoji}</react_native_1.Text>
                      </react_native_1.TouchableOpacity>); })}
                  </react_native_1.View>
                </react_native_1.View>)}
              <react_native_1.View style={styles.actionsGrid}>
                {onReply && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleReply}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDCAC"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('message.reply')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {isOwn && onEdit && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\u270F\uFE0F"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('common.edit')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {onThread && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleThread}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83E\uDDF5"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('message.thread')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                <react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleCopy}>
                  <react_native_1.View style={styles.actionIconBg}>
                    <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDCCB"}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.actionLabel}>{t('message.copy')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>

                {onTranslate && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleTranslate}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83C\uDF10"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('message.translate')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {!isOwn && onReport && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleReport}>
                    <react_native_1.View style={[styles.actionIconBg, styles.deleteIconBg]}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDEA9"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={[styles.actionLabel, styles.deleteLabel]}>
                      {t('message.report')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {onPin && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handlePin}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDCCC"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('message.pin')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {onBookmark && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleBookmark}>
                    <react_native_1.View style={styles.actionIconBg}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDD16"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.actionLabel}>{t('message.bookmark')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                {isOwn && onDelete && (<react_native_1.TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
                    <react_native_1.View style={[styles.actionIconBg, styles.deleteIconBg]}>
                      <react_native_1.Text style={styles.actionIcon}>{"\uD83D\uDDD1\uFE0F"}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={[styles.actionLabel, styles.deleteLabel]}>
                      {t('message.delete')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.TouchableWithoutFeedback>
        </react_native_1.View>
      </react_native_1.TouchableWithoutFeedback>
    </react_native_1.Modal>);
});
exports.default = MessageActionSheet;
var styles = react_native_1.StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: theme_1.colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: theme_1.colors.surface,
        borderTopLeftRadius: theme_1.borderRadius.xl,
        borderTopRightRadius: theme_1.borderRadius.xl,
        paddingTop: theme_1.spacing.xl,
        paddingBottom: theme_1.spacing.xxxl,
        paddingHorizontal: theme_1.spacing.lg,
    },
    reactionSection: {
        paddingHorizontal: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.lg,
    },
    reactionTitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginBottom: theme_1.spacing.sm,
    },
    reactionRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    reactionButton: {
        width: 44,
        height: 44,
        borderRadius: theme_1.borderRadius.md,
        backgroundColor: theme_1.colors.backgroundDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionButtonText: {
        fontSize: 24,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme_1.spacing.sm,
    },
    actionItem: {
        width: '25%',
        alignItems: 'center',
        paddingVertical: theme_1.spacing.md,
    },
    actionIconBg: {
        width: 48,
        height: 48,
        borderRadius: theme_1.borderRadius.md,
        backgroundColor: theme_1.colors.backgroundDark,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme_1.spacing.xs,
    },
    deleteIconBg: {
        backgroundColor: theme_1.colors.error + '20',
    },
    actionIcon: {
        fontSize: 22,
    },
    actionLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        textAlign: 'center',
    },
    deleteLabel: {
        color: theme_1.colors.error,
    },
});
