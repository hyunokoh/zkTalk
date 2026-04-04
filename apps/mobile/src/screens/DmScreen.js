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
exports.default = DmScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var expo_file_system_1 = require("expo-file-system");
var offline_queue_1 = require("../lib/offline-queue");
var useWebSocket_1 = require("../hooks/useWebSocket");
var crypto_1 = require("../lib/crypto");
var secure_storage_1 = require("../lib/secure-storage");
var file_picker_1 = require("../lib/file-picker");
var error_message_1 = require("../lib/error-message");
var storage_1 = require("../lib/storage");
var auth_1 = require("../stores/auth");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var MessageBubble_1 = require("../components/MessageBubble");
var AttachmentLightbox_1 = require("../components/AttachmentLightbox");
var MessageComposer_1 = require("../components/MessageComposer");
var MessageActionSheet_1 = require("../components/MessageActionSheet");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var theme_1 = require("../theme");
var native_1 = require("@react-navigation/native");
var shared_1 = require("@zktalk/shared");
function flattenDmMessage(row) {
    var _a, _b;
    if ('message' in row) {
        return __assign(__assign({}, row.message), { author: row.author, attachments: (_b = (_a = row.attachments) !== null && _a !== void 0 ? _a : row.message.attachments) !== null && _b !== void 0 ? _b : [] });
    }
    return row;
}
function hydrateDmMessage(message, sharedKey, t) {
    return __awaiter(this, void 0, void 0, function () {
        var plaintext, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!message.isEncrypted) {
                        return [2 /*return*/, message];
                    }
                    if (!sharedKey || !message.encryptedPayload) {
                        return [2 /*return*/, __assign(__assign({}, message), { bodyPlaintext: t('dm.encryptedMessagePlaceholder') })];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, crypto_1.decryptMessage)(message.encryptedPayload, sharedKey)];
                case 2:
                    plaintext = _b.sent();
                    return [2 /*return*/, __assign(__assign({}, message), { bodyPlaintext: plaintext })];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, __assign(__assign({}, message), { bodyPlaintext: t('dm.decryptFailed') })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function DmScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var route = _a.route, navigation = _a.navigation;
    var _l = route.params, conversationId = _l.conversationId, _m = _l.userId, userId = _m === void 0 ? '' : _m, _o = _l.displayName, displayName = _o === void 0 ? '' : _o;
    var _p = (0, i18n_1.useTranslation)(), t = _p.t, locale = _p.locale;
    var _q = (0, react_1.useState)([]), pendingMessages = _q[0], setPendingMessages = _q[1];
    var _r = (0, react_1.useState)(null), pendingAttachment = _r[0], setPendingAttachment = _r[1];
    var _s = (0, react_1.useState)(false), showAttachMenu = _s[0], setShowAttachMenu = _s[1];
    var _t = (0, react_1.useState)(false), e2eeEnabled = _t[0], setE2eeEnabled = _t[1];
    var _u = (0, react_1.useState)(null), sharedKey = _u[0], setSharedKey = _u[1];
    var _v = (0, react_1.useState)(null), editingMessage = _v[0], setEditingMessage = _v[1];
    var _w = (0, react_1.useState)(null), actionMessage = _w[0], setActionMessage = _w[1];
    var _x = (0, react_1.useState)({}), translatedBodies = _x[0], setTranslatedBodies = _x[1];
    var _y = (0, react_1.useState)(null), selectedMessageId = _y[0], setSelectedMessageId = _y[1];
    var _z = (0, react_1.useState)(false), showPromoteModal = _z[0], setShowPromoteModal = _z[1];
    var _0 = (0, react_1.useState)(null), errorDialog = _0[0], setErrorDialog = _0[1];
    var _1 = (0, react_1.useState)(null), promotedConflictTarget = _1[0], setPromotedConflictTarget = _1[1];
    var _2 = (0, react_1.useState)(displayName || t('dm.groupConversation')), promotionCommunityName = _2[0], setPromotionCommunityName = _2[1];
    var _3 = (0, react_1.useState)('general'), promotionChannelName = _3[0], setPromotionChannelName = _3[1];
    var _4 = (0, react_1.useState)(null), authToken = _4[0], setAuthToken = _4[1];
    var _5 = (0, react_1.useState)(null), openingAttachmentId = _5[0], setOpeningAttachmentId = _5[1];
    var _6 = (0, react_1.useState)(null), previewGallery = _6[0], setPreviewGallery = _6[1];
    var devComposeInFlightRef = (0, react_1.useRef)(false);
    var lastMarkedReadMessageIdRef = (0, react_1.useRef)(null);
    var dmRefreshTimeoutRef = (0, react_1.useRef)(null);
    var queryClient = (0, react_query_1.useQueryClient)();
    var rootNavigation = (0, native_1.useNavigation)();
    var currentUser = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var isFocused = (0, native_1.useIsFocused)();
    var wsStatus = (0, useWebSocket_1.useWebSocketStatus)();
    var shouldPollMessages = wsStatus !== 'connected';
    var endpoint = "/api/dm/conversations/".concat(conversationId, "/messages");
    var dmMessagesQueryKey = ['dm-messages', conversationId];
    (0, react_1.useEffect)(function () {
        (0, storage_1.getToken)()
            .then(setAuthToken)
            .catch(function () { return setAuthToken(null); });
    }, []);
    // WebSocket subscription for real-time DM updates
    var _6 = (0, useWebSocket_1.useDmSubscription)(conversationId), queuedEventCount = _6.queuedEventCount, consumeEvents = _6.consumeEvents;
    var scheduleDmRefresh = (0, react_1.useCallback)(function (delayMs) {
        if (delayMs === void 0) { delayMs = 1200; }
        if (dmRefreshTimeoutRef.current) {
            clearTimeout(dmRefreshTimeoutRef.current);
        }
        dmRefreshTimeoutRef.current = setTimeout(function () {
            dmRefreshTimeoutRef.current = null;
            void queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
        }, delayMs);
    }, [dmMessagesQueryKey, queryClient]);
    // Initialize E2EE if both parties have public keys
    (0, react_1.useEffect)(function () {
        var initE2ee = function () { return __awaiter(_this, void 0, void 0, function () {
            var otherUser, keyPair, derived, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!userId || !(0, crypto_1.isE2eeSupported)()) {
                            setSharedKey(null);
                            setE2eeEnabled(false);
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        // Ensure we have a key pair
                        return [4 /*yield*/, (0, crypto_1.ensureKeyPair)()];
                    case 2:
                        // Ensure we have a key pair
                        _b.sent();
                        return [4 /*yield*/, (0, api_1.api)("/api/users/".concat(userId, "/keys"))];
                    case 3:
                        otherUser = _b.sent();
                        if (!otherUser.publicKey) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, secure_storage_1.getE2eeKeyPair)()];
                    case 4:
                        keyPair = _b.sent();
                        if (!keyPair) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, crypto_1.deriveSharedKey)(keyPair.privateKey, otherUser.publicKey)];
                    case 5:
                        derived = _b.sent();
                        setSharedKey(derived);
                        setE2eeEnabled(true);
                        return [2 /*return*/];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        _a = _b.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        setSharedKey(null);
                        setE2eeEnabled(false);
                        return [2 /*return*/];
                }
            });
        }); };
        initE2ee();
    }, [userId]);
    (0, react_1.useEffect)(function () {
        if (!sharedKey)
            return;
        queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
    }, [sharedKey, queryClient, conversationId]);
    var _7 = (0, react_query_1.useQuery)({
        queryKey: dmMessagesQueryKey,
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result, messages, hydratedMessages;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)(endpoint)];
                    case 1:
                        result = _b.sent();
                        messages = result.messages.map(flattenDmMessage);
                        return [4 /*yield*/, Promise.all(messages.map(function (message) { return hydrateDmMessage(message, sharedKey, t); }))];
                    case 2:
                        hydratedMessages = _b.sent();
                        return [2 /*return*/, {
                                messages: hydratedMessages,
                                unreadCounts: (_a = result.unreadCounts) !== null && _a !== void 0 ? _a : {},
                            }];
                }
            });
        }); },
        // Slower polling with WS fallback
        refetchInterval: shouldPollMessages ? 30000 : false,
    }), data = _7.data, isLoading = _7.isLoading, refetch = _7.refetch, isRefetching = _7.isRefetching;
    var loadConversationDetail = (0, react_1.useCallback)(function () { return (0, api_1.api)("/api/dm/conversations/".concat(conversationId)); }, [conversationId]);
    var conversationDetail = (0, react_query_1.useQuery)({
        queryKey: ['dm-conversation', conversationId],
        queryFn: loadConversationDetail,
    }).data;
    var promotedTarget = (conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.promotedCommunity) && (conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.promotedChannel)
        ? {
            community: conversationDetail.promotedCommunity,
            channel: conversationDetail.promotedChannel,
        }
        : null;
    var unreadCounts = (_b = data === null || data === void 0 ? void 0 : data.unreadCounts) !== null && _b !== void 0 ? _b : {};
    var latestVisibleMessageId = (_d = (_c = data === null || data === void 0 ? void 0 : data.messages[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
    (0, react_1.useEffect)(function () {
        return function () {
            if (dmRefreshTimeoutRef.current) {
                clearTimeout(dmRefreshTimeoutRef.current);
            }
        };
    }, []);
    (0, react_1.useEffect)(function () {
        if (!promotedTarget) {
            return;
        }
        void (0, offline_queue_1.dequeueMessagesByEndpoint)(endpoint);
        setPendingMessages([]);
        setEditingMessage(null);
        setActionMessage(null);
        setShowPromoteModal(false);
        setErrorDialog(null);
        setPromotedConflictTarget(null);
    }, [endpoint, promotedTarget]);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(function () {
        if (!latestVisibleMessageId) {
            return undefined;
        }
        if (lastMarkedReadMessageIdRef.current === latestVisibleMessageId) {
            return undefined;
        }
        var cancelled = false;
        var timeout = setTimeout(function () {
            void (function () { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, api_1.api)("/api/dm/conversations/".concat(conversationId, "/read"), {
                                    method: 'POST',
                                    body: { messageId: latestVisibleMessageId },
                                })];
                        case 1:
                            _b.sent();
                            if (cancelled) {
                                return [2 /*return*/];
                            }
                            lastMarkedReadMessageIdRef.current = latestVisibleMessageId;
                            void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); })();
        }, 250);
        return function () {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [conversationId, latestVisibleMessageId, queryClient]));
    var navigateToPromotedCommunity = (0, react_1.useCallback)(function (target) {
        if (!target) {
            return;
        }
        rootNavigation.navigate('Main', {
            screen: 'HomeTab',
            params: {
                screen: 'ChannelScreen',
                params: {
                    channelId: target.channel.id,
                    channelName: target.channel.name,
                    communityId: target.community.id,
                },
            },
        });
    }, [rootNavigation]);
    var handlePromotedReadOnlyError = (0, react_1.useCallback)(function (error) { return __awaiter(_this, void 0, void 0, function () {
        var refreshed, nextTarget;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(error instanceof api_1.ApiError) || error.code !== 'DM_PROMOTED_READ_ONLY') {
                        setErrorDialog({
                            title: t('common.error'),
                            message: (0, error_message_1.getUserFacingErrorMessage)(error, t),
                        });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, queryClient.fetchQuery({
                            queryKey: ['dm-conversation', conversationId],
                            queryFn: loadConversationDetail,
                        })];
                case 1:
                    refreshed = _a.sent();
                    queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                    nextTarget = refreshed.promotedCommunity && refreshed.promotedChannel
                        ? {
                            community: refreshed.promotedCommunity,
                            channel: refreshed.promotedChannel,
                        }
                        : null;
                    if (!nextTarget) {
                        setErrorDialog({
                            title: t('common.error'),
                            message: (0, error_message_1.getUserFacingErrorMessage)(error, t),
                        });
                        return [2 /*return*/];
                    }
                    setPromotedConflictTarget(nextTarget);
                    return [2 /*return*/];
            }
        });
    }); }, [conversationId, loadConversationDetail, navigateToPromotedCommunity, queryClient, t]);
    // Handle real-time WebSocket DM events
    (0, react_1.useEffect)(function () {
        if (queuedEventCount === 0)
            return;
        var processEvents = function () { return __awaiter(_this, void 0, void 0, function () {
            var newEvents, _loop_1, _i, newEvents_1, event_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newEvents = consumeEvents();
                        _loop_1 = function (event_1) {
                            var _b, payload_1, payload_2, deletedId_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _b = event_1.type;
                                        switch (_b) {
                                            case 'dm.message_created': return [3 /*break*/, 1];
                                            case 'dm.message_updated': return [3 /*break*/, 3];
                                            case 'dm.message_deleted': return [3 /*break*/, 5];
                                            case 'dm.conversation_updated': return [3 /*break*/, 6];
                                        }
                                        return [3 /*break*/, 7];
                                    case 1: return [4 /*yield*/, hydrateDmMessage(flattenDmMessage(event_1.payload), sharedKey, t)];
                                    case 2:
                                        payload_1 = _c.sent();
                                        queryClient.setQueryData(dmMessagesQueryKey, function (old) {
                                            var _a;
                                            if (!old) {
                                                return { messages: [payload_1], unreadCounts: {} };
                                            }
                                            if (old.messages.some(function (m) { return m.id === payload_1.id; }))
                                                return old;
                                            return {
                                                messages: __spreadArray([payload_1], old.messages, true),
                                                unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
                                            };
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                                        scheduleDmRefresh();
                                        return [3 /*break*/, 7];
                                    case 3: return [4 /*yield*/, hydrateDmMessage(flattenDmMessage(event_1.payload), sharedKey, t)];
                                    case 4:
                                        payload_2 = _c.sent();
                                        queryClient.setQueryData(dmMessagesQueryKey, function (old) {
                                            var _a;
                                            if (!old)
                                                return old;
                                            return {
                                                messages: old.messages.map(function (message) {
                                                    return message.id === payload_2.id ? __assign(__assign({}, message), payload_2) : message;
                                                }),
                                                unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
                                            };
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                                        return [3 /*break*/, 7];
                                    case 5:
                                        {
                                            deletedId_1 = event_1.payload.messageId;
                                            if (!deletedId_1)
                                                return [3 /*break*/, 7];
                                            queryClient.setQueryData(dmMessagesQueryKey, function (old) {
                                                var _a;
                                                if (!old)
                                                    return old;
                                                return {
                                                    messages: old.messages.filter(function (message) { return message.id !== deletedId_1; }),
                                                    unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
                                                };
                                            });
                                            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                                            return [3 /*break*/, 7];
                                        }
                                        _c.label = 6;
                                    case 6:
                                        {
                                            queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
                                            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                                            return [3 /*break*/, 7];
                                        }
                                        _c.label = 7;
                                    case 7: return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, newEvents_1 = newEvents;
                        _a.label = 1;
                    case 1:
                        if (!(_i < newEvents_1.length)) return [3 /*break*/, 4];
                        event_1 = newEvents_1[_i];
                        return [5 /*yield**/, _loop_1(event_1)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        void processEvents();
    }, [
        conversationId,
        consumeEvents,
        dmMessagesQueryKey,
        queuedEventCount,
        queryClient,
        scheduleDmRefresh,
        sharedKey,
        t,
    ]);
    // Check for pending offline messages on mount
    (0, react_1.useEffect)(function () {
        var checkPending = function () { return __awaiter(_this, void 0, void 0, function () {
            var queued, dmPending;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, offline_queue_1.getPendingMessages)()];
                    case 1:
                        queued = _a.sent();
                        dmPending = queued.filter(function (m) { return m.endpoint === endpoint; });
                        setPendingMessages(dmPending.map(function (m) {
                            var _a;
                            return ({
                                id: m.id,
                                body: (_a = m.body.bodyMarkdown) !== null && _a !== void 0 ? _a : '',
                                createdAt: m.createdAt,
                            });
                        }));
                        return [2 /*return*/];
                }
            });
        }); };
        checkPending();
    }, [endpoint]);
    var sendMutation = (0, react_query_1.useMutation)({
        mutationFn: function (body) { return __awaiter(_this, void 0, void 0, function () {
            var messageBody, encrypted, attachmentData, pendingAttachmentName, fallbackBody, messageBody, encrypted, _a, result, err_1, shouldQueue, fallbackBody_1, queued_1;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!editingMessage) return [3 /*break*/, 4];
                        messageBody = { bodyMarkdown: body };
                        if (!editingMessage.isEncrypted) return [3 /*break*/, 2];
                        if (!sharedKey) {
                            throw new Error(t('dm.editEncryptedUnavailable'));
                        }
                        return [4 /*yield*/, (0, crypto_1.encryptMessage)(body, sharedKey)];
                    case 1:
                        encrypted = _d.sent();
                        messageBody = {
                            bodyMarkdown: '[encrypted]',
                            isEncrypted: true,
                            encryptedPayload: encrypted,
                        };
                        _d.label = 2;
                    case 2: return [4 /*yield*/, (0, api_1.api)("/api/dm/messages/".concat(editingMessage.id), {
                            method: 'PATCH',
                            body: messageBody,
                        })];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, { queued: false }];
                    case 4:
                        attachmentData = null;
                        pendingAttachmentName = (_b = pendingAttachment === null || pendingAttachment === void 0 ? void 0 : pendingAttachment.name) !== null && _b !== void 0 ? _b : null;
                        if (!pendingAttachment) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, file_picker_1.uploadFile)(pendingAttachment, { conversationId: conversationId })];
                    case 5:
                        attachmentData = _d.sent();
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 14, , 16]);
                        fallbackBody = body.trim().length > 0
                            ? body
                            : pendingAttachment
                                && (0, shared_1.isImageAttachmentMimeType)(pendingAttachment.mimeType, pendingAttachment.name)
                                ? ' '
                                : pendingAttachmentName || ' ';
                        messageBody = { bodyMarkdown: fallbackBody };
                        if (!(e2eeEnabled && sharedKey)) return [3 /*break*/, 10];
                        _d.label = 7;
                    case 7:
                        _d.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, (0, crypto_1.encryptMessage)(fallbackBody, sharedKey)];
                    case 8:
                        encrypted = _d.sent();
                        messageBody = {
                            bodyMarkdown: '[encrypted]',
                            isEncrypted: true,
                            encryptedPayload: encrypted,
                        };
                        return [3 /*break*/, 10];
                    case 9:
                        _a = _d.sent();
                        // Fall back to unencrypted if encryption fails
                        messageBody = { bodyMarkdown: fallbackBody };
                        return [3 /*break*/, 10];
                    case 10: return [4 /*yield*/, (0, api_1.api)(endpoint, {
                            method: 'POST',
                            body: messageBody,
                            headers: {
                                'X-Request-Id': (0, api_1.createRequestId)(),
                            },
                        })];
                    case 11:
                        result = _d.sent();
                        if (!(attachmentData && ((_c = result.message) === null || _c === void 0 ? void 0 : _c.id))) return [3 /*break*/, 13];
                        return [4 /*yield*/, (0, file_picker_1.attachToDmMessage)(result.message.id, attachmentData)];
                    case 12:
                        _d.sent();
                        _d.label = 13;
                    case 13: return [2 /*return*/, { queued: false }];
                    case 14:
                        err_1 = _d.sent();
                        shouldQueue = !(err_1 instanceof api_1.ApiError) || err_1.status === 0;
                        if (!shouldQueue) {
                            throw err_1;
                        }
                        if (pendingAttachment) {
                            throw err_1;
                        }
                        fallbackBody_1 = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
                        return [4 /*yield*/, (0, offline_queue_1.enqueueMessage)(endpoint, { bodyMarkdown: fallbackBody_1 })];
                    case 15:
                        queued_1 = _d.sent();
                        setPendingMessages(function (prev) { return __spreadArray(__spreadArray([], prev, true), [
                            { id: queued_1.id, body: fallbackBody_1, createdAt: queued_1.createdAt },
                        ], false); });
                        return [2 /*return*/, { queued: true }];
                    case 16: return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function (result) {
            if (!result.queued && shouldPollMessages) {
                void queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
                void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            }
            else if (result.queued) {
                react_native_1.Alert.alert(t('common.offline'), t('common.offlineQueue'));
            }
            setPendingAttachment(null);
            setEditingMessage(null);
        },
    });
    var promoteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var communityName = _a.communityName, channelName = _a.channelName;
            return (0, api_1.api)("/api/dm/conversations/".concat(conversationId, "/promote"), {
                method: 'POST',
                body: {
                    communityName: communityName,
                    channelName: channelName,
                },
            });
        },
        onSuccess: function (result) {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
            queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
            setShowPromoteModal(false);
            navigateToPromotedCommunity({
                community: result.community,
                channel: result.channel,
            });
        },
    });
    var callTargetMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)("/api/dm/conversations/".concat(conversationId, "/call-target"), {
                method: 'POST',
            });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
            queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
        },
    });
    // Stable callback for MessageComposer
    var handleSend = (0, react_1.useCallback)(function (text) { return __awaiter(_this, void 0, void 0, function () {
        var error_1, isOffline;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (sendMutation.isPending)
                        return [2 /*return*/, false];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 6]);
                    return [4 /*yield*/, sendMutation.mutateAsync(text)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    isOffline = error_1 instanceof api_1.ApiError && error_1.status === 0;
                    if (!(!isOffline && error_1 instanceof api_1.ApiError && error_1.code === 'DM_PROMOTED_READ_ONLY')) return [3 /*break*/, 5];
                    return [4 /*yield*/, handlePromotedReadOnlyError(error_1)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, false];
                case 5:
                    setErrorDialog({
                        title: t('common.error'),
                        message: pendingAttachment && isOffline
                            ? t('channel.attachmentNeedsConnection')
                            : (0, error_message_1.getUserFacingErrorMessage)(error_1, t, {
                                rateLimitedKey: pendingAttachment
                                    ? 'message.attachmentRateLimited'
                                    : 'common.rateLimited',
                            }),
                    });
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [handlePromotedReadOnlyError, pendingAttachment, sendMutation, t]);
    var handlePickImage = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, file_picker_1.pickImage)()];
                case 1:
                    file = _a.sent();
                    if (file) {
                        setPendingAttachment(file);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_2 instanceof Error ? error_2.message : t('common.errorOccurred'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handleTakePhoto = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, file_picker_1.takePhoto)()];
                case 1:
                    file = _a.sent();
                    if (file) {
                        setPendingAttachment(file);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_3 instanceof Error ? error_3.message : t('common.errorOccurred'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handlePickDocument = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setShowAttachMenu(false);
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, file_picker_1.pickDocument)()];
                case 1:
                    file = _a.sent();
                    if (file) {
                        setPendingAttachment(file);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_4 instanceof Error ? error_4.message : t('common.errorOccurred'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var handleAddAttachment = (0, react_1.useCallback)(function () {
        setShowAttachMenu(function (prev) { return !prev; });
    }, []);
    var handleShareAttachment = (0, react_1.useCallback)(function (attachment) { return __awaiter(_this, void 0, void 0, function () {
        var token, _a, attachmentDirectory, targetFile, downloadedFile, error_5;
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
                    error_5 = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), error_5 instanceof Error ? error_5.message : t('channel.openAttachmentFailed'));
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
    var renderAttachments = (0, react_1.useCallback)(function (attachments) {
        var imageAttachments = attachments.filter(function (attachment) {
            return (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
        });
        var fileAttachments = attachments.filter(function (attachment) {
            return !(0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
        });
        return (<react_native_1.View style={styles.attachments}>
          {imageAttachments.length > 0 ? (<react_native_1.View style={styles.attachmentImageGrid}>
              {imageAttachments.slice(0, 4).map(function (attachment) { return (<react_native_1.TouchableOpacity key={attachment.id} style={styles.attachmentImageCard} activeOpacity={0.88} onPress={function () { return void handleOpenAttachment(attachment, attachments); }}>
                  <react_native_1.Image source={__assign({ uri: (0, file_picker_1.getAttachmentFileUrl)(attachment.id) }, (authToken ? { headers: { Authorization: "Bearer ".concat(authToken) } } : {}))} style={styles.attachmentImage} resizeMode="cover"/>
                </react_native_1.TouchableOpacity>); })}
            </react_native_1.View>) : null}
          {fileAttachments.map(function (attachment) { return (<react_native_1.TouchableOpacity key={attachment.id} style={styles.attachmentFile} activeOpacity={0.82} onPress={function () { return void handleOpenAttachment(attachment, attachments); }}>
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
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>);
    }, [authToken, handleOpenAttachment, openingAttachmentId, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled) {
            return;
        }
        var cancelled = false;
        function tryDevCompose() {
            return __awaiter(this, void 0, void 0, function () {
                var payload, sent;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (cancelled || devComposeInFlightRef.current) {
                                return [2 /*return*/];
                            }
                            devComposeInFlightRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-compose.json')];
                        case 1:
                            payload = _a.sent();
                            if (!payload || cancelled) {
                                devComposeInFlightRef.current = false;
                                return [2 /*return*/];
                            }
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 8, 9]);
                            if ((payload === null || payload === void 0 ? void 0 : payload.conversationId) !== conversationId) {
                                return [2 /*return*/];
                            }
                            if (!(typeof payload.body !== 'string' || payload.body.trim().length === 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-compose.json')];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                        case 4: return [4 /*yield*/, handleSend(payload.body)];
                        case 5:
                            sent = _a.sent();
                            if (!sent) return [3 /*break*/, 7];
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-compose.json')];
                        case 6:
                            _a.sent();
                            _a.label = 7;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            devComposeInFlightRef.current = false;
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevCompose();
        var interval = setInterval(function () {
            void tryDevCompose();
        }, 1000);
        return function () {
            cancelled = true;
            clearInterval(interval);
        };
    }, [conversationId, handleSend]);
    // Delete handler for action sheet
    var handleDelete = (0, react_1.useCallback)(function (message) {
        react_native_1.Alert.alert(t('message.delete'), t('message.deleteConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('message.delete'),
                style: 'destructive',
                onPress: function () {
                    (0, api_1.api)("/api/dm/messages/".concat(message.id), { method: 'DELETE' })
                        .then(function () {
                        queryClient.setQueryData(dmMessagesQueryKey, function (old) {
                            if (!old)
                                return old;
                            return {
                                messages: old.messages.filter(function (m) { return m.id !== message.id; }),
                            };
                        });
                        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                    })
                        .catch(function (error) {
                        void handlePromotedReadOnlyError(error);
                    });
                },
            },
        ]);
    }, [dmMessagesQueryKey, handlePromotedReadOnlyError, queryClient, t]);
    var handleEdit = (0, react_1.useCallback)(function () {
        if (!actionMessage)
            return;
        setEditingMessage(actionMessage);
        setActionMessage(null);
    }, [actionMessage]);
    var handleTranslate = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var existing, result_1, error_6;
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
                    error_6 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_6 instanceof Error ? error_6.message : t('message.translateFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [actionMessage, locale, t, translatedBodies]);
    var handlePromoteToCommunity = (0, react_1.useCallback)(function () {
        if (promotedTarget) {
            navigateToPromotedCommunity(promotedTarget);
            return;
        }
        setPromotionCommunityName(displayName || (conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.name) || t('dm.groupConversation'));
        setPromotionChannelName('general');
        setShowPromoteModal(true);
    }, [conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.name, displayName, navigateToPromotedCommunity, promotedTarget, t]);
    var submitPromoteToCommunity = (0, react_1.useCallback)(function () {
        var communityName = promotionCommunityName.trim();
        var channelName = promotionChannelName.trim();
        if (!communityName || !channelName) {
            return;
        }
        promoteMutation.mutate({
            communityName: communityName,
            channelName: channelName,
        }, {
            onError: function (error) {
                setErrorDialog({
                    title: t('dm.promoteTitle'),
                    message: error instanceof Error ? error.message : t('dm.promoteFailed'),
                });
            },
        });
    }, [promoteMutation, promotionChannelName, promotionCommunityName, t]);
    var handleStartCall = (0, react_1.useCallback)(function (startWithVideo) { return __awaiter(_this, void 0, void 0, function () {
        var result, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, callTargetMutation.mutateAsync()];
                case 1:
                    result = _a.sent();
                    rootNavigation.navigate('Main', {
                        screen: 'HomeTab',
                        params: {
                            screen: 'VoiceCallScreen',
                            params: {
                                channelId: result.voiceChannel.id,
                                channelName: result.voiceChannel.name,
                                communityId: result.community.id,
                                startWithVideo: startWithVideo,
                            },
                        },
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    setErrorDialog({
                        title: startWithVideo ? t('voice.videoCall') : t('voice.join'),
                        message: error_7 instanceof Error ? error_7.message : t('voice.joinFailed'),
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [callTargetMutation, rootNavigation, t]);
    (0, react_1.useLayoutEffect)(function () {
        var baseTitle = displayName || (conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.name) || t('dm.groupConversation');
        navigation.setOptions({
            title: promotedTarget ? "".concat(baseTitle, " \u00B7 ").concat(t('dm.historyBadge')) : baseTitle,
            headerRight: function () { return (<react_native_1.TouchableOpacity onPress={handlePromoteToCommunity} disabled={promoteMutation.isPending} style={styles.promoteButton}>
          {promoteMutation.isPending ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>) : (<react_native_1.Text style={styles.promoteButtonText}>
              {promotedTarget ? t('dm.goToCurrentChannelShort') : t('dm.promoteShort')}
            </react_native_1.Text>)}
        </react_native_1.TouchableOpacity>); },
        });
    }, [
        conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.name,
        displayName,
        handlePromoteToCommunity,
        navigation,
        promoteMutation.isPending,
        promotedTarget,
        t,
    ]);
    var messages = react_1.default.useMemo(function () {
        var _a;
        var seen = new Set();
        return ((_a = data === null || data === void 0 ? void 0 : data.messages) !== null && _a !== void 0 ? _a : []).filter(function (message) {
            if (seen.has(message.id)) {
                return false;
            }
            seen.add(message.id);
            return true;
        });
    }, [data === null || data === void 0 ? void 0 : data.messages]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('dm.loadingMessages')}/>;
    }
    return (<react_native_1.KeyboardAvoidingView testID="dm-screen" style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* E2EE status banner */}
      {!promotedTarget && e2eeEnabled && (<react_native_1.View style={styles.e2eeBanner}>
          <react_native_1.Text style={styles.e2eeText}>
            {t('dm.encrypted')}
          </react_native_1.Text>
        </react_native_1.View>)}

      <react_native_1.View style={styles.dmHeroWrap}>
        <react_native_1.View style={styles.dmHeroCard}>
          <react_native_1.Text style={styles.dmHeroEyebrow}>{t('dm.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.dmHeroTitle} testID="dm-screen-title">
            {displayName || (conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.name) || t('dm.groupConversation')}
          </react_native_1.Text>
          <react_native_1.Text style={styles.dmHeroBody}>{t('dm.listSubtitle')}</react_native_1.Text>
          <react_native_1.View style={styles.dmHeroMetaRow}>
            <react_native_1.View style={styles.dmHeroMetaBadge}>
              <react_native_1.Text style={styles.dmHeroMetaBadgeText}>
                {(conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.type) === 'group' ? t('dm.group') : t('dm.oneToOne')}
              </react_native_1.Text>
            </react_native_1.View>
            {(conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.conversation.type) === 'group' ? (<react_native_1.View style={styles.dmHeroMetaBadge}>
                <react_native_1.Text style={styles.dmHeroMetaBadgeText}>
                  {t('dm.groupMembers', {
                count: String((_e = conversationDetail === null || conversationDetail === void 0 ? void 0 : conversationDetail.participants.length) !== null && _e !== void 0 ? _e : 0),
            })}
                </react_native_1.Text>
              </react_native_1.View>) : null}
            {!promotedTarget && e2eeEnabled ? (<react_native_1.View style={styles.dmHeroMetaBadgeSuccess}>
                <react_native_1.Text style={styles.dmHeroMetaBadgeSuccessText}>{t('e2ee.badge')}</react_native_1.Text>
              </react_native_1.View>) : null}
            {promotedTarget ? (<react_native_1.View style={styles.historyBadge}>
                <react_native_1.Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</react_native_1.Text>
              </react_native_1.View>) : null}
          </react_native_1.View>
          <react_native_1.View style={styles.dmHeroActionRow}>
            <react_native_1.TouchableOpacity onPress={function () {
            void handleStartCall(false);
        }} activeOpacity={0.85} style={styles.dmHeroActionChip}>
              {callTargetMutation.isPending ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.textSecondary}/>) : (<react_native_1.Text style={styles.dmHeroActionChipText}>{t('voice.join')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={function () {
            void handleStartCall(true);
        }} activeOpacity={0.85} style={styles.dmHeroActionChip}>
              {callTargetMutation.isPending ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.textSecondary}/>) : (<react_native_1.Text style={styles.dmHeroActionChipText}>{t('voice.videoCall')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={handlePromoteToCommunity} activeOpacity={0.85} style={[
            styles.dmHeroActionChip,
            promotedTarget && styles.dmHeroActionChipPrimary,
        ]}>
              <react_native_1.Text style={[
            styles.dmHeroActionChipText,
            promotedTarget && styles.dmHeroActionChipPrimaryText,
        ]}>
                {promotedTarget ? t('dm.goToCurrentChannelShort') : t('dm.promoteShort')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {promotedTarget && (<react_native_1.View style={styles.promotedBannerWrap}>
          <react_native_1.View style={styles.promotedBanner}>
            <react_native_1.View style={styles.promotedBannerIcon}>
              <react_native_1.Text style={styles.promotedBannerIconText}>#</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.promotedBannerContent}>
              <react_native_1.View style={styles.historyBadge}>
                <react_native_1.Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.promotedBannerTitle}>
                {t('dm.promotedBannerTitle', { community: promotedTarget.community.name })}
              </react_native_1.Text>
              <react_native_1.Text style={styles.promotedBannerBody}>
                {t('dm.promotedBannerBody', { channel: promotedTarget.channel.name })}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.TouchableOpacity onPress={handlePromoteToCommunity} style={styles.promotedBannerAction}>
              <react_native_1.Text style={styles.promotedBannerActionText}>{t('dm.goToCurrentChannelShort')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>)}

      <react_native_1.FlatList testID="dm-message-list" data={messages} keyExtractor={function (item) { return item.id; }} inverted showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={react_native_1.Platform.OS === 'ios' ? 'interactive' : 'on-drag'} refreshControl={<react_native_1.RefreshControl refreshing={isFocused && isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var _b, _c, _d, _e, _f, _g, _h;
            var item = _a.item, index = _a.index;
            var isOwn = item.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id);
            var previousMessage = index > 0 ? messages[index - 1] : undefined;
            var nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            var startsGroup = (previousMessage === null || previousMessage === void 0 ? void 0 : previousMessage.authorUserId) !== item.authorUserId;
            var endsGroup = (nextMessage === null || nextMessage === void 0 ? void 0 : nextMessage.authorUserId) !== item.authorUserId;
            var itemAttachments = (_b = item.attachments) !== null && _b !== void 0 ? _b : [];
            var displayBody = (0, shared_1.shouldHideAttachmentBody)(item.bodyPlaintext || item.bodyMarkdown, itemAttachments)
                ? ''
                : item.bodyPlaintext;
            return (<react_native_1.TouchableOpacity activeOpacity={0.9} onPress={function () {
                    return setSelectedMessageId(function (current) { return (current === item.id ? null : item.id); });
                }} onLongPress={promotedTarget ? undefined : function () { return setActionMessage(item); }} delayLongPress={400}>
              <MessageBubble_1.default authorName={isOwn
                    ? ((_c = currentUser === null || currentUser === void 0 ? void 0 : currentUser.displayName) !== null && _c !== void 0 ? _c : t('common.you'))
                    : ((_f = (_e = (_d = item.author) === null || _d === void 0 ? void 0 : _d.displayName) !== null && _e !== void 0 ? _e : displayName) !== null && _f !== void 0 ? _f : t('common.unknown'))} authorAvatarUrl={(_h = (_g = item.author) === null || _g === void 0 ? void 0 : _g.avatarUrl) !== null && _h !== void 0 ? _h : null} body={displayBody} translatedBody={translatedBodies[item.id]} translatedLabel={translatedBodies[item.id] ? t('message.translated') : undefined} time={new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })} isOwn={isOwn} isEncrypted={item.isEncrypted} isEdited={item.isEdited} editedLabel={t('message.edited')} readCount={unreadCounts[item.id]} showAvatar={startsGroup} showAuthorName={startsGroup} startsGroup={startsGroup} endsGroup={endsGroup} showActionChips={selectedMessageId === item.id} onPressMore={promotedTarget ? undefined : function () { return setActionMessage(item); }}/>
              {itemAttachments.length > 0 ? renderAttachments(itemAttachments) : null}
            </react_native_1.TouchableOpacity>);
        }} ListHeaderComponent={pendingMessages.length > 0 && !promotedTarget ? (<react_native_1.View style={styles.pendingSection}>
              {pendingMessages.map(function (pm) { return (<react_native_1.View key={pm.id} style={styles.pendingItem}>
                  <react_native_1.Text style={styles.pendingBody}>{pm.body}</react_native_1.Text>
                  <react_native_1.Text style={styles.pendingLabel}>{t('channel.sendingMsg')}</react_native_1.Text>
                </react_native_1.View>); })}
            </react_native_1.View>) : null} ListEmptyComponent={<react_native_1.View style={{ transform: [{ scaleY: -1 }] }}>
            <EmptyState_1.default icon="mail" title={promotedTarget ? t('dm.promotedNoHistoryTitle') : t('dm.noMessages')} subtitle={promotedTarget
                ? t('dm.promotedNoHistoryBody', { channel: promotedTarget.channel.name })
                : t('dm.startWith', { name: displayName })}/>
          </react_native_1.View>} contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && pendingMessages.length === 0 ? styles.emptyContainer : null,
        ]}/>

      {editingMessage && !promotedTarget && (<react_native_1.View style={styles.pendingSection}>
          <react_native_1.View style={styles.pendingItem}>
            <react_native_1.View style={styles.pendingMeta}>
              <react_native_1.Text style={styles.pendingLabel}>{t('common.edit')}</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={function () { return setEditingMessage(null); }}>
                <react_native_1.Text style={styles.pendingLabel}>{t('common.cancel')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.Text style={styles.pendingBody} numberOfLines={1}>
              {editingMessage.bodyPlaintext}
            </react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>)}

      {pendingAttachment && !promotedTarget ? (<react_native_1.View testID="dm-pending-attachment" style={styles.pendingAttachmentPreview}>
          {(0, shared_1.isImageAttachmentMimeType)(pendingAttachment.mimeType, pendingAttachment.name) ? (<react_native_1.Image testID="dm-pending-attachment-image" source={{ uri: pendingAttachment.uri }} style={styles.pendingAttachmentImage} resizeMode="cover"/>) : (<react_native_1.View style={styles.pendingAttachmentFallback}>
              <react_native_1.Text style={styles.pendingAttachmentFallbackText}>
                {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
              </react_native_1.Text>
            </react_native_1.View>)}
          <react_native_1.View style={styles.pendingAttachmentInfo}>
            <react_native_1.Text testID="dm-pending-attachment-name" style={styles.pendingAttachmentName} numberOfLines={1}>
              {pendingAttachment.name}
            </react_native_1.Text>
            <react_native_1.Text style={styles.pendingAttachmentMeta}>
              {formatFileSize(pendingAttachment.size)}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity testID="dm-pending-attachment-remove" onPress={function () { return setPendingAttachment(null); }} style={styles.pendingAttachmentRemove}>
            <react_native_1.Text style={styles.pendingAttachmentRemoveText}>{'\u2715'}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : null}

      {showAttachMenu && !promotedTarget ? (<react_native_1.View testID="dm-attach-menu" style={styles.attachMenu}>
          <react_native_1.TouchableOpacity testID="dm-attach-menu-photo" style={styles.attachMenuItem} onPress={handlePickImage}>
            <react_native_1.Text style={styles.attachMenuText}>{t('channel.photoVideo')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity testID="dm-attach-menu-camera" style={styles.attachMenuItem} onPress={handleTakePhoto}>
            <react_native_1.Text style={styles.attachMenuText}>{t('channel.camera')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity testID="dm-attach-menu-document" style={styles.attachMenuItem} onPress={handlePickDocument}>
            <react_native_1.Text style={styles.attachMenuText}>{t('channel.document')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : null}

      {promotedTarget ? (<react_native_1.View style={styles.promotedComposer}>
          <react_native_1.View style={styles.promotedComposerContent}>
            <react_native_1.View style={styles.historyBadge}>
              <react_native_1.Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={styles.promotedComposerTitle}>{t('dm.promotedComposerTitle')}</react_native_1.Text>
            <react_native_1.Text style={styles.promotedComposerBody}>
              {t('dm.promotedComposerBody', { channel: promotedTarget.channel.name })}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity onPress={handlePromoteToCommunity} style={styles.promotedComposerButton}>
            <react_native_1.Text style={styles.promotedComposerButtonText}>{t('dm.goToCurrentChannelShort')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : (<MessageComposer_1.default placeholder={editingMessage
                ? t('message.editPlaceholder')
                : (e2eeEnabled ? t('dm.encryptedInput') : t('dm.messageInput'))} sendLabel={editingMessage ? t('common.save') : t('channel.send')} sendingLabel={t('channel.sending')} isSending={sendMutation.isPending} onSend={handleSend} onPressAdd={promotedTarget ? undefined : handleAddAttachment} allowEmptySubmit={!!pendingAttachment} draftText={(_f = editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.bodyPlaintext) !== null && _f !== void 0 ? _f : ''} draftKey={(_g = editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.id) !== null && _g !== void 0 ? _g : null} testIDPrefix="dm-composer"/>)}

      {previewGallery ? (<AttachmentLightbox_1.default attachments={previewGallery.attachments} currentIndex={previewGallery.index} authToken={authToken} isSharing={openingAttachmentId === ((_h = previewGallery.attachments[previewGallery.index]) === null || _h === void 0 ? void 0 : _h.id)} closeLabel={t('lightbox.close')} shareLabel={t('lightbox.share')} sharingLabel={t('lightbox.sharing')} previousLabel={t('lightbox.previous')} nextLabel={t('lightbox.next')} onClose={function () { return setPreviewGallery(null); }} onShare={function () {
                var attachment = previewGallery.attachments[previewGallery.index];
                if (!attachment) {
                    return;
                }
                void handleShareAttachment(attachment);
            }} onNavigate={function (index) {
                return setPreviewGallery(function (current) { return (current ? __assign(__assign({}, current), { index: index }) : current); });
            }}/>) : null}

      {/* KakaoTalk-style message action sheet */}
      {actionMessage && !promotedTarget && (<MessageActionSheet_1.default message={actionMessage} isOwn={actionMessage.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)} onEdit={actionMessage.authorUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) ? handleEdit : undefined} onTranslate={handleTranslate} onClose={function () { return setActionMessage(null); }} onDelete={handleDelete}/>)}

      <react_native_1.Modal visible={showPromoteModal} transparent animationType="fade" onRequestClose={function () { return setShowPromoteModal(false); }}>
        <react_native_1.View style={styles.promoteBackdrop}>
          <react_native_1.View style={styles.promoteSheet}>
            <react_native_1.Text style={styles.promoteTitle}>{t('dm.promoteTitle')}</react_native_1.Text>
            <react_native_1.Text style={styles.promoteDescription}>{t('dm.promoteConfirm')}</react_native_1.Text>

            <react_native_1.Text style={styles.promoteLabel}>{t('dm.promoteCommunityName')}</react_native_1.Text>
            <react_native_1.TextInput value={promotionCommunityName} onChangeText={setPromotionCommunityName} placeholder={t('dm.promoteCommunityPlaceholder')} placeholderTextColor={theme_1.colors.textSecondary} style={styles.promoteInput}/>

            <react_native_1.Text style={styles.promoteLabel}>{t('dm.promoteChannelName')}</react_native_1.Text>
            <react_native_1.TextInput value={promotionChannelName} onChangeText={setPromotionChannelName} placeholder={t('dm.promoteChannelPlaceholder')} placeholderTextColor={theme_1.colors.textSecondary} style={styles.promoteInput} autoCapitalize="none"/>

            <react_native_1.View style={styles.promoteActions}>
              <react_native_1.TouchableOpacity onPress={function () { return setShowPromoteModal(false); }} style={styles.promoteSecondaryButton}>
                <react_native_1.Text style={styles.promoteSecondaryButtonText}>{t('common.cancel')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity onPress={submitPromoteToCommunity} disabled={promoteMutation.isPending ||
            !promotionCommunityName.trim() ||
            !promotionChannelName.trim()} style={[
            styles.promotePrimaryButton,
            (promoteMutation.isPending ||
                !promotionCommunityName.trim() ||
                !promotionChannelName.trim())
                ? styles.promotePrimaryButtonDisabled
                : null,
        ]}>
                {promoteMutation.isPending ? (<react_native_1.ActivityIndicator size="small" color="#20262d"/>) : (<react_native_1.Text style={styles.promotePrimaryButtonText}>{t('dm.promoteSubmit')}</react_native_1.Text>)}
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={promotedConflictTarget !== null} transparent animationType="fade" onRequestClose={function () { return setPromotedConflictTarget(null); }}>
        <react_native_1.View style={styles.promoteBackdrop}>
          <react_native_1.View style={styles.promoteSheet}>
            <react_native_1.Text style={styles.promoteTitle}>{t('dm.promotedConflictTitle')}</react_native_1.Text>
            <react_native_1.Text style={styles.promoteDescription}>
              {promotedConflictTarget
            ? t('dm.promotedConflictBody', {
                community: promotedConflictTarget.community.name,
                channel: promotedConflictTarget.channel.name,
            })
            : ''}
            </react_native_1.Text>

            <react_native_1.View style={styles.promoteActions}>
              <react_native_1.TouchableOpacity onPress={function () { return setPromotedConflictTarget(null); }} style={styles.promoteSecondaryButton}>
                <react_native_1.Text style={styles.promoteSecondaryButtonText}>{t('common.cancel')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity onPress={function () {
            var target = promotedConflictTarget;
            setPromotedConflictTarget(null);
            if (target) {
                navigateToPromotedCommunity(target);
            }
        }} style={styles.promotePrimaryButton}>
                <react_native_1.Text style={styles.promotePrimaryButtonText}>{t('dm.goToCurrentChannelShort')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={errorDialog !== null} transparent animationType="fade" onRequestClose={function () { return setErrorDialog(null); }}>
        <react_native_1.View style={styles.promoteBackdrop}>
          <react_native_1.View style={styles.promoteSheet}>
            <react_native_1.Text style={styles.promoteTitle}>{(_j = errorDialog === null || errorDialog === void 0 ? void 0 : errorDialog.title) !== null && _j !== void 0 ? _j : t('common.error')}</react_native_1.Text>
            <react_native_1.Text style={styles.promoteDescription}>{(_k = errorDialog === null || errorDialog === void 0 ? void 0 : errorDialog.message) !== null && _k !== void 0 ? _k : ''}</react_native_1.Text>

            <react_native_1.View style={styles.promoteActions}>
              <react_native_1.TouchableOpacity onPress={function () { return setErrorDialog(null); }} style={styles.promotePrimaryButton}>
                <react_native_1.Text style={styles.promotePrimaryButtonText}>{t('common.confirm')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.KeyboardAvoidingView>);
}
function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024)
        return "".concat((bytes / (1024 * 1024)).toFixed(1), " MB");
    if (bytes >= 1024)
        return "".concat(Math.round(bytes / 1024), " KB");
    return "".concat(bytes, " B");
}
function sanitizeAttachmentName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function getAttachmentKindLabel(fileName, mimeType) {
    if ((0, shared_1.isImageAttachmentMimeType)(mimeType, fileName))
        return 'IMG';
    if (mimeType.startsWith('video/'))
        return 'VID';
    if (mimeType.startsWith('audio/'))
        return 'AUD';
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf'))
        return 'PDF';
    return 'FILE';
}
var styles = react_native_1.StyleSheet.create({
    promoteButton: {
        minWidth: 52,
        minHeight: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    promoteButtonText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    promoteBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme_1.spacing.lg,
    },
    promoteSheet: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        backgroundColor: theme_1.colors.surface,
        padding: theme_1.spacing.lg,
    },
    promoteTitle: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    promoteDescription: {
        marginTop: theme_1.spacing.xs,
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    promoteLabel: {
        marginTop: theme_1.spacing.md,
        marginBottom: theme_1.spacing.xs,
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    promoteInput: {
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.lg,
        backgroundColor: theme_1.colors.background,
        color: theme_1.colors.text,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm + 2,
        fontSize: theme_1.fontSize.base,
    },
    promoteActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.lg,
    },
    promoteSecondaryButton: {
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        borderRadius: 999,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    promoteSecondaryButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    promotePrimaryButton: {
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
        borderRadius: 999,
        backgroundColor: theme_1.colors.talkOwnBubble,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        minWidth: 84,
        alignItems: 'center',
    },
    promotePrimaryButtonDisabled: {
        opacity: 0.6,
    },
    promotePrimaryButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.talkBackground,
    },
    emptyContainer: {
        flex: 1,
        paddingBottom: theme_1.spacing.xl,
    },
    listContent: {
        paddingTop: theme_1.spacing.sm,
        paddingBottom: theme_1.spacing.sm,
    },
    // E2EE status banner
    e2eeBanner: {
        backgroundColor: theme_1.colors.talkPanel,
        paddingVertical: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.lg,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme_1.colors.talkPanelBorder,
    },
    e2eeText: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    dmHeroWrap: {
        paddingHorizontal: theme_1.spacing.md,
        paddingTop: theme_1.spacing.sm,
    },
    dmHeroCard: {
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: theme_1.colors.talkPanel,
        borderRadius: 18,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.md,
    },
    dmHeroEyebrow: {
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs - 1,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    dmHeroTitle: {
        marginTop: theme_1.spacing.xs,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base + 2,
        fontWeight: '700',
    },
    dmHeroBody: {
        marginTop: theme_1.spacing.xs,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    dmHeroMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
        marginTop: theme_1.spacing.sm,
    },
    dmHeroMetaBadge: {
        borderRadius: 999,
        backgroundColor: '#40444b',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    dmHeroMetaBadgeText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    dmHeroMetaBadgeSuccess: {
        borderRadius: 999,
        backgroundColor: 'rgba(34,197,94,0.18)',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    dmHeroMetaBadgeSuccessText: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    dmHeroActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.sm,
    },
    dmHeroActionChip: {
        borderRadius: 12,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs + 2,
    },
    dmHeroActionChipPrimary: {
        backgroundColor: theme_1.colors.talkOwnBubble,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
    },
    dmHeroActionChipText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    dmHeroActionChipPrimaryText: {
        color: theme_1.colors.white,
    },
    promotedBannerWrap: {
        paddingHorizontal: theme_1.spacing.md,
        paddingTop: theme_1.spacing.sm,
    },
    promotedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: theme_1.colors.talkPanel,
        borderRadius: 18,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm - 2,
    },
    promotedBannerIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme_1.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    promotedBannerIconText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.md,
        fontWeight: '800',
    },
    promotedBannerContent: {
        flex: 1,
    },
    historyBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: '#2b2d31',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 3,
        marginBottom: theme_1.spacing.xs,
    },
    historyBadgeText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xs - 2,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    promotedBannerTitle: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    promotedBannerBody: {
        marginTop: 2,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
    },
    promotedBannerAction: {
        borderRadius: 12,
        backgroundColor: theme_1.colors.talkOwnBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
    },
    promotedBannerActionText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    promotedComposer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.md,
        paddingTop: theme_1.spacing.sm,
        paddingBottom: theme_1.spacing.md,
        backgroundColor: theme_1.colors.talkBackground,
        borderTopWidth: 1,
        borderTopColor: theme_1.colors.talkPanelBorder,
    },
    promotedComposerContent: {
        flex: 1,
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm + 2,
    },
    promotedComposerTitle: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    promotedComposerBody: {
        marginTop: 2,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
    },
    promotedComposerButton: {
        borderRadius: 24,
        backgroundColor: theme_1.colors.talkOwnBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm + 2,
        minWidth: 68,
        alignItems: 'center',
    },
    promotedComposerButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    attachments: {
        marginTop: theme_1.spacing.xs,
        marginBottom: theme_1.spacing.xs,
        paddingHorizontal: theme_1.spacing.lg,
    },
    attachmentImageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.xs,
    },
    attachmentImageCard: {
        width: 120,
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme_1.colors.talkPanel,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    attachmentImage: {
        width: '100%',
        height: '100%',
    },
    attachmentFile: {
        marginTop: theme_1.spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: theme_1.colors.talkPanel,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        gap: theme_1.spacing.sm,
    },
    attachmentFileIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    attachmentFileIcon: {
        fontSize: theme_1.fontSize.lg,
    },
    attachmentFileContent: {
        flex: 1,
    },
    attachmentFileMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attachmentFileTypeBadge: {
        borderRadius: 999,
        backgroundColor: 'rgba(240,215,76,0.14)',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 3,
    },
    attachmentFileTypeBadgeText: {
        color: '#f0d74c',
        fontSize: theme_1.fontSize.xs - 2,
        fontWeight: '700',
    },
    attachmentFileName: {
        marginTop: 4,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    attachmentSize: {
        marginTop: 2,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
    },
    attachmentFileCta: {
        marginLeft: theme_1.spacing.xs,
    },
    attachmentFileCtaText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    pendingAttachmentPreview: {
        marginHorizontal: theme_1.spacing.md,
        marginBottom: theme_1.spacing.sm,
        padding: theme_1.spacing.sm,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        backgroundColor: theme_1.colors.talkPanel,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
    },
    pendingAttachmentImage: {
        width: 56,
        height: 56,
        borderRadius: 14,
    },
    pendingAttachmentFallback: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.talkOtherBubble,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    pendingAttachmentFallbackText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '800',
    },
    pendingAttachmentInfo: {
        flex: 1,
    },
    pendingAttachmentName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    pendingAttachmentMeta: {
        marginTop: 2,
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
    },
    pendingAttachmentRemove: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.talkOtherBubble,
    },
    pendingAttachmentRemoveText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    attachMenu: {
        backgroundColor: theme_1.colors.talkPanel,
        borderTopWidth: 1,
        borderTopColor: theme_1.colors.talkPanelBorder,
        paddingVertical: theme_1.spacing.xs,
    },
    attachMenuItem: {
        paddingVertical: theme_1.spacing.md,
        paddingHorizontal: theme_1.spacing.lg,
    },
    attachMenuText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
    },
    // Pending offline messages
    pendingSection: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    pendingItem: {
        backgroundColor: 'rgba(254,229,0,0.72)',
        borderRadius: 18,
        padding: theme_1.spacing.md,
        marginBottom: theme_1.spacing.xs,
        opacity: 0.6,
        alignSelf: 'flex-end',
        maxWidth: '78%',
        borderWidth: 1,
        borderColor: theme_1.colors.talkOwnBubbleBorder,
    },
    pendingBody: {
        color: '#1f2933',
        fontSize: theme_1.fontSize.base,
    },
    pendingMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme_1.spacing.md,
    },
    pendingLabel: {
        color: theme_1.colors.talkMeta,
        fontSize: theme_1.fontSize.xs,
        marginTop: theme_1.spacing.xs,
    },
});
