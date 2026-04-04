"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Logo;
var react_1 = require("react");
var react_native_svg_1 = require("react-native-svg");
/**
 * zkTalk app icon as an SVG component.
 * Based on zktalk-mark.svg — gradient circle with chat bubble + face.
 */
function Logo(_a) {
    var _b = _a.size, size = _b === void 0 ? 72 : _b;
    var scale = size / 512;
    return (<react_native_svg_1.default width={size} height={size} viewBox="0 0 512 512" fill="none">
      <react_native_svg_1.Circle cx="256" cy="256" r="212" fill="url(#grad)"/>
      <react_native_svg_1.Path d="M132 180C132 152.386 154.386 130 182 130H330C357.614 130 380 152.386 380 180V304C380 331.614 357.614 354 330 354H264L202 410C191.052 419.915 173.25 412.148 173.25 397.344V354H182C154.386 354 132 331.614 132 304V180Z" fill="#EEF2FF"/>
      <react_native_svg_1.Circle cx="221" cy="239" r="35" fill="#4F46E5"/>
      <react_native_svg_1.Circle cx="291" cy="239" r="35" fill="#4F46E5"/>
      <react_native_svg_1.Path d="M189 306C189 286.118 205.118 270 225 270H287C306.882 270 323 286.118 323 306V314H189V306Z" fill="#4F46E5"/>
      <react_native_svg_1.Defs>
        <react_native_svg_1.LinearGradient id="grad" x1="90" y1="82" x2="422" y2="430" gradientUnits="userSpaceOnUse">
          <react_native_svg_1.Stop stopColor="#818CF8"/>
          <react_native_svg_1.Stop offset="1" stopColor="#4F46E5"/>
        </react_native_svg_1.LinearGradient>
      </react_native_svg_1.Defs>
    </react_native_svg_1.default>);
}
