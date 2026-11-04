# Rockit mobile — agent guidance

These instructions apply to `apps/mobile/` in addition to the root `AGENTS.md`.
The app uses Expo, React Native, strict TypeScript, Expo Router, Nanostores, and
shared Zod DTOs. Inspect installed dependencies before selecting native APIs.

## Organization and routing

- Routes live in `app/`, with `_layout.tsx` for navigation/providers and route
  groups for tabs and authentication. Use Expo Router `Link` or `router.push()`.
- Group native components by feature in `components/`. Keep hooks in `use*.ts`
  when they contain no JSX, and business logic in managers.
- React Native components run on the client; do not apply Next.js Server Component
  or `"use client"` conventions to Expo routes.
- Use the app's singleton in `lib/rockit/rockIt.ts` and its platform managers.
  Shared manager bases live in `packages/shared/src/`; web and mobile initialize
  their own platform adapters, rather than sharing a running singleton instance.
- Use absolute aliases from `tsconfig.json`. Put mobile-only types/enums in
  `apps/mobile/models/` and shared ones in `packages/shared/src/models/`.
  Component prop types may be defined beside their component.

## Data and application state

- Reuse the typed HTTP client, fetch hooks, and generated Zod schemas from `@/dto`.
  Validate responses and check unsuccessful results before accessing response data.
- Preserve the existing mobile session/cookie handling and configured backend URL.
- Use Nanostores and `useStore` for manager state. Preserve queue, playback position,
  user preferences, and WebSocket synchronization with other clients.
- Use the vocabulary manager/hooks for translated UI text. Add feature-prefixed keys
  through the backend vocabulary rather than hardcoding strings.
- Never manually edit generated DTOs. When API contracts change, regenerate from
  the root with `uv run --project apps/backend python -m apps.backend models`
  and check both frontend applications.

## Native UI and platform integrations

- Use native `View`, `Text`, image, pressable, and list components. Follow existing
  StyleSheet/theme conventions; do not assume browser CSS or Tailwind support.
- Use installed image and icon packages; provide placeholders and sensible caching.
- Virtualize large lists with `FlatList` or `SectionList`. Keep heavy processing off
  the main render path and avoid blocking interactions.
- Account for safe areas, keyboards, device rotation, touch targets, text scaling,
  screen-reader labels, contrast, and reduced motion. Follow iOS and Android
  interaction conventions and provide a fallback for unavailable features.
- Use `Platform.OS`, `Platform.select`, or platform files for native differences.
  Browser APIs such as `window`, `document`, localStorage, IndexedDB, and service
  workers must not run on native platforms; use existing storage/network adapters.
- Use the current playback implementation and installed `expo-audio` integration;
  do not introduce legacy `expo-av` or deprecated permissions packages.
- Preserve background playback, audio session behavior, lock-screen controls,
  interruptions, and queue progression when changing playback logic.
- Request permissions through the applicable installed Expo/native API and handle
  denial gracefully. Clean up subscriptions/listeners and release native resources.
- Keep deep links, app configuration, and native plugins consistent. Native module
  changes may need a new development build; Metro reload alone is insufficient.
- Surface errors through existing notification/toast managers. Do not add production
  console logging.

## Development and checks

From the repository root:

```sh
pnpm dev:mobile
pnpm --filter @app/mobile typecheck
pnpm --filter @app/mobile lint
```

Run typecheck and lint for mobile code changes. For shared client changes also run
`pnpm --filter @app/web typecheck`, or use root `pnpm typecheck` for the workspace.
Format changed TypeScript files with the repository Prettier configuration.

From `apps/mobile`, use `pnpm android` or `pnpm ios` for local native execution.
Verify affected flows on both platforms when devices/simulators are available,
including loading/errors and permission denial. For playback work, exercise app
backgrounding, interruptions, lock-screen controls, and track transitions.
Report any unavailable platform checks.

Native generation and preview/release commands, run only when the task needs them:

```sh
pnpm prebuild
pnpm build:android:preview
pnpm build:ios:preview
pnpm build:android:production
pnpm build:ios:production
pnpm build:all:production
```

Prebuild generates native projects; inspect its diff. EAS builds require the
configured account/credentials. Do not treat a TypeScript check as native build
or device verification.
