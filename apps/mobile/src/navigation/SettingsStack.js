"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsStack;
var react_1 = require("react");
var native_stack_1 = require("@react-navigation/native-stack");
var SettingsScreen_1 = require("../screens/SettingsScreen");
var EditProfileScreen_1 = require("../screens/EditProfileScreen");
var LinkedAccountsScreen_1 = require("../screens/LinkedAccountsScreen");
var QrScanScreen_1 = require("../screens/QrScanScreen");
var MyQrScreen_1 = require("../screens/MyQrScreen");
var BackupScreen_1 = require("../screens/BackupScreen");
var BookmarksScreen_1 = require("../screens/BookmarksScreen");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
var Stack = (0, native_stack_1.createNativeStackNavigator)();
function SettingsStack() {
    return (<Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: theme_1.colors.backgroundDark },
            headerTintColor: theme_1.colors.white,
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            contentStyle: { backgroundColor: theme_1.colors.background },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
        }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen_1.default} options={{ title: (0, i18n_1.t)('settings.title') }}/>
      <Stack.Screen name="EditProfile" component={EditProfileScreen_1.default} options={{ title: (0, i18n_1.t)('settings.editProfile') }}/>
      <Stack.Screen name="LinkedAccounts" component={LinkedAccountsScreen_1.default} options={{ title: (0, i18n_1.t)('settings.linkedAccounts') }}/>
      <Stack.Screen name="QrScan" component={QrScanScreen_1.default} options={{ title: (0, i18n_1.t)('settings.scanQr') }}/>
      <Stack.Screen name="MyQr" component={MyQrScreen_1.default} options={{ title: (0, i18n_1.t)('settings.myQr') }}/>
      <Stack.Screen name="Backup" component={BackupScreen_1.default} options={{ title: (0, i18n_1.t)('settings.backup') }}/>
      <Stack.Screen name="Bookmarks" component={BookmarksScreen_1.default} options={{ title: (0, i18n_1.t)('settings.bookmarks') }}/>
    </Stack.Navigator>);
}
