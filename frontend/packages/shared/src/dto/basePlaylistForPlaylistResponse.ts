// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const BasePlaylistForPlaylistResponseSchema = z.object({
    type: z.union([z.literal("playlist")]).default("playlist"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    owner: z.string(),
    description: z.string().nullable(),
    itemCount: z.number().default(0),
});

export type BasePlaylistForPlaylistResponse = z.infer<
    typeof BasePlaylistForPlaylistResponseSchema
>;
