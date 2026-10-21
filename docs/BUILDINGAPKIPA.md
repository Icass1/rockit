# Building APK/IPA with EAS

## Prerequisites

1. Expo account: expo.dev
2. Mobile app: frontend/apps/mobile/
3. EAS CLI: `npm install -g eas-cli`

## Auth

### Option 1: Env var (recommended for CI)

Create token at expo.dev/settings/access-tokens:

```bash
export EXPO_TOKEN=your_token_here
```

### Option 2: Interactive

`eas login`

## Config

### Init EAS (if not linked)

```bash
cd frontend/apps/mobile
eas init --non-interactive --force
```

Config: eas.json with profiles (development, preview, production)

## Build APK

### Preview (testing)

```bash
cd frontend/apps/mobile
EXPO_TOKEN=your_token eas build --platform android --profile preview --wait
```

### Production

```bash
EXPO_TOKEN=your_token eas build --platform android --profile production --wait
```

Note: prod builds may need google-services.json for Firebase.

## Build IPA

### Preview

```bash
EXPO_TOKEN=your_token eas build --platform ios --profile preview --wait
```

### Production

```bash
EXPO_TOKEN=your_token eas build --platform ios --profile production --wait
```

Note: iOS needs Apple Developer credentials in EAS.

## Package Scripts

```bash
# From frontend/apps/mobile
pnpm build:android:preview
pnpm build:android:production
pnpm build:ios:preview
pnpm build:ios:production
pnpm build:all:production
```

## Download

- Expo dashboard: expo.dev
- URL in build output

## GitHub Actions preview APK

The `Build Android preview APK` workflow builds the checked-in Android project
directly with Gradle on a GitHub-hosted runner and attaches the resulting APK to
the GitHub Actions run for 14 days. It does not use EAS Build or require an Expo
account or token.

1. Open **Actions → Build Android preview APK → Run workflow** and select the
   branch to build.
2. When the workflow finishes, open its run and download the
   `RockIt-Android-preview-<run number>` artifact from the **Artifacts** section.

The preview is a standalone release APK with a bundled Hermes program. It uses
`com.rockit.mobile.preview` and the repository's debug certificate, so it can
coexist with an EAS build signed using the EAS-managed certificate. It cannot
replace an EAS installation of `com.rockit.mobile` while preserving that app's
identity; updating the original app requires its original signing key.

Before uploading the APK, the workflow verifies the signature, native-library
ZIP alignment, and package identity, then installs the actual APK on an Android
13 emulator. The smoke test waits for bundled JavaScript to run, checks for
startup crashes, and verifies that the login form renders. Installation and
startup logs are attached separately as
`RockIt-Android-preview-diagnostics-<run number>` even if the test fails.

To run the same check locally, use a fresh, booted emulator:

```bash
python frontend/apps/mobile/scripts/smoke-test-android.py path/to/app-release.apk \
  --serial emulator-5554 --output android-smoke-test
```

Select the emulator explicitly with `--serial`; the test clears that device's
logcat and expects a logged-out installation. Use `--adb` to specify the Android
SDK's adb executable if it is not on your PATH.

### Diagnosing a phone installation failure

`Unknown element under <manifest>: queries ... Binary XML file line ...` is a
warning from Android's legacy APK metadata parser, which skips unrecognized
elements. It does not establish that the manifest is corrupt. The binary XML
inside an APK is normal; the artifact includes a readable manifest for inspection.

Check the actual install status. `INSTALL_FAILED_ABORTED: Session was abandoned`
means the installation session was cancelled; it does not identify an APK parse,
signature, or native-library error. Do not disable Hermes, change the package
identity again, or remove `<queries>` in response to that warning.

With USB debugging authorized, direct installation gives the package manager's
result without the file manager's confirmation-session handling:

```bash
adb devices -l
adb -s YOUR_PHONE_SERIAL install --no-incremental -r path/to/app-release.apk
adb -s YOUR_PHONE_SERIAL shell am start -W \
  -n com.rockit.mobile.preview/com.rockit.mobile.MainActivity
```

`-r` preserves the installed preview's data. If this succeeds while opening the
same APK in Files fails, investigate the file manager/installer flow and capture
its session status rather than changing the app's runtime configuration. Compare
SHA-256 hashes of the downloaded and local APK to rule out a damaged transfer.

On the OPPO CPH2197/Android 13, preview build 5 was confirmed to install and run
via ADB and install through OPPO's **My Files**, while Google Files abandoned
installation of the identical APK. Use **My Files → Downloads**, extract the
artifact, and open `app-release.apk` there. Switching to EAS, adding a v1
signature, or removing the manifest's `<queries>` is unnecessary for this case.
See [the investigation](ANDROID_PREVIEW_INVESTIGATION.md) for the baseline,
artifact checks, and reproduction results.

## Troubleshooting

- "EAS not configured": `eas init --non-interactive --force`
- "eas not found": `npm install -g eas-cli`
- "Expo account required": set EXPO_TOKEN or `eas login`

iOS: check Apple Developer, bundle ID, certificates, provisioning.

Android: check google-services.json, package name, signing config.

## Env Vars

Set in Expo dashboard: EXPO_TOKEN, BACKEND_URL
