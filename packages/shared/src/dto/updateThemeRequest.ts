// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateThemeRequestSchema = z.object({
    theme: z.union([
        z.literal("dark"),
        z.literal("light"),
        z.literal("system"),
    ]),
});

export type UpdateThemeRequest = z.infer<typeof UpdateThemeRequestSchema>;
