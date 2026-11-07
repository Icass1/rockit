"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
    designTokens,
    getLegacyColors,
    getTheme,
    type ThemeMode,
} from "@rockit/theme";

export function createDesignTheme(mode: ThemeMode) {
    return {
        mode,
        colors: getTheme(mode),
        legacy: getLegacyColors(mode),
        spacing: designTokens.spacing,
        radius: designTokens.radius,
        typography: designTokens.typography,
        motion: designTokens.motion,
        layout: designTokens.layout,
    };
}

export type DesignTheme = ReturnType<typeof createDesignTheme>;

const ThemeContext = createContext(createDesignTheme("dark"));

/** Applications resolve OS/preferences; presenters only consume semantic tokens. */
export function DesignThemeProvider({
    mode,
    children,
}: {
    mode: ThemeMode;
    children: ReactNode;
}) {
    const theme = useMemo(() => createDesignTheme(mode), [mode]);
    return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useDesignTheme(): DesignTheme {
    return useContext(ThemeContext);
}

export function useThemedStyles<T>(factory: (theme: DesignTheme) => T): T {
    const theme = useDesignTheme();
    return useMemo(() => factory(theme), [factory, theme]);
}
