// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const BaseLyricsResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    lines: z.array(z.string()),
});

export type BaseLyricsResponse = z.infer<typeof BaseLyricsResponseSchema>;
