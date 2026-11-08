// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ContentRatingResponseSchema = z.object({
    publicId: z.string(),
    explicit: z.boolean().nullable(),
    source: z.string().nullable(),
    manual: z.boolean(),
});

export type ContentRatingResponse = z.infer<typeof ContentRatingResponseSchema>;
