import type { ThemePreference } from "@/dto";

export interface ThemeContextValue {
    preference: ThemePreference;
    applyPreference(preference: ThemePreference): void;
}

export interface ThemeOverride {
    source: ThemePreference;
    preference: ThemePreference;
}
