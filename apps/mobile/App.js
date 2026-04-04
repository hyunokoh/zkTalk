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
exports.default = App;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var native_1 = require("@react-navigation/native");
var native_stack_1 = require("@react-navigation/native-stack");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_constants_1 = require("expo-constants");
var Notifications = require("expo-notifications");
var Linking = require("expo-linking");
var LoginScreen_1 = require("./src/screens/LoginScreen");
var navigation_1 = require("./src/navigation");
var i18n_1 = require("./src/lib/i18n");
var auth_1 = require("./src/stores/auth");
var useWebSocket_1 = require("./src/hooks/useWebSocket");
var offline_queue_1 = require("./src/lib/offline-queue");
var notifications_1 = require("./src/lib/notifications");
var websocket_1 = require("./src/lib/websocket");
var theme_1 = require("./src/theme");
var ErrorBoundary_1 = require("./src/components/ErrorBoundary");
var NetworkBar_1 = require("./src/components/NetworkBar");
var storage_1 = require("./src/lib/storage");
var network_config_1 = require("./src/lib/network-config");
var simulator_harness_1 = require("./src/lib/simulator-harness");
var Stack = (0, native_stack_1.createNativeStackNavigator)();
var queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 30000,
        },
    },
});
// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                })];
        });
    }); },
});
// Deep linking configuration
var linking = {
    prefixes: [Linking.createURL('/'), 'zktalk://'],
    config: {
        screens: {
            Main: {
                screens: {
                    HomeTab: {
                        screens: {
                            ChannelScreen: {
                                path: 'channel/:channelId',
                                parse: {
                                    channelId: function (channelId) { return channelId; },
                                },
                            },
                        },
                    },
                    DmTab: {
                        screens: {
                            DmScreen: {
                                path: 'dm/:conversationId',
                                parse: {
                                    conversationId: function (conversationId) { return conversationId; },
                                },
                            },
                        },
                    },
                    SettingsTab: {
                        screens: {
                            QrScan: 'qr-scan',
                            MyQr: 'my-qr',
                            Backup: 'backup',
                        },
                    },
                },
            },
        },
    },
};
function App() {
    var t = (0, i18n_1.useTranslation)().t;
    var user = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var isLoading = (0, auth_1.useAuthStore)(function (s) { return s.isLoading; });
    var loginWithSessionToken = (0, auth_1.useAuthStore)(function (s) { return s.loginWithSessionToken; });
    var navigationRef = (0, react_1.useRef)(null);
    var previousUserIdRef = (0, react_1.useRef)(null);
    var previousNavigationUserIdRef = (0, react_1.useRef)(null);
    var autoLoginInFlightRef = (0, react_1.useRef)(false);
    var devRouteInFlightRef = (0, react_1.useRef)(false);
    var _a = react_1.default.useState(false), isNavigationReady = _a[0], setNavigationReady = _a[1];
    // Connect WebSocket when authenticated
    (0, useWebSocket_1.useWebSocketConnection)();
    (0, react_1.useEffect)(function () {
        auth_1.useAuthStore.getState().fetchUser();
    }, []);
    (0, react_1.useEffect)(function () {
        var subscription = react_native_1.AppState.addEventListener('change', function (nextState) {
            if (nextState === 'active') {
                void auth_1.useAuthStore.getState().fetchUser();
            }
        });
        return function () {
            subscription.remove();
        };
    }, []);
    (0, react_1.useEffect)(function () {
        if (isLoading || !simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        var cancelled = false;
        function tryAutoLogin() {
            return __awaiter(this, void 0, void 0, function () {
                var configuredToken, fileToken, token, storedToken;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (cancelled || autoLoginInFlightRef.current) {
                                return [2 /*return*/];
                            }
                            autoLoginInFlightRef.current = true;
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, , 7, 8]);
                            configuredToken = ((_a = process.env.EXPO_PUBLIC_DEV_SESSION_TOKEN) !== null && _a !== void 0 ? _a : (typeof ((_c = (_b = expo_constants_1.default.expoConfig) === null || _b === void 0 ? void 0 : _b.extra) === null || _c === void 0 ? void 0 : _c.devSessionToken) === 'string'
                                ? expo_constants_1.default.expoConfig.extra.devSessionToken
                                : '')).trim();
                            return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessFile)('dev-session-token.txt')];
                        case 2:
                            fileToken = (_d.sent()).trim();
                            token = configuredToken || fileToken;
                            if (!token) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, (0, storage_1.getToken)()];
                        case 3:
                            storedToken = _d.sent();
                            if (storedToken === token && user) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('auto-login-marker.txt', {
                                    apiOrigin: network_config_1.API_ORIGIN,
                                    configuredTokenLength: configuredToken.length,
                                    fileTokenLength: fileToken.length,
                                    hasToken: Boolean(token),
                                    replacingSession: Boolean(storedToken && storedToken !== token),
                                })];
                        case 4:
                            _d.sent();
                            return [4 /*yield*/, loginWithSessionToken(token)];
                        case 5:
                            _d.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('auto-login-marker.txt', {
                                    apiOrigin: network_config_1.API_ORIGIN,
                                    configuredTokenLength: configuredToken.length,
                                    fileTokenLength: fileToken.length,
                                    hasToken: Boolean(token),
                                    loggedIn: true,
                                })];
                        case 6:
                            _d.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            autoLoginInFlightRef.current = false;
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        }
        tryAutoLogin().catch(function (err) {
            void (0, simulator_harness_1.writeSimulatorHarnessJson)('auto-login-marker.txt', {
                apiOrigin: network_config_1.API_ORIGIN,
                error: err instanceof Error ? err.message : String(err),
            });
            console.warn('[App] Failed to auto-login simulator session:', err);
        });
        var interval = setInterval(function () {
            void tryAutoLogin();
        }, 1000);
        return function () {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isLoading, loginWithSessionToken, user]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!isNavigationReady || !navigationRef.current) {
            return;
        }
        var nextUserId = (_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : null;
        if (previousNavigationUserIdRef.current === nextUserId) {
            return;
        }
        previousNavigationUserIdRef.current = nextUserId;
        // Clear user-scoped cache and reset navigation so a new login never lands
        // on a stale channel/DM route from a different account.
        queryClient.clear();
        if (nextUserId) {
            navigationRef.current.resetRoot({
                index: 0,
                routes: [
                    {
                        name: 'Main',
                        params: {
                            screen: 'HomeTab',
                            params: {
                                screen: 'HomeScreen',
                            },
                        },
                    },
                ],
            });
            return;
        }
        navigationRef.current.resetRoot({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }, [isNavigationReady, user === null || user === void 0 ? void 0 : user.id]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || isLoading || !user)
            return;
        if (!isNavigationReady || !navigationRef.current)
            return;
        var cancelled = false;
        function tryDevRoute() {
            return __awaiter(this, void 0, void 0, function () {
                var routeData, writeMarker;
                var _this = this;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14;
                return __generator(this, function (_15) {
                    switch (_15.label) {
                        case 0:
                            if (cancelled || devRouteInFlightRef.current) {
                                return [2 /*return*/];
                            }
                            devRouteInFlightRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-route.json')];
                        case 1:
                            routeData = _15.sent();
                            if (!routeData || cancelled) {
                                devRouteInFlightRef.current = false;
                                return [2 /*return*/];
                            }
                            _15.label = 2;
                        case 2:
                            _15.trys.push([2, , 79, 81]);
                            writeMarker = function (data) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-route-result.json', data, true)];
                            }); }); };
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'home')) return [3 /*break*/, 4];
                            return [4 /*yield*/, writeMarker({ matched: 'home', routeData: routeData })];
                        case 3:
                            _15.sent();
                            (_a = navigationRef.current) === null || _a === void 0 ? void 0 : _a.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'HomeScreen',
                                    ...(routeData.communityId
                                        ? {
                                            params: {
                                                selectedCommunityId: routeData.communityId,
                                            },
                                        }
                                        : {}),
                                },
                            });
                            return [3 /*break*/, 78];
                        case 4:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'createChannel' && routeData.communityId)) return [3 /*break*/, 6];
                            return [4 /*yield*/, writeMarker({ matched: 'createChannel', routeData: routeData })];
                        case 5:
                            _15.sent();
                            (_b = navigationRef.current) === null || _b === void 0 ? void 0 : _b.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CreateChannel',
                                    params: {
                                        communityId: routeData.communityId,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 6:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'manageChannels' && routeData.communityId)) return [3 /*break*/, 8];
                            return [4 /*yield*/, writeMarker({ matched: 'manageChannels', routeData: routeData })];
                        case 7:
                            _15.sent();
                            (_c = navigationRef.current) === null || _c === void 0 ? void 0 : _c.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ManageChannels',
                                    params: {
                                        communityId: routeData.communityId,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 8:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'manageCategories' && routeData.communityId)) return [3 /*break*/, 10];
                            return [4 /*yield*/, writeMarker({ matched: 'manageCategories', routeData: routeData })];
                        case 9:
                            _15.sent();
                            (_d = navigationRef.current) === null || _d === void 0 ? void 0 : _d.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ManageCategories',
                                    params: {
                                        communityId: routeData.communityId,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 10:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'communityMembers' && routeData.communityId)) return [3 /*break*/, 12];
                            return [4 /*yield*/, writeMarker({ matched: 'communityMembers', routeData: routeData })];
                        case 11:
                            _15.sent();
                            (_e = navigationRef.current) === null || _e === void 0 ? void 0 : _e.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CommunityMembers',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 12:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'communityEvents' && routeData.communityId)) return [3 /*break*/, 14];
                            return [4 /*yield*/, writeMarker({ matched: 'communityEvents', routeData: routeData })];
                        case 13:
                            _15.sent();
                            (_f = navigationRef.current) === null || _f === void 0 ? void 0 : _f.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CommunityEvents',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 14:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'editCommunityEvent' && routeData.communityId)) return [3 /*break*/, 16];
                            return [4 /*yield*/, writeMarker({ matched: 'editCommunityEvent', routeData: routeData })];
                        case 15:
                            _15.sent();
                            (_g = navigationRef.current) === null || _g === void 0 ? void 0 : _g.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'EditCommunityEvent',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                        eventId: routeData.eventId,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 16:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'communityReports' && routeData.communityId)) return [3 /*break*/, 18];
                            return [4 /*yield*/, writeMarker({ matched: 'communityReports', routeData: routeData })];
                        case 17:
                            _15.sent();
                            (_h = navigationRef.current) === null || _h === void 0 ? void 0 : _h.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CommunityReports',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 18:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'communityAuditLog' && routeData.communityId)) return [3 /*break*/, 20];
                            return [4 /*yield*/, writeMarker({ matched: 'communityAuditLog', routeData: routeData })];
                        case 19:
                            _15.sent();
                            (_j = navigationRef.current) === null || _j === void 0 ? void 0 : _j.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CommunityAuditLog',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 20:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'communityOnboarding' && routeData.communityId)) return [3 /*break*/, 22];
                            return [4 /*yield*/, writeMarker({ matched: 'communityOnboarding', routeData: routeData })];
                        case 21:
                            _15.sent();
                            (_k = navigationRef.current) === null || _k === void 0 ? void 0 : _k.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CommunityOnboarding',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 22:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'editCommunity' && routeData.communityId)) return [3 /*break*/, 24];
                            return [4 /*yield*/, writeMarker({ matched: 'editCommunity', routeData: routeData })];
                        case 23:
                            _15.sent();
                            (_l = navigationRef.current) === null || _l === void 0 ? void 0 : _l.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'EditCommunity',
                                    params: {
                                        communityId: routeData.communityId,
                                        communityName: routeData.communityName,
                                        iconUrl: (_m = routeData.iconUrl) !== null && _m !== void 0 ? _m : null,
                                        description: (_o = routeData.description) !== null && _o !== void 0 ? _o : null,
                                        visibility: routeData.visibility,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 24:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'editChannel' &&
                                routeData.channelId &&
                                routeData.communityId &&
                                routeData.channelName)) return [3 /*break*/, 26];
                            return [4 /*yield*/, writeMarker({ matched: 'editChannel', routeData: routeData })];
                        case 25:
                            _15.sent();
                            (_p = navigationRef.current) === null || _p === void 0 ? void 0 : _p.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'EditChannel',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 26:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'channelPins' && routeData.channelId)) return [3 /*break*/, 28];
                            return [4 /*yield*/, writeMarker({ matched: 'channelPins', routeData: routeData })];
                        case 27:
                            _15.sent();
                            (_q = navigationRef.current) === null || _q === void 0 ? void 0 : _q.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ChannelPins',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 28:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'channelSearch' &&
                                routeData.channelId &&
                                routeData.communityId)) return [3 /*break*/, 30];
                            return [4 /*yield*/, writeMarker({ matched: 'channelSearch', routeData: routeData })];
                        case 29:
                            _15.sent();
                            (_r = navigationRef.current) === null || _r === void 0 ? void 0 : _r.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ChannelSearch',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 30:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'voiceCall' &&
                                routeData.channelId &&
                                routeData.communityId &&
                                routeData.channelName)) return [3 /*break*/, 32];
                            return [4 /*yield*/, writeMarker({ matched: 'voiceCall', routeData: routeData })];
                        case 31:
                            _15.sent();
                            (_s = navigationRef.current) === null || _s === void 0 ? void 0 : _s.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'VoiceCallScreen',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 32:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'channel' && routeData.channelId)) return [3 /*break*/, 34];
                            return [4 /*yield*/, writeMarker({ matched: 'channel', routeData: routeData })];
                        case 33:
                            _15.sent();
                            (_t = navigationRef.current) === null || _t === void 0 ? void 0 : _t.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ChannelScreen',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 34:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'dm' && routeData.conversationId)) return [3 /*break*/, 36];
                            return [4 /*yield*/, writeMarker({ matched: 'dm', routeData: routeData })];
                        case 35:
                            _15.sent();
                            (_u = navigationRef.current) === null || _u === void 0 ? void 0 : _u.navigate('Main', {
                                screen: 'DmTab',
                                params: {
                                    screen: 'DmScreen',
                                    params: {
                                        conversationId: routeData.conversationId,
                                        userId: routeData.userId,
                                        displayName: routeData.displayName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 36:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'dmList')) return [3 /*break*/, 38];
                            return [4 /*yield*/, writeMarker({ matched: 'dmList', routeData: routeData })];
                        case 37:
                            _15.sent();
                            (_v = navigationRef.current) === null || _v === void 0 ? void 0 : _v.navigate('Main', {
                                screen: 'DmTab',
                                params: {
                                    screen: 'DmListScreen',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 38:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'event' && routeData.eventId && routeData.communityId)) return [3 /*break*/, 40];
                            return [4 /*yield*/, writeMarker({ matched: 'event', routeData: routeData })];
                        case 39:
                            _15.sent();
                            (_w = navigationRef.current) === null || _w === void 0 ? void 0 : _w.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'EventDetails',
                                    params: {
                                        communityId: routeData.communityId,
                                        eventId: routeData.eventId,
                                        eventTitle: routeData.eventTitle,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 40:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'eventAttendees' &&
                                routeData.eventId &&
                                routeData.communityId)) return [3 /*break*/, 42];
                            return [4 /*yield*/, writeMarker({ matched: 'eventAttendees', routeData: routeData })];
                        case 41:
                            _15.sent();
                            (_x = navigationRef.current) === null || _x === void 0 ? void 0 : _x.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'EventAttendees',
                                    params: {
                                        communityId: routeData.communityId,
                                        eventId: routeData.eventId,
                                        eventTitle: routeData.eventTitle,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 42:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'polls' && routeData.channelId)) return [3 /*break*/, 44];
                            return [4 /*yield*/, writeMarker({ matched: 'polls', routeData: routeData })];
                        case 43:
                            _15.sent();
                            (_y = navigationRef.current) === null || _y === void 0 ? void 0 : _y.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ChannelPolls',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 44:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'createPoll' && routeData.channelId)) return [3 /*break*/, 46];
                            return [4 /*yield*/, writeMarker({ matched: 'createPoll', routeData: routeData })];
                        case 45:
                            _15.sent();
                            (_z = navigationRef.current) === null || _z === void 0 ? void 0 : _z.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CreatePoll',
                                    params: {
                                        channelId: routeData.channelId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 46:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'forum' && routeData.channelId && routeData.communityId)) return [3 /*break*/, 48];
                            return [4 /*yield*/, writeMarker({ matched: 'forum', routeData: routeData })];
                        case 47:
                            _15.sent();
                            (_0 = navigationRef.current) === null || _0 === void 0 ? void 0 : _0.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ForumChannelScreen',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 48:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'createForumPost' &&
                                routeData.channelId &&
                                routeData.communityId)) return [3 /*break*/, 50];
                            return [4 /*yield*/, writeMarker({ matched: 'createForumPost', routeData: routeData })];
                        case 49:
                            _15.sent();
                            (_1 = navigationRef.current) === null || _1 === void 0 ? void 0 : _1.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CreateForumPost',
                                    params: {
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 50:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'thread' &&
                                routeData.threadId &&
                                routeData.channelId)) return [3 /*break*/, 52];
                            return [4 /*yield*/, writeMarker({ matched: 'thread', routeData: routeData })];
                        case 51:
                            _15.sent();
                            (_2 = navigationRef.current) === null || _2 === void 0 ? void 0 : _2.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'ThreadScreen',
                                    params: {
                                        threadId: routeData.threadId,
                                        channelId: routeData.channelId,
                                        communityId: routeData.communityId,
                                        channelName: routeData.channelName,
                                        rootMessageId: routeData.rootMessageId,
                                    },
                                },
                            });
                            return [3 /*break*/, 78];
                        case 52:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'inbox')) return [3 /*break*/, 54];
                            return [4 /*yield*/, writeMarker({ matched: 'inbox', routeData: routeData })];
                        case 53:
                            _15.sent();
                            (_3 = navigationRef.current) === null || _3 === void 0 ? void 0 : _3.navigate('Main', {
                                screen: 'DmTab',
                                params: {
                                    screen: 'DmListScreen',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 54:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'bookmarks')) return [3 /*break*/, 56];
                            return [4 /*yield*/, writeMarker({ matched: 'bookmarks', routeData: routeData })];
                        case 55:
                            _15.sent();
                            (_4 = navigationRef.current) === null || _4 === void 0 ? void 0 : _4.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'Bookmarks',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 56:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'friends')) return [3 /*break*/, 58];
                            return [4 /*yield*/, writeMarker({ matched: 'friends', routeData: routeData })];
                        case 57:
                            _15.sent();
                            (_5 = navigationRef.current) === null || _5 === void 0 ? void 0 : _5.navigate('Main', {
                                screen: 'FriendsTab',
                            });
                            return [3 /*break*/, 78];
                        case 58:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'backup')) return [3 /*break*/, 60];
                            return [4 /*yield*/, writeMarker({ matched: 'backup', routeData: routeData })];
                        case 59:
                            _15.sent();
                            (_6 = navigationRef.current) === null || _6 === void 0 ? void 0 : _6.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'Backup',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 60:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'settings')) return [3 /*break*/, 62];
                            return [4 /*yield*/, writeMarker({ matched: 'settings', routeData: routeData })];
                        case 61:
                            _15.sent();
                            (_7 = navigationRef.current) === null || _7 === void 0 ? void 0 : _7.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'SettingsScreen',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 62:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'joinInvite')) return [3 /*break*/, 64];
                            return [4 /*yield*/, writeMarker({ matched: 'joinInvite', routeData: routeData })];
                        case 63:
                            _15.sent();
                            (_8 = navigationRef.current) === null || _8 === void 0 ? void 0 : _8.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'JoinInvite',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 64:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'editProfile')) return [3 /*break*/, 66];
                            return [4 /*yield*/, writeMarker({ matched: 'editProfile', routeData: routeData })];
                        case 65:
                            _15.sent();
                            (_9 = navigationRef.current) === null || _9 === void 0 ? void 0 : _9.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'EditProfile',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 66:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'linkedAccounts')) return [3 /*break*/, 68];
                            return [4 /*yield*/, writeMarker({ matched: 'linkedAccounts', routeData: routeData })];
                        case 67:
                            _15.sent();
                            (_10 = navigationRef.current) === null || _10 === void 0 ? void 0 : _10.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'LinkedAccounts',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 68:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'createCommunity')) return [3 /*break*/, 70];
                            return [4 /*yield*/, writeMarker({ matched: 'createCommunity', routeData: routeData })];
                        case 69:
                            _15.sent();
                            (_11 = navigationRef.current) === null || _11 === void 0 ? void 0 : _11.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'CreateCommunity',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 70:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'discover')) return [3 /*break*/, 72];
                            return [4 /*yield*/, writeMarker({ matched: 'discover->home', routeData: routeData })];
                        case 71:
                            _15.sent();
                            (_12 = navigationRef.current) === null || _12 === void 0 ? void 0 : _12.navigate('Main', {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'HomeScreen',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 72:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'myQr')) return [3 /*break*/, 74];
                            return [4 /*yield*/, writeMarker({ matched: 'myQr', routeData: routeData })];
                        case 73:
                            _15.sent();
                            (_13 = navigationRef.current) === null || _13 === void 0 ? void 0 : _13.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'MyQr',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 74:
                            if (!((routeData === null || routeData === void 0 ? void 0 : routeData.type) === 'qrScan')) return [3 /*break*/, 76];
                            return [4 /*yield*/, writeMarker({ matched: 'qrScan', routeData: routeData })];
                        case 75:
                            _15.sent();
                            (_14 = navigationRef.current) === null || _14 === void 0 ? void 0 : _14.navigate('Main', {
                                screen: 'SettingsTab',
                                params: {
                                    screen: 'QrScan',
                                },
                            });
                            return [3 /*break*/, 78];
                        case 76: return [4 /*yield*/, writeMarker({ matched: null, routeData: routeData })];
                        case 77:
                            _15.sent();
                            _15.label = 78;
                        case 78: return [3 /*break*/, 81];
                        case 79: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-route.json')];
                        case 80:
                            _15.sent();
                            devRouteInFlightRef.current = false;
                            return [7 /*endfinally*/];
                        case 81: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevRoute();
        var interval = setInterval(function () {
            void tryDevRoute();
        }, 1000);
        return function () {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isLoading, isNavigationReady, user]);
    // Register for push notifications when user logs in
    (0, react_1.useEffect)(function () {
        if (!user) {
            var previousUserId = previousUserIdRef.current;
            websocket_1.wsManager.disconnect();
            if (previousUserId) {
                (0, notifications_1.unregisterPushToken)().catch(function (err) {
                    console.warn('[App] Failed to unregister push token:', err);
                });
            }
            previousUserIdRef.current = null;
            return;
        }
        previousUserIdRef.current = user.id;
        (0, notifications_1.registerForPushNotifications)().catch(function (err) {
            console.warn('[App] Failed to register push notifications:', err);
        });
    }, [user]);
    // Start offline queue network listener
    (0, react_1.useEffect)(function () {
        (0, offline_queue_1.startNetworkListener)(function (count) {
            if (count > 0) {
                react_native_1.Alert.alert(t('offlineQueue.sentTitle'), t('offlineQueue.sentBody', { count: count }));
            }
        });
        // Process any existing queue on app start
        (0, offline_queue_1.processQueue)();
        return function () {
            (0, offline_queue_1.stopNetworkListener)();
        };
    }, [t]);
    // Handle notification taps for deep linking
    (0, react_1.useEffect)(function () {
        var subscription = Notifications.addNotificationResponseReceivedListener(function (response) {
            var _a, _b, _c, _d;
            var data = response.notification.request.content.data;
            if (!data || !navigationRef.current)
                return;
            // Navigate using the nested tab structure
            if (data.channelId) {
                navigationRef.current.navigate('Main', {
                    screen: 'HomeTab',
                    params: {
                        screen: 'ChannelScreen',
                        params: {
                            channelId: data.channelId,
                            communityId: (_a = data.communityId) !== null && _a !== void 0 ? _a : '',
                            channelName: (_b = data.channelName) !== null && _b !== void 0 ? _b : '',
                        },
                    },
                });
            }
            else if (data.conversationId) {
                navigationRef.current.navigate('Main', {
                    screen: 'DmTab',
                    params: {
                        screen: 'DmScreen',
                        params: {
                            conversationId: data.conversationId,
                            userId: (_c = data.userId) !== null && _c !== void 0 ? _c : '',
                            displayName: (_d = data.displayName) !== null && _d !== void 0 ? _d : '',
                        },
                    },
                });
            }
        });
        return function () { return subscription.remove(); };
    }, []);
    if (isLoading) {
        return null; // Splash screen shows here
    }
    return (<ErrorBoundary_1.default>
      <react_query_1.QueryClientProvider client={queryClient}>
        <react_native_safe_area_context_1.SafeAreaProvider>
          <NetworkBar_1.default />
          <native_1.NavigationContainer ref={navigationRef} linking={linking} onReady={function () { return setNavigationReady(true); }}>
            <Stack.Navigator screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme_1.colors.background },
        }}>
              {user ? (<Stack.Screen name="Main" component={navigation_1.MainTabs}/>) : (<Stack.Screen name="Login" component={LoginScreen_1.default}/>)}
            </Stack.Navigator>
          </native_1.NavigationContainer>
        </react_native_safe_area_context_1.SafeAreaProvider>
      </react_query_1.QueryClientProvider>
    </ErrorBoundary_1.default>);
}
