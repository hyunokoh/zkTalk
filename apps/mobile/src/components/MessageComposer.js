"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var theme_1 = require("../theme");
// Popular emojis for the picker
var EMOJI_LIST = [
    "\uD83D\uDE00",
    "\uD83D\uDE02",
    "\uD83D\uDE05",
    "\uD83D\uDE06",
    "\uD83D\uDE0D",
    "\uD83D\uDE18",
    "\uD83D\uDE0E",
    "\uD83E\uDD14",
    "\uD83D\uDE44",
    "\uD83D\uDE2D",
    "\uD83D\uDE21",
    "\uD83D\uDE25",
    "\uD83D\uDC4D",
    "\uD83D\uDC4F",
    "\uD83D\uDE4F",
    "\uD83D\uDCAA",
    "\u2764\uFE0F",
    "\uD83D\uDD25",
    "\uD83C\uDF89",
    "\uD83C\uDF8A",
    "\u2705",
    "\u274C",
    "\u2B50",
    "\uD83D\uDCAF",
    "\uD83D\uDE0A",
    "\uD83D\uDE09",
    "\uD83E\uDD17",
    "\uD83E\uDD2D",
    "\uD83D\uDCA1",
    "\uD83D\uDC4B",
];
/**
 * Isolated message composer component.
 * Uses React.memo to prevent parent re-renders (message polling, WebSocket events,
 * FlatList updates) from propagating to the TextInput, which would break Korean
 * IME composition.
 *
 * Key design decisions:
 * - Text stored in a ref (textRef), NOT state. No setState = no re-render.
 * - Uses `onChange` (nativeEvent.text) instead of `onChangeText` to avoid
 *   issues with controlled vs uncontrolled inputs during IME composition.
 * - inputRef.clear() is used to reset the input after sending (not controlled value).
 */
