# RockIt! Android PWA candidate

This opt-in distribution opens the dedicated mobile web build in a **Trusted Web
Activity**, using a supporting browser. iOS installs the same website as a Home
Screen web app. UI, backend, web playback and offline implementation are shared.
This does not convert browser storage/audio into native storage/audio.

The existing Expo app in `apps/mobile` remains the supported rollback candidate
until the device acceptance gates in [the platform decision](../../docs/MOBILE_PLATFORM.md)
pass. This directory does not replace its package ID, signing key or EAS workflow.
No production APK is claimed by adding these configuration files.

## Prerequisites

- Node.js 24, pnpm, JDK and Android SDK compatible with Bubblewrap.
- A deployed, working HTTPS mobile web origin, serving `/manifest.webmanifest`
  and the existing `/logo-512.png`. It must already work in the Android browser.
- Your own **new pilot application ID** and Android signing key/certificate.
  Do not reuse the native app's ID for the pilot or commit signing material.
- Accept the SDK/toolchain licenses yourself when installing the toolchain.

Bubblewrap **1.27.0** is pinned in the commands below and was verified published
on npm. Tool downloads and generated Gradle projects are not vendored here.

## Configure and generate

Copy `.env.example` in this directory to a private local file. Export its values
in the terminal used for generation; Node/pnpm do not load this file automatically.
Use absolute paths for the signing keystore. Obtain its public SHA-256 certificate
fingerprint with `keytool -list -v -keystore /path/to/key.jks -alias your-alias`.

From the repository root:

```sh
node apps/android-pwa/configure.mjs
cd apps/android-pwa/.generated
pnpm dlx @bubblewrap/cli@1.27.0 update --skipVersionUpgrade
pnpm dlx @bubblewrap/cli@1.27.0 build
```

The configuration step validates the origin, application ID, fingerprint, version
and signing-key location. It produces `twa-manifest.json` and `assetlinks.json`
without network requests. Bubblewrap then generates the Android project and builds
it using your configured SDK. It can prompt for toolchain setup and signing
passwords; keep passwords out of version control and terminal transcripts.

Use `build --skipSigning` only for an unsigned build, not for installation or
release verification. A signed APK and AAB are produced by the normal build;
check the actual Bubblewrap output paths before distributing anything.

## Verify the website association

Set these public values on the **mobile web deployment**:

```text
ROCKIT_ANDROID_PACKAGE_ID=your.pilot.application.id
ROCKIT_ANDROID_CERT_SHA256=AA:BB:...:32-byte-SHA256-fingerprint
```

`GET /.well-known/assetlinks.json` serves the association without authentication.
With no configuration it serves `[]`; partial/invalid configuration returns 503
and does not cache the failed association. Supply real fingerprints, not the
illustrative value above. Comma-separated fingerprints permit planned key rotation.

The HTTPS response must be publicly reachable without redirects. Its fingerprint
must match the certificate used to sign the installed APK (or Play App Signing
certificate if distributing through Play, not simply the upload certificate).
Review the emitted `assetlinks.json` against the website response. Every trusted
origin requires its own verification; additional origins are deliberately empty.

Without successful verification, full-screen TWA behavior is not established.
The configured fallback is Custom Tabs, not an embedded WebView: the latter has
different platform APIs, including Media Session limitations.

## Required acceptance before replacing Expo

Verify cold and offline launch; login/logout/account changes; offline downloads
and quota failure; screen-lock playback across multiple tracks with transitions
on/off; notification controls; interruptions, Bluetooth and battery saver; return
from background; deep links; upgrades and certificate verification. Repeat on
real Android devices, not only Chromium desktop emulation. See the platform ADR
for the corresponding real-iPhone PWA gates and migration/rollback constraints.
