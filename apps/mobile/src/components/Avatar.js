"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var theme_1 = require("../theme");
var Avatar = (0, react_1.memo)(function Avatar(_a) {
    var name = _a.name, avatarUrl = _a.avatarUrl, _b = _a.size, size = _b === void 0 ? 44 : _b, isOnline = _a.isOnline;
    var bgColor = (0, theme_1.getAvatarColor)(name);
    var initial = name.charAt(0).toUpperCase();
    var fontSize = size * 0.42;
    return (<react_native_1.View style={[styles.wrapper, { width: size, height: size }]}>
      {avatarUrl ? (<react_native_1.Image source={{ uri: avatarUrl }} style={[
                styles.circle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}/>) : (<react_native_1.View style={[
                styles.circle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor,
                },
            ]}>
          <react_native_1.Text style={[styles.initial, { fontSize: fontSize }]}>{initial}</react_native_1.Text>
        </react_native_1.View>)}
      {isOnline !== undefined && (<react_native_1.View style={[
                styles.indicator,
                {
                    width: size * 0.3,
                    height: size * 0.3,
                    borderRadius: size * 0.15,
                    borderWidth: size * 0.05,
                    backgroundColor: isOnline ? theme_1.colors.online : theme_1.colors.offline,
                    bottom: 0,
                    right: 0,
                },
            ]}/>)}
    </react_native_1.View>);
});
exports.default = Avatar;
var styles = react_native_1.StyleSheet.create({
    wrapper: {
        position: 'relative',
    },
    circle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initial: {
        color: theme_1.colors.textPrimary,
        fontWeight: '700',
    },
    indicator: {
        position: 'absolute',
        borderColor: theme_1.colors.talkBackground,
    },
});
