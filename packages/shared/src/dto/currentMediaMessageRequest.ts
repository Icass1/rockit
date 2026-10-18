// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentMediaMessageRequestSchema = z.object({
    currentTimeMs: z.number().default(0),
    playbackId: z.string(),
    queueMediaId: z.number(),
    mediaPublicId: z.string(),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type CurrentMediaMessageRequest = z.infer<
    typeof CurrentMediaMessageRequestSchema
>;
