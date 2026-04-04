"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNativeVoiceCallingAvailable = void 0;
var nativeVoiceAvailable = false;
try {
    require('@livekit/react-native');
    require('@livekit/components-react');
    nativeVoiceAvailable = true;
}
catch (_a) {
    nativeVoiceAvailable = false;
}
exports.isNativeVoiceCallingAvailable = nativeVoiceAvailable;
