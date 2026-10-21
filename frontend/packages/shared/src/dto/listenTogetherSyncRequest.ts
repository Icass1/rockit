// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListenTogetherSyncRequestSchema = z.object({
    sessionPublicId: z.string(),
    mediaPublicId: z.string().nullable(),
    currentTimeMs: z.number().nullable(),
    isPlaying: z.boolean().nullable(),
    queue: z.array(z.string()).nullable(),
});

export type ListenTogetherSyncRequest = z.infer<
    typeof ListenTogetherSyncRequestSchema
>;
