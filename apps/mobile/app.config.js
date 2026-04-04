const appJson = require('./app.json');

module.exports = () => {
  const expo = appJson.expo ?? {};
  const configuredPlugins = Array.from(
    new Set([
      ...(expo.plugins ?? []),
      'expo-apple-authentication',
      '@react-native-community/datetimepicker',
    ]),
  );
  const configuredApiUrl = [process.env.EXPO_PUBLIC_API_URL, process.env.API_URL]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const googleIosClientId = [process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const googleAndroidClientId = [process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const googleWebClientId = [process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_CLIENT_ID]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const devSessionToken = [process.env.EXPO_PUBLIC_DEV_SESSION_TOKEN, process.env.DEV_SESSION_TOKEN]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const enableSimulatorHarness = [
    process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS,
    process.env.ENABLE_SIMULATOR_HARNESS,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  return {
    ...expo,
    plugins: configuredPlugins,
    extra: {
      ...(expo.extra ?? {}),
      ...(configuredApiUrl ? { apiUrl: configuredApiUrl } : {}),
      ...(googleIosClientId ? { googleIosClientId } : {}),
      ...(googleAndroidClientId ? { googleAndroidClientId } : {}),
      ...(googleWebClientId ? { googleWebClientId } : {}),
      ...(devSessionToken ? { devSessionToken } : {}),
      ...(enableSimulatorHarness ? { enableSimulatorHarness } : {}),
    },
  };
};
