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
exports.default = CommunityMembersScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
function getRoleLabel(role, t) {
    switch (role) {
        case 'owner':
            return t('community.roleOwner');
        case 'admin':
            return t('community.roleAdmin');
        case 'moderator':
            return t('community.roleModerator');
        case 'member':
            return t('community.roleMember');
        default:
            return role;
    }
}
function CommunityMembersScreen(_a) {
    var _this = this;
    var _b, _c, _d;
    var route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var navigation = (0, native_1.useNavigation)();
    var currentUser = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var queryClient = (0, react_query_1.useQueryClient)();
    var _e = (0, react_1.useState)(''), searchQuery = _e[0], setSearchQuery = _e[1];
    var _f = (0, react_1.useState)(null), selectedRoleFilter = _f[0], setSelectedRoleFilter = _f[1];
    var _g = (0, react_1.useState)('name'), sortField = _g[0], setSortField = _g[1];
    var _h = (0, react_1.useState)('asc'), sortOrder = _h[0], setSortOrder = _h[1];
    var devActionAttemptedRef = react_1.default.useRef(false);
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['community-members', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/members"));
        },
    }), data = _j.data, isLoading = _j.isLoading, refetch = _j.refetch, isRefetching = _j.isRefetching;
    var rolesData = (0, react_query_1.useQuery)({
        queryKey: ['community-roles', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/roles"));
        },
    }).data;
    var createDmMutation = (0, react_query_1.useMutation)({
        mutationFn: function (targetUserId) {
            return (0, api_1.api)('/api/dm/conversations', {
                method: 'POST',
                body: { targetUserId: targetUserId },
            });
        },
    });
    var moderateMemberMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var membershipId = _a.membershipId, action = _a.action;
            return (0, api_1.api)("/api/members/".concat(membershipId, "/").concat(action), {
                method: 'POST',
                body: {},
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({
                                queryKey: ['community-members', route.params.communityId],
                            }),
                            queryClient.invalidateQueries({
                                queryKey: ['community-audit-log', route.params.communityId],
                            }),
                        ])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.memberActionFailed'));
        },
    });
    var assignRoleMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var userId = _a.userId, role = _a.role;
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/members/").concat(userId, "/role"), {
                method: 'PATCH',
                body: { role: role },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({
                                queryKey: ['community-members', route.params.communityId],
                            }),
                            queryClient.invalidateQueries({
                                queryKey: ['community-audit-log', route.params.communityId],
                            }),
                        ])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.memberRoleChangeFailed'));
        },
    });
    var handleMessage = (0, react_1.useCallback)(function (member) { return __awaiter(_this, void 0, void 0, function () {
        var result, conversationId, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, createDmMutation.mutateAsync(member.userId)];
                case 1:
                    result = _c.sent();
                    conversationId = (_a = result.id) !== null && _a !== void 0 ? _a : (_b = result.conversation) === null || _b === void 0 ? void 0 : _b.id;
                    if (!conversationId) {
                        throw new Error(t('community.membersMessageFailed'));
                    }
                    navigation.navigate('Main', {
                        screen: 'DmTab',
                        params: {
                            screen: 'DmScreen',
                            params: {
                                conversationId: conversationId,
                                userId: member.userId,
                                displayName: member.displayName,
                            },
                        },
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('community.membersMessageFailed'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [createDmMutation, navigation, t]);
    var members = (_b = data === null || data === void 0 ? void 0 : data.members) !== null && _b !== void 0 ? _b : [];
    var rolePriorityMap = (0, react_1.useMemo)(function () {
        var _a;
        return new Map(((_a = rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles) !== null && _a !== void 0 ? _a : []).map(function (role) { return [role.name, role.priority]; }));
    }, [rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles]);
    var availableRoleFilters = (0, react_1.useMemo)(function () {
        var roleNames = Array.from(new Set(members.map(function (member) { return member.role; })));
        return roleNames.sort(function (a, b) { return a.localeCompare(b); });
    }, [members]);
    var filteredMembers = (0, react_1.useMemo)(function () {
        var filtered = members.filter(function (member) {
            if (selectedRoleFilter && member.role !== selectedRoleFilter) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [
                member.displayName,
                member.role,
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            var _a, _b;
            if (sortField === 'role') {
                var left_1 = (_a = rolePriorityMap.get(a.role)) !== null && _a !== void 0 ? _a : Number.NEGATIVE_INFINITY;
                var right_1 = (_b = rolePriorityMap.get(b.role)) !== null && _b !== void 0 ? _b : Number.NEGATIVE_INFINITY;
                if (left_1 !== right_1) {
                    return sortOrder === 'asc' ? right_1 - left_1 : left_1 - right_1;
                }
                var leftName = a.displayName.toLocaleLowerCase();
                var rightName = b.displayName.toLocaleLowerCase();
                return leftName.localeCompare(rightName);
            }
            if (sortField === 'joinedAt') {
                var left_2 = new Date(a.joinedAt).getTime();
                var right_2 = new Date(b.joinedAt).getTime();
                return sortOrder === 'asc' ? left_2 - right_2 : right_2 - left_2;
            }
            var left = a.displayName.toLocaleLowerCase();
            var right = b.displayName.toLocaleLowerCase();
            return sortOrder === 'asc'
                ? left.localeCompare(right)
                : right.localeCompare(left);
        });
    }, [deferredSearchQuery, members, rolePriorityMap, selectedRoleFilter, sortField, sortOrder]);
    var availableRoles = ((_c = rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles) !== null && _c !== void 0 ? _c : []).filter(function (role) { return role.name !== 'owner'; });
    var currentUserRole = (_d = members.find(function (member) { return member.userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })) === null || _d === void 0 ? void 0 : _d.role;
    var canModerateMembers = ['owner', 'admin', 'moderator'].includes(currentUserRole !== null && currentUserRole !== void 0 ? currentUserRole : '');
    var canAssignRoles = ['owner', 'admin'].includes(currentUserRole !== null && currentUserRole !== void 0 ? currentUserRole : '');
    var handleModerationAction = (0, react_1.useCallback)(function (member, action, title, body, successTitle, successBody) {
        react_native_1.Alert.alert(title, body, [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: title,
                style: 'destructive',
                onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, moderateMemberMutation.mutateAsync({
                                        membershipId: member.id,
                                        action: action,
                                    })];
                            case 1:
                                _b.sent();
                                react_native_1.Alert.alert(successTitle, successBody);
                                return [3 /*break*/, 3];
                            case 2:
                                _a = _b.sent();
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    }, [moderateMemberMutation, t]);
    var handleMemberMenu = (0, react_1.useCallback)(function (member) {
        var buttons = [
            { text: t('common.cancel'), style: 'cancel' },
        ];
        if (canAssignRoles && member.role !== 'owner' && availableRoles.length > 0) {
            buttons.push({
                text: t('community.memberChangeRole'),
                onPress: function () {
                    var roleButtons = __spreadArray([
                        { text: t('common.cancel'), style: 'cancel' }
                    ], availableRoles.map(function (role) { return ({
                        text: getRoleLabel(role.name, t),
                        onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, assignRoleMutation.mutateAsync({
                                                userId: member.userId,
                                                role: role.name,
                                            })];
                                    case 1:
                                        _b.sent();
                                        react_native_1.Alert.alert(t('community.memberRoleChangeSuccessTitle'), t('community.memberRoleChangeSuccessBody', {
                                            name: member.displayName || t('common.unknown'),
                                            role: getRoleLabel(role.name, t),
                                        }));
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _a = _b.sent();
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); },
                    }); }), true);
                    react_native_1.Alert.alert(t('community.memberChangeRole'), t('community.memberChangeRoleConfirm', {
                        name: member.displayName || t('common.unknown'),
                    }), roleButtons);
                },
            });
        }
        if (!['owner', 'admin'].includes(member.role)) {
            buttons.push({
                text: t('community.memberMute'),
                onPress: function () {
                    return handleModerationAction(member, 'mute', t('community.memberMute'), t('community.memberMuteConfirm', { name: member.displayName || t('common.unknown') }), t('community.memberMuteSuccessTitle'), t('community.memberMuteSuccessBody', { name: member.displayName || t('common.unknown') }));
                },
            }, {
                text: t('community.memberKick'),
                style: 'destructive',
                onPress: function () {
                    return handleModerationAction(member, 'kick', t('community.memberKick'), t('community.memberKickConfirm', { name: member.displayName || t('common.unknown') }), t('community.memberKickSuccessTitle'), t('community.memberKickSuccessBody', { name: member.displayName || t('common.unknown') }));
                },
            }, {
                text: t('community.memberBan'),
                style: 'destructive',
                onPress: function () {
                    return handleModerationAction(member, 'ban', t('community.memberBan'), t('community.memberBanConfirm', { name: member.displayName || t('common.unknown') }), t('community.memberBanSuccessTitle'), t('community.memberBanSuccessBody', { name: member.displayName || t('common.unknown') }));
                },
            });
        }
        react_native_1.Alert.alert(member.displayName || t('common.unknown'), t('community.memberManageBody'), buttons);
    }, [assignRoleMutation, availableRoles, canAssignRoles, handleModerationAction, t]);
    react_1.default.useEffect(function () {
        var _a;
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        if (!((_a = data === null || data === void 0 ? void 0 : data.members) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        devActionAttemptedRef.current = true;
        function tryDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var payload, member;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-community-members-action.json')];
                        case 1:
                            payload = _b.sent();
                            if (!payload)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, , 7, 9]);
                            if (!(payload === null || payload === void 0 ? void 0 : payload.userId)) {
                                return [2 /*return*/];
                            }
                            member = ((_a = data === null || data === void 0 ? void 0 : data.members) !== null && _a !== void 0 ? _a : []).find(function (item) { return item.userId === payload.userId; });
                            if (!member) {
                                return [2 /*return*/];
                            }
                            if (!(payload.action === 'message')) return [3 /*break*/, 4];
                            return [4 /*yield*/, handleMessage(member)];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            if (!(payload.action === 'role' && payload.role)) return [3 /*break*/, 6];
                            return [4 /*yield*/, assignRoleMutation.mutateAsync({
                                    userId: member.userId,
                                    role: payload.role,
                                })];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-community-members-action.json')];
                        case 8:
                            _b.sent();
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevAction();
    }, [assignRoleMutation, data === null || data === void 0 ? void 0 : data.members, handleMessage]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('community.membersLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={filteredMembers} keyExtractor={function (item) { return item.id; }} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('community.membersSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            <react_native_1.View style={styles.roleFilterWrap}>
              <react_native_1.TouchableOpacity style={[
                styles.roleFilterChip,
                selectedRoleFilter === null && styles.roleFilterChipSelected,
            ]} onPress={function () { return setSelectedRoleFilter(null); }}>
                <react_native_1.Text style={[
                styles.roleFilterChipText,
                selectedRoleFilter === null && styles.roleFilterChipTextSelected,
            ]}>
                  {t('community.membersFilterAll')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
              {availableRoleFilters.map(function (role) {
                var selected = selectedRoleFilter === role;
                return (<react_native_1.TouchableOpacity key={role} style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]} onPress={function () { return setSelectedRoleFilter(role); }}>
                    <react_native_1.Text style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                    ]}>
                      {getRoleLabel(role, t)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.roleFilterWrap}>
              {[
                { key: 'name', label: t('community.membersSortName') },
                { key: 'joinedAt', label: t('community.membersSortJoined') },
                { key: 'role', label: t('community.membersSortRole') },
            ].map(function (option) {
                var selected = sortField === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]} onPress={function () { return setSortField(option.key); }}>
                    <react_native_1.Text style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.roleFilterWrap}>
              {[
                {
                    key: 'asc',
                    label: sortField === 'joinedAt'
                        ? t('settings.sortOldest')
                        : sortField === 'role'
                            ? t('community.membersSortRoleHigh')
                            : t('settings.sortAsc'),
                },
                {
                    key: 'desc',
                    label: sortField === 'joinedAt'
                        ? t('settings.sortNewest')
                        : sortField === 'role'
                            ? t('community.membersSortRoleLow')
                            : t('settings.sortDesc'),
                },
            ].map(function (option) {
                var selected = sortOrder === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]} onPress={function () { return setSortOrder(option.key); }}>
                    <react_native_1.Text style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
          </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var _b, _c;
            var item = _a.item;
            var isCurrentUser = item.userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id);
            var isMessaging = createDmMutation.isPending && createDmMutation.variables === item.userId;
            var isModerating = moderateMemberMutation.isPending && ((_b = moderateMemberMutation.variables) === null || _b === void 0 ? void 0 : _b.membershipId) === item.id;
            var isAssigningRole = assignRoleMutation.isPending && ((_c = assignRoleMutation.variables) === null || _c === void 0 ? void 0 : _c.userId) === item.userId;
            var displayName = item.displayName || t('common.unknown');
            var canModerateTarget = canModerateMembers && !isCurrentUser && !['owner', 'admin'].includes(item.role);
            var canManageRoleTarget = canAssignRoles && !isCurrentUser && item.role !== 'owner';
            var canOpenMenu = canModerateTarget || canManageRoleTarget;
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.memberRow}>
                <react_native_1.View style={[
                    styles.avatar,
                    { backgroundColor: (0, theme_1.getAvatarColor)(displayName || item.userId) },
                ]}>
                  <react_native_1.Text style={styles.avatarText}>
                    {(displayName || item.userId).charAt(0).toUpperCase()}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.memberCopy}>
                  <react_native_1.View style={styles.nameRow}>
                    <react_native_1.Text style={styles.displayName} numberOfLines={1}>
                      {displayName}
                    </react_native_1.Text>
                    {isCurrentUser && <react_native_1.Text style={styles.youBadge}>{t('common.you')}</react_native_1.Text>}
                  </react_native_1.View>
                  <react_native_1.View style={styles.metaRow}>
                    <react_native_1.View style={styles.roleBadge}>
                      <react_native_1.Text style={styles.roleText}>{getRoleLabel(item.role, t)}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={styles.joinedText}>
                      {t('community.memberJoined', {
                    date: new Date(item.joinedAt).toLocaleDateString(),
                })}
                    </react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                {!isCurrentUser && (<react_native_1.View style={styles.actions}>
                    <react_native_1.TouchableOpacity style={styles.messageButton} onPress={function () { return handleMessage(item); }} disabled={isMessaging || isModerating || isAssigningRole}>
                      <react_native_1.Text style={styles.messageButtonText}>
                        {isMessaging ? t('common.loading') : t('friends.message')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    {canOpenMenu && (<react_native_1.TouchableOpacity style={styles.memberMenuButton} onPress={function () { return handleMemberMenu(item); }} disabled={isModerating || isAssigningRole}>
                        <react_native_1.Text style={styles.memberMenuButtonText}>
                          {isModerating || isAssigningRole ? '…' : "\u22EF"}
                        </react_native_1.Text>
                      </react_native_1.TouchableOpacity>)}
                  </react_native_1.View>)}
              </react_native_1.View>
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon="👥" title={deferredSearchQuery ? t('community.membersNoSearchResults') : t('community.membersEmpty')} subtitle={deferredSearchQuery ? t('community.membersNoSearchResultsBody') : t('community.membersHint')}/>
          </react_native_1.View>} contentContainerStyle={filteredMembers.length === 0 ? styles.emptyList : styles.list}/>
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
        paddingTop: theme_1.spacing.lg,
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
    roleFilterWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    roleFilterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    roleFilterChipSelected: {
        backgroundColor: theme_1.colors.primary,
    },
    roleFilterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    roleFilterChipTextSelected: {
        color: theme_1.colors.white,
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
        marginTop: theme_1.spacing.md,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme_1.spacing.md,
    },
    avatarText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    memberCopy: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
    },
    displayName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
        flexShrink: 1,
    },
    youBadge: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.xs,
    },
    roleBadge: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: theme_1.spacing.xs,
    },
    roleText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    joinedText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: theme_1.spacing.md,
        gap: theme_1.spacing.sm,
    },
    messageButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    messageButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    memberMenuButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme_1.colors.backgroundDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberMenuButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xl,
        lineHeight: 18,
    },
});
