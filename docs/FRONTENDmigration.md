# Mobile App Shell — Step 1

## Context

Working on `frontend/apps/mobile/` (Expo + React Native). Reference web in `frontend/apps/web/`. Backend: FastAPI. See AGENTS.md for API routes.

Task: implement app shell (root layout, tab nav, safe areas, nanostores). Just skeleton, no screens yet.

---

## Critical Rules

### 1. React Native ≠ Web

| Web              | RN                                 |
| ---------------- | ---------------------------------- |
| <div>            | <View>                             |
| <span>, <p>      | <Text>                             |
| <button onClick> | <Pressable onPress>                |
| <img>            | <Image> from expo-image            |
| <a>, Link        | <Link> from expo-router            |
| CSS, Tailwind    | StyleSheet.create()                |
| window, document | DO NOT USE                         |
| localStorage     | expo-secure-store or async-storage |
| useRouter (next) | useRouter (expo-router)            |

NEVER import from next/\* in mobile. NEVER use HTML elements.

### 2. Safe Areas — mandatory

Use react-native-safe-area-context:

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {/* content */}
        </SafeAreaView>
    );
}
```

Tab bar handles bottom safe area. Custom: useSafeAreaInsets()

### 3. Platform detection

```tsx
if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? 24 : 0 }
});
```

### 4. Expo Router structure

```
app/
├── _layout.tsx      (ROOT — fonts, providers, Stack)
├── index.tsx        (redirect to tabs/login)
├── login.tsx        (public)
├── register.tsx    (public)
├── (tabs)/
│   ├── _layout.tsx (tab bar)
│   ├── index.tsx   (home)
│   ├── library.tsx
│   ├── search.tsx
│   ├── downloader.tsx
│   ├── settings.tsx
│   └── (modals)/
```

Rules: every dir with pages needs \_layout.tsx. (groups) don't add URL. [param] is dynamic.

### 5. Root layout \_layout.tsx

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
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
import { Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#1a1a1a",
                    borderTopColor: "#262626",
                },
                tabBarActiveTintColor: "#ee1086",
                tabBarInactiveTintColor: "#737373",
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            {/* etc */}
        </Tabs>
    );
}
```

### 7. Nanostores — same as web

```tsx
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
```

### 8. StyleSheet (no NativeWind yet)

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

### 9. expo-image

```tsx
import { Image } from "expo-image";

<Image source={{ uri }} style={{ width: 56, height: 56 }} contentFit="cover" />;
```

### 10. No console.log in production

---

## What to Build

### 1. app/\_layout.tsx

SafeAreaProvider, StatusBar light, Stack, screens: (tabs), login, register, (modals). Initialize rockIt on mount.

### 2. app/index.tsx

Redirect to /(tabs). Later: check auth, redirect to /login if not.

### 3. app/(tabs)/\_layout.tsx

Tabs: Home, Library, Search, Downloader, Settings. Style: bg #1a1a, active pink #ee1086, inactive #737373, border #262626. No header. iOS show labels, Android hide.

### 4. app/(tabs)/index.tsx (Home placeholder)

Bg #0b0b0b, centered "Home — coming soon", SafeAreaView top

### 5. app/(tabs)/library.tsx

Same placeholder

### 6. app/(tabs)/search.tsx

Same placeholder

### 7. app/(tabs)/downloader.tsx

Same placeholder

### 8. app/(tabs)/settings.tsx

Same placeholder

### 9. constants/colors.ts

Export COLORS

### 10. constants/api.ts

```ts
export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
```

---

## What NOT

- NOT NativeWind
- NOT real API (stub)
- NOT import from apps/web/
- NOT className=
- NOT HTML elements
- NOT window, document, localStorage
- NOT beyond placeholders
- NOT real functionality

---

## Tab Order

Home → /, Library → /library, Search → /search, Downloader → /downloader, Settings → /settings

Icons: lucide-react-native (Home, Library, Search, Download, Settings)
