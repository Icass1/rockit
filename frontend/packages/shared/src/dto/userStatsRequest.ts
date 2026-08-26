// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserStatsRequestSchema = z.object({
    range: z
        .union([
            z.literal("7d"),
            z.literal("30d"),
            z.literal("1y"),
            z.literal("all"),
            z.literal("custom"),
        ])
        .default("7d"),
    start: z.iso.datetime().nullable(),
    end: z.iso.datetime().nullable(),
});

export type UserStatsRequest = z.infer<typeof UserStatsRequestSchema>;
