# 모임톡 mobile (Expo / React Native)

Cross-platform iOS + Android client built with Expo SDK 55. Every screen
in the web app has a mobile equivalent in `src/screens/`, including the
new `ApiKeysScreen` for managing public-API keys (see
[`docs/public-api.md`](../../docs/public-api.md)).

## Prerequisites

- Node 22 (matches the rest of the monorepo)
- pnpm
- For iOS: Xcode 15+ and the iOS Simulator
- For Android: Android Studio with an emulator image

## Run on a simulator

From the repo root:

```bash
# Start the API + web stack the mobile app talks to
pnpm turbo dev --filter @zktalk/api --filter @zktalk/web

# In another shell, start Expo
cd apps/mobile
pnpm start            # opens the dev server; press i for iOS, a for Android
```

If `pnpm start` complains about dependency drift, run:

```bash
npx expo install --check
```

This patches Expo packages to the versions Expo SDK 55 expects.

## Run on a physical device

1. Install **Expo Go** on the phone.
2. Make sure the phone is on the same Wi-Fi network as the dev machine.
3. From `apps/mobile`, run `pnpm start --tunnel` and scan the QR code.

The mobile API base URL is set in `app.config.js` → `extra.apiUrl`. For
device testing it must be reachable from the phone — replace
`http://localhost:4000` with your machine's LAN IP, e.g.
`http://192.168.1.13:4000`.

## Build a native app locally

The native iOS and Android projects are pre-generated and committed
under `ios/` and `android/`. To rebuild them from `app.json` after a
config change:

```bash
npx expo prebuild --platform ios --no-install
npx expo prebuild --platform android --no-install
```

### iOS

```bash
cd ios
pod install                      # ~45 s — installs 102 CocoaPods
open zkTalk.xcworkspace          # then ⌘R in Xcode
```

You can run on the iOS Simulator without an Apple Developer account.
For a physical device or TestFlight you need the $99/yr program plus a
provisioning profile.

### Android

You need **Android Studio** (or the standalone command-line SDK). After
installing, set `ANDROID_HOME` and either install platform-tools via
the SDK Manager or `sdkmanager "platforms;android-34" "build-tools;34.0.0"`.

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk      # macOS default
cd android
./gradlew assembleDebug                            # → app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug                             # installs into a running emulator
```

For Play Store distribution you additionally need a release keystore
and a Google Play Console account ($25 one-time).

### EAS (cloud builds, no local toolchain)

If you'd rather not install Xcode / Android Studio, Expo Application
Services builds the native app in the cloud:

```bash
npx eas-cli@latest login
npx eas-cli build --platform ios       # ~15 min, uploads to TestFlight
npx eas-cli build --platform android   # ~10 min, uploads to Internal Testing
```

EAS still needs the same Apple / Google credentials at submission time.

## What's new

- **`ApiKeysScreen`** — manage `/v1` API keys for external programs and
  AI agents directly on the phone. Settings → API keys.
- **Native contact import** — already wired via `expo-contacts` in
  `src/lib/contacts.ts`. The mobile equivalent of the web's
  vCard/CSV file picker, but better: it reads the OS address book
  directly with permission.

## Architecture

- Navigation: `@react-navigation/native` (stack + bottom tabs)
  - `MainTabs` → Home / DM / Friends / Discover / Settings
  - Each tab is its own native stack (`HomeStack`, `DmStack`, etc.)
- State: TanStack Query (server state) + Zustand (auth, i18n, etc.)
- Storage: `expo-secure-store` for tokens, `AsyncStorage` for prefs
- API layer: `src/lib/api.ts` — same shape as web's `apps/web/src/lib/api.ts`
- i18n: same `(key, params) => string` contract as web, locale files in
  `src/lib/i18n/locales/{en,ko}.ts`
