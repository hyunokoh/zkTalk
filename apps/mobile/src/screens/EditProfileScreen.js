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
exports.default = EditProfileScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var api_1 = require("../lib/api");
var file_picker_1 = require("../lib/file-picker");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
var Avatar_1 = require("../components/Avatar");
function EditProfileScreen(_a) {
    var _this = this;
    var _b, _c, _d;
    var navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var user = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var setUser = (0, auth_1.useAuthStore)(function (s) { return s.setUser; });
    var initialDisplayName = (_b = user === null || user === void 0 ? void 0 : user.displayName) !== null && _b !== void 0 ? _b : '';
    var initialBio = (_c = user === null || user === void 0 ? void 0 : user.bio) !== null && _c !== void 0 ? _c : '';
    var initialAvatarUrl = (_d = user === null || user === void 0 ? void 0 : user.avatarUrl) !== null && _d !== void 0 ? _d : '';
    var _e = (0, react_1.useState)(initialDisplayName), displayName = _e[0], setDisplayName = _e[1];
    var _f = (0, react_1.useState)(initialBio), bio = _f[0], setBio = _f[1];
    var _g = (0, react_1.useState)(initialAvatarUrl), avatarUrl = _g[0], setAvatarUrl = _g[1];
    var _h = (0, react_1.useState)(false), isSaving = _h[0], setIsSaving = _h[1];
    var _j = (0, react_1.useState)(false), isUploadingAvatar = _j[0], setIsUploadingAvatar = _j[1];
    var isDirty = (0, react_1.useMemo)(function () {
        return displayName.trim() !== initialDisplayName ||
            bio.trim() !== initialBio ||
            avatarUrl !== initialAvatarUrl;
    }, [avatarUrl, bio, displayName, initialAvatarUrl, initialBio, initialDisplayName]);
    var handlePickAvatar = function () { return __awaiter(_this, void 0, void 0, function () {
        var file, uploadedAvatarUrl, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsUploadingAvatar(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, (0, file_picker_1.pickImage)()];
                case 2:
                    file = _a.sent();
                    if (!file)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, file_picker_1.uploadImageAsset)(file, 'user_avatar')];
                case 3:
                    uploadedAvatarUrl = _a.sent();
                    setAvatarUrl(uploadedAvatarUrl);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('settings.profileSaveFailed'));
                    return [3 /*break*/, 6];
                case 5:
                    setIsUploadingAvatar(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var nextDisplayName, nextBio, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    nextDisplayName = displayName.trim();
                    nextBio = bio.trim();
                    if (!nextDisplayName) {
                        react_native_1.Alert.alert(t('common.error'), t('settings.displayNameRequired'));
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.api)('/api/me', {
                            method: 'PATCH',
                            body: {
                                displayName: nextDisplayName,
                                bio: nextBio || undefined,
                                avatarUrl: avatarUrl || null,
                            },
                        })];
                case 2:
                    result = _a.sent();
                    setUser(result.user);
                    react_native_1.Alert.alert(t('settings.profile'), t('settings.profileSaved'));
                    navigation.goBack();
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_2 instanceof Error ? error_2.message : t('settings.profileSaveFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setIsSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, nextDisplayName, nextBio, result, error_3;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-edit-profile-action.json')];
                        case 1:
                            action = _e.sent();
                            if (!action)
                                return [2 /*return*/];
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, , 8, 10]);
                            if (action.type !== 'save')
                                return [2 /*return*/];
                            setDisplayName((_a = action.displayName) !== null && _a !== void 0 ? _a : initialDisplayName);
                            setBio((_b = action.bio) !== null && _b !== void 0 ? _b : initialBio);
                            nextDisplayName = ((_c = action.displayName) !== null && _c !== void 0 ? _c : initialDisplayName).trim();
                            nextBio = ((_d = action.bio) !== null && _d !== void 0 ? _d : initialBio).trim();
                            if (!nextDisplayName) {
                                return [2 /*return*/];
                            }
                            setIsSaving(true);
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 5, 6, 7]);
                            return [4 /*yield*/, (0, api_1.api)('/api/me', {
                                    method: 'PATCH',
                                    body: {
                                        displayName: nextDisplayName,
                                        bio: nextBio || undefined,
                                        avatarUrl: avatarUrl || null,
                                    },
                                })];
                        case 4:
                            result = _e.sent();
                            setUser(result.user);
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-edit-profile-result.json', {
                                    ok: true,
                                    action: 'save',
                                    displayName: result.user.displayName,
                                    bio: result.user.bio || '',
                                    avatarUrl: result.user.avatarUrl,
                                })];
                        case 5:
                            _e.sent();
                            react_native_1.Alert.alert(t('settings.profile'), t('settings.profileSaved'));
                            return [3 /*break*/, 9];
                        case 6:
                            error_3 = _e.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-edit-profile-result.json', {
                                    ok: false,
                                    error: error_3 instanceof Error ? error_3.message : t('settings.profileSaveFailed'),
                                })];
                        case 7:
                            _e.sent();
                            react_native_1.Alert.alert(t('common.error'), error_3 instanceof Error ? error_3.message : t('settings.profileSaveFailed'));
                            return [3 /*break*/, 9];
                        case 8:
                            setIsSaving(false);
                            return [7 /*endfinally*/];
                        case 9:
                            return [3 /*break*/, 12];
                        case 10: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-edit-profile-action.json')];
                        case 11:
                            _e.sent();
                            return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [initialBio, initialDisplayName, setUser, t]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <react_native_1.KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined}>
        <react_native_1.ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <react_native_1.View style={styles.avatarSection}>
            <Avatar_1.default name={displayName || (user === null || user === void 0 ? void 0 : user.displayName) || t('settings.unknown')} avatarUrl={avatarUrl || null} size={92}/>
            <react_native_1.TouchableOpacity style={styles.avatarButton} onPress={function () { return void handlePickAvatar(); }} disabled={isUploadingAvatar}>
              <react_native_1.Text style={styles.avatarButtonText}>
                {isUploadingAvatar ? t('common.loading') : t('settings.avatarPhoto')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.label}>{t('settings.displayName')}</react_native_1.Text>
            <react_native_1.TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder={t('settings.displayNamePlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={100} autoCapitalize="words" autoCorrect={false} returnKeyType="next"/>
          </react_native_1.View>

          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.label}>{t('settings.bio')}</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} placeholder={t('settings.bioPlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={500} multiline textAlignVertical="top"/>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.saveButton, (!isDirty || isSaving) && styles.saveButtonDisabled]} onPress={handleSave} disabled={!isDirty || isSaving}>
            <react_native_1.Text style={styles.saveButtonText}>
              {isSaving ? t('common.loading') : t('common.save')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.lg,
    },
    avatarSection: {
        alignItems: 'center',
        gap: theme_1.spacing.md,
    },
    avatarButton: {
        borderRadius: theme_1.borderRadius.round,
        backgroundColor: theme_1.colors.primary,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    avatarButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    section: {
        gap: theme_1.spacing.sm,
    },
    label: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.lg,
    },
    bioInput: {
        minHeight: 140,
    },
    saveButton: {
        alignItems: 'center',
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        marginTop: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.lg,
    },
    saveButtonDisabled: {
        backgroundColor: theme_1.colors.surfaceLight,
    },
    saveButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
});
