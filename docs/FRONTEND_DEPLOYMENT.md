# Independent desktop and mobile deployment

The desktop application is `apps/web` (Next.js). The mobile product is
`apps/mobile`: Expo/React Native for Android and Expo/React Native Web for the iOS
Home Screen PWA. Both use the same backend, generated DTOs, vocabulary, portable
managers, theme and universal presenters. They do not mount each other's shells.

## Build targets

- Desktop: `pnpm build:web`; existing `apps/web/Dockerfile` serves Next on port 3000.
- Mobile PWA: `EXPO_PUBLIC_BACKEND_URL=https://your-api.example pnpm --filter @app/mobile build:web`;
  `apps/mobile/dist` is a static SPA, with a generated manifest and service worker.
- Native Android: the existing checked-in Android project and preview/production
  Gradle/EAS profiles. Preserve its custom audio, Bluetooth and automotive services;
  do not regenerate with `expo prebuild --clean`.
- A TWA is not the Android application selected here. A browser-hosted Android PWA
  can use the same web output, with browser capabilities rather than native ones.

`apps/mobile/Dockerfile.pwa` builds only static mobile assets into an unprivileged
Nginx image listening on 8080. `compose.mobile.yaml` is an explicit opt-in overlay;
its `mobile-pwa` profile does not change the existing backend or desktop services.
Set `EXPO_PUBLIC_BACKEND_URL` at build time and terminate HTTPS at the existing
reverse proxy. No production hostname, DNS or proxy configuration is changed by
this PR. For a local export preview, use `pnpm --filter @app/mobile preview:web`.

The public backend URL is embedded in each frontend bundle. A different backend
requires a rebuild. The mobile host needs SPA fallback for extensionless routes,
404 for missing build assets, immutable caching for hashed Expo assets, and
revalidation for HTML, manifest and service worker. The supplied Nginx configuration
implements this behavior. It never proxies API requests or caches signed media URLs.

## Origin and authentication rollout

Use a separate mobile origin when activating this target. Add that exact HTTPS
origin to the backend's existing CORS allowlist, with credentials, and verify its
existing WEB cookie-domain policy covers the mobile browser. The PWA logs in as
WEB, uses HttpOnly cookies, and never reads the MOBILE session token. Android logs
in as MOBILE and keeps the token in SecureStore. Do not introduce a JS-readable
browser token or broaden cookies/CORS to arbitrary origins.

An installed PWA's origin, service worker, IndexedDB and Cache Storage do not move
when a new subdomain appears. Existing installations must keep their original
origin until rollout is accepted, or users must install/sign in at the new origin.
Downloaded files cannot be copied silently between origins. Test rollout on a
separate origin first; do not switch existing production routing based on this PR
alone. A reverse-proxy document redirect may be enabled after acceptance; do not
redirect media/API requests or append session credentials to redirect URLs.

The desktop source no longer mounts the old mobile navigation/player. Coordinate
activation of the mobile host and entry link/routing with the desktop deployment,
so phone users are not left with a desktop layout at their previous entry URL.
Rollback consists of retaining the previous frontend image/origin; backend and S3
objects require no migration or rollback.

## Offline and platform limits

The mobile PWA caches its public shell in Cache Storage and audio/optional artwork
in the shared IndexedDB offline store. Private response metadata is namespaced by
account, bounded and validated against generated schemas when replayed. Network
failure can use cached data; HTTP authentication/server failures remain failures.
The service worker never caches API responses, ranged streams or cross-origin media.
Shell updates wait for the normal service-worker lifecycle; an update does not
force a reload during playback.

Browser persistence/quota APIs are best effort. There is no guaranteed seven-day
file-retention promise, and a PWA does not acquire native iOS storage/background
privileges. Android uses native files and native media/audio integrations. The new
native metadata namespace requires an online session once to seed trusted cached
responses; existing downloaded audio/video files are preserved.

Before changing the production origin, validate an installed iPhone PWA and an
installed Android APK: login/logout, offline restart, storage pressure, queue
progression, screen lock, interruption/resume and system media controls. WebKit
browser automation and native component tests supplement these device checks;
they do not replace them. Review the migration progress document and CI artifacts
for the evidence actually available at each revision.
