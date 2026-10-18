// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { DynamicLyricsItemSchema } from "./dynamicLyricsItem";
import { LyricsItemSchema } from "./lyricsItem";

export const GetLyricsResponseSchema = z.object({
    lyrics: z.array(z.lazy(() => LyricsItemSchema)).nullable(),
    dynamicLyrics: z.array(z.lazy(() => DynamicLyricsItemSchema)).nullable(),
});

export type GetLyricsResponse = z.infer<typeof GetLyricsResponseSchema>;
