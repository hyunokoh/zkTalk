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
exports.default = EditChannelScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
var SLOW_MODE_OPTIONS = [0, 10, 30, 60, 300];
var DISAPPEARING_OPTIONS = [0, 30, 300, 3600, 86400];
function getRoleLabel(role, t) {
    switch (role.name) {
        case 'owner':
            return t('community.roleOwner');
        case 'admin':
            return t('community.roleAdmin');
        case 'moderator':
            return t('community.roleModerator');
        case 'member':
            return t('community.roleMember');
        case 'guest':
            return t('community.roleGuest');
        default:
            return role.name;
    }
}
function EditChannelScreen(_a) {
    var _this = this;
    var _b, _c;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)((_b = route.params.channelName) !== null && _b !== void 0 ? _b : ''), name = _d[0], setName = _d[1];
    var _e = (0, react_1.useState)(''), description = _e[0], setDescription = _e[1];
    var _f = (0, react_1.useState)(null), categoryId = _f[0], setCategoryId = _f[1];
    var _g = (0, react_1.useState)('public'), visibility = _g[0], setVisibility = _g[1];
    var _h = (0, react_1.useState)(0), slowModeSeconds = _h[0], setSlowModeSeconds = _h[1];
    var _j = (0, react_1.useState)(null), disappearingDuration = _j[0], setDisappearingDuration = _j[1];
    var _k = (0, react_1.useState)(false), requireTopic = _k[0], setRequireTopic = _k[1];
    var _l = (0, react_1.useState)([]), allowedViewRoleIds = _l[0], setAllowedViewRoleIds = _l[1];
    var _m = (0, react_1.useState)([]), allowedPostRoleIds = _m[0], setAllowedPostRoleIds = _m[1];
    var _o = (0, react_1.useState)(''), categorySearchQuery = _o[0], setCategorySearchQuery = _o[1];
    var _p = (0, react_1.useState)(''), roleSearchQuery = _p[0], setRoleSearchQuery = _p[1];
    var devActionAttemptedRef = react_1.default.useRef(false);
    var _q = (0, react_query_1.useQuery)({
        queryKey: ['channel', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId));
        },
    }), data = _q.data, isLoading = _q.isLoading;
    var categories = (0, react_query_1.useQuery)({
        queryKey: ['categories', route.params.communityId],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/categories"))];
                    case 1:
                        res = _b.sent();
                        return [2 /*return*/, (_a = res.categories) !== null && _a !== void 0 ? _a : []];
                }
            });
        }); },
    }).data;
    var rolesData = (0, react_query_1.useQuery)({
        queryKey: ['community-roles', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/roles"));
        },
    }).data;
    var permissionsData = (0, react_query_1.useQuery)({
        queryKey: ['channel-permissions', route.params.channelId],
        queryFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/permissions"));
        },
    }).data;
    (0, react_1.useEffect)(function () {
        var _a, _b, _c, _d, _e, _f;
        var channel = data === null || data === void 0 ? void 0 : data.channel;
        if (!channel)
            return;
        setName(channel.name);
        setDescription((_a = channel.description) !== null && _a !== void 0 ? _a : '');
        setCategoryId((_b = channel.categoryId) !== null && _b !== void 0 ? _b : null);
        setVisibility((_c = channel.visibility) !== null && _c !== void 0 ? _c : 'public');
        setSlowModeSeconds((_d = channel.slowModeSeconds) !== null && _d !== void 0 ? _d : 0);
        setDisappearingDuration((_e = channel.disappearingDuration) !== null && _e !== void 0 ? _e : null);
        setRequireTopic((_f = channel.requireTopic) !== null && _f !== void 0 ? _f : false);
    }, [data === null || data === void 0 ? void 0 : data.channel]);
    (0, react_1.useEffect)(function () {
        if (!(rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles) || !(permissionsData === null || permissionsData === void 0 ? void 0 : permissionsData.permissions))
            return;
        var selectableRoleIds = new Set(rolesData.roles
            .filter(function (role) { return !['owner', 'admin'].includes(role.name); })
            .map(function (role) { return role.id; }));
        setAllowedViewRoleIds(permissionsData.permissions
            .filter(function (permission) {
            return permission.permissionKey === 'view_channel' &&
                permission.effect === 'allow' &&
                selectableRoleIds.has(permission.roleId);
        })
            .map(function (permission) { return permission.roleId; }));
        setAllowedPostRoleIds(permissionsData.permissions
            .filter(function (permission) {
            return permission.permissionKey === 'post_message' &&
                permission.effect === 'allow' &&
                selectableRoleIds.has(permission.roleId);
        })
            .map(function (permission) { return permission.roleId; }));
    }, [permissionsData === null || permissionsData === void 0 ? void 0 : permissionsData.permissions, rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function (overrides) {
            var _a;
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId), {
                method: 'PATCH',
                body: {
                    name: ((_a = overrides === null || overrides === void 0 ? void 0 : overrides.name) === null || _a === void 0 ? void 0 : _a.trim()) || name.trim(),
                    description: (overrides === null || overrides === void 0 ? void 0 : overrides.description) !== undefined
                        ? overrides.description
                        : description.trim() || null,
                    categoryId: categoryId,
                    visibility: visibility,
                    slowModeSeconds: slowModeSeconds,
                    disappearingDuration: disappearingDuration,
                    requireTopic: requireTopic,
                    allowedViewRoleIds: visibility === 'role_restricted' ? allowedViewRoleIds : [],
                    allowedPostRoleIds: visibility === 'role_restricted' ? allowedPostRoleIds : [],
                },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['channel', route.params.channelId] }),
                            queryClient.invalidateQueries({
                                queryKey: ['channel-permissions', route.params.channelId],
                            }),
                            queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
                        ])];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('channel.editSavedTitle'), t('channel.editSavedBody'), [
                            { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.editFailed'));
        },
    });
    var archiveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/archive"), {
                method: 'POST',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['channel', route.params.channelId] }),
                            queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
                        ])];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('channel.archiveSuccessTitle'), t('channel.archiveSuccessBody'), [
                            { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.archiveFailed'));
        },
    });
    var handleSave = (0, react_1.useCallback)(function () {
        if (!name.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('channel.nameRequired'));
            return;
        }
        if (visibility === 'role_restricted' && allowedViewRoleIds.length === 0) {
            react_native_1.Alert.alert(t('common.error'), t('channel.visibilityRolesRequired'));
            return;
        }
        saveMutation.mutate(undefined);
    }, [allowedViewRoleIds.length, name, saveMutation, t, visibility]);
    var handleArchive = (0, react_1.useCallback)(function () {
        react_native_1.Alert.alert(t('channel.archive'), t('channel.archiveConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('channel.archive'),
                style: 'destructive',
                onPress: function () { return archiveMutation.mutate(); },
            },
        ]);
    }, [archiveMutation, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        if (!(data === null || data === void 0 ? void 0 : data.channel)) {
            return;
        }
        var currentChannel = data.channel;
        devActionAttemptedRef.current = true;
        function tryDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var payload;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-edit-channel-action.json')];
                        case 1:
                            payload = _g.sent();
                            if (!payload)
                                return [2 /*return*/];
                            _g.label = 2;
                        case 2:
                            _g.trys.push([2, , 7, 9]);
                            if ((payload === null || payload === void 0 ? void 0 : payload.channelId) !== route.params.channelId) {
                                return [2 /*return*/];
                            }
                            if (!(payload.action === 'save')) return [3 /*break*/, 4];
                            setName((_a = payload.name) !== null && _a !== void 0 ? _a : currentChannel.name);
                            setDescription((_c = (_b = payload.description) !== null && _b !== void 0 ? _b : currentChannel.description) !== null && _c !== void 0 ? _c : '');
                            return [4 /*yield*/, saveMutation.mutateAsync({
                                    name: ((_d = payload.name) === null || _d === void 0 ? void 0 : _d.trim()) || currentChannel.name,
                                    description: ((_f = (_e = payload.description) !== null && _e !== void 0 ? _e : currentChannel.description) !== null && _f !== void 0 ? _f : '').trim() || null,
                                })];
                        case 3:
                            _g.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            if (!(payload.action === 'archive')) return [3 /*break*/, 6];
                            return [4 /*yield*/, archiveMutation.mutateAsync()];
                        case 5:
                            _g.sent();
                            _g.label = 6;
                        case 6: return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-edit-channel-action.json')];
                        case 8:
                            _g.sent();
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevAction();
    }, [archiveMutation, data === null || data === void 0 ? void 0 : data.channel, route.params.channelId, saveMutation]);
    var channel = data === null || data === void 0 ? void 0 : data.channel;
    var visibilityOptions = [
        { key: 'public', label: t('channel.visibilityPublic') },
        { key: 'role_restricted', label: t('channel.visibilityRestricted') },
    ];
    var selectableRoles = ((_c = rolesData === null || rolesData === void 0 ? void 0 : rolesData.roles) !== null && _c !== void 0 ? _c : []).filter(function (role) { return !['owner', 'admin'].includes(role.name); });
    var filteredCategories = (0, react_1.useMemo)(function () {
        var normalizedQuery = categorySearchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return categories !== null && categories !== void 0 ? categories : [];
        }
        return (categories !== null && categories !== void 0 ? categories : []).filter(function (category) {
            return category.name.toLowerCase().includes(normalizedQuery);
        });
    }, [categories, categorySearchQuery]);
    var filteredRoles = (0, react_1.useMemo)(function () {
        var normalizedQuery = roleSearchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return selectableRoles;
        }
        return selectableRoles.filter(function (role) {
            return getRoleLabel(role, t).toLowerCase().includes(normalizedQuery);
        });
    }, [roleSearchQuery, selectableRoles, t]);
    var restrictedViewCount = allowedViewRoleIds.length;
    var restrictedPostCount = allowedPostRoleIds.length;
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('channel.loadingDetails')}/>;
    }
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {(channel === null || channel === void 0 ? void 0 : channel.isArchived) ? (<react_native_1.View style={styles.archivedCard}>
            <react_native_1.Text style={styles.archivedTitle}>{t('channel.archivedTitle')}</react_native_1.Text>
            <react_native_1.Text style={styles.archivedBody}>{t('channel.archivedBody')}</react_native_1.Text>
          </react_native_1.View>) : null}

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('channel.channelName')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('channel.namePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={100}/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.description')}</react_native_1.Text>
          <react_native_1.TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('channel.descPlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline numberOfLines={3} textAlignVertical="top" maxLength={500}/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('channel.category')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={categorySearchQuery} onChangeText={setCategorySearchQuery} placeholder={t('channel.categorySearchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
          <react_native_1.View style={styles.categoryWrap}>
            <react_native_1.TouchableOpacity style={[
            styles.categoryChip,
            categoryId === null && styles.categoryChipSelected,
        ]} onPress={function () { return setCategoryId(null); }}>
              <react_native_1.Text style={[
            styles.categoryChipText,
            categoryId === null && styles.categoryChipTextSelected,
        ]}>
                {t('channel.noCategory')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
            {filteredCategories.map(function (category) {
            var selected = categoryId === category.id;
            return (<react_native_1.TouchableOpacity key={category.id} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () { return setCategoryId(category.id); }}>
                  <react_native_1.Text style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                ]}>
                    {category.name}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
          {filteredCategories.length === 0 ? (<react_native_1.Text style={styles.helper}>{t('channel.categoryNoSearchResultsBody')}</react_native_1.Text>) : null}
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('channel.visibility')}</react_native_1.Text>
          <react_native_1.Text style={styles.helper}>{t('channel.visibilityHint')}</react_native_1.Text>
          <react_native_1.View style={styles.categoryWrap}>
            {visibilityOptions.map(function (option) {
            var selected = visibility === option.key;
            return (<react_native_1.TouchableOpacity key={option.key} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () { return setVisibility(option.key); }}>
                  <react_native_1.Text style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                ]}>
                    {option.label}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
        </react_native_1.View>

        {visibility === 'role_restricted' ? (<react_native_1.View style={styles.field}>
            <react_native_1.Text style={styles.label}>{t('channel.visibilityRoles')}</react_native_1.Text>
            <react_native_1.Text style={styles.helper}>{t('channel.visibilityRolesHint')}</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={roleSearchQuery} onChangeText={setRoleSearchQuery} placeholder={t('channel.roleSearchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
            <react_native_1.Text style={styles.summaryText}>
              {t('channel.visibilityRolesSummary', { count: restrictedViewCount })}
            </react_native_1.Text>
            <react_native_1.View style={styles.categoryWrap}>
              {filteredRoles.map(function (role) {
                var selected = allowedViewRoleIds.includes(role.id);
                return (<react_native_1.TouchableOpacity key={role.id} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () {
                        return setAllowedViewRoleIds(function (prev) {
                            var next = prev.includes(role.id)
                                ? prev.filter(function (id) { return id !== role.id; })
                                : __spreadArray(__spreadArray([], prev, true), [role.id], false);
                            if (!next.includes(role.id)) {
                                setAllowedPostRoleIds(function (postPrev) {
                                    return postPrev.filter(function (id) { return id !== role.id; });
                                });
                            }
                            return next;
                        });
                    }}>
                    <react_native_1.Text style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                    ]}>
                      {getRoleLabel(role, t)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            {filteredRoles.length === 0 ? (<react_native_1.Text style={styles.helper}>{t('channel.roleNoSearchResultsBody')}</react_native_1.Text>) : null}
          </react_native_1.View>) : null}

        {visibility === 'role_restricted' ? (<react_native_1.View style={styles.field}>
            <react_native_1.Text style={styles.label}>{t('channel.postRoles')}</react_native_1.Text>
            <react_native_1.Text style={styles.helper}>{t('channel.postRolesHint')}</react_native_1.Text>
            <react_native_1.Text style={styles.summaryText}>
              {t('channel.postRolesSummary', { count: restrictedPostCount })}
            </react_native_1.Text>
            <react_native_1.View style={styles.categoryWrap}>
              {filteredRoles.map(function (role) {
                var selected = allowedPostRoleIds.includes(role.id);
                return (<react_native_1.TouchableOpacity key={role.id} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () {
                        return setAllowedPostRoleIds(function (prev) {
                            var next = prev.includes(role.id)
                                ? prev.filter(function (id) { return id !== role.id; })
                                : __spreadArray(__spreadArray([], prev, true), [role.id], false);
                            if (!prev.includes(role.id)) {
                                setAllowedViewRoleIds(function (viewPrev) {
                                    return viewPrev.includes(role.id) ? viewPrev : __spreadArray(__spreadArray([], viewPrev, true), [role.id], false);
                                });
                            }
                            return next;
                        });
                    }}>
                    <react_native_1.Text style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                    ]}>
                      {getRoleLabel(role, t)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            {filteredRoles.length === 0 ? (<react_native_1.Text style={styles.helper}>{t('channel.roleNoSearchResultsBody')}</react_native_1.Text>) : null}
          </react_native_1.View>) : null}

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('channel.slowMode')}</react_native_1.Text>
          <react_native_1.Text style={styles.helper}>{t('channel.slowModeDesc')}</react_native_1.Text>
          <react_native_1.View style={styles.categoryWrap}>
            {SLOW_MODE_OPTIONS.map(function (seconds) {
            var selected = slowModeSeconds === seconds;
            return (<react_native_1.TouchableOpacity key={seconds} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () { return setSlowModeSeconds(seconds); }}>
                  <react_native_1.Text style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                ]}>
                    {t('channel.slowModeValue', { seconds: seconds })}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('disappearing.title')}</react_native_1.Text>
          <react_native_1.View style={styles.categoryWrap}>
            {DISAPPEARING_OPTIONS.map(function (seconds) {
            var value = seconds === 0 ? null : seconds;
            var selected = disappearingDuration === value;
            return (<react_native_1.TouchableOpacity key={seconds} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () { return setDisappearingDuration(value); }}>
                  <react_native_1.Text style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                ]}>
                    {seconds === 0
                    ? t('disappearing.off')
                    : t("disappearing.".concat(seconds === 30 ? '30s' : seconds === 300 ? '5m' : seconds === 3600 ? '1h' : '24h'))}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('channel.requireTopic')}</react_native_1.Text>
          <react_native_1.Text style={styles.helper}>{t('channel.requireTopicHint')}</react_native_1.Text>
          <react_native_1.View style={styles.categoryWrap}>
            {[
            { value: false, label: t('channel.requireTopicOff') },
            { value: true, label: t('channel.requireTopicOn') },
        ].map(function (option) {
            var selected = requireTopic === option.value;
            return (<react_native_1.TouchableOpacity key={option.label} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={function () { return setRequireTopic(option.value); }}>
                  <react_native_1.Text style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                ]}>
                    {option.label}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]} onPress={handleSave} disabled={saveMutation.isPending || archiveMutation.isPending}>
          <react_native_1.Text style={styles.saveButtonText}>
            {saveMutation.isPending ? t('channel.editSaving') : t('common.save')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>

        {!(channel === null || channel === void 0 ? void 0 : channel.isArchived) && (<react_native_1.TouchableOpacity style={[styles.archiveButton, archiveMutation.isPending && styles.saveButtonDisabled]} onPress={handleArchive} disabled={archiveMutation.isPending || saveMutation.isPending}>
            <react_native_1.Text style={styles.archiveButtonText}>
              {archiveMutation.isPending ? t('channel.archiving') : t('channel.archive')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.lg,
    },
    field: {
        gap: theme_1.spacing.sm,
    },
    helper: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    summaryText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    label: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
    },
    textArea: {
        minHeight: 88,
    },
    categoryWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
    },
    categoryChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    categoryChipSelected: {
        backgroundColor: theme_1.colors.primary,
    },
    categoryChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    categoryChipTextSelected: {
        color: theme_1.colors.white,
    },
    archivedCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.warning,
        padding: theme_1.spacing.lg,
    },
    archivedTitle: {
        color: theme_1.colors.warning,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    archivedBody: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
        marginTop: theme_1.spacing.xs,
    },
    saveButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    archiveButton: {
        backgroundColor: theme_1.colors.error,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
    },
    archiveButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
});
