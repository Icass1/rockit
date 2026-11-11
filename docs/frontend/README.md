# Frontend

RockIt! has two application entry points. The desktop uses Next.js in
`apps/web`. The mobile application uses Expo in `apps/mobile`: React Native Web
for the iOS Home Screen PWA and React Native for Android. A PWA is not a native
IPA; browser storage and background playback have platform-specific limits.

## Choose a guide

| Task | Reference |
| --- | --- |
| Understand application boundaries and shared components | [Architecture and diagrams](architecture.md) |
| Deploy desktop and mobile independently | [Deployment, authentication and offline behavior](deployment.md) |
| Build native mobile targets | [Android APK and EAS builds](native-builds.md) |
| Run contracts, component checks or browser acceptance | [Verification](testing.md) |
| Diagnose iOS audio and system controls | [iOS playback](ios-playback.md) |
| Work on transitions | [Browser song transitions](browser-song-transitions.md) |
| Work on Library interactions | [Track search](library-song-search.md), [drag and drop](library-drag-drop.md), [navigation anchors](navigation-anchors.md) |

## Development

After completing the [root setup](../../README.md#local-development), run the
appropriate application from the repository root:

```sh
pnpm dev:web
pnpm dev:mobile
```

To run the mobile UI in a browser from VS Code, choose **Mobile Web (Expo)**
in Run and Debug and press F5, or **Backend + Mobile Web** to start both.
This launches the workspace Expo CLI on `http://localhost:8081` and opens Chrome
with debugging. It uses VS Code's built-in JavaScript debugger; the legacy
React Native Tools `platform: expo` launcher is not used. Metro keeps hot reload
enabled. Configure `EXPO_PUBLIC_BACKEND_URL` in `apps/mobile/.env` when the API
is not at its default `http://localhost:8000`.

For a completed frontend change, use `pnpm typecheck` and the relevant application
lint command. `pnpm test:frontend` runs the portable, DOM/native contract and
manager checks; production builds and device acceptance are separate. See the
verification guide for prerequisites and focused commands.

## Shared responsibilities

- `packages/shared`: API contracts, vocabulary, portable policies and managers.
- `packages/ui`: reusable presenters and renderer-independent hooks.
- `packages/theme`: semantic tokens shared by desktop and mobile.
- `packages/platform-browser`: browser playback, Media Session and storage adapters.

Each application owns its running services and session. Share portable behavior;
keep browser/native APIs in adapters and desktop/mobile layouts in their hosts.
Use the [web](../../apps/web/AGENTS.md) and [mobile](../../apps/mobile/AGENTS.md)
engineering guides for implementation rules. Previous migration decisions and
visual review evidence are in the [archive](../archive/README.md).
