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
exports.registerForPushNotifications = registerForPushNotifications;
exports.unregisterPushToken = unregisterPushToken;
exports.parseNotificationData = parseNotificationData;
exports.addNotificationResponseListener = addNotificationResponseListener;
exports.addNotificationReceivedListener = addNotificationReceivedListener;
exports.getInitialNotification = getInitialNotification;
var Notifications = require("expo-notifications");
var Device = require("expo-device");
var expo_constants_1 = require("expo-constants");
var react_native_1 = require("react-native");
var api_1 = require("./api");
// ---------------------------------------------------------------------------
// Push Notification setup using expo-notifications
// ---------------------------------------------------------------------------
// Note: Notification handler is configured in App.tsx to avoid duplicate registration.
/**
 * Request push notification permissions and get the push token.
 * Registers the token with the server.
 */
function registerForPushNotifications() {
    return __awaiter(this, void 0, void 0, function () {
        var existingStatus, finalStatus, status_1, projectId, tokenData, _a, token, error_1;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    // Push notifications only work on physical devices
                    if (!Device.isDevice) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, Notifications.getPermissionsAsync()];
                case 1:
                    existingStatus = (_g.sent()).status;
                    finalStatus = existingStatus;
                    if (!(existingStatus !== 'granted')) return [3 /*break*/, 3];
                    return [4 /*yield*/, Notifications.requestPermissionsAsync()];
                case 2:
                    status_1 = (_g.sent()).status;
                    finalStatus = status_1;
                    _g.label = 3;
                case 3:
                    if (finalStatus !== 'granted') {
                        console.warn('[Notifications] Permission not granted');
                        return [2 /*return*/, null];
                    }
                    if (!(react_native_1.Platform.OS === 'android')) return [3 /*break*/, 6];
                    return [4 /*yield*/, Notifications.setNotificationChannelAsync('default', {
                            name: 'Default',
                            importance: Notifications.AndroidImportance.MAX,
                            vibrationPattern: [0, 250, 250, 250],
                            lightColor: '#6366f1',
                        })];
                case 4:
                    _g.sent();
                    return [4 /*yield*/, Notifications.setNotificationChannelAsync('messages', {
                            name: 'Messages',
                            importance: Notifications.AndroidImportance.HIGH,
                            vibrationPattern: [0, 250],
                            lightColor: '#6366f1',
                        })];
                case 5:
                    _g.sent();
                    _g.label = 6;
                case 6:
                    _g.trys.push([6, 12, , 13]);
                    projectId = (_c = (_b = expo_constants_1.default.easConfig) === null || _b === void 0 ? void 0 : _b.projectId) !== null && _c !== void 0 ? _c : (_f = (_e = (_d = expo_constants_1.default.expoConfig) === null || _d === void 0 ? void 0 : _d.extra) === null || _e === void 0 ? void 0 : _e.eas) === null || _f === void 0 ? void 0 : _f.projectId;
                    if (!projectId) return [3 /*break*/, 8];
                    return [4 /*yield*/, Notifications.getExpoPushTokenAsync({ projectId: projectId })];
                case 7:
                    _a = _g.sent();
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, Notifications.getExpoPushTokenAsync()];
                case 9:
                    _a = _g.sent();
                    _g.label = 10;
                case 10:
                    tokenData = _a;
                    token = tokenData.data;
                    // Register token with our server
                    return [4 /*yield*/, registerTokenWithServer(token, react_native_1.Platform.OS)];
                case 11:
                    // Register token with our server
                    _g.sent();
                    return [2 /*return*/, token];
                case 12:
                    error_1 = _g.sent();
                    console.error('[Notifications] Failed to get push token:', error_1);
                    return [2 /*return*/, null];
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Register the push token with the API server.
 */
function registerTokenWithServer(token, platform) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, api_1.api)('/api/me/push-token', {
                            method: 'POST',
                            body: { token: token, platform: platform },
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('[Notifications] Failed to register push token:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Remove push token from server (call on logout).
 */
function unregisterPushToken() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, api_1.api)('/api/me/push-token', {
                            method: 'DELETE',
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    if (error_3 instanceof api_1.ApiError && (error_3.status === 401 || error_3.code === 'UNAUTHORIZED')) {
                        return [2 /*return*/];
                    }
                    console.error('[Notifications] Failed to unregister push token:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Parse notification data to determine navigation target.
 * Returns navigation params for the app router.
 */
function parseNotificationData(notification) {
    var _a, _b, _c, _d;
    var data = notification.request.content.data;
    if (!data)
        return { screen: null, params: {} };
    if (data.channelId && data.communityId) {
        return {
            screen: 'Channel',
            params: {
                communityId: data.communityId,
                channelId: data.channelId,
                channelName: (_a = data.channelName) !== null && _a !== void 0 ? _a : 'channel',
            },
        };
    }
    if (data.dmUserId) {
        return {
            screen: 'Dm',
            params: {
                userId: data.dmUserId,
                displayName: (_b = data.displayName) !== null && _b !== void 0 ? _b : 'User',
            },
        };
    }
    if (data.conversationId) {
        return {
            screen: 'Dm',
            params: {
                conversationId: data.conversationId,
                userId: (_c = data.userId) !== null && _c !== void 0 ? _c : '',
                displayName: (_d = data.displayName) !== null && _d !== void 0 ? _d : 'User',
            },
        };
    }
    return { screen: null, params: {} };
}
/**
 * Add a listener for notification taps (when user taps on a notification).
 * Returns a cleanup function.
 */
function addNotificationResponseListener(handler) {
    var subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return function () { return subscription.remove(); };
}
/**
 * Add a listener for notifications received while app is in foreground.
 * Returns a cleanup function.
 */
function addNotificationReceivedListener(handler) {
    var subscription = Notifications.addNotificationReceivedListener(handler);
    return function () { return subscription.remove(); };
}
/**
 * Get the notification that launched the app (if any).
 */
function getInitialNotification() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Notifications.getLastNotificationResponseAsync()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
