import { z } from "zod";

export const BasePlaylistForPlaylistResponseSchema = z.object({
    type: z.union([z.literal("playlist")]),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    owner: z.string(),
    description: z.string().nullable(),
    itemCount: z.number(),
});

export type BasePlaylistForPlaylistResponse = z.infer<
    typeof BasePlaylistForPlaylistResponseSchema
>;
