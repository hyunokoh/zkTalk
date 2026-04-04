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
exports.default = HomeScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var community_image_1 = require("../lib/community-image");
var error_message_1 = require("../lib/error-message");
var i18n_1 = require("../lib/i18n");
var network_config_1 = require("../lib/network-config");
var storage_1 = require("../lib/storage");
var voice_runtime_1 = require("../lib/voice-runtime");
var simulator_harness_1 = require("../lib/simulator-harness");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
var COMMUNITY_COLORS = [
    '#6366f1',
    '#ec4899',
    '#f59e0b',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ef4444',
    '#14b8a6',
];
function getCommunityColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length];
}
function getChannelIcon(type) {
    switch (type) {
        case 'voice':
            return "\uD83D\uDD0A";
        case 'forum':
            return "\uD83D\uDCCB";
        case 'announcement':
            return "\uD83D\uDCE2";
        default:
            return '#';
    }
}
function getSourceDmSearchTerms(channel, directDmLabel, groupDmLabel) {
    var _a;
    if (!channel.sourceDmConversation) {
        return [];
    }
    return [
        (_a = channel.sourceDmConversation.name) !== null && _a !== void 0 ? _a : '',
        channel.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel,
    ];
}
// Memoized list items to avoid unnecessary re-renders
var CommunityListItem = (0, react_1.memo)(function CommunityListItem(_a) {
    var item = _a.item, onPress = _a.onPress, onMoveUp = _a.onMoveUp, onMoveDown = _a.onMoveDown, canMoveUp = _a.canMoveUp, canMoveDown = _a.canMoveDown, moveUpLabel = _a.moveUpLabel, moveDownLabel = _a.moveDownLabel;
    var iconUrl = (0, community_image_1.getVersionedImageUrl)(item.iconUrl, item.updatedAt);
    return (<react_native_1.View style={styles.communityItem}>
      <react_native_1.TouchableOpacity testID={"community-row-".concat(item.id)} style={styles.communityItemMain} onPress={function () { return onPress(item); }} activeOpacity={0.7}>
        <react_native_1.View style={[
            styles.communityIcon,
            { backgroundColor: getCommunityColor(item.name) },
        ]}>
          {iconUrl ? (<react_native_1.Image source={{ uri: iconUrl }} style={styles.communityIconImage}/>) : (<react_native_1.Text style={styles.communityInitial}>
              {item.name.charAt(0).toUpperCase()}
            </react_native_1.Text>)}
        </react_native_1.View>
        <react_native_1.View style={styles.communityInfo}>
          <react_native_1.Text style={styles.communityName}>{item.name}</react_native_1.Text>
          {item.description && (<react_native_1.Text style={styles.communityDesc} numberOfLines={1}>
              {item.description}
            </react_native_1.Text>)}
        </react_native_1.View>
        <react_native_1.Text style={styles.chevron}>{"\u203A"}</react_native_1.Text>
      </react_native_1.TouchableOpacity>
      <react_native_1.View style={styles.communityReorderActions}>
        <react_native_1.TouchableOpacity style={[
            styles.communityReorderButton,
            !canMoveUp && styles.communityReorderButtonDisabled,
        ]} onPress={function () { return onMoveUp(item.id); }} disabled={!canMoveUp} accessibilityRole="button" accessibilityLabel={moveUpLabel}>
          <react_native_1.Text style={[
            styles.communityReorderButtonText,
            !canMoveUp && styles.communityReorderButtonTextDisabled,
        ]}>
            {"\u2191"}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[
            styles.communityReorderButton,
            !canMoveDown && styles.communityReorderButtonDisabled,
        ]} onPress={function () { return onMoveDown(item.id); }} disabled={!canMoveDown} accessibilityRole="button" accessibilityLabel={moveDownLabel}>
          <react_native_1.Text style={[
            styles.communityReorderButtonText,
            !canMoveDown && styles.communityReorderButtonTextDisabled,
        ]}>
            {"\u2193"}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
});
var ChannelListItem = (0, react_1.memo)(function ChannelListItem(_a) {
    var _b, _c;
    var item = _a.item, onPress = _a.onPress, voiceLabel = _a.voiceLabel, sourceDmLabel = _a.sourceDmLabel, directDmLabel = _a.directDmLabel, groupDmLabel = _a.groupDmLabel, sourceDmMatchLabel = _a.sourceDmMatchLabel, voiceStatusLabel = _a.voiceStatusLabel, isRecentVoiceChannel = _a.isRecentVoiceChannel, isLiveVoiceChannel = _a.isLiveVoiceChannel;
    var t = (0, i18n_1.useTranslation)().t;
    return (<react_native_1.TouchableOpacity testID={"channel-row-".concat(item.id)} style={styles.channelItem} onPress={function () { return onPress(item); }} accessibilityRole="button" accessibilityLabel={item.sourceDmConversation
            ? "".concat(item.name, ", ").concat(item.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel, ", ").concat((_b = item.sourceDmConversation.name) !== null && _b !== void 0 ? _b : sourceDmLabel)
            : item.name}>
      <react_native_1.Text style={styles.channelIcon}>{getChannelIcon(item.type)}</react_native_1.Text>
      <react_native_1.View style={styles.channelCopy}>
        <react_native_1.Text style={styles.channelName}>{item.name}</react_native_1.Text>
        {sourceDmMatchLabel ? (<react_native_1.Text style={styles.channelSourceMatch} numberOfLines={1}>
            {sourceDmMatchLabel}
          </react_native_1.Text>) : null}
        {item.type === 'voice' && voiceStatusLabel ? (<react_native_1.Text style={styles.channelVoiceStatus} numberOfLines={1}>
            {voiceStatusLabel}
          </react_native_1.Text>) : null}
      </react_native_1.View>
      {item.sourceDmConversation ? (<react_native_1.View style={styles.sourceDmBadge}>
          <react_native_1.Text style={styles.sourceDmBadgeText}>
            {item.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel}
          </react_native_1.Text>
        </react_native_1.View>) : item.sourceDmConversationId ? (<react_native_1.View style={styles.sourceDmBadge}>
          <react_native_1.Text style={styles.sourceDmBadgeText}>{sourceDmLabel}</react_native_1.Text>
        </react_native_1.View>) : null}
      {item.type === 'voice' && (<react_native_1.View style={styles.voiceBadge}>
          <react_native_1.Text style={styles.voiceBadgeText}>{voiceLabel}</react_native_1.Text>
        </react_native_1.View>)}
      {item.type === 'voice' && isRecentVoiceChannel ? (<react_native_1.View style={styles.voiceRecentListBadge}>
          <react_native_1.Text style={styles.voiceRecentListBadgeText}>{t('voice.recentChannel')}</react_native_1.Text>
        </react_native_1.View>) : null}
      {item.type === 'voice' && isLiveVoiceChannel ? (<react_native_1.View style={styles.voiceLiveListBadge}>
          <react_native_1.Text style={styles.voiceLiveListBadgeText}>{t('voice.liveNow')}</react_native_1.Text>
        </react_native_1.View>) : null}
      {((_c = item.unreadCount) !== null && _c !== void 0 ? _c : 0) > 0 && (<react_native_1.View style={styles.unreadBadge}>
          <react_native_1.Text style={styles.unreadText}>{item.unreadCount}</react_native_1.Text>
        </react_native_1.View>)}
    </react_native_1.TouchableOpacity>);
});
var ChannelSectionHeader = (0, react_1.memo)(function ChannelSectionHeader(_a) {
    var title = _a.title;
    return (<react_native_1.View style={styles.channelSectionHeader}>
      <react_native_1.Text style={styles.channelSectionTitle}>{title}</react_native_1.Text>
    </react_native_1.View>);
});
// Approximate row height for getItemLayout (performance optimization)
var COMMUNITY_ROW_HEIGHT = 64;
var communityGetItemLayout = function (_data, index) { return ({
    length: COMMUNITY_ROW_HEIGHT,
    offset: COMMUNITY_ROW_HEIGHT * index,
    index: index,
}); };
function applyCommunityOrder(items, order) {
    if (!order.length) {
        return items;
    }
    var itemsById = new Map(items.map(function (item) { return [item.id, item]; }));
    var orderedItems = order.flatMap(function (id) {
        var item = itemsById.get(id);
        return item ? [item] : [];
    });
    var unorderedItems = items.filter(function (item) { return !order.includes(item.id); });
    return __spreadArray(__spreadArray([], orderedItems, true), unorderedItems, true);
}
function dedupeById(items) {
    var seenIds = new Set();
    return items.filter(function (item) {
        if (seenIds.has(item.id)) {
            return false;
        }
        seenIds.add(item.id);
        return true;
    });
}
function HomeScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f, _g, _h;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var currentUser = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var isFocused = (0, native_1.useIsFocused)();
    var _j = (0, react_1.useState)([]), communityOrder = _j[0], setCommunityOrder = _j[1];
    var _k = (0, react_1.useState)(null), selectedCommunity = _k[0], setSelectedCommunity = _k[1];
    var _l = (0, react_1.useState)({}), inviteCodesByCommunity = _l[0], setInviteCodesByCommunity = _l[1];
    var _m = (0, react_1.useState)(''), channelSearchQuery = _m[0], setChannelSearchQuery = _m[1];
    var _o = (0, react_1.useState)('all'), channelFilter = _o[0], setChannelFilter = _o[1];
    var _p = (0, react_1.useState)(null), recentVoiceChannelId = _p[0], setRecentVoiceChannelId = _p[1];
    var _q = (0, react_1.useState)(false), devActionAttempted = _q[0], setDevActionAttempted = _q[1];
    var selectedCommunityId = (_b = route.params) === null || _b === void 0 ? void 0 : _b.selectedCommunityId;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _r = (0, react_query_1.useQuery)({
        queryKey: ['communities'],
        queryFn: function () { return (0, api_1.api)('/api/communities'); },
    }), communities = _r.data, isLoading = _r.isLoading, refetchCommunities = _r.refetch, communitiesRefetching = _r.isRefetching;
    (0, react_1.useEffect)(function () {
        var _a;
        if (!selectedCommunityId || !((_a = communities === null || communities === void 0 ? void 0 : communities.communities) === null || _a === void 0 ? void 0 : _a.length))
            return;
        var nextCommunity = communities.communities.find(function (community) { return community.id === selectedCommunityId; });
        if (!nextCommunity)
            return;
        setSelectedCommunity(nextCommunity);
        navigation.setParams({ selectedCommunityId: undefined });
    }, [communities === null || communities === void 0 ? void 0 : communities.communities, navigation, selectedCommunityId]);
    (0, react_1.useEffect)(function () {
        var cancelled = false;
        function loadCommunityOrder() {
            return __awaiter(this, void 0, void 0, function () {
                var storedOrder;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, storage_1.getCommunityOrder)()];
                        case 1:
                            storedOrder = _a.sent();
                            if (!cancelled) {
                                setCommunityOrder(Array.from(new Set(storedOrder)));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        }
        void loadCommunityOrder();
        return function () {
            cancelled = true;
        };
    }, []);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!selectedCommunity || !((_a = communities === null || communities === void 0 ? void 0 : communities.communities) === null || _a === void 0 ? void 0 : _a.length))
            return;
        var nextCommunity = communities.communities.find(function (community) { return community.id === selectedCommunity.id; });
        if (!nextCommunity)
            return;
        if (nextCommunity.name !== selectedCommunity.name ||
            nextCommunity.description !== selectedCommunity.description ||
            nextCommunity.visibility !== selectedCommunity.visibility ||
            nextCommunity.iconUrl !== selectedCommunity.iconUrl ||
            nextCommunity.updatedAt !== selectedCommunity.updatedAt) {
            setSelectedCommunity(nextCommunity);
        }
    }, [communities === null || communities === void 0 ? void 0 : communities.communities, selectedCommunity]);
    var _s = (0, react_query_1.useQuery)({
        queryKey: ['channels', selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/communities/".concat(selectedCommunity.id, "/channels"))];
                    case 1:
                        res = _c.sent();
                        return [2 /*return*/, {
                                uncategorized: (_a = res.uncategorized) !== null && _a !== void 0 ? _a : [],
                                categories: (_b = res.categories) !== null && _b !== void 0 ? _b : [],
                            }];
                }
            });
        }); },
        enabled: !!selectedCommunity,
    }), channelsData = _s.data, channelsLoading = _s.isLoading, refetchChannels = _s.refetch, channelsRefetching = _s.isRefetching;
    (0, react_1.useEffect)(function () {
        setChannelSearchQuery('');
        setChannelFilter('all');
    }, [selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id]);
    (0, react_1.useEffect)(function () {
        var cancelled = false;
        function loadRecentVoiceChannel() {
            return __awaiter(this, void 0, void 0, function () {
                var channelId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id)) {
                                if (!cancelled) {
                                    setRecentVoiceChannelId(null);
                                }
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, (0, storage_1.getLastVoiceChannelForCommunity)(selectedCommunity.id)];
                        case 1:
                            channelId = _a.sent();
                            if (!cancelled) {
                                setRecentVoiceChannelId(channelId);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        }
        void loadRecentVoiceChannel();
        return function () {
            cancelled = true;
        };
    }, [selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id]);
    var sortedCommunities = react_1.default.useMemo(function () {
        var _a;
        return dedupeById(__spreadArray([], ((_a = communities === null || communities === void 0 ? void 0 : communities.communities) !== null && _a !== void 0 ? _a : []), true)).sort(function (a, b) {
            return a.name.localeCompare(b.name, undefined, {
                sensitivity: 'base',
                numeric: true,
            });
        });
    }, [communities === null || communities === void 0 ? void 0 : communities.communities]);
    var orderedCommunities = react_1.default.useMemo(function () { return dedupeById(applyCommunityOrder(sortedCommunities, communityOrder)); }, [communityOrder, sortedCommunities]);
    var reorderCommunity = (0, react_1.useCallback)(function (communityId, direction) {
        var orderedIds = applyCommunityOrder(sortedCommunities, communityOrder).map(function (community) { return community.id; });
        var currentIndex = orderedIds.indexOf(communityId);
        var nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
            return;
        }
        var nextOrder = __spreadArray([], orderedIds, true);
        var movedCommunityId = nextOrder.splice(currentIndex, 1)[0];
        nextOrder.splice(nextIndex, 0, movedCommunityId);
        setCommunityOrder(nextOrder);
        void (0, storage_1.setCommunityOrder)(nextOrder);
    }, [communityOrder, sortedCommunities]);
    var channelRows = react_1.default.useMemo(function () {
        var _a, _b, _c, _d, _e;
        var rows = [];
        var normalizedQuery = channelSearchQuery.trim().toLowerCase();
        var matchesUnreadFilter = function (channel) { var _a; return channelFilter === 'all' || ((_a = channel.unreadCount) !== null && _a !== void 0 ? _a : 0) > 0; };
        var directDmSearchLabel = "".concat(t('dm.filterDirect'), " ").concat(t('dm.historyCompact'));
        var groupDmSearchLabel = "".concat(t('dm.filterGroup'), " ").concat(t('dm.historyCompact'));
        if (((_b = (_a = channelsData === null || channelsData === void 0 ? void 0 : channelsData.uncategorized) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0) {
            var uncategorizedChannels = ((_c = channelsData === null || channelsData === void 0 ? void 0 : channelsData.uncategorized) !== null && _c !== void 0 ? _c : []).filter(function (channel) {
                if (!matchesUnreadFilter(channel)) {
                    return false;
                }
                if (!normalizedQuery) {
                    return true;
                }
                return __spreadArray([
                    channel.name,
                    t('home.uncategorizedChannels')
                ], getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel), true).some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
            });
            if (uncategorizedChannels.length > 0) {
                rows.push({
                    type: 'section',
                    id: 'uncategorized',
                    title: t('home.uncategorizedChannels'),
                });
                for (var _i = 0, uncategorizedChannels_1 = uncategorizedChannels; _i < uncategorizedChannels_1.length; _i++) {
                    var channel = uncategorizedChannels_1[_i];
                    rows.push({
                        type: 'channel',
                        id: channel.id,
                        channel: channel,
                    });
                }
            }
        }
        var _loop_1 = function (category) {
            var filteredChannels = ((_e = category.channels) !== null && _e !== void 0 ? _e : []).filter(function (channel) {
                if (!matchesUnreadFilter(channel)) {
                    return false;
                }
                if (!normalizedQuery) {
                    return true;
                }
                return __spreadArray([
                    channel.name,
                    category.name
                ], getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel), true).some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
            });
            if (filteredChannels.length === 0) {
                return "continue";
            }
            rows.push({
                type: 'section',
                id: "category-".concat(category.id),
                title: category.name,
            });
            for (var _h = 0, filteredChannels_1 = filteredChannels; _h < filteredChannels_1.length; _h++) {
                var channel = filteredChannels_1[_h];
                rows.push({
                    type: 'channel',
                    id: channel.id,
                    channel: channel,
                });
            }
        };
        for (var _f = 0, _g = (_d = channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories) !== null && _d !== void 0 ? _d : []; _f < _g.length; _f++) {
            var category = _g[_f];
            _loop_1(category);
        }
        return dedupeById(rows);
    }, [channelFilter, channelSearchQuery, channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories, channelsData === null || channelsData === void 0 ? void 0 : channelsData.uncategorized, t]);
    var membersData = (0, react_query_1.useQuery)({
        queryKey: ['community-members', selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(selectedCommunity.id, "/members"));
        },
        enabled: !!selectedCommunity,
    }).data;
    var currentCommunityRole = (_c = membersData === null || membersData === void 0 ? void 0 : membersData.members.find(function (member) { return member.userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })) === null || _c === void 0 ? void 0 : _c.role;
    var activeMemberCount = (_d = membersData === null || membersData === void 0 ? void 0 : membersData.members.length) !== null && _d !== void 0 ? _d : 0;
    var canReviewReports = ['owner', 'admin', 'moderator'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canViewAuditLog = ['owner', 'admin'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canManageOnboarding = ['owner', 'admin'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canEditCommunity = ['owner', 'admin'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canManageCategories = ['owner', 'admin'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canManageChannels = ['owner', 'admin'].includes(currentCommunityRole !== null && currentCommunityRole !== void 0 ? currentCommunityRole : '');
    var canDeleteCommunity = (selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.ownerUserId) === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id);
    var allCommunityChannels = react_1.default.useMemo(function () {
        var _a, _b;
        return dedupeById(__spreadArray(__spreadArray([], ((_a = channelsData === null || channelsData === void 0 ? void 0 : channelsData.uncategorized) !== null && _a !== void 0 ? _a : []), true), ((_b = channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories) !== null && _b !== void 0 ? _b : []).flatMap(function (category) { return category.channels; }), true));
    }, [channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories, channelsData === null || channelsData === void 0 ? void 0 : channelsData.uncategorized]);
    var voiceChannels = react_1.default.useMemo(function () { return allCommunityChannels.filter(function (channel) { return channel.type === 'voice'; }); }, [allCommunityChannels]);
    var voiceParticipantQueries = (0, react_query_1.useQueries)({
        queries: voiceChannels.map(function (channel) { return ({
            queryKey: ['voice-participants', channel.id],
            queryFn: function () {
                return (0, api_1.api)("/api/channels/".concat(channel.id, "/voice/participants"));
            },
            enabled: voice_runtime_1.isNativeVoiceCallingAvailable,
            refetchInterval: 15000,
        }); }),
    });
    var voiceParticipantCounts = react_1.default.useMemo(function () {
        var counts = {};
        voiceChannels.forEach(function (channel, index) {
            var _a, _b, _c, _d;
            counts[channel.id] = (_d = (_c = (_b = (_a = voiceParticipantQueries[index]) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.participants) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0;
        });
        return counts;
    }, [voiceChannels, voiceParticipantQueries]);
    var sortedVoiceChannels = react_1.default.useMemo(function () {
        return __spreadArray([], voiceChannels, true).sort(function (left, right) {
            var _a, _b;
            var leftIsRecent = left.id === recentVoiceChannelId ? 1 : 0;
            var rightIsRecent = right.id === recentVoiceChannelId ? 1 : 0;
            if (leftIsRecent !== rightIsRecent) {
                return rightIsRecent - leftIsRecent;
            }
            var countDelta = ((_a = voiceParticipantCounts[right.id]) !== null && _a !== void 0 ? _a : 0) - ((_b = voiceParticipantCounts[left.id]) !== null && _b !== void 0 ? _b : 0);
            if (countDelta !== 0) {
                return countDelta;
            }
            return left.name.localeCompare(right.name, undefined, {
                sensitivity: 'base',
                numeric: true,
            });
        });
    }, [recentVoiceChannelId, voiceChannels, voiceParticipantCounts]);
    var singleVoiceChannel = sortedVoiceChannels.length === 1 ? sortedVoiceChannels[0] : null;
    var leaveCommunityMutation = (0, react_query_1.useMutation)({
        mutationFn: function (communityId) {
            return (0, api_1.api)("/api/communities/".concat(communityId, "/leave"), { method: 'POST' });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setSelectedCommunity(null);
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['communities'] })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['channels'] })];
                    case 2:
                        _a.sent();
                        react_native_1.Alert.alert(t('community.leaveSuccessTitle'), t('community.leaveSuccessBody'));
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            var message = error instanceof Error && error.message.includes('owner cannot leave')
                ? t('community.leaveOwnerBlocked')
                : error instanceof Error
                    ? error.message
                    : t('community.leaveFailed');
            react_native_1.Alert.alert(t('common.error'), message);
        },
    });
    var deleteCommunityMutation = (0, react_query_1.useMutation)({
        mutationFn: function (communityId) {
            return (0, api_1.api)("/api/communities/".concat(communityId), { method: 'DELETE' });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setSelectedCommunity(null);
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['communities'] })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['channels'] })];
                    case 2:
                        _a.sent();
                        react_native_1.Alert.alert(t('community.deleteSuccessTitle'), t('community.deleteSuccessBody'));
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.deleteFailed'));
        },
    });
    var handleChannelPress = (0, react_1.useCallback)(function (item) {
        if (!selectedCommunity)
            return;
        if (item.type === 'voice') {
            if (!voice_runtime_1.isNativeVoiceCallingAvailable) {
                react_native_1.Alert.alert(t('voice.notAvailableTitle'), t('voice.notAvailableBody'));
                return;
            }
            navigation.navigate('VoiceCallScreen', {
                channelId: item.id,
                channelName: item.name,
                communityId: selectedCommunity.id,
            });
        }
        else if (item.type === 'forum') {
            navigation.navigate('ForumChannelScreen', {
                communityId: selectedCommunity.id,
                channelId: item.id,
                channelName: item.name,
            });
        }
        else {
            navigation.navigate('ChannelScreen', {
                communityId: selectedCommunity.id,
                channelId: item.id,
                channelName: item.name,
            });
        }
    }, [navigation, selectedCommunity, t]);
    var handleCommunityPress = (0, react_1.useCallback)(function (item) {
        setSelectedCommunity(item);
    }, []);
    var handleCreateChannelPress = (0, react_1.useCallback)(function () {
        if (!selectedCommunity || !canManageChannels)
            return;
        navigation.navigate('CreateChannel', {
            communityId: selectedCommunity.id,
        });
    }, [canManageChannels, navigation, selectedCommunity]);
    var handleJoinInvitePress = (0, react_1.useCallback)(function () {
        navigation.navigate('JoinInvite');
    }, [navigation]);
    var handleShareProfilePress = (0, react_1.useCallback)(function () {
        var _a;
        (_a = navigation.getParent()) === null || _a === void 0 ? void 0 : _a.navigate('FriendsTab');
    }, [navigation]);
    var handleShareInvitePress = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var inviteCode_1, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedCommunity)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    inviteCode_1 = inviteCodesByCommunity[selectedCommunity.id];
                    if (!!inviteCode_1) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, api_1.api)("/api/communities/".concat(selectedCommunity.id, "/invites"), {
                            method: 'POST',
                            body: {},
                        })];
                case 2:
                    result = _a.sent();
                    inviteCode_1 = result.invite.code;
                    setInviteCodesByCommunity(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[selectedCommunity.id] = inviteCode_1, _a)));
                    });
                    _a.label = 3;
                case 3: return [4 /*yield*/, react_native_1.Share.share({
                        title: selectedCommunity.name,
                        message: t('community.inviteShareText', {
                            community: selectedCommunity.name,
                            code: inviteCode_1,
                            link: "".concat(network_config_1.WEB_ORIGIN, "/invite/").concat(inviteCode_1),
                        }),
                    })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), (0, error_message_1.getUserFacingErrorMessage)(error_1, t, {
                        fallbackKey: 'community.inviteShareFailed',
                        rateLimitedKey: 'community.inviteRateLimited',
                    }));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [inviteCodesByCommunity, selectedCommunity, t]);
    var handleMembersPress = (0, react_1.useCallback)(function () {
        if (!selectedCommunity)
            return;
        navigation.navigate('CommunityMembers', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
        });
    }, [navigation, selectedCommunity]);
    var handleEventsPress = (0, react_1.useCallback)(function () {
        if (!selectedCommunity)
            return;
        navigation.navigate('CommunityEvents', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
        });
    }, [navigation, selectedCommunity]);
    var handleVoiceEntryPress = (0, react_1.useCallback)(function (channel, startWithVideo) {
        if (!selectedCommunity)
            return;
        if (!voice_runtime_1.isNativeVoiceCallingAvailable) {
            react_native_1.Alert.alert(t('voice.notAvailableTitle'), t('voice.notAvailableBody'));
            return;
        }
        navigation.navigate('VoiceCallScreen', {
            communityId: selectedCommunity.id,
            channelId: channel.id,
            channelName: channel.name,
            startWithVideo: startWithVideo,
        });
    }, [navigation, selectedCommunity, t]);
    var handleCommunityMenuPress = (0, react_1.useCallback)(function () {
        if (!selectedCommunity)
            return;
        var actions = [
            { text: t('common.cancel'), style: 'cancel' },
        ];
        actions.push({
            text: t('community.eventsMenu'),
            onPress: function () {
                navigation.navigate('CommunityEvents', {
                    communityId: selectedCommunity.id,
                    communityName: selectedCommunity.name,
                });
            },
        });
        if (canReviewReports) {
            actions.push({
                text: t('community.reportsMenu'),
                onPress: function () {
                    navigation.navigate('CommunityReports', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                    });
                },
            });
        }
        if (canViewAuditLog) {
            actions.push({
                text: t('community.auditLogMenu'),
                onPress: function () {
                    navigation.navigate('CommunityAuditLog', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                    });
                },
            });
        }
        if (canManageOnboarding) {
            actions.push({
                text: t('community.onboardingMenu'),
                onPress: function () {
                    navigation.navigate('CommunityOnboarding', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                    });
                },
            });
        }
        if (canEditCommunity) {
            actions.push({
                text: t('community.edit'),
                onPress: function () {
                    navigation.navigate('EditCommunity', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                        iconUrl: selectedCommunity.iconUrl,
                        description: selectedCommunity.description,
                        visibility: selectedCommunity.visibility,
                    });
                },
            });
        }
        if (canManageCategories) {
            actions.push({
                text: t('channel.categoriesMenu'),
                onPress: function () {
                    navigation.navigate('ManageCategories', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                    });
                },
            });
        }
        if (canManageChannels) {
            actions.push({
                text: t('channel.create'),
                onPress: function () {
                    navigation.navigate('CreateChannel', {
                        communityId: selectedCommunity.id,
                    });
                },
            });
            actions.push({
                text: t('channel.orderMenu'),
                onPress: function () {
                    navigation.navigate('ManageChannels', {
                        communityId: selectedCommunity.id,
                        communityName: selectedCommunity.name,
                    });
                },
            });
        }
        if (canDeleteCommunity) {
            actions.push({
                text: t('community.delete'),
                style: 'destructive',
                onPress: function () {
                    react_native_1.Alert.alert(t('community.deleteConfirmTitle'), t('community.deleteConfirmBody'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('community.delete'),
                            style: 'destructive',
                            onPress: function () { return deleteCommunityMutation.mutate(selectedCommunity.id); },
                        },
                    ]);
                },
            });
        }
        if (!canDeleteCommunity) {
            actions.push({
                text: t('community.leave'),
                style: 'destructive',
                onPress: function () {
                    react_native_1.Alert.alert(t('community.leaveConfirmTitle'), t('community.leaveConfirmBody'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('community.leave'),
                            style: 'destructive',
                            onPress: function () { return leaveCommunityMutation.mutate(selectedCommunity.id); },
                        },
                    ]);
                },
            });
        }
        react_native_1.Alert.alert(selectedCommunity.name, t('community.manageBody'), actions);
    }, [
        canDeleteCommunity,
        canEditCommunity,
        canManageCategories,
        canManageChannels,
        canManageOnboarding,
        canReviewReports,
        canViewAuditLog,
        deleteCommunityMutation,
        leaveCommunityMutation,
        navigation,
        selectedCommunity,
        t,
    ]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttempted) {
            return;
        }
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, targetCommunity, communityId, error_2;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-home-action.json')];
                        case 1:
                            action = _c.sent();
                            if (!action)
                                return [2 /*return*/];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 15, , 17]);
                            if (action.type !== 'leave' && action.type !== 'delete') {
                                throw new Error('Unsupported home dev action');
                            }
                            if (!action.communityId) {
                                throw new Error('No selected community for home dev action');
                            }
                            targetCommunity = (selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id) === action.communityId
                                ? selectedCommunity
                                : ((_a = communities === null || communities === void 0 ? void 0 : communities.communities) !== null && _a !== void 0 ? _a : []).find(function (community) { return community.id === action.communityId; });
                            if (!!targetCommunity) return [3 /*break*/, 7];
                            if (!(action.type === 'delete')) return [3 /*break*/, 5];
                            setDevActionAttempted(true);
                            return [4 /*yield*/, deleteCommunityMutation.mutateAsync(action.communityId)];
                        case 3:
                            _c.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-home-result.json', {
                                    ok: true,
                                    action: action.type,
                                    communityId: action.communityId,
                                    status: 'deleted-without-local-selection',
                                })];
                        case 4:
                            _c.sent();
                            return [2 /*return*/];
                        case 5: return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-home-result.json', {
                                ok: false,
                                pending: true,
                                action: action.type,
                                communityId: action.communityId,
                                availableCommunityIds: ((_b = communities === null || communities === void 0 ? void 0 : communities.communities) !== null && _b !== void 0 ? _b : []).map(function (community) { return community.id; }),
                            })];
                        case 6:
                            _c.sent();
                            return [2 /*return*/];
                        case 7:
                            if (!((selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.id) !== targetCommunity.id)) return [3 /*break*/, 9];
                            setSelectedCommunity(targetCommunity);
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-home-result.json', {
                                    ok: false,
                                    pending: true,
                                    action: action.type,
                                    communityId: action.communityId,
                                    selectedCommunityId: targetCommunity.id,
                                    status: 'selected-target-community',
                                })];
                        case 8:
                            _c.sent();
                            return [2 /*return*/];
                        case 9:
                            communityId = targetCommunity.id;
                            setDevActionAttempted(true);
                            if (!(action.type === 'delete')) return [3 /*break*/, 11];
                            return [4 /*yield*/, deleteCommunityMutation.mutateAsync(communityId)];
                        case 10:
                            _c.sent();
                            return [3 /*break*/, 13];
                        case 11: return [4 /*yield*/, leaveCommunityMutation.mutateAsync(communityId)];
                        case 12:
                            _c.sent();
                            _c.label = 13;
                        case 13: return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-home-result.json', {
                                ok: true,
                                action: action.type,
                                communityId: communityId,
                            })];
                        case 14:
                            _c.sent();
                            return [3 /*break*/, 17];
                        case 15:
                            error_2 = _c.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-home-result.json', {
                                    ok: false,
                                    error: error_2 instanceof Error ? error_2.message : String(error_2),
                                })];
                        case 16:
                            _c.sent();
                            return [3 /*break*/, 17];
                        case 17: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [
        communities === null || communities === void 0 ? void 0 : communities.communities,
        deleteCommunityMutation,
        devActionAttempted,
        leaveCommunityMutation,
        selectedCommunity,
    ]);
    var selectedCommunityIconUrl = (0, community_image_1.getVersionedImageUrl)(selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.iconUrl, selectedCommunity === null || selectedCommunity === void 0 ? void 0 : selectedCommunity.updatedAt);
    if (isLoading) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    // Channel list view
    if (selectedCommunity) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.container}>
          <react_native_1.View style={styles.communityHeader}>
            <react_native_1.View style={styles.communityHeaderTop}>
              <react_native_1.TouchableOpacity style={styles.backButton} onPress={function () { return setSelectedCommunity(null); }}>
                <react_native_1.Text style={styles.backArrow}>{"\u2190"}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={styles.menuButton} onPress={handleCommunityMenuPress} hitSlop={8} disabled={leaveCommunityMutation.isPending}>
                <react_native_1.Text style={styles.menuButtonText}>{"\u22EF"}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.View style={styles.communityHeroCard}>
              <react_native_1.View style={styles.communityHeroMain}>
                <react_native_1.View style={[
                styles.headerIcon,
                { backgroundColor: getCommunityColor(selectedCommunity.name) },
            ]}>
                  {selectedCommunityIconUrl ? (<react_native_1.Image source={{ uri: selectedCommunityIconUrl }} style={styles.headerIconImage}/>) : (<react_native_1.Text style={styles.headerIconText}>
                      {selectedCommunity.name.charAt(0).toUpperCase()}
                    </react_native_1.Text>)}
                </react_native_1.View>
                <react_native_1.View style={styles.headerInfo}>
                  <react_native_1.Text style={styles.headerTitle} numberOfLines={1}>
                    {selectedCommunity.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.headerSubtitle} numberOfLines={2}>
                    {((_e = selectedCommunity.description) === null || _e === void 0 ? void 0 : _e.trim()) || t('community.manageBody')}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
              <react_native_1.View style={styles.communityActionRow}>
                <react_native_1.TouchableOpacity style={styles.communityActionChip} onPress={handleMembersPress} activeOpacity={0.8}>
                  <react_native_1.Text style={styles.communityActionChipText}>
                    {activeMemberCount === 1
                ? t('discover.member', { count: activeMemberCount })
                : t('discover.members', { count: activeMemberCount })}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.communityActionChip} onPress={handleEventsPress} activeOpacity={0.8}>
                  <react_native_1.Text style={styles.communityActionChipText}>
                    {t('community.eventsMenu')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.communityActionChip} onPress={handleShareInvitePress} activeOpacity={0.8}>
                  <react_native_1.Text style={styles.communityActionChipText}>
                    {t('invite.inviteMembers')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                {singleVoiceChannel ? (<react_native_1.TouchableOpacity style={styles.communityActionChip} onPress={function () { return handleVoiceEntryPress(singleVoiceChannel, false); }} activeOpacity={0.8}>
                    <react_native_1.Text style={styles.communityActionChipText}>
                      {"".concat(t('voice.join'), " \u00B7 #").concat(singleVoiceChannel.name)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
                {singleVoiceChannel ? (<react_native_1.TouchableOpacity style={styles.communityActionChip} onPress={function () { return handleVoiceEntryPress(singleVoiceChannel, true); }} activeOpacity={0.8}>
                    <react_native_1.Text style={styles.communityActionChipText}>
                      {"".concat(t('voice.videoCall'), " \u00B7 #").concat(singleVoiceChannel.name)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
                {canManageChannels ? (<react_native_1.TouchableOpacity style={styles.communityActionChipPrimary} onPress={handleCreateChannelPress} activeOpacity={0.8}>
                    <react_native_1.Text style={styles.communityActionChipPrimaryText}>
                      {t('channel.create')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
              </react_native_1.View>
              {sortedVoiceChannels.length > 1 ? (<react_native_1.View style={styles.voiceChannelChooser}>
                  <react_native_1.Text style={styles.communityVoiceHint}>{t('voice.chooseChannel')}</react_native_1.Text>
                  <react_native_1.View style={styles.voiceChannelList}>
                    {sortedVoiceChannels.map(function (channel) {
                    var _a, _b, _c;
                    return (<react_native_1.View key={channel.id} style={styles.voiceChannelRow}>
                        <react_native_1.View style={styles.voiceChannelInfo}>
                          <react_native_1.View style={styles.voiceChannelNameRow}>
                            <react_native_1.Text style={styles.voiceChannelName} numberOfLines={1}>
                              #{channel.name}
                            </react_native_1.Text>
                            {channel.id === recentVoiceChannelId ? (<react_native_1.View style={styles.voiceChannelRecentBadge}>
                                <react_native_1.Text style={styles.voiceChannelRecentBadgeText}>
                                  {t('voice.recentChannel')}
                                </react_native_1.Text>
                              </react_native_1.View>) : null}
                            {((_a = voiceParticipantCounts[channel.id]) !== null && _a !== void 0 ? _a : 0) > 0 ? (<react_native_1.View style={styles.voiceChannelLiveBadge}>
                                <react_native_1.Text style={styles.voiceChannelLiveBadgeText}>{t('voice.liveNow')}</react_native_1.Text>
                              </react_native_1.View>) : null}
                          </react_native_1.View>
                          <react_native_1.Text style={styles.voiceChannelSecondary}>
                            {((_b = voiceParticipantCounts[channel.id]) !== null && _b !== void 0 ? _b : 0) > 0
                            ? t('voice.participants', {
                                count: String((_c = voiceParticipantCounts[channel.id]) !== null && _c !== void 0 ? _c : 0),
                            })
                            : t('voice.waitingForOthers')}
                          </react_native_1.Text>
                        </react_native_1.View>
                        <react_native_1.View style={styles.voiceChannelActions}>
                          <react_native_1.TouchableOpacity style={styles.voiceChannelChip} onPress={function () { return handleVoiceEntryPress(channel, false); }} activeOpacity={0.8}>
                            <react_native_1.Text style={styles.voiceChannelChipText}>{t('voice.join')}</react_native_1.Text>
                          </react_native_1.TouchableOpacity>
                          <react_native_1.TouchableOpacity style={styles.voiceChannelChip} onPress={function () { return handleVoiceEntryPress(channel, true); }} activeOpacity={0.8}>
                            <react_native_1.Text style={styles.voiceChannelChipText}>{t('voice.videoCall')}</react_native_1.Text>
                          </react_native_1.TouchableOpacity>
                        </react_native_1.View>
                      </react_native_1.View>);
                })}
                  </react_native_1.View>
                </react_native_1.View>) : sortedVoiceChannels.length === 1 ? (<react_native_1.View style={styles.voiceChannelChooser}>
                  <react_native_1.Text style={styles.communityVoiceHint}>
                    {voice_runtime_1.isNativeVoiceCallingAvailable
                    ? t('voice.supportReady')
                    : t('voice.supportRequiresBuild')}
                  </react_native_1.Text>
                  <react_native_1.View style={styles.voiceChannelRow}>
                      <react_native_1.View style={styles.voiceChannelInfo}>
                        <react_native_1.View style={styles.voiceChannelNameRow}>
                          <react_native_1.Text style={styles.voiceChannelName} numberOfLines={1}>
                            #{singleVoiceChannel.name}
                          </react_native_1.Text>
                          {singleVoiceChannel.id === recentVoiceChannelId ? (<react_native_1.View style={styles.voiceChannelRecentBadge}>
                              <react_native_1.Text style={styles.voiceChannelRecentBadgeText}>
                                {t('voice.recentChannel')}
                              </react_native_1.Text>
                            </react_native_1.View>) : null}
                          {((_f = voiceParticipantCounts[singleVoiceChannel.id]) !== null && _f !== void 0 ? _f : 0) > 0 ? (<react_native_1.View style={styles.voiceChannelLiveBadge}>
                              <react_native_1.Text style={styles.voiceChannelLiveBadgeText}>{t('voice.liveNow')}</react_native_1.Text>
                            </react_native_1.View>) : null}
                      </react_native_1.View>
                    </react_native_1.View>
                    <react_native_1.View style={styles.voiceChannelMeta}>
                      <react_native_1.Text style={styles.voiceChannelMetaText}>
                        {((_g = voiceParticipantCounts[singleVoiceChannel.id]) !== null && _g !== void 0 ? _g : 0) > 0
                    ? t('voice.participants', {
                        count: String((_h = voiceParticipantCounts[singleVoiceChannel.id]) !== null && _h !== void 0 ? _h : 0),
                    })
                    : t('voice.waitingForOthers')}
                      </react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.View>) : (<react_native_1.Text style={styles.communityVoiceHint}>{t('voice.noChannelsInCommunity')}</react_native_1.Text>)}
            </react_native_1.View>
          </react_native_1.View>

          {/* Channel list */}
          {channelsLoading ? (<react_native_1.View style={styles.center}>
              <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
            </react_native_1.View>) : (<react_native_1.FlatList testID="home-channel-list" data={channelRows} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={isFocused && channelsRefetching} onRefresh={refetchChannels} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
                    var item = _a.item;
                    return item.type === 'section' ? (<ChannelSectionHeader title={item.title}/>) : ((function () {
                        var _a, _b, _c, _d;
                        var sourceDmName = (_c = (_b = (_a = item.channel.sourceDmConversation) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : '';
                        var normalizedChannelQuery = channelSearchQuery.trim().toLowerCase();
                        var sourceDmMatchLabel = normalizedChannelQuery.length > 0 &&
                            sourceDmName.length > 0 &&
                            sourceDmName.toLowerCase().includes(normalizedChannelQuery) &&
                            !item.channel.name.toLowerCase().includes(normalizedChannelQuery)
                            ? t('channel.sourceDmNameLabelWithName', { name: sourceDmName })
                            : undefined;
                        var voiceParticipantCount = (_d = voiceParticipantCounts[item.channel.id]) !== null && _d !== void 0 ? _d : 0;
                        var voiceStatusLabel = item.channel.type === 'voice'
                            ? voiceParticipantCount > 0
                                ? t('voice.participants', { count: String(voiceParticipantCount) })
                                : item.channel.id === recentVoiceChannelId
                                    ? t('voice.recentChannel')
                                    : undefined
                            : undefined;
                        return (<ChannelListItem item={item.channel} onPress={handleChannelPress} voiceLabel={t('home.voice')} sourceDmLabel={t('dm.historyCompact')} directDmLabel={"".concat(t('dm.filterDirect'), " ").concat(t('dm.historyCompact'))} groupDmLabel={"".concat(t('dm.filterGroup'), " ").concat(t('dm.historyCompact'))} sourceDmMatchLabel={sourceDmMatchLabel} voiceStatusLabel={voiceStatusLabel} isRecentVoiceChannel={item.channel.id === recentVoiceChannelId} isLiveVoiceChannel={voiceParticipantCount > 0}/>);
                    })());
                }} ListEmptyComponent={<react_native_1.View style={styles.emptyContainer}>
                  <react_native_1.Text style={styles.emptyIcon}>{"\uD83D\uDCAD"}</react_native_1.Text>
                  <react_native_1.Text style={styles.emptyText}>
                    {channelSearchQuery.trim()
                        ? t('home.noChannelSearchResults')
                        : channelFilter === 'unread'
                            ? t('home.noUnreadChannels')
                            : t('home.noChannels')}
                  </react_native_1.Text>
                  {channelSearchQuery.trim() || channelFilter === 'unread' ? (<react_native_1.Text style={styles.emptyHint}>
                      {channelSearchQuery.trim()
                            ? t('home.noChannelSearchResultsBody')
                            : t('home.noUnreadChannelsBody')}
                    </react_native_1.Text>) : null}
                </react_native_1.View>} ListHeaderComponent={<react_native_1.View style={styles.listHeaderWrap}>
                  {(canManageChannels || canManageCategories) && (<react_native_1.View style={styles.manageActionsRow}>
                      {canManageChannels ? (<react_native_1.TouchableOpacity style={styles.primaryManageAction} onPress={handleCreateChannelPress} activeOpacity={0.85}>
                          <react_native_1.Text style={styles.primaryManageActionIcon}>+</react_native_1.Text>
                          <react_native_1.Text style={styles.primaryManageActionText}>
                            {t('channel.create')}
                          </react_native_1.Text>
                        </react_native_1.TouchableOpacity>) : null}
                      {canManageCategories ? (<react_native_1.TouchableOpacity style={styles.secondaryManageAction} onPress={function () {
                                return navigation.navigate('ManageCategories', {
                                    communityId: selectedCommunity.id,
                                    communityName: selectedCommunity.name,
                                });
                            }} activeOpacity={0.85}>
                          <react_native_1.Text style={styles.secondaryManageActionText}>
                            {t('channel.categoriesMenu')}
                          </react_native_1.Text>
                        </react_native_1.TouchableOpacity>) : null}
                      {canManageChannels ? (<react_native_1.TouchableOpacity style={styles.secondaryManageAction} onPress={function () {
                                return navigation.navigate('ManageChannels', {
                                    communityId: selectedCommunity.id,
                                    communityName: selectedCommunity.name,
                                });
                            }} activeOpacity={0.85}>
                          <react_native_1.Text style={styles.secondaryManageActionText}>
                            {t('channel.orderMenu')}
                          </react_native_1.Text>
                        </react_native_1.TouchableOpacity>) : null}
                    </react_native_1.View>)}
                  <react_native_1.TextInput style={styles.searchInput} value={channelSearchQuery} onChangeText={setChannelSearchQuery} placeholder={t('home.channelSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
                  <react_native_1.View style={styles.filterRow}>
                    <react_native_1.TouchableOpacity style={[
                        styles.filterChip,
                        channelFilter === 'all' && styles.filterChipActive,
                    ]} onPress={function () { return setChannelFilter('all'); }} activeOpacity={0.8}>
                      <react_native_1.Text style={[
                        styles.filterChipText,
                        channelFilter === 'all' && styles.filterChipTextActive,
                    ]}>
                        {t('home.filterAll')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TouchableOpacity style={[
                        styles.filterChip,
                        channelFilter === 'unread' && styles.filterChipActive,
                    ]} onPress={function () { return setChannelFilter('unread'); }} activeOpacity={0.8}>
                      <react_native_1.Text style={[
                        styles.filterChipText,
                        channelFilter === 'unread' && styles.filterChipTextActive,
                    ]}>
                        {t('home.filterUnread')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>
                </react_native_1.View>} ListFooterComponent={canManageChannels ? (<react_native_1.TouchableOpacity style={styles.createChannelFooter} onPress={handleCreateChannelPress} activeOpacity={0.8}>
                    <react_native_1.Text style={styles.createChannelIcon}>+</react_native_1.Text>
                    <react_native_1.Text style={styles.createChannelFooterText}>{t('channel.create')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null} contentContainerStyle={[
                    styles.channelList,
                    channelRows.length === 0 && styles.emptyList,
                ]}/>)}
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    // Community list view
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.container}>
        {/* App header */}
        <react_native_1.View style={styles.appHeader}>
          <react_native_1.Text style={styles.appTitle}>{t('app.name')}</react_native_1.Text>
        </react_native_1.View>

        <react_native_1.FlatList testID="home-community-list" data={orderedCommunities} keyExtractor={function (item) { return item.id; }} getItemLayout={communityGetItemLayout} refreshControl={<react_native_1.RefreshControl refreshing={isFocused && communitiesRefetching} onRefresh={refetchCommunities} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var item = _a.item, index = _a.index;
            return (<CommunityListItem item={item} onPress={handleCommunityPress} onMoveUp={function (communityId) { return reorderCommunity(communityId, -1); }} onMoveDown={function (communityId) { return reorderCommunity(communityId, 1); }} canMoveUp={index > 0} canMoveDown={index < orderedCommunities.length - 1} moveUpLabel={t('channel.orderMoveUp')} moveDownLabel={t('channel.orderMoveDown')}/>);
        }} ListHeaderComponent={<react_native_1.View style={styles.listHeaderWrap}>
              <react_native_1.View style={styles.quickStartCard}>
                <react_native_1.Text style={styles.quickStartTitle}>{t('home.quickStartTitle')}</react_native_1.Text>
                <react_native_1.Text style={styles.quickStartBody}>{t('home.quickStartBody')}</react_native_1.Text>
                <react_native_1.View style={styles.quickStartActions}>
                  <react_native_1.TouchableOpacity style={styles.quickStartPrimaryAction} onPress={handleJoinInvitePress}>
                    <react_native_1.Text style={styles.quickStartPrimaryActionText}>
                      {t('community.joinInviteCta')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={styles.quickStartSecondaryAction} onPress={function () { return navigation.navigate('CreateCommunity'); }}>
                    <react_native_1.Text style={styles.quickStartSecondaryActionText}>
                      {t('home.createCommunity')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={styles.quickStartSecondaryAction} onPress={handleShareProfilePress}>
                    <react_native_1.Text style={styles.quickStartSecondaryActionText}>
                      {t('friends.shareProfile')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>} ListEmptyComponent={<react_native_1.View style={styles.emptyContainer}>
              <react_native_1.Text style={styles.emptyIcon}>{"\uD83C\uDF0D"}</react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>{t('home.noCommunities')}</react_native_1.Text>
              <react_native_1.Text style={styles.emptyHint}>{t('home.noCommunityHint')}</react_native_1.Text>
              <react_native_1.TouchableOpacity style={styles.joinInviteCta} onPress={handleJoinInvitePress}>
                <react_native_1.Text style={styles.joinInviteCtaText}>{t('community.joinInviteCta')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={styles.createCommunityButton} onPress={function () { return navigation.navigate('CreateCommunity'); }}>
                <react_native_1.Text style={styles.createCommunityText}>{t('home.createCommunity')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>} contentContainerStyle={orderedCommunities.length === 0
            ? [styles.communityList, styles.emptyList]
            : styles.communityList}/>
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
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.xxl,
        paddingBottom: theme_1.spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: theme_1.colors.border,
    },
    listHeaderWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    quickStartCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.md,
    },
    quickStartTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '800',
    },
    quickStartBody: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
        marginTop: theme_1.spacing.xs,
    },
    quickStartActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    quickStartPrimaryAction: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    quickStartPrimaryActionText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    quickStartSecondaryAction: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    quickStartSecondaryActionText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    manageActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.md,
    },
    primaryManageAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    primaryManageActionIcon: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
        marginRight: theme_1.spacing.xs,
    },
    primaryManageActionText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    secondaryManageAction: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.md,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    secondaryManageActionText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.sm,
    },
    filterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.xl,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    filterChipActive: {
        backgroundColor: theme_1.colors.primary + '22',
        borderColor: theme_1.colors.primary,
    },
    filterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: theme_1.colors.primary,
    },
    appTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '800',
    },
    communityHeader: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: theme_1.colors.border,
    },
    communityHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme_1.spacing.sm,
    },
    communityHeroCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    communityHeroMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: theme_1.spacing.sm,
    },
    backArrow: {
        color: theme_1.colors.primary,
        fontSize: 22,
        fontWeight: '600',
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: theme_1.borderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.md,
    },
    headerIconText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    headerIconImage: {
        width: '100%',
        height: '100%',
        borderRadius: theme_1.borderRadius.sm,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 3,
        lineHeight: 18,
    },
    menuButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme_1.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: theme_1.spacing.sm,
    },
    menuButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: 18,
        lineHeight: 18,
    },
    communityActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
    },
    communityVoiceHint: {
        marginTop: theme_1.spacing.sm,
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    voiceChannelChooser: {
        marginTop: theme_1.spacing.sm,
        gap: theme_1.spacing.sm,
    },
    voiceChannelList: {
        gap: theme_1.spacing.sm,
    },
    voiceChannelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.md,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    voiceChannelInfo: {
        flex: 1,
        gap: 2,
    },
    voiceChannelNameRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
    },
    voiceChannelName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.md,
        fontWeight: '700',
    },
    voiceChannelSecondary: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
    },
    voiceChannelActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
    },
    voiceChannelMeta: {
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.surface,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
    },
    voiceChannelMetaText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    voiceChannelLiveBadge: {
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.success + '20',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
    },
    voiceChannelLiveBadgeText: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    voiceChannelRecentBadge: {
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primary + '20',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
    },
    voiceChannelRecentBadgeText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    voiceChannelChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    voiceChannelChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    communityActionChip: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    communityActionChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    communityActionChipPrimary: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    communityActionChipPrimaryText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    communityList: {
        paddingVertical: theme_1.spacing.sm,
    },
    channelList: {
        flexGrow: 1,
        paddingVertical: theme_1.spacing.sm,
    },
    channelSectionHeader: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.sm,
    },
    channelSectionTitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    communityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    communityItemMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingVertical: theme_1.spacing.sm,
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
    communityIconImage: {
        width: '100%',
        height: '100%',
        borderRadius: theme_1.borderRadius.md,
    },
    communityReorderActions: {
        marginLeft: theme_1.spacing.sm,
        gap: theme_1.spacing.xs,
    },
    communityReorderButton: {
        width: 30,
        height: 28,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    communityReorderButtonDisabled: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderColor: "".concat(theme_1.colors.border, "66"),
    },
    communityReorderButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    communityReorderButtonTextDisabled: {
        color: theme_1.colors.textMuted,
    },
    communityInfo: {
        flex: 1,
    },
    communityName: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    communityDesc: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: 2,
    },
    chevron: {
        color: theme_1.colors.textMuted,
        fontSize: 24,
        marginLeft: theme_1.spacing.sm,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    channelIcon: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
        width: 28,
        textAlign: 'center',
        marginRight: theme_1.spacing.sm,
    },
    channelName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.body,
    },
    channelCopy: {
        flex: 1,
    },
    channelSourceMatch: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        marginTop: 2,
    },
    channelVoiceStatus: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        marginTop: 2,
    },
    sourceDmBadge: {
        backgroundColor: '#e8f1f7',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.sm,
        marginLeft: theme_1.spacing.xs,
    },
    sourceDmBadgeText: {
        color: '#577086',
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    voiceBadge: {
        backgroundColor: theme_1.colors.success + '20',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.sm,
        marginLeft: theme_1.spacing.sm,
    },
    voiceBadgeText: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '600',
    },
    voiceRecentListBadge: {
        backgroundColor: theme_1.colors.primary + '20',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.sm,
        marginLeft: theme_1.spacing.xs,
    },
    voiceRecentListBadgeText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    voiceLiveListBadge: {
        backgroundColor: theme_1.colors.success + '20',
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme_1.borderRadius.sm,
        marginLeft: theme_1.spacing.xs,
    },
    voiceLiveListBadgeText: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
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
        textAlign: 'center',
        marginTop: theme_1.spacing.sm,
    },
    createChannelIcon: {
        color: theme_1.colors.primary,
        fontSize: 20,
        fontWeight: '700',
        width: 28,
        textAlign: 'center',
    },
    createChannelFooter: {
        marginHorizontal: theme_1.spacing.lg,
        marginTop: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        paddingVertical: theme_1.spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme_1.colors.primary,
        borderStyle: 'dashed',
    },
    createChannelFooterText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    createCommunityButton: {
        marginTop: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.primary,
        paddingHorizontal: theme_1.spacing.xl,
        paddingVertical: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.xl,
    },
    joinInviteCta: {
        marginTop: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.surface,
        paddingHorizontal: theme_1.spacing.xl,
        paddingVertical: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.xl,
    },
    joinInviteCtaText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        fontWeight: '700',
    },
    createCommunityText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.md,
        fontWeight: '700',
    },
});
