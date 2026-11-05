"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type JSX,
    type ReactNode,
} from "react";
import type { ThemePreference } from "@/dto";
import type {
    ThemeContextValue,
    ThemeOverride,
} from "@/models/interfaces/themeContext";
import { DEFAULT_THEME, parseTheme, THEME_COOKIE } from "@/lib/theme";

const ThemeContext = createContext<ThemeContextValue>({
    preference: DEFAULT_THEME,
    applyPreference: () => {},
});

export function ThemeProvider({
    initial,
    children,
}: {
    initial: ThemePreference;
    children: ReactNode;
}): JSX.Element {
    const [replacement, setReplacement] = useState<ThemeOverride>();
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
    return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
