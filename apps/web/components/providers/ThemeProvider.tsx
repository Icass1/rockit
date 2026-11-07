"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type JSX,
    type ReactNode,
} from "react";
import type { ThemePreference } from "@/dto";
import { resolveTheme } from "@rockit/theme";
import { DesignThemeProvider } from "@rockit/ui";
import type {
    ThemeContextValue,
    ThemeOverride,
} from "@/models/interfaces/themeContext";
import { DEFAULT_THEME, parseTheme, THEME_COOKIE } from "@/lib/theme";
import { UniversalStyleRegistry } from "@/components/providers/UniversalStyleRegistry";

const ThemeContext = createContext<ThemeContextValue>({
    preference: DEFAULT_THEME,
    applyPreference: () => {},
});

function subscribeSystemTheme(listener: () => void): () => void {
    const query = window.matchMedia?.("(prefers-color-scheme: light)");
    query?.addEventListener("change", listener);
    return () => query?.removeEventListener("change", listener);
}

function systemThemeIsLight(): boolean {
    return (
        window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false
    );
}

export function ThemeProvider({
    initial,
    children,
}: {
    initial: ThemePreference;
    children: ReactNode;
}): JSX.Element {
    const [replacement, setReplacement] = useState<ThemeOverride>();
    const systemLight = useSyncExternalStore(
        subscribeSystemTheme,
        systemThemeIsLight,
        () => false
    );
    const preference =
        replacement?.source === initial ? replacement.preference : initial;
    const applyPreference = useCallback(
        (value: ThemePreference): void => {
            setReplacement({ source: initial, preference: parseTheme(value) });
        },
        [initial]
    );
    useEffect(() => {
        document.documentElement.dataset.theme = preference;
        document.cookie = `${THEME_COOKIE}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }, [preference]);
    const value = useMemo(
        () => ({ preference, applyPreference }),
        [preference, applyPreference]
    );
    return (
        <ThemeContext value={value}>
            <UniversalStyleRegistry>
                <DesignThemeProvider
                    mode={resolveTheme(
                        preference,
                        systemLight ? "light" : "dark"
                    )}
                >
                    {children}
                </DesignThemeProvider>
            </UniversalStyleRegistry>
        </ThemeContext>
    );
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
