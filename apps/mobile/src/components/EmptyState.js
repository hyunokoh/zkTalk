"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmptyState;
var react_1 = require("react");
var react_native_1 = require("react-native");
var theme_1 = require("../theme");
function EmptyState(_a) {
    var icon = _a.icon, title = _a.title, subtitle = _a.subtitle;
    return (<react_native_1.View style={styles.container}>
      {icon && <react_native_1.Text style={styles.icon}>{icon}</react_native_1.Text>}
      <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>
      {subtitle && <react_native_1.Text style={styles.subtitle}>{subtitle}</react_native_1.Text>}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.xxxl,
    },
    icon: {
        fontSize: 48,
        marginBottom: theme_1.spacing.lg,
    },
    title: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: theme_1.spacing.sm,
    },
    subtitle: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.base,
        textAlign: 'center',
        lineHeight: 20,
    },
});
