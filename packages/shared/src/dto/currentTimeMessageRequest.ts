// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentTimeMessageRequestSchema = z.object({
    playbackId: z.string(),
    queueMediaId: z.number(),
    currentTimeMs: z.number(),
    mediaPublicId: z.string(),
});

export type CurrentTimeMessageRequest = z.infer<
    typeof CurrentTimeMessageRequestSchema
>;
