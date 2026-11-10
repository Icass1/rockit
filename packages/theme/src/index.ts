import tokens from "./tokens.json";

export type ThemeMode = keyof typeof tokens.themes;
export type ThemePreference = ThemeMode | "system";
export type ThemeColors = typeof tokens.themes.dark;

export const designTokens = tokens;
export const DEFAULT_THEME: ThemePreference = "dark";
export const THEME_COOKIE = "rockit-theme";

export function parseTheme(value: unknown): ThemePreference {
    return value === "light" || value === "system" ? value : DEFAULT_THEME;
}

export function resolveTheme(
    preference: ThemePreference,
    system: ThemeMode = "dark"
): ThemeMode {
    return preference === "system" ? system : preference;
}

export function getTheme(mode: ThemeMode): ThemeColors {
    return { ...tokens.themes.dark, ...tokens.themes[mode] };
}

/** Apply opacity to a semantic color without embedding a second palette. */
export function withAlpha(color: string, alpha: number): string {
    const hex = color.replace(/^#/, "");
    if (!/^[\da-f]{6}$/i.test(hex) || !Number.isFinite(alpha)) return color;
    const value = Number.parseInt(hex, 16);
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Compatibility names until existing native presenters use semantic roles. */
export function getLegacyColors(mode: ThemeMode = "dark") {
    const theme = getTheme(mode);
    return {
        bg: theme.background,
        bgCard: theme.secondary,
        bgCardLight: theme["surface-raised"],
        accent: theme.primary,
        accentMid: theme["brand-mid"],
        accentLight: theme["brand-light"],
        white: theme["foreground-strong"],
        gray400: theme["muted-foreground"],
        gray600: theme["disabled-foreground"],
        gray800: theme["border-subtle"],
    };
}

export function getBookmarkColors(mode: ThemeMode) {
    const colors = getTheme(mode);
    return {
        NOTHING: colors["bookmark-none"],
        AUTOSKIP: colors["bookmark-autoskip"],
        REPEAT_FROM_BEGINNING: colors["bookmark-repeat"],
        PREVIOUS_BOOKMARK: colors["bookmark-previous"],
    } as Record<string, string>;
}
