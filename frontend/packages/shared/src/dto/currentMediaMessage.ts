// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentMediaMessageSchema = z.object({
    type: z.union([z.literal("current_media")]).default("current_media"),
    mediaPublicId: z.string(),
    queueMediaId: z.number(),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type CurrentMediaMessage = z.infer<typeof CurrentMediaMessageSchema>;
