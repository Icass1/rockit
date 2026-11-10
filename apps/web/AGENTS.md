# Rockit web — agent guidance

These instructions apply to `apps/web/` in addition to the root `AGENTS.md`.

## Architecture and code organization

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4,
  Nanostores, Zod, Lucide icons, and Recharts.
- Routes and layouts live in `app/`; protected routes use `(protected)` and the
  main application uses `(app)`. Group components by feature in `components/`.
- `page.tsx` must remain a Server Component. Put hooks, event handlers, and browser
  interactions in a `*Client.tsx` component with `"use client"`.
- Name hooks `useFeatureName.ts` when they contain no JSX. Keep domain logic in
  services or playback managers; components render state and invoke feature APIs.
- Server Components use request-local loaders in `lib/server/` and `ServerHttp`
  from `lib/api/server.ts`. Never import the browser runtime, singleton, or browser
  services into server data loaders. Browser code uses `lib/api/browser.ts`.
- The `rockIt` singleton is a migration compatibility facade for existing playback
  and feature consumers. Reuse its proven behavior while migrating consumers to
  scoped providers; do not add server dependencies on it or new global state.
- Reuse shared HTTP, DTOs, models, and manager bases from `packages/shared/src/`.
  Use the aliases in `tsconfig.json`; several `@/` aliases resolve to shared code.
- App-only types belong in `apps/web/models/`; shared types belong in
  `packages/shared/src/models/`. Only component prop types may be co-located.

## Data, authentication, and state

- Reuse the generated typed HTTP boundary through the server/browser adapters.
  Fetch initial page data on the server; do not duplicate it in mount effects.
  Validate responses with generated Zod schemas from `@/dto`.
- Server-side fetches must forward the current session correctly. Client requests
  must include credentials. Use configured backend URLs, never hardcoded hosts.
- Do not cache private user data across users. Apply revalidation only where the
  endpoint and authentication permit it.
- Handle every unsuccessful HTTP/Result response before using its data. Use
  `notFound()` for missing page resources and `AppError` with route error boundaries
  for other server errors. Surface client errors through the notification manager.
- Use scoped Context for vocabulary/session and stable service references.
  Keep high-frequency playback state in narrow Nanostores subscriptions. Existing
  feature atoms remain compatible during migration; do not duplicate their ownership.
- Preserve queue, current media, playback-time, and download-progress synchronization.
- Use the vocabulary Context for visible client text and the server vocabulary
  resolver for server text. Dictionary data must exist on the first render. The
  vocabulary manager remains a runtime-notification compatibility adapter. Add
  feature-prefixed keys in the backend rather than hardcoding UI strings.

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
- Use semantic Tailwind tokens and reusable `components/ui/` primitives. Palette
  values belong in the central theme, preserving the Rockit pink brand. The custom `md:` breakpoint requires width ≥768px AND height ≥500px.
- Do not use raw `<input>` elements in feature components. Use an existing input
  component from `apps/web/components/ui/`, or create a reusable UI component there
  when the existing components do not support the required behavior. Raw `<input>`
  elements belong only inside these reusable UI components.
- Use a separate UI component for each input type (for example, `Input` for text,
  `PasswordInput`, and `FileInput`). Each component fixes its native input type
  internally and must not accept a `type` prop.
- Use the existing `skeleton` class for loading placeholders. Preserve safe-area
  handling and test narrow screens and short landscape viewports.
- Use passive touch listeners where appropriate for iOS scrolling; clean up listeners
  and subscriptions when components unmount.

## Feature workflow

1. Inspect the route, feature components, shared models, and relevant managers.
2. Keep server data/loading work in the route and interactions in a client wrapper.
3. Put domain behavior in a feature service/runtime adapter and reuse the typed HTTP boundary.
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
pnpm --filter @app/web test
pnpm --filter @app/web test:ssr  # after a production build; isolated local fixtures
```

Use typecheck and lint for code changes; build when routing, server rendering,
configuration, or bundling changes. For shared client changes, also run
`pnpm --filter @app/mobile typecheck` or the workspace `pnpm typecheck`.

Format edited source files with the repository Prettier configuration, for example
`pnpm exec prettier --write apps/web/components/Feature/FeatureClient.tsx`.
Use the installed formatter and plugins rather than global installs. The full
`pnpm check:frontend` gate installs dependencies, formats frontend source, runs
workspace type checks, and runs web lint; review any formatting changes it produces.

## Refactor tracking

After each completed migration step, update `docs/web/nextjs-refactor-progress.md`
with changes, checks, and remaining work. Do not mark runtime/browser acceptance
complete based only on type checks.

## User-facing text

- Always use vocabulary keys for user-facing text. Never hardcode labels,
  headings, button text, placeholders, validation/error/success messages, empty
  states, tooltips, or accessibility names such as `aria-label`/`accessibilityLabel`.
- Add missing keys to `Vocabulary.xlsx` and provide translations in every supported
  language, then regenerate vocabulary artifacts. Do not use inline English or
  other language strings as fallback labels; use the vocabulary fallback system.
- Product names, user-provided content, provider names, and numeric/symbol-only
  output may remain data. Localize surrounding descriptions and formatting.

## Reusable base UI location

- Put all reusable base UI components in `components/ui/`, including Popup,
  PopupMenu, ContextMenu, dialogs, buttons, fields, checkboxes and sliders.
- Feature directories compose these primitives. Keep media action policies and
  other domain logic outside `ui`; do not create competing feature-local popup
  surfaces, dismissal handlers, or focus-management implementations.
