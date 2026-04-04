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
exports.default = EventDetailsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var Linking = require("expo-linking");
var expo_file_system_1 = require("expo-file-system");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
function formatEventRange(startAt, endAt, locale) {
    var start = new Date(startAt);
    var end = endAt ? new Date(endAt) : null;
    var startLabel = start.toLocaleString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    if (!end) {
        return startLabel;
    }
    return "".concat(startLabel, " - ").concat(end.toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }));
}
function getLocationUrl(location) {
    var trimmed = location.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return "https://maps.apple.com/?q=".concat(encodeURIComponent(trimmed));
}
function escapeIcsText(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function toIcsDate(dateString) {
    return new Date(dateString)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
}
function EventDetailsScreen(_a) {
    var _this = this;
    var _b;
    var navigation = _a.navigation, route = _a.route;
    var _c = (0, i18n_1.useTranslation)(), t = _c.t, locale = _c.locale;
    var rootNavigation = (0, native_1.useNavigation)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var currentUser = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['community-event', route.params.eventId],
        queryFn: function () { return (0, api_1.api)("/api/events/".concat(route.params.eventId)); },
    }), data = _d.data, isLoading = _d.isLoading, refetch = _d.refetch, isRefetching = _d.isRefetching;
    var event = data === null || data === void 0 ? void 0 : data.event;
    var membersData = (0, react_query_1.useQuery)({
        queryKey: ['community-members', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/members"));
        },
    }).data;
    var currentRole = (_b = membersData === null || membersData === void 0 ? void 0 : membersData.members.find(function (member) { return member.userId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id); })) === null || _b === void 0 ? void 0 : _b.role;
    var canManageEvent = !!event &&
        (['owner', 'admin'].includes(currentRole !== null && currentRole !== void 0 ? currentRole : '') || event.createdByUserId === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id));
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
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
                            queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
                            queryClient.invalidateQueries({ queryKey: ['event-attendees', route.params.eventId] }),
                        ])];
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
            return (0, api_1.api)("/api/events/".concat(eventId, "/rsvp"), { method: 'DELETE' });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
                            queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
                            queryClient.invalidateQueries({ queryKey: ['event-attendees', route.params.eventId] }),
                        ])];
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
    var createDmMutation = (0, react_query_1.useMutation)({
        mutationFn: function (targetUserId) {
            return (0, api_1.api)('/api/dm/conversations', {
                method: 'POST',
                body: { targetUserId: targetUserId },
            });
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
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
                            queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
                        ])];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('event.deletedTitle'), t('event.deletedBody'), [
                            { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('event.deleteFailed'));
        },
    });
    (0, react_1.useLayoutEffect)(function () {
        var _a, _b;
        var handleEventMenu = function () {
            if (!event)
                return;
            var actions = [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.edit'),
                    onPress: function () {
                        navigation.navigate('EditCommunityEvent', {
                            communityId: route.params.communityId,
                            communityName: undefined,
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
        };
        navigation.setOptions({
            title: (_b = (_a = event === null || event === void 0 ? void 0 : event.title) !== null && _a !== void 0 ? _a : route.params.eventTitle) !== null && _b !== void 0 ? _b : t('event.detailsDefaultTitle'),
            headerRight: function () { return (<react_native_1.View style={styles.headerActions}>
          <react_native_1.TouchableOpacity onPress={function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!event)
                                    return [2 /*return*/];
                                return [4 /*yield*/, react_native_1.Share.share({
                                        title: event.title,
                                        message: [
                                            event.title,
                                            formatEventRange(event.startAt, event.endAt, locale),
                                            event.location ? "".concat(t('event.location'), ": ").concat(event.location) : null,
                                            event.description,
                                        ]
                                            .filter(Boolean)
                                            .join('\n'),
                                    })];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); }} hitSlop={8}>
            <react_native_1.Text style={styles.headerAction}>{"\uD83D\uDCE4"}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          {canManageEvent ? (<react_native_1.TouchableOpacity onPress={handleEventMenu} hitSlop={8}>
              <react_native_1.Text style={styles.headerAction}>{"\u22EF"}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>); },
        });
    }, [
        canManageEvent,
        deleteMutation,
        event,
        locale,
        navigation,
        route.params.communityId,
        route.params.eventId,
        route.params.eventTitle,
        t,
    ]);
    var handleRsvp = (0, react_1.useCallback)(function (status) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!event)
                        return [2 /*return*/];
                    if (!(event.userRsvpStatus === status)) return [3 /*break*/, 2];
                    return [4 /*yield*/, removeRsvpMutation.mutateAsync(event.id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2: return [4 /*yield*/, setRsvpMutation.mutateAsync({ eventId: event.id, status: status })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [event, removeRsvpMutation, setRsvpMutation]);
    var handleOpenLocation = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var url, supported;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(event === null || event === void 0 ? void 0 : event.location))
                        return [2 /*return*/];
                    url = getLocationUrl(event.location);
                    return [4 /*yield*/, Linking.canOpenURL(url)];
                case 1:
                    supported = _a.sent();
                    if (!supported) {
                        react_native_1.Alert.alert(t('common.error'), t('event.openLocationFailed'));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, Linking.openURL(url)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [event === null || event === void 0 ? void 0 : event.location, t]);
    var handleAddToCalendar = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var fileName, file, lines, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!event)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    fileName = "zktalk-event-".concat(event.id, ".ics");
                    file = new expo_file_system_1.File(expo_file_system_1.Paths.cache, fileName);
                    if (file.exists) {
                        file.delete();
                    }
                    file.create();
                    lines = [
                        'BEGIN:VCALENDAR',
                        'VERSION:2.0',
                        'PRODID:-//zkTalk//Events//EN',
                        'BEGIN:VEVENT',
                        "UID:".concat(event.id, "@zktalk.app"),
                        "DTSTAMP:".concat(toIcsDate(new Date().toISOString())),
                        "DTSTART:".concat(toIcsDate(event.startAt)),
                        event.endAt ? "DTEND:".concat(toIcsDate(event.endAt)) : null,
                        "SUMMARY:".concat(escapeIcsText(event.title)),
                        event.description ? "DESCRIPTION:".concat(escapeIcsText(event.description)) : null,
                        event.location ? "LOCATION:".concat(escapeIcsText(event.location)) : null,
                        'END:VEVENT',
                        'END:VCALENDAR',
                    ]
                        .filter(Boolean)
                        .join('\r\n');
                    file.write(lines);
                    return [4 /*yield*/, react_native_1.Share.share({
                            title: "".concat(event.title, ".ics"),
                            message: t('event.calendarShareBody', { title: event.title }),
                            url: file.uri,
                        })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), t('event.calendarShareFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [event, t]);
    var handleMessageHost = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!event)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, createDmMutation.mutateAsync(event.creator.id)];
                case 2:
                    result = _a.sent();
                    rootNavigation.navigate('Main', {
                        screen: 'DmTab',
                        params: {
                            screen: 'DmScreen',
                            params: {
                                conversationId: result.id,
                                userId: event.creator.id,
                                displayName: event.creator.displayName,
                            },
                        },
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('event.messageHostFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [createDmMutation, event, rootNavigation, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || !event)
            return;
        var cancelled = false;
        var currentEventId = event.id;
        var currentStatus = event.userRsvpStatus;
        function runDevEventAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-event-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action || cancelled)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 10, 12]);
                            if (!(action === null || action === void 0 ? void 0 : action.eventId) || action.eventId !== currentEventId || !action.action) {
                                return [2 /*return*/];
                            }
                            if (!(action.action === 'clear')) return [3 /*break*/, 5];
                            if (!currentStatus) return [3 /*break*/, 4];
                            return [4 /*yield*/, removeRsvpMutation.mutateAsync(currentEventId)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                        case 5:
                            if (!(action.action === 'messageHost')) return [3 /*break*/, 7];
                            return [4 /*yield*/, handleMessageHost()];
                        case 6:
                            _a.sent();
                            return [2 /*return*/];
                        case 7:
                            if (!(currentStatus !== action.action)) return [3 /*break*/, 9];
                            return [4 /*yield*/, setRsvpMutation.mutateAsync({
                                    eventId: currentEventId,
                                    status: action.action,
                                })];
                        case 8:
                            _a.sent();
                            _a.label = 9;
                        case 9: return [3 /*break*/, 12];
                        case 10: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-event-action.json')];
                        case 11:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevEventAction();
        return function () {
            cancelled = true;
        };
    }, [event, handleMessageHost, removeRsvpMutation, setRsvpMutation]);
    if (isLoading || !event) {
        return <LoadingSpinner_1.default text={t('community.eventsLoading')}/>;
    }
    var isBusy = setRsvpMutation.isPending || removeRsvpMutation.isPending;
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>}>
        <react_native_1.View style={styles.card}>
          <react_native_1.Text style={styles.title}>{event.title}</react_native_1.Text>
          <react_native_1.Text style={styles.time}>{formatEventRange(event.startAt, event.endAt, locale)}</react_native_1.Text>

          <react_native_1.View style={styles.creatorRow}>
            <react_native_1.View style={[
            styles.avatar,
            { backgroundColor: (0, theme_1.getAvatarColor)(event.creator.displayName) },
        ]}>
              <react_native_1.Text style={styles.avatarText}>
                {event.creator.displayName.charAt(0).toUpperCase()}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.creatorInfo}>
              <react_native_1.Text style={styles.creatorLabel}>{t('event.hostedBy')}</react_native_1.Text>
              <react_native_1.Text style={styles.creatorName}>
                {event.creator.displayName} @{event.creator.username}
              </react_native_1.Text>
            </react_native_1.View>
            {event.creator.id !== (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) ? (<react_native_1.TouchableOpacity style={styles.hostMessageButton} onPress={handleMessageHost}>
                <react_native_1.Text style={styles.hostMessageButtonText}>{t('event.messageHost')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : null}
          </react_native_1.View>

          {event.description ? (<react_native_1.Text style={styles.description}>{event.description}</react_native_1.Text>) : null}

          {event.location ? (<react_native_1.TouchableOpacity style={styles.locationCard} onPress={handleOpenLocation}>
              <react_native_1.Text style={styles.metaLabel}>{t('event.location')}</react_native_1.Text>
              <react_native_1.Text style={styles.locationValue}>{event.location}</react_native_1.Text>
              <react_native_1.Text style={styles.locationHint}>{t('event.openLocation')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}

          <react_native_1.TouchableOpacity style={styles.calendarButton} onPress={handleAddToCalendar}>
            <react_native_1.Text style={styles.calendarButtonText}>{t('event.addToCalendar')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>

          <react_native_1.View style={styles.countRow}>
            <react_native_1.View style={styles.countChip}>
              <react_native_1.Text style={styles.countNumber}>{event.rsvpCounts.going}</react_native_1.Text>
              <react_native_1.Text style={styles.countLabel}>{t('event.going')}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.countChip}>
              <react_native_1.Text style={styles.countNumber}>{event.rsvpCounts.interested}</react_native_1.Text>
              <react_native_1.Text style={styles.countLabel}>{t('event.interested')}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.buttonRow}>
            <react_native_1.TouchableOpacity style={[
            styles.rsvpButton,
            event.userRsvpStatus === 'interested' && styles.interestedActive,
            isBusy && styles.disabledButton,
        ]} onPress={function () { return handleRsvp('interested'); }} disabled={isBusy}>
              <react_native_1.Text style={[
            styles.rsvpButtonText,
            event.userRsvpStatus === 'interested' && styles.activeButtonText,
        ]}>
                {t('event.interested')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={[
            styles.rsvpButton,
            event.userRsvpStatus === 'going' && styles.goingActive,
            isBusy && styles.disabledButton,
        ]} onPress={function () { return handleRsvp('going'); }} disabled={isBusy}>
              <react_native_1.Text style={[
            styles.rsvpButtonText,
            event.userRsvpStatus === 'going' && styles.activeButtonText,
        ]}>
                {t('event.going')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={styles.attendeesButton} onPress={function () {
            return navigation.navigate('EventAttendees', {
                communityId: route.params.communityId,
                eventId: event.id,
                eventTitle: event.title,
            });
        }}>
            <react_native_1.Text style={styles.attendeesButtonText}>{t('event.viewAttendees')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
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
    },
    headerAction: {
        fontSize: 18,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.md,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        padding: theme_1.spacing.lg,
    },
    title: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxxl,
        fontWeight: '700',
    },
    time: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 22,
        marginTop: theme_1.spacing.sm,
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    creatorInfo: {
        flex: 1,
    },
    hostMessageButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    hostMessageButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    creatorLabel: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    creatorName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
        marginTop: theme_1.spacing.xs,
    },
    description: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        lineHeight: 22,
        marginTop: theme_1.spacing.lg,
    },
    locationCard: {
        marginTop: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.md,
        padding: theme_1.spacing.lg,
    },
    metaLabel: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    locationValue: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
        marginTop: theme_1.spacing.xs,
    },
    locationHint: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.sm,
    },
    calendarButton: {
        marginTop: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.primaryDark,
        borderRadius: theme_1.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme_1.spacing.md,
    },
    calendarButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    countRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.lg,
    },
    countChip: {
        flex: 1,
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
    },
    countNumber: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '700',
    },
    countLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.lg,
    },
    rsvpButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        backgroundColor: theme_1.colors.backgroundDark,
        alignItems: 'center',
        justifyContent: 'center',
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
    attendeesButton: {
        marginTop: theme_1.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.md,
        backgroundColor: theme_1.colors.surfaceHover,
    },
    attendeesButtonText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
});
