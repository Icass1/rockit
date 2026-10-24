// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LegacyNotificationRequestSchema = z.object({
    id: z.number(),
    message: z.string(),
    type: z.number(),
    category: z.union([
        z.literal("activity"),
        z.literal("download"),
        z.literal("import"),
        z.literal("release"),
    ]),
    createdAt: z.number(),
    read: z.boolean(),
    key: z.string().nullable(),
    detail: z.string().nullable(),
});

export type LegacyNotificationRequest = z.infer<
    typeof LegacyNotificationRequestSchema
>;
