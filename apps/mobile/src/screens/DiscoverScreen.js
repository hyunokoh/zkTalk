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
exports.default = DiscoverScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var community_image_1 = require("../lib/community-image");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
var ICON_COLORS = [
    '#6366f1',
    '#ec4899',
    '#f59e0b',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ef4444',
    '#14b8a6',
];
function getIconColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}
function CommunityCard(_a) {
    var community = _a.community, onPrimaryAction = _a.onPrimaryAction, isJoining = _a.isJoining, t = _a.t;
    var iconBg = getIconColor(community.name);
    var iconUrl = (0, community_image_1.getVersionedImageUrl)(community.iconUrl, community.updatedAt);
    return (<react_native_1.View style={styles.card}>
      <react_native_1.View style={styles.cardHeader}>
        {iconUrl ? (<react_native_1.Image source={{ uri: iconUrl }} style={styles.communityIcon}/>) : (<react_native_1.View style={[styles.communityIcon, { backgroundColor: iconBg }]}>
            <react_native_1.Text style={styles.communityInitial}>
              {community.name.charAt(0).toUpperCase()}
            </react_native_1.Text>
          </react_native_1.View>)}
        <react_native_1.View style={styles.communityMeta}>
          <react_native_1.Text style={styles.communityName}>{community.name}</react_native_1.Text>
          <react_native_1.Text style={styles.memberCount}>
            {community.memberCount === 1
            ? t('discover.member', { count: community.memberCount })
            : t('discover.members', { count: community.memberCount })}
          </react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      {community.description && (<react_native_1.Text style={styles.communityDescription} numberOfLines={2}>
          {community.description}
        </react_native_1.Text>)}

      <react_native_1.TouchableOpacity style={[
            styles.joinButton,
            community.isJoined && styles.joinedButton,
            isJoining && styles.joiningButton,
        ]} onPress={onPrimaryAction} disabled={isJoining}>
        {isJoining ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={[
                styles.joinButtonText,
                community.isJoined && styles.joinedButtonText,
            ]}>
            {community.isJoined ? t('discover.openCommunity') : t('discover.join')}
          </react_native_1.Text>)}
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
}
function DiscoverScreen() {
    var _a;
    var t = (0, i18n_1.useTranslation)().t;
    var navigation = (0, native_1.useNavigation)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)('all'), joinFilter = _c[0], setJoinFilter = _c[1];
    var _d = (0, react_1.useState)('name'), sortField = _d[0], setSortField = _d[1];
    var _e = (0, react_1.useState)('asc'), sortOrder = _e[0], setSortOrder = _e[1];
    var _f = (0, react_1.useState)(null), joiningId = _f[0], setJoiningId = _f[1];
    var devActionAttemptedRef = (0, react_1.useRef)(false);
    var searchInputRef = (0, react_1.useRef)(null);
    var searchRef = (0, react_1.useRef)('');
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery);
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['discover', deferredSearchQuery],
        queryFn: function () {
            var params = deferredSearchQuery
                ? "?q=".concat(encodeURIComponent(deferredSearchQuery))
                : '';
            return (0, api_1.api)("/api/discover".concat(params));
        },
    }), data = _g.data, isLoading = _g.isLoading, refetch = _g.refetch, isRefetching = _g.isRefetching, isFetching = _g.isFetching;
    var joinMutation = (0, react_query_1.useMutation)({
        mutationFn: function (communityId) {
            return (0, api_1.api)("/api/communities/".concat(communityId, "/join"), { method: 'POST' });
        },
        onMutate: function (communityId) { return setJoiningId(communityId); },
        onSuccess: function (_result, communityId) {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
            refetch();
            react_native_1.Alert.alert(t('discover.joinedTitle'), t('discover.joinedBody'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('discover.openCommunity'),
                    onPress: function () {
                        navigation.navigate('HomeTab', {
                            screen: 'HomeScreen',
                            params: { selectedCommunityId: communityId },
                        });
                    },
                },
            ]);
        },
        onError: function (err) {
            react_native_1.Alert.alert(t('common.error'), err instanceof Error ? err.message : t('discover.joinFailed'));
        },
        onSettled: function () { return setJoiningId(null); },
    });
    var handleSearch = (0, react_1.useCallback)(function (e) {
        var text = e.nativeEvent.text;
        searchRef.current = text;
        setSearchQuery(text);
    }, []);
    var handleOpenCommunity = (0, react_1.useCallback)(function (communityId) {
        navigation.navigate('HomeTab', {
            screen: 'HomeScreen',
            params: { selectedCommunityId: communityId },
        });
    }, [navigation]);
    var communities = (_a = data === null || data === void 0 ? void 0 : data.communities) !== null && _a !== void 0 ? _a : [];
    var filteredCommunities = communities.filter(function (community) {
        if (joinFilter === 'joined') {
            return community.isJoined;
        }
        if (joinFilter === 'not_joined') {
            return !community.isJoined;
        }
        return true;
    });
    var sortedCommunities = __spreadArray([], filteredCommunities, true).sort(function (a, b) {
        var comparison = sortField === 'memberCount'
            ? a.memberCount - b.memberCount
            : a.name.localeCompare(b.name, undefined, {
                sensitivity: 'base',
                numeric: true,
            });
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    var isSearching = searchQuery !== deferredSearchQuery || isFetching;
    react_1.default.useEffect(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current)
            return;
        if (!(data === null || data === void 0 ? void 0 : data.communities))
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, communities_1, target, searchResult, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-discover-action.json')];
                        case 1:
                            action = _b.sent();
                            if (!action)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 11, , 13]);
                            if (action.type !== 'join') {
                                throw new Error('Unsupported discover dev action');
                            }
                            communities_1 = (_a = data === null || data === void 0 ? void 0 : data.communities) !== null && _a !== void 0 ? _a : [];
                            target = communities_1.find(function (community) {
                                if (action.communityId && community.id === action.communityId)
                                    return true;
                                if (action.slug && community.slug === action.slug)
                                    return true;
                                if (action.name && community.name === action.name)
                                    return true;
                                return false;
                            });
                            if (!(!target && action.name)) return [3 /*break*/, 4];
                            return [4 /*yield*/, (0, api_1.api)("/api/discover?q=".concat(encodeURIComponent(action.name)))];
                        case 3:
                            searchResult = _b.sent();
                            target = searchResult.communities.find(function (community) { return community.name === action.name; });
                            _b.label = 4;
                        case 4:
                            if (!target) {
                                throw new Error('No matching discover community found');
                            }
                            devActionAttemptedRef.current = true;
                            if (!target.isJoined) return [3 /*break*/, 6];
                            handleOpenCommunity(target.id);
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-discover-result.json', {
                                    ok: true,
                                    action: 'open',
                                    communityId: target.id,
                                    slug: target.slug,
                                    name: target.name,
                                })];
                        case 5:
                            _b.sent();
                            return [2 /*return*/];
                        case 6: return [4 /*yield*/, joinMutation.mutateAsync(target.id)];
                        case 7:
                            _b.sent();
                            return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['communities'] })];
                        case 8:
                            _b.sent();
                            return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['discover'] })];
                        case 9:
                            _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-discover-result.json', {
                                    ok: true,
                                    action: 'join',
                                    communityId: target.id,
                                    slug: target.slug,
                                    name: target.name,
                                })];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 11:
                            error_1 = _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-discover-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 12:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 13: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [data === null || data === void 0 ? void 0 : data.communities, handleOpenCommunity, joinMutation, queryClient]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.StatusBar barStyle="light-content"/>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.headerCopy}>
          <react_native_1.Text style={styles.headerTitle}>{t('discover.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.headerSubtitle}>{t('discover.listSubtitle')}</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.searchContainer}>
        <react_native_1.View style={styles.searchBar}>
          <react_native_1.Text style={styles.searchIcon}>{"\uD83D\uDD0D"}</react_native_1.Text>
          <react_native_1.TextInput ref={searchInputRef} style={styles.searchInput} placeholder={t('discover.search')} placeholderTextColor={theme_1.colors.textMuted} onChange={handleSearch} returnKeyType="search" autoCorrect={false}/>
          {isSearching && (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.textMuted} style={styles.searchSpinner}/>)}
          {searchQuery.length > 0 && (<react_native_1.TouchableOpacity onPress={function () {
                var _a;
                setSearchQuery('');
                searchRef.current = '';
                (_a = searchInputRef.current) === null || _a === void 0 ? void 0 : _a.clear();
            }}>
              <react_native_1.Text style={styles.clearButton}>{"\u2715"}</react_native_1.Text>
            </react_native_1.TouchableOpacity>)}
        </react_native_1.View>
      </react_native_1.View>

      {/* Community list */}
      {isLoading ? (<react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
        </react_native_1.View>) : (<react_native_1.FlatList data={sortedCommunities} keyExtractor={function (item) { return item.id; }} ListHeaderComponent={<react_native_1.View style={styles.filtersSection}>
              <react_native_1.View style={styles.filterRow}>
                {[
                    { key: 'all', label: t('discover.filterAll') },
                    { key: 'joined', label: t('discover.filterJoined') },
                    { key: 'not_joined', label: t('discover.filterNotJoined') },
                ].map(function (option) {
                    var active = joinFilter === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setJoinFilter(option.key); }}>
                      <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.View style={styles.filterRow}>
                {[
                    { key: 'name', label: t('discover.sortName') },
                    { key: 'memberCount', label: t('discover.sortMembers') },
                ].map(function (option) {
                    var active = sortField === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setSortField(option.key); }}>
                      <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.View style={styles.filterRow}>
                {[
                    {
                        key: 'asc',
                        label: sortField === 'memberCount' ? t('discover.sortFewest') : t('settings.sortAsc'),
                    },
                    {
                        key: 'desc',
                        label: sortField === 'memberCount' ? t('discover.sortMost') : t('settings.sortDesc'),
                    },
                ].map(function (option) {
                    var active = sortOrder === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setSortOrder(option.key); }}>
                      <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
            </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
                var item = _a.item;
                return (<CommunityCard community={item} onPrimaryAction={function () {
                        if (item.isJoined) {
                            handleOpenCommunity(item.id);
                            return;
                        }
                        joinMutation.mutate(item.id);
                    }} isJoining={joiningId === item.id} t={t}/>);
            }} ListEmptyComponent={<react_native_1.View style={styles.center}>
              <react_native_1.Text style={styles.emptyIcon}>{"\uD83E\uDDED"}</react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>
                {searchQuery
                    ? t('discover.noResults')
                    : t('discover.noDiscover')}
              </react_native_1.Text>
              {searchQuery ? (<react_native_1.Text style={styles.emptyHint}>{t('discover.tryDifferent')}</react_native_1.Text>) : (<react_native_1.Text style={styles.emptyHint}>{t('discover.checkLater')}</react_native_1.Text>)}
            </react_native_1.View>} contentContainerStyle={sortedCommunities.length === 0
                ? [styles.listContent, styles.emptyList]
                : styles.listContent}/>)}
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    header: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '800',
    },
    headerSubtitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 4,
        lineHeight: 18,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.xxxl,
    },
    searchContainer: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.sm,
        paddingBottom: theme_1.spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.md,
        height: 44,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: theme_1.spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.body,
        paddingVertical: 0,
    },
    searchSpinner: {
        marginLeft: theme_1.spacing.sm,
    },
    clearButton: {
        color: theme_1.colors.textSecondary,
        fontSize: 16,
        padding: theme_1.spacing.xs,
    },
    listContent: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    filtersSection: {
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    filterChip: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.full,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
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
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        padding: theme_1.spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme_1.spacing.sm,
    },
    communityIcon: {
        width: 48,
        height: 48,
        borderRadius: theme_1.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.md,
    },
    communityInitial: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    communityMeta: {
        flex: 1,
    },
    communityName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    memberCount: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 2,
    },
    communityDescription: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        lineHeight: 20,
        marginBottom: theme_1.spacing.md,
    },
    joinButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
    },
    joinedButton: {
        backgroundColor: theme_1.colors.surfaceLight,
    },
    joiningButton: {
        opacity: 0.7,
    },
    joinButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.md,
        fontWeight: '700',
    },
    joinedButtonText: {
        color: theme_1.colors.textSecondary,
    },
    emptyList: {
        flex: 1,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme_1.spacing.lg,
    },
    emptyText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '500',
    },
    emptyHint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        marginTop: theme_1.spacing.sm,
    },
});
