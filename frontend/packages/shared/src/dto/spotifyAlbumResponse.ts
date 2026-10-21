// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";
import { SpotifyExternalImageResponseSchema } from "./spotifyExternalImageResponse";

export const SpotifyAlbumResponseSchema = z.object({
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
    spotifyId: z.string(),
    externalImages: z.array(z.lazy(() => SpotifyExternalImageResponseSchema)),
});

export type SpotifyAlbumResponse = z.infer<typeof SpotifyAlbumResponseSchema>;
