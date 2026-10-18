// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseDynamicLyricsItemSchema } from "./baseDynamicLyricsItem";

export const BaseDynamicLyricsResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    offset: z.number(),
    lines: z.array(z.lazy(() => BaseDynamicLyricsItemSchema)),
});

export type BaseDynamicLyricsResponse = z.infer<
    typeof BaseDynamicLyricsResponseSchema
>;
