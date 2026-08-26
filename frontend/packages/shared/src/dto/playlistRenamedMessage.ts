// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistRenamedMessageSchema = z.object({
    type: z.union([z.literal("playlist_renamed")]).default("playlist_renamed"),
    publicId: z.string(),
    name: z.string(),
});

export type PlaylistRenamedMessage = z.infer<
    typeof PlaylistRenamedMessageSchema
>;
