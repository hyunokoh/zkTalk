"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NetworkBar;
var react_1 = require("react");
var react_native_1 = require("react-native");
var netinfo_1 = require("@react-native-community/netinfo");
var i18n_1 = require("../lib/i18n");
function NetworkBar() {
    var t = (0, i18n_1.useTranslation)().t;
    var _a = (0, react_1.useState)(true), isConnected = _a[0], setIsConnected = _a[1];
    (0, react_1.useEffect)(function () {
        var unsubscribe = netinfo_1.default.addEventListener(function (state) {
            setIsConnected(state.isConnected);
        });
        return function () {
            unsubscribe();
        };
    }, []);
    if (isConnected !== false) {
        return null;
    }
    return (<react_native_1.View style={styles.bar}>
      <react_native_1.Text style={styles.text}>{t('common.noNetwork')}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    bar: {
        backgroundColor: '#dc2626',
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
    },
});
