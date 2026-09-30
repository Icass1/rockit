# Android preview investigation — 2026-09-30

## Working baseline and later changes

The reported working baseline is `dab4106aedb42efe10b51bdcd87da6bb27c56073`,
built using `scripts/build_apk.py` and the EAS preview profile. That version used
Expo SDK 54 and React Native 0.81.5. The baseline script updated version labels
and invoked EAS; it did not implement a different native runtime.

`7d398123` upgraded the dependencies to Expo SDK 57 and React Native 0.86.3.
The checked-in Android project initially retained the older Hermes compiler
path. `42dac31a` disabled Hermes to work around the resulting build problem.
With the upgraded Expo host creating a Hermes runtime, builds lacking the
Hermes libraries crashed when loading `libhermestooling.so`. The phone report
contains those crashes on September 27–28 for `com.rockit.mobile`.

Later commits restored Hermes and corrected compiler resolution. The GitHub
workflow now uses the compiler package resolved through React Native and fixes
its executable permission before bundling. The supplied preview-5 APK contains
`libhermestooling.so`, `libhermesvm.so`, and compiled Hermes bytecode.

The earlier `MediaButtonReceiver` crashes in the report are also distinct from
installation failure: older manifests advertised two services handling
`android.intent.action.MEDIA_BUTTON`. The supplied merged manifest advertises
one such service.

The migration to local Gradle also changed signing from EAS-managed credentials
to the repository's debug key. A preview package suffix was subsequently added
to avoid conflicting with an EAS installation. The supplied artifact has this
suffix; its providers and custom permission also use the preview identity.

## Supplied artifact

File: `RockIt-Android-preview-5/app-release.apk`.

* SHA-256: `362f6da57f6b0b1fdd72f20656689796b079414d65f5afbebf86f96aa22e8118`.
* Package: `com.rockit.mobile.preview`; version name: `1.0.0-preview`.
* Minimum API: 24; target API: 36; includes ARM64 and x86_64 native libraries.
* APK signature verification succeeds (v2), ZIP CRC checks succeed, and
  `zipalign -c -P 16 4` succeeds.
* Signer certificate SHA-256:
  `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

## Original phone report and live reproduction

The phone is an OPPO CPH2197 running Android 13/API 33.
The original report contains three preview installation sessions:
`1123377979`, `1734156095`, and `224767581`. Each ends with
`INSTALL_FAILED_ABORTED: Session was abandoned` (legacy status -115).

The `queries`/binary-XML message is logged at warning level by the metadata
parser. Integrity verification subsequently passes. Android's legacy
[PackageParser implementation](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android-13.0.0_r1/core/java/android/content/pm/PackageParser.java)
logs and skips unrecognized manifest elements in this path; the message alone
does not establish a malformed APK.

On September 30, the same supplied APK was installed using
`adb install --no-incremental -r` on both an Android 14/x86_64 emulator and the
actual OPPO phone. Both installations succeeded. Both launched MainActivity,
loaded Hermes, and ran the bundled React Native `main` application. The
emulator rendered the login form. The phone subsequently rendered the signed-in
music screen. There was no native startup crash in these checks.

The APK in the phone's original Downloads folder has the same SHA-256 as the
local artifact. Retrying that file through Google Files reproduced failure:
sessions `586077227` and `1958485825` were again abandoned. Play Protect explicitly
returned `VERIFICATION_ALLOW`; Files had `REQUEST_INSTALL_PACKAGES: allow`.
This isolates the current failure to the file-manager/installer session path,
rather than APK corruption, missing Hermes libraries, or a Play Protect rejection.

A controlled signing experiment added a valid v1/JAR signature to the same APK
while keeping the same signer certificate and app contents. Opening that variant
through Files also failed with an abandoned session (`828492831`). Enabling v1
signing is therefore not a supported fix for this reproduction.

Finally, the user opened the original preview-5 APK using OPPO's built-in
My Files (`com.coloros.filemanager`) and confirmed successful installation.
The exact same APK fails through Google Files and succeeds through My Files
and ADB on the same physical phone. The confirmed workaround is to use My Files
for APK installation. No APK runtime or signing change is needed for that
failure, and returning to EAS would not correct Google Files' abandoned session.

## Regression prevention

The preview workflow now sets `NODE_ENV=production`, checks native-library ZIP
alignment, and runs an installation/startup smoke test on Android 13 before
uploading a usable APK. The test requires bundled JavaScript execution,
process survival, a foreground activity, and a rendered login form. Failure
diagnostics are uploaded even when APK publication is blocked.

The smoke test was run against the supplied APK and passed. A negative test
using a nonexistent launch package failed as expected. This tests the artifact
that users download instead of treating a successful Gradle build as proof
that the app starts.
