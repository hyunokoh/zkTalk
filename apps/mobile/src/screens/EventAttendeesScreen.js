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
exports.default = EventAttendeesScreen;
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
var theme_1 = require("../theme");
function EventAttendeesScreen(_a) {
    var _this = this;
    var _b;
    var route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var navigation = (0, native_1.useNavigation)();
    var _c = (0, react_1.useState)(''), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)('all'), statusFilter = _d[0], setStatusFilter = _d[1];
    var _e = (0, react_1.useState)('name'), sortField = _e[0], setSortField = _e[1];
    var _f = (0, react_1.useState)('asc'), sortOrder = _f[0], setSortOrder = _f[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['event-attendees', route.params.eventId],
        queryFn: function () {
            return (0, api_1.api)("/api/events/".concat(route.params.eventId, "/attendees"));
        },
    }), data = _g.data, isLoading = _g.isLoading, refetch = _g.refetch, isRefetching = _g.isRefetching;
    var createDmMutation = (0, react_query_1.useMutation)({
        mutationFn: function (targetUserId) {
            return (0, api_1.api)('/api/dm/conversations', {
                method: 'POST',
                body: { targetUserId: targetUserId },
            });
        },
    });
    var attendees = (_b = data === null || data === void 0 ? void 0 : data.attendees) !== null && _b !== void 0 ? _b : [];
    var filteredAttendees = (0, react_1.useMemo)(function () {
        var filtered = attendees.filter(function (item) {
            if (statusFilter !== 'all' && item.status !== statusFilter) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [item.user.displayName, item.user.username, item.status]
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'status') {
                var getStatusPriority = function (item) {
                    return item.status === 'going' ? 1 : 0;
                };
                var left_1 = getStatusPriority(a);
                var right_1 = getStatusPriority(b);
                if (left_1 !== right_1) {
                    return sortOrder === 'asc' ? right_1 - left_1 : left_1 - right_1;
                }
            }
            var left = a.user.displayName.toLocaleLowerCase();
            var right = b.user.displayName.toLocaleLowerCase();
            return sortOrder === 'asc'
                ? left.localeCompare(right)
                : right.localeCompare(left);
        });
    }, [attendees, deferredSearchQuery, sortField, sortOrder, statusFilter]);
    var going = (0, react_1.useMemo)(function () { return filteredAttendees.filter(function (item) { return item.status === 'going'; }); }, [filteredAttendees]);
    var interested = (0, react_1.useMemo)(function () { return filteredAttendees.filter(function (item) { return item.status === 'interested'; }); }, [filteredAttendees]);
    var handleMessage = (0, react_1.useCallback)(function (attendee) { return __awaiter(_this, void 0, void 0, function () {
        var result, conversationId, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, createDmMutation.mutateAsync(attendee.user.id)];
                case 1:
                    result = _c.sent();
                    conversationId = (_a = result.id) !== null && _a !== void 0 ? _a : (_b = result.conversation) === null || _b === void 0 ? void 0 : _b.id;
                    if (!conversationId) {
                        throw new Error(t('event.messageAttendeeFailed'));
                    }
                    navigation.navigate('Main', {
                        screen: 'DmTab',
                        params: {
                            screen: 'DmScreen',
                            params: {
                                conversationId: conversationId,
                                userId: attendee.user.id,
                                displayName: attendee.user.displayName,
                            },
                        },
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('event.messageAttendeeFailed'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [createDmMutation, navigation, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || isLoading)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-event-attendees-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 5, 7]);
                            if (action.type !== 'messageFirst')
                                return [2 /*return*/];
                            if (!filteredAttendees[0]) return [3 /*break*/, 4];
                            return [4 /*yield*/, handleMessage(filteredAttendees[0])];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-event-attendees-action.json')];
                        case 6:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [filteredAttendees, handleMessage, isLoading]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('event.attendeesLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.ScrollView style={styles.container} contentContainerStyle={[
            styles.content,
            filteredAttendees.length === 0 && styles.emptyContent,
        ]} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>}>
        <react_native_1.View style={styles.searchWrap}>
          <react_native_1.View style={styles.filterRow}>
            {[
            { key: 'all', label: t('event.filterAll') },
            { key: 'going', label: t('event.going') },
            { key: 'interested', label: t('event.interested') },
        ].map(function (option) {
            var active = statusFilter === option.key;
            return (<react_native_1.TouchableOpacity key={option.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={function () { return setStatusFilter(option.key); }}>
                  <react_native_1.Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {option.label}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>);
        })}
          </react_native_1.View>
          <react_native_1.View style={styles.filterRow}>
            {[
            { key: 'name', label: t('event.attendeesSortName') },
            { key: 'status', label: t('event.attendeesSortStatus') },
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
                key: 'asc',
                label: sortField === 'status' ? t('event.attendeesSortGoingFirst') : t('settings.sortAsc'),
            },
            {
                key: 'desc',
                label: sortField === 'status' ? t('event.attendeesSortInterestedFirst') : t('settings.sortDesc'),
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
          <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('event.attendeesSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
        </react_native_1.View>

        {filteredAttendees.length === 0 ? (<EmptyState_1.default icon={"\uD83D\uDC65"} title={deferredSearchQuery ? t('event.attendeesNoSearchResults') : t('event.attendeesEmpty')} subtitle={deferredSearchQuery ? t('event.attendeesNoSearchResultsBody') : t('event.attendeesEmptyBody')}/>) : (<>
            <react_native_1.View style={styles.section}>
              <react_native_1.Text style={styles.sectionTitle}>
                {t('event.going')} ({going.length})
              </react_native_1.Text>
              {going.length === 0 ? (<react_native_1.Text style={styles.sectionHint}>{t('event.attendeesNone')}</react_native_1.Text>) : (going.map(function (item) { return (<react_native_1.View key={"going-".concat(item.user.id)} style={styles.row}>
                    <react_native_1.View style={[
                    styles.avatar,
                    { backgroundColor: (0, theme_1.getAvatarColor)(item.user.displayName) },
                ]}>
                      <react_native_1.Text style={styles.avatarText}>
                        {item.user.displayName.charAt(0).toUpperCase()}
                      </react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.View style={styles.userInfo}>
                      <react_native_1.Text style={styles.name}>{item.user.displayName}</react_native_1.Text>
                      <react_native_1.Text style={styles.username}>@{item.user.username}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.TouchableOpacity style={styles.messageButton} onPress={function () { return handleMessage(item); }}>
                      <react_native_1.Text style={styles.messageButtonText}>{t('dm.message')}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>); }))}
            </react_native_1.View>

            <react_native_1.View style={styles.section}>
              <react_native_1.Text style={styles.sectionTitle}>
                {t('event.interested')} ({interested.length})
              </react_native_1.Text>
              {interested.length === 0 ? (<react_native_1.Text style={styles.sectionHint}>{t('event.attendeesNone')}</react_native_1.Text>) : (interested.map(function (item) { return (<react_native_1.View key={"interested-".concat(item.user.id)} style={styles.row}>
                    <react_native_1.View style={[
                    styles.avatar,
                    { backgroundColor: (0, theme_1.getAvatarColor)(item.user.displayName) },
                ]}>
                      <react_native_1.Text style={styles.avatarText}>
                        {item.user.displayName.charAt(0).toUpperCase()}
                      </react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.View style={styles.userInfo}>
                      <react_native_1.Text style={styles.name}>{item.user.displayName}</react_native_1.Text>
                      <react_native_1.Text style={styles.username}>@{item.user.username}</react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.TouchableOpacity style={styles.messageButton} onPress={function () { return handleMessage(item); }}>
                      <react_native_1.Text style={styles.messageButtonText}>{t('dm.message')}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>); }))}
            </react_native_1.View>
          </>)}
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    container: {
        flex: 1,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.lg,
    },
    searchWrap: {
        marginBottom: theme_1.spacing.sm,
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
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.borderLight,
    },
    emptyContent: {
        flexGrow: 1,
    },
    section: {
        gap: theme_1.spacing.sm,
    },
    sectionTitle: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    sectionHint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        paddingVertical: theme_1.spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        padding: theme_1.spacing.md,
        gap: theme_1.spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    name: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    username: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    messageButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    messageButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
});
