"use client";

import { useState, type JSX } from "react";
import { ThemePreferenceSchema } from "@/dto";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function ThemeSetting(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const session = useSession();
    const { preference } = useTheme();
    const vocabulary = useVocabulary();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    return (
        <div className="flex flex-col gap-2" aria-busy={saving}>
            <label
                htmlFor="theme-select"
                className="text-foreground text-sm font-medium"
            >
                {vocabulary.SETTINGS_THEME}
            </label>
            <p id="theme-description" className="text-muted-foreground text-sm">
                {vocabulary.SETTINGS_THEME_DESCRIPTION}
            </p>
            <select
                id="theme-select"
                value={session?.theme ?? preference}
                disabled={!session || saving}
                aria-describedby="theme-description theme-status"
                className="border-border bg-input text-foreground focus-visible:outline-ring w-full rounded-xl border px-4 py-2.5 focus-visible:outline-2 disabled:opacity-50"
                onChange={async (event): Promise<void> => {
                    const parsed = ThemePreferenceSchema.safeParse(
                        event.currentTarget.value
                    );
                    if (!parsed.success) return;
                    setSaving(true);
                    setSaved(false);
                    try {
                        setSaved(await userManager.setThemeAsync(parsed.data));
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <option value="dark">{vocabulary.SETTINGS_THEME_DARK}</option>
                <option value="light">{vocabulary.SETTINGS_THEME_LIGHT}</option>
                <option value="system">
                    {vocabulary.SETTINGS_THEME_SYSTEM}
                </option>
            </select>
            <p
                id="theme-status"
                role="status"
                className="text-muted-foreground min-h-5 text-sm"
            >
                {saving
                    ? vocabulary.SETTINGS_THEME_SAVING
                    : saved
                      ? vocabulary.SETTINGS_THEME_SAVED
                      : ""}
            </p>
        </div>
    );
}
