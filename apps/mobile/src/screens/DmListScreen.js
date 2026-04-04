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
exports.default = DmListScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var native_1 = require("@react-navigation/native");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
function normalizePreviewText(message, t) {
    var _a, _b;
    var preview = (_b = (_a = message === null || message === void 0 ? void 0 : message.message.bodyPlaintext) !== null && _a !== void 0 ? _a : message === null || message === void 0 ? void 0 : message.message.bodyMarkdown) !== null && _b !== void 0 ? _b : null;
    if (!preview)
        return null;
    if (preview === '[encrypted]') {
        return t('dm.encryptedMessagePlaceholder');
    }
    return preview;
}
function formatTimeAgo(dateStr, t) {
    var date = new Date(dateStr);
    if (Number.isNaN(date.getTime()))
        return '';
    var now = new Date();
    var diffMs = now.getTime() - date.getTime();
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return t('dm.timeNow');
    if (diffMin < 60)
        return "".concat(diffMin, "m");
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return "".concat(diffHr, "h");
    var diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7)
        return "".concat(diffDays, "d");
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function mapConversationRow(row, currentUserId, t) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var isGroup = row.conversation.type === 'group';
    var otherParticipants = row.participants.filter(function (participant) {
        return currentUserId ? participant.userId !== currentUserId : true;
    });
    var primaryParticipant = (_a = otherParticipants[0]) !== null && _a !== void 0 ? _a : row.participants[0];
    var participantNames = otherParticipants.map(function (participant) { return participant.user.displayName; });
    var displayName = isGroup
        ? ((_b = row.conversation.name) === null || _b === void 0 ? void 0 : _b.trim()) || participantNames.join(', ') || t('dm.groupConversation')
        : (primaryParticipant === null || primaryParticipant === void 0 ? void 0 : primaryParticipant.user.displayName) ||
            (primaryParticipant === null || primaryParticipant === void 0 ? void 0 : primaryParticipant.user.username) ||
            t('common.unknown');
    return {
        conversationId: row.conversation.id,
        conversationType: row.conversation.type,
        userId: isGroup ? undefined : primaryParticipant === null || primaryParticipant === void 0 ? void 0 : primaryParticipant.userId,
        displayName: displayName,
        lastMessage: normalizePreviewText(row.latestMessage, t),
        lastMessageAt: (_e = (_d = (_c = row.latestMessage) === null || _c === void 0 ? void 0 : _c.message.createdAt) !== null && _d !== void 0 ? _d : row.conversation.updatedAt) !== null && _e !== void 0 ? _e : null,
        unreadCount: (_f = row.unreadCount) !== null && _f !== void 0 ? _f : 0,
        isOnline: isGroup ? false : (_g = primaryParticipant === null || primaryParticipant === void 0 ? void 0 : primaryParticipant.user.isOnline) !== null && _g !== void 0 ? _g : false,
        promotedCommunity: (_h = row.promotedCommunity) !== null && _h !== void 0 ? _h : null,
        promotedChannel: (_j = row.promotedChannel) !== null && _j !== void 0 ? _j : null,
    };
}
function navigateToConversationTarget(navigation, tabNavigation, item) {
    if (item.promotedCommunity && item.promotedChannel) {
        tabNavigation === null || tabNavigation === void 0 ? void 0 : tabNavigation.navigate('HomeTab', {
            screen: 'ChannelScreen',
            params: {
                channelId: item.promotedChannel.id,
                channelName: item.promotedChannel.name,
                communityId: item.promotedCommunity.id,
            },
        });
        return;
    }
    navigation.navigate('DmScreen', {
        conversationId: item.conversationId,
        userId: item.userId,
        displayName: item.displayName,
    });
}
function navigateToConversationHistory(navigation, item) {
    navigation.navigate('DmScreen', {
        conversationId: item.conversationId,
        userId: item.userId,
        displayName: item.displayName,
    });
}
function DmListScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var currentUserId = (0, auth_1.useAuthStore)(function (s) { var _a; return (_a = s.user) === null || _a === void 0 ? void 0 : _a.id; });
    var tabNavigation = navigation.getParent();
    var isFocused = (0, native_1.useIsFocused)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(false), devActionAttempted = _c[0], setDevActionAttempted = _c[1];
    var _d = (0, react_1.useState)('all'), filterMode = _d[0], setFilterMode = _d[1];
    var _e = (0, react_1.useState)('all'), typeFilter = _e[0], setTypeFilter = _e[1];
    var _f = (0, react_1.useState)('activity'), sortField = _f[0], setSortField = _f[1];
    var _g = (0, react_1.useState)('newest'), sortOrder = _g[0], setSortOrder = _g[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['dm-conversations'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result, rows;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)('/api/dm/conversations')];
                    case 1:
                        result = _b.sent();
                        rows = Array.isArray(result) ? result : (_a = result.conversations) !== null && _a !== void 0 ? _a : [];
                        return [2 /*return*/, rows];
                }
            });
        }); },
    }), data = _h.data, isLoading = _h.isLoading, refetch = _h.refetch, isRefetching = _h.isRefetching;
    var conversations = (0, react_1.useMemo)(function () {
        var rows = (data !== null && data !== void 0 ? data : []).filter(function (item) {
            var _a;
            return typeof item === 'object'
                && item !== null
                && 'conversation' in item
                && typeof ((_a = item.conversation) === null || _a === void 0 ? void 0 : _a.id) === 'string';
        });
        var items = rows.map(function (row) { return mapConversationRow(row, currentUserId, t); });
        var filtered = items.filter(function (item) {
            var _a, _b;
            if (typeFilter !== 'all' && item.conversationType !== typeFilter) {
                return false;
            }
            if (filterMode === 'unread' && ((_a = item.unreadCount) !== null && _a !== void 0 ? _a : 0) === 0) {
                return false;
            }
            if (filterMode === 'encrypted' && item.lastMessage !== t('dm.encryptedMessagePlaceholder')) {
                return false;
            }
            if (filterMode === 'online' && !(item.conversationType === 'direct' && item.isOnline)) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [item.displayName, (_b = item.lastMessage) !== null && _b !== void 0 ? _b : ''].join(' ').toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        var sorted = __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'unread') {
                if (a.unreadCount !== b.unreadCount) {
                    return sortOrder === 'newest'
                        ? b.unreadCount - a.unreadCount
                        : a.unreadCount - b.unreadCount;
                }
            }
            if (sortField === 'name') {
                var left_1 = (a.displayName || '').toLowerCase();
                var right_1 = (b.displayName || '').toLowerCase();
                if (left_1 === right_1) {
                    return 0;
                }
                var comparison = left_1 > right_1 ? 1 : -1;
                return sortOrder === 'newest' ? comparison : -comparison;
            }
            var left = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            var right = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return sortOrder === 'newest' ? right - left : left - right;
        });
        var seenConversationIds = new Set();
        return sorted.filter(function (item) {
            if (seenConversationIds.has(item.conversationId)) {
                return false;
            }
            seenConversationIds.add(item.conversationId);
            return true;
        });
    }, [currentUserId, data, deferredSearchQuery, filterMode, sortField, sortOrder, t, typeFilter]);
    react_1.default.useEffect(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttempted)
            return;
        if (!conversations.length)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, first, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-dm-list-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 6]);
                            if (action.type !== 'openFirst') {
                                throw new Error('Unsupported DM list dev action');
                            }
                            first = conversations[0];
                            if (!first) {
                                throw new Error('No DM conversations available');
                            }
                            setDevActionAttempted(true);
                            navigateToConversationTarget(navigation, tabNavigation, first);
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-dm-list-result.json', {
                                    ok: true,
                                    action: 'openFirst',
                                    conversationId: first.conversationId,
                                    displayName: first.displayName,
                                })];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            error_1 = _a.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-dm-list-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 5:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [conversations, devActionAttempted, navigation, tabNavigation]);
    if (isLoading) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea} testID="dm-list-screen">
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.container}>
        <react_native_1.View style={styles.header}>
          <react_native_1.View style={styles.headerCopy}>
            <react_native_1.Text style={styles.headerTitle} testID="dm-list-title">{t('dm.title')}</react_native_1.Text>
            <react_native_1.Text style={styles.headerSubtitle}>{t('dm.listSubtitle')}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity style={styles.newDmButton} onPress={function () { return tabNavigation === null || tabNavigation === void 0 ? void 0 : tabNavigation.navigate('FriendsTab'); }} activeOpacity={0.7}>
            <react_native_1.Text style={styles.newDmLabel}>{t('dm.newMessage')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.FlatList testID="dm-conversation-list" data={conversations} keyExtractor={function (item) { return item.conversationId; }} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
              <react_native_1.View style={styles.filterRow}>
                {[
                { key: 'all', label: t('dm.filterAll') },
                { key: 'unread', label: t('dm.filterUnread') },
                { key: 'encrypted', label: t('dm.filterEncrypted') },
                { key: 'online', label: t('dm.filterOnline') },
            ].map(function (option) {
                var active = filterMode === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setFilterMode(option.key); }}>
                      <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
            })}
              </react_native_1.View>
              <react_native_1.View style={styles.filterRow}>
                {[
                { key: 'all', label: t('dm.filterAll') },
                { key: 'direct', label: t('dm.filterDirect') },
                { key: 'group', label: t('dm.filterGroup') },
            ].map(function (option) {
                var active = typeFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setTypeFilter(option.key); }}>
                      <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
            })}
              </react_native_1.View>
              <react_native_1.View style={styles.filterRow}>
                {[
                { key: 'activity', label: t('dm.sortActivity') },
                { key: 'name', label: t('dm.sortName') },
                { key: 'unread', label: t('dm.sortUnread') },
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
                    label: sortField === 'name'
                        ? t('settings.sortAsc')
                        : sortField === 'unread'
                            ? t('dm.sortMostUnread')
                            : t('settings.sortNewest'),
                },
                {
                    key: 'oldest',
                    label: sortField === 'name'
                        ? t('settings.sortDesc')
                        : sortField === 'unread'
                            ? t('dm.sortFewestUnread')
                            : t('settings.sortOldest'),
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
              <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('dm.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isFocused && isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var _b, _c;
            var item = _a.item;
            var hasUnread = ((_b = item.unreadCount) !== null && _b !== void 0 ? _b : 0) > 0;
            var hasHistory = Boolean(item.lastMessage) || hasUnread;
            var safeDisplayName = ((_c = item.displayName) === null || _c === void 0 ? void 0 : _c.trim()) || t('common.unknown');
            var promotedTarget = item.promotedCommunity && item.promotedChannel
                ? {
                    community: item.promotedCommunity,
                    channel: item.promotedChannel,
                }
                : null;
            return (<react_native_1.View style={styles.conversationItem}>
                <react_native_1.TouchableOpacity testID={"dm-conversation-row-".concat(item.conversationId)} style={styles.conversationMainTap} onPress={function () { return navigateToConversationTarget(navigation, tabNavigation, item); }} activeOpacity={0.7}>
                  <react_native_1.View style={styles.avatarContainer}>
                    <react_native_1.View style={styles.avatar}>
                      <react_native_1.Text style={styles.avatarText}>
                        {safeDisplayName.charAt(0).toUpperCase()}
                      </react_native_1.Text>
                    </react_native_1.View>
                    {item.isOnline && <react_native_1.View style={styles.onlineDot}/>}
                  </react_native_1.View>
                  <react_native_1.View style={styles.conversationInfo}>
                    <react_native_1.View style={styles.conversationTop}>
                      <react_native_1.View style={styles.displayNameRow}>
                        <react_native_1.Text style={[
                    styles.displayName,
                    hasUnread && !promotedTarget && styles.displayNameUnread,
                ]} numberOfLines={1}>
                          {safeDisplayName}
                        </react_native_1.Text>
                        {promotedTarget && (<react_native_1.View style={styles.promotedChip}>
                            <react_native_1.Text style={styles.promotedChipText}>{t('dm.promotedListBadge')}</react_native_1.Text>
                          </react_native_1.View>)}
                      </react_native_1.View>
                      {item.lastMessageAt && (<react_native_1.Text style={[
                        styles.time,
                        hasUnread && !promotedTarget && styles.timeUnread,
                    ]}>
                          {formatTimeAgo(item.lastMessageAt, t)}
                        </react_native_1.Text>)}
                    </react_native_1.View>
                    <react_native_1.View style={styles.conversationBottom}>
                      {item.lastMessage ? (<react_native_1.Text style={[
                        styles.lastMessage,
                        hasUnread && !promotedTarget && styles.lastMessageUnread,
                    ]} numberOfLines={1}>
                          {promotedTarget
                        ? "".concat(t('dm.historyBadge'), " \u00B7 ").concat(item.lastMessage)
                        : item.lastMessage}
                        </react_native_1.Text>) : (<react_native_1.Text style={styles.lastMessage}>
                          {promotedTarget ? t('dm.promotedNoHistoryPreview') : t('dm.noMessages')}
                        </react_native_1.Text>)}
                      {hasUnread && !promotedTarget && (<react_native_1.View style={styles.unreadBadge}>
                          <react_native_1.Text style={styles.unreadText}>{item.unreadCount}</react_native_1.Text>
                        </react_native_1.View>)}
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.TouchableOpacity>
                {promotedTarget && (<react_native_1.View style={styles.promotedRowWrap}>
                    <react_native_1.View style={styles.promotedRow}>
                      <react_native_1.Text style={styles.promotedChannelText} numberOfLines={1}>
                        {promotedTarget.community.name} · #{promotedTarget.channel.name}
                      </react_native_1.Text>
                      <react_native_1.View style={styles.promotedActions}>
                        {hasHistory && (<react_native_1.TouchableOpacity style={styles.promotedHistoryButton} onPress={function () { return navigateToConversationHistory(navigation, item); }}>
                            <react_native_1.View style={styles.promotedHistoryButtonContent}>
                              <react_native_1.Text style={styles.promotedHistoryButtonText}>
                                {t('dm.viewHistoryShort')}
                              </react_native_1.Text>
                              {hasUnread && (<react_native_1.View style={styles.promotedHistoryUnreadBadge}>
                                  <react_native_1.Text style={styles.promotedHistoryUnreadText}>{item.unreadCount}</react_native_1.Text>
                                </react_native_1.View>)}
                            </react_native_1.View>
                          </react_native_1.TouchableOpacity>)}
                        <react_native_1.TouchableOpacity style={styles.promotedOpenButton} onPress={function () { return navigateToConversationTarget(navigation, tabNavigation, item); }}>
                          <react_native_1.Text style={styles.promotedOpenButtonText}>
                            {t('dm.openCommunityShort')}
                          </react_native_1.Text>
                        </react_native_1.TouchableOpacity>
                      </react_native_1.View>
                    </react_native_1.View>
                  </react_native_1.View>)}
              </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyContainer}>
              <react_native_1.Text style={styles.emptyIcon}>{"\u2709\uFE0F"}</react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>
                {deferredSearchQuery
                ? t('dm.noSearchResults')
                : typeFilter === 'direct'
                    ? t('dm.noDirectConversations')
                    : typeFilter === 'group'
                        ? t('dm.noGroupConversations')
                        : filterMode === 'unread'
                            ? t('dm.noUnreadConversations')
                            : filterMode === 'encrypted'
                                ? t('dm.noEncryptedConversations')
                                : filterMode === 'online'
                                    ? t('dm.noOnlineConversations')
                                    : t('dm.noConversations')}
              </react_native_1.Text>
              <react_native_1.Text style={styles.emptyHint}>
                {deferredSearchQuery
                ? t('dm.noSearchResultsBody')
                : typeFilter === 'direct'
                    ? t('dm.noDirectConversationsBody')
                    : typeFilter === 'group'
                        ? t('dm.noGroupConversationsBody')
                        : filterMode === 'unread'
                            ? t('dm.noUnreadConversationsBody')
                            : filterMode === 'encrypted'
                                ? t('dm.noEncryptedConversationsBody')
                                : filterMode === 'online'
                                    ? t('dm.noOnlineConversationsBody')
                                    : t('dm.startConversation')}
              </react_native_1.Text>
            </react_native_1.View>} contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}/>
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: theme_1.colors.border,
    },
    headerCopy: {
        flex: 1,
        paddingRight: theme_1.spacing.md,
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
    newDmButton: {
        minHeight: 38,
        paddingHorizontal: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.xl,
        backgroundColor: theme_1.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newDmLabel: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
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
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    conversationItem: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    conversationMainTap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: theme_1.spacing.md,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme_1.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme_1.colors.success,
        borderWidth: 2.5,
        borderColor: theme_1.colors.bg,
    },
    conversationInfo: {
        flex: 1,
    },
    conversationTop: {
        marginBottom: 4,
        gap: 3,
    },
    displayNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
        minWidth: 0,
    },
    displayName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '500',
        flex: 1,
        marginRight: theme_1.spacing.sm,
    },
    displayNameUnread: {
        fontWeight: '700',
    },
    time: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        textAlign: 'right',
    },
    timeUnread: {
        color: theme_1.colors.primary,
    },
    conversationBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    promotedChip: {
        borderRadius: 999,
        backgroundColor: '#fff1bf',
        borderWidth: 1,
        borderColor: '#f2d56b',
        paddingHorizontal: theme_1.spacing.xs + 2,
        paddingVertical: 2,
    },
    promotedChipText: {
        color: '#7a5600',
        fontSize: theme_1.fontSize.xs - 1,
        fontWeight: '700',
    },
    lastMessage: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        flex: 1,
    },
    lastMessageUnread: {
        color: theme_1.colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: theme_1.colors.primary,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: theme_1.spacing.sm,
    },
    unreadText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    promotedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.sm,
    },
    promotedRowWrap: {
        marginTop: theme_1.spacing.xs,
        marginLeft: 68,
    },
    promotedChannelText: {
        flex: 1,
        color: '#7a5600',
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    promotedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
    },
    promotedHistoryButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.surface,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    promotedHistoryButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
    },
    promotedHistoryButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    promotedHistoryUnreadBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme_1.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    promotedHistoryUnreadText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xs - 1,
        fontWeight: '700',
    },
    promotedOpenButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#f2d56b',
        backgroundColor: '#fff7d8',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    promotedOpenButtonText: {
        color: '#7a5600',
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    emptyList: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.xxxl,
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
