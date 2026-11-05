// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ThemePreferenceSchema = z.union([
    z.literal("dark"),
    z.literal("light"),
    z.literal("system"),
]);

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;
