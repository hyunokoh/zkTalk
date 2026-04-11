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
exports.default = SettingsScreen;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_native_1 = require("react-native");
var shared_1 = require("@zktalk/shared");
var Notifications = require("expo-notifications");
var ai_1 = require("../lib/ai");
var storage_1 = require("../lib/storage");
var auth_1 = require("../stores/auth");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var Avatar_1 = require("../components/Avatar");
var theme_1 = require("../theme");
function SettingsScreen(_a) {
    var _this = this;
    var _b, _c;
    var navigation = _a.navigation;
    var _d = (0, i18n_1.useTranslation)(), t = _d.t, locale = _d.locale;
    var user = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var logout = (0, auth_1.useAuthStore)(function (s) { return s.logout; });
    var _e = (0, react_1.useState)(''), searchQuery = _e[0], setSearchQuery = _e[1];
    var _f = (0, react_1.useState)(false), devActionAttempted = _f[0], setDevActionAttempted = _f[1];
    var _g = (0, react_1.useState)('off'), notificationStatus = _g[0], setNotificationStatus = _g[1];
    var aiRuntime = (0, react_query_1.useQuery)({
        queryKey: ['ai-runtime'],
        queryFn: ai_1.fetchAiRuntime,
        staleTime: 30000,
    }).data;
    var normalizedSearchQuery = searchQuery.trim().toLowerCase();
    var aiRuntimePresentation = (0, ai_1.getAiRuntimePresentation)(t, aiRuntime);
    var mobileAiCapabilities = (0, shared_1.listAiCapabilities)('mobile');
    var getAiCapabilityLabel = (0, react_1.useCallback)(function (capability) {
        switch (capability) {
            case 'selected-message-reply-draft':
                return t('settings.aiCapabilitySelectedMessageReplyDraft');
            case 'selected-message-rewrite-draft':
                return t('settings.aiCapabilitySelectedMessageRewriteDraft');
            case 'selected-message-translate-inline':
                return t('settings.aiCapabilitySelectedMessageTranslateInline');
            default:
                return capability;
        }
    }, [t]);
    var matchesSearch = (0, react_1.useCallback)(function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        if (!normalizedSearchQuery) {
            return true;
        }
        return values.some(function (value) { return value === null || value === void 0 ? void 0 : value.toLowerCase().includes(normalizedSearchQuery); });
    }, [normalizedSearchQuery]);
    var refreshNotificationStatus = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var permissions, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Notifications.getPermissionsAsync()];
                case 1:
                    permissions = _b.sent();
                    setNotificationStatus(permissions.granted ? 'on' : 'off');
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    setNotificationStatus('unavailable');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, []);
    (0, react_1.useEffect)(function () {
        refreshNotificationStatus();
        var unsubscribe = navigation.addListener('focus', refreshNotificationStatus);
        return unsubscribe;
    }, [navigation, refreshNotificationStatus]);
    var handleLanguage = function () {
        var options = [
            { label: '한국어', value: 'ko' },
            { label: 'English', value: 'en' },
        ];
        react_native_1.Alert.alert(t('settings.selectLanguage'), undefined, __spreadArray(__spreadArray([], options.map(function (opt) { return ({
            text: opt.value === locale ? "".concat(opt.label, " \u2713") : opt.label,
            onPress: function () { return i18n_1.useI18nStore.getState().setLocale(opt.value); },
        }); }), true), [
            { text: t('common.cancel'), style: 'cancel' },
        ], false));
    };
    var handleNotifications = function () { return __awaiter(_this, void 0, void 0, function () {
        var current, requested, isGranted, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, Notifications.getPermissionsAsync()];
                case 1:
                    current = _b.sent();
                    if (current.granted) {
                        react_native_1.Alert.alert(t('settings.notificationsEnabledTitle'), t('settings.notificationsEnabledBody'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('settings.openSystemSettings'),
                                onPress: function () {
                                    void react_native_1.Linking.openSettings();
                                },
                            },
                        ]);
                        return [2 /*return*/];
                    }
                    if (!current.canAskAgain) return [3 /*break*/, 3];
                    return [4 /*yield*/, Notifications.requestPermissionsAsync()];
                case 2:
                    requested = _b.sent();
                    isGranted = requested.granted;
                    setNotificationStatus(isGranted ? 'on' : 'off');
                    if (isGranted) {
                        react_native_1.Alert.alert(t('settings.notificationsEnabledTitle'), t('settings.notificationsGranted'));
                    }
                    else {
                        react_native_1.Alert.alert(t('settings.notificationsDisabledTitle'), t('settings.notificationsDisabledBody'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('settings.openSystemSettings'),
                                onPress: function () {
                                    void react_native_1.Linking.openSettings();
                                },
                            },
                        ]);
                    }
                    return [2 /*return*/];
                case 3:
                    setNotificationStatus('off');
                    react_native_1.Alert.alert(t('settings.notificationsDisabledTitle'), t('settings.notificationsDisabledBody'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('settings.openSystemSettings'),
                            onPress: function () {
                                void react_native_1.Linking.openSettings();
                            },
                        },
                    ]);
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    setNotificationStatus('unavailable');
                    react_native_1.Alert.alert(t('common.error'), t('settings.notificationsUnavailable'));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleLogout = function () {
        react_native_1.Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('settings.logout'),
                style: 'destructive',
                onPress: function () { return logout(); },
            },
        ]);
    };
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttempted)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, remainingToken, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-settings-action.json')];
                        case 1:
                            action = _b.sent();
                            if (!action)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 6, , 8]);
                            if (action.type !== 'logout') {
                                throw new Error('Unsupported settings dev action');
                            }
                            setDevActionAttempted(true);
                            return [4 /*yield*/, logout()];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, (0, storage_1.getToken)()];
                        case 4:
                            remainingToken = _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-settings-result.json', {
                                    ok: true,
                                    action: 'logout',
                                    remainingTokenLength: (_a = remainingToken === null || remainingToken === void 0 ? void 0 : remainingToken.length) !== null && _a !== void 0 ? _a : 0,
                                })];
                        case 5:
                            _b.sent();
                            return [3 /*break*/, 8];
                        case 6:
                            error_1 = _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-settings-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 7:
                            _b.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [devActionAttempted, logout]);
    var showProfileSection = matchesSearch(t('settings.profile'), user === null || user === void 0 ? void 0 : user.displayName, user === null || user === void 0 ? void 0 : user.username, user === null || user === void 0 ? void 0 : user.bio, t('settings.editProfile'), t('settings.scanQr'), t('settings.myQr'));
    var showScanQr = matchesSearch(t('settings.qrCode'), t('settings.scanQr'));
    var showMyQr = matchesSearch(t('settings.qrCode'), t('settings.myQr'));
    var showBackup = matchesSearch(t('settings.data'), t('settings.backup'));
    var showBookmarks = matchesSearch(t('settings.data'), t('settings.bookmarks'));
    var showTheme = matchesSearch(t('settings.preferences'), t('settings.theme'), t('settings.themeLockedHint'), t('settings.dark'));
    var showLanguage = matchesSearch(t('settings.preferences'), t('settings.language'), i18n_1.localeNames[locale]);
    var showNotifications = matchesSearch(t('settings.preferences'), t('settings.notifications'), notificationStatus === 'on'
        ? t('settings.on')
        : notificationStatus === 'off'
            ? t('settings.off')
            : t('settings.unavailable'));
    var showAi = matchesSearch(t('settings.ai'), t('settings.aiSummary'), t('settings.aiMobileOnly'), t('ai.messageReplyDraft'), t('ai.messageRewriteDraft'), t('ai.messageTranslateInline'), aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.label, aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.description);
    var showEditProfile = matchesSearch(t('settings.account'), t('settings.editProfile'));
    var showLinkedAccounts = matchesSearch(t('settings.account'), t('settings.linkedAccounts'));
    var showLogout = matchesSearch(t('settings.account'), t('settings.logout'));
    var hasResults = showProfileSection ||
        showBackup ||
        showBookmarks ||
        showTheme ||
        showLanguage ||
        showNotifications ||
        showAi ||
        showEditProfile ||
        showLinkedAccounts ||
        showLogout;
    var showDataSection = showBackup || showBookmarks;
    var showPreferencesSection = showTheme || showLanguage || showNotifications;
    var showAiSection = showAi;
    var showAccountSection = showLinkedAccounts || showLogout;
    return (<react_native_1.ScrollView style={styles.container}>

      {/* Profile Section */}
      {showProfileSection ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{t('settings.profile')}</react_native_1.Text>
          <react_native_1.View style={styles.profileCard}>
            <react_native_1.View style={styles.profileMainRow}>
              <Avatar_1.default name={(_b = user === null || user === void 0 ? void 0 : user.displayName) !== null && _b !== void 0 ? _b : t('settings.unknown')} avatarUrl={user === null || user === void 0 ? void 0 : user.avatarUrl} size={56}/>
              <react_native_1.View style={styles.profileInfo}>
                <react_native_1.Text style={styles.displayName}>{(_c = user === null || user === void 0 ? void 0 : user.displayName) !== null && _c !== void 0 ? _c : t('settings.unknown')}</react_native_1.Text>
                <react_native_1.Text style={styles.username}>
                  {(user === null || user === void 0 ? void 0 : user.username) ? "@".concat(user.username) : t('settings.unknown')}
                </react_native_1.Text>
                {(user === null || user === void 0 ? void 0 : user.bio) && <react_native_1.Text style={styles.bio}>{user.bio}</react_native_1.Text>}
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.View style={styles.profileActionRow}>
              {showEditProfile ? (<react_native_1.TouchableOpacity style={styles.profileActionChipPrimary} onPress={function () { return navigation.navigate('EditProfile'); }}>
                  <react_native_1.Text style={styles.profileActionChipPrimaryText}>
                    {t('settings.editProfile')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {showMyQr ? (<react_native_1.TouchableOpacity style={styles.profileActionChip} onPress={function () { return navigation.navigate('MyQr'); }}>
                  <react_native_1.Text style={styles.profileActionChipText}>{t('settings.myQr')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
              {showScanQr ? (<react_native_1.TouchableOpacity style={styles.profileActionChip} onPress={function () { return navigation.navigate('QrScan'); }}>
                  <react_native_1.Text style={styles.profileActionChipText}>{t('settings.scanQr')}</react_native_1.Text>
                </react_native_1.TouchableOpacity>) : null}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>) : null}

      {/* Data Section */}
      {showDataSection ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{t('settings.data')}</react_native_1.Text>
          {showBackup ? (<react_native_1.TouchableOpacity style={styles.menuItem} onPress={function () { return navigation.navigate('Backup'); }}>
              <react_native_1.Text style={styles.menuIcon}>{'💾'}</react_native_1.Text>
              <react_native_1.Text style={styles.menuText}>{t('settings.backup')}</react_native_1.Text>
              <react_native_1.Text style={styles.menuArrow}>{'›'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {showBookmarks ? (<react_native_1.TouchableOpacity style={styles.menuItem} onPress={function () { return navigation.navigate('Bookmarks'); }}>
              <react_native_1.Text style={styles.menuIcon}>{'🔖'}</react_native_1.Text>
              <react_native_1.Text style={styles.menuText}>{t('settings.bookmarks')}</react_native_1.Text>
              <react_native_1.Text style={styles.menuArrow}>{'›'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>) : null}

      {/* Preferences Section */}
      {showPreferencesSection ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{t('settings.preferences')}</react_native_1.Text>
          {showTheme ? (<react_native_1.View style={[styles.menuItem, styles.staticMenuItem]}>
              <react_native_1.Text style={styles.menuIcon}>{'🎨'}</react_native_1.Text>
              <react_native_1.View style={styles.staticMenuContent}>
                <react_native_1.Text style={styles.menuText}>{t('settings.theme')}</react_native_1.Text>
                <react_native_1.Text style={styles.menuSubtext}>{t('settings.themeLockedHint')}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.menuValue}>{t('settings.dark')}</react_native_1.Text>
            </react_native_1.View>) : null}
          {showLanguage ? (<react_native_1.TouchableOpacity style={styles.menuItem} onPress={handleLanguage}>
              <react_native_1.Text style={styles.menuIcon}>{'🌐'}</react_native_1.Text>
              <react_native_1.Text style={styles.menuText}>{t('settings.language')}</react_native_1.Text>
              <react_native_1.Text style={styles.menuValue}>{i18n_1.localeNames[locale]}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {showNotifications ? (<react_native_1.TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
              <react_native_1.Text style={styles.menuIcon}>{'🔔'}</react_native_1.Text>
              <react_native_1.Text style={styles.menuText}>{t('settings.notifications')}</react_native_1.Text>
              <react_native_1.Text style={styles.menuValue}>
                {notificationStatus === 'on'
                    ? t('settings.on')
                    : notificationStatus === 'off'
                        ? t('settings.off')
                        : t('settings.unavailable')}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>) : null}

      {showAiSection ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{t('settings.ai')}</react_native_1.Text>
          <react_native_1.View style={styles.infoCard}>
            <react_native_1.View style={styles.infoCardHeader}>
              <react_native_1.Text style={styles.infoCardTitle}>{t('settings.aiRuntime')}</react_native_1.Text>
              <react_native_1.View style={styles.infoBadge}>
                <react_native_1.Text style={styles.infoBadgeText}>
                  {(aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.label) || t('settings.aiRuntimeLoading')}
                </react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.Text style={styles.infoCardBody}>
              {(aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.description) || t('settings.aiRuntimeLoadingBody')}
            </react_native_1.Text>
            <react_native_1.Text style={styles.infoCardBody}>{t('settings.aiSummary')}</react_native_1.Text>
            <react_native_1.View style={styles.infoList}>
              {mobileAiCapabilities.map(function (capability) { return (<react_native_1.Text key={capability} style={styles.infoListItem}>
                  {'• '}
                  {getAiCapabilityLabel(capability)}
                </react_native_1.Text>); })}
            </react_native_1.View>
            <react_native_1.Text style={styles.infoCardHint}>{t('settings.aiMobileOnly')}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>) : null}

      {/* Account Section */}
      {showAccountSection ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{t('settings.account')}</react_native_1.Text>
          {showLinkedAccounts ? (<react_native_1.TouchableOpacity style={styles.menuItem} onPress={function () { return navigation.navigate('LinkedAccounts'); }}>
              <react_native_1.Text style={styles.menuIcon}>{'🔗'}</react_native_1.Text>
              <react_native_1.Text style={styles.menuText}>{t('settings.linkedAccounts')}</react_native_1.Text>
              <react_native_1.Text style={styles.menuArrow}>{'›'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
          {showLogout ? (<react_native_1.TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleLogout}>
              <react_native_1.Text style={styles.dangerText}>{t('settings.logout')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>) : null}

      {/* App Info */}
      <react_native_1.View style={styles.footer}>
        <react_native_1.Text style={styles.footerText}>{t('settings.version')}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    heroCard: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.lg,
        paddingBottom: theme_1.spacing.sm,
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
        marginTop: 4,
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.sm,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    emptyState: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.xxxl,
        alignItems: 'center',
    },
    emptyTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyBody: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
        marginTop: theme_1.spacing.sm,
        textAlign: 'center',
    },
    section: {
        marginTop: theme_1.spacing.xxl,
        paddingHorizontal: theme_1.spacing.lg,
    },
    sectionTitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme_1.spacing.md,
    },
    infoCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.sm,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
    },
    infoCardTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
        flex: 1,
    },
    infoBadge: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
    },
    infoBadgeText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        fontWeight: '700',
    },
    infoCardBody: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    infoList: {
        gap: theme_1.spacing.xs,
    },
    infoListItem: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    infoCardHint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
    },
    profileCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
    },
    profileMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
        marginLeft: theme_1.spacing.lg,
    },
    displayName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '600',
    },
    username: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        marginTop: 2,
    },
    bio: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.sm,
    },
    profileActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.lg,
    },
    profileActionChip: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    profileActionChipPrimary: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    profileActionChipText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    profileActionChipPrimaryText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginBottom: 2,
    },
    staticMenuItem: {
        opacity: 0.92,
    },
    staticMenuContent: {
        flex: 1,
    },
    menuIcon: {
        fontSize: 18,
        marginRight: theme_1.spacing.md,
        width: 24,
        textAlign: 'center',
    },
    menuText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        flex: 1,
    },
    menuSubtext: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        marginTop: theme_1.spacing.xs,
    },
    menuValue: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.lg,
    },
    menuArrow: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '300',
    },
    dangerItem: {
        marginTop: theme_1.spacing.sm,
    },
    dangerText: {
        color: theme_1.colors.error,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: theme_1.spacing.xxxl,
    },
    footerText: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.md,
    },
});
