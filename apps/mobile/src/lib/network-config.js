"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVEKIT_URL = exports.WS_ORIGIN = exports.WEB_ORIGIN = exports.API_ORIGIN = void 0;
var expo_constants_1 = require("expo-constants");
var Device = require("expo-device");
var react_native_1 = require("react-native");
var DEV_API_PORT = '4000';
var DEV_WEB_PORT = '3000';
var DEV_LIVEKIT_PORT = '7880';
function normalizeApiOrigin(value) {
    if (!value || typeof value !== 'string')
        return null;
    var trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed)
        return null;
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}
function extractHostname(value) {
    var _a;
    if (!value)
        return null;
    try {
        if (/^[a-z]+:\/\//i.test(value)) {
            return new URL(value).hostname;
        }
    }
    catch (_b) {
        // Fall through to the string parser below.
    }
    var normalized = value.replace(/^[a-z]+:\/\//i, '');
    var host = (_a = normalized.split('/')[0]) === null || _a === void 0 ? void 0 : _a.split(':')[0];
    return host || null;
}
function getDevHost() {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!Device.isDevice) {
        return react_native_1.Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    }
    var expoHost = (_b = extractHostname((_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.hostUri)) !== null && _b !== void 0 ? _b : extractHostname((_e = (_d = (_c = expo_constants_1.default.manifest2) === null || _c === void 0 ? void 0 : _c.extra) === null || _d === void 0 ? void 0 : _d.expoClient) === null || _e === void 0 ? void 0 : _e.hostUri);
    var sourceHost = extractHostname((_f = react_native_1.NativeModules.SourceCode) === null || _f === void 0 ? void 0 : _f.scriptURL);
    return ((_g = expoHost !== null && expoHost !== void 0 ? expoHost : sourceHost) !== null && _g !== void 0 ? _g : (react_native_1.Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1'));
}
var configuredApiOrigin = normalizeApiOrigin((_d = (_a = process.env.EXPO_PUBLIC_API_URL) !== null && _a !== void 0 ? _a : (_c = (_b = expo_constants_1.default.expoConfig) === null || _b === void 0 ? void 0 : _b.extra) === null || _c === void 0 ? void 0 : _c.apiUrl) !== null && _d !== void 0 ? _d : null);
var configuredWebOrigin = normalizeApiOrigin((_h = (_e = process.env.EXPO_PUBLIC_WEB_URL) !== null && _e !== void 0 ? _e : (_g = (_f = expo_constants_1.default.expoConfig) === null || _f === void 0 ? void 0 : _f.extra) === null || _g === void 0 ? void 0 : _g.webUrl) !== null && _h !== void 0 ? _h : null);
var configuredLivekitUrl = (_m = (_j = process.env.EXPO_PUBLIC_LIVEKIT_URL) !== null && _j !== void 0 ? _j : (_l = (_k = expo_constants_1.default.expoConfig) === null || _k === void 0 ? void 0 : _k.extra) === null || _l === void 0 ? void 0 : _l.livekitUrl) !== null && _m !== void 0 ? _m : null;
var fallbackApiOrigin = "http://".concat(getDevHost(), ":").concat(DEV_API_PORT);
var fallbackWebOrigin = "http://".concat(getDevHost(), ":").concat(DEV_WEB_PORT);
var fallbackLivekitUrl = "ws://".concat(getDevHost(), ":").concat(DEV_LIVEKIT_PORT);
exports.API_ORIGIN = configuredApiOrigin !== null && configuredApiOrigin !== void 0 ? configuredApiOrigin : (!Device.isDevice ? fallbackApiOrigin : __DEV__ ? fallbackApiOrigin : '');
exports.WEB_ORIGIN = configuredWebOrigin !== null && configuredWebOrigin !== void 0 ? configuredWebOrigin : (function () {
    if (exports.API_ORIGIN) {
        try {
            var url = new URL(exports.API_ORIGIN);
            if (url.port === DEV_API_PORT) {
                url.port = DEV_WEB_PORT;
            }
            return url.toString().replace(/\/+$/, '');
        }
        catch (_a) {
            return !Device.isDevice ? fallbackWebOrigin : __DEV__ ? fallbackWebOrigin : '';
        }
    }
    return !Device.isDevice ? fallbackWebOrigin : __DEV__ ? fallbackWebOrigin : '';
})();
exports.WS_ORIGIN = exports.API_ORIGIN ? exports.API_ORIGIN.replace(/^http/i, 'ws') : '';
exports.LIVEKIT_URL = (configuredLivekitUrl === null || configuredLivekitUrl === void 0 ? void 0 : configuredLivekitUrl.trim()) ||
    (!Device.isDevice ? fallbackLivekitUrl : __DEV__ ? fallbackLivekitUrl : '');
