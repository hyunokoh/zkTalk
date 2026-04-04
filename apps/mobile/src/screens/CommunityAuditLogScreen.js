"use strict";
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
exports.default = CommunityAuditLogScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
function getActionLabel(actionType, t) {
    switch (actionType) {
        case 'report_created':
            return t('community.auditLogReportCreated');
        case 'report_resolved':
            return t('community.auditLogReportResolved');
        case 'report_dismissed':
            return t('community.auditLogReportDismissed');
        case 'member_muted':
            return t('community.auditLogMemberMuted');
        case 'member_kicked':
            return t('community.auditLogMemberKicked');
        case 'member_banned':
            return t('community.auditLogMemberBanned');
        default:
            return actionType;
    }
}
function CommunityAuditLogScreen(_a) {
    var _b;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var _c = (0, react_1.useState)(''), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)(null), selectedActionFilter = _d[0], setSelectedActionFilter = _d[1];
    var _e = (0, react_1.useState)('all'), messageFilter = _e[0], setMessageFilter = _e[1];
    var _f = (0, react_1.useState)('loggedAt'), sortField = _f[0], setSortField = _f[1];
    var _g = (0, react_1.useState)('newest'), sortOrder = _g[0], setSortOrder = _g[1];
    var deferredSearchQuery = (0, react_1.useDeferredValue)(searchQuery.trim().toLowerCase());
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['community-audit-log', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/audit-log"));
        },
    }), data = _h.data, isLoading = _h.isLoading, refetch = _h.refetch, isRefetching = _h.isRefetching;
    var actions = (_b = data === null || data === void 0 ? void 0 : data.actions) !== null && _b !== void 0 ? _b : [];
    var availableActionFilters = (0, react_1.useMemo)(function () {
        var actionTypes = Array.from(new Set(actions.map(function (item) { return item.action.actionType; })));
        return actionTypes.sort(function (a, b) {
            return getActionLabel(a, t).localeCompare(getActionLabel(b, t));
        });
    }, [actions, t]);
    var filteredActions = (0, react_1.useMemo)(function () {
        var filtered = actions.filter(function (item) {
            var _a, _b, _c, _d, _e;
            if (messageFilter === 'withMessage' && (!((_a = item.message) === null || _a === void 0 ? void 0 : _a.id) || !item.message.channelId)) {
                return false;
            }
            if (selectedActionFilter && item.action.actionType !== selectedActionFilter) {
                return false;
            }
            if (!deferredSearchQuery) {
                return true;
            }
            var preview = ((_b = item.message) === null || _b === void 0 ? void 0 : _b.isDeleted)
                ? t('message.deleted')
                : ((_c = item.message) === null || _c === void 0 ? void 0 : _c.isEncrypted)
                    ? t('dm.encryptedMessagePlaceholder')
                    : (((_d = item.message) === null || _d === void 0 ? void 0 : _d.bodyPlaintext) || item.action.reason || '');
            var haystack = [
                getActionLabel(item.action.actionType, t),
                item.actor.displayName,
                item.actor.username,
                (_e = item.action.reason) !== null && _e !== void 0 ? _e : '',
                preview,
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(deferredSearchQuery);
        });
        return __spreadArray([], filtered, true).sort(function (a, b) {
            if (sortField === 'actor') {
                var left_1 = (a.actor.displayName || a.actor.username || '').toLocaleLowerCase();
                var right_1 = (b.actor.displayName || b.actor.username || '').toLocaleLowerCase();
                return sortOrder === 'newest'
                    ? left_1.localeCompare(right_1)
                    : right_1.localeCompare(left_1);
            }
            var left = new Date(a.action.createdAt).getTime();
            var right = new Date(b.action.createdAt).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
    }, [actions, deferredSearchQuery, messageFilter, selectedActionFilter, sortField, sortOrder, t]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('community.auditLogLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={filteredActions} keyExtractor={function (item) { return item.action.id; }} ListHeaderComponent={<react_native_1.View style={styles.searchWrap}>
            <react_native_1.TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('community.auditLogSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
            <react_native_1.View style={styles.actionFilterWrap}>
              {[
                { key: 'loggedAt', label: t('community.auditLogSortLoggedAt') },
                { key: 'actor', label: t('community.auditLogSortActor') },
            ].map(function (option) {
                var selected = sortField === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]} onPress={function () { return setSortField(option.key); }}>
                    <react_native_1.Text style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.actionFilterWrap}>
              {[
                {
                    key: 'newest',
                    label: sortField === 'actor' ? t('settings.sortAsc') : t('settings.sortNewest'),
                },
                {
                    key: 'oldest',
                    label: sortField === 'actor' ? t('settings.sortDesc') : t('settings.sortOldest'),
                },
            ].map(function (option) {
                var selected = sortOrder === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]} onPress={function () { return setSortOrder(option.key); }}>
                    <react_native_1.Text style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.actionFilterWrap}>
              {[
                { key: 'all', label: t('community.auditLogFilterAll') },
                { key: 'withMessage', label: t('community.auditLogFilterWithMessage') },
            ].map(function (option) {
                var selected = messageFilter === option.key;
                return (<react_native_1.TouchableOpacity key={option.key} style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]} onPress={function () { return setMessageFilter(option.key); }}>
                    <react_native_1.Text style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                    ]}>
                      {option.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
            <react_native_1.View style={styles.actionFilterWrap}>
              <react_native_1.TouchableOpacity style={[
                styles.actionFilterChip,
                selectedActionFilter === null && styles.actionFilterChipSelected,
            ]} onPress={function () { return setSelectedActionFilter(null); }}>
                <react_native_1.Text style={[
                styles.actionFilterChipText,
                selectedActionFilter === null && styles.actionFilterChipTextSelected,
            ]}>
                  {t('community.auditLogFilterAll')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
              {availableActionFilters.map(function (actionType) {
                var selected = selectedActionFilter === actionType;
                return (<react_native_1.TouchableOpacity key={actionType} style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]} onPress={function () { return setSelectedActionFilter(actionType); }}>
                    <react_native_1.Text style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                    ]}>
                      {getActionLabel(actionType, t)}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
          </react_native_1.View>} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var _b, _c, _d, _e;
            var item = _a.item;
            var preview = ((_b = item.message) === null || _b === void 0 ? void 0 : _b.isDeleted)
                ? t('message.deleted')
                : ((_c = item.message) === null || _c === void 0 ? void 0 : _c.isEncrypted)
                    ? t('dm.encryptedMessagePlaceholder')
                    : (((_d = item.message) === null || _d === void 0 ? void 0 : _d.bodyPlaintext) || item.action.reason || '');
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.headerRow}>
                <react_native_1.View style={styles.headerCopy}>
                  <react_native_1.Text style={styles.actionTitle}>
                    {getActionLabel(item.action.actionType, t)}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.meta}>
                    {t('community.auditLogActor', {
                    name: item.actor.displayName || t('common.unknown'),
                })}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.timestamp}>
                  {new Date(item.action.createdAt).toLocaleDateString()}
                </react_native_1.Text>
              </react_native_1.View>

              <react_native_1.Text style={styles.preview} numberOfLines={3}>
                {preview || t('community.auditLogNoContext')}
              </react_native_1.Text>

              {item.action.reason ? (<react_native_1.Text style={styles.reasonText}>{item.action.reason}</react_native_1.Text>) : null}

              {((_e = item.message) === null || _e === void 0 ? void 0 : _e.id) && item.message.channelId ? (<react_native_1.TouchableOpacity style={styles.openButton} onPress={function () {
                        var _a, _b, _c, _d;
                        return navigation.navigate('ChannelScreen', {
                            communityId: route.params.communityId,
                            channelId: (_b = (_a = item.message) === null || _a === void 0 ? void 0 : _a.channelId) !== null && _b !== void 0 ? _b : '',
                            focusMessageId: (_d = (_c = item.message) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : undefined,
                        });
                    }}>
                  <react_native_1.Text style={styles.openButtonText}>{t('community.auditLogOpenMessage')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon="🧾" title={deferredSearchQuery
                ? t('community.auditLogNoSearchResults')
                : messageFilter === 'withMessage'
                    ? t('community.auditLogNoMessageMatches')
                    : t('community.auditLogEmpty')} subtitle={deferredSearchQuery
                ? t('community.auditLogNoSearchResultsBody')
                : messageFilter === 'withMessage'
                    ? t('community.auditLogNoMessageMatchesBody')
                    : t('community.auditLogHint')}/>
          </react_native_1.View>} contentContainerStyle={filteredActions.length === 0 ? styles.emptyList : styles.list}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.md,
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
    actionFilterWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    actionFilterChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    actionFilterChipSelected: {
        backgroundColor: theme_1.colors.primary,
    },
    actionFilterChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    actionFilterChipTextSelected: {
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
    actionTitle: {
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
    openButton: {
        alignSelf: 'flex-start',
        marginTop: theme_1.spacing.md,
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
});
