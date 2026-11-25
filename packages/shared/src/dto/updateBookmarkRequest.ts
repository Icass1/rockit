// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateBookmarkRequestSchema = z.object({
    timestamp: z.number().nullable().default(null),
    description: z.string().nullable().default(null),
    mode: z
        .enum([
            "NOTHING",
            "AUTOSKIP",
            "REPEAT_FROM_BEGINNING",
            "PREVIOUS_BOOKMARK",
        ])
        .nullable()
        .default(null),
});

export type UpdateBookmarkRequest = z.infer<typeof UpdateBookmarkRequestSchema>;
