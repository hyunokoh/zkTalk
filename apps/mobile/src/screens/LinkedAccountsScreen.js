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
exports.default = LinkedAccountsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var AppleAuthentication = require("expo-apple-authentication");
var Google = require("expo-auth-session/providers/google");
var Linking = require("expo-linking");
var api_1 = require("../lib/api");
var auth_config_1 = require("../lib/auth-config");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function getMethodLabel(t, type) {
    switch (type) {
        case 'phone':
            return t('settings.authMethodPhone');
        case 'email':
            return t('settings.authMethodEmail');
        case 'google':
            return t('settings.authMethodGoogle');
        case 'apple':
            return t('settings.authMethodApple');
    }
}
function maskIdentifier(type, identifier) {
    if (type === 'phone') {
        var digits = identifier.replace(/\D/g, '');
        if (digits.length < 4)
            return identifier;
        return "".concat(identifier.slice(0, Math.max(0, identifier.length - 4))).concat(digits.slice(-4));
    }
    if (type === 'email') {
        var _a = identifier.split('@'), localPart = _a[0], domain = _a[1];
        if (!localPart || !domain)
            return identifier;
        var visible = localPart.slice(0, 2);
        return "".concat(visible).concat('*'.repeat(Math.max(1, localPart.length - visible.length)), "@").concat(domain);
    }
    return identifier;
}
function normalizePhoneNumberInput(value) {
    return value.replace(/\D/g, '');
}
function LinkedAccountsScreen() {
    var _this = this;
    var _a, _b, _c;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)(react_native_1.Platform.OS === 'ios'), appleAvailable = _d[0], setAppleAvailable = _d[1];
    var _e = (0, react_1.useState)(null), linkingProvider = _e[0], setLinkingProvider = _e[1];
    var _f = (0, react_1.useState)(''), searchQuery = _f[0], setSearchQuery = _f[1];
    var _g = (0, react_1.useState)('+82'), countryCode = _g[0], setCountryCode = _g[1];
    var _h = (0, react_1.useState)(''), phoneNumber = _h[0], setPhoneNumber = _h[1];
    var _j = (0, react_1.useState)(''), phoneOtp = _j[0], setPhoneOtp = _j[1];
    var _k = (0, react_1.useState)(false), phoneLinkRequested = _k[0], setPhoneLinkRequested = _k[1];
    var _l = (0, react_1.useState)(''), emailInput = _l[0], setEmailInput = _l[1];
    var _m = (0, react_1.useState)(''), emailToken = _m[0], setEmailToken = _m[1];
    var _o = (0, react_1.useState)(false), emailLinkRequested = _o[0], setEmailLinkRequested = _o[1];
    var devActionAttemptedRef = (0, react_1.useRef)(false);
    var incomingUrl = Linking.useURL();
    var _p = Google.useIdTokenAuthRequest(auth_config_1.GOOGLE_AUTH_REQUEST_CONFIG), googleRequest = _p[0], googleResponse = _p[1], promptGoogleAsync = _p[2];
    var methodsQuery = (0, react_query_1.useQuery)({
        queryKey: ['auth-methods'],
        queryFn: function () { return (0, api_1.api)('/api/me/auth-methods'); },
    });
    var COUNTRY_OPTIONS = [
        { label: t('auth.countryKorea'), value: '+82', stripLeadingZero: true },
        { label: t('auth.countryUnitedStates'), value: '+1' },
        { label: t('auth.countryJapan'), value: '+81', stripLeadingZero: true },
    ];
    (0, react_1.useEffect)(function () {
        if (react_native_1.Platform.OS !== 'ios') {
            setAppleAvailable(false);
            return;
        }
        AppleAuthentication.isAvailableAsync()
            .then(setAppleAvailable)
            .catch(function () { return setAppleAvailable(false); });
    }, []);
    var unlinkMutation = (0, react_query_1.useMutation)({
        mutationFn: function (method) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/me/auth-methods/".concat(method.id), {
                            method: 'DELETE',
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
    });
    var linkMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var provider = _b.provider, idToken = _b.idToken, name = _b.name;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)("/api/me/link/".concat(provider), {
                            method: 'POST',
                            body: __assign({ idToken: idToken }, (name ? { name: name } : {})),
                        })];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
    });
    var emailLinkRequestMutation = (0, react_query_1.useMutation)({
        mutationFn: function (email) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, api_1.api)('/api/me/link/email/request', {
                        method: 'POST',
                        body: { email: email },
                    })];
            });
        }); },
    });
    var emailLinkVerifyMutation = (0, react_query_1.useMutation)({
        mutationFn: function (token) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, api_1.api)('/api/me/link/email/verify', {
                        method: 'POST',
                        body: { token: token },
                    })];
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
    });
    var phoneLinkRequestMutation = (0, react_query_1.useMutation)({
        mutationFn: function (phone) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, api_1.api)('/api/me/link/phone/request', {
                        method: 'POST',
                        body: { phoneNumber: phone },
                    })];
            });
        }); },
    });
    var phoneLinkVerifyMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var phone = _b.phone, code = _b.code;
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, api_1.api)('/api/me/link/phone/verify', {
                        method: 'POST',
                        body: { phoneNumber: phone, code: code },
                    })];
            });
        }); },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
    });
    (0, react_1.useEffect)(function () {
        function handleGoogleResponse() {
            return __awaiter(this, void 0, void 0, function () {
                var idToken, error_1;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!googleResponse || googleResponse.type !== 'success')
                                return [2 /*return*/];
                            idToken = (_d = (_b = (_a = googleResponse.params) === null || _a === void 0 ? void 0 : _a.id_token) !== null && _b !== void 0 ? _b : (_c = googleResponse.authentication) === null || _c === void 0 ? void 0 : _c.idToken) !== null && _d !== void 0 ? _d : null;
                            if (!idToken) {
                                react_native_1.Alert.alert(t('common.error'), t('settings.linkGoogleMissingToken'));
                                setLinkingProvider(null);
                                return [2 /*return*/];
                            }
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 3, 4, 5]);
                            return [4 /*yield*/, linkMutation.mutateAsync({ provider: 'google', idToken: idToken })];
                        case 2:
                            _e.sent();
                            react_native_1.Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkGoogleSuccessBody'));
                            return [3 /*break*/, 5];
                        case 3:
                            error_1 = _e.sent();
                            react_native_1.Alert.alert(t('common.error'), error_1 instanceof Error ? error_1.message : t('settings.linkFailed'));
                            return [3 /*break*/, 5];
                        case 4:
                            setLinkingProvider(null);
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void handleGoogleResponse();
    }, [googleResponse, linkMutation, t]);
    var linkedTypes = (0, react_1.useMemo)(function () { var _a, _b; return new Set(((_b = (_a = methodsQuery.data) === null || _a === void 0 ? void 0 : _a.methods) !== null && _b !== void 0 ? _b : []).map(function (method) { return method.type; })); }, [(_a = methodsQuery.data) === null || _a === void 0 ? void 0 : _a.methods]);
    (0, react_1.useEffect)(function () {
        if (linkedTypes.has('phone')) {
            setPhoneNumber('');
            setPhoneOtp('');
            setPhoneLinkRequested(false);
        }
        if (linkedTypes.has('email')) {
            setEmailInput('');
            setEmailToken('');
            setEmailLinkRequested(false);
        }
    }, [linkedTypes]);
    (0, react_1.useEffect)(function () {
        function handleIncomingEmailLink() {
            return __awaiter(this, void 0, void 0, function () {
                var queryParams, token, mode, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!incomingUrl || linkedTypes.has('email'))
                                return [2 /*return*/];
                            queryParams = Linking.parse(incomingUrl).queryParams;
                            token = typeof (queryParams === null || queryParams === void 0 ? void 0 : queryParams.token) === 'string' ? queryParams.token.trim() : '';
                            mode = typeof (queryParams === null || queryParams === void 0 ? void 0 : queryParams.mode) === 'string' ? queryParams.mode : '';
                            if (!token || mode !== 'link-email')
                                return [2 /*return*/];
                            setEmailLinkRequested(true);
                            setEmailToken(token);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, emailLinkVerifyMutation.mutateAsync(token)];
                        case 2:
                            _a.sent();
                            setEmailInput('');
                            setEmailToken('');
                            setEmailLinkRequested(false);
                            react_native_1.Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkEmailSuccessBody'));
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _a.sent();
                            react_native_1.Alert.alert(t('common.error'), error_2 instanceof Error ? error_2.message : t('settings.linkFailed'));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        }
        void handleIncomingEmailLink();
    }, [emailLinkVerifyMutation, incomingUrl, linkedTypes, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, email, requestResult, phoneNumber_1, countryMatch, nextCountryCode, nationalNumber, requestResult, methods, targetMethod, error_3;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-linked-accounts-action.json')];
                        case 1:
                            action = _e.sent();
                            if (!action)
                                return [2 /*return*/];
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 17, , 19]);
                            if (action.type === 'unlink' && methodsQuery.isLoading) {
                                return [2 /*return*/];
                            }
                            devActionAttemptedRef.current = true;
                            if (!(action.type === 'linkEmail')) return [3 /*break*/, 7];
                            email = (_a = action.email) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
                            if (!email) {
                                throw new Error('Missing email for linked accounts dev action');
                            }
                            setEmailInput(email);
                            return [4 /*yield*/, emailLinkRequestMutation.mutateAsync(email)];
                        case 3:
                            requestResult = _e.sent();
                            if (!requestResult.token) {
                                throw new Error('Email link token was not returned');
                            }
                            setEmailLinkRequested(true);
                            setEmailToken(requestResult.token);
                            return [4 /*yield*/, emailLinkVerifyMutation.mutateAsync(requestResult.token)];
                        case 4:
                            _e.sent();
                            return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                        case 5:
                            _e.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-linked-accounts-result.json', {
                                    ok: true,
                                    action: 'linkEmail',
                                    email: email,
                                    tokenLength: requestResult.token.length,
                                })];
                        case 6:
                            _e.sent();
                            return [2 /*return*/];
                        case 7:
                            if (!(action.type === 'linkPhone')) return [3 /*break*/, 12];
                            phoneNumber_1 = (_b = action.phoneNumber) === null || _b === void 0 ? void 0 : _b.trim();
                            if (!phoneNumber_1) {
                                throw new Error('Missing phoneNumber for linked accounts dev action');
                            }
                            countryMatch = phoneNumber_1.match(/^(\+\d{1,3})(\d+)$/);
                            if (!countryMatch) {
                                throw new Error("Unsupported phone number format: ".concat(phoneNumber_1));
                            }
                            nextCountryCode = countryMatch[1], nationalNumber = countryMatch[2];
                            setCountryCode(nextCountryCode);
                            setPhoneNumber(nationalNumber);
                            return [4 /*yield*/, phoneLinkRequestMutation.mutateAsync(phoneNumber_1)];
                        case 8:
                            requestResult = _e.sent();
                            if (!requestResult.code) {
                                throw new Error('Phone verification code was not returned');
                            }
                            setPhoneLinkRequested(true);
                            setPhoneOtp(requestResult.code);
                            return [4 /*yield*/, phoneLinkVerifyMutation.mutateAsync({
                                    phone: phoneNumber_1,
                                    code: requestResult.code,
                                })];
                        case 9:
                            _e.sent();
                            return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                        case 10:
                            _e.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-linked-accounts-result.json', {
                                    ok: true,
                                    action: 'linkPhone',
                                    phoneNumber: phoneNumber_1,
                                    code: requestResult.code,
                                })];
                        case 11:
                            _e.sent();
                            return [2 /*return*/];
                        case 12:
                            if (!(action.type === 'unlink')) return [3 /*break*/, 16];
                            methods = (_d = (_c = methodsQuery.data) === null || _c === void 0 ? void 0 : _c.methods) !== null && _d !== void 0 ? _d : [];
                            targetMethod = methods.find(function (method) {
                                if (action.methodType && method.type !== action.methodType) {
                                    return false;
                                }
                                if (action.identifier && method.identifier !== action.identifier) {
                                    return false;
                                }
                                return true;
                            });
                            if (!targetMethod) {
                                throw new Error('No matching auth method found to unlink');
                            }
                            return [4 /*yield*/, unlinkMutation.mutateAsync(targetMethod)];
                        case 13:
                            _e.sent();
                            return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['auth-methods'] })];
                        case 14:
                            _e.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-linked-accounts-result.json', {
                                    ok: true,
                                    action: 'unlink',
                                    methodType: targetMethod.type,
                                    identifier: targetMethod.identifier,
                                })];
                        case 15:
                            _e.sent();
                            _e.label = 16;
                        case 16: return [3 /*break*/, 19];
                        case 17:
                            error_3 = _e.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-linked-accounts-result.json', {
                                    ok: false,
                                    error: error_3 instanceof Error ? error_3.message : String(error_3),
                                })];
                        case 18:
                            _e.sent();
                            return [3 /*break*/, 19];
                        case 19: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [
        emailLinkRequestMutation,
        emailLinkVerifyMutation,
        phoneLinkRequestMutation,
        phoneLinkVerifyMutation,
        unlinkMutation,
        (_b = methodsQuery.data) === null || _b === void 0 ? void 0 : _b.methods,
        methodsQuery.isLoading,
        queryClient,
    ]);
    var availableProviders = [
        !linkedTypes.has('phone')
            ? {
                type: 'phone',
                label: t('settings.authMethodPhone'),
                hint: t('settings.linkPhoneHint'),
                disabled: false,
                disabledBadge: null,
            }
            : null,
        !linkedTypes.has('email')
            ? {
                type: 'email',
                label: t('settings.authMethodEmail'),
                hint: t('settings.linkEmailHint'),
                disabled: false,
                disabledBadge: null,
            }
            : null,
        !linkedTypes.has('google')
            ? {
                type: 'google',
                label: t('settings.authMethodGoogle'),
                hint: (0, auth_config_1.hasGoogleAuthConfig)()
                    ? t('settings.linkGoogleHint')
                    : t('settings.linkGoogleSetupHint'),
                disabled: !(0, auth_config_1.hasGoogleAuthConfig)(),
                disabledBadge: !(0, auth_config_1.hasGoogleAuthConfig)() ? t('auth.socialLoginSetup') : null,
            }
            : null,
        !linkedTypes.has('apple')
            ? {
                type: 'apple',
                label: t('settings.authMethodApple'),
                hint: react_native_1.Platform.OS === 'ios' && appleAvailable
                    ? t('settings.linkAppleHint')
                    : t('settings.linkAppleUnavailableHint'),
                disabled: react_native_1.Platform.OS !== 'ios' || !appleAvailable,
                disabledBadge: react_native_1.Platform.OS !== 'ios' || !appleAvailable ? t('auth.socialLoginIosOnly') : null,
            }
            : null,
    ].filter(Boolean);
    var normalizedSearchQuery = searchQuery.trim().toLowerCase();
    var filteredAvailableProviders = (0, react_1.useMemo)(function () {
        if (!normalizedSearchQuery) {
            return availableProviders;
        }
        return availableProviders.filter(function (provider) {
            var _a;
            return [provider.label, provider.hint, (_a = provider.disabledBadge) !== null && _a !== void 0 ? _a : '']
                .some(function (value) { return value.toLowerCase().includes(normalizedSearchQuery); });
        });
    }, [availableProviders, normalizedSearchQuery]);
    var filteredMethods = (0, react_1.useMemo)(function () {
        var _a, _b;
        var methods = (_b = (_a = methodsQuery.data) === null || _a === void 0 ? void 0 : _a.methods) !== null && _b !== void 0 ? _b : [];
        if (!normalizedSearchQuery) {
            return methods;
        }
        return methods.filter(function (method) {
            return [
                getMethodLabel(t, method.type),
                method.identifier,
                maskIdentifier(method.type, method.identifier),
            ].some(function (value) { return value.toLowerCase().includes(normalizedSearchQuery); });
        });
    }, [(_c = methodsQuery.data) === null || _c === void 0 ? void 0 : _c.methods, normalizedSearchQuery, t]);
    var selectedCountry = COUNTRY_OPTIONS.find(function (option) { return option.value === countryCode; });
    var normalizedPhoneNumber = normalizePhoneNumberInput(phoneNumber);
    var subscriberNumber = (selectedCountry === null || selectedCountry === void 0 ? void 0 : selectedCountry.stripLeadingZero) && normalizedPhoneNumber.startsWith('0')
        ? normalizedPhoneNumber.slice(1)
        : normalizedPhoneNumber;
    var fullPhoneNumber = "".concat(countryCode).concat(subscriberNumber);
    var handleUnlink = function (method) {
        var label = "".concat(getMethodLabel(t, method.type), " \u2022 ").concat(maskIdentifier(method.type, method.identifier));
        react_native_1.Alert.alert(t('settings.unlinkAccountTitle'), t('settings.unlinkAccountConfirm', { label: label }), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('settings.unlink'),
                style: 'destructive',
                onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var error_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, unlinkMutation.mutateAsync(method)];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                error_4 = _a.sent();
                                react_native_1.Alert.alert(t('common.error'), error_4 instanceof Error ? error_4.message : t('settings.unlinkFailed'));
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    };
    var handleLinkGoogle = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, error_5;
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
                    setLinkingProvider('google');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, promptGoogleAsync()];
                case 2:
                    result = _a.sent();
                    if (result.type === 'cancel' || result.type === 'dismiss') {
                        setLinkingProvider(null);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    setLinkingProvider(null);
                    react_native_1.Alert.alert(t('common.error'), error_5 instanceof Error ? error_5.message : t('settings.linkFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleRequestEmailLink = function () { return __awaiter(_this, void 0, void 0, function () {
        var normalizedEmail, result, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    normalizedEmail = emailInput.trim().toLowerCase();
                    if (!normalizedEmail) {
                        react_native_1.Alert.alert(t('common.error'), t('auth.enterEmail'));
                        return [2 /*return*/];
                    }
                    setLinkingProvider('email');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, emailLinkRequestMutation.mutateAsync(normalizedEmail)];
                case 2:
                    result = _a.sent();
                    setEmailLinkRequested(true);
                    if (__DEV__ && result.token) {
                        setEmailToken(result.token);
                        react_native_1.Alert.alert(t('settings.linkEmailDevTokenTitle'), t('settings.linkEmailDevTokenBody', { token: result.token }));
                    }
                    else {
                        react_native_1.Alert.alert(t('settings.linkEmailSentTitle'), t('settings.linkEmailSentBody'));
                    }
                    return [3 /*break*/, 5];
                case 3:
                    error_6 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_6 instanceof Error ? error_6.message : t('settings.linkFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLinkingProvider(null);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleCountryCodePress = function () {
        react_native_1.Alert.alert(t('auth.selectCountryCode'), undefined, __spreadArray(__spreadArray([], COUNTRY_OPTIONS.map(function (option) { return ({
            text: option.value === countryCode ? "".concat(option.label, " \u2713") : option.label,
            onPress: function () { return setCountryCode(option.value); },
        }); }), true), [
            { text: t('common.cancel'), style: 'cancel' },
        ], false));
    };
    var handleRequestPhoneLink = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!normalizedPhoneNumber) {
                        react_native_1.Alert.alert(t('common.error'), t('auth.enterPhoneNumber'));
                        return [2 /*return*/];
                    }
                    setLinkingProvider('phone');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, phoneLinkRequestMutation.mutateAsync(fullPhoneNumber)];
                case 2:
                    result = _a.sent();
                    setPhoneLinkRequested(true);
                    if (result.code) {
                        setPhoneOtp(result.code);
                        react_native_1.Alert.alert(t('settings.linkPhoneCodeTitle'), t('settings.linkPhoneCodeBody', { code: result.code }));
                    }
                    else {
                        react_native_1.Alert.alert(t('settings.linkPhoneSentTitle'), t('settings.linkPhoneSentBody'));
                    }
                    return [3 /*break*/, 5];
                case 3:
                    error_7 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_7 instanceof Error ? error_7.message : t('settings.linkFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLinkingProvider(null);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleVerifyPhoneLink = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (phoneOtp.trim().length !== 6) {
                        react_native_1.Alert.alert(t('common.error'), t('settings.linkPhoneCodeRequired'));
                        return [2 /*return*/];
                    }
                    setLinkingProvider('phone');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, phoneLinkVerifyMutation.mutateAsync({
                            phone: fullPhoneNumber,
                            code: phoneOtp.trim(),
                        })];
                case 2:
                    _a.sent();
                    setPhoneNumber('');
                    setPhoneOtp('');
                    setPhoneLinkRequested(false);
                    react_native_1.Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkPhoneSuccessBody'));
                    return [3 /*break*/, 5];
                case 3:
                    error_8 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_8 instanceof Error ? error_8.message : t('settings.linkFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLinkingProvider(null);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleVerifyEmailLink = function () { return __awaiter(_this, void 0, void 0, function () {
        var token, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = emailToken.trim();
                    if (!token) {
                        react_native_1.Alert.alert(t('common.error'), t('settings.linkEmailTokenRequired'));
                        return [2 /*return*/];
                    }
                    setLinkingProvider('email');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, emailLinkVerifyMutation.mutateAsync(token)];
                case 2:
                    _a.sent();
                    setEmailInput('');
                    setEmailToken('');
                    setEmailLinkRequested(false);
                    react_native_1.Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkEmailSuccessBody'));
                    return [3 /*break*/, 5];
                case 3:
                    error_9 = _a.sent();
                    react_native_1.Alert.alert(t('common.error'), error_9 instanceof Error ? error_9.message : t('settings.linkFailed'));
                    return [3 /*break*/, 5];
                case 4:
                    setLinkingProvider(null);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleLinkApple = function () { return __awaiter(_this, void 0, void 0, function () {
        var credential, fullName, error_10;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (react_native_1.Platform.OS !== 'ios' || !appleAvailable) {
                        react_native_1.Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.appleUnavailable'));
                        return [2 /*return*/];
                    }
                    setLinkingProvider('apple');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, 5, 6]);
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
                    return [4 /*yield*/, linkMutation.mutateAsync(__assign({ provider: 'apple', idToken: credential.identityToken }, (fullName ? { name: fullName } : {})))];
                case 3:
                    _c.sent();
                    react_native_1.Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkAppleSuccessBody'));
                    return [3 /*break*/, 6];
                case 4:
                    error_10 = _c.sent();
                    if (typeof error_10 === 'object' &&
                        error_10 !== null &&
                        'code' in error_10 &&
                        error_10.code === 'ERR_REQUEST_CANCELED') {
                        setLinkingProvider(null);
                        return [2 /*return*/];
                    }
                    react_native_1.Alert.alert(t('common.error'), error_10 instanceof Error ? error_10.message : t('settings.linkFailed'));
                    return [3 /*break*/, 6];
                case 5:
                    setLinkingProvider(null);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <react_native_1.View style={styles.container}>
        <react_native_1.Text style={styles.hint}>{t('settings.linkedAccountsHint')}</react_native_1.Text>

        {methodsQuery.isLoading ? (<react_native_1.View style={styles.centerState}>
            <react_native_1.ActivityIndicator color={theme_1.colors.primary}/>
            <react_native_1.Text style={styles.stateText}>{t('settings.linkedAccountsLoading')}</react_native_1.Text>
          </react_native_1.View>) : methodsQuery.isError ? (<react_native_1.View style={styles.centerState}>
            <react_native_1.Text style={styles.stateText}>{t('common.errorOccurred')}</react_native_1.Text>
          </react_native_1.View>) : (<react_native_1.FlatList data={filteredMethods} keyExtractor={function (item) { return item.id; }} contentContainerStyle={styles.listContent} ListHeaderComponent={<react_native_1.View style={styles.section}>
                <react_native_1.TextInput style={styles.searchInput} placeholder={t('settings.linkedAccountsSearchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
                {filteredAvailableProviders.length > 0 ? (<>
                    <react_native_1.Text style={styles.sectionTitle}>{t('settings.linkAccountTitle')}</react_native_1.Text>
                    {filteredAvailableProviders.map(function (provider) {
                        var isBusy = linkingProvider === provider.type;
                        if (provider.type === 'phone') {
                            return (<react_native_1.View key={provider.type} style={styles.linkCardStack}>
                            <react_native_1.View style={styles.linkCardHeader}>
                              <react_native_1.View style={styles.linkCardBody}>
                                <react_native_1.Text style={styles.methodLabel}>{provider.label}</react_native_1.Text>
                                <react_native_1.Text style={styles.linkHint}>{provider.hint}</react_native_1.Text>
                              </react_native_1.View>
                            </react_native_1.View>
                            <react_native_1.View style={styles.phoneRow}>
                              <react_native_1.TouchableOpacity style={styles.countryCodeButton} onPress={handleCountryCodePress} disabled={isBusy || phoneLinkRequestMutation.isPending}>
                                <react_native_1.Text style={styles.countryCodeText}>{countryCode}</react_native_1.Text>
                              </react_native_1.TouchableOpacity>
                              <react_native_1.TextInput style={[styles.emailInput, styles.phoneInput]} placeholder={t('auth.phonePlaceholder')} placeholderTextColor={theme_1.colors.textMuted} keyboardType="phone-pad" autoComplete="tel" value={phoneNumber} onChangeText={function (value) { return setPhoneNumber(normalizePhoneNumberInput(value)); }} editable={!isBusy && !phoneLinkRequestMutation.isPending}/>
                            </react_native_1.View>
                            <react_native_1.TouchableOpacity style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]} onPress={handleRequestPhoneLink} disabled={isBusy || phoneLinkRequestMutation.isPending}>
                              <react_native_1.Text style={styles.inlineButtonText}>
                                {t('settings.linkPhoneSendButton')}
                              </react_native_1.Text>
                            </react_native_1.TouchableOpacity>
                            {phoneLinkRequested ? (<>
                                <react_native_1.TextInput style={styles.emailInput} placeholder={t('auth.verificationCode')} placeholderTextColor={theme_1.colors.textMuted} keyboardType="number-pad" value={phoneOtp} onChangeText={function (value) { return setPhoneOtp(value.replace(/\D/g, '').slice(0, 6)); }} editable={!isBusy && !phoneLinkVerifyMutation.isPending}/>
                                <react_native_1.TouchableOpacity style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]} onPress={handleVerifyPhoneLink} disabled={isBusy || phoneLinkVerifyMutation.isPending}>
                                  <react_native_1.Text style={styles.inlineButtonText}>
                                    {t('settings.linkPhoneVerifyButton')}
                                  </react_native_1.Text>
                                </react_native_1.TouchableOpacity>
                              </>) : null}
                          </react_native_1.View>);
                        }
                        if (provider.type === 'email') {
                            return (<react_native_1.View key={provider.type} style={styles.linkCardStack}>
                            <react_native_1.View style={styles.linkCardHeader}>
                              <react_native_1.View style={styles.linkCardBody}>
                                <react_native_1.Text style={styles.methodLabel}>{provider.label}</react_native_1.Text>
                                <react_native_1.Text style={styles.linkHint}>{provider.hint}</react_native_1.Text>
                              </react_native_1.View>
                            </react_native_1.View>
                            <react_native_1.TextInput style={styles.emailInput} placeholder={t('auth.emailPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" value={emailInput} onChangeText={setEmailInput} editable={!isBusy && !emailLinkRequestMutation.isPending}/>
                            <react_native_1.TouchableOpacity style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]} onPress={handleRequestEmailLink} disabled={isBusy || emailLinkRequestMutation.isPending}>
                              <react_native_1.Text style={styles.inlineButtonText}>
                                {t('settings.linkEmailSendButton')}
                              </react_native_1.Text>
                            </react_native_1.TouchableOpacity>
                            {emailLinkRequested ? (<>
                                <react_native_1.TextInput style={styles.emailInput} placeholder={t('settings.linkEmailTokenPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} autoCapitalize="none" autoCorrect={false} value={emailToken} onChangeText={setEmailToken} editable={!isBusy && !emailLinkVerifyMutation.isPending}/>
                                <react_native_1.TouchableOpacity style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]} onPress={handleVerifyEmailLink} disabled={isBusy || emailLinkVerifyMutation.isPending}>
                                  <react_native_1.Text style={styles.inlineButtonText}>
                                    {t('settings.linkEmailVerifyButton')}
                                  </react_native_1.Text>
                                </react_native_1.TouchableOpacity>
                              </>) : null}
                          </react_native_1.View>);
                        }
                        return (<react_native_1.TouchableOpacity key={provider.type} style={[
                                styles.linkCard,
                                provider.disabled && styles.linkCardDisabled,
                                isBusy && styles.unlinkButtonDisabled,
                            ]} onPress={provider.type === 'google' ? handleLinkGoogle : handleLinkApple} disabled={isBusy || linkMutation.isPending}>
                          <react_native_1.View style={styles.linkCardBody}>
                            <react_native_1.Text style={styles.methodLabel}>{provider.label}</react_native_1.Text>
                            <react_native_1.Text style={styles.linkHint}>{provider.hint}</react_native_1.Text>
                          </react_native_1.View>
                          {isBusy ? (<react_native_1.ActivityIndicator color={theme_1.colors.primary}/>) : provider.disabledBadge ? (<react_native_1.View style={styles.linkBadge}>
                              <react_native_1.Text style={styles.linkBadgeText}>{provider.disabledBadge}</react_native_1.Text>
                            </react_native_1.View>) : (<react_native_1.Text style={styles.linkAction}>{t('settings.link')}</react_native_1.Text>)}
                        </react_native_1.TouchableOpacity>);
                    })}
                  </>) : !normalizedSearchQuery && availableProviders.length === 0 ? (<react_native_1.View style={styles.allSetCard}>
                    <react_native_1.Text style={styles.methodLabel}>{t('settings.linkedAccountsAllSetTitle')}</react_native_1.Text>
                    <react_native_1.Text style={styles.linkHint}>{t('settings.linkedAccountsAllSetBody')}</react_native_1.Text>
                  </react_native_1.View>) : null}
              </react_native_1.View>} ListHeaderComponentStyle={styles.listHeader} ListEmptyComponent={<react_native_1.View style={styles.centerState}>
                <react_native_1.Text style={styles.stateText}>
                  {normalizedSearchQuery
                    ? t('settings.linkedAccountsNoSearchResults')
                    : t('settings.linkedAccountsEmpty')}
                </react_native_1.Text>
                {normalizedSearchQuery ? (<react_native_1.Text style={styles.helperText}>{t('settings.linkedAccountsNoSearchResultsBody')}</react_native_1.Text>) : null}
              </react_native_1.View>} renderItem={function (_a) {
                var _b, _c, _d;
                var item = _a.item;
                var methodCount = (_c = (_b = methodsQuery.data) === null || _b === void 0 ? void 0 : _b.methods.length) !== null && _c !== void 0 ? _c : 0;
                var canUnlink = methodCount > 1;
                var isBusy = unlinkMutation.isPending && ((_d = unlinkMutation.variables) === null || _d === void 0 ? void 0 : _d.id) === item.id;
                return (<react_native_1.View style={styles.card}>
                  <react_native_1.View style={styles.cardHeader}>
                    <react_native_1.Text style={styles.methodLabel}>{getMethodLabel(t, item.type)}</react_native_1.Text>
                    <react_native_1.Text style={styles.verifiedBadge}>{t('settings.authMethodVerified')}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.identifier}>{maskIdentifier(item.type, item.identifier)}</react_native_1.Text>
                  {!canUnlink && (<react_native_1.Text style={styles.helperText}>{t('settings.unlinkOnlyMethodHint')}</react_native_1.Text>)}
                  <react_native_1.TouchableOpacity style={[
                        styles.unlinkButton,
                        (!canUnlink || isBusy) && styles.unlinkButtonDisabled,
                        !canUnlink && styles.unlinkButtonBlocked,
                    ]} onPress={function () { return handleUnlink(item); }} disabled={!canUnlink || isBusy}>
                    <react_native_1.Text style={[
                        styles.unlinkButtonText,
                        !canUnlink && styles.unlinkButtonTextDisabled,
                    ]}>
                      {t('settings.unlink')}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>);
            }}/>)}
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    container: {
        flex: 1,
        padding: theme_1.spacing.lg,
    },
    hint: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
        marginBottom: theme_1.spacing.lg,
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: theme_1.spacing.md,
    },
    stateText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xl,
        textAlign: 'center',
    },
    listContent: {
        gap: theme_1.spacing.md,
    },
    listHeader: {
        marginBottom: theme_1.spacing.md,
    },
    section: {
        gap: theme_1.spacing.md,
    },
    searchInput: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    sectionTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    card: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme_1.colors.border,
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    cardHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    methodLabel: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
    },
    verifiedBadge: {
        color: theme_1.colors.success,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    identifier: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.lg,
    },
    helperText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        lineHeight: 18,
    },
    linkCard: {
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme_1.spacing.md,
        justifyContent: 'space-between',
        padding: theme_1.spacing.lg,
    },
    linkCardStack: {
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        gap: theme_1.spacing.md,
        padding: theme_1.spacing.lg,
    },
    linkCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    allSetCard: {
        backgroundColor: theme_1.colors.surface,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 1,
        gap: theme_1.spacing.sm,
        padding: theme_1.spacing.lg,
    },
    phoneRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
    },
    countryCodeButton: {
        alignItems: 'center',
        backgroundColor: theme_1.colors.backgroundDark,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        justifyContent: 'center',
        minWidth: 72,
        paddingHorizontal: theme_1.spacing.lg,
    },
    countryCodeText: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    linkCardDisabled: {
        opacity: 0.8,
    },
    linkCardBody: {
        flex: 1,
        gap: theme_1.spacing.xs,
    },
    emailInput: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderColor: theme_1.colors.border,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    phoneInput: {
        flex: 1,
    },
    inlineButton: {
        alignItems: 'center',
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.md,
        paddingVertical: theme_1.spacing.md,
    },
    inlineButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    linkHint: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        lineHeight: 18,
    },
    linkAction: {
        color: theme_1.colors.primary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    linkBadge: {
        backgroundColor: theme_1.colors.backgroundDark,
        borderRadius: theme_1.borderRadius.full,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.xs,
    },
    linkBadgeText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    unlinkButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderColor: theme_1.colors.error,
        borderRadius: theme_1.borderRadius.md,
        borderWidth: 1,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    unlinkButtonDisabled: {
        opacity: 0.6,
    },
    unlinkButtonBlocked: {
        borderColor: theme_1.colors.border,
    },
    unlinkButtonText: {
        color: theme_1.colors.error,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    unlinkButtonTextDisabled: {
        color: theme_1.colors.textMuted,
    },
});
