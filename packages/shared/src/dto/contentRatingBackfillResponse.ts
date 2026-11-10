// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ContentRatingBackfillResponseSchema = z.object({
    nextAfter: z.string(),
    hasMore: z.boolean(),
    examined: z.number(),
    processed: z.number(),
});

export type ContentRatingBackfillResponse = z.infer<
    typeof ContentRatingBackfillResponseSchema
>;
