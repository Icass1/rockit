# Frontend Mobile Skill (Expo React Native)

## Architecture Overview
- Expo SDK with React Native
- TypeScript with strict mode
- Navigation: Expo file-based routing (app/)
- State Management: Nanostores
- UI: Native components with some web-like styling via tailwind-rn (if used) or StyleSheet
- Validation: Zod (shared with web)
- Internationalization: Shared vocabulary via backend

## Key Conventions

### File Structure
```
frontend/
└── apps/
    └── mobile/                   # Expo app
        ├── app/                  # Expo file-based routing
        │   ├── _layout.tsx       # Root layout (providers, auth check)
        │   ├── (tabs)/           # Tab navigation (home, library, etc.)
        │   │   ├── index.tsx     # Home tab
        │   │   ├── library.tsx   # Library tab
        │   │   └── ...           # Other tabs
        │   ├── modal.tsx         # Global modal container
        │   └── ...               # Other routes (login, register, etc.)
        ├── components/           # Reusable components
        │   ├── Home/             # Home tab components
        │   ├── Library/          # Library tab components
        │   ├── Player/           # Mini player, full player
        │   ├── Search/           # Search components
        │   └── ...               # Other feature components
        ├── lib/                  # Libraries and utilities
        │   ├── managers/         # Manager classes (similar to web but adapted for mobile)
        │   ├── hooks/            # Custom React hooks
        │   ├── utils/            # apiFetch, getTime, etc.
        │   ├── rockit/           # RockIt singleton (same instance as web)
        │   └── store.ts          # nanostores helpers
        ├── models/               # TypeScript types and enums (shared with web)
        │   └── enums/            # EContentType, EFilterMode, etc. (shared)
        ├── assets/               # Images, icons, fonts
        │   ├── images/
        │   ├── icons/
        │   └── fonts/
        └── package.json
```

### Routing
- File-based routing in `app/` directory (Expo Router)
- `_layout.tsx` is the root layout (similar to Next.js root layout)
- Route groups: `(tabs)` for tab navigation, `(auth)` for auth flows, etc.
- Use `Link` from `expo-router` for navigation, or `router.push()` from `expo-router`

### Navigation Patterns
- Tabs: Bottom tab navigator for main app sections
- Modals: Use `modal.tsx` as a container for modals (login, register, etc.)
- Stack navigation: Can be used within tabs for deeper navigation (e.g., song detail from library)

### State Management
- Nanostores: same as web (`createAtom`, `createArrayAtom`, `useStore`)
- Global `rockIt` singleton is shared between web and mobile (same instance)
- Managers are adapted for mobile where necessary (e.g., `mediaPlayerManager` uses expo-av)

### Data Fetching
- Use `apiFetch` from `@/lib/utils/apiFetch` (same as web)
- Supports both client-side and server-side (for SSR in web, mobile is always client)
- Always validate responses with Zod schemas from `@/dto` (shared)
- Use `useFetch` hook for client-side data fetching (same signature as web)

### Components
- Use native components: `View`, `Text`, `Image`, `TouchableOpacity`, `FlatList`, `SectionList`, etc.
- For web-like styling, can use `tailwind-rn` if configured, otherwise use `StyleSheet`
- Follow the same feature-based organization as web
- Client Components: In mobile, all components are client components (no server concept)
- Hooks: Same as web (`use*.ts`)

### Styling
- If using `tailwind-rn`: same Tailwind classes as web
- Otherwise: Use `StyleSheet.create()` with styles objects
- Shared constants: Can define colors, spacing in a shared theme file
- Platform-specific styling: Use `Platform.select()` or check `Platform.OS`

### Image Handling
- Use `expo-image` or `react-native-fast-image` for performance
- Local assets: `require('./path/to/image.png')`
- Remote images: `<Image source={{uri: imageUrl}} />`
- Consider using caching and placeholders

### Icons
- Use `expo-vector-icons` or `@expo/vector-icons`
- Commonly used: `MaterialCommunityIcons`, `MaterialIcons`, `FontAwesome5`

### Platform-Specific Code
- Import `Platform` from `react-native`
- Use `Platform.OS` to check for 'ios' or 'android'
- Use `Platform.select()` for platform-specific styles or components

### Permissions
- For media playback, recording, etc., may need permissions
- Use `expo-permissions` to check and request permissions
- Handle permission denied gracefully

### Deep Linking
- Configure in `app.json` or `app.config.js`
- Handle incoming links in root layout or using `expo-linking`

### Analytics and Logging
- Avoid `console.log` in production
- Use proper logging service if needed
- For errors, use `rockIt.notificationManager.notifyError()` or equivalent

### RockIt Singleton (same as web)
Access all functionality through:
```tsx
import { rockIt } from "@/lib/rockit/rockIt";

// Same as web: mediaPlayerManager, queueManager, userManager, etc.
```

### Managers Reference (Mobile Adaptations)
Managers in `@/lib/managers/` may have mobile-specific implementations:
- `mediaPlayerManager`: Uses `expo-av` for audio playback
- `downloaderManager`: May use `BackgroundFetch` or `TaskManager` for background downloads
- `webSocketManager`: Uses `websocket` library compatible with React Native
- `indexedDBManager`: May use `SQLite` or `AsyncStorage` for local persistence
- `serviceWorkerManager`: Not applicable on mobile (use `expo-updates` or similar for OTA updates)
- Other managers are largely similar to web

### Critical Rules for Mobile
1. **NEVER** use web-only APIs (window, document, localStorage) without checking `Platform.OS === 'web'` (if web support) or using alternatives
2. **NEVER** block the main thread with heavy computations - use `InteractionManager` or `setTimeout`
3. **ALWAYS** provide fallback for missing platform features
4. **NEVER** use `console.log` in production - use proper logging
5. **ALWAYS** test on both iOS and Android simulators/devices
6. **NEVER** forget to handle permissions (especially for media, storage, notifications)
7. **ALWAYS** optimize images and assets for mobile performance
8. **NEVER** use large lists without virtualization (`FlatList` with `removeClippedSubviews`)
9. **ALWAYS** follow platform-specific design guidelines (iOS Human Interface, Android Material)
10. **NEVER** edit shared DTOs manually - they are auto-generated from backend