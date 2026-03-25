import { z } from "zod";
import { PlaylistContributorResponseSchema } from "./playlistContributorResponse";

export const BasePlaylistResponseSchema = z.object({
    type: z.union([z.literal("playlist")]).default("playlist"),
    description: z.string().nullable(),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    medias: z.array(z.union([z.any(), z.any(), z.any(), z.any(), z.any()])),
    contributors: z.array(z.lazy(() => PlaylistContributorResponseSchema)),
    imageUrl: z.string(),
    owner: z.string(),
});

export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;
