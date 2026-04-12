// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const SeekMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
    timeFrom: z.number(),
    timeTo: z.number(),
});

export type SeekMessageRequest = z.infer<typeof SeekMessageRequestSchema>;
