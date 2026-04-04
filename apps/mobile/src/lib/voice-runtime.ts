let nativeVoiceAvailable = false;

try {
  require('@livekit/react-native');
  require('@livekit/components-react');
  nativeVoiceAvailable = true;
} catch {
  nativeVoiceAvailable = false;
}

export const isNativeVoiceCallingAvailable = nativeVoiceAvailable;
