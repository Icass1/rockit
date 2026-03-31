import { z } from "zod";

export const UserStatsRequestSchema = z.object({
    range: z
        .union([
            z.literal("7d"),
            z.literal("30d"),
            z.literal("1y"),
            z.literal("custom"),
        ])
        .default("7d"),
    start: z.string().nullable(),
    end: z.string().nullable(),
});

export type UserStatsRequest = z.infer<typeof UserStatsRequestSchema>;
