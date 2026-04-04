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
exports.default = CreateCommunityScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var community_slug_1 = require("../lib/community-slug");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function CreateCommunityScreen(_a) {
    var navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var isFocused = (0, native_1.useIsFocused)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), name = _b[0], setName = _b[1];
    var _c = (0, react_1.useState)(''), description = _c[0], setDescription = _c[1];
    var _d = (0, react_1.useState)(''), slug = _d[0], setSlug = _d[1];
    var _e = (0, react_1.useState)(''), slugInput = _e[0], setSlugInput = _e[1];
    var _f = (0, react_1.useState)('public'), visibility = _f[0], setVisibility = _f[1];
    var _g = (0, react_1.useState)('idle'), slugFeedback = _g[0], setSlugFeedback = _g[1];
    var slugManuallyEditedRef = (0, react_1.useRef)(false);
    var devActionAttemptedRef = (0, react_1.useRef)(false);
    react_1.default.useEffect(function () {
        if (!isFocused) {
            devActionAttemptedRef.current = false;
        }
    }, [isFocused]);
    var applySlugState = (0, react_1.useCallback)(function (nextState) {
        setSlug(nextState.slug);
        setSlugInput(nextState.slugInput);
        setSlugFeedback(nextState.slugFeedback);
    }, []);
    var handleNameChange = (0, react_1.useCallback)(function (nextName) {
        setName(nextName);
        if (!slugManuallyEditedRef.current) {
            applySlugState((0, community_slug_1.getAutoCommunitySlugState)(nextName));
        }
    }, [applySlugState]);
    var handleNameEndEditing = (0, react_1.useCallback)(function () {
        if (!slugManuallyEditedRef.current) {
            applySlugState((0, community_slug_1.getAutoCommunitySlugState)(name));
        }
    }, [applySlugState, name]);
    var handleDescChange = (0, react_1.useCallback)(function (nextDescription) {
        setDescription(nextDescription);
    }, []);
    var handleSlugChange = (0, react_1.useCallback)(function (value) {
        slugManuallyEditedRef.current = value.trim().length > 0;
        applySlugState((0, community_slug_1.getManualCommunitySlugState)(value));
    }, [applySlugState]);
    var createMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)('/api/communities', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    slug: (0, community_slug_1.resolveCommunitySlugForSubmit)(name, slug),
                    visibility: visibility,
                },
            });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
            navigation.goBack();
        },
        onError: function (err) {
            react_native_1.Alert.alert(t('common.error'), err instanceof Error ? err.message : t('community.createError'));
        },
    });
    var handleCreate = (0, react_1.useCallback)(function () {
        if (!name.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('community.nameRequired'));
            return;
        }
        var finalSlug = (0, community_slug_1.resolveCommunitySlugForSubmit)(name, slug);
        if (!finalSlug) {
            applySlugState((0, community_slug_1.getAutoCommunitySlugState)(name));
            react_native_1.Alert.alert(t('common.error'), t('community.slugRequired'));
            return;
        }
        createMutation.mutate();
    }, [applySlugState, createMutation, name, slug, t]);
    react_1.default.useEffect(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || !isFocused || devActionAttemptedRef.current)
            return;
        var cancelled = false;
        var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
        var runDevAction = function () { return __awaiter(void 0, void 0, void 0, function () {
            var action, name_1, initialSlugState, previewState, finalSlug, result, error_1, _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        if (!!cancelled || devActionAttemptedRef.current) return [3 /*break*/, 16];
                        return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-create-community-action.json')];
                    case 1:
                        action = _k.sent();
                        if (!(!action || cancelled)) return [3 /*break*/, 3];
                        return [4 /*yield*/, sleep(250)];
                    case 2:
                        _k.sent();
                        return [3 /*break*/, 0];
                    case 3:
                        _k.trys.push([3, 9, 11, 13]);
                        if (action.type !== 'create' && action.type !== 'preview') {
                            throw new Error('Unsupported create community dev action');
                        }
                        name_1 = (_a = action.name) === null || _a === void 0 ? void 0 : _a.trim();
                        if (!name_1) {
                            throw new Error('Missing name for create community dev action');
                        }
                        devActionAttemptedRef.current = true;
                        setName(name_1);
                        setDescription((_c = (_b = action.description) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : '');
                        setVisibility((_d = action.visibility) !== null && _d !== void 0 ? _d : 'public');
                        initialSlugState = ((_e = action.slug) === null || _e === void 0 ? void 0 : _e.trim())
                            ? (0, community_slug_1.getManualCommunitySlugState)(action.slug.trim())
                            : (0, community_slug_1.getAutoCommunitySlugState)(name_1);
                        slugManuallyEditedRef.current = Boolean((_f = action.slug) === null || _f === void 0 ? void 0 : _f.trim());
                        applySlugState(initialSlugState);
                        if (!(action.type === 'preview')) return [3 /*break*/, 5];
                        previewState = initialSlugState;
                        if (typeof action.slugInput === 'string') {
                            previewState = (0, community_slug_1.getManualCommunitySlugState)(action.slugInput);
                            slugManuallyEditedRef.current = true;
                            applySlugState(previewState);
                        }
                        return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-create-community-result.json', {
                                ok: true,
                                action: 'preview',
                                slugInput: previewState.slugInput,
                                slug: previewState.slug,
                                slugFeedback: previewState.slugFeedback,
                                isWarning: previewState.isWarning,
                                canSubmit: (0, community_slug_1.canSubmitCommunitySlug)(name_1, previewState.slug),
                            })];
                    case 4:
                        _k.sent();
                        return [2 /*return*/];
                    case 5:
                        finalSlug = (0, community_slug_1.resolveCommunitySlugForSubmit)(name_1, initialSlugState.slug);
                        if (!finalSlug) {
                            throw new Error('Unable to resolve slug for create community dev action');
                        }
                        return [4 /*yield*/, (0, api_1.api)('/api/communities', {
                                method: 'POST',
                                body: {
                                    name: name_1,
                                    description: ((_h = (_g = action.description) === null || _g === void 0 ? void 0 : _g.trim()) !== null && _h !== void 0 ? _h : '') || undefined,
                                    slug: finalSlug,
                                    visibility: (_j = action.visibility) !== null && _j !== void 0 ? _j : 'public',
                                },
                            })];
                    case 6:
                        result = _k.sent();
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['communities'] })];
                    case 7:
                        _k.sent();
                        return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-create-community-result.json', {
                                ok: true,
                                communityId: result.community.id,
                                slugInput: initialSlugState.slugInput,
                                slug: result.community.slug,
                                slugFeedback: initialSlugState.slugFeedback,
                                isWarning: initialSlugState.isWarning,
                                canSubmit: (0, community_slug_1.canSubmitCommunitySlug)(name_1, initialSlugState.slug),
                                name: result.community.name,
                            })];
                    case 8:
                        _k.sent();
                        return [2 /*return*/];
                    case 9:
                        error_1 = _k.sent();
                        return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-create-community-result.json', {
                                ok: false,
                                error: error_1 instanceof Error ? error_1.message : String(error_1),
                            })];
                    case 10:
                        _k.sent();
                        return [2 /*return*/];
                    case 11: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-create-community-action.json')];
                    case 12:
                        _k.sent();
                        return [7 /*endfinally*/];
                    case 13: return [3 /*break*/, 15];
                    case 14: return [3 /*break*/, 15];
                    case 15: return [3 /*break*/, 0];
                    case 16: return [2 /*return*/];
                }
            });
        }); };
        void runDevAction();
        return function () {
            cancelled = true;
        };
    }, [applySlugState, isFocused, queryClient]);
    var VISIBILITY_OPTIONS = [
        { key: 'public', label: t('community.public') },
        { key: 'invite_only', label: t('community.inviteOnly') },
        { key: 'private', label: t('community.private') },
    ];
    var slugHelpText = slugFeedback === 'auto' && slug
        ? t('community.slugAutoGenerated', { slug: slug })
        : slugFeedback === 'converted' && slug
            ? t('community.slugConverted', { slug: slug })
            : slugFeedback === 'invalid'
                ? t('community.slugInvalid')
                : slugFeedback === 'needsManual'
                    ? t('community.slugNeedsManual')
                    : t('community.slugRules');
    var isSlugWarning = (0, community_slug_1.isCommunitySlugWarning)(slugFeedback);
    var slugPreviewText = slug
        ? t('community.slugPreviewValue', { slug: slug })
        : t('community.slugPreviewEmpty');
    var canCreate = !createMutation.isPending &&
        (0, community_slug_1.canSubmitCommunitySlug)(name, slug);
    var createButtonHint = !name.trim()
        ? t('community.nameRequired')
        : canCreate
            ? t('community.createBtn')
            : slugHelpText;
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.name')}</react_native_1.Text>
          <react_native_1.TextInput testID="create-community-name-input" style={styles.input} placeholder={t('community.namePlaceholder')} placeholderTextColor={theme_1.colors.textDim} value={name} onChangeText={handleNameChange} onEndEditing={handleNameEndEditing} maxLength={100} autoFocus/>
        </react_native_1.View>

        {/* Description */}
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.description')}</react_native_1.Text>
          <react_native_1.TextInput style={[styles.input, styles.textArea]} placeholder={t('community.descPlaceholder')} placeholderTextColor={theme_1.colors.textDim} value={description} onChangeText={handleDescChange} multiline maxLength={500} numberOfLines={3}/>
        </react_native_1.View>

        {/* Slug */}
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.slug')}</react_native_1.Text>
          <react_native_1.TextInput testID="create-community-slug-input" accessibilityHint={slugHelpText} style={[
            styles.input,
            isSlugWarning && styles.inputWarning,
        ]} placeholder={t('community.slugPlaceholder')} placeholderTextColor={theme_1.colors.textDim} value={slugInput} onChangeText={handleSlugChange} maxLength={60} autoCapitalize="none" autoCorrect={false}/>
          <react_native_1.Text testID="create-community-slug-help" accessibilityLiveRegion="polite" style={[
            styles.helpText,
            isSlugWarning && styles.helpTextWarning,
        ]}>
            {slugHelpText}
          </react_native_1.Text>
          <react_native_1.Text testID="create-community-slug-preview" accessibilityLiveRegion="polite" style={[
            styles.previewText,
            slug && styles.previewTextResolved,
        ]}>
            {slugPreviewText}
          </react_native_1.Text>
        </react_native_1.View>

        {/* Visibility */}
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.visibility')}</react_native_1.Text>
          <react_native_1.View style={styles.visibilityContainer}>
            {VISIBILITY_OPTIONS.map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[
                styles.visibilityOption,
                visibility === option.key && styles.visibilitySelected,
            ]} onPress={function () { return setVisibility(option.key); }}>
                <react_native_1.Text style={[
                styles.visibilityText,
                visibility === option.key && styles.visibilityTextSelected,
            ]}>
                  {option.label}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.View>
        </react_native_1.View>

        {/* Create button */}
        <react_native_1.TouchableOpacity testID="create-community-submit" accessibilityHint={createButtonHint} accessibilityState={{ disabled: !canCreate, busy: createMutation.isPending }} style={[
            styles.createButton,
            !canCreate && styles.createButtonDisabled,
        ]} onPress={handleCreate} disabled={!canCreate}>
          <react_native_1.Text style={styles.createButtonText}>
            {createMutation.isPending ? t('community.creating') : t('community.createBtn')}
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
    inputWarning: {
        borderWidth: 1,
        borderColor: theme_1.colors.warning,
    },
    helpText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    previewText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    previewTextResolved: {
        color: theme_1.colors.primary,
    },
    helpTextWarning: {
        color: theme_1.colors.warning,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    visibilityContainer: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    visibilityOption: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    visibilitySelected: {
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.primary + '15',
    },
    visibilityText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    visibilityTextSelected: {
        color: theme_1.colors.primary,
    },
    createButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.lg,
        alignItems: 'center',
        marginTop: theme_1.spacing.md,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
});
