# Rockit Mobile — Step 1: App Shell & Tab Navigation

## Context

You are working on `frontend/apps/mobile/` — a new Expo + React Native app.
The web app lives in `frontend/apps/web/` and you can read it freely as a reference.
The backend is a FastAPI server. The AGENTS.md at the repo root documents all API routes.

## Your task for this session

Implement the **app shell**: root layout, tab navigation bar, safe areas, and
the nanostores connection. Nothing else. No screens yet, just the skeleton that
everything else will hang from.

---

## Critical rules — read before writing any code

### 1. React Native ≠ Web

| Web (apps/web)           | React Native (apps/mobile)                                         |
| ------------------------ | ------------------------------------------------------------------ |
| `<div>`                  | `<View>`                                                           |
| `<span>`, `<p>`          | `<Text>`                                                           |
| `<button onClick>`       | `<Pressable onPress>` or `<TouchableOpacity>`                      |
| `<img>` / `next/image`   | `<Image>` from `expo-image` (NOT react-native Image)               |
| `<a>` / `Link` from next | `<Link>` from `expo-router`                                        |
| CSS classes / Tailwind   | StyleSheet.create() or NativeWind                                  |
| `className="..."`        | `style={styles.foo}` or `className` if NativeWind is set up        |
| `window`, `document`     | Do NOT use these — they don't exist                                |
| `localStorage`           | `expo-secure-store` or `@react-native-async-storage/async-storage` |
| `useRouter` from next    | `useRouter` from `expo-router`                                     |

**Never import from `next/*`** in the mobile app.
**Never use HTML elements** (`div`, `span`, `p`, `button`, etc.) in React Native.

### 2. Safe Areas — mandatory on iOS and Android

Every screen that touches screen edges MUST use safe area insets.
Use `react-native-safe-area-context` which is already installed.

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

// Wrap screens that need safe area
export default function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {/* content */}
        </SafeAreaView>
    );
}
```

The tab bar handles bottom safe area automatically when using Expo Router Tabs.
For custom bottom bars: use `useSafeAreaInsets()` hook to get `insets.bottom`.

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

function CustomTabBar() {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ paddingBottom: insets.bottom + 8 }}>
            {/* tab bar content */}
        </View>
    );
}
```

### 3. Platform detection

```tsx
import { Platform } from 'react-native';

// Check platform
if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }

// Inline platform styles
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  }
});

// Platform.select for multiple values
const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25 },
  android: { elevation: 4 },
});
```

### 4. Expo Router file structure

```
app/
├── _layout.tsx          ← ROOT LAYOUT — fonts, providers, root Stack
├── index.tsx            ← Redirect to /(tabs) or /login
├── login.tsx            ← Login screen (outside tabs)
├── register.tsx         ← Register screen (outside tabs)
├── (tabs)/
│   ├── _layout.tsx      ← Tab bar definition
│   ├── index.tsx        ← Home tab
│   ├── library.tsx      ← Library tab
│   ├── search.tsx       ← Search tab
│   ├── downloader.tsx   ← Downloader tab
│   └── settings.tsx     ← Settings tab
└── (modals)/            ← Screens that push as modals over tabs
    ├── song/[publicId].tsx
    ├── album/[publicId].tsx
    ├── artist/[id].tsx
    └── playlist/[publicId].tsx
```

**Key rules:**

- Every directory that has pages MUST have a `_layout.tsx`
- `(groups)` in parentheses don't add URL segments
- `[param]` is a dynamic route
- Files in `app/` are routes. Files in `components/`, `hooks/`, `lib/` are NOT routes.

### 5. Root layout \_layout.tsx

This is where providers go. It runs before any screen.

```tsx
// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen
                    name="register"
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="(modals)"
                    options={{ presentation: "modal" }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}
```

### 6. Tab layout (tabs)/\_layout.tsx

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#262626',
        },
        tabBarActiveTintColor: '#ee1086',
        tabBarInactiveTintColor: '#737373',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ... }} />
      {/* etc */}
    </Tabs>
  );
}
```

### 7. Nanostores — same as web, no changes needed

`@nanostores/react` works identically in React Native:

```tsx
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt"; // points to apps/mobile/lib/

