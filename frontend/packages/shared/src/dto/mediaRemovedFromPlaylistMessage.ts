// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const MediaRemovedFromPlaylistMessageSchema = z.object({
    type: z
        .union([z.literal("media_removed_from_playlist")])
        .default("media_removed_from_playlist"),
    publicId: z.string(),
    playlistPublicId: z.string(),
});

export type MediaRemovedFromPlaylistMessage = z.infer<
    typeof MediaRemovedFromPlaylistMessageSchema
>;