var MessageComposer = (0, react_1.memo)(function MessageComposer(_a) {
    var _this = this;
    var placeholder = _a.placeholder, sendLabel = _a.sendLabel, sendingLabel = _a.sendingLabel, isSending = _a.isSending, onSend = _a.onSend, onTypingStart = _a.onTypingStart, onTypingStop = _a.onTypingStop, onPressAdd = _a.onPressAdd, _b = _a.allowEmptySubmit, allowEmptySubmit = _b === void 0 ? false : _b, draftText = _a.draftText, draftKey = _a.draftKey, _c = _a.testIDPrefix, testIDPrefix = _c === void 0 ? 'message-composer' : _c;
    var textRef = (0, react_1.useRef)('');
    var inputRef = (0, react_1.useRef)(null);
    var isTypingRef = (0, react_1.useRef)(false);
    var isSubmittingRef = (0, react_1.useRef)(false);
    var _d = (0, react_1.useState)(false), showEmoji = _d[0], setShowEmoji = _d[1];
    var handleChange = (0, react_1.useCallback)(function (e) {
        textRef.current = e.nativeEvent.text;
        var hasText = e.nativeEvent.text.trim().length > 0;
        if (hasText && !isTypingRef.current) {
            isTypingRef.current = true;
            onTypingStart === null || onTypingStart === void 0 ? void 0 : onTypingStart();
        }
        else if (!hasText && isTypingRef.current) {
            isTypingRef.current = false;
            onTypingStop === null || onTypingStop === void 0 ? void 0 : onTypingStop();
        }
    }, [onTypingStart, onTypingStop]);
    var handleSend = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var trimmed, shouldClear;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    trimmed = textRef.current.trim();
                    if ((!trimmed && !allowEmptySubmit) || isSending || isSubmittingRef.current)
                        return [2 /*return*/];
                    isSubmittingRef.current = true;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, Promise.resolve(onSend(trimmed))];
                case 2:
                    shouldClear = _b.sent();
                    if (shouldClear === false)
                        return [2 /*return*/];
                    textRef.current = '';
                    (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.clear();
                    isTypingRef.current = false;
                    setShowEmoji(false);
                    onTypingStop === null || onTypingStop === void 0 ? void 0 : onTypingStop();
                    return [3 /*break*/, 4];
                case 3:
                    isSubmittingRef.current = false;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [allowEmptySubmit, isSending, onSend, onTypingStop]);
    var handleEmojiPress = (0, react_1.useCallback)(function (emoji) {
        var _a;
        textRef.current += emoji;
        // We need to set the native text value. Since we don't use controlled
        // value, we use setNativeProps.
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.setNativeProps({ text: textRef.current });
        if (!isTypingRef.current && textRef.current.trim().length > 0) {
            isTypingRef.current = true;
            onTypingStart === null || onTypingStart === void 0 ? void 0 : onTypingStart();
        }
    }, [onTypingStart]);
    var toggleEmoji = (0, react_1.useCallback)(function () {
        setShowEmoji(function (prev) { return !prev; });
    }, []);
    (0, react_1.useEffect)(function () {
        var _a, _b;
        if (draftKey === undefined)
            return;
        textRef.current = draftText !== null && draftText !== void 0 ? draftText : '';
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.setNativeProps({
            text: textRef.current,
            selection: {
                start: textRef.current.length,
                end: textRef.current.length,
            },
        });
        (_b = inputRef.current) === null || _b === void 0 ? void 0 : _b.focus();
        var hasText = textRef.current.trim().length > 0;
        if (hasText) {
            isTypingRef.current = true;
            onTypingStart === null || onTypingStart === void 0 ? void 0 : onTypingStart();
        }
        else if (isTypingRef.current) {
            isTypingRef.current = false;
            onTypingStop === null || onTypingStop === void 0 ? void 0 : onTypingStop();
        }
    }, [draftKey, draftText, onTypingStart, onTypingStop]);
    return (<react_native_1.View>
      {showEmoji && (<react_native_1.View style={styles.emojiPanel}>
          <react_native_1.ScrollView horizontal={false} contentContainerStyle={styles.emojiGrid} keyboardShouldPersistTaps="always">
            {EMOJI_LIST.map(function (emoji) { return (<react_native_1.TouchableOpacity key={emoji} style={styles.emojiButton} onPress={function () { return handleEmojiPress(emoji); }}>
                <react_native_1.Text style={styles.emojiText}>{emoji}</react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.ScrollView>
        </react_native_1.View>)}
      <react_native_1.View style={styles.composer}>
        {onPressAdd && (<react_native_1.TouchableOpacity testID={"".concat(testIDPrefix, "-attach")} style={styles.attachButton} onPress={onPressAdd} activeOpacity={0.8}>
            <react_native_1.Text style={styles.attachButtonText}>+</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
        <react_native_1.View style={styles.inputWrap}>
          <react_native_1.TextInput testID={"".concat(testIDPrefix, "-input")} ref={inputRef} style={styles.input} placeholder={placeholder} placeholderTextColor={theme_1.colors.talkSubtle} onChange={handleChange} multiline maxLength={4000}/>
        </react_native_1.View>
        <react_native_1.TouchableOpacity style={styles.emojiToggle} onPress={toggleEmoji} activeOpacity={0.8}>
          <react_native_1.Text style={styles.emojiToggleText}>
            {showEmoji ? "\u2328\uFE0F" : "\uD83D\uDE00"}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity testID={"".concat(testIDPrefix, "-send")} style={[styles.sendButton, isSending && styles.sendDisabled]} onPress={handleSend} disabled={isSending} activeOpacity={0.85} accessibilityLabel={isSending ? sendingLabel : sendLabel}>
          <react_native_1.Text style={styles.sendText}>{isSending ? '...' : '\u2191'}</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
});
exports.default = MessageComposer;
var styles = react_native_1.StyleSheet.create({
    composer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: theme_1.spacing.md,
        paddingTop: theme_1.spacing.xs,
        paddingBottom: theme_1.spacing.md,
        backgroundColor: theme_1.colors.talkBackground,
    },
    attachButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme_1.colors.talkOtherBubble,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    attachButtonText: {
        color: theme_1.colors.talkMeta,
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 24,
    },
    inputWrap: {
        flex: 1,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        minHeight: 56,
        justifyContent: 'center',
        paddingHorizontal: theme_1.spacing.lg,
        marginRight: theme_1.spacing.sm,
        shadowColor: '#6c8094',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    input: {
        paddingVertical: 15,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        maxHeight: 120,
        minHeight: 56,
    },
    emojiToggle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.xs,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        shadowColor: '#6c8094',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    emojiToggleText: {
        fontSize: 22,
    },
    sendButton: {
        backgroundColor: theme_1.colors.talkOwnBubble,
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6c8094',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    sendDisabled: {
        opacity: 0.4,
    },
    sendText: {
        color: theme_1.colors.white,
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 22,
    },
    // Emoji panel
    emojiPanel: {
        marginHorizontal: theme_1.spacing.md,
        marginBottom: theme_1.spacing.sm,
        borderRadius: 24,
        backgroundColor: theme_1.colors.talkPanel,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        maxHeight: 180,
        paddingVertical: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.sm,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    emojiButton: {
        width: '16.66%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 26,
    },
});
