// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationResponseSchema = z.object({
    id: z.string(),
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
    key: z.string(),
    detail: z.string().nullable(),
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