const $playing = useStore(rockIt.audioManager.playingAtom);
```

The `lib/managers/` in mobile will be a copy/adaptation of the web managers.
For now, start with stub managers that return mock data.

### 8. Styling approach — StyleSheet (no NativeWind for now)

Use `StyleSheet.create()` for all styles. NativeWind requires additional setup
and is not configured yet. Match the Rockit color palette:

```tsx
const COLORS = {
    bg: "#0b0b0b",
    surface: "#1a1a1a",
    surface2: "#262626",
    pink: "#ee1086",
    pinkMid: "#f53a76",
    pinkLight: "#fb6467",
    textPrimary: "#ffffff",
    textSecondary: "#a3a3a3",
    textMuted: "#737373",
};
```

### 9. expo-image instead of next/image or react-native Image

```tsx
import { Image } from "expo-image";

// expo-image has better caching, blurhash, and performance
<Image
    source={{ uri: song.imageUrl }}
    style={{ width: 56, height: 56, borderRadius: 8 }}
    contentFit="cover"
    transition={200}
/>;
```

### 10. No console.log in production code

Remove all console.log/warn before the task is complete.

---

## What to build in this session

### Task: App Shell

Build these files in `frontend/apps/mobile/`:

#### 1. `app/_layout.tsx` — Root layout

- `SafeAreaProvider` wrapper
- `StatusBar` set to light
- Root `Stack` with `headerShown: false` on all screens
- Screens: `(tabs)`, `login`, `register`
- Initialize rockIt on mount (stub for now — just set vocabulary atom)

#### 2. `app/index.tsx` — Entry redirect

- Redirect immediately to `/(tabs)`
- Later this will check auth and redirect to `/login` if not authenticated

#### 3. `app/(tabs)/_layout.tsx` — Tab bar

Replicate the web's `NavigationMobile` tabs:

- Home (house icon)
- Library (library icon)
- Search (search icon)
- Downloader (download icon)
- Settings (settings icon)

Tab bar style:

- Background: `#1a1a1a`
- Active tint: `#ee1086`
- Inactive tint: `#737373`
- Border top: `#262626`, 1px
- No header on any tab (`headerShown: false`)
- Show labels on iOS, hide on Android (use `tabBarShowLabel: Platform.OS === 'ios'`)

#### 4. `app/(tabs)/index.tsx` — Home placeholder

- Dark background `#0b0b0b`
- Centered text "Home — coming soon"
- Use `SafeAreaView` with `edges={['top']}`

#### 5. `app/(tabs)/library.tsx` — Library placeholder

Same as above, "Library — coming soon"

#### 6. `app/(tabs)/search.tsx` — Search placeholder

Same pattern

#### 7. `app/(tabs)/downloader.tsx` — Downloader placeholder

Same pattern

#### 8. `app/(tabs)/settings.tsx` — Settings placeholder

Same pattern

#### 9. `constants/colors.ts`

Export the `COLORS` object from section 8 above.

#### 10. `constants/api.ts`

```ts
export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
```

---

## What NOT to do

- Do NOT install NativeWind (not set up yet)
- Do NOT connect to the real API (stub everything)
- Do NOT import anything from `apps/web/` — the mobile app is independent
- Do NOT use `className=` prop (NativeWind not configured)
- Do NOT use `<div>`, `<span>`, `<p>`, `<button>`, `<img>`
- Do NOT use `window`, `document`, `localStorage`
- Do NOT add screens beyond the placeholders listed above
- Do NOT implement any real functionality yet

---

## Reference: web NavigationMobile tab order

From `apps/web/components/Navigation/NavigationMobile.tsx`:

```
Home     → href="/"
Library  → href="/library"
Search   → href="/search"
Downloader → href="/downloader" (mapped from downloads icon)
Settings → href="/settings"
```

Use lucide icons from `lucide-react-native` (already installed):
`Home`, `Library`, `Search`, `Download`, `Settings`

Import pattern:

```tsx
import { Home } from "lucide-react-native";
```

---

## Verification checklist before finishing

- [ ] `pnpm start` runs without errors in `frontend/apps/mobile/`
- [ ] Tab bar is visible at the bottom on iOS simulator
- [ ] Active tab shows pink (`#ee1086`) color
- [ ] All 5 placeholder screens render
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console.log anywhere
- [ ] Safe area insets are respected (content not hidden behind home indicator)
