// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const LyricsResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    trackName: z.string(),
    artistName: z.string(),
    albumName: z.string(),
    duration: z.number(),
    instrumental: z.boolean(),
    plainLyrics: z.string().nullable(),
    syncedLyrics: z.string().nullable(),
    lyricsfile: z.string().nullable(),
});

export type LyricsResponse = z.infer<typeof LyricsResponseSchema>;
