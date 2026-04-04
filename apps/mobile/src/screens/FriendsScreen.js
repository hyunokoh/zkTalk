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
exports.default = FriendsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var native_1 = require("@react-navigation/native");
var api_1 = require("../lib/api");
var contacts_1 = require("../lib/contacts");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function normalizeFriend(row) {
    var _a;
    if (!row.user) {
        return null;
    }
    return {
        id: row.id,
        userId: row.user.id,
        displayName: row.user.displayName,
        username: row.user.username,
        avatarUrl: row.user.avatarUrl,
        status: row.status,
        isRequester: row.isRequester,
        isOnline: (_a = row.isOnline) !== null && _a !== void 0 ? _a : false,
    };
}
function filterSuggestions(suggestions, friends) {
    var unavailableUserIds = new Set(friends.map(function (friend) { return friend.userId; }));
    return suggestions.filter(function (suggestion) { return !unavailableUserIds.has(suggestion.userId); });
}
function ensureFriend(friend) {
    return 'user' in friend ? normalizeFriend(friend) : friend;
}
function FriendItem(_a) {
    var friend = _a.friend, onAccept = _a.onAccept, onDecline = _a.onDecline, onCancelRequest = _a.onCancelRequest, onRemove = _a.onRemove, onUnblock = _a.onUnblock, onMessage = _a.onMessage, onVoiceCall = _a.onVoiceCall, onVideoCall = _a.onVideoCall, busyAction = _a.busyAction, t = _a.t;
    var displayName = friend.displayName || friend.username || t('friends.unknownUser');
    var username = friend.username || 'user';
    return (<react_native_1.View style={styles.friendItem}>
      <react_native_1.View style={styles.friendAvatar}>
        <react_native_1.Text style={styles.friendAvatarText}>
          {displayName.charAt(0).toUpperCase()}
        </react_native_1.Text>
        {friend.status === 'accepted' && friend.isOnline ? (<react_native_1.View style={styles.onlineIndicator}/>) : null}
      </react_native_1.View>
      <react_native_1.View style={styles.friendInfo}>
        <react_native_1.Text style={styles.friendName}>{displayName}</react_native_1.Text>
        <react_native_1.Text style={styles.friendUsername}>@{username}</react_native_1.Text>
        {friend.status === 'pending' && (<react_native_1.Text style={styles.friendMeta}>
            {friend.isRequester
                ? t('friends.requestSentBadge')
                : t('friends.requestReceivedBadge')}
          </react_native_1.Text>)}
      </react_native_1.View>
      {friend.status === 'pending' && !friend.isRequester && (<react_native_1.View style={styles.pendingActions}>
          {onDecline && (<react_native_1.TouchableOpacity style={styles.pendingButton} onPress={onDecline} disabled={busyAction === 'decline'}>
              {busyAction === 'decline' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.textSecondary}/>) : (<react_native_1.Text style={styles.pendingButtonText}>{t('friends.decline')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>)}
          {onAccept && (<react_native_1.TouchableOpacity style={styles.acceptButton} onPress={onAccept} disabled={busyAction === 'accept'}>
              {busyAction === 'accept' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.acceptText}>{t('friends.accept')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>)}
        </react_native_1.View>)}
      {friend.status === 'pending' && friend.isRequester && onCancelRequest && (<react_native_1.TouchableOpacity style={styles.pendingButton} onPress={onCancelRequest} disabled={busyAction === 'cancel'}>
          {busyAction === 'cancel' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.textSecondary}/>) : (<react_native_1.Text style={styles.pendingButtonText}>{t('friends.cancelRequest')}</react_native_1.Text>)}
        </react_native_1.TouchableOpacity>)}
      {friend.status === 'blocked' && onUnblock && (<react_native_1.TouchableOpacity style={styles.unblockButton} onPress={onUnblock} disabled={busyAction === 'unblock'}>
          {busyAction === 'unblock' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>) : (<react_native_1.Text style={styles.unblockText}>{t('friends.unblock')}</react_native_1.Text>)}
        </react_native_1.TouchableOpacity>)}
      {friend.status === 'accepted' && onMessage && (<react_native_1.View style={styles.acceptedActions}>
          <react_native_1.TouchableOpacity style={styles.messageButton} onPress={onMessage} disabled={busyAction === 'message'}>
            {busyAction === 'message' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.messageButtonText}>{t('friends.message')}</react_native_1.Text>)}
          </react_native_1.TouchableOpacity>
          {onVoiceCall ? (<react_native_1.TouchableOpacity style={styles.messageButton} onPress={onVoiceCall} disabled={busyAction === 'voice'}>
              {busyAction === 'voice' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.messageButtonText}>{t('voice.join')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>) : null}
          {onVideoCall ? (<react_native_1.TouchableOpacity style={styles.messageButton} onPress={onVideoCall} disabled={busyAction === 'video'}>
              {busyAction === 'video' ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.messageButtonText}>{t('voice.videoCall')}</react_native_1.Text>)}
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>)}
      {friend.status === 'accepted' && onRemove && (<react_native_1.TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <react_native_1.Text style={styles.removeText}>{"\u22EF"}</react_native_1.Text>
        </react_native_1.TouchableOpacity>)}
    </react_native_1.View>);
}
function SuggestionItem(_a) {
    var user = _a.user, onAdd = _a.onAdd, isBusy = _a.isBusy, t = _a.t;
    var displayName = user.displayName || user.username || t('friends.unknownUser');
    var username = user.username || 'user';
    return (<react_native_1.View style={styles.friendItem}>
      <react_native_1.View style={[styles.friendAvatar, { backgroundColor: theme_1.colors.success }]}>
        <react_native_1.Text style={styles.friendAvatarText}>
          {displayName.charAt(0).toUpperCase()}
        </react_native_1.Text>
      </react_native_1.View>
      <react_native_1.View style={styles.friendInfo}>
        <react_native_1.Text style={styles.friendName}>{displayName}</react_native_1.Text>
        <react_native_1.Text style={styles.friendUsername}>@{username}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.TouchableOpacity style={styles.acceptButton} onPress={onAdd} disabled={isBusy}>
        {isBusy ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.acceptText}>{t('friends.add')}</react_native_1.Text>)}
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
}
function FriendsScreen() {
    var _this = this;
    var _a, _b, _c, _d;
    var t = (0, i18n_1.useTranslation)().t;
    var _e = (0, react_1.useState)('all'), activeTab = _e[0], setActiveTab = _e[1];
    var _f = (0, react_1.useState)('all'), pendingFilter = _f[0], setPendingFilter = _f[1];
    var _g = (0, react_1.useState)('all'), allFriendsFilter = _g[0], setAllFriendsFilter = _g[1];
    var _h = (0, react_1.useState)('name'), sortField = _h[0], setSortField = _h[1];
    var _j = (0, react_1.useState)('asc'), sortOrder = _j[0], setSortOrder = _j[1];
    var _k = (0, react_1.useState)(''), searchQuery = _k[0], setSearchQuery = _k[1];
    var _l = (0, react_1.useState)([]), suggestions = _l[0], setSuggestions = _l[1];
    var _m = (0, react_1.useState)(false), syncing = _m[0], setSyncing = _m[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var queryClient = (0, react_query_1.useQueryClient)();
    var navigation = (0, native_1.useNavigation)();
    var devActionAttemptedRef = react_1.default.useRef(false);
    var TABS = [
        { key: 'all', label: t('friends.all') },
        { key: 'pending', label: t('friends.pending') },
        { key: 'blocked', label: t('friends.blocked') },
    ];
    var PENDING_FILTERS = [
        { key: 'all', label: t('friends.pendingFilterAll') },
        { key: 'received', label: t('friends.pendingFilterReceived') },
        { key: 'sent', label: t('friends.pendingFilterSent') },
    ];
    var createDmMutation = (0, react_query_1.useMutation)({
        mutationFn: function (targetUserId) {
            return (0, api_1.api)('/api/dm/conversations', {
                method: 'POST',
                body: { targetUserId: targetUserId },
            });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
        },
    });
    var callTargetMutation = (0, react_query_1.useMutation)({
        mutationFn: function (conversationId) {
            return (0, api_1.api)("/api/dm/conversations/".concat(conversationId, "/call-target"), {
                method: 'POST',
            });
        },
        onSuccess: function () {
            void queryClient.invalidateQueries({ queryKey: ['communities'] });
        },
    });
    var _o = (0, react_query_1.useQuery)({
        queryKey: ['friends'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)('/api/friends')];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                friends: result.friends
                                    .map(normalizeFriend)
                                    .filter(function (friend) { return friend !== null; }),
                            }];
                }
            });
        }); },
    }), data = _o.data, isLoading = _o.isLoading, isRefetching = _o.isRefetching, refetch = _o.refetch;
    var contactSuggestionsQuery = (0, react_query_1.useQuery)({
        queryKey: ['contact-suggestions'],
        queryFn: function () { return (0, api_1.api)('/api/contacts/suggestions'); },
    });
    var invalidateFriendQueries = (0, react_1.useCallback)(function () {
        void queryClient.invalidateQueries({ queryKey: ['friends'] });
        void queryClient.invalidateQueries({ queryKey: ['contact-suggestions'] });
    }, [queryClient]);
    var acceptMutation = (0, react_query_1.useMutation)({
        mutationFn: function (friendshipId) {
            return (0, api_1.api)("/api/friends/".concat(friendshipId, "/accept"), { method: 'POST' });
        },
        onSuccess: function () { return invalidateFriendQueries(); },
    });
    var removeMutation = (0, react_query_1.useMutation)({
        mutationFn: function (friendshipId) {
            return (0, api_1.api)("/api/friends/".concat(friendshipId), { method: 'DELETE' });
        },
        onSuccess: function () { return invalidateFriendQueries(); },
    });
    var blockMutation = (0, react_query_1.useMutation)({
        mutationFn: function (friendshipId) {
            return (0, api_1.api)("/api/friends/".concat(friendshipId, "/block"), { method: 'POST' });
        },
        onSuccess: function () { return invalidateFriendQueries(); },
    });
    var unblockMutation = (0, react_query_1.useMutation)({
        mutationFn: function (friendshipId) {
            return (0, api_1.api)("/api/friends/".concat(friendshipId), { method: 'DELETE' });
        },
        onSuccess: function () { return invalidateFriendQueries(); },
    });
    var addFriendMutation = (0, react_query_1.useMutation)({
        mutationFn: function (userId) {
            return (0, api_1.api)('/api/friends/request', { method: 'POST', body: { userId: userId } });
        },
        onSuccess: function (result, userId) {
            setSuggestions(function (prev) { return prev.filter(function (user) { return user.userId !== userId; }); });
            invalidateFriendQueries();
            react_native_1.Alert.alert(result.friendship.status === 'accepted'
                ? t('friends.requestAcceptedTitle')
                : t('friends.requestSentTitle'), result.friendship.status === 'accepted'
                ? t('friends.requestAcceptedBody')
                : t('friends.requestSentBody'));
        },
    });
    var handleMessage = (0, react_1.useCallback)(function (friend) { return __awaiter(_this, void 0, void 0, function () {
        var result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, createDmMutation.mutateAsync(friend.userId)];
                case 1:
                    result = _a.sent();
                    navigation.navigate('Main', {
                        screen: 'DmTab',
                        params: {
                            screen: 'DmScreen',
                            params: {
                                conversationId: result.conversation.id,
                                userId: friend.userId,
                                displayName: friend.displayName,
                            },
                        },
                    });
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), err_1 instanceof Error ? err_1.message : t('friends.dmFailed'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [createDmMutation, navigation, t]);
    var handleStartCall = (0, react_1.useCallback)(function (friend, startWithVideo) { return __awaiter(_this, void 0, void 0, function () {
        var result, callTarget, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, createDmMutation.mutateAsync(friend.userId)];
                case 1:
                    result = _a.sent();
                    return [4 /*yield*/, callTargetMutation.mutateAsync(result.conversation.id)];
                case 2:
                    callTarget = _a.sent();
                    navigation.navigate('Main', {
                        screen: 'HomeTab',
                        params: {
                            screen: 'VoiceCallScreen',
                            params: {
                                communityId: callTarget.community.id,
                                channelId: callTarget.voiceChannel.id,
                                channelName: callTarget.voiceChannel.name,
                                startWithVideo: startWithVideo,
                            },
                        },
                    });
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    react_native_1.Alert.alert(startWithVideo ? t('voice.videoCall') : t('voice.join'), err_2 instanceof Error ? err_2.message : t('voice.joinFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [callTargetMutation, createDmMutation, navigation, t]);
    var handleContactSync = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var matched, filtered, err_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setSyncing(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, contacts_1.syncContacts)()];
                case 2:
                    matched = _b.sent();
                    filtered = filterSuggestions(matched, (_a = data === null || data === void 0 ? void 0 : data.friends) !== null && _a !== void 0 ? _a : []);
                    setSuggestions(filtered);
                    void queryClient.invalidateQueries({ queryKey: ['contact-suggestions'] });
                    if (filtered.length === 0) {
                        react_native_1.Alert.alert(t('friends.noMatches'), t('friends.noMatchesMsg'));
                    }
                    return [3 /*break*/, 5];
                case 3:
                    err_3 = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), err_3 instanceof Error ? err_3.message : t('friends.syncFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setSyncing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [data === null || data === void 0 ? void 0 : data.friends, queryClient, t]);
    var friends = ((_a = data === null || data === void 0 ? void 0 : data.friends) !== null && _a !== void 0 ? _a : [])
        .map(function (friend) { return ensureFriend(friend); })
        .filter(function (friend) { return friend !== null; });
    var persistedSuggestions = filterSuggestions((_c = (_b = contactSuggestionsQuery.data) === null || _b === void 0 ? void 0 : _b.suggestions) !== null && _c !== void 0 ? _c : [], friends);
    var visibleSuggestions = filterSuggestions(suggestions.length > 0 ? suggestions : persistedSuggestions, friends);
    var filteredFriends = friends
        .filter(function (friend) {
        if (activeTab === 'all') {
            if (friend.status !== 'accepted') {
                return false;
            }
            if (allFriendsFilter === 'online') {
                return !!friend.isOnline;
            }
            return true;
        }
        if (activeTab === 'pending') {
            if (friend.status !== 'pending') {
                return false;
            }
            if (pendingFilter === 'received') {
                return !friend.isRequester;
            }
            if (pendingFilter === 'sent') {
                return friend.isRequester;
            }
            return true;
        }
        return friend.status === 'blocked';
    })
        .filter(function (friend) {
        if (!deferredSearchQuery) {
            return true;
        }
        var haystack = [friend.displayName, friend.username].join(' ').toLowerCase();
        return haystack.includes(deferredSearchQuery);
    })
        .sort(function (a, b) {
        if (sortField === 'status') {
            var getStatusPriority = function (friend) {
                if (friend.status === 'accepted') {
                    return friend.isOnline ? 3 : 2;
                }
                if (friend.status === 'pending') {
                    return friend.isRequester ? 0 : 1;
                }
                return -1;
            };
            var left_1 = getStatusPriority(a);
            var right_1 = getStatusPriority(b);
            if (left_1 !== right_1) {
                return sortOrder === 'asc' ? right_1 - left_1 : left_1 - right_1;
            }
        }
        var left = (a.displayName || a.username).toLocaleLowerCase();
        var right = (b.displayName || b.username).toLocaleLowerCase();
        return sortOrder === 'asc'
            ? left.localeCompare(right)
            : right.localeCompare(left);
    });
    var filteredSuggestions = visibleSuggestions.filter(function (user) {
        if (!deferredSearchQuery) {
            return true;
        }
        var haystack = [user.displayName, user.username].join(' ').toLowerCase();
        return haystack.includes(deferredSearchQuery);
    });
    var pendingCount = friends.filter(function (f) { return f.status === 'pending'; }).length;
    react_1.default.useEffect(function () {
        var _a;
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        if (!((_a = data === null || data === void 0 ? void 0 : data.friends) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        devActionAttemptedRef.current = true;
        function tryDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var payload, target, target;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-friend-action.json')];
                        case 1:
                            payload = _a.sent();
                            if (!payload)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 8, 10]);
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'accept' && payload.userId)) return [3 /*break*/, 5];
                            target = friends.find(function (friend) {
                                return friend.status === 'pending' &&
                                    !friend.isRequester &&
                                    friend.userId === payload.userId;
                            });
                            if (!target) return [3 /*break*/, 4];
                            return [4 /*yield*/, acceptMutation.mutateAsync(target.id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'message' && payload.userId)) return [3 /*break*/, 7];
                            target = friends.find(function (friend) {
                                return friend.status === 'accepted' &&
                                    friend.userId === payload.userId;
                            });
                            if (!target) return [3 /*break*/, 7];
                            return [4 /*yield*/, handleMessage(target)];
                        case 6:
                            _a.sent();
                            _a.label = 7;
                        case 7: return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-friend-action.json')];
                        case 9:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevAction();
    }, [acceptMutation, (_d = data === null || data === void 0 ? void 0 : data.friends) === null || _d === void 0 ? void 0 : _d.length, friends, handleMessage]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.StatusBar barStyle="light-content"/>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.headerCopy}>
          <react_native_1.Text style={styles.headerTitle}>{t('friends.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.headerSubtitle}>{t('friends.listSubtitle')}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.headerActions}>
          <react_native_1.TouchableOpacity style={styles.secondaryHeaderButton} onPress={function () {
            return navigation.navigate('Main', {
                screen: 'SettingsTab',
                params: {
                    screen: 'MyQr',
                },
            });
        }}>
            <react_native_1.Text style={styles.secondaryHeaderButtonText}>{t('friends.shareProfile')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={styles.syncButton} onPress={handleContactSync} disabled={syncing}>
            {syncing ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.white}/>) : (<>
                <react_native_1.Text style={styles.syncIcon}>{"\uD83D\uDCD6"}</react_native_1.Text>
                <react_native_1.Text style={styles.syncText}>{t('friends.findFromContacts')}</react_native_1.Text>
              </>)}
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.tabBar}>
        {TABS.map(function (tab) { return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.activeTab]} onPress={function () { return setActiveTab(tab.key); }}>
            <react_native_1.Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 ? " (".concat(pendingCount, ")") : ''}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      <react_native_1.View style={styles.searchWrap}>
        <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('friends.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
      </react_native_1.View>

      <react_native_1.View style={styles.pendingFilterRow}>
        {[
            { key: 'name', label: t('friends.sortName') },
            { key: 'status', label: t('friends.sortStatus') },
        ].map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[
                styles.pendingFilterChip,
                sortField === option.key && styles.pendingFilterChipActive,
            ]} onPress={function () { return setSortField(option.key); }} activeOpacity={0.8}>
            <react_native_1.Text style={[
                styles.pendingFilterChipText,
                sortField === option.key && styles.pendingFilterChipTextActive,
            ]}>
              {option.label}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      <react_native_1.View style={styles.pendingFilterRow}>
        {[
            {
                key: 'asc',
                label: sortField === 'status' ? t('friends.sortStatusHigh') : t('settings.sortAsc'),
            },
            {
                key: 'desc',
                label: sortField === 'status' ? t('friends.sortStatusLow') : t('settings.sortDesc'),
            },
        ].map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[
                styles.pendingFilterChip,
                sortOrder === option.key && styles.pendingFilterChipActive,
            ]} onPress={function () { return setSortOrder(option.key); }} activeOpacity={0.8}>
            <react_native_1.Text style={[
                styles.pendingFilterChipText,
                sortOrder === option.key && styles.pendingFilterChipTextActive,
            ]}>
              {option.label}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>

      {activeTab === 'pending' ? (<react_native_1.View style={styles.pendingFilterRow}>
          {PENDING_FILTERS.map(function (filter) { return (<react_native_1.TouchableOpacity key={filter.key} style={[
                    styles.pendingFilterChip,
                    pendingFilter === filter.key && styles.pendingFilterChipActive,
                ]} onPress={function () { return setPendingFilter(filter.key); }} activeOpacity={0.8}>
              <react_native_1.Text style={[
                    styles.pendingFilterChipText,
                    pendingFilter === filter.key && styles.pendingFilterChipTextActive,
                ]}>
                {filter.label}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>) : null}

      {activeTab === 'all' ? (<react_native_1.View style={styles.pendingFilterRow}>
          {[
                { key: 'all', label: t('friends.pendingFilterAll') },
                { key: 'online', label: t('friends.onlineOnly') },
            ].map(function (filter) { return (<react_native_1.TouchableOpacity key={filter.key} style={[
                    styles.pendingFilterChip,
                    allFriendsFilter === filter.key && styles.pendingFilterChipActive,
                ]} onPress={function () { return setAllFriendsFilter(filter.key); }} activeOpacity={0.8}>
              <react_native_1.Text style={[
                    styles.pendingFilterChipText,
                    allFriendsFilter === filter.key && styles.pendingFilterChipTextActive,
                ]}>
                {filter.label}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>) : null}

      {/* Contact suggestions */}
      {filteredSuggestions.length > 0 && (<react_native_1.View style={styles.suggestionsSection}>
          <react_native_1.Text style={styles.sectionTitle}>{t('friends.contactSuggestions')}</react_native_1.Text>
          {filteredSuggestions.map(function (user) { return (<SuggestionItem key={user.userId} user={user} onAdd={function () { return addFriendMutation.mutate(user.userId); }} isBusy={addFriendMutation.isPending && addFriendMutation.variables === user.userId} t={t}/>); })}
        </react_native_1.View>)}

      {/* Friend list */}
      {isLoading ? (<react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
        </react_native_1.View>) : (<react_native_1.FlatList data={filteredFriends} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching || contactSuggestionsQuery.isRefetching} onRefresh={function () {
                    void refetch();
                    void contactSuggestionsQuery.refetch();
                }} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
                var item = _a.item;
                return (<FriendItem friend={item} busyAction={callTargetMutation.isPending && createDmMutation.variables === item.userId
                        ? 'voice'
                        : createDmMutation.isPending && createDmMutation.variables === item.userId
                            ? 'message'
                            : acceptMutation.isPending && acceptMutation.variables === item.id
                                ? 'accept'
                                : removeMutation.isPending && removeMutation.variables === item.id
                                    ? (item.status === 'blocked'
                                        ? 'unblock'
                                        : item.isRequester
                                            ? 'cancel'
                                            : item.status === 'pending'
                                                ? 'decline'
                                                : null)
                                    : unblockMutation.isPending && unblockMutation.variables === item.id
                                        ? 'unblock'
                                        : null} t={t} onAccept={item.status === 'pending' && !item.isRequester
                        ? function () { return acceptMutation.mutate(item.id); }
                        : undefined} onDecline={item.status === 'pending' && !item.isRequester
                        ? function () {
                            react_native_1.Alert.alert(t('friends.declineRequestTitle'), t('friends.declineRequestConfirm', { name: item.displayName }), [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('friends.decline'),
                                    style: 'destructive',
                                    onPress: function () { return removeMutation.mutate(item.id); },
                                },
                            ]);
                        }
                        : undefined} onCancelRequest={item.status === 'pending' && item.isRequester
                        ? function () {
                            react_native_1.Alert.alert(t('friends.cancelRequestTitle'), t('friends.cancelRequestConfirm', { name: item.displayName }), [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('friends.cancelRequest'),
                                    style: 'destructive',
                                    onPress: function () { return removeMutation.mutate(item.id); },
                                },
                            ]);
                        }
                        : undefined} onMessage={item.status === 'accepted'
                        ? function () { return handleMessage(item); }
                        : undefined} onVoiceCall={item.status === 'accepted'
                        ? function () {
                            void handleStartCall(item, false);
                        }
                        : undefined} onVideoCall={item.status === 'accepted'
                        ? function () {
                            void handleStartCall(item, true);
                        }
                        : undefined} onRemove={item.status === 'accepted'
                        ? function () {
                            react_native_1.Alert.alert(item.displayName, undefined, [
                                {
                                    text: t('friends.block'),
                                    style: 'destructive',
                                    onPress: function () {
                                        react_native_1.Alert.alert(t('friends.blockFriendTitle'), t('friends.blockFriendConfirm', { name: item.displayName }), [
                                            { text: t('common.cancel'), style: 'cancel' },
                                            {
                                                text: t('friends.block'),
                                                style: 'destructive',
                                                onPress: function () { return blockMutation.mutate(item.id); },
                                            },
                                        ]);
                                    },
                                },
                                {
                                    text: t('friends.remove'),
                                    style: 'destructive',
                                    onPress: function () {
                                        react_native_1.Alert.alert(t('friends.removeFriend'), t('friends.removeConfirm', { name: item.displayName }), [
                                            { text: t('common.cancel'), style: 'cancel' },
                                            {
                                                text: t('friends.remove'),
                                                style: 'destructive',
                                                onPress: function () { return removeMutation.mutate(item.id); },
                                            },
                                        ]);
                                    },
                                },
                                { text: t('common.cancel'), style: 'cancel' },
                            ]);
                        }
                        : undefined} onUnblock={item.status === 'blocked'
                        ? function () { return unblockMutation.mutate(item.id); }
                        : undefined}/>);
            }} ListEmptyComponent={<react_native_1.View style={styles.center}>
              <react_native_1.Text style={styles.emptyIcon}>
                {activeTab === 'all'
                    ? "\uD83D\uDC65"
                    : activeTab === 'pending'
                        ? "\uD83D\uDCE9"
                        : "\uD83D\uDEAB"}
              </react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>
                {deferredSearchQuery
                    ? t('friends.noSearchResults')
                    : activeTab === 'all'
                        ? allFriendsFilter === 'online'
                            ? t('friends.noOnlineFriends')
                            : t('friends.noFriends')
                        : activeTab === 'pending'
                            ? pendingFilter === 'received'
                                ? t('friends.noReceivedRequests')
                                : pendingFilter === 'sent'
                                    ? t('friends.noSentRequests')
                                    : t('friends.noPending')
                            : t('friends.noBlocked')}
              </react_native_1.Text>
              {deferredSearchQuery ? (<react_native_1.Text style={styles.emptyHint}>{t('friends.noSearchResultsBody')}</react_native_1.Text>) : activeTab === 'all' && allFriendsFilter === 'online' ? (<react_native_1.Text style={styles.emptyHint}>{t('friends.noOnlineFriendsBody')}</react_native_1.Text>) : activeTab === 'pending' && pendingFilter === 'received' ? (<react_native_1.Text style={styles.emptyHint}>{t('friends.noReceivedRequestsBody')}</react_native_1.Text>) : activeTab === 'pending' && pendingFilter === 'sent' ? (<react_native_1.Text style={styles.emptyHint}>{t('friends.noSentRequestsBody')}</react_native_1.Text>) : activeTab === 'all' && (<react_native_1.Text style={styles.emptyHint}>
                  {t('friends.syncHint')}
                </react_native_1.Text>)}
            </react_native_1.View>} contentContainerStyle={filteredFriends.length === 0 ? styles.emptyList : undefined}/>)}
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        gap: theme_1.spacing.md,
    },
    headerCopy: {
        flex: 1,
    },
    headerActions: {
        alignItems: 'flex-end',
        gap: theme_1.spacing.sm,
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
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        gap: theme_1.spacing.sm,
    },
    tab: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.xl,
        backgroundColor: theme_1.colors.surface,
    },
    activeTab: {
        backgroundColor: theme_1.colors.primary,
    },
    tabText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        fontWeight: '600',
    },
    activeTabText: {
        color: theme_1.colors.white,
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 38,
        paddingHorizontal: theme_1.spacing.md,
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        gap: theme_1.spacing.sm,
    },
    secondaryHeaderButton: {
        minHeight: 38,
        paddingHorizontal: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryHeaderButtonText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    syncIcon: {
        fontSize: 14,
    },
    syncText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.sm,
    },
    pendingFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.sm,
        paddingBottom: theme_1.spacing.xs,
    },
    pendingFilterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.xl,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    pendingFilterChipActive: {
        backgroundColor: theme_1.colors.primary + '22',
        borderColor: theme_1.colors.primary,
    },
    pendingFilterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    pendingFilterChipTextActive: {
        color: theme_1.colors.primary,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.md,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    suggestionsSection: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.lg,
    },
    sectionTitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme_1.spacing.sm,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    friendAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme_1.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.md,
    },
    friendAvatarText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme_1.colors.bg,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.body,
        fontWeight: '600',
    },
    friendUsername: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 1,
    },
    friendMeta: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        marginTop: 4,
    },
    acceptButton: {
        backgroundColor: theme_1.colors.primary,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.xl,
    },
    pendingActions: {
        flexDirection: 'row',
        gap: theme_1.spacing.xs,
    },
    acceptText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    pendingButton: {
        backgroundColor: theme_1.colors.surfaceLight,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.xl,
    },
    pendingButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    unblockButton: {
        backgroundColor: theme_1.colors.surfaceLight,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.xl,
    },
    unblockText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    messageButton: {
        backgroundColor: theme_1.colors.surfaceLight,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.xl,
        marginRight: theme_1.spacing.sm,
    },
    acceptedActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: '58%',
    },
    messageButtonText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    removeButton: {
        padding: theme_1.spacing.sm,
    },
    removeText: {
        color: theme_1.colors.textSecondary,
        fontSize: 20,
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
        textAlign: 'center',
    },
});
