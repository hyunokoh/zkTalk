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
exports.default = CommunityReportsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function getReasonLabel(reasonCode, t) {
    switch (reasonCode) {
        case 'spam':
            return t('message.reportSpam');
        case 'harassment':
            return t('message.reportHarassment');
        case 'inappropriate':
            return t('message.reportInappropriate');
        default:
            return reasonCode;
    }
}
function CommunityReportsScreen(_a) {
    var _this = this;
    var _b;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)('open'), status = _c[0], setStatus = _c[1];
    var _d = (0, react_1.useState)(''), searchQuery = _d[0], setSearchQuery = _d[1];
    var _e = (0, react_1.useState)(null), selectedReasonFilter = _e[0], setSelectedReasonFilter = _e[1];
    var _f = (0, react_1.useState)('all'), messageFilter = _f[0], setMessageFilter = _f[1];
    var _g = (0, react_1.useState)('reportedAt'), sortField = _g[0], setSortField = _g[1];
    var _h = (0, react_1.useState)('newest'), sortOrder = _h[0], setSortOrder = _h[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['community-reports', route.params.communityId, status],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/reports?status=").concat(encodeURIComponent(status)));
        },
    }), data = _j.data, isLoading = _j.isLoading, isError = _j.isError, error = _j.error, refetch = _j.refetch, isRefetching = _j.isRefetching;
    var resolveMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var reportId = _a.reportId, nextStatus = _a.nextStatus;
            return (0, api_1.api)("/api/reports/".concat(reportId), {
                method: 'PATCH',
                body: { status: nextStatus },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({
                            queryKey: ['community-reports', route.params.communityId],
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (mutationError) {
            react_native_1.Alert.alert(t('common.error'), mutationError instanceof Error
                ? mutationError.message
                : t('community.reportsResolveFailed'));
        },
    });
    var tabs = (0, react_1.useMemo)(function () { return [
        { key: 'open', label: t('community.reportsOpen') },
        { key: 'resolved', label: t('community.reportsResolved') },
        { key: 'dismissed', label: t('community.reportsDismissed') },
    ]; }, [t]);
    var handleResolve = (0, react_1.useCallback)(function (reportId, nextStatus) {
        resolveMutation.mutate({ reportId: reportId, nextStatus: nextStatus });
    }, [resolveMutation]);
    var reports = (_b = data === null || data === void 0 ? void 0 : data.reports) !== null && _b !== void 0 ? _b : [];
    var availableReasonFilters = (0, react_1.useMemo)(function () {
        var reasonCodes = Array.from(new Set(reports.map(function (item) { return item.report.reasonCode; })));
        return reasonCodes.sort(function (a, b) {
            return getReasonLabel(a, t).localeCompare(getReasonLabel(b, t));
        });
    }, [reports, t]);
    var filteredReports = (0, react_1.useMemo)(function () {
        var filtered = reports.filter(function (item) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            if (messageFilter === 'withMessage' && (!((_a = item.message) === null || _a === void 0 ? void 0 : _a.id) || !item.message.channelId)) {
                return false;
            }
            if (selectedReasonFilter && item.report.reasonCode !== selectedReasonFilter) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var preview = ((_b = item.message) === null || _b === void 0 ? void 0 : _b.isDeleted)
                ? t('message.deleted')
                : ((_c = item.message) === null || _c === void 0 ? void 0 : _c.isEncrypted)
                    ? t('dm.encryptedMessagePlaceholder')
                    : (((_d = item.message) === null || _d === void 0 ? void 0 : _d.bodyPlaintext) || item.report.reasonText || '');
            var haystack = [
                getReasonLabel(item.report.reasonCode, t),
                (_e = item.report.reasonText) !== null && _e !== void 0 ? _e : '',
                (_g = (_f = item.reporter) === null || _f === void 0 ? void 0 : _f.displayName) !== null && _g !== void 0 ? _g : '',
                (_j = (_h = item.reporter) === null || _h === void 0 ? void 0 : _h.username) !== null && _j !== void 0 ? _j : '',
                preview,
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            var _a, _b, _c, _d;
            if (sortField === 'reporter') {
                var left_1 = (((_a = a.reporter) === null || _a === void 0 ? void 0 : _a.displayName) || ((_b = a.reporter) === null || _b === void 0 ? void 0 : _b.username) || '').toLocaleLowerCase();
                var right_1 = (((_c = b.reporter) === null || _c === void 0 ? void 0 : _c.displayName) || ((_d = b.reporter) === null || _d === void 0 ? void 0 : _d.username) || '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? left_1.localeCompare(right_1)
                    : right_1.localeCompare(left_1);
            }
            var left = new Date(a.report.createdAt).getTime();
            var right = new Date(b.report.createdAt).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
    }, [deferredSearchQuery, messageFilter, reports, selectedReasonFilter, sortField, sortOrder, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || isLoading)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, target;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-community-reports-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 3, 5]);
                            if (action.type !== 'resolveOpen')
                                return [2 /*return*/];
                            target = reports.find(function (item) { return item.report.status === 'open'; });
                            if (target) {
                                handleResolve(target.report.id, 'resolved');
                            }
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-community-reports-action.json')];
                        case 4:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [handleResolve, isLoading, reports]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('community.reportsLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      {isError ? (<react_native_1.View style={styles.emptyWrap}>
          <EmptyState_1.default icon="🛡️" title={t('community.reportsUnavailable')} subtitle={error instanceof Error ? error.message : t('community.reportsUnavailableHint')}/>
          <react_native_1.TouchableOpacity style={styles.retryButton} onPress={function () { return refetch(); }}>
            <react_native_1.Text style={styles.retryButtonText}>{t('common.retry')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : (<react_native_1.FlatList data={filteredReports} keyExtractor={function (item) { return item.report.id; }} ListHeaderComponent={<react_native_1.View style={styles.headerFilters}>
              <react_native_1.View style={styles.tabs}>
                {tabs.map(function (tab) {
                    var active = tab.key === status;
                    return (<react_native_1.TouchableOpacity key={tab.key} style={[styles.tabButton, active && styles.tabButtonActive]} onPress={function () { return setStatus(tab.key); }}>
                      <react_native_1.Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('community.reportsSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
              <react_native_1.View style={styles.reasonFilterWrap}>
                {[
                    { key: 'reportedAt', label: t('community.reportsSortReportedAt') },
                    { key: 'reporter', label: t('community.reportsSortReporter') },
                ].map(function (option) {
                    var selected = sortField === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]} onPress={function () { return setSortField(option.key); }}>
                      <react_native_1.Text style={[
                            styles.reasonFilterChipText,
                            selected && styles.reasonFilterChipTextSelected,
                        ]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.View style={styles.reasonFilterWrap}>
                {[
                    {
                        key: 'newest',
                        label: sortField === 'reporter' ? t('settings.sortAsc') : t('settings.sortNewest'),
                    },
                    {
                        key: 'oldest',
                        label: sortField === 'reporter' ? t('settings.sortDesc') : t('settings.sortOldest'),
                    },
                ].map(function (option) {
                    var selected = sortOrder === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]} onPress={function () { return setSortOrder(option.key); }}>
                      <react_native_1.Text style={[
                            styles.reasonFilterChipText,
                            selected && styles.reasonFilterChipTextSelected,
                        ]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.View style={styles.reasonFilterWrap}>
                {[
                    { key: 'all', label: t('community.reportsFilterAll') },
                    { key: 'withMessage', label: t('community.reportsFilterWithMessage') },
                ].map(function (option) {
                    var selected = messageFilter === option.key;
                    return (<react_native_1.TouchableOpacity key={option.key} style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]} onPress={function () { return setMessageFilter(option.key); }}>
                      <react_native_1.Text style={[
                            styles.reasonFilterChipText,
                            selected && styles.reasonFilterChipTextSelected,
                        ]}>
                        {option.label}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
              <react_native_1.View style={styles.reasonFilterWrap}>
                <react_native_1.TouchableOpacity style={[
                    styles.reasonFilterChip,
                    selectedReasonFilter === null && styles.reasonFilterChipSelected,
                ]} onPress={function () { return setSelectedReasonFilter(null); }}>
                  <react_native_1.Text style={[
                    styles.reasonFilterChipText,
                    selectedReasonFilter === null && styles.reasonFilterChipTextSelected,
                ]}>
                    {t('community.reportsFilterAll')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                {availableReasonFilters.map(function (reasonCode) {
                    var selected = selectedReasonFilter === reasonCode;
                    return (<react_native_1.TouchableOpacity key={reasonCode} style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]} onPress={function () { return setSelectedReasonFilter(reasonCode); }}>
                      <react_native_1.Text style={[
                            styles.reasonFilterChipText,
                            selected && styles.reasonFilterChipTextSelected,
                        ]}>
                        {getReasonLabel(reasonCode, t)}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                })}
              </react_native_1.View>
            </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
                var _b, _c, _d, _e, _f, _g, _h;
                var item = _a.item;
                var preview = ((_b = item.message) === null || _b === void 0 ? void 0 : _b.isDeleted)
                    ? t('message.deleted')
                    : ((_c = item.message) === null || _c === void 0 ? void 0 : _c.isEncrypted)
                        ? t('dm.encryptedMessagePlaceholder')
                        : (((_d = item.message) === null || _d === void 0 ? void 0 : _d.bodyPlaintext) || item.report.reasonText || '');
                var isResolving = resolveMutation.isPending && ((_e = resolveMutation.variables) === null || _e === void 0 ? void 0 : _e.reportId) === item.report.id;
                return (<react_native_1.View style={styles.card}>
                <react_native_1.View style={styles.headerRow}>
                  <react_native_1.View style={styles.headerCopy}>
                    <react_native_1.Text style={styles.reason}>
                      {getReasonLabel(item.report.reasonCode, t)}
                    </react_native_1.Text>
                    <react_native_1.Text style={styles.meta}>
                      {t('community.reportedBy', {
                        name: (_g = (_f = item.reporter) === null || _f === void 0 ? void 0 : _f.displayName) !== null && _g !== void 0 ? _g : t('common.unknown'),
                    })}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.timestamp}>
                    {new Date(item.report.createdAt).toLocaleDateString()}
                  </react_native_1.Text>
                </react_native_1.View>

                <react_native_1.Text style={styles.preview} numberOfLines={4}>
                  {preview || t('community.reportsNoContext')}
                </react_native_1.Text>

                {item.report.reasonText ? (<react_native_1.Text style={styles.reasonText}>{item.report.reasonText}</react_native_1.Text>) : null}

                <react_native_1.View style={styles.footerRow}>
                  {((_h = item.message) === null || _h === void 0 ? void 0 : _h.id) && item.message.channelId ? (<react_native_1.TouchableOpacity style={styles.openButton} onPress={function () {
                            var _a, _b, _c, _d;
                            return navigation.navigate('ChannelScreen', {
                                communityId: route.params.communityId,
                                channelId: (_b = (_a = item.message) === null || _a === void 0 ? void 0 : _a.channelId) !== null && _b !== void 0 ? _b : '',
                                focusMessageId: (_d = (_c = item.message) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : undefined,
                            });
                        }}>
                      <react_native_1.Text style={styles.openButtonText}>{t('community.reportsOpenMessage')}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>) : (<react_native_1.View style={styles.statusChip}>
                      <react_native_1.Text style={styles.statusChipText}>{t('community.reportsNoMessage')}</react_native_1.Text>
                    </react_native_1.View>)}

                  {status === 'open' && (<react_native_1.View style={styles.actionRow}>
                      <react_native_1.TouchableOpacity style={styles.dismissButton} onPress={function () { return handleResolve(item.report.id, 'dismissed'); }} disabled={isResolving}>
                        <react_native_1.Text style={styles.dismissButtonText}>
                          {t('community.reportsDismiss')}
                        </react_native_1.Text>
                      </react_native_1.TouchableOpacity>
                      <react_native_1.TouchableOpacity style={styles.resolveButton} onPress={function () { return handleResolve(item.report.id, 'resolved'); }} disabled={isResolving}>
                        <react_native_1.Text style={styles.resolveButtonText}>
                          {isResolving ? t('common.loading') : t('community.reportsResolve')}
                        </react_native_1.Text>
                      </react_native_1.TouchableOpacity>
                    </react_native_1.View>)}
                </react_native_1.View>
              </react_native_1.View>);
            }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
              <EmptyState_1.default icon="🛡️" title={deferredSearchQuery
                    ? t('community.reportsNoSearchResults')
                    : messageFilter === 'withMessage'
                        ? t('community.reportsNoMessageMatches')
                        : t('community.reportsEmpty')} subtitle={deferredSearchQuery
                    ? t('community.reportsNoSearchResultsBody')
                    : messageFilter === 'withMessage'
                        ? t('community.reportsNoMessageMatchesBody')
                        : t('community.reportsEmptyHint')}/>
            </react_native_1.View>} contentContainerStyle={filteredReports.length === 0 ? styles.emptyList : styles.list}/>)}
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    headerFilters: {
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.md,
    },
    tabs: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.sm,
    },
    searchInput: {
        marginHorizontal: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    reasonFilterWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        paddingHorizontal: theme_1.spacing.lg,
    },
    reasonFilterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    reasonFilterChipSelected: {
        backgroundColor: theme_1.colors.primary,
    },
    reasonFilterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    reasonFilterChipTextSelected: {
        color: theme_1.colors.white,
    },
    tabButton: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: theme_1.colors.primary,
    },
    tabText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    tabTextActive: {
        color: theme_1.colors.white,
    },
    list: {
        paddingVertical: theme_1.spacing.md,
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
        marginBottom: theme_1.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.sm,
    },
    headerCopy: {
        flex: 1,
    },
    reason: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    meta: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    timestamp: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.xs,
    },
    preview: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
    reasonText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.sm,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    openButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    openButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    dismissButton: {
        backgroundColor: theme_1.colors.surfaceHover,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    dismissButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    resolveButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    resolveButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    statusChip: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    statusChipText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    retryButton: {
        alignSelf: 'center',
        marginTop: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.xl,
        paddingVertical: theme_1.spacing.sm,
    },
    retryButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
});
