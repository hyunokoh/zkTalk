"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DmStack;
var react_1 = require("react");
var native_stack_1 = require("@react-navigation/native-stack");
var DmListScreen_1 = require("../screens/DmListScreen");
var DmScreen_1 = require("../screens/DmScreen");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
var Stack = (0, native_stack_1.createNativeStackNavigator)();
function DmStack() {
    return (<Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: theme_1.colors.backgroundDark },
            headerTintColor: theme_1.colors.white,
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            contentStyle: { backgroundColor: theme_1.colors.background },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
        }}>
      <Stack.Screen name="DmListScreen" component={DmListScreen_1.default} options={{ title: (0, i18n_1.t)('dm.title'), headerShown: false }}/>
      <Stack.Screen name="DmScreen" component={DmScreen_1.default} options={function (_a) {
        var _b;
        var route = _a.route;
        return ({ title: (_b = route.params.displayName) !== null && _b !== void 0 ? _b : (0, i18n_1.t)('dm.message') });
    }}/>
    </Stack.Navigator>);
}
