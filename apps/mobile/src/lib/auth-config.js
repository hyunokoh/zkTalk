"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_AUTH_REQUEST_CONFIG = exports.GOOGLE_AUTH_CONFIG = void 0;
exports.hasGoogleAuthConfig = hasGoogleAuthConfig;
var expo_constants_1 = require("expo-constants");
var react_native_1 = require("react-native");
function normalizeConfigValue(value) {
    if (typeof value !== 'string')
        return undefined;
    var trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
var extra = ((_b = (_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.extra) !== null && _b !== void 0 ? _b : {});
exports.GOOGLE_AUTH_CONFIG = {
    iosClientId: normalizeConfigValue(extra.googleIosClientId),
    androidClientId: normalizeConfigValue(extra.googleAndroidClientId),
    webClientId: normalizeConfigValue(extra.googleWebClientId),
};
// expo-auth-session requires a platform client ID at hook creation time.
// Keep the real config separate so the UI can still disable Google login
// without crashing when env values are intentionally unset in development.
exports.GOOGLE_AUTH_REQUEST_CONFIG = {
    iosClientId: (_c = exports.GOOGLE_AUTH_CONFIG.iosClientId) !== null && _c !== void 0 ? _c : 'disabled-ios-client-id',
    androidClientId: (_d = exports.GOOGLE_AUTH_CONFIG.androidClientId) !== null && _d !== void 0 ? _d : 'disabled-android-client-id',
    webClientId: (_e = exports.GOOGLE_AUTH_CONFIG.webClientId) !== null && _e !== void 0 ? _e : 'disabled-web-client-id',
};
function hasGoogleAuthConfig() {
    if (react_native_1.Platform.OS === 'ios') {
        return Boolean(exports.GOOGLE_AUTH_CONFIG.iosClientId);
    }
    if (react_native_1.Platform.OS === 'android') {
        return Boolean(exports.GOOGLE_AUTH_CONFIG.androidClientId);
    }
    return Boolean(exports.GOOGLE_AUTH_CONFIG.webClientId);
}
