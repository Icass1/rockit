// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const BaseDynamicLyricsItemSchema = z.object({
    text: z.string(),
    timestamp_s: z.number(),
});

export type BaseDynamicLyricsItem = z.infer<typeof BaseDynamicLyricsItemSchema>;
