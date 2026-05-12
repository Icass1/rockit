// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistDeletedMessageSchema = z.object({
    type: z.union([z.literal("playlist_deleted")]).default("playlist_deleted"),
    publicId: z.string(),
});

export type PlaylistDeletedMessage = z.infer<
    typeof PlaylistDeletedMessageSchema
>;
