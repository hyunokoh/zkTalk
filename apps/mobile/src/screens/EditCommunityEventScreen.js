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
exports.default = EditCommunityEventScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var datetimepicker_1 = require("@react-native-community/datetimepicker");
var react_query_1 = require("@tanstack/react-query");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function formatDateTime(date, locale) {
    return date.toLocaleString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function mergeDatePart(base, selected) {
    var next = new Date(base);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    return next;
}
function mergeTimePart(base, selected) {
    var next = new Date(base);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    return next;
}
function EditCommunityEventScreen(_a) {
    var _this = this;
    var _b, _c;
    var navigation = _a.navigation, route = _a.route;
    var _d = (0, i18n_1.useTranslation)(), t = _d.t, locale = _d.locale;
    var queryClient = (0, react_query_1.useQueryClient)();
    var isEditing = Boolean(route.params.eventId);
    var _e = (0, react_1.useState)(''), title = _e[0], setTitle = _e[1];
    var _f = (0, react_1.useState)(''), description = _f[0], setDescription = _f[1];
    var _g = (0, react_1.useState)(''), location = _g[0], setLocation = _g[1];
    var _h = (0, react_1.useState)(function () {
        var now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        return now;
    }), startAt = _h[0], setStartAt = _h[1];
    var _j = (0, react_1.useState)(false), hasEndAt = _j[0], setHasEndAt = _j[1];
    var _k = (0, react_1.useState)(function () {
        var next = new Date();
        next.setHours(next.getHours() + 1, 0, 0, 0);
        return next;
    }), endAt = _k[0], setEndAt = _k[1];
    var _l = (0, react_1.useState)(null), activePicker = _l[0], setActivePicker = _l[1];
    var _m = (0, react_1.useState)(false), devActionAttempted = _m[0], setDevActionAttempted = _m[1];
    var eventQuery = (0, react_query_1.useQuery)({
        queryKey: ['community-event', route.params.eventId],
        queryFn: function () {
            return (0, api_1.api)("/api/events/".concat(route.params.eventId));
        },
        enabled: isEditing,
    });
    (0, react_1.useEffect)(function () {
        var _a, _b, _c;
        var event = (_a = eventQuery.data) === null || _a === void 0 ? void 0 : _a.event;
        if (!event)
            return;
        setTitle(event.title);
        setDescription((_b = event.description) !== null && _b !== void 0 ? _b : '');
        setLocation((_c = event.location) !== null && _c !== void 0 ? _c : '');
        setStartAt(new Date(event.startAt));
        if (event.endAt) {
            setHasEndAt(true);
            setEndAt(new Date(event.endAt));
        }
        else {
            setHasEndAt(false);
            var fallbackEnd = new Date(event.startAt);
            fallbackEnd.setHours(fallbackEnd.getHours() + 1);
            setEndAt(fallbackEnd);
        }
    }, [(_b = eventQuery.data) === null || _b === void 0 ? void 0 : _b.event]);
    var payload = (0, react_1.useMemo)(function () { return ({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startAt: startAt.toISOString(),
        endAt: hasEndAt ? endAt.toISOString() : undefined,
    }); }, [description, endAt, hasEndAt, location, startAt, title]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)(isEditing
                ? "/api/events/".concat(route.params.eventId)
                : "/api/communities/".concat(route.params.communityId, "/events"), {
                method: isEditing ? 'PATCH' : 'POST',
                body: payload,
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({
                                queryKey: ['community-events', route.params.communityId],
                            }),
                            route.params.eventId
                                ? queryClient.invalidateQueries({
                                    queryKey: ['community-event', route.params.eventId],
                                })
                                : Promise.resolve(),
                        ])];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(isEditing ? t('event.savedTitle') : t('event.createdTitle'), isEditing ? t('event.savedBody') : t('event.createdBody'), [{ text: t('common.confirm'), onPress: function () { return navigation.goBack(); } }]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error
                ? error.message
                : isEditing
                    ? t('event.saveFailed')
                    : t('event.createFailed'));
        },
    });
    var openPicker = (0, react_1.useCallback)(function (field) {
        if (field === 'endAt' && !hasEndAt) {
            setHasEndAt(true);
            var fallback = new Date(startAt);
            fallback.setHours(fallback.getHours() + 1);
            setEndAt(fallback);
        }
        setActivePicker({
            field: field,
            step: react_native_1.Platform.OS === 'ios' ? 'datetime' : 'date',
        });
    }, [hasEndAt, startAt]);
    var handlePickerChange = (0, react_1.useCallback)(function (event, selected) {
        if (!activePicker)
            return;
        if (event.type === 'dismissed') {
            setActivePicker(null);
            return;
        }
        if (!selected)
            return;
        var currentValue = activePicker.field === 'startAt' ? startAt : endAt;
        if (react_native_1.Platform.OS === 'ios') {
            if (activePicker.field === 'startAt') {
                setStartAt(selected);
                if (hasEndAt && selected > endAt) {
                    var adjusted = new Date(selected);
                    adjusted.setHours(adjusted.getHours() + 1);
                    setEndAt(adjusted);
                }
            }
            else {
                setEndAt(selected);
            }
            return;
        }
        if (activePicker.step === 'date') {
            var nextDate_1 = mergeDatePart(currentValue, selected);
            if (activePicker.field === 'startAt') {
                setStartAt(nextDate_1);
            }
            else {
                setEndAt(nextDate_1);
            }
            setActivePicker({ field: activePicker.field, step: 'time' });
            return;
        }
        var nextDate = mergeTimePart(currentValue, selected);
        if (activePicker.field === 'startAt') {
            setStartAt(nextDate);
            if (hasEndAt && nextDate > endAt) {
                var adjusted = new Date(nextDate);
                adjusted.setHours(adjusted.getHours() + 1);
                setEndAt(adjusted);
            }
        }
        else {
            setEndAt(nextDate);
        }
        setActivePicker(null);
    }, [activePicker, endAt, hasEndAt, startAt]);
    var handleSave = (0, react_1.useCallback)(function () {
        if (!title.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('event.titleRequired'));
            return;
        }
        if (hasEndAt && endAt <= startAt) {
            react_native_1.Alert.alert(t('common.error'), t('event.endAfterStart'));
            return;
        }
        saveMutation.mutate();
    }, [endAt, hasEndAt, saveMutation, startAt, t, title]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttempted)
            return;
        if (isEditing && !((_a = eventQuery.data) === null || _a === void 0 ? void 0 : _a.event))
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, nextTitle, nextStartAt, nextEndAt, nextHasEndAt, result, error_1;
                var _a, _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-edit-community-event-action.json')];
                        case 1:
                            action = _h.sent();
                            if (!action)
                                return [2 /*return*/];
                            _h.label = 2;
                        case 2:
                            _h.trys.push([2, 6, 8, 10]);
                            if (action.type !== 'save') {
                                throw new Error('Unsupported community event dev action');
                            }
                            nextTitle = (_a = action.title) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!nextTitle) {
                                throw new Error('Missing title for community event dev action');
                            }
                            setDevActionAttempted(true);
                            setTitle(nextTitle);
                            setDescription((_c = (_b = action.description) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : '');
                            setLocation((_e = (_d = action.location) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : '');
                            nextStartAt = action.startAt ? new Date(action.startAt) : startAt;
                            nextEndAt = action.endAt ? new Date(action.endAt) : endAt;
                            nextHasEndAt = action.endAt !== null;
                            setStartAt(nextStartAt);
                            setHasEndAt(nextHasEndAt);
                            setEndAt(nextEndAt);
                            return [4 /*yield*/, (0, api_1.api)(isEditing
                                    ? "/api/events/".concat(route.params.eventId)
                                    : "/api/communities/".concat(route.params.communityId, "/events"), {
                                    method: isEditing ? 'PATCH' : 'POST',
                                    body: {
                                        title: nextTitle,
                                        description: ((_f = action.description) === null || _f === void 0 ? void 0 : _f.trim()) || undefined,
                                        location: ((_g = action.location) === null || _g === void 0 ? void 0 : _g.trim()) || undefined,
                                        startAt: nextStartAt.toISOString(),
                                        endAt: nextHasEndAt ? nextEndAt.toISOString() : undefined,
                                    },
                                })];
                        case 3:
                            result = _h.sent();
                            return [4 /*yield*/, Promise.all([
                                    queryClient.invalidateQueries({
                                        queryKey: ['community-events', route.params.communityId],
                                    }),
                                    route.params.eventId
                                        ? queryClient.invalidateQueries({
                                            queryKey: ['community-event', route.params.eventId],
                                        })
                                        : Promise.resolve(),
                                ])];
                        case 4:
                            _h.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-edit-community-event-result.json', {
                                    ok: true,
                                    eventId: result.event.id,
                                    title: result.event.title,
                                    startAt: result.event.startAt,
                                    endAt: result.event.endAt,
                                })];
                        case 5:
                            _h.sent();
                            return [3 /*break*/, 10];
                        case 6:
                            error_1 = _h.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-edit-community-event-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 7:
                            _h.sent();
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-edit-community-event-action.json')];
                        case 9:
                            _h.sent();
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [
        devActionAttempted,
        endAt,
        (_c = eventQuery.data) === null || _c === void 0 ? void 0 : _c.event,
        isEditing,
        queryClient,
        route.params.communityId,
        route.params.eventId,
        startAt,
    ]);
    if (isEditing && eventQuery.isLoading) {
        return <LoadingSpinner_1.default text={t('community.eventsLoading')}/>;
    }
    var pickerValue = activePicker
        ? activePicker.field === 'startAt'
            ? startAt
            : endAt
        : null;
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('event.formTitle')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('event.titlePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={200} autoFocus={!isEditing}/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('community.description')}</react_native_1.Text>
          <react_native_1.TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('event.descriptionPlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline numberOfLines={4} maxLength={2000} textAlignVertical="top"/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('event.location')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder={t('event.locationPlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={500}/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('event.startAt')}</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.pickerButton} onPress={function () { return openPicker('startAt'); }}>
            <react_native_1.Text style={styles.pickerValue}>
              {formatDateTime(startAt, locale)}
            </react_native_1.Text>
            <react_native_1.Text style={styles.pickerHint}>{t('event.changeDateTime')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.View style={styles.endToggleRow}>
            <react_native_1.View style={styles.endToggleText}>
              <react_native_1.Text style={styles.label}>{t('event.endAt')}</react_native_1.Text>
              <react_native_1.Text style={styles.helper}>{t('event.endAtHint')}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Switch value={hasEndAt} onValueChange={function (nextValue) {
            setHasEndAt(nextValue);
            if (nextValue && endAt <= startAt) {
                var adjusted = new Date(startAt);
                adjusted.setHours(adjusted.getHours() + 1);
                setEndAt(adjusted);
            }
        }} trackColor={{ false: theme_1.colors.borderLight, true: theme_1.colors.primary }} thumbColor={theme_1.colors.white}/>
          </react_native_1.View>

          {hasEndAt ? (<react_native_1.TouchableOpacity style={styles.pickerButton} onPress={function () { return openPicker('endAt'); }}>
              <react_native_1.Text style={styles.pickerValue}>
                {formatDateTime(endAt, locale)}
              </react_native_1.Text>
              <react_native_1.Text style={styles.pickerHint}>{t('event.changeDateTime')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>

        {activePicker && pickerValue ? (<react_native_1.View style={styles.pickerCard}>
            <datetimepicker_1.default value={pickerValue} mode={react_native_1.Platform.OS === 'ios' ? 'datetime' : activePicker.step} display={react_native_1.Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} minimumDate={activePicker.field === 'endAt' ? startAt : undefined}/>
            {react_native_1.Platform.OS === 'ios' ? (<react_native_1.TouchableOpacity style={styles.pickerDoneButton} onPress={function () { return setActivePicker(null); }}>
                <react_native_1.Text style={styles.pickerDoneText}>{t('common.confirm')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : null}
          </react_native_1.View>) : null}

        <react_native_1.TouchableOpacity style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]} onPress={handleSave} disabled={saveMutation.isPending}>
          <react_native_1.Text style={styles.saveButtonText}>
            {saveMutation.isPending
            ? isEditing
                ? t('event.saving')
                : t('event.creating')
            : isEditing
                ? t('common.save')
                : t('event.create')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
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
    label: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    helper: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
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
        minHeight: 100,
    },
    pickerButton: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.lg,
    },
    pickerValue: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    pickerHint: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    endToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
    },
    endToggleText: {
        flex: 1,
    },
    pickerCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    pickerDoneButton: {
        borderTopWidth: 1,
        borderTopColor: theme_1.colors.border,
        alignItems: 'center',
        paddingVertical: theme_1.spacing.md,
    },
    pickerDoneText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
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
});
