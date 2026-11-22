// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { PlaybackLyricsLineSchema } from "./playbackLyricsLine";

export const StoredLyricsSourceSchema = z.object({
    kind: z.union([z.literal("lyrics_source")]),
    provider: z.union([z.literal("LRCLIB")]),
    sourceId: z.number(),
    trackName: z.string(),
    artistName: z.string(),
    albumName: z.string().default(""),
    duration: z.number(),
    offset: z.number().default(0),
    lines: z.array(z.lazy(() => PlaybackLyricsLineSchema)),
});

export type StoredLyricsSource = z.infer<typeof StoredLyricsSourceSchema>;
