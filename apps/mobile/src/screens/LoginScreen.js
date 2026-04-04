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
exports.default = LoginScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var AppleAuthentication = require("expo-apple-authentication");
var Google = require("expo-auth-session/providers/google");
var Linking = require("expo-linking");
var WebBrowser = require("expo-web-browser");
var api_1 = require("../lib/api");
var auth_config_1 = require("../lib/auth-config");
var auth_1 = require("../stores/auth");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var Logo_1 = require("../components/Logo");
var theme_1 = require("../theme");
var OTP_LENGTH = 6;
WebBrowser.maybeCompleteAuthSession();
function normalizePhoneNumberInput(value) {
    return value.replace(/\D/g, '');
}
function extractMagicLinkToken(url) {
    try {
        var queryParams = Linking.parse(url).queryParams;
        var token = queryParams === null || queryParams === void 0 ? void 0 : queryParams.token;
        return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
    }
    catch (_a) {
        return null;
    }
}
function LoginScreen() {
    var _this = this;
    var t = (0, i18n_1.useTranslation)().t;
    var _a = (0, react_1.useState)('phone'), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)('+82'), countryCode = _b[0], setCountryCode = _b[1];
    var _c = (0, react_1.useState)(''), phoneNumber = _c[0], setPhoneNumber = _c[1];
    var _d = (0, react_1.useState)(''), email = _d[0], setEmail = _d[1];
    var _e = (0, react_1.useState)(''), emailToken = _e[0], setEmailToken = _e[1];
    var _f = (0, react_1.useState)(Array(OTP_LENGTH).fill('')), otpDigits = _f[0], setOtpDigits = _f[1];
    var _g = (0, react_1.useState)(false), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)(false), devActionAttempted = _h[0], setDevActionAttempted = _h[1];
    var _j = (0, react_1.useState)(null), socialLoadingProvider = _j[0], setSocialLoadingProvider = _j[1];
    var _k = (0, react_1.useState)(react_native_1.Platform.OS === 'ios'), appleAvailable = _k[0], setAppleAvailable = _k[1];
    var login = (0, auth_1.useAuthStore)(function (s) { return s.login; });
    var loginWithSessionToken = (0, auth_1.useAuthStore)(function (s) { return s.loginWithSessionToken; });
    var otpRefs = (0, react_1.useRef)([]);
    var incomingUrl = Linking.useURL();
    var _l = Google.useIdTokenAuthRequest(auth_config_1.GOOGLE_AUTH_REQUEST_CONFIG), googleRequest = _l[0], googleResponse = _l[1], promptGoogleAsync = _l[2];
    (0, react_1.useEffect)(function () {
        if (react_native_1.Platform.OS !== 'ios') {
            setAppleAvailable(false);
            return;
        }
        AppleAuthentication.isAvailableAsync()
            .then(setAppleAvailable)
            .catch(function () { return setAppleAvailable(false); });
    }, []);
    (0, react_1.useEffect)(function () {
        function handleGoogleResponse() {
            return __awaiter(this, void 0, void 0, function () {
                var idToken, data, err_1;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!googleResponse)
                                return [2 /*return*/];
                            if (googleResponse.type !== 'success') {
                                if (googleResponse.type !== 'dismiss' && googleResponse.type !== 'cancel') {
                                    react_native_1.Alert.alert(t('auth.error'), t('auth.googleFailed'));
                                }
                                setSocialLoadingProvider(null);
                                return [2 /*return*/];
                            }
                            idToken = (_b = (_a = googleResponse.params) === null || _a === void 0 ? void 0 : _a.id_token) !== null && _b !== void 0 ? _b : (_c = googleResponse.authentication) === null || _c === void 0 ? void 0 : _c.idToken;
                            if (!idToken) {
                                react_native_1.Alert.alert(t('auth.error'), t('auth.googleMissingToken'));
                                setSocialLoadingProvider(null);
                                return [2 /*return*/];
                            }
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 4, 5, 6]);
                            return [4 /*yield*/, (0, api_1.api)('/api/auth/oauth/google', {
                                    method: 'POST',
                                    body: { idToken: idToken },
                                })];
                        case 2:
                            data = _d.sent();
                            return [4 /*yield*/, loginWithSessionToken(data.sessionToken)];
                        case 3:
                            _d.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            err_1 = _d.sent();
                            react_native_1.Alert.alert(t('auth.error'), err_1 instanceof Error ? err_1.message : t('auth.googleFailed'));
                            return [3 /*break*/, 6];
                        case 5:
                            setSocialLoadingProvider(null);
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        void handleGoogleResponse();
    }, [googleResponse, loginWithSessionToken, t]);
    (0, react_1.useEffect)(function () {
        function handleIncomingMagicLink() {
            return __awaiter(this, void 0, void 0, function () {
                var token, data, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!incomingUrl)
                                return [2 /*return*/];
                            token = extractMagicLinkToken(incomingUrl);
                            if (!token)
                                return [2 /*return*/];
                            setStep('emailVerify');
                            setEmailToken(token);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, api_1.api)('/api/auth/magic-link/verify', {
                                    method: 'POST',
                                    body: { token: token },
                                })];
                        case 2:
                            data = _a.sent();
                            return [4 /*yield*/, loginWithSessionToken(data.sessionToken)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            err_2 = _a.sent();
                            react_native_1.Alert.alert(t('auth.error'), err_2 instanceof Error ? err_2.message : t('auth.magicLinkVerifyFailed'));
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void handleIncomingMagicLink();
    }, [incomingUrl, loginWithSessionToken, t]);
    var COUNTRY_OPTIONS = [
        { label: t('auth.countryKorea'), value: '+82', stripLeadingZero: true },
        { label: t('auth.countryUnitedStates'), value: '+1' },
        { label: t('auth.countryJapan'), value: '+81', stripLeadingZero: true },
    ];
    var selectedCountry = COUNTRY_OPTIONS.find(function (option) { return option.value === countryCode; });
    var normalizedPhoneNumber = normalizePhoneNumberInput(phoneNumber);
    var subscriberNumber = (selectedCountry === null || selectedCountry === void 0 ? void 0 : selectedCountry.stripLeadingZero) && normalizedPhoneNumber.startsWith('0')
        ? normalizedPhoneNumber.slice(1)
        : normalizedPhoneNumber;
    var fullPhoneNumber = "".concat(countryCode).concat(subscriberNumber);
    var isSocialLoading = socialLoadingProvider !== null;
    var showPrimaryAuthTabs = step === 'phone' || step === 'email';
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttempted || loading)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, nextCountryCode_1, option, normalized, subscriber, fullNumber, requestResult_1, code, trimmedEmail, requestResult, token, verifyResult, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-login-action.json')];
                        case 1:
                            action = _b.sent();
                            if (!action)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 11, , 13]);
                            setDevActionAttempted(true);
                            if (!(action.type === 'phoneLogin')) return [3 /*break*/, 6];
                            nextCountryCode_1 = (_a = action.countryCode) !== null && _a !== void 0 ? _a : '+82';
                            option = COUNTRY_OPTIONS.find(function (item) { return item.value === nextCountryCode_1; });
                            normalized = normalizePhoneNumberInput(action.phoneNumber);
                            subscriber = (option === null || option === void 0 ? void 0 : option.stripLeadingZero) && normalized.startsWith('0')
                                ? normalized.slice(1)
                                : normalized;
                            fullNumber = "".concat(nextCountryCode_1).concat(subscriber);
                            setCountryCode(nextCountryCode_1);
                            setPhoneNumber(normalized);
                            setStep('otp');
                            return [4 /*yield*/, (0, api_1.api)('/api/auth/phone/request', {
                                    method: 'POST',
                                    body: { phoneNumber: fullNumber },
                                })];
                        case 3:
                            requestResult_1 = _b.sent();
                            code = requestResult_1.code;
                            if (!code) {
                                throw new Error('Phone login dev action did not receive an OTP code');
                            }
                            setOtpDigits(code.slice(0, OTP_LENGTH).split(''));
                            return [4 /*yield*/, login(fullNumber, code)];
                        case 4:
                            _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-login-result.json', { ok: true, action: 'phoneLogin', phoneNumber: fullNumber })];
                        case 5:
                            _b.sent();
                            return [2 /*return*/];
                        case 6:
                            trimmedEmail = action.email.trim();
                            setEmail(trimmedEmail);
                            setStep('emailVerify');
                            return [4 /*yield*/, (0, api_1.api)('/api/auth/magic-link/request', {
                                    method: 'POST',
                                    body: { email: trimmedEmail },
                                })];
                        case 7:
                            requestResult = _b.sent();
                            token = requestResult.token;
                            if (!token) {
                                throw new Error('Magic-link login dev action did not receive a token');
                            }
                            setEmailToken(token);
                            return [4 /*yield*/, (0, api_1.api)('/api/auth/magic-link/verify', {
                                    method: 'POST',
                                    body: { token: token },
                                })];
                        case 8:
                            verifyResult = _b.sent();
                            return [4 /*yield*/, loginWithSessionToken(verifyResult.sessionToken)];
                        case 9:
                            _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-login-result.json', { ok: true, action: 'emailMagicLinkLogin', email: trimmedEmail })];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 11:
                            error_1 = _b.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-login-result.json', {
                                    ok: false,
                                    error: error_1 instanceof Error ? error_1.message : String(error_1),
                                })];
                        case 12:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 13: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [COUNTRY_OPTIONS, devActionAttempted, loading, login, loginWithSessionToken]);
    var handleCountryCodePress = function () {
        react_native_1.Alert.alert(t('auth.selectCountryCode'), undefined, __spreadArray(__spreadArray([], COUNTRY_OPTIONS.map(function (option) { return ({
            text: option.value === countryCode ? "".concat(option.label, " \u2713") : option.label,
            onPress: function () { return setCountryCode(option.value); },
        }); }), true), [
            { text: t('common.cancel'), style: 'cancel' },
        ], false));
    };
    var handleGoogleLoginPress = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(0, auth_config_1.hasGoogleAuthConfig)()) {
                        react_native_1.Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleConfigMissing'));
                        return [2 /*return*/];
                    }
                    if (!googleRequest) {
                        react_native_1.Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleUnavailable'));
                        return [2 /*return*/];
                    }
                    setSocialLoadingProvider('google');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, promptGoogleAsync()];
                case 2:
                    result = _a.sent();
                    if (result.type === 'cancel' || result.type === 'dismiss') {
                        setSocialLoadingProvider(null);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    setSocialLoadingProvider(null);
                    react_native_1.Alert.alert(t('auth.error'), err_3 instanceof Error ? err_3.message : t('auth.googleFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleAppleLoginPress = function () { return __awaiter(_this, void 0, void 0, function () {
        var credential, fullName, data, err_4;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (react_native_1.Platform.OS !== 'ios' || !appleAvailable) {
                        react_native_1.Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.appleUnavailable'));
                        return [2 /*return*/];
                    }
                    setSocialLoadingProvider('apple');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, AppleAuthentication.signInAsync({
                            requestedScopes: [
                                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                                AppleAuthentication.AppleAuthenticationScope.EMAIL,
                            ],
                        })];
                case 2:
                    credential = _c.sent();
                    if (!credential.identityToken) {
                        throw new Error(t('auth.appleMissingToken'));
                    }
                    fullName = [(_a = credential.fullName) === null || _a === void 0 ? void 0 : _a.givenName, (_b = credential.fullName) === null || _b === void 0 ? void 0 : _b.familyName]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    return [4 /*yield*/, (0, api_1.api)('/api/auth/oauth/apple', {
                            method: 'POST',
                            body: __assign({ idToken: credential.identityToken }, (fullName ? { name: fullName } : {})),
                        })];
                case 3:
                    data = _c.sent();
                    return [4 /*yield*/, loginWithSessionToken(data.sessionToken)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 5:
                    err_4 = _c.sent();
                    if (typeof err_4 === 'object' &&
                        err_4 !== null &&
                        'code' in err_4 &&
                        err_4.code === 'ERR_REQUEST_CANCELED') {
                        setSocialLoadingProvider(null);
                        return [2 /*return*/];
                    }
                    react_native_1.Alert.alert(t('auth.error'), err_4 instanceof Error ? err_4.message : t('auth.appleFailed'));
                    return [3 /*break*/, 7];
                case 6:
                    setSocialLoadingProvider(null);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var requestOtp = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!normalizedPhoneNumber) {
                        react_native_1.Alert.alert(t('auth.error'), t('auth.enterPhoneNumber'));
                        return [2 /*return*/];
                    }
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.api)('/api/auth/phone/request', {
                            method: 'POST',
                            body: { phoneNumber: fullPhoneNumber },
                        })];
                case 2:
                    res = _a.sent();
                    if (res.code) {
                        react_native_1.Alert.alert(t('auth.devCode', { code: res.code }));
                    }
                    setStep('otp');
                    return [3 /*break*/, 5];
                case 3:
                    err_5 = _a.sent();
                    react_native_1.Alert.alert(t('auth.error'), err_5 instanceof Error ? err_5.message : t('auth.sendFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var requestMagicLink = function () { return __awaiter(_this, void 0, void 0, function () {
        var trimmedEmail, res, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trimmedEmail = email.trim();
                    if (!trimmedEmail) {
                        react_native_1.Alert.alert(t('auth.error'), t('auth.enterEmail'));
                        return [2 /*return*/];
                    }
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.api)('/api/auth/magic-link/request', {
                            method: 'POST',
                            body: { email: trimmedEmail },
                        })];
                case 2:
                    res = _a.sent();
                    if (__DEV__ && res.token) {
                        setEmailToken(res.token);
                        react_native_1.Alert.alert(t('auth.devMagicLinkTitle'), t('auth.devMagicLinkBody', { token: res.token }));
                    }
                    setStep('emailVerify');
                    return [3 /*break*/, 5];
                case 3:
                    err_6 = _a.sent();
                    react_native_1.Alert.alert(t('auth.error'), err_6 instanceof Error ? err_6.message : t('auth.emailSendFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var verifyMagicLinkToken = function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([], args_1, true), void 0, function (token) {
            var data, err_7;
            if (token === void 0) { token = emailToken.trim(); }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!token) {
                            react_native_1.Alert.alert(t('auth.error'), t('auth.enterMagicLinkToken'));
                            return [2 /*return*/];
                        }
                        setLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, (0, api_1.api)('/api/auth/magic-link/verify', {
                                method: 'POST',
                                body: { token: token },
                            })];
                    case 2:
                        data = _a.sent();
                        return [4 /*yield*/, loginWithSessionToken(data.sessionToken)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_7 = _a.sent();
                        react_native_1.Alert.alert(t('auth.error'), err_7 instanceof Error ? err_7.message : t('auth.magicLinkVerifyFailed'));
                        return [3 /*break*/, 6];
                    case 5:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    var verifyOtp = function (code) { return __awaiter(_this, void 0, void 0, function () {
        var err_8;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (code.length !== OTP_LENGTH)
                        return [2 /*return*/];
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, login(fullPhoneNumber, code)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 3:
                    err_8 = _b.sent();
                    react_native_1.Alert.alert(t('auth.error'), err_8 instanceof Error ? err_8.message : t('auth.verifyFailed'));
                    setOtpDigits(Array(OTP_LENGTH).fill(''));
                    (_a = otpRefs.current[0]) === null || _a === void 0 ? void 0 : _a.focus();
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleOtpChange = function (index, value) {
        var _a, _b;
        if (value.length > 1) {
            var digits = value.split('').slice(0, OTP_LENGTH);
            var nextOtp_1 = __spreadArray([], otpDigits, true);
            digits.forEach(function (digit, digitIndex) {
                if (index + digitIndex < OTP_LENGTH) {
                    nextOtp_1[index + digitIndex] = digit;
                }
            });
            setOtpDigits(nextOtp_1);
            var code_1 = nextOtp_1.join('');
            if (code_1.length === OTP_LENGTH) {
                void verifyOtp(code_1);
            }
            else {
                (_a = otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]) === null || _a === void 0 ? void 0 : _a.focus();
            }
            return;
        }
        var nextOtp = __spreadArray([], otpDigits, true);
        nextOtp[index] = value;
        setOtpDigits(nextOtp);
        if (value && index < OTP_LENGTH - 1) {
            (_b = otpRefs.current[index + 1]) === null || _b === void 0 ? void 0 : _b.focus();
        }
        var code = nextOtp.join('');
        if (code.length === OTP_LENGTH) {
            void verifyOtp(code);
        }
    };
    var handleOtpKeyPress = function (index, key) {
        var _a;
        if (key === 'Backspace' && !otpDigits[index] && index > 0) {
            (_a = otpRefs.current[index - 1]) === null || _a === void 0 ? void 0 : _a.focus();
            var nextOtp = __spreadArray([], otpDigits, true);
            nextOtp[index - 1] = '';
            setOtpDigits(nextOtp);
        }
    };
    var handlePhoneNumberChange = function (value) {
        setPhoneNumber(normalizePhoneNumberInput(value));
    };
    var handleSelectStep = function (nextStep) {
        setStep(nextStep);
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setEmailToken('');
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
        <react_native_1.View style={styles.inner}>
          <react_native_1.View style={styles.logoContainer}>
            <Logo_1.default size={80}/>
            <react_native_1.Text style={styles.title}>{t('app.name')}</react_native_1.Text>
            <react_native_1.Text style={styles.subtitle}>{t('auth.tagline')}</react_native_1.Text>
          </react_native_1.View>

          {showPrimaryAuthTabs ? (<react_native_1.View style={styles.formContainer}>
              <react_native_1.View style={styles.authTabs}>
                <react_native_1.TouchableOpacity style={[styles.authTab, step === 'phone' && styles.authTabActive]} onPress={function () { return handleSelectStep('phone'); }} disabled={loading || isSocialLoading}>
                  <react_native_1.Text style={[styles.authTabText, step === 'phone' && styles.authTabTextActive]}>
                    {t('auth.phone')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.authTab, step === 'email' && styles.authTabActive]} onPress={function () { return handleSelectStep('email'); }} disabled={loading || isSocialLoading}>
                  <react_native_1.Text style={[styles.authTabText, step === 'email' && styles.authTabTextActive]}>
                    {t('auth.email')}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              {step === 'phone' ? (<>
                  <react_native_1.Text style={styles.label}>{t('auth.phone')}</react_native_1.Text>
                  <react_native_1.View style={styles.phoneRow}>
                    <react_native_1.TouchableOpacity style={styles.countryCodeButton} onPress={handleCountryCodePress} activeOpacity={0.7}>
                      <react_native_1.Text style={styles.countryCodeText}>{countryCode}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TextInput style={styles.phoneInput} placeholder={t('auth.phonePlaceholder')} placeholderTextColor={theme_1.colors.textMuted} keyboardType="phone-pad" autoComplete="tel" value={phoneNumber} onChangeText={handlePhoneNumberChange} editable={!loading && !isSocialLoading}/>
                  </react_native_1.View>

                  <react_native_1.TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={requestOtp} disabled={loading || isSocialLoading}>
                    {loading ? (<react_native_1.ActivityIndicator color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.primaryButtonText}>{t('auth.sendCode')}</react_native_1.Text>)}
                  </react_native_1.TouchableOpacity>
                </>) : (<>
                  <react_native_1.Text style={styles.label}>{t('auth.email')}</react_native_1.Text>
                  <react_native_1.TextInput style={styles.emailInput} placeholder={t('auth.emailPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} editable={!loading && !isSocialLoading}/>

                  <react_native_1.TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={requestMagicLink} disabled={loading || isSocialLoading}>
                    {loading ? (<react_native_1.ActivityIndicator color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.primaryButtonText}>{t('auth.sendMagicLink')}</react_native_1.Text>)}
                  </react_native_1.TouchableOpacity>

                  <react_native_1.Text style={styles.inlineHint}>{t('auth.magicLinkHint')}</react_native_1.Text>
                </>)}

              <react_native_1.View style={styles.divider}>
                <react_native_1.View style={styles.dividerLine}/>
                <react_native_1.Text style={styles.dividerText}>{t('auth.or')}</react_native_1.Text>
                <react_native_1.View style={styles.dividerLine}/>
              </react_native_1.View>

              <react_native_1.TouchableOpacity style={[
                styles.socialButton,
                !(0, auth_config_1.hasGoogleAuthConfig)() && styles.socialButtonMuted,
                (loading || isSocialLoading) && styles.buttonDisabled,
            ]} onPress={handleGoogleLoginPress} disabled={loading || isSocialLoading}>
                <react_native_1.Text style={styles.socialIcon}>G</react_native_1.Text>
                <react_native_1.Text style={styles.socialText}>{t('auth.google')}</react_native_1.Text>
                {socialLoadingProvider === 'google' ? (<react_native_1.ActivityIndicator color={theme_1.colors.text}/>) : !(0, auth_config_1.hasGoogleAuthConfig)() ? (<react_native_1.View style={styles.socialBadge}>
                    <react_native_1.Text style={styles.socialBadgeText}>{t('auth.socialLoginSetup')}</react_native_1.Text>
                  </react_native_1.View>) : null}
              </react_native_1.TouchableOpacity>

              <react_native_1.TouchableOpacity style={[
                styles.socialButton,
                (!appleAvailable || react_native_1.Platform.OS !== 'ios') && styles.socialButtonMuted,
                (loading || isSocialLoading) && styles.buttonDisabled,
            ]} onPress={handleAppleLoginPress} disabled={loading || isSocialLoading}>
                <react_native_1.Text style={styles.socialIcon}>{"\uF8FF"}</react_native_1.Text>
                <react_native_1.Text style={styles.socialText}>{t('auth.apple')}</react_native_1.Text>
                {socialLoadingProvider === 'apple' ? (<react_native_1.ActivityIndicator color={theme_1.colors.text}/>) : react_native_1.Platform.OS !== 'ios' || !appleAvailable ? (<react_native_1.View style={styles.socialBadge}>
                    <react_native_1.Text style={styles.socialBadgeText}>{t('auth.socialLoginIosOnly')}</react_native_1.Text>
                  </react_native_1.View>) : null}
              </react_native_1.TouchableOpacity>
            </react_native_1.View>) : step === 'otp' ? (<react_native_1.View style={styles.formContainer}>
              <react_native_1.Text style={styles.label}>{t('auth.verificationCode')}</react_native_1.Text>
              <react_native_1.Text style={styles.hint}>{t('auth.codeSentTo', { phone: fullPhoneNumber })}</react_native_1.Text>

              <react_native_1.View style={styles.otpRow}>
                {otpDigits.map(function (digit, index) { return (<react_native_1.TextInput key={index} ref={function (ref) {
                    otpRefs.current[index] = ref;
                }} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]} value={digit} onChangeText={function (value) { return handleOtpChange(index, value); }} onKeyPress={function (_a) {
                var nativeEvent = _a.nativeEvent;
                return handleOtpKeyPress(index, nativeEvent.key);
            }} keyboardType="number-pad" maxLength={index === 0 ? OTP_LENGTH : 1} editable={!loading} autoFocus={index === 0} selectTextOnFocus/>); })}
              </react_native_1.View>

              {loading ? (<react_native_1.View style={styles.verifyingRow}>
                  <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
                  <react_native_1.Text style={styles.verifyingText}>{t('auth.verifying')}</react_native_1.Text>
                </react_native_1.View>) : null}

              <react_native_1.TouchableOpacity style={styles.backLink} onPress={function () {
                setStep('phone');
                setOtpDigits(Array(OTP_LENGTH).fill(''));
            }}>
                <react_native_1.Text style={styles.backLinkText}>{t('auth.useDifferentNumber')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>

              <react_native_1.TouchableOpacity style={styles.resendLink} onPress={requestOtp} disabled={loading}>
                <react_native_1.Text style={styles.resendText}>{t('auth.resendCode')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>) : (<react_native_1.View style={styles.formContainer}>
              <react_native_1.Text style={styles.label}>{t('auth.magicLinkToken')}</react_native_1.Text>
              <react_native_1.Text style={styles.hint}>{t('auth.magicLinkSentTo', { email: email.trim() })}</react_native_1.Text>

              <react_native_1.TextInput style={styles.emailInput} placeholder={t('auth.magicLinkTokenPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} autoCapitalize="none" autoCorrect={false} value={emailToken} onChangeText={setEmailToken} editable={!loading}/>

              <react_native_1.TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={function () { return void verifyMagicLinkToken(); }} disabled={loading}>
                {loading ? (<react_native_1.ActivityIndicator color={theme_1.colors.white}/>) : (<react_native_1.Text style={styles.primaryButtonText}>{t('auth.verifyMagicLink')}</react_native_1.Text>)}
              </react_native_1.TouchableOpacity>

              <react_native_1.Text style={styles.inlineHint}>{t('auth.magicLinkOpenHint')}</react_native_1.Text>

              <react_native_1.TouchableOpacity style={styles.backLink} onPress={function () {
                setStep('email');
                setEmailToken('');
            }}>
                <react_native_1.Text style={styles.backLinkText}>{t('auth.useDifferentEmail')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>

              <react_native_1.TouchableOpacity style={styles.resendLink} onPress={requestMagicLink} disabled={loading}>
                <react_native_1.Text style={styles.resendText}>{t('auth.resendMagicLink')}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>)}
        </react_native_1.View>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.bg,
    },
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: theme_1.spacing.xxxl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: theme_1.fontSize.title,
        fontWeight: '700',
        color: theme_1.colors.white,
        textAlign: 'center',
        marginBottom: theme_1.spacing.sm,
    },
    subtitle: {
        fontSize: theme_1.fontSize.lg,
        color: theme_1.colors.textSecondary,
        textAlign: 'center',
    },
    formContainer: {
        gap: 0,
    },
    authTabs: {
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        flexDirection: 'row',
        marginBottom: theme_1.spacing.xl,
        padding: 4,
    },
    authTab: {
        alignItems: 'center',
        borderRadius: theme_1.borderRadius.sm,
        flex: 1,
        paddingVertical: theme_1.spacing.md,
    },
    authTabActive: {
        backgroundColor: theme_1.colors.primary,
    },
    authTabText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    authTabTextActive: {
        color: theme_1.colors.white,
    },
    label: {
        fontSize: theme_1.fontSize.md,
        fontWeight: '600',
        color: theme_1.colors.textSecondary,
        marginBottom: theme_1.spacing.sm,
    },
    hint: {
        fontSize: theme_1.fontSize.sm,
        color: theme_1.colors.textMuted,
        marginBottom: theme_1.spacing.lg,
    },
    inlineHint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 18,
        marginTop: theme_1.spacing.md,
    },
    phoneRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.xl,
    },
    countryCodeButton: {
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.borderLight,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        justifyContent: 'center',
        minWidth: 72,
        paddingHorizontal: theme_1.spacing.lg,
    },
    countryCodeText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
    },
    phoneInput: {
        flex: 1,
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.borderLight,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        letterSpacing: 1,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.lg,
    },
    emailInput: {
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.borderLight,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        marginBottom: theme_1.spacing.xl,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.lg,
    },
    primaryButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.lg,
        alignItems: 'center',
        marginBottom: theme_1.spacing.xl,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme_1.spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme_1.colors.borderLight,
    },
    dividerText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        marginHorizontal: theme_1.spacing.lg,
        fontWeight: '600',
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.surface,
        borderWidth: 1,
        borderColor: theme_1.colors.borderLight,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.md,
        marginBottom: theme_1.spacing.md,
        gap: theme_1.spacing.md,
    },
    socialButtonMuted: {
        opacity: 0.78,
    },
    socialIcon: {
        fontSize: 20,
        color: theme_1.colors.text,
        fontWeight: '700',
    },
    socialText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.body,
        fontWeight: '600',
    },
    socialBadge: {
        backgroundColor: theme_1.colors.surfaceLight,
        borderRadius: theme_1.borderRadius.round,
        paddingHorizontal: theme_1.spacing.sm,
        paddingVertical: 4,
    },
    socialBadgeText: {
        color: theme_1.colors.warning,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.xxl,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 2,
        borderColor: theme_1.colors.borderLight,
        backgroundColor: theme_1.colors.surface,
        textAlign: 'center',
        fontSize: theme_1.fontSize.xxl,
        color: theme_1.colors.white,
        fontWeight: '700',
    },
    otpBoxFilled: {
        borderColor: theme_1.colors.primary,
    },
    verifyingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.lg,
    },
    verifyingText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.md,
        fontWeight: '500',
    },
    backLink: {
        alignItems: 'center',
        marginTop: theme_1.spacing.lg,
    },
    backLinkText: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.md,
        fontWeight: '600',
    },
    resendLink: {
        alignItems: 'center',
        marginTop: theme_1.spacing.md,
    },
    resendText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
    },
});
