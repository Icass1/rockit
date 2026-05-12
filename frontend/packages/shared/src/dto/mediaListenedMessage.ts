// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const MediaListenedMessageSchema = z.object({
    type: z.union([z.literal("media_listened")]).default("media_listened"),
    publicId: z.string(),
});

export type MediaListenedMessage = z.infer<typeof MediaListenedMessageSchema>;
