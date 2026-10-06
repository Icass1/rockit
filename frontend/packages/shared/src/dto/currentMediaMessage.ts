// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentMediaMessageSchema = z.object({
    type: z.union([z.literal("current_media")]).default("current_media"),
    isPlaybackOwner: z.boolean().default(false),
    playbackId: z.string(),
    currentTimeMs: z.number().default(0),
    mediaPublicId: z.string(),
    queueMediaId: z.number(),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type CurrentMediaMessage = z.infer<typeof CurrentMediaMessageSchema>;
