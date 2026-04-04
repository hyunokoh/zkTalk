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
exports.default = QrScanScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_camera_1 = require("expo-camera");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
var QR_PREFIX = 'zktalk://qr/';
var PROFILE_QR_PREFIX = 'zktalk://user/';
function sendFriendRequest(userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, api_1.api)('/api/friends/request', {
                    method: 'POST',
                    body: { userId: userId },
                })];
        });
    });
}
function getFriendRequestAlertKey(error) {
    if (!(error instanceof api_1.ApiError)) {
        return null;
    }
    var message = error.message.toLowerCase();
    if (error.status === 400 && message.includes('yourself')) {
        return 'self';
    }
    if (error.status === 403 && message.includes('cannot send friend request')) {
        return 'blocked';
    }
    if (error.status === 409 && message.includes('already friends')) {
        return 'already-added';
    }
    if (error.status === 409 && message.includes('already sent')) {
        return 'pending';
    }
    return null;
}
function QrScanScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var _b = (0, expo_camera_1.useCameraPermissions)(), permission = _b[0], requestPermission = _b[1];
    var _c = (0, react_1.useState)(false), scanned = _c[0], setScanned = _c[1];
    var _d = (0, react_1.useState)(false), confirming = _d[0], setConfirming = _d[1];
    (0, react_1.useEffect)(function () {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission, requestPermission]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        var cancelled = false;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, qrData, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-qr-scan-action.json')];
                        case 1:
                            action = _b.sent();
                            if (!action || cancelled)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 9, 11, 13]);
                            qrData = (_a = action.qrData) === null || _a === void 0 ? void 0 : _a.trim();
                            if (action.type !== 'scan' || !qrData) {
                                throw new Error('Missing qrData for QR scan dev action');
                            }
                            if (!qrData.startsWith(QR_PREFIX)) return [3 /*break*/, 4];
                            return [4 /*yield*/, handleDesktopLoginQr(qrData)];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 4:
                            if (!qrData.startsWith(PROFILE_QR_PREFIX)) return [3 /*break*/, 6];
                            return [4 /*yield*/, handleProfileQr(qrData, { autoConfirm: action.autoConfirm })];
                        case 5:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 6: throw new Error('Unsupported QR payload');
                        case 7: return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-qr-scan-result.json', {
                                ok: true,
                                action: 'scan',
                                qrData: qrData,
                            })];
                        case 8:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 9:
                            error_1 = _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-qr-scan-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 11: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-qr-scan-action.json')];
                        case 12:
                            _b.sent();
                            return [7 /*endfinally*/];
                        case 13: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
        return function () {
            cancelled = true;
        };
    }, []);
    var handlePermissionAction = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(permission === null || permission === void 0 ? void 0 : permission.canAskAgain)) return [3 /*break*/, 2];
                    return [4 /*yield*/, requestPermission()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2: return [4 /*yield*/, react_native_1.Linking.openSettings()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var handleBarCodeScanned = function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var data = _b.data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (scanned || confirming)
                        return [2 /*return*/];
                    if (!data.startsWith(QR_PREFIX)) return [3 /*break*/, 2];
                    return [4 /*yield*/, handleDesktopLoginQr(data)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
                case 2:
                    if (!data.startsWith(PROFILE_QR_PREFIX)) return [3 /*break*/, 4];
                    return [4 /*yield*/, handleProfileQr(data)];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
                case 4:
                    setScanned(true);
                    react_native_1.Alert.alert(t('settings.invalidQrTitle'), t('settings.invalidQrBody'), [{ text: t('settings.scanAgain'), onPress: function () { return setScanned(false); } }]);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleDesktopLoginQr = function (data) { return __awaiter(_this, void 0, void 0, function () {
        var qrToken, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    qrToken = data.slice(QR_PREFIX.length);
                    if (!qrToken) {
                        setScanned(true);
                        react_native_1.Alert.alert(t('settings.invalidQrTitle'), t('settings.invalidQrEmpty'), [
                            { text: t('settings.scanAgain'), onPress: function () { return setScanned(false); } },
                        ]);
                        return [2 /*return*/];
                    }
                    setScanned(true);
                    setConfirming(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.api)('/api/auth/qr/confirm', {
                            method: 'POST',
                            body: { qrToken: qrToken },
                        })];
                case 2:
                    _a.sent();
                    react_native_1.Alert.alert(t('settings.qrLoginSuccessTitle'), t('settings.qrLoginSuccessBody'), [{ text: t('common.confirm'), onPress: function () { return navigation.goBack(); } }]);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), err_1 instanceof Error ? err_1.message : t('settings.qrLoginFailed'), [{ text: t('common.retry'), onPress: function () { return setScanned(false); } }]);
                    return [3 /*break*/, 5];
                case 4:
                    setConfirming(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleProfileQr = function (data, options) { return __awaiter(_this, void 0, void 0, function () {
        var raw, _a, encodedUserId, _b, query, userId, params, displayName, username, friendship, submitFriendRequest_1, err_2;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    raw = data.slice(PROFILE_QR_PREFIX.length);
                    _a = raw.split('?'), encodedUserId = _a[0], _b = _a[1], query = _b === void 0 ? '' : _b;
                    userId = decodeURIComponent(encodedUserId !== null && encodedUserId !== void 0 ? encodedUserId : '').trim();
                    if (!userId) {
                        setScanned(true);
                        react_native_1.Alert.alert(t('settings.invalidQrTitle'), t('settings.invalidQrBody'), [
                            { text: t('settings.scanAgain'), onPress: function () { return setScanned(false); } },
                        ]);
                        return [2 /*return*/];
                    }
                    params = new URLSearchParams(query);
                    displayName = params.get('displayName') || t('settings.unknown');
                    username = params.get('username') || '';
                    setScanned(true);
                    setConfirming(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, (0, api_1.api)("/api/friends/check/".concat(userId))];
                case 2:
                    friendship = _c.sent();
                    if (friendship.status === 'accepted') {
                        react_native_1.Alert.alert(t('settings.friendAlreadyAddedTitle'), t('settings.friendAlreadyAddedBody', { name: displayName }), [{ text: t('common.confirm'), onPress: function () { return setScanned(false); } }]);
                        return [2 /*return*/];
                    }
                    if (friendship.status === 'blocked') {
                        react_native_1.Alert.alert(t('settings.friendBlockedTitle'), t('settings.friendBlockedBody'), [{ text: t('common.confirm'), onPress: function () { return setScanned(false); } }]);
                        return [2 /*return*/];
                    }
                    submitFriendRequest_1 = function () { return __awaiter(_this, void 0, void 0, function () {
                        var result, err_3, alertKey;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, 3, 4]);
                                    return [4 /*yield*/, sendFriendRequest(userId)];
                                case 1:
                                    result = _a.sent();
                                    if (result.friendship.status === 'accepted') {
                                        react_native_1.Alert.alert(t('settings.friendRequestAcceptedTitle'), t('settings.friendRequestAcceptedBody', { name: displayName }));
                                    }
                                    else {
                                        react_native_1.Alert.alert(t('settings.friendRequestSentTitle'), t('settings.friendRequestSentBody', { name: displayName }));
                                    }
                                    return [3 /*break*/, 4];
                                case 2:
                                    err_3 = _a.sent();
                                    alertKey = getFriendRequestAlertKey(err_3);
                                    if (alertKey === 'pending') {
                                        react_native_1.Alert.alert(t('settings.friendPendingTitle'), t('settings.friendPendingBody', { name: displayName }));
                                        return [2 /*return*/];
                                    }
                                    if (alertKey === 'self') {
                                        react_native_1.Alert.alert(t('settings.friendSelfTitle'), t('settings.friendSelfBody'));
                                        return [2 /*return*/];
                                    }
                                    if (alertKey === 'already-added') {
                                        react_native_1.Alert.alert(t('settings.friendAlreadyAddedTitle'), t('settings.friendAlreadyAddedBody', { name: displayName }));
                                        return [2 /*return*/];
                                    }
                                    if (alertKey === 'blocked') {
                                        react_native_1.Alert.alert(t('settings.friendBlockedTitle'), t('settings.friendBlockedBody'));
                                        return [2 /*return*/];
                                    }
                                    react_native_1.Alert.alert(t('common.error'), err_3 instanceof Error ? err_3.message : t('settings.friendRequestFailed'));
                                    return [3 /*break*/, 4];
                                case 3:
                                    setScanned(false);
                                    return [7 /*endfinally*/];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); };
                    if (!(options === null || options === void 0 ? void 0 : options.autoConfirm)) return [3 /*break*/, 4];
                    return [4 /*yield*/, submitFriendRequest_1()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
                case 4:
                    react_native_1.Alert.alert(t('settings.friendQrTitle'), username
                        ? t('settings.friendQrBodyWithUsername', { name: displayName, username: username })
                        : t('settings.friendQrBody', { name: displayName }), [
                        {
                            text: t('common.cancel'),
                            style: 'cancel',
                            onPress: function () { return setScanned(false); },
                        },
                        {
                            text: t('friends.add'),
                            onPress: function () {
                                void submitFriendRequest_1();
                            },
                        },
                    ]);
                    return [3 /*break*/, 7];
                case 5:
                    err_2 = _c.sent();
                    react_native_1.Alert.alert(t('common.error'), err_2 instanceof Error ? err_2.message : t('settings.friendRequestFailed'), [{ text: t('common.retry'), onPress: function () { return setScanned(false); } }]);
                    return [3 /*break*/, 7];
                case 6:
                    setConfirming(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    if (!permission) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
          <react_native_1.Text style={styles.statusText}>{t('settings.qrCheckingPermission')}</react_native_1.Text>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    if (!permission.granted) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.View style={styles.center}>
          <react_native_1.Text style={styles.icon}>{'📷'}</react_native_1.Text>
          <react_native_1.Text style={styles.title}>{t('settings.qrCameraRequiredTitle')}</react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>
            {permission.canAskAgain
                ? t('settings.qrCameraRequiredBody')
                : t('settings.qrCameraBlockedBody')}
          </react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.button} onPress={handlePermissionAction}>
            <react_native_1.Text style={styles.buttonText}>
              {permission.canAskAgain
                ? t('settings.qrGrantPermission')
                : t('settings.openSystemSettings')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
      <react_native_1.View style={styles.cameraContainer}>
        <expo_camera_1.CameraView style={styles.camera} barcodeScannerSettings={{
            barcodeTypes: ['qr'],
        }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}/>
        <react_native_1.View style={styles.overlay}>
          <react_native_1.View style={styles.scanFrame}/>
        </react_native_1.View>
        <react_native_1.View style={styles.instructions}>
          {confirming ? (<react_native_1.View style={styles.confirmingRow}>
              <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
              <react_native_1.Text style={styles.instructionText}>{t('settings.qrWorking')}</react_native_1.Text>
            </react_native_1.View>) : (<react_native_1.Text style={styles.instructionText}>
              {t('settings.qrScanHint')}
            </react_native_1.Text>)}
        </react_native_1.View>
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.backgroundDark,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.xxxl,
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: __assign(__assign({}, react_native_1.StyleSheet.absoluteFillObject), { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' }),
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        backgroundColor: 'transparent',
    },
    instructions: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.xxxl,
    },
    instructionText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        textAlign: 'center',
        fontWeight: '500',
    },
    confirmingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
    },
    icon: {
        fontSize: 48,
        marginBottom: theme_1.spacing.lg,
    },
    title: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: theme_1.spacing.sm,
    },
    subtitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: theme_1.spacing.xxl,
    },
    statusText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.md,
    },
    button: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.xxl,
        paddingVertical: theme_1.spacing.md,
    },
    buttonText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
});
