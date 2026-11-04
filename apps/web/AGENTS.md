# Rockit web — agent guidance

These instructions apply to `apps/web/` in addition to the root `AGENTS.md`.

## Architecture and code organization

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4,
  Nanostores, Zod, Lucide icons, and Recharts.
- Routes and layouts live in `app/`; protected routes use `(protected)` and the
  main application uses `(app)`. Group components by feature in `components/`.
- `page.tsx` must remain a Server Component. Put hooks, event handlers, and browser
  interactions in a `*Client.tsx` component with `"use client"`.
- Name hooks `useFeatureName.ts` when they contain no JSX. Keep business logic in
  `lib/managers/` or the shared managers; components render state and invoke managers.
- Use the application's `rockIt` singleton in `lib/rockit/rockIt.ts` for playback,
  queue, user, search, playlists, downloads, notifications, and UI state. Inspect
  existing manager methods before adding another implementation.
- Reuse shared HTTP, DTOs, models, and manager bases from `packages/shared/src/`.
  Use the aliases in `tsconfig.json`; several `@/` aliases resolve to shared code.
- App-only types belong in `apps/web/models/`; shared types belong in
  `packages/shared/src/models/`. Only component prop types may be co-located.

## Data, authentication, and state

- Prefer the existing typed `Http` client and established fetch hooks/utilities.
  Validate responses with generated Zod schemas from `@/dto`.
- Server-side fetches must forward the current session correctly. Client requests
  must include credentials. Use configured backend URLs, never hardcoded hosts.
- Do not cache private user data across users. Apply revalidation only where the
  endpoint and authentication permit it.
- Handle every unsuccessful HTTP/Result response before using its data. Use
  `notFound()` for missing page resources and `AppError` with route error boundaries
  for other server errors. Surface client errors through the notification manager.
- Use Nanostores and `useStore` from `@nanostores/react`; use existing atom helpers.
  WebSocket handlers update managers/atoms, which drive component rendering.
- Preserve queue, current media, playback-time, and download-progress synchronization.
- Use `rockIt.vocabularyManager.vocabularyAtom` for visible text. Add feature-prefixed
  vocabulary keys in the backend rather than hardcoding UI strings.

## Rendering, styling, and accessibility

- Keep server and initial client markup consistent. Do not return `null` based on
  a Nanostores value during hydration; preserve the element structure and use
  `opacity-0` with `aria-hidden` while waiting for data.
- Guard browser-only APIs with `typeof window !== "undefined"` and keep browser
  side effects in the appropriate client lifecycle.
- Navigate from event handlers with `useRouter().push()`, never `redirect()`.
- Use Context rather than `React.cloneElement` for prop injection.
- Every form `label` needs a matching `htmlFor` and input `id`; use `span` or `p`
  for decorative text. Provide accessible names, keyboard operation, visible focus,
  adequate contrast, and reduced-motion support for interactive UI.
- Use Tailwind and existing tokens in `styles/base.css`, including the Rockit pink
  colors. The custom `md:` breakpoint requires width ≥768px AND height ≥500px.
- Use the existing `skeleton` class for loading placeholders. Preserve safe-area
  handling and test narrow screens and short landscape viewports.
- Use passive touch listeners where appropriate for iOS scrolling; clean up listeners
  and subscriptions when components unmount.

## Feature workflow

1. Inspect the route, feature components, shared models, and relevant managers.
2. Keep server data/loading work in the route and interactions in a client wrapper.
3. Put new behavior in the appropriate manager and reuse the typed HTTP boundary.
4. For API changes, update backend Pydantic models and regenerate DTOs from the root:
   `uv run --project apps/backend python -m apps.backend models`.
5. Add translated vocabulary keys, loading/error/empty states, and accessible controls.
6. Run checks and verify the affected interaction at desktop and mobile dimensions;
   for playback changes, exercise queue progression and synchronization as well.

## Commands and checks

Run these from the repository root:

```sh
pnpm dev:web
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
pnpm build:web
```

Use typecheck and lint for code changes; build when routing, server rendering,
configuration, or bundling changes. For shared client changes, also run
`pnpm --filter @app/mobile typecheck` or the workspace `pnpm typecheck`.

Format edited source files with the repository Prettier configuration, for example
`pnpm exec prettier --write apps/web/components/Feature/FeatureClient.tsx`.
Use the installed formatter and plugins rather than global installs. The full
`pnpm check:frontend` gate installs dependencies, formats frontend source, runs
workspace type checks, and runs web lint; review any formatting changes it produces.
