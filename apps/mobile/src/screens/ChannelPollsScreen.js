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
exports.default = ChannelPollsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function ChannelPollsScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _f = (0, react_1.useState)(''), searchQuery = _f[0], setSearchQuery = _f[1];
    var _g = (0, react_1.useState)('all'), statusFilter = _g[0], setStatusFilter = _g[1];
    var _h = (0, react_1.useState)('all'), voteFilter = _h[0], setVoteFilter = _h[1];
    var _j = (0, react_1.useState)('all'), privacyFilter = _j[0], setPrivacyFilter = _j[1];
    var _k = (0, react_1.useState)('all'), choiceFilter = _k[0], setChoiceFilter = _k[1];
    var _l = (0, react_1.useState)('createdAt'), sortField = _l[0], setSortField = _l[1];
    var _m = (0, react_1.useState)('newest'), sortOrder = _m[0], setSortOrder = _m[1];
    var devPollActionAttemptedRef = (0, react_1.useRef)(false);
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var permissionsQuery = (0, react_query_1.useQuery)({
        queryKey: ['channel-me-permissions', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/me-permissions"));
        },
    });
    var pollsQuery = (0, react_query_1.useQuery)({
        queryKey: ['polls', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/polls"));
        },
    });
    var canCreatePoll = (_c = (_b = permissionsQuery.data) === null || _b === void 0 ? void 0 : _b.permissions.canPostMessage) !== null && _c !== void 0 ? _c : true;
    (0, react_1.useLayoutEffect)(function () {
        navigation.setOptions({
            headerRight: function () {
                return canCreatePoll ? (<react_native_1.TouchableOpacity onPress={function () {
                        return navigation.navigate('CreatePoll', {
                            channelId: route.params.channelId,
                            channelName: route.params.channelName,
                        });
                    }} hitSlop={8}>
            <react_native_1.Text style={styles.headerAction}>+</react_native_1.Text>
          </react_native_1.TouchableOpacity>) : null;
            },
        });
    }, [canCreatePoll, navigation, route.params.channelId, route.params.channelName]);
    var voteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var pollId = _a.pollId, optionId = _a.optionId, voted = _a.voted;
            return voted
                ? (0, api_1.api)("/api/polls/".concat(pollId, "/vote/").concat(optionId), { method: 'DELETE' })
                : (0, api_1.api)("/api/polls/".concat(pollId, "/vote"), {
                    method: 'POST',
                    body: { optionId: optionId },
                });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['polls', route.params.channelId] }),
                            queryClient.invalidateQueries({ queryKey: ['polls-by-message', route.params.channelId] }),
                        ])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('poll.voteFailed'));
        },
    });
    var polls = (_e = (_d = pollsQuery.data) === null || _d === void 0 ? void 0 : _d.polls) !== null && _e !== void 0 ? _e : [];
    var statusTabs = [
        { key: 'all', label: t('poll.filterAll') },
        { key: 'open', label: t('poll.open') },
        { key: 'closed', label: t('poll.closed') },
    ];
    var voteTabs = [
        { key: 'all', label: t('poll.filterAll') },
        { key: 'voted', label: t('poll.filterVoted') },
    ];
    var privacyTabs = [
        { key: 'all', label: t('poll.filterAll') },
        { key: 'anonymous', label: t('poll.filterAnonymous') },
    ];
    var choiceTabs = [
        { key: 'all', label: t('poll.filterAll') },
        { key: 'multiple', label: t('poll.filterMultiple') },
    ];
    var filteredPolls = (0, react_1.useMemo)(function () {
        var filtered = polls.filter(function (poll) {
            var isExpired = poll.closed || (poll.expiresAt && new Date(poll.expiresAt) < new Date());
            var hasMyVote = poll.options.some(function (option) { return option.voted; });
            if (statusFilter === 'open' && isExpired) {
                return false;
            }
            if (statusFilter === 'closed' && !isExpired) {
                return false;
            }
            if (voteFilter === 'voted' && !hasMyVote) {
                return false;
            }
            if (privacyFilter === 'anonymous' && !poll.anonymous) {
                return false;
            }
            if (choiceFilter === 'multiple' && !poll.multipleChoice) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            return poll.question.toLowerCase().includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'question') {
                var left_1 = a.question.toLocaleLowerCase();
                var right_1 = b.question.toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? left_1.localeCompare(right_1)
                    : right_1.localeCompare(left_1);
            }
            if (sortField === 'votes') {
                return sortOrder === 'newest'
                    ? b.totalVotes - a.totalVotes
                    : a.totalVotes - b.totalVotes;
            }
            var left = new Date(a.createdAt).getTime();
            var right = new Date(b.createdAt).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
    }, [
        choiceFilter,
        deferredSearchQuery,
        polls,
        privacyFilter,
        sortField,
        sortOrder,
        statusFilter,
        voteFilter,
    ]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devPollActionAttemptedRef.current) {
            return;
        }
        if (pollsQuery.isLoading || voteMutation.isPending) {
            return;
        }
        function runDevPollAction() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed, poll, option, shouldUnvote, voted;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-poll-action.json')];
                        case 1:
                            parsed = _c.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devPollActionAttemptedRef.current = true;
                            poll = (_a = ((parsed === null || parsed === void 0 ? void 0 : parsed.pollId) ? polls.find(function (item) { return item.id === (parsed === null || parsed === void 0 ? void 0 : parsed.pollId); }) : null)) !== null && _a !== void 0 ? _a : polls[0];
                            option = (_b = ((parsed === null || parsed === void 0 ? void 0 : parsed.optionId)
                                ? poll === null || poll === void 0 ? void 0 : poll.options.find(function (item) { return item.id === parsed.optionId; })
                                : null)) !== null && _b !== void 0 ? _b : (typeof (parsed === null || parsed === void 0 ? void 0 : parsed.optionIndex) === 'number' ? poll === null || poll === void 0 ? void 0 : poll.options[parsed.optionIndex] : poll === null || poll === void 0 ? void 0 : poll.options[0]);
                            if (!(!poll || !option)) return [3 /*break*/, 3];
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-poll-action.json')];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                        case 3:
                            shouldUnvote = (parsed === null || parsed === void 0 ? void 0 : parsed.action) === 'unvote';
                            voted = shouldUnvote ? true : option.voted;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-poll-action.json')];
                        case 4:
                            _c.sent();
                            voteMutation.mutate({
                                pollId: poll.id,
                                optionId: option.id,
                                voted: voted,
                            });
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevPollAction();
    }, [polls, pollsQuery.isLoading, voteMutation]);
    if (pollsQuery.isLoading) {
        return <LoadingSpinner_1.default text={t('poll.loading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.FlatList data={filteredPolls} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={pollsQuery.isRefetching} onRefresh={pollsQuery.refetch} tintColor={theme_1.colors.primary}/>} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
            <react_native_1.View style={styles.filterRow}>
              {statusTabs.map(function (tab) {
                var active = statusFilter === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setStatusFilter(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              {voteTabs.map(function (tab) {
                var active = voteFilter === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setVoteFilter(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              {privacyTabs.map(function (tab) {
                var active = privacyFilter === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setPrivacyFilter(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              {choiceTabs.map(function (tab) {
                var active = choiceFilter === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setChoiceFilter(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              {[
                { key: 'createdAt', label: t('poll.sortCreatedAt') },
                { key: 'question', label: t('poll.sortQuestion') },
                { key: 'votes', label: t('poll.sortVotes') },
            ].map(function (tab) {
                var active = sortField === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setSortField(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              {[
                {
                    key: 'newest',
                    label: sortField === 'question'
                        ? t('settings.sortAsc')
                        : sortField === 'votes'
                            ? t('poll.sortHighestVotes')
                            : t('settings.sortNewest'),
                },
                {
                    key: 'oldest',
                    label: sortField === 'question'
                        ? t('settings.sortDesc')
                        : sortField === 'votes'
                            ? t('poll.sortLowestVotes')
                            : t('settings.sortOldest'),
                },
            ].map(function (tab) {
                var active = sortOrder === tab.key;
                return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setSortOrder(tab.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('poll.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
          </react_native_1.View>} renderItem={function (_a) {
            var item = _a.item;
            var isExpired = item.closed || (item.expiresAt && new Date(item.expiresAt) < new Date());
            var maxVotes = Math.max.apply(Math, __spreadArray(__spreadArray([], item.options.map(function (option) { return option.voteCount; }), false), [1], false));
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.cardHeader}>
                <react_native_1.Text style={styles.question}>{item.question}</react_native_1.Text>
                {isExpired ? (<react_native_1.View style={styles.closedBadge}>
                    <react_native_1.Text style={styles.closedBadgeText}>{t('poll.closed')}</react_native_1.Text>
                  </react_native_1.View>) : null}
              </react_native_1.View>

              {item.options.map(function (option) {
                    var pct = item.totalVotes > 0
                        ? Math.round((option.voteCount / item.totalVotes) * 100)
                        : 0;
                    return (<react_native_1.TouchableOpacity key={option.id} style={[
                            styles.optionButton,
                            option.voted && styles.optionButtonActive,
                            isExpired && styles.optionDisabled,
                        ]} onPress={function () {
                            return voteMutation.mutate({
                                pollId: item.id,
                                optionId: option.id,
                                voted: option.voted,
                            });
                        }} disabled={isExpired || voteMutation.isPending}>
                    <react_native_1.View style={[
                            styles.optionFill,
                            option.voted ? styles.optionFillActive : styles.optionFillInactive,
                            { width: "".concat(pct, "%") },
                        ]}/>
                    <react_native_1.View style={styles.optionRow}>
                      <react_native_1.Text style={[
                            styles.optionText,
                            option.voted && styles.optionTextActive,
                        ]}>
                        {option.text}
                      </react_native_1.Text>
                      <react_native_1.Text style={styles.optionMeta}>
                        {pct}% ({option.voteCount})
                      </react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.TouchableOpacity>);
                })}

              <react_native_1.Text style={styles.footerText}>
                {t('poll.totalVotes', { count: item.totalVotes })}
              </react_native_1.Text>
            </react_native_1.View>);
        }} ListEmptyComponent={<EmptyState_1.default icon={"\uD83D\uDDF3"} title={deferredSearchQuery
                ? t('poll.noSearchResults')
                : choiceFilter === 'multiple'
                    ? t('poll.noMultiplePolls')
                    : privacyFilter === 'anonymous'
                        ? t('poll.noAnonymousPolls')
                        : voteFilter === 'voted'
                            ? t('poll.noVotedPolls')
                            : t('poll.empty')} subtitle={deferredSearchQuery
                ? t('poll.noSearchResultsBody')
                : choiceFilter === 'multiple'
                    ? t('poll.noMultiplePollsBody')
                    : privacyFilter === 'anonymous'
                        ? t('poll.noAnonymousPollsBody')
                        : voteFilter === 'voted'
                            ? t('poll.noVotedPollsBody')
                            : t('poll.emptyBody')}/>} contentContainerStyle={[
            styles.content,
            filteredPolls.length === 0 && styles.emptyContent,
        ]}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    headerAction: {
        color: theme_1.colors.primary,
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 28,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    searchWrap: {
        marginBottom: theme_1.spacing.md,
        gap: theme_1.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    filterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    filterChipActive: {
        backgroundColor: theme_1.colors.primary,
    },
    filterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: theme_1.colors.white,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    emptyContent: {
        flexGrow: 1,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        padding: theme_1.spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.md,
    },
    question: {
        flex: 1,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    closedBadge: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
    },
    closedBadgeText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    optionButton: {
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.md,
        marginTop: theme_1.spacing.sm,
        minHeight: 46,
        justifyContent: 'center',
    },
    optionButtonActive: {
        borderColor: theme_1.colors.primary,
    },
    optionDisabled: {
        opacity: 0.8,
    },
    optionFill: {
        position: 'absolute',
        inset: 0,
    },
    optionFillActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.24)',
    },
    optionFillInactive: {
        backgroundColor: 'rgba(55, 65, 81, 0.45)',
    },
    optionRow: {
        position: 'relative',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme_1.spacing.md,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.md,
    },
    optionText: {
        flex: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    optionTextActive: {
        color: theme_1.colors.primaryLight,
    },
    optionMeta: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
    },
    footerText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.md,
    },
});
