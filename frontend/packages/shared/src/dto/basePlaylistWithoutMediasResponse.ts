// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { PlaylistContributorSchema } from "./playlistContributor";

export const BasePlaylistWithoutMediasResponseSchema = z.object({
    type: z.union([z.literal("playlist")]).default("playlist"),
    description: z.string().nullable(),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    contributors: z.array(z.lazy(() => PlaylistContributorSchema)),
    imageUrl: z.string(),
    owner: z.lazy(() => BaseArtistResponseSchema),
    dateAdded: z.iso.datetime().nullable(),
});

export type BasePlaylistWithoutMediasResponse = z.infer<
    typeof BasePlaylistWithoutMediasResponseSchema
>;
