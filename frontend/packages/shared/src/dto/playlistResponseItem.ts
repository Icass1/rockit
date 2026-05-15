// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const PlaylistResponseItemSchema = z.object({
    item: z.any(),
    addedAt: z.iso.datetime(),
    expanded: z.boolean().default(false),
});

export type PlaylistResponseItem = z.infer<typeof PlaylistResponseItemSchema>;
