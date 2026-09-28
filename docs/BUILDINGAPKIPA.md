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

## Troubleshooting

- "EAS not configured": `eas init --non-interactive --force`
- "eas not found": `npm install -g eas-cli`
- "Expo account required": set EXPO_TOKEN or `eas login`

iOS: check Apple Developer, bundle ID, certificates, provisioning.

Android: check google-services.json, package name, signing config.

## Env Vars

Set in Expo dashboard: EXPO_TOKEN, BACKEND_URL
