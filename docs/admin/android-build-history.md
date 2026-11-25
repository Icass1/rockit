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

The preview workflow retains artifacts for 14 days. Refresh requests current
GitHub data; it does not start a build. GitHub failures or rate limits produce an
explicit unavailable state while manual build management remains accessible.
Manually uploaded builds retain their existing Rockit download counter.

Metadata moderation also adds core database migration 10,
`persist_reviewed_media_genre`. Run the normal backend migration/startup workflow
before deploying the new clients.
