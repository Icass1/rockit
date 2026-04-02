# Building APK and IPA with Expo Application Services (EAS)

This guide explains how to build Android APK and iOS IPA files for the Rockit mobile app using Expo's cloud build service (EAS Build).

## Prerequisites

1. **Expo Account**: Create a free account at [expo.dev](https://expo.dev).
2. **Project Setup**: The mobile app is located at `frontend/apps/mobile/`.
3. **EAS CLI**: Install globally with `npm install -g eas-cli`.

## Authentication

### Option 1: Environment Variable (Recommended for CI)

Create an EXPO_TOKEN at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and set it as an environment variable:

```bash
export EXPO_TOKEN=your_token_here
```

### Option 2: Interactive Login

Run `eas login` and follow the prompts.

## Project Configuration

### Initialize EAS Project

If the project hasn't been linked to EAS yet, run:

```bash
cd frontend/apps/mobile
eas init --non-interactive --force
```

This creates a project on Expo servers and updates `app.json`.

### Configuration Files

The project already includes `eas.json` with build profiles:

- **development**: Debug APK for internal testing
- **preview**: Preview APK for internal distribution  
- **production**: Production APK for store submission

The `eas.json` is located at `frontend/apps/mobile/eas.json`.

## Building APK (Android)

### Preview APK (Recommended for testing)

```bash
cd frontend/apps/mobile
EXPO_TOKEN=your_token_here eas build --platform android --profile preview --wait
```

### Production APK

```bash
EXPO_TOKEN=your_token_here eas build --platform android --profile production --wait
```

**Note**: Production builds may require `google-services.json` for Firebase services. Place it in `frontend/apps/mobile/`.

## Building IPA (iOS)

### Preview IPA

```bash
EXPO_TOKEN=your_token_here eas build --platform ios --profile preview --wait
```

### Production IPA

```bash
EXPO_TOKEN=your_token_here eas build --platform ios --profile production --wait
```

**Note**: iOS builds require Apple Developer credentials configured in EAS.

## Using Package Scripts

The mobile app includes npm scripts for convenience:

```bash
# From frontend/apps/mobile directory

# Android
pnpm build:android:preview
pnpm build:android:production

# iOS  
pnpm build:ios:preview
pnpm build:ios:production

# Both platforms
pnpm build:all:production
```

## Build Artifacts

After a successful build, you can download the APK/IPA from:
- The Expo dashboard: [expo.dev](https://expo.dev)
- Using the provided download URL in build output

## Troubleshooting

### "EAS project not configured"
Run `eas init --non-interactive --force`.

### "eas: not found"
Install EAS CLI: `npm install -g eas-cli`.

### "Expo user account required"
Set `EXPO_TOKEN` environment variable or run `eas login`.

### iOS Build Failures
- Ensure Apple Developer account is properly configured
- Check that bundle identifier matches in `app.json`
- Verify distribution certificates and provisioning profiles

### Android Build Failures  
- Ensure `google-services.json` is present for production builds
- Check that package name matches in `app.json`
- Verify signing configuration

## Environment Variables

You can set environment variables in the Expo dashboard for different build profiles. Common variables include:
- `EXPO_TOKEN`: Authentication token
- `BACKEND_URL`: Backend API URL for the build

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.eas.dev/submit/introduction/) - For submitting to app stores
- [Configuration Guide](https://docs.expo.dev/build/configuration/)