// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ContentRatingBackfillRequestSchema = z.object({
    after: z.string().default(""),
    limit: z.number().default(25),
});

export type ContentRatingBackfillRequest = z.infer<
    typeof ContentRatingBackfillRequestSchema
>;
