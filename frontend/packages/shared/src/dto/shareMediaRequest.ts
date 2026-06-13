// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ShareMediaRequestSchema = z.object({
    recipientPublicId: z.string(),
    mediaPublicId: z.string(),
    message: z.string().nullable(),
});

export type ShareMediaRequest = z.infer<typeof ShareMediaRequestSchema>;
