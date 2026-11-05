import { ThemePreferenceSchema, type ThemePreference } from "@/dto";

export const THEME_COOKIE = "rockit-theme";
export const DEFAULT_THEME: ThemePreference = "dark";

export function parseTheme(value: unknown): ThemePreference {
    const parsed = ThemePreferenceSchema.safeParse(value);
    return parsed.success ? parsed.data : DEFAULT_THEME;
}
