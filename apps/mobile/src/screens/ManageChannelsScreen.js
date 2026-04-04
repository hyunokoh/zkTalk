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
exports.default = ManageChannelsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var EmptyState_1 = require("../components/EmptyState");
var LoadingSpinner_1 = require("../components/LoadingSpinner");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
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
function ManageChannelsScreen(_a) {
    var _this = this;
    var route = _a.route, navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(null), pickedChannel = _c[0], setPickedChannel = _c[1];
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['channels', route.params.communityId],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/channels"))];
                    case 1:
                        res = _c.sent();
                        return [2 /*return*/, {
                                uncategorized: (_a = res.uncategorized) !== null && _a !== void 0 ? _a : [],
                                categories: (_b = res.categories) !== null && _b !== void 0 ? _b : [],
                            }];
                }
            });
        }); },
    }), data = _d.data, isLoading = _d.isLoading, refetch = _d.refetch, isRefetching = _d.isRefetching;
    var sections = (0, react_1.useMemo)(function () {
        var _a, _b, _c, _d;
        var nextSections = [];
        var normalizedQuery = searchQuery.trim().toLowerCase();
        var directDmSearchLabel = "".concat(t('dm.filterDirect'), " ").concat(t('dm.historyCompact'));
        var groupDmSearchLabel = "".concat(t('dm.filterGroup'), " ").concat(t('dm.historyCompact'));
        if (((_a = data === null || data === void 0 ? void 0 : data.uncategorized.length) !== null && _a !== void 0 ? _a : 0) > 0) {
            var uncategorizedChannels = ((_b = data === null || data === void 0 ? void 0 : data.uncategorized) !== null && _b !== void 0 ? _b : []).filter(function (channel) {
                if (!normalizedQuery) {
                    return true;
                }
                return __spreadArray([
                    channel.name,
                    t('home.uncategorizedChannels')
                ], getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel), true).filter(Boolean)
                    .some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
            });
            nextSections.push({
                id: 'uncategorized',
                title: t('home.uncategorizedChannels'),
                channels: uncategorizedChannels,
            });
        }
        var _loop_1 = function (category) {
            var channels = ((_d = category.channels) !== null && _d !== void 0 ? _d : []).filter(function (channel) {
                if (!normalizedQuery) {
                    return true;
                }
                return __spreadArray([
                    channel.name,
                    category.name
                ], getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel), true).filter(Boolean)
                    .some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
            });
            nextSections.push({
                id: category.id,
                title: category.name,
                channels: channels,
            });
        };
        for (var _i = 0, _e = (_c = data === null || data === void 0 ? void 0 : data.categories) !== null && _c !== void 0 ? _c : []; _i < _e.length; _i++) {
            var category = _e[_i];
            _loop_1(category);
        }
        return nextSections.filter(function (section) { return section.channels.length > 0; });
    }, [data === null || data === void 0 ? void 0 : data.categories, data === null || data === void 0 ? void 0 : data.uncategorized, searchQuery, t]);
    var isReorderDisabled = searchQuery.trim().length > 0;
    var rows = (0, react_1.useMemo)(function () {
        var nextRows = [];
        var _loop_2 = function (section) {
            nextRows.push({ type: 'section', id: "section:".concat(section.id), title: section.title });
            if (pickedChannel && !isReorderDisabled) {
                nextRows.push({
                    type: 'drop',
                    id: "drop:".concat(section.id, ":0"),
                    sectionId: section.id,
                    index: 0,
                });
            }
            section.channels.forEach(function (channel, index) {
                nextRows.push({
                    type: 'channel',
                    id: channel.id,
                    sectionId: section.id,
                    channel: channel,
                    index: index,
                    sectionLength: section.channels.length,
                });
                if (pickedChannel && !isReorderDisabled) {
                    nextRows.push({
                        type: 'drop',
                        id: "drop:".concat(section.id, ":").concat(index + 1),
                        sectionId: section.id,
                        index: index + 1,
                    });
                }
            });
        };
        for (var _i = 0, sections_1 = sections; _i < sections_1.length; _i++) {
            var section = sections_1[_i];
            _loop_2(section);
        }
        return nextRows;
    }, [isReorderDisabled, pickedChannel, sections]);
    var invalidateQueries = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var reorderMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var sourceSection, targetSection, sourceIndex, sameSection, nextSourceChannels, moved, nextTargetChannels, normalizedTargetIndex, sourceCategoryId, targetCategoryId, updates;
            var sourceSectionId = _b.sourceSectionId, targetSectionId = _b.targetSectionId, targetIndex = _b.targetIndex, channelId = _b.channelId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sourceSection = sections.find(function (entry) { return entry.id === sourceSectionId; });
                        targetSection = sections.find(function (entry) { return entry.id === targetSectionId; });
                        if (!sourceSection || !targetSection) {
                            throw new Error(t('channel.orderReorderFailed'));
                        }
                        sourceIndex = sourceSection.channels.findIndex(function (channel) { return channel.id === channelId; });
                        if (sourceIndex < 0) {
                            return [2 /*return*/];
                        }
                        sameSection = sourceSectionId === targetSectionId;
                        nextSourceChannels = __spreadArray([], sourceSection.channels, true);
                        moved = nextSourceChannels.splice(sourceIndex, 1)[0];
                        nextTargetChannels = sameSection
                            ? nextSourceChannels
                            : __spreadArray([], targetSection.channels, true);
                        normalizedTargetIndex = Math.max(0, Math.min(sameSection && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, nextTargetChannels.length));
                        nextTargetChannels.splice(normalizedTargetIndex, 0, moved);
                        sourceCategoryId = sourceSectionId === 'uncategorized' ? null : sourceSectionId;
                        targetCategoryId = targetSectionId === 'uncategorized' ? null : targetSectionId;
                        updates = sameSection
                            ? nextTargetChannels.map(function (channel, index) {
                                return (0, api_1.api)("/api/channels/".concat(channel.id), {
                                    method: 'PATCH',
                                    body: {
                                        categoryId: targetCategoryId,
                                        position: index,
                                    },
                                });
                            })
                            : __spreadArray(__spreadArray([], nextSourceChannels.map(function (channel, index) {
                                return (0, api_1.api)("/api/channels/".concat(channel.id), {
                                    method: 'PATCH',
                                    body: {
                                        categoryId: sourceCategoryId,
                                        position: index,
                                    },
                                });
                            }), true), nextTargetChannels.map(function (channel, index) {
                                return (0, api_1.api)("/api/channels/".concat(channel.id), {
                                    method: 'PATCH',
                                    body: {
                                        categoryId: targetCategoryId,
                                        position: index,
                                    },
                                });
                            }), true);
                        return [4 /*yield*/, Promise.all(updates)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setPickedChannel(null);
                        return [4 /*yield*/, invalidateQueries()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.orderReorderFailed'));
        },
    });
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('channel.orderLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={rows} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} renderItem={function (_a) {
            var _b, _c, _d, _e, _f;
            var item = _a.item;
            if (item.type === 'section') {
                return (<react_native_1.View style={styles.sectionHeader}>
                <react_native_1.Text style={styles.sectionTitle}>{item.title}</react_native_1.Text>
              </react_native_1.View>);
            }
            if (item.type === 'drop') {
                if (!pickedChannel || reorderMutation.isPending) {
                    return null;
                }
                var isSameSlot = pickedChannel.sectionId === item.sectionId &&
                    ((_b = sections
                        .find(function (section) { return section.id === item.sectionId; })) === null || _b === void 0 ? void 0 : _b.channels.findIndex(function (channel) { return channel.id === pickedChannel.channelId; })) === item.index;
                if (isSameSlot) {
                    return null;
                }
                return (<react_native_1.TouchableOpacity style={styles.dropSlot} activeOpacity={0.8} onPress={function () {
                        return reorderMutation.mutate({
                            sourceSectionId: pickedChannel.sectionId,
                            targetSectionId: item.sectionId,
                            targetIndex: item.index,
                            channelId: pickedChannel.channelId,
                        });
                    }}>
                <react_native_1.Text style={styles.dropSlotText}>{t('channel.orderDropHere')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
            }
            var isPicked = (pickedChannel === null || pickedChannel === void 0 ? void 0 : pickedChannel.channelId) === item.channel.id;
            var isMovingCurrent = reorderMutation.isPending && ((_c = reorderMutation.variables) === null || _c === void 0 ? void 0 : _c.channelId) === item.channel.id;
            var canMoveUp = item.index > 0 && !isMovingCurrent;
            var canMoveDown = item.index < item.sectionLength - 1 && !isMovingCurrent;
            var sourceDmName = (_f = (_e = (_d = item.channel.sourceDmConversation) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : '';
            var normalizedSearchQuery = searchQuery.trim().toLowerCase();
            var sourceDmMatchLabel = normalizedSearchQuery.length > 0 &&
                sourceDmName.length > 0 &&
                sourceDmName.toLowerCase().includes(normalizedSearchQuery) &&
                !item.channel.name.toLowerCase().includes(normalizedSearchQuery)
                ? t('channel.sourceDmNameLabelWithName', { name: sourceDmName })
                : undefined;
            return (<react_native_1.TouchableOpacity style={[styles.card, isPicked && styles.cardPicked]} activeOpacity={0.92} delayLongPress={180} disabled={isReorderDisabled} onLongPress={function () {
                    return setPickedChannel({
                        channelId: item.channel.id,
                        sectionId: item.sectionId,
                        name: item.channel.name,
                    });
                }}>
              <react_native_1.TouchableOpacity style={styles.rowMain} activeOpacity={0.7} onPress={function () {
                    return navigation.navigate('EditChannel', {
                        channelId: item.channel.id,
                        communityId: route.params.communityId,
                        channelName: item.channel.name,
                    });
                }}>
                <react_native_1.Text style={styles.channelIcon}>{getChannelIcon(item.channel.type)}</react_native_1.Text>
                <react_native_1.View style={styles.rowCopy}>
                  <react_native_1.Text style={styles.channelName}>{item.channel.name}</react_native_1.Text>
                  {sourceDmMatchLabel ? (<react_native_1.Text style={styles.channelSourceMatch} numberOfLines={1}>
                      {sourceDmMatchLabel}
                    </react_native_1.Text>) : null}
                  <react_native_1.Text style={styles.channelMeta}>
                    {item.channel.isArchived
                    ? t('channel.orderArchivedHint')
                    : t('channel.orderTapToEdit')}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.TouchableOpacity>
              <react_native_1.View style={styles.actions}>
                <react_native_1.TouchableOpacity style={[
                    styles.actionButton,
                    isReorderDisabled && styles.disabledButton,
                    isPicked && styles.actionButtonActive,
                ]} disabled={isReorderDisabled} onPress={function () {
                    return setPickedChannel(function (current) {
                        return (current === null || current === void 0 ? void 0 : current.channelId) === item.channel.id
                            ? null
                            : {
                                channelId: item.channel.id,
                                sectionId: item.sectionId,
                                name: item.channel.name,
                            };
                    });
                }}>
                  <react_native_1.Text style={[
                    styles.actionButtonText,
                    isPicked && styles.actionButtonTextActive,
                ]}>
                    {t('channel.orderPickUp')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.actionButton, !canMoveUp && styles.disabledButton]} disabled={!canMoveUp} onPress={function () {
                    return reorderMutation.mutate({
                        sourceSectionId: item.sectionId,
                        targetSectionId: item.sectionId,
                        targetIndex: item.index - 1,
                        channelId: item.channel.id,
                    });
                }}>
                  <react_native_1.Text style={styles.actionButtonText}>{t('channel.orderMoveUp')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.actionButton, !canMoveDown && styles.disabledButton]} disabled={!canMoveDown} onPress={function () {
                    return reorderMutation.mutate({
                        sourceSectionId: item.sectionId,
                        targetSectionId: item.sectionId,
                        targetIndex: item.index + 2,
                        channelId: item.channel.id,
                    });
                }}>
                  <react_native_1.Text style={styles.actionButtonText}>{t('channel.orderMoveDown')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>);
        }} ListHeaderComponent={<react_native_1.View style={styles.headerCard}>
            <react_native_1.Text style={styles.headerTitle}>{t('channel.orderTitleCard')}</react_native_1.Text>
            <react_native_1.Text style={styles.headerBody}>{t('channel.orderHint')}</react_native_1.Text>
            {pickedChannel ? (<react_native_1.View style={styles.pickedBanner}>
                <react_native_1.Text style={styles.pickedBannerText}>
                  {t('channel.orderPickedUp', { name: pickedChannel.name })}
                </react_native_1.Text>
                <react_native_1.TouchableOpacity onPress={function () { return setPickedChannel(null); }}>
                  <react_native_1.Text style={styles.pickedBannerAction}>
                    {t('channel.orderCancelPickUp')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>) : null}
            <react_native_1.TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder={t('channel.orderSearchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
            {isReorderDisabled ? (<react_native_1.Text style={styles.searchWarning}>{t('channel.orderSearchDisable')}</react_native_1.Text>) : null}
          </react_native_1.View>} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon="🧭" title={searchQuery.trim()
                ? t('channel.orderNoSearchResults')
                : t('channel.orderEmpty')} subtitle={searchQuery.trim()
                ? t('channel.orderNoSearchResultsBody')
                : t('channel.orderHint')}/>
          </react_native_1.View>} contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.list}/>
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
    emptyList: {
        flexGrow: 1,
    },
    emptyWrap: {
        flex: 1,
    },
    headerCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginTop: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.sm,
    },
    headerTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
        marginBottom: theme_1.spacing.xs,
    },
    headerBody: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 19,
        marginBottom: theme_1.spacing.md,
    },
    searchInput: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    searchWarning: {
        marginTop: theme_1.spacing.sm,
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
    },
    pickedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.md,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.md,
        backgroundColor: theme_1.colors.primary + '18',
        borderWidth: 1,
        borderColor: theme_1.colors.primary + '55',
    },
    pickedBannerText: {
        flex: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    pickedBannerAction: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    sectionHeader: {
        paddingHorizontal: theme_1.spacing.xl,
        paddingTop: theme_1.spacing.md,
        paddingBottom: theme_1.spacing.xs,
    },
    sectionTitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.md,
    },
    cardPicked: {
        borderWidth: 1,
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.primary + '10',
    },
    rowMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    channelIcon: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.lg,
        marginRight: theme_1.spacing.md,
    },
    rowCopy: {
        flex: 1,
    },
    channelName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    channelMeta: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    channelSourceMatch: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xs,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
        flexWrap: 'wrap',
    },
    actionButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    actionButtonActive: {
        backgroundColor: theme_1.colors.primary + '20',
        borderWidth: 1,
        borderColor: theme_1.colors.primary,
    },
    actionButtonTextActive: {
        color: theme_1.colors.primary,
    },
    dropSlot: {
        marginHorizontal: theme_1.spacing.xl,
        marginBottom: theme_1.spacing.sm,
        marginTop: -theme_1.spacing.xs,
        borderRadius: theme_1.borderRadius.round,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.primary + '12',
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
    },
    dropSlotText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
