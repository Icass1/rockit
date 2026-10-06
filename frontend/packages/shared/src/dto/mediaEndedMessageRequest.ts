// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const MediaEndedMessageRequestSchema = z.object({
    playbackId: z.string(),
    queueMediaId: z.number(),
    mediaPublicId: z.string(),
});

export type MediaEndedMessageRequest = z.infer<
    typeof MediaEndedMessageRequestSchema
>;
