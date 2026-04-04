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
exports.default = ForumChannelScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var useWebSocket_1 = require("../hooks/useWebSocket");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
function formatRelativeTime(dateString, locale) {
    var timestamp = new Date(dateString).getTime();
    var diffMs = timestamp - Date.now();
    var diffHours = Math.round(diffMs / 3600000);
    var diffDays = Math.round(diffMs / 86400000);
    var RelativeTimeFormatter = Intl.RelativeTimeFormat;
    if (typeof RelativeTimeFormatter !== 'function') {
        return new Intl.DateTimeFormat(locale, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(dateString));
    }
    var formatter = new RelativeTimeFormatter(locale, { numeric: 'auto' });
    if (Math.abs(diffHours) < 24) {
        return formatter.format(diffHours, 'hour');
    }
    return formatter.format(diffDays, 'day');
}
function ForumChannelScreen(_a) {
    var _this = this;
    var _b, _c, _d;
    var navigation = _a.navigation, route = _a.route;
    var _e = (0, i18n_1.useTranslation)(), t = _e.t, locale = _e.locale;
    var _f = (0, react_1.useState)('latest'), sort = _f[0], setSort = _f[1];
    var _g = (0, react_1.useState)('all'), filter = _g[0], setFilter = _g[1];
    var _h = (0, react_1.useState)('activity'), sortField = _h[0], setSortField = _h[1];
    var _j = (0, react_1.useState)('newest'), sortOrder = _j[0], setSortOrder = _j[1];
    var _k = (0, react_1.useState)(''), searchQuery = _k[0], setSearchQuery = _k[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var queryClient = (0, react_query_1.useQueryClient)();
    var _l = (0, useWebSocket_1.useChannelSubscription)(route.params.channelId), queuedEventCount = _l.queuedEventCount, consumeEvents = _l.consumeEvents;
    var wsStatus = (0, useWebSocket_1.useWebSocketStatus)();
    var shouldPollThreads = wsStatus !== 'connected';
    var forumRefreshTimeoutRef = (0, react_1.useRef)(null);
    var currentUser = (0, auth_1.useAuthStore)(function (state) { return state.user; });
    var channelQuery = (0, react_query_1.useQuery)({
        queryKey: ['channel', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId));
        },
    });
    var permissionsQuery = (0, react_query_1.useQuery)({
        queryKey: ['channel-me-permissions', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/me-permissions"));
        },
    });
    var threadsQuery = (0, react_query_1.useInfiniteQuery)({
        queryKey: ['forum-threads', route.params.channelId, sort],
        queryFn: function (_a) {
            var pageParam = _a.pageParam;
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/threads?sort=").concat(sort).concat(pageParam ? "&cursor=".concat(encodeURIComponent(pageParam)) : ''));
        },
        initialPageParam: null,
        getNextPageParam: function (lastPage) { var _a; return (_a = lastPage.nextCursor) !== null && _a !== void 0 ? _a : undefined; },
        refetchInterval: shouldPollThreads ? 30000 : false,
    });
    var canCreateThread = (_c = (_b = permissionsQuery.data) === null || _b === void 0 ? void 0 : _b.permissions.canCreateThread) !== null && _c !== void 0 ? _c : true;
    var channel = (_d = channelQuery.data) === null || _d === void 0 ? void 0 : _d.channel;
    (0, react_1.useLayoutEffect)(function () {
        var _a, _b;
        navigation.setOptions({
            title: "# ".concat((_b = (_a = channel === null || channel === void 0 ? void 0 : channel.name) !== null && _a !== void 0 ? _a : route.params.channelName) !== null && _b !== void 0 ? _b : t('channel.typeForum')),
            headerRight: function () {
                return canCreateThread && !(channel === null || channel === void 0 ? void 0 : channel.isArchived) ? (<react_native_1.TouchableOpacity onPress={function () {
                        var _a;
                        return navigation.navigate('CreateForumPost', {
                            channelId: route.params.channelId,
                            communityId: route.params.communityId,
                            channelName: (_a = channel === null || channel === void 0 ? void 0 : channel.name) !== null && _a !== void 0 ? _a : route.params.channelName,
                        });
                    }} hitSlop={8}>
            <react_native_1.Text style={styles.headerAction}>+</react_native_1.Text>
          </react_native_1.TouchableOpacity>) : null;
            },
        });
    }, [
        canCreateThread,
        channel === null || channel === void 0 ? void 0 : channel.isArchived,
        channel === null || channel === void 0 ? void 0 : channel.name,
        navigation,
        route.params.channelId,
        route.params.channelName,
        route.params.communityId,
        t,
    ]);
    var threads = (0, react_1.useMemo)(function () { var _a, _b; return (_b = (_a = threadsQuery.data) === null || _a === void 0 ? void 0 : _a.pages.flatMap(function (page) { return page.items; })) !== null && _b !== void 0 ? _b : []; }, [threadsQuery.data]);
    var filteredThreads = (0, react_1.useMemo)(function () {
        var base = filter === 'unread'
            ? threads.filter(function (item) { return item.unreadReplyCount > 0; })
            : filter === 'following'
                ? threads.filter(function (item) { return item.isFollowing; })
                : filter === 'mine'
                    ? threads.filter(function (item) { return item.creator.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })
                    : filter === 'unanswered'
                        ? threads.filter(function (item) { return item.thread.replyCount === 0; })
                        : filter === 'pinned'
                            ? threads.filter(function (item) { return item.thread.isPinned; })
                            : threads;
        var searched = !deferredSearchQuery
            ? base
            : base.filter(function (item) {
                var _a, _b, _c, _d;
                var haystack = [
                    (_a = item.thread.title) !== null && _a !== void 0 ? _a : '',
                    (_b = item.rootMessage.bodyPlaintext) !== null && _b !== void 0 ? _b : '',
                    (_c = item.creator.displayName) !== null && _c !== void 0 ? _c : '',
                    (_d = item.creator.username) !== null && _d !== void 0 ? _d : '',
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(deferredSearchQuery);
            });
        return __spreadArray([], searched, true).sort(function (left, right) {
            var _a, _b;
            if (sortField === 'title') {
                var leftTitle = ((_a = left.thread.title) !== null && _a !== void 0 ? _a : '').toLocaleLowerCase();
                var rightTitle = ((_b = right.thread.title) !== null && _b !== void 0 ? _b : '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? leftTitle.localeCompare(rightTitle)
                    : rightTitle.localeCompare(leftTitle);
            }
            if (sortField === 'replies') {
                if (left.thread.replyCount !== right.thread.replyCount) {
                    return sortOrder === 'newest'
                        ? right.thread.replyCount - left.thread.replyCount
                        : left.thread.replyCount - right.thread.replyCount;
                }
            }
            if (sortField === 'unread') {
                if (left.unreadReplyCount !== right.unreadReplyCount) {
                    return sortOrder === 'newest'
                        ? right.unreadReplyCount - left.unreadReplyCount
                        : left.unreadReplyCount - right.unreadReplyCount;
                }
            }
            if (sortField === 'author') {
                var leftAuthor = (left.creator.displayName || left.creator.username || '').toLocaleLowerCase();
                var rightAuthor = (right.creator.displayName || right.creator.username || '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? leftAuthor.localeCompare(rightAuthor)
                    : rightAuthor.localeCompare(leftAuthor);
            }
            var leftActivity = new Date(left.thread.lastActivityAt).getTime();
            var rightActivity = new Date(right.thread.lastActivityAt).getTime();
            return sortOrder === 'newest' ? rightActivity - leftActivity : leftActivity - rightActivity;
        });
    }, [currentUser === null || currentUser === void 0 ? void 0 : currentUser.id, deferredSearchQuery, filter, sortField, sortOrder, threads]);
    var subtitle = (0, react_1.useMemo)(function () {
        if (channel === null || channel === void 0 ? void 0 : channel.description)
            return channel.description;
        if (channel === null || channel === void 0 ? void 0 : channel.isArchived)
            return t('forum.archived');
        return t('forum.emptyBody');
    }, [channel === null || channel === void 0 ? void 0 : channel.description, channel === null || channel === void 0 ? void 0 : channel.isArchived, t]);
    var handleOpenThread = (0, react_1.useCallback)(function (item) {
        var _a;
        navigation.navigate('ThreadScreen', {
            threadId: item.thread.id,
            channelId: route.params.channelId,
            communityId: route.params.communityId,
            channelName: (_a = channel === null || channel === void 0 ? void 0 : channel.name) !== null && _a !== void 0 ? _a : route.params.channelName,
            rootMessageId: item.thread.rootMessageId,
        });
    }, [channel === null || channel === void 0 ? void 0 : channel.name, navigation, route.params.channelId, route.params.channelName, route.params.communityId]);
    var followMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var threadId = _a.threadId, follow = _a.follow;
            return (0, api_1.api)("/api/threads/".concat(threadId, "/follow"), {
                method: follow ? 'POST' : 'DELETE',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['forum-threads', route.params.channelId] })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['thread'] })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
    });
    var handleToggleFollow = (0, react_1.useCallback)(function (item) {
        followMutation.mutate({
            threadId: item.thread.id,
            follow: !item.isFollowing,
        });
    }, [followMutation]);
    var handleLoadMore = (0, react_1.useCallback)(function () {
        if (!threadsQuery.hasNextPage || threadsQuery.isFetchingNextPage) {
            return;
        }
        void threadsQuery.fetchNextPage();
    }, [threadsQuery]);
    var scheduleForumRefresh = (0, react_1.useCallback)(function (delayMs) {
        if (delayMs === void 0) { delayMs = 1200; }
        if (forumRefreshTimeoutRef.current) {
            clearTimeout(forumRefreshTimeoutRef.current);
        }
        forumRefreshTimeoutRef.current = setTimeout(function () {
            forumRefreshTimeoutRef.current = null;
            void queryClient.invalidateQueries({
                queryKey: ['forum-threads', route.params.channelId],
            });
        }, delayMs);
    }, [queryClient, route.params.channelId]);
    (0, react_1.useEffect)(function () { return function () {
        if (forumRefreshTimeoutRef.current) {
            clearTimeout(forumRefreshTimeoutRef.current);
        }
    }; }, []);
    (0, react_1.useEffect)(function () {
        if (queuedEventCount === 0)
            return;
        var newEvents = consumeEvents();
        if (newEvents.some(function (event) {
            return event.type === 'message.created' ||
                event.type === 'message.updated' ||
                event.type === 'message.deleted' ||
                event.type === 'thread.created' ||
                event.type === 'thread.updated' ||
                event.type === 'thread.locked';
        })) {
            scheduleForumRefresh();
        }
    }, [consumeEvents, queuedEventCount, scheduleForumRefresh]);
    if (channelQuery.isLoading || threadsQuery.isLoading) {
        return <LoadingSpinner_1.default text={t('forum.loadingPosts')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['left', 'right']}>
      <react_native_1.View style={styles.toolbar}>
        <react_native_1.View style={styles.sortRow}>
          {['latest', 'top'].map(function (value) { return (<react_native_1.TouchableOpacity key={value} style={[styles.sortChip, sort === value && styles.sortChipActive]} onPress={function () { return setSort(value); }}>
              <react_native_1.Text style={[styles.sortText, sort === value && styles.sortTextActive]}>
                {t("forum.".concat(value))}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
        <react_native_1.View style={styles.sortRow}>
          {['all', 'unread', 'following', 'mine', 'unanswered', 'pinned'].map(function (value) { return (<react_native_1.TouchableOpacity key={value} style={[styles.sortChip, filter === value && styles.sortChipActive]} onPress={function () { return setFilter(value); }}>
              <react_native_1.Text style={[styles.sortText, filter === value && styles.sortTextActive]}>
                {t(value === 'pinned' ? 'forum.pinned' : "forum.".concat(value))}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
        <react_native_1.View style={styles.sortRow}>
          {([
            { key: 'activity', label: t('forum.sortActivity') },
            { key: 'title', label: t('forum.sortTitle') },
            { key: 'replies', label: t('forum.sortReplies') },
            { key: 'author', label: t('forum.sortAuthor') },
            { key: 'unread', label: t('forum.sortUnread') },
        ]).map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[styles.sortChip, sortField === option.key && styles.sortChipActive]} onPress={function () { return setSortField(option.key); }}>
              <react_native_1.Text style={[styles.sortText, sortField === option.key && styles.sortTextActive]}>
                {option.label}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
        <react_native_1.View style={styles.sortRow}>
          {([
            {
                key: 'newest',
                label: sortField === 'activity'
                    ? t('settings.sortNewest')
                    : sortField === 'title' || sortField === 'author'
                        ? t('settings.sortAsc')
                        : sortField === 'unread'
                            ? t('forum.sortMostUnread')
                            : t('forum.sortMostReplies'),
            },
            {
                key: 'oldest',
                label: sortField === 'activity'
                    ? t('settings.sortOldest')
                    : sortField === 'title' || sortField === 'author'
                        ? t('settings.sortDesc')
                        : sortField === 'unread'
                            ? t('forum.sortFewestUnread')
                            : t('forum.sortFewestReplies'),
            },
        ]).map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[styles.sortChip, sortOrder === option.key && styles.sortChipActive]} onPress={function () { return setSortOrder(option.key); }}>
              <react_native_1.Text style={[styles.sortText, sortOrder === option.key && styles.sortTextActive]}>
                {option.label}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
        <react_native_1.Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </react_native_1.Text>
        <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('forum.searchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} style={styles.searchInput} autoCapitalize="none" autoCorrect={false}/>
      </react_native_1.View>

      <react_native_1.FlatList data={filteredThreads} keyExtractor={function (item) { return item.thread.id; }} onEndReached={handleLoadMore} onEndReachedThreshold={0.6} refreshControl={<react_native_1.RefreshControl refreshing={threadsQuery.isRefetching} onRefresh={threadsQuery.refetch} tintColor={theme_1.colors.primary}/>} contentContainerStyle={filteredThreads.length === 0 ? styles.emptyContent : styles.listContent} ListEmptyComponent={<EmptyState_1.default icon={"\uD83D\uDCCB"} title={deferredSearchQuery
                ? t('forum.noSearchResults')
                : filter === 'unread'
                    ? t('forum.noUnread')
                    : filter === 'following'
                        ? t('forum.noFollowing')
                        : filter === 'mine'
                            ? t('forum.noMine')
                            : filter === 'unanswered'
                                ? t('forum.noUnanswered')
                                : filter === 'pinned'
                                    ? t('forum.noPinned')
                                    : t('forum.noPosts')} subtitle={deferredSearchQuery
                ? t('forum.noSearchResultsBody')
                : filter === 'unread'
                    ? t('forum.noUnreadBody')
                    : filter === 'following'
                        ? t('forum.noFollowingBody')
                        : filter === 'mine'
                            ? t('forum.noMineBody')
                            : filter === 'unanswered'
                                ? t('forum.noUnansweredBody')
                                : filter === 'pinned'
                                    ? t('forum.noPinnedBody')
                                    : t('forum.emptyBody')}/>} ListFooterComponent={threadsQuery.isFetchingNextPage ? (<react_native_1.View style={styles.footerLoading}>
              <react_native_1.ActivityIndicator color={theme_1.colors.primary}/>
            </react_native_1.View>) : null} renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={function () { return handleOpenThread(item); }}>
            <react_native_1.View style={styles.cardHeader}>
              <react_native_1.Text style={styles.cardTitle} numberOfLines={1}>
                {item.thread.title || t('message.thread')}
              </react_native_1.Text>
              {item.unreadReplyCount > 0 ? (<react_native_1.View style={[styles.badge, styles.badgeUnread]}>
                  <react_native_1.Text style={[styles.badgeText, styles.badgeUnreadText]}>
                    {t('forum.newReplies', { count: item.unreadReplyCount })}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
              {item.creator.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) ? (<react_native_1.View style={[styles.badge, styles.badgeMine]}>
                  <react_native_1.Text style={[styles.badgeText, styles.badgeMineText]}>
                    {t('forum.mine')}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
              {item.thread.isPinned ? (<react_native_1.View style={styles.badge}>
                  <react_native_1.Text style={styles.badgeText}>{t('forum.pinned')}</react_native_1.Text>
                </react_native_1.View>) : null}
              {item.thread.isLocked ? (<react_native_1.View style={[styles.badge, styles.badgeMuted]}>
                  <react_native_1.Text style={[styles.badgeText, styles.badgeMutedText]}>{t('thread.locked')}</react_native_1.Text>
                </react_native_1.View>) : null}
            </react_native_1.View>

            <react_native_1.Text style={styles.preview} numberOfLines={2}>
              {item.rootMessage.bodyPlaintext || t('forum.noPreview')}
            </react_native_1.Text>

            <react_native_1.View style={styles.metaRow}>
              <react_native_1.Text style={styles.metaText} numberOfLines={1}>
                {item.creator.displayName || item.creator.username}
              </react_native_1.Text>
              <react_native_1.Text style={styles.metaDot}>{'\u2022'}</react_native_1.Text>
              <react_native_1.Text style={styles.metaText}>{t('thread.replyCount', { count: item.thread.replyCount })}</react_native_1.Text>
              <react_native_1.Text style={styles.metaDot}>{'\u2022'}</react_native_1.Text>
              <react_native_1.Text style={styles.metaText}>
                {t('forum.lastActivity')} {formatRelativeTime(item.thread.lastActivityAt, locale)}
              </react_native_1.Text>
              <react_native_1.TouchableOpacity style={[
                    styles.followChip,
                    item.isFollowing && styles.followChipActive,
                ]} activeOpacity={0.8} onPress={function (event) {
                    event.stopPropagation();
                    handleToggleFollow(item);
                }} disabled={followMutation.isPending}>
                <react_native_1.Text style={[
                    styles.followChipText,
                    item.isFollowing && styles.followChipTextActive,
                ]}>
                  {item.isFollowing ? t('thread.unfollow') : t('thread.follow')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>);
        }} ItemSeparatorComponent={function () { return <react_native_1.View style={styles.separator}/>; }}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    headerAction: {
        color: theme_1.colors.primary,
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 28,
    },
    toolbar: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme_1.colors.borderLight,
        gap: theme_1.spacing.sm,
    },
    sortRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    sortChip: {
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
    },
    sortChipActive: {
        backgroundColor: theme_1.colors.primaryDark,
    },
    sortText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    sortTextActive: {
        color: theme_1.colors.white,
    },
    subtitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
    },
    listContent: {
        padding: theme_1.spacing.lg,
    },
    emptyContent: {
        flexGrow: 1,
    },
    card: {
        padding: theme_1.spacing.lg,
        borderRadius: theme_1.borderRadius.lg,
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        gap: theme_1.spacing.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
    },
    cardTitle: {
        flexShrink: 1,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    badge: {
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.warning + '33',
    },
    badgeUnread: {
        backgroundColor: theme_1.colors.primary + '22',
    },
    badgeMine: {
        backgroundColor: theme_1.colors.success + '22',
    },
    badgeMuted: {
        backgroundColor: theme_1.colors.backgroundDark,
    },
    badgeText: {
        color: theme_1.colors.warning,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    badgeUnreadText: {
        color: theme_1.colors.primaryLight,
    },
    badgeMineText: {
        color: theme_1.colors.success,
    },
    badgeMutedText: {
        color: theme_1.colors.textMuted,
    },
    preview: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
    },
    metaText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
    },
    metaDot: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.xs,
    },
    followChip: {
        marginLeft: 'auto',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    followChipActive: {
        backgroundColor: theme_1.colors.primary + '22',
    },
    followChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    followChipTextActive: {
        color: theme_1.colors.primaryLight,
    },
    separator: {
        height: theme_1.spacing.md,
    },
    footerLoading: {
        paddingVertical: theme_1.spacing.lg,
        alignItems: 'center',
    },
});
