// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";

export const YoutubeMusicAlbumResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
    dominantColor: z.string(),
    undownloadedCount: z.number().default(0),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
    offset: z.number().default(0),
    limit: z.number().default(100),
    total: z.number().default(0),
    hasMore: z.boolean().default(false),
    youtubeId: z.string(),
    year: z.number().nullable(),
});

export type YoutubeMusicAlbumResponse = z.infer<
    typeof YoutubeMusicAlbumResponseSchema
>;
