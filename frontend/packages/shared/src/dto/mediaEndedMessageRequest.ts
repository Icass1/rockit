// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const MediaEndedMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
});

export type MediaEndedMessageRequest = z.infer<
    typeof MediaEndedMessageRequestSchema
>;
