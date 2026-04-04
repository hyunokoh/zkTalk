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
exports.default = MainTabs;
var react_1 = require("react");
var react_native_1 = require("react-native");
var bottom_tabs_1 = require("@react-navigation/bottom-tabs");
var react_query_1 = require("@tanstack/react-query");
var react_native_svg_1 = require("react-native-svg");
var HomeStack_1 = require("./HomeStack");
var DmStack_1 = require("./DmStack");
var SettingsStack_1 = require("./SettingsStack");
var FriendsScreen_1 = require("../screens/FriendsScreen");
var i18n_1 = require("../lib/i18n");
var api_1 = require("../lib/api");
var useWebSocket_1 = require("../hooks/useWebSocket");
var auth_1 = require("../stores/auth");
var theme_1 = require("../theme");
var Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
function TabIcon(_a) {
    var routeName = _a.routeName, color = _a.color, focused = _a.focused, displayName = _a.displayName, avatarUrl = _a.avatarUrl;
    var strokeWidth = focused ? 2.1 : 1.9;
    var initial = ((displayName === null || displayName === void 0 ? void 0 : displayName.trim().charAt(0)) || '?').toUpperCase();
    if (routeName === 'SettingsTab' && displayName) {
        return (<react_native_1.View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
        {avatarUrl ? (<react_native_1.Image source={{ uri: avatarUrl }} style={styles.settingsAvatar}/>) : (<react_native_1.View style={styles.settingsAvatarFallback}>
            <react_native_1.Text style={styles.settingsAvatarInitial}>{initial}</react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.View>);
    }
    return (<react_native_1.View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <react_native_svg_1.default width={22} height={22} viewBox="0 0 24 24" fill="none">
        {routeName === 'HomeTab' && (<>
            <react_native_svg_1.Path d="M3 10.75L12 4l9 6.75" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <react_native_svg_1.Path d="M6.75 10.5V20h10.5v-9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </>)}
        {routeName === 'DmTab' && (<react_native_svg_1.Path d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6A2.5 2.5 0 0116.5 16H10l-4.5 3v-3H7.5A2.5 2.5 0 015 13.5v-6z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>)}
        {routeName === 'FriendsTab' && (<>
            <react_native_svg_1.Path d="M15.5 19v-1.25A3.75 3.75 0 0011.75 14H7.5a3.75 3.75 0 00-3.75 3.75V19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <react_native_svg_1.Circle cx="9.5" cy="8" r="3" stroke={color} strokeWidth={strokeWidth}/>
            <react_native_svg_1.Circle cx="16.5" cy="9" r="2.5" stroke={color} strokeWidth={strokeWidth}/>
            <react_native_svg_1.Path d="M19.75 19v-1a3.25 3.25 0 00-3.25-3.25h-1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </>)}
        {routeName === 'SettingsTab' && (<>
            <react_native_svg_1.Path d="M12 3.75l1.15 2.33 2.58.38-1.86 1.82.44 2.57L12 9.77 9.69 10.85l.44-2.57-1.86-1.82 2.58-.38L12 3.75z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <react_native_svg_1.Circle cx="12" cy="12" r="3.25" stroke={color} strokeWidth={strokeWidth}/>
            <react_native_svg_1.Path d="M5.5 13.2v-2.4l-1.75-1 1.25-2.17 2 .45 1.7-1.4-.15-2.05h2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <react_native_svg_1.Path d="M18.5 10.8v2.4l1.75 1-1.25 2.17-2-.45-1.7 1.4.15 2.05h-2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </>)}
      </react_native_svg_1.default>
    </react_native_1.View>);
}
function MainTabs() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var lastEvent = (0, useWebSocket_1.useWebSocket)().lastEvent;
    var user = (0, auth_1.useAuthStore)(function (s) { return s.user; });
    var setUser = (0, auth_1.useAuthStore)(function (s) { return s.setUser; });
    var dmSummaryQuery = (0, react_query_1.useQuery)({
        queryKey: ['dm-conversations'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, api_1.api)('/api/dm/conversations')];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, Array.isArray(result) ? result : (_a = result.conversations) !== null && _a !== void 0 ? _a : []];
                }
            });
        }); },
    });
    var friendsSummaryQuery = (0, react_query_1.useQuery)({
        queryKey: ['friends'],
        queryFn: function () { return (0, api_1.api)('/api/friends'); },
    });
    var unreadDmCount = (0, react_1.useMemo)(function () {
        var _a;
        return ((_a = dmSummaryQuery.data) !== null && _a !== void 0 ? _a : []).reduce(function (sum, conversation) { var _a; return sum + ((_a = conversation.unreadCount) !== null && _a !== void 0 ? _a : 0); }, 0);
    }, [dmSummaryQuery.data]);
    var pendingFriendRequestCount = (0, react_1.useMemo)(function () {
        var _a, _b;
        return ((_b = (_a = friendsSummaryQuery.data) === null || _a === void 0 ? void 0 : _a.friends) !== null && _b !== void 0 ? _b : []).filter(function (friend) { return friend.status === 'pending' && !friend.isRequester; }).length;
    }, [friendsSummaryQuery.data]);
    (0, react_1.useEffect)(function () {
        if (!lastEvent)
            return;
        if (lastEvent.type === 'message.created') {
            void queryClient.invalidateQueries({ queryKey: ['inbox'] });
        }
        if (lastEvent.type === 'dm.message_created' ||
            lastEvent.type === 'dm.message_updated' ||
            lastEvent.type === 'dm.message_deleted' ||
            lastEvent.type === 'dm.conversation_created' ||
            lastEvent.type === 'dm.conversation_updated') {
            void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
        }
        if (lastEvent.type === 'presence.updated') {
            void queryClient.invalidateQueries({ queryKey: ['friends'] });
            void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
        }
        if (lastEvent.type === 'profile.updated') {
            var nextUser = lastEvent.payload.user;
            if (nextUser &&
                typeof nextUser === 'object' &&
                'id' in nextUser &&
                nextUser.id === (user === null || user === void 0 ? void 0 : user.id)) {
                setUser(nextUser);
            }
        }
    }, [lastEvent, queryClient, setUser, user === null || user === void 0 ? void 0 : user.id]);
    return (<Tab.Navigator screenOptions={function (_a) {
            var route = _a.route;
            return ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: theme_1.colors.primary,
                tabBarInactiveTintColor: theme_1.colors.textSecondary,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: function (_a) {
                    var color = _a.color, focused = _a.focused;
                    return (<TabIcon routeName={route.name} color={color} focused={focused} displayName={route.name === 'SettingsTab' ? user === null || user === void 0 ? void 0 : user.displayName : undefined} avatarUrl={route.name === 'SettingsTab' ? user === null || user === void 0 ? void 0 : user.avatarUrl : undefined}/>);
                },
            });
        }}>
      <Tab.Screen name="HomeTab" component={HomeStack_1.default} options={{
            tabBarLabel: (0, i18n_1.t)('nav.home'),
            tabBarButtonTestID: 'main-tab-home',
        }}/>
      <Tab.Screen name="DmTab" component={DmStack_1.default} options={{
            tabBarLabel: (0, i18n_1.t)('nav.dms'),
            tabBarBadge: unreadDmCount > 0 ? unreadDmCount : undefined,
            tabBarBadgeStyle: styles.tabBadge,
            tabBarButtonTestID: 'main-tab-dm',
        }}/>
      <Tab.Screen name="FriendsTab" component={FriendsScreen_1.default} options={{
            tabBarLabel: (0, i18n_1.t)('nav.friends'),
            tabBarBadge: pendingFriendRequestCount > 0 ? pendingFriendRequestCount : undefined,
            tabBarBadgeStyle: styles.tabBadge,
            headerShown: true,
            headerTitle: (0, i18n_1.t)('friends.title'),
            headerStyle: { backgroundColor: theme_1.colors.backgroundDark },
            headerTintColor: theme_1.colors.white,
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            headerShadowVisible: false,
            tabBarButtonTestID: 'main-tab-friends',
        }}/>
      <Tab.Screen name="SettingsTab" component={SettingsStack_1.default} options={{
            tabBarLabel: (0, i18n_1.t)('nav.settings'),
            tabBarButtonTestID: 'main-tab-settings',
        }}/>
    </Tab.Navigator>);
}
var styles = react_native_1.StyleSheet.create({
    tabBar: {
        backgroundColor: '#202225',
        borderTopColor: 'transparent',
        borderTopWidth: 0,
        height: react_native_1.Platform.OS === 'ios' ? 92 : 70,
        paddingTop: 8,
        paddingBottom: react_native_1.Platform.OS === 'ios' ? 30 : 10,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 3,
    },
    tabIconWrap: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    tabIconWrapActive: {
        backgroundColor: '#40444b',
    },
    settingsAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    settingsAvatarFallback: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.colors.primary,
    },
    settingsAvatarInitial: {
        color: theme_1.colors.white,
        fontSize: 10,
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: '#ff5d73',
        color: theme_1.colors.white,
        fontSize: 10,
        fontWeight: '700',
    },
});
