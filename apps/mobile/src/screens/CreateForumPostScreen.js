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
exports.default = CreateForumPostScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function CreateForumPostScreen(_a) {
    var _this = this;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var devCreateAttemptedRef = (0, react_1.useRef)(false);
    var _b = (0, react_1.useState)(''), title = _b[0], setTitle = _b[1];
    var _c = (0, react_1.useState)(''), body = _c[0], setBody = _c[1];
    var createMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/threads"), {
                method: 'POST',
                body: {
                    title: title.trim(),
                    bodyMarkdown: body.trim(),
                },
            });
        },
        onSuccess: function (result) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['forum-threads', route.params.channelId] })];
                    case 1:
                        _a.sent();
                        navigation.replace('ThreadScreen', {
                            threadId: result.thread.id,
                            channelId: route.params.channelId,
                            communityId: route.params.communityId,
                            channelName: route.params.channelName,
                            rootMessageId: result.thread.rootMessageId,
                        });
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('forum.createError'));
        },
    });
    var handleCreate = (0, react_1.useCallback)(function () {
        if (!title.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('forum.titleRequired'));
            return;
        }
        if (!body.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('forum.bodyRequired'));
            return;
        }
        createMutation.mutate();
    }, [body, createMutation, t, title]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devCreateAttemptedRef.current) {
            return;
        }
        function runDevCreateForumPost() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-create-forum-post.json')];
                        case 1:
                            parsed = _c.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devCreateAttemptedRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-create-forum-post.json')];
                        case 2:
                            _c.sent();
                            setTitle(((_a = parsed === null || parsed === void 0 ? void 0 : parsed.title) === null || _a === void 0 ? void 0 : _a.trim()) || 'Simulator forum post test');
                            setBody(((_b = parsed === null || parsed === void 0 ? void 0 : parsed.body) === null || _b === void 0 ? void 0 : _b.trim()) || 'Simulator forum post body');
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevCreateForumPost();
    }, []);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || !devCreateAttemptedRef.current || createMutation.isPending) {
            return;
        }
        if (!title.trim() || !body.trim()) {
            return;
        }
        function submitDevCreateForumPost() {
            return __awaiter(this, void 0, void 0, function () {
                var claimed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.claimSimulatorHarnessMarker)('dev-create-forum-post-submitted.txt', title.trim())];
                        case 1:
                            claimed = _a.sent();
                            if (!claimed) {
                                return [2 /*return*/];
                            }
                            createMutation.mutate();
                            return [2 /*return*/];
                    }
                });
            });
        }
        void submitDevCreateForumPost();
    }, [body, createMutation, title]);
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('forum.postTitle')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('forum.postTitlePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={300} autoFocus/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('forum.postContent')}</react_native_1.Text>
          <react_native_1.TextInput style={[styles.input, styles.bodyInput]} value={body} onChangeText={setBody} placeholder={t('forum.postContentPlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline textAlignVertical="top" maxLength={40000}/>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]} onPress={handleCreate} disabled={createMutation.isPending}>
          <react_native_1.Text style={styles.createButtonText}>
            {createMutation.isPending ? t('forum.posting') : t('forum.createPost')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.lg,
    },
    field: {
        gap: theme_1.spacing.sm,
    },
    label: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
    },
    bodyInput: {
        minHeight: 180,
    },
    createButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme_1.spacing.md,
    },
    createButtonDisabled: {
        opacity: 0.7,
    },
    createButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
});
