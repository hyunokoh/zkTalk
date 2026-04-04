"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingSpinner;
var react_1 = require("react");
var react_native_1 = require("react-native");
var theme_1 = require("../theme");
function LoadingSpinner(_a) {
    var text = _a.text, _b = _a.size, size = _b === void 0 ? 'large' : _b;
    return (<react_native_1.View style={styles.container}>
      <react_native_1.ActivityIndicator size={size} color={theme_1.colors.primary}/>
      {text && <react_native_1.Text style={styles.text}>{text}</react_native_1.Text>}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme_1.colors.background,
    },
    text: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        marginTop: theme_1.spacing.md,
    },
});
