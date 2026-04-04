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
exports.default = MyQrScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_native_qrcode_svg_1 = require("react-native-qrcode-svg");
var auth_1 = require("../stores/auth");
var Avatar_1 = require("../components/Avatar");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
function MyQrScreen() {
    var _this = this;
    var _a, _b, _c;
    var t = (0, i18n_1.useTranslation)().t;
    var user = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var qrValue = "zktalk://user/".concat((_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : '', "?displayName=").concat(encodeURIComponent((_b = user === null || user === void 0 ? void 0 : user.displayName) !== null && _b !== void 0 ? _b : ''), "&username=").concat(encodeURIComponent((_c = user === null || user === void 0 ? void 0 : user.username) !== null && _c !== void 0 ? _c : ''));
    var handleShare = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, react_native_1.Share.share({
                            message: t('settings.myQrShareMessage', {
                                name: (_b = user === null || user === void 0 ? void 0 : user.displayName) !== null && _b !== void 0 ? _b : t('settings.unknown'),
                                qrValue: qrValue,
                            }),
                            title: t('settings.myQrShareTitle'),
                        })];
                case 1:
                    _c.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, [qrValue, t, user === null || user === void 0 ? void 0 : user.displayName]);
    var handleCopyLink = (0, react_1.useCallback)(function () {
        try {
            if (typeof (react_native_1.Clipboard === null || react_native_1.Clipboard === void 0 ? void 0 : react_native_1.Clipboard.setString) === 'function') {
                react_native_1.Clipboard.setString(qrValue);
                react_native_1.Alert.alert(t('settings.copyLinkSuccessTitle'), t('settings.copyLinkSuccessBody'));
                return;
            }
        }
        catch (_a) {
            // Fall through to the generic error below.
        }
        react_native_1.Alert.alert(t('common.error'), t('message.copyFailed'));
    }, [qrValue, t]);
    if (!user) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.View style={styles.center}>
          <react_native_1.Text style={styles.errorText}>{t('settings.myQrNotLoggedIn')}</react_native_1.Text>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
      <react_native_1.View style={styles.content}>
        {/* Profile Info */}
        <react_native_1.View style={styles.profileSection}>
          <Avatar_1.default name={user.displayName} avatarUrl={user.avatarUrl} size={72}/>
          <react_native_1.Text style={styles.displayName}>{user.displayName}</react_native_1.Text>
          <react_native_1.Text style={styles.username}>@{user.username}</react_native_1.Text>
          {user.bio && <react_native_1.Text style={styles.bio}>{user.bio}</react_native_1.Text>}
        </react_native_1.View>

        {/* QR Code */}
        <react_native_1.View style={styles.qrCard}>
          <react_native_1.View style={styles.qrWrapper}>
            <react_native_qrcode_svg_1.default value={qrValue} size={220} backgroundColor={theme_1.colors.textPrimary} color={theme_1.colors.backgroundDark}/>
          </react_native_1.View>
          <react_native_1.Text style={styles.qrHint}>
            {t('settings.myQrHint')}
          </react_native_1.Text>
          <react_native_1.Text style={styles.desktopHint}>
            {t('settings.myQrDesktopHint')}
          </react_native_1.Text>
        </react_native_1.View>

        <react_native_1.View style={styles.actions}>
          <react_native_1.TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
            <react_native_1.Text style={styles.copyButtonText}>{t('settings.copyLinkButton')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <react_native_1.Text style={styles.shareButtonText}>{t('settings.myQrShareButton')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xl,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.xxxl,
        paddingTop: theme_1.spacing.xxl,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: theme_1.spacing.xxl,
    },
    displayName: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxxl,
        fontWeight: '700',
        marginTop: theme_1.spacing.md,
    },
    username: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.lg,
        marginTop: theme_1.spacing.xs,
    },
    bio: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.sm,
        textAlign: 'center',
    },
    qrCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.xl,
        padding: theme_1.spacing.xxl,
        alignItems: 'center',
        marginBottom: theme_1.spacing.xxl,
        width: '100%',
    },
    qrWrapper: {
        padding: theme_1.spacing.lg,
        backgroundColor: theme_1.colors.textPrimary,
        borderRadius: theme_1.borderRadius.lg,
        marginBottom: theme_1.spacing.lg,
    },
    qrHint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        textAlign: 'center',
    },
    desktopHint: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        textAlign: 'center',
        marginTop: theme_1.spacing.sm,
        lineHeight: 20,
    },
    actions: {
        width: '100%',
        gap: theme_1.spacing.md,
    },
    copyButton: {
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.xxxl,
        paddingVertical: theme_1.spacing.md,
        width: '100%',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
    },
    copyButtonText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
    shareButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.xxxl,
        paddingVertical: theme_1.spacing.md,
        width: '100%',
        alignItems: 'center',
    },
    shareButtonText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
});
