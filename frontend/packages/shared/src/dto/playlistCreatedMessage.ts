// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistCreatedMessageSchema = z.object({
    type: z.union([z.literal("playlist_created")]).default("playlist_created"),
    publicId: z.string(),
});

export type PlaylistCreatedMessage = z.infer<
    typeof PlaylistCreatedMessageSchema
>;
