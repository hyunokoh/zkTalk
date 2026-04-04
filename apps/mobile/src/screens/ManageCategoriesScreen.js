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
exports.default = ManageCategoriesScreen;
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
function ManageCategoriesScreen(_a) {
    var _this = this;
    var route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(''), newCategoryName = _c[0], setNewCategoryName = _c[1];
    var _d = (0, react_1.useState)(null), editingCategoryId = _d[0], setEditingCategoryId = _d[1];
    var _e = (0, react_1.useState)(''), editingName = _e[0], setEditingName = _e[1];
    var devActionAttemptedRef = react_1.default.useRef(false);
    var _f = (0, react_query_1.useQuery)({
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
    }), data = _f.data, isLoading = _f.isLoading, refetch = _f.refetch, isRefetching = _f.isRefetching;
    var channelsData = (0, react_query_1.useQuery)({
        queryKey: ['channels', route.params.communityId],
        queryFn: function () {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/channels"));
        },
    }).data;
    var categories = (0, react_1.useMemo)(function () {
        return (data !== null && data !== void 0 ? data : []).map(function (category) {
            var _a, _b, _c;
            return ({
                id: category.id,
                name: category.name,
                position: (_a = category.position) !== null && _a !== void 0 ? _a : 0,
                channelCount: (_c = (_b = channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories.find(function (entry) { return entry.id === category.id; })) === null || _b === void 0 ? void 0 : _b.channels.length) !== null && _c !== void 0 ? _c : 0,
            });
        });
    }, [channelsData === null || channelsData === void 0 ? void 0 : channelsData.categories, data]);
    var filteredCategories = (0, react_1.useMemo)(function () {
        var normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return categories;
        }
        return categories.filter(function (category) {
            return [category.name, t('channel.categoryChannelCount', { count: category.channelCount })]
                .some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
        });
    }, [categories, searchQuery, t]);
    var invalidateCategoryQueries = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['categories', route.params.communityId] }),
                        queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
                    ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var createMutation = (0, react_query_1.useMutation)({
        mutationFn: function (name) {
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId, "/categories"), {
                method: 'POST',
                body: {
                    name: name,
                    position: categories.reduce(function (max, category) { return Math.max(max, category.position); }, -1) + 1,
                },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setNewCategoryName('');
                        return [4 /*yield*/, invalidateCategoryQueries()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.categoryCreateFailed'));
        },
    });
    var updateMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var categoryId = _a.categoryId, name = _a.name;
            return (0, api_1.api)("/api/categories/".concat(categoryId), {
                method: 'PATCH',
                body: { name: name },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setEditingCategoryId(null);
                        setEditingName('');
                        return [4 /*yield*/, invalidateCategoryQueries()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.categorySaveFailed'));
        },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (categoryId) {
            return (0, api_1.api)("/api/categories/".concat(categoryId), {
                method: 'DELETE',
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, invalidateCategoryQueries()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.categoryDeleteFailed'));
        },
    });
    var reorderMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var categoryId = _b.categoryId, position = _b.position, swapCategoryId = _b.swapCategoryId, swapPosition = _b.swapPosition;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/categories/".concat(categoryId), {
                            method: 'PATCH',
                            body: { position: swapPosition },
                        })];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, (0, api_1.api)("/api/categories/".concat(swapCategoryId), {
                                method: 'PATCH',
                                body: { position: position },
                            })];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: invalidateCategoryQueries,
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('channel.categoryReorderFailed'));
        },
    });
    react_1.default.useEffect(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        if (!data) {
            return;
        }
        devActionAttemptedRef.current = true;
        function tryDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var payload;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-manage-categories-action.json')];
                        case 1:
                            payload = _c.sent();
                            if (!payload)
                                return [2 /*return*/];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, , 9, 11]);
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'create' && ((_a = payload.name) === null || _a === void 0 ? void 0 : _a.trim()))) return [3 /*break*/, 4];
                            return [4 /*yield*/, createMutation.mutateAsync(payload.name.trim())];
                        case 3:
                            _c.sent();
                            return [3 /*break*/, 8];
                        case 4:
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'rename' &&
                                payload.categoryId &&
                                ((_b = payload.newName) === null || _b === void 0 ? void 0 : _b.trim()))) return [3 /*break*/, 6];
                            return [4 /*yield*/, updateMutation.mutateAsync({
                                    categoryId: payload.categoryId,
                                    name: payload.newName.trim(),
                                })];
                        case 5:
                            _c.sent();
                            return [3 /*break*/, 8];
                        case 6:
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'delete' && payload.categoryId)) return [3 /*break*/, 8];
                            return [4 /*yield*/, deleteMutation.mutateAsync(payload.categoryId)];
                        case 7:
                            _c.sent();
                            _c.label = 8;
                        case 8: return [3 /*break*/, 11];
                        case 9: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-manage-categories-action.json')];
                        case 10:
                            _c.sent();
                            return [7 /*endfinally*/];
                        case 11: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevAction();
    }, [createMutation, data, deleteMutation, updateMutation]);
    if (isLoading) {
        return <LoadingSpinner_1.default text={t('channel.categoriesLoading')}/>;
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.FlatList data={filteredCategories} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme_1.colors.primary}/>} ListHeaderComponent={<react_native_1.View style={styles.headerCard}>
            <react_native_1.Text style={styles.headerTitle}>{t('channel.categoryCreate')}</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={newCategoryName} onChangeText={setNewCategoryName} placeholder={t('channel.categoryNamePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={80}/>
            <react_native_1.TouchableOpacity style={[styles.primaryButton, createMutation.isPending && styles.disabledButton]} onPress={function () {
                var trimmed = newCategoryName.trim();
                if (!trimmed) {
                    react_native_1.Alert.alert(t('common.error'), t('channel.categoryNameRequired'));
                    return;
                }
                createMutation.mutate(trimmed);
            }} disabled={createMutation.isPending}>
              <react_native_1.Text style={styles.primaryButtonText}>
                {createMutation.isPending ? t('channel.categoryCreating') : t('channel.categoryCreate')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TextInput style={styles.input} value={searchQuery} onChangeText={setSearchQuery} placeholder={t('channel.categorySearchPlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
          </react_native_1.View>} renderItem={function (_a) {
            var _b, _c, _d;
            var item = _a.item;
            var isEditing = editingCategoryId === item.id;
            var isDeleting = deleteMutation.isPending && deleteMutation.variables === item.id;
            var isSaving = updateMutation.isPending && ((_b = updateMutation.variables) === null || _b === void 0 ? void 0 : _b.categoryId) === item.id;
            var currentIndex = filteredCategories.findIndex(function (category) { return category.id === item.id; });
            var previousCategory = currentIndex > 0 ? filteredCategories[currentIndex - 1] : null;
            var nextCategory = currentIndex >= 0 && currentIndex < filteredCategories.length - 1
                ? filteredCategories[currentIndex + 1]
                : null;
            var isReordering = reorderMutation.isPending &&
                (((_c = reorderMutation.variables) === null || _c === void 0 ? void 0 : _c.categoryId) === item.id ||
                    ((_d = reorderMutation.variables) === null || _d === void 0 ? void 0 : _d.swapCategoryId) === item.id);
            return (<react_native_1.View style={styles.card}>
              {isEditing ? (<>
                  <react_native_1.TextInput style={styles.input} value={editingName} onChangeText={setEditingName} placeholder={t('channel.categoryNamePlaceholder')} placeholderTextColor={theme_1.colors.textDim} autoFocus maxLength={80}/>
                  <react_native_1.View style={styles.actions}>
                    <react_native_1.TouchableOpacity style={styles.secondaryButton} onPress={function () {
                        setEditingCategoryId(null);
                        setEditingName('');
                    }}>
                      <react_native_1.Text style={styles.secondaryButtonText}>{t('common.cancel')}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TouchableOpacity style={[styles.primaryButton, isSaving && styles.disabledButton]} onPress={function () {
                        var trimmed = editingName.trim();
                        if (!trimmed) {
                            react_native_1.Alert.alert(t('common.error'), t('channel.categoryNameRequired'));
                            return;
                        }
                        updateMutation.mutate({ categoryId: item.id, name: trimmed });
                    }} disabled={isSaving}>
                      <react_native_1.Text style={styles.primaryButtonText}>
                        {isSaving ? t('channel.categorySaving') : t('common.save')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>
                </>) : (<>
                  <react_native_1.View style={styles.rowHeader}>
                    <react_native_1.View style={styles.rowCopy}>
                      <react_native_1.Text style={styles.categoryName}>{item.name}</react_native_1.Text>
                      <react_native_1.Text style={styles.categoryMeta}>
                        {t('channel.categoryChannelCount', { count: item.channelCount })}
                      </react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.View style={styles.reorderActions}>
                      <react_native_1.TouchableOpacity style={[
                        styles.reorderButton,
                        (!previousCategory || isReordering) && styles.disabledButton,
                    ]} disabled={!previousCategory || isReordering} onPress={function () {
                        if (!previousCategory)
                            return;
                        reorderMutation.mutate({
                            categoryId: item.id,
                            position: item.position,
                            swapCategoryId: previousCategory.id,
                            swapPosition: previousCategory.position,
                        });
                    }}>
                        <react_native_1.Text style={styles.reorderButtonText}>{t('channel.categoryMoveUp')}</react_native_1.Text>
                      </react_native_1.TouchableOpacity>
                      <react_native_1.TouchableOpacity style={[
                        styles.reorderButton,
                        (!nextCategory || isReordering) && styles.disabledButton,
                    ]} disabled={!nextCategory || isReordering} onPress={function () {
                        if (!nextCategory)
                            return;
                        reorderMutation.mutate({
                            categoryId: item.id,
                            position: item.position,
                            swapCategoryId: nextCategory.id,
                            swapPosition: nextCategory.position,
                        });
                    }}>
                        <react_native_1.Text style={styles.reorderButtonText}>
                          {t('channel.categoryMoveDown')}
                        </react_native_1.Text>
                      </react_native_1.TouchableOpacity>
                    </react_native_1.View>
                  </react_native_1.View>
                  <react_native_1.View style={styles.actions}>
                    <react_native_1.TouchableOpacity style={styles.secondaryButton} onPress={function () {
                        setEditingCategoryId(item.id);
                        setEditingName(item.name);
                    }}>
                      <react_native_1.Text style={styles.secondaryButtonText}>{t('common.edit')}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TouchableOpacity style={[
                        styles.dangerButton,
                        (item.channelCount > 0 || isDeleting) && styles.disabledButton,
                    ]} disabled={item.channelCount > 0 || isDeleting} onPress={function () {
                        return react_native_1.Alert.alert(t('channel.categoryDelete'), t('channel.categoryDeleteConfirm', { name: item.name }), [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('channel.categoryDelete'),
                                style: 'destructive',
                                onPress: function () { return deleteMutation.mutate(item.id); },
                            },
                        ]);
                    }}>
                      <react_native_1.Text style={styles.dangerButtonText}>
                        {isDeleting ? t('common.loading') : t('channel.categoryDelete')}
                      </react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>
                  {item.channelCount > 0 ? (<react_native_1.Text style={styles.helperText}>{t('channel.categoryDeleteHint')}</react_native_1.Text>) : null}
                </>)}
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon="🗂️" title={searchQuery.trim()
                ? t('channel.categoryNoSearchResults')
                : t('channel.categoriesEmpty')} subtitle={searchQuery.trim()
                ? t('channel.categoryNoSearchResultsBody')
                : t('channel.categoriesHint')}/>
          </react_native_1.View>} contentContainerStyle={filteredCategories.length === 0 ? styles.emptyList : styles.list}/>
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
        marginBottom: theme_1.spacing.sm,
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.md,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
    },
    rowCopy: {
        flex: 1,
    },
    reorderActions: {
        flexDirection: 'row',
        gap: theme_1.spacing.xs,
    },
    reorderButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reorderButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    categoryName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    categoryMeta: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    input: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
    },
    actions: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    primaryButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    dangerButton: {
        backgroundColor: theme_1.colors.error,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dangerButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.6,
    },
    helperText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.sm,
        lineHeight: 18,
    },
});
