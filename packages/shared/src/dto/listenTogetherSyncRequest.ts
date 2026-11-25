// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherSyncRequestSchema = z.object({
    sessionPublicId: z.string(),
    mediaPublicId: z.string().nullable().default(null),
    currentTimeMs: z.number().nullable().default(null),
    isPlaying: z.boolean().nullable().default(null),
    queue: z.array(z.string()).nullable().default(null),
});

export type ListenTogetherSyncRequest = z.infer<
    typeof ListenTogetherSyncRequestSchema
>;
