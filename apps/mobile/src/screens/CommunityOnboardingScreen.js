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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommunityOnboardingScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var shared_1 = require("@zktalk/shared");
var theme_1 = require("../theme");
function getChannelAccessBadgeStyle(accessPolicy) {
    if (accessPolicy === 'public') {
        return styles.channelPolicyBadgeOpen;
    }
    if (accessPolicy === 'invite_only') {
        return styles.channelPolicyBadgeInvite;
    }
    return styles.channelPolicyBadgeJoin;
}
function parseJsonArray(value) {
    if (!value)
        return [];
    try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(function (item) { return typeof item === 'string'; }) : [];
    }
    catch (_a) {
        return [];
    }
}
function CommunityOnboardingScreen(_a) {
    var _this = this;
    var _b, _c;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)(false), isEnabled = _d[0], setIsEnabled = _d[1];
    var _e = (0, react_1.useState)(''), welcomeMessage = _e[0], setWelcomeMessage = _e[1];
    var _f = (0, react_1.useState)(''), rulesText = _f[0], setRulesText = _f[1];
    var _g = (0, react_1.useState)([]), defaultChannelIds = _g[0], setDefaultChannelIds = _g[1];
    var _h = (0, react_1.useState)(''), channelSearchQuery = _h[0], setChannelSearchQuery = _h[1];
    var onboardingQuery = (0, react_query_1.useQuery)({
        queryKey: ['community-onboarding', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/onboarding"));
        },
    });
    var channelsQuery = (0, react_query_1.useQuery)({
        queryKey: ['channels', route.params.communityId],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/channels"))];
                    case 1:
                        res = _c.sent();
                        return [2 /*return*/, __spreadArray(__spreadArray([], ((_a = res.uncategorized) !== null && _a !== void 0 ? _a : []), true), ((_b = res.categories) !== null && _b !== void 0 ? _b : []).flatMap(function (category) { var _a; return (_a = category.channels) !== null && _a !== void 0 ? _a : []; }), true)];
                }
            });
        }); },
    });
    (0, react_1.useEffect)(function () {
        var _a, _b;
        var onboarding = (_a = onboardingQuery.data) === null || _a === void 0 ? void 0 : _a.onboarding;
        if (!onboarding)
            return;
        setIsEnabled(Boolean(onboarding.isEnabled));
        setWelcomeMessage((_b = onboarding.welcomeMessage) !== null && _b !== void 0 ? _b : '');
        setRulesText(parseJsonArray(onboarding.rules).join('\n'));
        setDefaultChannelIds(parseJsonArray(onboarding.defaultChannelIds));
    }, [(_b = onboardingQuery.data) === null || _b === void 0 ? void 0 : _b.onboarding]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function (payload) {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/onboarding"), {
                method: 'PUT',
                body: payload !== null && payload !== void 0 ? payload : {
                    isEnabled: isEnabled,
                    welcomeMessage: welcomeMessage.trim() || undefined,
                    rules: rulesText
                        .split('\n')
                        .map(function (rule) { return rule.trim(); })
                        .filter(Boolean),
                    defaultChannelIds: defaultChannelIds,
                },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({
                            queryKey: ['community-onboarding', route.params.communityId],
                        })];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('community.onboardingSavedTitle'), t('community.onboardingSavedBody'), [
                            { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.onboardingSaveFailed'));
        },
    });
    var channels = (_c = channelsQuery.data) !== null && _c !== void 0 ? _c : [];
    var filteredChannels = (0, react_1.useMemo)(function () {
        var normalizedQuery = channelSearchQuery.trim().toLowerCase();
        var eligibleChannels = channels.filter(function (channel) {
            return (0, shared_1.canUseChannelAsOnboardingStarter)(channel.accessPolicy);
        });
        if (!normalizedQuery) {
            return eligibleChannels;
        }
        return eligibleChannels.filter(function (channel) { return channel.name.toLowerCase().includes(normalizedQuery); });
    }, [channelSearchQuery, channels]);
    var hasLoaded = !onboardingQuery.isLoading && !channelsQuery.isLoading;
    var ruleCount = (0, react_1.useMemo)(function () { return rulesText.split('\n').map(function (rule) { return rule.trim(); }).filter(Boolean).length; }, [rulesText]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || !hasLoaded)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, nextChannelIds, nextRules, nextWelcomeMessage, nextEnabled;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-community-onboarding-action.json')];
                        case 1:
                            action = _f.sent();
                            if (!action)
                                return [2 /*return*/];
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, , 3, 5]);
                            if (action.type !== 'save')
                                return [2 /*return*/];
                            nextChannelIds = (_b = (_a = action.defaultChannelIds) === null || _a === void 0 ? void 0 : _a.filter(function (channelId) {
                                return channels.some(function (channel) { return channel.id === channelId; });
                            })) !== null && _b !== void 0 ? _b : [];
                            nextRules = (_c = action.rules) !== null && _c !== void 0 ? _c : ['Be kind', 'Start in #general'];
                            nextWelcomeMessage = (_d = action.welcomeMessage) !== null && _d !== void 0 ? _d : 'Simulator onboarding welcome';
                            nextEnabled = (_e = action.isEnabled) !== null && _e !== void 0 ? _e : true;
                            setIsEnabled(nextEnabled);
                            setWelcomeMessage(nextWelcomeMessage);
                            setRulesText(nextRules.join('\n'));
                            setDefaultChannelIds(nextChannelIds);
                            saveMutation.mutate({
                                isEnabled: nextEnabled,
                                welcomeMessage: nextWelcomeMessage,
                                rules: nextRules,
                                defaultChannelIds: nextChannelIds,
                            });
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-community-onboarding-action.json')];
                        case 4:
                            _f.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [channels, hasLoaded, saveMutation]);
    if (!hasLoaded) {
        return <LoadingSpinner_1.default text={t('community.onboardingLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.label}>{t('community.onboardingStatus')}</react_native_1.Text>
            <react_native_1.TouchableOpacity style={[styles.toggleCard, isEnabled && styles.toggleCardActive]} onPress={function () { return setIsEnabled(function (prev) { return !prev; }); }}>
              <react_native_1.Text style={[styles.toggleTitle, isEnabled && styles.toggleTitleActive]}>
                {isEnabled ? t('community.onboardingEnabled') : t('community.onboardingDisabled')}
              </react_native_1.Text>
              <react_native_1.Text style={styles.toggleBody}>{t('community.onboardingStatusHint')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.label}>{t('community.onboardingWelcome')}</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, styles.textArea]} value={welcomeMessage} onChangeText={setWelcomeMessage} placeholder={t('community.onboardingWelcomePlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline numberOfLines={4} textAlignVertical="top" maxLength={1000}/>
          </react_native_1.View>

          <react_native_1.View style={styles.section}>
            <react_native_1.View style={styles.sectionHeader}>
              <react_native_1.Text style={styles.label}>{t('community.onboardingRules')}</react_native_1.Text>
              <react_native_1.Text style={styles.counter}>
                {t('community.onboardingRulesCount', { count: ruleCount })}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.TextInput style={[styles.input, styles.textAreaLarge]} value={rulesText} onChangeText={setRulesText} placeholder={t('community.onboardingRulesPlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline numberOfLines={6} textAlignVertical="top"/>
          </react_native_1.View>

          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.label}>{t('community.onboardingDefaultChannels')}</react_native_1.Text>
            <react_native_1.Text style={styles.helper}>{t('community.onboardingDefaultChannelsHint')}</react_native_1.Text>
            <react_native_1.Text style={styles.helper}>{t('community.onboardingDefaultChannelsPolicyHint')}</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={channelSearchQuery} onChangeText={setChannelSearchQuery} placeholder={t('community.onboardingChannelSearchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
            <react_native_1.View style={styles.channelWrap}>
              {filteredChannels.map(function (channel) {
            var selected = defaultChannelIds.includes(channel.id);
            var accessSummaryKey = (0, shared_1.getChannelAccessSummaryKey)(channel.accessPolicy);
            return (<react_native_1.TouchableOpacity key={channel.id} style={[styles.channelChip, selected && styles.channelChipSelected]} onPress={function () {
                    return setDefaultChannelIds(function (prev) {
                        return prev.includes(channel.id)
                            ? prev.filter(function (id) { return id !== channel.id; })
                            : __spreadArray(__spreadArray([], prev, true), [channel.id], false);
                    });
                }}>
                    <react_native_1.View style={styles.channelChipContent}>
                      <react_native_1.Text style={[styles.channelChipText, selected && styles.channelChipTextSelected]}>
                        # {channel.name}
                      </react_native_1.Text>
                      {accessSummaryKey ? (<react_native_1.View style={[styles.channelPolicyBadge, getChannelAccessBadgeStyle(channel.accessPolicy)]}>
                          <react_native_1.Text style={styles.channelPolicyBadgeText}>{t(accessSummaryKey)}</react_native_1.Text>
                        </react_native_1.View>) : null}
                    </react_native_1.View>
                  </react_native_1.TouchableOpacity>);
        })}
            </react_native_1.View>
            {filteredChannels.length === 0 ? (<react_native_1.Text style={styles.helper}>
                {channelSearchQuery.trim()
                ? t('community.onboardingChannelNoSearchResults')
                : t('community.onboardingNoChannels')}
              </react_native_1.Text>) : null}
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]} onPress={function () { return saveMutation.mutate(undefined); }} disabled={saveMutation.isPending}>
            <react_native_1.Text style={styles.saveButtonText}>
              {saveMutation.isPending ? t('community.onboardingSaving') : t('common.save')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
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
        gap: theme_1.spacing.xl,
    },
    section: {
        gap: theme_1.spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    counter: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.sm,
    },
    helper: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    toggleCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    toggleCardActive: {
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.primary + '15',
    },
    toggleTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    toggleTitleActive: {
        color: theme_1.colors.primaryLight,
    },
    toggleBody: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.xs,
        lineHeight: 20,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
    },
    textArea: {
        minHeight: 96,
    },
    textAreaLarge: {
        minHeight: 140,
    },
    channelWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
    },
    channelChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    channelChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
    },
    channelChipSelected: {
        backgroundColor: theme_1.colors.primary,
    },
    channelChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    channelChipTextSelected: {
        color: theme_1.colors.white,
    },
    channelPolicyBadge: {
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    channelPolicyBadgeOpen: {
        backgroundColor: '#d1fae5',
    },
    channelPolicyBadgeJoin: {
        backgroundColor: '#dbeafe',
    },
    channelPolicyBadgeInvite: {
        backgroundColor: '#fef3c7',
    },
    channelPolicyBadgeText: {
        color: '#1f2937',
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    saveButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
        marginTop: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.xl,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
});
