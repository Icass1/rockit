// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const LyricsResponseSchema = z.object({
    id: z.number(),
    name: z.string().default(""),
    trackName: z.string(),
    artistName: z.string(),
    albumName: z.string().default(""),
    duration: z.number().default(0),
    instrumental: z.boolean().default(false),
    hasWordSync: z.boolean().default(false),
    plainLyrics: z.string().nullable().default(null),
    syncedLyrics: z.string().nullable().default(null),
    lyricsfile: z.string().nullable().default(null),
});

export type LyricsResponse = z.infer<typeof LyricsResponseSchema>;
