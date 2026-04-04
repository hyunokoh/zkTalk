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
exports.default = BookmarksScreen;
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
function normalizeBookmarkPreview(row, t) {
    var preview = row.message.bodyPlaintext || row.message.bodyMarkdown || '';
    if (preview === '[encrypted]') {
        return t('dm.encryptedMessagePlaceholder');
    }
    return preview;
}
function BookmarksScreen() {
    var _a;
    var t = (0, i18n_1.useTranslation)().t;
    var navigation = (0, native_1.useNavigation)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(null), selectedAuthorFilter = _c[0], setSelectedAuthorFilter = _c[1];
    var _d = (0, react_1.useState)('all'), messageFilter = _d[0], setMessageFilter = _d[1];
    var _e = (0, react_1.useState)('savedAt'), sortField = _e[0], setSortField = _e[1];
    var _f = (0, react_1.useState)('newest'), sortOrder = _f[0], setSortOrder = _f[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var devBookmarkActionAttemptedRef = (0, react_1.useRef)(false);
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['bookmarks'],
        queryFn: function () { return (0, api_1.api)('/api/bookmarks'); },
    }), data = _g.data, isLoading = _g.isLoading, refetch = _g.refetch, isRefetching = _g.isRefetching;
    var removeBookmarkMutation = (0, react_query_1.useMutation)({
        mutationFn: function (messageId) { return (0, api_1.api)("/api/bookmarks/".concat(messageId), { method: 'DELETE' }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('settings.bookmarksRemoveFailed'));
        },
    });
    var handleOpenBookmark = (0, react_1.useCallback)(function (row) {
        var _a;
        if (!row.message.channelId) {
            react_native_1.Alert.alert(t('common.error'), t('settings.bookmarksOpenFailed'));
            return;
        }
        navigation.navigate('HomeTab', {
            screen: 'ChannelScreen',
            params: {
                communityId: (_a = row.message.communityId) !== null && _a !== void 0 ? _a : undefined,
                channelId: row.message.channelId,
                focusMessageId: row.message.id,
            },
        });
    }, [navigation, t]);
    var bookmarks = (_a = data === null || data === void 0 ? void 0 : data.bookmarks) !== null && _a !== void 0 ? _a : [];
    var availableAuthorFilters = (0, react_1.useMemo)(function () {
        return Array.from(new Set(bookmarks.map(function (item) { return item.author.displayName || item.author.username; }).filter(Boolean)));
    }, [bookmarks]);
    var filteredBookmarks = (0, react_1.useMemo)(function () {
        var filtered = bookmarks.filter(function (item) {
            var authorLabel = item.author.displayName || item.author.username;
            var preview = normalizeBookmarkPreview(item, t);
            if (selectedAuthorFilter && authorLabel !== selectedAuthorFilter) {
                return false;
            }
            if (messageFilter === 'encrypted' && preview !== t('dm.encryptedMessagePlaceholder')) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [
                item.author.displayName,
                item.author.username,
                preview,
            ]
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
            var left = new Date(a.bookmark.createdAt).getTime();
            var right = new Date(b.bookmark.createdAt).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
    }, [bookmarks, deferredSearchQuery, messageFilter, selectedAuthorFilter, sortField, sortOrder, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devBookmarkActionAttemptedRef.current) {
            return;
        }
        if (filteredBookmarks.length === 0) {
            return;
        }
        function runDevBookmarkAction() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed, targetRow;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-bookmark-action.json')];
                        case 1:
                            parsed = _b.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devBookmarkActionAttemptedRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-bookmark-action.json')];
                        case 2:
                            _b.sent();
                            targetRow = (_a = ((parsed === null || parsed === void 0 ? void 0 : parsed.messageId)
                                ? filteredBookmarks.find(function (item) { return item.message.id === parsed.messageId; })
                                : null)) !== null && _a !== void 0 ? _a : filteredBookmarks[0];
                            if (!targetRow) {
                                return [2 /*return*/];
                            }
                            handleOpenBookmark(targetRow);
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevBookmarkAction();
    }, [filteredBookmarks, handleOpenBookmark]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('settings.bookmarksLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={filteredBookmarks} keyExtractor={function (item) { return item.bookmark.id; }} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
            <react_native_1.View style={styles.filterRow}>
              {[
                { key: 'all', label: t('settings.bookmarksFilterAll') },
                { key: 'encrypted', label: t('settings.bookmarksFilterEncrypted') },
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
                  {t('settings.bookmarksFilterAll')}
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
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('settings.bookmarksSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            <react_native_1.View style={styles.filterRow}>
              {[
                { key: 'savedAt', label: t('settings.sortSavedTime') },
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
            var preview = normalizeBookmarkPreview(item, t);
            var isRemoving = removeBookmarkMutation.isPending && removeBookmarkMutation.variables === item.message.id;
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.headerRow}>
                <react_native_1.View style={styles.headerCopy}>
                  <react_native_1.Text style={styles.author}>{item.author.displayName}</react_native_1.Text>
                  <react_native_1.Text style={styles.meta}>@{item.author.username}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.timestamp}>
                  {new Date(item.bookmark.createdAt).toLocaleDateString()}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.preview} numberOfLines={3}>
                {preview || t('message.deleted')}
              </react_native_1.Text>
              <react_native_1.View style={styles.actions}>
                <react_native_1.TouchableOpacity style={styles.openButton} onPress={function () { return handleOpenBookmark(item); }}>
                  <react_native_1.Text style={styles.openButtonText}>{t('settings.bookmarksOpen')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.removeButton} onPress={function () { return removeBookmarkMutation.mutate(item.message.id); }} disabled={isRemoving}>
                  <react_native_1.Text style={styles.removeButtonText}>
                    {isRemoving ? t('common.loading') : t('settings.bookmarksRemove')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon="bookmark" title={deferredSearchQuery
                ? t('settings.bookmarksNoSearchResults')
                : messageFilter === 'encrypted'
                    ? t('settings.bookmarksNoEncrypted')
                    : t('settings.bookmarksEmpty')} subtitle={deferredSearchQuery
                ? t('settings.bookmarksNoSearchResultsBody')
                : messageFilter === 'encrypted'
                    ? t('settings.bookmarksNoEncryptedBody')
                    : t('settings.bookmarksHint')}/>
          </react_native_1.View>} contentContainerStyle={filteredBookmarks.length === 0 ? styles.emptyList : styles.list}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    list: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.lg,
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
        marginTop: theme_1.spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme_1.spacing.sm,
        gap: theme_1.spacing.md,
    },
    headerCopy: {
        flex: 1,
    },
    author: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    meta: {
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
    removeButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    removeButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
});
