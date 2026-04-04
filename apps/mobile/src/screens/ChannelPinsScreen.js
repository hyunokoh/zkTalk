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
exports.default = ChannelPinsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var EmptyState_1 = require("../components/EmptyState");
var theme_1 = require("../theme");
function ChannelPinsScreen(_a) {
    var _b;
    var route = _a.route;
    var channelId = route.params.channelId;
    var t = (0, i18n_1.useTranslation)().t;
    var navigation = (0, native_1.useNavigation)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(''), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)(null), selectedAuthorFilter = _d[0], setSelectedAuthorFilter = _d[1];
    var _e = (0, react_1.useState)('all'), messageFilter = _e[0], setMessageFilter = _e[1];
    var _f = (0, react_1.useState)('pinnedAt'), sortField = _f[0], setSortField = _f[1];
    var _g = (0, react_1.useState)('newest'), sortOrder = _g[0], setSortOrder = _g[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['channel-pins', channelId],
        queryFn: function () { return (0, api_1.api)("/api/channels/".concat(channelId, "/pins")); },
    }), data = _h.data, isLoading = _h.isLoading, isRefetching = _h.isRefetching, refetch = _h.refetch;
    var unpinMutation = (0, react_query_1.useMutation)({
        mutationFn: function (messageId) {
            return (0, api_1.api)("/api/channels/".concat(channelId, "/pins/").concat(messageId), { method: 'DELETE' });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['channel-pins', channelId] });
        },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.unpinFailed'));
        },
    });
    var handleOpenMessage = (0, react_1.useCallback)(function (messageId) {
        navigation.navigate('HomeTab', {
            screen: 'ChannelScreen',
            params: {
                channelId: channelId,
                communityId: route.params.communityId,
                channelName: route.params.channelName,
                focusMessageId: messageId,
            },
        });
    }, [channelId, navigation, route.params.channelName]);
    var pins = (_b = data === null || data === void 0 ? void 0 : data.pins) !== null && _b !== void 0 ? _b : [];
    var availableAuthorFilters = (0, react_1.useMemo)(function () {
        return Array.from(new Set(pins.map(function (item) { return item.author.displayName || item.author.username; }).filter(Boolean)));
    }, [pins]);
    var filteredPins = (0, react_1.useMemo)(function () {
        var filtered = pins.filter(function (item) {
            var authorLabel = item.author.displayName || item.author.username;
            var preview = item.message.bodyPlaintext || item.message.bodyMarkdown || '';
            var displayPreview = preview === '[encrypted]' ? t('dm.encryptedMessagePlaceholder') : preview;
            if (selectedAuthorFilter && authorLabel !== selectedAuthorFilter) {
                return false;
            }
            if (messageFilter === 'encrypted' && displayPreview !== t('dm.encryptedMessagePlaceholder')) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [item.author.displayName, item.author.username, displayPreview]
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'author') {
                var left_1 = (a.author.displayName || a.author.username || '').toLocaleLowerCase();
                var right_1 = (b.author.displayName || b.author.username || '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? left_1.localeCompare(right_1)
                    : right_1.localeCompare(left_1);
            }
            var left = new Date(a.pin.pinnedAt).getTime();
            var right = new Date(b.pin.pinnedAt).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
    }, [deferredSearchQuery, messageFilter, pins, selectedAuthorFilter, sortField, sortOrder, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || isLoading)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-channel-pins-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 3, 5]);
                            if (action.type === 'openFirst' && filteredPins[0]) {
                                handleOpenMessage(filteredPins[0].message.id);
                            }
                            if (action.type === 'unpinFirst' && filteredPins[0]) {
                                unpinMutation.mutate(filteredPins[0].message.id);
                            }
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-channel-pins-action.json')];
                        case 4:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [filteredPins, handleOpenMessage, isLoading, unpinMutation]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('channel.pinsLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={filteredPins} keyExtractor={function (item) { return item.pin.id; }} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
            <react_native_1.View style={styles.filterRow}>
              {[
                { key: 'all', label: t('channel.pinsFilterAll') },
                { key: 'encrypted', label: t('channel.pinsFilterEncrypted') },
            ].map(function (option) {
                var active = messageFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setMessageFilter(option.key); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.filterRow}>
              <react_native_1.TouchableOpacity style={[
                styles.filterChip,
                selectedAuthorFilter === null && styles.filterChipActive,
            ]} onPress={function () { return setSelectedAuthorFilter(null); }}>
                <react_native_1.Text style={[
                styles.filterChipText,
                selectedAuthorFilter === null && styles.filterChipTextActive,
            ]}>
                  {t('channel.pinsFilterAll')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
              {availableAuthorFilters.map(function (authorName) {
                var active = selectedAuthorFilter === authorName;
                return (<react_native_1.TouchableOpacity key={authorName} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setSelectedAuthorFilter(authorName); }}>
                    <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {authorName}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('channel.pinsSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            <react_native_1.View style={styles.filterRow}>
              {[
                { key: 'pinnedAt', label: t('channel.pinsSortPinnedTime') },
                { key: 'author', label: t('settings.sortAuthor') },
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
                    key: 'newest',
                    label: sortField === 'author' ? t('settings.sortAsc') : t('settings.sortNewest'),
                },
                {
                    key: 'oldest',
                    label: sortField === 'author' ? t('settings.sortDesc') : t('settings.sortOldest'),
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
            var preview = item.message.bodyPlaintext || item.message.bodyMarkdown || t('message.deleted');
            var displayPreview = preview === '[encrypted]'
                ? t('dm.encryptedMessagePlaceholder')
                : preview;
            var isBusy = unpinMutation.isPending && unpinMutation.variables === item.message.id;
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.metaRow}>
                <react_native_1.View style={styles.authorWrap}>
                  <react_native_1.Text style={styles.author}>{item.author.displayName}</react_native_1.Text>
                  <react_native_1.Text style={styles.username}>@{item.author.username}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.timestamp}>
                  {new Date(item.pin.pinnedAt).toLocaleDateString()}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.preview} numberOfLines={4}>
                {displayPreview}
              </react_native_1.Text>
              <react_native_1.View style={styles.actions}>
                <react_native_1.TouchableOpacity style={styles.openButton} onPress={function () { return handleOpenMessage(item.message.id); }}>
                  <react_native_1.Text style={styles.openButtonText}>{t('settings.bookmarksOpen')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.unpinButton} onPress={function () { return unpinMutation.mutate(item.message.id); }} disabled={isBusy}>
                  <react_native_1.Text style={styles.unpinButtonText}>
                    {isBusy ? t('common.loading') : t('channel.unpin')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon={"\uD83D\uDCCC"} title={deferredSearchQuery
                ? t('channel.pinsNoSearchResults')
                : messageFilter === 'encrypted'
                    ? t('channel.pinsNoEncrypted')
                    : t('channel.pinsEmpty')} subtitle={deferredSearchQuery
                ? t('channel.pinsNoSearchResultsBody')
                : messageFilter === 'encrypted'
                    ? t('channel.pinsNoEncryptedBody')
                    : t('channel.pinsHint')}/>
          </react_native_1.View>} contentContainerStyle={filteredPins.length === 0 ? styles.emptyList : styles.list}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    list: {
        paddingVertical: theme_1.spacing.md,
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.md,
        gap: theme_1.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
        borderColor: theme_1.colors.borderLight,
    },
    emptyList: {
        flexGrow: 1,
    },
    emptyWrap: {
        flex: 1,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.sm,
    },
    authorWrap: {
        flex: 1,
    },
    author: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    username: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: 2,
    },
    timestamp: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.xs,
    },
    preview: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    openButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    openButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    unpinButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    unpinButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
});
