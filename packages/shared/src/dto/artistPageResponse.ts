// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";

export const ArtistPageResponseSchema = z.object({
    artist: z.lazy(() => BaseArtistResponseSchema),
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)).default([]),
    albums: z
        .array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema))
        .default([]),
    relatedArtists: z.array(z.lazy(() => BaseArtistResponseSchema)).default([]),
    totalSongs: z.number().default(0),
    totalAlbums: z.number().default(0),
    offset: z.number().default(0),
    hasMore: z.boolean().default(false),
    partial: z.boolean().default(false),
});

export type ArtistPageResponse = z.infer<typeof ArtistPageResponseSchema>;
