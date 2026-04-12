// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";

export const BaseAlbumWithSongsResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
});

export type BaseAlbumWithSongsResponse = z.infer<
    typeof BaseAlbumWithSongsResponseSchema
>;
