// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LyricsItemSchema = z.object({
    text: z.string(),
});

export type LyricsItem = z.infer<typeof LyricsItemSchema>;
