// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const MediaAddedToPlaylistMessageSchema = z.object({
    type: z
        .union([z.literal("media_added_to_playlist")])
        .default("media_added_to_playlist"),
    publicId: z.string(),
    playlistPublicId: z.string(),
    position: z.number(),
});

export type MediaAddedToPlaylistMessage = z.infer<
    typeof MediaAddedToPlaylistMessageSchema
>;
