// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const MediaExpandedMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
    playlistPublicId: z.string(),
    expanded: z.boolean(),
});

export type MediaExpandedMessageRequest = z.infer<
    typeof MediaExpandedMessageRequestSchema
>;
