"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
var ErrorBoundary = /** @class */ (function (_super) {
    __extends(ErrorBoundary, _super);
    function ErrorBoundary(props) {
        var _this = _super.call(this, props) || this;
        _this.handleRestart = function () {
            _this.setState({ hasError: false, error: null });
        };
        _this.state = { hasError: false, error: null };
        return _this;
    }
    ErrorBoundary.getDerivedStateFromError = function (error) {
        return { hasError: true, error: error };
    };
    ErrorBoundary.prototype.componentDidCatch = function (error, errorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
        if (simulator_harness_1.isSimulatorHarnessEnabled) {
            void (0, simulator_harness_1.writeSimulatorHarnessJson)('error-boundary.json', {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                capturedAt: new Date().toISOString(),
            }, true);
        }
    };
    ErrorBoundary.prototype.render = function () {
        if (this.state.hasError) {
            return (<react_native_1.View style={styles.container}>
          <react_native_1.Text style={styles.icon}>!</react_native_1.Text>
          <react_native_1.Text style={styles.title}>{(0, i18n_1.t)('errorBoundary.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.message}>
            {(0, i18n_1.t)('errorBoundary.message')}
          </react_native_1.Text>
          {__DEV__ && this.state.error && (<react_native_1.View style={styles.errorBox}>
              <react_native_1.Text style={styles.errorText} numberOfLines={6}>
                {this.state.error.message}
              </react_native_1.Text>
            </react_native_1.View>)}
          <react_native_1.TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <react_native_1.Text style={styles.buttonText}>{(0, i18n_1.t)('errorBoundary.restart')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>);
        }
        return this.props.children;
    };
    return ErrorBoundary;
}(react_1.Component));
exports.default = ErrorBoundary;
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.xxxl,
    },
    icon: {
        fontSize: 48,
        fontWeight: '700',
        color: theme_1.colors.error,
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: theme_1.colors.error,
        textAlign: 'center',
        lineHeight: 68,
        marginBottom: theme_1.spacing.xxl,
    },
    title: {
        fontSize: theme_1.fontSize.title,
        fontWeight: '700',
        color: theme_1.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme_1.spacing.md,
    },
    message: {
        fontSize: theme_1.fontSize.body,
        color: theme_1.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme_1.spacing.xxl,
    },
    errorBox: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        padding: theme_1.spacing.md,
        marginBottom: theme_1.spacing.xxl,
        width: '100%',
    },
    errorText: {
        fontSize: theme_1.fontSize.sm,
        color: theme_1.colors.error,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.lg,
        paddingHorizontal: theme_1.spacing.xxxl,
        paddingVertical: theme_1.spacing.lg,
    },
    buttonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
});
