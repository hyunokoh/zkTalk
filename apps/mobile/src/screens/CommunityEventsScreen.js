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
exports.default = CommunityEventsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
function formatEventRange(startAt, endAt, locale) {
    var start = new Date(startAt);
    var end = endAt ? new Date(endAt) : null;
    var startLabel = start.toLocaleString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    if (!end) {
        return startLabel;
    }
    var sameDay = start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();
    if (sameDay) {
        return "".concat(startLabel, " - ").concat(end.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
        }));
    }
    return "".concat(startLabel, " - ").concat(end.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }));
}
function CommunityEventsScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e;
    var navigation = _a.navigation, route = _a.route;
    var _f = (0, i18n_1.useTranslation)(), t = _f.t, locale = _f.locale;
    var queryClient = (0, react_query_1.useQueryClient)();
    var currentUser = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var _g = (0, react_1.useState)('upcoming'), scope = _g[0], setScope = _g[1];
    var _h = (0, react_1.useState)('all'), rsvpFilter = _h[0], setRsvpFilter = _h[1];
    var _j = (0, react_1.useState)('all'), hostFilter = _j[0], setHostFilter = _j[1];
    var _k = (0, react_1.useState)('all'), locationFilter = _k[0], setLocationFilter = _k[1];
    var _l = (0, react_1.useState)('all'), timeFilter = _l[0], setTimeFilter = _l[1];
    var _m = (0, react_1.useState)('startAt'), sortField = _m[0], setSortField = _m[1];
    var _o = (0, react_1.useState)('nearest'), sortOrder = _o[0], setSortOrder = _o[1];
    var _p = (0, react_1.useState)(''), searchQuery = _p[0], setSearchQuery = _p[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _q = (0, react_query_1.useQuery)({
        queryKey: ['community-events', route.params.communityId, scope],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/events?scope=").concat(scope));
        },
    }), data = _q.data, isLoading = _q.isLoading, refetch = _q.refetch, isRefetching = _q.isRefetching;
    var membersData = (0, react_query_1.useQuery)({
        queryKey: ['community-members', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/members"));
        },
    }).data;
    var currentRole = (_b = membersData === null || membersData === void 0 ? void 0 : membersData.members.find(function (member) { return member.userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })) === null || _b === void 0 ? void 0 : _b.role;
    var canManageAllEvents = ['owner', 'admin'].includes(currentRole !== null && currentRole !== void 0 ? currentRole : '');
    var setRsvpMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var eventId = _a.eventId, status = _a.status;
            return (0, api_1.api)("/api/events/".concat(eventId, "/rsvp"), {
                method: 'POST',
                body: { status: status },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({
                            queryKey: ['community-events', route.params.communityId],
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('event.rsvpFailed'));
        },
    });
    var removeRsvpMutation = (0, react_query_1.useMutation)({
        mutationFn: function (eventId) {
            return (0, api_1.api)("/api/events/".concat(eventId, "/rsvp"), {
                method: 'DELETE',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({
                            queryKey: ['community-events', route.params.communityId],
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('event.rsvpFailed'));
        },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (eventId) {
            return (0, api_1.api)("/api/events/".concat(eventId), {
                method: 'DELETE',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({
                            queryKey: ['community-events', route.params.communityId],
                        })];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('event.deletedTitle'), t('event.deletedBody'));
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('event.deleteFailed'));
        },
    });
    (0, react_1.useLayoutEffect)(function () {
        navigation.setOptions({
            headerRight: function () { return (<react_native_1.TouchableOpacity onPress={function () {
                    return navigation.navigate('EditCommunityEvent', {
                        communityId: route.params.communityId,
                        communityName: route.params.communityName,
                    });
                }} hitSlop={8}>
          <react_native_1.Text style={styles.headerAction}>+</react_native_1.Text>
        </react_native_1.TouchableOpacity>); },
        });
    }, [navigation, route.params.communityId, route.params.communityName]);
    var handleRsvp = (0, react_1.useCallback)(function (event, status) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(event.userRsvpStatus === status)) return [3 /*break*/, 2];
                    return [4 /*yield*/, removeRsvpMutation.mutateAsync(event.id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2: return [4 /*yield*/, setRsvpMutation.mutateAsync({
                        eventId: event.id,
                        status: status,
                    })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [removeRsvpMutation, setRsvpMutation]);
    var canManageEvent = (0, react_1.useCallback)(function (event) {
        return canManageAllEvents || event.createdByUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id);
    }, [canManageAllEvents, currentUser === null || currentUser === void 0 ? void 0 : currentUser.id]);
    var handleEventMenu = (0, react_1.useCallback)(function (event) {
        var actions = [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.edit'),
                onPress: function () {
                    navigation.navigate('EditCommunityEvent', {
                        communityId: route.params.communityId,
                        communityName: route.params.communityName,
                        eventId: event.id,
                    });
                },
            },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: function () {
                    react_native_1.Alert.alert(t('event.deleteConfirmTitle'), t('event.deleteConfirmBody', { title: event.title }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('common.delete'),
                            style: 'destructive',
                            onPress: function () { return deleteMutation.mutate(event.id); },
                        },
                    ]);
                },
            },
        ];
        react_native_1.Alert.alert(event.title, t('event.manageBody'), actions);
    }, [
        deleteMutation,
        navigation,
        route.params.communityId,
        route.params.communityName,
        t,
    ]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('community.eventsLoading')}/>;
    }
    var events = (_c = data === null || data === void 0 ? void 0 : data.events) !== null && _c !== void 0 ? _c : [];
    var filteredEvents = (0, react_1.useMemo)(function () {
        var now = new Date();
        var todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        var tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);
        var weekStart = new Date(todayStart);
        var dayOfWeek = weekStart.getDay();
        var daysFromMonday = (dayOfWeek + 6) % 7;
        weekStart.setDate(weekStart.getDate() - daysFromMonday);
        var nextWeekStart = new Date(weekStart);
        nextWeekStart.setDate(weekStart.getDate() + 7);
        var filtered = events.filter(function (event) {
            var _a, _b, _c;
            if (locationFilter === 'withLocation' && !((_a = event.location) === null || _a === void 0 ? void 0 : _a.trim())) {
                return false;
            }
            if (hostFilter === 'mine' && event.createdByUserId !== (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)) {
                return false;
            }
            if (rsvpFilter !== 'all' && event.userRsvpStatus !== rsvpFilter) {
                return false;
            }
            var eventStart = new Date(event.startAt);
            if (timeFilter === 'today' && (eventStart < todayStart || eventStart >= tomorrowStart)) {
                return false;
            }
            if (timeFilter === 'week' && (eventStart < weekStart || eventStart >= nextWeekStart)) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var haystack = [event.title, (_b = event.description) !== null && _b !== void 0 ? _b : '', (_c = event.location) !== null && _c !== void 0 ? _c : '']
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'title') {
                var left_1 = a.title.toLocaleLowerCase();
                var right_1 = b.title.toLocaleLowerCase();
                return sortOrder === 'nearest'
                    ? left_1.localeCompare(right_1)
                    : right_1.localeCompare(left_1);
            }
            if (sortField === 'attendance') {
                var left_2 = a.rsvpCounts.interested + a.rsvpCounts.going;
                var right_2 = b.rsvpCounts.interested + b.rsvpCounts.going;
                return sortOrder === 'nearest' ? right_2 - left_2 : left_2 - right_2;
            }
            var left = new Date(a.startAt).getTime();
            var right = new Date(b.startAt).getTime();
            return sortOrder === 'nearest' ? left - right : right - left;
        });
    }, [
        currentUser === null || currentUser === void 0 ? void 0 : currentUser.id,
        deferredSearchQuery,
        events,
        hostFilter,
        locationFilter,
        rsvpFilter,
        sortField,
        sortOrder,
        timeFilter,
    ]);
    var pendingEventId = (_e = (_d = setRsvpMutation.variables) === null || _d === void 0 ? void 0 : _d.eventId) !== null && _e !== void 0 ? _e : (typeof removeRsvpMutation.variables === 'string'
        ? removeRsvpMutation.variables
        : null);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.FlatList data={filteredEvents} keyExtractor={function (item) { return item.id; }} ListHeaderComponent={<react_native_1.View style={styles.headerFilters}>
            <react_native_1.View style={styles.scopeTabs}>
              <react_native_1.TouchableOpacity style={[
                styles.scopeTab,
                scope === 'upcoming' && styles.scopeTabActive,
            ]} onPress={function () { return setScope('upcoming'); }}>
                <react_native_1.Text style={[
                styles.scopeTabText,
                scope === 'upcoming' && styles.scopeTabTextActive,
            ]}>
                  {t('event.upcomingTab')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={[
                styles.scopeTab,
                scope === 'past' && styles.scopeTabActive,
            ]} onPress={function () { return setScope('past'); }}>
                <react_native_1.Text style={[
                styles.scopeTabText,
                scope === 'past' && styles.scopeTabTextActive,
            ]}>
                  {t('event.pastTab')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                { key: 'all', label: t('event.filterAll') },
                { key: 'interested', label: t('event.interested') },
                { key: 'going', label: t('event.going') },
            ].map(function (option) {
                var active = rsvpFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setRsvpFilter(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                { key: 'all', label: t('event.filterAll') },
                { key: 'mine', label: t('event.filterMine') },
            ].map(function (option) {
                var active = hostFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setHostFilter(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                { key: 'all', label: t('event.filterAll') },
                { key: 'withLocation', label: t('event.filterWithLocation') },
            ].map(function (option) {
                var active = locationFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setLocationFilter(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                { key: 'all', label: t('event.filterAll') },
                { key: 'today', label: t('event.filterToday') },
                { key: 'week', label: t('event.filterThisWeek') },
            ].map(function (option) {
                var active = timeFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setTimeFilter(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('event.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                { key: 'startAt', label: t('event.sortStartAt') },
                { key: 'title', label: t('event.sortTitle') },
                { key: 'attendance', label: t('event.sortAttendance') },
            ].map(function (option) {
                var active = sortField === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setSortField(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.rsvpTabs}>
              {[
                {
                    key: 'nearest',
                    label: sortField === 'startAt'
                        ? t('event.sortNearest')
                        : sortField === 'title'
                            ? t('settings.sortAsc')
                            : t('event.sortMostAttendees'),
                },
                {
                    key: 'farthest',
                    label: sortField === 'startAt'
                        ? t('event.sortFarthest')
                        : sortField === 'title'
                            ? t('settings.sortDesc')
                            : t('event.sortFewestAttendees'),
                },
            ].map(function (option) {
                var active = sortOrder === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.scopeTab, active && styles.scopeTabActive]} onPress={function () { return setSortOrder(option.key); }}>
                    <react_native_1.Text style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
          </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var item = _a.item;
            var isBusy = pendingEventId === item.id &&
                (setRsvpMutation.isPending || removeRsvpMutation.isPending);
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.cardHeader}>
                <react_native_1.TouchableOpacity style={styles.cardHeaderPressable} activeOpacity={0.85} onPress={function () {
                    return navigation.navigate('EventDetails', {
                        communityId: route.params.communityId,
                        eventId: item.id,
                        eventTitle: item.title,
                    });
                }}>
                  <react_native_1.View style={styles.cardHeaderText}>
                    <react_native_1.Text style={styles.title}>{item.title}</react_native_1.Text>
                    <react_native_1.Text style={styles.time}>
                      {formatEventRange(item.startAt, item.endAt, locale)}
                    </react_native_1.Text>
                  </react_native_1.View>

                  {item.description ? (<react_native_1.Text style={styles.description}>{item.description}</react_native_1.Text>) : null}

                  {item.location ? (<react_native_1.View style={styles.metaRow}>
                      <react_native_1.Text style={styles.metaLabel}>{t('event.location')}</react_native_1.Text>
                      <react_native_1.Text style={styles.metaValue}>{item.location}</react_native_1.Text>
                    </react_native_1.View>) : null}
                </react_native_1.TouchableOpacity>
                {canManageEvent(item) ? (<react_native_1.TouchableOpacity style={styles.menuButton} onPress={function () { return handleEventMenu(item); }} hitSlop={8}>
                    <react_native_1.Text style={styles.menuButtonText}>{"\u22EF"}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
              </react_native_1.View>

              <react_native_1.View style={styles.buttonRow}>
                <react_native_1.TouchableOpacity style={[
                    styles.rsvpButton,
                    item.userRsvpStatus === 'interested' && styles.interestedActive,
                    isBusy && styles.disabledButton,
                ]} onPress={function () { return handleRsvp(item, 'interested'); }} disabled={isBusy}>
                  <react_native_1.Text style={[
                    styles.rsvpButtonText,
                    item.userRsvpStatus === 'interested' && styles.activeButtonText,
                ]}>
                    {t('event.interested')} ({item.rsvpCounts.interested})
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>

                <react_native_1.TouchableOpacity style={[
                    styles.rsvpButton,
                    item.userRsvpStatus === 'going' && styles.goingActive,
                    isBusy && styles.disabledButton,
                ]} onPress={function () { return handleRsvp(item, 'going'); }} disabled={isBusy}>
                  <react_native_1.Text style={[
                    styles.rsvpButtonText,
                    item.userRsvpStatus === 'going' && styles.activeButtonText,
                ]}>
                    {t('event.going')} ({item.rsvpCounts.going})
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              <react_native_1.TouchableOpacity style={styles.attendeesButton} onPress={function () {
                    return navigation.navigate('EventAttendees', {
                        communityId: route.params.communityId,
                        eventId: item.id,
                        eventTitle: item.title,
                    });
                }}>
                <react_native_1.Text style={styles.attendeesButtonText}>
                  {t('event.viewAttendees')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>);
        }} ListEmptyComponent={<EmptyState_1.default icon={"\uD83D\uDCC5"} title={deferredSearchQuery
                ? t('event.noSearchResults')
                : timeFilter === 'today'
                    ? t('event.noTodayEvents')
                    : timeFilter === 'week'
                        ? t('event.noThisWeekEvents')
                        : locationFilter === 'withLocation'
                            ? t('event.noLocationEvents')
                            : hostFilter === 'mine'
                                ? t('event.noHostedEvents')
                                : scope === 'past'
                                    ? t('event.noPastEvents')
                                    : t('event.noEvents')} subtitle={deferredSearchQuery
                ? t('event.noSearchResultsBody')
                : timeFilter === 'today'
                    ? t('event.noTodayEventsBody')
                    : timeFilter === 'week'
                        ? t('event.noThisWeekEventsBody')
                        : locationFilter === 'withLocation'
                            ? t('event.noLocationEventsBody')
                            : hostFilter === 'mine'
                                ? t('event.noHostedEventsBody')
                                : scope === 'past'
                                    ? t('event.noPastEventsBody')
                                    : t('community.eventsHint')}/>} contentContainerStyle={[
            styles.content,
            filteredEvents.length === 0 && styles.emptyContent,
        ]}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    headerAction: {
        color: theme_1.colors.primary,
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 28,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    headerFilters: {
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.md,
    },
    scopeTabs: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    rsvpTabs: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    scopeTab: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.full,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    scopeTabActive: {
        backgroundColor: theme_1.colors.primary,
        borderColor: theme_1.colors.primary,
    },
    scopeTabText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    scopeTabTextActive: {
        color: theme_1.colors.white,
    },
    emptyContent: {
        flexGrow: 1,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        padding: theme_1.spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
    },
    cardHeaderText: {
        flex: 1,
    },
    cardHeaderPressable: {
        flex: 1,
    },
    title: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    time: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.xs,
        lineHeight: 20,
    },
    description: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
        marginTop: theme_1.spacing.md,
    },
    metaRow: {
        marginTop: theme_1.spacing.md,
    },
    metaLabel: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        marginBottom: theme_1.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    metaValue: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
    },
    menuButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.backgroundDark,
    },
    menuButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: 18,
        lineHeight: 18,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.lg,
    },
    attendeesButton: {
        marginTop: theme_1.spacing.md,
        alignSelf: 'flex-start',
        paddingVertical: theme_1.spacing.xs,
    },
    attendeesButtonText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    rsvpButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.backgroundDark,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme_1.spacing.md,
    },
    interestedActive: {
        backgroundColor: theme_1.colors.primary,
        borderColor: theme_1.colors.primary,
    },
    goingActive: {
        backgroundColor: theme_1.colors.success,
        borderColor: theme_1.colors.success,
    },
    disabledButton: {
        opacity: 0.6,
    },
    rsvpButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    activeButtonText: {
        color: theme_1.colors.white,
    },
});
