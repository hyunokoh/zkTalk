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
exports.default = ThreadScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_file_system_1 = require("expo-file-system");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var auth_1 = require("../stores/auth");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var MessageBubble_1 = require("../components/MessageBubble");
var MessageComposer_1 = require("../components/MessageComposer");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var EmptyState_1 = require("../components/EmptyState");
var MessageActionSheet_1 = require("../components/MessageActionSheet");
var AttachmentLightbox_1 = require("../components/AttachmentLightbox");
var useWebSocket_1 = require("../hooks/useWebSocket");
var file_picker_1 = require("../lib/file-picker");
var error_message_1 = require("../lib/error-message");
var storage_1 = require("../lib/storage");
var theme_1 = require("../theme");
var shared_1 = require("@zktalk/shared");
function formatThreadDateDivider(dateString, locale, t) {
    var date = new Date(dateString);
    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
        return t('thread.dateToday');
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return t('thread.dateYesterday');
    }
    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
    });
}
function flattenThreadMessage(row) {
    var _a, _b;
    if ('message' in row) {
        return __assign(__assign({}, row.message), { author: row.author, attachments: (_b = (_a = row.attachments) !== null && _a !== void 0 ? _a : row.message.attachments) !== null && _b !== void 0 ? _b : [] });
    }
    return row;
}
function ThreadScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11;
    var navigation = _a.navigation, route = _a.route;
    var _12 = route.params, threadId = _12.threadId, channelId = _12.channelId, rootMessageId = _12.rootMessageId, focusMessageId = _12.focusMessageId;
    var _13 = (0, i18n_1.useTranslation)(), t = _13.t, locale = _13.locale;
    var queryClient = (0, react_query_1.useQueryClient)();
    var listRef = (0, react_1.useRef)(null);
    var jumpHighlightTimeoutRef = (0, react_1.useRef)(null);
    var pendingScrollTargetRef = (0, react_1.useRef)(null);
    var devReplyAttemptedRef = (0, react_1.useRef)(false);
    var threadRefreshTimeoutRef = (0, react_1.useRef)(null);
    var currentUser = (0, auth_1.useAuthStore)(function (state) { return state.user; });
    var _14 = (0, useWebSocket_1.useChannelSubscription)(channelId), queuedEventCount = _14.queuedEventCount, consumeEvents = _14.consumeEvents;
    var wsStatus = (0, useWebSocket_1.useWebSocketStatus)();
    var shouldPollReplies = wsStatus !== 'connected';
    var _15 = react_1.default.useState(null), editingMessage = _15[0], setEditingMessage = _15[1];
    var _16 = react_1.default.useState(null), actionMessage = _16[0], setActionMessage = _16[1];
    var _17 = react_1.default.useState({}), translatedBodies = _17[0], setTranslatedBodies = _17[1];
    var _18 = react_1.default.useState(null), pendingAttachment = _18[0], setPendingAttachment = _18[1];
    var _19 = react_1.default.useState(null), uploadProgress = _19[0], setUploadProgress = _19[1];
    var _20 = react_1.default.useState(false), showAttachMenu = _20[0], setShowAttachMenu = _20[1];
    var _21 = react_1.default.useState(null), authToken = _21[0], setAuthToken = _21[1];
    var _22 = react_1.default.useState(null), openingAttachmentId = _22[0], setOpeningAttachmentId = _22[1];
    var _23 = react_1.default.useState(null), previewGallery = _23[0], setPreviewGallery = _23[1];
    var _24 = react_1.default.useState(null), selectedMessageId = _24[0], setSelectedMessageId = _24[1];
    var _25 = (0, react_1.useState)(''), searchQuery = _25[0], setSearchQuery = _25[1];
    var _26 = (0, react_1.useState)('all'), filterMode = _26[0], setFilterMode = _26[1];
    var _27 = (0, react_1.useState)(null), participantFilterUserId = _27[0], setParticipantFilterUserId = _27[1];
    var _28 = (0, react_1.useState)('time'), sortField = _28[0], setSortField = _28[1];
    var _29 = (0, react_1.useState)('oldest'), sortOrder = _29[0], setSortOrder = _29[1];
    var _30 = (0, react_1.useState)(null), jumpHighlightMessageId = _30[0], setJumpHighlightMessageId = _30[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var threadQuery = (0, react_query_1.useQuery)({
        queryKey: ['thread', threadId],
        queryFn: function () { return (0, api_1.api)("/api/threads/".concat(threadId)); },
    });
    var channelQuery = (0, react_query_1.useQuery)({
        queryKey: ['channel', channelId],
        queryFn: function () { return (0, api_1.api)("/api/channels/".concat(channelId)); },
    });
    var channelPermissionsQuery = (0, react_query_1.useQuery)({
        queryKey: ['channel-me-permissions', channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(channelId, "/me-permissions"));
        },
    });
    var repliesQuery = (0, react_query_1.useInfiniteQuery)({
        queryKey: ['thread-messages', threadId],
        queryFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var result;
            var pageParam = _b.pageParam;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/threads/".concat(threadId, "/messages").concat(pageParam ? "?cursor=".concat(encodeURIComponent(pageParam)) : ''))];
                    case 1:
                        result = _c.sent();
                        return [2 /*return*/, {
                                items: result.items.map(flattenThreadMessage),
                                nextCursor: result.nextCursor,
                            }];
                }
            });
        }); },
        initialPageParam: null,
        getNextPageParam: function (lastPage) { var _a; return (_a = lastPage.nextCursor) !== null && _a !== void 0 ? _a : undefined; },
        refetchInterval: shouldPollReplies ? 30000 : false,
    });
    var scheduleThreadRefresh = (0, react_1.useCallback)(function (delayMs) {
        if (delayMs === void 0) { delayMs = 1200; }
        if (threadRefreshTimeoutRef.current) {
            clearTimeout(threadRefreshTimeoutRef.current);
        }
        threadRefreshTimeoutRef.current = setTimeout(function () {
            threadRefreshTimeoutRef.current = null;
            void queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
            void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
        }, delayMs);
    }, [queryClient, threadId]);
    var rootMessage = ((_b = threadQuery.data) === null || _b === void 0 ? void 0 : _b.rootMessage)
        ? flattenThreadMessage(threadQuery.data.rootMessage)
        : null;
    var starterUserId = (_c = rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.authorUserId) !== null && _c !== void 0 ? _c : (_d = threadQuery.data) === null || _d === void 0 ? void 0 : _d.creator.id;
    var replies = (0, react_1.useMemo)(function () { var _a, _b; return __spreadArray([], ((_b = (_a = repliesQuery.data) === null || _a === void 0 ? void 0 : _a.pages) !== null && _b !== void 0 ? _b : []), true).reverse().flatMap(function (page) { return page.items; }); }, [repliesQuery.data]);
    var hasFocusedMessage = focusMessageId
        ? focusMessageId === (rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id) || replies.some(function (message) { return message.id === focusMessageId; })
        : true;
    var focusedMessageQuery = (0, react_query_1.useQuery)({
        queryKey: ['message', focusMessageId],
        enabled: !!focusMessageId && !hasFocusedMessage,
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/messages/".concat(focusMessageId))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, flattenThreadMessage(result)];
                }
            });
        }); },
    });
    var mergedReplies = (0, react_1.useMemo)(function () {
        var focusedMessage = focusedMessageQuery.data;
        if (!focusedMessage ||
            focusedMessage.id === (rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id) ||
            focusedMessage.threadId !== threadId ||
            replies.some(function (message) { return message.id === focusedMessage.id; })) {
            return replies;
        }
        return __spreadArray(__spreadArray([], replies, true), [focusedMessage], false).sort(function (left, right) {
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        });
    }, [focusedMessageQuery.data, replies, rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id, threadId]);
    var messageIds = __spreadArray(__spreadArray([], (rootMessage ? [rootMessage.id] : []), true), mergedReplies.map(function (message) { return message.id; }), true);
    var reactionsData = (0, react_query_1.useQuery)({
        queryKey: ['message-reactions', 'thread', threadId, messageIds],
        enabled: messageIds.length > 0,
        queryFn: function () {
            return (0, api_1.api)("/api/reactions?messageIds=".concat(messageIds.map(encodeURIComponent).join(',')));
        },
    }).data;
    var reactionsByMessageId = (_e = reactionsData === null || reactionsData === void 0 ? void 0 : reactionsData.reactionsByMessageId) !== null && _e !== void 0 ? _e : {};
    var filterCounts = (0, react_1.useMemo)(function () {
        var _a, _b;
        var lastReadMessageId = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.lastReadMessageId) !== null && _b !== void 0 ? _b : null;
        return {
            all: mergedReplies.length,
            unread: mergedReplies.filter(function (message) {
                return lastReadMessageId ? message.id > lastReadMessageId : true;
            }).length,
            mine: mergedReplies.filter(function (message) { return message.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); }).length,
            starter: mergedReplies.filter(function (message) {
                return starterUserId ? message.authorUserId === starterUserId : false;
            }).length,
            reactions: mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = reactionsByMessageId[message.id]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; }).length,
            edited: mergedReplies.filter(function (message) { return !!message.isEdited; }).length,
            images: mergedReplies.filter(function (message) {
                var _a;
                return (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.some(function (attachment) {
                    return (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
                });
            }).length,
            files: mergedReplies.filter(function (message) {
                var _a;
                return (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.some(function (attachment) {
                    return !(0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
                });
            }).length,
            attachments: mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; })
                .length,
        };
    }, [
        currentUser === null || currentUser === void 0 ? void 0 : currentUser.id,
        mergedReplies,
        reactionsByMessageId,
        starterUserId,
        (_f = threadQuery.data) === null || _f === void 0 ? void 0 : _f.lastReadMessageId,
    ]);
    var participantBaseReplies = (0, react_1.useMemo)(function () {
        var _a, _b;
        var lastReadMessageId = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.lastReadMessageId) !== null && _b !== void 0 ? _b : null;
        var baseByMode = filterMode === 'mine'
            ? mergedReplies.filter(function (message) { return message.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })
            : filterMode === 'starter'
                ? mergedReplies.filter(function (message) {
                    return starterUserId ? message.authorUserId === starterUserId : false;
                })
                : filterMode === 'unread'
                    ? mergedReplies.filter(function (message) {
                        return lastReadMessageId ? message.id > lastReadMessageId : true;
                    })
                    : filterMode === 'edited'
                        ? mergedReplies.filter(function (message) { return !!message.isEdited; })
                        : filterMode === 'images'
                            ? mergedReplies.filter(function (message) {
                                var _a;
                                return (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.some(function (attachment) {
                                    return (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
                                });
                            })
                            : filterMode === 'files'
                                ? mergedReplies.filter(function (message) {
                                    var _a;
                                    return (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.some(function (attachment) {
                                        return !(0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
                                    });
                                })
                                : filterMode === 'reactions'
                                    ? mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = reactionsByMessageId[message.id]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; })
                                    : filterMode === 'attachments'
                                        ? mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; })
                                        : mergedReplies;
        return !deferredSearchQuery
            ? baseByMode
            : baseByMode.filter(function (message) {
                var _a, _b, _c, _d, _e;
                var haystack = [
                    (_a = message.bodyPlaintext) !== null && _a !== void 0 ? _a : '',
                    (_c = (_b = message.author) === null || _b === void 0 ? void 0 : _b.displayName) !== null && _c !== void 0 ? _c : '',
                    (_e = (_d = message.author) === null || _d === void 0 ? void 0 : _d.username) !== null && _e !== void 0 ? _e : '',
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(deferredSearchQuery);
            });
    }, [
        currentUser === null || currentUser === void 0 ? void 0 : currentUser.id,
        deferredSearchQuery,
        filterMode,
        mergedReplies,
        reactionsByMessageId,
        starterUserId,
        (_g = threadQuery.data) === null || _g === void 0 ? void 0 : _g.lastReadMessageId,
    ]);
    var participantOptions = (0, react_1.useMemo)(function () {
        var _a, _b;
        var counts = new Map();
        for (var _i = 0, participantBaseReplies_1 = participantBaseReplies; _i < participantBaseReplies_1.length; _i++) {
            var message = participantBaseReplies_1[_i];
            var userId = message.authorUserId;
            var label = ((_a = message.author) === null || _a === void 0 ? void 0 : _a.displayName) || ((_b = message.author) === null || _b === void 0 ? void 0 : _b.username) || t('common.unknown');
            var existing = counts.get(userId);
            if (existing) {
                existing.count += 1;
            }
            else {
                counts.set(userId, {
                    userId: userId,
                    label: label,
                    isCurrentUser: userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id),
                    isStarter: !!starterUserId && userId === starterUserId,
                    count: 1,
                });
            }
        }
        var allOptions = Array.from(counts.values())
            .sort(function (left, right) {
            if (left.isCurrentUser !== right.isCurrentUser) {
                return left.isCurrentUser ? -1 : 1;
            }
            if (left.isStarter !== right.isStarter) {
                return left.isStarter ? -1 : 1;
            }
            if (right.count !== left.count) {
                return right.count - left.count;
            }
            return left.label.localeCompare(right.label);
        })
            .map(function (option) {
            var badges = [
                option.isCurrentUser ? t('common.you') : null,
                option.isStarter ? t('thread.starterBadge') : null,
            ].filter(Boolean);
            return __assign(__assign({}, option), { displayLabel: badges.length > 0 ? "".concat(option.label, " \u00B7 ").concat(badges.join(' · ')) : option.label });
        });
        if (!participantFilterUserId) {
            return allOptions.slice(0, 5);
        }
        var selected = allOptions.find(function (option) { return option.userId === participantFilterUserId; });
        var topOptions = allOptions.filter(function (option) { return option.userId !== participantFilterUserId; }).slice(0, 4);
        return selected ? __spreadArray([selected], topOptions, true) : topOptions;
    }, [currentUser === null || currentUser === void 0 ? void 0 : currentUser.id, participantBaseReplies, participantFilterUserId, starterUserId, t]);
    var activeParticipantOption = participantOptions.find(function (option) { return option.userId === participantFilterUserId; });
    var visibleReplies = (0, react_1.useMemo)(function () {
        var _a, _b;
        var lastReadMessageId = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.lastReadMessageId) !== null && _b !== void 0 ? _b : null;
        var baseByMode = filterMode === 'mine'
            ? mergedReplies.filter(function (message) { return message.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })
            : filterMode === 'starter'
                ? mergedReplies.filter(function (message) {
                    return starterUserId ? message.authorUserId === starterUserId : false;
                })
                : filterMode === 'unread'
                    ? mergedReplies.filter(function (message) {
                        return lastReadMessageId ? message.id > lastReadMessageId : true;
                    })
                    : filterMode === 'reactions'
                        ? mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = reactionsByMessageId[message.id]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; })
                        : filterMode === 'attachments'
                            ? mergedReplies.filter(function (message) { var _a, _b; return ((_b = (_a = message.attachments) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; })
                            : mergedReplies;
        var base = participantFilterUserId
            ? baseByMode.filter(function (message) { return message.authorUserId === participantFilterUserId; })
            : baseByMode;
        var filtered = !deferredSearchQuery
            ? base
            : base.filter(function (message) {
                var _a, _b, _c, _d, _e;
                var haystack = [
                    (_a = message.bodyPlaintext) !== null && _a !== void 0 ? _a : '',
                    (_c = (_b = message.author) === null || _b === void 0 ? void 0 : _b.displayName) !== null && _c !== void 0 ? _c : '',
                    (_e = (_d = message.author) === null || _d === void 0 ? void 0 : _d.username) !== null && _e !== void 0 ? _e : '',
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(deferredSearchQuery);
            });
        return __spreadArray([], filtered, true).sort(function (left, right) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (sortField === 'author') {
                var leftAuthor = (((_a = left.author) === null || _a === void 0 ? void 0 : _a.displayName) || ((_b = left.author) === null || _b === void 0 ? void 0 : _b.username) || '').toLocaleLowerCase();
                var rightAuthor = (((_c = right.author) === null || _c === void 0 ? void 0 : _c.displayName) || ((_d = right.author) === null || _d === void 0 ? void 0 : _d.username) || '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? leftAuthor.localeCompare(rightAuthor)
                    : rightAuthor.localeCompare(leftAuthor);
            }
            if (sortField === 'reactions') {
                var leftReactions = (_f = (_e = reactionsByMessageId[left.id]) === null || _e === void 0 ? void 0 : _e.reduce(function (sum, reaction) { return sum + reaction.count; }, 0)) !== null && _f !== void 0 ? _f : 0;
                var rightReactions = (_h = (_g = reactionsByMessageId[right.id]) === null || _g === void 0 ? void 0 : _g.reduce(function (sum, reaction) { return sum + reaction.count; }, 0)) !== null && _h !== void 0 ? _h : 0;
                if (leftReactions !== rightReactions) {
                    return sortOrder === 'newest'
                        ? rightReactions - leftReactions
                        : leftReactions - rightReactions;
                }
            }
            var leftTime = new Date(left.createdAt).getTime();
            var rightTime = new Date(right.createdAt).getTime();
            return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
        });
    }, [
        currentUser === null || currentUser === void 0 ? void 0 : currentUser.id,
        deferredSearchQuery,
        filterMode,
        mergedReplies,
        participantFilterUserId,
        reactionsByMessageId,
        sortField,
        sortOrder,
        starterUserId,
        (_h = threadQuery.data) === null || _h === void 0 ? void 0 : _h.lastReadMessageId,
    ]);
    var firstUnreadVisibleReplyId = (0, react_1.useMemo)(function () {
        var _a, _b, _c, _d, _e, _f;
        if (filterMode !== 'all' ||
            participantFilterUserId ||
            deferredSearchQuery ||
            sortField !== 'time' ||
            sortOrder !== 'oldest') {
            return null;
        }
        var lastReadMessageId = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.lastReadMessageId) !== null && _b !== void 0 ? _b : null;
        if (!lastReadMessageId) {
            return (_d = (_c = visibleReplies[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
        }
        return (_f = (_e = visibleReplies.find(function (message) { return message.id > lastReadMessageId; })) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : null;
    }, [
        deferredSearchQuery,
        filterMode,
        participantFilterUserId,
        sortField,
        sortOrder,
        (_j = threadQuery.data) === null || _j === void 0 ? void 0 : _j.lastReadMessageId,
        visibleReplies,
    ]);
    var unreadVisibleReplyCount = (0, react_1.useMemo)(function () {
        var _a, _b;
        if (filterMode !== 'all' ||
            participantFilterUserId ||
            deferredSearchQuery ||
            sortField !== 'time' ||
            sortOrder !== 'oldest') {
            return 0;
        }
        var lastReadMessageId = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.lastReadMessageId) !== null && _b !== void 0 ? _b : null;
        if (!lastReadMessageId) {
            return visibleReplies.length;
        }
        return visibleReplies.filter(function (message) { return message.id > lastReadMessageId; }).length;
    }, [
        deferredSearchQuery,
        filterMode,
        participantFilterUserId,
        sortField,
        sortOrder,
        (_k = threadQuery.data) === null || _k === void 0 ? void 0 : _k.lastReadMessageId,
        visibleReplies,
    ]);
    var handleJumpToFirstUnread = (0, react_1.useCallback)(function () {
        var _a;
        if (!firstUnreadVisibleReplyId) {
            return;
        }
        var focusIndex = visibleReplies.findIndex(function (message) { return message.id === firstUnreadVisibleReplyId; });
        if (focusIndex === -1) {
            return;
        }
        pendingScrollTargetRef.current = { index: focusIndex, viewPosition: 0.2 };
        (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToIndex({
            index: focusIndex,
            animated: true,
            viewPosition: 0.2,
        });
        setJumpHighlightMessageId(firstUnreadVisibleReplyId);
        if (jumpHighlightTimeoutRef.current) {
            clearTimeout(jumpHighlightTimeoutRef.current);
        }
        jumpHighlightTimeoutRef.current = setTimeout(function () {
            setJumpHighlightMessageId(function (current) {
                return current === firstUnreadVisibleReplyId ? null : current;
            });
            jumpHighlightTimeoutRef.current = null;
        }, 2200);
    }, [firstUnreadVisibleReplyId, visibleReplies]);
    var handleJumpToLatestReply = (0, react_1.useCallback)(function () {
        var _a, _b;
        if (visibleReplies.length === 0) {
            return;
        }
        var latestIndex = sortOrder === 'newest' ? 0 : visibleReplies.length - 1;
        var latestMessageId = (_a = visibleReplies[latestIndex]) === null || _a === void 0 ? void 0 : _a.id;
        var viewPosition = sortOrder === 'newest' ? 0.2 : 0.8;
        pendingScrollTargetRef.current = { index: latestIndex, viewPosition: viewPosition };
        (_b = listRef.current) === null || _b === void 0 ? void 0 : _b.scrollToIndex({
            index: latestIndex,
            animated: true,
            viewPosition: viewPosition,
        });
        if (latestMessageId) {
            setJumpHighlightMessageId(latestMessageId);
            if (jumpHighlightTimeoutRef.current) {
                clearTimeout(jumpHighlightTimeoutRef.current);
            }
            jumpHighlightTimeoutRef.current = setTimeout(function () {
                setJumpHighlightMessageId(function (current) {
                    return current === latestMessageId ? null : current;
                });
                jumpHighlightTimeoutRef.current = null;
            }, 2200);
        }
    }, [sortOrder, visibleReplies]);
    var handleJumpToRoot = (0, react_1.useCallback)(function () {
        var _a;
        if (!(rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id)) {
            return;
        }
        pendingScrollTargetRef.current = null;
        (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToOffset({
            offset: 0,
            animated: true,
        });
        setJumpHighlightMessageId(rootMessage.id);
        if (jumpHighlightTimeoutRef.current) {
            clearTimeout(jumpHighlightTimeoutRef.current);
        }
        jumpHighlightTimeoutRef.current = setTimeout(function () {
            setJumpHighlightMessageId(function (current) {
                return current === rootMessage.id ? null : current;
            });
            jumpHighlightTimeoutRef.current = null;
        }, 2200);
    }, [rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id]);
    var activeFilters = (0, react_1.useMemo)(function () {
        var filters = [];
        if (searchQuery.trim()) {
            filters.push({
                key: 'search',
                label: t('thread.activeSearchFilter', { query: searchQuery.trim() }),
            });
        }
        if (filterMode !== 'all') {
            filters.push({
                key: 'mode',
                label: filterMode === 'unread'
                    ? t('thread.filterUnread')
                    : filterMode === 'mine'
                        ? t('thread.filterMine')
                        : filterMode === 'starter'
                            ? t('thread.filterStarter')
                            : filterMode === 'edited'
                                ? t('thread.filterEdited')
                                : filterMode === 'images'
                                    ? t('thread.filterImages')
                                    : filterMode === 'files'
                                        ? t('thread.filterFiles')
                                        : filterMode === 'reactions'
                                            ? t('thread.filterReactions')
                                            : t('thread.filterAttachments'),
            });
        }
        if (activeParticipantOption) {
            filters.push({
                key: 'participant',
                label: activeParticipantOption.displayLabel,
            });
        }
        if (sortOrder !== 'oldest') {
            filters.push({
                key: 'sort',
                label: sortField === 'time'
                    ? t('settings.sortNewest')
                    : sortField === 'author'
                        ? t('settings.sortAsc')
                        : t('thread.sortMostReactions'),
            });
        }
        return filters;
    }, [activeParticipantOption, filterMode, searchQuery, sortField, sortOrder, t]);
    var sendMutation = (0, react_query_1.useMutation)({
        mutationFn: function (bodyMarkdown) { return __awaiter(_this, void 0, void 0, function () {
            var attachmentData, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (editingMessage) {
                            return [2 /*return*/, (0, api_1.api)("/api/messages/".concat(editingMessage.id), {
                                    method: 'PATCH',
                                    body: { bodyMarkdown: bodyMarkdown },
                                })];
                        }
                        attachmentData = null;
                        if (!pendingAttachment) return [3 /*break*/, 2];
                        setUploadProgress(0);
                        return [4 /*yield*/, (0, file_picker_1.uploadFile)(pendingAttachment, { channelId: channelId }, setUploadProgress)];
                    case 1:
                        attachmentData = _b.sent();
                        _b.label = 2;
                    case 2: return [4 /*yield*/, (0, api_1.api)("/api/threads/".concat(threadId, "/messages"), {
                            method: 'POST',
                            body: { bodyMarkdown: bodyMarkdown },
                            headers: {
                                'X-Request-Id': (0, api_1.createRequestId)(),
                            },
                        })];
                    case 3:
                        result = _b.sent();
                        if (!(attachmentData && ((_a = result.message) === null || _a === void 0 ? void 0 : _a.id))) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, file_picker_1.attachToMessage)(result.message.id, attachmentData)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [2 /*return*/, result];
                }
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] }),
                            queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] }),
                            queryClient.invalidateQueries({ queryKey: ['messages', channelId] }),
                            queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
                        ])];
                    case 1:
                        _a.sent();
                        setEditingMessage(null);
                        setPendingAttachment(null);
                        setUploadProgress(null);
                        setShowAttachMenu(false);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            setUploadProgress(null);
            react_native_1.Alert.alert(t('common.error'), error instanceof Error
                ? error.message
                : editingMessage
                    ? t('message.editFailed')
                    : t('thread.replyFailed'));
        },
    });
    var followMutation = (0, react_query_1.useMutation)({
        mutationFn: function (follow) {
            return (0, api_1.api)("/api/threads/".concat(threadId, "/follow"), {
                method: follow ? 'POST' : 'DELETE',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['thread', threadId] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('thread.followFailed'));
        },
    });
    var lockMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return (0, api_1.api)("/api/threads/".concat(threadId, "/lock"), { method: 'POST' }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
                            queryClient.invalidateQueries({ queryKey: ['forum-threads', channelId] }),
                        ])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('thread.lockFailed'));
        },
    });
    var handleSend = (0, react_1.useCallback)(function (text) { return __awaiter(_this, void 0, void 0, function () {
        var trimmed, fallbackBody, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trimmed = text.trim();
                    if ((!trimmed && !pendingAttachment) || sendMutation.isPending)
                        return [2 /*return*/, false];
                    setShowAttachMenu(false);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    fallbackBody = trimmed || (pendingAttachment
                        ? pendingAttachment.name || ' '
                        : ' ');
                    return [4 /*yield*/, sendMutation.mutateAsync(fallbackBody)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    message = pendingAttachment && error_1 instanceof api_1.ApiError && error_1.status === 0
                        ? t('channel.attachmentNeedsConnection')
                        : (0, error_message_1.getUserFacingErrorMessage)(error_1, t, {
                            rateLimitedKey: pendingAttachment
                                ? 'message.attachmentRateLimited'
                                : 'common.rateLimited',
                        });
                    react_native_1.Alert.alert(t('common.error'), message);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [pendingAttachment, sendMutation, t]);
    (0, react_1.useEffect)(function () {
        return function () {
            if (threadRefreshTimeoutRef.current) {
                clearTimeout(threadRefreshTimeoutRef.current);
            }
        };
    }, []);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devReplyAttemptedRef.current) {
            return;
        }
        if (sendMutation.isPending || threadQuery.isLoading) {
            return;
        }
        function runDevReply() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-thread-reply.json')];
                        case 1:
                            parsed = _b.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devReplyAttemptedRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-thread-reply.json')];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, handleSend(((_a = parsed === null || parsed === void 0 ? void 0 : parsed.body) === null || _a === void 0 ? void 0 : _a.trim()) || 'Simulator thread reply test')];
                        case 3:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevReply();
    }, [handleSend, sendMutation.isPending, threadQuery.isLoading]);
    (0, react_1.useEffect)(function () {
        var _a, _b, _c;
        if (queuedEventCount === 0)
            return;
        var newEvents = consumeEvents();
        var shouldRefreshThread = false;
        var shouldRefreshReplies = false;
        for (var _i = 0, newEvents_1 = newEvents; _i < newEvents_1.length; _i++) {
            var event_1 = newEvents_1[_i];
            var payload = event_1.payload;
            var payloadThread = payload.thread;
            var payloadMessage = payload.message;
            var eventThreadId = (_c = (_b = (_a = payloadThread === null || payloadThread === void 0 ? void 0 : payloadThread.id) !== null && _a !== void 0 ? _a : payloadThread === null || payloadThread === void 0 ? void 0 : payloadThread.threadId) !== null && _b !== void 0 ? _b : payloadMessage === null || payloadMessage === void 0 ? void 0 : payloadMessage.threadId) !== null && _c !== void 0 ? _c : payload.threadId;
            if (eventThreadId !== threadId) {
                continue;
            }
            switch (event_1.type) {
                case 'message.created':
                case 'message.updated':
                case 'message.deleted':
                    shouldRefreshReplies = true;
                    break;
                case 'message.reaction_added':
                case 'message.reaction_removed':
                    void queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] });
                    break;
                case 'thread.updated':
                case 'thread.locked':
                    shouldRefreshThread = true;
                    break;
            }
        }
        if (shouldRefreshReplies) {
            scheduleThreadRefresh();
        }
        else if (shouldRefreshThread) {
            void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
        }
    }, [consumeEvents, queuedEventCount, queryClient, scheduleThreadRefresh, threadId]);
    var handleToggleFollow = (0, react_1.useCallback)(function () {
        var _a, _b;
        var isFollowing = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.isFollowing) !== null && _b !== void 0 ? _b : false;
        followMutation.mutate(!isFollowing);
    }, [followMutation, (_l = threadQuery.data) === null || _l === void 0 ? void 0 : _l.isFollowing]);
    var handleLock = (0, react_1.useCallback)(function () {
        react_native_1.Alert.alert(t('thread.lockConfirmTitle'), t('thread.lockConfirmBody'), [
            {
                text: t('common.cancel'),
                style: 'cancel',
            },
            {
                text: t('thread.lock'),
                style: 'destructive',
                onPress: function () { return lockMutation.mutate(); },
            },
        ]);
    }, [lockMutation, t]);
    var handleOpenContext = (0, react_1.useCallback)(function () {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!route.params.communityId) {
            return;
        }
        var channelType = (_a = channelQuery.data) === null || _a === void 0 ? void 0 : _a.channel.type;
        if (channelType === 'forum') {
            navigation.navigate('ForumChannelScreen', {
                channelId: channelId,
                communityId: route.params.communityId,
                channelName: (_c = (_b = channelQuery.data) === null || _b === void 0 ? void 0 : _b.channel.name) !== null && _c !== void 0 ? _c : route.params.channelName,
            });
            return;
        }
        navigation.navigate('ChannelScreen', {
            channelId: channelId,
            communityId: route.params.communityId,
            channelName: (_e = (_d = channelQuery.data) === null || _d === void 0 ? void 0 : _d.channel.name) !== null && _e !== void 0 ? _e : route.params.channelName,
            focusMessageId: (_g = (_f = threadQuery.data) === null || _f === void 0 ? void 0 : _f.thread.rootMessageId) !== null && _g !== void 0 ? _g : rootMessageId,
        });
    }, [
        channelId,
        (_m = channelQuery.data) === null || _m === void 0 ? void 0 : _m.channel.name,
        (_o = channelQuery.data) === null || _o === void 0 ? void 0 : _o.channel.type,
        navigation,
        rootMessageId,
        route.params.channelName,
        route.params.communityId,
        (_p = threadQuery.data) === null || _p === void 0 ? void 0 : _p.thread.rootMessageId,
    ]);
    var handleDelete = (0, react_1.useCallback)(function (message) {
        react_native_1.Alert.alert(t('message.delete'), t('message.deleteConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('message.delete'),
                style: 'destructive',
                onPress: function () {
                    (0, api_1.api)("/api/messages/".concat(message.id), { method: 'DELETE' })
                        .then(function () {
                        return Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] }),
                            queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
                            queryClient.invalidateQueries({ queryKey: ['messages', channelId] }),
                        ]);
                    })
                        .catch(function () { });
                },
            },
        ]);
    }, [channelId, queryClient, t, threadId]);
    var toggleReaction = (0, react_1.useCallback)(function (messageId, emoji) { return __awaiter(_this, void 0, void 0, function () {
        var reactedByMe, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    reactedByMe = (_b = (_a = reactionsByMessageId[messageId]) === null || _a === void 0 ? void 0 : _a.some(function (reaction) {
                        return reaction.emoji === emoji &&
                            reaction.users.some(function (user) { return user.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); });
                    })) !== null && _b !== void 0 ? _b : false;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, , 8]);
                    if (!reactedByMe) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, api_1.api)("/api/messages/".concat(messageId, "/reactions/").concat(encodeURIComponent(emoji)), {
                            method: 'DELETE',
                        })];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, api_1.api)("/api/messages/".concat(messageId, "/reactions"), {
                        method: 'POST',
                        body: { emoji: emoji },
                    })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] })];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _c.sent();
                    react_native_1.Alert.alert(t('common.error'), error_2 instanceof Error ? error_2.message : t('message.reactionFailed'));
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); }, [currentUser === null || currentUser === void 0 ? void 0 : currentUser.id, queryClient, reactionsByMessageId, t, threadId]);
    var handleReact = (0, react_1.useCallback)(function (emoji) {
        if (!actionMessage)
            return;
        void toggleReaction(actionMessage.id, emoji);
    }, [actionMessage, toggleReaction]);
    var handleTranslate = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var existing, result_1, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!actionMessage)
                        return [2 /*return*/];
                    existing = translatedBodies[actionMessage.id];
                    if (existing) {
                        setTranslatedBodies(function (prev) {
                            var next = __assign({}, prev);
                            delete next[actionMessage.id];
                            return next;
                        });
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, api_1.api)('/api/translate', {
                            method: 'POST',
                            body: {
                                text: actionMessage.bodyPlaintext,
                                targetLang: locale,
                            },
                        })];
                case 2:
                    result_1 = _a.sent();
                    setTranslatedBodies(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[actionMessage.id] = result_1.translatedText, _a)));
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_3 instanceof Error ? error_3.message : t('message.translateFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [actionMessage, locale, t, translatedBodies]);
    var handleReport = (0, react_1.useCallback)(function () {
        if (!actionMessage || !route.params.communityId)
            return;
        var submitReport = function (reasonCode) {
            (0, api_1.api)('/api/reports', {
                method: 'POST',
                body: {
                    communityId: route.params.communityId,
                    messageId: actionMessage.id,
                    reportedUserId: actionMessage.authorUserId,
                    reasonCode: reasonCode,
                },
            })
                .then(function () {
                react_native_1.Alert.alert(t('message.reportTitle'), t('message.reportSubmitted'));
            })
                .catch(function (error) {
                react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('message.reportFailed'));
            });
        };
        react_native_1.Alert.alert(t('message.reportTitle'), t('message.reportBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('message.reportSpam'), onPress: function () { return submitReport('spam'); } },
            { text: t('message.reportHarassment'), onPress: function () { return submitReport('harassment'); } },
            { text: t('message.reportInappropriate'), onPress: function () { return submitReport('inappropriate'); } },
        ]);
    }, [actionMessage, route.params.communityId, t]);
    var handleEdit = (0, react_1.useCallback)(function () {
        if (!actionMessage)
            return;
        setEditingMessage(actionMessage);
        setPendingAttachment(null);
        setShowAttachMenu(false);
        setActionMessage(null);
    }, [actionMessage]);
    var handlePickImage = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, file_picker_1.pickImage)()];
                case 2:
                    file = _a.sent();
                    if (file)
                        setPendingAttachment(file);
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_4 instanceof Error ? error_4.message : t('common.errorOccurred'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handleTakePhoto = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, file_picker_1.takePhoto)()];
                case 2:
                    file = _a.sent();
                    if (file)
                        setPendingAttachment(file);
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_5 instanceof Error ? error_5.message : t('common.errorOccurred'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handlePickDocument = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, file_picker_1.pickDocument)()];
                case 2:
                    file = _a.sent();
                    if (file)
                        setPendingAttachment(file);
                    return [3 /*break*/, 4];
                case 3:
                    error_6 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_6 instanceof Error ? error_6.message : t('common.errorOccurred'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handleToggleAttachMenu = (0, react_1.useCallback)(function () {
        setShowAttachMenu(function (prev) { return !prev; });
    }, []);
    var handleShareAttachment = (0, react_1.useCallback)(function (attachment) { return __awaiter(_this, void 0, void 0, function () {
        var token, _a, attachmentDirectory, targetFile, downloadedFile, error_7;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (openingAttachmentId)
                        return [2 /*return*/];
                    setOpeningAttachmentId(attachment.id);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, 8, 9]);
                    if (!(authToken !== null && authToken !== void 0)) return [3 /*break*/, 2];
                    _a = authToken;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (0, storage_1.getToken)()];
                case 3:
                    _a = (_b.sent());
                    _b.label = 4;
                case 4:
                    token = _a;
                    attachmentDirectory = new expo_file_system_1.Directory(expo_file_system_1.Paths.cache, 'attachments');
                    attachmentDirectory.create({ idempotent: true, intermediates: true });
                    targetFile = new expo_file_system_1.File(attachmentDirectory, "".concat(attachment.id, "-").concat(sanitizeAttachmentName(attachment.fileName)));
                    return [4 /*yield*/, expo_file_system_1.File.downloadFileAsync((0, file_picker_1.getAttachmentFileUrl)(attachment.id), targetFile, {
                            idempotent: true,
                            headers: token ? { Authorization: "Bearer ".concat(token) } : undefined,
                        })];
                case 5:
                    downloadedFile = _b.sent();
                    return [4 /*yield*/, react_native_1.Share.share({
                            title: attachment.fileName,
                            message: attachment.fileName,
                            url: downloadedFile.uri,
                        })];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 9];
                case 7:
                    error_7 = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), error_7 instanceof Error ? error_7.message : t('channel.openAttachmentFailed'));
                    return [3 /*break*/, 9];
                case 8:
                    setOpeningAttachmentId(null);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); }, [authToken, openingAttachmentId, t]);
    var handleOpenAttachment = (0, react_1.useCallback)(function (attachment, attachments) { return __awaiter(_this, void 0, void 0, function () {
        var imageAttachments, index;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if ((0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName)) {
                        imageAttachments = (attachments !== null && attachments !== void 0 ? attachments : [attachment]).filter(function (item) {
                            return (0, shared_1.isImageAttachmentMimeType)(item.mimeType, item.fileName);
                        });
                        index = imageAttachments.findIndex(function (item) { return item.id === attachment.id; });
                        setPreviewGallery({
                            attachments: imageAttachments.length > 0 ? imageAttachments : [attachment],
                            index: index >= 0 ? index : 0,
                        });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, handleShareAttachment(attachment)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [handleShareAttachment]);
    (0, react_1.useLayoutEffect)(function () {
        var _a, _b, _c, _d, _e, _f, _g;
        var isFollowing = (_b = (_a = threadQuery.data) === null || _a === void 0 ? void 0 : _a.isFollowing) !== null && _b !== void 0 ? _b : false;
        var canModerateThread = (_d = (_c = threadQuery.data) === null || _c === void 0 ? void 0 : _c.permissions.canModerateThread) !== null && _d !== void 0 ? _d : false;
        var isLocked = (_f = (_e = threadQuery.data) === null || _e === void 0 ? void 0 : _e.thread.isLocked) !== null && _f !== void 0 ? _f : false;
        navigation.setOptions({
            title: ((_g = threadQuery.data) === null || _g === void 0 ? void 0 : _g.thread.title) || t('message.thread'),
            headerRight: function () { return (<react_native_1.View style={styles.headerActions}>
          <react_native_1.TouchableOpacity hitSlop={8} disabled={followMutation.isPending} onPress={handleToggleFollow}>
            <react_native_1.Text style={styles.headerActionText}>
              {followMutation.isPending
                    ? t('thread.following')
                    : isFollowing
                        ? t('thread.unfollow')
                        : t('thread.follow')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
          {canModerateThread && !isLocked ? (<react_native_1.TouchableOpacity hitSlop={8} disabled={lockMutation.isPending} onPress={handleLock}>
              <react_native_1.Text style={[styles.headerActionText, styles.headerActionDanger]}>
                {lockMutation.isPending ? t('thread.locking') : t('thread.lock')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>); },
        });
    }, [
        followMutation.isPending,
        handleLock,
        handleToggleFollow,
        lockMutation.isPending,
        navigation,
        t,
        (_q = threadQuery.data) === null || _q === void 0 ? void 0 : _q.isFollowing,
        (_r = threadQuery.data) === null || _r === void 0 ? void 0 : _r.permissions.canModerateThread,
        (_s = threadQuery.data) === null || _s === void 0 ? void 0 : _s.thread.isLocked,
        (_t = threadQuery.data) === null || _t === void 0 ? void 0 : _t.thread.title,
    ]);
    (0, react_1.useEffect)(function () {
        (0, storage_1.getToken)()
            .then(setAuthToken)
            .catch(function () { return setAuthToken(null); });
    }, []);
    (0, react_1.useEffect)(function () { return function () {
        if (jumpHighlightTimeoutRef.current) {
            clearTimeout(jumpHighlightTimeoutRef.current);
        }
    }; }, []);
    var canPostReply = (_v = (_u = threadQuery.data) === null || _u === void 0 ? void 0 : _u.permissions.canPostReply) !== null && _v !== void 0 ? _v : false;
    var canUploadAttachment = (_x = (_w = channelPermissionsQuery.data) === null || _w === void 0 ? void 0 : _w.permissions.canUploadAttachment) !== null && _x !== void 0 ? _x : true;
    var latestVisibleMessageId = mergedReplies.length > 0 ? (_y = mergedReplies[mergedReplies.length - 1]) === null || _y === void 0 ? void 0 : _y.id : rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id;
    (0, react_1.useEffect)(function () {
        if (!latestVisibleMessageId)
            return;
        (0, api_1.api)("/api/threads/".concat(threadId, "/read"), {
            method: 'POST',
            body: { messageId: latestVisibleMessageId },
        })
            .then(function () {
            void queryClient.invalidateQueries({ queryKey: ['forum-threads', channelId] });
            void queryClient.invalidateQueries({ queryKey: ['inbox'] });
        })
            .catch(function () { });
    }, [channelId, latestVisibleMessageId, queryClient, threadId]);
    (0, react_1.useEffect)(function () {
        if (!focusMessageId || focusMessageId === (rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id) || visibleReplies.length === 0) {
            return;
        }
        var focusIndex = visibleReplies.findIndex(function (message) { return message.id === focusMessageId; });
        if (focusIndex === -1) {
            return;
        }
        var timer = setTimeout(function () {
            var _a;
            pendingScrollTargetRef.current = { index: focusIndex, viewPosition: 0.5 };
            (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToIndex({
                index: focusIndex,
                animated: true,
                viewPosition: 0.5,
            });
        }, 50);
        return function () { return clearTimeout(timer); };
    }, [focusMessageId, rootMessage === null || rootMessage === void 0 ? void 0 : rootMessage.id, visibleReplies]);
    if (threadQuery.isLoading || repliesQuery.isLoading) {
        return <LoadingSpinner_1.default text={t('thread.loading')}/>;
    }
    var renderAttachments = function (attachments, isOwn) {
        var imageAttachments = attachments.filter(function (attachment) {
            return (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
        });
        var fileAttachments = attachments.filter(function (attachment) { return !(0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName); });
        var visibleImageAttachments = imageAttachments.slice(0, 4);
        return (<react_native_1.View style={[styles.attachments, isOwn && styles.attachmentsOwn]}>
        {imageAttachments.length > 0 ? (<react_native_1.View style={[
                    styles.attachmentImageGrid,
                    imageAttachments.length === 1 && styles.attachmentImageGridSingle,
                    isOwn && styles.attachmentImageGridOwn,
                ]}>
            {visibleImageAttachments.map(function (attachment, index) {
                    var isSingle = imageAttachments.length === 1;
                    var isHero = imageAttachments.length === 3 && index === 0;
                    var extraCount = imageAttachments.length > 4 && index === 3
                        ? imageAttachments.length - 4
                        : 0;
                    return (<react_native_1.TouchableOpacity key={attachment.id} style={[
                            styles.attachmentImageCard,
                            isSingle && styles.attachmentImageCardSingle,
                            !isSingle && styles.attachmentImageCardGrid,
                            isHero && styles.attachmentImageCardHero,
                        ]} activeOpacity={0.88} onPress={function () { return void handleOpenAttachment(attachment, attachments); }}>
                  <react_native_1.Image source={__assign({ uri: (0, file_picker_1.getAttachmentFileUrl)(attachment.id) }, (authToken
                            ? { headers: { Authorization: "Bearer ".concat(authToken) } }
                            : {}))} style={styles.attachmentImage} resizeMode="cover"/>
                  {extraCount > 0 ? (<react_native_1.View style={styles.attachmentImageMoreOverlay}>
                      <react_native_1.Text style={styles.attachmentImageMoreText}>{"+".concat(extraCount)}</react_native_1.Text>
                    </react_native_1.View>) : null}
                </react_native_1.TouchableOpacity>);
                })}
          </react_native_1.View>) : null}
        {fileAttachments.map(function (attachment) { return (<react_native_1.View key={attachment.id} style={styles.attachmentItem}>
            <react_native_1.TouchableOpacity style={styles.attachmentFile} activeOpacity={0.8} onPress={function () { return void handleOpenAttachment(attachment, attachments); }} disabled={openingAttachmentId === attachment.id}>
              <react_native_1.View style={styles.attachmentFileIconWrap}>
                <react_native_1.Text style={styles.attachmentFileIcon}>{"\uD83D\uDCC4"}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.attachmentFileContent}>
                <react_native_1.View style={styles.attachmentFileMetaRow}>
                  <react_native_1.View style={styles.attachmentFileTypeBadge}>
                    <react_native_1.Text style={styles.attachmentFileTypeBadgeText}>
                      {getAttachmentKindLabel(attachment.fileName, attachment.mimeType)}
                    </react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.Text style={styles.attachmentFileName} numberOfLines={1}>
                  {attachment.fileName}
                </react_native_1.Text>
                <react_native_1.Text style={styles.attachmentSize}>
                  {openingAttachmentId === attachment.id
                    ? t('channel.openingAttachment')
                    : formatFileSize(attachment.fileSize)}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.attachmentFileCta}>
                <react_native_1.Text style={styles.attachmentFileCtaText}>{t('channel.shareAttachment')}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>); })}
      </react_native_1.View>);
    };
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['left', 'right']}>
        <react_native_1.FlatList ref={listRef} data={visibleReplies} keyExtractor={function (item) { return item.id; }} onScrollToIndexFailed={function (_a) {
            var _b, _c;
            var index = _a.index, averageItemLength = _a.averageItemLength;
            var target = (_b = pendingScrollTargetRef.current) !== null && _b !== void 0 ? _b : { index: index, viewPosition: 0.5 };
            (_c = listRef.current) === null || _c === void 0 ? void 0 : _c.scrollToOffset({
                offset: Math.max(0, averageItemLength * index),
                animated: true,
            });
            setTimeout(function () {
                var _a;
                (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToIndex({
                    index: target.index,
                    animated: true,
                    viewPosition: target.viewPosition,
                });
            }, 120);
        }} refreshControl={<react_native_1.RefreshControl refreshing={threadQuery.isRefetching || repliesQuery.isRefetching} onRefresh={function () {
                void Promise.all([threadQuery.refetch(), repliesQuery.refetch()]);
            }} tintColor={theme_1.colors.primary}/>} contentContainerStyle={styles.content} ListHeaderComponent={<react_native_1.View style={styles.header}>
              <react_native_1.Text style={styles.headerTitle}>
                {((_z = threadQuery.data) === null || _z === void 0 ? void 0 : _z.thread.title) || t('message.thread')}
              </react_native_1.Text>
              {rootMessage ? (<react_native_1.View style={[
                    styles.rootWrap,
                    focusMessageId === rootMessage.id || jumpHighlightMessageId === rootMessage.id
                        ? styles.focusedMessageWrap
                        : undefined,
                ]}>
                  <react_native_1.Text style={styles.rootLabel}>{t('thread.rootMessage')}</react_native_1.Text>
                  <react_native_1.TouchableOpacity activeOpacity={0.75} onLongPress={function () { return setActionMessage(rootMessage); }} delayLongPress={400}>
                  <MessageBubble_1.default authorName={(_1 = (_0 = rootMessage.author) === null || _0 === void 0 ? void 0 : _0.displayName) !== null && _1 !== void 0 ? _1 : t('common.unknown')} body={(0, shared_1.shouldHideAttachmentBody)(rootMessage.bodyPlaintext || rootMessage.bodyMarkdown, (_2 = rootMessage.attachments) !== null && _2 !== void 0 ? _2 : [])
                    ? ''
                    : rootMessage.bodyPlaintext} translatedBody={translatedBodies[rootMessage.id]} translatedLabel={translatedBodies[rootMessage.id] ? t('message.translated') : undefined} time={new Date(rootMessage.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })} isOwn={rootMessage.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)} isEdited={rootMessage.isEdited} editedLabel={t('message.edited')} reactions={((_3 = reactionsByMessageId[rootMessage.id]) !== null && _3 !== void 0 ? _3 : []).map(function (reaction) { return ({
                    emoji: reaction.emoji,
                    count: reaction.count,
                    reactedByMe: reaction.users.some(function (user) { return user.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); }),
                }); })} onPressReaction={function (emoji) {
                    void toggleReaction(rootMessage.id, emoji);
                }} onPressAddReaction={function () { return setActionMessage(rootMessage); }} onPressMore={function () { return setActionMessage(rootMessage); }} showAvatar showAuthorName startsGroup endsGroup/>
                  </react_native_1.TouchableOpacity>
                  {rootMessage.attachments && rootMessage.attachments.length > 0
                    ? renderAttachments(rootMessage.attachments, isOwnMessage(rootMessage, currentUser === null || currentUser === void 0 ? void 0 : currentUser.id))
                    : null}
                  {route.params.communityId ? (<react_native_1.TouchableOpacity style={styles.contextButton} activeOpacity={0.75} onPress={handleOpenContext}>
                      <react_native_1.Text style={styles.contextButtonText}>
                        {((_4 = channelQuery.data) === null || _4 === void 0 ? void 0 : _4.channel.type) === 'forum'
                        ? t('thread.backToForum')
                        : t('thread.backToChannel')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>) : null}
                </react_native_1.View>) : rootMessageId ? (<react_native_1.View style={styles.missingRoot}>
                  <react_native_1.Text style={styles.missingRootText}>{t('message.replyUnavailable')}</react_native_1.Text>
                </react_native_1.View>) : null}
              {repliesQuery.hasNextPage ? (<react_native_1.TouchableOpacity style={styles.loadOlderButton} activeOpacity={0.8} onPress={function () { return void repliesQuery.fetchNextPage(); }} disabled={repliesQuery.isFetchingNextPage}>
                  {repliesQuery.isFetchingNextPage ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>) : (<react_native_1.Text style={styles.loadOlderButtonText}>{t('thread.loadOlder')}</react_native_1.Text>)}
                </react_native_1.TouchableOpacity>) : null}
              <react_native_1.Text style={styles.replyCount}>
                {t('thread.replyCount', { count: mergedReplies.length })}
              </react_native_1.Text>
              <react_native_1.View style={styles.sortRow}>
                {([
                { key: 'all', label: t('thread.filterAll') },
                { key: 'unread', label: t('thread.filterUnread') },
                { key: 'mine', label: t('thread.filterMine') },
                { key: 'starter', label: t('thread.filterStarter') },
                { key: 'edited', label: t('thread.filterEdited') },
                { key: 'images', label: t('thread.filterImages') },
                { key: 'files', label: t('thread.filterFiles') },
                { key: 'reactions', label: t('thread.filterReactions') },
                { key: 'attachments', label: t('thread.filterAttachments') },
            ]).map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[styles.sortChip, filterMode === option.key && styles.sortChipActive]} onPress={function () { return setFilterMode(option.key); }}>
                    <react_native_1.Text style={[styles.sortChipText, filterMode === option.key && styles.sortChipTextActive]}>
                      {"".concat(option.label, " (").concat(filterCounts[option.key], ")")}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>); })}
              </react_native_1.View>
              {participantOptions.length > 0 ? (<react_native_1.View style={styles.sortRow}>
                  <react_native_1.TouchableOpacity style={[
                    styles.sortChip,
                    participantFilterUserId === null && styles.sortChipActive,
                ]} onPress={function () { return setParticipantFilterUserId(null); }}>
                    <react_native_1.Text style={[
                    styles.sortChipText,
                    participantFilterUserId === null && styles.sortChipTextActive,
                ]}>
                      {t('thread.participantAll')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  {participantOptions.map(function (option) { return (<react_native_1.TouchableOpacity key={option.userId} style={[
                        styles.sortChip,
                        participantFilterUserId === option.userId && styles.sortChipActive,
                    ]} onPress={function () { return setParticipantFilterUserId(option.userId); }}>
                      <react_native_1.Text style={[
                        styles.sortChipText,
                        participantFilterUserId === option.userId && styles.sortChipTextActive,
                    ]}>
                        {"".concat(option.displayLabel, " (").concat(option.count, ")")}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>); })}
                </react_native_1.View>) : null}
              <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('thread.searchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} style={styles.searchInput} autoCapitalize="none" autoCorrect={false}/>
              <react_native_1.View style={styles.sortRow}>
                {([
                { key: 'time', label: t('thread.sortTime') },
                { key: 'author', label: t('thread.sortAuthor') },
                { key: 'reactions', label: t('thread.sortReactions') },
            ]).map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[styles.sortChip, sortField === option.key && styles.sortChipActive]} onPress={function () { return setSortField(option.key); }}>
                    <react_native_1.Text style={[styles.sortChipText, sortField === option.key && styles.sortChipTextActive]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>); })}
              </react_native_1.View>
              <react_native_1.View style={styles.sortRow}>
                {([
                {
                    key: 'oldest',
                    label: sortField === 'time'
                        ? t('settings.sortOldest')
                        : sortField === 'author'
                            ? t('settings.sortDesc')
                            : t('thread.sortFewestReactions'),
                },
                {
                    key: 'newest',
                    label: sortField === 'time'
                        ? t('settings.sortNewest')
                        : sortField === 'author'
                            ? t('settings.sortAsc')
                            : t('thread.sortMostReactions'),
                },
            ]).map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[styles.sortChip, sortOrder === option.key && styles.sortChipActive]} onPress={function () { return setSortOrder(option.key); }}>
                    <react_native_1.Text style={[styles.sortChipText, sortOrder === option.key && styles.sortChipTextActive]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>); })}
              </react_native_1.View>
              <react_native_1.Text style={styles.visibleCount}>
                {visibleReplies.length === mergedReplies.length
                ? t('thread.visibleAllReplies', { count: mergedReplies.length })
                : t('thread.visibleFilteredReplies', {
                    visible: visibleReplies.length,
                    total: mergedReplies.length,
                })}
              </react_native_1.Text>
              {firstUnreadVisibleReplyId ? (<react_native_1.TouchableOpacity style={styles.jumpUnreadButton} activeOpacity={0.8} onPress={handleJumpToFirstUnread}>
                  <react_native_1.Text style={styles.jumpUnreadButtonText}>
                    {t('thread.jumpToUnreadCount', { count: unreadVisibleReplyCount })}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {visibleReplies.length > 1 ? (<react_native_1.TouchableOpacity style={styles.jumpUnreadButton} activeOpacity={0.8} onPress={handleJumpToRoot}>
                  <react_native_1.Text style={styles.jumpUnreadButtonText}>{t('thread.jumpToRoot')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {visibleReplies.length > 1 ? (<react_native_1.TouchableOpacity style={styles.jumpUnreadButton} activeOpacity={0.8} onPress={handleJumpToLatestReply}>
                  <react_native_1.Text style={styles.jumpUnreadButtonText}>{t('thread.jumpToLatest')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {activeFilters.length > 0 ? (<react_native_1.View style={styles.activeFiltersRow}>
                  {activeFilters.map(function (filter) { return (<react_native_1.TouchableOpacity key={filter.key} style={styles.activeFilterChip} onPress={function () {
                        if (filter.key === 'search') {
                            setSearchQuery('');
                        }
                        else if (filter.key === 'mode') {
                            setFilterMode('all');
                        }
                        else if (filter.key === 'participant') {
                            setParticipantFilterUserId(null);
                        }
                        else {
                            setSortField('time');
                            setSortOrder('oldest');
                        }
                    }}>
                      <react_native_1.Text style={styles.activeFilterChipText}>{filter.label}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>); })}
                  <react_native_1.TouchableOpacity style={styles.clearFiltersChip} onPress={function () {
                    setSearchQuery('');
                    setFilterMode('all');
                    setParticipantFilterUserId(null);
                    setSortField('time');
                    setSortOrder('oldest');
                }}>
                    <react_native_1.Text style={styles.clearFiltersChipText}>{t('thread.clearFilters')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>) : null}
            </react_native_1.View>} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
              <EmptyState_1.default icon={"\uD83E\uDDF5"} title={deferredSearchQuery
                ? t('thread.noSearchResults')
                : filterMode === 'unread'
                    ? t('thread.noUnreadReplies')
                    : filterMode === 'mine'
                        ? t('thread.noMineReplies')
                        : filterMode === 'starter'
                            ? t('thread.noStarterReplies')
                            : filterMode === 'edited'
                                ? t('thread.noEditedReplies')
                                : filterMode === 'images'
                                    ? t('thread.noImageReplies')
                                    : filterMode === 'files'
                                        ? t('thread.noFileReplies')
                                        : filterMode === 'reactions'
                                            ? t('thread.noReactionReplies')
                                            : participantFilterUserId
                                                ? t('thread.noParticipantReplies')
                                                : filterMode === 'attachments'
                                                    ? t('thread.noAttachmentReplies')
                                                    : t('thread.empty')} subtitle={deferredSearchQuery
                ? t('thread.noSearchResultsBody')
                : filterMode === 'unread'
                    ? t('thread.noUnreadRepliesBody')
                    : filterMode === 'mine'
                        ? t('thread.noMineRepliesBody')
                        : filterMode === 'starter'
                            ? t('thread.noStarterRepliesBody')
                            : filterMode === 'edited'
                                ? t('thread.noEditedRepliesBody')
                                : filterMode === 'images'
                                    ? t('thread.noImageRepliesBody')
                                    : filterMode === 'files'
                                        ? t('thread.noFileRepliesBody')
                                        : filterMode === 'reactions'
                                            ? t('thread.noReactionRepliesBody')
                                            : participantFilterUserId
                                                ? t('thread.noParticipantRepliesBody')
                                                : filterMode === 'attachments'
                                                    ? t('thread.noAttachmentRepliesBody')
                                                    : t('thread.emptyBody')}/>
            </react_native_1.View>} renderItem={function (_a) {
            var _b, _c, _d, _e, _f, _g;
            var item = _a.item, index = _a.index;
            return (<react_native_1.View>
              {index === 0 ||
                    new Date(visibleReplies[index - 1].createdAt).toDateString() !==
                        new Date(item.createdAt).toDateString() ? (<react_native_1.View style={styles.dateDividerRow}>
                  <react_native_1.View style={styles.dateDividerLine}/>
                  <react_native_1.Text style={styles.dateDividerText}>
                    {formatThreadDateDivider(item.createdAt, locale, t)}
                  </react_native_1.Text>
                  <react_native_1.View style={styles.dateDividerLine}/>
                </react_native_1.View>) : null}
              {item.id === firstUnreadVisibleReplyId ? (<react_native_1.View style={styles.unreadDividerRow}>
                  <react_native_1.View style={styles.unreadDividerLine}/>
                  <react_native_1.Text style={styles.unreadDividerText}>{t('thread.unreadDivider')}</react_native_1.Text>
                  <react_native_1.View style={styles.unreadDividerLine}/>
                </react_native_1.View>) : null}
              <react_native_1.TouchableOpacity activeOpacity={0.9} onPress={function () {
                    return setSelectedMessageId(function (current) { return (current === item.id ? null : item.id); });
                }} onLongPress={function () { return setActionMessage(item); }} delayLongPress={400}>
                <react_native_1.View style={item.id === focusMessageId || item.id === jumpHighlightMessageId
                    ? styles.focusedMessageWrap
                    : undefined}>
                  {item.authorUserId === starterUserId ? (<react_native_1.View style={[
                        styles.replyBadgeRow,
                        isOwnMessage(item, currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) && styles.replyBadgeRowOwn,
                    ]}>
                      <react_native_1.Text style={styles.replyBadgeText}>{t('thread.starterBadge')}</react_native_1.Text>
                    </react_native_1.View>) : null}
                  <MessageBubble_1.default authorName={(_c = (_b = item.author) === null || _b === void 0 ? void 0 : _b.displayName) !== null && _c !== void 0 ? _c : t('common.unknown')} authorAvatarUrl={(_e = (_d = item.author) === null || _d === void 0 ? void 0 : _d.avatarUrl) !== null && _e !== void 0 ? _e : null} body={(0, shared_1.shouldHideAttachmentBody)(item.bodyPlaintext || item.bodyMarkdown, (_f = item.attachments) !== null && _f !== void 0 ? _f : [])
                    ? ''
                    : item.bodyPlaintext} translatedBody={translatedBodies[item.id]} translatedLabel={translatedBodies[item.id] ? t('message.translated') : undefined} time={new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })} isOwn={item.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)} isEdited={item.isEdited} editedLabel={t('message.edited')} reactions={((_g = reactionsByMessageId[item.id]) !== null && _g !== void 0 ? _g : []).map(function (reaction) { return ({
                    emoji: reaction.emoji,
                    count: reaction.count,
                    reactedByMe: reaction.users.some(function (user) { return user.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); }),
                }); })} onPressReaction={function (emoji) {
                    void toggleReaction(item.id, emoji);
                }} onPressAddReaction={function () { return setActionMessage(item); }} onPressMore={function () { return setActionMessage(item); }} showAvatar={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId} showAuthorName={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId} startsGroup={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId} endsGroup={index === visibleReplies.length - 1 ||
                    visibleReplies[index + 1].authorUserId !== item.authorUserId} showActionChips={selectedMessageId === item.id}/>
                  {item.attachments && item.attachments.length > 0
                    ? renderAttachments(item.attachments, isOwnMessage(item, currentUser === null || currentUser === void 0 ? void 0 : currentUser.id))
                    : null}
                </react_native_1.View>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>);
        }}/>

        {pendingAttachment && (<react_native_1.View style={styles.attachmentPreview}>
            {(0, shared_1.isImageAttachmentMimeType)(pendingAttachment.mimeType, pendingAttachment.name) ? (<>
                <react_native_1.Image source={{ uri: pendingAttachment.uri }} style={styles.previewImage} resizeMode="cover"/>
                <react_native_1.View style={styles.previewMeta}>
                  <react_native_1.View style={styles.previewBadgeRow}>
                    <react_native_1.Text style={styles.previewBadge}>
                      {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.previewFileName} numberOfLines={1}>
                    {pendingAttachment.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.previewFileMeta}>
                    {formatFileSize(pendingAttachment.size)}
                  </react_native_1.Text>
                </react_native_1.View>
              </>) : (<>
                <react_native_1.View style={styles.previewFileIconWrap}>
                  <react_native_1.Text style={styles.previewFileIconLabel}>
                    {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.previewMeta}>
                  <react_native_1.View style={styles.previewBadgeRow}>
                    <react_native_1.Text style={styles.previewBadge}>
                      {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.previewFileName} numberOfLines={1}>
                    {pendingAttachment.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.previewFileMeta}>
                    {formatFileSize(pendingAttachment.size)}
                  </react_native_1.Text>
                </react_native_1.View>
              </>)}
            <react_native_1.TouchableOpacity style={styles.removeAttachment} onPress={function () { return setPendingAttachment(null); }}>
              <react_native_1.Text style={styles.removeAttachmentText}>{t('channel.remove')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>)}

        {uploadProgress !== null && (<react_native_1.View style={styles.progressBar}>
            <react_native_1.View style={[styles.progressFill, { width: "".concat(Math.round(uploadProgress * 100), "%") }]}/>
          </react_native_1.View>)}

        {showAttachMenu && (<react_native_1.View style={styles.attachMenu}>
            <react_native_1.TouchableOpacity style={styles.attachMenuItem} onPress={handlePickImage}>
              <react_native_1.Text style={styles.attachMenuText}>{t('channel.photoVideo')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={styles.attachMenuItem} onPress={handleTakePhoto}>
              <react_native_1.Text style={styles.attachMenuText}>{t('channel.camera')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={styles.attachMenuItem} onPress={handlePickDocument}>
              <react_native_1.Text style={styles.attachMenuText}>{t('channel.document')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>)}

        {((_5 = threadQuery.data) === null || _5 === void 0 ? void 0 : _5.thread.isLocked) ? (<react_native_1.View style={styles.lockedBanner}>
            <react_native_1.Text style={styles.lockedText}>{t('thread.locked')}</react_native_1.Text>
          </react_native_1.View>) : !canPostReply ? (<react_native_1.View style={styles.lockedBanner}>
            <react_native_1.Text style={styles.lockedText}>{t('channel.readOnly')}</react_native_1.Text>
          </react_native_1.View>) : (<MessageComposer_1.default placeholder={editingMessage ? t('message.editPlaceholder') : t('thread.replyPlaceholder')} sendLabel={editingMessage ? t('common.save') : t('message.send')} sendingLabel={editingMessage ? t('common.save') : t('thread.replying')} isSending={sendMutation.isPending} onSend={handleSend} onPressAdd={editingMessage || !canUploadAttachment ? undefined : handleToggleAttachMenu} allowEmptySubmit={!!pendingAttachment} draftText={(_7 = (_6 = editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.bodyMarkdown) !== null && _6 !== void 0 ? _6 : editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.bodyPlaintext) !== null && _7 !== void 0 ? _7 : ''} draftKey={(_8 = editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.id) !== null && _8 !== void 0 ? _8 : null}/>)}
        {actionMessage ? (<MessageActionSheet_1.default message={actionMessage} isOwn={actionMessage.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)} onEdit={actionMessage.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) ? handleEdit : undefined} onTranslate={handleTranslate} onReport={actionMessage.authorUserId !== (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) ? handleReport : undefined} onReact={handleReact} onClose={function () { return setActionMessage(null); }} onDelete={handleDelete}/>) : null}
        <AttachmentLightbox_1.default attachments={(_9 = previewGallery === null || previewGallery === void 0 ? void 0 : previewGallery.attachments) !== null && _9 !== void 0 ? _9 : []} currentIndex={(_10 = previewGallery === null || previewGallery === void 0 ? void 0 : previewGallery.index) !== null && _10 !== void 0 ? _10 : 0} authToken={authToken} isSharing={openingAttachmentId === ((_11 = previewGallery === null || previewGallery === void 0 ? void 0 : previewGallery.attachments[previewGallery.index]) === null || _11 === void 0 ? void 0 : _11.id)} closeLabel={t('common.cancel')} shareLabel={t('channel.shareAttachment')} sharingLabel={t('channel.openingAttachment')} previousLabel={t('lightbox.previous')} nextLabel={t('lightbox.next')} onClose={function () { return setPreviewGallery(null); }} onNavigate={function (index) {
            return setPreviewGallery(function (current) { return (current ? __assign(__assign({}, current), { index: index }) : current); });
        }} onShare={function () {
            var attachment = previewGallery === null || previewGallery === void 0 ? void 0 : previewGallery.attachments[previewGallery.index];
            if (!attachment) {
                return;
            }
            void handleShareAttachment(attachment);
        }}/>
      </react_native_safe_area_context_1.SafeAreaView>
    </react_native_1.KeyboardAvoidingView>);
}
function isOwnMessage(message, currentUserId) {
    return message.authorUserId === currentUserId;
}
function formatFileSize(bytes) {
    if (bytes < 1024)
        return "".concat(bytes, " B");
    if (bytes < 1024 * 1024)
        return "".concat((bytes / 1024).toFixed(1), " KB");
    return "".concat((bytes / (1024 * 1024)).toFixed(1), " MB");
}
function sanitizeAttachmentName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function getAttachmentKindLabel(fileName, mimeType) {
    var _a;
    if ((0, shared_1.isImageAttachmentMimeType)(mimeType, fileName))
        return 'IMG';
    var extension = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.trim();
    if (extension) {
        return extension.toUpperCase().slice(0, 6);
    }
    if (mimeType.includes('pdf'))
        return 'PDF';
    if (mimeType.includes('sheet') || mimeType.includes('excel'))
        return 'XLS';
    if (mimeType.includes('word') || mimeType.includes('document'))
        return 'DOC';
    if (mimeType.includes('zip') || mimeType.includes('compressed'))
        return 'ZIP';
    if (mimeType.includes('audio'))
        return 'AUDIO';
    if (mimeType.includes('video'))
        return 'VIDEO';
    return 'FILE';
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    content: {
        paddingBottom: theme_1.spacing.lg,
    },
    header: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.md,
        gap: theme_1.spacing.sm,
    },
    headerTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.md,
    },
    headerActionText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    headerActionDanger: {
        color: theme_1.colors.error,
    },
    rootWrap: {
        gap: theme_1.spacing.xs,
    },
    rootLabel: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    replyBadgeRow: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.xs,
    },
    replyBadgeRowOwn: {
        alignItems: 'flex-end',
    },
    replyBadgeText: {
        alignSelf: 'flex-start',
        color: theme_1.colors.primaryLight,
        backgroundColor: theme_1.colors.backgroundDark,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme_1.borderRadius.full,
        overflow: 'hidden',
    },
    unreadDividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.sm,
    },
    dateDividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
    },
    dateDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme_1.colors.borderLight,
    },
    dateDividerText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    unreadDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme_1.colors.primary + '44',
    },
    unreadDividerText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    attachments: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.xs,
    },
    focusedMessageWrap: {
        backgroundColor: theme_1.colors.primary + '14',
        borderRadius: theme_1.borderRadius.lg,
        marginHorizontal: theme_1.spacing.sm,
    },
    attachmentsOwn: {
        alignItems: 'flex-end',
    },
    attachmentImageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
        maxWidth: 284,
    },
    attachmentImageGridSingle: {
        maxWidth: 200,
    },
    attachmentImageGridOwn: {
        alignSelf: 'flex-end',
    },
    attachmentItem: {
        marginTop: theme_1.spacing.xs,
    },
    attachmentImageCard: {
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.surface,
        position: 'relative',
    },
    attachmentImageCardSingle: {
        width: 200,
        height: 150,
    },
    attachmentImageCardGrid: {
        width: 138,
        height: 138,
    },
    attachmentImageCardHero: {
        width: 284,
        height: 138,
    },
    attachmentImage: {
        width: '100%',
        height: '100%',
        backgroundColor: theme_1.colors.surface,
    },
    attachmentImageMoreOverlay: __assign(__assign({}, react_native_1.StyleSheet.absoluteFillObject), { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 15, 35, 0.5)' }),
    attachmentImageMoreText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '800',
    },
    attachmentFile: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: 16,
        padding: theme_1.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        gap: theme_1.spacing.sm,
        minWidth: 220,
    },
    attachmentFileIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.backgroundDark,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    attachmentFileIcon: {
        fontSize: 20,
    },
    attachmentFileContent: {
        flex: 1,
        minWidth: 0,
    },
    attachmentFileMetaRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    attachmentFileTypeBadge: {
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 3,
    },
    attachmentFileTypeBadgeText: {
        color: theme_1.colors.textSecondary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    attachmentFileName: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
        flex: 1,
    },
    attachmentSize: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.sm,
        marginTop: 2,
    },
    attachmentFileCta: {
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    attachmentFileCtaText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    replyCount: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
    },
    searchInput: {
        marginTop: theme_1.spacing.sm,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
    },
    sortRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        flexWrap: 'wrap',
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
    sortChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    sortChipTextActive: {
        color: theme_1.colors.white,
    },
    visibleCount: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
    },
    jumpUnreadButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primary + '18',
    },
    jumpUnreadButtonText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    activeFiltersRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        flexWrap: 'wrap',
    },
    activeFilterChip: {
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primary + '18',
    },
    activeFilterChipText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    clearFiltersChip: {
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
    },
    clearFiltersChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    loadOlderButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    loadOlderButtonText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    contextButton: {
        alignSelf: 'flex-start',
        marginTop: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    contextButtonText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    emptyWrap: {
        paddingTop: theme_1.spacing.xl,
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme_1.spacing.lg,
        marginTop: theme_1.spacing.xs,
        marginBottom: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        backgroundColor: theme_1.colors.talkPanel,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        borderRadius: theme_1.borderRadius.lg,
        gap: theme_1.spacing.sm,
    },
    previewImage: {
        width: 68,
        height: 68,
        borderRadius: theme_1.borderRadius.md,
    },
    previewMeta: {
        flex: 1,
        minWidth: 0,
    },
    previewBadgeRow: {
        flexDirection: 'row',
        marginBottom: theme_1.spacing.xs,
    },
    previewBadge: {
        color: '#f0d74c',
        backgroundColor: 'rgba(240, 215, 76, 0.14)',
        borderRadius: 999,
        overflow: 'hidden',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 3,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    previewFileName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    previewFileMeta: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 2,
    },
    previewFileIconWrap: {
        width: 68,
        height: 68,
        borderRadius: theme_1.borderRadius.md,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewFileIconLabel: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '800',
    },
    removeAttachment: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    removeAttachmentText: {
        color: theme_1.colors.error,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    progressBar: {
        height: 4,
        backgroundColor: theme_1.colors.borderLight,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme_1.colors.primary,
    },
    attachMenu: {
        backgroundColor: theme_1.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme_1.colors.borderLight,
    },
    attachMenuItem: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme_1.colors.borderLight,
    },
    attachMenuText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
    },
    missingRoot: {
        padding: theme_1.spacing.md,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
    },
    missingRootText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
    },
    lockedBanner: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    lockedText: {
        color: theme_1.colors.warning,
        fontSize: theme_1.fontSize.sm,
        textAlign: 'center',
        fontWeight: '600',
    },
});
