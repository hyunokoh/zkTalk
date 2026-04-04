"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.default = EditCommunityScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var community_image_1 = require("../lib/community-image");
var file_picker_1 = require("../lib/file-picker");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function EditCommunityScreen(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _g = (0, react_1.useState)((_b = route.params.communityName) !== null && _b !== void 0 ? _b : ''), name = _g[0], setName = _g[1];
    var _h = (0, react_1.useState)((_c = route.params.iconUrl) !== null && _c !== void 0 ? _c : ''), iconUrl = _h[0], setIconUrl = _h[1];
    var _j = (0, react_1.useState)(null), iconPreviewVersion = _j[0], setIconPreviewVersion = _j[1];
    var _k = (0, react_1.useState)((_d = route.params.description) !== null && _d !== void 0 ? _d : ''), description = _k[0], setDescription = _k[1];
    var _l = (0, react_1.useState)((_e = route.params.visibility) !== null && _e !== void 0 ? _e : 'public'), visibility = _l[0], setVisibility = _l[1];
    var _m = (0, react_1.useState)(false), isUploadingIcon = _m[0], setIsUploadingIcon = _m[1];
    var scrollRef = (0, react_1.useRef)(null);
    var sectionOffsetsRef = (0, react_1.useRef)({
        appearance: 0,
        details: 0,
        visibility: 0,
    });
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function (payload) {
            var _a, _b, _c, _d;
            return (0, api_1.api)("/api/communities/".concat(route.params.communityId), {
                method: 'PATCH',
                body: {
                    name: (_a = payload === null || payload === void 0 ? void 0 : payload.name) !== null && _a !== void 0 ? _a : name.trim(),
                    description: (_b = payload === null || payload === void 0 ? void 0 : payload.description) !== null && _b !== void 0 ? _b : (description.trim() || undefined),
                    visibility: (_c = payload === null || payload === void 0 ? void 0 : payload.visibility) !== null && _c !== void 0 ? _c : visibility,
                    iconUrl: (_d = payload === null || payload === void 0 ? void 0 : payload.iconUrl) !== null && _d !== void 0 ? _d : (iconUrl || null),
                },
            });
        },
        onSuccess: function (_a) {
            var community = _a.community;
            queryClient.setQueryData(['communities'], function (current) {
                if (!current)
                    return current;
                return {
                    communities: current.communities.map(function (item) {
                        return item.id === community.id ? __assign(__assign({}, item), community) : item;
                    }),
                };
            });
            void queryClient.invalidateQueries({ queryKey: ['communities'] });
            react_native_1.Alert.alert(t('community.editSavedTitle'), t('community.editSavedBody'), [
                { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
            ]);
        },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.editFailed'));
        },
    });
    var handleSave = (0, react_1.useCallback)(function () {
        if (!name.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('community.nameRequired'));
            return;
        }
        saveMutation.mutate(undefined);
    }, [name, saveMutation, t]);
    var handlePickIcon = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var file, uploadedUrl, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, (0, file_picker_1.pickImage)()];
                case 1:
                    file = _a.sent();
                    if (!file)
                        return [2 /*return*/];
                    setIsUploadingIcon(true);
                    return [4 /*yield*/, (0, file_picker_1.uploadImageAsset)(file, 'community_icon', route.params.communityId)];
                case 2:
                    uploadedUrl = _a.sent();
                    setIconUrl(uploadedUrl);
                    setIconPreviewVersion(String(Date.now()));
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('community.editFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setIsUploadingIcon(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [route.params.communityId, t]);
    var scrollToSection = (0, react_1.useCallback)(function (section) {
        var _a;
        (_a = scrollRef.current) === null || _a === void 0 ? void 0 : _a.scrollTo({
            y: Math.max(sectionOffsetsRef.current[section] - theme_1.spacing.lg, 0),
            animated: true,
        });
    }, []);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, nextName, nextDescription, nextVisibility;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-edit-community-action.json')];
                        case 1:
                            action = _f.sent();
                            if (!action)
                                return [2 /*return*/];
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, , 3, 5]);
                            if (action.type !== 'save')
                                return [2 /*return*/];
                            nextName = (_b = (_a = action.name) !== null && _a !== void 0 ? _a : route.params.communityName) !== null && _b !== void 0 ? _b : 'Simulator community';
                            nextDescription = (_c = action.description) !== null && _c !== void 0 ? _c : '';
                            nextVisibility = (_e = (_d = action.visibility) !== null && _d !== void 0 ? _d : route.params.visibility) !== null && _e !== void 0 ? _e : 'public';
                            setName(nextName);
                            setDescription(nextDescription);
                            setVisibility(nextVisibility);
                            saveMutation.mutate({
                                name: nextName.trim(),
                                description: nextDescription.trim() || undefined,
                                visibility: nextVisibility,
                                iconUrl: iconUrl || null,
                            });
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-edit-community-action.json')];
                        case 4:
                            _f.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [route.params.communityName, route.params.visibility, saveMutation]);
    var visibilityOptions = [
        { key: 'public', label: t('community.public') },
        { key: 'invite_only', label: t('community.inviteOnly') },
        { key: 'private', label: t('community.private') },
    ];
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_1.ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <react_native_1.View style={styles.heroCard}>
          <react_native_1.Text style={styles.heroTitle}>{t('community.edit')}</react_native_1.Text>
          <react_native_1.Text style={styles.heroBody}>{t('community.editSubtitle')}</react_native_1.Text>
          <react_native_1.View style={styles.heroActions}>
            <react_native_1.TouchableOpacity style={styles.heroChip} onPress={function () { return scrollToSection('appearance'); }} activeOpacity={0.8}>
              <react_native_1.Text style={styles.heroChipText}>{t('community.iconPhoto')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={styles.heroChip} onPress={function () { return scrollToSection('details'); }} activeOpacity={0.8}>
              <react_native_1.Text style={styles.heroChipText}>{t('community.name')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={styles.heroChip} onPress={function () { return scrollToSection('visibility'); }} activeOpacity={0.8}>
              <react_native_1.Text style={styles.heroChipText}>{t('community.visibility')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.sectionCard} onLayout={function (event) {
            sectionOffsetsRef.current.appearance = event.nativeEvent.layout.y;
        }}>
          <react_native_1.Text style={styles.sectionTitle}>{t('community.iconPhoto')}</react_native_1.Text>
          <react_native_1.View style={styles.iconCard}>
            <react_native_1.View style={styles.iconPreview}>
              {iconUrl ? (<react_native_1.Image source={{ uri: (_f = (0, community_image_1.getVersionedImageUrl)(iconUrl, iconPreviewVersion)) !== null && _f !== void 0 ? _f : iconUrl }} style={styles.iconPreviewImage}/>) : (<react_native_1.Text style={styles.iconPreviewText}>
                  {(name || route.params.communityName || '?').charAt(0).toUpperCase()}
                </react_native_1.Text>)}
            </react_native_1.View>
            <react_native_1.View style={styles.iconCopy}>
              <react_native_1.Text style={styles.iconHint}>{t('community.iconHint')}</react_native_1.Text>
              <react_native_1.TouchableOpacity style={[styles.iconButton, isUploadingIcon && styles.saveButtonDisabled]} onPress={handlePickIcon} disabled={isUploadingIcon}>
                <react_native_1.Text style={styles.iconButtonText}>
                  {isUploadingIcon ? t('common.loading') : t('community.iconPhoto')}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.sectionCard} onLayout={function (event) {
            sectionOffsetsRef.current.details = event.nativeEvent.layout.y;
        }}>
          <react_native_1.Text style={styles.sectionTitle}>{t('community.name')}</react_native_1.Text>
          <react_native_1.View style={styles.field}>
            <react_native_1.Text style={styles.label}>{t('community.name')}</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('community.namePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={100} autoFocus/>
          </react_native_1.View>

          <react_native_1.View style={styles.field}>
            <react_native_1.Text style={styles.label}>{t('community.description')}</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('community.descPlaceholder')} placeholderTextColor={theme_1.colors.textDim} multiline numberOfLines={3} maxLength={500} textAlignVertical="top"/>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.sectionCard} onLayout={function (event) {
            sectionOffsetsRef.current.visibility = event.nativeEvent.layout.y;
        }}>
          <react_native_1.Text style={styles.sectionTitle}>{t('community.visibility')}</react_native_1.Text>
          <react_native_1.View style={styles.field}>
            <react_native_1.Text style={styles.label}>{t('community.visibility')}</react_native_1.Text>
            <react_native_1.View style={styles.visibilityContainer}>
              {visibilityOptions.map(function (option) { return (<react_native_1.TouchableOpacity key={option.key} style={[
                styles.visibilityOption,
                visibility === option.key && styles.visibilitySelected,
            ]} onPress={function () { return setVisibility(option.key); }}>
                  <react_native_1.Text style={[
                styles.visibilityText,
                visibility === option.key && styles.visibilityTextSelected,
            ]}>
                    {option.label}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>); })}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]} onPress={handleSave} disabled={saveMutation.isPending}>
          <react_native_1.Text style={styles.saveButtonText}>
            {saveMutation.isPending ? t('community.editSaving') : t('common.save')}
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
        paddingBottom: theme_1.spacing.xxxl,
    },
    heroCard: {
        gap: theme_1.spacing.xs,
    },
    heroActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    heroChip: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    heroChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    heroTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '800',
    },
    heroBody: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    sectionCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    sectionTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    iconCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
    },
    iconPreview: {
        width: 72,
        height: 72,
        borderRadius: theme_1.borderRadius.lg,
        backgroundColor: theme_1.colors.primary,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconPreviewImage: {
        width: '100%',
        height: '100%',
    },
    iconPreviewText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '800',
    },
    iconCopy: {
        flex: 1,
        gap: theme_1.spacing.xs,
    },
    iconHint: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    iconButton: {
        alignSelf: 'flex-start',
        marginTop: theme_1.spacing.sm,
        borderRadius: theme_1.borderRadius.full,
        backgroundColor: theme_1.colors.primary,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    iconButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
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
    visibilityContainer: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    visibilityOption: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    visibilitySelected: {
        borderColor: theme_1.colors.primary,
        backgroundColor: theme_1.colors.primary + '15',
    },
    visibilityText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    visibilityTextSelected: {
        color: theme_1.colors.primary,
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
