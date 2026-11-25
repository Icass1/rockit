# Android build history

GitHub is the primary source on the admin Builds tab. The latest available APK is
highlighted above six recent runs, with more runs available on demand (up to 30).
Each run shows its branch, commit, result and creation date. Expired or unsuccessful
runs remain in the history without a download action. Manual uploads are available
in a collapsed secondary section.

Configure the backend environment:

- `ANDROID_BUILDS_REPOSITORY`: GitHub `owner/repository`, defaults to `Icass1/rockit`.
- `ANDROID_BUILDS_GITHUB_TOKEN`: a fine-grained token with **Actions: read** for that
  repository. Private repository history and all APK downloads require this token.
  Public repository history can be read without it, with downloads disabled.

The token remains on the backend. Administrators can download the APK directly
from Rockit or copy a link. Each copied link authorizes access to one artifact
for 24 hours or until GitHub expires the artifact, whichever comes first.
Recipients can download the APK without signing in to Rockit or GitHub.
The backend verifies
that the requested run belongs to the Android preview workflow, fetches the
matching unexpired artifact, and copies exactly one APK out of the artifact ZIP.
Compressed and extracted sizes are bounded at 512 MiB; archive paths are never
used as output paths. Temporary files are cleaned after delivery or failure.

The Android workflow runs automatically on pushes to main. The workflow requests
90 days of retention for main APKs and 14 days for preview APKs, subject to the
repository retention limit. User Settings expose only the newest successful main
APK with an available artifact. Administrators can still share individual builds.

GitHub APKs keep the existing `com.rockit.mobile.preview` package and signing key
so sideloaded copies are compatible with Android's installer. The workflow sets
a rising Android version code and embeds that same code into the JS bundle.
From that build onward, native Android compares the installed code with the main
release at startup and when the user checks from Settings. Older unversioned APKs
can be downloaded but cannot participate in the version comparison. The browser
downloads the new APK and Android handles installation after the user opens it.

Refresh in Admin requests current GitHub data and leaves manual management
accessible if GitHub is unavailable.
Manually uploaded builds retain their existing Rockit download counter.

Metadata moderation also adds core database migration 10,
`persist_reviewed_media_genre`. Run the normal backend migration/startup workflow
before deploying the new clients.
