"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.default = InboxScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var native_1 = require("@react-navigation/native");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var theme_1 = require("../theme");
var TABS = ['all', 'mentions', 'threads'];
function formatRelativeTime(dateString, locale) {
    var timestamp = new Date(dateString).getTime();
    var diffMs = timestamp - Date.now();
    var diffMinutes = Math.round(diffMs / 60000);
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
    if (Math.abs(diffMinutes) < 60) {
        return formatter.format(diffMinutes, 'minute');
    }
    if (Math.abs(diffHours) < 24) {
        return formatter.format(diffHours, 'hour');
    }
    if (Math.abs(diffDays) < 7) {
        return formatter.format(diffDays, 'day');
    }
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateString));
}
function InboxScreen() {
    var _this = this;
    var _a, _b, _c, _d;
    var _e = (0, i18n_1.useTranslation)(), t = _e.t, locale = _e.locale;
    var navigation = (0, native_1.useNavigation)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _f = (0, react_1.useState)('all'), activeTab = _f[0], setActiveTab = _f[1];
    var _g = (0, react_1.useState)(null), selectedCommunityId = _g[0], setSelectedCommunityId = _g[1];
    var _h = (0, react_1.useState)(false), showUnreadOnly = _h[0], setShowUnreadOnly = _h[1];
    var _j = (0, react_1.useState)(false), showEncryptedOnly = _j[0], setShowEncryptedOnly = _j[1];
    var _k = (0, react_1.useState)('time'), sortField = _k[0], setSortField = _k[1];
    var _l = (0, react_1.useState)('newest'), sortOrder = _l[0], setSortOrder = _l[1];
    var _m = (0, react_1.useState)(''), searchQuery = _m[0], setSearchQuery = _m[1];
    var devInboxActionAttemptedRef = (0, react_1.useRef)(false);
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim());
    var inboxScope = selectedCommunityId !== null && selectedCommunityId !== void 0 ? selectedCommunityId : 'all';
    var inboxSearchScope = deferredSearchQuery || 'all';
    var communitiesQuery = (0, react_query_1.useQuery)({
        queryKey: ['communities'],
        queryFn: function () { return (0, api_1.api)('/api/communities'); },
    });
    var communitySummaryQuery = (0, react_query_1.useQuery)({
        queryKey: ['inbox-community-summary'],
        queryFn: function () { return (0, api_1.api)('/api/inbox/community-summary'); },
    });
    var inboxQuery = (0, react_query_1.useInfiniteQuery)({
        queryKey: ['inbox', inboxScope, inboxSearchScope],
        queryFn: function (_a) {
            var pageParam = _a.pageParam;
            return (0, api_1.api)("/api/inbox?".concat(selectedCommunityId ? "communityId=".concat(encodeURIComponent(selectedCommunityId), "&") : '').concat(deferredSearchQuery ? "q=".concat(encodeURIComponent(deferredSearchQuery), "&") : '').concat(pageParam ? "cursor=".concat(encodeURIComponent(pageParam)) : '').replace(/\?&/, '?'));
        },
        initialPageParam: null,
        getNextPageParam: function (lastPage) { var _a; return (_a = lastPage.nextCursor) !== null && _a !== void 0 ? _a : undefined; },
        placeholderData: function (previousData) { return previousData; },
    });
    var summaryQuery = (0, react_query_1.useQuery)({
        queryKey: ['inbox-summary', inboxScope],
        queryFn: function () {
            return (0, api_1.api)("/api/inbox/summary".concat(selectedCommunityId ? "?communityId=".concat(encodeURIComponent(selectedCommunityId)) : ''));
        },
    });
    var threadFollowMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var threadId = _a.threadId, follow = _a.follow;
            return (0, api_1.api)("/api/threads/".concat(threadId, "/follow"), {
                method: follow ? 'POST' : 'DELETE',
            });
        },
        onMutate: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var previous, previousSummary, previousCommunitySummary, removedItems, removedUnreadCount_1, removedByCommunity_1;
            var threadId = _b.threadId, follow = _b.follow;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] })];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] })];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] })];
                    case 3:
                        _c.sent();
                        previous = queryClient.getQueryData(['inbox', inboxScope, inboxSearchScope]);
                        previousSummary = queryClient.getQueryData(['inbox-summary', inboxScope]);
                        previousCommunitySummary = queryClient.getQueryData([
                            'inbox-community-summary',
                        ]);
                        if (!follow) {
                            removedItems = items.filter(function (item) { return item.type === 'thread_reply' && item.threadId === threadId; });
                            removedUnreadCount_1 = removedItems.filter(function (item) { return !item.isRead; }).length;
                            removedByCommunity_1 = removedItems.reduce(function (counts, item) {
                                var _a;
                                if (!item.isRead) {
                                    counts.set(item.communityId, ((_a = counts.get(item.communityId)) !== null && _a !== void 0 ? _a : 0) + 1);
                                }
                                return counts;
                            }, new Map());
                            queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], function (current) {
                                return current
                                    ? __assign(__assign({}, current), { pages: current.pages.map(function (page) { return (__assign(__assign({}, page), { items: page.items.filter(function (item) { return !(item.type === 'thread_reply' && item.threadId === threadId); }) })); }) }) : current;
                            });
                            if (removedUnreadCount_1 > 0) {
                                queryClient.setQueryData(['inbox-summary', inboxScope], function (current) {
                                    return current
                                        ? {
                                            all: Math.max(0, current.all - removedUnreadCount_1),
                                            mentions: current.mentions,
                                            threads: Math.max(0, current.threads - removedUnreadCount_1),
                                        }
                                        : current;
                                });
                                queryClient.setQueryData(['inbox-community-summary'], function (current) {
                                    return current
                                        ? {
                                            items: current.items.map(function (item) {
                                                var _a;
                                                var removedCount = (_a = removedByCommunity_1.get(item.communityId)) !== null && _a !== void 0 ? _a : 0;
                                                return removedCount > 0
                                                    ? __assign(__assign({}, item), { all: Math.max(0, item.all - removedCount), threads: Math.max(0, item.threads - removedCount) }) : item;
                                            }),
                                        }
                                        : current;
                                });
                            }
                        }
                        return [2 /*return*/, { previous: previous, previousSummary: previousSummary, previousCommunitySummary: previousCommunitySummary }];
                }
            });
        }); },
        onError: function (error, _variables, context) {
            if (context === null || context === void 0 ? void 0 : context.previous) {
                queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
            }
            if (context === null || context === void 0 ? void 0 : context.previousSummary) {
                queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
            }
            if (context === null || context === void 0 ? void 0 : context.previousCommunitySummary) {
                queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
            }
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('thread.followFailed'));
        },
        onSettled: function () {
            queryClient.invalidateQueries({ queryKey: ['inbox'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
            queryClient.invalidateQueries({ queryKey: ['thread'] });
            queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
        },
    });
    var markReadMutation = (0, react_query_1.useMutation)({
        mutationFn: function (messageId) { return (0, api_1.api)("/api/inbox/".concat(messageId, "/read"), { method: 'POST' }); },
        onMutate: function (messageId) { return __awaiter(_this, void 0, void 0, function () {
            var previous, previousSummary, previousCommunitySummary, targetItem;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] })];
                    case 3:
                        _a.sent();
                        previous = queryClient.getQueryData(['inbox', inboxScope, inboxSearchScope]);
                        previousSummary = queryClient.getQueryData(['inbox-summary', inboxScope]);
                        previousCommunitySummary = queryClient.getQueryData([
                            'inbox-community-summary',
                        ]);
                        targetItem = items.find(function (item) { return item.messageId === messageId; });
                        queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], function (current) {
                            return current
                                ? __assign(__assign({}, current), { pages: current.pages.map(function (page) { return (__assign(__assign({}, page), { items: page.items.map(function (item) {
                                            return item.messageId === messageId ? __assign(__assign({}, item), { isRead: true }) : item;
                                        }) })); }) }) : current;
                        });
                        if (targetItem && !targetItem.isRead) {
                            queryClient.setQueryData(['inbox-summary', inboxScope], function (current) {
                                return current
                                    ? {
                                        all: Math.max(0, current.all - 1),
                                        mentions: targetItem.type === 'mention'
                                            ? Math.max(0, current.mentions - 1)
                                            : current.mentions,
                                        threads: targetItem.type === 'thread_reply'
                                            ? Math.max(0, current.threads - 1)
                                            : current.threads,
                                    }
                                    : current;
                            });
                            queryClient.setQueryData(['inbox-community-summary'], function (current) {
                                return current
                                    ? {
                                        items: current.items.map(function (item) {
                                            return item.communityId === targetItem.communityId
                                                ? __assign(__assign({}, item), { all: Math.max(0, item.all - 1), mentions: targetItem.type === 'mention'
                                                        ? Math.max(0, item.mentions - 1)
                                                        : item.mentions, threads: targetItem.type === 'thread_reply'
                                                        ? Math.max(0, item.threads - 1)
                                                        : item.threads }) : item;
                                        }),
                                    }
                                    : current;
                            });
                        }
                        return [2 /*return*/, { previous: previous, previousSummary: previousSummary, previousCommunitySummary: previousCommunitySummary }];
                }
            });
        }); },
        onError: function (error, _messageId, context) {
            if (context === null || context === void 0 ? void 0 : context.previous) {
                queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
            }
            if (context === null || context === void 0 ? void 0 : context.previousSummary) {
                queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
            }
            if (context === null || context === void 0 ? void 0 : context.previousCommunitySummary) {
                queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
            }
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('inbox.markReadFailed'));
        },
        onSettled: function () {
            queryClient.invalidateQueries({ queryKey: ['inbox'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
        },
    });
    var items = (0, react_1.useMemo)(function () { var _a, _b; return (_b = (_a = inboxQuery.data) === null || _a === void 0 ? void 0 : _a.pages.flatMap(function (page) { return page.items; })) !== null && _b !== void 0 ? _b : []; }, [inboxQuery.data]);
    var filteredItems = (0, react_1.useMemo)(function () {
        var scopedItems = activeTab === 'all'
            ? items
            : activeTab === 'mentions'
                ? items.filter(function (item) { return item.type === 'mention'; })
                : items.filter(function (item) { return item.type === 'thread_reply'; });
        return scopedItems.filter(function (item) {
            if (showUnreadOnly && item.isRead) {
                return false;
            }
            if (showEncryptedOnly && item.bodyPreview !== t('dm.encryptedMessagePlaceholder')) {
                return false;
            }
            return true;
        });
    }, [activeTab, items, showEncryptedOnly, showUnreadOnly, t]);
    var sortedItems = (0, react_1.useMemo)(function () {
        return __spreadArray([], filteredItems, true).sort(function (a, b) {
            if (!showUnreadOnly && a.isRead !== b.isRead) {
                return a.isRead ? 1 : -1;
            }
            if (sortField === 'author') {
                var left = (a.authorDisplayName || '').toLocaleLowerCase();
                var right = (b.authorDisplayName || '').toLocaleLowerCase();
                return sortOrder === 'oldest'
                    ? right.localeCompare(left)
                    : left.localeCompare(right);
            }
            if (sortField === 'channel') {
                var left = (a.channelName || '').toLocaleLowerCase();
                var right = (b.channelName || '').toLocaleLowerCase();
                return sortOrder === 'oldest'
                    ? right.localeCompare(left)
                    : left.localeCompare(right);
            }
            var diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return sortOrder === 'oldest' ? diff : -diff;
        });
    }, [filteredItems, showUnreadOnly, sortField, sortOrder]);
    var firstReadIndex = (0, react_1.useMemo)(function () { return sortedItems.findIndex(function (item) { return item.isRead; }); }, [sortedItems]);
    var hasActiveFilters = !!deferredSearchQuery || selectedCommunityId !== null || showUnreadOnly || showEncryptedOnly;
    var selectedCommunityName = (0, react_1.useMemo)(function () {
        var _a, _b, _c;
        if (!selectedCommunityId) {
            return null;
        }
        return ((_c = (_b = (_a = communitiesQuery.data) === null || _a === void 0 ? void 0 : _a.communities.find(function (community) { return community.id === selectedCommunityId; })) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null);
    }, [(_a = communitiesQuery.data) === null || _a === void 0 ? void 0 : _a.communities, selectedCommunityId]);
    var unreadCounts = (_b = summaryQuery.data) !== null && _b !== void 0 ? _b : { all: 0, mentions: 0, threads: 0 };
    var isSearching = !!deferredSearchQuery &&
        inboxQuery.isFetching &&
        !inboxQuery.isFetchingNextPage &&
        !inboxQuery.isRefetching;
    var currentUnreadCount = activeTab === 'all'
        ? unreadCounts.all
        : activeTab === 'mentions'
            ? unreadCounts.mentions
            : unreadCounts.threads;
    var getCountForTab = (0, react_1.useCallback)(function (summary) {
        if (!summary)
            return 0;
        return activeTab === 'all'
            ? summary.all
            : activeTab === 'mentions'
                ? summary.mentions
                : summary.threads;
    }, [activeTab]);
    var markAllReadMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)('/api/inbox/read-all', {
                method: 'POST',
                body: __assign(__assign({}, (selectedCommunityId ? { communityId: selectedCommunityId } : {})), { type: activeTab }),
            });
        },
        onMutate: function () { return __awaiter(_this, void 0, void 0, function () {
            var previous, previousSummary, previousCommunitySummary;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] })];
                    case 3:
                        _a.sent();
                        previous = queryClient.getQueryData(['inbox', inboxScope, inboxSearchScope]);
                        previousSummary = queryClient.getQueryData(['inbox-summary', inboxScope]);
                        previousCommunitySummary = queryClient.getQueryData([
                            'inbox-community-summary',
                        ]);
                        queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], function (current) {
                            return current
                                ? __assign(__assign({}, current), { pages: current.pages.map(function (page) { return (__assign(__assign({}, page), { items: page.items.map(function (item) {
                                            return activeTab === 'all'
                                                ? __assign(__assign({}, item), { isRead: true }) : activeTab === 'mentions'
                                                ? item.type === 'mention'
                                                    ? __assign(__assign({}, item), { isRead: true }) : item
                                                : item.type === 'thread_reply'
                                                    ? __assign(__assign({}, item), { isRead: true }) : item;
                                        }) })); }) }) : current;
                        });
                        queryClient.setQueryData(['inbox-summary', inboxScope], function (current) {
                            return current
                                ? activeTab === 'all'
                                    ? { all: 0, mentions: 0, threads: 0 }
                                    : activeTab === 'mentions'
                                        ? {
                                            all: Math.max(0, current.all - current.mentions),
                                            mentions: 0,
                                            threads: current.threads,
                                        }
                                        : {
                                            all: Math.max(0, current.all - current.threads),
                                            mentions: current.mentions,
                                            threads: 0,
                                        }
                                : current;
                        });
                        if (selectedCommunityId) {
                            queryClient.setQueryData(['inbox-community-summary'], function (current) {
                                return current
                                    ? {
                                        items: current.items.map(function (item) {
                                            return item.communityId === selectedCommunityId
                                                ? activeTab === 'all'
                                                    ? __assign(__assign({}, item), { all: 0, mentions: 0, threads: 0 }) : activeTab === 'mentions'
                                                    ? __assign(__assign({}, item), { all: Math.max(0, item.all - item.mentions), mentions: 0 }) : __assign(__assign({}, item), { all: Math.max(0, item.all - item.threads), threads: 0 })
                                                : item;
                                        }),
                                    }
                                    : current;
                            });
                        }
                        return [2 /*return*/, { previous: previous, previousSummary: previousSummary, previousCommunitySummary: previousCommunitySummary }];
                }
            });
        }); },
        onError: function (error, _variables, context) {
            if (context === null || context === void 0 ? void 0 : context.previous) {
                queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
            }
            if (context === null || context === void 0 ? void 0 : context.previousSummary) {
                queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
            }
            if (context === null || context === void 0 ? void 0 : context.previousCommunitySummary) {
                queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
            }
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('inbox.markAllReadFailed'));
        },
        onSuccess: function () {
            react_native_1.Alert.alert(t('inbox.markAllRead'), t('inbox.markAllReadDone'));
        },
        onSettled: function () {
            queryClient.invalidateQueries({ queryKey: ['inbox'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
        },
    });
    var handleLoadMore = (0, react_1.useCallback)(function () {
        if (!inboxQuery.hasNextPage || inboxQuery.isFetchingNextPage) {
            return;
        }
        void inboxQuery.fetchNextPage();
    }, [inboxQuery]);
    var handleOpenItem = (0, react_1.useCallback)(function (item) {
        if (!item.isRead && !markReadMutation.isPending) {
            markReadMutation.mutate(item.messageId);
        }
        if (item.threadId) {
            navigation.navigate('HomeTab', {
                screen: 'ThreadScreen',
                params: {
                    threadId: item.threadId,
                    channelId: item.channelId,
                    communityId: item.communityId,
                    channelName: item.channelName,
                    focusMessageId: item.messageId,
                },
            });
            return;
        }
        navigation.navigate('HomeTab', {
            screen: 'ChannelScreen',
            params: {
                communityId: item.communityId,
                channelId: item.channelId,
                channelName: item.channelName,
                focusMessageId: item.messageId,
            },
        });
    }, [markReadMutation, navigation]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devInboxActionAttemptedRef.current) {
            return;
        }
        if (inboxQuery.isLoading || markReadMutation.isPending || sortedItems.length === 0) {
            return;
        }
        function runDevInboxAction() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed, targetItem;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-inbox-action.json')];
                        case 1:
                            parsed = _b.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devInboxActionAttemptedRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-inbox-action.json')];
                        case 2:
                            _b.sent();
                            targetItem = (_a = ((parsed === null || parsed === void 0 ? void 0 : parsed.messageId) ? sortedItems.find(function (item) { return item.messageId === parsed.messageId; }) : null)) !== null && _a !== void 0 ? _a : sortedItems[0];
                            if (!targetItem) {
                                return [2 /*return*/];
                            }
                            handleOpenItem(targetItem);
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevInboxAction();
    }, [handleOpenItem, inboxQuery.isLoading, markReadMutation.isPending, sortedItems]);
    var handleResetFilters = (0, react_1.useCallback)(function () {
        setSelectedCommunityId(null);
        setShowUnreadOnly(false);
        setShowEncryptedOnly(false);
        setSearchQuery('');
    }, []);
    var handleMarkAllRead = (0, react_1.useCallback)(function () {
        if (currentUnreadCount === 0 || markAllReadMutation.isPending) {
            return;
        }
        markAllReadMutation.mutate();
    }, [currentUnreadCount, markAllReadMutation]);
    var handleToggleThreadFollow = (0, react_1.useCallback)(function (item) {
        if (!item.threadId || threadFollowMutation.isPending) {
            return;
        }
        threadFollowMutation.mutate({ threadId: item.threadId, follow: false });
    }, [threadFollowMutation]);
    if (inboxQuery.isLoading && !inboxQuery.data) {
        return <LoadingSpinner_1.default text={t('inbox.loading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['left', 'right']}>
      <react_native_1.StatusBar barStyle="light-content"/>

      <react_native_1.View style={styles.headerCard}>
        <react_native_1.View style={styles.headerCopy}>
          <react_native_1.Text style={styles.headerTitle}>{t('inbox.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.headerSubtitle}>{t('inbox.listSubtitle')}</react_native_1.Text>
        </react_native_1.View>
        {currentUnreadCount > 0 ? (<react_native_1.TouchableOpacity style={styles.headerActionButton} onPress={handleMarkAllRead} disabled={markAllReadMutation.isPending} activeOpacity={0.85}>
            <react_native_1.Text style={styles.headerActionButtonText}>
              {markAllReadMutation.isPending ? t('inbox.markingAllRead') : t('inbox.markAllRead')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>) : null}
      </react_native_1.View>

      <react_native_1.View style={styles.tabRow}>
        {TABS.map(function (tab) {
            var count = tab === 'all'
                ? unreadCounts.all
                : tab === 'mentions'
                    ? unreadCounts.mentions
                    : unreadCounts.threads;
            return (<react_native_1.TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={function () { return setActiveTab(tab); }} activeOpacity={0.85}>
              <react_native_1.Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {t("inbox.".concat(tab))}
              </react_native_1.Text>
              {count > 0 ? (<react_native_1.View style={styles.tabBadge}>
                  <react_native_1.Text style={styles.tabBadgeText}>{count}</react_native_1.Text>
                </react_native_1.View>) : null}
            </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.View>

      <react_native_1.FlatList data={__spreadArray([
            { id: 'all', name: t('inbox.allCommunities') }
        ], (((_d = (_c = communitiesQuery.data) === null || _c === void 0 ? void 0 : _c.communities) !== null && _d !== void 0 ? _d : []).map(function (community) { return ({
            id: community.id,
            name: community.name,
        }); })), true)} horizontal showsHorizontalScrollIndicator={false} keyExtractor={function (item) { return item.id; }} contentContainerStyle={styles.communityFilterRow} renderItem={function (_a) {
            var _b;
            var item = _a.item;
            var selected = item.id === 'all' ? selectedCommunityId === null : selectedCommunityId === item.id;
            var count = item.id === 'all'
                ? getCountForTab(unreadCounts)
                : getCountForTab((_b = communitySummaryQuery.data) === null || _b === void 0 ? void 0 : _b.items.find(function (summary) { return summary.communityId === item.id; }));
            return (<react_native_1.TouchableOpacity style={[styles.communityFilterChip, selected && styles.communityFilterChipActive]} activeOpacity={0.85} onPress={function () { return setSelectedCommunityId(item.id === 'all' ? null : item.id); }}>
              <react_native_1.Text style={[
                    styles.communityFilterLabel,
                    selected && styles.communityFilterLabelActive,
                ]}>
                {item.name}
              </react_native_1.Text>
              {count > 0 ? (<react_native_1.View style={[
                        styles.communityFilterBadge,
                        selected && styles.communityFilterBadgeActive,
                    ]}>
                  <react_native_1.Text style={styles.communityFilterBadgeText}>{count}</react_native_1.Text>
                </react_native_1.View>) : null}
            </react_native_1.TouchableOpacity>);
        }}/>

      <react_native_1.View style={styles.searchWrap}>
        <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('inbox.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
        {isSearching ? (<react_native_1.View style={styles.searchStatusRow}>
            <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
            <react_native_1.Text style={styles.searchStatusText}>{t('inbox.searching')}</react_native_1.Text>
          </react_native_1.View>) : null}
      </react_native_1.View>

      <react_native_1.View style={styles.filterRow}>
        <react_native_1.TouchableOpacity style={[styles.filterChip, sortField === 'time' && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setSortField('time'); }}>
          <react_native_1.Text style={[styles.filterChipLabel, sortField === 'time' && styles.filterChipLabelActive]}>
            {t('inbox.sortTime')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[styles.filterChip, sortField === 'author' && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setSortField('author'); }}>
          <react_native_1.Text style={[styles.filterChipLabel, sortField === 'author' && styles.filterChipLabelActive]}>
            {t('inbox.sortAuthor')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[styles.filterChip, sortField === 'channel' && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setSortField('channel'); }}>
          <react_native_1.Text style={[styles.filterChipLabel, sortField === 'channel' && styles.filterChipLabelActive]}>
            {t('inbox.sortChannel')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.View style={styles.filterRow}>
        <react_native_1.TouchableOpacity style={[styles.filterChip, showUnreadOnly && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setShowUnreadOnly(function (prev) { return !prev; }); }}>
          <react_native_1.Text style={[styles.filterChipLabel, showUnreadOnly && styles.filterChipLabelActive]}>
            {t('inbox.unreadOnly')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[styles.filterChip, showEncryptedOnly && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setShowEncryptedOnly(function (prev) { return !prev; }); }}>
          <react_native_1.Text style={[styles.filterChipLabel, showEncryptedOnly && styles.filterChipLabelActive]}>
            {t('inbox.encryptedOnly')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[styles.filterChip, sortOrder === 'newest' && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setSortOrder('newest'); }}>
          <react_native_1.Text style={[styles.filterChipLabel, sortOrder === 'newest' && styles.filterChipLabelActive]}>
            {sortField === 'time' ? t('settings.sortNewest') : t('settings.sortAsc')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[styles.filterChip, sortOrder === 'oldest' && styles.filterChipActive]} activeOpacity={0.85} onPress={function () { return setSortOrder('oldest'); }}>
          <react_native_1.Text style={[styles.filterChipLabel, sortOrder === 'oldest' && styles.filterChipLabelActive]}>
            {sortField === 'time' ? t('settings.sortOldest') : t('settings.sortDesc')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {hasActiveFilters ? (<react_native_1.View style={styles.activeFilterWrap}>
          {selectedCommunityName ? (<react_native_1.TouchableOpacity style={styles.activeFilterChip} activeOpacity={0.85} onPress={function () { return setSelectedCommunityId(null); }}>
              <react_native_1.Text style={styles.activeFilterChipText}>
                {t('inbox.activeCommunityFilter', { name: selectedCommunityName })}
              </react_native_1.Text>
              <react_native_1.Text style={styles.activeFilterChipDismiss}>{t('common.close')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {deferredSearchQuery ? (<react_native_1.TouchableOpacity style={styles.activeFilterChip} activeOpacity={0.85} onPress={function () { return setSearchQuery(''); }}>
              <react_native_1.Text style={styles.activeFilterChipText}>
                {t('inbox.activeSearchFilter', { query: deferredSearchQuery })}
              </react_native_1.Text>
              <react_native_1.Text style={styles.activeFilterChipDismiss}>{t('common.close')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {showUnreadOnly ? (<react_native_1.TouchableOpacity style={styles.activeFilterChip} activeOpacity={0.85} onPress={function () { return setShowUnreadOnly(false); }}>
              <react_native_1.Text style={styles.activeFilterChipText}>{t('inbox.unreadOnly')}</react_native_1.Text>
              <react_native_1.Text style={styles.activeFilterChipDismiss}>{t('common.close')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {showEncryptedOnly ? (<react_native_1.TouchableOpacity style={styles.activeFilterChip} activeOpacity={0.85} onPress={function () { return setShowEncryptedOnly(false); }}>
              <react_native_1.Text style={styles.activeFilterChipText}>{t('inbox.encryptedOnly')}</react_native_1.Text>
              <react_native_1.Text style={styles.activeFilterChipDismiss}>{t('common.close')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          <react_native_1.TouchableOpacity style={styles.clearAllFiltersButton} activeOpacity={0.85} onPress={handleResetFilters}>
            <react_native_1.Text style={styles.clearAllFiltersText}>{t('inbox.clearFilters')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : null}

      <react_native_1.FlatList data={sortedItems} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={inboxQuery.isRefetching} onRefresh={function () {
                void inboxQuery.refetch();
            }} tintColor={theme_1.colors.primary}/>} onEndReached={handleLoadMore} onEndReachedThreshold={0.35} ListFooterComponent={inboxQuery.isFetchingNextPage ? (<react_native_1.View style={styles.footerLoader}>
              <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
            </react_native_1.View>) : null} ListEmptyComponent={<react_native_1.View style={styles.emptyState}>
            <react_native_1.Text style={styles.emptyIcon}>{"\uD83D\uDCE5"}</react_native_1.Text>
            <react_native_1.Text style={styles.emptyTitle}>
              {showEncryptedOnly ? t('inbox.noEncryptedItems') : t('inbox.empty')}
            </react_native_1.Text>
            <react_native_1.Text style={styles.emptyBody}>
              {deferredSearchQuery
                ? t('inbox.noSearchResults')
                : showEncryptedOnly
                    ? t('inbox.noEncryptedItemsBody')
                    : showUnreadOnly
                        ? t('inbox.noUnreadItems')
                        : activeTab === 'mentions'
                            ? t('inbox.noMentions')
                            : activeTab === 'threads'
                                ? t('inbox.noThreadReplies')
                                : t('inbox.emptyHint')}
            </react_native_1.Text>
            {hasActiveFilters ? (<react_native_1.TouchableOpacity style={styles.emptyAction} activeOpacity={0.85} onPress={handleResetFilters}>
                <react_native_1.Text style={styles.emptyActionText}>{t('inbox.clearFilters')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : null}
          </react_native_1.View>} contentContainerStyle={sortedItems.length === 0 ? styles.emptyContent : styles.listContent} renderItem={function (_a) {
            var item = _a.item, index = _a.index;
            return (<react_native_1.View>
            {!showUnreadOnly && index === 0 && !item.isRead ? (<react_native_1.View style={styles.sectionHeader}>
                <react_native_1.Text style={styles.sectionHeaderText}>{t('inbox.unreadSection')}</react_native_1.Text>
              </react_native_1.View>) : null}
            {!showUnreadOnly && firstReadIndex > 0 && index === firstReadIndex ? (<react_native_1.View style={styles.sectionHeader}>
                <react_native_1.Text style={styles.sectionHeaderText}>{t('inbox.earlierSection')}</react_native_1.Text>
              </react_native_1.View>) : null}
            <react_native_1.TouchableOpacity style={[styles.card, !item.isRead && styles.cardUnread]} activeOpacity={0.9} onPress={function () { return handleOpenItem(item); }}>
              <react_native_1.View style={styles.cardIcon}>
                <react_native_1.Text style={styles.cardIconText}>
                  {item.type === 'mention' ? '@' : "\uD83D\uDCAC"}
                </react_native_1.Text>
              </react_native_1.View>

              <react_native_1.View style={styles.cardBody}>
                <react_native_1.View style={styles.cardMetaRow}>
                  <react_native_1.Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.authorDisplayName || t('common.unknown')}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.cardMetaCopy} numberOfLines={1}>
                    {item.type === 'mention' ? t('inbox.mentionedYou') : t('inbox.repliedIn')}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.cardChannel} numberOfLines={1}>
                    # {item.channelName}
                  </react_native_1.Text>
                </react_native_1.View>

                <react_native_1.Text style={styles.cardPreview} numberOfLines={2}>
                  {item.bodyPreview || t('inbox.emptyMessage')}
                </react_native_1.Text>

                <react_native_1.View style={styles.cardFooter}>
                  <react_native_1.Text style={styles.cardTime}>{formatRelativeTime(item.createdAt, locale)}</react_native_1.Text>
                  {item.type === 'thread_reply' && item.threadId ? (<react_native_1.TouchableOpacity style={styles.threadActionChip} activeOpacity={0.85} disabled={threadFollowMutation.isPending} onPress={function (event) {
                        event.stopPropagation();
                        handleToggleThreadFollow(item);
                    }}>
                      <react_native_1.Text style={styles.threadActionChipText}>
                        {threadFollowMutation.isPending
                        ? t('thread.following')
                        : t('thread.unfollow')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>) : null}
                  {!item.isRead ? <react_native_1.View style={styles.unreadDot}/> : null}
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>);
        }} ItemSeparatorComponent={function () { return <react_native_1.View style={styles.separator}/>; }}/>

      {markReadMutation.isPending ? (<react_native_1.View style={styles.pendingBanner}>
          <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
          <react_native_1.Text style={styles.pendingText}>{t('inbox.markingRead')}</react_native_1.Text>
        </react_native_1.View>) : null}
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    headerCard: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        gap: theme_1.spacing.md,
    },
    headerCopy: {
        gap: 4,
    },
    headerTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '800',
    },
    headerSubtitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    headerActionButton: {
        alignSelf: 'flex-start',
        minHeight: 38,
        paddingHorizontal: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.xl,
        backgroundColor: theme_1.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActionButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    tabRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme_1.colors.borderLight,
    },
    communityFilterRow: {
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    communityFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
    },
    communityFilterChipActive: {
        backgroundColor: theme_1.colors.primaryDark,
    },
    communityFilterLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    communityFilterLabelActive: {
        color: theme_1.colors.white,
    },
    communityFilterBadge: {
        minWidth: 18,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    communityFilterBadgeActive: {
        backgroundColor: theme_1.colors.primary,
    },
    communityFilterBadgeText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textAlign: 'center',
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    searchStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        paddingTop: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.xs,
    },
    searchStatusText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.borderLight,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    activeFilterWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.borderLight,
    },
    activeFilterChipText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    activeFilterChipDismiss: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    clearAllFiltersButton: {
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
    },
    clearAllFiltersText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    filterChip: {
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
    },
    filterChipActive: {
        backgroundColor: theme_1.colors.primaryDark,
    },
    filterChipLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    filterChipLabelActive: {
        color: theme_1.colors.white,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
    },
    tabButtonActive: {
        backgroundColor: theme_1.colors.primaryDark,
    },
    tabLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    tabLabelActive: {
        color: theme_1.colors.white,
    },
    tabBadge: {
        minWidth: 18,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    tabBadgeText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textAlign: 'center',
    },
    listContent: {
        padding: theme_1.spacing.md,
    },
    emptyContent: {
        flexGrow: 1,
    },
    card: {
        flexDirection: 'row',
        gap: theme_1.spacing.md,
        padding: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.lg,
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.borderLight,
    },
    cardUnread: {
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.surfaceHover,
    },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardIconText: {
        color: theme_1.colors.primaryLight,
        fontSize: 18,
        fontWeight: '700',
    },
    cardBody: {
        flex: 1,
        gap: theme_1.spacing.xs,
    },
    cardMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
    },
    cardAuthor: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    cardMetaCopy: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        flexShrink: 1,
    },
    cardChannel: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
        flexShrink: 1,
    },
    cardPreview: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.xs,
    },
    cardTime: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
    },
    threadActionChip: {
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    threadActionChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primary,
    },
    separator: {
        height: theme_1.spacing.sm,
    },
    sectionHeader: {
        paddingTop: theme_1.spacing.xs,
        paddingBottom: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.xs,
    },
    sectionHeaderText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    footerLoader: {
        paddingVertical: theme_1.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme_1.spacing.xl,
        gap: theme_1.spacing.sm,
    },
    emptyIcon: {
        fontSize: 36,
    },
    emptyTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    emptyBody: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyAction: {
        marginTop: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primaryDark,
    },
    emptyActionText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.md,
    },
    pendingText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
    },
});
