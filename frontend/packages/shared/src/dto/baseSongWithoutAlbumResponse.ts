// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";

export const BaseSongWithoutAlbumResponseSchema = z.object({
    type: z.union([z.literal("song")]).default("song"),
    provider: z.string(),
    publicId: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.string().nullable(),
    downloaded: z.boolean(),
    imageUrl: z.string(),
    duration_ms: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    dateAdded: z.iso.datetime().nullable(),
});

export type BaseSongWithoutAlbumResponse = z.infer<
    typeof BaseSongWithoutAlbumResponseSchema
>;
