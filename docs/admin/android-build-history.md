# Android build history

The admin Builds tab reads the latest 30 runs of `build-android-preview.yml` and
matches the APK artifact uploaded by that workflow. It displays the branch,
commit, result, creation date and artifact expiry alongside manually uploaded
Rockit builds. Refresh requests current GitHub data; it does not start a build.

Configure the backend environment:

- `ANDROID_BUILDS_REPOSITORY`: GitHub `owner/repository`, defaults to `Icass1/rockit`.
- `ANDROID_BUILDS_GITHUB_TOKEN`: optional for public repositories; private
  repositories need a fine-grained token with **Actions: read** for that repository.

The token is used only by the backend and is never returned to the browser. The
history API requires the same administrator session as other admin endpoints.
GitHub failures or rate limits produce an explicit unavailable state and retain
the link to the workflow. They do not prevent manual build management.

Downloads open GitHub's artifact page and require the user's GitHub access to a
private repository. The preview workflow retains artifacts for 14 days. Expired
artifacts remain visible as history while their runs exist, without a download
link. Manually uploaded builds retain their existing Rockit download counter.

Metadata moderation adds core database migration 10, `persist_reviewed_media_genre`.
Run the normal backend migration/startup workflow before deploying the new clients.
